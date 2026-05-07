## 1. AI Domain - artificial-analysis-client.ts

- [x] 1.1 Refactor `parseModelsFromHtml` (cyclomatic 9) - Extract fallback strategy functions
- [x] 1.2 Refactor `extractBalancedJsonText` (cyclomatic 7) - Extract state machine helpers
- [x] 1.3 Refactor `extractPerformanceDataFromChunk` (cyclomatic 7) - Extract data extraction steps
- [x] 1.4 Refactor `extractModelsFromPerformanceObjects` (cyclomatic 7) - Extract transformation pipeline
- [x] 1.5 Refactor `normalizeModel` (cyclomatic 6) - Use early returns and guard extraction

## 2. AI Domain - model-ranking-service.ts

- [x] 2.1 Refactor `compareFinalModels` (cyclomatic 7) - Extract comparison chain
- [x] 2.2 Refactor `isRankableReasoningModel` (cyclomatic 5) - Simplify guard conditions

## 3. BVC Domain - trii-client.ts

- [x] 3.1 Refactor `parseTriiStockListHtml` (cyclomatic 8) - Extract regex parsing helpers

## 4. BVC Domain - ticker.ts

- [x] 4.1 Refactor route handler (cyclomatic 8) - Extract fallback logic into helper

## 5. BVC Domain - tradingview-client.ts

- [x] 5.1 Refactor `getPriceByTicker` (cyclomatic 5) - Extract validation and caching logic

## 6. Game Domain - steam-details-api-client.ts

- [x] 6.1 Refactor `getGameDetailsByAppId` (cyclomatic 7) - Extract error handling chain
- [x] 6.2 Refactor `parseReleaseYear` (cyclomatic 5) - Simplify conditional logic

## 7. Game Domain - steam-reviews-api-client.ts

- [x] 7.1 Refactor `getScoreByAppId` (cyclomatic 6) - Extract error handling

## 8. Game Domain - steam-url-parser.ts

- [x] 8.1 Refactor `extractAppId` (cyclomatic 5) - Use early returns

## 9. Game Domain - info.ts

- [x] 9.1 Refactor route handler (cyclomatic 5) - Extract validation logic

## 10. Shared Domain - upstash-cache.ts

- [x] 10.1 Refactor `getOrFetchValidated` (cyclomatic 5) - Extract validation steps

## 11. Verification

- [x] 11.1 Run `npm test` - Verify all 156 tests pass
- [x] 11.2 Run `npm run check` - Verify check is green
