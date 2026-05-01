import { describe, expect, it, vi } from "vitest";
import { createServiceModuleMocks } from "../../../shared/test-utils/service-test-helpers.js";

async function loadTriiClient(
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<Record<string, number>>,
    validator: (value: Record<string, number>) => boolean,
  ) => Promise<Record<string, number>>,
) {
  vi.resetModules();

  const mocks = createServiceModuleMocks<Record<string, number>>(
    getOrFetchValidatedImpl,
  );

  vi.doMock("../../../shared/utils/cache-factory.js", () => ({
    createCache: mocks.createCache,
  }));

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout: mocks.fetchWithTimeout,
    buildFetchHeaders: mocks.buildFetchHeaders,
  }));

  const { TriiClient } = await import("./trii-client.js");

  return {
    TriiClient,
    getOrFetchValidated: mocks.getOrFetchValidated,
    fetchWithTimeout: mocks.fetchWithTimeout,
  };
}

describe("TriiClient", () => {
  it("returns null for invalid ticker input", async () => {
    const { TriiClient, getOrFetchValidated } = await loadTriiClient();
    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("  ")).resolves.toBeNull();
    expect(getOrFetchValidated).not.toHaveBeenCalled();
  });

  it("parses html and returns ticker data", async () => {
    const { TriiClient, fetchWithTimeout, getOrFetchValidated } =
      await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response('<h3>ecopetrol</h3><div class="title">$ 1,234.56</div>', {
        status: 200,
      }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toEqual({
      ticker: "ECOPETROL",
      price: 1234.56,
      source: "trii",
    });
    expect(getOrFetchValidated).toHaveBeenCalledWith(
      "trii-stock-list",
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("throws BvcFetchError when html request fails", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("error", { status: 503, statusText: "Unavailable" }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcFetchError",
    });
  });

  it("throws BvcParseError when html has no valid prices", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response("<html><body>No cards</body></html>", { status: 200 }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).rejects.toMatchObject({
      name: "BvcParseError",
    });
  });

  it("returns null when ticker is not present in parsed map", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response('<h3>pfgrupsura</h3><div class="title">$ 12,000</div>', {
        status: 200,
      }),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toBeNull();
  });

  it("refetches when cached price map has no finite prices", async () => {
    const staleMap = { ecopetrol: Number.NaN };

    const { TriiClient, fetchWithTimeout } = await loadTriiClient(
      async (_key, fetcher, validator) => {
        if (!validator(staleMap)) {
          fetchWithTimeout.mockResolvedValue(
            new Response('<h3>ecopetrol</h3><div class="title">$ 1,500</div>', {
              status: 200,
            }),
          );
          return fetcher();
        }
        return staleMap;
      },
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ecopetrol")).resolves.toEqual({
      ticker: "ECOPETROL",
      price: 1500,
      source: "trii",
    });
  });
});
