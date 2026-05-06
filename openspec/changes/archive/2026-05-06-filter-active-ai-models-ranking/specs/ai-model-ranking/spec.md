## MODIFIED Requirements

### Requirement: Rank explicit reasoning models with coding and agentic scores

The system SHALL include only models that are explicitly marked as reasoning by Artificial Analysis, have coding and agentic scores, and are not explicitly marked as deprecated when calculating the AI model ranking.

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

#### Scenario: Deprecated reasoning model excluded before scoring

- **WHEN** a model has `reasoning_model: true`, slug, coding score, agentic score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores, sorting, and relative ranking scores

#### Scenario: Reasoning model without deprecated field included

- **WHEN** a model has `reasoning_model: true`, slug, coding score, agentic score, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, reasoning flag, coding score, agentic score, and active-model eligibility
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, reasoning flag, coding score, agentic score, and active-model eligibility
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking
