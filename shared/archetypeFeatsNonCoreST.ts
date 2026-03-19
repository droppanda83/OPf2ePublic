import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// NON-CORE ARCHETYPE FEATS — Starlit Sentinel, Twilight Speaker,
// Tattooed Historian
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// STARLIT SENTINEL  (Tian Xia Character Guide pg. 94–95)
// Category: Mystical / Core — PFS Standard
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=232
// ──────────────────────────────────────────────────────────

export const STARLIT_SENTINEL_FEATS: FeatEntry[] = [
  {
    id: 'starlit-sentinel-dedication',
    name: 'Starlit Sentinel Dedication',
    source: 'Starlit Sentinel (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You\'ve been chosen by one of the constellations of the Tian Xia zodiac. You gain a transformation seal: a mundane-seeming item of light Bulk (ring, brooch, key, etc.) with the arcane trait. If lost or destroyed, spend 1 week of downtime to reconnect. You can Activate the seal with Starlit Transformation [one-action] (arcane, frequency once per hour): light transforms your armor, clothing, and a single weapon into an alternate outfit. Equipment functions normally despite looking different. To discern your identity, someone must Seek against your Deception DC (20 + proficiency modifier). You remain in sentinel form for 10 minutes or until you use Starlit Transformation again. While in sentinel form, your transformed weapon gains a +1 status bonus to damage and you can fling bolts of starlight (Strike using melee modifier, 1d4 force damage, range 60 ft, arcane and force traits, affected by weapon runes).',
    implemented: 'full',
    traits: ['Rare', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    mechanics: 'Rare. Gain transformation seal. Starlit Transformation [1-action] (arcane), freq 1/hour. Sentinel form: 10 min, +1 status to weapon damage, starlight bolts (1d4 force, 60 ft, uses melee modifier + weapon runes). Identity: Deception DC 20 + proficiency.',
  },
  {
    id: 'starlit-sentinel-special-technique',
    name: 'Special Sentinel Technique',
    source: 'Starlit Sentinel (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You can channel the power of your constellation into a unique technique. You gain either the luminous stardust healing or shining starlight attack focus spell, which you can cast only in sentinel form. When you gain this feat, decide a name for your technique, which becomes the spell\'s incantation. If you don\'t already have one, you gain a focus pool of 1 Focus Point, which you can Refocus by spending 10 minutes outside sentinel form reflecting on your constellation\'s values. Starlit sentinel focus spells are arcane spells. You become trained in spell attack modifier and spell DC; your spellcasting ability is Charisma. Special: You can take this feat a second time, gaining the other focus spell.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Starlit Sentinel Dedication'],
    mechanics: 'Choose luminous stardust (healing) or shining starlight (attack) focus spell. Cast only in sentinel form. Focus pool 1 FP, Refocus 10 min outside form. Arcane spells, Cha-based. Can take twice for both spells.',
    subChoices: { label: 'Choose focus spell', options: [
      { id: 'luminous-stardust', name: 'Luminous Stardust', description: 'Healing focus spell' },
      { id: 'shining-starlight', name: 'Shining Starlight', description: 'Attack focus spell' },
    ] },
  },
  {
    id: 'starlit-sentinel-majestic-proclamation',
    name: 'Majestic Proclamation',
    source: 'Starlit Sentinel (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You announce your name to your enemies, bringing your constellation to bear in a blinding display. Attempt to Demoralize all enemies within 30 feet. Demoralize loses the auditory trait and gains the visual trait. In addition to the regular effects, enemies become dazzled for 1 minute on a successful check (and also blinded for 1 round on a critical success). You can use Majestic Proclamation as a single action if your previous action was Starlit Transformation.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Starlit Sentinel Dedication'],
    mechanics: '2 actions (1 action if preceded by Starlit Transformation). Requirement: sentinel form. Demoralize all enemies within 30 ft (visual, not auditory). Success: also dazzled 1 min. Crit: also blinded 1 round.',
  },
  {
    id: 'starlit-sentinel-blade-of-the-heart',
    name: 'Blade of the Heart',
    source: 'Starlit Sentinel (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'The bonds of the heart are stronger than any steel, more powerful than any magic. You plunge your transformed weapon into the heart of a willing adjacent ally, where it phases harmlessly into their body. As you pull it out, your ally\'s heart inscribes one of the following weapon property runes on your weapon: corrosive, flaming, frost, shock, thundering, or vitalizing. The first time you use this with a given ally, the GM decides which rune best represents your shared relationship (e.g., elegant frost for a respected mentor); thereafter, each time you use Blade of the Heart with that ally, you draw the same rune. This rune lasts while you remain in sentinel form and counts toward your maximum limit of runes. At 16th level, you draw the greater version of the rune instead.',
    implemented: 'full',
    traits: ['Archetype', 'Emotion'],
    actionCost: 1,
    prerequisites: ['Starlit Sentinel Dedication'],
    mechanics: '1 action. Willing adjacent ally grants weapon property rune (corrosive/flaming/frost/shock/thundering/vitalizing). Lasts while in sentinel form. GM picks rune per ally (consistent). Greater version at 16th level.',
  },
  {
    id: 'starlit-sentinel-desperate-wish',
    name: 'Desperate Wish',
    source: 'Starlit Sentinel (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'You call out a desperate wish to the stars to save a friend. You gain breath of life as an innate arcane spell, which you can cast once per day only while in sentinel form. Interceding in such a direct way temporarily exhausts your constellation\'s magic, causing you to revert from your sentinel form once the spell is cast.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Starlit Sentinel Dedication'],
    mechanics: 'Gain breath of life as innate arcane spell. 1/day, sentinel form only. Reverts sentinel form after casting.',
  },
  {
    id: 'starlit-sentinel-sentinels-orbit',
    name: 'Sentinel\'s Orbit',
    source: 'Starlit Sentinel (Archetype)',
    category: 'archetype',
    level: 14,
    description: 'Just as your constellation traverses the sky, so too can you. When in your sentinel form, you gain a fly Speed equal to your land Speed or 20 feet, whichever is higher.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Starlit Sentinel Dedication'],
    mechanics: 'Sentinel form: gain fly Speed = land Speed or 20 ft (whichever higher).',
  },
];

// ──────────────────────────────────────────────────────────
// TWILIGHT SPEAKER  (Gatewalkers pg. 242–243)
// Category: Faction / Core — PFS Limited
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=206
// ──────────────────────────────────────────────────────────

export const TWILIGHT_SPEAKER_FEATS: FeatEntry[] = [
  {
    id: 'twilight-speaker-dedication',
    name: 'Twilight Speaker Dedication',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You have carefully studied the histories, customs, and etiquette of many of the younger peoples of Golarion. You become an expert in Society. At 7th level, you become a master in Society, and at 15th level, you become legendary in Society. You can use the Society skill instead of the Diplomacy skill when you attempt to Make an Impression on a non-elven intelligent humanoid creature.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Society', 'You are an Ilverani elf'],
    mechanics: 'Uncommon. Expert in Society (master 7th, legendary 15th). Use Society instead of Diplomacy to Make an Impression on non-elven intelligent humanoids.',
  },
  {
    id: 'twilight-speaker-empathetic-envoy',
    name: 'Empathetic Envoy',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You believe that treating others with respect is the fastest way into their hearts, and in turn others are more likely to believe in your good intentions and write off bad first impressions as flukes. If a creature\'s attitude toward you becomes lower over the course of a social interaction (for example, from friendly to indifferent, or from indifferent to unfriendly), their impression of you returns to its starting level an hour after the social interaction ends. This ability has no effect if the creature you are interacting with becomes hostile.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Twilight Speaker Dedication'],
    mechanics: 'If creature attitude lowers during social interaction, it returns to starting level 1 hour after. No effect if creature becomes hostile.',
  },
  {
    id: 'twilight-speaker-betraying-shank',
    name: 'Betraying Shank',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'While your usual diplomacy is well intentioned, you know that sometimes those same skills will need to be turned to deception. In a flash, you draw a sheathed or concealed agile or finesse weapon and make a melee Strike. The target is off-guard against your Strike. You then roll Deception for initiative.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Twilight Speaker Dedication'],
    mechanics: '1 action. Requirement: within melee reach of target, not in combat. Draw concealed agile/finesse weapon + melee Strike. Target off-guard. Roll Deception for initiative.',
  },
  {
    id: 'twilight-speaker-disarming-smile',
    name: 'Disarming Smile',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'With a wide and sincere smile, you give your attacker pause. You attempt a Diplomacy check against the triggering attacker\'s Will DC. After you use Disarming Smile, all creatures who witnessed it are immune for 24 hours. Critical Success: the attack fails and the target can\'t attempt hostile actions against you until the beginning of its next turn or until you/your allies take hostile actions against it/its allies. You can sustain by talking on subsequent turns (Diplomacy check, max 1 minute, auditory + linguistic). Success: attack fails, but they can attempt further attacks. Failure: attack is unaffected.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Emotion', 'Mental', 'Visual'],
    actionCost: 'reaction',
    prerequisites: ['Empathetic Envoy'],
    mechanics: 'Reaction. Trigger: targeted by melee attack (not yet rolled). Requirement: aware of attacker, attacker is intelligent humanoid, you haven\'t attempted to harm them. Diplomacy vs Will DC. Crit: attack fails + no hostile actions until next turn (sustain with Diplomacy). Success: attack fails. Failure: no effect. Immune 24 hrs.',
  },
  {
    id: 'twilight-speaker-ilverani-purist',
    name: 'Ilverani Purist',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'All twilight speakers are trained to resist the alluring customs of younger peoples, but you have made it your mandate to keep the Ilverani way unchanged. Such dedication has given you a trained eye for subtlety and deception. When you attempt to Sense the Motive of a non-elf humanoid creature and you roll a critical failure, you fail instead.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Twilight Speaker Dedication'],
    mechanics: 'Sense Motive vs non-elf humanoid: critical failure becomes failure.',
  },
  {
    id: 'twilight-speaker-world-wise-vigilance',
    name: 'World-Wise Vigilance',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your keen study of other cultures gives you insights into the ways those cultures fight. When you use Perception to roll initiative and none of your enemies have the elf trait, you can choose to roll Society instead.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Twilight Speaker Dedication'],
    mechanics: 'Initiative: roll Society instead of Perception if no enemies have elf trait.',
  },
  {
    id: 'twilight-speaker-emphatic-emissary',
    name: 'Emphatic Emissary',
    source: 'Twilight Speaker (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You can tell when diplomacy has failed and a meeting is close to unraveling or falling to blows. You gain a +2 circumstance bonus on your initiative roll. During your first turn in combat, you can use your Disarming Smile, targeting every hostile intelligent humanoid creature that can see you but has yet to act. If you choose to sustain your Disarming Smile, you sustain the effect for only one creature, as normal.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Disarming Smile'],
    mechanics: 'Reaction. Trigger: roll initiative. +2 circ to initiative. First turn: Disarming Smile targets all hostile intelligent humanoids that can see you and haven\'t acted. Sustain: one creature only.',
  },
];

// ──────────────────────────────────────────────────────────
// TATTOOED HISTORIAN  (Pathfinder #207: Resurrection Flood pg. 80–81)
// Category: Profession / Core — PFS Limited
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=238
// ──────────────────────────────────────────────────────────

export const TATTOOED_HISTORIAN_FEATS: FeatEntry[] = [
  {
    id: 'tattooed-historian-dedication',
    name: 'Tattooed Historian Dedication',
    source: 'Tattooed Historian (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You become trained in Diplomacy or Performance; if already trained in both, you become trained in a skill of your choice. You gain access to all uncommon magical tattoos with the orc trait. You gain a storied skin tattoo for free (or another 2nd-level or lower magical tattoo if you already have storied skin). You cannot have more than one storied skin, but the frequency of its Living History ability increases by one use per minute for every three tattooed historian feats you have. For every two tattooed historian feats you have, you can invest one magical tattoo that does not count against the maximum number of invested items.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Constitution +1', 'Trained in Orc Lore, Orc Pantheon Lore, Belkzen Lore, or a related Lore skill'],
    mechanics: 'Uncommon. Trained in Diplomacy or Performance (or free skill). Access to uncommon orc-trait magical tattoos. Free storied skin tattoo. Living History freq +1/min per 3 feats. Extra invested tattoo per 2 feats.',
  },
  {
    id: 'tattooed-historian-agent-of-all-holds',
    name: 'Agent of All Holds',
    source: 'Tattooed Historian (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'Orcs across Belkzen recognize you as an honored lorekeeper. You\'re leveraging this status and showing off your tattoos to resolve conflicts, change minds, or distract others from a faux pas. You get a failure on the check, rather than a critical failure. If the triggering check was made against a creature with the orc trait, you can instead add the fortune trait to this ability and reroll the check, treating any critical failure as a failure.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Tattooed Historian Dedication'],
    mechanics: 'Reaction. Trigger: critically fail Diplomacy/Intimidation/Performance. Crit fail becomes fail. Vs orc-trait creature: fortune, reroll (crit fail → fail).',
  },
  {
    id: 'tattooed-historian-inked-panoply',
    name: 'Inked Panoply',
    source: 'Tattooed Historian (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your tattoos can briefly animate and extend from your skin, granting you a spectral shieldbearer who protects you from harm. Doing so expends one use of your storied skin, granting you a +1 circumstance bonus to AC against the triggering attack. In addition, you gain resistance to mental, spirit, and void damage equal to twice your number of tattooed historian feats against the triggering attack.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Tattooed Historian Dedication'],
    mechanics: 'Reaction. Trigger: creature targets you with attack (visible). Expend storied skin use. +1 circ to AC vs attack. Resistance to mental/spirit/void = 2× tattooed historian feats vs the attack.',
  },
  {
    id: 'tattooed-historian-infused-with-belkzens-might',
    name: 'Infused with Belkzen\'s Might',
    source: 'Tattooed Historian (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your tattoos immortalize the conquests of orc war leaders, such as Belkzen besieging the dwarven Sky Citadel of Koldukar. You can expend one use of your storied skin\'s Living History ability to channel this power into your own weapons. Until the end of your next turn, you deal additional spirit damage with weapons and unarmed attacks equal to 1 plus half the number of Tattooed Historian feats you have.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 2,
    prerequisites: ['Tattooed Historian Dedication'],
    mechanics: '2 actions. Expend storied skin use. Until end of next turn: +spirit damage with weapons/unarmed = 1 + half # tattooed historian feats.',
  },
  {
    id: 'tattooed-historian-inscribed-with-elders-deeds',
    name: 'Inscribed with Elders\' Deeds',
    source: 'Tattooed Historian (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your tattoos commemorate unique exploits that (according to legends) only an orc could accomplish. During your daily preparations, you can reconfigure part of your storied skin to depict a specific orc hero, granting you a 1st-level ancestry feat with the orc trait until you prepare again; this ancestry feat cannot require any physiological feature you lack, as determined by the GM. Since this feat is temporary, you can\'t use it as a prerequisite for permanent character options. At 13th level, you can instead gain a 5th-level ancestry feat with the orc trait.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 'passive',
    prerequisites: ['Tattooed Historian Dedication'],
    mechanics: 'Daily preparations: gain 1st-level orc ancestry feat (no physiological reqs). Can\'t use as permanent prereq. At 13th level: 5th-level orc feat instead.',
    subChoices: { label: 'Choose orc ancestry feat', options: [
      { id: 'beast-trainer', name: 'Beast Trainer', description: 'Innate ability to tame ferocious beasts' },
      { id: 'hold-mark', name: 'Hold Mark', description: 'Mark foes for focused attacks' },
      { id: 'iron-fists', name: 'Iron Fists', description: 'Fists deal more damage' },
      { id: 'orc-lore', name: 'Orc Lore', description: 'Trained in Athletics and Survival' },
      { id: 'orc-superstition', name: 'Orc Superstition', description: 'Reaction to save vs magic' },
      { id: 'orc-warmask', name: 'Orc Warmask', description: 'Painted mask grants intimidation bonus' },
      { id: 'orc-weapon-familiarity', name: 'Orc Weapon Familiarity', description: 'Trained with orc weapons' },
      { id: 'tusks-orc', name: 'Tusks', description: 'Tusks unarmed attack (1d6 P)' },
    ] },
  },
  {
    id: 'tattooed-historian-wrath-of-the-hold',
    name: 'Wrath of the Hold',
    source: 'Tattooed Historian (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your tattoos carry the strength of an innumerable horde, and you can expend one use of your storied skin\'s Living History ability to animate your tattoos as ghostly assailants that swarm your foes. These spirits attack all foes in a 30-foot cone, dealing 4d6 spirit damage. The damage increases by 1d6 at 10th level and every 2 levels thereafter. Each affected creature must attempt a basic Will saving throw against the higher of your class DC or spell DC.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Occult'],
    actionCost: 2,
    prerequisites: ['Tattooed Historian Dedication'],
    mechanics: '2 actions. Expend storied skin use. 30-ft cone: 4d6 spirit damage (+1d6 at 10th and every 2 levels). Basic Will vs class/spell DC (higher).',
  },
];

// ══════════════════════════════════════════════════════════
// Combined catalog for barrel import
// ══════════════════════════════════════════════════════════

export const STANDALONE_ARCHETYPE_FEATS_NON_CORE_ST: FeatEntry[] = [
  ...STARLIT_SENTINEL_FEATS,
  ...TWILIGHT_SPEAKER_FEATS,
  ...TATTOOED_HISTORIAN_FEATS,
];
