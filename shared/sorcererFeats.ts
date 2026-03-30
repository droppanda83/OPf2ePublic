import type { FeatEntry } from './featTypes';
import { SKILL_OPTIONS } from './subChoiceOptions';
import { createClassFeature, WEAPON_SPECIALIZATION } from './sharedFeats';

// ──────────────────────────────────────────────────────────
// SORCERER CLASS FEATURES (Automatically Granted)
// PF2e Remaster — Player Core 2
// ──────────────────────────────────────────────────────────

const RAW_SORCERER_CLASS_FEATURES: FeatEntry[] = [
  // —— Level 1 ——————————————————————————————————————————————
  {
    id: 'sorcerer-bloodline',
    name: 'Bloodline',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 1,
    description:
      'Choose a bloodline that gives you your spellcasting talent. This choice determines the type of spells you cast and the spell list you choose them from, the additional spells you learn, and your additional trained skills. You also gain Focus Points and special focus spells based on your bloodline. Your bloodline grants you bloodline spells, special spells unique to your lineage. Bloodline spells are a type of focus spell. It costs 1 Focus Point to cast a focus spell, and you start with a focus pool of 1 Focus Point. You refill your focus pool during your daily preparations, and you can regain 1 Focus Point by spending 10 minutes using the Refocus activity. Unlike other characters, you don\'t need to do anything specific to Refocus, as the power flowing through your veins naturally replenishes your focus pool. Focus spells are automatically heightened to half your level rounded up. The maximum Focus Points your focus pool can hold is equal to the number of focus spells you have, but can never be more than 3 points. Player Core 2 bloodlines: Aberrant (occult), Angelic (divine), Demonic (divine), Diabolic (divine), Draconic (variable), Elemental (primal), Fey (primal), Hag (occult), Imperial (arcane), Undead (divine).',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Builder must capture `bloodline` choice from SORCERER_BLOODLINES data. Bloodline determines: tradition (arcane/divine/occult/primal), sorcerous gift spells auto-added to repertoire at each spell rank, bloodline focus spells (initial/advanced/greater), two trained skills, and blood magic effect. Focus pool starts at 1, max 3.',
    subChoices: { label: 'Choose a bloodline', options: [
      { id: 'aberrant', name: 'Aberrant', description: 'Occult tradition; tentacles and alien magic' },
      { id: 'angelic', name: 'Angelic', description: 'Divine tradition; celestial healing and holy power' },
      { id: 'demonic', name: 'Demonic', description: 'Divine tradition; destructive abyssal magic' },
      { id: 'diabolic', name: 'Diabolic', description: 'Divine tradition; hellfire and infernal contracts' },
      { id: 'draconic', name: 'Draconic', description: 'Arcane tradition; dragon breath and scales' },
      { id: 'elemental', name: 'Elemental', description: 'Primal tradition; elemental forces' },
      { id: 'fey', name: 'Fey', description: 'Primal tradition; enchantment and illusion' },
      { id: 'hag', name: 'Hag', description: 'Occult tradition; curses and dark bargains' },
      { id: 'imperial', name: 'Imperial', description: 'Arcane tradition; pure magical force' },
      { id: 'undead', name: 'Undead', description: 'Divine tradition; necromantic power' },
    ] },
  },
  {
    id: 'sorcerer-spellcasting',
    name: 'Sorcerer Spellcasting',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 1,
    description:
      'Your bloodline provides you with incredible magical power. You are a spellcaster and can cast spells using the Cast a Spell activity. The tradition from which your spells come is determined by your bloodline. Each day, you can cast up to three 1st-rank spells. You must know spells to cast them, and you learn them via the spell repertoire class feature. As you increase in level as a sorcerer, your number of spells per day increases, as does the highest rank of spells you can cast. Some of your spells require you to attempt a spell attack or have your enemies roll against your spell DC. Since your key attribute is Charisma, your spell attack modifier and spell DC use your Charisma modifier. You can extend the range of spells, heighten them if you have them in your repertoire at the appropriate rank, and cast cantrips at will — cantrips are always automatically heightened to half your level rounded up.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Spontaneous caster. Tradition determined by bloodline choice (arcane, divine, occult, or primal). Spell attack/DC use CHA. Proficiency progression: trained at 1, expert at 7, master at 15, legendary at 19. Cantrips auto-heighten to half level rounded up.',
  },
  {
    id: 'sorcerer-spell-repertoire',
    name: 'Spell Repertoire',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 1,
    description:
      'At 1st level, you learn two 1st-rank spells of your choice and four cantrips of your choice, as well as an additional spell and cantrip from your bloodline. You choose these from the common spells from the tradition corresponding to your bloodline. You add to this spell repertoire as you increase in level. Each time you get a spell slot, you add a spell of the same rank. When you gain a new rank of spells, your first new spell is always the sorcerous gift spell for that rank listed in your bloodline, but you can choose the other spells. You might select a higher-rank version of a spell you already know so you can cast a heightened version. As you gain new spells in your repertoire, you might want to replace some previously learned — each time you gain a level and learn new spells, you can swap out one old spell for a different spell of the same rank.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Repertoire starts with 2 + 1 bloodline = 3 first-rank spells and 4 + 1 bloodline = 5 cantrips. Each new spell slot adds one spell. First spell at each new rank is always the bloodline\'s sorcerous gift. One swap per level-up (same rank, no bloodline spells).',
  },
  {
    id: 'sorcerer-sorcerous-potency',
    name: 'Sorcerous Potency',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 1,
    description:
      'Because of the magical power inherent in your blood, your spells that hurt or cure are stronger than those of other spellcasters. When you Cast a Spell from your spell slots that either deals damage or restores Hit Points, you gain a status bonus to that spell\'s damage or healing equal to the spell\'s rank. This applies only to the initial damage or healing the spell deals when cast. An individual creature takes this damage or benefits from this healing only once per spell, even if the spell would damage or heal that creature multiple times.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'On casting a damage/healing spell from a spell slot, add +spell_rank status bonus to initial damage or healing. Each creature benefits/suffers only once per spell. Does NOT apply to cantrips or focus spells (slot-based only).',
  },

  // —— Level 3 ——————————————————————————————————————————————
  {
    id: 'sorcerer-signature-spells',
    name: 'Signature Spells',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 3,
    description:
      'Your innate power allows you to cast some of your spells more flexibly. For each spell rank you have access to, choose one spell of that rank to be a signature spell. You don\'t need to learn heightened versions of signature spells separately; instead, you can heighten these spells freely. If you\'ve learned a signature spell at a higher rank than its minimum, you can also cast all its lower-rank versions without learning those separately. If you swap out a signature spell, you can choose a replacement signature spell of the same spell rank at which you learned the previous spell. You can also retrain specifically to change a signature spell to a different spell of that rank without swapping any spells.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'One signature spell per spell rank. Signature spells heighten freely. If learned at higher rank, lower-rank versions are also available. Swapping or retraining rules apply.',
  },

  // —— Level 5 ——————————————————————————————————————————————
  {
    id: 'sorcerer-magical-fortitude',
    name: 'Magical Fortitude',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 5,
    description:
      'Magical power has improved your body\'s resiliency. Your proficiency rank for Fortitude saves increases to expert.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Fortitude save proficiency → expert.',
  },

  // —— Level 7 ——————————————————————————————————————————————
  {
    id: 'sorcerer-expert-spellcaster',
    name: 'Expert Spellcaster',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 7,
    description:
      'Your inherent magic responds easily and powerfully to your command. Your proficiency ranks for spell attack modifier and spell DC increase to expert.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Spell attack modifier and spell DC proficiency → expert.',
  },

  // —— Level 9 ——————————————————————————————————————————————
  {
    id: 'sorcerer-reflex-expertise',
    name: 'Reflex Expertise',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 9,
    description:
      'Your reflexes are lightning fast. Your proficiency rank for Reflex saves increases to expert.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Reflex save proficiency → expert.',
  },

  // —— Level 11 —————————————————————————————————————————————
  {
    id: 'sorcerer-perception-expertise',
    name: 'Perception Expertise',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 11,
    description:
      'You remain alert to threats around you. Your proficiency rank for Perception increases to expert.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Perception proficiency → expert.',
  },
  {
    id: 'sorcerer-weapon-expertise',
    name: 'Weapon Expertise',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 11,
    description:
      'You\'ve improved your combat skill. Your proficiency ranks for simple weapons and unarmed attacks increase to expert.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Simple weapons and unarmed attacks proficiency → expert.',
  },

  // —— Level 13 —————————————————————————————————————————————
  {
    id: 'sorcerer-defensive-robes',
    name: 'Defensive Robes',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 13,
    description:
      'The flow of magic and your defensive training combine to help you avoid attacks. Your proficiency rank in unarmored defense increases to expert.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Unarmored defense proficiency → expert.',
  },
  createClassFeature(WEAPON_SPECIALIZATION, 'Sorcerer', 13),

  // —— Level 15 —————————————————————————————————————————————
  {
    id: 'sorcerer-master-spellcaster',
    name: 'Master Spellcaster',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 15,
    description:
      'You have achieved mastery over the magic in your blood. Your proficiency ranks for spell attack modifiers and spell DCs increase to master.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Spell attack modifier and spell DC proficiency → master.',
  },

  // —— Level 17 —————————————————————————————————————————————
  {
    id: 'sorcerer-majestic-will',
    name: 'Majestic Will',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 17,
    description:
      'Your mind and will are tempered by your mastery of magical forces. Your proficiency rank for Will saves increases to master. When you roll a success on a Will save, you get a critical success instead.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Will save proficiency → master. Success on Will saves auto-upgrades to critical success.',
  },

  // —— Level 19 —————————————————————————————————————————————
  {
    id: 'sorcerer-bloodline-paragon',
    name: 'Bloodline Paragon',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 19,
    description:
      'You have perfected the magic in your bloodline. Add two common 10th-rank spells of your tradition to your repertoire. You gain a single 10th-rank spell slot you can use to cast these spells, using sorcerer spellcasting. Unlike other spell slots, you don\'t gain more 10th-rank spells as you level up, and they can\'t be used for abilities that let you cast spells without expending spell slots or abilities that give you more spell slots. You can take the Bloodline Perfection sorcerer feat to gain a second slot.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Add 2 common 10th-rank spells of your tradition to repertoire. Gain one 10th-rank spell slot. Cannot be used with free-casting abilities. Bloodline Perfection feat adds a second slot.',
  },
  {
    id: 'sorcerer-legendary-spellcaster',
    name: 'Legendary Spellcaster',
    source: 'Sorcerer',
    category: 'class_feature',
    level: 19,
    description:
      'You demonstrate prodigious talent for spellcasting. Your proficiency ranks for spell attack modifiers and spell DCs increase to legendary.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Spell attack modifier and spell DC proficiency → legendary.',
  },
];

export const SORCERER_CLASS_FEATURES: FeatEntry[] = RAW_SORCERER_CLASS_FEATURES.map(f => ({
  ...f,
  traits: f.traits ?? ['Sorcerer'],
}));

// ──────────────────────────────────────────────────────────
// SORCERER CLASS FEATS
// PF2e Remaster — Player Core 2 + Legacy supplements
// ──────────────────────────────────────────────────────────

const RAW_SORCERER_CLASS_FEATS: FeatEntry[] = [
  // —— Level 1 ——————————————————————————————————————————————
  {
    id: 'sorcerer-blood-rising',
    name: 'Blood Rising',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description:
      'The magic in your blood surges in response to your foe\'s spell. You generate a blood magic effect you know, even if you are already under the effects of blood magic. The target must be either you or the creature that triggered Blood Rising. If the blood magic effect grants you a bonus to AC or the appropriate saving throw, that bonus applies against the triggering spell. If the effect has a duration, it instead lasts until the beginning of your next turn.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'reaction',
    mechanics:
      'Trigger: A creature targets you with a spell of the same tradition as your bloodline. Generate a blood magic effect even if already under one. Target must be self or triggering creature. Duration shrinks to start of next turn. Special: gains the trait of your bloodline\'s tradition.',
  },
  {
    id: 'sorcerer-tap-into-blood',
    name: 'Tap Into Blood',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description:
      'The power in your blood allows you to perform minor feats of magic. You can perform one of the following actions depending on the tradition of your bloodline. Arcane: Attempt to Recall Knowledge using Arcana instead of the normal skill; on a critical failure you get a failure instead. Divine: You Step, or you Reposition a target within your reach using Religion for the check. Occult: You Step up to 10 feet. Primal: You can attempt a Nature check to Demoralize a target.',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer'],
    actionCost: 1,
    prerequisites: ['You are benefiting from a blood magic effect.'],
    mechanics:
      'Requires active blood magic effect. Each tradition gives a different action: Arcane → Recall Knowledge (Arcana, no crit fail), Divine → Step or Reposition (Religion), Occult → Step 10 ft, Primal → Demoralize (Nature).',
  },
  {
    id: 'sorcerer-ancestral-blood-magic',
    name: 'Ancestral Blood Magic',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description:
      'The magic of your bloodline mixes with that of your ancestry. You gain your blood magic effect when you cast a non-cantrip spell you gained from a heritage or an ancestry feat, in addition to the normal circumstances that trigger your blood magic.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Blood magic now also triggers when casting a non-cantrip spell gained from a heritage or ancestry feat.',
  },
  {
    id: 'sorcerer-blessed-blood',
    name: 'Blessed Blood',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description:
      'Your deity\'s blessings manifest in your blood-borne power. Add up to three of your deity\'s spells (spells your deity grants to clerics) to your spell list. They are not automatically added to your repertoire, but you can select them just as you would spells normally on the divine spell list.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline that grants divine spells; you follow a deity'],
    mechanics:
      'Add up to 3 deity spells to your spell list. They become available for repertoire selection but are not auto-added.',
  },
  {
    id: 'sorcerer-familiar',
    name: 'Familiar',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description: 'You gain a familiar.',
    implemented: 'full',
    traits: ['Magus', 'Sorcerer', 'Thaumaturge', 'Wizard'],
    actionCost: 'passive',
    mechanics: 'Gain a familiar with 2 abilities per day.',
  },
  {
    id: 'sorcerer-reach-spell',
    name: 'Reach Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description:
      'You can extend your spells\' range. If the next action you use is to Cast a Spell that has a range, increase that spell\'s range by 30 feet. As is standard for increasing spell ranges, if the spell normally has a range of touch, you extend its range to 30 feet.',
    implemented: 'full',
    traits: ['Bard', 'Cleric', 'Concentrate', 'Druid', 'Oracle', 'Sorcerer', 'Spellshape', 'Witch', 'Wizard'],
    actionCost: 1,
    mechanics: 'Spellshape. Next Cast a Spell with a range → +30 ft range. Touch spells become 30 ft range.',
  },
  {
    id: 'sorcerer-widen-spell',
    name: 'Widen Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 1,
    description:
      'You manipulate the energy of your spell, causing it to spread out and affect a wider area. If the next action you use is to Cast a Spell that has an area of a burst, cone, or line and does not have a duration, increase the area of that spell. Add 5 feet to the radius of a burst that normally has a radius of at least 10 feet (a burst with a smaller radius is not affected). Add 5 feet to the length of a cone or line that is normally 15 feet long or smaller, and add 10 feet to the length of a larger cone or line.',
    implemented: 'full',
    traits: ['Druid', 'Manipulate', 'Oracle', 'Sorcerer', 'Spellshape', 'Witch', 'Wizard'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next Cast a Spell with burst/cone/line area (no duration) → burst +5 ft radius (if ≥10 ft), cone/line ≤15 ft → +5 ft, cone/line >15 ft → +10 ft.',
  },

  // —— Level 2 ——————————————————————————————————————————————
  {
    id: 'sorcerer-anoint-ally',
    name: 'Anoint Ally',
    source: 'Sorcerer',
    category: 'class',
    level: 2,
    description:
      'You forge a mystical connection with an ally using a drop of your blood, allowing them to benefit from your magic. You place a blood rune on an adjacent ally that lasts for 1 minute. When you or an ally would gain a blood magic effect, you can forgo it, granting it to the anointed ally instead, even if they weren\'t a target of your spell. You can anoint only one ally at a time; if you place another rune, your previous designation ends.',
    implemented: 'full',
    traits: ['Manipulate', 'Sorcerer'],
    actionCost: 1,
    mechanics:
      'Place blood rune on adjacent ally (1 min). Blood magic effects can be redirected to anointed ally. Only one anointment at a time.',
  },
  {
    id: 'sorcerer-bleed-out',
    name: 'Bleed Out',
    source: 'Sorcerer',
    category: 'class',
    level: 2,
    description:
      'You channel the residual energy from the last spell you cast into a ranged bloodletting. Make a ranged spell attack roll against the AC of a target within 60 feet. This attack deals persistent bleed damage equal to the rank of the spell you just cast.',
    implemented: 'full',
    traits: ['Attack', 'Sorcerer'],
    actionCost: 1,
    prerequisites: ['Your most recent action was to cast a non-cantrip spell that granted you a blood magic effect.'],
    mechanics:
      'Ranged spell attack vs AC, 60 ft range. On hit, deals persistent bleed damage equal to the rank of the spell just cast.',
  },
  {
    id: 'sorcerer-propelling-sorcery',
    name: 'Propelling Sorcery',
    source: 'Sorcerer',
    category: 'class',
    level: 2,
    description:
      'The force of your magic can be used to propel yourself or another. You know the following blood magic effect. Blood Magic — Propelling Sorcery: You channel your magic outward into a rush of movement. Either you Step as a free action or move the target 5 feet in a direction of your choice.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Learn blood magic effect: Propelling Sorcery. When triggered, either you Step (free action) or move target 5 ft in a direction of your choice.',
  },
  {
    id: 'sorcerer-entreat-with-forebears',
    name: 'Entreat with Forebears',
    source: 'Sorcerer',
    category: 'class',
    level: 2,
    description:
      'Something about your presence causes creatures of your bloodline to, consciously or not, recognize you as one of their own, and you become inured to their tricks. You gain a +1 circumstance bonus to Diplomacy, Deception, and Intimidation checks when interacting with creatures that have the trait corresponding to your bloodline, and you gain a +1 circumstance bonus to Perception and saving throws against such creatures.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['a bloodline that corresponds with a creature trait'],
    mechanics:
      '+1 circumstance bonus to Diplomacy, Deception, Intimidation vs creatures with your bloodline trait. +1 circumstance bonus to Perception and saves vs such creatures.',
  },
  {
    id: 'sorcerer-cantrip-expansion',
    name: 'Cantrip Expansion',
    source: 'Sorcerer',
    category: 'class',
    level: 2,
    description:
      'Study broadens your range of simple spells. You add two additional cantrips from your spell list to your repertoire.',
    implemented: 'full',
    traits: ['Bard', 'Cleric', 'Magus', 'Oracle', 'Psychic', 'Sorcerer', 'Witch', 'Wizard'],
    actionCost: 'passive',
    mechanics: '+2 cantrips to repertoire.',
  },
  {
    id: 'sorcerer-enhanced-familiar',
    name: 'Enhanced Familiar',
    source: 'Sorcerer',
    category: 'class',
    level: 2,
    description:
      'You infuse your familiar with additional primal energy, increasing its abilities. You can select four familiar or master abilities each day, instead of two.',
    implemented: 'full',
    traits: ['Animist', 'Druid', 'Magus', 'Sorcerer', 'Thaumaturge', 'Witch', 'Wizard'],
    actionCost: 'passive',
    prerequisites: ['a familiar'],
    mechanics: 'Familiar abilities per day: 2 → 4.',
  },

  // —— Level 4 ——————————————————————————————————————————————
  {
    id: 'sorcerer-arcane-evolution',
    name: 'Arcane Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'Your arcane legacy allows you to perceive how magic affects everything. You become trained in one skill of your choice. Additionally, you can use arcane arts to tinker with your selection of spells. During your daily preparations, you can choose one spell in your spell repertoire to be a signature spell that day. You can use the Learn a Spell activity to add more arcane spells to the list you choose from, but if you prepare a spell that isn\'t in your repertoire, you temporarily add it to your repertoire at the spell rank of your choice instead of making it a signature spell.',
    implemented: 'full',
    traits: ['Arcane', 'Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline that grants arcane spells'],
    mechanics:
      'Gain trained in one skill. Daily prep: choose one repertoire spell as signature. Can Learn a Spell (arcane) to add to list; non-repertoire spells temporarily added instead of becoming signature.',
    subChoices: { label: 'Choose skill to train', options: SKILL_OPTIONS },
  },
  {
    id: 'sorcerer-divine-evolution',
    name: 'Divine Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'The divine might provided by your bloodline flows through you. You gain an additional spell slot of your highest rank, which you can use only to cast your choice of heal or harm. You can cast either of these spells using that spell slot, even if they aren\'t in your spell repertoire.',
    implemented: 'full',
    traits: ['Divine', 'Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline that grants divine spells'],
    mechanics:
      'Gain 1 extra spell slot at highest rank. Usable only for heal or harm, even if not in repertoire.',
  },
  {
    id: 'sorcerer-occult-evolution',
    name: 'Occult Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'You draw power from the obscure secrets of the universe. You become trained in one skill of your choice. Additionally, once per day, you can spend 1 minute to choose one mental occult spell you don\'t know and add it to your spell repertoire. You lose this temporary spell the next time you make your daily preparations (though you can use this ability to add it again later).',
    implemented: 'full',
    traits: ['Occult', 'Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline that grants occult spells'],
    mechanics:
      'Gain trained in one skill. Once per day (1 min), add one mental occult spell to repertoire temporarily (lost at daily prep).',
    subChoices: { label: 'Choose skill to train', options: SKILL_OPTIONS },
  },
  {
    id: 'sorcerer-primal-evolution',
    name: 'Primal Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'You can call upon the creatures of the wild for aid. You gain an additional spell slot of your highest rank, which you can use only to cast summon animal or summon plant or fungus. You can cast either of these spells using that spell slot, even if they aren\'t in your spell repertoire.',
    implemented: 'full',
    traits: ['Primal', 'Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline that grants primal spells'],
    mechanics:
      'Gain 1 extra spell slot at highest rank. Usable only for summon animal or summon plant or fungus, even if not in repertoire.',
  },
  {
    id: 'sorcerer-split-shot',
    name: 'Split Shot',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'You fragment a ranged spell. If your next action is to Cast a Spell without a duration that requires an attack roll against a single target, you can choose a second target within range. You roll a single attack roll and compare the result to the AC of both targets. This counts as one attack for your multiple attack penalty. To the second target, the spell deals half the amount of damage it would normally deal and has no effects beyond the spell\'s initial damage (such as imposing conditions or penalties).',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next spell attack (single target, no duration) → add second target. Single attack roll vs both ACs. Second target takes half damage, no conditions. Counts as one attack for MAP.',
  },
  {
    id: 'sorcerer-elaborate-flourish',
    name: 'Elaborate Flourish',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'You embellish your spellcasting with entrancing flourishes and grand pronouncements, making it harder to identify or counter. If the next action you use is to Cast a Spell, creatures with the ability to Cast that Spell don\'t automatically know what the spell is. In addition, creatures that witness your spellcasting take a –2 circumstance penalty to checks to identify the spell with Recall Knowledge and checks to counteract the spell during its casting.',
    implemented: 'full',
    traits: ['Concentrate', 'Manipulate', 'Metamagic', 'Sorcerer'],
    actionCost: 1,
    mechanics:
      'Next Cast a Spell: prevents auto-identification, –2 circumstance penalty to Recall Knowledge identification and counteract checks during casting.',
  },
  {
    id: 'sorcerer-bespell-strikes',
    name: 'Bespell Strikes',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'You siphon spell energy into one weapon you\'re wielding, or into one of your unarmed attacks, such as a fist. Until the end of your turn, the weapon or unarmed attack deals an extra 1d6 force damage and gains the associated trait if it didn\'t have it already. If the spell dealt a different type of damage, the Strike deals this type of damage instead. Special: Your strike gains the trait of your bloodline\'s magical tradition.',
    implemented: 'full',
    traits: ['Oracle', 'Sorcerer', 'Wizard'],
    actionCost: 'free',
    prerequisites: ['Your most recent action was to cast a non-cantrip spell.'],
    mechanics:
      'Free action, once per turn. After casting non-cantrip spell, one wielded weapon or unarmed attack gains +1d6 force damage (or spell\'s damage type) until end of turn. Sorcerer special: strike gains bloodline tradition trait.',
  },
  {
    id: 'sorcerer-irezoko-tattoo',
    name: 'Irezoko Tattoo',
    source: 'Sorcerer',
    category: 'class',
    level: 4,
    description:
      'Your face bears an intricate magical tattoo known as the irezoko, a badge of your understanding of your chosen field of magic and a recognition of your advancement within Absalom\'s College of Mysteries. Choose a class that you are a member of that grants you access to a focus pool. When you take this feat, it gains the trait that applies to your chosen class. Once per day, you may concentrate upon the pattern of your irezoko to recover 1 Focus Point as a three-action activity.',
    implemented: 'full',
    traits: ['Bard', 'Champion', 'Cleric', 'Druid', 'Magus', 'Monk', 'Oracle', 'Psychic', 'Ranger', 'Sorcerer', 'Summoner', 'Uncommon', 'Witch', 'Wizard'],
    actionCost: 'passive',
    prerequisites: ['Expert in Arcana or Expert in Occultism'],
    mechanics:
      'Once per day, 3-action activity to recover 1 Focus Point. Access: Member of the College of Mysteries.',
    subChoices: { label: 'Choose a class with focus pool', options: [
      { id: 'bard', name: 'Bard' }, { id: 'champion', name: 'Champion' }, { id: 'cleric', name: 'Cleric' },
      { id: 'druid', name: 'Druid' }, { id: 'magus', name: 'Magus' }, { id: 'monk', name: 'Monk' },
      { id: 'oracle', name: 'Oracle' }, { id: 'psychic', name: 'Psychic' }, { id: 'ranger', name: 'Ranger' },
      { id: 'sorcerer', name: 'Sorcerer' }, { id: 'summoner', name: 'Summoner' }, { id: 'witch', name: 'Witch' },
      { id: 'wizard', name: 'Wizard' },
    ] },
  },

  // —— Level 6 ——————————————————————————————————————————————
  {
    id: 'sorcerer-advanced-bloodline',
    name: 'Advanced Bloodline',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'You draw more power from your bloodline. You gain the advanced bloodline spell associated with your bloodline.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline spell'],
    mechanics:
      'Gain advanced bloodline focus spell. Focus pool increases by 1 (max 3).',
  },
  {
    id: 'sorcerer-diverting-vortex',
    name: 'Diverting Vortex',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'You use vestiges of magic to create a protective vortex. Until the start of your next turn, you gain a +1 status bonus to AC against ranged weapon attacks and physical ranged unarmed attacks.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 1,
    prerequisites: ['Your most recent action was to cast a non-cantrip spell.'],
    mechanics:
      '+1 status bonus to AC vs ranged weapon attacks and physical ranged unarmed attacks until start of next turn.',
  },
  {
    id: 'sorcerer-energy-ward',
    name: 'Energy Ward',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'You convert energy from the last spell you cast into a protective ward. Until the start of your next turn, you gain resistance to one type of energy (acid, cold, electricity, fire, force, sonic, vitality, or void) equal to 4 + the rank of the spell.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'free',
    prerequisites: ['Your most recent action was to cast a non-cantrip spell that dealt energy damage.'],
    mechanics:
      'Free action, once per turn. Gain resistance to one energy type = 4 + spell rank until start of next turn. Energy types: acid, cold, electricity, fire, force, sonic, vitality, void.',
  },
  {
    id: 'sorcerer-safeguard-spell',
    name: 'Safeguard Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'You are inured to the effects of your own spells. If the next action you take is to Cast a Spell with an area, you aren\'t affected by the spell even if you are within the area.',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer', 'Spellshape'],
    actionCost: 1,
    mechanics: 'Spellshape. Next area spell does not affect you.',
  },
  {
    id: 'sorcerer-spell-relay',
    name: 'Spell Relay',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'You open the power in your blood to your ally\'s spellcasting, using your magic to boost their range. Your ally can use you as the point of origin for their spell, calculating range and cover from your space instead of their own.',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer'],
    actionCost: 'reaction',
    mechanics:
      'Trigger: An ally Casts a Spell and you are within that spell\'s range. Ally uses your space as origin for range and cover.',
  },
  {
    id: 'sorcerer-energetic-resonance',
    name: 'Energetic Resonance',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'Your blood resonates with magical energy, mitigating the effects of harmful spells. Expend one of your spell slots of a level equal to or higher than that of the triggering spell. You gain resistance to one of the triggering effect\'s damage types equal to twice the expended spell slot\'s level.',
    implemented: 'full',
    traits: ['Abjuration', 'Sorcerer'],
    actionCost: 'reaction',
    prerequisites: ['You have an unexpended spell slot of a level equal to or higher than the triggering spell.'],
    mechanics:
      'Trigger: You would take acid, cold, electricity, fire, or sonic damage from a spell. Expend a spell slot ≥ triggering spell rank. Gain resistance to one triggering damage type = 2 × expended slot rank.',
  },
  {
    id: 'sorcerer-steady-spellcasting',
    name: 'Steady Spellcasting',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'You don\'t lose spells easily. If a reaction would disrupt your spellcasting action, attempt a DC 15 flat check. If you succeed, your action isn\'t disrupted.',
    implemented: 'full',
    traits: ['Bard', 'Cleric', 'Druid', 'Oracle', 'Psychic', 'Sorcerer', 'Witch', 'Wizard'],
    actionCost: 'passive',
    mechanics: 'When a reaction would disrupt your Cast a Spell, DC 15 flat check to avoid disruption.',
  },
  {
    id: 'sorcerer-detonating-spell',
    name: 'Detonating Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'Your spell becomes volatile and explosive. If the next action you use is to Cast a Spell that deals damage to a single target and the spell successfully damages that target, the spell explodes, dealing splash damage equal to the level of the spell cast to adjacent creatures. Unlike normally, this splash damage doesn\'t apply to the target. The splash damage dealt is of the same type the spell deals.',
    implemented: 'full',
    traits: ['Cleric', 'Concentrate', 'Oracle', 'Sorcerer', 'Uncommon', 'Witch', 'Wizard', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Uncommon (Knights of Lastwall access). Spellshape. Next single-target damage spell → on hit, splash damage = spell rank to adjacent creatures (same damage type). Splash does not hit primary target.',
  },
  {
    id: 'sorcerer-divine-emissary',
    name: 'Divine Emissary',
    source: 'Sorcerer',
    category: 'class',
    level: 6,
    description:
      'Your familiar is a divine emissary, sent to you by your deity or patron and infused with celestial powers. You can select one additional familiar ability each day, which must be one of the following divine emissary familiar abilities: Erudite (gains reaction to Aid on Religion checks, auto-succeeds or auto-crits if you\'re a master), Luminous (sheds bright light 30 ft / dim 30 ft, can toggle), Medic (casts 1-action heal once per day at 2 ranks lower than your highest slot; requires 3rd-rank slots), Radiant (resistance to evil and void = half your level).',
    implemented: 'full',
    traits: ['Sorcerer', 'Uncommon', 'Witch'],
    actionCost: 'passive',
    prerequisites: ['a familiar, you follow a good-aligned deity or patron'],
    mechanics:
      'Uncommon (Knights of Lastwall access). +1 familiar ability per day from divine emissary list: Erudite, Luminous, Medic, Radiant. Only one divine emissary ability at a time.',
    subChoices: { label: 'Choose divine emissary ability', options: [
      { id: 'erudite', name: 'Erudite', description: 'Reaction to Aid on Religion checks; auto-succeed/crit if master' },
      { id: 'luminous', name: 'Luminous', description: 'Sheds bright light 30 ft / dim 30 ft, toggleable' },
      { id: 'medic', name: 'Medic', description: 'Casts 1-action heal once per day (2 ranks lower than highest slot)' },
      { id: 'radiant', name: 'Radiant', description: 'Resistance to evil and void equal to half your level' },
    ] },
  },

  // —— Level 8 ——————————————————————————————————————————————
  {
    id: 'sorcerer-bloodline-resistance',
    name: 'Bloodline Resistance',
    source: 'Sorcerer',
    category: 'class',
    level: 8,
    description:
      'Your magical blood makes you more resistant to magic. You gain a +1 status bonus to saving throws against spells and magical effects.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: '+1 status bonus to all saving throws vs spells and magical effects.',
  },
  {
    id: 'sorcerer-crossblooded-evolution',
    name: 'Crossblooded Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 8,
    description:
      'Odd interactions in your bloodline provide you with unexpected effects. Choose another bloodline. You know the blood magic effect of that bloodline. If the blood magic effect has a variable effect based on a choice you would have made at 1st level (such as the elemental bloodline\'s elemental influence), you make that decision when you take this feat.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Choose a second bloodline. Learn its blood magic effect. Variable choices (e.g. elemental type) made at feat selection.',
    subChoices: { label: 'Choose a bloodline', options: [
      { id: 'aberrant', name: 'Aberrant' },
      { id: 'angelic', name: 'Angelic' },
      { id: 'demonic', name: 'Demonic' },
      { id: 'diabolic', name: 'Diabolic' },
      { id: 'draconic', name: 'Draconic' },
      { id: 'elemental', name: 'Elemental' },
      { id: 'fey', name: 'Fey' },
      { id: 'genie', name: 'Genie' },
      { id: 'hag', name: 'Hag' },
      { id: 'imperial', name: 'Imperial' },
      { id: 'nymph', name: 'Nymph' },
      { id: 'psychopomp', name: 'Psychopomp' },
      { id: 'shadow', name: 'Shadow' },
      { id: 'undead', name: 'Undead' },
    ] },
  },
  {
    id: 'sorcerer-explosion-of-power',
    name: 'Explosion of Power',
    source: 'Sorcerer',
    category: 'class',
    level: 8,
    description:
      'Your magic explodes. You know the following blood magic effect. Blood Magic — Explosion of Power: Raw power explodes outward from you. Each creature within a 5-foot emanation takes 1d6 damage per rank of the spell you just cast (basic Reflex save). The type of damage depends on the tradition of your bloodline: arcane → force, divine → spirit, occult → mental, primal → fire.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Learn blood magic effect: Explosion of Power. 5-ft emanation, 1d6 per spell rank, basic Reflex. Damage type by tradition: arcane=force, divine=spirit, occult=mental, primal=fire.',
  },
  {
    id: 'sorcerer-soulsight',
    name: 'Soulsight',
    source: 'Sorcerer',
    category: 'class',
    level: 8,
    description:
      'Your muse has opened your senses to the world beyond. You gain spiritsense as an imprecise sense with a range of 60 feet. Spiritsense enables you to sense the spirits of creatures, including living creatures, most non-mindless undead, and haunts within the listed range. As with your hearing and other imprecise senses, you still need to Seek to locate an undetected creature. It can detect spirits projected by spells such as project image or possessing otherwise soulless objects. It can\'t detect soulless bodies, constructs, or objects, and like most senses, it doesn\'t penetrate through solid objects.',
    implemented: 'full',
    traits: ['Bard', 'Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Gain spiritsense (imprecise, 60 ft). Detects spirits of living creatures, non-mindless undead, haunts, projected spirits. Cannot detect constructs, soulless bodies/objects.',
  },
  {
    id: 'sorcerer-chaotic-spell',
    name: 'Chaotic Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 8,
    description:
      'This is the secret of chaotic magic — your foe can hardly predict and counter your moves if you yourself have no idea what will happen. If the next action you use is to Cast a Spell that deals acid, cold, electricity, fire, or sonic damage, roll a d6. The spell\'s damage type changes to the result: 1 (Acid) Sickened 1; 2 (Cold) –10-foot penalty to all Speeds until end of your next turn; 3 (Electricity) Off-guard until end of your next turn; 4 (Fire) Persistent fire damage equal to the spell\'s level; 5 (Force) No added effect; 6 (Sonic) Deafened for 2 rounds.',
    implemented: 'full',
    traits: ['Bard', 'Manipulate', 'Oracle', 'Sorcerer', 'Uncommon', 'Witch', 'Wizard', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Uncommon (Wake the Dead access). Spellshape. Next energy damage spell → d6 changes damage type and adds effect: 1=acid+sickened 1, 2=cold+speed penalty, 3=electricity+off-guard, 4=fire+persistent fire, 5=force, 6=sonic+deafened 2 rounds.',
  },
  {
    id: 'sorcerer-helts-spelldance',
    name: "Helt's Spelldance",
    source: 'Sorcerer',
    category: 'class',
    level: 8,
    description:
      'Ranik Helt knows a special technique to hide his spells as part of a performance. Attempt a Performance check against all observers\' Perception DCs. Then, Stride once or twice. During this movement, you don\'t trigger reactions that are triggered by your movement from the creatures against which you succeeded on your Performance check. After your movement, you can Cast a Spell. If you used one Stride, you can cast a 1-action or 2-action spell; if you used two Strides, you can only cast a 1-action spell. If you critically succeed against any creature, they take a –1 circumstance penalty to saves against the spell.',
    implemented: 'full',
    traits: ['Bard', 'Sorcerer', 'Uncommon', 'Witch', 'Wizard'],
    actionCost: 3,
    prerequisites: ['expert in Performance'],
    mechanics:
      'Uncommon (Firebrands access). 3 actions: Performance vs Perception DCs → Stride 1-2 times (no movement reactions vs succeeded targets) → Cast a Spell (2-action if 1 Stride, 1-action if 2 Strides). Crit success → –1 circumstance to saves. Temp immune 10 min.',
  },

  // —— Level 10 —————————————————————————————————————————————
  {
    id: 'sorcerer-energy-fusion',
    name: 'Energy Fusion',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'You fuse two spells together, combining their energy types. If the next action you use is to Cast a Spell that deals energy damage, select a non-cantrip spell in your spell repertoire that deals a different type of energy damage, and expend an additional spell slot of the same rank as this secondary spell. The spell you cast deals additional damage equal to the rank of the secondary spell slot expended. The spell\'s total damage is divided evenly between the energy type of the spell you cast and the energy type of the secondary spell.',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next energy damage spell → expend additional slot of secondary spell rank. +damage = secondary slot rank. Total damage split evenly between two energy types.',
  },
  {
    id: 'sorcerer-greater-bloodline',
    name: 'Greater Bloodline',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'You uncover the greater secrets of your bloodline. You gain the greater bloodline spell associated with your bloodline.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline spell'],
    mechanics:
      'Gain greater bloodline focus spell. Focus pool increases by 1 (max 3).',
  },
  {
    id: 'sorcerer-signature-spell-expansion',
    name: 'Signature Spell Expansion',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'Your innate connection to magic lets you cast more spells with greater freedom. You gain two additional signature spells, each of which must have a base rank of 3rd or lower.',
    implemented: 'full',
    traits: ['Psychic', 'Sorcerer'],
    actionCost: 'passive',
    mechanics: '+2 signature spells (base rank ≤ 3rd).',
  },
  {
    id: 'sorcerer-ancestral-mage',
    name: 'Ancestral Mage',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'The magic of your ancestry and bloodline are one and the same. Add any innate spells you have from a heritage or an ancestry feat to your spell repertoire, meaning you can cast them using your spell slots.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Ancestral Blood Magic'],
    mechanics:
      'Add all innate spells from heritage/ancestry feats to spell repertoire. Cast them using spell slots.',
  },
  {
    id: 'sorcerer-quickened-casting',
    name: 'Quickened Casting',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'If your next action is to cast a cantrip or a spell that is at least 2 ranks lower than the highest-rank spell slot you have, reduce the number of actions to cast it by 1 (minimum 1 action).',
    implemented: 'full',
    traits: ['Bard', 'Concentrate', 'Oracle', 'Sorcerer', 'Spellshape', 'Witch', 'Wizard'],
    actionCost: 'free',
    mechanics:
      'Free action, once per day. Next cantrip or spell ≥ 2 ranks below max slot → reduce action cost by 1 (min 1). Special: only for sorcerer spells.',
  },
  {
    id: 'sorcerer-overwhelming-energy',
    name: 'Overwhelming Energy',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'With a complex gesture, you call upon the primal power of your spell to overcome enemies\' resistances. If the next action you use is to Cast a Spell, the spell ignores an amount of the target\'s resistance to acid, cold, electricity, fire, or sonic damage equal to your level. This applies to all damage the spell deals, including persistent damage and damage caused by an ongoing effect of the spell, such as the wall created by wall of fire. A creature\'s immunities are unaffected.',
    implemented: 'full',
    traits: ['Druid', 'Manipulate', 'Sorcerer', 'Spellshape', 'Wizard'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next spell ignores energy resistance (acid/cold/electricity/fire/sonic) up to your level. Applies to all spell damage including persistent and ongoing. Does not affect immunities.',
  },
  {
    id: 'sorcerer-consecrate-spell',
    name: 'Consecrate Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 10,
    description:
      'You infuse a spell with the power of your faith, consecrating it. If the next action you use is to Cast a Spell that targets a single undead, you can expend a Focus Point, channeling the power of your focus spells into the primary spell. If you do, the spell you cast deals additional spirit or vitality damage (your choice) equal to the level of your focus spells. As normal for additional damage, this is doubled on a critical hit or critical failure on a save.',
    implemented: 'full',
    traits: ['Cleric', 'Concentrate', 'Oracle', 'Sorcerer', 'Uncommon', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['ability to cast focus spells, divine spells'],
    mechanics:
      'Uncommon (Knights of Lastwall access). Spellshape. Next single-target spell vs undead → expend 1 Focus Point → +spirit or vitality damage = focus spell level. Doubled on crit.',
  },

  // —— Level 12 —————————————————————————————————————————————
  {
    id: 'sorcerer-blood-component-substitution',
    name: 'Blood Component Substitution',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'You can bypass the need for incantations and gestures by drawing energy directly from your blood, causing you to visibly glow the color of your blood and crackle with magical energy. When you Cast a Spell, you can replace all verbal, material, or somatic spellcasting components with a blood component. To use a blood component, you lose Hit Points equal to twice the spell\'s rank as the energy in your blood is depleted, and you can\'t decrease the Hit Points lost in any way. Your Cast a Spell activity gains the concentrate trait but not the manipulate trait. You can\'t use blood components to replace any required part of a spell\'s cost.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'When casting, replace verbal/material/somatic components with blood component. Lose HP = 2 × spell rank (can\'t reduce). Gains concentrate trait, loses manipulate trait. Cannot replace spell costs.',
  },
  {
    id: 'sorcerer-blood-sovereignty',
    name: 'Blood Sovereignty',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'You wield blood magic masterfully. When you would benefit from a blood magic effect, you can choose to lose Hit Points equal to twice the spell\'s rank as the energy of your blood is drawn out. This takes no extra action, and you benefit from two different blood magic effects you know as a result. The two effects can have different targets.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'When gaining a blood magic effect, optionally lose HP = 2 × spell rank to benefit from TWO different blood magic effects instead of one. Different targets allowed.',
  },
  {
    id: 'sorcerer-bloodline-focus',
    name: 'Bloodline Focus',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'By listening to the beating of your heart, your focus recovers faster. Whenever you Refocus, completely refill your focus pool.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['bloodline spell'],
    mechanics: 'Refocus → fully refill focus pool (all Focus Points recovered).',
  },
  {
    id: 'sorcerer-greater-physical-evolution',
    name: 'Greater Physical Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'You change form readily. Once per day, you can use a sorcerer spell slot to cast any common polymorph battle form spell of the spell slot\'s rank as if it were a signature spell in your repertoire. You can use the extra spell slot from either Arcane Evolution or Primal Evolution instead of a sorcerer spell slot.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Primal Evolution or Arcane Evolution'],
    mechanics:
      'Once per day, cast any common polymorph battle form spell using a sorcerer spell slot (or extra slot from Arcane/Primal Evolution) as if it were a signature spell.',
  },
  {
    id: 'sorcerer-greater-spiritual-evolution',
    name: 'Greater Spiritual Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'Your magical blood allows your spells to be fully effective against incorporeal creatures. Your spells have the effects of a ghost touch property rune. They can target or affect a creature projecting its consciousness (such as via project image) or possessing another creature, even if its body is elsewhere, though you must know about the possession or projection and choose to do so. Your spells can affect creatures on the Ethereal Plane, though this doesn\'t grant you the ability to locate them.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Divine Evolution or Occult Evolution'],
    mechanics:
      'All spells gain ghost touch effect. Can target projected/possessing creatures if aware. Spells affect Ethereal Plane creatures (but no locating ability).',
  },
  {
    id: 'sorcerer-magic-sense',
    name: 'Magic Sense',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'You have a literal sixth sense for ambient magic in your vicinity. You can sense the presence of magic auras as though you were always using a 1st-rank detect magic spell. This detects magic in your field of vision only. When you Seek, you gain the benefits of a 3rd-rank detect magic spell on things you see (in addition to the normal benefits of Seeking). You can turn this sense off and on with a free action at the start or the end of your turn.',
    implemented: 'full',
    traits: ['Arcane', 'Detection', 'Magus', 'Oracle', 'Sorcerer', 'Wizard'],
    actionCost: 'passive',
    mechanics:
      'Constant 1st-rank detect magic in field of vision. When Seeking, 3rd-rank detect magic on things you see. Free action toggle on/off at start or end of turn.',
  },
  {
    id: 'sorcerer-shared-sight',
    name: 'Shared Sight',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'You bestow the mystical vision granted to you by your muse upon your allies. If your next action is to cast a non-cantrip spell that affects one or more of your allies, all affected allies gain your spiritsense for 1 minute.',
    implemented: 'full',
    traits: ['Bard', 'Concentrate', 'Metamagic', 'Sorcerer', 'Uncommon'],
    actionCost: 1,
    prerequisites: ['Soulsight'],
    mechanics:
      'Uncommon (Knights of Lastwall access). Metamagic. Next non-cantrip spell affecting allies → affected allies gain spiritsense for 1 minute.',
  },
  {
    id: 'sorcerer-terraforming-trickery',
    name: 'Terraforming Trickery',
    source: 'Sorcerer',
    category: 'class',
    level: 12,
    description:
      'You know how to channel the transformative aspects of your blood magic to alter your surroundings. You know the following blood magic effect. Blood Magic — Terraforming Trickery: Either each space adjacent to you becomes difficult terrain, or each space adjacent to you is no longer difficult terrain. This doesn\'t have any effect on greater difficult terrain and doesn\'t remove the damaging effects of hazardous terrain.',
    implemented: 'full',
    traits: ['Concentrate', 'Earth', 'Sorcerer'],
    actionCost: 1,
    mechanics:
      'Learn blood magic effect: Terraforming Trickery. Toggle adjacent spaces to/from difficult terrain. Does not affect greater difficult terrain or hazardous terrain damage.',
  },

  // —— Level 14 —————————————————————————————————————————————
  {
    id: 'sorcerer-blood-ascendancy',
    name: 'Blood Ascendancy',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'When you would benefit from a blood magic effect through Blood Rising, you can choose to benefit from two different blood magic effects you know. The effects follow the same rules as given in Blood Rising, and each effect can have a different target.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Blood Rising'],
    mechanics:
      'Blood Rising now grants two different blood magic effects you know instead of one. Different targets allowed. Same Blood Rising rules apply.',
  },
  {
    id: 'sorcerer-consume-spell',
    name: 'Consume Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'When you successfully Counterspell a spell of the tradition that matches your bloodline, you consume it, replenishing yourself with its energy. When you do, you are nourished as if you had eaten a meal and regain Hit Points equal to twice the rank of the counteracted spell.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Counterspell'],
    mechanics:
      'On successful Counterspell (same tradition as bloodline), gain nourishment + heal HP = 2 × counteracted spell rank.',
  },
  {
    id: 'sorcerer-interweave-dispel',
    name: 'Interweave Dispel',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'You weave dispelling energy into a spell. If your next action is to cast a single-target spell against an enemy, and you either hit the enemy with the spell attack roll or the enemy fails its saving throw, you can cast dispel magic on the enemy as a free action, expending a spell slot as normal and targeting one spell effect affecting the enemy.',
    implemented: 'full',
    traits: ['Sorcerer', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['dispel magic in your spell repertoire'],
    mechanics:
      'Spellshape. Next single-target spell vs enemy → on hit/failed save, cast dispel magic as free action (expending a slot) targeting one spell effect on that enemy.',
  },
  {
    id: 'sorcerer-purifying-breeze',
    name: 'Purifying Breeze',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'You transfer the divine essence of your magic to the air around you, cleansing it of toxins. Attempt a counteract check against each airborne disease or poison effect in a 15-foot radius around you. Regardless of your success or failure, until the beginning of your next turn, all creatures in the purified area gain a +1 status bonus to Fortitude saving throws.',
    implemented: 'full',
    traits: ['Cleric', 'Oracle', 'Sorcerer', 'Uncommon'],
    actionCost: 1,
    prerequisites: ['divine spells; your most recent action was to cast a non-cantrip spell with the healing trait'],
    mechanics:
      'Uncommon (Knights of Lastwall access). Counteract airborne disease/poison in 15-ft radius. All creatures in area gain +1 status to Fort saves until start of next turn.',
  },
  {
    id: 'sorcerer-reflect-harm',
    name: 'Reflect Harm',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'You can wrap your magic around you like a cloak that causes those who dare to target you with spells to suffer a similar fate. You know the following blood magic effect. Blood Magic — Reflect Harm: Your blood ensures that those who harm you with magic are harmed in return. The first time you take damage from a spell before the beginning of your next turn, attempt a spell attack roll against the creature who cast the triggering spell. On a hit, the creature takes the same amount and type of damage that you just took. If you critically hit, the creature takes twice the damage.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics:
      'Learn blood magic effect: Reflect Harm. First spell damage before next turn → spell attack vs caster. Hit = reflect same damage. Crit = double reflected damage.',
  },
  {
    id: 'sorcerer-reflect-spell',
    name: 'Reflect Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'When you successfully use Counterspell to counteract a spell that affects targeted creatures or an area, you can turn that spell\'s effect back on its caster. When reflected, the spell affects only the original caster, even if it\'s an area spell or it would normally affect more than one creature. The original caster can attempt a save and use other defenses against the reflected spell as normal.',
    implemented: 'full',
    traits: ['Sorcerer', 'Witch', 'Wizard'],
    actionCost: 'passive',
    prerequisites: ['Counterspell'],
    mechanics:
      'On successful Counterspell of a targeted/area spell, reflect it back on original caster only. Caster can save/defend normally.',
  },
  {
    id: 'sorcerer-spell-shroud',
    name: 'Spell Shroud',
    source: 'Sorcerer',
    category: 'class',
    level: 14,
    description:
      'Your spell shrouds you in a billowing cloud. If your next action is to Cast a Spell that targets you, you surround yourself in a 15-foot emanation of dense magical mist that lasts until the start of your next turn. All creatures within the cloud become concealed, and all creatures outside the cloud are concealed to creatures within it.',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next self-targeting spell → 15-ft emanation of mist until start of next turn. All within concealed; all outside concealed to those within.',
  },

  // —— Level 16 —————————————————————————————————————————————
  {
    id: 'sorcerer-effortless-concentration',
    name: 'Effortless Concentration',
    source: 'Sorcerer',
    category: 'class',
    level: 16,
    description:
      'You can maintain a spell with hardly a thought. You immediately gain the effects of the Sustain action, allowing you to extend the duration of one of your active spells.',
    implemented: 'full',
    traits: ['Bard', 'Druid', 'Sorcerer', 'Summoner', 'Witch', 'Wizard'],
    actionCost: 'free',
    mechanics:
      'Free action. Trigger: Your turn begins. Sustain one active spell. Special: only for sorcerer cantrips/spells.',
  },
  {
    id: 'sorcerer-greater-mental-evolution',
    name: 'Greater Mental Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 16,
    description:
      'Your bloodline\'s deep connection to mental essence greatly enhances your spell repertoire. Add one spell to your spell repertoire for each spell rank you can cast.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Arcane Evolution or Occult Evolution'],
    mechanics:
      'Add 1 spell to repertoire per spell rank you can cast. Permanent repertoire expansion.',
  },
  {
    id: 'sorcerer-greater-vital-evolution',
    name: 'Greater Vital Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 16,
    description:
      'Vital power surges through you like a font of energy. Twice per day, you can cast a spell after you\'ve run out of spell slots of the appropriate spell rank; the two spells you cast with this feat must be of different spell ranks.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Primal Evolution or Divine Evolution'],
    mechanics:
      'Twice per day, cast a spell even with no slots of that rank remaining. Each use must be a different spell rank.',
  },
  {
    id: 'sorcerer-scintillating-spell',
    name: 'Scintillating Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 16,
    description:
      'Your spells become a radiant display of light and color. If your next action is to Cast a Spell that doesn\'t have the darkness trait, has no duration, and requires creatures to attempt a Reflex save, the spell explodes in a spray of scintillating lights, in addition to its other effects. Each creature that failed its Reflex save against the spell is dazzled for 1 round, and those who critically failed are instead blinded for 1 round.',
    implemented: 'full',
    traits: ['Concentrate', 'Light', 'Sorcerer', 'Spellshape', 'Wizard'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next non-darkness, no-duration, Reflex-save spell → failed save = dazzled 1 round, crit failed = blinded 1 round.',
  },
  {
    id: 'sorcerer-terraforming-spell',
    name: 'Terraforming Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 16,
    description:
      'You capture transformative fragments of magic and slam them into the ground, creating a shock wave that alters your surroundings. If your next action is to Cast a non-cantrip transmutation Spell, either each space adjacent to you becomes difficult terrain, or each space adjacent to you is no longer difficult terrain. This doesn\'t have any effect on greater difficult terrain and doesn\'t remove the damaging effects of hazardous terrain.',
    implemented: 'full',
    traits: ['Concentrate', 'Earth', 'Metamagic', 'Sorcerer', 'Transmutation'],
    actionCost: 1,
    mechanics:
      'Legacy feat. Metamagic. Next non-cantrip transmutation spell → toggle adjacent spaces to/from difficult terrain. No effect on greater difficult terrain or hazardous terrain damage.',
  },

  // —— Level 18 —————————————————————————————————————————————
  {
    id: 'sorcerer-bloodline-wellspring',
    name: 'Bloodline Wellspring',
    source: 'Sorcerer',
    category: 'class',
    level: 18,
    description:
      'Your blood\'s power replenishes your focus. If you have spent at least 3 Focus Points since the last time you Refocused, you recover 3 Focus Points when you Refocus instead of 1.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Bloodline Focus'],
    mechanics:
      'Legacy feat. If 3+ Focus Points spent since last Refocus → recover 3 FP on Refocus. Largely superseded by PC2 Bloodline Focus which already fully refills.',
  },
  {
    id: 'sorcerer-echoing-spell',
    name: 'Echoing Spell',
    source: 'Sorcerer',
    category: 'class',
    level: 18,
    description:
      'You time the components of your spell with exacting precision, setting up a resonance that duplicates the spell\'s effects. If your next action is to Cast a Spell of 4th rank or lower that has no duration, the spell\'s energy reverberates and echoes. You can Cast the Spell a second time before the end of your next turn without expending a spell slot.',
    implemented: 'full',
    traits: ['Concentrate', 'Sorcerer', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Spellshape. Next spell of rank ≤ 4 with no duration → can recast it for free before end of next turn (no slot expended).',
  },
  {
    id: 'sorcerer-greater-crossblooded-evolution',
    name: 'Greater Crossblooded Evolution',
    source: 'Sorcerer',
    category: 'class',
    level: 18,
    description:
      'Your bloodline is extraordinarily complex. Choose up to three of the sorcerous gift spells granted by your secondary bloodline. You add these spells to your spell repertoire, heightened to the highest rank of spells you can cast or to the highest rank they can be heightened to that is lower than the highest rank of spells you can cast. You cast these spells as the tradition from your primary bloodline.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['Crossblooded Evolution'],
    mechanics:
      'Choose up to 3 sorcerous gift spells from secondary bloodline. Add to repertoire heightened to highest castable rank (or their max if lower). Cast as primary tradition.',
  },

  // —— Level 20 —————————————————————————————————————————————
  {
    id: 'sorcerer-bloodline-conduit',
    name: 'Bloodline Conduit',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'Your inborn magical nature lets you redirect ambient energies to fuel your spells. If your next action is to Cast a Spell of 5th rank or lower that has no duration, you don\'t expend the spell\'s slot when you cast it.',
    implemented: 'full',
    traits: ['Sorcerer', 'Spellshape'],
    actionCost: 1,
    mechanics:
      'Spellshape. Once per minute. Next spell ≤ 5th rank with no duration → free cast (no slot expended).',
  },
  {
    id: 'sorcerer-bloodline-metamorphosis',
    name: 'Bloodline Metamorphosis',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'You have learned to manipulate the innate power of your bloodline and adapt it to your needs. When making your daily preparations, you can swap out a single spell of 9th rank or lower for another spell of the same rank. You can\'t swap out spells granted specifically by your bloodline.',
    implemented: 'full',
    traits: ['Sorcerer', 'Uncommon'],
    actionCost: 'passive',
    mechanics:
      'Uncommon (Paragons of Promise / Age of Ashes). Daily prep: swap one spell ≤ 9th rank for another of same rank. Cannot swap bloodline-granted spells.',
  },
  {
    id: 'sorcerer-bloodline-mutation',
    name: 'Bloodline Mutation',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'You permanently mutate to become more like the creatures of your bloodline. You gain the appropriate trait or traits for those types of creatures (aberration for aberrant, angel and celestial for angelic, demon and fiend for demonic, and so on). You gain low-light vision or darkvision, if one is appropriate for creatures with those traits. Choose one of the following: If the creatures associated with your bloodline can fly, you gain a fly Speed equal to your land Speed. If the creatures are aquatic or amphibious, you become amphibious and gain a swim Speed equal to your land Speed. If creatures have a resistance or immunity to acid, cold, electricity, fire, void, or sonic, choose one and gain resistance 20 against it.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    prerequisites: ['a bloodline based on a specific type of creature'],
    mechanics:
      'Gain creature traits of bloodline type. Gain low-light vision or darkvision as appropriate. Choose: fly Speed = land Speed, OR swim Speed = land Speed + amphibious, OR resistance 20 to one energy type the bloodline\'s creatures are resistant/immune to.',
    subChoices: { label: 'Choose a mutation benefit', options: [
      { id: 'fly-speed', name: 'Fly Speed', description: 'Gain fly Speed equal to land Speed' },
      { id: 'swim-speed', name: 'Swim Speed + Amphibious', description: 'Gain swim Speed equal to land Speed and amphibious trait' },
      { id: 'resistance-20', name: 'Energy Resistance 20', description: 'Gain resistance 20 to one energy type from bloodline' },
    ] },
  },
  {
    id: 'sorcerer-bloodline-perfection',
    name: 'Bloodline Perfection',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'You command the ultimate powers of your bloodline and tradition. You gain an additional 10th-rank spell slot.',
    implemented: 'full',
    traits: ['Sorcerer'],
    actionCost: 'passive',
    mechanics: 'Gain a second 10th-rank spell slot (requires Bloodline Paragon).',
  },
  {
    id: 'sorcerer-ruby-resurrection',
    name: 'Ruby Resurrection',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'In a burst of flame, you return to health like a phoenix rising from the ashes. Change your current Hit Points to 30 and cast a 6th-rank fireball centered on yourself. This fireball doesn\'t affect you. Your hair turns brilliant red for 1 hour. If you haven\'t used Ruby Resurrection and you die, you stay in initiative order and Ruby Resurrection triggers automatically at the start of your next turn, bringing you back to life at 0 HP before having its normal effects. This happens only if there are some remains to resurrect; for instance, if you were killed by disintegrate you wouldn\'t return.',
    implemented: 'full',
    traits: ['Healing', 'Necromancy', 'Sorcerer', 'Uncommon'],
    actionCost: 'reaction',
    mechanics:
      'Uncommon (Fists of the Ruby Phoenix). Reaction, once per day. Trigger: reduced to 0 HP. Set HP to 30, cast 6th-rank fireball on self (doesn\'t affect you). If unused and you die, auto-triggers at start of next turn (revive at 0 HP, then effects). Requires remains exist. Special: gains bloodline tradition trait.',
  },
  {
    id: 'sorcerer-spellshape-mastery',
    name: 'Spellshape Mastery',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'Your mastery of magic ensures that you can alter your spells just as easily as you can cast them normally. You can use spellshape single actions as free actions.',
    implemented: 'full',
    traits: ['Sorcerer', 'Wizard'],
    actionCost: 'passive',
    mechanics: 'All spellshape single actions become free actions.',
  },
  {
    id: 'sorcerer-tenacious-blood-magic',
    name: 'Tenacious Blood Magic',
    source: 'Sorcerer',
    category: 'class',
    level: 20,
    description:
      'You have learned how to invest magic more deeply. The triggering blood magic effect lasts for 1 minute instead of 1 round.',
    implemented: 'full',
    traits: ['Sorcerer', 'Uncommon'],
    actionCost: 'free',
    mechanics:
      'Uncommon (Extinction Curse). Free action, once per minute. Trigger: You apply a blood magic effect that lasts 1 round. Extend it to 1 minute instead.',
  },
];

export const SORCERER_CLASS_FEATS: FeatEntry[] = RAW_SORCERER_CLASS_FEATS.map(f => ({
  ...f,
  traits: f.traits ?? ['Sorcerer'],
}));
