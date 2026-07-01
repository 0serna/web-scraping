import type { FastifyBaseLogger } from "fastify";
import {
  buildFetchHeaders,
  fetchWithTimeout,
} from "../../../shared/utils/api-helpers.js";
import type { Cache } from "../../../shared/types/cache.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import type { DeepSweRow, DeepSweScore } from "../types/ranking.js";

const DEEPSWE_BASE_URL = "https://deepswe.datacurve.ai/artifacts";
const DEEPSWE_VERSIONS = ["v1.1", "v1"] as const;
const DEEPSWE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEEPSWE_CACHE_KEY = "ai:deepswe";

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidRow(row: unknown): row is DeepSweRow {
  if (!row || typeof row !== "object") return false;
  const obj = row as Record<string, unknown>;
  return (
    typeof obj.model === "string" &&
    obj.model.length > 0 &&
    isFinitePositive(obj.pass_rate)
  );
}

function parseLeaderboard(data: unknown): DeepSweScore[] | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.rows)) return null;

  const validRows = (obj.rows as unknown[]).filter(isValidRow);
  if (validRows.length === 0) return null;

  return validRows.map((row) => ({
    model: row.model,
    effort: row.reasoning_effort ?? null,
    score: Math.round(row.pass_rate * 100),
  }));
}

interface ModelEffortPair {
  model: string;
  effort: string | null;
}

function parseSlugToModelEffort(slug: string): ModelEffortPair | null {
  // Match patterns like "gpt-5.5 [high]", "claude-opus-4.8 [max]", "gemini-3.5-flash [medium]"
  const match = slug.match(/^(.+?)\s+\[(\w+)\]$/);
  if (match) {
    return { model: match[1], effort: match[2] };
  }

  // Match model names without effort (e.g., "kimi-k2.7-code")
  return { model: slug, effort: null };
}

function normalizeModelName(name: string): string {
  // Convert "gpt-5-5" to "gpt-5.5" and similar
  // DeepSWE uses hyphens in model names, AA might use dots
  return name.replace(/(\d)-(\d)/g, "$1.$2").toLowerCase();
}

function scoreKey(score: DeepSweScore): string {
  return `${score.model.toLowerCase()}|${score.effort?.toLowerCase() ?? ""}`;
}

export function matchDeepSweScore(
  slug: string,
  scores: DeepSweScore[],
): number | null {
  const parsed = parseSlugToModelEffort(slug);
  if (!parsed) return null;

  const normalizedModel = normalizeModelName(parsed.model);
  const normalizedEffort = parsed.effort?.toLowerCase() ?? null;

  // Find exact match with model and effort
  const exactMatch = scores.find((score) => {
    const scoreModel = normalizeModelName(score.model);
    const scoreEffort = score.effort?.toLowerCase() ?? null;
    return scoreModel === normalizedModel && scoreEffort === normalizedEffort;
  });

  if (exactMatch) return exactMatch.score;

  // No effort specified in slug: try effort suffix first, then best model score
  if (!normalizedEffort) {
    const effortSuffixMatch = scores.find((score) => {
      if (!score.effort) return false;
      const scoreEffort = score.effort.toLowerCase();
      const suffix = `-${scoreEffort}`;
      if (!normalizedModel.endsWith(suffix)) return false;
      const slugModel = normalizedModel.slice(0, -suffix.length);
      return normalizeModelName(score.model) === slugModel;
    });

    if (effortSuffixMatch) return effortSuffixMatch.score;

    const modelScores = scores.filter(
      (score) => normalizeModelName(score.model) === normalizedModel,
    );
    if (modelScores.length > 0) {
      return Math.max(...modelScores.map((s) => s.score));
    }
  }

  return null;
}

export class DeepSweClient {
  private readonly cache: Cache<DeepSweScore[]>;

  constructor(logger: FastifyBaseLogger) {
    this.cache = createCache<DeepSweScore[]>(DEEPSWE_CACHE_TTL_MS, logger);
  }

  async getScores(): Promise<DeepSweScore[]> {
    return this.cache.getOrFetchValidated(
      DEEPSWE_CACHE_KEY,
      async () => {
        const mergedScores: DeepSweScore[] = [];
        const seenScores = new Set<string>();

        for (const version of DEEPSWE_VERSIONS) {
          try {
            const url = `${DEEPSWE_BASE_URL}/${version}/leaderboard-live.json`;
            const response = await fetchWithTimeout(url, {
              headers: buildFetchHeaders({ accept: "application/json" }),
            });

            if (!response.ok) continue;

            const data: unknown = await response.json();
            const scores = parseLeaderboard(data);
            if (!scores) continue;

            for (const score of scores) {
              const key = scoreKey(score);
              if (seenScores.has(key)) continue;
              mergedScores.push(score);
              seenScores.add(key);
            }
          } catch {
            // Try next version
          }
        }

        return mergedScores;
      },
      () => true, // Allow empty arrays (unavailable enrichment)
    );
  }
}
