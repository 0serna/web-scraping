# coding-only-ranking Specification

## Purpose

TBD - created by archiving change remove-agentic-and-reasoning-from-ranking. Update Purpose after archive.

## Requirements

### Requirement: Rank models with coding scores only

The system SHALL include models that have valid coding scores and are not explicitly marked as deprecated when calculating the AI model ranking. Agentic scores and reasoning status SHALL NOT affect eligibility.

#### Scenario: All models with valid coding scores are eligible

- **WHEN** Artificial Analysis returns models with coding scores, regardless of agentic scores or reasoning status
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using all models that have valid coding scores and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without price included

- **WHEN** a model has a valid coding value but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Deprecated model excluded before scoring

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores, sorting, and relative ranking scores

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

### Requirement: Internal score is normalized coding

The system SHALL calculate each eligible model's internal score as its raw coding score divided by the maximum raw coding score among all eligible models, multiplied by 100.

#### Scenario: Coding normalization

- **WHEN** multiple eligible models have coding scores
- **THEN** the system SHALL compute `maxCoding` from the eligible model set
- **AND** the system SHALL normalize each model's coding score as its raw coding score divided by `maxCoding`, multiplied by 100
- **AND** the system SHALL use that normalized coding score as the model's internal base score

#### Scenario: Single model always scores 100

- **WHEN** only one eligible model exists
- **THEN** its normalized coding score SHALL be 100

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the adjusted internal score of the model at `position: 1`, where the adjusted internal score is calculated from the normalized coding score plus any output-efficiency adjustment.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded adjusted internal score divided by the unrounded adjusted internal score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's adjusted internal score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

### Requirement: Ranking ties are deterministic

The system SHALL use normalized coding score and model name as tie-breakers when adjusted internal scores are equal.

#### Scenario: Normalized coding breaks score ties

- **WHEN** two models have equal adjusted internal scores
- **THEN** the system SHALL order them by normalized coding score descending

#### Scenario: Model name breaks remaining ties

- **WHEN** two models have equal adjusted internal scores and equal normalized coding scores
- **THEN** the system SHALL order them by model name ascending

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `score`, and `tokens`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`
