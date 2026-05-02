## Why

Claude models appear in the AI ranking but we have no access to them. They add noise to the ranking output without providing value. Excluding them by slug prefix gives a cleaner, more relevant ranking.

## What Changes

- Add a hardcoded blocklist of slug prefixes (`EXCLUDED_SLUG_PREFIXES`) in `ModelRankingService`
- Filter out models whose slug starts with any excluded prefix before scoring
- The blocklist is generic (array of prefixes) so additional models can be excluded later by adding to the array

## Capabilities

### New Capabilities

- `model-exclusion-filter`: Exclude models from ranking by slug prefix pattern

### Modified Capabilities

- `ai-model-ranking`: Ranking now excludes models matching the exclusion filter before scoring

## Impact

- `src/domains/ai/services/model-ranking-service.ts` — add exclusion filter
- `src/domains/ai/services/model-ranking-service.test.ts` — add tests for exclusion behavior
- `openspec/specs/ai-model-ranking/spec.md` — add exclusion requirement
