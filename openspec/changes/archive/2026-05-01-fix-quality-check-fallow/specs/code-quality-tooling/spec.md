## MODIFIED Requirements

### Requirement: Check command validates without modifying files

The project SHALL provide a `check` command that validates formatting, linting, Fallow analysis, OpenSpec specifications when present, and TypeScript correctness without writing changes to files.

#### Scenario: Running project check

- **WHEN** `npm run check` is executed
- **THEN** the command validates Prettier formatting, ESLint linting, Fallow issues, OpenSpec specifications, and TypeScript compilation without applying automatic fixes

## ADDED Requirements

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
