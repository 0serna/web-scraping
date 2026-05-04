import { describe, expect, it, vi } from "vitest";
import type { ArtificialAnalysisModel } from "../types/ranking.js";
import { ModelRankingService } from "./model-ranking-service.js";

function rankingModel(
  overrides: Partial<ArtificialAnalysisModel> &
    Pick<ArtificialAnalysisModel, "slug" | "model" | "agentic" | "coding">,
): ArtificialAnalysisModel {
  return {
    reasoningModel: false,
    frontierModel: true,
    blendedPrice: null,
    inputPrice: null,
    outputPrice: null,
    intelligenceIndexOutputTokens: null,
    ...overrides,
  };
}

describe("ModelRankingService", () => {
  it("filters models without required fields and ranks by base score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
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
          frontierModel: true,
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
          frontierModel: true,
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
      {
        model: "Model B",
        position: 1,
        score: 100,
      },
      {
        model: "Model A",
        position: 2,
        score: 78.13,
      },
    ]);
  });

  it("throws when no model has both scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
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
          frontierModel: true,
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
          frontierModel: true,
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
          frontierModel: true,
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
          frontierModel: true,
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
        position: 1,
        score: 100,
      },
      {
        model: "Model A",
        position: 2,
        score: 100,
      },
      {
        model: "Model B",
        position: 3,
        score: 91.43,
      },
    ]);
  });

  it("uses tie-breakers for stable ordering", async () => {
    const tiedRows = [
      {
        slug: "model-x-cheap",
        model: "Model X",
        frontierModel: true,
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
        frontierModel: true,
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
        frontierModel: true,
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

    expect(modelXA).toEqual({
      model: "Model X",
      position: 2,
      score: 98.67,
    });
    expect(modelXB).toEqual({
      model: "Model X",
      position: 2,
      score: 98.67,
    });
    expect(rankingA).toEqual(rankingB);
  });

  it("returns 100 for the top-ranked model", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
          agentic: 80.123,
          coding: 40.456,
          blendedPrice: 0.2625,
          inputPrice: 0.15,
          outputPrice: 0.6,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        score: 100,
      },
    ]);
  });

  it("returns all ranked models", async () => {
    const models = Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      return {
        slug: `model-${rank}`,
        model: `Model ${rank}`,
        frontierModel: true,
        agentic: 100 - index,
        coding: 100 - index,
        blendedPrice: 0.5,
        inputPrice: 0.5,
        outputPrice: 1.25,
        intelligenceIndexOutputTokens: null,
      };
    });

    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue(models),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(30);
    expect(ranking[0]).toMatchObject({
      model: "Model 1",
      position: 1,
      score: 100,
    });
    expect(ranking[29]).toMatchObject({
      model: "Model 30",
      position: 30,
      score: 71,
    });
  });

  it("filters by frontier, coding, and agentic only", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
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
          frontierModel: true,
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
      {
        model: "Model B",
        position: 1,
        score: 100,
      },
    ]);
  });

  it("includes frontier model without price data", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
          agentic: 90,
          coding: 80,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        score: 100,
      },
    ]);
  });

  it("includes frontier non-reasoning model in the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "frontier-reasoning",
          model: "Frontier Reasoning",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "frontier-non-reasoning",
          model: "Frontier Non-Reasoning",
          reasoningModel: false,
          frontierModel: true,
          agentic: 95,
          coding: 95,
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
        model: "Frontier Non-Reasoning",
        position: 1,
        score: 100,
      },
      {
        model: "Frontier Reasoning",
        position: 2,
        score: 80,
      },
    ]);
  });

  it("excludes non-frontier models from the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "frontier-model",
          model: "Frontier Model",
          frontierModel: true,
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "non-frontier-model",
          model: "Non-Frontier Model",
          frontierModel: false,
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
        model: "Frontier Model",
        position: 1,
        score: 100,
      },
    ]);
  });

  it("applies frontier filtering before final score calculation", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "frontier-cheap",
          model: "Frontier Cheap",
          frontierModel: true,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.1,
          inputPrice: 0.05,
          outputPrice: 0.2,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "frontier-expensive",
          model: "Frontier Expensive",
          frontierModel: true,
          agentic: 80,
          coding: 80,
          blendedPrice: 10.0,
          inputPrice: 5.0,
          outputPrice: 20.0,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "non-frontier-cheap",
          model: "Non-Frontier Cheap",
          frontierModel: false,
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
        model: "Frontier Expensive",
        position: 1,
        score: 100,
      },
      {
        model: "Frontier Cheap",
        position: 2,
        score: 62.5,
      },
    ]);
  });

  it("throws when first-ranked model has non-positive internal score", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
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
          frontierModel: true,
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
          frontierModel: true,
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
          frontierModel: true,
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
      position: 1,
      score: 100,
    });
    expect(ranking[1]).toMatchObject({
      model: "Model B",
      position: 2,
      score: 99.98,
    });
  });

  it("excludes models with excluded slug prefix", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "claude-4-sonnet",
          model: "Claude 4 Sonnet",
          agentic: 90,
          coding: 80,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "gpt-5-5",
          model: "GPT-5.5",
          agentic: 70,
          coding: 60,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "GPT-5.5",
        position: 1,
        score: 100,
      },
    ]);
  });

  it("excludes claude models but keeps other frontier models", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "claude-4-sonnet",
          model: "Claude 4 Sonnet",
          agentic: 90,
          coding: 80,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "gemini-2-pro",
          model: "Gemini 2 Pro",
          agentic: 70,
          coding: 60,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        }),
        rankingModel({
          slug: "gpt-5-5",
          model: "GPT-5.5",
          agentic: 80,
          coding: 70,
          blendedPrice: 0.3,
          inputPrice: 0.2,
          outputPrice: 0.5,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "GPT-5.5",
        position: 1,
        score: 100,
      },
      {
        model: "Gemini 2 Pro",
        position: 2,
        score: 86.84,
      },
    ]);
  });

  it("ranks next model at position 1 when top model is excluded", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "claude-4-sonnet",
          model: "Claude 4 Sonnet",
          agentic: 100,
          coding: 100,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        }),
        rankingModel({
          slug: "gpt-5-5",
          model: "GPT-5.5",
          agentic: 70,
          coding: 60,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "GPT-5.5",
        position: 1,
        score: 100,
      },
    ]);
  });

  it("keeps zero-blended-price frontier models in the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          frontierModel: true,
          agentic: 100,
          coding: 100,
          blendedPrice: 0,
          inputPrice: 0,
          outputPrice: 0,
          intelligenceIndexOutputTokens: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          frontierModel: true,
          agentic: 90,
          coding: 90,
          blendedPrice: 0.625,
          inputPrice: 0.5,
          outputPrice: 1,
          intelligenceIndexOutputTokens: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        score: 100,
      },
      {
        model: "Model B",
        position: 2,
        score: 90,
      },
    ]);
  });

  it("promotes token-efficient model above higher base-score model", async () => {
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
          intelligenceIndexOutputTokens: 50000,
        }),
        rankingModel({
          slug: "model-efficient",
          model: "Model Efficient",
          agentic: 80,
          coding: 70,
          blendedPrice: 0.25,
          inputPrice: 0.15,
          outputPrice: 0.3,
          intelligenceIndexOutputTokens: 10000,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0].model).toBe("Model Efficient");
    expect(ranking[0].position).toBe(1);
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
    expect(ranking[0].position).toBe(1);
    expect(ranking[1].model).toBe("Model A");
    expect(ranking[1].position).toBe(2);
  });

  it("uses efficiency to break equal final-score ties", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        rankingModel({
          slug: "model-efficient",
          model: "Model Efficient",
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
          intelligenceIndexOutputTokens: 10000,
        }),
        rankingModel({
          slug: "model-inefficient",
          model: "Model Inefficient",
          agentic: 80,
          coding: 70,
          blendedPrice: 0.25,
          inputPrice: 0.15,
          outputPrice: 0.3,
          intelligenceIndexOutputTokens: 50000,
        }),
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0].model).toBe("Model Efficient");
    expect(ranking[0].position).toBe(1);
  });
});
