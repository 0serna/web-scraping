## Why

Artificial Analysis marks older or superseded models as deprecated, but the current ranking does not use that lifecycle signal. This can allow deprecations to influence the top model, relative scores, and the public ranking even when a replacement model exists.

## What Changes

- Normalize the Artificial Analysis `deprecated` lifecycle field into internal AI model data when it is present.
- Exclude models with `deprecated: true` from AI ranking eligibility before scoring.
- Preserve current tolerant behavior for models where `deprecated` is missing by allowing them through existing ranking filters.
- Keep the public `/ranking` response shape unchanged; `deprecated` remains internal metadata.
- Continue failing the ranking when no eligible models remain after filtering.

## Capabilities

### New Capabilities

- `active-model-ranking-filter`: Covers lifecycle-based ranking eligibility for Artificial Analysis models using the `deprecated` field.

### Modified Capabilities

- `ai-model-ranking`: Ranking eligibility changes to exclude models explicitly marked as deprecated before scoring and relative score calculation.

## Impact

- Affected code: `src/domains/ai/services/artificial-analysis-client.ts`, `src/domains/ai/services/model-ranking-service.ts`, and related AI ranking tests.
- Affected types: `RawArtificialAnalysisModel` and `ArtificialAnalysisModel` lifecycle metadata.
- API impact: no response shape change for `/ranking`.
- Dependency impact: none.
