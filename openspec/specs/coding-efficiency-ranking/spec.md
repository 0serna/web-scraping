# coding-efficiency-ranking Specification

## Purpose

Rank AI models by coding efficiency using the sixth power of coding index divided by the square root of million-output-tokens, providing fine-grained differentiation at the top of the ranking.

## Requirements

### Requirement: Rank models by coding efficiency

The system SHALL rank eligible models primarily by their coding efficiency, defined as the sixth power of the coding index divided by the square root of million-output-tokens used in the Artificial Analysis Intelligence Index.

#### Scenario: Efficiency score is coding to the sixth power divided by square root of output tokens

- **WHEN** an eligible model has a valid `coding_index` and a finite positive `intelligence_index_token_counts.output_tokens` value
- **THEN** the system SHALL calculate the model's internal score as `coding_index` raised to the sixth power, divided by the square root of `output_tokens` expressed in millions

#### Scenario: Efficiency ranking is relative to the most efficient model

- **WHEN** multiple eligible models have efficiency scores
- **THEN** the system SHALL order models by internal efficiency score descending
- **AND** the system SHALL calculate public relative scores by dividing each model's internal score by the top model's internal score, multiplied by 100 and rounded

#### Scenario: Top model always scores 100

- **WHEN** the system returns a successful efficiency-based ranking
- **THEN** the top-ranked model SHALL have `score` equal to 100

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the top-ranked model's internal efficiency score is less than or equal to zero
- **THEN** the system SHALL fail the ranking instead of returning relative scores

### Requirement: Require output tokens for ranking eligibility

The system SHALL require a finite positive `output_tokens` value for a model to be eligible for ranking.

#### Scenario: Model with valid coding and output tokens is eligible

- **WHEN** a model has a valid `coding_index`, a finite positive `output_tokens` value, and is not deprecated
- **THEN** the system SHALL include that model in ranking calculations

#### Scenario: Model without output tokens is excluded

- **WHEN** a model has a valid `coding_index` but lacks a finite positive `output_tokens` value
- **THEN** the system SHALL exclude that model from ranking calculations

#### Scenario: No models with output tokens causes ranking failure

- **WHEN** no model in the dataset has both a valid `coding_index` and a finite positive `output_tokens` value
- **THEN** the system SHALL fail the ranking with an error

### Requirement: Efficiency tie-breakers are deterministic

The system SHALL use a fixed sequence of tie-breakers to order models with equal internal efficiency scores.

#### Scenario: Coding score breaks efficiency ties

- **WHEN** two models have equal internal efficiency scores
- **THEN** the system SHALL order them by `coding_index` descending

#### Scenario: Output tokens breaks coding ties

- **WHEN** two models have equal internal efficiency scores and equal `coding_index` values
- **THEN** the system SHALL order them by `output_tokens` ascending

#### Scenario: Model name breaks remaining ties

- **WHEN** two models have equal internal efficiency scores, equal `coding_index` values, and equal `output_tokens` values
- **THEN** the system SHALL order them by model name ascending

### Requirement: Exclude blocked slug prefixes before computing efficiency

The system SHALL remove models whose slugs match configured exclusion prefixes before calculating efficiency scores and determining the top efficiency score.

#### Scenario: Excluded models do not define the efficiency baseline

- **WHEN** the excluded model with the highest efficiency score has a slug matching an exclusion prefix
- **THEN** the system SHALL compute the top efficiency score and relative scores from the remaining non-excluded models

### Requirement: Public response includes raw coding score

The system SHALL include the rounded integer coding index in each ranked model entry.

#### Scenario: Response object contains all expected fields

- **WHEN** the system returns a ranked model entry
- **THEN** the entry SHALL contain `model` (string), `score` (number 0-100), `tokens` (integer millions or null), and `coding` (integer)

#### Scenario: Coding is rounded to nearest integer

- **WHEN** a model has a `coding_index` of 48.6076038159372
- **THEN** the response SHALL include `coding` equal to 49
