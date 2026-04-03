/**
 * PF2e Equipment Bonus Resolver
 *
 * Converts equipped worn/held magic items into typed bonuses, resistances,
 * speed modifiers, senses, and DEX caps that integrate with the existing
 * bonus stacking system in bonuses.ts / ac.ts.
 *
 * Usage:
 *   const resolved = resolveEquipmentEffects(creature.equippedWornItems ?? []);
 *   // resolved.bonuses → feed into gatherModifiers / resolveStacking
 *   // resolved.resistances → merge with creature.damageResistances
 *   // resolved.speeds → add to creature speed
 *   // resolved.senses → grant creature senses
 *   // resolved.dexCap → lowest DEX cap from all equipment
 */

import { Bonus } from './bonuses';
import { WORN_ITEMS, EquipmentEffect } from './wornItems';
import { DamageResistance, DamageType, DamageWeakness, ImmunityType } from './types';

// ─── Granted Strike Definition ───────────────────────

export interface GrantedStrike {
  /** Display name (e.g. 'Jaws', 'Claw') */
  name: string;
  /** Weapon category */
  category: 'unarmed' | 'simple' | 'martial';
  /** Damage type (e.g. 'piercing', 'slashing') */
  damageType: string;
  /** Damage dice expression (e.g. '1d10', '1d6') */
  damageDie: string;
  /** Weapon traits */
  traits?: string[];
  /** Source item name */
  source: string;
}

// ─── Degree Adjustment Definition ────────────────────

export interface DegreeAdjustment {
  /** What kind of roll: 'saving-throw', 'skill-check', 'attack-roll' */
  selector: string;
  /** Encoded adjustment, e.g. 'success:one-degree-better' or 'criticalFailure:one-degree-better' */
  adjustment: string;
  /** Optional condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Substitute Roll Definition ──────────────────────

export interface SubstituteRollEffect {
  /** What rolls this applies to */
  selector: string;
  /** The fixed value to substitute */
  value: number;
  /** Identifier slug */
  label: string;
  /** Source item name */
  source: string;
}

// ─── Modifier Adjustment Definition ──────────────────

export interface ModifierAdjustment {
  /** Target selector (e.g. 'survival', 'athletics', 'saving-throw') */
  selector: string;
  /** Slug of the modifier being adjusted (e.g. 'no-compass', 'no-crowbar') */
  slug: string;
  /** How to adjust: override, upgrade, downgrade, add, remove */
  mode: string;
  /** Value for override/upgrade/downgrade modes */
  value?: number;
  /** Optional condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Aura Definition ─────────────────────────────────

export interface AuraEffect {
  /** Aura radius in feet */
  radius: number;
  /** Text description of aura effects */
  effects: string;
  /** Source item name */
  source: string;
}

// ─── Note Effect ─────────────────────────────────────

export interface NoteEffect {
  /** Target roll (e.g. 'athletics', 'item-damage', 'item-attack') */
  selector: string;
  /** Note text (PF2E reference key or inline text) */
  text: string;
  /** When to show: 'success', 'criticalSuccess', etc. */
  outcome?: string[];
  /** Condition for this note */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Damage Dice Effect ──────────────────────────────

export interface DamageDiceEffect {
  /** Target roll selector (e.g. 'strike-damage', 'item-damage') */
  selector: string;
  /** Number of dice to add */
  diceNumber?: number;
  /** Die size (e.g. 'd6', 'd8') */
  dieSize?: string;
  /** Damage type (e.g. 'fire', 'poison', 'bleed') */
  damageType?: string;
  /** Only on critical hits */
  critical?: boolean;
  /** Damage category (e.g. 'precision', 'persistent', 'splash') */
  category?: string;
  /** Condition for this extra damage */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Damage Alteration Effect ────────────────────────

export interface DamageAlterationEffect {
  /** Mode: 'override', 'upgrade', etc. */
  mode: string;
  /** Property being altered (e.g. 'damage-type', 'dice-number') */
  property: string;
  /** New value (e.g. 'fire', 'spirit') */
  value: string;
  /** Condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Adjust Strike Effect ────────────────────────────

export interface AdjustStrikeEffect {
  /** Strike property: 'materials', 'traits', 'property-runes' */
  property: string;
  /** Value to add (e.g. 'silver', 'cold-iron', 'holy') */
  value: string;
  /** Condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Granted Condition ───────────────────────────────

export interface GrantedCondition {
  /** Condition slug (e.g. 'clumsy', 'drained', 'enfeebled') */
  conditionSlug: string;
  /** Condition severity/value (e.g. Drained 2) */
  value?: number;
  /** Condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Roll Twice Effect ───────────────────────────────

export interface RollTwiceEffect {
  /** Target roll (e.g. 'initiative') */
  selector: string;
  /** Which roll to keep */
  keep: 'higher' | 'lower';
  /** Source item name */
  source: string;
}

// ─── Fast Healing Effect ─────────────────────────────

export interface FastHealingEffect {
  /** HP healed per round */
  value: number;
  /** Condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Ephemeral Effect ────────────────────────────────

export interface EphemeralEffectEntry {
  /** Target roll selector */
  selector: string;
  /** Effect name (extracted from UUID) */
  effectName: string;
  /** Condition predicate */
  condition?: string;
  /** Source item name */
  source: string;
}

// ─── Result Types ────────────────────────────────────

export interface ResolvedEquipmentEffects {
  /** Typed bonuses (item, circumstance, status) ready for resolveStacking */
  bonuses: Bonus[];
  /** Damage resistances granted by equipment */
  resistances: DamageResistance[];
  /** Damage immunities granted by equipment */
  immunities: ImmunityType[];
  /** Damage weaknesses granted by equipment */
  weaknesses: DamageWeakness[];
  /** Speed grants: e.g. { swim: 20, fly: 40 } */
  speeds: Record<string, number>;
  /** Senses granted: e.g. ['darkvision', 'greater-darkvision'] */
  senses: string[];
  /** Lowest DEX cap from all equipped items (undefined = no cap) */
  dexCap: number | undefined;
  /** Additional bulk capacity (encumbered/max threshold increase) */
  bulkCapacity: number;
  /** Additional language slots granted */
  languages: number;
  /** Dying recovery DC modifier (negative = easier recovery) */
  dyingRecovery: number;
  /** Extra rage temporary HP (Instinct Crown) */
  rageTempHP: number;
  /** Passive temporary HP from equipment (e.g. Belt of Long Life) */
  tempHP: number;
  /** Granted strikes from equipment (e.g. Berserker's Cloak jaws/claws) */
  strikes: GrantedStrike[];
  /** Degree-of-success adjustments (e.g. Armbands of the Gorgon) */
  degreeAdjustments: DegreeAdjustment[];
  /** Substitute-roll effects (e.g. Fortune's Coin) */
  substituteRolls: SubstituteRollEffect[];
  /** Modifier adjustments (e.g. compass removes no-compass penalty) */
  modifierAdjustments: ModifierAdjustment[];
  /** Aura effects (e.g. Standard of the Primeval Howl) */
  auras: AuraEffect[];
  /** Roll notes (reminder text on specific roll outcomes) */
  notes: NoteEffect[];
  /** Extra damage dice from equipment */
  damageDice: DamageDiceEffect[];
  /** Damage type/dice alterations */
  damageAlterations: DamageAlterationEffect[];
  /** Strike property adjustments (materials, traits) */
  strikeAdjustments: AdjustStrikeEffect[];
  /** Conditions granted by equipment (e.g. Clumsy, Drained) */
  grantedConditions: GrantedCondition[];
  /** Roll-twice (fortune/misfortune) effects */
  rollTwice: RollTwiceEffect[];
  /** Fast healing (HP per round) */
  fastHealing: FastHealingEffect[];
  /** Ephemeral/temporary effects triggered by equipment */
  ephemeralEffects: EphemeralEffectEntry[];
}

// ─── Selector → applyTo Mapping ──────────────────────

/**
 * Expand a Foundry-style target selector into the applyTo values
 * used by our bonus stacking system.
 *
 * 'saving-throw' expands to three separate bonuses (fortitude, reflex, will)
 * 'skill-check' expands to all skill names
 * Others map 1:1
 */
function expandTarget(target: string): string[] {
  if (target === 'saving-throw') {
    return ['fortitude', 'reflex', 'will'];
  }
  if (target === 'skill-check') {
    return [
      'acrobatics', 'arcana', 'athletics', 'crafting', 'deception',
      'diplomacy', 'intimidation', 'medicine', 'nature', 'occultism',
      'performance', 'religion', 'society', 'stealth', 'survival', 'thievery',
    ];
  }
  return [target];
}

// ─── Core Resolver ───────────────────────────────────

/**
 * Resolve all equipment effects from a list of equipped item IDs.
 * Items are looked up from WORN_ITEMS catalog.
 */
export function resolveEquipmentEffects(
  equippedItemIds: string[]
): ResolvedEquipmentEffects {
  const result: ResolvedEquipmentEffects = {
    bonuses: [],
    resistances: [],
    immunities: [],
    weaknesses: [],
    speeds: {},
    senses: [],
    dexCap: undefined,
    bulkCapacity: 0,
    languages: 0,
    dyingRecovery: 0,
    rageTempHP: 0,
    tempHP: 0,
    strikes: [],
    degreeAdjustments: [],
    substituteRolls: [],
    modifierAdjustments: [],
    auras: [],
    notes: [],
    damageDice: [],
    damageAlterations: [],
    strikeAdjustments: [],
    grantedConditions: [],
    rollTwice: [],
    fastHealing: [],
    ephemeralEffects: [],
  };

  if (!equippedItemIds || equippedItemIds.length === 0) return result;

  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;

    for (const eff of item.effects) {
      switch (eff.type) {
        case 'bonus': {
          const targets = expandTarget(eff.target);
          for (const t of targets) {
            const bonus: Bonus = {
              type: eff.bonusType,
              value: eff.value,
              source: item.name,
              applyTo: t,
            };
            if (eff.condition) bonus.condition = eff.condition;
            result.bonuses.push(bonus);
          }
          break;
        }

        case 'resistance': {
          result.resistances.push({
            type: eff.damageType as DamageType,
            value: eff.value,
            source: item.name,
          });
          break;
        }

        case 'speed': {
          // Keep highest speed for each movement type
          const current = result.speeds[eff.speedType] ?? 0;
          if (eff.value > current) {
            result.speeds[eff.speedType] = eff.value;
          }
          break;
        }

        case 'sense': {
          if (!result.senses.includes(eff.sense)) {
            result.senses.push(eff.sense);
          }
          break;
        }

        case 'immunity': {
          const immType = eff.immunityType as ImmunityType;
          if (!result.immunities.includes(immType)) {
            result.immunities.push(immType);
          }
          break;
        }

        case 'weakness': {
          result.weaknesses.push({
            type: eff.damageType as DamageType,
            value: eff.value,
          });
          break;
        }

        case 'dexCap': {
          // Use the lowest DEX cap if multiple items impose one
          if (result.dexCap === undefined || eff.value < result.dexCap) {
            result.dexCap = eff.value;
          }
          break;
        }

        case 'bulkCapacity': {
          result.bulkCapacity += eff.value;
          break;
        }

        case 'languages': {
          result.languages += eff.value;
          break;
        }

        case 'dyingRecovery': {
          result.dyingRecovery += eff.value;
          break;
        }

        case 'rageTempHP': {
          // Use highest rage temp HP if multiple items
          if (eff.value > result.rageTempHP) {
            result.rageTempHP = eff.value;
          }
          break;
        }

        case 'tempHP': {
          // Use highest temp HP if multiple items
          if (eff.value > result.tempHP) {
            result.tempHP = eff.value;
          }
          break;
        }

        case 'strike': {
          result.strikes.push({
            name: eff.name,
            category: eff.category,
            damageType: eff.damageType,
            damageDie: eff.damageDie,
            traits: eff.traits,
            source: item.name,
          });
          break;
        }

        case 'adjustDegree': {
          result.degreeAdjustments.push({
            selector: eff.selector,
            adjustment: eff.adjustment,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'substituteRoll': {
          result.substituteRolls.push({
            selector: eff.selector,
            value: eff.value,
            label: eff.label,
            source: item.name,
          });
          break;
        }

        case 'adjustModifier': {
          // For 'remove' mode modifiers like no-compass/no-crowbar,
          // expand the selector to individual targets
          const modTargets = expandTarget(eff.selector);
          for (const mt of modTargets) {
            result.modifierAdjustments.push({
              selector: mt,
              slug: eff.slug,
              mode: eff.mode,
              value: eff.value,
              condition: eff.condition,
              source: item.name,
            });
          }
          break;
        }

        case 'aura': {
          result.auras.push({
            radius: eff.radius,
            effects: eff.effects,
            source: item.name,
          });
          break;
        }

        case 'note': {
          result.notes.push({
            selector: eff.selector,
            text: eff.text,
            outcome: eff.outcome,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'damageDice': {
          result.damageDice.push({
            selector: eff.selector,
            diceNumber: eff.diceNumber,
            dieSize: eff.dieSize,
            damageType: eff.damageType,
            critical: eff.critical,
            category: eff.category,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'damageAlteration': {
          result.damageAlterations.push({
            mode: eff.mode,
            property: eff.property,
            value: eff.value,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'adjustStrike': {
          result.strikeAdjustments.push({
            property: eff.property,
            value: eff.value,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'grantCondition': {
          result.grantedConditions.push({
            conditionSlug: eff.conditionSlug,
            value: eff.value,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'rollTwice': {
          result.rollTwice.push({
            selector: eff.selector,
            keep: eff.keep,
            source: item.name,
          });
          break;
        }

        case 'fastHealing': {
          result.fastHealing.push({
            value: eff.value,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }

        case 'ephemeralEffect': {
          result.ephemeralEffects.push({
            selector: eff.selector,
            effectName: eff.effectName,
            condition: eff.condition,
            source: item.name,
          });
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Get equipment bonuses that apply to a specific check/target.
 * This is a convenience method for use in gatherModifiers.
 *
 * @param equippedItemIds - IDs of equipped worn/held items
 * @param applyTo - The check/DC this is for (e.g., 'ac', 'perception', 'fortitude')
 * @returns Bonus[] filtered to only those that apply to the given target
 */
export function getEquipmentBonusesFor(
  equippedItemIds: string[],
  applyTo: string
): Bonus[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const bonuses: Bonus[] = [];

  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;

    for (const eff of item.effects) {
      if (eff.type !== 'bonus') continue;

      const targets = expandTarget(eff.target);
      if (targets.includes(applyTo)) {
        const bonus: Bonus = {
          type: eff.bonusType,
          value: eff.value,
          source: item.name,
          applyTo,
        };
        if (eff.condition) bonus.condition = eff.condition;
        bonuses.push(bonus);
      }
    }
  }

  return bonuses;
}

/**
 * Get the lowest DEX cap imposed by equipped items.
 * Returns undefined if no item imposes a DEX cap.
 */
export function getEquipmentDexCap(equippedItemIds: string[]): number | undefined {
  if (!equippedItemIds || equippedItemIds.length === 0) return undefined;

  let cap: number | undefined;
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type === 'dexCap') {
        if (cap === undefined || eff.value < cap) cap = eff.value;
      }
    }
  }
  return cap;
}

/**
 * Get damage resistances granted by equipped items.
 * Resistances of the same type use the highest value (per PF2e rules).
 */
export function getEquipmentResistances(equippedItemIds: string[]): DamageResistance[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const resistMap = new Map<string, DamageResistance>();
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type !== 'resistance') continue;
      const existing = resistMap.get(eff.damageType);
      if (!existing || eff.value > existing.value) {
        resistMap.set(eff.damageType, {
          type: eff.damageType as DamageType,
          value: eff.value,
          source: item.name,
        });
      }
    }
  }
  return Array.from(resistMap.values());
}

/**
 * Get granted strikes from equipped items.
 * These represent additional attacks granted by magic items (e.g., Berserker's Cloak jaws/claws).
 */
export function getEquipmentGrantedStrikes(equippedItemIds: string[]): GrantedStrike[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const strikes: GrantedStrike[] = [];
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type === 'strike') {
        strikes.push({
          name: eff.name,
          category: eff.category,
          damageType: eff.damageType,
          damageDie: eff.damageDie,
          traits: eff.traits,
          source: item.name,
        });
      }
    }
  }
  return strikes;
}

/**
 * Get degree-of-success adjustments from equipped items.
 * Returns adjustments that apply to the given selector ('saving-throw', 'skill-check', 'attack-roll').
 * Each adjustment encodes the from→to mapping (e.g., 'success:one-degree-better').
 */
export function getEquipmentDegreeAdjustments(
  equippedItemIds: string[],
  selector: string
): DegreeAdjustment[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const adjustments: DegreeAdjustment[] = [];
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type !== 'adjustDegree') continue;
      // Match selector: 'saving-throw' matches 'saving-throw', 'skill-check' matches 'skill-check'
      if (eff.selector === selector) {
        adjustments.push({
          selector: eff.selector,
          adjustment: eff.adjustment,
          condition: eff.condition,
          source: item.name,
        });
      }
    }
  }
  return adjustments;
}

/**
 * Get modifier adjustments from equipped items that apply to the given target.
 * These can remove, override, upgrade, or downgrade specific named modifiers.
 * Used in gatherModifiers to adjust existing penalties/bonuses by slug.
 */
export function getEquipmentModifierAdjustments(
  equippedItemIds: string[],
  applyTo: string
): ModifierAdjustment[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const adjustments: ModifierAdjustment[] = [];
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type !== 'adjustModifier') continue;
      const targets = expandTarget(eff.selector);
      if (targets.includes(applyTo)) {
        adjustments.push({
          selector: applyTo,
          slug: eff.slug,
          mode: eff.mode,
          value: eff.value,
          condition: eff.condition,
          source: item.name,
        });
      }
    }
  }
  return adjustments;
}

/**
 * Get damage immunities granted by equipped items.
 */
export function getEquipmentImmunities(equippedItemIds: string[]): ImmunityType[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const immunities: ImmunityType[] = [];
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type === 'immunity') {
        const immType = eff.immunityType as ImmunityType;
        if (!immunities.includes(immType)) {
          immunities.push(immType);
        }
      }
    }
  }
  return immunities;
}

/**
 * Get damage weaknesses granted by equipped items.
 */
export function getEquipmentWeaknesses(equippedItemIds: string[]): DamageWeakness[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const weaknesses: DamageWeakness[] = [];
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type === 'weakness') {
        weaknesses.push({
          type: eff.damageType as DamageType,
          value: eff.value,
        });
      }
    }
  }
  return weaknesses;
}

/**
 * Get aura effects from equipped items.
 */
export function getEquipmentAuras(equippedItemIds: string[]): AuraEffect[] {
  if (!equippedItemIds || equippedItemIds.length === 0) return [];

  const auras: AuraEffect[] = [];
  for (const itemId of equippedItemIds) {
    const item = WORN_ITEMS[itemId];
    if (!item?.effects) continue;
    for (const eff of item.effects) {
      if (eff.type === 'aura') {
        auras.push({
          radius: eff.radius,
          effects: eff.effects,
          source: item.name,
        });
      }
    }
  }
  return auras;
}