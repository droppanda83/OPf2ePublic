/**
 * Procedural Map Generator for PF2e Rebirth
 *
 * Generates tile-based tactical battle maps with:
 * - BSP (Binary Space Partition) dungeon rooms & corridors
 * - Cellular automata natural caves
 * - Wilderness open areas with terrain features
 * - Urban street grids
 * - Indoor manor/temple layouts
 *
 * Each cell has a rich TileType for rendering and gameplay:
 *   wall, floor, door, water, lava, pit, difficult, stairs, etc.
 *
 * Line-of-sight is computed from wall tiles.
 */

import { Position, TerrainTile, MapFeature, MapTheme } from './types';

// ─── Tile Types ─────────────────────────────────────────────

/** All possible tile types for procedural maps */
export type TileType =
  // Structural
  | 'wall'              // Impassable stone/brick
  | 'floor'             // Regular walkable floor
  | 'floor-alt'         // Alternate floor texture (checkered, cracked, etc.)
  | 'corridor'          // Hallway floor
  | 'door'              // Door tile — passable but blocks LoS when closed
  | 'door-open'         // Open door — passable and transparent
  // Natural
  | 'dirt'              // Natural floor
  | 'grass'             // Wilderness floor
  | 'grass-tall'        // Tall grass — difficult terrain, partial cover
  | 'stone'             // Rocky ground
  | 'sand'              // Desert/beach floor
  | 'snow'              // Snowy ground
  | 'mud'               // Muddy ground — difficult terrain
  | 'cobblestone'       // Cobbled street/path
  | 'planks'            // Wooden plank flooring
  // Hazards
  | 'water-shallow'     // Difficult terrain
  | 'water-deep'        // Impassable
  | 'lava'              // Impassable + damage
  | 'pit'               // Impassable
  | 'ice'               // Difficult terrain
  | 'rubble'            // Difficult terrain
  // Features
  | 'stairs-up'         // Stairs going up
  | 'stairs-down'       // Stairs going down
  | 'chest'             // Treasure chest feature
  | 'pillar'            // Decorative pillar — impassable, blocks LoS
  | 'tree'              // Tree — impassable, blocks LoS
  | 'bush'              // Bush — difficult, partial LoS
  | 'rock'              // Large rock — impassable
  | 'bridge'            // Bridge over water/pit — normal movement
  | 'carpet'            // Decorative floor (throne rooms, etc.)
  // Furniture & Props
  | 'barrel'            // Barrel — impassable, lesser cover
  | 'crate'             // Wooden crate — impassable, lesser cover
  | 'table'             // Table — difficult terrain
  | 'chair'             // Chair — walkable decoration
  | 'bookshelf'         // Bookshelf — impassable, blocks LoS
  | 'fountain'          // Fountain — impassable, decorative
  | 'well'              // Well — impassable
  | 'anvil'             // Blacksmith anvil — impassable
  | 'hay'               // Hay bale — difficult terrain, lesser cover
  | 'fence'             // Wooden fence — impassable, doesn't block LoS
  | 'fence-gate'        // Gate in fence — passable
  | 'lamp-post'         // Street lamp — impassable
  | 'statue'            // Statue — impassable, blocks LoS
  | 'altar'             // Altar — impassable
  | 'rug'               // Decorative rug — walkable
  | 'counter'           // Shop counter — impassable, lesser cover
  | 'bed'               // Bed — difficult terrain
  | 'firepit'           // Fire pit — hazard + light
  | 'log'               // Fallen log — difficult terrain, lesser cover
  | 'mushroom'          // Large mushroom — passable, decoration
  | 'tombstone'         // Tombstone — impassable
  // Advanced structural / decorative
  | 'window'            // Window in wall — impassable, doesn't block LoS
  | 'trap'              // Hidden trap — passable, hazard
  | 'chandelier'        // Overhead chandelier marker — passable, decoration
  | 'shelf'             // Storage shelf — impassable, lesser cover
  | 'weapon-rack'       // Weapon display rack — impassable
  | 'painting'          // Wall painting/tapestry — impassable, blocks LoS
  | 'candelabra'        // Standing candelabra — passable, decoration
  | 'archway'           // Stone archway — passable, doesn't block LoS
  | 'drain'             // Floor drain grate — passable, decoration
  | 'moss-stone'        // Mossy stone — walkable variant
  // Interactive / mechanical
  | 'torch'             // Wall torch / sconce — impassable, light source
  | 'portcullis'        // Iron gate — impassable until lever activated
  | 'lever'             // Wall lever / switch — passable, interactive
  | 'secret-door'       // Looks like wall until discovered — impassable
  | 'trapdoor'          // Floor hatch — passable, fall hazard
  | 'throne'            // Ornate throne seat — impassable
  | 'banner'            // Wall banner / tapestry — impassable, blocks LoS but not projectiles
  | 'minecart-track'    // Rail track — passable, decoration
  // Multi-tile object overhangs (passable visual extensions of impassable objects)
  | 'barrel-top'        // Top/lid overhang of a barrel — passable overlay
  | 'barrel-cluster-nw' // 3-barrel cluster — NW quadrant (impassable)
  | 'barrel-cluster-ne' // 3-barrel cluster — NE quadrant (passable overhang)
  | 'barrel-cluster-sw' // 3-barrel cluster — SW quadrant (impassable)
  | 'barrel-cluster-se' // 3-barrel cluster — SE quadrant (passable overhang)
  | 'tree-canopy'       // Tree canopy overhang — passable, blocks projectiles
  | 'ladder-mid'        // Ladder middle section — passable
  | 'ladder-top'        // Ladder top section — passable
  | 'void';             // Outside the map — always invisible

/** How the tile behaves for game mechanics */
export interface TileMechanics {
  passable: boolean;
  movementCost: number;     // 1 = normal, 2 = difficult, Infinity = impassable
  blocksLoS: boolean;       // Blocks line of sight
  blocksProjectiles: boolean;
  provideCover: 'none' | 'lesser' | 'standard' | 'greater';
  hazardDamage?: number;    // Damage per turn standing on this tile
  hazardType?: string;      // e.g., 'fire', 'acid'
  destructible?: boolean;   // Can be destroyed by attacks
  hardness?: number;        // HP of the tile if destructible (default 20 for walls)
  destroyedTile?: TileType; // What tile replaces it when destroyed (default 'floor')
}

/** Look up tile mechanics from tile type */
export const TILE_MECHANICS: Record<TileType, TileMechanics> = {
  'wall':           { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'none', destructible: true, hardness: 30, destroyedTile: 'rubble' },
  'floor':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'floor-alt':      { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'corridor':       { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'door':           { passable: true,  movementCost: 1,        blocksLoS: true,  blocksProjectiles: true,  provideCover: 'standard', destructible: true, hardness: 15, destroyedTile: 'floor' },
  'door-open':      { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'dirt':           { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'grass':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'grass-tall':     { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'stone':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'sand':           { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'snow':           { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'mud':            { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'cobblestone':    { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'planks':         { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'water-shallow':  { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'water-deep':     { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'lava':           { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'none', hazardDamage: 20, hazardType: 'fire' },
  'pit':            { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'ice':            { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none', hazardType: 'slippery' },
  'rubble':         { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'stairs-up':      { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'stairs-down':    { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'chest':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'pillar':         { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'standard' },
  'tree':           { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'standard', destructible: true, hardness: 25, destroyedTile: 'rubble' },
  'bush':           { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'rock':           { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'standard' },
  'bridge':         { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'carpet':         { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  // Furniture & Props
  'barrel':         { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser', destructible: true, hardness: 8, destroyedTile: 'floor' },
  'crate':          { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser', destructible: true, hardness: 8, destroyedTile: 'floor' },
  'table':          { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'chair':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'bookshelf':      { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'standard', destructible: true, hardness: 12, destroyedTile: 'floor' },
  'fountain':       { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'well':           { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'anvil':          { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'hay':            { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'fence':          { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser', destructible: true, hardness: 10, destroyedTile: 'floor' },
  'fence-gate':     { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'lamp-post':      { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'statue':         { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'standard' },
  'altar':          { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'rug':            { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'counter':        { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'bed':            { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'firepit':        { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none', hazardDamage: 5, hazardType: 'fire' },
  'log':            { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'mushroom':       { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'tombstone':      { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  // Advanced structural / decorative
  'window':         { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'trap':           { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none', hazardDamage: 2, hazardType: 'piercing' },
  'chandelier':     { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'shelf':          { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'weapon-rack':    { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'painting':       { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'none' },
  'candelabra':     { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'archway':        { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'drain':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'moss-stone':     { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  // Interactive / mechanical
  'torch':          { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'portcullis':     { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: true,  provideCover: 'lesser', destructible: true, hardness: 25, destroyedTile: 'floor' },
  'lever':          { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'secret-door':    { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'none' },
  'trapdoor':       { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none', hazardDamage: 10, hazardType: 'bludgeoning' },
  'throne':         { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'banner':         { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: false, provideCover: 'lesser' },
  'minecart-track': { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  // Multi-tile object overhangs
  'barrel-top':        { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'barrel-cluster-nw': { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser', destructible: true, hardness: 8, destroyedTile: 'floor' },
  'barrel-cluster-ne': { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'barrel-cluster-sw': { passable: false, movementCost: Infinity, blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser', destructible: true, hardness: 8, destroyedTile: 'floor' },
  'barrel-cluster-se': { passable: true,  movementCost: 2,        blocksLoS: false, blocksProjectiles: false, provideCover: 'lesser' },
  'tree-canopy':       { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: true,  provideCover: 'lesser' },
  'ladder-mid':        { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'ladder-top':        { passable: true,  movementCost: 1,        blocksLoS: false, blocksProjectiles: false, provideCover: 'none' },
  'void':           { passable: false, movementCost: Infinity, blocksLoS: true,  blocksProjectiles: true,  provideCover: 'none' },
};

// ─── Procedural Map Data ────────────────────────────────────

/**
 * An atlas-sourced sprite overlay drawn on top of the base tile grid.
 * The base TileType controls game mechanics (passable, cover, etc.)
 * while overlays provide rich atlas-sourced visuals for multi-tile objects.
 */
export interface AtlasOverlay {
  x: number;         // grid X position
  y: number;         // grid Y position
  atlas: string;     // atlas image name (e.g. 'terrain', 'base')
  col: number;       // source column in the atlas
  row: number;       // source row in the atlas
  scale?: number;    // render scale (default 0.5 = half linear = quarter area)
  /** Horizontal offset within cell (0-1). 0=left, 0.5=right half. */
  offsetX?: number;
  /** Vertical offset within cell (0-1). 0=top, 0.5=bottom half. */
  offsetY?: number;
}

/** The output of a procedural map generator */
export interface ProceduralMap {
  width: number;
  height: number;
  tiles: TileType[][];            // tiles[y][x]
  overlays?: AtlasOverlay[];      // atlas sprite overlays drawn on top of base tiles
  moveCostOverride?: (number | null)[][];  // per-cell movement cost override (null = use tile default)
  elevation?: number[][];         // elevation[y][x] — 0=ground, 1=raised, -1=lowered, etc.
  wallHP?: number[][];            // wallHP[y][x] — hit points for destructible walls (0 = destroyed)
  rooms: Room[];                  // List of carved rooms
  corridors: Corridor[];          // List of connecting corridors
  startingZones: {
    players: Position[];
    enemies: Position[];
  };
  features: MapFeature[];         // Game-meaningful features
  theme: MapTheme;
  subTheme: string;
  name: string;
  description: string;
}

export interface Room {
  id: number;
  x: number;          // top-left corner
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  type: 'normal' | 'entrance' | 'boss' | 'treasure' | 'trap' | 'shrine' | 'kitchen';
}

export interface Corridor {
  from: number;   // room ID
  to: number;     // room ID
  path: Position[];
}

// ─── Random Utility ─────────────────────────────────────────

/** Simple seedable PRNG (xoshiro128**) for deterministic generation */
export class SeededRandom {
  private s: number[];

  constructor(seed: number) {
    // Initialize state from seed using splitmix32
    let s = seed | 0;
    const next = () => {
      s = (s + 0x9e3779b9) | 0;
      let t = s ^ (s >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      t = t ^ (t >>> 15);
      return t >>> 0;
    };
    this.s = [next(), next(), next(), next()];
  }

  /** Returns a float in [0, 1) */
  next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return (result >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns true with the given probability (0-1) */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Shuffle an array in place */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ─── Grid Helpers ───────────────────────────────────────────

function createGrid(width: number, height: number, fill: TileType): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = fill;
    }
  }
  return grid;
}

function isPassableTile(tile: TileType): boolean {
  return TILE_MECHANICS[tile]?.passable ?? false;
}

function normalizeWeirdPlacements(tiles: TileType[][]): void {
  if (!tiles || tiles.length === 0 || tiles[0].length === 0) return;
  const height = tiles.length;
  const width = tiles[0].length;
  const original = tiles.map(row => [...row]);
  const adjacent = (x: number, y: number): TileType[] => [
    original[y - 1]?.[x],
    original[y + 1]?.[x],
    original[y]?.[x - 1],
    original[y]?.[x + 1],
  ].filter(Boolean) as TileType[];
  const replacementFor = (x: number, y: number): TileType => {
    const neighbors = adjacent(x, y);
    return neighbors.includes('corridor') ? 'corridor' : 'floor';
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tile = original[y][x];

      if (tile === 'door') {
        const northPass = isPassableTile(original[y - 1][x]);
        const southPass = isPassableTile(original[y + 1][x]);
        const eastPass = isPassableTile(original[y][x + 1]);
        const westPass = isPassableTile(original[y][x - 1]);

        const validVerticalDoor = northPass && southPass && !eastPass && !westPass;
        const validHorizontalDoor = eastPass && westPass && !northPass && !southPass;

        if (!validVerticalDoor && !validHorizontalDoor) {
          tiles[y][x] = replacementFor(x, y);
        }
        continue;
      }

      if (tile === 'barrel' || tile === 'crate') {
        const neighbors = adjacent(x, y);
        const hasAdjacentDoor = neighbors.includes('door') || neighbors.includes('door-open');
        const passableNeighbors = neighbors.filter(isPassableTile).length;
        const blockedNeighbors = neighbors.length - passableNeighbors;

        // Only remove if completely floating (no walls at all) or blocking a doorway
        const floatingPlacement = blockedNeighbors === 0;

        if (hasAdjacentDoor || floatingPlacement) {
          tiles[y][x] = replacementFor(x, y);
        }
      }
    }
  }
}

/**
 * Post-process: place multi-tile overhangs for objects that span multiple
 * grid squares in the atlas.  A barrel's top/lid extends into the cell
 * above — that cell should remain passable but render the atlas overhang.
 *
 * Rules:
 *  barrel  → place 'barrel-top' one cell north (if that cell is floor-like)
 *
 * Called after fixSpuriousPlacements so barrel placement is already validated.
 */
function placeMultiTileOverhangs(tiles: TileType[][], width: number, height: number): void {
  const FLOOR_TYPES = new Set<TileType>([
    'floor', 'floor-alt', 'corridor', 'dirt', 'grass', 'grass-tall',
    'stone', 'sand', 'snow', 'cobblestone', 'planks', 'mud',
    'hay', 'carpet', 'rug', 'moss-stone', 'ice',
  ]);

  // Work on a snapshot so we don't double-process
  const snapshot: TileType[][] = tiles.map(row => [...row]);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = snapshot[y][x];

      // Barrel → place barrel-top one cell north (only on plain floor tiles)
      if (tile === 'barrel') {
        const ny = y - 1;
        if (ny >= 0 && FLOOR_TYPES.has(snapshot[ny][x]) &&
            snapshot[ny][x] !== 'door' && snapshot[ny][x] !== 'door-open') {
          tiles[ny][x] = 'barrel-top';
        }
      }
    }
  }
}

/**
 * Generate an elevation map based on tile types.
 * stairs = +1, pit/water = -1, wall = 0, bridge = 1 (above gaps), trapdoor = -1
 * Some tiles inherit elevation from context.
 */
function generateElevation(tiles: TileType[][], width: number, height: number): number[][] {
  const elevation: number[][] = [];
  for (let y = 0; y < height; y++) {
    elevation[y] = [];
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x];
      switch (tile) {
        case 'stairs-up': case 'stairs-down': elevation[y][x] = 1; break;
        case 'pit': elevation[y][x] = -2; break;
        case 'water-shallow': case 'water-deep': elevation[y][x] = -1; break;
        case 'lava': elevation[y][x] = -1; break;
        case 'trapdoor': elevation[y][x] = -1; break;
        case 'throne': elevation[y][x] = 1; break; // Raised dais
        case 'altar': elevation[y][x] = 1; break;  // Raised platform
        default: elevation[y][x] = 0; break;
      }
    }
  }
  return elevation;
}

function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function countNeighbors(grid: TileType[][], x: number, y: number, type: TileType): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, grid[0].length, grid.length)) {
        count++; // Off-grid counts as wall
      } else if (grid[ny][nx] === type) {
        count++;
      }
    }
  }
  return count;
}

// ─── Connectivity Validation ────────────────────────────────

/**
 * Flood-fill from a starting point, returning all reachable passable positions.
 */
function floodFill(grid: TileType[][], sx: number, sy: number): Set<string> {
  const w = grid[0].length, h = grid.length;
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
  visited.add(`${sx},${sy}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny, w, h) || visited.has(key)) continue;
      const tile = grid[ny][nx];
      const mech = TILE_MECHANICS[tile];
      if (mech && mech.passable) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return visited;
}

/**
 * Ensure all rooms are connected by carving emergency corridors if needed.
 * After generation, flood-fill from the first passable tile, then connect
 * any unreachable passable regions.
 */
function ensureConnectivity(grid: TileType[][], rooms: Room[], rng: SeededRandom): void {
  const w = grid[0].length, h = grid.length;

  // Find the first passable tile
  let startX = -1, startY = -1;
  for (let y = 0; y < h && startX < 0; y++) {
    for (let x = 0; x < w; x++) {
      if (TILE_MECHANICS[grid[y][x]]?.passable) {
        startX = x; startY = y; break;
      }
    }
  }
  if (startX < 0) return; // No passable tiles

  const reachable = floodFill(grid, startX, startY);

  // Check each room's center — if unreachable, carve a corridor to the nearest reachable tile
  for (const room of rooms) {
    const key = `${room.centerX},${room.centerY}`;
    if (reachable.has(key)) continue;

    // Find nearest reachable tile (using BFS from room center)
    let targetX = startX, targetY = startY;
    let bestDist = Infinity;
    for (const rk of reachable) {
      const [rx, ry] = rk.split(',').map(Number);
      const dist = Math.abs(rx - room.centerX) + Math.abs(ry - room.centerY);
      if (dist < bestDist) {
        bestDist = dist; targetX = rx; targetY = ry;
      }
    }

    // Carve L-shaped corridor from room center to target
    let cx = room.centerX, cy = room.centerY;
    // Horizontal first
    while (cx !== targetX) {
      if (inBounds(cx, cy, w, h) && !TILE_MECHANICS[grid[cy][cx]]?.passable) {
        grid[cy][cx] = 'corridor';
      }
      cx += cx < targetX ? 1 : -1;
    }
    // Then vertical
    while (cy !== targetY) {
      if (inBounds(cx, cy, w, h) && !TILE_MECHANICS[grid[cy][cx]]?.passable) {
        grid[cy][cx] = 'corridor';
      }
      cy += cy < targetY ? 1 : -1;
    }

    // Re-flood to include the newly connected area
    const newReachable = floodFill(grid, startX, startY);
    for (const k of newReachable) reachable.add(k);
  }
}

// ─── Room Shapes ────────────────────────────────────────────

/**
 * Carve a circular room into the grid.
 */
function carveCircularRoom(grid: TileType[][], cx: number, cy: number, radius: number): void {
  const w = grid[0].length, h = grid.length;
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (!inBounds(x, y, w, h)) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        grid[y][x] = 'floor';
      }
    }
  }
}

/**
 * Carve an L-shaped room into the grid.
 */
function carveLShapedRoom(grid: TileType[][], room: Room, rng: SeededRandom): void {
  const w = grid[0].length, h = grid.length;
  // Full rectangle first
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (inBounds(x, y, w, h)) grid[y][x] = 'floor';
    }
  }
  // Remove one quadrant (random corner)
  const halfW = Math.floor(room.width / 2);
  const halfH = Math.floor(room.height / 2);
  const corner = rng.int(0, 3);
  let cutX: number, cutY: number;
  switch (corner) {
    case 0: cutX = room.x; cutY = room.y; break;
    case 1: cutX = room.x + halfW; cutY = room.y; break;
    case 2: cutX = room.x; cutY = room.y + halfH; break;
    default: cutX = room.x + halfW; cutY = room.y + halfH; break;
  }
  for (let y = cutY; y < cutY + halfH; y++) {
    for (let x = cutX; x < cutX + halfW; x++) {
      if (inBounds(x, y, w, h)) grid[y][x] = 'wall';
    }
  }
}

/**
 * Carve a cross-shaped room into the grid.
 */
function carveCrossRoom(grid: TileType[][], room: Room): void {
  const w = grid[0].length, h = grid.length;
  const armW = Math.max(2, Math.floor(room.width / 3));
  const armH = Math.max(2, Math.floor(room.height / 3));

  // Horizontal bar
  for (let y = room.y + armH; y < room.y + room.height - armH; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (inBounds(x, y, w, h)) grid[y][x] = 'floor';
    }
  }
  // Vertical bar
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x + armW; x < room.x + room.width - armW; x++) {
      if (inBounds(x, y, w, h)) grid[y][x] = 'floor';
    }
  }
}

/**
 * Mirror the left half of the grid to the right half for symmetrical rooms.
 * Mirrors within the given bounds (inclusive of x1/y1, exclusive of x2/y2).
 */
function mirrorGridHorizontal(grid: TileType[][], x1: number, y1: number, x2: number, y2: number): void {
  const midX = Math.floor((x1 + x2) / 2);
  for (let y = y1; y < y2; y++) {
    for (let dx = 0; dx <= midX - x1; dx++) {
      const leftX = x1 + dx;
      const rightX = x2 - 1 - dx;
      if (leftX < grid[0].length && rightX < grid[0].length && rightX >= 0 && y < grid.length) {
        grid[y][rightX] = grid[y][leftX];
      }
    }
  }
}

/**
 * Mirror the top half of the grid to the bottom half for symmetrical rooms.
 */
function mirrorGridVertical(grid: TileType[][], x1: number, y1: number, x2: number, y2: number): void {
  const midY = Math.floor((y1 + y2) / 2);
  for (let y = 0; y <= midY - y1; y++) {
    const topY = y1 + y;
    const bottomY = y2 - 1 - y;
    if (topY < grid.length && bottomY < grid.length && bottomY >= 0) {
      for (let x = x1; x < x2; x++) {
        if (x < grid[0].length) {
          grid[bottomY][x] = grid[topY][x];
        }
      }
    }
  }
}

// ─── Structure Stamps ───────────────────────────────────────
// Pre-built tile patterns for recognizable structures.
// Legend: W=wall, .=floor, D=door, P=pillar, C=carpet, T=table, H=chair,
//   B=barrel, K=crate, b=bookshelf, F=fountain, w=well, A=altar, S=statue,
//   L=lamp-post, f=fence, G=fence-gate, R=rug, c=counter, d=bed,
//   p=planks, a=anvil, h=hay, s=cobblestone, e=firepit, l=log, m=mushroom,
//   t=tombstone, _=void (keep existing)
type StampTile = string;
interface StructureStamp {
  name: string;
  width: number;
  height: number;
  tiles: StampTile[][];
  /** Tile to place underneath furniture tiles (floor context) */
  baseTile?: TileType;
}

const STAMP_CHAR_MAP: Record<string, TileType> = {
  'W': 'wall', '.': 'floor', 'D': 'door', 'P': 'pillar', 'C': 'carpet',
  'T': 'table', 'H': 'chair', 'B': 'barrel', 'K': 'crate', 'b': 'bookshelf',
  'F': 'fountain', 'w': 'well', 'A': 'altar', 'S': 'statue', 'L': 'lamp-post',
  'f': 'fence', 'G': 'fence-gate', 'R': 'rug', 'c': 'counter', 'd': 'bed',
  'p': 'planks', 'a': 'anvil', 'h': 'hay', 's': 'cobblestone', 'e': 'firepit',
  'l': 'log', 'm': 'mushroom', 't': 'tombstone', 'X': 'floor-alt', 'r': 'rubble',
  'o': 'door-open', 'i': 'stairs-up', 'j': 'stairs-down', 'x': 'chest',
  'q': 'water-shallow', 'Q': 'water-deep', 'g': 'grass', 'n': 'dirt',
  'v': 'bridge', 'u': 'corridor', '_': 'void', ' ': 'void',
  'y': 'window', 'z': 'trap', 'Y': 'chandelier', 'Z': 'shelf',
  'E': 'weapon-rack', 'I': 'painting', 'J': 'candelabra', 'N': 'archway',
  'O': 'drain', 'M': 'moss-stone',
  // Interactive / mechanical
  '1': 'torch', '2': 'portcullis', '3': 'lever', '4': 'secret-door',
  '5': 'trapdoor', '6': 'throne', '7': 'banner', '8': 'minecart-track',
  // Multi-tile object overhangs (stamp-only)
  '~': 'barrel-top', '^': 'tree-canopy', '@': 'ladder-mid', '#': 'ladder-top',
};

function parseStamp(lines: string[]): StampTile[][] {
  return lines.map(line => line.split(''));
}

/** Place a stamp at (ox, oy) on the grid, skipping void/'_' chars */
function placeStamp(grid: TileType[][], stamp: StructureStamp, ox: number, oy: number): void {
  const w = grid[0].length;
  const h = grid.length;
  for (let sy = 0; sy < stamp.height; sy++) {
    for (let sx = 0; sx < stamp.width; sx++) {
      const gx = ox + sx;
      const gy = oy + sy;
      if (!inBounds(gx, gy, w, h)) continue;
      const ch = stamp.tiles[sy]?.[sx] || '_';
      if (ch === '_' || ch === ' ') continue; // skip void — keep existing tile
      const tile = STAMP_CHAR_MAP[ch];
      if (tile) grid[gy][gx] = tile;
    }
  }
}

// ── Town Hall Stamp (11x9) ──────────────────────────────────
const TOWN_HALL_STAMP: StructureStamp = {
  name: 'Town Hall',
  width: 11,
  height: 9,
  tiles: parseStamp([
    'WWWWDWWWWWW',
    'W.P.C.C.P.W',
    'W..CCCCC..W',
    'W..CCCCC..W',
    'WP.C.S.C.PW',
    'W..CCCCC..W',
    'W.P.....P.W',
    'W.........W',
    'WWWWWDWWWWW',
  ]),
};

// ── Tavern Interior Stamp (10x8) ────────────────────────────
const TAVERN_STAMP: StructureStamp = {
  name: 'Tavern',
  width: 10,
  height: 8,
  tiles: parseStamp([
    'WWWWDWWWWW',
    'Wcccc....W',
    'W....THTW',  // Deliberately short — padded
    'W.TH.TH.W',
    'W.TH....W',
    'W....BB.W',
    'W..e....W',
    'WWWWWWWWWW',
  ]),
};

// ── Blacksmith Stamp (7x6) ──────────────────────────────────
const BLACKSMITH_STAMP: StructureStamp = {
  name: 'Blacksmith',
  width: 7,
  height: 6,
  tiles: parseStamp([
    'WWWDWWW',
    'W.a..BW',
    'W.....W',
    'We..K.W',
    'W..B..W',
    'WWWWWWW',
  ]),
};

// ── Well (3x3) ──────────────────────────────────────────────
const WELL_STAMP: StructureStamp = {
  name: 'Well',
  width: 3,
  height: 3,
  tiles: parseStamp([
    'sss',
    'sws',
    'sss',
  ]),
};

// ── Warehouse (8x6) ────────────────────────────────────────
const WAREHOUSE_STAMP: StructureStamp = {
  name: 'Warehouse',
  width: 8,
  height: 6,
  tiles: parseStamp([
    'WWWWWWWW',
    'WKKK.BBW',
    'W......W',
    'WBB.KKKW',
    'W......D',
    'WWWWWWWW',
  ]),
};

// ── Market Stall with awning (4x3) ─────────────────────────
const MARKET_STALL_STAMP: StructureStamp = {
  name: 'Market Stall',
  width: 4,
  height: 3,
  tiles: parseStamp([
    'fccf',
    '.cc.',
    '....', 
  ]),
};

// ── Dock Crane (3x4) ───────────────────────────────────────
const DOCK_CRANE_STAMP: StructureStamp = {
  name: 'Crane',
  width: 3,
  height: 4,
  tiles: parseStamp([
    '_P_',
    '_p_',
    '_p_',
    'KpK',
  ]),
};

// ── Temple Altar Room (7x5) ────────────────────────────────
const TEMPLE_ALTAR_STAMP: StructureStamp = {
  name: 'Temple Altar',
  width: 7,
  height: 5,
  tiles: parseStamp([
    'P.CCC.P',
    '.CCCCC.',
    '.CC.CC.',
    '.CACAC.',
    'P.CCC.P',
  ]),
};

// ── Library Reading Room (7x5) ──────────────────────────────
const LIBRARY_STAMP: StructureStamp = {
  name: 'Library',
  width: 7,
  height: 5,
  tiles: parseStamp([
    'bbb.bbb',
    '..T.T..',
    '.HT.TH.',
    '..T.T..',
    'bbb.bbb',
  ]),
};

// ── Campsite (7x7) ─────────────────────────────────────────
const CAMPSITE_STAMP: StructureStamp = {
  name: 'Campsite',
  width: 7,
  height: 7,
  tiles: parseStamp([
    '__lll__',
    '_l...l_',
    'l.....l',
    'l..e..l',
    'l.....l',
    '_l.h.l_',
    '__lll__',
  ]),
};

// ── Graveyard Plot (6x4) ───────────────────────────────────
const GRAVEYARD_STAMP: StructureStamp = {
  name: 'Graveyard',
  width: 6,
  height: 4,
  tiles: parseStamp([
    'g.t.t.',
    '......',
    '.t.t.g',
    '......',
  ]),
};

// ─── Wilderness Atlas Stamps ────────────────────────────────
// Multi-tile objects from approved atlas tiles, placed in wilderness maps.
// Each stamp defines base TileTypes (for game mechanics) and atlas overlays
// (for pixel-art visuals drawn on top of the terrain).

interface WildernessAtlasStamp {
  name: string;
  width: number;   // grid cells wide
  height: number;  // grid cells tall
  /** Base tile override per cell.  null = keep existing terrain. */
  baseTiles: (TileType | null)[][];      // [row][col]
  /** Atlas overlay sprites per cell. */
  overlays: { dx: number; dy: number; atlas: string; col: number; row: number; scale?: number }[];
  /** Sub-themes this stamp is suitable for (undefined = all wilderness) */
  subThemes?: string[];
}

/** Place a wilderness atlas stamp at (ox, oy), returning generated overlays. */
function placeWildernessStamp(
  grid: TileType[][],
  stamp: WildernessAtlasStamp,
  ox: number,
  oy: number,
  w: number,
  h: number,
  rng?: SeededRandom,
): AtlasOverlay[] {
  const result: AtlasOverlay[] = [];
  // Apply base tile overrides
  for (let sy = 0; sy < stamp.height; sy++) {
    for (let sx = 0; sx < stamp.width; sx++) {
      const gx = ox + sx;
      const gy = oy + sy;
      if (!inBounds(gx, gy, w, h)) continue;
      const base = stamp.baseTiles[sy]?.[sx];
      if (base) grid[gy][gx] = base;
    }
  }

  // For stamps whose overlays fit within a quarter of their footprint,
  // randomise the sub-cell position so small objects don't always sit
  // in the top-left corner.
  let jitterX = 0;
  let jitterY = 0;
  if (rng && stamp.width === 1 && stamp.height === 1) {
    let maxExtX = 0;
    let maxExtY = 0;
    for (const ov of stamp.overlays) {
      const s = ov.scale ?? 1;
      maxExtX = Math.max(maxExtX, ov.dx + s);
      maxExtY = Math.max(maxExtY, ov.dy + s);
    }
    if (maxExtX <= 0.5) jitterX = rng.chance(0.5) ? 0.5 : 0;
    if (maxExtY <= 0.5) jitterY = rng.chance(0.5) ? 0.5 : 0;
  }

  // Collect atlas overlays
  for (const ov of stamp.overlays) {
    const gx = ox + ov.dx + jitterX;
    const gy = oy + ov.dy + jitterY;
    if (inBounds(gx, gy, w, h)) {
      const entry: AtlasOverlay = { x: gx, y: gy, atlas: ov.atlas, col: ov.col, row: ov.row };
      // Stamps default to full-cell rendering (scale=1) — they are designed
      // to cover entire grid cells, unlike zone subtile overlays (scale=0.5).
      entry.scale = ov.scale ?? 1;
      result.push(entry);
    }
  }
  return result;
}

// ── Large Rock Formation (2×2) — "Light Large Rock" from terrain atlas ──
const WILDERNESS_LARGE_ROCK: WildernessAtlasStamp = {
  name: 'Large Rock',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 26, row: 21, scale: 0.5 },  // NW
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 27, row: 21, scale: 0.5 },  // NE
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 26, row: 22, scale: 0.5 },  // SW
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 27, row: 22, scale: 0.5 },  // SE
  ],
};

// ── Large Tree Stump (2×2) from terrain atlas ──
const WILDERNESS_TREE_STUMP_LARGE: WildernessAtlasStamp = {
  name: 'Large Tree Stump',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 12, row: 12, scale: 0.5 },  // NW
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 13, row: 12, scale: 0.5 },  // NE
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 12, row: 13, scale: 0.5 },  // SW
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 13, row: 13, scale: 0.5 },  // SE
  ],
};

// ── Small Tree Stump (1×1) from terrain atlas ──
const WILDERNESS_TREE_STUMP_SMALL: WildernessAtlasStamp = {
  name: 'Small Tree Stump',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 23, row: 18, scale: 0.5 }],
};

// ── Bush Cluster 1 (3×3) from terrain atlas ──
const WILDERNESS_BUSH_CLUSTER_1: WildernessAtlasStamp = {
  name: 'Bush Cluster 1',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 24, row: 12, scale: 1/3 },  // NW
    { dx: 1/3, dy: 0,   atlas: 'terrain', col: 25, row: 12, scale: 1/3 },  // N
    { dx: 2/3, dy: 0,   atlas: 'terrain', col: 26, row: 12, scale: 1/3 },  // NE
    { dx: 0,   dy: 1/3, atlas: 'terrain', col: 24, row: 13, scale: 1/3 },  // W
    { dx: 1/3, dy: 1/3, atlas: 'terrain', col: 25, row: 13, scale: 1/3 },  // C
    { dx: 2/3, dy: 1/3, atlas: 'terrain', col: 26, row: 13, scale: 1/3 },  // E
    { dx: 0,   dy: 2/3, atlas: 'terrain', col: 24, row: 14, scale: 1/3 },  // SW
    { dx: 1/3, dy: 2/3, atlas: 'terrain', col: 25, row: 14, scale: 1/3 },  // S
    { dx: 2/3, dy: 2/3, atlas: 'terrain', col: 26, row: 14, scale: 1/3 },  // SE
  ],
};

// ── Bush Cluster 2 (3×3) from terrain atlas ──
const WILDERNESS_BUSH_CLUSTER_2: WildernessAtlasStamp = {
  name: 'Bush Cluster 2',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 27, row: 12, scale: 1/3 },
    { dx: 1/3, dy: 0,   atlas: 'terrain', col: 28, row: 12, scale: 1/3 },
    { dx: 2/3, dy: 0,   atlas: 'terrain', col: 29, row: 12, scale: 1/3 },
    { dx: 0,   dy: 1/3, atlas: 'terrain', col: 27, row: 13, scale: 1/3 },
    { dx: 1/3, dy: 1/3, atlas: 'terrain', col: 28, row: 13, scale: 1/3 },
    { dx: 2/3, dy: 1/3, atlas: 'terrain', col: 29, row: 13, scale: 1/3 },
    { dx: 0,   dy: 2/3, atlas: 'terrain', col: 27, row: 14, scale: 1/3 },
    { dx: 1/3, dy: 2/3, atlas: 'terrain', col: 28, row: 14, scale: 1/3 },
    { dx: 2/3, dy: 2/3, atlas: 'terrain', col: 29, row: 14, scale: 1/3 },
  ],
};

// ── Dark Tree Canopy 1 (3×3) — packed at half size into 2×2 footprint with Tree Base1 ──
const WILDERNESS_DARK_TREE_1: WildernessAtlasStamp = {
  name: 'Dark Tree 1',
  width: 2, height: 2,
  baseTiles: [
    ['grass', 'grass'],
    ['grass', 'grass'],
  ],
  overlays: [
    // Tree Base1 (3×2 at half size) — below canopy so trunk is visible
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 25, row: 19, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 26, row: 19, scale: 0.5 },
    { dx: 1.0, dy: 1.0, atlas: 'terrain', col: 27, row: 19, scale: 0.5 },
    { dx: 0,   dy: 1.5, atlas: 'terrain', col: 25, row: 20, scale: 0.5 },
    { dx: 0.5, dy: 1.5, atlas: 'terrain', col: 26, row: 20, scale: 0.5 },
    { dx: 1.0, dy: 1.5, atlas: 'terrain', col: 27, row: 20, scale: 0.5 },
    // Dark canopy (3×3 at half size)
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 24, row: 15, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 25, row: 15, scale: 0.5 },
    { dx: 1.0, dy: 0,   atlas: 'terrain', col: 26, row: 15, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 24, row: 16, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 25, row: 16, scale: 0.5 },
    { dx: 1.0, dy: 0.5, atlas: 'terrain', col: 26, row: 16, scale: 0.5 },
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 24, row: 17, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 25, row: 17, scale: 0.5 },
    { dx: 1.0, dy: 1.0, atlas: 'terrain', col: 26, row: 17, scale: 0.5 },
  ],
};

// ── Dark Tree Canopy 2 (3×4) — packed at half size into 2×2 footprint with Tree Base2 ──
const WILDERNESS_DARK_TREE_2: WildernessAtlasStamp = {
  name: 'Dark Tree 2',
  width: 2, height: 2,
  baseTiles: [
    ['grass', 'grass'],
    ['grass', 'grass'],
  ],
  overlays: [
    // Tree Base2 (3×2 at half size) — below canopy so trunk is visible
    { dx: 0,   dy: 1.5, atlas: 'terrain', col: 28, row: 19, scale: 0.5 },
    { dx: 0.5, dy: 1.5, atlas: 'terrain', col: 29, row: 19, scale: 0.5 },
    { dx: 1.0, dy: 1.5, atlas: 'terrain', col: 30, row: 19, scale: 0.5 },
    { dx: 0,   dy: 2.0, atlas: 'terrain', col: 28, row: 20, scale: 0.5 },
    { dx: 0.5, dy: 2.0, atlas: 'terrain', col: 29, row: 20, scale: 0.5 },
    { dx: 1.0, dy: 2.0, atlas: 'terrain', col: 30, row: 20, scale: 0.5 },
    // Dark canopy (3×4 at half size)
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 27, row: 15, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 28, row: 15, scale: 0.5 },
    { dx: 1.0, dy: 0,   atlas: 'terrain', col: 29, row: 15, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 27, row: 16, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 28, row: 16, scale: 0.5 },
    { dx: 1.0, dy: 0.5, atlas: 'terrain', col: 29, row: 16, scale: 0.5 },
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 27, row: 17, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 28, row: 17, scale: 0.5 },
    { dx: 1.0, dy: 1.0, atlas: 'terrain', col: 29, row: 17, scale: 0.5 },
    { dx: 0,   dy: 1.5, atlas: 'terrain', col: 27, row: 18, scale: 0.5 },
    { dx: 0.5, dy: 1.5, atlas: 'terrain', col: 28, row: 18, scale: 0.5 },
    { dx: 1.0, dy: 1.5, atlas: 'terrain', col: 29, row: 18, scale: 0.5 },
  ],
};

// ── Tree2 Large Tree (3×4) — packed at half size into 2×2 footprint (has built-in trunk) ──
const WILDERNESS_TREE2: WildernessAtlasStamp = {
  name: 'Tree2 Large',
  width: 2, height: 2,
  baseTiles: [
    ['grass', 'grass'],
    ['grass', 'grass'],
  ],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 29, row: 28, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 30, row: 28, scale: 0.5 },
    { dx: 1.0, dy: 0,   atlas: 'terrain', col: 31, row: 28, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 29, row: 29, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 30, row: 29, scale: 0.5 },
    { dx: 1.0, dy: 0.5, atlas: 'terrain', col: 31, row: 29, scale: 0.5 },
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 29, row: 30, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 30, row: 30, scale: 0.5 },
    { dx: 1.0, dy: 1.0, atlas: 'terrain', col: 31, row: 30, scale: 0.5 },
    { dx: 0,   dy: 1.5, atlas: 'terrain', col: 29, row: 31, scale: 0.5 },
    { dx: 0.5, dy: 1.5, atlas: 'terrain', col: 30, row: 31, scale: 0.5 },
    { dx: 1.0, dy: 1.5, atlas: 'terrain', col: 31, row: 31, scale: 0.5 },
  ],
};

// ── Tree1 (2×3) — packed at half size into 1×2 footprint (has built-in trunk) ──
const WILDERNESS_TREE1: WildernessAtlasStamp = {
  name: 'Tree1',
  width: 1, height: 2,
  baseTiles: [
    ['grass'],
    ['grass'],
  ],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 27, row: 29, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 28, row: 29, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 27, row: 30, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 28, row: 30, scale: 0.5 },
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 27, row: 31, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 28, row: 31, scale: 0.5 },
  ],
};

// ── Stone Slab (1×1) — ruins sub-theme ──
const WILDERNESS_STONE_SLAB: WildernessAtlasStamp = {
  name: 'Stone Slab',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 14, row: 12, scale: 0.5 }],
  subThemes: ['ruins'],
};

// ── Column (1×2) — ruins sub-theme ──
const WILDERNESS_COLUMN: WildernessAtlasStamp = {
  name: 'Column',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0, dy: 0,   atlas: 'terrain', col: 14, row: 13, scale: 0.5 },
    { dx: 0, dy: 0.5, atlas: 'terrain', col: 14, row: 14, scale: 0.5 },
  ],
  subThemes: ['ruins'],
};

// ── Ruined Column with Plants (1×3) — ruins sub-theme ──
const WILDERNESS_RUINED_COLUMN: WildernessAtlasStamp = {
  name: 'Ruined Column',
  width: 1, height: 2,
  baseTiles: [[null], [null]],
  overlays: [
    { dx: 0, dy: 0,   atlas: 'terrain', col: 20, row: 12, scale: 0.5 },
    { dx: 0, dy: 0.5, atlas: 'terrain', col: 20, row: 13, scale: 0.5 },
    { dx: 0, dy: 1.0, atlas: 'terrain', col: 20, row: 14, scale: 0.5 },
  ],
  subThemes: ['ruins'],
};

// ── Rock Head Statue (2×3) — ruins sub-theme ──
const WILDERNESS_ROCK_HEAD: WildernessAtlasStamp = {
  name: 'Rock Head',
  width: 1, height: 2,
  baseTiles: [[null], [null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 15, row: 12, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 16, row: 12, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 15, row: 13, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 16, row: 13, scale: 0.5 },
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 15, row: 14, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 16, row: 14, scale: 0.5 },
  ],
  subThemes: ['ruins'],
};


// ── Small Dirt Patches (1×1) ──
const WILDERNESS_DIRT_PATCH_1: WildernessAtlasStamp = {
  name: 'Dirt Patch 1',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 3, row: 27, scale: 0.5 }],
};
const WILDERNESS_DIRT_PATCH_2: WildernessAtlasStamp = {
  name: 'Dirt Patch 2',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 3, row: 26, scale: 0.5 }],
};

// ── Small Grass Patches (1×1) ──
const WILDERNESS_GRASS_PATCH_1: WildernessAtlasStamp = {
  name: 'Grass Patch 1',
  width: 1, height: 1,
  baseTiles: [['grass-tall']],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 6, row: 25 }],
};
const WILDERNESS_GRASS_PATCH_2: WildernessAtlasStamp = {
  name: 'Grass Patch 2',
  width: 1, height: 1,
  baseTiles: [['grass-tall']],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 6, row: 24 }],
};

/** All wilderness stamps grouped for the generator to pick from. */
const WILDERNESS_STAMPS = {
  /** Large multi-tile trees */
  largeTrees: [WILDERNESS_DARK_TREE_1, WILDERNESS_DARK_TREE_2, WILDERNESS_TREE2, WILDERNESS_TREE1],
  /** Bush clusters */
  bushes: [WILDERNESS_BUSH_CLUSTER_1, WILDERNESS_BUSH_CLUSTER_2],
  /** Rock formations */
  rocks: [WILDERNESS_LARGE_ROCK, WILDERNESS_TREE_STUMP_LARGE],
  /** Small 1×1 accent objects */
  accents: [
    WILDERNESS_TREE_STUMP_SMALL,
    WILDERNESS_DIRT_PATCH_1, WILDERNESS_DIRT_PATCH_2,
    WILDERNESS_GRASS_PATCH_1, WILDERNESS_GRASS_PATCH_2,
  ],
  /** Ruins-only stamps */
  ruins: [
    WILDERNESS_STONE_SLAB, WILDERNESS_COLUMN,
    WILDERNESS_RUINED_COLUMN, WILDERNESS_ROCK_HEAD,
  ],
};

// ── Additional Wilderness Object Stamps ─────────────────────────────

const WILDERNESS_MUSHROOM: WildernessAtlasStamp = {
  name: 'Mushroom', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'terrain', col: 26, row: 31, scale: 0.5 }],
};

const WILDERNESS_CAVE_ENTRANCE_SMALL: WildernessAtlasStamp = {
  name: 'Cave Entrance (small)', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0, dy: 0,   atlas: 'terrain', col: 0, row: 5, scale: 0.5 },
    { dx: 0, dy: 0.5, atlas: 'terrain', col: 0, row: 6, scale: 0.5 },
  ],
};

const WILDERNESS_CAVE_ENTRANCE_LARGE: WildernessAtlasStamp = {
  name: 'Cave Entrance (large)', width: 1, height: 2,
  baseTiles: [[null], [null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 1, row: 5, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 1, row: 6, scale: 0.5 },
    { dx: 0,   dy: 1.0, atlas: 'terrain', col: 1, row: 7, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 2, row: 5, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 2, row: 6, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'terrain', col: 2, row: 7, scale: 0.5 },
  ],
};

const WILDERNESS_STATUE_CHALICE: WildernessAtlasStamp = {
  name: 'Statue Chalice', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0, dy: 0,   atlas: 'terrain', col: 17, row: 12, scale: 0.5 },
    { dx: 0, dy: 0.5, atlas: 'terrain', col: 17, row: 13, scale: 0.5 },
  ],
  subThemes: ['ruins', 'forest'],
};

const WILDERNESS_LARGE_ROCK_2: WildernessAtlasStamp = {
  name: 'Large Dirt Rock', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 28, row: 21, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 29, row: 21, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 28, row: 22, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 29, row: 22, scale: 0.5 },
  ],
};

// ── Big Rock 1 (2×2) — packed at half size into 1×1 ──
const WILDERNESS_BIG_ROCK_1: WildernessAtlasStamp = {
  name: 'Big Rock 1', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 27, row: 23, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 28, row: 23, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 27, row: 24, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 28, row: 24, scale: 0.5 },
  ],
};

// ── Big Rock 2 (2×2) — packed at half size into 1×1 ──
const WILDERNESS_BIG_ROCK_2: WildernessAtlasStamp = {
  name: 'Big Rock 2', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'terrain', col: 27, row: 26, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'terrain', col: 28, row: 26, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'terrain', col: 27, row: 27, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'terrain', col: 28, row: 27, scale: 0.5 },
  ],
};

const WILDERNESS_WELL: WildernessAtlasStamp = {
  name: 'Well', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [
    { dx: 0,   dy: 0,   atlas: 'lpc_exterior', col: 26, row: 14, scale: 0.5 },
    { dx: 0.5, dy: 0,   atlas: 'lpc_exterior', col: 27, row: 14, scale: 0.5 },
    { dx: 0,   dy: 0.5, atlas: 'lpc_exterior', col: 26, row: 15, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'lpc_exterior', col: 27, row: 15, scale: 0.5 },
  ],
  subThemes: ['forest', 'road', 'camp', 'clearing', 'ruins'],
};

const WILDERNESS_BOAT: WildernessAtlasStamp = {
  name: 'Boat', width: 3, height: 2,
  baseTiles: [
    ['water-shallow', 'water-shallow', 'water-shallow'],
    ['water-shallow', 'water-shallow', 'water-shallow'],
  ],
  overlays: [
    { dx: 0, dy: 0, atlas: 'lpc_exterior', col: 29, row: 27 },
    { dx: 1, dy: 0, atlas: 'lpc_exterior', col: 30, row: 27 },
    { dx: 2, dy: 0, atlas: 'lpc_exterior', col: 31, row: 27 },
    { dx: 0, dy: 1, atlas: 'lpc_exterior', col: 29, row: 28 },
    { dx: 1, dy: 1, atlas: 'lpc_exterior', col: 30, row: 28 },
    { dx: 2, dy: 1, atlas: 'lpc_exterior', col: 31, row: 28 },
  ],
  subThemes: ['lakeside'],
};

// ── Vertical bridge (front-on, walk north↔south) — center row repeats to extend ──
const WILDERNESS_WOODEN_BRIDGE_V: WildernessAtlasStamp = {
  name: 'Wooden Bridge (vertical)', width: 1, height: 3,
  baseTiles: [['bridge'], ['bridge'], ['bridge']],
  overlays: [
    { dx: 0, dy: 0, atlas: 'terrain', col: 14, row: 18 },  // N end
    { dx: 0, dy: 1, atlas: 'terrain', col: 14, row: 19 },  // C middle (repeatable)
    { dx: 0, dy: 2, atlas: 'terrain', col: 14, row: 20 },  // S end
  ],
};

// ── Horizontal bridge (sideways, walk west↔east) — center column repeats to extend ──
// Full 3-row bridge: top rail + walkway + bottom rail
const WILDERNESS_WOODEN_BRIDGE_H: WildernessAtlasStamp = {
  name: 'Wooden Bridge (horizontal)', width: 3, height: 3,
  baseTiles: [
    ['bridge', 'bridge', 'bridge'],
    ['bridge', 'bridge', 'bridge'],
    ['bridge', 'bridge', 'bridge'],
  ],
  overlays: [
    // West cap column
    { dx: 0, dy: 0, atlas: 'terrain', col: 16, row: 16 },  // NW
    { dx: 0, dy: 1, atlas: 'terrain', col: 16, row: 17 },  // W
    { dx: 0, dy: 2, atlas: 'terrain', col: 16, row: 18 },  // SW
    // Center column (repeatable — only top rail + walkway; no bottom rail tile in atlas)
    { dx: 1, dy: 0, atlas: 'terrain', col: 17, row: 16 },  // N
    { dx: 1, dy: 1, atlas: 'terrain', col: 17, row: 17 },  // C
    // East cap column
    { dx: 2, dy: 0, atlas: 'terrain', col: 18, row: 16 },  // NE
    { dx: 2, dy: 1, atlas: 'terrain', col: 18, row: 17 },  // E
    { dx: 2, dy: 2, atlas: 'terrain', col: 18, row: 18 },  // SE
  ],
};

const WILDERNESS_CHEST_ROUND: WildernessAtlasStamp = {
  name: 'Chest (Round)', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'base', col: 22, row: 17, scale: 0.5 }],
};

const WILDERNESS_CHEST_SQUARE: WildernessAtlasStamp = {
  name: 'Chest (Square)', width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'base', col: 21, row: 17, scale: 0.5 }],
};

// ── Tent (4×5) — packed at half size into 2×3 footprint ──
const WILDERNESS_TENT: WildernessAtlasStamp = {
  name: 'Tent',
  width: 2, height: 3,
  baseTiles: [
    [null, null],
    [null, null],
    [null, null],
  ],
  overlays: [
    // Row 0: cols 1-2 (top of tent, no col 0/3)
    { dx: 0.5, dy: 0,   atlas: 'lpc_outside_obj', col: 1, row: 22, scale: 0.5 },
    { dx: 1.0, dy: 0,   atlas: 'lpc_outside_obj', col: 2, row: 22, scale: 0.5 },
    // Row 1: cols 0-3
    { dx: 0,   dy: 0.5, atlas: 'lpc_outside_obj', col: 0, row: 23, scale: 0.5 },
    { dx: 0.5, dy: 0.5, atlas: 'lpc_outside_obj', col: 1, row: 23, scale: 0.5 },
    { dx: 1.0, dy: 0.5, atlas: 'lpc_outside_obj', col: 2, row: 23, scale: 0.5 },
    { dx: 1.5, dy: 0.5, atlas: 'lpc_outside_obj', col: 3, row: 23, scale: 0.5 },
    // Row 2: cols 0-3
    { dx: 0,   dy: 1.0, atlas: 'lpc_outside_obj', col: 0, row: 24, scale: 0.5 },
    { dx: 0.5, dy: 1.0, atlas: 'lpc_outside_obj', col: 1, row: 24, scale: 0.5 },
    { dx: 1.0, dy: 1.0, atlas: 'lpc_outside_obj', col: 2, row: 24, scale: 0.5 },
    { dx: 1.5, dy: 1.0, atlas: 'lpc_outside_obj', col: 3, row: 24, scale: 0.5 },
    // Row 3: cols 0-3
    { dx: 0,   dy: 1.5, atlas: 'lpc_outside_obj', col: 0, row: 25, scale: 0.5 },
    { dx: 0.5, dy: 1.5, atlas: 'lpc_outside_obj', col: 1, row: 25, scale: 0.5 },
    { dx: 1.0, dy: 1.5, atlas: 'lpc_outside_obj', col: 2, row: 25, scale: 0.5 },
    { dx: 1.5, dy: 1.5, atlas: 'lpc_outside_obj', col: 3, row: 25, scale: 0.5 },
    // Row 4: cols 0-3 (bottom)
    { dx: 0,   dy: 2.0, atlas: 'lpc_outside_obj', col: 0, row: 26, scale: 0.5 },
    { dx: 0.5, dy: 2.0, atlas: 'lpc_outside_obj', col: 1, row: 26, scale: 0.5 },
    { dx: 1.0, dy: 2.0, atlas: 'lpc_outside_obj', col: 2, row: 26, scale: 0.5 },
    { dx: 1.5, dy: 2.0, atlas: 'lpc_outside_obj', col: 3, row: 26, scale: 0.5 },
  ],
};

// ── Campfire (1×1 at half size) ──
const WILDERNESS_CAMPFIRE: WildernessAtlasStamp = {
  name: 'Campfire',
  width: 1, height: 1,
  baseTiles: [[null]],
  overlays: [{ dx: 0, dy: 0, atlas: 'lpc_interior', col: 31, row: 19, scale: 0.5 }],
};

// Updated grouping with all stamps
const ALL_WILDERNESS_STAMPS = {
  largeTrees: [WILDERNESS_DARK_TREE_1, WILDERNESS_DARK_TREE_2, WILDERNESS_TREE2, WILDERNESS_TREE1],
  bushes: [WILDERNESS_BUSH_CLUSTER_1, WILDERNESS_BUSH_CLUSTER_2],
  rocks: [WILDERNESS_LARGE_ROCK, WILDERNESS_LARGE_ROCK_2, WILDERNESS_BIG_ROCK_1, WILDERNESS_BIG_ROCK_2],
  accents: [
    WILDERNESS_TREE_STUMP_LARGE, WILDERNESS_TREE_STUMP_SMALL, WILDERNESS_MUSHROOM,
    WILDERNESS_DIRT_PATCH_1, WILDERNESS_DIRT_PATCH_2,
  ],
  ruins: [
    WILDERNESS_STONE_SLAB, WILDERNESS_COLUMN,
    WILDERNESS_RUINED_COLUMN, WILDERNESS_ROCK_HEAD,
    WILDERNESS_STATUE_CHALICE,
  ],
  structures: [WILDERNESS_WELL],
  campsite: [WILDERNESS_TENT, WILDERNESS_CAMPFIRE],
  chests: [WILDERNESS_CHEST_ROUND, WILDERNESS_CHEST_SQUARE],
  water: [WILDERNESS_BOAT],
  bridges: [WILDERNESS_WOODEN_BRIDGE_V, WILDERNESS_WOODEN_BRIDGE_H],
};

// ── Overlay Terrain Edge Set Definitions (from approved atlas metadata) ─────

interface OverlayEdgeSetDef {
  name: string;
  atlas: string;
  C:  { col: number; row: number };
  N:  { col: number; row: number };
  S:  { col: number; row: number };
  E:  { col: number; row: number };
  W:  { col: number; row: number };
  NE: { col: number; row: number };
  NW: { col: number; row: number };
  SE: { col: number; row: number };
  SW: { col: number; row: number };
  iNE?: { col: number; row: number };
  iNW?: { col: number; row: number };
  iSE?: { col: number; row: number };
  iSW?: { col: number; row: number };
  /** Alternate center variants for visual variety */
  centerVariants?: { col: number; row: number }[];
}

const OVERLAY_TALL_GRASS: OverlayEdgeSetDef = {
  name: 'Tall Grass', atlas: 'terrain',
  NW: { col: 0, row: 22 }, W: { col: 0, row: 23 }, SW: { col: 0, row: 24 },
  N:  { col: 1, row: 22 }, C: { col: 1, row: 23 }, S:  { col: 1, row: 24 },
  NE: { col: 2, row: 22 }, E: { col: 2, row: 23 }, SE: { col: 2, row: 24 },
  iSE: { col: 1, row: 20 }, iNE: { col: 1, row: 21 },
  iSW: { col: 2, row: 20 }, iNW: { col: 2, row: 21 },
};

const OVERLAY_TALL_WHEAT: OverlayEdgeSetDef = {
  name: 'Tall Wheat', atlas: 'terrain',
  NW: { col: 0, row: 28 }, W: { col: 0, row: 29 }, SW: { col: 0, row: 30 },
  N:  { col: 1, row: 28 }, C: { col: 1, row: 29 }, S:  { col: 1, row: 30 },
  NE: { col: 2, row: 28 }, E: { col: 2, row: 29 }, SE: { col: 2, row: 30 },
  iSE: { col: 1, row: 26 }, iNE: { col: 1, row: 27 },
  iSW: { col: 2, row: 26 }, iNW: { col: 2, row: 27 },
};

const OVERLAY_FLOWERS: OverlayEdgeSetDef = {
  name: 'Grass with Flowers', atlas: 'terrain',
  NW: { col: 21, row: 8  }, W: { col: 21, row: 9  }, SW: { col: 21, row: 10 },
  N:  { col: 22, row: 8  }, C: { col: 22, row: 9  }, S:  { col: 22, row: 10 },
  NE: { col: 23, row: 8  }, E: { col: 23, row: 9  }, SE: { col: 23, row: 10 },
  iSE: { col: 21, row: 6 }, iNE: { col: 21, row: 7 },
  iSW: { col: 22, row: 6 }, iNW: { col: 22, row: 7 },
  centerVariants: [{ col: 21, row: 11 }, { col: 22, row: 11 }, { col: 23, row: 11 }],
};

const OVERLAY_SAND: OverlayEdgeSetDef = {
  name: 'Sand', atlas: 'terrain',
  NW: { col: 0, row: 11 }, W: { col: 0, row: 12 }, SW: { col: 0, row: 13 },
  N:  { col: 1, row: 11 }, C: { col: 1, row: 12 }, S:  { col: 1, row: 13 },
  NE: { col: 2, row: 11 }, E: { col: 2, row: 12 }, SE: { col: 2, row: 13 },
  iSE: { col: 1, row: 9  }, iNE: { col: 1, row: 10 },
  iSW: { col: 2, row: 9  }, iNW: { col: 2, row: 10 },
  centerVariants: [{ col: 0, row: 14 }, { col: 1, row: 14 }, { col: 2, row: 14 }],
};

const OVERLAY_SAND_WATER: OverlayEdgeSetDef = {
  name: 'Sand (water edges)', atlas: 'terrain',
  NW: { col: 3, row: 11 }, W: { col: 3, row: 12 }, SW: { col: 3, row: 13 },
  N:  { col: 4, row: 11 }, C: { col: 4, row: 12 }, S:  { col: 4, row: 13 },
  NE: { col: 5, row: 11 }, E: { col: 5, row: 12 }, SE: { col: 5, row: 13 },
  iSE: { col: 4, row: 9  }, iNE: { col: 4, row: 10 },
  iSW: { col: 5, row: 9  }, iNW: { col: 5, row: 10 },
};

const OVERLAY_DARK_STONE: OverlayEdgeSetDef = {
  name: 'Dark Stone', atlas: 'terrain',
  NW: { col: 18, row: 8  }, W: { col: 18, row: 9  }, SW: { col: 18, row: 10 },
  N:  { col: 19, row: 8  }, C: { col: 19, row: 9  }, S:  { col: 19, row: 10 },
  NE: { col: 20, row: 8  }, E: { col: 20, row: 9  }, SE: { col: 20, row: 10 },
  iSE: { col: 19, row: 6 }, iNE: { col: 19, row: 7 },
  iSW: { col: 20, row: 6 }, iNW: { col: 20, row: 7 },
  centerVariants: [{ col: 18, row: 11 }, { col: 19, row: 11 }, { col: 20, row: 11 }],
};

const OVERLAY_CLIFF: OverlayEdgeSetDef = {
  name: 'Cliff', atlas: 'terrain',
  NW: { col: 5, row: 0 }, W: { col: 5, row: 1 }, SW: { col: 5, row: 2 },
  N:  { col: 6, row: 0 }, C: { col: 6, row: 1 }, S:  { col: 6, row: 2 },
  NE: { col: 7, row: 0 }, E: { col: 7, row: 1 }, SE: { col: 7, row: 2 },
  iNW: { col: 8, row: 0 }, iSW: { col: 8, row: 1 },
  iNE: { col: 9, row: 0 }, iSE: { col: 9, row: 1 },
};

// ── Noise helper for organic zone generation ─────────────────────────

/** Simple 2D value noise using seeded random. Returns 0..1 */
function valueNoise2D(x: number, y: number, seed: number): number {
  // Hash-based value noise
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // Smooth interpolation
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const hash = (px: number, py: number): number => {
    let h = (px * 374761393 + py * 668265263 + seed * 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };

  const v00 = hash(ix, iy);
  const v10 = hash(ix + 1, iy);
  const v01 = hash(ix, iy + 1);
  const v11 = hash(ix + 1, iy + 1);
  const top = v00 + (v10 - v00) * sx;
  const bot = v01 + (v11 - v01) * sx;
  return top + (bot - top) * sy;
}

/** Multi-octave value noise for more organic shapes. Returns 0..1 */
function fbmNoise(x: number, y: number, seed: number, octaves: number = 3): number {
  let value = 0;
  let amplitude = 1;
  let totalAmp = 0;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency, y * frequency, seed + i * 9999) * amplitude;
    totalAmp += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / totalAmp;
}

// ── Overlay Auto-Tiling Engine ──────────────────────────────────────

/**
 * Remove zone cells that have fewer than 2 cardinal (N/S/E/W) neighbors
 * in the zone. This eliminates ugly single-tile peninsulas and isolated
 * protrusions where the edge tiles can't represent the boundary correctly
 * (e.g. a cell with 3 exposed sides ends up with an arbitrary 2-sided
 * corner tile). Mutates the zone in place.
 */
function pruneWeakZoneCells(zone: boolean[][], width: number, height: number): void {
  const inZ = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height && zone[y][x];
  let changed = true;
  // Iterate until stable (removing one cell may expose another)
  while (changed) {
    changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!zone[y][x]) continue;
        const cardinals = (inZ(x, y - 1) ? 1 : 0) + (inZ(x, y + 1) ? 1 : 0)
          + (inZ(x - 1, y) ? 1 : 0) + (inZ(x + 1, y) ? 1 : 0);
        if (cardinals < 2) {
          zone[y][x] = false;
          changed = true;
        }
      }
    }
  }
}

/**
 * Given a boolean zone grid (at grid-cell / 5ft resolution), produce
 * AtlasOverlay entries at 2× subtile resolution (2.5ft per subtile).
 * Each grid cell becomes a 2×2 block of subtiles.  Edge/corner/
 * inner-corner tile selection uses subtile neighbors so transitions
 * appear at half-cell boundaries — only the outer subtiles of a zone
 * edge show transition pieces while inner subtiles stay solid.
 *
 * Emitted overlays use fractional grid coordinates (0, 0.5, 1, 1.5 …)
 * so the renderer can position them at the correct quadrant within
 * each grid cell.
 */
function autoTileOverlayZone(
  zone: boolean[][],
  edgeSet: OverlayEdgeSetDef,
  width: number,
  height: number,
  rng: SeededRandom,
): AtlasOverlay[] {
  const overlays: AtlasOverlay[] = [];
  const subW = width * 2;
  const subH = height * 2;

  // Zone membership at subtile resolution — maps back to the parent grid cell
  const inZ = (sx: number, sy: number) => {
    if (sx < 0 || sx >= subW || sy < 0 || sy >= subH) return false;
    return zone[Math.floor(sy / 2)][Math.floor(sx / 2)];
  };

  for (let sy = 0; sy < subH; sy++) {
    for (let sx = 0; sx < subW; sx++) {
      if (!inZ(sx, sy)) continue;

      const n  = inZ(sx, sy - 1);
      const s  = inZ(sx, sy + 1);
      const e  = inZ(sx + 1, sy);
      const w  = inZ(sx - 1, sy);
      const ne = inZ(sx + 1, sy - 1);
      const nw = inZ(sx - 1, sy - 1);
      const se = inZ(sx + 1, sy + 1);
      const sw = inZ(sx - 1, sy + 1);

      // Fractional grid coordinates — sx=6 → x=3.0,  sx=7 → x=3.5
      const fx = sx / 2;
      const fy = sy / 2;

      let ref: { col: number; row: number };

      // Determine which tile piece to use based on cardinal neighbors
      if (!n && !w && !s && !e) {
        ref = edgeSet.C;
      } else if (!n && !w) {
        ref = edgeSet.NW;
      } else if (!n && !e) {
        ref = edgeSet.NE;
      } else if (!s && !w) {
        ref = edgeSet.SW;
      } else if (!s && !e) {
        ref = edgeSet.SE;
      } else if (!n) {
        ref = edgeSet.N;
      } else if (!s) {
        ref = edgeSet.S;
      } else if (!e) {
        ref = edgeSet.E;
      } else if (!w) {
        ref = edgeSet.W;
      } else {
        // All cardinals present — centre with possible inner corners
        if (edgeSet.centerVariants && rng.chance(0.4)) {
          ref = rng.pick(edgeSet.centerVariants);
        } else {
          ref = edgeSet.C;
        }
        overlays.push({ x: fx, y: fy, atlas: edgeSet.atlas, col: ref.col, row: ref.row });

        // Emit inner corners for any missing diagonal
        if (!ne && edgeSet.iNE) {
          overlays.push({ x: fx, y: fy, atlas: edgeSet.atlas, col: edgeSet.iNE.col, row: edgeSet.iNE.row });
        }
        if (!nw && edgeSet.iNW) {
          overlays.push({ x: fx, y: fy, atlas: edgeSet.atlas, col: edgeSet.iNW.col, row: edgeSet.iNW.row });
        }
        if (!se && edgeSet.iSE) {
          overlays.push({ x: fx, y: fy, atlas: edgeSet.atlas, col: edgeSet.iSE.col, row: edgeSet.iSE.row });
        }
        if (!sw && edgeSet.iSW) {
          overlays.push({ x: fx, y: fy, atlas: edgeSet.atlas, col: edgeSet.iSW.col, row: edgeSet.iSW.row });
        }
        continue; // Already pushed
      }

      overlays.push({ x: fx, y: fy, atlas: edgeSet.atlas, col: ref.col, row: ref.row });
    }
  }
  return overlays;
}

/**
 * Generate an organic blob-shaped zone using multi-octave noise.
 * Returns a boolean grid where true means the zone is active.
 */
function generateNoiseZone(
  width: number, height: number,
  rng: SeededRandom,
  opts: {
    /** Noise frequency - lower = larger blobs (default 0.12) */
    frequency?: number;
    /** Threshold for inclusion - higher = smaller zones (default 0.55) */
    threshold?: number;
    /** Number of blob centers to seed */
    blobCount?: number;
    /** Min distance from edges */
    margin?: number;
    /** Cells to exclude (e.g. starting zones, water) */
    excluded?: Set<string>;
    /** Seed offset for noise variation */
    seedOffset?: number;
  } = {},
): boolean[][] {
  const freq = opts.frequency ?? 0.12;
  const threshold = opts.threshold ?? 0.55;
  const margin = opts.margin ?? 2;
  const seedOff = opts.seedOffset ?? 0;
  const noiseSeed = Math.floor(rng.next() * 999999) + seedOff;

  const zone: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    zone[y] = [];
    for (let x = 0; x < width; x++) {
      if (x < margin || x >= width - margin || y < margin || y >= height - margin) {
        zone[y][x] = false;
        continue;
      }
      if (opts.excluded?.has(`${x},${y}`)) {
        zone[y][x] = false;
        continue;
      }
      const n = fbmNoise(x * freq, y * freq, noiseSeed, 3);
      zone[y][x] = n > threshold;
    }
  }
  return zone;
}

/**
 * Generate a lake/pond shape using noise, returning cells that should be water.
 * Creates natural-looking water bodies with deep centers and shallow edges.
 */
function generateLakeShape(
  width: number, height: number,
  rng: SeededRandom,
  cx: number, cy: number,
  radiusX: number, radiusY: number,
  excluded: Set<string>,
): { shallow: boolean[][]; deep: boolean[][] } {
  const noiseSeed = Math.floor(rng.next() * 999999);
  const shallow: boolean[][] = [];
  const deep: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    shallow[y] = [];
    deep[y] = [];
    for (let x = 0; x < width; x++) {
      shallow[y][x] = false;
      deep[y][x] = false;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (excluded.has(`${x},${y}`)) continue;
      if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;

      // Elliptical distance from center
      const dx = (x - cx) / radiusX;
      const dy = (y - cy) / radiusY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Add noise to create organic shoreline
      const noise = fbmNoise(x * 0.2, y * 0.2, noiseSeed, 3) * 0.4;
      const adjustedDist = dist + noise;

      if (adjustedDist < 0.6) {
        deep[y][x] = true;
      } else if (adjustedDist < 1.0) {
        shallow[y][x] = true;
      }
    }
  }
  return { shallow, deep };
}

// ── Stable (6x5) ───────────────────────────────────────────
const STABLE_STAMP: StructureStamp = {
  name: 'Stable',
  width: 6,
  height: 5,
  tiles: parseStamp([
    'WWWWWW',
    'Wh.h.D',
    'Wf.f.W',
    'Wh.h.D',
    'WWWWWW',
  ]),
};

// ── Fountain Plaza (5x5) ───────────────────────────────────
const FOUNTAIN_STAMP: StructureStamp = {
  name: 'Fountain',
  width: 5,
  height: 5,
  tiles: parseStamp([
    's.s.s',
    '.qqq.',
    'sqFqs',
    '.qqq.',
    's.s.s',
  ]),
};

// ── Guard Post (5x5) ───────────────────────────────────────
const GUARD_POST_STAMP: StructureStamp = {
  name: 'Guard Post',
  width: 5,
  height: 5,
  tiles: parseStamp([
    'WWyWW',
    'WE..W',
    'D..TW',
    'W.H.W',
    'WWWWW',
  ]),
};

// ── Kitchen (8x6) ──────────────────────────────────────────
const KITCHEN_STAMP: StructureStamp = {
  name: 'Kitchen',
  width: 8,
  height: 6,
  tiles: parseStamp([
    'WWWDWWWW',
    'Wccc...W',
    'W....B.W',
    'W.TH.B.W',
    'W.TH.e.W',
    'WWWWWWWW',
  ]),
};

// ── Throne Room (9x7) ─────────────────────────────────────
const THRONE_ROOM_STAMP: StructureStamp = {
  name: 'Throne Room',
  width: 9,
  height: 7,
  tiles: parseStamp([
    'WWWWDWWWW',
    'WP.CCC.PW',
    'W.JCCCJ.W',
    'W..CYC..W',
    'WP.CCC.PW',
    'W.JCSCJ.W',
    'WWWWWWWWW',
  ]),
};

// ── Armory (7x5) ──────────────────────────────────────────
const ARMORY_STAMP: StructureStamp = {
  name: 'Armory',
  width: 7,
  height: 5,
  tiles: parseStamp([
    'WWWDWWW',
    'WE.E.EW',
    'W.....W',
    'WZ.a.ZW',
    'WWWWWWW',
  ]),
};

// ── Prison Cell Block (10x5) ──────────────────────────────
const PRISON_STAMP: StructureStamp = {
  name: 'Prison Cells',
  width: 10,
  height: 5,
  tiles: parseStamp([
    'WfDfWfDfWW',
    'W...W...WW',
    'W.h.W.h.WW',
    'W...W...WW',
    'WWWWWWWWWW',
  ]),
};

// ── Sewer Junction (7x7) ──────────────────────────────────
const SEWER_STAMP: StructureStamp = {
  name: 'Sewer Junction',
  width: 7,
  height: 7,
  tiles: parseStamp([
    'MMMMMM_',
    'M.OqqOM',
    'M..qq.M',
    'MqqOqqM',
    'M.qq..M',
    'MOqqO.M',
    '_MMMMMM',
  ]),
};

// ── Wizard's Lab (8x7) ───────────────────────────────────
const WIZARD_LAB_STAMP: StructureStamp = {
  name: "Wizard's Lab",
  width: 8,
  height: 7,
  tiles: parseStamp([
    'WWWDWWWW',
    'Wb.Y..bW',
    'W......W',
    'W.T..Z.W',
    'W.TH.Z.W',
    'WJ.Rz.JW',
    'WWWWWWWW',
  ]),
};

// ── Barracks (9x6) ────────────────────────────────────────
const BARRACKS_STAMP: StructureStamp = {
  name: 'Barracks',
  width: 9,
  height: 6,
  tiles: parseStamp([
    'WWWWDWWWW',
    'Wd.d.d..W',
    'W.......W',
    'Wd.d.d..W',
    'W.TH.E..W',
    'WWWWWWWWW',
  ]),
};

// ── Garden (8x8) ──────────────────────────────────────────
const GARDEN_STAMP: StructureStamp = {
  name: 'Garden',
  width: 8,
  height: 8,
  tiles: parseStamp([
    'gggggggg',
    'g.R..R.g',
    'gR....Rg',
    'g..Fw..g',
    'g..ww..g',
    'gR....Rg',
    'g.R..R.g',
    'gggggggg',
  ]),
};

// ── Boss Room (11x9) ──────────────────────────────────────
const BOSS_ROOM_STAMP: StructureStamp = {
  name: 'Boss Room',
  width: 11,
  height: 9,
  tiles: parseStamp([
    'WWWWWDWWWWW',
    'WP..CCC..PW',
    'W...CYC...W',
    'W.........W',
    'WJ..PPP..JW',
    'W.........W',
    'W..J...J..W',
    'WP..C6C..PW',
    'WWWWWWWWWWW',
  ]),
};

// ── Dock Warehouse (9x7) ─────────────────────────────────
const DOCK_WAREHOUSE_STAMP: StructureStamp = {
  name: 'Dock Warehouse',
  width: 9,
  height: 7,
  tiles: parseStamp([
    'WWWWDWWWW',
    'WK.K.K.KW',
    'W.......W',
    'WB.B.B.BW',
    'W.......W',
    'Wc.c.c.cW',
    'WWWWWWWWW',
  ]),
};

// ─── BSP Dungeon Generator ─────────────────────────────────

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

function splitBSP(node: BSPNode, rng: SeededRandom, minSize: number, depth: number): void {
  if (depth <= 0) return;
  if (node.w < minSize * 2 + 3 && node.h < minSize * 2 + 3) return;

  // Decide split direction
  let splitH: boolean;
  if (node.w > node.h * 1.25) {
    splitH = false; // split vertically (wide)
  } else if (node.h > node.w * 1.25) {
    splitH = true;  // split horizontally (tall)
  } else {
    splitH = rng.chance(0.5);
  }

  if (splitH) {
    if (node.h < minSize * 2 + 3) return;
    const split = rng.int(minSize + 1, node.h - minSize - 1);
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    if (node.w < minSize * 2 + 3) return;
    const split = rng.int(minSize + 1, node.w - minSize - 1);
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }

  splitBSP(node.left!, rng, minSize, depth - 1);
  splitBSP(node.right!, rng, minSize, depth - 1);
}

function carveRoom(node: BSPNode, rng: SeededRandom, rooms: Room[], roomId: { value: number }, minRoomSize: number): void {
  if (node.left || node.right) {
    if (node.left) carveRoom(node.left, rng, rooms, roomId, minRoomSize);
    if (node.right) carveRoom(node.right, rng, rooms, roomId, minRoomSize);
    return;
  }

  // Leaf node — create a room within it
  const maxW = Math.min(node.w - 2, 12);
  const maxH = Math.min(node.h - 2, 10);
  if (maxW < minRoomSize || maxH < minRoomSize) return;

  const roomW = rng.int(minRoomSize, maxW);
  const roomH = rng.int(minRoomSize, maxH);
  const roomX = node.x + rng.int(1, node.w - roomW - 1);
  const roomY = node.y + rng.int(1, node.h - roomH - 1);

  const room: Room = {
    id: roomId.value++,
    x: roomX,
    y: roomY,
    width: roomW,
    height: roomH,
    centerX: Math.floor(roomX + roomW / 2),
    centerY: Math.floor(roomY + roomH / 2),
    type: 'normal',
  };
  node.room = room;
  rooms.push(room);
}

function findRoom(node: BSPNode): Room | undefined {
  if (node.room) return node.room;
  if (node.left) {
    const r = findRoom(node.left);
    if (r) return r;
  }
  if (node.right) {
    const r = findRoom(node.right);
    if (r) return r;
  }
  return undefined;
}

function connectRooms(node: BSPNode, grid: TileType[][], rng: SeededRandom, corridors: Corridor[]): void {
  if (!node.left || !node.right) return;
  connectRooms(node.left, grid, rng, corridors);
  connectRooms(node.right, grid, rng, corridors);

  const roomA = findRoom(node.left);
  const roomB = findRoom(node.right);
  if (!roomA || !roomB) return;

  // Corridor width: 1 (narrow), 2 (wide corridor), or 3 (grand hall)
  const corridorWidth = rng.chance(0.2) ? 2 : rng.chance(0.05) ? 3 : 1;

  // Carve an L-shaped corridor between room centers
  const path: Position[] = [];
  let cx = roomA.centerX;
  let cy = roomA.centerY;

  const carveCorridor = (x: number, y: number) => {
    for (let dy = 0; dy < corridorWidth; dy++) {
      for (let dx = 0; dx < corridorWidth; dx++) {
        const nx = x + dx, ny = y + dy;
        if (inBounds(nx, ny, grid[0].length, grid.length)) {
          if (grid[ny][nx] === 'wall') grid[ny][nx] = 'corridor';
        }
      }
    }
  };

  if (rng.chance(0.5)) {
    // Horizontal first, then vertical
    while (cx !== roomB.centerX) {
      carveCorridor(cx, cy);
      path.push({ x: cx, y: cy });
      cx += cx < roomB.centerX ? 1 : -1;
    }
    while (cy !== roomB.centerY) {
      carveCorridor(cx, cy);
      path.push({ x: cx, y: cy });
      cy += cy < roomB.centerY ? 1 : -1;
    }
  } else {
    // Vertical first, then horizontal
    while (cy !== roomB.centerY) {
      carveCorridor(cx, cy);
      path.push({ x: cx, y: cy });
      cy += cy < roomB.centerY ? 1 : -1;
    }
    while (cx !== roomB.centerX) {
      carveCorridor(cx, cy);
      path.push({ x: cx, y: cy });
      cx += cx < roomB.centerX ? 1 : -1;
    }
  }

  // Wide corridors get pillars at intersections
  if (corridorWidth >= 2 && path.length > 6) {
    const midIdx = Math.floor(path.length / 2);
    const midP = path[midIdx];
    if (inBounds(midP.x, midP.y, grid[0].length, grid.length) && grid[midP.y][midP.x] === 'corridor') {
      grid[midP.y][midP.x] = 'pillar';
    }
  }

  corridors.push({ from: roomA.id, to: roomB.id, path });
}

function placeDoors(grid: TileType[][], rooms: Room[], rng: SeededRandom): void {
  for (const room of rooms) {
    // Check each edge cell of the room for corridor connections
    for (let x = room.x; x < room.x + room.width; x++) {
      for (const y of [room.y - 1, room.y + room.height]) {
        if (!inBounds(x, y, grid[0].length, grid.length)) continue;
        if (grid[y][x] === 'corridor') {
          // This corridor connects to the room edge — maybe place a door
          if (rng.chance(0.5)) {
            grid[y][x] = 'door';
          }
        }
      }
    }
    for (let y = room.y; y < room.y + room.height; y++) {
      for (const x of [room.x - 1, room.x + room.width]) {
        if (!inBounds(x, y, grid[0].length, grid.length)) continue;
        if (grid[y][x] === 'corridor') {
          if (rng.chance(0.5)) {
            grid[y][x] = 'door';
          }
        }
      }
    }
  }
}

function decorateRooms(rooms: Room[], grid: TileType[][], rng: SeededRandom, features: MapFeature[]): void {
  for (const room of rooms) {
    const canFitStamp = (stamp: StructureStamp): boolean =>
      room.width >= stamp.width + 2 && room.height >= stamp.height + 2;

    // Assign room types based on random chance
    const roll = rng.next();
    if (roll < 0.08 && canFitStamp(ARMORY_STAMP)) {
      room.type = 'normal';
      const ox = room.x + Math.floor((room.width - ARMORY_STAMP.width) / 2);
      const oy = room.y + Math.floor((room.height - ARMORY_STAMP.height) / 2);
      placeStamp(grid, ARMORY_STAMP, ox, oy);
      features.push({ name: 'Armory', type: 'cover', positions: [{ x: room.centerX, y: room.centerY }], description: 'A room with weapon racks and shelves' });
    } else if (roll < 0.12 && canFitStamp(PRISON_STAMP)) {
      room.type = 'normal';
      const ox = room.x + Math.floor((room.width - PRISON_STAMP.width) / 2);
      const oy = room.y + Math.floor((room.height - PRISON_STAMP.height) / 2);
      placeStamp(grid, PRISON_STAMP, ox, oy);
      features.push({ name: 'Prison Cells', type: 'hazard', positions: [{ x: room.centerX, y: room.centerY }], description: 'Prison cells with iron bars' });
    } else if (roll < 0.16 && canFitStamp(KITCHEN_STAMP)) {
      room.type = 'normal';
      const ox = room.x + Math.floor((room.width - KITCHEN_STAMP.width) / 2);
      const oy = room.y + Math.floor((room.height - KITCHEN_STAMP.height) / 2);
      placeStamp(grid, KITCHEN_STAMP, ox, oy);
      features.push({ name: 'Kitchen', type: 'cover', positions: [{ x: room.centerX, y: room.centerY }], description: 'A kitchen with a firepit and counters' });
    } else if (roll < 0.2) {
      room.type = 'treasure';
      // Place a chest
      const cx = rng.int(room.x + 1, room.x + room.width - 2);
      const cy = rng.int(room.y + 1, room.y + room.height - 2);
      if (grid[cy][cx] === 'floor') {
        grid[cy][cx] = 'chest';
        features.push({ name: 'Treasure Chest', type: 'hazard', positions: [{ x: cx, y: cy }], description: 'A locked treasure chest' });
      }
    } else if (roll < 0.28) {
      room.type = 'trap';
      // Place actual trap tiles
      const trapCount = rng.int(1, 3);
      for (let i = 0; i < trapCount; i++) {
        const tx = rng.int(room.x + 1, room.x + room.width - 2);
        const ty = rng.int(room.y + 1, room.y + room.height - 2);
        if (grid[ty][tx] === 'floor') grid[ty][tx] = 'trap';
      }
      features.push({ name: 'Trapped Room', type: 'trap', positions: [{ x: room.centerX, y: room.centerY }], description: 'This room has hidden traps' });
    } else if (roll < 0.38) {
      room.type = 'shrine';
      // Add pillars in corners
      const corners = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.width - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.height - 2 },
        { x: room.x + room.width - 2, y: room.y + room.height - 2 },
      ];
      for (const c of corners) {
        if (inBounds(c.x, c.y, grid[0].length, grid.length) && grid[c.y][c.x] === 'floor') {
          grid[c.y][c.x] = 'pillar';
        }
      }
      // Carpet down the middle
      for (let x = room.x + 2; x < room.x + room.width - 2; x++) {
        if (inBounds(x, room.centerY, grid[0].length, grid.length) && grid[room.centerY][x] === 'floor') {
          grid[room.centerY][x] = 'carpet';
        }
      }
      // Add candelabras near the altar area
      if (room.width > 4) {
        const candleX1 = room.x + 1, candleX2 = room.x + room.width - 2;
        if (inBounds(candleX1, room.centerY, grid[0].length, grid.length) && grid[room.centerY][candleX1] === 'floor') {
          grid[room.centerY][candleX1] = 'candelabra';
        }
        if (inBounds(candleX2, room.centerY, grid[0].length, grid.length) && grid[room.centerY][candleX2] === 'floor') {
          grid[room.centerY][candleX2] = 'candelabra';
        }
      }
    } else if (roll < 0.43) {
      // Rubble / collapsed section
      const rubbleCount = rng.int(2, 5);
      for (let i = 0; i < rubbleCount; i++) {
        const rx = rng.int(room.x, room.x + room.width - 1);
        const ry = rng.int(room.y, room.y + room.height - 1);
        if (grid[ry][rx] === 'floor') {
          grid[ry][rx] = 'rubble';
        }
      }
    } else if (roll < 0.48) {
      // Alternate floor pattern
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          if (grid[y][x] === 'floor' && (x + y) % 2 === 0) {
            grid[y][x] = 'floor-alt';
          }
        }
      }
    } else if (roll < 0.52 && canFitStamp(SEWER_STAMP)) {
      room.type = 'normal';
      const ox = room.x + Math.floor((room.width - SEWER_STAMP.width) / 2);
      const oy = room.y + Math.floor((room.height - SEWER_STAMP.height) / 2);
      placeStamp(grid, SEWER_STAMP, ox, oy);
      features.push({ name: 'Sewer Access', type: 'hazard', positions: [{ x: room.centerX, y: room.centerY }], description: 'A sewer access point with drain grates' });
    } else if (roll < 0.58 && canFitStamp(WIZARD_LAB_STAMP)) {
      room.type = 'normal';
      const ox = room.x + Math.floor((room.width - WIZARD_LAB_STAMP.width) / 2);
      const oy = room.y + Math.floor((room.height - WIZARD_LAB_STAMP.height) / 2);
      placeStamp(grid, WIZARD_LAB_STAMP, ox, oy);
      features.push({ name: 'Wizard\'s Laboratory', type: 'hazard', positions: [{ x: room.centerX, y: room.centerY }], description: 'An abandoned wizard\'s lab with arcane equipment' });
    }
  }
}

export function generateDungeon(
  width: number = 30,
  height: number = 20,
  seed?: number,
  options?: { minRoomSize?: number; maxDepth?: number }
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const minRoomSize = options?.minRoomSize ?? 4;
  const maxDepth = options?.maxDepth ?? 5;

  // Start with all walls
  const grid = createGrid(width, height, 'wall');
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];
  const features: MapFeature[] = [];

  // BSP Split
  const root: BSPNode = { x: 0, y: 0, w: width, h: height };
  splitBSP(root, rng, minRoomSize, maxDepth);

  // Carve rooms
  const roomIdCounter = { value: 0 };
  carveRoom(root, rng, rooms, roomIdCounter, minRoomSize);

  // Carve room tiles into grid — with shape variety
  for (const room of rooms) {
    const shapeRoll = rng.next();
    if (shapeRoll < 0.15 && room.width >= 6 && room.height >= 6) {
      // Circular room
      carveCircularRoom(grid, room.centerX, room.centerY, Math.floor(Math.min(room.width, room.height) / 2));
    } else if (shapeRoll < 0.25 && room.width >= 6 && room.height >= 6) {
      // L-shaped room
      carveLShapedRoom(grid, room, rng);
    } else if (shapeRoll < 0.33 && room.width >= 7 && room.height >= 7) {
      // Cross-shaped room
      carveCrossRoom(grid, room);
    } else {
      // Standard rectangular room
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          if (inBounds(x, y, width, height)) {
            grid[y][x] = 'floor';
          }
        }
      }
    }
  }

  // Connect rooms with corridors
  connectRooms(root, grid, rng, corridors);

  // Place doors at room entrances
  placeDoors(grid, rooms, rng);

  // Ensure all rooms are reachable
  ensureConnectivity(grid, rooms, rng);

  // Assign room types (first = entrance, last = boss)
  if (rooms.length > 0) rooms[0].type = 'entrance';
  if (rooms.length > 1) rooms[rooms.length - 1].type = 'boss';

  // Place stairs
  if (rooms.length > 0) {
    const entrance = rooms[0];
    grid[entrance.centerY][entrance.centerX] = 'stairs-up';
  }
  if (rooms.length > 1) {

  // Place BOSS_ROOM_STAMP in boss room if it fits
  if (rooms.length > 1) {
    const bossRoom = rooms[rooms.length - 1];
    if (bossRoom.width >= BOSS_ROOM_STAMP.width + 1 && bossRoom.height >= BOSS_ROOM_STAMP.height + 1) {
      const ox = bossRoom.x + Math.floor((bossRoom.width - BOSS_ROOM_STAMP.width) / 2);
      const oy = bossRoom.y + Math.floor((bossRoom.height - BOSS_ROOM_STAMP.height) / 2);
      placeStamp(grid, BOSS_ROOM_STAMP, ox, oy);
      features.push({ name: 'Boss Chamber', type: 'cover', positions: [{ x: bossRoom.centerX, y: bossRoom.centerY }], description: 'An ornate boss chamber with a throne' });
    }
  }
    const bossRoom = rooms[rooms.length - 1];
    grid[bossRoom.centerY][bossRoom.centerX] = 'stairs-down';
  }

  // Decorate rooms
  decorateRooms(rooms.slice(1, -1), grid, rng, features);

  // Starting zones
  const playerRoom = rooms[0];
  const enemyRoom = rooms[rooms.length - 1];
  const startingZones = {
    players: getFloorPositions(grid, playerRoom, 4, rng),
    enemies: getFloorPositions(grid, enemyRoom, 4, rng),
  };

  const names = ['Ancient Dungeon', 'Forsaken Crypt', 'Dark Labyrinth', 'Sunken Halls',
    'Cursed Catacombs', 'Ruined Vault', 'Shadow Delve', 'Dragon\'s Lair Depths'];

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'dungeon', subTheme: 'procedural-dungeon',
    name: rng.pick(names),
    description: `A procedurally generated dungeon with ${rooms.length} rooms`,
  };
}

// ─── Cave Generator (Cellular Automata) ─────────────────────

export function generateCave(
  width: number = 30,
  height: number = 20,
  seed?: number,
  options?: { fillProbability?: number; iterations?: number; hasWater?: boolean; hasLava?: boolean }
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const fillProb = options?.fillProbability ?? 0.45;
  const iterations = options?.iterations ?? 5;

  // Initialize with random walls
  let grid = createGrid(width, height, 'wall');
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y][x] = rng.chance(fillProb) ? 'wall' : 'dirt';
    }
  }

  // Cellular automata iterations
  for (let iter = 0; iter < iterations; iter++) {
    const newGrid = createGrid(width, height, 'wall');
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const wallCount = countNeighbors(grid, x, y, 'wall');
        newGrid[y][x] = wallCount >= 5 ? 'wall' : 'dirt';
      }
    }
    grid = newGrid;
  }

  // Find the largest connected open area (flood fill)
  const visited = createGrid(width, height, 'wall');
  let largestRegion: Position[] = [];
  const regions: Position[][] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] !== 'wall' && visited[y][x] === 'wall') {
        const region: Position[] = [];
        const queue: Position[] = [{ x, y }];
        visited[y][x] = 'floor';
        while (queue.length > 0) {
          const pos = queue.shift()!;
          region.push(pos);
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = pos.x + dx;
            const ny = pos.y + dy;
            if (inBounds(nx, ny, width, height) && grid[ny][nx] !== 'wall' && visited[ny][nx] === 'wall') {
              visited[ny][nx] = 'floor';
              queue.push({ x: nx, y: ny });
            }
          }
        }
        regions.push(region);
        if (region.length > largestRegion.length) {
          largestRegion = region;
        }
      }
    }
  }

  // Fill in small disconnected regions as walls
  const largestSet = new Set(largestRegion.map(p => `${p.x},${p.y}`));
  for (const region of regions) {
    if (region === largestRegion) continue;
    for (const pos of region) {
      grid[pos.y][pos.x] = 'wall';
    }
  }

  // Add features
  const features: MapFeature[] = [];
  const rooms: Room[] = [];

  // Add water pools or lava
  if (options?.hasWater || (!options?.hasLava && rng.chance(0.4))) {
    const waterPositions = largestRegion.filter(() => rng.chance(0.03));
    for (const pos of waterPositions) {
      grid[pos.y][pos.x] = 'water-shallow';
      // Expand water a bit
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (inBounds(nx, ny, width, height) && grid[ny][nx] === 'dirt' && rng.chance(0.5)) {
          grid[ny][nx] = 'water-shallow';
        }
      }
    }
    // A few deep water tiles in shallow water clusters
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        if (grid[y][x] === 'water-shallow' && countNeighbors(grid, x, y, 'water-shallow') >= 3 && rng.chance(0.3)) {
          grid[y][x] = 'water-deep';
        }
      }
    }
  }

  if (options?.hasLava) {
    const lavaPositions = largestRegion.filter(() => rng.chance(0.02));
    for (const pos of lavaPositions) {
      grid[pos.y][pos.x] = 'lava';
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (inBounds(nx, ny, width, height) && grid[ny][nx] === 'dirt' && rng.chance(0.4)) {
          grid[ny][nx] = 'lava';
        }
      }
    }
    features.push({ name: 'Lava Pools', type: 'lava', positions: lavaPositions, description: 'Bubbling pools of molten rock' });
  }

  // Scatter some rocks and rubble
  for (const pos of largestRegion) {
    if (grid[pos.y][pos.x] === 'dirt') {
      if (rng.chance(0.02)) grid[pos.y][pos.x] = 'rock';
      else if (rng.chance(0.03)) grid[pos.y][pos.x] = 'rubble';
      else if (rng.chance(0.01)) grid[pos.y][pos.x] = 'stone';
    }
  }

  // Create pseudo-rooms from open areas for starting zones
  const shuffled = rng.shuffle([...largestRegion.filter(p => grid[p.y][p.x] === 'dirt')]);
  if (shuffled.length >= 8) {
    rooms.push({ id: 0, x: shuffled[0].x - 1, y: shuffled[0].y - 1, width: 3, height: 3, centerX: shuffled[0].x, centerY: shuffled[0].y, type: 'entrance' });
    const farPoint = shuffled[shuffled.length - 1];
    rooms.push({ id: 1, x: farPoint.x - 1, y: farPoint.y - 1, width: 3, height: 3, centerX: farPoint.x, centerY: farPoint.y, type: 'boss' });
  }

  const startingZones = {
    players: shuffled.slice(0, 4).map(p => ({ x: p.x, y: p.y })),
    enemies: shuffled.slice(-4).map(p => ({ x: p.x, y: p.y })),
  };

  const names = ['Echoing Caverns', 'Crystal Grotto', 'Abyssal Cave', 'Winding Tunnels',
    'Darkstone Caves', 'Moss-covered Cavern', 'Underground Lake', 'Spider\'s Nest'];

  return {
    width, height, tiles: grid, rooms, corridors: [], startingZones, features,
    theme: 'dungeon', subTheme: 'cave',
    name: rng.pick(names),
    description: `A natural cave system with ${largestRegion.length} open tiles`,
  };
}

// ─── Wilderness Generator ───────────────────────────────────────

export function generateWilderness(
  width: number = 30,
  height: number = 20,
  seed?: number,
  options?: { hasRiver?: boolean; hasPath?: boolean; hasLake?: boolean; hasCampsite?: boolean; chestCount?: number; density?: 'sparse' | 'normal' | 'dense'; subTheme?: string }
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const sub = options?.subTheme || 'forest';
  const density = options?.density ?? (sub === 'clearing' || sub === 'camp' ? 'sparse' : 'normal');

  // Base terrain varies by sub-theme
  const baseTile: TileType = sub === 'swamp' ? 'mud' : sub === 'desert' ? 'sand' : 'grass';
  const grid = createGrid(width, height, baseTile);
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const allOverlays: AtlasOverlay[] = [];
  // Per-cell movement cost override — null means use tile default
  const moveCostOverride: (number | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));

  // Density parameters
  const treeDensity = density === 'sparse' ? 0.05 : density === 'dense' ? 0.2 : 0.12;
  const bushDensity = density === 'sparse' ? 0.03 : density === 'dense' ? 0.12 : 0.06;

  // ── Determine if we should generate a lake ──
  const wantLake = options?.hasLake ?? (sub === 'lakeside' || (sub === 'forest' && rng.chance(0.3)) || (sub === 'clearing' && rng.chance(0.4)));
  const noiseSeedBase = Math.floor(rng.next() * 999999);

  // ── Reserved cells (starting zones + water + paths) ──
  const reserved = new Set<string>();

  // ── Step 1: Generate starting zones early so we can exclude them ──
  const playerStartX = rng.int(2, 5);
  const playerStartY = rng.int(Math.floor(height / 3), Math.floor((height * 2) / 3));
  const enemyStartX = rng.int(width - 6, width - 3);
  const enemyStartY = rng.int(Math.floor(height / 3), Math.floor((height * 2) / 3));

  const startingZones = {
    players: [
      { x: playerStartX, y: playerStartY },
      { x: playerStartX + 1, y: playerStartY },
      { x: playerStartX, y: playerStartY + 1 },
      { x: playerStartX + 1, y: playerStartY + 1 },
    ],
    enemies: [
      { x: enemyStartX, y: enemyStartY },
      { x: enemyStartX - 1, y: enemyStartY },
      { x: enemyStartX, y: enemyStartY + 1 },
      { x: enemyStartX - 1, y: enemyStartY + 1 },
    ],
  };

  // Reserve starting zones with buffer
  for (const z of [...startingZones.players, ...startingZones.enemies]) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        reserved.add(`${z.x + dx},${z.y + dy}`);
      }
    }
  }

  // ── Step 2: Generate water bodies (lakes / ponds) ──
  if (wantLake) {
    // Place 1-2 lakes
    const lakeCount = sub === 'lakeside' ? rng.int(1, 2) : 1;
    for (let li = 0; li < lakeCount; li++) {
      const lakeRadX = rng.int(3, Math.min(6, Math.floor(width / 5)));
      const lakeRadY = rng.int(2, Math.min(5, Math.floor(height / 4)));
      // Position lake away from starting zones
      const lakeCX = rng.int(Math.floor(width * 0.25), Math.floor(width * 0.75));
      const lakeCY = rng.int(Math.floor(height * 0.25), Math.floor(height * 0.75));

      const lake = generateLakeShape(width, height, rng, lakeCX, lakeCY, lakeRadX, lakeRadY, reserved);

      // Apply water tiles to grid
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (lake.deep[y][x]) {
            grid[y][x] = 'water-deep';
            reserved.add(`${x},${y}`);
          } else if (lake.shallow[y][x]) {
            grid[y][x] = 'water-shallow';
            reserved.add(`${x},${y}`);
          }
        }
      }

      features.push({
        name: li === 0 ? 'Lake' : 'Pond', type: 'water',
        positions: [{ x: lakeCX, y: lakeCY }],
        description: li === 0 ? 'A serene body of water' : 'A small woodland pond',
      });
    }
  }

  // ── Step 3: River (if requested) ──
  // Track river cells so the bridge logic only bridges rivers, not lakes
  const riverCells = new Set<string>();
  if (options?.hasRiver) {
    let riverX = rng.int(Math.floor(width / 3), Math.floor((width * 2) / 3));
    for (let y = 0; y < height; y++) {
      riverX += rng.int(-1, 1);
      riverX = Math.max(2, Math.min(width - 3, riverX));
      for (let dx = -1; dx <= 1; dx++) {
        const rx = riverX + dx;
        if (inBounds(rx, y, width, height) && !reserved.has(`${rx},${y}`)) {
          grid[y][rx] = dx === 0 ? 'water-deep' : 'water-shallow';
          reserved.add(`${rx},${y}`);
          riverCells.add(`${rx},${y}`);
        }
      }
    }
    features.push({ name: 'River', type: 'water', positions: [], description: 'A flowing river crosses the area' });
  }

  // ── Step 4: Path / trail through the map (with proper bridge over river) ──
  // Track pathY per column so later steps can position relative to the path
  const pathYByCol: number[] = new Array(width).fill(-1);
  if (options?.hasPath !== false) {
    let pathY = rng.int(3, height - 4);
    pathY = Math.max(2, Math.min(height - 3, pathY)); // room for 3-row bridge

    // Track bridge crossing state
    let bridgeY = -1;   // fixed Y while crossing water
    let bridgeMinX = width;
    let bridgeMaxX = -1;

    for (let x = 0; x < width; x++) {
      // Check if any of the 3 path rows hit RIVER water at this column
      // (only river water gets a bridge — lakes/ponds do not)
      let onWater = false;
      for (let dy = -1; dy <= 1; dy++) {
        const py = pathY + dy;
        if (inBounds(x, py, width, height) && riverCells.has(`${x},${py}`)) {
          onWater = true;
          break;
        }
      }

      if (onWater) {
        // Lock pathY the first time we touch water — bridge stays straight
        if (bridgeY < 0) bridgeY = pathY;
        bridgeMinX = Math.min(bridgeMinX, x);
        bridgeMaxX = Math.max(bridgeMaxX, x);
        // Don't wander while on water
      } else {
        // Normal land wandering
        pathY += rng.int(-1, 1);
        pathY = Math.max(2, Math.min(height - 3, pathY));
      }

      pathYByCol[x] = pathY;

      // Place dirt on non-water tiles
      for (let dy = -1; dy <= 1; dy++) {
        const py = pathY + dy;
        if (inBounds(x, py, width, height)) {
          if (grid[py][x] !== 'water-deep' && grid[py][x] !== 'water-shallow') {
            grid[py][x] = 'dirt';
          }
        }
      }
    }

    // ── Bridge placement ──
    if (bridgeY >= 0 && bridgeMinX < width) {
      // Find the actual water extent at the bridge rows
      let waterMinX = width, waterMaxX = -1;
      for (let x = 0; x < width; x++) {
        for (let dy = -1; dy <= 1; dy++) {
          const py = bridgeY + dy;
          if (inBounds(x, py, width, height) &&
              (grid[py][x] === 'water-deep' || grid[py][x] === 'water-shallow')) {
            waterMinX = Math.min(waterMinX, x);
            waterMaxX = Math.max(waterMaxX, x);
          }
        }
      }

      if (waterMinX < width) {
        // Bridge extends 1 tile into land on each side (for end caps)
        const bStartX = Math.max(0, waterMinX - 1);
        const bEndX = Math.min(width - 1, waterMaxX + 1);

        // Mark bridge cells as passable via override — keep underlying terrain intact
        for (let x = bStartX; x <= bEndX; x++) {
          for (let dy = -1; dy <= 1; dy++) {
            const py = bridgeY + dy;
            if (inBounds(x, py, width, height)) {
              moveCostOverride[py][x] = 1;  // passable, cost 1
              reserved.add(`${x},${py}`);
            }
          }
        }

        // Horizontal bridge atlas overlays — west cap + repeating middle + east cap
        // West cap: NW(terrain:16,16) W(terrain:16,17) SW(terrain:16,18)
        allOverlays.push(
          { x: bStartX, y: bridgeY - 1, atlas: 'terrain', col: 16, row: 16, scale: 1 },
          { x: bStartX, y: bridgeY,     atlas: 'terrain', col: 16, row: 17, scale: 1 },
          { x: bStartX, y: bridgeY + 1, atlas: 'terrain', col: 16, row: 18, scale: 1 },
        );

        // Middle sections — repeat center column (N + C only; no bottom rail in center)
        for (let x = bStartX + 1; x < bEndX; x++) {
          allOverlays.push(
            { x, y: bridgeY - 1, atlas: 'terrain', col: 17, row: 16, scale: 1 },
            { x, y: bridgeY,     atlas: 'terrain', col: 17, row: 17, scale: 1 },
          );
        }

        // East cap: NE(terrain:18,16) E(terrain:18,17) SE(terrain:18,18)
        allOverlays.push(
          { x: bEndX, y: bridgeY - 1, atlas: 'terrain', col: 18, row: 16, scale: 1 },
          { x: bEndX, y: bridgeY,     atlas: 'terrain', col: 18, row: 17, scale: 1 },
          { x: bEndX, y: bridgeY + 1, atlas: 'terrain', col: 18, row: 18, scale: 1 },
        );
      }
    }
  }

  // ── Step 5: Sub-theme specific terrain scatter ──
  if (sub === 'swamp') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (reserved.has(`${x},${y}`) || grid[y][x] !== 'mud') continue;
        const poolVal = fbmNoise(x * 0.15, y * 0.2, noiseSeedBase, 2);
        if (poolVal > 0.6 && rng.chance(0.5)) {
          grid[y][x] = 'water-shallow';
        } else if (rng.chance(0.06)) {
          grid[y][x] = 'grass-tall';
        }
      }
    }
    features.push({ name: 'Swamp Pools', type: 'water', positions: [], description: 'Stagnant pools of murky water' });
  } else if (sub === 'desert') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (reserved.has(`${x},${y}`) || grid[y][x] !== 'sand') continue;
        if (rng.chance(0.03)) grid[y][x] = 'dirt';
      }
    }
  } else if (sub === 'ruins') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (reserved.has(`${x},${y}`) || grid[y][x] === 'dirt' || grid[y][x] === 'water-deep' || grid[y][x] === 'water-shallow') continue;
        const clusterVal = fbmNoise(x * 0.18, y * 0.18, noiseSeedBase + 111, 2);
        if (clusterVal > 0.6 && rng.chance(0.3)) {
          grid[y][x] = rng.pick(['rubble', 'wall', 'rubble'] as TileType[]);
        } else if (rng.chance(0.04)) {
          grid[y][x] = 'grass-tall';
        } else if (rng.chance(0.02)) {
          grid[y][x] = 'dirt';
        }
      }
    }
    const gx = rng.int(3, Math.max(4, width - GRAVEYARD_STAMP.width - 3));
    const gy = rng.int(3, Math.max(4, height - GRAVEYARD_STAMP.height - 3));
    placeStamp(grid, GRAVEYARD_STAMP, gx, gy);
    features.push({ name: 'Ancient Graveyard', type: 'cover', positions: [{ x: gx + 3, y: gy + 2 }], description: 'Crumbling tombstones mark forgotten graves' });
  } else {
    // Forest, clearing, road, camp, lakeside: no individual tile scatter
    // Trees and other objects are handled entirely by atlas stamps in Step 10
  }

  // ── Step 6: Campsite placement (camp sub-theme or hasCampsite option) ──
  const wantCampsite = sub === 'camp' || options?.hasCampsite;
  if (wantCampsite) {
    const tentStamp = WILDERNESS_TENT;
    const campfireStamp = WILDERNESS_CAMPFIRE;

    // Position campsite near centre but offset from path
    const cx = Math.floor(width / 2);
    const pathAtCenter = pathYByCol[cx];
    let cy: number;
    if (pathAtCenter >= 0) {
      // Offset the campsite above or below the path by 4-5 tiles
      const offset = rng.pick([-1, 1]) * rng.int(4, 5);
      cy = pathAtCenter + offset;
      cy = Math.max(4, Math.min(height - 5, cy));
    } else {
      cy = Math.floor(height / 2);
    }

    const tentX = cx - Math.floor(tentStamp.width / 2);
    const tentY = cy - Math.floor(tentStamp.height / 2);

    // Clear an organic elliptical campsite area with dark dirt (mud)
    const campRadX = Math.floor(tentStamp.width / 2) + 2;   // ~3
    const campRadY = Math.floor(tentStamp.height / 2) + 2;  // ~3-4
    const campCX = tentX + tentStamp.width / 2 + 0.5;  // centre between tent and campfire
    const campCY = tentY + tentStamp.height / 2;
    for (let fy = Math.floor(campCY - campRadY - 1); fy <= Math.ceil(campCY + campRadY + 1); fy++) {
      for (let fx = Math.floor(campCX - campRadX - 1); fx <= Math.ceil(campCX + campRadX + 1); fx++) {
        if (!inBounds(fx, fy, width, height)) continue;
        // Ellipse distance with noise for organic edge
        const ndx = (fx - campCX) / campRadX;
        const ndy = (fy - campCY) / campRadY;
        const dist = ndx * ndx + ndy * ndy;
        // Noise at edge to break up the circle
        const edgeNoise = fbmNoise(fx * 0.4, fy * 0.4, noiseSeedBase + 999, 2) * 0.3;
        if (dist < 1.0 + edgeNoise) {
          grid[fy][fx] = 'dirt';
          reserved.add(`${fx},${fy}`);
        }
      }
    }

    // Place tent
    const tentOverlays = placeWildernessStamp(grid, tentStamp, tentX, tentY, width, height, rng);
    allOverlays.push(...tentOverlays);

    // Place campfire next to the tent
    const fireX = tentX + tentStamp.width + 1;
    const fireY = tentY + Math.floor(tentStamp.height / 2);
    if (inBounds(fireX, fireY, width, height)) {
      const fireOverlays = placeWildernessStamp(grid, campfireStamp, fireX, fireY, width, height, rng);
      allOverlays.push(...fireOverlays);
    }

    features.push({
      name: 'Campsite', type: 'cover',
      positions: [{ x: cx, y: cy }],
      description: 'A campsite with a tent and campfire',
    });
  }

  // ── Step 7: Clearing sub-theme ──
  if (sub === 'clearing') {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    for (let y = cy - 4; y <= cy + 4; y++) {
      for (let x = cx - 5; x <= cx + 5; x++) {
        if (inBounds(x, y, width, height)) {
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          if (dist < 5) grid[y][x] = 'grass';
        }
      }
    }
    for (let i = 0; i < rng.int(3, 6); i++) {
      const angle = rng.next() * Math.PI * 2;
      const lx = cx + Math.round(Math.cos(angle) * 4);
      const ly = cy + Math.round(Math.sin(angle) * 3);
      if (inBounds(lx, ly, width, height) && grid[ly][lx] === 'grass') {
        grid[ly][lx] = rng.chance(0.5) ? 'dirt' : 'stone';
      }
    }
  }

  // ── Step 8: Clear starting areas ──
  const clearArea = (cx: number, cy: number, radius: number) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (inBounds(x, y, width, height) && grid[y][x] !== 'water-deep' && grid[y][x] !== 'water-shallow' && grid[y][x] !== 'bridge') {
          grid[y][x] = baseTile;
        }
      }
    }
  };
  clearArea(playerStartX, playerStartY, 2);
  clearArea(enemyStartX, enemyStartY, 2);

  rooms.push({ id: 0, x: playerStartX - 2, y: playerStartY - 2, width: 5, height: 5, centerX: playerStartX, centerY: playerStartY, type: 'entrance' });
  rooms.push({ id: 1, x: enemyStartX - 2, y: enemyStartY - 2, width: 5, height: 5, centerX: enemyStartX, centerY: enemyStartY, type: 'boss' });

  // ── Step 9: Overlay terrain zones (flowers, tall grass, wheat, dark stone, cliff) ──
  // Build exclusion set for overlay zones (water + starting zones + paths)
  const overlayExcluded = new Set<string>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = grid[y][x];
      if (t === 'water-deep' || t === 'water-shallow' || t === 'dirt' ||
          t === 'wall' || t === 'rubble' || t === 'tombstone' || t === 'rock' ||
          t === 'tree' || t === 'bush' ||
          t === 'log' || t === 'mushroom' || t === 'chest') {
        overlayExcluded.add(`${x},${y}`);
      }
    }
  }
  for (const key of reserved) overlayExcluded.add(key);

  // Track cells claimed by zone overlays so later zones don't stack on top
  const zoneClaimed = new Set<string>();

  /** Mark cells from a zone as claimed so subsequent zones skip them */
  const claimZone = (zone: boolean[][]) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (zone[y][x]) zoneClaimed.add(`${x},${y}`);
      }
    }
  };

  // Flower meadow patches (on grass-based themes)
  if (sub !== 'desert' && sub !== 'swamp') {
    const flowerZone = generateNoiseZone(width, height, rng, {
      frequency: 0.15, threshold: 0.58,
      margin: 1, excluded: overlayExcluded, seedOffset: 1000,
    });
    pruneWeakZoneCells(flowerZone, width, height);
    const flowerOverlays = autoTileOverlayZone(flowerZone, OVERLAY_FLOWERS, width, height, rng);
    allOverlays.push(...flowerOverlays);
    claimZone(flowerZone);
  }

  // Wheat fields (forest / road / camp only — exclude cells claimed by other zones)
  if (sub === 'forest' || sub === 'road' || sub === 'camp') {
    const wheatExcluded = new Set([...overlayExcluded, ...zoneClaimed]);
    const wheatZone = generateNoiseZone(width, height, rng, {
      frequency: 0.22, threshold: 0.72,
      margin: 2, excluded: wheatExcluded, seedOffset: 3000,
    });
    pruneWeakZoneCells(wheatZone, width, height);
    const wheatOverlays = autoTileOverlayZone(wheatZone, OVERLAY_TALL_WHEAT, width, height, rng);
    allOverlays.push(...wheatOverlays);
    claimZone(wheatZone);
  }

  // Dark stone patches (ruins, cliff-like areas — exclude claimed cells)
  if (sub === 'ruins' || rng.chance(0.2)) {
    const stoneExcluded = new Set([...overlayExcluded, ...zoneClaimed]);
    const stoneZone = generateNoiseZone(width, height, rng, {
      frequency: 0.22, threshold: sub === 'ruins' ? 0.55 : 0.68,
      margin: 2, excluded: stoneExcluded, seedOffset: 4000,
    });
    pruneWeakZoneCells(stoneZone, width, height);
    const stoneOverlays = autoTileOverlayZone(stoneZone, OVERLAY_DARK_STONE, width, height, rng);
    allOverlays.push(...stoneOverlays);
    claimZone(stoneZone);
  }

  // Cliff overlays (rare, adds visual interest — exclude claimed cells)
  if (rng.chance(sub === 'ruins' ? 0.4 : 0.15)) {
    const cliffExcluded = new Set([...overlayExcluded, ...zoneClaimed]);
    const cliffZone = generateNoiseZone(width, height, rng, {
      frequency: 0.25, threshold: 0.72,
      margin: 3, excluded: cliffExcluded, seedOffset: 5000,
    });
    pruneWeakZoneCells(cliffZone, width, height);
    const cliffOverlays = autoTileOverlayZone(cliffZone, OVERLAY_CLIFF, width, height, rng);
    allOverlays.push(...cliffOverlays);
    claimZone(cliffZone);
  }

  // Sand patches (desert or near water)
  if (sub === 'desert') {
    const sandExcluded = new Set([...overlayExcluded, ...zoneClaimed]);
    const sandZone = generateNoiseZone(width, height, rng, {
      frequency: 0.12, threshold: 0.50,
      margin: 1, excluded: sandExcluded, seedOffset: 6000,
    });
    pruneWeakZoneCells(sandZone, width, height);
    const sandOverlays = autoTileOverlayZone(sandZone, OVERLAY_SAND, width, height, rng);
    allOverlays.push(...sandOverlays);
  }

  // ── Step 10: Place atlas object stamps ──
  // Record how many overlays existed before stamps — these are zone overlays.
  const zoneOverlayCount = allOverlays.length;

  /** Check if a stamp can be placed without overlapping reserved cells. */
  const canPlaceStamp = (stamp: WildernessAtlasStamp, ox: number, oy: number): boolean => {
    for (let sy = 0; sy < stamp.height; sy++) {
      for (let sx = 0; sx < stamp.width; sx++) {
        const gx = ox + sx;
        const gy = oy + sy;
        if (!inBounds(gx, gy, width, height)) return false;
        if (reserved.has(`${gx},${gy}`)) return false;
        const existing = grid[gy][gx];
        if (existing === 'water-deep' || existing === 'water-shallow' || existing === 'dirt'
            || existing === 'rock' || existing === 'tree' || existing === 'bush' || existing === 'log'
            || existing === 'pillar' || existing === 'statue' || existing === 'well' || existing === 'fountain'
            || existing === 'chest' || existing === 'barrel') return false;
      }
    }
    return true;
  };

  const markReserved = (stamp: WildernessAtlasStamp, ox: number, oy: number) => {
    for (let sy = -1; sy <= stamp.height; sy++) {
      for (let sx = -1; sx <= stamp.width; sx++) {
        reserved.add(`${ox + sx},${oy + sy}`);
      }
    }
  };

  /** Try to place N stamps of a given type at random positions. */
  const scatterStamps = (stamps: WildernessAtlasStamp[], count: number, marginOutside: number = 2) => {
    for (let i = 0; i < count; i++) {
      const stamp = rng.pick(stamps);
      if (stamp.subThemes && !stamp.subThemes.includes(sub)) continue;
      let placed = false;
      for (let attempt = 0; attempt < 30 && !placed; attempt++) {
        const ox = rng.int(marginOutside, width - stamp.width - marginOutside);
        const oy = rng.int(marginOutside, height - stamp.height - marginOutside);
        if (canPlaceStamp(stamp, ox, oy)) {
          const overlays = placeWildernessStamp(grid, stamp, ox, oy, width, height, rng);
          allOverlays.push(...overlays);
          markReserved(stamp, ox, oy);
          placed = true;
        }
      }
    }
  };

  /** Place a stamp adjacent to water (for boats, bridges, etc.) */
  const placeNearWater = (stamps: WildernessAtlasStamp[], count: number) => {
    // Collect water-edge positions
    const waterEdges: { x: number; y: number }[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (grid[y][x] === 'water-shallow') {
          // Check if any neighbor is grass/dirt (shoreline)
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (inBounds(nx, ny, width, height)) {
                const nt = grid[ny][nx];
                if (nt === 'grass' || nt === 'dirt' || nt === 'sand') {
                  waterEdges.push({ x, y });
                }
              }
            }
          }
        }
      }
    }
    if (waterEdges.length === 0) return;

    for (let i = 0; i < count; i++) {
      const stamp = rng.pick(stamps);
      if (stamp.subThemes && !stamp.subThemes.includes(sub)) continue;
      let placed = false;
      for (let attempt = 0; attempt < 20 && !placed; attempt++) {
        const edge = rng.pick(waterEdges);
        const ox = edge.x - Math.floor(stamp.width / 2);
        const oy = edge.y - Math.floor(stamp.height / 2);
        // For water stamps, allow placing on water
        let canPlace = true;
        for (let sy = 0; sy < stamp.height && canPlace; sy++) {
          for (let sx = 0; sx < stamp.width && canPlace; sx++) {
            const gx = ox + sx, gy = oy + sy;
            if (!inBounds(gx, gy, width, height)) canPlace = false;
            else if (reserved.has(`${gx},${gy}`)) canPlace = false;
          }
        }
        if (canPlace) {
          const overlays = placeWildernessStamp(grid, stamp, ox, oy, width, height, rng);
          allOverlays.push(...overlays);
          markReserved(stamp, ox, oy);
          placed = true;
        }
      }
    }
  };

  const isForesty = sub === 'forest' || sub === 'clearing' || sub === 'camp' || sub === 'road' || sub === 'lakeside';
  const isRuins = sub === 'ruins';

  // Large atlas trees — more stamps to compensate for removed single-tile scatter
  if (sub !== 'desert') {
    const largeTreeCount = density === 'dense' ? rng.int(25, 40) : density === 'sparse' ? rng.int(8, 14) : rng.int(16, 28);
    scatterStamps(ALL_WILDERNESS_STAMPS.largeTrees, largeTreeCount);
  }

  // Bush clusters
  if (sub !== 'desert') {
    const bushCount = density === 'dense' ? rng.int(3, 6) : density === 'sparse' ? rng.int(0, 2) : rng.int(2, 4);
    scatterStamps(ALL_WILDERNESS_STAMPS.bushes, bushCount);
  }

  // Rock formations
  if (sub !== 'clearing') {
    const rockCount = sub === 'desert' ? rng.int(3, 5) : rng.int(1, 3);
    scatterStamps(ALL_WILDERNESS_STAMPS.rocks, rockCount);
  }

  // Prevent accent stamps from landing on zone-claimed cells (flowers, wheat, etc.)
  for (const key of zoneClaimed) reserved.add(key);

  // Small accent objects (stumps, mushrooms, dirt patches, etc.)
  const accentCount = density === 'dense' ? rng.int(6, 12) : density === 'sparse' ? rng.int(2, 4) : rng.int(4, 8);
  scatterStamps(ALL_WILDERNESS_STAMPS.accents, accentCount);

  // Ruins-specific stamps
  if (isRuins) {
    scatterStamps(ALL_WILDERNESS_STAMPS.ruins, rng.int(4, 7));
  }

  // Structures (well, cave entrances)
  if (isForesty || isRuins) {
    scatterStamps(ALL_WILDERNESS_STAMPS.structures, rng.int(0, 2));
  }

  // Chests (GM-specified count)
  const chestCount = options?.chestCount ?? 0;
  if (chestCount > 0) {
    scatterStamps(ALL_WILDERNESS_STAMPS.chests, chestCount);
  }

  // Boats near water
  if (wantLake || options?.hasRiver) {
    placeNearWater(ALL_WILDERNESS_STAMPS.water, rng.int(0, 1));
  }

  // ── Post-stamp overlay cleanup ──
  // Stamps placed in Step 10 may have changed tiles to impassable types
  // (rock, tree, etc.) underneath zone overlays from Step 9.  Strip those
  // zone overlays, but KEEP stamp-originated overlays (index >= zoneOverlayCount)
  // since the stamp's own overlays are meant to sit on top of its baseTiles.
  const impassableForOverlay = new Set<string>(['rock', 'tree', 'wall', 'water-deep', 'water-shallow']);
  for (let i = zoneOverlayCount - 1; i >= 0; i--) {
    const ov = allOverlays[i];
    // Zone overlays may have fractional coords (subtiles) — map back to grid cell
    const gx = Math.floor(ov.x);
    const gy = Math.floor(ov.y);
    const t = grid[gy]?.[gx];
    // Don't strip overlays on cells with a moveCostOverride (e.g. bridge over water)
    if (t && impassableForOverlay.has(t) && moveCostOverride[gy]?.[gx] == null) {
      allOverlays.splice(i, 1);
    }
  }

  // ── Step 11: Theme names ──
  const namesBySub: Record<string, string[]> = {
    forest: ['Forest Clearing', 'Woodland Trail', 'Overgrown Path', 'Ancient Grove', 'Dark Forest Edge', 'Verdant Hollow'],
    clearing: ['Open Clearing', 'Grassy Glade', 'Sunny Meadow', 'Moonlit Field', 'Wildflower Meadow'],
    camp: ['Forest Camp', 'Roadside Campsite', 'Ranger\'s Bivouac', 'Abandoned Camp', 'Trailside Rest'],
    road: ['Country Road', 'Trade Route', 'Mountain Pass', 'Ancient Highway', 'Crossroads'],
    ruins: ['Forest Ruins', 'Crumbling Shrine', 'Overgrown Foundations', 'Lost Monument', 'Forgotten Temple'],
    swamp: ['Murky Swamp', 'Foggy Bog', 'Stagnant Marsh', 'Witch\'s Swamp', 'Mire of Shadows'],
    desert: ['Arid Wasteland', 'Sand Dunes', 'Desert Oasis', 'Scorched Plains', 'Sun-Bleached Expanse'],
    lakeside: ['Tranquil Lakeshore', 'Misty Lakeside', 'Forest Lake', 'Hidden Pond', 'Moonlit Shore'],
  };
  const names = namesBySub[sub] || namesBySub.forest!;

  return {
    width, height, tiles: grid, rooms, corridors: [], startingZones, features,
    overlays: allOverlays.length > 0 ? allOverlays : undefined,
    moveCostOverride,
    theme: 'wilderness', subTheme: sub,
    name: rng.pick(names),
    description: `A procedurally generated ${sub} encounter area`,
  };
}

// ─── Urban Generator ────────────────────────────────────────

export function generateUrban(
  width: number = 30,
  height: number = 20,
  seed?: number,
  options?: { subTheme?: string },
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const sub = options?.subTheme || 'city-streets';

  // ── Town Square / Plaza variant ────────────────────────────
  if (sub === 'town-square' || sub === 'plaza') {
    return generateUrbanPlaza(width, height, rng);
  }
  // ── Docks / Waterfront variant ─────────────────────────────
  if (sub === 'docks' || sub === 'waterfront') {
    return generateUrbanDocks(width, height, rng);
  }
  // ── Market variant ─────────────────────────────────────────
  if (sub === 'market') {
    return generateUrbanMarket(width, height, rng);
  }

  const grid = createGrid(width, height, 'cobblestone');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Generate buildings as wall blocks with interior floors + furniture
  const numBuildings = rng.int(4, 7);
  const buildingAttempts = numBuildings * 4;
  const occupiedCells = new Set<string>();

  // Assign building purposes for interior decoration
  const buildingPurposes = ['shop', 'home', 'storage', 'tavern', 'workshop'];

  for (let attempt = 0; attempt < buildingAttempts && rooms.length < numBuildings; attempt++) {
    const bw = rng.int(5, 9);
    const bh = rng.int(5, 8);
    const bx = rng.int(1, width - bw - 1);
    const by = rng.int(1, height - bh - 1);

    // Check for overlap with margin
    let overlaps = false;
    for (let y = by - 1; y <= by + bh; y++) {
      for (let x = bx - 1; x <= bx + bw; x++) {
        if (occupiedCells.has(`${x},${y}`)) { overlaps = true; break; }
      }
      if (overlaps) break;
    }
    if (overlaps) continue;

    // Place building walls and floor
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (y === by || y === by + bh - 1 || x === bx || x === bx + bw - 1) {
          grid[y][x] = 'wall';
        } else {
          grid[y][x] = 'floor';
        }
        occupiedCells.add(`${x},${y}`);
      }
    }

    // Add a door on a wall that faces a street (cobblestone / passable area)
    // Try each side, prefer ones where the outside neighbor is passable (street)
    const sides: Array<{ dx: number; dy: number; getX: () => number; getY: () => number }> = [
      { dx: 0, dy: -1, getX: () => rng.int(bx + 1, bx + bw - 2), getY: () => by },           // top wall, outside = north
      { dx: 0, dy:  1, getX: () => rng.int(bx + 1, bx + bw - 2), getY: () => by + bh - 1 },  // bottom wall, outside = south
      { dx: -1, dy: 0, getX: () => bx,          getY: () => rng.int(by + 1, by + bh - 2) },   // left wall, outside = west
      { dx:  1, dy: 0, getX: () => bx + bw - 1, getY: () => rng.int(by + 1, by + bh - 2) },   // right wall, outside = east
    ];
    // Shuffle and try sides that face a passable tile first
    const shuffledSides = rng.shuffle([...sides]);
    let doorPlaced = false;
    for (const side of shuffledSides) {
      const sx = side.getX();
      const sy = side.getY();
      const outsideX = sx + side.dx;
      const outsideY = sy + side.dy;
      if (inBounds(outsideX, outsideY, width, height) && isPassableTile(grid[outsideY][outsideX])) {
        grid[sy][sx] = 'door';
        doorPlaced = true;
        break;
      }
    }
    // Fallback: place door on first valid wall position
    if (!doorPlaced) {
      const fb = shuffledSides[0];
      grid[fb.getY()][fb.getX()] = 'door';
    }

    // Furnish building interior based on purpose
    const purpose = rng.pick(buildingPurposes);
    const innerX1 = bx + 1;
    const innerY1 = by + 1;
    const innerX2 = bx + bw - 2;
    const innerY2 = by + bh - 2;

    switch (purpose) {
      case 'shop':
        // Counter near door, barrels in back corner
        if (inBounds(innerX1, innerY1, width, height)) grid[innerY1][innerX1] = 'counter';
        if (inBounds(innerX1 + 1, innerY1, width, height) && grid[innerY1][innerX1 + 1] === 'floor') grid[innerY1][innerX1 + 1] = 'counter';
        if (inBounds(innerX2, innerY2, width, height) && grid[innerY2][innerX2] === 'floor') grid[innerY2][innerX2] = 'barrel';
        if (inBounds(innerX2 - 1, innerY2, width, height) && grid[innerY2][innerX2 - 1] === 'floor') grid[innerY2][innerX2 - 1] = 'crate';
        break;
      case 'home':
        // Bed in corner, table + chair in center, rug
        if (inBounds(innerX2, innerY1, width, height)) grid[innerY1][innerX2] = 'bed';
        if (inBounds(innerX1 + 1, innerY1 + 1, width, height) && grid[innerY1 + 1][innerX1 + 1] === 'floor') grid[innerY1 + 1][innerX1 + 1] = 'table';
        if (inBounds(innerX1 + 2, innerY1 + 1, width, height) && grid[innerY1 + 1][innerX1 + 2] === 'floor') grid[innerY1 + 1][innerX1 + 2] = 'chair';
        if (inBounds(innerX1, innerY2, width, height) && grid[innerY2][innerX1] === 'floor') grid[innerY2][innerX1] = 'rug';
        break;
      case 'storage':
        // Fill with barrels and crates
        for (let fy = innerY1; fy <= innerY2; fy++) {
          for (let fx = innerX1; fx <= innerX2; fx++) {
            if (grid[fy][fx] === 'floor' && rng.chance(0.4)) {
              grid[fy][fx] = rng.chance(0.5) ? 'barrel' : 'crate';
            }
          }
        }
        break;
      case 'tavern':
        // Counter at back, tables + chairs
        for (let fx = innerX1; fx <= innerX2; fx++) {
          if (grid[innerY1][fx] === 'floor') grid[innerY1][fx] = 'counter';
        }
        // Tables in the middle
        const midY = Math.floor((innerY1 + innerY2) / 2);
        if (inBounds(innerX1 + 1, midY, width, height) && grid[midY][innerX1 + 1] === 'floor') grid[midY][innerX1 + 1] = 'table';
        if (inBounds(innerX1 + 2, midY, width, height) && grid[midY][innerX1 + 2] === 'floor') grid[midY][innerX1 + 2] = 'chair';
        if (inBounds(innerX2 - 1, midY, width, height) && grid[midY][innerX2 - 1] === 'floor') grid[midY][innerX2 - 1] = 'table';
        if (inBounds(innerX2, midY, width, height) && grid[midY][innerX2] === 'floor') grid[midY][innerX2] = 'chair';
        // Barrels behind counter (in corners behind the bar)
        if (inBounds(innerX1, innerY1, width, height) && grid[innerY1][innerX1] === 'counter') {
          // Place barrels in corners behind the counter row
          if (inBounds(innerX2, innerY1, width, height) && grid[innerY1][innerX2] === 'floor') grid[innerY1][innerX2] = 'barrel';
          if (inBounds(innerX2 - 1, innerY1, width, height) && grid[innerY1][innerX2 - 1] === 'floor') grid[innerY1][innerX2 - 1] = 'barrel';
        }
        break;
      case 'workshop':
        // Anvil or workbench, barrels
        if (inBounds(innerX1 + 1, innerY1 + 1, width, height) && grid[innerY1 + 1][innerX1 + 1] === 'floor') grid[innerY1 + 1][innerX1 + 1] = 'anvil';
        if (inBounds(innerX2, innerY1, width, height) && grid[innerY1][innerX2] === 'floor') grid[innerY1][innerX2] = 'barrel';
        if (inBounds(innerX1, innerY2, width, height) && grid[innerY2][innerX1] === 'floor') grid[innerY2][innerX1] = 'crate';
        break;
    }

    const room: Room = {
      id: rooms.length,
      x: bx + 1, y: by + 1,
      width: bw - 2, height: bh - 2,
      centerX: Math.floor(bx + bw / 2),
      centerY: Math.floor(by + bh / 2),
      type: 'normal',
    };
    rooms.push(room);
  }

  // Streets: cobblestone with gutters and variation
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'cobblestone') {
        if (rng.chance(0.04)) grid[y][x] = 'stone';
        else if (rng.chance(0.01)) grid[y][x] = 'rubble';
      }
    }
  }

  // Lamp posts along the streets
  for (let x = 3; x < width - 3; x += rng.int(5, 8)) {
    for (const ly of [0, height - 1]) {
      if (inBounds(x, ly, width, height) && grid[ly][x] === 'cobblestone') {
        grid[ly][x] = 'lamp-post';
      }
    }
  }

  // Street-side details: barrel clusters, crates
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'cobblestone') {
        // Place barrels/crates next to buildings
        const adjacentWall = [[-1,0],[1,0],[0,-1],[0,1]].some(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          return inBounds(nx, ny, width, height) && grid[ny][nx] === 'wall';
        });
        if (adjacentWall && rng.chance(0.08)) {
          grid[y][x] = rng.pick(['barrel', 'crate'] as TileType[]);
        }
      }
    }
  }

  features.push({ name: 'City Street', type: 'cover', positions: [], description: 'Cobblestone streets lined with buildings and lamp posts' });

  // Starting zones
  const cy = Math.floor(height / 2);
  const startingZones = {
    players: [
      { x: 1, y: cy }, { x: 2, y: cy },
      { x: 1, y: cy + 1 }, { x: 2, y: cy + 1 },
    ],
    enemies: [
      { x: width - 2, y: cy }, { x: width - 3, y: cy },
      { x: width - 2, y: cy + 1 }, { x: width - 3, y: cy + 1 },
    ],
  };

  // Ensure starting zones are passable
  for (const pos of [...startingZones.players, ...startingZones.enemies]) {
    if (grid[pos.y]?.[pos.x] && grid[pos.y][pos.x] !== 'floor' && grid[pos.y][pos.x] !== 'cobblestone') {
      grid[pos.y][pos.x] = 'cobblestone';
    }
  }

  const names = ['Back Alley', 'City Block', 'Merchant District',
    'Warehouse Row', 'Nobles\' Quarter', 'Temple District', 'Lower Quarter', 'Guild Row'];

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'urban', subTheme: 'city-streets',
    name: rng.pick(names),
    description: `An urban encounter area with ${rooms.length} furnished buildings and cobblestone streets`,
  };
}

// ─── Urban Sub-Generators ───────────────────────────────────

/** Town square / plaza: big open area with buildings around the edges */
/** Town square / plaza: big open area with buildings around the edges, fountain, well, lamp posts */
function generateUrbanPlaza(width: number, height: number, rng: SeededRandom): ProceduralMap {
  const grid = createGrid(width, height, 'cobblestone');
  const rooms: Room[] = [];
  const features: MapFeature[] = [];

  // Central plaza area with decorative floor
  const plazaMargin = 5;
  const plazaX = plazaMargin;
  const plazaY = plazaMargin;
  const plazaW = width - plazaMargin * 2;
  const plazaH = height - plazaMargin * 2;

  for (let y = plazaY; y < plazaY + plazaH; y++) {
    for (let x = plazaX; x < plazaX + plazaW; x++) {
      // Cobblestone with occasional stone variation
      grid[y][x] = (x + y) % 3 === 0 ? 'stone' : 'cobblestone';
    }
  }

  // Central fountain using stamp
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  placeStamp(grid, FOUNTAIN_STAMP, cx - 2, cy - 2);
  features.push({ name: 'Town Fountain', type: 'water', positions: [{ x: cx, y: cy }], description: 'An ornate stone fountain at the center of the plaza' });

  // Well on one side of the plaza
  const wellX = rng.chance(0.5) ? plazaX + 1 : plazaX + plazaW - 4;
  const wellY = rng.int(plazaY + 1, plazaY + plazaH - 4);
  placeStamp(grid, WELL_STAMP, wellX, wellY);
  features.push({ name: 'Town Well', type: 'water', positions: [{ x: wellX + 1, y: wellY + 1 }], description: 'A stone well with a wooden bucket' });

  // Lamp posts at corners of the plaza
  const lampPositions = [
    { x: plazaX, y: plazaY },
    { x: plazaX + plazaW - 1, y: plazaY },
    { x: plazaX, y: plazaY + plazaH - 1 },
    { x: plazaX + plazaW - 1, y: plazaY + plazaH - 1 },
  ];
  for (const lp of lampPositions) {
    if (inBounds(lp.x, lp.y, width, height)) grid[lp.y][lp.x] = 'lamp-post';
  }

  // Scatter barrels and crates around the edges of the plaza
  for (let i = 0; i < rng.int(4, 8); i++) {
    const sx = rng.int(plazaX, plazaX + plazaW - 1);
    const sy = rng.pick([plazaY, plazaY + plazaH - 1]);
    if (inBounds(sx, sy, width, height) && grid[sy][sx] === 'cobblestone') {
      grid[sy][sx] = rng.chance(0.5) ? 'barrel' : 'crate';
    }
  }

  // Town Hall building (largest, at the top center)
  const hallW = Math.min(11, width - 4);
  const hallX = Math.floor((width - hallW) / 2);
  if (hallW >= 9 && plazaMargin >= 4) {
    placeStamp(grid, TOWN_HALL_STAMP, hallX, 0);
    rooms.push({
      id: rooms.length, x: hallX + 1, y: 1,
      width: hallW - 2, height: TOWN_HALL_STAMP.height - 2,
      centerX: hallX + Math.floor(hallW / 2), centerY: Math.floor(TOWN_HALL_STAMP.height / 2),
      type: 'entrance',
    });
    features.push({ name: 'Town Hall', type: 'wall', positions: [{ x: hallX + Math.floor(hallW / 2), y: 0 }], description: 'The town hall, with carpeted aisles and a central statue' });
  }

  // Other buildings along edges
  const buildingDefs: Array<{ bx: number; by: number; bw: number; bh: number; facing: string }> = [];

  // Bottom edge buildings
  for (let bx = 1; bx < width - 4; ) {
    const bw = rng.int(5, 8);
    if (bx + bw >= width - 1) break;
    const bh = rng.int(3, plazaMargin);
    buildingDefs.push({ bx, by: height - bh, bw, bh, facing: 'north' });
    bx += bw + rng.int(1, 2);
  }
  // Left edge buildings
  for (let by = plazaMargin + 1; by < height - plazaMargin - 3; ) {
    const bh = rng.int(4, 6);
    if (by + bh >= height - plazaMargin) break;
    const bw = rng.int(3, plazaMargin);
    buildingDefs.push({ bx: 0, by, bw, bh, facing: 'east' });
    by += bh + rng.int(1, 2);
  }
  // Right edge buildings
  for (let by = plazaMargin + 1; by < height - plazaMargin - 3; ) {
    const bh = rng.int(4, 6);
    if (by + bh >= height - plazaMargin) break;
    const bw = rng.int(3, plazaMargin);
    buildingDefs.push({ bx: width - bw, by, bw, bh, facing: 'west' });
    by += bh + rng.int(1, 2);
  }

  for (const b of buildingDefs) {
    // Build walls
    for (let y = b.by; y < b.by + b.bh; y++) {
      for (let x = b.bx; x < b.bx + b.bw; x++) {
        if (!inBounds(x, y, width, height)) continue;
        if (y === b.by || y === b.by + b.bh - 1 || x === b.bx || x === b.bx + b.bw - 1) {
          grid[y][x] = 'wall';
        } else {
          grid[y][x] = 'floor';
        }
      }
    }
    // Door facing the plaza
    let doorX: number, doorY: number;
    switch (b.facing) {
      case 'north': doorX = Math.floor(b.bx + b.bw / 2); doorY = b.by; break;
      case 'east':  doorX = b.bx + b.bw - 1; doorY = Math.floor(b.by + b.bh / 2); break;
      case 'west':  doorX = b.bx; doorY = Math.floor(b.by + b.bh / 2); break;
      default:      doorX = Math.floor(b.bx + b.bw / 2); doorY = b.by + b.bh - 1; break;
    }
    if (inBounds(doorX, doorY, width, height)) grid[doorY][doorX] = 'door';

    // Interior furnishing — add tables, counters, barrels inside buildings
    const interiorMinX = b.bx + 1;
    const interiorMinY = b.by + 1;
    const interiorMaxX = b.bx + b.bw - 2;
    const interiorMaxY = b.by + b.bh - 2;
    if (interiorMaxX > interiorMinX && interiorMaxY > interiorMinY) {
      const buildingUse = rng.pick(['shop', 'home', 'storage']);
      if (buildingUse === 'shop') {
        // Counter near the door side
        for (let cx = interiorMinX; cx <= interiorMaxX; cx++) {
          if (inBounds(cx, interiorMinY, width, height) && grid[interiorMinY][cx] === 'floor') {
            grid[interiorMinY][cx] = 'counter';
          }
        }
      } else if (buildingUse === 'home') {
        if (inBounds(interiorMaxX, interiorMinY, width, height)) grid[interiorMinY][interiorMaxX] = 'bed';
        if (inBounds(interiorMinX, interiorMaxY, width, height)) grid[interiorMaxY][interiorMinX] = 'chair';
        if (inBounds(interiorMinX + 1, interiorMaxY, width, height) && grid[interiorMaxY][interiorMinX + 1] === 'floor') grid[interiorMaxY][interiorMinX + 1] = 'table';
      } else {
        // Storage
        if (inBounds(interiorMinX, interiorMinY, width, height)) grid[interiorMinY][interiorMinX] = 'barrel';
        if (inBounds(interiorMaxX, interiorMinY, width, height)) grid[interiorMinY][interiorMaxX] = 'crate';
        if (inBounds(interiorMinX, interiorMaxY, width, height)) grid[interiorMaxY][interiorMinX] = 'crate';
      }
    }

    rooms.push({
      id: rooms.length, x: b.bx + 1, y: b.by + 1,
      width: Math.max(1, b.bw - 2), height: Math.max(1, b.bh - 2),
      centerX: Math.floor(b.bx + b.bw / 2), centerY: Math.floor(b.by + b.bh / 2),
      type: 'normal',
    });
  }

  // Guard post near one corner of the plaza
  if (plazaW > GUARD_POST_STAMP.width + 4 && plazaH > GUARD_POST_STAMP.height + 4) {
    const gpCorner = rng.int(0, 3);
    let gpX: number, gpY: number;
    switch (gpCorner) {
      case 0: gpX = plazaX + 1; gpY = plazaY + 1; break;
      case 1: gpX = plazaX + plazaW - GUARD_POST_STAMP.width - 1; gpY = plazaY + 1; break;
      case 2: gpX = plazaX + 1; gpY = plazaY + plazaH - GUARD_POST_STAMP.height - 1; break;
      default: gpX = plazaX + plazaW - GUARD_POST_STAMP.width - 1; gpY = plazaY + plazaH - GUARD_POST_STAMP.height - 1; break;
    }
    placeStamp(grid, GUARD_POST_STAMP, gpX, gpY);
    features.push({ name: 'Guard Post', type: 'cover', positions: [{ x: gpX + 2, y: gpY + 2 }], description: 'A small guard post watching over the plaza' });
  }

  const startingZones = {
    players: [
      { x: plazaX + 1, y: cy }, { x: plazaX + 2, y: cy },
      { x: plazaX + 1, y: cy + 1 }, { x: plazaX + 2, y: cy + 1 },
    ],
    enemies: [
      { x: plazaX + plazaW - 2, y: cy }, { x: plazaX + plazaW - 3, y: cy },
      { x: plazaX + plazaW - 2, y: cy + 1 }, { x: plazaX + plazaW - 3, y: cy + 1 },
    ],
  };

  const names = ['Town Square', 'Central Plaza', 'Market Square', 'Village Green', 'Civic Plaza', 'Grand Piazza'];
  return {
    width, height, tiles: grid, rooms, corridors: [], startingZones, features,
    theme: 'urban', subTheme: 'town-square',
    name: rng.pick(names),
    description: `An open town square with a grand fountain, well, and surrounding buildings`,
  };
}

/** Docks / waterfront: water on one side, warehouses, piers with planks, cranes, crates */
function generateUrbanDocks(width: number, height: number, rng: SeededRandom): ProceduralMap {
  const grid = createGrid(width, height, 'cobblestone');
  const rooms: Room[] = [];
  const features: MapFeature[] = [];

  // Water on the right side (1/3 of width)
  const waterStart = Math.floor(width * 0.65);
  for (let y = 0; y < height; y++) {
    for (let x = waterStart; x < width; x++) {
      grid[y][x] = x === waterStart ? 'water-shallow' : 'water-deep';
    }
  }

  // Wooden dock edge — planks along the waterline
  for (let y = 0; y < height; y++) {
    if (waterStart - 1 >= 0) grid[y][waterStart - 1] = 'planks';
    if (waterStart - 2 >= 0 && rng.chance(0.5)) grid[y][waterStart - 2] = 'planks';
  }

  // Piers jutting into the water with wider plank walkways
  const numPiers = rng.int(3, 5);
  const pierYs: number[] = [];
  for (let i = 0; i < numPiers; i++) {
    const py = rng.int(2, height - 4);
    // Avoid overlapping piers
    if (pierYs.some(prev => Math.abs(prev - py) < 3)) continue;
    pierYs.push(py);
    // Pier is 2 tiles wide extending into the water
    for (let x = waterStart - 2; x < Math.min(waterStart + 5, width); x++) {
      if (inBounds(x, py, width, height)) grid[py][x] = 'planks';
      if (inBounds(x, py + 1, width, height)) grid[py + 1][x] = 'planks';
    }
    // Mooring posts at the end of each pier
    const postX = Math.min(waterStart + 4, width - 1);
    if (inBounds(postX, py, width, height)) grid[py][postX] = 'fence';

    // Crates/barrels at the pier base
    if (inBounds(waterStart - 3, py, width, height) && grid[py][waterStart - 3] === 'cobblestone') {
      grid[py][waterStart - 3] = rng.chance(0.5) ? 'crate' : 'barrel';
    }
    if (inBounds(waterStart - 3, py + 1, width, height) && grid[py + 1][waterStart - 3] === 'cobblestone') {
      grid[py + 1][waterStart - 3] = rng.chance(0.5) ? 'barrel' : 'crate';
    }
  }

  // Crane stamps near the dock edge
  if (pierYs.length > 0) {
    const craneY = pierYs[0] - 2;
    if (craneY >= 0) {
      placeStamp(grid, DOCK_CRANE_STAMP, waterStart - 4, craneY);
    }
  }

  // Warehouses on the left side with proper interiors
  const warehouseArea = Math.floor(width * 0.55);
  for (let bx = 1; bx < warehouseArea - 5; ) {
    const bw = rng.int(6, 9);
    const bh = rng.int(5, 8);
    const by = rng.int(1, height - bh - 1);
    if (bx + bw >= warehouseArea) break;

    // Check overlap with existing rooms
    let overlaps = false;
    for (const r of rooms) {
      if (bx < r.x + r.width + 2 && bx + bw > r.x - 2 && by < r.y + r.height + 2 && by + bh > r.y - 2) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) { bx += 3; continue; } // OVERLAP CHECK

    // Create warehouse walls and floor
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (y === by || y === by + bh - 1 || x === bx || x === bx + bw - 1) {
          grid[y][x] = 'wall';
        } else {
          grid[y][x] = 'planks'; // Wooden warehouse floor
        }
      }
    }

    // Door facing east (toward dock)
    const doorY = Math.floor(by + bh / 2);
    grid[doorY][bx + bw - 1] = 'door';

    // Try DOCK_WAREHOUSE_STAMP for larger warehouses, else manual scatter
    if (bw - 2 >= DOCK_WAREHOUSE_STAMP.width && bh - 2 >= DOCK_WAREHOUSE_STAMP.height && rng.chance(0.6)) {
      const ox = bx + Math.floor((bw - DOCK_WAREHOUSE_STAMP.width) / 2);
      const oy = by + Math.floor((bh - DOCK_WAREHOUSE_STAMP.height) / 2);
      placeStamp(grid, DOCK_WAREHOUSE_STAMP, ox, oy);
    } else {
      // Manual: crates and barrels stacked along walls
      for (let y = by + 1; y < by + bh - 1; y++) {
        if (inBounds(bx + 1, y, width, height) && grid[y][bx + 1] === 'planks' && rng.chance(0.6)) {
          grid[y][bx + 1] = rng.chance(0.5) ? 'crate' : 'barrel';
        }
        if (inBounds(bx + bw - 2, y, width, height) && grid[y][bx + bw - 2] === 'planks' && rng.chance(0.4)) {
          grid[y][bx + bw - 2] = rng.chance(0.5) ? 'crate' : 'barrel';
        }
      }
    }

    rooms.push({
      id: rooms.length, x: bx + 1, y: by + 1,
      width: bw - 2, height: bh - 2,
      centerX: Math.floor(bx + bw / 2), centerY: Math.floor(by + bh / 2),
      type: 'normal',
    });
    bx += bw + rng.int(2, 3);
  }

  // Lamp posts along the dock road
  for (let y = 2; y < height - 2; y += rng.int(4, 6)) {
    const lampX = Math.floor(warehouseArea + (waterStart - warehouseArea) / 2);
    if (inBounds(lampX, y, width, height) && grid[y][lampX] === 'cobblestone') {
      grid[y][lampX] = 'lamp-post';
    }
  }

  // Scatter loose crates/rope along the dockside
  for (let y = 0; y < height; y++) {
    for (let x = warehouseArea; x < waterStart - 2; x++) {
      if (grid[y][x] === 'cobblestone' && rng.chance(0.03)) {
        grid[y][x] = rng.pick(['barrel', 'crate', 'crate'] as TileType[]);
      }
    }
  }

  features.push({ name: 'Harbor', type: 'water', positions: [], description: 'Harbor waters along the dockside' });
  features.push({ name: 'Dockside Crane', type: 'cover', positions: [], description: 'A wooden crane for loading cargo' });

  const startingZones = {
    players: [
      { x: 2, y: Math.floor(height / 2) }, { x: 3, y: Math.floor(height / 2) },
      { x: 2, y: Math.floor(height / 2) + 1 }, { x: 3, y: Math.floor(height / 2) + 1 },
    ],
    enemies: [
      { x: waterStart - 3, y: Math.floor(height / 2) }, { x: waterStart - 4, y: Math.floor(height / 2) },
      { x: waterStart - 3, y: Math.floor(height / 2) + 1 }, { x: waterStart - 4, y: Math.floor(height / 2) + 1 },
    ],
  };

  const names = ['Dockside', 'Harbor Front', 'Fisherman\'s Wharf', 'Merchant Pier', 'Seaside Warehouses', 'Smuggler\'s Dock'];
  return {
    width, height, tiles: grid, rooms, corridors: [], startingZones, features,
    theme: 'urban', subTheme: 'docks',
    name: rng.pick(names),
    description: `A waterfront dock area with warehouses, piers, and a cargo crane`,
  };
}

/** Market: open area with proper stalls, awnings, barrels, crates, and a central feature */
function generateUrbanMarket(width: number, height: number, rng: SeededRandom): ProceduralMap {
  const grid = createGrid(width, height, 'cobblestone');
  const rooms: Room[] = [];
  const features: MapFeature[] = [];

  // Market floor — cobblestone with occasional dirt patches
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (rng.chance(0.08)) grid[y][x] = 'stone';
      else if (rng.chance(0.03)) grid[y][x] = 'dirt';
    }
  }

  // Central well or fountain
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  if (rng.chance(0.5)) {
    placeStamp(grid, WELL_STAMP, cx - 1, cy - 1);
    features.push({ name: 'Market Well', type: 'water', positions: [{ x: cx, y: cy }], description: 'A well in the center of the market' });
  } else {
    // Simple fountain
    grid[cy][cx] = 'fountain';
    grid[cy - 1][cx] = 'water-shallow';
    grid[cy + 1][cx] = 'water-shallow';
    grid[cy][cx - 1] = 'water-shallow';
    grid[cy][cx + 1] = 'water-shallow';
    features.push({ name: 'Market Fountain', type: 'water', positions: [{ x: cx, y: cy }], description: 'A small fountain surrounded by market stalls' });
  }

  // Market stalls using stamps — arranged in rows
  const stallPositions: Array<{ x: number; y: number }> = [];
  const occupiedCells = new Set<string>();

  // Mark center area as occupied
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      occupiedCells.add(`${cx + dx},${cy + dy}`);
    }
  }

  // Place stalls in organized rows
  const numStalls = rng.int(6, 12);
  const stallRows = [
    { startY: 2, endY: cy - 3 },      // Top row
    { startY: cy + 3, endY: height - 3 }, // Bottom row
  ];

  for (const row of stallRows) {
    let stallX = 2;
    while (stallX < width - 6 && stallPositions.length < numStalls) {
      const sy = rng.int(row.startY, Math.max(row.startY, row.endY - 3));

      // Check overlap
      let overlaps = false;
      for (let dy = -1; dy <= 3; dy++) {
        for (let dx = -1; dx <= 5; dx++) {
          if (occupiedCells.has(`${stallX + dx},${sy + dy}`)) { overlaps = true; break; }
        }
        if (overlaps) break;
      }
      if (overlaps) { stallX += 2; continue; }

      // Place stall stamp
      placeStamp(grid, MARKET_STALL_STAMP, stallX, sy);

      // Add goods around the stall — barrels and crates
      if (inBounds(stallX - 1, sy, width, height) && grid[sy][stallX - 1] === 'cobblestone') {
        grid[sy][stallX - 1] = rng.chance(0.5) ? 'barrel' : 'crate';
      }
      if (inBounds(stallX + 4, sy, width, height) && grid[sy][stallX + 4] === 'cobblestone') {
        grid[sy][stallX + 4] = rng.chance(0.5) ? 'barrel' : 'crate';
      }

      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          occupiedCells.add(`${stallX + dx},${sy + dy}`);
        }
      }

      stallPositions.push({ x: stallX, y: sy });
      rooms.push({
        id: rooms.length, x: stallX, y: sy, width: 4, height: 3,
        centerX: stallX + 2, centerY: sy + 1,
        type: 'normal',
      });

      stallX += rng.int(5, 7);
    }
  }

  // Lamp posts at intervals
  for (let x = 3; x < width - 3; x += rng.int(6, 9)) {
    const ly = rng.pick([1, height - 2]);
    if (inBounds(x, ly, width, height) && grid[ly][x] === 'cobblestone') {
      grid[ly][x] = 'lamp-post';
    }
  }

  // Scatter loose goods and hay bales for cover
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'cobblestone') {
        if (rng.chance(0.015)) grid[y][x] = rng.pick(['barrel', 'crate', 'hay'] as TileType[]);
      }
    }
  }

  features.push({ name: 'Market Stalls', type: 'cover', positions: stallPositions, description: `${stallPositions.length} vendor stalls with goods and awnings` });

  const startingZones = {
    players: [
      { x: 1, y: cy }, { x: 2, y: cy }, { x: 1, y: cy + 1 }, { x: 2, y: cy + 1 },
    ],
    enemies: [
      { x: width - 2, y: cy }, { x: width - 3, y: cy },
      { x: width - 2, y: cy + 1 }, { x: width - 3, y: cy + 1 },
    ],
  };

  const names = ['Busy Market', 'Open Bazaar', 'Merchant\'s Row', 'Street Market', 'Trading Post', 'Grand Bazaar'];
  return {
    width, height, tiles: grid, rooms, corridors: [], startingZones, features,
    theme: 'urban', subTheme: 'market',
    name: rng.pick(names),
    description: `An open market area with ${stallPositions.length} vendor stalls and a central well`,
  };
}

// ─── Indoor Generator ───────────────────────────────────────

export function generateIndoor(
  width: number = 24,
  height: number = 18,
  seed?: number,
  options?: { type?: 'manor' | 'temple' | 'tavern' | 'library' | 'hall' | 'arena' }
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const buildingType = options?.type ?? rng.pick(['manor', 'temple', 'tavern', 'library'] as const);

  // All walls, then carve interior
  const grid = createGrid(width, height, 'void');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Outer building shell
  const marginX = 2;
  const marginY = 2;
  const buildW = width - marginX * 2;
  const buildH = height - marginY * 2;

  for (let y = marginY; y < marginY + buildH; y++) {
    for (let x = marginX; x < marginX + buildW; x++) {
      if (y === marginY || y === marginY + buildH - 1 || x === marginX || x === marginX + buildW - 1) {
        grid[y][x] = 'wall';
      } else {
        grid[y][x] = 'floor';
      }
    }
  }

  // Add windows to outer walls (every 4-5 tiles, not on corners)
  const windowSpacing = rng.int(3, 5);
  for (let x = marginX + 2; x < marginX + buildW - 2; x += windowSpacing) {
    if (grid[marginY][x] === 'wall') grid[marginY][x] = 'window';
    if (grid[marginY + buildH - 1][x] === 'wall') grid[marginY + buildH - 1][x] = 'window';
  }
  for (let y = marginY + 2; y < marginY + buildH - 2; y += windowSpacing) {
    if (grid[y][marginX] === 'wall') grid[y][marginX] = 'window';
    if (grid[y][marginX + buildW - 1] === 'wall') grid[y][marginX + buildW - 1] = 'window';
  }

  // Internal room divisions
  const interiorX = marginX + 1;
  const interiorY = marginY + 1;
  const interiorW = buildW - 2;
  const interiorH = buildH - 2;

  // Create rooms by placing internal walls
  const roomDefs: Array<{ x: number; y: number; w: number; h: number; type: string }> = [];

  if (buildingType === 'hall' || buildingType === 'arena') {
    // ONE big open room — throne room, banquet hall, gladiator arena
    roomDefs.push({ x: interiorX, y: interiorY, w: interiorW, h: interiorH, type: 'hall' });

    // Pillars along the sides for a grand hall feel
    if (interiorW > 6 && interiorH > 6) {
      const pillarSpacing = buildingType === 'arena' ? 4 : 3;
      for (let x = interiorX + 2; x < interiorX + interiorW - 2; x += pillarSpacing) {
        if (inBounds(x, interiorY + 1, width, height) && grid[interiorY + 1][x] === 'floor') {
          grid[interiorY + 1][x] = 'pillar';
        }
        if (inBounds(x, interiorY + interiorH - 2, width, height) && grid[interiorY + interiorH - 2][x] === 'floor') {
          grid[interiorY + interiorH - 2][x] = 'pillar';
        }
      }
    }

    // Carpet runner through the center for hall, sand/dirt floor for arena
    if (buildingType === 'hall') {
      for (let x = interiorX; x < interiorX + interiorW; x++) {
        const cy = interiorY + Math.floor(interiorH / 2);
        if (inBounds(x, cy, width, height) && grid[cy][x] === 'floor') grid[cy][x] = 'carpet';
        if (inBounds(x, cy - 1, width, height) && grid[cy - 1][x] === 'floor') grid[cy - 1][x] = 'carpet';
      }
    } else {
      // Arena: dirt/sand floor
      for (let y = interiorY; y < interiorY + interiorH; y++) {
        for (let x = interiorX; x < interiorX + interiorW; x++) {
          if (grid[y][x] === 'floor') grid[y][x] = rng.chance(0.3) ? 'sand' : 'dirt';
        }
      }
    }
  } else if (buildingType === 'manor') {
    // Main hall in the center
    const hallW = Math.floor(interiorW * 0.4);
    const hallX = interiorX + Math.floor((interiorW - hallW) / 2);
    roomDefs.push({ x: hallX, y: interiorY, w: hallW, h: interiorH, type: 'hall' });

    // Left wing rooms
    const leftW = hallX - interiorX;
    if (leftW > 3) {
      const splitY = interiorY + Math.floor(interiorH / 2);
      roomDefs.push({ x: interiorX, y: interiorY, w: leftW, h: splitY - interiorY, type: 'room' });
      roomDefs.push({ x: interiorX, y: splitY, w: leftW, h: interiorH - (splitY - interiorY), type: 'room' });
    }

    // Right wing rooms
    const rightX = hallX + hallW;
    const rightW = interiorX + interiorW - rightX;
    if (rightW > 3) {
      const splitY = interiorY + Math.floor(interiorH / 2);
      roomDefs.push({ x: rightX, y: interiorY, w: rightW, h: splitY - interiorY, type: 'room' });
      roomDefs.push({ x: rightX, y: splitY, w: rightW, h: interiorH - (splitY - interiorY), type: 'room' });
    }
  } else {
    // Generic room generation: divide space into 3-5 rooms
    const numRooms = rng.int(3, 5);
    let currentX = interiorX;
    const sliceW = Math.floor(interiorW / numRooms);

    for (let i = 0; i < numRooms; i++) {
      const rw = i === numRooms - 1 ? (interiorX + interiorW - currentX) : sliceW;
      if (rw > 2) {
        // Split vertically sometimes
        if (rng.chance(0.4) && interiorH > 8) {
          const splitY = interiorY + Math.floor(interiorH / 2);
          roomDefs.push({ x: currentX, y: interiorY, w: rw, h: splitY - interiorY, type: 'room' });
          roomDefs.push({ x: currentX, y: splitY, w: rw, h: interiorH - (splitY - interiorY), type: 'room' });
        } else {
          roomDefs.push({ x: currentX, y: interiorY, w: rw, h: interiorH, type: 'room' });
        }
      }
      currentX += sliceW;
    }
  }

  // Draw internal walls for each room boundary
  for (const rd of roomDefs) {
    // Right wall
    const rx = rd.x + rd.w;
    if (rx < interiorX + interiorW) {
      for (let y = rd.y; y < rd.y + rd.h; y++) {
        if (inBounds(rx, y, width, height) && grid[y][rx] === 'floor') {
          grid[y][rx] = 'wall';
        }
      }
    }
    // Bottom wall
    const by = rd.y + rd.h;
    if (by < interiorY + interiorH) {
      for (let x = rd.x; x < rd.x + rd.w; x++) {
        if (inBounds(x, by, width, height) && grid[by][x] === 'floor') {
          grid[by][x] = 'wall';
        }
      }
    }
  }

  // Create Room objects and add doors between rooms
  for (let i = 0; i < roomDefs.length; i++) {
    const rd = roomDefs[i];
    const room: Room = {
      id: i,
      x: rd.x, y: rd.y, width: rd.w, height: rd.h,
      centerX: Math.floor(rd.x + rd.w / 2),
      centerY: Math.floor(rd.y + rd.h / 2),
      type: i === 0 ? 'entrance' : 'normal',
    };
    rooms.push(room);
  }

  // Add doors in internal walls
  for (let y = interiorY; y < interiorY + interiorH; y++) {
    for (let x = interiorX; x < interiorX + interiorW; x++) {
      if (grid[y][x] === 'wall') {
        // Check if this internal wall has floor on opposite sides
        const hasFloorLR = inBounds(x - 1, y, width, height) && inBounds(x + 1, y, width, height) &&
          (grid[y][x - 1] === 'floor' || grid[y][x - 1] === 'carpet') &&
          (grid[y][x + 1] === 'floor' || grid[y][x + 1] === 'carpet');
        const hasFloorTB = inBounds(x, y - 1, width, height) && inBounds(x, y + 1, width, height) &&
          (grid[y - 1][x] === 'floor' || grid[y - 1][x] === 'carpet') &&
          (grid[y + 1][x] === 'floor' || grid[y + 1][x] === 'carpet');

        if ((hasFloorLR || hasFloorTB) && rng.chance(0.25)) {
          grid[y][x] = 'door';
        }
      }
    }
  }

  // Add entrance door to the outside
  const entranceSide = rng.int(0, 3);
  switch (entranceSide) {
    case 0: grid[marginY][Math.floor(width / 2)] = 'door'; break;
    case 1: grid[marginY + buildH - 1][Math.floor(width / 2)] = 'door'; break;
    case 2: grid[Math.floor(height / 2)][marginX] = 'door'; break;
    case 3: grid[Math.floor(height / 2)][marginX + buildW - 1] = 'door'; break;
  }

  // Decorate based on building type
  if (buildingType === 'temple') {
    // Carpet runners in main room
    if (rooms.length > 0) {
      const mainRoom = rooms[0];
      for (let x = mainRoom.x; x < mainRoom.x + mainRoom.width; x++) {
        const y = mainRoom.centerY;
        if (inBounds(x, y, width, height) && grid[y][x] === 'floor') grid[y][x] = 'carpet';
      }
      // Altar at the far end
      const altarX = mainRoom.x + Math.floor(mainRoom.width / 2);
      const altarY = mainRoom.y + 1;
      if (inBounds(altarX, altarY, width, height) && grid[altarY][altarX] === 'floor') grid[altarY][altarX] = 'altar';
      // Pillars
      if (mainRoom.width > 4 && mainRoom.height > 4) {
        const pillarPositions = [
          { x: mainRoom.x + 1, y: mainRoom.y + 1 },
          { x: mainRoom.x + mainRoom.width - 2, y: mainRoom.y + 1 },
          { x: mainRoom.x + 1, y: mainRoom.y + mainRoom.height - 2 },
          { x: mainRoom.x + mainRoom.width - 2, y: mainRoom.y + mainRoom.height - 2 },
        ];
        for (const p of pillarPositions) {
          if (inBounds(p.x, p.y, width, height) && grid[p.y][p.x] === 'floor') grid[p.y][p.x] = 'pillar';
        }
      }
      // Rugs around the altar
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
          const rx = altarX + dx, ry = altarY + dy;
          if (inBounds(rx, ry, width, height) && grid[ry][rx] === 'floor') grid[ry][rx] = 'rug';
        }
      }
    }
    // Apply symmetry — temples look best mirrored left-to-right
    mirrorGridHorizontal(grid, marginX, marginY, marginX + buildW, marginY + buildH);
    features.push({ name: 'Sacred Altar', type: 'cover', positions: [], description: 'A temple with a sacred altar and prayer rugs' });
  } else if (buildingType === 'manor') {
    // Carpet in main hall
    if (rooms.length > 0) {
      const mainRoom = rooms[0];
      for (let x = mainRoom.x; x < mainRoom.x + mainRoom.width; x++) {
        const y = mainRoom.centerY;
        if (inBounds(x, y, width, height) && grid[y][x] === 'floor') grid[y][x] = 'carpet';
      }
      // Statue at the far end of the hall
      if (inBounds(mainRoom.centerX, mainRoom.y + 1, width, height) && grid[mainRoom.y + 1][mainRoom.centerX] === 'floor') {
        grid[mainRoom.y + 1][mainRoom.centerX] = 'statue';
      }
      // Pillars
      if (mainRoom.width > 4 && mainRoom.height > 4) {
        const pillarPositions = [
          { x: mainRoom.x + 1, y: mainRoom.y + 1 },
          { x: mainRoom.x + mainRoom.width - 2, y: mainRoom.y + 1 },
          { x: mainRoom.x + 1, y: mainRoom.y + mainRoom.height - 2 },
          { x: mainRoom.x + mainRoom.width - 2, y: mainRoom.y + mainRoom.height - 2 },
        ];
        for (const p of pillarPositions) {
          if (inBounds(p.x, p.y, width, height) && grid[p.y][p.x] === 'floor') grid[p.y][p.x] = 'pillar';
        }
      }
    }
    // Furnish wing rooms: beds, tables, rugs, bookshelves, kitchen, armory
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i];
      const canFitStamp = (stamp: StructureStamp): boolean =>
        r.width >= stamp.width + 1 && r.height >= stamp.height + 1;

      // Try stamps first for larger rooms, then fall back to manual furnishing
      if (canFitStamp(KITCHEN_STAMP) && rng.chance(0.3) && !rooms.some((_, j) => j < i && rooms[j].type === 'kitchen')) {
        const ox = r.x + Math.floor((r.width - KITCHEN_STAMP.width) / 2);
        const oy = r.y + Math.floor((r.height - KITCHEN_STAMP.height) / 2);
        placeStamp(grid, KITCHEN_STAMP, ox, oy);
        r.type = 'kitchen';
      } else if (canFitStamp(ARMORY_STAMP) && rng.chance(0.25)) {
        const ox = r.x + Math.floor((r.width - ARMORY_STAMP.width) / 2);
        const oy = r.y + Math.floor((r.height - ARMORY_STAMP.height) / 2);
        placeStamp(grid, ARMORY_STAMP, ox, oy);
      } else if (canFitStamp(GARDEN_STAMP) && rng.chance(0.2)) {
        const ox = r.x + Math.floor((r.width - GARDEN_STAMP.width) / 2);
        const oy = r.y + Math.floor((r.height - GARDEN_STAMP.height) / 2);
        placeStamp(grid, GARDEN_STAMP, ox, oy);
      } else {
        const purpose = rng.pick(['bedroom', 'study', 'dining', 'storage']);
        switch (purpose) {
          case 'bedroom':
            if (inBounds(r.x + 1, r.y, width, height) && grid[r.y][r.x + 1] === 'floor') grid[r.y][r.x + 1] = 'bed';
            if (inBounds(r.x, r.y + r.height - 1, width, height) && grid[r.y + r.height - 1][r.x] === 'floor') grid[r.y + r.height - 1][r.x] = 'rug';
            // Add a painting on the wall
            if (inBounds(r.x + 2, r.y, width, height) && grid[r.y][r.x + 2] === 'floor') grid[r.y][r.x + 2] = 'painting';
            break;
          case 'study':
            if (inBounds(r.x, r.y, width, height) && grid[r.y][r.x] === 'floor') grid[r.y][r.x] = 'bookshelf';
            if (inBounds(r.centerX, r.centerY, width, height) && grid[r.centerY][r.centerX] === 'floor') grid[r.centerY][r.centerX] = 'table';
            if (inBounds(r.centerX + 1, r.centerY, width, height) && grid[r.centerY][r.centerX + 1] === 'floor') grid[r.centerY][r.centerX + 1] = 'chair';
            // Candelabra for reading light
            if (inBounds(r.centerX - 1, r.centerY, width, height) && grid[r.centerY][r.centerX - 1] === 'floor') grid[r.centerY][r.centerX - 1] = 'candelabra';
            break;
          case 'dining':
            if (inBounds(r.centerX, r.centerY, width, height) && grid[r.centerY][r.centerX] === 'floor') grid[r.centerY][r.centerX] = 'table';
            for (const offset of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const cx = r.centerX + offset[0], cy = r.centerY + offset[1];
              if (inBounds(cx, cy, width, height) && grid[cy][cx] === 'floor') grid[cy][cx] = 'chair';
            }
            // Chandelier above the dining table
            if (inBounds(r.centerX, r.centerY - 2, width, height) && grid[r.centerY - 2][r.centerX] === 'floor') grid[r.centerY - 2][r.centerX] = 'chandelier';
            break;
          case 'storage':
            if (inBounds(r.x, r.y, width, height) && grid[r.y][r.x] === 'floor') grid[r.y][r.x] = 'barrel';
            if (inBounds(r.x + 1, r.y, width, height) && grid[r.y][r.x + 1] === 'floor') grid[r.y][r.x + 1] = 'crate';
            if (inBounds(r.x + 2, r.y, width, height) && grid[r.y][r.x + 2] === 'floor') grid[r.y][r.x + 2] = 'shelf';
            break;
        }
      }
    }
    features.push({ name: 'Manor Furnishings', type: 'cover', positions: [], description: 'A furnished manor with bedrooms, studies, and dining areas' });
  } else if (buildingType === 'tavern') {
    // Counter (bar) in the first room
    if (rooms.length > 0) {
      const barRoom = rooms[0];
      // Bar counter along one wall
      for (let x = barRoom.x; x < barRoom.x + barRoom.width; x++) {
        if (inBounds(x, barRoom.y, width, height) && grid[barRoom.y][x] === 'floor') grid[barRoom.y][x] = 'counter';
      }
      // Barrels behind the bar
      for (let x = barRoom.x; x < barRoom.x + barRoom.width; x++) {
        if (inBounds(x, barRoom.y - 1, width, height) && grid[barRoom.y - 1][x] === 'floor') {
          grid[barRoom.y - 1][x] = rng.chance(0.6) ? 'barrel' : 'floor';
        }
      }
      // Firepit
      if (inBounds(barRoom.x + barRoom.width - 1, barRoom.y + barRoom.height - 1, width, height) &&
          grid[barRoom.y + barRoom.height - 1][barRoom.x + barRoom.width - 1] === 'floor') {
        grid[barRoom.y + barRoom.height - 1][barRoom.x + barRoom.width - 1] = 'firepit';
      }
    }
    // Tables and chairs in other rooms
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i];
      // Place 1-2 tables with chairs
      for (let t = 0; t < rng.int(1, 2); t++) {
        const tx = rng.int(r.x, r.x + Math.max(0, r.width - 2));
        const ty = rng.int(r.y, r.y + Math.max(0, r.height - 2));
        if (inBounds(tx, ty, width, height) && grid[ty][tx] === 'floor') {
          grid[ty][tx] = 'table';
          // Chairs around the table
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
            const cx = tx + dx, cy = ty + dy;
            if (inBounds(cx, cy, width, height) && grid[cy][cx] === 'floor' && rng.chance(0.6)) {
              grid[cy][cx] = 'chair';
            }
          }
        }
      }
    }
    features.push({ name: 'Tavern Bar', type: 'cover', positions: [], description: 'A tavern with a bar counter, tables, and a firepit' });
  } else if (buildingType === 'library') {
    // Bookshelves along walls, tables in center, rugs
    for (const r of rooms) {
      // Bookshelves along top and bottom walls
      for (let x = r.x; x < r.x + r.width; x++) {
        if (inBounds(x, r.y, width, height) && grid[r.y][x] === 'floor') grid[r.y][x] = 'bookshelf';
        if (r.height > 3 && inBounds(x, r.y + r.height - 1, width, height) && grid[r.y + r.height - 1][x] === 'floor') {
          grid[r.y + r.height - 1][x] = 'bookshelf';
        }
      }
      // Reading table in center
      if (inBounds(r.centerX, r.centerY, width, height) && grid[r.centerY][r.centerX] === 'floor') grid[r.centerY][r.centerX] = 'table';
      if (inBounds(r.centerX - 1, r.centerY, width, height) && grid[r.centerY][r.centerX - 1] === 'floor') grid[r.centerY][r.centerX - 1] = 'chair';
      if (inBounds(r.centerX + 1, r.centerY, width, height) && grid[r.centerY][r.centerX + 1] === 'floor') grid[r.centerY][r.centerX + 1] = 'chair';
      // Rug under the reading area
      if (inBounds(r.centerX, r.centerY + 1, width, height) && grid[r.centerY + 1][r.centerX] === 'floor') grid[r.centerY + 1][r.centerX] = 'rug';
    }
    features.push({ name: 'Library Stacks', type: 'cover', positions: [], description: 'A library with bookshelves, reading tables, and rugs' });
  } else if (buildingType === 'hall') {
    // Grand hall — add throne/statue at end, tables along sides
    if (rooms.length > 0) {
      const mainRoom = rooms[0];
      // Try placing THRONE_ROOM_STAMP centered at the far end
      if (mainRoom.width >= THRONE_ROOM_STAMP.width + 2 && mainRoom.height >= THRONE_ROOM_STAMP.height + 2) {
        const ox = mainRoom.x + Math.floor((mainRoom.width - THRONE_ROOM_STAMP.width) / 2);
        const oy = mainRoom.y + 1;
        placeStamp(grid, THRONE_ROOM_STAMP, ox, oy);
      } else {
        // Fallback: Throne / statue at far end
        if (inBounds(mainRoom.centerX, mainRoom.y + 1, width, height) && grid[mainRoom.y + 1][mainRoom.centerX] === 'floor') {
          grid[mainRoom.y + 1][mainRoom.centerX] = 'statue';
        }
      }
      // Rugs flanking the carpet
      const carpetY = mainRoom.centerY;
      for (let x = mainRoom.x + 2; x < mainRoom.x + mainRoom.width - 2; x += 3) {
        if (inBounds(x, carpetY + 1, width, height) && grid[carpetY + 1][x] === 'floor') grid[carpetY + 1][x] = 'rug';
        if (inBounds(x, carpetY - 1, width, height) && grid[carpetY - 1][x] === 'floor') grid[carpetY - 1][x] = 'rug';
      }
      // Chandeliers along the hall
      for (let x = mainRoom.x + 3; x < mainRoom.x + mainRoom.width - 3; x += 4) {
        const cy = mainRoom.centerY;
        if (inBounds(x, cy, width, height) && grid[cy][x] === 'carpet') grid[cy][x] = 'chandelier';
      }
    }
    // Apply symmetry — grand halls and arenas look best mirrored left-to-right
    mirrorGridHorizontal(grid, marginX, marginY, marginX + buildW, marginY + buildH);
    features.push({ name: 'Grand Hall', type: 'cover', positions: [], description: 'A grand hall with pillars, carpet, and a central throne' });
  }

  // Starting zones
  const startingZones = {
    players: rooms.length > 0 ? getFloorPositions(grid, rooms[0], 4, rng) : [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }],
    enemies: rooms.length > 1 ? getFloorPositions(grid, rooms[rooms.length - 1], 4, rng) : [{ x: width - 4, y: height - 4 }, { x: width - 5, y: height - 4 }, { x: width - 4, y: height - 5 }, { x: width - 5, y: height - 5 }],
  };

  const nameMap: Record<string, string[]> = {
    manor: ['Noble Manor', 'Duke\'s Estate', 'Merchant Villa', 'Lord\'s Keep'],
    temple: ['Temple of Light', 'Dark Shrine', 'Sacred Sanctum', 'Chapel of the Dawn'],
    tavern: ['The Rusty Dragon', 'Sleeping Giant Inn', 'Silver Tankard', 'Crow\'s Nest Tavern'],
    library: ['Grand Library', 'Arcane Archives', 'Scholar\'s Retreat', 'Book of Ages'],
    hall: ['Great Hall', 'Throne Room', 'Banquet Hall', 'Grand Chamber', 'Council Hall'],
    arena: ['Fighting Pit', 'Gladiator Arena', 'Training Grounds', 'Blood Ring'],
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'indoor', subTheme: buildingType,
    name: rng.pick(nameMap[buildingType] || ['Building']),
    description: `A procedurally generated ${buildingType} with ${rooms.length} rooms`,
  };
}

// ─── Utility ────────────────────────────────────────────────

/**
 * Get all tiles that have hazard properties.
 * Returns array of {x, y, damage, type} for use by game logic.
 */
export function getHazardTiles(tiles: TileType[][]): Array<{ x: number; y: number; damage: number; type: string }> {
  const hazards: Array<{ x: number; y: number; damage: number; type: string }> = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[0].length; x++) {
      const mech = TILE_MECHANICS[tiles[y][x]];
      if (mech.hazardDamage && mech.hazardDamage > 0) {
        hazards.push({ x, y, damage: mech.hazardDamage, type: mech.hazardType || 'untyped' });
      }
    }
  }
  return hazards;
}

/**
 * Spread fire from a source tile to adjacent flammable tiles.
 * Returns positions that caught fire.
 */
export function spreadFire(tiles: TileType[][], sourceX: number, sourceY: number): Position[] {
  const w = tiles[0].length, h = tiles.length;
  const spread: Position[] = [];
  const flammable: Set<TileType> = new Set(['hay', 'bush', 'carpet', 'rug', 'bookshelf', 'crate', 'barrel', 'bed', 'log']);
  
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = sourceX + dx, ny = sourceY + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
      if (flammable.has(tiles[ny][nx])) {
        tiles[ny][nx] = 'firepit'; // Catches fire
        spread.push({ x: nx, y: ny });
      }
    }
  }
  return spread;
}

/**
 * Initialize wall HP grid from tile types.
 * Only destructible tiles get HP values.
 */
export function initializeWallHP(tiles: TileType[][]): number[][] {
  const hp: number[][] = [];
  for (let y = 0; y < tiles.length; y++) {
    hp[y] = [];
    for (let x = 0; x < tiles[0].length; x++) {
      const mech = TILE_MECHANICS[tiles[y][x]];
      hp[y][x] = mech.destructible ? (mech.hardness ?? 20) : -1; // -1 = indestructible
    }
  }
  return hp;
}

function getFloorPositions(grid: TileType[][], room: Room, count: number, rng: SeededRandom): Position[] {
  const positions: Position[] = [];
  const candidates: Position[] = [];

  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (inBounds(x, y, grid[0].length, grid.length)) {
        const tile = grid[y][x];
        const mechanics = TILE_MECHANICS[tile];
        if (mechanics.passable && tile !== 'door') {
          candidates.push({ x, y });
        }
      }
    }
  }

  rng.shuffle(candidates);
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    positions.push(candidates[i]);
  }

  // Pad with fallback positions if needed
  while (positions.length < count) {
    positions.push({ x: room.centerX, y: room.centerY });
  }

  return positions;
}

// ─── Convert to Legacy Format ───────────────────────────────

/**
 * Convert a ProceduralMap to the existing EncounterMapTemplate format
 * for backwards compatibility with the current game engine.
 */
export function proceduralMapToTemplate(pmap: ProceduralMap): {
  id: string;
  name: string;
  theme: MapTheme;
  subTheme: string;
  description: string;
  width: number;
  height: number;
  terrain: TerrainTile[][];
  startingZones: { players: Position[]; enemies: Position[] };
  features: MapFeature[];
  tiles: TileType[][];  // NEW — the rich tile data for the renderer
  overlays?: AtlasOverlay[];  // atlas sprite overlays for multi-tile objects
  moveCostOverride?: (number | null)[][];  // per-cell override
  rooms: Room[];
  corridors: Corridor[];
} {
  // Convert TileType[][] to TerrainTile[][] for the existing engine
  const terrain: TerrainTile[][] = [];
  for (let y = 0; y < pmap.height; y++) {
    terrain[y] = [];
    for (let x = 0; x < pmap.width; x++) {
      const tileType = pmap.tiles[y][x];
      const mechanics = TILE_MECHANICS[tileType];
      // Check per-cell override first
      const override = pmap.moveCostOverride?.[y]?.[x];
      let legacyType: 'empty' | 'difficult' | 'impassable';
      if (override != null) {
        // Override present: 1 = empty, >1 = difficult, Infinity = impassable
        legacyType = !Number.isFinite(override) ? 'impassable' : override > 1 ? 'difficult' : 'empty';
      } else if (!mechanics.passable) {
        legacyType = 'impassable';
      } else if (mechanics.movementCost > 1) {
        legacyType = 'difficult';
      } else {
        legacyType = 'empty';
      }
      terrain[y][x] = { x, y, type: legacyType };
    }
  }

  return {
    id: `proc-${pmap.subTheme}-${Date.now()}`,
    name: pmap.name,
    theme: pmap.theme,
    subTheme: pmap.subTheme,
    description: pmap.description,
    width: pmap.width,
    height: pmap.height,
    terrain,
    startingZones: pmap.startingZones,
    features: pmap.features,
    tiles: pmap.tiles,
    overlays: pmap.overlays,
    moveCostOverride: pmap.moveCostOverride,
    rooms: pmap.rooms,
    corridors: pmap.corridors,
  };
}

// ─── Line of Sight ──────────────────────────────────────────

/**
 * Calculate visible cells from a position using raycasting (Bresenham).
 * Returns a Set of "x,y" strings for cells that are visible.
 */
export function calculateLineOfSight(
  tiles: TileType[][],
  originX: number,
  originY: number,
  maxRange: number = 30,
): Set<string> {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const visible = new Set<string>();

  // Always see your own cell
  visible.add(`${originX},${originY}`);

  // Cast rays to every cell on the edge of the range  
  const steps = maxRange * 8; // Number of rays
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const endX = originX + Math.cos(angle) * maxRange;
    const endY = originY + Math.sin(angle) * maxRange;

    // Bresenham line from origin to end
    castRay(tiles, originX, originY, Math.round(endX), Math.round(endY), width, height, visible);
  }

  return visible;
}

function castRay(
  tiles: TileType[][],
  x0: number, y0: number,
  x1: number, y1: number,
  width: number, height: number,
  visible: Set<string>,
): void {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    if (!inBounds(x, y, width, height)) break;

    visible.add(`${x},${y}`);

    // If this tile blocks LoS, stop the ray (but the tile itself is visible)
    const tile = tiles[y][x];
    if (TILE_MECHANICS[tile].blocksLoS && !(x === x0 && y === y0)) {
      break;
    }

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Calculate combined LoS for all friendly creatures.
 * This is what the player sees during combat.
 *
 * `maxRange` can be a single number (applied to all) or an array of
 * per-creature ranges that matches the length of `friendlyPositions`.
 */
export function calculatePartyLineOfSight(
  tiles: TileType[][],
  friendlyPositions: Position[],
  maxRange: number | number[] = 30,
): Set<string> {
  const combined = new Set<string>();
  for (let i = 0; i < friendlyPositions.length; i++) {
    const pos = friendlyPositions[i];
    const range = Array.isArray(maxRange) ? (maxRange[i] ?? 30) : maxRange;
    const los = calculateLineOfSight(tiles, pos.x, pos.y, range);
    for (const cell of los) {
      combined.add(cell);
    }
  }
  return combined;
}

// ─── Vision Range Helpers ───────────────────────────────────

/** PF2e lighting levels for vision calculation */
export type LightingLevel = 'bright' | 'dim' | 'dark';

/**
 * Determine a creature's effective vision range (in grid squares) based on
 * its senses and the map's ambient lighting level.
 *
 * PF2e vision rules (simplified):
 * - **Bright light**: All creatures see normally → full map range.
 * - **Dim light**: Normal vision limited (torchlight radius ~6 sq);
 *   low-light vision sees as if bright → full map range;
 *   darkvision/greater darkvision → full map range.
 * - **Darkness**: Normal vision very limited (~2 sq, adjacent only);
 *   low-light vision slightly better (~4 sq);
 *   darkvision treats darkness as dim → moderate range;
 *   greater darkvision → full map range.
 *
 * @param senses  — creature's senses array (e.g., ['darkvision'])
 * @param lighting — ambient lighting level of the map
 * @param mapSize — maximum dimension of the map (used as "unlimited" range)
 * @returns vision range in grid squares
 */
export function getVisionRange(
  senses: string[] | undefined,
  lighting: LightingLevel,
  mapSize: number,
): number {
  const hasDarkvision = senses?.some(s =>
    /\bdarkvision\b/i.test(s) && !/greater/i.test(s)
  ) ?? false;
  const hasGreaterDarkvision = senses?.some(s =>
    /\bgreater\s+darkvision\b/i.test(s)
  ) ?? false;
  const hasLowLight = senses?.some(s =>
    /\blow[- ]?light\s+vision\b/i.test(s)
  ) ?? false;

  switch (lighting) {
    case 'bright':
      // Everyone sees fine in bright light
      return mapSize;

    case 'dim':
      // Low-light & darkvision treat dim as bright
      if (hasGreaterDarkvision || hasDarkvision || hasLowLight) return mapSize;
      // Normal vision: limited by torchlight-like range
      return 8;

    case 'dark':
      // Greater darkvision: sees in total darkness
      if (hasGreaterDarkvision) return mapSize;
      // Darkvision: treats darkness as dim light — good range
      if (hasDarkvision) return Math.min(mapSize, 24);
      // Low-light: slight advantage but still very limited
      if (hasLowLight) return 6;
      // Normal vision: barely see adjacent squares
      return 3;

    default:
      return mapSize;
  }
}

// ─── Ship Deck Generator ────────────────────────────────────

export function generateShipDeck(
  width: number = 28,
  height: number = 14,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const grid = createGrid(width, height, 'water-deep');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Ship hull shape — elliptical, wider in the center
  const shipCenterY = Math.floor(height / 2);
  const shipCenterX = Math.floor(width / 2);
  const shipLengthHalf = Math.floor(width * 0.42);
  const shipWidthHalf = Math.floor(height * 0.35);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - shipCenterX) / shipLengthHalf;
      const dy = (y - shipCenterY) / shipWidthHalf;
      // Pointed bow (right) and rounded stern (left)
      const bowFactor = x > shipCenterX ? 1.0 + (x - shipCenterX) / shipLengthHalf * 0.5 : 1.0;
      if (dx * dx * bowFactor + dy * dy <= 1.0) {
        grid[y][x] = 'floor'; // Wooden deck
      }
    }
  }

  // Hull walls — edge tiles become wall
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'floor') {
        for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
          if (inBounds(nx, ny, width, height) && grid[ny][nx] === 'water-deep') {
            grid[y][x] = 'wall';
            break;
          }
        }
      }
    }
  }

  // Masts — 2-3 tall pillars along the center line
  const mastCount = rng.int(2, 3);
  for (let i = 0; i < mastCount; i++) {
    const mx = shipCenterX - shipLengthHalf + Math.floor((2 * shipLengthHalf) * (i + 1) / (mastCount + 1));
    if (inBounds(mx, shipCenterY, width, height) && grid[shipCenterY][mx] === 'floor') {
      grid[shipCenterY][mx] = 'pillar';
    }
  }

  // Captain's cabin — small walled room at the stern (left side)
  const cabinX = shipCenterX - shipLengthHalf + 2;
  const cabinY = shipCenterY - 2;
  const cabinW = 5;
  const cabinH = 4;
  const cabinRoom: Room = { id: 0, x: cabinX, y: cabinY, width: cabinW, height: cabinH, centerX: cabinX + 2, centerY: cabinY + 2, type: 'normal' };
  
  // Draw cabin walls
  for (let y = cabinY; y < cabinY + cabinH; y++) {
    for (let x = cabinX; x < cabinX + cabinW; x++) {
      if (inBounds(x, y, width, height)) {
        if (y === cabinY || y === cabinY + cabinH - 1 || x === cabinX + cabinW - 1) {
          if (grid[y][x] === 'floor') grid[y][x] = 'wall';
        }
      }
    }
  }
  // Cabin door
  if (inBounds(cabinX + cabinW - 1, cabinY + 1, width, height)) grid[cabinY + 1][cabinX + cabinW - 1] = 'door';
  // Captain's furniture
  if (inBounds(cabinX + 1, cabinY + 1, width, height) && grid[cabinY + 1][cabinX + 1] === 'floor') grid[cabinY + 1][cabinX + 1] = 'table';
  if (inBounds(cabinX + 2, cabinY + 1, width, height) && grid[cabinY + 1][cabinX + 2] === 'floor') grid[cabinY + 1][cabinX + 2] = 'chair';
  if (inBounds(cabinX + 1, cabinY + 2, width, height) && grid[cabinY + 2][cabinX + 1] === 'floor') grid[cabinY + 2][cabinX + 1] = 'chest';
  rooms.push(cabinRoom);

  // Cargo hold — center below-deck area
  const cargoX = shipCenterX - 2;
  const cargoY = shipCenterY + 1;
  const cargoW = 5;
  const cargoH = 3;
  const cargoRoom: Room = { id: 1, x: cargoX, y: cargoY, width: cargoW, height: cargoH, centerX: cargoX + 2, centerY: cargoY + 1, type: 'normal' };
  // Cargo items
  for (let cy = cargoY; cy < cargoY + cargoH; cy++) {
    for (let cx = cargoX; cx < cargoX + cargoW; cx++) {
      if (inBounds(cx, cy, width, height) && grid[cy][cx] === 'floor') {
        if (rng.chance(0.35)) grid[cy][cx] = rng.pick(['barrel', 'crate', 'crate']);
      }
    }
  }
  rooms.push(cargoRoom);

  // Main deck room spanning most of the ship
  const deckRoom: Room = { id: 2, x: cabinX + cabinW, y: shipCenterY - shipWidthHalf + 2, width: shipLengthHalf, height: shipWidthHalf * 2 - 2, centerX: shipCenterX + 3, centerY: shipCenterY, type: 'entrance' };
  rooms.push(deckRoom);

  // Railings along the edges (fences)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'wall') {
        // Check if it's truly an outer hull edge (next to water)
        let nextToWater = false;
        for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
          if (!inBounds(nx, ny, width, height) || grid[ny][nx] === 'water-deep') { nextToWater = true; break; }
        }
        if (nextToWater) grid[y][x] = 'fence';
      }
    }
  }

  // Stairway / trapdoor to below deck
  const stairX = shipCenterX;
  const stairY = shipCenterY + 1;
  if (inBounds(stairX, stairY, width, height) && (grid[stairY][stairX] === 'floor' || grid[stairY][stairX] === 'barrel' || grid[stairY][stairX] === 'crate')) {
    grid[stairY][stairX] = 'trapdoor';
  }

  features.push({ name: 'Ship Hull', type: 'cover', positions: [], description: 'A wooden sailing ship with a captain\'s cabin and cargo hold' });
  features.push({ name: 'Deep Water', type: 'water', positions: [], description: 'Dangerous waters surround the ship' });

  const startingZones = {
    players: getFloorPositions(grid, deckRoom, 4, rng),
    enemies: getFloorPositions(grid, cabinRoom, 4, rng),
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'ship', subTheme: 'warship',
    name: rng.pick(['The Black Tide', 'Storm Chaser', 'Maiden\'s Revenge', 'Sea Serpent', 'The Kraken\'s Maw']),
    description: `A ${width}x${height} ship deck with captain's cabin and cargo hold`,
  };
}

// ─── Tower Generator ────────────────────────────────────────

export function generateTower(
  width: number = 20,
  height: number = 20,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const grid = createGrid(width, height, 'void');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const numFloors = rng.int(3, 5);

  // Generate circular/octagonal tower rooms, decreasing in size
  const maxRadius = Math.min(Math.floor(width / 2) - 1, Math.floor(height / 2) - 1);

  for (let floor = 0; floor < numFloors; floor++) {
    const radius = maxRadius - floor;
    if (radius < 2) break;

    // Carve circular room
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= radius * radius) {
          if (dx * dx + dy * dy >= (radius - 1) * (radius - 1)) {
            // Outer ring = wall (if not already a smaller floor's content)
            if (grid[y][x] === 'void') grid[y][x] = 'wall';
          } else {
            grid[y][x] = 'floor';
          }
        }
      }
    }

    const room: Room = {
      id: floor,
      x: centerX - radius + 1, y: centerY - radius + 1,
      width: (radius - 1) * 2, height: (radius - 1) * 2,
      centerX, centerY,
      type: floor === 0 ? 'entrance' : floor === numFloors - 1 ? 'boss' : 'normal',
    };
    rooms.push(room);
  }

  // Stairway markers between floors — use stairs tiles at cardinal positions
  const stairPositions: Array<{x: number; y: number}> = [];
  for (let floor = 0; floor < numFloors - 1; floor++) {
    const r = maxRadius - floor - 1;
    if (r < 2) break;
    // Place stairs at different cardinal positions for each floor
    const angle = (floor * Math.PI / 2);
    const sx = centerX + Math.floor(Math.cos(angle) * (r - 1));
    const sy = centerY + Math.floor(Math.sin(angle) * (r - 1));
    if (inBounds(sx, sy, width, height) && grid[sy][sx] === 'floor') {
      grid[sy][sx] = 'stairs-up';
      stairPositions.push({ x: sx, y: sy });
    }
  }

  // Inner decorations by floor
  // Innermost room (top floor) — boss room with throne
  const innerR = maxRadius - numFloors + 1;
  if (innerR >= 2) {
    if (grid[centerY][centerX] === 'floor') grid[centerY][centerX] = 'throne';
    // Banners on walls
    for (const [dx, dy] of [[-1, -innerR+1], [1, -innerR+1], [-innerR+1, 0], [innerR-1, 0]]) {
      const bx = centerX + dx, by = centerY + dy;
      if (inBounds(bx, by, width, height) && grid[by][bx] === 'wall') grid[by][bx] = 'banner';
    }
  }

  // Outer ring (ground floor) decorations
  const outerFloor = rooms[0];
  if (outerFloor) {
    // Windows in outer wall
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const wx = centerX + Math.floor(Math.cos(angle) * (maxRadius - 0.5));
      const wy = centerY + Math.floor(Math.sin(angle) * (maxRadius - 0.5));
      if (inBounds(wx, wy, width, height) && grid[wy][wx] === 'wall') grid[wy][wx] = 'window';
    }
    // Torch sconces between windows
    for (let angle = Math.PI / 8; angle < Math.PI * 2; angle += Math.PI / 4) {
      const tx = centerX + Math.floor(Math.cos(angle) * (maxRadius - 1));
      const ty = centerY + Math.floor(Math.sin(angle) * (maxRadius - 1));
      if (inBounds(tx, ty, width, height) && grid[ty][tx] === 'floor') grid[ty][tx] = 'torch';
    }
  }

  // Pillars in the second ring
  if (rooms.length >= 2) {
    const r2 = maxRadius - 1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const px = centerX + Math.floor(Math.cos(angle) * (r2 - 1));
      const py = centerY + Math.floor(Math.sin(angle) * (r2 - 1));
      if (inBounds(px, py, width, height) && grid[py][px] === 'floor') grid[py][px] = 'pillar';
    }
  }

  // Door at the bottom of the tower
  if (inBounds(centerX, centerY + maxRadius - 1, width, height) && grid[centerY + maxRadius - 1][centerX] === 'wall') {
    grid[centerY + maxRadius - 1][centerX] = 'door';
  }

  // Apply symmetry for a polished look
  mirrorGridHorizontal(grid, centerX - maxRadius, centerY - maxRadius, centerX + maxRadius + 1, centerY + maxRadius + 1);

  features.push({ name: 'Tower Floors', type: 'elevation', positions: stairPositions, description: 'A multi-level tower with concentric circular floors' });

  const startingZones = {
    players: rooms.length > 0 ? getFloorPositions(grid, rooms[0], 4, rng) : [],
    enemies: rooms.length > 1 ? getFloorPositions(grid, rooms[rooms.length - 1], 4, rng) : [],
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'tower', subTheme: 'wizard-tower',
    name: rng.pick(['Wizard\'s Spire', 'The Dark Tower', 'Ivory Tower', 'Watchtower', 'Mage\'s Keep']),
    description: `A ${numFloors}-floor circular tower`,
  };
}

// ─── Bridge Battle Generator ────────────────────────────────

export function generateBridgeBattle(
  width: number = 30,
  height: number = 16,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const gap = rng.pick(['water', 'lava', 'pit'] as TileType[]);
  const grid = createGrid(width, height, gap);
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Two landmasses on left and right  
  const landWidth = Math.floor(width * 0.3);
  const bridgeY = Math.floor(height / 2);
  const bridgeWidth = rng.int(2, 3);

  // Left landmass
  for (let y = 1; y < height - 1; y++) {
    for (let x = 0; x < landWidth; x++) {
      grid[y][x] = 'floor';
    }
  }
  // Right landmass
  for (let y = 1; y < height - 1; y++) {
    for (let x = width - landWidth; x < width; x++) {
      grid[y][x] = 'floor';
    }
  }

  // Walls along the edges of the chasm
  for (let y = 0; y < height; y++) {
    if (inBounds(landWidth, y, width, height) && grid[y][landWidth - 1] === 'floor') {
      // Rocky edge
      if (y === 0 || y === height - 1 || rng.chance(0.3)) grid[y][landWidth - 1] = 'rock';
    }
    if (inBounds(width - landWidth, y, width, height) && grid[y][width - landWidth] === 'floor') {
      if (y === 0 || y === height - 1 || rng.chance(0.3)) grid[y][width - landWidth] = 'rock';
    }
  }

  // Top and bottom edges
  for (let x = 0; x < width; x++) {
    if (grid[0][x] !== gap) grid[0][x] = 'wall';
    if (grid[height - 1][x] !== gap) grid[height - 1][x] = 'wall';
  }

  // Bridge across the gap
  for (let x = landWidth; x < width - landWidth; x++) {
    for (let dy = -Math.floor(bridgeWidth / 2); dy <= Math.floor(bridgeWidth / 2); dy++) {
      const by = bridgeY + dy;
      if (inBounds(x, by, width, height)) grid[by][x] = 'bridge';
    }
    // Bridge railings
    const railTop = bridgeY - Math.floor(bridgeWidth / 2) - 1;
    const railBot = bridgeY + Math.floor(bridgeWidth / 2) + 1;
    if (inBounds(x, railTop, width, height) && grid[railTop][x] === gap) grid[railTop][x] = 'fence';
    if (inBounds(x, railBot, width, height) && grid[railBot][x] === gap) grid[railBot][x] = 'fence';
  }

  // Guard towers at each end of the bridge
  const towerPositions = [
    { x: landWidth - 3, y: bridgeY - 2 },
    { x: width - landWidth + 1, y: bridgeY - 2 },
  ];
  for (let i = 0; i < towerPositions.length; i++) {
    const tp = towerPositions[i];
    const towerW = 3;
    const towerH = 4;
    for (let ty = tp.y; ty < tp.y + towerH; ty++) {
      for (let tx = tp.x; tx < tp.x + towerW; tx++) {
        if (inBounds(tx, ty, width, height)) {
          if (ty === tp.y || ty === tp.y + towerH - 1 || tx === tp.x || tx === tp.x + towerW - 1) {
            grid[ty][tx] = 'wall';
          } else {
            grid[ty][tx] = 'floor';
          }
        }
      }
    }
    // Arrow slit (window)
    if (inBounds(tp.x + 1, tp.y, width, height)) grid[tp.y][tp.x + 1] = 'window';
    // Tower door facing bridge
    const doorX = i === 0 ? tp.x + towerW - 1 : tp.x;
    if (inBounds(doorX, tp.y + 1, width, height)) grid[tp.y + 1][doorX] = 'door';

    rooms.push({
      id: i, x: tp.x + 1, y: tp.y + 1, width: 1, height: 2,
      centerX: tp.x + 1, centerY: tp.y + 2,
      type: i === 0 ? 'entrance' : 'normal',
    });
  }

  // Cover on the landmasses — barricades, crates, rocks
  for (let side = 0; side < 2; side++) {
    const startX = side === 0 ? 1 : width - landWidth + 1;
    const endX = side === 0 ? landWidth - 3 : width - 2;
    for (let i = 0; i < 4; i++) {
      const cx = rng.int(startX, endX);
      const cy = rng.int(2, height - 3);
      if (inBounds(cx, cy, width, height) && grid[cy][cx] === 'floor') {
        grid[cy][cx] = rng.pick(['crate', 'barrel', 'rock']);
      }
    }
  }

  // Add rooms representing the two sides
  rooms.push({ id: 2, x: 1, y: 1, width: landWidth - 2, height: height - 2, centerX: Math.floor(landWidth / 2), centerY: Math.floor(height / 2), type: 'entrance' });
  rooms.push({ id: 3, x: width - landWidth + 1, y: 1, width: landWidth - 2, height: height - 2, centerX: width - Math.floor(landWidth / 2), centerY: Math.floor(height / 2), type: 'normal' });

  features.push({ name: 'Bridge', type: 'cover', positions: [], description: `A narrow bridge over ${gap}` });
  if (gap === 'lava') features.push({ name: 'Lava', type: 'lava', positions: [], description: 'Molten lava fills the chasm below' });
  else if (gap === 'water-deep') features.push({ name: 'River', type: 'water', positions: [], description: 'A deep river flows through the chasm' });
  else features.push({ name: 'Chasm', type: 'pit', positions: [], description: 'A bottomless pit yawns below the bridge' });

  const startingZones = {
    players: getFloorPositions(grid, rooms[2], 4, rng),
    enemies: getFloorPositions(grid, rooms[3], 4, rng),
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'bridge', subTheme: gap === 'lava' ? 'lava-bridge' : gap === 'water-deep' ? 'river-bridge' : 'chasm-bridge',
    name: rng.pick(['The Narrow Crossing', 'Bridge of Peril', 'Last Stand Bridge', 'The Gauntlet', 'Contested Crossing']),
    description: `A bridge battle over a ${gap} chasm with guard towers`,
  };
}

// ─── Caravan Ambush Generator ───────────────────────────────

export function generateCaravanAmbush(
  width: number = 32,
  height: number = 20,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const grid = createGrid(width, height, 'grass');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Road running through the center
  const roadY = Math.floor(height / 2);
  const roadWidth = rng.int(2, 3);
  for (let x = 0; x < width; x++) {
    for (let dy = -Math.floor(roadWidth / 2); dy <= Math.floor(roadWidth / 2); dy++) {
      const ry = roadY + dy;
      if (inBounds(x, ry, width, height)) grid[ry][x] = 'cobblestone';
    }
  }

  // Road curves slightly
  const curveAmp = rng.int(1, 2);
  for (let x = 0; x < width; x++) {
    const curve = Math.floor(Math.sin(x / width * Math.PI * 2) * curveAmp);
    for (let dy = -Math.floor(roadWidth / 2); dy <= Math.floor(roadWidth / 2); dy++) {
      const ry = roadY + dy + curve;
      if (inBounds(x, ry, width, height) && grid[ry][x] === 'grass') grid[ry][x] = 'cobblestone';
    }
  }

  // Scatter terrain variation on both sides of the road
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'grass') {
        if (rng.chance(0.08)) grid[y][x] = 'grass-tall';
        else if (rng.chance(0.06)) grid[y][x] = 'grass-tall';
        else if (rng.chance(0.03)) grid[y][x] = 'dirt';
      }
    }
  }

  // Overturned wagons on the road
  const wagonCount = rng.int(2, 3);
  for (let i = 0; i < wagonCount; i++) {
    const wx = Math.floor(width * (i + 1) / (wagonCount + 1));
    const wy = roadY + rng.int(-1, 1);
    // Wagon = cluster of crates, barrels, broken fence
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 0; dy++) {
        const px = wx + dx, py = wy + dy;
        if (inBounds(px, py, width, height)) {
          const roll = rng.next();
          if (roll < 0.3) grid[py][px] = 'crate';
          else if (roll < 0.5) grid[py][px] = 'barrel';
          else if (roll < 0.65) grid[py][px] = 'fence';
        }
      }
    }
  }

  // Ambush positions — rocky outcrops or dense foliage flanking the road
  const ambushNorth: Room = { id: 0, x: 2, y: 1, width: width - 4, height: roadY - roadWidth - 1, centerX: Math.floor(width / 2), centerY: Math.floor((roadY - roadWidth) / 2), type: 'normal' };
  const ambushSouth: Room = { id: 1, x: 2, y: roadY + roadWidth + 1, width: width - 4, height: height - roadY - roadWidth - 2, centerX: Math.floor(width / 2), centerY: roadY + roadWidth + Math.floor((height - roadY - roadWidth) / 2), type: 'normal' };
  const roadRoom: Room = { id: 2, x: 0, y: roadY - Math.floor(roadWidth / 2), width, height: roadWidth + 1, centerX: Math.floor(width / 2), centerY: roadY, type: 'entrance' };
  rooms.push(ambushNorth, ambushSouth, roadRoom);

  // Campfire for the caravan travelers
  const campX = Math.floor(width / 2) + rng.int(-2, 2);
  const campY = roadY + roadWidth + 1;
  if (inBounds(campX, campY, width, height) && grid[campY][campX] === 'grass') {
    grid[campY][campX] = 'firepit';
    // Bedrolls around camp
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) {
      if (inBounds(campX + dx, campY + dy, width, height) && grid[campY + dy][campX + dx] === 'grass') {
        grid[campY + dy][campX + dx] = 'rug';
      }
    }
  }

  features.push({ name: 'Overturned Wagons', type: 'cover', positions: [], description: 'Destroyed wagons block the road' });
  features.push({ name: 'Dense Foliage', type: 'cover', positions: [], description: 'Trees and bushes provide cover for ambushers' });

  const startingZones = {
    players: getFloorPositions(grid, roadRoom, 4, rng),
    enemies: getFloorPositions(grid, ambushNorth, 4, rng),
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'caravan', subTheme: 'ambush',
    name: rng.pick(['Ambush on the Trade Road', 'Highway Robbery', 'Caravan Attack', 'Bandit\'s Gauntlet', 'Road of Danger']),
    description: 'A caravan ambush scene on a forest road with overturned wagons',
  };
}

// ─── Sewers Generator ───────────────────────────────────────

export function generateSewers(
  width: number = 28,
  height: number = 22,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const grid = createGrid(width, height, 'wall');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Main water channels
  const channelCount = rng.int(2, 3);
  const channels: Array<{ x1: number; y1: number; x2: number; y2: number; horizontal: boolean }> = [];

  for (let i = 0; i < channelCount; i++) {
    if (i % 2 === 0) {
      // Horizontal channel
      const y = Math.floor(height * (i + 1) / (channelCount + 1));
      for (let x = 1; x < width - 1; x++) {
        grid[y][x] = 'water-deep';
        // Walkways on both sides
        if (inBounds(x, y - 1, width, height)) grid[y - 1][x] = 'floor';
        if (inBounds(x, y + 1, width, height)) grid[y + 1][x] = 'floor';
        // Wider channels sometimes
        if (rng.chance(0.3) && inBounds(x, y - 2, width, height)) grid[y - 2][x] = 'floor';
        if (rng.chance(0.3) && inBounds(x, y + 2, width, height)) grid[y + 2][x] = 'floor';
      }
      channels.push({ x1: 1, y1: y, x2: width - 2, y2: y, horizontal: true });
    } else {
      // Vertical channel
      const x = Math.floor(width * (i + 1) / (channelCount + 1));
      for (let y = 1; y < height - 1; y++) {
        grid[y][x] = 'water-deep';
        if (inBounds(x - 1, y, width, height)) grid[y][x - 1] = 'floor';
        if (inBounds(x + 1, y, width, height)) grid[y][x + 1] = 'floor';
        if (rng.chance(0.3) && inBounds(x - 2, y, width, height)) grid[y][x - 2] = 'floor';
        if (rng.chance(0.3) && inBounds(x + 2, y, width, height)) grid[y][x + 2] = 'floor';
      }
      channels.push({ x1: x, y1: 1, x2: x, y2: height - 2, horizontal: false });
    }
  }

  // Junction rooms where channels meet + extra rooms along channels
  for (let i = 0; i < channels.length; i++) {
    for (let j = i + 1; j < channels.length; j++) {
      const c1 = channels[i], c2 = channels[j];
      if (c1.horizontal && !c2.horizontal) {
        // Intersection — carve a junction room
        const jx = c2.x1;
        const jy = c1.y1;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (inBounds(jx + dx, jy + dy, width, height)) {
              grid[jy + dy][jx + dx] = Math.abs(dx) <= 1 && Math.abs(dy) <= 1 ? 'water-deep' : 'floor';
            }
          }
        }
        rooms.push({ id: rooms.length, x: jx - 2, y: jy - 2, width: 5, height: 5, centerX: jx, centerY: jy, type: 'normal' });
      }
    }
  }

  // Additional side rooms off the main walkways
  const sideRoomCount = rng.int(3, 5);
  for (let i = 0; i < sideRoomCount; i++) {
    const rw = rng.int(4, 6);
    const rh = rng.int(4, 6);
    const rx = rng.int(2, width - rw - 2);
    const ry = rng.int(2, height - rh - 2);
    
    // Check if room overlaps a channel walkway
    let touchesWalkway = false;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (inBounds(x, y, width, height) && grid[y][x] === 'floor') touchesWalkway = true;
      }
    }
    if (!touchesWalkway) continue;

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (inBounds(x, y, width, height) && grid[y][x] === 'wall') {
          if (y === ry || y === ry + rh - 1 || x === rx || x === rx + rw - 1) {
            // Leave as wall for room boundary unless it's an internal floor
          } else {
            grid[y][x] = 'floor';
          }
        }
      }
    }
    rooms.push({ id: rooms.length, x: rx + 1, y: ry + 1, width: rw - 2, height: rh - 2, centerX: rx + Math.floor(rw / 2), centerY: ry + Math.floor(rh / 2), type: i === 0 ? 'entrance' : 'normal' });
  }

  // If no entrance room, make the first room entrance
  if (rooms.length > 0 && !rooms.some(r => r.type === 'entrance')) rooms[0].type = 'entrance';
  // Ensure at least two rooms
  if (rooms.length < 2) {
    rooms.push({ id: rooms.length, x: 2, y: 2, width: 4, height: 4, centerX: 4, centerY: 4, type: 'entrance' });
    for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) if (inBounds(x, y, width, height)) grid[y][x] = 'floor';
    rooms.push({ id: rooms.length, x: width - 6, y: height - 6, width: 4, height: 4, centerX: width - 4, centerY: height - 4, type: 'normal' });
    for (let y = height - 6; y < height - 2; y++) for (let x = width - 6; x < width - 2; x++) if (inBounds(x, y, width, height)) grid[y][x] = 'floor';
  }

  // Drain tiles at intersections and along walkways
  for (let y = 2; y < height - 2; y += 4) {
    for (let x = 2; x < width - 2; x += 4) {
      if (inBounds(x, y, width, height) && grid[y][x] === 'floor') {
        grid[y][x] = 'drain';
      }
    }
  }

  // Portcullis gates at some sewer entrances
  for (const r of rooms) {
    if (rng.chance(0.4)) {
      // Place portcullis at room edge
      for (let x = r.x; x < r.x + r.width; x++) {
        if (inBounds(x, r.y - 1, width, height) && grid[r.y - 1][x] === 'wall') {
          grid[r.y - 1][x] = 'portcullis';
          break;
        }
      }
    }
  }

  // Moss on some floor tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'floor' && rng.chance(0.08)) grid[y][x] = 'moss-stone';
    }
  }

  // SEWER_STAMP in a large-enough side room
  for (const r of rooms) {
    if (r.width >= SEWER_STAMP.width + 1 && r.height >= SEWER_STAMP.height + 1 && rng.chance(0.5)) {
      const ox = r.x + Math.floor((r.width - SEWER_STAMP.width) / 2);
      const oy = r.y + Math.floor((r.height - SEWER_STAMP.height) / 2);
      placeStamp(grid, SEWER_STAMP, ox, oy);
      break;
    }
  }

  // Torches on walls near walkways
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] === 'wall' && rng.chance(0.04)) {
        // Check if adjacent to floor
        for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
          if (inBounds(nx, ny, width, height) && grid[ny][nx] === 'floor') {
            grid[y][x] = 'torch';
            break;
          }
        }
      }
    }
  }

  ensureConnectivity(grid, rooms, rng);

  features.push({ name: 'Sewer Channels', type: 'water', positions: [], description: 'Flowing water channels with narrow walkways' });
  features.push({ name: 'Sewer Grates', type: 'cover', positions: [], description: 'Drain grates and portcullis gates' });

  const entranceRoom = rooms.find(r => r.type === 'entrance') || rooms[0];
  const lastRoom = rooms[rooms.length - 1];

  const startingZones = {
    players: getFloorPositions(grid, entranceRoom, 4, rng),
    enemies: getFloorPositions(grid, lastRoom, 4, rng),
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'sewers', subTheme: 'sewer-tunnels',
    name: rng.pick(['The Undercity', 'Rat Warren', 'Storm Drains', 'Sewer Maze', 'The Dark Below']),
    description: `A sewer network with ${channelCount} water channels and ${rooms.length} rooms`,
  };
}

// ─── Castle Courtyard Generator ─────────────────────────────

export function generateCastleCourtyard(
  width: number = 30,
  height: number = 24,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const grid = createGrid(width, height, 'grass');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Outer castle walls
  const wallThickness = 1;
  const innerMargin = 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < wallThickness || y >= height - wallThickness || x < wallThickness || x >= width - wallThickness) {
        grid[y][x] = 'wall';
      }
    }
  }

  // Courtyard is the inner area — cobblestone
  const courtX = innerMargin + wallThickness;
  const courtY = innerMargin + wallThickness;
  const courtW = width - (innerMargin + wallThickness) * 2;
  const courtH = height - (innerMargin + wallThickness) * 2;

  for (let y = courtY; y < courtY + courtH; y++) {
    for (let x = courtX; x < courtX + courtW; x++) {
      if (inBounds(x, y, width, height)) grid[y][x] = 'cobblestone';
    }
  }

  // Walkway between outer wall and courtyard
  for (let y = wallThickness; y < height - wallThickness; y++) {
    for (let x = wallThickness; x < width - wallThickness; x++) {
      if (grid[y][x] === 'grass') grid[y][x] = 'floor';
    }
  }

  // Corner towers (4)
  const towerSize = 3;
  const towerPositions = [
    { x: 0, y: 0 }, { x: width - towerSize, y: 0 },
    { x: 0, y: height - towerSize }, { x: width - towerSize, y: height - towerSize },
  ];
  for (let ti = 0; ti < towerPositions.length; ti++) {
    const tp = towerPositions[ti];
    for (let ty = tp.y; ty < tp.y + towerSize; ty++) {
      for (let tx = tp.x; tx < tp.x + towerSize; tx++) {
        if (inBounds(tx, ty, width, height)) {
          if (ty === tp.y || ty === tp.y + towerSize - 1 || tx === tp.x || tx === tp.x + towerSize - 1) {
            grid[ty][tx] = 'wall';
          } else {
            grid[ty][tx] = 'floor';
          }
        }
      }
    }
    // Torch in each tower
    if (inBounds(tp.x + 1, tp.y + 1, width, height)) grid[tp.y + 1][tp.x + 1] = 'torch';
  }

  // Gatehouse — centered on the bottom wall
  const gateX = Math.floor(width / 2) - 2;
  const gateY = height - wallThickness - 2;
  for (let ty = gateY; ty < height; ty++) {
    for (let tx = gateX; tx < gateX + 4; tx++) {
      if (inBounds(tx, ty, width, height)) {
        if (tx === gateX || tx === gateX + 3) grid[ty][tx] = 'wall';
        else grid[ty][tx] = 'floor';
      }
    }
  }
  // Portcullis at gate entrance
  if (inBounds(gateX + 1, height - 1, width, height)) grid[height - 1][gateX + 1] = 'portcullis';
  if (inBounds(gateX + 2, height - 1, width, height)) grid[height - 1][gateX + 2] = 'portcullis';

  rooms.push({ id: 0, x: gateX + 1, y: gateY, width: 2, height: height - gateY, centerX: gateX + 1, centerY: gateY + 1, type: 'entrance' });

  // Keep — large building at the top of the courtyard
  const keepW = Math.floor(courtW * 0.5);
  const keepH = Math.floor(courtH * 0.35);
  const keepX = courtX + Math.floor((courtW - keepW) / 2);
  const keepY = courtY;

  for (let ty = keepY; ty < keepY + keepH; ty++) {
    for (let tx = keepX; tx < keepX + keepW; tx++) {
      if (inBounds(tx, ty, width, height)) {
        if (ty === keepY || ty === keepY + keepH - 1 || tx === keepX || tx === keepX + keepW - 1) {
          grid[ty][tx] = 'wall';
        } else {
          grid[ty][tx] = 'floor';
        }
      }
    }
  }
  // Keep door
  if (inBounds(keepX + Math.floor(keepW / 2), keepY + keepH - 1, width, height)) {
    grid[keepY + keepH - 1][keepX + Math.floor(keepW / 2)] = 'door';
  }
  // Throne inside the keep
  if (inBounds(keepX + Math.floor(keepW / 2), keepY + 1, width, height)) {
    grid[keepY + 1][keepX + Math.floor(keepW / 2)] = 'throne';
  }
  // Banners
  if (inBounds(keepX + 1, keepY, width, height) && grid[keepY][keepX + 1] === 'wall') grid[keepY][keepX + 1] = 'banner';
  if (inBounds(keepX + keepW - 2, keepY, width, height) && grid[keepY][keepX + keepW - 2] === 'wall') grid[keepY][keepX + keepW - 2] = 'banner';

  rooms.push({ id: 1, x: keepX + 1, y: keepY + 1, width: keepW - 2, height: keepH - 2, centerX: keepX + Math.floor(keepW / 2), centerY: keepY + Math.floor(keepH / 2), type: 'boss' });

  // Barracks — side building
  const barracksW = Math.floor(courtW * 0.25);
  const barracksH = Math.floor(courtH * 0.3);
  const barracksX = courtX;
  const barracksY = courtY + keepH + 1;

  for (let ty = barracksY; ty < barracksY + barracksH; ty++) {
    for (let tx = barracksX; tx < barracksX + barracksW; tx++) {
      if (inBounds(tx, ty, width, height)) {
        if (ty === barracksY || ty === barracksY + barracksH - 1 || tx === barracksX || tx === barracksX + barracksW - 1) {
          grid[ty][tx] = 'wall';
        } else {
          grid[ty][tx] = 'floor';
        }
      }
    }
  }
  // Barracks door
  if (inBounds(barracksX + barracksW - 1, barracksY + 1, width, height)) grid[barracksY + 1][barracksX + barracksW - 1] = 'door';
  // Beds inside
  for (let by = barracksY + 1; by < barracksY + barracksH - 1; by++) {
    if (inBounds(barracksX + 1, by, width, height) && grid[by][barracksX + 1] === 'floor') grid[by][barracksX + 1] = 'bed';
  }
  // Try BARRACKS_STAMP if it fits
  if (barracksW - 2 >= BARRACKS_STAMP.width && barracksH - 2 >= BARRACKS_STAMP.height) {
    const ox = barracksX + 1;
    const oy = barracksY + 1;
    placeStamp(grid, BARRACKS_STAMP, ox, oy);
  }

  rooms.push({ id: 2, x: barracksX + 1, y: barracksY + 1, width: barracksW - 2, height: barracksH - 2, centerX: barracksX + Math.floor(barracksW / 2), centerY: barracksY + Math.floor(barracksH / 2), type: 'normal' });

  // Armory — opposite side
  const armoryW = Math.floor(courtW * 0.25);
  const armoryH = Math.floor(courtH * 0.3);
  const armoryX = courtX + courtW - armoryW;
  const armoryY = courtY + keepH + 1;

  for (let ty = armoryY; ty < armoryY + armoryH; ty++) {
    for (let tx = armoryX; tx < armoryX + armoryW; tx++) {
      if (inBounds(tx, ty, width, height)) {
        if (ty === armoryY || ty === armoryY + armoryH - 1 || tx === armoryX || tx === armoryX + armoryW - 1) {
          grid[ty][tx] = 'wall';
        } else {
          grid[ty][tx] = 'floor';
        }
      }
    }
  }
  if (inBounds(armoryX, armoryY + 1, width, height)) grid[armoryY + 1][armoryX] = 'door';
  // Try ARMORY_STAMP
  if (armoryW - 2 >= ARMORY_STAMP.width && armoryH - 2 >= ARMORY_STAMP.height) {
    placeStamp(grid, ARMORY_STAMP, armoryX + 1, armoryY + 1);
  } else {
    // Manual weapon racks
    for (let ty = armoryY + 1; ty < armoryY + armoryH - 1; ty++) {
      if (inBounds(armoryX + armoryW - 2, ty, width, height) && grid[ty][armoryX + armoryW - 2] === 'floor') {
        grid[ty][armoryX + armoryW - 2] = 'weapon-rack';
      }
    }
  }
  rooms.push({ id: 3, x: armoryX + 1, y: armoryY + 1, width: armoryW - 2, height: armoryH - 2, centerX: armoryX + Math.floor(armoryW / 2), centerY: armoryY + Math.floor(armoryH / 2), type: 'treasure' });

  // Fountain or well in the center of the courtyard
  const fountainX = courtX + Math.floor(courtW / 2);
  const fountainY = courtY + Math.floor(courtH / 2) + 2;
  if (inBounds(fountainX, fountainY, width, height) && grid[fountainY][fountainX] === 'cobblestone') {
    grid[fountainY][fountainX] = rng.chance(0.6) ? 'fountain' : 'well';
  }

  // Lamp posts in the courtyard
  for (let x = courtX + 2; x < courtX + courtW - 2; x += 5) {
    for (let y = courtY + keepH + 2; y < courtY + courtH - 2; y += 5) {
      if (inBounds(x, y, width, height) && grid[y][x] === 'cobblestone') grid[y][x] = 'lamp-post';
    }
  }

  // Fence posts along the courtyard paths
  for (let x = courtX; x < courtX + courtW; x += 3) {
    const fenceY = courtY + courtH - 1;
    if (inBounds(x, fenceY, width, height) && grid[fenceY][x] === 'cobblestone') grid[fenceY][x] = 'fence';
  }

  // Symmetry for the courtyard
  mirrorGridHorizontal(grid, 0, 0, width, height);

  features.push({ name: 'Castle Walls', type: 'wall', positions: [], description: 'Thick castle walls with corner towers' });
  features.push({ name: 'Inner Keep', type: 'cover', positions: [], description: 'The lord\'s keep with throne room' });

  const startingZones = {
    players: getFloorPositions(grid, rooms[0], 4, rng),
    enemies: getFloorPositions(grid, rooms[1], 4, rng),
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'castle', subTheme: 'courtyard',
    name: rng.pick(['Castle Blackstone', 'Ironhold Keep', 'The Citadel', 'Raven\'s Roost', 'Crown Castle']),
    description: `A castle courtyard with keep, barracks, armory, and gatehouse`,
  };
}

// ─── Mine / Excavation Generator ────────────────────────────

export function generateMine(
  width: number = 28,
  height: number = 22,
  seed?: number,
  _options?: Record<string, any>,
): ProceduralMap {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 999999));
  const grid = createGrid(width, height, 'wall');
  const features: MapFeature[] = [];
  const rooms: Room[] = [];
  const corridors: Corridor[] = [];

  // Mine entrance — opening on the left
  const entranceY = Math.floor(height / 2);
  for (let dy = -1; dy <= 1; dy++) {
    if (inBounds(0, entranceY + dy, width, height)) grid[entranceY + dy][0] = 'floor';
    if (inBounds(1, entranceY + dy, width, height)) grid[entranceY + dy][1] = 'floor';
  }

  // Main mineshaft corridors — carved as winding tunnels
  const tunnelCount = rng.int(3, 5);
  const tunnelPoints: Array<{ x: number; y: number }> = [{ x: 2, y: entranceY }];

  for (let t = 0; t < tunnelCount; t++) {
    let cx = tunnelPoints[tunnelPoints.length - 1].x;
    let cy = tunnelPoints[tunnelPoints.length - 1].y;
    const targetX = rng.int(Math.min(cx + 4, width - 3), width - 2);
    const targetY = rng.int(2, height - 3);

    // Carve toward target
    while (cx !== targetX || cy !== targetY) {
      if (inBounds(cx, cy, width, height)) {
        grid[cy][cx] = 'dirt';
        // Wider tunnel
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (inBounds(cx + dx, cy + dy, width, height) && rng.chance(0.6)) {
            grid[cy + dy][cx + dx] = 'dirt';
          }
        }
      }
      if (rng.chance(0.6) && cx !== targetX) cx += cx < targetX ? 1 : -1;
      else if (cy !== targetY) cy += cy < targetY ? 1 : -1;
      else cx += cx < targetX ? 1 : -1;
    }
    tunnelPoints.push({ x: targetX, y: targetY });
  }

  // Branch tunnels off the main shaft
  for (let i = 0; i < tunnelPoints.length; i++) {
    if (rng.chance(0.5)) {
      const branchDir = rng.chance(0.5) ? 1 : -1;
      let bx = tunnelPoints[i].x;
      let by = tunnelPoints[i].y;
      const branchLen = rng.int(3, 8);
      for (let step = 0; step < branchLen; step++) {
        by += branchDir;
        if (rng.chance(0.3)) bx += rng.chance(0.5) ? 1 : -1;
        if (inBounds(bx, by, width, height)) grid[by][bx] = 'dirt';
      }
    }
  }

  // Cavern rooms at tunnel endpoints
  for (let i = 1; i < tunnelPoints.length; i++) {
    const tp = tunnelPoints[i];
    const cavernR = rng.int(2, 4);
    for (let dy = -cavernR; dy <= cavernR; dy++) {
      for (let dx = -cavernR; dx <= cavernR; dx++) {
        if (dx * dx + dy * dy <= cavernR * cavernR + rng.int(-1, 2)) {
          if (inBounds(tp.x + dx, tp.y + dy, width, height)) {
            grid[tp.y + dy][tp.x + dx] = 'dirt';
          }
        }
      }
    }
    rooms.push({
      id: rooms.length,
      x: tp.x - cavernR, y: tp.y - cavernR,
      width: cavernR * 2 + 1, height: cavernR * 2 + 1,
      centerX: tp.x, centerY: tp.y,
      type: i === tunnelPoints.length - 1 ? 'treasure' : 'normal',
    });
  }

  // Entrance room
  rooms.unshift({
    id: -1,
    x: 0, y: entranceY - 1, width: 3, height: 3,
    centerX: 1, centerY: entranceY,
    type: 'entrance',
  });
  // Fix IDs
  for (let i = 0; i < rooms.length; i++) rooms[i].id = i;

  // Minecart tracks along the main tunnel path
  for (let i = 0; i < tunnelPoints.length - 1; i++) {
    let cx = tunnelPoints[i].x;
    let cy = tunnelPoints[i].y;
    const tx = tunnelPoints[i + 1].x;
    const ty = tunnelPoints[i + 1].y;
    let steps = 0;
    while ((cx !== tx || cy !== ty) && steps < 100) {
      if (inBounds(cx, cy, width, height) && grid[cy][cx] === 'dirt') {
        grid[cy][cx] = 'minecart-track';
      }
      if (cx !== tx) cx += cx < tx ? 1 : -1;
      else if (cy !== ty) cy += cy < ty ? 1 : -1;
      steps++;
    }
  }

  // Support pillars along tunnels
  for (let y = 2; y < height - 2; y += 3) {
    for (let x = 2; x < width - 2; x += 4) {
      if (inBounds(x, y, width, height) && grid[y][x] === 'dirt') {
        // Only place if surrounded by tunnel
        let dirtyNeighbors = 0;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if (inBounds(x+dx, y+dy, width, height) && (grid[y+dy][x+dx] === 'dirt' || grid[y+dy][x+dx] === 'minecart-track')) dirtyNeighbors++;
        }
        if (dirtyNeighbors >= 3 && rng.chance(0.4)) grid[y][x] = 'pillar';
      }
    }
  }

  // Ore veins — rock tiles with special coloring (using moss-stone as glittering ore)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'wall') {
        // Check if adjacent to tunnel
        let adjTunnel = false;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if (inBounds(x+dx, y+dy, width, height) && grid[y+dy][x+dx] !== 'wall') adjTunnel = true;
        }
        if (adjTunnel && rng.chance(0.08)) grid[y][x] = 'moss-stone'; // Ore vein
      }
    }
  }

  // Torches along tunnel walls
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] === 'wall' && rng.chance(0.03)) {
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if (inBounds(x+dx, y+dy, width, height) && (grid[y+dy][x+dx] === 'dirt' || grid[y+dy][x+dx] === 'minecart-track')) {
            grid[y][x] = 'torch';
            break;
          }
        }
      }
    }
  }

  // Treasure in the deepest cavern
  const treasureRoom = rooms.find(r => r.type === 'treasure');
  if (treasureRoom) {
    if (inBounds(treasureRoom.centerX, treasureRoom.centerY, width, height)) {
      grid[treasureRoom.centerY][treasureRoom.centerX] = 'chest';
    }
    // Crates and barrels around treasure
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) {
      const tx = treasureRoom.centerX + dx, ty = treasureRoom.centerY + dy;
      if (inBounds(tx, ty, width, height) && grid[ty][tx] === 'dirt') {
        grid[ty][tx] = rng.pick(['crate', 'barrel']);
      }
    }
  }

  // Equipment near entrance
  if (inBounds(2, entranceY - 1, width, height) && grid[entranceY - 1][2] === 'dirt') grid[entranceY - 1][2] = 'barrel';
  if (inBounds(2, entranceY + 1, width, height) && grid[entranceY + 1][2] === 'dirt') grid[entranceY + 1][2] = 'crate';

  ensureConnectivity(grid, rooms, rng);

  features.push({ name: 'Mine Tunnels', type: 'cover', positions: [], description: 'Winding mine tunnels with support pillars' });
  features.push({ name: 'Minecart Tracks', type: 'cover', positions: [], description: 'Iron rails for ore carts' });
  features.push({ name: 'Ore Veins', type: 'cover', positions: [], description: 'Glittering mineral deposits in the walls' });

  const entranceRoom = rooms.find(r => r.type === 'entrance') || rooms[0];
  const deepRoom = rooms.find(r => r.type === 'treasure') || rooms[rooms.length - 1];

  const startingZones = {
    players: getFloorPositions(grid, entranceRoom, 4, rng),
    enemies: getFloorPositions(grid, deepRoom, 4, rng),
  };

  return {
    width, height, tiles: grid, rooms, corridors, startingZones, features,
    theme: 'mine', subTheme: 'excavation',
    name: rng.pick(['The Deep Dig', 'Ironvein Mine', 'Lost Excavation', 'Glittering Caverns', 'The Collapsed Mine']),
    description: `A mine with ${tunnelCount} tunnels, ${rooms.length} caverns, and minecart tracks`,
  };
}

// ─── Master Generator ───────────────────────────────────────

export type MapGeneratorTheme = 'dungeon' | 'cave' | 'wilderness' | 'urban' | 'indoor'
  | 'ship' | 'tower' | 'bridge' | 'caravan' | 'sewers' | 'castle' | 'mine';

/**
 * Generate a procedural map based on theme.
 * This is the main entry point for the map generator.
 */
export function generateMap(
  theme: MapGeneratorTheme,
  width?: number,
  height?: number,
  seed?: number,
  options?: Record<string, any>,
): ProceduralMap {
  const generated = (() => {
    switch (theme) {
    case 'dungeon':
      return generateDungeon(width ?? 30, height ?? 20, seed, options);
    case 'cave':
      return generateCave(width ?? 30, height ?? 20, seed, options);
    case 'wilderness':
      return generateWilderness(width ?? 30, height ?? 20, seed, options);
    case 'urban':
      return generateUrban(width ?? 30, height ?? 20, seed, options);
    case 'indoor':
      return generateIndoor(width ?? 24, height ?? 18, seed, options);
    case 'ship':
      return generateShipDeck(width ?? 28, height ?? 14, seed, options);
    case 'tower':
      return generateTower(width ?? 20, height ?? 20, seed, options);
    case 'bridge':
      return generateBridgeBattle(width ?? 30, height ?? 16, seed, options);
    case 'caravan':
      return generateCaravanAmbush(width ?? 32, height ?? 20, seed, options);
    case 'sewers':
      return generateSewers(width ?? 28, height ?? 22, seed, options);
    case 'castle':
      return generateCastleCourtyard(width ?? 30, height ?? 24, seed, options);
    case 'mine':
      return generateMine(width ?? 28, height ?? 22, seed, options);
    default:
      return generateDungeon(width ?? 30, height ?? 20, seed, options);
    }
  })();

  normalizeWeirdPlacements(generated.tiles);
  placeMultiTileOverhangs(generated.tiles, generated.width, generated.height);
  return generated;
}
