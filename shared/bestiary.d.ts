/**
 * PF2e Bestiary — Curated creature data for encounter building.
 * Stats sourced from the open-source Foundry VTT PF2e system (ORC license).
 *
 * Each entry is a Partial<Creature> that can be passed directly to
 * the game engine's initializeCreature(). NPC creatures use:
 *   - armorClass: flat AC (preserved by engine for NPCs)
 *   - pbAttackBonus: flat attack bonus (bypasses proficiency calc)
 *   - weaponDamageDice / weaponDamageBonus / weaponDamageType: damage
 *   - weaponDisplay: attack name shown in UI
 */
import { Creature } from './types';
export interface BestiaryEntry {
    /** Partial creature data for the game engine */
    creature: Partial<Creature>;
    /** Short description for the UI */
    description: string;
    /** Creature tags for filtering (e.g., 'undead', 'beast', 'humanoid') */
    tags: string[];
}
export declare const BESTIARY: BestiaryEntry[];
/** Get all creatures at a specific level */
export declare function getCreaturesByLevel(level: number): BestiaryEntry[];
/** Get all creatures within a level range (inclusive) */
export declare function getCreaturesInRange(minLevel: number, maxLevel: number): BestiaryEntry[];
/** Get all creatures matching any of the given tags */
export declare function getCreaturesByTag(tags: string[]): BestiaryEntry[];
/** Pick a random creature from a list */
export declare function pickRandom<T>(arr: T[]): T;
