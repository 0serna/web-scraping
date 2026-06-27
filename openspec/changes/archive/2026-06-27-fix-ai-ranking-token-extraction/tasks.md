## 1. Parser and Types

- [x] 1.1 Update `RawArtificialAnalysisModel` to represent `canonicalIntelligenceIndexTokenCount.output`.
- [x] 1.2 Update token resolution to read positive output-token counts from `canonicalIntelligenceIndexTokenCount.output`.
- [x] 1.3 Ensure normalized `ArtificialAnalysisModel.intelligenceIndexOutputTokens` remains the downstream token-count field.

## 2. Merge and Ranking Behavior

- [x] 2.1 Verify performance-data extraction carries output-token counts into `PerformanceData`.
- [x] 2.2 Verify metadata/performance merge preserves `intelligenceIndexOutputTokens` by slug.
- [x] 2.3 Verify ranking still returns rounded token millions and `null` for missing or invalid token counts.

## 3. Tests and Validation

- [x] 3.1 Update AI client tests to cover `canonicalIntelligenceIndexTokenCount.output` parsing.
- [x] 3.2 Update ranking or merge tests to assert valid token counts survive into ranked results.
- [x] 3.3 Run `npm test` and `npm run check`.
- [x] 3.4 Validate `GET /ai/ranking` locally returns non-null `tokens` for models whose payload includes valid canonical output-token counts.
