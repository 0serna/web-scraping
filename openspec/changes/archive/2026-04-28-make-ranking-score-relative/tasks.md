## 1. Response Contract

- [x] 1.1 Update the ranked model output type to remove `price1m`.
- [x] 1.2 Keep price fields available internally for efficiency scoring and tie-breakers.

## 2. Relative Score Mapping

- [x] 2.1 Preserve existing internal score calculation, ordering, ranking limit, and tie-breakers.
- [x] 2.2 Convert response `score` to a percentage of the first-ranked model's unrounded internal score.
- [x] 2.3 Fail ranking when the first-ranked internal score is less than or equal to 0.

## 3. Tests

- [x] 3.1 Update service tests to assert relative scores and absence of `price1m`.
- [x] 3.2 Add coverage that the first-ranked model returns `score: 100` and lower-ranked models return relative percentages.
- [x] 3.3 Add coverage for non-positive top internal score failure.
- [x] 3.4 Update route tests to assert the new response shape.

## 4. Validation

- [x] 4.1 Run `npm run check`.
- [x] 4.2 Run `npm test`.
- [x] 4.3 Run `npm run build`.
