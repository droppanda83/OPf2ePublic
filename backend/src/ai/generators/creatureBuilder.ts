/**
 * CreatureBuilder — Custom creature design using PF2e Gamemastery Guide formulae.
 *
 * Builds mechanically valid creature stat blocks from a level + archetype.
 * Stats are drawn from the official benchmarks (creature-building-rules.md).
 * The LLM provides flavor (abilities, traits, description); the builder enforces math.
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — AI designs flavor, math is deterministic
 *   #7  RAG — pulls existing creatures for inspiration
 *   #8  Graceful Degradation — LLM adds flavor, pure math works without LLM
 *   #11 No Fudging — stat blocks set at build time, never adjusted mid-combat
 */
import type {
  GeneratorDependencies,
  CreatureBuildRequest,
  CreatureArchetype,
  CreatureStatProfile,
  GeneratedCreatureStats,
  GeneratedAttack,
  GeneratedAbility,
  StatTier,
} from './types';

// ─── PF2e Creature Building Tables (Gamemastery Guide) ──────
// Indexed by creature level (-1 to 24). Index 0 = level -1, index 1 = level 0, etc.

const LEVEL_OFFSET = 1; // add to level to get table index

function idx(level: number): number {
  return Math.max(0, Math.min(25, level + LEVEL_OFFSET));
}

/** Ability Modifiers: [extreme, high, moderate, low] */
const ABILITY_MODS: number[][] = [
  [3,2,1,0],   // -1
  [3,2,1,0],   // 0
  [5,4,3,1],   // 1
  [5,4,3,1],   // 2
  [5,4,3,2],   // 3
  [6,5,3,2],   // 4
  [7,6,4,2],   // 5
  [7,6,4,3],   // 6
  [8,7,5,3],   // 7
  [8,7,5,3],   // 8
  [9,8,5,4],   // 9
  [9,8,6,4],   // 10
  [10,9,6,4],  // 11
  [10,9,7,5],  // 12
  [11,10,7,5], // 13
  [11,10,8,5], // 14
  [12,11,8,6], // 15
  [13,12,9,6], // 16
  [13,12,9,6], // 17
  [14,13,10,7],// 18
  [14,13,10,7],// 19
  [15,14,11,8],// 20
  [16,15,11,8],// 21
  [16,15,12,8],// 22
  [17,16,12,9],// 23
  [18,17,13,9],// 24
];

/** AC: [extreme, high, moderate, low] */
const AC_TABLE: number[][] = [
  [18,15,14,12],[19,16,15,13],[19,16,15,14],[21,18,17,15],[22,19,18,16],
  [24,21,20,18],[25,22,21,19],[27,24,23,21],[28,25,24,22],[30,27,26,24],
  [31,28,27,25],[33,30,29,27],[34,31,30,28],[36,33,32,30],[37,34,33,31],
  [39,36,35,33],[40,37,36,34],[42,39,38,36],[43,40,39,37],[45,42,41,39],
  [46,43,42,40],[48,45,44,42],[49,46,45,43],[51,48,47,45],[52,49,48,46],
  [54,51,50,48],
];

/** HP: [high, moderate, low] */
const HP_TABLE: number[][] = [
  [9,8,7],[17,14,11],[26,20,16],[40,32,25],[54,42,34],
  [72,57,46],[84,67,54],[100,80,64],[116,93,74],[130,104,84],
  [145,116,93],[160,128,102],[176,141,113],[195,156,125],[214,171,137],
  [235,188,150],[256,205,164],[280,224,179],[305,244,195],[330,264,211],
  [355,284,227],[380,304,243],[405,324,259],[440,352,282],[475,380,304],
  [510,408,326],
];

/** Attack Bonus: [extreme, high, moderate, low] */
const ATTACK_TABLE: number[][] = [
  [10,8,6,4],[10,8,6,4],[11,9,7,5],[13,11,9,7],[14,12,10,8],
  [16,14,12,9],[17,15,13,11],[19,17,15,12],[20,18,16,13],[22,20,18,15],
  [23,21,19,16],[25,23,21,17],[27,24,22,19],[28,26,24,20],[29,27,25,21],
  [31,29,27,23],[32,30,28,24],[34,32,30,25],[35,33,31,27],[37,35,33,28],
  [38,36,34,29],[40,38,36,31],[41,39,37,32],[43,41,39,34],[44,42,40,35],
  [46,44,42,37],
];

/** Strike Damage (average): [extreme, high, moderate, low] */
const DAMAGE_TABLE: number[][] = [
  [4,3,2,2],[5,4,3,2],[8,6,5,4],[11,9,7,5],[14,11,9,6],
  [18,14,11,8],[20,16,13,9],[23,18,15,11],[26,21,17,12],[29,24,19,14],
  [32,26,21,15],[36,29,23,17],[39,31,25,18],[43,34,28,20],[46,37,30,22],
  [50,40,32,23],[53,43,34,25],[57,46,37,27],[60,48,39,28],[64,51,41,30],
  [68,54,44,32],[72,58,46,34],[76,61,49,35],[80,64,51,37],[84,67,54,39],
  [88,70,56,41],
];

/** Saving Throws: [extreme, high, moderate, low, terrible] */
const SAVE_TABLE: number[][] = [
  [9,8,5,2,0],[10,9,6,3,1],[11,10,7,4,2],[12,11,8,5,3],[14,12,9,6,4],
  [15,14,11,8,6],[17,15,12,9,7],[18,17,14,11,8],[20,18,15,12,10],[21,19,16,13,11],
  [23,21,18,15,12],[24,22,19,16,14],[26,24,21,18,15],[27,25,22,19,16],[29,26,23,20,18],
  [30,28,25,22,19],[32,29,26,23,20],[33,30,28,25,22],[35,32,29,26,23],[36,33,30,27,24],
  [38,35,32,29,26],[39,36,33,30,27],[41,38,35,32,28],[43,39,36,33,30],[44,41,38,35,31],
  [46,42,39,36,32],
];

/** Perception: [extreme, high, moderate, low, terrible] */
const PERCEPTION_TABLE: number[][] = [
  [9,8,5,2,0],[10,9,6,3,1],[11,10,7,4,2],[13,11,8,5,3],[14,12,9,6,4],
  [16,14,11,7,5],[17,15,12,9,7],[19,17,14,10,8],[20,18,15,12,10],[22,20,17,13,11],
  [23,21,18,15,12],[25,23,20,16,14],[27,24,21,18,15],[28,26,23,19,16],[29,27,24,21,18],
  [31,29,26,22,19],[32,30,27,24,21],[34,32,29,25,22],[35,33,30,27,24],[37,35,32,28,25],
  [38,36,33,30,27],[40,38,35,31,28],
  // levels 21-24 use the same progression
  [40,38,35,31,28],[40,38,35,31,28],[40,38,35,31,28],[40,38,35,31,28],
];

/** Skill Modifiers: [extreme, high, moderate, low] */
const SKILL_TABLE: number[][] = [
  [8,5,4,1],[9,6,5,1],[10,7,6,2],[11,8,7,2],[13,10,9,3],
  [15,12,10,4],[16,13,12,5],[18,15,13,6],[20,17,15,7],[21,18,16,8],
  [23,20,18,9],[25,22,19,10],[26,23,21,11],[28,25,22,12],[30,27,24,13],
  [31,28,25,14],[33,30,27,16],[35,32,28,17],[36,33,30,18],[38,35,31,19],
  [40,37,33,20],[41,38,34,22],
  [41,38,34,22],[41,38,34,22],[41,38,34,22],[41,38,34,22],
];

// ─── Archetype stat profiles ────────────────────────────────

const ARCHETYPE_PROFILES: Record<CreatureArchetype, CreatureStatProfile> = {
  brute:       { ac: 'moderate', hp: 'high',     attack: 'high',     damage: 'extreme',  fortitude: 'high',    reflex: 'low',      will: 'moderate',  perception: 'moderate' },
  skirmisher:  { ac: 'high',     hp: 'moderate',  attack: 'high',     damage: 'moderate', fortitude: 'moderate', reflex: 'high',     will: 'moderate',  perception: 'high' },
  sniper:      { ac: 'low',      hp: 'low',       attack: 'extreme',  damage: 'high',     fortitude: 'low',     reflex: 'high',     will: 'moderate',  perception: 'extreme' },
  soldier:     { ac: 'high',     hp: 'high',      attack: 'high',     damage: 'moderate', fortitude: 'high',    reflex: 'moderate', will: 'moderate',  perception: 'moderate' },
  spellcaster: { ac: 'low',      hp: 'low',       attack: 'low',      damage: 'low',      fortitude: 'low',     reflex: 'moderate', will: 'high',      perception: 'high' },
  tank:        { ac: 'extreme',  hp: 'high',      attack: 'moderate', damage: 'moderate', fortitude: 'extreme', reflex: 'low',      will: 'moderate',  perception: 'moderate' },
};

// ─── Tier → table index mapping ─────────────────────────────

function tierIndex4(tier: StatTier): number {
  switch (tier) {
    case 'extreme': return 0;
    case 'high': return 1;
    case 'moderate': return 2;
    case 'low': return 3;
    case 'terrible': return 3; // 4-column tables don't have terrible
  }
}

function tierIndex5(tier: StatTier): number {
  switch (tier) {
    case 'extreme': return 0;
    case 'high': return 1;
    case 'moderate': return 2;
    case 'low': return 3;
    case 'terrible': return 4;
  }
}

function hpTierIndex(tier: StatTier): number {
  // HP table only has high/moderate/low
  switch (tier) {
    case 'extreme': return 0; // treat extreme as high
    case 'high': return 0;
    case 'moderate': return 1;
    case 'low': return 2;
    case 'terrible': return 2;
  }
}

// ─── Speed defaults ─────────────────────────────────────────

const ARCHETYPE_SPEEDS: Record<CreatureArchetype, { speed: number; fly?: number }> = {
  brute: { speed: 25 },
  skirmisher: { speed: 35 },
  sniper: { speed: 25 },
  soldier: { speed: 25 },
  spellcaster: { speed: 25 },
  tank: { speed: 20 },
};

// ─── Special ability budget by level ────────────────────────

function abilityBudget(level: number): number {
  if (level <= 4) return 2;
  if (level <= 10) return 3;
  if (level <= 16) return 4;
  return 5;
}

// ─── Damage dice approximation ──────────────────────────────

function damageDiceString(avgDamage: number, level: number): string {
  // Approximate damage as NdM + bonus
  // For low levels use smaller dice, for higher levels bigger dice pools
  if (avgDamage <= 3) return '1d4+1';
  if (avgDamage <= 5) return '1d6+2';
  if (avgDamage <= 8) return '1d8+4';
  if (avgDamage <= 11) return '2d6+4';
  if (avgDamage <= 14) return '2d8+5';
  if (avgDamage <= 18) return '2d10+7';
  if (avgDamage <= 23) return '3d8+9';
  if (avgDamage <= 29) return '3d10+11';
  if (avgDamage <= 36) return '4d10+12';
  if (avgDamage <= 43) return '4d12+14';
  if (avgDamage <= 53) return '5d12+16';
  if (avgDamage <= 64) return '6d12+18';
  if (avgDamage <= 76) return '7d12+20';
  return '8d12+22';
}

// ─── LLM Flavor Prompt ─────────────────────────────────────

const CREATURE_FLAVOR_PROMPT = `You are a PF2e creature designer. Given a creature name, level, archetype, and traits, generate flavorful special abilities and attack names.

Rules:
1. Abilities should be thematic and match the creature's concept.
2. Each ability needs: name, actions (0=passive, 1-3=actions), description, optional frequency.
3. Attack names should be descriptive (e.g., "venomous bite" not just "jaws").
4. Keep ability descriptions to 1-2 sentences.
5. Damage types should match the creature theme (undead→negative, fire→fire, etc.).

Respond with valid JSON.`;

export class CreatureBuilder {
  private deps: GeneratorDependencies;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /**
   * Build a complete creature stat block.
   * Math is deterministic; LLM provides flavor (abilities, names).
   */
  async build(request: CreatureBuildRequest): Promise<GeneratedCreatureStats> {
    const profile = this.resolveProfile(request);
    const stats = this.computeStats(request.level, profile);

    // Try to get LLM flavor
    let abilities: GeneratedAbility[] = [];
    let attacks: GeneratedAttack[] = [];
    let damageType = 'slashing';

    try {
      const flavor = await this.generateFlavor(request, stats);
      abilities = flavor.abilities;
      attacks = flavor.attacks;
      damageType = flavor.damageType || 'slashing';
    } catch {
      // Fallback: generic abilities/attacks
      const fb = this.fallbackFlavor(request, stats);
      abilities = fb.abilities;
      attacks = fb.attacks;
      damageType = fb.damageType;
    }

    // If LLM didn't give us attacks, build from stats
    if (attacks.length === 0) {
      const fb = this.fallbackFlavor(request, stats);
      attacks = fb.attacks;
      damageType = fb.damageType;
    }

    // Compute ability score distribution
    const abilityScores = this.computeAbilityScores(request.level, request.archetype);

    // Resistance/weakness values (if traits suggest them)
    const { resistances, weaknesses, immunities } = this.computeDefenses(request);

    return {
      name: request.name,
      level: request.level,
      traits: request.traits || [],
      ac: stats.ac,
      hp: stats.hp,
      speed: ARCHETYPE_SPEEDS[request.archetype].speed,
      flySpeed: ARCHETYPE_SPEEDS[request.archetype].fly,
      abilities: abilityScores,
      fortitude: stats.fortitude,
      reflex: stats.reflex,
      will: stats.will,
      perception: stats.perception,
      skills: this.computeSkills(request.level, profile),
      attacks,
      specialAbilities: abilities,
      resistances: resistances.length ? resistances : undefined,
      weaknesses: weaknesses.length ? weaknesses : undefined,
      immunities: immunities.length ? immunities : undefined,
    };
  }

  // ─── Profile resolution ─────────────────────────────────────

  private resolveProfile(request: CreatureBuildRequest): CreatureStatProfile {
    const base = { ...ARCHETYPE_PROFILES[request.archetype] };
    if (request.statOverrides) {
      Object.assign(base, request.statOverrides);
    }
    return base;
  }

  // ─── Deterministic stat computation ─────────────────────────

  private computeStats(level: number, profile: CreatureStatProfile) {
    const i = idx(level);
    return {
      ac: AC_TABLE[i][tierIndex4(profile.ac)],
      hp: HP_TABLE[i][hpTierIndex(profile.hp)],
      attack: ATTACK_TABLE[i][tierIndex4(profile.attack)],
      damage: DAMAGE_TABLE[i][tierIndex4(profile.damage)],
      fortitude: SAVE_TABLE[i][tierIndex5(profile.fortitude)],
      reflex: SAVE_TABLE[i][tierIndex5(profile.reflex)],
      will: SAVE_TABLE[i][tierIndex5(profile.will)],
      perception: (PERCEPTION_TABLE[i] ?? PERCEPTION_TABLE[PERCEPTION_TABLE.length - 1])[tierIndex5(profile.perception)],
    };
  }

  private computeAbilityScores(level: number, archetype: CreatureArchetype) {
    const i = idx(level);
    const row = ABILITY_MODS[i];
    // Distribute based on archetype
    switch (archetype) {
      case 'brute':
        return { str: row[0], dex: row[3], con: row[1], int: row[3], wis: row[2], cha: row[3] };
      case 'skirmisher':
        return { str: row[2], dex: row[0], con: row[2], int: row[3], wis: row[1], cha: row[3] };
      case 'sniper':
        return { str: row[3], dex: row[0], con: row[3], int: row[2], wis: row[1], cha: row[3] };
      case 'soldier':
        return { str: row[1], dex: row[2], con: row[1], int: row[3], wis: row[2], cha: row[3] };
      case 'spellcaster':
        return { str: row[3], dex: row[2], con: row[3], int: row[0], wis: row[1], cha: row[2] };
      case 'tank':
        return { str: row[1], dex: row[3], con: row[0], int: row[3], wis: row[2], cha: row[3] };
    }
  }

  private computeSkills(level: number, profile: CreatureStatProfile) {
    const i = idx(level);
    const row = SKILL_TABLE[i] ?? SKILL_TABLE[SKILL_TABLE.length - 1];
    // Give 2-3 skills based on archetype
    const skills: { name: string; modifier: number }[] = [];
    skills.push({ name: 'Athletics', modifier: row[1] });   // high
    skills.push({ name: 'Stealth', modifier: row[2] });     // moderate
    if (profile.perception === 'extreme' || profile.perception === 'high') {
      skills.push({ name: 'Intimidation', modifier: row[1] });
    }
    return skills;
  }

  // ─── LLM flavor generation ─────────────────────────────────

  private async generateFlavor(
    request: CreatureBuildRequest,
    stats: ReturnType<CreatureBuilder['computeStats']>,
  ): Promise<{ abilities: GeneratedAbility[]; attacks: GeneratedAttack[]; damageType: string }> {
    // Pull related creatures from RAG for inspiration
    const ragResults = await this.deps.knowledgeBase.query(
      `${request.name} ${(request.traits || []).join(' ')} creature`,
      3,
    );
    const ragContext = ragResults.map(r => `[${r.title}] ${r.content.slice(0, 200)}`).join('\n');

    const budget = abilityBudget(request.level);
    const damageStr = damageDiceString(stats.damage, request.level);

    const prompt = `Design flavor for this creature:
- Name: ${request.name}
- Level: ${request.level}
- Archetype: ${request.archetype}
- Traits: ${(request.traits || []).join(', ') || 'none'}
${request.thematicNotes ? `- Theme Notes: ${request.thematicNotes}` : ''}
${request.abilities?.length ? `- Must include these abilities: ${request.abilities.join(', ')}` : ''}
- Attack bonus: +${stats.attack}, average damage: ${stats.damage} (dice: ${damageStr})
- Special ability budget: ${budget} abilities

Existing creatures for reference:
${ragContext || '(none)'}

Generate:
1. 1-2 attack entries (name, damage type, traits)
2. ${budget} special abilities
3. Primary damage type

JSON format.`;

    const result = await this.deps.llmService.complete({
      role: 'encounter',
      messages: [
        { role: 'system', content: CREATURE_FLAVOR_PROMPT },
        { role: 'user', content: prompt },
      ],
      jsonSchema: CREATURE_FLAVOR_SCHEMA,
      maxTokens: 1000,
      timeoutMs: 15_000,
      kvCacheHint: 'creature-build',
    });

    const parsed = JSON.parse(result.content);

    const attacks: GeneratedAttack[] = (parsed.attacks || []).map((a: any) => ({
      name: a.name || 'Strike',
      modifier: stats.attack,
      damage: `${damageDiceString(stats.damage, request.level)} ${a.damageType || 'slashing'}`,
      traits: Array.isArray(a.traits) ? a.traits : [],
    }));

    const abilities: GeneratedAbility[] = (parsed.abilities || []).map((a: any) => ({
      name: a.name || 'Special',
      actions: typeof a.actions === 'number' ? a.actions : 1,
      description: a.description || 'A special ability.',
      frequency: a.frequency,
    }));

    return {
      attacks,
      abilities: abilities.slice(0, budget),
      damageType: parsed.damageType || 'slashing',
    };
  }

  // ─── Fallback flavor ─────────────────────────────────────────

  private fallbackFlavor(
    request: CreatureBuildRequest,
    stats: ReturnType<CreatureBuilder['computeStats']>,
  ): { abilities: GeneratedAbility[]; attacks: GeneratedAttack[]; damageType: string } {
    const damageType = this.inferDamageType(request.traits || []);
    const damageStr = damageDiceString(stats.damage, request.level);

    const attacks: GeneratedAttack[] = [
      {
        name: request.archetype === 'sniper' ? 'ranged shot' : 'melee strike',
        modifier: stats.attack,
        damage: `${damageStr} ${damageType}`,
        traits: [],
      },
    ];

    const abilities: GeneratedAbility[] = [];
    if (request.archetype === 'brute') {
      abilities.push({ name: 'Knockback', actions: 1, description: 'On a successful Strike, the creature can push the target 5 feet.' });
    } else if (request.archetype === 'tank') {
      abilities.push({ name: 'Shield Block', actions: 0, description: 'The creature can use Shield Block as a reaction (hardness equal to half level).' });
    } else if (request.archetype === 'spellcaster') {
      abilities.push({ name: 'Innate Spellcasting', actions: 2, description: 'The creature can cast thematic spells at a rank equal to half its level.' });
    } else if (request.archetype === 'skirmisher') {
      abilities.push({ name: 'Nimble Dodge', actions: 0, description: 'The creature gains +2 circumstance bonus to AC against one attack per round.' });
    }

    return { attacks, abilities, damageType };
  }

  private inferDamageType(traits: string[]): string {
    const traitSet = new Set(traits.map(t => t.toLowerCase()));
    if (traitSet.has('undead')) return 'negative';
    if (traitSet.has('fire') || traitSet.has('elemental')) return 'fire';
    if (traitSet.has('cold') || traitSet.has('ice')) return 'cold';
    if (traitSet.has('electricity') || traitSet.has('air')) return 'electricity';
    if (traitSet.has('acid')) return 'acid';
    if (traitSet.has('fiend') || traitSet.has('demon') || traitSet.has('devil')) return 'evil';
    if (traitSet.has('celestial') || traitSet.has('angel')) return 'holy';
    if (traitSet.has('construct')) return 'bludgeoning';
    if (traitSet.has('ooze')) return 'acid';
    return 'slashing';
  }

  // ─── Defense computation ────────────────────────────────────

  private computeDefenses(request: CreatureBuildRequest): {
    resistances: { type: string; value: number }[];
    weaknesses: { type: string; value: number }[];
    immunities: string[];
  } {
    const traits = new Set((request.traits || []).map(t => t.toLowerCase()));
    const resValue = Math.max(2, 2 + Math.floor(request.level / 2));
    const weakValue = Math.max(5, 5 + Math.floor(request.level / 2));

    const resistances: { type: string; value: number }[] = [];
    const weaknesses: { type: string; value: number }[] = [];
    const immunities: string[] = [];

    if (traits.has('undead')) {
      immunities.push('death effects', 'disease', 'poison', 'unconscious');
      weaknesses.push({ type: 'vitality', value: weakValue });
    }
    if (traits.has('fire')) {
      immunities.push('fire');
      weaknesses.push({ type: 'cold', value: weakValue });
    }
    if (traits.has('cold') || traits.has('ice')) {
      immunities.push('cold');
      weaknesses.push({ type: 'fire', value: weakValue });
    }
    if (traits.has('construct')) {
      immunities.push('bleed', 'death effects', 'disease', 'fatigued', 'healing', 'poison', 'sickened', 'unconscious');
    }
    if (traits.has('fiend')) {
      resistances.push({ type: 'fire', value: resValue });
      weaknesses.push({ type: 'holy', value: weakValue });
    }
    if (traits.has('celestial')) {
      resistances.push({ type: 'holy', value: resValue });
      weaknesses.push({ type: 'unholy', value: weakValue });
    }

    return { resistances, weaknesses, immunities };
  }
}

// ─── JSON Schema for LLM flavor ────────────────────────────

const CREATURE_FLAVOR_SCHEMA = {
  type: 'object',
  properties: {
    attacks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          damageType: { type: 'string' },
          traits: { type: 'array', items: { type: 'string' } },
        },
        required: ['name'],
      },
    },
    abilities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          actions: { type: 'number' },
          description: { type: 'string' },
          frequency: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    },
    damageType: { type: 'string' },
  },
  required: ['attacks', 'abilities'],
};
