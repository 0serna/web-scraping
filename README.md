# web-scraping

Fastify service (Node 22, TypeScript) that scrapes and normalizes data behind API-key auth. Domains register as plugins from `src/index.ts`. Caches responses in Upstash Redis when configured.

## Areas

| Area           | Path                            | Role                                                                          |
| -------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| BVC ticker     | `src/domains/bvc/`              | Colombian exchange ticker via Trii and TradingView; `GET /bvc/ticker/:ticker` |
| Steam game     | `src/domains/game/`             | Game details and reviews from a Steam URL; `GET /game/info?url=`              |
| Shared runtime | `src/shared/`                   | Config, API-key auth, Upstash cache factory, API helpers, test utils          |
| Quality gate   | `biome.json`, `package.json`    | Biome, TypeScript, Vitest, and production build targets                       |
| Deploy         | `Dockerfile`, `cloudbuild.yaml` | Distroless image → Artifact Registry → Cloud Run                              |

## Layout

```text
.
├── src/
│   ├── index.ts              # Fastify entry, auth hook, domain registration
│   ├── domains/
│   │   ├── bvc/              # Trii + TradingView ticker
│   │   └── game/             # Steam details/reviews
│   └── shared/               # config, cache, auth, helpers, test-utils
├── biome.json               # formatting, linting, import ordering
├── Dockerfile                # multi-stage → distroless nodejs22
└── cloudbuild.yaml           # build, push, Cloud Run deploy
```

## Setup

```bash
cp .env.example .env   # set API_KEY; Upstash vars optional if CACHE_DISABLED=true
npm install
npm run dev            # http://0.0.0.0:3000
npm run check          # Biome verification
npm run typecheck      # source and test type checking
npm test               # test suite
npm run build          # production compilation
```

Without `API_KEY`, startup fails closed unless `AUTH_DISABLED=true`. Pass the key as `x-api-key` or the `apikey` query param.
