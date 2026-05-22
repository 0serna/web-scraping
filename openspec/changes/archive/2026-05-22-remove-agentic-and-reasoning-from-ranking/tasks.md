## 1. Types cleanup

- [x] 1.1 Remove `agentic` field from `ArtificialAnalysisModel` in `src/domains/ai/types/ranking.ts`
- [x] 1.2 Remove `reasoningModel` field from `ArtificialAnalysisModel` in `src/domains/ai/types/ranking.ts`
- [x] 1.3 Remove `agentic_index`, `reasoning_model`, and `isReasoning` fields from `RawArtificialAnalysisModel` in `src/domains/ai/types/ranking.ts`
- [x] 1.4 Remove `agentic` field from `PerformanceData` in `src/domains/ai/types/ranking.ts`
- [x] 1.5 Run typecheck and fix all compilation errors resulting from removed fields

## 2. ArtificialAnalysisClient updates

- [x] 2.1 Remove `agentic_index` extraction from `extractPerformanceData` and `normalizeModelMetadata` in `src/domains/ai/services/artificial-analysis-client.ts`
- [x] 2.2 Remove `reasoning_model` and `isReasoning` normalisation from `normalizeModelMetadata`
- [x] 2.3 Remove `agentic` from `mergePerformanceData` merge fields
- [x] 2.4 Update `hasValidScores` to check only `isFiniteNumber(model.coding)` (remove `agentic` check)
- [x] 2.5 Update `hasRequiredModelFields` to remove `reasoningModel === true` condition
- [x] 2.6 Update `isRankableModel` and `hasRankableReasoningModel` (rename to `hasRankableModel`) to reflect new eligibility
- [x] 2.7 Run typecheck and fix any remaining compilation errors in the client module

## 3. ModelRankingService simplification

- [x] 3.1 Remove `WEIGHT_INTELLIGENCE_AGENTIC` and `WEIGHT_INTELLIGENCE_CODING` constants from `src/domains/ai/services/model-ranking-service.ts`
- [x] 3.2 Remove `agentic` from `RankableModel` type and `hasRequiredModelData` check (only require `coding !== null`)
- [x] 3.3 Remove `normalizedAgentic` from `ScoredModel` interface
- [x] 3.4 Remove `compareNormalizedAgentic` function and its usage in `compareFinalModels`
- [x] 3.5 Remove `maxAgentic` from `getNormalizationMaxima` (only compute `maxCoding`)
- [x] 3.6 Simplify `calculateBaseScore` to accept only `coding` and return it directly (or inline it)
- [x] 3.7 Remove `normalizedAgentic` from `toScoredModel` and `normalizeScore` invocations
- [x] 3.8 Update error message from "No models with slug, coding, and agentic scores were found" to "No models with slug and coding scores were found"
- [x] 3.9 Verify the `isRankableModel` check no longer references `agentic` (should match `isRankableModel` from client)
- [x] 3.10 Run typecheck and fix any remaining compilation errors in the service module

## 4. Test updates

- [x] 4.1 Update `rankingModel` test helper to remove `agentic` from required fields and `Pick<>` type
- [x] 4.2 Update all `ArtificialAnalysisClient` tests: remove `agentic_index`, `agentic`, `reasoning_model`, `isReasoning` from test data and assertions
- [x] 4.3 Update `ModelRankingService` tests: remove agentic-dependent test cases ("normalizes coding and agentic", "prefers higher normalized agentic", "filters by reasoning, coding, and agentic")
- [x] 4.4 Update test scenarios referencing "reasoning models" or "agentic score" to use coding-only language
- [x] 4.5 Add or update tests for new tie-breaker behavior (normalized coding → model name)
- [x] 4.6 Update cache refresh tests to check for coding-only rankability (no agentic, no reasoningModel required)
- [x] 4.7 Run full test suite with `npm test` and verify all tests pass

## 5. Validation

- [x] 5.1 Run `npm run check` (lint, typecheck, Fallow, OpenSpec validation) and fix all issues
- [x] 5.2 Run `openspec validate --change remove-agentic-and-reasoning-from-ranking` to verify spec integrity
