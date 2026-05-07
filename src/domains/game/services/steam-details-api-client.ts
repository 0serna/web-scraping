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

function validateAppData(
  data: SteamAppDetailsResponse[string] | undefined,
  appId: string,
): SteamAppDetailsResponse[string] {
  if (!data) {
    throw new SteamParseError(`Steam API returned no data for app ${appId}`);
  }
  return data;
}

function validateAppSuccess(
  appData: SteamAppDetailsResponse[string],
  appId: string,
): void {
  if (!appData.success || !appData.data) {
    throw new SteamParseError(
      `Steam API returned success=false for app ${appId}`,
    );
  }
}

function extractGameName(appData: SteamAppDetailsResponse[string]): string {
  const gameName = appData.data?.name;
  if (!gameName || typeof gameName !== "string") {
    throw new SteamParseError(`Steam API returned invalid name for app`);
  }
  return gameName;
}

function extractReleaseDate(
  appData: SteamAppDetailsResponse[string],
): string | undefined {
  return appData.data?.release_date?.date;
}

function parseYear(releaseDate: string): number | undefined {
  const match = releaseDate.match(/(\d{4})/);
  if (!match) {
    return undefined;
  }

  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}

function extractReleaseYear(
  appData: SteamAppDetailsResponse[string],
): number | undefined {
  const releaseDate = extractReleaseDate(appData);
  if (!releaseDate || typeof releaseDate !== "string") {
    return undefined;
  }

  return parseYear(releaseDate);
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

    const appData = validateAppData(data[appId], appId);
    validateAppSuccess(appData, appId);

    const gameName = extractGameName(appData);
    const releaseYear = extractReleaseYear(appData);

    return { name: gameName, releaseYear };
  }
}
