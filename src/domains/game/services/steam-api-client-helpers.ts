import {
  buildFetchHeaders,
  fetchWithTimeout,
} from "../../../shared/utils/api-helpers.js";
import type { RateLimiter } from "../../../shared/utils/global-rate-limiter.js";
import { SteamFetchError } from "../types/errors.js";

export async function fetchSteamJson<T>(
  rateLimiter: RateLimiter,
  url: string,
  errorMessage: string,
): Promise<T> {
  const response = await rateLimiter(() =>
    fetchWithTimeout(url, {
      headers: buildFetchHeaders({
        Accept: "application/json",
      }),
    }),
  );

  if (!response.ok) {
    throw new SteamFetchError(
      errorMessage,
      response.status,
      response.statusText,
    );
  }

  return (await response.json()) as T;
}
