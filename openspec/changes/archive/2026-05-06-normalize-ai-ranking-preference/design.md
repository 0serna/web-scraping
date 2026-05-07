## Context

`ModelRankingService` currently filters eligible reasoning models, computes a raw weighted base score from Artificial Analysis `agentic` and `coding` indices, applies the output-token efficiency adjustment, sorts the models, and then converts the top adjusted score into a public `score: 100` baseline. This mixes two concerns inside the base score: our explicit 70/30 preference weighting and the raw range of each upstream index.

The desired behavior is to keep the same filtering, output-adjustment, and public relative-score response shape while changing the internal base score to reflect our own preference semantics. The conversation converged on a simple normalization strategy: calculate per-run `maxAgentic` and `maxCoding` over the already eligible ranking set, normalize each model relative to those maxima, apply the 70/30 weighting to the normalized values, then apply the existing output-token efficiency adjustment.

## Goals / Non-Goals

**Goals:**

- Make the internal ranking score reflect our preference between agentic and coding ability rather than the raw observed ranges of the upstream metrics.
- Keep normalization scoped to the same eligible model universe that actually competes in the ranking.
- Preserve the existing public response contract: relative scores, top model at 100, and output token information.
- Preserve the existing output-token adjustment as a secondary modifier after the normalized preference score is computed.
- Keep tie-breaks deterministic and aligned with the new normalized-score semantics.

**Non-Goals:**

- Changing eligibility rules, exclusion prefixes, or response fields.
- Introducing a more complex normalization strategy such as percentile-based baselines or z-score standardization.
- Changing the output-token adjustment formula or its constants.
- Making ranking stable across dataset changes; normalization remains relative to the eligible set of each run.

## Decisions

### Normalize within the eligible comparison set

The service will continue filtering models first, then compute `maxAgentic` and `maxCoding` from only those eligible models. This keeps normalization consistent with the actual comparison universe and avoids invisible influence from excluded or ineligible models.

Alternative considered: normalize against all scraped models or all reasoning models. Rejected because it would let non-competing models shape the scale of the ranking.

### Use exact per-run maxima as the normalization baseline

Each normalized dimension will be computed as `(value / maxValue) * 100`, using the maximum eligible value observed for that dimension in the current run. This is easy to explain and matches the intended semantics: a model at 100 is the best eligible model in that dimension.

Alternative considered: percentile-based normalization (for example p95). Rejected because it adds method complexity without a demonstrated outlier problem in the current ranking set.

### Apply output-token adjustment after normalized preference scoring

The output-efficiency multiplier remains in place and continues to operate on a base score, but that base score becomes the normalized 70/30 preference score instead of the raw weighted score. This preserves the existing separation between core preference ranking and secondary efficiency adjustment.

Alternative considered: remove output adjustment entirely. Rejected because current ranking behavior intentionally uses output efficiency as a secondary differentiator.

### Align deterministic tie-breaks with normalized semantics

When adjusted internal scores tie, the service will compare normalized agentic descending, then normalized coding descending, then lower valid output-token count, then model name ascending. The tie-break should reinforce the same relative preference semantics used for the main score, rather than reintroducing raw-score semantics at the last step.

Alternative considered: keep raw agentic and coding tie-breaks. Rejected because it would mix two competing ranking interpretations.

### Preserve public relative scoring

After sorting by adjusted internal score, the top model still defines `score: 100`, and all returned public scores remain relative percentages of that first-ranked adjusted internal score. This keeps the API stable while changing only the internal meaning of the ordering.

## Risks / Trade-offs

- [Per-run scale drift] -> Rankings can shift when a new top model enters or leaves the eligible set; this is accepted because the ranking is intentionally relative to the current competition set.
- [Outlier sensitivity] -> Exact-max normalization can compress the rest of a dimension if one model is far ahead; mitigation is to keep the method simple now and revisit only if real data shows distortion.
- [Spec/test drift] -> Existing tests and specs likely assume raw weighted score semantics; mitigation is to update both spec deltas and ranking tests together.
- [Edge-case maxima] -> A zero or non-positive maximum could break normalization if all eligible values collapse; mitigation is to rely on existing non-positive top-score failure behavior and cover degenerate cases in tests.
