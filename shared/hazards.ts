// ═══════════════════════════════════════════════════════════
// shared/hazards.ts — PF2e Hazard Types & Catalog
// Phase 24: Environmental Hazards & Traps System
// ═══════════════════════════════════════════════════════════

import { DamageType } from './spells';

// ─── Hazard Interfaces ──────────────────────────────────

export interface DisableOption {
  skill: string;           // e.g., 'thievery', 'religion', 'arcana'
  dc: number;
  description?: string;    // e.g., 'Pick the lock mechanism'
}

export interface HazardDamageEffect {
  formula: string;        // e.g., '2d6+3'
  damageType: DamageType;
}

export interface HazardConditionEffect {
  name: string;            // Condition name (e.g., 'frightened', 'sickened')
  value?: number;          // Condition value (e.g., frightened 2)
  duration: number | 'permanent';
}

export interface HazardEffect {
  type: 'damage' | 'condition' | 'both' | 'special';
  saveDC?: number;
  saveType?: 'reflex' | 'fortitude' | 'will';
  damage?: HazardDamageEffect;
  /** Extra damage sources (e.g., splash, secondary) */
  additionalDamage?: HazardDamageEffect[];
  conditions?: HazardConditionEffect[];
  /** Degree-of-success overrides: what happens on crit success, success, failure, crit fail */
  degreeFx?: {
    criticalSuccess?: string;
    success?: string;
    failure?: string;
    criticalFailure?: string;
  };
  /** Special description for non-standard effects */
  specialDescription?: string;
  /** Area of effect in squares (0 = single target) */
  areaSquares?: number;
}

export interface HazardRoutineAction {
  name: string;
  description: string;
  effect: HazardEffect;
}

export interface HazardInstance {
  /** Runtime instance ID */
  instanceId: string;
  /** Reference to the catalog hazard ID */
  hazardId: string;
  /** Position on the map */
  position: { x: number; y: number };
  /** Width in squares (default 1) */
  sizeSquares?: number;
  /** Whether it has been detected */
  detected: boolean;
  /** Whether it has been disabled */
  disabled: boolean;
  /** Whether it has been destroyed (HP reduced to 0) */
  destroyed: boolean;
  /** Current HP for complex hazards */
  currentHp?: number;
  /** Whether the hazard has been triggered (for simple hazards that don't reset) */
  triggered: boolean;
  /** Creatures that have detected this hazard (by ID) */
  detectedBy: string[];
}

export interface Hazard {
  id: string;
  name: string;
  level: number;
  complexity: 'simple' | 'complex';
  type: 'trap' | 'environmental' | 'haunt';
  stealthDC: number;
  description: string;
  disable: DisableOption[];
  trigger: string;
  effect: HazardEffect;
  reset?: string;
  traits: string[];
  // Complex hazard fields
  initiative?: number;
  ac?: number;
  hp?: number;
  hardness?: number;
  fortSave?: number;
  refSave?: number;
  immunities?: string[];
  routineActions?: HazardRoutineAction[];
}

// ─── Result Types ───────────────────────────────────────

export interface HazardTriggerResult {
  hazardName: string;
  hazardId: string;
  triggered: boolean;
  message: string;
  targetResults: HazardTargetResult[];
}

export interface HazardTargetResult {
  creatureId: string;
  creatureName: string;
  saveRoll?: number;
  saveTotal?: number;
  saveDC?: number;
  degree?: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  damageTaken: number;
  damageType?: DamageType;
  conditionsApplied: string[];
  message: string;
}

export interface DetectionResult {
  hazardId: string;
  hazardName: string;
  detected: boolean;
  creatureId: string;
  perceptionRoll: number;
  perceptionTotal: number;
  stealthDC: number;
  message: string;
}

export interface DisableResult {
  hazardId: string;
  hazardName: string;
  disabled: boolean;
  creatureId: string;
  skillRoll: number;
  skillTotal: number;
  dc: number;
  degree: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  message: string;
  /** On critical failure, some hazards trigger */
  triggeredOnFailure?: boolean;
}

export interface HazardTurnResult {
  hazardId: string;
  hazardName: string;
  actions: {
    actionName: string;
    targetResults: HazardTargetResult[];
    message: string;
  }[];
}

// ─── Hazard Catalog (30+ PF2e Hazards, Levels 0–10) ────

export const HAZARD_CATALOG: Record<string, Hazard> = {
  // ─── TRAPS (Mechanical) ───────────────────────────────

  'spike-pit': {
    id: 'spike-pit',
    name: 'Spike Pit',
    level: 0,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 13,
    description: 'A thin cover conceals a 10-foot-deep pit with sharpened wooden spikes at the bottom.',
    disable: [{ skill: 'thievery', dc: 15, description: 'Jam the lid shut' }],
    trigger: 'A creature walks onto the thin cover.',
    effect: {
      type: 'damage',
      saveDC: 15,
      saveType: 'reflex',
      damage: { formula: '1d6', damageType: 'bludgeoning' },
      additionalDamage: [{ formula: '1d6', damageType: 'piercing' }],
      degreeFx: {
        criticalSuccess: 'The creature catches the edge and avoids falling.',
        success: 'The creature falls but grabs the edge, taking no damage. It can Climb out.',
        failure: 'The creature falls in and takes damage from the fall and spikes.',
        criticalFailure: 'The creature falls in and lands badly, taking double damage.',
      },
    },
    reset: 'The cover can be replaced manually in 1 minute.',
    traits: ['mechanical', 'trap'],
  },

  'crossbow-trap': {
    id: 'crossbow-trap',
    name: 'Crossbow Trap',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 17,
    description: 'A loaded crossbow is concealed behind a wall slit, connected to a tripwire trigger.',
    disable: [
      { skill: 'thievery', dc: 17, description: 'Disable the tripwire' },
    ],
    trigger: 'A creature crosses the tripwire.',
    effect: {
      type: 'damage',
      damage: { formula: '2d6+3', damageType: 'piercing' },
      degreeFx: {
        criticalSuccess: 'N/A — this is an attack roll, not a save.',
        success: 'The bolt strikes for full damage.',
        failure: 'The bolt misses.',
        criticalFailure: 'N/A',
      },
    },
    traits: ['mechanical', 'trap'],
  },

  'slamming-door': {
    id: 'slamming-door',
    name: 'Slamming Door',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 17,
    description: 'A heavy stone door slams shut when a pressure plate is stepped on, crushing anyone in the doorway.',
    disable: [
      { skill: 'thievery', dc: 17, description: 'Wedge the pressure plate' },
    ],
    trigger: 'A creature steps on the pressure plate in the doorway.',
    effect: {
      type: 'damage',
      saveDC: 17,
      saveType: 'reflex',
      damage: { formula: '2d6+3', damageType: 'bludgeoning' },
      degreeFx: {
        criticalSuccess: 'The creature leaps clear, taking no damage.',
        success: 'The creature takes half damage.',
        failure: 'The creature takes full damage.',
        criticalFailure: 'The creature takes full damage and is knocked prone.',
      },
    },
    traits: ['mechanical', 'trap'],
  },

  'poisoned-lock': {
    id: 'poisoned-lock',
    name: 'Poisoned Lock',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 17,
    description: 'A lock mechanism coated with a contact poison. A small needle pricks anyone who tries to pick it.',
    disable: [
      { skill: 'thievery', dc: 19, description: 'Carefully disarm the needle mechanism' },
    ],
    trigger: 'A creature tries to pick the lock without noticing the trap.',
    effect: {
      type: 'both',
      saveDC: 17,
      saveType: 'fortitude',
      damage: { formula: '1d4', damageType: 'piercing' },
      conditions: [{ name: 'sickened', value: 1, duration: 10 }],
      degreeFx: {
        criticalSuccess: 'The creature is unaffected by the poison.',
        success: 'The creature takes piercing damage but resists the poison.',
        failure: 'The creature takes damage and is sickened 1.',
        criticalFailure: 'The creature takes double damage and is sickened 2.',
      },
    },
    traits: ['mechanical', 'trap', 'poison'],
  },

  'falling-block': {
    id: 'falling-block',
    name: 'Falling Block',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 18,
    description: 'A large stone block is balanced above a doorway, rigged to fall when a wire is disturbed.',
    disable: [
      { skill: 'thievery', dc: 18, description: 'Cut the trip wire carefully' },
    ],
    trigger: 'A creature walks through the doorway.',
    effect: {
      type: 'damage',
      saveDC: 18,
      saveType: 'reflex',
      damage: { formula: '2d8+4', damageType: 'bludgeoning' },
      degreeFx: {
        criticalSuccess: 'The creature dodges entirely.',
        success: 'The creature takes half damage.',
        failure: 'The creature takes full damage.',
        criticalFailure: 'The creature takes full damage and is knocked prone.',
      },
    },
    traits: ['mechanical', 'trap'],
  },

  'hallway-trap': {
    id: 'hallway-trap',
    name: 'Hallway Trap',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 20,
    description: 'Concealed dart launchers line both walls of a narrow hallway, firing poison darts at intruders.',
    disable: [
      { skill: 'thievery', dc: 18, description: 'Disable the firing mechanism on one wall' },
    ],
    trigger: 'A creature walks through the hallway without disarming both sides.',
    effect: {
      type: 'both',
      saveDC: 18,
      saveType: 'reflex',
      damage: { formula: '2d6+2', damageType: 'piercing' },
      conditions: [{ name: 'sickened', value: 1, duration: 5 }],
      degreeFx: {
        criticalSuccess: 'The creature dodges all darts.',
        success: 'The creature takes half damage, no poison.',
        failure: 'The creature takes full damage and is sickened 1 from poison.',
        criticalFailure: 'The creature takes double damage and is sickened 2.',
      },
    },
    traits: ['mechanical', 'trap', 'poison'],
  },

  'spear-launcher': {
    id: 'spear-launcher',
    name: 'Spear Launcher',
    level: 2,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 20,
    description: 'Hidden spring-loaded spears thrust upward from concealed floor panels.',
    disable: [
      { skill: 'thievery', dc: 18, description: 'Jam the spring mechanism' },
    ],
    trigger: 'A creature steps on the floor panel.',
    effect: {
      type: 'damage',
      saveDC: 18,
      saveType: 'reflex',
      damage: { formula: '2d8+4', damageType: 'piercing' },
      degreeFx: {
        criticalSuccess: 'The creature avoids the spears entirely.',
        success: 'The creature takes half damage.',
        failure: 'The creature takes full damage.',
        criticalFailure: 'The creature takes full damage and persistent 1d4 bleed damage.',
      },
    },
    traits: ['mechanical', 'trap'],
  },

  'electric-floor': {
    id: 'electric-floor',
    name: 'Electric Floor',
    level: 3,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 20,
    description: 'Metal floor tiles connected to an arcane generator deliver a powerful shock.',
    disable: [
      { skill: 'thievery', dc: 20, description: 'Disconnect the arcane conduit' },
      { skill: 'arcana', dc: 20, description: 'Dispel the electrical enchantment' },
    ],
    trigger: 'A creature steps on the electrified tiles.',
    effect: {
      type: 'damage',
      saveDC: 20,
      saveType: 'reflex',
      damage: { formula: '2d10+6', damageType: 'electricity' },
      degreeFx: {
        criticalSuccess: 'The creature avoids the shock.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Double damage and stunned 1.',
      },
    },
    reset: 'The trap recharges after 1 round.',
    traits: ['magical', 'trap', 'electricity'],
  },

  'scythe-blades': {
    id: 'scythe-blades',
    name: 'Scythe Blades',
    level: 4,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 21,
    description: 'Hidden blades swing from the walls at waist height, slashing anything in the corridor.',
    disable: [
      { skill: 'thievery', dc: 23, description: 'Jam the blade mechanism' },
    ],
    trigger: 'A creature enters the trapped corridor section.',
    effect: {
      type: 'damage',
      saveDC: 21,
      saveType: 'reflex',
      damage: { formula: '3d8+6', damageType: 'slashing' },
      degreeFx: {
        criticalSuccess: 'The creature ducks under the blades.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Full damage and persistent 1d6 bleed.',
      },
    },
    reset: 'The blades retract and reset after 1 round.',
    traits: ['mechanical', 'trap'],
  },

  'fireball-rune': {
    id: 'fireball-rune',
    name: 'Fireball Rune',
    level: 5,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 22,
    description: 'An arcane rune inscribed on the floor erupts into a fireball when triggered.',
    disable: [
      { skill: 'arcana', dc: 22, description: 'Erase the rune' },
      { skill: 'thievery', dc: 24, description: 'Scratch the rune without triggering it' },
    ],
    trigger: 'A creature steps on or within 5 feet of the rune.',
    effect: {
      type: 'damage',
      saveDC: 22,
      saveType: 'reflex',
      damage: { formula: '3d10+8', damageType: 'fire' },
      areaSquares: 4,
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Double damage.',
      },
    },
    traits: ['magical', 'trap', 'fire'],
  },

  'teleportation-trap': {
    id: 'teleportation-trap',
    name: 'Teleportation Trap',
    level: 6,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 24,
    description: 'An arcane circle teleports creatures who step on it to a dangerous location elsewhere in the dungeon.',
    disable: [
      { skill: 'arcana', dc: 24, description: 'Disrupt the teleportation circle' },
    ],
    trigger: 'A creature steps into the circle.',
    effect: {
      type: 'special',
      saveDC: 24,
      saveType: 'will',
      specialDescription: 'On a failed save, the creature is teleported to a predetermined location. On a critical failure, the creature is also stunned 1.',
      degreeFx: {
        criticalSuccess: 'The creature resists the teleportation.',
        success: 'The creature resists but is disoriented (off-guard until end of next turn).',
        failure: 'The creature is teleported to a different area.',
        criticalFailure: 'The creature is teleported and stunned 1.',
      },
    },
    traits: ['magical', 'trap', 'teleportation'],
  },

  'disintegration-trap': {
    id: 'disintegration-trap',
    name: 'Disintegration Trap',
    level: 8,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 26,
    description: 'A powerful arcane trap fires a disintegration ray at the first creature to cross a threshold.',
    disable: [
      { skill: 'arcana', dc: 28, description: 'Unravel the enchantment' },
      { skill: 'thievery', dc: 28, description: 'Redirect the lens focusing the ray' },
    ],
    trigger: 'A creature crosses the warded threshold.',
    effect: {
      type: 'damage',
      saveDC: 26,
      saveType: 'fortitude',
      damage: { formula: '5d8+10', damageType: 'force' },
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Double damage. If this reduces the creature to 0 HP, it is disintegrated.',
      },
    },
    traits: ['magical', 'trap', 'force'],
  },

  // ─── ENVIRONMENTAL ────────────────────────────────────

  'collapsing-floor': {
    id: 'collapsing-floor',
    name: 'Collapsing Floor',
    level: 0,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 15,
    description: 'A section of rotting wooden floor gives way when weight is placed on it.',
    disable: [
      { skill: 'crafting', dc: 15, description: 'Shore up the weak boards' },
    ],
    trigger: 'A creature walks onto the weakened section.',
    effect: {
      type: 'damage',
      saveDC: 15,
      saveType: 'reflex',
      damage: { formula: '1d6+2', damageType: 'bludgeoning' },
      degreeFx: {
        criticalSuccess: 'The creature catches itself on the edge.',
        success: 'The creature grabs the edge, taking no damage but is hanging.',
        failure: 'The creature falls 10 feet, taking damage.',
        criticalFailure: 'The creature falls and lands prone, taking double damage.',
      },
    },
    traits: ['environmental'],
  },

  'vent-of-scalding-steam': {
    id: 'vent-of-scalding-steam',
    name: 'Vent of Scalding Steam',
    level: 2,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 18,
    description: 'A natural fissure periodically vents superheated steam from underground.',
    disable: [
      { skill: 'crafting', dc: 18, description: 'Block the vent with rocks' },
      { skill: 'nature', dc: 18, description: 'Predict the eruption timing' },
    ],
    trigger: 'A creature is adjacent to the vent when it erupts (every 1d4 rounds).',
    effect: {
      type: 'damage',
      saveDC: 18,
      saveType: 'reflex',
      damage: { formula: '2d6+4', damageType: 'fire' },
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Full damage, plus dazzled for 1 round from the steam.',
      },
    },
    reset: 'The vent erupts again every 1d4 rounds.',
    traits: ['environmental', 'fire'],
  },

  'brown-mold': {
    id: 'brown-mold',
    name: 'Brown Mold',
    level: 2,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 18,
    description: 'A patch of brown mold absorbs heat from nearby creatures, dealing cold damage. Fire makes it grow.',
    disable: [
      { skill: 'nature', dc: 18, description: 'Identify and avoid the mold' },
    ],
    trigger: 'A creature starts its turn within 5 feet of the mold.',
    effect: {
      type: 'damage',
      saveDC: 18,
      saveType: 'fortitude',
      damage: { formula: '2d6+2', damageType: 'cold' },
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Full damage and fatigued.',
      },
    },
    traits: ['environmental', 'cold'],
  },

  'quicksand': {
    id: 'quicksand',
    name: 'Quicksand',
    level: 3,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 20,
    description: 'A patch of loose sand conceals a deep pocket of saturated sediment that traps creatures.',
    disable: [
      { skill: 'survival', dc: 20, description: 'Mark the quicksand boundaries' },
      { skill: 'nature', dc: 20, description: 'Identify quicksand before stepping in' },
    ],
    trigger: 'A creature walks onto the quicksand.',
    effect: {
      type: 'condition',
      saveDC: 20,
      saveType: 'reflex',
      conditions: [{ name: 'grabbed', value: undefined, duration: 'permanent' }],
      degreeFx: {
        criticalSuccess: 'The creature notices and stops at the edge.',
        success: 'The creature sinks to its waist (slowed 1) but can try to escape.',
        failure: 'The creature is grabbed by the quicksand. Must Escape (Athletics DC 20).',
        criticalFailure: 'The creature is restrained. Must Escape (Athletics DC 22).',
      },
    },
    traits: ['environmental'],
  },

  'flooding-room': {
    id: 'flooding-room',
    name: 'Flooding Room',
    level: 3,
    complexity: 'complex',
    type: 'trap',
    stealthDC: 20,
    description: 'A sealed room fills with water when a mechanism is triggered. The doors lock automatically.',
    disable: [
      { skill: 'thievery', dc: 20, description: 'Unlock the drainage grate' },
      { skill: 'athletics', dc: 22, description: 'Force open the sealed door' },
    ],
    trigger: 'A creature removes the treasure from the pedestal.',
    effect: {
      type: 'special',
      specialDescription: 'The doors slam shut and water begins filling the room. Each round, the water level rises.',
    },
    initiative: 8,
    ac: 18,
    hp: 36,
    hardness: 8,
    immunities: ['critical-hits', 'sneak-attack', 'precision'],
    routineActions: [
      {
        name: 'Rising Water',
        description: 'The water level rises. Round 1: knee-deep (difficult terrain). Round 2: waist-deep (greater difficult terrain). Round 3+: creatures must swim (Athletics DC 20) or begin drowning.',
        effect: {
          type: 'both',
          saveDC: 20,
          saveType: 'fortitude',
          damage: { formula: '1d6', damageType: 'bludgeoning' },
          conditions: [{ name: 'slowed', value: 1, duration: 1 }],
          degreeFx: {
            criticalSuccess: 'No effect; the creature treads water easily.',
            success: 'Slowed 1 from the current.',
            failure: 'Takes damage from thrashing and is slowed 1.',
            criticalFailure: 'Takes double damage and begins drowning (suffocation rules).',
          },
        },
      },
    ],
    traits: ['mechanical', 'trap', 'complex', 'water'],
  },

  'poisonous-gas': {
    id: 'poisonous-gas',
    name: 'Poisonous Gas',
    level: 4,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 21,
    description: 'A pocket of toxic gas fills a chamber, visible as a faint green haze near the floor.',
    disable: [
      { skill: 'crafting', dc: 21, description: 'Create a draft to vent the gas' },
      { skill: 'survival', dc: 21, description: 'Identify the gas and find a safe path' },
    ],
    trigger: 'A creature breathes while in the gas cloud.',
    effect: {
      type: 'both',
      saveDC: 21,
      saveType: 'fortitude',
      damage: { formula: '2d6+4', damageType: 'poison' },
      conditions: [{ name: 'sickened', value: 1, duration: 5 }],
      degreeFx: {
        criticalSuccess: 'No effect.',
        success: 'Half damage, no sickened.',
        failure: 'Full damage and sickened 1.',
        criticalFailure: 'Double damage and sickened 2.',
      },
    },
    traits: ['environmental', 'poison', 'inhaled'],
  },

  'avalanche': {
    id: 'avalanche',
    name: 'Avalanche',
    level: 6,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 24,
    description: 'An unstable snow mass threatens to cascade down a mountain slope, burying everything below.',
    disable: [
      { skill: 'nature', dc: 24, description: 'Identify the avalanche risk and find safe ground' },
    ],
    trigger: 'A loud noise or impact (spell, large creature, etc.) near the unstable snow.',
    effect: {
      type: 'both',
      saveDC: 24,
      saveType: 'reflex',
      damage: { formula: '4d8+8', damageType: 'bludgeoning' },
      conditions: [{ name: 'grabbed', value: undefined, duration: 'permanent' }],
      areaSquares: 16,
      degreeFx: {
        criticalSuccess: 'No damage; the creature finds shelter.',
        success: 'Half damage, not buried.',
        failure: 'Full damage and buried (grabbed, must Escape DC 24).',
        criticalFailure: 'Double damage, buried, and begins suffocating.',
      },
    },
    traits: ['environmental'],
  },

  'lava-flow': {
    id: 'lava-flow',
    name: 'Lava Flow',
    level: 10,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 0,
    description: 'A river of molten rock. Extremely obvious, but deadly to anything that touches it.',
    disable: [],
    trigger: 'A creature enters or starts its turn in contact with lava.',
    effect: {
      type: 'damage',
      damage: { formula: '5d12+14', damageType: 'fire' },
      degreeFx: {
        criticalSuccess: 'N/A — no save, automatic damage.',
        success: 'N/A',
        failure: 'N/A',
        criticalFailure: 'N/A',
      },
    },
    traits: ['environmental', 'fire'],
  },

  // ─── HAUNTS ───────────────────────────────────────────

  'phantom-bells': {
    id: 'phantom-bells',
    name: 'Phantom Bells',
    level: 1,
    complexity: 'simple',
    type: 'haunt',
    stealthDC: 17,
    description: 'The ghostly sound of tolling bells fills the area, disorienting the living.',
    disable: [
      { skill: 'religion', dc: 17, description: 'Perform a brief prayer to calm the spirits' },
      { skill: 'occultism', dc: 17, description: 'Identify and suppress the spectral resonance' },
    ],
    trigger: 'A living creature enters the haunted area.',
    effect: {
      type: 'both',
      saveDC: 17,
      saveType: 'will',
      damage: { formula: '1d6+2', damageType: 'mental' },
      conditions: [{ name: 'frightened', value: 1, duration: 3 }],
      degreeFx: {
        criticalSuccess: 'The creature is unaffected.',
        success: 'Half mental damage, no frightened.',
        failure: 'Full damage and frightened 1.',
        criticalFailure: 'Double damage and frightened 2.',
      },
    },
    reset: 'The haunt re-manifests after 1 hour.',
    traits: ['haunt', 'mental'],
  },

  'bleeding-walls': {
    id: 'bleeding-walls',
    name: 'Bleeding Walls',
    level: 2,
    complexity: 'simple',
    type: 'haunt',
    stealthDC: 18,
    description: 'The walls of the room begin seeping blood, and a palpable aura of dread fills the space.',
    disable: [
      { skill: 'religion', dc: 18, description: 'Bless the room to cleanse the spiritual residue' },
    ],
    trigger: 'A living creature spends more than 1 round in the room.',
    effect: {
      type: 'both',
      saveDC: 18,
      saveType: 'will',
      damage: { formula: '2d6', damageType: 'void' },
      conditions: [{ name: 'frightened', value: 1, duration: 5 }],
      degreeFx: {
        criticalSuccess: 'No effect.',
        success: 'Half damage, no frightened.',
        failure: 'Full damage and frightened 1.',
        criticalFailure: 'Full damage, frightened 2, and fleeing for 1 round.',
      },
    },
    reset: 'The haunt resets after 24 hours.',
    traits: ['haunt', 'void', 'mental', 'fear'],
  },

  'ghostly-choir': {
    id: 'ghostly-choir',
    name: 'Ghostly Choir',
    level: 3,
    complexity: 'simple',
    type: 'haunt',
    stealthDC: 20,
    description: 'Spectral voices rise in a mournful chorus, filling the area with soul-rending sound.',
    disable: [
      { skill: 'religion', dc: 20, description: 'Recite a hymn of rest to quiet the spirits' },
      { skill: 'performance', dc: 20, description: 'Harmonize with the choir to pacify them' },
    ],
    trigger: 'A living creature makes noise in the area.',
    effect: {
      type: 'both',
      saveDC: 20,
      saveType: 'will',
      damage: { formula: '2d8+4', damageType: 'sonic' },
      conditions: [{ name: 'stunned', value: 1, duration: 1 }],
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage, no stunned.',
        failure: 'Full damage and stunned 1.',
        criticalFailure: 'Double damage and stunned 2.',
      },
    },
    reset: 'The haunt resets after 1 hour.',
    traits: ['haunt', 'sonic', 'auditory'],
  },

  'spectral-hands': {
    id: 'spectral-hands',
    name: 'Spectral Hands',
    level: 4,
    complexity: 'simple',
    type: 'haunt',
    stealthDC: 21,
    description: 'Ghostly hands reach from surfaces to grab at the living, draining their vitality.',
    disable: [
      { skill: 'religion', dc: 23, description: 'Channel vitality to repel the spirits' },
      { skill: 'occultism', dc: 21, description: 'Disrupt the spiritual anchor binding the hands' },
    ],
    trigger: 'A living creature passes through the haunted area.',
    effect: {
      type: 'both',
      saveDC: 21,
      saveType: 'fortitude',
      damage: { formula: '2d8+6', damageType: 'void' },
      conditions: [{ name: 'drained', value: 1, duration: 'permanent' }],
      degreeFx: {
        criticalSuccess: 'The creature is unaffected.',
        success: 'Half damage, no drained.',
        failure: 'Full damage and drained 1.',
        criticalFailure: 'Double damage and drained 2.',
      },
    },
    reset: 'The haunt resets at dusk.',
    traits: ['haunt', 'void'],
  },

  'poltergeist-attack': {
    id: 'poltergeist-attack',
    name: 'Poltergeist Attack',
    level: 5,
    complexity: 'simple',
    type: 'haunt',
    stealthDC: 22,
    description: 'A malevolent spirit hurls objects around the room at living creatures.',
    disable: [
      { skill: 'religion', dc: 22, description: 'Banish the poltergeist with prayers' },
      { skill: 'occultism', dc: 24, description: 'Command the spirit to cease' },
    ],
    trigger: 'A living creature disturbs objects in the haunted room.',
    effect: {
      type: 'damage',
      saveDC: 22,
      saveType: 'reflex',
      damage: { formula: '3d8+8', damageType: 'bludgeoning' },
      areaSquares: 4,
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Double damage and knocked prone.',
      },
    },
    reset: 'The haunt resets after 1 hour.',
    traits: ['haunt'],
  },

  // ─── COMPLEX HAZARDS ──────────────────────────────────

  'blade-barrier-hall': {
    id: 'blade-barrier-hall',
    name: 'Blade Barrier Hall',
    level: 4,
    complexity: 'complex',
    type: 'trap',
    stealthDC: 23,
    description: 'Spinning blades emerge from hidden slots in the walls and floor of a 30-foot hallway, creating a deadly gauntlet.',
    disable: [
      { skill: 'thievery', dc: 23, description: 'Disable one set of blades (3 sets total)' },
    ],
    trigger: 'A creature enters the hallway.',
    effect: {
      type: 'damage',
      saveDC: 21,
      saveType: 'reflex',
      damage: { formula: '2d8+4', damageType: 'slashing' },
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Full damage and persistent 1d6 bleed.',
      },
    },
    initiative: 10,
    ac: 20,
    hp: 44,
    hardness: 9,
    immunities: ['critical-hits', 'precision'],
    routineActions: [
      {
        name: 'Spinning Blades',
        description: 'The blades slash at every creature in the hallway.',
        effect: {
          type: 'damage',
          saveDC: 21,
          saveType: 'reflex',
          damage: { formula: '2d6+4', damageType: 'slashing' },
          degreeFx: {
            criticalSuccess: 'No damage.',
            success: 'Half damage.',
            failure: 'Full damage.',
            criticalFailure: 'Full damage and persistent 1d4 bleed.',
          },
        },
      },
    ],
    traits: ['mechanical', 'trap', 'complex'],
  },

  'drowning-pit': {
    id: 'drowning-pit',
    name: 'Drowning Pit',
    level: 5,
    complexity: 'complex',
    type: 'trap',
    stealthDC: 24,
    description: 'A pit trap with a grated cover drops victims into a water-filled chamber that slowly fills completely.',
    disable: [
      { skill: 'thievery', dc: 24, description: 'Jam the grate mechanism' },
      { skill: 'athletics', dc: 26, description: 'Force the grate open from below' },
    ],
    trigger: 'A creature steps on the grate.',
    effect: {
      type: 'both',
      saveDC: 22,
      saveType: 'reflex',
      damage: { formula: '2d8+5', damageType: 'bludgeoning' },
      conditions: [{ name: 'grabbed', value: undefined, duration: 'permanent' }],
      degreeFx: {
        criticalSuccess: 'The creature catches the edge.',
        success: 'The creature falls but catches the grate, dangling above the water.',
        failure: 'The creature falls into the water below.',
        criticalFailure: 'The creature falls and is dazed, beginning to drown immediately.',
      },
    },
    initiative: 6,
    ac: 21,
    hp: 52,
    hardness: 10,
    immunities: ['critical-hits', 'precision'],
    routineActions: [
      {
        name: 'Rising Water',
        description: 'Water fills 2 feet per round. Creatures fully submerged must hold breath or begin drowning.',
        effect: {
          type: 'both',
          saveDC: 22,
          saveType: 'fortitude',
          damage: { formula: '1d8+3', damageType: 'bludgeoning' },
          conditions: [{ name: 'sickened', value: 1, duration: 1 }],
        },
      },
    ],
    traits: ['mechanical', 'trap', 'complex', 'water'],
  },

  'fire-jet-hallway': {
    id: 'fire-jet-hallway',
    name: 'Fire Jet Hallway',
    level: 6,
    complexity: 'complex',
    type: 'trap',
    stealthDC: 24,
    description: 'Jets of flame burst from hidden nozzles in alternating patterns down a corridor.',
    disable: [
      { skill: 'thievery', dc: 26, description: 'Disable one nozzle bank (2 banks total)' },
      { skill: 'arcana', dc: 24, description: 'Suppress the elemental fuel source' },
    ],
    trigger: 'A creature enters the hallway.',
    effect: {
      type: 'damage',
      saveDC: 24,
      saveType: 'reflex',
      damage: { formula: '3d8+8', damageType: 'fire' },
      degreeFx: {
        criticalSuccess: 'No damage.',
        success: 'Half damage.',
        failure: 'Full damage.',
        criticalFailure: 'Double damage and persistent 1d8 fire.',
      },
    },
    initiative: 12,
    ac: 23,
    hp: 64,
    hardness: 11,
    immunities: ['critical-hits', 'precision', 'fire'],
    routineActions: [
      {
        name: 'Flame Burst',
        description: 'Fire jets blast every creature in the hallway.',
        effect: {
          type: 'damage',
          saveDC: 24,
          saveType: 'reflex',
          damage: { formula: '2d10+6', damageType: 'fire' },
          degreeFx: {
            criticalSuccess: 'No damage.',
            success: 'Half damage.',
            failure: 'Full damage.',
            criticalFailure: 'Full damage and persistent 1d6 fire.',
          },
        },
      },
    ],
    traits: ['mechanical', 'trap', 'complex', 'fire'],
  },

  'crushing-walls': {
    id: 'crushing-walls',
    name: 'Crushing Walls',
    level: 7,
    complexity: 'complex',
    type: 'trap',
    stealthDC: 25,
    description: 'The walls of a chamber slowly close in, threatening to crush everything inside. A hidden mechanism allows them to be stopped.',
    disable: [
      { skill: 'thievery', dc: 27, description: 'Jam the wall mechanism with a tool' },
      { skill: 'athletics', dc: 29, description: 'Brace the walls with sheer strength' },
    ],
    trigger: 'Removing the treasure from the central pedestal, or all creatures entering the room.',
    effect: {
      type: 'special',
      specialDescription: 'The doors seal and the walls begin closing. Each round, the room narrows by 5 feet.',
    },
    initiative: 8,
    ac: 24,
    hp: 72,
    hardness: 12,
    immunities: ['critical-hits', 'precision'],
    routineActions: [
      {
        name: 'Crush',
        description: 'The walls close by 5 feet. Creatures caught between the walls take bludgeoning damage.',
        effect: {
          type: 'both',
          saveDC: 25,
          saveType: 'reflex',
          damage: { formula: '4d10+10', damageType: 'bludgeoning' },
          conditions: [{ name: 'grabbed', value: undefined, duration: 1 }],
          degreeFx: {
            criticalSuccess: 'The creature finds a pocket of space and takes no damage.',
            success: 'Half damage.',
            failure: 'Full damage and grabbed (pinned between walls).',
            criticalFailure: 'Double damage and restrained.',
          },
        },
      },
    ],
    traits: ['mechanical', 'trap', 'complex'],
  },

  // ─── Additional traps and hazards ─────────────────────

  'hidden-pit': {
    id: 'hidden-pit',
    name: 'Hidden Pit',
    level: 0,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 15,
    description: 'A simple covered pit, 10 feet deep.',
    disable: [{ skill: 'thievery', dc: 15, description: 'Jam the cover' }],
    trigger: 'A creature walks onto the cover.',
    effect: {
      type: 'damage',
      saveDC: 15,
      saveType: 'reflex',
      damage: { formula: '1d6', damageType: 'bludgeoning' },
      degreeFx: {
        criticalSuccess: 'The creature catches itself.',
        success: 'The creature grabs the edge, taking no fall damage.',
        failure: 'The creature falls and takes damage.',
        criticalFailure: 'The creature falls and takes double damage.',
      },
    },
    traits: ['mechanical', 'trap'],
  },

  'tar-pit': {
    id: 'tar-pit',
    name: 'Tar Pit',
    level: 3,
    complexity: 'simple',
    type: 'environmental',
    stealthDC: 20,
    description: 'A pool of thick tar concealed under debris. Creatures that enter become stuck.',
    disable: [
      { skill: 'survival', dc: 20, description: 'Identify and mark the tar pit' },
    ],
    trigger: 'A creature walks onto the tar.',
    effect: {
      type: 'condition',
      saveDC: 20,
      saveType: 'reflex',
      conditions: [{ name: 'grabbed', value: undefined, duration: 'permanent' }],
      degreeFx: {
        criticalSuccess: 'The creature notices and stops.',
        success: 'The creature steps in but can pull free easily (slowed 1 for 1 round).',
        failure: 'The creature is grabbed by the tar (Escape DC 20).',
        criticalFailure: 'The creature is restrained (Escape DC 22).',
      },
    },
    traits: ['environmental'],
  },

  'swinging-log': {
    id: 'swinging-log',
    name: 'Swinging Log',
    level: 1,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 17,
    description: 'A heavy log suspended from the ceiling swings across a path when a tripwire is disturbed.',
    disable: [
      { skill: 'thievery', dc: 17, description: 'Cut the tripwire safely' },
    ],
    trigger: 'A creature trips the wire.',
    effect: {
      type: 'damage',
      saveDC: 17,
      saveType: 'reflex',
      damage: { formula: '2d6+3', damageType: 'bludgeoning' },
      degreeFx: {
        criticalSuccess: 'The creature ducks in time.',
        success: 'Half damage.',
        failure: 'Full damage and pushed 5 feet.',
        criticalFailure: 'Full damage, pushed 10 feet, and knocked prone.',
      },
    },
    traits: ['mechanical', 'trap'],
  },

  'acid-arrow-trap': {
    id: 'acid-arrow-trap',
    name: 'Acid Arrow Trap',
    level: 5,
    complexity: 'simple',
    type: 'trap',
    stealthDC: 24,
    description: 'A concealed mechanism fires an acid-coated arrow when a creature disturbs the trigger.',
    disable: [
      { skill: 'thievery', dc: 22, description: 'Disable the firing mechanism' },
    ],
    trigger: 'A creature opens the trapped chest or door.',
    effect: {
      type: 'both',
      saveDC: 22,
      saveType: 'reflex',
      damage: { formula: '3d8+6', damageType: 'piercing' },
      additionalDamage: [{ formula: '1d6', damageType: 'acid' }],
      conditions: [{ name: 'sickened', value: 1, duration: 3 }],
      degreeFx: {
        criticalSuccess: 'The creature avoids the arrow.',
        success: 'Half piercing damage, no acid or sickened.',
        failure: 'Full damage plus 1d6 persistent acid and sickened 1.',
        criticalFailure: 'Double damage, 2d6 persistent acid, and sickened 2.',
      },
    },
    traits: ['mechanical', 'trap', 'acid'],
  },

  'summoning-rune': {
    id: 'summoning-rune',
    name: 'Summoning Rune',
    level: 7,
    complexity: 'complex',
    type: 'trap',
    stealthDC: 25,
    description: 'An arcane circle on the floor summons hostile creatures when activated. The circle must be destroyed or dispelled.',
    disable: [
      { skill: 'arcana', dc: 27, description: 'Erase the rune circle' },
      { skill: 'religion', dc: 27, description: 'Banish the summoned entities' },
    ],
    trigger: 'A creature steps into the circle.',
    effect: {
      type: 'special',
      specialDescription: 'The rune activates, summoning hostile elemental creatures. The rune continues summoning until destroyed.',
    },
    initiative: 14,
    ac: 24,
    hp: 50,
    hardness: 10,
    immunities: ['critical-hits', 'precision'],
    routineActions: [
      {
        name: 'Summon Elemental',
        description: 'The rune summons a hostile elemental creature that attacks the nearest living creature.',
        effect: {
          type: 'damage',
          saveDC: 25,
          saveType: 'reflex',
          damage: { formula: '4d6+8', damageType: 'fire' },
        },
      },
    ],
    traits: ['magical', 'trap', 'complex', 'summoning'],
  },
};

// ─── Helpers ────────────────────────────────────────────

export function getHazard(hazardId: string): Hazard | undefined {
  return HAZARD_CATALOG[hazardId];
}

export function getHazardsByLevel(level: number): Hazard[] {
  return Object.values(HAZARD_CATALOG).filter(h => h.level === level);
}

export function getHazardsByType(type: Hazard['type']): Hazard[] {
  return Object.values(HAZARD_CATALOG).filter(h => h.type === type);
}

export function getHazardsInRange(minLevel: number, maxLevel: number): Hazard[] {
  return Object.values(HAZARD_CATALOG).filter(h => h.level >= minLevel && h.level <= maxLevel);
}

export function getComplexHazards(): Hazard[] {
  return Object.values(HAZARD_CATALOG).filter(h => h.complexity === 'complex');
}

export function createHazardInstance(
  hazardId: string,
  position: { x: number; y: number },
  instanceId?: string
): HazardInstance | null {
  const hazard = getHazard(hazardId);
  if (!hazard) return null;

  return {
    instanceId: instanceId ?? `hazard-${hazardId}-${Date.now()}`,
    hazardId,
    position,
    detected: hazard.stealthDC === 0, // Obvious hazards auto-detected
    disabled: false,
    destroyed: false,
    currentHp: hazard.hp,
    triggered: false,
    detectedBy: hazard.stealthDC === 0 ? ['all'] : [],
  };
}
