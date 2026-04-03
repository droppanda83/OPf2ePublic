/**
 * TreasureGenerator — Level-appropriate loot following PF2e wealth-by-level tables.
 *
 * Generates treasure parcels (permanent items, consumables, currency) that respect:
 *  - PF2e wealth-by-level economy
 *  - Solo player adjustments (÷4 party share)
 *  - Story-relevant items tied to active quests/themes
 *  - Consumables > permanent frequency
 *  - High-loot toggle from campaign preferences
 *
 * Design Principles:
 *   #7  RAG — pulls real PF2e items from knowledge base when available
 *   #8  Graceful Degradation — 10s timeout, then formulaic loot
 *   #11 No Fudging — treasure budget set by encounter difficulty, not adjusted
 */
import type {
  GeneratorDependencies,
  TreasureRequest,
  TreasureParcel,
  GeneratedItem,
} from './types';

// ─── PF2e Treasure Tables (wealth-by-level.md) ─────────────

/** Solo player treasure per encounter difficulty (gp value, already ÷4). */
const SOLO_TREASURE_PER_ENCOUNTER: Record<string, number[]> = {
  // Index = party level (1-20), value = gp budget for that difficulty
  trivial:  [0,2,4,6,10,15,25,35,50,70,100,140,200,300,450,700,1050,1600,2600,4400,6100],
  low:      [0,3,5,8,14,22,33,48,67,95,133,192,275,417,600,908,1367,2133,3467,5917,8167],
  moderate: [0,4,6,10,17,27,40,58,80,114,160,230,330,500,720,1090,1640,2560,4160,7100,9800],
  severe:   [0,5,9,15,26,41,61,88,121,173,242,345,495,750,1080,1636,2460,3840,6240,10650,14700],
  extreme:  [0,7,11,19,32,51,76,109,151,216,302,432,619,938,1350,2045,3075,4800,7800,13313,18375],
};

/** Item price ranges by level (gp). */
const ITEM_PRICE_RANGE: {min: number; max: number}[] = [
  {min:0,max:0},      // 0 (unused)
  {min:10,max:20},    // 1
  {min:25,max:35},    // 2
  {min:45,max:60},    // 3
  {min:75,max:100},   // 4
  {min:130,max:160},  // 5
  {min:200,max:250},  // 6
  {min:300,max:360},  // 7
  {min:415,max:500},  // 8
  {min:575,max:700},  // 9
  {min:820,max:1000}, // 10
  {min:1100,max:1400},// 11
  {min:1600,max:2000},// 12
  {min:2400,max:3000},// 13
  {min:3600,max:4500},// 14
  {min:5200,max:6500},// 15
  {min:8000,max:10000},// 16
  {min:12000,max:15000},//17
  {min:19000,max:24000},//18
  {min:31000,max:40000},//19
  {min:52000,max:70000},//20
];

/** Consumable price ranges by level (gp). */
const CONSUMABLE_PRICE_RANGE: {min: number; max: number}[] = [
  {min:0,max:0},
  {min:3,max:4},    // 1
  {min:5,max:7},    // 2
  {min:8,max:12},   // 3
  {min:15,max:20},  // 4
  {min:25,max:30},  // 5
  {min:40,max:50},  // 6
  {min:55,max:70},  // 7
  {min:75,max:100}, // 8
  {min:110,max:150},// 9
  {min:155,max:200},// 10
  {min:225,max:300},// 11
  {min:325,max:400},// 12
  {min:450,max:600},// 13
  {min:650,max:900},// 14
  {min:975,max:1300},//15
  {min:1400,max:1750},//16
  {min:2100,max:2500},//17
  {min:3000,max:4000},//18
  {min:5000,max:8000},//19
  {min:10000,max:14000},//20
];

/** Common consumable templates by level tier. */
const CONSUMABLE_TEMPLATES: { name: string; type: GeneratedItem['type']; minLevel: number; maxLevel: number }[] = [
  { name: 'Minor Healing Potion', type: 'potion', minLevel: 1, maxLevel: 3 },
  { name: 'Lesser Healing Potion', type: 'potion', minLevel: 1, maxLevel: 6 },
  { name: 'Lesser Antidote', type: 'potion', minLevel: 2, maxLevel: 6 },
  { name: 'Scroll (1st rank)', type: 'scroll', minLevel: 1, maxLevel: 4 },
  { name: 'Minor Talisman', type: 'talisman', minLevel: 1, maxLevel: 4 },
  { name: 'Moderate Healing Potion', type: 'potion', minLevel: 4, maxLevel: 10 },
  { name: 'Moderate Antidote', type: 'potion', minLevel: 6, maxLevel: 10 },
  { name: 'Scroll (2nd rank)', type: 'scroll', minLevel: 3, maxLevel: 8 },
  { name: 'Lesser Bomb', type: 'bomb', minLevel: 1, maxLevel: 6 },
  { name: 'Moderate Bomb', type: 'bomb', minLevel: 7, maxLevel: 12 },
  { name: 'Greater Healing Potion', type: 'potion', minLevel: 11, maxLevel: 16 },
  { name: 'Scroll (3rd rank)', type: 'scroll', minLevel: 5, maxLevel: 10 },
  { name: 'Scroll (4th rank)', type: 'scroll', minLevel: 7, maxLevel: 14 },
  { name: 'Greater Bomb', type: 'bomb', minLevel: 10, maxLevel: 16 },
  { name: 'Major Healing Potion', type: 'potion', minLevel: 17, maxLevel: 20 },
  { name: 'Scroll (5th rank)', type: 'scroll', minLevel: 9, maxLevel: 16 },
  { name: 'Scroll (6th rank)', type: 'scroll', minLevel: 11, maxLevel: 18 },
  { name: 'Major Bomb', type: 'bomb', minLevel: 15, maxLevel: 20 },
];

// ─── LLM System Prompt ─────────────────────────────────────

const TREASURE_SYSTEM_PROMPT = `You are the Treasure Designer for a solo PF2e campaign.

Given a budget, party level, context (combat loot, chest, shop, quest reward, hidden cache), and themes, generate thematic treasure.

Rules:
1. Permanent items should be level-appropriate (within ±1 of party level).
2. Consumables should be common and practical (healing, utility, scrolls).
3. Items should thematically match the encounter/location (undead lair → ghost touch, fire dungeon → fire resistance).
4. Avoid giving items the player already owns.
5. Currency should feel natural (coins, gems, trade goods).
6. Descriptions should be brief but evocative (1 sentence).
7. Rarity: mostly common, occasional uncommon, rare only for quest rewards/boss loot.

Respond with valid JSON.`;

const GENERATION_TIMEOUT_MS = 10_000;

export class TreasureGenerator {
  private deps: GeneratorDependencies;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /**
   * Generate a treasure parcel for a given encounter context.
   */
  async generate(request: TreasureRequest): Promise<TreasureParcel> {
    const budget = this.computeBudget(request);

    try {
      const ragItems = await this.queryRelevantItems(request);
      const prompt = this.buildPrompt(request, budget, ragItems);

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: TREASURE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: TREASURE_SCHEMA,
        maxTokens: 800,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'treasure-gen',
      });

      const parsed = JSON.parse(result.content);
      return this.normalizeParcel(parsed, budget, request);
    } catch {
      return this.buildFallback(request, budget);
    }
  }

  /**
   * Generate shop inventory for downtime (larger, more varied).
   */
  async generateShopInventory(
    partyLevel: number,
    shopType: 'general' | 'weapon' | 'armor' | 'magic' | 'alchemist' | 'scroll',
    highLoot: boolean,
  ): Promise<GeneratedItem[]> {
    // Shop inventory: items from partyLevel-2 to partyLevel+1
    const items: GeneratedItem[] = [];
    const minLvl = Math.max(1, partyLevel - 2);
    const maxLvl = Math.min(20, partyLevel + 1);

    // 4-8 items depending on shop type
    const count = shopType === 'general' ? 8 : 6;

    for (let i = 0; i < count; i++) {
      const level = minLvl + Math.floor(Math.random() * (maxLvl - minLvl + 1));
      const isConsumable = i >= Math.ceil(count * 0.4); // 60% permanent, 40% consumable
      items.push(this.generateFallbackItem(level, isConsumable, shopType));
    }

    // Apply high-loot modifier: add bonus item
    if (highLoot && items.length < 10) {
      items.push(this.generateFallbackItem(Math.min(20, partyLevel + 1), false, shopType));
    }

    return items;
  }

  // ─── Budget computation ─────────────────────────────────────

  private computeBudget(request: TreasureRequest): number {
    const level = Math.max(1, Math.min(20, request.partyLevel));
    const table = SOLO_TREASURE_PER_ENCOUNTER[request.encounterDifficulty] || SOLO_TREASURE_PER_ENCOUNTER.moderate;
    let budget = table[level] || 10;

    // Context multipliers
    if (request.context === 'quest-reward') budget *= 1.5;
    if (request.context === 'hidden-cache') budget *= 0.7;
    if (request.context === 'shop') budget *= 0; // shops don't give free loot

    // High-loot toggle
    if (request.highLoot) budget *= 1.25;

    return Math.round(budget);
  }

  // ─── RAG item query ─────────────────────────────────────────

  private async queryRelevantItems(request: TreasureRequest): Promise<string> {
    const themeQuery = (request.themes || []).join(' ') + ` level ${request.partyLevel} item`;
    const results = await this.deps.knowledgeBase.queryFiltered(
      themeQuery,
      { type: 'magic-item', minLevel: Math.max(1, request.partyLevel - 1), maxLevel: request.partyLevel + 1 },
      5,
    );
    return results.map(r => `[${r.title}] ${r.content.slice(0, 150)}`).join('\n');
  }

  private buildPrompt(request: TreasureRequest, budget: number, ragItems: string): string {
    const ownedStr = request.ownedItemNames?.length
      ? `\nPlayer already owns: ${request.ownedItemNames.join(', ')}`
      : '';

    return `Generate treasure for this context:
- Party Level: ${request.partyLevel}
- Budget: ${budget} gp total
- Context: ${request.context}
- Difficulty: ${request.encounterDifficulty}
${request.themes?.length ? `- Themes: ${request.themes.join(', ')}` : ''}
${ownedStr}

Split the budget roughly: 40% permanent items, 30% consumables, 30% currency.
Consumables should outnumber permanent items.

Known PF2e items matching themes:
${ragItems || '(none found)'}

JSON format.`;
  }

  // ─── Normalize ──────────────────────────────────────────────

  private normalizeParcel(raw: any, budget: number, request: TreasureRequest): TreasureParcel {
    const permanentItems = Array.isArray(raw.permanentItems)
      ? raw.permanentItems.map((i: any) => this.normalizeItem(i, false, request.partyLevel))
      : [];
    const consumables = Array.isArray(raw.consumables)
      ? raw.consumables.map((i: any) => this.normalizeItem(i, true, request.partyLevel))
      : [];

    const currency = raw.currency || {};
    const gold = typeof currency.gold === 'number' ? Math.max(0, currency.gold) : Math.round(budget * 0.3);
    const silver = typeof currency.silver === 'number' ? Math.max(0, currency.silver) : 0;
    const copper = typeof currency.copper === 'number' ? Math.max(0, currency.copper) : 0;

    const itemTotal = [...permanentItems, ...consumables].reduce((sum, i) => sum + (i.priceGp || 0), 0);

    return {
      permanentItems,
      consumables,
      currency: { gold, silver, copper },
      totalValueGp: Math.round(itemTotal + gold + silver / 10 + copper / 100),
      narrativeDescription: raw.narrativeDescription || 'You find some treasure.',
      isFallback: false,
    };
  }

  private normalizeItem(raw: any, isConsumable: boolean, partyLevel: number): GeneratedItem {
    const level = raw.level || partyLevel;
    const safeLvl = Math.max(1, Math.min(20, level));
    const priceTable = isConsumable ? CONSUMABLE_PRICE_RANGE : ITEM_PRICE_RANGE;
    const range = priceTable[safeLvl] || { min: 10, max: 20 };

    return {
      name: raw.name || (isConsumable ? 'Healing Potion' : 'Magic Item'),
      level: safeLvl,
      type: raw.type || (isConsumable ? 'consumable' : 'worn'),
      priceGp: typeof raw.priceGp === 'number' ? raw.priceGp : Math.round((range.min + range.max) / 2),
      rarity: raw.rarity || 'common',
      description: raw.description || 'A useful item.',
      traits: Array.isArray(raw.traits) ? raw.traits : [],
      fromBestiary: false,
    };
  }

  // ─── Fallback ───────────────────────────────────────────────

  private buildFallback(request: TreasureRequest, budget: number): TreasureParcel {
    if (budget <= 0) {
      return {
        permanentItems: [], consumables: [], currency: { gold: 0, silver: 0, copper: 0 },
        totalValueGp: 0, narrativeDescription: 'No treasure here.', isFallback: true,
      };
    }

    const permanentBudget = Math.round(budget * 0.4);
    const consumableBudget = Math.round(budget * 0.3);
    const currencyBudget = budget - permanentBudget - consumableBudget;

    const permanentItems: GeneratedItem[] = [];
    const consumables: GeneratedItem[] = [];

    // One permanent item if budget permits
    if (permanentBudget > 5) {
      const itemLevel = Math.max(1, Math.min(20, request.partyLevel));
      permanentItems.push(this.generateFallbackItem(itemLevel, false, 'general'));
    }

    // 1-2 consumables
    const consCount = consumableBudget > 10 ? 2 : 1;
    for (let i = 0; i < consCount; i++) {
      const template = CONSUMABLE_TEMPLATES.find(
        t => t.minLevel <= request.partyLevel && t.maxLevel >= request.partyLevel,
      );
      if (template) {
        const range = CONSUMABLE_PRICE_RANGE[Math.max(1, Math.min(20, request.partyLevel))];
        consumables.push({
          name: template.name,
          level: request.partyLevel,
          type: template.type,
          priceGp: range ? Math.round((range.min + range.max) / 2) : 5,
          rarity: 'common',
          description: `A ${template.name.toLowerCase()}.`,
          traits: [],
          fromBestiary: false,
        });
      }
    }

    return {
      permanentItems,
      consumables,
      currency: { gold: Math.max(1, currencyBudget), silver: 0, copper: 0 },
      totalValueGp: budget,
      narrativeDescription: 'You find some coins and useful supplies.',
      isFallback: true,
    };
  }

  private generateFallbackItem(
    level: number,
    isConsumable: boolean,
    shopType: string,
  ): GeneratedItem {
    const safeLvl = Math.max(1, Math.min(20, level));
    const table = isConsumable ? CONSUMABLE_PRICE_RANGE : ITEM_PRICE_RANGE;
    const range = table[safeLvl] || { min: 10, max: 20 };
    const price = Math.round(range.min + Math.random() * (range.max - range.min));

    if (isConsumable) {
      const template = CONSUMABLE_TEMPLATES.find(
        t => t.minLevel <= safeLvl && t.maxLevel >= safeLvl,
      );
      return {
        name: template?.name || `Level ${safeLvl} Consumable`,
        level: safeLvl,
        type: template?.type || 'consumable',
        priceGp: price,
        rarity: 'common',
        description: `A useful consumable item.`,
        traits: [],
        fromBestiary: false,
      };
    }

    // Permanent item names by shop type
    const names: Record<string, string[]> = {
      weapon: ['+1 Longsword', '+1 Striking Warhammer', 'Returning Throwing Knife', 'Flaming Scimitar', 'Ghost Touch Dagger'],
      armor: ['+1 Chain Mail', '+1 Resilient Leather', 'Armor of Speed', 'Fire-Resistant Plate'],
      magic: ['Ring of Protection', 'Cloak of Resistance', 'Boots of Elvenkind', 'Hat of Disguise'],
      alchemist: ['Elixir of Life', 'Smokestick', 'Thunderstone', 'Alchemist Fire'],
      scroll: ['Scroll of Heal', 'Scroll of Fireball', 'Scroll of Haste', 'Scroll of Fly'],
      general: ['Adventuring Gear', 'Magical Trinket', 'Enchanted Tool'],
    };
    const pool = names[shopType] || names.general;
    const name = pool[Math.floor(Math.random() * pool.length)];

    return {
      name: `${name} (Level ${safeLvl})`,
      level: safeLvl,
      type: shopType === 'weapon' ? 'weapon' : shopType === 'armor' ? 'armor' : 'worn',
      priceGp: price,
      rarity: safeLvl >= 10 ? 'uncommon' : 'common',
      description: `A level ${safeLvl} ${shopType} item.`,
      traits: [],
      fromBestiary: false,
    };
  }
}

// ─── JSON Schema ────────────────────────────────────────────

const TREASURE_SCHEMA = {
  type: 'object',
  properties: {
    permanentItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'number' },
          type: { type: 'string' },
          priceGp: { type: 'number' },
          rarity: { type: 'string' },
          description: { type: 'string' },
          traits: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'level'],
      },
    },
    consumables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'number' },
          type: { type: 'string' },
          priceGp: { type: 'number' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
    },
    currency: {
      type: 'object',
      properties: {
        gold: { type: 'number' },
        silver: { type: 'number' },
        copper: { type: 'number' },
      },
    },
    narrativeDescription: { type: 'string' },
  },
  required: ['permanentItems', 'consumables'],
};
