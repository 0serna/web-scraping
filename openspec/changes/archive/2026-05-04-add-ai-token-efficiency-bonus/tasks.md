## 1. Configuration

- [x] 1.1 Add `WEIGHT_EFFICIENCY` constant to `model-ranking-service.ts` with value `0.30`.
- [x] 1.2 Validation not needed - constant is controlled in code, not environment.

## 2. Artificial Analysis Token Data

- [x] 2.1 Extend AI ranking types to carry optional Intelligence Index output-token counts.
- [x] 2.2 Parse `intelligence_index_token_counts.output_tokens` from Artificial Analysis model objects when finite and positive.
- [x] 2.3 Merge parsed output-token counts by slug across metadata, performance, and embedded model sources.
- [x] 2.4 Add client/parser tests for parsed token counts, missing token counts, invalid token counts, and slug-based merging.

## 3. Ranking Score Calculation

- [x] 3.1 Inject or read the configured efficiency weight in `ModelRankingService` without changing route response shape.
- [x] 3.2 Calculate each rankable model's base score from existing coding and agentic weights.
- [x] 3.3 Calculate token efficiency as base score per million valid output tokens.
- [x] 3.4 Apply the multiplicative relative efficiency bonus to produce the final internal score.
- [x] 3.5 Keep models with missing or invalid output-token data rankable with no efficiency bonus.
- [x] 3.6 Preserve base ranking behavior when the configured weight is `0` or no rankable model has valid output-token data.
- [x] 3.7 Update sorting to use final internal score, then efficiency, then agentic, coding, and model name.
- [x] 3.8 Normalize public `score` from the final internal score so the top-ranked model remains `100`.

## 4. Ranking Tests

- [x] 4.1 Add tests proving `MODEL_EFFICIENCY_WEIGHT=0` preserves current base ranking.
- [x] 4.2 Add tests proving `MODEL_EFFICIENCY_WEIGHT=0.30` can promote a more token-efficient model above a higher base-score model.
- [x] 4.3 Add tests proving missing output-token data gives no bonus but does not exclude the model.
- [x] 4.4 Add tests proving no valid token data preserves base ranking.
- [x] 4.5 Add tests proving efficiency breaks equal final-score ties before existing tie-breakers.
- [x] 4.6 Update existing ranking tests whose expected order or scores depend on the default non-zero efficiency weight.

## 5. Validation

- [x] 5.1 Run `npm run check` and fix any formatting, lint, or type errors.
- [x] 5.2 Run `npm test` and fix any failing tests.
