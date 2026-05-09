## Why

AI model rankings currently let output-token counts influence both score calculation and tie-breaking, which can move a lower-intelligence model ahead of a stronger one. The response field name `output` is also ambiguous, so the API should describe that metadata more clearly while keeping tokens informational only.

## What Changes

- Remove the bounded output-efficiency adjustment from AI ranking score calculation.
- Remove output-token counts from AI ranking tie-break rules.
- **BREAKING** Rename the ranking response field `output` to `tokens` while keeping the same rounded-millions value sourced from `intelligenceIndexOutputTokens`.
- Keep output-token data in the ranking response as informational metadata only.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Ranking scores and ordering will no longer use output-token data, and the response field will change from `output` to `tokens`.
- `ai-token-efficiency-bonus`: Output-token parsing remains, but token counts no longer apply any bonus, penalty, or tie-break behavior in ranking.

## Impact

- Affected code: `src/domains/ai/services/model-ranking-service.ts`, `src/domains/ai/types/ranking.ts`, and `src/domains/ai/routes/ranking.ts`.
- API response: ranked model items will return `tokens: number | null` instead of `output: number | null`.
- Ranking behavior: `intelligenceIndexOutputTokens` will no longer affect eligibility, order, tie-breaks, or relative score calculation.
- Tests: ranking service and route tests will need updated expectations for ordering, scores, and response shape.
