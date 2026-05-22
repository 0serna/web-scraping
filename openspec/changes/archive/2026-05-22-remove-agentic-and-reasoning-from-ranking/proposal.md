## Why

The ranking algorithm currently uses `agentic` scores as part of eligibility, internal scoring (30% weight), and tie-breaking, while also filtering by `reasoningModel === true` in cache validation. The user has decided to base the ranking exclusively on `coding` scores and remove the `reasoningModel` filter entirely, simplifying both the ranking logic and the internal data model.

## What Changes

- **BREAKING**: Remove `agentic` field from `ArtificialAnalysisModel`, `RawArtificialAnalysisModel`, and `PerformanceData` types. `agentic_index` from upstream is ignored.
- **BREAKING**: Remove `reasoningModel` field from `ArtificialAnalysisModel`, and `reasoning_model`/`isReasoning` from `RawArtificialAnalysisModel`. Upstream reasoning flags are ignored.
- Remove `WEIGHT_INTELLIGENCE_AGENTIC` and `WEIGHT_INTELLIGENCE_CODING` constants. Internal score becomes `normalizedCoding` (single-weight, implicitly 1.0).
- Remove agentic normalization (`maxAgentic`, `normalizedAgentic`) from `ModelRankingService`.
- Remove `normalizedAgentic` field from `ScoredModel` and all related agentic tie-breakers.
- Update eligibility in `ModelRankingService` to require only `slug` + `coding` + `not deprecated`.
- Update cache rankability check in `ArtificialAnalysisClient` to require only `coding` valid (no `agentic`, no `reasoningModel`).
- Update error messages to reference only `coding` scores instead of `coding and agentic`.
- Update ranking tie-breakers: score → `normalizedCoding` → model name ascending.
- Remove agentic and reasoning from all related tests.

## Capabilities

### New Capabilities

- `coding-only-ranking`: Ranking eligibility and scoring based solely on `coding` scores, without `agentic` weighting or `reasoningModel` filtering.

### Modified Capabilities

- `ai-model-ranking`: Remove all `agentic` score requirements, `reasoningModel` filtering, and 70/30 preference weights. Scoring becomes `normalizedCoding` only. Tie-breakers use normalized coding and model name.
- `active-model-ranking-filter`: Remove `agentic score` and `reasoning` mentions from active-model eligibility scenarios.
- `ai-token-efficiency-bonus`: Remove `agentic` from normalized preference base score references and tie-breaker ordering.
- `model-data-merge`: Remove `agentic` from performance data merge fields.
- `model-exclusion-filter`: Remove `reasoningModel` and `agentic score` from exclusion filter scenarios.

## Impact

- `src/domains/ai/types/ranking.ts`: Remove `agentic`, `reasoningModel` from `ArtificialAnalysisModel`; remove `agentic_index`, `reasoning_model`, `isReasoning` from `RawArtificialAnalysisModel`; remove `agentic` from `PerformanceData`.
- `src/domains/ai/services/model-ranking-service.ts`: Remove agentic constants, normalization, tie-breakers, and reasoning filter. Simplify to coding-only logic.
- `src/domains/ai/services/artificial-analysis-client.ts`: Remove agentic and reasoning field parsing, merge logic, and cache rankability check involving them.
- `src/domains/ai/services/artificial-analysis-client.test.ts`: Remove agentic and reasoning assertions from parser and client tests.
- `src/domains/ai/services/model-ranking-service.test.ts`: Remove agentic-dependent tests, update test helper signatures.
- `src/domains/ai/routes/ranking.ts`: Potential minor updates if route layer references removed fields (likely none needed).
