## Why

The `npm run check` command fails because `fallow --production-health` reports 21 functions with cyclomatic complexity >= 5 (CRAP score >= 30). This blocks CI/CD and indicates code that is harder to maintain and test.

## What Changes

- Refactor 21 functions across 4 domains to reduce cyclomatic complexity below 5
- Extract helper functions, use early returns, and simplify conditional logic
- Preserve all existing behavior (156 tests must continue passing)

## Capabilities

### New Capabilities

- `complexity-reduction`: Systematic refactoring of high-complexity functions to meet fallow thresholds

### Modified Capabilities

(none - this is implementation-only, no requirement changes)

## Impact

- **Files affected**: 10 source files across ai/, bvc/, game/, and shared/ domains
- **Tests**: All 156 existing tests must continue passing
- **Risk**: Low - refactoring preserves behavior, tests provide safety net
- **Dependencies**: None
