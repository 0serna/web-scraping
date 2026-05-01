## 1. Source Data Validation

- [x] 1.1 Use Playwriter to validate the current Artificial Analysis pages and identify whether any additional model variants expose explicit `frontier_model` with coding and agentic data.
- [x] 1.2 Document implementation assumptions in code/tests by covering fallback to the current explicit frontier subset when additional variants do not expose explicit frontier flags.

## 2. Ranking Eligibility

- [x] 2.1 Update `ModelRankingService` eligibility to require slug, `frontierModel === true`, coding, and agentic only.
- [x] 2.2 Remove `reasoningModel` and blended price from ranking eligibility and error criteria.
- [x] 2.3 Update ranking tie-breakers to use internal score, agentic, coding, then model name.
- [x] 2.4 Preserve relative response score normalization and the existing `{ model, position, score }` response shape.

## 3. Artificial Analysis Client

- [x] 3.1 Update rankable-cache validation to accept cached model data when at least one model has slug, explicit frontier flag, coding, and agentic.
- [x] 3.2 Keep `frontier_model` normalization explicit and treat missing frontier flags as not frontier.
- [x] 3.3 If current Artificial Analysis data exposes broader explicit frontier model performance data, update parsing to include those variants without inferring frontier from UI grouping or names.

## 4. Tests

- [x] 4.1 Update ranking service tests for non-reasoning frontier inclusion and missing price inclusion.
- [x] 4.2 Update ranking service tests for non-frontier exclusion and new agentic-before-coding tie-breaking.
- [x] 4.3 Update Artificial Analysis client tests for the new cache validation criteria.
- [x] 4.4 Add or update parser tests for explicit frontier preservation and no-inference behavior for additional variants.

## 5. Verification

- [x] 5.1 Run targeted Vitest tests for AI ranking and Artificial Analysis parsing.
- [x] 5.2 Run `npm run check`.
- [x] 5.3 Run `npm test` if targeted tests and checks pass.
