/**
 * ContentGenerator — Exploration/downtime content: dungeons, travel encounters,
 * city districts, shop inventories, rumors, and personal quest hooks.
 *
 * Generates the "fabric" of the world — the content players interact with
 * between set-piece encounters and story beats.
 *
 * Design Principles:
 *   #7  RAG — pulls appropriate Golarion locations, creatures, items
 *   #8  Graceful Degradation — 15s timeout, template content
 *   #15 Tension-Driven — content tone matches current tension
 */
import type {
  GeneratorDependencies,
  DungeonLayout,
  DungeonRoom,
  TravelEncounterTable,
  TravelEntry,
  CityDistrict,
  PointOfInterest,
  DowntimeContent,
  GeneratedItem,
  Rumor,
} from './types';
import { TreasureGenerator } from './treasureGenerator';

// ─── System Prompts ─────────────────────────────────────────

const DUNGEON_SYSTEM_PROMPT = `You are the Dungeon Architect for a solo PF2e campaign.

Given a theme, party level, and room count, design a dungeon layout with vivid descriptions.

Rules:
1. Each room needs a name, description (2-3 sentences), and notable features.
2. Include hidden elements with Perception DCs scaled to party level.
3. Mark at least one room as boss room and one as entrance.
4. Connections between rooms should form a logical layout (not every room connects to every other).
5. Include variety: combat rooms, puzzle rooms, rest areas, treasure rooms.
6. Secret passages should be rare (1-2 per dungeon).

Respond with valid JSON.`;

const TRAVEL_SYSTEM_PROMPT = `You are the Travel Encounter Designer for a solo PF2e campaign.

Given a terrain type and party level, create a random encounter table for overland travel.

Rules:
1. Include 8-12 entries with probability weights (1-10).
2. Mix of: combat (30%), social (20%), environmental (20%), discovery (20%), nothing (10%).
3. Combat encounters should be level-appropriate (mostly trivial to moderate).
4. Environmental = weather, terrain hazards, skill challenges.
5. Discovery = ruins, landmarks, lore, hidden caches.
6. Social = travelers, merchants, refugees, patrol.

Respond with valid JSON.`;

const DOWNTIME_SYSTEM_PROMPT = `You are the Downtime Content Designer for a solo PF2e campaign.

Given a settlement type, party level, and active plot threads, generate downtime content.

Rules:
1. Shop inventory: 4-8 items at party level ±2, mostly consumables.
2. Available NPCs: 2-4 service providers (healer, crafter, sage, etc.).
3. Rumors: 3-5 rumors, mix of true and false, some related to active plot threads.
4. Personal quest hooks: 1-2 hooks tied to the character's backstory or current situation.

Respond with valid JSON.`;

const GENERATION_TIMEOUT_MS = 15_000;

export class ContentGenerator {
  private deps: GeneratorDependencies;
  private treasureGen: TreasureGenerator;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
    this.treasureGen = new TreasureGenerator(deps);
  }

  // ─── Dungeon Generation ─────────────────────────────────────

  /**
   * Generate a dungeon layout with rooms, connections, and hidden elements.
   */
  async generateDungeon(
    theme: string,
    partyLevel: number,
    roomCount: number = 6,
    name?: string,
  ): Promise<DungeonLayout> {
    try {
      const lore = await this.deps.knowledgeBase.query(`${theme} dungeon Golarion`, 3);
      const loreContext = lore.map(r => `[${r.title}] ${r.content.slice(0, 150)}`).join('\n');

      const prompt = `Design a dungeon:
- Name: ${name || '(suggest one)'}
- Theme: ${theme}
- Party Level: ${partyLevel}
- Room Count: ${roomCount}
- Perception DCs: Easy ${10 + partyLevel}, Standard ${15 + partyLevel}, Hard ${20 + partyLevel}

Lore context:
${loreContext || '(none)'}

JSON format.`;

      const result = await this.deps.llmService.complete({
        role: 'encounter',
        messages: [
          { role: 'system', content: DUNGEON_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: DUNGEON_SCHEMA,
        maxTokens: 2000,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'content-gen',
      });

      const parsed = JSON.parse(result.content);
      return this.normalizeDungeon(parsed, theme, partyLevel, roomCount, name);
    } catch {
      return this.fallbackDungeon(theme, partyLevel, roomCount, name);
    }
  }

  // ─── Travel Encounter Tables ──────────────────────────────

  /**
   * Generate a random encounter table for a terrain type.
   */
  async generateTravelTable(
    terrain: string,
    partyLevel: number,
  ): Promise<TravelEncounterTable> {
    try {
      const lore = await this.deps.knowledgeBase.query(`${terrain} travel encounter Golarion creature`, 3);
      const loreContext = lore.map(r => `[${r.title}] ${r.content.slice(0, 150)}`).join('\n');

      const prompt = `Create a travel encounter table for:
- Terrain: ${terrain}
- Party Level: ${partyLevel}
- 8-12 entries with probability weights (1-10)

Creature context:
${loreContext || '(none)'}

JSON format.`;

      const result = await this.deps.llmService.complete({
        role: 'encounter',
        messages: [
          { role: 'system', content: TRAVEL_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: TRAVEL_SCHEMA,
        maxTokens: 1200,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'content-gen',
      });

      const parsed = JSON.parse(result.content);
      return this.normalizeTravelTable(parsed, terrain);
    } catch {
      return this.fallbackTravelTable(terrain, partyLevel);
    }
  }

  /**
   * Roll on a travel encounter table, returning a single entry.
   */
  rollTravelEncounter(table: TravelEncounterTable): TravelEntry {
    const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of table.entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return table.entries[table.entries.length - 1];
  }

  // ─── City District Generation ─────────────────────────────

  /**
   * Generate city districts with points of interest.
   */
  async generateCityDistricts(
    cityName: string,
    partyLevel: number,
    districtCount: number = 3,
  ): Promise<CityDistrict[]> {
    try {
      const lore = await this.deps.knowledgeBase.query(`${cityName} city district Golarion`, 3);
      const loreContext = lore.map(r => `[${r.title}] ${r.content.slice(0, 200)}`).join('\n');

      const prompt = `Generate ${districtCount} city districts for ${cityName}:
- Party Level: ${partyLevel}
- Each district: name, description, atmosphere, 2-4 points of interest

Lore context:
${loreContext || '(none)'}

JSON format: array of districts.`;

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: 'You are a city designer for a PF2e campaign. Generate vivid, playable city districts. Respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        jsonSchema: CITY_SCHEMA,
        maxTokens: 1500,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'content-gen',
      });

      const parsed = JSON.parse(result.content);
      const districts: any[] = Array.isArray(parsed) ? parsed : parsed.districts || [];
      return districts.map(d => this.normalizeDistrict(d));
    } catch {
      return this.fallbackDistricts(cityName, districtCount);
    }
  }

  // ─── Downtime Content ─────────────────────────────────────

  /**
   * Generate downtime content for a settlement.
   */
  async generateDowntimeContent(
    settlementType: 'city' | 'town' | 'village',
    partyLevel: number,
    activeThreads: string[],
    highLoot: boolean,
  ): Promise<DowntimeContent> {
    try {
      const prompt = `Generate downtime content for a ${settlementType}:
- Party Level: ${partyLevel}
- Active Plot Threads: ${activeThreads.length > 0 ? activeThreads.join(', ') : '(none)'}
- High Loot: ${highLoot ? 'yes (generous shops)' : 'no (standard)'}

Generate: shop inventory, available NPCs/services, rumors (true/false), personal quest hooks.
JSON format.`;

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: DOWNTIME_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: DOWNTIME_SCHEMA,
        maxTokens: 1200,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'content-gen',
      });

      const parsed = JSON.parse(result.content);
      return this.normalizeDowntime(parsed, partyLevel, highLoot);
    } catch {
      return this.fallbackDowntime(settlementType, partyLevel, highLoot);
    }
  }

  // ─── Normalization helpers ────────────────────────────────

  private normalizeDungeon(
    raw: any, theme: string, partyLevel: number, roomCount: number, name?: string,
  ): DungeonLayout {
    const rooms: DungeonRoom[] = Array.isArray(raw.rooms)
      ? raw.rooms.map((r: any, i: number) => this.normalizeRoom(r, i, partyLevel))
      : this.fallbackRooms(theme, partyLevel, roomCount);

    // Ensure at least one entrance and one boss room
    if (!rooms.some(r => r.isEntrance)) rooms[0].isEntrance = true;
    if (!rooms.some(r => r.isBossRoom)) rooms[rooms.length - 1].isBossRoom = true;

    const connections: DungeonLayout['connections'] = Array.isArray(raw.connections)
      ? raw.connections.map((c: any) => ({
          from: typeof c.from === 'number' ? c.from : 0,
          to: typeof c.to === 'number' ? c.to : 1,
          type: c.type || 'passage',
        }))
      : this.generateLinearConnections(rooms.length);

    return {
      name: raw.name || name || `${theme} Dungeon`,
      theme,
      rooms,
      connections,
      totalRooms: rooms.length,
    };
  }

  private normalizeRoom(raw: any, index: number, partyLevel: number): DungeonRoom {
    return {
      id: raw.id ?? index,
      name: raw.name || `Room ${index + 1}`,
      description: raw.description || 'A dark chamber.',
      features: Array.isArray(raw.features) ? raw.features : [],
      hiddenElements: Array.isArray(raw.hiddenElements)
        ? raw.hiddenElements.map((h: any) => ({
            type: h.type || 'hidden object',
            perceptionDC: h.perceptionDC || (15 + partyLevel),
            description: h.description || 'Something hidden.',
          }))
        : [],
      creatures: Array.isArray(raw.creatures) ? raw.creatures : undefined,
      treasure: raw.treasure,
      isEntrance: raw.isEntrance || false,
      isBossRoom: raw.isBossRoom || false,
    };
  }

  private generateLinearConnections(count: number): DungeonLayout['connections'] {
    const connections: DungeonLayout['connections'] = [];
    for (let i = 0; i < count - 1; i++) {
      connections.push({ from: i, to: i + 1, type: i === count - 2 ? 'door' : 'passage' });
    }
    // Add one shortcut/secret for dungeons with 5+ rooms
    if (count >= 5) {
      connections.push({ from: 0, to: Math.floor(count / 2), type: 'secret' });
    }
    return connections;
  }

  private normalizeTravelTable(raw: any, terrain: string): TravelEncounterTable {
    const entries: TravelEntry[] = Array.isArray(raw.entries)
      ? raw.entries.map((e: any) => ({
          weight: typeof e.weight === 'number' ? Math.max(1, Math.min(10, e.weight)) : 5,
          type: e.type || 'nothing',
          description: e.description || 'Nothing eventful.',
          difficulty: e.difficulty,
        }))
      : [];

    return { terrain: raw.terrain || terrain, entries };
  }

  private normalizeDistrict(raw: any): CityDistrict {
    return {
      name: raw.name || 'District',
      description: raw.description || 'A city district.',
      atmosphere: raw.atmosphere || 'Busy.',
      pointsOfInterest: Array.isArray(raw.pointsOfInterest)
        ? raw.pointsOfInterest.map((p: any) => ({
            name: p.name || 'Location',
            type: p.type || 'other',
            description: p.description || 'A notable place.',
            npcName: p.npcName,
            services: Array.isArray(p.services) ? p.services : undefined,
          }))
        : [],
    };
  }

  private normalizeDowntime(raw: any, partyLevel: number, highLoot: boolean): DowntimeContent {
    return {
      shopInventory: Array.isArray(raw.shopInventory)
        ? raw.shopInventory.map((i: any) => this.normalizeShopItem(i, partyLevel))
        : [],
      availableNPCs: Array.isArray(raw.availableNPCs)
        ? raw.availableNPCs.map((n: any) => ({
            name: n.name || 'NPC',
            service: n.service || 'general',
            cost: n.cost,
          }))
        : [],
      rumors: Array.isArray(raw.rumors)
        ? raw.rumors.map((r: any) => ({
            text: r.text || 'You hear a rumor.',
            isTrue: typeof r.isTrue === 'boolean' ? r.isTrue : Math.random() > 0.4,
            relatedPlotThread: r.relatedPlotThread,
            source: r.source || 'local gossip',
          }))
        : [],
      personalQuestHooks: Array.isArray(raw.personalQuestHooks) ? raw.personalQuestHooks : [],
    };
  }

  private normalizeShopItem(raw: any, partyLevel: number): GeneratedItem {
    return {
      name: raw.name || 'Item',
      level: raw.level || partyLevel,
      type: raw.type || 'consumable',
      priceGp: raw.priceGp || 10,
      rarity: raw.rarity || 'common',
      description: raw.description || 'An item for sale.',
      traits: Array.isArray(raw.traits) ? raw.traits : [],
      fromBestiary: false,
    };
  }

  // ─── Fallbacks ────────────────────────────────────────────

  private fallbackDungeon(theme: string, partyLevel: number, roomCount: number, name?: string): DungeonLayout {
    return {
      name: name || `${theme.charAt(0).toUpperCase() + theme.slice(1)} Lair`,
      theme,
      rooms: this.fallbackRooms(theme, partyLevel, roomCount),
      connections: this.generateLinearConnections(roomCount),
      totalRooms: roomCount,
    };
  }

  private fallbackRooms(theme: string, partyLevel: number, count: number): DungeonRoom[] {
    const roomTemplates = [
      { name: 'Entrance Hall', desc: 'A broad chamber with crumbling pillars. The air smells of dust and age.', isEntrance: true },
      { name: 'Guard Room', desc: 'The remains of a guard station. Broken weapons litter the floor.', creatures: [`${theme} guard`] },
      { name: 'Storage Chamber', desc: 'Crates, barrels, and forgotten supplies line the walls.', treasure: 'minor' },
      { name: 'Ritual Room', desc: 'Strange symbols cover the walls. A dark altar sits at the center.' },
      { name: 'Trapped Corridor', desc: 'A narrow passage with suspicious flagstones.' },
      { name: 'Inner Sanctum', desc: 'The heart of the complex. Power radiates from every surface.', isBossRoom: true, creatures: [`${theme} leader`] },
      { name: 'Hidden Vault', desc: 'A concealed room behind a false wall.', treasure: 'valuable' },
      { name: 'Collapsed Section', desc: 'Part of the ceiling has given way. Rubble blocks the far end.' },
    ];

    const rooms: DungeonRoom[] = [];
    for (let i = 0; i < count; i++) {
      const template = roomTemplates[i % roomTemplates.length];
      rooms.push({
        id: i,
        name: template.name,
        description: template.desc,
        features: [],
        hiddenElements: i % 3 === 0 ? [{ type: 'trap', perceptionDC: 15 + partyLevel, description: 'A hidden pressure plate.' }] : [],
        creatures: template.creatures,
        treasure: template.treasure,
        isEntrance: template.isEntrance || false,
        isBossRoom: template.isBossRoom || false,
      });
    }
    return rooms;
  }

  private fallbackTravelTable(terrain: string, partyLevel: number): TravelEncounterTable {
    return {
      terrain,
      entries: [
        { weight: 3, type: 'combat', description: `A hostile creature native to ${terrain} blocks the path.`, difficulty: 'low' },
        { weight: 2, type: 'combat', description: 'Ambush by bandits or predators.', difficulty: 'moderate' },
        { weight: 2, type: 'social', description: 'A traveling merchant offers wares and news.' },
        { weight: 2, type: 'environmental', description: 'A natural hazard requires a skill check to navigate safely.' },
        { weight: 2, type: 'discovery', description: 'An old ruin or landmark worth investigating.' },
        { weight: 1, type: 'discovery', description: 'A hidden cache of supplies left by previous travelers.' },
        { weight: 3, type: 'nothing', description: 'The journey continues uneventfully. You make good time.' },
      ],
    };
  }

  private fallbackDistricts(cityName: string, count: number): CityDistrict[] {
    const templates: CityDistrict[] = [
      {
        name: 'Market Quarter',
        description: `The bustling commercial heart of ${cityName}.`,
        atmosphere: 'Noisy, fragrant, crowded with merchants and buyers.',
        pointsOfInterest: [
          { name: 'The Grand Bazaar', type: 'market', description: 'The largest open-air market in the district.' },
          { name: 'The Rusty Nail', type: 'tavern', description: 'A popular tavern for adventurers and merchants.', npcName: 'Barkeep Renn' },
        ],
      },
      {
        name: 'Temple District',
        description: 'A quieter area dominated by shrines and holy sites.',
        atmosphere: 'Solemn, incense-heavy, with occasional chanting.',
        pointsOfInterest: [
          { name: 'Healing House', type: 'temple', description: 'A temple offering healing services.', services: ['healing', 'remove-curse', 'restoration'] },
          { name: 'Scribe\'s Hall', type: 'guild', description: 'Scholars and sages available for consultation.', services: ['identify', 'lore'] },
        ],
      },
      {
        name: 'Dockside',
        description: 'The rough waterfront district where anything can be found for a price.',
        atmosphere: 'Salt-air, rough laughter, the creak of moored ships.',
        pointsOfInterest: [
          { name: 'Smuggler\'s Cove', type: 'shop', description: 'A discreet shop with unusual goods.', npcName: 'The Fence', services: ['black-market'] },
          { name: 'Harbor Master', type: 'other', description: 'Manages ship travel and knows all the rumors.', npcName: 'Captain Hale' },
        ],
      },
    ];
    return templates.slice(0, count);
  }

  private fallbackDowntime(
    settlementType: string,
    partyLevel: number,
    highLoot: boolean,
  ): DowntimeContent {
    const shopCount = settlementType === 'city' ? 6 : settlementType === 'town' ? 4 : 2;

    return {
      shopInventory: Array.from({ length: shopCount }, (_, i) => ({
        name: i < shopCount / 2 ? `Level ${partyLevel} Consumable` : `Level ${partyLevel} Item`,
        level: partyLevel,
        type: (i < shopCount / 2 ? 'consumable' : 'worn') as GeneratedItem['type'],
        priceGp: i < shopCount / 2 ? partyLevel * 5 : partyLevel * 20,
        rarity: 'common' as const,
        description: 'A useful item for sale.',
        traits: [],
        fromBestiary: false,
      })),
      availableNPCs: [
        { name: 'Local Healer', service: 'healing', cost: `${partyLevel * 5} gp` },
        { name: 'Traveling Merchant', service: 'buying/selling' },
      ],
      rumors: [
        { text: 'Strange lights have been seen in the hills to the north.', isTrue: true, source: 'farmer at the tavern' },
        { text: 'The old mine is said to contain untold riches.', isTrue: false, source: 'drunk at the bar' },
        { text: 'A reward has been posted for dealing with bandits on the east road.', isTrue: true, source: 'notice board' },
      ],
      personalQuestHooks: ['An old acquaintance has sent a letter requesting your aid.'],
    };
  }
}

// ─── JSON Schemas ───────────────────────────────────────────

const DUNGEON_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    rooms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          description: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          hiddenElements: { type: 'array', items: { type: 'object' } },
          creatures: { type: 'array', items: { type: 'string' } },
          treasure: { type: 'string' },
          isEntrance: { type: 'boolean' },
          isBossRoom: { type: 'boolean' },
        },
        required: ['name', 'description'],
      },
    },
    connections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'number' },
          to: { type: 'number' },
          type: { type: 'string' },
        },
      },
    },
  },
  required: ['rooms'],
};

const TRAVEL_SCHEMA = {
  type: 'object',
  properties: {
    terrain: { type: 'string' },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          weight: { type: 'number' },
          type: { type: 'string' },
          description: { type: 'string' },
          difficulty: { type: 'string' },
        },
        required: ['weight', 'type', 'description'],
      },
    },
  },
  required: ['entries'],
};

const CITY_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      atmosphere: { type: 'string' },
      pointsOfInterest: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            npcName: { type: 'string' },
            services: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};

const DOWNTIME_SCHEMA = {
  type: 'object',
  properties: {
    shopInventory: { type: 'array', items: { type: 'object' } },
    availableNPCs: { type: 'array', items: { type: 'object' } },
    rumors: { type: 'array', items: { type: 'object' } },
    personalQuestHooks: { type: 'array', items: { type: 'string' } },
  },
  required: ['shopInventory', 'rumors'],
};
