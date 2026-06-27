## MODIFIED Requirements

### Requirement: Include output-token millions in ranking response

The system SHALL include `tokens` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from canonical intelligence token counts

- **WHEN** Artificial Analysis model data contains `canonicalIntelligenceIndexTokenCount.output` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `tokens` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `canonicalIntelligenceIndexTokenCount.output` value
- **THEN** the system SHALL set `tokens` to `null` on the ranked model
