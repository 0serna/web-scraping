## REMOVED Requirements

### Requirement: Apply minimum score threshold filter

**Reason**: Efficiency-based scoring has a much wider distribution than normalized coding scores. A fixed minimum threshold can hide nearly every model when the top model is unusually token-efficient.

**Migration**: Return all rankable, non-excluded models ordered by coding efficiency. Consumers can apply their own display limits or score thresholds if needed.
