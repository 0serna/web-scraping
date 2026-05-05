## 1. Type definitions

- [x] 1.1 Add `releaseDate: string | null` to `ArtificialAnalysisModel` interface in `src/domains/ai/types/ranking.ts`
- [x] 1.2 Add `releaseDate?: string` to `RawArtificialAnalysisModel` interface in `src/domains/ai/types/ranking.ts`
- [x] 1.3 Add `releaseDate: string | null` to `RankedModel` interface in `src/domains/ai/types/ranking.ts`
- [x] 1.4 Add `releaseDate: string | null` to `PerformanceData` interface in `src/domains/ai/types/ranking.ts`

## 2. Extraction logic

- [x] 2.1 Add `release_date` extraction in `normalizeModel()` function in `artificial-analysis-client.ts`
- [x] 2.2 Add `releaseDate` field mapping in `toPerformanceData()` function in `artificial-analysis-client.ts`
- [x] 2.3 Add `releaseDate` to `mergePerformanceFields()` merge logic in `artificial-analysis-client.ts`
- [x] 2.4 Write unit tests for `release_date` extraction in `artificial-analysis-client.test.ts`

## 3. Release date filter

- [x] 3.1 Add `RECENT_MODEL_WINDOW_DAYS = 90` constant in `model-ranking-service.ts`
- [x] 3.2 Implement `isModelReleasedWithinWindow(model, cutoffDate)` filter function in `model-ranking-service.ts`
- [x] 3.3 Apply release date filter after reasoning filter and before slug exclusion in `getRanking()` method
- [x] 3.4 Write unit tests for release date filter scenarios (recent, old, null, future dates)

## 4. Response field

- [x] 4.1 Add `releaseDate` field to `toScoredModel()` intermediate type or pass through to final mapping in `model-ranking-service.ts`
- [x] 4.2 Include `releaseDate` in the final `RankedModel` return mapping in `getRanking()` method
- [x] 4.3 Update ranking route response test snapshot in `ranking.test.ts`

## 5. Validation

- [x] 5.1 Run `npm test` and ensure all tests pass
- [x] 5.2 Run `npm run check` (Prettier + ESLint + TypeScript) and fix any issues
