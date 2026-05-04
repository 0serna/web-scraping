## ADDED Requirements

### Requirement: Include tokens per second in ranking response

The system SHALL include `tokensPerSecond` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Tokens per second extracted from medium_coding prompt length

- **WHEN** Artificial Analysis model data contains `performanceByPromptLength` with an entry where `prompt_length_type` is `"medium_coding"`
- **THEN** the system SHALL extract `median_output_speed` from that entry and expose it as `tokensPerSecond` on the ranked model

#### Scenario: Tokens per second is null when performance data missing

- **WHEN** Artificial Analysis model data does not contain `performanceByPromptLength` or lacks a `"medium_coding"` entry
- **THEN** the system SHALL set `tokensPerSecond` to `null` on the ranked model

#### Scenario: Tokens per second does not affect ranking order

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL NOT use `tokensPerSecond` to determine eligibility, ranking order, or score calculation
- **AND** `tokensPerSecond` SHALL be purely informational in the response
