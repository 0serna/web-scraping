## Context

The AI ranking endpoint currently returns ranked models with `model`, `position`, `score`, and `price1m`. The ranking service computes an internal absolute score from model intelligence and price efficiency, sorts by that internal score and tie-breakers, then maps the ranked entries directly into the response.

The desired API contract should present ranking quality as a relative percentage instead of exposing the absolute internal score. Price remains relevant to the ranking algorithm, but it should not be included in the public response.

## Goals / Non-Goals

**Goals:**

- Keep the existing model eligibility, internal scoring, sorting, tie-breakers, and ranking positions unchanged.
- Remove `price1m` from the public `GET /ranking` response items.
- Convert the public `score` to a percentage relative to the unrounded internal score of the first-ranked model.
- Fail the ranking if the first-ranked internal score is not positive, because that would violate the expected data invariant.

**Non-Goals:**

- Do not change how Artificial Analysis data is scraped or normalized.
- Do not remove price fields from internal model data or scoring inputs.
- Do not introduce a new response field such as `relativeScore`.
- Do not change the ranking limit or frontier/reasoning eligibility rules.

## Decisions

- Keep internal and public scores conceptually separate. The internal score remains the value used for sorting and tie-breakers; the public `score` is derived only after the final order is known. This avoids changing ranking behavior while changing the response semantics.
- Use the unrounded internal score of the first-ranked model as the denominator. This avoids accumulating rounding error and makes the top model exactly `100` while preserving precise relative comparisons for the rest of the response.
- Treat `topInternalScore <= 0` as invalid ranking data. The domain expectation is that a rankable frontier reasoning model has a positive score, so a non-positive leader should surface as a ranking failure instead of returning an artificial fallback.
- Remove `price1m` from the output type and route tests, but retain price internally. The price remains necessary for efficiency calculation and price-based tie-breaking.

## Risks / Trade-offs

- Breaking API contract: clients reading `price1m` will need to stop relying on that field. Mitigation: update tests and specs to make the response shape explicit.
- Semantic field change: clients reading `score` as an absolute score will now receive a percentage. Mitigation: specify that `score` is relative to the first-ranked model and that the first-ranked model is `100`.
- Invariant failure path: if upstream data unexpectedly produces a non-positive top internal score, the endpoint will fail instead of returning a best-effort response. Mitigation: this matches the settled domain assumption and keeps invalid data visible.
