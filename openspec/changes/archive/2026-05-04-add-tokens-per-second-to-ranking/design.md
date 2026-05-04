## Context

The AI model ranking system fetches data from Artificial Analysis (AA) and returns a ranked list of frontier models with intelligence scores. Currently the response includes `model`, `position`, and `score`. Users also want speed data to make more informed decisions.

AA embeds speed data in the model page HTML under `performanceByPromptLength`, an array of objects keyed by prompt length category. Each contains `median_output_speed` (tokens/second). The current scraper already parses the same model object but ignores this nested array.

## Goals / Non-Goals

**Goals:**

- Expose `tokensPerSecond` (number | null) on each ranked model in the API response
- Extract `median_output_speed` from the `medium_coding` prompt length type in AA's embedded data
- Keep the field informational — no impact on ranking order or score

**Non-Goals:**

- No changes to ranking algorithm or scoring weights
- No latency or end-to-end response time metrics (future work)
- No new API endpoints — existing `/ranking` response contract expands

## Decisions

### Use `medium_coding` prompt length type

AA provides speed data for multiple prompt lengths: `100k`, `long`, `medium`, `medium_coding`, `vision_single_image`. We use `medium_coding` because:

- Coding tasks are most representative of our users' use case
- `medium_coding` shows the highest speed (113 t/s for GPT-5.5), reflecting real-world coding performance
- Consistent with the existing `coding_index` focus in the ranking algorithm

**Alternatives considered:**

- `medium`: General-purpose but less relevant for coding-focused ranking
- Average across all types: Noisy, includes vision tasks that aren't comparable
- `100k`: Too specific to long-context scenarios

### Extract from `performanceByPromptLength` in existing HTML parse

The speed data is nested inside the same model object the scraper already parses. We extend the `normalizeModel` function to also extract `performanceByPromptLength` → find the entry with `prompt_length_type === "medium_coding"` → take `median_output_speed`.

**Alternatives considered:**

- Scrape the leaderboard page: Different data structure, no `medium_coding` breakdown
- New API endpoint: AA doesn't offer a public API for this data

### `null` when speed data unavailable

Some models may not have `performanceByPromptLength` or the `medium_coding` entry. We return `null` rather than excluding them — speed is informational, not a ranking factor.

## Risks / Trade-offs

- **AA page structure changes** → The embedded JSON format could change. Mitigated by existing parsing patterns and test coverage.
- **`medium_coding` not always present** → Some models may lack this specific prompt length type. Fallback to `null`.
- **Speed varies by provider** → AA measures first-party API or median across providers. This is acceptable for comparison purposes.
