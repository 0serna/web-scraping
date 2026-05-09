## ADDED Requirements

### Requirement: Minimal production runtime image

The system SHALL publish a production container image that contains only the runtime components required to start the compiled service and serve requests.

#### Scenario: Production image contents

- **WHEN** the production container image is built
- **THEN** the final runtime stage SHALL exclude development-only tooling and source inputs that are not required to execute the compiled service
- **AND** the final image SHALL include the Node.js runtime, production dependencies, and compiled application artifacts required by the service entrypoint

### Requirement: Production image starts the compiled service directly

The production container SHALL start the compiled server entrypoint directly rather than relying on development tooling.

#### Scenario: Container startup command

- **WHEN** the production container starts
- **THEN** it SHALL launch the compiled application entrypoint using the Node.js runtime

### Requirement: Runtime packaging preserves full domain availability

The production container packaging SHALL preserve the ability to start all configured service domains together as a single valid application instance.

#### Scenario: Healthy startup

- **WHEN** the production container is started with the required runtime configuration
- **THEN** the application SHALL start successfully with all mandatory domains registered
- **AND** the service SHALL NOT enter a partially available mode that excludes one or more domains
