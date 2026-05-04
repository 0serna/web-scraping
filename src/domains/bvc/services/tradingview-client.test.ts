import { describe, expect, it, vi } from "vitest";
import { mockServiceModuleDependencies } from "../../../shared/test-utils/service-test-helpers.js";

async function loadTradingViewClient(
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<number>,
    validator: (value: number) => boolean,
  ) => Promise<number>,
) {
  vi.resetModules();

  const mocks = mockServiceModuleDependencies<number>(getOrFetchValidatedImpl);

  const { TradingViewClient } = await import("./tradingview-client.js");

  return {
    TradingViewClient,
    getOrFetchValidated: mocks.getOrFetchValidated,
    fetchWithTimeout: mocks.fetchWithTimeout,
  };
}

function tradingViewJsonResponse(close: unknown): Response {
  return new Response(JSON.stringify({ close }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
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
    fetchWithTimeout.mockResolvedValue(tradingViewJsonResponse(1234.5));

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
    fetchWithTimeout.mockResolvedValue(tradingViewJsonResponse("n/a"));

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcParseError",
    });
  });

  it("returns null on unexpected cache errors", async () => {
    const { TradingViewClient } = await loadTradingViewClient(async () => {
      throw new Error("cache error");
    });

    const client = new TradingViewClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toBeNull();
  });

  it("refetches when cached price is not finite", async () => {
    const { TradingViewClient, fetchWithTimeout } = await loadTradingViewClient(
      async (_key, fetcher, validator) => {
        const staleValue = Number.NaN;
        if (!validator(staleValue)) {
          fetchWithTimeout.mockResolvedValue(tradingViewJsonResponse(5000));
          return fetcher();
        }
        return staleValue;
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
