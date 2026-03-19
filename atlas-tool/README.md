# Atlas Terrain Picker (Standalone)

Standalone version of the Atlas Tile Viewer and Approved Database, extracted from the main PF2e project for independent metadata editing.

## Quick Start

```bash
cd atlas-tool
npm install
npm run dev
```

This starts:
- **Vite dev server** on `http://localhost:5174` (the UI)
- **Express API server** on `http://localhost:3099` (metadata persistence)

Open `http://localhost:5174` in your browser.

## Pages

| URL | Description |
|-----|-------------|
| `http://localhost:5174` | Tile Viewer — browse, tag, and categorise atlas tiles |
| Click "Approved Database" tab | View all approved terrain/object/group entries |

## Metadata Sync

When you save metadata in this tool, it writes to **two** locations:
1. `atlas-tool/public/textures/atlas-metadata.json` (local copy)
2. `frontend/public/textures/atlas-metadata.json` (main project — if it exists at the expected relative path)

This means your edits are automatically synced back to the main project.

## Texture Assets

The 12 atlas PNG sheets are copied from `frontend/public/textures/`. If you add new atlas sheets to the main project, copy them here too.
