import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createFastifyAppTracker } from "../../../shared/test-utils/fastify-test-helpers.js";
import { tickerRoutes } from "./ticker.js";

interface TickerServiceMock {
  getPriceByTicker: (ticker: string) => Promise<{
    ticker: string;
    price: number;
    source: "trii" | "tradingview";
  } | null>;
}

type Overrides = Partial<{
  triiClient: TickerServiceMock;
  tradingViewClient: TickerServiceMock;
}>;

function createServer(
  triiClient: TickerServiceMock,
  tradingViewClient: TickerServiceMock,
) {
  const app = Fastify({ logger: false });
  app.register(tickerRoutes, {
    triiClient: triiClient as never,
    tradingViewClient: tradingViewClient as never,
  });
  return app;
}

function buildClientMocks(overrides: Overrides = {}) {
  return {
    triiClient: overrides.triiClient ?? {
      getPriceByTicker: vi.fn().mockResolvedValue(null),
    },
    tradingViewClient: overrides.tradingViewClient ?? {
      getPriceByTicker: vi.fn().mockResolvedValue(null),
    },
  };
}

describe("tickerRoutes", () => {
  const trackApp = createFastifyAppTracker<ReturnType<typeof createServer>>();

  async function injectGet(url: string, overrides: Overrides = {}) {
    const { triiClient, tradingViewClient } = buildClientMocks(overrides);
    const app = trackApp(createServer(triiClient, tradingViewClient));
    const response = await app.inject({ method: "GET", url });
    return { response, triiClient, tradingViewClient };
  }

  it("returns 400 for invalid ticker", async () => {
    const { response } = await injectGet("/ticker/%20%20");

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_TICKER",
        message: "Ticker is required",
      },
    });
  });

  it("returns trii value when available", async () => {
    const triiValue = {
      ticker: "ECOPETROL",
      price: 1234,
      source: "trii" as const,
    };
    const { response, tradingViewClient } = await injectGet(
      "/ticker/ecopetrol",
      {
        triiClient: {
          getPriceByTicker: vi.fn().mockResolvedValue(triiValue),
        },
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(triiValue);
    expect(tradingViewClient.getPriceByTicker).not.toHaveBeenCalled();
  });

  it("falls back to tradingview when trii returns null", async () => {
    const tradingViewValue = {
      ticker: "ECOPETROL",
      price: 1220,
      source: "tradingview" as const,
    };
    const { response } = await injectGet("/ticker/ecopetrol", {
      tradingViewClient: {
        getPriceByTicker: vi.fn().mockResolvedValue(tradingViewValue),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(tradingViewValue);
  });

  it("returns 404 when both providers return null", async () => {
    const { response } = await injectGet("/ticker/ecopetrol");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "TICKER_NOT_FOUND",
        message: 'Ticker "ecopetrol" not found',
      },
    });
  });

  it("returns 502 when trii and fallback both fail", async () => {
    const { response } = await injectGet("/ticker/ecopetrol", {
      triiClient: {
        getPriceByTicker: vi.fn().mockRejectedValue(new Error("trii fail")),
      },
      tradingViewClient: {
        getPriceByTicker: vi
          .fn()
          .mockRejectedValue(new Error("tradingview fail")),
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: "FETCH_ERROR",
        message: "Error fetching ticker price",
      },
    });
  });

  it("calls TradingView once when Trii misses and TradingView throws", async () => {
    const { response, tradingViewClient } = await injectGet(
      "/ticker/ecopetrol",
      {
        tradingViewClient: {
          getPriceByTicker: vi
            .fn()
            .mockRejectedValue(new Error("tradingview fail")),
        },
      },
    );

    expect(response.statusCode).toBe(502);
    expect(tradingViewClient.getPriceByTicker).toHaveBeenCalledTimes(1);
  });

  it("returns tradingview value when trii throws and fallback succeeds", async () => {
    const tradingViewValue = {
      ticker: "ECOPETROL",
      price: 1210,
      source: "tradingview" as const,
    };
    const { response, tradingViewClient } = await injectGet(
      "/ticker/ecopetrol",
      {
        triiClient: {
          getPriceByTicker: vi.fn().mockRejectedValue(new Error("trii fail")),
        },
        tradingViewClient: {
          getPriceByTicker: vi.fn().mockResolvedValue(tradingViewValue),
        },
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(tradingViewValue);
    expect(tradingViewClient.getPriceByTicker).toHaveBeenCalledTimes(1);
  });
});
