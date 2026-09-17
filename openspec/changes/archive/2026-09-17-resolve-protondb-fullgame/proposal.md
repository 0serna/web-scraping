# Proposal

## Why

ProtonDB stores compatibility reports against a base game, while Steam DLC and similar child products often have no ProtonDB summary. Existing requests therefore omit available compatibility data for products such as The Witcher 3: Blood and Wine.

## What Changes

- Resolve Steam's optional `fullgame` relationship for the requested product.
- Use the resolved base-game application ID for the optional ProtonDB summary when available.
- Preserve the requested product's existing name, release year, review score, and response shape.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `protondb-compatibility`: Resolve ProtonDB compatibility against a Steam product's base game when Steam identifies one.

## Impact

- Extends the internal Steam details and unified game data flow with an optional base-game ID.
- Changes the application ID selected for ProtonDB lookups for DLCs, demos, and other Steam products with `fullgame` metadata.
- Requires tests for base-game resolution and unchanged behavior when no valid base-game ID exists.
