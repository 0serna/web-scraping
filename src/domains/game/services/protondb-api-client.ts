import type { FastifyBaseLogger } from "fastify";
import type { Cache } from "../../../shared/types/cache.js";
import {
  buildFetchHeaders,
  fetchWithTimeout,
} from "../../../shared/utils/api-helpers.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import {
  createRateLimiter,
  type RateLimiter,
} from "../../../shared/utils/global-rate-limiter.js";
import type { ProtonDbSummary, ProtonDbTier } from "../types/game.js";

const PROTONDB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PROTONDB_TIERS: readonly string[] = [
  "borked",
  "bronze",
  "silver",
  "gold",
  "platinum",
];

interface ProtonDbResponse {
  tier?: unknown;
  score?: unknown;
  confidence?: unknown;
  total?: unknown;
}

interface ProtonDbSummaryCandidate {
  tier?: unknown;
  score?: unknown;
  confidence?: unknown;
  reports?: unknown;
}

function isProtonDbTier(value: unknown): value is ProtonDbTier {
  return typeof value === "string" && PROTONDB_TIERS.includes(value);
}

function parseSummary(data: ProtonDbResponse): ProtonDbSummary | null {
  const summary = {
    tier: data.tier,
    score: data.score,
    confidence: data.confidence,
    reports: data.total,
  };

  return isValidSummary(summary) ? summary : null;
}

function isValidSummary(
  summary: ProtonDbSummaryCandidate,
): summary is ProtonDbSummary {
  return (
    isProtonDbTier(summary.tier) &&
    typeof summary.score === "number" &&
    Number.isFinite(summary.score) &&
    typeof summary.confidence === "string" &&
    summary.confidence.trim().length > 0 &&
    typeof summary.reports === "number" &&
    Number.isInteger(summary.reports) &&
    summary.reports >= 0
  );
}

export class ProtonDbApiClient {
  private readonly cache: Cache<ProtonDbSummary>;
  private readonly logger: FastifyBaseLogger;
  private readonly rateLimiter: RateLimiter;

  constructor(logger: FastifyBaseLogger) {
    this.cache = createCache<ProtonDbSummary>(PROTONDB_CACHE_TTL_MS, logger);
    this.logger = logger;
    this.rateLimiter = createRateLimiter(10);
  }

  async getSummaryByAppId(appId: string): Promise<ProtonDbSummary | null> {
    const cacheKey = `protondb:${appId}`;

    try {
      const cached = await this.cache.get(cacheKey);
      if (cached && isValidSummary(cached)) {
        return cached;
      }

      const response = await this.rateLimiter(() =>
        fetchWithTimeout(
          `https://www.protondb.com/api/v1/reports/summaries/${appId}.json`,
          { headers: buildFetchHeaders({ Accept: "application/json" }) },
        ),
      );

      if (!response.ok) {
        return null;
      }

      const summary = parseSummary((await response.json()) as ProtonDbResponse);
      if (!summary) {
        return null;
      }

      await this.cache.set(cacheKey, summary);
      return summary;
    } catch (error) {
      this.logger.warn(
        { err: error, appId },
        "Unable to fetch ProtonDB summary",
      );
      return null;
    }
  }
}
