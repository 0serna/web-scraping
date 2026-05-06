## MODIFIED Requirements

### Requirement: Configure AI token efficiency bonus weight

The system SHALL define the AI ranking token-efficiency maximum bonus and output-token threshold as constants in `src/domains/ai/services/model-ranking-service.ts`.

#### Scenario: Default constants are local to ranking service

- **WHEN** the ranking service calculates output-efficiency bonuses
- **THEN** it SHALL use a maximum bonus constant of `0.15`
- **AND** it SHALL use an output-token threshold constant of `100_000_000`

#### Scenario: Environment variable is not required

- **WHEN** the process starts without `MODEL_EFFICIENCY_WEIGHT`
- **THEN** startup SHALL NOT fail because token-efficiency bonus settings are service-local constants

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

### Requirement: Apply token efficiency bonus to AI ranking

The system SHALL apply a multiplicative output-efficiency bonus to each rankable model's internal score when the model has a finite positive output-token count below the service-local output-token threshold.

#### Scenario: Efficiency bonus affects ranking order

- **WHEN** multiple rankable reasoning models have coding scores, agentic scores, and valid output-token counts below `100_000_000`
- **THEN** the system SHALL calculate each model's base score from coding and agentic scores
- **AND** the system SHALL multiply the base score by `1 + 0.15 * (1 - outputTokens / 100_000_000)` before ordering models and calculating public relative scores

#### Scenario: Threshold output grants no bonus

- **WHEN** a rankable reasoning model has an output-token count greater than or equal to `100_000_000`
- **THEN** the system SHALL keep the model in the ranking with no output-efficiency bonus and no output-token penalty

#### Scenario: Missing token data grants no bonus

- **WHEN** a rankable reasoning model lacks a finite positive output-token count
- **THEN** the system SHALL keep the model in the ranking with no token-efficiency bonus

#### Scenario: No valid token data preserves base ranking

- **WHEN** no rankable reasoning model has a finite positive output-token count below the output-token threshold
- **THEN** the system SHALL rank models by the existing coding and agentic internal score without an efficiency bonus

#### Scenario: Efficiency breaks final score ties

- **WHEN** two rankable reasoning models have equal final internal scores after applying the token-efficiency bonus
- **THEN** the system SHALL order by agentic score descending, then coding score descending, then lower valid output-token count, then model name ascending
- **AND** models with missing output-token data SHALL sort after models with valid output-token data for the output-token tie-break
