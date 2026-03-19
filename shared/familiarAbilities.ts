// ═══════════════════════════════════════════════════════════════════════════════
// familiarAbilities.ts — PF2e Familiar & Master Abilities Catalog (Remaster)
// Familiars choose abilities daily (2 base, 4 with Enhanced, 6 with Incredible).
// Split into Familiar Abilities (on the familiar) and Master Abilities (on you).
// ═══════════════════════════════════════════════════════════════════════════════

import { FamiliarAbility } from './types';

export const FAMILIAR_ABILITY_CATALOG: FamiliarAbility[] = [
  // ═══════════════════════════════════════════════════════════════
  //  FAMILIAR ABILITIES (abilities that affect the familiar itself)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'amphibious',
    name: 'Amphibious',
    type: 'familiar',
    description: 'The familiar gains a swim speed of 25 feet and can breathe both air and water.',
    mechanics: 'Gain swim speed 25 ft. Breathe air and water.',
    unique: true,
  },
  {
    id: 'burrower',
    name: 'Burrower',
    type: 'familiar',
    description: 'The familiar gains a burrow speed of 5 feet, allowing it to dig small tunnels.',
    mechanics: 'Gain burrow speed 5 ft.',
    unique: true,
  },
  {
    id: 'climber',
    name: 'Climber',
    type: 'familiar',
    description: 'The familiar gains a climb speed of 25 feet.',
    mechanics: 'Gain climb speed 25 ft.',
    unique: true,
  },
  {
    id: 'damage-avoidance',
    name: 'Damage Avoidance',
    type: 'familiar',
    description: 'Choose one save type (Fortitude, Reflex, or Will); the familiar takes no damage on a success on that save (instead of half).',
    mechanics: 'Choose 1 save type: success → no damage (normal: half).',
  },
  {
    id: 'darkvision',
    name: 'Darkvision',
    type: 'familiar',
    description: 'The familiar gains darkvision.',
    mechanics: 'Gain darkvision.',
    unique: true,
  },
  {
    id: 'fast-movement',
    name: 'Fast Movement',
    type: 'familiar',
    description: 'The familiar\'s land speed increases by 10 feet.',
    mechanics: 'Land speed +10 ft.',
  },
  {
    id: 'flier',
    name: 'Flier',
    type: 'familiar',
    description: 'The familiar gains a fly speed of 25 feet.',
    mechanics: 'Gain fly speed 25 ft.',
    unique: true,
  },
  {
    id: 'independent',
    name: 'Independent',
    type: 'familiar',
    description: 'In an encounter, if you don\'t Command your familiar, it still gains 1 action each round. It can only use this action to Stride or Step.',
    mechanics: 'Without Command: gains 1 action/round (Stride or Step only).',
    unique: true,
  },
  {
    id: 'kinspeech',
    name: 'Kinspeech',
    type: 'familiar',
    description: 'The familiar can understand and speak with animals of the same species. This lets it use Diplomacy (at your modifier) to Make a Request of such creatures.',
    mechanics: 'Speak with same-species animals. Use master\'s Diplomacy.',
    unique: true,
  },
  {
    id: 'lab-assistant',
    name: 'Lab Assistant',
    type: 'familiar',
    description: 'The familiar can use your Quick Alchemy action to create an item with your infused reagents. Uses 2 of the familiar\'s actions.',
    mechanics: '2 actions: perform Quick Alchemy using master\'s infused reagents.',
    prerequisite: 'Quick Alchemy class feature',
    unique: true,
  },
  {
    id: 'manual-dexterity',
    name: 'Manual Dexterity',
    type: 'familiar',
    description: 'The familiar can use up to two of its limbs as hands, allowing it to perform manipulation actions.',
    mechanics: 'Can use 2 limbs as hands for manipulate actions.',
    unique: true,
  },
  {
    id: 'partner-in-crime',
    name: 'Partner in Crime',
    type: 'familiar',
    description: 'The familiar is your criminal associate. It auto-succeeds at the Aid action on Deception, Stealth, and Thievery checks (auto-crit if you\'re at least master).',
    mechanics: 'Auto-succeed Aid on Deception, Stealth, Thievery. Auto-crit if master rank.',
    unique: true,
  },
  {
    id: 'plant-form',
    name: 'Plant Form',
    type: 'familiar',
    description: 'Your familiar\'s body becomes plant material. It gains immunity to bleed, death effects, disease, drowning, fatigued, healing, nonlethal attacks, paralyzed, poison, and sickened.',
    mechanics: 'Plant type. Immune to many conditions (bleed, death effects, disease, etc.).',
    unique: true,
  },
  {
    id: 'resistance',
    name: 'Resistance',
    type: 'familiar',
    description: 'Choose two damage types from: acid, cold, electricity, fire, poison, sonic. The familiar gains resistance equal to half your level (min 1).',
    mechanics: 'Choose 2 damage types: resist = floor(level/2), min 1.',
  },
  {
    id: 'scent',
    name: 'Scent',
    type: 'familiar',
    description: 'The familiar gains scent (imprecise) with a range of 30 feet.',
    mechanics: 'Gain scent (imprecise) 30 ft.',
    unique: true,
  },
  {
    id: 'speech',
    name: 'Speech',
    type: 'familiar',
    description: 'The familiar understands one language you know and can speak that language. It can speak only to you and other familiars that have the Speech ability.',
    mechanics: 'Speak 1 language you know. Can talk to you and other Speech familiars.',
    unique: true,
  },
  {
    id: 'tough',
    name: 'Tough',
    type: 'familiar',
    description: 'The familiar gains additional HP equal to your level.',
    mechanics: 'HP + your level.',
    unique: true,
  },
  {
    id: 'touch-telepathy',
    name: 'Touch Telepathy',
    type: 'familiar',
    description: 'The familiar gains telepathy with a range of touch. It can telepathically communicate with you as long as it\'s within 100 feet.',
    mechanics: 'Touch telepathy + 100 ft range to master.',
    unique: true,
  },

  // ═══════════════════════════════════════════════════════════════
  //  MASTER ABILITIES (abilities that benefit the master/owner)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'cantrip-connection',
    name: 'Cantrip Connection',
    type: 'master',
    description: 'You can prepare an additional cantrip, or if you\'re a spontaneous caster, add one additional cantrip to your repertoire.',
    mechanics: '+1 cantrip (prepared: extra prepared, spontaneous: extra repertoire).',
    prerequisite: 'Can cast cantrips',
    unique: true,
  },
  {
    id: 'extra-reagents',
    name: 'Extra Reagents',
    type: 'master',
    description: 'Your familiar grows extra alchemical components on its body. You gain additional infused reagents equal to your level.',
    mechanics: '+level infused reagents per day.',
    prerequisite: 'infused reagents class feature',
    unique: true,
  },
  {
    id: 'familiar-focus',
    name: 'Familiar Focus',
    type: 'master',
    description: 'Once per day, your familiar can use 2 actions with the concentrate trait to restore 1 Focus Point, up to your usual maximum.',
    mechanics: 'Once/day: familiar uses 2 actions (concentrate) → restore 1 Focus Point.',
    unique: true,
  },
  {
    id: 'lifelink',
    name: 'Lifelink',
    type: 'master',
    description: 'If your familiar would be reduced to 0 HP by damage, as a reaction with the concentrate trait, you can take the damage instead. If you do, you take all the damage, and if you are reduced to 0 HP, your familiar is also reduced to 0 HP.',
    mechanics: 'Reaction: take familiar\'s lethal damage onto yourself instead.',
    unique: true,
  },
  {
    id: 'spell-battery',
    name: 'Spell Battery',
    type: 'master',
    description: 'You gain one additional spell slot each day that\'s at least 3 ranks lower than the highest-rank spell you can cast.',
    mechanics: '+1 spell slot (3+ ranks below max).',
    prerequisite: 'Able to cast 4th-rank spells',
    unique: true,
  },
  {
    id: 'spell-delivery',
    name: 'Spell Delivery',
    type: 'master',
    description: 'If your familiar is adjacent to the target, you can cast a touch spell through the familiar as if the familiar were you.',
    mechanics: 'Cast touch spells through adjacent familiar (uses familiar\'s position).',
    unique: true,
  },
  {
    id: 'spellcasting',
    name: 'Spellcasting',
    type: 'master',
    description: 'Choose a spell in your repertoire or that you\'ve prepared of a rank at least 5 lower than your highest rank spell. The familiar can Cast that Spell once per day, using your spell attack modifier and spell DC.',
    mechanics: 'Familiar casts 1 spell/day (5+ ranks below max), uses master\'s stats.',
    prerequisite: 'Able to cast 6th-rank spells',
    unique: true,
  },
  {
    id: 'share-senses',
    name: 'Share Senses',
    type: 'master',
    description: 'You can use an action with the concentrate trait to project your senses into your familiar, using its perception and any special senses it has while within 1 mile of it.',
    mechanics: '1 action (concentrate): see/hear through familiar within 1 mile.',
    unique: true,
  },
];

/**
 * Look up a familiar ability by ID
 */
export function getFamiliarAbility(abilityId: string): FamiliarAbility | undefined {
  return FAMILIAR_ABILITY_CATALOG.find(a => a.id === abilityId);
}

/**
 * Get all familiar abilities (abilities that go on the familiar)
 */
export function getFamiliarAbilities(): FamiliarAbility[] {
  return FAMILIAR_ABILITY_CATALOG.filter(a => a.type === 'familiar');
}

/**
 * Get all master abilities (abilities that benefit the master)
 */
export function getMasterAbilities(): FamiliarAbility[] {
  return FAMILIAR_ABILITY_CATALOG.filter(a => a.type === 'master');
}

/**
 * Get all abilities available for daily selection
 */
export function getAllFamiliarAbilities(): FamiliarAbility[] {
  return FAMILIAR_ABILITY_CATALOG;
}
