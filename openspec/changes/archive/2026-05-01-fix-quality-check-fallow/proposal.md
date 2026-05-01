## Why

The project check workflow now includes Fallow with `--fail-on-issues`, but existing code quality findings cause `npm run check` and the pre-commit hook to fail. This blocks commits until Fallow is configured to understand real project entry points and the reported code quality debt is resolved.

## What Changes

- Configure Fallow precisely so framework, dependency-injected, and contract-based entry points are modeled without suppressing real debt.
- Remove or unexport unused code that has no current consumers.
- Refactor duplicated test code while preserving behavior and coverage intent.
- Refactor high-complexity Artificial Analysis parsing helpers without changing scraping behavior.
- Keep Fallow active in `check` with `--fail-on-issues` and keep tests within quality analysis scope.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `code-quality-tooling`: Extend project quality requirements to include Fallow validation, OpenSpec validation, and a passing check workflow without hiding technical debt.

## Impact

- Affected areas: `package.json` quality scripts, Fallow configuration, `.husky/pre-commit`, `.gitignore`, shared utilities, cache helpers, AI/BVC/Game services, and related Vitest tests.
- No public HTTP API behavior is intended to change.
- No CI configuration changes are included.
