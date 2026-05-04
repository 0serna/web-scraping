## 1. Types

- [x] 1.1 Add `tokensPerSecond` field to `ArtificialAnalysisModel` interface in `src/domains/ai/types/ranking.ts`
- [x] 1.2 Add `tokensPerSecond` field to `RankedModel` interface in `src/domains/ai/types/ranking.ts`
- [x] 1.3 Add `performanceByPromptLength` to `RawArtificialAnalysisModel` interface

## 2. Client — Extract speed data

- [x] 2.1 Add helper to extract `median_output_speed` from `performanceByPromptLength` for `medium_coding` type in `artificial-analysis-client.ts`
- [x] 2.2 Update `normalizeModel` to populate `tokensPerSecond` from extracted speed data
- [x] 2.3 Update `toPerformanceData` to include `tokensPerSecond` for performance data merging
- [x] 2.4 Add unit tests for speed extraction: present, missing array, missing `medium_coding` entry

## 3. Service — Pass through to ranking

- [x] 3.1 Update `toScoredModel` to carry `tokensPerSecond` from source model
- [x] 3.2 Update `compareFinalModels` to include `tokensPerSecond` in output (no sorting impact)
- [x] 3.3 Update ranking output mapping to include `tokensPerSecond`
- [x] 3.4 Add unit tests: model with speed data, model without speed data (`null`)

## 4. Route — Response contract

- [x] 4.1 Verify `/ranking` response includes `tokensPerSecond` field (route test)

## 5. Validation

- [x] 5.1 Run `npm run check` to validate TypeScript, linting, and formatting
- [x] 5.2 Run `npm test` to verify all tests pass
