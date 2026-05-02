## ADDED Requirements

### Requirement: Exclude models by slug prefix before scoring

The system SHALL apply the slug prefix exclusion filter after the frontier model filter and before scoring when calculating the AI model ranking.

#### Scenario: Excluded models are filtered before scoring

- **WHEN** Artificial Analysis returns models including Claude models with `frontier_model: true`
- **AND** the exclusion blocklist contains `"claude"`
- **THEN** the system SHALL exclude Claude models before calculating internal scores
- **AND** the remaining models SHALL be scored and ranked as if Claude models were never present

#### Scenario: Excluded model that would have been top-ranked

- **WHEN** the highest-scoring model has an excluded slug prefix
- **THEN** the system SHALL rank the next non-excluded model at `position: 1` with `score: 100`
