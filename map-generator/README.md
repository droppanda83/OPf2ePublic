# Map Generator — PF2e Rebirth

Standalone map generation testing tool. Runs independently on its own Vite dev server so you can iterate on maps while the main game is running.

## Quick Start

```bash
cd map-generator
npm install
npm run dev
```

Opens at **http://localhost:5175**

## Architecture

- **Source files**: `src/pages/MapTester.tsx` and `src/rendering/TileRenderer.ts` are the authoritative copies
- **Shared code**: Imports `shared/mapGenerator.ts` and `shared/types.ts` directly via relative paths
- **Textures**: Served from `frontend/public/` (via Vite `publicDir`) — no duplication
- **No backend server needed** — all generation is client-side

## Syncing

After editing files in this tool, sync changes back to the main frontend:

```bash
npm run sync:to-frontend
```

To pull changes from the frontend into this tool:

```bash
npm run sync:from-frontend
```
