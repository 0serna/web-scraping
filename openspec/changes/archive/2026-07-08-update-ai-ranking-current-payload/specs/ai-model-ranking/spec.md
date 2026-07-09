## ADDED Requirements

### Requirement: Normalize current Artificial Analysis payload

The system SHALL normalize Artificial Analysis model data from the current camelCase payload fields used by the ranking domain.

#### Scenario: Current model name and coding fields normalized

- **WHEN** a raw Artificial Analysis model object contains `slug`, `shortName`, and a finite `codingIndex`
- **THEN** the normalized model SHALL expose the trimmed slug, `shortName` as the public model name, and `codingIndex` as the coding score

#### Scenario: Current token count field normalized

- **WHEN** a raw Artificial Analysis model object contains `canonicalIntelligenceIndexTokenCount.output` with a positive finite number
- **THEN** the normalized model SHALL expose that value as the intelligence index output-token count

#### Scenario: Missing current coding signal fails with diagnostic parse error

- **WHEN** extracted Artificial Analysis payload data contains no `codingIndex` entries
- **THEN** the system SHALL fail parsing with an `AiParseError` that identifies the missing current ranking signal

## MODIFIED Requirements

### Requirement: Rank models with valid coding scores

The system SHALL include models that have valid coding scores and are not explicitly marked as deprecated when calculating the AI model ranking. Agentic scores, reasoning status, frontier metadata, and price metadata SHALL NOT be ranking-domain inputs.

#### Scenario: All models with valid coding are eligible

- **WHEN** Artificial Analysis returns models with coding scores, regardless of agentic scores, reasoning status, token counts, frontier metadata, or price metadata
- **THEN** the system SHALL calculate sorting and ranking positions using all models that have valid coding scores and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without output tokens included

- **WHEN** a model has slug and a valid coding value but lacks a finite positive output-token count
- **THEN** the system SHALL include that model in the ranking, placing it after models with equal coding score and valid token counts

#### Scenario: Deprecated model excluded before ranking

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before sorting and ranking

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Older active model included

- **WHEN** a model has slug, coding score, `deprecated: false`, and an old or missing release date
- **THEN** the system SHALL keep that model eligible for ranking without applying a release-date recency window

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, coding score, and active-model eligibility
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, coding score, and active-model eligibility
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Return ordinal ranking positions

The system SHALL return AI model ranking items with `rank` as a 1-based ordinal position determined by the sort order.

#### Scenario: First model has rank 1

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model ordered first SHALL have `rank` equal to 1

#### Scenario: Subsequent models have consecutive ranks

- **WHEN** the system returns ranked models after position 1
- **THEN** each subsequent model SHALL have `rank` equal to the previous model's rank plus 1
