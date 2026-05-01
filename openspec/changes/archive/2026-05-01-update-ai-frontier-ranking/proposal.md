## Why

The AI ranking currently excludes explicit frontier models unless they are reasoning models and have blended price data. This hides frontier variants that have the metrics needed for ranking, and price is no longer part of the desired ranking behavior.

## What Changes

- Rank AI models using only explicit `frontier_model` eligibility plus available `coding` and `agentic` scores.
- Remove `reasoningModel` from ranking eligibility so non-reasoning frontier models can be ranked.
- Remove blended price from ranking eligibility and tie-breaking.
- Keep the existing `/ranking` response shape and relative `score` semantics.
- Attempt to broaden Artificial Analysis scraping to include additional explicitly-frontier variants with coding and agentic data when such explicit frontier data is available.
- Preserve fallback behavior to the current explicit frontier subset if no explicit frontier source is available for additional variants.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Ranking eligibility changes from frontier reasoning models with price data to explicit frontier models with coding and agentic data, with updated tie-breaking and cache validation criteria.

## Impact

- Affected domain: `src/domains/ai/`.
- Affected services: `ArtificialAnalysisClient` model parsing/cache validation and `ModelRankingService` ranking eligibility/sorting.
- Affected API: `/ranking` behavior changes by including more eligible frontier models, while keeping the response schema unchanged.
- Affected tests: AI client parsing/cache tests and ranking service tests need updates for frontier-only eligibility, no-price eligibility, non-reasoning inclusion, and updated tie-breakers.
