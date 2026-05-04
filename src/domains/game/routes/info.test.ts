import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createFastifyAppTracker } from "../../../shared/test-utils/fastify-test-helpers.js";
import { infoRoutes } from "./info.js";

function createServer(gameInfoService: {
  getGameInfoByAppId: (appId: string) => Promise<unknown>;
}) {
  const app = Fastify({ logger: false });
  app.register(infoRoutes, { gameInfoService: gameInfoService as never });
  return app;
}

describe("infoRoutes", () => {
  const trackApp = createFastifyAppTracker<ReturnType<typeof createServer>>();

  it("returns 400 when url query is missing", async () => {
    const gameInfoService = { getGameInfoByAppId: vi.fn() };
    const app = trackApp(createServer(gameInfoService));

    const response = await app.inject({
      method: "GET",
      url: "/info",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_URL",
        message: "URL parameter is required",
      },
    });
    expect(gameInfoService.getGameInfoByAppId).not.toHaveBeenCalled();
  });

  it("returns 400 when steam app id cannot be extracted", async () => {
    const gameInfoService = { getGameInfoByAppId: vi.fn() };
    const app = trackApp(createServer(gameInfoService));

    const response = await app.inject({
      method: "GET",
      url: "/info?url=https://example.com/not-steam",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_URL",
        message: "Invalid Steam URL or App ID",
      },
    });
  });

  it("returns game info for valid steam url", async () => {
    const gameInfoService = {
      getGameInfoByAppId: vi.fn().mockResolvedValue({
        name: "Dead Space 2",
        score: 91.4,
        source: "steam",
      }),
    };

    const app = trackApp(createServer(gameInfoService));

    const response = await app.inject({
      method: "GET",
      url: "/info?url=https://store.steampowered.com/app/47780/Dead_Space_2/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      name: "Dead Space 2",
      score: 91.4,
      source: "steam",
    });
    expect(gameInfoService.getGameInfoByAppId).toHaveBeenCalledWith("47780");
  });

  it("returns 502 when service throws", async () => {
    const gameInfoService = {
      getGameInfoByAppId: vi.fn().mockRejectedValue(new Error("steam error")),
    };

    const app = trackApp(createServer(gameInfoService));

    const response = await app.inject({
      method: "GET",
      url: "/info?url=47780",
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: "SCRAPING_ERROR",
        message: "Unable to fetch game info",
      },
    });
  });
});
