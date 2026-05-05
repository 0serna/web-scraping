## MODIFIED Requirements

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the internal intelligence score of the model at `position: 1`, where the internal intelligence score is calculated from coding and agentic scores only.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded internal intelligence score divided by the unrounded internal intelligence score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal intelligence score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

#### Scenario: Price omitted from ranking order

- **WHEN** multiple reasoning models have coding and agentic scores
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Output tokens omitted from ranking order and scores

- **WHEN** multiple reasoning models have coding and agentic scores
- **THEN** the system SHALL NOT use output token counts to determine eligibility, ranking order, tie-breaks, or score calculation

#### Scenario: Ranking ties are deterministic

- **WHEN** two reasoning models have equal internal intelligence scores
- **THEN** the system SHALL order them by agentic score descending, then coding score descending, then model name ascending

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `position`, `score`, `tokensPerSecond`, and `outputTokensMillions`
- **AND** each ranking item SHALL NOT include `price1m`

## ADDED Requirements

### Requirement: Include output-token millions in ranking response

The system SHALL include `outputTokensMillions` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from intelligence token counts

- **WHEN** Artificial Analysis model data contains `intelligence_index_token_counts.output_tokens` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `outputTokensMillions` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the system SHALL set `outputTokensMillions` to `null` on the ranked model

#### Scenario: Output tokens does not affect ranking order

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL NOT use `outputTokensMillions` to determine eligibility, ranking order, tie-breaks, or score calculation
- **AND** `outputTokensMillions` SHALL be purely informational in the response
