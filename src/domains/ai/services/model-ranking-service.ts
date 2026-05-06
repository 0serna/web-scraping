import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const WEIGHT_INTELLIGENCE_AGENTIC = 0.7;
const WEIGHT_INTELLIGENCE_CODING = 0.3;
const OUTPUT_EFFICIENCY_MAX_ADJUSTMENT = 0.1;
const OUTPUT_EFFICIENCY_THRESHOLD_TOKENS = 80_000_000;
const EXCLUDED_SLUG_PREFIXES: readonly string[] = ["claude"];

function isRankableReasoningModel(
  model: ArtificialAnalysisModel,
): model is RankableModel {
  return (
    model.slug.length > 0 &&
    model.reasoningModel === true &&
    model.deprecated !== true &&
    model.coding !== null &&
    model.agentic !== null
  );
}

interface ScoredModel {
  model: string;
  internalScore: number;
  coding: number;
  agentic: number;
  rawOutputTokens: number | null;
  output: number | null;
}

type RankableModel = ArtificialAnalysisModel & {
  slug: string;
  reasoningModel: true;
  coding: number;
  agentic: number;
};

function compareFinalModels(left: ScoredModel, right: ScoredModel): number {
  if (right.internalScore !== left.internalScore)
    return right.internalScore - left.internalScore;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  if (right.coding !== left.coding) return right.coding - left.coding;
  const leftOutput = left.rawOutputTokens ?? Infinity;
  const rightOutput = right.rawOutputTokens ?? Infinity;
  if (leftOutput !== rightOutput) return leftOutput - rightOutput;
  return left.model.localeCompare(right.model);
}

function calculateBaseScore(model: RankableModel): number {
  return (
    model.coding * WEIGHT_INTELLIGENCE_CODING +
    model.agentic * WEIGHT_INTELLIGENCE_AGENTIC
  );
}

function toValidOutputTokens(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function toRoundedMillions(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value / 1_000_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateAdjustedScore(
  baseScore: number,
  outputTokens: number | null,
): number {
  const validOutputTokens = toValidOutputTokens(outputTokens);
  if (validOutputTokens === null) return baseScore;

  const adjustment = clamp(
    OUTPUT_EFFICIENCY_MAX_ADJUSTMENT *
      (1 - validOutputTokens / OUTPUT_EFFICIENCY_THRESHOLD_TOKENS),
    -OUTPUT_EFFICIENCY_MAX_ADJUSTMENT,
    OUTPUT_EFFICIENCY_MAX_ADJUSTMENT,
  );

  return baseScore * (1 + adjustment);
}

function toScoredModel(model: RankableModel): ScoredModel {
  const baseScore = calculateBaseScore(model);
  const rawOutputTokens = toValidOutputTokens(
    model.intelligenceIndexOutputTokens,
  );
  return {
    model: model.model,
    internalScore: calculateAdjustedScore(baseScore, rawOutputTokens),
    coding: model.coding,
    agentic: model.agentic,
    rawOutputTokens,
    output: toRoundedMillions(rawOutputTokens),
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

    const rankableModels = models
      .filter(isRankableReasoningModel)
      .filter(
        (model) =>
          !EXCLUDED_SLUG_PREFIXES.some((prefix) =>
            model.slug.startsWith(prefix),
          ),
      );

    const scoredModels = rankableModels.map(toScoredModel);

    if (scoredModels.length === 0) {
      throw new AiParseError(
        "No reasoning models with slug, coding, and agentic scores were found",
      );
    }

    const rankedModels = scoredModels.sort(compareFinalModels);

    if (rankedModels[0].internalScore <= 0) {
      throw new AiParseError(
        "First-ranked model has a non-positive internal score",
      );
    }

    const topInternalScore = rankedModels[0].internalScore;

    return rankedModels.map((entry) => ({
      model: entry.model,
      score: Math.round((entry.internalScore / topInternalScore) * 100),
      output: entry.output,
    }));
  }
}
