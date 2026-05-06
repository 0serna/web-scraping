## Why

The AI ranking now uses Artificial Analysis `deprecated` lifecycle metadata to identify inactive models, making the previous 90-day release-date window a weaker and potentially incorrect proxy for model availability. The public ranking endpoint should represent currently active reasoning models and avoid exposing release-date data that no longer participates in ranking behavior.

## What Changes

- Remove release-date recency from AI model ranking eligibility.
- Keep explicitly deprecated reasoning models excluded from scoring and relative ranking.
- Include active reasoning models regardless of release date when they satisfy the existing scoring inputs and slug exclusion rules.
- **BREAKING**: Remove the `date` field from successful `/ranking` response items.
- Retire the release-date ranking capability that required a 90-day window and a date field in ranking responses.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Remove release-date eligibility and response-field requirements from the core AI ranking contract.
- `model-release-date-filter`: Remove the release-date filter and ranking-response date capability because active-model eligibility is now driven by deprecation status.

## Impact

- Affects `ModelRankingService` eligibility filtering and `RankedModel` response shape.
- Affects `/ranking` API consumers because response items will no longer include `date`.
- Affects ranking tests that currently expect recent-window filtering or `date` in output.
- Affects OpenSpec specs by removing or replacing release-date ranking requirements.
