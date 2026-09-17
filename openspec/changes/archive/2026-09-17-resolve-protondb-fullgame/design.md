# Design

## Context

Steam app details already provide `fullgame.appid` for child products such as DLC. The current unified Steam data discards that field, and `GameInfoService` asks ProtonDB for the originally requested ID in parallel with the Steam data.

## Goals / Non-Goals

**Goals:**

- Use Steam's own base-game relation when it is valid.
- Keep the public game-information response unchanged except for a newly available optional ProtonDB value.
- Avoid another Steam request and avoid a failed ProtonDB lookup for a known child product.

**Non-Goals:**

- Change the Steam review score, name, year, or source to the base game.
- Expose the base-game ID or name in the response.
- Infer a parent game when Steam omits or invalidates `fullgame`.

## Decisions

### Carry only the base-game ID through internal Steam data

Parse `fullgame.appid` as an optional non-empty string from the existing Steam details response. Carry it through the unified cached game data solely as the ProtonDB lookup target. This reuses the existing request and cache; no new Steam client or endpoint is needed.

### Resolve Steam data before selecting the ProtonDB target

`GameInfoService` will obtain the unified Steam data first, then request ProtonDB with `fullGameAppId ?? appId`. Steam details and reviews remain concurrent inside the unified client. This avoids a predictable 404 for DLCs. The alternative of querying ProtonDB for the child first preserves parallelism but causes an unnecessary uncached 404 for every such request.

### Treat malformed base-game metadata as absent

Only a non-empty string application ID is a usable target. Missing, malformed, or unusable metadata falls back to the requested Steam ID and retains current optional ProtonDB behavior.

## Risks / Trade-offs

- [A cold request becomes sequential with ProtonDB] -> Reuse the 15-day Steam cache and avoid the child-product ProtonDB miss.
- [Base-game compatibility may differ from a DLC's edge cases] -> Preserve the DLC's Steam fields and rely only on Steam's explicit `fullgame` relation.
- [Steam changes metadata shape] -> Validate the narrow field and fall back to the requested ID.

## Migration Plan

Deploy as a backward-compatible enrichment. Rollback removes the internal base-game target and restores the requested ID for ProtonDB lookups.
