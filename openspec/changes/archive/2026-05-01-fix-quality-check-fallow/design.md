## Context

The repository uses Node.js, TypeScript, Fastify, Vitest, Prettier, ESLint, Husky, lint-staged, OpenSpec, and Fallow. The current quality workflow includes `fallow --fail-on-issues`, but Fallow reports unused exports, unused class members, duplicate test code, and high-complexity parsing helpers. The pre-commit hook runs the check workflow first, so these findings block commits.

The agreed constraint is to make the workflow pass without hiding technical debt. Tests remain in scope for duplication and complexity analysis. Fallow configuration is acceptable only where it models legitimate static-analysis boundaries such as dependency injection or interface contracts.

## Goals / Non-Goals

**Goals:**

- Keep Fallow active in `npm run check` with `--fail-on-issues`.
- Configure Fallow only for real project entry points or contract-driven usage it cannot infer reliably.
- Remove or reduce real unused code, duplicated test code, and high-complexity code.
- Preserve runtime behavior for Fastify routes, services, cache behavior, and existing tests.
- Keep OpenSpec validation in the project check workflow.

**Non-Goals:**

- Do not disable Fallow analyses globally.
- Do not exclude tests from quality analysis.
- Do not add inline Fallow suppressions to hide known findings.
- Do not change public HTTP API behavior.
- Do not configure CI.

## Decisions

- Use precise Fallow configuration for framework and contract modeling rather than broad ignores. This avoids rewriting working Fastify dependency-injection code solely to satisfy static analysis while keeping real debt visible.
- Remove unnecessary exports before removing functions. `hasValidApiKey` is used internally by the API-key hook and does not need to be exported if no external consumer exists.
- Delete unused test helpers only when there are no current consumers. This is lower risk than retaining unreferenced utilities.
- Refactor duplicate tests through existing or new shared test helpers. This keeps tests readable while satisfying duplication analysis without excluding `.test.ts` files.
- Split Artificial Analysis parsing helpers by responsibility. Smaller helpers should preserve the same parsing behavior while reducing cognitive complexity.

## Risks / Trade-offs

- Fallow may still report contract-based methods as unused after configuration → Validate with `npm run check` and narrow the configuration only to members with verified runtime or test usage.
- Test refactors can accidentally weaken assertions → Preserve existing assertions and run `npm test` in addition to `npm run check` when implementation is complete.
- Parser refactors can alter scraping behavior → Keep existing parser test cases intact and add focused tests only if a refactor exposes untested behavior.
- Reducing duplication in tests can reduce local readability → Prefer small helpers close to the affected tests unless a shared helper already fits.
