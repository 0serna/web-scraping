## MODIFIED Requirements

### Requirement: Rank explicit reasoning models with coding and agentic scores

The system SHALL include only models that are explicitly marked as reasoning by Artificial Analysis and have coding and agentic scores when calculating the AI model ranking.

#### Scenario: Reasoning filter applied before scoring

- **WHEN** Artificial Analysis returns models with coding and agentic scores and a mix of `reasoning_model: true` and `reasoning_model: false`
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using only the models with `reasoning_model: true`

#### Scenario: Non-reasoning model excluded

- **WHEN** a model has slug, coding, and agentic values but does not have `reasoning_model: true`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Reasoning model without frontier flag included

- **WHEN** a model has `reasoning_model: true`, coding, and agentic values but does not have `frontier_model: true`
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Reasoning model without price included

- **WHEN** a model has `reasoning_model: true`, coding, and agentic values but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, reasoning flag, coding score, and agentic score
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, reasoning flag, coding score, and agentic score
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Preserve reasoning model flag from source data

The system SHALL normalize Artificial Analysis' `reasoning_model` and `isReasoning` source fields into the AI model data used by ranking logic.

#### Scenario: Reasoning flag parsed from model metadata

- **WHEN** a model metadata object from Artificial Analysis contains `reasoning_model: true`
- **THEN** the normalized model SHALL expose the model as reasoning for ranking eligibility

#### Scenario: Reasoning flag parsed from isReasoning field

- **WHEN** a model metadata object from Artificial Analysis contains `isReasoning: true`
- **THEN** the normalized model SHALL expose the model as reasoning for ranking eligibility

#### Scenario: Missing reasoning flag treated as not reasoning

- **WHEN** a model lacks both `reasoning_model` and `isReasoning` fields
- **THEN** the system SHALL treat the model as not reasoning for ranking eligibility

#### Scenario: Additional variants require explicit reasoning flag

- **WHEN** Artificial Analysis exposes additional model variants with coding and agentic scores but no explicit `reasoning_model: true` or `isReasoning: true` value that can be associated with those variants
- **THEN** the system SHALL NOT infer reasoning status for those variants

### Requirement: Exclude models by slug prefix before scoring

The system SHALL apply the slug prefix exclusion filter after the reasoning model filter and before scoring when calculating the AI model ranking.

#### Scenario: Excluded models are filtered before scoring

- **WHEN** Artificial Analysis returns models including Claude models with `reasoning_model: true`
- **AND** the exclusion blocklist contains `"claude"`
- **THEN** the system SHALL exclude Claude models before calculating internal scores
- **AND** the remaining models SHALL be scored and ranked as if Claude models were never present

#### Scenario: Excluded model that would have been top-ranked

- **WHEN** the highest-scoring model has an excluded slug prefix
- **THEN** the system SHALL rank the next non-excluded model at `position: 1` with `score: 100`
