/**
 * PHASE 19.7: Encounter Map Database
 * Pre-made encounter maps organized by theme.
 * Each map includes grid dimensions, terrain features, and starting zones.
 */

import { EncounterMapTemplate, TerrainTile, MapFeature, Position } from './types';
import { FOUNDRY_MAP_CATALOG } from './foundryMapCatalog';

// ─── Helper: Auto-generate tags from map metadata for GM AI selection ───

function autoTagMap(map: EncounterMapTemplate): EncounterMapTemplate {
  if (map.tags && map.tags.length > 0) return map; // already tagged
  const text = `${map.name} ${map.description} ${map.subTheme}`.toLowerCase();
  const tags: string[] = [map.theme];
  const tagPatterns: [RegExp, string][] = [
    [/(dark|shadow|dim)/, 'dark'],
    [/(narrow|corridor|passage|tunnel)/, 'narrow'],
    [/(underground|under|below|depth|crypt|catacomb|sewer)/, 'underground'],
    [/(open|wide|field|clearing)/, 'open'],
    [/(water|river|lake|pond|stream|ocean|crossing)/, 'water'],
    [/(fire|lava|flame|burning|chasm)/, 'fire'],
    [/(ice|frozen|cold|frost|snow|winter)/, 'ice'],
    [/(throne|king|queen|royal|court)/, 'royal'],
    [/(ruin|ancient|crumbl|decay|abandon)/, 'ruins'],
    [/(bridge|crossing)/, 'bridge'],
    [/(ship|boat|dock|pier|harbor)/, 'nautical'],
    [/(arena|pit|colosseum|gladiator)/, 'arena'],
    [/(garden|hedge|grove|druid)/, 'nature'],
    [/(tavern|inn|bar|pub)/, 'tavern'],
    [/(market|shop|bazaar|store)/, 'market'],
    [/(cemetery|grave|tomb|burial|crypt)/, 'graves'],
    [/(forest|tree|wood)/, 'forest'],
    [/(mountain|hill|cliff|pass|ridge)/, 'mountain'],
    [/(swamp|bog|marsh|mire)/, 'swamp'],
    [/(cave|cavern|grotto)/, 'cave'],
    [/(library|book|scroll|study)/, 'library'],
    [/(temple|shrine|altar|chapel|holy)/, 'temple'],
    [/(tower|spire|wizard|mage)/, 'tower'],
    [/(street|alley|plaza|road)/, 'street'],
    [/(rooftop|roof|above)/, 'rooftop'],
    [/(manor|hall|mansion|noble|estate)/, 'manor'],
    [/(ambush|trap)/, 'ambush'],
    [/(pillar|column)/, 'pillars'],
  ];
  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(text)) tags.push(tag);
  }
  return { ...map, tags: [...new Set(tags)] };
}

// ─── Helper: Generate empty terrain grid ───────────────────────

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

// ─── Dungeon Maps ──────────────────────────────────────────────

function createDungeonCorridor(): EncounterMapTemplate {
  const grid = emptyGrid(16, 10);
  // Walls along top and bottom, narrow corridor
  const walls: Position[] = [];
  for (let x = 0; x < 16; x++) {
    walls.push({ x, y: 0 }, { x, y: 9 });
    if (x < 5 || x > 10) {
      walls.push({ x, y: 3 }, { x, y: 6 });
    }
  }
  setTerrain(grid, walls, 'impassable');

  return {
    id: 'dungeon-corridor',
    name: 'Dungeon Corridor',
    theme: 'dungeon',
    subTheme: 'corridors',
    description: 'A narrow stone corridor with alcoves on each side. Perfect for ambushes.',
    width: 16,
    height: 10,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 5 }],
      enemies: [{ x: 13, y: 4 }, { x: 13, y: 5 }, { x: 14, y: 4 }, { x: 14, y: 5 }],
    },
    features: [
      { name: 'North Wall', type: 'wall', positions: walls.filter(w => w.y <= 3), description: 'Rough-hewn stone walls' },
      { name: 'South Wall', type: 'wall', positions: walls.filter(w => w.y >= 6), description: 'Rough-hewn stone walls' },
    ],
  };
}

function createThroneRoom(): EncounterMapTemplate {
  const grid = emptyGrid(20, 16);
  // Walls around perimeter
  const walls: Position[] = [];
  for (let x = 0; x < 20; x++) {
    walls.push({ x, y: 0 }, { x, y: 15 });
  }
  for (let y = 0; y < 16; y++) {
    walls.push({ x: 0, y }, { x: 19, y });
  }
  // Pillars
  const pillars: Position[] = [
    { x: 4, y: 4 }, { x: 4, y: 11 },
    { x: 8, y: 4 }, { x: 8, y: 11 },
    { x: 12, y: 4 }, { x: 12, y: 11 },
    { x: 15, y: 4 }, { x: 15, y: 11 },
  ];
  setTerrain(grid, walls, 'impassable');
  setTerrain(grid, pillars, 'impassable');
  // Carpet = difficult terrain down the center
  const carpet: Position[] = [];
  for (let x = 2; x < 18; x++) {
    carpet.push({ x, y: 7 }, { x, y: 8 });
  }
  setTerrain(grid, carpet, 'difficult');

  return {
    id: 'dungeon-throne-room',
    name: 'Throne Room',
    theme: 'dungeon',
    subTheme: 'throne-room',
    description: 'A grand hall with pillars lining either side, leading to a raised throne. A red carpet runs down the center.',
    width: 20,
    height: 16,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 7 }, { x: 2, y: 8 }, { x: 3, y: 7 }, { x: 3, y: 8 }],
      enemies: [{ x: 16, y: 7 }, { x: 17, y: 7 }, { x: 16, y: 8 }, { x: 17, y: 8 }],
    },
    features: [
      { name: 'Pillars', type: 'cover', positions: pillars, description: 'Stone pillars providing half cover' },
      { name: 'Red Carpet', type: 'difficult-terrain', positions: carpet, description: 'Thick carpet — difficult terrain' },
      { name: 'Throne', type: 'elevation', positions: [{ x: 17, y: 7 }, { x: 17, y: 8 }, { x: 18, y: 7 }, { x: 18, y: 8 }], description: 'Raised throne dais (+5ft elevation)' },
    ],
  };
}

function createCrypt(): EncounterMapTemplate {
  const grid = emptyGrid(14, 14);
  const walls: Position[] = [];
  for (let x = 0; x < 14; x++) {
    walls.push({ x, y: 0 }, { x, y: 13 });
  }
  for (let y = 0; y < 14; y++) {
    walls.push({ x: 0, y }, { x: 13, y });
  }
  // Sarcophagi (impassable blocks)
  const sarcophagi: Position[] = [
    { x: 3, y: 3 }, { x: 3, y: 5 }, { x: 3, y: 7 }, { x: 3, y: 9 },
    { x: 10, y: 3 }, { x: 10, y: 5 }, { x: 10, y: 7 }, { x: 10, y: 9 },
  ];
  setTerrain(grid, walls, 'impassable');
  setTerrain(grid, sarcophagi, 'impassable');

  return {
    id: 'dungeon-crypt',
    name: 'Ancient Crypt',
    theme: 'dungeon',
    subTheme: 'crypts',
    description: 'A musty crypt lined with stone sarcophagi. The dead rest here... or do they?',
    width: 14,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 6, y: 1 }, { x: 7, y: 1 }, { x: 6, y: 2 }, { x: 7, y: 2 }],
      enemies: [{ x: 6, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 12 }, { x: 7, y: 12 }],
    },
    features: [
      { name: 'Sarcophagi', type: 'cover', positions: sarcophagi, description: 'Stone coffins — impassable, provide cover' },
    ],
  };
}

function createDungeonCrossroads(): EncounterMapTemplate {
  const grid = emptyGrid(16, 16);
  // Create a + shaped corridor
  const walls: Position[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const inHorizontal = y >= 6 && y <= 9;
      const inVertical = x >= 6 && x <= 9;
      if (!inHorizontal && !inVertical) {
        walls.push({ x, y });
      }
    }
  }
  setTerrain(grid, walls, 'impassable');

  return {
    id: 'dungeon-crossroads',
    name: 'Dungeon Crossroads',
    theme: 'dungeon',
    subTheme: 'corridors',
    description: 'A four-way intersection deep underground. Danger could come from any direction.',
    width: 16,
    height: 16,
    terrain: grid,
    startingZones: {
      players: [{ x: 7, y: 1 }, { x: 8, y: 1 }, { x: 7, y: 2 }, { x: 8, y: 2 }],
      enemies: [{ x: 7, y: 13 }, { x: 8, y: 13 }, { x: 7, y: 14 }, { x: 8, y: 14 }],
    },
    features: [],
  };
}

// ─── Wilderness Maps ───────────────────────────────────────────

function createForestClearing(): EncounterMapTemplate {
  const grid = emptyGrid(18, 14);
  // Trees around the edges
  const trees: Position[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 2 },
    { x: 16, y: 0 }, { x: 17, y: 0 }, { x: 17, y: 1 }, { x: 15, y: 1 },
    { x: 0, y: 12 }, { x: 1, y: 13 }, { x: 0, y: 13 }, { x: 2, y: 12 },
    { x: 17, y: 12 }, { x: 16, y: 13 }, { x: 17, y: 13 }, { x: 15, y: 12 },
    { x: 5, y: 0 }, { x: 12, y: 0 }, { x: 5, y: 13 }, { x: 12, y: 13 },
  ];
  setTerrain(grid, trees, 'impassable');
  // Underbrush
  const brush: Position[] = [
    { x: 3, y: 2 }, { x: 4, y: 1 }, { x: 14, y: 2 }, { x: 13, y: 1 },
    { x: 3, y: 11 }, { x: 4, y: 12 }, { x: 14, y: 11 }, { x: 13, y: 12 },
    { x: 8, y: 3 }, { x: 9, y: 10 },
  ];
  setTerrain(grid, brush, 'difficult');

  return {
    id: 'wilderness-forest-clearing',
    name: 'Forest Clearing',
    theme: 'wilderness',
    subTheme: 'forest',
    description: 'A sun-dappled clearing in a dense forest. Fallen logs and underbrush make footing treacherous.',
    width: 18,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 3, y: 6 }, { x: 3, y: 7 }, { x: 4, y: 6 }, { x: 4, y: 7 }],
      enemies: [{ x: 13, y: 6 }, { x: 13, y: 7 }, { x: 14, y: 6 }, { x: 14, y: 7 }],
    },
    features: [
      { name: 'Trees', type: 'cover', positions: trees, description: 'Dense trees — impassable, provide cover' },
      { name: 'Underbrush', type: 'difficult-terrain', positions: brush, description: 'Thick underbrush — difficult terrain' },
    ],
  };
}

function createMountainPass(): EncounterMapTemplate {
  const grid = emptyGrid(20, 10);
  // Cliff edges
  const cliffs: Position[] = [];
  for (let x = 0; x < 20; x++) {
    if (x < 7 || x > 12) {
      cliffs.push({ x, y: 0 }, { x, y: 1 });
      cliffs.push({ x, y: 8 }, { x, y: 9 });
    }
  }
  // Boulders
  const boulders: Position[] = [
    { x: 5, y: 3 }, { x: 10, y: 5 }, { x: 14, y: 4 },
  ];
  setTerrain(grid, cliffs, 'impassable');
  setTerrain(grid, boulders, 'impassable');
  // Scree
  const scree: Position[] = [
    { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 12, y: 2 }, { x: 13, y: 2 },
    { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 12, y: 7 }, { x: 13, y: 7 },
  ];
  setTerrain(grid, scree, 'difficult');

  return {
    id: 'wilderness-mountain-pass',
    name: 'Mountain Pass',
    theme: 'wilderness',
    subTheme: 'mountains',
    description: 'A narrow pass between towering cliff faces. Loose scree makes footing uncertain.',
    width: 20,
    height: 10,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 5 }],
      enemies: [{ x: 17, y: 4 }, { x: 17, y: 5 }, { x: 18, y: 4 }, { x: 18, y: 5 }],
    },
    features: [
      { name: 'Cliff Walls', type: 'wall', positions: cliffs, description: 'Sheer cliff faces' },
      { name: 'Boulders', type: 'cover', positions: boulders, description: 'Large boulders providing cover' },
      { name: 'Loose Scree', type: 'difficult-terrain', positions: scree, description: 'Loose rock — difficult terrain' },
    ],
  };
}

function createCaveEntrance(): EncounterMapTemplate {
  const grid = emptyGrid(16, 14);
  // Cave walls — open area narrowing into cave
  const walls: Position[] = [];
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 16; x++) {
      if (y < 3) {
        // Inside cave — narrower
        if (x < 3 || x > 12) walls.push({ x, y });
      } else if (y < 6) {
        // Cave mouth
        if (x < 2 || x > 13) walls.push({ x, y });
      }
      // Lower section is open (outside)
    }
  }
  setTerrain(grid, walls, 'impassable');
  // Rocks near entrance
  const rocks: Position[] = [{ x: 5, y: 5 }, { x: 10, y: 4 }, { x: 7, y: 7 }];
  setTerrain(grid, rocks, 'impassable');

  return {
    id: 'wilderness-cave-entrance',
    name: 'Cave Entrance',
    theme: 'wilderness',
    subTheme: 'caves',
    description: 'The gaping mouth of a cave opens in the hillside. Inside, darkness awaits.',
    width: 16,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 7, y: 11 }, { x: 8, y: 11 }, { x: 7, y: 12 }, { x: 8, y: 12 }],
      enemies: [{ x: 7, y: 1 }, { x: 8, y: 1 }, { x: 7, y: 2 }, { x: 8, y: 2 }],
    },
    features: [
      { name: 'Cave Walls', type: 'wall', positions: walls, description: 'Natural stone cave walls' },
      { name: 'Entrance Rocks', type: 'cover', positions: rocks, description: 'Scattered boulders' },
    ],
  };
}

function createRiverCrossing(): EncounterMapTemplate {
  const grid = emptyGrid(18, 12);
  // River running vertically through center
  const water: Position[] = [];
  for (let y = 0; y < 12; y++) {
    water.push({ x: 8, y }, { x: 9, y });
  }
  setTerrain(grid, water, 'difficult');
  // Bridge
  const bridge: Position[] = [{ x: 8, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 6 }, { x: 9, y: 6 }];
  setTerrain(grid, bridge, 'empty'); // Bridge is normal terrain

  return {
    id: 'wilderness-river-crossing',
    name: 'River Crossing',
    theme: 'wilderness',
    subTheme: 'rivers',
    description: 'A shallow river with a narrow bridge. Crossing through the water slows movement.',
    width: 18,
    height: 12,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 5 }, { x: 2, y: 6 }, { x: 3, y: 5 }, { x: 3, y: 6 }],
      enemies: [{ x: 14, y: 5 }, { x: 14, y: 6 }, { x: 15, y: 5 }, { x: 15, y: 6 }],
    },
    features: [
      { name: 'River', type: 'water', positions: water, description: 'Shallow river — difficult terrain' },
      { name: 'Bridge', type: 'cover', positions: bridge, description: 'Narrow stone bridge — normal movement' },
    ],
  };
}

// ─── Urban Maps ────────────────────────────────────────────────

function createCityStreet(): EncounterMapTemplate {
  const grid = emptyGrid(20, 12);
  // Buildings on sides
  const buildings: Position[] = [];
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 3; y++) buildings.push({ x, y });
    for (let y = 9; y < 12; y++) buildings.push({ x, y });
  }
  // Door openings
  const doors = [{ x: 4, y: 2 }, { x: 12, y: 2 }, { x: 7, y: 9 }, { x: 15, y: 9 }];
  for (const door of doors) {
    buildings.splice(buildings.findIndex(b => b.x === door.x && b.y === door.y), 1);
  }
  setTerrain(grid, buildings, 'impassable');
  // Market stalls
  const stalls: Position[] = [{ x: 6, y: 5 }, { x: 6, y: 6 }, { x: 13, y: 5 }, { x: 13, y: 6 }];
  setTerrain(grid, stalls, 'impassable');
  // Crates
  const crates: Position[] = [{ x: 3, y: 4 }, { x: 16, y: 7 }];
  setTerrain(grid, crates, 'difficult');

  return {
    id: 'urban-city-street',
    name: 'City Street',
    theme: 'urban',
    subTheme: 'streets',
    description: 'A bustling city street lined with buildings and market stalls. Plenty of cover for ambushes.',
    width: 20,
    height: 12,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 5 }, { x: 2, y: 6 }, { x: 3, y: 5 }, { x: 3, y: 6 }],
      enemies: [{ x: 17, y: 5 }, { x: 17, y: 6 }, { x: 18, y: 5 }, { x: 18, y: 6 }],
    },
    features: [
      { name: 'Buildings', type: 'wall', positions: buildings, description: 'Stone and timber buildings' },
      { name: 'Market Stalls', type: 'cover', positions: stalls, description: 'Wooden market stalls — cover and impassable' },
      { name: 'Crates', type: 'difficult-terrain', positions: crates, description: 'Stacked crates — difficult terrain' },
      { name: 'Doorways', type: 'door', positions: doors, description: 'Building entrances' },
    ],
  };
}

function createTavernInterior(): EncounterMapTemplate {
  const grid = emptyGrid(14, 12);
  // Walls
  const walls: Position[] = [];
  for (let x = 0; x < 14; x++) {
    walls.push({ x, y: 0 }, { x, y: 11 });
  }
  for (let y = 0; y < 12; y++) {
    walls.push({ x: 0, y }, { x: 13, y });
  }
  // Interior walls (back room divider)
  for (let y = 0; y < 7; y++) {
    walls.push({ x: 10, y });
  }
  setTerrain(grid, walls, 'impassable');
  // Tables (cover)
  const tables: Position[] = [
    { x: 3, y: 3 }, { x: 3, y: 5 }, { x: 3, y: 8 },
    { x: 6, y: 3 }, { x: 6, y: 6 }, { x: 6, y: 9 },
  ];
  setTerrain(grid, tables, 'difficult');
  // Bar counter
  const bar: Position[] = [{ x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 }, { x: 8, y: 6 }];
  setTerrain(grid, bar, 'impassable');

  return {
    id: 'urban-tavern',
    name: 'Tavern Interior',
    theme: 'urban',
    subTheme: 'tavern',
    description: 'A lively tavern with scattered tables and a long bar counter. The back room offers a defensible position.',
    width: 14,
    height: 12,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 9 }, { x: 3, y: 9 }, { x: 2, y: 10 }, { x: 3, y: 10 }],
      enemies: [{ x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 }, { x: 4, y: 2 }],
    },
    features: [
      { name: 'Tavern Walls', type: 'wall', positions: walls, description: 'Thick wooden walls' },
      { name: 'Tables', type: 'cover', positions: tables, description: 'Wooden tables — provide cover, difficult terrain' },
      { name: 'Bar Counter', type: 'cover', positions: bar, description: 'Heavy oak bar counter — impassable, full cover' },
    ],
  };
}

function createRooftops(): EncounterMapTemplate {
  const grid = emptyGrid(18, 10);
  // Gaps between buildings (fall zone)
  const gaps: Position[] = [];
  for (let y = 0; y < 10; y++) {
    gaps.push({ x: 6, y }, { x: 12, y });
  }
  setTerrain(grid, gaps, 'difficult');
  // Chimneys
  const chimneys: Position[] = [
    { x: 2, y: 2 }, { x: 9, y: 4 }, { x: 15, y: 3 }, { x: 4, y: 7 },
  ];
  setTerrain(grid, chimneys, 'impassable');

  return {
    id: 'urban-rooftops',
    name: 'Rooftops',
    theme: 'urban',
    subTheme: 'rooftops',
    description: 'A chase across the rooftops! Gaps between buildings and chimneys create a dynamic battlefield.',
    width: 18,
    height: 10,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 5 }],
      enemies: [{ x: 15, y: 4 }, { x: 15, y: 5 }, { x: 16, y: 4 }, { x: 16, y: 5 }],
    },
    features: [
      { name: 'Building Gaps', type: 'pit', positions: gaps, description: 'Gaps between buildings — fall hazard, difficult terrain' },
      { name: 'Chimneys', type: 'cover', positions: chimneys, description: 'Brick chimneys — impassable, cover' },
    ],
  };
}

// ─── Indoor Maps ───────────────────────────────────────────────

function createManorHall(): EncounterMapTemplate {
  const grid = emptyGrid(18, 14);
  const walls: Position[] = [];
  for (let x = 0; x < 18; x++) {
    walls.push({ x, y: 0 }, { x, y: 13 });
  }
  for (let y = 0; y < 14; y++) {
    walls.push({ x: 0, y }, { x: 17, y });
  }
  // Pillars
  const pillars: Position[] = [
    { x: 4, y: 3 }, { x: 4, y: 10 },
    { x: 9, y: 3 }, { x: 9, y: 10 },
    { x: 13, y: 3 }, { x: 13, y: 10 },
  ];
  setTerrain(grid, walls, 'impassable');
  setTerrain(grid, pillars, 'impassable');
  // Dining table
  const table: Position[] = [];
  for (let x = 6; x <= 11; x++) {
    table.push({ x, y: 6 }, { x, y: 7 });
  }
  setTerrain(grid, table, 'difficult');

  return {
    id: 'indoor-manor-hall',
    name: 'Manor Great Hall',
    theme: 'indoor',
    subTheme: 'manor',
    description: 'A grand hall with a long dining table and ornate pillars. The lord\'s seat awaits at the far end.',
    width: 18,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 2, y: 6 }, { x: 2, y: 7 }, { x: 3, y: 6 }, { x: 3, y: 7 }],
      enemies: [{ x: 14, y: 6 }, { x: 14, y: 7 }, { x: 15, y: 6 }, { x: 15, y: 7 }],
    },
    features: [
      { name: 'Pillars', type: 'cover', positions: pillars, description: 'Marble pillars — cover' },
      { name: 'Dining Table', type: 'difficult-terrain', positions: table, description: 'Long wooden table — difficult terrain' },
    ],
  };
}

function createLibrary(): EncounterMapTemplate {
  const grid = emptyGrid(14, 14);
  const walls: Position[] = [];
  for (let x = 0; x < 14; x++) {
    walls.push({ x, y: 0 }, { x, y: 13 });
  }
  for (let y = 0; y < 14; y++) {
    walls.push({ x: 0, y }, { x: 13, y });
  }
  // Bookshelves (impassable rows)
  const shelves: Position[] = [];
  for (let y = 2; y <= 11; y += 3) {
    for (let x = 2; x <= 5; x++) {
      shelves.push({ x, y });
    }
    for (let x = 8; x <= 11; x++) {
      shelves.push({ x, y });
    }
  }
  setTerrain(grid, walls, 'impassable');
  setTerrain(grid, shelves, 'impassable');

  return {
    id: 'indoor-library',
    name: 'Grand Library',
    theme: 'indoor',
    subTheme: 'library',
    description: 'Towering bookshelves create labyrinthine aisles. Knowledge — and danger — lurk in every corner.',
    width: 14,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 6, y: 1 }, { x: 7, y: 1 }, { x: 6, y: 3 }, { x: 7, y: 3 }],
      enemies: [{ x: 6, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 12 }, { x: 7, y: 12 }],
    },
    features: [
      { name: 'Bookshelves', type: 'wall', positions: shelves, description: 'Tall wooden bookshelves — impassable, can be toppled' },
    ],
  };
}

function createTemple(): EncounterMapTemplate {
  const grid = emptyGrid(16, 16);
  const walls: Position[] = [];
  for (let x = 0; x < 16; x++) {
    walls.push({ x, y: 0 }, { x, y: 15 });
  }
  for (let y = 0; y < 16; y++) {
    walls.push({ x: 0, y }, { x: 15, y });
  }
  setTerrain(grid, walls, 'impassable');
  // Altar
  const altar: Position[] = [{ x: 7, y: 2 }, { x: 8, y: 2 }];
  setTerrain(grid, altar, 'impassable');
  // Pews (difficult terrain)
  const pews: Position[] = [];
  for (let y = 5; y <= 12; y += 2) {
    for (let x = 3; x <= 5; x++) pews.push({ x, y });
    for (let x = 10; x <= 12; x++) pews.push({ x, y });
  }
  setTerrain(grid, pews, 'difficult');
  // Pillars
  const pillars: Position[] = [
    { x: 2, y: 3 }, { x: 13, y: 3 },
    { x: 2, y: 8 }, { x: 13, y: 8 },
    { x: 2, y: 13 }, { x: 13, y: 13 },
  ];
  setTerrain(grid, pillars, 'impassable');

  return {
    id: 'indoor-temple',
    name: 'Temple Sanctum',
    theme: 'indoor',
    subTheme: 'temple',
    description: 'A holy temple with rows of pews leading to a sacred altar. Pillars line the nave.',
    width: 16,
    height: 16,
    terrain: grid,
    startingZones: {
      players: [{ x: 7, y: 13 }, { x: 8, y: 13 }, { x: 7, y: 14 }, { x: 8, y: 14 }],
      enemies: [{ x: 7, y: 3 }, { x: 8, y: 3 }, { x: 7, y: 4 }, { x: 8, y: 4 }],
    },
    features: [
      { name: 'Altar', type: 'cover', positions: altar, description: 'Sacred altar — impassable, full cover' },
      { name: 'Pews', type: 'difficult-terrain', positions: pews, description: 'Wooden pews — difficult terrain' },
      { name: 'Pillars', type: 'cover', positions: pillars, description: 'Stone pillars — cover' },
    ],
  };
}

// ─── Special Maps ──────────────────────────────────────────────

function createArena(): EncounterMapTemplate {
  const grid = emptyGrid(16, 16);
  // Circular arena — walls at corners to make it feel round
  const walls: Position[] = [];
  const cornerRadius = 4;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = Math.min(x, 15 - x);
      const dy = Math.min(y, 15 - y);
      if (dx + dy < cornerRadius) {
        walls.push({ x, y });
      }
    }
  }
  setTerrain(grid, walls, 'impassable');

  return {
    id: 'special-arena',
    name: 'Gladiatorial Arena',
    theme: 'special',
    subTheme: 'arena',
    description: 'A rounded arena with high walls. The crowd roars from above. Fight or die!',
    width: 16,
    height: 16,
    terrain: grid,
    startingZones: {
      players: [{ x: 4, y: 7 }, { x: 4, y: 8 }, { x: 5, y: 7 }, { x: 5, y: 8 }],
      enemies: [{ x: 10, y: 7 }, { x: 10, y: 8 }, { x: 11, y: 7 }, { x: 11, y: 8 }],
    },
    features: [
      { name: 'Arena Walls', type: 'wall', positions: walls, description: 'Curved arena walls — no escape' },
    ],
  };
}

function createShipDeck(): EncounterMapTemplate {
  const grid = emptyGrid(20, 8);
  // Ship hull (walls at front and back tapering)
  const hull: Position[] = [];
  for (let x = 0; x < 3; x++) {
    hull.push({ x, y: 0 }, { x, y: 7 });
  }
  for (let x = 17; x < 20; x++) {
    hull.push({ x, y: 0 }, { x, y: 7 });
  }
  // Bow taper
  hull.push({ x: 0, y: 1 }, { x: 0, y: 6 }, { x: 19, y: 1 }, { x: 19, y: 6 });
  setTerrain(grid, hull, 'impassable');
  // Mast
  const mast: Position[] = [{ x: 7, y: 3 }, { x: 7, y: 4 }, { x: 12, y: 3 }, { x: 12, y: 4 }];
  setTerrain(grid, mast, 'impassable');

  return {
    id: 'special-ship-deck',
    name: 'Ship Deck',
    theme: 'special',
    subTheme: 'ship',
    description: 'The deck of a sailing vessel. Masts provide cover, and the railings keep you from falling overboard.',
    width: 20,
    height: 8,
    terrain: grid,
    startingZones: {
      players: [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 4 }],
      enemies: [{ x: 14, y: 3 }, { x: 14, y: 4 }, { x: 15, y: 3 }, { x: 15, y: 4 }],
    },
    features: [
      { name: 'Ship Hull', type: 'wall', positions: hull, description: 'Ship railings and hull' },
      { name: 'Masts', type: 'cover', positions: mast, description: 'Tall masts — provide cover' },
    ],
  };
}

function createBridge(): EncounterMapTemplate {
  const grid = emptyGrid(20, 8);
  // Chasms on sides
  const chasm: Position[] = [];
  for (let x = 0; x < 20; x++) {
    chasm.push({ x, y: 0 }, { x, y: 1 }, { x, y: 6 }, { x, y: 7 });
  }
  // Bridge surface (clear the chasm for the bridge)
  for (let x = 0; x < 20; x++) {
    chasm.push(); // bridge is already clear from emptyGrid
  }
  setTerrain(grid, chasm, 'impassable');

  return {
    id: 'special-bridge',
    name: 'Chasm Bridge',
    theme: 'special',
    subTheme: 'bridge',
    description: 'A narrow stone bridge over a bottomless chasm. One wrong step and you plummet into darkness.',
    width: 20,
    height: 8,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }],
      enemies: [{ x: 17, y: 3 }, { x: 17, y: 4 }, { x: 18, y: 3 }, { x: 18, y: 4 }],
    },
    features: [
      { name: 'Bottomless Chasm', type: 'pit', positions: chasm, description: 'Bottomless chasm — instant death on fall' },
    ],
  };
}

function createLavaChasm(): EncounterMapTemplate {
  const grid = emptyGrid(16, 14);
  // Lava pools
  const lava: Position[] = [];
  for (let y = 4; y <= 9; y++) {
    for (let x = 3; x <= 5; x++) lava.push({ x, y });
    for (let x = 10; x <= 12; x++) lava.push({ x, y });
  }
  setTerrain(grid, lava, 'impassable');
  // Narrow paths between lava
  const heat: Position[] = [
    { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 8 },
    { x: 9, y: 5 }, { x: 9, y: 6 }, { x: 9, y: 7 }, { x: 9, y: 8 },
  ];
  setTerrain(grid, heat, 'difficult');

  return {
    id: 'special-lava-chasm',
    name: 'Lava Cavern',
    theme: 'special',
    subTheme: 'lava',
    description: 'Glowing rivers of molten rock illuminate the cavern. The heat is oppressive, and the ground crumbles near the lava.',
    width: 16,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 7, y: 1 }, { x: 8, y: 1 }, { x: 7, y: 2 }, { x: 8, y: 2 }],
      enemies: [{ x: 7, y: 11 }, { x: 8, y: 11 }, { x: 7, y: 12 }, { x: 8, y: 12 }],
    },
    features: [
      { name: 'Lava Pools', type: 'lava', positions: lava, description: 'Molten lava — instant damage, impassable' },
      { name: 'Heated Ground', type: 'hazard', positions: heat, description: 'Ground near lava — difficult terrain, fire hazard' },
    ],
  };
}

// ─── Simple Maps ───────────────────────────────────────────────

function createOpenField(): EncounterMapTemplate {
  return {
    id: 'wilderness-open-field',
    name: 'Open Field',
    theme: 'wilderness',
    subTheme: 'plains',
    description: 'A wide open field with no cover. Nowhere to hide.',
    width: 20,
    height: 14,
    terrain: emptyGrid(20, 14),
    startingZones: {
      players: [{ x: 2, y: 6 }, { x: 2, y: 7 }, { x: 3, y: 6 }, { x: 3, y: 7 }],
      enemies: [{ x: 16, y: 6 }, { x: 16, y: 7 }, { x: 17, y: 6 }, { x: 17, y: 7 }],
    },
    features: [],
  };
}

function createBlankGrid(): EncounterMapTemplate {
  return {
    id: 'blank-grid',
    name: 'Blank Grid',
    theme: 'special',
    subTheme: 'blank',
    description: 'An empty grid for custom encounters.',
    width: 20,
    height: 20,
    terrain: emptyGrid(20, 20),
    startingZones: {
      players: [{ x: 2, y: 9 }, { x: 2, y: 10 }, { x: 3, y: 9 }, { x: 3, y: 10 }],
      enemies: [{ x: 17, y: 9 }, { x: 17, y: 10 }, { x: 18, y: 9 }, { x: 18, y: 10 }],
    },
    features: [],
  };
}

function createSwamp(): EncounterMapTemplate {
  const grid = emptyGrid(18, 14);
  // Lots of difficult terrain (murky water)
  const swampWater: Position[] = [];
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 18; x++) {
      // Create patches of difficult terrain
      if ((x + y) % 3 === 0 || (x * y) % 7 === 0) {
        swampWater.push({ x, y });
      }
    }
  }
  setTerrain(grid, swampWater, 'difficult');
  // Dead trees
  const trees: Position[] = [
    { x: 3, y: 3 }, { x: 8, y: 2 }, { x: 14, y: 4 },
    { x: 5, y: 9 }, { x: 11, y: 10 }, { x: 16, y: 8 },
  ];
  setTerrain(grid, trees, 'impassable');

  return {
    id: 'wilderness-swamp',
    name: 'Murky Swamp',
    theme: 'wilderness',
    subTheme: 'swamp',
    description: 'A treacherous swamp where every step risks sinking into muck. Dead trees jut from the bog.',
    width: 18,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 6 }, { x: 1, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 7 }],
      enemies: [{ x: 15, y: 6 }, { x: 15, y: 7 }, { x: 16, y: 6 }, { x: 16, y: 7 }],
    },
    features: [
      { name: 'Swamp Water', type: 'water', positions: swampWater, description: 'Murky swamp water — difficult terrain' },
      { name: 'Dead Trees', type: 'cover', positions: trees, description: 'Dead trees — impassable, half cover' },
    ],
  };
}

function createRuins(): EncounterMapTemplate {
  const grid = emptyGrid(16, 16);
  // Crumbled walls
  const walls: Position[] = [
    // Outer remnants (partial walls)
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 13, y: 0 }, { x: 14, y: 0 }, { x: 15, y: 0 },
    { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 },
    { x: 15, y: 0 }, { x: 15, y: 1 }, { x: 15, y: 2 },
    { x: 0, y: 13 }, { x: 0, y: 14 }, { x: 0, y: 15 },
    { x: 15, y: 13 }, { x: 15, y: 14 }, { x: 15, y: 15 },
    { x: 0, y: 15 }, { x: 1, y: 15 }, { x: 2, y: 15 },
    { x: 13, y: 15 }, { x: 14, y: 15 }, { x: 15, y: 15 },
    // Interior wall fragments
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 10, y: 5 }, { x: 10, y: 6 },
    { x: 5, y: 9 }, { x: 5, y: 10 }, { x: 10, y: 9 }, { x: 10, y: 10 },
  ];
  setTerrain(grid, walls, 'impassable');
  // Rubble
  const rubble: Position[] = [
    { x: 3, y: 1 }, { x: 12, y: 1 }, { x: 3, y: 14 }, { x: 12, y: 14 },
    { x: 7, y: 7 }, { x: 8, y: 8 },
  ];
  setTerrain(grid, rubble, 'difficult');

  return {
    id: 'wilderness-ruins',
    name: 'Ancient Ruins',
    theme: 'wilderness',
    subTheme: 'ruins',
    description: 'Crumbled walls and scattered rubble are all that remain of a once-great structure.',
    width: 16,
    height: 16,
    terrain: grid,
    startingZones: {
      players: [{ x: 7, y: 1 }, { x: 8, y: 1 }, { x: 7, y: 2 }, { x: 8, y: 2 }],
      enemies: [{ x: 7, y: 13 }, { x: 8, y: 13 }, { x: 7, y: 14 }, { x: 8, y: 14 }],
    },
    features: [
      { name: 'Crumbled Walls', type: 'wall', positions: walls, description: 'Remnants of ancient walls — cover' },
      { name: 'Rubble', type: 'difficult-terrain', positions: rubble, description: 'Scattered stone rubble — difficult terrain' },
    ],
  };
}

function createWizardTower(): EncounterMapTemplate {
  const grid = emptyGrid(12, 12);
  // Circular-ish room
  const walls: Position[] = [];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const dx = x - 5.5;
      const dy = y - 5.5;
      if (dx * dx + dy * dy > 30) {
        walls.push({ x, y });
      }
    }
  }
  setTerrain(grid, walls, 'impassable');
  // Central pillar/focus
  const pillar: Position[] = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }];
  setTerrain(grid, pillar, 'impassable');

  return {
    id: 'indoor-wizard-tower',
    name: 'Wizard\'s Tower',
    theme: 'indoor',
    subTheme: 'tower',
    description: 'The circular chamber atop a wizard\'s tower. Arcane runes glow on the floor around a central focus.',
    width: 12,
    height: 12,
    terrain: grid,
    startingZones: {
      players: [{ x: 3, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 9 }, { x: 4, y: 9 }],
      enemies: [{ x: 7, y: 3 }, { x: 8, y: 3 }, { x: 7, y: 2 }, { x: 8, y: 2 }],
    },
    features: [
      { name: 'Tower Walls', type: 'wall', positions: walls, description: 'Curved tower walls' },
      { name: 'Arcane Focus', type: 'hazard', positions: pillar, description: 'Central arcane focus — emanates wild magic' },
    ],
  };
}

function createDockyard(): EncounterMapTemplate {
  const grid = emptyGrid(20, 12);
  // Water on one side
  const water: Position[] = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 20; x++) {
      water.push({ x, y });
    }
  }
  setTerrain(grid, water, 'difficult');
  // Dock piers
  const piers: Position[] = [];
  for (let x = 3; x <= 5; x++) {
    for (let y = 0; y < 4; y++) piers.push({ x, y });
  }
  for (let x = 10; x <= 12; x++) {
    for (let y = 0; y < 4; y++) piers.push({ x, y });
  }
  setTerrain(grid, piers, 'empty');
  // Crates on dock
  const crates: Position[] = [
    { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 11, y: 5 }, { x: 12, y: 5 },
    { x: 7, y: 7 }, { x: 15, y: 8 },
  ];
  setTerrain(grid, crates, 'impassable');

  return {
    id: 'urban-dockyard',
    name: 'Dockyard',
    theme: 'urban',
    subTheme: 'docks',
    description: 'A busy dockyard with wooden piers extending into the harbor. Stacked crates provide cover.',
    width: 20,
    height: 12,
    terrain: grid,
    startingZones: {
      players: [{ x: 3, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 10 }, { x: 4, y: 10 }],
      enemies: [{ x: 15, y: 9 }, { x: 16, y: 9 }, { x: 15, y: 10 }, { x: 16, y: 10 }],
    },
    features: [
      { name: 'Harbor Water', type: 'water', positions: water, description: 'Harbor water — difficult terrain, swim check to cross' },
      { name: 'Dock Piers', type: 'cover', positions: piers, description: 'Wooden piers — normal movement over water' },
      { name: 'Cargo Crates', type: 'cover', positions: crates, description: 'Stacked cargo — impassable, full cover' },
    ],
  };
}

function createCatacomb(): EncounterMapTemplate {
  const grid = emptyGrid(16, 16);
  // Maze-like layout with alcoves
  const walls: Position[] = [];
  for (let x = 0; x < 16; x++) {
    walls.push({ x, y: 0 }, { x, y: 15 });
  }
  for (let y = 0; y < 16; y++) {
    walls.push({ x: 0, y }, { x: 15, y });
  }
  // Internal maze walls
  for (let x = 3; x <= 5; x++) walls.push({ x, y: 3 });
  for (let x = 7; x <= 9; x++) walls.push({ x, y: 3 });
  for (let y = 5; y <= 8; y++) walls.push({ x: 5, y });
  for (let y = 5; y <= 8; y++) walls.push({ x: 10, y });
  for (let x = 3; x <= 5; x++) walls.push({ x, y: 10 });
  for (let x = 10; x <= 12; x++) walls.push({ x, y: 10 });
  for (let y = 10; y <= 13; y++) walls.push({ x: 7, y });
  setTerrain(grid, walls, 'impassable');

  return {
    id: 'dungeon-catacomb',
    name: 'Catacombs',
    theme: 'dungeon',
    subTheme: 'catacombs',
    description: 'Twisting passages lined with bones and burial niches. The dead outnumber the living here.',
    width: 16,
    height: 16,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
      enemies: [{ x: 13, y: 13 }, { x: 14, y: 13 }, { x: 13, y: 14 }, { x: 14, y: 14 }],
    },
    features: [
      { name: 'Catacomb Walls', type: 'wall', positions: walls, description: 'Bone-lined walls of the catacombs' },
    ],
  };
}

function createGarden(): EncounterMapTemplate {
  const grid = emptyGrid(16, 14);
  // Hedgerows
  const hedges: Position[] = [];
  for (let x = 3; x <= 6; x++) hedges.push({ x, y: 3 });
  for (let x = 9; x <= 12; x++) hedges.push({ x, y: 3 });
  for (let x = 3; x <= 6; x++) hedges.push({ x, y: 10 });
  for (let x = 9; x <= 12; x++) hedges.push({ x, y: 10 });
  for (let y = 3; y <= 10; y++) hedges.push({ x: 3, y }, { x: 12, y });
  setTerrain(grid, hedges, 'difficult');
  // Fountain center
  const fountain: Position[] = [{ x: 7, y: 6 }, { x: 8, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 7 }];
  setTerrain(grid, fountain, 'impassable');

  return {
    id: 'indoor-garden',
    name: 'Courtyard Garden',
    theme: 'indoor',
    subTheme: 'garden',
    description: 'A walled garden with hedge mazes and a central fountain. Beauty masks danger.',
    width: 16,
    height: 14,
    terrain: grid,
    startingZones: {
      players: [{ x: 1, y: 6 }, { x: 1, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 7 }],
      enemies: [{ x: 13, y: 6 }, { x: 13, y: 7 }, { x: 14, y: 6 }, { x: 14, y: 7 }],
    },
    features: [
      { name: 'Hedgerows', type: 'difficult-terrain', positions: hedges, description: 'Tall hedges — difficult terrain, partial concealment' },
      { name: 'Fountain', type: 'water', positions: fountain, description: 'Stone fountain — impassable' },
    ],
  };
}

// ─── Map Catalog ───────────────────────────────────────────────

export const ENCOUNTER_MAP_CATALOG: EncounterMapTemplate[] = [
  // Dungeon (5)
  createDungeonCorridor(),
  createThroneRoom(),
  createCrypt(),
  createDungeonCrossroads(),
  createCatacomb(),

  // Wilderness (7)
  createForestClearing(),
  createMountainPass(),
  createCaveEntrance(),
  createRiverCrossing(),
  createOpenField(),
  createSwamp(),
  createRuins(),

  // Urban (4)
  createCityStreet(),
  createTavernInterior(),
  createRooftops(),
  createDockyard(),

  // Indoor (5)
  createManorHall(),
  createLibrary(),
  createTemple(),
  createWizardTower(),
  createGarden(),

  // Special (4)
  createArena(),
  createShipDeck(),
  createBridge(),
  createLavaChasm(),

  // Utility (1)
  createBlankGrid(),

  // Imported from Foundry pipeline
  ...FOUNDRY_MAP_CATALOG,
].map(autoTagMap);

/** Get maps filtered by theme */
export function getMapsByTheme(theme: EncounterMapTemplate['theme']): EncounterMapTemplate[] {
  return ENCOUNTER_MAP_CATALOG.filter(m => m.theme === theme);
}

/** Get a specific map by ID */
export function getMapById(id: string): EncounterMapTemplate | undefined {
  return ENCOUNTER_MAP_CATALOG.find(m => m.id === id);
}

/** Get all available map themes */
export function getMapThemes(): EncounterMapTemplate['theme'][] {
  return [...new Set(ENCOUNTER_MAP_CATALOG.map(m => m.theme))];
}

/** Get maps that have a background image */
export function getMapsWithImages(): EncounterMapTemplate[] {
  return ENCOUNTER_MAP_CATALOG.filter(m => !!m.imageUrl);
}

/**
 * Pick a random map, preferring ones with images.
 * If theme is provided, filters to that theme first.
 * Falls back to any map if no image maps match.
 */
export function pickRandomMap(theme?: EncounterMapTemplate['theme']): EncounterMapTemplate {
  const withImages = getMapsWithImages();
  let pool = theme ? withImages.filter(m => m.theme === theme) : withImages;
  if (pool.length === 0) {
    // Fallback: any map matching theme, or any map at all
    pool = theme ? ENCOUNTER_MAP_CATALOG.filter(m => m.theme === theme) : ENCOUNTER_MAP_CATALOG;
  }
  if (pool.length === 0) pool = ENCOUNTER_MAP_CATALOG;
  return pool[Math.floor(Math.random() * pool.length)];
}
