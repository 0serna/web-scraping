# code-quality-tooling Specification

## Purpose

TBD - created by archiving change migrate-biome-to-prettier-eslint. Update Purpose after archive.

## Requirements

### Requirement: Formatting uses Prettier defaults

The project SHALL use Prettier as the formatter with default formatting behavior unless a future change explicitly defines project-specific formatting options.

#### Scenario: Formatting staged or project files

- **WHEN** formatting is run for supported project files
- **THEN** files are formatted by Prettier rather than Biome

### Requirement: Linting uses ESLint recommended rules

The project SHALL use ESLint flat config with recommended JavaScript and TypeScript lint rules for source and test files.

#### Scenario: Linting TypeScript files

- **WHEN** linting is run against the project
- **THEN** ESLint validates TypeScript files using recommended JavaScript and TypeScript rule sets

### Requirement: ESLint recognizes project runtime globals

The ESLint configuration SHALL recognize Node.js globals for source files and Vitest globals for test files.

#### Scenario: Linting existing tests

- **WHEN** ESLint checks test files that use Vitest globals
- **THEN** globals such as `describe`, `it`, `expect`, and `vi` are not reported as undefined solely because they are provided by Vitest

### Requirement: Check command validates without modifying files

The project SHALL provide a `check` command that validates formatting, linting, and TypeScript correctness without writing changes to files.

#### Scenario: Running project check

- **WHEN** `npm run check` is executed
- **THEN** the command validates Prettier formatting, ESLint linting, and TypeScript compilation without applying automatic fixes

### Requirement: Pre-commit applies automatic quality fixes

The project SHALL run pre-commit automation that applies automatic Prettier and ESLint fixes to staged supported files before completing the commit.

#### Scenario: Committing staged TypeScript changes

- **WHEN** a commit is attempted with staged TypeScript files
- **THEN** pre-commit automation applies Prettier formatting and ESLint automatic fixes to those staged files before running remaining validation

### Requirement: Biome is removed from active project tooling

The project SHALL not use Biome configuration, package dependencies, or scripts as part of active formatting, linting, check, or pre-commit workflows.

#### Scenario: Inspecting project quality tooling

- **WHEN** project quality scripts and pre-commit configuration are inspected
- **THEN** they invoke Prettier and ESLint rather than Biome
