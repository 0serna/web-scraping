## Project Structure

```text
.
├── src/                      # source code
│   ├── domains/
│   │   ├── ai/               # AI domain scraping logic
│   │   ├── bvc/              # BVC domain scraping logic
│   │   └── game/             # Game domain scraping logic
│   ├── shared/
│   │   ├── config/           # shared configuration
│   │   ├── test-utils/       # test helpers and mocks
│   │   ├── types/            # shared TypeScript types
│   │   └── utils/            # shared utilities
│   └── index.ts              # app entry point
├── docs/                     # project documentation
├── openspec/                 # OpenSpec changes and specs
└── .husky/                   # git hooks (pre-commit: lint-staged + tests)
```

## Repository Commands

- `npm run dev`: run dev server with file watching.
- `npm run build`: compile TypeScript to dist/.
- `npm run format`: format all files with Prettier.
- `npm run check`: run Prettier check, ESLint, and TypeScript type check.
- `npm test`: run test suite with Vitest.
