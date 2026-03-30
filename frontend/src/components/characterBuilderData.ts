/**
 * Character Builder Data Constants
 * All types, interfaces, and static data for the character builder wizard.
 */

import type { CharacterSheet, ProficiencyProfile } from '../../../shared/types';

export const PROFICIENCY_RANKS = ['untrained', 'trained', 'expert', 'master', 'legendary'] as const;
export type ProfRank = typeof PROFICIENCY_RANKS[number];

export interface CharacterBuilderProps {
  onCharacterCreated: (character: CharacterSheet) => void;
  onCancel: () => void;
  /** Pre-populate the builder with an existing BuilderState (for editing/re-building) */
  initialState?: BuilderState;
  /** When editing, the character ID to preserve (so save overwrites instead of creating new) */
  editingCharacterId?: string;
}

export interface BuilderState {
  name: string;
  level: number;
  ancestry: string;
  heritage: string;
  heritageType: 'standard' | 'versatile';
  background: string;
  class: string;
  // Ability score selections (not final scores)
  ancestryBoosts: string[];  // Array of ability names chosen for free boosts
  backgroundBoost: string;  // e.g., 'Charisma' (specific choice)
  backgroundFreeBoost: string;  // e.g., 'Intelligence' (free choice)
  classBoost: string;  // e.g., 'Strength'
  freeBoosts: string[];  // 4 free boosts every character gets
  abilities: Record<string, number>;  // Final calculated scores
  optionalRules: {
    gradualAbilityBoosts: boolean;
    ancestryParagon: boolean;
    freeArchetype: boolean;
  };
  // Skill selections
  classAutoSkillChoice: string;  // e.g., Fighter picks Acrobatics OR Athletics
  classSkills: string[];  // Additional skill picks from class
  loreSpecialty: string;  // Lore from background (e.g., "Circus Lore")
  skillIncreases: Record<number, string>;  // level -> skill name to increase proficiency
  intBonusSkills: Record<number, string>;  // boostLevel -> additional trained skill from INT increase
  rogueRacket: 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger' | '';  // Rogue's Racket choice
  rogueDeity: string;  // Deity for Avenger racket
  // Psychic class
  consciousMind: string;  // Psychic conscious mind choice (e.g., 'the-distant-grasp')
  subconsciousMind: string;  // Psychic subconscious mind choice (e.g., 'emotional-acceptance')
  // Magus class
  hybridStudy: string;  // Magus hybrid study choice (e.g., 'inexorable-iron')
  // Sorcerer class
  bloodline: string;  // Sorcerer bloodline choice (e.g., 'draconic')
  // Wizard class
  arcaneSchool: string;  // Wizard arcane school choice (e.g., 'school-of-battle-magic')
  // Barbarian class
  instinct: string;  // Barbarian instinct choice (e.g., 'dragon-instinct')
  // Champion class
  championCause: string;  // Champion cause choice (e.g., 'paladin')
  // Ranger class
  huntersEdge: string;  // Ranger hunter's edge choice (e.g., 'flurry')
  // Cleric class
  doctrine: string;  // Cleric doctrine choice (e.g., 'cloistered')
  classFeats: Record<number, string>;  // slotLevel -> selected class feat ID
  skillFeats: Record<number, string>;  // slotLevel -> selected skill feat ID
  generalFeats: Record<number, string>;  // slotLevel -> selected general feat ID
  ancestryFeats: Record<number, string>;  // slotLevel -> selected ancestry feat ID
  archetypeFeats: Record<number, string>;  // slotLevel -> selected free archetype feat ID (Free Archetype variant)
  archetypeBonusFeats: Record<number, string>;  // slotLevel -> bonus feat granted by archetype feat (e.g., from Basic Maneuver)
  // Psychic Archetype (Psychic Dedication) sub-choices
  archetypeConsciousMind: string;  // Conscious mind chosen via Psychic Dedication archetype feat
  archetypePsiCantrip: string;     // Which standard psi cantrip chosen at Dedication (from the conscious mind)
  archetypePsiCantrip2: string;    // Second psi cantrip chosen via Psi Development (the one NOT taken at Dedication, or the unique surface cantrip)
  // Bonus feats granted by ancestry feats (Natural Ambition, General Training)
  ancestryBonusClassFeat: string;  // Bonus 1st-level class feat from Natural Ambition
  ancestryBonusGeneralFeat: string;  // Bonus 1st-level general feat from General Training
  featSubChoices: Record<string, string>;  // featId -> chosen sub-choice option ID (for feats with subChoices)
  levelBoosts: Record<number, string[]>;  // boostLevel -> array of 4 ability names
  notes: string;
  // Equipment / Buy step
  equipmentWeapons: string[];   // Weapon catalog IDs purchased
  equipmentWeaponRunes: Array<{
    potencyRune?: 1 | 2 | 3;
    strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
    propertyRunes?: string[];
  }>;
  equipmentArmor: string;       // Armor catalog ID purchased (or '' for none)
  equipmentArmorRunes: {
    potencyRune?: 1 | 2 | 3;
    resilientRune?: 'resilient' | 'greater-resilient' | 'major-resilient';
    propertyRunes?: string[];
  };
  equipmentShield: string;      // Shield catalog ID purchased (or '' for none)
  equipmentHandwraps: boolean;   // Whether Handwraps of Mighty Blows are purchased
  equipmentHandwrapRunes: {
    potencyRune?: 1 | 2 | 3;
    strikingRune?: 'striking' | 'greater-striking' | 'major-striking';
    propertyRunes?: string[];
  };
  equipmentConsumables: { id: string; qty: number }[]; // Consumable purchases
  equipmentGear: { id: string; qty: number }[]; // Adventuring gear purchases
  equipmentWornItems: string[]; // Worn/held magic item IDs
  goldBudget: number;           // Total GP budget for equipment
  customGold: boolean;          // True if user overrode the default wealth-by-level
  // Spellcasting
  knownCantrips: string[];      // Cantrip spell IDs learned
  knownSpells: string[];        // Non-cantrip spell IDs learned (spellbook/repertoire)
  preparedSpells: Record<number, string[]>; // rank -> spell IDs prepared in slots (prepared casters)
  // Token & Portrait images (base64 data URLs)
  tokenImageUrl: string;        // Token image for battle grid (base64 or '')
  portraitImageUrl: string;     // Portrait/full art for character sheet (base64 or '')
  // Bio / Description
  pronouns: string;
  age: string;
  height: string;
  weight: string;
  description: string;
}

// ANCESTRIES is derived after ANCESTRY_BOOSTS below

export const HERITAGES: Record<string, string[]> = {
  // ── Player Core 1 Ancestries ──
  Human: ['Skilled Heritage', 'Versatile Heritage', 'Wintertouched'],
  Dwarf: ['Ancient-Blooded Dwarf', 'Death Warden Dwarf', 'Forge Dwarf', 'Rock Dwarf', 'Strong-Blooded Dwarf'],
  Elf: ['Ancient Elf', 'Arctic Elf', 'Cavern Elf', 'Desert Elf', 'Seer Elf', 'Whisper Elf', 'Woodland Elf'],
  Gnome: ['Chameleon Gnome', 'Fey-Touched Gnome', 'Sensate Gnome', 'Umbral Gnome', 'Wellspring Gnome'],
  Goblin: ['Charhide Goblin', 'Irongut Goblin', 'Razortooth Goblin', 'Snow Goblin', 'Unbreakable Goblin'],
  Halfling: ['Gutsy Halfling', 'Hillock Halfling', 'Nomadic Halfling', 'Twilight Halfling', 'Wildwood Halfling'],
  Leshy: ['Fungus Leshy', 'Gourd Leshy', 'Leaf Leshy', 'Vine Leshy', 'Cactus Leshy'],
  Orc: ['Badlands Orc', 'Battle-Ready Orc', 'Deep Orc', 'Grave Orc', 'Rainfall Orc', 'Winter Orc'],
  // ── Player Core 2 Ancestries ──
  Catfolk: ['Clawed Catfolk', 'Hunting Catfolk', 'Jungle Catfolk', 'Nine Lives Catfolk', 'Winter Catfolk'],
  Fetchling: ['Bright Fetchling', 'Deep Fetchling', 'Liminal Fetchling', 'Resolute Fetchling', 'Wisp Fetchling'],
  Hobgoblin: ['Elfbane Hobgoblin', 'Runtboss Hobgoblin', 'Smokeworker Hobgoblin', 'Warmarch Hobgoblin', 'Warrenbred Hobgoblin'],
  Kholo: ['Cavern Kholo', 'Dry-Lands Kholo', 'Gnoll Skulker Kholo', 'Sandstrider Kholo', 'Witch-Born Kholo'],
  Kitsune: ['Celestial Envoy Kitsune', 'Dark Fields Kitsune', 'Earthly Wilds Kitsune', 'Empty Sky Kitsune', 'Frozen Wind Kitsune'],
  Kobold: ['Caveclimber Kobold', 'Dragonscaled Kobold', 'Spellscale Kobold', 'Strongjaw Kobold', 'Venomtail Kobold'],
  Lizardfolk: ['Cliffscale Lizardfolk', 'Frilled Lizardfolk', 'Sandstrider Lizardfolk', 'Unseen Lizardfolk', 'Wetlander Lizardfolk'],
  Nagaji: ['Hooded Nagaji', 'Sacred Nagaji', 'Titan Nagaji', 'Venomshield Nagaji', 'Whipfang Nagaji'],
  Ratfolk: ['Deep Rat', 'Desert Rat', 'Longsnout Rat', 'Sewer Rat', 'Shadow Rat'],
  Tengu: ['Dogtooth Tengu', 'Jinxed Tengu', 'Mountainkeeper Tengu', 'Skyborn Tengu', 'Stormtossed Tengu'],
  Android: ['Artisan Android', 'Impersonator Android', 'Laborer Android', 'Polyglot Android', 'Warrior Android'],
  Automaton: ['Hunter Automaton', 'Mage Automaton', 'Sharpshooter Automaton', 'Warrior Automaton'],
  Grippli: ['Poisonhide Grippli', 'Snaptongue Grippli', 'Stickytoe Grippli', 'Windweb Grippli'],
  Poppet: ['Ghost Poppet', 'Stuffed Poppet', 'Toy Poppet', 'Wishborn Poppet'],
  Sprite: ['Draxie', 'Grig', 'Luminous Sprite', 'Melixie', 'Nyktera', 'Pixie'],
  Strix: ['Nightglider Strix', 'Predator Strix', 'Scavenger Strix', 'Shoreline Strix', 'Songbird Strix'],
};

// Versatile Heritages (these can replace standard heritages)
// Official PF2e versatile heritages - excludes legacy content (Aasimar, Tiefling)
export const VERSATILE_HERITAGES = [
  'Aiuvarin',       // Common - elf heritage
  'Aphorite',       // Uncommon - Plane of Law
  'Ardande',        // Uncommon - wood elemental
  'Beastkin',       // Rare - animal heritage
  'Changeling',     // Uncommon - hag heritage
  'Dhampir',        // Uncommon - vampire heritage
  'Dragonblood',    // Uncommon - dragon heritage
  'Dromaar',        // Common - orc heritage
  'Duskwalker',     // Uncommon - planar scion
  'Ganzi',          // Uncommon - primal chaos
  'Hungerseed',     // Uncommon - oni heritage
  'Naari',          // Uncommon - fire elemental (formerly Ifrit)
  'Nephilim',       // Uncommon - celestial/fiend/monitor heritage
  'Oread',          // Uncommon - earth elemental
  'Reflection',     // Rare - duplicate creature
  'Suli',           // Uncommon - janni heritage
  'Sylph',          // Uncommon - air elemental
  'Talos',          // Uncommon - metal elemental
  'Undine',         // Uncommon - water elemental
];

export const VERSATILE_HERITAGE_DESCRIPTIONS: Record<string, string> = {
  'Aiuvarin': 'Part elf, with pointed ears and elven features.',
  'Aphorite': 'Born with a connection to the Plane of Law.',
  'Ardande': 'Descended from wood elementals with verdant features.',
  'Beastkin': 'The blood of beasts grants you animal features and powers.',
  'Changeling': 'Your mother was a hag, giving you unusual eyes and features.',
  'Dhampir': 'Half living and half undead, child of a vampire.',
  'Dragonblood': 'Descended from dragons with draconic features or power.',
  'Dromaar': 'Orcish strength runs through your bloodline.',
  'Duskwalker': 'Reborn as a planar scion with connection to the Boneyard.',
  'Ganzi': 'Your blood is touched by primal chaos and unpredictability.',
  'Hungerseed': 'Half oni, with horns and other supernatural features.',
  'Naari': 'Descended from fire elementals with fiery resilience.',
  'Nephilim': 'Influenced by celestials, fiends, or monitors.',
  'Oread': 'An earth elemental ancestor influences your bloodline.',
  'Reflection': 'You were created as a duplicate of another creature.',
  'Suli': 'Descended from a janni with elemental planar forces.',
  'Sylph': 'Descended from air elementals with aerial grace.',
  'Talos': 'Metal elemental influenced, with a metallic sheen to skin.',
  'Undine': 'A water elemental ancestor influences your bloodline.',
};

/**
 * Versatile Heritage senses overrides.
 * Each entry is either a fixed string ('Darkvision') or 'upgrade' meaning:
 *   Normal → Low-Light Vision, Low-Light Vision → Darkvision, Darkvision → Darkvision.
 * Source: Archives of Nethys / Player Core / Player Core 2
 */
export const VERSATILE_HERITAGE_SENSES: Record<string, 'upgrade' | string> = {
  'Beastkin': 'upgrade',         // PC2: low-light vision, or darkvision if already LLV
  'Changeling': 'upgrade',      // PC:  low-light vision, or darkvision if already LLV
  'Dhampir': 'Darkvision',      // PC:  darkvision
  'Duskwalker': 'Darkvision',   // PC:  darkvision
  'Nephilim': 'upgrade',        // PC:  low-light vision, or darkvision if already LLV
  'Naari': 'upgrade',           // RoE: low-light vision, or darkvision if already LLV (formerly Ifrit)
  'Oread': 'upgrade',           // RoE: low-light vision, or darkvision if already LLV
  'Sylph': 'upgrade',           // RoE: low-light vision, or darkvision if already LLV
  'Undine': 'upgrade',          // RoE: low-light vision, or darkvision if already LLV
  'Suli': 'upgrade',            // RoE: low-light vision, or darkvision if already LLV
  'Talos': 'upgrade',           // RoE: low-light vision, or darkvision if already LLV
  'Ardande': 'upgrade',         // RoE: low-light vision, or darkvision if already LLV
};

/** Compute effective senses after applying versatile heritage overrides */
export function getEffectiveSenses(ancestrySenses: string, heritageType: 'standard' | 'versatile', heritage: string): string {
  if (heritageType !== 'versatile') return ancestrySenses;
  const override = VERSATILE_HERITAGE_SENSES[heritage];
  if (!override) return ancestrySenses;
  if (override !== 'upgrade') return override; // fixed value like 'Darkvision'
  // 'upgrade' logic: Normal → Low-Light Vision, Low-Light Vision → Darkvision
  if (ancestrySenses === 'Darkvision') return 'Darkvision';
  if (ancestrySenses === 'Low-Light Vision') return 'Darkvision';
  return 'Low-Light Vision';
}

// Ancestry ability boosts in PF2e Remaster — flaws removed per Remaster rules
// Structure: fixedBoosts (always get these), freeBoosts (choose from any ability), stat block
// Remaster rule: each ancestry gets 2 fixed boosts + 1 free boost (Human gets 2 free instead)
export interface AncestryData {
  fixedBoosts?: Record<string, number>;
  freeBoosts: number;
  flavor: string;
  hp: number;       // Ancestry Hit Points (added to class HP at level 1)
  speed: number;    // Base speed in feet
  size: 'Tiny' | 'Small' | 'Medium' | 'Large';
  traits: string[];
  senses: string;   // e.g. 'Darkvision', 'Low-Light Vision', 'Normal'
}

export const ANCESTRY_BOOSTS: Record<string, AncestryData> = {
  // ── Core Ancestries (Player Core 1) ──────────────────
  Human: {
    freeBoosts: 2,
    flavor: 'Humans gain two free ability boosts of their choice.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Human', 'Humanoid'],
    senses: 'Normal',
  },
  Dwarf: {
    fixedBoosts: { constitution: 2, wisdom: 2 },
    freeBoosts: 1,
    flavor: 'Dwarves gain +2 Constitution, +2 Wisdom, and one free ability boost.',
    hp: 10, speed: 20, size: 'Medium',
    traits: ['Dwarf', 'Humanoid'],
    senses: 'Darkvision',
  },
  Elf: {
    fixedBoosts: { dexterity: 2, intelligence: 2 },
    freeBoosts: 1,
    flavor: 'Elves gain +2 Dexterity, +2 Intelligence, and one free ability boost.',
    hp: 6, speed: 30, size: 'Medium',
    traits: ['Elf', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Gnome: {
    fixedBoosts: { constitution: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Gnomes gain +2 Constitution, +2 Charisma, and one free ability boost.',
    hp: 8, speed: 25, size: 'Small',
    traits: ['Gnome', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Goblin: {
    fixedBoosts: { dexterity: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Goblins gain +2 Dexterity, +2 Charisma, and one free ability boost.',
    hp: 6, speed: 25, size: 'Small',
    traits: ['Goblin', 'Humanoid'],
    senses: 'Darkvision',
  },
  Halfling: {
    fixedBoosts: { dexterity: 2, wisdom: 2 },
    freeBoosts: 1,
    flavor: 'Halflings gain +2 Dexterity, +2 Wisdom, and one free ability boost.',
    hp: 6, speed: 25, size: 'Small',
    traits: ['Halfling', 'Humanoid'],
    senses: 'Normal',
  },
  Leshy: {
    fixedBoosts: { constitution: 2, wisdom: 2 },
    freeBoosts: 1,
    flavor: 'Leshies gain +2 Constitution, +2 Wisdom, and one free ability boost.',
    hp: 8, speed: 25, size: 'Small',
    traits: ['Leshy', 'Plant'],
    senses: 'Low-Light Vision',
  },
  Orc: {
    fixedBoosts: { strength: 2, constitution: 2 },
    freeBoosts: 1,
    flavor: 'Orcs gain +2 Strength, +2 Constitution, and one free ability boost.',
    hp: 10, speed: 25, size: 'Medium',
    traits: ['Orc', 'Humanoid'],
    senses: 'Darkvision',
  },
  // ── Uncommon/Rare Ancestries ─────────────────────────
  Catfolk: {
    fixedBoosts: { dexterity: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Catfolk (Amurrun) gain +2 Dexterity, +2 Charisma, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Catfolk', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Fetchling: {
    fixedBoosts: { dexterity: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Fetchlings (Kayals) gain +2 Dexterity, +2 Charisma, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Fetchling', 'Humanoid'],
    senses: 'Darkvision',
  },
  Hobgoblin: {
    fixedBoosts: { constitution: 2, intelligence: 2 },
    freeBoosts: 1,
    flavor: 'Hobgoblins gain +2 Constitution, +2 Intelligence, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Goblin', 'Humanoid'],
    senses: 'Darkvision',
  },
  Kholo: {
    fixedBoosts: { strength: 2, constitution: 2 },
    freeBoosts: 1,
    flavor: 'Kholos gain +2 Strength, +2 Constitution, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Gnoll', 'Humanoid'],
    senses: 'Darkvision',
  },
  Kitsune: {
    fixedBoosts: { charisma: 2 },
    freeBoosts: 1,
    flavor: 'Kitsune gain +2 Charisma and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Kitsune', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Kobold: {
    fixedBoosts: { dexterity: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Kobolds gain +2 Dexterity, +2 Charisma, and one free ability boost.',
    hp: 6, speed: 25, size: 'Small',
    traits: ['Kobold', 'Humanoid'],
    senses: 'Darkvision',
  },
  Lizardfolk: {
    fixedBoosts: { strength: 2, wisdom: 2 },
    freeBoosts: 1,
    flavor: 'Lizardfolk (Iruxi) gain +2 Strength, +2 Wisdom, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Lizardfolk', 'Humanoid'],
    senses: 'Normal',
  },
  Nagaji: {
    fixedBoosts: { wisdom: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Nagaji gain +2 Wisdom, +2 Charisma, and one free ability boost.',
    hp: 10, speed: 25, size: 'Medium',
    traits: ['Nagaji', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Ratfolk: {
    fixedBoosts: { dexterity: 2, intelligence: 2 },
    freeBoosts: 1,
    flavor: 'Ratfolk (Ysoki) gain +2 Dexterity, +2 Intelligence, and one free ability boost.',
    hp: 6, speed: 25, size: 'Small',
    traits: ['Ratfolk', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Tengu: {
    fixedBoosts: { dexterity: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Tengu gain +2 Dexterity, +2 Charisma, and one free ability boost.',
    hp: 6, speed: 25, size: 'Medium',
    traits: ['Tengu', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  // ── Player Core 2 Remaster Ancestries ──
  Android: {
    fixedBoosts: { dexterity: 2, intelligence: 2 },
    freeBoosts: 1,
    flavor: 'Androids gain +2 Dexterity, +2 Intelligence, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Android', 'Humanoid', 'Rare'],
    senses: 'Low-Light Vision',
  },
  Automaton: {
    fixedBoosts: { strength: 2, constitution: 2 },
    freeBoosts: 1,
    flavor: 'Automatons gain +2 Strength, +2 Constitution, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Automaton', 'Construct', 'Rare'],
    senses: 'Darkvision',
  },
  Grippli: {
    fixedBoosts: { dexterity: 2, wisdom: 2 },
    freeBoosts: 1,
    flavor: 'Grippli gain +2 Dexterity, +2 Wisdom, and one free ability boost.',
    hp: 6, speed: 25, size: 'Small',
    traits: ['Grippli', 'Humanoid'],
    senses: 'Low-Light Vision',
  },
  Poppet: {
    fixedBoosts: { constitution: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Poppets gain +2 Constitution, +2 Charisma, and one free ability boost.',
    hp: 6, speed: 25, size: 'Small',
    traits: ['Construct', 'Humanoid', 'Poppet'],
    senses: 'Darkvision',
  },
  Sprite: {
    fixedBoosts: { dexterity: 2, intelligence: 2 },
    freeBoosts: 1,
    flavor: 'Sprites gain +2 Dexterity, +2 Intelligence, and one free ability boost.',
    hp: 6, speed: 20, size: 'Tiny',
    traits: ['Fey', 'Sprite'],
    senses: 'Low-Light Vision',
  },
  Strix: {
    fixedBoosts: { dexterity: 2, charisma: 2 },
    freeBoosts: 1,
    flavor: 'Strix gain +2 Dexterity, +2 Charisma, and one free ability boost.',
    hp: 8, speed: 25, size: 'Medium',
    traits: ['Humanoid', 'Strix'],
    senses: 'Low-Light Vision',
  },
};

export const ANCESTRIES = Object.keys(ANCESTRY_BOOSTS).sort();

export const EXPECTED_ANCESTRY_COUNT = 24;

export function validateAncestryCoverage(expectedCount: number = EXPECTED_ANCESTRY_COUNT): string[] {
  const issues: string[] = [];
  const ancestryKeys = Object.keys(ANCESTRY_BOOSTS);
  const heritageKeys = Object.keys(HERITAGES);

  if (ancestryKeys.length !== expectedCount) {
    issues.push(`Expected ${expectedCount} ancestries, found ${ancestryKeys.length}.`);
  }

  const missingHeritageMappings = ancestryKeys.filter(a => !heritageKeys.includes(a));
  if (missingHeritageMappings.length > 0) {
    issues.push(`Missing heritage mappings for: ${missingHeritageMappings.join(', ')}.`);
  }

  const orphanHeritageMappings = heritageKeys.filter(h => !ancestryKeys.includes(h));
  if (orphanHeritageMappings.length > 0) {
    issues.push(`Heritage mappings exist for unknown ancestries: ${orphanHeritageMappings.join(', ')}.`);
  }

  for (const ancestry of ancestryKeys) {
    const data = ANCESTRY_BOOSTS[ancestry];
    const heritages = HERITAGES[ancestry] ?? [];
    if (!data.hp || !data.speed || !data.size || !data.senses || !Array.isArray(data.traits) || data.traits.length === 0) {
      issues.push(`Ancestry ${ancestry} is missing required stat block fields.`);
    }
    if (heritages.length === 0) {
      issues.push(`Ancestry ${ancestry} has no standard heritages configured.`);
    }
  }

  return issues;
}

// Background ability boosts (can be single ability or array of choices)
// PF2e backgrounds provide a choice between 2+ abilities for their boost
export const BACKGROUND_BOOSTS: Record<string, string | string[]> = {
  'Acrobat': ['Strength', 'Dexterity'],  // STR or DEX
  'Alchemist': ['Intelligence', 'Wisdom'],  // INT or WIS
  'Ancient Historian': ['Constitution', 'Intelligence'],  // CON or INT
  'Animal Helper': ['Wisdom', 'Charisma'],  // WIS or CHA
  'Artisan': ['Strength', 'Intelligence'],  // STR or INT
  'Artist': ['Dexterity', 'Charisma'],  // DEX or CHA
  'Athlete': ['Strength', 'Dexterity'],  // STR or DEX
  'Barkeep': ['Constitution', 'Charisma'],  // CON or CHA
  'Bastion Dweller': ['Wisdom', 'Charisma'],  // WIS or CHA
  'Beast Doctor': ['Constitution', 'Wisdom'],  // CON or WIS
  'Bookkeeper': ['Intelligence', 'Wisdom'],  // INT or WIS
  'Bounty Hunter': ['Strength', 'Wisdom'],  // STR or WIS
  'Brigand': ['Dexterity', 'Charisma'],  // DEX or CHA
  'Brightsmith': ['Strength', 'Intelligence'],  // STR or INT
  'Briny Sailor': ['Constitution', 'Dexterity'],  // CON or DEX
  'Burgher': ['Intelligence', 'Charisma'],  // INT or CHA
  'Butcher': ['Strength', 'Constitution'],  // STR or CON
  'Captain': ['Strength', 'Wisdom'],  // STR or WIS
  'Cardsharp': ['Dexterity', 'Charisma'],  // DEX or CHA
  'Charlatan': ['Intelligence', 'Charisma'],  // INT or CHA
  'Chef': ['Constitution', 'Intelligence'],  // CON or INT
  'City Official': ['Constitution', 'Charisma'],  // CON or CHA
  'Clerk': ['Intelligence', 'Wisdom'],  // INT or WIS
  'Climber': ['Strength', 'Dexterity'],  // STR or DEX
  'Closer': ['Strength', 'Charisma'],  // STR or CHA
  'Clown': ['Dexterity', 'Charisma'],  // DEX or CHA
  'Cobbler': ['Dexterity', 'Intelligence'],  // DEX or INT
  'Codger': ['Constitution', 'Charisma'],  // CON or CHA
  // ── Additional Player Core backgrounds ──
  'Acolyte': ['Intelligence', 'Wisdom'],  // INT or WIS
  'Cultist': ['Intelligence', 'Charisma'],  // INT or CHA
  'Criminal': ['Dexterity', 'Intelligence'],  // DEX or INT
  'Detective': ['Intelligence', 'Wisdom'],  // INT or WIS
  'Diplomat': ['Constitution', 'Charisma'],  // CON or CHA
  'Emissary': ['Intelligence', 'Charisma'],  // INT or CHA
  'Entertainer': ['Dexterity', 'Charisma'],  // DEX or CHA
  'Farmhand': ['Constitution', 'Wisdom'],  // CON or WIS
  'Field Medic': ['Constitution', 'Wisdom'],  // CON or WIS
  'Fortune Teller': ['Intelligence', 'Charisma'],  // INT or CHA
  'Gambler': ['Dexterity', 'Charisma'],  // DEX or CHA
  'Gladiator': ['Strength', 'Charisma'],  // STR or CHA
  'Guard': ['Strength', 'Charisma'],  // STR or CHA
  'Herbalist': ['Constitution', 'Wisdom'],  // CON or WIS
  'Hermit': ['Constitution', 'Intelligence'],  // CON or INT
  'Hunter': ['Dexterity', 'Wisdom'],  // DEX or WIS
  'Laborer': ['Strength', 'Constitution'],  // STR or CON
  'Martial Disciple': ['Strength', 'Dexterity'],  // STR or DEX
  'Merchant': ['Intelligence', 'Charisma'],  // INT or CHA
  'Miner': ['Strength', 'Wisdom'],  // STR or WIS
  'Noble': ['Intelligence', 'Charisma'],  // INT or CHA
  'Nomad': ['Constitution', 'Wisdom'],  // CON or WIS
  'Pilgrim': ['Constitution', 'Wisdom'],  // CON or WIS
  'Prisoner': ['Strength', 'Constitution'],  // STR or CON
  'Sailor': ['Strength', 'Dexterity'],  // STR or DEX
  'Scholar': ['Intelligence', 'Wisdom'],  // INT or WIS
  'Scout': ['Dexterity', 'Wisdom'],  // DEX or WIS
  'Street Urchin': ['Dexterity', 'Constitution'],  // DEX or CON
  'Tinker': ['Dexterity', 'Intelligence'],  // DEX or INT
  'Warrior': ['Strength', 'Constitution'],  // STR or CON
};

// ──────────────────────────────────────────────────────────
// SKILLS DATA
// ──────────────────────────────────────────────────────────

export const SKILLS = [
  'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception',
  'Diplomacy', 'Intimidation', 'Medicine', 'Nature', 'Occultism',
  'Performance', 'Religion', 'Society', 'Stealth', 'Survival',
  'Thievery', 'Lore'
] as const;

export const SKILL_ABILITIES: Record<string, string> = {
  'Acrobatics': 'dexterity',
  'Arcana': 'intelligence',
  'Athletics': 'strength',
  'Crafting': 'intelligence',
  'Deception': 'charisma',
  'Diplomacy': 'charisma',
  'Intimidation': 'charisma',
  'Medicine': 'wisdom',
  'Nature': 'wisdom',
  'Occultism': 'intelligence',
  'Performance': 'charisma',
  'Religion': 'wisdom',
  'Society': 'intelligence',
  'Stealth': 'dexterity',
  'Survival': 'wisdom',
  'Thievery': 'dexterity',
  'Lore': 'intelligence'
};

// Background skills: each background grants training in 1 specific skill + 1 Lore
export const BACKGROUND_SKILLS: Record<string, { skills: string[], lore: string }> = {
  'Acrobat': { skills: ['Acrobatics', 'Performance'], lore: 'Circus Lore' },
  'Alchemist': { skills: ['Crafting', 'Medicine'], lore: 'Alchemical Lore' },
  'Ancient Historian': { skills: ['Arcana', 'Society'], lore: 'History Lore' },
  'Animal Helper': { skills: ['Medicine', 'Nature'], lore: 'Animal Lore' },
  'Artisan': { skills: ['Crafting', 'Society'], lore: 'Guild Lore' },
  'Artist': { skills: ['Crafting', 'Performance'], lore: 'Art Lore' },
  'Athlete': { skills: ['Acrobatics', 'Athletics'], lore: 'Athletic Lore' },
  'Barkeep': { skills: ['Diplomacy', 'Society'], lore: 'Alcohol Lore' },
  'Bastion Dweller': { skills: ['Diplomacy', 'Society'], lore: 'Politics Lore' },
  'Beast Doctor': { skills: ['Medicine', 'Nature'], lore: 'Veterinary Lore' },
  'Bookkeeper': { skills: ['Crafting', 'Society'], lore: 'Accounting Lore' },
  'Bounty Hunter': { skills: ['Survival', 'Intimidation'], lore: 'Legal Lore' },
  'Brigand': { skills: ['Intimidation', 'Stealth'], lore: 'Underworld Lore' },
  'Brightsmith': { skills: ['Crafting', 'Diplomacy'], lore: 'Smithing Lore' },
  'Briny Sailor': { skills: ['Athletics', 'Nature'], lore: 'Sailing Lore' },
  'Burgher': { skills: ['Diplomacy', 'Society'], lore: 'Mercantile Lore' },
  'Butcher': { skills: ['Athletics', 'Survival'], lore: 'Butchery Lore' },
  'Captain': { skills: ['Diplomacy', 'Intimidation'], lore: 'Warfare Lore' },
  'Cardsharp': { skills: ['Deception', 'Performance'], lore: 'Games Lore' },
  'Charlatan': { skills: ['Deception', 'Society'], lore: 'Underworld Lore' },
  'Chef': { skills: ['Crafting', 'Survival'], lore: 'Cooking Lore' },
  'City Official': { skills: ['Diplomacy', 'Society'], lore: 'Legal Lore' },
  'Clerk': { skills: ['Diplomacy', 'Society'], lore: 'Bureaucracy Lore' },
  'Climber': { skills: ['Acrobatics', 'Athletics'], lore: 'Mountaineering Lore' },
  'Closer': { skills: ['Deception', 'Diplomacy'], lore: 'Mercantile Lore' },
  'Clown': { skills: ['Acrobatics', 'Performance'], lore: 'Theater Lore' },
  'Cobbler': { skills: ['Crafting', 'Society'], lore: 'Leatherworking Lore' },
  'Codger': { skills: ['Diplomacy', 'Survival'], lore: 'Farming Lore' },
  // ── Additional Player Core backgrounds ──
  'Acolyte': { skills: ['Religion', 'Diplomacy'], lore: 'Scribing Lore' },
  'Cultist': { skills: ['Occultism', 'Deception'], lore: 'Cult Lore' },
  'Criminal': { skills: ['Stealth', 'Intimidation'], lore: 'Underworld Lore' },
  'Detective': { skills: ['Society', 'Deception'], lore: 'Underworld Lore' },
  'Diplomat': { skills: ['Diplomacy', 'Society'], lore: 'Politics Lore' },
  'Emissary': { skills: ['Diplomacy', 'Society'], lore: 'City Lore' },
  'Entertainer': { skills: ['Performance', 'Acrobatics'], lore: 'Theater Lore' },
  'Farmhand': { skills: ['Athletics', 'Nature'], lore: 'Farming Lore' },
  'Field Medic': { skills: ['Medicine', 'Nature'], lore: 'Warfare Lore' },
  'Fortune Teller': { skills: ['Occultism', 'Performance'], lore: 'Fortune-Telling Lore' },
  'Gambler': { skills: ['Deception', 'Performance'], lore: 'Games Lore' },
  'Gladiator': { skills: ['Athletics', 'Performance'], lore: 'Gladiatorial Lore' },
  'Guard': { skills: ['Athletics', 'Intimidation'], lore: 'Legal Lore' },
  'Herbalist': { skills: ['Medicine', 'Nature'], lore: 'Herbalism Lore' },
  'Hermit': { skills: ['Nature', 'Occultism'], lore: 'Cave Lore' },
  'Hunter': { skills: ['Survival', 'Stealth'], lore: 'Tanning Lore' },
  'Laborer': { skills: ['Athletics', 'Crafting'], lore: 'Labor Lore' },
  'Martial Disciple': { skills: ['Acrobatics', 'Athletics'], lore: 'Warfare Lore' },
  'Merchant': { skills: ['Diplomacy', 'Society'], lore: 'Mercantile Lore' },
  'Miner': { skills: ['Survival', 'Crafting'], lore: 'Mining Lore' },
  'Noble': { skills: ['Diplomacy', 'Society'], lore: 'Heraldry Lore' },
  'Nomad': { skills: ['Survival', 'Nature'], lore: 'Desert Lore' },
  'Pilgrim': { skills: ['Religion', 'Diplomacy'], lore: 'Pilgrimage Lore' },
  'Prisoner': { skills: ['Stealth', 'Intimidation'], lore: 'Underworld Lore' },
  'Sailor': { skills: ['Athletics', 'Acrobatics'], lore: 'Sailing Lore' },
  'Scholar': { skills: ['Arcana', 'Religion'], lore: 'Academia Lore' },
  'Scout': { skills: ['Survival', 'Nature'], lore: 'Scouting Lore' },
  'Street Urchin': { skills: ['Thievery', 'Stealth'], lore: 'City Lore' },
  'Tinker': { skills: ['Crafting', 'Society'], lore: 'Engineering Lore' },
  'Warrior': { skills: ['Athletics', 'Intimidation'], lore: 'Warfare Lore' },
};

// Class skills: automatic training + additional picks (PF2e Remaster)
// autoTrained: skills the class automatically trains you in
// choiceTrained: pick one from this list (e.g., Fighter chooses Acrobatics OR Athletics)
// additionalPicks: number of additional skills you choose from ANY skill (+ INT modifier)
export const CLASS_SKILLS: Record<string, {
  autoTrained: string[];
  choiceTrained?: string[];
  additionalPicks: number;
}> = {
  'Fighter': {
    autoTrained: [],
    choiceTrained: ['Acrobatics', 'Athletics'], // Pick one
    additionalPicks: 3,  // + INT modifier
  },
  'Rogue': {
    autoTrained: ['Stealth'],
    additionalPicks: 7,  // + INT modifier; can pick from any skill
  },
  'Psychic': {
    autoTrained: ['Occultism'],
    additionalPicks: 3,  // + INT modifier
  },
  'Magus': {
    autoTrained: ['Arcana'],
    choiceTrained: ['Acrobatics', 'Athletics'], // Pick one
    additionalPicks: 2,  // + INT modifier
  },
  'Sorcerer': {
    autoTrained: [],
    choiceTrained: ['Arcana', 'Diplomacy', 'Intimidation', 'Nature', 'Occultism', 'Religion'], // Pick one from bloodline-relevant skills
    additionalPicks: 2,  // + INT modifier; Sorcerers also get 1 skill from bloodline (handled separately)
  },
  'Wizard': {
    autoTrained: ['Arcana'],
    additionalPicks: 2,  // + INT modifier
  },
  'Barbarian': {
    autoTrained: ['Athletics'],
    additionalPicks: 3,  // + INT modifier
  },
  'Champion': {
    autoTrained: ['Religion'],
    additionalPicks: 2,  // + INT modifier
  },
  'Monk': {
    autoTrained: [],
    additionalPicks: 4,  // + INT modifier
  },
  'Ranger': {
    autoTrained: ['Nature', 'Survival'],
    additionalPicks: 4,  // + INT modifier
  },
  'Cleric': {
    autoTrained: ['Religion'],
    additionalPicks: 2,  // + INT modifier
  },
  'Kineticist': {
    autoTrained: ['Nature'],
    additionalPicks: 3,  // + INT modifier
  },
  'Druid': {
    autoTrained: ['Nature'],
    choiceTrained: ['Athletics', 'Acrobatics', 'Diplomacy', 'Intimidation', 'Crafting', 'Medicine'], // Order skill (handled by order choice)
    additionalPicks: 2,  // + INT modifier
  },
  'Bard': {
    autoTrained: ['Occultism', 'Performance'],
    additionalPicks: 4,  // + INT modifier
  },
  'Guardian': {
    autoTrained: ['Athletics'],
    additionalPicks: 3,  // + INT modifier
  },
  'Swashbuckler': {
    autoTrained: ['Acrobatics'],
    additionalPicks: 4,  // + INT modifier
  },
  'Investigator': {
    autoTrained: ['Society'],
    additionalPicks: 4,  // + INT modifier; also gets 1+ from methodology (handled separately)
  },
  'Thaumaturge': {
    autoTrained: ['Arcana', 'Nature', 'Occultism', 'Religion'],
    additionalPicks: 3,  // + INT modifier
  },
  'Commander': {
    autoTrained: ['Society', 'Warfare Lore'],
    additionalPicks: 2,  // + INT modifier
  },
  'Gunslinger': {
    autoTrained: [],
    choiceTrained: ['Acrobatics', 'Athletics'],
    additionalPicks: 3,  // + INT modifier
  },
  'Inventor': {
    autoTrained: ['Crafting'],
    additionalPicks: 3,  // + INT modifier
  },
  'Witch': {
    autoTrained: [],
    choiceTrained: ['Arcana', 'Nature', 'Occultism', 'Religion'],
    additionalPicks: 3,  // + INT modifier
  },
  'Oracle': {
    autoTrained: ['Religion'],
    additionalPicks: 3,  // + INT modifier
  },
  'Alchemist': {
    autoTrained: ['Crafting'],
    additionalPicks: 3,  // + INT modifier
  },
  'Animist': {
    autoTrained: ['Religion'],
    choiceTrained: ['Nature', 'Occultism'],
    additionalPicks: 2,  // + INT modifier
  },
  'Exemplar': {
    autoTrained: ['Religion'],
    additionalPicks: 3,  // + INT modifier
  },
  'Summoner': {
    autoTrained: [],
    choiceTrained: ['Arcana', 'Nature', 'Occultism', 'Religion'],
    additionalPicks: 3,  // + INT modifier
  },
};

// ──────────────────────────────────────────────────────────
// CLASS PROGRESSION TABLES (PF2e Remaster)
// Defines which levels grant feat slots, skill increases, etc.
// Reference: https://2e.aonprd.com/Classes.aspx
// ──────────────────────────────────────────────────────────
export interface ClassProgression {
  classFeatLevels: number[];
  skillFeatLevels: number[];
  generalFeatLevels: number[];
  ancestryFeatLevels: number[];
  skillIncreaseLevels: number[];
  abilityBoostLevels: number[];  // Beyond level 1
}

// Default class progression (standard PF2e pattern for most classes)
export const DEFAULT_CLASS_PROGRESSION: ClassProgression = {
  classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  generalFeatLevels: [3, 7, 11, 15, 19],
  ancestryFeatLevels: [1, 5, 9, 13, 17],
  skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
  abilityBoostLevels: [5, 10, 15, 20],
};

/** Get class progression, falling back to default PF2e pattern */
export function getClassProgression(className: string): ClassProgression {
  return CLASS_PROGRESSION[className] ?? DEFAULT_CLASS_PROGRESSION;
}

export const CLASS_PROGRESSION: Record<string, ClassProgression> = {
  Fighter: {
    // Fighter feat at 1st and every even level
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // General feat at 3 and every 4 levels
    generalFeatLevels: [3, 7, 11, 15, 19],
    // Ancestry feat at 1 (from ancestry) and every 4 levels from 5
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    // Skill increase at 3 and every 2 levels
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    // Attribute boosts beyond level 1
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Rogue: {
    // Rogue feat at 1st and every even level
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Rogues get a skill feat at 1st and EVERY level thereafter
    skillFeatLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    // Rogues get a skill increase at 2nd and EVERY level thereafter
    skillIncreaseLevels: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Psychic: {
    // Psychic feat at 2nd and every even level (no class feat at L1)
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Magus: {
    // Magus feat at 2nd and every even level
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Sorcerer: {
    // Sorcerer feat at every even level
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Wizard: {
    // Wizard feat at every even level
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Barbarian: {
    // Barbarian feat at 1st and every even level
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Champion: {
    // Champion feat at every even level (no L1 class feat)
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Monk: {
    // Monk feat at 1st and every even level
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Ranger: {
    // Ranger feat at 1st and every even level
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Cleric: {
    // Cleric feats at every even level only (no L1 class feat)
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Kineticist: {
    // Kineticist feat at 1st and every even level
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Druid: {
    // Druid feats at every even level only (no L1 class feat)
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Skill feat at every even level starting at 2
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Bard: {
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Guardian: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Swashbuckler: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Investigator: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    // Standard skill feats at even levels
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    // Investigators get a skill increase at 2nd and EVERY level thereafter (via Skillful Lessons)
    skillIncreaseLevels: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Thaumaturge: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Commander: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Gunslinger: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Inventor: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Witch: {
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Oracle: {
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Alchemist: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Animist: {
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Exemplar: {
    classFeatLevels: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
  Summoner: {
    classFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    skillFeatLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    generalFeatLevels: [3, 7, 11, 15, 19],
    ancestryFeatLevels: [1, 5, 9, 13, 17],
    skillIncreaseLevels: [3, 5, 7, 9, 11, 13, 15, 17, 19],
    abilityBoostLevels: [5, 10, 15, 20],
  },
};

// Feats are now sourced from the centralized catalog in shared/feats.ts
// This ensures the builder and combat engine use the same data.

// Class ability boosts (primary ability choices)
export const CLASS_BOOSTS: Record<string, string | string[]> = {
  'Alchemist': 'Intelligence',
  'Animist': 'Wisdom',
  'Barbarian': 'Strength',
  'Bard': 'Charisma',
  'Champion': ['Strength', 'Dexterity'],
  'Cleric': 'Wisdom',
  'Commander': 'Intelligence',
  'Druid': 'Wisdom',
  'Exemplar': ['Strength', 'Dexterity'],
  'Fighter': ['Strength', 'Dexterity'],
  'Guardian': 'Strength',
  'Gunslinger': 'Dexterity',
  'Inventor': 'Intelligence',
  'Investigator': 'Intelligence',
  'Kineticist': 'Constitution',
  'Magus': ['Strength', 'Dexterity'],
  'Monk': ['Strength', 'Dexterity'],
  'Oracle': 'Charisma',
  'Psychic': ['Intelligence', 'Charisma'],
  'Ranger': ['Strength', 'Dexterity'],
  'Rogue': 'Dexterity',
  'Sorcerer': 'Charisma',
  'Summoner': 'Charisma',
  'Swashbuckler': 'Dexterity',
  'Thaumaturge': 'Charisma',
  'Witch': 'Intelligence',
  'Wizard': 'Intelligence',
};

export const BASE_PROFICIENCIES: ProficiencyProfile = {
  unarmed: 'untrained',
  simpleWeapons: 'untrained',
  martialWeapons: 'untrained',
  advancedWeapons: 'untrained',
  unarmored: 'untrained',
  lightArmor: 'untrained',
  mediumArmor: 'untrained',
  heavyArmor: 'untrained',
  fortitude: 'untrained',
  reflex: 'untrained',
  will: 'untrained',
  perception: 'untrained',
  classDC: 'untrained',
  spellAttack: 'untrained',
  spellDC: 'untrained',
};

export const CLASS_STARTING_PROFICIENCIES: Record<string, Partial<ProficiencyProfile>> = {
  Fighter: {
    unarmed: 'expert',
    simpleWeapons: 'expert',
    martialWeapons: 'expert',
    advancedWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    heavyArmor: 'trained',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
    perception: 'expert',
    classDC: 'trained',
  },
  Rogue: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    fortitude: 'trained',
    reflex: 'expert',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
  },
  Psychic: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Magus: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Sorcerer: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Wizard: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Barbarian: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
  },
  Champion: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    heavyArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Monk: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'expert',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
  },
  Ranger: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
    perception: 'expert',
    classDC: 'trained',
  },
  Cleric: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Kineticist: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
    perception: 'trained',
    classDC: 'trained',
  },
  Druid: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Bard: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Guardian: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    heavyArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
  },
  Swashbuckler: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    fortitude: 'trained',
    reflex: 'expert',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
  },
  Investigator: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    fortitude: 'trained',
    reflex: 'expert',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
  },
  Thaumaturge: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
  },
  Commander: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    heavyArmor: 'trained',
    fortitude: 'trained',
    reflex: 'expert',
    will: 'expert',
    perception: 'expert',
    classDC: 'trained',
  },
  Gunslinger: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
    perception: 'expert',
    classDC: 'trained',
  },
  Inventor: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
  },
  Witch: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Oracle: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Alchemist: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
    perception: 'trained',
    classDC: 'trained',
  },
  Animist: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
  Exemplar: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'trained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
  },
  Summoner: {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    unarmored: 'trained',
    fortitude: 'expert',
    reflex: 'trained',
    will: 'expert',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'trained',
    spellDC: 'trained',
  },
};

/**
 * Apply class feature proficiency upgrades based on class and level.
 * This handles automatic proficiency progression from class features.
 */
export function applyClassFeatureProficiencies(
  className: string,
  level: number,
  proficiencies: ProficiencyProfile,
  classSpecific?: Record<string, string>
): ProficiencyProfile {
  const result = { ...proficiencies };

  // Helper to upgrade proficiency rank (never downgrades)
  const upgrade = (current: ProfRank, target: ProfRank): ProfRank => {
    const ranks: ProfRank[] = ['untrained', 'trained', 'expert', 'master', 'legendary'];
    const currentRank = ranks.indexOf(current);
    const targetRank = ranks.indexOf(target);
    return targetRank > currentRank ? target : current;
  };

  // Rogue proficiency progression
  if (className === 'Rogue') {
    // Level 5: Weapon Tricks — simple/martial/unarmed → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }

    // Level 7: Evasive Reflexes — Reflex → master; Perception Mastery — Perception → master
    if (level >= 7) {
      result.reflex = upgrade(result.reflex, 'master');
      result.perception = upgrade(result.perception, 'master');
    }

    // Level 9: Rogue Resilience — Fort → expert
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }

    // Level 11: Rogue Expertise — class DC → expert
    if (level >= 11) {
      result.classDC = upgrade(result.classDC, 'expert');
    }

    // Level 13: Incredible Senses — Perception → legendary; Greater Rogue Reflexes — Reflex → legendary;
    //           Light Armor Expertise — light/unarmored → expert; Master Tricks — weapons → master
    if (level >= 13) {
      result.perception = upgrade(result.perception, 'legendary');
      result.reflex = upgrade(result.reflex, 'legendary');
      result.lightArmor = upgrade(result.lightArmor, 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons, 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }

    // Level 17: Agile Mind — Will → master
    if (level >= 17) {
      result.will = upgrade(result.will, 'master');
    }

    // Level 19: Light Armor Mastery — light/unarmored → master; Master Strike — class DC → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor, 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
      result.classDC = upgrade(result.classDC, 'master');
    }
  }

  // Fighter proficiency progression
  if (className === 'Fighter') {
    // Level 3: Bravery — Will → expert
    if (level >= 3) {
      result.will = upgrade(result.will, 'expert');
    }

    // Level 7: Battlefield Surveyor — Perception → master
    if (level >= 7) {
      result.perception = upgrade(result.perception, 'master');
    }

    // Level 9: Battle Hardened — Fort → master
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'master');
    }

    // Level 11: Fighter Expertise — class DC → expert; Armor Expertise — all armor → expert
    if (level >= 11) {
      result.classDC = upgrade(result.classDC, 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.lightArmor = upgrade(result.lightArmor, 'expert');
      result.mediumArmor = upgrade(result.mediumArmor, 'expert');
      result.heavyArmor = upgrade(result.heavyArmor, 'expert');
    }

    // Level 13: Weapon Legend — simple/martial/unarmed → master
    if (level >= 13) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons, 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }

    // Level 15: Tempered Reflexes — Reflex → master
    if (level >= 15) {
      result.reflex = upgrade(result.reflex, 'master');
    }

    // Level 17: Armor Mastery — all armor → master
    if (level >= 17) {
      result.unarmored = upgrade(result.unarmored, 'master');
      result.lightArmor = upgrade(result.lightArmor, 'master');
      result.mediumArmor = upgrade(result.mediumArmor, 'master');
      result.heavyArmor = upgrade(result.heavyArmor, 'master');
    }

    // Level 19: Versatile Legend — simple/martial/unarmed → legendary; class DC → master
    if (level >= 19) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'legendary');
      result.martialWeapons = upgrade(result.martialWeapons, 'legendary');
      result.unarmed = upgrade(result.unarmed, 'legendary');
      result.classDC = upgrade(result.classDC, 'master');
    }
  }

  // Magus proficiency progression
  if (className === 'Magus') {
    // Level 5: Lightning Reflexes — Reflex → expert; Weapon Expertise — weapons → expert
    if (level >= 5) {
      result.reflex = upgrade(result.reflex, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons, 'expert');
    }

    // Level 9: Alertness — Perception → expert; Expert Spellcaster; Resolve — Will → master
    if (level >= 9) {
      result.perception = upgrade(result.perception, 'expert');
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
      result.will = upgrade(result.will, 'master');
    }

    // Level 11: Medium Armor Expertise — armor → expert
    if (level >= 11) {
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.lightArmor = upgrade(result.lightArmor, 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
    }

    // Level 13: Weapon Mastery — weapons → master
    if (level >= 13) {
      result.unarmed = upgrade(result.unarmed, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons, 'master');
    }

    // Level 15: Juggernaut — Fort → master
    if (level >= 15) {
      result.fortitude = upgrade(result.fortitude, 'master');
    }

    // Level 17: Master Spellcaster; Medium Armor Mastery — armor → master
    if (level >= 17) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
      result.lightArmor = upgrade(result.lightArmor, 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
    }
  }

  // Psychic proficiency progression
  if (className === 'Psychic') {
    // Level 5: Precognitive Reflexes
    if (level >= 5) {
      result.reflex = upgrade(result.reflex, 'expert');
    }

    // Level 7: Expert Spellcaster
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }

    // Level 9: Great Fortitude
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }

    // Level 11: Extrasensory Perception, Walls of Will, Weapon Expertise
    if (level >= 11) {
      result.perception = upgrade(result.perception, 'expert');
      result.will = upgrade(result.will, 'master');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
    }

    // Level 13: Personal Barrier — unarmored → expert
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'expert');
    }

    // Level 15: Master Spellcaster
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }

    // Level 17: Fortress of Will
    if (level >= 17) {
      result.will = upgrade(result.will, 'legendary');
    }

    // Level 19: Legendary Spellcaster
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // Sorcerer proficiency progression
  if (className === 'Sorcerer') {
    // Level 5: Magical Fortitude — Fort → expert
    if (level >= 5) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }

    // Level 7: Expert Spellcaster
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }

    // Level 9: Reflex Expert — Reflex → expert
    if (level >= 9) {
      result.reflex = upgrade(result.reflex, 'expert');
    }

    // Level 11: Perception Expert — Perception → expert; Weapon Expertise — simple/unarmed → expert
    if (level >= 11) {
      result.perception = upgrade(result.perception, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
    }

    // Level 13: Defensive Robes — unarmored → expert
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'expert');
    }

    // Level 15: Master Spellcaster
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }

    // Level 17: Majestic Will — Will → master
    if (level >= 17) {
      result.will = upgrade(result.will, 'master');
    }

    // Level 19: Legendary Spellcaster
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // Wizard proficiency progression
  if (className === 'Wizard') {
    // Level 5: Reflex Expertise — Reflex → expert
    if (level >= 5) {
      result.reflex = upgrade(result.reflex, 'expert');
    }

    // Level 7: Expert Spellcaster
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }

    // Level 9: Magical Fortitude — Fort → expert
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }

    // Level 11: Perception Expertise — Perception → expert; Weapon Expertise — simple/unarmed → expert
    if (level >= 11) {
      result.perception = upgrade(result.perception, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
    }

    // Level 13: Defensive Robes — unarmored → expert
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'expert');
    }

    // Level 15: Master Spellcaster
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }

    // Level 17: Prodigious Will — Will → master
    if (level >= 17) {
      result.will = upgrade(result.will, 'master');
    }

    // Level 19: Legendary Spellcaster
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // Barbarian proficiency progression
  if (className === 'Barbarian') {
    // Level 5: Brutality — simple/martial/unarmed → expert
    if (level >= 5) {
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons, 'expert');
    }

    // Level 7: Juggernaut — Fort → master
    if (level >= 7) {
      result.fortitude = upgrade(result.fortitude, 'master');
    }

    // Level 9: Reflex Expertise — Reflex → expert
    if (level >= 9) {
      result.reflex = upgrade(result.reflex, 'expert');
    }

    // Level 11: Mighty Rage — class DC → expert
    if (level >= 11) {
      result.classDC = upgrade(result.classDC, 'expert');
    }

    // Level 13: Greater Juggernaut — Fort → legendary; Medium Armor Expertise — armor → expert; Weapon Mastery — weapons → master
    if (level >= 13) {
      result.fortitude = upgrade(result.fortitude, 'legendary');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.lightArmor = upgrade(result.lightArmor, 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons, 'master');
    }

    // Level 15: Indomitable Will — Will → master
    if (level >= 15) {
      result.will = upgrade(result.will, 'master');
    }

    // Level 17: Perception Mastery — Perception → master
    if (level >= 17) {
      result.perception = upgrade(result.perception, 'master');
    }

    // Level 19: Armor Mastery — armor → master; Devastator — class DC → master
    if (level >= 19) {
      result.unarmored = upgrade(result.unarmored, 'master');
      result.lightArmor = upgrade(result.lightArmor, 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.classDC = upgrade(result.classDC, 'master');
    }
  }

  // Champion proficiency progression
  if (className === 'Champion') {
    // Level 5: Weapon Expertise — simple/martial/unarmed → expert
    if (level >= 5) {
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons, 'expert');
    }

    // Level 7: Armor Expertise — all armor + unarmored → expert
    if (level >= 7) {
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.lightArmor = upgrade(result.lightArmor, 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'expert');
    }

    // Level 9: Champion Expertise — class DC + spell attack/DC → expert; Reflex Expertise — Reflex → expert; Sacred Body — Fort → master
    if (level >= 9) {
      result.classDC = upgrade(result.classDC, 'expert');
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
      result.reflex = upgrade(result.reflex, 'expert');
      result.fortitude = upgrade(result.fortitude, 'master');
    }

    // Level 11: Divine Will — Will → master; Perception Expertise — Perception → expert
    if (level >= 11) {
      result.will = upgrade(result.will, 'master');
      result.perception = upgrade(result.perception, 'expert');
    }

    // Level 13: Armor Mastery + Weapon Mastery
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'master');
      result.lightArmor = upgrade(result.lightArmor, 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons, 'master');
    }

    // Level 17: Champion Mastery — class DC + spell attack/DC → master; Legendary Armor
    if (level >= 17) {
      result.classDC = upgrade(result.classDC, 'master');
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'legendary');
      result.lightArmor = upgrade(result.lightArmor, 'legendary');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'legendary');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'legendary');
    }
  }

  // Monk proficiency progression
  if (className === 'Monk') {
    // Level 5: Expert Strikes — unarmed + simple → expert; Alertness — Perception → expert
    if (level >= 5) {
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.perception = upgrade(result.perception, 'expert');
    }

    // Level 7: Path to Perfection — choose one save → master
    // Default: Fort → master (most common pick since all three saves start at expert)
    // TODO: Builder should track choice via classSpecific.pathToPerfection
    if (level >= 7) {
      const ptpChoice = classSpecific?.pathToPerfection || 'fortitude';
      if (ptpChoice === 'fortitude') result.fortitude = upgrade(result.fortitude, 'master');
      else if (ptpChoice === 'reflex') result.reflex = upgrade(result.reflex, 'master');
      else if (ptpChoice === 'will') result.will = upgrade(result.will, 'master');
    }

    // Level 9: Monk Expertise — class DC → expert; Monk Mastery (L9 Perception stays same)
    if (level >= 9) {
      result.classDC = upgrade(result.classDC, 'expert');
    }

    // Level 11: Second Path to Perfection — choose another save → master
    // Default: Reflex → master (or whichever wasn't chosen at L7)
    if (level >= 11) {
      const ptpChoice = classSpecific?.pathToPerfection || 'fortitude';
      const sptpChoice = classSpecific?.secondPathToPerfection || (ptpChoice === 'fortitude' ? 'reflex' : 'fortitude');
      if (sptpChoice === 'fortitude') result.fortitude = upgrade(result.fortitude, 'master');
      else if (sptpChoice === 'reflex') result.reflex = upgrade(result.reflex, 'master');
      else if (sptpChoice === 'will') result.will = upgrade(result.will, 'master');
    }

    // Level 13: Graceful Mastery — unarmored → master; Master Strikes — unarmed + simple → master
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
    }

    // Level 15: Third Path to Perfection — last save → master
    // Default: Will → master (whichever wasn't chosen at L7 or L11)
    if (level >= 15) {
      const ptpChoice = classSpecific?.pathToPerfection || 'fortitude';
      const sptpChoice = classSpecific?.secondPathToPerfection || (ptpChoice === 'fortitude' ? 'reflex' : 'fortitude');
      // The remaining save gets master
      const chosen = [ptpChoice, sptpChoice];
      if (!chosen.includes('fortitude')) result.fortitude = upgrade(result.fortitude, 'master');
      if (!chosen.includes('reflex')) result.reflex = upgrade(result.reflex, 'master');
      if (!chosen.includes('will')) result.will = upgrade(result.will, 'master');
    }

    // Level 17: Graceful Legend — unarmored → legendary; class DC → master
    if (level >= 17) {
      result.unarmored = upgrade(result.unarmored, 'legendary');
      result.classDC = upgrade(result.classDC, 'master');
    }

    // Level 19: Perfected Form — unarmed → legendary
    if (level >= 19) {
      result.unarmed = upgrade(result.unarmed, 'legendary');
    }
  }

  // Ranger proficiency progression
  if (className === 'Ranger') {
    // Level 3: Will Expertise — Will → expert
    if (level >= 3) {
      result.will = upgrade(result.will, 'expert');
    }

    // Level 5: Ranger Weapon Expertise — simple/martial/unarmed → expert
    if (level >= 5) {
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons, 'expert');
    }

    // Level 7: Natural Reflexes — Reflex → master; Perception Mastery — Perception → master
    if (level >= 7) {
      result.reflex = upgrade(result.reflex, 'master');
      result.perception = upgrade(result.perception, 'master');
    }

    // Level 9: Ranger Expertise — class DC → expert
    if (level >= 9) {
      result.classDC = upgrade(result.classDC, 'expert');
    }

    // Level 11: Warden's Endurance — Fort → master; Medium Armor Expertise — armor → expert
    if (level >= 11) {
      result.fortitude = upgrade(result.fortitude, 'master');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.lightArmor = upgrade(result.lightArmor, 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
    }

    // Level 13: Martial Weapon Mastery — simple/martial/unarmed → master
    if (level >= 13) {
      result.unarmed = upgrade(result.unarmed, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons, 'master');
    }

    // Level 15: Greater Natural Reflexes — Reflex → legendary; Perception Legend — Perception → legendary
    if (level >= 15) {
      result.reflex = upgrade(result.reflex, 'legendary');
      result.perception = upgrade(result.perception, 'legendary');
    }

    // Level 17: Masterful Hunter — class DC → master
    if (level >= 17) {
      result.classDC = upgrade(result.classDC, 'master');
    }

    // Level 19: Medium Armor Mastery — armor
    // Level 19: Second Skin — light/medium/unarmored → master
    if (level >= 19) {
      result.unarmored = upgrade(result.unarmored, 'master');
      result.lightArmor = upgrade(result.lightArmor, 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
    }
  }

  // Cleric proficiency progression
  if (className === 'Cleric') {
    const doctrine = classSpecific?.doctrine || '';

    // ── Doctrine-specific L1 proficiency grants ──
    if (doctrine === 'warpriest') {
      // 1st Doctrine: trained light/medium armor, expert Fort
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'trained');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'trained');
      result.fortitude = upgrade(result.fortitude, 'expert');
    }
    if (doctrine === 'battle-creed') {
      // Initial Creed: trained light/medium armor, expert Fort, trained martial weapons
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'trained');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'trained');
      result.fortitude = upgrade(result.fortitude, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'trained');
    }

    // ── Cloistered Cleric doctrine progression ──
    if (doctrine === 'cloistered') {
      // 2nd Doctrine (L3): Fort → expert
      if (level >= 3) {
        result.fortitude = upgrade(result.fortitude, 'expert');
      }
      // 3rd Doctrine (L7): Spell attack/DC → expert
      if (level >= 7) {
        result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
        result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
      }
      // 4th Doctrine (L11): Simple/unarmed → expert (+ deity weapon crit spec)
      if (level >= 11) {
        result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
        result.unarmed = upgrade(result.unarmed, 'expert');
      }
      // 5th Doctrine (L15): Spell attack/DC → master
      if (level >= 15) {
        result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
        result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
      }
      // Final Doctrine (L19): Spell attack/DC → legendary
      if (level >= 19) {
        result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
        result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
      }
    }

    // ── Warpriest doctrine progression ──
    if (doctrine === 'warpriest') {
      // 2nd Doctrine (L3): Trained martial weapons
      if (level >= 3) {
        result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'trained');
      }
      // 3rd Doctrine (L7): Simple/martial/unarmed → expert (+ deity weapon crit spec)
      if (level >= 7) {
        result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
        result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
        result.unarmed = upgrade(result.unarmed, 'expert');
      }
      // 4th Doctrine (L11): Spell attack/DC → expert
      if (level >= 11) {
        result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
        result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
      }
      // Divine Defense interaction (L13): medium armor → expert (in addition to common unarmored/light)
      if (level >= 13) {
        result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      }
      // 5th Doctrine (L15): Fort → master (success → crit success)
      if (level >= 15) {
        result.fortitude = upgrade(result.fortitude, 'master');
      }
      // Final Doctrine (L19): Spell attack/DC → master (+ deity weapon → master)
      if (level >= 19) {
        result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
        result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
      }
    }

    // ── Battle Creed doctrine progression (Divine Mysteries) ──
    if (doctrine === 'battle-creed') {
      // Lesser Creed (L5): Simple/martial/unarmed → expert, class DC → expert (+ deity weapon crit spec)
      if (level >= 5) {
        result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
        result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
        result.unarmed = upgrade(result.unarmed, 'expert');
        result.classDC = upgrade(result.classDC, 'expert');
      }
      // Moderate Creed (L9): Reactive Strike (feat grant, not proficiency)
      // Greater Creed (L11): Spell attack/DC → expert
      if (level >= 11) {
        result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
        result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
      }
      // Major Creed (L13): Fort → master (success → crit), medium armor → expert, deity weapon → master (per-weapon, not tracked)
      if (level >= 13) {
        result.fortitude = upgrade(result.fortitude, 'master');
        result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      }
      // True Creed (L15): Class DC → master, Will → master
      if (level >= 15) {
        result.classDC = upgrade(result.classDC, 'master');
        result.will = upgrade(result.will, 'master');
      }
      // Final Creed (L19): Light/medium/unarmored → master, class DC → legendary
      if (level >= 19) {
        result.unarmored = upgrade(result.unarmored, 'master');
        result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
        result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
        result.classDC = upgrade(result.classDC, 'legendary');
      }
    }

    // ── Common Cleric features (all doctrines) ──
    // Level 5: Alertness — Perception → expert
    if (level >= 5) {
      result.perception = upgrade(result.perception, 'expert');
    }

    // Level 9: Resolve — Will → master (success → crit success)
    if (level >= 9) {
      result.will = upgrade(result.will, 'master');
    }

    // Level 11: Lightning Reflexes — Reflex → expert
    if (level >= 11) {
      result.reflex = upgrade(result.reflex, 'expert');
    }

    // Level 13: Divine Defense — unarmored/light → expert
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
    }

    // Level 17: Resolute Faith — Will → legendary (Battle Creed does NOT gain this)
    if (level >= 17 && doctrine !== 'battle-creed') {
      result.will = upgrade(result.will, 'legendary');
    }
  }

  // ── Kineticist progression ──
  // Reference: https://2e.aonprd.com/Classes.aspx?ID=23
  if (className === 'Kineticist') {
    // Level 3: Will Expertise — Will → expert
    if (level >= 3) {
      result.will = upgrade(result.will, 'expert');
    }
    // Level 7: Kinetic Durability — Fort → master (success → crit success)
    //          Kinetic Expertise — class DC → expert
    if (level >= 7) {
      result.fortitude = upgrade(result.fortitude, 'master');
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 9: Perception Expertise — Perception → expert
    if (level >= 9) {
      result.perception = upgrade(result.perception, 'expert');
    }
    // Level 11: Kinetic Quickness — Reflex → master (success → crit success)
    //           Weapon Expertise — simple/unarmed → expert
    if (level >= 11) {
      result.reflex = upgrade(result.reflex, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 13: Light Armor Expertise — light/unarmored → expert
    //           Weapon Specialization (damage bonus, not proficiency)
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Greater Kinetic Durability — Fort → legendary
    //           Kinetic Mastery — class DC → master
    if (level >= 15) {
      result.fortitude = upgrade(result.fortitude, 'legendary');
      result.classDC = upgrade(result.classDC, 'master');
    }
    // Level 19: Kinetic Legend — class DC → legendary
    //           Light Armor Mastery — light/unarmored → master
    if (level >= 19) {
      result.classDC = upgrade(result.classDC, 'legendary');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── Druid progression ──
  // Reference: https://2e.aonprd.com/Classes.aspx?ID=34
  if (className === 'Druid') {
    // Level 3: Perception Expertise — Perception → expert
    //          Fortitude Expertise — Fort → expert
    if (level >= 3) {
      result.perception = upgrade(result.perception, 'expert');
      result.fortitude = upgrade(result.fortitude, 'expert');
    }
    // Level 5: Reflex Expertise — Reflex → expert
    if (level >= 5) {
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 7: Expert Spellcaster — spell attack/DC → expert
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }
    // Level 11: Weapon Expertise — simple/unarmed → expert
    //           Wild Willpower — Will → master (success → crit success)
    if (level >= 11) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.will = upgrade(result.will, 'master');
    }
    // Level 13: Medium Armor Expertise — light/medium/unarmored → expert
    //           Weapon Specialization (damage bonus, not proficiency)
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Master Spellcaster — spell attack/DC → master
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }
    // Level 19: Legendary Spellcaster — spell attack/DC → legendary
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // ── Bard progression ──
  // Reference: https://2e.aonprd.com/Classes.aspx?ID=32
  if (className === 'Bard') {
    // Level 3: Reflex Expertise — Reflex → expert
    if (level >= 3) {
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 7: Expert Spellcaster — spell attack/DC → expert
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }
    // Level 9: Fortitude Expertise — Fort → expert
    //          Performer's Heart — Will → master (success → crit success)
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
      result.will = upgrade(result.will, 'master');
    }
    // Level 11: Bard Weapon Expertise — simple/martial/unarmed → expert
    //           Perception Mastery — Perception → master
    if (level >= 11) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.perception = upgrade(result.perception, 'master');
    }
    // Level 13: Light Armor Expertise — light/unarmored → expert
    //           Weapon Specialization (damage bonus, not proficiency)
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Master Spellcaster — spell attack/DC → master
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }
    // Level 17: Greater Performer's Heart — Will → legendary (crit fail → fail)
    if (level >= 17) {
      result.will = upgrade(result.will, 'legendary');
    }
    // Level 19: Legendary Spellcaster — spell attack/DC → legendary
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // ── GUARDIAN ──
  else if (className === 'Guardian') {
    // Level 5: Weapon Expertise → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Perception → expert, Reflex → expert
    if (level >= 7) {
      result.perception = upgrade(result.perception, 'expert');
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 9: Fort → master (success→crit)
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'master');
    }
    // Level 11: Guardian Expertise — classDC → expert, Armor → expert
    if (level >= 11) {
      result.classDC = upgrade(result.classDC, 'expert');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 13: Weapon Mastery → master
    if (level >= 13) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 15: Armor → master
    if (level >= 15) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
    // Level 17: Will → master (success→crit)
    if (level >= 17) {
      result.will = upgrade(result.will, 'master');
    }
    // Level 19: Armor → legendary
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'legendary');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'legendary');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'legendary');
      result.unarmored = upgrade(result.unarmored, 'legendary');
    }
  }

  // ── SWASHBUCKLER ──
  else if (className === 'Swashbuckler') {
    // Level 3: Fortitude → expert
    if (level >= 3) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }
    // Level 5: Weapon Expertise → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Reflex → master (success→crit)
    if (level >= 7) {
      result.reflex = upgrade(result.reflex, 'master');
    }
    // Level 9: Swashbuckler Expertise — classDC → expert
    if (level >= 9) {
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 11: Perception → master
    if (level >= 11) {
      result.perception = upgrade(result.perception, 'master');
    }
    // Level 13: Light Armor → expert, Weapon → master, Reflex crit fail→fail
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 17: Will → success→crit
    if (level >= 17) {
      result.will = upgrade(result.will, 'master');
    }
    // Level 19: Light Armor → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── INVESTIGATOR ──
  else if (className === 'Investigator') {
    // Level 5: Weapon Expertise → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Perception → master
    if (level >= 7) {
      result.perception = upgrade(result.perception, 'master');
    }
    // Level 9: Fort → expert, classDC → expert
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 11: Will → master (success→crit)
    if (level >= 11) {
      result.will = upgrade(result.will, 'master');
    }
    // Level 13: Perception → legendary, Light Armor → expert, Weapon → master
    if (level >= 13) {
      result.perception = upgrade(result.perception, 'legendary');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 19: Light Armor → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── THAUMATURGE ──
  else if (className === 'Thaumaturge') {
    // Level 3: Reflex → expert
    if (level >= 3) {
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 5: Weapon Expertise → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Will → master
    if (level >= 7) {
      result.will = upgrade(result.will, 'master');
    }
    // Level 9: Perception → master, classDC → expert
    if (level >= 9) {
      result.perception = upgrade(result.perception, 'master');
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 11: Armor → expert
    if (level >= 11) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 13: Weapon → master
    if (level >= 13) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 15: classDC → master
    if (level >= 15) {
      result.classDC = upgrade(result.classDC, 'master');
    }
    // Level 19: Armor → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── COMMANDER ──
  else if (className === 'Commander') {
    // Level 5: Weapon → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 9: Fort → expert, classDC → expert
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 11: Armor → expert, Will → master
    if (level >= 11) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.will = upgrade(result.will, 'master');
    }
    // Level 13: Perception → master, Weapon → master
    if (level >= 13) {
      result.perception = upgrade(result.perception, 'master');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 15: classDC → master
    if (level >= 15) {
      result.classDC = upgrade(result.classDC, 'master');
    }
    // Level 17: Armor → master
    if (level >= 17) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.heavyArmor = upgrade(result.heavyArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── GUNSLINGER ──
  else if (className === 'Gunslinger') {
    // Level 3: Will → expert
    if (level >= 3) {
      result.will = upgrade(result.will, 'expert');
    }
    // Level 5: Weapons → expert (firearms/crossbows → master handled as class-specific)
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Perception → master
    if (level >= 7) {
      result.perception = upgrade(result.perception, 'master');
    }
    // Level 9: classDC → expert
    if (level >= 9) {
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 13: Weapons → master, Armor → expert
    if (level >= 13) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 17: classDC → master
    if (level >= 17) {
      result.classDC = upgrade(result.classDC, 'master');
    }
    // Level 19: Perception → legendary, Armor → master
    if (level >= 19) {
      result.perception = upgrade(result.perception, 'legendary');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── INVENTOR ──
  else if (className === 'Inventor') {
    // Level 5: Weapon → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Reflex → expert
    if (level >= 7) {
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 9: classDC → expert
    if (level >= 9) {
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 11: Armor → expert, Will → master (Resolve, success→crit)
    if (level >= 11) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.will = upgrade(result.will, 'master');
    }
    // Level 13: Perception → expert (Alertness), Weapon → master
    if (level >= 13) {
      result.perception = upgrade(result.perception, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 15: classDC → master
    if (level >= 15) {
      result.classDC = upgrade(result.classDC, 'master');
    }
    // Level 17: Fort → master (Juggernaut, success→crit)
    if (level >= 17) {
      result.fortitude = upgrade(result.fortitude, 'master');
    }
    // Level 19: Armor → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── WITCH ──
  else if (className === 'Witch') {
    // Level 5: Fort → expert
    if (level >= 5) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }
    // Level 7: Expert Spellcaster
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }
    // Level 9: Reflex → expert
    if (level >= 9) {
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 11: Perception → expert
    if (level >= 11) {
      result.perception = upgrade(result.perception, 'expert');
    }
    // Level 13: Defensive Robes — unarmored → expert
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Master Spellcaster
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }
    // Level 19: Legendary Spellcaster
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // ── ORACLE ──
  else if (className === 'Oracle') {
    // Level 7: Will → master (Mysterious Resolve), Expert Spellcaster
    if (level >= 7) {
      result.will = upgrade(result.will, 'master');
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }
    // Level 9: Fort → expert
    if (level >= 9) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }
    // Level 11: Perception → expert (Oracular Senses)
    if (level >= 11) {
      result.perception = upgrade(result.perception, 'expert');
    }
    // Level 13: Light Armor → expert, Reflex → expert
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 15: Master Spellcaster
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }
    // Level 19: Legendary Spellcaster
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // ── ALCHEMIST ──
  else if (className === 'Alchemist') {
    // Level 7: Will → expert, Weapon → expert
    if (level >= 7) {
      result.will = upgrade(result.will, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 9: Perception → expert, classDC → expert
    if (level >= 9) {
      result.perception = upgrade(result.perception, 'expert');
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 11: Fort → master (Chemical Hardiness, success→crit)
    if (level >= 11) {
      result.fortitude = upgrade(result.fortitude, 'master');
    }
    // Level 13: Armor → expert
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Weapon → master, classDC → master, Reflex → master (success→crit)
    if (level >= 15) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
      result.classDC = upgrade(result.classDC, 'master');
      result.reflex = upgrade(result.reflex, 'master');
    }
    // Level 19: Armor → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── ANIMIST ──
  else if (className === 'Animist') {
    // Level 3: Fort → expert
    if (level >= 3) {
      result.fortitude = upgrade(result.fortitude, 'expert');
    }
    // Level 7: Expert Spellcaster
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }
    // Level 9: Perception → expert
    if (level >= 9) {
      result.perception = upgrade(result.perception, 'expert');
    }
    // Level 11: Weapon → expert, Armor → expert
    if (level >= 11) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Master Spellcaster
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
    }
    // Level 19: Legendary Spellcaster
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
    }
  }

  // ── EXEMPLAR ──
  else if (className === 'Exemplar') {
    // Level 5: Weapon → expert
    if (level >= 5) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
    }
    // Level 7: Will → master (Unassailable Soul)
    if (level >= 7) {
      result.will = upgrade(result.will, 'master');
    }
    // Level 9: Perception → expert, classDC → expert
    if (level >= 9) {
      result.perception = upgrade(result.perception, 'expert');
      result.classDC = upgrade(result.classDC, 'expert');
    }
    // Level 13: Armor → expert, Weapon → master
    if (level >= 13) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'expert');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'expert');
      result.unarmored = upgrade(result.unarmored, 'expert');
      result.simpleWeapons = upgrade(result.simpleWeapons, 'master');
      result.martialWeapons = upgrade(result.martialWeapons ?? 'untrained', 'master');
      result.unarmed = upgrade(result.unarmed, 'master');
    }
    // Level 15: classDC → master
    if (level >= 15) {
      result.classDC = upgrade(result.classDC, 'master');
    }
    // Level 17: Perception → master
    if (level >= 17) {
      result.perception = upgrade(result.perception, 'master');
    }
    // Level 19: Armor → master
    if (level >= 19) {
      result.lightArmor = upgrade(result.lightArmor ?? 'untrained', 'master');
      result.mediumArmor = upgrade(result.mediumArmor ?? 'untrained', 'master');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  // ── SUMMONER ──
  else if (className === 'Summoner') {
    // Level 3: Perception → expert (Shared Vigilance)
    if (level >= 3) {
      result.perception = upgrade(result.perception, 'expert');
    }
    // Level 7: Expert Spellcaster
    if (level >= 7) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'expert');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'expert');
    }
    // Level 9: Reflex → expert (Shared Reflexes)
    if (level >= 9) {
      result.reflex = upgrade(result.reflex, 'expert');
    }
    // Level 11: Weapon → expert, Fort → master (success→crit)
    if (level >= 11) {
      result.simpleWeapons = upgrade(result.simpleWeapons, 'expert');
      result.unarmed = upgrade(result.unarmed, 'expert');
      result.fortitude = upgrade(result.fortitude, 'master');
    }
    // Level 13: Unarmored → expert
    if (level >= 13) {
      result.unarmored = upgrade(result.unarmored, 'expert');
    }
    // Level 15: Master Spellcaster, Will → master (success→crit)
    if (level >= 15) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'master');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'master');
      result.will = upgrade(result.will, 'master');
    }
    // Level 19: Legendary Spellcaster, Unarmored → master
    if (level >= 19) {
      result.spellAttack = upgrade(result.spellAttack ?? 'untrained', 'legendary');
      result.spellDC = upgrade(result.spellDC ?? 'untrained', 'legendary');
      result.unarmored = upgrade(result.unarmored, 'master');
    }
  }

  return result;
}

export const getClassBoostOptions = (className: string, rogueRacket: BuilderState['rogueRacket']): string[] => {
  if (className === 'Rogue') {
    const racket = ROGUE_RACKETS.find(r => r.id === rogueRacket);
    if (!racket) return ['Dexterity'];
    return racket.keyAbility.split(' or ').map(option => option.trim());
  }

  const classBoost = CLASS_BOOSTS[className];
  return Array.isArray(classBoost) ? classBoost : [classBoost];
};

export const BACKGROUNDS = Object.keys(BACKGROUND_BOOSTS).sort();

export const CLASSES = Object.keys(CLASS_BOOSTS).sort();

// Classes with full implementation (proficiencies, progressions, skills, feats, class features)
// Other classes are listed but will show a warning in the builder
export const SUPPORTED_CLASSES = ['Fighter', 'Rogue', 'Psychic', 'Magus', 'Sorcerer', 'Wizard', 'Barbarian', 'Champion', 'Monk', 'Ranger', 'Cleric', 'Kineticist', 'Druid', 'Bard', 'Guardian', 'Swashbuckler', 'Investigator', 'Thaumaturge', 'Commander', 'Gunslinger', 'Inventor', 'Witch', 'Oracle', 'Alchemist', 'Animist', 'Exemplar', 'Summoner'] as const;

export const BASE_ABILITIES = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export const ABILITY_LABELS: Record<string, string> = {
  strength: 'Strength (STR)',
  dexterity: 'Dexterity (DEX)',
  constitution: 'Constitution (CON)',
  intelligence: 'Intelligence (INT)',
  wisdom: 'Wisdom (WIS)',
  charisma: 'Charisma (CHA)',
};

// ──────────────────────────────────────────────────────────
// ROGUE RACKETS — PF2e Remaster (Player Core)
// ──────────────────────────────────────────────────────────
export interface RogueRacket {
  id: 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger';
  name: string;
  keyAbility: string;
  trainedSkill: string;
  description: string;
  benefit: string;
}

export const ROGUE_RACKETS: RogueRacket[] = [
  {
    id: 'ruffian',
    name: 'Ruffian',
    keyAbility: 'Strength',
    trainedSkill: 'Intimidation',
    description: 'You prefer to strong-arm or threaten your way through situations, physical violence often being the means to your desired end.',
    benefit: 'You can deal sneak attack damage with any simple weapon with a d8 or smaller damage die, plus medium armor proficiency. When you critically succeed at an attack that deals sneak attack damage, you can knock the target prone.',
  },
  {
    id: 'scoundrel',
    name: 'Scoundrel',
    keyAbility: 'Charisma',
    trainedSkill: 'Deception',
    description: 'You use your wits and charm to manipulate others. You might be a con artist, pickpocket, or socialite mixing with high society.',
    benefit: 'When you successfully Feint, the target is off-guard against your melee attacks until the end of your next turn. On a critical success, the target is off-guard against all melee attacks for that duration, not just yours.',
  },
  {
    id: 'thief',
    name: 'Thief',
    keyAbility: 'Dexterity',
    trainedSkill: 'Thievery',
    description: 'Nothing beats the thrill of taking something that belongs to someone else, especially when the challenge is great.',
    benefit: 'You add your Dexterity modifier to damage rolls with finesse melee weapons instead of your Strength modifier.',
  },
  {
    id: 'mastermind',
    name: 'Mastermind',
    keyAbility: 'Intelligence',
    trainedSkill: 'Society',
    description: 'Where others might use brute force, you prefer to outsmart your foes. You might be a scholar, spy, or criminal mastermind.',
    benefit: 'If you successfully identify a creature using Recall Knowledge, that creature is off-guard against your attacks until the start of your next turn.',
  },
  {
    id: 'avenger',
    name: 'Avenger',
    keyAbility: 'Strength or Dexterity',
    trainedSkill: 'Religion',
    description: 'You believe in a higher power that guides your blade. Whether a pious zealot or a reluctant instrument of divine will, you channel your deity\'s fury through precise strikes.',
    benefit: 'You can use your deity\'s favored weapon for sneak attack, even if it doesn\'t normally qualify. You also become trained in your deity\'s favored weapon. Choose a deity when you select this racket.',
  },
];

// Deity list for Avenger racket
export const DEITIES = [
  'Abadar', 'Asmodeus', 'Calistria', 'Cayden Cailean', 'Desna',
  'Erastil', 'Gorum', 'Gozreh', 'Iomedae', 'Irori',
  'Lamashtu', 'Nethys', 'Norgorber', 'Pharasma', 'Rovagug',
  'Sarenrae', 'Shelyn', 'Torag', 'Urgathoa', 'Zon-Kuthon',
];

// ──────────────────────────────────────────────────────────
// PSYCHIC CONSCIOUS MINDS — PF2e Remaster (Dark Archive)
// ──────────────────────────────────────────────────────────
export interface ConsciousMind {
  id: string;
  name: string;
  grantedCantrips: string[]; // SPELL_CATALOG IDs for the unique psi cantrips
  standardCantrips: string[]; // Standard cantrips gained from this mind
  description: string;
  benefit: string;
}

export const CONSCIOUS_MINDS: ConsciousMind[] = [
  {
    id: 'the-distant-grasp',
    name: 'The Distant Grasp',
    grantedCantrips: ['telekinetic-rend'],
    standardCantrips: ['mage-hand', 'telekinetic-projectile'],
    description: 'Motion characterizes the physical — you wield telekinesis as an arm that can grasp the furthest and finest of objects.',
    benefit: 'TKP range increases to 60ft. Amp: push 5ft on success, 10ft on crit. Amp Heightened (+1): damage increases by 2d6 instead of 1d6. Mage Hand can carry up to 1 Bulk.',
  },
  {
    id: 'the-infinite-eye',
    name: 'The Infinite Eye',
    grantedCantrips: ['glimpse-weakness'],
    standardCantrips: ['detect-magic', 'guidance'],
    description: 'The true strength of the mind lies in the knowledge it contains. You devote yourself to observing as much as possible via clairvoyance and precognition.',
    benefit: 'Detect Magic reveals creatures affected by spells and magic item bearers. Amp: +1 status bonus to saves vs detected magic (3 rounds). Guidance range increases to 120ft.',
  },
  {
    id: 'the-oscillating-wave',
    name: 'The Oscillating Wave',
    grantedCantrips: ['redistribute-potential'],
    standardCantrips: ['produce-flame', 'ray-of-frost'],
    description: 'At the heart of all things is energy. You shift energy — concentrating it to explosive end or freezing objects by plundering it away.',
    benefit: 'Conservation of Energy: alternate fire/cold each cast. Ignition range to 60ft. Amp: 1d10 fire + 1 splash (d12 melee). Frostbite range to 120ft. Amp: 3d4 cold + temp HP.',
  },
  {
    id: 'the-tangible-dream',
    name: 'The Tangible Dream',
    grantedCantrips: ['imaginary-weapon'],
    standardCantrips: ['figment', 'shield'],
    description: 'You pull colors and shapes from the depth of your mind, projecting impossible creations as tapestries of astral thread or sculptures of force and light.',
    benefit: 'Figment range to 60ft, Sustain moves it 15ft. Amp: flanking illusion. Shield can target ally within 30ft. Amp: 3-layer sustained shield.',
  },
  {
    id: 'the-silent-whisper',
    name: 'The Silent Whisper',
    grantedCantrips: ['forbidden-thought'],
    standardCantrips: ['daze', 'message'],
    description: 'Every mind murmurs constantly. Your versatile telepathic abilities let you soothe allies or control enemies.',
    benefit: 'Daze range to 120ft. Amp: 1d10 damage, on fail: weakness 1 to mental + -1 Will saves (crit fail: weakness 3). Message travels 120ft around corners. Amp: target can Step/Stride as reaction.',
  },
  {
    id: 'the-unbound-step',
    name: 'The Unbound Step',
    grantedCantrips: ['distortion-lens'],
    standardCantrips: ['phase-bolt', 'warp-step'],
    description: 'The mind can flit from thought to thought; why too shouldn\'t you? You focus on motion in higher-order spatial dimensions.',
    benefit: 'Phase Bolt: on hit, reduce target circumstance AC bonus by 1. Amp: target flat-footed, ignores Hardness = half level. Warp Step: +10ft Speed instead of +5ft. Amp: 1 action. Heightened (4th): teleport.',
  },
];

export interface SubconsciousMind {
  id: string;
  name: string;
  description: string;
  benefit: string;
}

export const SUBCONSCIOUS_MINDS: SubconsciousMind[] = [
  {
    id: 'emotional-acceptance',
    name: 'Emotional Acceptance',
    description: 'Your power flows from embracing your emotional state.',
    benefit: 'Use Charisma for your subconscious modification to spell DCs instead of the usual ability. Also gain trained in Diplomacy or Intimidation.',
  },
  {
    id: 'gathered-lore',
    name: 'Gathered Lore',
    description: 'Your mind is a library of studied esoterica.',
    benefit: 'Use Intelligence for your subconscious modification to spell DCs. Also gain trained in Arcana, Nature, or Religion.',
  },
  {
    id: 'precise-discipline',
    name: 'Precise Discipline',
    description: 'Rigid mental exercises and meditative focus fuel your power.',
    benefit: 'Use Intelligence for your subconscious modification to spell DCs. Also gain trained in one additional Intelligence-based skill.',
  },
  {
    id: 'wandering-reverie',
    name: 'Wandering Reverie',
    description: 'Your mind drifts through half-formed thoughts and instinctive insight.',
    benefit: 'Use Wisdom for your subconscious modification to spell DCs. Also gain trained in Survival or Nature.',
  },
];

// ──────────────────────────────────────────────────────────
// SORCERER BLOODLINES — PF2e Remaster (Player Core)
// ──────────────────────────────────────────────────────────
export interface SorcererBloodline {
  id: string;
  name: string;
  tradition: Tradition;
  trainedSkill: string;
  bloodMagic: string;
  description: string;
  grantedSpells: string[]; // Spell IDs auto-added to repertoire per rank
  focusSpells: { initial: string; advanced: string; greater: string; };  // Focus spell names
  resistanceType?: string; // Damage type for Bloodline Resistance feat
}

export const SORCERER_BLOODLINES: SorcererBloodline[] = [
  {
    id: 'aberrant',
    name: 'Aberrant',
    tradition: 'occult',
    trainedSkill: 'Occultism',
    bloodMagic: 'Extradimensional warp: either you gain a +1 status bonus to Intimidation checks for 1 round, or a target takes a -1 status penalty to Perception checks for 1 round.',
    description: 'Something extradimensional and alien has influenced your bloodline. Your magic is strangely warped and unsettling, as if drawing from beyond the planes.',
    grantedSpells: ['spider-sting', 'touch-of-idiocy', 'slow', 'confusion', 'black-tentacles', 'telekinetic-haul', 'warp-mind', 'uncontrollable-dance', 'unfathomable-song'],
    focusSpells: { initial: 'Tentacular Limbs', advanced: 'Aberrant Whispers', greater: 'Unusual Anatomy' },
    resistanceType: 'mental',
  },
  {
    id: 'angelic',
    name: 'Angelic',
    tradition: 'divine',
    trainedSkill: 'Religion',
    bloodMagic: 'Celestial radiance: either you gain a +1 status bonus to saves for 1 round, or a target takes 1 spirit damage per spell rank.',
    description: 'One of your ancestors was a celestial being, or your bloodline was blessed by a divine power. Your magic shines with holy radiance.',
    grantedSpells: ['heal', 'spiritual-weapon', 'searing-light', 'divine-wrath', 'flame-strike', 'blade-barrier', 'divine-decree', 'divine-aura', 'overwhelming-presence'],
    focusSpells: { initial: 'Angelic Halo', advanced: 'Angelic Wings', greater: 'Celestial Brand' },
    resistanceType: 'spirit',
  },
  {
    id: 'demonic',
    name: 'Demonic',
    tradition: 'divine',
    trainedSkill: 'Religion',
    bloodMagic: 'Abyssal fury: either you gain a +1 status bonus to Intimidation checks for 1 round, or a target takes 1 evil damage per spell rank.',
    description: 'Fiendish power runs through your veins. Your magic draws upon the corruption and destructive fury of the Abyss.',
    grantedSpells: ['fear', 'enlarge', 'slow', 'divine-wrath', 'abyssal-plague', 'disintegrate', 'divine-decree', 'divine-aura', 'implosion'],
    focusSpells: { initial: 'Glutton\'s Jaws', advanced: 'Swamp of Sloth', greater: 'Abyssal Wrath' },
    resistanceType: 'fire',
  },
  {
    id: 'draconic',
    name: 'Draconic',
    tradition: 'arcane',
    trainedSkill: 'Arcana',
    bloodMagic: 'Dragon claws: either you gain a +1 status bonus to AC for 1 round, or a target takes 1 damage per spell rank (of your dragon type).',
    description: 'The blood of dragons flows through your veins. Your magic manifests as draconic power — scales, claws, breath, and raw elemental might.',
    grantedSpells: ['shield', 'resist-energy', 'haste', 'spell-immunity', 'chromatic-wall', 'dragon-form', 'mask-of-terror', 'prismatic-wall', 'overwhelming-presence'],
    focusSpells: { initial: 'Dragon Claws', advanced: 'Dragon Breath', greater: 'Dragon Wings' },
    resistanceType: 'fire',  // Varies by dragon type — simplified to fire (most common)
  },
  {
    id: 'fey',
    name: 'Fey',
    tradition: 'primal',
    trainedSkill: 'Nature',
    bloodMagic: 'Fey glamour: either you gain a +1 status bonus to Deception checks for 1 round, or a target takes a -1 status penalty to Perception checks for 1 round.',
    description: 'The First World\'s whimsical and unpredictable magic infuses your bloodline. Your power is tied to the capricious fey.',
    grantedSpells: ['charm', 'hideous-laughter', 'enthrall', 'suggestion', 'crushing-despair', 'mislead', 'visions-of-danger', 'uncontrollable-dance', 'resplendent-mansion'],
    focusSpells: { initial: 'Faerie Dust', advanced: 'Fey Disappearance', greater: 'Fey Glamour' },
    resistanceType: 'poison',
  },
  {
    id: 'hag',
    name: 'Hag',
    tradition: 'occult',
    trainedSkill: 'Occultism',
    bloodMagic: 'Hag\'s curse: either you gain a +1 status bonus to Deception checks for 1 round, or a target takes a -1 status penalty to saves for 1 round.',
    description: 'A hag\'s corrupting influence has marked your bloodline with eldritch power. Your magic draws upon curses, deceptions, and nightmarish visions.',
    grantedSpells: ['illusory-disguise', 'touch-of-idiocy', 'blindness', 'phantasmal-killer', 'mariner-curse', 'baleful-polymorph', 'warp-mind', 'spiritual-epidemic', 'natures-enmity'],
    focusSpells: { initial: 'Jealous Hex', advanced: 'Horrific Visage', greater: 'You\'re Mine' },
    resistanceType: 'negative',
  },
  {
    id: 'imperial',
    name: 'Imperial',
    tradition: 'arcane',
    trainedSkill: 'Arcana',
    bloodMagic: 'Royal authority: either you gain a +1 status bonus to Diplomacy checks for 1 round, or a target takes a -1 status penalty to saves vs. your spells for 1 round.',
    description: 'A great magical tradition influences your blood — perhaps an archmage, a powerful artifact, or a magical institution. Your power embodies arcane mastery and authority.',
    grantedSpells: ['magic-missile', 'dispel-magic', 'haste', 'dimensional-anchor', 'prying-eye', 'feeblemind', 'contingency', 'maze', 'prismatic-sphere'],
    focusSpells: { initial: 'Ancestral Surge', advanced: 'Extend Spell', greater: 'Arcane Countermeasure' },
    resistanceType: 'force',
  },
  {
    id: 'undead',
    name: 'Undead',
    tradition: 'divine',
    trainedSkill: 'Religion',
    bloodMagic: 'Necromantic pulse: either you gain temporary Hit Points equal to the spell rank for 1 round, or a target takes 1 void damage per spell rank.',
    description: 'The forces of undeath have touched your bloodline. Whether from a vampire ancestor, a lich\'s experiments, or exposure to powerful necromancy, your magic resonates with void energy.',
    grantedSpells: ['harm', 'false-life', 'bind-undead', 'talking-corpse', 'cloudkill', 'vampiric-exsanguination', 'finger-of-death', 'horrid-wilting', 'wail-of-the-banshee'],
    focusSpells: { initial: 'Undeath\'s Blessing', advanced: 'Drain Life', greater: 'Grasping Grave' },
    resistanceType: 'void',
  },
];

// ──────────────────────────────────────────────────────────
// BARBARIAN INSTINCTS — PF2e Remaster (Player Core 2)
// ──────────────────────────────────────────────────────────
export interface BarbarianInstinct {
  id: string;
  name: string;
  description: string;
  instinctAbility: string;
  rageDamageType: string;
  anathema: string;
  specialization: string; // Raging Resistance or similar L9+ benefit
}

export const BARBARIAN_INSTINCTS: BarbarianInstinct[] = [
  {
    id: 'animal-instinct',
    name: 'Animal Instinct',
    description: 'The fury of a wild animal dwells within you, granting you ferocious unarmed attacks. You channel the rage of an animal into your body, giving you an animalistic unarmed attack.',
    instinctAbility: 'You gain a special unarmed attack based on your chosen animal (jaws, claws, horns, etc.). This unarmed attack deals 1d10 damage (or 1d8 with the agile trait) and gains a trait based on your animal.',
    rageDamageType: 'Varies by animal (piercing/slashing/bludgeoning)',
    anathema: 'Wearing armor or using shields willfully. You must fight unarmored.',
    specialization: 'Animal Skin: You gain a +1 status bonus to AC while raging and unarmored. At 7th level, your animal unarmed attacks gain the benefits of a +1 potency rune.',
  },
  {
    id: 'dragon-instinct',
    name: 'Dragon Instinct',
    description: 'A dragon\'s wrath burns within you. You channel draconic fury, choosing a type of dragon whose elemental essence fuels your rage.',
    instinctAbility: 'While raging, you can use a breath weapon (2 actions) dealing 1d6 damage per level in a 30-foot cone or 60-foot line (based on dragon type). You can use this once per rage.',
    rageDamageType: 'Based on dragon type (fire, cold, electricity, acid, or poison)',
    anathema: 'Letting a personal insult against you slide. You must demand satisfaction.',
    specialization: 'Dragon\'s Rage Breath: Your breath weapon deals 2d6 per level instead of 1d6. You resist the damage type of your dragon\'s breath weapon.',
  },
  {
    id: 'fury-instinct',
    name: 'Fury Instinct',
    description: 'Your rage comes from a deep, personal well of fury. You don\'t channel any external force — this rage is entirely your own. This makes your rage more flexible than other instincts.',
    instinctAbility: 'You don\'t have a specific instinct ability, but you have no anathema and your rage damage applies to all melee Strikes. You can freely choose from any barbarian feat without instinct restrictions.',
    rageDamageType: 'Same as weapon',
    anathema: 'None — Fury has no special anathema.',
    specialization: 'Fury\'s Power: Your rage damage bonus increases by 2 beyond what Weapon Specialization provides.',
  },
  {
    id: 'giant-instinct',
    name: 'Giant Instinct',
    description: 'Your rage channels the power of the giants, allowing you to wield oversized weapons with devastating force.',
    instinctAbility: 'You can wield weapons built for Large creatures (gaining 1 size increase to weapon damage dice) with a –2 penalty to attack rolls. While raging, this penalty is reduced to 0.',
    rageDamageType: 'Same as weapon (increased die size)',
    anathema: 'Failing to accept a personal challenge of single combat.',
    specialization: 'Giant\'s Stature: While raging, you grow to Large size, gaining reach 10. Your equipment grows with you.',
  },
  {
    id: 'spirit-instinct',
    name: 'Spirit Instinct',
    description: 'Whether you are attuned to the spirits of the departed or the essence of life itself, your rage connects you to an unseen spiritual world.',
    instinctAbility: 'While raging, your melee Strikes deal an additional 2 spirit damage (increasing to 6 with weapon specialization, 10 with greater). Your Strikes can affect incorporeal creatures as though you had ghost touch.',
    rageDamageType: 'Spirit (vitality or void, your choice each Strike)',
    anathema: 'Desecrating a corpse or burial site, or disrupting the rest of the dead without necessity.',
    specialization: 'Spirit\'s Wrath: You gain resistance to void and vitality damage equal to 3 + your Constitution modifier while raging.',
  },
  {
    id: 'superstition-instinct',
    name: 'Superstition Instinct',
    description: 'A deep distrust of magic drives your rage. You fight hardest against spellcasters and magical creatures, shrugging off their mystic effects through sheer force of will.',
    instinctAbility: 'While raging, you gain a +2 status bonus to saves against magic. You deal an additional 2 damage against creatures that can cast spells (increasing with weapon specialization).',
    rageDamageType: 'Same as weapon',
    anathema: 'Willingly accepting the effects of beneficial magic spells (including potions) unless you are unconscious.',
    specialization: 'Superstitious Resilience: While raging, you gain resistance to all damage from spells equal to 3 + your Constitution modifier.',
  },
];

// ──────────────────────────────────────────────────────────
// CHAMPION CAUSES — PF2e Remaster (Player Core 2)
// ──────────────────────────────────────────────────────────
export interface ChampionCause {
  id: string;
  name: string;
  description: string;
  reaction: string;
  reactionName: string;
  tenet: string;
  devotionSpell: string;
}

export const CHAMPION_CAUSES: ChampionCause[] = [
  {
    id: 'paladin',
    name: 'Paladin',
    description: 'You\'re a righteous warrior who strikes back at those who dare to harm your allies. You are the iron fist of justice and retribution.',
    reaction: 'When an enemy damages your ally and both are within 15 feet of you, you can use your reaction to Strike the enemy. If the Strike hits, the ally gains resistance to all damage from the triggering attack equal to 2 + your level.',
    reactionName: 'Retributive Strike',
    tenet: 'You must act with honor, never taking advantage of others, never lying, and never cheating. You must respect legitimate authority.',
    devotionSpell: 'Lay on Hands',
  },
  {
    id: 'liberator',
    name: 'Liberator',
    description: 'You\'re a champion of freedom, protecting allies from restraint and control. You break chains and topple tyrants.',
    reaction: 'When an enemy damages your ally and both are within 15 feet of you, you can use your reaction to grant the ally resistance to all damage from the triggering attack equal to 2 + your level. The ally can also Step as a free action.',
    reactionName: 'Liberating Step',
    tenet: 'You must respect the choices of others, never forcing others to act in a particular way or be controlled. You must demand the freedom of others.',
    devotionSpell: 'Lay on Hands',
  },
  {
    id: 'redeemer',
    name: 'Redeemer',
    description: 'You\'re a champion of mercy, offering enemies a chance to repent. Violence is your last resort.',
    reaction: 'When an enemy damages your ally and both are within 15 feet of you, you can use your reaction to offer the attacker a Glimpse of Redemption. The attacker takes enfeebled 2 until the end of its next turn, OR it can choose to deal no damage to your ally from the triggering attack (negating all damage). If it chooses to deal no damage, it is not enfeebled.',
    reactionName: 'Glimpse of Redemption',
    tenet: 'You must show mercy to enemies who genuinely repent, never exterminating foes who have surrendered, and always offering the chance of redemption before violence.',
    devotionSpell: 'Lay on Hands',
  },
];

// ──────────────────────────────────────────────────────────
// RANGER HUNTER'S EDGES — PF2e Remaster (Player Core)
// ──────────────────────────────────────────────────────────
export interface RangerHuntersEdge {
  id: string;
  name: string;
  description: string;
  benefit: string;
  masterfulUpgrade: string;
}

export const RANGER_HUNTERS_EDGES: RangerHuntersEdge[] = [
  {
    id: 'flurry',
    name: 'Flurry',
    description: 'You have trained to unleash a devastating flurry of attacks upon your prey. Your multiple attack penalty against your hunted prey is reduced.',
    benefit: 'Your multiple attack penalty for attacks against your hunted prey is –3 (–2 with an agile weapon) on your second attack of the turn instead of –5 (–4 with agile), and –6 (–4 with agile) on subsequent attacks instead of –10 (–8 with agile).',
    masterfulUpgrade: 'Your multiple attack penalty against your hunted prey is –2 (–1 with agile) on your second attack, and –4 (–2 with agile) on subsequent attacks.',
  },
  {
    id: 'precision',
    name: 'Precision',
    description: 'You have trained to strike your prey\'s weak spots with pinpoint accuracy. You deal extra precision damage to your hunted prey.',
    benefit: 'The first time you hit your hunted prey in a round, you deal an additional 1d8 precision damage. This increases to 2d8 at 11th level and 3d8 at 19th level.',
    masterfulUpgrade: 'The second hit you score against your prey each round also deals 1d8 precision damage.',
  },
  {
    id: 'outwit',
    name: 'Outwit',
    description: 'You are a cunning tactician who uses guile and intellect to overcome your prey. You gain bonuses to outmaneuver your hunted prey.',
    benefit: 'You gain a +2 circumstance bonus to Deception, Intimidation, Stealth, and Recall Knowledge checks against your hunted prey.',
    masterfulUpgrade: 'The circumstance bonus increases to +4.',
  },
];

// ──────────────────────────────────────────────────────────
// CLERIC DOCTRINES — PF2e Remaster (Player Core)
// ──────────────────────────────────────────────────────────
export interface ClericDoctrine {
  id: string;
  name: string;
  description: string;
  benefit: string;
  spellProgression: string;
}

export const CLERIC_DOCTRINES: ClericDoctrine[] = [
  {
    id: 'cloistered',
    name: 'Cloistered Cleric',
    description: 'You are a cleric of the cloth, focusing on divine magic and your connection to your deity\'s domains. Your spellcasting proficiency advances faster than other doctrines.',
    benefit: 'You gain the Domain Initiate class feat. L3: Fort → expert. L7: Spell attack/DC → expert. L11: Simple/unarmed → expert (deity weapon crit spec). L15: Spell attack/DC → master. L19: Spell attack/DC → legendary.',
    spellProgression: 'Expert L7 → Master L15 → Legendary L19',
  },
  {
    id: 'warpriest',
    name: 'Warpriest',
    description: 'You have trained in the more militant doctrine of your church, focusing on both spells and battle. You blend martial prowess with divine power.',
    benefit: 'L1: Trained light/medium armor, expert Fort, Shield Block feat. Deadly Simplicity if deity weapon is simple/unarmed. L3: Trained martial weapons. L7: Simple/martial/unarmed → expert. L11: Spell attack/DC → expert. L13: Medium armor → expert. L15: Fort → master. L19: Spell attack/DC → master.',
    spellProgression: 'Expert L11 → Master L19',
  },
  {
    id: 'battle-creed',
    name: 'Battle Creed',
    description: 'You\'ve undergone special training to focus your body toward combat (Divine Mysteries). You serve as an instrument of your church, putting combat prowess first even at the expense of typical spellcasting. You must select Battle Harbinger Dedication as your 2nd-level class feat.',
    benefit: 'L1: Trained light/medium armor & martial weapons, expert Fort. L5: All weapons → expert, class DC → expert. L11: Spell attack/DC → expert. L13: Fort → master, deity weapon → master. L15: Class DC → master. L19: Armor → master, class DC → legendary. Reduced spell slots (Battle Harbinger table). Battle font (bane/bless) replaces divine font. You do NOT gain Resolute Faith or Miraculous Spell.',
    spellProgression: 'Expert L11 (reduced slots, battle font)',
  },
];

// ──────────────────────────────────────────────────────────
export interface WizardArcaneSchool {
  id: string;
  name: string;
  description: string;
  benefit: string;
  curriculumSpells: string[]; // Spell names added to spellbook
  focusSpells: { initial: string; advanced: string; };
}

export const WIZARD_ARCANE_SCHOOLS: WizardArcaneSchool[] = [
  {
    id: 'school-of-ars-grammatica',
    name: 'School of Ars Grammatica',
    description: 'You study the true names of things and the language of magic itself, gaining power over spells and their fundamental structures.',
    benefit: 'You can use Drain Bonded Item one additional time per day. When you counterspell, you gain a +1 circumstance bonus to your counteract check.',
    curriculumSpells: ['magic-missile', 'dispel-magic', 'haste', 'spell-immunity', 'chromatic-wall', 'contingency'],
    focusSpells: { initial: 'Protective Wards', advanced: 'Interdiction' },
  },
  {
    id: 'school-of-battle-magic',
    name: 'School of Battle Magic',
    description: 'You channel arcane power into devastating attacks, learning to harness raw destructive energy as a weapon.',
    benefit: 'Your damaging cantrips deal 1 additional damage per spell rank. When you cast a damaging spell using your school spell slots, the damage increases by your INT modifier.',
    curriculumSpells: ['burning-hands', 'fireball', 'lightning-bolt', 'wall-of-fire', 'cone-of-cold', 'chain-lightning'],
    focusSpells: { initial: 'Force Bolt', advanced: 'Energy Absorption' },
  },
  {
    id: 'school-of-civic-wizardry',
    name: 'School of Civic Wizardry',
    description: 'You study magic as it applies to society, learning to influence minds and enhance cooperation in communities.',
    benefit: 'You gain Diplomacy or Society as a trained skill. Your enchantment and illusion spells gain a +1 status bonus to their DCs.',
    curriculumSpells: ['charm', 'calm-emotions', 'enthrall', 'suggestion', 'dominate', 'mislead'],
    focusSpells: { initial: 'Charming Push', advanced: 'Captivating Admonition' },
  },
  {
    id: 'school-of-mentalism',
    name: 'School of Mentalism',
    description: 'You study the mysteries of the mind, peering into consciousness and wielding psychic-adjacent arcane magic.',
    benefit: 'You gain a +1 circumstance bonus to saves vs. mental effects. Your divination spells have their range increased by 30 feet.',
    curriculumSpells: ['mindlink', 'see-invisibility', 'mind-reading', 'clairvoyance', 'telepathy', 'true-seeing'],
    focusSpells: { initial: 'Charming Words', advanced: 'Dread Aura' },
  },
  {
    id: 'school-of-protean-form',
    name: 'School of Protean Form',
    description: 'You study the magic of transformation and change, learning to reshape yourself and others into new forms.',
    benefit: 'When you cast a polymorph spell on yourself, you gain temporary Hit Points equal to the spell\'s rank. Duration of your transmutation spells increases by 1 round.',
    curriculumSpells: ['jump', 'enlarge', 'haste', 'fly', 'baleful-polymorph', 'dragon-form'],
    focusSpells: { initial: 'Physical Boost', advanced: 'Shifting Form' },
  },
  {
    id: 'school-of-the-boundary',
    name: 'School of the Boundary',
    description: 'You study the borders between planes, life and death, and the limits of magic. Your wards and banishments are unmatched.',
    benefit: 'Your abjuration spells gain a +1 status bonus to counteract checks. When you successfully counteract an effect, the caster is off-guard until the end of your next turn.',
    curriculumSpells: ['protection', 'resist-energy', 'circle-of-protection', 'dimensional-anchor', 'banishment', 'spell-turning'],
    focusSpells: { initial: 'Protective Ward', advanced: 'Energy Aegis' },
  },
  {
    id: 'school-of-unified-magical-theory',
    name: 'School of Unified Magical Theory',
    description: 'Rather than specializing, you seek to understand all magic as a unified whole. You sacrifice depth for breadth and flexibility.',
    benefit: 'You gain one additional spell slot per spell rank, which can be used for any spell in your spellbook (flexible slot). You can swap one prepared spell during a 10-minute rest.',
    curriculumSpells: [],
    focusSpells: { initial: 'Hand of the Apprentice', advanced: 'Universalist\'s Focus' },
  },
];

// ──────────────────────────────────────────────────────────
// MAGUS HYBRID STUDIES — PF2e (Secrets of Magic)
// ──────────────────────────────────────────────────────────
export interface HybridStudy {
  id: string;
  name: string;
  description: string;
  benefit: string;
  confluxSpell: string; // Focus spell granted by this study
}

export const HYBRID_STUDIES: HybridStudy[] = [
  {
    id: 'inexorable-iron',
    name: 'Inexorable Iron',
    description: 'You create a powerful meld of magic and force to become an unstoppable juggernaut in melee combat.',
    benefit: 'When entering Arcane Cascade stance with a two-handed melee weapon, gain temp HP equal to half your level. Conflux Spell: Thunderous Strike.',
    confluxSpell: 'thunderous-strike',
  },
  {
    id: 'laughing-shadow',
    name: 'Laughing Shadow',
    description: 'You blend magic with trickery and escapism to avoid consequences and mislead foes.',
    benefit: 'While in Arcane Cascade stance, gain +5ft status bonus to Speeds (+10ft if unarmored). Conflux Spell: Dimensional Assault.',
    confluxSpell: 'dimensional-assault',
  },
  {
    id: 'sparkling-targe',
    name: 'Sparkling Targe',
    description: 'You studied defensive applications of magic, using your shield to block both physical and magical assaults.',
    benefit: 'Gain Shield Block feat. In Arcane Cascade stance with shield raised, circumstance AC bonus applies to saves vs spells. Shield Hardness increases by Cascade damage. Conflux Spell: Shielding Strike.',
    confluxSpell: 'shielding-strike',
  },
  {
    id: 'starlit-span',
    name: 'Starlit Span',
    description: 'Your magic reaches beyond physical proximity, and you can channel spells through weapons at a distance.',
    benefit: 'With Spellstrike, make ranged weapon Strike within first range increment. Deliver spell at that distance. Conflux Spell: Shooting Star.',
    confluxSpell: 'shooting-star',
  },
  {
    id: 'twisting-tree',
    name: 'Twisting Tree',
    description: 'The staff is your foundation—it reshapes with magic to any form you need.',
    benefit: 'One-handed staff is agile (1d6). Two-handed staff gains parry, reach, trip. In Arcane Cascade, swap grip as free action. Conflux Spell: Spinning Staff.',
    confluxSpell: 'spinning-staff',
  },
];

// ──────────────────────────────────────────────────────────
// CLASS SPELLCASTING CONFIGURATION
// Defines spell tradition, casting type, slots, and spells known per class level.
// ──────────────────────────────────────────────────────────

export type Tradition = 'arcane' | 'divine' | 'occult' | 'primal';
export type CastingType = 'prepared' | 'spontaneous';

export interface ClassSpellcastingConfig {
  tradition: Tradition;
  castingType: CastingType;
  /** Number of cantrips known at each class level (auto-heightened) */
  cantripsKnown: (level: number) => number;
  /** Spell slots available at each class level: returns array of {rank, count} */
  getSlots: (level: number) => { rank: number; count: number }[];
  /**
   * For PREPARED casters: how many spells are in the spellbook at each rank at this level.
   * For SPONTANEOUS casters: how many spells are in the repertoire at each rank at this level.
   */
  getSpellsKnown: (level: number) => { rank: number; count: number }[];
}

/**
 * Magus Spell Slots (Bounded Caster) — Secrets of Magic
 * Magus is a prepared arcane caster with limited slots.
 */
function getMagusSlotsForLevel(level: number): { rank: number; count: number }[] {
  const slots: { rank: number; count: number }[] = [];
  // Magus gains new spell rank every 2 levels, 1 slot first level, 2 second
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1; // Rank 1 at level 1, rank 2 at level 3, etc.
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 2 });
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 1 });
    }
  }
  return slots;
}

/**
 * Magus spells known in spellbook — starts with cantrips + rank 1 spells,
 * learns 1 new spell per level of any castable rank.
 */
function getMagusSpellsKnown(level: number): { rank: number; count: number }[] {
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));
  // Start: 2 rank-1 spells. Each level adds 1 spell of any castable rank.
  // We distribute evenly for default
  let totalNewSpells = Math.max(0, level - 1);
  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      // Base 2 spells when rank unlocks, plus extras from leveling
      const base = 2;
      known.push({ rank, count: base });
    }
  }
  // Distribute extra spells (1 per level after 1) — player chooses in builder
  if (totalNewSpells > 0 && known.length > 0) {
    known[known.length - 1].count += totalNewSpells;
  }
  return known;
}

/**
 * Psychic Spell Slots (Full Caster, Spontaneous) — Dark Archive
 */
function getPsychicSlotsForLevel(level: number): { rank: number; count: number }[] {
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 });
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 });
    }
  }
  return slots;
}

/**
 * Psychic spells known (repertoire) — spontaneous caster
 */
function getPsychicSpellsKnown(level: number): { rank: number; count: number }[] {
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));
  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      // Spontaneous: repertoire typically 2 per rank when gained, grows to ~4-5 at higher ranks
      const extraAtRank = Math.min(2, Math.floor((level - unlockLevel) / 2));
      known.push({ rank, count: 2 + extraAtRank });
    }
  }
  return known;
}

/**
 * Sorcerer Spell Slots (Full Caster, Spontaneous) — Player Core
 * Sorcerer gets the standard full caster progression.
 */
function getSorcererSlotsForLevel(level: number): { rank: number; count: number }[] {
  // Sorcerer — Spontaneous full caster (Player Core 2, AoN)
  // Spontaneous casters get MORE slots than prepared: 3 at unlock, 4 at unlock+1
  // This compensates for having a fixed repertoire instead of daily preparation
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 4 }); // Full: 4 slots per rank
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 3 }); // Unlock level: 3 slots
    }
  }
  return slots;
}

/**
 * Sorcerer spells known (repertoire) — spontaneous caster
 * Sorcerers know more spells per rank than Psychics due to being a primary caster.
 */
function getSorcererSpellsKnown(level: number): { rank: number; count: number }[] {
  // Sorcerer repertoire — spells known equals spell slots per AoN
  // "Each time you get a spell slot, you add a spell to your spell repertoire
  // of the same rank." — Player Core 2
  // Includes bloodline granted spells (1 per rank)
  const known: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      known.push({ rank, count: 4 });
    } else if (level >= unlockLevel) {
      known.push({ rank, count: 3 });
    }
  }
  return known;
}

/**
 * Wizard Spell Slots (Full Caster, Prepared) — Player Core
 * Wizard gets standard full caster slot progression.
 */
function getWizardSlotsForLevel(level: number): { rank: number; count: number }[] {
  // Wizard — Prepared full caster (Player Core, AoN)
  // Prepared casters get fewer slots (2 at unlock, 3 at unlock+1, max 3)
  // but can swap from entire spellbook each day
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 }); // Full: 3 slots per rank (prepared max)
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 }); // Unlock level: 2 slots
    }
  }
  return slots;
}

/**
 * Wizard spells known (spellbook) — prepared caster
 * Wizards start with a spellbook containing cantrips + rank 1 spells,
 * and learn 2 new spells per level of any rank they can cast.
 */
function getWizardSpellsKnown(level: number): { rank: number; count: number }[] {
  // Wizard Spellbook — Player Core (AoN)
  // L1: 10 cantrips + 5 rank-1 (choice) + 2 school curriculum = 7 rank-1 in book
  // Each level: +2 spells of any castable rank to spellbook
  // New rank unlock: +1 school curriculum spell of that rank
  // For builder purposes, we track per-rank: base when unlocked + growth over time
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));

  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      // Rank 1 starts larger (5 base + 2 school); others start with 1 school + 2 choice = 3
      const base = rank === 1 ? 7 : 3;
      // +2 spells per level spent at this rank (shared across ranks, but simplify)
      const levelsWithRank = level - unlockLevel;
      // Approximate: each rank gets ~1 new spell per level it's been available
      known.push({ rank, count: base + levelsWithRank });
    }
  }
  return known;
}

/**
 * Cleric Spell Slots (Full Caster, Prepared) — Player Core
 * Cleric gets the standard full-caster prepared slot progression (same as Wizard).
 */
function getClericSlotsForLevel(level: number): { rank: number; count: number }[] {
  // Cleric — Prepared full caster (Player Core, AoN)
  // Same progression as Wizard: 2 at unlock, 3 at unlock+1, max 3
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 }); // Full: 3 slots per rank (prepared max)
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 }); // Unlock level: 2 slots
    }
  }
  return slots;
}

/**
 * Cleric spells known (prepared from divine list) — Player Core
 * Clerics prepare from the full divine tradition; spells "known" represents
 * what they can prepare. Like Wizards, they start broad and learn more each level.
 */
function getClericSpellsKnown(level: number): { rank: number; count: number }[] {
  // Cleric — Prepared divine caster (Player Core, AoN)
  // Clerics prepare from the full divine tradition list each day.
  // "Spells known" for a prepared caster = accessible spells from tradition.
  // In practice, they have access to the entire divine list, but for builder
  // purposes we track a reasonable per-rank count similar to Wizard spellbook.
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));

  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      // Clerics access the whole divine list; use generous base + growth
      const base = rank === 1 ? 6 : 3;
      const levelsWithRank = level - unlockLevel;
      known.push({ rank, count: base + levelsWithRank });
    }
  }
  return known;
}

/**
 * Druid Spell Slots (Full Caster, Prepared) — Player Core
 * Druid gets the standard full-caster prepared slot progression (same as Wizard/Cleric).
 * Reference: https://2e.aonprd.com/Classes.aspx?ID=34
 */
function getDruidSlotsForLevel(level: number): { rank: number; count: number }[] {
  // Druid — Prepared full caster (Player Core, AoN)
  // Same progression as Cleric: 2 at unlock, 3 at unlock+1, max 3
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 }); // Full: 3 slots per rank (prepared max)
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 }); // Unlock level: 2 slots
    }
  }
  return slots;
}

/**
 * Druid spells known (prepared from primal list) — Player Core
 * Druids prepare from the full primal tradition each day.
 * Same pattern as Cleric — generous access to tradition list.
 */
function getDruidSpellsKnown(level: number): { rank: number; count: number }[] {
  // Druid — Prepared primal caster (Player Core, AoN)
  // Druids prepare from the full primal tradition list each day.
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));

  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      // Druids access the whole primal list; use generous base + growth
      const base = rank === 1 ? 6 : 3;
      const levelsWithRank = level - unlockLevel;
      known.push({ rank, count: base + levelsWithRank });
    }
  }
  return known;
}

/**
 * Bard Spell Slots (Full Caster, Spontaneous) — Player Core
 * Bard uses the standard slot progression: 2 at unlock, 3 at unlock+1.
 * Despite being spontaneous, Bard gets the same slot count as prepared casters.
 */
function getBardSlotsForLevel(level: number): { rank: number; count: number }[] {
  // Bard — Spontaneous full caster (Player Core pg. 94, AoN)
  // Slot progression: 2 at unlock level, 3 at unlock+1, max 3 per rank
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 }); // Full: 3 slots per rank
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 }); // Unlock level: 2 slots
    }
  }
  return slots;
}

/**
 * Bard spells known (repertoire) — spontaneous caster
 * Bard repertoire matches spell slots — each slot grants one known spell.
 * "Each time you get a spell slot, you add a spell to your spell repertoire."
 */
function getBardSpellsKnown(level: number): { rank: number; count: number }[] {
  // Bard repertoire — spells known matches spell slot count (Player Core pg. 96)
  const known: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      known.push({ rank, count: 3 });
    } else if (level >= unlockLevel) {
      known.push({ rank, count: 2 });
    }
  }
  return known;
}

/**
 * Oracle Spell Slots (Full Caster, Spontaneous) — Player Core 2
 * Divine tradition, spontaneous. Same slot progression as Sorcerer.
 */
function getOracleSlotsForLevel(level: number): { rank: number; count: number }[] {
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 4 });
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 3 });
    }
  }
  return slots;
}

function getOracleSpellsKnown(level: number): { rank: number; count: number }[] {
  const known: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      known.push({ rank, count: 4 });
    } else if (level >= unlockLevel) {
      known.push({ rank, count: 3 });
    }
  }
  return known;
}

/**
 * Witch Spell Slots (Full Caster, Prepared) — Player Core 2
 * Tradition depends on Patron choice. Prepared, same progression as Wizard.
 */
function getWitchSlotsForLevel(level: number): { rank: number; count: number }[] {
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 });
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 });
    }
  }
  return slots;
}

function getWitchSpellsKnown(level: number): { rank: number; count: number }[] {
  // Witch familiar stores spells like a spellbook — prepared from familiar
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));
  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      const base = 2;
      known.push({ rank, count: base });
    }
  }
  // Extra spells from leveling
  let totalNew = Math.max(0, level - 1);
  if (totalNew > 0 && known.length > 0) {
    known[known.length - 1].count += totalNew;
  }
  return known;
}

/**
 * Animist Spell Slots (Full Caster, Prepared) — War of Immortals
 * Divine tradition prepared caster with apparition-granted spells.
 */
function getAnimistSlotsForLevel(level: number): { rank: number; count: number }[] {
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 3 });
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 2 });
    }
  }
  return slots;
}

function getAnimistSpellsKnown(level: number): { rank: number; count: number }[] {
  // Animist gets spells from apparitions — prepared from their granted list
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));
  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      known.push({ rank, count: 2 });
    }
  }
  let totalNew = Math.max(0, level - 1);
  if (totalNew > 0 && known.length > 0) {
    known[known.length - 1].count += totalNew;
  }
  return known;
}

/**
 * Summoner Spell Slots (Bounded Caster, Spontaneous) — Secrets of Magic
 * Same bounded progression as Magus — fewer slots than full casters.
 */
function getSummonerSlotsForLevel(level: number): { rank: number; count: number }[] {
  const slots: { rank: number; count: number }[] = [];
  for (let rank = 1; rank <= 9; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel + 1) {
      slots.push({ rank, count: 2 });
    } else if (level >= unlockLevel) {
      slots.push({ rank, count: 1 });
    }
  }
  return slots;
}

function getSummonerSpellsKnown(level: number): { rank: number; count: number }[] {
  // Summoner repertoire — spontaneous bounded caster, ~2-3 spells known per rank
  const known: { rank: number; count: number }[] = [];
  const maxRank = Math.min(9, Math.ceil(level / 2));
  for (let rank = 1; rank <= maxRank; rank++) {
    const unlockLevel = (rank - 1) * 2 + 1;
    if (level >= unlockLevel) {
      const extra = Math.min(1, Math.floor((level - unlockLevel) / 4));
      known.push({ rank, count: 2 + extra });
    }
  }
  return known;
}

export const CLASS_SPELLCASTING: Record<string, ClassSpellcastingConfig> = {
  Magus: {
    tradition: 'arcane',
    castingType: 'prepared',
    cantripsKnown: (_level: number) => 5,
    getSlots: getMagusSlotsForLevel,
    getSpellsKnown: getMagusSpellsKnown,
  },
  Psychic: {
    tradition: 'occult',
    castingType: 'spontaneous',
    cantripsKnown: (level: number) => level >= 1 ? 4 : 0, // Plus psi cantrips from conscious mind
    getSlots: getPsychicSlotsForLevel,
    getSpellsKnown: getPsychicSpellsKnown,
  },
  Sorcerer: {
    tradition: 'arcane', // Default — overridden by bloodline choice at character creation
    castingType: 'spontaneous',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getSorcererSlotsForLevel,
    getSpellsKnown: getSorcererSpellsKnown,
  },
  Wizard: {
    tradition: 'arcane',
    castingType: 'prepared',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getWizardSlotsForLevel,
    getSpellsKnown: getWizardSpellsKnown,
  },
  Cleric: {
    tradition: 'divine',
    castingType: 'prepared',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getClericSlotsForLevel,
    getSpellsKnown: getClericSpellsKnown,
  },
  Druid: {
    tradition: 'primal',
    castingType: 'prepared',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getDruidSlotsForLevel,
    getSpellsKnown: getDruidSpellsKnown,
  },
  Bard: {
    tradition: 'occult',
    castingType: 'spontaneous',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getBardSlotsForLevel,
    getSpellsKnown: getBardSpellsKnown,
  },
  Oracle: {
    tradition: 'divine',
    castingType: 'spontaneous',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getOracleSlotsForLevel,
    getSpellsKnown: getOracleSpellsKnown,
  },
  Witch: {
    tradition: 'arcane', // Default — overridden by patron choice
    castingType: 'prepared',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getWitchSlotsForLevel,
    getSpellsKnown: getWitchSpellsKnown,
  },
  Animist: {
    tradition: 'divine',
    castingType: 'prepared',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getAnimistSlotsForLevel,
    getSpellsKnown: getAnimistSpellsKnown,
  },
  Summoner: {
    tradition: 'arcane', // Default — overridden by eidolon type
    castingType: 'spontaneous',
    cantripsKnown: (level: number) => level >= 1 ? 5 : 0,
    getSlots: getSummonerSlotsForLevel,
    getSpellsKnown: getSummonerSpellsKnown,
  },
};

/** Check if a class has spellcasting */
export function isSpellcastingClass(className: string): boolean {
  return className in CLASS_SPELLCASTING;
}

// ─── PF2e Wealth by Level (Player Core, Table 6-2) ────────
// Total GP a character of a given level should own in equipment
// Indexed by level (0 = level 1, etc.)
export const WEALTH_BY_LEVEL: Record<number, number> = {
  1: 15,
  2: 30,
  3: 75,
  4: 140,
  5: 270,
  6: 450,
  7: 720,
  8: 1_100,
  9: 1_600,
  10: 2_500,
  11: 4_000,
  12: 6_500,
  13: 10_000,
  14: 15_000,
  15: 23_500,
  16: 35_000,
  17: 50_000,
  18: 75_000,
  19: 120_000,
  20: 200_000,
};

/**
 * Get the default starting gold for a given character level.
 * Returns the standard PF2e wealth-by-level value.
 */
export function getDefaultGold(level: number): number {
  return WEALTH_BY_LEVEL[Math.min(20, Math.max(1, level))] ?? 15;
}