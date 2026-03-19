/**
 * PHASE 9.6: Consumables System
 * PF2e Remaster-compliant consumable items (potions, elixirs, scrolls, etc.)
 */

import { DamageType } from './types';

// ─── Consumable Types ─────────────────────────────────────────

export type ConsumableType = 
  | 'potion' 
  | 'elixir' 
  | 'scroll' 
  | 'talisman' 
  | 'oil' 
  | 'bomb'
  | 'ammunition';

export type ConsumableActivation = 
  | '1-action'    // Interact to drink/apply
  | '2-actions'   // Cast from scroll
  | 'free-action' // Talisman activation
  | 'reaction';   // Some talismans

export interface Consumable {
  id: string;
  name: string;
  type: ConsumableType;
  level: number;
  price: number; // GP cost
  activation: ConsumableActivation;
  traits: string[];
  description: string;
  effect: string;
  // Healing potions/elixirs
  healingFormula?: string; // e.g., "2d8+5"
  // Bombs
  damageType?: DamageType;
  damageFormula?: string;
  splashDamage?: number; // Splash damage on adjacent squares
  // Scrolls
  spellName?: string;
  spellLevel?: number;
  tradition?: 'arcane' | 'divine' | 'occult' | 'primal';
  // Resistances/bonuses
  resistanceType?: DamageType;
  resistanceValue?: number;
  duration?: string; // e.g., "1 hour", "10 minutes", "instant"
  bonusType?: 'item' | 'status' | 'circumstance';
  bonusValue?: number;
  bonusAppliesTo?: string; // e.g., "saves vs poison", "Fortitude saves"
}

// ─── Healing Potions & Elixirs ────────────────────────────────

export const CONSUMABLES_HEALING: Record<string, Consumable> = {
  'minor-healing-potion': {
    id: 'minor-healing-potion',
    name: 'Minor Healing Potion',
    type: 'potion',
    level: 1,
    price: 4,
    activation: '1-action',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'A crimson liquid that restores vitality',
    effect: 'You regain 1d8 HP',
    healingFormula: '1d8',
    duration: 'instant',
  },
  'lesser-healing-potion': {
    id: 'lesser-healing-potion',
    name: 'Lesser Healing Potion',
    type: 'potion',
    level: 3,
    price: 12,
    activation: '1-action',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'A crimson liquid that restores vitality',
    effect: 'You regain 2d8+5 HP',
    healingFormula: '2d8+5',
    duration: 'instant',
  },
  'moderate-healing-potion': {
    id: 'moderate-healing-potion',
    name: 'Moderate Healing Potion',
    type: 'potion',
    level: 6,
    price: 50,
    activation: '1-action',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'A crimson liquid that restores vitality',
    effect: 'You regain 3d8+10 HP',
    healingFormula: '3d8+10',
    duration: 'instant',
  },
  'greater-healing-potion': {
    id: 'greater-healing-potion',
    name: 'Greater Healing Potion',
    type: 'potion',
    level: 12,
    price: 400,
    activation: '1-action',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'A crimson liquid that restores vitality',
    effect: 'You regain 6d8+20 HP',
    healingFormula: '6d8+20',
    duration: 'instant',
  },
  'major-healing-potion': {
    id: 'major-healing-potion',
    name: 'Major Healing Potion',
    type: 'potion',
    level: 18,
    price: 5000,
    activation: '1-action',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'A crimson liquid that restores vitality',
    effect: 'You regain 8d8+30 HP',
    healingFormula: '8d8+30',
    duration: 'instant',
  },
  'minor-elixir-of-life': {
    id: 'minor-elixir-of-life',
    name: 'Minor Elixir of Life',
    type: 'elixir',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir', 'healing'],
    description: 'An alchemical elixir that heals wounds',
    effect: 'You regain 1d6 HP',
    healingFormula: '1d6',
    duration: 'instant',
  },
  'lesser-elixir-of-life': {
    id: 'lesser-elixir-of-life',
    name: 'Lesser Elixir of Life',
    type: 'elixir',
    level: 5,
    price: 30,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir', 'healing'],
    description: 'An alchemical elixir that heals wounds',
    effect: 'You regain 3d6+6 HP',
    healingFormula: '3d6+6',
    duration: 'instant',
  },
  'moderate-elixir-of-life': {
    id: 'moderate-elixir-of-life',
    name: 'Moderate Elixir of Life',
    type: 'elixir',
    level: 9,
    price: 150,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir', 'healing'],
    description: 'An alchemical elixir that heals wounds',
    effect: 'You regain 5d6+12 HP',
    healingFormula: '5d6+12',
    duration: 'instant',
  },
};

// ─── Alchemical Bombs ─────────────────────────────────────────

export const CONSUMABLES_BOMBS: Record<string, Consumable> = {
  'lesser-alchemists-fire': {
    id: 'lesser-alchemists-fire',
    name: "Lesser Alchemist's Fire",
    type: 'bomb',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['alchemical', 'bomb', 'consumable', 'fire', 'splash'],
    description: 'An alchemical bomb that explodes in flame',
    effect: 'Deals 1d8 fire damage + 1 persistent fire damage. Splash 1.',
    damageType: 'fire',
    damageFormula: '1d8',
    splashDamage: 1,
    duration: 'instant',
  },
  'moderate-alchemists-fire': {
    id: 'moderate-alchemists-fire',
    name: "Moderate Alchemist's Fire",
    type: 'bomb',
    level: 3,
    price: 10,
    activation: '1-action',
    traits: ['alchemical', 'bomb', 'consumable', 'fire', 'splash'],
    description: 'An alchemical bomb that explodes in flame',
    effect: 'Deals 2d8 fire damage + 2 persistent fire damage. Splash 2.',
    damageType: 'fire',
    damageFormula: '2d8',
    splashDamage: 2,
    duration: 'instant',
  },
  'lesser-acid-flask': {
    id: 'lesser-acid-flask',
    name: 'Lesser Acid Flask',
    type: 'bomb',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['acid', 'alchemical', 'bomb', 'consumable', 'splash'],
    description: 'An alchemical bomb that dissolves materials',
    effect: 'Deals 1d6 acid damage + 1 persistent acid damage. Splash 1.',
    damageType: 'acid',
    damageFormula: '1d6',
    splashDamage: 1,
    duration: 'instant',
  },
  'lesser-bottled-lightning': {
    id: 'lesser-bottled-lightning',
    name: 'Lesser Bottled Lightning',
    type: 'bomb',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['alchemical', 'bomb', 'consumable', 'electricity', 'splash'],
    description: 'An alchemical bomb that releases electricity',
    effect: 'Deals 1d6 electricity damage. Splash 1. Target is off-guard until start of your next turn.',
    damageType: 'electricity',
    damageFormula: '1d6',
    splashDamage: 1,
    duration: 'instant',
  },
  'lesser-frost-vial': {
    id: 'lesser-frost-vial',
    name: 'Lesser Frost Vial',
    type: 'bomb',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['alchemical', 'bomb', 'cold', 'consumable', 'splash'],
    description: 'An alchemical bomb that freezes targets',
    effect: 'Deals 1d6 cold damage. Splash 1. Target takes -5ft status penalty to speed until start of your next turn.',
    damageType: 'cold',
    damageFormula: '1d6',
    splashDamage: 1,
    duration: 'instant',
  },
};

// ─── Elixirs & Oils ───────────────────────────────────────────

export const CONSUMABLES_ELIXIRS: Record<string, Consumable> = {
  'antidote-lesser': {
    id: 'antidote-lesser',
    name: 'Lesser Antidote',
    type: 'elixir',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir'],
    description: 'An elixir that helps resist poison',
    effect: 'Gain +2 item bonus to Fortitude saves vs. poison for 6 hours',
    bonusType: 'item',
    bonusValue: 2,
    bonusAppliesTo: 'saves vs poison',
    duration: '6 hours',
  },
  'antiplague-lesser': {
    id: 'antiplague-lesser',
    name: 'Lesser Antiplague',
    type: 'elixir',
    level: 1,
    price: 3,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir'],
    description: 'An elixir that helps resist disease',
    effect: 'Gain +2 item bonus to Fortitude saves vs. disease for 24 hours',
    bonusType: 'item',
    bonusValue: 2,
    bonusAppliesTo: 'saves vs disease',
    duration: '24 hours',
  },
  'darkvision-elixir-lesser': {
    id: 'darkvision-elixir-lesser',
    name: 'Lesser Darkvision Elixir',
    type: 'elixir',
    level: 2,
    price: 6,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir'],
    description: 'An elixir that grants darkvision',
    effect: 'Gain darkvision for 10 minutes',
    duration: '10 minutes',
  },
  'mistform-elixir-lesser': {
    id: 'mistform-elixir-lesser',
    name: 'Lesser Mistform Elixir',
    type: 'elixir',
    level: 4,
    price: 15,
    activation: '1-action',
    traits: ['alchemical', 'consumable', 'elixir', 'polymorph'],
    description: 'An elixir that transforms you into mist',
    effect: 'Transform into mist form for 1 minute. Gain resistance 10 to physical damage, fly 10 feet.',
    duration: '1 minute',
  },
};

// ─── Scrolls ──────────────────────────────────────────────────

export const CONSUMABLES_SCROLLS: Record<string, Consumable> = {
  'scroll-magic-missile-1': {
    id: 'scroll-magic-missile-1',
    name: 'Scroll of Magic Missile (Rank 1)',
    type: 'scroll',
    level: 1,
    price: 4,
    activation: '2-actions',
    traits: ['consumable', 'magical', 'scroll'],
    description: 'A scroll containing the magic missile spell',
    effect: 'Cast magic missile at rank 1',
    spellName: 'Magic Missile',
    spellLevel: 1,
    tradition: 'arcane',
    duration: 'instant',
  },
  'scroll-heal-1': {
    id: 'scroll-heal-1',
    name: 'Scroll of Heal (Rank 1)',
    type: 'scroll',
    level: 1,
    price: 4,
    activation: '2-actions',
    traits: ['consumable', 'magical', 'scroll'],
    description: 'A scroll containing the heal spell',
    effect: 'Cast heal at rank 1 (restores 1d8 HP)',
    spellName: 'Heal',
    spellLevel: 1,
    tradition: 'divine',
    duration: 'instant',
  },
  'scroll-fireball-5': {
    id: 'scroll-fireball-5',
    name: 'Scroll of Fireball (Rank 5)',
    type: 'scroll',
    level: 9,
    price: 140,
    activation: '2-actions',
    traits: ['consumable', 'magical', 'scroll'],
    description: 'A scroll containing the fireball spell',
    effect: 'Cast fireball at rank 5',
    spellName: 'Fireball',
    spellLevel: 5,
    tradition: 'arcane',
    duration: 'instant',
  },
};

// ─── Talismans ────────────────────────────────────────────────

export const CONSUMABLES_TALISMANS: Record<string, Consumable> = {
  'potency-crystal': {
    id: 'potency-crystal',
    name: 'Potency Crystal',
    type: 'talisman',
    level: 2,
    price: 7,
    activation: 'free-action',
    traits: ['consumable', 'magical', 'talisman'],
    description: 'A crystal that enhances weapon strikes',
    effect: 'Trigger: Your Strike hits. Effect: Weapon gains +1 item bonus to damage for this Strike.',
    bonusType: 'item',
    bonusValue: 1,
    bonusAppliesTo: 'damage',
    duration: 'instant',
  },
  'bronze-bull-pendant': {
    id: 'bronze-bull-pendant',
    name: 'Bronze Bull Pendant',
    type: 'talisman',
    level: 3,
    price: 9,
    activation: 'free-action',
    traits: ['consumable', 'magical', 'talisman'],
    description: 'A pendant that grants resolve',
    effect: 'Trigger: You attempt Fortitude save. Effect: Gain +1 status bonus to the save.',
    bonusType: 'status',
    bonusValue: 1,
    bonusAppliesTo: 'Fortitude saves',
    duration: 'instant',
  },
  'owl-charm': {
    id: 'owl-charm',
    name: 'Owl Charm',
    type: 'talisman',
    level: 2,
    price: 6,
    activation: 'free-action',
    traits: ['consumable', 'magical', 'talisman'],
    description: 'A charm that enhances perception',
    effect: 'Trigger: You attempt Perception check. Effect: Gain +1 status bonus to the check.',
    bonusType: 'status',
    bonusValue: 1,
    bonusAppliesTo: 'Perception',
    duration: 'instant',
  },
};

// ─── Combined Catalog ─────────────────────────────────────────

export const CONSUMABLE_CATALOG: Record<string, Consumable> = {
  ...CONSUMABLES_HEALING,
  ...CONSUMABLES_BOMBS,
  ...CONSUMABLES_ELIXIRS,
  ...CONSUMABLES_SCROLLS,
  ...CONSUMABLES_TALISMANS,
};

// ─── Helper Functions ─────────────────────────────────────────

export function getConsumable(id: string): Consumable | undefined {
  return CONSUMABLE_CATALOG[id];
}

/**
 * Get all consumables of a specific type
 */
export function getConsumablesByType(type: ConsumableType): Consumable[] {
  return Object.values(CONSUMABLE_CATALOG).filter(c => c.type === type);
}

/**
 * Get consumables by level range
 */
export function getConsumablesByLevel(minLevel: number, maxLevel: number): Consumable[] {
  return Object.values(CONSUMABLE_CATALOG).filter(
    c => c.level >= minLevel && c.level <= maxLevel
  );
}
