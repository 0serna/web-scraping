## Why

The AI ranking response currently exposes Artificial Analysis coding data but does not show whether a model has a DeepSWE benchmark score. Adding DeepSWE as an informational field lets API consumers compare ranking entries against a long-horizon coding benchmark without changing ranking behavior.

## What Changes

- Add a `deepSwe` field to each AI ranking response item.
- Populate `deepSwe` from DeepSWE `pass_rate` when a strict model match exists.
- Return `deepSwe` as an integer percentage from 0 to 100, or `null` when unavailable.
- Fetch DeepSWE leaderboard data from `v1.1` with fallback to `v1`.
- Keep existing ranking order, eligibility, and scoring unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ai-model-ranking`: Response contract expands to include optional DeepSWE score enrichment per ranked model.

## Impact

- Affects `GET /ranking` response shape.
- Affects AI ranking model types and service mapping.
- Adds a DeepSWE leaderboard fetch/parse path used as non-blocking enrichment.
- Requires service and route tests for `deepSwe` values, missing matches, source fallback, and source failures.
