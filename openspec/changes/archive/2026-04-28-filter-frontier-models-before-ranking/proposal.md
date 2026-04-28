## Why

The AI ranking currently includes any reasoning model with required scoring and price fields, which allows non-frontier models to compete with the current frontier set shown by Artificial Analysis. This change aligns the ranking universe with Artificial Analysis' `frontier-model` filter before scores are calculated.

## What Changes

- Preserve Artificial Analysis' `frontier_model` flag during model parsing and normalization.
- Require `frontier_model: true` in addition to the existing reasoning, score, slug, and positive blended-price filters.
- Apply the frontier filter before percentile, efficiency, final score, sorting, and response limiting are calculated.
- Keep the existing ranking response shape unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Ranking eligibility changes to include only reasoning models marked as frontier by Artificial Analysis before scoring.

## Impact

- Affects `src/domains/ai/services/artificial-analysis-client.ts` parsing and normalization.
- Affects `src/domains/ai/types/ranking.ts` model types.
- Affects `src/domains/ai/services/model-ranking-service.ts` eligibility and scoring input set.
- Requires updates to AI client and ranking service tests.
- Does not change the `/ranking` route response schema or cache strategy.
