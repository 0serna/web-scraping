import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createFastifyAppTracker } from "../../../shared/test-utils/fastify-test-helpers.js";
import type { RankedModel } from "../types/ranking.js";
import { rankingRoutes } from "./ranking.js";

interface ModelRankingServiceMock {
  getRanking: () => Promise<RankedModel[]>;
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
          date: "2026-04-23",
          score: 100,
          speed: 114,
          output: 25,
        },
        {
          model: "Model A",
          date: null,
          score: 91,
          speed: null,
          output: null,
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
        date: "2026-04-23",
        score: 100,
        speed: 114,
        output: 25,
      },
      {
        model: "Model A",
        date: null,
        score: 91,
        speed: null,
        output: null,
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
