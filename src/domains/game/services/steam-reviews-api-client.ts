import type { FastifyBaseLogger } from "fastify";
import {
  type RateLimiter,
  createRateLimiter,
} from "../../../shared/utils/global-rate-limiter.js";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { handleSteamError } from "../utils/steam-error-handler.js";
import { fetchSteamJson } from "./steam-api-client-helpers.js";

interface SteamReviewsResponse {
  success: number;
  query_summary: {
    total_positive: number;
    total_reviews: number;
  };
}

interface SteamScore {
  score: number;
}

function buildReviewsUrl(appId: string): string {
  return `https://store.steampowered.com/appreviews/${appId}?json=1&filter=all&language=all&purchase_type=all&num_per_page=0`;
}

function validateApiSuccess(data: SteamReviewsResponse, appId: string): void {
  if (data.success !== 1) {
    throw new SteamParseError(
      `Steam API returned success=${data.success} for app ${appId}`,
    );
  }
}

function isSteamError(error: unknown): boolean {
  return error instanceof SteamFetchError || error instanceof SteamParseError;
}

function calculateScore(data: SteamReviewsResponse): SteamScore | null {
  const { total_positive, total_reviews } = data.query_summary;

  if (!Number.isFinite(total_positive) || !Number.isFinite(total_reviews)) {
    return null;
  }

  if (total_reviews === 0) {
    return null;
  }

  const score = (total_positive / total_reviews) * 100;

  return {
    score: parseFloat(score.toFixed(2)),
  };
}

export class SteamReviewsApiClient {
  private logger: FastifyBaseLogger;
  private rateLimiter: RateLimiter;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
    this.rateLimiter = createRateLimiter(10);
  }

  async getScoreByAppId(appId: string): Promise<SteamScore | null> {
    try {
      const url = buildReviewsUrl(appId);

      const data = await fetchSteamJson<SteamReviewsResponse>(
        this.rateLimiter,
        url,
        `Failed to fetch Steam reviews API for app ${appId}`,
      );

      validateApiSuccess(data, appId);

      const score = calculateScore(data);

      if (!score) {
        throw new SteamParseError(
          `Failed to calculate score from Steam API data for app ${appId}`,
        );
      }

      return score;
    } catch (error) {
      if (isSteamError(error)) {
        throw error;
      }
      return handleSteamError(
        this.logger,
        error,
        appId,
        "Steam Reviews API client",
        null,
      );
    }
  }
}
