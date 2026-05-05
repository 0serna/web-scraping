# cache-architecture Specification

## Purpose

Structural rules for the caching abstraction layer: contract definition, factory-based implementation selection, resilience guarantees, and practical usage constraints across domains.

## Requirements

### Requirement: Cache contract

The system SHALL define a shared `Cache<T>` interface that all cache implementations must satisfy, exposing `get`, `set`, `delete`, `getOrFetch`, and `getOrFetchValidated` operations.

#### Scenario: Cache implementation

- **WHEN** any cache implementation is instantiated
- **THEN** it SHALL implement the shared `Cache<T>` contract

### Requirement: Factory-based implementation selection

The system SHALL select the active cache implementation through a `createCache` factory function that reads runtime configuration, returning either a real cache (Upstash Redis) or a no-op implementation when caching is disabled.

#### Scenario: Cache enabled

- **WHEN** cache configuration is enabled and valid Upstash credentials are provided
- **THEN** `createCache` SHALL return an Upstash-backed cache instance

#### Scenario: Cache disabled

- **WHEN** cache configuration is disabled
- **THEN** `createCache` SHALL return a no-op cache that returns null on reads and silently discards writes
- **AND** `getOrFetch` and `getOrFetchValidated` SHALL call the fetcher directly

### Requirement: Lazy Upstash client initialization

The Upstash Redis client SHALL be initialized once per process, lazily on first use, rather than at import time or application startup.

#### Scenario: First cache access

- **WHEN** the first cache operation is requested
- **THEN** the Upstash Redis client is initialized and reused for all subsequent operations

### Requirement: Resilient cache operations

Cache `get` and `set` operations SHALL log failures without throwing to callers. A cache failure SHALL NOT prevent the application from serving requests — callers always fall back to the fetcher.

#### Scenario: Redis unavailable during get

- **WHEN** a cache `get` operation fails due to Redis connectivity issues
- **THEN** the failure is logged
- **AND** `null` is returned, allowing the caller to proceed with a fresh fetch

#### Scenario: Redis unavailable during set

- **WHEN** a cache `set` operation fails
- **THEN** the failure is logged
- **AND** no error is thrown to the caller

### Requirement: Request coalescing per cache key

The `getOrFetch` and `getOrFetchValidated` operations SHALL deduplicate concurrent upstream fetches for the same cache key, sharing a single pending fetch result across all concurrent callers.

#### Scenario: Concurrent cache misses

- **WHEN** multiple callers request the same uncached key simultaneously
- **THEN** only one upstream fetch is executed
- **AND** all callers receive the same fetched result

### Requirement: Cache key namespace

All cache keys written to Redis SHALL be prefixed with a `ws:` namespace to avoid collisions with other applications or environments sharing the same Redis instance.

#### Scenario: Key creation

- **WHEN** a key is stored in Redis
- **THEN** it SHALL be prefixed with `ws:`

### Requirement: Services use the cache factory

Domain services SHALL obtain cache instances exclusively through the `createCache` factory. No service SHALL import Redis directly or construct cache implementations manually.

#### Scenario: Adding caching to a service

- **WHEN** a service needs caching
- **THEN** it SHALL call `createCache` with a TTL and logger
- **AND** TTL and cache-key design SHALL be scoped to that service
