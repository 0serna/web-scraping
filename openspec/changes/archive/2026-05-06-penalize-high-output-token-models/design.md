## Context

AI model ranking currently calculates a base intelligence score from coding and agentic scores, then applies an output-efficiency bonus only when a model's valid output-token count is below the configured output-token threshold. Models at or above that threshold receive no bonus and no penalty.

The new behavior treats the configured output-token threshold as the neutral target. Models below the target receive a positive adjustment, models above the target receive a negative adjustment, and missing token data remains neutral.

## Goals / Non-Goals

**Goals:**

- Penalize known output-token counts above the threshold while preserving the existing bonus below the threshold.
- Keep the maximum positive adjustment configurable via the service-local constant and introduce a matching maximum negative adjustment.
- Keep missing, invalid, null, or non-positive output-token data neutral.
- Rename implementation and spec language from bonus-only terminology to adjustment terminology.
- Preserve the public ranking response shape.

**Non-Goals:**

- Do not add response fields exposing the multiplier or adjustment percent.
- Do not change model eligibility rules.
- Do not change coding and agentic score weights.
- Do not change the threshold or maximum adjustment constants.
- Do not reintroduce speed or `tokensPerSecond` data.

## Decisions

Use a symmetric capped adjustment around the existing threshold.

```text
multiplier = 1 + clamp(
  maximumAdjustment * (1 - outputTokens / outputTokenThreshold),
  -maximumAdjustment,
  maximumAdjustment
)
```

Rationale: this preserves the current below-threshold bonus curve, gives the threshold a clear neutral meaning, and prevents extreme output-token counts from dominating intelligence scores.

Treat missing token data as neutral.

Rationale: missing token data is a source-data gap, not evidence of poor efficiency. Keeping those models rankable avoids excluding or penalizing otherwise valid reasoning models.

Rename the concept to output-efficiency adjustment.

Rationale: once the multiplier can reduce scores, bonus-only naming becomes misleading. The public response remains unchanged, so the naming change is internal and spec-facing.

Keep lower valid output-token count as a deterministic tie-break.

Rationale: if adjusted scores are equal after applying the formula, lower known output usage remains the most relevant final discriminator before model name.

## Risks / Trade-offs

- High-intelligence models with very large output-token counts can move down more visibly -> The negative maximum-adjustment cap limits the maximum penalty.
- The threshold becomes more semantically important -> The constant remains unchanged to avoid retuning two variables at once.
- API consumers cannot see the exact penalty applied -> The existing `output` field remains available, and the response shape stays stable.
- Missing token data may rank above penalized known data -> This is intentional because unknown usage is treated as neutral rather than assumed bad.
