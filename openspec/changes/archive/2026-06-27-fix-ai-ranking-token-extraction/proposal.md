## Why

The AI model ranking currently returns `tokens: null` for every model because Artificial Analysis changed its token-count field from the legacy `intelligence_index_token_counts.output_tokens` shape to `canonicalIntelligenceIndexTokenCount.output`.

## What Changes

- Update AI model data parsing to recognize the current Artificial Analysis canonical intelligence token-count field.
- Preserve output-token counts through performance-data extraction and model-data merge.
- Keep existing ranking behavior: models without valid positive output-token counts remain eligible with `tokens: null`, and valid token counts are exposed as rounded millions.
- No API response shape changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Ranking token extraction source changes from the legacy snake_case token-count field to the current canonical intelligence token-count field.
- `coding-only-ranking`: Token-count scenarios align with the current Artificial Analysis token-count field used by the ranking.
- `model-data-merge`: Performance-data merge preserves output-token counts in addition to existing performance fields.

## Impact

- Affected source: `src/domains/ai/services/artificial-analysis-client.ts`, `src/domains/ai/types/ranking.ts`.
- Affected tests: AI client parsing tests, model ranking service tests, and route-level expectations if token assertions exist.
- External dependency: Artificial Analysis page payload shape.
- Public API remains unchanged: ranking items still include `rank`, `model`, `coding`, and `tokens`.
