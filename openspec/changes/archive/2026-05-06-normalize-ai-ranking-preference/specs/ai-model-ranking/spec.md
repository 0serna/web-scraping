## MODIFIED Requirements

### Requirement: Return relative ranking scores

The system SHALL return AI model ranking items with `score` expressed as a percentage relative to the adjusted internal score of the model at `position: 1`, where the adjusted internal score is calculated from normalized coding and agentic preference scores plus any output-efficiency adjustment.

#### Scenario: Top model score is 100

- **WHEN** the system returns a successful AI model ranking
- **THEN** the model at `position: 1` SHALL have `score` equal to 100

#### Scenario: Lower-ranked scores are relative percentages

- **WHEN** the system returns ranked models below `position: 1`
- **THEN** each lower-ranked model's `score` SHALL equal its unrounded adjusted internal score divided by the unrounded adjusted internal score of the first-ranked model, multiplied by 100 and rounded for response output

#### Scenario: Non-positive top internal score is invalid

- **WHEN** the first-ranked model's adjusted internal score is less than or equal to 0
- **THEN** the system SHALL fail the ranking instead of returning relative scores

#### Scenario: Price omitted from ranking order

- **WHEN** multiple reasoning models have coding and agentic scores
- **THEN** the system SHALL NOT use blended price to determine eligibility or ranking order

#### Scenario: Eligible-set normalization defines the weighted preference base score

- **WHEN** multiple eligible reasoning models have coding scores and agentic scores
- **THEN** the system SHALL compute `maxAgentic` and `maxCoding` from that same eligible model set before scoring
- **AND** the system SHALL normalize each model's agentic score as its raw agentic score divided by `maxAgentic`, multiplied by 100
- **AND** the system SHALL normalize each model's coding score as its raw coding score divided by `maxCoding`, multiplied by 100
- **AND** the system SHALL calculate each model's base score from the normalized coding and agentic scores using the configured 70/30 preference weights

#### Scenario: Output tokens affect ranking scores through bounded efficiency adjustment

- **WHEN** multiple reasoning models have coding scores, agentic scores, and valid output-token counts
- **THEN** the system SHALL apply the bounded output-efficiency adjustment to adjusted internal scores before ordering models and calculating public relative scores
- **AND** below-threshold output-token counts SHALL increase adjusted internal scores
- **AND** above-threshold output-token counts SHALL decrease adjusted internal scores

#### Scenario: Ranking ties are deterministic

- **WHEN** two reasoning models have equal adjusted internal scores
- **THEN** the system SHALL order them by normalized agentic score descending, then normalized coding score descending, then lower valid output-token count, then model name ascending
- **AND** models without valid output-token counts SHALL sort after models with valid output-token counts for the output-token tie-break
