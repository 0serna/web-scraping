# ai-model-ranking Specification

## Purpose

TBD - created by archiving change fix-ai-ranking-scraping. Update Purpose after archive.

## Requirements

### Requirement: Parse models from multiple flight chunks

The system SHALL extract model data from multiple Next.js flight payload chunks and merge them using `slug` as the join key.

#### Scenario: Models distributed across chunks

- **WHEN** the HTML contains model metadata in chunk 31 (slug, name, isReasoning) and performance data in chunk 14 (slug, coding_index, agentic_index, price_1m_blended_3_to_1)
- **THEN** the system SHALL merge data by matching slug and return complete ArtificialAnalysisModel objects

#### Scenario: Field name variations

- **WHEN** the source data uses `isReasoning` or `reasoning_model` for the reasoning flag
- **THEN** the system SHALL normalize both to the `reasoningModel` boolean field

#### Scenario: Missing performance data

- **WHEN** a model from metadata chunk lacks corresponding performance data
- **THEN** the system SHALL set coding, agentic, and price fields to null

### Requirement: Handle new data structure

The system SHALL support both old and new field names from artificialanalysis.ai.

#### Scenario: New field names

- **WHEN** the source uses `name` instead of `model_name`
- **THEN** the system SHALL map it to the `model` field in the output

#### Scenario: New reasoning field

- **WHEN** the source uses `isReasoning` instead of `reasoning_model`
- **THEN** the system SHALL recognize it as equivalent

### Requirement: Rank only frontier reasoning models

The system SHALL include only models that are explicitly marked as frontier by Artificial Analysis when calculating the AI model ranking.

#### Scenario: Frontier filter applied before scoring

- **WHEN** Artificial Analysis returns reasoning models with required scoring fields and a mix of `frontier_model: true` and `frontier_model: false`
- **THEN** the system SHALL calculate efficiency percentiles, final scores, sorting, and ranking positions using only the models with `frontier_model: true`

#### Scenario: Non-frontier reasoning model excluded

- **WHEN** a reasoning model has slug, coding, agentic, and positive blended price but does not have `frontier_model: true`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Frontier non-reasoning model excluded

- **WHEN** a model has `frontier_model: true` but is not a reasoning model
- **THEN** the system SHALL exclude that model from the ranking

### Requirement: Preserve frontier model flag from source data

The system SHALL normalize Artificial Analysis' `frontier_model` source field into the AI model data used by ranking logic.

#### Scenario: Frontier flag parsed from performance data

- **WHEN** a performance data object from Artificial Analysis contains `frontier_model: true`
- **THEN** the normalized model SHALL expose the model as frontier for ranking eligibility

#### Scenario: Missing frontier flag treated as not frontier

- **WHEN** a model lacks the Artificial Analysis `frontier_model` field
- **THEN** the system SHALL treat the model as not frontier for ranking eligibility

#### Scenario: Frontier flag merged by slug

- **WHEN** model metadata and performance data are provided in separate payload chunks for the same slug
- **THEN** the system SHALL merge the frontier flag from performance data into the normalized model for that slug

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the internal score of the model at `position: 1`.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded internal score divided by the unrounded internal score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's internal score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `position`, and `score`
- **AND** each ranking item SHALL NOT include `price1m`
