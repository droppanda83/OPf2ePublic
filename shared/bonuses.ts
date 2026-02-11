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

// ─── Type Definitions ────────────────────────────────

export type BonusType = 'circumstance' | 'item' | 'status' | 'untyped';

export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary';

export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export interface Bonus {
  type: BonusType;
  value: number;
  source: string;
  applyTo?: string; // e.g. 'ac', 'attack', 'reflex', 'damage', 'spell-dc', ...
}

export interface Penalty {
  type: BonusType;
  value: number; // Positive number — magnitude of the penalty
  source: string;
  applyTo?: string;
}

export interface AbilityScores {
  strength: number;     // modifier (e.g. -1 to +7)
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface ProficiencyProfile {
  // Weapons
  unarmed: ProficiencyRank;
  simpleWeapons: ProficiencyRank;
  martialWeapons: ProficiencyRank;
  advancedWeapons: ProficiencyRank;
  // Armor
  unarmored: ProficiencyRank;
  lightArmor: ProficiencyRank;
  mediumArmor: ProficiencyRank;
  heavyArmor: ProficiencyRank;
  // Saving Throws
  fortitude: ProficiencyRank;
  reflex: ProficiencyRank;
  will: ProficiencyRank;
  // Other
  perception: ProficiencyRank;
  classDC: ProficiencyRank;
  spellAttack: ProficiencyRank;
  spellDC: ProficiencyRank;
}

// ─── Core Functions ──────────────────────────────────

/**
 * Get numeric proficiency bonus for a rank + level.
 * Untrained = 0 (no level added)
 * Trained = 2 + level
 * Expert = 4 + level
 * Master = 6 + level
 * Legendary = 8 + level
 */
export function getProficiencyBonus(rank: ProficiencyRank, level: number): number {
  const rankBonus: Record<ProficiencyRank, number> = {
    untrained: 0,
    trained: 2,
    expert: 4,
    master: 6,
    legendary: 8,
  };
  const base = rankBonus[rank];
  return base === 0 ? 0 : base + level;
}

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
export function resolveStacking(bonuses: Bonus[], penalties: Penalty[]): number {
  let total = 0;

  // ── Bonuses: typed = highest only, untyped = all stack ──
  const bonusByType = new Map<string, number>();
  for (const b of bonuses) {
    if (b.value <= 0) continue; // Skip zero/negative values
    if (b.type === 'untyped') {
      total += b.value; // Untyped bonuses always stack
    } else {
      // Typed bonuses: keep only the highest
      const current = bonusByType.get(b.type) ?? 0;
      if (b.value > current) bonusByType.set(b.type, b.value);
    }
  }
  // Apply the highest of each typed bonus
  for (const v of bonusByType.values()) total += v;

  // ── Penalties: typed = worst only, untyped = all stack ──
  const penaltyByType = new Map<string, number>();
  for (const p of penalties) {
    if (p.value <= 0) continue; // Skip zero/negative magnitudes
    if (p.type === 'untyped') {
      total -= p.value; // Untyped penalties always stack
    } else {
      // Typed penalties: keep only the worst (highest magnitude)
      const current = penaltyByType.get(p.type) ?? 0;
      if (p.value > current) penaltyByType.set(p.type, p.value);
    }
  }
  // Apply the worst of each typed penalty
  for (const v of penaltyByType.values()) total -= v;

  return total;
}

/**
 * Calculate Multiple Attack Penalty (MAP).
 * PF2e: 1st attack = 0, 2nd = -5 (-4 agile), 3rd+ = -10 (-8 agile)
 */
export function calculateMAP(attacksMadeThisTurn: number, isAgile: boolean = false): number {
  if (attacksMadeThisTurn <= 0) return 0;
  if (attacksMadeThisTurn === 1) return isAgile ? -4 : -5;
  return isAgile ? -8 : -10;
}

// ─── Defaults ────────────────────────────────────────

export function createDefaultAbilities(overrides?: Partial<AbilityScores>): AbilityScores {
  return {
    strength: 2,
    dexterity: 2,
    constitution: 2,
    intelligence: 0,
    wisdom: 1,
    charisma: 0,
    ...overrides,
  };
}

export function createDefaultProficiencies(overrides?: Partial<ProficiencyProfile>): ProficiencyProfile {
  return {
    unarmed: 'trained',
    simpleWeapons: 'trained',
    martialWeapons: 'untrained',
    advancedWeapons: 'untrained',
    unarmored: 'trained',
    lightArmor: 'trained',
    mediumArmor: 'untrained',
    heavyArmor: 'untrained',
    fortitude: 'trained',
    reflex: 'trained',
    will: 'trained',
    perception: 'trained',
    classDC: 'trained',
    spellAttack: 'untrained',
    spellDC: 'untrained',
    ...overrides,
  };
}
