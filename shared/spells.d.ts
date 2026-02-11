/**
 * Spell definitions and utilities for PF2e Rebirth
 */
export type DamageType = 'bludgeoning' | 'piercing' | 'slashing' | 'bleed' | 'fire' | 'cold' | 'electricity' | 'sonic' | 'acid' | 'vitality' | 'void' | 'spirit' | 'poison' | 'mental' | 'force';
export interface SpellHeightening {
    type: 'interval' | 'fixed';
    interval?: number;
    damage?: string;
    perInterval?: string;
    fixedLevels?: Record<number, string>;
}
export interface Spell {
    id: string;
    name: string;
    rank: number;
    traditions: ('arcane' | 'divine' | 'occult' | 'primal')[];
    cost: number;
    range: number;
    description: string;
    icon: string;
    targetType: 'single' | 'aoe';
    aoeRadius?: number;
    aoeShape?: 'burst' | 'emanation' | 'cone' | 'line';
    saveDC?: number;
    saveType?: 'reflex' | 'fortitude' | 'will';
    basicSave?: boolean;
    damageType?: DamageType;
    damageFormula?: string;
    persistentDamageFormula?: string;
    persistentDamageChance?: 'always' | 'critical-failure' | 'failure';
    heightening?: SpellHeightening;
    focus?: boolean;
    sustained?: boolean;
}
export declare const SPELL_CATALOG: Record<string, Spell>;
export declare function getSpell(spellId: string): Spell | undefined;
/**
 * Look up a spell by its display name (case-insensitive).
 * Handles Pathbuilder names like "Sure Strike" → finds 'true-strike' entry.
 * Also strips suffixes like " (Archetype)" from Pathbuilder focus spell names.
 */
export declare function getSpellByName(displayName: string): Spell | undefined;
/**
 * Convert a Pathbuilder spell display name to a SPELL_CATALOG id.
 * Returns the spell id if found, or a kebab-case fallback.
 * Examples:
 *   "Sure Strike" → "true-strike"
 *   "Warp Step (Archetype)" → "warp-step"
 *   "Fireball" → "fireball"
 */
export declare function resolveSpellId(displayName: string): string;
export declare const rollDamageFormula: (formula: string) => {
    results: number[];
    total: number;
};
