/**
 * Atlas-Based Map Generator for PF2e Rebirth
 * ============================================
 *
 * Generates maps using the approved atlas tile sets (terrains + objects).
 *
 * Key concepts:
 * - **Game grid**: Tactical battle grid where each cell = 5 ft.
 * - **Atlas sub-tiles**: Each game cell is rendered as 2×2 atlas tiles (32px each → 64px per cell).
 * - **Terrain layer**: Auto-tiled terrain fills (grass, dirt, water, stone, etc.)
 *   using edge/corner/inner-corner/center pieces from terrain sets.
 * - **Object layer**: Decorations, trees, buildings, etc. placed as multi-tile stamps.
 * - **Mechanics layer**: Separate grid tracking movement cost, cover, etc.
 *   Completely independent of visuals so the engine can read it directly.
 *
 * The generator loads `approved-atlas-sets.json` (terrain + object definitions)
 * and `atlas-metadata.json` (per-tile descriptions, tags, repeatable flags).
 *
 * Terrain generation uses **Wave Function Collapse (WFC)** for coherent,
 * natural-looking terrain layouts with proper adjacency constraints.
 */

import { WFCSolver, WFCSolverConfig } from './wfc/solver';

// ─── Seeded Random ──────────────────────────────────────────

export class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  /** Returns a float in [0, 1) */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0x100000000;
  }
  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  /** Pick a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  /** Pick n unique random elements */
  pickN<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(this.next() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
  /** Shuffle array in-place */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** Returns true with probability p */
  chance(p: number): boolean {
    return this.next() < p;
  }
}

// ─── Data Types ─────────────────────────────────────────────

/** Movement qualifier for the mechanics layer */
export type MovementType =
  | 'normal'         // Standard movement
  | 'difficult'      // Costs double to enter
  | 'hazardous'      // Costs double + may cause damage
  | 'swim'           // Requires swim speed/check
  | 'climb'          // Requires climb speed/check
  | 'blocked'        // Impassable (walls, solid objects)
  | 'fly-only'       // Only flying creatures can pass (pits, chasms)
  | 'door';          // Passable but must interact

/** Cover quality from terrain */
export type CoverType = 'none' | 'lesser' | 'standard' | 'greater';

/** Elevation relative to base ground level */
export type ElevationType = number; // 0 = ground, +1 = raised, -1 = below

/** A single cell in the mechanics layer */
export interface MechanicsCell {
  movement: MovementType;
  cover: CoverType;
  elevation: ElevationType;
  /** Whether this cell blocks line of sight */
  opaque: boolean;
  /** Optional label for the engine (e.g. "lava", "pit", "trap") */
  hazardType?: string;
}

/** A single atlas tile reference (pointing into an atlas spritesheet) */
export interface AtlasTileRef {
  atlas: string;   // Atlas sheet name (e.g. "terrain", "base", "lpc_outside_obj")
  col: number;     // Column in the atlas spritesheet
  row: number;     // Row in the atlas spritesheet
}

/**
 * A placed overlay on the map.
 * x/y are in game-grid coords; the renderer converts to canvas pixels.
 * Each game cell is 2×2 atlas tiles, so sub-tile positions use fractional coords:
 *   (x, y)       = top-left quadrant
 *   (x+0.5, y)   = top-right quadrant
 *   (x, y+0.5)   = bottom-left quadrant
 *   (x+0.5, y+0.5) = bottom-right quadrant
 */
export interface PlacedOverlay {
  atlas: string;
  col: number;
  row: number;
  x: number;      // Game-grid x (fractional for sub-tile positioning)
  y: number;       // Game-grid y
  scale: number;   // Typically 0.5 (one atlas tile = half a game cell)
  z: number;       // Draw order (0 = ground, 1 = objects, 2 = tall objects/canopy)
}

/** A rectangle of game-grid cells */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A room in a dungeon/indoor layout */
export interface GeneratedRoom extends Rect {
  id: number;
  type?: string;     // e.g. "main", "corridor", "closet", "entry"
  connected: number[]; // IDs of rooms this connects to
}

// ─── Parsed Atlas Data ──────────────────────────────────────

/** A terrain set parsed from the approved-atlas-sets.json */
export interface ParsedTerrain {
  name: string;
  tags: string[];
  /** Map of slot → atlas tile reference */
  slots: {
    C: AtlasTileRef[];    // Center variants
    N: AtlasTileRef | null;
    S: AtlasTileRef | null;
    E: AtlasTileRef | null;
    W: AtlasTileRef | null;
    NE: AtlasTileRef | null;
    NW: AtlasTileRef | null;
    SE: AtlasTileRef | null;
    SW: AtlasTileRef | null;
    iNE: AtlasTileRef | null;  // Inner corners
    iNW: AtlasTileRef | null;
    iSE: AtlasTileRef | null;
    iSW: AtlasTileRef | null;
  };
  /** Extra loose tiles for breaking up uniformity */
  scatterTiles: AtlasTileRef[];
  /** Description of scatter group if any */
  scatterDescription?: string;
}

/** A parsed object from the approved-atlas-sets.json */
export interface ParsedObject {
  name: string;
  tags: string[];
  /** Width in atlas tiles */
  widthTiles: number;
  /** Height in atlas tiles */
  heightTiles: number;
  /** Width in game cells (ceil(widthTiles / 2)) */
  widthCells: number;
  /** Height in game cells (ceil(heightTiles / 2)) */
  heightCells: number;
  /** The individual atlas tile refs, positioned relative to top-left */
  tiles: { ref: AtlasTileRef; relCol: number; relRow: number; repeatableRow?: boolean; repeatableCol?: boolean }[];
}

/** Full parsed atlas data ready for the generator */
export interface AtlasData {
  terrains: ParsedTerrain[];
  objects: ParsedObject[];
}

// ─── Atlas Loader ───────────────────────────────────────────

/** Raw JSON structure of approved-atlas-sets.json */
interface RawAtlasSet {
  kind: 'object' | 'terrain';
  name: string;
  keys: string[];
  tileTypes: string[];
  items: { key: string; tileType: string }[];
  atlases: string[];
  sharedTags: string[];
  groupDescription?: string;
}

interface RawAtlasSetsFile {
  generatedAt: string;
  totalSets: number;
  sets: RawAtlasSet[];
}

/** Raw JSON structure of atlas-metadata.json (keyed by "atlas:col,row") */
interface RawMetadataEntry {
  description: string;
  tags: string[];
  tileType: string;
  category?: string;
  repeatableRow?: boolean;
  repeatableCol?: boolean;
  groupDescription?: string;
}

type RawMetadataMap = Record<string, RawMetadataEntry>;

/** Parse a key like "terrain:5,3" into an AtlasTileRef */
function parseKey(key: string): AtlasTileRef {
  const [atlas, coords] = key.split(':');
  const [col, row] = coords.split(',').map(Number);
  return { atlas, col, row };
}

/** Terrain slot type from tileType string */
type SlotId = 'C' | 'C2' | 'C3' | 'C4' | 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'iNE' | 'iNW' | 'iSE' | 'iSW';

function classifyTerrainTile(tileType: string, terrainName: string): { slotId: SlotId | null; isGroup: boolean; groupLabel?: string; groupIndex?: number } {
  const suffix = tileType.slice(terrainName.length).trim();

  // Group tiles: "Name group:Label - N"
  const grpMatch = suffix.match(/^group(?::(.+?))?\s*-\s*(\d+)\s*$/i);
  if (grpMatch) {
    return { slotId: null, isGroup: true, groupLabel: grpMatch[1]?.trim() || 'default', groupIndex: parseInt(grpMatch[2]) };
  }

  // Inner corners: "Name Inner Corner - NE"
  const icMatch = suffix.match(/^Inner Corner\s*-?\s*(NE|NW|SE|SW)\s*$/i);
  if (icMatch) {
    return { slotId: ('i' + icMatch[1].toUpperCase()) as SlotId, isGroup: false };
  }

  // Edges: "Name edge - N"
  const edgeMatch = suffix.match(/^edge\s*-?\s*(N|S|E|W)\s*$/i);
  if (edgeMatch) {
    return { slotId: edgeMatch[1].toUpperCase() as SlotId, isGroup: false };
  }

  // Corners: "Name corner - NE"
  const cornerMatch = suffix.match(/^corner\s*-?\s*(NE|NW|SE|SW)\s*$/i);
  if (cornerMatch) {
    return { slotId: cornerMatch[1].toUpperCase() as SlotId, isGroup: false };
  }

  // Center: "Name - C" or "Name - C2", "Name - C3", "Name - C4"
  const centerMatch = suffix.match(/^-\s*(C[234]?)\s*$/i);
  if (centerMatch) {
    return { slotId: centerMatch[1].toUpperCase() as SlotId, isGroup: false };
  }

  return { slotId: null, isGroup: false };
}

function classifyObjectTile(tileType: string, objName: string): { quadrant: string; relCol: number; relRow: number } | null {
  const suffix = tileType.slice(objName.length).trim();
  const match = suffix.match(/^-\s*((?:N|S|E|W|NE|NW|SE|SW|C|T|M)\d*)\s*$/i);
  if (!match) return null;
  return { quadrant: match[1].toUpperCase(), relCol: 0, relRow: 0 }; // actual positions computed from coords
}

/** Parse the raw JSON files into generator-ready structures */
export function parseAtlasData(setsJson: RawAtlasSetsFile, metadataJson: RawMetadataMap): AtlasData {
  const terrains: ParsedTerrain[] = [];
  const objects: ParsedObject[] = [];

  for (const set of setsJson.sets) {
    if (set.kind === 'terrain') {
      const terrain: ParsedTerrain = {
        name: set.name,
        tags: set.sharedTags,
        slots: {
          C: [], N: null, S: null, E: null, W: null,
          NE: null, NW: null, SE: null, SW: null,
          iNE: null, iNW: null, iSE: null, iSW: null,
        },
        scatterTiles: [],
        scatterDescription: set.groupDescription,
      };

      for (const item of set.items) {
        const ref = parseKey(item.key);
        const cls = classifyTerrainTile(item.tileType, set.name);

        if (cls.isGroup) {
          terrain.scatterTiles.push(ref);
        } else if (cls.slotId) {
          if (cls.slotId === 'C' || cls.slotId === 'C2' || cls.slotId === 'C3' || cls.slotId === 'C4') {
            terrain.slots.C.push(ref);
          } else {
            (terrain.slots as any)[cls.slotId] = ref;
          }
        }
      }

      // Only include terrains that have at least a center tile
      if (terrain.slots.C.length > 0) {
        terrains.push(terrain);
      }
    } else if (set.kind === 'object') {
      // Compute object dimensions from tile positions
      const tiles: { ref: AtlasTileRef; col: number; row: number }[] = [];
      for (const item of set.items) {
        const ref = parseKey(item.key);
        tiles.push({ ref, col: ref.col, row: ref.row });
      }

      if (tiles.length === 0) continue;

      const minCol = Math.min(...tiles.map(t => t.col));
      const minRow = Math.min(...tiles.map(t => t.row));
      const maxCol = Math.max(...tiles.map(t => t.col));
      const maxRow = Math.max(...tiles.map(t => t.row));
      const widthTiles = maxCol - minCol + 1;
      const heightTiles = maxRow - minRow + 1;

      const parsedTiles = tiles.map(t => {
        const meta = metadataJson[`${t.ref.atlas}:${t.ref.col},${t.ref.row}`];
        return {
          ref: t.ref,
          relCol: t.col - minCol,
          relRow: t.row - minRow,
          repeatableRow: meta?.repeatableRow || false,
          repeatableCol: meta?.repeatableCol || false,
        };
      });

      objects.push({
        name: set.name,
        tags: set.sharedTags,
        widthTiles,
        heightTiles,
        widthCells: Math.ceil(widthTiles / 2),
        heightCells: Math.ceil(heightTiles / 2),
        tiles: parsedTiles,
      });
    }
  }

  return { terrains, objects };
}

// ─── Terrain Auto-Tiler ─────────────────────────────────────

/**
 * Given a terrain grid (each cell holds a terrain name or null),
 * produce the correct atlas tile overlays with proper edge transitions.
 *
 * Each game cell becomes 2×2 atlas sub-tiles.
 * The auto-tiler checks neighbours to decide which terrain piece to use.
 *
 * The base terrain is rendered as center-only tiles at z=0 (no edges).
 * Secondary terrains auto-tile at z=1 with their edges overlapping the base
 * (terrain edges transition to transparent, designed to overlap the base layer).
 */
function autoTileTerrain(
  terrainGrid: (string | null)[][],
  terrainMap: Map<string, ParsedTerrain>,
  rng: SeededRandom,
  baseTerrain: string | null = null,
): PlacedOverlay[] {
  const overlays: PlacedOverlay[] = [];
  const h = terrainGrid.length;
  const w = terrainGrid[0]?.length ?? 0;

  // Clamp-to-edge: treat out-of-bounds as the nearest border cell's terrain
  // so terrain continues seamlessly off the map (no false edges at boundaries).
  const at = (x: number, y: number): string | null => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return terrainGrid[cy][cx];
  };

  // ── Pass 1: Paint base terrain as a full carpet at z=0 ──
  // This ensures every cell has the base showing through wherever
  // secondary terrain edges are transparent.
  const baseParsed = baseTerrain ? terrainMap.get(baseTerrain) : null;
  if (baseParsed && baseParsed.slots.C.length > 0) {
    const pickBaseCenter = () => rng.pick(baseParsed.slots.C);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const quadrants: { ref: AtlasTileRef; dx: number; dy: number }[] = [
          { ref: pickBaseCenter(), dx: 0, dy: 0 },
          { ref: pickBaseCenter(), dx: 0.5, dy: 0 },
          { ref: pickBaseCenter(), dx: 0, dy: 0.5 },
          { ref: pickBaseCenter(), dx: 0.5, dy: 0.5 },
        ];
        for (const q of quadrants) {
          overlays.push({
            atlas: q.ref.atlas, col: q.ref.col, row: q.ref.row,
            x: x + q.dx, y: y + q.dy, scale: 0.5, z: 0,
          });
        }
      }
    }
  }

  // ── Pass 2: Auto-tile secondary terrains at z=1 ──
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const name = terrainGrid[y][x];
      if (!name) continue;

      // Skip the base terrain — it's already painted everywhere at z=0
      if (name === baseTerrain) continue;

      const terrain = terrainMap.get(name);
      if (!terrain || terrain.slots.C.length === 0) continue;

      const z = 1;
      const pickCenter = () => rng.pick(terrain.slots.C);

      // Secondary terrain: auto-tile with edge/corner/inner-corner detection
      // Check which neighbours share the same terrain
      const n  = at(x, y - 1) === name;
      const s  = at(x, y + 1) === name;
      const e  = at(x + 1, y) === name;
      const w_ = at(x - 1, y) === name;
      const ne = at(x + 1, y - 1) === name;
      const nw = at(x - 1, y - 1) === name;
      const se = at(x + 1, y + 1) === name;
      const sw = at(x - 1, y + 1) === name;

      // For each of the 4 sub-tile quadrants, decide which terrain piece to use
      // Quadrants: TL (0,0), TR (1,0), BL (0,1), BR (1,1)
      const quadrants: { ref: AtlasTileRef; dx: number; dy: number }[] = [];

      // ── Top-Left quadrant ──
      if (!n && !w_) {
        // Outer corner NW
        if (terrain.slots.NW) quadrants.push({ ref: terrain.slots.NW, dx: 0, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0 });
      } else if (!n && w_) {
        // Edge N
        if (terrain.slots.N) quadrants.push({ ref: terrain.slots.N, dx: 0, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0 });
      } else if (n && !w_) {
        // Edge W
        if (terrain.slots.W) quadrants.push({ ref: terrain.slots.W, dx: 0, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0 });
      } else if (n && w_ && !nw) {
        // Inner corner NW
        if (terrain.slots.iNW) quadrants.push({ ref: terrain.slots.iNW, dx: 0, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0 });
      } else {
        quadrants.push({ ref: pickCenter(), dx: 0, dy: 0 });
      }

      // ── Top-Right quadrant ──
      if (!n && !e) {
        if (terrain.slots.NE) quadrants.push({ ref: terrain.slots.NE, dx: 0.5, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0 });
      } else if (!n && e) {
        if (terrain.slots.N) quadrants.push({ ref: terrain.slots.N, dx: 0.5, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0 });
      } else if (n && !e) {
        if (terrain.slots.E) quadrants.push({ ref: terrain.slots.E, dx: 0.5, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0 });
      } else if (n && e && !ne) {
        if (terrain.slots.iNE) quadrants.push({ ref: terrain.slots.iNE, dx: 0.5, dy: 0 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0 });
      } else {
        quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0 });
      }

      // ── Bottom-Left quadrant ──
      if (!s && !w_) {
        if (terrain.slots.SW) quadrants.push({ ref: terrain.slots.SW, dx: 0, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0.5 });
      } else if (!s && w_) {
        if (terrain.slots.S) quadrants.push({ ref: terrain.slots.S, dx: 0, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0.5 });
      } else if (s && !w_) {
        if (terrain.slots.W) quadrants.push({ ref: terrain.slots.W, dx: 0, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0.5 });
      } else if (s && w_ && !sw) {
        if (terrain.slots.iSW) quadrants.push({ ref: terrain.slots.iSW, dx: 0, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0, dy: 0.5 });
      } else {
        quadrants.push({ ref: pickCenter(), dx: 0, dy: 0.5 });
      }

      // ── Bottom-Right quadrant ──
      if (!s && !e) {
        if (terrain.slots.SE) quadrants.push({ ref: terrain.slots.SE, dx: 0.5, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0.5 });
      } else if (!s && e) {
        if (terrain.slots.S) quadrants.push({ ref: terrain.slots.S, dx: 0.5, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0.5 });
      } else if (s && !e) {
        if (terrain.slots.E) quadrants.push({ ref: terrain.slots.E, dx: 0.5, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0.5 });
      } else if (s && e && !se) {
        if (terrain.slots.iSE) quadrants.push({ ref: terrain.slots.iSE, dx: 0.5, dy: 0.5 });
        else quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0.5 });
      } else {
        quadrants.push({ ref: pickCenter(), dx: 0.5, dy: 0.5 });
      }

      for (const q of quadrants) {
        overlays.push({
          atlas: q.ref.atlas,
          col: q.ref.col,
          row: q.ref.row,
          x: x + q.dx,
          y: y + q.dy,
          scale: 0.5,
          z, // base terrain at z=0, secondary at z=1
        });
      }

      // Scatter tiles moved to Pass 3 (placed on adjacent different terrain)
    }
  }

  // ── Pass 3: Separate / scatter tiles on adjacent different-terrain cells ──
  // Each terrain's separate tiles are drawn OUTSIDE that terrain,
  // on neighbouring cells that have a different terrain.
  // e.g. dirt separate tiles → on grass cells next to dirt (break up clean edges)
  //      grass separate tiles → on dirt cells next to grass (tufts on path)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cellTerrain = terrainGrid[y][x];
      if (!cellTerrain) continue;

      // Check all 4 cardinal neighbours for a different terrain that has scatter tiles
      const dirs = [
        { nx: x, ny: y - 1 },
        { nx: x, ny: y + 1 },
        { nx: x - 1, ny: y },
        { nx: x + 1, ny: y },
      ];

      for (const { nx, ny } of dirs) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const neighbourName = terrainGrid[ny][nx];
        if (!neighbourName || neighbourName === cellTerrain) continue;

        const neighbourTerrain = terrainMap.get(neighbourName);
        if (!neighbourTerrain || neighbourTerrain.scatterTiles.length === 0) continue;
        // Skip scatter tiles for fertile dirt (farm-only terrain)
        if (neighbourName.toLowerCase().includes('fertile')) continue;

        // ~15% chance per adjacent-different-terrain edge to place a scatter tile
        if (rng.chance(0.15)) {
          const scatter = rng.pick(neighbourTerrain.scatterTiles);
          const dx = rng.chance(0.5) ? 0 : 0.5;
          const dy = rng.chance(0.5) ? 0 : 0.5;
          // Draw at z=2 so it sits above both base and secondary terrain edges
          overlays.push({
            atlas: scatter.atlas, col: scatter.col, row: scatter.row,
            x: x + dx, y: y + dy, scale: 0.5, z: 2,
          });
          break; // max one scatter per cell
        }
      }
    }
  }

  return overlays;
}

// ─── Object Placer ──────────────────────────────────────────

/** Place an object's atlas tiles onto the overlay list */
function placeObject(
  obj: ParsedObject,
  gameX: number,
  gameY: number,
  z: number,
): PlacedOverlay[] {
  const overlays: PlacedOverlay[] = [];
  for (const t of obj.tiles) {
    overlays.push({
      atlas: t.ref.atlas,
      col: t.ref.col,
      row: t.ref.row,
      x: gameX + t.relCol * 0.5,
      y: gameY + t.relRow * 0.5,
      scale: 0.5,
      z,
    });
  }
  return overlays;
}

/** Check if an object footprint overlaps any occupied cells */
function objectFits(
  obj: ParsedObject,
  gameX: number,
  gameY: number,
  occupied: Set<string>,
  mapW: number,
  mapH: number,
): boolean {
  for (let dy = 0; dy < obj.heightCells; dy++) {
    for (let dx = 0; dx < obj.widthCells; dx++) {
      const cx = gameX + dx;
      const cy = gameY + dy;
      if (cx < 0 || cy < 0 || cx >= mapW || cy >= mapH) return false;
      if (occupied.has(`${cx},${cy}`)) return false;
    }
  }
  return true;
}

/**
 * Check that every cell under the object's footprint is on one of the
 * allowed terrains. Used to prevent trees/rocks from spawning on paths.
 */
function objectOnTerrain(
  obj: ParsedObject,
  gameX: number,
  gameY: number,
  terrainGrid: (string | null)[][],
  allowed: Set<string | null>,
): boolean {
  for (let dy = 0; dy < obj.heightCells; dy++) {
    for (let dx = 0; dx < obj.widthCells; dx++) {
      const t = terrainGrid[gameY + dy]?.[gameX + dx];
      if (!allowed.has(t)) return false;
    }
  }
  return true;
}

/** Mark cells as occupied by an object */
function markOccupied(
  obj: ParsedObject,
  gameX: number,
  gameY: number,
  occupied: Set<string>,
): void {
  for (let dy = 0; dy < obj.heightCells; dy++) {
    for (let dx = 0; dx < obj.widthCells; dx++) {
      occupied.add(`${gameX + dx},${gameY + dy}`);
    }
  }
}

// ─── Mechanics Layer Builder ────────────────────────────────

function createMechanicsGrid(w: number, h: number): MechanicsCell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, (): MechanicsCell => ({
      movement: 'normal',
      cover: 'none',
      elevation: 0,
      opaque: false,
    }))
  );
}

/** Infer mechanics from terrain name and tags */
function terrainToMechanics(name: string, tags: string[]): Partial<MechanicsCell> {
  const lower = name.toLowerCase();
  if (lower.includes('water') || lower.includes('lake')) {
    return { movement: 'swim', hazardType: 'water' };
  }
  if (lower.includes('lava')) {
    return { movement: 'hazardous', hazardType: 'lava' };
  }
  if (tags.includes('wall') || lower.includes('cliff') || lower.includes('stone wall')) {
    return { movement: 'blocked', opaque: true, cover: 'greater' };
  }
  if (lower.includes('hole') || lower.includes('pit')) {
    return { movement: 'fly-only', hazardType: 'pit' };
  }
  if (lower.includes('tall grass') || lower.includes('tall wheat') || lower.includes('sand')) {
    return { movement: 'difficult' };
  }
  return { movement: 'normal' };
}

/** Infer mechanics from object tags */
function objectToMechanics(obj: ParsedObject): Partial<MechanicsCell> {
  if (obj.tags.includes('wall') || obj.tags.includes('building')) {
    return { movement: 'blocked', opaque: true, cover: 'greater' };
  }
  if (obj.tags.includes('tree')) {
    return { movement: 'difficult', cover: 'standard' };
  }
  if (obj.tags.includes('rock')) {
    return { movement: 'difficult', cover: 'lesser' };
  }
  if (obj.tags.includes('entrance')) {
    return { movement: 'door' };
  }
  if (obj.tags.includes('water')) {
    return { movement: 'swim', hazardType: 'water' };
  }
  if (obj.tags.includes('decoration')) {
    // Most decorations provide lesser cover but don't block
    return { cover: 'lesser' };
  }
  if (obj.tags.includes('vegetation')) {
    return { movement: 'difficult', cover: 'lesser' };
  }
  return {};
}

// ─── Map Themes / Layout Generators ─────────────────────────

export type MapTheme = 'wilderness' | 'dungeon' | 'indoor' | 'cave' | 'urban';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// ─── Seasonal Filtering ─────────────────────────────────────
// Rules that determine which terrains/objects are allowed per season.
// Items whose name contains a keyword exclusive to ANOTHER season are excluded.

const SEASON_EXCLUDE: Record<Season, RegExp> = {
  spring: /\bsnow\b/i,
  summer: /\bsnow\b|\bautumn\b|\bautum\b|\bdead\b/i,
  autumn: /\bsnow\b/i,
  winter: /\bautumn\b|\bautum\b|\bflower/i,
};

const SEASON_PREFER: Record<Season, RegExp> = {
  spring: /\bflower\b|\bgreen\b/i,
  summer: /\bgreen\b|\btall grass\b|\btall wheat\b/i,
  autumn: /\bautumn\b|\bautum\b|\bdark\b|\bdead\b/i,
  winter: /\bsnow\b|\bdark\b|\bdead\b/i,
};

/** Return true if this name is allowed in the given season */
function seasonAllowed(name: string, season: Season | undefined): boolean {
  if (!season) return true;
  return !SEASON_EXCLUDE[season].test(name);
}

/** Return true if this name is preferred (thematically fitting) for the season */
function seasonPreferred(name: string, season: Season | undefined): boolean {
  if (!season) return false;
  return SEASON_PREFER[season].test(name);
}

/** Filter a list by season, keeping only allowed items. If any preferred items exist, boost their weight. */
function seasonFilter<T extends { name: string }>(items: T[], season: Season | undefined): T[] {
  if (!season) return items;
  return items.filter(item => seasonAllowed(item.name, season));
}

export interface MapGenOptions {
  width: number;       // Game grid width (cells)
  height: number;      // Game grid height (cells)
  theme: MapTheme;
  subTheme?: string;
  seed?: number;
  density?: 'sparse' | 'normal' | 'dense';
  season?: Season;
}

export interface GeneratedMap {
  /** Game-grid width in cells */
  width: number;
  /** Game-grid height in cells */
  height: number;
  /** The terrain layer: name of terrain at each cell (for debug/reference) */
  terrainGrid: (string | null)[][];
  /** All visual overlays to render (sorted by z then y for correct draw order) */
  overlays: PlacedOverlay[];
  /** Mechanics layer: one cell per game-grid cell */
  mechanics: MechanicsCell[][];
  /** Rooms (for dungeon/indoor themes) */
  rooms: GeneratedRoom[];
  /** Seed used */
  seed: number;
  /** Theme used */
  theme: MapTheme;
  /** Generation time in ms */
  genTimeMs: number;
}

/** Internal result type returned by each theme generator */
type GenResult = {
  terrainGrid: (string | null)[][];
  overlays: PlacedOverlay[];
  mechanics: MechanicsCell[][];
  rooms: GeneratedRoom[];
  baseTerrain: string | null;
};

// ─── Indoor Object Keywords (excluded from wilderness) ──────
const INDOOR_KEYWORDS = [
  'chair', 'cupboard', 'table', 'bed', 'bookcase', 'boockcase',
  'shelves', 'dinner tray', 'tea set', 'draws', 'stool',
  'curtain', 'weapons', 'lamp', 'stove',
];

function isIndoorObject(o: ParsedObject): boolean {
  const name = o.name.toLowerCase();
  return INDOOR_KEYWORDS.some(kw => name.includes(kw));
}

// ─── Wilderness Features / Biomes ───────────────────────────

/** Helper: find an object by partial name match (case-insensitive) */
function findObj(objects: ParsedObject[], ...keywords: string[]): ParsedObject | null {
  for (const kw of keywords) {
    const found = objects.find(o => o.name.toLowerCase().includes(kw.toLowerCase()));
    if (found) return found;
  }
  return null;
}

/** Helper: find all objects matching any of the keywords */
function findAllObj(objects: ParsedObject[], ...keywords: string[]): ParsedObject[] {
  const result: ParsedObject[] = [];
  for (const o of objects) {
    const lower = o.name.toLowerCase();
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) result.push(o);
  }
  return result;
}

/** Helper: try to place an object, returns true if placed */
function tryPlace(
  obj: ParsedObject, gx: number, gy: number, z: number,
  overlays: PlacedOverlay[], occupied: Set<string>,
  mechanics: MechanicsCell[][], w: number, h: number,
): boolean {
  if (!objectFits(obj, gx, gy, occupied, w, h)) return false;
  overlays.push(...placeObject(obj, gx, gy, z));
  markOccupied(obj, gx, gy, occupied);
  for (let dy = 0; dy < obj.heightCells; dy++) {
    for (let dx = 0; dx < obj.widthCells; dx++) {
      if (gy + dy < h && gx + dx < w) {
        Object.assign(mechanics[gy + dy][gx + dx], objectToMechanics(obj));
      }
    }
  }
  return true;
}

/** Paint a rectangular terrain patch on the grid */
function paintRect(
  terrainGrid: (string | null)[][],
  terrainName: string,
  x: number, y: number, pw: number, ph: number,
  mapW: number, mapH: number,
) {
  for (let dy = 0; dy < ph; dy++) {
    for (let dx = 0; dx < pw; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx >= 0 && tx < mapW && ty >= 0 && ty < mapH) {
        terrainGrid[ty][tx] = terrainName;
      }
    }
  }
}

/**
 * Pick the correct water terrain based on what the surrounding base terrain is.
 * Use "Water (grass edge)" only when the base terrain is grass; otherwise use plain "Water".
 */
function pickWaterTerrain(
  terrains: ParsedTerrain[],
  baseTerrain: string | null,
  season: Season | undefined,
): ParsedTerrain | null {
  const waterAll = seasonFilter(terrains.filter(t => t.tags.includes('water')), season);
  if (waterAll.length === 0) return null;

  const isGrassBase = baseTerrain ? /grass/i.test(baseTerrain) : false;
  if (isGrassBase) {
    // Prefer the grass-edge variant when surrounded by grass
    const grassEdge = waterAll.find(t => /grass.edge/i.test(t.name));
    if (grassEdge) return grassEdge;
  }
  // Otherwise use plain water (no edge descriptor), fall back to any water
  const plain = waterAll.find(t => t.name === 'Water') ?? waterAll.find(t => !/edge/i.test(t.name));
  return plain ?? waterAll[0];
}

// ─── WFC Terrain Type System ────────────────────────────────
//
// Each WFC "type" is an abstract terrain category (GRASS, DIRT, WATER, etc.)
// that maps to one or more actual ParsedTerrain names from the atlas data.
// Adjacency rules control which categories can be neighbours.
//
// After WFC produces a solved grid of type indices, we map each index back
// to a real terrain name, then run the existing auto-tiler + object placement.

/** Abstract terrain categories used by the WFC solver */
enum T {
  GRASS = 0,
  DIRT,
  STONE,
  WATER,
  TALL_GRASS,
  SAND,
  FERTILE,      // Farm soil
  WALL,         // Dungeon/cave wall (null terrain — blocked)
  FLOOR,        // Dungeon floor
  SNOW,
  _COUNT,       // Sentinel — must be last
}

/** Build a symmetric adjacency matrix from a list of allowed pairs */
function buildAdjacency(n: number, pairs: [number, number][]): boolean[][] {
  const adj: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  // Every type can be adjacent to itself
  for (let i = 0; i < n; i++) adj[i][i] = true;
  for (const [a, b] of pairs) {
    adj[a][b] = true;
    adj[b][a] = true;
  }
  return adj;
}

/**
 * Resolve a WFC type index to an actual terrain name from the atlas.
 * Returns null for WALL type (rendered as empty/blocked).
 */
function resolveTerrainName(
  typeIdx: number,
  atlas: AtlasData,
  rng: SeededRandom,
  season: Season | undefined,
  terrainCache: Map<number, string | null>,
): string | null {
  if (terrainCache.has(typeIdx)) return terrainCache.get(typeIdx)!;

  const find = (predicate: (t: ParsedTerrain) => boolean): string | null => {
    const matches = seasonFilter(atlas.terrains.filter(predicate), season);
    if (matches.length === 0) return null;
    // Prefer season-appropriate variants
    const preferred = matches.filter(m => seasonPreferred(m.name, season));
    const pool = preferred.length > 0 ? preferred : matches;
    return rng.pick(pool).name;
  };

  let name: string | null = null;

  switch (typeIdx) {
    case T.GRASS:
      name = find(t => /grass/i.test(t.name) && !/tall/i.test(t.name)); break;
    case T.DIRT:
      name = find(t => /dirt/i.test(t.name) && !/hole|fertile/i.test(t.name)); break;
    case T.STONE:
      name = find(t => (/stone/i.test(t.name) || t.tags.includes('stone')) && !/wall/i.test(t.name)); break;
    case T.WATER:
      name = find(t => t.tags.includes('water') && !/edge/i.test(t.name));
      if (!name) name = find(t => t.tags.includes('water'));
      break;
    case T.TALL_GRASS:
      name = find(t => /tall grass|tall wheat/i.test(t.name)); break;
    case T.SAND:
      name = find(t => /sand/i.test(t.name)); break;
    case T.FERTILE:
      name = find(t => /fertile|light dirt/i.test(t.name)); break;
    case T.WALL:
      name = null; break;
    case T.FLOOR:
      name = find(t => /stone/i.test(t.name) || t.tags.includes('stone'));
      if (!name) name = find(t => /dirt/i.test(t.name));
      break;
    case T.SNOW:
      name = find(t => /snow/i.test(t.name)); break;
    default:
      name = null;
  }

  terrainCache.set(typeIdx, name);
  return name;
}

/**
 * Run WFC to produce a terrain grid, then map indices to real terrain names.
 * This is the core function shared by all theme generators.
 */
function wfcTerrainSolve(
  w: number, h: number,
  types: number[],
  weights: number[],
  adjacency: boolean[][],
  constraints: { x: number; y: number; type: number }[],
  bans: { x: number; y: number; type: number }[],
  atlas: AtlasData,
  rng: SeededRandom,
  season: Season | undefined,
): { terrainGrid: (string | null)[][]; wfcGrid: number[][] } {
  const config: WFCSolverConfig = {
    width: w,
    height: h,
    numTypes: types.length,
    weights,
    adjacency,
  };

  const solver = new WFCSolver(config, rng);

  // Apply constraints (pinned cells)
  for (const c of constraints) {
    solver.constrain(c.x, c.y, c.type);
  }

  // Apply bans (forbidden cells)
  for (const b of bans) {
    solver.ban(b.x, b.y, b.type);
  }

  const wfcGrid = solver.solve(15) ?? Array.from({ length: h }, () => Array(w).fill(0));

  // Map WFC indices to real terrain names
  const nameCache = new Map<number, string | null>();
  const terrainGrid: (string | null)[][] = wfcGrid.map(row =>
    row.map(typeIdx => resolveTerrainName(typeIdx, atlas, rng, season, nameCache))
  );

  return { terrainGrid, wfcGrid };
}

// ─── Object Placement Helpers (post-WFC) ────────────────────

/** Place objects in an area, respecting occupied cells and terrain constraints */
function scatterObjects(
  objects: ParsedObject[],
  count: number,
  terrainGrid: (string | null)[][],
  allowedTerrains: Set<string | null>,
  overlays: PlacedOverlay[],
  occupied: Set<string>,
  mechanics: MechanicsCell[][],
  w: number, h: number,
  rng: SeededRandom,
  z: number,
): void {
  if (objects.length === 0) return;
  for (let i = 0; i < count; i++) {
    const obj = rng.pick(objects);
    for (let attempt = 0; attempt < 15; attempt++) {
      const gx = rng.int(0, w - obj.widthCells);
      const gy = rng.int(0, h - obj.heightCells);

      // Check terrain compatibility
      let terrainOk = true;
      for (let dy = 0; dy < obj.heightCells && terrainOk; dy++) {
        for (let dx = 0; dx < obj.widthCells && terrainOk; dx++) {
          const t = terrainGrid[gy + dy]?.[gx + dx];
          if (!allowedTerrains.has(t)) terrainOk = false;
        }
      }
      if (!terrainOk) continue;

      if (tryPlace(obj, gx, gy, z, overlays, occupied, mechanics, w, h)) break;
    }
  }
}

/**
 * Place composite trees (base + top) using the atlas tree pieces.
 * This produces much better-looking trees than single-piece placement.
 */
function placeCompositeTrees(
  count: number,
  treeBases: ParsedObject[],
  treeTops: ParsedObject[],
  fullTrees: ParsedObject[],
  terrainGrid: (string | null)[][],
  allowedTerrains: Set<string | null>,
  overlays: PlacedOverlay[],
  occupied: Set<string>,
  mechanics: MechanicsCell[][],
  w: number, h: number,
  rng: SeededRandom,
  season: Season | undefined,
): void {
  const canComposite = treeBases.length > 0 && treeTops.length > 0;
  const preferredTops = treeTops.filter(t => seasonPreferred(t.name, season));
  const topPool = preferredTops.length > 0 ? [...preferredTops, ...preferredTops, ...treeTops] : treeTops;

  for (let i = 0; i < count; i++) {
    if (canComposite && rng.chance(0.6)) {
      const base = rng.pick(treeBases);
      const top = rng.pick(topPool);
      const topSubRows = top.tiles.reduce((mx, t) => Math.max(mx, t.relRow), 0) + 1;
      const minBaseY = Math.ceil((topSubRows - 1) * 0.5);
      if (minBaseY >= h - base.heightCells) continue;
      const tx = rng.int(0, w - Math.max(base.widthCells, top.widthCells));
      const ty = rng.int(minBaseY, h - base.heightCells);
      if (objectFits(base, tx, ty, occupied, w, h) && objectOnTerrain(base, tx, ty, terrainGrid, allowedTerrains)) {
        overlays.push(...placeObject(base, tx, ty, 3));
        markOccupied(base, tx, ty, occupied);
        const topGameY = ty - (topSubRows - 1) * 0.5;
        overlays.push(...placeObject(top, tx, topGameY, 4));
        for (let dy = 0; dy < base.heightCells; dy++) {
          for (let dx = 0; dx < base.widthCells; dx++) {
            Object.assign(mechanics[ty + dy][tx + dx], objectToMechanics(base));
          }
        }
      }
    } else if (fullTrees.length > 0) {
      const tree = rng.pick(fullTrees);
      const tx = rng.int(0, w - tree.widthCells);
      const ty = rng.int(0, h - tree.heightCells);
      if (objectFits(tree, tx, ty, occupied, w, h) && objectOnTerrain(tree, tx, ty, terrainGrid, allowedTerrains)) {
        overlays.push(...placeObject(tree, tx, ty, 3));
        markOccupied(tree, tx, ty, occupied);
        for (let dy = 0; dy < tree.heightCells; dy++) {
          for (let dx = 0; dx < tree.widthCells; dx++) {
            Object.assign(mechanics[ty + dy][tx + dx], objectToMechanics(tree));
          }
        }
      }
    }
  }
}

/**
 * Place a horizontal bridge across a river at a specific row.
 * Searches for horizontal bridge objects and stretches them across the water.
 */
function placeRiverBridge(
  riverCols: Map<number, { minX: number; maxX: number }>,
  bridgeY: number,
  atlas: AtlasData,
  overlays: PlacedOverlay[],
  occupied: Set<string>,
  mechanics: MechanicsCell[][],
  w: number, h: number,
  rng: SeededRandom,
  season: Season | undefined,
): void {
  const horizontalBridges = seasonFilter(atlas.objects.filter(o => {
    const lower = o.name.toLowerCase();
    return lower.includes('bridge') &&
      (lower.includes('horizontal') || lower.includes('with rails - horizontal')) &&
      !lower.includes('vertical') && !lower.includes('front on') && !lower.includes('broken');
  }), season);

  if (horizontalBridges.length === 0) return;
  const bridge = rng.pick(horizontalBridges);
  const bounds = riverCols.get(bridgeY);
  if (!bounds || bounds.maxX < 0) return;

  const spanStartX = Math.max(0, bounds.minX - 1);
  const spanEndX = Math.min(w - 1, bounds.maxX + 1);
  const spanWidth = spanEndX - spanStartX + 1;

  const leftTiles = bridge.tiles.filter(t => t.relCol === 0);
  const rightTiles = bridge.tiles.filter(t => t.relCol === (bridge.widthTiles - 1));
  const repeatTiles = bridge.tiles.filter(t => t.repeatableCol);
  const midCol = Math.floor(bridge.widthTiles / 2);
  const middleTiles = repeatTiles.length > 0
    ? repeatTiles
    : bridge.tiles.filter(t => t.relCol === midCol);

  if (leftTiles.length === 0 || rightTiles.length === 0 || middleTiles.length === 0) return;

  const bridgeHeightCells = Math.ceil(bridge.heightTiles / 2);
  const by = bridgeY - Math.floor(bridgeHeightCells / 2);
  const totalSubCols = spanWidth * 2;
  const middleSubCols = Math.max(0, totalSubCols - 2);

  for (const t of leftTiles) {
    overlays.push({
      atlas: t.ref.atlas, col: t.ref.col, row: t.ref.row,
      x: spanStartX + t.relCol * 0.5, y: by + t.relRow * 0.5,
      scale: 0.5, z: 3,
    });
  }
  for (let sc = 0; sc < middleSubCols; sc++) {
    const subX = spanStartX + 0.5 + sc * 0.5;
    for (const t of middleTiles) {
      overlays.push({
        atlas: t.ref.atlas, col: t.ref.col, row: t.ref.row,
        x: subX, y: by + t.relRow * 0.5,
        scale: 0.5, z: 3,
      });
    }
  }
  const rightX = spanStartX + 0.5 + middleSubCols * 0.5;
  for (const t of rightTiles) {
    const colOffset = t.relCol - (bridge.widthTiles - 1);
    overlays.push({
      atlas: t.ref.atlas, col: t.ref.col, row: t.ref.row,
      x: rightX + colOffset * 0.5, y: by + t.relRow * 0.5,
      scale: 0.5, z: 3,
    });
  }
  // Make bridge cells walkable
  for (let dy = 0; dy < bridgeHeightCells; dy++) {
    for (let x = spanStartX; x <= spanEndX; x++) {
      const my = by + dy;
      if (x >= 0 && x < w && my >= 0 && my < h) {
        mechanics[my][x].movement = 'normal';
        mechanics[my][x].hazardType = undefined;
        occupied.delete(`${x},${my}`);
      }
    }
  }
}

// ─── Wilderness Generator (WFC) ────────────────────────────

function generateWilderness(
  opts: MapGenOptions,
  atlas: AtlasData,
  rng: SeededRandom,
): GenResult {
  const { width: w, height: h, density = 'normal', season } = opts;
  const mechanics = createMechanicsGrid(w, h);
  const occupied = new Set<string>();
  const overlays: PlacedOverlay[] = [];

  // ── Build WFC types and adjacency rules ──
  // Wilderness uses: GRASS, DIRT, WATER, TALL_GRASS, SAND, FERTILE, STONE
  const types = [T.GRASS, T.DIRT, T.WATER, T.TALL_GRASS, T.SAND, T.FERTILE, T.STONE];
  const n = types.length;
  // Local index mapping: grass=0, dirt=1, water=2, tallgrass=3, sand=4, fertile=5, stone=6
  const iGrass = 0, iDirt = 1, iWater = 2, iTallGrass = 3, iSand = 4, iFertile = 5, iStone = 6;

  // Weights control how common each terrain is (grass dominant)
  const densityMul = density === 'sparse' ? 0.6 : density === 'dense' ? 1.8 : 1.0;
  const weights = [
    50,                              // grass — dominant
    12 * densityMul,                 // dirt — paths
    4 * densityMul,                  // water — rivers/ponds
    8 * densityMul,                  // tall grass — patches
    2,                               // sand — rare
    3 * densityMul,                  // fertile — farm patches
    4 * densityMul,                  // stone — clearings
  ];

  // In winter, boost snow-like stone; reduce grass growth; add water as ice
  if (season === 'winter') {
    weights[iGrass] = 30;
    weights[iStone] = 10;
    weights[iTallGrass] = 2;
  } else if (season === 'autumn') {
    weights[iTallGrass] = 12;
    weights[iFertile] = 5;
  }

  // Adjacency rules — natural transitions
  // grass ↔ dirt, tallgrass, fertile, stone, sand (grass borders everything natural)
  // dirt ↔ grass, stone, water, sand, fertile (paths can meet water & stone)
  // water ↔ dirt, sand, grass (water borders natural terrain, not tall grass)
  // tallgrass ↔ grass, fertile (tall vegetation clumps with grass)
  // sand ↔ grass, dirt, water, stone (beach / riverbank)
  // fertile ↔ grass, dirt, tallgrass (farmland)
  // stone ↔ grass, dirt, sand (clearings)
  const pairs: [number, number][] = [
    [iGrass, iDirt], [iGrass, iTallGrass], [iGrass, iFertile],
    [iGrass, iStone], [iGrass, iSand], [iGrass, iWater],
    [iDirt, iStone], [iDirt, iWater], [iDirt, iSand], [iDirt, iFertile],
    [iWater, iSand],
    [iTallGrass, iFertile],
    [iSand, iStone],
  ];
  const adjacency = buildAdjacency(n, pairs);

  // ── Pre-seed constraints ──
  // Seed a meandering dirt path across the map (gives structure to the wilderness)
  const constraints: { x: number; y: number; type: number }[] = [];
  const bans: { x: number; y: number; type: number }[] = [];

  const pathY = rng.int(Math.floor(h * 0.3), Math.floor(h * 0.7));
  let cy = pathY;
  for (let x = 0; x < w; x++) {
    if (cy >= 0 && cy < h) constraints.push({ x, y: cy, type: iDirt });
    if (cy + 1 < h) constraints.push({ x, y: cy + 1, type: iDirt });
    if (rng.chance(0.3)) cy += rng.int(-1, 1);
    cy = Math.max(1, Math.min(h - 2, cy));
  }

  // Seed a river if density allows (vertical water column)
  let riverCols = new Map<number, { minX: number; maxX: number }>();
  if (rng.chance(density === 'sparse' ? 0.3 : 0.6)) {
    const riverWidth = rng.int(2, 3);
    let rx = rng.int(Math.floor(w * 0.25), Math.floor(w * 0.75));
    for (let y = 0; y < h; y++) {
      let minX = w, maxX = -1;
      for (let dx = 0; dx < riverWidth; dx++) {
        const xx = rx + dx;
        if (xx >= 0 && xx < w) {
          constraints.push({ x: xx, y, type: iWater });
          minX = Math.min(minX, xx);
          maxX = Math.max(maxX, xx);
        }
      }
      riverCols.set(y, { minX, maxX });
      if (rng.chance(0.25)) rx += rng.int(-1, 1);
      rx = Math.max(1, Math.min(w - riverWidth - 1, rx));
    }
  }

  // Seed farm patches (fertile + tall grass clusters)
  const numFarms = rng.int(density === 'sparse' ? 0 : 1, density === 'dense' ? 2 : 1);
  for (let f = 0; f < numFarms; f++) {
    const fx = rng.int(2, w - 7);
    const fy = rng.int(2, h - 6);
    const fw = rng.int(3, 5);
    const fh = rng.int(2, 4);
    // Fertile border
    for (let dy = -1; dy <= fh; dy++) {
      for (let dx = -1; dx <= fw; dx++) {
        const px = fx + dx, py = fy + dy;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          if (dx < 0 || dx >= fw || dy < 0 || dy >= fh) {
            constraints.push({ x: px, y: py, type: iFertile });
          } else {
            constraints.push({ x: px, y: py, type: iTallGrass });
          }
        }
      }
    }
  }

  // Ban water from map edges (rivers should come from constraints, not random edge spawning)
  for (let x = 0; x < w; x++) {
    bans.push({ x, y: 0, type: iWater });
    bans.push({ x, y: h - 1, type: iWater });
  }
  for (let y = 0; y < h; y++) {
    bans.push({ x: 0, y, type: iWater });
    bans.push({ x: w - 1, y, type: iWater });
  }

  // ── Solve WFC ──
  const { terrainGrid, wfcGrid } = wfcTerrainSolve(
    w, h, types, weights, adjacency, constraints, bans,
    atlas, rng, season,
  );

  // Determine base terrain (most common = grass, for auto-tiler base layer)
  const nameCache = new Map<number, string | null>();
  const baseTerrain = resolveTerrainName(T.GRASS, atlas, rng, season, nameCache);

  // ── Set mechanics from terrain ──
  const terrainMap = new Map(atlas.terrains.map(t => [t.name, t]));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const name = terrainGrid[y][x];
      if (name) {
        const terrain = terrainMap.get(name);
        if (terrain) Object.assign(mechanics[y][x], terrainToMechanics(name, terrain.tags));
      }
    }
  }

  // ── Place bridge across river ──
  if (riverCols.size > 0) {
    const bridgeY = rng.int(Math.floor(h * 0.3), Math.floor(h * 0.7));
    placeRiverBridge(riverCols, bridgeY, atlas, overlays, occupied, mechanics, w, h, rng, season);

    // Water decorations (lilies)
    const lilies = seasonFilter(findAllObj(atlas.objects, 'lilly', 'water decoration', 'water plant'), season);
    if (lilies.length > 0) {
      for (let i = 0; i < rng.int(2, 5); i++) {
        const lily = rng.pick(lilies);
        for (let attempt = 0; attempt < 20; attempt++) {
          const lx = rng.int(0, w - 1);
          const ly = rng.int(0, h - 1);
          if (wfcGrid[ly][lx] === iWater && !occupied.has(`${lx},${ly}`)) {
            overlays.push(...placeObject(lily, lx, ly, 1));
            occupied.add(`${lx},${ly}`);
            break;
          }
        }
      }
    }
  }

  // ── Place objects ──
  // Determine natural terrain set for tree/rock placement
  const naturalTerrains = new Set<string | null>();
  const grassName = resolveTerrainName(T.GRASS, atlas, rng, season, nameCache);
  const tallGrassName = resolveTerrainName(T.TALL_GRASS, atlas, rng, season, nameCache);
  if (grassName) naturalTerrains.add(grassName);
  if (tallGrassName) naturalTerrains.add(tallGrassName);

  // Trees (season-filtered)
  const allTrees = seasonFilter(atlas.objects.filter(o => o.tags.includes('tree')), season);
  const treeBases = allTrees.filter(o => o.name.toLowerCase().includes('base'));
  const treeTops = allTrees.filter(o => o.name.toLowerCase().includes('top'));
  const fullTrees = allTrees.filter(o =>
    !o.name.toLowerCase().includes('base') &&
    !o.name.toLowerCase().includes('top') &&
    !o.name.toLowerCase().includes('stump') &&
    !o.name.toLowerCase().includes('trunk')
  );

  const numTrees = Math.round((w * h * 0.02) * densityMul);
  placeCompositeTrees(numTrees, treeBases, treeTops, fullTrees,
    terrainGrid, naturalTerrains, overlays, occupied, mechanics, w, h, rng, season);

  // Rocks
  const rocks = seasonFilter(atlas.objects.filter(o => o.tags.includes('rock')), season);
  scatterObjects(rocks, Math.round((w * h * 0.01) * densityMul),
    terrainGrid, naturalTerrains, overlays, occupied, mechanics, w, h, rng, 1);

  // Vegetation
  const vegetation = seasonFilter(atlas.objects.filter(o =>
    o.tags.includes('vegetation') && !isIndoorObject(o)), season);
  scatterObjects(vegetation, Math.round((w * h * 0.008) * densityMul),
    terrainGrid, naturalTerrains, overlays, occupied, mechanics, w, h, rng, 3);

  // Outdoor decorations (not indoor items)
  const decorations = seasonFilter(atlas.objects.filter(o =>
    o.tags.includes('decoration') &&
    !o.tags.includes('tree') && !o.tags.includes('rock') &&
    !o.tags.includes('indoor') && !o.tags.includes('building') &&
    !isIndoorObject(o)
  ), season);
  scatterObjects(decorations, Math.round((w * h * 0.005) * densityMul),
    terrainGrid, new Set<string | null>([grassName, tallGrassName, resolveTerrainName(T.DIRT, atlas, rng, season, nameCache)]),
    overlays, occupied, mechanics, w, h, rng, 1);

  // Farm objects near fertile terrain
  const carts = seasonFilter(findAllObj(atlas.objects, 'cart'), season);
  const windmill = findObj(atlas.objects, 'windmill');
  const fertName = resolveTerrainName(T.FERTILE, atlas, rng, season, nameCache);
  if (carts.length > 0 && fertName) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const cx = rng.int(1, w - 3);
      const cy = rng.int(1, h - 3);
      if (terrainGrid[cy]?.[cx] === fertName) {
        tryPlace(rng.pick(carts), cx + 1, cy, 1, overlays, occupied, mechanics, w, h);
        break;
      }
    }
  }
  if (windmill && rng.chance(0.3)) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const mx = rng.int(2, w - windmill.widthCells - 2);
      const my = rng.int(2, h - windmill.heightCells - 2);
      const cellTerrain = terrainGrid[my]?.[mx];
      if (cellTerrain === fertName || cellTerrain === grassName) {
        tryPlace(windmill, mx, my, 1, overlays, occupied, mechanics, w, h);
        break;
      }
    }
  }

  // Campsite objects on dirt
  const tent = findObj(atlas.objects, 'tent');
  const firewood = findObj(atlas.objects, 'fire wood large', 'firewood');
  const dirtName = resolveTerrainName(T.DIRT, atlas, rng, season, nameCache);
  if (tent && rng.chance(0.4)) {
    for (let attempt = 0; attempt < 15; attempt++) {
      const cx = rng.int(3, w - 5);
      const cy = rng.int(3, h - 5);
      if (terrainGrid[cy]?.[cx] === dirtName) {
        if (tryPlace(tent, cx, cy, 1, overlays, occupied, mechanics, w, h)) {
          if (firewood) tryPlace(firewood, cx + tent.widthCells, cy + 1, 1, overlays, occupied, mechanics, w, h);
          break;
        }
      }
    }
  }

  // Stone area decorations (ruins)
  const stoneName = resolveTerrainName(T.STONE, atlas, rng, season, nameCache);
  const stoneTerrainSet = new Set<string | null>([stoneName]);
  if (rng.chance(0.35)) {
    const rockHead = findObj(atlas.objects, 'rock head');
    const columns = seasonFilter(findAllObj(atlas.objects, 'ruined colomn', 'colomn'), season);
    if (rockHead) {
      for (let attempt = 0; attempt < 15; attempt++) {
        const rx = rng.int(2, w - rockHead.widthCells - 2);
        const ry = rng.int(2, h - rockHead.heightCells - 2);
        if (terrainGrid[ry]?.[rx] === stoneName || terrainGrid[ry]?.[rx] === grassName) {
          if (tryPlace(rockHead, rx, ry, 1, overlays, occupied, mechanics, w, h)) {
            scatterObjects(columns, rng.int(1, 3), terrainGrid,
              new Set<string | null>([stoneName, grassName]),
              overlays, occupied, mechanics, w, h, rng, 1);
            break;
          }
        }
      }
    }
  }

  // Statue / monument on stone
  if (rng.chance(0.2)) {
    const statues = seasonFilter(findAllObj(atlas.objects, 'lion statue', 'statue chalice', 'gold fountain', 'stone cross'), season);
    scatterObjects(statues, 1, terrainGrid, new Set<string | null>([stoneName, grassName]),
      overlays, occupied, mechanics, w, h, rng, 1);
  }

  // Well near dirt
  const wells = seasonFilter(findAllObj(atlas.objects, 'well'), season);
  if (wells.length > 0 && rng.chance(0.3)) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const wx = rng.int(2, w - 3);
      const wy = rng.int(2, h - 3);
      const t = terrainGrid[wy]?.[wx];
      if (t === dirtName || t === grassName) {
        if (tryPlace(rng.pick(wells), wx, wy, 1, overlays, occupied, mechanics, w, h)) {
          const bucket = findObj(atlas.objects, 'bucket');
          if (bucket) tryPlace(bucket, wx + 2, wy, 1, overlays, occupied, mechanics, w, h);
          break;
        }
      }
    }
  }

  return { terrainGrid, overlays, mechanics, rooms: [], baseTerrain };
}

// ─── Dungeon Generator (WFC + BSP rooms) ────────────────────
//
// Uses BSP to carve rooms and corridors, then WFC for floor variation
// within rooms. Walls are the dominant type; floor types fill carved areas.

function generateDungeon(
  opts: MapGenOptions,
  atlas: AtlasData,
  rng: SeededRandom,
): GenResult {
  const { width: w, height: h, density = 'normal' } = opts;
  const mechanics = createMechanicsGrid(w, h);
  const occupied = new Set<string>();
  const overlays: PlacedOverlay[] = [];

  // BSP room generation
  const rooms: GeneratedRoom[] = [];
  let roomId = 0;

  interface BSPNode { x: number; y: number; w: number; h: number; left?: BSPNode; right?: BSPNode; room?: Rect }
  const MIN_ROOM = 4;
  const MIN_LEAF = 6;

  function splitBSP(node: BSPNode, depth: number): void {
    if (depth <= 0 || node.w < MIN_LEAF * 2 || node.h < MIN_LEAF * 2) return;
    const splitH = node.w > node.h ? false : node.h > node.w ? true : rng.chance(0.5);
    if (splitH) {
      const split = rng.int(MIN_LEAF, node.h - MIN_LEAF);
      node.left = { x: node.x, y: node.y, w: node.w, h: split };
      node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
    } else {
      const split = rng.int(MIN_LEAF, node.w - MIN_LEAF);
      node.left = { x: node.x, y: node.y, w: split, h: node.h };
      node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
    }
    splitBSP(node.left, depth - 1);
    splitBSP(node.right, depth - 1);
  }

  // Track which cells are floor (carved) for WFC constraints
  const isFloor: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false));

  function createRooms(node: BSPNode): void {
    if (node.left) createRooms(node.left);
    if (node.right) createRooms(node.right);
    if (!node.left && !node.right) {
      const rw = rng.int(MIN_ROOM, node.w - 2);
      const rh = rng.int(MIN_ROOM, node.h - 2);
      const rx = node.x + rng.int(1, node.w - rw - 1);
      const ry = node.y + rng.int(1, node.h - rh - 1);
      node.room = { x: rx, y: ry, w: rw, h: rh };
      rooms.push({
        id: roomId++, x: rx, y: ry, w: rw, h: rh,
        type: rooms.length === 0 ? 'entry' : undefined,
        connected: [],
      });
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          isFloor[y][x] = true;
        }
      }
    }
  }

  function getRoomCenter(node: BSPNode): { x: number; y: number } | null {
    if (node.room) return { x: Math.floor(node.room.x + node.room.w / 2), y: Math.floor(node.room.y + node.room.h / 2) };
    if (node.left) return getRoomCenter(node.left);
    if (node.right) return getRoomCenter(node.right);
    return null;
  }

  function connectRooms(node: BSPNode): void {
    if (!node.left || !node.right) return;
    connectRooms(node.left);
    connectRooms(node.right);
    const a = getRoomCenter(node.left);
    const b = getRoomCenter(node.right);
    if (!a || !b) return;
    let cx = a.x, cy = a.y;
    while (cx !== b.x) {
      if (cy >= 0 && cy < h && cx >= 0 && cx < w) {
        isFloor[cy][cx] = true;
        if (cy + 1 < h) isFloor[cy + 1][cx] = true;
      }
      cx += cx < b.x ? 1 : -1;
    }
    while (cy !== b.y) {
      if (cy >= 0 && cy < h && cx >= 0 && cx < w) {
        isFloor[cy][cx] = true;
        if (cx + 1 < w) isFloor[cy][cx + 1] = true;
      }
      cy += cy < b.y ? 1 : -1;
    }
  }

  const root: BSPNode = { x: 1, y: 1, w: w - 2, h: h - 2 };
  splitBSP(root, 4);
  createRooms(root);
  connectRooms(root);

  // Record room connections
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      if (Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) + Math.abs((a.y + a.h / 2) - (b.y + b.h / 2)) < (a.w + b.w + a.h + b.h) / 2) {
        a.connected.push(b.id);
        b.connected.push(a.id);
      }
    }
  }

  // ── WFC for floor variation within carved areas ──
  // Types: WALL=0, FLOOR_STONE=1, FLOOR_DIRT=2
  const iWall = 0, iFloorStone = 1, iFloorDirt = 2;
  const dungeonTypes = [iWall, iFloorStone, iFloorDirt];
  const dungeonWeights = [30, 15, 8]; // Walls are heavy so unconstrained areas stay wall
  const dungeonPairs: [number, number][] = [
    [iFloorStone, iFloorDirt], // stone ↔ dirt within rooms
    [iWall, iFloorStone],      // walls can border stone floors
    [iWall, iFloorDirt],       // walls can border dirt floors
  ];
  const dungeonAdj = buildAdjacency(dungeonTypes.length, dungeonPairs);

  // Constrain: floor cells must be stone or dirt, wall cells must be wall
  const dungeonConstraints: { x: number; y: number; type: number }[] = [];
  const dungeonBans: { x: number; y: number; type: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isFloor[y][x]) {
        dungeonBans.push({ x, y, type: iWall }); // Can't be wall
      } else {
        dungeonConstraints.push({ x, y, type: iWall }); // Must be wall
      }
    }
  }

  // Solve WFC for floor variation
  const dungeonConfig: WFCSolverConfig = {
    width: w, height: h, numTypes: dungeonTypes.length,
    weights: dungeonWeights, adjacency: dungeonAdj,
  };
  const dungeonSolver = new WFCSolver(dungeonConfig, rng);
  for (const c of dungeonConstraints) dungeonSolver.constrain(c.x, c.y, c.type);
  for (const b of dungeonBans) dungeonSolver.ban(b.x, b.y, b.type);
  const dungeonWfc = dungeonSolver.solve(10) ?? Array.from({ length: h }, () => Array(w).fill(iWall));

  // Map to real terrains
  const season = opts.season;
  const nameCache = new Map<number, string | null>();
  const stoneFloorName = resolveTerrainName(T.STONE, atlas, rng, season, nameCache)
    ?? resolveTerrainName(T.FLOOR, atlas, rng, season, nameCache);
  const dirtFloorName = resolveTerrainName(T.DIRT, atlas, rng, season, nameCache);

  const terrainGrid: (string | null)[][] = dungeonWfc.map(row =>
    row.map(type => {
      if (type === iFloorStone) return stoneFloorName;
      if (type === iFloorDirt) return dirtFloorName;
      return null; // Wall
    })
  );

  // Set mechanics
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (terrainGrid[y][x] === null) {
        mechanics[y][x] = { movement: 'blocked', cover: 'greater', elevation: 0, opaque: true };
      } else {
        const name = terrainGrid[y][x]!;
        const terrain = atlas.terrains.find(t => t.name === name);
        if (terrain) Object.assign(mechanics[y][x], terrainToMechanics(name, terrain.tags));
      }
    }
  }

  // Place decorations in rooms
  const indoorDecorations = atlas.objects.filter(o =>
    (o.tags.includes('decoration') || o.tags.includes('indoor')) &&
    !o.tags.includes('tree') && !o.tags.includes('rock')
  );
  const smallDecos = indoorDecorations.filter(o => o.widthCells <= 2 && o.heightCells <= 2);
  const floorNames = new Set<string | null>([stoneFloorName, dirtFloorName]);

  if (smallDecos.length > 0) {
    for (const room of rooms) {
      const numDecos = density === 'sparse' ? 1 : density === 'dense' ? 4 : 2;
      for (let i = 0; i < numDecos; i++) {
        const deco = rng.pick(smallDecos);
        const dx = rng.int(room.x + 1, room.x + room.w - deco.widthCells - 1);
        const dy = rng.int(room.y + 1, room.y + room.h - deco.heightCells - 1);
        if (dx >= room.x && dy >= room.y && objectFits(deco, dx, dy, occupied, w, h)) {
          overlays.push(...placeObject(deco, dx, dy, 1));
          markOccupied(deco, dx, dy, occupied);
        }
      }
    }
  }

  return { terrainGrid, overlays, mechanics, rooms, baseTerrain: null };
}

// ─── Indoor Generator (WFC + BSP rooms) ─────────────────────

function generateIndoor(
  opts: MapGenOptions,
  atlas: AtlasData,
  rng: SeededRandom,
): GenResult {
  // Use the dungeon BSP approach but with indoor-specific terrains
  const result = generateDungeon(opts, atlas, rng);

  // If indoor terrain is available, WFC repaint rooms with indoor floor variants
  const season = opts.season;
  const indoorTerrains = seasonFilter(atlas.terrains.filter(t =>
    t.tags.includes('indoor') || t.name.toLowerCase().includes('carpet') || t.name.toLowerCase().includes('planks')
  ), season);

  if (indoorTerrains.length > 0) {
    for (const room of result.rooms) {
      const floorTerrain = rng.pick(indoorTerrains).name;
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (result.terrainGrid[y]?.[x] !== null) {
            result.terrainGrid[y][x] = floorTerrain;
          }
        }
      }
    }
  }

  return result;
}

// ─── Cave Generator (WFC Cellular Automata) ─────────────────
//
// Instead of classic CA, runs WFC with two types (WALL and FLOOR)
// with adjacency rules that produce organic cave-like shapes.
// Both wall and floor can be adjacent to each other but floor has lower weight
// creating natural cave passages.

function generateCave(
  opts: MapGenOptions,
  atlas: AtlasData,
  rng: SeededRandom,
): GenResult {
  const { width: w, height: h, density = 'normal', season } = opts;
  const mechanics = createMechanicsGrid(w, h);
  const occupied = new Set<string>();
  const overlays: PlacedOverlay[] = [];

  // WFC Types: WALL=0, CAVE_FLOOR=1, WATER=2
  const iWall = 0, iCaveFloor = 1, iCaveWater = 2;
  const caveTypes = [iWall, iCaveFloor, iCaveWater];

  // Weights: floor gets enough weight to form connected passages
  // Density controls floor abundance
  const floorWeight = density === 'sparse' ? 25 : density === 'dense' ? 50 : 35;
  const caveWeights = [40, floorWeight, 3]; // wall, floor, water (rare)

  // Adjacency: everything can touch everything (creates organic shapes)
  // but water can only touch floor (not walls — pools form in open areas)
  const cavePairs: [number, number][] = [
    [iWall, iCaveFloor],
    [iCaveFloor, iCaveWater],
  ];
  const caveAdj = buildAdjacency(caveTypes.length, cavePairs);

  // Constraints: borders are walls, center area seeded with floor to ensure connectivity
  const caveConstraints: { x: number; y: number; type: number }[] = [];
  const caveBans: { x: number; y: number; type: number }[] = [];

  // Border walls
  for (let x = 0; x < w; x++) {
    caveConstraints.push({ x, y: 0, type: iWall });
    caveConstraints.push({ x, y: h - 1, type: iWall });
  }
  for (let y = 0; y < h; y++) {
    caveConstraints.push({ x: 0, y, type: iWall });
    caveConstraints.push({ x: w - 1, y, type: iWall });
  }

  // Seed a connected passage through the cave (ensures playability)
  const startX = rng.int(3, Math.floor(w / 3));
  const startY = Math.floor(h / 2);
  let cx = startX, cy = startY;
  const endX = w - rng.int(3, Math.floor(w / 3));
  while (cx !== endX || cy !== Math.floor(h / 2)) {
    if (cx >= 1 && cx < w - 1 && cy >= 1 && cy < h - 1) {
      caveConstraints.push({ x: cx, y: cy, type: iCaveFloor });
      // Make passage 2 wide
      if (cy + 1 < h - 1) caveConstraints.push({ x: cx, y: cy + 1, type: iCaveFloor });
    }
    if (cx < endX) cx++;
    else if (cx > endX) cx--;
    if (rng.chance(0.3)) cy += rng.int(-1, 1);
    cy = Math.max(2, Math.min(h - 3, cy));
  }

  // Add a few branch passages for interest
  const numBranches = rng.int(2, 4);
  for (let b = 0; b < numBranches; b++) {
    let bx = rng.int(3, w - 4);
    let by = rng.int(3, h - 4);
    const bLen = rng.int(4, 10);
    const bDir = rng.pick(['N', 'S', 'E', 'W']);
    for (let s = 0; s < bLen; s++) {
      if (bx >= 1 && bx < w - 1 && by >= 1 && by < h - 1) {
        caveConstraints.push({ x: bx, y: by, type: iCaveFloor });
      }
      if (bDir === 'N') by--;
      else if (bDir === 'S') by++;
      else if (bDir === 'E') bx++;
      else bx--;
    }
  }

  // Ban water from non-floor areas (it'll only form in constrained floor) 
  // Just ban water on borders and second ring
  for (let x = 0; x < w; x++) {
    for (let ring = 0; ring < 2; ring++) {
      caveBans.push({ x, y: ring, type: iCaveWater });
      caveBans.push({ x, y: h - 1 - ring, type: iCaveWater });
    }
  }
  for (let y = 0; y < h; y++) {
    for (let ring = 0; ring < 2; ring++) {
      caveBans.push({ x: ring, y, type: iCaveWater });
      caveBans.push({ x: w - 1 - ring, y, type: iCaveWater });
    }
  }

  // Solve
  const caveConfig: WFCSolverConfig = {
    width: w, height: h, numTypes: caveTypes.length,
    weights: caveWeights, adjacency: caveAdj,
  };
  const caveSolver = new WFCSolver(caveConfig, rng);
  for (const c of caveConstraints) caveSolver.constrain(c.x, c.y, c.type);
  for (const b of caveBans) caveSolver.ban(b.x, b.y, b.type);
  const caveWfc = caveSolver.solve(15) ?? Array.from({ length: h }, () => Array(w).fill(iWall));

  // Map to real terrains
  const nameCache = new Map<number, string | null>();
  const dirtTerrains = atlas.terrains.filter(t => t.name.toLowerCase().includes('dirt') || t.name.toLowerCase().includes('stone'));
  const caveDirtName = dirtTerrains.length > 0 ? rng.pick(dirtTerrains).name : atlas.terrains[0]?.name ?? null;
  const waterPick = pickWaterTerrain(atlas.terrains, caveDirtName, undefined);
  const caveWaterName = waterPick?.name ?? null;

  const terrainGrid: (string | null)[][] = caveWfc.map(row =>
    row.map(type => {
      if (type === iCaveFloor) return caveDirtName;
      if (type === iCaveWater) return caveWaterName;
      return null; // Wall
    })
  );

  // Mechanics
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (terrainGrid[y][x] === null) {
        mechanics[y][x] = { movement: 'blocked', cover: 'greater', elevation: 0, opaque: true };
      } else {
        const name = terrainGrid[y][x]!;
        const terrain = atlas.terrains.find(t => t.name === name);
        if (terrain) Object.assign(mechanics[y][x], terrainToMechanics(name, terrain.tags));
      }
    }
  }

  // Place rocks and cave objects
  const rocks = atlas.objects.filter(o => o.tags.includes('rock') && o.widthCells <= 2 && o.heightCells <= 2);
  const densityMul = density === 'sparse' ? 0.5 : density === 'dense' ? 2 : 1;
  const floorSet = new Set<string | null>([caveDirtName]);
  scatterObjects(rocks, Math.round((w * h * 0.008) * densityMul),
    terrainGrid, floorSet, overlays, occupied, mechanics, w, h, rng, 1);

  // Mushrooms and cave vegetation
  const caveDecos = atlas.objects.filter(o =>
    o.tags.includes('decoration') && o.widthCells <= 1 && o.heightCells <= 2 &&
    !o.tags.includes('tree') && !isIndoorObject(o)
  );
  scatterObjects(caveDecos, Math.round(4 * densityMul),
    terrainGrid, floorSet, overlays, occupied, mechanics, w, h, rng, 1);

  return { terrainGrid, overlays, mechanics, rooms: [], baseTerrain: null };
}

// ─── Urban Generator (WFC) ─────────────────────────────────
//
// WFC places road, building (blocked), and park terrain.
// Buildings auto-form as contiguous blocked regions; roads fill between them.

function generateUrban(
  opts: MapGenOptions,
  atlas: AtlasData,
  rng: SeededRandom,
): GenResult {
  const { width: w, height: h, density = 'normal', season } = opts;
  const mechanics = createMechanicsGrid(w, h);
  const occupied = new Set<string>();
  const overlays: PlacedOverlay[] = [];

  // WFC Types: ROAD=0, BUILDING=1, PARK=2
  const iRoad = 0, iBuilding = 1, iPark = 2;
  const urbanTypes = [iRoad, iBuilding, iPark];

  const numBuildings = density === 'sparse' ? 3 : density === 'dense' ? 8 : 5;
  const buildingWeight = 10 + numBuildings * 2;
  const urbanWeights = [40, buildingWeight, 8]; // roads dominant
  const urbanPairs: [number, number][] = [
    [iRoad, iBuilding],  // buildings border roads
    [iRoad, iPark],      // parks border roads
  ];
  // NOTE: buildings don't touch parks (must have road between)
  const urbanAdj = buildAdjacency(urbanTypes.length, urbanPairs);

  // Constraints: seed road grid and building blocks
  const urbanConstraints: { x: number; y: number; type: number }[] = [];
  const urbanBans: { x: number; y: number; type: number }[] = [];

  // Main roads (horizontal and vertical)
  const mainRoadY = Math.floor(h / 2);
  const mainRoadX = Math.floor(w / 2);
  for (let x = 0; x < w; x++) {
    urbanConstraints.push({ x, y: mainRoadY, type: iRoad });
    if (mainRoadY + 1 < h) urbanConstraints.push({ x, y: mainRoadY + 1, type: iRoad });
  }
  for (let y = 0; y < h; y++) {
    urbanConstraints.push({ x: mainRoadX, y, type: iRoad });
    if (mainRoadX + 1 < w) urbanConstraints.push({ x: mainRoadX + 1, y, type: iRoad });
  }

  // Border roads
  for (let x = 0; x < w; x++) {
    urbanConstraints.push({ x, y: 0, type: iRoad });
    urbanConstraints.push({ x, y: h - 1, type: iRoad });
  }
  for (let y = 0; y < h; y++) {
    urbanConstraints.push({ x: 0, y, type: iRoad });
    urbanConstraints.push({ x: w - 1, y, type: iRoad });
  }

  // Seed building blocks in quadrants
  const quadrants = [
    { x1: 2, y1: 2, x2: mainRoadX - 2, y2: mainRoadY - 2 },
    { x1: mainRoadX + 2, y1: 2, x2: w - 3, y2: mainRoadY - 2 },
    { x1: 2, y1: mainRoadY + 2, x2: mainRoadX - 2, y2: h - 3 },
    { x1: mainRoadX + 2, y1: mainRoadY + 2, x2: w - 3, y2: h - 3 },
  ];

  const rooms: GeneratedRoom[] = [];
  let roomId = 0;

  for (const q of quadrants) {
    if (q.x2 <= q.x1 + 2 || q.y2 <= q.y1 + 2) continue;
    const bCount = rng.int(1, Math.ceil(numBuildings / 4));
    for (let b = 0; b < bCount; b++) {
      const bw = rng.int(3, Math.min(6, q.x2 - q.x1 - 1));
      const bh = rng.int(3, Math.min(5, q.y2 - q.y1 - 1));
      const bx = rng.int(q.x1, q.x2 - bw);
      const by = rng.int(q.y1, q.y2 - bh);
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          urbanConstraints.push({ x, y, type: iBuilding });
        }
      }
      rooms.push({ id: roomId++, x: bx, y: by, w: bw, h: bh, type: 'building', connected: [] });
    }
    // Maybe a park in one quadrant
    if (rng.chance(0.3)) {
      const px = rng.int(q.x1, q.x2 - 3);
      const py = rng.int(q.y1, q.y2 - 3);
      for (let y = py; y < py + 2 && y < q.y2; y++) {
        for (let x = px; x < px + 3 && x < q.x2; x++) {
          urbanConstraints.push({ x, y, type: iPark });
        }
      }
    }
  }

  // Solve
  const urbanConfig: WFCSolverConfig = {
    width: w, height: h, numTypes: urbanTypes.length,
    weights: urbanWeights, adjacency: urbanAdj,
  };
  const urbanSolver = new WFCSolver(urbanConfig, rng);
  for (const c of urbanConstraints) urbanSolver.constrain(c.x, c.y, c.type);
  for (const b of urbanBans) urbanSolver.ban(b.x, b.y, b.type);
  const urbanWfc = urbanSolver.solve(15) ?? Array.from({ length: h }, () => Array(w).fill(iRoad));

  // Map to real terrains
  const nameCache = new Map<number, string | null>();
  const stoneTerrains = seasonFilter(atlas.terrains.filter(t => t.name.toLowerCase().includes('stone') || t.tags.includes('stone')), season);
  const roadTerrain = stoneTerrains.length > 0 ? rng.pick(stoneTerrains).name
    : resolveTerrainName(T.DIRT, atlas, rng, season, nameCache);
  const grassName = resolveTerrainName(T.GRASS, atlas, rng, season, nameCache);

  const terrainGrid: (string | null)[][] = urbanWfc.map(row =>
    row.map(type => {
      if (type === iRoad) return roadTerrain;
      if (type === iPark) return grassName;
      return null; // Building = blocked
    })
  );

  // Mechanics
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (terrainGrid[y][x] === null) {
        mechanics[y][x] = { movement: 'blocked', cover: 'greater', elevation: 0, opaque: true };
        occupied.add(`${x},${y}`);
      } else {
        const name = terrainGrid[y][x]!;
        const terrain = atlas.terrains.find(t => t.name === name);
        if (terrain) Object.assign(mechanics[y][x], terrainToMechanics(name, terrain.tags));
      }
    }
  }

  // Street furniture
  const streetDecos = atlas.objects.filter(o =>
    (o.tags.includes('decoration') || o.tags.includes('overlay')) &&
    !o.tags.includes('tree') && !o.tags.includes('indoor') && !o.tags.includes('building') &&
    o.widthCells <= 1 && o.heightCells <= 2
  );
  const roadSet = new Set<string | null>([roadTerrain]);
  const densityMul = density === 'sparse' ? 0.5 : density === 'dense' ? 2 : 1;
  scatterObjects(streetDecos, Math.round(6 * densityMul),
    terrainGrid, roadSet, overlays, occupied, mechanics, w, h, rng, 1);

  // Park trees
  const parkTreeSet = new Set<string | null>([grassName]);
  const allTrees = seasonFilter(atlas.objects.filter(o => o.tags.includes('tree')), season);
  const treeBases = allTrees.filter(o => o.name.toLowerCase().includes('base'));
  const treeTops = allTrees.filter(o => o.name.toLowerCase().includes('top'));
  const fullTrees = allTrees.filter(o =>
    !o.name.toLowerCase().includes('base') && !o.name.toLowerCase().includes('top') &&
    !o.name.toLowerCase().includes('stump') && !o.name.toLowerCase().includes('trunk')
  );
  placeCompositeTrees(Math.round(4 * densityMul), treeBases, treeTops, fullTrees,
    terrainGrid, parkTreeSet, overlays, occupied, mechanics, w, h, rng, season);

  // Building wall objects
  const buildingWalls = atlas.objects.filter(o => o.tags.includes('building') || o.tags.includes('wall'));
  if (buildingWalls.length > 0) {
    for (const room of rooms) {
      for (let x = room.x; x < room.x + room.w; x++) {
        const wall = rng.pick(buildingWalls.filter(wo => wo.widthCells <= 1));
        if (wall && room.y - 1 >= 0 && !occupied.has(`${x},${room.y - 1}`)) {
          overlays.push(...placeObject(wall, x, room.y - 1, 1));
        }
      }
    }
  }

  return { terrainGrid, overlays, mechanics, rooms, baseTerrain: roadTerrain };
}

// ─── Main Entry Point ───────────────────────────────────────

export function generateAtlasMap(opts: MapGenOptions, atlas: AtlasData): GeneratedMap {
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = new SeededRandom(seed);
  const t0 = performance.now();

  let result: GenResult;

  switch (opts.theme) {
    case 'wilderness':
      result = generateWilderness(opts, atlas, rng);
      break;
    case 'dungeon':
      result = generateDungeon(opts, atlas, rng);
      break;
    case 'indoor':
      result = generateIndoor(opts, atlas, rng);
      break;
    case 'cave':
      result = generateCave(opts, atlas, rng);
      break;
    case 'urban':
      result = generateUrban(opts, atlas, rng);
      break;
    default:
      result = generateWilderness(opts, atlas, rng);
  }

  // Auto-tile the terrain layer
  const terrainMap = new Map(atlas.terrains.map(t => [t.name, t]));
  const terrainOverlays = autoTileTerrain(result.terrainGrid, terrainMap, rng, result.baseTerrain);

  // Merge overlays: terrain first, then objects/decorations
  const allOverlays = [...terrainOverlays, ...result.overlays];

  // Sort by z, then by y for correct draw order
  allOverlays.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);

  const genTimeMs = Math.round(performance.now() - t0);

  return {
    width: opts.width,
    height: opts.height,
    terrainGrid: result.terrainGrid,
    overlays: allOverlays,
    mechanics: result.mechanics,
    rooms: result.rooms,
    seed,
    theme: opts.theme,
    genTimeMs,
  };
}
