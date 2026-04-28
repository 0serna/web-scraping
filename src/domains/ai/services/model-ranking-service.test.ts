import { describe, expect, it, vi } from "vitest";
import { ModelRankingService } from "./model-ranking-service.js";

describe("ModelRankingService", () => {
  it("filters models without required fields and ranks by value", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.375,
          inputPrice: 0.25,
          outputPrice: 0.75,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: 40,
          blendedPrice: 0.375,
          inputPrice: 0.25,
          outputPrice: 0.75,
        },
        {
          slug: "model-c",
          model: "Model C",
          reasoningModel: true,
          frontierModel: true,
          agentic: 90,
          coding: null,
          blendedPrice: null,
          inputPrice: 0.15,
          outputPrice: 0.6,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model B",
        position: 1,
        score: 83.2,
        price1m: 0.38,
      },
      {
        model: "Model A",
        position: 2,
        score: 61.72,
        price1m: 0.38,
      },
    ]);
  });

  it("throws when no model has both scores", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: null,
          coding: 50,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: null,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).rejects.toMatchObject({
      name: "AiParseError",
    });
  });

  it("keeps rows with different slugs and returns value-ranked output", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a-fast",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: 90,
          coding: 40,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        },
        {
          slug: "model-a-smart",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: 70,
          coding: 70,
          blendedPrice: 0.75,
          inputPrice: 0.5,
          outputPrice: 1.5,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: 40,
          blendedPrice: 0.125,
          inputPrice: 0.1,
          outputPrice: 0.2,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        score: 86.24,
        price1m: 0.25,
      },
      {
        model: "Model B",
        position: 2,
        score: 83.2,
        price1m: 0.13,
      },
      {
        model: "Model A",
        position: 3,
        score: 79.38,
        price1m: 0.75,
      },
    ]);
  });

  it("uses tie-breakers during deduplication", async () => {
    const tiedRows = [
      {
        slug: "model-x-cheap",
        model: "Model X",
        reasoningModel: true,
        frontierModel: true,
        agentic: 89.5,
        coding: 50.75,
        blendedPrice: 0.125,
        inputPrice: 0.1,
        outputPrice: 0.2,
      },
      {
        slug: "model-x-expensive",
        model: "Model X",
        reasoningModel: true,
        frontierModel: true,
        agentic: 90,
        coding: 50,
        blendedPrice: 0.325,
        inputPrice: 0.3,
        outputPrice: 0.4,
      },
      {
        slug: "model-y",
        model: "Model Y",
        reasoningModel: true,
        frontierModel: true,
        agentic: 85,
        coding: 60,
        blendedPrice: 0.525,
        inputPrice: 0.5,
        outputPrice: 0.6,
      },
    ];

    const clientWithFirstOrder = {
      getModels: vi.fn().mockResolvedValue(tiedRows),
    };

    const clientWithReversedOrder = {
      getModels: vi.fn().mockResolvedValue([tiedRows[1], tiedRows[0], tiedRows[2]]),
    };

    const serviceA = new ModelRankingService(clientWithFirstOrder as never);
    const serviceB = new ModelRankingService(clientWithReversedOrder as never);

    const [rankingA, rankingB] = await Promise.all([serviceA.getRanking(), serviceB.getRanking()]);
    const modelXA = rankingA.find((entry) => entry.model === "Model X");
    const modelXB = rankingB.find((entry) => entry.model === "Model X");

    expect(modelXA).toEqual({
      model: "Model X",
      position: 1,
      score: 96.2,
      price1m: 0.13,
    });
    expect(modelXB).toEqual({
      model: "Model X",
      position: 1,
      score: 96.2,
      price1m: 0.13,
    });
    expect(rankingA).toEqual(rankingB);
  });

  it("returns base score in output", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80.123,
          coding: 40.456,
          blendedPrice: 0.2625,
          inputPrice: 0.15,
          outputPrice: 0.6,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model A",
        position: 1,
        score: 83.53,
        price1m: 0.26,
      },
    ]);
  });

  it("limits ranking response to top 15 models", async () => {
    const models = Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      return {
        slug: `model-${rank}`,
        model: `Model ${rank}`,
        reasoningModel: true,
        frontierModel: true,
        agentic: 100 - index,
        coding: 100 - index,
        blendedPrice: 0.5,
        inputPrice: 0.5,
        outputPrice: 1.25,
      };
    });

    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue(models),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking).toHaveLength(15);
    expect(ranking[0]).toMatchObject({
      model: "Model 1",
      position: 1,
      score: 130,
      price1m: 0.5,
    });
    expect(ranking[14]).toMatchObject({
      model: "Model 15",
      position: 15,
      score: 109.11,
      price1m: 0.5,
    });
  });

  it("returns only models with coding, agentic, and blended price", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: null,
          coding: 0,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: 0,
          coding: 0,
          blendedPrice: 0.2625,
          inputPrice: 0.15,
          outputPrice: 0.6,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model B",
        position: 1,
        score: 0,
        price1m: 0.26,
      },
    ]);
  });

  it("keeps negative weighted scores when present", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: null,
          coding: 0,
          blendedPrice: null,
          inputPrice: null,
          outputPrice: null,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: -10,
          coding: -10,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model B",
        position: 1,
        score: -10,
        price1m: 0.25,
      },
    ]);
  });

  it("sorts by unrounded score before relative rounding", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: 86.004,
          coding: 86.004,
          blendedPrice: 0.125,
          inputPrice: 0.1,
          outputPrice: 0.2,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: 86,
          coding: 86,
          blendedPrice: 0.2,
          inputPrice: null,
          outputPrice: null,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    expect(ranking[0]).toMatchObject({
      model: "Model A",
      position: 1,
      score: 111.81,
      price1m: 0.13,
    });
    expect(ranking[1]).toMatchObject({
      model: "Model B",
      position: 2,
      score: 106.4,
      price1m: 0.2,
    });
  });

  it("excludes non-frontier reasoning models from the ranking", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "frontier-model",
          model: "Frontier Model",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: 70,
          blendedPrice: 0.5,
          inputPrice: 0.3,
          outputPrice: 0.7,
        },
        {
          slug: "non-frontier-model",
          model: "Non-Frontier Model",
          reasoningModel: true,
          frontierModel: false,
          agentic: 90,
          coding: 90,
          blendedPrice: 0.25,
          inputPrice: 0.2,
          outputPrice: 0.4,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Frontier Model",
        position: 1,
        score: 98.8,
        price1m: 0.5,
      },
    ]);
  });

  it("excludes frontier non-reasoning models from the ranking", async () => {
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
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Frontier Reasoning",
        position: 1,
        score: 98.8,
        price1m: 0.5,
      },
    ]);
  });

  it("applies frontier filtering before efficiency percentile and final score calculation", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "frontier-cheap",
          model: "Frontier Cheap",
          reasoningModel: true,
          frontierModel: true,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.1,
          inputPrice: 0.05,
          outputPrice: 0.2,
        },
        {
          slug: "frontier-expensive",
          model: "Frontier Expensive",
          reasoningModel: true,
          frontierModel: true,
          agentic: 80,
          coding: 80,
          blendedPrice: 10.0,
          inputPrice: 5.0,
          outputPrice: 20.0,
        },
        {
          slug: "non-frontier-cheap",
          model: "Non-Frontier Cheap",
          reasoningModel: true,
          frontierModel: false,
          agentic: 50,
          coding: 50,
          blendedPrice: 0.01,
          inputPrice: 0.005,
          outputPrice: 0.02,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);
    const ranking = await service.getRanking();

    // If frontier filtering happened AFTER scoring, the non-frontier-cheap model
    // would lower the efficiency percentile and change the scores.
    // With frontier filtering BEFORE scoring, only frontier models are in the universe.
    // frontier-cheap: baseScore = 50, efficiency = 50 / sqrt(0.1) = 158.11
    // frontier-expensive: baseScore = 80, efficiency = 80 / sqrt(10) = 25.30
    // 85th percentile efficiency = 158.11
    // frontier-cheap relative efficiency = 100
    //   score = 50 * (1 + 0.3 * 1.0) = 65.00
    // frontier-expensive relative efficiency = 25.30 / 158.11 * 100 = 16.00
    //   score = 80 * (1 + 0.3 * 0.16) = 83.84
    expect(ranking).toHaveLength(2);
    expect(ranking).toEqual([
      {
        model: "Frontier Expensive",
        position: 1,
        score: 83.84,
        price1m: 10.0,
      },
      {
        model: "Frontier Cheap",
        position: 2,
        score: 65,
        price1m: 0.1,
      },
    ]);
  });

  it("keeps zero-price models without efficiency bonus", async () => {
    const artificialAnalysisClient = {
      getModels: vi.fn().mockResolvedValue([
        {
          slug: "model-a",
          model: "Model A",
          reasoningModel: true,
          frontierModel: true,
          agentic: 100,
          coding: 100,
          blendedPrice: 0,
          inputPrice: 0,
          outputPrice: 0,
        },
        {
          slug: "model-b",
          model: "Model B",
          reasoningModel: true,
          frontierModel: true,
          agentic: 90,
          coding: 90,
          blendedPrice: 0.625,
          inputPrice: 0.5,
          outputPrice: 1,
        },
      ]),
    };

    const service = new ModelRankingService(artificialAnalysisClient as never);

    await expect(service.getRanking()).resolves.toEqual([
      {
        model: "Model B",
        position: 1,
        score: 117,
        price1m: 0.63,
      },
      {
        model: "Model A",
        position: 2,
        score: 100,
        price1m: 0,
      },
    ]);
  });
});
