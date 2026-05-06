## 1. Ranking Eligibility

- [x] 1.1 Remove the 90-day release-date window constant and release-date eligibility helper from `ModelRankingService`.
- [x] 1.2 Ensure ranking eligibility still requires slug, explicit reasoning status, coding score, agentic score, non-deprecated status, and non-excluded slug prefix.
- [x] 1.3 Add or update tests proving old or missing release dates no longer exclude otherwise active rankable models.

## 2. Ranking Response Shape

- [x] 2.1 Remove `date` from `RankedModel`, scored ranking internals, and `getRanking()` response mapping.
- [x] 2.2 Update route and service tests to expect only `model`, `score`, `speed`, and `output` on successful ranking items.
- [x] 2.3 Add or update assertions that successful ranking items do not include `date` or `releaseDate`.

## 3. Release-Date Cleanup

- [x] 3.1 Remove release-date normalization, type fields, and fixtures if no non-ranking code still consumes them.
- [x] 3.2 Remove or update tests that only verify release-date parsing or date-window behavior.
- [x] 3.3 Keep Artificial Analysis deprecation normalization and active-model cache validation behavior unchanged.

## 4. Verification

- [x] 4.1 Run `openspec validate remove-ranking-release-date --strict` and fix any spec issues.
- [x] 4.2 Run `npm run check` and fix any quality, spec, or type issues.
- [x] 4.3 Run `npm test` and fix any failing tests.
