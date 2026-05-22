## MODIFIED Requirements

### Requirement: Rank models with coding and agentic scores

The system SHALL include models that have valid coding scores and are not explicitly marked as deprecated when calculating the AI model ranking. Agentic scores and reasoning status SHALL NOT affect eligibility.

#### Scenario: All models with valid coding scores are eligible

- **WHEN** Artificial Analysis returns models with coding scores, regardless of agentic scores or reasoning status
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using all models that have valid coding scores and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without frontier flag included

- **WHEN** a model has a valid coding value but does not have `frontier_model: true`
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Model without price included

- **WHEN** a model has a valid coding value but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Deprecated model excluded before scoring

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores, sorting, and relative ranking scores

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Older active model included

- **WHEN** a model has slug, coding score, `deprecated: false`, and an old or missing release date
- **THEN** the system SHALL keep that model eligible for ranking without applying a release-date recency window

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, coding score, and active-model eligibility
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, coding score, and active-model eligibility
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the adjusted internal score of the model at `position: 1`, where the adjusted internal score is calculated from the normalized coding score plus any output-efficiency adjustment.

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

- **WHEN** multiple eligible models have coding scores
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Eligible-set normalization defines the base score

- **WHEN** multiple eligible models have coding scores
- **THEN** the system SHALL compute `maxCoding` from that same eligible model set before scoring
- **AND** the system SHALL normalize each model's coding score as its raw coding score divided by `maxCoding`, multiplied by 100
- **AND** the system SHALL use that normalized coding score as the model's base score

#### Scenario: Output tokens affect ranking scores through bounded efficiency adjustment

- **WHEN** multiple eligible models have coding scores and valid output-token counts
- **THEN** the system SHALL apply the bounded output-efficiency adjustment to adjusted internal scores before ordering models and calculating public relative scores
- **AND** below-threshold output-token counts SHALL increase adjusted internal scores
- **AND** above-threshold output-token counts SHALL decrease adjusted internal scores

#### Scenario: Ranking ties are deterministic

- **WHEN** two eligible models have equal adjusted internal scores
- **THEN** the system SHALL order them by normalized coding score descending, then lower valid output-token count, then model name ascending
- **AND** models without valid output-token counts SHALL sort after models with valid output-token counts for the output-token tie-break

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `score`, and `tokens`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`

### Requirement: Exclude models by slug prefix before scoring

The system SHALL apply the slug prefix exclusion filter before scoring when calculating the AI model ranking.

#### Scenario: Excluded models are filtered before scoring

- **WHEN** Artificial Analysis returns eligible models whose slugs start with a configured excluded prefix
- **THEN** the system SHALL exclude those models before calculating internal scores
- **AND** the remaining models SHALL be scored and ranked as if the excluded models were never present

#### Scenario: Excluded model that would have been top-ranked

- **WHEN** the highest-scoring model has an excluded slug prefix
- **THEN** the system SHALL rank the next non-excluded model at `position: 1` with `score: 100`

### Requirement: Include output-token millions in ranking response

The system SHALL include `tokens` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from intelligence token counts

- **WHEN** Artificial Analysis model data contains `intelligence_index_token_counts.output_tokens` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `tokens` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the system SHALL set `tokens` to `null` on the ranked model

#### Scenario: Output tokens affect ranking only through bounded efficiency adjustment and tie-breaks

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL use output-token counts only for bounded output-efficiency adjustment calculation and deterministic output-token tie-breaks

## REMOVED Requirements

### Requirement: Preserve reasoning model flag from source data

**Reason**: Reasoning status no longer affects ranking eligibility or scoring. The `reasoningModel`, `reasoning_model`, and `isReasoning` fields are removed from the internal data model.
**Migration**: No migration needed. All models with valid coding scores are now eligible regardless of reasoning status.
