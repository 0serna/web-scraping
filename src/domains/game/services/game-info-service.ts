import type { FastifyBaseLogger } from "fastify";
import type { GameInfo } from "../types/game.js";
import { ProtonDbApiClient } from "./protondb-api-client.js";
import { createSteamUnifiedApiClient } from "./steam-unified-api-client.js";

export class GameInfoService {
  private protonDbApiClient;
  private steamUnifiedApiClient;

  constructor(logger: FastifyBaseLogger) {
    this.protonDbApiClient = new ProtonDbApiClient(logger);
    this.steamUnifiedApiClient = createSteamUnifiedApiClient(logger);
  }

  async getGameInfoByAppId(appId: string): Promise<GameInfo> {
    const gameData = await this.steamUnifiedApiClient.getGameData(appId);
    const protonDb = await this.protonDbApiClient.getSummaryByAppId(
      gameData.fullGameAppId ?? appId,
    );

    return {
      score: gameData.score,
      name: gameData.name,
      source: "steam",
      releaseYear: gameData.releaseYear,
      ...(protonDb ? { protonDb } : {}),
    };
  }
}

export function createGameInfoService(logger: FastifyBaseLogger) {
  return new GameInfoService(logger);
}
