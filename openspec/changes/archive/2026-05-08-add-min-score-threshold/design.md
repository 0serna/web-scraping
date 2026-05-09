## Context

The `ModelRankingService.getRanking()` method currently:

1. Filters for `reasoningModel === true` only
2. Calculates internal scores using normalized coding (40%) and agentic (60%) weights
3. Normalizes top model's score to 100, others relative to it
4. Applies slug prefix exclusion filter
5. Returns all remaining models

We need to extend this to include non-reasoning models and filter by minimum score threshold.

## Goals / Non-Goals

**Goals:**

- Include all models with valid coding and agentic scores (not just reasoning models)
- Add configurable minimum score threshold (default 60)
- Filter results by threshold before returning
- Maintain existing scoring logic and weights

**Non-Goals:**

- Change output format or API contract (stays `RankedModel[]`)
- Add runtime configuration for threshold (constant only for now)
- Add separate rankings for reasoning vs non-reasoning

## Decisions

### Decision 1: Constant Location

**Choice:** Add `MIN_SCORE_THRESHOLD` in `model-ranking-service.ts` alongside existing constants
**Rationale:** Keeps threshold coupled with ranking logic; consistent with existing `WEIGHT_*` constants

### Decision 2: Score Target for Threshold

**Choice:** Apply threshold to normalized score (0-100), not internal score
**Rationale:** More intuitive for configuration; 60 means "60% of top model"

### Decision 3: Non-Reasoning Model Eligibility

**Choice:** Remove `reasoningModel === true` filter; use `hasRequiredModelData()` (checks coding & agentic not null)
**Rationale:** Simplest change; automatically excludes models without scores regardless of reasoning flag

### Decision 4: Scoring Formula

**Choice:** Same weights (0.6 agentic, 0.4 coding) for all models
**Rationale:** Keep it simple; no evidence suggesting different weights needed for non-reasoning

## Risks / Trade-offs

- **[Risk]** API may not provide coding/agentic scores for non-reasoning models
  - **Mitigation:** `hasRequiredModelData()` already filters out nulls; behavior degrades gracefully

- **[Risk]** Threshold of 60 may exclude too many models
  - **Mitigation:** Constant is easily adjustable; can tune based on production data

- **[Risk]** Tests expect reasoning-only behavior
  - **Mitigation:** Update tests to cover new scenarios (include non-reasoning, filter by threshold)

- **[Risk]** Existing spec `ai-model-ranking` requires reasoning-only
  - **Mitigation:** This change modifies that spec's requirements; delta spec will document the change
