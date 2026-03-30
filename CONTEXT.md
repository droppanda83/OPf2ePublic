# PF2e Rebirth — Development Context

> Paste this file's contents into a new chat to bring the assistant up to speed.

---

## Project Overview

**PF2e Rebirth** is a Pathfinder 2nd Edition tactical RPG web app with AI-driven combat, procedural map generation, and a GM chatbot.

### Tech Stack
- **Frontend**: React + TypeScript, Vite dev server (port 5173)
- **Backend**: Express + TypeScript (port 3001), AI providers (OpenAI/Anthropic/Google)
- **Shared**: `shared/` module (`pf2e-shared`) — types, map generator, encounter builder
- **Workspace root**: `c:\Users\DropP\OneDrive - The Cairnmillar Institute\Documents\GitHub\OPf2ePublic`

### Key File Locations
| File | Purpose |
|------|---------|
| `frontend/src/rendering/TileRenderer.ts` (~3100 lines) | Canvas-based map renderer — procedural + atlas textures |
| `frontend/src/pages/AtlasViewer.tsx` | Dev tool: atlas tile viewer/tagger (access via `?atlas=1`) |
| `frontend/src/pages/AtlasViewer.css` | Styles for atlas viewer |
| `frontend/src/components/BattleGrid.tsx` | Battle map component, preloads atlas |
| `frontend/src/App.tsx` | Root component, `?atlas=1` routes to AtlasViewer |
| `backend/src/index.ts` (~2320 lines) | Express server, game engine, AI, persistence |
| `shared/mapGenerator.d.ts` | `TileType` union (65+ tile types), map gen types |
| `frontend/public/textures/terrain_atlas.png` | LPC terrain atlas (1024×1024, 32×32 grid) |
| `frontend/public/textures/base_out_atlas.png` | LPC base/outdoor atlas (1024×1024, 32×32 grid) |
| `frontend/public/textures/atlas-metadata.json` | Persisted tile descriptions from AtlasViewer |
| `frontend/public/textures/Attribution.txt` | CC-BY-SA 3.0 / GPL 3.0 atlas license |

---

## Atlas Texture System — Current State

### What's Built

1. **Atlas Loader** (`TileRenderer.ts` ~line 115–250)
   - `ensureAtlasLoaded()` / `preloadAtlas()` — lazy-load both atlas PNGs
   - `drawAtlasTile(ctx, x, y, size, ref)` — draws a 32×32 tile with nearest-neighbour scaling
   - `AtlasRef` type: `{ atlas: 'terrain' | 'base', col: number, row: number }`

2. **ATLAS_TILES** (`TileRenderer.ts` ~line 190) — maps `TileType` → single `AtlasRef`:
   - 21 terrain surface types mapped (grass, dirt, sand, stone, etc.)
   - Render priority: Atlas → Noise terrain → Palette fallback

3. **ATLAS_OBJECT_VARIANTS** (`TileRenderer.ts` ~line 243) — maps object `TileType` → `AtlasRef[]`:
   - `tree`: 4 canopy variants from terrain atlas
   - `bush`: 2 variants
   - `rock`: 3 grey rock variants from base atlas
   - `drawAtlasObject()` picks variant deterministically per grid position via `hash2D`

4. **Atlas Tile Viewer** (`AtlasViewer.tsx`, access at `localhost:5173/?atlas=1`):
   - Loads both atlas PNGs client-side, splits into 32×32 tile grid
   - Checkerboard transparency display
   - Click to inspect: 4× preview, avg colour, opaque pixel count, 3×3 neighbours
   - Description, tags, optional TileType per tile
   - Filter by tag chips, search, show/hide empty tiles
   - Save/Load via `POST/GET /api/atlas/metadata` (backend persists to `atlas-metadata.json`)
   - Export JSON download or copy TypeScript `ATLAS_TILES` constant to clipboard

### Atlas Tile Stats
- `terrain_atlas.png`: 1012 filled tiles, 686 with transparency, 326 fully opaque
- `base_out_atlas.png`: 937 filled tiles, 532 with transparency, 405 fully opaque
- ~1218 tiles have transparency = edge/overlay tiles for blending between terrain types

### What the User Is Doing Now
The user is manually going through the Atlas Viewer, describing and tagging tiles. This metadata will be saved to `atlas-metadata.json` and can be used to:
- Build a proper auto-tiling system using the transparent edge tiles
- Map more tile types to atlas coordinates
- Create overlay/transition rendering between different terrain types

---

## Rendering Pipeline (`TileRenderer.ts`)

### Terrain Rendering Order
1. **Atlas tile** (if mapped in `ATLAS_TILES` and atlas loaded)
2. **Noise-based terrain** (Perlin/FBM noise with `TERRAIN_NOISE` config — 21 types)
3. **Palette fallback** (`TILE_PALETTE` solid colours)

### Object Rendering Order
1. **Atlas object variant** (if mapped in `ATLAS_OBJECT_VARIANTS`) — draws ambient floor first, then overlays atlas sprite
2. **Procedural draw function** (e.g. `drawTree`, `drawRock`, `drawBush`) — draws ambient floor + procedural shapes

### Key Systems
- **Ambient Floor Inference** (`inferAmbientFloor` / `drawAmbientFloor`): Objects look at cardinal neighbours to determine what floor they sit on, renders that floor behind the object
- **Noise Engine**: `noise2D`, `fbm2D`, `hash2D`, `smoothstep`, `lerpColor`
- **Wall Auto-tiling**: 4-bit bitmask for wall connectivity (N/E/S/W neighbours)
- **Wall Beveling**: 3D-like beveled edges on walls
- **Shadow Casting**: Walls cast soft shadows on adjacent floor tiles
- **~35 object draw functions**: barrel, crate, chest, table, chair, bookshelf, fountain, etc. — all use `drawAmbientFloor`

---

## What's Next / Ideas

### Immediate Opportunities (once atlas metadata is populated)
- **Auto-tiling with edge tiles**: Use the ~1200 transparent-edge tiles to create smooth transitions between terrain types (e.g. grass→dirt edges). The LPC atlas organizes these as autotile sets.
- **Expand ATLAS_TILES**: Use the metadata to map more TileType values to atlas coords
- **Expand ATLAS_OBJECT_VARIANTS**: Add more object variants (furniture, decorations, etc.)
- **Multi-tile objects**: Some atlas objects span 2×2 or larger (big trees, buildings)

### Other Backlog Items
- **Character editor + level-up button**: Gate behind XP > 1000
- **More procedural map themes**: The map generator supports themes (dungeon, forest, cave, etc.)

---

## Running the App

```powershell
# Backend (port 3001)
cd backend
npx tsx src/index.ts

# Frontend dev server (port 5173)
cd frontend
npx vite

# Atlas Viewer
# Open http://localhost:5173/?atlas=1

# Type check
cd frontend
npx tsc --noEmit
```

---

## Recent Changes Log (most recent first)

1. **Atlas Viewer scrolling fix** — Changed `.atlas-viewer` from `min-height: 100vh` to `height: 100vh` + `overflow: hidden` so the tile grid scrolls properly within the viewport
2. **Atlas Tile Viewer** — Full dev tool page: grid display, inspector panel, tag/search/filter, save/load metadata via backend API
3. **Atlas object variants** — `ATLAS_OBJECT_VARIANTS` with multi-variant support for tree (4), bush (2), rock (3). `drawAtlasObject()` helper. Updated `drawTree`, `drawBush`, `drawRock` to try atlas first.
4. **Dirt atlas fix** — Changed dirt from `[col:1, row:5]` (too dark) to `[col:5, row:5]` (warmer tan-brown)
5. **drawRock signature update** — Changed from `(ctx, x, y, size, bgTile)` to `(ctx, x, y, size, tiles, seed)` for ambient floor inference
6. **Atlas texture integration** — Full atlas loader, 21 terrain mappings, `drawAtlasTile`, integrated into `drawTile`/`drawAmbientFloor`/`renderTileMap`, `preloadAtlas` in BattleGrid
7. **Ambient floor inference** — `inferAmbientFloor`/`drawAmbientFloor` for all ~35 object draw functions
8. **Perlin noise terrain** — Noise engine, 21 terrain noise configs, gradient transitions
9. **Wall beveling & shadows** — 3D wall edges, shadow casting
10. **Enhanced object rendering** — Barrel wood grain, cobblestone patterns, bridge planks, crate details
