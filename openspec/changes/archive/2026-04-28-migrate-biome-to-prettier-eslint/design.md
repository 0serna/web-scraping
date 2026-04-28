## Context

The project is a Node.js 22+ TypeScript service using Fastify and Vitest. Tooling currently uses Biome through `biome.json`, `npm run check`, and `lint-staged`; `check` runs `biome check --write`, so a validation command also mutates files.

The codebase uses Vitest globals in test files and Node globals in source files. The replacement ESLint configuration must account for those runtime environments without requiring application or test code rewrites.

## Goals / Non-Goals

**Goals:**

- Replace Biome formatting with Prettier.
- Replace Biome linting with ESLint flat config using recommended JavaScript and TypeScript rules.
- Make `npm run check` validation-only: formatting check, lint check, and TypeScript check without writes.
- Ensure pre-commit automation applies automatic fixes to staged files via Prettier and ESLint.
- Use Prettier default formatting behavior, including default print width.

**Non-Goals:**

- Preserve exact Biome formatting output or custom `lineWidth: 100` behavior.
- Clone every Biome lint rule or disabled-rule exception in ESLint.
- Change application runtime behavior, API contracts, domain logic, or test structure.
- Replace Vitest globals with explicit imports.

## Decisions

- Use Prettier defaults rather than carrying over Biome formatter options.
  - Rationale: the requested migration favors recommended/default formatter behavior over minimizing formatting diff.
  - Alternative considered: set `printWidth: 100` to preserve Biome's current line width. Rejected to keep Prettier defaults pure.

- Use ESLint flat config with `@eslint/js` recommended and `typescript-eslint` recommended.
  - Rationale: this is the modern recommended ESLint setup for TypeScript projects and avoids legacy `.eslintrc` configuration.
  - Alternative considered: use a third-party opinionated config. Rejected because the change asks for recommended values, not an additional style policy.

- Configure runtime globals for Node and Vitest.
  - Rationale: existing source and test files use globals such as `process`, `describe`, `it`, `expect`, and `vi`; ESLint should understand the existing environment without requiring code churn.
  - Alternative considered: update tests to import Vitest APIs explicitly. Rejected as out of scope for a tooling migration.

- Separate validation from fixing.
  - Rationale: `check` should be safe in CI and local workflows, while pre-commit can mutate staged files to apply automatic fixes.
  - Alternative considered: keep `check` as an autofix command to match current Biome behavior. Rejected because the settled requirement is validation-only.

## Risks / Trade-offs

- Prettier defaults may produce broad formatting diffs → Accept as part of the migration and validate with `prettier --check` after formatting.
- ESLint recommended rules do not exactly match Biome recommended rules → Use standard recommended configs and address any surfaced lint failures during implementation.
- TypeScript validation in pre-commit can be slower than formatting/linting staged files → Preserve project-level correctness because the current setup already runs TypeScript validation during staged checks.
- Removing Biome eliminates a single-tool workflow → Replace it with explicit Prettier and ESLint responsibilities so behavior is easier to reason about.
