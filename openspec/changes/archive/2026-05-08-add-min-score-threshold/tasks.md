## 1. Add MIN_SCORE_THRESHOLD constant

- [x] 1.1 Add `MIN_SCORE_THRESHOLD = 60` constant in `model-ranking-service.ts` (near existing WEIGHT\_\* constants)

## 2. Modify ranking logic

- [x] 2.1 Remove `reasoningModel === true` filter from `getRanking()` method
- [x] 2.2 Change filter to use `hasRequiredModelData()` (checks coding & agentic not null)
- [x] 2.3 Add score threshold filter: `models.filter(m => m.score >= MIN_SCORE_THRESHOLD)` before returning

## 3. Update tests

- [x] 3.1 Add test case: non-reasoning model with valid scores included in ranking
- [x] 3.2 Add test case: model below threshold (score < 60) excluded from results
- [x] 3.3 Add test case: all models below threshold returns empty array
- [x] 3.4 Run existing tests to verify no regressions

## 4. Run checks

- [x] 4.1 Run `npm run check` to validate lint, typecheck, and OpenSpec
- [x] 4.2 Run `npm test` to verify all tests pass
