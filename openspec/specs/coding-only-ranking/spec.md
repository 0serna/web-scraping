# coding-only-ranking Specification

## Purpose

Rank AI models by coding efficiency using their coding index and output token counts.

## Requirements

### Requirement: Rank models with coding scores only

The system SHALL include models that have valid coding scores, valid output-token counts, and are not explicitly marked as deprecated when calculating the AI model ranking.

#### Scenario: All models with valid coding and output tokens are eligible

- **WHEN** Artificial Analysis returns models with coding scores and valid output-token counts, regardless of other fields
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using all models that have valid coding scores, valid output-token counts, and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without output tokens excluded

- **WHEN** a model has slug and a valid coding value but lacks a finite positive output-token count
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without price included

- **WHEN** a model has valid coding and output-token values but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Deprecated model excluded before scoring

- **WHEN** a model has slug, coding score, valid output-token count, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores, sorting, and ranking positions

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, valid output-token count, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

### Requirement: Internal score is normalized coding

The system SHALL calculate each eligible model's internal score as its raw coding score divided by its output-token count expressed in millions.

#### Scenario: Efficiency calculation

- **WHEN** multiple eligible models have coding scores and output-token counts
- **THEN** the system SHALL compute each model's internal score as `coding_index / (output_tokens / 1_000_000)`

### Requirement: Return ordinal ranking positions

The system SHALL return AI model ranking items with `rank` as a 1-based ordinal position determined by internal efficiency score ordering.

#### Scenario: First model has rank 1

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model with the highest internal efficiency score SHALL have `rank` equal to 1

#### Scenario: Subsequent models have consecutive ranks

- **WHEN** the system returns ranked models after position 1
- **THEN** each subsequent model SHALL have `rank` equal to the previous model's rank plus 1

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal efficiency score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning ranking positions

### Requirement: Ranking ties are deterministic

The system SHALL use coding score, output-token count, and model name as tie-breakers when internal efficiency scores are equal.

#### Scenario: Coding score breaks efficiency ties

- **WHEN** two models have equal internal efficiency scores
- **THEN** the system SHALL order them by coding score descending

#### Scenario: Output tokens breaks coding ties

- **WHEN** two models have equal internal efficiency scores and equal coding scores
- **THEN** the system SHALL order them by output-token count ascending

#### Scenario: Model name breaks remaining ties

- **WHEN** two models have equal internal efficiency scores, equal coding scores, and equal output-token counts
- **THEN** the system SHALL order them by model name ascending

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `rank`, `model`, and `tokens`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`
