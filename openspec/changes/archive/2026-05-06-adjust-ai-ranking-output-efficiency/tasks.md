## 1. Remove Speed Data

- [x] 1.1 Remove `speed` from `RankedModel` and ranking route/service test fixtures.
- [x] 1.2 Remove `tokensPerSecond` from normalized AI model/domain types.
- [x] 1.3 Remove speed-related raw Artificial Analysis type fields, extraction logic, merge logic, and client tests.

## 2. Implement Output Efficiency Scoring

- [x] 2.1 Add service-local constants for `0.15` maximum bonus and `100_000_000` output-token threshold in `model-ranking-service.ts`.
- [x] 2.2 Calculate adjusted internal score from base coding/agentic score plus bounded output-efficiency bonus using raw `intelligenceIndexOutputTokens`.
- [x] 2.3 Keep missing output-token data and output-token counts greater than or equal to the threshold rankable with no bonus or penalty.
- [x] 2.4 Sort by adjusted score, then agentic, coding, lower valid output-token count, and model name.
- [x] 2.5 Normalize public `score` values against the top adjusted score while preserving rounded `output` in the response.

## 3. Update Tests And Validation

- [x] 3.1 Update `model-ranking-service.test.ts` expectations to remove `speed` and cover bounded efficiency bonus behavior.
- [x] 3.2 Update tie-break tests to assert lower valid output wins after agentic/coding, with null output last.
- [x] 3.3 Update route tests so `/ranking` response fixtures exclude `speed`.
- [x] 3.4 Update Artificial Analysis client tests to remove speed parsing and merge expectations.
- [x] 3.5 Run `npm run check` and `npm test`, then address any failures.
