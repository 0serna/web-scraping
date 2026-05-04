import { describe, expect, it, vi } from "vitest";
import {
  createApiHelpersMocks,
  expectJsonFetchWithRateLimit,
  createPassthroughRateLimiterMock,
} from "../../../shared/test-utils/service-test-helpers.js";

async function loadSteamDetailsApiClient() {
  vi.resetModules();

  const { fetchWithTimeout, buildFetchHeaders } = createApiHelpersMocks();

  const rateLimiter = createPassthroughRateLimiterMock();

  const createRateLimiter = vi.fn().mockReturnValue(rateLimiter);

  vi.doMock("../../../shared/utils/api-helpers.js", () => ({
    fetchWithTimeout,
    buildFetchHeaders,
  }));

  vi.doMock("../../../shared/utils/global-rate-limiter.js", () => ({
    createRateLimiter,
  }));

  const { SteamDetailsApiClient } =
    await import("./steam-details-api-client.js");

  return {
    SteamDetailsApiClient,
    fetchWithTimeout,
    buildFetchHeaders,
    createRateLimiter,
    rateLimiter,
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function expectDetailsError(payload: unknown, name: string) {
  const { SteamDetailsApiClient, fetchWithTimeout } =
    await loadSteamDetailsApiClient();

  fetchWithTimeout.mockResolvedValue(jsonResponse(payload));

  const client = new SteamDetailsApiClient();

  await expect(client.getGameDetailsByAppId("47780")).rejects.toMatchObject({
    name,
  });
}

describe("SteamDetailsApiClient", () => {
  it("returns game name and release date from Steam details payload", async () => {
    const {
      SteamDetailsApiClient,
      fetchWithTimeout,
      buildFetchHeaders,
      createRateLimiter,
      rateLimiter,
    } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      jsonResponse({
        47780: {
          success: true,
          data: {
            name: "Dead Space 2",
            release_date: { date: "12 May, 2011" },
          },
        },
      }),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).resolves.toEqual({
      name: "Dead Space 2",
      releaseYear: 2011,
    });

    expectJsonFetchWithRateLimit(
      createRateLimiter,
      rateLimiter,
      buildFetchHeaders,
      fetchWithTimeout,
      "https://store.steampowered.com/api/appdetails?appids=47780",
    );
  });

  it("throws SteamFetchError when response is not ok", async () => {
    const loaded = await loadSteamDetailsApiClient();

    loaded.fetchWithTimeout.mockResolvedValue(
      new Response("error", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    const client = new loaded.SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).rejects.toMatchObject({
      name: "SteamFetchError",
    });
  });

  it.each([
    ["app data is missing", {}],
    ["steam marks app as unsuccessful", { 47780: { success: false } }],
    [
      "game name is invalid",
      { 47780: { success: true, data: { name: null } } },
    ],
  ])("throws SteamParseError when %s", async (_case, payload) => {
    await expectDetailsError(payload, "SteamParseError");
  });

  it.each([
    [
      "release date is 'Coming Soon'",
      { release_date: { date: "Coming Soon" } },
    ],
    ["release_date is missing", {}],
  ])("returns undefined releaseYear when %s", async (_case, extraData) => {
    const { SteamDetailsApiClient, fetchWithTimeout } =
      await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      jsonResponse({
        47780: { success: true, data: { name: "Some Game", ...extraData } },
      }),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).resolves.toEqual({
      name: "Some Game",
      releaseYear: undefined,
    });
  });

  it("extracts year from various date formats", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } =
      await loadSteamDetailsApiClient();

    const testCases = [
      { input: "Q1 2024", expected: 2024 },
      { input: "2024", expected: 2024 },
      { input: "Jan 1, 2023", expected: 2023 },
      { input: "TBA 2025", expected: 2025 },
    ];

    for (const { input, expected } of testCases) {
      fetchWithTimeout.mockResolvedValue(
        jsonResponse({
          47780: {
            success: true,
            data: { name: "Some Game", release_date: { date: input } },
          },
        }),
      );

      const client = new SteamDetailsApiClient();
      const result = await client.getGameDetailsByAppId("47780");

      expect(result.releaseYear).toBe(expected);
    }
  });
});
