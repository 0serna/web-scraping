## ADDED Requirements

### Requirement: Include DeepSWE score in ranking response

The system SHALL include `deepSwe` as an informational field on each ranked model in the AI model ranking response.

#### Scenario: DeepSWE score matched to ranked model

- **WHEN** a ranked model has a strict match in the selected DeepSWE leaderboard data
- **THEN** the system SHALL set `deepSwe` to the matched row's `pass_rate` multiplied by 100 and rounded to the nearest integer
- **AND** the system SHALL NOT use `deepSwe` to determine eligibility, sorting, or rank assignment

#### Scenario: DeepSWE score matched from Artificial Analysis effort suffix

- **WHEN** a ranked model slug ends with an effort suffix present in the selected DeepSWE leaderboard data
- **AND** removing that suffix produces a model name with a matching DeepSWE row for that model and effort
- **THEN** the system SHALL set `deepSwe` to the matched row's `pass_rate` multiplied by 100 and rounded to the nearest integer

#### Scenario: DeepSWE score missing for ranked model

- **WHEN** a ranked model has no strict match in the selected DeepSWE leaderboard data
- **THEN** the system SHALL set `deepSwe` to `null`

#### Scenario: DeepSWE secondary version supplements missing scores

- **WHEN** DeepSWE `v1.1` leaderboard data can be fetched and parsed
- **AND** DeepSWE `v1` leaderboard data includes additional model and effort pairs absent from `v1.1`
- **THEN** the system SHALL use `v1.1` scores first and supplement missing model and effort pairs from `v1`

#### Scenario: DeepSWE primary version unavailable

- **WHEN** DeepSWE `v1.1` leaderboard data cannot be fetched or parsed
- **THEN** the system SHALL attempt to use DeepSWE `v1` leaderboard data for enrichment

#### Scenario: DeepSWE unavailable

- **WHEN** all configured DeepSWE leaderboard sources cannot be fetched or parsed
- **THEN** the system SHALL return the ranking response with `deepSwe` set to `null` for each ranked model

## MODIFIED Requirements

### Requirement: Omit price from ranking response

The system SHALL NOT include model price fields, speed fields, or release-date fields in successful AI model ranking response items.

#### Scenario: Ranking response excludes price, speed, and date

- **WHEN** the system returns a successful AI model ranking
- **THEN** each ranking item SHALL include `rank`, `model`, `coding`, `tokens`, and `deepSwe`
- **AND** each ranking item SHALL NOT include `price1m`, `speed`, `tokensPerSecond`, `date`, or `releaseDate`
