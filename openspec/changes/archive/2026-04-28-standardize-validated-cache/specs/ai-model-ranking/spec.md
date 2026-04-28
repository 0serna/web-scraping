## MODIFIED Requirements

### Requirement: Rank only frontier reasoning models

The system SHALL include only models that are explicitly marked as frontier by Artificial Analysis when calculating the AI model ranking, and SHALL attempt one validated cache refresh before failing when cached model data contains no rankable frontier reasoning models.

#### Scenario: Frontier filter applied before scoring

- **WHEN** Artificial Analysis returns reasoning models with required scoring fields and a mix of `frontier_model: true` and `frontier_model: false`
- **THEN** the system SHALL calculate efficiency percentiles, final scores, sorting, and ranking positions using only the models with `frontier_model: true`

#### Scenario: Non-frontier reasoning model excluded

- **WHEN** a reasoning model has slug, coding, agentic, and positive blended price but does not have `frontier_model: true`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Frontier non-reasoning model excluded

- **WHEN** a model has `frontier_model: true` but is not a reasoning model
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, reasoning flag, frontier flag, coding score, agentic score, and blended price
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, reasoning flag, frontier flag, coding score, agentic score, and blended price
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking
