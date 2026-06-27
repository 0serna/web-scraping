import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

export const EXCLUDED_SLUG_PREFIXES: readonly string[] = [
  "claude",
  "gemini",
  "muse",
  "kat",
];

export const MAX_RANKING_SIZE = 25;

function isRankableModel(
  model: ArtificialAnalysisModel,
): model is RankableModel {
  return (
    model.slug.length > 0 && model.deprecated !== true && model.coding !== null
  );
}

interface ScoredModel {
  model: string;
  coding: number;
  outputTokens: number | null;
  tokens: number | null;
}

type RankableModel = ArtificialAnalysisModel & {
  slug: string;
  coding: number;
  intelligenceIndexOutputTokens: number | null;
};

function compareCoding(left: ScoredModel, right: ScoredModel): number {
  return right.coding - left.coding;
}

function compareOutputTokens(left: ScoredModel, right: ScoredModel): number {
  if (left.outputTokens === null && right.outputTokens === null) return 0;
  if (left.outputTokens === null) return 1;
  if (right.outputTokens === null) return -1;
  return left.outputTokens - right.outputTokens;
}

function compareModelName(left: ScoredModel, right: ScoredModel): number {
  return left.model.localeCompare(right.model);
}

function compareFinalModels(left: ScoredModel, right: ScoredModel): number {
  const comparators = [compareCoding, compareOutputTokens, compareModelName];

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
  return {
    model: model.model,
    coding: Math.round(model.coding),
    outputTokens: model.intelligenceIndexOutputTokens,
    tokens: toRoundedMillions(model.intelligenceIndexOutputTokens),
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
      throw new AiParseError("No models with slug and coding were found");
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

    return rankedModels.slice(0, MAX_RANKING_SIZE).map((entry, index) => ({
      rank: index + 1,
      model: entry.model,
      coding: entry.coding,
      tokens: entry.tokens,
    }));
  }
}
