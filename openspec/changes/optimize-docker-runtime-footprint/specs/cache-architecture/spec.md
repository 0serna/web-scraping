## MODIFIED Requirements

### Requirement: Lazy Upstash client initialization

The Upstash Redis client SHALL be initialized once per process and reused across cache operations, while cache-enabled deployments MUST validate required Upstash configuration during application startup before the server begins accepting traffic.

#### Scenario: Startup with cache enabled and valid configuration

- **WHEN** cache configuration is enabled and the required Upstash credentials are present at startup
- **THEN** the application SHALL complete startup successfully
- **AND** the Upstash client SHALL remain reusable across subsequent cache operations

#### Scenario: Startup with cache enabled and missing configuration

- **WHEN** cache configuration is enabled and one or more required Upstash credentials are missing at startup
- **THEN** the application SHALL fail startup before accepting traffic

#### Scenario: First cache access after successful startup

- **WHEN** the first cache operation is requested after a successful startup
- **THEN** the Upstash Redis client is initialized and reused for all subsequent operations
