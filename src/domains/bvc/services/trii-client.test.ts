import { describe, expect, it, vi } from "vitest";
import { mockServiceModuleDependencies } from "../../../shared/test-utils/service-test-helpers.js";

async function loadTriiClient(
  getOrFetchValidatedImpl?: (
    key: string,
    fetcher: () => Promise<Record<string, number>>,
    validator: (value: Record<string, number>) => boolean,
  ) => Promise<Record<string, number>>,
) {
  vi.resetModules();

  const mocks = mockServiceModuleDependencies<Record<string, number>>(
    getOrFetchValidatedImpl,
  );

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
      new Response(
        '<h3>ECOPETROL</h3><span class="price-symbol">$</span><span class="price-value">1,234.56</span>',
        { status: 200 },
      ),
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

  it("parses MGC ticker from current Trii card markup", async () => {
    const { TriiClient, fetchWithTimeout } = await loadTriiClient();
    fetchWithTimeout.mockResolvedValue(
      new Response(
        `<li class="stock-item">
          <div class="card_stock">
            <h2>iShares MSCI ACWI</h2>
            <h3>ISACCO</h3>
            <div class="stock-price">
              <span class="price-symbol">$</span>
              <span class="price-value">380720.0</span>
            </div>
          </div>
        </li>`,
        { status: 200 },
      ),
    );

    const client = new TriiClient({ child: vi.fn() } as never);

    await expect(client.getPriceByTicker("ISACCO")).resolves.toEqual({
      ticker: "ISACCO",
      price: 380720,
      source: "trii",
    });
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
      new Response(
        '<h3>PFGRUPSURA</h3><span class="price-value">12,000</span>',
        {
          status: 200,
        },
      ),
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
            new Response(
              '<h3>ECOPETROL</h3><span class="price-value">1,500</span>',
              {
                status: 200,
              },
            ),
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
