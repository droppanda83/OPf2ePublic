import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// NON-CORE ARCHETYPE FEATS — C (cont.) through E
// Curse Maelstrom, Elementalist
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// CURSE MAELSTROM  (Dark Archives Remastered pg. 168)
// Category: Mystical / Core — Rare
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=347
// ──────────────────────────────────────────────────────────

export const CURSE_MAELSTROM_FEATS: FeatEntry[] = [
  {
    id: 'curse-maelstrom-dedication',
    name: 'Curse Maelstrom Dedication',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'A horrible curse has left a lingering stain on your soul. During an encounter, when you succeed at a check, the GM can offer to have you roll again, taking the second result (misfortune). If you do, you enter a curse maelstrom state. Alternatively, if a foe places a misfortune effect on you that applies, or you fail a save against a foe\'s curse, you enter the state. While in the state: you can\'t benefit from fortune effects; all other creatures within a 10-foot emanation take a -1 status penalty to saves and skill checks; and you gain the Expel Maelstrom action.',
    implemented: 'full',
    traits: ['Rare', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['You are cursed or have previously been cursed'],
    mechanics:
      'Curse maelstrom state: no fortune effects, 10-ft emanation -1 status penalty (saves + skills) on others, grants Expel Maelstrom [1-action] (curse, occult). Expel: target within 60 ft, Will save → crit success: unaffected; success: -1 status (saves + skills) 1 min; failure: -2 status 10 min; crit failure: as failure + misfortune on next save/skill check. State ends when expelled or at end of encounter. 1 min cooldown. DC = higher of class DC or spell DC. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'curse-maelstrom-familiar-oddities',
    name: 'Familiar Oddities',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'Perhaps due to the curse within you, curses occasionally perceive you as an extension of themselves and readily reveal themselves to you. You gain a +2 circumstance bonus to checks to Identify Magic on a cursed item or a spell that has the curse trait.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Curse Maelstrom Dedication', 'Trained in Occultism or Curse Lore'],
    mechanics: '+2 circumstance bonus to Identify Magic on cursed items or curse-trait spells.',
  },
  {
    id: 'curse-maelstrom-unnerving-expansion',
    name: 'Unnerving Expansion',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You gather your curse around you and impel it to pour outward, expanding your maelstrom. The radius of the emanation of your curse maelstrom state increases by 5 feet until the end of your curse maelstrom state. The outpouring of the curse is unnerving. You attempt to Demoralize a creature within the emanation; you don\'t take penalties for not sharing a language with that creature.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Curse Maelstrom Dedication'],
    mechanics:
      'Req: In curse maelstrom state. Expand emanation by +5 ft + Demoralize a creature within emanation (no language penalty).',
  },
  {
    id: 'curse-maelstrom-share-burden',
    name: 'Share Burden',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You draw the misfortune or curse into yourself, potentially enabling you to enter your curse maelstrom state. Instead of affecting your ally, the triggering curse or misfortune effect affects you.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Curse Maelstrom Dedication'],
    mechanics:
      'Trigger: An ally within 60 ft would be affected by a curse or misfortune effect, and you are an eligible target. Redirect effect to yourself → can trigger maelstrom state entry.',
  },
  {
    id: 'curse-maelstrom-accursed-magic',
    name: 'Accursed Magic',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'When the curse within you spills out, you can lay curses on others. You can cast claim curse. At 10th level, you can also cast seal fate, and at 12th level, you can also cast inevitable disaster. You can cast these spells once per day as occult innate spells, but only while within your curse maelstrom state.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Curse Maelstrom Dedication'],
    mechanics:
      'Occult innate spells (1/day each, only in maelstrom state): claim curse (8th), seal fate (10th), inevitable disaster (12th). If no occult casting, uses Wisdom; become trained in spell attack modifier and spell DC.',
  },
  {
    id: 'curse-maelstrom-counter-curse',
    name: 'Counter Curse',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You gather the energy of your maelstrom and fling its unleashed power into the enemy\'s curse, attempting to neutralize it. Attempt a counteract check against the triggering effect, using half your level rounded up as your counteract rank and the higher of your class DC - 10 or spell DC - 10 as the counteract modifier. On a success, you neutralize the curse or misfortune effect. Whether you succeed or fail, your curse maelstrom state ends.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Curse Maelstrom Dedication'],
    mechanics:
      'Trigger: You or ally within 30 ft targeted by/in emanation of a curse or misfortune effect from a foe. Req: In maelstrom state. Counteract check (rank = ceil(level/2), modifier = max(class DC - 10, spell DC - 10)). Success: neutralize effect. Constant effects return at start of creature\'s next turn. Maelstrom state ends regardless.',
  },
  {
    id: 'curse-maelstrom-torrential-backlash',
    name: 'Torrential Backlash',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'Calling upon forbidden practices, you release the curse from within yourself, allowing it free rein to destroy everything around you. All creatures within your curse maelstrom emanation except you take 1d6 void damage for each level you have, with a basic Fortitude save, using the higher of your class DC or spell DC. Your curse maelstrom state then ends.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Curse Maelstrom Dedication'],
    mechanics:
      'Req: In curse maelstrom state. All creatures in maelstrom emanation take [level]d6 void damage, basic Fortitude save (higher of class DC/spell DC). Maelstrom state ends.',
  },
  {
    id: 'curse-maelstrom-reverse-curse',
    name: 'Reverse Curse',
    source: 'Curse Maelstrom (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'When you counter a curse or misfortune effect, you send it back to destroy its originator. Whenever you succeed at the counteract check to Counter Curse, the creature is affected by its own curse or misfortune effect, attempting a saving throw against its own DC if the effect allows a saving throw.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Counter Curse'],
    mechanics:
      'Upgrades Counter Curse. On successful counteract, originator is affected by their own curse/misfortune (saves vs their own DC). Constant abilities return at start of their next turn.',
  },
];

// ──────────────────────────────────────────────────────────
// ELEMENTALIST  (Rage of Elements pg. 58)
// Category: Mystical / Class / Core — Class Archetype
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=254
// ──────────────────────────────────────────────────────────

export const ELEMENTALIST_FEATS: FeatEntry[] = [
  {
    id: 'elementalist-dedication',
    name: 'Elementalist Dedication',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'Each day when you make your daily preparations, you can attune yourself to one element of your choice from your elemental philosophy. You gain resistance equal to half your level (minimum 1) against damage dealt by effects with your attuned elemental trait. This attunement lasts until you next make your daily preparations.',
    implemented: 'full',
    traits: ['Archetype', 'Class', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Elemental magic (spellcasting from arcane or primal spell list)'],
    mechanics:
      'Daily elemental attunement → resistance = half level (min 1) to attuned element. Class archetype: uses class feat slots. Dedication-lock enforced by validateDedicationTaking().',
    subChoices: { label: 'Choose element to attune', options: [
      { id: 'air', name: 'Air', description: 'Resistance to air damage' },
      { id: 'earth', name: 'Earth', description: 'Resistance to earth damage' },
      { id: 'fire', name: 'Fire', description: 'Resistance to fire damage' },
      { id: 'metal', name: 'Metal', description: 'Resistance to metal damage' },
      { id: 'water', name: 'Water', description: 'Resistance to water damage' },
      { id: 'wood', name: 'Wood', description: 'Resistance to wood damage' },
    ] },
  },
  {
    id: 'elementalist-dousing-spell',
    name: 'Dousing Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You enhance your spell with elemental water, soaking the target. If the next action you use is to Cast a Spell targeting a single creature, you soak the target. If the target has persistent acid or fire damage, the DC to end those conditions is reduced to 10, and the creature can attempt a flat check to end those types of persistent damage immediately. The spell gains the water trait.',
    implemented: 'full',
    traits: ['Archetype', 'Spellshape', 'Water'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Water is in your elemental philosophy'],
    mechanics:
      'Spellshape: next single-target spell soaks target. Persistent acid/fire DC reduced to 10 + immediate flat check. Spell gains water trait.',
  },
  {
    id: 'elementalist-elemental-familiar',
    name: 'Elemental Familiar',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'Your familiar becomes an elemental spirit. It gains one additional familiar ability each day from the elemental list: Air (invisible when still 1 round), Earth (resistance to physical except adamantine = half level), Fire (bright light 20 ft, negates severe cold in 15-ft emanation), Metal (resistance to physical from metal weapons = half level), Water (move through 2-inch gaps), Wood (fast healing = half level in bright light).',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Elementalist Dedication', 'Familiar'],
    mechanics:
      '+1 daily familiar ability from elemental list. Familiar becomes elemental spirit. Only 1 elemental ability at a time.',
  },
  {
    id: 'elementalist-burning-spell',
    name: 'Burning Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You enhance your spell with elemental fire, causing it to set the target on fire. If the next action you use is to Cast a non-cantrip Spell that deals damage at a single target, the spell deals additional persistent fire damage equal to the spell rank. The spell gains the fire trait.',
    implemented: 'full',
    traits: ['Archetype', 'Fire', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Fire is in your elemental philosophy'],
    mechanics:
      'Spellshape: next non-cantrip single-target damage spell deals additional persistent fire damage = spell rank. Spell gains fire trait.',
  },
  {
    id: 'elementalist-current-spell',
    name: 'Current Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'As you use your magic to manipulate air or water, you divert some of its currents to form a barrier around you. If your next action is to Cast a Spell with the air or water trait, until the start of your next turn, you gain a +1 circumstance bonus to AC or a +2 circumstance bonus against ranged attacks. You also gain a +1 circumstance bonus to saves against effects with the air or water trait.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Air or water is in your elemental philosophy'],
    mechanics:
      'Spellshape: next air/water spell grants +1 circ AC (+2 vs ranged) and +1 circ saves vs air/water until start of next turn.',
  },
  {
    id: 'elementalist-expanded-elemental-magic',
    name: 'Expanded Elemental Magic',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You reach new understandings of the elements, taking an expansive view. Add to your elemental philosophy any of the following elements it doesn\'t already include: air, earth, fire, metal, water, and wood.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Elementalist Dedication'],
    mechanics:
      'Expand your elemental philosophy to include any/all of the six elements. Opens element-locked feats and spells.',
  },
  {
    id: 'elementalist-metabolize-element',
    name: 'Metabolize Element',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You rapidly metabolize the elemental particles in your opponent\'s spell to gain a boost of energy. You gain the quickened condition until the end of your next turn. You can use the extra action only to Step or Stride.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Elementalist Dedication'],
    mechanics:
      'Trigger: You take damage from a foe\'s spell or magical ability with an elemental trait from your philosophy. Quickened until end of next turn (Step or Stride only).',
  },
  {
    id: 'elementalist-water-step',
    name: 'Water Step',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You can Stride across liquid and surfaces that normally wouldn\'t support your weight. This benefit lasts only during your movement. If you end your movement on a surface that can\'t support you, you fall in or it collapses as normal.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Elementalist Dedication', 'Water is in your elemental philosophy'],
    mechanics: 'Walk on water/unstable surfaces during movement. Must end on solid ground or fall.',
  },
  {
    id: 'elementalist-growth-spell',
    name: 'Growth Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You enhance your spell with elemental wood, causing your magic to expand and grow beyond its original limitations. If the next action you use is to Cast a non-cantrip Spell that affects an area, expand the area: bursts +5 ft radius, cones +10 ft, lines +15 ft. The spell gains the wood trait.',
    implemented: 'full',
    traits: ['Archetype', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Wood is in your elemental philosophy'],
    mechanics:
      'Spellshape: next non-cantrip area spell: burst +5 ft, cone +10 ft, line +15 ft. Adds wood trait.',
  },
  {
    id: 'elementalist-reverberating-spell',
    name: 'Reverberating Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'Your spell disorients your targets with a metallic clangor. If the next action you use is to Cast a non-cantrip Spell that deals damage in an area, the spell deals an additional 1d8 sonic damage and all creatures who fail their save are deafened for 1 round. Creatures who critically fail are deafened for 1 minute. The spell gains the sonic trait.',
    implemented: 'full',
    traits: ['Archetype', 'Metal', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Metal is in your elemental philosophy'],
    mechanics:
      'Spellshape: next non-cantrip area damage spell deals +1d8 sonic. Fail → deafened 1 round; crit fail → deafened 1 minute. Adds sonic trait.',
  },
  {
    id: 'elementalist-rockslide-spell',
    name: 'Rockslide Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You enhance your spell with elemental earth. If the next action you use is to Cast a non-cantrip Spell that affects an area, a number of 5-foot squares in the area equal to the spell rank become difficult terrain for 1 round. These squares must be on the ground and contiguous. The spell gains the earth trait.',
    implemented: 'full',
    traits: ['Archetype', 'Earth', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Earth is in your elemental philosophy'],
    mechanics:
      'Spellshape: next non-cantrip area spell creates (spell rank) contiguous 5-ft difficult terrain squares on ground for 1 round. Adds earth trait.',
  },
  {
    id: 'elementalist-redirect-elements',
    name: 'Redirect Elements',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You seize the elemental essence of an incoming spell and redirect it to a creature of your choice within the spell\'s area. The attacker rerolls the spell\'s attack roll against the new target.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Elementalist Dedication'],
    mechanics:
      'Trigger: A foe\'s spell attack with an elemental trait from your philosophy targeting you fails or crit fails. Redirect to another creature in range; attacker rerolls attack vs new target.',
  },
  {
    id: 'elementalist-wind-tossed-spell',
    name: 'Wind-Tossed Spell',
    source: 'Elementalist (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You enhance your spell with elemental air, using the wind to find your target and carry your magic around cover. If the next action you use is to Cast a Spell that requires a spell attack roll, you ignore the target\'s concealed condition and any cover they have from you. The spell gains the air trait.',
    implemented: 'full',
    traits: ['Air', 'Archetype', 'Concentrate', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Elementalist Dedication', 'Air is in your elemental philosophy'],
    mechanics:
      'Spellshape: next spell attack ignores target\'s concealed condition and all cover. Adds air trait.',
  },
];

// ══════════════════════════════════════════════════════════
// CATALOG — Non-Core Archetype Feats C–E
// ══════════════════════════════════════════════════════════

export const STANDALONE_ARCHETYPE_FEATS_NON_CORE_CE: FeatEntry[] = [
  ...CURSE_MAELSTROM_FEATS,
  ...ELEMENTALIST_FEATS,
];
