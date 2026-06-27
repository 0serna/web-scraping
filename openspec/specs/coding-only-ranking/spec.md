# coding-only-ranking Specification

## Purpose

Rank AI models by their coding score, using output-token count and model name as deterministic tie-breakers.

## Requirements

### Requirement: Rank models with coding scores only

The system SHALL include models that have a valid coding score and are not explicitly marked as deprecated when calculating the AI model ranking.

#### Scenario: All models with valid coding are eligible

- **WHEN** Artificial Analysis returns models with coding scores, regardless of other fields
- **THEN** the system SHALL calculate sorting and ranking positions using all models that have valid coding scores and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without output tokens included

- **WHEN** a model has slug and a valid coding value but lacks a finite positive output-token count
- **THEN** the system SHALL include that model in the ranking with `tokens: null`, sorted last among models with equal coding score

#### Scenario: Model without price included

- **WHEN** a model has valid coding but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Deprecated model excluded before ranking

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before sorting and ranking

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

### Requirement: Rank primarily by rounded coding score

The system SHALL round each eligible model's coding score to the nearest integer before sorting.

#### Scenario: Coding score rounded before comparison

- **WHEN** two models have raw coding scores of 59.11 and 58.53 respectively
- **THEN** the system SHALL round both to 59 and treat them as equal in the primary sort

### Requirement: Tie-breakers are deterministic

The system SHALL use output-token count ascending and model name ascending as tie-breakers when rounded coding scores are equal.

#### Scenario: Output tokens break coding ties

- **WHEN** two models have equal rounded coding scores
- **THEN** the system SHALL order them by output-token count ascending with null values sorted last

#### Scenario: Model name breaks remaining ties

- **WHEN** two models have equal rounded coding scores and equal output-token counts
- **THEN** the system SHALL order them by model name ascending

### Requirement: Return ordinal ranking positions

The system SHALL return AI model ranking items with `rank` as a 1-based ordinal position determined by the sort order.

#### Scenario: First model has rank 1

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model ordered first SHALL have `rank` equal to 1

#### Scenario: Subsequent models have consecutive ranks

- **WHEN** the system returns ranked models after position 1
- **THEN** each subsequent model SHALL have `rank` equal to the previous model's rank plus 1

### Requirement: Cap ranking at fixed maximum size

The system SHALL limit the ranking output to a fixed maximum number of models.

#### Scenario: Ranking exceeds maximum size

- **WHEN** more eligible models exist than the maximum allowed ranking entries
- **THEN** the system SHALL return at most `MAX_RANKING_SIZE` models

#### Scenario: Ranking within maximum size

- **WHEN** eligible models are fewer than or equal to the maximum allowed ranking entries
- **THEN** the system SHALL return all eligible models

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `rank`, `model`, `coding`, and `tokens`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`

### Requirement: Include output-token millions in ranking response

The system SHALL include `tokens` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from canonical intelligence token counts

- **WHEN** Artificial Analysis model data contains `canonicalIntelligenceIndexTokenCount.output` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `tokens` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `canonicalIntelligenceIndexTokenCount.output` value
- **THEN** the system SHALL set `tokens` to `null` on the ranked model
