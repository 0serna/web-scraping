## 1. Types and Response Shape

- [x] 1.1 Add `outputTokensMillions: number | null` to the ranked model response type.
- [x] 1.2 Propagate normalized `intelligenceIndexOutputTokens` into ranked response items as rounded `outputTokensMillions`.

## 2. Ranking Logic

- [x] 2.1 Remove output-token efficiency constants, calculations, and bonus application from model ranking.
- [x] 2.2 Ensure ranking order and relative `score` use only the weighted coding and agentic intelligence score.
- [x] 2.3 Ensure deterministic tie-breaks do not use output-token counts.

## 3. Tests

- [x] 3.1 Update ranking response expectations to include `outputTokensMillions`.
- [x] 3.2 Replace efficiency-promotion tests with coverage proving output tokens do not affect order, tie-breaks, or score calculation.
- [x] 3.3 Add coverage for `outputTokensMillions` being populated from valid source data and `null` when missing or invalid.

## 4. Validation

- [x] 4.1 Run `npm run check`.
- [x] 4.2 Run `npm test`.
