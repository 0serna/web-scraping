import type { FastifyBaseLogger } from "fastify";
import {
  buildFetchHeaders,
  fetchWithTimeout,
} from "../../../shared/utils/api-helpers.js";
import type { Cache } from "../../../shared/types/cache.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import { AiFetchError, AiParseError } from "../types/errors.js";
import {
  type ArtificialAnalysisModel,
  type PerformanceData,
  type RawArtificialAnalysisModel,
} from "../types/ranking.js";

const ARTIFICIAL_ANALYSIS_URL = "https://artificialanalysis.ai/";
const ARTIFICIAL_ANALYSIS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ARTIFICIAL_ANALYSIS_CACHE_KEY = "ai:models";
const NEXT_FLIGHT_CHUNK_PATTERN =
  'self\\.__next_f\\.push\\(\\[\\s*\\d+\\s*,\\s*"((?:\\\\.|[^"\\\\])*)"';
const MODELS_KEY_PATTERN = '"models"\\s*:\\s*\\[';
const PERFORMANCE_DATA_PATTERN = '"coding_index"\\s*:';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

type CharState = { inString: boolean; escaped: boolean };

function updateStringState(char: string, state: CharState): CharState {
  if (state.escaped) return { inString: state.inString, escaped: false };
  if (char === "\\") return { inString: state.inString, escaped: true };
  if (char === '"') return { inString: false, escaped: false };
  return state;
}

function hasRankableFrontierModel(models: ArtificialAnalysisModel[]): boolean {
  return models.some(
    (m) =>
      m.slug.length > 0 &&
      m.reasoningModel &&
      m.frontierModel &&
      isFiniteNumber(m.coding) &&
      isFiniteNumber(m.agentic) &&
      isFiniteNumber(m.blendedPrice),
  );
}

function extractBalancedJsonText(
  source: string,
  startIndex: number,
  openChar: "[" | "{",
  closeChar: "]" | "}",
): string | null {
  let depth = 0;
  let state: CharState = { inString: false, escaped: false };

  for (let index = startIndex; index < source.length; index++) {
    const char = source[index];

    if (state.inString) {
      state = updateStringState(char, state);
      continue;
    }

    if (char === '"') {
      state = { inString: true, escaped: false };
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function extractJsonArrayText(
  source: string,
  arrayStartIndex: number,
): string | null {
  return extractBalancedJsonText(source, arrayStartIndex, "[", "]");
}

function extractJsonObjectText(
  source: string,
  objectStartIndex: number,
): string | null {
  return extractBalancedJsonText(source, objectStartIndex, "{", "}");
}

function extractNextFlightPayloadChunks(html: string): string[] {
  const chunks: string[] = [];
  const chunkRegex = new RegExp(NEXT_FLIGHT_CHUNK_PATTERN, "g");

  let chunkMatch: RegExpExecArray | null;
  while ((chunkMatch = chunkRegex.exec(html)) !== null) {
    const rawChunk = chunkMatch[1] ?? "";
    try {
      chunks.push(JSON.parse(`"${rawChunk}"`) as string);
    } catch {
      // Ignore malformed chunks and continue scanning.
    }
  }

  return chunks;
}

function resolveModelName(rawModel: RawArtificialAnalysisModel): string | null {
  const name = rawModel.short_name ?? rawModel.model_name ?? rawModel.name;
  return name && name.trim().length > 0 ? name.trim() : null;
}

function resolveNumericField(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function normalizeModel(
  rawModel: RawArtificialAnalysisModel,
): ArtificialAnalysisModel | null {
  const model = resolveModelName(rawModel);
  if (!model) return null;

  const slug = typeof rawModel.slug === "string" ? rawModel.slug.trim() : "";
  if (slug.length === 0) return null;

  return {
    slug,
    model,
    reasoningModel:
      rawModel.reasoning_model === true || rawModel.isReasoning === true,
    frontierModel: rawModel.frontier_model === true,
    agentic: resolveNumericField(rawModel.agentic_index),
    coding: resolveNumericField(rawModel.coding_index),
    blendedPrice: resolveNumericField(rawModel.price_1m_blended_3_to_1),
    inputPrice: resolveNumericField(rawModel.price_1m_input_tokens),
    outputPrice: resolveNumericField(rawModel.price_1m_output_tokens),
  };
}

function extractModelsFromModelsArray(
  decodedChunk: string,
): ArtificialAnalysisModel[] {
  const models: ArtificialAnalysisModel[] = [];
  const modelsKeyRegex = new RegExp(MODELS_KEY_PATTERN, "g");

  let modelKeyMatch: RegExpExecArray | null;
  while ((modelKeyMatch = modelsKeyRegex.exec(decodedChunk)) !== null) {
    const arrayStartIndex = modelKeyMatch.index + modelKeyMatch[0].length - 1;
    const arrayText = extractJsonArrayText(decodedChunk, arrayStartIndex);

    if (!arrayText) {
      continue;
    }

    try {
      const parsed = JSON.parse(arrayText) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }

      const chunkModels = parsed
        .filter((entry): entry is RawArtificialAnalysisModel => {
          return !!entry && typeof entry === "object";
        })
        .map(normalizeModel)
        .filter((entry): entry is ArtificialAnalysisModel => entry !== null);

      models.push(...chunkModels);
    } catch {
      // Ignore malformed model arrays and continue scanning.
    }
  }

  return models;
}

function findObjectStart(source: string, fromIndex: number): number {
  let braceCount = 0;
  for (let i = fromIndex; i >= 0; i--) {
    if (source[i] === "}") braceCount++;
    if (source[i] === "{") {
      if (braceCount === 0) return i;
      braceCount--;
    }
  }
  return fromIndex;
}

function toPerformanceData(
  raw: RawArtificialAnalysisModel,
): PerformanceData | null {
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (slug.length === 0) return null;

  return {
    slug,
    frontierModel: raw.frontier_model === true,
    coding: resolveNumericField(raw.coding_index),
    agentic: resolveNumericField(raw.agentic_index),
    blendedPrice: resolveNumericField(raw.price_1m_blended_3_to_1),
    inputPrice: resolveNumericField(raw.price_1m_input_tokens),
    outputPrice: resolveNumericField(raw.price_1m_output_tokens),
  };
}

function extractPerformanceDataFromChunk(
  decodedChunk: string,
): PerformanceData[] {
  const models: PerformanceData[] = [];
  const performanceRegex = new RegExp(PERFORMANCE_DATA_PATTERN, "g");

  let match: RegExpExecArray | null;
  while ((match = performanceRegex.exec(decodedChunk)) !== null) {
    const objectStartIndex = findObjectStart(decodedChunk, match.index);
    const objectText = extractJsonObjectText(decodedChunk, objectStartIndex);
    if (!objectText) continue;

    try {
      const parsed = JSON.parse(objectText) as unknown;
      if (typeof parsed !== "object" || parsed === null) continue;

      const entry = toPerformanceData(parsed as RawArtificialAnalysisModel);
      if (entry) models.push(entry);
    } catch {
      // Ignore malformed objects and continue scanning.
    }
  }

  return models;
}

function mergeModelData(
  metadataModels: ArtificialAnalysisModel[],
  performanceData: PerformanceData[],
): ArtificialAnalysisModel[] {
  const performanceBySlug = new Map<string, PerformanceData>();

  for (const perf of performanceData) {
    performanceBySlug.set(perf.slug, perf);
  }

  return metadataModels.map((metaModel) => {
    const perf = performanceBySlug.get(metaModel.slug);
    if (!perf) {
      return metaModel;
    }

    return {
      ...metaModel,
      frontierModel: perf.frontierModel ?? metaModel.frontierModel,
      coding: perf.coding ?? metaModel.coding,
      agentic: perf.agentic ?? metaModel.agentic,
      blendedPrice: perf.blendedPrice ?? metaModel.blendedPrice,
      inputPrice: perf.inputPrice ?? metaModel.inputPrice,
      outputPrice: perf.outputPrice ?? metaModel.outputPrice,
    };
  });
}

function parseModelsFromHtml(html: string): ArtificialAnalysisModel[] {
  const payloadChunks = extractNextFlightPayloadChunks(html);
  if (payloadChunks.length === 0) {
    throw new AiParseError("Unable to locate Next.js flight payload");
  }

  // Collect all metadata models (from "models" arrays) and performance data separately
  const metadataModels: ArtificialAnalysisModel[] = [];
  const performanceData: PerformanceData[] = [];

  for (const chunk of payloadChunks) {
    const chunkMetadata = extractModelsFromModelsArray(chunk);
    const chunkPerformance = extractPerformanceDataFromChunk(chunk);

    metadataModels.push(...chunkMetadata);
    performanceData.push(...chunkPerformance);
  }

  const seenSlugs = new Set<string>();
  const uniqueMetadataModels: ArtificialAnalysisModel[] = [];
  for (const model of metadataModels) {
    if (!seenSlugs.has(model.slug)) {
      seenSlugs.add(model.slug);
      uniqueMetadataModels.push(model);
    }
  }

  // If we have both metadata and performance data, merge them
  let finalModels: ArtificialAnalysisModel[];
  if (uniqueMetadataModels.length > 0 && performanceData.length > 0) {
    finalModels = mergeModelData(uniqueMetadataModels, performanceData);
  } else if (uniqueMetadataModels.length > 0) {
    finalModels = uniqueMetadataModels;
  } else {
    throw new AiParseError("Unable to locate models data in payload");
  }

  if (finalModels.length === 0) {
    throw new AiParseError("Models data is empty");
  }

  return finalModels;
}

export class ArtificialAnalysisClient {
  private readonly modelsCache: Cache<ArtificialAnalysisModel[]>;

  constructor(logger: FastifyBaseLogger) {
    this.modelsCache = createCache<ArtificialAnalysisModel[]>(
      ARTIFICIAL_ANALYSIS_CACHE_TTL_MS,
      logger,
    );
  }

  async getModels(): Promise<ArtificialAnalysisModel[]> {
    return this.modelsCache.getOrFetchValidated(
      ARTIFICIAL_ANALYSIS_CACHE_KEY,
      async () => {
        const response = await fetchWithTimeout(ARTIFICIAL_ANALYSIS_URL, {
          headers: buildFetchHeaders({
            accept: "text/html,application/xhtml+xml",
          }),
        });

        if (!response.ok) {
          throw new AiFetchError(
            "Failed to fetch Artificial Analysis page",
            response.status,
            response.statusText,
          );
        }

        const html = await response.text();
        return parseModelsFromHtml(html);
      },
      hasRankableFrontierModel,
    );
  }
}
