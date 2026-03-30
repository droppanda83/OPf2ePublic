/**
 * PHASE 9.5: Property Runes System
 * PF2e Remaster-compliant weapon and armor runes
 */

import { DamageType } from './types';

// ─── Fundamental Runes ────────────────────────────────────────

/**
 * Potency Runes - Add item bonus to attack rolls (weapon) or AC (armor)
 * PF2e: +1/+2/+3 item bonus
 */
export type PotencyRune = 1 | 2 | 3;

/**
 * Striking Runes - Add extra damage dice to weapon
 * PF2e: Striking (+1 die), Greater Striking (+2 dice), Major Striking (+3 dice)
 */
export type StrikingRune = 'striking' | 'greater-striking' | 'major-striking';

export function getStrikingDiceBonus(rune: StrikingRune): number {
  switch (rune) {
    case 'striking': return 1;
    case 'greater-striking': return 2;
    case 'major-striking': return 3;
  }
}

/**
 * Resilient Runes - Add item bonus to saving throws
 * PF2e: Resilient (+1), Greater Resilient (+2), Major Resilient (+3)
 */
export type ResilientRune = 'resilient' | 'greater-resilient' | 'major-resilient';

export function getResilientSaveBonus(rune: ResilientRune): number {
  switch (rune) {
    case 'resilient': return 1;
    case 'greater-resilient': return 2;
    case 'major-resilient': return 3;
  }
}

// ─── Property Runes (Weapons) ─────────────────────────────────

export interface WeaponPropertyRune {
  id: string;
  name: string;
  level: number; // Minimum item level
  price: number; // GP cost
  effect: string; // Description of effect
  // Damage-dealing runes
  damageType?: DamageType;
  damageDice?: string; // e.g., "1d6" for flaming
  // Special effects (for future implementation)
  special?: string;
}

export const WEAPON_PROPERTY_RUNES: Record<string, WeaponPropertyRune> = {
  'flaming': {
    id: 'flaming',
    name: 'Flaming',
    level: 8,
    price: 500,
    effect: 'Deals +1d6 fire damage',
    damageType: 'fire',
    damageDice: '1d6',
  },
  'frost': {
    id: 'frost',
    name: 'Frost',
    level: 8,
    price: 500,
    effect: 'Deals +1d6 cold damage',
    damageType: 'cold',
    damageDice: '1d6',
  },
  'shock': {
    id: 'shock',
    name: 'Shock',
    level: 8,
    price: 500,
    effect: 'Deals +1d6 electricity damage',
    damageType: 'electricity',
    damageDice: '1d6',
  },
  'corrosive': {
    id: 'corrosive',
    name: 'Corrosive',
    level: 8,
    price: 500,
    effect: 'Deals +1d6 acid damage',
    damageType: 'acid',
    damageDice: '1d6',
  },
  'thundering': {
    id: 'thundering',
    name: 'Thundering',
    level: 8,
    price: 500,
    effect: 'Deals +1d6 sonic damage',
    damageType: 'sonic',
    damageDice: '1d6',
  },
  'ghost-touch': {
    id: 'ghost-touch',
    name: 'Ghost Touch',
    level: 4,
    price: 75,
    effect: 'Weapon affects incorporeal creatures normally',
    special: 'Ignores incorporeal resistance',
  },
  'holy': {
    id: 'holy',
    name: 'Holy',
    level: 11,
    price: 1400,
    effect: 'Deals +1d6 spirit damage to unholy creatures',
    damageType: 'spirit',
    damageDice: '1d6',
    special: 'Extra damage vs unholy',
  },
  'unholy': {
    id: 'unholy',
    name: 'Unholy',
    level: 11,
    price: 1400,
    effect: 'Deals +1d6 spirit damage to holy creatures',
    damageType: 'spirit',
    damageDice: '1d6',
    special: 'Extra damage vs holy',
  },
  'anarchic': {
    id: 'anarchic',
    name: 'Anarchic',
    level: 11,
    price: 1400,
    effect: 'Deals +1d6 spirit damage to lawful creatures',
    damageType: 'spirit',
    damageDice: '1d6',
    special: 'Extra damage vs lawful',
  },
  'axiomatic': {
    id: 'axiomatic',
    name: 'Axiomatic',
    level: 11,
    price: 1400,
    effect: 'Deals +1d6 spirit damage to chaotic creatures',
    damageType: 'spirit',
    damageDice: '1d6',
    special: 'Extra damage vs chaotic',
  },
  'keen': {
    id: 'keen',
    name: 'Keen',
    level: 13,
    price: 3000,
    effect: 'Increases critical threat range (19-20 on d20)',
    special: 'Expands critical hit range',
  },
  'returning': {
    id: 'returning',
    name: 'Returning',
    level: 3,
    price: 55,
    effect: 'Thrown weapon returns to hand after attack',
    special: 'Auto-return for thrown weapons',
  },
  'shifting': {
    id: 'shifting',
    name: 'Shifting',
    level: 6,
    price: 225,
    effect: 'Weapon can change damage type (B/P/S) as free action',
    special: 'Change damage type',
  },
  'wounding': {
    id: 'wounding',
    name: 'Wounding',
    level: 7,
    price: 340,
    effect: 'Target takes 1d6 persistent bleed damage on hit',
    damageType: 'bleed',
    special: 'Applies persistent bleed',
  },
  'vorpal': {
    id: 'vorpal',
    name: 'Vorpal',
    level: 17,
    price: 15000,
    effect: 'On crit vs lower-level target, decapitate (massive damage or instant death)',
    special: 'Decapitation on critical hit',
  },
};

// ─── Property Runes (Armor) ───────────────────────────────────

export interface ArmorPropertyRune {
  id: string;
  name: string;
  level: number;
  price: number;
  effect: string;
  resistanceType?: DamageType;
  resistanceValue?: number;
  special?: string;
}

export const ARMOR_PROPERTY_RUNES: Record<string, ArmorPropertyRune> = {
  'energy-resistant-acid': {
    id: 'energy-resistant-acid',
    name: 'Energy-Resistant (Acid)',
    level: 8,
    price: 420,
    effect: 'Resistance 5 to acid damage',
    resistanceType: 'acid',
    resistanceValue: 5,
  },
  'energy-resistant-cold': {
    id: 'energy-resistant-cold',
    name: 'Energy-Resistant (Cold)',
    level: 8,
    price: 420,
    effect: 'Resistance 5 to cold damage',
    resistanceType: 'cold',
    resistanceValue: 5,
  },
  'energy-resistant-electricity': {
    id: 'energy-resistant-electricity',
    name: 'Energy-Resistant (Electricity)',
    level: 8,
    price: 420,
    effect: 'Resistance 5 to electricity damage',
    resistanceType: 'electricity',
    resistanceValue: 5,
  },
  'energy-resistant-fire': {
    id: 'energy-resistant-fire',
    name: 'Energy-Resistant (Fire)',
    level: 8,
    price: 420,
    effect: 'Resistance 5 to fire damage',
    resistanceType: 'fire',
    resistanceValue: 5,
  },
  'energy-resistant-sonic': {
    id: 'energy-resistant-sonic',
    name: 'Energy-Resistant (Sonic)',
    level: 8,
    price: 420,
    effect: 'Resistance 5 to sonic damage',
    resistanceType: 'sonic',
    resistanceValue: 5,
  },
  'greater-energy-resistant-acid': {
    id: 'greater-energy-resistant-acid',
    name: 'Greater Energy-Resistant (Acid)',
    level: 12,
    price: 1650,
    effect: 'Resistance 10 to acid damage',
    resistanceType: 'acid',
    resistanceValue: 10,
  },
  'greater-energy-resistant-fire': {
    id: 'greater-energy-resistant-fire',
    name: 'Greater Energy-Resistant (Fire)',
    level: 12,
    price: 1650,
    effect: 'Resistance 10 to fire damage',
    resistanceType: 'fire',
    resistanceValue: 10,
  },
  'fortification-lesser': {
    id: 'fortification-lesser',
    name: 'Fortification (Lesser)',
    level: 12,
    price: 2000,
    effect: 'Reduces critical hits to normal hits on a DC 14 flat check',
    special: 'Crit mitigation',
  },
  'fortification-moderate': {
    id: 'fortification-moderate',
    name: 'Fortification (Moderate)',
    level: 18,
    price: 24000,
    effect: 'Reduces critical hits to normal hits on a DC 17 flat check',
    special: 'Crit mitigation',
  },
  'shadow': {
    id: 'shadow',
    name: 'Shadow',
    level: 9,
    price: 650,
    effect: '+1 item bonus to Stealth checks',
    special: 'Stealth bonus',
  },
  'glamered': {
    id: 'glamered',
    name: 'Glamered',
    level: 13,
    price: 2700,
    effect: 'Armor can appear as any other clothing or armor',
    special: 'Disguise armor',
  },
  'slick': {
    id: 'slick',
    name: 'Slick',
    level: 5,
    price: 45,
    effect: '+1 item bonus to Acrobatics to Escape and Reflex saves vs. Grab',
    special: 'Escape bonus',
  },
};

// ─── Helper Functions ─────────────────────────────────────────

export function getWeaponPropertyRune(id: string): WeaponPropertyRune | undefined {
  return WEAPON_PROPERTY_RUNES[id];
}

export function getArmorPropertyRune(id: string): ArmorPropertyRune | undefined {
  return ARMOR_PROPERTY_RUNES[id];
}

/**
 * Calculate total damage from weapon property runes
 * Returns array of {damageType, damageDice} for each rune
 */
export function getPropertyRuneDamage(propertyRunes: string[]): Array<{ damageType: DamageType; damageDice: string }> {
  const damages: Array<{ damageType: DamageType; damageDice: string }> = [];
  
  for (const runeId of propertyRunes) {
    const rune = getWeaponPropertyRune(runeId);
    if (rune && rune.damageType && rune.damageDice) {
      damages.push({
        damageType: rune.damageType,
        damageDice: rune.damageDice,
      });
    }
  }
  
  return damages;
}

/**
 * Get all resistances granted by armor property runes
 */
export function getArmorRuneResistances(propertyRunes: string[]): Array<{ type: DamageType; value: number }> {
  const resistances: Array<{ type: DamageType; value: number }> = [];
  
  for (const runeId of propertyRunes) {
    const rune = getArmorPropertyRune(runeId);
    if (rune && rune.resistanceType && rune.resistanceValue) {
      resistances.push({
        type: rune.resistanceType,
        value: rune.resistanceValue,
      });
    }
  }
  
  return resistances;
}
