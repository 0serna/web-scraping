## 1. Ranking score normalization

- [x] 1.1 Update `src/domains/ai/services/model-ranking-service.ts` to compute eligible-set `maxAgentic` and `maxCoding` before scoring models.
- [x] 1.2 Replace the raw weighted base-score calculation with per-dimension normalization to 0-100 followed by the existing 70/30 preference weighting.
- [x] 1.3 Update sorting and tie-break logic to use normalized agentic and coding values while preserving output-token and model-name tie-break behavior.

## 2. Efficiency adjustment integration

- [x] 2.1 Apply the existing output-token efficiency adjustment to the normalized preference base score instead of the raw weighted score.
- [x] 2.2 Preserve existing handling for missing or invalid output-token counts and non-positive top-score failure behavior.

## 3. Verification

- [x] 3.1 Update `src/domains/ai/services/model-ranking-service.test.ts` to cover eligible-set normalization, normalized tie-breaks, and output-adjusted ranking behavior.
- [x] 3.2 Run the project check suite and tests, then fix any ranking-related regressions.
