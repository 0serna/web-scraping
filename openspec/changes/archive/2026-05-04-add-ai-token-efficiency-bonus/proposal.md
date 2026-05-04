## Why

The AI ranking currently ranks only by coding and agentic intelligence, which can favor models that achieve higher benchmark scores by consuming far more generated tokens. Artificial Analysis exposes token-use data for its Intelligence Index, creating an opportunity to reward models that deliver strong intelligence with fewer output tokens.

## What Changes

- Add a configurable token-efficiency bonus to AI model ranking.
- Parse Artificial Analysis Intelligence Index token counts, specifically `output_tokens`, alongside existing coding and agentic metrics.
- Calculate model efficiency as the existing internal intelligence score per million Intelligence Index output tokens.
- Apply a multiplicative efficiency bonus controlled by `MODEL_EFFICIENCY_WEIGHT`, defaulting to `0.30` and constrained to `0..1`.
- Keep `/ranking` response items limited to `model`, `position`, and normalized `score`.
- Keep models rankable when token-use data is missing, but do not grant an efficiency bonus to those models.
- Treat invalid efficiency-weight configuration as startup failure.

## Capabilities

### New Capabilities

- `ai-token-efficiency-bonus`: Configurable bonus that rewards AI ranking models for intelligence per output token.

### Modified Capabilities

- `ai-model-ranking`: Ranking scores and deterministic tie-breaking incorporate the configured token-efficiency bonus while preserving the existing response shape.

## Impact

- Affected domain: `src/domains/ai`.
- Affected shared config: `src/shared/config/index.ts`.
- Affected scraping/parsing: `src/domains/ai/services/artificial-analysis-client.ts` and AI ranking types.
- Affected scoring: `src/domains/ai/services/model-ranking-service.ts`.
- Affected API contract: `/ranking` keeps the same response fields, but ordering and `score` values may change when `MODEL_EFFICIENCY_WEIGHT` is non-zero.
- Tests will need coverage for token-count parsing, default/config validation, bonus scoring, missing token data, and deterministic tie-breaking.
