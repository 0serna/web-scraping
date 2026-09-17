# ProtonDB Compatibility Specification

## Purpose

Provide optional ProtonDB compatibility summaries for Steam games while keeping the existing game information endpoint available when community data is absent or unreachable.

## Requirements

### Requirement: Expose a ProtonDB compatibility summary
When ProtonDB has a valid summary for the requested Steam application ID, the system SHALL include a `protonDb` object in the game information response containing `tier`, `score`, `confidence`, and `reports` values derived from ProtonDB's `tier`, `score`, `confidence`, and `total` fields.

#### Scenario: ProtonDB summary is available
- **WHEN** a client requests information for a valid Steam game and ProtonDB returns a valid summary
- **THEN** the successful game information response includes the mapped `protonDb` object alongside the existing Steam fields

### Requirement: Keep ProtonDB compatibility optional
The system SHALL return the existing Steam game information without a `protonDb` field when ProtonDB has no report, returns an invalid summary, or cannot be reached.

#### Scenario: ProtonDB has no report
- **WHEN** ProtonDB reports that no summary exists for the Steam application ID
- **THEN** the system returns the successful Steam game information without a `protonDb` field

#### Scenario: ProtonDB request fails
- **WHEN** ProtonDB times out or returns an unsuccessful response other than a missing report
- **THEN** the system returns the successful Steam game information without a `protonDb` field

#### Scenario: ProtonDB returns invalid data
- **WHEN** ProtonDB returns a summary that does not contain valid required compatibility values
- **THEN** the system returns the successful Steam game information without a `protonDb` field

### Requirement: Cache ProtonDB summaries independently
The system SHALL cache valid ProtonDB summaries independently from Steam game data so that ProtonDB data can use its own freshness period and failures do not invalidate cached Steam data.

#### Scenario: Valid summary is cached
- **WHEN** a valid cached ProtonDB summary exists for the Steam application ID
- **THEN** the system uses it without requesting the summary from ProtonDB again
