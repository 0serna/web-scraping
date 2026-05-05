## Why

The current model ranking only includes models flagged as `frontier_model` by Artificial Analysis. This excludes reasoning models that have valid coding and agentic scores but aren't tagged as frontier. Switching the filter to `reasoning_model` broadens the pool of ranked models while maintaining quality (coding + agentic scores still required).

## What Changes

- Replace `frontierModel` filter with `reasoningModel` filter in the ranking pipeline
- Rename `isRankableFrontierModel` → `isRankableReasoningModel` in `model-ranking-service.ts`
- Rename `hasRankableFrontierModel` → `hasRankableReasoningModel` in `artificial-analysis-client.ts`
- Update `RankableModel` type: `frontierModel: true` → `reasoningModel: true`
- Update cache validation to check `reasoningModel` instead of `frontierModel`
- Update error message to reference "reasoning models" instead of "frontier models"
- Update all tests to use `reasoningModel` as the default filter flag

## Capabilities

### Modified Capabilities

- `ai-model-ranking`: Change eligibility filter from `frontier_model` to `reasoning_model`. Models must have `reasoningModel: true`, `coding !== null`, and `agentic !== null` to be ranked.
- `model-exclusion-filter`: Update scenarios that reference `frontierModel: true` to use `reasoningModel: true` as the prerequisite for ranking eligibility.

## Impact

- **Files**: `src/domains/ai/services/model-ranking-service.ts`, `src/domains/ai/services/artificial-analysis-client.ts`, `src/domains/ai/types/ranking.ts` (no changes needed — both fields already exist), both test files
- **API**: No contract changes — response shape stays the same
- **Behavior**: More models will appear in the ranking (any reasoning model with coding + agentic scores, not just frontier ones)
