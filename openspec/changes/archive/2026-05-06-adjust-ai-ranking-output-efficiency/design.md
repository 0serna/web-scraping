## Context

The AI ranking pipeline normalizes Artificial Analysis model data, filters rankable reasoning models, computes an internal score from coding and agentic scores, and returns a `/ranking` response with relative scores. The current ranking response includes `speed` and `output`, while output tokens are informational only and do not affect score calculation or tie-breaks.

Existing specs also describe a separate token-efficiency bonus capability based on configurable environment weight and intelligence per million output tokens. The desired behavior is different: use fixed service-local constants for a bounded bonus against a 100M output-token threshold, and remove speed from the domain entirely.

## Goals / Non-Goals

**Goals:**

- Remove speed-related fields and parsing from AI model ranking domain types and client normalization.
- Keep the ranking response focused on `model`, `score`, and `output`.
- Apply a bounded output-efficiency bonus using raw `intelligenceIndexOutputTokens`.
- Keep the top public score normalized to `100` after applying the adjusted score.
- Keep bonus constants local to `src/domains/ai/services/model-ranking-service.ts` for easy future tuning.

**Non-Goals:**

- Do not introduce environment configuration for the bonus or threshold.
- Do not penalize high-output models.
- Do not exclude models with missing output-token data.
- Do not remove `intelligenceIndexOutputTokens` or rounded `output` from the ranking response.

## Decisions

1. Use a bounded multiplicative bonus instead of replacing intelligence with efficiency ratio.

   The adjusted score remains anchored to the existing coding/agentic weighted intelligence score. This avoids turning the ranking into pure intelligence-per-token ordering while still allowing efficient models to improve when differences are small.

2. Define service-local constants for bonus tuning.

   `OUTPUT_EFFICIENCY_MAX_BONUS` will represent the maximum multiplier increment, initially `0.15`. `OUTPUT_EFFICIENCY_THRESHOLD_TOKENS` will represent the no-bonus threshold, initially `100_000_000`. Keeping these next to the ranking score logic makes future changes localized and avoids configuration complexity.

3. Calculate bonus from raw token counts.

   The score calculation will use `intelligenceIndexOutputTokens` directly. Rounded output-token millions remain a response presentation field only, preventing score artifacts around rounding boundaries.

4. Grant no bonus for missing or high output-token values.

   Models with `null` output-token data remain rankable with base score only. Models at or above the 100M threshold also keep their base score. The change rewards low-output efficiency without penalizing models that use more tokens.

5. Normalize public scores after applying the adjusted score.

   Sorting and relative public scores will use the adjusted internal score. The top model still returns `score: 100`, preserving the existing public score scale.

6. Use output as a deterministic tie-break after intelligence tie-breakers.

   If adjusted scores are exactly equal, ordering remains `agentic` descending, then `coding` descending, then lower valid output-token count, then model name ascending. Null output-token data sorts after valid output-token data for this tie-break.

7. Remove speed from raw and normalized contracts.

   The change removes `tokensPerSecond` and source speed shape from the AI ranking types and Artificial Analysis client normalization. This is broader than only omitting `speed` from `/ranking`, but matches the desired domain cleanup.

## Risks / Trade-offs

- Breaking API response shape: clients expecting `speed` will need to stop reading it. Mitigation: document this as a breaking change in the proposal and specs.
- Existing tests encode previous behavior that output does not affect ranking. Mitigation: update those tests to assert the new adjusted-score and tie-break behavior.
- Removing raw speed fields may require several client test updates. Mitigation: keep the change mechanical and limited to speed-specific parsing, merge, types, and expectations.
- The 15% bonus can reorder close models. Mitigation: the maximum bonus is bounded and the public score remains normalized to `100`.
