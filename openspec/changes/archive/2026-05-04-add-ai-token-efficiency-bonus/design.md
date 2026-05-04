## Context

The AI domain fetches Artificial Analysis model data, normalizes it in `ArtificialAnalysisClient`, and ranks eligible frontier models in `ModelRankingService`. The current internal ranking score is based only on coding and agentic metrics:

```text
baseScore = coding * 0.4 + agentic * 0.6
```

Artificial Analysis also embeds Intelligence Index token-use data in the model payload under `intelligence_index_token_counts`, including `output_tokens`, `answer_tokens`, and `reasoning_tokens`. `output_tokens` captures generated answer and reasoning tokens used across the Intelligence Index evaluation, which makes it a suitable denominator for intelligence-per-token efficiency.

The existing `/ranking` response contract returns only `model`, `position`, and `score`, with `score` normalized so the first-ranked model has `100`.

## Goals / Non-Goals

**Goals:**

- Reward rankable frontier models that achieve strong coding/agentic intelligence with fewer Artificial Analysis Intelligence Index output tokens.
- Make the bonus adjustable through server configuration using `MODEL_EFFICIENCY_WEIGHT`.
- Keep the ranking endpoint deterministic for all consumers by avoiding request-level weighting.
- Preserve the existing `/ranking` response shape and normalized top score behavior.
- Keep models rankable when token-use data is unavailable, while withholding the efficiency bonus for those models.
- Fail fast when the configured weight is invalid.

**Non-Goals:**

- Do not add price efficiency or use any pricing fields in ranking.
- Do not expose efficiency details, token counts, or base score in `/ranking` responses.
- Do not add a new endpoint or query parameter for alternate rankings.
- Do not change the existing coding/agentic intelligence weights.
- Do not infer token counts when Artificial Analysis does not provide valid output-token data.

## Decisions

### Use server configuration for the efficiency weight

`MODEL_EFFICIENCY_WEIGHT` will be read from shared configuration with a default of `0.30`. Valid values are finite numbers from `0` through `1` inclusive. Invalid values should fail startup instead of silently falling back or clamping.

Alternatives considered:

- Query parameter: rejected because it would make `/ranking` order vary per request and complicate caching/consumers.
- Hardcoded constant: rejected because the desired behavior is adjustable without code changes.
- Silent fallback or clamping: rejected because ranking behavior would be hard to diagnose after misconfiguration.

### Calculate efficiency from the existing internal intelligence score

Efficiency will use the current ranking intelligence signal as the numerator:

```text
efficiency = baseScore / (outputTokens / 1_000_000)
```

This keeps efficiency aligned with the service's ranking purpose: coding and agentic capability, not Artificial Analysis' broader Intelligence Index.

Alternatives considered:

- Artificial Analysis `intelligence_index`: rejected because it can diverge from this service's coding/agentic ranking intent.
- Artificial Analysis `intelligence_index_per_m_output_tokens`: rejected because it bakes in AA's intelligence definition instead of the service's current score.

### Use `output_tokens` as the token denominator

The denominator will be `intelligence_index_token_counts.output_tokens`. This includes generated answer and reasoning tokens, capturing the model-side token cost of completing the Intelligence Index evaluations.

Alternatives considered:

- `reasoning_tokens`: rejected because it ignores answer length.
- `input_tokens + output_tokens`: rejected because input size is benchmark-driven and can dilute the model efficiency signal.

### Apply a multiplicative relative bonus

The final internal score will apply a bounded multiplicative bonus based on relative efficiency:

```text
baseScore = coding * 0.4 + agentic * 0.6
efficiency = baseScore / (outputTokens / 1_000_000)
efficiencyRelative = efficiency / bestEfficiency
finalInternalScore = baseScore * (1 + MODEL_EFFICIENCY_WEIGHT * efficiencyRelative)
```

The response `score` remains normalized from `finalInternalScore`:

```text
score = finalInternalScore / topFinalInternalScore * 100
```

This lets a weight of `0.30` grant up to a 30% internal bonus to the most efficient model while keeping weaker but efficient models anchored to their base intelligence.

Alternatives considered:

- Additive points: rejected because it can overpromote low-base models by adding the same point bonus regardless of intelligence.
- Weighted blend of base and efficiency: rejected because it replaces the ranking's primary intelligence orientation rather than adding a controlled bonus.

### Missing or invalid token data gives no bonus

Models with missing, zero, negative, or non-finite `output_tokens` remain eligible if they satisfy the existing frontier/coding/agentic filters, but their efficiency contribution is zero. If no rankable model has valid token data, the ranking behaves like the base ranking.

Alternatives considered:

- Exclude models with missing tokens: rejected because it would make the ranking fragile against partial AA payload changes.
- Fail the request: rejected because token-use data is additive ranking information, not core eligibility.

### Efficiency participates in deterministic tie-breaking

Sorting will compare final internal score first, then efficiency descending, then agentic descending, then coding descending, then model name ascending. This preserves deterministic output while preferring the model that achieved an equal final score with fewer tokens.

Alternatives considered:

- Keep current tie-breakers: rejected because equal final scores should respect the newly introduced efficiency signal.
- Prefer base score before efficiency: rejected because it weakens the configured efficiency preference in exact ties.

## Risks / Trade-offs

- Artificial Analysis payload structure changes → Parsing should be covered by focused tests and existing fallback behavior should keep rankable models available without token bonuses.
- Default `MODEL_EFFICIENCY_WEIGHT=0.30` materially changes ranking order → This is intentional; the configured default represents a strong efficiency preference.
- `/ranking` response does not explain why a model moved up → Keep the existing response contract for now; operational debugging can inspect parsed fields and tests.
- Missing token data can favor models with complete token data over incomplete rows → Missing rows receive no bonus but still compete on base score, avoiding accidental exclusion.
- Floating-point precision can create unstable near-ties → Use unrounded internal values for sorting and existing rounded output only for response scores.
