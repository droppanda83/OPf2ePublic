/**
 * PF2e Typed Bonus & Stacking System
 *
 * Core PF2e Rules:
 * - Typed bonuses (circumstance, item, status) do NOT stack — only the highest of each type applies
 * - Untyped bonuses always stack with everything
 * - Typed penalties do NOT stack — only the worst (most negative) of each type applies
 * - Untyped penalties always stack
 * - Ability modifiers and proficiency bonuses are added directly (not through stacking)
 */
export type BonusType = 'circumstance' | 'item' | 'status' | 'untyped';
export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary';
export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
export interface Bonus {
    type: BonusType;
    value: number;
    source: string;
    applyTo?: string;
}
export interface Penalty {
    type: BonusType;
    value: number;
    source: string;
    applyTo?: string;
}
export interface AbilityScores {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
}
export interface ProficiencyProfile {
    unarmed: ProficiencyRank;
    simpleWeapons: ProficiencyRank;
    martialWeapons: ProficiencyRank;
    advancedWeapons: ProficiencyRank;
    unarmored: ProficiencyRank;
    lightArmor: ProficiencyRank;
    mediumArmor: ProficiencyRank;
    heavyArmor: ProficiencyRank;
    fortitude: ProficiencyRank;
    reflex: ProficiencyRank;
    will: ProficiencyRank;
    perception: ProficiencyRank;
    classDC: ProficiencyRank;
    spellAttack: ProficiencyRank;
    spellDC: ProficiencyRank;
}
/**
 * Get numeric proficiency bonus for a rank + level.
 * Untrained = 0 (no level added)
 * Trained = 2 + level
 * Expert = 4 + level
 * Master = 6 + level
 * Legendary = 8 + level
 */
export declare function getProficiencyBonus(rank: ProficiencyRank, level: number): number;
/**
 * Resolve bonus stacking according to PF2e rules.
 * Returns the total modifier from all bonuses and penalties combined.
 *
 * ═══════════════════════════════════════════════════════════
 * PHASE 0 - BONUS STACKING AUDIT (2026-02-10)
 * ═══════════════════════════════════════════════════════════
 *
 * PF2e Bonus Stacking Rules (Remaster compliant):
 *
 * 1. TYPED BONUSES (circumstance, item, status):
 *    - Only the HIGHEST bonus of each type applies
 *    - Example: +1 circumstance + +2 circumstance = +2 (not +3)
 *
 * 2. UNTYPED BONUSES:
 *    - ALL untyped bonuses stack with everything
 *    - Example: +1 untyped + +2 untyped = +3
 *
 * 3. TYPED PENALTIES (circumstance, item, status):
 *    - Only the WORST (most negative) penalty of each type applies
 *    - Example: -1 circumstance + -2 circumstance = -2 (not -3)
 *
 * 4. UNTYPED PENALTIES:
 *    - ALL untyped penalties stack with everything
 *    - Example: -1 untyped + -2 untyped = -3
 *
 * 5. BONUSES vs PENALTIES:
 *    - Bonuses and penalties of the SAME TYPE apply simultaneously
 *    - They do NOT cancel each other out
 *    - Example: +2 circumstance bonus + -1 circumstance penalty = +1 net
 *
 * 6. SAME-SOURCE STATUS BONUSES:
 *    - Status bonuses from the same spell/effect DO NOT stack
 *    - This is handled at the condition application level (not here)
 *    - The condition system should not create duplicate status bonuses
 *    - Example: Heroism cast twice = only one +1 status bonus applies
 *
 * 7. ABILITY MODIFIERS & PROFICIENCY:
 *    - These are NOT bonuses — they are base values
 *    - Added directly to calculations, not through this system
 *
 * 8. AC FLOOR:
 *    - AC cannot be reduced below 1 (enforced in calculateAC, not here)
 *
 * VERIFIED: All rules correctly implemented as of Phase 0 audit.
 */
export declare function resolveStacking(bonuses: Bonus[], penalties: Penalty[]): number;
/**
 * Calculate Multiple Attack Penalty (MAP).
 * PF2e: 1st attack = 0, 2nd = -5 (-4 agile), 3rd+ = -10 (-8 agile)
 */
export declare function calculateMAP(attacksMadeThisTurn: number, isAgile?: boolean): number;
export declare function createDefaultAbilities(overrides?: Partial<AbilityScores>): AbilityScores;
export declare function createDefaultProficiencies(overrides?: Partial<ProficiencyProfile>): ProficiencyProfile;
