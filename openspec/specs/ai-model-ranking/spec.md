# ai-model-ranking Specification

## Purpose

Fetch and rank AI models from Artificial Analysis performance data, returning an ordinal rank for each eligible model ordered by coding score.

## Requirements

### Requirement: Normalize current Artificial Analysis payload

The system SHALL normalize Artificial Analysis model data from the current camelCase payload fields used by the ranking domain.

#### Scenario: Current model name and coding fields normalized

- **WHEN** a raw Artificial Analysis model object contains `slug`, `shortName`, and a finite `codingIndex`
- **THEN** the normalized model SHALL expose the trimmed slug, `shortName` as the public model name, and `codingIndex` as the coding score

#### Scenario: Current token count field normalized

- **WHEN** a raw Artificial Analysis model object contains `canonicalIntelligenceIndexTokenCount.output` with a positive finite number
- **THEN** the normalized model SHALL expose that value as the intelligence index output-token count

#### Scenario: Missing current coding signal fails with diagnostic parse error

- **WHEN** extracted Artificial Analysis payload data contains no `codingIndex` entries
- **THEN** the system SHALL fail parsing with an `AiParseError` that identifies the missing current ranking signal

### Requirement: Rank models with valid coding scores

The system SHALL include models that have valid coding scores and are not explicitly marked as deprecated when calculating the AI model ranking. Agentic scores, reasoning status, frontier metadata, and price metadata SHALL NOT be ranking-domain inputs.

#### Scenario: All models with valid coding are eligible

- **WHEN** Artificial Analysis returns models with coding scores, regardless of agentic scores, reasoning status, or token counts
- **THEN** the system SHALL calculate sorting and ranking positions using all models that have valid coding scores and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without output tokens included

- **WHEN** a model has slug and a valid coding value but lacks a finite positive output-token count
- **THEN** the system SHALL include that model in the ranking, placing it after models with equal coding score and valid token counts

#### Scenario: Model without frontier flag included

- **WHEN** a model has valid coding but does not have `frontier_model: true`
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Model without price included

- **WHEN** a model has valid coding but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Deprecated model excluded before ranking

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before sorting and ranking

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

### Requirement: Rank primarily by rounded coding score

The system SHALL round each eligible model's coding score to the nearest integer and use that value as the primary sort criterion in descending order.

#### Scenario: Coding score rounded before comparison

- **WHEN** two models have raw coding scores of 59.11 and 58.53 respectively
- **THEN** the system SHALL round both to 59 and treat them as equal in the primary sort

#### Scenario: Eligible-set scoring uses rounded coding

- **WHEN** multiple eligible models have coding scores
- **THEN** the system SHALL round each coding score with `Math.round`
- **AND** the system SHALL use that rounded coding score for ordering and ranking position assignment

### Requirement: Tie-breakers are deterministic

The system SHALL use output-token count ascending and model name ascending as secondary and tertiary sort criteria when rounded coding scores are equal.

#### Scenario: Output tokens break coding ties

- **WHEN** two eligible models have equal rounded coding scores
- **THEN** the system SHALL order them by output-token count ascending with null values sorted last

#### Scenario: Model name breaks remaining ties

- **WHEN** two eligible models have equal rounded coding scores and equal output-token counts
- **THEN** the system SHALL order them by model name ascending

### Requirement: Return ordinal ranking positions

The system SHALL return AI model ranking items with `rank` as a 1-based ordinal position determined by the sort order.

#### Scenario: First model has rank 1

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model ordered first SHALL have `rank` equal to 1

#### Scenario: Subsequent models have consecutive ranks

- **WHEN** the system returns ranked models after position 1
- **THEN** each subsequent model SHALL have `rank` equal to the previous model's rank plus 1

#### Scenario: Price omitted from ranking order

- **WHEN** multiple eligible models have coding values
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

### Requirement: Cap ranking at fixed maximum size

The system SHALL limit the ranking output to a configurable maximum number of models.

#### Scenario: Ranking exceeds maximum size

- **WHEN** more eligible models exist than `MAX_RANKING_SIZE`
- **THEN** the system SHALL return at most `MAX_RANKING_SIZE` models

#### Scenario: Ranking within maximum size

- **WHEN** eligible models are fewer than or equal to `MAX_RANKING_SIZE`
- **THEN** the system SHALL return all eligible models

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `rank`, `model`, `coding`, `tokens`, and `deepSwe`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`

### Requirement: Exclude models by slug prefix before sorting

The system SHALL apply the slug prefix exclusion filter before sorting when calculating the AI model ranking.

#### Scenario: Excluded models are filtered before sorting

- **WHEN** Artificial Analysis returns eligible models whose slugs start with a configured excluded prefix
- **THEN** the system SHALL exclude those models before sorting
- **AND** the remaining models SHALL be sorted and ranked as if the excluded models were never present

#### Scenario: Excluded model that would have been top-ranked

- **WHEN** the model that would be ordered first has an excluded slug prefix
- **THEN** the system SHALL rank the next non-excluded model at position 1 with rank 1

### Requirement: Include output-token millions in ranking response

The system SHALL include `tokens` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Output-token millions extracted from canonical intelligence token counts

- **WHEN** Artificial Analysis model data contains `canonicalIntelligenceIndexTokenCount.output` with a valid positive number
- **THEN** the system SHALL expose that value divided by 1,000,000 and rounded to the nearest integer as `tokens` on the ranked model

#### Scenario: Output-token millions is null when token count data missing

- **WHEN** Artificial Analysis model data does not contain a valid positive `canonicalIntelligenceIndexTokenCount.output` value
- **THEN** the system SHALL set `tokens` to `null` on the ranked model

### Requirement: Include DeepSWE score in ranking response

The system SHALL include `deepSwe` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: DeepSWE score matched to ranked model

- **WHEN** a ranked model has a strict match in the selected DeepSWE leaderboard data
- **THEN** the system SHALL set `deepSwe` to the matched row's `pass_rate` multiplied by 100 and rounded to the nearest integer
- **AND** the system SHALL NOT use `deepSwe` to determine eligibility, sorting, or rank assignment

#### Scenario: DeepSWE score matched from Artificial Analysis effort suffix

- **WHEN** a ranked model slug ends with an effort suffix present in the selected DeepSWE leaderboard data
- **AND** removing that suffix produces a model name with a matching DeepSWE row for that model and effort
- **THEN** the system SHALL set `deepSwe` to the matched row's `pass_rate` multiplied by 100 and rounded to the nearest integer

#### Scenario: DeepSWE score missing for ranked model

- **WHEN** a ranked model has no strict match in the selected DeepSWE leaderboard data
- **THEN** the system SHALL set `deepSwe` to `null`

#### Scenario: DeepSWE secondary version supplements missing scores

- **WHEN** DeepSWE `v1.1` leaderboard data can be fetched and parsed
- **AND** DeepSWE `v1` leaderboard data includes additional model and effort pairs absent from `v1.1`
- **THEN** the system SHALL use `v1.1` scores first and supplement missing model and effort pairs from `v1`

#### Scenario: DeepSWE primary version unavailable

- **WHEN** DeepSWE `v1.1` leaderboard data cannot be fetched or parsed
- **THEN** the system SHALL attempt to use DeepSWE `v1` leaderboard data for enrichment

#### Scenario: DeepSWE unavailable

- **WHEN** all configured DeepSWE leaderboard sources cannot be fetched or parsed
- **THEN** the system SHALL return the ranking response with `deepSwe` set to `null` for each ranked model
