## MODIFIED Requirements

### Requirement: Performance data merged by slug after deduplication

After deduplicating metadata, performance data SHALL be merged using slug-based lookup, overwriting only the performance-specific fields (`coding`, `blendedPrice`, `inputPrice`, `outputPrice`).

#### Scenario: Performance data merged correctly

- **WHEN** deduplicated metadata has slug `gpt-5-4-mini` and performance data contains `coding_index: 51.48` for the same slug
- **THEN** the final model SHALL have `coding: 51.48`
