// Combat and Game State Types
import { DamageType } from './spells';
import { AbilityScores, AbilityName, ProficiencyProfile, ProficiencyRank, Bonus, Penalty } from './bonuses';

// Re-export for convenience
export type { DamageType };
export type { AbilityScores, AbilityName, ProficiencyProfile, ProficiencyRank, Bonus, Penalty };

// ─── Proficiency & Weapon Types ──────────────────────

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
  damageType: DamageType;
  /** Number of hands needed (1 or 2). Natural attacks = 0 */
  hands: number;
  /** Weapon traits (e.g., ['agile', 'finesse', 'reach']) */
  traits?: string[];
  /** Range increment in squares — only for ranged weapons (e.g., shortbow = 12 = 60ft) */
  range?: number;
  /** Melee reach in squares (default 1 = 5ft, reach weapons = 2 = 10ft) */
  reach?: number;
  /** Weapon catalog ID if this comes from WEAPON_CATALOG (optional) */
  weaponCatalogId?: string;
  /** Whether this is a natural/unarmed attack (cannot be disarmed or dropped) */
  isNatural?: boolean;
  /** Icon for display */
  icon?: string;
  
  /** PHASE 9.5: Weapon runes */
  potencyRune?: 1 | 2 | 3; // +1/+2/+3 item bonus to attack
  strikingRune?: 'striking' | 'greater-striking' | 'major-striking'; // Extra damage dice
  propertyRunes?: string[]; // Property rune IDs (e.g., ['flaming', 'frost'])
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

/**
 * PF2e Immunity Type — broader than DamageType.
 * Creatures can be immune to damage types AND to conditions/effects.
 * Examples: 'fire', 'bleed', 'death-effects', 'paralyzed', 'disease'
 */
export type ImmunityType =
  | DamageType
  // Conditions
  | 'blinded' | 'confused' | 'controlled' | 'dazzled' | 'doomed' | 'drained'
  | 'fascinated' | 'grabbed' | 'off-guard' | 'paralyzed' | 'petrified'
  | 'prone' | 'restrained' | 'sleep' | 'unconscious'
  // Effects & Traits
  | 'critical-hits' | 'curse' | 'death-effects' | 'disease'
  | 'emotion' | 'fear-effects' | 'fortune-effects' | 'illusion'
  | 'misfortune-effects' | 'nonlethal-attacks' | 'olfactory'
  | 'polymorph' | 'possession' | 'scrying' | 'swarm-mind' | 'visual';

export interface DamageResistance {
  type: DamageType;
  value: number; // Amount of damage reduced per hit
  source?: string; // Where this resistance comes from (e.g., 'Iron Body')
}

export interface DamageWeakness {
  type: DamageType;
  value: number; // Extra damage added on a hit
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

/** PF2e creature sizes — determines space, reach, and various size-dependent rules */
export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

// ─── Equipment Subsystem Types ───────────────────────

/** A strike granted by equipment (e.g., Berserker's Cloak jaws/claws, Torch) */
export interface GrantedStrike {
  name: string;
  category: 'unarmed' | 'simple' | 'martial';
  damageType: string;
  damageDie: string;
  traits?: string[];
  source: string;
}

/** Degree-of-success adjustment from equipment (e.g., Armbands of the Gorgon: save success → one-degree-better vs incapacitation) */
export interface DegreeAdjustmentEntry {
  /** What roll this applies to: 'saving-throw', 'skill-check', 'attack-roll' */
  selector: string;
  /** Encoded adjustment: 'success:one-degree-better', 'criticalFailure:one-degree-better', etc. */
  adjustment: string;
  condition?: string;
  source: string;
}

/** Substitute a fixed value for a roll (e.g., Fortune's Coin: use 12 instead of rolling) */
export interface SubstituteRollEntry {
  selector: string;
  value: number;
  label: string;
  source: string;
}

/** Modifier adjustment from equipment (e.g., compass removes no-compass penalty, Pactmaster's Grace overrides save value) */
export interface ModifierAdjustmentEntry {
  selector: string;
  slug: string;
  mode: string;
  value?: number;
  condition?: string;
  source: string;
}

/** An aura emanating from equipment (e.g., Standard of the Primeval Howl: 20ft radius) */
export interface AuraEntry {
  radius: number;
  effects: string;
  source: string;
}

/** Roll note from equipment — reminder text shown on specific roll outcomes */
export interface NoteEntry {
  selector: string;
  text: string;
  outcome?: string[];
  condition?: string;
  source: string;
}

/** Extra damage dice from equipment (e.g., Flaming Rune: +1d6 fire) */
export interface DamageDiceEntry {
  selector: string;
  diceNumber?: number;
  dieSize?: string;
  damageType?: string;
  critical?: boolean;
  category?: string;
  condition?: string;
  source: string;
}

/** Damage alteration from equipment (e.g., Holy Avenger: override damage type to spirit) */
export interface DamageAlterationEntry {
  mode: string;
  property: string;
  value: string;
  condition?: string;
  source: string;
}

/** Strike adjustment from equipment (e.g., Knapsack of Halflingkind: add silver material) */
export interface AdjustStrikeEntry {
  property: string;
  value: string;
  condition?: string;
  source: string;
}

/** Condition granted by equipment (e.g., Giant Catch Pole: clumsy 1) */
export interface GrantedConditionEntry {
  conditionSlug: string;
  value?: number;
  condition?: string;
  source: string;
}

/** Roll-twice (fortune/misfortune) from equipment (e.g., Laurel of the Empath: reroll initiative, keep higher) */
export interface RollTwiceEntry {
  selector: string;
  keep: 'higher' | 'lower';
  source: string;
}

/** Fast healing from equipment (e.g., Splithead Bow: heal 2/round in encounter) */
export interface FastHealingEntry {
  value: number;
  condition?: string;
  source: string;
}

/** Ephemeral/temporary effect from equipment — triggered by specific roll outcomes */
export interface EphemeralEffectEntry {
  selector: string;
  effectName: string;
  condition?: string;
  source: string;
}

export interface Creature {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'creature';
  level: number;
  // Ability Modifiers (STR, DEX, CON, INT, WIS, CHA)
  abilities: AbilityScores;

  // ── Size & Space ──
  /** PF2e creature size (default: 'medium'). Determines space, reach, and grapple bonuses. */
  size?: CreatureSize;
  /** Grid space in squares (tiny=0.5, small/medium=1, large=2, huge=3, gargantuan=4). Derived from size. */
  space?: number;
  /** Base unarmed/natural melee reach in feet before weapon/feat overrides (tiny=0, small/medium=5, large=10, huge=15, gargantuan=20). */
  naturalReach?: number;

  // ── Subclass/instinct ──
  /** Barbarian instinct (e.g., 'animal', 'dragon', 'fury', 'giant', 'spirit', 'superstition') */
  barbarianInstinct?: string;

  // ── Polymorph state ──
  /** Active polymorph form name (e.g., 'dragon-form', 'pest-form'). Null/undefined = natural form. */
  polymorphForm?: string;
  /** Stats saved before polymorph for reverting */
  polymorphOriginalStats?: {
    size?: CreatureSize;
    space?: number;
    naturalReach?: number;
    speed?: number;
    strength?: number;
    dexterity?: number;
    armorClass?: number;
    attacks?: CreatureWeapon[];
  };

  // Hit Points
  maxHealth: number;
  currentHealth: number;
  temporaryHealth?: number; // PF2e temp HP (from Rage, etc.) — lost before real HP, doesn't stack
  // Proficiency Ranks (weapons, armor, saves, etc.)
  proficiencies: ProficiencyProfile;
  // Cached AC — recomputed by computeDerivedStats()
  armorClass: number;
  // Equipment
  equippedWeapon?: string; // Weapon ID from catalog (legacy — prefer weaponInventory)
  armorBonus: number; // Item bonus from equipped armor
  equippedArmor?: string; // Armor ID from ARMOR_CATALOG (e.g., 'full-plate', 'chain-mail', 'leather')
  equippedShield?: string; // Shield ID from catalog
  shieldRaised: boolean;
  currentShieldHp?: number;
  /** Equipped worn & held magic items — IDs from WORN_ITEMS catalog (e.g., 'bands-of-force', 'coyote-cloak') */
  equippedWornItems?: string[];
  /** Granted strikes from equipment (e.g., Berserker's Cloak jaws/claws) — populated by resolveEquipmentEffects */
  grantedStrikes?: GrantedStrike[];
  /** Degree-of-success adjustments from equipment (e.g., Armbands of the Gorgon) */
  degreeAdjustments?: DegreeAdjustmentEntry[];
  /** Substitute-roll effects from equipment (e.g., Fortune's Coin) */
  substituteRolls?: SubstituteRollEntry[];
  /** Modifier adjustments from equipment (e.g., compass removes no-compass penalty) */
  modifierAdjustments?: ModifierAdjustmentEntry[];
  /** Aura effects from equipment (e.g., Standard of the Primeval Howl) */
  equipmentAuras?: AuraEntry[];
  /** Roll notes from equipment — reminder text on specific rolls */
  equipmentNotes?: NoteEntry[];
  /** Extra damage dice from equipment (e.g., Flaming property rune, Poisonous Cloak) */
  equipmentDamageDice?: DamageDiceEntry[];
  /** Damage type/dice alterations from equipment */
  equipmentDamageAlterations?: DamageAlterationEntry[];
  /** Strike property adjustments from equipment (e.g., silver material, holy trait) */
  equipmentStrikeAdjustments?: AdjustStrikeEntry[];
  /** Conditions passively granted by equipment (e.g., Giant Catch Pole: clumsy 1) */
  equipmentGrantedConditions?: GrantedConditionEntry[];
  /** Roll-twice (fortune/misfortune) effects from equipment */
  equipmentRollTwice?: RollTwiceEntry[];
  /** Fast healing from equipment (HP per round in encounter) */
  equipmentFastHealing?: FastHealingEntry[];
  /** Ephemeral effects from equipment — triggered by specific rolls */
  equipmentEphemeralEffects?: EphemeralEffectEntry[];
  // Weapon inventory — all weapons/attacks available to this creature
  weaponInventory?: WeaponSlot[];

  /** Cached map reference for terrain-aware pathfinding — set by engine at combat start */
  _map?: EncounterMap;
  
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
  attackTargetsThisTurn?: string[]; // Target IDs attacked this turn (for Sweep trait)
  actionsRemaining?: number; // Actions left in the current turn
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
  damageImmunities: ImmunityType[];
  damageWeaknesses: DamageWeakness[];
  // Pathbuilder import extras
  feats?: { name: string; type: string; level: number }[];
  specials?: string[]; // Special abilities from Pathbuilder (e.g., "Reactive Strike", "Shield Block")
  skills?: { name: string; proficiency: ProficiencyRank; bonus: number; abilityMod: number; profBonus: number }[];
  lores?: { name: string; bonus: number }[];
  /** @deprecated Use weaponInventory instead. Kept for Pathbuilder import compat. See LOW-15. */
  weaponDisplay?: string; // Display name for weapon (e.g. "+1 Striking Greatsword")
  /** @deprecated Use weaponInventory instead */
  pbAttackBonus?: number; // Pathbuilder-calculated attack bonus
  /** @deprecated Use weaponInventory instead */
  weaponDamageDice?: string; // Damage dice (e.g., "2d8" or "2d6+1d6")
  /** @deprecated Use weaponInventory instead */
  weaponDamageBonus?: number; // Damage bonus (STR + item bonus)
  /** @deprecated Use weaponInventory instead */
  weaponDamageType?: DamageType; // Damage type (e.g., "slashing", "bludgeoning")
  characterClass?: string; // e.g. "Fighter"
  // XP tracking (synced from CharacterSheet)
  currentXP?: number;       // XP towards next level
  // PHASE 10.1: Rogue class fields (derived from CharacterSheet.classSpecific)
  rogueRacket?: 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger'; // Rogue racket choice
  rogueDeity?: string; // Deity name for Avenger racket (e.g., "Sarenrae")
  // PSYCHIC class fields
  consciousMind?: string; // e.g., 'the-distant-grasp'
  subconsciousMind?: string; // e.g., 'emotional-acceptance'
  unleashPsycheActive?: boolean; // True when Unleash Psyche is active (2 rounds)
  unleashPsycheRoundsLeft?: number; // Rounds remaining for Unleash Psyche
  unleashPsycheUsedThisEncounter?: boolean; // Once per encounter
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

  // ── Barbarian Rage tracking (PF2e Remaster — Player Core 2) ──
  rageActive?: boolean;         // True while raging
  rageRoundsLeft?: number;      // Rounds remaining in current rage (10 = 1 minute)
  rageUsedThisEncounter?: boolean; // Cannot Rage again for 1 minute after rage ends (Remaster removes fatigued)
  secondWindUsed?: boolean;     // Second Wind feat: tracks whether second rage was already used
  lastStrikeResult?: 'hit' | 'miss' | 'crit'; // Result of last Strike (for Follow-up Assault, Knockback, Furious Grab)

  // ── Ranger Hunt Prey tracking ──
  huntedPreyId?: string;        // ID of the creature designated as hunted prey
  huntersEdge?: 'flurry' | 'precision' | 'outwit'; // Chosen hunter's edge

  // ── Champion reaction tracking ──
  championCause?: 'paladin' | 'liberator' | 'redeemer'; // Chosen cause

  // ── Monk tracking ──
  kiStrikeActive?: boolean;     // Whether ki strike is active this turn

  // ── Kineticist tracking ──
  kineticAuraActive?: boolean;          // True when kinetic aura is active (via Channel Elements)
  kineticElement?: string;              // Primary kinetic element (e.g., 'fire', 'earth', 'air', 'water', 'metal', 'wood')
  kineticElementSecondary?: string;     // Secondary element (dual gate)
  gatheredElement?: boolean;            // Whether element is gathered for overflow
  overflowUsedThisRound?: boolean;      // Only one overflow impulse per round

  // ── Druid tracking ──
  druidOrder?: string;                          // Druidic order (animal, leaf, storm, untamed, etc.)
  wildShapeActive?: boolean;                    // True when in a wild shape battle form
  wildShapeForm?: string;                       // Current battle form name (e.g., 'pest', 'animal', 'insect', 'dinosaur', 'elemental')
  wildShapeRoundsLeft?: number;                 // Duration remaining
  wildShapeOriginalStats?: {                    // Stats saved before transformation
    strength?: number;
    dexterity?: number;
    armorClass?: number;
    speed?: number;
    attacks?: CreatureWeapon[];
  };

  // ── Bard tracking ──
  bardMuse?: string;                            // Bard muse (enigma, maestro, polymath, warrior)
  courageousAnthemActive?: boolean;             // True when Courageous Anthem composition is active
  courageousAnthemRoundsLeft?: number;          // Rounds remaining on Courageous Anthem

  // ── Class-specific runtime tracking (Phase 15) ──
  classSpecific?: {
    // Swashbuckler
    hasPanache?: boolean;
    // Investigator
    hasStratagem?: boolean;
    strategemTargetId?: string;
    strategemRoll?: number;
    // Thaumaturge
    exploitVulnerabilityTargetId?: string;
    exploitVulnerabilityType?: 'mortal-weakness' | 'personal-antithesis';
    // Gunslinger
    gunslingerWay?: string;
    // Inventor
    overdriveActive?: boolean;
    overdriveLevel?: 'normal' | 'critical';
    unstableActive?: boolean;
    // Oracle
    curseLevel?: 'minor' | 'moderate' | 'major' | 'extreme';
    oracleMystery?: string;
    // Alchemist
    infusedReagents?: number;
    // Exemplar
    ikons?: string[];
    immanenceIkon?: string;
    transcendenceAvailable?: boolean;
    // Summoner
    eidolonType?: string;
    actTogetherUsed?: boolean;
  };

  // ── Companions / Pets / Familiars / Eidolons ──
  /** IDs of companion creatures this creature owns (appear in GameState.companions) */
  companionIds?: string[];
  /** Familiar tracking — only if this creature HAS a familiar */
  familiar?: {
    id: string;          // Companion creature ID in GameState.companions
    abilitiesPerDay: number; // Base slots (2, 4, 6 from Enhanced/Incredible Familiar)
    selectedAbilities: string[];  // Ability IDs chosen for today (from FamiliarAbility catalog)
  };
  /** Summoner eidolon link — only for Summoner class */
  eidolonId?: string;  // Companion creature ID in GameState.companions

  /** Spell slot usage tracking — rank -> number of slots used today */
  spellSlotsUsed?: Record<number, number>;
  
  /** NPC disposition — used for bestiary creatures placed as NPCs during exploration */
  npcDisposition?: 'hostile' | 'neutral' | 'friendly';
  /** Original bestiary creature name — set when placed via place-creature-npc, used for combat transition */
  bestiaryName?: string;

  /** PHASE 8: Delay action tracking */
  isDelaying?: boolean; // True when creature has used Delay and is waiting to act
  
  /** PHASE 8: Ready action tracking */
  readyAction?: {
    actionId: string;       // The action to perform when triggered (e.g., 'strike', 'shield-block')
    targetId?: string;      // Target for the action (if applicable)
    trigger: string;        // Description of the trigger (stored for display)
    triggerType?: 'movement' | 'attack' | 'spell' | 'custom'; // Type of trigger for detection
  };
  
  /** PHASE 9.6: Consumable inventory */
  consumables?: {
    id: string;      // Consumable ID (from consumables.ts catalog)
    quantity: number; // How many the creature has
  }[];

  /** Senses (e.g., 'darkvision', 'low-light vision', 'greater darkvision', 'scent (imprecise) 30 feet') */
  senses?: string[];

  /** Token image URL — displayed on the battle grid (base64 data URL or file path) */
  tokenImageUrl?: string;
  /** Portrait/art image URL — displayed in character sheets and panels (base64 data URL or file path) */
  portraitImageUrl?: string;

  // Bio / Description (GM reference)
  pronouns?: string;
  age?: string;
  height?: string;
  weight?: string;
  description?: string;
}

export interface Position {
  x: number;
  y: number;
  /** Elevation in feet above ground level (0 = ground). Used for flight, levitation, and vertical distance. */
  elevation?: number;
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
  actionCost: number | 'reaction' | 'free'; // 1, 2, 3, reaction, or free
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
  /** Rich tile data from procedural generation (28 tile types) */
  tiles?: import('./mapGenerator').TileType[][];
  /** Per-cell movement cost override (null = use tile default). Used for bridges over water, etc. */
  moveCostOverride?: (number | null)[][];
  /** Image URL for pre-made map backgrounds */
  mapImageUrl?: string;
  /** Theme of the map (dungeon, wilderness, etc.) */
  mapTheme?: string;
  /** Sub-theme of the map */
  mapSubTheme?: string;
  /** Whether this map was procedurally generated */
  procedural?: boolean;
  /** Atlas sprite overlays drawn on top of base tiles */
  overlays?: import('./mapGenerator').AtlasOverlay[];
  /**
   * Ambient lighting level for the map.
   * - 'bright': Full daylight / well-lit — normal vision sees entire map
   * - 'dim': Twilight, torchlight perimeter, moonlit — normal vision limited, low-light sees full
   * - 'dark': Underground, moonless night — only darkvision/greater darkvision can see
   */
  lightingLevel?: 'bright' | 'dim' | 'dark';
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
  /** Companion creatures (animal companions, familiars, eidolons, minions) — keyed by companion ID */
  companions?: CompanionCreature[];
  map: EncounterMap;
  currentRound: CombatRound;
  log: GameLog[];
  groundObjects: GroundObject[]; // Weapons and items on the ground
  gmSession?: GMSession;         // Phase 19: AI GM Chatbot session data
}

export interface GameLog {
  timestamp: number;
  type: 'action' | 'damage' | 'condition' | 'death' | 'system';
  message: string;
  details?: Record<string, any>;
  /** AI-generated narrative description of this combat event */
  narrative?: string;
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
// ─── CHARACTER BUILDER TYPES ────────────────────────────────
/**
 * PHASE 11: Character Builder & Management
 * Comprehensive character sheet for character creation and tracking
 */

export interface SkillProficiency {
  name: string;
  proficiency: ProficiencyRank;
  ability: AbilityName;
  bonus?: number; // Calculated: abilityMod + profBonus + itemBonus
}

/** PF2e Remaster: 1000 XP per level (flat, same threshold every level) */
export const XP_PER_LEVEL = 1000;

export interface CharacterSheet {
  // Metadata
  id: string;
  name: string;
  level: number;
  currentXP: number;        // XP towards next level (0-999, resets on level-up)
  createdAt: number;
  updatedAt?: number;
  exportedAt?: number;
  
  // Core Identity
  ancestry: string; // e.g., "Human", "Elf", "Dwarf"
  heritage: string; // e.g., "Versatile Heritage", "Half-Orc"
  background: string; // e.g., "Acrobat", "Ancient Historian"
  class: string; // e.g., "Rogue", "Fighter"

  // Bio / Description (GM reference)
  pronouns?: string;      // e.g., "she/her", "he/him", "they/them"
  age?: string;            // e.g., "28", "Young adult"
  height?: string;         // e.g., "5'8\"", "172 cm"
  weight?: string;         // e.g., "160 lbs", "73 kg"
  description?: string;    // Physical description, personality, etc.
  
  // Abilities & Proficiencies
  abilities: AbilityScores; // STR, DEX, CON, INT, WIS, CHA
  proficiencies: ProficiencyProfile; // Weapon, armor, saves
  skills: SkillProficiency[];
  
  // Class-Specific Fields
  classSpecific?: {
    // Rogue specific
    rogueRacket?: 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger';
    rogueDeity?: string; // For Avenger racket
    // Psychic specific
    consciousMind?: string; // e.g., 'the-distant-grasp'
    subconsciousMind?: string; // e.g., 'emotional-acceptance'
    // Magus specific
    hybridStudy?: string; // e.g., 'inexorable-iron'
    // Sorcerer specific
    bloodline?: string; // e.g., 'draconic'
    // Wizard specific
    arcaneSchool?: string; // e.g., 'school-of-battle-magic'
    // Barbarian specific
    instinct?: string; // e.g., 'dragon-instinct'
    // Champion specific
    championCause?: string; // e.g., 'paladin'
    // Ranger specific
    huntersEdge?: string; // e.g., 'flurry'
    // Cleric specific
    doctrine?: string; // e.g., 'cloistered'
    // Kineticist specific
    kineticElement?: string; // e.g., 'fire' — primary element from Kinetic Gate
    kineticElementSecondary?: string; // e.g., 'air' — secondary element (dual gate)
    kineticGateType?: 'single' | 'dual'; // Single Gate or Dual Gate
    // Druid specific
    druidOrder?: string; // e.g., 'animal', 'leaf', 'storm', 'untamed'
    // Bard specific
    bardMuse?: string; // e.g., 'enigma', 'maestro', 'polymath', 'warrior'
    // Guardian specific
    guardianWay?: string; // e.g., 'interpose', 'sentinel'
    // Swashbuckler specific
    swashbucklerStyle?: string; // e.g., 'fencer', 'gymnast', 'battledancer', 'wit', 'braggart'
    hasPanache?: boolean;
    // Investigator specific
    investigatorMethodology?: string; // e.g., 'alchemical-sciences', 'empiricism', 'forensic-medicine', 'interrogation'
    hasStratagem?: boolean;
    strategemTargetId?: string;
    strategemRoll?: number;
    // Thaumaturge specific
    thaumaturgeImplement1?: string; // e.g., 'amulet', 'bell', 'chalice', 'lantern', 'mirror', 'regalia', 'tome', 'wand', 'weapon'
    thaumaturgeImplement2?: string;
    thaumaturgeImplement3?: string;
    exploitVulnerabilityTargetId?: string;
    exploitVulnerabilityType?: 'mortal-weakness' | 'personal-antithesis';
    // Commander specific
    commanderBanner?: string; // e.g., 'rallying', 'hardening', 'bolstering'
    commanderTactics?: string[]; // Active tactics
    // Gunslinger specific
    gunslingerWay?: string; // e.g., 'way-of-the-drifter', 'way-of-the-pistolero', 'way-of-the-sniper', 'way-of-the-vanguard', 'way-of-the-triggerbrand'
    // Inventor specific
    innovationType?: string; // e.g., 'armor', 'construct', 'weapon'
    overdriveActive?: boolean;
    overdriveLevel?: 'normal' | 'critical';
    unstableActive?: boolean;
    // Witch specific
    witchPatron?: string; // e.g., 'fate', 'ferment', 'night', 'pacts', 'silence', 'wilding', 'winter', 'mosquito-witch'
    witchFamiliarAbilities?: string[];
    // Oracle specific
    oracleMystery?: string; // e.g., 'ancestors', 'battle', 'bones', 'cosmos', 'flames', 'life', 'lore', 'tempest'
    curseLevel?: 'minor' | 'moderate' | 'major' | 'extreme';
    // Alchemist specific
    researchField?: string; // e.g., 'bomber', 'chirurgeon', 'mutagenist', 'toxicologist'
    infusedReagents?: number;
    // Animist specific
    apparitions?: string[]; // Active apparitions
    // Exemplar specific
    ikons?: string[]; // Equipped ikons
    immanenceIkon?: string; // Current ikon receiving immanence
    transcendenceAvailable?: boolean;
    // Summoner specific
    eidolonType?: string; // e.g., 'angel', 'beast', 'construct', 'demon', 'devotion-phantom', 'dragon', 'fey', 'plant', 'psychopomp', 'undead'
    eidolonHPCurrent?: number;
    actTogetherUsed?: boolean;
    // Archetype psychic dedication sub-choices
    archetypeConsciousMind?: string;
    archetypePsiCantrip?: string;
    archetypePsiCantrip2?: string;
    // More classes added as implemented
  };
  
  // Equipment & Inventory
  weaponIds?: string[]; // Weapon catalog IDs
  weaponRunes?: {
    potencyRune?: 1 | 2 | 3;
    strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
    propertyRunes?: string[];
  }[]; // Parallel to weaponIds by index
  armorId?: string; // Armor catalog ID
  armorRunes?: {
    potencyRune?: 1 | 2 | 3;
    resilientRune?: 'resilient' | 'greater-resilient' | 'major-resilient';
    propertyRunes?: string[];
  }; // Runes attached to selected armor
  shieldId?: string; // Shield catalog ID
  handwrapRunes?: {
    potencyRune?: 1 | 2 | 3;
    strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
    propertyRunes?: string[];
  }; // Handwraps of Mighty Blows runes (applied to all unarmed attacks)
  inventory?: {
    id: string;
    itemName: string;
    quantity: number;
  }[];
  /** Equipped worn & held magic item IDs — from WORN_ITEMS catalog */
  equippedWornItems?: string[];
  remainingGold?: number; // GP left after equipment purchases
  
  // Feats & Derivations
  feats?: {
    name: string;
    level: number;
    type: 'class' | 'skill' | 'general' | 'ancestry' | 'archetype';
  }[];
  
  // Traits & Special Notes
  traits?: string[]; // e.g., "Humanoid", "Undead"
  specialNotes?: string;
  
  // Spellcasting (populated by character builder)
  /** All spells known — spellbook for prepared, repertoire for spontaneous */
  knownSpells?: string[]; // Spell IDs from SPELL_CATALOG
  /** Spells prepared in slots for today (prepared casters only). rank -> spell IDs */
  preparedSpells?: Record<number, string[]>;
  /** Cantrips selected from known spells (always prepared / always available) */
  knownCantrips?: string[]; // Spell IDs

  // Derived Values (calculated)
  maxHealth?: number;
  armorClass?: number;

  // Token & Portrait Images (Foundry VTT compatible format)
  /** Token image — displayed on the battle grid. Base64 data URL or relative path. */
  tokenImageUrl?: string;
  /** Portrait/full art — displayed in character sheets and panels. Base64 data URL or relative path. */
  portraitImageUrl?: string;

  /** Full BuilderState snapshot — allows re-opening the character in the builder for editing */
  builderState?: any;

  // Runtime/Combat fields (populated during gameplay)
  currentHealth?: number;
  conditions?: Condition[];
  savingThrows?: {
    fortitude: number;
    reflex: number;
    will: number;
  };
}

// ─── Party Stash Types ──────────────────────────────────

export type StashItemCatalog = 'weapon' | 'armor' | 'shield' | 'consumable' | 'gear' | 'wornItem';

export interface StashItem {
  /** Unique instance ID (for tracking individual stash entries) */
  uid: string;
  /** ID from the source catalog (e.g., 'longsword', 'chain-mail', 'healing-potion-moderate') */
  catalogId: string;
  /** Which catalog this item comes from */
  catalogType: StashItemCatalog;
  /** Display name */
  name: string;
  /** Stack count */
  quantity: number;
  /** Per-unit GP value */
  gpValue: number;
  /** Weapon rune configuration (weapon catalog items only) */
  weaponRunes?: {
    potencyRune?: 1 | 2 | 3;
    strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
    propertyRunes?: string[];
  };
  /** Armor rune configuration (armor catalog items only) */
  armorRunes?: {
    potencyRune?: 1 | 2 | 3;
    resilientRune?: 'resilient' | 'greater-resilient' | 'major-resilient';
    propertyRunes?: string[];
  };
}

export interface Party {
  id: string;
  name: string;
  campaignName?: string;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
  characters: CharacterSheet[];
  
  // Campaign Settings
  optionalRules: {
    gradualAbilityBoosts: boolean; // Ability boosts every 4 levels instead of 5
    ancestryParagon: boolean; // Gain additional ancestry feats
    freeArchetype: boolean; // Every 4 levels instead of archetype dedication
  };

  // Party Stash — shared inventory pool
  /** Items in the shared party stash */
  stash?: StashItem[];
  /** Gold pieces held in the party treasury */
  stashGold?: number;
}

export interface PathbuilderCharacter {
  // Pathbuilder JSON format (subset of fields we care about)
  name: string;
  classname: string;
  ancestry: string;
  heritage?: string;
  background: string;
  level: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  // Other fields would include skills, feats, equipment, etc.
  [key: string]: any;
}

// ─── PHASE 19: AI GM CHATBOT TYPES ─────────────────────────────

/** Campaign tone/flavor preferences set during campaign creation */
export type CampaignTone = 'heroic' | 'gritty' | 'political' | 'dungeon-crawl' | 'horror' | 'mystery';
export type PacingSetting = 'fast' | 'moderate' | 'slow';

export interface CampaignPreferences {
  campaignName: string;
  tone: CampaignTone;
  themes: string[];                      // e.g., ["undead", "intrigue", "nature"]
  pacing: PacingSetting;
  aiModel?: string;                      // Optional OpenAI model override for this campaign/session
  mapTheme?: string;                     // Optional map/terrain theme override (dungeon, cave, wilderness, etc.)
  mapSubTheme?: string | string[];       // Optional sub-biome(s) within the main theme (campsite, river, ruins, etc.)
  mode?: 'campaign' | 'encounter';       // Whether this is a full campaign or combat-only encounter
  encounterBalance: 'easy' | 'moderate' | 'hard' | 'deadly';
  playerCount: number;
  averageLevel: number;
  allowPvP: boolean;
  customNotes?: string;                  // Free text GM notes about the campaign
}

/** Narrative tension tracker — drives GM narration style and encounter scaling */
export interface TensionTracker {
  score: number;                         // 0-100
  trend: 'rising' | 'stable' | 'falling';
  lastUpdated: number;                   // timestamp
  history: { score: number; reason: string; timestamp: number }[];
}

export type TensionBand = 'low' | 'mid' | 'high' | 'critical';

/** A recurring NPC tracked across the campaign */
export interface RecurringNPC {
  id: string;
  name: string;
  role: 'ally' | 'enemy' | 'neutral' | 'bbeg';
  disposition: number;                   // -100 (hostile) to 100 (friendly)
  description: string;
  location?: string;
  interactions: { summary: string; timestamp: number }[];
  isAlive: boolean;
  secretGoal?: string;                   // Known only to GM
}

/** BBEG & overarching story arc */
export interface StoryArc {
  bbegId?: string;                       // Links to RecurringNPC
  bbegName: string;
  bbegMotivation: string;
  keyLocations: string[];                // Important places in the story (e.g., "The Sunken Temple", "Ironhold Keep")
  storyPhase: 'setup' | 'rising-action' | 'climax' | 'resolution';
  milestones: { description: string; completed: boolean; timestamp?: number }[];
  secretPlots: string[];                 // Background events the players don't know yet
}

/** Session summary & notes */
export interface SessionNote {
  id: string;
  sessionNumber: number;
  title: string;
  summary: string;
  keyDecisions: string[];
  npcsEncountered: string[];             // NPC IDs
  encountersCompleted: number;
  timestamp: number;
}

export interface SceneVisualState {
  imageUrl: string;
  caption: string;
  source: 'opening' | 'encounter' | 'gm' | 'ai';
  mapId?: string;
  mapName?: string;
  updatedAt: number;
}

/** Individual chat message in the GM conversation */
export interface GMChatMessage {
  id: string;
  role: 'player' | 'gm' | 'system';
  content: string;
  timestamp: number;
  /** If the GM triggered a mechanical action, reference it here */
  mechanicalAction?: {
    actionType: 'add-creature' | 'apply-condition' | 'change-terrain' | 'adjust-tension' | 'start-encounter' | 'end-encounter' | 'award-xp' | 'narrate' | 'set-encounter-map' | 'place-npc' | 'remove-npc' | 'place-creature-npc' | 'aggro-npc';
    details: Record<string, any>;
    success: boolean;
    ruleEngineMessage?: string;
  };
}

/** Complete GM session state — persisted alongside GameState */
export interface GMSession {
  campaignPreferences: CampaignPreferences;
  tensionTracker: TensionTracker;
  chatHistory: GMChatMessage[];
  sessionNotes: SessionNote[];
  recurringNPCs: RecurringNPC[];
  storyArc?: StoryArc;
  currentPhase: 'exploration' | 'combat' | 'social' | 'rest' | 'travel';
  difficulty: 'easy' | 'normal' | 'hard' | 'deadly';
  encounterCount: number;
  xpAwarded: number;
  currentSceneVisual?: SceneVisualState;
  currentEncounterMapId?: string;
  /** Whether AI combat narration is enabled (costs AI tokens) */
  combatNarrationEnabled?: boolean;
  /** Max tokens for combat narration AI calls (default 300) */
  narrationMaxTokens?: number;
  /** Max tokens for general GM chat AI responses (default 1500) */
  gmResponseMaxTokens?: number;
  /** NPCs stashed before combat — restored after encounter conclusion */
  stashedNPCs?: Creature[];
  /** Exploration map stashed before combat — restored after encounter conclusion */
  stashedMap?: any;
  /** Exploration map ID stashed before combat */
  stashedMapId?: string;
}

/** Map theme values shared between EncounterMapTemplate and ProceduralMap */
export type MapTheme = 'dungeon' | 'wilderness' | 'urban' | 'indoor' | 'special' | 'ship' | 'tower' | 'bridge' | 'caravan' | 'sewers' | 'castle' | 'mine';

/** Encounter map template from the pre-made library */
export interface EncounterMapTemplate {
  id: string;
  name: string;
  theme: MapTheme;
  subTheme: string;                      // e.g., "corridors", "throne-room", "forest", "tavern"
  description: string;
  width: number;
  height: number;
  terrain: TerrainTile[][];
  startingZones: {
    players: Position[];
    enemies: Position[];
  };
  features: MapFeature[];
  /** Optional background image URL (relative to /maps/ e.g. "cave-entrance.webp") */
  imageUrl?: string;
  /** Comma-separated tags to help GM AI pick the right map (e.g. "dark, narrow, underground, spiders") */
  tags?: string[];
}

export interface MapFeature {
  name: string;
  type: 'wall' | 'difficult-terrain' | 'cover' | 'elevation' | 'hazard' | 'door' | 'trap' | 'water' | 'lava' | 'pit';
  positions: Position[];
  description?: string;
}

// ─── COMPANION / PET / FAMILIAR / EIDOLON SYSTEM ──────────────────────────────────

/** Companion maturity level — determines stat scaling */
export type CompanionMaturity = 'young' | 'mature' | 'nimble' | 'savage' | 'specialized' | 'incredible';

/** What kind of companion this is */
export type CompanionType = 'animal-companion' | 'familiar' | 'eidolon' | 'construct-companion' | 'undead-companion' | 'plant-companion';

/**
 * A companion creature that exists alongside a player creature.
 * Extends Creature with companion-specific fields.
 */
export interface CompanionCreature extends Creature {
  /** What type of companion */
  companionType: CompanionType;
  /** Owner creature ID (the PC who controls this companion) */
  ownerId: string;
  /** Whether this companion is currently manifested/summoned on the battlefield */
  manifested: boolean;
  /** Species template ID from companion catalog (e.g., 'bear', 'cat', 'horse', 'bird') */
  speciesId: string;

  // ── Animal Companion specific ──
  /** Current maturity level — determines stat block */
  maturity?: CompanionMaturity;
  /** Support benefit description (granted to owner when companion uses Support action) */
  supportBenefit?: string;
  /** Advanced maneuver name (unlocked at Nimble/Savage) */
  advancedManeuver?: string;
  /** Specialization chosen (e.g., 'ambusher', 'wrecker', 'tracker', 'daredevil', etc.) */
  specialization?: string;
  /** Whether the companion has acted this turn (minion trait — only acts when Commanded) */
  commandedThisTurn?: boolean;
  /** Actions granted when commanded (default 2 for animal companions) */
  commandedActions?: number;

  // ── Eidolon specific ──
  /** Eidolon subtype (e.g., 'angel', 'beast', 'dragon', 'demon', 'phantom', 'plant', 'psychopomp', 'fey', 'construct') */
  eidolonSubtype?: string;
  /** Whether HP is shared with owner (Summoner eidolons share HP pool) */
  sharedHpPool?: boolean;
  /** Evolution feats applied to this eidolon */
  evolutionFeats?: string[];

  // ── Familiar specific ──
  /** Familiar abilities active today (resolved from owner.familiar.selectedAbilities) */
  familiarAbilities?: string[];
  /** Master abilities active today (abilities that benefit the master) */
  masterAbilities?: string[];
  /** Whether the familiar can act independently (requires Independent ability) */
  canActIndependently?: boolean;
}

/** Template for an animal companion species from the catalog */
export interface AnimalCompanionTemplate {
  id: string;
  name: string;
  /** Size at young maturity */
  size: CreatureSize;
  /** Size when it matures (usually +1 step) */
  matureSize?: CreatureSize;
  /** Base speed in feet */
  speed: number;
  /** Special movement modes */
  specialSpeeds?: { type: 'fly' | 'swim' | 'climb' | 'burrow'; speed: number }[];
  /** Base ability modifiers at young maturity: [STR, DEX, CON, INT, WIS, CHA] */
  abilityMods: [number, number, number, number, number, number];
  /** Base HP (before level scaling) */
  baseHp: number;
  /** Natural attacks */
  attacks: { name: string; damage: string; damageType: DamageType; traits?: string[] }[];
  /** Base skill proficiencies */
  skills: string[];
  /** Senses (e.g., 'low-light vision', 'scent (imprecise) 30 feet') */
  senses?: string[];
  /** Support benefit text */
  supportBenefit: string;
  /** Advanced maneuver (unlocked at Nimble/Savage) */
  advancedManeuver?: { name: string; actions: number; description: string };
}

/** A familiar ability that can be selected daily */
export interface FamiliarAbility {
  id: string;
  name: string;
  type: 'familiar' | 'master';  // Familiar ability = on familiar, Master ability = benefits master
  description: string;
  /** Mechanical effect summary */
  mechanics: string;
  /** Whether this requires a specific class/feat prerequisite */
  prerequisite?: string;
  /** Whether this is unique (can't be stacked with multiple selections) */
  unique?: boolean;
}

/** Template for eidolon subtypes */
export interface EidolonTemplate {
  id: string;
  name: string;
  tradition: 'arcane' | 'divine' | 'occult' | 'primal';
  /** Base size */
  size: CreatureSize;
  /** AC bonus progression */
  acBonus: number;
  /** DEX cap for armor */
  dexCap: number;
  /** Base ability boosts: [STR, DEX, CON, INT, WIS, CHA] mods */
  abilityMods: [number, number, number, number, number, number];
  /** Base HP (added to summoner's HP pool) */
  baseHp: number;
  /** Speed in feet */
  speed: number;
  /** Special speeds */
  specialSpeeds?: { type: 'fly' | 'swim' | 'climb'; speed: number }[];
  /** Primary attack */
  primaryAttack: { name: string; damage: string; damageType: DamageType; traits?: string[] };
  /** Secondary attack */
  secondaryAttack: { name: string; damage: string; damageType: DamageType; traits?: string[] };
  /** Unique eidolon ability */
  initialAbility: { name: string; description: string };
  /** Alignment restrictions */
  alignmentRestriction?: string;
  /** Skill proficiencies */
  skills: string[];
  /** Senses */
  senses?: string[];
}

// ─── BUG REPORT SYSTEM ──────────────────────────────────

export type BugReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugReportStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'wont-fix';
export type BugReportCategory =
  | 'gameplay'
  | 'combat'
  | 'character'
  | 'ui'
  | 'map'
  | 'ai'
  | 'rules'
  | 'performance'
  | 'crash'
  | 'other';

export interface BugReport {
  /** Unique identifier */
  id: string;
  /** Short descriptive title */
  title: string;
  /** Detailed description of the bug */
  description: string;
  /** Steps to reproduce (optional) */
  stepsToReproduce?: string;
  /** Expected behaviour */
  expectedBehaviour?: string;
  /** Actual behaviour */
  actualBehaviour?: string;
  /** Bug category */
  category: BugReportCategory;
  /** Severity level */
  severity: BugReportSeverity;
  /** Current status */
  status: BugReportStatus;
  /** When the bug was reported (ISO timestamp) */
  createdAt: string;
  /** When the bug was last updated (ISO timestamp) */
  updatedAt: string;
  /** Which page/mode the user was on when filing (e.g. 'combat', 'landing', 'character-builder') */
  context?: string;
  /** Active game ID at time of report, if any */
  gameId?: string;
  /** Browser / user-agent string */
  userAgent?: string;
  /** Screen resolution at time of report */
  screenResolution?: string;
  /** Optional dev notes for triage */
  devNotes?: string;
}