import { DamageType } from './spells';
import { AbilityScores, AbilityName, ProficiencyProfile, ProficiencyRank, Bonus, Penalty } from './bonuses';
export type { DamageType };
export type { AbilityScores, AbilityName, ProficiencyProfile, ProficiencyRank, Bonus, Penalty };
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
    potencyRune?: 1 | 2 | 3;
    strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
    propertyRunes?: string[];
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
/**
 * PF2e Immunity Type — broader than DamageType.
 * Creatures can be immune to damage types AND to conditions/effects.
 * Examples: 'fire', 'bleed', 'death-effects', 'paralyzed', 'disease'
 */
export type ImmunityType = DamageType | 'blinded' | 'confused' | 'controlled' | 'dazzled' | 'doomed' | 'drained' | 'fascinated' | 'grabbed' | 'off-guard' | 'paralyzed' | 'petrified' | 'prone' | 'restrained' | 'sleep' | 'unconscious' | 'critical-hits' | 'curse' | 'death-effects' | 'disease' | 'emotion' | 'fear-effects' | 'fortune-effects' | 'illusion' | 'misfortune-effects' | 'nonlethal-attacks' | 'olfactory' | 'polymorph' | 'possession' | 'scrying' | 'swarm-mind' | 'visual';
export interface DamageResistance {
    type: DamageType;
    value: number;
    source?: string;
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
/** PF2e creature sizes — determines space, reach, and various size-dependent rules */
export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
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
    abilities: AbilityScores;
    /** PF2e creature size (default: 'medium'). Determines space, reach, and grapple bonuses. */
    size?: CreatureSize;
    /** Grid space in squares (tiny=0.5, small/medium=1, large=2, huge=3, gargantuan=4). Derived from size. */
    space?: number;
    /** Base unarmed/natural melee reach in feet before weapon/feat overrides (tiny=0, small/medium=5, large=10, huge=15, gargantuan=20). */
    naturalReach?: number;
    /** Barbarian instinct (e.g., 'animal', 'dragon', 'fury', 'giant', 'spirit', 'superstition') */
    barbarianInstinct?: string;
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
    maxHealth: number;
    currentHealth: number;
    temporaryHealth?: number;
    proficiencies: ProficiencyProfile;
    armorClass: number;
    equippedWeapon?: string;
    armorBonus: number;
    equippedArmor?: string;
    equippedShield?: string;
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
    bonuses: Bonus[];
    penalties: Penalty[];
    /** Speed in feet (e.g., 25, 30) — used for Stride action range calculation */
    speed: number;
    positions: Position;
    conditions: Condition[];
    initiative: number;
    initiativeBonus?: number;
    attacksMadeThisTurn: number;
    attackTargetsThisTurn?: string[];
    actionsRemaining?: number;
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
    damageImmunities: ImmunityType[];
    damageWeaknesses: DamageWeakness[];
    feats?: {
        name: string;
        type: string;
        level: number;
    }[];
    specials?: string[];
    skills?: {
        name: string;
        proficiency: ProficiencyRank;
        bonus: number;
        abilityMod: number;
        profBonus: number;
    }[];
    lores?: {
        name: string;
        bonus: number;
    }[];
    /** @deprecated Use weaponInventory instead. Kept for Pathbuilder import compat. See LOW-15. */
    weaponDisplay?: string;
    /** @deprecated Use weaponInventory instead */
    pbAttackBonus?: number;
    /** @deprecated Use weaponInventory instead */
    weaponDamageDice?: string;
    /** @deprecated Use weaponInventory instead */
    weaponDamageBonus?: number;
    /** @deprecated Use weaponInventory instead */
    weaponDamageType?: DamageType;
    characterClass?: string;
    currentXP?: number;
    rogueRacket?: 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger';
    rogueDeity?: string;
    consciousMind?: string;
    subconsciousMind?: string;
    unleashPsycheActive?: boolean;
    unleashPsycheRoundsLeft?: number;
    unleashPsycheUsedThisEncounter?: boolean;
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
    rageActive?: boolean;
    rageRoundsLeft?: number;
    rageUsedThisEncounter?: boolean;
    secondWindUsed?: boolean;
    lastStrikeResult?: 'hit' | 'miss' | 'crit';
    huntedPreyId?: string;
    huntersEdge?: 'flurry' | 'precision' | 'outwit';
    championCause?: 'paladin' | 'liberator' | 'redeemer';
    kiStrikeActive?: boolean;
    kineticAuraActive?: boolean;
    kineticElement?: string;
    kineticElementSecondary?: string;
    gatheredElement?: boolean;
    overflowUsedThisRound?: boolean;
    druidOrder?: string;
    wildShapeActive?: boolean;
    wildShapeForm?: string;
    wildShapeRoundsLeft?: number;
    wildShapeOriginalStats?: {
        strength?: number;
        dexterity?: number;
        armorClass?: number;
        speed?: number;
        attacks?: CreatureWeapon[];
    };
    bardMuse?: string;
    courageousAnthemActive?: boolean;
    courageousAnthemRoundsLeft?: number;
    classSpecific?: {
        hasPanache?: boolean;
        hasStratagem?: boolean;
        strategemTargetId?: string;
        strategemRoll?: number;
        exploitVulnerabilityTargetId?: string;
        exploitVulnerabilityType?: 'mortal-weakness' | 'personal-antithesis';
        gunslingerWay?: string;
        overdriveActive?: boolean;
        overdriveLevel?: 'normal' | 'critical';
        unstableActive?: boolean;
        curseLevel?: 'minor' | 'moderate' | 'major' | 'extreme';
        oracleMystery?: string;
        infusedReagents?: number;
        ikons?: string[];
        immanenceIkon?: string;
        transcendenceAvailable?: boolean;
        eidolonType?: string;
        actTogetherUsed?: boolean;
    };
    /** IDs of companion creatures this creature owns (appear in GameState.companions) */
    companionIds?: string[];
    /** Familiar tracking — only if this creature HAS a familiar */
    familiar?: {
        id: string;
        abilitiesPerDay: number;
        selectedAbilities: string[];
    };
    /** Summoner eidolon link — only for Summoner class */
    eidolonId?: string;
    /** Spell slot usage tracking — rank -> number of slots used today */
    spellSlotsUsed?: Record<number, number>;
    /** NPC disposition — used for bestiary creatures placed as NPCs during exploration */
    npcDisposition?: 'hostile' | 'neutral' | 'friendly';
    /** Original bestiary creature name — set when placed via place-creature-npc, used for combat transition */
    bestiaryName?: string;
    /** PHASE 8: Delay action tracking */
    isDelaying?: boolean;
    /** PHASE 8: Ready action tracking */
    readyAction?: {
        actionId: string;
        targetId?: string;
        trigger: string;
        triggerType?: 'movement' | 'attack' | 'spell' | 'custom';
    };
    /** PHASE 9.6: Consumable inventory */
    consumables?: {
        id: string;
        quantity: number;
    }[];
    /** Senses (e.g., 'darkvision', 'low-light vision', 'greater darkvision', 'scent (imprecise) 30 feet') */
    senses?: string[];
    /** Token image URL — displayed on the battle grid (base64 data URL or file path) */
    tokenImageUrl?: string;
    /** Portrait/art image URL — displayed in character sheets and panels (base64 data URL or file path) */
    portraitImageUrl?: string;
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
    actionCost: number | 'reaction' | 'free';
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
    /** Companion creatures (animal companions, familiars, eidolons, minions) — keyed by companion ID */
    companions?: CompanionCreature[];
    map: EncounterMap;
    currentRound: CombatRound;
    log: GameLog[];
    groundObjects: GroundObject[];
    gmSession?: GMSession;
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
/**
 * PHASE 11: Character Builder & Management
 * Comprehensive character sheet for character creation and tracking
 */
export interface SkillProficiency {
    name: string;
    proficiency: ProficiencyRank;
    ability: AbilityName;
    bonus?: number;
}
/** PF2e Remaster: 1000 XP per level (flat, same threshold every level) */
export declare const XP_PER_LEVEL = 1000;
export interface CharacterSheet {
    id: string;
    name: string;
    level: number;
    currentXP: number;
    createdAt: number;
    updatedAt?: number;
    exportedAt?: number;
    ancestry: string;
    heritage: string;
    background: string;
    class: string;
    pronouns?: string;
    age?: string;
    height?: string;
    weight?: string;
    description?: string;
    abilities: AbilityScores;
    proficiencies: ProficiencyProfile;
    skills: SkillProficiency[];
    classSpecific?: {
        rogueRacket?: 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger';
        rogueDeity?: string;
        consciousMind?: string;
        subconsciousMind?: string;
        hybridStudy?: string;
        bloodline?: string;
        arcaneSchool?: string;
        instinct?: string;
        championCause?: string;
        huntersEdge?: string;
        doctrine?: string;
        kineticElement?: string;
        kineticElementSecondary?: string;
        kineticGateType?: 'single' | 'dual';
        druidOrder?: string;
        bardMuse?: string;
        guardianWay?: string;
        swashbucklerStyle?: string;
        hasPanache?: boolean;
        investigatorMethodology?: string;
        hasStratagem?: boolean;
        strategemTargetId?: string;
        strategemRoll?: number;
        thaumaturgeImplement1?: string;
        thaumaturgeImplement2?: string;
        thaumaturgeImplement3?: string;
        exploitVulnerabilityTargetId?: string;
        exploitVulnerabilityType?: 'mortal-weakness' | 'personal-antithesis';
        commanderBanner?: string;
        commanderTactics?: string[];
        gunslingerWay?: string;
        innovationType?: string;
        overdriveActive?: boolean;
        overdriveLevel?: 'normal' | 'critical';
        unstableActive?: boolean;
        witchPatron?: string;
        witchFamiliarAbilities?: string[];
        oracleMystery?: string;
        curseLevel?: 'minor' | 'moderate' | 'major' | 'extreme';
        researchField?: string;
        infusedReagents?: number;
        apparitions?: string[];
        ikons?: string[];
        immanenceIkon?: string;
        transcendenceAvailable?: boolean;
        eidolonType?: string;
        eidolonHPCurrent?: number;
        actTogetherUsed?: boolean;
        archetypeConsciousMind?: string;
        archetypePsiCantrip?: string;
        archetypePsiCantrip2?: string;
    };
    weaponIds?: string[];
    weaponRunes?: {
        potencyRune?: 1 | 2 | 3;
        strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
        propertyRunes?: string[];
    }[];
    armorId?: string;
    armorRunes?: {
        potencyRune?: 1 | 2 | 3;
        resilientRune?: 'resilient' | 'greater-resilient' | 'major-resilient';
        propertyRunes?: string[];
    };
    shieldId?: string;
    handwrapRunes?: {
        potencyRune?: 1 | 2 | 3;
        strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
        propertyRunes?: string[];
    };
    inventory?: {
        id: string;
        itemName: string;
        quantity: number;
    }[];
    /** Equipped worn & held magic item IDs — from WORN_ITEMS catalog */
    equippedWornItems?: string[];
    remainingGold?: number;
    feats?: {
        name: string;
        level: number;
        type: 'class' | 'skill' | 'general' | 'ancestry' | 'archetype';
    }[];
    traits?: string[];
    specialNotes?: string;
    /** All spells known — spellbook for prepared, repertoire for spontaneous */
    knownSpells?: string[];
    /** Spells prepared in slots for today (prepared casters only). rank -> spell IDs */
    preparedSpells?: Record<number, string[]>;
    /** Cantrips selected from known spells (always prepared / always available) */
    knownCantrips?: string[];
    maxHealth?: number;
    armorClass?: number;
    /** Token image — displayed on the battle grid. Base64 data URL or relative path. */
    tokenImageUrl?: string;
    /** Portrait/full art — displayed in character sheets and panels. Base64 data URL or relative path. */
    portraitImageUrl?: string;
    /** Full BuilderState snapshot — allows re-opening the character in the builder for editing */
    builderState?: any;
    currentHealth?: number;
    conditions?: Condition[];
    savingThrows?: {
        fortitude: number;
        reflex: number;
        will: number;
    };
}
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
    optionalRules: {
        gradualAbilityBoosts: boolean;
        ancestryParagon: boolean;
        freeArchetype: boolean;
    };
    /** Items in the shared party stash */
    stash?: StashItem[];
    /** Gold pieces held in the party treasury */
    stashGold?: number;
}
export interface PathbuilderCharacter {
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
    [key: string]: any;
}
/** Campaign tone/flavor preferences set during campaign creation */
export type CampaignTone = 'heroic' | 'gritty' | 'political' | 'dungeon-crawl' | 'horror' | 'mystery';
export type PacingSetting = 'fast' | 'moderate' | 'slow';
export interface CampaignPreferences {
    campaignName: string;
    tone: CampaignTone;
    themes: string[];
    pacing: PacingSetting;
    aiModel?: string;
    mapTheme?: string;
    mapSubTheme?: string | string[];
    mode?: 'campaign' | 'encounter';
    encounterBalance: 'easy' | 'moderate' | 'hard' | 'deadly';
    playerCount: number;
    averageLevel: number;
    allowPvP: boolean;
    customNotes?: string;
}
/** Narrative tension tracker — drives GM narration style and encounter scaling */
export interface TensionTracker {
    score: number;
    trend: 'rising' | 'stable' | 'falling';
    lastUpdated: number;
    history: {
        score: number;
        reason: string;
        timestamp: number;
    }[];
}
export type TensionBand = 'low' | 'mid' | 'high' | 'critical';
/** A recurring NPC tracked across the campaign */
export interface RecurringNPC {
    id: string;
    name: string;
    role: 'ally' | 'enemy' | 'neutral' | 'bbeg';
    disposition: number;
    description: string;
    location?: string;
    interactions: {
        summary: string;
        timestamp: number;
    }[];
    isAlive: boolean;
    secretGoal?: string;
}
/** BBEG & overarching story arc */
export interface StoryArc {
    bbegId?: string;
    bbegName: string;
    bbegMotivation: string;
    keyLocations: string[];
    storyPhase: 'setup' | 'rising-action' | 'climax' | 'resolution';
    milestones: {
        description: string;
        completed: boolean;
        timestamp?: number;
    }[];
    secretPlots: string[];
}
/** Session summary & notes */
export interface SessionNote {
    id: string;
    sessionNumber: number;
    title: string;
    summary: string;
    keyDecisions: string[];
    npcsEncountered: string[];
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
    subTheme: string;
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
    /** Eidolon subtype (e.g., 'angel', 'beast', 'dragon', 'demon', 'phantom', 'plant', 'psychopomp', 'fey', 'construct') */
    eidolonSubtype?: string;
    /** Whether HP is shared with owner (Summoner eidolons share HP pool) */
    sharedHpPool?: boolean;
    /** Evolution feats applied to this eidolon */
    evolutionFeats?: string[];
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
    specialSpeeds?: {
        type: 'fly' | 'swim' | 'climb' | 'burrow';
        speed: number;
    }[];
    /** Base ability modifiers at young maturity: [STR, DEX, CON, INT, WIS, CHA] */
    abilityMods: [number, number, number, number, number, number];
    /** Base HP (before level scaling) */
    baseHp: number;
    /** Natural attacks */
    attacks: {
        name: string;
        damage: string;
        damageType: DamageType;
        traits?: string[];
    }[];
    /** Base skill proficiencies */
    skills: string[];
    /** Senses (e.g., 'low-light vision', 'scent (imprecise) 30 feet') */
    senses?: string[];
    /** Support benefit text */
    supportBenefit: string;
    /** Advanced maneuver (unlocked at Nimble/Savage) */
    advancedManeuver?: {
        name: string;
        actions: number;
        description: string;
    };
}
/** A familiar ability that can be selected daily */
export interface FamiliarAbility {
    id: string;
    name: string;
    type: 'familiar' | 'master';
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
    specialSpeeds?: {
        type: 'fly' | 'swim' | 'climb';
        speed: number;
    }[];
    /** Primary attack */
    primaryAttack: {
        name: string;
        damage: string;
        damageType: DamageType;
        traits?: string[];
    };
    /** Secondary attack */
    secondaryAttack: {
        name: string;
        damage: string;
        damageType: DamageType;
        traits?: string[];
    };
    /** Unique eidolon ability */
    initialAbility: {
        name: string;
        description: string;
    };
    /** Alignment restrictions */
    alignmentRestriction?: string;
    /** Skill proficiencies */
    skills: string[];
    /** Senses */
    senses?: string[];
}
export type BugReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugReportStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'wont-fix';
export type BugReportCategory = 'gameplay' | 'combat' | 'character' | 'ui' | 'map' | 'ai' | 'rules' | 'performance' | 'crash' | 'other';
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
