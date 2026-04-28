## 1. Dependency And Configuration Setup

- [x] 1.1 Remove Biome from project dependencies and active tooling references.
- [x] 1.2 Add Prettier, ESLint, `@eslint/js`, `typescript-eslint`, and globals support as development dependencies.
- [x] 1.3 Add Prettier configuration using default behavior without custom print width.
- [x] 1.4 Add ESLint flat config with recommended JavaScript and TypeScript rule sets.
- [x] 1.5 Configure ESLint globals for Node.js source files and Vitest test files.

## 2. Script And Pre-commit Workflow

- [x] 2.1 Update `npm run check` to validate Prettier formatting, ESLint linting, and TypeScript compilation without writing files.
- [x] 2.2 Add or update a fix command for local automatic Prettier and ESLint fixes if useful for the workflow.
- [x] 2.3 Update `lint-staged` so staged supported files are formatted with Prettier and auto-fixed with ESLint.
- [x] 2.4 Keep pre-commit validation aligned with the existing hook behavior, including test execution unless implementation reveals a direct conflict.

## 3. Migration Cleanup And Verification

- [x] 3.1 Delete obsolete Biome configuration after replacement tooling is active.
- [x] 3.2 Run the formatter/fixer workflow once so the repository matches Prettier defaults and ESLint autofix output.
- [x] 3.3 Run `npm run check` and resolve formatting, linting, or TypeScript failures.
- [x] 3.4 Run `npm run test` and resolve any regressions from tooling migration.
- [x] 3.5 Inspect the final diff to confirm only tooling, formatting, dependency, and pre-commit changes were introduced.
