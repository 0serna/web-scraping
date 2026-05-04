## Why

Users comparing AI models want to understand not just intelligence quality but also generation speed. Adding tokens-per-second data to the ranking response helps users choose models that balance intelligence with performance for their use case.

## What Changes

- Add `tokensPerSecond` field to the ranking response items (type `number | null`)
- Extract `median_output_speed` from AA's embedded `performanceByPromptLength` array using `medium_coding` prompt length type
- Parse and normalize the new field through the existing data pipeline (types → client → service → route)
- `tokensPerSecond` is informational only — it does NOT affect ranking order or score calculation

## Capabilities

### Modified Capabilities

- `ai-model-ranking`: Response contract expands to include `tokensPerSecond` per ranked model. No changes to ranking logic, eligibility, or scoring.

### New Capabilities

None.

## Impact

- **Types**: `ArtificialAnalysisModel`, `RankedModel`, `RawArtificialAnalysisModel` in `src/domains/ai/types/ranking.ts`
- **Client**: `artificial-analysis-client.ts` — extract `median_output_speed` from `performanceByPromptLength`
- **Service**: `model-ranking-service.ts` — pass through `tokensPerSecond` to ranking output
- **Route**: `ranking.ts` — response includes new field
- **Tests**: Update existing tests to cover new field
