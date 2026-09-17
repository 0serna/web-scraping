import { describe, expect, it, vi } from "vitest";
import {
  createApiHelpersMocks,
  createMockLogger,
  createPassthroughRateLimiterMock,
  expectJsonFetchWithRateLimit,
} from "../../../shared/test-utils/service-test-helpers.js";

interface LoadOptions {
  cached?: unknown;
}

async function loadProtonDbApiClient(options: LoadOptions = {}) {
  vi.resetModules();

  const { fetchWithTimeout, buildFetchHeaders } = createApiHelpersMocks();
  const rateLimiter = createPassthroughRateLimiterMock();
  const createRateLimiter = vi.fn().mockReturnValue(rateLimiter);
  const get = vi.fn().mockResolvedValue(options.cached ?? null);
  const set = vi.fn().mockResolvedValue(undefined);
  const createCache = vi.fn().mockReturnValue({ get, set });

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout,
    buildFetchHeaders,
  }));
  vi.doMock("../../../shared/utils/cache-factory.js", () => ({ createCache }));
  vi.doMock("../../../shared/utils/global-rate-limiter.js", () => ({
    createRateLimiter,
  }));

  const { ProtonDbApiClient } = await import("./protondb-api-client.js");

  return {
    ProtonDbApiClient,
    fetchWithTimeout,
    buildFetchHeaders,
    rateLimiter,
    createRateLimiter,
    createCache,
    get,
    set,
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const summary = {
  tier: "platinum",
  score: 0.8,
  confidence: "strong",
  reports: 85,
} as const;

describe("ProtonDbApiClient", () => {
  it("maps and caches a valid ProtonDB summary", async () => {
    const loaded = await loadProtonDbApiClient();
    loaded.fetchWithTimeout.mockResolvedValue(
      jsonResponse({
        tier: "platinum",
        score: 0.8,
        confidence: "strong",
        total: 85,
      }),
    );

    const client = new loaded.ProtonDbApiClient(createMockLogger() as never);

    await expect(client.getSummaryByAppId("47780")).resolves.toEqual(summary);
    expect(loaded.createCache).toHaveBeenCalledWith(
      86_400_000,
      expect.anything(),
    );
    expect(loaded.get).toHaveBeenCalledWith("protondb:47780");
    expect(loaded.set).toHaveBeenCalledWith("protondb:47780", summary);
    expectJsonFetchWithRateLimit(
      loaded.createRateLimiter,
      loaded.rateLimiter,
      loaded.buildFetchHeaders,
      loaded.fetchWithTimeout,
      "https://www.protondb.com/api/v1/reports/summaries/47780.json",
    );
  });

  it("returns a valid cached summary without fetching", async () => {
    const loaded = await loadProtonDbApiClient({ cached: summary });
    const client = new loaded.ProtonDbApiClient(createMockLogger() as never);

    await expect(client.getSummaryByAppId("47780")).resolves.toEqual(summary);
    expect(loaded.fetchWithTimeout).not.toHaveBeenCalled();
    expect(loaded.set).not.toHaveBeenCalled();
  });

  it.each([
    ["missing report", new Response("", { status: 404 })],
    ["unsuccessful response", new Response("", { status: 502 })],
    ["malformed summary", jsonResponse({ tier: "unknown", total: -1 })],
  ])("returns null for %s", async (_case, response) => {
    const loaded = await loadProtonDbApiClient();
    loaded.fetchWithTimeout.mockResolvedValue(response);
    const client = new loaded.ProtonDbApiClient(createMockLogger() as never);

    await expect(client.getSummaryByAppId("47780")).resolves.toBeNull();
    expect(loaded.set).not.toHaveBeenCalled();
  });

  it("returns null and logs when the request fails", async () => {
    const loaded = await loadProtonDbApiClient();
    loaded.fetchWithTimeout.mockRejectedValue(new Error("timeout"));
    const logger = createMockLogger();
    const client = new loaded.ProtonDbApiClient(logger as never);

    await expect(client.getSummaryByAppId("47780")).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error), appId: "47780" },
      "Unable to fetch ProtonDB summary",
    );
  });
});
