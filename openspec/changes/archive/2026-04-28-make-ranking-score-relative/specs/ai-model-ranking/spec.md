## ADDED Requirements

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
