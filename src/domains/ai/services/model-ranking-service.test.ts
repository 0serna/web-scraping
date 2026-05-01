import { describe, expect, it, vi } from "vitest";
import { ModelRankingService } from "./model-ranking-service.js";

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
});
