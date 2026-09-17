import { describe, expect, it, vi } from "vitest";

async function loadGameInfoService() {
  vi.resetModules();

  const getGameData = vi.fn();
  const getSummaryByAppId = vi.fn().mockResolvedValue(null);
  const createSteamUnifiedApiClient = vi.fn().mockReturnValue({
    getGameData,
  });

  class ProtonDbApiClientMock {
    getSummaryByAppId = getSummaryByAppId;
  }

  vi.doMock("./steam-unified-api-client.js", () => ({
    createSteamUnifiedApiClient,
  }));
  vi.doMock("./protondb-api-client.js", () => ({
    ProtonDbApiClient: ProtonDbApiClientMock,
  }));

  const module = await import("./game-info-service.js");

  return {
    ...module,
    getGameData,
    getSummaryByAppId,
    createSteamUnifiedApiClient,
  };
}

describe("GameInfoService", () => {
  it("maps unified client response into game info payload", async () => {
    const { GameInfoService, getGameData } = await loadGameInfoService();
    getGameData.mockResolvedValue({
      name: "Dead Space 2",
      score: 91.4,
      releaseYear: 2011,
    });

    const logger = { child: vi.fn() };
    const service = new GameInfoService(logger as never);

    await expect(service.getGameInfoByAppId("47780")).resolves.toEqual({
      name: "Dead Space 2",
      score: 91.4,
      source: "steam",
      releaseYear: 2011,
    });
    expect(getGameData).toHaveBeenCalledWith("47780");
  });

  it("includes an available ProtonDB summary", async () => {
    const { GameInfoService, getGameData, getSummaryByAppId } =
      await loadGameInfoService();
    getGameData.mockResolvedValue({ name: "Dead Space 2", score: 91.4 });
    getSummaryByAppId.mockResolvedValue({
      tier: "platinum",
      score: 0.8,
      confidence: "strong",
      reports: 85,
    });

    const service = new GameInfoService({ warn: vi.fn() } as never);

    await expect(service.getGameInfoByAppId("47780")).resolves.toMatchObject({
      protonDb: {
        tier: "platinum",
        score: 0.8,
        confidence: "strong",
        reports: 85,
      },
    });
    expect(getSummaryByAppId).toHaveBeenCalledWith("47780");
  });

  it("uses the Steam base-game app id for ProtonDB and preserves product fields", async () => {
    const { GameInfoService, getGameData, getSummaryByAppId } =
      await loadGameInfoService();
    getGameData.mockResolvedValue({
      name: "The Witcher 3: Wild Hunt - Blood and Wine",
      score: 74.2,
      releaseYear: 2016,
      fullGameAppId: "292030",
    });
    getSummaryByAppId.mockResolvedValue({
      tier: "platinum",
      score: 0.87,
      confidence: "strong",
      reports: 1746,
    });

    const service = new GameInfoService({ warn: vi.fn() } as never);

    await expect(service.getGameInfoByAppId("378648")).resolves.toEqual({
      name: "The Witcher 3: Wild Hunt - Blood and Wine",
      score: 74.2,
      source: "steam",
      releaseYear: 2016,
      protonDb: {
        tier: "platinum",
        score: 0.87,
        confidence: "strong",
        reports: 1746,
      },
    });
    expect(getSummaryByAppId).toHaveBeenCalledWith("292030");
  });

  it("preserves Steam failures", async () => {
    const { GameInfoService, getGameData } = await loadGameInfoService();
    getGameData.mockRejectedValue(new Error("steam unavailable"));
    const service = new GameInfoService({ warn: vi.fn() } as never);

    await expect(service.getGameInfoByAppId("47780")).rejects.toThrow(
      "steam unavailable",
    );
  });

  it("factory creates service instance", async () => {
    const { createGameInfoService, GameInfoService } =
      await loadGameInfoService();
    const logger = { child: vi.fn() };

    const service = createGameInfoService(logger as never);

    expect(service).toBeInstanceOf(GameInfoService);
  });
});
