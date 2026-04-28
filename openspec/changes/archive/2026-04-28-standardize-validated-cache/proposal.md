## Why

Cached data can outlive parser and domain-contract changes, causing production failures even when the upstream source is currently healthy. The recent AI ranking failure showed that stale cached payloads need a standard validation and self-healing path instead of one-off cache key bumps.

## What Changes

- Add a shared validated cache retrieval capability that checks cached values against a caller-provided validator before returning them.
- Invalidate only the affected cache key when a cached value fails validation, then refetch once and validate the fresh value before storing it.
- Apply the validated cache pattern to all current cache consumers: AI model data, Trii stock lists, TradingView ticker prices, and Steam game data.
- Preserve existing fetch and parse errors when fresh data cannot satisfy the domain contract.
- Add logging for stale cache invalidation so production self-healing events are observable.

## Capabilities

### New Capabilities

- `validated-cache`: Shared cache behavior for validating cached values, invalidating stale entries, and safely refetching data.

### Modified Capabilities

- `ai-model-ranking`: AI ranking must recover once from cached model data that no longer satisfies the ranking contract.

## Impact

- Affected shared code: `src/shared/types/cache.ts`, `src/shared/utils/upstash-cache.ts`, `src/shared/utils/cache-factory.ts`, and related tests.
- Affected domains: AI, BVC, and Game services that currently call `getOrFetch`.
- External systems: Upstash Redis cache entries may be deleted per-key when validation fails.
- Public API behavior: endpoints should continue returning the same response shapes; stale cache cases may recover automatically instead of returning scraping errors.
