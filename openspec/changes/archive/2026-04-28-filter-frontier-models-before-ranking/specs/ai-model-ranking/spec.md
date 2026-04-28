## ADDED Requirements

### Requirement: Rank only frontier reasoning models
The system SHALL include only models that are explicitly marked as frontier by Artificial Analysis when calculating the AI model ranking.

#### Scenario: Frontier filter applied before scoring
- **WHEN** Artificial Analysis returns reasoning models with required scoring fields and a mix of `frontier_model: true` and `frontier_model: false`
- **THEN** the system SHALL calculate efficiency percentiles, final scores, sorting, and ranking positions using only the models with `frontier_model: true`

#### Scenario: Non-frontier reasoning model excluded
- **WHEN** a reasoning model has slug, coding, agentic, and positive blended price but does not have `frontier_model: true`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Frontier non-reasoning model excluded
- **WHEN** a model has `frontier_model: true` but is not a reasoning model
- **THEN** the system SHALL exclude that model from the ranking

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
