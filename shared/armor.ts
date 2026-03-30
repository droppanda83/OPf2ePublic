/**
 * Armor definitions for PF2e Rebirth
 * PHASE 9.1: Armor Catalog
 * 
 * PF2e Remaster Armor Rules:
 * - AC Bonus: Added to base AC 10
 * - DEX Cap: Maximum DEX bonus you can add to AC while wearing this armor
 * - Check Penalty: Applied to STR- and DEX-based skills (negated if trained in armor category)
 * - Speed Penalty: Reduction to Speed
 *   - Medium armor: -5ft (0ft if STR requirement met)
 *   - Heavy armor: -10ft (-5ft if STR requirement met)
 * - STR Requirement: Meeting this reduces speed penalty by 5ft
 * - Bulk: Weight category (affects encumbrance)
 * - Group: Armor group for specialization bonuses
 * - Traits: Special properties
 */

export type ArmorCategory = 'unarmored' | 'light' | 'medium' | 'heavy';
export type ArmorGroup = 'cloth' | 'leather' | 'composite' | 'chain' | 'plate';

export interface Armor {
  id: string;
  name: string;
  category: ArmorCategory;
  acBonus: number; // AC bonus provided by the armor
  dexCap: number | null; // Max DEX bonus to AC (null = unlimited)
  checkPenalty: number; // Penalty to STR/DEX skills (0 = none)
  speedPenalty: number; // Feet reduced from Speed
  strRequirement: number; // STR score to reduce speed penalty
  bulk: number; // Bulk value (L = 0.1, standard items = 1)
  group: ArmorGroup;
  price: number; // GP cost
  rarity: 'common' | 'uncommon' | 'rare' | 'unique';
  traits: string[];
  icon: string;
  description: string;
}

// Armor catalog
export const ARMOR_CATALOG: Record<string, Armor> = {
  // ═══════════════════════════════════════════════════════════
  // UNARMORED
  // ═══════════════════════════════════════════════════════════
  'unarmored': {
    id: 'unarmored',
    name: 'Unarmored',
    category: 'unarmored',
    acBonus: 0,
    dexCap: null,
    checkPenalty: 0,
    speedPenalty: 0,
    strRequirement: 0,
    bulk: 0,
    group: 'cloth',
    price: 0,
    rarity: 'common',
    traits: [],
    icon: '👕',
    description: 'No armor, relying on DEX and natural defenses',
  },
  'explorers-clothing': {
    id: 'explorers-clothing',
    name: "Explorer's Clothing",
    category: 'unarmored',
    acBonus: 0,
    dexCap: null,
    checkPenalty: 0,
    speedPenalty: 0,
    strRequirement: 0,
    bulk: 0.1,
    group: 'cloth',
    price: 0.1,
    rarity: 'common',
    traits: ['comfort'],
    icon: '👔',
    description: 'Durable clothing designed for adventuring',
  },

  // ═══════════════════════════════════════════════════════════
  // LIGHT ARMOR
  // ═══════════════════════════════════════════════════════════
  'padded-armor': {
    id: 'padded-armor',
    name: 'Padded Armor',
    category: 'light',
    acBonus: 1,
    dexCap: 3,
    checkPenalty: 0,
    speedPenalty: 0,
    strRequirement: 10,
    bulk: 0.1,
    group: 'cloth',
    price: 0.2,
    rarity: 'common',
    traits: ['comfort'],
    icon: '🧥',
    description: 'Quilted cloth armor providing basic protection',
  },
  'leather-armor': {
    id: 'leather-armor',
    name: 'Leather Armor',
    category: 'light',
    acBonus: 1,
    dexCap: 4,
    checkPenalty: -1,
    speedPenalty: 0,
    strRequirement: 10,
    bulk: 1,
    group: 'leather',
    price: 2,
    rarity: 'common',
    traits: [],
    icon: '🦺',
    description: 'Boiled and hardened leather offering decent protection',
  },
  'studded-leather-armor': {
    id: 'studded-leather-armor',
    name: 'Studded Leather Armor',
    category: 'light',
    acBonus: 2,
    dexCap: 3,
    checkPenalty: -1,
    speedPenalty: 0,
    strRequirement: 12,
    bulk: 1,
    group: 'leather',
    price: 3,
    rarity: 'common',
    traits: [],
    icon: '🦺',
    description: 'Leather reinforced with metal studs',
  },
  'chain-shirt': {
    id: 'chain-shirt',
    name: 'Chain Shirt',
    category: 'light',
    acBonus: 2,
    dexCap: 3,
    checkPenalty: -1,
    speedPenalty: 0,
    strRequirement: 12,
    bulk: 1,
    group: 'chain',
    price: 5,
    rarity: 'common',
    traits: ['flexible', 'noisy'],
    icon: '⛓️',
    description: 'Chain mail covering the torso',
  },

  // ═══════════════════════════════════════════════════════════
  // MEDIUM ARMOR
  // ═══════════════════════════════════════════════════════════
  'hide-armor': {
    id: 'hide-armor',
    name: 'Hide Armor',
    category: 'medium',
    acBonus: 3,
    dexCap: 2,
    checkPenalty: -2,
    speedPenalty: 5,
    strRequirement: 14,
    bulk: 2,
    group: 'leather',
    price: 2,
    rarity: 'common',
    traits: [],
    icon: '🦌',
    description: 'Thick animal hides stitched together',
  },
  'scale-mail': {
    id: 'scale-mail',
    name: 'Scale Mail',
    category: 'medium',
    acBonus: 3,
    dexCap: 2,
    checkPenalty: -2,
    speedPenalty: 5,
    strRequirement: 14,
    bulk: 2,
    group: 'composite',
    price: 4,
    rarity: 'common',
    traits: [],
    icon: '🐉',
    description: 'Overlapping metal scales sewn to a backing',
  },
  'chain-mail': {
    id: 'chain-mail',
    name: 'Chain Mail',
    category: 'medium',
    acBonus: 4,
    dexCap: 1,
    checkPenalty: -2,
    speedPenalty: 5,
    strRequirement: 16,
    bulk: 2,
    group: 'chain',
    price: 6,
    rarity: 'common',
    traits: ['flexible', 'noisy'],
    icon: '⛓️',
    description: 'Full suit of interlocking metal rings',
  },
  'breastplate': {
    id: 'breastplate',
    name: 'Breastplate',
    category: 'medium',
    acBonus: 4,
    dexCap: 1,
    checkPenalty: -2,
    speedPenalty: 5,
    strRequirement: 16,
    bulk: 2,
    group: 'plate',
    price: 8,
    rarity: 'common',
    traits: [],
    icon: '🛡️',
    description: 'Metal plates protecting the torso',
  },

  // ═══════════════════════════════════════════════════════════
  // HEAVY ARMOR
  // ═══════════════════════════════════════════════════════════
  'splint-mail': {
    id: 'splint-mail',
    name: 'Splint Mail',
    category: 'heavy',
    acBonus: 5,
    dexCap: 1,
    checkPenalty: -3,
    speedPenalty: 10,
    strRequirement: 16,
    bulk: 3,
    group: 'composite',
    price: 13,
    rarity: 'common',
    traits: [],
    icon: '🦾',
    description: 'Metal strips attached to a leather backing',
  },
  'half-plate': {
    id: 'half-plate',
    name: 'Half Plate',
    category: 'heavy',
    acBonus: 5,
    dexCap: 1,
    checkPenalty: -3,
    speedPenalty: 10,
    strRequirement: 16,
    bulk: 3,
    group: 'plate',
    price: 18,
    rarity: 'common',
    traits: [],
    icon: '🦾',
    description: 'Partial plate armor covering vital areas',
  },
  'full-plate': {
    id: 'full-plate',
    name: 'Full Plate',
    category: 'heavy',
    acBonus: 6,
    dexCap: 0,
    checkPenalty: -3,
    speedPenalty: 10,
    strRequirement: 18,
    bulk: 4,
    group: 'plate',
    price: 30,
    rarity: 'common',
    traits: ['bulwark'],
    icon: '🦾',
    description: 'Complete suit of articulated metal plates',
  },
};

/**
 * Get armor by ID
 */
export function getArmor(armorId: string): Armor | undefined {
  return ARMOR_CATALOG[armorId];
}

/**
 * Calculate effective speed penalty based on STR
 * PF2e Rule: Meeting STR requirement reduces penalty by 5ft
 */
export function calculateSpeedPenalty(armor: Armor, strScore: number): number {
  if (armor.speedPenalty === 0) return 0;
  
  // If STR requirement is met, reduce penalty by 5ft
  if (strScore >= armor.strRequirement) {
    return Math.max(0, armor.speedPenalty - 5);
  }
  
  return armor.speedPenalty;
}

/**
 * Calculate effective check penalty
 * PF2e Rule: Negated if trained in armor category
 */
export function calculateCheckPenalty(
  armor: Armor,
  armorProficiency: 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'
): number {
  // Trained or better negates the penalty
  if (armorProficiency !== 'untrained') {
    return 0;
  }
  
  return armor.checkPenalty;
}

/**
 * Calculate max DEX bonus to AC from armor
 */
export function getArmorDexCap(armor: Armor): number | null {
  return armor.dexCap;
}
