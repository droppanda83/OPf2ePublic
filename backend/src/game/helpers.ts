import { Creature, getArmor, calculateSpeedPenalty } from 'pf2e-shared';

// ─── Weapon Trait Parsing Helpers ─────────────────────────
/**
 * Parse weapon traits to extract trait metadata.
 * Traits format: "deadly d10", "volley 30", "thrown 10", "sweep", "finesse", etc.
 */
export function parseTraits(traits: string[] | undefined): Map<string, string | number | boolean> {
  const parsed = new Map<string, string | number | boolean>();
  if (!traits) return parsed;

  traits.forEach((trait) => {
    const lowerTrait = trait.toLowerCase();

    // Traits with parameters (e.g., "deadly d10", "volley 30", "thrown 10")
    const withParamMatch = lowerTrait.match(/^(\w+)\s+(.+)$/);
    if (withParamMatch) {
      parsed.set(withParamMatch[1], withParamMatch[2]);
      return;
    }

    // Simple traits (e.g., "agile", "finesse", "sweep")
    parsed.set(lowerTrait, true);
  });

  return parsed;
}

/**
 * Check if weapon has a trait (case-insensitive, param-agnostic)
 */
export function hasTrait(traits: string[] | undefined, traitName: string): boolean {
  if (!traits) return false;
  return traits.some((t) => t.toLowerCase().startsWith(traitName.toLowerCase()));
}

/**
 * Get trait parameter (e.g., "deadly d10" -> "d10", "volley 30" -> 30)
 */
export function getTraitParam(traits: string[] | undefined, traitName: string): string | number | undefined {
  const parsed = parseTraits(traits);
  const value = parsed.get(traitName.toLowerCase());
  // Return only string/number params, skip boolean flags
  return (typeof value === 'string' || typeof value === 'number') ? value : undefined;
}

/**
 * Calculate range increment penalty for ranged attacks.
 * PF2e: -2 per range increment beyond the first. Max 6 range increments.
 */
export function calculateRangeIncrementPenalty(distanceSq: number, rangeIncrementSq: number): { penalty: number; inRange: boolean } {
  const incrementsPassed = Math.ceil(distanceSq / rangeIncrementSq);

  // First range increment (distance <= rangeIncrement) has no penalty
  if (incrementsPassed <= 1) {
    return { penalty: 0, inRange: true };
  }

  // Beyond first increment: -2 per additional increment
  const additionalIncrements = incrementsPassed - 1;
  const penalty = -2 * additionalIncrements;

  // Max 6 range increments allowed (PF2e rule)
  const inRange = incrementsPassed <= 6;

  return { penalty, inRange };
}

/**
 * Initialize the dying condition on a creature that just dropped to 0 HP.
 * PF2e Remaster: dying value = 1 + current wounded value.
 */
export function initDying(creature: Creature): string {
  creature.conditions = creature.conditions || [];

  // Orc Ferocity / Incredible Ferocity: stay at 1 HP instead of dying
  const hasOrcFerocity = creature.specials?.some(s => s === 'Orc Ferocity') ||
    creature.feats?.some(f => f.name === 'Orc Ferocity');
  const ferocityUsed = creature.conditions.some(c => c.name === 'orc-ferocity-used');
  if (hasOrcFerocity && !ferocityUsed) {
    creature.currentHealth = 1;
    creature.wounded = (creature.wounded ?? 0) + 1;
    creature.conditions.push({ name: 'orc-ferocity-used', duration: 'permanent' });
    return ` 🔥 ${creature.name} activates ORC FEROCITY! Stays at 1 HP! (Wounded ${creature.wounded})`;
  }

  creature.dying = true;
  creature.deathSaveFailures = 0;
  creature.deathSaveSuccesses = 0;
  const woundedValue = creature.wounded ?? 0;
  const dyingValue = 1 + woundedValue;
  creature.conditions.push({ name: 'dying', duration: 'permanent', value: dyingValue });
  return ` 💀 ${creature.name} is DYING ${dyingValue}! (Wounded ${woundedValue})`;
}

/**
 * Get effective speed including armor speed penalty.
 * PF2e: Medium armor -5ft (0 if STR req met), Heavy armor -10ft (-5ft if STR req met)
 */
export function getEffectiveSpeed(creature: Creature): number {
  const baseSpeed = creature.speed ?? 25;
  let speedMod = 0;

  if (creature.equippedArmor) {
    // Apply armor speed penalty
    const armor = getArmor(creature.equippedArmor);
    if (armor) {
      speedMod += calculateSpeedPenalty(armor, creature.abilities?.strength ?? 0);
    }
  }

  // Debilitating Strikes speed penalty
  const speedDebilitation = creature.conditions?.find(c => c.name === 'slowed-speed');
  if (speedDebilitation) {
    speedMod -= (speedDebilitation.value ?? 10);
  }

  return Math.max(5, baseSpeed + speedMod);
}

/**
 * PHASE 10.1: Check if creature has Blank Slate feat (immunity to detection/scrying)
 * Level 16 Rogue feat: Immune to detection, revelation, scrying effects
 * Grants +4 status bonus to saves if immunity is somehow bypassed
 */
export function hasBlankSlate(creature: Creature): boolean {
  if (creature.characterClass !== 'Rogue' || creature.level < 16) {
    return false;
  }

  return creature.feats?.some((f: any) => {
    const name = typeof f === 'string' ? f : f?.name;
    return typeof name === 'string' && name.toLowerCase().includes('blank slate');
  }) || creature.specials?.some((s: string) => s.toLowerCase().includes('blank slate')) || false;
}

/**
 * PHASE 10.1: Get active debilitation choices available to Rogue based on feats
 * Returns array of debilitation IDs that the Rogue can apply with Debilitating Strikes
 */
export function getAvailableDebilitations(creature: Creature): string[] {
  if (creature.characterClass !== 'Rogue' || creature.level < 9) {
    return [];
  }

  const debilitations: string[] = [
    'speed-reduction', // Base: -10 ft to Speed
    'off-guard-next-turn', // Base: Off-guard until end of your next turn
  ];

  const hasRacket = creature.rogueRacket;
  const feats = creature.feats ?? [];
  const specials = creature.specials ?? [];

  const hasFeat = (featName: string) => {
    return feats.some((f: any) => {
      const name = typeof f === 'string' ? f : f?.name;
      return typeof name === 'string' && name.toLowerCase().includes(featName.toLowerCase());
    }) || specials.some((s: string) => s.toLowerCase().includes(featName.toLowerCase()));
  };

  // Racket-specific debilitations (Level 10)
  if (hasRacket === 'thief' && hasFeat('Precise Debilitations')) {
    debilitations.push('extra-precision'); // +1d6 precision damage
    debilitations.push('attack-penalty'); // -2 status penalty to attack rolls
  }
  if (hasRacket === 'ruffian' && hasFeat('Vicious Debilitations')) {
    debilitations.push('weakness'); // Weakness 5 to chosen damage type
    debilitations.push('clumsy'); // Clumsy 1
  }
  if (hasRacket === 'scoundrel' && hasFeat('Tactical Debilitations')) {
    debilitations.push('off-guard'); // Off-guard
    debilitations.push('no-flank'); // Can't flank
  }
  if (hasRacket === 'mastermind' && hasFeat('Methodical Debilitations')) {
    debilitations.push('reduced-speed'); // -5 ft to all Speeds
    debilitations.push('reaction-check'); // DC 5 flat check to use reactions
  }

  return debilitations;
}
