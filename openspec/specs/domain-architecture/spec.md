# domain-architecture Specification

## Purpose

Architectural rules for domain composition, layer separation, and dependency wiring in the Fastify-based web scraping server.

## Requirements

### Requirement: Domain-driven plugin composition

The system SHALL compose independent business domains as Fastify plugins registered in the application entry point. Domains are self-contained units with their own routes, services, and types.

#### Scenario: Application startup

- **WHEN** the application starts
- **THEN** each domain is registered as a Fastify plugin
- **AND** shared middleware (auth, logging) is applied at the application level

### Requirement: Domain isolation

Domains SHALL NOT import or call each other directly. Cross-domain integration SHALL occur only through HTTP routes or shared utilities in the `src/shared/` layer.

#### Scenario: Cross-domain access

- **WHEN** a domain needs functionality from another domain
- **THEN** it SHALL go through an HTTP route rather than a direct import

### Requirement: Layered separation per domain

Each domain SHALL organize code into three layers: routes (input validation, HTTP response mapping), services (external API calls, parsing, orchestration), and types (domain-specific types and errors).

#### Scenario: Route layer

- **WHEN** an HTTP request arrives at a route
- **THEN** the route SHALL validate input, map errors to HTTP status codes, and format the response
- **AND** the route SHALL delegate processing to services

#### Scenario: Service layer

- **WHEN** a service is called
- **THEN** it SHALL handle external API interactions, data parsing, and domain logic
- **AND** it SHALL surface failures through typed domain errors

### Requirement: Typed dependency wiring

Domain plugins SHALL instantiate services at registration time and pass them to routes via typed plugin options, providing type-safe access to dependencies without global singletons.

#### Scenario: Plugin registration

- **WHEN** a domain plugin initializes
- **THEN** it SHALL create domain services with required dependencies (logger, cache)
- **AND** it SHALL register routes that receive services through typed options

### Requirement: Shared utilities reused across domains

Cross-cutting concerns (configuration, cache factory, base error types, auth) SHALL live in `src/shared/` and be reused by domains rather than duplicated.

#### Scenario: Adding cache to a new service

- **WHEN** a new service needs caching
- **THEN** it SHALL use `createCache` from the shared layer instead of creating its own cache implementation

### Requirement: Domain child loggers

Each domain SHALL create child loggers from the Fastify instance logger to scope log messages to the domain context.

#### Scenario: Log output

- **WHEN** a domain produces log output
- **THEN** the log entries are scoped with a domain-specific prefix
