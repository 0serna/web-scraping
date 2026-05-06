import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const WEIGHT_INTELLIGENCE_AGENTIC = 0.7;
const WEIGHT_INTELLIGENCE_CODING = 0.3;
const RECENT_MODEL_WINDOW_DAYS = 90;
const EXCLUDED_SLUG_PREFIXES: readonly string[] = ["claude"];

function isRankableReasoningModel(
  model: ArtificialAnalysisModel,
): model is ArtificialAnalysisModel & {
  slug: string;
  reasoningModel: true;
  coding: number;
  agentic: number;
} {
  return (
    model.slug.length > 0 &&
    model.reasoningModel === true &&
    model.deprecated !== true &&
    model.coding !== null &&
    model.agentic !== null
  );
}

function isModelReleasedWithinWindow(
  model: ArtificialAnalysisModel,
  cutoffDate: Date,
): boolean {
  if (model.releaseDate === null) return true;
  const modelDate = new Date(model.releaseDate);
  return modelDate >= cutoffDate;
}

interface ScoredModel {
  model: string;
  date: string | null;
  internalScore: number;
  coding: number;
  agentic: number;
  speed: number | null;
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
  return left.model.localeCompare(right.model);
}

function calculateBaseScore(model: RankableModel): number {
  return (
    model.coding * WEIGHT_INTELLIGENCE_CODING +
    model.agentic * WEIGHT_INTELLIGENCE_AGENTIC
  );
}

function toRoundedMillions(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value / 1_000_000);
}

function toScoredModel(model: RankableModel): ScoredModel {
  return {
    model: model.model,
    date: model.releaseDate,
    internalScore: calculateBaseScore(model),
    coding: model.coding,
    agentic: model.agentic,
    speed: model.tokensPerSecond,
    output: toRoundedMillions(model.intelligenceIndexOutputTokens),
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

    const cutoffDate = new Date(
      Date.now() - RECENT_MODEL_WINDOW_DAYS * 86_400_000,
    );

    const rankableModels = models
      .filter(isRankableReasoningModel)
      .filter((model) => isModelReleasedWithinWindow(model, cutoffDate))
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
      date: entry.date,
      score: Math.round((entry.internalScore / topInternalScore) * 100),
      speed: entry.speed,
      output: entry.output,
    }));
  }
}
