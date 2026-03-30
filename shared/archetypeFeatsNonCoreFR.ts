import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// NON-CORE ARCHETYPE FEATS — F through R
// Field Propagandist, Guerrilla, Wylderheart,
// Razmiran Priest, Rivethun Emissary, Rivethun Invoker,
// Rivethun Involutionist
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// FIELD PROPAGANDIST  (Battlecry! pg. 58)
// Category: Combat Style, Core
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=326
// Rarity: Common
// ──────────────────────────────────────────────────────────

export const FIELD_PROPAGANDIST_FEATS: FeatEntry[] = [
  {
    id: 'field-propagandist-dedication',
    name: 'Field Propagandist Dedication',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'Having devoted your life to crafting propaganda, you know that winning the hearts and minds of soldiers can be a deciding factor in securing the successful outcome of a war. You gain the Spread Propaganda exploration activity. While you are not immune to propaganda, you are resistant to it. You gain a +2 circumstance bonus to your Perception DC against attempts made by others to Lie to you. If you have the Lie to Me skill feat, you gain a +2 circumstance bonus to your Deception DC. You become trained in Society. If you were already trained, you become an expert instead. Spread Propaganda (exploration, secret): You spread propaganda about a faction. Takes as long as Gather Information (typically 2 hours). GM rolls secret Deception check. Critical Success: propaganda spreads for 1 month, untraceable, and you learn info as if Recall Knowledge succeeded. Success: propaganda persists 1 week, traceable on crit success Gather Info. Failure: propaganda fails. Critical Failure: –4 circumstance penalty to spread propaganda about same subject for 1 week; subject and enemies learn of your attempt.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Charisma +2', 'trained in Deception', 'trained in Diplomacy'],
    mechanics:
      'Grants Spread Propaganda exploration activity (secret Deception check). +2 circumstance bonus to Perception DC vs Lie. If Lie to Me feat: +2 circumstance to Deception DC. Train Society (or expert if already trained). Dedication-lock: must take 2 Field Propagandist archetype feats before taking another dedication.',
  },
  {
    id: 'field-propagandist-fabricate-truth',
    name: 'Fabricate Truth',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You invent a false truth by fast talking, switching arguments, shifting the standard of evidence, and generally confounding others. Choose a creature within 30 feet that you\'re aware of. Attempt a Deception check against that target\'s Will DC. Regardless of your result, the target is temporarily immune to your attempts to Fabricate Truth for 10 minutes. Critical Success: The target becomes stupefied 2 for 1 round. Success: The target becomes stupefied 1 for 1 round.',
    implemented: 'full',
    traits: ['Archetype', 'Auditory', 'Concentrate', 'Emotion', 'Linguistic', 'Mental'],
    actionCost: 1,
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Single target within 30 ft. Deception vs Will DC. Crit Success: stupefied 2 (1 round). Success: stupefied 1 (1 round). 10 min temp immune regardless of result. Upgraded by Mass Delusion to affect all enemies in 30 ft.',
  },
  {
    id: 'field-propagandist-predispose-settlement',
    name: 'Predispose Settlement',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You spend 7 days of downtime seeding propaganda through a settlement with a population of 2,500 or fewer. At 10th level, this increases to 10,000 or fewer, and at 16th level, you can affect settlements of any size. Select a faction or organization that this propaganda targets and whether you are improving or decreasing the settlement\'s attitude toward that faction. Attempt a Deception or Diplomacy check against the hard DC of the settlement\'s level. Critical Success: Adjust attitude by two steps, +1 circumstance to initiative vs targeted faction members for 1 week. Success: Adjust attitude by one step. Changes last 1 week. Critical Failure: The settlement\'s attitude toward you decreases by one step.',
    implemented: 'full',
    traits: ['Archetype', 'Downtime', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Field Propagandist Dedication', 'expert in Deception'],
    mechanics:
      'Downtime activity: 7 days. Settlement population cap scales (2,500 at base / 10,000 at 10th / any at 16th). Deception or Diplomacy vs hard DC of settlement level. Adjusts NPC attitude toward a faction for 1 week.',
  },
  {
    id: 'field-propagandist-invented-vulnerability',
    name: 'Invented Vulnerability',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You list off the potential fears and weaknesses of an enemy you can see or hear, speaking with such certainty that they become real. Attempt a Deception check against the enemy\'s Will DC. Select bludgeoning, piercing, or slashing damage. Regardless of your result, the target is temporarily immune to Invented Vulnerability for 10 minutes. Critical Success: The target gains weakness to the selected type of damage equal to 3 + half your level for 1 round. Success: The target gains weakness 5 to the selected type of damage for 1 round.',
    implemented: 'full',
    traits: ['Archetype', 'Auditory', 'Concentrate', 'Linguistic', 'Mental'],
    actionCost: 1,
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Frequency: once per round. Deception vs Will DC. Select B/P/S. Crit Success: weakness = 3 + floor(level/2) for 1 round. Success: weakness 5 for 1 round. 10 min temp immune.',
  },
  {
    id: 'field-propagandist-invincible-army',
    name: 'Invincible Army',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You enumerate the many virtues and victories of your chosen allies, creating a story of their invincibility so convincing that it is as good as the truth. Choose an ally you can see and attempt a Deception or Diplomacy check against the hard DC for the target\'s level. On a success, the target gains resistance 5 to either bludgeoning, piercing, or slashing damage, chosen when you use this ability. You can instead attempt your check against a very hard DC for the target\'s level to give them resistance to two damage types, adding acid, fire, cold, electricity, and sonic to the damage types you can grant resistance to.',
    implemented: 'full',
    traits: ['Archetype', 'Auditory', 'Concentrate', 'Linguistic', 'Mental'],
    actionCost: 1,
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Frequency: once per round. Choose ally in line of sight. Deception or Diplomacy vs hard DC for ally\'s level → resistance 5 to 1 chosen physical type (1 round). Alternatively vs very hard DC → resistance 5 to 2 types (expanded list: B/P/S/acid/fire/cold/electricity/sonic).',
  },
  {
    id: 'field-propagandist-orators-filibuster',
    name: "Orator's Filibuster",
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'When you seek to convince others of the worth of your cause, you are capable of unleashing such an entrancing torrent of rhetoric and metaphor that it is all but impossible to look away from you. When you begin a conversation or similar attempt with the goal of Making an Impression, all creatures who are observing you become fascinated unless they succeed at a Will save against the higher of your class DC or spell DC. Creatures familiar with you are immune. Affected creatures remain fascinated for as long as you continue your filibuster, with a new save at the end of each minute. A creature that saves is also unaffected by your Make an Impression attempt. You can continue indefinitely, but every 10 minutes you must attempt a Fortitude save against a hard DC for your level or the filibuster ends (no retry for 1 hour).',
    implemented: 'full',
    traits: ['Archetype', 'Auditory', 'Concentrate', 'Linguistic', 'Mental'],
    actionCost: 'passive',
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Triggered on Make an Impression. Observers: Will save vs higher of class DC / spell DC or fascinated. Familiar allies immune. Fascinated persists while filibustering; new save each minute. User Fortitude save vs hard DC every 10 min or filibuster ends (1 hr cooldown on failure).',
  },
  {
    id: 'field-propagandist-a-tale-to-believe-in',
    name: 'A Tale to Believe In',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You recite a tale of prowess that rewrites the combat unfolding around you. You can attempt a counteract check against a mental effect that\'s currently affecting an ally within 30 feet, using Deception for the counteract check and half your level as the counteract rank.',
    implemented: 'full',
    traits: ['Archetype', 'Auditory', 'Concentrate', 'Linguistic', 'Mental'],
    actionCost: 1,
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Counteract a mental effect on ally within 30 ft. Counteract check uses Deception modifier. Counteract rank = floor(level / 2).',
  },
  {
    id: 'field-propagandist-truth-as-i-see-it',
    name: 'The Truth as I See It',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'Your knack for spinning a believable reality from threads of story is so practiced that sometimes even you begin to believe what you\'re saying. When you use Deception to Lie, you can carefully structure your deceits so that each individual statement you make is the truth, from a certain perspective. Once per day when using Deception to Lie, you can roll twice and take the better result. This is a fortune effect. You don\'t take a penalty to Deception checks while subject to the ring of truth spell or similar effects. Whenever you are subject to ring of truth or a similar effect, you can attempt a Deception check when you first begin speaking to counteract the spell\'s effects, with a counteract rank equal to half your level (rounded up); succeeding doesn\'t end the spell but causes it to indicate you are speaking the truth even when lying.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Fortune: 1/day roll twice on Deception to Lie. No penalty from ring of truth or similar. Can counteract ring of truth with Deception (counteract rank = ceil(level/2)); success makes the effect show you as truthful even when lying.',
  },
  {
    id: 'field-propagandist-mass-delusion',
    name: 'Mass Delusion',
    source: 'Field Propagandist (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You wave around fabricated evidence that contradicts what your enemies know to be true. When you Fabricate Truth, you can affect all enemies within 30 feet of you. Compare your Deception check result to the Will DCs of all targets. It is possible to get a different degree of success for each target.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Field Propagandist Dedication'],
    mechanics:
      'Upgrades Fabricate Truth to AoE: affects all enemies within 30 ft. Single Deception roll compared vs each target\'s Will DC individually.',
  },
];

// ──────────────────────────────────────────────────────────
// GUERRILLA  (Battlecry! pg. 60–61)
// Category: Combat Style, Core
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=327
// Rarity: Common
// ──────────────────────────────────────────────────────────

export const GUERRILLA_FEATS: FeatEntry[] = [
  {
    id: 'guerrilla-dedication',
    name: 'Guerrilla Dedication',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You\'re skilled in subtle tactics and using the environment against your enemies. You become trained in your choice of Deception or Thievery; if you are already trained in both, you become an expert in one instead. When you take this dedication, choose a single, discrete urban or wilderness location (such as "Mzali" or "the Verduran Forest"); this becomes your favored location. When you are in this location and undetected by all enemies, you can Sneak without attempting a Stealth check as long as you move no more than half your Speed. During exploration, this also allows you to automatically approach within 15 feet of other creatures while Avoiding their Notice, as long as they aren\'t actively Searching or on guard. You can change your favored location by spending 1 week of downtime in the new location.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['trained in Stealth', 'trained in Survival'],
    mechanics:
      'Train Deception or Thievery (or expert if both trained). Choose favored location (changeable with 1 week downtime). In favored location while undetected: Sneak without check at half Speed. Exploration: auto-approach within 15 ft while Avoiding Notice (unless targets Searching). Dedication-lock: 2 Guerrilla feats before another dedication.',
  },
  {
    id: 'guerrilla-guerrilla-weaponry',
    name: 'Guerrilla Weaponry',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You are especially skilled in transforming simple weapons that can be easily assembled from readily available materials into deadly weapons. In your hands, a blowgun\'s base damage increases from 1 to a 1d4 damage die, and it gains the deadly d4 trait. In addition, you gain Guerrilla Assault [one-action]: Frequency once per round. You Interact to reload a sling or blowgun and then Strike. If the Strike is successful and you were undetected or unnoticed by the target when you made the attack, you are now hidden from the target after the attack, as they cannot tell where the attack came from.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Guerrilla Dedication'],
    mechanics:
      'Blowgun damage: 1 → 1d4, gains deadly d4. Guerrilla Assault [one-action] (1/round): Interact (reload sling/blowgun) + Strike. If Strike hits and you were undetected/unnoticed → become hidden from target.',
  },
  {
    id: 'guerrilla-snare-expert',
    name: 'Snare Expert',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'Your knowledge of traps aids you in defending your hideout. You gain the Snare Crafting feat. When you set a snare, any saving throw it requires uses the higher of your class DC or the snare\'s DC. Snares you set within your favored location increase their Stealth DC by 2.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Guerrilla Dedication', 'trained in Crafting'],
    mechanics:
      'Grants Snare Crafting feat. Snare saves use max(class DC, snare DC). Snares in favored location: +2 Stealth DC.',
  },
  {
    id: 'guerrilla-hit-and-run',
    name: 'Hit and Run',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'Leaping from a hiding place, you quickly attack your foe before retreating. You Stride or Step, then attempt a melee or ranged Strike against a creature. After your Strike, you Sneak away. None of the movement taken as part of this activity triggers reactions.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 2,
    prerequisites: ['Guerrilla Dedication', 'expert in Stealth'],
    mechanics:
      'Stride/Step → Strike → Sneak. Movement does not trigger reactions. Flourish trait limits to 1/turn.',
  },
  {
    id: 'guerrilla-poisoned-sticks-and-stones',
    name: 'Poisoned Sticks and Stones',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You prepare your sling stones with small, edged grooves to enable them to deliver poison, and you have learned other techniques for poisoning your weapons. You can apply injury poisons to sling bullets, allowing them to deliver such poisons on a successful Strike. During your daily preparations, you can prepare a number of simple injury poisons equal to your level that can only be applied to sling bullets or blowgun darts. These follow the rules for injury poisons, except that they deal 1d4 poison damage with no saving throw. Only you can apply these poisons properly, and they expire at your next daily preparations. Special: If you later gain Poison Weapon, you can apply your injury poisons to any valid weapon, but you do not gain additional simple poisons.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Guerrilla Weaponry'],
    mechanics:
      'Sling bullets can deliver injury poisons. Daily prep: create simple injury poisons = level count (sling/blowgun only). Simple poisons deal 1d4 poison (no save). Personal use only; expire at next daily prep.',
  },
  {
    id: 'guerrilla-rally-support',
    name: 'Rally Support',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You often rely on the local populace for supplies and shelter. Once per day, you can attempt a check to Request or Coerce against an easy DC for your level when speaking with someone who is a non-hostile, long-term resident of your favored location. On a success, choose one of the following: a nonmagical item of your level or lower; a safe place to shelter for 24 hours; 3 days\' worth of food and water for you and up to 5 allies.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Guerrilla Dedication', 'trained in either Diplomacy or Intimidation'],
    mechanics:
      'Frequency: 1/day. Request or Coerce vs easy DC for level. Target must be non-hostile resident of favored location. Success: gain 1 of: nonmagical item ≤ your level, 24hr shelter, or 3 days food/water for party of 6.',
  },
  {
    id: 'guerrilla-venomous-weapons',
    name: 'Venomous Weapons',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'Your skill with poisons is such that your preferred weapons also contain trace amounts of it, even when you don\'t actively apply a dose. Blowguns and slings you are wielding have the venomous trait.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Poisoned Sticks and Stones'],
    mechanics:
      'Wielded blowguns and slings gain venomous trait. Venomous: on a critical hit, target takes 1d6 persistent poison damage.',
  },
  {
    id: 'guerrilla-battlefront-sabotage',
    name: 'Battlefront Sabotage',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You know methods of sabotaging your enemy\'s war machines and weaponry. You can attempt to sabotage a siege weapon or vehicle with a Thievery check against the standard DC of the weapon or vehicle\'s level. Critical Success: The next time the weapon is Launched or the vehicle moves, it targets or moves to a square of your choice. Success: As critical success, but random square. Failure: The sabotage fails. Additionally, you can sabotage a weapon an enemy is wielding. Choose a creature wielding a melee or ranged weapon within your reach and attempt a Thievery check against their Reflex DC. On a success, the wielder must succeed at a DC 11 flat check the next time it attempts a Strike with that weapon or the action is disrupted. The creature is then temporarily immune to weapon sabotage for 10 minutes.',
    implemented: 'full',
    traits: ['Archetype', 'Incapacitation'],
    actionCost: 2,
    prerequisites: ['Guerrilla Dedication'],
    mechanics:
      'Two uses: (1) Siege/vehicle sabotage: Thievery vs standard DC of item level. (2) Weapon sabotage: Thievery vs Reflex DC of wielder; success → DC 11 flat check or next Strike disrupted. 10 min temp immune after weapon sabotage. Requires free hand.',
  },
  {
    id: 'guerrilla-frightful-attrition',
    name: 'Frightful Attrition',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'Your diminishment of your foes\' ranks damages their morale. Whenever you reduce a creature to 0 HP with a Strike or spell, all enemies within 30 feet of the downed creature who witnessed the attack must attempt a Will saving throw against your class DC. A creature that didn\'t see you directly takes a –2 circumstance penalty to this save. Critical Success: Unaffected. Success: Frightened 1. Failure: Frightened 2. Critical Failure: Frightened 3 and fleeing for 1 round. Each creature is temporarily immune for 10 minutes.',
    implemented: 'full',
    traits: ['Archetype', 'Emotion', 'Fear', 'Incapacitation', 'Mental'],
    actionCost: 'passive',
    prerequisites: ['Guerrilla Dedication'],
    mechanics:
      'Trigger: reduce creature to 0 HP with Strike or spell. Enemies within 30 ft of downed creature: Will vs class DC (-2 if they can\'t see you). Crit Success: nil. Success: frightened 1. Failure: frightened 2. Crit Failure: frightened 3 + fleeing 1 rd. 10 min temp immune.',
  },
  {
    id: 'guerrilla-lonely-army',
    name: 'Lonely Army',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You move and attack with deadly silence, unbelievable speed, and unlimited ferocity. Strike with a blowgun or sling; if the Strike is successful, the enemy cannot tell where it came from and you remain hidden. Immediately after the successful Strike, you can Sneak to a new location, Interact to reload a blowgun or sling, and Strike again, remaining hidden on a successful Strike. If the second Strike is successful, you can Sneak, Interact to reload, and then Strike with a sling or blowgun a third time, remaining hidden after a successful Strike. After using Lonely Army, you are fatigued for 1 minute.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 3,
    prerequisites: ['Guerrilla Dedication'],
    mechanics:
      'Requirements: in favored location; hidden/unobserved/unnoticed by all enemies; not fatigued. Up to 3 chained ranged Strikes (blowgun/sling) each followed by Sneak + Interact (reload). Remain hidden on each successful Strike. Fatigued 1 min after use.',
  },
  {
    id: 'guerrilla-deathblow',
    name: 'Deathblow',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'Your carefully prepared and placed shot brings instant death to your target. Attempt a Strike with a blowgun or sling using ammunition that you have poisoned with your simple injury poison. If the Strike is successful and you are hidden from the target, or unnoticed or undetected by them, the target must succeed at a Fortitude save against your class DC or die; this is a death and incapacitation effect. A creature that survives is temporarily immune to the instant death effect of Deathblow for 1 day.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Guerrilla Dedication', 'Poisoned Sticks and Stones'],
    mechanics:
      'Requirements: poisoned ammunition (simple injury poison). Strike with blowgun/sling. If hit while hidden/undetected/unnoticed: target Fortitude vs class DC or die (death + incapacitation). 1 day temp immune on survival.',
  },
  {
    id: 'guerrilla-terrain-ghost',
    name: 'Terrain Ghost',
    source: 'Guerrilla (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'You move through your territory like a living shadow. Within your favored location, you\'re permanently under the effect of vanishing tracks, and you\'re always concealed from all foes unless you choose not to be.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Guerrilla Dedication', 'master in Stealth', 'master in Survival'],
    mechanics:
      'While in favored location: permanent vanishing tracks effect + permanent concealed from all foes (can toggle off voluntarily).',
  },
];

// ──────────────────────────────────────────────────────────
// WYLDERHEART  (Shining Kingdoms pg. 146–147)
// Category: Combat Style
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=318
// Rarity: Uncommon
// Access: You're from Kyonin.
// ──────────────────────────────────────────────────────────

export const WYLDERHEART_FEATS: FeatEntry[] = [
  {
    id: 'wylderheart-dedication',
    name: 'Wylderheart Dedication',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You\'re primed to face off against threats from the Outer Rifts. You gain the Additional Lore skill feat for Demon Lore. You gain a +1 circumstance bonus to initiative rolls in encounters against fiends, and if you tie with a fiend\'s initiative roll, you go first. Certain wylderheart feats give you focus spells. When you gain your first wylderheart focus spell, you become trained in the spell attack modifier and spell DC statistics. Your key spellcasting attribute for the wylderheart archetype spells is Wisdom, and they\'re primal spells. You can Refocus by celebrating life or spending time in nature.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['member of the Wylderhearts'],
    mechanics:
      'Grants Additional Lore (Demon Lore). +1 circumstance to initiative vs fiends; win ties with fiends. Focus spells (if gained): primal, WIS-based, trained in spell attack/DC. Refocus: celebrate life or time in nature. Access: from Kyonin. Dedication-lock: 2 Wylderheart feats before another dedication.',
  },
  {
    id: 'wylderheart-demon-hunting-companion',
    name: 'Demon-Hunting Companion',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You gain a young animal companion that has been specially trained to help you fight demons. You can choose any common animal companion, which gains scent as an imprecise sense with a range of 30 feet against fiends. If your animal companion already has scent, it gains a +2 circumstance bonus to Perception when using scent against fiends.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Wylderheart Dedication'],
    mechanics:
      'Grants young animal companion (any common type). Companion gains scent (imprecise 30 ft) vs fiends. If already has scent: +2 circumstance to Perception (scent) vs fiends.',
  },
  {
    id: 'wylderheart-wyldsinger',
    name: 'Wyldsinger',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'Passion and song are your weapons of choice. You learn either the menacing lament or valiant anthem focus spell. If you don\'t already have one, you gain a focus pool of 1 Focus Point. Special: You can take this feat a second time, gaining the focus spell you didn\'t gain the first time.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Wylderheart Dedication'],
    mechanics:
      'Choose 1 focus spell: menacing lament OR valiant anthem. Gain focus pool (1 FP) if none. Special: can take again for the other spell.',
  },
  {
    id: 'wylderheart-blessed-sentinel',
    name: 'Blessed Sentinel',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You infuse a weapon with the blessing of Ketephys and attack. Make a Strike. This Strike gains the holy trait, and if it hits a fiend, you deal an additional 1d6 spirit damage.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 2,
    prerequisites: ['Wylderheart Dedication'],
    mechanics:
      'Strike gains holy trait. If Strike hits a fiend: +1d6 spirit damage. Flourish limits to 1/turn.',
  },
  {
    id: 'wylderheart-primal-guardian',
    name: 'Primal Guardian',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You grow in power as a guardian of nature. You learn either the elemental sheath or vicious howl focus spell. Special: You can take this feat a second time, gaining the focus spell you didn\'t gain the first time.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Wyldsinger'],
    mechanics:
      'Choose 1 focus spell: elemental sheath OR vicious howl. Special: can take again for the other spell.',
  },
  {
    id: 'wylderheart-wild-dance',
    name: 'Wild Dance',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'The combination of your passion for both life and the battle against evil makes you graceful and unpredictable. Stride up to your Speed. A creature that attempts a reaction triggered by this movement must first attempt a Will save against your class DC or spell DC, whichever is higher. Critical Success: The creature is unaffected. Success: The creature is fascinated by you until the end of your next turn. Failure: The creature is fascinated; if the reaction requires an attack roll, you gain a +2 circumstance bonus to AC against that attack roll. Critical Failure: The creature is fascinated by you until the end of your next turn, and it loses its reaction.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Wylderheart Dedication'],
    mechanics:
      'Stride up to Speed. Reactors must Will save vs max(class DC, spell DC). Crit Success: unaffected. Success: fascinated until end of your next turn. Failure: fascinated + if reaction needs attack roll, +2 circumstance AC. Crit Failure: fascinated + loses reaction.',
  },
  {
    id: 'wylderheart-fiend-slayer',
    name: 'Fiend Slayer',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'Your attack tears through a fiend, possibly sending it back to where it came from. The fiend you just struck takes 80 void damage with a basic Fortitude save against your class DC or spell DC, whichever is higher. On a critical failure, the target is also stunned 1. Regardless of the results of the saving throw, the target is then temporarily immune to Fiend Slayer for 24 hours.',
    implemented: 'full',
    traits: ['Archetype', 'Death', 'Void'],
    actionCost: 1,
    prerequisites: ['Wylderheart Dedication'],
    mechanics:
      'Requirements: last action was a successful Strike vs fiend that dealt damage. 80 void damage, basic Fortitude vs max(class DC, spell DC). Crit Failure on save: also stunned 1. 24 hr temp immune.',
  },
  {
    id: 'wylderheart-sacred-weapon',
    name: 'Sacred Weapon',
    source: 'Wylderheart (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'You\'re a living weapon honed to destroy fiends. Whenever you critically Strike a fiend, your attack deals an extra weapon damage die, and the fiend is enfeebled 2 and clumsy 2 until the beginning of your next turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Wylderheart Dedication'],
    mechanics:
      'On critical Strike vs fiend: +1 extra weapon damage die; fiend becomes enfeebled 2 + clumsy 2 until start of your next turn.',
  },
];

// ──────────────────────────────────────────────────────────
// RAZMIRAN PRIEST  (Divine Mysteries pg. 290–291)
// Category: Mystical
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=307
// Rarity: Uncommon
// ──────────────────────────────────────────────────────────

export const RAZMIRAN_PRIEST_FEATS: FeatEntry[] = [
  {
    id: 'razmiran-priest-dedication',
    name: 'Razmiran Priest Dedication',
    source: 'Razmiran Priest (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You have earned entry to the priesthood of Razmir, either at the Exalted Lodge or another temple where Razmir\'s holy masks are forged. You gain a Razmiri mask and can Craft a replacement in 4 hours if yours is ever damaged or lost. There is no value in selling your Razmiri mask, and only you gain its benefits. The abilities of your Razmiri mask use the higher of your class DC or spell DC. You can take the Cleric Dedication feat without needing to meet its prerequisites and before you take two other feats from the Razmiran priest archetype, but you must choose Razmir as your deity. All spells granted by the cleric archetype when gained in this way are occult spells instead of divine spells, and cleric feats that normally have the divine trait instead have the occult trait. Your key spellcasting attribute for these spells is Charisma, rather than Wisdom.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['trained in Crafting', 'trained in Deception'],
    mechanics:
      'Grants Razmiri mask (iron, uses max(class DC, spell DC)). Can take Cleric Dedication without prereqs (must pick Razmir). Cleric archetype spells become occult (not divine) and use CHA (not WIS). Cleric feats swap divine → occult trait. Craft replacement mask in 4 hrs. Dedication-lock: 2 Razmiran Priest feats before another dedication.',
  },
  {
    id: 'razmiran-priest-perfect-truths',
    name: 'Perfect Truths',
    source: 'Razmiran Priest (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'Your knowledge of Razmir\'s faith and doctrines has grown. You excel in debating priests of rival faiths, wielding truths as subtly and deftly as any charlatan might wield a lie. When you use Deception to Lie, you can carefully structure your deceits so that each individual statement you make is the truth, from a certain perspective. As long as you are wearing your Razmiri mask, you don\'t take a penalty to Deception checks while subject to the ring of truth spell or similar effects. Whenever you are subject to ring of truth or a similar effect, you can attempt a Deception check when you first begin speaking to counteract the spell\'s effects, with a counteract rank equal to half your level (rounded up); succeeding at this check doesn\'t end the spell or effect, but it does cause it to indicate that you are speaking the truth, even when you are actually lying, as you weave a web of words so delicate that even you can\'t be certain where the truth ends and deception begins.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Razmiran Priest Dedication'],
    mechanics:
      'While wearing Razmiri mask: no penalty to Deception from ring of truth or similar. Can counteract ring of truth with Deception check (counteract rank = ceil(level/2)); success makes effect show you as truthful even when lying.',
  },
  {
    id: 'razmiran-priest-mask-of-the-12th-step',
    name: 'Mask of the 12th Step',
    source: 'Razmiran Priest (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You have reached the 12th Step and been instructed in greater secrets of Razmir\'s doctrine. You can Craft a silver Razmiri mask in the same time it takes to Craft one made of iron. A silver Razmiri mask grants a +2 item bonus to Deception checks to Lie or Feint, is a 10th-level item, and gains the following activation in addition to that possessed by the standard mask. Activate—Call Upon Razmir\'s Mercy [two-actions] (concentrate, manipulate, occult) Frequency three times per day; Effect: Exhorting Razmir to purge impurities from your target, you lay hands on a creature within reach and cast cleanse affliction as an occult spell with a spell rank equal to half your level. Unlike normal cleanse affliction, this doesn\'t reduce the stage; instead, if the counteract check succeeds, the affliction\'s stage is temporarily reduced by 1 and its effects are suppressed for 24 hours, after which the affliction resumes in full force.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Razmiran Priest Dedication', 'expert in Crafting'],
    mechanics:
      'Grants ability to Craft silver Razmiri mask (10th-level item, +2 item bonus to Deception to Lie/Feint). Activation: Call Upon Razmir\'s Mercy [two-actions] (concentrate, manipulate, occult) 3/day. Casts cleanse affliction as occult spell (rank = floor(level/2)). On success: temporarily suppresses affliction for 24 hrs (stage reduced by 1, all missed saves catch up when effect ends).',
  },
  {
    id: 'razmiran-priest-mask-of-the-15th-step',
    name: 'Mask of the 15th Step',
    source: 'Razmiran Priest (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You have ascended to the 15th Step and stand among the greatest of Razmir\'s priests. You can Craft a gold Razmiri mask in the same time it takes to Craft one made of iron. A gold Razmiri mask grants a +3 item bonus to Deception checks to Lie or Feint, is a 14th-level item, and gains the following activation in addition to those possessed by the standard and silver masks. Activate—Call Upon Razmir\'s Wrath [two-actions] (concentrate, manipulate, occult) Frequency once per day; Effect: You cry out to Razmir to reveal his fiery wrath, as he did upon the unbelievers at Melcat. You cast sunburst as an 8th-rank occult spell, but for undead targets the spell has the incapacitation trait.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Razmiran Priest Dedication', 'master in Crafting'],
    mechanics:
      'Grants ability to Craft gold Razmiri mask (14th-level item, +3 item bonus to Deception to Lie/Feint). Activation: Call Upon Razmir\'s Wrath [two-actions] (concentrate, manipulate, occult) 1/day. Casts sunburst as 8th-rank occult spell. Vs undead: gains incapacitation trait.',
  },
  {
    id: 'razmiran-priest-living-god',
    name: 'Living God',
    source: 'Razmiran Priest (Archetype)',
    category: 'archetype',
    level: 20,
    description:
      'You have reached heights of power equaling Razmir\'s himself. You can Craft your Razmiri mask as a porcelain one in the same time it takes to Craft one made of iron. A porcelain Razmiri mask grants a +4 item bonus to Deception checks to Lie or Feint, is an 18th-level item, and is an apex item that increases your Charisma modifier by 1 or increases it to +4, whichever would give you a higher score. It also gives you the following activation. Activate—Power of the Living God [three-actions] (concentrate, manipulate, occult) Frequency once per day; Effect: You demand power from the world, using your mask as a locus to force reality to bend to your will. You cast manifestation as a 10th-rank occult spell, but no matter what spell you emulate with it, that spell has the incapacitation trait.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Razmiran Priest Dedication', 'legendary in Crafting'],
    mechanics:
      'Grants ability to Craft porcelain Razmiri mask (18th-level apex item, +4 Deception to Lie/Feint, CHA apex +1 or to +4). Activation: Power of the Living God [three-actions] (concentrate, manipulate, occult) 1/day. Casts manifestation as 10th-rank occult spell; emulated spell gains incapacitation trait.',
  },
];

// ──────────────────────────────────────────────────────────
// RIVETHUN EMISSARY  (Divine Mysteries pg. 292–294)
// Category: Mystical
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=308
// Rarity: Uncommon
// Access: Followers of Rivethun
// ──────────────────────────────────────────────────────────

export const RIVETHUN_EMISSARY_FEATS: FeatEntry[] = [
  {
    id: 'rivethun-emissary-dedication',
    name: 'Rivethun Emissary Dedication',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You\'re a practicing Rivethun emissary, skilled at interacting and bonding with the spirits of living creatures. You become an expert in Diplomacy and Religion. You also gain the Bond with Spirit activity and the entreat spirit focus spell. If you don\'t already have one, you gain a focus pool. Your Rivethun focus spells are divine spells; when you gain this feat, you become trained in the spell attack modifier and spell DC statistics. Your key spellcasting attribute for Rivethun focus spells is Wisdom. Bond with Spirit (concentrate, exploration): 10 min; bond with a creature that is at least friendly or a terrain you\'re in. Bond lasts while within 1 mile, until you Bond again, or until daily preparations. Must be Bonded to cast entreat spirit.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['trained in Diplomacy', 'trained in Religion'],
    mechanics:
      'Become expert in Diplomacy and Religion. Gain Bond with Spirit (exploration, 10 min): bond with friendly creature or terrain within 1 mile. Gain entreat spirit focus spell (divine, WIS-based). Gain focus pool if none. Access: Followers of Rivethun. Dedication-lock: 2 Rivethun Emissary feats before another dedication.',
  },
  {
    id: 'rivethun-emissary-emissary-familiar',
    name: 'Emissary Familiar',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You forge a mystical bond with a spirit or create a spirit from a fragment of your own soul. You gain a familiar. If you already have a familiar, you gain the Enhanced Familiar feat. Your familiar gains two additional familiar abilities each day, one of which must be used to select the following master ability. Synchronize Spirit: You can synchronize your spiritual energy with that of your familiar. Once per round, you can Sustain to synchronize. While synchronized (until start of next turn), whenever you Strike or Cast a Spell without a duration that deals damage, you deal spirit damage instead of normal damage.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Emissary Dedication'],
    mechanics:
      'Gain familiar (or Enhanced Familiar if already have one). +2 familiar abilities/day, 1 must be Synchronize Spirit. Synchronize Spirit (Sustain, 1/round): until start of next turn, Strikes and duration-less damaging spells deal spirit damage instead.',
  },
  {
    id: 'rivethun-emissary-domain-spirit',
    name: 'Domain Spirit',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You forge an intense spiritual bond of mutual trust and appreciation with a single spirit that you have already bonded with using Bond with Spirit. Forming this bond takes 24 hours of communion. This spirit is your domain spirit, and the bond is not weakened by time or distance (only 1 at a time). Select one domain related to your domain spirit. You always have the option to select the healing or soul domain. If your spirit is a creature, select from: ambition, confidence, family, might, protection, or trickery. If your spirit is a terrain, select from a list based on the terrain type. Your GM can add domains. You gain the initial domain spell for that domain. This domain spell is a Rivethun focus spell. You can change your domain spirit and domain by spending 24 hours in communion with a new spirit.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Exploration'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Emissary Dedication'],
    mechanics:
      'Bond with domain spirit (24 hr communion). Select 1 domain (always available: healing, soul; creature spirits: ambition, confidence, family, might, protection, trickery; terrain spirits add element-based domains). Gain initial domain spell as Rivethun focus spell. Can rebond with new spirit (24 hr).',
  },
  {
    id: 'rivethun-emissary-kaleidoscopic-entreaty',
    name: 'Kaleidoscopic Entreaty',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'If your next action is to cast entreat spirit, you can cause that spirit to unleash a brilliant display of color, light, and sound in a 10-foot emanation centered on you. Each creature in the area must attempt a Fortitude save against your class DC or spell DC. Critical Success: Unaffected. Success: Dazzled for 1 round. Failure: Dazzled for 1 minute. Critical Failure: Blinded for 1 round and dazzled for 1 minute.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Spellshape', 'Visual'],
    actionCost: 1,
    prerequisites: ['Rivethun Emissary Dedication'],
    mechanics:
      'Spellshape: next action must be entreat spirit. 10-ft emanation centered on you. Fortitude vs max(class DC, spell DC). Crit Success: nil. Success: dazzled 1 rd. Failure: dazzled 1 min. Crit Failure: blinded 1 rd + dazzled 1 min.',
  },
  {
    id: 'rivethun-emissary-rivethun-devotion',
    name: 'Rivethun Devotion',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'Through study, dedication, and introspection, you\'ve learned to wield magic that affects the spirit. You gain see the unseen and spirit link as 2nd-rank divine innate spells. You can cast each of these spells once per day. If you\'re a master in Religion, spirit link is heightened to 3rd rank. If you\'re legendary in Religion, spirit link is heightened to 4th rank.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Emissary Dedication'],
    mechanics:
      'Gain divine innate spells (1/day each): see the unseen (2nd rank), spirit link (2nd rank; 3rd if master Religion, 4th if legendary Religion). Access: Followers of Rivethun.',
  },
  {
    id: 'rivethun-emissary-advanced-domain-spirit',
    name: 'Advanced Domain Spirit',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'Your connection with your domain spirit has deepened. You gain the advanced domain spell from the domain granted by your domain spirit.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Domain Spirit'],
    mechanics:
      'Grants advanced domain spell from domain spirit\'s domain. This is a Rivethun focus spell.',
  },
  {
    id: 'rivethun-emissary-consult-the-spirits',
    name: 'Consult the Spirits',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You spend 1 hour communing with powerful spirits of the world to gain insight, information, or advice. Select advice or answers. If you selected advice, choose a particular goal or activity you plan to engage in today, or an event you might expect to happen today. The spirits share a cryptic clue or piece of advice. If you selected answers, ask two clear and concise questions. The spirits answer clearly if easy, otherwise cryptically. Regardless, the spirits bless you with a +1 status bonus to a skill the GM selects on behalf of the spirits. This bonus lasts until the end of the day.',
    implemented: 'full',
    traits: ['Archetype', 'Exploration'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Emissary Dedication'],
    mechanics:
      'Frequency: 1/day. 1 hour communion. Choose advice (cryptic clue about a goal/event) or answers (2 questions answered). Bonus: +1 status to a skill (GM picks) until end of day.',
  },
  {
    id: 'rivethun-emissary-manifold-conduit',
    name: 'Manifold Conduit',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You can manifest multiple spirits at once in a cyclone around you. You gain the entreat the many focus spell.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Rivethun Emissary Dedication'],
    mechanics:
      'Grants entreat the many focus spell. AoE version of entreat spirit.',
  },
  {
    id: 'rivethun-emissary-rivethun-adept',
    name: 'Rivethun Adept',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'Your ability to wield spirit magic has increased. You can cast speak with stones and spiritual guardian as 5th-rank divine innate spells. You can cast each of these spells once per day. If you\'re legendary in Religion, spiritual guardian is heightened to 7th rank.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Devotion'],
    mechanics:
      'Gain divine innate spells (1/day each): speak with stones (5th rank), spiritual guardian (5th rank; 7th if legendary Religion).',
  },
  {
    id: 'rivethun-emissary-emboldened-with-glorious-purpose',
    name: 'Emboldened With Glorious Purpose',
    source: 'Rivethun Emissary (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'Communing with powerful spirits of the world and other powers far greater than yourself fills your heart with purpose and inspires you to strive for greater accomplishments. Whenever you Consult the Spirits, you gain a +1 status bonus to Will saving throws until the next time you make your daily preparations. This bonus increases to +2 against emotion and fear effects. In addition, until the next time you make your daily preparations, you can do each of the following once: Roll a Will save twice and use the better result. Roll an attack roll twice and use the better result. Roll a skill check twice and use the better result; this skill check must be made with the skill that the spirits blessed during Consult the Spirits.',
    implemented: 'full',
    traits: ['Archetype', 'Fortune', 'Mental'],
    actionCost: 'passive',
    prerequisites: ['Consult the Spirits'],
    mechanics:
      'After Consult the Spirits: +1 status to Will saves (until daily prep); +2 vs emotion/fear. Once each until daily prep: fortune on 1 Will save, 1 attack roll, 1 skill check (must be the spirit-blessed skill).',
  },
];

// ──────────────────────────────────────────────────────────
// RIVETHUN INVOKER  (Divine Mysteries pg. 294)
// Category: Mystical
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=309
// Rarity: Uncommon
// Access: Followers of Rivethun
// ──────────────────────────────────────────────────────────

export const RIVETHUN_INVOKER_FEATS: FeatEntry[] = [
  {
    id: 'rivethun-invoker-dedication',
    name: 'Rivethun Invoker Dedication',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You\'re a practicing Rivethun invoker, able to enter a trance that connects you physically and mentally to surrounding spirits. You become an expert in Athletics and Religion. You also gain the Diehard general feat and the Enter Spirit Trance ability. Enter Spirit Trance [one-action] (concentrate, divine, mental): You enter a self-imposed trance that helps you push the physical limits of your body. You gain a number of temporary Hit Points equal to your level plus your Constitution modifier. The trance lasts for 1 minute, until you fall unconscious, or until you Dismiss it, whichever comes first. While in this trance, you gain a +1 status bonus to Fortitude and Will saving throws and your melee Strikes deal 1 additional spirit damage. When the trance ends, you lose any remaining temporary Hit Points from Enter Spirit Trance, and you can\'t Enter a Spirit Trance for 1 minute.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['trained in Athletics', 'trained in Religion'],
    mechanics:
      'Become expert in Athletics and Religion. Gain Diehard feat. Gain Enter Spirit Trance [one-action] (concentrate, divine, mental): temp HP = level + CON mod, +1 status to Fort/Will saves, melee Strikes deal +1 spirit damage. Duration: 1 min or until unconscious/dismissed. 1 min cooldown after ending. Access: Followers of Rivethun. Dedication-lock: 2 Rivethun Invoker feats before another dedication.',
  },
  {
    id: 'rivethun-invoker-invoke-offense',
    name: 'Invoke Offense',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You manifest a physical attack of the spirits all around you, such as the claw of an animal spirit or the whipping vine of a nature spirit. You gain an unarmed attack that deals 1d8 spirit damage for the duration of your spirit trance. This unarmed attack is in the brawling weapon group and has the agile, finesse, and magical traits. At 5th level, this attack gains the benefits of a striking rune; at 12th level, greater striking.',
    implemented: 'full',
    traits: ['Archetype', 'Morph', 'Spirit'],
    actionCost: 1,
    prerequisites: ['Rivethun Invoker Dedication'],
    mechanics:
      'Requirements: under Enter Spirit Trance. Gain unarmed attack: 1d8 spirit damage, brawling group, agile + finesse + magical. Auto-scales: striking at 5th, greater striking at 12th. Lasts for duration of spirit trance.',
  },
  {
    id: 'rivethun-invoker-leverage-anguish',
    name: 'Leverage Anguish',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You leverage your emotional turmoil to mend your physical form. You regain 2d8 Hit Points. If you\'re a master in Athletics, you regain 4d8 Hit Points instead. If you\'re legendary in Athletics, you regain 6d8 Hit Points instead.',
    implemented: 'full',
    traits: ['Archetype', 'Healing'],
    actionCost: 'reaction',
    prerequisites: ['Rivethun Invoker Dedication'],
    mechanics:
      'Frequency: 1/day. Trigger: fail or critically fail a save vs curse, death, emotion, or fear effect. Heal 2d8 HP (4d8 if master Athletics, 6d8 if legendary Athletics).',
  },
  {
    id: 'rivethun-invoker-invoke-defense',
    name: 'Invoke Defense',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You manifest a defensive quality of spirits all around, such as the thick hide of an animal spirit or the sturdy bark of a nature spirit. Choose bludgeoning, piercing, or slashing. You gain resistance equal to half your level to that damage type for the duration of your spirit trance. If you use Invoke Defense again, you can choose a different type of damage, but you lose the previous resistance.',
    implemented: 'full',
    traits: ['Archetype', 'Morph'],
    actionCost: 1,
    prerequisites: ['Rivethun Invoker Dedication'],
    mechanics:
      'Requirements: under Enter Spirit Trance. Choose B/P/S. Gain resistance = floor(level/2) to chosen type. Lasts for spirit trance duration. Re-using replaces previous choice.',
  },
  {
    id: 'rivethun-invoker-defy-sorrow',
    name: 'Defy Sorrow',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You draw on this spiritual pain to push your body to greater heights. You gain the quickened condition until the end of your next turn. You can use the extra action only to Step or Stride.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Rivethun Invoker Dedication'],
    mechanics:
      'Trigger: dealt mental or spirit damage, or fail/crit fail a save vs mental effect. Gain quickened until end of next turn (extra action: Step or Stride only).',
  },
  {
    id: 'rivethun-invoker-invoke-movement',
    name: 'Invoke Movement',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You manifest a form of locomotion of the spirits all around, such as the wings of an animal spirit or the watery flow of a nature spirit. Choose a movement type: burrow, climb, fly, or swim. You gain a Speed in the chosen movement type equal to your base Speed (or half your Speed if you selected burrow) for the duration of your spirit trance. If you use Invoke Movement again, you can choose a different movement type, but you lose the previous form of movement.',
    implemented: 'full',
    traits: ['Archetype', 'Morph'],
    actionCost: 1,
    prerequisites: ['Rivethun Invoker Dedication'],
    mechanics:
      'Requirements: under Enter Spirit Trance. Choose burrow/climb/fly/swim. Gain speed = base Speed (half for burrow). Lasts for spirit trance duration. Re-using replaces previous choice.',
  },
  {
    id: 'rivethun-invoker-one-with-the-spirits',
    name: 'One with the Spirits',
    source: 'Rivethun Invoker (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'The spirits you\'ve invoked throughout your life have left behind echoes and spiritual fragments, which you can manifest across your own flesh, temporarily transforming you into something more akin to spirit than mortal. For 1 minute, you gain fast healing 5 and you become concealed. You can\'t use this concealment to Hide. Your Strikes gain the benefits of a ghost touch property rune. Whenever you deal damage with a Strike, you can choose to have that Strike deal spirit damage, rather than its usual damage type. If you would be knocked unconscious or your dying value would increase while One with the Spirits is active, the spirits revive you at the beginning of your next turn, restoring you to 30 Hit Points. One with the Spirits then immediately ends.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Rivethun Invoker Dedication'],
    mechanics:
      'Frequency: 1/hour. Requirements: under Enter Spirit Trance. 1 min duration: fast healing 5, concealed (can\'t Hide), Strikes gain ghost touch and optional spirit damage type. If KO\'d or dying increases: revive at start of next turn with 30 HP, then effect ends.',
  },
];

// ──────────────────────────────────────────────────────────
// RIVETHUN INVOLUTIONIST  (Divine Mysteries pg. 295)
// Category: Combat Style, Mystical
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=310
// Rarity: Uncommon
// Access: Followers of Rivethun
// ──────────────────────────────────────────────────────────

export const RIVETHUN_INVOLUTIONIST_FEATS: FeatEntry[] = [
  {
    id: 'rivethun-involutionist-dedication',
    name: 'Rivethun Involutionist Dedication',
    source: 'Rivethun Involutionist (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You\'re a practicing Rivethun involutionist, with a deep well of inner power. You become an expert in Nature and Religion. You cast spells and gain the Cast a Spell activity. You gain a spell repertoire with two common cantrips from the divine spell list or any other divine cantrips you\'ve learned or discovered. You\'re trained in the spell attack modifier and spell DC statistics. Your key spellcasting attribute for Rivethun involutionist archetype spells is Wisdom.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['trained in Nature', 'trained in Religion'],
    mechanics:
      'Become expert in Nature and Religion. Gain Cast a Spell activity. Spell repertoire: 2 common divine cantrips. Trained in spell attack/DC. WIS-based spellcasting. Access: Followers of Rivethun. Dedication-lock: 2 Rivethun Involutionist feats before another dedication.',
  },
  {
    id: 'rivethun-involutionist-basic-rivethun-spellcasting',
    name: 'Basic Rivethun Spellcasting',
    source: 'Rivethun Involutionist (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You gain the basic spellcasting benefits. Each time you gain a spell slot of a new rank from the Rivethun involutionist archetype, add a common divine spell of the appropriate rank, another appropriate divine spell you learned or discovered, or any other divine spell to which you have access, to your repertoire.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Involutionist Dedication'],
    mechanics:
      'Basic spellcasting benefits (spell slots scaling up to half your level, capped at rank 2). Add divine spells to repertoire when gaining new rank slots.',
  },
  {
    id: 'rivethun-involutionist-spirit-companion',
    name: 'Spirit Companion',
    source: 'Rivethun Involutionist (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You gain the service of a young animal companion, which has been blessed by the spirits of this world. If you already have an animal companion, your current animal companion becomes blessed by the spirits instead. This animal companion follows all the usual rules for animal companions. You can Sustain to activate your companion\'s latent blessing, as long as your animal companion is within 60 feet of you. When you activate this blessing, all damage dealt by your animal companion\'s Strikes deal spirit damage, rather than the usual damage those Strikes would deal. This blessing remains active until the beginning of your next turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Rivethun Involutionist Dedication'],
    mechanics:
      'Gain young animal companion (spirit-blessed). Sustain: companion\'s Strikes deal spirit damage instead of normal type (within 60 ft, until start of next turn).',
  },
  {
    id: 'rivethun-involutionist-expert-rivethun-spellcasting',
    name: 'Expert Rivethun Spellcasting',
    source: 'Rivethun Involutionist (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You gain the expert spellcasting benefits.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Basic Rivethun Spellcasting', 'master in Religion'],
    mechanics:
      'Expert spellcasting benefits (higher-rank spell slots, expert proficiency in spell attack/DC).',
  },
  {
    id: 'rivethun-involutionist-specialized-spirit-companion',
    name: 'Specialized Spirit Companion',
    source: 'Rivethun Involutionist (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'Your animal companion gains a unique specialization, spirit-blessed. Thanks to the blessing bestowed upon it by the spirits of this world, your companion is capable of harming wayward spirits, ghosts, and other incorporeal creatures as easily as if they were made of flesh and bone. Your companion\'s Strikes all gain the effects of the ghost touch property rune. Special: You can select this feat up to three times. Each time, add a different specialization. Its first specialization must be spirit-blessed.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Companion', 'Incredible Companion (Druid)'],
    mechanics:
      'Companion gains spirit-blessed specialization: all Strikes gain ghost touch. Special: can take up to 3 times for 3 different specializations; first must be spirit-blessed.',
  },
  {
    id: 'rivethun-involutionist-master-rivethun-spellcasting',
    name: 'Master Rivethun Spellcasting',
    source: 'Rivethun Involutionist (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'You gain the master spellcasting benefits.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Expert Rivethun Spellcasting', 'legendary in Religion'],
    mechanics:
      'Master spellcasting benefits (highest-rank spell slots, master proficiency in spell attack/DC).',
  },
];

// ══════════════════════════════════════════════════════════
// COMBINED EXPORT
// ══════════════════════════════════════════════════════════

export const STANDALONE_ARCHETYPE_FEATS_NON_CORE_FR: FeatEntry[] = [
  ...FIELD_PROPAGANDIST_FEATS,
  ...GUERRILLA_FEATS,
  ...WYLDERHEART_FEATS,
  ...RAZMIRAN_PRIEST_FEATS,
  ...RIVETHUN_EMISSARY_FEATS,
  ...RIVETHUN_INVOKER_FEATS,
  ...RIVETHUN_INVOLUTIONIST_FEATS,
];
