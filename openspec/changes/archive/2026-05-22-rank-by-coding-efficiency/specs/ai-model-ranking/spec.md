## MODIFIED Requirements

### Requirement: Rank models with valid coding scores

The system SHALL include models that have valid coding scores, finite positive output-token counts, and are not explicitly marked as deprecated when calculating the AI model ranking. Agentic scores and reasoning status SHALL NOT affect eligibility.

#### Scenario: All models with valid coding and output tokens are eligible

- **WHEN** Artificial Analysis returns models with coding scores and valid output-token counts, regardless of agentic scores or reasoning status
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using all models that have valid coding scores, valid output-token counts, and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without output tokens excluded

- **WHEN** a model has slug and a valid coding value but lacks a finite positive output-token count
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without frontier flag included

- **WHEN** a model has valid coding and output-token values but does not have `frontier_model: true`
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Model without price included

- **WHEN** a model has valid coding and output-token values but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Deprecated model excluded before scoring

- **WHEN** a model has slug, coding score, valid output-token count, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores, sorting, and relative ranking scores

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, valid output-token count, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Older active model included

- **WHEN** a model has slug, coding score, valid output-token count, `deprecated: false`, and an old or missing release date
- **THEN** the system SHALL keep that model eligible for ranking without applying a release-date recency window

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, coding score, valid output-token count, and active-model eligibility
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, coding score, valid output-token count, and active-model eligibility
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the internal efficiency score of the model at `position: 1`, where the internal efficiency score is `coding_index` divided by `output_tokens` expressed in millions.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its internal efficiency score divided by the internal efficiency score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal efficiency score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

#### Scenario: Price omitted from ranking order

- **WHEN** multiple eligible models have coding and output-token values
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Eligible-set scoring uses coding divided by output tokens

- **WHEN** multiple eligible models have coding scores and output-token counts
- **THEN** the system SHALL compute each model's internal efficiency score as `coding_index / (output_tokens / 1_000_000)`
- **AND** the system SHALL use that efficiency score for ordering and public score calculation

#### Scenario: Ranking ties are deterministic

- **WHEN** two eligible models have equal internal efficiency scores
- **THEN** the system SHALL order them by coding score descending, then output-token count ascending, then model name ascending

### Requirement: Exclude models by slug prefix before scoring

The system SHALL apply the slug prefix exclusion filter before computing efficiency scores and determining the top efficiency score when calculating the AI model ranking.

#### Scenario: Excluded models are filtered before efficiency scoring

- **WHEN** Artificial Analysis returns eligible models whose slugs start with a configured excluded prefix
- **THEN** the system SHALL exclude those models before calculating internal efficiency scores
- **AND** the remaining models SHALL be scored and ranked as if the excluded models were never present

#### Scenario: Excluded model that would have been top-ranked

- **WHEN** the model with the highest internal efficiency score has an excluded slug prefix
- **THEN** the system SHALL rank the next non-excluded model at `position: 1` with `score: 100`

### Requirement: Include output-token millions in ranking response

The system SHALL include `tokens` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from intelligence token counts

- **WHEN** Artificial Analysis model data contains `intelligence_index_token_counts.output_tokens` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `tokens` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the system SHALL set `tokens` to `null` on the ranked model

#### Scenario: Output tokens determine ranking through efficiency score and tie-breaks

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL use output-token counts as the denominator in the internal efficiency score and as a secondary tie-breaker
