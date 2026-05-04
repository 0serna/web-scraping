import {
  type RateLimiter,
  createRateLimiter,
} from "../../../shared/utils/global-rate-limiter.js";
import { SteamParseError } from "../types/errors.js";
import { fetchSteamJson } from "./steam-api-client-helpers.js";

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name?: string;
      release_date?: {
        date?: string;
      };
    };
  };
}

export class SteamDetailsApiClient {
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = createRateLimiter(10);
  }

  async getGameDetailsByAppId(
    appId: string,
  ): Promise<{ name: string; releaseYear?: number }> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

    const data = await fetchSteamJson<SteamAppDetailsResponse>(
      this.rateLimiter,
      url,
      `Failed to fetch Steam app details for app ${appId}`,
    );

    const appData = data[appId];
    if (!appData) {
      throw new SteamParseError(`Steam API returned no data for app ${appId}`);
    }

    if (!appData.success || !appData.data) {
      throw new SteamParseError(
        `Steam API returned success=false for app ${appId}`,
      );
    }

    const gameName = appData.data.name;
    if (!gameName || typeof gameName !== "string") {
      throw new SteamParseError(
        `Steam API returned invalid name for app ${appId}`,
      );
    }

    const releaseDate = appData.data.release_date?.date;
    const releaseYear = this.parseReleaseYear(releaseDate);

    return { name: gameName, releaseYear };
  }

  private parseReleaseYear(
    releaseDate: string | undefined,
  ): number | undefined {
    if (!releaseDate || typeof releaseDate !== "string") {
      return undefined;
    }

    const match = releaseDate.match(/(\d{4})/);
    if (!match) {
      return undefined;
    }

    const year = parseInt(match[1], 10);
    return Number.isFinite(year) ? year : undefined;
  }
}
