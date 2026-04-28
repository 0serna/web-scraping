## 1. Shared Cache API

- [x] 1.1 Extend the `Cache<T>` interface with single-key invalidation and validated retrieval methods
- [x] 1.2 Update the no-op cache implementation to support the new interface without persisting values
- [x] 1.3 Update shared cache factory tests for the expanded interface

## 2. Upstash Cache Behavior

- [x] 2.1 Implement single-key delete in the Upstash cache using the existing key prefix behavior
- [x] 2.2 Implement validated cache retrieval for valid cache hits, invalid cache hits, cache misses, and fresh validation failures
- [x] 2.3 Preserve pending-request deduplication for validated fetches of the same key
- [x] 2.4 Log stale cache invalidation and cache delete failures with the affected key
- [x] 2.5 Add Upstash cache tests for validated hits, invalidation plus refetch, invalid fresh values not being stored, per-key delete, and concurrent deduplication

## 3. Domain Validators And Migration

- [x] 3.1 Migrate Artificial Analysis model caching to validated retrieval using the AI ranking eligibility contract
- [x] 3.2 Migrate Trii stock-list caching to validated retrieval using a non-empty finite-price map validator
- [x] 3.3 Migrate TradingView price caching to validated retrieval using a finite-number validator
- [x] 3.4 Migrate Steam game-data caching to validated retrieval using non-empty name and finite-score validation

## 4. Domain Tests

- [x] 4.1 Add AI tests proving stale cached model data triggers one refetch and still fails when refreshed data remains unrankable
- [x] 4.2 Add BVC tests proving invalid Trii and TradingView cached values trigger validated refetch behavior
- [x] 4.3 Add Game tests proving invalid Steam cached game data triggers validated refetch behavior

## 5. Verification

- [x] 5.1 Run `npm run check`
- [x] 5.2 Run `npm test`
