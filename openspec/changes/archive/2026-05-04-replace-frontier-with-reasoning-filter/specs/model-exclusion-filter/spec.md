## MODIFIED Requirements

### Requirement: Exclude models by slug prefix

The system SHALL exclude models from the ranking when their slug starts with any prefix in the exclusion blocklist.

#### Scenario: Model with excluded slug prefix is not ranked

- **WHEN** a model has `slug: "claude-4-sonnet"`, `reasoningModel: true`, coding, and agentic scores
- **AND** the exclusion blocklist contains prefix `"claude"`
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model with non-excluded slug prefix is ranked

- **WHEN** a model has `slug: "gpt-5-5"`, `reasoningModel: true`, coding, and agentic scores
- **AND** the exclusion blocklist contains prefix `"claude"`
- **THEN** the system SHALL include that model in the ranking

#### Scenario: Multiple prefixes in blocklist

- **WHEN** the exclusion blocklist contains `["claude", "gemini"]`
- **AND** models with slugs `claude-4-sonnet` and `gemini-2-pro` are present
- **THEN** the system SHALL exclude both models from the ranking

#### Scenario: Empty blocklist excludes nothing

- **WHEN** the exclusion blocklist is empty
- **THEN** the system SHALL include all rankable reasoning models in the ranking
