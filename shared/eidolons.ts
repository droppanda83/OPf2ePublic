// ═══════════════════════════════════════════════════════════════════════════════
// eidolons.ts — PF2e Eidolon Subtypes Catalog (Remaster - Player Core 2)
// Each Summoner chooses an eidolon subtype which determines tradition,
// base stats, attacks, and initial ability. The eidolon shares an HP pool
// with the Summoner and acts via Act Together / Command Eidolon.
// ═══════════════════════════════════════════════════════════════════════════════

import { EidolonTemplate, DamageType } from './types';

export const EIDOLON_CATALOG: EidolonTemplate[] = [
  // ─── Angel Eidolon ───
  {
    id: 'angel',
    name: 'Angel Eidolon',
    tradition: 'divine',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [2, 3, 1, 0, 1, 0],
    baseHp: 10,
    speed: 25,
    specialSpeeds: [{ type: 'fly', speed: 25 }],
    primaryAttack: { name: 'Flaming Sword', damage: '1d8', damageType: 'slashing', traits: ['versatile P'] },
    secondaryAttack: { name: 'Wing Buffet', damage: '1d6', damageType: 'bludgeoning', traits: ['agile'] },
    initialAbility: {
      name: 'Hallowed Strikes',
      description: 'Your eidolon\'s Strikes deal an extra 1 spirit damage against fiends and undead. At 9th level, this increases to your full Charisma modifier.',
    },
    alignmentRestriction: 'Holy',
    skills: ['religion', 'diplomacy'],
    senses: ['darkvision'],
  },

  // ─── Beast Eidolon ───
  {
    id: 'beast',
    name: 'Beast Eidolon',
    tradition: 'primal',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [3, 2, 1, -1, 1, 0],
    baseHp: 10,
    speed: 30,
    primaryAttack: { name: 'Bestial Jaws', damage: '1d8', damageType: 'piercing' },
    secondaryAttack: { name: 'Claw', damage: '1d6', damageType: 'slashing', traits: ['agile'] },
    initialAbility: {
      name: 'Beast\'s Charge',
      description: 'Your eidolon Strides twice, then makes a Strike. If the eidolon moved at least 20 feet, it gains a +1 circumstance bonus to this attack.',
    },
    skills: ['intimidation', 'nature'],
    senses: ['low-light vision', 'scent (imprecise) 30 feet'],
  },

  // ─── Construct Eidolon ───
  {
    id: 'construct',
    name: 'Construct Eidolon',
    tradition: 'arcane',
    size: 'medium',
    acBonus: 3,
    dexCap: 2,
    abilityMods: [3, 1, 2, 0, 0, 0],
    baseHp: 10,
    speed: 25,
    primaryAttack: { name: 'Slam', damage: '1d8', damageType: 'bludgeoning' },
    secondaryAttack: { name: 'Spike', damage: '1d6', damageType: 'piercing', traits: ['agile'] },
    initialAbility: {
      name: 'Construct Heart',
      description: 'Your eidolon is immune to bleed, death effects, disease, doomed, drained, fatigued, healing, nonlethal attacks, paralyzed, poison, sickened, and unconscious. It can still be destroyed at 0 HP.',
    },
    skills: ['athletics', 'crafting'],
    senses: ['darkvision'],
  },

  // ─── Demon Eidolon ───
  {
    id: 'demon',
    name: 'Demon Eidolon',
    tradition: 'divine',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [3, 1, 2, 0, 0, 1],
    baseHp: 10,
    speed: 25,
    primaryAttack: { name: 'Demonic Claw', damage: '1d8', damageType: 'slashing' },
    secondaryAttack: { name: 'Tail Lash', damage: '1d6', damageType: 'bludgeoning', traits: ['agile'] },
    initialAbility: {
      name: 'Unholy Strikes',
      description: 'Your eidolon\'s Strikes deal an extra 1 spirit damage against celestials. At 9th level, this increases to your full Charisma modifier.',
    },
    alignmentRestriction: 'Unholy',
    skills: ['intimidation', 'religion'],
    senses: ['darkvision'],
  },

  // ─── Devotion Phantom Eidolon ───
  {
    id: 'devotion-phantom',
    name: 'Devotion Phantom Eidolon',
    tradition: 'occult',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [1, 3, 0, 0, 2, 1],
    baseHp: 8,
    speed: 25,
    primaryAttack: { name: 'Phantom Tendril', damage: '1d8', damageType: 'void', traits: ['finesse'] },
    secondaryAttack: { name: 'Phantom Grasp', damage: '1d6', damageType: 'void', traits: ['agile', 'finesse'] },
    initialAbility: {
      name: 'Dutiful Devotion',
      description: 'When you gain the dying condition, the phantom can sacrifice 10 of its HP (from your shared HP pool) to prevent your dying value from increasing by 1.',
    },
    skills: ['occultism', 'medicine'],
    senses: ['darkvision'],
  },

  // ─── Dragon Eidolon ───
  {
    id: 'dragon',
    name: 'Dragon Eidolon',
    tradition: 'arcane',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [3, 1, 2, 0, 0, 1],
    baseHp: 10,
    speed: 25,
    specialSpeeds: [{ type: 'fly', speed: 25 }],
    primaryAttack: { name: 'Dragon Jaws', damage: '1d8', damageType: 'piercing' },
    secondaryAttack: { name: 'Claw', damage: '1d6', damageType: 'slashing', traits: ['agile'] },
    initialAbility: {
      name: 'Breath Weapon',
      description: '2 actions. Choose fire, cold, electricity, or poison on gaining the eidolon. The eidolon exhales a 30-foot line or 15-foot cone of energy. Each creature in the area takes 1d6 damage per level (basic Reflex save). Can\'t be used again for 1d4 rounds.',
    },
    skills: ['arcana', 'intimidation'],
    senses: ['darkvision'],
  },

  // ─── Fey Eidolon ───
  {
    id: 'fey',
    name: 'Fey Eidolon',
    tradition: 'primal',
    size: 'medium',
    acBonus: 1,
    dexCap: 4,
    abilityMods: [1, 3, 0, 1, 1, 1],
    baseHp: 8,
    speed: 30,
    primaryAttack: { name: 'Fey Claw', damage: '1d6', damageType: 'slashing', traits: ['finesse'] },
    secondaryAttack: { name: 'Fey Vine', damage: '1d4', damageType: 'bludgeoning', traits: ['agile', 'finesse', 'reach 10'] },
    initialAbility: {
      name: 'Fey Gift Spells',
      description: 'Your eidolon gains the ability to cast a cantrip and a 1st-rank spell from the primal tradition (chosen when selected), each once per day, using your spell DC and attack modifier.',
    },
    skills: ['nature', 'deception'],
    senses: ['low-light vision'],
  },

  // ─── Plant Eidolon ───
  {
    id: 'plant',
    name: 'Plant Eidolon',
    tradition: 'primal',
    size: 'medium',
    acBonus: 3,
    dexCap: 2,
    abilityMods: [3, 1, 2, -1, 1, 0],
    baseHp: 12,
    speed: 20,
    primaryAttack: { name: 'Vine Lash', damage: '1d8', damageType: 'bludgeoning', traits: ['reach 10'] },
    secondaryAttack: { name: 'Thorn', damage: '1d6', damageType: 'piercing', traits: ['agile'] },
    initialAbility: {
      name: 'Tendril Reach',
      description: 'Your eidolon\'s vine and tendril attacks have reach 10 feet. At 9th level, they gain reach 15 feet.',
    },
    skills: ['nature', 'survival'],
    senses: ['low-light vision', 'tremorsense (imprecise) 30 feet'],
  },

  // ─── Psychopomp Eidolon ───
  {
    id: 'psychopomp',
    name: 'Psychopomp Eidolon',
    tradition: 'divine',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [2, 2, 1, 0, 2, 0],
    baseHp: 10,
    speed: 25,
    primaryAttack: { name: 'Spirit Touch', damage: '1d8', damageType: 'void', traits: ['finesse'] },
    secondaryAttack: { name: 'Soul Chain', damage: '1d6', damageType: 'bludgeoning', traits: ['agile', 'reach 10'] },
    initialAbility: {
      name: 'Spirit Touch',
      description: 'Your eidolon\'s Strikes affect incorporeal creatures as though etched with the ghost touch property rune and deal 1 extra spirit damage to undead.',
    },
    skills: ['religion', 'occultism'],
    senses: ['darkvision', 'lifesense (imprecise) 30 feet'],
  },

  // ─── Anger Phantom Eidolon ───
  {
    id: 'anger-phantom',
    name: 'Anger Phantom Eidolon',
    tradition: 'occult',
    size: 'medium',
    acBonus: 2,
    dexCap: 3,
    abilityMods: [3, 2, 1, -1, 0, 1],
    baseHp: 10,
    speed: 25,
    primaryAttack: { name: 'Phantom Fist', damage: '1d8', damageType: 'void' },
    secondaryAttack: { name: 'Phantom Grasp', damage: '1d6', damageType: 'void', traits: ['agile'] },
    initialAbility: {
      name: 'Furious Strike',
      description: 'Your eidolon channels its rage into increased power. As a 2 action activity, the eidolon makes a single Strike that deals +4 additional damage. This increases to +6 at 9th level and +8 at 17th level.',
    },
    skills: ['athletics', 'intimidation'],
    senses: ['darkvision'],
  },
];

/**
 * Look up an eidolon template by subtype ID ('angel', 'beast', 'dragon', etc.)
 */
export function getEidolonTemplate(subtypeId: string): EidolonTemplate | undefined {
  return EIDOLON_CATALOG.find(t => t.id === subtypeId);
}

/**
 * Get all eidolon templates
 */
export function getAllEidolonTemplates(): EidolonTemplate[] {
  return EIDOLON_CATALOG;
}

/**
 * Summoner Eidolon evolution feats that modify eidolon stats
 * (referenced by feat resolvers to upgrade eidolons)
 */
export const EIDOLON_EVOLUTIONS: Record<string, {
  name: string;
  level: number;
  effect: string;
}> = {
  'energy-heart':      { name: 'Energy Heart',      level: 1,  effect: 'Eidolon gains resistance 5 to one energy type (acid, cold, electricity, fire, sonic). Increases to 10 at 9th level.' },
  'expanded-senses':   { name: 'Expanded Senses',   level: 1,  effect: 'Eidolon gains 60-foot darkvision or scent (imprecise 30 ft).' },
  'glider-form':       { name: 'Glider Form',       level: 4,  effect: 'Eidolon gains a fly speed equal to its Speed but must end turn on solid surface or fall.' },
  'hulking-size':      { name: 'Hulking Size',       level: 8,  effect: 'Eidolon becomes Large, gaining reach 10 feet and +2 damage. If already Large, becomes Huge.' },
  'eidolon-symbiosis': { name: 'Eidolon Symbiosis',  level: 12, effect: 'You gain one of your eidolon\'s resistances, senses, or movement speeds.' },
  'ever-vigilant':     { name: 'Ever Vigilant',      level: 14, effect: 'Eidolon can\'t be surprised and is always active when you roll initiative.' },
  'towering-size':     { name: 'Towering Size',      level: 18, effect: 'Eidolon becomes Huge (or Gargantuan if already Huge), gaining 15/20-ft reach and +6 damage.' },
};
