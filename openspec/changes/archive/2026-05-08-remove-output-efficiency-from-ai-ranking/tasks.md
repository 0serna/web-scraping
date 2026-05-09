## 1. Update ranking behavior

- [x] 1.1 Remove the output-efficiency adjustment constants and scoring path from `src/domains/ai/services/model-ranking-service.ts`.
- [x] 1.2 Remove output-token tie-breaking so final ordering falls through from internal score to normalized intelligence fields and then model name.

## 2. Rename ranking response metadata

- [x] 2.1 Replace the public ranked-model field `output` with `tokens` in AI ranking types and service output mapping.
- [x] 2.2 Update the AI ranking route expectations to return `tokens` and no longer return `output`.

## 3. Refresh automated coverage

- [x] 3.1 Update model ranking service tests to reflect intelligence-only ranking scores and deterministic tie-breaking without token metadata.
- [x] 3.2 Update route tests and any other affected assertions to expect the renamed `tokens` response field.
- [x] 3.3 Run the project's verification commands and confirm the change passes the relevant checks.
