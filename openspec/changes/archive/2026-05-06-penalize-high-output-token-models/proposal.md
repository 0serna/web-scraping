## Why

The current AI ranking adjustment rewards models below the output-token threshold but leaves models above the threshold neutral. Treating the threshold as a neutral target makes high output-token usage visible in ranking scores instead of only rewarding low usage.

## What Changes

- Change output-token scoring from a bonus-only rule to a capped bonus-or-penalty adjustment.
- Keep the service-local output-token threshold as the neutral threshold.
- Keep the service-local maximum adjustment as the maximum positive adjustment and use its negative counterpart as the maximum negative adjustment.
- Keep models with missing or invalid output-token data rankable with a neutral adjustment.
- Rename the concept from output-efficiency bonus to output-efficiency adjustment in specs and implementation naming.
- Keep the ranking API response shape unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ai-token-efficiency-bonus`: Change the scoring behavior from bonus-only to capped positive-or-negative output-efficiency adjustment.
- `ai-model-ranking`: Update ranking score semantics to account for penalties above the output-token threshold while preserving the public response shape.

## Impact

- Affects AI model ranking score calculation in `src/domains/ai/services/model-ranking-service.ts`.
- Affects ranking service tests that cover output-token scoring, threshold behavior, and tie-breaks.
- Affects OpenSpec requirements for `ai-token-efficiency-bonus` and `ai-model-ranking`.
- Does not add response fields or change the ranking item API shape.
