## Why

The AI model ranking currently exposes speed as a ranking response field and treats output-token usage as informational only. We want the ranking to favor models that achieve strong intelligence scores with lower output-token usage, while removing speed from the domain because it is no longer part of the desired model-ranking signal or response.

## What Changes

- **BREAKING**: Remove `speed`/`tokensPerSecond` from normalized AI model data, ranking responses, and related Artificial Analysis parsing contracts.
- Apply a bounded output-efficiency bonus to rankable AI models based on `intelligenceIndexOutputTokens`.
- Use local constants in `src/domains/ai/services/model-ranking-service.ts` for the maximum bonus percentage and token threshold so they can be adjusted later.
- Keep models without output-token data rankable, but grant them no efficiency bonus.
- Continue exposing rounded output-token millions in ranking responses.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Ranking scores and tie-breaks now account for bounded output-token efficiency, and ranking response items no longer include speed.
- `ai-token-efficiency-bonus`: Token-efficiency bonus behavior changes from configurable intelligence-per-token weighting to fixed local constants with a 100M output-token threshold and 15% maximum bonus.

## Impact

- Affected code: `src/domains/ai/services/model-ranking-service.ts`, `src/domains/ai/services/artificial-analysis-client.ts`, `src/domains/ai/types/ranking.ts`, `src/domains/ai/routes/ranking.test.ts`, and ranking/client tests.
- API impact: `/ranking` response items remove the `speed` field while keeping `model`, `score`, and `output`.
- Spec impact: updates existing AI model ranking and token-efficiency requirements.
