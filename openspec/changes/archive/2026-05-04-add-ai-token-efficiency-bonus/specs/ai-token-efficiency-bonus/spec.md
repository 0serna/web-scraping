## ADDED Requirements

### Requirement: Configure AI token efficiency bonus weight

The system SHALL read `MODEL_EFFICIENCY_WEIGHT` as the AI ranking token-efficiency bonus weight, defaulting to `0.30` when the environment variable is not set.

#### Scenario: Missing weight uses default

- **WHEN** `MODEL_EFFICIENCY_WEIGHT` is not configured
- **THEN** the system SHALL use `0.30` as the token-efficiency bonus weight

#### Scenario: Configured weight accepted

- **WHEN** `MODEL_EFFICIENCY_WEIGHT` is configured as a finite number from `0` through `1` inclusive
- **THEN** the system SHALL use that configured value as the token-efficiency bonus weight

#### Scenario: Invalid configured weight rejected

- **WHEN** `MODEL_EFFICIENCY_WEIGHT` is configured as a non-number, negative number, or number greater than `1`
- **THEN** the system SHALL fail startup instead of silently changing or ignoring the configured value

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

The system SHALL add a multiplicative token-efficiency bonus to each rankable model's internal score using the configured weight and the model's intelligence per million output tokens.

#### Scenario: Efficiency bonus affects ranking order

- **WHEN** multiple rankable frontier models have coding scores, agentic scores, and valid output-token counts
- **THEN** the system SHALL calculate each model's efficiency from its internal intelligence score divided by output tokens in millions
- **AND** the system SHALL rank models by internal intelligence score multiplied by one plus the configured weight times relative efficiency

#### Scenario: Zero weight preserves base ranking

- **WHEN** the configured token-efficiency bonus weight is `0`
- **THEN** the system SHALL rank models by the existing coding and agentic internal score without an efficiency bonus

#### Scenario: Missing token data grants no bonus

- **WHEN** a rankable frontier model lacks a finite positive output-token count
- **THEN** the system SHALL keep the model in the ranking with no token-efficiency bonus

#### Scenario: No valid token data preserves base ranking

- **WHEN** no rankable frontier model has a finite positive output-token count
- **THEN** the system SHALL rank models by the existing coding and agentic internal score without an efficiency bonus

#### Scenario: Efficiency breaks final score ties

- **WHEN** two rankable frontier models have equal final internal scores after applying the token-efficiency bonus
- **THEN** the system SHALL order the model with higher token efficiency first
