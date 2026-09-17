# Spec Delta

## MODIFIED Requirements

### Requirement: Expose a ProtonDB compatibility summary
When ProtonDB has a valid summary for the requested Steam application ID, the system SHALL include a `protonDb` object in the game information response containing `tier`, `score`, `confidence`, and `reports` values derived from ProtonDB's `tier`, `score`, `confidence`, and `total` fields. When Steam identifies a valid base-game application ID for the requested product, the system SHALL use that base-game ID to resolve the ProtonDB summary while preserving the requested product's other game information.

#### Scenario: ProtonDB summary is available
- **WHEN** a client requests information for a valid Steam game and ProtonDB returns a valid summary
- **THEN** the successful game information response includes the mapped `protonDb` object alongside the existing Steam fields

#### Scenario: Product has a base game
- **WHEN** a client requests information for a Steam product whose details identify a base-game application ID
- **THEN** the system resolves the ProtonDB summary using that base-game ID and returns the requested product's name, release year, and review score unchanged
