# Design

## Context

The `/info` route currently resolves a Steam application ID and delegates to `GameInfoService`, which returns data assembled by `SteamUnifiedApiClient`. Steam data is cached as one object for 15 days. Shared utilities already provide timed HTTP fetches, request headers, rate limiting, and an Upstash-backed cache with a no-cache fallback.

ProtonDB exposes a community summary at `/api/v1/reports/summaries/<appId>.json`. A successful response includes `tier`, `score`, `confidence`, and `total`; a missing game returns HTTP 404. This endpoint is external and is not a documented stability guarantee from Steam.

## Goals / Non-Goals

**Goals:**

- Keep ProtonDB concerns separate from the Steam clients.
- Return mapped ProtonDB data when valid and omit it otherwise.
- Avoid increasing the failure surface of the existing `/info` response.
- Cache ProtonDB results independently with a 24-hour TTL.

**Non-Goals:**

- Expose individual ProtonDB reports.
- Expose `bestReportedTier` or `trendingTier` before a consumer needs them.
- Infer Steam Deck verification or native Linux support from ProtonDB data.
- Guarantee availability or completeness of community-submitted data.

## Decisions

### Add a separate ProtonDB client

Create a focused client under the game domain that accepts a Steam application ID, requests the ProtonDB summary, validates the four exposed values, maps `total` to `reports`, and returns no summary for missing or invalid data. It will reuse the existing HTTP, rate-limit, logging, and cache utilities rather than add a dependency.

Keeping this separate from `SteamUnifiedApiClient` preserves source ownership and prevents ProtonDB-specific errors or response changes from leaking into Steam parsing. The alternative of extending the Steam client was rejected because ProtonDB is a different upstream with different availability and caching semantics.

### Compose optional data in GameInfoService

`GameInfoService` will request the required Steam data and optional ProtonDB data concurrently. ProtonDB's path will convert expected absence and operational failures into an unavailable result after logging; the Steam path retains its current failure behavior. The service will add `protonDb` only when a valid summary exists.

This keeps the route unchanged and preserves its current error contract. Putting fallback behavior in the route was rejected because upstream composition belongs in the service.

### Use a narrow response contract

The public summary contains:

```ts
interface ProtonDbSummary {
  tier: "borked" | "bronze" | "silver" | "gold" | "platinum";
  score: number;
  confidence: string;
  reports: number;
}
```

The upstream `tier` must match the supported values, `score` must be finite, `confidence` must be a non-empty string, and `total` must be a non-negative integer. Unknown or malformed values make the optional summary unavailable rather than failing `/info`.

### Cache only valid summaries for 24 hours

Use the existing cache abstraction with `protondb:<appId>` keys and a 24-hour TTL. Do not cache absence or failures initially; this avoids introducing negative-cache representation and expiry rules. A short outage may therefore cause repeated requests, but rate limiting bounds request concurrency.

The existing 15-day Steam cache was rejected for ProtonDB because community reports and tiers can change more frequently.

## Risks / Trade-offs

- [ProtonDB endpoint or schema changes] -> Validate the narrow response and omit incompatible data without affecting Steam results.
- [Repeated requests for missing games or during outages] -> Apply the existing rate limiter; add negative caching only if observed traffic makes it necessary.
- [Added latency on a cache miss] -> Fetch Steam and ProtonDB concurrently and bound ProtonDB with the existing HTTP timeout.
- [Community rating may be mistaken for official compatibility] -> Name the response field `protonDb` and retain ProtonDB terminology.

## Migration Plan

Deploy as a backward-compatible optional response addition. Rollback removes the ProtonDB client and optional composition without requiring stored-data migration; independent cache entries can expire naturally.
