## Why

Currently the model ranking service filters for reasoning models only and returns all models without any quality filtering. This means low-performing models appear in results even when their scores are minimal. We need to broaden the ranking to include non-reasoning models and add a configurable minimum score threshold to filter out low-quality results.

## What Changes

- Add `MIN_SCORE_THRESHOLD` constant (default: 60) to filter results by minimum normalized score
- Remove `reasoningModel === true` filter to include all models with coding and agentic scores
- Apply score threshold filter before returning ranked results
- Keep existing scoring weights (0.6 agentic, 0.4 coding) for all models

## Capabilities

### New Capabilities

- `min-score-filter`: Configurable minimum score threshold for ranking results

### Modified Capabilities

- `ai-model-ranking`: Expand eligibility from reasoning-only to all models with coding/agentic scores; add score threshold filtering

## Impact

- `src/domains/ai/services/model-ranking-service.ts` - add constant and modify filter logic
- `src/domains/ai/types/ranking.ts` - no changes needed
- Existing tests may need updates for new behavior
