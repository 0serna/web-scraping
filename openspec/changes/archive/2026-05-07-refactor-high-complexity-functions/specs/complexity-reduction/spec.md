## ADDED Requirements

### Requirement: All functions SHALL have cyclomatic complexity below 5

The system SHALL ensure all functions have cyclomatic complexity below the fallow threshold of 5. This applies to all 21 currently flagged functions across the ai/, bvc/, game/, and shared/ domains.

#### Scenario: Function complexity below threshold

- **WHEN** fallow analyzes function complexity
- **THEN** no function SHALL have cyclomatic complexity >= 5

#### Scenario: Check command passes

- **WHEN** `npm run check` is executed
- **THEN** the command SHALL exit with code 0 (green)

### Requirement: All existing tests SHALL continue to pass

The system SHALL preserve all existing behavior during refactoring. All 156 tests must continue passing after each function is refactored.

#### Scenario: Test suite passes after refactoring

- **WHEN** `npm test` is executed after refactoring
- **THEN** all 156 tests SHALL pass

#### Scenario: No behavior changes

- **WHEN** a function is refactored
- **THEN** the function SHALL produce identical outputs for all existing test cases

### Requirement: Refactoring SHALL use helper function extraction

The system SHALL reduce complexity by extracting helper functions, using early returns, and simplifying conditional logic. Function signatures SHALL NOT change.

#### Scenario: Helper functions extracted

- **WHEN** a function has cyclomatic complexity >= 5
- **THEN** the function SHALL be refactored to extract helper functions or use early returns

#### Scenario: Function signatures preserved

- **WHEN** a function is refactored
- **THEN** the function's exported signature SHALL remain unchanged
