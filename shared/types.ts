// Combat and Game State Types
import { DamageType } from './spells';
import { AbilityScores, AbilityName, ProficiencyProfile, Bonus, Penalty } from './bonuses';

// Re-export for convenience
export type { DamageType };
export type { AbilityScores, AbilityName, ProficiencyProfile, Bonus, Penalty };

// ─── Weapon Inventory ────────────────────────────────
/**
 * A weapon or natural attack carried by a creature.
 * NPC creatures use flat fields; players may reference the WEAPON_CATALOG.
 */
export interface CreatureWeapon {
  /** Unique id within the creature's inventory (e.g., 'ogre-hook', 'claw-1') */
  id: string;
  /** Display name (e.g., "Ogre Hook", "Claw", "+1 Striking Greatsword") */
  display: string;
  /** 'melee' or 'ranged' */
  attackType: 'melee' | 'ranged';
  /** Attack bonus (flat). If undefined, compute from proficiency + weapon catalog */
  attackBonus?: number;
  /** Damage dice formula (e.g., "1d10", "2d6") */
  damageDice: string;
  /** Flat damage bonus added to the roll */
  damageBonus?: number;
  /** Damage type (e.g., "slashing", "bludgeoning") */
  damageType: string;
  /** Number of hands needed (1 or 2). Natural attacks = 0 */
  hands: number;
  /** Weapon traits (e.g., ['agile', 'finesse', 'reach']) */
  traits?: string[];
  /** Range in squares (melee default 1) */
  range?: number;
  /** Weapon catalog ID if this comes from WEAPON_CATALOG (optional) */
  weaponCatalogId?: string;
  /** Whether this is a natural/unarmed attack (cannot be disarmed or dropped) */
  isNatural?: boolean;
  /** Icon for display */
  icon?: string;
}

/** State of a weapon in the creature's hands */
export type WeaponSlotState = 'stowed' | 'held' | 'dropped';

export interface WeaponSlot {
  weapon: CreatureWeapon;
  state: WeaponSlotState;
}

/**
 * PHASE 0.4: Full Hand Tracking System
 * 
 * Tracks what each hand is holding. Enables:
 * - Two-weapon fighting (validate each hand holds a 1H weapon)
 * - Two-hand grips (1H weapon held in both hands for better damage die)
 * - Free hand detection (Grapple, Disarm require free hand)
 * - Shield blocking (shield takes up one hand slot)
 */
export interface HandSlot {
  /** The weapon or shield held in this hand, or null if empty */
  item: CreatureWeapon | null;
  /** Type of item: weapon, shield, or empty */
  itemType: 'weapon' | 'shield' | 'empty';
  /** The ID of the item if it exists (for lookup) */
  itemId?: string;
}

// ─── Archetype/Dedication ────────────────────────────
/**
 * PHASE 6: Archetype Dedication tracking.
 * A dedication represents an archetype a character has committed to.
 * PF2e rule: Must take 2 more feats from the archetype before taking another dedication.
 */
export interface Dedication {
  /** Archetype name, e.g., "Psychic", "Marshal" */
  name: string;
  /** Dedication feats taken for this archetype */
  feats: string[];
  /** Conscious mind (for Psychic Dedication) */
  consciousMind?: string; // e.g., "The Unbound Step"
  /** If the dedication grants spellcasting */
  spellcasting?: {
    tradition: 'arcane' | 'divine' | 'occult' | 'primal';
    type: 'cantrip' | 'prepared' | 'spontaneous';
  };
}

export interface DamageResistance {
  type: DamageType;
  value: number; // Amount of damage reduced per hit
}

export interface DamageWeakness {
  type: DamageType;
  value: number; // Extra damage multiplier (e.g., 1 for double damage)
}

// Spell and Spellcasting Types
export interface SpellSlot {
  level: number; // 0 (cantrips), 1-10
  available: number; // Slots available today
  max: number; // Max slots per day
}

export interface CastableSpell {
  name: string;
  level: number;
  tradition?: 'arcane' | 'divine' | 'occult' | 'primal'; // Casting tradition
  usage?: 'at-will' | 'once-per-day' | 'twice-per-day' | 'three-times-per-day' | 'once-per-week'; // For innate spells
  traits?: string[]; // e.g., ['Concentration', 'Evocation']
}

export interface SpellcasterTradition {
  tradition: 'arcane' | 'divine' | 'occult' | 'primal';
  castingType: 'prepared' | 'spontaneous' | 'innate'; // How spells are cast
  spells: CastableSpell[];
  slots: SpellSlot[]; // Spell slots by level
  spellAttackBonus?: number; // For spell attack rolls
  spellDC?: number; // Spell save DC
}

export interface Creature {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'creature';
  level: number;
  // Ability Modifiers (STR, DEX, CON, INT, WIS, CHA)
  abilities: AbilityScores;
  // Hit Points
  maxHealth: number;
  currentHealth: number;
  // Proficiency Ranks (weapons, armor, saves, etc.)
  proficiencies: ProficiencyProfile;
  // Cached AC — recomputed by computeDerivedStats()
  armorClass: number;
  // Equipment
  equippedWeapon?: string; // Weapon ID from catalog (legacy — prefer weaponInventory)
  armorBonus: number; // Item bonus from equipped armor
  equippedShield?: string; // Shield ID from catalog
  shieldRaised: boolean;
  currentShieldHp?: number;
  // Weapon inventory — all weapons/attacks available to this creature
  weaponInventory?: WeaponSlot[];
  
  /**
   * PHASE 0.4: Full Hand Tracking System (replaces handsUsed)
   * Tracks what each hand is holding explicitly.
   * Primary = dominant hand (usually right), Secondary = off hand (usually left)
   */
  hands?: {
    primary: HandSlot;
    secondary: HandSlot;
  };
  
  /** Hands currently in use (max 2 for humanoids, natural attacks don't count) - LEGACY */
  handsUsed?: number;
  // Active temporary bonuses/penalties (spells, auras, items, etc.)
  bonuses: Bonus[];
  penalties: Penalty[];
  // Movement
  /** Speed in feet (e.g., 25, 30) — used for Stride action range calculation */
  speed: number;
  // Grid position
  positions: Position;
  // Conditions (frightened, flat-footed, etc.)
  conditions: Condition[];
  // Combat state
  initiative: number;
  initiativeBonus?: number; // Bonus for initiative (WIS mod + Perception prof)
  attacksMadeThisTurn: number; // For MAP calculation
  flourishUsedThisTurn?: boolean; // Only one Flourish action per turn
  reactionUsed?: boolean; // Whether the creature has used its reaction this round
  // Death tracking
  dying: boolean;
  dead?: boolean; // True when dying value reaches 4+
  deathSaveFailures: number;
  deathSaveSuccesses: number;
  deathSaveMadeThisTurn: boolean;
  wounded: number;
  // Spellcasting
  keyAbility?: AbilityName; // Key ability for spell DCs
  spellcasters?: SpellcasterTradition[]; // Multiple spellcasting traditions (for multiclass/archetype abilities)
  // Deprecated: use spellcasters instead
  spells?: string[];
  // Damage modifiers
  damageResistances: DamageResistance[];
  damageImmunities: DamageType[];
  damageWeaknesses: DamageWeakness[];
  // Pathbuilder import extras
  feats?: { name: string; type: string; level: number }[];
  specials?: string[]; // Special abilities from Pathbuilder (e.g., "Reactive Strike", "Shield Block")
  skills?: { name: string; proficiency: string; bonus: number; abilityMod: number; profBonus: number }[];
  lores?: { name: string; bonus: number }[];
  weaponDisplay?: string; // Display name for weapon (e.g. "+1 Striking Greatsword")
  pbAttackBonus?: number; // Pathbuilder-calculated attack bonus
  weaponDamageDice?: string; // Damage dice (e.g., "2d8" or "2d6+1d6")
  weaponDamageBonus?: number; // Damage bonus (STR + item bonus)
  weaponDamageType?: string; // Damage type (e.g., "slashing", "bludgeoning")
  characterClass?: string; // e.g. "Fighter"
  ancestry?: string; // e.g. "Human"
  heritage?: string; // e.g. "Nephilim"
  focusPoints?: number; // Current focus points
  maxFocusPoints?: number; // Max focus points
  heroPoints?: number; // Hero points
  focusSpells?: { 
    name: string; 
    level: number; 
    type: 'cantrip' | 'spell';  // Psi cantrips (at-will, ampable) vs focus spells (cost focus point)
    ampable?: boolean;  // Can this cantrip be amped by spending a focus point?
    tradition?: string; // e.g. "occult"
  }[];
  /** PHASE 6: Archetype dedications (e.g., Psychic Dedication) */
  dedications?: Dedication[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Condition {
  name: string;
  duration: number | 'permanent'; // turns remaining, or permanent
  value?: number; // for conditions with values (e.g., frightened 2)
  // Persistent damage tracking
  isPersistentDamage?: boolean; // Whether this condition deals damage each turn
  damageFormula?: string; // Damage formula for persistent damage (e.g., "2d6" for fire)
  damageType?: DamageType; // Type of persistent damage (fire, bleed, etc.)
  damagePerTurn?: number; // Pre-calculated damage per turn (alternative to formula)
  source?: string; // What caused this condition (e.g., "Fireball", "Bleeding Wound")
  sourceEffectDC?: number; // DC of the effect that applied this condition (for Sickened retching, etc.)
  appliesAgainst?: string; // Creature ID - for conditional effects like Feint's off-guard
  attackType?: 'melee' | 'ranged'; // Limits effect to attack type. Undefined = applies to ALL attack types
  usesRemaining?: number; // For effects that apply to the next X attacks
  expiresOnTurnEndOf?: string; // Creature ID whose turn end expires this condition
  turnEndsRemaining?: number; // How many turn-ends remain for the above creature
}

export interface Action {
  id: string;
  name: string;
  type: 'strike' | 'spell' | 'ability' | 'movement';
  actionCost: number; // 1, 2, 3, or 'reaction'
  description: string;
}

export interface CombatRound {
  number: number;
  turnOrder: string[]; // creature IDs in initiative order
  currentTurnIndex: number;
  actions: CombatAction[];
}

export interface CombatAction {
  id: string;
  creatureId: string;
  actionId: string;
  targetId?: string;
  targetPosition?: Position;
  result: 'pending' | 'executed' | 'failed';
  details?: Record<string, any>;
}

export interface EncounterMap {
  width: number;
  height: number;
  terrain: TerrainTile[][];
}

export interface TerrainTile {
  x: number;
  y: number;
  type: 'empty' | 'difficult' | 'impassable';
}

export interface GroundObject {
  id: string; // Unique ID for this ground object (e.g., "ground-dagger-123")
  weapon: CreatureWeapon; // The weapon/item on the ground
  position: Position; // Where it was dropped
  droppedByCreatureId: string; // Which creature dropped it
  droppedAtRound: number; // Which round it was dropped
}

export interface GameState {
  id: string;
  name: string;
  creatures: Creature[];
  map: EncounterMap;
  currentRound: CombatRound;
  log: GameLog[];
  groundObjects: GroundObject[]; // Weapons and items on the ground
}

export interface GameLog {
  timestamp: number;
  type: 'action' | 'damage' | 'condition' | 'death' | 'system';
  message: string;
  details?: Record<string, any>;
}

export interface DiceRoll {
  times: number;
  sides: number;
  results: number[];
  total: number;
}

export interface AttackRoll {
  attacker: string;
  attackerAC?: number; // Include defender's AC for reference
  target: string;
  targetAC: number;
  d20: number;
  bonus: number;
  total: number;
  result: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  marginOfSuccess?: number; // total - targetAC
  damage?: DamageResult;
}

export interface DamageResult {
  dice: DiceRoll;
  isCriticalHit: boolean;
  total: number;
  appliedDamage: number; // after resistances/immunities
}

// API Request/Response Types
export interface AITurnRequest {
  gameState: GameState;
  currentCreatureId: string;
  availableActions: Action[];
}

export interface AITurnResponse {
  action: CombatAction;
  reasoning: string;
}
