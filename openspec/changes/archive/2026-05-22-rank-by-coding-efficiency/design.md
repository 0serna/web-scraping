## Context

The current ranking computes a score based on `coding_index` normalized across the eligible set, with a bounded efficiency adjustment (`ai-token-efficiency-bonus`) that rewards or penalizes based on distance from a threshold. Models without `output_tokens` rank without adjustment.

The user wants the primary metric to be `coding_index / sqrt(output_tokens)`, giving more weight to coding ability while keeping a sub-linear token penalty. This aligns with Artificial Analysis's "Intelligence vs. Output Tokens" visualization but dampens the impact of extreme token counts via a square root.

`ArtificialAnalysisClient` already parses `intelligence_index_token_counts.output_tokens` and exposes it as `intelligenceIndexOutputTokens`. No scraping changes are needed.

## Goals / Non-Goals

**Goals:**

- Each eligible model's internal score is `coding_index⁶ / sqrt(output_tokens_in_millions)`.
- Models without a positive `output_tokens` are excluded from the ranking.
- Slug prefix exclusion happens before efficiency and top score calculation.
- Tie-breakers: efficiency → `coding_index` → `output_tokens` → name.
- Public response: `{ model, score, tokens, coding }`, where `score` is relative efficiency to the visible top and `coding` is the rounded integer coding index.
- No minimum score filter is applied; the endpoint returns all visible rankable models sorted by efficiency.
- Cache rankability check validates that at least one model has a valid `output_tokens`.

**Non-Goals:**

- No changes to the scraping URL or parsing logic.
- No changes to the response limit.
- No changes to deprecated exclusion or `frontierModel` behavior.
- No cache TTL or caching architecture changes.

## Decisions

### Decision 1: Primary metric = `coding_index⁵ / sqrt(output_tokens)`

The internal score changes from `normalizedCoding` (coding normalized over maxCoding × 100) to `coding_index⁶ / sqrt(output_tokens_in_millions)`. The sixth power strongly amplifies coding differences: a model with twice the coding scores 64× higher, ensuring only dramatically more efficient models with lower coding beat higher-coding ones. Tokens still penalize via the square root, but their impact is much weaker relative to coding.

**Alternatives considered:**

- Keep normalized coding with bounded adjustment: the user explicitly rejected it.
- `coding_index³ / sqrt(output_tokens)`: GPT-5.4 NR (coding 41) still ranked above GPT-5.5 high (coding 59) with scores 51 vs 44.
- `coding_index⁴ / sqrt(output_tokens)`: KAT-Coder (coding 46, score 44) and GPT-5.4 NR (coding 41, score 43) were too close; 135 cases of lower-coding-beats-higher-coding.
- `coding_index⁵ / sqrt(output_tokens)`: reduced those cases to 54, but GPT-5.4 NR (coding 41) was still #8 with score 36.
- **Chosen**: `coding_index⁶ / sqrt(output_tokens)`, reducing to 37 cases and pushing GPT-5.4 NR to #9 with score 30.

### Decision 2: Eligibility requires `output_tokens > 0`

`isRankableModel` goes from `coding !== null` to `coding !== null AND outputTokens > 0`. Without a denominator, the model cannot participate in an efficiency ranking.

**Alternatives considered:**

- Keep models without tokens with neutral score or fallback: mixes two different criteria in the same ranking.
- Place them at the end: conveys an artificial position.
- **Chosen**: Exclude them. Consistent with "pure efficiency".

### Decision 3: Slug prefix exclusion before scoring

Currently the code applies `EXCLUDED_SLUG_PREFIXES` after sorting and computing the top score. The `ai-model-ranking` spec already says "before scoring", but the code does not comply. This change aligns code with spec.

**Rationale**: Excluded models (Claude, Gemini, Muse) should not define the 100% baseline or affect who passes the 70% threshold.

**Alternatives considered:**

- Keep exclusion at the end as currently: an excluded model with high efficiency can inflate the top score, lowering the relative score of accessible models.
- **Chosen**: Move exclusion before sorting and top score calculation.

### Decision 4: New tie-breaker chain

```
1. efficiency (coding / output_tokens) descending
2. coding_index descending
3. output_tokens ascending
4. model name ascending
```

**Alternatives considered:**

- `output_tokens` before `coding_index`: prioritizes austerity even when efficiency is already tied, but `coding_index` is more informative about actual ability.
- Name only: deterministic but ignores useful signals.
- **Chosen**: `coding_index` before `output_tokens`. When efficiency is equal, prefer more absolute ability.

### Decision 5: Public response adds `coding` field

The endpoint `GET /ranking` returns `{ model, score, tokens, coding }`.

- `score` represents relative efficiency to the most efficient visible model.
- `tokens` remains `output_tokens / 1_000_000` rounded.
- `coding` is the raw `coding_index` rounded to the nearest integer, providing visibility into the absolute coding ability behind each model's efficiency.
- No minimum score filter is applied.

**Alternatives considered:**

- Keep `{ model, score, tokens }` only: the user wanted `coding` exposed alongside efficiency.
- Expose `coding` with decimals: the user preferred integer for readability.
- **Chosen**: Add `coding: number` (integer) to the response.

### Decision 6: Remove the bounded efficiency adjustment system

The adjustment constants (`MODEL_EFFICIENCY_MAX_ADJUSTMENT`, `OUTPUT_TOKEN_THRESHOLD`) and all `calculateAdjustedScore` logic are removed. Efficiency becomes the base score, not an adjustment on top of it.

**Alternatives considered:**

- Keep the adjustment on top of the main ratio: redundant; if the metric is already efficiency, an efficiency adjustment on top is circular.
- **Chosen**: Simplify to a single metric.

### Decision 7: Internal metric format

`coding_index` is a number between ~0 and ~100. `output_tokens` is in the order of tens or hundreds of millions.

Internally we work with `coding_index⁶ / sqrt(outputTokensMillions)` where `outputTokensMillions = output_tokens / 1_000_000`. The sixth power of coding produces values up to ~1,000,000,000,000 (for coding 100), while sqrt(tokensM) stays below ~15, keeping intermediate values manageable.

**Alternatives considered:**

- `coding_index⁶ / sqrt(output_tokens)` directly: tiny numbers but equivalent ranking.
- **Chosen**: Use `coding_index⁶ / sqrt(outputTokensMillions)` for readable internal values.

### Decision 8: Cache rankability requires output_tokens

`hasRankableModel` (used by `getOrFetchValidated`) must verify that at least one model has `output_tokens > 0` in addition to valid `coding`. If cached data has no models with tokens, it refetches.

**Alternatives considered:**

- Keep the check with only `coding`: old cached data without tokens would be considered valid even though no model can be ranked.
- **Chosen**: Include `output_tokens` in cache validation.

## Risks / Trade-offs

- **[Risk] Models with high `coding_index` but high `output_tokens` drop significantly** → Mitigation: intentional. The ranking now rewards efficiency. Models with high reasoning (e.g., DeepSeek V4 Flash ~241M tokens) will rank low even with good coding.
- **[Risk] If AA stops publishing `output_tokens` for new models, they disappear from the ranking** → Mitigation: `getModels()` will throw `AiParseError` if no model is rankable. The error monitor will alert.
- **[Risk] Semantic change of `score` in the public response** → Mitigation: document that `score` now represents relative coding/token efficiency, not absolute ability. The `0-100` contract is maintained.
- **[Risk] Slug prefix exclusion before scoring slightly changes current behavior** → Mitigation: the spec already required this behavior; this only aligns the code.
