## 1. Exclusion Filter Implementation

- [x] 1.1 Add `EXCLUDED_SLUG_PREFIXES` constant to `model-ranking-service.ts`
- [x] 1.2 Add exclusion filter after `isRankableFrontierModel` and before scoring in `getRanking()`

## 2. Tests

- [x] 2.1 Add test: model with excluded slug prefix is not ranked
- [x] 2.2 Add test: model with non-excluded slug prefix is ranked
- [x] 2.3 Add test: multiple prefixes in blocklist exclude matching models
- [x] 2.4 Add test: excluded model that would have been top-ranked — next model becomes position 1 with score 100
- [x] 2.5 Add test: empty blocklist excludes nothing (covered by existing tests - all use non-excluded models)

## 3. Validation

- [x] 3.1 Run `npm run check` to validate lint, format, and type check
- [x] 3.2 Run `npm test` to confirm all tests pass
