## REMOVED Requirements

### Requirement: Extract release date from Artificial Analysis payload

**Reason**: Release date is no longer part of AI model ranking eligibility or the public ranking response contract.

**Migration**: Use Artificial Analysis `deprecated` lifecycle metadata to determine active-model eligibility.

### Requirement: Filter ranking by release date window

**Reason**: The ranking now represents active reasoning models rather than recently released reasoning models. The `deprecated` field is the direct lifecycle signal and replaces the 90-day release-date proxy.

**Migration**: Keep reasoning, scoring-input, deprecation, and slug-prefix filters; do not apply a release-date recency window.

### Requirement: Include release date in ranking response

**Reason**: Release date no longer explains ranking eligibility and the public `/ranking` response should not expose a date field.

**Migration**: Consume successful ranking items using `model`, `score`, `speed`, and `output` only.
