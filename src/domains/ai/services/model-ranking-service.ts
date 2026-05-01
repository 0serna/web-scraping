import { AiParseError } from "../types/errors.js";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ArtificialAnalysisClient } from "./artificial-analysis-client.js";

const WEIGHT_INTELLIGENCE_AGENTIC = 0.6;
const WEIGHT_INTELLIGENCE_CODING = 0.4;

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
  score: number;
  coding: number;
  agentic: number;
}

function compareFinalModels(left: ScoredModel, right: ScoredModel): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.agentic !== left.agentic) return right.agentic - left.agentic;
  if (right.coding !== left.coding) return right.coding - left.coding;
  return left.model.localeCompare(right.model);
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

    const scoredModels: ScoredModel[] = models
      .filter(isRankableFrontierModel)
      .map((model) => {
        return {
          model: model.model,
          score:
            model.coding * WEIGHT_INTELLIGENCE_CODING +
            model.agentic * WEIGHT_INTELLIGENCE_AGENTIC,
          coding: model.coding,
          agentic: model.agentic,
        };
      });

    if (scoredModels.length === 0) {
      throw new AiParseError(
        "No frontier models with slug, coding, and agentic scores were found",
      );
    }

    const rankedModels = scoredModels.sort(compareFinalModels);

    if (rankedModels[0].score <= 0) {
      throw new AiParseError(
        "First-ranked model has a non-positive internal score",
      );
    }

    const topInternalScore = rankedModels[0].score;

    return rankedModels.map((entry, index) => ({
      model: entry.model,
      position: index + 1,
      score: Number(((entry.score / topInternalScore) * 100).toFixed(2)),
    }));
  }
}
