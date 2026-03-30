/**
 * Druid Class Features & Feats — PF2e Remastered (Player Core)
 * Source: https://2e.aonprd.com/Classes.aspx?ID=34
 *
 * Key Attribute: WIS | HP: 8 + CON
 * Perception: Trained → Expert (L3, Perception Expertise)
 * Fort: Trained → Expert (L3, Fortitude Expertise)
 * Reflex: Trained → Expert (L5, Reflex Expertise)
 * Will: Expert → Master (L11, Wild Willpower, success→crit)
 * Weapons: Trained simple+unarmed → Expert (L11, Weapon Expertise)
 * Armor: Trained light+medium+unarmored → Expert (L13, Medium Armor Expertise)
 * Spellcasting: Trained → Expert (L7) → Master (L15) → Legendary (L19)
 * Class DC: Trained
 * Skills: Nature + 1 order skill + 2 additional (+ INT mod)
 *
 * Druidic Orders (Player Core):
 *   Animal  — Athletics, Animal Companion feat, Heal Animal order spell
 *   Leaf    — Diplomacy, Leshy Familiar feat, Cornucopia order spell
 *   Storm   — Acrobatics, Storm Born feat, Tempest Surge order spell
 *   Untamed — Intimidation, Untamed Form feat, Untamed Shift order spell
 * Druidic Orders (Secrets of Magic):
 *   Flame   — flame order spells
 *   Stone   — stone order spells
 *   Wave    — wave order spells
 *
 * Class features: 17 (L1–L19)
 * Class feats: 82 (63 Player Core + 10 SoM + 5 HotW + 4 DA)
 */

import type { FeatEntry } from './featTypes';
import {
  createClassFeature,
  WEAPON_SPECIALIZATION,
  SHIELD_BLOCK,
} from './sharedFeats';

// ════════════════════════════════════════════════════════════════
// DRUID CLASS FEATURES (Automatically Granted)
// ════════════════════════════════════════════════════════════════

export const DRUID_CLASS_FEATURES: FeatEntry[] = [
  // ── Level 1 Features ──
  {
    id: 'druid-primal-spellcasting',
    name: 'Primal Spellcasting',
    source: 'Druid',
    category: 'class_feature',
    level: 1,
    description:
      'The power of the wild world flows through you. You can cast primal spells using the Cast a Spell activity, and you can supply material, somatic, and verbal components when casting spells. At 1st level, you can prepare two 1st-rank spells and five cantrips each morning from the common spells on the primal spell list. Prepared spells remain available until you cast them or until you prepare your spells again. The number of spells you can prepare is called your spell slots. As you increase in level as a druid, your number of spell slots and the highest rank of spells you can cast increase. Your spellcasting attribute is Wisdom.',
    implemented: 'full',
    traits: ['Druid', 'Primal'],
    actionCost: 'passive',
  },
  {
    id: 'druid-anathema',
    name: 'Anathema',
    source: 'Druid',
    category: 'class_feature',
    level: 1,
    description:
      'As stewards of the natural order, druids find affronts to nature anathema. Despoiling natural places, consuming more natural resources than needed to live comfortably, and teaching Wildsong to non-druids are all anathema to all druids. Your druidic order also adds further anathema. If you perform enough acts that are anathema to nature, you lose your magical abilities that come from the druid class, including your primal spellcasting and the benefits of your order.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-druidic-order',
    name: 'Druidic Order',
    source: 'Druid',
    category: 'class_feature',
    level: 1,
    description:
      'You align yourself with a druidic order, which grants you a class feat, an order spell (a focus spell costing 1 Focus Point), and an additional trained skill. Orders: Animal (Athletics, Animal Companion, Heal Animal), Leaf (Diplomacy, Leshy Familiar, Cornucopia), Storm (Acrobatics, Storm Born, Tempest Surge), Untamed (Intimidation, Untamed Form, Untamed Shift). SoM orders: Flame, Stone, Wave.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    subChoices: { label: 'Choose a druidic order', options: [
      { id: 'animal', name: 'Animal', description: 'Athletics, Animal Companion, Heal Animal focus spell' },
      { id: 'flame', name: 'Flame', description: 'Nature, fire spells, Fire Ray focus spell' },
      { id: 'leaf', name: 'Leaf', description: 'Diplomacy, Leshy Familiar, Cornucopia focus spell' },
      { id: 'stone', name: 'Stone', description: 'Athletics, earth magic, Hurtling Stone focus spell' },
      { id: 'storm', name: 'Storm', description: 'Acrobatics, Storm Born, Tempest Surge focus spell' },
      { id: 'wave', name: 'Wave', description: 'Athletics, water magic, Rising Surf focus spell' },
      { id: 'wild', name: 'Wild', description: 'Intimidation, Wild Shape, Wild Morph focus spell' },
      { id: 'untamed', name: 'Untamed', description: 'Intimidation, Untamed Form, Untamed Shift focus spell' },
    ] },
  },
  createClassFeature(SHIELD_BLOCK, 'Druid', 1),
  {
    id: 'druid-voice-of-nature',
    name: 'Voice of Nature',
    source: 'Druid',
    category: 'class_feature',
    level: 1,
    description:
      'You gain your choice of the Animal Empathy or Plant Empathy druid feat.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-wildsong',
    name: 'Wildsong',
    source: 'Druid',
    category: 'class_feature',
    level: 1,
    description:
      'You know the Wildsong, a secret language known only within druid orders, in addition to any languages you know through your ancestry. Teaching the Wildsong to non-druids is anathema.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ── Level 3 Features ──
  {
    id: 'druid-perception-expertise',
    name: 'Perception Expertise',
    source: 'Druid',
    category: 'class_feature',
    level: 3,
    description:
      'You remain alert to threats around you. Your proficiency rank for Perception increases to expert.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-fortitude-expertise',
    name: 'Fortitude Expertise',
    source: 'Druid',
    category: 'class_feature',
    level: 3,
    description:
      'Adventures have made your physique more hardy. Your proficiency rank for Fortitude saves increases to expert.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ── Level 5 Features ──
  {
    id: 'druid-reflex-expertise',
    name: 'Reflex Expertise',
    source: 'Druid',
    category: 'class_feature',
    level: 5,
    description:
      'You\'ve honed your ability to dodge dangers. Your proficiency rank for Reflex saves increases to expert.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ── Level 7 Features ──
  {
    id: 'druid-expert-spellcaster',
    name: 'Expert Spellcaster',
    source: 'Druid',
    category: 'class_feature',
    level: 7,
    description:
      'Your command of primal forces has deepened, empowering your spells. Your proficiency ranks for primal spell attack modifier and primal spell DC increase to expert.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ── Level 11 Features ──
  {
    id: 'druid-weapon-expertise',
    name: 'Weapon Expertise',
    source: 'Druid',
    category: 'class_feature',
    level: 11,
    description:
      'You\'ve improved your combat skill. Your proficiency rank for simple weapons and unarmed attacks increases to expert.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-wild-willpower',
    name: 'Wild Willpower',
    source: 'Druid',
    category: 'class_feature',
    level: 11,
    description:
      'Your primal will, like that of the greatest beast, can\'t be tamed. Your proficiency rank for Will saves increases to master. When you roll a success at a Will save, you get a critical success instead.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ── Level 13 Features ──
  {
    id: 'druid-medium-armor-expertise',
    name: 'Medium Armor Expertise',
    source: 'Druid',
    category: 'class_feature',
    level: 13,
    description:
      'You\'ve learned to defend yourself better against attacks. Your proficiency ranks for light armor, medium armor, and unarmored defense increase to expert.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  createClassFeature(WEAPON_SPECIALIZATION, 'Druid', 13),

  // ── Level 15 Features ──
  {
    id: 'druid-master-spellcaster',
    name: 'Master Spellcaster',
    source: 'Druid',
    category: 'class_feature',
    level: 15,
    description:
      'Primal magic answers your command. Your proficiency ranks for primal spell attack modifier and primal spell DC increase to master.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ── Level 19 Features ──
  {
    id: 'druid-legendary-spellcaster',
    name: 'Legendary Spellcaster',
    source: 'Druid',
    category: 'class_feature',
    level: 19,
    description:
      'You have developed an unparalleled rapport with the magic of nature. Your proficiency ranks for primal spell attack modifier and primal spell DC increase to legendary.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-primal-hierophant',
    name: 'Primal Hierophant',
    source: 'Druid',
    category: 'class_feature',
    level: 19,
    description:
      'You command the most potent forces of primal magic and can cast a spell of truly incredible power. You gain a single 10th-rank spell slot and can prepare a spell in that slot using druid spellcasting.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
];

// ════════════════════════════════════════════════════════════════
// DRUID CLASS FEATS (Selectable)
// Reference: https://2e.aonprd.com/Feats.aspx?Traits=52
// ════════════════════════════════════════════════════════════════

export const DRUID_CLASS_FEATS: FeatEntry[] = [
  // ══════════════════════════════════════
  // ── Level 1 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-animal-companion',
    name: 'Animal Companion',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You gain the service of a young animal companion that travels with you on your adventures and obeys any simple commands you give it to the best of its abilities. See Animal Companions for more information.',
    implemented: 'full',
    traits: ['Druid', 'Ranger'],
    actionCost: 'passive',
    prerequisites: ['animal order'],
  },
  {
    id: 'druid-animal-empathy',
    name: 'Animal Empathy',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You have a connection to the creatures of the natural world that allows you to communicate with them on a rudimentary level. You can ask questions of, receive answers from, and use the Diplomacy skill with animals. In most cases, wild animals will give you time to make your case.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-leshy-familiar',
    name: 'Leshy Familiar',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You call a minor spirit of nature into a plant body, creating a leshy companion to aid you in your spellcasting. You gain a familiar, which has your choice of either the plant or fungus familiar ability; this doesn\'t count against your usual limit of familiar abilities (typically 2). The spirit you call has a more tenuous connection to its plant body than fully independent leshies, so it is Tiny in size like other familiars.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order'],
  },
  {
    id: 'druid-plant-empathy',
    name: 'Plant Empathy',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You have a connection to flora that allows you to communicate with them on a rudimentary level. You can ask questions of, receive answers from, and use the Diplomacy skill with plants and fungus.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-reach-spell',
    name: 'Reach Spell',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You can extend your spells\' range. If the next action you use is to Cast a Spell that has a range, increase that spell\'s range by 30 feet. As is standard for increasing spell ranges, if the spell normally has a range of touch, you extend its range to 30 feet.',
    implemented: 'full',
    traits: ['Bard', 'Cleric', 'Concentrate', 'Druid', 'Oracle', 'Sorcerer', 'Spellshape', 'Witch', 'Wizard'],
    actionCost: 1,
  },
  {
    id: 'druid-storm-born',
    name: 'Storm Born',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You are at home out in the elements, reveling in the power of nature unleashed. You do not take circumstance penalties to ranged spell attacks or Perception checks caused by weather, and your targeted spells don\'t require a flat check to succeed against a target concealed by weather (such as fog).',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['storm order'],
  },
  {
    id: 'druid-untamed-form',
    name: 'Untamed Form',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You are one with the wild, always changing and adapting to meet any challenge. You gain the untamed form order spell, which lets you transform into a variety of shapes that you can expand with druid feats.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['untamed order'],
  },
  {
    id: 'druid-verdant-weapon',
    name: 'Verdant Weapon',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You cultivate a seed that can sprout into a wooden staff, vine whip, or another weapon. You spend 10 minutes focusing primal energy into a seed, imprinting it with the potential of a single level 0 weapon you are trained with and that has no mechanical parts or metal components. When holding the imprinted seed, you can use an Interact action to cause it to immediately grow into that weapon; a second Interact action returns it to seed form. The verdant weapon can be etched with runes or affixed with talismans as normal, which are suppressed when the weapon is in seed form. You can have only one verdant seed at a time. If you prepare a second, your first verdant seed immediately becomes a mundane seed; any runes on the previous seed transfer to the new seed at no cost, but inapplicable runes are suppressed.',
    implemented: 'full',
    traits: ['Druid', 'Exploration'],
    actionCost: 'passive',
  },
  {
    id: 'druid-widen-spell',
    name: 'Widen Spell',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'You manipulate the energy of your spell, causing it to spread out and affect a wider area. If the next action you use is to Cast a Spell that has an area of a burst, cone, or line and does not have a duration, increase the area of that spell. Add 5 feet to the radius of a burst that normally has a radius of at least 10 feet (a burst with a smaller radius is not affected). Add 5 feet to the length of a cone or line that is normally 15 feet long or smaller, and add 10 feet to the length of a larger cone or line.',
    implemented: 'full',
    traits: ['Druid', 'Manipulate', 'Oracle', 'Sorcerer', 'Spellshape', 'Witch', 'Wizard'],
    actionCost: 1,
  },

  // ── Secrets of Magic ──
  {
    id: 'druid-fire-lung',
    name: 'Fire Lung',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'A lifetime of proximity to flames has inured your lungs and eyes to smoke. You can breathe normally in areas of ash and smoke without risk of suffocation, and you ignore the concealed condition from smoke. You need only a successful DC 10 flat check to recover from persistent fire damage, rather than DC 15 (and the DC when receiving particularly effective assistance is 5 instead of 10).',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['flame order'],
  },
  {
    id: 'druid-shore-step',
    name: 'Shore Step',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'The shallows and tide pools have always called to you and let you pass unhindered. You ignore difficult terrain resulting from shallow water. In addition, if you roll a success on an Acrobatics check to Balance on a slippery or wet surface, or on an Athletics check to Swim, you get a critical success instead.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['wave order'],
  },
  {
    id: 'druid-steadying-stone',
    name: 'Steadying Stone',
    source: 'Druid',
    category: 'class',
    level: 1,
    description:
      'The earth has taught you how to remain unyielding and firm. If you roll a success on an Acrobatics check made to Balance on uneven ground composed of earth or rock, you get a critical success instead. As long as you remain on the ground, you gain a +2 circumstance bonus to your Fortitude or Reflex DC against attempts to Shove or Trip you. This bonus also applies to saving throws against spells or effects that would attempt to knock you prone. If you\'re a rock dwarf, this bonus increases to +3.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['stone order'],
  },

  // ══════════════════════════════════════
  // ── Level 2 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-call-of-the-wild',
    name: 'Call of the Wild',
    source: 'Druid',
    category: 'class',
    level: 2,
    description:
      'You call upon the creatures of nature to come to your aid. You can spend 10 minutes in concert with nature to replace a spell you\'ve prepared in one of your druid spell slots with a summon animal or summon plant or fungus spell of the same rank.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-enhanced-familiar',
    name: 'Enhanced Familiar',
    source: 'Druid',
    category: 'class',
    level: 2,
    description:
      'You infuse your familiar with additional primal energy, increasing its abilities. You can select four familiar or master abilities each day, instead of two.',
    implemented: 'full',
    traits: ['Animist', 'Druid', 'Magus', 'Sorcerer', 'Thaumaturge', 'Witch', 'Wizard'],
    actionCost: 'passive',
    prerequisites: ['a familiar'],
  },
  {
    id: 'druid-order-explorer',
    name: 'Order Explorer',
    source: 'Druid',
    category: 'class',
    level: 2,
    description: 'You have learned the secrets of another druidic order, passing the tests that allow you to expand your focus. Choose an order other than your own. You gain the initial order feature for that order.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    subChoices: { label: 'Choose a druid order', options: [
      { id: 'animal', name: 'Animal' },
      { id: 'flame', name: 'Flame' },
      { id: 'leaf', name: 'Leaf' },
      { id: 'stone', name: 'Stone' },
      { id: 'storm', name: 'Storm' },
      { id: 'wave', name: 'Wave' },
      { id: 'wild', name: 'Wild' },
      { id: 'fungus', name: 'Fungus' },
    ] },
  },
  {
    id: 'druid-poison-resistance',
    name: 'Poison Resistance',
    source: 'Druid',
    category: 'class',
    level: 2,
    description:
      'Your affinity for the natural world grants you protection against some of its dangers. You gain poison resistance equal to half your level, and you gain a +1 status bonus to saving throws against poisons.',
    implemented: 'full',
    traits: ['Alchemist', 'Druid'],
    actionCost: 'passive',
  },

  // ══════════════════════════════════════
  // ── Level 4 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-anthropomorphic-shape',
    name: 'Anthropomorphic Shape',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'Humanoids\' supposed place apart from animals is folly—taking on their forms just requires some extra practice. You add the shapes listed in humanoid form to your untamed form list.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-elemental-summons',
    name: 'Elemental Summons',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You can call the elements to you. You can spend 10 minutes in concert with nature to replace a spell you\'ve prepared in one of your druid spell slots with a summon elemental spell of the same rank.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-forest-passage',
    name: 'Forest Passage',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You can always find a path, almost as if foliage parted before you. You ignore any difficult terrain caused by plants and fungi, such as bushes, vines, and undergrowth.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order'],
  },
  {
    id: 'druid-form-control',
    name: 'Form Control',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'With additional care and effort, you can take on an alternate shape for a longer period of time. If your next action is to cast untamed form, the spell\'s rank is 2 lower than normal (minimum 1st rank), but you can remain transformed for up to 1 hour or the listed duration (whichever is longer). You can still Dismiss untamed form as normal.',
    implemented: 'full',
    traits: ['Druid', 'Manipulate', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-leshy-familiar-secrets',
    name: 'Leshy Familiar Secrets',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'The leaf order\'s secrets allow your familiar to take advantage of its leshy form. You can select one additional familiar ability each day, which must be one of the following leshy familiar abilities. You can\'t select more than one ability from this feat at a time. Grasping Tendrils: Your familiar can extend vines or similar tendrils, increasing its reach to 15 feet. Purify Air: Your familiar recycles air, providing enough oxygen for a Medium creature in areas with stale air. Creatures within a 15-foot emanation of the leshy gain a +2 circumstance bonus to their saving throws against inhaled poison effects, olfactory effects, or other effects that rely on breathing. Verdant Burst: When your familiar dies, it releases its primal energy to cast the 3-action version of heal, heightened to a rank 1 lower than your highest-rank spell slot. The heal spell gains a status bonus equal to twice the spell\'s rank to the Hit Points it restores to plants. You must be able to cast 2nd-rank spells using spell slots to select this familiar ability.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order'],
  },
  {
    id: 'druid-mature-animal-companion',
    name: 'Mature Animal Companion',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'Your animal companion has grown up over the course of your adventures, becoming a mature animal companion and gaining additional capabilities. Your animal companion has greater independence. During an encounter, even if you don\'t use the Command an Animal action, your animal companion can still use 1 action that round on your turn to Strike or Stride (or Burrow, Climb, or Swim if it has that Speed). It can do this at any point during your turn, as long as you aren\'t currently taking an action. If it does, that\'s all the actions it gets that round—you can\'t Command it later.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Animal Companion'],
  },
  {
    id: 'druid-order-magic',
    name: 'Order Magic',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You have delved deeper into the teaching of a new order, gaining access to a coveted order spell. Choose an order you have selected with Order Explorer. You gain the initial order spell from that order. Special: You can take this feat multiple times. Each time you do, you must choose a different order you have selected with Order Explorer.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Order Explorer'],
  },
  {
    id: 'druid-snowdrift-spell',
    name: 'Snowdrift Spell',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'The howling wind and precipitation of your magic turn to thick snow. If your next action is to Cast a Spell that has the air, water, or cold trait, and that does not have the fire trait, select one creature affected by the spell on the ground. Each square on the ground under or adjacent to the creature fills with ankle-deep snow. Those squares are difficult terrain until the beginning of your next turn. A creature can Interact to clear a square of snow, and the snow in a square melts if that square is exposed to a fire effect.',
    implemented: 'full',
    traits: ['Cold', 'Druid', 'Manipulate', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['storm order'],
  },

  // ── Secrets of Magic ──
  {
    id: 'druid-fire-resistance',
    name: 'Fire Resistance',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'Your connection to heat and flame means that fire is reluctant to bring its full force to bear against you. You gain fire resistance equal to half your level, and you gain a +1 circumstance bonus to saving throws against fire effects.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['flame order'],
  },
  {
    id: 'druid-natural-swimmer',
    name: 'Natural Swimmer',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'Water flows around you, letting you cut through the waves as if born to it. You gain a swim Speed of 15 feet. If you already have a permanent swim Speed, swimming up or down isn\'t difficult terrain.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['wave order'],
  },
  {
    id: 'druid-sheltering-cave',
    name: 'Sheltering Cave',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You spend 10 minutes communing with spirits of earth and stone, requesting shelter. At the end of this time, the earth rises and opens, forming a small cave or earthen mound 20 feet in diameter and 10 feet high. This cave has the structure trait and the same restrictions as structures created by magic items. The cave has a single entrance and provides shelter from the elements. The cave remains for 12 hours or until you spend 10 minutes coaxing the earth to close.',
    implemented: 'full',
    traits: ['Conjuration', 'Druid', 'Earth', 'Exploration', 'Primal'],
    actionCost: 'passive',
    prerequisites: ['stone order'],
  },

  // ── Howl of the Wild ──
  {
    id: 'druid-brutal-crush',
    name: 'Brutal Crush',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You\'ve learned how to cloud your foes\' minds with the brutal impact of your repeated attacks. Make an unarmed Strike against the same target. If the Strike hits and deals bludgeoning damage, the target is stupefied 2 for 1 round (stupefied 3 on a critical hit).',
    implemented: 'full',
    traits: ['Barbarian', 'Druid', 'Mental'],
    actionCost: 1,
    prerequisites: ['animal instinct or untamed order'],
    mechanics: 'requirements: Your last action dealt bludgeoning damage using an unarmed Strike granted by a morph or polymorph effect.',
  },
  {
    id: 'druid-creature-comforts',
    name: 'Creature Comforts',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You\'ve found comfort in the forms of other creatures, insulating yourself from feelings of fear. Reduce your frightened condition value by 1 (to a minimum of 0).',
    implemented: 'full',
    traits: ['Barbarian', 'Druid'],
    actionCost: 'reaction',
    prerequisites: ['animal instinct or untamed order'],
    mechanics: 'Trigger: You become frightened. Requirements: You are under a morph or polymorph effect.',
  },
  {
    id: 'druid-rip-and-tear',
    name: 'Rip and Tear',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You\'ve learned to debilitate your enemies in the same way a hunter tears at their prey. Make an unarmed Strike against the same target. If the Strike hits and deals piercing or slashing damage, the target takes an additional 1d6 persistent bleed damage. If you\'re at least 12th level, increase this to 2d6 persistent bleed damage.',
    implemented: 'full',
    traits: ['Barbarian', 'Druid'],
    actionCost: 1,
    prerequisites: ['animal instinct or untamed order'],
    mechanics: 'requirements: Your last action dealt piercing or slashing damage using an unarmed Strike granted by a morph or polymorph effect.',
  },

  // ── Dark Archive ──
  {
    id: 'druid-cryptic-spell',
    name: 'Cryptic Spell',
    source: 'Druid',
    category: 'class',
    level: 4,
    description:
      'You hide your magic in the croak of a frog, in the sway of the trees, in the howl of the wind, and the flicker of the will-o\'-wisp. If the next action you take is to Cast a Spell, the spell gains the subtle trait, masking the spell\'s manifestations in the natural sights and sounds of the environment. The trait hides only the spell\'s spellcasting actions and manifestations, not its effects, so an observer might still see you transform into a giant bear.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid', 'Spellshape'],
    actionCost: 1,
    mechanics: 'Requirements: You are in natural terrain.',
  },

  // ══════════════════════════════════════
  // ── Level 6 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-current-spell',
    name: 'Current Spell',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'As you use your magic to manipulate air or water, you spin off some of its currents to form a barrier around you. If your next action is to Cast a Spell with the air or water trait, until the start of your next turn, you gain a +1 circumstance bonus to AC or a +2 circumstance bonus against ranged attacks. This effect has the air or water trait, or both, depending on the traits of the spell you cast. You also gain a +1 circumstance bonus to all saves against effects with the air trait, water trait, or both until the start of your next turn, depending on the spell\'s traits.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid', 'Spellshape'],
    actionCost: 1,
  },
  {
    id: 'druid-grown-of-oak',
    name: 'Grown of Oak',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'You can make your skin take on the woody endurance of an ancient tree and have your familiar follow suit. You can cast oaken resilience at will as an innate primal spell with a spell rank one lower than the highest rank of spells you can cast. This spell targets you, as well as your leshy familiar if it\'s within 30 feet of you.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order'],
  },
  {
    id: 'druid-insect-shape',
    name: 'Insect Shape',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'Your understanding of life expands, allowing you to mimic a wider range of creatures. Add the shapes in insect form to your untamed form list. Whenever you use untamed form to polymorph into the non-flying insect shapes listed in pest form, the duration is 24 hours instead of 10 minutes.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-instinctive-support',
    name: 'Instinctive Support',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'When you support your animal companion, your companion supports you in turn. After your spell takes place, your companion gains its actions for the turn, as if you Commanded it, and one of the actions must be Support. If the companion has used any other actions already, it can\'t Support you, as normal.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'free',
    prerequisites: ['Animal Companion'],
    mechanics: 'trigger: You Cast a non-cantrip spell that targets only your animal companion.',
  },
  {
    id: 'druid-storm-retribution',
    name: 'Storm Retribution',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'You lash out, directing a burst of storming fury toward a creature that has harmed you. You cast tempest surge on the triggering opponent and push that creature, moving it 5 feet away from you if it fails its Reflex save, or 10 feet if it critically fails. This movement is forced movement.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'reaction',
    prerequisites: ['storm order', 'tempest surge order spell'],
    mechanics: 'trigger: An opponent adjacent to you critically hits you with a melee weapon or melee unarmed attack. requirements: You have at least 1 available Focus Point.',
  },

  // ── Secrets of Magic ──
  {
    id: 'druid-advanced-elemental-spell',
    name: 'Advanced Elemental Spell',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'Your connection to one of the great elemental aspects of nature deepens, allowing you further control over its powers. You gain an advanced order spell associated with your order: if you\'re a member of the flame order, you gain combustion; if you\'re a member of the stone order, you gain stone lance; if you\'re a member of the storm order, you gain powerful inhalation; if you\'re a member of the wave order, you gain pulverizing cascade. Increase the number of Focus Points in your focus pool by 1.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['flame order, stone order, storm order, or wave order'],
  },

  // ── Shared ──
  {
    id: 'druid-steady-spellcasting',
    name: 'Steady Spellcasting',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'You don\'t lose spells easily. If a reaction would disrupt your spellcasting action, attempt a DC 15 flat check. If you succeed, your action isn\'t disrupted.',
    implemented: 'full',
    traits: ['Bard', 'Cleric', 'Druid', 'Oracle', 'Psychic', 'Sorcerer', 'Witch', 'Wizard'],
    actionCost: 'passive',
  },

  // ── Howl of the Wild ──
  {
    id: 'druid-misty-transformation',
    name: 'Misty Transformation',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'Wild mists cover your form. You create a hazy cloud in a 5-foot burst centered on one corner of your space. If your new form is Large or larger, the cloud covers your entire space instead. All creatures within the area are concealed, and all others are concealed to them. The cloud lasts until the beginning of your next turn but is immediately dispersed by a strong wind.',
    implemented: 'full',
    traits: ['Druid', 'Primal'],
    actionCost: 'reaction',
    mechanics: 'trigger: You transform due to a polymorph effect. frequency: once per minute',
  },
  {
    id: 'druid-toppling-transformation',
    name: 'Toppling Transformation',
    source: 'Druid',
    category: 'class',
    level: 6,
    description:
      'You use your body\'s expansion as leverage to displace a nearby creature. You attempt to Shove or Trip an adjacent creature. For the purposes of determining what size creature you can affect, use your final size after the triggering effect.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'reaction',
    mechanics: 'trigger: Your size increases due to a polymorph effect.',
  },

  // ══════════════════════════════════════
  // ── Level 8 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-deimatic-display',
    name: 'Deimatic Display',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'Imitating animal threat displays, you make yourself appear larger and more imposing. Attempt an Intimidation check to Demoralize each enemy within 30 feet. This attempt has the visual trait, loses the auditory trait, and you don\'t take a penalty if the creature doesn\'t understand your language. Roll your check only once and compare it to the Will DC of each target. You gain a +2 circumstance bonus to the check against animal, fungus, and plant creatures and take a –2 circumstance penalty against other creatures. Each target is then temporarily immune for 1 minute.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 1,
    prerequisites: ['trained in Intimidation'],
  },
  {
    id: 'druid-ferocious-shape',
    name: 'Ferocious Shape',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'You\'ve mastered the shape of dinosaurs. Add the shapes listed in dinosaur form to your untamed form list. Whenever you use untamed form to take a shape that grants you a specific Athletics modifier, you gain a +1 status bonus to your Athletics checks.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-fey-caller',
    name: 'Fey Caller',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'You have learned some of the tricks the fey use to bend primal magic toward illusions and trickery. Add illusory disguise, illusory object, and illusory scene to your spell list, which you cast as primal spells.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-floral-restoration',
    name: 'Floral Restoration',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'You request that nearby plants share their vitality with you to replenish your body and magic. You regain 1 Focus Point and 4d8 Hit Points. You must be in a location of at least 15 feet by 15 feet of healthy plant life, though this can be grass, lichen, seaweed, or any other form of naturally occurring flora. Using Floral Restoration on a given section of nature does not harm it, but it prevents that section of nature from giving its vitality to another use of Floral Restoration for 24 hours. At 9th level, and every 2 levels thereafter, increase the healing by 1d8.',
    implemented: 'full',
    traits: ['Druid', 'Healing', 'Vitality'],
    actionCost: 1,
    prerequisites: ['leaf order'],
    mechanics: 'frequency: once per day',
  },
  {
    id: 'druid-incredible-companion',
    name: 'Incredible Companion',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'Your animal companion continues to grow and develop. It becomes either a nimble or savage animal companion, gaining additional capabilities determined by the type.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Mature Animal Companion (Druid)'],
  },
  {
    id: 'druid-raise-menhir',
    name: 'Raise Menhir',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'You raise a druidic monument, such as a standing stone or warding tree, from the ground, creating a powerful primal ward that blocks other types of magic. The monument appears in an unoccupied square on the ground within 30 feet, making that square difficult terrain. Choose arcane, divine, or occult; all creatures within 15 feet of the monument gain a +2 status bonus to their saving throws against effects with that trait. The monument lasts for 1 round before crumbling back into the earth or wilting away into nothingness, but you can Sustain the monument for up to 1 minute.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 2,
    mechanics: 'frequency: once per hour',
  },
  {
    id: 'druid-soaring-shape',
    name: 'Soaring Shape',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'Wings free you from the shackles of the ground below. Add the bat and bird shapes in aerial form to your untamed form list. If you have Insect Shape, you also add the wasp shape to your untamed form list. If you have Ferocious Shape, you also add the pterosaur shape to your untamed form list. Whenever you use untamed form to take a shape that grants you a specific Acrobatics modifier, you gain a +1 status bonus to Acrobatics checks.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-wind-caller',
    name: 'Wind Caller',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'You bid the winds to aid you, carrying you through the air and allowing you passage through the strongest headwinds. You gain the stormwind flight order spell.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['storm order'],
  },

  // ── Secrets of Magic ──
  {
    id: 'druid-fiery-retort',
    name: 'Fiery Retort',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'Ignoring your pain, you sear your attacker with a wave of flame. The triggering opponent takes fire damage equal to your level.',
    implemented: 'full',
    traits: ['Druid', 'Evocation', 'Fire'],
    actionCost: 'reaction',
    prerequisites: ['flame order'],
    mechanics: 'trigger: An opponent adjacent to you hits you with a melee weapon or a melee unarmed attack. frequency: once per minute',
  },

  // ── Dark Archive ──
  {
    id: 'druid-cant-you-see',
    name: 'Can\'t You See?',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'The eye rebels, the mind recoils—no matter how much those who can see you try to explain what\'s there, their friends\' gazes just skitter over you, like a bird afraid to land. A character who attempts to Point Out your location must attempt a DC 14 flat check. If they fail, their allies misunderstand them and aren\'t sure where you are. On a critical failure, their allies think they pointed you out in a different location entirely, chosen by the GM. Similarly, when a creature critically fails to Seek you while you\'re hidden to or undetected by it, it thinks you\'re in a different location chosen by the GM. In either case, you appear to be hidden to a creature that thinks you\'re in a different location, though you\'re actually undetected by it for targeting and further uses of the Seek action.',
    implemented: 'full',
    traits: ['Druid', 'Ranger'],
    actionCost: 'passive',
    prerequisites: ['expert in Stealth', 'trained in Occultism'],
  },
  {
    id: 'druid-eerie-environs',
    name: 'Eerie Environs',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'The natural world can be scary to those not used to it—and you make it scarier still. If you\'re hidden from a creature, you can attempt to Demoralize it without losing your hidden condition—imitating the sounds of strange beasts or causing the foliage to rustle menacingly. When you do so, you don\'t take a penalty to your check if the target doesn\'t understand your language.',
    implemented: 'full',
    traits: ['Druid', 'Ranger'],
    actionCost: 'passive',
    prerequisites: ['trained in Intimidation', 'trained in Stealth'],
  },
  {
    id: 'druid-eerie-traces',
    name: 'Eerie Traces',
    source: 'Druid',
    category: 'class',
    level: 8,
    description:
      'The tracks you leave behind are strange, somehow disconcerting and unnerving—they might travel backward, or through places no one would think to pass through. You change your tracks into eerie traces, moving up to half your travel speed as you do so. You don\'t need to attempt a Survival check to change your tracks, but anyone tracking you must attempt a Will save against the higher of your class DC or spell DC. Success: The tracker is unaffected. Failure: The tracker becomes frightened 1 for as long as it follows your tracks. This condition doesn\'t decrease until the tracker stops following you, and it comes back if the tracker resumes following your tracks. If the tracker enters into an encounter with you after following your tracks, it begins the encounter frightened 1. Critical Failure: As failure, but your disturbing traces cause the tracker to be frightened 2 instead.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid', 'Exploration', 'Move', 'Ranger'],
    actionCost: 'passive',
    prerequisites: ['trained in Intimidation', 'trained in Survival'],
  },

  // ══════════════════════════════════════
  // ── Level 10 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-elemental-shape',
    name: 'Elemental Shape',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'You understand the fundamental elements of nature such that you can imbue them into your body and manifest as a living embodiment of those elements. Add the shapes in elemental form to your untamed form list. Whenever you\'re polymorphed into another shape using untamed form, you gain resistance 5 to fire.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-healing-transformation',
    name: 'Healing Transformation',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'You can take advantage of shapechanging magic to close wounds and patch injuries. If your next action is to cast a noncantrip polymorph spell that targets only one creature, your polymorph spell also restores 1d6 Hit Points per spell rank to that creature. This is a healing effect.',
    implemented: 'full',
    traits: ['Druid', 'Spellshape'],
    actionCost: 1,
  },
  {
    id: 'druid-overwhelming-energy',
    name: 'Overwhelming Energy',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'With a complex gesture, you call upon the primal power of your spell to overcome enemies\' resistances. If the next action you use is to Cast a Spell, the spell ignores an amount of the target\'s resistance to acid, cold, electricity, fire, or sonic damage equal to your level. This applies to all damage the spell deals, including persistent damage and damage caused by an ongoing effect of the spell, such as the wall created by wall of fire. A creature\'s immunities are unaffected.',
    implemented: 'full',
    traits: ['Druid', 'Manipulate', 'Sorcerer', 'Spellshape', 'Wizard'],
    actionCost: 1,
  },
  {
    id: 'druid-plant-shape',
    name: 'Plant Shape',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'You can take the shape of a plant creature. If you don\'t have untamed form, you can cast plant form once per day, heightened to the same rank as your highest-rank druid spell slot. If you do have untamed form, add the shapes listed in plant form to your untamed form list, and whenever you\'re polymorphed into another shape using untamed form, you gain resistance 5 to poison.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order or Untamed Form'],
  },
  {
    id: 'druid-primal-howl',
    name: 'Primal Howl',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'Your companion can let out a howl laced with your primal magic. It gains the following advanced maneuver, in addition to any advanced maneuvers it already knows. Primal Howl [two-actions] (primal, sonic) Frequency once per hour; Effect Your animal companion screeches and howls, empowered with natural magic. All creatures in a 30-foot cone take 1d6 sonic damage for every 2 levels your companion has, with a basic Fortitude save against your spell DC. Creatures that fail become frightened 1, and creatures that critically fail become frightened 2. The fright is an emotion, fear, and mental effect.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Incredible Companion (Druid)'],
  },
  {
    id: 'druid-pristine-weapon',
    name: 'Pristine Weapon',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'Your verdant weapon can cut through the resistances of magical creatures. The weapon is treated as cold iron and silver. If you critically hit a creature that has a weakness to cold iron or silver, the target takes 1d6 persistent bleed damage as the primal energies within your weapon slow its natural healing.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Verdant Weapon'],
  },
  {
    id: 'druid-side-by-side',
    name: 'Side by Side',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'You and your animal companion fight in tandem, distracting your foes and keeping them off balance. Whenever you and your animal companion are adjacent to the same foe, you are both flanking that foe with each other, regardless of your actual positions.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Animal Companion'],
  },
  {
    id: 'druid-thunderclap-spell',
    name: 'Thunderclap Spell',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'Your lightning splits the air, generating a booming shock wave. If your next action is to Cast a Spell that has the electricity trait or deals electricity damage, has no duration, and requires creatures to attempt a saving throw, the force of the spell\'s lightning creates a thunderclap, in addition to its other effects. Each creature that failed its Reflex save against the spell is deafened for 1 round, and those who critically failed are also knocked prone.',
    implemented: 'full',
    traits: ['Druid', 'Sonic', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['storm order'],
  },

  // ── Secrets of Magic ──
  {
    id: 'druid-harden-flesh',
    name: 'Harden Flesh',
    source: 'Druid',
    category: 'class',
    level: 10,
    description:
      'You fortify your skin with minerals drawn from earth and stone. You gain resistance 3 to physical damage, except adamantine, until the beginning of your next turn. At 12th level, and every 4 levels thereafter, the resistance increases by 1, to a maximum of resistance 6 at 20th level.',
    implemented: 'full',
    traits: ['Druid', 'Earth'],
    actionCost: 1,
    prerequisites: ['stone order'],
    mechanics: 'Requirements: You are standing on earthen or stone ground.',
  },

  // ══════════════════════════════════════
  // ── Level 12 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-dragon-shape',
    name: 'Dragon Shape',
    source: 'Druid',
    category: 'class',
    level: 12,
    description:
      'You can take on the shape of some of the world\'s most fearsome creatures. Add the shapes listed in dragon form to your untamed form list. Whenever you\'re polymorphed into another form using untamed form, you gain resistance 5 to your choice of bludgeoning or poison.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Soaring Shape'],
  },
  {
    id: 'druid-garland-spell',
    name: 'Garland Spell',
    source: 'Druid',
    category: 'class',
    level: 12,
    description:
      'If your next action is to Cast a Spell with the fungus or plant trait, a garland of plants grows in a 10-foot burst in the spell\'s range. The plants are difficult terrain and hazardous terrain, covered in your choice of thorns or poisonous vines. Any creature that moves into one of these squares or ends its turn in one takes 2d6 damage (piercing damage for thorns or poison for vines). A creature can take this damage only once per turn. You and your familiar are immune to this damage. The plants last for 1 minute or until you cast another Garland Spell, whichever comes first. The damage increases to 3d6 at 16th level and 4d6 at 20th level.',
    implemented: 'full',
    traits: ['Druid', 'Manipulate', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['leaf order'],
  },
  {
    id: 'druid-primal-focus',
    name: 'Primal Focus',
    source: 'Druid',
    category: 'class',
    level: 12,
    description:
      'Your connection to nature is particularly strong, and the spirits of nature flock around you, helping you replenish your focus. Whenever you Refocus, completely refill your focus pool.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-primal-summons',
    name: 'Primal Summons',
    source: 'Druid',
    category: 'class',
    level: 12,
    description:
      'Whenever you summon an ally, you can empower it with the elemental power of air, earth, fire, or water. You gain the primal summons order spell.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Call of the Wild'],
  },
  {
    id: 'druid-wandering-oasis',
    name: 'Wandering Oasis',
    source: 'Druid',
    category: 'class',
    level: 12,
    description:
      'You\'re surrounded by soothing energy. You and allies within 60 feet of you are protected from severe environmental heat and cold. If you\'re legendary in Survival, you and those allies are also protected from extreme environmental heat and cold.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['master in Survival'],
  },

  // ── Secrets of Magic ──
  {
    id: 'druid-purifying-spell',
    name: 'Purifying Spell',
    source: 'Druid',
    category: 'class',
    level: 12,
    description:
      'You purify the water within a creature\'s body to cleanse them of illness. If the next action you use is to cast heal targeting a single living creature, you can attempt to counteract a disease or poison affecting the target, in addition to the other benefits of heal. If you do, heal gains the water trait.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid', 'Metamagic', 'Water'],
    actionCost: 1,
    prerequisites: ['wave order'],
  },

  // ══════════════════════════════════════
  // ── Level 14 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-reactive-transformation',
    name: 'Reactive Transformation',
    source: 'Druid',
    category: 'class',
    level: 14,
    description:
      'You transform reflexively when in danger. You cast untamed form to transform into one shape granted by one of the prerequisite feats you have, depending on the trigger. Your shape\'s resistances and weaknesses apply against the triggering damage. Trigger: You fall 10 feet or more; Effect: Choose a shape from aerial form. Trigger: You take bludgeoning or poison damage; Effect: Choose a primal dragon shape from dragon form that resists the triggering damage. Trigger: You take fire damage; Effect: Choose a fire elemental shape from elemental form. Trigger: You take poison damage; Effect: Choose a shape from plant form.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'reaction',
    prerequisites: ['Untamed Form', 'Dragon Shape, Elemental Shape, Plant Shape, or Soaring Shape'],
  },
  {
    id: 'druid-sow-spell',
    name: 'Sow Spell',
    source: 'Druid',
    category: 'class',
    level: 14,
    description:
      'You fold your spell into a seed. If your next action is to Cast a Spell using 1 action or 2 actions, the spell instead plants itself in an adjacent square. You must make all decisions regarding the spell at the time you cast it. Within the next 10 minutes, you can direct your sown spell to sprout and produce the spell\'s effects as a reaction, which is triggered when a creature enters the sown spell\'s space or a square adjacent to it. You can have only one sown spell at a time, and if you don\'t trigger the spell within 10 minutes, it dissipates and the spell is lost. A creature can notice the sown spell with a successful Perception check against your spell DC.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid', 'Spellshape'],
    actionCost: 1,
  },
  {
    id: 'druid-specialized-companion',
    name: 'Specialized Companion',
    source: 'Druid',
    category: 'class',
    level: 14,
    description:
      'Your animal companion continues to grow in power and ability. It gains one specialization of your choice. Special: You can select this feat up to three times. Each time, add a different specialization to your companion.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Incredible Companion (Druid)'],
  },
  {
    id: 'druid-timeless-nature',
    name: 'Timeless Nature',
    source: 'Druid',
    category: 'class',
    level: 14,
    description:
      'With primal magic sustaining you, you cease aging. The overflowing primal energy gives you a +2 status bonus to saves against diseases and primal magic.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-verdant-metamorphosis',
    name: 'Verdant Metamorphosis',
    source: 'Druid',
    category: 'class',
    level: 14,
    description:
      'You have turned into a plant version of yourself, gaining the plant trait and losing traits inappropriate for your new form (typically humanoid). You also gain the Verdant Rest action. Verdant Rest [one-action] (concentrate) You turn into a tree or other noncreature plant. This has the effect of using one with plants to turn into a plant, except that your AC is 30. You can Dismiss this effect to turn back. If you rest for 10 minutes in this form in natural sunlight, you recover half your maximum Hit Points. If you take your daily rest in this form, the rest restores you to maximum Hit Points and removes all non-permanent drained, enfeebled, clumsy, and stupefied conditions, as well as all poisons and diseases of 19th level or lower.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order'],
  },

  // ══════════════════════════════════════
  // ── Level 16 Feats ──
  // ══════════════════════════════════════

  // ── Shared ──
  {
    id: 'druid-effortless-concentration',
    name: 'Effortless Concentration',
    source: 'Druid',
    category: 'class',
    level: 16,
    description:
      'You can maintain a spell with hardly a thought. You immediately gain the effects of the Sustain action, allowing you to extend the duration of one of your active spells.',
    implemented: 'full',
    traits: ['Bard', 'Druid', 'Sorcerer', 'Summoner', 'Witch', 'Wizard'],
    actionCost: 'free',
    mechanics: 'trigger: Your turn begins.',
  },

  // ── Player Core ──
  {
    id: 'druid-impaling-briars',
    name: 'Impaling Briars',
    source: 'Druid',
    category: 'class',
    level: 16,
    description:
      'You can fill an area with devastating briars. You gain the impaling briars order spell.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['leaf order'],
  },
  {
    id: 'druid-monstrosity-shape',
    name: 'Monstrosity Shape',
    source: 'Druid',
    category: 'class',
    level: 16,
    description:
      'You can transform into a powerful magical creature. Add the cave worm and sea serpent shapes listed in monstrosity form to your untamed form list. If you have Soaring Shape, also add the phoenix shape to your untamed form list.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Untamed Form'],
  },
  {
    id: 'druid-uplifting-winds',
    name: 'Uplifting Winds',
    source: 'Druid',
    category: 'class',
    level: 16,
    description:
      'The winds are eager to keep you aloft. When you are flying and Cast a Spell that has the air or electricity traits, you gain a +10 status bonus to your fly Speed, and you can immediately Fly up to half your Speed.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['storm order'],
  },

  // ══════════════════════════════════════
  // ── Level 18 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-invoke-disaster',
    name: 'Invoke Disaster',
    source: 'Druid',
    category: 'class',
    level: 18,
    description:
      'You can invoke nature\'s fury upon your foes. You gain the storm lord order spell.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Wind Caller'],
  },
  {
    id: 'druid-perfect-form-control',
    name: 'Perfect Form Control',
    source: 'Druid',
    category: 'class',
    level: 18,
    description:
      'Thanks to magic and muscle memory, you can stay in your alternate shapes indefinitely. When you use Form Control, instead of lasting 1 hour, untamed form\'s duration is unlimited (you can still Dismiss it).',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
    prerequisites: ['Form Control', 'Strength 18'],
  },
  {
    id: 'druid-primal-aegis',
    name: 'Primal Aegis',
    source: 'Druid',
    category: 'class',
    level: 18,
    description:
      'You surround yourself with a thick field of protective primal energy. You and allies within 30 feet of you gain resistance equal to your Wisdom modifier to acid, cold, electricity, fire, vitality, and void damage.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },

  // ══════════════════════════════════════
  // ── Level 20 Feats ──
  // ══════════════════════════════════════

  // ── Player Core ──
  {
    id: 'druid-hierophants-power',
    name: 'Hierophant\'s Power',
    source: 'Druid',
    category: 'class',
    level: 20,
    description:
      'You have entwined yourself with the natural world, and its full power flows through you. You gain an additional 10th-rank spell slot.',
    implemented: 'full',
    traits: ['Druid'],
    actionCost: 'passive',
  },
  {
    id: 'druid-ley-line-conduit',
    name: 'Ley Line Conduit',
    source: 'Druid',
    category: 'class',
    level: 20,
    description:
      'You can draw magic from the ley lines of the world. If your next action is to Cast a Spell of 5th rank or lower that has no duration, you don\'t expend the prepared spell as you cast it.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid', 'Manipulate', 'Spellshape'],
    actionCost: 1,
    mechanics: 'frequency: once per minute',
  },
  {
    id: 'druid-true-shapeshifter',
    name: 'True Shapeshifter',
    source: 'Druid',
    category: 'class',
    level: 20,
    description:
      'You transcend the limitations of form. Once per day you can cast nature incarnate, even if you don\'t have it prepared, to transform into a kaiju. If you have Plant Shape, you can choose to transform into a green man instead. You also gain the True Shapeshift activity. True Shapeshift [two-actions] (concentrate) Requirements: You\'re under the effects of untamed form; Effect: You change into any other shape on your untamed form list. If the duration of that shape is different from the one you were previously in, use the shorter duration to determine your duration remaining.',
    implemented: 'full',
    traits: ['Concentrate', 'Druid'],
    actionCost: 'passive',
    prerequisites: ['Dragon Shape', 'Untamed Form'],
  },
];
