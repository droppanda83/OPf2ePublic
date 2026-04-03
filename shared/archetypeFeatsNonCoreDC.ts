import type { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// NON-CORE ARCHETYPE FEATS — D-C batch
// Chronoskimmer, Draconic Acolyte, Drake Rider,
// Kitharodian Actor, Lepidstadt Surgeon, Runelord, Cultivator
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// CHRONOSKIMMER  (Dark Archives Remastered pg. 186–187)
// Category: Mystical — Rare
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=349
// Time-manipulating skimmers who exploit the river of time.
// ──────────────────────────────────────────────────────────

export const CHRONOSKIMMER_FEATS: FeatEntry[] = [
  {
    id: 'chronoskimmer-dedication',
    name: 'Chronoskimmer Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Rare', 'Archetype', 'Dedication'],
    prerequisites: [],
    description:
      'You became partially unstuck from time and have learned how to manipulate your place in the flow of time. When you roll initiative, you can choose one of three options: either do nothing and roll initiative normally, stabilize your timestream, or destabilize your timestream and send it into intense fluctuations. Stabilize your Timestream (fortune): You don\'t roll initiative, and instead your initiative is equal to 10 + the modifier you would have used for initiative. Destabilize your Timestream (fortune): You don\'t roll initiative, and instead attempt a DC 11 flat check. On a success, your initiative is equal to 19 + the modifier you would have used for initiative, and on a failure, your initiative is equal to 1 + that modifier. Additionally, if your initiative roll result is tied with an opponent\'s initiative roll, you go first. Your manipulation of time grants you access to a number of abilities, some of which require a saving throw. The DC for these abilities is either your class DC or spell DC, whichever is higher, and is called your chronoskimmer DC.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Initiative choice: normal roll, stabilize (10 + mod), or destabilize (DC 11 flat: success = 19 + mod, fail = 1 + mod). Win ties. Chronoskimmer DC = higher of class DC or spell DC. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'chronoskimmer-turn-back-the-clock',
    name: 'Turn Back the Clock',
    level: 4,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype', 'Concentrate', 'Fortune'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'After failing a test of skill, you hop back in your personal timeline so you can try again. You reroll the triggering check with a +1 circumstance bonus as you apply your experience from your last attempt. You must use the new result, even if it\'s worse than your first roll.',
    implemented: 'full' as const,
    actionCost: 'reaction' as const,
    mechanics:
      'Trigger: You fail a skill check or saving throw. Frequency: once per day. Reroll with +1 circumstance bonus; must use new result.',
  },
  {
    id: 'chronoskimmer-guide-the-timeline',
    name: 'Guide the Timeline',
    level: 6,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype', 'Concentrate'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You know the result you want and subtly nudge the timeline to your intended destination. Choose an ally or a foe. If you choose an ally, the next time within the next round that ally makes an attack roll or skill check, they roll it twice and take the higher result; this is a fortune effect. If you choose a foe, the next time within the next round that foe makes an attack roll or skill check, they must roll twice and take the lower result unless they succeed at a Will save against your chronoskimmer DC; this is a misfortune effect. Regardless of your choice, the target becomes temporarily immune for 24 hours.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Frequency: once per day. Ally: next attack/skill check within 1 round is fortune (roll twice, take higher). Foe: misfortune (roll twice, take lower) unless Will save vs chronoskimmer DC. Target immune 24h.',
  },
  {
    id: 'chronoskimmer-reversing-charge',
    name: 'Reversing Charge',
    level: 8,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You dive into the fray before rewinding yourself to safety. Stride up to your Speed. If you end your movement within melee reach of at least one enemy, you can make a melee Strike against that enemy. You then teleport back to the square from which you began your Reversing Charge. You can use Reversing Charge while Burrowing, Climbing, Flying, or Swimming instead of Striding if you have the corresponding movement type.',
    implemented: 'full' as const,
    actionCost: 2 as const,
    mechanics:
      'Stride up to Speed, melee Strike if in reach, then teleport back to starting square. Can substitute Burrow/Climb/Fly/Swim if applicable.',
  },
  {
    id: 'chronoskimmer-superimpose-time-duplicates',
    name: 'Superimpose Time Duplicates',
    level: 8,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You call alternate versions of yourself, either from a different timeline or perhaps yourself from a different point in your current timeline, to aid you in combat. Until the start of your next turn, these alternate selves flicker in and out in your vicinity, providing flanking for you against all enemies within your reach. Flanking with your time duplicates is the same as flanking with an ally and so is subject to effects like all-around vision or the deny advantage class feature.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Frequency: once per hour. Until start of next turn, you flank all enemies within your reach (as if an ally were providing flanking). Subject to anti-flanking abilities.',
  },
  {
    id: 'chronoskimmer-borrow-time',
    name: 'Borrow Time',
    level: 10,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You reach ahead and make use of time that\'s yet to be. You become quickened and can use the extra action to Step, Stride, or Strike. You gain this extra action immediately and can use it this turn. At the end of your turn, you become stunned 1.',
    implemented: 'full' as const,
    actionCost: 'free' as const,
    mechanics:
      'Trigger: Your turn begins. Frequency: once per minute. Quickened (extra action: Step, Stride, or Strike). Stunned 1 at end of turn.',
  },
  {
    id: 'chronoskimmer-steal-time',
    name: 'Steal Time',
    level: 10,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You reach into another creature\'s timeline and attempt to alter their flow of time. Select a creature within 30 feet. That creature attempts a Fortitude saving throw against your chronoskimmer DC. The creature takes the effects of slow based on the result of its saving throw.',
    implemented: 'full' as const,
    actionCost: 2 as const,
    mechanics:
      'Frequency: once per hour. Target within 30 ft makes Fort save vs chronoskimmer DC. Apply slow based on degree of success.',
  },
  {
    id: 'chronoskimmer-combat-premonition',
    name: 'Combat Premonition',
    level: 12,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'By narrowing your sense of the future, you can improve that of your allies. When you roll initiative, instead of stabilizing or destabilizing your own timestream, you can grant your allies a flash of insight into their future. Choose two allies. Those allies roll their initiative roll twice and take the better result; this is a fortune effect. You roll your initiative roll twice and take the worse result; this is a misfortune effect. The two effects are tied together: if you would avoid the misfortune effect for any reason, or if any of your allies would negate their fortune effect, your Combat Premonition does nothing.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'On initiative: choose 2 allies to roll initiative twice (fortune, take better). You roll initiative twice (misfortune, take worse). Effects are linked—if either is negated, whole ability fails.',
  },
  {
    id: 'chronoskimmer-escape-timeline',
    name: 'Escape Timeline',
    level: 12,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You step outside of the flow of time momentarily, allowing you to avoid dangers. Your physical form stops existing momentarily, and you can\'t be targeted or affected until the start of your next turn—you simply don\'t exist at that moment in time. Your turn ends immediately, advancing 1 round for all timed durations and effects, such as conditions and afflictions. You still attempt saving throws, flat checks, or any other checks at the end of your turn as normal, but you don\'t take any damage due to these checks (though you take any non-damaging effects as normal). At the start of your next turn, you reenter the flow of time and reappear in the same space where you left time last round. If the space isn\'t clear, you arrive in the nearest open space.',
    implemented: 'full' as const,
    actionCost: 'free' as const,
    mechanics:
      'Trigger: Your turn begins. Frequency: once per day. You cease to exist until start of next turn (untargetable, unaffectable). Turn ends immediately. End-of-turn checks still happen but deal no damage. Reappear in same space (or nearest open).',
  },
  {
    id: 'chronoskimmer-space-time-shift',
    name: 'Space-Time Shift',
    level: 12,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You travel just a few moments into the future to immediately arrive at your destination. Your Strides are augmented until the end of your turn, allowing you to instantly teleport to any point you could reach with your Stride instead of traversing normally to the location. Your augmented Strides have the teleportation trait and don\'t trigger reactions that can be triggered by move actions or upon leaving or entering a square. You also augment your Burrow, Climb, Fly, or Swim actions in this way if you have the corresponding movement type.',
    implemented: 'full' as const,
    actionCost: 'free' as const,
    mechanics:
      'Trigger: Your turn begins. Frequency: once per 10 minutes. Until end of turn, Strides become teleportation (no reactions from movement). Also applies to Burrow/Climb/Fly/Swim if you have them.',
  },
  {
    id: 'chronoskimmer-reset-the-past',
    name: 'Reset the Past',
    level: 14,
    category: 'archetype' as const,
    source: 'Dark Archives (Remastered)',
    traits: ['Archetype'],
    prerequisites: ['Chronoskimmer Dedication'],
    description:
      'You manipulate time to recharge one of your temporal techniques—by revising your past so you never used it in the first place. Select one of your chronoskimmer feats that has a frequency of once per day (or more frequent) that you\'ve already used. You can use the feat again, as if you hadn\'t used it already.',
    implemented: 'full' as const,
    actionCost: 'free' as const,
    mechanics:
      'Frequency: once per day. Reset the frequency of one already-used chronoskimmer feat (must be once/day or more frequent).',
  },
];

// ──────────────────────────────────────────────────────────
// DRACONIC ACOLYTE  (Draconic Codex pg. 218–219)
// Category: Mystical — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=333
// Wielders of draconic gifts who channel dragon essence.
// ──────────────────────────────────────────────────────────

export const DRACONIC_ACOLYTE_FEATS: FeatEntry[] = [
  {
    id: 'draconic-acolyte-dedication',
    name: 'Draconic Acolyte Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Arcana', 'trained in Nature, Occultism, or Religion'],
    description:
      'As an acolyte of dragonkind, you have an item known as a draconic gift that you can use to summon a portion of the magical essence of the dragon you received it from. Choose a draconic benefactor with a trait that matches the trained skill you used to qualify for this feat (arcane for Arcana, primal for Nature, occult for Occultism, and divine for Religion). You can\'t change your draconic benefactor later. You gain the Additional Lore feat for Dragon Lore. If you were already trained in Dragon Lore, you also become trained in a Lore skill of your choice. You gain a draconic gift, a palm-sized magic item of negligible Bulk with a level equal to your level and a trait matching your draconic benefactor\'s tradition. Choose this item\'s appearance when you take this feat. This item is linked to your spirit, so if you ever lose possession of it (whether by dropping it or having it stolen from your person), it appears back in your possession at the beginning of your next turn. Finally, you gain the Channel Draconic Essence action and Draconic Salvation reaction. These and all other actions from this archetype gain the tradition trait of your draconic benefactor. Channel Draconic Essence [one-action] (concentrate) Requirements You aren\'t channeling draconic essence and you\'re holding or wearing your draconic gift; Effect You call down a portion of the magical essence of your draconic benefactor. A Medium spectral dragon that looks like your benefactor appears in any square within 30 feet. This spectral dragon can\'t be targeted by any attacks or spells and has no Hit Points, saving throws, or skills. It can occupy the same space as creatures and objects. While your spectral dragon is in your space, you gain a +1 status bonus to saves against sleep and paralysis. Channel Draconic Essence lasts until you Channel Draconic Essence again, you Dismiss the effect, the encounter ends, you fall unconscious, or the spectral dragon is farther than 120 feet from you, whichever comes first. Draconic Salvation [reaction] (concentrate, fortune) Trigger You critically fail a saving throw against an effect with the same tradition trait as your draconic benefactor; Requirements Your spectral dragon is in your space; Effect You improve your saving throw result by one degree of success, and Channel Draconic Essence ends.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Choose draconic benefactor (tradition matches qualifying skill). Gain Dragon Lore. Gain draconic gift (returns if lost). Channel Draconic Essence (1-action, concentrate): summon spectral dragon within 30 ft; +1 status to saves vs sleep/paralysis while in your space. Draconic Salvation (reaction): on crit-fail save vs matching tradition, improve by 1 degree; ends Channel. Dedication-lock enforced by validateDedicationTaking().',
    subChoices: { label: 'Choose draconic benefactor', options: [
      { id: 'arcane', name: 'Arcane Benefactor', description: 'Matches Arcana skill' },
      { id: 'divine', name: 'Divine Benefactor', description: 'Matches Religion skill' },
      { id: 'occult', name: 'Occult Benefactor', description: 'Matches Occultism skill' },
      { id: 'primal', name: 'Primal Benefactor', description: 'Matches Nature skill' },
    ] },
  },
  {
    id: 'draconic-acolyte-draconic-fury',
    name: 'Draconic Fury',
    level: 4,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype', 'Concentrate'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'You briefly summon spectral claws that lash out in a flurry. All creatures in a 15-foot cone take 2d6 slashing damage with a basic Reflex save against the higher of your class DC or spell DC. A creature that critically fails the save also takes 1d4 persistent bleed damage. If you are Channeling Draconic Essence, your spectral dragon\'s space can be the origin of the cone. At 8th level and every 4 levels thereafter, the initial damage increases by 1d6 and the persistent bleed damage on a critical failure increases by 1d4.',
    implemented: 'full' as const,
    actionCost: 2 as const,
    mechanics:
      'Requirements: holding or wearing draconic gift. 15-ft cone, 2d6 slashing (basic Reflex vs higher of class/spell DC). Crit-fail: +1d4 persistent bleed. If Channeling, spectral dragon can be origin. Scales +1d6/+1d4 every 4 levels from 8th.',
  },
  {
    id: 'draconic-acolyte-draconic-resilience',
    name: 'Draconic Resilience',
    level: 4,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype', 'Concentrate'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Energy reminiscent of dragon scales shimmers over you, making it more difficult for attacks to penetrate your defenses. Until the start of your next turn, you gain a +1 status bonus to AC and gain resistance equal to half your level to bludgeoning damage. If you are Channeling Draconic Essence, you can grant these benefits to a willing creature who is in the same space as your spectral dragon instead of you.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Requirements: holding or wearing draconic gift. Until start of next turn: +1 status AC, resistance to bludgeoning = half level. If Channeling, can grant to creature sharing spectral dragon\'s space instead.',
  },
  {
    id: 'draconic-acolyte-draconic-familiar',
    name: 'Draconic Familiar',
    level: 6,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Your devotion to dragons has attracted a loyal servant. You gain a familiar. You can select four familiar or master abilities each day, instead of two, but one of them must always be the dragon familiar ability. When you Channel Draconic Essence, you can also Command your familiar as a free action.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain familiar with 4 abilities/day (one must be dragon). On Channel Draconic Essence, Command familiar as free action.',
  },
  {
    id: 'draconic-acolyte-essence-overflow',
    name: 'Essence Overflow',
    level: 6,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype', 'Concentrate'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Uncontainable power explodes from your spectral dragon. Your Channel Draconic Essence ends, and all creatures (except you) in a 10-foot emanation from your spectral dragon take 6d6 damage with a basic Reflex save against the higher of your class DC or spell DC. The damage\'s type matches the breath of your draconic benefactor. You then can\'t use Essence Overflow again for 1d4 rounds. At 8th level and every 2 levels thereafter, the damage increases by 1d6.',
    implemented: 'full' as const,
    actionCost: 2 as const,
    mechanics:
      'Requirements: Channeling Draconic Essence. Ends Channel. 10-ft emanation from spectral dragon, 6d6 damage (type = benefactor breath, basic Reflex vs higher of class/spell DC). Can\'t reuse for 1d4 rounds. +1d6 every 2 levels from 8th.',
  },
  {
    id: 'draconic-acolyte-benefactors-wings',
    name: "Benefactor's Wings",
    level: 8,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Calling on your draconic gift, spectral wings carry you to your destination. You Fly. If you don\'t normally have a fly Speed, you gain a fly Speed of 20 feet for this movement. If your spectral dragon shares your space, this fly Speed is instead 30 feet, and your spectral dragon moves with you. If you aren\'t on solid ground at the end of this movement, you fall.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Requirements: holding or wearing draconic gift. Fly (20 ft if no fly Speed; 30 ft if spectral dragon in your space, and it moves with you). Fall if not on solid ground after.',
  },
  {
    id: 'draconic-acolyte-reactive-resilience',
    name: 'Reactive Resilience',
    level: 8,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Resilience'],
    description:
      'Your power blunts blades and weakens spells like the hardiest of dragon scales. You gain resistance to the triggering damage equal to your level. Channel Draconic Essence ends.',
    implemented: 'full' as const,
    actionCost: 'reaction' as const,
    mechanics:
      'Trigger: You take damage. Requirements: Channeling Draconic Essence. Frequency: once per day. Gain resistance = level to triggering damage. Ends Channel.',
  },
  {
    id: 'draconic-acolyte-deepening-devotion',
    name: 'Deepening Devotion',
    level: 10,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Your investment in your draconic gift has unlocked greater power. When your spectral dragon shares your space, the status bonus to saves against sleep and paralysis increases to +2. In addition, you can use Draconic Salvation if you succeeded or failed on your saving throw, not only if you critically failed.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Spectral dragon in space: +2 status to saves vs sleep/paralysis (up from +1). Draconic Salvation now triggers on success or failure (not just crit-fail).',
  },
  {
    id: 'draconic-acolyte-reflexive-devotion',
    name: 'Reflexive Devotion',
    level: 10,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'The power of dragons flows through you at the merest thought. You Channel Draconic Essence.',
    implemented: 'full' as const,
    actionCost: 'free' as const,
    mechanics:
      'Trigger: You roll initiative. Channel Draconic Essence as a free action.',
  },
  {
    id: 'draconic-acolyte-frightening-power',
    name: 'Frightening Power',
    level: 12,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype', 'Aura', 'Emotion', 'Fear', 'Mental'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Draconic essence coruscates around you, sapping the resilience of your foes. Each enemy in a 20-foot emanation must attempt a Will saving throw against the higher of your class DC or spell DC. If you are Channeling Draconic Essence, your spectral dragon can be the origin of this emanation. Regardless of the result of its saving throw, a creature that attempts a save is temporarily immune to your Frightening Power for 24 hours. Critical Success The creature is unaffected. Success The creature is frightened 1. Failure The creature is frightened 2. Critical Failure The creature is frightened 4.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Requirements: holding or wearing draconic gift. 20-ft emanation, Will save vs higher of class/spell DC. Crit-success: unaffected. Success: frightened 1. Failure: frightened 2. Crit-fail: frightened 4. If Channeling, spectral dragon can be origin. Immune 24h after save.',
  },
  {
    id: 'draconic-acolyte-call-draconic-ally',
    name: 'Call Draconic Ally',
    level: 14,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Either by beseeching a dragon or bending it to your will, you conjure a mighty creature to assist you. Once per day while you are Channeling Draconic Essence, you can cast summon dragon as an innate spell with a tradition matching your draconic exemplar, heightened to half your level rounded up.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Once per day while Channeling: cast summon dragon (innate, matching tradition, heightened to half level rounded up).',
  },
  {
    id: 'draconic-acolyte-hidden-hoard',
    name: 'Hidden Hoard',
    level: 16,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Draconic Acolyte Dedication'],
    description:
      'Your draconic gift is the key to a repository of treasure that only you can access. You create an extradimensional space that can hold up to 100 Bulk worth of objects. The space functions as a spacious pouch, but has no Bulk, and can be Interacted with using only one hand by touching your draconic gift. You can normally store and retrieve items that could fit through the opening of a bag (as spacious pouch). However, you can store an unattended item larger than would normally fit (but no larger than 10 Bulk) by spending 1 minute concentrating on your draconic gift as you press it against the object. Retrieving it takes 1 minute and causes the item to appear in the closest unoccupied space.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Extradimensional space (100 Bulk). Functions as spacious pouch with no Bulk, one-hand Interact via draconic gift. Store/retrieve oversized items (up to 10 Bulk) with 1 minute each.',
  },
];

// ──────────────────────────────────────────────────────────
// DRAKE RIDER  (Draconic Codex pg. 220–221)
// Category: Combat Style — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=334
// Dragon-bonded riders who fight alongside drake companions.
// ──────────────────────────────────────────────────────────

export const DRAKE_RIDER_FEATS: FeatEntry[] = [
  {
    id: 'drake-rider-dedication',
    name: 'Drake Rider Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Nature', 'Charisma +1'],
    description:
      'You gain the service of a young riding drake, riding dragonet, or another animal companion with the dragon trait you have access to. Your bond with your dragon companion lets you communicate and issue commands to it telepathically with a range of 100 feet. You must still use the Command an Animal action to direct it but don\'t require words or gestures to do so.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain young dragon companion (riding drake, dragonet, or other with dragon trait). Telepathic communication/commands within 100 ft. Still requires Command an Animal (no words/gestures). Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'drake-rider-mature-dragon-companion',
    name: 'Mature Dragon Companion',
    level: 4,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Drake Rider Dedication'],
    description:
      'Your dragon companion matures and the bond you share is strengthened. The dragon companion you gained with your Drake Rider Dedication is now a mature animal companion. Your dragon companion gains greater independence. During an encounter, even if you don\'t use the Command an Animal action, your dragon companion can still use 1 action that round on your turn to Stride or Strike. It can do this at any point during your turn, as long as you aren\'t currently taking an action. If it does, that\'s all the actions it gets that round—you can\'t Command it later.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Dragon companion becomes mature. Gains 1 independent action per turn (Stride or Strike) without Command, but forfeits additional actions that round.',
  },
  {
    id: 'drake-rider-winged-leap',
    name: 'Winged Leap',
    level: 4,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['dragon companion with the mount special ability', 'Drake Rider Dedication'],
    description:
      'While drakes and dragons are able flyers, they\'re uncomfortable carrying a rider in the air without special training. Through hard work, nerves of steel, and the deep bond you share with your draconic companion, your companion has learned to carry you skyward, if only briefly. Your dragon companion gains the Winged Leap action. Winged Leap [one-action] Frequency once per round; Effect Your dragon companion Flies. If it doesn\'t normally have a fly Speed, it gains a fly Speed of 25 feet for this movement. If it isn\'t on solid ground at the end of this movement, it falls.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Dragon companion gains Winged Leap (1-action, once/round): Fly action (25-ft fly Speed if none). Falls if not on solid ground afterward.',
  },
  {
    id: 'drake-rider-flair-rider-stance',
    name: 'Flair Rider Stance',
    level: 6,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype', 'Stance'],
    prerequisites: ['Drake Rider Dedication', 'trained in Acrobatics'],
    description:
      'You spend little time in your saddle as you flip unpredictably around your dragon mount, dodging attacks. While mounted and in this stance, your mount always provides you with lesser cover and you don\'t take the –2 circumstance penalty to Reflex saves while mounted.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Stance (while mounted). Mount always provides lesser cover. No –2 circumstance penalty to Reflex saves while mounted.',
  },
  {
    id: 'drake-rider-war-rider-stance',
    name: 'War Rider Stance',
    level: 6,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype', 'Aura', 'Stance'],
    prerequisites: [
      'Drake Rider Dedication',
      'expert in martial weapons',
      'dragon companion with a support benefit that includes damage',
    ],
    description:
      'Your dragon\'s constant breath threatens your foes. While in this stance, your dragon companion has an aura in a 5-foot emanation. Each creature that starts its turn in the aura takes the damage listed under the dragon\'s support benefit with a basic Reflex save against your mount\'s Athletics DC.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Stance. Dragon companion gains 5-ft aura. Creatures starting turn in aura take support-benefit damage (basic Reflex vs mount\'s Athletics DC).',
  },
  {
    id: 'drake-rider-incredible-dragon-companion',
    name: 'Incredible Dragon Companion',
    level: 8,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Mature Dragon Companion'],
    description:
      'Your mature dragon companion develops further, becoming more robust and formidable. Your dragon companion becomes a nimble or savage animal companion, gaining additional capabilities determined by the type of companion.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Dragon companion becomes nimble or savage animal companion.',
  },
  {
    id: 'drake-rider-wing-rider',
    name: 'Wing Rider',
    level: 10,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Winged Leap'],
    description:
      'Your bond with your dragon has been honed so fine that it can carry you aloft with its full capability. Your dragon companion has a fly Speed of 25 feet at all times.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Dragon companion gains permanent 25-ft fly Speed.',
  },
  {
    id: 'drake-rider-death-dive',
    name: 'Death Dive',
    level: 12,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Flair Rider Stance', 'Wing Rider'],
    description:
      'You guide your mount into a plummet, diving headlong at a single foe. You command your mount to Fly twice. It must end this movement at a lower altitude than it began its turn at. You and your mount gain a +4 circumstance bonus to AC against reactions triggered by this movement. At the end of this movement, your mount attempts a melee Strike against one creature in its reach. If the Strike hits, the target is knocked prone if it\'s smaller than your mount; if it\'s a critical hit, the target is knocked prone if it\'s the same size as your mount or smaller.',
    implemented: 'full' as const,
    actionCost: 3 as const,
    mechanics:
      'Requirements: riding dragon companion and airborne. Mount Flies twice (must end lower). +4 circ AC vs reactions from movement. Mount melee Strike at end; hit: knock prone if smaller; crit: prone if same size or smaller.',
  },
  {
    id: 'drake-rider-strafing-breath',
    name: 'Strafing Breath',
    level: 12,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['War Rider Stance'],
    description:
      'You urge your dragon mount forward, wreathed in magical power. Your mount Strides three times. If your mount has a fly Speed, it can substitute a Fly action for any of these Stride actions. As it moves, your dragon companion\'s magical breath billows around you. The aura from War Rider Stance increases to a 10-foot emanation during this movement, and each creature that\'s in the emanation at any point during your movement takes the damage from it (with the normal save). A creature can take damage only once, even if you move past it multiple times.',
    implemented: 'full' as const,
    actionCost: 3 as const,
    mechanics:
      'Requirements: War Rider Stance active. Mount Strides 3 times (can Fly instead if able). War Rider aura becomes 10-ft emanation during movement. Each creature in aura at any point takes damage once (normal save).',
  },
  {
    id: 'drake-rider-guided-hover',
    name: 'Guided Hover',
    level: 14,
    category: 'archetype' as const,
    source: 'Draconic Codex',
    traits: ['Archetype'],
    prerequisites: ['Wing Rider'],
    description:
      'You guide your draconic companion, whose outstretched wings fill with unseen thermals. Your mount hovers without needing to use a Fly action to stay in place.',
    implemented: 'full' as const,
    actionCost: 'reaction' as const,
    mechanics:
      'Trigger: Your turn ends. Requirements: airborne dragon mount hasn\'t used Fly this turn. Mount hovers in place without Fly action.',
  },
];

// ──────────────────────────────────────────────────────────
// KITHARODIAN ACTOR  (Rival Academies pg. 58–59)
// Category: Profession — Rare
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=301
// Method actors who embody Taldan theater's iconic roles.
// ──────────────────────────────────────────────────────────

export const KITHARODIAN_ACTOR_FEATS: FeatEntry[] = [
  {
    id: 'kitharodian-actor-dedication',
    name: 'Kitharodian Actor Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Rare', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Performance'],
    description:
      'You\'ve studied classic Taldan theater and learned to embody various roles to a sublime degree. You become trained in Society and in Theater Lore; if you were already trained in either, you become an expert in that skill instead. In addition, when you attempt a Deception or Performance check to portray a famous figure, you gain a +2 circumstance bonus to your check. This bonus changes to +3 at 10th level and +4 at 17th level. However, you don\'t gain this bonus while Impersonating a figure whose death is common knowledge (as determined by the GM). Access: You are from Taldor or have attended Kitharodian Academy.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Trained in Society and Theater Lore (expert if already trained). +2 circ to Deception/Performance to portray famous figures (+3 at 10th, +4 at 17th). No bonus for figures whose death is common knowledge. Access: from Taldor or attended Kitharodian Academy. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'kitharodian-actor-animal-actor',
    name: 'Animal Actor',
    level: 4,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You participated in a performance of The Leaping Lion, a play focusing on Cyricas, the animal-loving adventurer who traveled with his ape friend Mardu and remains a favorite hero among Taldan youth. You become trained in Nature and a Lore skill related to a particular type of animal commonly used in show business (such as Canine Lore, Ursine Lore, or Primate Lore); if you were already trained in either, you become an expert in that skill instead. You gain a +2 circumstance bonus to all checks to Command an Animal and Recall Knowledge about creatures with the animal trait. You can use your chosen animal Lore to Command an Animal of that type.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Trained in Nature and an animal Lore (expert if already trained). +2 circ to Command an Animal and Recall Knowledge (animal trait creatures). Can use animal Lore to Command that type.',
  },
  {
    id: 'kitharodian-actor-heavens-step-offense',
    name: "Heaven's Step Offense",
    level: 4,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'Your lessons from the stage find life in the storied mercy and fearlessness of Grand Prince Gennaris III. With a theatrical flourish, the Strike becomes nonlethal, and you can Stride up to half your Speed in a straight line toward another enemy. This attention-arresting movement does not provoke reactions from enemies unless they are immune to mental effects.',
    implemented: 'full' as const,
    actionCost: 'reaction' as const,
    mechanics:
      'Trigger: Your melee Strike reduces a creature to 0 HP. Strike becomes nonlethal. Stride up to half Speed in a straight line toward another enemy; doesn\'t provoke reactions (unless target immune to mental).',
  },
  {
    id: 'kitharodian-actor-clean-take',
    name: 'Clean Take',
    level: 6,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Fortune'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'Thanks to many long hours of rehearsals, your acting skill is infinitely adaptable. Even when your impressions don\'t quite hit the mark, you\'re able to refine and tweak your performance on the spot. Reroll the triggering check and take the second result.',
    implemented: 'full' as const,
    actionCost: 'reaction' as const,
    mechanics:
      'Trigger: You fail (but don\'t critically fail) a Deception or Performance check to portray a famous figure. Reroll and take the second result (fortune).',
  },
  {
    id: 'kitharodian-actor-monumental-maestro',
    name: 'Monumental Maestro',
    level: 8,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You\'ve studied the moving compositions of Andreas Romung, a legendary maestro whose Shining Crusade anthems live on in the music for the play Echoes of Glory. You gain a +2 circumstance bonus to Performance checks to Perform with a musical instrument or sing. If you succeed, the DCs of subsequent Diplomacy checks against any creature who observed your performance are reduced by 2 for the next 24 hours.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      '+2 circ to Performance (instrument or singing). On success: Diplomacy DCs against observers reduced by 2 for 24h.',
  },
  {
    id: 'kitharodian-actor-stunt-performer-stance',
    name: 'Stunt Performer Stance',
    level: 10,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Stance'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You clear your mind, regulate your breathing, and prepare your muscles in a stance inspired by Kemen Kayton, a graduate of Zimar\'s Monastery of the Seven Forms. Kemen controversially shunned monastic life and instead used his martial skills as a death-defying stunt performer, winning acclaim for exhibitions that saw him survive great falls and escape deadly traps. While in this stance, you gain a +2 circumstance bonus to Reflex saving throws and skill checks to Escape, as well as resistance 2 to all physical damage.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Requirements: unarmored. Stance: +2 circ to Reflex saves and Escape checks. Resistance 2 to all physical damage.',
  },
  {
    id: 'kitharodian-actor-bleak-humorist',
    name: 'Bleak Humorist',
    level: 12,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Emotion', 'Linguistic', 'Mental'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You\'ve watched dozens of morbid comedies depicting Beldam I, Taldor\'s prankster emperor whose wife accidentally killed him when she struck him with a marble bust after he jumped out from behind curtains to frighten her. You are reminded of this depressing yet perversely comical tale whenever you are near death, and in your final moments of consciousness you murmur a bleak joke to the creature who reduced you to 0 Hit Points. The creature must attempt a Will save against your class DC. Critical Success The target is unaffected. Success The target is distracted by giggles and can\'t use reactions until the beginning of your next turn. Failure The target laughs uncontrollably. It can\'t use reactions until the beginning of your next turn and is slowed 1. Critical Failure As failure, but the target also immediately falls prone.',
    implemented: 'full' as const,
    actionCost: 'reaction' as const,
    mechanics:
      'Trigger: reduced to 0 HP by creature within 30 ft (not killed). Frequency: once per day. Will save vs class DC. Crit-success: unaffected. Success: no reactions until your next turn. Failure: no reactions + slowed 1. Crit-fail: + falls prone.',
  },
  {
    id: 'kitharodian-actor-sympathetic-portrayal',
    name: 'Sympathetic Portrayal',
    level: 12,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You portrayed Grand Prince Stavian III in Fall of the Troubled King, a production dedicated to the life and times of the paranoid Taldan ruler whose violent resistance to new policies on succession kicked off the War for the Crown. Your acting won rave reviews for recasting Stavian\'s paranoia and political machinations in a sympathetic light, and you\'ve learned to apply these subtle techniques outside of the stage to win others over. Whenever you succeed at a Deception or Performance check to portray a famous figure, you can select one creature within 60 feet who observed your performance. As long as this creature isn\'t hostile, its attitude toward you automatically improves by two steps (three steps if your check was a critical success). If it\'s hostile, it\'s stupefied 2 for 1 minute as it tries to reconcile its desire to harm you with its newfound sympathy for you.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'On success at Deception/Performance to portray famous figure: select 1 creature within 60 ft. Non-hostile: attitude improves 2 steps (3 on crit). Hostile: stupefied 2 for 1 minute.',
  },
  {
    id: 'kitharodian-actor-of-lions-and-wyrms',
    name: 'Of Lions and Wyrms',
    level: 14,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You starred in a war drama depicting First Emperor Taldaris\'s battles against the Grogrisant, a massive six-eyed lion, and Verksaris the Kingeater, a mighty dragon. To prepare for your role, you spent weeks in the wild observing and occasionally scrapping with any creature resembling Taldaris\'s legendary foes. You gain a +2 circumstance bonus to saving throws against effects from beasts and dragons.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      '+2 circ to saving throws against effects from beasts and dragons.',
  },
  {
    id: 'kitharodian-actor-ruthless-orator',
    name: 'Ruthless Orator',
    level: 16,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Auditory', 'Emotion', 'Linguistic', 'Mental'],
    prerequisites: ['Kitharodian Actor Dedication'],
    description:
      'You were once cast in the role of Daronlyr XII, one of Taldor\'s most ambitious rulers who slew his cousin to seize the crown, yet somehow still managed to convince the entire Ulfen Guard to swear loyalty to him simply through his powers of oration. You attempt a Performance check to launch into a powerful monologue, pulling lines from Daronlyr\'s playbook to win respect from everyone around you, even your enemies. The DC of this check is a hard difficulty DC of your level. On a success, any hostile creatures within 20 feet take a –2 circumstance penalty to attack rolls and spell attack rolls that target you until the beginning of your next turn, and any allies within 20 feet are quickened until the beginning of your next turn. The additional action can be used only to Strike or Stride.',
    implemented: 'full' as const,
    actionCost: 2 as const,
    mechanics:
      'Frequency: once per hour. Performance check (hard DC of level). On success: hostile creatures within 20 ft: –2 circ to attacks/spell attacks targeting you until next turn. Allies within 20 ft: quickened (Strike or Stride only) until next turn.',
  },
];

// ──────────────────────────────────────────────────────────
// LEPIDSTADT SURGEON  (Rival Academies pg. 94–95)
// Category: Profession — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=302
// Mad-science surgeons who wield lightning and stitched creation.
// ──────────────────────────────────────────────────────────

export const LEPIDSTADT_SURGEON_FEATS: FeatEntry[] = [
  {
    id: 'lepidstadt-surgeon-dedication',
    name: 'Lepidstadt Surgeon Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Medicine', 'attended the University of Lepidstadt'],
    description:
      'Before everything else, before the blood and the monsters and the Stasian technology and the horror, you are a doctor. You are, in fact, an exceptionally good doctor. You become an expert in Medicine. When you successfully Administer First Aid to stabilize a dying creature that doesn\'t yet have the wounded condition, it regains 2d8 Hit Points; this healing increases by 10 when you are a master of Medicine and by another 10 when you are legendary in Medicine. When you successfully Administer First Aid to stop bleeding, the target rolls the flat check (with lowered DC for an assisted recovery) twice and takes the better result; this is a fortune effect.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Expert in Medicine. Administer First Aid (stabilize, no wounded): target heals 2d8 HP (+10 at master, +10 at legendary). Administer First Aid (stop bleeding): target rolls flat check twice (fortune). Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'lepidstadt-surgeon-in-lightning-life',
    name: 'In Lightning, Life',
    level: 4,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Concentrate', 'Electricity', 'Healing', 'Manipulate'],
    prerequisites: ['Lepidstadt Surgeon Dedication'],
    description:
      '"In lightning, there is life." This lesson is whispered throughout Lepidstadt, and you can put it to practical use. You have integrated a miniature Stasian coil into your healer\'s toolkit. You use the coil to gently shock a willing or unconscious ally within your reach, who gains 2d4 temporary Hit Points from the jolt. These temporary Hit Points last for 1 minute. These temporary Hit Points increase by 1d4 at 8th level and every 4 levels thereafter. A creature that has resistance or immunity to electricity is immune to this ability, and a creature that received temporary Hit Points from In Lightning, Life is temporarily immune to it for 24 hours.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Frequency: once per 10 minutes. Requirements: wearing or holding healer\'s toolkit. Willing/unconscious ally in reach gains 2d4 temp HP for 1 min (+1d4 at 8th and every 4 levels). Immune if resistant/immune to electricity. Target immune 24h after.',
  },
  {
    id: 'lepidstadt-surgeon-rise-my-creature',
    name: 'Rise, My Creature!',
    level: 4,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Lepidstadt Surgeon Dedication'],
    description:
      'You have created life! You have usurped the power of the gods themselves! You gain a prototype construct companion pieced together from corpses and animated by chemicals or Stasian technology. You use Medicine in place of Crafting to Repair your construct or rebuild it if it\'s been destroyed. Your creation has an affinity for the lightning that brought it to life. When your construct companion takes electricity damage, it gains a +1 circumstance bonus to its Athletics skill checks until the end of its next turn. Although the coils or alchemical residue make it obvious to you and those with similar training that your creation is not undead, others must generally succeed at a DC 15 Crafting, Medicine, or Religion check to verify those claims with Recall Knowledge.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain prototype construct companion. Use Medicine instead of Crafting to Repair/rebuild. When construct takes electricity damage: +1 circ to Athletics until end of next turn. DC 15 Crafting/Medicine/Religion to identify as not undead.',
  },
  {
    id: 'lepidstadt-surgeon-artery-map',
    name: 'Artery Map',
    level: 6,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Lepidstadt Surgeon Dedication'],
    description:
      'While you\'ve learned all the places a scalpel can cause extensive bleeding to avoid disasters in surgery, such knowledge can serve other purposes. When you Strike an off-guard creature with a weapon from the knife group, you deal 1d6 persistent bleed damage. The damage increases to 1d10 when you are legendary in Medicine.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Strike off-guard creature with knife-group weapon: +1d6 persistent bleed (1d10 at legendary Medicine).',
  },
  {
    id: 'lepidstadt-surgeon-let-my-creature-live',
    name: 'Let my Creature Live!',
    level: 6,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Rise, My Creature!'],
    description:
      'You continue to tinker with your creation\'s muscles and rudimentary mind, granting it a limited form of autonomy. Your construct companion becomes an advanced construct companion. During an encounter, even if you don\'t use the Command a Minion action, your construct companion can still use 1 action on your turn that round to Stride or Strike.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Construct becomes advanced. Gains 1 independent action per turn (Stride or Strike) without Command a Minion.',
  },
  {
    id: 'lepidstadt-surgeon-beautiful-knifework',
    name: 'Beautiful Knifework',
    level: 7,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Exploration', 'Manipulate', 'Skill'],
    prerequisites: ['Lepidstadt Surgeon Dedication', 'master in Medicine'],
    description:
      'You perform surgical adjustments to disguise a willing ally or your construct companion. This counts as preparing a disguise to Impersonate, taking 10 minutes and requiring a healer\'s toolkit instead of a disguise kit. The DC to see through the deception with Seek is your Medicine DC unless the disguised character\'s Deception DC is higher. If the target directly interacts with someone while disguised, they gain a +2 circumstance bonus to their Deception check. You can reverse this effect with another 10-minute surgery. The disguised character can also end it as a free action when they receive any healing effect.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Exploration: 10-min surgery to disguise ally/construct (healer\'s toolkit, not disguise kit). Seek DC = your Medicine DC (or target\'s Deception DC if higher). +2 circ Deception on direct interaction. Reverse with 10-min surgery or free action on healing.',
  },
  {
    id: 'lepidstadt-surgeon-behold-my-creation',
    name: 'Behold My Creation!',
    level: 8,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Let my Creature Live!'],
    description:
      'You have rebuilt your creation once more. It is greater now, more than it once was. Soon, it shall be greater still. Your construct companion becomes an incredible construct companion.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Construct companion becomes incredible.',
  },
  {
    id: 'lepidstadt-surgeon-stasian-charge',
    name: 'Stasian Charge',
    level: 8,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['In Lightning, Life'],
    description:
      'Charging a living body with electricity may seem like a bad idea, but you know better. When a creature gains temporary Hit Points from your In Lightning, Life, they gain the quickened condition until the end of their next turn. They can use the extra action only for Stride and Strike actions.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'When In Lightning, Life grants temp HP: target also becomes quickened until end of next turn (extra action: Stride or Strike only).',
  },
  {
    id: 'lepidstadt-surgeon-stand-back-im-a-doctor',
    name: "Stand Back, I'm a Doctor!",
    level: 12,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['master in Medicine', 'Lepidstadt Surgeon Dedication'],
    description:
      'You have mastered techniques to aid those at the brink of death, even if they use dangerous Stasian technology. Attempt a Medicine check on the dying creature as you deliver it a powerful shock. The DC is usually a standard-difficulty DC of a level equal to the target. On a success, the creature\'s dying condition is reduced by 1 (or 2 on a critical success); if this reduces the value of the dying condition to 0, the creature regains 2d8+10 Hit Points, its wounded condition doesn\'t increase, and it can Stand as a free action. Each creature except you adjacent to the target takes 8d6 electricity damage (basic Reflex save against your class DC or spell DC); instead of attempting this save, a creature can Step as a free action and if they end this movement not adjacent to the target, they take no damage.',
    implemented: 'full' as const,
    actionCost: 2 as const,
    mechanics:
      'Requirements: holding/wearing healer\'s tools with a hand free; dying creature in reach. Medicine check (standard DC of target\'s level). Success: dying reduced by 1 (2 on crit-success). If dying → 0: heal 2d8+10 HP, no wounded increase, free Stand. Adjacent creatures (except you): 8d6 electricity (basic Reflex vs class/spell DC) or Step away to avoid.',
  },
  {
    id: 'lepidstadt-surgeon-a-miracle-of-science',
    name: 'A Miracle of Science!',
    level: 14,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Behold My Creation!'],
    description:
      'Once, you dreamed of creating life. Now you know that merely creating life lacks ambition. No, you have taken life and improved upon it. Your construct companion becomes a paragon construct companion.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Construct companion becomes paragon.',
  },
];

// ──────────────────────────────────────────────────────────
// RUNELORD  (Rival Academies pg. 114–117, Secrets of Magic)
// Category: Class (Wizard) — Rare
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=303
// Sin-magic masters wielding rune-inscribed polearms.
// ──────────────────────────────────────────────────────────

export const RUNELORD_FEATS: FeatEntry[] = [
  {
    id: 'runelord-dedication',
    name: 'Runelord Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Rare', 'Archetype', 'Class', 'Dedication'],
    prerequisites: ['runelord (Wizard class archetype)'],
    description:
      'Your connection to your sin suffuses all magic you use. When you contemplate or indulge in your sin to Refocus, you can also exchange one spell you have prepared for one of your curriculum or sin spells of the same rank.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Class archetype (Wizard). On Refocus (indulge sin): can exchange one prepared spell for a curriculum or sin spell of the same rank. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'runelord-embed-aeon-stone',
    name: 'Embed Aeon Stone',
    level: 2,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Downtime', 'Skill'],
    prerequisites: ['trained in Crafting', 'Runelord Dedication'],
    description:
      'You discover the secrets to embedding aeon stones into your flesh. You spend 1 day attuning to an aeon stone and physically embedding it in your skin. While the stone is embedded this way, you gain the benefits of the aeon stone as if it were orbiting above your head, but it protects the stone from being noticed or stolen as easily. Aeon stones in your flesh must be invested to function, as usual. You can also use this activity to safely remove an embedded aeon stone in 1 day. Someone without this feat can attempt to surgically remove it safely by spending 1 day and succeeding at a DC 30 Medicine check, or hastily by simply ripping it from a corpse.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Downtime: 1 day to embed aeon stone in flesh (still must invest). Stone is harder to notice/steal. 1 day to remove. Others: DC 30 Medicine to remove safely.',
  },
  {
    id: 'runelord-aeon-resonance',
    name: 'Aeon Resonance',
    level: 4,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Embed Aeon Stone'],
    description:
      'You gain the resonant power of one embedded aeon stone as if it were placed in a wayfinder. While you can embed multiple aeon stones in your flesh, you can gain the resonance power from only one embedded stone at a time, selected each day when you make your daily preparations. Special: At 8th level, you can take this feat again. If you do, you gain the resonance powers of up to four invested aeon stones instead of only one.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain resonant power of 1 embedded aeon stone (chosen at daily prep). Special: at 8th, can take again for up to 4 resonance powers.',
  },
  {
    id: 'runelord-polearm-tricks',
    name: 'Polearm Tricks',
    level: 6,
    category: 'archetype' as const,
    source: 'Secrets of Magic',
    traits: ['Archetype'],
    prerequisites: ['Runelord Dedication'],
    description:
      'Your connection to rune magic has revealed tricks to make polearms deadlier in your hands. You gain the critical specialization effects of polearms.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Legacy. Gain critical specialization effects of polearms.',
  },
  {
    id: 'runelord-rod-of-rule',
    name: 'Rod of Rule',
    level: 6,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Runelord Dedication'],
    description:
      'Your personal rune is connected more closely to your arcane bond. You gain the critical specialization effects of your arcane bonded weapon. In addition, whenever you critically hit a creature with your arcane bonded weapon, they begin to feel the pull of your sin, imposing a –2 circumstance penalty to saves against any of your curriculum or sin spells until the end of your next turn.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain crit-spec of arcane bonded weapon. On crit-hit with bonded weapon: target takes –2 circ to saves vs curriculum/sin spells until end of next turn.',
  },
  {
    id: 'runelord-sinbladed-spell',
    name: 'Sinbladed Spell',
    level: 6,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype', 'Spellshape'],
    prerequisites: ['Runelord Dedication'],
    description:
      'You punctuate your spellcasting with a flourish of your weapon, imparting physical force to your magic. If the next spell you cast is a non-cantrip sin or curriculum spell that affects a single target, and you either succeed on your attack roll or the target fails its saving throw against the spell, a wound in the shape of your personal rune appears on the target, dealing additional persistent bleed damage equal to the spell\'s rank, in addition to its regular effects.',
    implemented: 'full' as const,
    actionCost: 1 as const,
    mechanics:
      'Spellshape. Next non-cantrip sin/curriculum spell (single target): on hit or failed save, deal persistent bleed = spell rank.',
  },
  {
    id: 'runelord-sin-reservoir',
    name: 'Sin Reservoir',
    level: 8,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Runelord Dedication'],
    description:
      'During your daily preparations, you can indulge in your associated sin or meditate on its values (and risks). When you do, you gain one additional spell slot of any spell rank up to two ranks below the highest-rank wizard spell you can cast. You can prepare only one of your curriculum spells in this slot.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Requirements: holding a polearm/spear. Daily prep: gain 1 extra spell slot (up to 2 below max rank) for curriculum spells only.',
  },
  {
    id: 'runelord-fused-polearm',
    name: 'Fused Polearm',
    level: 10,
    category: 'archetype' as const,
    source: 'Secrets of Magic',
    traits: ['Archetype'],
    prerequisites: ['Runelord Dedication'],
    description:
      'During your daily preparations, you can magically fuse your arcane bonded weapon and a magical staff together into one item, with the staff making up the haft of the weapon. You prepare the staff at the same time you do this, and you can do this only with a staff you\'re able to prepare. This fusion lasts until the next time you make your daily preparations. The staff and the weapon share their fundamental runes, using whichever weapon potency and whichever striking rune is higher level. They don\'t share any other runes or specific abilities; use the polearm\'s. While the two are fused, the weapon\'s haft takes on aesthetic aspects of the staff, and it can\'t change forms, such as with the shifting rune.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Legacy. Requirements: arcane bonded item is a polearm. Daily prep: fuse bonded polearm + magical staff into one item. Share fundamental runes (higher level). Can\'t change forms while fused.',
  },
  {
    id: 'runelord-sin-counterspell',
    name: 'Sin Counterspell',
    level: 10,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Runelord Dedication', 'Counterspell'],
    description:
      'Your deep connection to a specific sin allows you to easily negate spells that sin opposes. Instead of being able to counter a foe\'s spell with Counterspell only if you have the same spell prepared, you can Counterspell it with any of your curriculum spells if the spell cast would violate your sin\'s anathema.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Counterspell can use any curriculum spell to counter a foe\'s spell that violates your sin\'s anathema (instead of requiring the same spell).',
  },
  {
    id: 'runelord-school-counterspell',
    name: 'School Counterspell',
    level: 12,
    category: 'archetype' as const,
    source: 'Secrets of Magic',
    traits: ['Archetype'],
    prerequisites: ['Counterspell', 'Runelord Dedication'],
    description:
      'Your intricate knowledge of your school lets you easily negate spells from that school. Instead of being able to counter a foe\'s spell with Counterspell only if you have the same spell prepared, if the foe casts a spell from the school matching your specialization, you can Counterspell it with any other spell of the same school.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Legacy. Counterspell can use any spell of your specialized school to counter a matching-school spell.',
  },
  {
    id: 'runelord-orichalcum-bond',
    name: 'Orichalcum Bond',
    level: 18,
    category: 'archetype' as const,
    source: 'Rival Academies',
    traits: ['Archetype'],
    prerequisites: ['Rod of Rule'],
    description:
      'The ancient Thassilonians associated sins with different skymetals, and you\'ve adapted that theory to empower your bonded weapon beyond its normal limits. When your personal rune is placed on a weapon during your daily preparations, choose a weapon property rune of up to your level that is common or you otherwise have access to. That rune is also added to the weapon until your next daily preparations. This rune counts against your weapon\'s limit as normal.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Daily prep: add one common (or accessible) weapon property rune up to your level to bonded weapon. Counts against rune limits.',
  },
  {
    id: 'runelord-school-spell-redirection',
    name: 'School Spell Redirection',
    level: 18,
    category: 'archetype' as const,
    source: 'Secrets of Magic',
    traits: ['Archetype'],
    prerequisites: ['Counterspell', 'Runelord Dedication'],
    description:
      'When you Counterspell a spell with a school matching your specialization, if you critically succeed at your counteract check, or if you succeed while using a spell of a higher level than the spell you countered, you can redirect the spell you countered. You choose the target, area, and other aspects of the spell and use your own spell DC, spell attack roll, or other statistics as appropriate to determine the effects.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Legacy. On Counterspell (matching school): crit-success or success with higher-level spell → redirect the countered spell (your targets, your DCs/stats).',
  },
];

// ──────────────────────────────────────────────────────────
// CULTIVATOR  (Tian Xia Character Guide pg. 114–115)
// Category: Mystical — Rare
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=278
// Qi cultivators seeking immortality through occult discipline.
// ──────────────────────────────────────────────────────────

export const CULTIVATOR_FEATS: FeatEntry[] = [
  {
    id: 'cultivator-dedication',
    name: 'Cultivator Dedication',
    level: 2,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Rare', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Occultism'],
    description:
      'Through an esoteric, often exacting, regimen of meditation, diet, and exercise, you\'ve learned to transform your body\'s inner workings into a crucible of planar and spiritual energies. These austerities allow you to refine your body\'s vitality into qi, the foundation of all cultivation. You become an expert in Occultism. In addition, you gain the adapt self domain spell as a focus spell. It costs 1 Focus Point to cast a focus spell, and you start with a focus pool of 1 Focus Point. You refill your focus pool during your daily preparations, and you can regain 1 Focus Point by spending 10 minutes using the Refocus activity meditating to refine essence into qi, which circulates and refills your focus pool. Your cultivator focus spells are occult spells. You\'re trained in spell attack modifier and spell DC. Your key spellcasting attribute for these spells is Wisdom. Cultivator focus spells are treated as qi spells for prerequisites, counting the number of qi spells you possess and their effects, such as a jiang-shi\'s Drain Qi.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Expert in Occultism. Gain adapt self focus spell (occult, Wisdom). 1 Focus Point; Refocus by meditating. Trained in spell attack/DC. Cultivator focus spells count as qi spells. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'cultivator-immortal-lightness',
    name: 'Immortal Lightness',
    level: 4,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Cultivator Dedication'],
    description:
      'You breathe, allowing your golden core to release qi into the meridians governing your lower body, and break into a burst of speed that could shame arrows in flight. You gain the athletic rush domain spell as a focus spell.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain athletic rush focus spell.',
  },
  {
    id: 'cultivator-lotus-above-the-mud',
    name: 'Lotus Above the Mud',
    level: 6,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Immortal Lightness'],
    description:
      'Your qi, dancing ever diligently toward cultivation, eludes the grasp of the world\'s muck and mire. When you cast your adapt self or athletic rush focus spells, you ignore difficult terrain until the end of your next turn.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'When casting adapt self or athletic rush: ignore difficult terrain until end of next turn.',
  },
  {
    id: 'cultivator-three-clear-breaths',
    name: 'Three Clear Breaths',
    level: 6,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Cultivator Dedication', 'Constitution +2'],
    description:
      'Through your disciplined condensations and circulations of qi, you\'ve caught a fleeting glimpse of cultivation\'s promise, and your health has handsomely profited along the way. You gain the Breath Control, Diehard, and Fast Recovery feats. You must meet the prerequisites for these feats as normal. For each of these feats you already have, you can instead gain a different feat from the following list: Canny Acumen, Fleet, and Toughness.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain Breath Control, Diehard, and Fast Recovery (must meet prereqs). Already-owned feats replaced with Canny Acumen, Fleet, or Toughness.',
  },
  {
    id: 'cultivator-wisteria-and-peony-reunion',
    name: 'Wisteria-and-Peony Reunion',
    level: 6,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype', 'Healing', 'Vitality'],
    prerequisites: ['Cultivator Dedication'],
    description:
      'Your roots of qi stand firm, shaking off pains and aches like the returning flowers and leaves shed during winter\'s snow. You regain Hit Points equal to your level plus the maximum number of Focus Points in your focus pool.',
    implemented: 'full' as const,
    actionCost: 'free' as const,
    mechanics:
      'Trigger: You Cast a focus spell. Frequency: once per hour. Heal HP = level + max Focus Points in pool.',
  },
  {
    id: 'cultivator-keen-eye',
    name: "Cultivator's Keen Eye",
    level: 8,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype', 'Occult'],
    prerequisites: ['Cultivator Dedication'],
    description:
      'Attuned to all arrangements of qi, you gain lifesense as an imprecise sense with a range of 30 feet. You can also sense the presence of precious materials in the same range, which cultivators refer to as "cultivation materials." When you participate in rituals, you can substitute all or part of the ritual\'s cost with an equivalent value of precious materials. This applies only to costs in valuable substances like diamonds, not to rituals that require specific items to function; the GM makes the call if it\'s unclear.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Lifesense 30 ft (imprecise). Sense precious materials within 30 ft. Substitute precious materials for ritual costs (valuable substances only, GM discretion).',
  },
  {
    id: 'cultivator-ghost-path-epiphany',
    name: 'Ghost-path Epiphany',
    level: 10,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Cultivator Dedication', "you aren't holy"],
    description:
      'Deviating from the orthodox path, you tread an inauspicious descent littered with flowers of death; this heretical choice will, in time, earn you the enmity and fear of more traditional cultivators. You become sanctified with the unholy trait. You also learn the call spirit and commune rituals, which can be used to contact only undead or entities from the Void or the Netherworld. When you cast a ritual, you can reduce the number of secondary casters by 1 as you direct decaying fragments of your own soul, felled by your proximity to death, to assist with the ritual. When you do, you must fulfill any requirements for the secondary caster, and you attempt the secondary check normally performed by that secondary caster. You can\'t replace a secondary caster who\'s the target of the spell (as in the atone ritual).',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain unholy sanctification. Learn call spirit and commune rituals (undead/Void/Netherworld only). Rituals: reduce secondary casters by 1 (you fill that role, must meet requirements).',
  },
  {
    id: 'cultivator-three-pecks-of-dew',
    name: 'Three Pecks of Dew',
    level: 10,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Cultivator Dedication', "you aren't unholy"],
    description:
      'At this stage of cultivation, your body is as much spirit as flesh. While still fettered to the physical realm, your form flourishes without needing conventional food or drink, and your natural healing now rivals that brought by scalpel and suture. You become sanctified with the holy trait. When you perform the Subsist downtime activity, you can use Occultism for the skill check (instead of the skills normally associated with your environment). If you do so, this activity gains the vitality trait as you subsist on ambient qi within your environment\'s dew-laden air and create shelter from solidified emanations of qi. Additionally, when you Refocus, you can also Treat Wounds at the same time. If you do so, you can use Occultism for checks to Treat Wounds and disregard the need for a healer\'s kit; this activity gains the vitality trait as you circulate healing qi through your own body or transfuse your ally with healing qi.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Gain holy sanctification. Subsist: use Occultism (vitality). Refocus: can simultaneously Treat Wounds using Occultism without healer\'s kit (vitality).',
  },
  {
    id: 'cultivator-bitter-scholars-promotion',
    name: "The Bitter Scholar's Promotion",
    level: 16,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Ghost-path Epiphany'],
    description:
      'Tian Xia\'s shining cities belie its empires\' long shadow of death, darkened by thousands of years of suffering and injustice. You pursue immortality not through tuft-hunting with Heaven\'s dragons or their imperial brats; yours is the power to crack its corrupt wheel, for you can now release the ghost gates to expedite the dead\'s revenge at being cheated of their fates. You cease aging and, regardless of your actual existential state, now register as an undead to effects that can detect undead (such as lifesense or spiritsense). In addition, you learn create undead rituals for gashadokuro, jiangshi, and shui gui. On a success with one of these rituals, you gain the effects of a critical success instead.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Cease aging. Register as undead to detection effects. Learn create undead rituals (gashadokuro, jiangshi, shui gui). Success on these rituals → critical success.',
  },
  {
    id: 'cultivator-immortal-attains-the-summit',
    name: 'The Immortal Attains the Summit',
    level: 16,
    category: 'archetype' as const,
    source: 'Tian Xia Character Guide',
    traits: ['Archetype'],
    prerequisites: ['Three Pecks of Dew'],
    description:
      'Your cultivation bearing glorious fruit, you behold Heaven\'s will. Returning from your vision of the Holy Mountain, you become an immortal with mystic potency over the terrestrial realms of wind and water. You cease aging and, regardless of your actual existential state, now register as a living being to effects that can detect living creatures (such as lifesense or spiritsense). In addition, you learn the control weather and plant growth rituals. You can use Occultism instead of Nature for these rituals. On a success with one of these rituals, you gain the effects of a critical success instead.',
    implemented: 'full' as const,
    actionCost: 'passive' as const,
    mechanics:
      'Cease aging. Register as living to detection effects. Learn control weather and plant growth rituals (Occultism replaces Nature). Success on these rituals → critical success.',
  },
];

// ══════════════════════════════════════════════════════════
// COMBINED EXPORT
// ══════════════════════════════════════════════════════════

/** Combined non-Core archetype feats (DC batch) */
export const STANDALONE_ARCHETYPE_FEATS_NON_CORE_DC: FeatEntry[] = [
  ...CHRONOSKIMMER_FEATS,
  ...DRACONIC_ACOLYTE_FEATS,
  ...DRAKE_RIDER_FEATS,
  ...KITHARODIAN_ACTOR_FEATS,
  ...LEPIDSTADT_SURGEON_FEATS,
  ...RUNELORD_FEATS,
  ...CULTIVATOR_FEATS,
];
