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

The project SHALL provide a `check` command that validates linting, OpenSpec specifications when present, and TypeScript correctness without writing changes to files.

#### Scenario: Running project check

- **WHEN** `npm run check` is executed
- **THEN** the command validates ESLint linting, OpenSpec specifications, and TypeScript compilation without applying automatic fixes

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

### Requirement: Tests remain in quality scope

The project SHALL keep test files within linting and type-checking quality analysis scope.

#### Scenario: Test files contain quality issues

- **WHEN** ESLint and TypeScript check `.test.ts` files
- **THEN** lint and type errors in tests are reported as quality issues rather than excluded by default

### Requirement: Pre-commit runs full check before staged fixes

The project SHALL run the check script followed by lint-staged in the Husky pre-commit hook.

#### Scenario: Committing staged changes

- **WHEN** a commit is attempted
- **THEN** the pre-commit hook runs `npm run check` and then runs lint-staged if check succeeds
