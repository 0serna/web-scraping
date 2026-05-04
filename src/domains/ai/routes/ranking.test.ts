import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createFastifyAppTracker } from "../../../shared/test-utils/fastify-test-helpers.js";
import { rankingRoutes } from "./ranking.js";

interface ModelRankingServiceMock {
  getRanking: () => Promise<
    Array<{
      model: string;
      position: number;
      score: number;
      tokensPerSecond: number | null;
    }>
  >;
}

function createServer(modelRankingService: ModelRankingServiceMock) {
  const app = Fastify({ logger: false });
  app.register(rankingRoutes, {
    modelRankingService: modelRankingService as never,
  });
  return app;
}

describe("rankingRoutes", () => {
  const trackApp = createFastifyAppTracker<ReturnType<typeof createServer>>();

  it("returns ranked models", async () => {
    const modelRankingService = {
      getRanking: vi.fn().mockResolvedValue([
        {
          model: "Model B",
          position: 1,
          score: 100,
          tokensPerSecond: 114,
        },
        {
          model: "Model A",
          position: 2,
          score: 91,
          tokensPerSecond: null,
        },
      ]),
    };

    const app = trackApp(createServer(modelRankingService));

    const response = await app.inject({
      method: "GET",
      url: "/ranking",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        model: "Model B",
        position: 1,
        score: 100,
        tokensPerSecond: 114,
      },
      {
        model: "Model A",
        position: 2,
        score: 91,
        tokensPerSecond: null,
      },
    ]);
  });

  it("returns 502 when ranking service fails", async () => {
    const modelRankingService = {
      getRanking: vi.fn().mockRejectedValue(new Error("ranking error")),
    };

    const app = trackApp(createServer(modelRankingService));

    const response = await app.inject({
      method: "GET",
      url: "/ranking",
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: "SCRAPING_ERROR",
        message: "Unable to fetch AI ranking",
      },
    });
  });
});
