## Context

`ModelRankingService.getRanking()` fetches all models from Artificial Analysis, filters for rankable frontier models (slug + frontierModel + coding + agentic), scores them, and returns a ranked list. There is currently no mechanism to exclude specific models or model families from the ranking.

Claude models appear in the AA data but we have no access to them. They clutter the ranking without providing value.

## Goals / Non-Goals

**Goals:**

- Exclude models matching configurable slug prefixes from the ranking
- Keep the exclusion generic (array of prefixes) for future extensibility
- Maintain all existing ranking behavior (frontier filter, scoring, relative scores, tie-breaking)

**Non-Goals:**

- Excluding models at the fetch/cache level (client stays untouched)
- Dynamic configuration via env vars or config files (hardcoded constant for now)
- Excluding by model name or other fields (slug prefix only)

## Decisions

### Filter placement: ranking service, not client

The exclusion filter goes in `ModelRankingService` after the `isRankableFrontierModel` filter, before scoring.

**Rationale:** The client returns raw data. Exclusion is a ranking decision. If we later need excluded models for other purposes, they remain available from the client.

**Alternatives considered:**

- Filter in `ArtificialAnalysisClient.getModels()` — rejected because it conflates data fetching with business logic
- Filter in the route layer — rejected because it's a ranking concern, not an HTTP concern

### Identification: slug prefix matching

Use `slug.startsWith(prefix)` to match excluded models.

**Rationale:** AA slugs follow predictable patterns (`claude-4-sonnet`, `claude-3-opus`). Prefix matching catches all current and future variants. It's simple and performant.

**Alternatives considered:**

- Regex — overkill for prefix matching
- Model name matching — fragile, names can change format

### Configuration: hardcoded constant

```typescript
const EXCLUDED_SLUG_PREFIXES: readonly string[] = ["claude"];
```

**Rationale:** Simple, discoverable, easy to modify in code. No need for runtime flexibility yet.

**Alternatives considered:**

- Environment variable — premature optimization for a single entry
- Config file — adds complexity without benefit

## Risks / Trade-offs

- **[Risk] AA changes Claude slug format** → Mitigation: easy to spot in output, easy to update constant
- **[Risk] Excluded model was the top-ranked model** → Mitigation: ranking still works correctly, next model becomes position 1 with score 100
