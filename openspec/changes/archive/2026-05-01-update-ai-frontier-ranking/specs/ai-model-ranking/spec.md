## MODIFIED Requirements

### Requirement: Rank explicit frontier models with coding and agentic scores

The system SHALL include only models that are explicitly marked as frontier by Artificial Analysis and have coding and agentic scores when calculating the AI model ranking.

#### Scenario: Frontier filter applied before scoring

- **WHEN** Artificial Analysis returns models with coding and agentic scores and a mix of `frontier_model: true` and `frontier_model: false`
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using only the models with `frontier_model: true`

#### Scenario: Non-frontier model excluded

- **WHEN** a model has slug, coding, and agentic values but does not have `frontier_model: true`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Frontier non-reasoning model included

- **WHEN** a model has `frontier_model: true`, coding, and agentic values but is not a reasoning model
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Frontier model without price included

- **WHEN** a model has `frontier_model: true`, coding, and agentic values but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, frontier flag, coding score, and agentic score
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, frontier flag, coding score, and agentic score
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Preserve frontier model flag from source data

The system SHALL normalize Artificial Analysis' `frontier_model` source field into the AI model data used by ranking logic.

#### Scenario: Frontier flag parsed from performance data

- **WHEN** a performance data object from Artificial Analysis contains `frontier_model: true`
- **THEN** the normalized model SHALL expose the model as frontier for ranking eligibility

#### Scenario: Missing frontier flag treated as not frontier

- **WHEN** a model lacks the Artificial Analysis `frontier_model` field
- **THEN** the system SHALL treat the model as not frontier for ranking eligibility

#### Scenario: Frontier flag merged by slug

- **WHEN** model metadata and performance data are provided in separate payload chunks for the same slug
- **THEN** the system SHALL merge the frontier flag from performance data into the normalized model for that slug

#### Scenario: Additional variants require explicit frontier flag

- **WHEN** Artificial Analysis exposes additional model variants with coding and agentic scores but no explicit `frontier_model: true` value that can be associated with those variants
- **THEN** the system SHALL NOT infer frontier status for those variants

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the internal score of the model at `position: 1`.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded internal score divided by the unrounded internal score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

#### Scenario: Price omitted from ranking order

- **WHEN** multiple frontier models have coding and agentic scores
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Ranking ties are deterministic

- **WHEN** two frontier models have equal internal scores
- **THEN** the system SHALL order them by agentic score descending, then coding score descending, then model name ascending

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `position`, and `score`
- **AND** each ranking item SHALL NOT include `price1m`
