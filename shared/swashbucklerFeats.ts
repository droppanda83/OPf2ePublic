import type { FeatEntry } from './featTypes';
import { createClassFeature, WEAPON_SPECIALIZATION, GREATER_WEAPON_SPECIALIZATION } from './sharedFeats';

// ──────────────────────────────────────────────────────────
// SWASHBUCKLER CLASS FEATURES (Automatically Granted)
// PF2e Remaster — Player Core 2
// ──────────────────────────────────────────────────────────

const RAW_SWASHBUCKLER_CLASS_FEATURES: FeatEntry[] = [
  // —— Level 1 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-panache',
    name: 'Panache',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 1,
    description:
      'You care as much about the way you accomplish something as whether you actually accomplish it in the first place. When you perform an action with particular style, you can leverage this moment of verve to perform spectacular, deadly maneuvers. This heightened state of flair is called panache. You gain panache by performing actions that have the bravado trait. Tumble Through and additional actions determined by your swashbuckler\'s style gain the bravado trait when you use them. The GM might determine that a check to perform a particularly daring action, such as swinging on a chandelier or sliding down a drapery, can gain the bravado trait. Normally, you gain and use panache only in combat encounters; when an encounter ends, you lose panache. Powerful finisher actions, including Confident Finisher, can be used only while you have panache and cause you to lose your panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Core loop: use bravado actions to gain panache, spend it on finishers. Bravado trait: succeed on check = gain panache; fail (not crit fail) = gain panache until end of next turn. Tumble Through always has bravado; style adds more. Panache is lost at end of encounter or when using a finisher. While you have panache, Stylish Combatant grants speed bonus.',
  },
  {
    id: 'swashbuckler-precise-strike',
    name: 'Precise Strike',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 1,
    description:
      'When you make a Strike with an agile or finesse melee weapon or agile or finesse unarmed attack, you deal 2 additional precision damage. If the Strike is part of a finisher, the additional damage is 2d6 precision damage instead. As your swashbuckler level increases, so does your additional damage for precise strike. At 5th, 9th, 13th, and 17th level, increase the amount of additional damage on a Strike by 1 and the additional damage on a finisher by 1d6.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Precision damage progression: L1 +2/2d6, L5 +3/3d6, L9 +4/4d6, L13 +5/5d6, L17 +6/6d6. Only works with agile or finesse melee weapons/unarmed attacks. Precision damage doesn\'t apply to creatures immune to precision (swarms, oozes). Finisher damage replaces the flat bonus.',
  },
  {
    id: 'swashbuckler-stylish-combatant',
    name: 'Stylish Combatant',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 1,
    description:
      'You gain a +1 circumstance bonus to skill checks with the bravado trait while in a combat encounter. While you have panache, you gain a +5-foot status bonus to your Speeds.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Bravado check bonus: +1 circumstance (increases to +2 at L9 via Swashbuckler Expertise; extends to exploration mode at L11 via Continuous Flair). Panache speed bonus: +5 ft status (replaced by Vivacious Speed at L3).',
  },
  {
    id: 'swashbuckler-swashbucklers-style',
    name: "Swashbuckler's Style",
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 1,
    description:
      'Your own distinctive style lets you gracefully handle any situation. Choose a swashbuckler\'s style: Battledancer (Performance, bravado on Perform, bonus feat Fascinating Performance), Braggart (Intimidation, bravado on Demoralize), Fencer (Deception, bravado on Create a Diversion and Feint), Gymnast (Athletics, bravado on Grapple, Reposition, Shove, and Trip), Rascal (Thievery, bravado on Dirty Trick, bonus feat Dirty Trick), or Wit (Diplomacy, bravado on Bon Mot, bonus feat Bon Mot). Your style determines your trained skill, additional bravado actions, and Exemplary Finisher effect at level 9.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Builder must capture style choice. Each style grants: trained skill, bravado actions (gaining the bravado trait), and some grant a bonus feat. Battledancer: Performance, Fascinating Performance feat. Braggart: Intimidation. Fencer: Deception. Gymnast: Athletics. Rascal: Thievery, Dirty Trick feat. Wit: Diplomacy, Bon Mot feat. Style also determines Exemplary Finisher effect at L9 and Stylish Tricks skill.',
    subChoices: { label: 'Choose a style', options: [
      { id: 'battledancer', name: 'Battledancer', description: 'Performance; Fascinating Performance feat; dance-based panache' },
      { id: 'braggart', name: 'Braggart', description: 'Intimidation; Demoralize for panache' },
      { id: 'fencer', name: 'Fencer', description: 'Deception; Feint for panache' },
      { id: 'gymnast', name: 'Gymnast', description: 'Athletics; athletic maneuvers for panache' },
      { id: 'rascal', name: 'Rascal', description: 'Thievery; Dirty Trick feat; tricks for panache' },
      { id: 'wit', name: 'Wit', description: 'Diplomacy; Bon Mot feat; clever quips for panache' },
    ] },
  },
  {
    id: 'swashbuckler-confident-finisher',
    name: 'Confident Finisher',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 1,
    description:
      'You make an incredibly graceful attack, piercing your foe\'s defenses. Make a Strike with the following failure effect. Failure: You deal half your precise strike damage to the target. This damage type is that of the weapon or unarmed attack you used for the Strike.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics:
      'Bread-and-butter finisher. Requires panache; consumes panache. On hit: normal damage + full precise strike finisher damage. On failure: half precise strike finisher damage (e.g., L1 failure = 1d6; L17 failure = 3d6). Must use agile/finesse melee weapon or unarmed attack. Can\'t use attack-trait actions for rest of turn after using any finisher.',
  },

  // —— Level 3 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-fortitude-expertise',
    name: 'Fortitude Expertise',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 3,
    description:
      'Your physique has grown hardy in your adventures. Your proficiency rank for Fortitude saves increases to expert.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Fortitude save proficiency → expert. This is the swashbuckler\'s only Fortitude upgrade — it never reaches master from class features.',
  },
  {
    id: 'swashbuckler-opportune-riposte',
    name: 'Opportune Riposte',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 3,
    description:
      'You take advantage of an opening from your enemy\'s fumbled attack. You either make a melee Strike against the triggering enemy or attempt to Disarm it of the weapon it used for the Strike.',
    implemented: 'full',
    traits: ['Bravado', 'Swashbuckler'],
    actionCost: 'reaction',
    mechanics:
      'Trigger: An enemy within your reach critically fails a Strike against you. Reaction: melee Strike or Disarm (Athletics vs. Reflex DC). Has bravado trait — successful Strike/Disarm can grant panache. Enhanced by Eternal Confidence (L19), Impossible Riposte (L14), Felicitous Riposte (L16), Parry and Riposte (L18).',
  },
  {
    id: 'swashbuckler-stylish-tricks',
    name: 'Stylish Tricks',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 3,
    description:
      'At 3rd level, 7th level, and 15th level, you gain an additional skill increase you can apply only to Acrobatics or the skill from your swashbuckler\'s style. You also gain an additional skill feat at these levels. This feat must be for Acrobatics or the trained skill from your swashbuckler\'s style.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Bonus skill increase + bonus skill feat at levels 3, 7, and 15. Restricted to Acrobatics or style skill. Helps ensure bravado skill stays competitive.',
  },
  {
    id: 'swashbuckler-vivacious-speed',
    name: 'Vivacious Speed',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 3,
    description:
      'When you\'ve made an impression, you move even faster than normal, darting about the battlefield with incredible speed. Increase the status bonus to your Speeds from stylish combatant to a +10-foot status bonus; this bonus increases by 5 feet at 7th, 11th, 15th, and 19th levels. When you don\'t have panache, you still get half this status bonus to your Speed, rounded down to the nearest 5-foot increment.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Speed bonus (with panache / without panache): L3 +10/+5, L7 +15/+5, L11 +20/+10, L15 +25/+10, L19 +30/+15. Replaces the +5 ft from Stylish Combatant. Half bonus without panache is a remaster QoL improvement.',
  },

  // —— Level 5 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-weapon-expertise',
    name: 'Weapon Expertise',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 5,
    description:
      'You\'ve dedicated yourself to learning the intricacies of your weapons. Your proficiency ranks for simple weapons, martial weapons, and unarmed attacks increase to expert. You gain access to the critical specialization effects of all weapons for which you have expert proficiency.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Simple/martial/unarmed proficiency → expert. Gain critical specialization effects for expert+ weapons.',
  },

  // —— Level 7 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-confident-evasion',
    name: 'Confident Evasion',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 7,
    description:
      'You\'ve learned to move quickly to avoid explosions, a dragon\'s breath, and worse. Your proficiency rank for Reflex saves increases to master. When you roll a success on a Reflex save, you get a critical success instead.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Reflex save proficiency → master. Success → critical success on Reflex saves. (Remaster rename of Evasion.)',
  },
  // Weapon Specialization (L7) — uses shared template
  createClassFeature(WEAPON_SPECIALIZATION, 'Swashbuckler', 7),

  // —— Level 9 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-exemplary-finisher',
    name: 'Exemplary Finisher',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 9,
    description:
      'You execute your finishing moves with spectacular flair, adding special effects to your finishers. If a Strike you make as part of a finisher hits a foe, you add one of the following effects depending on your swashbuckler\'s style: Battledancer — you can Step as a free action immediately after the finisher. Braggart — if the foe was temporarily immune to your Demoralize, their temporary immunity ends. Fencer — the foe is off-guard until your next turn. Gymnast — if the foe is grabbed, restrained, or prone, you gain a circumstance bonus to the damage roll equal to double the number of weapon damage dice. Rascal — the foe takes a –10 circumstance penalty to its speed until the start of your next turn. Wit — the foe takes a –2 circumstance penalty to attack rolls against you until the start of your next turn.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Rider effect on finisher hit, determined by style choice. Only triggers on a hit (success or crit success), not on Confident Finisher failure effect. Each style adds a powerful bonus: Fencer gets free off-guard, Braggart bypasses Demoralize immunity, Gymnast gets massive bonus damage on prone/grabbed foes.',
  },
  {
    id: 'swashbuckler-swashbuckler-expertise',
    name: 'Swashbuckler Expertise',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 9,
    description:
      'You perform swashbuckling techniques with exceptional flair, making them harder to resist. Your circumstance bonus from Stylish Combatant increases to +2. Your proficiency rank for your swashbuckler class DC increases to expert.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Bravado check circumstance bonus → +2 (from +1). Class DC proficiency → expert.',
  },

  // —— Level 11 —————————————————————————————————————————————
  {
    id: 'swashbuckler-continuous-flair',
    name: 'Continuous Flair',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 11,
    description:
      'While not equal to your panache in combat, you have a dramatic flair about you in any situation. The circumstance bonus from Stylish Combatant applies in exploration mode.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Stylish Combatant +2 circumstance bonus to bravado skill checks now applies in exploration mode too.',
  },
  {
    id: 'swashbuckler-perception-mastery',
    name: 'Perception Mastery',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 11,
    description:
      'Through your adventures, you\'ve developed keen awareness and attention to detail. Your proficiency rank for Perception increases to master.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Perception proficiency → master (from expert).',
  },

  // —— Level 13 —————————————————————————————————————————————
  {
    id: 'swashbuckler-assured-evasion',
    name: 'Assured Evasion',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 13,
    description:
      'Your ability to elude danger is matchless. Your proficiency rank for Reflex saves increases to legendary. When you roll a critical failure on a Reflex save, you get a failure instead. When you roll a failure on a Reflex save against a damaging effect, you take half damage.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Reflex save proficiency → legendary. Crit failure → failure. Failure on damaging Reflex → half damage. Combined with Confident Evasion (success → crit success), the swashbuckler has the game\'s strongest Reflex progression.',
  },
  {
    id: 'swashbuckler-light-armor-expertise',
    name: 'Light Armor Expertise',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 13,
    description:
      'You\'ve learned to dodge while wearing light or no armor. Your proficiency ranks for light armor and unarmored defense increase to expert.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Light armor and unarmored defense proficiency → expert.',
  },
  {
    id: 'swashbuckler-weapon-mastery',
    name: 'Weapon Mastery',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 13,
    description:
      'You fully understand your weapons. Your proficiency ranks for simple and martial weapons and unarmed attacks increase to master.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Simple/martial/unarmed proficiency → master. Also increases weapon specialization damage from +2 to +3.',
  },

  // —— Level 15 —————————————————————————————————————————————
  // Greater Weapon Specialization (L15) — uses shared template
  createClassFeature(GREATER_WEAPON_SPECIALIZATION, 'Swashbuckler', 15),
  {
    id: 'swashbuckler-keen-flair',
    name: 'Keen Flair',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 15,
    description:
      'You inflict devastating attacks on even well-defended foes. When you Strike with a weapon or unarmed attack with which you have master proficiency, if you roll a 19 on the die and the roll is a success, you critically succeed instead.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Natural 19 = critical hit if the result would be a success. Applies to all master-proficiency weapons (simple/martial/unarmed at L13+). Doubles critical hit chance.',
  },

  // —— Level 17 —————————————————————————————————————————————
  {
    id: 'swashbuckler-reinforced-ego',
    name: 'Reinforced Ego',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 17,
    description:
      'You\'ve steeled your mind with resolve. Your proficiency rank for Will saves increases to master. When you roll a success on a Will save, you get a critical success instead.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Will save proficiency → master. Success → critical success on Will saves. (Remaster rename of Resolve.)',
  },

  // —— Level 19 —————————————————————————————————————————————
  {
    id: 'swashbuckler-eternal-confidence',
    name: 'Eternal Confidence',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 19,
    description:
      'As a swashbuckler at the peak of your skill, you swell with confidence in every attack. Your proficiency rank for your swashbuckler class DC increases to master. When you Strike as part of a finisher or Opportune Riposte, you can give the Strike the failure effect from the Confident Finisher action, including the increase from Precise Finisher if you have that feat. You can do so only if the Strike uses a weapon or unarmed attack that you could use for Confident Finisher.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics:
      'Class DC proficiency → master. All finisher Strikes and Opportune Riposte Strikes gain Confident Finisher failure effect (half precise strike finisher damage on miss). If you have Precise Finisher feat, failure effect becomes full precise strike damage instead of half. Applies to any agile/finesse weapon.',
  },
  {
    id: 'swashbuckler-light-armor-mastery',
    name: 'Light Armor Mastery',
    source: 'Swashbuckler',
    category: 'class_feature',
    level: 19,
    description:
      'Your skill with light armor improves, increasing your ability to dodge blows. Your proficiency ranks for light armor and unarmored defense increase to master.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Light armor and unarmored defense proficiency → master.',
  },
];

export const SWASHBUCKLER_CLASS_FEATURES: FeatEntry[] = RAW_SWASHBUCKLER_CLASS_FEATURES.map(f => ({
  ...f,
  traits: f.traits ?? ['Swashbuckler'],
}));

// ──────────────────────────────────────────────────────────
// SWASHBUCKLER CLASS FEATS
// PF2e Remaster — Player Core 2 + Legacy supplements
// ──────────────────────────────────────────────────────────

const RAW_SWASHBUCKLER_CLASS_FEATS: FeatEntry[] = [
  // —— Level 1 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-disarming-flair',
    name: 'Disarming Flair',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'You can show off by making flashy disarms. Your Disarm action gains the bravado trait (Athletics vs. Reflex DC). On a critical success you gain panache; on a failure you are off-guard until the start of your next turn.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Disarm gains bravado trait. Bravado crit success: panache. Bravado failure: off-guard until start of next turn.',
  },
  {
    id: 'swashbuckler-elegant-buckler',
    name: 'Elegant Buckler',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'You are trained in a singular technique that lets you gain more than the usual benefit from a buckler. When you Raise a Shield while wielding a buckler, you gain a +2 circumstance bonus to AC instead of the buckler\'s normal shield bonus. If you have panache and an enemy makes an attack roll against you that results in a critical failure, you gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Raise Shield with buckler: +2 circumstance AC (replaces normal buckler bonus). Enemy crit fail vs you while you have panache: gain panache.',
  },
  {
    id: 'swashbuckler-extravagant-parry',
    name: 'Extravagant Parry',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'You parry oncoming attacks with your weapon. You gain a +1 circumstance bonus to AC until the start of your next turn as long as you continue to meet the requirements. If you have panache, the circumstance bonus increases to +2. If an enemy makes an attack roll against you while you have panache that results in a critical failure, you gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 1,
    mechanics: 'Requirement: wielding melee weapon in one hand, other hand free. +1 circumstance AC (+2 with panache) until start of next turn. Enemy crit fail while you have panache: gain panache.',
  },
  {
    id: 'swashbuckler-flashy-dodge',
    name: 'Flashy Dodge',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'You dodge aside flamboyantly. You gain a +2 circumstance bonus to AC against the triggering attack. If the attack misses you, you gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'reaction',
    mechanics: 'Trigger: You are targeted by an attack and can see the attacker. +2 circumstance AC vs that attack. Miss → gain panache. Leads to: Flashy Roll.',
  },
  {
    id: 'swashbuckler-flying-blade',
    name: 'Flying Blade',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'You\'ve learned to apply your flashy techniques to thrown weapons as well as melee attacks. When you have panache and make a thrown weapon Strike, you can apply your precise strike damage. In addition, all of your finisher actions can be performed with a thrown weapon in addition to a melee weapon. Since a thrown weapon is a ranged attack, this doesn\'t allow you to use Confident Finisher or other finishers on a target that is not within reach.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Thrown weapons can use precise strike damage and finishers. Ranged attack rules still apply (no melee reach requirements bypassed).',
  },
  {
    id: 'swashbuckler-focused-fascination',
    name: 'Focused Fascination',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'Even your less impressive social performances captivate the audience. When you Fascinate a target using the appropriate stylish combatant action for your style and get a success (but not a critical success), you fascinate the target, but only until the end of your next turn (instead of the normal duration for a critical success).',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Success on style bravado action fascinates target until end of next turn (normally requires crit success). Works with style-specific bravado actions.',
  },
  {
    id: 'swashbuckler-goading-feint',
    name: 'Goading Feint',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'Your Feints have an extra effect. When you successfully Feint a creature, it takes a –2 circumstance penalty to attack rolls against creatures other than you until the beginning of your next turn. On a critical success, the penalty is –3.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    prerequisites: ['Trained in Deception'],
    mechanics: 'Successful Feint: target takes –2 circumstance penalty to attacks vs others (–3 on crit success) until start of your next turn.',
  },
  {
    id: 'swashbuckler-one-for-all',
    name: 'One For All',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'With a dramatic flourish, you call encouragement to an ally. Attempt a Diplomacy check (DC usually 20, adjusted by GM). If the creature you\'re encouraging is at least 2 levels lower, it gets automatic success. Critical Success: The ally gains a +2 circumstance bonus to the first attack roll or skill check it attempts before the start of your next turn. Success: +1 circumstance bonus. Critical Failure: –1 circumstance penalty.',
    implemented: 'full',
    traits: ['Bravado', 'Linguistic', 'Swashbuckler'],
    actionCost: 1,
    prerequisites: ['Trained in Diplomacy'],
    mechanics: 'Diplomacy check, DC typically 20. Replaces Aid\'s +1 with this result. Auto-success if target is ≥2 levels lower. Bravado: crit success = panache; failure = off-guard until start of next turn.',
  },
  {
    id: 'swashbuckler-plummeting-roll',
    name: 'Plummeting Roll',
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'You roll with a fall to minimize damage using your panache. You gain the Cat Fall skill feat. In addition, when you fall, you can use a reaction to Stride up to 10 feet after you land (or after you take damage, if you take damage from a fall). You must end this Stride on a surface that can support you, and you don\'t take damage from the fall for the distance of this additional Stride.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Gain Cat Fall feat. Reaction when falling: Stride up to 10 ft after landing, no fall damage for that distance.',
  },
  {
    id: 'swashbuckler-youre-next',
    name: "You're Next",
    source: 'Swashbuckler',
    category: 'class',
    level: 1,
    description:
      'After downing a foe, you menace another. Attempt to Demoralize a creature within 60 feet, with a +2 circumstance bonus. If you have legendary proficiency in Intimidation, you can use this as a free action with the same trigger.',
    implemented: 'full',
    traits: ['Emotion', 'Fear', 'Mental', 'Rogue', 'Swashbuckler', 'Visual'],
    actionCost: 'reaction',
    prerequisites: ['Trained in Intimidation'],
    mechanics: 'Trigger: You reduce an enemy to 0 HP. Demoralize within 60 ft with +2 circumstance bonus. Legendary Intimidation: becomes free action. Shared with Rogue.',
  },

  // —— Level 2 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-after-you',
    name: 'After You',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You step aside gracefully, letting others take the lead — but only to make a more dramatic entrance. If you choose to go last in the initiative order for the first round of combat (placing your initiative at 0), you gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'free',
    mechanics: 'Trigger: You roll initiative. Choose to go last (initiative = 0) in round 1 → gain panache.',
  },
  {
    id: 'swashbuckler-antagonize',
    name: 'Antagonize',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You keep pressure on a frightened foe. When a creature that has the frightened condition due to your actions would reduce its frightened value, it can\'t reduce below frightened 1 until it takes a hostile action against you. This effect ends automatically at the end of your next turn if the target couldn\'t see you at any point during that time.',
    implemented: 'full',
    traits: ['Emotion', 'Fear', 'Mental', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Frightened from your actions can\'t reduce below 1 until target attacks you or loses sight of you for a full turn. Synergizes strongly with Braggart style.',
  },
  {
    id: 'swashbuckler-brandishing-draw',
    name: 'Brandishing Draw',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You draw your weapon with a menacing flourish. You Interact to draw a weapon, then make a melee Strike or use a finisher with the weapon you drew.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 1,
    mechanics: 'Interact (draw weapon) + melee Strike or finisher in one action. Excellent opening action.',
  },
  {
    id: 'swashbuckler-charmed-life',
    name: 'Charmed Life',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You seem to have a knack for getting out of sticky situations. You gain a +2 circumstance bonus to the triggering saving throw. If you succeed, you gain panache.',
    implemented: 'full',
    traits: ['Fortune', 'Swashbuckler'],
    actionCost: 'reaction',
    mechanics: 'Trigger: You attempt a saving throw. Frequency: once per day. +2 circumstance bonus. Success → gain panache. Leads to: Incredible Luck.',
  },
  {
    id: 'swashbuckler-enjoy-the-show',
    name: 'Enjoy the Show',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You can humiliate foes with your flashy performance. You gain the bravado ability on your Perform check when used as part of your stylish combatant action for the wit style. After using Perform, designate one enemy within 30 feet that witnessed your performance. That enemy takes a –1 circumstance penalty to attack rolls against creatures other than you until the end of your next turn. If you have panache, the penalty is –2.',
    implemented: 'full',
    traits: ['Bravado', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Perform gains bravado. After Perform, designate enemy within 30 ft: –1 attack penalty vs others (–2 with panache) until end of next turn. Bravado: crit success = panache; failure = off-guard.',
  },
  {
    id: 'swashbuckler-fanes-fourberie',
    name: "Fane's Fourberie",
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'Stella Fane has perfected a technique for using playing cards as weapons. When you enter this stance, choose whether to treat playing cards in your possession as daggers or darts; you can wield a playing card in all ways as the chosen weapon until the stance ends. As long as the majority of the deck remains, any lost or thrown cards can be found after 1 minute. A character with this feat can enchant a single deck of playing cards as a magic weapon, etching fundamental and property runes directly onto the deck.',
    implemented: 'full',
    traits: ['Uncommon', 'Rogue', 'Stance', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Stance. Playing cards = daggers or darts. Can enchant deck with runes. Lost cards recovered after 1 min if majority of deck remains. Access: Pathfinder Society member.',
    subChoices: { label: 'Choose card weapon type', options: [
      { id: 'daggers', name: 'Daggers', description: 'Cards function as daggers' },
      { id: 'darts', name: 'Darts', description: 'Cards function as darts' },
    ] },
  },
  {
    id: 'swashbuckler-finishing-follow-through',
    name: 'Finishing Follow-through',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You regain panache quickly after a successful finisher finishes the job. If a finisher you use reduces a foe to 0 Hit Points, you gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'If finisher reduces foe to 0 HP → gain panache. Enables chaining finishers across multiple foes.',
  },
  {
    id: 'swashbuckler-retreating-finisher',
    name: 'Retreating Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You make a graceful departure from an enemy. Make a melee Strike, then Step. If the Strike hits, you can Step a second time.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike + Step. Hit: additional Step. Great for hit-and-run.',
  },
  {
    id: 'swashbuckler-tumble-behind',
    name: 'Tumble Behind',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You tumble under and behind your foe to catch them off guard. When you successfully Tumble Through, the foe whose space you passed through is off-guard against the next attack you make before the end of your turn.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Successful Tumble Through: target is off-guard vs your next attack this turn.',
  },
  {
    id: 'swashbuckler-unbalancing-finisher',
    name: 'Unbalancing Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 2,
    description:
      'You attack a foe and leave them unsteady. Make a melee Strike. If it hits, the target is off-guard until the end of your next turn.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; hit → target off-guard until end of your next turn. Great setup for allies.',
  },
  // —— Level 4 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-dastardly-dash',
    name: 'Dastardly Dash',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You dart around your foe\'s attack, creating an opening. Stride up to your Speed. During this movement, you can attempt to move through the space of one enemy. Attempt an Acrobatics check against the enemy\'s Reflex DC. On a success, you move through the enemy\'s space, treating it as difficult terrain, and the target is off-guard against the next melee Strike you make before the end of your turn. On a critical success, it\'s not difficult terrain and the enemy is off-guard until the start of your next turn. On a failure, your movement ends and you trigger reactions as normal.',
    implemented: 'full',
    traits: ['Flourish', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Stride + pass through one enemy (Acrobatics vs Reflex DC). Success: difficult terrain, off-guard vs next Strike. Crit success: not difficult terrain, off-guard until start of next turn. Failure: movement ends.',
  },
  {
    id: 'swashbuckler-devrins-dazzling-diversion',
    name: "Devrin's Dazzling Diversion",
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'Devrin Arlos could even counter magical effects with his diversions. When you succeed at a Create a Diversion check, the diversion also ends any fascinated or confused conditions on allies who could observe it.',
    implemented: 'full',
    traits: ['Uncommon', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Successful Create a Diversion clears fascinated and confused from observing allies. Access: Graduate of Oatia Academy.',
  },
  {
    id: 'swashbuckler-even-the-odds',
    name: 'Even the Odds',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You fight with extra flair to overcome challenges. You gain a +2 circumstance bonus to your next attack roll before the end of your turn against the triggering target.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'free',
    mechanics: 'Trigger: A foe within reach critically succeeds on an attack against you. Frequency: once per 10 minutes. +2 circumstance bonus to next attack vs that foe this turn.',
  },
  {
    id: 'swashbuckler-flamboyant-athlete',
    name: 'Flamboyant Athlete',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'When you succeed at an Athletics check to Climb, Force Open, High Jump, Long Jump, or Swim, you gain panache. If you have panache, you can use all your panache speed bonus for those types of movement. You can take 10 on Athletics checks for Climb, Swim, High Jump, and Long Jump as long as you aren\'t in a hazardous situation.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    prerequisites: ['Expert in Athletics'],
    mechanics: 'Success on Climb/Force Open/High Jump/Long Jump/Swim → panache. Panache speed applies to climb/swim. Can Take 10 on Athletics for these unless in hazardous situations.',
  },
  {
    id: 'swashbuckler-guardians-deflection',
    name: "Guardian's Deflection",
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You interpose your weapon or body to protect an adjacent ally. The ally gains a +2 circumstance bonus to AC against the triggering attack. If the triggering attack critically fails, you gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'reaction',
    mechanics: 'Trigger: An ally adjacent to you is targeted by an attack and you can see the attacker. +2 circumstance AC for ally. Crit fail → gain panache.',
  },
  {
    id: 'swashbuckler-impaling-finisher',
    name: 'Impaling Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You stab two foes with one quick thrust. Make a melee Strike; you deal damage to the target as normal. Also make a melee Strike against a second creature that is adjacent to the first target. The second Strike has a –2 penalty, and this additional attack doesn\'t count toward your multiple attack penalty. Both Strikes count as finishers.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike target + Strike adjacent creature at –2 penalty. Second Strike doesn\'t count for MAP. If first Strike misses, still attempt second Strike. Both get precise strike finisher damage.',
  },
  {
    id: 'swashbuckler-leading-dance',
    name: 'Leading Dance',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You maneuver your foe around the battlefield like a dance partner. Attempt an Acrobatics or appropriate style skill check against the target\'s Reflex DC.',
    implemented: 'full',
    traits: ['Bravado', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Acrobatics or style skill vs Reflex DC. Crit success: move up to Speed, target follows (each 5 ft you move, target moves 5 ft toward you). Success: move up to 5 ft, target moves 5 ft toward you. Bravado: crit success = panache; failure = off-guard.',
  },
  {
    id: 'swashbuckler-masquerade-of-seasons-stance',
    name: 'Masquerade of Seasons Stance',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'Using the Masquerade of Seasons style, you can Season Step instead of Stepping, teleporting within a short distance. While in this stance, you gain the Season Step action: you teleport 5 feet. You must have line of sight to where you\'re teleporting.',
    implemented: 'full',
    traits: ['Rare', 'Stance', 'Swashbuckler', 'Teleportation'],
    actionCost: 1,
    mechanics: 'Stance. Gain Season Step: teleport 5 ft (requires line of sight). Can Season Step anywhere you would normally Step. Extremely potent positioning tool.',
  },
  {
    id: 'swashbuckler-swaggering-initiative',
    name: 'Swaggering Initiative',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You bounce on the balls of your feet and show your confidence. You can use Acrobatics for your initiative roll. If you roll Acrobatics for initiative and your result is a success, it\'s a critical success instead; if your result is a critical success, you also gain panache.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'free',
    mechanics: 'Trigger: You roll initiative. Use Acrobatics for initiative. Success → crit success. Crit success → also gain panache.',
  },
  {
    id: 'swashbuckler-twirling-throw',
    name: 'Twirling Throw',
    source: 'Swashbuckler',
    category: 'class',
    level: 4,
    description:
      'You hurl a foe to the ground in a flashy spin. Make a melee Strike. If the Strike hits a foe who is grabbed, restrained, or prone, the target is thrown 10 feet in a direction of your choice and then falls prone. The target takes 1d6 bludgeoning damage for every 10 feet of distance it\'s thrown.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike vs grabbed/restrained/prone foe; hit → throw 10 ft in chosen direction + prone + 1d6 bludgeoning per 10 ft thrown. Great with Gymnast style (Grapple/Trip bravado).',
  },

  // —— Level 6 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-agile-maneuvers',
    name: 'Agile Maneuvers',
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'You can use your acrobatic skill to perform combat maneuvers. You use Acrobatics instead of Athletics for the Grapple, Reposition, Shove, and Trip actions. You can use a one-handed melee weapon of the agile or finesse trait for these actions instead of having a free hand.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    prerequisites: ['Expert in Acrobatics'],
    mechanics: 'Acrobatics replaces Athletics for Grapple/Reposition/Shove/Trip. Can use agile/finesse one-handed melee weapon instead of free hand.',
  },
  {
    id: 'swashbuckler-combination-finisher',
    name: 'Combination Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'You punctuate your combo with a spectacular finale. Make two melee Strikes, each using your current multiple attack penalty. The second Strike takes a –2 circumstance penalty. If both Strikes hit, the damage from the second Strike is doubled (before applying any other effects that change the number of dice like deadly or vital strike).',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Finisher (2 actions). Two Strikes at current MAP. Second Strike gets –2 circumstance penalty. If both hit: second Strike damage doubled. Massive damage potential.',
  },
  {
    id: 'swashbuckler-pirouette',
    name: 'Pirouette',
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'You dance away from an enemy\'s missed Strike. You Step or Stride up to half your Speed.',
    implemented: 'full',
    traits: ['Rare', 'Swashbuckler'],
    actionCost: 'reaction',
    mechanics: 'Trigger: An enemy within reach misses you with a melee Strike. Step or Stride up to half Speed. Excellent repositioning.',
  },
  {
    id: 'swashbuckler-precise-finisher',
    name: 'Precise Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'You\'ve learned how to land particularly devastating blows when you dash an enemy\'s hopes of defeating you. The failure effect of Confident Finisher now deals your full precise strike damage, rather than half.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Confident Finisher failure effect: full precise strike finisher damage instead of half. Also affects Eternal Confidence at L19. Massive consistency boost.',
  },
  {
    id: 'swashbuckler-reactive-strike',
    name: 'Reactive Strike',
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'You lash out at a foe that leaves an opening. Make a melee Strike against the triggering creature. If your attack is a critical hit and the trigger was a manipulate action, you disrupt that action. This Strike doesn\'t count toward your multiple attack penalty, and your multiple attack penalty doesn\'t apply to this Strike.',
    implemented: 'full',
    traits: ['Champion', 'Fighter', 'Magus', 'Swashbuckler'],
    actionCost: 'reaction',
    mechanics: 'Trigger: A creature within reach uses a manipulate or move action, makes a ranged attack, or leaves a square during a move action. Crit hit on manipulate → disrupts. Not affected by MAP. Shared feat across martial classes.',
  },
  {
    id: 'swashbuckler-stellas-stab-and-snag',
    name: "Stella's Stab and Snag",
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'Stella Fane has perfected a swashbuckling technique for fighting with a weapon in each hand. Make a melee Strike with your main weapon. If the Strike hits, you can Interact to draw a weapon with your other hand and make a melee Strike with the drawn weapon; this Strike has a –2 penalty and uses the same MAP as the first Strike. If both Strikes hit, the second Strike deals 1 additional precision damage per weapon damage die.',
    implemented: 'full',
    traits: ['Uncommon', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Two actions. Strike with main weapon; if hit: draw second weapon + Strike with it at –2 and same MAP. Both hit: +1 precision damage per die on second Strike. Access: Pathfinder Society member.',
  },
  {
    id: 'swashbuckler-vexing-tumble',
    name: 'Vexing Tumble',
    source: 'Swashbuckler',
    category: 'class',
    level: 6,
    description:
      'You tumble around your foe, distracting them. Tumble Through an enemy\'s space. If you succeed, the foe is off-guard against all your attacks until the start of your next turn (instead of just the next attack).',
    implemented: 'full',
    traits: ['Bravado', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Bravado Tumble Through variant. Success: off-guard vs ALL your attacks until start of next turn (better than normal Tumble Behind). Bravado: crit success = panache; failure = off-guard.',
  },

  // —— Level 8 ——————————————————————————————————————————————
  {
    id: 'swashbuckler-bleeding-finisher',
    name: 'Bleeding Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You deliver a particularly punishing blow that causes your target to bleed profusely. Make a melee Strike. On a hit, the target takes persistent bleed damage equal to half your precise strike finisher damage (rounded down).',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; hit → persistent bleed = half precise strike finisher damage (L8: 2d6 → 1d6 bleed; L17: 6d6 → 3d6 bleed).',
  },
  {
    id: 'swashbuckler-distracting-toss',
    name: 'Distracting Toss',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You throw something to distract a foe. You Interact to draw a weapon with the thrown trait, then make a ranged Strike with it against a foe within your first range increment. If the Strike hits, you attempt a Deception or Diplomacy check to Create a Diversion against the same foe.',
    implemented: 'full',
    traits: ['Bravado', 'Flourish', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Two actions. Draw thrown weapon + ranged Strike. Hit → Create a Diversion (Deception or Diplomacy) vs same foe. Bravado: crit success = panache; failure = off-guard.',
  },
  {
    id: 'swashbuckler-dual-finisher',
    name: 'Dual Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You gracefully make a bold attack with both weapons. Make two melee Strikes, one with each of two melee weapons you\'re wielding. Both Strikes use your current multiple attack penalty. If both Strikes hit, combine their damage for the purposes of resistances and weaknesses.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Two Strikes with dual weapons at current MAP. Both hit: combine damage for resistance/weakness purposes. Great with two different damage types.',
  },
  {
    id: 'swashbuckler-flamboyant-cruelty',
    name: 'Flamboyant Cruelty',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You have a flashy and dramatic style of fighting that also happens to be vicious and punishing. Whenever you gain panache, you can choose to deal your precise strike damage to one enemy within 30 feet that can see you. This damage is mental damage and doesn\'t benefit from the extra finisher damage from precise strike.',
    implemented: 'full',
    traits: ['Rare', 'Emotion', 'Mental', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'When gaining panache: deal flat precise strike damage (not finisher dice) as mental damage to visible enemy within 30 ft. L8 +4 mental, L17 +6 mental. Requires enemy to see you.',
  },
  {
    id: 'swashbuckler-flashy-roll',
    name: 'Flashy Roll',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'When your Flashy Dodge is a success, you can also Stride up to 10 feet as part of the reaction. If the attack still misses, you gain panache as per Flashy Dodge.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    prerequisites: ['Flashy Dodge'],
    mechanics: 'Upgrades Flashy Dodge: add Stride up to 10 ft on success. Miss still grants panache.',
  },
  {
    id: 'swashbuckler-grand-dance',
    name: 'Grand Dance',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You lead multiple enemies in a dance. Attempt the Leading Dance action, but you can target up to two enemies within reach. Make a separate check against each target. Each target you succeed against follows you as described in Leading Dance.',
    implemented: 'full',
    traits: ['Rare', 'Swashbuckler'],
    actionCost: 'passive',
    prerequisites: ['Leading Dance'],
    mechanics: 'Two actions. Leading Dance against up to 2 enemies. Separate check vs each. Each success: that target follows you.',
  },
  {
    id: 'swashbuckler-knights-retaliation',
    name: "Knight's Retaliation",
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You protect an ally and strike back. When you use Guardian\'s Deflection and the triggering attack is a critical failure, you can make a melee Strike against the attacker if they\'re within your reach.',
    implemented: 'full',
    traits: ['Uncommon', 'Swashbuckler'],
    actionCost: 'reaction',
    prerequisites: ["Guardian's Deflection"],
    mechanics: 'When using Guardian\'s Deflection and attack crit fails: make melee Strike vs attacker. Access: Knight of Lastwall.',
  },
  {
    id: 'swashbuckler-stunning-finisher',
    name: 'Stunning Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'You hit your foe at just the right moment to stun them. Make a melee Strike. If it hits, the target must succeed at a Fortitude save against your class DC or be stunned 1 (stunned 3 on a critical failure).',
    implemented: 'full',
    traits: ['Finisher', 'Incapacitation', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; hit → Fortitude vs class DC. Fail: stunned 1. Crit fail: stunned 3. Incapacitation trait: foe higher level than you treats result as one degree better.',
  },
  {
    id: 'swashbuckler-vivacious-bravado',
    name: 'Vivacious Bravado',
    source: 'Swashbuckler',
    category: 'class',
    level: 8,
    description:
      'Your daring strikes and heroic actions let you bolster your panache further. When you gain panache, you also gain temporary Hit Points equal to your Charisma modifier (minimum 1). These temporary Hit Points last until the end of your next turn.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 1,
    mechanics: 'When gaining panache: gain temp HP = Charisma modifier (min 1). Lasts until end of next turn. Stacks with repeated panache gains by refreshing.',
  },
  // —— Level 10 —————————————————————————————————————————————
  {
    id: 'swashbuckler-buckler-dance',
    name: 'Buckler Dance',
    source: 'Swashbuckler',
    category: 'class',
    level: 10,
    description:
      'You dance with your buckler in a flowing pattern. While in this stance, you get a +2 circumstance bonus to AC as if you were using Raise a Shield with a buckler. Unlike Raise a Shield, you don\'t need to use an action to get this benefit. While in this stance, you can use the Shield Block reaction with your buckler even if you didn\'t Raise a Shield.',
    implemented: 'full',
    traits: ['Stance', 'Swashbuckler'],
    actionCost: 1,
    prerequisites: ['Elegant Buckler'],
    mechanics: 'Stance. Passive +2 circumstance AC (no action needed). Can Shield Block without Raising Shield. Stacks with Elegant Buckler\'s panache benefit.',
  },
  {
    id: 'swashbuckler-corpse-killers-defiance',
    name: "Corpse-Killer's Defiance",
    source: 'Swashbuckler',
    category: 'class',
    level: 10,
    description:
      'Your confident presence is anathema to the undead. You hold up a religious symbol and attempt a Diplomacy check against the Will DC of one undead creature within 30 feet. Critical Success: The undead is frightened 3. Success: Frightened 2. Critical Failure: The undead is temporarily immune to your Corpse-Killer\'s Defiance for 24 hours.',
    implemented: 'full',
    traits: ['Uncommon', 'Emotion', 'Fear', 'Mental', 'Swashbuckler'],
    actionCost: 'reaction',
    prerequisites: ['Trained in Religion'],
    mechanics: 'Trigger: An undead within 30 ft attacks you or an ally. Diplomacy vs Will DC. Crit success: frightened 3. Success: frightened 2. Crit fail: 24-hour immunity. Access: Knight of Lastwall.',
  },
  {
    id: 'swashbuckler-dazzling-display',
    name: 'Dazzling Display',
    source: 'Swashbuckler',
    category: 'class',
    level: 10,
    description:
      'Using a flashy technique, you Demoralize all enemies within 30 feet. This doesn\'t have the bravado trait.',
    implemented: 'full',
    traits: ['Barbarian', 'Fighter', 'Swashbuckler', 'Visual'],
    actionCost: 1,
    prerequisites: ['Expert in Intimidation'],
    mechanics: 'AoE Demoralize: all enemies within 30 ft. Single Intimidation check. No bravado trait. Shared with Barbarian and Fighter.',
  },
  {
    id: 'swashbuckler-derring-do',
    name: 'Derring-do',
    source: 'Swashbuckler',
    category: 'class',
    level: 10,
    description:
      'When the going gets tough, the tough get flashy. When you roll a failure on an Acrobatics or Athletics check while you have panache, you can treat the failure as a success. Once you use this ability, you lose your panache.',
    implemented: 'full',
    traits: ['Fortune', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Failure → success on Acrobatics/Athletics check while you have panache. Costs panache. Fortune trait prevents stacking with other fortune effects.',
  },

  // —— Level 12 —————————————————————————————————————————————
  {
    id: 'swashbuckler-cheat-death',
    name: 'Cheat Death',
    source: 'Swashbuckler',
    category: 'class',
    level: 12,
    description:
      'You perform a feat that defies death itself. When you would be reduced to 0 Hit Points, you can spend all your remaining panache to instead be reduced to 1 Hit Point. If you do, you gain temporary Hit Points equal to 4 times your level that last until the end of your next turn.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'reaction',
    mechanics: 'Trigger: You would drop to 0 HP. Requires panache; consumes panache. Drop to 1 HP + gain temp HP = 4 × level (L12 = 48 temp HP). Lasts until end of next turn. Once per encounter effectively.',
  },
  {
    id: 'swashbuckler-get-used-to-disappointment',
    name: 'Get Used to Disappointment',
    source: 'Swashbuckler',
    category: 'class',
    level: 12,
    description:
      'You quip something witty to demoralize foes even when your tricks don\'t quite work out. You attempt to Demoralize a creature within 30 feet.',
    implemented: 'full',
    traits: ['Bravado', 'Swashbuckler'],
    actionCost: 'free',
    prerequisites: ['Expert in Intimidation'],
    mechanics: 'Trigger: You fail or critically fail at a bravado action. Demoralize within 30 ft as a free action. Bravado: crit success = panache; failure = off-guard. Turns failures into panache opportunities.',
  },
  {
    id: 'swashbuckler-mobile-finisher',
    name: 'Mobile Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 12,
    description:
      'You combine an attack and movement into one flowing action. Stride up to your Speed, then make a melee Strike. The Strike gains the finisher trait.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Stride up to Speed + melee Strike. Move + finisher in one action. Exceptional action economy for positioning + finishing.',
  },
  {
    id: 'swashbuckler-the-bigger-they-are',
    name: 'The Bigger They Are',
    source: 'Swashbuckler',
    category: 'class',
    level: 12,
    description:
      'You love a good challenge and are especially effective against larger foes. When you gain panache from a bravado action, if the foe is larger than you, you also gain a +1 circumstance bonus to damage rolls against them until the end of your next turn. If the foe is two or more sizes larger, the bonus is +2.',
    implemented: 'full',
    traits: ['Bravado', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'When gaining panache from bravado vs larger foe: +1 circumstance damage (or +2 if 2+ sizes larger) until end of next turn. Stacks with precise strike.',
  },

  // —— Level 14 —————————————————————————————————————————————
  {
    id: 'swashbuckler-flamboyant-leap',
    name: 'Flamboyant Leap',
    source: 'Swashbuckler',
    category: 'class',
    level: 14,
    description:
      'You make a dramatic leap high into the air, potentially landing near or on top of your foes. You High Jump or Long Jump. At any point during the jump, you can make a melee Strike against an adjacent creature. The Strike gains the finisher trait. Immediately after the Strike, you can attempt a Grab an Edge reaction even if your hands aren\'t free, provided you\'re adjacent to a surface you could hold.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Two actions. High Jump or Long Jump + melee finisher Strike at any point during the jump. Can Grab an Edge after Strike even without free hands.',
  },
  {
    id: 'swashbuckler-impossible-riposte',
    name: 'Impossible Riposte',
    source: 'Swashbuckler',
    category: 'class',
    level: 14,
    description:
      'Your ripostes can deflect almost any attack. You can use Opportune Riposte when the triggering attack is a failure (you no longer need it to be a critical failure). If the attack is a critical failure, your Opportune Riposte gains a +2 circumstance bonus to the attack roll.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Upgrades Opportune Riposte trigger: failure (not just crit failure). Crit failure: +2 circumstance to attack roll. Massively increases riposte frequency.',
  },
  {
    id: 'swashbuckler-perfect-finisher',
    name: 'Perfect Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 14,
    description:
      'When you focus on delivering a perfectly executed finisher, it\'s difficult to deny. Make a melee Strike. If the Strike misses, you can roll the attack a second time and use the better result.',
    implemented: 'full',
    traits: ['Finisher', 'Fortune', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; if miss: roll again, take better result. Fortune trait prevents stacking with other fortune effects. Massive accuracy boost.',
  },
  // —— Level 16 —————————————————————————————————————————————
  {
    id: 'swashbuckler-deadly-grace',
    name: 'Deadly Grace',
    source: 'Swashbuckler',
    category: 'class',
    level: 16,
    description:
      'Your finishing blows are lethally graceful. When you hit with a finisher, you can add a circumstance bonus to the damage roll equal to half your precise strike bonus damage (for instance, if your precise strike bonus is +6, the circumstance bonus would be +3). On a critical hit, this bonus is doubled as normal.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Finisher hit: +half precise strike flat bonus as circumstance damage. At L17 precise strike = +6, so bonus = +3 (+6 on crit). Stacks with precise strike finisher dice.',
  },
  {
    id: 'swashbuckler-felicitous-riposte',
    name: 'Felicitous Riposte',
    source: 'Swashbuckler',
    category: 'class',
    level: 16,
    description:
      'When you make an Opportune Riposte, if the Strike misses you can roll the attack a second time and use the better result.',
    implemented: 'full',
    traits: ['Fortune', 'Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Opportune Riposte miss: reroll and take better result. Fortune trait. Synergizes with Impossible Riposte (more triggers) and Eternal Confidence (failure effect on riposte miss).',
  },
  {
    id: 'swashbuckler-revitalizing-finisher',
    name: 'Revitalizing Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 16,
    description:
      'You finish an enemy with such flair that you inspire yourself to keep going. Make a melee Strike. If the Strike hits, you gain temporary Hit Points equal to your precise strike finisher damage. These temporary Hit Points last for 1 minute.',
    implemented: 'full',
    traits: ['Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; hit → gain temp HP = precise strike finisher damage roll (e.g., L17: 6d6 temp HP). Lasts 1 minute. Massive survivability boost.',
  },

  // —— Level 18 —————————————————————————————————————————————
  {
    id: 'swashbuckler-incredible-luck',
    name: 'Incredible Luck',
    source: 'Swashbuckler',
    category: 'class',
    level: 18,
    description:
      'Even other characters who live by their luck are impressed by yours. You can use Charmed Life once per hour, rather than once per day.',
    implemented: 'full',
    traits: ['Fortune', 'Swashbuckler'],
    actionCost: 'passive',
    prerequisites: ['Charmed Life'],
    mechanics: 'Charmed Life frequency: once per hour (from once per day). Dramatically more uses per adventuring day.',
  },
  {
    id: 'swashbuckler-lethal-finisher',
    name: 'Lethal Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 18,
    description:
      'You stab your foe in a vital spot, attempting an instantly lethal blow. Make a melee Strike; if the Strike hits, the target must succeed at a Fortitude save against your class DC. Critical Success: The target is unaffected. Success: The target is drained 1. Failure: The target is drained 2 and doomed 1. Critical Failure: The target dies.',
    implemented: 'full',
    traits: ['Death', 'Finisher', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; hit → Fortitude vs class DC. Crit success: nothing. Success: drained 1. Failure: drained 2 + doomed 1. Crit failure: instant death. Death trait: not usable on non-living creatures. Incapacitation-lite.',
  },
  {
    id: 'swashbuckler-parry-and-riposte',
    name: 'Parry and Riposte',
    source: 'Swashbuckler',
    category: 'class',
    level: 18,
    description:
      'You can parry almost any attack and immediately strike back. When you use Opportune Riposte, if the triggering attack would hit you, you gain a +2 circumstance bonus to AC against that attack. If the attack now misses, you can make the riposte Strike as normal.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Upgrades Opportune Riposte: if attack would hit, +2 circumstance AC against it. If now misses, proceed with riposte Strike. Can turn hits into misses and then punish them.',
  },

  // —— Level 20 —————————————————————————————————————————————
  {
    id: 'swashbuckler-illimitable-finisher',
    name: 'Illimitable Finisher',
    source: 'Swashbuckler',
    category: 'class',
    level: 20,
    description:
      'You launch an incredible finisher that goes beyond your usual limits. Make a melee Strike; if the Strike hits, you deal maximum precise strike finisher damage (instead of rolling). If the Strike is a critical hit, you also deal maximum weapon damage dice.',
    implemented: 'full',
    traits: ['Finisher', 'Flourish', 'Swashbuckler'],
    actionCost: 1,
    mechanics: 'Finisher. Strike; hit → maximum precise strike finisher dice (e.g. L20: 6×6 = 36). Crit: also max weapon dice. Flourish trait: once per turn.',
  },
  {
    id: 'swashbuckler-inexhaustible-countermoves',
    name: 'Inexhaustible Countermoves',
    source: 'Swashbuckler',
    category: 'class',
    level: 20,
    description:
      'You have an endless supply of tricks to foil your foes. You gain an additional reaction at the start of each of your turns that you can use only for an Opportune Riposte or a reaction granted by a swashbuckler feat. You still can\'t use more than one reaction on the same triggering action.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Extra reaction per turn, usable only for Opportune Riposte or swashbuckler feat reactions (Flashy Dodge, Charmed Life, Guardian\'s Deflection, etc.). Can\'t use multiple reactions on same trigger.',
  },
  {
    id: 'swashbuckler-panache-paragon',
    name: 'Panache Paragon',
    source: 'Swashbuckler',
    category: 'class',
    level: 20,
    description:
      'You have perfected your craft to such a degree that you always perform at the height of your abilities. At the start of each of your turns, you gain panache. If you already had panache at the start of your turn, you instead gain temporary Hit Points equal to your Charisma modifier that last until the start of your next turn.',
    implemented: 'full',
    traits: ['Swashbuckler'],
    actionCost: 'passive',
    mechanics: 'Start of turn: gain panache. If already have panache: gain temp HP = Charisma modifier. Guarantees panache every turn. With Vivacious Bravado, both temp HP sources stack.',
  },
];

export const SWASHBUCKLER_CLASS_FEATS: FeatEntry[] = RAW_SWASHBUCKLER_CLASS_FEATS.map(f => ({
  ...f,
  traits: f.traits ?? ['Swashbuckler'],
}));
