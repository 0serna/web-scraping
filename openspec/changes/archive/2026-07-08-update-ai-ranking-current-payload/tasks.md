## 1. Type and model cleanup

- [ ] 1.1 Remove price and frontier fields from `ArtificialAnalysisModel`, `RawArtificialAnalysisModel`, and `PerformanceData`.
- [ ] 1.2 Update model ranking test fixtures to stop providing removed internal fields.

## 2. Current payload parser

- [ ] 2.1 Replace legacy snake_case normalization with current camelCase fields: `shortName`, `name`, `codingIndex`, `deprecated`, and `canonicalIntelligenceIndexTokenCount.output`.
- [ ] 2.2 Remove legacy token, coding, price, and frontier parsing paths.
- [ ] 2.3 Preserve slug-based merge behavior using only model name, coding, output-token count, and deprecated status.
- [ ] 2.4 Add parser-level `AiParseError` diagnostics when no current `codingIndex` signal exists in extracted payload data.

## 3. Test updates

- [ ] 3.1 Replace parser fixtures with representative current camelCase flight payload examples.
- [ ] 3.2 Cover current field normalization for model name, coding, output tokens, and deprecated status.
- [ ] 3.3 Cover slug-based merge using current ranking-domain fields only.
- [ ] 3.4 Cover diagnostic parse failure when extracted payload data has no `codingIndex` entries.
- [ ] 3.5 Keep ranking service behavior tests green for eligibility, prefix exclusions, sorting, tokens, and DeepSWE enrichment.

## 4. Specification and quality validation

- [ ] 4.1 Run `openspec validate --change update-ai-ranking-current-payload`.
- [ ] 4.2 Run targeted AI parser and ranking tests.
- [ ] 4.3 Run `npm run check`.
