# Development Guide

This document is the active developer workflow reference for local setup, day-to-day commands, and repository conventions.

## Workspaces

- `backend` - Express + TypeScript API and game engine
- `frontend` - React + Vite UI
- `shared` - Shared PF2e data and shared type definitions
- `rules-engine` - Supporting rules modules

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
copy backend\\.env.example backend\\.env
```

Set required env variables in `backend/.env`.

## Common Commands

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm run test
```

Workspace-specific examples:

```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
npm run typecheck --workspace=backend
```

## Local Endpoints

- Backend: `http://localhost:5000` (or `PORT` from backend env)
- Frontend: `http://localhost:5173`

## Repository Conventions

- Keep AI GM changes in `backend/src/ai` scoped to the AI track.
- Keep shared data changes in `shared` and avoid backend/frontend duplication.
- Prefer small, auditable commits by concern.
- Update docs in this set when architecture, commands, or milestone status changes:
   - `README.md`
   - `DEVELOPMENT.md`
   - `CONTEXT.md`
   - `PF2E_DEVELOPMENT_PLAN.md`
   - `FIXES_TRACKER.md`

## Validation Checklist

Before merging substantial changes:

1. Run `npm run build`.
2. Run `npm run type-check`.
3. Run `npm run lint` for touched areas.
4. Run relevant tests (`npm run test` and targeted package tests).
5. Update active documentation if behavior or architecture changed.

## Troubleshooting

- Dependency drift:
   - Remove `node_modules` and reinstall with `npm install`.
- Port conflicts:
   - Confirm no other process is bound to backend/frontend ports.
- Type errors across packages:
   - Build shared package first, then rerun workspace checks.

Last updated: 2026-03-31
