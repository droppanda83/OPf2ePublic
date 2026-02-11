/**
 * Spell definitions and utilities for PF2e Rebirth
 */

// Damage Type Union - PF2e Remaster Complete List
export type DamageType = 
  // Physical
  | 'bludgeoning' | 'piercing' | 'slashing' | 'bleed'
  // Energy
  | 'fire' | 'cold' | 'electricity' | 'sonic' | 'acid'
  // Alignment/Spirit (Remaster)
  | 'vitality' | 'void' | 'spirit'
  // Special
  | 'poison' | 'mental' | 'force';

// Heightening configuration for spells that scale
export interface SpellHeightening {
  type: 'interval' | 'fixed'; // Interval = +X per Y ranks, Fixed = specific rank bonuses
  interval?: number; // For interval type: heighten every X ranks (e.g., 2)
  damage?: string; // Damage increase per interval (e.g., '+1d4' or '+2d6')
  perInterval?: string; // Description of effect per interval
  fixedLevels?: Record<number, string>; // For fixed type: rank → effect description
}

export interface Spell {
  id: string;
  name: string;
  rank: number; // 0 = cantrip, 1-10 = spell rank (PF2e Remaster terminology)
  traditions: ('arcane' | 'divine' | 'occult' | 'primal')[]; // Which traditions can cast this spell
  cost: number; // Action cost (1, 2, 3)
  range: number; // In squares (5ft per square)
  description: string;
  icon: string;
  targetType: 'single' | 'aoe'; // Single target or area of effect
  aoeRadius?: number; // Radius in squares for AoE spells
  aoeShape?: 'burst' | 'emanation' | 'cone' | 'line'; // Shape of AoE (default: burst)
  saveDC?: number; // DC for saves (if applicable)
  saveType?: 'reflex' | 'fortitude' | 'will'; // Save type
  basicSave?: boolean; // True if this uses basic save rules (crit success = 0, success = half, fail = full, crit fail = double)
  damageType?: DamageType;
  damageFormula?: string; // e.g., "1d6+1" or "2d6" at base rank
  persistentDamageFormula?: string; // Formula for persistent damage on failure (e.g., "1d6" for lingering fire)
  persistentDamageChance?: 'always' | 'critical-failure' | 'failure'; // When persistent damage applies
  heightening?: SpellHeightening; // How the spell scales when cast at higher ranks
  focus?: boolean; // True if this is a focus spell
  sustained?: boolean; // True if this spell can/must be sustained
}

// Spell catalog
export const SPELL_CATALOG: Record<string, Spell> = {
  'magic-missile': {
    id: 'magic-missile',
    name: 'Force Barrage',
    rank: 1,
    traditions: ['arcane', 'occult'],
    cost: 1,
    range: 24, // 120 feet = 24 squares
    description: 'Fire shards of solidified magic that automatically hit. 1-3 actions for 1-3 shards.',
    icon: '✨',
    targetType: 'single',
    damageType: 'force',
    damageFormula: '1d4+1',
    heightening: {
      type: 'interval',
      interval: 2,
      damage: '+1 shard per action',
      perInterval: 'You fire one additional shard with each action you spend',
    },
  },
  'fireball': {
    id: 'fireball',
    name: 'Fireball',
    rank: 3,
    traditions: ['arcane', 'primal'],
    cost: 2,
    range: 8, // 500 feet = ~100 squares, but 8 is more reasonable for tactical grid
    description: 'Create a devastating explosion in a 20-foot burst',
    icon: '🔥',
    targetType: 'aoe',
    aoeRadius: 4, // 20-foot burst = 4 squares radius
    aoeShape: 'burst',
    saveType: 'reflex',
    basicSave: true,
    damageType: 'fire',
    damageFormula: '6d6', // Rank 3 base damage
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+2d6',
      perInterval: 'The damage increases by 2d6 for each rank above 3rd',
    },
  },
  'shield': {
    id: 'shield',
    name: 'Shield',
    rank: 0, // Cantrip
    traditions: ['arcane', 'divine', 'occult'],
    cost: 1,
    range: 0,
    description: 'Raise a magical shield of force (+1 circumstance bonus to AC, Hardness 5 for Shield Block)',
    icon: '🛡️',
    targetType: 'single',
    heightening: {
      type: 'interval',
      interval: 2,
      perInterval: 'The shield\'s Hardness increases by 5',
    },
  },
  'burning-hands': {
    id: 'burning-hands',
    name: 'Breathe Fire',
    rank: 1,
    traditions: ['arcane', 'primal'],
    cost: 2,
    range: 3, // 15-foot cone from self
    description: 'A gout of flame sprays from your mouth in a 15-foot cone',
    icon: '🔥',
    targetType: 'aoe',
    aoeRadius: 3, // Cone 15 feet
    aoeShape: 'cone',
    saveType: 'reflex',
    basicSave: true,
    damageType: 'fire',
    damageFormula: '2d6',
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+2d6',
      perInterval: 'The damage increases by 2d6 for each rank above 1st',
    },
  },
  // ========== RANK 1 SPELLS ==========
  'heal': {
    id: 'heal',
    name: 'Heal',
    rank: 1,
    traditions: ['divine', 'primal'],
    cost: 1, // Variable: 1-3 actions
    range: 6, // 30 feet for ranged (2 actions)
    description: 'Restore HP to a living creature (1 action = touch, 2 actions = ranged, 3 actions = 30ft emanation)',
    icon: '💚',
    targetType: 'single', // Changes to aoe with 3 actions
    damageType: 'vitality',
    damageFormula: '1d8', // Per rank
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+1d8',
      perInterval: 'The healing increases by 1d8 for each rank above 1st',
    },
  },
  // ========== CANTRIPS (RANK 0) ==========
  'produce-flame': {
    id: 'produce-flame',
    name: 'Ignition',
    rank: 0,
    traditions: ['arcane', 'primal'],
    cost: 2,
    range: 6, // 30 feet ranged (or melee touch for d6s)
    description: 'Snap your fingers and ignite a target with fire (spell attack, persistent fire on crit)',
    icon: '🔥',
    targetType: 'single',
    damageType: 'fire',
    damageFormula: '2d4',
    persistentDamageFormula: '1d4',
    persistentDamageChance: 'critical-failure', // Persistent fire on critical HIT (mapped as crit success for attacker)
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+1d4',
      perInterval: 'The initial damage increases by 1d4 and persistent fire damage on crit increases by 1d4',
    },
  },
  'electric-arc': {
    id: 'electric-arc',
    name: 'Electric Arc',
    rank: 0,
    traditions: ['arcane', 'primal'],
    cost: 2,
    range: 6, // 30 feet
    description: 'An arc of lightning leaps from one target to another (1-2 targets, Reflex basic save)',
    icon: '⚡',
    targetType: 'single', // Can target up to 2
    saveType: 'reflex',
    basicSave: true,
    damageType: 'electricity',
    damageFormula: '2d4',
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+1d4',
      perInterval: 'The damage increases by 1d4 for each rank',
    },
  },
  'telekinetic-projectile': {
    id: 'telekinetic-projectile',
    name: 'Telekinetic Projectile',
    rank: 0,
    traditions: ['arcane', 'occult'],
    cost: 2,
    range: 6, // 30 feet
    description: 'Hurl a loose object at a target with telekinesis (spell attack)',
    icon: '🪨',
    targetType: 'single',
    damageType: 'bludgeoning',
    damageFormula: '2d6',
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+1d6',
      perInterval: 'The damage increases by 1d6 for each rank',
    },
  },
  'daze': {
    id: 'daze',
    name: 'Daze',
    rank: 0,
    traditions: ['arcane', 'divine', 'occult'],
    cost: 2,
    range: 12, // 60 feet
    description: 'Push into the target\'s mind with a mental jolt (Will basic save, stunned 1 on crit fail)',
    icon: '😵',
    targetType: 'single',
    saveType: 'will',
    basicSave: true,
    damageType: 'mental',
    damageFormula: '1d6',
    heightening: {
      type: 'interval',
      interval: 2,
      damage: '+1d6',
      perInterval: 'The damage increases by 1d6 every 2 ranks',
    },
  },
  // ========== ADDITIONAL RANK 1 SPELLS ==========
  'fear': {
    id: 'fear',
    name: 'Fear',
    rank: 1,
    traditions: ['arcane', 'divine', 'occult', 'primal'],
    cost: 2,
    range: 6, // 30 feet
    description: 'Plant fear in the target (Will save → frightened 1/2/3)',
    icon: '😱',
    targetType: 'single',
    saveType: 'will',
    heightening: {
      type: 'fixed',
      fixedLevels: {
        3: 'You can target up to five creatures',
      },
    },
  },
  'grease': {
    id: 'grease',
    name: 'Grease',
    rank: 1,
    traditions: ['arcane', 'primal'],
    cost: 2,
    range: 6, // 30 feet
    description: 'Conjure grease on an area or object (Reflex save or fall prone). Duration 1 minute.',
    icon: '🛢️',
    targetType: 'aoe',
    aoeRadius: 2, // 4 contiguous 5-foot squares
    aoeShape: 'burst',
    saveType: 'reflex',
  },
  // ========== RANK 3 SPELLS ==========
  'haste': {
    id: 'haste',
    name: 'Haste',
    rank: 3,
    traditions: ['arcane', 'occult', 'primal'],
    cost: 2,
    range: 6, // 30 feet
    description: 'Empower target to act faster, granting quickened (extra action for Strike or Stride only). Duration 1 minute.',
    icon: '⚡',
    targetType: 'single',
    heightening: {
      type: 'fixed',
      fixedLevels: {
        7: 'You can target up to 6 creatures',
      },
    },
  },
  'slow': {
    id: 'slow',
    name: 'Slow',
    rank: 3,
    traditions: ['arcane', 'occult', 'primal'],
    cost: 2,
    range: 6, // 30 feet
    description: 'Dilate time around the target (Fort save: success=slowed 1 for 1 round, failure=slowed 1 for 1 min, crit fail=slowed 2)',
    icon: '🐌',
    targetType: 'single',
    saveType: 'fortitude',
    heightening: {
      type: 'fixed',
      fixedLevels: {
        6: 'You can target up to 10 creatures',
      },
    },
  },
  'lightning-bolt': {
    id: 'lightning-bolt',
    name: 'Lightning Bolt',
    rank: 3,
    traditions: ['arcane', 'primal'],
    cost: 2,
    range: 24, // 120 feet
    description: 'Unleash a 120-foot line of electricity (Reflex basic save)',
    icon: '⚡',
    targetType: 'aoe',
    aoeRadius: 24, // 120-foot line
    aoeShape: 'line',
    saveType: 'reflex',
    basicSave: true,
    damageType: 'electricity',
    damageFormula: '4d12',
    heightening: {
      type: 'interval',
      interval: 1,
      damage: '+1d12',
      perInterval: 'The damage increases by 1d12 for each rank above 3rd',
    },
  },
  'heroism': {
    id: 'heroism',
    name: 'Heroism',
    rank: 3,
    traditions: ['divine', 'occult'],
    cost: 2,
    range: 2, // Touch
    description: 'Grant +1 status bonus to attack rolls, Perception, saving throws, and skill checks. Duration 10 minutes.',
    icon: '🦸',
    targetType: 'single',
    heightening: {
      type: 'fixed',
      fixedLevels: {
        6: 'The status bonus increases to +2',
        9: 'The status bonus increases to +3',
      },
    },
  },
  'true-strike': {
    id: 'true-strike',
    name: 'Sure Strike',
    rank: 1,
    traditions: ['arcane', 'occult'],
    cost: 1,
    range: 0, // Self
    description: 'Roll your next attack twice and take the better result (fortune). Ignores circumstance penalties and concealment flat checks. Immune for 10 minutes after use.',
    icon: '🎯',
    targetType: 'single', // Self-target
  },
  'warp-step': {
    id: 'warp-step',
    name: 'Warp Step',
    rank: 0, // Psi cantrip (Psychic class / Psychic Dedication)
    traditions: ['occult'],
    cost: 2, // 2 actions (1 action when amped)
    range: 0, // Self
    description: 'Gain a +5-foot status bonus to your Speed until end of turn, then Stride twice. Unbound Step: +10ft instead. Amp: Cast as 1 action. Amp Heightened (4th): Can teleport instead (range = 2x Speed after bonus, teleportation trait).',
    icon: '✨',
    targetType: 'single', // Self-target
  },
};

export function getSpell(spellId: string): Spell | undefined {
  return SPELL_CATALOG[spellId];
}

/**
 * Look up a spell by its display name (case-insensitive).
 * Handles Pathbuilder names like "Sure Strike" → finds 'true-strike' entry.
 * Also strips suffixes like " (Archetype)" from Pathbuilder focus spell names.
 */
export function getSpellByName(displayName: string): Spell | undefined {
  const cleaned = displayName
    .replace(/\s*\(Archetype\)\s*$/i, '')
    .replace(/\s*\(Psychic\)\s*$/i, '')
    .trim()
    .toLowerCase();
  return Object.values(SPELL_CATALOG).find(
    spell => spell.name.toLowerCase() === cleaned
  );
}

/**
 * Convert a Pathbuilder spell display name to a SPELL_CATALOG id.
 * Returns the spell id if found, or a kebab-case fallback.
 * Examples:
 *   "Sure Strike" → "true-strike"
 *   "Warp Step (Archetype)" → "warp-step"
 *   "Fireball" → "fireball"
 */
export function resolveSpellId(displayName: string): string {
  const spell = getSpellByName(displayName);
  if (spell) return spell.id;
  // Fallback: convert display name to kebab-case id
  return displayName
    .replace(/\s*\(Archetype\)\s*$/i, '')
    .replace(/\s*\(Psychic\)\s*$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

export const rollDamageFormula = (formula: string): { results: number[]; total: number } => {
  // Parse simple formulas like "1d6+1" or "2d6"
  const match = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(formula);
  if (!match) {
    return { results: [], total: 0 };
  }

  const times = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;

  const results: number[] = [];
  for (let i = 0; i < times; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = results.reduce((a, b) => a + b, 0) + bonus;

  return { results, total };
};
