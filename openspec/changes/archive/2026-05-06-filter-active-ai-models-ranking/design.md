## Context

The AI ranking flow currently fetches Artificial Analysis model data, normalizes model metadata and performance fields, then filters by rankability, release recency, and excluded slug prefixes before scoring. Artificial Analysis exposes a model lifecycle field named `deprecated`; prior investigation found replacement metadata via `deprecated_to`, but the requested ranking behavior only needs the boolean deprecation flag.

The public `/ranking` contract is already intentionally narrow and does not expose internal eligibility metadata. This change should preserve that API shape while preventing explicitly deprecated models from affecting ranking order or relative score normalization.

## Goals / Non-Goals

**Goals:**

- Preserve `deprecated` from Artificial Analysis model data when available.
- Exclude only models with `deprecated === true` from ranking eligibility.
- Keep models with missing `deprecated` eligible if they satisfy existing filters.
- Recalculate relative scores using only non-deprecated eligible models.
- Preserve current `/ranking` response fields and error behavior.

**Non-Goals:**

- Do not expose `deprecated`, `deprecated_to`, or lifecycle status in `/ranking` responses.
- Do not redirect or substitute deprecated models with their `deprecated_to` replacement.
- Do not use `deleted` as part of active-model semantics in this change.
- Do not alter the existing 90-day release date filter or slug-prefix exclusion rules.

## Decisions

1. Normalize `deprecated` as nullable internal metadata.

   Rationale: Artificial Analysis model data can vary by source object. Representing missing data distinctly from `false` keeps the agreed tolerant behavior: only explicit `true` excludes a model.

   Alternative considered: default missing `deprecated` to `false`. This produces the same ranking result but loses observability of whether AA actually provided the field.

2. Filter deprecated models in ranking eligibility, not in the scraper client.

   Rationale: `getModels()` should continue returning normalized source data for any future consumers or tests. Ranking-specific eligibility belongs beside existing ranking filters such as reasoning, recency, and slug-prefix exclusion.

   Alternative considered: drop deprecated models during parsing. That would simplify ranking but make the client less faithful to source data and hide lifecycle metadata from other domain logic.

3. Preserve existing API shape.

   Rationale: Consumers only need ranked active models. Exposing `deprecated` would change the public contract without adding value to this endpoint because filtered-out models never appear.

   Alternative considered: add `deprecated` to each ranked item. This was rejected because it creates unnecessary response churn.

4. Treat missing `deprecated` as eligible.

   Rationale: This keeps ranking resilient if AA omits the field in one payload shape. It matches the agreed behavior and avoids accidental ranking outages from partial lifecycle metadata.

   Alternative considered: fail or exclude when the field is missing. That would enforce stricter data quality but risks breaking ranking for otherwise valid current models.

## Risks / Trade-offs

- AA changes or removes `deprecated` → Deprecated models could re-enter the ranking because missing values remain eligible. Mitigation: tests should cover explicit `true`, explicit `false`, and missing values so the chosen tolerance is deliberate.
- Lifecycle metadata appears only in one extracted payload path → Some normalized models may miss `deprecated`. Mitigation: preserve the field from every raw model normalization path that already handles metadata or performance objects.
- All otherwise rankable models are deprecated → `/ranking` fails as it does today when no eligible models remain. Mitigation: this is intentional and keeps failure semantics consistent.
