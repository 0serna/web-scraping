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

The project SHALL provide a `check` command that validates formatting, linting, Fallow analysis, OpenSpec specifications when present, and TypeScript correctness without writing changes to files.

#### Scenario: Running project check

- **WHEN** `npm run check` is executed
- **THEN** the command validates Prettier formatting, ESLint linting, Fallow issues, OpenSpec specifications, and TypeScript compilation without applying automatic fixes

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

### Requirement: Fallow analysis remains active

The project SHALL run Fallow as part of the check workflow with issue failures enabled.

#### Scenario: Fallow detects quality issues

- **WHEN** Fallow reports dead code, duplication, or health issues during `npm run check`
- **THEN** the check command fails instead of ignoring those findings

### Requirement: Fallow configuration models real project usage

The project SHALL configure Fallow only to represent real entry points, dependency-injected APIs, framework-driven APIs, or contract-based usage that static analysis cannot infer reliably.

#### Scenario: Contract-based code is analyzed

- **WHEN** a class member or export is used by runtime routes, tests, or a shared interface contract
- **THEN** Fallow configuration can mark that usage model explicitly without disabling unrelated findings

### Requirement: Tests remain in quality scope

The project SHALL keep test files within Fallow quality analysis scope for duplication and health findings.

#### Scenario: Test files contain duplicated code

- **WHEN** Fallow analyzes `.test.ts` files
- **THEN** duplication and health findings in tests are reported as quality issues rather than excluded by default

### Requirement: Pre-commit runs full check before staged fixes

The project SHALL run the check script followed by lint-staged in the Husky pre-commit hook.

#### Scenario: Committing staged changes

- **WHEN** a commit is attempted
- **THEN** the pre-commit hook runs `npm run check` and then runs lint-staged if check succeeds
