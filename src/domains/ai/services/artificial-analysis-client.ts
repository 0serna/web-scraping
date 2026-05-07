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

function handleNonStringChar(
  char: string,
  depth: number,
  state: CharState,
  openChar: "[" | "{",
  closeChar: "]" | "}",
): { depth: number; state: CharState; done: boolean } {
  if (char === '"')
    return { depth, state: { inString: true, escaped: false }, done: false };
  if (char === openChar) return { depth: depth + 1, state, done: false };
  if (char !== closeChar) return { depth, state, done: false };
  const newDepth = depth - 1;
  return { depth: newDepth, state, done: newDepth === 0 };
}

function processCharForBalance(
  char: string,
  depth: number,
  state: CharState,
  openChar: "[" | "{",
  closeChar: "]" | "}",
): { depth: number; state: CharState; done: boolean } {
  if (state.inString)
    return { depth, state: updateStringState(char, state), done: false };
  return handleNonStringChar(char, depth, state, openChar, closeChar);
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
    const result = processCharForBalance(
      char,
      depth,
      state,
      openChar,
      closeChar,
    );

    depth = result.depth;
    state = result.state;

    if (result.done) {
      return source.slice(startIndex, index + 1);
    }
  }

  return null;
}

function hasRequiredModelFields(model: ArtificialAnalysisModel): boolean {
  return (
    model.slug.length > 0 &&
    model.reasoningModel === true &&
    model.deprecated !== true
  );
}

function hasValidScores(model: ArtificialAnalysisModel): boolean {
  return isFiniteNumber(model.coding) && isFiniteNumber(model.agentic);
}

function isRankableModel(model: ArtificialAnalysisModel): boolean {
  return hasRequiredModelFields(model) && hasValidScores(model);
}

function hasRankableReasoningModel(models: ArtificialAnalysisModel[]): boolean {
  return models.some(isRankableModel);
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

function resolveNumericField(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function resolveOutputTokens(raw: RawArtificialAnalysisModel): number | null {
  const tokenCounts = raw.intelligence_index_token_counts;
  if (!tokenCounts || typeof tokenCounts !== "object") return null;
  const value = tokenCounts.output_tokens;
  return isPositiveFiniteNumber(value) ? value : null;
}

function resolveDeprecated(
  raw: RawArtificialAnalysisModel,
): boolean | undefined {
  return typeof raw.deprecated === "boolean" ? raw.deprecated : undefined;
}

function resolveModelNameField(
  rawModel: RawArtificialAnalysisModel,
): string | null {
  const name = rawModel.short_name ?? rawModel.model_name ?? rawModel.name;
  return name?.trim() || null;
}

function resolveSlug(rawModel: RawArtificialAnalysisModel): string {
  const slug = rawModel.slug;
  if (typeof slug !== "string") return "";
  return slug.trim();
}

function resolveReasoningModel(rawModel: RawArtificialAnalysisModel): boolean {
  return rawModel.reasoning_model === true || rawModel.isReasoning === true;
}

function resolveFrontierModel(rawModel: RawArtificialAnalysisModel): boolean {
  return rawModel.frontier_model === true;
}

function normalizeModel(
  rawModel: RawArtificialAnalysisModel,
): ArtificialAnalysisModel | null {
  const model = resolveModelNameField(rawModel);
  if (!model) return null;

  const slug = resolveSlug(rawModel);
  if (slug.length === 0) return null;

  const deprecated = resolveDeprecated(rawModel);

  return {
    slug,
    model,
    reasoningModel: resolveReasoningModel(rawModel),
    frontierModel: resolveFrontierModel(rawModel),
    agentic: resolveNumericField(rawModel.agentic_index),
    coding: resolveNumericField(rawModel.coding_index),
    blendedPrice: resolveNumericField(rawModel.price_1m_blended_3_to_1),
    inputPrice: resolveNumericField(rawModel.price_1m_input_tokens),
    outputPrice: resolveNumericField(rawModel.price_1m_output_tokens),
    intelligenceIndexOutputTokens: resolveOutputTokens(rawModel),
    ...(deprecated !== undefined ? { deprecated } : {}),
  };
}

function tryParseModelsArray(
  decodedChunk: string,
  arrayStartIndex: number,
): ArtificialAnalysisModel[] {
  const arrayText = extractJsonArrayText(decodedChunk, arrayStartIndex);
  if (!arrayText) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(arrayText);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((entry): entry is RawArtificialAnalysisModel => {
      return !!entry && typeof entry === "object";
    })
    .map(normalizeModel)
    .filter((entry): entry is ArtificialAnalysisModel => entry !== null);
}

function extractModelsFromModelsArray(
  decodedChunk: string,
): ArtificialAnalysisModel[] {
  const models: ArtificialAnalysisModel[] = [];
  const modelsKeyRegex = new RegExp(MODELS_KEY_PATTERN, "g");

  let modelKeyMatch = modelsKeyRegex.exec(decodedChunk);
  while (modelKeyMatch !== null) {
    const arrayStartIndex = modelKeyMatch.index + modelKeyMatch[0].length - 1;
    const chunkModels = tryParseModelsArray(decodedChunk, arrayStartIndex);
    models.push(...chunkModels);
    modelKeyMatch = modelsKeyRegex.exec(decodedChunk);
  }

  return models;
}

function processBrace(
  char: string,
  braceCount: number,
): { braceCount: number; foundStart: boolean } {
  if (char === "}") return { braceCount: braceCount + 1, foundStart: false };
  if (char !== "{") return { braceCount, foundStart: false };
  if (braceCount === 0) return { braceCount, foundStart: true };
  return { braceCount: braceCount - 1, foundStart: false };
}

function findObjectStart(source: string, fromIndex: number): number {
  let braceCount = 0;
  for (let i = fromIndex; i >= 0; i--) {
    const result = processBrace(source[i], braceCount);
    braceCount = result.braceCount;
    if (result.foundStart) return i;
  }
  return fromIndex;
}

function toPerformanceData(
  raw: RawArtificialAnalysisModel,
): PerformanceData | null {
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (slug.length === 0) return null;

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
    ...(deprecated !== undefined ? { deprecated } : {}),
  };
}

function parseRawModel(objectText: string): RawArtificialAnalysisModel | null {
  try {
    const parsed = JSON.parse(objectText) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    return parsed as RawArtificialAnalysisModel;
  } catch {
    return null;
  }
}

function tryAddPerformanceEntry(
  models: PerformanceData[],
  decodedChunk: string,
  match: RegExpExecArray,
): boolean {
  const objectStartIndex = findObjectStart(decodedChunk, match.index);
  const objectText = extractJsonObjectText(decodedChunk, objectStartIndex);
  if (!objectText) return false;

  const parsed = parseRawModel(objectText);
  if (!parsed) return false;

  const entry = toPerformanceData(parsed);
  if (entry) {
    models.push(entry);
    return true;
  }
  return false;
}

function extractPerformanceDataFromChunk(
  decodedChunk: string,
): PerformanceData[] {
  const models: PerformanceData[] = [];
  const performanceRegex = new RegExp(PERFORMANCE_DATA_PATTERN, "g");

  let match = performanceRegex.exec(decodedChunk);
  while (match !== null) {
    tryAddPerformanceEntry(models, decodedChunk, match);
    match = performanceRegex.exec(decodedChunk);
  }

  return models;
}

function tryAddModelEntry(
  models: ArtificialAnalysisModel[],
  source: string,
  match: RegExpExecArray,
): boolean {
  const objectStartIndex = findObjectStart(source, match.index);
  const objectText = extractJsonObjectText(source, objectStartIndex);
  if (!objectText) return false;

  const parsed = parseRawModel(objectText);
  if (!parsed) return false;

  const entry = normalizeModel(parsed);
  if (entry) {
    models.push(entry);
    return true;
  }
  return false;
}

function extractModelsFromPerformanceObjects(
  source: string,
): ArtificialAnalysisModel[] {
  const models: ArtificialAnalysisModel[] = [];
  const performanceRegex = new RegExp(PERFORMANCE_DATA_PATTERN, "g");

  let match = performanceRegex.exec(source);
  while (match !== null) {
    tryAddModelEntry(models, source, match);
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

type PerformanceFields = Omit<PerformanceData, "slug">;

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

function getPrimaryFallback(
  embeddedPerformanceModels: ArtificialAnalysisModel[],
): ArtificialAnalysisModel[] | null {
  if (embeddedPerformanceModels.length === 0) return null;
  return embeddedPerformanceModels;
}

function mergePayloadData(payloadChunks: string[]): {
  metadataModels: ArtificialAnalysisModel[];
  performanceData: PerformanceData[];
} {
  const metadataModels: ArtificialAnalysisModel[] = [];
  const performanceData: PerformanceData[] = [];

  for (const chunk of payloadChunks) {
    metadataModels.push(...extractModelsFromModelsArray(chunk));
    performanceData.push(...extractPerformanceDataFromChunk(chunk));
  }

  return { metadataModels, performanceData };
}

function selectFinalModels(
  uniqueMetadataModels: ArtificialAnalysisModel[],
  performanceData: PerformanceData[],
  embeddedPerformanceModels: ArtificialAnalysisModel[],
): ArtificialAnalysisModel[] | null {
  if (uniqueMetadataModels.length === 0)
    return getPrimaryFallback(embeddedPerformanceModels);
  if (performanceData.length === 0) return uniqueMetadataModels;
  return mergeModelData(uniqueMetadataModels, performanceData);
}

function buildModelsFromPayload(
  html: string,
  embeddedPerformanceModels: ArtificialAnalysisModel[],
): ArtificialAnalysisModel[] | null {
  const payloadChunks = extractNextFlightPayloadChunks(html);
  if (payloadChunks.length === 0)
    return getPrimaryFallback(embeddedPerformanceModels);

  const { metadataModels, performanceData } = mergePayloadData(payloadChunks);
  const uniqueMetadataModels = uniqueModelsBySlug(metadataModels);
  const primaryModels = selectFinalModels(
    uniqueMetadataModels,
    performanceData,
    embeddedPerformanceModels,
  );
  if (primaryModels === null) return null;

  return mergeEmbeddedIntoModels(primaryModels, embeddedPerformanceModels);
}

function parseModelsFromHtml(html: string): ArtificialAnalysisModel[] {
  const embeddedPerformanceModels = uniqueModelsBySlug(
    extractEmbeddedPerformanceModelsFromHtml(html),
  );

  const models = buildModelsFromPayload(html, embeddedPerformanceModels);
  if (models === null)
    throw new AiParseError("Unable to locate models data in payload");
  if (models.length === 0) throw new AiParseError("Models data is empty");
  return models;
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
