## MODIFIED Requirements

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the adjusted internal score of the model at `position: 1`, where the adjusted internal score is calculated from coding and agentic scores plus any output-efficiency bonus.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded adjusted internal score divided by the unrounded adjusted internal score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's adjusted internal score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

#### Scenario: Price omitted from ranking order

- **WHEN** multiple reasoning models have coding and agentic scores
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Output tokens affect ranking scores through bounded efficiency bonus

- **WHEN** multiple reasoning models have coding scores, agentic scores, and valid output-token counts below the configured output-efficiency threshold
- **THEN** the system SHALL apply the bounded output-efficiency bonus to adjusted internal scores before ordering models and calculating public relative scores

#### Scenario: Ranking ties are deterministic

- **WHEN** two reasoning models have equal adjusted internal scores
- **THEN** the system SHALL order them by agentic score descending, then coding score descending, then lower valid output-token count, then model name ascending
- **AND** models without valid output-token counts SHALL sort after models with valid output-token counts for the output-token tie-break

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `score`, and `output`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`

### Requirement: Include output-token millions in ranking response

The system SHALL include `outputTokensMillions` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from intelligence token counts

- **WHEN** Artificial Analysis model data contains `intelligence_index_token_counts.output_tokens` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `outputTokensMillions` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the system SHALL set `outputTokensMillions` to `null` on the ranked model

#### Scenario: Output tokens affect ranking only through bounded efficiency bonus and tie-breaks

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL use output-token counts only for bounded output-efficiency bonus calculation and deterministic output-token tie-breaks

## REMOVED Requirements

### Requirement: Include tokens per second in ranking response

**Reason**: Speed is no longer part of the desired AI model ranking domain or ranking response.

**Migration**: Consumers of `/ranking` SHALL stop reading `speed` or `tokensPerSecond`; ranking response items continue to include `model`, `score`, and `output`.
