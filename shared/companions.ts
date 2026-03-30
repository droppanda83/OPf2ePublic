// ═══════════════════════════════════════════════════════════════════════════════
// companions.ts — PF2e Animal Companion Species Catalog (Remaster)
// All animal companion templates with young-maturity base stats.
// Maturity progression (Mature, Nimble, Savage, Specialized, Incredible)
// is applied dynamically by the companion manager.
// ═══════════════════════════════════════════════════════════════════════════════

import { AnimalCompanionTemplate, DamageType } from './types';

// ── Helper to build attack entries concisely ──
function atk(name: string, damage: string, damageType: DamageType, traits?: string[]) {
  return { name, damage, damageType, traits };
}

/**
 * PF2e Animal Companion catalog — young base stats.
 * Stat progression is applied by maturityScaling in companionManager.ts
 *
 * Young base stats (PF2e CRB/Remaster rules):
 * - Perception: trained (WIS-based)
 * - AC: unarmored, scales with level
 * - Saves: Fort/Reflex trained, Will expert (or varies)
 * - HP: baseHp + (CON mod + 6) per level
 * - Skills: listed skills at trained
 * - Attacks: listed attacks with prof progression
 */
export const ANIMAL_COMPANION_CATALOG: AnimalCompanionTemplate[] = [
  // ─── Badger ───
  {
    id: 'badger',
    name: 'Badger',
    size: 'small',
    matureSize: 'medium',
    speed: 25,
    specialSpeeds: [{ type: 'burrow', speed: 10 }],
    abilityMods: [2, 2, 2, -4, 1, 0],
    baseHp: 8,
    attacks: [
      atk('Jaws', '1d8', 'piercing'),
      atk('Claw', '1d6', 'slashing', ['agile']),
    ],
    skills: ['survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'Your badger digs around your foe\'s position. Until the start of your next turn, if you hit a creature your badger threatens, the target can\'t Burrow or use other movement to go underground.',
    advancedManeuver: { name: 'Badger Rage', actions: 1, description: 'The badger enters a rage. It gains 4 temporary HP, a +1 status bonus to attack rolls, and a -1 penalty to AC. It can\'t use other advanced maneuvers while raging. The rage lasts 1 minute.' },
  },

  // ─── Bear ───
  {
    id: 'bear',
    name: 'Bear',
    size: 'small',
    matureSize: 'medium',
    speed: 35,
    abilityMods: [3, 1, 2, -4, 1, 0],
    baseHp: 8,
    attacks: [
      atk('Jaws', '1d8', 'piercing'),
      atk('Claw', '1d6', 'slashing', ['agile']),
    ],
    skills: ['intimidation', 'survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'Your bear mauls your enemies when you create an opening. Until the start of your next turn, each time you hit a creature in the bear\'s reach, the creature takes 1d8 slashing damage from the bear (this damage increases to 2d8 if the bear is nimble or savage).',
    advancedManeuver: { name: 'Bear Hug', actions: 1, description: 'Requirements: The bear\'s last action was a successful claw Strike. The bear makes another claw Strike against the same target. If it hits, the target is also grabbed by the bear.' },
  },

  // ─── Bird ───
  {
    id: 'bird',
    name: 'Bird',
    size: 'small',
    matureSize: 'medium',
    speed: 10,
    specialSpeeds: [{ type: 'fly', speed: 60 }],
    abilityMods: [1, 3, 1, -4, 2, 0],
    baseHp: 6,
    attacks: [
      atk('Jaws', '1d6', 'piercing', ['finesse']),
      atk('Talon', '1d4', 'slashing', ['agile', 'finesse']),
    ],
    skills: ['stealth'],
    senses: ['low-light vision'],
    supportBenefit: 'The bird pecks at your foe\'s eyes. Until the start of your next turn, your Strikes that deal damage to a creature your bird threatens also deal 1d4 persistent bleed damage (2d4 if nimble/savage). The bird can fly and it gains the support benefit even if it\'s flying.',
    advancedManeuver: { name: 'Flyby Attack', actions: 2, description: 'The bird Flies and makes a talon Strike at any point during the movement.' },
  },

  // ─── Cat ───
  {
    id: 'cat',
    name: 'Cat',
    size: 'small',
    matureSize: 'medium',
    speed: 35,
    abilityMods: [1, 3, 1, -4, 2, 0],
    baseHp: 6,
    attacks: [
      atk('Jaws', '1d6', 'piercing', ['finesse']),
      atk('Claw', '1d4', 'slashing', ['agile', 'finesse']),
    ],
    skills: ['stealth', 'survival'],
    senses: ['low-light vision'],
    supportBenefit: 'The cat throws your enemies off-balance. Until the start of your next turn, your Strikes that deal damage to a creature in the cat\'s reach make the target off-guard until the end of your next turn.',
    advancedManeuver: { name: 'Cat Pounce', actions: 1, description: 'The cat Strides and then Strikes. If it was undetected at the start of its Cat Pounce, it remains undetected until after the attack.' },
  },

  // ─── Dromaeosaur ───
  {
    id: 'dromaeosaur',
    name: 'Dromaeosaur',
    size: 'small',
    matureSize: 'medium',
    speed: 50,
    abilityMods: [2, 3, 2, -4, 1, -1],
    baseHp: 6,
    attacks: [
      atk('Jaws', '1d8', 'piercing', ['finesse']),
      atk('Talon', '1d6', 'slashing', ['agile', 'finesse']),
    ],
    skills: ['stealth'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'The dromaeosaur terrifies your enemies. Until the start of your next turn, if you hit and deal damage to a creature threatened by the dromaeosaur, the target becomes frightened 1.',
    advancedManeuver: { name: 'Darting Attack', actions: 1, description: 'The dromaeosaur Steps, Strikes, and then Steps again.' },
  },

  // ─── Horse ───
  {
    id: 'horse',
    name: 'Horse',
    size: 'large',
    speed: 40,
    abilityMods: [3, 1, 2, -4, 1, 0],
    baseHp: 8,
    attacks: [
      atk('Hoof', '1d6', 'bludgeoning'),
    ],
    skills: ['survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'The horse adds momentum to your charge. Until the start of your next turn, if you moved at least 10 feet on the action before a Strike, add a circumstance bonus to damage equal to twice the number of damage dice.',
    advancedManeuver: { name: 'Gallop', actions: 2, description: 'The horse Strides twice, with its speed increased by 10 feet.' },
  },

  // ─── Snake ───
  {
    id: 'snake',
    name: 'Snake',
    size: 'small',
    matureSize: 'medium',
    speed: 20,
    specialSpeeds: [{ type: 'climb', speed: 20 }, { type: 'swim', speed: 20 }],
    abilityMods: [3, 1, 1, -4, 1, 0],
    baseHp: 6,
    attacks: [
      atk('Fangs', '1d8', 'piercing'),
    ],
    skills: ['stealth', 'survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'The snake\'s venom weakens your target. Until the start of your next turn, your Strikes that deal damage to a creature in the snake\'s reach also deal 1d4 poison damage (2d4 if nimble/savage).',
    advancedManeuver: { name: 'Constrict', actions: 1, description: 'Requirements: The snake has a creature grabbed or restrained. The snake deals 1d8 bludgeoning damage to the grabbed or restrained creature; that creature can attempt a basic Fortitude save.' },
  },

  // ─── Wolf ───
  {
    id: 'wolf',
    name: 'Wolf',
    size: 'small',
    matureSize: 'medium',
    speed: 40,
    abilityMods: [2, 2, 2, -4, 1, 0],
    baseHp: 6,
    attacks: [
      atk('Jaws', '1d8', 'piercing'),
    ],
    skills: ['stealth', 'survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'The wolf tears at your foe\'s hamstrings. Until the start of your next turn, your Strikes that deal damage to a creature within the wolf\'s reach also knock the target prone.',
    advancedManeuver: { name: 'Knockdown', actions: 1, description: 'Requirements: The wolf\'s last action was a successful jaws Strike. The wolf automatically knocks the target prone.' },
  },

  // ─── Ape ───
  {
    id: 'ape',
    name: 'Ape',
    size: 'small',
    matureSize: 'medium',
    speed: 25,
    specialSpeeds: [{ type: 'climb', speed: 25 }],
    abilityMods: [3, 2, 1, -4, 1, 0],
    baseHp: 8,
    attacks: [
      atk('Fist', '1d8', 'bludgeoning'),
    ],
    skills: ['athletics', 'intimidation'],
    senses: ['low-light vision'],
    supportBenefit: 'The ape grapples your target. Until the start of your next turn, if you hit and deal damage to a creature within the ape\'s reach, the creature becomes grabbed by the ape.',
    advancedManeuver: { name: 'Pummel', actions: 1, description: 'The ape makes two fist Strikes against the same target. If both hit, combine their damage for the purpose of resistances and weaknesses. Its multiple attack penalty increases only after all attacks.' },
  },

  // ─── Shark ───
  {
    id: 'shark',
    name: 'Shark',
    size: 'small',
    matureSize: 'medium',
    speed: 0,
    specialSpeeds: [{ type: 'swim', speed: 35 }],
    abilityMods: [3, 1, 2, -4, 1, -2],
    baseHp: 8,
    attacks: [
      atk('Jaws', '1d8', 'piercing'),
    ],
    skills: ['survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet (in water)'],
    supportBenefit: 'The shark enters a blood frenzy. Until the start of your next turn, if you hit and deal damage to a creature in the shark\'s reach, the creature takes 1d8 slashing damage from the shark (2d8 if nimble/savage). This support benefit only works underwater.',
    advancedManeuver: { name: 'Thrash', actions: 1, description: 'Requirements: The shark has a creature grabbed. The shark thrashes the creature, dealing 1d8 slashing damage (basic Fortitude save).' },
  },

  // ─── Scorpion ───
  {
    id: 'scorpion',
    name: 'Scorpion',
    size: 'small',
    matureSize: 'medium',
    speed: 30,
    abilityMods: [2, 2, 2, -4, 0, -2],
    baseHp: 8,
    attacks: [
      atk('Stinger', '1d8', 'piercing'),
      atk('Pincer', '1d6', 'bludgeoning', ['agile']),
    ],
    skills: ['stealth', 'survival'],
    senses: ['darkvision', 'tremorsense (imprecise) 30 feet'],
    supportBenefit: 'The scorpion stings your foe with its venom. Until the start of your next turn, your Strikes that deal damage to a creature in the scorpion\'s reach also deal 1d6 poison damage (2d6 if nimble/savage).',
    advancedManeuver: { name: 'Grab and Sting', actions: 1, description: 'Requirements: The scorpion\'s last action was a successful pincer Strike. The creature is grabbed and the scorpion makes a stinger Strike against it.' },
  },

  // ─── Pangolin ───
  {
    id: 'pangolin',
    name: 'Pangolin',
    size: 'small',
    matureSize: 'medium',
    speed: 25,
    specialSpeeds: [{ type: 'burrow', speed: 10 }],
    abilityMods: [2, 1, 3, -4, 1, 0],
    baseHp: 10,
    attacks: [
      atk('Claw', '1d6', 'slashing'),
      atk('Tail', '1d6', 'bludgeoning'),
    ],
    skills: ['survival'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
    supportBenefit: 'The pangolin rolls into a defensive ball near your enemy. Until the start of your next turn, you gain a +1 circumstance bonus to AC against attacks from creatures the pangolin threatens.',
    advancedManeuver: { name: 'Roll Up', actions: 1, description: 'The pangolin curls into a ball, gaining a +2 circumstance bonus to AC but can\'t use attack actions. It can Stride while rolled up. Roll Up again to uncurl.' },
  },

  // ─── Raptor (Allosaurus-type) ───
  {
    id: 'raptor',
    name: 'Raptor',
    size: 'small',
    matureSize: 'medium',
    speed: 50,
    abilityMods: [2, 3, 1, -4, 1, 0],
    baseHp: 6,
    attacks: [
      atk('Jaws', '1d8', 'piercing', ['finesse']),
      atk('Talon', '1d6', 'slashing', ['agile', 'finesse']),
    ],
    skills: ['acrobatics'],
    senses: ['low-light vision'],
    supportBenefit: 'The raptor uses its powerful legs to help you maintain pursuit. Until the start of your next turn, if you hit and deal damage to a creature the raptor threatens, you can Step as a free action.',
    advancedManeuver: { name: 'Leaping Charge', actions: 2, description: 'The raptor Strides up to its Speed, then makes a Strike. If the raptor moved at least 20 feet, it gains a +1 circumstance bonus to the attack roll.' },
  },
];

/**
 * Look up a companion template by species ID ('bear', 'wolf', etc.)
 */
export function getCompanionTemplate(speciesId: string): AnimalCompanionTemplate | undefined {
  return ANIMAL_COMPANION_CATALOG.find(t => t.id === speciesId);
}

/**
 * Get all companion templates
 */
export function getAllCompanionTemplates(): AnimalCompanionTemplate[] {
  return ANIMAL_COMPANION_CATALOG;
}

/**
 * Maturity stat scaling table (PF2e rules)
 * Applied on top of young base stats when companion matures.
 */
export const MATURITY_SCALING: Record<string, {
  strMod: number; dexMod: number; conMod: number; wisMod: number;
  acBonus: number; hpPerLevel: number; attackBonus: number; damageBonus: number;
  sizeIncrease: boolean; skillIncrease: number;
}> = {
  young:       { strMod: 0, dexMod: 0, conMod: 0, wisMod: 0, acBonus: 0, hpPerLevel: 0, attackBonus: 0, damageBonus: 0, sizeIncrease: false, skillIncrease: 0 },
  mature:      { strMod: 1, dexMod: 1, conMod: 1, wisMod: 1, acBonus: 2, hpPerLevel: 1, attackBonus: 2, damageBonus: 0, sizeIncrease: true,  skillIncrease: 1 },
  nimble:      { strMod: 1, dexMod: 3, conMod: 2, wisMod: 2, acBonus: 4, hpPerLevel: 1, attackBonus: 4, damageBonus: 0, sizeIncrease: true,  skillIncrease: 2 },
  savage:      { strMod: 3, dexMod: 1, conMod: 2, wisMod: 2, acBonus: 3, hpPerLevel: 2, attackBonus: 4, damageBonus: 2, sizeIncrease: true,  skillIncrease: 2 },
  specialized: { strMod: 3, dexMod: 3, conMod: 3, wisMod: 3, acBonus: 4, hpPerLevel: 2, attackBonus: 4, damageBonus: 2, sizeIncrease: true,  skillIncrease: 3 },
  incredible:  { strMod: 4, dexMod: 4, conMod: 4, wisMod: 4, acBonus: 6, hpPerLevel: 3, attackBonus: 6, damageBonus: 3, sizeIncrease: true,  skillIncrease: 4 },
};

/**
 * Specialization benefits for animal companions at the Specialized maturity level
 */
export const COMPANION_SPECIALIZATIONS: Record<string, {
  name: string;
  description: string;
  hpBonus: number;
  /** Extra damage on Strikes */
  damageBonus?: number;
  /** Extra AC bonus */
  acBonus?: number;
  /** Speed bonus */
  speedBonus?: number;
  /** Special ability granted */
  special?: string;
}> = {
  ambusher:  { name: 'Ambusher',  description: '+2 damage on Strikes vs off-guard. +4 Stealth.', hpBonus: 0, damageBonus: 2, special: 'Extra damage vs off-guard' },
  berserker: { name: 'Berserker', description: '+2 damage on all Strikes. Gains 3 temporary HP when raging.', hpBonus: 0, damageBonus: 2, special: 'Temp HP on rage' },
  bully:     { name: 'Bully',     description: 'Gains +2 Athletics for Shove, Trip, and Grapple.', hpBonus: 0, special: '+2 Athletics for combat maneuvers' },
  daredevil: { name: 'Daredevil', description: 'Gains +2 Acrobatics, immune to off-guard from flanking.', hpBonus: 0, special: 'Immune to flanking' },
  racer:     { name: 'Racer',     description: '+10 speed.', hpBonus: 0, speedBonus: 10, special: '+10 speed' },
  tracker:   { name: 'Tracker',   description: '+2 Survival. Can Track while moving at full speed.', hpBonus: 0, special: 'Track at full speed' },
  wrecker:   { name: 'Wrecker',   description: '+2 Athletics. Ignore 5 Hardness on objects.', hpBonus: 0, special: 'Ignore 5 Hardness' },
};
