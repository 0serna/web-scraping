# web-scraping

Fastify service (Node 22, TypeScript) that scrapes and normalizes data from three sources behind API-key auth. Domains register as plugins from `src/index.ts`. Caches responses in Upstash Redis when configured.

## Areas

| Area           | Path                            | Role                                                                          |
| -------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| AI ranking     | `src/domains/ai/`               | Ranks models from Artificial Analysis (+ DeepSWE); `GET /ai/ranking`          |
| BVC ticker     | `src/domains/bvc/`              | Colombian exchange ticker via Trii and TradingView; `GET /bvc/ticker/:ticker` |
| Steam game     | `src/domains/game/`             | Game details and reviews from a Steam URL; `GET /game/info?url=`              |
| Shared runtime | `src/shared/`                   | Config, API-key auth, Upstash cache factory, API helpers, test utils          |
| Specs          | `openspec/`                     | Current requirements in `specs/` plus archived change proposals               |
| Quality gate   | `scripts/check.sh`              | ESLint, `tsc`, Vitest, OpenSpec validation (`npm run check`)                  |
| Deploy         | `Dockerfile`, `cloudbuild.yaml` | Distroless image → Artifact Registry → Cloud Run                              |

Most of the TypeScript and nearly all OpenSpec history sit in the AI ranking pipeline (payload parsing, coding-only ranking, filters). BVC and game follow the same route → service → types shape with thinner clients.

## Layout

```text
.
├── src/
│   ├── index.ts              # Fastify entry, auth hook, domain registration
│   ├── domains/
│   │   ├── ai/               # Artificial Analysis + DeepSWE ranking
│   │   ├── bvc/              # Trii + TradingView ticker
│   │   └── game/             # Steam details/reviews
│   └── shared/               # config, cache, auth, helpers, test-utils
├── openspec/
│   ├── specs/                # current requirements
│   └── changes/              # proposals (mostly archived)
├── scripts/check.sh          # npm run check
├── Dockerfile                # multi-stage → distroless nodejs22
└── cloudbuild.yaml           # build, push, Cloud Run deploy
```

## Setup

```bash
cp .env.example .env   # set API_KEY; Upstash vars optional if CACHE_DISABLED=true
npm install
npm run dev            # http://0.0.0.0:3000
npm run check          # lint, typecheck, tests, openspec
```

Without `API_KEY`, startup fails closed unless `AUTH_DISABLED=true`. Pass the key as `x-api-key` or the `apikey` query param.
