# model-release-date-filter Specification

## Purpose

Filter AI model ranking to include only models released within a recent time window, while preserving models with unknown release dates. This capability has been retired in favor of lifecycle-driven active-model eligibility using Artificial Analysis `deprecated` metadata.

## Requirements

### Requirement: Retire release-date eligibility

The system SHALL NOT use release-date recency to filter AI model ranking eligibility. Active-model eligibility is now determined by Artificial Analysis `deprecated` lifecycle metadata.

#### Scenario: Release-date window no longer applied

- **WHEN** a model has an old or missing release date and `deprecated: false`
- **THEN** the system SHALL keep that model eligible for ranking without applying a release-date recency window

#### Scenario: Release date removed from ranking response

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL NOT include `date` or `releaseDate`
