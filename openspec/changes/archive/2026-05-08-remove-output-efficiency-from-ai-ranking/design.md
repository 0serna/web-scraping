## Context

The AI ranking service currently computes a weighted base score from normalized `coding` and `agentic` values, then applies a bounded output-efficiency adjustment derived from `intelligenceIndexOutputTokens`. Output-token counts also participate in final tie-breaking, so token metadata still influences ranking order even when base intelligence is equal.

The public ranking contract currently exposes that same token-derived metadata through an `output` field. The desired behavior is to keep the token value as response metadata only, rename it to `tokens`, and ensure the ranking itself reflects intelligence scores alone.

## Goals / Non-Goals

**Goals:**

- Rank AI models using only the normalized weighted intelligence score derived from `coding` and `agentic`.
- Remove all ranking influence from `intelligenceIndexOutputTokens`, including score adjustments and tie-break behavior.
- Replace the public ranking response field `output` with `tokens` while preserving the current rounded-millions value.
- Keep the ranking deterministic by falling back to existing intelligence tie-breaks and model name ordering.

**Non-Goals:**

- Change how Artificial Analysis model data is fetched, cached, merged, or normalized.
- Rename the internal normalized field `intelligenceIndexOutputTokens`.
- Change ranking eligibility, slug exclusion rules, or relative score scaling.
- Introduce a compatibility layer that returns both `output` and `tokens`.

## Decisions

1. Remove the output-efficiency path entirely rather than disabling it through dormant constants.

   Rationale: deleting the adjustment behavior makes the ranking contract explicit and avoids leaving dead scoring knobs that imply token efficiency is still supported. Alternative considered: keep the constants and set the effective adjustment to zero, but that preserves unnecessary code and behavioral ambiguity.

2. Remove output-token tie-breaking in addition to score adjustment.

   Rationale: if tokens remain in tie-breaks, they still affect ranking order, which conflicts with the intended behavior. Alternative considered: preserve lower-token preference for deterministic ties, but that would keep hidden ranking influence from an informational field.

3. Rename the public response field from `output` to `tokens` as a direct replacement.

   Rationale: `tokens` better describes the metadata being returned while keeping the response compact. The value remains the same rounded millions derived from `intelligenceIndexOutputTokens`, so the naming change stays separate from any unit or formatting change. Alternative considered: use `outputTokensMillions`, which is more explicit but longer than the current API shape requires.

4. Keep model name as the final deterministic tie-break.

   Rationale: the service already uses model name ordering, and once token tie-breaks are removed there is no need to add a new hidden ordering rule. Alternative considered: introduce another source field as a final tie-break, but that would expand ranking semantics without product intent.

## Risks / Trade-offs

- Breaking API response change from `output` to `tokens` -> Update ranking types, route tests, and service tests to make the replacement explicit.
- Historical ranking order may shift for models previously helped or penalized by token efficiency -> Accept as intended because the new contract defines ranking as intelligence-only.
- The `tokens` name does not encode the rounded-millions unit -> Keep the spec explicit that the field remains rounded from source token counts.
