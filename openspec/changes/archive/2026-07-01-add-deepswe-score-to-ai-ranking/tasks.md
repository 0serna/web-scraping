## 1. DeepSWE Data Source

- [x] 1.1 Add DeepSWE leaderboard types for artifact rows and parsed score entries.
- [x] 1.2 Implement a DeepSWE client/service that fetches `v1.1` leaderboard data and falls back to `v1` on fetch or parse failure.
- [x] 1.3 Parse `pass_rate` into integer percentage scores and ignore invalid rows.
- [x] 1.4 Add strict matching from Artificial Analysis ranked model slugs to DeepSWE model and effort pairs.
- [x] 1.5 Ensure DeepSWE fetch, parse, and matching failures return unavailable enrichment instead of throwing through the ranking endpoint.

## 2. Ranking Contract Integration

- [x] 2.1 Add `deepSwe: number | null` to the ranked model response type.
- [x] 2.2 Update `ModelRankingService` to enrich ranked models with DeepSWE scores after existing sorting and rank assignment.
- [x] 2.3 Preserve current eligibility, sorting, ranking limit, `coding`, and `tokens` behavior.
- [x] 2.4 Update route response expectations to include `deepSwe`.

## 3. Tests and Validation

- [x] 3.1 Add service tests for matched DeepSWE scores, missing matches, integer rounding, and no ranking-order changes.
- [x] 3.2 Add DeepSWE fallback tests covering `v1.1` failure with successful `v1` data.
- [x] 3.3 Add failure-path tests showing all `deepSwe` values are `null` when DeepSWE data is unavailable.
- [x] 3.4 Update route tests for the expanded response contract.
- [x] 3.5 Run `npm test` and `npm run check`.
