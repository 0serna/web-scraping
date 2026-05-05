import { describe, expect, it, vi } from "vitest";
import type { ArtificialAnalysisModel, RankedModel } from "../types/ranking.js";
import { ModelRankingService } from "./model-ranking-service.js";

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
    tokensPerSecond: null,
    releaseDate: null,
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
  return {
    tokensPerSecond: null,
    outputTokensMillions: null,
    releaseDate: null,
    ...overrides,
  };
}

function excludedClaudeModel(score = 90): ArtificialAnalysisModel {
  return rankingModel({
    slug: "claude-4-sonnet",
    model: "Claude 4 Sonnet",
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
  it("filters models without required fields and ranks by base score", async () => {
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      rankedModel({ model: "Model B", score: 100 }),
      rankedModel({ model: "Model A", score: 78.13 }),
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
      {
        model: "Model A",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
      {
        model: "Model B",
        score: 91.43,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("uses tie-breakers for stable ordering", async () => {
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
        tokensPerSecond: null,
        releaseDate: null,
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
        tokensPerSecond: null,
        releaseDate: null,
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
        tokensPerSecond: null,
        releaseDate: null,
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

    expect(modelXA).toEqual({
      model: "Model X",
      score: 98.67,
      tokensPerSecond: null,
      outputTokensMillions: null,
      releaseDate: null,
    });
    expect(modelXB).toEqual({
      model: "Model X",
      score: 98.67,
      tokensPerSecond: null,
      outputTokensMillions: null,
      releaseDate: null,
    });
    expect(rankingA).toEqual(rankingB);
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
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
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
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
      {
        model: "Reasoning Frontier",
        score: 80,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Reasoning Model",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
      {
        model: "Reasoning Cheap",
        score: 62.5,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
          tokensPerSecond: null,
          releaseDate: null,
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
      score: 99.98,
    });
  });

  it("excludes models with excluded slug prefix", async () => {
    const service = createServiceForModels([
      excludedClaudeModel(),
      gpt55Model(),
    ]);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "GPT-5.5",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("excludes claude models but keeps other reasoning models", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        excludedClaudeModel(),
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

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "GPT-5.5",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
      {
        model: "Gemini 2 Pro",
        score: 86.84,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("ranks next model first when top model is excluded", async () => {
    const artificialAnalysisClient = {
      getModels: vi
        .fn()
        .mockResolvedValue([excludedClaudeModel(100), gpt55Model()]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "GPT-5.5",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
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
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
      {
        model: "Model B",
        score: 90,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("does not promote token-efficient model above higher base-score model", async () => {
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

    expect(ranking).toEqual([
      {
        model: "Model High Base",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: 200,
        releaseDate: null,
      },
      {
        model: "Model Efficient",
        score: 88.37,
        tokensPerSecond: null,
        outputTokensMillions: 10,
        releaseDate: null,
      },
    ]);
    expect(ranking[0].score).toBe(100);
  });

  it("keeps models with missing output-token data rankable with no efficiency bonus", async () => {
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

  it("does not use output tokens to break equal-score ties", async () => {
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

    expect(ranking).toEqual([
      {
        model: "Model A Inefficient",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: 50,
        releaseDate: null,
      },
      {
        model: "Model B Efficient",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: 10,
        releaseDate: null,
      },
    ]);
  });

  it("includes rounded outputTokensMillions from source model in ranking", async () => {
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
        tokensPerSecond: null,
        outputTokensMillions: 25,
        releaseDate: null,
      },
    ]);
  });

  it("returns null outputTokensMillions when source model has no output-token data", async () => {
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
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("includes tokensPerSecond from source model in ranking", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-with-speed",
        model: "Model With Speed",
        agentic: 80,
        coding: 70,
        tokensPerSecond: 114,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model With Speed",
        score: 100,
        tokensPerSecond: 114,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("returns null tokensPerSecond when source model has no speed data", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "model-no-speed",
        model: "Model No Speed",
        agentic: 80,
        coding: 70,
        tokensPerSecond: null,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Model No Speed",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate: null,
      },
    ]);
  });

  it("excludes models older than 90 days", async () => {
    const oldDate = new Date(Date.now() - 120 * 86_400_000)
      .toISOString()
      .split("T")[0];
    const recentDate = new Date(Date.now() - 30 * 86_400_000)
      .toISOString()
      .split("T")[0];

    const service = createServiceForModels([
      rankingModel({
        slug: "old-model",
        model: "Old Model",
        agentic: 90,
        coding: 80,
        releaseDate: oldDate,
      }),
      rankingModel({
        slug: "recent-model",
        model: "Recent Model",
        agentic: 70,
        coding: 60,
        releaseDate: recentDate,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(1);
    expect(ranking[0].model).toBe("Recent Model");
    expect(ranking[0].releaseDate).toBe(recentDate);
  });

  it("includes models with null releaseDate", async () => {
    const service = createServiceForModels([
      rankingModel({
        slug: "unknown-date-model",
        model: "Unknown Date Model",
        agentic: 80,
        coding: 70,
        releaseDate: null,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(1);
    expect(ranking[0].model).toBe("Unknown Date Model");
    expect(ranking[0].releaseDate).toBeNull();
  });

  it("includes models with future releaseDate", async () => {
    const futureDate = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .split("T")[0];

    const service = createServiceForModels([
      rankingModel({
        slug: "future-model",
        model: "Future Model",
        agentic: 80,
        coding: 70,
        releaseDate: futureDate,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(1);
    expect(ranking[0].model).toBe("Future Model");
    expect(ranking[0].releaseDate).toBe(futureDate);
  });

  it("includes releaseDate in ranking response", async () => {
    const releaseDate = "2026-04-23";

    const service = createServiceForModels([
      rankingModel({
        slug: "dated-model",
        model: "Dated Model",
        agentic: 80,
        coding: 70,
        releaseDate,
      }),
    ]);

    const ranking = await service.getRanking();

    expect(ranking).toEqual([
      {
        model: "Dated Model",
        score: 100,
        tokensPerSecond: null,
        outputTokensMillions: null,
        releaseDate,
      },
    ]);
  });
});
