/**
 * Canvas-based Tile Renderer for PF2e Rebirth procedural maps.
 *
 * Draws each tile type programmatically with colors, patterns, and auto-tiling.
 * No external sprite images required — everything is rendered from code.
 *
 * Features:
 * - Auto-tiling: walls connect based on neighbors (corners, edges, T-junctions)
 * - Fog of war overlay from line-of-sight data
 * - Terrain-appropriate colors and mini-patterns
 * - Grid lines overlay
 */

import {
  TileType,
  TILE_MECHANICS,
  ProceduralMap,
  AtlasOverlay,
  calculatePartyLineOfSight,
} from '../../../shared/mapGenerator';
import { Position } from '../../../shared/types';

// ─── Color Palette ──────────────────────────────────────────

type TileColors = {
  fill: string;
  stroke?: string;
  pattern?: 'dots' | 'lines' | 'cross' | 'checker' | 'waves' | 'cracks' | 'grass-blades';
  patternColor?: string;
  icon?: string;         // Unicode symbol to draw centered
  iconColor?: string;
  iconSize?: number;
};

const TILE_PALETTE: Record<TileType, TileColors> = {
  'wall':           { fill: '#3a3a4a', stroke: '#2a2a35', pattern: 'lines', patternColor: '#4a4a5a' },
  'floor':          { fill: '#6b6b78', stroke: '#5a5a68', pattern: 'dots', patternColor: '#7a7a88' },
  'floor-alt':      { fill: '#7a6b60', stroke: '#6a5b50', pattern: 'checker', patternColor: '#8a7b70' },
  'corridor':       { fill: '#5e5e6e', stroke: '#4e4e5e', pattern: 'dots', patternColor: '#6e6e7e' },
  'door':           { fill: '#8b6914', stroke: '#6b4910' },
  'door-open':      { fill: '#a0855a', stroke: '#7a6540' },
  'dirt':           { fill: '#7a6b55', stroke: '#6a5b45', pattern: 'dots', patternColor: '#8a7b65' },
  'grass':          { fill: '#4a7a3a', stroke: '#3a6a2a', pattern: 'grass-blades', patternColor: '#5a8a4a' },
  'grass-tall':     { fill: '#3a6a2a', stroke: '#2a5a1a', pattern: 'grass-blades', patternColor: '#4a7a3a' },
  'stone':          { fill: '#8a8a8a', stroke: '#7a7a7a', pattern: 'cracks', patternColor: '#6a6a6a' },
  'sand':           { fill: '#d4b87a', stroke: '#c4a86a', pattern: 'dots', patternColor: '#e4c88a' },
  'snow':           { fill: '#e8e8f0', stroke: '#d8d8e0', pattern: 'dots', patternColor: '#f0f0f8' },
  'water-shallow':  { fill: '#4a8ab0', stroke: '#3a7aa0', pattern: 'waves', patternColor: '#5a9ac0' },
  'water-deep':     { fill: '#2a5a80', stroke: '#1a4a70', pattern: 'waves', patternColor: '#3a6a90' },
  'lava':           { fill: '#cc3300', stroke: '#aa2200', pattern: 'waves', patternColor: '#ff6600' },
  'pit':            { fill: '#1a1a1a', stroke: '#0a0a0a' },
  'ice':            { fill: '#a0d0e8', stroke: '#90c0d8', pattern: 'lines', patternColor: '#b0e0f0' },
  'rubble':         { fill: '#8a7a6a', stroke: '#7a6a5a', pattern: 'cracks', patternColor: '#6a5a4a' },
  'stairs-up':      { fill: '#6b6b78', stroke: '#5a5a68' },
  'stairs-down':    { fill: '#6b6b78', stroke: '#5a5a68' },
  'chest':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'pillar':         { fill: '#8a8a8a', stroke: '#6a6a6a' },
  'tree':           { fill: '#3a6a2a' },
  'bush':           { fill: '#4a7a3a', stroke: '#3a6a2a' },
  'rock':           { fill: '#7a7a7a', stroke: '#5a5a5a' },
  'bridge':         { fill: '#8b6914', stroke: '#6b4910' },
  'carpet':         { fill: '#8b2020', stroke: '#6b1010', pattern: 'checker', patternColor: '#9b3030' },
  'void':           { fill: '#0a0a0a' },
  // ── New environmental tiles ──
  'mud':            { fill: '#5a4a30', stroke: '#4a3a20', pattern: 'dots', patternColor: '#6a5a40' },
  'cobblestone':    { fill: '#787878', stroke: '#686868' },
  'planks':         { fill: '#9a7a50', stroke: '#8a6a40', pattern: 'lines', patternColor: '#aa8a60' },
  'barrel':         { fill: '#6b6b78', stroke: '#5a5a68' },
  'crate':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'table':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'chair':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'bookshelf':      { fill: '#6b6b78', stroke: '#5a5a68' },
  'fountain':       { fill: '#4a8ab0', stroke: '#3a7aa0' },
  'well':           { fill: '#6a6a6a', stroke: '#5a5a5a' },
  'anvil':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'hay':            { fill: '#c8b44a', stroke: '#b8a43a', pattern: 'grass-blades', patternColor: '#d8c45a' },
  'fence':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'fence-gate':     { fill: '#8b6914', stroke: '#6b4910' },
  'lamp-post':      { fill: '#7a7a7a', stroke: '#5a5a5a' },
  'statue':         { fill: '#6b6b78', stroke: '#5a5a68' },
  'altar':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'rug':            { fill: '#8b3030', stroke: '#6b2020', pattern: 'checker', patternColor: '#ab5050' },
  'counter':        { fill: '#6b6b78', stroke: '#5a5a68' },
  'bed':            { fill: '#6b6b78', stroke: '#5a5a68' },
  'firepit':        { fill: '#3a3a3a', stroke: '#2a2a2a' },
  'log':            { fill: '#4a7a3a', stroke: '#3a6a2a' },
  'mushroom':       { fill: '#4a7a3a', stroke: '#3a6a2a' },
  'tombstone':      { fill: '#4a7a3a', stroke: '#3a6a2a' },
  // Advanced structural / decorative
  'window':         { fill: '#3a3a4a', stroke: '#2a2a35' },
  'trap':           { fill: '#6b6b78', stroke: '#5a5a68' },
  'chandelier':     { fill: '#6b6b78', stroke: '#5a5a68' },
  'shelf':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'weapon-rack':    { fill: '#6b6b78', stroke: '#5a5a68' },
  'painting':       { fill: '#3a3a4a', stroke: '#2a2a35' },
  'candelabra':     { fill: '#6b6b78', stroke: '#5a5a68' },
  'archway':        { fill: '#8a8a8a', stroke: '#6a6a6a' },
  'drain':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'moss-stone':     { fill: '#6a8a6a', stroke: '#5a7a5a', pattern: 'dots', patternColor: '#7a9a7a' },
  // Interactive / mechanical
  'torch':          { fill: '#3a3a4a', stroke: '#2a2a35' },
  'portcullis':     { fill: '#6b6b78', stroke: '#5a5a68' },
  'lever':          { fill: '#6b6b78', stroke: '#5a5a68' },
  'secret-door':    { fill: '#3a3a4a', stroke: '#2a2a35' },
  'trapdoor':       { fill: '#6b6b78', stroke: '#5a5a68' },
  'throne':         { fill: '#6b6b78', stroke: '#5a5a68' },
  'banner':         { fill: '#3a3a4a', stroke: '#2a2a35' },
  'minecart-track': { fill: '#6b6b78', stroke: '#5a5a68' },
  // Multi-tile overhang tiles
  'barrel-top':        { fill: '#8b6914', stroke: '#6b4910' },
  'barrel-cluster-nw': { fill: '#8b6914', stroke: '#6b4910' },
  'barrel-cluster-ne': { fill: '#8b6914', stroke: '#6b4910' },
  'barrel-cluster-sw': { fill: '#8b6914', stroke: '#6b4910' },
  'barrel-cluster-se': { fill: '#8b6914', stroke: '#6b4910' },
  'tree-canopy':       { fill: '#2a6a1a', stroke: '#1a5a0a' },
  'ladder-mid':        { fill: '#8b6914', stroke: '#6b4910' },
  'ladder-top':        { fill: '#8b6914', stroke: '#6b4910' },
};

// Reverse lookup: TileColors reference → TileType name (for noise-based bg in objects)
const PALETTE_TO_TYPE = new Map<TileColors, TileType>();
for (const [key, val] of Object.entries(TILE_PALETTE)) {
  PALETTE_TO_TYPE.set(val, key as TileType);
}

// ─── LPC Atlas Texture System ───────────────────────────────
//
// Uses the Liberated Pixel Cup (LPC) spritesheet atlases for terrain
// rendering.  Each atlas is a 1024×1024 PNG containing 32×32 px tiles
// in a 32-column × 32-row grid.
//
// Tile coordinates below were identified by colour-sampling the
// atlases.  Objects keep their procedural look; only terrain surfaces
// use atlas tiles so the two styles blend nicely.

const ATLAS_TILE_PX = 32; // source tile size in the atlas image

/** Cached atlas HTMLImageElements (loaded lazily on first render). */
let terrainAtlas: HTMLImageElement | null = null;
let baseOutAtlas: HTMLImageElement | null = null;
let atlasLoadStarted = false;
let atlasReady = false;

/** Kick off atlas loading (idempotent).  Returns `true` once both are decoded. */
function ensureAtlasLoaded(): boolean {
  if (atlasReady) return true;
  if (atlasLoadStarted) {
    atlasReady = !!(terrainAtlas?.complete && baseOutAtlas?.complete);
    return atlasReady;
  }
  atlasLoadStarted = true;

  terrainAtlas = new Image();
  terrainAtlas.src = '/textures/terrain_atlas.png';

  baseOutAtlas = new Image();
  baseOutAtlas.src = '/textures/base_out_atlas.png';

  return false;
}

/** Returns a Promise that resolves once both atlas sheets are loaded. */
export function preloadAtlas(): Promise<void> {
  ensureAtlasLoaded();
  return new Promise<void>((resolve) => {
    const check = () => {
      if (terrainAtlas?.complete && baseOutAtlas?.complete) {
        atlasReady = true;
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

// ─── Extra Atlas Loading (for overlay stamps from other atlas sheets) ───

/** Map of atlas name → image URL for non-core atlases. */
const EXTRA_ATLAS_URLS: Record<string, string> = {
  'lpc_exterior':    '/textures/lpc_exterior_tiles.png',
  'lpc_outside_obj': '/textures/lpc_outside_objects.png',
  'lpc_terrain_out': '/textures/lpc_terrain_outside.png',
  'house_inside':    '/textures/house_inside.png',
  'lpc_interior':    '/textures/lpc_interior.png',
  'lpc_interior2':   '/textures/lpc_interior_2.png',
  'lpc_effects':     '/textures/lpc_effects.png',
  'lpc_items':       '/textures/lpc_items.png',
  'lpc_greek':       '/textures/lpc_greek_architecture.png',
  'dungeon_floors':  '/textures/dungeon_walls_floors.png',
};

/** Cache for lazily-loaded extra atlas images. */
const extraAtlasCache: Record<string, HTMLImageElement> = {};

/** Get (or lazy-load) an extra atlas image by name. Returns null if name unknown. */
function getExtraAtlas(name: string): HTMLImageElement | null {
  if (extraAtlasCache[name]) return extraAtlasCache[name];
  const url = EXTRA_ATLAS_URLS[name];
  if (!url) return null;
  const img = new Image();
  img.src = url;
  extraAtlasCache[name] = img;
  return img;
}

type AtlasRef = {
  atlas: 'terrain' | 'base';
  col: number; // 0-31 column in the atlas
  row: number; // 0-31 row in the atlas
};

/**
 * Terrain TileType → atlas source coordinates.
 *
 * Coordinates reference the "solid-fill" variant of each LPC autotile
 * set — the tile that appears when all four neighbours are the same type.
 *
 * Only surface / terrain tiles are mapped here.  Object tiles (barrel,
 * chest, table …) keep their procedural draw functions.
 */
const ATLAS_TILES: Partial<Record<TileType, AtlasRef>> = {
  // ── Natural terrain (terrain_atlas.png) ──────────────────
  'grass':          { atlas: 'terrain', col: 22, row: 5 },
  'grass-tall':     { atlas: 'terrain', col: 21, row: 5 },
  'dirt':           { atlas: 'terrain', col:  5, row: 5 },
  'sand':           { atlas: 'terrain', col:  1, row: 10 },
  'mud':            { atlas: 'terrain', col: 19, row: 1 },
  'ice':            { atlas: 'terrain', col:  2, row: 16 },
  'snow':           { atlas: 'terrain', col:  4, row: 16 },
  'stone':          { atlas: 'terrain', col:  1, row: 16 },
  'cobblestone':    { atlas: 'terrain', col:  3, row: 16 },
  'moss-stone':     { atlas: 'terrain', col: 13, row: 5 },
  'lava':           { atlas: 'terrain', col: 16, row: 7 },
  'water-shallow':  { atlas: 'terrain', col:  7, row: 10 },
  'water-deep':     { atlas: 'terrain', col: 10, row: 10 },

  // ── Indoor / constructed surfaces ────────────────────────
  'floor':          { atlas: 'terrain', col: 16, row: 1 },
  'floor-alt':      { atlas: 'terrain', col:  4, row: 5 },
  'corridor':       { atlas: 'terrain', col:  7, row: 5 },
  'planks':         { atlas: 'terrain', col: 19, row: 5 },
  'hay':            { atlas: 'terrain', col:  4, row: 10 },

  // ── Decorative surfaces  ─────────────────────────────────
  'carpet':         { atlas: 'base',    col:  1, row: 16 },
  'rug':            { atlas: 'base',    col:  7, row: 16 },

  // ── Multi-tile object atlas sprites ─────────────────────
  // Single barrel (1x2): main body + passable top overhang
  'barrel':            { atlas: 'base', col: 19, row: 15 },  // Barrel - M (main body)
  'barrel-top':        { atlas: 'base', col: 19, row: 14 },  // Barrel - T (lid overhang)
  // 3-barrel cluster (2x2)
  'barrel-cluster-nw': { atlas: 'base', col: 19, row: 16 },  // 3 Barrels - NW
  'barrel-cluster-ne': { atlas: 'base', col: 20, row: 16 },  // 3 Barrels - NE
  'barrel-cluster-sw': { atlas: 'base', col: 19, row: 17 },  // 3 Barrels - SW
  'barrel-cluster-se': { atlas: 'base', col: 20, row: 17 },  // 3 Barrels - SE
  // Ladder sections
  'ladder-top':        { atlas: 'base', col:  9, row: 4  },  // Ladder - N
  'ladder-mid':        { atlas: 'base', col:  9, row: 5  },  // Ladder - C
  // Tree canopy (rendered as overlay, uses procedural for now)
};

/**
 * Draw a single tile from an atlas spritesheet.
 * Disables image smoothing for crisp pixel-art scaling, then restores.
 * Returns `true` on success, `false` if atlas not yet loaded.
 */
function drawAtlasTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  ref: AtlasRef,
): boolean {
  const img = ref.atlas === 'terrain' ? terrainAtlas : baseOutAtlas;
  if (!img?.complete) return false;

  const srcX = ref.col * ATLAS_TILE_PX;
  const srcY = ref.row * ATLAS_TILE_PX;

  // Pixel-art needs nearest-neighbour scaling
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    img,
    srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX,
    x * size, y * size, size, size,
  );

  ctx.imageSmoothingEnabled = prevSmoothing;
  return true;
}

// ─── 2×2 Sub-Tile Terrain System ────────────────────────────
//
// Each grid cell is rendered as a 2×2 quadrant of atlas sub-tiles.
// This lets us use edge / corner atlas tiles for terrain transitions
// and better matches the aspect ratio of the 32×32 atlas images.
//
// Quadrant layout within a cell:
//   NW (0,0) | NE (1,0)
//   ---------+---------
//   SW (0,1) | SE (1,1)

/**
 * Draw an atlas tile into one quadrant of a cell.
 * qx/qy are 0 or 1 for the quadrant position.
 */
function drawAtlasQuadrant(
  ctx: CanvasRenderingContext2D,
  cellX: number, cellY: number,
  cellSize: number,
  qx: 0 | 1, qy: 0 | 1,
  ref: AtlasRef,
): boolean {
  const img = ref.atlas === 'terrain' ? terrainAtlas : baseOutAtlas;
  if (!img?.complete) return false;

  const srcX = ref.col * ATLAS_TILE_PX;
  const srcY = ref.row * ATLAS_TILE_PX;
  const half = cellSize / 2;
  const dstX = cellX * cellSize + qx * half;
  const dstY = cellY * cellSize + qy * half;

  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX, dstX, dstY, half, half);
  ctx.imageSmoothingEnabled = prevSmoothing;
  return true;
}

/**
 * Edge tile sets for terrain types that have full 9-tile edge sets in the atlas.
 * Keys: C (centre), N, S, E, W, NE, NW, SE, SW
 * The edge tiles have transparency on the transitioning sides so they can be
 * layered over an underlying terrain.
 */
interface TerrainEdgeSet {
  /** What surface type this edge set belongs to */
  terrain: TileType;
  /** The 9 atlas refs: C, N, S, E, W, NE, NW, SE, SW */
  C:  AtlasRef;
  N:  AtlasRef;
  S:  AtlasRef;
  E:  AtlasRef;
  W:  AtlasRef;
  NE: AtlasRef;
  NW: AtlasRef;
  SE: AtlasRef;
  SW: AtlasRef;
  /** Optional inner corner refs — used when both cardinals match but diagonal doesn't */
  iNE?: AtlasRef;
  iNW?: AtlasRef;
  iSE?: AtlasRef;
  iSW?: AtlasRef;
  /** Optional alternate edge set — used when the "different" neighbor is grass */
  grassEdges?: Omit<TerrainEdgeSet, 'terrain' | 'grassEdges'>;
}

/** Grass is the BASE terrain — drawn solid under everything else. */
const GRASS_CENTER: AtlasRef  = { atlas: 'base', col: 22, row: 3 };  // plain grass
const GRASS_MEDIUM: AtlasRef  = { atlas: 'base', col: 22, row: 5 };  // medium-height grass
const GRASS_TALL:   AtlasRef  = { atlas: 'base', col: 21, row: 5 };  // tall grass
const GRASS_SHORT:  AtlasRef  = { atlas: 'base', col: 23, row: 5 };  // short / trimmed grass

/** All grass variants for noise-driven selection */
const GRASS_VARIANTS: AtlasRef[] = [GRASS_SHORT, GRASS_CENTER, GRASS_MEDIUM, GRASS_TALL];

/**
 * Pick a grass variant for a specific quadrant using layered noise.
 * - Low-frequency noise creates large organic patches/clumps of each type.
 * - A secondary higher-frequency noise adds variety at the edges of patches
 *   so boundaries aren't perfectly sharp.
 * Returns one of the GRASS_VARIANTS refs.
 */
function pickGrassVariant(cellX: number, cellY: number, qx: number, qy: number, seed: number): AtlasRef {
  // Sub-quadrant world position (0.25 offset to center within the quadrant)
  const wx = cellX + qx * 0.5 + 0.25;
  const wy = cellY + qy * 0.5 + 0.25;

  // Low-frequency noise for large clumps (scale ~0.15 → patches ~6-7 tiles wide)
  const lo = noise2D(wx * 0.15, wy * 0.15, seed + 7777);
  // Higher-frequency detail noise for ragged patch boundaries
  const hi = noise2D(wx * 0.6, wy * 0.6, seed + 3141);

  // Blend: mostly large patches, some detail variation
  const v = lo * 0.75 + hi * 0.25;

  // Map 0-1 range to variant index with unequal weights:
  //   0.00–0.25  short   (25%)
  //   0.25–0.55  plain   (30%)  — most common
  //   0.55–0.80  medium  (25%)
  //   0.80–1.00  tall    (20%)
  if (v < 0.25) return GRASS_SHORT;
  if (v < 0.55) return GRASS_CENTER;
  if (v < 0.80) return GRASS_MEDIUM;
  return GRASS_TALL;
}

/**
 * Overlay edge sets — terrain types that draw ON TOP of the grass base.
 * Edge tiles have transparency on transitioning sides so the grass shows through.
 */
const OVERLAY_EDGE_SETS: TerrainEdgeSet[] = [
  // ── Light Dirt (overlays on grass) ──
  {
    terrain: 'dirt',
    C:  { atlas: 'base', col: 16, row: 3 },
    N:  { atlas: 'base', col: 16, row: 2 },
    S:  { atlas: 'base', col: 16, row: 4 },
    E:  { atlas: 'base', col: 17, row: 3 },
    W:  { atlas: 'base', col: 15, row: 3 },
    NE: { atlas: 'base', col: 17, row: 2 },
    NW: { atlas: 'base', col: 15, row: 2 },
    SE: { atlas: 'base', col: 17, row: 4 },
    SW: { atlas: 'base', col: 15, row: 4 },
    // Inner corners (terrain atlas) — dirt fills the corner, transparency on the cut-out
    iNE: { atlas: 'terrain', col: 16, row: 1 },
    iNW: { atlas: 'terrain', col: 17, row: 1 },
    iSE: { atlas: 'terrain', col: 16, row: 0 },
    iSW: { atlas: 'terrain', col: 17, row: 0 },
  },
  // ── Dark Dirt (used for mud, overlays on grass) ──
  {
    terrain: 'mud',
    C:  { atlas: 'base', col: 19, row: 3 },
    N:  { atlas: 'base', col: 19, row: 2 },
    S:  { atlas: 'base', col: 19, row: 4 },
    E:  { atlas: 'base', col: 20, row: 3 },
    W:  { atlas: 'base', col: 18, row: 3 },
    NE: { atlas: 'base', col: 20, row: 2 },
    NW: { atlas: 'base', col: 18, row: 2 },
    SE: { atlas: 'base', col: 20, row: 4 },
    SW: { atlas: 'base', col: 18, row: 4 },
  },
  // ── Water (default: terrain atlas regular water; grassEdges: terrain atlas grass-edge water) ──
  {
    terrain: 'water-shallow',
    // Default tiles — terrain atlas regular water edges
    C:  { atlas: 'terrain', col: 10, row: 12 },
    N:  { atlas: 'terrain', col: 10, row: 11 },
    S:  { atlas: 'terrain', col: 10, row: 13 },
    E:  { atlas: 'terrain', col: 11, row: 12 },
    W:  { atlas: 'terrain', col:  9, row: 12 },
    NE: { atlas: 'terrain', col: 11, row: 11 },
    NW: { atlas: 'terrain', col:  9, row: 11 },
    SE: { atlas: 'terrain', col: 11, row: 13 },
    SW: { atlas: 'terrain', col:  9, row: 13 },
    iNE: { atlas: 'terrain', col: 10, row: 10 },
    iNW: { atlas: 'terrain', col: 11, row: 10 },
    iSE: { atlas: 'terrain', col: 10, row:  9 },
    iSW: { atlas: 'terrain', col: 11, row:  9 },
    // Grass-edge overrides — used when the neighbor causing the edge is grass
    grassEdges: {
      C:  { atlas: 'terrain', col:  7, row: 12 },
      N:  { atlas: 'terrain', col:  7, row: 11 },
      S:  { atlas: 'terrain', col:  7, row: 13 },
      E:  { atlas: 'terrain', col:  8, row: 12 },
      W:  { atlas: 'terrain', col:  6, row: 12 },
      NE: { atlas: 'terrain', col:  8, row: 11 },
      NW: { atlas: 'terrain', col:  6, row: 11 },
      SE: { atlas: 'terrain', col:  8, row: 13 },
      SW: { atlas: 'terrain', col:  6, row: 13 },
      iNE: { atlas: 'terrain', col:  7, row: 10 },
      iNW: { atlas: 'terrain', col:  8, row: 10 },
      iSE: { atlas: 'terrain', col:  7, row:  9 },
      iSW: { atlas: 'terrain', col:  8, row:  9 },
    },
  },
];

/** Quick lookup: TileType → overlay edge set (only for non-base terrains) */
const OVERLAY_EDGE_BY_TERRAIN = new Map<TileType, TerrainEdgeSet>();
for (const es of OVERLAY_EDGE_SETS) {
  OVERLAY_EDGE_BY_TERRAIN.set(es.terrain, es);
}
// water-deep reuses water-shallow edge set
OVERLAY_EDGE_BY_TERRAIN.set('water-deep', OVERLAY_EDGE_SETS.find(e => e.terrain === 'water-shallow')!);

/** Terrain types that are part of the sub-tile system (base + overlay) */
const SUB_TILE_TERRAINS = new Set<TileType>([
  'grass', 'dirt', 'mud', 'water-shallow', 'water-deep',
]);

/** Types considered "same terrain" when deciding overlay edges */
function isSameTerrain(a: TileType, b: TileType): boolean {
  if (a === b) return true;
  // Water variants are same family
  if ((a === 'water-shallow' || a === 'water-deep') && (b === 'water-shallow' || b === 'water-deep')) return true;
  // Dirt and mud are same family for edge purposes
  if ((a === 'dirt' || a === 'mud') && (b === 'dirt' || b === 'mud')) return true;
  return false;
}

/**
 * For a given terrain cell, decide which sub-tile variant (C/N/S/E/W/corner)
 * each of the 4 quadrants should use.
 *
 * Each quadrant looks at its two adjacent cardinal neighbors and the diagonal:
 *   NW quadrant: checks N, W, NW neighbors
 *   NE quadrant: checks N, E, NE neighbors
 *   SW quadrant: checks S, W, SW neighbors
 *   SE quadrant: checks S, E, SE neighbors
 *
 * If ALL three neighbors are same terrain → centre tile
 * If diagonal same but one/both cardinals differ → edge tile
 * If diagonal differs → corner tile
 */
function pickQuadrantRef(
  edgeSet: TerrainEdgeSet,
  tiles: TileType[][],
  x: number, y: number,
  qx: 0 | 1, qy: 0 | 1,
): AtlasRef {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const me = tiles[y][x];

  // Cardinal direction offsets for this quadrant
  const dx = qx === 0 ? -1 : 1;  // W or E
  const dy = qy === 0 ? -1 : 1;  // N or S

  // Neighbor tile types (null if out-of-bounds, treated as same terrain)
  const hTile = (x + dx >= 0 && x + dx < w) ? tiles[y][x + dx] : null;
  const vTile = (y + dy >= 0 && y + dy < h) ? tiles[y + dy][x] : null;
  const dTile = (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h)
    ? tiles[y + dy][x + dx] : null;

  // Check three neighbors
  const hasH = hTile === null || isSameTerrain(me, hTile);
  const hasV = vTile === null || isSameTerrain(me, vTile);
  const hasD = dTile === null || isSameTerrain(me, dTile);

  if (hasH && hasV && hasD) {
    return edgeSet.C;
  }

  // Helper: pick from grassEdges override when the "different" neighbor is grass
  const ge = edgeSet.grassEdges;
  const isGrass = (t: TileType | null) => t === 'grass';
  // For edges/corners, check if the causing neighbor(s) are grass → use grass edge set
  const pick = (key: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'iNE' | 'iNW' | 'iSE' | 'iSW',
                causers: (TileType | null)[]): AtlasRef => {
    if (ge && causers.some(isGrass)) {
      const alt = (ge as Record<string, AtlasRef | undefined>)[key];
      if (alt) return alt;
    }
    return (edgeSet as unknown as Record<string, AtlasRef>)[key];
  };

  // Both cardinals missing → corner
  if (!hasH && !hasV) {
    if (qx === 0 && qy === 0) return pick('NW', [hTile, vTile]);
    if (qx === 1 && qy === 0) return pick('NE', [hTile, vTile]);
    if (qx === 0 && qy === 1) return pick('SW', [hTile, vTile]);
    return pick('SE', [hTile, vTile]);
  }

  // Only horizontal neighbor missing → vertical edge (E or W edge)
  if (!hasH && hasV) {
    return qx === 0 ? pick('W', [hTile]) : pick('E', [hTile]);
  }

  // Only vertical neighbor missing → horizontal edge (N or S edge)
  if (hasH && !hasV) {
    return qy === 0 ? pick('N', [vTile]) : pick('S', [vTile]);
  }

  // hasH && hasV but !hasD → inner corner (diagonal neighbor is different terrain)
  // Use inner corner tile if available, otherwise fall back to centre
  if (edgeSet.iNE || edgeSet.iNW || edgeSet.iSE || edgeSet.iSW) {
    if (qx === 0 && qy === 0 && edgeSet.iNW) return pick('iNW', [dTile]);
    if (qx === 1 && qy === 0 && edgeSet.iNE) return pick('iNE', [dTile]);
    if (qx === 0 && qy === 1 && edgeSet.iSW) return pick('iSW', [dTile]);
    if (qx === 1 && qy === 1 && edgeSet.iSE) return pick('iSE', [dTile]);
  }
  return edgeSet.C;
}

/**
 * Draw a terrain cell using the layered sub-tile system:
 *   1. Draw grass base (solid centre tile in all 4 quadrants)
 *   2. If the cell is an overlay terrain (dirt, water, etc.), draw edge-aware
 *      overlay tiles on top — the transparent edges let the grass show through.
 *
 * Returns true if handled, false to fall back to other rendering.
 */
function drawTerrainSubTiles(
  ctx: CanvasRenderingContext2D,
  tiles: TileType[][],
  x: number, y: number,
  size: number,
  seed: number,
): boolean {
  const tile = tiles[y][x];
  if (!SUB_TILE_TERRAINS.has(tile)) return false;

  const quadrants: [0 | 1, 0 | 1][] = [[0, 0], [1, 0], [0, 1], [1, 1]];

  // Step 1: Draw grass base with noise-driven variant mixing per quadrant
  for (const [qx, qy] of quadrants) {
    const grassRef = pickGrassVariant(x, y, qx, qy, seed);
    drawAtlasQuadrant(ctx, x, y, size, qx, qy, grassRef);
  }

  // Step 2: If this cell is NOT grass, overlay the edge-aware terrain on top
  if (tile !== 'grass') {
    const edgeSet = OVERLAY_EDGE_BY_TERRAIN.get(tile);
    if (edgeSet) {
      for (const [qx, qy] of quadrants) {
        const ref = pickQuadrantRef(edgeSet, tiles, x, y, qx, qy);
        drawAtlasQuadrant(ctx, x, y, size, qx, qy, ref);
      }
    }
  }

  return true;
}

// ─── Tree2 Multi-Tile Rendering (2×3 atlas → 1×2 grid cells) ────

/** Tree2 atlas refs (terrain atlas).  2 wide × 3 tall. */
const TREE2_ATLAS = {
  NW: { atlas: 'terrain' as const, col: 27, row: 29 },  // overhang top-left
  NE: { atlas: 'terrain' as const, col: 28, row: 29 },  // overhang top-right
  W:  { atlas: 'terrain' as const, col: 27, row: 30 },  // trunk top-left
  E:  { atlas: 'terrain' as const, col: 28, row: 30 },  // trunk top-right
  SW: { atlas: 'terrain' as const, col: 27, row: 31 },  // trunk bottom-left
  SE: { atlas: 'terrain' as const, col: 28, row: 31 },  // trunk bottom-right
};

/**
 * Draw the TRUNK portion of Tree2 (the bottom 4 atlas tiles → fills the tree cell as 2×2).
 * Called during the normal tile rendering pass.
 */
function drawTree2Trunk(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  tiles: TileType[][],
  seed: number,
): boolean {
  // Draw grass base using the same 2×2 noise-driven variant system as terrain
  const quadrants: [0 | 1, 0 | 1][] = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const [qx, qy] of quadrants) {
    const grassRef = pickGrassVariant(x, y, qx, qy, seed);
    drawAtlasQuadrant(ctx, x, y, size, qx, qy, grassRef);
  }

  const half = size / 2;
  const px = x * size;
  const py = y * size;
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  const img = terrainAtlas;
  if (!img?.complete) return false;

  // Middle row (W, E) → top half of the cell
  const refs = [TREE2_ATLAS.W, TREE2_ATLAS.E, TREE2_ATLAS.SW, TREE2_ATLAS.SE];
  const positions = [[0, 0], [half, 0], [0, half], [half, half]];
  for (let i = 0; i < 4; i++) {
    const srcX = refs[i].col * ATLAS_TILE_PX;
    const srcY = refs[i].row * ATLAS_TILE_PX;
    ctx.drawImage(img, srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX, px + positions[i][0], py + positions[i][1], half, half);
  }

  ctx.imageSmoothingEnabled = prevSmoothing;
  return true;
}

/**
 * Draw the CANOPY OVERHANG of Tree2 into the cell ABOVE the tree trunk.
 * This should be called in an overlay pass that renders on top of creatures.
 * (x, y) is the position of the tree trunk; we draw into (x, y-1).
 */
function drawTree2Overhang(
  ctx: CanvasRenderingContext2D,
  treeX: number, treeY: number,
  size: number,
): boolean {
  const overY = treeY - 1;
  if (overY < 0) return false;

  const img = terrainAtlas;
  if (!img?.complete) return false;

  const half = size / 2;
  const px = treeX * size;
  const py = overY * size;
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  // NW → top-left quadrant, NE → top-right quadrant of the overhang cell
  // These are the "top" part of the tree canopy
  const refs = [TREE2_ATLAS.NW, TREE2_ATLAS.NE];
  const offsets = [[0, half], [half, half]]; // Draw in the bottom half of the above cell
  for (let i = 0; i < 2; i++) {
    const srcX = refs[i].col * ATLAS_TILE_PX;
    const srcY = refs[i].row * ATLAS_TILE_PX;
    ctx.drawImage(img, srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX, px + offsets[i][0], py + offsets[i][1], half, half);
  }

  ctx.imageSmoothingEnabled = prevSmoothing;
  return true;
}

/**
 * Render all tree canopy overhangs.  Call this in a separate pass that sits
 * above the creature layer so tokens behind trees are partially hidden.
 * Accepts optional fog-of-war data so overhangs match the main canvas treatment.
 */
export function renderTreeOverhangs(
  ctx: CanvasRenderingContext2D,
  tiles: TileType[][],
  cellSize: number,
  options?: {
    fogOfWar?: boolean;
    visibleCells?: Set<string>;
    revealedCells?: Set<string>;
  },
): void {
  if (!ensureAtlasLoaded()) return;
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] === 'tree') {
        const overY = y - 1;
        if (overY < 0) continue;

        // Check fog-of-war for the OVERHANG cell (the cell above the trunk)
        if (options?.fogOfWar && options.visibleCells) {
          const key = `${x},${overY}`;
          if (!options.visibleCells.has(key) && !options.revealedCells?.has(key)) {
            // Completely unseen — skip drawing the overhang entirely
            continue;
          }
        }

        drawTree2Overhang(ctx, x, y, cellSize);

        // Apply matching fog-of-war darkening on top of the overhang
        if (options?.fogOfWar && options.visibleCells) {
          const key = `${x},${overY}`;
          const half = cellSize / 2;
          const px = x * cellSize;
          const py = overY * cellSize + half; // overhang is in bottom half of above cell

          if (options.visibleCells.has(key)) {
            // Visible — check for soft edge vignette
            let atEdge = false;
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
              const nx = x + dx, ny = overY + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && !options.visibleCells.has(`${nx},${ny}`)) {
                atEdge = true;
                break;
              }
            }
            if (atEdge) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
              ctx.fillRect(px, py, cellSize, half);
            }
          } else if (options.revealedCells?.has(key)) {
            // Previously seen — dim to match main canvas
            ctx.fillStyle = 'rgba(5, 5, 20, 0.55)';
            ctx.fillRect(px, py, cellSize, half);
          }
        }
      }
    }
  }
}

/**
 * Object tiles that have multiple atlas variants.
 * A variant is chosen deterministically per position via hash2D.
 */
const ATLAS_OBJECT_VARIANTS: Partial<Record<TileType, AtlasRef[]>> = {
  'tree': [
    { atlas: 'terrain', col: 1,  row: 21 },  // bright green canopy (set 1)
    { atlas: 'terrain', col: 4,  row: 21 },  // alternate bright canopy (set 2)
    { atlas: 'terrain', col: 1,  row: 24 },  // darker solid canopy
    { atlas: 'terrain', col: 0,  row: 25 },  // dark forest green
  ],
  'bush': [
    { atlas: 'terrain', col: 3,  row: 25 },  // blue-green bush fill
    { atlas: 'terrain', col: 4,  row: 25 },  // darker blue-green bush
  ],
  'rock': [
    { atlas: 'base',    col: 25, row: 6  },  // warm grey rock
    { atlas: 'base',    col: 27, row: 7  },  // warm grey variant
    { atlas: 'base',    col: 25, row: 8  },  // lighter grey rock
  ],
};

/**
 * Draw an object tile from an atlas variant list.
 * Renders the ambient floor background first, then overlays the atlas
 * sprite.  The variant is picked deterministically from position + seed.
 * Returns `true` if the atlas was used, `false` to fall back to procedural.
 */
function drawAtlasObject(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  tiles: TileType[][],
  seed: number,
  tileType: TileType,
): boolean {
  const variants = ATLAS_OBJECT_VARIANTS[tileType];
  if (!variants?.length) return false;

  // Deterministic variant selection per grid position
  const h = hash2D(x, y, seed);
  const idx = Math.min(Math.floor(h * variants.length), variants.length - 1);
  const ref = variants[idx];

  // Ambient floor underneath
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Overlay the object sprite
  return drawAtlasTile(ctx, x, y, size, ref);
}

// ─── Auto-Tiling (Wall connectivity) ────────────────────────

/**
 * Determine which wall variant to draw based on neighbors.
 * Uses a 4-bit bitmask: N=1, E=2, S=4, W=8
 */
function getWallBitmask(tiles: TileType[][], x: number, y: number): number {
  const w = tiles[0].length;
  const h = tiles.length;
  const isWall = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= w || ty < 0 || ty >= h) return true; // edge = wall
    const t = tiles[ty][tx];
    return t === 'wall' || t === 'pillar' || t === 'void';
  };

  let mask = 0;
  if (isWall(x, y - 1)) mask |= 1;  // North
  if (isWall(x + 1, y)) mask |= 2;  // East
  if (isWall(x, y + 1)) mask |= 4;  // South
  if (isWall(x - 1, y)) mask |= 8;  // West
  return mask;
}

// ─── Tile Drawing Functions ─────────────────────────────────

function drawTileBase(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: TileColors): void {
  const px = x * size;
  const py = y * size;

  // Use noise-based rendering when available for this palette entry
  const tileType = PALETTE_TO_TYPE.get(colors);
  if (tileType && drawNoisyTerrain(ctx, x, y, size, tileType, 42)) {
    return;
  }

  // Fill
  ctx.fillStyle = colors.fill;
  ctx.fillRect(px, py, size, size);

  // Stroke (subtle border)
  if (colors.stroke) {
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
  }
}

function drawPattern(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: TileColors, seed: number): void {
  if (!colors.pattern || !colors.patternColor) return;
  const px = x * size;
  const py = y * size;

  ctx.fillStyle = colors.patternColor;
  ctx.strokeStyle = colors.patternColor;

  switch (colors.pattern) {
    case 'dots': {
      // Small scattered dots
      const rng = simpleSeed(seed + x * 7 + y * 13);
      for (let i = 0; i < 3; i++) {
        const dx = (rng() * 0.8 + 0.1) * size;
        const dy = (rng() * 0.8 + 0.1) * size;
        ctx.beginPath();
        ctx.arc(px + dx, py + dy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lines': {
      // Horizontal brick-like lines
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      for (let dy = size * 0.33; dy < size; dy += size * 0.33) {
        ctx.beginPath();
        ctx.moveTo(px, py + dy);
        ctx.lineTo(px + size, py + dy);
        ctx.stroke();
      }
      // Vertical stagger for brick pattern
      const offset = (y % 2) * (size / 2);
      ctx.beginPath();
      ctx.moveTo(px + offset + size * 0.5, py);
      ctx.lineTo(px + offset + size * 0.5, py + size);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'cross': {
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(px + size * 0.3, py + size * 0.3);
      ctx.lineTo(px + size * 0.7, py + size * 0.7);
      ctx.moveTo(px + size * 0.7, py + size * 0.3);
      ctx.lineTo(px + size * 0.3, py + size * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'checker': {
      if ((x + y) % 2 === 0) {
        ctx.globalAlpha = 0.15;
        ctx.fillRect(px, py, size, size);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'waves': {
      ctx.lineWidth = 0.7;
      ctx.globalAlpha = 0.3;
      const waveY = py + size * 0.5;
      ctx.beginPath();
      ctx.moveTo(px, waveY);
      for (let wx = 0; wx <= size; wx += 4) {
        const wy = Math.sin((wx + x * size) * 0.3) * 3;
        ctx.lineTo(px + wx, waveY + wy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'cracks': {
      const rng = simpleSeed(seed + x * 17 + y * 23);
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      const startX = px + rng() * size;
      const startY = py + rng() * size;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + (rng() - 0.5) * size * 0.6, startY + (rng() - 0.5) * size * 0.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'grass-blades': {
      const rng = simpleSeed(seed + x * 31 + y * 37);
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 4; i++) {
        const bx = px + rng() * size;
        const by = py + size * 0.9;
        const tipY = by - size * (0.3 + rng() * 0.3);
        const lean = (rng() - 0.5) * size * 0.2;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + lean * 0.5, tipY + (by - tipY) * 0.5, bx + lean, tipY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colors: TileColors): void {
  if (!colors.icon) return;
  const px = x * size;
  const py = y * size;
  const iconSize = (colors.iconSize ?? 0.5) * size;

  ctx.font = `${iconSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (colors.iconColor) {
    ctx.fillStyle = colors.iconColor;
  }
  ctx.fillText(colors.icon, px + size / 2, py + size / 2);
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][]): void {
  const px = x * size;
  const py = y * size;
  const mask = getWallBitmask(tiles, x, y);

  // ── Noise-based stone fill ──
  const baseFill = hexToRgb('#3a3a4a');
  const altFill = hexToRgb('#4a4a58');
  const step = Math.max(2, Math.floor(size / 8));
  for (let dy = 0; dy < size; dy += step) {
    for (let dx = 0; dx < size; dx += step) {
      const nx = (x + dx / size) * 2.5;
      const ny = (y + dy / size) * 2.5;
      const n = fbm2D(nx, ny, 2, 42);
      ctx.fillStyle = lerpColor(baseFill, altFill, n);
      ctx.fillRect(px + dx, py + dy, step, step);
    }
  }

  // ── Stone block pattern ──
  const blockRows = 3;
  const blockH = size / blockRows;
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 0.8;
  for (let row = 0; row < blockRows; row++) {
    const ly = py + row * blockH;
    ctx.beginPath();
    ctx.moveTo(px, ly);
    ctx.lineTo(px + size, ly);
    ctx.stroke();
    // Staggered vertical joints
    const offset = (row + y) % 2 === 0 ? 0 : size * 0.5;
    const jointX = px + offset + size * 0.5;
    if (jointX > px && jointX < px + size) {
      ctx.beginPath();
      ctx.moveTo(jointX, ly);
      ctx.lineTo(jointX, ly + blockH);
      ctx.stroke();
    }
    // Second joint for full coverage
    const jointX2 = jointX - size;
    if (jointX2 > px && jointX2 < px + size) {
      ctx.beginPath();
      ctx.moveTo(jointX2, ly);
      ctx.lineTo(jointX2, ly + blockH);
      ctx.stroke();
    }
  }

  // ── 3D beveling: exposed edges get highlights/shadows ──
  const edgeSize = size * 0.15;
  const highlightColor = 'rgba(120,120,140,0.35)';
  const shadowColor = 'rgba(0,0,0,0.3)';

  if (!(mask & 1)) { // Open to north → top face highlight
    const g = ctx.createLinearGradient(px, py, px, py + edgeSize);
    g.addColorStop(0, highlightColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, size, edgeSize);
  }
  if (!(mask & 4)) { // Open to south → bottom shadow
    const g = ctx.createLinearGradient(px, py + size - edgeSize, px, py + size);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, shadowColor);
    ctx.fillStyle = g;
    ctx.fillRect(px, py + size - edgeSize, size, edgeSize);
  }
  if (!(mask & 8)) { // Open to west → left face highlight
    const g = ctx.createLinearGradient(px, py, px + edgeSize, py);
    g.addColorStop(0, highlightColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, edgeSize, size);
  }
  if (!(mask & 2)) { // Open to east → right shadow
    const g = ctx.createLinearGradient(px + size - edgeSize, py, px + size, py);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, shadowColor);
    ctx.fillStyle = g;
    ctx.fillRect(px + size - edgeSize, py, edgeSize, size);
  }

  // Top-face stone highlight for interior walls (fully enclosed)
  if (mask === 15) {
    ctx.fillStyle = 'rgba(80,80,100,0.1)';
    ctx.fillRect(px, py, size, size);
  }
}

function drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const px = x * size;
  const py = y * size;

  // Floor background
  ctx.fillStyle = TILE_PALETTE['floor'].fill;
  ctx.fillRect(px, py, size, size);

  // Circular pillar
  const radius = size * 0.35;
  ctx.fillStyle = '#9a9a9a';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, radius, 0, Math.PI * 2);
  ctx.fill();

  // Pillar highlight
  ctx.fillStyle = '#b0b0b0';
  ctx.beginPath();
  ctx.arc(px + size / 2 - radius * 0.2, py + size / 2 - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Dark outline
  ctx.strokeStyle = '#5a5a5a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
}

/** Large rock atlas ref (base atlas, single tile drawn into one cell) */
const ROCK_ATLAS: AtlasRef = { atlas: 'base', col: 15, row: 12 };

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  // Draw grass base using the same 2×2 noise-driven variant system
  const quadrants: [0 | 1, 0 | 1][] = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const [qx, qy] of quadrants) {
    const grassRef = pickGrassVariant(x, y, qx, qy, seed);
    drawAtlasQuadrant(ctx, x, y, size, qx, qy, grassRef);
  }

  // Draw the rock atlas tile on top
  drawAtlasTile(ctx, x, y, size, ROCK_ATLAS);
}

// ─── Ambient Floor Inference ────────────────────────────────

/** Floor-like tile types that objects can sit on top of */
const FLOOR_TILES = new Set<TileType>([
  'floor', 'floor-alt', 'corridor', 'dirt', 'grass', 'grass-tall',
  'stone', 'sand', 'snow', 'cobblestone', 'planks', 'mud',
  'hay', 'carpet', 'rug', 'moss-stone', 'ice',
]);

/**
 * Look at cardinal neighbors to figure out what floor type an object
 * should be rendered on top of. Falls back to 'floor' if nothing found.
 */
function inferAmbientFloor(tiles: TileType[][], x: number, y: number): TileType {
  const h = tiles.length, w = tiles[0]?.length ?? 0;
  const counts = new Map<TileType, number>();
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
      const t = tiles[ny][nx];
      if (FLOOR_TILES.has(t)) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
  }
  // Return the most common neighboring floor tile
  let best: TileType = 'floor';
  let bestCount = 0;
  for (const [t, c] of counts) {
    if (c > bestCount) { best = t; bestCount = c; }
  }
  return best;
}

/**
 * Draw the ambient floor background for an object tile.
 * Uses neighbor tiles to determine what floor to render.
 */
function drawAmbientFloor(ctx: CanvasRenderingContext2D, tiles: TileType[][], x: number, y: number, size: number, seed: number): void {
  const floorType = inferAmbientFloor(tiles, x, y);
  // Try atlas tile first
  const atlasRef = ATLAS_TILES[floorType];
  if (atlasRef && drawAtlasTile(ctx, x, y, size, atlasRef)) {
    return;
  }
  // Try noise-based rendering, fall back to palette
  if (!drawNoisyTerrain(ctx, x, y, size, floorType, seed)) {
    drawTileBase(ctx, x, y, size, TILE_PALETTE[floorType] || TILE_PALETTE['floor']);
  }
}

// Simple deterministic pseudo-random for patterns
function simpleSeed(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s / 0x7fffffff);
  };
}

// ─── 2D Value Noise (Perlin-like) ───────────────────────────

/** Integer hash for noise lattice */
function hash2D(ix: number, iy: number, seed: number): number {
  let h = seed + ix * 374761393 + iy * 668265263;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  h = (h ^ (h >>> 16)) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth 2D value noise returning 0–1 */
function noise2D(x: number, y: number, seed: number = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const n00 = hash2D(ix, iy, seed);
  const n10 = hash2D(ix + 1, iy, seed);
  const n01 = hash2D(ix, iy + 1, seed);
  const n11 = hash2D(ix + 1, iy + 1, seed);

  return (n00 + fx * (n10 - n00)) + fy * ((n01 + fx * (n11 - n01)) - (n00 + fx * (n10 - n00)));
}

/** Fractal Brownian Motion – layered noise for natural textures */
function fbm2D(x: number, y: number, octaves: number = 3, seed: number = 0): number {
  let value = 0, amplitude = 0.5, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 1000);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

/** Parse a hex color to {r,g,b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Lerp between two RGB colors. t = 0 → a, t = 1 → b */
function lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

// ─── Noise-enhanced Terrain Drawing ─────────────────────────

/** Terrain noise configuration */
type TerrainNoiseConfig = {
  /** Primary / secondary color for noise lerp */
  baseColor: string;
  altColor: string;
  /** Noise frequency (higher = more variation per tile) */
  frequency: number;
  /** Number of noise octaves (more = finer detail) */
  octaves: number;
  /** Extra detail overlay type */
  detail?: 'stone-cracks' | 'grass-blades' | 'sand-grains' | 'wood-grain'
    | 'waves' | 'ice-sheen' | 'lava-glow' | 'brick-lines' | 'carpet-weave' | 'moss-spots';
  /** Highlight color for specular / rim */
  highlight?: string;
};

const TERRAIN_NOISE: Partial<Record<TileType, TerrainNoiseConfig>> = {
  'floor':         { baseColor: '#6b6b78', altColor: '#7a7a88', frequency: 2.5, octaves: 3, detail: 'stone-cracks', highlight: '#8a8a95' },
  'floor-alt':     { baseColor: '#7a6b60', altColor: '#8e7e70', frequency: 2.0, octaves: 3, detail: 'stone-cracks', highlight: '#9a8b7a' },
  'corridor':      { baseColor: '#5e5e6e', altColor: '#6e6e80', frequency: 2.2, octaves: 2, detail: 'stone-cracks', highlight: '#7e7e90' },
  'dirt':          { baseColor: '#7a6b55', altColor: '#8e7e65', frequency: 3.0, octaves: 3, detail: 'sand-grains' },
  'grass':         { baseColor: '#3a7a2a', altColor: '#4fa03a', frequency: 3.5, octaves: 3, detail: 'grass-blades', highlight: '#60b04a' },
  'grass-tall':    { baseColor: '#2a5a1a', altColor: '#3d7a2d', frequency: 3.0, octaves: 3, detail: 'grass-blades', highlight: '#4a8a3a' },
  'stone':         { baseColor: '#8a8a8a', altColor: '#9a9a98', frequency: 2.0, octaves: 3, detail: 'stone-cracks', highlight: '#aaaaaa' },
  'sand':          { baseColor: '#d4b87a', altColor: '#e2ca90', frequency: 4.0, octaves: 2, detail: 'sand-grains', highlight: '#f0daa0' },
  'snow':          { baseColor: '#dce0e8', altColor: '#eef0f6', frequency: 3.0, octaves: 2, detail: 'ice-sheen', highlight: '#f8f8ff' },
  'water-shallow': { baseColor: '#3a7aa0', altColor: '#5098c0', frequency: 2.5, octaves: 2, detail: 'waves', highlight: '#68b0d8' },
  'water-deep':    { baseColor: '#1a4a70', altColor: '#2a6090', frequency: 2.0, octaves: 2, detail: 'waves', highlight: '#3a7aaa' },
  'lava':          { baseColor: '#aa2200', altColor: '#ee5500', frequency: 2.0, octaves: 3, detail: 'lava-glow', highlight: '#ff8800' },
  'ice':           { baseColor: '#90c0d8', altColor: '#b0daf0', frequency: 2.5, octaves: 2, detail: 'ice-sheen', highlight: '#c8eaff' },
  'rubble':        { baseColor: '#7a6a5a', altColor: '#90806a', frequency: 3.5, octaves: 3, detail: 'stone-cracks' },
  'mud':           { baseColor: '#5a4a30', altColor: '#6e5e42', frequency: 3.0, octaves: 3, detail: 'sand-grains' },
  'planks':        { baseColor: '#8a6a40', altColor: '#a08050', frequency: 1.5, octaves: 2, detail: 'wood-grain', highlight: '#b09060' },
  'hay':           { baseColor: '#c0a840', altColor: '#d8c060', frequency: 3.5, octaves: 2, detail: 'grass-blades', highlight: '#e8d070' },
  'carpet':        { baseColor: '#8b2020', altColor: '#a03030', frequency: 2.0, octaves: 2, detail: 'carpet-weave', highlight: '#b84040' },
  'rug':           { baseColor: '#8b3030', altColor: '#ab4545', frequency: 2.0, octaves: 2, detail: 'carpet-weave', highlight: '#c05050' },
  'moss-stone':    { baseColor: '#5a7a5a', altColor: '#6a9a68', frequency: 3.0, octaves: 3, detail: 'moss-spots', highlight: '#7aaa78' },
  'pit':           { baseColor: '#0a0a0a', altColor: '#1a1a2a', frequency: 1.5, octaves: 2 },
  'void':          { baseColor: '#050508', altColor: '#10101a', frequency: 1.0, octaves: 1 },
};

/**
 * Draw a terrain tile with noise-based coloring and procedural detail.
 * Replaces flat fillRect + sparse pattern for supported tile types.
 */
function drawNoisyTerrain(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  tile: TileType,
  seed: number,
): boolean {
  const cfg = TERRAIN_NOISE[tile];
  if (!cfg) return false; // Tile not configured for noise — fall back to old renderer

  const px = x * size;
  const py = y * size;
  const base = hexToRgb(cfg.baseColor);
  const alt = hexToRgb(cfg.altColor);

  // ── Per-pixel noise fill (sampled at 4-px resolution for performance) ──
  const step = Math.max(2, Math.floor(size / 10)); // 2-4px blocks
  for (let dy = 0; dy < size; dy += step) {
    for (let dx = 0; dx < size; dx += step) {
      const nx = (x + dx / size) * cfg.frequency;
      const ny = (y + dy / size) * cfg.frequency;
      const n = fbm2D(nx, ny, cfg.octaves, seed);
      ctx.fillStyle = lerpColor(base, alt, n);
      ctx.fillRect(px + dx, py + dy, step, step);
    }
  }

  // ── Subtle edge darkening (ambient occlusion feel) ──
  const ao = ctx.createLinearGradient(px, py, px, py + size);
  ao.addColorStop(0, 'rgba(0,0,0,0.06)');
  ao.addColorStop(0.15, 'rgba(0,0,0,0)');
  ao.addColorStop(0.85, 'rgba(0,0,0,0)');
  ao.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = ao;
  ctx.fillRect(px, py, size, size);

  // ── Detail overlays ──
  const rng = simpleSeed(seed + x * 31 + y * 47);
  switch (cfg.detail) {
    case 'stone-cracks': {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        const sx = px + rng() * size;
        const sy = py + rng() * size;
        const ex = sx + (rng() - 0.5) * size * 0.5;
        const ey = sy + (rng() - 0.5) * size * 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const mx = (sx + ex) / 2 + (rng() - 0.5) * size * 0.15;
        const my = (sy + ey) / 2 + (rng() - 0.5) * size * 0.15;
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
      }
      break;
    }
    case 'grass-blades': {
      const highlight = cfg.highlight ? hexToRgb(cfg.highlight) : alt;
      for (let i = 0; i < 8; i++) {
        const bx = px + rng() * size;
        const by = py + size * (0.6 + rng() * 0.35);
        const tipY = by - size * (0.2 + rng() * 0.35);
        const lean = (rng() - 0.5) * size * 0.18;
        const shade = 0.4 + rng() * 0.3;
        ctx.strokeStyle = lerpColor(base, highlight, shade);
        ctx.lineWidth = 0.7 + rng() * 0.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + lean * 0.5, tipY + (by - tipY) * 0.4, bx + lean, tipY);
        ctx.stroke();
      }
      break;
    }
    case 'sand-grains': {
      ctx.fillStyle = cfg.highlight || cfg.altColor;
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 6; i++) {
        const gx = px + rng() * size;
        const gy = py + rng() * size;
        ctx.beginPath();
        ctx.arc(gx, gy, 0.5 + rng() * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'wood-grain': {
      ctx.strokeStyle = 'rgba(60,40,20,0.15)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const gy = py + size * (0.15 + i * 0.22 + (rng() - 0.5) * 0.05);
        ctx.beginPath();
        ctx.moveTo(px + 1, gy);
        for (let wx = 0; wx < size; wx += 4) {
          ctx.lineTo(px + wx, gy + Math.sin(wx * 0.3 + rng() * 5) * 1.2);
        }
        ctx.stroke();
      }
      // Knot hole
      if (rng() > 0.55) {
        const kx = px + size * (0.3 + rng() * 0.4);
        const ky = py + size * (0.3 + rng() * 0.4);
        ctx.fillStyle = 'rgba(60,40,20,0.2)';
        ctx.beginPath();
        ctx.arc(kx, ky, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'waves': {
      ctx.strokeStyle = cfg.highlight || 'rgba(120,180,255,0.3)';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.35;
      for (let row = 0; row < 3; row++) {
        const wy = py + size * (0.2 + row * 0.3) + rng() * size * 0.05;
        ctx.beginPath();
        ctx.moveTo(px, wy);
        for (let wx = 0; wx <= size; wx += 3) {
          const vy = Math.sin((wx + x * size + row * 7) * 0.25 + rng() * 2) * 2.5;
          ctx.lineTo(px + wx, wy + vy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Specular highlights
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 2; i++) {
        const sx = px + rng() * size * 0.8 + size * 0.1;
        const sy = py + rng() * size * 0.8 + size * 0.1;
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.08, size * 0.03, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lava-glow': {
      // Hot spots
      for (let i = 0; i < 3; i++) {
        const gx = px + rng() * size * 0.6 + size * 0.2;
        const gy = py + rng() * size * 0.6 + size * 0.2;
        const gr = size * (0.1 + rng() * 0.15);
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grad.addColorStop(0, 'rgba(255,200,50,0.35)');
        grad.addColorStop(0.5, 'rgba(255,100,0,0.15)');
        grad.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, size, size);
      }
      // Dark crust cracks
      ctx.strokeStyle = 'rgba(50,10,0,0.3)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 2; i++) {
        const sx = px + rng() * size;
        const sy = py + rng() * size;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (rng() - 0.5) * size * 0.4, sy + (rng() - 0.5) * size * 0.4);
        ctx.stroke();
      }
      break;
    }
    case 'ice-sheen': {
      // Glossy reflection streaks
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 2; i++) {
        const rx = px + rng() * size * 0.6 + size * 0.1;
        const ry = py + rng() * size * 0.6 + size * 0.1;
        ctx.beginPath();
        ctx.ellipse(rx, ry, size * 0.15, size * 0.04, rng() * Math.PI * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'carpet-weave': {
      // Cross-hatch weave pattern
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = cfg.highlight || '#fff';
      ctx.lineWidth = 0.4;
      for (let i = 0; i < size; i += 4) {
        ctx.beginPath();
        ctx.moveTo(px + i, py);
        ctx.lineTo(px + i, py + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, py + i);
        ctx.lineTo(px + size, py + i);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Decorative border
      ctx.strokeStyle = 'rgba(200,180,80,0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);
      break;
    }
    case 'moss-spots': {
      // Irregular moss patches over stone
      for (let i = 0; i < 5; i++) {
        const mx = px + rng() * size * 0.8 + size * 0.1;
        const my = py + rng() * size * 0.8 + size * 0.1;
        const mr = size * (0.04 + rng() * 0.06);
        ctx.fillStyle = `rgba(60,${120 + Math.floor(rng() * 40)},40,0.3)`;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'brick-lines': {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.6;
      const brickH = size / 3;
      for (let row = 0; row < 3; row++) {
        const ly = py + row * brickH;
        ctx.beginPath();
        ctx.moveTo(px, ly);
        ctx.lineTo(px + size, ly);
        ctx.stroke();
        // Staggered vertical joints
        const offset = (row % 2) * (size / 2);
        ctx.beginPath();
        ctx.moveTo(px + offset + size * 0.5, ly);
        ctx.lineTo(px + offset + size * 0.5, ly + brickH);
        ctx.stroke();
      }
      break;
    }
  }

  return true; // Successfully rendered
}

// ─── Main Render Function ───────────────────────────────────

export interface TileRendererOptions {
  cellSize: number;
  showGrid: boolean;
  gridColor: string;
  gridOpacity: number;
  detailMode?: 'standard' | 'high';
  fogOfWar: boolean;
  visibleCells?: Set<string>;        // Line-of-sight data
  revealedCells?: Set<string>;       // Previously seen cells (dimmed)
  highlightCells?: Map<string, string>; // "x,y" → color for movement/AoE highlights
  seed?: number;
  radialLighting?: boolean;          // Enable radial light from light-emitting tiles
  ambientLight?: number;             // Base ambient light level 0-1 (default 0.3)
  weather?: 'none' | 'rain' | 'snow' | 'fog' | 'ash';  // Weather overlay type
  weatherIntensity?: number;         // Weather intensity 0-1 (default 0.5)
  weatherFrame?: number;             // Animation frame for weather particles
  elevation?: number[][];            // Per-tile elevation data for visual indicators
  showElevation?: boolean;           // Show elevation indicators
  showCoverQuality?: boolean;        // Show cover quality indicators on tiles
  overlays?: AtlasOverlay[];         // Atlas sprite overlays (from procedural map)
}

const DEFAULT_OPTIONS: TileRendererOptions = {
  cellSize: 40,
  showGrid: true,
  gridColor: 'rgba(255,255,255,0.12)',
  gridOpacity: 1,
  detailMode: 'high',
  fogOfWar: true,
  seed: 42,
};

/**
 * Render the tile map to a canvas context.
 * This is the main rendering entry point.
 */
export function renderTileMap(
  ctx: CanvasRenderingContext2D,
  tiles: TileType[][],
  options: Partial<TileRendererOptions> = {},
): void {
  // Kick off atlas loading (idempotent — fast no-op after first call)
  ensureAtlasLoaded();

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { cellSize, seed } = opts;
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;

  // Clear canvas
  ctx.clearRect(0, 0, width * cellSize, height * cellSize);

  // Draw each tile
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      drawTile(ctx, tiles, x, y, cellSize, tile, seed ?? 42);
    }
  }

  if (opts.detailMode === 'high') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        // Skip bevel highlight on sub-tile terrain — it creates visible cell borders
        if (SUB_TILE_TERRAINS.has(tile)) continue;
        const px = x * cellSize;
        const py = y * cellSize;
        const mechanics = TILE_MECHANICS[tile];

        const highlight = ctx.createLinearGradient(px, py, px + cellSize, py + cellSize);
        highlight.addColorStop(0, 'rgba(255,255,255,0.09)');
        highlight.addColorStop(0.45, 'rgba(255,255,255,0.03)');
        highlight.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = highlight;
        ctx.fillRect(px, py, cellSize, cellSize);

        if (!mechanics.passable) {
          ctx.fillStyle = 'rgba(0,0,0,0.09)';
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        const microSeed = simpleSeed((seed ?? 42) + x * 131 + y * 197);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 2; i++) {
          const sx = px + microSeed() * (cellSize - 1);
          const sy = py + microSeed() * (cellSize - 1);
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    }
  }

  // Tile transition blending — gradient edges between terrain types
  const TERRAIN_GROUPS: Record<string, string> = {
    'floor': 'stone', 'floor-alt': 'stone', 'stone': 'stone', 'cobblestone': 'stone',
    'corridor': 'stone',
    'dirt': 'earth', 'mud': 'earth', 'sand': 'earth',
    'grass': 'nature', 'grass-tall': 'nature', 'bush': 'nature',
    'water': 'water', 'water-shallow': 'water', 'water-deep': 'water',
    'lava': 'lava',
    'snow': 'cold', 'ice': 'cold',
    'planks': 'wood', 'hay': 'wood',
  };
  const TRANSITION_RGBA: Record<string, [number, number, number, number]> = {
    'stone':  [120, 110, 100, 0.18],
    'earth':  [140, 110, 70, 0.18],
    'nature': [80, 140, 60, 0.15],
    'water':  [60, 100, 180, 0.20],
    'lava':   [200, 60, 10, 0.18],
    'cold':   [180, 200, 240, 0.15],
    'wood':   [130, 100, 60, 0.12],
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      const group = TERRAIN_GROUPS[tile];
      if (!group) continue;
      // Skip transition blending for sub-tile terrain — they have their own edge tiles
      if (SUB_TILE_TERRAINS.has(tile)) continue;

      const rgba = TRANSITION_RGBA[group] || [100, 100, 100, 0.1];
      const [cr, cg, cb, ca] = rgba;

      for (const [dx, dy, edge] of [[0, -1, 'top'], [0, 1, 'bottom'], [-1, 0, 'left'], [1, 0, 'right']] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const neighborGroup = TERRAIN_GROUPS[tiles[ny][nx]];
          if (neighborGroup && neighborGroup !== group) {
            const px = x * cellSize;
            const py = y * cellSize;
            const edgeDepth = cellSize * 0.3;
            let grad: CanvasGradient;

            switch (edge) {
              case 'top':
                grad = ctx.createLinearGradient(px, py, px, py + edgeDepth);
                grad.addColorStop(0, `rgba(${cr},${cg},${cb},${ca})`);
                grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(px, py, cellSize, edgeDepth);
                break;
              case 'bottom':
                grad = ctx.createLinearGradient(px, py + cellSize, px, py + cellSize - edgeDepth);
                grad.addColorStop(0, `rgba(${cr},${cg},${cb},${ca})`);
                grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(px, py + cellSize - edgeDepth, cellSize, edgeDepth);
                break;
              case 'left':
                grad = ctx.createLinearGradient(px, py, px + edgeDepth, py);
                grad.addColorStop(0, `rgba(${cr},${cg},${cb},${ca})`);
                grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(px, py, edgeDepth, cellSize);
                break;
              case 'right':
                grad = ctx.createLinearGradient(px + cellSize, py, px + cellSize - edgeDepth, py);
                grad.addColorStop(0, `rgba(${cr},${cg},${cb},${ca})`);
                grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(px + cellSize - edgeDepth, py, edgeDepth, cellSize);
                break;
            }
          }
        }
      }
    }
  }

  // ── Shadow casting from walls/pillars onto adjacent floor tiles ──
  {
    const isBlocker = (tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
      const t = tiles[ty][tx];
      return t === 'wall' || t === 'pillar' || t === 'void' || t === 'window'
        || t === 'painting' || t === 'banner' || t === 'torch';
    };
    const isPassable = (tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
      return TILE_MECHANICS[tiles[ty][tx]]?.passable !== false;
    };

    // Light comes from top-left (NW) — so shadows fall to bottom-right (SE)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isPassable(x, y)) continue;

        const px = x * cellSize;
        const py = y * cellSize;
        const shadowLen = cellSize * 0.35;
        const shadowAlpha = 0.18;

        // Wall to the north → shadow on top edge
        if (isBlocker(x, y - 1)) {
          const g = ctx.createLinearGradient(px, py, px, py + shadowLen);
          g.addColorStop(0, `rgba(0,0,10,${shadowAlpha})`);
          g.addColorStop(1, 'rgba(0,0,10,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px, py, cellSize, shadowLen);
        }
        // Wall to the west → shadow on left edge
        if (isBlocker(x - 1, y)) {
          const g = ctx.createLinearGradient(px, py, px + shadowLen, py);
          g.addColorStop(0, `rgba(0,0,10,${shadowAlpha})`);
          g.addColorStop(1, 'rgba(0,0,10,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px, py, shadowLen, cellSize);
        }
        // Corner shadow: wall to NW (diagonal) — extra shadow in top-left corner
        if (isBlocker(x - 1, y - 1) && !isBlocker(x, y - 1) && !isBlocker(x - 1, y)) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, shadowLen * 0.8);
          g.addColorStop(0, `rgba(0,0,10,${shadowAlpha * 0.7})`);
          g.addColorStop(1, 'rgba(0,0,10,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px, py, shadowLen, shadowLen);
        }
      }
    }
  }

  // ── Atlas Overlay Pass ────────────────────────────────────
  // Draw approved atlas object sprites on top of the base tile rendering.
  // These come from the wilderness generator's atlas stamp system.
  if (opts.overlays?.length) {
    const atlasImages: Record<string, HTMLImageElement | null> = {
      'terrain': terrainAtlas,
      'base': baseOutAtlas,
    };
    // Lazy-load additional atlas images if needed
    for (const ov of opts.overlays) {
      if (!atlasImages[ov.atlas]) {
        const extra = getExtraAtlas(ov.atlas);
        if (extra) atlasImages[ov.atlas] = extra;
      }
    }

    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    for (const ov of opts.overlays) {
      const img = atlasImages[ov.atlas];
      if (!img?.complete) continue;
      const srcX = ov.col * ATLAS_TILE_PX;
      const srcY = ov.row * ATLAS_TILE_PX;
      // Zone overlays default to half-cell (subtile = 2.5ft in a 5ft cell).
      // Stamps explicitly set scale=1 for full-cell coverage.
      // Fractional x/y coordinates position subtiles at the correct quadrant.
      const s = ov.scale ?? 0.5;
      const dstSize = cellSize * s;
      ctx.drawImage(img, srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX,
        ov.x * cellSize, ov.y * cellSize, dstSize, dstSize);
    }
    ctx.imageSmoothingEnabled = prevSmoothing;
  }

  // Grid lines
  if (opts.showGrid) {
    ctx.strokeStyle = opts.gridColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = opts.gridOpacity;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, height * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(width * cellSize, y * cellSize);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Elevation indicators
  if (opts.showElevation && opts.elevation) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const elev = opts.elevation[y]?.[x] ?? 0;
        if (elev !== 0) {
          const px = x * cellSize;
          const py = y * cellSize;

          if (elev > 0) {
            // Higher elevation — subtle bright edge on top and left
            ctx.fillStyle = `rgba(255, 255, 220, ${Math.min(0.2, elev * 0.1)})`;
            ctx.fillRect(px, py, cellSize, 2);
            ctx.fillRect(px, py, 2, cellSize);
            // Shadow on bottom and right
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.15, elev * 0.08)})`;
            ctx.fillRect(px, py + cellSize - 2, cellSize, 2);
            ctx.fillRect(px + cellSize - 2, py, 2, cellSize);
            // Small up arrow indicator in corner
            ctx.fillStyle = 'rgba(255, 220, 100, 0.6)';
            ctx.font = `${cellSize * 0.25}px sans-serif`;
            ctx.fillText('▲', px + 1, py + cellSize * 0.3);
          } else {
            // Lower elevation — darker overlay + down arrow
            ctx.fillStyle = `rgba(0, 0, 30, ${Math.min(0.15, Math.abs(elev) * 0.08)})`;
            ctx.fillRect(px, py, cellSize, cellSize);
            // Recessed look — shadow on top and left
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.2, Math.abs(elev) * 0.1)})`;
            ctx.fillRect(px, py, cellSize, 2);
            ctx.fillRect(px, py, 2, cellSize);
            // Down arrow indicator
            ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
            ctx.font = `${cellSize * 0.25}px sans-serif`;
            ctx.fillText('▼', px + 1, py + cellSize * 0.3);
          }
        }
      }
    }
  }

  // Cover quality indicators
  if (opts.showCoverQuality) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        const mech = TILE_MECHANICS[tile];
        // Skip cover badges on wilderness sub-tile terrain (trees, bushes on grass)
        if (tile === 'tree' || tile === 'bush' || tile === 'rock') continue;
        if (mech.provideCover !== 'none' && !mech.passable) {
          const px = x * cellSize;
          const py = y * cellSize;
          const badgeSize = cellSize * 0.22;
          const bx = px + cellSize - badgeSize - 2;
          const by = py + 2;

          let badgeColor: string;
          let label: string;
          switch (mech.provideCover) {
            case 'lesser':   badgeColor = 'rgba(100, 180, 255, 0.7)'; label = 'L'; break;
            case 'standard': badgeColor = 'rgba(50, 200, 80, 0.7)';  label = 'S'; break;
            case 'greater':  badgeColor = 'rgba(255, 200, 50, 0.7)'; label = 'G'; break;
            default: continue;
          }

          // Shield-shaped badge
          ctx.fillStyle = badgeColor;
          ctx.beginPath();
          ctx.moveTo(bx + badgeSize / 2, by);
          ctx.lineTo(bx + badgeSize, by + badgeSize * 0.3);
          ctx.lineTo(bx + badgeSize, by + badgeSize * 0.7);
          ctx.lineTo(bx + badgeSize / 2, by + badgeSize);
          ctx.lineTo(bx, by + badgeSize * 0.7);
          ctx.lineTo(bx, by + badgeSize * 0.3);
          ctx.closePath();
          ctx.fill();

          // Label letter
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = `bold ${badgeSize * 0.6}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(label, bx + badgeSize / 2, by + badgeSize * 0.7);
          ctx.textAlign = 'start';
        }
      }
    }
  }

  // Radial lighting — warm glow from light-emitting tiles
  if (opts.radialLighting) {
    const lightSources: Array<{ x: number; y: number; radius: number; r: number; g: number; b: number; intensity: number }> = [];
    const LIGHT_TILES: Record<string, { radius: number; r: number; g: number; b: number; intensity: number }> = {
      'torch':      { radius: 4, r: 255, g: 180, b: 60, intensity: 0.18 },
      'candelabra': { radius: 3.5, r: 255, g: 200, b: 80, intensity: 0.15 },
      'chandelier': { radius: 5, r: 255, g: 220, b: 120, intensity: 0.2 },
      'firepit':    { radius: 4.5, r: 255, g: 140, b: 40, intensity: 0.22 },
      'lamp-post':  { radius: 4, r: 255, g: 220, b: 100, intensity: 0.16 },
      'window':     { radius: 3, r: 200, g: 220, b: 255, intensity: 0.1 },
      'lava':       { radius: 2.5, r: 255, g: 80, b: 20, intensity: 0.15 },
    };

    // Collect light sources
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const light = LIGHT_TILES[tiles[y][x]];
        if (light) lightSources.push({ x, y, ...light });
      }
    }

    // Apply ambient darkness first, then punch out light
    if (lightSources.length > 0) {
      const ambient = opts.ambientLight ?? 0.3;
      // Build a light map
      const lightMap: number[][] = [];
      for (let y = 0; y < height; y++) {
        lightMap[y] = [];
        for (let x = 0; x < width; x++) {
          lightMap[y][x] = ambient;
        }
      }

      // Add light contributions
      for (const light of lightSources) {
        const r = Math.ceil(light.radius);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const tx = light.x + dx;
            const ty = light.y + dy;
            if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= light.radius) {
                const falloff = 1 - (dist / light.radius);
                lightMap[ty][tx] = Math.min(1, lightMap[ty][tx] + falloff * light.intensity * 3);
              }
            }
          }
        }
      }

      // Draw darkness overlay where light is low
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const lightLevel = Math.min(1, lightMap[y][x]);
          if (lightLevel < 1) {
            const darkness = (1 - lightLevel) * 0.5;
            ctx.fillStyle = `rgba(0, 0, 20, ${darkness})`;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      // Draw warm glow halos around light sources
      for (const light of lightSources) {
        const cx = (light.x + 0.5) * cellSize;
        const cy = (light.y + 0.5) * cellSize;
        const gr = light.radius * cellSize;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        gradient.addColorStop(0, `rgba(${light.r}, ${light.g}, ${light.b}, ${light.intensity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${light.r}, ${light.g}, ${light.b}, ${light.intensity * 0.2})`);
        gradient.addColorStop(1, `rgba(${light.r}, ${light.g}, ${light.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect((light.x - light.radius) * cellSize, (light.y - light.radius) * cellSize, light.radius * 2 * cellSize, light.radius * 2 * cellSize);
      }
    }
  }

  // Fog of war
  if (opts.fogOfWar && opts.visibleCells) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        if (opts.visibleCells.has(key)) {
          // Fully visible — check for soft edge (adjacent to non-visible)
          let atEdge = false;
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dx, ny = y + dy;
            const nk = `${nx},${ny}`;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !opts.visibleCells.has(nk)) {
              atEdge = true;
              break;
            }
          }
          if (atEdge) {
            // Soft vignette at visibility edge
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        } else if (opts.revealedCells?.has(key)) {
          // Previously seen — dim with slight blue tint for memory
          ctx.fillStyle = 'rgba(5, 5, 20, 0.55)';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else {
          // Unseen — full darkness
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // Highlight cells (movement, AoE, etc.)
  if (opts.highlightCells) {
    for (const [key, color] of opts.highlightCells) {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // Weather overlay
  const weather = opts.weather ?? 'none';
  if (weather !== 'none') {
    const intensity = opts.weatherIntensity ?? 0.5;
    const frame = opts.weatherFrame ?? 0;
    const canvasW = width * cellSize;
    const canvasH = height * cellSize;
    const particleRng = simpleSeed((seed ?? 42) + frame);

    if (weather === 'rain') {
      // Rain streaks
      const dropCount = Math.floor(intensity * 120);
      ctx.strokeStyle = `rgba(150, 180, 255, ${0.3 * intensity})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < dropCount; i++) {
        const rx = particleRng() * canvasW;
        const ry = (particleRng() * canvasH + frame * 3) % canvasH;
        const len = 6 + particleRng() * 10;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + len);
        ctx.stroke();
      }
      // Ambient dampness overlay
      ctx.fillStyle = `rgba(40, 50, 70, ${0.08 * intensity})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else if (weather === 'snow') {
      // Snowflakes
      const flakeCount = Math.floor(intensity * 80);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * intensity})`;
      for (let i = 0; i < flakeCount; i++) {
        const sx = particleRng() * canvasW;
        const sy = (particleRng() * canvasH + frame * 1.5) % canvasH;
        const r = 1 + particleRng() * 2.5;
        ctx.beginPath();
        ctx.arc(sx + Math.sin(frame * 0.02 + i) * 3, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Frost overlay
      ctx.fillStyle = `rgba(200, 220, 255, ${0.05 * intensity})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else if (weather === 'fog') {
      // Fog — semi-transparent patches
      const patchCount = Math.floor(intensity * 30);
      for (let i = 0; i < patchCount; i++) {
        const fx = particleRng() * canvasW;
        const fy = particleRng() * canvasH;
        const fr = 30 + particleRng() * 60;
        const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        gradient.addColorStop(0, `rgba(180, 190, 200, ${0.12 * intensity})`);
        gradient.addColorStop(1, 'rgba(180, 190, 200, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
      }
    } else if (weather === 'ash') {
      // Volcanic ash — dark particles
      const ashCount = Math.floor(intensity * 60);
      ctx.fillStyle = `rgba(80, 60, 50, ${0.4 * intensity})`;
      for (let i = 0; i < ashCount; i++) {
        const ax = particleRng() * canvasW;
        const ay = (particleRng() * canvasH + frame * 0.8) % canvasH;
        const ar = 1 + particleRng() * 2;
        ctx.beginPath();
        ctx.arc(ax + Math.sin(frame * 0.01 + i * 2) * 5, ay, ar, 0, Math.PI * 2);
        ctx.fill();
      }
      // Red tint overlay
      ctx.fillStyle = `rgba(60, 20, 10, ${0.06 * intensity})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tiles: TileType[][],
  x: number, y: number,
  size: number,
  tile: TileType,
  seed: number,
): void {
  // Special rendering for certain tile types
  switch (tile) {
    case 'wall':
      drawWall(ctx, x, y, size, tiles);
      return;
    case 'door':
      drawDoor(ctx, x, y, size, tiles, false);
      return;
    case 'door-open':
      drawDoor(ctx, x, y, size, tiles, true);
      return;
    case 'pillar':
      drawPillar(ctx, x, y, size);
      return;
    case 'rock':
      drawRock(ctx, x, y, size, tiles, seed);
      return;
    case 'tree':
      drawTree2Trunk(ctx, x, y, size, tiles, seed);
      return;
    case 'bush':
      drawBush(ctx, x, y, size, tiles, seed);
      return;
    case 'chest':
      drawChest(ctx, x, y, size, tiles, seed);
      return;
    case 'stairs-up':
      drawStairs(ctx, x, y, size, true, tiles, seed);
      return;
    case 'stairs-down':
      drawStairs(ctx, x, y, size, false, tiles, seed);
      return;
    case 'cobblestone':
      drawCobblestone(ctx, x, y, size, seed);
      return;
    case 'barrel':
      drawBarrelAtlas(ctx, x, y, size, tiles, seed);
      return;
    case 'barrel-top':
    case 'barrel-cluster-nw':
    case 'barrel-cluster-ne':
    case 'barrel-cluster-sw':
    case 'barrel-cluster-se':
    case 'ladder-mid':
    case 'ladder-top':
      drawOverlayAtlasTile(ctx, x, y, size, tiles, seed, tile);
      return;
    case 'tree-canopy':
      drawTreeCanopy(ctx, x, y, size, tiles, seed);
      return;
    case 'crate':
      drawCrate(ctx, x, y, size, tiles, seed);
      return;
    case 'table':
      drawTable(ctx, x, y, size, tiles, seed);
      return;
    case 'chair':
      drawChair(ctx, x, y, size, tiles, seed);
      return;
    case 'bookshelf':
      drawBookshelf(ctx, x, y, size, tiles, seed);
      return;
    case 'fountain':
      drawFountain(ctx, x, y, size, tiles, seed);
      return;
    case 'well':
      drawWell(ctx, x, y, size, tiles, seed);
      return;
    case 'anvil':
      drawAnvil(ctx, x, y, size, tiles, seed);
      return;
    case 'fence':
      drawFence(ctx, x, y, size, tiles, seed);
      return;
    case 'fence-gate':
      drawFenceGate(ctx, x, y, size, tiles, seed);
      return;
    case 'lamp-post':
      drawLampPost(ctx, x, y, size, tiles, seed);
      return;
    case 'statue':
      drawStatue(ctx, x, y, size, tiles, seed);
      return;
    case 'altar':
      drawAltar(ctx, x, y, size, tiles, seed);
      return;
    case 'counter':
      drawCounter(ctx, x, y, size, tiles, seed);
      return;
    case 'bed':
      drawBed(ctx, x, y, size, tiles, seed);
      return;
    case 'firepit':
      drawFirepit(ctx, x, y, size, tiles, seed);
      return;
    case 'log':
      drawLog(ctx, x, y, size, tiles, seed);
      return;
    case 'mushroom':
      drawMushroom(ctx, x, y, size, tiles, seed);
      return;
    case 'tombstone':
      drawTombstone(ctx, x, y, size, tiles, seed);
      return;
    case 'window':
      drawWindow(ctx, x, y, size, tiles);
      return;
    case 'trap':
      drawTrap(ctx, x, y, size, seed, tiles);
      return;
    case 'chandelier':
      drawChandelier(ctx, x, y, size, tiles, seed);
      return;
    case 'shelf':
      drawShelf(ctx, x, y, size, tiles, seed);
      return;
    case 'weapon-rack':
      drawWeaponRack(ctx, x, y, size, tiles, seed);
      return;
    case 'painting':
      drawPainting(ctx, x, y, size, seed);
      return;
    case 'candelabra':
      drawCandelabra(ctx, x, y, size, tiles, seed);
      return;
    case 'archway':
      drawArchway(ctx, x, y, size, tiles);
      return;
    case 'drain':
      drawDrain(ctx, x, y, size, tiles, seed);
      return;
    case 'torch':
      drawTorch(ctx, x, y, size, tiles);
      return;
    case 'portcullis':
      drawPortcullis(ctx, x, y, size, tiles, seed);
      return;
    case 'lever':
      drawLever(ctx, x, y, size, tiles, seed);
      return;
    case 'secret-door':
      drawWall(ctx, x, y, size, tiles); // Looks like a wall!
      return;
    case 'trapdoor':
      drawTrapdoor(ctx, x, y, size, tiles, seed);
      return;
    case 'throne':
      drawThrone(ctx, x, y, size, tiles, seed);
      return;
    case 'banner':
      drawBanner(ctx, x, y, size, tiles, seed);
      return;
    case 'minecart-track':
      drawMinecartTrack(ctx, x, y, size, tiles);
      return;
    default:
      break;
  }

  // Try 2×2 sub-tile edge-aware terrain rendering first
  if (drawTerrainSubTiles(ctx, tiles, x, y, size, seed)) {
    return;
  }

  // Try LPC atlas tile first (pixel-art terrain textures)
  const atlasRef = ATLAS_TILES[tile];
  if (atlasRef && drawAtlasTile(ctx, x, y, size, atlasRef)) {
    return;
  }

  // Try noise-enhanced terrain rendering second
  if (drawNoisyTerrain(ctx, x, y, size, tile, seed)) {
    return;
  }

  // Standard tile rendering (fallback for unconfigured tiles)
  const colors = TILE_PALETTE[tile] || TILE_PALETTE['floor'];
  drawTileBase(ctx, x, y, size, colors);
  drawPattern(ctx, x, y, size, colors, seed);
  drawIcon(ctx, x, y, size, colors);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  // Try atlas variant first
  if (drawAtlasObject(ctx, x, y, size, tiles, seed, 'tree')) return;

  const px = x * size;
  const py = y * size;

  // Ground beneath tree
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Trunk
  ctx.fillStyle = '#6b4226';
  const trunkW = size * 0.15;
  ctx.fillRect(px + size / 2 - trunkW / 2, py + size * 0.55, trunkW, size * 0.35);

  // Canopy (3 overlapping circles for bushier look)
  ctx.fillStyle = '#2a6a1a';
  const r = size * 0.3;
  ctx.beginPath();
  ctx.arc(px + size * 0.4, py + size * 0.4, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + size * 0.6, py + size * 0.4, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a7a2a';
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.3, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

// ── Environmental Object Draw Functions ──────────────────────

function drawBarrel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  const cx = px + size / 2, cy = py + size / 2;
  const r = size * 0.35;

  // Shadow beneath barrel
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 2, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Barrel body (top-down circle with wood grain)
  const woodBase = hexToRgb('#8b6914');
  const woodAlt = hexToRgb('#a07a24');
  for (let ring = 0; ring < 5; ring++) {
    const ringR = r * (1 - ring * 0.18);
    const t = ring / 5;
    ctx.fillStyle = lerpColor(woodBase, woodAlt, t);
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial wood plank lines
  ctx.strokeStyle = 'rgba(80,50,10,0.2)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }

  // Metal bands
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();

  // Top highlight (3D roundness)
  const topGlow = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
  topGlow.addColorStop(0, 'rgba(255,255,200,0.18)');
  topGlow.addColorStop(0.5, 'rgba(255,255,200,0.05)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = topGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Bung hole
  ctx.fillStyle = '#3a2200';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a barrel using the atlas sprite instead of procedural art.
 * Falls back to the old procedural drawBarrel if atlas isn't loaded.
 */
function drawBarrelAtlas(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  size: number, tiles: TileType[][], seed: number,
): void {
  // Draw ambient floor underneath first
  drawAmbientFloor(ctx, tiles, x, y, size, seed);
  // Try atlas sprite
  const ref = ATLAS_TILES['barrel'];
  if (ref && drawAtlasTile(ctx, x, y, size, ref)) return;
  // Fallback to procedural barrel (the old drawBarrel body minus the ambient floor call)
  drawBarrel(ctx, x, y, size, tiles, seed);
}

/**
 * Draw a generic overlay tile from the atlas (barrel-top, ladder sections, etc.)
 * These are passable tiles that just render an atlas sprite over the ambient floor.
 */
function drawOverlayAtlasTile(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  size: number, tiles: TileType[][], seed: number, tileType: TileType,
): void {
  // Draw ambient floor underneath
  drawAmbientFloor(ctx, tiles, x, y, size, seed);
  // Overlay the atlas sprite (has transparency around the object)
  const ref = ATLAS_TILES[tileType];
  if (ref) drawAtlasTile(ctx, x, y, size, ref);
}

/**
 * Draw a tree canopy overhang — the passable squares near a tree trunk
 * that have canopy leafage extending over them.
 * Draws ambient floor + a semi-transparent green canopy overlay.
 */
function drawTreeCanopy(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  size: number, tiles: TileType[][], seed: number,
): void {
  // Draw the ambient floor
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  const px = x * size, py = y * size;
  const h = hash2D(x, y, seed);

  // Semi-transparent canopy circles (looks like leaf coverage)
  ctx.globalAlpha = 0.35;
  const leafColor = h > 0.5 ? '#2a6a1a' : '#1e5a12';
  ctx.fillStyle = leafColor;

  const cx = px + size * 0.5;
  const cy = py + size * 0.5;
  const r = size * (0.35 + h * 0.15);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // A second smaller circle offset for organic shape
  const ox = (h - 0.5) * size * 0.3;
  const oy = (hash2D(x + 7, y + 3, seed) - 0.5) * size * 0.3;
  ctx.beginPath();
  ctx.arc(cx + ox, cy + oy, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1.0;
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  const inset = size * 0.15;
  const cw = size - inset * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(px + inset + 2, py + inset + 2, cw, cw);

  // Crate box with wood grain noise
  const woodBase = hexToRgb('#9a7a40');
  const woodAlt = hexToRgb('#b09050');
  const step = Math.max(2, Math.floor(cw / 6));
  for (let dy = 0; dy < cw; dy += step) {
    for (let dx = 0; dx < cw; dx += step) {
      const n = noise2D((x * 3 + dx / cw * 2), (y * 3 + dy / cw * 2), 77);
      ctx.fillStyle = lerpColor(woodBase, woodAlt, n);
      ctx.fillRect(px + inset + dx, py + inset + dy, step, step);
    }
  }

  // Plank lines
  ctx.strokeStyle = 'rgba(80,50,20,0.25)';
  ctx.lineWidth = 0.6;
  for (let i = 1; i < 3; i++) {
    const ly = py + inset + i * cw / 3;
    ctx.beginPath();
    ctx.moveTo(px + inset, ly);
    ctx.lineTo(px + inset + cw, ly);
    ctx.stroke();
  }

  // Border / nails
  ctx.strokeStyle = '#6a4a18';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(px + inset, py + inset, cw, cw);

  // Cross bracing
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + inset, py + inset);
  ctx.lineTo(px + inset + cw, py + inset + cw);
  ctx.moveTo(px + inset + cw, py + inset);
  ctx.lineTo(px + inset, py + inset + cw);
  ctx.stroke();

  // Corner nails
  ctx.fillStyle = '#888';
  const nailR = size * 0.025;
  for (const [nx, ny] of [[inset, inset], [inset + cw, inset], [inset, inset + cw], [inset + cw, inset + cw]]) {
    ctx.beginPath();
    ctx.arc(px + nx, py + ny, nailR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Top-side highlight
  ctx.fillStyle = 'rgba(255,255,200,0.08)';
  ctx.fillRect(px + inset, py + inset, cw, cw * 0.3);
}

function drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Table top (rounded rectangle-ish)
  ctx.fillStyle = '#7a5a30';
  const inset = size * 0.12;
  ctx.fillRect(px + inset, py + inset * 1.5, size - inset * 2, size - inset * 3);
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + inset, py + inset * 1.5, size - inset * 2, size - inset * 3);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Chair seat (small square)
  ctx.fillStyle = '#7a5a30';
  const inset = size * 0.25;
  ctx.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
  // Back rest (top edge)
  ctx.fillStyle = '#5a3a10';
  ctx.fillRect(px + inset, py + inset, size - inset * 2, size * 0.1);
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Shelf frame
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(px + size * 0.1, py + size * 0.05, size * 0.8, size * 0.9);
  // Book rows (colored rectangles)
  const bookColors = ['#8b2020', '#1a4a8b', '#2a6a2a', '#8b6914', '#5a2a5a'];
  let bookY = py + size * 0.1;
  for (let row = 0; row < 3; row++) {
    let bookX = px + size * 0.15;
    for (let b = 0; b < 4; b++) {
      const bw = size * 0.12 + (b % 2) * size * 0.04;
      ctx.fillStyle = bookColors[(row * 4 + b) % bookColors.length];
      ctx.fillRect(bookX, bookY, bw, size * 0.2);
      bookX += bw + 1;
    }
    bookY += size * 0.27;
  }
}

function drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;

  // Water base
  ctx.fillStyle = '#4a8ab0';
  ctx.fillRect(px, py, size, size);

  // Stone basin ring
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  // Center spout
  ctx.fillStyle = '#b0b0b0';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Water spray lines
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(px + size / 2, py + size / 2);
    ctx.lineTo(
      px + size / 2 + Math.cos(angle) * size * 0.25,
      py + size / 2 + Math.sin(angle) * size * 0.25
    );
    ctx.stroke();
  }
}

function drawWell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stone ring
  ctx.strokeStyle = '#7a7a7a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Dark water inside
  ctx.fillStyle = '#1a3a50';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Crossbeam
  ctx.strokeStyle = '#6b4226';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.2, py + size * 0.5);
  ctx.lineTo(px + size * 0.8, py + size * 0.5);
  ctx.stroke();
}

function drawAnvil(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Anvil shape (top-down: horn + body)
  ctx.fillStyle = '#555';
  // Body
  ctx.fillRect(px + size * 0.2, py + size * 0.3, size * 0.6, size * 0.4);
  // Horn (left triangle)
  ctx.beginPath();
  ctx.moveTo(px + size * 0.2, py + size * 0.4);
  ctx.lineTo(px + size * 0.05, py + size * 0.5);
  ctx.lineTo(px + size * 0.2, py + size * 0.6);
  ctx.closePath();
  ctx.fill();
  // Highlight
  ctx.fillStyle = '#777';
  ctx.fillRect(px + size * 0.25, py + size * 0.35, size * 0.5, size * 0.15);
}

function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Fence posts and rails
  ctx.fillStyle = '#7a5a30';
  // Two posts
  ctx.fillRect(px + size * 0.15, py + size * 0.2, size * 0.1, size * 0.6);
  ctx.fillRect(px + size * 0.75, py + size * 0.2, size * 0.1, size * 0.6);
  // Top rail
  ctx.fillRect(px + size * 0.1, py + size * 0.25, size * 0.8, size * 0.08);
  // Bottom rail
  ctx.fillRect(px + size * 0.1, py + size * 0.6, size * 0.8, size * 0.08);
}

function drawLampPost(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Pole
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(px + size * 0.45, py + size * 0.3, size * 0.1, size * 0.6);
  // Lamp head
  ctx.fillStyle = '#ffcc44';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.25, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Glow
  ctx.fillStyle = 'rgba(255, 200, 50, 0.15)';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.25, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawStatue(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Pedestal
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(px + size * 0.2, py + size * 0.65, size * 0.6, size * 0.25);
  // Figure (simple body shape)
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(px + size * 0.35, py + size * 0.25, size * 0.3, size * 0.4);
  // Head
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.2, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawAltar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stone altar block
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(px + size * 0.1, py + size * 0.25, size * 0.8, size * 0.5);
  ctx.strokeStyle = '#6a6a6a';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + size * 0.1, py + size * 0.25, size * 0.8, size * 0.5);
  // Sacred symbol (cross)
  ctx.strokeStyle = '#daa520';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + size / 2, py + size * 0.3);
  ctx.lineTo(px + size / 2, py + size * 0.65);
  ctx.moveTo(px + size * 0.3, py + size * 0.42);
  ctx.lineTo(px + size * 0.7, py + size * 0.42);
  ctx.stroke();
}

function drawCounter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Counter top (long wooden surface)
  ctx.fillStyle = '#7a5a30';
  ctx.fillRect(px + size * 0.05, py + size * 0.2, size * 0.9, size * 0.6);
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + size * 0.05, py + size * 0.2, size * 0.9, size * 0.6);
}

function drawBed(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Bed frame
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(px + size * 0.1, py + size * 0.1, size * 0.8, size * 0.8);
  // Mattress / blanket
  ctx.fillStyle = '#c0c0d0';
  ctx.fillRect(px + size * 0.15, py + size * 0.15, size * 0.7, size * 0.5);
  // Pillow
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(px + size * 0.2, py + size * 0.15, size * 0.25, size * 0.15);
}

function drawFirepit(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stone ring
  ctx.strokeStyle = '#6a6a6a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  // Fire / embers
  ctx.fillStyle = '#cc4400';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.45, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Log (cylinder from above — elongated oval)
  ctx.fillStyle = '#6b4226';
  ctx.beginPath();
  ctx.ellipse(px + size / 2, py + size / 2, size * 0.4, size * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a2a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(px + size / 2, py + size / 2, size * 0.4, size * 0.18, 0.3, 0, Math.PI * 2);
  ctx.stroke();
  // Bark rings
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(px + size * 0.3, py + size / 2, size * 0.08, size * 0.14, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stem
  ctx.fillStyle = '#d0c8a0';
  ctx.fillRect(px + size * 0.42, py + size * 0.55, size * 0.16, size * 0.3);
  // Cap
  ctx.fillStyle = '#cc4444';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.45, size * 0.22, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // Spots
  ctx.fillStyle = '#f0e0c0';
  ctx.beginPath();
  ctx.arc(px + size * 0.45, py + size * 0.4, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + size * 0.55, py + size * 0.38, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function drawTombstone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stone slab (rounded top)
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(px + size * 0.25, py + size * 0.35, size * 0.5, size * 0.5);
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.35, size * 0.25, Math.PI, 0);
  ctx.fill();
  // RIP text
  ctx.fillStyle = '#5a5a5a';
  ctx.font = `${size * 0.18}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RIP', px + size / 2, py + size * 0.55);
}

// ── Doors ────────────────────────────────────────────────────

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], isOpen: boolean): void {
  const px = x * size, py = y * size;

  // Determine orientation from neighboring walls
  const w = tiles[0].length, h = tiles.length;
  const isWallLike = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= w || ty < 0 || ty >= h) return true;
    const t = tiles[ty][tx];
    return t === 'wall' || t === 'pillar' || t === 'void' || t === 'window' || t === 'painting';
  };
  const wallN = isWallLike(x, y - 1);
  const wallS = isWallLike(x, y + 1);
  const horizontal = wallN || wallS; // Walls above/below means door goes left-right

  // Floor base
  ctx.fillStyle = TILE_PALETTE['floor'].fill;
  ctx.fillRect(px, py, size, size);

  if (isOpen) {
    // Open door — show door swung into the frame
    ctx.fillStyle = '#7a5a2a';
    if (horizontal) {
      // Hinges on left, door swung up
      ctx.fillRect(px + size * 0.05, py + size * 0.05, size * 0.12, size * 0.9); // hinge side
      ctx.fillRect(px + size * 0.05, py + size * 0.05, size * 0.5, size * 0.1); // swung panel
    } else {
      // Hinges on top, door swung left
      ctx.fillRect(px + size * 0.05, py + size * 0.05, size * 0.9, size * 0.12);
      ctx.fillRect(px + size * 0.05, py + size * 0.05, size * 0.1, size * 0.5);
    }
    // Hinge dots
    ctx.fillStyle = '#444';
    if (horizontal) {
      ctx.beginPath(); ctx.arc(px + size * 0.11, py + size * 0.2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + size * 0.11, py + size * 0.8, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(px + size * 0.2, py + size * 0.11, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + size * 0.8, py + size * 0.11, 2, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Closed door — wooden panelled door
    const doorColor = '#8b6914';
    const panelColor = '#a07a24';
    const frameColor = '#6b4910';

    if (horizontal) {
      // Door frame (wall-colored sides)
      ctx.fillStyle = TILE_PALETTE['wall'].fill;
      ctx.fillRect(px, py, size, size * 0.12);
      ctx.fillRect(px, py + size * 0.88, size, size * 0.12);

      // Door body
      ctx.fillStyle = doorColor;
      ctx.fillRect(px + size * 0.08, py + size * 0.12, size * 0.84, size * 0.76);

      // Panels (two rectangular insets)
      ctx.fillStyle = panelColor;
      ctx.fillRect(px + size * 0.15, py + size * 0.2, size * 0.3, size * 0.25);
      ctx.fillRect(px + size * 0.55, py + size * 0.2, size * 0.3, size * 0.25);
      ctx.fillRect(px + size * 0.15, py + size * 0.55, size * 0.3, size * 0.25);
      ctx.fillRect(px + size * 0.55, py + size * 0.55, size * 0.3, size * 0.25);

      // Panel borders
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + size * 0.15, py + size * 0.2, size * 0.3, size * 0.25);
      ctx.strokeRect(px + size * 0.55, py + size * 0.2, size * 0.3, size * 0.25);
      ctx.strokeRect(px + size * 0.15, py + size * 0.55, size * 0.3, size * 0.25);
      ctx.strokeRect(px + size * 0.55, py + size * 0.55, size * 0.3, size * 0.25);

      // Handle (circle)
      ctx.fillStyle = '#c8a830';
      ctx.beginPath();
      ctx.arc(px + size * 0.5, py + size * 0.5, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a08020';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Vertical door
      ctx.fillStyle = TILE_PALETTE['wall'].fill;
      ctx.fillRect(px, py, size * 0.12, size);
      ctx.fillRect(px + size * 0.88, py, size * 0.12, size);

      ctx.fillStyle = doorColor;
      ctx.fillRect(px + size * 0.12, py + size * 0.08, size * 0.76, size * 0.84);

      ctx.fillStyle = panelColor;
      ctx.fillRect(px + size * 0.2, py + size * 0.15, size * 0.25, size * 0.3);
      ctx.fillRect(px + size * 0.2, py + size * 0.55, size * 0.25, size * 0.3);
      ctx.fillRect(px + size * 0.55, py + size * 0.15, size * 0.25, size * 0.3);
      ctx.fillRect(px + size * 0.55, py + size * 0.55, size * 0.25, size * 0.3);

      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(px + size * 0.2, py + size * 0.15, size * 0.25, size * 0.3);
      ctx.strokeRect(px + size * 0.2, py + size * 0.55, size * 0.25, size * 0.3);
      ctx.strokeRect(px + size * 0.55, py + size * 0.15, size * 0.25, size * 0.3);
      ctx.strokeRect(px + size * 0.55, py + size * 0.55, size * 0.25, size * 0.3);

      ctx.fillStyle = '#c8a830';
      ctx.beginPath();
      ctx.arc(px + size * 0.5, py + size * 0.5, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a08020';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ── Bush ─────────────────────────────────────────────────────

/** 3×3 bush atlas refs (base atlas, cols 24-26, rows 12-14), drawn into a single cell */
const BUSH_3X3_GRID: AtlasRef[][] = [
  // row 0 (top): NW, N, NE
  [{ atlas: 'base', col: 24, row: 12 }, { atlas: 'base', col: 25, row: 12 }, { atlas: 'base', col: 26, row: 12 }],
  // row 1 (mid): W, C, E
  [{ atlas: 'base', col: 24, row: 13 }, { atlas: 'base', col: 25, row: 13 }, { atlas: 'base', col: 26, row: 13 }],
  // row 2 (bot): SW, S, SE
  [{ atlas: 'base', col: 24, row: 14 }, { atlas: 'base', col: 25, row: 14 }, { atlas: 'base', col: 26, row: 14 }],
];

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  // Draw grass base using the same 2×2 noise-driven variant system
  const quadrants: [0 | 1, 0 | 1][] = [[0, 0], [1, 0], [0, 1], [1, 1]];
  for (const [qx, qy] of quadrants) {
    const grassRef = pickGrassVariant(x, y, qx, qy, seed);
    drawAtlasQuadrant(ctx, x, y, size, qx, qy, grassRef);
  }

  // Draw all 9 bush atlas tiles into a 3×3 grid within this single cell
  const img = baseOutAtlas;
  if (!img?.complete) return;

  const third = size / 3;
  const px = x * size;
  const py = y * size;
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const ref = BUSH_3X3_GRID[row][col];
      const srcX = ref.col * ATLAS_TILE_PX;
      const srcY = ref.row * ATLAS_TILE_PX;
      ctx.drawImage(img, srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX, px + col * third, py + row * third, third, third);
    }
  }

  ctx.imageSmoothingEnabled = prevSmoothing;
}

// ── Chest ────────────────────────────────────────────────────

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Chest body
  const inset = size * 0.18;
  ctx.fillStyle = '#7a5020';
  ctx.fillRect(px + inset, py + size * 0.3, size - inset * 2, size * 0.45);

  // Lid (slightly wider, curved top)
  ctx.fillStyle = '#8a6030';
  ctx.fillRect(px + inset - 2, py + size * 0.22, size - inset * 2 + 4, size * 0.15);
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.26, (size - inset * 2) / 2 + 2, Math.PI, 0);
  ctx.fill();

  // Metal bands
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + inset, py + size * 0.3, size - inset * 2, size * 0.45);
  // Center clasp
  ctx.fillStyle = '#c8a830';
  ctx.fillRect(px + size * 0.44, py + size * 0.3, size * 0.12, size * 0.1);
  // Keyhole
  ctx.fillStyle = '#2a1a00';
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.43, size * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

// ── Stairs ───────────────────────────────────────────────────

function drawStairs(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, goingUp: boolean, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  const numSteps = 5;
  const stepH = size / numSteps;

  for (let i = 0; i < numSteps; i++) {
    // Gradient from dark to light (or light to dark for down)
    const t = goingUp ? i / numSteps : 1 - i / numSteps;
    const shade = Math.floor(80 + t * 60);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 10})`;
    ctx.fillRect(px + 3, py + i * stepH, size - 6, stepH - 1);

    // Step edge highlight
    ctx.fillStyle = `rgb(${shade + 20}, ${shade + 20}, ${shade + 30})`;
    ctx.fillRect(px + 3, py + i * stepH, size - 6, 2);
  }

  // Arrow indicator
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  if (goingUp) {
    ctx.moveTo(px + size * 0.5, py + size * 0.15);
    ctx.lineTo(px + size * 0.35, py + size * 0.35);
    ctx.lineTo(px + size * 0.65, py + size * 0.35);
  } else {
    ctx.moveTo(px + size * 0.5, py + size * 0.85);
    ctx.lineTo(px + size * 0.35, py + size * 0.65);
    ctx.lineTo(px + size * 0.65, py + size * 0.65);
  }
  ctx.closePath();
  ctx.fill();
}

// ── Cobblestone ──────────────────────────────────────────────

function drawCobblestone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const px = x * size, py = y * size;
  const rng = simpleSeed(seed + x * 41 + y * 59);

  // Noise-based mortar/grout base
  const groutBase = hexToRgb('#585858');
  const groutAlt = hexToRgb('#686868');
  const step = Math.max(2, Math.floor(size / 8));
  for (let dy = 0; dy < size; dy += step) {
    for (let dx = 0; dx < size; dx += step) {
      const n = noise2D((x + dx / size) * 3, (y + dy / size) * 3, seed);
      ctx.fillStyle = lerpColor(groutBase, groutAlt, n);
      ctx.fillRect(px + dx, py + dy, step, step);
    }
  }

  // Draw individual cobblestones (rounded rectangles with noise variation)
  const cols = 3, rows = 3;
  const cobW = size / cols, cobH = size / rows;
  const offset = (y % 2) * (cobW * 0.5);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = px + col * cobW + offset + (rng() - 0.5) * 2;
      const cy = py + row * cobH + (rng() - 0.5) * 2;
      const w = cobW - 3;
      const h = cobH - 3;

      // Per-cobble noise color
      const noiseVal = fbm2D((x * 3 + col) * 1.5, (y * 3 + row) * 1.5, 2, seed + 100);
      const shade = 100 + Math.floor(noiseVal * 45);
      const warmth = Math.floor(rng() * 8);

      // Rounded rect
      const r = 2.5;
      ctx.fillStyle = `rgb(${shade + warmth}, ${shade}, ${shade - warmth + 5})`;
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.lineTo(cx + w - r, cy);
      ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + r);
      ctx.lineTo(cx + w, cy + h - r);
      ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
      ctx.lineTo(cx + r, cy + h);
      ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - r);
      ctx.lineTo(cx, cy + r);
      ctx.quadraticCurveTo(cx, cy, cx + r, cy);
      ctx.closePath();
      ctx.fill();

      // Per-cobble highlight (top-left) and shadow (bottom-right)
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(cx + 1, cy + 1, w * 0.5, h * 0.3);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(cx + w * 0.5, cy + h * 0.6, w * 0.5, h * 0.4);
    }
  }
}

// ── Fence Gate ───────────────────────────────────────────────

function drawFenceGate(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Gate posts
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(px + size * 0.08, py + size * 0.15, size * 0.12, size * 0.7);
  ctx.fillRect(px + size * 0.8, py + size * 0.15, size * 0.12, size * 0.7);

  // Gate bars (open appearance — bars slightly apart)
  ctx.fillStyle = '#7a5a30';
  ctx.fillRect(px + size * 0.2, py + size * 0.3, size * 0.08, size * 0.45);
  ctx.fillRect(px + size * 0.38, py + size * 0.3, size * 0.08, size * 0.45);
  ctx.fillRect(px + size * 0.56, py + size * 0.3, size * 0.08, size * 0.45);
  ctx.fillRect(px + size * 0.72, py + size * 0.3, size * 0.08, size * 0.45);

  // Cross rail
  ctx.fillRect(px + size * 0.15, py + size * 0.4, size * 0.7, size * 0.06);
  ctx.fillRect(px + size * 0.15, py + size * 0.6, size * 0.7, size * 0.06);
}

// ── Window ───────────────────────────────────────────────────

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][]): void {
  const px = x * size, py = y * size;

  // Draw as a wall first
  drawWall(ctx, x, y, size, tiles);

  // Glass pane (blue-tinted rectangle inset)
  ctx.fillStyle = '#6090b0';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(px + size * 0.2, py + size * 0.2, size * 0.6, size * 0.6);
  ctx.globalAlpha = 1;

  // Window frame (cross)
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.5, py + size * 0.2);
  ctx.lineTo(px + size * 0.5, py + size * 0.8);
  ctx.moveTo(px + size * 0.2, py + size * 0.5);
  ctx.lineTo(px + size * 0.8, py + size * 0.5);
  ctx.stroke();

  // Light reflection
  ctx.fillStyle = 'rgba(200, 230, 255, 0.3)';
  ctx.fillRect(px + size * 0.25, py + size * 0.25, size * 0.18, size * 0.18);
}

// ── Trap ─────────────────────────────────────────────────────

function drawTrap(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number, tiles: TileType[][]): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Subtle pressure plate (barely visible difference)
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3;
  const inset = size * 0.15;
  ctx.strokeRect(px + inset, py + inset, size - inset * 2, size - inset * 2);

  // Very faint crack lines radiating from center
  const rng = simpleSeed(seed + x * 53 + y * 71);
  for (let i = 0; i < 3; i++) {
    const angle = rng() * Math.PI * 2;
    const len = size * 0.15 + rng() * size * 0.1;
    ctx.beginPath();
    ctx.moveTo(px + size / 2, py + size / 2);
    ctx.lineTo(
      px + size / 2 + Math.cos(angle) * len,
      py + size / 2 + Math.sin(angle) * len
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Chandelier ───────────────────────────────────────────────

function drawChandelier(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Warm glow on the floor
  ctx.fillStyle = 'rgba(255, 200, 80, 0.12)';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Chain from above (cross shape)
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.5, py + size * 0.15);
  ctx.lineTo(px + size * 0.5, py + size * 0.5);
  ctx.stroke();

  // Ring
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.5, size * 0.18, 0, Math.PI * 2);
  ctx.stroke();

  // Candle flames
  const flames = [
    { fx: 0.32, fy: 0.5 },
    { fx: 0.68, fy: 0.5 },
    { fx: 0.5, fy: 0.32 },
    { fx: 0.5, fy: 0.68 },
  ];
  for (const f of flames) {
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath();
    ctx.arc(px + f.fx * size, py + f.fy * size, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Shelf ────────────────────────────────────────────────────

function drawShelf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Wooden shelf frame
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(px + size * 0.1, py + size * 0.1, size * 0.8, size * 0.8);

  // Shelves (horizontal lines)
  ctx.fillStyle = '#7a5a30';
  for (let i = 0; i < 3; i++) {
    const shelfY = py + size * 0.2 + i * size * 0.25;
    ctx.fillRect(px + size * 0.12, shelfY, size * 0.76, size * 0.04);
  }

  // Items on shelves (small colored squares)
  const itemColors = ['#8a6040', '#6a8a6a', '#8a7a5a', '#5a6a8a'];
  for (let i = 0; i < 3; i++) {
    const baseY = py + size * 0.2 + i * size * 0.25 - size * 0.12;
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = itemColors[(i * 3 + j) % itemColors.length];
      ctx.fillRect(px + size * 0.18 + j * size * 0.22, baseY, size * 0.12, size * 0.12);
    }
  }
}

// ── Weapon Rack ──────────────────────────────────────────────

function drawWeaponRack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Rack frame
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(px + size * 0.1, py + size * 0.1, size * 0.8, size * 0.8);

  // Horizontal rack bars
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(px + size * 0.15, py + size * 0.25, size * 0.7, size * 0.06);
  ctx.fillRect(px + size * 0.15, py + size * 0.65, size * 0.7, size * 0.06);

  // Weapons (diagonal lines = swords/spears)
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const wx = px + size * 0.22 + i * size * 0.17;
    ctx.beginPath();
    ctx.moveTo(wx, py + size * 0.2);
    ctx.lineTo(wx + size * 0.04, py + size * 0.75);
    ctx.stroke();
  }

  // Crossguard on center weapon
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.34, py + size * 0.35);
  ctx.lineTo(px + size * 0.52, py + size * 0.35);
  ctx.stroke();
}

// ── Painting / Tapestry ──────────────────────────────────────

function drawPainting(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const px = x * size, py = y * size;

  // Wall background
  drawWall(ctx, x, y, size, [[]] as TileType[][]);

  // Painting frame
  ctx.fillStyle = '#c8a830';
  const frameInset = size * 0.12;
  ctx.fillRect(px + frameInset, py + frameInset, size - frameInset * 2, size - frameInset * 2);

  // Canvas
  const rng = simpleSeed(seed + x * 83 + y * 97);
  const canvasInset = size * 0.18;
  const hue = Math.floor(rng() * 360);
  ctx.fillStyle = `hsl(${hue}, 30%, 40%)`;
  ctx.fillRect(px + canvasInset, py + canvasInset, size - canvasInset * 2, size - canvasInset * 2);

  // Simple landscape: sky + ground
  ctx.fillStyle = `hsl(${(hue + 120) % 360}, 25%, 55%)`;
  ctx.fillRect(px + canvasInset, py + canvasInset, size - canvasInset * 2, (size - canvasInset * 2) * 0.45);
}

// ── Candelabra ───────────────────────────────────────────────

function drawCandelabra(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stand base
  ctx.fillStyle = '#c8a830';
  ctx.fillRect(px + size * 0.35, py + size * 0.75, size * 0.3, size * 0.15);

  // Pole
  ctx.fillRect(px + size * 0.46, py + size * 0.25, size * 0.08, size * 0.55);

  // Arms (3 branches)
  ctx.fillRect(px + size * 0.25, py + size * 0.25, size * 0.5, size * 0.04);

  // Candle flames
  ctx.fillStyle = '#ffcc44';
  ctx.beginPath(); ctx.arc(px + size * 0.28, py + size * 0.2, size * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + size * 0.5, py + size * 0.2, size * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + size * 0.72, py + size * 0.2, size * 0.05, 0, Math.PI * 2); ctx.fill();

  // Warm glow
  ctx.fillStyle = 'rgba(255, 200, 80, 0.08)';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.3, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// ── Archway ──────────────────────────────────────────────────

function drawArchway(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][]): void {
  const px = x * size, py = y * size;

  // Floor background
  drawTileBase(ctx, x, y, size, TILE_PALETTE['floor']);

  // Stone arch pillars on sides
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(px, py, size * 0.18, size);
  ctx.fillRect(px + size * 0.82, py, size * 0.18, size);

  // Arch curve at the top
  ctx.strokeStyle = '#8a8a8a';
  ctx.lineWidth = size * 0.12;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size * 0.3, size * 0.32, Math.PI, 0);
  ctx.stroke();

  // Keystone
  ctx.fillStyle = '#9a9a7a';
  ctx.fillRect(px + size * 0.44, py + size * 0.02, size * 0.12, size * 0.14);
}

// ── Drain ────────────────────────────────────────────────────

function drawDrain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Circular grate
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Grate bars (cross pattern)
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.25, py + size * 0.5);
  ctx.lineTo(px + size * 0.75, py + size * 0.5);
  ctx.moveTo(px + size * 0.5, py + size * 0.25);
  ctx.lineTo(px + size * 0.5, py + size * 0.75);
  ctx.moveTo(px + size * 0.32, py + size * 0.32);
  ctx.lineTo(px + size * 0.68, py + size * 0.68);
  ctx.moveTo(px + size * 0.68, py + size * 0.32);
  ctx.lineTo(px + size * 0.32, py + size * 0.68);
  ctx.stroke();

  // Dark center
  ctx.fillStyle = '#1a1a2a';
  ctx.beginPath();
  ctx.arc(px + size / 2, py + size / 2, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

// ── Torch / Wall Sconce ──────────────────────────────────────

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][]): void {
  const px = x * size, py = y * size;

  // Wall background
  drawWall(ctx, x, y, size, tiles);

  // Sconce bracket
  ctx.fillStyle = '#6a5020';
  ctx.fillRect(px + size * 0.42, py + size * 0.35, size * 0.16, size * 0.3);

  // Torch stick
  ctx.fillStyle = '#8a6030';
  ctx.fillRect(px + size * 0.46, py + size * 0.2, size * 0.08, size * 0.35);

  // Flame (teardrop shape)
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.moveTo(px + size * 0.5, py + size * 0.08);
  ctx.quadraticCurveTo(px + size * 0.6, py + size * 0.18, px + size * 0.55, py + size * 0.24);
  ctx.lineTo(px + size * 0.45, py + size * 0.24);
  ctx.quadraticCurveTo(px + size * 0.4, py + size * 0.18, px + size * 0.5, py + size * 0.08);
  ctx.fill();

  // Inner flame
  ctx.fillStyle = '#ffcc44';
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.17, size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Warm glow around flame
  ctx.fillStyle = 'rgba(255, 180, 60, 0.08)';
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.2, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// ── Portcullis (Iron Gate) ───────────────────────────────────

function drawPortcullis(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Stone frame
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(px, py, size * 0.12, size);
  ctx.fillRect(px + size * 0.88, py, size * 0.12, size);
  ctx.fillRect(px, py, size, size * 0.08);

  // Iron bars (vertical)
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const bx = px + size * 0.2 + i * size * 0.15;
    ctx.beginPath();
    ctx.moveTo(bx, py + size * 0.08);
    ctx.lineTo(bx, py + size);
    ctx.stroke();
  }

  // Horizontal crossbar
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.12, py + size * 0.35);
  ctx.lineTo(px + size * 0.88, py + size * 0.35);
  ctx.moveTo(px + size * 0.12, py + size * 0.65);
  ctx.lineTo(px + size * 0.88, py + size * 0.65);
  ctx.stroke();

  // Spikes at bottom
  for (let i = 0; i < 5; i++) {
    const bx = px + size * 0.2 + i * size * 0.15;
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(bx - 2, py + size);
    ctx.lineTo(bx, py + size * 0.92);
    ctx.lineTo(bx + 2, py + size);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Lever / Switch ───────────────────────────────────────────

function drawLever(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Base plate
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(px + size * 0.3, py + size * 0.55, size * 0.4, size * 0.2);

  // Lever arm (angled)
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.5, py + size * 0.65);
  ctx.lineTo(px + size * 0.35, py + size * 0.25);
  ctx.stroke();

  // Lever handle (ball)
  ctx.fillStyle = '#c8a830';
  ctx.beginPath();
  ctx.arc(px + size * 0.35, py + size * 0.23, size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Pivot bolt
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.65, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

// ── Trapdoor ─────────────────────────────────────────────────

function drawTrapdoor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Trapdoor outline (square with border)
  const inset = size * 0.12;
  ctx.fillStyle = '#7a5a2a';
  ctx.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);

  // Plank lines
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px + inset, py + inset + i * (size - inset * 2) / 4);
    ctx.lineTo(px + size - inset, py + inset + i * (size - inset * 2) / 4);
    ctx.stroke();
  }

  // Iron ring handle
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.5, size * 0.08, 0, Math.PI * 2);
  ctx.stroke();

  // Hinges
  ctx.fillStyle = '#555';
  ctx.fillRect(px + inset - 2, py + inset + 2, 5, 4);
  ctx.fillRect(px + inset - 2, py + size - inset - 6, 5, 4);
}

// ── Throne ───────────────────────────────────────────────────

function drawThrone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;
  drawAmbientFloor(ctx, tiles, x, y, size, seed);

  // Seat base
  ctx.fillStyle = '#8b2020';
  ctx.fillRect(px + size * 0.2, py + size * 0.45, size * 0.6, size * 0.35);

  // Back rest (tall)
  ctx.fillStyle = '#6b1515';
  ctx.fillRect(px + size * 0.2, py + size * 0.1, size * 0.6, size * 0.4);

  // Gold frame
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + size * 0.18, py + size * 0.08, size * 0.64, size * 0.74);

  // Crown ornament at top
  ctx.fillStyle = '#c8a830';
  ctx.beginPath();
  ctx.moveTo(px + size * 0.35, py + size * 0.08);
  ctx.lineTo(px + size * 0.4, py + size * 0.02);
  ctx.lineTo(px + size * 0.45, py + size * 0.08);
  ctx.lineTo(px + size * 0.5, py + size * 0.02);
  ctx.lineTo(px + size * 0.55, py + size * 0.08);
  ctx.lineTo(px + size * 0.6, py + size * 0.02);
  ctx.lineTo(px + size * 0.65, py + size * 0.08);
  ctx.closePath();
  ctx.fill();

  // Armrests
  ctx.fillStyle = '#7a5020';
  ctx.fillRect(px + size * 0.12, py + size * 0.35, size * 0.1, size * 0.35);
  ctx.fillRect(px + size * 0.78, py + size * 0.35, size * 0.1, size * 0.35);

  // Cushion
  ctx.fillStyle = '#aa3030';
  ctx.fillRect(px + size * 0.28, py + size * 0.5, size * 0.44, size * 0.22);
}

// ── Banner / Tapestry ────────────────────────────────────────

function drawBanner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][], seed: number): void {
  const px = x * size, py = y * size;

  // Wall background
  drawWall(ctx, x, y, size, tiles);

  // Banner rod
  ctx.fillStyle = '#c8a830';
  ctx.fillRect(px + size * 0.15, py + size * 0.1, size * 0.7, size * 0.05);

  // Banner fabric (colored based on seed)
  const rng = simpleSeed(seed + x * 67 + y * 89);
  const bannerHue = Math.floor(rng() * 360);
  ctx.fillStyle = `hsl(${bannerHue}, 50%, 35%)`;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.2, py + size * 0.15);
  ctx.lineTo(px + size * 0.8, py + size * 0.15);
  ctx.lineTo(px + size * 0.8, py + size * 0.75);
  ctx.lineTo(px + size * 0.5, py + size * 0.9); // Pointed bottom
  ctx.lineTo(px + size * 0.2, py + size * 0.75);
  ctx.closePath();
  ctx.fill();

  // Banner emblem (simple heraldic shape)
  ctx.fillStyle = `hsl(${(bannerHue + 180) % 360}, 40%, 60%)`;
  ctx.beginPath();
  ctx.arc(px + size * 0.5, py + size * 0.45, size * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#c8a830';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + size * 0.2, py + size * 0.15);
  ctx.lineTo(px + size * 0.8, py + size * 0.15);
  ctx.lineTo(px + size * 0.8, py + size * 0.75);
  ctx.lineTo(px + size * 0.5, py + size * 0.9);
  ctx.lineTo(px + size * 0.2, py + size * 0.75);
  ctx.closePath();
  ctx.stroke();
}

// ── Minecart Track ───────────────────────────────────────────

function drawMinecartTrack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tiles: TileType[][]): void {
  const px = x * size, py = y * size;
  drawTileBase(ctx, x, y, size, TILE_PALETTE['dirt']);

  // Determine track direction from neighbors
  const w = tiles[0].length, h = tiles.length;
  const isTrack = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= w || ty < 0 || ty >= h) return false;
    return tiles[ty][tx] === 'minecart-track';
  };
  const trackN = isTrack(x, y - 1), trackS = isTrack(x, y + 1);
  const trackE = isTrack(x + 1, y), trackW = isTrack(x - 1, y);
  const horizontal = trackE || trackW;
  const vertical = trackN || trackS;

  // Default to horizontal if standalone
  const drawHoriz = horizontal || (!horizontal && !vertical);
  const drawVert = vertical;

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;

  if (drawHoriz) {
    // Rails
    ctx.beginPath();
    ctx.moveTo(px, py + size * 0.35);
    ctx.lineTo(px + size, py + size * 0.35);
    ctx.moveTo(px, py + size * 0.65);
    ctx.lineTo(px + size, py + size * 0.65);
    ctx.stroke();
    // Ties
    ctx.fillStyle = '#5a3a10';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + size * 0.1 + i * size * 0.25, py + size * 0.3, size * 0.08, size * 0.4);
    }
  }
  if (drawVert) {
    ctx.beginPath();
    ctx.moveTo(px + size * 0.35, py);
    ctx.lineTo(px + size * 0.35, py + size);
    ctx.moveTo(px + size * 0.65, py);
    ctx.lineTo(px + size * 0.65, py + size);
    ctx.stroke();
    ctx.fillStyle = '#5a3a10';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + size * 0.3, py + size * 0.1 + i * size * 0.25, size * 0.4, size * 0.08);
    }
  }
}

// ─── React Hook: useProceduralMap ───────────────────────────

/**
 * Creates the canvas rendering data needed by BattleGrid.
 * Call this to get a render function that can paint onto a canvas ref.
 */
export function createTileRenderer(
  map: ProceduralMap,
  options: Partial<TileRendererOptions> = {},
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const canvasWidth = map.width * opts.cellSize;
  const canvasHeight = map.height * opts.cellSize;

  return {
    canvasWidth,
    canvasHeight,
    cellSize: opts.cellSize,
    render: (ctx: CanvasRenderingContext2D, extraOptions?: Partial<TileRendererOptions>) => {
      renderTileMap(ctx, map.tiles, { ...opts, ...extraOptions });
    },
    tiles: map.tiles,
    map,
  };
}
