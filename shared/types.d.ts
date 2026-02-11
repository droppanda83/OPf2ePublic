import { DamageType } from './spells';
import { AbilityScores, AbilityName, ProficiencyProfile, Bonus, Penalty } from './bonuses';
export type { DamageType };
export type { AbilityScores, AbilityName, ProficiencyProfile, Bonus, Penalty };
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
    consciousMind?: string;
    /** If the dedication grants spellcasting */
    spellcasting?: {
        tradition: 'arcane' | 'divine' | 'occult' | 'primal';
        type: 'cantrip' | 'prepared' | 'spontaneous';
    };
}
export interface DamageResistance {
    type: DamageType;
    value: number;
}
export interface DamageWeakness {
    type: DamageType;
    value: number;
}
export interface SpellSlot {
    level: number;
    available: number;
    max: number;
}
export interface CastableSpell {
    name: string;
    level: number;
    tradition?: 'arcane' | 'divine' | 'occult' | 'primal';
    usage?: 'at-will' | 'once-per-day' | 'twice-per-day' | 'three-times-per-day' | 'once-per-week';
    traits?: string[];
}
export interface SpellcasterTradition {
    tradition: 'arcane' | 'divine' | 'occult' | 'primal';
    castingType: 'prepared' | 'spontaneous' | 'innate';
    spells: CastableSpell[];
    slots: SpellSlot[];
    spellAttackBonus?: number;
    spellDC?: number;
}
export interface Creature {
    id: string;
    name: string;
    type: 'player' | 'npc' | 'creature';
    level: number;
    abilities: AbilityScores;
    maxHealth: number;
    currentHealth: number;
    proficiencies: ProficiencyProfile;
    armorClass: number;
    equippedWeapon?: string;
    armorBonus: number;
    equippedShield?: string;
    shieldRaised: boolean;
    currentShieldHp?: number;
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
    bonuses: Bonus[];
    penalties: Penalty[];
    /** Speed in feet (e.g., 25, 30) — used for Stride action range calculation */
    speed: number;
    positions: Position;
    conditions: Condition[];
    initiative: number;
    initiativeBonus?: number;
    attacksMadeThisTurn: number;
    flourishUsedThisTurn?: boolean;
    reactionUsed?: boolean;
    dying: boolean;
    dead?: boolean;
    deathSaveFailures: number;
    deathSaveSuccesses: number;
    deathSaveMadeThisTurn: boolean;
    wounded: number;
    keyAbility?: AbilityName;
    spellcasters?: SpellcasterTradition[];
    spells?: string[];
    damageResistances: DamageResistance[];
    damageImmunities: DamageType[];
    damageWeaknesses: DamageWeakness[];
    feats?: {
        name: string;
        type: string;
        level: number;
    }[];
    specials?: string[];
    skills?: {
        name: string;
        proficiency: string;
        bonus: number;
        abilityMod: number;
        profBonus: number;
    }[];
    lores?: {
        name: string;
        bonus: number;
    }[];
    weaponDisplay?: string;
    pbAttackBonus?: number;
    weaponDamageDice?: string;
    weaponDamageBonus?: number;
    weaponDamageType?: string;
    characterClass?: string;
    ancestry?: string;
    heritage?: string;
    focusPoints?: number;
    maxFocusPoints?: number;
    heroPoints?: number;
    focusSpells?: {
        name: string;
        level: number;
        type: 'cantrip' | 'spell';
        ampable?: boolean;
        tradition?: string;
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
    duration: number | 'permanent';
    value?: number;
    isPersistentDamage?: boolean;
    damageFormula?: string;
    damageType?: DamageType;
    damagePerTurn?: number;
    source?: string;
    sourceEffectDC?: number;
    appliesAgainst?: string;
    attackType?: 'melee' | 'ranged';
    usesRemaining?: number;
    expiresOnTurnEndOf?: string;
    turnEndsRemaining?: number;
}
export interface Action {
    id: string;
    name: string;
    type: 'strike' | 'spell' | 'ability' | 'movement';
    actionCost: number;
    description: string;
}
export interface CombatRound {
    number: number;
    turnOrder: string[];
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
    id: string;
    weapon: CreatureWeapon;
    position: Position;
    droppedByCreatureId: string;
    droppedAtRound: number;
}
export interface GameState {
    id: string;
    name: string;
    creatures: Creature[];
    map: EncounterMap;
    currentRound: CombatRound;
    log: GameLog[];
    groundObjects: GroundObject[];
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
    attackerAC?: number;
    target: string;
    targetAC: number;
    d20: number;
    bonus: number;
    total: number;
    result: 'critical-success' | 'success' | 'failure' | 'critical-failure';
    marginOfSuccess?: number;
    damage?: DamageResult;
}
export interface DamageResult {
    dice: DiceRoll;
    isCriticalHit: boolean;
    total: number;
    appliedDamage: number;
}
export interface AITurnRequest {
    gameState: GameState;
    currentCreatureId: string;
    availableActions: Action[];
}
export interface AITurnResponse {
    action: CombatAction;
    reasoning: string;
}
