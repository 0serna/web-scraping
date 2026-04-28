## Context

The project has a shared cache abstraction backed by Upstash Redis, with a no-op implementation when cache is disabled. Current callers use `getOrFetch` directly and trust cached values without revalidating their domain contract. This created a production failure when the AI ranking code received cached Artificial Analysis model data that no longer contained any models satisfying the current ranking contract.

Cache use is currently limited and cross-cutting:

- AI caches the parsed Artificial Analysis model list for one hour.
- BVC caches Trii stock-list price maps for three minutes.
- BVC caches TradingView ticker prices per symbol for three minutes.
- Game caches combined Steam game data per app for fifteen days.

## Goals / Non-Goals

**Goals:**

- Provide one shared validated cache retrieval path for all current cache consumers.
- Invalidate only the failing key when cached data does not pass a caller-provided validator.
- Refetch once after invalidating stale cached data.
- Validate fresh fetch results before storing them.
- Keep domain-specific validity rules in domain services.
- Log stale cache invalidation events for production diagnosis.

**Non-Goals:**

- Do not add multi-retry policies or backoff behavior.
- Do not delete unrelated Redis keys or flush Redis globally.
- Do not add schema-versioned cache envelopes in this change.
- Do not change endpoint response shapes or domain ranking/scoring rules.
- Do not add new external dependencies.

## Decisions

### Add a validated cache method to the shared cache abstraction

Introduce a method equivalent to `getOrFetchValidated(key, fetcher, validator)` on `Cache<T>` and implement it in both Upstash and no-op cache implementations.

Rationale: validation, key invalidation, single refetch, and logging are cache concerns shared across domains. Keeping this behavior centralized avoids each domain reimplementing slightly different stale-cache recovery.

Alternative considered: implement AI-only recovery in `ModelRankingService`. This would solve the immediate incident but leave BVC and Game with the same stale-cache risk and no shared pattern.

### Require per-domain validators

Each caller will provide a small validator matching its cached value contract.

Examples:

- AI models: array contains at least one model satisfying the ranking eligibility contract.
- Trii price map: object contains at least one finite numeric price.
- TradingView price: value is a finite number.
- Steam game data: name is non-empty and score is finite.

Rationale: the cache layer cannot know domain semantics. Validators keep business rules near the domain while sharing the recovery mechanics.

Alternative considered: only validate generic shape, such as non-null objects or non-empty arrays. That would not have caught the AI stale-cache failure because the cached value could be structurally valid but semantically unusable.

### Invalidate and refetch once

When cached data fails validation, the cache implementation will delete that key and run the fetcher once. If the fresh value passes validation, it will be stored and returned. If it fails validation or the fetcher throws, the method will fail and not store the invalid value.

Rationale: one retry handles stale cache without masking real upstream or parser failures. It also prevents infinite loops and unexpected latency growth.

Alternative considered: return stale data when refresh fails. This contradicts the purpose of validation when stale data is known to violate the caller's contract.

### Preserve pending-request deduplication

Validated fetches should preserve the current `getOrFetch` behavior that deduplicates concurrent fetches for the same key.

Rationale: invalid stale cache can be discovered under concurrent traffic. The shared implementation should avoid triggering multiple simultaneous upstream fetches for the same key.

Alternative considered: implement validation outside the shared cache. That would make deduplication harder to preserve consistently.

## Risks / Trade-offs

- [Risk] Validators may be too strict and reject usable data → Mitigation: keep validators minimal and tied to the value each endpoint actually requires.
- [Risk] Validators may be too lax and allow bad stale data → Mitigation: add domain tests for invalid cached values that should trigger refetch.
- [Risk] Redis delete failures could prevent cleanup → Mitigation: log delete failures and ensure fresh invalid values are still not cached.
- [Risk] AI ranking validation duplicates some ranking eligibility logic → Mitigation: extract or colocate the predicate so ranking and cache validation share the same definition where practical.

## Migration Plan

1. Extend the shared cache interface with key invalidation and validated retrieval.
2. Implement the behavior in Upstash cache and the no-op cache.
3. Migrate all current cache callers to validated retrieval with domain validators.
4. Add tests covering valid cache hits, invalid cache hits with refetch, invalid fresh fetches not being stored, and delete behavior.
5. Deploy normally; existing Redis keys remain usable if they pass validation and are self-healed per-key if they do not.

Rollback is a normal code rollback. Redis entries are not migrated globally, and per-key deletes are safe because each deleted value can be refetched by its owning service.

## Open Questions

None.
