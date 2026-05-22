## 1. ModelRankingService — eligibility and scoring

- [x] 1.1 Update `hasRequiredModelData` to require `coding !== null` AND `outputTokens > 0` (finite positive `intelligenceIndexOutputTokens`)
- [x] 1.2 Update error message in `getRanking` to say "No models with slug, coding, and output tokens were found"
- [x] 1.3 Remove `getMaxCoding` — efficiency doesn't need max-coding normalization
- [x] 1.4 Replace `normalizeScore` calls with efficiency calculation: `coding⁶ / sqrt(outputTokensMillions)`
- [x] 1.5 Update `toScoredModel` to compute `internalScore` as `(coding ** 6) / Math.sqrt(outputTokens / 1_000_000)`
- [x] 1.6 Remove all bounded efficiency adjustment logic (constants `MODEL_EFFICIENCY_MAX_ADJUSTMENT`, `OUTPUT_TOKEN_THRESHOLD`, `calculateAdjustedScore` if present)
- [x] 1.7 Add `coding` field to response: `Math.round(entry.coding)` in `getRanking` return

## 2. ModelRankingService — ordering and filtering

- [x] 2.1 Update `compareFinalModels` tie-breakers to: efficiency (`internalScore`) → `coding` descending → `outputTokens` ascending → model name ascending
- [x] 2.2 Remove old `compareNormalizedCoding`/`compareNormalizedAgentic` functions no longer referenced
- [x] 2.3 Move slug prefix exclusion (`EXCLUDED_SLUG_PREFIXES`) before score computation and top-score selection
- [x] 2.4 Ensure visible models list excludes prefixed slugs before calculating `topInternalScore`
- [x] 2.6 Remove minimum score threshold filtering from `getRanking`
- [x] 2.5 Update `RankableModel` type if still needed — remove unused fields from narrowing

## 3. ArtificialAnalysisClient — cache rankability

- [x] 3.1 Update `isRankableModel` in `artificial-analysis-client.ts` to require `isFiniteNumber(model.coding)` AND `isPositiveFiniteNumber(model.intelligenceIndexOutputTokens)`
- [x] 3.2 Update `hasRankableModel` to reflect new eligibility (already calls `isRankableModel` — verify it still works)
- [x] 3.3 Ensure no unused constants or dead functions remain after removing bounded adjustment references

## 4. Test updates

- [x] 4.1 Update `rankingModel` test helper in `model-ranking-service.test.ts` to include `intelligenceIndexOutputTokens` when needed
- [x] 4.2 Add test: models without output tokens are excluded from ranking
- [x] 4.3 Add test: ranking orders by efficiency (high coding / low tokens wins)
- [x] 4.4 Add test: new tie-breakers (coding → tokens → name) produce deterministic order
- [x] 4.5 Add test: excluded prefixes filtered before scoring (excluded winner doesn't define top score)
- [x] 4.6 Add test: no models with valid output tokens throws AiParseError
- [x] 4.7 Remove or update tests that reference bounded efficiency adjustment constants
- [x] 4.8 Update `artificial-analysis-client.test.ts` cache rankability tests: require `output_tokens` field
- [x] 4.9 Update `RankedModel` type to include `coding: number`
- [x] 4.10 Update route tests in `ranking.test.ts` to include `coding` in mock responses
- [x] 4.11 Add/update test coverage for returning models below the previous minimum score threshold
- [x] 4.12 Run `npm test` and verify all tests pass

## 5. Cleanup and validation

- [x] 5.1 Remove `ai-token-efficiency-bonus` related constants and dead code from `model-ranking-service.ts`
- [x] 5.2 Run `npm run check` (lint, typecheck, Fallow) and fix all issues
- [x] 5.3 Run `openspec validate --change rank-by-coding-efficiency` and fix any spec issues
