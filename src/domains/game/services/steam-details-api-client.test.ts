import { describe, expect, it, vi } from "vitest";
import {
  createApiHelpersMocks,
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

  const { SteamDetailsApiClient } = await import("./steam-details-api-client.js");

  return {
    SteamDetailsApiClient,
    fetchWithTimeout,
    buildFetchHeaders,
    createRateLimiter,
    rateLimiter,
  };
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
      new Response(
        JSON.stringify({
          47780: {
            success: true,
            data: {
              name: "Dead Space 2",
              release_date: {
                date: "12 May, 2011",
              },
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).resolves.toEqual({
      name: "Dead Space 2",
      releaseYear: 2011,
    });

    expect(createRateLimiter).toHaveBeenCalledWith(10);
    expect(rateLimiter).toHaveBeenCalledTimes(1);
    expect(buildFetchHeaders).toHaveBeenCalledWith({
      Accept: "application/json",
    });
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "https://store.steampowered.com/api/appdetails?appids=47780",
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  });

  it("throws SteamFetchError when response is not ok", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response("error", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).rejects.toMatchObject({
      name: "SteamFetchError",
    });
  });

  it("throws SteamParseError when app data is missing", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).rejects.toMatchObject({
      name: "SteamParseError",
    });
  });

  it("throws SteamParseError when steam marks app as unsuccessful", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          47780: {
            success: false,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).rejects.toMatchObject({
      name: "SteamParseError",
    });
  });

  it("throws SteamParseError when game name is invalid", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          47780: {
            success: true,
            data: {
              name: null,
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).rejects.toMatchObject({
      name: "SteamParseError",
    });
  });

  it("returns undefined releaseYear when release date is 'Coming Soon'", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          47780: {
            success: true,
            data: {
              name: "Some Game",
              release_date: {
                date: "Coming Soon",
              },
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).resolves.toEqual({
      name: "Some Game",
      releaseYear: undefined,
    });
  });

  it("returns undefined releaseYear when release_date is missing", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    fetchWithTimeout.mockResolvedValue(
      new Response(
        JSON.stringify({
          47780: {
            success: true,
            data: {
              name: "Some Game",
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = new SteamDetailsApiClient();

    await expect(client.getGameDetailsByAppId("47780")).resolves.toEqual({
      name: "Some Game",
      releaseYear: undefined,
    });
  });

  it("extracts year from various date formats", async () => {
    const { SteamDetailsApiClient, fetchWithTimeout } = await loadSteamDetailsApiClient();

    const testCases = [
      { input: "Q1 2024", expected: 2024 },
      { input: "2024", expected: 2024 },
      { input: "Jan 1, 2023", expected: 2023 },
      { input: "TBA 2025", expected: 2025 },
    ];

    for (const { input, expected } of testCases) {
      fetchWithTimeout.mockResolvedValue(
        new Response(
          JSON.stringify({
            47780: {
              success: true,
              data: {
                name: "Some Game",
                release_date: {
                  date: input,
                },
              },
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );

      const client = new SteamDetailsApiClient();
      const result = await client.getGameDetailsByAppId("47780");

      expect(result.releaseYear).toBe(expected);
    }
  });
});
