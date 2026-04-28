import type { FastifyBaseLogger } from "fastify";
import type { Cache } from "../../../shared/types/cache.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import { SteamDetailsApiClient } from "./steam-details-api-client.js";
import { SteamReviewsApiClient } from "./steam-reviews-api-client.js";

const STEAM_GAME_DATA_CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

interface GameData {
  name: string;
  score: number;
  releaseYear?: number;
}

function hasValidGameData(data: GameData): boolean {
  return data.name.trim().length > 0 && Number.isFinite(data.score);
}

class SteamUnifiedApiClient {
  private readonly steamGameDataCache: Cache<GameData>;
  private readonly steamDetailsApiClient: SteamDetailsApiClient;
  private readonly steamReviewsApiClient: SteamReviewsApiClient;

  constructor(logger: FastifyBaseLogger) {
    this.steamGameDataCache = createCache<GameData>(
      STEAM_GAME_DATA_CACHE_TTL_MS,
      logger,
    );
    this.steamDetailsApiClient = new SteamDetailsApiClient();
    this.steamReviewsApiClient = new SteamReviewsApiClient(logger);
  }

  async getGameData(appId: string): Promise<GameData> {
    const cacheKey = `steam:${appId}`;

    return this.steamGameDataCache.getOrFetchValidated(
      cacheKey,
      async () => {
        const [gameDetails, score] = await Promise.all([
          this.steamDetailsApiClient.getGameDetailsByAppId(appId),
          this.steamReviewsApiClient.getScoreByAppId(appId),
        ]);

        if (score === null) {
          throw new Error(`Steam score is unavailable for app ${appId}`);
        }

        if (!Number.isFinite(score.score)) {
          throw new Error(`Steam score is invalid for app ${appId}`);
        }

        return {
          name: gameDetails.name,
          score: score.score,
          releaseYear: gameDetails.releaseYear,
        };
      },
      hasValidGameData,
    );
  }
}

export function createSteamUnifiedApiClient(logger: FastifyBaseLogger) {
  return new SteamUnifiedApiClient(logger);
}
