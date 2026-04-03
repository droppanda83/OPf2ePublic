# PF2e Rebirth

PF2e Rebirth is a Pathfinder 2e Remaster digital tabletop project with a TypeScript rules engine, React frontend, shared data catalogs, and an AI GM system under active development.

## Start Here

- New to the project: read [README.md](README.md) for overview and quick start.
- Working on code locally: read [DEVELOPMENT.md](DEVELOPMENT.md) for setup, commands, and validation workflow.
- Need roadmap status: read [PF2E_DEVELOPMENT_PLAN.md](PF2E_DEVELOPMENT_PLAN.md) for milestones and current priorities.
- Bootstrapping a new assistant session: read [CONTEXT.md](CONTEXT.md) for current architecture and repository context.
- Tracking open issues only: read [FIXES_TRACKER.md](FIXES_TRACKER.md).
- Working on AI GM planning: read [AI-GM-DEVELOPMENT.md](AI-GM-DEVELOPMENT.md) as the separate AI track source of truth.

## Current Status

- Core combat loop, turn order, action resolution, and creature data are implemented.
- Shared content catalogs are large (spells, feats, bestiary, equipment) and actively expanding.
- AI GM architecture exists and is being developed in a dedicated track.
- Documentation has been consolidated so this file is the public entry point.

## Repository Layout

```text
backend/    Express + TypeScript API and game engine
frontend/   React + Vite interface
shared/     Shared PF2e data and type definitions
rules-engine/  Supporting rules modules/utilities
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Configure

Create backend environment config:

```bash
copy backend\\.env.example backend\\.env
```

Set at least:

```env
OPENAI_API_KEY=your_key_here
PORT=5000
```

### Run Development

```bash
npm run dev
```

This runs workspace dev scripts (backend and frontend).

### Build and Type-Check

```bash
npm run build
npm run type-check
```

## Key Scripts

- `npm run dev` - Run workspace dev scripts
- `npm run build` - Build all workspaces
- `npm run type-check` - Type-check all workspaces
- `npm run test` - Run backend game tests via tsx
- `npm run lint` - Lint backend, frontend, and shared

## Documentation Map

- `README.md` - Public overview and quick start (this file)
- `DEVELOPMENT.md` - Developer workflow and conventions
- `CONTEXT.md` - Assistant/bootstrap context for future sessions
- `PF2E_DEVELOPMENT_PLAN.md` - Canonical roadmap and milestone status
- `FIXES_TRACKER.md` - Active unresolved fixes only
- `AI-GM-DEVELOPMENT.md` - AI GM-specific plan (separate source of truth)

## Notes

- The AI GM subsystem is intentionally managed separately from general docs and implementation tasks.
- Historical planning docs are retained as archival references and marked clearly.

Last updated: 2026-03-31
