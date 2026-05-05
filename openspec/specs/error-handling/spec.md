# error-handling Specification

## Purpose

Error model and HTTP status mapping rules that define how typed errors flow from external API failures through domain services to HTTP responses.

## Requirements

### Requirement: Shared base error hierarchy

The system SHALL define shared base error classes (`DomainFetchError`, `DomainParseError`) in the shared layer that carry domain name, message, and HTTP-related metadata.

#### Scenario: Base fetch error

- **WHEN** an external API returns a non-2xx response
- **THEN** the service SHALL throw a domain-specific wrapper around `DomainFetchError` with status code and status text

#### Scenario: Base parse error

- **WHEN** an external API response cannot be parsed
- **THEN** the service SHALL throw a domain-specific wrapper around `DomainParseError`

### Requirement: Domain-specific error wrappers

Each domain SHALL extend the shared base error classes with domain-name-prefixed subclasses that carry the domain context.

#### Scenario: Wrapping a fetch failure

- **WHEN** a service receives a non-2xx response from an external API
- **THEN** it SHALL throw a domain-specific `DomainFetchError` subclass with the failing status code

#### Scenario: Wrapping a parse failure

- **WHEN** a service cannot parse an external API response
- **THEN** it SHALL throw a domain-specific `DomainParseError` subclass

### Requirement: Route-layer HTTP mapping

Routes SHALL map domain errors to HTTP status codes and response shapes. Services SHALL NOT set HTTP status codes directly.

#### Scenario: BVC ticker route error mapping

- **WHEN** the BVC ticker route receives a bad ticker input
- **THEN** it SHALL respond with HTTP 400
- **AND** when both providers return no data, it SHALL respond with HTTP 404
- **AND** when provider errors prevent a result, it SHALL respond with HTTP 502

#### Scenario: Game info route error mapping

- **WHEN** the game info route receives an invalid URL or app ID
- **THEN** it SHALL respond with HTTP 400
- **AND** when game info retrieval fails, it SHALL respond with HTTP 502

#### Scenario: AI ranking route error mapping

- **WHEN** ranking retrieval or parsing fails
- **THEN** the route SHALL respond with HTTP 502

### Requirement: Service-layer error classification

Services SHALL classify external API failures into typed domain errors and parse provider-specific error payloads into structured error information. Services SHALL NOT decide the HTTP status code.

#### Scenario: Provider error handling

- **WHEN** an external API call fails
- **THEN** the service SHALL classify the failure (fetch vs parse) and throw the appropriate domain-specific error type

### Requirement: New provider error wrapping

When a new external provider is added to a domain, errors from that provider SHALL be wrapped in the domain's existing error subclasses rather than throwing raw or untyped errors.

#### Scenario: Adding a new data source

- **WHEN** a new external provider is integrated into a domain
- **THEN** errors from that provider SHALL be wrapped in the domain's typed error subclasses
