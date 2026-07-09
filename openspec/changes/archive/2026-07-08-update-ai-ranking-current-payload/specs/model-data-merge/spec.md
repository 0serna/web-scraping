## MODIFIED Requirements

### Requirement: Duplicate slugs use first-occurrence semantics

When extracting models from multiple Next.js flight payload chunks, if the same slug appears in multiple chunks, the system SHALL keep the first occurrence for metadata fields and merge ranking-domain performance fields by slug.

#### Scenario: Same slug appears in multiple chunks

- **WHEN** one chunk provides `shortName: "GPT-5.5"` for slug `gpt-5-5` and a later chunk provides a different `shortName` for the same slug
- **THEN** the final model SHALL use `shortName: "GPT-5.5"` as the model name from the first occurrence

#### Scenario: Slug only appears in one chunk

- **WHEN** a slug appears in only one chunk
- **THEN** that model SHALL be included without modification

### Requirement: All ranking-domain metadata preserved from first occurrence

The first occurrence of a model SHALL preserve ranking-domain metadata fields in the final result, including `slug`, `name`, `shortName`, and `deprecated`.

#### Scenario: Metadata fields preserved

- **WHEN** the first occurrence contains `shortName: "GPT-5.5"` and `deprecated: false`
- **THEN** the final model SHALL contain both values unless ranking-domain performance data for the same slug provides a more specific deprecation value

### Requirement: Performance data merged by slug after deduplication

After deduplicating metadata, performance data SHALL be merged using slug-based lookup, overwriting only current ranking-domain performance fields (`coding` and `intelligenceIndexOutputTokens`) plus `deprecated` lifecycle status when present.

#### Scenario: Performance data merged correctly

- **WHEN** deduplicated metadata has slug `gpt-5-5` and performance data contains `codingIndex: 74.89` for the same slug
- **THEN** the final model SHALL have `coding: 74.89`

#### Scenario: Output-token count merged correctly

- **WHEN** deduplicated metadata has slug `gpt-5-5` and performance data contains `canonicalIntelligenceIndexTokenCount.output: 72301736` for the same slug
- **THEN** the final model SHALL have `intelligenceIndexOutputTokens: 72301736`
