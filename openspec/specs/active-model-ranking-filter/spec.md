# active-model-ranking-filter Specification

## Purpose

Use Artificial Analysis lifecycle metadata to keep deprecated models out of AI ranking calculations while preserving the public ranking response shape.

## Requirements

### Requirement: Preserve deprecation status from Artificial Analysis data

The system SHALL normalize Artificial Analysis' `deprecated` source field into AI model data used by ranking logic when the field is present.

#### Scenario: Deprecated true is preserved

- **WHEN** a raw Artificial Analysis model object contains `deprecated: true`
- **THEN** the normalized model SHALL expose `deprecated: true`

#### Scenario: Deprecated false is preserved

- **WHEN** a raw Artificial Analysis model object contains `deprecated: false`
- **THEN** the normalized model SHALL expose `deprecated: false`

#### Scenario: Missing deprecated remains unknown

- **WHEN** a raw Artificial Analysis model object lacks the `deprecated` field
- **THEN** the normalized model SHALL expose no explicit deprecated value for active-model eligibility

### Requirement: Exclude explicitly deprecated models from ranking

The system SHALL exclude models from the AI model ranking when their normalized deprecation status is explicitly `true`.

#### Scenario: Explicitly deprecated model is excluded

- **WHEN** a model has slug, reasoning status, coding score, agentic score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores and relative ranking scores

#### Scenario: Explicitly non-deprecated model remains eligible

- **WHEN** a model has slug, reasoning status, coding score, agentic score, and `deprecated: false`
- **THEN** the system SHALL keep that model eligible for existing ranking filters

#### Scenario: Missing deprecated value remains eligible

- **WHEN** a model has slug, reasoning status, coding score, agentic score, and no explicit deprecated value
- **THEN** the system SHALL keep that model eligible for existing ranking filters

#### Scenario: Deprecated top model does not define relative scores

- **WHEN** the highest-scoring otherwise rankable model has `deprecated: true`
- **THEN** the system SHALL exclude that model before selecting the top internal score
- **AND** the highest-scoring non-deprecated eligible model SHALL receive `score: 100`

#### Scenario: No eligible active models remains an error

- **WHEN** all otherwise rankable models have `deprecated: true`
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking

### Requirement: Keep deprecation metadata internal to ranking

The system SHALL NOT include deprecation metadata in successful AI model ranking response items.

#### Scenario: Ranking response excludes deprecated field

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL keep the existing public response shape
- **AND** each ranking item SHALL NOT include `deprecated` or `deprecated_to`
