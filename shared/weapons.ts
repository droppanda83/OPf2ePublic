/**
 * Weapon definitions for PF2e Rebirth
 */

import { DamageType } from './spells';

export interface Weapon {
  id: string;
  name: string;
  damageFormula: string; // e.g., "1d6", "2d8+2"
  damageType: DamageType;
  type: 'melee' | 'ranged';
  range?: number; // Range in squares
  hands: number; // 1 or 2
  proficiencyCategory: 'unarmed' | 'simple' | 'martial' | 'advanced';
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  traits: string[]; // e.g., ['finesse', 'agile', 'sweep', 'deadly d8']
  icon: string;
  description: string;
}

// Weapon catalog
export const WEAPON_CATALOG: Record<string, Weapon> = {
  'short-sword': {
    id: 'short-sword',
    name: 'Short Sword',
    damageFormula: '1d6',
    damageType: 'piercing',
    type: 'melee',
    range: 1,
    hands: 1,
    proficiencyCategory: 'martial',
    rarity: 'common',
    traits: ['agile', 'finesse'],
    icon: '⚔️',
    description: 'A versatile one-handed sword',
  },
  'greatsword': {
    id: 'greatsword',
    name: 'Greatsword',
    damageFormula: '1d12',
    damageType: 'slashing',
    type: 'melee',
    range: 1,
    hands: 2,
    proficiencyCategory: 'martial',
    rarity: 'common',
    traits: [],
    icon: '🗡️',
    description: 'A large two-handed sword dealing heavy damage',
  },
  'warhammer': {
    id: 'warhammer',
    name: 'Warhammer',
    damageFormula: '1d8',
    damageType: 'bludgeoning',
    type: 'melee',
    range: 1,
    hands: 1,
    proficiencyCategory: 'martial',
    rarity: 'common',
    traits: ['shove'],
    icon: '🔨',
    description: 'A one-handed hammer, versatile for bludgeoning damage',
  },
  'shortbow': {
    id: 'shortbow',
    name: 'Shortbow',
    damageFormula: '1d6',
    damageType: 'piercing',
    type: 'ranged',
    range: 12,
    hands: 2,
    proficiencyCategory: 'martial',
    rarity: 'common',
    traits: ['deadly d10'],
    icon: '🏹',
    description: 'A ranged bow effective at mid-range combat',
  },
  'longbow': {
    id: 'longbow',
    name: 'Longbow',
    damageFormula: '1d8',
    damageType: 'piercing',
    type: 'ranged',
    range: 20,
    hands: 2,
    proficiencyCategory: 'martial',
    rarity: 'common',
    traits: ['deadly d10', 'volley 30'],
    icon: '🏹',
    description: 'A powerful ranged bow with exceptional range',
  },
  'club': {
    id: 'club',
    name: 'Club',
    damageFormula: '1d6',
    damageType: 'bludgeoning',
    type: 'melee',
    range: 1,
    hands: 1,
    proficiencyCategory: 'simple',
    rarity: 'common',
    traits: ['thrown 10'],
    icon: '🪵',
    description: 'A simple wooden club',
  },
  'dagger': {
    id: 'dagger',
    name: 'Dagger',
    damageFormula: '1d4',
    damageType: 'piercing',
    type: 'melee',
    range: 1,
    hands: 1,
    proficiencyCategory: 'simple',
    rarity: 'common',
    traits: ['agile', 'finesse', 'thrown 10'],
    icon: '🗡️',
    description: 'A small piercing weapon, useful for thrown attacks',
  },
};

export const getWeapon = (weaponId: string): Weapon | undefined => {
  return WEAPON_CATALOG[weaponId];
};
