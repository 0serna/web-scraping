## Why

The current ranking based on normalized `coding_index` unfairly favors models that emit many tokens. Artificial Analysis shows "Intelligence vs. Output Tokens" charts suggesting a more useful metric: coding ability per emitted token. We want the ranking to represent coding efficiency, but with a sub-linear token penalty so that raw coding ability still carries meaningful weight.

## What Changes

- **BREAKING**: The ranking metric changes from normalized `coding_index` to `coding_index⁶ / sqrt(output_tokens)` — coding to the sixth power makes coding strongly dominant; only dramatically more efficient lower-coding models can beat higher-coding ones.
- **BREAKING**: Models without a positive `output_tokens` are no longer rankable (previously they were accepted with a neutral adjustment).
- **BREAKING**: Public response adds `coding` field (rounded integer) to show the absolute coding score behind each efficiency rank.
- Replace the bounded efficiency adjustment system (`ai-token-efficiency-bonus`) with sixth-power-efficiency as the primary metric.
- Apply slug prefix exclusion before computing scores and top score.
- Tie-breakers become: efficiency `coding⁶ / sqrt(output_tokens)` → `coding_index` → `output_tokens` → name.

## Capabilities

### New Capabilities

- `coding-efficiency-ranking`: Ranking by `coding_index⁶ / sqrt(output_tokens)` as the primary metric, with ties broken by absolute coding and tokens, and `coding` included in the public response.

### Modified Capabilities

- `coding-only-ranking`: Eligibility now requires `output_tokens > 0`; scoring changes from normalized coding to cubic-efficiency; tie-breakers are updated; response adds `coding` field.
- `ai-model-ranking`: Same changes as `coding-only-ranking` for eligibility, scoring, tie-breakers, and response shape.
- `model-exclusion-filter`: Confirm that exclusion happens before scoring.
- `min-score-filter`: The minimum filter is removed to return all rankable models ordered by efficiency.

### Removed Capabilities

- `ai-token-efficiency-bonus`: Replaced by sqrt-efficiency as the primary metric.

## Impact

- `src/domains/ai/services/model-ranking-service.ts`: New eligibility (requires `output_tokens`), new score calculation (`coding⁶ / sqrt(tokensM)`), new tie-breakers, move slug exclusion before scoring, add `coding` to response.
- `src/domains/ai/services/artificial-analysis-client.ts`: Cache rankability now requires `output_tokens` in addition to `coding`.
- `src/domains/ai/types/ranking.ts`: Add `coding: number` to `RankedModel` interface.
- `src/domains/ai/services/model-ranking-service.test.ts`: Rewrite scoring, eligibility, tie-breaker tests, and add `coding` to all expectations.
- `src/domains/ai/services/artificial-analysis-client.test.ts`: Update cache rankability tests.
- `src/domains/ai/routes/ranking.test.ts`: Add `coding` to mock responses.
