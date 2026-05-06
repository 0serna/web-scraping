## Context

`ModelRankingService` currently filters rankable reasoning models through a 90-day release-date window after checking reasoning status, scoring inputs, and deprecation status. This made sense when release recency was the available proxy for whether a model belonged in the ranking, but Artificial Analysis now exposes `deprecated` metadata that directly identifies inactive models.

The public `/ranking` response currently includes `date`, sourced from the model release date. Once release date no longer participates in ranking eligibility, keeping `date` in the response suggests a ranking contract that the service no longer uses.

## Goals / Non-Goals

**Goals:**

- Rank active reasoning models based on deprecation status rather than release recency.
- Remove the release-date window from eligibility and relative score calculation.
- Remove `date` from successful `/ranking` response items.
- Keep scoring, deterministic sorting, Claude slug exclusion, speed, and output-token informational fields unchanged.

**Non-Goals:**

- Do not change the scoring formula or weights.
- Do not expose `deprecated` or lifecycle metadata in `/ranking` responses.
- Do not introduce replacement behavior based on `deprecated_to`.
- Do not change cache architecture or route error handling.

## Decisions

1. Use `deprecated !== true` as the lifecycle gate for ranking eligibility.

   Rationale: `deprecated` is the source-provided lifecycle signal. Release recency is an indirect proxy and can exclude valid older active models.

   Alternative considered: Keep both `deprecated` and the 90-day release window. Rejected because it preserves the old proxy even after a direct lifecycle signal exists.

2. Remove release-date filtering before scoring.

   Rationale: Relative scores must be computed against the best active eligible model, not the best recently released model.

   Alternative considered: Keep date as a tie-breaker. Rejected because the ranking already has deterministic tie-breaks using agentic score, coding score, and model name, and release date is not part of the ranking objective.

3. Remove `date` from `RankedModel` and `/ranking` response items.

   Rationale: The field no longer explains eligibility or ranking behavior. Removing it makes the public contract smaller and avoids implying a recency-based endpoint.

   Alternative considered: Keep `date` as informational metadata. Rejected because the user explicitly wants the date property removed.

4. Remove release-date normalization unless still needed by unrelated code.

   Rationale: If no runtime path uses release date after this change, keeping `releaseDate` in AI ranking types and parsing logic adds dead domain metadata.

   Alternative considered: Keep `releaseDate` internally for future use. Rejected unless implementation discovers another active consumer, because unused fields make tests and specs noisier.

## Risks / Trade-offs

- Breaking API response change -> Consumers expecting `date` will need to update to the smaller response shape.
- Older active models may re-enter the ranking -> This is intended, but the visible ranking can change more than just removing a field.
- Artificial Analysis lifecycle metadata could be incomplete -> Existing behavior already treats missing `deprecated` as eligible, preserving resilience for partial payloads.
- Removing release-date parsing can affect tests and fixtures broadly -> Update fixtures and helper builders carefully rather than leaving stale `date` expectations.

## Migration Plan

1. Remove release-date eligibility from `ModelRankingService`.
2. Remove `date` from `RankedModel`, scored model internals, and `/ranking` test expectations.
3. Remove release-date normalization and related type fields if no non-ranking code uses them.
4. Update OpenSpec specs to reflect active-model ranking without date output.
5. Run `npm run check` and `npm test`.

Rollback is straightforward: restore the release-date filter, `RankedModel.date`, release-date normalization, and the previous response expectations.

## Open Questions

- None.
