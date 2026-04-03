/**
 * Shared helper functions used across multiple route modules.
 * Extracted from index.ts during Audit Phase E.3.
 */

import {
  buildEncounter, Difficulty, DIFFICULTIES, ENCOUNTER_MAP_CATALOG,
  getMapsByTheme, getMapById, getMapThemes, pickRandomMap,
  getCreatureXP, XP_PER_LEVEL,
  generateMap, proceduralMapToTemplate,
  createDefaultAbilities, createDefaultProficiencies,
  findExplorationPath, getCreatureByName,
} from 'pf2e-shared';
import type { EncounterMapTemplate, Creature, GameState, GMSession, GMChatMessage } from 'pf2e-shared';
import type { TileType, MapGeneratorTheme } from 'pf2e-shared';
import { getTokenArtUrl } from './services/tokenArtService';

// ─── Spawn-position collision tracker ────────────────────────

const _spawnOccupied = new Set<string>();
export function resetSpawnTracker() { _spawnOccupied.clear(); }
export function markOccupied(x: number, y: number) { _spawnOccupied.add(`${x},${y}`); }
export function isOccupied(x: number, y: number) { return _spawnOccupied.has(`${x},${y}`); }

export function fallbackPosition(index: number, width: number, height: number, enemy: boolean): { x: number; y: number } {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const col = Math.floor(index / safeHeight);
  const row = index % safeHeight;
  let x = enemy
    ? Math.max(0, safeWidth - 1 - col)
    : Math.min(safeWidth - 1, col);
  let y = Math.min(safeHeight - 1, row);

  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts && isOccupied(x, y); attempt++) {
    const dx = ((attempt % 4) === 0 ? 1 : (attempt % 4) === 2 ? -1 : 0);
    const dy = ((attempt % 4) === 1 ? 1 : (attempt % 4) === 3 ? -1 : 0);
    x = Math.max(0, Math.min(safeWidth - 1, x + dx));
    y = Math.max(0, Math.min(safeHeight - 1, y + dy));
  }
  markOccupied(x, y);
  return { x, y };
}

// ─── Map application ─────────────────────────────────────────

export function applyMapTemplateToGame(gameState: GameState, mapTemplate: EncounterMapTemplate, tiles?: TileType[][], overlays?: unknown[], moveCostOverride?: (number | null)[][]) {
  // Determine ambient lighting based on map theme:
  // - Outdoor / open themes → bright (daylight / clear sky)
  // - Enclosed but lit themes → dim (torchlit, ambient light)
  // - Underground / unlit themes → dark
  const BRIGHT_THEMES = new Set(['wilderness', 'urban', 'bridge', 'caravan', 'ship', 'castle']);
  const DARK_THEMES = new Set(['cave', 'mine', 'sewers']);
  // All others (dungeon, indoor, tower, special) default to 'dim'
  let lightingLevel: 'bright' | 'dim' | 'dark' = 'dim';
  if (BRIGHT_THEMES.has(mapTemplate.theme)) lightingLevel = 'bright';
  else if (DARK_THEMES.has(mapTemplate.theme)) lightingLevel = 'dark';

  gameState.map = {
    width: mapTemplate.width,
    height: mapTemplate.height,
    terrain: mapTemplate.terrain,
    mapImageUrl: mapTemplate.imageUrl ? `/maps/${mapTemplate.imageUrl}` : undefined,
    mapTheme: mapTemplate.theme,
    mapSubTheme: mapTemplate.subTheme,
    tiles: tiles || undefined,
    overlays: overlays?.length ? overlays : undefined,
    moveCostOverride: moveCostOverride || undefined,
    procedural: !!tiles,
    lightingLevel,
  };

  resetSpawnTracker();

  const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
  const enemies = gameState.creatures.filter((c: Creature) => c.type !== 'player');

  players.forEach((player: Creature, idx: number) => {
    let pos = mapTemplate.startingZones.players[idx];
    if (!pos || isOccupied(pos.x, pos.y)) {
      pos = fallbackPosition(idx, mapTemplate.width, mapTemplate.height, false);
    } else {
      markOccupied(pos.x, pos.y);
    }
    player.positions = {
      x: Math.max(0, Math.min(mapTemplate.width - 1, pos.x)),
      y: Math.max(0, Math.min(mapTemplate.height - 1, pos.y)),
    };
    player._map = gameState.map;
  });

  enemies.forEach((enemy: Creature, idx: number) => {
    let pos = mapTemplate.startingZones.enemies[idx];
    if (!pos || isOccupied(pos.x, pos.y)) {
      pos = fallbackPosition(idx, mapTemplate.width, mapTemplate.height, true);
    } else {
      markOccupied(pos.x, pos.y);
    }
    enemy.positions = {
      x: Math.max(0, Math.min(mapTemplate.width - 1, pos.x)),
      y: Math.max(0, Math.min(mapTemplate.height - 1, pos.y)),
    };
    enemy._map = gameState.map;
  });
}

// ─── Procedural map generation ───────────────────────────────

export function generateAndApplyProceduralMap(
  gameState: GameState,
  theme: MapGeneratorTheme,
  width?: number,
  height?: number,
  options?: Record<string, unknown>,
): EncounterMapTemplate & { tiles: TileType[][] } {
  const seed = Date.now();
  const procMap = generateMap(theme, width ?? 30, height ?? 20, seed, options);
  const result = proceduralMapToTemplate(procMap);
  const template: EncounterMapTemplate = {
    id: result.id,
    name: result.name,
    theme: result.theme,
    subTheme: result.subTheme,
    description: result.description,
    width: result.width,
    height: result.height,
    terrain: result.terrain,
    startingZones: result.startingZones,
    features: result.features,
  };
  applyMapTemplateToGame(gameState, template, result.tiles, result.overlays, result.moveCostOverride);
  console.log(`🗺️ Generated procedural ${theme} map: "${result.name}" (${result.width}x${result.height})${result.overlays?.length ? ` with ${result.overlays.length} atlas overlays` : ''}`);
  return { ...template, tiles: result.tiles };
}

// ─── Theme inference ─────────────────────────────────────────

export function toneToMapTheme(tone?: string): MapGeneratorTheme {
  const map: Record<string, MapGeneratorTheme> = {
    'dungeon-crawl': 'dungeon',
    'horror': 'cave',
    'political': 'urban',
    'mystery': 'indoor',
    'heroic': 'wilderness',
    'gritty': 'cave',
  };
  return map[tone || ''] || 'dungeon';
}

export function inferMapThemeFromChat(session?: GMSession, fallbackTone?: string): { theme: MapGeneratorTheme; subTheme?: string; options?: Record<string, unknown> } {
  if (!session?.chatHistory || session.chatHistory.length === 0) {
    return { theme: toneToMapTheme(fallbackTone) };
  }

  const recentMessages = session.chatHistory
    .slice(-8)
    .map((m: GMChatMessage) => (m.content || '').toLowerCase())
    .join(' ');

  const themeScores: Record<MapGeneratorTheme, number> = {
    indoor: 0, dungeon: 0, cave: 0, wilderness: 0, urban: 0,
    ship: 0, tower: 0, bridge: 0, caravan: 0, sewers: 0, castle: 0, mine: 0,
  };

  const subThemeScores: Record<string, { theme: MapGeneratorTheme; subTheme: string; score: number; options?: Record<string, unknown> }> = {};

  const addSubScore = (keywords: string[], theme: MapGeneratorTheme, subTheme: string, opts?: Record<string, unknown>) => {
    const key = `${theme}:${subTheme}`;
    if (!subThemeScores[key]) subThemeScores[key] = { theme, subTheme, score: 0, options: opts };
    for (const w of keywords) {
      if (recentMessages.includes(w)) subThemeScores[key].score += 3;
    }
  };

  // Indoor sub-themes
  addSubScore(['tavern', 'inn', 'pub', 'bar', 'alehouse', 'taproom'], 'indoor', 'tavern', { type: 'tavern' });
  addSubScore(['library', 'study', 'archive', 'books', 'scrolls'], 'indoor', 'library', { type: 'library' });
  addSubScore(['temple', 'shrine', 'chapel', 'cathedral', 'church', 'altar'], 'indoor', 'temple', { type: 'temple' });
  addSubScore(['manor', 'mansion', 'estate', 'palace', 'villa'], 'indoor', 'manor', { type: 'manor' });
  addSubScore(['throne room', 'great hall', 'banquet', 'ballroom', 'court'], 'indoor', 'hall', { type: 'hall' });
  addSubScore(['arena', 'gladiator', 'fighting pit', 'training ground'], 'indoor', 'arena', { type: 'arena' });

  // Urban sub-themes
  addSubScore(['town square', 'plaza', 'piazza', 'village green', 'central square', 'open square'], 'urban', 'town-square', { subTheme: 'town-square' });
  addSubScore(['dock', 'port', 'harbor', 'wharf', 'pier', 'waterfront', 'seaside'], 'urban', 'docks', { subTheme: 'docks' });
  addSubScore(['market', 'bazaar', 'marketplace', 'merchant stall', 'vendor'], 'urban', 'market', { subTheme: 'market' });
  addSubScore(['city', 'street', 'alley', 'avenue', 'rooftop', 'courtyard'], 'urban', 'city-streets', { subTheme: 'city-streets' });

  // Wilderness sub-themes
  addSubScore(['clearing', 'glade', 'meadow', 'open field', 'open area'], 'wilderness', 'clearing', { subTheme: 'clearing', density: 'sparse' });
  addSubScore(['camp', 'campfire', 'campsite', 'bivouac', 'tent'], 'wilderness', 'camp', { subTheme: 'camp', density: 'sparse' });
  addSubScore(['ruin', 'crumbling', 'overgrown foundation', 'ancient structure'], 'wilderness', 'ruins', { subTheme: 'ruins' });
  addSubScore(['swamp', 'marsh', 'bog', 'wetland', 'mire'], 'wilderness', 'swamp', { subTheme: 'swamp', hasRiver: true });
  addSubScore(['desert', 'sand', 'dunes', 'oasis', 'arid'], 'wilderness', 'desert', { subTheme: 'desert', density: 'sparse' });
  addSubScore(['lake', 'lakeside', 'lakeshore', 'pond', 'waterside', 'shore'], 'wilderness', 'lakeside', { subTheme: 'lakeside', hasLake: true });
  addSubScore(['river', 'stream', 'creek', 'ford', 'riverbank'], 'wilderness', 'forest', { subTheme: 'forest', hasRiver: true });

  const indoorWords = [
    'tavern', 'inn', 'pub', 'bar', 'alehouse', 'taproom',
    'library', 'study', 'office', 'bedroom', 'kitchen', 'dining',
    'throne room', 'ballroom', 'manor', 'mansion', 'estate', 'palace',
    'temple', 'shrine', 'chapel', 'cathedral', 'church',
    'shop', 'store', 'market stall', 'warehouse', 'workshop',
    'guild hall', 'council', 'chamber', 'hall', 'room',
    'inside', 'interior', 'indoors', 'building',
  ];
  const dungeonWords = [
    'dungeon', 'crypt', 'tomb', 'catacomb', 'labyrinth', 'maze',
    'underground', 'beneath', 'below', 'subterranean', 'vault',
    'prison', 'cell', 'jail', 'oubliette',
    'sewer', 'tunnel', 'passage', 'corridor',
    'ancient ruins', 'forgotten', 'abandoned',
  ];
  const caveWords = [
    'cave', 'cavern', 'grotto', 'mine', 'mineshaft',
    'stalactite', 'stalagmite', 'underground lake',
    'lair', 'den', 'nest', 'burrow',
    'crystal', 'mushroom', 'fungus',
  ];
  const wildernessWords = [
    'forest', 'woods', 'grove', 'glade', 'clearing',
    'river', 'stream', 'waterfall', 'lake', 'pond',
    'mountain', 'hill', 'cliff', 'ravine', 'canyon',
    'road', 'path', 'trail', 'bridge',
    'field', 'meadow', 'plains', 'grassland', 'prairie',
    'swamp', 'marsh', 'bog', 'wetland',
    'desert', 'sand', 'dunes', 'oasis',
    'snow', 'tundra', 'glacier', 'frozen',
    'camp', 'campfire', 'campsite', 'wilderness',
    'outdoor', 'outside', 'open air',
  ];
  const urbanWords = [
    'city', 'town', 'village', 'street', 'alley', 'avenue',
    'market', 'marketplace', 'bazaar', 'square', 'plaza',
    'dock', 'port', 'harbor', 'wharf', 'pier',
    'gate', 'wall', 'tower', 'rampart', 'battlement',
    'rooftop', 'courtyard', 'garden',
    'noble district', 'slum', 'quarter',
  ];

  for (const w of indoorWords)     if (recentMessages.includes(w)) themeScores.indoor += 2;
  for (const w of dungeonWords)    if (recentMessages.includes(w)) themeScores.dungeon += 2;
  for (const w of caveWords)       if (recentMessages.includes(w)) themeScores.cave += 2;
  for (const w of wildernessWords) if (recentMessages.includes(w)) themeScores.wilderness += 2;
  for (const w of urbanWords)      if (recentMessages.includes(w)) themeScores.urban += 2;

  let bestTheme: MapGeneratorTheme = toneToMapTheme(fallbackTone);
  let bestScore = 0;
  for (const [theme, score] of Object.entries(themeScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme as MapGeneratorTheme;
    }
  }

  let bestSub: { subTheme: string; options?: Record<string, unknown> } | undefined;
  let bestSubScore = 0;
  for (const [, entry] of Object.entries(subThemeScores)) {
    if (entry.theme === bestTheme && entry.score > bestSubScore && entry.score >= 3) {
      bestSubScore = entry.score;
      bestSub = { subTheme: entry.subTheme, options: entry.options };
    }
  }

  console.log(`🧭 Chat context map inference: scores=${JSON.stringify(themeScores)}, chosen=${bestTheme}${bestSub ? `, subTheme=${bestSub.subTheme}` : ''}`);
  return { theme: bestTheme, subTheme: bestSub?.subTheme, options: bestSub?.options };
}

// ─── Difficulty & encounter helpers ──────────────────────────

export function normalizeDifficulty(d?: string): Difficulty {
  if (!d) return 'moderate';
  const map: Record<string, Difficulty> = {
    'easy': 'low', 'trivial': 'trivial', 'low': 'low',
    'moderate': 'moderate', 'normal': 'moderate',
    'hard': 'severe', 'severe': 'severe',
    'deadly': 'extreme', 'extreme': 'extreme',
  };
  return map[d.toLowerCase()] || 'moderate';
}

export function getCampaignEnemyTags(gmSession?: GMSession): string[] | undefined {
  if (!gmSession?.campaignPreferences) return undefined;
  const { tone, themes } = gmSession.campaignPreferences;
  const tags: string[] = [...(themes || [])];
  const toneTagMap: Record<string, string[]> = {
    'heroic':       ['dragon', 'demon', 'devil', 'fiend', 'giant', 'elemental'],
    'gritty':       ['humanoid', 'beast', 'animal', 'goblin', 'troll'],
    'political':    ['humanoid'],
    'dungeon-crawl':['undead', 'construct', 'ooze', 'aberration', 'skeleton', 'zombie', 'trap-haunt'],
    'horror':       ['undead', 'aberration', 'shadow', 'ghost', 'vampire', 'hag', 'spirit'],
    'mystery':      ['humanoid', 'fey', 'aberration', 'spirit'],
  };
  if (tone && toneTagMap[tone]) {
    for (const t of toneTagMap[tone]) {
      if (!tags.includes(t)) tags.push(t);
    }
  }
  return tags.length > 0 ? tags : undefined;
}

export function buildEncounterEnemies(gameState: GameState, difficulty: Difficulty, mapTemplate?: EncounterMapTemplate): Creature[] {
  const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
  const partySize = Math.max(1, players.length);
  const partyLevel = Math.max(1, Math.round(players.reduce((sum: number, c: Creature) => sum + (c.level || 1), 0) / partySize));
  const allowedTags = getCampaignEnemyTags(gameState.gmSession);
  const encounter = buildEncounter(difficulty, partyLevel, partySize, allowedTags);
  const width = mapTemplate?.width || gameState.map?.width || 20;
  const height = mapTemplate?.height || gameState.map?.height || 20;

  return encounter.creatures.map((creature: Creature, idx: number) => {
    const suggested = mapTemplate?.startingZones?.enemies?.[idx]
      || fallbackPosition(idx, width, height, true);

    const hp = creature.maxHealth || 20;
    return {
      ...creature,
      id: `enc-${Date.now()}-${idx}`,
      type: 'creature',
      maxHealth: hp,
      currentHealth: creature.currentHealth ?? hp,
      tempHp: creature.tempHp ?? 0,
      positions: {
        x: Math.max(0, Math.min(width - 1, suggested.x)),
        y: Math.max(0, Math.min(height - 1, suggested.y)),
      },
      initiative: 0,
      actionsRemaining: 3,
      attacksMadeThisTurn: 0,
      reactionUsed: false,
      flourishUsedThisTurn: false,
      shieldRaised: false,
      dead: false,
      dying: creature.dying || false,
      deathSaveFailures: creature.deathSaveFailures || 0,
      deathSaveSuccesses: creature.deathSaveSuccesses || 0,
      deathSaveMadeThisTurn: creature.deathSaveMadeThisTurn || false,
      wounded: creature.wounded || 0,
      bonuses: creature.bonuses || [],
      penalties: creature.penalties || [],
      conditions: creature.conditions || [],
      damageResistances: creature.damageResistances || [],
      damageImmunities: creature.damageImmunities || [],
      damageWeaknesses: creature.damageWeaknesses || [],
      skills: creature.skills || [],
      tokenImageUrl: creature.tokenImageUrl || getTokenArtUrl(creature.name || 'unknown', creature.tags || []),
      _map: gameState.map,
    } as Creature;
  });
}

// Re-export shared symbols that route modules commonly need
export {
  ENCOUNTER_MAP_CATALOG, DIFFICULTIES,
  getMapsByTheme, getMapById, getMapThemes, pickRandomMap,
  getCreatureXP, XP_PER_LEVEL,
  createDefaultAbilities, createDefaultProficiencies,
  findExplorationPath, getCreatureByName,
};
export type { EncounterMapTemplate, Creature, TileType, MapGeneratorTheme };
export { Difficulty, buildEncounter } from 'pf2e-shared';
