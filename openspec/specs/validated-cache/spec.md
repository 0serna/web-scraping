# validated-cache Specification

## Purpose

Shared cache behavior for validating cached values, invalidating stale entries, and safely refetching data.

## Requirements

### Requirement: Validated cached values

The system SHALL provide a shared cache operation that validates cached values with a caller-provided validator before returning them.

#### Scenario: Cached value passes validation

- **WHEN** a cached value exists for a requested key and the validator accepts it
- **THEN** the system SHALL return the cached value without calling the fetcher

#### Scenario: Cached value fails validation

- **WHEN** a cached value exists for a requested key and the validator rejects it
- **THEN** the system SHALL invalidate only that key
- **AND** the system SHALL fetch a fresh value once

### Requirement: Fresh values validated before storage

The system SHALL validate freshly fetched values before storing or returning them from the validated cache operation.

#### Scenario: Fresh value passes validation

- **WHEN** the fetcher returns a fresh value and the validator accepts it
- **THEN** the system SHALL store the fresh value in cache
- **AND** the system SHALL return the fresh value

#### Scenario: Fresh value fails validation

- **WHEN** the fetcher returns a fresh value and the validator rejects it
- **THEN** the system SHALL NOT store the fresh value in cache
- **AND** the system SHALL fail the cache operation

### Requirement: Per-key invalidation

The system SHALL support deleting a single cache entry by key without deleting unrelated entries.

#### Scenario: Invalidating stale entry

- **WHEN** a cached value fails validation for one key
- **THEN** the system SHALL delete only the cache entry for that key
- **AND** the system SHALL leave other cache entries unchanged

### Requirement: Observable stale cache recovery

The system SHALL log stale cache invalidation events when validated cache rejects a cached value.

#### Scenario: Stale cache detected

- **WHEN** a cached value fails validation and is invalidated
- **THEN** the system SHALL log the affected key and that validation failed

### Requirement: Concurrent validated fetch deduplication

The system SHALL avoid duplicate upstream fetches for concurrent validated cache misses or invalid stale entries for the same key.

#### Scenario: Concurrent requests for same key

- **WHEN** multiple callers request the same key through validated cache while a fetch is already pending
- **THEN** the system SHALL share the pending fetch result for those callers
