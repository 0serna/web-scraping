## Why

The AI model ranking currently includes all reasoning models regardless of age, which means outdated models dilute the ranking and reduce its relevance for users who only care about recent releases. Artificial Analysis exposes a `release_date` field in its payload that we can use to filter the ranking to only include models released within a configurable recent window (default: 90 days).

## What Changes

- Extract and normalize `release_date` from Artificial Analysis payload into the model data pipeline
- Add an internal constant `RECENT_MODEL_WINDOW_DAYS = 90` to filter models by release date
- Apply the release date filter after the reasoning model filter and before scoring
- Include `releaseDate` field in the ranking response (ISO string or `null` for models without a date)
- Models without a release date remain included in the ranking with `releaseDate: null`

## Capabilities

### New Capabilities

- `model-release-date-filter`: Filters the AI model ranking to only include models released within a recent time window (90 days by default), while preserving models with unknown release dates

### Modified Capabilities

- `ai-model-ranking`: Adds `releaseDate` field to ranking response items; adds release date filter step to the ranking pipeline

## Impact

- **`src/domains/ai/types/ranking.ts`**: Add `releaseDate` to `ArtificialAnalysisModel`, `RawArtificialAnalysisModel`, and `RankedModel` interfaces
- **`src/domains/ai/services/artificial-analysis-client.ts`**: Extract `release_date` from raw payload during normalization
- **`src/domains/ai/services/model-ranking-service.ts`**: Add release date filter constant and apply filter before scoring
- **`src/domains/ai/services/model-ranking-service.test.ts`**: Update test mocks with `release_date` field; add tests for date filtering behavior
- **`src/domains/ai/services/artificial-analysis-client.test.ts`**: Add tests for `release_date` extraction
- **`src/domains/ai/routes/ranking.test.ts`**: Update snapshot tests to include `releaseDate` field
