## 1. Ranking Calculation

- [x] 1.1 Rename output-efficiency bonus constants, helpers, and internal terminology to output-efficiency adjustment terminology where appropriate.
- [x] 1.2 Update adjusted score calculation to apply `1 + clamp(maximumAdjustment * (1 - outputTokens / outputTokenThreshold), -maximumAdjustment, maximumAdjustment)` for finite positive output-token counts.
- [x] 1.3 Preserve neutral scoring for missing, null, invalid, or non-positive output-token counts.
- [x] 1.4 Preserve existing ranking response fields without adding multiplier or adjustment details.

## 2. Tests

- [x] 2.1 Update ranking service tests for below-threshold positive adjustment behavior.
- [x] 2.2 Add or update tests for threshold-neutral behavior at the output-token threshold.
- [x] 2.3 Add tests for above-threshold capped penalty behavior.
- [x] 2.4 Add or update tests proving missing output-token data remains neutral and rankable.
- [x] 2.5 Confirm deterministic tie-breaks still prefer lower valid output-token counts after adjusted score, agentic score, and coding score.

## 3. Verification

- [x] 3.1 Run `npm test` and fix failures caused by this change.
- [x] 3.2 Run `npm run check` and fix validation, lint, format, dead-code, spec, or type failures caused by this change.
- [x] 3.3 Run `openspec validate --change penalize-high-output-token-models --strict` and fix spec issues.
