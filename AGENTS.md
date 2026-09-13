## Repository Structure

```text
.
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

## Repository Commands

- `npm install`: install dependencies.
- `npm run dev`: run the development server with file watching.
- `npm run build`: compile production TypeScript to `dist/`.
- `npm run check`: verify formatting, lint rules, and import order with Biome.
- `npm run check:fix`: apply safe Biome fixes.
- `npm run typecheck`: type-check source and test files without emitting output.
- `npm test`: run the test suite once.

## Repository Stack

- Language: TypeScript
- Runtime: Node.js 22+
- Package manager: npm
- Framework/platform: Fastify
- Test framework: Vitest
- Build tool: TypeScript compiler
- Quality tool: Biome
- Database/cache: Upstash Redis
- Infrastructure: Docker, GitHub Actions, Google Cloud Build
- Deployment target: Google Cloud Run

## Cloud Run Debug

- `gcloud config set project web-scraping-484120`: set the active GCP project.
- `gcloud run services describe web-scraping --region us-central1 --project web-scraping-484120`: inspect the live Cloud Run config.
- `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="web-scraping"' --project web-scraping-484120 --limit 50`: read recent Cloud Run logs.
- `gcloud run services describe web-scraping --region us-central1 --project web-scraping-484120 --format='value(status.url)'`: get the service URL.
