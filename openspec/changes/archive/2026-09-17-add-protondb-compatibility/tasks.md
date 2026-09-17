# Tasks

## 1. ProtonDB Client

- [x] 1.1 Add the ProtonDB summary type and client using the existing HTTP, rate-limit, logging, and cache utilities; verify unit tests cover valid mapping and the `protondb:<appId>` 24-hour cache.
- [x] 1.2 Handle 404, unsuccessful responses, timeouts, and malformed summaries as unavailable optional data; verify focused client tests cover each fallback without throwing to callers.

## 2. Game Information Composition

- [x] 2.1 Extend `GameInfo` with the optional `protonDb` summary and compose Steam and ProtonDB requests concurrently in `GameInfoService`; verify service tests cover both present and omitted summaries while Steam failures retain existing behavior.
- [x] 2.2 Update the `/info` response test to verify the ProtonDB fields are exposed when available and absent otherwise; run `npm test` to verify the complete suite.

## 3. Quality Checks

- [x] 3.1 Run `npm run check`, `npm run typecheck`, and `npm run build`, fixing only issues introduced by this change.
