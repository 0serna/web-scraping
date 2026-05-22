import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

export const MIN_SCORE_THRESHOLD = 70;
export const EXCLUDED_SLUG_PREFIXES: readonly string[] = [
  "claude",
  "gemini",
  "muse",
];

function hasRequiredModelData(model: ArtificialAnalysisModel): boolean {
  return model.coding !== null;
}

function isRankableModel(
  model: ArtificialAnalysisModel,
): model is RankableModel {
  return (
    model.slug.length > 0 &&
    model.deprecated !== true &&
    hasRequiredModelData(model)
  );
}

interface ScoredModel {
  model: string;
  slug: string;
  internalScore: number;
  normalizedCoding: number;
  tokens: number | null;
}

type RankableModel = ArtificialAnalysisModel & {
  slug: string;
  coding: number;
};

function compareInternalScore(left: ScoredModel, right: ScoredModel): number {
  return right.internalScore - left.internalScore;
}

function compareNormalizedCoding(
  left: ScoredModel,
  right: ScoredModel,
): number {
  return right.normalizedCoding - left.normalizedCoding;
}

function compareModelName(left: ScoredModel, right: ScoredModel): number {
  return left.model.localeCompare(right.model);
}

function compareFinalModels(left: ScoredModel, right: ScoredModel): number {
  const comparators = [
    compareInternalScore,
    compareNormalizedCoding,
    compareModelName,
  ];

  for (const compare of comparators) {
    const result = compare(left, right);
    if (result !== 0) return result;
  }

  return 0;
}

function getMaxCoding(models: RankableModel[]): number {
  return Math.max(...models.map((model) => model.coding));
}

function normalizeScore(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return (value / maxValue) * 100;
}

function toValidOutputTokens(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function toRoundedMillions(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value / 1_000_000);
}

function toScoredModel(model: RankableModel, maxCoding: number): ScoredModel {
  const normalizedCoding = normalizeScore(model.coding, maxCoding);
  const outputTokens = toValidOutputTokens(model.intelligenceIndexOutputTokens);

  return {
    model: model.model,
    slug: model.slug,
    internalScore: normalizedCoding,
    normalizedCoding,
    tokens: toRoundedMillions(outputTokens),
  };
}

export class ModelRankingService {
  private artificialAnalysisClient;

  constructor(
    artificialAnalysisClient: Pick<ArtificialAnalysisClient, "getModels">,
  ) {
    this.artificialAnalysisClient = artificialAnalysisClient;
  }

  async getRanking(): Promise<RankedModel[]> {
    const models = await this.artificialAnalysisClient.getModels();

    const rankableModels = models.filter(isRankableModel);

    if (rankableModels.length === 0) {
      throw new AiParseError(
        "No models with slug and coding scores were found",
      );
    }

    const maxCoding = getMaxCoding(rankableModels);

    const scoredModels = rankableModels.map((model) =>
      toScoredModel(model, maxCoding),
    );

    const rankedModels = scoredModels.sort(compareFinalModels);

    if (rankedModels[0].internalScore <= 0) {
      throw new AiParseError(
        "First-ranked model has a non-positive internal score",
      );
    }

    const visibleModels = rankedModels.filter(
      (model) =>
        !EXCLUDED_SLUG_PREFIXES.some((prefix) => model.slug.startsWith(prefix)),
    );

    if (visibleModels.length === 0) {
      return [];
    }

    const topInternalScore = rankedModels[0].internalScore;

    return visibleModels
      .map((entry) => ({
        model: entry.model,
        score: Math.round((entry.internalScore / topInternalScore) * 100),
        tokens: entry.tokens,
      }))
      .filter((model) => model.score >= MIN_SCORE_THRESHOLD);
  }
}
