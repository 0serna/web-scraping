# ai-token-efficiency-bonus Specification

## Purpose

Apply a configurable token-efficiency adjustment to AI model ranking scores based on each model's intelligence per million output tokens.

## Requirements

### Requirement: Configure AI token efficiency adjustment weight

The system SHALL define the AI ranking token-efficiency maximum adjustment and output-token threshold as constants in `src/domains/ai/services/model-ranking-service.ts`.

#### Scenario: Default constants are local to ranking service

- **WHEN** the ranking service calculates output-efficiency adjustments
- **THEN** it SHALL use the service-local maximum adjustment constant
- **AND** it SHALL use the service-local output-token threshold constant

#### Scenario: Environment variable is not required

- **WHEN** the process starts without `MODEL_EFFICIENCY_WEIGHT`
- **THEN** startup SHALL NOT fail because token-efficiency adjustment settings are service-local constants

### Requirement: Parse Artificial Analysis Intelligence Index output token counts

The system SHALL normalize Artificial Analysis `intelligence_index_token_counts.output_tokens` into AI model data when the source value is a finite positive number.

#### Scenario: Output token count parsed from performance data

- **WHEN** an Artificial Analysis model object contains `intelligence_index_token_counts.output_tokens` with a finite positive number
- **THEN** the normalized AI model data SHALL expose that value for ranking efficiency calculations

#### Scenario: Missing output token count remains optional

- **WHEN** an Artificial Analysis model object does not contain a finite positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the normalized AI model data SHALL keep the model otherwise usable without a token-efficiency value

#### Scenario: Output token count merged by slug

- **WHEN** model metadata and performance data are provided in separate payload chunks for the same slug
- **THEN** the system SHALL merge the output token count from performance data into the normalized model for that slug

### Requirement: Apply token efficiency adjustment to AI ranking

The system SHALL apply a multiplicative output-efficiency adjustment to each rankable model's internal score when the model has a finite positive output-token count.

#### Scenario: Below-threshold output grants positive adjustment

- **WHEN** multiple rankable models have coding scores and valid output-token counts below the output-token threshold
- **THEN** the system SHALL calculate each model's normalized coding base score from eligible-set-normalized coding scores
- **AND** the system SHALL multiply the base score by `1 + maximumAdjustment * (1 - outputTokens / outputTokenThreshold)` before ordering models and calculating public relative scores

#### Scenario: Threshold output is neutral

- **WHEN** a rankable model has an output-token count equal to the output-token threshold
- **THEN** the system SHALL keep the model in the ranking with no output-efficiency bonus or penalty

#### Scenario: Above-threshold output receives capped penalty

- **WHEN** a rankable model has an output-token count greater than the output-token threshold
- **THEN** the system SHALL calculate the output-efficiency adjustment as `maximumAdjustment * (1 - outputTokens / outputTokenThreshold)` capped at no less than the negative maximum adjustment
- **AND** the system SHALL multiply the normalized coding base score by `1 + adjustment` before ordering models and calculating public relative scores

#### Scenario: Missing token data grants no adjustment

- **WHEN** a rankable model lacks a finite positive output-token count
- **THEN** the system SHALL keep the model in the ranking with no token-efficiency bonus or penalty

#### Scenario: No valid token data preserves base ranking

- **WHEN** no rankable model has a finite positive output-token count
- **THEN** the system SHALL rank models by the normalized coding score without an efficiency adjustment

#### Scenario: Efficiency breaks final score ties

- **WHEN** two rankable models have equal final internal scores after applying the token-efficiency adjustment
- **THEN** the system SHALL order by normalized coding score descending, then lower valid output-token count, then model name ascending
- **AND** models with missing output-token data SHALL sort after models with valid output-token data for the output-token tie-break
