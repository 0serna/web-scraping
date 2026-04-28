## Why

The AI ranking response currently exposes raw price data and an internal scoring value, which makes the API contract more coupled to ranking implementation details than needed. Consumers need a simpler ranking-oriented contract where the top model is clearly 100% and every other model is comparable relative to it.

## What Changes

- Remove `price1m` from each `GET /ranking` response item. This is a breaking API contract change.
- Keep price data as an internal ranking input for efficiency scoring and tie-breaking.
- Change the public `score` field from the internal absolute score to a percentage relative to the internal score of the model at `position: 1`. This is a breaking semantic change.
- Preserve the existing model eligibility, scoring, sorting, tie-breakers, and ranking position behavior.
- Treat a non-positive top internal score as invalid ranking data instead of inventing a fallback response.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: change the ranking response contract to omit price and expose relative percentage scores.

## Impact

- Affects `GET /ranking` response shape and score semantics.
- Affects AI ranking service output mapping and related route/service tests.
- Does not require dependency, storage, or source scraping changes.
