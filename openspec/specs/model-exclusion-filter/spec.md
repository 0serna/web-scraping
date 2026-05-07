# model-exclusion-filter Specification

## Purpose

Exclude models from ranking by slug prefix pattern.

## Requirements

### Requirement: Exclude models by slug prefix

The system SHALL exclude models from the ranking when their slug starts with any prefix in the exclusion blocklist.

#### Scenario: Model with excluded slug prefix is not ranked

- **WHEN** a model has a slug that starts with a configured excluded prefix, `reasoningModel: true`, coding, and agentic scores
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model with non-excluded slug prefix is ranked

- **WHEN** a model has a slug that does not start with any configured excluded prefix, `reasoningModel: true`, coding, and agentic scores
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Multiple prefixes in blocklist

- **WHEN** the exclusion blocklist contains multiple prefixes
- **AND** models with slugs matching each configured prefix are present
- **THEN** the system SHALL exclude both models from the ranking

#### Scenario: Empty blocklist excludes nothing

- **WHEN** the exclusion blocklist is empty
- **THEN** the system SHALL include all rankable reasoning models in the ranking
