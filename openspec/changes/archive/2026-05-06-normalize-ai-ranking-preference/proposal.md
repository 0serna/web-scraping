## Why

The current AI ranking combines raw Artificial Analysis `agentic` and `coding` indices directly, which means the observed scale of each source metric influences the final ordering in addition to the intended 70/30 preference weights. We want the ranking to reflect our own relative preference between agentic and coding performance, using the eligible comparison set itself as the normalization universe.

## What Changes

- Normalize `agentic` and `coding` scores independently across the eligible ranking set before applying the existing 70/30 preference weights.
- Define the normalization baseline for each dimension as the maximum eligible score observed in that same ranking run.
- Preserve the existing output-token efficiency adjustment as a secondary modifier applied after the normalized preference score is calculated.
- Update deterministic tie-break behavior so ties are resolved using normalized dimension scores before output-token and name tie-breaks.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-model-ranking`: Change internal ranking-score semantics from raw weighted Artificial Analysis indices to normalized eligible-set preference scoring, while preserving relative public score output and deterministic ordering.
- `ai-token-efficiency-bonus`: Apply the existing efficiency adjustment to the normalized preference base score instead of the raw weighted base score.

## Impact

- Affected code: `src/domains/ai/services/model-ranking-service.ts` and its tests.
- Affected behavior: internal ordering and public relative scores for AI model ranking responses.
- No new dependencies, APIs, or configuration are required.
