## Why

The project currently relies on Biome for both formatting and linting, with `npm run check` modifying files as a side effect. Migrating to Prettier and ESLint separates formatting from code-quality checks, aligns with the broader JavaScript tooling ecosystem, and makes validation safer for local and CI use.

## What Changes

- Replace Biome with Prettier for formatting and ESLint for linting.
- Change `npm run check` so it validates formatting, linting, and TypeScript correctness without writing files.
- Configure pre-commit checks to apply automatic Prettier and ESLint fixes to staged files.
- Use Prettier default formatting behavior rather than preserving Biome's custom line width.
- Remove Biome configuration and dependency usage from project tooling.

## Capabilities

### New Capabilities

- `code-quality-tooling`: Project formatting, linting, validation, and pre-commit quality automation.

### Modified Capabilities

None.

## Impact

- Affected files include `package.json`, `package-lock.json`, `biome.json`, `.husky/pre-commit`, and new Prettier/ESLint configuration files.
- Development dependencies will change from Biome to Prettier, ESLint, TypeScript ESLint, and supporting globals configuration.
- Application runtime behavior, public APIs, routes, services, and domain logic are not intended to change.
