## Context

The AI model ranking pipeline fetches models from Artificial Analysis and filters them before scoring. Currently, the eligibility filter requires `frontier_model: true` from the source data. The `reasoning_model` field is already parsed and stored on each model but isn't used for filtering. Both fields coexist on the `ArtificialAnalysisModel` type — no data model changes are needed.

## Goals / Non-Goals

**Goals:**

- Use `reasoningModel` as the eligibility filter instead of `frontierModel`
- Include more models in the ranking (reasoning models with coding + agentic scores)
- Keep all other ranking logic unchanged (scoring, efficiency, exclusion, caching)

**Non-Goals:**

- Changing the scoring weights or algorithm
- Adding new fields to the API response
- Removing the `frontierModel` field from the data model (it's still parsed from the source)

## Decisions

### Use `reasoningModel` as the sole eligibility filter

Replace `frontierModel === true` with `reasoningModel === true` in the rankable model check. The `reasoningModel` flag is already parsed from `reasoning_model` or `isReasoning` fields in the source data (`artificial-analysis-client.ts:160-161`). No parsing changes needed.

**Why not keep both flags?** The goal is to expand the model pool. Keeping `frontierModel` as a requirement would maintain the current restriction. Using `reasoningModel` alone includes all reasoning models regardless of frontier status.

### Rename functions for clarity

Rename `isRankableFrontierModel` → `isRankableReasoningModel` and `hasRankableFrontierModel` → `hasRankableReasoningModel`. The names should reflect what they actually check. Keeping old names would be misleading.

### Keep `frontierModel` in the data model

The `frontierModel` field stays on `ArtificialAnalysisModel`, `PerformanceData`, and `RawArtificialAnalysisModel`. It's still parsed from the source and may be useful for future filtering or display. Removing it is unnecessary churn.

## Risks / Trade-offs

- **Lower-quality models entering ranking** → Mitigated by the existing requirement for both `coding` and `agentic` scores. Models without meaningful benchmarks are still excluded.
- **Cache validation change** → The `hasRankableReasoningModel` validator now checks `reasoningModel` instead of `frontierModel`. Since reasoning models are a superset of frontier models, cached data is more likely to pass validation (lower risk of stale cache issues).
- **Test updates** → Many tests use `frontierModel: true` as the default. These all need updating to `reasoningModel: true`. Straightforward but numerous.
