## 1. Update ranking service filter

- [x] 1.1 Rename `isRankableFrontierModel` to `isRankableReasoningModel` in `model-ranking-service.ts` and change the check from `frontierModel === true` to `reasoningModel === true`
- [x] 1.2 Update `RankableModel` type in `model-ranking-service.ts`: change `frontierModel: true` to `reasoningModel: true`
- [x] 1.3 Update error message from "No frontier models..." to "No reasoning models..."

## 2. Update cache validation

- [x] 2.1 Rename `hasRankableFrontierModel` to `hasRankableReasoningModel` in `artificial-analysis-client.ts` and change the check from `frontierModel` to `reasoningModel`

## 3. Update model-ranking-service tests

- [x] 3.1 Update `rankingModel()` helper default: `frontierModel: true` → `reasoningModel: true`
- [x] 3.2 Update inline model fixtures to use `reasoningModel: true` instead of `frontierModel: true`
- [x] 3.3 Update test "excludes non-frontier models" → "excludes non-reasoning models" and change the non-reasoning model to use `reasoningModel: false`
- [x] 3.4 Update test "applies frontier filtering before final score calculation" → use `reasoningModel` flags
- [x] 3.5 Update test "includes frontier non-reasoning model" → adapt to reasoning filter logic
- [x] 3.6 Update test "filters by frontier, coding, and agentic only" → use `reasoningModel`

## 4. Update artificial-analysis-client tests

- [x] 4.1 Update `freshFrontierRawModel()` helper and related fixtures to use `reasoning_model` instead of `frontier_model` as the primary filter flag
- [x] 4.2 Update cache validation tests to reference `hasRankableReasoningModel`

## 5. Validate

- [x] 5.1 Run `npm run check` to verify linting, formatting, and type checks pass
- [x] 5.2 Run `npm test` to verify all tests pass
