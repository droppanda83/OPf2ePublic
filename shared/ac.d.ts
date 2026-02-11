import { Creature, Condition } from './types';
import { Bonus, Penalty } from './bonuses';
/**
 * Convert active conditions into typed bonuses/penalties for a specific check.
 * This is the core bridge between the condition system and the bonus stacking system.
 */
export declare function getConditionModifiers(conditions: Condition[], applyTo: string, attackerId?: string, // For checking conditional effects like Feint
attackType?: 'melee' | 'ranged'): {
    bonuses: Bonus[];
    penalties: Penalty[];
};
/**
 * Calculate Armor Class.
 * PF2e: 10 + DEX mod + armor proficiency bonus + item bonus (armor) + stacked modifiers
 */
export declare function calculateAC(creature: Creature, attackerId?: string, attackType?: 'melee' | 'ranged'): number;
/**
 * Calculate attack bonus including proficiency, ability modifier, MAP,
 * and all stacking modifiers from conditions/effects.
 */
export declare function calculateAttackBonus(creature: Creature, attackType?: 'melee' | 'ranged'): number;
/**
 * Calculate saving throw bonus (ability + proficiency + modifiers).
 */
export declare function calculateSaveBonus(creature: Creature, saveType: 'reflex' | 'fortitude' | 'will'): number;
/**
 * Calculate spell DC (10 + key ability + spell DC proficiency + modifiers).
 */
export declare function calculateSpellDC(creature: Creature): number;
/**
 * Calculate spell attack bonus (for spells that require an attack roll).
 * Formula: key ability modifier + proficiency bonus + bonuses - penalties
 */
export declare function calculateSpellAttack(creature: Creature): number;
/**
 * Get just the spell casting ability modifier (for adding to spell damage/healing).
 * Returns the key ability modifier.
 */
export declare function calculateSpellAttackModifier(creature: Creature): number;
/**
 * Recompute cached/derived stats on a creature (call after any stat change).
 */
export declare function computeDerivedStats(creature: Creature): void;
/**
 * Roll a d20.
 */
export declare function rollD20(): number;
/**
 * Determine the degree of success for an attack roll vs AC.
 * PF2e: Natural 20 improves by one degree, Natural 1 worsens by one degree.
 */
export type AttackResult = 'critical-success' | 'success' | 'failure' | 'critical-failure';
export declare function getAttackResult(d20: number, total: number, targetAC: number): AttackResult;
/**
 * Generic degree-of-success resolver for any check (saves, skill checks, flat checks).
 * PF2e: Natural 20 improves by one degree, Natural 1 worsens by one degree.
 * Use this instead of duplicating the margin + nat20/nat1 logic everywhere.
 */
export type DegreeOfSuccess = 'critical-success' | 'success' | 'failure' | 'critical-failure';
export declare function getDegreeOfSuccess(d20: number, total: number, dc: number): DegreeOfSuccess;
/**
 * Calculate weapon damage bonus for attacks
 * PF2e: Damage always uses STR for melee (finesse only affects attack rolls, not damage)
 * Includes ability modifier + item bonuses
 */
export declare function calculateDamageBonus(creature: Creature, attackType?: 'melee' | 'ranged'): number;
/**
 * Calculate the damage formula string for a weapon, accounting for Striking runes
 * E.g., "1d6+4" or "3d8+5"
 */
export declare function calculateDamageFormula(creature: Creature, attackType?: 'melee' | 'ranged'): string;
