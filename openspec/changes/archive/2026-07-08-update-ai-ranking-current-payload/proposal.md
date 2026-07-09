## Why

Artificial Analysis changed its model payload from the legacy snake_case field shape to the current camelCase field shape. The AI ranking now fails because fresh scraped data no longer validates as containing rankable models.

## What Changes

- Update Artificial Analysis model normalization to use the current payload fields, including `shortName`, `codingIndex`, `deprecated`, and `canonicalIntelligenceIndexTokenCount.output`.
- **BREAKING**: Remove legacy snake_case Artificial Analysis field support from the AI ranking parser.
- **BREAKING**: Remove price and frontier metadata from the normalized AI ranking model because they are no longer ranking-domain concepts.
- Keep ranking eligibility based on slug, valid coding score, and non-deprecated lifecycle status.
- Keep configured slug-prefix exclusions unchanged.
- Preserve slug-based merge behavior across payload chunks using only current ranking-domain fields.
- Add parser-level diagnostic failures when the current payload shape is missing required ranking signals such as `codingIndex`.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ai-model-ranking`: Ranking source normalization changes to the current Artificial Analysis payload and removes price/frontier as ranking-domain inputs.
- `coding-only-ranking`: Eligibility language removes legacy price/frontier assumptions while preserving coding-only ranking behavior.
- `model-data-merge`: Merge requirements change from legacy performance fields to current ranking-domain fields.

## Impact

- Affected source: `src/domains/ai/services/artificial-analysis-client.ts`, `src/domains/ai/services/model-ranking-service.ts`, and `src/domains/ai/types/ranking.ts`.
- Affected tests: Artificial Analysis parser tests, model ranking service tests, and route expectations if normalized model fixtures include removed fields.
- Affected specs: AI ranking, coding-only ranking, and model data merge requirements.
- Public `/ranking` response shape remains unchanged: `rank`, `model`, `coding`, `tokens`, and `deepSwe`.
