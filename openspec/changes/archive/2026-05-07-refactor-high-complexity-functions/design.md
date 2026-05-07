## Context

The project uses `fallow --production-health` to enforce code quality. The current threshold reports functions with cyclomatic complexity >= 5 as "HIGH". There are 21 functions across 4 domains that exceed this threshold.

Current state:

- 21 functions with cyclomatic complexity 5-9
- CRAP scores range from 30-90
- All functions have existing test coverage (156 tests passing)
- No configuration option to adjust threshold in `.fallowrc.json`

## Goals / Non-Goals

**Goals:**

- Reduce cyclomatic complexity of all 21 functions below 5
- Maintain all existing behavior (156 tests must pass)
- Leave `npm run check` in green

**Non-Goals:**

- Changing fallow threshold configuration
- Adding new features or changing behavior
- Improving performance (unless incidental to refactoring)

## Decisions

### Decision 1: Extract helper functions for complex logic

**Rationale**: Functions with cyclomatic >= 5 often have multiple responsibilities or nested conditionals. Extracting helpers reduces complexity per function while preserving readability.

**Alternatives considered**:

- Inline early returns (rejected: doesn't address root cause for complex functions)
- Strategy pattern (rejected: overkill for these functions)
- Suppression comments (rejected: user wants real refactoring)

### Decision 2: Refactor by complexity pattern, not by file

**Rationale**: Similar complexity patterns exist across files. Grouping by pattern (conditional chains, parsing, transformation) allows consistent refactoring techniques.

**Pattern-to-technique mapping**:

| Pattern             | Example Functions                                       | Technique                                   |
| ------------------- | ------------------------------------------------------- | ------------------------------------------- |
| Conditional chains  | parseModelsFromHtml (9), ticker route (8)               | Extract fallback/strategy functions         |
| Character parsing   | extractBalancedJsonText (7), parseTriiStockListHtml (8) | Extract state machine helpers               |
| Data transformation | extractPerformanceDataFromChunk (7), normalizeModel (6) | Pipeline with extracted steps               |
| Comparison logic    | compareFinalModels (7)                                  | Chain of comparators or sort key extraction |
| Simple guards       | isRankableReasoningModel (5), extractAppId (5)          | Early returns + guard extraction            |

### Decision 3: Preserve function signatures

**Rationale**: All 21 functions are either exported or used internally. Changing signatures would require updating all callers and tests. Internal refactoring (extracting helpers) avoids this.

## Risks / Trade-offs

- **Risk**: Subtle behavior changes during refactoring → **Mitigation**: Run full test suite after each function refactor
- **Risk**: Over-extraction creating too many small functions → **Mitigation**: Extract only when it reduces cyclomatic complexity meaningfully
- **Risk**: Some functions may resist simplification → **Mitigation**: Accept cyclomatic 4 as target, not 0

## Open Questions

- Should extracted helpers be in the same file or moved to shared utilities? (Recommendation: same file unless reused across files)
