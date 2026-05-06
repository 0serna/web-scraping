## 1. Normalize Lifecycle Metadata

- [x] 1.1 Add `deprecated` as optional or nullable lifecycle metadata on `RawArtificialAnalysisModel` and `ArtificialAnalysisModel`.
- [x] 1.2 Preserve `deprecated: true` and `deprecated: false` during model normalization from metadata objects.
- [x] 1.3 Preserve `deprecated` during performance-object normalization and merge paths where the field is available.
- [x] 1.4 Add Artificial Analysis client tests covering `deprecated: true`, `deprecated: false`, and missing `deprecated` normalization.

## 2. Filter Ranking Eligibility

- [x] 2.1 Add a ranking eligibility filter that excludes only models with `deprecated === true`.
- [x] 2.2 Keep models with `deprecated === false` or missing `deprecated` eligible for existing reasoning, score, release-date, and slug-prefix filters.
- [x] 2.3 Ensure relative scores are calculated only after deprecated models are removed.
- [x] 2.4 Preserve the current `/ranking` response shape without exposing deprecation metadata.

## 3. Verification

- [x] 3.1 Add ranking service tests for excluding deprecated models, including when a deprecated model would otherwise be top-ranked.
- [x] 3.2 Add ranking service tests confirming missing `deprecated` remains eligible.
- [x] 3.3 Add ranking service tests confirming all-deprecated rankable models still produce the existing no-rankable-model error behavior.
- [x] 3.4 Run `npm run check` and `npm test`.
