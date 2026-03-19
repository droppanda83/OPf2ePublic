import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// LEGACY ARCHETYPE FEATS — Secrets of Magic & Grand Bazaar (Part 2)
// Shadowcaster, Soulforger, Wellspring Mage
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// SHADOWCASTER  (Secrets of Magic pg. 226)
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=101
// ──────────────────────────────────────────────────────────

export const SHADOWCASTER_FEATS: FeatEntry[] = [
  {
    id: 'shadowcaster-dedication',
    name: 'Shadowcaster Dedication',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You\'ve sacrificed a piece of your spirit, allowing shadow powers into your being. You can no longer cast spells with the light trait. You gain the cloak of shadow focus spell (1 Focus Point). Refocus by meditating to siphon power from the Shadow Plane. Domain spells match your pre-existing tradition.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Ability to cast spells'],
    mechanics: 'Uncommon. Lose light-trait spells. Gain cloak of shadow focus spell. 1 FP, Refocus via shadow meditation. Same tradition as existing spells.',
  },
  {
    id: 'shadowcaster-shadow-spells',
    name: 'Shadow Spells',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Hidden darkness teaches you secrets beyond other spellcasters. Add replicate, shadow army, shadow blast, shadow projectile, shadow raid, shadow siphon, and shadow walk to your spell list, even if not normally on your tradition\'s list.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Shadowcaster Dedication'],
    mechanics: 'Add 7 shadow spells to spell list regardless of tradition.',
  },
  {
    id: 'shadowcaster-disciple-of-shade',
    name: 'Disciple of Shade',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You\'ve delved deeper into shadow mysteries. You gain the inscrutable mask domain spell. Increase Focus Points in your pool by 1.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Shadowcaster Dedication'],
    mechanics: 'Gain inscrutable mask focus spell. +1 Focus Point.',
  },
  {
    id: 'shadowcaster-shadow-spell',
    name: 'Shadow Spell',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You attach shadow to a spell to cloud senses. If your next action is to cast a shadow-trait spell, choose one affected creature: it gains either +2 status to Stealth or –2 status penalty to Perception (your choice) for 1 round. Enemies need successful attack/failed save to be affected. Ends if used again.',
    implemented: 'full',
    traits: ['Archetype', 'Metamagic', 'Shadow'],
    actionCost: 1,
    prerequisites: ['Shadowcaster Dedication'],
    mechanics: '1 action metamagic. Next shadow-trait spell: 1 target gets +2 Stealth or –2 Perception (1 round). Enemies: needs hit/failed save.',
  },
  {
    id: 'shadowcaster-shadow-reservoir',
    name: 'Shadow Reservoir',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'Your shadow contains a spell of each level at least 2 levels below your highest. These don\'t need to be prepared/in repertoire. Cast spontaneously using a spell slot of the same level. Spells gain shadow trait; targets use higher of AC/Will DC for attacks, or Will/normal save. Failure generates shadowstuff tattoos.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ability to cast spells from spell slots', 'Shadowcaster Dedication'],
    mechanics: 'Shadow reservoir: 1 spell per level (≥2 below highest). Cast from slot. Shadow-trait: use higher of AC/Will DC or Will/normal save.',
  },
  {
    id: 'shadowcaster-secrets-of-shadow',
    name: 'Secrets of Shadow',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your shadow reservoir gains an additional spell 1 level below your highest (in addition to existing spells at all levels below that). You also gain negative resistance equal to highest spell level you can cast from slots (positive resistance if you have negative healing).',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Shadow Reservoir'],
    mechanics: '+1 reservoir spell at (highest–1) level. Resistance negative (or positive) = highest spell level.',
  },
  {
    id: 'shadowcaster-unending-emptiness',
    name: 'Unending Emptiness',
    source: 'Shadowcaster (Archetype)',
    category: 'archetype',
    level: 14,
    description: 'You pool the power of shadow within your eyes, gathering darkness into a turbulent orb of crushing emptiness. You gain the darklight domain spell. Increase Focus Points by 1.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Focus pool', 'Shadowcaster Dedication'],
    mechanics: 'Gain darklight focus spell. +1 Focus Point.',
  },
];

// ──────────────────────────────────────────────────────────
// SOULFORGER  (Secrets of Magic pg. 236)
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=102
// ──────────────────────────────────────────────────────────

export const SOULFORGER_FEATS: FeatEntry[] = [
  {
    id: 'soulforger-dedication',
    name: 'Soulforger Dedication',
    source: 'Soulforger (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You manifest the power of your spirit in combat. You manifest an armor, shield, or weapon as a soulforged armament and choose one essence power. Manifest Soulforged Armament [one-action] (concentrate, conjuration, divine, extradimensional): immediately wield/wear the armament. Once per day, manifest its essence form (gaining essence power for 1 minute, then auto-Dismissed). Changing essence power requires 1 week retraining.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Wisdom 14, or ability to cast divine spells'],
    mechanics: 'Uncommon. Choose armor/shield/weapon + essence power. Manifest [1-action]. Essence form 1/day (1 min). Retrain: 1 week.',
    subChoices: { label: 'Choose soul implement', options: [
      { id: 'armor', name: 'Armor', description: 'Soul armor with essence power' },
      { id: 'shield', name: 'Shield', description: 'Soul shield with essence power' },
      { id: 'weapon', name: 'Weapon', description: 'Soul weapon with essence power' },
    ] },
  },
  {
    id: 'soulforger-soul-flare',
    name: 'Soul Flare',
    source: 'Soulforger (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You strive to change outcomes with sheer zeal. Gain +1 status to attack (if you missed) or AC (if you were hit). If this changes the outcome, attempt DC 5 flat check; failure dismisses the armament.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate'],
    actionCost: 'reaction',
    prerequisites: ['Soulforger Dedication'],
    mechanics: 'Reaction. Trigger: attack missed or was hit while armament manifested. +1 status to attack/AC. If outcome changes: DC 5 flat or armament Dismissed.',
  },
  {
    id: 'soulforger-rapid-manifestation',
    name: 'Rapid Manifestation',
    source: 'Soulforger (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your unwavering soul brings up your defenses as soon as you\'re in danger. You Manifest your Soulforged Armament as a free action when you roll initiative or a hazard attacks you.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'free',
    prerequisites: ['Soulforger Dedication'],
    mechanics: 'Free action. Trigger: roll initiative or hazard attacks. Manifest Soulforged Armament.',
  },
  {
    id: 'soulforger-soul-arsenal',
    name: 'Soul Arsenal',
    source: 'Soulforger (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Choose an additional soulforged armament of a different type and an essence power. When manifesting, summon any/all armaments (meeting Requirements). Dismiss individually. Each can essence form 1/day separately. At stage 2 soulforged corruption, take all armament flaws. Selectable again at 12th for the final type.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Soulforger Dedication'],
    mechanics: 'Additional armament (different type) + essence power. Manifest/Dismiss individually. Repeatable at 12th.',
  },
];

// ──────────────────────────────────────────────────────────
// WELLSPRING MAGE  (Secrets of Magic pg. 248–249)
// Class archetype
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=135
// ──────────────────────────────────────────────────────────

export const WELLSPRING_MAGE_FEATS: FeatEntry[] = [
  {
    id: 'wellspring-mage-dedication',
    name: 'Wellspring Mage Dedication',
    source: 'Wellspring Mage (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'There\'s no longer a limit on how many temporary spell slots you can gain per day from wellspring magic.',
    implemented: 'full',
    traits: ['Rare', 'Archetype', 'Class', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Wellspring magic class feature'],
    mechanics: 'Rare. Class archetype. Unlimited temporary spell slots/day from wellspring magic.',
  },
  {
    id: 'wellspring-mage-control',
    name: 'Wellspring Control',
    source: 'Wellspring Mage (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'When you generate a wellspring surge, roll twice on the Wellspring Surges Table and take the result of your choice. Doesn\'t apply when you cause another creature to generate a surge.',
    implemented: 'full',
    traits: ['Archetype', 'Fortune'],
    actionCost: 'passive',
    prerequisites: ['Wellspring Mage Dedication'],
    mechanics: 'Wellspring surge: roll twice, choose. Not when forcing surges on others.',
  },
  {
    id: 'wellspring-mage-urgent-upwelling',
    name: 'Urgent Upwelling',
    source: 'Wellspring Mage (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Defeat lets you tap into your wellspring. Attempt the flat check for wellspring magic. On critical success, you can forgo the temporary slot to instead force the triggering enemy to undergo a wellspring surge.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Wellspring Mage Dedication'],
    mechanics: 'Reaction. Frequency: 1/10 min. Trigger: enemy reduces you to 0 HP, crits you, or you crit-fail save vs enemy. Attempt wellspring flat check. Crit success: redirect surge to enemy.',
  },
  {
    id: 'wellspring-mage-interfering-surge',
    name: 'Interfering Surge',
    source: 'Wellspring Mage (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'You overcharge a triggering spell. Expend a spell slot and attempt to counteract. No penalty if spell is in your repertoire at appropriate level; –2 penalty if same tradition but different spell; –5 if different tradition. Successful counteract: wellspring surge from enemy caster. Failed: wellspring surge from you.',
    implemented: 'full',
    traits: ['Abjuration', 'Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Wellspring Mage Dedication'],
    mechanics: 'Reaction. Trigger: creature you can see casts spell. Requirement: unexpended slot. Expend slot to counteract. Penalties: 0 (known), –2 (same tradition), –5 (different). Success: enemy surge. Fail: your surge.',
  },
];

// ══════════════════════════════════════════════════════════
// Combined catalog for barrel import
// ══════════════════════════════════════════════════════════

export const STANDALONE_ARCHETYPE_FEATS_LEGACY_SM2: FeatEntry[] = [
  ...SHADOWCASTER_FEATS,
  ...SOULFORGER_FEATS,
  ...WELLSPRING_MAGE_FEATS,
];
