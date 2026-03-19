"use strict";
/**
 * Shield definitions for PF2e Rebirth
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShield = exports.SHIELD_CATALOG = void 0;
// Shield catalog
exports.SHIELD_CATALOG = {
    'wooden-shield': {
        id: 'wooden-shield',
        name: 'Wooden Shield',
        armorBonus: 2,
        hardness: 3,
        hp: 12,
        maxHp: 12,
        hands: 1,
        price: 1,
        rarity: 'common',
        traits: ['wooden'],
        icon: '🛡️',
        description: 'A basic wooden shield that provides modest protection',
    },
    'steel-shield': {
        id: 'steel-shield',
        name: 'Steel Shield',
        armorBonus: 2,
        hardness: 5,
        hp: 20,
        maxHp: 20,
        hands: 1,
        price: 2,
        rarity: 'common',
        traits: ['steel'],
        icon: '🛡️',
        description: 'A sturdy steel shield with good durability',
    },
    'tower-shield': {
        id: 'tower-shield',
        name: 'Tower Shield',
        armorBonus: 2,
        hardness: 6,
        hp: 15,
        maxHp: 15,
        hands: 1,
        price: 10,
        rarity: 'uncommon',
        traits: ['tower'],
        icon: '🛡️',
        description: 'A large tower shield providing superior protection and cover',
    },
    'buckler': {
        id: 'buckler',
        name: 'Buckler',
        armorBonus: 1,
        hardness: 2,
        hp: 4,
        maxHp: 4,
        hands: 0, // Can be used without occupying a hand
        price: 1,
        rarity: 'common',
        traits: ['light'],
        icon: '🛡️',
        description: 'A small ceremonial or practical buckler that leaves a hand free',
    },
    'crystal-shield': {
        id: 'crystal-shield',
        name: 'Crystal Shield',
        armorBonus: 1,
        hardness: 4,
        hp: 8,
        maxHp: 8,
        hands: 1,
        price: 50,
        rarity: 'rare',
        traits: ['magical', 'crystal'],
        icon: '💎',
        description: 'An enchanted crystal shield that shimmers with arcane energy',
    },
};
const getShield = (shieldId) => {
    return exports.SHIELD_CATALOG[shieldId];
};
exports.getShield = getShield;
