## Context

The AI ranking pipeline fetches the Artificial Analysis model detail page, extracts Next.js flight payload chunks, normalizes model data, validates cached values against ranking eligibility, and ranks eligible models. Production logs show fresh Artificial Analysis data failing cache validation because the parser still expects legacy snake_case fields such as `coding_index` and `short_name`, while the current payload exposes ranking data through camelCase fields such as `codingIndex`, `shortName`, and `canonicalIntelligenceIndexTokenCount`.

The current normalized model also carries historical price and frontier metadata even though ranking eligibility, sorting, and the public response no longer use those concepts.

## Goals / Non-Goals

**Goals:**

- Restore AI ranking by parsing the current Artificial Analysis payload shape.
- Keep the public `/ranking` response shape unchanged.
- Reduce the normalized ranking model to fields used by ranking or response construction.
- Keep cache validation strict so unrankable fresh data remains a failure.
- Preserve slug-based merging across chunks for current ranking-domain fields.
- Make parser failures more diagnostic when the current source shape is missing.

**Non-Goals:**

- Change ranking score, tie-breakers, maximum size, DeepSWE enrichment, or slug-prefix exclusions.
- Reintroduce price, frontier, reasoning, agentic, release-date, or speed into ranking behavior.
- Add live network tests to the normal check suite.
- Mirror the Artificial Analysis UI exactly.

## Decisions

1. Use the current Artificial Analysis field names only.

   The parser will normalize `shortName`/`name`, `codingIndex`, `deprecated`, and `canonicalIntelligenceIndexTokenCount.output`. Legacy snake_case fields will not be accepted as compatibility fallbacks.

   Alternative considered: accept both camelCase and snake_case. Rejected because the agreed domain model treats legacy fields as obsolete source details, and accepting both can hide conflicting source shapes.

2. Remove price and frontier from the normalized ranking model.

   Ranking eligibility uses slug, coding score, and deprecation status. Sorting uses rounded coding, output tokens, and model name. The public response exposes rank, model, coding, tokens, and DeepSWE. Price and frontier are therefore outside the ranking domain.

   Alternative considered: keep price and frontier as ignored metadata. Rejected because ignored metadata has repeatedly made specs and tests imply behavior that no longer exists.

3. Keep slug-based merge semantics, but restrict merged fields to the current ranking-domain model.

   Payload chunks may still split metadata and performance data. Merging by slug remains useful, but it should merge only model name, coding, token count, and deprecation lifecycle fields.

   Alternative considered: require complete objects with all fields. Rejected because it makes the scraper more brittle to harmless chunk distribution changes.

4. Fail at parser level when current ranking signals are absent.

   If no `codingIndex` entries can be found in the extracted payload, the parser should throw an `AiParseError` with a diagnostic message before cache validation. Cache validation remains responsible for rejecting data that parses but has no rankable model.

   Alternative considered: keep relying on `Fresh value failed validation`. Rejected because it obscures source-shape changes and slows diagnosis.

5. Cover source shape with deterministic fixtures, not live tests.

   Unit tests should use representative current camelCase flight payload fixtures. The normal check suite should not depend on Artificial Analysis uptime or payload timing.

   Alternative considered: add a live integration test. Rejected because it would make local and CI checks flaky.

## Risks / Trade-offs

- [Risk] Removing legacy field support means archived or cached legacy payloads no longer parse as valid model data. → Mitigation: validated cache refresh already refetches fresh data when cached values do not satisfy the ranking contract.
- [Risk] Artificial Analysis can change field names again. → Mitigation: parser diagnostics and focused fixtures should make future failures quicker to identify.
- [Risk] Removing internal metadata may require broad test fixture updates. → Mitigation: slim parser tests around the current contract instead of preserving historical fixture breadth.
- [Risk] Specs currently mention frontier and price as ignored eligibility fields. → Mitigation: update active specs to describe absence of those concepts rather than ignored legacy fields.
