## Context

The AI domain fetches Artificial Analysis HTML, extracts model metadata and performance data from Next.js flight chunks, normalizes them into `ArtificialAnalysisModel`, and ranks eligible models in `ModelRankingService`. The ranking service currently filters for reasoning models with slug, coding, agentic, and positive blended price before calculating efficiency percentiles and final scores.

Artificial Analysis exposes the UI filter as `model-filters=frontier-model` and includes a `frontier_model` boolean on performance data objects. The ranking should use that upstream flag as an eligibility input before any score normalization occurs.

## Goals / Non-Goals

**Goals:**

- Preserve the upstream `frontier_model` value in normalized AI model data.
- Filter to reasoning frontier models before calculating percentile-based efficiency and final scores.
- Keep the `/ranking` response shape and route behavior unchanged.
- Cover parsing, merging, and ranking behavior with focused tests.

**Non-Goals:**

- Do not add a request parameter or alternate ranking mode.
- Do not include frontier non-reasoning models.
- Do not use the URL `models` parameter as a fixed allowlist.
- Do not change cache TTL, cache key, route status mapping, or output fields.

## Decisions

- Preserve `frontier_model` as `frontierModel` on `ArtificialAnalysisModel`.
  - Rationale: The client already normalizes upstream snake_case fields into camelCase domain fields.
  - Alternative considered: Keep the raw field name in service logic. Rejected because it leaks upstream naming into ranking code.

- Treat missing `frontier_model` as not frontier.
  - Rationale: The new eligibility rule should only include models explicitly marked by Artificial Analysis as frontier.
  - Alternative considered: Default missing values to true for backward compatibility. Rejected because it would keep unknown models in a frontier-only ranking.

- Merge `frontierModel` from performance data into deduplicated metadata by slug.
  - Rationale: Current real payloads expose `frontier_model` with performance objects, while metadata and performance are already joined by slug.
  - Alternative considered: Parse the selected model slugs from the filtered UI URL. Rejected because that list is UI state, not the stable source data contract.

- Apply the frontier filter before computing efficiency percentiles and final scores.
  - Rationale: Percentile-based efficiency should be relative to the eligible frontier universe, not all reasoning models.
  - Alternative considered: Score all reasoning models and filter frontier models at the end. Rejected because it would preserve old normalization context instead of making frontier the ranking universe.

## Risks / Trade-offs

- Artificial Analysis may rename or remove `frontier_model` -> Tests should document the expected field and ranking should fail clearly if no eligible frontier models remain.
- Filtering before scoring changes numeric scores, not only membership -> Tests should assert frontier-only relative scoring behavior rather than just output filtering.
- Some frontier models may be free or non-reasoning -> Existing positive price and reasoning rules remain authoritative and intentionally exclude them.
