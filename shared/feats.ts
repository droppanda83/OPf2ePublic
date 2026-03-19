/**
 * Centralized Feat & Class Feature Catalog (Barrel File)
 * 
 * This file re-exports all feat data from domain-specific modules
 * and provides the master FEAT_CATALOG along with helper functions.
 * 
 * File organization:
 *   featTypes.ts       - FeatEntry, FeatCategory, ImplementationStatus types
 *   sharedFeats.ts     - Shared class feature templates (Weapon Specialization, Evasion, etc.)
 *   fighterFeats.ts    - Fighter class features + selectable class feats
 *   rogueFeats.ts      - Rogue class features + selectable class feats
 *   psychicFeats.ts    - Psychic class features + selectable class feats
 *   skillFeats.ts      - SKILL_FEAT_CATALOG (general skill feats)
 *   generalFeats.ts    - GENERAL_FEAT_CATALOG (general non-skill feats)
 *   ancestryFeats.ts   - ANCESTRY_FEAT_CATALOG (all ancestry feats)
 *   archetypeFeats.ts  - ARCHETYPE_FEAT_CATALOG (dedication/archetype feats)
 * 
 * Categories:
 * - 'class_feature': Granted automatically at the specified level (not selectable)
 * - 'class': Selectable class feats (chosen during level-up)
 * - 'skill': Selectable skill feats
 * - 'general': Selectable general feats
 * - 'ancestry': Selectable ancestry feats
 * - 'archetype': Dedication and archetype feats
 */

// Re-export shared types
export type { FeatCategory, ImplementationStatus, FeatEntry } from './featTypes';

// Re-export shared feat templates and factory (for use by future class files)
export { createClassFeature } from './sharedFeats';
export type { SharedFeatTemplate } from './sharedFeats';
export {
  WEAPON_SPECIALIZATION,
  GREATER_WEAPON_SPECIALIZATION,
  EVASION,
  IMPROVED_EVASION,
  RESOLVE,
  JUGGERNAUT,
  ALERTNESS,
  SHIELD_BLOCK,
} from './sharedFeats';

// Re-export class-specific feats
export { FIGHTER_CLASS_FEATURES, FIGHTER_CLASS_FEATS } from './fighterFeats';
export { ROGUE_CLASS_FEATURES, ROGUE_CLASS_FEATS } from './rogueFeats';
export { PSYCHIC_CLASS_FEATURES, PSYCHIC_CLASS_FEATS } from './psychicFeats';
export { MAGUS_CLASS_FEATURES, MAGUS_CLASS_FEATS } from './magusFeats';
export { SORCERER_CLASS_FEATURES, SORCERER_CLASS_FEATS } from './sorcererFeats';
export { WIZARD_CLASS_FEATURES, WIZARD_CLASS_FEATS } from './wizardFeats';
export { BARBARIAN_CLASS_FEATURES, BARBARIAN_CLASS_FEATS } from './barbarianFeats';
export { CHAMPION_CLASS_FEATURES, CHAMPION_CLASS_FEATS } from './championFeats';
export { MONK_CLASS_FEATURES, MONK_CLASS_FEATS } from './monkFeats';
export { RANGER_CLASS_FEATURES, RANGER_CLASS_FEATS } from './rangerFeats';
export { CLERIC_CLASS_FEATURES, CLERIC_CLASS_FEATS } from './clericFeats';
export { KINETICIST_CLASS_FEATURES, KINETICIST_CLASS_FEATS } from './kineticistFeats';
export { DRUID_CLASS_FEATURES, DRUID_CLASS_FEATS } from './druidFeats';
export { BARD_CLASS_FEATURES, BARD_CLASS_FEATS } from './bardFeats';
export { GUARDIAN_CLASS_FEATURES, GUARDIAN_CLASS_FEATS } from './guardianFeats';
export { SWASHBUCKLER_CLASS_FEATURES, SWASHBUCKLER_CLASS_FEATS } from './swashbucklerFeats';
export { INVESTIGATOR_CLASS_FEATURES, INVESTIGATOR_CLASS_FEATS } from './investigatorFeats';
export { THAUMATURGE_CLASS_FEATURES, THAUMATURGE_CLASS_FEATS } from './thaumaturgeFeats';
export { COMMANDER_CLASS_FEATURES, COMMANDER_CLASS_FEATS } from './commanderFeats';
export { GUNSLINGER_CLASS_FEATURES, GUNSLINGER_CLASS_FEATS } from './gunslingerFeats';
export { INVENTOR_CLASS_FEATURES, INVENTOR_CLASS_FEATS } from './inventorFeats';
export { WITCH_CLASS_FEATURES, WITCH_CLASS_FEATS } from './witchFeats';
export { ORACLE_CLASS_FEATURES, ORACLE_CLASS_FEATS } from './oracleFeats';
export { ALCHEMIST_CLASS_FEATURES, ALCHEMIST_CLASS_FEATS } from './alchemistFeats';
export { ANIMIST_CLASS_FEATURES, ANIMIST_CLASS_FEATS } from './animistFeats';
export { EXEMPLAR_CLASS_FEATURES, EXEMPLAR_CLASS_FEATS } from './exemplarFeats';
export { SUMMONER_CLASS_FEATURES, SUMMONER_CLASS_FEATS } from './summonerFeats';

// Re-export category feats
export { SKILL_FEAT_CATALOG } from './skillFeats';
export { GENERAL_FEAT_CATALOG } from './generalFeats';
export { ANCESTRY_FEAT_CATALOG } from './ancestryFeats';

// Archetype feats — multiclass dedications
import { ARCHETYPE_FEAT_CATALOG } from './archetypeFeats';
export { ARCHETYPE_FEAT_CATALOG } from './archetypeFeats';

// Archetype feats — standalone archetypes (A–D)
import { STANDALONE_ARCHETYPE_FEATS_AD } from './archetypeFeatsStandaloneAD';
export {
  ACROBAT_FEATS,
  ARCHER_FEATS,
  ASSASSIN_FEATS,
  BASTION_FEATS,
  BEASTMASTER_FEATS,
  BLESSED_ONE_FEATS,
  BOUNTY_HUNTER_FEATS,
  CAVALIER_FEATS,
  CELEBRITY_FEATS,
  DANDY_FEATS,
  DRAGON_DISCIPLE_FEATS,
  STANDALONE_ARCHETYPE_FEATS_AD,
} from './archetypeFeatsStandaloneAD';

// Archetype feats — standalone archetypes (D cont.–G)
import { STANDALONE_ARCHETYPE_FEATS_DG } from './archetypeFeatsStandaloneDG';
export {
  DUAL_WEAPON_WARRIOR_FEATS,
  DUELIST_FEATS,
  ELDRITCH_ARCHER_FEATS,
  FAMILIAR_MASTER_FEATS,
  GLADIATOR_FEATS,
  STANDALONE_ARCHETYPE_FEATS_DG,
} from './archetypeFeatsStandaloneDG';

// Archetype feats — standalone archetypes (H–M)
import { STANDALONE_ARCHETYPE_FEATS_HM } from './archetypeFeatsStandaloneHM';
export {
  HERBALIST_FEATS,
  HORIZON_WALKER_FEATS,
  LINGUIST_FEATS,
  LOREMASTER_FEATS,
  MARSHAL_FEATS,
  MARTIAL_ARTIST_FEATS,
  MAULER_FEATS,
  MEDIC_FEATS,
  STANDALONE_ARCHETYPE_FEATS_HM,
} from './archetypeFeatsStandaloneHM';

// Archetype feats — standalone archetypes (P–W)
import { STANDALONE_ARCHETYPE_FEATS_PW } from './archetypeFeatsStandalonePW';

// Archetype feats — non-Core archetypes (A–C)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_AC } from './archetypeFeatsNonCoreAC';

// Archetype feats — non-Core archetypes (C–E)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_CE } from './archetypeFeatsNonCoreCE';

// Archetype feats — non-Core archetypes (L–T)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_LT } from './archetypeFeatsNonCoreLT';

// Archetype feats — non-Core archetypes (Guns & Gears)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_GG } from './archetypeFeatsNonCoreGG';

// Archetype feats — non-Core archetypes (B–E)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_BE } from './archetypeFeatsNonCoreBE';

// Archetype feats — non-Core archetypes (I–V)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_IV } from './archetypeFeatsNonCoreIV';

// Archetype feats — non-Core archetypes (L–R)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_LR } from './archetypeFeatsNonCoreLR';

// Archetype feats — non-Core archetypes (B–W creatures/battle)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_BW } from './archetypeFeatsNonCoreBW';

// Archetype feats — non-Core archetypes (U–W military/nature)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_UW } from './archetypeFeatsNonCoreUW';

// Archetype feats — non-Core archetypes (C–P scholars/occult)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_CP } from './archetypeFeatsNonCoreCP';

// Archetype feats — non-Core archetypes (F–R: Field Propagandist, Guerrilla, Wylderheart, Razmiran, Rivethun)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_FR } from './archetypeFeatsNonCoreFR';

// Archetype feats — non-Core archetypes (T–H: Tian Xia / Howl of the Wild)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_TH } from './archetypeFeatsNonCoreTH';

// Archetype feats — non-Core archetypes (D–C: Chronoskimmer, Draconic Acolyte, Drake Rider, etc.)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_DC } from './archetypeFeatsNonCoreDC';

// Archetype feats — non-Core archetypes (Guns & Gears Part 2)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_GG2 } from './archetypeFeatsNonCoreGG2';

// Archetype feats — non-Core archetypes (Howl of the Wild: Werecreature, Winged Warrior)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_HW } from './archetypeFeatsNonCoreHW';

// Archetype feats — non-Core archetypes (Mortal Herald)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_MH } from './archetypeFeatsNonCoreMH';

// Archetype feats — non-Core archetypes (Starlit Sentinel, Twilight Speaker, Tattooed Historian)
import { STANDALONE_ARCHETYPE_FEATS_NON_CORE_ST } from './archetypeFeatsNonCoreST';

// Archetype feats — Legacy (Book of the Dead Part 1: Exorcist, Ghost, Ghoul)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_BD1 } from './archetypeFeatsLegacyBD1';

// Archetype feats — Legacy (Book of the Dead Part 2: Hallowed Necromancer, Lich, Mummy)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_BD2 } from './archetypeFeatsLegacyBD2';

// Archetype feats — Legacy (Book of the Dead Part 3: Reanimator, Soul Warden, Undead Master)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_BD3 } from './archetypeFeatsLegacyBD3';

// Archetype feats — Legacy (Book of the Dead Part 4: Undead Slayer, Vampire, Zombie)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_BD4 } from './archetypeFeatsLegacyBD4';

// Archetype feats — Legacy (Secrets of Magic / Grand Bazaar Part 1: Captivator, Cathartic Mage, Flexible Spellcaster, Geomancer)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_SM1 } from './archetypeFeatsLegacySM1';

// Archetype feats — Legacy (Secrets of Magic / Grand Bazaar Part 2: Shadowcaster, Soulforger, Wellspring Mage)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_SM2 } from './archetypeFeatsLegacySM2';

// Archetype feats — Legacy (Grand Bazaar: Spell Trickster)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_SM3 } from './archetypeFeatsLegacySM3';

// Archetype feats — Legacy (Lost Omens CG Part 1: Firebrand Braggart, Hellknight Armiger, Hellknight, Hellknight Signifer)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_LO1 } from './archetypeFeatsLegacyLO1';

// Archetype feats — Legacy (Lost Omens Part 2: Knight Reclaimant, Knight Vigilant, Lastwall Sentry)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_LO2 } from './archetypeFeatsLegacyLO2';

// Archetype feats — Legacy (Lost Omens Part 3: Magaambyan Attendant, Pathfinder Agent, Scrollmaster, Spellmaster)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_LO3 } from './archetypeFeatsLegacyLO3';

// Archetype feats — Legacy (Lost Omens Part 4: Living Monolith, Student of Perfection, Magic Warrior, Runescarred)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_LO4 } from './archetypeFeatsLegacyLO4';

// Archetype feats — Legacy (Lost Omens Part 5: Halcyon Speaker, Crystal Keeper, Zephyr Guard, Turpin Rowe Lumberjack)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_LO5 } from './archetypeFeatsLegacyLO5';

// Archetype feats — Legacy (Lost Omens Part 6: Butterfly Blade, Ghost Eater, Gray Gardener, Bright Lion)
import { STANDALONE_ARCHETYPE_FEATS_LEGACY_LO6 } from './archetypeFeatsLegacyLO6';
export {
  PIRATE_FEATS,
  POISONER_FEATS,
  RITUALIST_FEATS,
  SCOUT_FEATS,
  SCROLL_TRICKSTER_FEATS,
  SCROUNGER_FEATS,
  SENTINEL_FEATS,
  SHADOWDANCER_FEATS,
  SNARECRAFTER_FEATS,
  TALISMAN_DABBLER_FEATS,
  VIGILANTE_FEATS,
  VIKING_FEATS,
  WEAPON_IMPROVISER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_PW,
} from './archetypeFeatsStandalonePW';

// Archetype feats — non-Core archetypes (A–C)
export {
  ALDORI_DUELIST_FEATS,
  ALTER_EGO_FEATS,
  CAPTAIN_FEATS,
  CLAWDANCER_FEATS,
  CROSSBOW_INFILTRATOR_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_AC,
} from './archetypeFeatsNonCoreAC';

// Archetype feats — non-Core archetypes (C–E)
export {
  CURSE_MAELSTROM_FEATS,
  ELEMENTALIST_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_CE,
} from './archetypeFeatsNonCoreCE';

// Archetype feats — non-Core archetypes (L–T)
export {
  LIVING_VESSEL_FEATS,
  MIND_SMITH_FEATS,
  PACTBINDER_FEATS,
  SLEEPWALKER_FEATS,
  TIME_MAGE_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_LT,
} from './archetypeFeatsNonCoreLT';

// Archetype feats — non-Core archetypes (Guns & Gears)
export {
  ARTILLERIST_FEATS,
  BEAST_GUNNER_FEATS,
  BULLET_DANCER_FEATS,
  DEMOLITIONIST_FEATS,
  PISTOL_PHENOM_FEATS,
  SPELLSHOT_FEATS,
  STERLING_DYNAMO_FEATS,
  UNEXPECTED_SHARPSHOOTER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_GG,
} from './archetypeFeatsNonCoreGG';

// Archetype feats — non-Core archetypes (B–E)
export {
  AVENGER_FEATS,
  BATTLE_HARBINGER_FEATS,
  BLACKJACKET_FEATS,
  EAGLE_KNIGHT_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_BE,
} from './archetypeFeatsNonCoreBE';

// Archetype feats — non-Core archetypes (I–V)
export {
  IRIDIAN_CHOIRMASTER_FEATS,
  SENESCHAL_FEATS,
  VENTURE_GOSSIP_FEATS,
  VINDICATOR_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_IV,
} from './archetypeFeatsNonCoreIV';

// Archetype feats — non-Core archetypes (L–R)
export {
  LION_BLADE_FEATS,
  MUNITIONS_MASTER_FEATS,
  PALATINE_DETECTIVE_FEATS,
  PROPHET_OF_KALISTRADE_FEATS,
  RED_MANTIS_ASSASSIN_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_LR,
} from './archetypeFeatsNonCoreLR';

// Archetype feats — non-Core archetypes (B–W creatures/battle)
export {
  BLOODRAGER_FEATS,
  THLIPIT_CONTESTANT_FEATS,
  WILD_MIMIC_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_BW,
} from './archetypeFeatsNonCoreBW';

// Archetype feats — non-Core archetypes (U–W military/nature)
export {
  ULFEN_GUARD_FEATS,
  VERDURAN_SHADOW_FEATS,
  WAR_MAGE_FEATS,
  WARRIOR_OF_LEGEND_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_UW,
} from './archetypeFeatsNonCoreUW';

// Archetype feats — non-Core archetypes (C–P scholars/occult)
export {
  CAMPFIRE_CHRONICLER_FEATS,
  NECROLOGIST_FEATS,
  PSYCHIC_DUELIST_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_CP,
} from './archetypeFeatsNonCoreCP';

// Archetype feats — non-Core archetypes (F–R: Field Propagandist, Guerrilla, Wylderheart, Razmiran, Rivethun)
export {
  FIELD_PROPAGANDIST_FEATS,
  GUERRILLA_FEATS,
  WYLDERHEART_FEATS,
  RAZMIRAN_PRIEST_FEATS,
  RIVETHUN_EMISSARY_FEATS,
  RIVETHUN_INVOKER_FEATS,
  RIVETHUN_INVOLUTIONIST_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_FR,
} from './archetypeFeatsNonCoreFR';

// Archetype feats — non-Core archetypes (T–H: Tian Xia / Howl of the Wild)
export {
  FAMILIAR_SAGE_FEATS,
  FAN_DANCER_FEATS,
  FIVE_BREATH_VANGUARD_FEATS,
  SPIRIT_WARRIOR_FEATS,
  OSTILLI_HOST_FEATS,
  SWARMKEEPER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_TH,
} from './archetypeFeatsNonCoreTH';

// Archetype feats — non-Core archetypes (Mortal Herald)
export {
  MORTAL_HERALD_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_MH,
} from './archetypeFeatsNonCoreMH';

// Archetype feats — non-Core archetypes (D–C: Chronoskimmer, Draconic Acolyte, Drake Rider, etc.)
export {
  CHRONOSKIMMER_FEATS,
  DRACONIC_ACOLYTE_FEATS,
  DRAKE_RIDER_FEATS,
  KITHARODIAN_ACTOR_FEATS,
  LEPIDSTADT_SURGEON_FEATS,
  RUNELORD_FEATS,
  CULTIVATOR_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_DC,
} from './archetypeFeatsNonCoreDC';

// Archetype feats — non-Core archetypes (Guns & Gears Part 2)
export {
  FIREWORK_TECHNICIAN_FEATS,
  OVERWATCH_FEATS,
  SNIPING_DUO_FEATS,
  TRAPSMITH_FEATS,
  TRICK_DRIVER_FEATS,
  VEHICLE_MECHANIC_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_GG2,
} from './archetypeFeatsNonCoreGG2';

// Archetype feats — non-Core archetypes (Howl of the Wild: Werecreature, Winged Warrior)
export {
  WERECREATURE_FEATS,
  WINGED_WARRIOR_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_HW,
} from './archetypeFeatsNonCoreHW';

// Archetype feats — non-Core archetypes (Starlit Sentinel, Twilight Speaker, Tattooed Historian)
export {
  STARLIT_SENTINEL_FEATS,
  TWILIGHT_SPEAKER_FEATS,
  TATTOOED_HISTORIAN_FEATS,
  STANDALONE_ARCHETYPE_FEATS_NON_CORE_ST,
} from './archetypeFeatsNonCoreST';

// Archetype feats — Legacy Book of the Dead (Part 1)
export {
  EXORCIST_FEATS,
  GHOST_FEATS,
  GHOUL_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_BD1,
} from './archetypeFeatsLegacyBD1';

// Archetype feats — Legacy Book of the Dead (Part 2)
export {
  HALLOWED_NECROMANCER_FEATS,
  LICH_FEATS,
  MUMMY_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_BD2,
} from './archetypeFeatsLegacyBD2';

// Archetype feats — Legacy Book of the Dead (Part 3)
export {
  REANIMATOR_FEATS,
  SOUL_WARDEN_FEATS,
  UNDEAD_MASTER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_BD3,
} from './archetypeFeatsLegacyBD3';

// Archetype feats — Legacy Book of the Dead (Part 4)
export {
  UNDEAD_SLAYER_FEATS,
  VAMPIRE_FEATS,
  ZOMBIE_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_BD4,
} from './archetypeFeatsLegacyBD4';

// Archetype feats — Legacy Secrets of Magic / Grand Bazaar (Part 1)
export {
  CAPTIVATOR_FEATS,
  CATHARTIC_MAGE_FEATS,
  FLEXIBLE_SPELLCASTER_FEATS,
  GEOMANCER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_SM1,
} from './archetypeFeatsLegacySM1';

// Archetype feats — Legacy Secrets of Magic / Grand Bazaar (Part 2)
export {
  SHADOWCASTER_FEATS,
  SOULFORGER_FEATS,
  WELLSPRING_MAGE_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_SM2,
} from './archetypeFeatsLegacySM2';

// Archetype feats — Legacy Grand Bazaar (Spell Trickster)
export {
  SPELL_TRICKSTER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_SM3,
} from './archetypeFeatsLegacySM3';

// Archetype feats — Legacy Lost Omens CG (Part 1)
export {
  FIREBRAND_BRAGGART_FEATS,
  HELLKNIGHT_ARMIGER_FEATS,
  HELLKNIGHT_FEATS,
  HELLKNIGHT_SIGNIFER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_LO1,
} from './archetypeFeatsLegacyLO1';

// Archetype feats — Legacy Lost Omens (Part 2)
export {
  KNIGHT_RECLAIMANT_FEATS,
  KNIGHT_VIGILANT_FEATS,
  LASTWALL_SENTRY_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_LO2,
} from './archetypeFeatsLegacyLO2';

// Archetype feats — Legacy Lost Omens (Part 3)
export {
  MAGAAMBYAN_ATTENDANT_FEATS,
  PATHFINDER_AGENT_FEATS,
  SCROLLMASTER_FEATS,
  SPELLMASTER_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_LO3,
} from './archetypeFeatsLegacyLO3';

// Archetype feats — Legacy Lost Omens (Part 4)
export {
  LIVING_MONOLITH_FEATS,
  STUDENT_OF_PERFECTION_FEATS,
  MAGIC_WARRIOR_FEATS,
  RUNESCARRED_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_LO4,
} from './archetypeFeatsLegacyLO4';

// Archetype feats — Legacy Lost Omens (Part 5)
export {
  HALCYON_SPEAKER_FEATS,
  CRYSTAL_KEEPER_FEATS,
  ZEPHYR_GUARD_FEATS,
  TURPIN_ROWE_LUMBERJACK_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_LO5,
} from './archetypeFeatsLegacyLO5';

// Archetype feats — Legacy Lost Omens (Part 6)
export {
  BUTTERFLY_BLADE_FEATS,
  GHOST_EATER_FEATS,
  GRAY_GARDENER_FEATS,
  BRIGHT_LION_FEATS,
  STANDALONE_ARCHETYPE_FEATS_LEGACY_LO6,
} from './archetypeFeatsLegacyLO6';

export {
  ALCHEMIST_DEDICATION_FEATS,
  ANIMIST_DEDICATION_FEATS,
  BARBARIAN_DEDICATION_FEATS,
  BARD_DEDICATION_FEATS,
  CHAMPION_DEDICATION_FEATS,
  CLERIC_DEDICATION_FEATS,
  COMMANDER_DEDICATION_FEATS,
  DRUID_DEDICATION_FEATS,
  EXEMPLAR_DEDICATION_FEATS,
  FIGHTER_DEDICATION_FEATS,
  GUARDIAN_DEDICATION_FEATS,
  GUNSLINGER_DEDICATION_FEATS,
  INVENTOR_DEDICATION_FEATS,
  INVESTIGATOR_DEDICATION_FEATS,
  KINETICIST_DEDICATION_FEATS,
  MAGUS_DEDICATION_FEATS,
  MONK_DEDICATION_FEATS,
  ORACLE_DEDICATION_FEATS,
  PSYCHIC_DEDICATION_FEATS,
  RANGER_DEDICATION_FEATS,
  ROGUE_DEDICATION_FEATS,
  SORCERER_DEDICATION_FEATS,
  SUMMONER_DEDICATION_FEATS,
  SWASHBUCKLER_DEDICATION_FEATS,
  THAUMATURGE_DEDICATION_FEATS,
  WITCH_DEDICATION_FEATS,
  WIZARD_DEDICATION_FEATS,
} from './archetypeFeats';

// Import everything needed for the master catalog
import type { FeatEntry } from './featTypes';
import { FIGHTER_CLASS_FEATURES, FIGHTER_CLASS_FEATS } from './fighterFeats';
import { ROGUE_CLASS_FEATURES, ROGUE_CLASS_FEATS } from './rogueFeats';
import { PSYCHIC_CLASS_FEATURES, PSYCHIC_CLASS_FEATS } from './psychicFeats';
import { MAGUS_CLASS_FEATURES, MAGUS_CLASS_FEATS } from './magusFeats';
import { SORCERER_CLASS_FEATURES, SORCERER_CLASS_FEATS } from './sorcererFeats';
import { WIZARD_CLASS_FEATURES, WIZARD_CLASS_FEATS } from './wizardFeats';
import { BARBARIAN_CLASS_FEATURES, BARBARIAN_CLASS_FEATS } from './barbarianFeats';
import { CHAMPION_CLASS_FEATURES, CHAMPION_CLASS_FEATS } from './championFeats';
import { MONK_CLASS_FEATURES, MONK_CLASS_FEATS } from './monkFeats';
import { RANGER_CLASS_FEATURES, RANGER_CLASS_FEATS } from './rangerFeats';
import { CLERIC_CLASS_FEATURES, CLERIC_CLASS_FEATS } from './clericFeats';
import { KINETICIST_CLASS_FEATURES, KINETICIST_CLASS_FEATS } from './kineticistFeats';
import { DRUID_CLASS_FEATURES, DRUID_CLASS_FEATS } from './druidFeats';
import { BARD_CLASS_FEATURES, BARD_CLASS_FEATS } from './bardFeats';
import { GUARDIAN_CLASS_FEATURES, GUARDIAN_CLASS_FEATS } from './guardianFeats';
import { SWASHBUCKLER_CLASS_FEATURES, SWASHBUCKLER_CLASS_FEATS } from './swashbucklerFeats';
import { INVESTIGATOR_CLASS_FEATURES, INVESTIGATOR_CLASS_FEATS } from './investigatorFeats';
import { THAUMATURGE_CLASS_FEATURES, THAUMATURGE_CLASS_FEATS } from './thaumaturgeFeats';
import { COMMANDER_CLASS_FEATURES, COMMANDER_CLASS_FEATS } from './commanderFeats';
import { GUNSLINGER_CLASS_FEATURES, GUNSLINGER_CLASS_FEATS } from './gunslingerFeats';
import { INVENTOR_CLASS_FEATURES, INVENTOR_CLASS_FEATS } from './inventorFeats';
import { WITCH_CLASS_FEATURES, WITCH_CLASS_FEATS } from './witchFeats';
import { ORACLE_CLASS_FEATURES, ORACLE_CLASS_FEATS } from './oracleFeats';
import { ALCHEMIST_CLASS_FEATURES, ALCHEMIST_CLASS_FEATS } from './alchemistFeats';
import { ANIMIST_CLASS_FEATURES, ANIMIST_CLASS_FEATS } from './animistFeats';
import { EXEMPLAR_CLASS_FEATURES, EXEMPLAR_CLASS_FEATS } from './exemplarFeats';
import { SUMMONER_CLASS_FEATURES, SUMMONER_CLASS_FEATS } from './summonerFeats';
import { SKILL_FEAT_CATALOG } from './skillFeats';
import { GENERAL_FEAT_CATALOG } from './generalFeats';
import { ANCESTRY_FEAT_CATALOG } from './ancestryFeats';

// 
// MASTER CATALOG
// 

/** Master catalog of all feats and features */
export const FEAT_CATALOG: FeatEntry[] = [
  ...FIGHTER_CLASS_FEATURES,
  ...FIGHTER_CLASS_FEATS,
  ...ROGUE_CLASS_FEATURES,
  ...ROGUE_CLASS_FEATS,
  ...PSYCHIC_CLASS_FEATURES,
  ...PSYCHIC_CLASS_FEATS,
  ...MAGUS_CLASS_FEATURES,
  ...MAGUS_CLASS_FEATS,
  ...SORCERER_CLASS_FEATURES,
  ...SORCERER_CLASS_FEATS,
  ...WIZARD_CLASS_FEATURES,
  ...WIZARD_CLASS_FEATS,
  ...BARBARIAN_CLASS_FEATURES,
  ...BARBARIAN_CLASS_FEATS,
  ...CHAMPION_CLASS_FEATURES,
  ...CHAMPION_CLASS_FEATS,
  ...MONK_CLASS_FEATURES,
  ...MONK_CLASS_FEATS,
  ...RANGER_CLASS_FEATURES,
  ...RANGER_CLASS_FEATS,
  ...CLERIC_CLASS_FEATURES,
  ...CLERIC_CLASS_FEATS,
  ...KINETICIST_CLASS_FEATURES,
  ...KINETICIST_CLASS_FEATS,
  ...DRUID_CLASS_FEATURES,
  ...DRUID_CLASS_FEATS,
  ...BARD_CLASS_FEATURES,
  ...BARD_CLASS_FEATS,
  ...GUARDIAN_CLASS_FEATURES,
  ...GUARDIAN_CLASS_FEATS,
  ...SWASHBUCKLER_CLASS_FEATURES,
  ...SWASHBUCKLER_CLASS_FEATS,
  ...INVESTIGATOR_CLASS_FEATURES,
  ...INVESTIGATOR_CLASS_FEATS,
  ...THAUMATURGE_CLASS_FEATURES,
  ...THAUMATURGE_CLASS_FEATS,
  ...COMMANDER_CLASS_FEATURES,
  ...COMMANDER_CLASS_FEATS,
  ...GUNSLINGER_CLASS_FEATURES,
  ...GUNSLINGER_CLASS_FEATS,
  ...INVENTOR_CLASS_FEATURES,
  ...INVENTOR_CLASS_FEATS,
  ...WITCH_CLASS_FEATURES,
  ...WITCH_CLASS_FEATS,
  ...ORACLE_CLASS_FEATURES,
  ...ORACLE_CLASS_FEATS,
  ...ALCHEMIST_CLASS_FEATURES,
  ...ALCHEMIST_CLASS_FEATS,
  ...ANIMIST_CLASS_FEATURES,
  ...ANIMIST_CLASS_FEATS,
  ...EXEMPLAR_CLASS_FEATURES,
  ...EXEMPLAR_CLASS_FEATS,
  ...SUMMONER_CLASS_FEATURES,
  ...SUMMONER_CLASS_FEATS,
  ...SKILL_FEAT_CATALOG,
  ...GENERAL_FEAT_CATALOG,
  ...ANCESTRY_FEAT_CATALOG,
  ...ARCHETYPE_FEAT_CATALOG,
  ...STANDALONE_ARCHETYPE_FEATS_AD,
  ...STANDALONE_ARCHETYPE_FEATS_DG,
  ...STANDALONE_ARCHETYPE_FEATS_HM,
  ...STANDALONE_ARCHETYPE_FEATS_PW,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_AC,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_CE,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_LT,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_GG,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_LR,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_BE,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_IV,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_BW,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_UW,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_CP,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_FR,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_TH,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_MH,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_DC,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_GG2,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_HW,
  ...STANDALONE_ARCHETYPE_FEATS_NON_CORE_ST,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_BD1,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_BD2,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_BD3,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_BD4,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_SM1,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_SM2,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_SM3,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_LO1,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_LO2,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_LO3,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_LO4,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_LO5,
  ...STANDALONE_ARCHETYPE_FEATS_LEGACY_LO6,
];

// 
// CATALOG HELPERS
// 

/** O(1) lookup index built from FEAT_CATALOG — keyed by feat.id */
export const FEAT_CATALOG_MAP: Map<string, FeatEntry> = new Map(
  FEAT_CATALOG.map(feat => [feat.id, feat])
);

/**
 * Class-specific feat lookup maps.
 * Using these avoids scanning the entire FEAT_CATALOG by traits, which caused
 * shared feats from other classes (e.g. swashbuckler-reactive-strike with
 * 'Fighter' in traits) to leak into the wrong class's selectable list.
 */
const CLASS_FEATS_MAP: Record<string, FeatEntry[]> = {
  Fighter: FIGHTER_CLASS_FEATS,
  Rogue: ROGUE_CLASS_FEATS,
  Psychic: PSYCHIC_CLASS_FEATS,
  Magus: MAGUS_CLASS_FEATS,
  Sorcerer: SORCERER_CLASS_FEATS,
  Wizard: WIZARD_CLASS_FEATS,
  Barbarian: BARBARIAN_CLASS_FEATS,
  Champion: CHAMPION_CLASS_FEATS,
  Monk: MONK_CLASS_FEATS,
  Ranger: RANGER_CLASS_FEATS,
  Cleric: CLERIC_CLASS_FEATS,
  Kineticist: KINETICIST_CLASS_FEATS,
  Druid: DRUID_CLASS_FEATS,
  Bard: BARD_CLASS_FEATS,
  Guardian: GUARDIAN_CLASS_FEATS,
  Swashbuckler: SWASHBUCKLER_CLASS_FEATS,
  Investigator: INVESTIGATOR_CLASS_FEATS,
  Thaumaturge: THAUMATURGE_CLASS_FEATS,
  Commander: COMMANDER_CLASS_FEATS,
  Gunslinger: GUNSLINGER_CLASS_FEATS,
  Inventor: INVENTOR_CLASS_FEATS,
  Witch: WITCH_CLASS_FEATS,
  Oracle: ORACLE_CLASS_FEATS,
  Alchemist: ALCHEMIST_CLASS_FEATS,
  Animist: ANIMIST_CLASS_FEATS,
  Exemplar: EXEMPLAR_CLASS_FEATS,
  Summoner: SUMMONER_CLASS_FEATS,
};

const CLASS_FEATURES_MAP: Record<string, FeatEntry[]> = {
  Fighter: FIGHTER_CLASS_FEATURES,
  Rogue: ROGUE_CLASS_FEATURES,
  Psychic: PSYCHIC_CLASS_FEATURES,
  Magus: MAGUS_CLASS_FEATURES,
  Sorcerer: SORCERER_CLASS_FEATURES,
  Wizard: WIZARD_CLASS_FEATURES,
  Barbarian: BARBARIAN_CLASS_FEATURES,
  Champion: CHAMPION_CLASS_FEATURES,
  Monk: MONK_CLASS_FEATURES,
  Ranger: RANGER_CLASS_FEATURES,
  Cleric: CLERIC_CLASS_FEATURES,
  Kineticist: KINETICIST_CLASS_FEATURES,
  Druid: DRUID_CLASS_FEATURES,
  Bard: BARD_CLASS_FEATURES,
  Guardian: GUARDIAN_CLASS_FEATURES,
  Swashbuckler: SWASHBUCKLER_CLASS_FEATURES,
  Investigator: INVESTIGATOR_CLASS_FEATURES,
  Thaumaturge: THAUMATURGE_CLASS_FEATURES,
  Commander: COMMANDER_CLASS_FEATURES,
  Gunslinger: GUNSLINGER_CLASS_FEATURES,
  Inventor: INVENTOR_CLASS_FEATURES,
  Witch: WITCH_CLASS_FEATURES,
  Oracle: ORACLE_CLASS_FEATURES,
  Alchemist: ALCHEMIST_CLASS_FEATURES,
  Animist: ANIMIST_CLASS_FEATURES,
  Exemplar: EXEMPLAR_CLASS_FEATURES,
  Summoner: SUMMONER_CLASS_FEATURES,
};

/**
 * Get all selectable class feats for a given class at or below a given level.
 * Uses class-specific arrays to avoid cross-class contamination from shared traits.
 * Also excludes feats whose name matches an already-granted class feature (e.g.
 * Reactive Strike is auto-granted for Fighter at L1, so it won't appear as selectable).
 */
export function getSelectableClassFeats(className: string, maxLevel: number): FeatEntry[] {
  const feats = CLASS_FEATS_MAP[className];
  if (!feats) return [];

  // Collect names of class features already granted up to maxLevel
  const features = CLASS_FEATURES_MAP[className] ?? [];
  const featureNames = new Set(
    features.filter(f => f.level <= maxLevel).map(f => f.name.toLowerCase())
  );

  return feats.filter(
    feat => feat.category === 'class' && feat.level <= maxLevel &&
      !featureNames.has(feat.name.toLowerCase())
  );
}

/** Get all class features automatically granted at or below a given level */
export function getClassFeatures(className: string, maxLevel: number): FeatEntry[] {
  const features = CLASS_FEATURES_MAP[className];
  if (!features) return [];
  return features.filter(
    feat => feat.category === 'class_feature' && feat.level <= maxLevel
  );
}

/** Get all selectable skill feats at or below a given level */
export function getSelectableSkillFeats(maxLevel: number): FeatEntry[] {
  return SKILL_FEAT_CATALOG.filter(feat => feat.level <= maxLevel);
}

/** Get all selectable general feats at or below a given level */
export function getSelectableGeneralFeats(maxLevel: number): FeatEntry[] {
  return GENERAL_FEAT_CATALOG.filter(feat => feat.level <= maxLevel);
}

/** Get all selectable ancestry feats at or below a given level.
 *  When a versatile heritage is chosen, its feats are included alongside the ancestry's feats. */
export function getSelectableAncestryFeats(ancestry: string, maxLevel: number, versatileHeritage?: string): FeatEntry[] {
  const ancestrySourceAliases: Record<string, string[]> = {
    Kholo: ['Gnoll'],
  };

  // Map remastered VH names to legacy names so both old and new feats are included
  const versatileHeritageAliases: Record<string, string[]> = {
    Naari: ['Ifrit'],
  };

  const ancestrySources = [ancestry, ...(ancestrySourceAliases[ancestry] ?? [])];
  const vhNames = versatileHeritage
    ? [versatileHeritage, ...(versatileHeritageAliases[versatileHeritage] ?? [])]
    : [];

  return ANCESTRY_FEAT_CATALOG.filter(
    feat => (
      ancestrySources.includes(feat.source ?? '') ||
      vhNames.includes(feat.source ?? '') ||
      // Also match VH feats where the heritage name appears in traits
      // (handles feats with source: 'Versatile Heritages' that have traits like ['Lineage', 'Nephilim'])
      (versatileHeritage && vhNames.some(name => feat.traits?.includes(name))) ||
      feat.source === null
    ) && feat.level <= maxLevel
  );
}

/** Lookup a feat by ID (O(1) via Map) */
export function getFeatById(id: string): FeatEntry | undefined {
  return FEAT_CATALOG_MAP.get(id);
}

/** Get all selectable archetype feats up to a certain level */
export function getSelectableArchetypeFeats(maxLevel: number): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter(feat => feat.level <= maxLevel);
}

/** Get Psychic Dedication-specific info */
export function getPsychicDedicationFeat(): FeatEntry | undefined {
  return FEAT_CATALOG.find(feat => feat.id === 'psychic-dedication');
}

/** Check if a feat requires conscious mind selection (Psychic Dedication) */
export function requiresConsciousMind(featId: string): boolean {
  return featId === 'psychic-dedication';
}

/**
 * Validate if a character can take a dedication feat
 * Enforces the rule: "Cannot select another dedication feat until you take two other archetype feats"
 */
export function validateDedicationTaking(dedicationName: string, archetypeFeatsSelected: string[]): { valid: boolean; reason?: string } {
  const existingDedications = archetypeFeatsSelected
    .map(id => getFeatById(id))
    .filter(feat => feat && feat.traits?.includes('Dedication'));

  if (existingDedications.length > 0) {
    const nonDedicationArchetypeFeats = archetypeFeatsSelected
      .map(id => getFeatById(id))
      .filter(feat => feat && feat.category === 'archetype' && !feat.traits?.includes('Dedication'));
    
    if (nonDedicationArchetypeFeats.length < 2) {
      return {
        valid: false,
        reason: `Cannot take another dedication until you select 2 other archetype feats (currently have ${nonDedicationArchetypeFeats.length}).`
      };
    }
  }

  return { valid: true };
}

/** Validate Psychic Dedication ability score requirements (INT >= 14 OR WIS >= 14 OR CHA >= 14) */
export function validatePsychicDedicationAbilities(abilities: { int?: number; wis?: number; cha?: number }): { valid: boolean; reason?: string } {
  const { int = 0, wis = 0, cha = 0 } = abilities;
  
  if (int >= 14 || wis >= 14 || cha >= 14) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Psychic Dedication requires Intelligence 14+, Wisdom 14+, or Charisma 14+ (you have INT ${int}, WIS ${wis}, CHA ${cha}).`
  };
}

/** Check if a character has Psychic Dedication feat selected */
export function hasPsychicDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('psychic-dedication');
}

/** Get selectable Psychic archetype feats with prerequisite validation */
export function getSelectablePsychicArchetypeFeats(archetypeFeatsSelected: string[], maxLevel: number): FeatEntry[] {
  const psychicFeats = ARCHETYPE_FEAT_CATALOG.filter(
    feat => feat.source === 'Psychic (Archetype)' && feat.level <= maxLevel
  );

  return psychicFeats.filter(feat => {
    if (feat.id === 'psychic-dedication') {
      return !archetypeFeatsSelected.includes('psychic-dedication');
    }

    if (!hasPsychicDedication(archetypeFeatsSelected)) {
      return false;
    }

    if (feat.prerequisites && feat.prerequisites.length > 0) {
      for (const prereq of feat.prerequisites) {
        const prereqId = prereq.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
        if (!archetypeFeatsSelected.includes(prereqId) && prereq !== 'Psychic Dedication') {
          return false;
        }
      }
    }

    return true;
  });
}

/** Validate Magus Dedication ability score requirements (STR or DEX >= 14, INT >= 14) */
export function validateMagusDedicationAbilities(abilities: {
  strength?: number;
  dexterity?: number;
  intelligence?: number;
}): { valid: boolean; reason?: string } {
  const str = abilities.strength ?? 10;
  const dex = abilities.dexterity ?? 10;
  const int = abilities.intelligence ?? 10;

  if (int < 14) {
    return { valid: false, reason: 'Intelligence must be at least 14 to take Magus Dedication' };
  }

  if (str < 14 && dex < 14) {
    return { valid: false, reason: 'Strength or Dexterity must be at least 14 to take Magus Dedication' };
  }

  return { valid: true };
}

/** Check if Magus Dedication has been selected */
export function hasMagusDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('magus-dedication');
}

/** Get selectable Magus archetype feats with prerequisite validation */
export function getSelectableMagusArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  const magusFeatIds = [
    'magus-dedication',
    'basic-martial-magic',
    'spellstriker',
    'hybrid-study-spell',
    'basic-magus-spellcasting',
    'expert-magus-spellcasting',
  ];

  const availableFeats = ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (!magusFeatIds.includes(feat.id)) return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'magus-dedication') {
      const hasMagus = archetypeFeatsSelected.includes('magus-dedication');
      if (hasMagus) return false;
      return true;
    }

    if (!hasMagusDedication(archetypeFeatsSelected)) {
      return false;
    }

    switch (feat.id) {
      case 'basic-martial-magic':
      case 'spellstriker':
      case 'hybrid-study-spell':
      case 'basic-magus-spellcasting':
        return true;

      case 'expert-magus-spellcasting':
        if (!archetypeFeatsSelected.includes('basic-magus-spellcasting')) {
          return false;
        }
        return true;

      default:
        return false;
    }
  });

  return availableFeats;
}

/** Check if a feat is implemented */
export function isFeatImplemented(id: string): boolean {
  const feat = getFeatById(id);
  return feat !== undefined && (feat.implemented === 'full' || feat.implemented === 'partial');
}

// ─────────────────────────────────────────────────────────
// FIGHTER ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Fighter Dedication ability score requirements (STR >= 14 OR DEX >= 14) */
export function validateFighterDedicationAbilities(abilities: {
  strength?: number;
  dexterity?: number;
}): { valid: boolean; reason?: string } {
  const str = abilities.strength ?? 10;
  const dex = abilities.dexterity ?? 10;

  if (str < 14 && dex < 14) {
    return {
      valid: false,
      reason: `Fighter Dedication requires Strength 14+ or Dexterity 14+ (you have STR ${str}, DEX ${dex}).`,
    };
  }

  return { valid: true };
}

/** Check if Fighter Dedication has been selected */
export function hasFighterDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('fighter-dedication');
}

/** Get selectable Fighter archetype feats with prerequisite validation */
export function getSelectableFighterArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Fighter (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'fighter-dedication') {
      return !archetypeFeatsSelected.includes('fighter-dedication');
    }

    if (!hasFighterDedication(archetypeFeatsSelected)) return false;

    // Advanced Maneuver requires Basic Maneuver
    if (feat.id === 'advanced-fighter-maneuver') {
      return archetypeFeatsSelected.includes('basic-fighter-maneuver');
    }

    // Diverse Weapon Expert requires Fighter Dedication (already checked above)
    return true;
  });
}

// ─────────────────────────────────────────────────────────
// ROGUE ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Rogue Dedication ability score requirements (DEX >= 14) */
export function validateRogueDedicationAbilities(abilities: {
  dexterity?: number;
}): { valid: boolean; reason?: string } {
  const dex = abilities.dexterity ?? 10;

  if (dex < 14) {
    return {
      valid: false,
      reason: `Rogue Dedication requires Dexterity 14+ (you have DEX ${dex}).`,
    };
  }

  return { valid: true };
}

/** Check if Rogue Dedication has been selected */
export function hasRogueDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('rogue-dedication');
}

/** Get selectable Rogue archetype feats with prerequisite validation */
export function getSelectableRogueArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Rogue (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'rogue-dedication') {
      return !archetypeFeatsSelected.includes('rogue-dedication');
    }

    if (!hasRogueDedication(archetypeFeatsSelected)) return false;

    // Advanced Trickery requires Basic Trickery
    if (feat.id === 'advanced-trickery') {
      return archetypeFeatsSelected.includes('basic-trickery');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// SORCERER ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Sorcerer Dedication ability score requirements (CHA >= 14) */
export function validateSorcererDedicationAbilities(abilities: {
  charisma?: number;
}): { valid: boolean; reason?: string } {
  const cha = abilities.charisma ?? 10;

  if (cha < 14) {
    return {
      valid: false,
      reason: `Sorcerer Dedication requires Charisma 14+ (you have CHA ${cha}).`,
    };
  }

  return { valid: true };
}

/** Check if Sorcerer Dedication has been selected */
export function hasSorcererDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('sorcerer-dedication');
}

/** Get selectable Sorcerer archetype feats with prerequisite validation */
export function getSelectableSorcererArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Sorcerer (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'sorcerer-dedication') {
      return !archetypeFeatsSelected.includes('sorcerer-dedication');
    }

    if (!hasSorcererDedication(archetypeFeatsSelected)) return false;

    // Advanced Blood Potency requires Basic Blood Potency
    if (feat.id === 'advanced-blood-potency') {
      return archetypeFeatsSelected.includes('basic-blood-potency');
    }

    // Expert Sorcerer Spellcasting requires Basic Sorcerer Spellcasting
    if (feat.id === 'expert-sorcerer-spellcasting') {
      return archetypeFeatsSelected.includes('basic-sorcerer-spellcasting');
    }

    // Master Sorcerer Spellcasting requires Expert Sorcerer Spellcasting
    if (feat.id === 'master-sorcerer-spellcasting') {
      return archetypeFeatsSelected.includes('expert-sorcerer-spellcasting');
    }

    // Bloodline Breadth requires Basic Sorcerer Spellcasting
    if (feat.id === 'bloodline-breadth') {
      return archetypeFeatsSelected.includes('basic-sorcerer-spellcasting');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// WIZARD ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Wizard Dedication ability score requirements (INT >= 14) */
export function validateWizardDedicationAbilities(abilities: {
  intelligence?: number;
}): { valid: boolean; reason?: string } {
  const int = abilities.intelligence ?? 10;

  if (int < 14) {
    return {
      valid: false,
      reason: `Wizard Dedication requires Intelligence 14+ (you have INT ${int}).`,
    };
  }

  return { valid: true };
}

/** Check if Wizard Dedication has been selected */
export function hasWizardDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('wizard-dedication');
}

/** Get selectable Wizard archetype feats with prerequisite validation */
export function getSelectableWizardArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Wizard (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'wizard-dedication') {
      return !archetypeFeatsSelected.includes('wizard-dedication');
    }

    if (!hasWizardDedication(archetypeFeatsSelected)) return false;

    // Advanced Arcana requires Basic Arcana
    if (feat.id === 'advanced-arcana') {
      return archetypeFeatsSelected.includes('basic-arcana');
    }

    // Expert Wizard Spellcasting requires Basic Wizard Spellcasting
    if (feat.id === 'expert-wizard-spellcasting') {
      return archetypeFeatsSelected.includes('basic-wizard-spellcasting');
    }

    // Master Wizard Spellcasting requires Expert Wizard Spellcasting
    if (feat.id === 'master-wizard-spellcasting') {
      return archetypeFeatsSelected.includes('expert-wizard-spellcasting');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// BARBARIAN ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Barbarian Dedication ability score requirements (STR >= 14, CON >= 14) */
export function validateBarbarianDedicationAbilities(abilities: {
  strength?: number;
  constitution?: number;
}): { valid: boolean; reason?: string } {
  const str = abilities.strength ?? 10;
  const con = abilities.constitution ?? 10;

  if (str < 14) {
    return {
      valid: false,
      reason: `Barbarian Dedication requires Strength 14+ (you have STR ${str}).`,
    };
  }

  if (con < 14) {
    return {
      valid: false,
      reason: `Barbarian Dedication requires Constitution 14+ (you have CON ${con}).`,
    };
  }

  return { valid: true };
}

/** Check if Barbarian Dedication has been selected */
export function hasBarbarianDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('barbarian-dedication');
}

/** Get selectable Barbarian archetype feats with prerequisite validation */
export function getSelectableBarbarianArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Barbarian (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'barbarian-dedication') {
      return !archetypeFeatsSelected.includes('barbarian-dedication');
    }

    if (!hasBarbarianDedication(archetypeFeatsSelected)) return false;

    // Advanced Fury requires Basic Fury
    if (feat.id === 'advanced-fury') {
      return archetypeFeatsSelected.includes('basic-fury');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// CHAMPION ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Champion Dedication ability score requirements (STR >= 14 or DEX >= 14, CHA >= 14) */
export function validateChampionDedicationAbilities(abilities: {
  strength?: number;
  dexterity?: number;
  charisma?: number;
}): { valid: boolean; reason?: string } {
  const str = abilities.strength ?? 10;
  const dex = abilities.dexterity ?? 10;
  const cha = abilities.charisma ?? 10;

  if (str < 14 && dex < 14) {
    return {
      valid: false,
      reason: `Champion Dedication requires Strength 14+ or Dexterity 14+ (you have STR ${str}, DEX ${dex}).`,
    };
  }

  if (cha < 14) {
    return {
      valid: false,
      reason: `Champion Dedication requires Charisma 14+ (you have CHA ${cha}).`,
    };
  }

  return { valid: true };
}

/** Check if Champion Dedication has been selected */
export function hasChampionDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('champion-dedication');
}

/** Get selectable Champion archetype feats with prerequisite validation */
export function getSelectableChampionArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Champion (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'champion-dedication') {
      return !archetypeFeatsSelected.includes('champion-dedication');
    }

    if (!hasChampionDedication(archetypeFeatsSelected)) return false;

    // Advanced Devotion requires Basic Devotion
    if (feat.id === 'advanced-devotion') {
      return archetypeFeatsSelected.includes('basic-devotion');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// MONK ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Monk Dedication ability score requirements (STR >= 14 or DEX >= 14) */
export function validateMonkDedicationAbilities(abilities: {
  strength?: number;
  dexterity?: number;
}): { valid: boolean; reason?: string } {
  const str = abilities.strength ?? 10;
  const dex = abilities.dexterity ?? 10;

  if (str < 14 && dex < 14) {
    return {
      valid: false,
      reason: `Monk Dedication requires Strength 14+ or Dexterity 14+ (you have STR ${str}, DEX ${dex}).`,
    };
  }

  return { valid: true };
}

/** Check if Monk Dedication has been selected */
export function hasMonkDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('monk-dedication');
}

/** Get selectable Monk archetype feats with prerequisite validation */
export function getSelectableMonkArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Monk (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'monk-dedication') {
      return !archetypeFeatsSelected.includes('monk-dedication');
    }

    if (!hasMonkDedication(archetypeFeatsSelected)) return false;

    // Advanced Kata requires Basic Kata
    if (feat.id === 'advanced-kata') {
      return archetypeFeatsSelected.includes('basic-kata');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// RANGER ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Ranger Dedication ability score requirements (STR >= 14 or DEX >= 14) */
export function validateRangerDedicationAbilities(abilities: {
  strength?: number;
  dexterity?: number;
}): { valid: boolean; reason?: string } {
  const str = abilities.strength ?? 10;
  const dex = abilities.dexterity ?? 10;

  if (str < 14 && dex < 14) {
    return {
      valid: false,
      reason: `Ranger Dedication requires Strength 14+ or Dexterity 14+ (you have STR ${str}, DEX ${dex}).`,
    };
  }

  return { valid: true };
}

/** Check if Ranger Dedication has been selected */
export function hasRangerDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('ranger-dedication');
}

/** Get selectable Ranger archetype feats with prerequisite validation */
export function getSelectableRangerArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Ranger (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'ranger-dedication') {
      return !archetypeFeatsSelected.includes('ranger-dedication');
    }

    if (!hasRangerDedication(archetypeFeatsSelected)) return false;

    // Advanced Hunter's Trick requires Basic Hunter's Trick
    if (feat.id === 'advanced-hunters-trick') {
      return archetypeFeatsSelected.includes('basic-hunters-trick');
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// CLERIC ARCHETYPE HELPERS
// ─────────────────────────────────────────────────────────

/** Validate Cleric Dedication ability score requirements (WIS >= 14) */
export function validateClericDedicationAbilities(abilities: {
  wisdom?: number;
}): { valid: boolean; reason?: string } {
  const wis = abilities.wisdom ?? 10;

  if (wis < 14) {
    return {
      valid: false,
      reason: `Cleric Dedication requires Wisdom 14+ (you have WIS ${wis}).`,
    };
  }

  return { valid: true };
}

/** Check if Cleric Dedication has been selected */
export function hasClericDedication(archetypeFeatsSelected: string[]): boolean {
  return archetypeFeatsSelected.includes('cleric-dedication');
}

/** Get selectable Cleric archetype feats with prerequisite validation */
export function getSelectableClericArchetypeFeats(
  archetypeFeatsSelected: string[],
  maxLevel: number
): FeatEntry[] {
  return ARCHETYPE_FEAT_CATALOG.filter((feat) => {
    if (feat.source !== 'Cleric (Archetype)') return false;
    if (feat.level > maxLevel) return false;

    if (feat.id === 'cleric-dedication') {
      return !archetypeFeatsSelected.includes('cleric-dedication');
    }

    if (!hasClericDedication(archetypeFeatsSelected)) return false;

    // Advanced Dogma requires Basic Dogma
    if (feat.id === 'advanced-dogma') {
      return archetypeFeatsSelected.includes('basic-dogma');
    }

    return true;
  });
}
