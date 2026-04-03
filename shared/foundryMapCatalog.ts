/**
 * Foundry VTT Map Catalog — Comprehensive database of free battle maps
 * sourced from popular Foundry VTT community modules.
 *
 * Each map is an EncounterMapTemplate with:
 * - Background image (imageUrl) for visual rendering
 * - Terrain grid with wall/LoS blocking data derived from map layout
 * - Starting zones for player/enemy placement
 * - Rich tags and description for AI GM narration and map selection
 * - Source attribution (module author)
 *
 * Maps are organized by theme and tagged extensively so the AI GM can pick
 * contextually appropriate maps based on the narrative.
 */

import { EncounterMapTemplate, TerrainTile, MapFeature, Position, MapTheme } from './types';

// ─── Helpers ─────────────────────────────────────────────────

function emptyGrid(width: number, height: number): TerrainTile[][] {
  const grid: TerrainTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TerrainTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ x, y, type: 'empty' });
    }
    grid.push(row);
  }
  return grid;
}

function setTerrain(grid: TerrainTile[][], positions: Position[], type: TerrainTile['type']): void {
  for (const pos of positions) {
    if (grid[pos.y] && grid[pos.y][pos.x]) {
      grid[pos.y][pos.x].type = type;
    }
  }
}

/** Generate wall positions along edges and specific columns/rows */
function wallBorder(width: number, height: number, openings?: Position[]): Position[] {
  const walls: Position[] = [];
  const openSet = new Set((openings || []).map(p => `${p.x},${p.y}`));
  for (let x = 0; x < width; x++) {
    if (!openSet.has(`${x},0`)) walls.push({ x, y: 0 });
    if (!openSet.has(`${x},${height - 1}`)) walls.push({ x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y++) {
    if (!openSet.has(`0,${y}`)) walls.push({ x: 0, y });
    if (!openSet.has(`${width - 1},${y}`)) walls.push({ x: width - 1, y });
  }
  return walls;
}

/** Generate starting zones at opposite ends */
function oppositeZones(width: number, height: number, count: number = 6): { players: Position[]; enemies: Position[] } {
  const players: Position[] = [];
  const enemies: Position[] = [];
  const midY = Math.floor(height / 2);
  for (let i = 0; i < count; i++) {
    const dy = Math.floor(i / 2) * (i % 2 === 0 ? 1 : -1);
    const py = Math.max(1, Math.min(height - 2, midY + dy));
    players.push({ x: 1 + Math.floor(i / 3), y: py });
    enemies.push({ x: width - 2 - Math.floor(i / 3), y: py });
  }
  return { players, enemies };
}

// ─── Extended Map Metadata ───────────────────────────────────

export interface FoundryMapEntry extends EncounterMapTemplate {
  /** The Foundry VTT module this map comes from */
  sourceModule: string;
  /** Author/creator of the map */
  author: string;
  /** License type (e.g., 'CC-BY-4.0', 'Free', 'CC0') */
  license: string;
  /** AI narration context — fed to the GM for scene descriptions */
  narrationContext: string;
  /** Suggested encounter difficulty levels */
  suggestedLevels?: { min: number; max: number };
  /** Ambient sounds associated with this map */
  ambientSounds?: string[];
  /** Lighting mood */
  lightingMood?: 'bright' | 'dim' | 'dark' | 'mixed';
  /** Whether the map has environmental hazards */
  hasHazards?: boolean;
  /** Tactical notes for the AI GM */
  tacticalNotes?: string;
  /** Map variants (e.g., day/night, seasons) */
  variants?: string[];
}

// ─── DICE GRIMORIUM — Free Battle Maps ───────────────────────

function createDGAncientCryptDungeon(): FoundryMapEntry {
  const w = 30, h = 20;
  const grid = emptyGrid(w, h);
  // Outer walls
  setTerrain(grid, wallBorder(w, h, [
    { x: 0, y: 10 }, { x: 29, y: 10 }, // entrances
  ]), 'impassable');
  // Internal walls forming crypt corridors
  for (let x = 5; x <= 24; x++) {
    if (x !== 10 && x !== 15 && x !== 20) {
      setTerrain(grid, [{ x, y: 5 }], 'impassable');
      setTerrain(grid, [{ x, y: 14 }], 'impassable');
    }
  }
  // Pillars
  for (const px of [8, 12, 17, 22]) {
    for (const py of [8, 11]) {
      setTerrain(grid, [{ x: px, y: py }], 'impassable');
    }
  }
  // Sarcophagi as difficult terrain
  setTerrain(grid, [
    { x: 14, y: 9 }, { x: 15, y: 9 }, { x: 14, y: 10 }, { x: 15, y: 10 },
  ], 'difficult');

  return {
    id: 'dg-ancient-crypt-dungeon',
    name: 'Ancient Crypt Dungeon',
    theme: 'dungeon',
    subTheme: 'ancient-crypt',
    description: 'A sprawling underground crypt with stone sarcophagi, crumbling pillars, and eerie green torchlight. Cobwebs drape the ceiling and bones litter the alcoves.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Sarcophagi', type: 'cover', positions: [{ x: 14, y: 9 }, { x: 15, y: 9 }, { x: 14, y: 10 }, { x: 15, y: 10 }], description: 'Ancient stone sarcophagi — provide cover' },
      { name: 'Stone Pillars', type: 'cover', positions: [{ x: 8, y: 8 }, { x: 12, y: 8 }, { x: 17, y: 8 }, { x: 22, y: 8 }], description: 'Crumbling stone pillars' },
    ],
    imageUrl: 'dg-ancient-crypt-dungeon.webp',
    tags: ['dungeon', 'crypt', 'undead', 'underground', 'dark', 'graves', 'spooky', 'pillars'],
    sourceModule: 'dice-grimorium-free-maps',
    author: 'Dice Grimorium',
    license: 'Free',
    narrationContext: 'The air is thick with dust and the faint smell of decay. Green-flamed torches line the walls, casting dancing shadows over rows of ancient sarcophagi. The stone floor is cracked and uneven, and bones crunch underfoot. Something stirs in the darkness ahead.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['dripping-water', 'wind-howling', 'chains-rattling'],
    lightingMood: 'dark',
    tacticalNotes: 'Pillars provide cover for ranged attackers. The sarcophagi in the center create a natural chokepoint. Creatures can use alcoves for flanking.',
  };
}

function createDGCityGates(): FoundryMapEntry {
  const w = 30, h = 20;
  const grid = emptyGrid(w, h);
  // Gate walls
  for (let y = 0; y < h; y++) {
    if (y < 7 || y > 12) {
      setTerrain(grid, [{ x: 14, y }, { x: 15, y }], 'impassable');
    }
  }
  // Guard towers
  for (let dx = 0; dx < 3; dx++) {
    for (let dy = 0; dy < 3; dy++) {
      setTerrain(grid, [{ x: 13 + dx, y: dy }], 'impassable');
      setTerrain(grid, [{ x: 13 + dx, y: h - 1 - dy }], 'impassable');
    }
  }
  // Crate barricades
  setTerrain(grid, [
    { x: 10, y: 8 }, { x: 10, y: 9 }, { x: 10, y: 10 }, { x: 10, y: 11 },
    { x: 19, y: 8 }, { x: 19, y: 9 }, { x: 19, y: 10 }, { x: 19, y: 11 },
  ], 'difficult');

  return {
    id: 'dg-city-gates',
    name: 'City Gates',
    theme: 'urban',
    subTheme: 'city-gates',
    description: 'A fortified city gate with twin guard towers, wooden barricades, and cobblestone roads. Guards patrol the battlements above.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Guard Towers', type: 'elevation', positions: [{ x: 14, y: 1 }, { x: 14, y: 18 }], description: 'Stone guard towers flanking the gate' },
      { name: 'Barricades', type: 'cover', positions: [{ x: 10, y: 9 }, { x: 19, y: 9 }], description: 'Wooden crate barricades for cover' },
    ],
    imageUrl: 'dg-city-gates.webp',
    tags: ['urban', 'gate', 'fortified', 'guards', 'towers', 'cobblestone', 'barricades', 'siege'],
    sourceModule: 'dice-grimorium-free-maps',
    author: 'Dice Grimorium',
    license: 'Free',
    narrationContext: 'Massive oak doors reinforced with iron bands stand between two imposing guard towers. The cobblestone road is worn smooth by centuries of foot traffic. Overhead, guards peer down from arrow slits, and the city banner snaps in the wind.',
    suggestedLevels: { min: 1, max: 12 },
    ambientSounds: ['crowd-murmur', 'wind', 'metal-clanking'],
    lightingMood: 'bright',
    tacticalNotes: 'The gate creates a natural chokepoint. Guard towers offer elevated positions. Barricades on both sides provide cover for defenders.',
  };
}

function createDGDesertPath(): FoundryMapEntry {
  const w = 30, h = 20;
  const grid = emptyGrid(w, h);
  // Sand dunes as difficult terrain
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if ((x + y) % 7 === 0 && y < 4) setTerrain(grid, [{ x, y }], 'difficult');
      if ((x + y) % 7 === 0 && y > 15) setTerrain(grid, [{ x, y }], 'difficult');
    }
  }
  // Rock formations
  setTerrain(grid, [
    { x: 8, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 6 },
    { x: 20, y: 13 }, { x: 21, y: 13 }, { x: 21, y: 14 },
  ], 'impassable');

  return {
    id: 'dg-desert-path',
    name: 'Desert Path',
    theme: 'wilderness',
    subTheme: 'desert',
    description: 'A sun-scorched desert trail winding between sand dunes and rocky outcroppings. Heat shimmers distort the horizon.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Sand Dunes', type: 'difficult-terrain', positions: [{ x: 3, y: 2 }, { x: 7, y: 1 }], description: 'Shifting sand dunes — difficult terrain' },
      { name: 'Rock Formation', type: 'cover', positions: [{ x: 8, y: 5 }, { x: 20, y: 13 }], description: 'Rocky outcroppings providing cover' },
    ],
    imageUrl: 'dg-desert-path.webp',
    tags: ['wilderness', 'desert', 'sand', 'arid', 'hot', 'open', 'rocks', 'dunes', 'ambush'],
    sourceModule: 'dice-grimorium-free-maps',
    author: 'Dice Grimorium',
    license: 'Free',
    narrationContext: 'The relentless sun beats down on a narrow desert trail. Sand dunes rise on either side, their crests shifting in the hot wind. Weathered rock formations jut from the sandy ground like ancient teeth. Somewhere in the distance, a vulture circles.',
    suggestedLevels: { min: 1, max: 10 },
    ambientSounds: ['wind-desert', 'sand-shifting'],
    lightingMood: 'bright',
    tacticalNotes: 'Open terrain with limited cover. Rock formations are the only solid cover. Sand dunes create difficult terrain on the flanks. Good for cavalry or ranged encounters.',
  };
}

function createDGDragonLair(): FoundryMapEntry {
  const w = 32, h = 22;
  const grid = emptyGrid(w, h);
  // Cave walls
  setTerrain(grid, wallBorder(w, h, [{ x: 0, y: 11 }]), 'impassable');
  // Stalagmites
  for (const pos of [
    { x: 6, y: 5 }, { x: 10, y: 7 }, { x: 5, y: 14 }, { x: 11, y: 16 },
    { x: 20, y: 4 }, { x: 25, y: 8 }, { x: 22, y: 15 }, { x: 27, y: 12 },
  ]) {
    setTerrain(grid, [pos], 'impassable');
  }
  // Treasure hoard — difficult terrain
  for (let x = 18; x <= 24; x++) {
    for (let y = 8; y <= 13; y++) {
      if (Math.random() < 0.4) setTerrain(grid, [{ x, y }], 'difficult');
    }
  }
  // Lava pools
  setTerrain(grid, [
    { x: 3, y: 8 }, { x: 3, y: 9 }, { x: 4, y: 8 }, { x: 4, y: 9 },
    { x: 28, y: 4 }, { x: 28, y: 5 }, { x: 29, y: 4 }, { x: 29, y: 5 },
  ], 'impassable');

  return {
    id: 'dg-dragon-lair',
    name: 'Dragon Lair',
    theme: 'cave',
    subTheme: 'dragon-lair',
    description: 'A vast underground cavern lit by pools of molten lava. Heaps of gold and treasure surround a massive nest of charred bones. Stalagmites rise like fangs from the cavern floor.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 10 }, { x: 1, y: 11 }, { x: 1, y: 12 }, { x: 2, y: 10 }, { x: 2, y: 11 }, { x: 2, y: 12 }],
      enemies: [{ x: 21, y: 10 }, { x: 21, y: 11 }, { x: 22, y: 10 }, { x: 22, y: 11 }, { x: 23, y: 10 }, { x: 23, y: 11 }],
    },
    features: [
      { name: 'Lava Pools', type: 'lava', positions: [{ x: 3, y: 8 }, { x: 28, y: 4 }], description: 'Pools of molten lava — lethal to touch' },
      { name: 'Treasure Hoard', type: 'difficult-terrain', positions: [{ x: 21, y: 10 }], description: 'Mountains of gold coins and gems — difficult terrain' },
      { name: 'Stalagmites', type: 'cover', positions: [{ x: 6, y: 5 }, { x: 10, y: 7 }], description: 'Natural stone formations providing cover' },
    ],
    imageUrl: 'dg-dragon-lair.webp',
    tags: ['cave', 'dragon', 'lair', 'lava', 'treasure', 'boss', 'underground', 'dark', 'epic', 'fire'],
    sourceModule: 'dice-grimorium-free-maps',
    author: 'Dice Grimorium',
    license: 'Free',
    narrationContext: 'The cavern opens into an enormous chamber, the air thick with sulfurous heat. Rivers of lava cast an orange glow across mountains of gold, gems, and ancient weapons. In the center, amidst charred bones the size of horses, something enormous breathes.',
    suggestedLevels: { min: 8, max: 20 },
    ambientSounds: ['lava-bubbling', 'deep-breathing', 'rocks-crumbling'],
    lightingMood: 'mixed',
    hasHazards: true,
    tacticalNotes: 'Lava pools are environmental hazards (fire damage). Treasure hoard is difficult terrain. Stalagmites provide cover but the dragon has a clear LoS across most of the cavern. Best for boss encounters.',
  };
}

function createDGForestPath(): FoundryMapEntry {
  const w = 30, h = 20;
  const grid = emptyGrid(w, h);
  // Tree clusters
  const trees: Position[] = [
    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 },
    { x: 7, y: 1 }, { x: 8, y: 1 }, { x: 7, y: 2 },
    { x: 26, y: 3 }, { x: 27, y: 3 }, { x: 27, y: 4 },
    { x: 1, y: 15 }, { x: 2, y: 15 }, { x: 1, y: 16 },
    { x: 6, y: 17 }, { x: 7, y: 17 }, { x: 7, y: 18 },
    { x: 22, y: 16 }, { x: 23, y: 16 }, { x: 23, y: 17 },
    { x: 27, y: 15 }, { x: 28, y: 15 }, { x: 28, y: 16 },
    { x: 13, y: 2 }, { x: 14, y: 2 },
    { x: 15, y: 17 }, { x: 16, y: 17 },
  ];
  setTerrain(grid, trees, 'impassable');
  // Undergrowth
  const undergrowth: Position[] = [
    { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 5 },
    { x: 25, y: 5 }, { x: 24, y: 6 },
    { x: 3, y: 13 }, { x: 4, y: 14 },
    { x: 24, y: 14 }, { x: 25, y: 13 },
    { x: 12, y: 8 }, { x: 17, y: 11 },
  ];
  setTerrain(grid, undergrowth, 'difficult');

  return {
    id: 'dg-forest-path',
    name: 'Forest Path',
    theme: 'wilderness',
    subTheme: 'forest',
    description: 'A winding dirt path through a dense forest. Dappled sunlight filters through the canopy, and thick undergrowth flanks the trail.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Tree Clusters', type: 'wall', positions: trees.slice(0, 4), description: 'Dense tree trunks blocking movement and line of sight' },
      { name: 'Undergrowth', type: 'difficult-terrain', positions: undergrowth, description: 'Thick bushes and brambles — difficult terrain' },
    ],
    imageUrl: 'dg-forest-path.webp',
    tags: ['wilderness', 'forest', 'trees', 'path', 'ambush', 'nature', 'green', 'outdoor'],
    sourceModule: 'dice-grimorium-free-maps',
    author: 'Dice Grimorium',
    license: 'Free',
    narrationContext: 'A narrow dirt path winds through towering oaks and thick underbrush. Birdsong fills the canopy above, but the undergrowth is suspiciously quiet. Dappled sunlight barely penetrates the thick canopy, creating shifting pools of light and shadow.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['birds-singing', 'leaves-rustling', 'stream-nearby'],
    lightingMood: 'dim',
    tacticalNotes: 'Trees block LoS and provide cover. Undergrowth creates difficult terrain for flanking maneuvers. The path is the most direct route but exposes characters. Ideal for ambush encounters.',
  };
}

function createDGIceDragonCave(): FoundryMapEntry {
  const w = 32, h = 22;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [{ x: 0, y: 11 }]), 'impassable');
  // Ice pillars
  const pillars: Position[] = [
    { x: 7, y: 6 }, { x: 12, y: 4 }, { x: 18, y: 7 },
    { x: 7, y: 15 }, { x: 13, y: 17 }, { x: 19, y: 14 },
    { x: 24, y: 6 }, { x: 24, y: 15 },
  ];
  setTerrain(grid, pillars, 'impassable');
  // Frozen lake — difficult (slippery)
  for (let x = 14; x <= 20; x++) {
    for (let y = 9; y <= 12; y++) {
      setTerrain(grid, [{ x, y }], 'difficult');
    }
  }

  return {
    id: 'dg-ice-dragon-cave',
    name: 'Ice Dragon Cave',
    theme: 'cave',
    subTheme: 'ice-cave',
    description: 'A frozen cavern glittering with ice crystals. A frozen lake dominates the center, and massive ice pillars support the vaulted ceiling.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 10 }, { x: 1, y: 11 }, { x: 1, y: 12 }, { x: 2, y: 10 }, { x: 2, y: 11 }, { x: 2, y: 12 }],
      enemies: [{ x: 25, y: 10 }, { x: 25, y: 11 }, { x: 26, y: 10 }, { x: 26, y: 11 }, { x: 27, y: 10 }, { x: 27, y: 11 }],
    },
    features: [
      { name: 'Frozen Lake', type: 'difficult-terrain', positions: [{ x: 17, y: 10 }], description: 'Slippery ice — difficult terrain, Acrobatics check to avoid falling prone' },
      { name: 'Ice Pillars', type: 'cover', positions: pillars, description: 'Towering ice formations — provide cover and block LoS' },
    ],
    imageUrl: 'dg-ice-dragon-cave.webp',
    tags: ['cave', 'ice', 'dragon', 'cold', 'frozen', 'slippery', 'boss', 'underground', 'crystal'],
    sourceModule: 'dice-grimorium-free-maps',
    author: 'Dice Grimorium',
    license: 'Free',
    narrationContext: 'Crystalline ice formations refract pale blue light throughout this frozen cavern. The floor is treacherously slick, and your breath comes in clouds of white mist. A frozen lake stretches across the center, its surface smooth as a mirror and equally treacherous.',
    suggestedLevels: { min: 6, max: 16 },
    ambientSounds: ['ice-cracking', 'wind-howling', 'dripping-water'],
    lightingMood: 'dim',
    hasHazards: true,
    tacticalNotes: 'Frozen lake is difficult terrain and creatures may need Acrobatics checks. Ice pillars provide cover. Cold damage potential from environment. Boss encounter with excellent tactical depth.',
  };
}

// ─── TOM CARTOS — Free Battle Maps ──────────────────────────

function createTCTavernCommon(): FoundryMapEntry {
  const w = 24, h = 18;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [
    { x: 0, y: 9 }, // Front door
    { x: 23, y: 9 }, // Back door
  ]), 'impassable');
  // Interior walls
  for (let y = 0; y < 8; y++) setTerrain(grid, [{ x: 16, y }], 'impassable');
  setTerrain(grid, [{ x: 16, y: 8 }], 'empty'); // doorway
  for (let y = 10; y < h; y++) setTerrain(grid, [{ x: 16, y }], 'impassable');
  // Bar counter
  for (let x = 17; x <= 21; x++) setTerrain(grid, [{ x, y: 4 }], 'impassable');
  // Tables
  const tables: Position[] = [
    { x: 4, y: 4 }, { x: 5, y: 4 },
    { x: 4, y: 8 }, { x: 5, y: 8 },
    { x: 10, y: 4 }, { x: 11, y: 4 },
    { x: 10, y: 8 }, { x: 11, y: 8 },
    { x: 4, y: 13 }, { x: 5, y: 13 },
    { x: 10, y: 13 }, { x: 11, y: 13 },
  ];
  setTerrain(grid, tables, 'difficult');

  return {
    id: 'tc-tavern-common',
    name: 'The Rusty Flagon Tavern',
    theme: 'indoor',
    subTheme: 'tavern',
    description: 'A cozy but worn tavern with a long bar counter, scattered tables, and a roaring fireplace. Ale stains the wooden floor and the air smells of roasted meat.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 8 }, { x: 1, y: 9 }, { x: 1, y: 10 }, { x: 2, y: 8 }, { x: 2, y: 9 }, { x: 2, y: 10 }],
      enemies: [{ x: 12, y: 8 }, { x: 12, y: 9 }, { x: 13, y: 8 }, { x: 13, y: 9 }, { x: 14, y: 8 }, { x: 14, y: 9 }],
    },
    features: [
      { name: 'Bar Counter', type: 'cover', positions: [{ x: 17, y: 4 }, { x: 18, y: 4 }, { x: 19, y: 4 }, { x: 20, y: 4 }, { x: 21, y: 4 }], description: 'Solid oak bar counter — provides cover' },
      { name: 'Tables', type: 'difficult-terrain', positions: tables, description: 'Wooden tables — can be tipped for cover' },
    ],
    imageUrl: 'tc-tavern-common.webp',
    tags: ['indoor', 'tavern', 'bar', 'inn', 'social', 'brawl', 'furniture', 'cozy', 'fireplace'],
    sourceModule: 'tom-cartos-free-maps',
    author: 'Tom Cartos',
    license: 'CC-BY-4.0',
    narrationContext: 'The tavern is full of the comforting sounds of clinking mugs and murmured conversation. A crackling fire warms one end of the room, while the long bar is attended by a gruff bartender. Suddenly, a chair flies across the room.',
    suggestedLevels: { min: 1, max: 5 },
    ambientSounds: ['tavern-crowd', 'fire-crackling', 'mugs-clinking'],
    lightingMood: 'dim',
    tacticalNotes: 'Tight quarters favor melee. Tables can be flipped for cover. The bar counter divides the room. Interior wall creates two engagement zones. Classic brawl encounter.',
    variants: ['day', 'night', 'ransacked'],
  };
}

function createTCGoblinCamp(): FoundryMapEntry {
  const w = 28, h = 20;
  const grid = emptyGrid(w, h);
  // Wooden palisade walls
  for (let x = 4; x <= 23; x++) {
    setTerrain(grid, [{ x, y: 3 }], 'impassable');
    setTerrain(grid, [{ x, y: 16 }], 'impassable');
  }
  for (let y = 3; y <= 16; y++) {
    setTerrain(grid, [{ x: 4, y }], 'impassable');
    setTerrain(grid, [{ x: 23, y }], 'impassable');
  }
  // Gate opening
  setTerrain(grid, [{ x: 13, y: 3 }, { x: 14, y: 3 }], 'empty');
  // Tents (difficult terrain)
  const tents: Position[] = [
    { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 7 },
    { x: 18, y: 6 }, { x: 19, y: 6 }, { x: 18, y: 7 }, { x: 19, y: 7 },
    { x: 12, y: 12 }, { x: 13, y: 12 }, { x: 12, y: 13 }, { x: 13, y: 13 },
  ];
  setTerrain(grid, tents, 'difficult');
  // Campfire
  setTerrain(grid, [{ x: 13, y: 9 }, { x: 14, y: 9 }], 'difficult');

  return {
    id: 'tc-goblin-camp',
    name: 'Goblin Camp',
    theme: 'wilderness',
    subTheme: 'camp',
    description: 'A crude goblin camp surrounded by a wooden palisade. Tattered tents cluster around a smoky campfire, and crude weapons lean against posts.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 12, y: 1 }, { x: 13, y: 1 }, { x: 14, y: 1 }, { x: 15, y: 1 }, { x: 12, y: 2 }, { x: 13, y: 2 }],
      enemies: [{ x: 10, y: 9 }, { x: 11, y: 9 }, { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 13, y: 10 }, { x: 14, y: 10 }],
    },
    features: [
      { name: 'Palisade', type: 'wall', positions: [{ x: 4, y: 3 }], description: 'Crude wooden palisade wall' },
      { name: 'Tents', type: 'cover', positions: tents, description: 'Tattered tents — provide concealment' },
      { name: 'Campfire', type: 'hazard', positions: [{ x: 13, y: 9 }, { x: 14, y: 9 }], description: 'Burning campfire — fire damage' },
    ],
    imageUrl: 'tc-goblin-camp.webp',
    tags: ['wilderness', 'camp', 'goblin', 'palisade', 'tents', 'campfire', 'raid', 'small-creatures'],
    sourceModule: 'tom-cartos-free-maps',
    author: 'Tom Cartos',
    license: 'CC-BY-4.0',
    narrationContext: 'Beyond the crude palisade gate, you see a cluster of ragged tents surrounding a smoldering campfire. The stench of rotting food and unwashed goblin hits you like a wall. Sharp eyes peer at you from behind tent flaps.',
    suggestedLevels: { min: 1, max: 4 },
    ambientSounds: ['fire-crackling', 'goblin-chatter', 'dogs-barking'],
    lightingMood: 'dim',
    tacticalNotes: 'Palisade funnels attackers through the gate. Tents provide cover for ambushers. Campfire is an environmental hazard. Good for low-level raid encounters.',
  };
}

function createTCTempleRuins(): FoundryMapEntry {
  const w = 28, h = 22;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [
    { x: 14, y: 0 }, // North entrance
    { x: 14, y: 21 }, // South entrance
  ]), 'impassable');
  // Pillars in two rows
  for (let y = 4; y <= 17; y += 3) {
    setTerrain(grid, [{ x: 6, y }], 'impassable');
    setTerrain(grid, [{ x: 21, y }], 'impassable');
  }
  // Raised altar platform (difficult terrain due to steps)
  for (let x = 10; x <= 17; x++) {
    for (let y = 8; y <= 13; y++) {
      if (x === 10 || x === 17 || y === 8 || y === 13) {
        setTerrain(grid, [{ x, y }], 'difficult');
      }
    }
  }
  // Rubble
  setTerrain(grid, [
    { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 24, y: 16 }, { x: 25, y: 16 },
  ], 'difficult');

  return {
    id: 'tc-temple-ruins',
    name: 'Temple Ruins',
    theme: 'dungeon',
    subTheme: 'temple',
    description: 'The crumbling remains of an ancient temple. Broken pillars line a central nave leading to a raised altar. Vines creep through cracks in the stone floor.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 13, y: 1 }, { x: 14, y: 1 }, { x: 15, y: 1 }, { x: 13, y: 2 }, { x: 14, y: 2 }, { x: 15, y: 2 }],
      enemies: [{ x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 }, { x: 13, y: 11 }, { x: 14, y: 11 }],
    },
    features: [
      { name: 'Stone Pillars', type: 'cover', positions: [{ x: 6, y: 4 }, { x: 6, y: 7 }, { x: 21, y: 4 }, { x: 21, y: 7 }], description: 'Crumbling stone pillars' },
      { name: 'Raised Altar', type: 'elevation', positions: [{ x: 13, y: 10 }, { x: 14, y: 10 }], description: 'Raised stone altar platform — elevated position' },
      { name: 'Rubble', type: 'difficult-terrain', positions: [{ x: 3, y: 5 }, { x: 24, y: 16 }], description: 'Collapsed stonework' },
    ],
    imageUrl: 'tc-temple-ruins.webp',
    tags: ['dungeon', 'temple', 'ruins', 'altar', 'pillars', 'ancient', 'religious', 'undead', 'cultist'],
    sourceModule: 'tom-cartos-free-maps',
    author: 'Tom Cartos',
    license: 'CC-BY-4.0',
    narrationContext: 'Broken pillars frame a long nave carpeted in dust and fallen leaves. At the far end, a stone altar still stands, dark stains marking its surface. The air is thick with the weight of forgotten prayers and ancient power.',
    suggestedLevels: { min: 3, max: 10 },
    ambientSounds: ['wind-through-ruins', 'distant-chanting', 'stone-crumbling'],
    lightingMood: 'dim',
    tacticalNotes: 'Pillars create two lanes for advancement. The altar platform provides elevated advantage. Rubble areas are difficult terrain. Good for cultist or undead encounters.',
    variants: ['intact', 'overgrown', 'desecrated'],
  };
}

function createTCDockWarehouse(): FoundryMapEntry {
  const w = 26, h = 20;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [
    { x: 0, y: 10 }, { x: 25, y: 10 }, // Side doors
    { x: 13, y: 0 }, // Loading dock
  ]), 'impassable');
  // Crate stacks
  const crates: Position[] = [
    { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 4 },
    { x: 10, y: 3 }, { x: 11, y: 3 },
    { x: 20, y: 3 }, { x: 21, y: 3 }, { x: 20, y: 4 }, { x: 21, y: 4 },
    { x: 4, y: 15 }, { x: 5, y: 15 }, { x: 4, y: 16 }, { x: 5, y: 16 },
    { x: 12, y: 14 }, { x: 13, y: 14 },
    { x: 20, y: 15 }, { x: 21, y: 15 }, { x: 20, y: 16 },
  ];
  setTerrain(grid, crates, 'impassable');

  return {
    id: 'tc-dock-warehouse',
    name: 'Dockside Warehouse',
    theme: 'urban',
    subTheme: 'docks',
    description: 'A dockside warehouse filled with stacked crates, barrels, and shipping containers. Dust motes float in shafts of light from high windows.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Crate Stacks', type: 'cover', positions: crates, description: 'Stacked wooden crates — provide full cover' },
    ],
    imageUrl: 'tc-dock-warehouse.webp',
    tags: ['urban', 'warehouse', 'docks', 'crates', 'smuggler', 'thieves', 'indoor', 'heist'],
    sourceModule: 'tom-cartos-free-maps',
    author: 'Tom Cartos',
    license: 'CC-BY-4.0',
    narrationContext: 'The warehouse is dimly lit by light filtering through grimy skylights. Towers of crates and barrels create a maze of narrow passages. The smell of salt, fish, and old wood permeates the air. Somewhere in the shadows, you hear a footstep.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['creaking-wood', 'seagulls', 'water-lapping'],
    lightingMood: 'dim',
    tacticalNotes: 'Crate stacks create excellent cover and narrow channels. Multiple entry points allow flanking. Good for stealth and ambush encounters. Rogues excel here.',
  };
}

// ─── FORGOTTEN ADVENTURES — Free Tier Maps ──────────────────

function createFACaveEntrance(): FoundryMapEntry {
  const w = 28, h = 20;
  const grid = emptyGrid(w, h);
  // Cave walls (natural irregular shape)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const distFromCenter = Math.abs(y - 10) + Math.abs(x - 14) * 0.3;
      if (distFromCenter > 12) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Cave entrance opening
  for (let y = 7; y <= 12; y++) {
    setTerrain(grid, [{ x: 0, y }, { x: 1, y }], 'empty');
  }
  // Stalactites/stalagmites
  setTerrain(grid, [
    { x: 8, y: 6 }, { x: 12, y: 8 }, { x: 18, y: 5 },
    { x: 10, y: 13 }, { x: 16, y: 14 }, { x: 22, y: 9 },
  ], 'impassable');
  // Stream
  for (let x = 5; x <= 20; x++) {
    const y = 10 + Math.floor(Math.sin(x * 0.5) * 2);
    if (grid[y] && grid[y][x]) setTerrain(grid, [{ x, y }], 'difficult');
  }

  return {
    id: 'fa-cave-entrance',
    name: 'Cave Entrance',
    theme: 'cave',
    subTheme: 'entrance',
    description: 'A natural cave entrance opening into a wider cavern. A small stream trickles through the center, and stalactites hang from the low ceiling.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 8 }, { x: 1, y: 9 }, { x: 1, y: 10 }, { x: 1, y: 11 }, { x: 2, y: 8 }, { x: 2, y: 11 }],
      enemies: [{ x: 20, y: 9 }, { x: 20, y: 10 }, { x: 21, y: 9 }, { x: 21, y: 10 }, { x: 22, y: 10 }, { x: 22, y: 11 }],
    },
    features: [
      { name: 'Cave Stream', type: 'water', positions: [{ x: 10, y: 10 }], description: 'Shallow stream — difficult terrain' },
      { name: 'Stalagmites', type: 'cover', positions: [{ x: 8, y: 6 }, { x: 12, y: 8 }], description: 'Natural stone formations' },
    ],
    imageUrl: 'fa-cave-entrance.webp',
    tags: ['cave', 'entrance', 'natural', 'underground', 'stream', 'dark', 'stalactites', 'exploration'],
    sourceModule: 'forgotten-adventures-free',
    author: 'Forgotten Adventures',
    license: 'Free',
    narrationContext: 'The cave mouth yawns before you, the darkness beyond barely pierced by daylight. A thin stream gurgles across the stone floor, its water ice-cold. The ceiling is low and studded with stalactites that drip moisture. The air smells of wet stone and something... else.',
    suggestedLevels: { min: 1, max: 6 },
    ambientSounds: ['dripping-water', 'stream-flowing', 'bats-squeaking'],
    lightingMood: 'dark',
    tacticalNotes: 'Narrow entrance creates a funnel. Stalagmites provide cover in the wider cavern. Stream is difficult terrain dividing the battlefield.',
  };
}

function createFAGraveyardNight(): FoundryMapEntry {
  const w = 30, h = 20;
  const grid = emptyGrid(w, h);
  // Fence around perimeter
  setTerrain(grid, wallBorder(w, h, [
    { x: 15, y: 0 }, { x: 15, y: 19 }, // Gates
  ]), 'impassable');
  // Gravestones (scattered cover)
  const graves: Position[] = [];
  for (let x = 3; x < 27; x += 3) {
    for (let y = 3; y < 17; y += 4) {
      graves.push({ x, y });
    }
  }
  setTerrain(grid, graves, 'difficult');
  // Mausoleum
  for (let x = 12; x <= 17; x++) {
    for (let y = 8; y <= 11; y++) {
      if (x === 12 || x === 17 || y === 8 || y === 11) {
        setTerrain(grid, [{ x, y }], 'impassable');
      }
    }
  }
  // Door
  setTerrain(grid, [{ x: 14, y: 11 }, { x: 15, y: 11 }], 'empty');

  return {
    id: 'fa-graveyard-night',
    name: 'Moonlit Graveyard',
    theme: 'urban',
    subTheme: 'graveyard',
    description: 'A fog-shrouded graveyard under a full moon. Crooked gravestones lean at odd angles, and a stone mausoleum looms at the center.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 14, y: 1 }, { x: 15, y: 1 }, { x: 16, y: 1 }, { x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 }],
      enemies: [{ x: 13, y: 9 }, { x: 14, y: 9 }, { x: 15, y: 9 }, { x: 16, y: 9 }, { x: 14, y: 10 }, { x: 15, y: 10 }],
    },
    features: [
      { name: 'Gravestones', type: 'cover', positions: graves.slice(0, 6), description: 'Crooked gravestones — lesser cover' },
      { name: 'Mausoleum', type: 'wall', positions: [{ x: 12, y: 8 }], description: 'Stone mausoleum' },
    ],
    imageUrl: 'fa-graveyard-night.webp',
    tags: ['urban', 'graveyard', 'undead', 'night', 'fog', 'spooky', 'moon', 'graves', 'mausoleum', 'necromancer'],
    sourceModule: 'forgotten-adventures-free',
    author: 'Forgotten Adventures',
    license: 'Free',
    narrationContext: 'Fog rolls between crooked gravestones beneath a swollen moon. The iron gate creaks behind you as you step onto the overgrown path. At the center of the graveyard, a stone mausoleum stands with its door slightly ajar. The ground... is freshly disturbed.',
    suggestedLevels: { min: 2, max: 10 },
    ambientSounds: ['owls-hooting', 'wind-moaning', 'dirt-shifting'],
    lightingMood: 'dark',
    tacticalNotes: 'Gravestones provide scattered lesser cover. The mausoleum is a strongpoint. Fog may limit visibility. Undead can emerge from any grave. Classic horror encounter.',
    variants: ['foggy', 'clear-night', 'rainy'],
  };
}

function createFAMarketSquare(): FoundryMapEntry {
  const w = 30, h = 24;
  const grid = emptyGrid(w, h);
  // Market stalls (lines of difficult terrain / cover)
  const stalls: Position[] = [];
  for (let x = 4; x <= 8; x++) {
    stalls.push({ x, y: 5 }, { x, y: 6 });
    stalls.push({ x, y: 11 }, { x, y: 12 });
    stalls.push({ x, y: 17 }, { x, y: 18 });
  }
  for (let x = 14; x <= 18; x++) {
    stalls.push({ x, y: 5 }, { x, y: 6 });
    stalls.push({ x, y: 11 }, { x, y: 12 });
    stalls.push({ x, y: 17 }, { x, y: 18 });
  }
  setTerrain(grid, stalls, 'difficult');
  // Fountain in center
  setTerrain(grid, [
    { x: 22, y: 10 }, { x: 23, y: 10 }, { x: 24, y: 10 },
    { x: 22, y: 11 }, { x: 24, y: 11 },
    { x: 22, y: 12 }, { x: 23, y: 12 }, { x: 24, y: 12 },
  ], 'impassable');
  // Building walls on edges
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 3; x++) setTerrain(grid, [{ x, y }], 'impassable');
    for (let x = w - 3; x < w; x++) setTerrain(grid, [{ x, y }], 'impassable');
  }
  for (let y = h - 4; y < h; y++) {
    for (let x = 0; x < 3; x++) setTerrain(grid, [{ x, y }], 'impassable');
    for (let x = w - 3; x < w; x++) setTerrain(grid, [{ x, y }], 'impassable');
  }

  return {
    id: 'fa-market-square',
    name: 'Market Square',
    theme: 'urban',
    subTheme: 'market',
    description: 'A bustling market square with rows of vendor stalls, a central fountain, and buildings lining the edges. Awnings cast colored shadows across the cobblestones.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 3, y: 10 }, { x: 3, y: 11 }, { x: 3, y: 12 }, { x: 3, y: 13 }, { x: 4, y: 10 }, { x: 4, y: 13 }],
      enemies: [{ x: 26, y: 10 }, { x: 26, y: 11 }, { x: 26, y: 12 }, { x: 26, y: 13 }, { x: 25, y: 10 }, { x: 25, y: 13 }],
    },
    features: [
      { name: 'Market Stalls', type: 'cover', positions: stalls.slice(0, 8), description: 'Wooden market stalls — provide cover and difficult terrain' },
      { name: 'Fountain', type: 'wall', positions: [{ x: 23, y: 11 }], description: 'Stone fountain — blocks movement' },
    ],
    imageUrl: 'fa-market-square.webp',
    tags: ['urban', 'market', 'square', 'town', 'fountain', 'stalls', 'crowded', 'daytime', 'chase'],
    sourceModule: 'forgotten-adventures-free',
    author: 'Forgotten Adventures',
    license: 'Free',
    narrationContext: 'The market square is alive with color and noise — vendors hawking wares, children running between stalls, the splash of the central fountain. But trouble cuts through the crowd like a blade.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['crowd-murmur', 'vendors-shouting', 'fountain-splashing'],
    lightingMood: 'bright',
    tacticalNotes: 'Market stalls provide cover and create lanes. Fountain blocks center movement. Building corners offer hard cover. Civilians may be present (hazard for AoE). Good for chase or ambush encounters.',
  };
}

// ─── CZEPEKU — Free Tier Maps ────────────────────────────────

function createCZShipDeck(): FoundryMapEntry {
  const w = 20, h = 30;
  const grid = emptyGrid(w, h);
  // Ship hull outline
  for (let y = 0; y < h; y++) {
    const halfWidth = Math.floor(8 - Math.abs(y - 15) * 0.4);
    const left = Math.max(0, 10 - halfWidth);
    const right = Math.min(w - 1, 10 + halfWidth);
    for (let x = 0; x < w; x++) {
      if (x < left || x > right) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Mast
  setTerrain(grid, [{ x: 10, y: 10 }, { x: 10, y: 20 }], 'impassable');
  // Cargo hatches
  setTerrain(grid, [
    { x: 8, y: 14 }, { x: 9, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 },
  ], 'difficult');
  // Railing (difficult terrain along edges)
  for (let y = 2; y < h - 2; y++) {
    const halfWidth = Math.floor(8 - Math.abs(y - 15) * 0.4);
    const left = Math.max(0, 10 - halfWidth);
    const right = Math.min(w - 1, 10 + halfWidth);
    if (grid[y][left + 1]?.type === 'empty') setTerrain(grid, [{ x: left + 1, y }], 'empty');
    if (grid[y][right - 1]?.type === 'empty') setTerrain(grid, [{ x: right - 1, y }], 'empty');
  }

  return {
    id: 'cz-ship-deck',
    name: 'Ship Deck',
    theme: 'ship',
    subTheme: 'sailing-ship',
    description: 'The deck of a three-masted sailing ship. Rope coils, cargo hatches, and a ship\'s wheel occupy the weathered planks. Waves crash against the hull.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 9, y: 25 }, { x: 10, y: 25 }, { x: 11, y: 25 }, { x: 9, y: 26 }, { x: 10, y: 26 }, { x: 11, y: 26 }],
      enemies: [{ x: 9, y: 5 }, { x: 10, y: 5 }, { x: 11, y: 5 }, { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }],
    },
    features: [
      { name: 'Main Mast', type: 'cover', positions: [{ x: 10, y: 10 }], description: 'Thick wooden mast' },
      { name: 'Cargo Hatches', type: 'difficult-terrain', positions: [{ x: 8, y: 14 }, { x: 9, y: 14 }], description: 'Open cargo hatches — difficult terrain, fall risk' },
    ],
    imageUrl: 'cz-ship-deck.webp',
    tags: ['ship', 'deck', 'sailing', 'pirate', 'naval', 'ocean', 'boarding', 'narrow'],
    sourceModule: 'czepeku-free-maps',
    author: 'Czepeku',
    license: 'Free',
    narrationContext: 'The ship rolls beneath your feet as waves crash against the hull. Salt spray stings your eyes. The deck is slick with seawater, and above you, sails snap in the driving wind. Enemies pour over the rail.',
    suggestedLevels: { min: 1, max: 12 },
    ambientSounds: ['waves-crashing', 'wind-gusting', 'wood-creaking', 'sails-flapping'],
    lightingMood: 'bright',
    hasHazards: true,
    tacticalNotes: 'Narrow ship deck limits movement options. Masts provide cover. Falling overboard is a real threat. Cargo hatches lead below deck. Ship rocking may require Balance checks.',
  };
}

function createCZVolcanicRift(): FoundryMapEntry {
  const w = 30, h = 22;
  const grid = emptyGrid(w, h);
  // Lava rift through center
  for (let x = 0; x < w; x++) {
    const riftY = 11 + Math.floor(Math.sin(x * 0.4) * 2);
    setTerrain(grid, [{ x, y: riftY }], 'impassable');
    setTerrain(grid, [{ x, y: riftY - 1 }], 'impassable');
  }
  // Stone bridge
  for (let y = 8; y <= 14; y++) {
    setTerrain(grid, [{ x: 14, y }, { x: 15, y }], 'empty');
  }
  // Rock formations
  const rocks: Position[] = [
    { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 5, y: 5 },
    { x: 23, y: 4 }, { x: 24, y: 4 },
    { x: 7, y: 16 }, { x: 8, y: 16 },
    { x: 21, y: 17 }, { x: 22, y: 17 }, { x: 22, y: 18 },
  ];
  setTerrain(grid, rocks, 'impassable');
  // Scorched earth (difficult)
  for (let x = 0; x < w; x++) {
    const riftY = 11 + Math.floor(Math.sin(x * 0.4) * 2);
    if (grid[riftY - 2]?.[x]) setTerrain(grid, [{ x, y: riftY - 2 }], 'difficult');
    if (grid[riftY + 1]?.[x]) setTerrain(grid, [{ x, y: riftY + 1 }], 'difficult');
  }

  return {
    id: 'cz-volcanic-rift',
    name: 'Volcanic Rift',
    theme: 'wilderness',
    subTheme: 'volcanic',
    description: 'A desolate landscape torn by a lava-filled rift. A narrow stone bridge is the only crossing. Scorched earth and volcanic rock surround the chasm.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 13, y: 2 }, { x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 14, y: 3 }, { x: 15, y: 3 }],
      enemies: [{ x: 13, y: 19 }, { x: 14, y: 19 }, { x: 15, y: 19 }, { x: 16, y: 19 }, { x: 14, y: 18 }, { x: 15, y: 18 }],
    },
    features: [
      { name: 'Lava Rift', type: 'lava', positions: [{ x: 15, y: 11 }], description: 'Lava-filled rift — lethal' },
      { name: 'Stone Bridge', type: 'cover', positions: [{ x: 14, y: 11 }, { x: 15, y: 11 }], description: 'Narrow stone bridge over the rift' },
      { name: 'Volcanic Rocks', type: 'cover', positions: rocks, description: 'Volcanic rock formations' },
    ],
    imageUrl: 'cz-volcanic-rift.webp',
    tags: ['wilderness', 'volcanic', 'lava', 'bridge', 'fire', 'desolate', 'rift', 'hot', 'elemental', 'boss'],
    sourceModule: 'czepeku-free-maps',
    author: 'Czepeku',
    license: 'Free',
    narrationContext: 'The ground trembles beneath your feet as rivers of molten lava flow through a jagged rift. The air shimmers with heat, and the smell of sulfur burns your nostrils. A narrow stone bridge spans the chasm — the only way across.',
    suggestedLevels: { min: 5, max: 15 },
    ambientSounds: ['lava-bubbling', 'ground-rumbling', 'steam-hissing'],
    lightingMood: 'mixed',
    hasHazards: true,
    tacticalNotes: 'The bridge is a critical chokepoint — control it to control the battlefield. Lava rift splits the map completely. Scorched earth near the rift is difficult terrain. Falling into lava is lethal. Excellent for dramatic boss fights.',
  };
}

function createCZSwampBog(): FoundryMapEntry {
  const w = 30, h = 22;
  const grid = emptyGrid(w, h);
  // Most of map is difficult (swamp)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (Math.random() < 0.35) setTerrain(grid, [{ x, y }], 'difficult');
    }
  }
  // Deep water pools (impassable)
  const pools: Position[] = [
    { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 },
    { x: 20, y: 8 }, { x: 21, y: 8 }, { x: 20, y: 9 }, { x: 21, y: 9 },
    { x: 12, y: 14 }, { x: 13, y: 14 }, { x: 12, y: 15 }, { x: 13, y: 15 },
  ];
  setTerrain(grid, pools, 'impassable');
  // Dry islands (clear empty ground)
  const islands: Position[] = [
    { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 11 }, { x: 4, y: 11 },
    { x: 14, y: 4 }, { x: 15, y: 4 }, { x: 14, y: 5 }, { x: 15, y: 5 },
    { x: 25, y: 12 }, { x: 26, y: 12 }, { x: 25, y: 13 }, { x: 26, y: 13 },
  ];
  setTerrain(grid, islands, 'empty');
  // Tree stumps
  const stumps: Position[] = [
    { x: 8, y: 3 }, { x: 17, y: 7 }, { x: 24, y: 4 }, { x: 9, y: 17 }, { x: 22, y: 16 },
  ];
  setTerrain(grid, stumps, 'impassable');

  return {
    id: 'cz-swamp-bog',
    name: 'Fetid Swamp',
    theme: 'wilderness',
    subTheme: 'swamp',
    description: 'A murky, fog-choked swamp with stagnant pools, gnarled dead trees, and patches of solid ground. Thick mud sucks at every step.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Deep Pools', type: 'water', positions: pools.slice(0, 4), description: 'Deep stagnant water — impassable without swimming' },
      { name: 'Dry Islands', type: 'cover', positions: islands.slice(0, 4), description: 'Patches of solid ground' },
      { name: 'Dead Trees', type: 'cover', positions: stumps, description: 'Gnarled dead trees' },
    ],
    imageUrl: 'cz-swamp-bog.webp',
    tags: ['wilderness', 'swamp', 'bog', 'muddy', 'fog', 'dark', 'wet', 'hag', 'lizardfolk', 'monster'],
    sourceModule: 'czepeku-free-maps',
    author: 'Czepeku',
    license: 'Free',
    narrationContext: 'The swamp stretches in every direction, a maze of murky water, rotting logs, and patches of trembling ground. Fog hangs thick, muffling sound and limiting vision. Bubbles rise from the dark water, and something large moves beneath the surface.',
    suggestedLevels: { min: 2, max: 10 },
    ambientSounds: ['frogs-croaking', 'insects-buzzing', 'water-bubbling', 'owl-hooting'],
    lightingMood: 'dim',
    hasHazards: true,
    tacticalNotes: 'Most of the map is difficult terrain (mud/water). Deep pools block movement entirely. Dry islands are the only safe footing. Trees provide cover. Heavily favors creatures with swim/swamp movement. Terrible for heavy armor.',
  };
}

// ─── PATRICKS MAPS — Free Maps ──────────────────────────────

function createPMThroneRoom(): FoundryMapEntry {
  const w = 24, h = 30;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [
    { x: 12, y: 29 }, // Main entrance
  ]), 'impassable');
  // Pillar rows
  for (let y = 4; y <= 24; y += 4) {
    setTerrain(grid, [{ x: 5, y }], 'impassable');
    setTerrain(grid, [{ x: 18, y }], 'impassable');
  }
  // Throne platform
  for (let x = 8; x <= 15; x++) {
    for (let y = 2; y <= 5; y++) {
      if (y === 2 || y === 5 || x === 8 || x === 15) {
        setTerrain(grid, [{ x, y }], 'difficult');
      }
    }
  }
  // Throne
  setTerrain(grid, [{ x: 11, y: 3 }, { x: 12, y: 3 }], 'impassable');
  // Carpet runner
  for (let y = 6; y <= 28; y++) {
    setTerrain(grid, [{ x: 11, y }, { x: 12, y }], 'empty');
  }

  return {
    id: 'pm-throne-room',
    name: 'Grand Throne Room',
    theme: 'castle',
    subTheme: 'throne-room',
    description: 'A magnificent throne room with soaring pillars, a red carpet runner, and an ornate throne on a raised dais. Tapestries line the walls.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 11, y: 27 }, { x: 12, y: 27 }, { x: 11, y: 28 }, { x: 12, y: 28 }, { x: 10, y: 27 }, { x: 13, y: 27 }],
      enemies: [{ x: 10, y: 4 }, { x: 11, y: 4 }, { x: 12, y: 4 }, { x: 13, y: 4 }, { x: 11, y: 6 }, { x: 12, y: 6 }],
    },
    features: [
      { name: 'Throne Dais', type: 'elevation', positions: [{ x: 11, y: 3 }], description: 'Raised stone platform with ornate throne' },
      { name: 'Stone Pillars', type: 'cover', positions: [{ x: 5, y: 4 }, { x: 18, y: 4 }], description: 'Grand stone pillars' },
    ],
    imageUrl: 'pm-throne-room.webp',
    tags: ['castle', 'throne', 'royal', 'palace', 'grand', 'pillars', 'nobility', 'boss', 'political', 'dramatic'],
    sourceModule: 'patricks-maps-free',
    author: "Patrick's Maps",
    license: 'Free',
    narrationContext: 'The great doors swing open to reveal a cavernous throne room. Pillars of polished marble flank a crimson carpet that stretches to a raised dais. Upon the throne sits a figure wreathed in shadows. Guards line the walls, hands on weapons.',
    suggestedLevels: { min: 5, max: 20 },
    ambientSounds: ['echoing-footsteps', 'torch-crackling', 'armor-clinking'],
    lightingMood: 'dim',
    tacticalNotes: 'Long room favors ranged combat. Pillars provide cover along the sides. Throne dais is elevated. The carpet runner is the most direct path but also most exposed. Good for dramatic confrontations.',
    variants: ['occupied', 'abandoned', 'under-siege'],
  };
}

function createPMSewers(): FoundryMapEntry {
  const w = 28, h = 20;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [
    { x: 0, y: 10 }, { x: 27, y: 10 },
  ]), 'impassable');
  // Sewer channels (water running through center corridors)
  for (let x = 1; x < w - 1; x++) {
    setTerrain(grid, [{ x, y: 5 }], 'difficult');
    setTerrain(grid, [{ x, y: 14 }], 'difficult');
  }
  // Internal walls creating corridors
  for (let y = 1; y <= 4; y++) {
    setTerrain(grid, [{ x: 9, y }], 'impassable');
    setTerrain(grid, [{ x: 18, y }], 'impassable');
  }
  for (let y = 6; y <= 8; y++) {
    setTerrain(grid, [{ x: 9, y }], 'impassable');
    setTerrain(grid, [{ x: 18, y }], 'impassable');
  }
  for (let y = 11; y <= 13; y++) {
    setTerrain(grid, [{ x: 9, y }], 'impassable');
    setTerrain(grid, [{ x: 18, y }], 'impassable');
  }
  for (let y = 15; y < h - 1; y++) {
    setTerrain(grid, [{ x: 9, y }], 'impassable');
    setTerrain(grid, [{ x: 18, y }], 'impassable');
  }
  // Openings in internal walls
  setTerrain(grid, [{ x: 9, y: 9 }, { x: 9, y: 10 }, { x: 18, y: 9 }, { x: 18, y: 10 }], 'empty');

  return {
    id: 'pm-sewers',
    name: 'City Sewers',
    theme: 'sewers',
    subTheme: 'tunnels',
    description: 'Dank sewer tunnels beneath the city. Wastewater flows through channels in the center of stone walkways. Iron grates cover side passages.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Sewer Channels', type: 'water', positions: [{ x: 10, y: 5 }, { x: 10, y: 14 }], description: 'Flowing wastewater channels — difficult terrain' },
    ],
    imageUrl: 'pm-sewers.webp',
    tags: ['sewers', 'underground', 'tunnel', 'dark', 'water', 'narrow', 'rats', 'thieves', 'ooze', 'disease'],
    sourceModule: 'patricks-maps-free',
    author: "Patrick's Maps",
    license: 'Free',
    narrationContext: 'The stench hits you before the darkness does. Sewer tunnels stretch in both directions, the sound of running water echoing off damp stone walls. Rats scatter as your torchlight falls on the narrow walkways flanking the central channel.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['water-flowing', 'dripping', 'rats-squeaking', 'distant-rumbling'],
    lightingMood: 'dark',
    tacticalNotes: 'Narrow corridors limit formation options. Water channels create difficult terrain barriers. Multiple corridor sections create ambush opportunities. Ideal for ooze, rat, or thieves guild encounters.',
  };
}

function createPMWizardTower(): FoundryMapEntry {
  const w = 20, h = 20;
  const grid = emptyGrid(w, h);
  // Circular tower walls
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const dist = Math.sqrt(Math.pow(x - 10, 2) + Math.pow(y - 10, 2));
      if (dist > 9 && dist < 10.5) setTerrain(grid, [{ x, y }], 'impassable');
      if (dist >= 10.5) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Door
  setTerrain(grid, [{ x: 10, y: 19 }], 'empty');
  // Central arcane circle (difficult terrain)
  for (let x = 7; x <= 13; x++) {
    for (let y = 7; y <= 13; y++) {
      const dist = Math.sqrt(Math.pow(x - 10, 2) + Math.pow(y - 10, 2));
      if (dist >= 2.5 && dist <= 3.5) setTerrain(grid, [{ x, y }], 'difficult');
    }
  }
  // Bookshelves
  setTerrain(grid, [
    { x: 3, y: 6 }, { x: 3, y: 7 }, { x: 3, y: 8 },
    { x: 16, y: 6 }, { x: 16, y: 7 }, { x: 16, y: 8 },
    { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 8, y: 3 },
  ], 'impassable');

  return {
    id: 'pm-wizard-tower',
    name: 'Wizard\'s Tower Chamber',
    theme: 'tower',
    subTheme: 'wizard-tower',
    description: 'The circular inner chamber of a wizard\'s tower. An arcane circle glows on the floor, surrounded by overflowing bookshelves and strange apparatus.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 9, y: 17 }, { x: 10, y: 17 }, { x: 11, y: 17 }, { x: 9, y: 16 }, { x: 10, y: 16 }, { x: 11, y: 16 }],
      enemies: [{ x: 9, y: 9 }, { x: 10, y: 9 }, { x: 11, y: 9 }, { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 11, y: 10 }],
    },
    features: [
      { name: 'Arcane Circle', type: 'hazard', positions: [{ x: 10, y: 10 }], description: 'Glowing arcane circle — may trigger magical effects' },
      { name: 'Bookshelves', type: 'wall', positions: [{ x: 3, y: 7 }, { x: 16, y: 7 }], description: 'Overflowing magical bookshelves' },
    ],
    imageUrl: 'pm-wizard-tower.webp',
    tags: ['tower', 'wizard', 'magic', 'arcane', 'books', 'circle', 'summoning', 'boss', 'spellcaster'],
    sourceModule: 'patricks-maps-free',
    author: "Patrick's Maps",
    license: 'Free',
    narrationContext: 'The wizard\'s chamber is circular, its walls lined with bookshelves that stretch to the vaulted ceiling. In the center, an arcane circle pulses with eldritch light, strange symbols shifting and writhing. The air crackles with barely contained magical energy.',
    suggestedLevels: { min: 5, max: 15 },
    ambientSounds: ['magical-humming', 'pages-turning', 'crackling-energy'],
    lightingMood: 'mixed',
    hasHazards: true,
    tacticalNotes: 'Circular room means no corners to hide in. Arcane circle may trigger random magical effects. Bookshelves provide cover along edges. Limited space makes AoE spells very effective. Boss encounter against a spellcaster.',
  };
}

// ─── BENEOS BATTLEMAPS — Free Maps ──────────────────────────

function createBBBridgeCrossing(): FoundryMapEntry {
  const w = 30, h = 16;
  const grid = emptyGrid(w, h);
  // River (impassable)
  for (let x = 0; x < w; x++) {
    for (let y = 6; y <= 9; y++) {
      setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Bridge
  for (let y = 5; y <= 10; y++) {
    setTerrain(grid, [{ x: 13, y }, { x: 14, y }, { x: 15, y }, { x: 16, y }], 'empty');
  }
  // Bridge railings
  setTerrain(grid, [{ x: 12, y: 6 }, { x: 12, y: 9 }, { x: 17, y: 6 }, { x: 17, y: 9 }], 'impassable');
  // Trees / rocks
  setTerrain(grid, [
    { x: 3, y: 2 }, { x: 4, y: 2 },
    { x: 25, y: 3 }, { x: 26, y: 3 },
    { x: 5, y: 13 }, { x: 6, y: 13 },
    { x: 22, y: 12 }, { x: 23, y: 12 },
  ], 'impassable');

  return {
    id: 'bb-bridge-crossing',
    name: 'Stone Bridge Crossing',
    theme: 'bridge',
    subTheme: 'river-bridge',
    description: 'A sturdy stone bridge spanning a swift-flowing river. Trees line both banks, and the water churns white around mossy rocks below.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 13, y: 2 }, { x: 14, y: 2 }, { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 14, y: 3 }, { x: 15, y: 3 }],
      enemies: [{ x: 13, y: 13 }, { x: 14, y: 13 }, { x: 15, y: 13 }, { x: 16, y: 13 }, { x: 14, y: 12 }, { x: 15, y: 12 }],
    },
    features: [
      { name: 'River', type: 'water', positions: [{ x: 10, y: 7 }], description: 'Swift-flowing river — impassable without swimming' },
      { name: 'Stone Bridge', type: 'cover', positions: [{ x: 14, y: 7 }], description: 'Wide stone bridge — the only crossing' },
    ],
    imageUrl: 'bb-bridge-crossing.webp',
    tags: ['bridge', 'river', 'crossing', 'chokepoint', 'outdoor', 'water', 'ambush', 'toll', 'tactical'],
    sourceModule: 'beneos-battlemaps-free',
    author: 'Beneos Battlemaps',
    license: 'Free',
    narrationContext: 'The stone bridge arches over the rushing river, its ancient stones worn smooth by centuries of travelers. The water below is deep and cold, churning white around jagged rocks. On the far bank, shadows move among the trees.',
    suggestedLevels: { min: 1, max: 10 },
    ambientSounds: ['river-rushing', 'birds-singing', 'wind'],
    lightingMood: 'bright',
    tacticalNotes: 'The bridge is the key chokepoint — only 4 squares wide. River is impassable without swimming. Trees on both banks provide cover. Classic "defend the bridge" or "troll under the bridge" encounter.',
  };
}

function createBBMineshaft(): FoundryMapEntry {
  const w = 24, h = 22;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [{ x: 12, y: 0 }]), 'impassable');
  // Mine tunnels - main corridor
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (x < 4 || x > w - 5) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Openings in side walls
  for (let y = 5; y <= 7; y++) setTerrain(grid, [{ x: 4, y }], 'empty');
  for (let y = 13; y <= 15; y++) setTerrain(grid, [{ x: 4, y }], 'empty');
  for (let y = 5; y <= 7; y++) setTerrain(grid, [{ x: w - 5, y }], 'empty');
  for (let y = 13; y <= 15; y++) setTerrain(grid, [{ x: w - 5, y }], 'empty');
  // Mine cart tracks (difficult)
  for (let y = 1; y < h - 1; y++) {
    setTerrain(grid, [{ x: 11, y }, { x: 12, y }], 'difficult');
  }
  // Support beams
  setTerrain(grid, [
    { x: 8, y: 4 }, { x: 15, y: 4 },
    { x: 8, y: 10 }, { x: 15, y: 10 },
    { x: 8, y: 16 }, { x: 15, y: 16 },
  ], 'impassable');
  // Rubble piles
  setTerrain(grid, [
    { x: 6, y: 8 }, { x: 7, y: 8 },
    { x: 16, y: 12 }, { x: 17, y: 12 },
  ], 'difficult');

  return {
    id: 'bb-mineshaft',
    name: 'Abandoned Mineshaft',
    theme: 'mine',
    subTheme: 'mineshaft',
    description: 'A dark abandoned mine with timber supports, rusted cart tracks, and piles of rubble. Side tunnels branch off into darkness.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 11, y: 1 }, { x: 12, y: 1 }, { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 10, y: 1 }, { x: 13, y: 1 }],
      enemies: [{ x: 11, y: 18 }, { x: 12, y: 18 }, { x: 11, y: 19 }, { x: 12, y: 19 }, { x: 10, y: 18 }, { x: 13, y: 18 }],
    },
    features: [
      { name: 'Mine Cart Tracks', type: 'difficult-terrain', positions: [{ x: 11, y: 10 }], description: 'Rusted mine cart tracks — difficult terrain' },
      { name: 'Support Beams', type: 'cover', positions: [{ x: 8, y: 4 }, { x: 15, y: 4 }], description: 'Timber support beams — destructible!' },
      { name: 'Rubble', type: 'difficult-terrain', positions: [{ x: 6, y: 8 }, { x: 16, y: 12 }], description: 'Collapsed rubble' },
    ],
    imageUrl: 'bb-mineshaft.webp',
    tags: ['mine', 'underground', 'dark', 'tunnel', 'dwarf', 'rubble', 'narrow', 'collapse', 'mining'],
    sourceModule: 'beneos-battlemaps-free',
    author: 'Beneos Battlemaps',
    license: 'Free',
    narrationContext: 'The mine stretches deep into the mountain, its timber supports groaning under the weight of stone above. Rusted cart tracks disappear into the darkness ahead. The air is stale and heavy with dust. From deep within, you hear the rhythmic clinking of picks... or claws.',
    suggestedLevels: { min: 2, max: 8 },
    ambientSounds: ['dripping-water', 'creaking-timber', 'distant-picks', 'cave-wind'],
    lightingMood: 'dark',
    tacticalNotes: 'Narrow corridors limit AoE. Side tunnels allow flanking. Support beams could potentially be destroyed to cause cave-ins. Mine cart tracks provide difficult terrain down the center.',
  };
}

// ─── NEUTRAL PARTY — Free Maps ──────────────────────────────

function createNPArenaFloor(): FoundryMapEntry {
  const w = 24, h = 24;
  const grid = emptyGrid(w, h);
  // Arena walls (oval)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const dist = Math.sqrt(Math.pow((x - 12) / 12, 2) + Math.pow((y - 12) / 12, 2));
      if (dist > 0.85) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Entrance gates
  setTerrain(grid, [{ x: 12, y: 22 }], 'empty');
  setTerrain(grid, [{ x: 12, y: 1 }], 'empty');
  // Central pillars
  setTerrain(grid, [
    { x: 8, y: 8 }, { x: 16, y: 8 },
    { x: 8, y: 16 }, { x: 16, y: 16 },
  ], 'impassable');
  // Sand pit center (difficult)
  for (let x = 10; x <= 14; x++) {
    for (let y = 10; y <= 14; y++) {
      setTerrain(grid, [{ x, y }], 'difficult');
    }
  }

  return {
    id: 'np-arena-floor',
    name: 'Gladiatorial Arena',
    theme: 'urban',
    subTheme: 'arena',
    description: 'An oval gladiatorial arena with sand-covered floor, four decorative pillars, and roaring crowds in the stands above. Two iron gates face each other across the sand.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 11, y: 20 }, { x: 12, y: 20 }, { x: 13, y: 20 }, { x: 11, y: 19 }, { x: 12, y: 19 }, { x: 13, y: 19 }],
      enemies: [{ x: 11, y: 3 }, { x: 12, y: 3 }, { x: 13, y: 3 }, { x: 11, y: 4 }, { x: 12, y: 4 }, { x: 13, y: 4 }],
    },
    features: [
      { name: 'Arena Pillars', type: 'cover', positions: [{ x: 8, y: 8 }, { x: 16, y: 8 }, { x: 8, y: 16 }, { x: 16, y: 16 }], description: 'Decorative arena pillars' },
      { name: 'Sand Pit', type: 'difficult-terrain', positions: [{ x: 12, y: 12 }], description: 'Deep sand in the center — difficult terrain' },
    ],
    imageUrl: 'np-arena-floor.webp',
    tags: ['urban', 'arena', 'gladiator', 'combat', 'sand', 'pillars', 'spectacle', 'tournament', 'duel'],
    sourceModule: 'neutral-party-free-maps',
    author: 'Neutral Party',
    license: 'Free',
    narrationContext: 'The crowd roars as the iron gates grind open. Across the sand-covered arena floor, your opponents emerge. Four pillars cast long shadows in the afternoon sun. There is no escape — only victory or defeat.',
    suggestedLevels: { min: 1, max: 15 },
    ambientSounds: ['crowd-roaring', 'gate-grinding', 'sand-shuffling'],
    lightingMood: 'bright',
    tacticalNotes: 'Open arena with minimal cover. Four pillars are the only significant cover. Sand pit in center is difficult terrain. Equal access for both sides. Pure combat encounter — no escape.',
    variants: ['day', 'night-torches', 'flooded'],
  };
}

function createNPPrisonCells(): FoundryMapEntry {
  const w = 24, h = 20;
  const grid = emptyGrid(w, h);
  setTerrain(grid, wallBorder(w, h, [{ x: 12, y: 19 }]), 'impassable');
  // Cell walls (3 cells per side)
  for (let cellX = 0; cellX < 3; cellX++) {
    const baseX = 2 + cellX * 7;
    for (let y = 1; y <= 8; y++) {
      setTerrain(grid, [{ x: baseX, y }], 'impassable');
      setTerrain(grid, [{ x: baseX + 5, y }], 'impassable');
    }
    // Cell back wall
    for (let x = baseX; x <= baseX + 5; x++) {
      setTerrain(grid, [{ x, y: 1 }], 'impassable');
    }
    // Cell door (opening)
    setTerrain(grid, [{ x: baseX + 2, y: 8 }, { x: baseX + 3, y: 8 }], 'empty');
  }
  // Guard desk
  setTerrain(grid, [{ x: 11, y: 14 }, { x: 12, y: 14 }], 'difficult');

  return {
    id: 'np-prison-cells',
    name: 'Prison Cells',
    theme: 'dungeon',
    subTheme: 'prison',
    description: 'A row of stone prison cells with iron bar doors. A guard desk sits in the corridor between the cells and the exit. Keys hang from a hook on the wall.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 11, y: 4 }, { x: 12, y: 4 }, { x: 18, y: 4 }, { x: 19, y: 4 }],
      enemies: [{ x: 10, y: 14 }, { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 }, { x: 11, y: 16 }, { x: 12, y: 16 }],
    },
    features: [
      { name: 'Cell Doors', type: 'door', positions: [{ x: 4, y: 8 }, { x: 11, y: 8 }, { x: 18, y: 8 }], description: 'Iron bar cell doors — can be locked/unlocked' },
      { name: 'Guard Desk', type: 'cover', positions: [{ x: 11, y: 14 }, { x: 12, y: 14 }], description: 'Heavy wooden desk' },
    ],
    imageUrl: 'np-prison-cells.webp',
    tags: ['dungeon', 'prison', 'cells', 'guards', 'jail', 'escape', 'dark', 'iron-bars', 'keys'],
    sourceModule: 'neutral-party-free-maps',
    author: 'Neutral Party',
    license: 'Free',
    narrationContext: 'Cold stone walls and iron bars surround you. The prison is damp and dark, lit only by a single torch near the guard desk. The sound of jangling keys echoes down the corridor. Freedom lies beyond the heavy wooden door at the far end.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['chains-rattling', 'dripping-water', 'distant-moaning', 'keys-jangling'],
    lightingMood: 'dark',
    tacticalNotes: 'Cell doors create chokepoints. Players may start locked in cells (jailbreak scenario). Guard desk provides cover. Narrow corridors. Good for escape or rescue scenarios.',
    variants: ['occupied', 'abandoned', 'on-fire'],
  };
}

// ─── HEROIC MAPS — Free Maps ────────────────────────────────

function createHMCaravanAmbush(): FoundryMapEntry {
  const w = 34, h = 16;
  const grid = emptyGrid(w, h);
  // Road through center
  for (let x = 0; x < w; x++) {
    for (let y = 6; y <= 9; y++) {
      setTerrain(grid, [{ x, y }], 'empty');
    }
  }
  // Trees/rocks flanking road
  const cover: Position[] = [
    { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 4, y: 4 },
    { x: 10, y: 2 }, { x: 11, y: 2 },
    { x: 18, y: 3 }, { x: 19, y: 3 },
    { x: 26, y: 2 }, { x: 27, y: 2 }, { x: 27, y: 3 },
    { x: 5, y: 12 }, { x: 6, y: 12 },
    { x: 13, y: 13 }, { x: 14, y: 13 },
    { x: 21, y: 12 }, { x: 22, y: 12 }, { x: 22, y: 13 },
    { x: 29, y: 12 }, { x: 30, y: 12 },
  ];
  setTerrain(grid, cover, 'impassable');
  // Overturned cart
  setTerrain(grid, [
    { x: 15, y: 7 }, { x: 16, y: 7 }, { x: 17, y: 7 },
    { x: 15, y: 8 }, { x: 17, y: 8 },
  ], 'difficult');

  return {
    id: 'hm-caravan-ambush',
    name: 'Caravan Ambush Road',
    theme: 'caravan',
    subTheme: 'road-ambush',
    description: 'A country road flanked by dense woods, perfect for an ambush. An overturned cart blocks part of the road ahead.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 7 }, { x: 2, y: 8 }, { x: 3, y: 7 }, { x: 3, y: 8 }, { x: 4, y: 7 }, { x: 4, y: 8 }],
      enemies: [{ x: 18, y: 3 }, { x: 19, y: 3 }, { x: 21, y: 12 }, { x: 22, y: 12 }, { x: 15, y: 7 }, { x: 17, y: 8 }],
    },
    features: [
      { name: 'Overturned Cart', type: 'cover', positions: [{ x: 15, y: 7 }, { x: 16, y: 7 }, { x: 17, y: 7 }], description: 'An overturned merchant cart — provides cover' },
      { name: 'Treeline', type: 'wall', positions: cover.slice(0, 6), description: 'Dense trees flanking the road' },
    ],
    imageUrl: 'hm-caravan-ambush.webp',
    tags: ['caravan', 'road', 'ambush', 'bandit', 'forest', 'outdoor', 'overturned-cart', 'travel', 'highway'],
    sourceModule: 'heroic-maps-free',
    author: 'Heroic Maps',
    license: 'Free',
    narrationContext: 'The road narrows between thick woods. Ahead, a merchant cart lies on its side, goods scattered across the dirt road. The horses are gone. As you approach, you notice movement in the treeline on both sides. It\'s an ambush.',
    suggestedLevels: { min: 1, max: 6 },
    ambientSounds: ['birds-singing', 'wind-in-trees', 'horse-whinny', 'twig-snap'],
    lightingMood: 'bright',
    tacticalNotes: 'Enemies start in cover on both sides of the road. The overturned cart provides the only cover on the road itself. Long, narrow map favors ranged combat. Classic ambush encounter — enemies have positional advantage.',
  };
}

// ─── MAPHAMMER — Free Maps ──────────────────────────────────

function createMHCastleCourtyard(): FoundryMapEntry {
  const w = 28, h = 24;
  const grid = emptyGrid(w, h);
  // High outer walls
  setTerrain(grid, wallBorder(w, h, [
    { x: 14, y: 23 }, // Main gate
  ]), 'impassable');
  // Inner structures
  for (let x = 2; x <= 8; x++) {
    for (let y = 2; y <= 6; y++) {
      if (x === 2 || x === 8 || y === 2 || y === 6) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Door
  setTerrain(grid, [{ x: 5, y: 6 }], 'empty');
  // Well in center
  setTerrain(grid, [{ x: 13, y: 11 }, { x: 14, y: 11 }, { x: 13, y: 12 }, { x: 14, y: 12 }], 'impassable');
  // Hay bales
  setTerrain(grid, [
    { x: 20, y: 4 }, { x: 21, y: 4 }, { x: 20, y: 5 },
    { x: 22, y: 18 }, { x: 23, y: 18 },
  ], 'difficult');
  // Weapon racks
  setTerrain(grid, [
    { x: 4, y: 17 }, { x: 5, y: 17 }, { x: 6, y: 17 },
  ], 'difficult');

  return {
    id: 'mh-castle-courtyard',
    name: 'Castle Courtyard',
    theme: 'castle',
    subTheme: 'courtyard',
    description: 'An open stone courtyard within castle walls. A well occupies the center, and a barracks building flanks one side. Weapon racks and hay bales are scattered about.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 13, y: 21 }, { x: 14, y: 21 }, { x: 15, y: 21 }, { x: 13, y: 20 }, { x: 14, y: 20 }, { x: 15, y: 20 }],
      enemies: [{ x: 12, y: 8 }, { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 }, { x: 13, y: 9 }, { x: 14, y: 9 }],
    },
    features: [
      { name: 'Well', type: 'cover', positions: [{ x: 13, y: 11 }], description: 'Stone well — provides cover' },
      { name: 'Barracks', type: 'wall', positions: [{ x: 5, y: 4 }], description: 'Guard barracks building' },
      { name: 'Hay Bales', type: 'cover', positions: [{ x: 20, y: 4 }], description: 'Stacked hay bales' },
    ],
    imageUrl: 'mh-castle-courtyard.webp',
    tags: ['castle', 'courtyard', 'outdoor', 'well', 'barracks', 'guards', 'siege', 'training', 'fortified'],
    sourceModule: 'maphammer-free-maps',
    author: 'Maphammer',
    license: 'Free',
    narrationContext: 'Beyond the castle gate, the courtyard opens up under grey skies. A stone well sits at the center, and a guard barracks occupies the north wall. The clang of practice swords echoes from somewhere nearby. The castle has been breached.',
    suggestedLevels: { min: 3, max: 12 },
    ambientSounds: ['swords-clashing', 'wind', 'flag-flapping', 'horses-neighing'],
    lightingMood: 'bright',
    tacticalNotes: 'Semi-open courtyard with scattered cover. Barracks building creates a large LoS blocker. Well provides central cover. Castle walls mean no escape except through the gate. Good for siege or defense encounters.',
  };
}

// ─── INKARNATE — Community Free Maps ────────────────────────

function createIKCaverns(): FoundryMapEntry {
  const w = 28, h = 22;
  const grid = emptyGrid(w, h);
  // Irregular cave walls
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const noise = Math.sin(x * 0.8) * Math.cos(y * 0.6) * 5;
      const distX = Math.min(x, w - 1 - x);
      const distY = Math.min(y, h - 1 - y);
      if (distX + noise < 2 || distY + noise < 1.5) setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Entrances
  for (let y = 9; y <= 12; y++) {
    setTerrain(grid, [{ x: 0, y }, { x: 1, y }], 'empty');
    setTerrain(grid, [{ x: w - 1, y }, { x: w - 2, y }], 'empty');
  }
  // Central cavern opening
  for (let x = 10; x <= 17; x++) {
    for (let y = 8; y <= 13; y++) {
      setTerrain(grid, [{ x, y }], 'empty');
    }
  }
  // Mushroom patches (difficult)
  setTerrain(grid, [
    { x: 6, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 7 },
    { x: 20, y: 14 }, { x: 21, y: 14 }, { x: 21, y: 15 },
  ], 'difficult');
  // Underground pool
  setTerrain(grid, [
    { x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 },
    { x: 12, y: 11 }, { x: 13, y: 11 }, { x: 14, y: 11 },
  ], 'impassable');

  return {
    id: 'ik-deep-caverns',
    name: 'Deep Caverns',
    theme: 'cave',
    subTheme: 'deep-cavern',
    description: 'A network of deep natural caverns with bioluminescent mushrooms, an underground pool, and narrow passages connecting larger chambers.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 9 }, { x: 1, y: 10 }, { x: 1, y: 11 }, { x: 1, y: 12 }, { x: 2, y: 10 }, { x: 2, y: 11 }],
      enemies: [{ x: 14, y: 9 }, { x: 15, y: 9 }, { x: 14, y: 12 }, { x: 15, y: 12 }, { x: 16, y: 10 }, { x: 16, y: 11 }],
    },
    features: [
      { name: 'Underground Pool', type: 'water', positions: [{ x: 13, y: 10 }], description: 'Dark underground pool — impassable' },
      { name: 'Mushroom Patches', type: 'difficult-terrain', positions: [{ x: 6, y: 6 }], description: 'Bioluminescent mushrooms — difficult terrain, dim light source' },
    ],
    imageUrl: 'ik-deep-caverns.webp',
    tags: ['cave', 'underground', 'dark', 'mushrooms', 'pool', 'natural', 'narrow', 'deep', 'underdark', 'exploration'],
    sourceModule: 'inkarnate-community-free',
    author: 'Inkarnate Community',
    license: 'Free',
    narrationContext: 'The cavern opens into a vast underground chamber, its ceiling lost in darkness above. Clusters of bioluminescent mushrooms cast an eerie blue-green glow across the wet stone. A dark pool of water sits at the chamber\'s heart, its depths unknowable. The air is cold and still.',
    suggestedLevels: { min: 3, max: 12 },
    ambientSounds: ['dripping-water', 'distant-echoes', 'underground-wind'],
    lightingMood: 'dark',
    tacticalNotes: 'Narrow passages create chokepoints between chambers. Underground pool divides the main chamber. Mushroom patches provide dim light but are difficult terrain. Good for Underdark encounters.',
  };
}

function createIKCoastalCliffs(): FoundryMapEntry {
  const w = 30, h = 20;
  const grid = emptyGrid(w, h);
  // Ocean (bottom of map)
  for (let x = 0; x < w; x++) {
    for (let y = 16; y < h; y++) {
      setTerrain(grid, [{ x, y }], 'impassable');
    }
  }
  // Cliff edge (difficult terrain)
  for (let x = 0; x < w; x++) {
    const edgeY = 14 + Math.floor(Math.sin(x * 0.5) * 1.5);
    if (grid[edgeY]?.[x]) setTerrain(grid, [{ x, y: edgeY }], 'difficult');
    if (grid[edgeY + 1]?.[x]) setTerrain(grid, [{ x, y: edgeY + 1 }], 'impassable');
  }
  // Rocks/boulders
  setTerrain(grid, [
    { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: 15, y: 3 }, { x: 16, y: 3 },
    { x: 24, y: 6 }, { x: 25, y: 6 },
    { x: 10, y: 9 }, { x: 11, y: 9 },
    { x: 20, y: 10 },
  ], 'impassable');
  // Path to lighthouse
  for (let y = 0; y <= 4; y++) {
    setTerrain(grid, [{ x: 26, y }, { x: 27, y }], 'empty');
  }

  return {
    id: 'ik-coastal-cliffs',
    name: 'Coastal Cliffs',
    theme: 'wilderness',
    subTheme: 'coastal',
    description: 'Rocky coastal cliffs overlooking a turbulent sea. Boulders dot the windswept grass, and the cliff edge is dangerously close.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 6 }, { x: 2, y: 7 }, { x: 3, y: 6 }, { x: 3, y: 7 }, { x: 2, y: 8 }, { x: 3, y: 8 }],
      enemies: [{ x: 22, y: 6 }, { x: 22, y: 7 }, { x: 23, y: 6 }, { x: 23, y: 7 }, { x: 24, y: 7 }, { x: 24, y: 8 }],
    },
    features: [
      { name: 'Cliff Edge', type: 'hazard', positions: [{ x: 15, y: 14 }], description: 'Cliff edge — fall into the ocean below' },
      { name: 'Boulders', type: 'cover', positions: [{ x: 5, y: 5 }, { x: 15, y: 3 }, { x: 24, y: 6 }], description: 'Large coastal boulders' },
      { name: 'Ocean', type: 'water', positions: [{ x: 15, y: 17 }], description: 'Turbulent ocean below the cliffs' },
    ],
    imageUrl: 'ik-coastal-cliffs.webp',
    tags: ['wilderness', 'coastal', 'cliffs', 'ocean', 'wind', 'outdoor', 'fall-hazard', 'sea', 'lighthouse'],
    sourceModule: 'inkarnate-community-free',
    author: 'Inkarnate Community',
    license: 'Free',
    narrationContext: 'Wind howls across the clifftop, carrying salt spray from the crashing waves far below. The grass is cropped short by the constant wind, and weathered boulders provide the only shelter. One misstep near the cliff edge would mean a long fall into the churning sea.',
    suggestedLevels: { min: 1, max: 10 },
    ambientSounds: ['waves-crashing', 'wind-howling', 'seagulls-crying'],
    lightingMood: 'bright',
    hasHazards: true,
    tacticalNotes: 'Cliff edge is the primary hazard — creatures can be shoved off. Boulders provide the only cover. Wind may affect ranged attacks. Open terrain otherwise. Dramatic encounter with environmental kill potential.',
  };
}

// ─── 2-MINUTE TABLETOP — Free Maps ──────────────────────────

function create2MTForestClearing(): FoundryMapEntry {
  const w = 26, h = 20;
  const grid = emptyGrid(w, h);
  // Dense tree border
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const distX = Math.min(x, w - 1 - x);
      const distY = Math.min(y, h - 1 - y);
      if (distX < 3 || distY < 3) {
        if (Math.random() < 0.5) setTerrain(grid, [{ x, y }], 'impassable');
        else setTerrain(grid, [{ x, y }], 'difficult');
      }
    }
  }
  // Clear path openings
  for (let y = 8; y <= 11; y++) {
    setTerrain(grid, [{ x: 0, y }, { x: 1, y }, { x: 2, y }], 'empty');
    setTerrain(grid, [{ x: w - 1, y }, { x: w - 2, y }, { x: w - 3, y }], 'empty');
  }
  // Campfire ring
  setTerrain(grid, [
    { x: 12, y: 9 }, { x: 13, y: 9 }, { x: 12, y: 10 }, { x: 13, y: 10 },
  ], 'difficult');
  // Fallen log
  for (let x = 8; x <= 11; x++) setTerrain(grid, [{ x, y: 13 }], 'difficult');

  return {
    id: '2mt-forest-clearing',
    name: 'Forest Clearing Camp',
    theme: 'wilderness',
    subTheme: 'clearing',
    description: 'A small clearing in a dense forest, used as a campsite. A ring of stones surrounds a campfire, and a fallen log serves as a bench.',
    width: w, height: h,
    terrain: grid,
    startingZones: {
      players: [{ x: 11, y: 9 }, { x: 11, y: 10 }, { x: 14, y: 9 }, { x: 14, y: 10 }, { x: 12, y: 8 }, { x: 13, y: 8 }],
      enemies: [{ x: 3, y: 9 }, { x: 3, y: 10 }, { x: w - 4, y: 9 }, { x: w - 4, y: 10 }, { x: 12, y: 3 }, { x: 13, y: 3 }],
    },
    features: [
      { name: 'Campfire', type: 'hazard', positions: [{ x: 12, y: 9 }], description: 'Burning campfire — fire damage' },
      { name: 'Fallen Log', type: 'cover', positions: [{ x: 9, y: 13 }], description: 'Large fallen tree trunk' },
    ],
    imageUrl: '2mt-forest-clearing.webp',
    tags: ['wilderness', 'forest', 'clearing', 'camp', 'campfire', 'night-attack', 'ambush', 'rest'],
    sourceModule: '2-minute-tabletop-free',
    author: '2-Minute Tabletop',
    license: 'CC-BY-4.0',
    narrationContext: 'Your camp in the forest clearing seemed safe enough. The fire crackles warmly, casting flickering light against the surrounding trees. Then you hear it — the snap of branches, coming from multiple directions at once. You are surrounded.',
    suggestedLevels: { min: 1, max: 6 },
    ambientSounds: ['fire-crackling', 'owls-hooting', 'crickets', 'twig-snap'],
    lightingMood: 'dark',
    tacticalNotes: 'Players start in the center (camp). Enemies emerge from the treeline on all sides. Trees provide cover for ambushers. Campfire provides light but also fire damage hazard. Classic "night attack on camp" encounter.',
  };
}

function create2MTTownSquare(): FoundryMapEntry {
  const w = 28, h = 22;
  const grid = emptyGrid(w, h);
  // Building blocks around edges
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) setTerrain(grid, [{ x, y }], 'impassable');
    for (let y = h - 5; y < h; y++) setTerrain(grid, [{ x, y }], 'impassable');
  }
  for (let x = w - 5; x < w; x++) {
    for (let y = 0; y < 5; y++) setTerrain(grid, [{ x, y }], 'impassable');
    for (let y = h - 5; y < h; y++) setTerrain(grid, [{ x, y }], 'impassable');
  }
  // Building doors
  setTerrain(grid, [{ x: 4, y: 2 }, { x: 4, y: h - 3 }, { x: w - 5, y: 2 }, { x: w - 5, y: h - 3 }], 'empty');
  // Fountain
  setTerrain(grid, [
    { x: 13, y: 10 }, { x: 14, y: 10 },
    { x: 13, y: 11 }, { x: 14, y: 11 },
  ], 'impassable');
  // Market carts
  setTerrain(grid, [
    { x: 8, y: 7 }, { x: 9, y: 7 },
    { x: 18, y: 14 }, { x: 19, y: 14 },
  ], 'difficult');

  return {
    id: '2mt-town-square',
    name: 'Town Square',
    theme: 'urban',
    subTheme: 'town-square',
    description: 'A cobblestone town square with a central fountain, market carts, and buildings with shop fronts on each corner.',
    width: w, height: h,
    terrain: grid,
    startingZones: oppositeZones(w, h),
    features: [
      { name: 'Fountain', type: 'cover', positions: [{ x: 13, y: 10 }], description: 'Stone fountain — provides cover' },
      { name: 'Market Carts', type: 'cover', positions: [{ x: 8, y: 7 }, { x: 18, y: 14 }], description: 'Parked merchant carts' },
      { name: 'Buildings', type: 'wall', positions: [{ x: 2, y: 2 }, { x: 25, y: 2 }], description: 'Shop buildings on corners' },
    ],
    imageUrl: '2mt-town-square.webp',
    tags: ['urban', 'town', 'square', 'fountain', 'market', 'cobblestone', 'buildings', 'social', 'chase'],
    sourceModule: '2-minute-tabletop-free',
    author: '2-Minute Tabletop',
    license: 'CC-BY-4.0',
    narrationContext: 'The town square bustles with midday activity. Merchants hawk their wares from wooden carts, children play near the fountain, and townsfolk go about their business. Then a scream cuts through the noise, and steel rings free of sheaths.',
    suggestedLevels: { min: 1, max: 8 },
    ambientSounds: ['crowd-chatter', 'fountain-splashing', 'merchant-shouting'],
    lightingMood: 'bright',
    tacticalNotes: 'Open square with fountain as center cover. Corner buildings block LoS and create alleys. Market carts provide mobile cover. Civilians may be present. Good for urban encounters or chase sequences.',
  };
}

// ─── ASSEMBLY: THE COMPLETE FOUNDRY MAP CATALOG ────────────────

export const FOUNDRY_MAP_CATALOG: FoundryMapEntry[] = [
  // ── Dice Grimorium (6 maps) ──
  createDGAncientCryptDungeon(),
  createDGCityGates(),
  createDGDesertPath(),
  createDGDragonLair(),
  createDGForestPath(),
  createDGIceDragonCave(),

  // ── Tom Cartos (4 maps) ──
  createTCTavernCommon(),
  createTCGoblinCamp(),
  createTCTempleRuins(),
  createTCDockWarehouse(),

  // ── Forgotten Adventures (3 maps) ──
  createFACaveEntrance(),
  createFAGraveyardNight(),
  createFAMarketSquare(),

  // ── Czepeku (3 maps) ──
  createCZShipDeck(),
  createCZVolcanicRift(),
  createCZSwampBog(),

  // ── Patrick's Maps (3 maps) ──
  createPMThroneRoom(),
  createPMSewers(),
  createPMWizardTower(),

  // ── Beneos Battlemaps (2 maps) ──
  createBBBridgeCrossing(),
  createBBMineshaft(),

  // ── Neutral Party (2 maps) ──
  createNPArenaFloor(),
  createNPPrisonCells(),

  // ── Heroic Maps (1 map) ──
  createHMCaravanAmbush(),

  // ── Maphammer (1 map) ──
  createMHCastleCourtyard(),

  // ── Inkarnate Community (2 maps) ──
  createIKCaverns(),
  createIKCoastalCliffs(),

  // ── 2-Minute Tabletop (2 maps) ──
  create2MTForestClearing(),
  create2MTTownSquare(),
];

// ─── Catalog Query Helpers ───────────────────────────────────

/** Get all unique themes in the catalog */
export function getFoundryMapThemes(): MapTheme[] {
  return [...new Set(FOUNDRY_MAP_CATALOG.map(m => m.theme))];
}

/** Get all unique tags across all maps */
export function getFoundryMapTags(): string[] {
  const tags = new Set<string>();
  for (const map of FOUNDRY_MAP_CATALOG) {
    for (const tag of (map.tags || [])) tags.add(tag);
  }
  return [...tags].sort();
}

/** Get maps by theme */
export function getFoundryMapsByTheme(theme: MapTheme): FoundryMapEntry[] {
  return FOUNDRY_MAP_CATALOG.filter(m => m.theme === theme);
}

/** Get maps by tag (any match) */
export function getFoundryMapsByTags(tags: string[]): FoundryMapEntry[] {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  return FOUNDRY_MAP_CATALOG.filter(m =>
    (m.tags || []).some(t => tagSet.has(t.toLowerCase()))
  );
}

/** Get maps suitable for a given party level */
export function getFoundryMapsByLevel(level: number): FoundryMapEntry[] {
  return FOUNDRY_MAP_CATALOG.filter(m =>
    !m.suggestedLevels ||
    (level >= m.suggestedLevels.min && level <= m.suggestedLevels.max)
  );
}

/** Get a map by ID */
export function getFoundryMapById(id: string): FoundryMapEntry | undefined {
  return FOUNDRY_MAP_CATALOG.find(m => m.id === id);
}

/** Get all source modules represented in the catalog */
export function getFoundryMapSources(): { module: string; author: string; count: number }[] {
  const sources = new Map<string, { author: string; count: number }>();
  for (const map of FOUNDRY_MAP_CATALOG) {
    const existing = sources.get(map.sourceModule);
    if (existing) existing.count++;
    else sources.set(map.sourceModule, { author: map.author, count: 1 });
  }
  return [...sources.entries()].map(([module, data]) => ({
    module,
    author: data.author,
    count: data.count,
  }));
}

/** Score maps for a narrative context query (tag + description matching) */
export function scoreFoundryMaps(
  query: string,
  options?: { theme?: MapTheme; level?: number; excludeIds?: string[] }
): { map: FoundryMapEntry; score: number }[] {
  const words = query.toLowerCase().split(/\s+/);
  const excludeSet = new Set(options?.excludeIds || []);

  return FOUNDRY_MAP_CATALOG
    .filter(m => !excludeSet.has(m.id))
    .filter(m => !options?.theme || m.theme === options.theme)
    .filter(m => !options?.level || !m.suggestedLevels ||
      (options.level >= m.suggestedLevels.min && options.level <= m.suggestedLevels.max))
    .map(m => {
      let score = 0;
      const matchText = `${m.name} ${m.description} ${m.narrationContext} ${m.subTheme} ${(m.tags || []).join(' ')} ${m.tacticalNotes || ''}`.toLowerCase();
      for (const word of words) {
        if (matchText.includes(word)) score += 2;
      }
      // Bonus for tag matches
      for (const tag of (m.tags || [])) {
        if (words.includes(tag)) score += 5;
      }
      return { map: m, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
