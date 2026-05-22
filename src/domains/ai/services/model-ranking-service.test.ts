import { describe, expect, it, vi } from "vitest";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import {
  EXCLUDED_SLUG_PREFIXES,
  MIN_SCORE_THRESHOLD,
  ModelRankingService,
} from "./model-ranking-service.js";

const hasExcludedSlugPrefixes = EXCLUDED_SLUG_PREFIXES.length > 0;

function rankingModel(
  overrides: Partial<ArtificialAnalysisModel> &
    Pick<ArtificialAnalysisModel, "slug" | "model" | "coding">,
): ArtificialAnalysisModel {
  return {
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
  const { model, score, tokens = null } = overrides;

  return {
    model,
    score,
    tokens,
  };
}

function excludedPrefixModel(score = 90): ArtificialAnalysisModel {
  const excludedSlugPrefix = EXCLUDED_SLUG_PREFIXES[0] ?? "excluded-prefix";

  return rankingModel({
    slug: `${excludedSlugPrefix}-candidate`,
    model: "Excluded Prefix Candidate",
    coding: score,
    blendedPrice: 0.5,
    inputPrice: 0.3,
    outputPrice: 0.7,
  });
}

function gpt55Model(coding = 60): ArtificialAnalysisModel {
  return rankingModel({
    slug: "gpt-5-5",
    model: "GPT-5.5",
    coding,
    blendedPrice: 0.25,
    inputPrice: 0.2,
    outputPrice: 0.4,
  });
}

describe("ModelRankingService", () => {
  it("filters models without required fields and ranks by normalized base score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          coding: 50,
          blendedPrice: 0.375,
          inputPrice: 0.25,
          outputPrice: 0.75,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          coding: 40,
          blendedPrice: 0.375,
          inputPrice: 0.25,
          outputPrice: 0.75,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-c",
          model: "Model C",
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
      rankedModel({ model: "Model A", score: 100 }),
      rankedModel({ model: "Model B", score: 80 }),
    ]);
  });

  it("normalizes coding scores across the eligible set", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "coding-leader",
        model: "Coding Leader",
        coding: 100,
      }),
      rankingModel({
        slug: "coding-follower",
        model: "Coding Follower",
        coding: 70,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Coding Leader", score: 100 }),
      rankedModel({ model: "Coding Follower", score: 70 }),
    ]);
  });

  it("throws when no model has a coding score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          coding: null,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
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
          coding: 50,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-a-smart",
          model: "Model A",
          coding: 70,
          blendedPrice: 0.75,
          inputPrice: 0.5,
          outputPrice: 1.5,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          coding: 50,
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
        tokens: null,
      },
      {
        model: "Model A",
        score: 71,
        tokens: null,
      },
      {
        model: "Model B",
        score: 71,
        tokens: null,
      },
    ]);
  });

  it("uses normalized tie-breakers for stable ordering", async () => {
    const tiedRows = [
      {
        slug: "model-x-cheap",
        model: "Model X",
        coding: 50.75,
        blendedPrice: 0.125,
        inputPrice: 0.1,
        outputPrice: 0.2,
        intelligenceIndexOutputTokens: null,
      },
      {
        slug: "model-x-expensive",
        model: "Model X",
        coding: 50,
        blendedPrice: 0.325,
        inputPrice: 0.3,
        outputPrice: 0.4,
        intelligenceIndexOutputTokens: null,
      },
      {
        slug: "model-y",
        model: "Model Y",
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
      score: 85,
      tokens: null,
    });
  });

  it("prefers coding and model name for deterministic ordering", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "alpha-coding-tie",
        model: "Alpha Coding Tie",
        coding: 50,
      }),
      rankingModel({
        slug: "higher-coding",
        model: "Higher Coding",
        coding: 190,
      }),
      rankingModel({
        slug: "zero-coding-anchor",
        model: "Zero Coding Anchor",
        coding: 0,
      }),
      rankingModel({
        slug: "max-coding-anchor",
        model: "Max Coding Anchor",
        coding: 200,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking.map((entry) => entry.model)).toEqual([
      "Max Coding Anchor",
      "Higher Coding",
    ]);
  });

  it("returns 100 for the top-ranked model", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
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
        tokens: null,
      },
    ]);
  });

  it("returns all ranked models", async () => {
    const models = Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      return rankingModel({
        slug: `model-${rank}`,
        model: `Model ${rank}`,
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

  it("filters by slug and coding only", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          coding: 0,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
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

  it("includes model without price data", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
        coding: 80,
      }),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        score: 100,
        tokens: null,
      },
    ]);
  });

  it("includes model without frontier flag in the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "frontier-model",
          model: "Frontier Model",
          frontierModel: true,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "non-frontier-model",
          model: "Non-Frontier Model",
          frontierModel: false,
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
        model: "Non-Frontier Model",
        score: 100,
        tokens: null,
      },
      {
        model: "Frontier Model",
        score: 74,
        tokens: null,
      },
    ]);
  });

  it("includes all models with valid scores in ranking calculation", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "low-score-model-a",
          model: "Low Score Model A",
          coding: 50,
          blendedPrice: 0.1,
          inputPrice: 0.05,
          outputPrice: 0.2,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "high-score-model",
          model: "High Score Model",
          coding: 80,
          blendedPrice: 10.0,
          inputPrice: 5.0,
          outputPrice: 20.0,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "low-score-model-b",
          model: "Low Score Model B",
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

    expect(ranking).toHaveLength(1);
    expect(ranking).toEqual([
      {
        model: "High Score Model",
        score: 100,
        tokens: null,
      },
    ]);
  });

  it("throws when first-ranked model has non-positive internal score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          coding: 0,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
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
          coding: 86.004,
          blendedPrice: 0.125,
          inputPrice: 0.1,
          outputPrice: 0.2,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
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
        ? []
        : [
            {
              model: "Excluded Prefix Candidate",
              score: 100,
              tokens: null,
            },
            {
              model: "GPT-5.5",
              score: 67,
              tokens: null,
            },
          ],
    );
  });

  it("excludes models with configured slug prefixes but keeps other models", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        excludedPrefixModel(),
        rankingModel({
          slug: "gemini-2-pro",
          model: "Gemini 2 Pro",
          coding: 60,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        }),
        gpt55Model(80),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual(
      hasExcludedSlugPrefixes
        ? [
            {
              model: "GPT-5.5",
              score: 89,
              tokens: null,
            },
          ]
        : [
            {
              model: "Excluded Prefix Candidate",
              score: 100,
              tokens: null,
            },
            {
              model: "GPT-5.5",
              score: 78,
              tokens: null,
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
        ? []
        : [
            {
              model: "Excluded Prefix Candidate",
              score: 100,
              tokens: null,
            },
            {
              model: "GPT-5.5",
              score: 66,
              tokens: null,
            },
          ],
    );
  });

  it("excludes deprecated models before calculating relative scores", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "deprecated-top-model",
        model: "Deprecated Top Model",
        coding: 100,
        deprecated: true,
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
      rankedModel({ model: "Active Model", score: 100 }),
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
      rankedModel({ model: "Unknown Lifecycle Model", score: 100 }),
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

  it("keeps zero-blended-price models in the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-a",
          model: "Model A",
          coding: 100,
          blendedPrice: 0,
          inputPrice: 0,
          outputPrice: 0,
        }),
        rankingModel({
          slug: "model-b",
          model: "Model B",
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
        tokens: null,
      },
      {
        model: "Model B",
        score: 90,
        tokens: null,
      },
    ]);
  });

  it("keeps models with missing output-token data rankable with a neutral adjustment", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-with-tokens",
          model: "Model With Tokens",
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: 20000,
        }),
        rankingModel({
          slug: "model-no-tokens",
          model: "Model No Tokens",
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
        coding: 80,
        intelligenceIndexOutputTokens: Number.NaN,
      }),
      rankingModel({
        slug: "model-zero-output",
        model: "Model Zero Output",
        coding: 60,
        intelligenceIndexOutputTokens: 0,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      rankedModel({ model: "Model Invalid Output", score: 100, tokens: null }),
      rankedModel({ model: "Model Zero Output", score: 75, tokens: null }),
    ]);
  });

  it("preserves base ranking when no model has valid token data", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-a",
          model: "Model A",
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "model-b",
          model: "Model B",
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

  it("includes rounded output from source model in ranking", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-with-output-tokens",
        model: "Model With Output Tokens",
        coding: 70,
        intelligenceIndexOutputTokens: 25_400_000,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model With Output Tokens",
        score: 100,
        tokens: 25,
      },
    ]);
  });

  it("returns null output when source model has no output-token data", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-no-output-tokens",
        model: "Model No Output Tokens",
        coding: 70,
        intelligenceIndexOutputTokens: null,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model No Output Tokens",
        score: 100,
        tokens: null,
      },
    ]);
  });

  it("includes active models regardless of stale release-date metadata", async () => {
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
      rankedModel({ model: "Old Model", score: 100 }),
      rankedModel({ model: "Recent Model", score: 75 }),
    ]);
  });

  it("includes models without release-date metadata", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "unknown-date-model",
        model: "Unknown Date Model",
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
        coding: 70,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Dated Model",
        score: 100,
        tokens: null,
      },
    ]);
    expect(ranking[0]).not.toHaveProperty("date");
    expect(ranking[0]).not.toHaveProperty("releaseDate");
  });

  it("includes models with valid coding scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "valid-model-a",
          model: "Valid Model A",
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "valid-model-b",
          model: "Valid Model B",
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
        model: "Valid Model B",
        score: 100,
        tokens: null,
      },
      {
        model: "Valid Model A",
        score: 78,
        tokens: null,
      },
    ]);
  });

  it("excludes models below minimum score threshold", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "high-score-model",
        model: "High Score Model",
        coding: 100,
      }),
      rankingModel({
        slug: "low-score-model",
        model: "Low Score Model",
        coding: 30,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "High Score Model",
        score: 100,
        tokens: null,
      },
    ]);
    expect(ranking).toHaveLength(1);
  });

  it("filters out models with relative score below threshold", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-a",
        model: "Model A",
        coding: 20,
      }),
      rankingModel({
        slug: "model-b",
        model: "Model B",
        coding: 40,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model B",
        score: 100,
        tokens: null,
      },
    ]);
  });

  it("uses configured MIN_SCORE_THRESHOLD constant", async () => {
    expect(MIN_SCORE_THRESHOLD).toBe(70);
  });
});
