## Context

The AI model ranking pipeline fetches HTML from `artificialanalysis.ai/models/gpt-5-5`, parses Next.js flight payload chunks to extract model metadata, and ranks reasoning models by a weighted score of coding (0.4) and agentic (0.6) indices. The current `ArtificialAnalysisModel` type has no date field, and the ranking includes all eligible models regardless of age.

Artificial Analysis exposes a `release_date` field in the raw payload (format: `YYYY-MM-DD`, e.g., `"2026-04-23"`), confirmed via Playwright inspection. The field appears in the same JSON objects that contain `coding_index`, `agentic_index`, `short_name`, etc.

## Goals / Non-Goals

**Goals:**

- Extract `release_date` from the raw payload and propagate it through the model data pipeline
- Filter the ranking to only include models released within the last 90 days (configurable via internal constant)
- Include `releaseDate` in the ranking response so consumers can see when each model was released
- Models without a release date remain included with `releaseDate: null`

**Non-Goals:**

- No API parameter to control the filter — it is always active as an internal constant
- No pre-cache filtering — the cache continues to store all models; filtering happens post-cache
- No change to the scoring algorithm or tie-breaking logic
- No migration or rollback plan needed (internal filter, no breaking changes)

## Decisions

### 1. Field name: `releaseDate` (camelCase)

The raw payload uses `release_date` (snake_case). We normalize to `releaseDate` (camelCase) to match the existing convention (`reasoningModel`, `frontierModel`, `tokensPerSecond`).

### 2. Type: `string | null`

Store as ISO date string (`"2026-04-23"`) rather than `Date` object or timestamp. This avoids timezone serialization issues and matches the source format exactly. `null` for models where the field is missing or unparseable.

### 3. Filter position: after reasoning filter, before scoring

```
getModels() → reasoning filter → release date filter → slug exclusion → score → sort → return
```

Placing the filter before scoring ensures the top-ranked model (score 100) is always a recent model. If we filtered after scoring, the relative scores would be based on potentially outdated models.

### 4. Models without release date: included, not excluded

Models where `releaseDate` is `null` pass the filter. This avoids breaking the ranking if Artificial Analysis stops providing dates for some models. The filter only excludes models with a known `releaseDate` older than the cutoff.

### 5. Cutoff calculation: `Date.now() - (RECENT_MODEL_WINDOW_DAYS * 86_400_000)`

Simple subtraction from current time. The comparison treats the ISO date string as UTC midnight (`new Date("2026-04-23")`), which is consistent and predictable.

### 6. Constant location: top of `model-ranking-service.ts`

```ts
const RECENT_MODEL_WINDOW_DAYS = 90;
```

Hardcoded as an internal constant, not a config or env var. Easy to change when needed, no deployment complexity.

## Risks / Trade-offs

| Risk                                                  | Mitigation                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Artificial Analysis changes `release_date` field name | Existing parsing already handles missing fields gracefully (returns `null`); ranking degrades to include-all behavior |
| All models fall outside the 90-day window             | The `null` release date models still pass the filter; if zero models remain, existing error handling applies          |
| Timezone edge cases at month boundaries               | ISO dates without time are treated as UTC midnight by JavaScript; consistent behavior across environments             |
| Future models with future release dates               | Models with `releaseDate` in the future pass the filter (they are "recent" by definition); acceptable behavior        |
