## Repository Structure

```text
.
├── src/                      # application source (TypeScript)
│   ├── domains/
│   │   ├── ai/               # AI scraping domain
│   │   ├── bvc/              # BVC scraping domain
│   │   └── game/             # game scraping domain
│   ├── shared/
│   │   ├── config/           # shared runtime config
│   │   ├── test-utils/       # test helpers and mocks
│   │   ├── types/            # shared TypeScript types
│   │   └── utils/            # shared utilities
│   └── index.ts              # app entry point
├── openspec/                 # change proposals and specs
└── scripts/                  # automation scripts
```

## Repository Commands

- `npm install`: install dependencies.
- `npm run dev`: run dev server with file watching.
- `npm run build`: compile TypeScript to dist/.
- `npm run format`: format all files with Prettier.
- `npm run check`: run lint, typecheck, Fallow, and OpenSpec validation.
- `npm test`: run test suite with Vitest.

## Cloud Run Debug

- `gcloud config set project web-scraping-484120`: set the active GCP project.
- `gcloud run services describe web-scraping --region us-central1 --project web-scraping-484120`: inspect the live Cloud Run config.
- `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="web-scraping"' --project web-scraping-484120 --limit 50`: read recent Cloud Run logs.
- `gcloud run services describe web-scraping --region us-central1 --project web-scraping-484120 --format='value(status.url)'`: get the service URL.
