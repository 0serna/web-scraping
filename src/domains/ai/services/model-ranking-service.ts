import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

export const EXCLUDED_SLUG_PREFIXES: readonly string[] = [
  "claude",
  "gemini",
  "muse",
];

function hasRequiredModelData(model: ArtificialAnalysisModel): boolean {
  return (
    model.coding !== null &&
    model.intelligenceIndexOutputTokens !== null &&
    Number.isFinite(model.intelligenceIndexOutputTokens) &&
    model.intelligenceIndexOutputTokens > 0
  );
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
  coding: number;
  outputTokens: number;
  tokens: number | null;
}

type RankableModel = ArtificialAnalysisModel & {
  slug: string;
  coding: number;
  intelligenceIndexOutputTokens: number;
};

function compareInternalScore(left: ScoredModel, right: ScoredModel): number {
  return right.internalScore - left.internalScore;
}

function compareCoding(left: ScoredModel, right: ScoredModel): number {
  return right.coding - left.coding;
}

function compareOutputTokens(left: ScoredModel, right: ScoredModel): number {
  return left.outputTokens - right.outputTokens;
}

function compareModelName(left: ScoredModel, right: ScoredModel): number {
  return left.model.localeCompare(right.model);
}

function compareFinalModels(left: ScoredModel, right: ScoredModel): number {
  const comparators = [
    compareInternalScore,
    compareCoding,
    compareOutputTokens,
    compareModelName,
  ];

  for (const compare of comparators) {
    const result = compare(left, right);
    if (result !== 0) return result;
  }

  return 0;
}

function toRoundedMillions(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value / 1_000_000);
}

function toScoredModel(model: RankableModel): ScoredModel {
  const outputTokens = model.intelligenceIndexOutputTokens;
  const outputTokensMillions = outputTokens / 1_000_000;

  return {
    model: model.model,
    slug: model.slug,
    internalScore: model.coding ** 6 / Math.sqrt(outputTokensMillions),
    coding: model.coding,
    outputTokens,
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
        "No models with slug, coding, and output tokens were found",
      );
    }

    const visibleRankableModels = rankableModels.filter(
      (model) =>
        !EXCLUDED_SLUG_PREFIXES.some((prefix) => model.slug.startsWith(prefix)),
    );

    if (visibleRankableModels.length === 0) {
      return [];
    }

    const rankedModels = visibleRankableModels
      .map(toScoredModel)
      .sort(compareFinalModels);

    if (rankedModels[0].internalScore <= 0) {
      throw new AiParseError(
        "First-ranked model has a non-positive internal score",
      );
    }

    const topInternalScore = rankedModels[0].internalScore;

    return rankedModels.map((entry) => ({
      model: entry.model,
      score: Math.round((entry.internalScore / topInternalScore) * 100),
      coding: Math.round(entry.coding),
      tokens: entry.tokens,
    }));
  }
}
