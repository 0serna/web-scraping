## Context

The AI ranking endpoint currently fetches Artificial Analysis data, filters eligible models, sorts by rounded coding score, and returns `rank`, `model`, `coding`, and `tokens`. DeepSWE exposes leaderboard artifacts as static JSON at versioned paths, with `v1.1` as the current visible version and `v1` still available. The DeepSWE UI uses each row's `pass_rate` as the displayed DeepSWE score.

DeepSWE does not provide a public `latest` artifact alias and does not share a perfect model identifier with Artificial Analysis. Matching must therefore be explicit enough to avoid assigning the wrong benchmark score.

## Goals / Non-Goals

**Goals:**

- Add `deepSwe` to each ranked model response item as informational benchmark enrichment.
- Use DeepSWE `pass_rate` as an integer percentage from 0 to 100.
- Fetch `v1.1` first and fallback to `v1` when `v1.1` cannot be fetched or parsed.
- Preserve ranking eligibility, sorting, rank assignment, and existing response fields.
- Avoid failing the ranking endpoint when DeepSWE enrichment is unavailable.

**Non-Goals:**

- Do not use DeepSWE scores to alter ranking order or eligibility.
- Do not add flexible or fuzzy model matching.
- Do not parse the DeepSWE application bundle to discover versions dynamically.
- Do not expose DeepSWE metadata such as version, confidence interval, cost, or token counts.

## Decisions

### Use versioned artifact URLs with ordered fallback

The enrichment will read DeepSWE leaderboard JSON from known versioned artifact paths in order: `v1.1`, then `v1`. There is no working `/artifacts/latest/leaderboard-live.json` alias, and parsing the frontend bundle for the active version would couple the scraper to minified application internals.

Alternative considered: parse the website bundle to find the active version. Rejected because it is more fragile than a small ordered fallback list.

### Treat `pass_rate` as the source score

The DeepSWE UI labels the graph axis as "DeepSWE score" and plots each row's `pass_rate`. The API field `deepSwe` will expose `Math.round(pass_rate * 100)`.

Alternative considered: expose raw decimal `pass_rate`. Rejected because the existing ranking response exposes rounded user-facing numbers and the DeepSWE UI displays percentages.

### Enrich by strict model matching

DeepSWE rows identify a base model plus optional `reasoning_effort`; Artificial Analysis ranking entries contain slugs that may encode effort. Matching should only assign `deepSwe` when the Artificial Analysis slug can be normalized to a DeepSWE model and effort pair with high confidence. Otherwise, return `null`.

Alternative considered: fuzzy name matching. Rejected because false positives would be more harmful than missing optional enrichment.

### Keep DeepSWE failures non-blocking

DeepSWE data is auxiliary. If every DeepSWE artifact fetch fails, parsing fails, or no strict match exists, the ranking endpoint should continue returning the Artificial Analysis ranking with `deepSwe: null` values.

Alternative considered: fail the endpoint when DeepSWE is unavailable. Rejected because the primary ranking source remains valid and should not depend on optional enrichment.

## Risks / Trade-offs

- DeepSWE releases a newer version such as `v1.2` → Update the ordered version list when adopting the new score source.
- Strict matching misses valid scores for renamed models → Return `null` rather than risk incorrect enrichment.
- DeepSWE changes artifact schema → Treat enrichment as unavailable and keep the ranking response usable.
- Additional network request increases latency → Cache or reuse DeepSWE data similarly to existing source data if needed during implementation.
