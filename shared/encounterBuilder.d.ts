/**
 * PF2e Encounter Builder — XP budget system for balanced encounters.
 *
 * Uses the official PF2e encounter building rules:
 *   - Each creature awards XP based on its level relative to party level
 *   - Difficulty thresholds define XP budgets for an encounter
 *   - The builder selects creatures to fill the budget
 *
 * XP table (creature level vs party level):
 *   -4 → 10 XP    -3 → 15 XP    -2 → 20 XP    -1 → 30 XP
 *    0 → 40 XP    +1 → 60 XP    +2 → 80 XP    +3 → 120 XP    +4 → 160 XP
 */
import { Creature } from './types';
export type Difficulty = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme';
export interface EncounterResult {
    difficulty: Difficulty;
    creatures: Partial<Creature>[];
    totalXP: number;
    targetXP: number;
    description: string;
}
/** Get the XP a creature is worth relative to party level */
export declare function getCreatureXP(creatureLevel: number, partyLevel: number): number;
/** Calculate XP budget for a given difficulty and party size */
export declare function getXPBudget(difficulty: Difficulty, partySize?: number): number;
/**
 * Build a random encounter of the specified difficulty.
 *
 * Strategy:
 *  1. Determine the XP budget
 *  2. Find creatures within a valid level range (partyLevel -4 to +4)
 *  3. Greedily fill the budget, preferring variety
 *  4. Add weaker creatures to fill remaining XP
 */
export declare function buildEncounter(difficulty: Difficulty, partyLevel: number, partySize?: number, allowedTags?: string[]): EncounterResult;
/** All available difficulty levels */
export declare const DIFFICULTIES: Difficulty[];
/** Human-readable labels for difficulties */
export declare const DIFFICULTY_LABELS: Record<Difficulty, string>;
/** Color codes for difficulty levels */
export declare const DIFFICULTY_COLORS: Record<Difficulty, string>;
