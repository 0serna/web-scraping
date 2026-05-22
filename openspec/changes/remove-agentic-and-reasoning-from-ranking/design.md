## Context

The AI ranking pipeline currently:

1. Parses `coding_index` and `agentic_index` from Artificial Analysis HTML payloads into `ArtificialAnalysisModel.coding` and `.agentic`.
2. Requires both `coding` and `agentic` to be valid for ranking eligibility.
3. Computes an internal score as `normalizedCoding * 0.7 + normalizedAgentic * 0.3`.
4. Uses `normalizedAgentic` as primary tie-breaker.
5. Checks `reasoningModel` in cache validation.

The user wants to simplify the ranking to use only `coding` scores, while also removing the `reasoningModel` field from the internal model entirely. Upstream may continue sending `agentic_index`, `reasoning_model`, and `isReasoning`; these fields are ignored.

## Goals / Non-Goals

**Goals:**

- Ranking eligibility based solely on `slug` + valid `coding` score + not deprecated.
- Internal score is `normalizedCoding` (single dimension, no weight constants).
- Remove `agentic` from types (`ArtificialAnalysisModel`, `RawArtificialAnalysisModel`, `PerformanceData`), parser, and service.
- Remove `reasoningModel` from types and parser.
- Upstream fields `agentic_index`, `reasoning_model`, `isReasoning` are silently ignored.
- Cache rankability check in `ArtificialAnalysisClient` updated to require only valid `coding` (no `agentic`, no `reasoningModel`).
- Tie-breakers: internal score → normalized coding → model name ascending.

**Non-Goals:**

- Do not change `MIN_SCORE_THRESHOLD` behavior or its current value vs test mismatch.
- Do not remove `frontierModel` or any other field not mentioned.
- Do not change output-efficiency adjustment logic except removing `agentic` mentions.
- Do not change the public ranking response shape (`model`, `score`, `tokens`).

## Decisions

### Decision 1: Remove `agentic` entirely from types and parser

Remove `agentic` from `ArtificialAnalysisModel`, `RawArtificialAnalysisModel.agentic_index`, and `PerformanceData`. The `ArtificialAnalysisClient` stops reading `agentic_index` from raw payloads and stops merging `agentic` in performance data merge.

**Alternatives considered:**

- Keep `agentic` in types but ignore in ranking: adds dead fields to the model, inconsistent with the goal of removing agentic from ranking "por completo".
- **Choice**: Remove from types. Upstream can keep sending it; our parser ignores extra fields.

### Decision 2: Remove `reasoningModel` entirely from types and parser

Remove `reasoningModel` from `ArtificialAnalysisModel`, `reasoning_model` and `isReasoning` from `RawArtificialAnalysisModel`. The `ArtificialAnalysisClient` stops normalizing these fields. All models (reasoning and non-reasoning) are eligible if they have valid `coding`.

**Alternatives considered:**

- Keep `reasoningModel` in types but stop filtering: dead field, no benefit.
- Keep it only in parser for observability: adds complexity without clear value.
- **Choice**: Remove entirely.

### Decision 3: Simplify internal score to `normalizedCoding`

`calculateBaseScore(coding)` returns `coding` directly (i.e., `normalizedCoding`). No weight constants needed. `WEIGHT_INTELLIGENCE_CODING` and `WEIGHT_INTELLIGENCE_AGENTIC` are removed.

**Alternatives considered:**

- Keep `WEIGHT_INTELLIGENCE_CODING = 0.7`: top internal score maxes at 70, but relative scoring makes it equivalent to 1.0 for public output. Semantically misleading.
- **Choice**: Remove weights. Score IS normalized coding.

### Decision 4: Tie-breakers use normalized coding + model name

When adjusted internal scores tie: compare `normalizedCoding` descending, then `model` ascending. The previous `normalizedAgentic` tie-breaker is removed.

**Alternatives considered:**

- Add slug as tie-breaker before name: introduces a criterion not present in public response. Not needed unless duplicate model names are common.
- **Choice**: Minimal change — just drop agentic tier from existing chain.

### Decision 5: Cache rankability uses `coding` only

`hasValidScores(model)` in `ArtificialAnalysisClient` becomes `isFiniteNumber(model.coding)` only. `hasRequiredModelFields` drops `reasoningModel === true`. Combined: `slug.length > 0 && deprecated !== true && isFiniteNumber(coding)`.

**Alternatives considered:**

- Also require `frontierModel`: would narrow cache refresh triggers, risks missing newly rankable models.
- **Choice**: Match the new model ranking eligibility exactly.

### Decision 6: Upstream fields ignored silently

`agentic_index`, `reasoning_model`, `isReasoning` in raw payloads are not extracted. The scraper does not fail if they're present or absent. This is consistent with how other unused upstream fields are handled.

## Risks / Trade-offs

- **Risk**: Removing `agentic` eliminates a signal that could differentiate models with identical coding scores. Mitigation: coding is the primary differentiator; model name tie-break provides stable ordering.
- **Risk**: Removing `reasoningModel` from types means observability/logging of reasoning status is lost. Mitigation: not currently logged; data can be re-added later as a separate field if needed.
- **Risk**: Large change surface (types, parser, service, tests). Mitigation: one focused change proposal with clear scope; tests will catch regressions.
