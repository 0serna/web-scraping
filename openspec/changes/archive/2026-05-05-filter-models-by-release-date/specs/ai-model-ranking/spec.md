## MODIFIED Requirements

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `model`, `position`, `score`, `tokensPerSecond`, `outputTokensMillions`, and `releaseDate`
- **AND** each ranking item SHALL NOT include `price1m`
