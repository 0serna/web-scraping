# model-release-date-filter Specification

## Purpose

Filter AI model ranking to include only models released within a recent time window, while preserving models with unknown release dates.

## Requirements

### Requirement: Extract release date from Artificial Analysis payload

The system SHALL extract the `release_date` field from the raw Artificial Analysis model payload and normalize it into the `ArtificialAnalysisModel` type as `releaseDate: string | null`.

#### Scenario: Release date parsed from snake_case field

- **WHEN** a raw model object contains `release_date: "2026-04-23"`
- **THEN** the normalized model SHALL have `releaseDate: "2026-04-23"`

#### Scenario: Missing release date defaults to null

- **WHEN** a raw model object does not contain a `release_date` field
- **THEN** the normalized model SHALL have `releaseDate: null`

#### Scenario: Invalid release date defaults to null

- **WHEN** a raw model object contains `release_date` with a non-string or unparseable value
- **THEN** the normalized model SHALL have `releaseDate: null`

### Requirement: Filter ranking by release date window

The system SHALL exclude models from the ranking when their `releaseDate` is earlier than the cutoff date calculated as the current date minus `RECENT_MODEL_WINDOW_DAYS` (90 days). Models with `releaseDate: null` SHALL pass the filter and remain included.

#### Scenario: Recent model passes filter

- **WHEN** a model has `releaseDate: "2026-04-01"` and the cutoff date is `2026-02-05`
- **THEN** the model SHALL be included in the ranking

#### Scenario: Old model excluded by filter

- **WHEN** a model has `releaseDate: "2025-01-15"` and the cutoff date is `2026-02-05`
- **THEN** the model SHALL be excluded from the ranking

#### Scenario: Model with null release date passes filter

- **WHEN** a model has `releaseDate: null`
- **THEN** the model SHALL pass the release date filter and remain eligible for ranking

#### Scenario: Model with future release date passes filter

- **WHEN** a model has `releaseDate: "2026-06-01"` and the cutoff date is `2026-02-05`
- **THEN** the model SHALL be included in the ranking

### Requirement: Include release date in ranking response

The system SHALL include a `releaseDate` field on each `RankedModel` in the ranking response, with value as an ISO date string (`YYYY-MM-DD`) or `null`.

#### Scenario: Ranking item includes release date

- **WHEN** the system returns a successful ranking
- **THEN** each ranking item SHALL include `releaseDate` with the model's release date string or `null`
