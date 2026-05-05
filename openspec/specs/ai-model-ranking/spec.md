# ai-model-ranking Specification

## Purpose

Fetch and rank reasoning AI models from Artificial Analysis performance data, returning a relative score for each eligible model.

## Requirements

### Requirement: Rank explicit reasoning models with coding and agentic scores

The system SHALL include only models that are explicitly marked as reasoning by Artificial Analysis and have coding and agentic scores when calculating the AI model ranking.

#### Scenario: Reasoning filter applied before scoring

- **WHEN** Artificial Analysis returns models with coding and agentic scores and a mix of `reasoning_model: true` and `reasoning_model: false`
- **THEN** the system SHALL calculate internal scores, sorting, and ranking positions using only the models with `reasoning_model: true`

#### Scenario: Non-reasoning model excluded

- **WHEN** a model has slug, coding, and agentic values but does not have `reasoning_model: true`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Reasoning model without frontier flag included

- **WHEN** a model has `reasoning_model: true`, coding, and agentic values but does not have `frontier_model: true`
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Reasoning model without price included

- **WHEN** a model has `reasoning_model: true`, coding, and agentic values but lacks blended price data
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Stale cached models refreshed once

- **WHEN** cached Artificial Analysis model data contains no model with slug, reasoning flag, coding score, and agentic score
- **THEN** the system SHALL invalidate the cached model data key and fetch fresh model data once before deciding whether ranking can proceed

#### Scenario: Fresh models remain unrankable

- **WHEN** refreshed Artificial Analysis model data still contains no model with slug, reasoning flag, coding score, and agentic score
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Preserve reasoning model flag from source data

The system SHALL normalize Artificial Analysis' `reasoning_model` and `isReasoning` source fields into the AI model data used by ranking logic.

#### Scenario: Reasoning flag parsed from model metadata

- **WHEN** a model metadata object from Artificial Analysis contains `reasoning_model: true`
- **THEN** the normalized model SHALL expose the model as reasoning for ranking eligibility

#### Scenario: Reasoning flag parsed from isReasoning field

- **WHEN** a model metadata object from Artificial Analysis contains `isReasoning: true`
- **THEN** the normalized model SHALL expose the model as reasoning for ranking eligibility

#### Scenario: Missing reasoning flag treated as not reasoning

- **WHEN** a model lacks both `reasoning_model` and `isReasoning` fields
- **THEN** the system SHALL treat the model as not reasoning for ranking eligibility

#### Scenario: Additional variants require explicit reasoning flag

- **WHEN** Artificial Analysis exposes additional model variants with coding and agentic scores but no explicit `reasoning_model: true` or `isReasoning: true` value that can be associated with those variants
- **THEN** the system SHALL NOT infer reasoning status for those variants

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

### Requirement: Exclude models by slug prefix before scoring

The system SHALL apply the slug prefix exclusion filter after the reasoning model filter and before scoring when calculating the AI model ranking.

#### Scenario: Excluded models are filtered before scoring

- **WHEN** Artificial Analysis returns models including Claude models with `reasoning_model: true`
- **AND** the exclusion blocklist contains `"claude"`
- **THEN** the system SHALL exclude Claude models before calculating internal scores
- **AND** the remaining models SHALL be scored and ranked as if Claude models were never present

#### Scenario: Excluded model that would have been top-ranked

- **WHEN** the highest-scoring model has an excluded slug prefix
- **THEN** the system SHALL rank the next non-excluded model at `position: 1` with `score: 100`

### Requirement: Include tokens per second in ranking response

The system SHALL include `tokensPerSecond` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: Tokens per second extracted from medium_coding prompt length

- **WHEN** Artificial Analysis model data contains `performanceByPromptLength` with an entry where `prompt_length_type` is `"medium_coding"`
- **THEN** the system SHALL extract `median_output_speed` from that entry and expose it as `tokensPerSecond` on the ranked model

#### Scenario: Tokens per second is null when performance data missing

- **WHEN** Artificial Analysis model data does not contain `performanceByPromptLength` or lacks a `"medium_coding"` entry
- **THEN** the system SHALL set `tokensPerSecond` to `null` on the ranked model

#### Scenario: Tokens per second does not affect ranking order

- **WHEN** the system calculates ranking positions and scores
- **THEN** the system SHALL NOT use `tokensPerSecond` to determine eligibility, ranking order, or score calculation
- **AND** `tokensPerSecond` SHALL be purely informational in the response

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
