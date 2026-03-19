// Export all shared types
export * from './types';
export * from './movement';
export * from './ac';
export * from './spells';
export { getSpell } from './spells';
export * from './weapons';
export * from './shields';
export * from './armor';
export * from './runes';
export * from './consumables';
export * from './adventuringGear';
export * from './wornItems';
export * from './actions';
export * from './bonuses';
// Bestiary: re-export types + helpers only; import BESTIARY directly from 'pf2e-shared/bestiary' to avoid loading 549 KB through the barrel
export type { BestiaryEntry } from './bestiary';
export { getCreaturesByLevel, getCreaturesInRange, getCreaturesByTag, getCreatureByName, pickRandom } from './bestiary';
export * from './encounterBuilder';
export * from './encounterMaps';
// foundryEncounterMaps removed – FOUNDRY_MAP_CATALOG had zero consumers (274 KB dead code)
export * from './feats';
export * from './mapGenerator';
export * from './atlasMapGenerator';
export * from './creatureTokens';

// Companion / Familiar / Eidolon catalogs
export * from './companions';
export * from './familiarAbilities';
export * from './eidolons';

// Dice rolling utility
export function rollDice(times: number, sides: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < times; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }
  return results;
}

// Damage calculation with resistances/immunities/weaknesses
import { DamageType, Creature } from './types';

export function calculateFinalDamage(
  baseDamage: number,
  damageType: DamageType,
  target: Creature
): { finalDamage: number; modifier: 'immune' | 'resist' | 'weak' | 'normal'; modifierValue?: number } {
  // Check for immunity first (complete negation)
  if (target.damageImmunities?.includes(damageType)) {
    return { finalDamage: 0, modifier: 'immune' };
  }

  // Check for weakness (extra damage)
  const weakness = target.damageWeaknesses?.find(w => w.type === damageType);
  if (weakness) {
    const finalDamage = baseDamage + weakness.value;
    return { finalDamage, modifier: 'weak', modifierValue: weakness.value };
  }

  // Check for resistance (reduced damage)
  const resistance = target.damageResistances?.find(r => r.type === damageType);
  if (resistance) {
    const finalDamage = Math.max(0, baseDamage - resistance.value);
    return { finalDamage, modifier: 'resist', modifierValue: resistance.value };
  }

  return { finalDamage: baseDamage, modifier: 'normal' };
}

// Shield damage calculation
import { getShield } from './shields';

export interface ShieldDamageResult {
  incomingDamage: number;
  shieldAbsorbed: number; // Damage absorbed by shield hardness
  shieldTakenDamage: number; // Damage that hits shield HP
  creatureTakenDamage: number; // Damage that spills over to creature
  shieldBroken: boolean;
  shieldHpRemaining: number;
}

export function applyDamageToShield(creature: Creature, incomingDamage: number): ShieldDamageResult {
  const result: ShieldDamageResult = {
    incomingDamage,
    shieldAbsorbed: 0,
    shieldTakenDamage: 0,
    creatureTakenDamage: incomingDamage,
    shieldBroken: false,
    shieldHpRemaining: 0,
  };

  // If no shield equipped OR shield not raised, all damage goes to creature
  if (!creature.equippedShield || !creature.shieldRaised) {
    return result;
  }

  // Shield Block must be armed to apply hardness and damage to shield
  const blockIndex = creature.conditions?.findIndex(
    (c) => c.name === 'shield-block-ready' && ((c.usesRemaining ?? 1) > 0)
  ) ?? -1;
  if (blockIndex < 0) {
    return result;
  }

  const shield = getShield(creature.equippedShield);
  if (!shield) {
    return result;
  }

  // Initialize shield HP if not set
  if (creature.currentShieldHp === undefined) {
    creature.currentShieldHp = shield.maxHp;
  }

  // Apply shield hardness (flat damage reduction)
  result.shieldAbsorbed = Math.min(incomingDamage, shield.hardness);
  const damageAfterHardness = Math.max(0, incomingDamage - shield.hardness);

  // Apply remaining damage to shield HP
  result.shieldTakenDamage = Math.min(damageAfterHardness, creature.currentShieldHp);
  creature.currentShieldHp -= result.shieldTakenDamage;

  // Any damage that exceeds shield HP goes to creature
  result.creatureTakenDamage = Math.max(0, damageAfterHardness - result.shieldTakenDamage);

  // Mark shield as broken if HP reaches 0
  if (creature.currentShieldHp <= 0) {
    result.shieldBroken = true;
    creature.currentShieldHp = 0;
  }

  result.shieldHpRemaining = creature.currentShieldHp;

  // Consume the armed Shield Block
  const blockCondition = creature.conditions?.[blockIndex];
  if (blockCondition) {
    if (typeof blockCondition.usesRemaining === 'number') {
      blockCondition.usesRemaining -= 1;
    }
    if (!blockCondition.usesRemaining || blockCondition.usesRemaining <= 0) {
      creature.conditions.splice(blockIndex, 1);
    }
  }

  return result;
}
