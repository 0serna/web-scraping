## MODIFIED Requirements

### Requirement: Apply token efficiency adjustment to AI ranking

The system SHALL apply a multiplicative output-efficiency adjustment to each rankable model's internal score when the model has a finite positive output-token count.

#### Scenario: Below-threshold output grants positive adjustment

- **WHEN** multiple rankable reasoning models have coding scores, agentic scores, and valid output-token counts below the output-token threshold
- **THEN** the system SHALL calculate each model's normalized preference base score from eligible-set-normalized coding and agentic scores
- **AND** the system SHALL multiply the base score by `1 + maximumAdjustment * (1 - outputTokens / outputTokenThreshold)` before ordering models and calculating public relative scores

#### Scenario: Threshold output is neutral

- **WHEN** a rankable reasoning model has an output-token count equal to the output-token threshold
- **THEN** the system SHALL keep the model in the ranking with no output-efficiency bonus or penalty

#### Scenario: Above-threshold output receives capped penalty

- **WHEN** a rankable reasoning model has an output-token count greater than the output-token threshold
- **THEN** the system SHALL calculate the output-efficiency adjustment as `maximumAdjustment * (1 - outputTokens / outputTokenThreshold)` capped at no less than the negative maximum adjustment
- **AND** the system SHALL multiply the normalized preference base score by `1 + adjustment` before ordering models and calculating public relative scores

#### Scenario: Missing token data grants no adjustment

- **WHEN** a rankable reasoning model lacks a finite positive output-token count
- **THEN** the system SHALL keep the model in the ranking with no token-efficiency bonus or penalty

#### Scenario: No valid token data preserves base ranking

- **WHEN** no rankable reasoning model has a finite positive output-token count
- **THEN** the system SHALL rank models by the normalized coding and agentic preference score without an efficiency adjustment

#### Scenario: Efficiency breaks final score ties

- **WHEN** two rankable reasoning models have equal final internal scores after applying the token-efficiency adjustment
- **THEN** the system SHALL order by normalized agentic score descending, then normalized coding score descending, then lower valid output-token count, then model name ascending
- **AND** models with missing output-token data SHALL sort after models with valid output-token data for the output-token tie-break
