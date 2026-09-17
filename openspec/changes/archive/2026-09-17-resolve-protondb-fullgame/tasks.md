# Tasks

## 1. Steam Base-Game Resolution

- [x] 1.1 Parse and validate optional `fullgame.appid` from Steam details, carry it through cached unified game data, and verify unit tests cover a valid base-game ID and malformed or absent metadata.

## 2. ProtonDB Lookup Selection

- [x] 2.1 Use the resolved base-game ID for the ProtonDB request when available, while preserving the requested product's Steam fields; verify service tests cover both the base-game and original-ID paths.
- [x] 2.2 Add a route-level regression test using a DLC-shaped Steam result and run `npm test` to verify the complete suite.

## 3. Quality Checks

- [x] 3.1 Run `npm run check`, `npm run typecheck`, and `npm run build`, fixing only issues introduced by this change.
