import { describe, expect, it, vi } from "vitest";
import {
  createApiHelpersMocks,
  createPassthroughCacheGetOrFetchValidatedMock,
} from "../../../shared/test-utils/service-test-helpers.js";

interface LoadOptions {
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<number>,
    validator: (value: number) => boolean,
  ) => Promise<number>;
}

async function loadTradingViewClient(options: LoadOptions = {}) {
  vi.resetModules();

  const getOrFetchValidated = options.getOrFetchValidatedImpl
    ? vi.fn(options.getOrFetchValidatedImpl)
    : createPassthroughCacheGetOrFetchValidatedMock<number>();

  const createCache = vi.fn().mockReturnValue({
    getOrFetchValidated,
  });

  const { fetchWithTimeout, buildFetchHeaders } = createApiHelpersMocks();

  vi.doMock("../../../shared/utils/cache-factory.js", () => ({
    createCache,
  }));

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout,
    buildFetchHeaders,
  }));

  const { TradingViewClient } = await import("./tradingview-client.js");

  return {
    TradingViewClient,
    getOrFetchValidated,
    createCache,
    fetchWithTimeout,
    buildFetchHeaders,
  };
}

describe("TradingViewClient", () => {
  it("returns null for invalid ticker input", async () => {
    const { TradingViewClient, getOrFetchValidated } =
      await loadTradingViewClient();
    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("   ")).resolves.toBeNull();
    expect(getOrFetchValidated).not.toHaveBeenCalled();
  });

  it("returns normalized ticker and price when fetch succeeds", async () => {
    const { TradingViewClient, fetchWithTimeout, getOrFetchValidated } =
      await loadTradingViewClient();
    fetchWithTimeout.mockResolvedValue(
      new Response(JSON.stringify({ close: 1234.5 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toEqual({
      ticker: "ECOPETROL",
      price: 1234.5,
      source: "tradingview",
    });

    expect(getOrFetchValidated).toHaveBeenCalledWith(
      "stock:ecopetrol",
      expect.any(Function),
      expect.any(Function),
    );
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it("throws BvcFetchError when api response is not ok", async () => {
    const { TradingViewClient, fetchWithTimeout } =
      await loadTradingViewClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("error", { status: 502, statusText: "Bad Gateway" }),
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcFetchError",
    });
  });

  it("throws BvcParseError when close is invalid", async () => {
    const { TradingViewClient, fetchWithTimeout } =
      await loadTradingViewClient();
    fetchWithTimeout.mockResolvedValue(
      new Response(JSON.stringify({ close: "n/a" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcParseError",
    });
  });

  it("returns null on unexpected cache errors", async () => {
    const { TradingViewClient } = await loadTradingViewClient({
      getOrFetchValidatedImpl: async () => {
        throw new Error("cache error");
      },
    });

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toBeNull();
  });

  it("refetches when cached price is not finite", async () => {
    const { TradingViewClient, fetchWithTimeout } = await loadTradingViewClient(
      {
        getOrFetchValidatedImpl: async (_key, fetcher, validator) => {
          const staleValue = Number.NaN;
          if (!validator(staleValue)) {
            fetchWithTimeout.mockResolvedValue(
              new Response(JSON.stringify({ close: 5000 }), {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
            );
            return fetcher();
          }
          return staleValue;
        },
      },
    );

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toEqual({
      ticker: "ECOPETROL",
      price: 5000,
      source: "tradingview",
    });
  });
});
