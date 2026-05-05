## Context

The AI ranking domain normalizes Artificial Analysis model data and ranks explicit reasoning models using coding and agentic scores. The current ranking service also calculates an output-token efficiency bonus from `intelligenceIndexOutputTokens`, then folds that bonus into `finalInternalScore` before sorting and producing relative `score` values.

The response already exposes `tokensPerSecond` as informational metadata. This change applies the same response-only treatment to output token counts by adding `outputTokensMillions` and removing output-token efficiency from ranking math.

## Goals / Non-Goals

**Goals:**

- Rank models only by the weighted intelligence score derived from `coding` and `agentic`.
- Return `outputTokensMillions` on each ranked model using the normalized Artificial Analysis output-token count expressed as rounded millions.
- Keep `tokensPerSecond` and `outputTokensMillions` from affecting eligibility, order, tie-breaks, and score calculation.
- Simplify ranking logic by removing efficiency-specific scoring and tie-breaking.

**Non-Goals:**

- Change how Artificial Analysis data is fetched, cached, or parsed.
- Change reasoning-model eligibility rules or slug exclusions.
- Reintroduce price, token, or speed signals into ranking.
- Rename the internal normalized field `intelligenceIndexOutputTokens` unless implementation finds a small type cleanup useful.

## Decisions

1. Use `outputTokensMillions` as the public response field.

   Rationale: it makes the response unit explicit while avoiding the longer internal field name. Values are rounded to whole millions for concise display. Alternative considered: `intelligenceIndexOutputTokens`, which is more precise but unnecessarily verbose for response consumers.

2. Remove output-token efficiency from the internal score instead of setting its weight to zero.

   Rationale: deleting the ranking path avoids future confusion where a dormant `WEIGHT_EFFICIENCY` still appears to be a supported scoring feature. Alternative considered: set `WEIGHT_EFFICIENCY = 0`, but that leaves unused efficiency code and tests around a behavior that should no longer exist.

3. Keep deterministic tie-breaks based on intelligence fields and model name only.

   Rationale: output-token counts are metadata, so using them as a tie-break would still let tokens influence ranking. Equal base scores should fall through to existing intelligence tie-breaks and then lexical model ordering.

## Risks / Trade-offs

- Existing consumers may expect efficiency-adjusted ranking order → Update tests and specs to make the new ranking contract explicit.
- API response shape expands with `outputTokensMillions` → Keep the field nullable and sourced from already-normalized data to avoid fetch/parser changes.
- Historical score comparisons may shift → This is intended because scores become pure relative intelligence scores.
