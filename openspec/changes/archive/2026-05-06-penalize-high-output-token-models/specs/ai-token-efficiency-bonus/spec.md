## MODIFIED Requirements

### Requirement: Configure AI token efficiency bonus weight

The system SHALL define the AI ranking token-efficiency maximum adjustment and output-token threshold as constants in `src/domains/ai/services/model-ranking-service.ts`.

#### Scenario: Default constants are local to ranking service

- **WHEN** the ranking service calculates output-efficiency adjustments
- **THEN** it SHALL use the service-local maximum adjustment constant
- **AND** it SHALL use the service-local output-token threshold constant

#### Scenario: Environment variable is not required

- **WHEN** the process starts without `MODEL_EFFICIENCY_WEIGHT`
- **THEN** startup SHALL NOT fail because token-efficiency adjustment settings are service-local constants

### Requirement: Apply token efficiency bonus to AI ranking

The system SHALL apply a multiplicative output-efficiency adjustment to each rankable model's internal score when the model has a finite positive output-token count.

#### Scenario: Below-threshold output grants positive adjustment

- **WHEN** multiple rankable reasoning models have coding scores, agentic scores, and valid output-token counts below the output-token threshold
- **THEN** the system SHALL calculate each model's base score from coding and agentic scores
- **AND** the system SHALL multiply the base score by `1 + maximumAdjustment * (1 - outputTokens / outputTokenThreshold)` before ordering models and calculating public relative scores

#### Scenario: Threshold output is neutral

- **WHEN** a rankable reasoning model has an output-token count equal to the output-token threshold
- **THEN** the system SHALL keep the model in the ranking with no output-efficiency bonus or penalty

#### Scenario: Above-threshold output receives capped penalty

- **WHEN** a rankable reasoning model has an output-token count greater than the output-token threshold
- **THEN** the system SHALL calculate the output-efficiency adjustment as `maximumAdjustment * (1 - outputTokens / outputTokenThreshold)` capped at no less than the negative maximum adjustment
- **AND** the system SHALL multiply the base score by `1 + adjustment` before ordering models and calculating public relative scores

#### Scenario: Missing token data grants no adjustment

- **WHEN** a rankable reasoning model lacks a finite positive output-token count
- **THEN** the system SHALL keep the model in the ranking with no token-efficiency bonus or penalty

#### Scenario: No valid token data preserves base ranking

- **WHEN** no rankable reasoning model has a finite positive output-token count
- **THEN** the system SHALL rank models by the existing coding and agentic internal score without an efficiency adjustment

#### Scenario: Efficiency breaks final score ties

- **WHEN** two rankable reasoning models have equal final internal scores after applying the token-efficiency adjustment
- **THEN** the system SHALL order by agentic score descending, then coding score descending, then lower valid output-token count, then model name ascending
- **AND** models with missing output-token data SHALL sort after models with valid output-token data for the output-token tie-break
