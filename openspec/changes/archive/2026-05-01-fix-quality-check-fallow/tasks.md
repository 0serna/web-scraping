## 1. Fallow Model And Tooling

- [x] 1.1 Inspect current Fallow findings and resolved configuration output.
- [x] 1.2 Add minimal Fallow configuration for verified DI, framework, or interface-contract usages only.
- [x] 1.3 Verify Fallow still reports real dead code, duplication, and health issues after configuration.

## 2. Dead Code Cleanup

- [x] 2.1 Remove unnecessary exports from internally used helpers.
- [x] 2.2 Delete unused test helper functions with no consumers.
- [x] 2.3 Confirm no runtime routes or service contracts are broken by dead-code cleanup.

## 3. Duplication Reduction

- [x] 3.1 Refactor repeated AI service test setup and assertions into focused helpers.
- [x] 3.2 Refactor repeated BVC service and route test setup into focused helpers.
- [x] 3.3 Refactor repeated Game service test setup into focused helpers.
- [x] 3.4 Refactor repeated shared cache and API helper test setup into focused helpers.

## 4. Complexity Reduction

- [x] 4.1 Split Artificial Analysis balanced JSON extraction into smaller behavior-preserving helpers.
- [x] 4.2 Split Artificial Analysis model normalization and performance extraction into smaller behavior-preserving helpers.
- [x] 4.3 Preserve existing parser behavior through current tests and add focused regression tests if needed.

## 5. Validation

- [x] 5.1 Run `npm test` and fix any behavior regressions.
- [x] 5.2 Run `npm run check` and confirm Prettier, ESLint, Fallow, OpenSpec validation, and TypeScript all pass.
- [x] 5.3 Run the Husky pre-commit command behavior manually if needed to confirm it runs check before lint-staged.
