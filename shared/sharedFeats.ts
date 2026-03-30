/**
 * Shared Class Feature Templates
 * 
 * Many class features (like Weapon Specialization, Evasion, etc.) are shared
 * across multiple classes but granted at different levels. This file defines
 * reusable templates so each class file can instantiate them without duplicating
 * the description and mechanical data.
 * 
 * Usage:
 *   import { createClassFeature, WEAPON_SPECIALIZATION } from './sharedFeats';
 *   const ws = createClassFeature(WEAPON_SPECIALIZATION, 'Fighter', 7, { idOverride: 'weapon-specialization' });
 */

import type { FeatEntry, FeatCategory, ImplementationStatus } from './featTypes';

// ──────────────────────────────────────────────────────────
// TEMPLATE INTERFACE
// ──────────────────────────────────────────────────────────

/**
 * A reusable definition for class features that appear across multiple classes.
 * Does NOT include `source`, `level`, or `id` — those are set per-class.
 */
export interface SharedFeatTemplate {
  /** Base display name (e.g., 'Weapon Specialization') */
  baseName: string;
  /** Suffix for auto-generated IDs (e.g., 'weapon-specialization' → 'rogue-weapon-specialization') */
  idSuffix: string;
  /** Category — almost always 'class_feature' */
  category: FeatCategory;
  /** Description of the feat's effect */
  description: string;
  /** Implementation status */
  implemented: ImplementationStatus;
  /** Action cost */
  actionCost?: number | 'reaction' | 'free' | 'passive';
  /** Prerequisites, if any */
  prerequisites?: string[];
}

// ──────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ──────────────────────────────────────────────────────────

/**
 * Creates a class-specific FeatEntry from a shared template.
 * 
 * By default the ID is `{class-lowercase}-{idSuffix}` (e.g., 'rogue-weapon-specialization').
 * Use `idOverride` to set a custom ID (e.g., the Fighter version uses 'weapon-specialization'
 * without a prefix for backward compatibility).
 * 
 * @param template - The shared feat template
 * @param source - The class name (e.g., 'Fighter', 'Rogue')
 * @param level - The level at which this class gains the feature
 * @param options - Optional overrides for id, description, name, traits, implemented status
 */
export function createClassFeature(
  template: SharedFeatTemplate,
  source: string,
  level: number,
  options?: {
    idOverride?: string;
    nameOverride?: string;
    descriptionOverride?: string;
    traits?: string[];
    implementedOverride?: ImplementationStatus;
  }
): FeatEntry {
  const classPrefix = source.toLowerCase();
  return {
    id: options?.idOverride ?? `${classPrefix}-${template.idSuffix}`,
    name: options?.nameOverride ?? template.baseName,
    source,
    category: template.category,
    level,
    description: options?.descriptionOverride ?? template.description,
    implemented: options?.implementedOverride ?? template.implemented,
    traits: options?.traits ?? [source],
    actionCost: template.actionCost ?? 'passive',
    ...(template.prerequisites ? { prerequisites: template.prerequisites } : {}),
  };
}

// ──────────────────────────────────────────────────────────
// SHARED TEMPLATES
// ──────────────────────────────────────────────────────────

/** Weapon Specialization — most martial and caster classes gain this.
 *  Fighter L7, Rogue L7, Psychic L13, Magus L7, etc. */
export const WEAPON_SPECIALIZATION: SharedFeatTemplate = {
  baseName: 'Weapon Specialization',
  idSuffix: 'weapon-specialization',
  category: 'class_feature',
  description: 'Deal additional damage with weapons you are expert or better with. +2 at expert, +3 at master, +4 at legendary.',
  implemented: 'full',
  actionCost: 'passive',
};

/** Greater Weapon Specialization — high-level damage upgrade.
 *  Fighter L15, Rogue L15, etc. */
export const GREATER_WEAPON_SPECIALIZATION: SharedFeatTemplate = {
  baseName: 'Greater Weapon Specialization',
  idSuffix: 'greater-weapon-specialization',
  category: 'class_feature',
  description: 'The damage from Weapon Specialization increases to +4 at expert, +6 at master, and +8 at legendary.',
  implemented: 'full',
  actionCost: 'passive',
};

/** Evasion — Reflex save upgrade. Success → Critical Success.
 *  Rogue L7, Monk L7, Ranger L11, etc. */
export const EVASION: SharedFeatTemplate = {
  baseName: 'Evasion',
  idSuffix: 'evasion',
  category: 'class_feature',
  description: 'When you roll a success on a Reflex save, you get a critical success instead.',
  implemented: 'full',
  actionCost: 'passive',
};

/** Improved Evasion — enhanced Reflex resilience.
 *  Rogue L13, Monk L15, etc. */
export const IMPROVED_EVASION: SharedFeatTemplate = {
  baseName: 'Improved Evasion',
  idSuffix: 'improved-evasion',
  category: 'class_feature',
  description: 'Your evasion is even more effective. When you roll a failure on a Reflex save, you get a success instead. When you roll a critical failure, you get a failure instead.',
  implemented: 'full',
  actionCost: 'passive',
};

/** Resolve — Will save upgrade. Success → Critical Success.
 *  Fighter (as "Iron Will"), Champion, Cleric, etc. */
export const RESOLVE: SharedFeatTemplate = {
  baseName: 'Resolve',
  idSuffix: 'resolve',
  category: 'class_feature',
  description: 'When you roll a success on a Will save, you get a critical success instead.',
  implemented: 'full',
  actionCost: 'passive',
};

/** Juggernaut — Fortitude save upgrade. Success → Critical Success.
 *  Fighter, Barbarian, Champion, etc. */
export const JUGGERNAUT: SharedFeatTemplate = {
  baseName: 'Juggernaut',
  idSuffix: 'juggernaut',
  category: 'class_feature',
  description: 'When you roll a success on a Fortitude save, you get a critical success instead.',
  implemented: 'full',
  actionCost: 'passive',
};

/** Alertness — Perception upgrade to expert or master.
 *  Many classes gain this at various levels. */
export const ALERTNESS: SharedFeatTemplate = {
  baseName: 'Alertness',
  idSuffix: 'alertness',
  category: 'class_feature',
  description: 'Your proficiency rank for Perception increases to expert (or master if already expert).',
  implemented: 'full',
  actionCost: 'passive',
};

/** Shield Block — reduce damage when shield is raised.
 *  Fighter L1 (class feature), Champion L1, also a General feat. */
export const SHIELD_BLOCK: SharedFeatTemplate = {
  baseName: 'Shield Block',
  idSuffix: 'shield-block',
  category: 'class_feature',
  description: 'When you have your shield raised and take damage, you can use your reaction to reduce the damage by the shield\'s hardness.',
  implemented: 'full',
  actionCost: 'reaction',
};
