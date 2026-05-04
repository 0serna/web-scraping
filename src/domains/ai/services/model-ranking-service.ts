import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const WEIGHT_INTELLIGENCE_AGENTIC = 0.6;
const WEIGHT_INTELLIGENCE_CODING = 0.4;

const WEIGHT_EFFICIENCY = 0.15;
const EXCLUDED_SLUG_PREFIXES: readonly string[] = ["claude"];

function isRankableFrontierModel(
  model: ArtificialAnalysisModel,
): model is ArtificialAnalysisModel & {
  slug: string;
  frontierModel: true;
  coding: number;
  agentic: number;
} {
  return (
    model.slug.length > 0 &&
    model.frontierModel === true &&
    model.coding !== null &&
    model.agentic !== null
  );
}

interface ScoredModel {
  model: string;
  baseScore: number;
  efficiency: number;
  finalInternalScore: number;
  coding: number;
  agentic: number;
  tokensPerSecond: number | null;
}

type RankableModel = ArtificialAnalysisModel & {
  slug: string;
  frontierModel: true;
  coding: number;
  agentic: number;
};

function compareFinalModels(left: ScoredModel, right: ScoredModel): number {
  if (right.finalInternalScore !== left.finalInternalScore)
    return right.finalInternalScore - left.finalInternalScore;
  if (right.efficiency !== left.efficiency)
    return right.efficiency - left.efficiency;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  if (right.coding !== left.coding) return right.coding - left.coding;
  return left.model.localeCompare(right.model);
}

function hasValidOutputTokens(
  model: ArtificialAnalysisModel,
): model is ArtificialAnalysisModel & {
  intelligenceIndexOutputTokens: number;
} {
  return (
    model.intelligenceIndexOutputTokens !== null &&
    model.intelligenceIndexOutputTokens > 0
  );
}

function calculateBaseScore(model: RankableModel): number {
  return (
    model.coding * WEIGHT_INTELLIGENCE_CODING +
    model.agentic * WEIGHT_INTELLIGENCE_AGENTIC
  );
}

function toScoredModel(model: RankableModel): ScoredModel {
  const baseScore = calculateBaseScore(model);

  return {
    model: model.model,
    baseScore,
    efficiency: 0,
    finalInternalScore: baseScore,
    coding: model.coding,
    agentic: model.agentic,
    tokensPerSecond: model.tokensPerSecond,
  };
}

function applyEfficiencyBonus(
  scoredModels: ScoredModel[],
  rankableModels: RankableModel[],
): void {
  let bestEfficiency = 0;

  for (let i = 0; i < scoredModels.length; i++) {
    const model = rankableModels[i];
    if (!hasValidOutputTokens(model)) continue;

    const efficiency =
      scoredModels[i].baseScore /
      (model.intelligenceIndexOutputTokens / 1_000_000);
    scoredModels[i].efficiency = efficiency;
    if (efficiency > bestEfficiency) bestEfficiency = efficiency;
  }

  if (bestEfficiency <= 0) return;

  for (const scored of scoredModels) {
    const relativeEfficiency = scored.efficiency / bestEfficiency;
    scored.finalInternalScore =
      scored.baseScore * (1 + WEIGHT_EFFICIENCY * relativeEfficiency);
  }
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
      .filter(isRankableFrontierModel)
      .filter(
        (model) =>
          !EXCLUDED_SLUG_PREFIXES.some((prefix) =>
            model.slug.startsWith(prefix),
          ),
      );

    const scoredModels = rankableModels.map(toScoredModel);

    if (scoredModels.length === 0) {
      throw new AiParseError(
        "No frontier models with slug, coding, and agentic scores were found",
      );
    }

    if (WEIGHT_EFFICIENCY > 0 && rankableModels.some(hasValidOutputTokens)) {
      applyEfficiencyBonus(scoredModels, rankableModels);
    }

    const rankedModels = scoredModels.sort(compareFinalModels);

    if (rankedModels[0].finalInternalScore <= 0) {
      throw new AiParseError(
        "First-ranked model has a non-positive internal score",
      );
    }

    const topFinalInternalScore = rankedModels[0].finalInternalScore;

    return rankedModels.map((entry, index) => ({
      model: entry.model,
      position: index + 1,
      score: Number(
        ((entry.finalInternalScore / topFinalInternalScore) * 100).toFixed(2),
      ),
      tokensPerSecond: entry.tokensPerSecond,
    }));
  }
}
