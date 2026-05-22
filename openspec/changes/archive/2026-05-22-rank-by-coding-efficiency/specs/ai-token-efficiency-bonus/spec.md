## REMOVED Requirements

### Requirement: Configure AI token efficiency adjustment weight

**Reason**: The bounded efficiency adjustment system is replaced by efficiency as the primary ranking metric (`coding_index / output_tokens`). Constants for maximum adjustment and threshold are no longer needed.

**Migration**: Remove `MODEL_EFFICIENCY_MAX_ADJUSTMENT` and `OUTPUT_TOKEN_THRESHOLD` constants from `model-ranking-service.ts`. The `ai-token-efficiency-bonus` spec is superseded by `coding-efficiency-ranking`.

### Requirement: Parse Artificial Analysis Intelligence Index output token counts

**Reason**: Output token parsing is preserved but moves under `coding-efficiency-ranking`. The parsing behavior is no longer part of a separate "bonus" system.

**Migration**: The parsing logic in `ArtificialAnalysisClient` remains unchanged. The spec for parsing moves to `coding-efficiency-ranking`'s eligibility requirement.

### Requirement: Apply token efficiency adjustment to AI ranking

**Reason**: The multiplicative bounded adjustment formula (`1 + maxAdjustment * (1 - outputTokens / threshold)`) is replaced. Efficiency (`coding_index / output_tokens`) is now the primary metric, not a secondary adjustment.

**Migration**: Replace `calculateAdjustedScore` and related normalization logic with direct efficiency calculation. Models without output tokens are now excluded instead of receiving a neutral adjustment.
