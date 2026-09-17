# Proposal

## Why

The game information endpoint does not expose how well a Steam game runs through Proton. ProtonDB can add community compatibility data without making that external source a requirement for returning the existing Steam information.

## What Changes

- Fetch a ProtonDB report summary using the Steam application ID.
- Add an optional `protonDb` object to game information responses with the current tier, score, confidence, and report count.
- Treat missing ProtonDB reports and ProtonDB failures as unavailable optional data, while preserving the existing successful Steam response.
- Cache ProtonDB summaries separately from Steam data.

## Capabilities

### New Capabilities

- `protondb-compatibility`: Expose optional community Proton compatibility summaries for Steam games without reducing availability of the existing endpoint.

### Modified Capabilities

None.

## Impact

- Extends the `/info` response with a backward-compatible optional field.
- Adds a ProtonDB HTTP client and integrates it into the game information service.
- Adds a separate ProtonDB cache entry and external request to `protondb.com` when data is not cached.
- Requires tests for payload mapping, missing reports, upstream failures, caching, and response composition.
