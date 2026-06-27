## Context

The AI ranking parser extracts model metadata and performance objects from the Artificial Analysis Next.js flight payload. Ranking output already supports an informational `tokens` field, but token extraction currently depends on the legacy `intelligence_index_token_counts.output_tokens` shape.

The current Artificial Analysis payload exposes canonical intelligence token counts as `canonicalIntelligenceIndexTokenCount`, with `output` containing the total output-token count. Coding scores continue to be available as `coding_index`, so ranking eligibility and primary ordering are unaffected.

## Goals / Non-Goals

**Goals:**

- Parse output-token counts from `canonicalIntelligenceIndexTokenCount.output`.
- Preserve token counts from performance extraction through model-data merge.
- Keep existing ranking sorting semantics: rounded coding descending, output-token count ascending as tie-breaker, model name ascending.
- Keep the public `/ai/ranking` response shape unchanged.
- Keep models eligible when token data is missing or invalid, returning `tokens: null`.

**Non-Goals:**

- Add new fields to the ranking response.
- Change model eligibility rules, excluded slug prefixes, or ranking size limits.
- Add a new Artificial Analysis API source or browser automation dependency.
- Rework the broader RSC parsing strategy beyond the token field update.

## Decisions

- Use `canonicalIntelligenceIndexTokenCount.output` as the canonical output-token source.
  - Rationale: this is the current field in the Artificial Analysis payload and maps directly to the existing `tokens` response semantics.
  - Alternative considered: derive output tokens by summing nested benchmark token counts. This is more brittle and duplicates data already provided by the payload.

- Keep the internal normalized field name `intelligenceIndexOutputTokens`.
  - Rationale: downstream ranking code already depends on this semantic field, and retaining it limits changes to raw parsing and typing.
  - Alternative considered: rename internal fields to match the upstream payload. This would increase churn without changing public behavior.

- Treat invalid, missing, zero, or negative output-token values as `null`.
  - Rationale: existing ranking behavior sorts null token counts last for equal coding scores and still includes otherwise rankable models.
  - Alternative considered: fail parsing when token data is missing. This would make the ranking unnecessarily fragile.

- Update merge behavior so performance token counts are carried with coding and price fields.
  - Rationale: token counts are performance-derived data and must survive metadata/performance merge to reach ranking.
  - Alternative considered: extract token counts only from metadata models. The metadata `models` array does not reliably include performance token data.

## Risks / Trade-offs

- Artificial Analysis may rename the token field again → Keep focused tests around raw payload normalization so future field changes fail clearly.
- Existing cached models may contain all-null token values until cache expiry → The fix will apply after cache refresh; manual cache invalidation may be needed if immediate production correction is required.
- The code may still include legacy field support if implemented for compatibility → This slightly broadens parsing but reduces risk when cached or test fixtures use the older shape.
