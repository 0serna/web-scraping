## Context

The AI domain currently fetches Artificial Analysis HTML, extracts Next.js flight payload chunks, normalizes metadata and performance data into `ArtificialAnalysisModel`, caches validated model data, and ranks models through `/ranking`.

The current ranking path requires a model to be explicitly frontier, reasoning, and have coding, agentic, and blended price values. The desired behavior keeps explicit frontier as the core eligibility signal, but removes reasoning and price as requirements. Playwriter exploration showed that Artificial Analysis exposes additional model variants in the UI, but explicit `frontier_model` was only confirmed in the current performance payload subset. The implementation should broaden scraping only when explicit frontier data is available and otherwise preserve the explicit-frontier subset.

## Goals / Non-Goals

**Goals:**

- Rank every model that is explicitly marked frontier and has coding and agentic scores.
- Include non-reasoning frontier models when they satisfy the same metric requirements.
- Remove blended price from ranking eligibility, tie-breaking, and cache validation.
- Preserve the existing `/ranking` response schema and relative score semantics.
- Keep ranking deterministic without price by using score, agentic, coding, then model name.
- Investigate and use broader Artificial Analysis data only when explicit frontier flags can be joined to coding and agentic scores.

**Non-Goals:**

- Do not infer frontier status from UI grouping, rank position, or model naming.
- Do not add price, coding, agentic, slug, or reasoning fields to the `/ranking` response.
- Do not exclude deprecated models unless they fail the explicit frontier plus metric criteria.
- Do not introduce new runtime dependencies.

## Decisions

1. Use explicit frontier as the only category filter.

   Rationale: the user explicitly wants to keep the frontier filter, but no longer wants reasoning or price to affect eligibility. `frontier_model === true` remains the authoritative source signal.

   Alternative considered: treat the UI's `28 of 512 models` group as frontier. Rejected because it would infer frontier when the explicit field is absent.

2. Require only coding and agentic metrics for scoring.

   Rationale: the internal score uses only coding and agentic, so price should not block otherwise rankable frontier models.

   Alternative considered: keep blended price as a data-quality requirement. Rejected because price is no longer needed for ranking and can hide valid models.

3. Preserve relative score output.

   Rationale: existing clients expect `score` to be normalized so the top model returns `100`. The change modifies eligibility and ordering, not the response contract.

   Alternative considered: return raw `0.4 * coding + 0.6 * agentic`. Rejected because it changes the meaning of `score`.

4. Use deterministic tie-breaking without price.

   Rationale: price is removed from ranking behavior, but response ordering must remain stable. Ties should sort by internal score descending, then agentic descending, then coding descending, then model name ascending.

   Alternative considered: coding before agentic. Rejected because agentic has the higher score weight and was selected as the preferred tie-breaker.

5. Update cache validation to match rankability.

   Rationale: validated cache recovery should refetch when cached data has no model that could produce a valid ranking under the new eligibility criteria.

   Alternative considered: leave validation as frontier reasoning with price. Rejected because stale-cache detection would no longer match ranking behavior.

6. Broaden scraping opportunistically, not by weakening frontier semantics.

   Rationale: if an upstream payload or page exposes explicit frontier flags for additional variants with coding and agentic scores, the parser should include them. If no such explicit source exists, the system should continue ranking the current explicit frontier subset rather than infer frontier.

   Alternative considered: fail when additional variants cannot be validated as frontier. Rejected because the acceptable fallback is the current explicit frontier subset.

## Risks / Trade-offs

- Artificial Analysis may not expose explicit frontier flags for every UI-visible variant -> The ranking may still omit those variants while preserving correctness of the frontier filter.
- Removing price can change ranking order for previous score ties -> Deterministic non-price tie-breakers keep output stable and aligned with the new ranking intent.
- Including non-reasoning frontier models can alter downstream expectations -> The response schema remains unchanged, and eligibility is explicitly documented in specs and tests.
- Upstream HTML/flight payload shape can change -> Parser tests should cover old and new known field layouts, and Playwriter should be used during implementation to validate current source behavior.
