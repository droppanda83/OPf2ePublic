# Foundry Import Pipeline (Phase 13)

Session 44 scaffolding for deterministic catalog generation.

## What this currently imports
- Weapons from `source/weapons.source.json` into `shared/weapons.ts`
- Bestiary from `source/bestiary.source.json` into `shared/bestiary.ts`
- Spells from `source/spells.source.json` into `shared/spells.ts`
- Feats from `source/feats.source.json` into `shared/feats.ts`
- Encounter maps from `source/maps.source.json` into `shared/foundryEncounterMaps.ts`

## Run
- From repo root: `npm run import:foundry`

## Convert Foundry Scene Export to maps source
- Convert scene export JSON to `maps.source.json`:
	- `npm run convert:foundry:scenes -- --input path/to/foundry-scenes.json`
- Optional output path:
	- `npm run convert:foundry:scenes -- --input path/to/foundry-scenes.json --output scripts/foundry-import/source/maps.source.json`
- Then regenerate catalog:
	- `npm run import:foundry`

## Output
- `shared/weapons.ts` (regenerated)
- `scripts/foundry-import/generated/weapons-import-report.json`
- `shared/bestiary.ts`
- `shared/spells.ts`
- `shared/feats.ts`
- `shared/foundryEncounterMaps.ts`
- `scripts/foundry-import/generated/*-import-report.json`

## Determinism
- IDs are validated as unique.
- Entries are sorted by ID before generation.
- Trait lists are sorted alphabetically.

## Notes
- The map importer accepts normalized map JSON under `maps.source.json` and emits `EncounterMapTemplate[]`.
- Imported maps are appended to the runtime map catalog via `shared/encounterMaps.ts`.
