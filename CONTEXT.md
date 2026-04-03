# PF2e Rebirth Context

Use this document to bootstrap a new assistant session quickly.

## Repository Root

`C:\\Users\\Paige\\OneDrive\\Documents\\GitHub\\OPf2ePublic`

## Project Summary

PF2e Rebirth is a TypeScript monorepo for Pathfinder 2e Remaster gameplay with:

- Tactical combat engine and rule resolution
- Large shared PF2e content catalogs
- React/Vite frontend for combat and builder workflows
- AI GM subsystem managed on a dedicated track

## Package Layout

- `backend/` - Express API, encounter/game state orchestration, engine logic
- `frontend/` - React UI components, battle interface, builder flows
- `shared/` - shared types, feats/spells/creatures/items data, helpers
- `rules-engine/` - supporting rules modules and utilities

## Runtime Defaults

- Backend default: `http://localhost:5000` (configurable via env)
- Frontend default: `http://localhost:5173`

## High-Value Commands

```bash
npm install
npm run dev
npm run build
npm run type-check
npm run lint
npm run test
```

## Documentation Authority

- Public overview: `README.md`
- Developer workflow: `DEVELOPMENT.md`
- Roadmap and milestones: `PF2E_DEVELOPMENT_PLAN.md`
- Active unresolved issues only: `FIXES_TRACKER.md`
- AI GM roadmap: `AI-GM-DEVELOPMENT.md` (separate and intentionally independent)

## Doc Hygiene Rules

- Keep only one active source of truth per topic.
- Move historical notes into archival docs.
- Remove stale references to deleted files/components.
- Do not update AI GM planning from general doc cleanup tasks.

Last updated: 2026-03-31
