## MODIFIED Requirements

### Requirement: Rank models with coding scores only

The system SHALL include models that have a valid coding score and are not explicitly marked as deprecated when calculating the AI model ranking. Frontier metadata, price metadata, agentic scores, and reasoning status SHALL NOT be ranking-domain inputs.

#### Scenario: All models with valid coding are eligible

- **WHEN** Artificial Analysis returns models with coding scores, regardless of other source metadata
- **THEN** the system SHALL calculate sorting and ranking positions using all models that have valid coding scores and are not deprecated

#### Scenario: Model without coding score excluded

- **WHEN** a model has slug but does not have a valid coding value
- **THEN** the system SHALL exclude that model from the ranking

#### Scenario: Model without output tokens included

- **WHEN** a model has slug and a valid coding value but lacks a finite positive output-token count
- **THEN** the system SHALL include that model in the ranking with `tokens: null`, sorted last among models with equal coding score

#### Scenario: Deprecated model excluded before ranking

- **WHEN** a model has slug, coding score, and `deprecated: true`
- **THEN** the system SHALL exclude that model before sorting and ranking

#### Scenario: Model without deprecated field included

- **WHEN** a model has slug, coding score, and no explicit deprecated value
- **THEN** the system SHALL include that model in the ranking
