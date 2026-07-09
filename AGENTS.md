## Repository Structure

```text
.
├── openspec/                 # OpenSpec changes and specs
│   ├── changes/
│   └── specs/
├── scripts/                  # local automation
└── src/                      # application source
    ├── domains/              # scraping domains
    │   ├── ai/
    │   ├── bvc/
    │   └── game/
    └── shared/               # shared runtime and test utilities
        ├── config/
        ├── test-utils/
        ├── types/
        └── utils/
```

## Repository Stack

- Language: TypeScript
- Runtime: Node.js 22+
- Package manager: npm
- Framework/platform: Fastify
- Test framework: Vitest
- Build tool: TypeScript compiler
- Quality tools: ESLint, Prettier, OpenSpec
- Database/cache: Upstash Redis
- Infrastructure: Docker, Google Cloud Build
- Deployment target: Google Cloud Run

## Repository Commands

- `npm install`: install dependencies.
- `npm run dev`: run dev server with file watching.
- `npm run build`: compile TypeScript to dist/.
- `npm run check`: run lint, typecheck, tests, and OpenSpec validation.

## Cloud Run Debug

- `gcloud config set project web-scraping-484120`: set the active GCP project.
- `gcloud run services describe web-scraping --region us-central1 --project web-scraping-484120`: inspect the live Cloud Run config.
- `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="web-scraping"' --project web-scraping-484120 --limit 50`: read recent Cloud Run logs.
- `gcloud run services describe web-scraping --region us-central1 --project web-scraping-484120 --format='value(status.url)'`: get the service URL.
