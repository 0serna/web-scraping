## MODIFIED Requirements

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the internal score of the model at `position: 1`, where the internal score is calculated from normalized coding and agentic preference scores only.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded internal score divided by the unrounded internal score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

#### Scenario: Price omitted from ranking order

- **WHEN** multiple reasoning models have coding and agentic scores
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Eligible-set normalization defines the weighted preference base score

- **WHEN** multiple eligible reasoning models have coding scores and agentic scores
- **THEN** the system SHALL compute `maxAgentic` and `maxCoding` from that same eligible model set before scoring
- **AND** the system SHALL normalize each model's agentic score as its raw agentic score divided by `maxAgentic`, multiplied by 100
- **AND** the system SHALL normalize each model's coding score as its raw coding score divided by `maxCoding`, multiplied by 100
- **AND** the system SHALL calculate each model's internal score from the normalized coding and agentic scores using the configured 70/30 preference weights

#### Scenario: Output tokens do not affect ranking scores

- **WHEN** multiple reasoning models have coding scores, agentic scores, and valid output-token counts
- **THEN** the system SHALL NOT use output-token counts when calculating internal scores or public relative scores

#### Scenario: Ranking ties are deterministic without token metadata

- **WHEN** two reasoning models have equal internal scores
- **THEN** the system SHALL order them by normalized agentic score descending, then normalized coding score descending, then model name ascending

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `score`, and `tokens`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, `releaseDate`, or `output`

### Requirement: Include output-token millions in ranking response

The system SHALL include `tokens` as an informational field on each ranked model in the AI model ranking response, using rounded millions derived from the source output-token count.

#### Scenario: Tokens extracted from intelligence token counts

- **WHEN** Artificial Analysis model data contains `intelligence_index_token_counts.output_tokens` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `tokens` on the ranked model

#### Scenario: Tokens is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the system SHALL set `tokens` to `null` on the ranked model

#### Scenario: Tokens does not affect ranking

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL use output-token counts only to populate the informational `tokens` response field
