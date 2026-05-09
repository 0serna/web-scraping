## MODIFIED Requirements

### Requirement: Parse Artificial Analysis Intelligence Index output token counts

The system SHALL normalize Artificial Analysis `intelligence_index_token_counts.output_tokens` into AI model data when the source value is a finite positive number.

#### Scenario: Output token count parsed from performance data

- **WHEN** an Artificial Analysis model object contains `intelligence_index_token_counts.output_tokens` with a finite positive number
- **THEN** the normalized AI model data SHALL expose that value for ranking response metadata

#### Scenario: Missing output token count remains optional

- **WHEN** an Artificial Analysis model object does not contain a finite positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the normalized AI model data SHALL keep the model otherwise usable without a token value

#### Scenario: Output token count merged by slug

- **WHEN** model metadata and performance data are provided in separate payload chunks for the same slug
- **THEN** the system SHALL merge the output token count from performance data into the normalized model for that slug

## REMOVED Requirements

### Requirement: Configure AI token efficiency adjustment weight

**Reason**: Output-token counts no longer affect AI ranking calculation, so ranking-service constants for efficiency adjustment are no longer part of the required behavior.

**Migration**: Remove the output-efficiency configuration constants and any tests that assert their use.

### Requirement: Apply token efficiency adjustment to AI ranking

**Reason**: Output-token counts are now informational metadata only and must not add bonuses, penalties, or tie-break influence to ranking.

**Migration**: Rank models by normalized coding and agentic scores only, and expose token data only through the public `tokens` metadata field.
