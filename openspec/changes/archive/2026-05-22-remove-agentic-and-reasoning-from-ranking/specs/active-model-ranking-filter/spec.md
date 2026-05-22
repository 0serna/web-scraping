## MODIFIED Requirements

### Requirement: Exclude explicitly deprecated models from ranking

The system SHALL exclude models from the AI model ranking when their normalized deprecation status is explicitly `true`.

#### Scenario: Explicitly deprecated model is excluded

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before calculating internal scores and relative ranking scores

#### Scenario: Explicitly non-deprecated model remains eligible

- **WHEN** a model has slug, coding score, and `deprecated: false`
- **THEN** the system SHALL keep that model eligible for existing ranking filters

#### Scenario: Missing deprecated value remains eligible

- **WHEN** a model has slug, coding score, and no explicit deprecated value
- **THEN** the system SHALL keep that model eligible for existing ranking filters

#### Scenario: Deprecated top model does not define relative scores

- **WHEN** the highest-scoring otherwise rankable model has `deprecated: true`
- **THEN** the system SHALL exclude that model before selecting the top internal score
- **AND** the highest-scoring non-deprecated eligible model SHALL receive `score: 100`

#### Scenario: No eligible active models remains an error

- **WHEN** all otherwise rankable models have `deprecated: true`
- **THEN** the system SHALL fail the ranking instead of returning an empty ranking
