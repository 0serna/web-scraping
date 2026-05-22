import { describe, expect, it, vi } from "vitest";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import {
  EXCLUDED_SLUG_PREFIXES,
  ModelRankingService,
} from "./model-ranking-service.js";

function rankingModel(
  overrides: Partial<ArtificialAnalysisModel> &
    Pick<ArtificialAnalysisModel, "slug" | "model" | "coding">,
): ArtificialAnalysisModel {
  return {
    frontierModel: false,
    blendedPrice: null,
    inputPrice: null,
    outputPrice: null,
    intelligenceIndexOutputTokens: 100_000_000,
    ...overrides,
  };
}

function createServiceForModels(models: ArtificialAnalysisModel[]) {
  return new ModelRankingService({
    getModels: vi.fn().mockResolvedValue(models),
  } as never);
}

function rankedModel(
  overrides: Pick<RankedModel, "model" | "rank"> & Partial<RankedModel>,
): RankedModel {
  const { model, rank, tokens = 100, coding = 0 } = overrides;

  return {
    rank,
    model,
    coding,
    tokens,
  };
}

function excludedPrefixModel(
  overrides: Partial<ArtificialAnalysisModel> = {},
): ArtificialAnalysisModel {
  const excludedSlugPrefix = EXCLUDED_SLUG_PREFIXES[0] ?? "excluded-prefix";

  return rankingModel({
    slug: `${excludedSlugPrefix}-candidate`,
    model: "Excluded Prefix Candidate",
    coding: 100,
    intelligenceIndexOutputTokens: 1_000_000,
    ...overrides,
  });
}

describe("ModelRankingService", () => {
  it("filters models without required fields and ranks by coding efficiency", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
        coding: 50,
        intelligenceIndexOutputTokens: 50_000_000,
      }),
      rankingModel({
        slug: "model-b",
        model: "Model B",
        coding: 80,
        intelligenceIndexOutputTokens: 100_000_000,
      }),
      rankingModel({
        slug: "model-c",
        model: "Model C",
        coding: null,
      }),
      rankingModel({
        slug: "model-d",
        model: "Model D",
        coding: 90,
        intelligenceIndexOutputTokens: null,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Model B", rank: 1, tokens: 100, coding: 80 }),
      rankedModel({ model: "Model A", rank: 2, tokens: 50, coding: 50 }),
    ]);
  });

  it("orders by efficiency instead of raw coding score", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "high-coding-high-tokens",
        model: "High Coding High Tokens",
        coding: 100,
        intelligenceIndexOutputTokens: 125_000_000,
      }),
      rankingModel({
        slug: "lower-coding-low-tokens",
        model: "Lower Coding Low Tokens",
        coding: 75,
        intelligenceIndexOutputTokens: 75_000_000,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({
        model: "High Coding High Tokens",
        rank: 1,
        tokens: 125,
        coding: 100,
      }),
      rankedModel({
        model: "Lower Coding Low Tokens",
        rank: 2,
        tokens: 75,
        coding: 75,
      }),
    ]);
  });

  it("uses coding, output tokens, and model name as deterministic efficiency tie-breakers", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "lower-coding",
        model: "Lower Coding",
        coding: 100,
        intelligenceIndexOutputTokens: 50_000_000,
      }),
      rankingModel({
        slug: "higher-coding",
        model: "Higher Coding",
        coding: 200,
        intelligenceIndexOutputTokens: 100_000_000,
      }),
      rankingModel({
        slug: "beta-name",
        model: "Beta Name",
        coding: 100,
        intelligenceIndexOutputTokens: 50_000_000,
      }),
      rankingModel({
        slug: "alpha-name",
        model: "Alpha Name",
        coding: 100,
        intelligenceIndexOutputTokens: 50_000_000,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking.map((entry) => entry.model)).toEqual([
      "Higher Coding",
      "Alpha Name",
      "Beta Name",
      "Lower Coding",
    ]);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
    expect(ranking[2].rank).toBe(3);
    expect(ranking[3].rank).toBe(4);
  });

  it("uses model name after efficiency, coding, and output-token ties", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "zulu-fewer-tokens",
        model: "Zulu Fewer Tokens",
        coding: 100,
        intelligenceIndexOutputTokens: 50_000_000,
      }),
      rankingModel({
        slug: "alpha-more-tokens",
        model: "Alpha More Tokens",
        coding: 100,
        intelligenceIndexOutputTokens: 50_000_000,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({
        model: "Alpha More Tokens",
        rank: 1,
        tokens: 50,
        coding: 100,
      }),
      rankedModel({
        model: "Zulu Fewer Tokens",
        rank: 2,
        tokens: 50,
        coding: 100,
      }),
    ]);
  });

  it("excludes configured slug prefixes before efficiency scoring", async () => {
    const service = createServiceForModels([
      excludedPrefixModel(),
      rankingModel({
        slug: "gpt-efficient",
        model: "GPT Efficient",
        coding: 50,
        intelligenceIndexOutputTokens: 10_000_000,
      }),
      rankingModel({
        slug: "gpt-follower",
        model: "GPT Follower",
        coding: 40,
        intelligenceIndexOutputTokens: 10_000_000,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({
        model: "GPT Efficient",
        rank: 1,
        tokens: 10,
        coding: 50,
      }),
      rankedModel({ model: "GPT Follower", rank: 2, tokens: 10, coding: 40 }),
    ]);
  });

  it("returns an empty ranking when all rankable models have excluded slug prefixes", async () => {
    const service = createServiceForModels([excludedPrefixModel()]);

    await expect(service.getRanking()).resolves.toEqual([]);
  });

  it("throws when no model has valid coding and output-token data", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "no-coding",
        model: "No Coding",
        coding: null,
      }),
      rankingModel({
        slug: "no-output-tokens",
        model: "No Output Tokens",
        coding: 80,
        intelligenceIndexOutputTokens: null,
      }),
    ]);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
      message: "No models with slug, coding, and output tokens were found",
    });
  });

  it("throws when first-ranked model has non-positive internal score", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "zero-coding",
        model: "Zero Coding",
        coding: 0,
        intelligenceIndexOutputTokens: 10_000_000,
      }),
    ]);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("includes model without price data or frontier flag", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
        coding: 80,
        frontierModel: false,
        blendedPrice: null,
        inputPrice: null,
        outputPrice: null,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Model A", rank: 1, coding: 80 }),
    ]);
  });

  it("excludes deprecated models before calculating relative scores", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "deprecated-top-model",
        model: "Deprecated Top Model",
        coding: 100,
        deprecated: true,
        intelligenceIndexOutputTokens: 10_000_000,
      }),
      rankingModel({
        slug: "active-model",
        model: "Active Model",
        coding: 70,
        deprecated: false,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Active Model", rank: 1, coding: 70 }),
    ]);
    expect(ranking[0]).not.toHaveProperty("deprecated");
  });

  it("keeps models with missing deprecated value eligible", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "unknown-lifecycle-model",
        model: "Unknown Lifecycle Model",
        coding: 70,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Unknown Lifecycle Model", rank: 1, coding: 70 }),
    ]);
  });

  it("throws when all otherwise rankable models are deprecated", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "deprecated-model-a",
        model: "Deprecated Model A",
        coding: 70,
        deprecated: true,
      }),
      rankingModel({
        slug: "deprecated-model-b",
        model: "Deprecated Model B",
        coding: 60,
        deprecated: true,
      }),
    ]);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("includes rounded output-token millions in ranking", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-with-output-tokens",
        model: "Model With Output Tokens",
        coding: 70,
        intelligenceIndexOutputTokens: 25_400_000,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({
        model: "Model With Output Tokens",
        rank: 1,
        tokens: 25,
        coding: 70,
      }),
    ]);
  });

  it("includes active models regardless of stale release-date metadata and omits date fields", async () => {
    const modelWithStaleDate = {
      ...rankingModel({
        slug: "old-model",
        model: "Old Model",
        coding: 80,
      }),
      releaseDate: "2025-01-15",
    } satisfies ArtificialAnalysisModel & { releaseDate: string };

    const service = createServiceForModels([
      modelWithStaleDate,
      rankingModel({
        slug: "recent-model",
        model: "Recent Model",
        coding: 60,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Old Model", rank: 1, coding: 80 }),
      rankedModel({ model: "Recent Model", rank: 2, coding: 60 }),
    ]);
    expect(ranking[0]).not.toHaveProperty("date");
    expect(ranking[0]).not.toHaveProperty("releaseDate");
  });

  it("returns models below the previous minimum score threshold", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "high-score-model",
        model: "High Score Model",
        coding: 100,
        intelligenceIndexOutputTokens: 100_000_000,
      }),
      rankingModel({
        slug: "low-score-model",
        model: "Low Score Model",
        coding: 60,
        intelligenceIndexOutputTokens: 100_000_000,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "High Score Model", rank: 1, coding: 100 }),
      rankedModel({ model: "Low Score Model", rank: 2, coding: 60 }),
    ]);
  });
});
