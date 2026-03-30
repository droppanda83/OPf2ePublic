import type { FeatEntry } from './featTypes';
import { createClassFeature, WEAPON_SPECIALIZATION, GREATER_WEAPON_SPECIALIZATION } from './sharedFeats';

// ──────────────────────────────────────────────────────────
// THAUMATURGE CLASS FEATURES (Automatically Granted)
// PF2e Remaster — Dark Archive (Remastered)
// Key Attribute: CHA | HP: 8 + CON
// Perception: Expert → Master (L9)
// Fort: Expert → Master (L15, Earned Resilience, success→crit)
// Reflex: Trained → Expert (L3)
// Will: Expert → Master (L7, Disciplined Mind, success→crit) → Legendary (L13, Perfected Mind, crit fail→fail, fail→half dmg)
// Weapons: Trained → Expert (L5) → Master (L13)
// Armor: Light+Med Trained → Expert (L11) → Master (L19)
// Class DC: Trained → Expert (L9) → Master (L17)
// Implements: 1st (L1) → 2nd (L5) → 3rd (L15)
// Implement Tiers: Initiate (L1) → Adept (L7) → Intensify (L9) → Paragon (L17)
// ──────────────────────────────────────────────────────────

const RAW_THAUMATURGE_CLASS_FEATURES: FeatEntry[] = [
  // —— Level 1 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-esoteric-lore',
    name: 'Esoteric Lore',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 1,
    description:
      'Your experience with the unknown has taught you about strange phenomena of every kind. You become trained in Esoteric Lore, a special lore skill that can be used to Recall Knowledge regarding haunts, curses, and creatures of any type, but that can\'t be used to Recall Knowledge of other topics. Unlike a normal Lore skill, you use Charisma as your modifier on Esoteric Lore checks. You also gain the Dubious Knowledge skill feat. At 3rd level, you become an expert in Esoteric Lore; at 7th level, you become a master in Esoteric Lore; and at 15th level, you become legendary in Esoteric Lore.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics:
      'CHA-based Lore for Recall Knowledge on haunts, curses, and creatures of any type. Proficiency: trained (L1) → expert (L3) → master (L7) → legendary (L15). Grants Dubious Knowledge feat for free.',
  },
  {
    id: 'thaumaturge-first-implement-and-esoterica',
    name: 'First Implement and Esoterica',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 1,
    description:
      'Your implement is a special object of symbolic importance: your badge as you treat with the supernatural and a powerful tool if things turn violent. Choose an implement from: Amulet, Bell, Chalice, Lantern, Mirror, Regalia, Shield, Tome, Wand, or Weapon. You begin play with a mundane item of that type, and you gain the initiate benefit for that implement. You constantly collect and carry various smaller mystic objects — your esoterica. You can draw and use esoterica with the same hand you\'re using to wield an implement.',
    implemented: 'full',
    traits: ['Esoterica', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics:
      'Choose 1 of 10 implements: Amulet (reaction to grant resistance), Bell (reaction to inflict conditions on attackers/casters), Chalice (sip for temp HP or drain to heal), Lantern (revelation aura, secret checks, status bonuses), Mirror (illusory duplicate of self), Regalia (social bonuses + inspiring aura), Shield (Shield Block + free Raise Shield on Exploit), Tome (Recall Knowledge + temp skill proficiencies), Wand (Fling Magic ranged attack), Weapon (Implement\'s Interruption reaction). Can switch implements with 1 day downtime.',
    subChoices: { label: 'Choose a first implement', options: [
      { id: 'amulet', name: 'Amulet', description: 'Reaction to grant resistance to damage' },
      { id: 'bell', name: 'Bell', description: 'Reaction to inflict conditions on attackers' },
      { id: 'chalice', name: 'Chalice', description: 'Sip for temp HP or drain to heal' },
      { id: 'lantern', name: 'Lantern', description: 'Revelation aura and status bonuses' },
      { id: 'mirror', name: 'Mirror', description: 'Illusory duplicate of yourself' },
      { id: 'regalia', name: 'Regalia', description: 'Social bonuses and inspiring aura' },
      { id: 'shield', name: 'Shield', description: 'Shield Block + free Raise Shield' },
      { id: 'tome', name: 'Tome', description: 'Recall Knowledge + temp skill proficiencies' },
      { id: 'wand', name: 'Wand', description: 'Fling Magic ranged attack' },
      { id: 'weapon', name: 'Weapon', description: "Implement's Interruption reaction" },
    ] },
  },
  {
    id: 'thaumaturge-exploit-vulnerability',
    name: 'Exploit Vulnerability',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 1,
    description:
      'You know that every creature, no matter how obscure, has a weakness. Select a creature you can see and attempt an Esoteric Lore check against a standard DC for its level. Critical Success: You learn all resistances, weaknesses, and immunities. You can use mortal weakness or personal antithesis. Strikes become magical. Success: You learn its highest weakness. You can use mortal weakness or personal antithesis. Strikes become magical. Failure: You can use only personal antithesis. Strikes become magical. Critical Failure: You become off-guard until the start of your next turn. Mortal Weakness: Your Strikes activate the creature\'s highest weakness. Personal Antithesis: The creature gains weakness to your Strikes equal to 2 + half your level.',
    implemented: 'full',
    traits: ['Esoterica', 'Manipulate', 'Thaumaturge'],
    actionCost: 1,
    mechanics:
      'Frequency: once per round. Requires holding implement. Esoteric Lore vs standard DC for creature\'s level. Lasts until you Exploit Vulnerabilities again. Mortal Weakness: Strikes trigger the creature\'s actual weakness (applies to same creature type). Personal Antithesis: custom weakness = 2 + half level (single creature only). All results except crit fail make Strikes magical.',
  },
  {
    id: 'thaumaturge-implements-empowerment',
    name: "Implement's Empowerment",
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 1,
    description:
      'The power of your implement can also be turned to the more common task of combat. When you Strike, you can trace mystic patterns with an implement you\'re holding to empower the Strike, causing it to deal 2 additional damage per weapon damage die. Channeling the power requires full use of your hands. You don\'t gain the benefit if you are holding anything in either hand other than a single one-handed weapon, other implements, or esoterica, and you must be holding at least one implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics:
      'Flat bonus damage = 2 per weapon damage die. Doesn\'t double on critical hit. Requires: one hand holds one-handed weapon, other hand holds implement/esoterica only. Stacks with Exploit Vulnerability weakness damage. Scales with striking runes (2/4/6 at 1d/2d/3d).',
  },

  // —— Level 3 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-lightning-reflexes',
    name: 'Lightning Reflexes',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 3,
    description:
      'Your reflexes are lightning fast. Your proficiency rank for Reflex saves increases to expert.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Reflex save proficiency → expert. Thaumaturge never gets Reflex beyond expert from class features.',
  },

  // —— Level 5 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-second-implement',
    name: 'Second Implement',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 5,
    description:
      'You\'ve added another implement of power to your toolkit. You choose a second implement, which must be a different type of implement than your first. You gain the initiate benefit of your new implement. While you\'re holding an implement in one hand, you can quickly switch it with another implement you\'re wearing to use an action from the implement you\'re switching to. To do so, you can Interact as a free action immediately before executing the implement\'s action.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics:
      'Gain 2nd implement (different type). Free Interact to swap implements before using an implement action. Allows flexible access to both initiate benefits.',
    subChoices: { label: 'Choose a second implement', options: [
      { id: 'amulet', name: 'Amulet', description: 'Reaction to grant resistance to damage' },
      { id: 'bell', name: 'Bell', description: 'Reaction to inflict conditions on attackers' },
      { id: 'chalice', name: 'Chalice', description: 'Sip for temp HP or drain to heal' },
      { id: 'lantern', name: 'Lantern', description: 'Revelation aura and status bonuses' },
      { id: 'mirror', name: 'Mirror', description: 'Illusory duplicate of yourself' },
      { id: 'regalia', name: 'Regalia', description: 'Social bonuses and inspiring aura' },
      { id: 'shield', name: 'Shield', description: 'Shield Block + free Raise Shield' },
      { id: 'tome', name: 'Tome', description: 'Recall Knowledge + temp skill proficiencies' },
      { id: 'wand', name: 'Wand', description: 'Fling Magic ranged attack' },
      { id: 'weapon', name: 'Weapon', description: "Implement's Interruption reaction" },
    ] },
  },
  {
    id: 'thaumaturge-weapon-expertise',
    name: 'Weapon Expertise',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 5,
    description:
      'You\'ve learned the secret ways your weapons work most effectively. Your proficiency ranks for unarmed attacks, simple weapons, and martial weapons increase to expert.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Unarmed/simple/martial proficiency → expert. Weapon implement also grants its weapon\'s critical specialization effect at this level.',
  },

  // —— Level 7 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-disciplined-mind',
    name: 'Disciplined Mind',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 7,
    description:
      'You\'ve steeled your mind with resolve. Your proficiency rank for Will saves increases to master. When you roll a success on a Will save, you get a critical success instead.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Will save proficiency → master. Success → critical success on Will saves. Upgraded to legendary at L13 by Perfected Mind.',
  },
  {
    id: 'thaumaturge-implement-adept',
    name: 'Implement Adept',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 7,
    description:
      'You have deepened your connection to one of your implements, unlocking its adept power. Choose one of your implements and gain the adept benefit for that implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics:
      'Choose one implement → gain its adept benefit. Adept benefits are powerful upgrades: Amulet (lingering resistance), Bell (3-round conditions), Chalice (enhanced healing on ally crit/bleed), Lantern (30 ft aura, reveals invisible), Mirror (shatter damage), Regalia (+2 bonuses, Follow Expert +2–4, save vs mental), Shield (status bonus to saves vs magic), Tome (auto Recall Knowledge + attack bonus), Wand (120 ft, 2nd element, rider effects), Weapon (1 damage on miss).',
    subChoices: { label: 'Choose an implement for adept benefit', options: [
      { id: 'amulet', name: 'Amulet', description: 'Lingering resistance after reaction' },
      { id: 'bell', name: 'Bell', description: '3-round duration conditions' },
      { id: 'chalice', name: 'Chalice', description: 'Enhanced healing on ally crit/bleed' },
      { id: 'lantern', name: 'Lantern', description: '30 ft aura, reveals invisible' },
      { id: 'mirror', name: 'Mirror', description: 'Shatter damage when reflection destroyed' },
      { id: 'regalia', name: 'Regalia', description: '+2 bonuses, Follow Expert +2–4' },
      { id: 'shield', name: 'Shield', description: 'Status bonus to saves vs magic' },
      { id: 'tome', name: 'Tome', description: 'Auto Recall Knowledge + attack bonus' },
      { id: 'wand', name: 'Wand', description: '120 ft, 2nd element, rider effects' },
      { id: 'weapon', name: 'Weapon', description: '1 damage on miss' },
    ] },
  },
  // Weapon Specialization (L7) — uses shared template
  createClassFeature(WEAPON_SPECIALIZATION, 'Thaumaturge', 7),

  // —— Level 9 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-intensify-vulnerability',
    name: 'Intensify Vulnerability',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 9,
    description:
      'You\'ve learned to use your implement to further assault your quarry. You gain the intensify vulnerability benefit of all of your implements. Intensify Vulnerability: Frequency once per round. Requirements: You\'re benefiting from Exploit Vulnerability, you can see the subject, and you haven\'t used Exploit Vulnerability this round. You present your implement and esoterica again, intensifying their effects on the target in a way unique to your implement. You gain the intensified vulnerability benefit from one of the implements you\'re holding, which lasts until the beginning of your next turn.',
    implemented: 'full',
    traits: ['Concentrate', 'Esoterica', 'Magical', 'Thaumaturge'],
    actionCost: 1,
    mechanics:
      'Frequency: once per round. Requires active Exploit Vulnerability + didn\'t use Exploit Vulnerability this round. Choose one held implement\'s intensify benefit: Amulet (+2 status AC/saves vs target), Bell (–2/–3 penalty on saves vs Ring Bell), Chalice (bonus temp HP/healing), Lantern (doubled aura, +2 bonuses, removes concealment), Mirror (concealed vs target), Regalia (+1/+2 attack bonus for ally on hit), Shield (heal shield or boost Hardness), Tome (fortune for attack roll), Wand (status bonus to Fling Magic damage = level), Weapon (+2 status to attack rolls vs target).',
  },
  {
    id: 'thaumaturge-perception-expertise',
    name: 'Perception Expertise',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 9,
    description:
      'You\'ve developed keen awareness and attention to detail. Your proficiency rank for Perception increases to master.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Perception proficiency → master (from expert). Thaumaturge starts expert in Perception.',
  },
  {
    id: 'thaumaturge-thaumaturgic-expertise',
    name: 'Thaumaturgic Expertise',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 9,
    description:
      'You\'ve learned deeper secrets of the supernatural, and your abilities are harder to resist. Your proficiency rank for your thaumaturge class DC increases to expert. You also gain an additional skill increase, which you can apply only to Arcana, Nature, Occultism, or Religion.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Class DC proficiency → expert. Bonus skill increase restricted to Arcana/Nature/Occultism/Religion.',
  },

  // —— Level 11 —————————————————————————————————————————————
  {
    id: 'thaumaturge-medium-armor-expertise',
    name: 'Medium Armor Expertise',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 11,
    description:
      'You\'ve learned to defend yourself better against attacks. Your proficiency ranks for light armor, medium armor, and unarmored defense increase to expert.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Light/medium armor and unarmored defense proficiency → expert.',
  },
  {
    id: 'thaumaturge-second-adept',
    name: 'Second Adept',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 11,
    description:
      'You\'ve improved your link to your second implement. You gain the adept benefit of your second implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Gain adept benefit of 2nd implement. Now both implements have adept-tier powers.',
  },

  // —— Level 13 —————————————————————————————————————————————
  {
    id: 'thaumaturge-perfected-mind',
    name: 'Perfected Mind',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 13,
    description:
      'Your unbelievable training grants you mental resiliency. Your proficiency rank for Will saves increases to legendary. When you roll a critical failure on a Will save, you get a failure instead. When you roll a failure on a Will save against a damaging effect, you take half damage.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Will save proficiency → legendary. Crit failure → failure. Failure on damaging Will → half damage. Combined with Disciplined Mind (success → crit success), the Thaumaturge has the game\'s strongest Will progression.',
  },
  {
    id: 'thaumaturge-weapon-mastery',
    name: 'Weapon Mastery',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 13,
    description:
      'You fully understand your weapons. Your proficiency ranks for unarmed attacks, simple weapons, and martial weapons increase to master.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Unarmed/simple/martial proficiency → master.',
  },

  // —— Level 15 —————————————————————————————————————————————
  {
    id: 'thaumaturge-earned-resilience',
    name: 'Earned Resilience',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 15,
    description:
      'Your body is accustomed to physical hardship and resistant to a wide range of ailments. Your proficiency rank for Fortitude saves increases to master. When you roll a success on a Fortitude save, you get a critical success instead.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Fortitude save proficiency → master. Success → critical success on Fortitude saves.',
  },
  // Greater Weapon Specialization (L15) — uses shared template
  createClassFeature(GREATER_WEAPON_SPECIALIZATION, 'Thaumaturge', 15),
  {
    id: 'thaumaturge-third-implement',
    name: 'Third Implement',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 15,
    description:
      'As you come closer to the culmination of your journey, you gain your final implement, completing your set of three. It must be a different type of implement than your first and second implements. You gain the initiate benefit and intensify vulnerability benefit of your new implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Gain 3rd implement (different type from 1st and 2nd). Grants initiate + intensify benefits immediately (no adept until Intense Implement feat at L18).',    subChoices: { label: 'Choose a third implement', options: [
      { id: 'amulet', name: 'Amulet', description: 'Reaction to grant resistance to damage' },
      { id: 'bell', name: 'Bell', description: 'Reaction to inflict conditions on attackers' },
      { id: 'chalice', name: 'Chalice', description: 'Sip for temp HP or drain to heal' },
      { id: 'lantern', name: 'Lantern', description: 'Revelation aura and status bonuses' },
      { id: 'mirror', name: 'Mirror', description: 'Illusory duplicate of yourself' },
      { id: 'regalia', name: 'Regalia', description: 'Social bonuses and inspiring aura' },
      { id: 'shield', name: 'Shield', description: 'Shield Block + free Raise Shield' },
      { id: 'tome', name: 'Tome', description: 'Recall Knowledge + temp skill proficiencies' },
      { id: 'wand', name: 'Wand', description: 'Fling Magic ranged attack' },
      { id: 'weapon', name: 'Weapon', description: "Implement's Interruption reaction" },
    ] },  },

  // —— Level 17 —————————————————————————————————————————————
  {
    id: 'thaumaturge-implement-paragon',
    name: 'Implement Paragon',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 17,
    description:
      'You have unlocked the last secrets of an implement. Choose one of your implements that already gained the adept benefit; you gain the paragon benefit for that implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics:
      'Choose one implement with adept benefit → gain paragon benefit. Paragon benefits are capstone-tier: Amulet (AoE resistance to all allies), Bell (condition values 2/3, triggers off any enemy), Chalice (reduce conditions + counteract poisons/diseases/curses), Lantern (40 ft aura + counteract illusions/morph/polymorph), Mirror (free Interact/Seek/Strike on reflection), Regalia (no crit fail on social, allies immune to flank, reduce condition penalties), Shield (15 ft aura of AC/save bonuses + ally Shield Block), Tome (legendary temp proficiencies, +3 initiative, +2 RK bonus), Wand (180 ft, all 3 elements, 20 ft burst option), Weapon (disrupt on hit instead of crit).',
    subChoices: { label: 'Choose an implement for paragon benefit', options: [
      { id: 'amulet', name: 'Amulet', description: 'AoE resistance to all allies' },
      { id: 'bell', name: 'Bell', description: 'Condition values 2/3, triggers off any enemy' },
      { id: 'chalice', name: 'Chalice', description: 'Reduce conditions + counteract' },
      { id: 'lantern', name: 'Lantern', description: '40 ft aura + counteract illusions' },
      { id: 'mirror', name: 'Mirror', description: 'Free actions on reflection' },
      { id: 'regalia', name: 'Regalia', description: 'No crit fail on social, allies immune to flank' },
      { id: 'shield', name: 'Shield', description: '15 ft aura of AC/save bonuses' },
      { id: 'tome', name: 'Tome', description: 'Legendary temp proficiencies, +3 initiative' },
      { id: 'wand', name: 'Wand', description: '180 ft, all elements, 20 ft burst' },
      { id: 'weapon', name: 'Weapon', description: 'Disrupt on hit instead of crit' },
    ] },
  },
  {
    id: 'thaumaturge-thaumaturgic-mastery',
    name: 'Thaumaturgic Mastery',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 17,
    description:
      'You\'ve learned deeper secrets of the supernatural, and your abilities are harder to resist. Your proficiency rank for your thaumaturge class DC increases to master. You also gain an additional skill increase, which you can apply only to Arcana, Nature, Occultism, or Religion.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Class DC proficiency → master. Bonus skill increase restricted to Arcana/Nature/Occultism/Religion.',
  },

  // —— Level 19 —————————————————————————————————————————————
  {
    id: 'thaumaturge-medium-armor-mastery',
    name: 'Medium Armor Mastery',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 19,
    description:
      'Your skill with light and medium armor improves, increasing your ability to avoid blows. Your proficiency ranks for light and medium armor, as well as for unarmored defense, increase to master.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Light/medium armor and unarmored defense proficiency → master.',
  },
  {
    id: 'thaumaturge-unlimited-esoterica',
    name: 'Unlimited Esoterica',
    source: 'Thaumaturge',
    category: 'class_feature',
    level: 19,
    description:
      'Your understanding of your esoterica becomes so complete that you can access your mystic tools without even thinking. You can use Exploit Vulnerability or Intensify Vulnerability as a free action, rather than a single action, though still with a frequency of only once per round.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Exploit Vulnerability and Intensify Vulnerability become free actions (still once per round each). Frees up an action every turn for additional Strikes or movement.',
  },
];

export const THAUMATURGE_CLASS_FEATURES: FeatEntry[] = RAW_THAUMATURGE_CLASS_FEATURES.map(f => ({
  ...f,
  traits: f.traits ?? ['Thaumaturge'],
}));

// ──────────────────────────────────────────────────────────
// THAUMATURGE CLASS FEATS
// PF2e Remaster — Dark Archive (Remastered) + Player Core
// ──────────────────────────────────────────────────────────

const RAW_THAUMATURGE_CLASS_FEATS: FeatEntry[] = [
  // —— Level 1 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-ammunition-thaumaturgy',
    name: 'Ammunition Thaumaturgy',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'You\'re so used to handling your implement, weapon, and esoterica in the heat of combat that adding a few bullets or arrows to the mix is no extra burden. You can Interact to reload a weapon using the hand holding your implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Reload with implement hand. Allows ranged weapon builds without sacrificing implement holding.',
  },
  {
    id: 'thaumaturge-diverse-lore',
    name: 'Diverse Lore',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'Your wandering studies mean you\'ve heard rumors or theories about almost every topic... though admittedly, your sources aren\'t always the most reliable. You can take a –2 penalty to your check to Recall Knowledge with Esoteric Lore to Recall Knowledge about any topic, not just the usual topics available for Esoteric Lore. Additionally, when you succeed at your check to Exploit a Vulnerability, compare the result of your Esoteric Lore check to the DC to Recall Knowledge for that creature; if that number would be a success or a critical success, you gain information as if you had succeeded at the Recall Knowledge check.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Esoteric Lore becomes universal Recall Knowledge at –2 penalty. Exploit Vulnerability success also gives Recall Knowledge info if check beats creature\'s RK DC. Makes Thaumaturge the best generalist knowledge character.',
  },
  {
    id: 'thaumaturge-divine-disharmony',
    name: 'Divine Disharmony',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'From your collection of religious trinkets, you pull out opposing divine objects and combine them in a display that causes discordant clashes of divine energy. Roll your choice of a Deception or Intimidation check against the Will DC of a creature you can see within 60 feet. If the creature is particularly devoted to a deity (cleric, celestial, monitor, fiend, or creature with divine spells), you gain a +2 circumstance bonus. Critical Success: The creature is off-guard to your attacks until the end of your next turn. Success: The creature is off-guard to your attacks until the end of your current turn.',
    implemented: 'full',
    traits: ['Divine', 'Esoterica', 'Manipulate', 'Thaumaturge'],
    actionCost: 1,
    mechanics: 'Deception or Intimidation vs Will DC, range 60 ft. +2 circumstance vs divine devoted creatures. Crit success: off-guard until end of next turn. Success: off-guard until end of current turn. Good opener before Exploit Vulnerability.',
  },
  {
    id: 'thaumaturge-familiar',
    name: 'Familiar',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'You make a pact with a creature that serves you and assists your spellcasting. You gain a familiar.',
    implemented: 'full',
    traits: ['Magus', 'Sorcerer', 'Thaumaturge', 'Wizard'],
    actionCost: 'passive',
    mechanics: 'Gain a familiar with 2 abilities. Shared with Magus, Sorcerer, Wizard. Leads to Enhanced Familiar and Incredible Familiar.',
  },
  {
    id: 'thaumaturge-haunt-ingenuity',
    name: 'Haunt Ingenuity',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'Your cunning knowledge grants you the ability to notice the emotional echo of a soul that passed on, leaving a haunt in its wake. Even when you aren\'t Searching while in exploration mode, the GM rolls a secret check for you to notice haunts that usually require you to be Searching. You can disable haunts that require master proficiency in a skill as long as you\'re at least trained in the skill. If you have master proficiency in the skill, you can disable haunts that require legendary instead.',
    implemented: 'full',
    traits: ['Detection', 'Divine', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Passive haunt detection (secret GM check even without Searching). Reduce disable skill requirement by one rank (master → trained, legendary → master).',
  },
  {
    id: 'thaumaturge-root-to-life',
    name: 'Root to Life',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'Marigold, spider lily, pennyroyal — many primal traditions connect flowers and plants with the boundary between life and death, and you can leverage this association to keep an ally on this side of the line. You place a small plant or similar symbol on an adjacent dying creature, immediately stabilizing them; the creature is no longer dying and is instead unconscious at 0 Hit Points. If you spend 2 actions instead of 1, you empower the act further by uttering a quick folk blessing to chase away ongoing pain, adding the auditory trait. When you do so, attempt flat checks to remove each source of persistent damage affecting the target; the DC is 10 instead of the usual 15.',
    implemented: 'full',
    traits: ['Esoterica', 'Manipulate', 'Primal', 'Thaumaturge'],
    actionCost: 1,
    mechanics: '1 action: stabilize adjacent dying creature (no longer dying, unconscious at 0 HP). 2 actions: also attempt DC 10 flat checks to remove each persistent damage. Excellent emergency healing.',
  },
  {
    id: 'thaumaturge-scroll-thaumaturgy',
    name: 'Scroll Thaumaturgy',
    source: 'Thaumaturge',
    category: 'class',
    level: 1,
    description:
      'Your multidisciplinary study of magic means you know how to activate the magic in scrolls with ease. You can activate scrolls of any magical tradition, using your thaumaturge class DC for the scroll\'s DC, rather than a particular spell DC. If a spell is on the spell list for multiple traditions, you choose which tradition to use at the time you activate the scroll. You can draw and activate scrolls with the same hand holding an implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Activate any tradition scroll using class DC. Draw/activate with implement hand. Leads to Scroll Esoterica chain (L6/L12/L18).',
  },

  // —— Level 2 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-call-implement',
    name: 'Call Implement',
    source: 'Thaumaturge',
    category: 'class',
    level: 2,
    description:
      'You can tug on the bonds of ownership between yourself and your implement, causing it to find its way back to you. You look down and find that your implement has mysteriously appeared in your free hand, as long as the implement was within 1 mile and on the same plane of existence. If your implement is attended by another creature, that creature can prevent the implement from teleporting away if it succeeds at a Will save against your class DC. If the creature succeeds, you can\'t attempt to Call that Implement again until midnight.',
    implemented: 'full',
    traits: ['Arcane', 'Manipulate', 'Teleportation', 'Thaumaturge'],
    actionCost: 1,
    mechanics: 'Requires free hand. Teleport implement to hand from within 1 mile (same plane). Attended creature gets Will save vs class DC to prevent; on success, can\'t retry until midnight.',
  },
  {
    id: 'thaumaturge-enhanced-familiar',
    name: 'Enhanced Familiar',
    source: 'Thaumaturge',
    category: 'class',
    level: 2,
    description:
      'You infuse your familiar with additional primal energy, increasing its abilities. You can select four familiar or master abilities each day, instead of two.',
    implemented: 'full',
    traits: ['Animist', 'Druid', 'Magus', 'Sorcerer', 'Thaumaturge', 'Witch', 'Wizard'],
    actionCost: 'passive',
    prerequisites: ['Familiar'],
    mechanics: 'Familiar abilities: 4/day (from 2). Shared across many classes. Leads to Incredible Familiar.',
  },
  {
    id: 'thaumaturge-esoteric-warden',
    name: 'Esoteric Warden',
    source: 'Thaumaturge',
    category: 'class',
    level: 2,
    description:
      'When you apply antithetical material against a creature successfully, you also ward yourself against its next attacks. When you succeed at your check to Exploit a Vulnerability, you gain a +1 status bonus to your AC against the creature\'s next attack and a +1 status bonus to your next saving throw against the creature; if you critically succeed, these bonuses are +2 instead. You can gain these bonuses only once per day against a particular creature, and the benefit ends if you Exploit Vulnerability again.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'Exploit Vulnerability success: +1 status AC vs next attack + +1 status to next save vs creature (crit success: +2). Once per day per creature. Ends on re-Exploit. Leads to Shared Warding.',
  },
  {
    id: 'thaumaturge-talisman-esoterica',
    name: 'Talisman Esoterica',
    source: 'Thaumaturge',
    category: 'class',
    level: 2,
    description:
      'You know how to assemble the supernatural objects in your esoterica into a number of temporary talismans. Each day during your daily preparations, you can make two talismans with an item level no higher than half your level. You must know each talisman\'s formula. A talisman created this way is a temporary item and loses its magic the next time you make your daily preparations. You know the formulas for all common talismans in GM Core of your level or lower.',
    implemented: 'full',
    traits: ['Esoterica', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Daily prep: 2 temp talismans ≤ half level. Know all common talisman formulas. Formulas memorized (no formula book). Leads to Elaborate Talisman Esoterica + Grand Talisman Esoterica.',
  },
  {
    id: 'thaumaturge-turn-away-misfortune',
    name: 'Turn Away Misfortune',
    source: 'Thaumaturge',
    category: 'class',
    level: 2,
    description:
      'You perform a superstition, such as casting salt over your shoulder to ward off bad luck. Turn Away Misfortune\'s fortune trait cancels out the misfortune effect, causing you to roll normally. As normal, you can apply only one fortune ability to a roll, so if you Turned Away Misfortune on an attack roll, you couldn\'t also use an ability like Halfling Luck to alter the roll further.',
    implemented: 'full',
    traits: ['Esoterica', 'Fortune', 'Manipulate', 'Occult', 'Thaumaturge'],
    actionCost: 'reaction',
    mechanics: 'Trigger: You would attempt a roll affected by a misfortune effect. Fortune cancels misfortune, roll normally. Uses reaction. Can\'t stack with other fortune effects.',
  },
  // —— Level 4 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-breached-defenses',
    name: 'Breached Defenses',
    source: 'Thaumaturge',
    category: 'class',
    level: 4,
    description:
      'You can find the one weak point in a creature\'s scales, wards, or armor to get past its resistances. When you succeed at Exploit Vulnerability, you learn about the highest of the creature\'s resistances that can be bypassed (for example, if the creature has resistance to physical damage except silver). If you prefer, you can choose the following benefit instead of one of the usual two benefits from Exploit Vulnerability. Breached Defenses: Your Strikes against the creature also bypass the highest-value resistance you learned about from this feat.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'On Exploit Vulnerability success: learn highest bypassable resistance. Optional 3rd benefit choice: Strikes bypass that resistance entirely. Excellent vs creatures with physical resistance except X.',
  },
  {
    id: 'thaumaturge-instructive-strike',
    name: 'Instructive Strike',
    source: 'Thaumaturge',
    category: 'class',
    level: 4,
    description:
      'You attack your foe and analyze how it reacts. Make a Strike. On a hit, you can immediately attempt a check to Recall Knowledge about the target. On a critical hit, you gain a +2 circumstance bonus to the check to Recall Knowledge.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 1,
    mechanics: 'Strike + free Recall Knowledge on hit (+2 circumstance on crit). Great action economy for gathering creature info.',
  },
  {
    id: 'thaumaturge-paired-link',
    name: 'Paired Link',
    source: 'Thaumaturge',
    category: 'class',
    level: 4,
    description:
      'You break a trinket, such as a lodestone or jade pendant, in two, creating a sympathetic link between the halves that bridges distance. During your daily preparations, you perform a short ceremony where you gift one of the two halves to a willing ally. On that ally, you can cast spells and use thaumaturge abilities targeting your paired ally as though you are adjacent to each other, and the ally can cast spells targeting you in the same way. These effects last as long as you and the ally have their half; if either half leaves either of your possessions for even a moment, or if you establish a link with a new ally during your next daily preparations, the link breaks.',
    implemented: 'full',
    traits: ['Esoterica', 'Fortune', 'Occult', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Daily prep: link with ally. Both treat each other as adjacent for spells and thaumaturge abilities. Link breaks if trinket half leaves possession. Leads to Seven-Part Link (L16).',
  },
  {
    id: 'thaumaturge-thaumaturgic-ritualist',
    name: 'Thaumaturgic Ritualist',
    source: 'Thaumaturge',
    category: 'class',
    level: 4,
    description:
      'Your studies into the supernatural have resulted in an especially strong knowledge of rituals. You gain a +2 circumstance bonus to all primary checks to perform a ritual. You learn two uncommon rituals with a rank no higher than half your level; you must meet all prerequisites for casting the ritual to choose it. You can cast these as the primary caster, but you can\'t teach them to anyone else or allow someone else to serve as primary caster unless they know the ritual as well. At 8th level and every 4 levels thereafter, you learn another uncommon ritual with a rank no higher than half your level.',
    implemented: 'full',
    traits: ['Uncommon', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: '+2 circumstance to ritual primary checks. Learn 2 uncommon rituals ≤ half level. Additional ritual at L8, L12, L16, L20.',
  },

  // —— Level 6 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-one-more-activation',
    name: 'One More Activation',
    source: 'Thaumaturge',
    category: 'class',
    level: 6,
    description:
      'You\'ve forged a deeper bond to your invested items, allowing you to activate them more than usual. Once each day, you can Activate an Item you\'ve invested even after you\'ve used that activation the maximum number of times for its frequency. You can do so only if the item\'s level is half your level or lower, the activation has a frequency of once per day or more frequent, and you haven\'t already used the activation this round.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Once per day: re-activate invested item beyond its frequency limit. Item level must be ≤ half your level. Activation must be once/day or more frequent.',
  },
  {
    id: 'thaumaturge-scroll-esoterica',
    name: 'Scroll Esoterica',
    source: 'Thaumaturge',
    category: 'class',
    level: 6,
    description:
      'Your esoterica includes scraps of scriptures, magic tomes, druidic markings, and the like, which you can use to create temporary scrolls. Each day during your daily preparations, you can create a single temporary scroll containing a 1st-rank spell of any tradition. The spell must be common, or you must otherwise have access to it. This scroll is an unstable, temporary item and loses its magic the next time you make your daily preparations if you haven\'t used it by then. It can\'t be used to Learn the Spell. At 8th level, add a second temporary scroll containing a 2nd-rank spell.',
    implemented: 'full',
    traits: ['Esoterica', 'Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Scroll Thaumaturgy'],
    mechanics: 'Daily prep: 1st-rank scroll (any tradition, common). At L8: +2nd-rank scroll. Leads to Elaborate Scroll Esoterica (L12) → Grand Scroll Esoterica (L18).',
  },
  {
    id: 'thaumaturge-sympathetic-vulnerabilities',
    name: 'Sympathetic Vulnerabilities',
    source: 'Thaumaturge',
    category: 'class',
    level: 6,
    description:
      'When you apply your will to invoke a vulnerability, the result is more powerful, and the vulnerability ripples out in a web from your main target to affect a broader range of creatures. While you have mortal weakness applied, your Strikes also apply that weakness against any creature that has that weakness, not just creatures of the exact same kind. While you have personal antithesis applied to a non-humanoid creature, you can apply your custom weakness to all creatures of the exact same kind.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'Mortal Weakness: now triggers against ANY creature with that weakness (not just same type). Personal Antithesis vs non-humanoids: applies to all creatures of exact same kind. Massive AoE weakness application.',
  },

  // —— Level 8 ——————————————————————————————————————————————
  {
    id: 'thaumaturge-cursed-effigy',
    name: 'Cursed Effigy',
    source: 'Thaumaturge',
    category: 'class',
    level: 8,
    description:
      'After your attack, you grab a bit of blood, cut hair, or other piece of the creature\'s body. You incorporate the material into a premade doll, paper figure, or other effigy to create a sympathetic link that makes it harder to resist your abilities. As long as you are Exploiting Vulnerability against that creature, it takes a –2 status penalty to its saving throws against thaumaturge abilities or items that use your thaumaturge class DC.',
    implemented: 'full',
    traits: ['Curse', 'Esoterica', 'Thaumaturge'],
    actionCost: 1,
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'Requirement: last action was successful Strike vs Exploit Vulnerability target dealing physical damage. Target gets –2 status penalty to saves vs thaumaturge abilities/class DC items while Exploit Vulnerability active.',
  },
  {
    id: 'thaumaturge-elaborate-talisman-esoterica',
    name: 'Elaborate Talisman Esoterica',
    source: 'Thaumaturge',
    category: 'class',
    level: 8,
    description:
      'As you continue to collect talismanic esoterica, you improve your ability to create temporary talismans. You can create four temporary talismans each day instead of two. Special: You can select this feat a second time if you are 14th level or higher, allowing you to create six talismans each day instead of four.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Talisman Esoterica'],
    mechanics: 'Temp talismans: 4/day (from 2). Can take again at L14+ for 6/day. Great consumable economy.',
  },
  {
    id: 'thaumaturge-incredible-familiar',
    name: 'Incredible Familiar',
    source: 'Thaumaturge',
    category: 'class',
    level: 8,
    description:
      'Your familiar is imbued with even more magic than other familiars. You can select a base of six familiar or master abilities each day, instead of four.',
    implemented: 'full',
    traits: ['Animist', 'Thaumaturge', 'Witch'],
    actionCost: 'passive',
    prerequisites: ['Enhanced Familiar'],
    mechanics: 'Familiar abilities: 6/day (from 4). Shared with Animist and Witch.',
  },
  {
    id: 'thaumaturge-know-it-all',
    name: 'Know-It-All',
    source: 'Thaumaturge',
    category: 'class',
    level: 8,
    description:
      'When you succeed at a check to Recall Knowledge, you gain additional information or context. When you critically succeed at a check to Recall Knowledge, you get additional information or context or can ask an additional follow-up question (the GM chooses which).',
    implemented: 'full',
    traits: ['Bard', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Success on Recall Knowledge: bonus info. Crit success: extra info or follow-up question. Shared with Bard (Bard requires enigma muse). Synergizes with Diverse Lore and Instructive Strike.',
  },
  // —— Level 10 —————————————————————————————————————————————
  {
    id: 'thaumaturge-share-weakness',
    name: 'Share Weakness',
    source: 'Thaumaturge',
    category: 'class',
    level: 10,
    description:
      'You select an object from your esoterica that has great personal value to you, such as a locket or treasured ring, and you grant it to an adjacent ally, establishing a personal link that allows your ally to affect an enemy as if they were you. The ally\'s Strikes apply the weakness from your mortal weakness the same way your Strikes do. This benefit ends when your Exploit Vulnerability ends or you Share Weakness again.',
    implemented: 'full',
    traits: ['Esoterica', 'Manipulate', 'Thaumaturge'],
    actionCost: 1,
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'Requirement: using Exploit Vulnerability with mortal weakness. Adjacent ally\'s Strikes apply the same mortal weakness. Ends when Exploit Vulnerability ends or you re-share. Leads to Ubiquitous Weakness (L20).',
  },
  {
    id: 'thaumaturge-thaumaturges-investiture',
    name: "Thaumaturge's Investiture",
    source: 'Thaumaturge',
    category: 'class',
    level: 10,
    description:
      'Magical equipment and gear are the tools of your trade, and you know you need as many as possible. You gain the Incredible Investiture skill feat, increasing your limit on invested items from 10 to 12. The limit increases to 14 if you have Charisma +4, 16 if you have Charisma +5, 18 if you have Charisma +6, and 20 if you have Charisma +7.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Charisma 16'],
    mechanics: 'Invested item limit: 12 base, 14 (CHA +4), 16 (CHA +5), 18 (CHA +6), 20 (CHA +7). Grants Incredible Investiture feat.',
  },
  {
    id: 'thaumaturge-twin-weakness',
    name: 'Twin Weakness',
    source: 'Thaumaturge',
    category: 'class',
    level: 10,
    description:
      'As you make an attack augmented by your esoterica, you also press your implement against the creature, applying its weakness as your implement\'s energies sear the creature\'s flesh. Make a melee Strike against the target of your Exploit Vulnerability. On any attack roll result but a critical failure, you also press your implement against the creature, automatically dealing the additional damage from Exploit Vulnerability. This is in addition to any damage from your Strike, including the weakness the Strike applies from Exploit Vulnerability. This counts as two attacks when calculating your multiple attack penalty.',
    implemented: 'full',
    traits: ['Esoterica', 'Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'Two actions. Requirement: holding implement + weapon, using mortal weakness or personal antithesis, target within reach. Melee Strike + auto Exploit Vulnerability damage (even on miss, unless crit fail). Essentially double weakness application. Counts as 2 attacks for MAP.',
  },

  // —— Level 12 —————————————————————————————————————————————
  {
    id: 'thaumaturge-elaborate-scroll-esoterica',
    name: 'Elaborate Scroll Esoterica',
    source: 'Thaumaturge',
    category: 'class',
    level: 12,
    description:
      'You\'ve picked up more scraps of magic texts, improving your makeshift scrolls. In addition to your daily scrolls from Scroll Esoterica, add a scroll with a 3rd-rank spell. At 14th level, add a scroll with a 4th-rank spell. At 16th level, add a scroll with a 5th-rank spell.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Scroll Esoterica'],
    mechanics: 'Daily scrolls add: 3rd-rank (L12), 4th-rank (L14), 5th-rank (L16). Total scroll chain: 1st + 2nd (Scroll Esoterica) + 3rd/4th/5th (this) + 6th/7th (Grand). Leads to Grand Scroll Esoterica (L18).',
  },
  {
    id: 'thaumaturge-intensify-investiture',
    name: 'Intensify Investiture',
    source: 'Thaumaturge',
    category: 'class',
    level: 12,
    description:
      'Your bond to your invested items enables you to put more of yourself into them. If your next action is to activate an invested item that has a saving throw DC, you can use your thaumaturge class DC instead of the item\'s DC if it is higher.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'free',
    mechanics: 'Frequency: once per 10 minutes. Free action before Activate Item. Replace item DC with class DC if higher. Essential for keeping item DCs relevant at high levels.',
  },
  {
    id: 'thaumaturge-shared-warding',
    name: 'Shared Warding',
    source: 'Thaumaturge',
    category: 'class',
    level: 12,
    description:
      'You ward your allies from the attacks of your foes whenever you apply those protections to yourself. When you gain a status bonus to AC and saves from Esoteric Warden, you can choose to grant the same benefit to all allies within 30 feet.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Esoteric Warden'],
    mechanics: 'Esoteric Warden bonuses (+1/+2 status AC + save) extend to all allies within 30 ft. AoE defensive buff on successful Exploit Vulnerability.',
  },
  {
    id: 'thaumaturge-thaumaturges-demesne',
    name: "Thaumaturge's Demesne",
    source: 'Thaumaturge',
    category: 'class',
    level: 12,
    description:
      'You have claimed an area or location as your demesne, granting you the ability to ward and protect it. Choose a demesne, an area of no more than 2,000 square feet. You must legitimately own the area or lay claim to it without contest. It\'s automatically protected by an arcane peaceful bubble spell with unlimited duration, heightened to half your level rounded up and using your thaumaturge class DC. Additionally, the demesne is attended by three phantasmal minions with unlimited duration; they aren\'t summoned minions and don\'t require concentration.',
    implemented: 'full',
    traits: ['Uncommon', 'Arcane', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Claim ≤ 2,000 sq ft area. Auto peaceful bubble (unlimited, half level, class DC). 3 phantasmal minions (unlimited, no concentration). Leads to Unlimited Demesne (L20).',
  },

  // —— Level 14 —————————————————————————————————————————————
  {
    id: 'thaumaturge-esoteric-reflexes',
    name: 'Esoteric Reflexes',
    source: 'Thaumaturge',
    category: 'class',
    level: 14,
    description:
      'Reacting with an implement becomes instinct. At the start of your turn, you gain an additional reaction, which you can use for only reactions granted by your implements.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['An implement that grants a reaction'],
    mechanics: 'Extra reaction per turn, implement reactions only. Benefits: Amulet\'s Abeyance, Ring Bell, Implement\'s Interruption, etc. Massive action economy for reactive implements.',
  },
  {
    id: 'thaumaturge-grand-talisman-esoterica',
    name: 'Grand Talisman Esoterica',
    source: 'Thaumaturge',
    category: 'class',
    level: 14,
    description:
      'You\'ve gained the ability to place multiple talismans on an item. Normally, affixing more than one talisman to an item causes the talismans to be suppressed, but when you Affix a Talisman, you can specially treat one item you\'re working on, allowing it to have two active talismans at once. This special treatment ends if you use Affix a Talisman to treat a new item with this ability.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Talisman Esoterica'],
    mechanics: 'One item can hold 2 active talismans simultaneously (normally suppresses extra). Treat a new item to move the benefit. Powerful with Elaborate Talisman Esoterica\'s 4-6 daily talismans.',
  },
  {
    id: 'thaumaturge-trespass-teleportation',
    name: 'Trespass Teleportation',
    source: 'Thaumaturge',
    category: 'class',
    level: 14,
    description:
      'You can hunt your foe to the ends of creation. You teleport along with the enemy, appearing the same direction and distance from it as you were before it teleported (or the nearest unoccupied space if your destination is occupied). Any allies affected by Share Weakness or Ubiquitous Weakness can spend their reaction to teleport along if they\'re within 120 feet of the enemy.',
    implemented: 'full',
    traits: ['Occult', 'Teleportation', 'Thaumaturge'],
    actionCost: 'reaction',
    prerequisites: ['Exploit Vulnerability'],
    mechanics: 'Trigger: Exploit Vulnerability target within 120 ft uses teleportation. You teleport with them (same relative position). Share Weakness/Ubiquitous Weakness allies can spend reaction to follow. Prevents escape.',
  },
  // —— Level 16 —————————————————————————————————————————————
  {
    id: 'thaumaturge-implements-flight',
    name: "Implement's Flight",
    source: 'Thaumaturge',
    category: 'class',
    level: 16,
    description:
      'By weakening your relation to the ground and strengthening your relation to the sky, you\'ve learned to soar through the air, your implement carrying you as surely as any broomstick or pestle. As long as you\'re holding a thaumaturge implement, you gain a fly Speed equal to your land Speed.',
    implemented: 'full',
    traits: ['Primal', 'Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Fly Speed = land Speed while holding implement. Permanent flight with no action cost. Primal trait.',
  },
  {
    id: 'thaumaturge-seven-part-link',
    name: 'Seven-Part Link',
    source: 'Thaumaturge',
    category: 'class',
    level: 16,
    description:
      'Many traditions hold the number seven as significant. By exchanging pieces of a seven-part set of esoterica, you create a magical web by which your allies can affect each other at a distance. When you use Paired Link during your daily preparations, you can exchange linking esoterica with up to six willing allies, keeping one piece for yourself. In addition to the normal effects of Paired Link, if a linked ally casts a spell with a range of touch, they can target linked allies within 30 feet with that spell.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Paired Link'],
    mechanics: 'Paired Link expands to up to 6 allies + you (7 total). Linked allies can cast touch spells on other linked allies within 30 ft. Incredible party-wide support.',
  },
  {
    id: 'thaumaturge-sever-magic',
    name: 'Sever Magic',
    source: 'Thaumaturge',
    category: 'class',
    level: 16,
    description:
      'You apply a frayed thread, a pinch of fulu ash, or a similar undone charm to your weapon, and swing to break a spell. Make a Strike against an enemy. If you hit and deal damage, you attempt to counteract a single spell active on the target (your choice). Your counteract rank is equal to half your level (rounded up), and your counteract check modifier is equal to your class DC – 10.',
    implemented: 'full',
    traits: ['Arcane', 'Esoterica', 'Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Holding an implement'],
    mechanics: 'Two actions. Strike; hit + damage → counteract one active spell. Counteract rank = ceil(level/2). Counteract modifier = class DC – 10. Dispel on hit.',
  },

  // —— Level 18 —————————————————————————————————————————————
  {
    id: 'thaumaturge-grand-scroll-esoterica',
    name: 'Grand Scroll Esoterica',
    source: 'Thaumaturge',
    category: 'class',
    level: 18,
    description:
      'You\'ve completed the third and final step in your assimilation of scroll esoterica, granting you daily scrolls of incredible power. In addition to your daily scrolls from Scroll Esoterica and Elaborate Scroll Esoterica, add a single scroll with a 6th-rank spell. At 20th level, add a scroll with a 7th-rank spell.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Elaborate Scroll Esoterica'],
    mechanics: 'Daily scrolls add: 6th-rank (L18), 7th-rank (L20). Full scroll chain at L20: 1st + 2nd + 3rd + 4th + 5th + 6th + 7th. Seven daily scrolls across all traditions.',
  },
  {
    id: 'thaumaturge-implements-assault',
    name: "Implement's Assault",
    source: 'Thaumaturge',
    category: 'class',
    level: 18,
    description:
      'Your implement supercharges your weapon to shoot an impossible volley or carve through your foes. Make a Strike with your weapon against each enemy within 30 feet of you. You don\'t increase your multiple attack penalty until after making all the attacks. If your weapon is a melee weapon and any of the attacks are outside your reach, you Release the weapon before the Strikes, and it returns to your grasp after all of them. If your hands are full when the weapon returns, it falls to the ground in your space.',
    implemented: 'full',
    traits: ['Magical', 'Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Holding an implement'],
    mechanics: 'Three actions. Strike all enemies within 30 ft. MAP doesn\'t increase until after all attacks. Melee weapon auto-releases for ranged targets, returns after. AoE martial attack.',
  },
  {
    id: 'thaumaturge-intense-implement',
    name: 'Intense Implement',
    source: 'Thaumaturge',
    category: 'class',
    level: 18,
    description:
      'You have an exceptional link to your third implement. You gain the adept benefit for your third implement.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    mechanics: 'Third implement gains adept benefit. Now all three implements have adept-tier powers (1st and 2nd from class features, 3rd from this feat).',
  },

  // —— Level 20 —————————————————————————————————————————————
  {
    id: 'thaumaturge-ubiquitous-weakness',
    name: 'Ubiquitous Weakness',
    source: 'Thaumaturge',
    category: 'class',
    level: 20,
    description:
      'You\'ve nurtured your bonds with your comrades, allowing you to share the benefits of your esoterica. When you use Exploit Vulnerability and choose mortal weakness, select any number of allies within 30 feet of you. Their Strikes apply the weakness from mortal weakness the same way your Strikes do. This benefit ends when you stop benefiting from Exploit Vulnerability. Since this effect depends on magically strengthening your bond to your allies, only allies with whom you\'ve developed a rapport over the course of one or more days gain the benefit.',
    implemented: 'full',
    traits: ['Manipulate', 'Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Share Weakness'],
    mechanics: 'Mortal weakness applies to all ally Strikes within 30 ft (not just one ally). Requires rapport (1+ days). All allies exploit the creature\'s actual weakness.',
  },
  {
    id: 'thaumaturge-unlimited-demesne',
    name: 'Unlimited Demesne',
    source: 'Thaumaturge',
    category: 'class',
    level: 20,
    description:
      'You can move your demesne here and there, bringing it wherever your journey takes you. Your demesne expands to a maximum of 10,000 square feet. Once per day, you can call your demesne forth, which takes 1 minute. This has the effects of resplendent mansion, except that it conjures your demesne from its previous location, with all the benefits of Thaumaturge\'s Demesne in addition to those of the spell. You must be able to claim the new area, with the same restrictions as Thaumaturge\'s Demesne.',
    implemented: 'full',
    traits: ['Arcane', 'Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ["Thaumaturge's Demesne"],
    mechanics: 'Demesne expands to 10,000 sq ft. Once/day, 1 min: summon demesne (resplendent mansion effect) at new location. Portable base of operations.',
  },
  {
    id: 'thaumaturge-wonder-worker',
    name: 'Wonder Worker',
    source: 'Thaumaturge',
    category: 'class',
    level: 20,
    description:
      'The thaumaturge\'s path culminates with the working of wonders. Once per day, you can align your esoterica to cast a spell of 8th rank or lower that takes 1, 2, or 3 actions to cast. The spell must be common or one to which you have access. You can choose a spell of any tradition for which you\'re legendary in the associated skill (Arcana for arcane, Nature for primal, Occultism for occult, or Religion for divine). Use your thaumaturge class DC in place of any necessary spell DC and your thaumaturge class DC – 10 in place of any necessary counteract modifier or spell attack modifier.',
    implemented: 'full',
    traits: ['Thaumaturge'],
    actionCost: 'passive',
    prerequisites: ['Legendary in Arcana, Nature, Occultism, or Religion'],
    mechanics: 'Once/day: cast any common spell ≤ 8th rank (1-3 actions). Tradition determined by legendary skill. Uses class DC for spell DC and class DC – 10 for spell attack/counteract. Capstone versatility.',
  },
];

export const THAUMATURGE_CLASS_FEATS: FeatEntry[] = RAW_THAUMATURGE_CLASS_FEATS.map(f => ({
  ...f,
  traits: f.traits ?? ['Thaumaturge'],
}));
