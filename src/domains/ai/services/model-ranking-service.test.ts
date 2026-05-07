import { describe, expect, it, vi } from "vitest";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import {
  EXCLUDED_SLUG_PREFIXES,
  ModelRankingService,
} from "./model-ranking-service.js";

const hasExcludedSlugPrefixes = EXCLUDED_SLUG_PREFIXES.length > 0;

function rankingModel(
  overrides: Partial<ArtificialAnalysisModel> &
    Pick<ArtificialAnalysisModel, "slug" | "model" | "agentic" | "coding">,
): ArtificialAnalysisModel {
  return {
    reasoningModel: true,
    frontierModel: false,
    blendedPrice: null,
    inputPrice: null,
    outputPrice: null,
    intelligenceIndexOutputTokens: null,
    ...overrides,
  };
}

function createServiceForModels(models: ArtificialAnalysisModel[]) {
  return new ModelRankingService({
    getModels: vi.fn().mockResolvedValue(models),
  } as never);
}

function rankedModel(
  overrides: Pick<RankedModel, "model" | "score"> & Partial<RankedModel>,
): RankedModel {
  const { model, score, output = null } = overrides;

  return {
    model,
    score,
    output,
  };
}

function excludedPrefixModel(score = 90): ArtificialAnalysisModel {
  const excludedSlugPrefix = EXCLUDED_SLUG_PREFIXES[0] ?? "excluded-prefix";

  return rankingModel({
    slug: `${excludedSlugPrefix}-candidate`,
    model: "Excluded Prefix Candidate",
    agentic: score,
    coding: score,
    blendedPrice: 0.5,
    inputPrice: 0.3,
    outputPrice: 0.7,
  });
}

function gpt55Model(agentic = 70, coding = 60): ArtificialAnalysisModel {
  return rankingModel({
    slug: "gpt-5-5",
    model: "GPT-5.5",
    agentic,
    coding,
    blendedPrice: 0.25,
    inputPrice: 0.2,
    outputPrice: 0.4,
  });
}

function outputTokenRankingModel(
  slug: string,
  model: string,
  outputTokens: number,
): ArtificialAnalysisModel {
  return rankingModel({
    slug,
    model,
    agentic: 80,
    coding: 70,
    blendedPrice: outputTokens < 20000 ? 0.25 : 0.5,
    inputPrice: outputTokens < 20000 ? 0.15 : 0.3,
    outputPrice: outputTokens < 20000 ? 0.3 : 0.7,
    intelligenceIndexOutputTokens: outputTokens,
  });
}

describe("ModelRankingService", () => {
  it("filters models without required fields and ranks by normalized base score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.375,
          inputPrice: 0.25,
          outputPrice: 0.75,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          agentic: 80,
          coding: 40,
          blendedPrice: 0.375,
          inputPrice: 0.25,
          outputPrice: 0.75,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-c",
          model: "Model C",
          reasoningModel: true,
          agentic: 90,
          coding: null,
          blendedPrice: null,
          inputPrice: 0.15,
          outputPrice: 0.6,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Model B", score: 100 }),
      rankedModel({ model: "Model A", score: 78 }),
    ]);
  });

  it("normalizes coding and agentic scores across the eligible set before weighting", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "coding-leader",
        model: "Coding Leader",
        agentic: 80,
        coding: 100,
      }),
      rankingModel({
        slug: "agentic-leader",
        model: "Agentic Leader",
        agentic: 100,
        coding: 60,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Agentic Leader", score: 100 }),
      rankedModel({ model: "Coding Leader", score: 98 }),
    ]);
  });

  it("throws when no model has both scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          agentic: null,
          coding: 50,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          agentic: 80,
          coding: null,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("keeps rows with duplicate model names and returns relative scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a-fast",
          model: "Model A",
          reasoningModel: true,
          agentic: 90,
          coding: 40,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-a-smart",
          model: "Model A",
          reasoningModel: true,
          agentic: 70,
          coding: 70,
          blendedPrice: 0.75,
          inputPrice: 0.5,
          outputPrice: 1.5,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          agentic: 80,
          coding: 40,
          blendedPrice: 0.125,
          inputPrice: 0.1,
          outputPrice: 0.2,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        score: 100,
        output: null,
      },
      {
        model: "Model A",
        score: 97,
        output: null,
      },
      {
        model: "Model B",
        score: 91,
        output: null,
      },
    ]);
  });

  it("uses normalized tie-breakers for stable ordering", async () => {
    const tiedRows = [
      {
        slug: "model-x-cheap",
        model: "Model X",
        reasoningModel: true,
        agentic: 89.5,
        coding: 50.75,
        blendedPrice: 0.125,
        inputPrice: 0.1,
        outputPrice: 0.2,
        intelligenceIndexOutputTokens: null,
      },
      {
        slug: "model-x-expensive",
        model: "Model X",
        reasoningModel: true,
        agentic: 90,
        coding: 50,
        blendedPrice: 0.325,
        inputPrice: 0.3,
        outputPrice: 0.4,
        intelligenceIndexOutputTokens: null,
      },
      {
        slug: "model-y",
        model: "Model Y",
        reasoningModel: true,
        agentic: 85,
        coding: 60,
        blendedPrice: 0.525,
        inputPrice: 0.5,
        outputPrice: 0.6,
        intelligenceIndexOutputTokens: null,
      },
    ];

    const clientWithFirstOrder = {
      getModels: vi.fn().mockResolvedValue(tiedRows),
    };

    const clientWithReversedOrder = {
      getModels: vi
        .fn()
        .mockResolvedValue([tiedRows[1], tiedRows[0], tiedRows[2]]),
    };

    const serviceA = new ModelRankingService(clientWithFirstOrder as never);
    const serviceB = new ModelRankingService(clientWithReversedOrder as never);

    const [rankingA, rankingB] = await Promise.all([
      serviceA.getRanking(),
      serviceB.getRanking(),
    ]);
    const modelXA = rankingA.find((entry) => entry.model === "Model X");
    const modelXB = rankingB.find((entry) => entry.model === "Model X");

    expect(modelXA).toEqual(modelXB);
    expect(rankingA).toEqual(rankingB);
    expect(rankingA[0].model).toBe("Model Y");
    expect(rankingA[1]).toEqual({
      model: "Model X",
      score: 99,
      output: null,
    });
  });

  it("prefers higher normalized agentic score before normalized coding in ties", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "higher-agentic",
        model: "Higher Agentic",
        agentic: 90,
        coding: 50,
      }),
      rankingModel({
        slug: "higher-coding",
        model: "Higher Coding",
        agentic: 60,
        coding: 190,
      }),
      rankingModel({
        slug: "max-agentic-anchor",
        model: "Max Agentic Anchor",
        agentic: 100,
        coding: 0,
      }),
      rankingModel({
        slug: "max-coding-anchor",
        model: "Max Coding Anchor",
        agentic: 0,
        coding: 200,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking.map((entry) => entry.model)).toEqual([
      "Higher Agentic",
      "Higher Coding",
      "Max Agentic Anchor",
      "Max Coding Anchor",
    ]);
  });

  it("returns 100 for the top-ranked model", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
        agentic: 80.123,
        coding: 40.456,
        blendedPrice: 0.2625,
        inputPrice: 0.15,
        outputPrice: 0.6,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        score: 100,
        output: null,
      },
    ]);
  });

  it("returns all ranked models", async () => {
    const models = Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      return rankingModel({
        slug: `model-${rank}`,
        model: `Model ${rank}`,
        agentic: 100 - index,
        coding: 100 - index,
        blendedPrice: 0.5,
        inputPrice: 0.5,
        outputPrice: 1.25,
      });
    });

    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue(models),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(30);
    expect(ranking[0]).toMatchObject({
      model: "Model 1",
      score: 100,
    });
    expect(ranking[29]).toMatchObject({
      model: "Model 30",
      score: 71,
    });
  });

  it("filters by reasoning, coding, and agentic only", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          agentic: null,
          coding: 0,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          agentic: 10,
          coding: 10,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Model B", score: 100 }),
    ]);
  });

  it("includes reasoning model without price data", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
        agentic: 90,
        coding: 80,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        score: 100,
        output: null,
      },
    ]);
  });

  it("includes reasoning model without frontier flag in the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "reasoning-frontier",
          model: "Reasoning Frontier",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "reasoning-non-frontier",
          model: "Reasoning Non-Frontier",
          reasoningModel: true,
          frontierModel: false,
          agentic: 95,
          coding: 95,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Reasoning Non-Frontier",
        score: 100,
        output: null,
      },
      {
        model: "Reasoning Frontier",
        score: 81,
        output: null,
      },
    ]);
  });

  it("excludes non-reasoning models from the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "reasoning-model",
          model: "Reasoning Model",
          reasoningModel: true,
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "non-reasoning-model",
          model: "Non-Reasoning Model",
          reasoningModel: false,
          agentic: 90,
          coding: 90,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Reasoning Model",
        score: 100,
        output: null,
      },
    ]);
  });

  it("applies reasoning filtering before final score calculation", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "reasoning-cheap",
          model: "Reasoning Cheap",
          reasoningModel: true,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.1,
          inputPrice: 0.05,
          outputPrice: 0.2,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "reasoning-expensive",
          model: "Reasoning Expensive",
          reasoningModel: true,
          agentic: 80,
          coding: 80,
          blendedPrice: 10.0,
          inputPrice: 5.0,
          outputPrice: 20.0,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "non-reasoning-cheap",
          model: "Non-Reasoning Cheap",
          reasoningModel: false,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.01,
          inputPrice: 0.005,
          outputPrice: 0.02,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(2);
    expect(ranking).toEqual([
      {
        model: "Reasoning Expensive",
        score: 100,
        output: null,
      },
      {
        model: "Reasoning Cheap",
        score: 63,
        output: null,
      },
    ]);
  });

  it("throws when first-ranked model has non-positive internal score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          agentic: null,
          coding: 0,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          agentic: -10,
          coding: -10,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("sorts by unrounded score before relative rounding", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          agentic: 86.004,
          coding: 86.004,
          blendedPrice: 0.125,
          inputPrice: 0.1,
          outputPrice: 0.2,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          agentic: 85.99,
          coding: 85.99,
          blendedPrice: 0.2,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0]).toMatchObject({
      model: "Model A",
      score: 100,
    });
    expect(ranking[1]).toMatchObject({
      model: "Model B",
      score: 100,
    });
  });

  it("excludes models with excluded slug prefix", async () => {
    const service = createServiceForModels([
      excludedPrefixModel(),
      gpt55Model(),
    ]);

    await expect(service.getRanking()).resolves.toEqual(
      hasExcludedSlugPrefixes
        ? [
            {
              model: "GPT-5.5",
              score: 100,
              output: null,
            },
          ]
        : [
            {
              model: "Excluded Prefix Candidate",
              score: 100,
              output: null,
            },
            {
              model: "GPT-5.5",
              score: 74,
              output: null,
            },
          ],
    );
  });

  it("excludes models with configured slug prefixes but keeps other reasoning models", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        excludedPrefixModel(),
        rankingModel({
          slug: "gemini-2-pro",
          model: "Gemini 2 Pro",
          agentic: 70,
          coding: 60,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        }),
        gpt55Model(80, 70),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual(
      hasExcludedSlugPrefixes
        ? [
            {
              model: "GPT-5.5",
              score: 100,
              output: null,
            },
            {
              model: "Gemini 2 Pro",
              score: 87,
              output: null,
            },
          ]
        : [
            {
              model: "Excluded Prefix Candidate",
              score: 100,
              output: null,
            },
            {
              model: "GPT-5.5",
              score: 86,
              output: null,
            },
            {
              model: "Gemini 2 Pro",
              score: 74,
              output: null,
            },
          ],
    );
  });

  it("ranks next model first when top model is excluded", async () => {
    const artificialAnalysisClient = {
      getModels: vi
        .fn()
        .mockResolvedValue([excludedPrefixModel(100), gpt55Model()]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual(
      hasExcludedSlugPrefixes
        ? [
            {
              model: "GPT-5.5",
              score: 100,
              output: null,
            },
          ]
        : [
            {
              model: "Excluded Prefix Candidate",
              score: 100,
              output: null,
            },
            {
              model: "GPT-5.5",
              score: 67,
              output: null,
            },
          ],
    );
  });

  it("excludes deprecated models before calculating relative scores", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "deprecated-top-model",
        model: "Deprecated Top Model",
        agentic: 100,
        coding: 100,
        deprecated: true,
      }),
      rankingModel({
        slug: "active-model",
        model: "Active Model",
        agentic: 80,
        coding: 70,
        deprecated: false,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Active Model", score: 100 }),
    ]);
    expect(ranking[0]).not.toHaveProperty("deprecated");
  });

  it("keeps models with missing deprecated value eligible", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "unknown-lifecycle-model",
        model: "Unknown Lifecycle Model",
        agentic: 80,
        coding: 70,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Unknown Lifecycle Model", score: 100 }),
    ]);
  });

  it("throws when all otherwise rankable models are deprecated", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "deprecated-model-a",
        model: "Deprecated Model A",
        agentic: 80,
        coding: 70,
        deprecated: true,
      }),
      rankingModel({
        slug: "deprecated-model-b",
        model: "Deprecated Model B",
        agentic: 70,
        coding: 60,
        deprecated: true,
      }),
    ]);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("keeps zero-blended-price reasoning models in the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-a",
          model: "Model A",
          agentic: 100,
          coding: 100,
          blendedPrice: 0,
          inputPrice: 0,
          outputPrice: 0,
        }),
        rankingModel({
          slug: "model-b",
          model: "Model B",
          agentic: 90,
          coding: 90,
          blendedPrice: 0.625,
          inputPrice: 0.5,
          outputPrice: 1,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        score: 100,
        output: null,
      },
      {
        model: "Model B",
        score: 90,
        output: null,
      },
    ]);
  });

  it("applies positive output-efficiency adjustment below the threshold", async () => {
    const service = createServiceForModels([
      outputTokenRankingModel(
        "model-threshold",
        "Model Threshold",
        100_000_000,
      ),
      outputTokenRankingModel("model-efficient", "Model Efficient", 10_000_000),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Efficient", score: 100, output: 10 }),
      rankedModel({ model: "Model Threshold", score: 90, output: 100 }),
    ]);
  });

  it("treats threshold output tokens as a neutral adjustment", async () => {
    const service = createServiceForModels([
      outputTokenRankingModel(
        "model-threshold",
        "Model Threshold",
        100_000_000,
      ),
      rankingModel({
        slug: "model-higher-base",
        model: "Model Higher Base",
        agentic: 82,
        coding: 72,
        intelligenceIndexOutputTokens: null,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Higher Base", score: 100, output: null }),
      rankedModel({ model: "Model Threshold", score: 95, output: 100 }),
    ]);
  });

  it("applies bounded efficiency adjustment that can promote token-efficient model", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-high-base",
          model: "Model High Base",
          agentic: 90,
          coding: 80,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: 200_000_000,
        }),
        outputTokenRankingModel(
          "model-efficient",
          "Model Efficient",
          10_000_000,
        ),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0].model).toBe("Model Efficient");
    expect(ranking[0].score).toBe(100);
    expect(ranking[1].model).toBe("Model High Base");
    expect(ranking[1].score).toBe(94);
  });

  it("applies output-efficiency adjustment after normalized weighting", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "higher-normalized-base",
        model: "Higher Normalized Base",
        agentic: 100,
        coding: 60,
        intelligenceIndexOutputTokens: 200_000_000,
      }),
      rankingModel({
        slug: "lower-base-more-efficient",
        model: "Lower Base More Efficient",
        agentic: 95,
        coding: 60,
        intelligenceIndexOutputTokens: 1,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({
        model: "Lower Base More Efficient",
        score: 100,
        output: 0,
      }),
      rankedModel({ model: "Higher Normalized Base", score: 85, output: 200 }),
    ]);
  });

  it("applies a capped penalty above the threshold", async () => {
    const service = createServiceForModels([
      outputTokenRankingModel(
        "model-threshold",
        "Model Threshold",
        100_000_000,
      ),
      outputTokenRankingModel(
        "model-penalized",
        "Model Penalized",
        400_000_000,
      ),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Threshold", score: 100, output: 100 }),
      rankedModel({ model: "Model Penalized", score: 92, output: 400 }),
    ]);
  });

  it("keeps models with missing output-token data rankable with a neutral adjustment", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-with-tokens",
          model: "Model With Tokens",
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: 20000,
        }),
        rankingModel({
          slug: "model-no-tokens",
          model: "Model No Tokens",
          agentic: 90,
          coding: 80,
          blendedPrice: 0.25,
          inputPrice: 0.15,
          outputPrice: 0.3,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(2);
    expect(ranking.map((r) => r.model)).toContain("Model No Tokens");
    expect(ranking.map((r) => r.model)).toContain("Model With Tokens");
  });

  it("keeps invalid or non-positive output-token data neutral and rankable", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-invalid-output",
        model: "Model Invalid Output",
        agentic: 90,
        coding: 80,
        intelligenceIndexOutputTokens: Number.NaN,
      }),
      rankingModel({
        slug: "model-zero-output",
        model: "Model Zero Output",
        agentic: 70,
        coding: 60,
        intelligenceIndexOutputTokens: 0,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Invalid Output", score: 100, output: null }),
      rankedModel({ model: "Model Zero Output", score: 77, output: null }),
    ]);
  });

  it("preserves base ranking when no model has valid token data", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-a",
          model: "Model A",
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "model-b",
          model: "Model B",
          agentic: 90,
          coding: 80,
          blendedPrice: 0.25,
          inputPrice: 0.15,
          outputPrice: 0.3,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0].model).toBe("Model B");
    expect(ranking[1].model).toBe("Model A");
  });

  it("ranks lower-output model higher when base scores are equal via output-efficiency adjustment", async () => {
    const service = createServiceForModels([
      outputTokenRankingModel(
        "model-inefficient",
        "Model A Inefficient",
        50_000_000,
      ),
      outputTokenRankingModel(
        "model-efficient",
        "Model B Efficient",
        10_000_000,
      ),
    ]);
    const ranking = await service.getRanking();

    expect(ranking[0].model).toBe("Model B Efficient");
    expect(ranking[0].score).toBe(100);
    expect(ranking[1].model).toBe("Model A Inefficient");
    expect(ranking[1].score).toBe(95);
  });

  it("prefers lower valid output-token counts when adjusted score and other tie-breaks are equal", async () => {
    const service = createServiceForModels([
      outputTokenRankingModel(
        "model-higher-output",
        "Model Higher Output",
        400_000_000,
      ),
      outputTokenRankingModel(
        "model-lower-output",
        "Model Lower Output",
        200_000_000,
      ),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Lower Output", score: 100, output: 200 }),
      rankedModel({ model: "Model Higher Output", score: 100, output: 400 }),
    ]);
  });

  it("sorts lower valid output-token counts ahead of missing data when all prior tie-breaks are equal", async () => {
    const service = createServiceForModels([
      outputTokenRankingModel(
        "model-valid-output",
        "Model Valid Output",
        100_000_000,
      ),
      rankingModel({
        slug: "model-missing-output",
        model: "Model Missing Output",
        agentic: 80,
        coding: 70,
        intelligenceIndexOutputTokens: null,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Missing Output", score: 100, output: null }),
      rankedModel({ model: "Model Valid Output", score: 98, output: 100 }),
    ]);
  });

  it("includes rounded output from source model in ranking", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-with-output-tokens",
        model: "Model With Output Tokens",
        agentic: 80,
        coding: 70,
        intelligenceIndexOutputTokens: 25_400_000,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model With Output Tokens",
        score: 100,
        output: 25,
      },
    ]);
  });

  it("returns null output when source model has no output-token data", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-no-output-tokens",
        model: "Model No Output Tokens",
        agentic: 80,
        coding: 70,
        intelligenceIndexOutputTokens: null,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model No Output Tokens",
        score: 100,
        output: null,
      },
    ]);
  });

  it("includes active models regardless of stale release-date metadata", async () => {
    const modelWithStaleDate = {
      ...rankingModel({
        slug: "old-model",
        model: "Old Model",
        agentic: 90,
        coding: 80,
      }),
      releaseDate: "2025-01-15",
    } satisfies ArtificialAnalysisModel & { releaseDate: string };

    const service = createServiceForModels([
      modelWithStaleDate,
      rankingModel({
        slug: "recent-model",
        model: "Recent Model",
        agentic: 70,
        coding: 60,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Old Model", score: 100 }),
      rankedModel({ model: "Recent Model", score: 77 }),
    ]);
  });

  it("includes models without release-date metadata", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "unknown-date-model",
        model: "Unknown Date Model",
        agentic: 80,
        coding: 70,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(1);
    expect(ranking[0].model).toBe("Unknown Date Model");
    expect(ranking[0]).not.toHaveProperty("date");
    expect(ranking[0]).not.toHaveProperty("releaseDate");
  });

  it("omits date fields from ranking response", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "dated-model",
        model: "Dated Model",
        agentic: 80,
        coding: 70,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Dated Model",
        score: 100,
        output: null,
      },
    ]);
    expect(ranking[0]).not.toHaveProperty("date");
    expect(ranking[0]).not.toHaveProperty("releaseDate");
  });
});
