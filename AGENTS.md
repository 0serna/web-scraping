## Project Structure

```text
.
├── src/                      # application source
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
└── .husky/                   # git hooks
```

## Repository Commands

- `npm install`: install dependencies.
- `npm run dev`: run dev server with file watching.
- `npm run build`: compile TypeScript to dist/.
- `npm run format`: format all files with Prettier.
- `npm run check`: run lint, typecheck, Fallow, and OpenSpec validation.
- `npm test`: run test suite with Vitest.
