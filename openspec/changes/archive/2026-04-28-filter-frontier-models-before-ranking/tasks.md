## 1. Model Data Normalization

- [x] 1.1 Add `frontierModel` to AI model and raw/performance data types.
- [x] 1.2 Normalize `frontier_model` into `frontierModel`, defaulting missing values to false.
- [x] 1.3 Merge `frontierModel` from performance data into deduplicated metadata by slug.

## 2. Ranking Eligibility

- [x] 2.1 Update model eligibility so ranking inputs require `frontierModel === true` in addition to existing reasoning, scoring, slug, and positive price checks.
- [x] 2.2 Keep score, sorting, limit, and response mapping logic unchanged after eligibility filtering.
- [x] 2.3 Ensure the empty-ranking parse error still applies when no eligible frontier reasoning models remain.

## 3. Tests and Validation

- [x] 3.1 Add AI client tests for parsing `frontier_model`, defaulting missing values to not frontier, and merging the flag from performance data.
- [x] 3.2 Add ranking service tests proving non-frontier reasoning models and frontier non-reasoning models are excluded.
- [x] 3.3 Add a ranking service test proving frontier filtering happens before efficiency percentile and final score calculation.
- [x] 3.4 Run targeted AI tests and `npm run check`.
