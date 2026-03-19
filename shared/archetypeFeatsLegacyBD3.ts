import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// LEGACY ARCHETYPE FEATS — Book of the Dead (Part 3)
// Reanimator, Soul Warden, Undead Master
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// REANIMATOR  (Book of the Dead pg. 34–35)
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=109
// ──────────────────────────────────────────────────────────

export const REANIMATOR_FEATS: FeatEntry[] = [
  {
    id: 'reanimator-dedication',
    name: 'Reanimator Dedication',
    source: 'Reanimator (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You have dedicated your studies to the art of raising and commanding undead. If you\'re a prepared spellcaster with animate dead in your spell list, you can change animate dead\'s spell level freely when you prepare it (traits change to match). If spontaneous with animate dead in your repertoire, you can swap animate dead for a different spell each morning and can make it your signature spell. When you cast animate dead, you gain a +1 status bonus to the counteract check if you target humanoid remains or a creature whose level is lower than the spell level.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Able to cast animate dead with a spell slot'],
    mechanics: 'Prepared: freely change animate dead spell level. Spontaneous: swap/signature spell. +1 status to counteract check vs humanoid remains or lower-level creatures.',
  },
  {
    id: 'reanimator-deathly-secrets',
    name: 'Deathly Secrets',
    source: 'Reanimator (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You learn the eyes of the dead or subjugate undead focus spell (your choice). If you don\'t already have one, you gain a focus pool of 1 Focus Point, which you can Refocus by performing a 10-minute ritual to mentally command undead. You can select this feat more than once, choosing a different focus spell each time.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Reanimator Dedication'],
    mechanics: 'Learn eyes of the dead OR subjugate undead focus spell. Gain focus pool (1 FP) if none. Refocus: 10-min commanding undead. Repeatable.',
  },
  {
    id: 'reanimator-macabre-virtuoso',
    name: 'Macabre Virtuoso',
    source: 'Reanimator (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You have delved deeply into the dread arts of necromancy and can create undead through ritual. You learn the create undead rituals to create two types of common undead for which you meet the prerequisites. You can perform these rituals in 4 hours instead of 1 day and gain a +2 circumstance bonus to your primary and secondary checks. Repeatable: each time learn 2 more types.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 'passive',
    prerequisites: ['Reanimator Dedication', 'Expert in Arcana, Occultism, or Religion'],
    mechanics: 'Uncommon. Learn create undead rituals for 2 common undead types. Rituals take 4 hrs (not 1 day). +2 circ to primary/secondary checks. Repeatable.',
  },
  {
    id: 'reanimator-bonds-of-death',
    name: 'Bonds of Death',
    source: 'Reanimator (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'The ties between you and your undead creations allow you to maintain them more easily. You can Sustain both of your animate dead spells as a single action. You still need to spend actions individually to command the undead created by those spells.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'free',
    prerequisites: ['Reanimator Dedication'],
    mechanics: 'Free action. Frequency: 1/day. Requirement: you cast animate dead this turn. Sustain both animate dead spells with 1 action.',
  },
  {
    id: 'reanimator-greater-deathly-secrets',
    name: 'Greater Deathly Secrets',
    source: 'Reanimator (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You\'ve unlocked deeper reserves of necromantic potential. You learn the malignant sustenance or grasping grave focus spell (your choice). Your focus pool increases by 1 Focus Point. Repeatable: choose a different focus spell each time.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Deathly Secrets'],
    mechanics: 'Learn malignant sustenance OR grasping grave focus spell. +1 Focus Point. Repeatable.',
  },
  {
    id: 'reanimator-master-of-the-dead',
    name: 'Master of the Dead',
    source: 'Reanimator (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'You have reached the pinnacle of reanimation. You learn the shambling horror focus spell. Your focus pool increases by 1 Focus Point.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 'passive',
    prerequisites: ['Deathly Secrets'],
    mechanics: 'Uncommon. Learn shambling horror focus spell. +1 Focus Point.',
  },
];

// ──────────────────────────────────────────────────────────
// SOUL WARDEN  (Book of the Dead pg. 26–27)
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=110
// ──────────────────────────────────────────────────────────

export const SOUL_WARDEN_FEATS: FeatEntry[] = [
  {
    id: 'soul-warden-dedication',
    name: 'Soul Warden Dedication',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You can take the burden of souls upon yourself to protect the living and the dead. You gain a spiral sigil, a unique symbol emblazoned on your clothing or branded on your flesh. Your spiral sigil glows faintly when undead or a soul that isn\'t at rest is within 100 feet of you. You can cast disrupt undead as a divine innate cantrip. As normal, it is automatically heightened to half your level rounded up.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Occultism or Religion', 'Worships Pharasma or a psychopomp usher'],
    mechanics: 'Spiral sigil: glows when undead/unrestful soul within 100 ft. Innate divine cantrip: disrupt undead (auto-heightened).',
  },
  {
    id: 'soul-warden-cycle-spell',
    name: 'Cycle Spell',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'The connection between your spiral sigil and the spiritual world has deepened. Choose bless, disrupting weapons, or heal. While your spiral sigil is glowing, you can cast the chosen spell once per day as a divine innate spell.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Soul Warden Dedication'],
    mechanics: 'Choose bless/disrupting weapons/heal. Cast 1/day as divine innate while sigil glows.',
    subChoices: { label: 'Choose cycle spell', options: [
      { id: 'bless', name: 'Bless' },
      { id: 'disrupting-weapons', name: 'Disrupting Weapons' },
      { id: 'heal', name: 'Heal' },
    ] },
  },
  {
    id: 'soul-warden-psychopomp-familiar',
    name: 'Psychopomp Familiar',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your familiar becomes a masked psychopomp — a soul guide. It gains the monitor and psychopomp traits. It must always have the speech familiar ability and gains three familiar abilities per day rather than two. It also gains the Soul Sight and Spirit Touch psychopomp abilities.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Soul Warden Dedication', 'Familiar'],
    mechanics: 'Familiar gains monitor/psychopomp traits. 3 abilities/day (must include speech). Gains Soul Sight + Spirit Touch.',
  },
  {
    id: 'soul-warden-liberate-soul',
    name: 'Liberate Soul',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You attempt to purge a target within 30 feet of an effect that imprisons its soul, such as bind soul or a ghost\'s malevolent possession. Attempt a counteract check against the effect. Your counteract level is half your level rounded up, and your counteract modifier is your Religion or Occultism modifier (whichever higher) or spell DC – 10.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Divine', 'Necromancy'],
    actionCost: 2,
    prerequisites: ['Soul Warden Dedication'],
    mechanics: '2 actions. Frequency: 1/hour. Requirement: sigil glowing. Counteract soul-imprisonment within 30 ft. Level = half level round up. Modifier = Religion/Occultism or spell DC–10.',
  },
  {
    id: 'soul-warden-spiral-sworn',
    name: 'Spiral Sworn',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You swear to destroy an undead creature or a creature that has imprisoned a soul, calling upon the power of your spiral sigil. You gain a status bonus to damage against the target equal to the number of weapon damage dice for Strikes or to the spell level for spells. This benefit lasts for 1 minute.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Divine', 'Evocation'],
    actionCost: 1,
    prerequisites: ['Soul Warden Dedication'],
    mechanics: '1 action. Frequency: 1/10 min. Status bonus to damage vs target = weapon dice count (Strikes) or spell level (spells). 1 min duration.',
  },
  {
    id: 'soul-warden-enhanced-psychopomp-familiar',
    name: 'Enhanced Psychopomp Familiar',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your psychopomp familiar grows stronger. It gains four familiar abilities per day rather than three, and at least two of those must be psychopomp abilities. It also gains the Augury psychopomp ability: your familiar can cast augury once per day as a divine innate spell.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Psychopomp Familiar'],
    mechanics: '4 abilities/day (≥2 psychopomp). Gains Augury ability: cast augury 1/day divine innate.',
  },
  {
    id: 'soul-warden-safeguard-soul',
    name: 'Safeguard Soul',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You\'ve gained innate spiritual protection against death and undeath. You gain a +2 status bonus to saving throws against death effects, possession effects, and effects that manipulate or steal souls. You can\'t be transformed into an undead by any means. Allies within the light of your spiral sigil gain the same benefits.',
    implemented: 'full',
    traits: ['Abjuration', 'Archetype', 'Divine'],
    actionCost: 'passive',
    prerequisites: ['Soul Warden Dedication'],
    mechanics: '+2 status to saves vs death, possession, soul-manipulation effects. Immune to undead transformation. Allies in sigil light gain same.',
  },
  {
    id: 'soul-warden-expand-spiral',
    name: 'Expand Spiral',
    source: 'Soul Warden (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You can share the benefits of Spiral Sworn with others. When you use Spiral Sworn, you can spend 2 actions instead of 1 to grant the benefits of Spiral Sworn to all allies who are within the light of your spiral sigil.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spiral Sworn'],
    mechanics: 'Spiral Sworn can cost 2 actions to grant benefits to all allies in sigil light.',
  },
];

// ──────────────────────────────────────────────────────────
// UNDEAD MASTER  (Book of the Dead pg. 41)
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=111
// ──────────────────────────────────────────────────────────

export const UNDEAD_MASTER_FEATS: FeatEntry[] = [
  {
    id: 'undead-master-dedication',
    name: 'Undead Master Dedication',
    source: 'Undead Master (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You gain an undead companion. Unlike normal for companions, you can have more than one undead companion at a time, though only one can be active at any given time. You gain the Call Companion action to swap your active companion.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Evil alignment'],
    mechanics: 'Uncommon. Gain undead companion. Can have multiple (1 active). Call Companion action to swap.',
  },
  {
    id: 'undead-master-guardian-ghosts',
    name: 'Guardian Ghosts',
    source: 'Undead Master (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You pull upon the spirit of your undead companion to shield you from harm. Reduce the damage you take by 2 + your level, and your companion loses that many Hit Points.',
    implemented: 'full',
    traits: ['Archetype', 'Divine', 'Necromancy'],
    actionCost: 'reaction',
    prerequisites: ['Undead Master Dedication'],
    mechanics: 'Reaction. Frequency: 1/10 min. Trigger: take damage from Strike while companion adjacent. Reduce damage by 2+level; companion loses that HP.',
  },
  {
    id: 'undead-master-their-masters-call',
    name: 'Their Master\'s Call',
    source: 'Undead Master (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'You pull a fragment of an inactive undead companion to your side, manifesting it for a brief instant to gain its support benefit. The companion doesn\'t fully manifest and can\'t be targeted or take damage.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Divine', 'Necromancy'],
    actionCost: 1,
    prerequisites: ['Undead Master Dedication', 'Call Companion', 'You have an inactive undead companion whose remains are in your possession'],
    mechanics: '1 action. Manifest inactive companion briefly for its support benefit only. Can\'t be targeted or damaged.',
  },
];

// ══════════════════════════════════════════════════════════
// Combined catalog for barrel import
// ══════════════════════════════════════════════════════════

export const STANDALONE_ARCHETYPE_FEATS_LEGACY_BD3: FeatEntry[] = [
  ...REANIMATOR_FEATS,
  ...SOUL_WARDEN_FEATS,
  ...UNDEAD_MASTER_FEATS,
];
