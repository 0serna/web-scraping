## Why

AI model rankings currently mix intelligence scores with an output-token efficiency bonus, which can move a lower-scoring model above a stronger model. Token counts are useful context for users, but they should not change ranking order or score calculation.

## What Changes

- Remove output-token efficiency as a ranking and score input for AI model rankings.
- Return `outputTokensMillions` on each ranked model as rounded response metadata, similar to `tokensPerSecond`.
- Keep `tokensPerSecond` as response-only metadata.
- Preserve existing reasoning-model eligibility, slug exclusions, and deterministic tie-break behavior based on intelligence scores and model name.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Ranking score calculation and response fields change so output tokens are informational only.

## Impact

- Affected domain: `src/domains/ai`.
- API response: ranked model items add `outputTokensMillions: number | null`.
- Ranking behavior: `intelligenceIndexOutputTokens` no longer affects eligibility, order, tie-breaks, or `score`.
- Tests: model ranking tests need updates for score/order expectations and the new response field.
- Specs: `openspec/specs/ai-model-ranking/spec.md` needs updated requirements for score calculation, tie-breaks, and output-token metadata.
