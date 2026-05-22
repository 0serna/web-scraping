## MODIFIED Requirements

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
- **THEN** the system SHALL exclude that model before calculating internal scores, sorting, and relative ranking scores

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, valid output-token count, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

### Requirement: Internal score is normalized coding

The system SHALL calculate each eligible model's internal score as its raw coding score divided by its output-token count expressed in millions.

#### Scenario: Efficiency calculation

- **WHEN** multiple eligible models have coding scores and output-token counts
- **THEN** the system SHALL compute each model's internal score as `coding_index / (output_tokens / 1_000_000)`

#### Scenario: Single model always scores 100

- **WHEN** only one eligible model exists with valid coding and output-token values
- **THEN** its public relative score SHALL be 100

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the internal efficiency score of the model at `position: 1`.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its internal efficiency score divided by the internal efficiency score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal efficiency score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

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
