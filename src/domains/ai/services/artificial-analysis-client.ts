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

const ARTIFICIAL_ANALYSIS_URL = "https://artificialanalysis.ai/models/gpt-5-5";
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

function hasRankableReasoningModel(models: ArtificialAnalysisModel[]): boolean {
  return models.some(
    (m) =>
      m.slug.length > 0 &&
      m.reasoningModel &&
      m.deprecated !== true &&
      isFiniteNumber(m.coding) &&
      isFiniteNumber(m.agentic),
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

  let chunkMatch = chunkRegex.exec(html);
  while (chunkMatch !== null) {
    const rawChunk = chunkMatch[1] ?? "";
    try {
      chunks.push(JSON.parse(`"${rawChunk}"`) as string);
    } catch {
      // Ignore malformed chunks and continue scanning.
    }

    chunkMatch = chunkRegex.exec(html);
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

function resolveOutputTokens(raw: RawArtificialAnalysisModel): number | null {
  const tokenCounts = raw.intelligence_index_token_counts;
  if (!tokenCounts || typeof tokenCounts !== "object") return null;
  const value = tokenCounts.output_tokens;
  return isFiniteNumber(value) && value > 0 ? value : null;
}

function extractTokensPerSecond(
  raw: RawArtificialAnalysisModel,
): number | null {
  const performance = raw.performanceByPromptLength;
  if (!Array.isArray(performance)) return null;

  const mediumCoding = performance.find(
    (entry) => entry?.prompt_length_type === "medium_coding",
  );
  if (!mediumCoding) return null;

  const value = resolveNumericField(mediumCoding.median_output_speed);
  return value !== null ? Math.round(value) : null;
}

function resolveDeprecated(
  raw: RawArtificialAnalysisModel,
): boolean | undefined {
  return typeof raw.deprecated === "boolean" ? raw.deprecated : undefined;
}

function normalizeModel(
  rawModel: RawArtificialAnalysisModel,
): ArtificialAnalysisModel | null {
  const model = resolveModelName(rawModel);
  if (!model) return null;

  const slug = typeof rawModel.slug === "string" ? rawModel.slug.trim() : "";
  if (slug.length === 0) return null;

  const releaseDate =
    typeof rawModel.release_date === "string" ? rawModel.release_date : null;

  const deprecated = resolveDeprecated(rawModel);

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
    intelligenceIndexOutputTokens: resolveOutputTokens(rawModel),
    tokensPerSecond: extractTokensPerSecond(rawModel),
    releaseDate,
    ...(deprecated !== undefined ? { deprecated } : {}),
  };
}

function extractModelsFromModelsArray(
  decodedChunk: string,
): ArtificialAnalysisModel[] {
  const models: ArtificialAnalysisModel[] = [];
  const modelsKeyRegex = new RegExp(MODELS_KEY_PATTERN, "g");

  let modelKeyMatch = modelsKeyRegex.exec(decodedChunk);
  while (modelKeyMatch !== null) {
    const arrayStartIndex = modelKeyMatch.index + modelKeyMatch[0].length - 1;
    const arrayText = extractJsonArrayText(decodedChunk, arrayStartIndex);

    if (!arrayText) {
      modelKeyMatch = modelsKeyRegex.exec(decodedChunk);
      continue;
    }

    try {
      const parsed = JSON.parse(arrayText) as unknown;
      if (!Array.isArray(parsed)) {
        modelKeyMatch = modelsKeyRegex.exec(decodedChunk);
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

    modelKeyMatch = modelsKeyRegex.exec(decodedChunk);
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

  const releaseDate =
    typeof raw.release_date === "string" ? raw.release_date : null;

  const deprecated = resolveDeprecated(raw);

  return {
    slug,
    frontierModel: raw.frontier_model === true,
    coding: resolveNumericField(raw.coding_index),
    agentic: resolveNumericField(raw.agentic_index),
    blendedPrice: resolveNumericField(raw.price_1m_blended_3_to_1),
    inputPrice: resolveNumericField(raw.price_1m_input_tokens),
    outputPrice: resolveNumericField(raw.price_1m_output_tokens),
    intelligenceIndexOutputTokens: resolveOutputTokens(raw),
    tokensPerSecond: extractTokensPerSecond(raw),
    releaseDate,
    ...(deprecated !== undefined ? { deprecated } : {}),
  };
}

function extractPerformanceDataFromChunk(
  decodedChunk: string,
): PerformanceData[] {
  const models: PerformanceData[] = [];
  const performanceRegex = new RegExp(PERFORMANCE_DATA_PATTERN, "g");

  let match = performanceRegex.exec(decodedChunk);
  while (match !== null) {
    const objectStartIndex = findObjectStart(decodedChunk, match.index);
    const objectText = extractJsonObjectText(decodedChunk, objectStartIndex);
    if (!objectText) {
      match = performanceRegex.exec(decodedChunk);
      continue;
    }

    try {
      const parsed = JSON.parse(objectText) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        match = performanceRegex.exec(decodedChunk);
        continue;
      }

      const entry = toPerformanceData(parsed as RawArtificialAnalysisModel);
      if (entry) models.push(entry);
    } catch {
      // Ignore malformed objects and continue scanning.
    }

    match = performanceRegex.exec(decodedChunk);
  }

  return models;
}

function extractModelsFromPerformanceObjects(
  source: string,
): ArtificialAnalysisModel[] {
  const models: ArtificialAnalysisModel[] = [];
  const performanceRegex = new RegExp(PERFORMANCE_DATA_PATTERN, "g");

  let match = performanceRegex.exec(source);
  while (match !== null) {
    const objectStartIndex = findObjectStart(source, match.index);
    const objectText = extractJsonObjectText(source, objectStartIndex);
    if (!objectText) {
      match = performanceRegex.exec(source);
      continue;
    }

    try {
      const parsed = JSON.parse(objectText) as unknown;
      if (typeof parsed !== "object" || parsed === null) {
        match = performanceRegex.exec(source);
        continue;
      }

      const entry = normalizeModel(parsed as RawArtificialAnalysisModel);
      if (entry) models.push(entry);
    } catch {
      // Ignore malformed objects and continue scanning.
    }

    match = performanceRegex.exec(source);
  }

  return models;
}

function extractEmbeddedPerformanceModelsFromHtml(
  html: string,
): ArtificialAnalysisModel[] {
  const unescapedHtml = html.replace(/\\"/g, '"');
  return extractModelsFromPerformanceObjects(unescapedHtml);
}

function uniqueModelsBySlug(
  models: ArtificialAnalysisModel[],
): ArtificialAnalysisModel[] {
  const seenSlugs = new Set<string>();
  const uniqueModels: ArtificialAnalysisModel[] = [];

  for (const model of models) {
    if (!seenSlugs.has(model.slug)) {
      seenSlugs.add(model.slug);
      uniqueModels.push(model);
    }
  }

  return uniqueModels;
}

interface PerformanceFields {
  frontierModel: boolean;
  coding: number | null;
  agentic: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  intelligenceIndexOutputTokens: number | null;
  tokensPerSecond: number | null;
  releaseDate: string | null;
  deprecated?: boolean;
}

function mergeNullableField<T>(source: T | null, fallback: T | null): T | null {
  return source ?? fallback;
}

function mergePerformanceFields<T extends ArtificialAnalysisModel>(
  model: T,
  source: PerformanceFields,
): T {
  const deprecated = source.deprecated ?? model.deprecated;

  return {
    ...model,
    frontierModel: source.frontierModel,
    coding: mergeNullableField(source.coding, model.coding),
    agentic: mergeNullableField(source.agentic, model.agentic),
    blendedPrice: mergeNullableField(source.blendedPrice, model.blendedPrice),
    inputPrice: mergeNullableField(source.inputPrice, model.inputPrice),
    outputPrice: mergeNullableField(source.outputPrice, model.outputPrice),
    intelligenceIndexOutputTokens: mergeNullableField(
      source.intelligenceIndexOutputTokens,
      model.intelligenceIndexOutputTokens,
    ),
    tokensPerSecond: mergeNullableField(
      source.tokensPerSecond,
      model.tokensPerSecond,
    ),
    releaseDate: mergeNullableField(source.releaseDate, model.releaseDate),
    ...(deprecated !== undefined ? { deprecated } : {}),
  };
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
    return perf ? mergePerformanceFields(metaModel, perf) : metaModel;
  });
}

function mergeEmbeddedIntoModels(
  models: ArtificialAnalysisModel[],
  embedded: ArtificialAnalysisModel[],
): ArtificialAnalysisModel[] {
  const embeddedBySlug = new Map(embedded.map((m) => [m.slug, m]));

  const merged = models.map((model) => {
    const source = embeddedBySlug.get(model.slug);
    return source ? mergePerformanceFields(model, source) : model;
  });

  const knownSlugs = new Set(merged.map((m) => m.slug));
  for (const model of embedded) {
    if (!knownSlugs.has(model.slug)) {
      merged.push(model);
    }
  }

  return merged;
}

function parseModelsFromHtml(html: string): ArtificialAnalysisModel[] {
  const embeddedPerformanceModels = uniqueModelsBySlug(
    extractEmbeddedPerformanceModelsFromHtml(html),
  );
  const payloadChunks = extractNextFlightPayloadChunks(html);
  if (payloadChunks.length === 0) {
    if (embeddedPerformanceModels.length > 0) {
      return embeddedPerformanceModels;
    }

    throw new AiParseError("Unable to locate Next.js flight payload");
  }

  const metadataModels: ArtificialAnalysisModel[] = [];
  const performanceData: PerformanceData[] = [];

  for (const chunk of payloadChunks) {
    metadataModels.push(...extractModelsFromModelsArray(chunk));
    performanceData.push(...extractPerformanceDataFromChunk(chunk));
  }

  const uniqueMetadataModels = uniqueModelsBySlug(metadataModels);

  let finalModels: ArtificialAnalysisModel[];
  if (uniqueMetadataModels.length > 0 && performanceData.length > 0) {
    finalModels = mergeModelData(uniqueMetadataModels, performanceData);
  } else if (uniqueMetadataModels.length > 0) {
    finalModels = uniqueMetadataModels;
  } else if (embeddedPerformanceModels.length > 0) {
    finalModels = embeddedPerformanceModels;
  } else {
    throw new AiParseError("Unable to locate models data in payload");
  }

  finalModels = mergeEmbeddedIntoModels(finalModels, embeddedPerformanceModels);

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
      hasRankableReasoningModel,
    );
  }
}
