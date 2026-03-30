import type { FeatEntry } from './featTypes';

/* ════════════════════════════════════════════════
   STANDALONE ARCHETYPE FEATS  — Pirate → Wrestler
   Core-category archetypes (AoN IDs 70-82, 270)
   ════════════════════════════════════════════════ */

// ──────────────────────────────────────────────
//  PIRATE  (PC2 pg. 209)
// ──────────────────────────────────────────────
export const PIRATE_FEATS: FeatEntry[] = [
  {
    id: 'pirate-dedication',
    name: 'Pirate Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 209',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in Intimidation'],
    description:
      'You gain Additional Lore for Sailing Lore. You ignore difficult terrain and uneven ground caused by unstable ground (such as the deck of a ship). You gain the Boarding Assault action.',
    mechanics:
      'Grants Sailing Lore via Additional Lore. Ignore difficult terrain / uneven ground from unstable surfaces. Boarding Assault [2 actions] (Flourish): Stride twice or attempt Acrobatics check (DC 20) to swing up to twice your Speed, then Strike. If you boarded or disembarked from a boat during this movement, Strike deals one additional weapon damage die.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'broadside-buckos',
    name: 'Broadside Buckos',
    level: 4,
    category: 'archetype',
    source: 'Firebrands, pg. 78',
    traits: ['Uncommon', 'Archetype'],
    prerequisites: ['Pirate Dedication'],
    description:
      'You train crewmates to fight in cramped quarters. During daily preparations, name up to five crewmates. If an enemy is within reach of you and at least two of your crewmates, that enemy is off-guard against you.',
    mechanics:
      'Legacy. Daily preparations: name up to 5 crewmates. Enemy within reach of you and at least 2 named crewmates is off-guard against you.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'pirate-combat-training',
    name: 'Pirate Combat Training',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 209',
    traits: ['Archetype'],
    prerequisites: ['Pirate Dedication'],
    description:
      'You gain Combat Climber or Underwater Marauder, even without prerequisites. You treat hatchet, rapier, scimitar, and whip as simple weapons for proficiency.',
    mechanics:
      'Gain Combat Climber or Underwater Marauder skill feat (ignore prereqs). Treat hatchet, rapier, scimitar, and whip as simple weapons. At 5th level, critical hits with these weapons grant their critical specialization effect. GM may add additional martial weapons to the list.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'rope-runner',
    name: 'Rope Runner',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 209',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Pirate Dedication', 'trained in Acrobatics', 'trained in Athletics'],
    description:
      'You run and climb across ropes almost as easily as on the ground. You gain a climb Speed of 15 feet on ropes. Success on Climb or Balance checks involving ropes becomes a critical success.',
    mechanics:
      'Climb Speed 15 feet (ropes and similar objects only). Auto-upgrade success → critical success on Athletics (Climb) and Acrobatics (Balance) checks involving ropes. Not off-guard while Climbing or Balancing on a rope.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'walk-the-plank',
    name: 'Walk the Plank',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 209',
    traits: ['Archetype'],
    prerequisites: ['Pirate Dedication'],
    description:
      'You frighten a foe into moving. Attempt to Demoralize; on a success, you can also force the target to Stride up to its Speed. You choose the path.',
    mechanics:
      'Demoralize an opponent. On success (in addition to normal effects): force target to Stride up to its Speed along a path you choose. Cannot force into obviously harmful spaces unless critical success. Forced movement does not trigger reactions. Target then immune to Walk the Plank for 10 minutes.',
    actionCost: 2,
    implemented: 'full',
  },
  {
    id: 'hook-em',
    name: "Hook 'Em",
    level: 10,
    category: 'archetype',
    source: 'Firebrands, pg. 80',
    traits: ['Uncommon', 'Archetype', 'Flourish'],
    prerequisites: ['Pirate Dedication'],
    description:
      'You grab a nearby rope or fire a grappling weapon and swing up to twice your Speed. If you end your movement next to an enemy, attempt Athletics to Grapple them with the rope.',
    mechanics:
      'Legacy. Requirement: A rope is within reach, or you have a rope / grappling weapon in hand. Swing up to twice your Speed. If ending movement next to an enemy, attempt Athletics to Grapple that enemy with the rope.',
    actionCost: 2,
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  POISONER  (PC2 pg. 210)
// ──────────────────────────────────────────────
export const POISONER_FEATS: FeatEntry[] = [
  {
    id: 'poisoner-dedication',
    name: 'Poisoner Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 210',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in Crafting'],
    description:
      'You gain advanced alchemy benefits. You can create four alchemical poison consumables each day. You memorize poison formulas without needing a formula book.',
    mechanics:
      'Gain advanced alchemy. Create 4 alchemical poison consumables per day during daily preparations. Memorize poison formulas (no formula book needed).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'poisoners-twist',
    name: "Poisoner's Twist",
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 210',
    traits: ['Archetype'],
    prerequisites: ['Poisoner Dedication', 'trained in Medicine'],
    description:
      'You exploit the weaknesses that poisons create. After a successful melee Strike against a poisoned target, you deal additional damage.',
    mechanics:
      "Requirement: Last action was a successful melee Strike that dealt damage against a target afflicted by a known poison. Deal 1d6 of the Strike's damage type + 1d6 poison damage. At 18th level, deal 2d6 of each type.",
    actionCost: 1,
    implemented: 'full',
  },
  {
    id: 'advanced-poisoncraft',
    name: 'Advanced Poisoncraft',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 210',
    traits: ['Archetype'],
    prerequisites: ['Poisoner Dedication'],
    description:
      'You can create up to 6 poisons per day with advanced alchemy.',
    mechanics:
      'Increase daily advanced alchemy poisons to 6. Special: At 10th level or higher, select this feat a second time to increase to 8.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'poison-coat',
    name: 'Poison Coat',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 210',
    traits: ['Archetype'],
    prerequisites: ['Poisoner Dedication'],
    description:
      'You coat your clothing with a contact or injury poison. You gain the Once Bitten reaction to expose melee attackers to the suffused poison.',
    mechanics:
      'Expend a contact or injury poison and spend 10 minutes applying it to clothing. One poison at a time. Once Bitten [reaction]: Trigger — adjacent creature hits you with melee unarmed Strike; Effect — triggering creature is exposed to the suffused poison, poison becomes inert.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'acquired-tolerance',
    name: 'Acquired Tolerance',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 210',
    traits: ['Archetype', 'Fortune'],
    prerequisites: ['Poisoner Dedication'],
    description:
      'When you fail a save against a poison, you can reroll. You can continue using this against the same poison type that day, but not a different type until your next daily preparations.',
    mechanics:
      'Trigger: You fail a save against a poison. Reroll the triggering check and use the second result. Locked to that poison type for the day — cannot use against a different poison type until after next daily preparations.',
    actionCost: 'reaction',
    implemented: 'full',
  },
  {
    id: 'chemical-contagion',
    name: 'Chemical Contagion',
    level: 18,
    category: 'archetype',
    source: 'Player Core 2, pg. 210',
    traits: ['Archetype'],
    prerequisites: ['Poisoner Dedication'],
    description:
      "Your injury poisons can spray onto creatures. You gain the toxicologist alchemist's greater field discovery.",
    mechanics:
      "Gain toxicologist's greater field discovery: injury poisons can spread to nearby creatures.",
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  RITUALIST  (PC2 pg. 211)
// ──────────────────────────────────────────────
export const RITUALIST_FEATS: FeatEntry[] = [
  {
    id: 'ritualist-dedication',
    name: 'Ritualist Dedication',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 211',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    prerequisites: ['expert in Arcana, Nature, Occultism, or Religion'],
    description:
      'You learn two uncommon rituals of 2nd rank or lower. At 8th level and every 4 levels thereafter, you learn two more rituals (max rank = half your level).',
    mechanics:
      "Learn 2 uncommon rituals of 2nd rank or lower (must meet primary caster prereqs). Can't teach or allow others as primary caster unless they know the ritual. At 8th level and every 4 levels: learn 2 more rituals (max rank = half level).",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'flexible-ritualist',
    name: 'Flexible Ritualist',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 211',
    traits: ['Archetype'],
    prerequisites: ['Ritualist Dedication'],
    description:
      'You can perform two aspects of a ritual yourself, reducing the number of secondary casters by 1.',
    mechanics:
      "When casting a ritual, reduce required secondary casters by 1. You fulfill that secondary caster's requirements and attempt their check. Cannot replace a secondary caster who is the spell's target (e.g., atone).",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'resourceful-ritualist',
    name: 'Resourceful Ritualist',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 211',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Ritualist Dedication'],
    description:
      'You can cast difficult rituals that might otherwise be just beyond your skill.',
    mechanics:
      'Attempt checks to cast a ritual requiring: expert (if trained), master (if expert), or legendary (if master) proficiency.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'efficient-rituals',
    name: 'Efficient Rituals',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 211',
    traits: ['Archetype'],
    prerequisites: ['Ritualist Dedication'],
    description:
      'You perform extensive rituals in less time. 1-day rituals take 4 hours; longer rituals take half the number of days.',
    mechanics:
      '1-day rituals: cast in 4 hours. Longer: half days (rounded up). At 14th level, rituals measured in days can be cast in an equal number of hours (split across days if over 8 hours).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'assured-ritualist',
    name: 'Assured Ritualist',
    level: 10,
    category: 'archetype',
    source: 'Player Core 2, pg. 211',
    traits: ['Archetype', 'Fortune'],
    prerequisites: ['Flexible Ritualist'],
    description:
      "As primary caster, after all secondary checks are rolled, you can improve one failure or critical failure by one degree of success.",
    mechanics:
      'As primary caster, after all secondary checks are rolled, choose one check that was a failure or critical failure and improve the result by one degree of success.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'enterprising-ritualist',
    name: 'Enterprising Ritualist',
    level: 14,
    category: 'archetype',
    source: 'Player Core 2, pg. 211',
    traits: ['Archetype'],
    prerequisites: ['Ritualist Dedication'],
    description:
      'If a ritual has a gp cost, reduce the amount by 10%. On a critical success, consumed component value is also reduced by the same amount.',
    mechanics:
      'Reduce ritual gp cost by 10%. On critical success at primary check, consumed component gp value also reduced by 10%.',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  SCOUT  (PC2 pg. 212)
// ──────────────────────────────────────────────
export const SCOUT_FEATS: FeatEntry[] = [
  {
    id: 'scout-dedication',
    name: 'Scout Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 212',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in Stealth', 'trained in Survival'],
    description:
      'You can perform the Scout exploration activity at the same time as Avoid Notice. Your Scout initiative bonus is +2 instead of +1.',
    mechanics:
      'Scout + Avoid Notice simultaneously during exploration. Scout initiative bonus = +2 (instead of normal +1).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'scouts-charge',
    name: "Scout's Charge",
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 212',
    traits: ['Archetype', 'Flourish'],
    prerequisites: ['Scout Dedication'],
    description:
      'You meander unpredictably, then ambush. Choose one enemy — Stride, Feint against that opponent (you can use Stealth instead of Deception), then Strike.',
    mechanics:
      'Choose one enemy. Stride, Feint against that enemy (can use Stealth check instead of Deception), then make a Strike against it.',
    actionCost: 2,
    implemented: 'full',
  },
  {
    id: 'terrain-scout',
    name: 'Terrain Scout',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 212',
    traits: ['Archetype'],
    prerequisites: ['Scout Dedication'],
    description:
      'You gain Terrain Stalker twice for two different terrains. Allies who Follow the Expert while you Avoid Notice also benefit from one of your Terrain Stalker feats.',
    mechanics:
      'Gain Terrain Stalker skill feat twice (different terrains). When you Avoid Notice and allies use Follow the Expert on you, choose one Terrain Stalker to share with them.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'fleeting-shadow',
    name: 'Fleeting Shadow',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 212',
    traits: ['Archetype', 'Flourish'],
    prerequisites: ['Scout Dedication'],
    description:
      'You quickly disappear and move without drawing attention. You Hide, then Sneak twice.',
    mechanics:
      'Hide, then Sneak twice. Shared feat: available to Scout and Verduran Shadow archetypes.',
    actionCost: 2,
    implemented: 'full',
  },
  {
    id: 'scouts-speed',
    name: "Scout's Speed",
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 212',
    traits: ['Archetype'],
    prerequisites: ['Scout Dedication'],
    description:
      'You gain a +10-foot status bonus to your Speed. For travel speed calculations, this increases to +20 feet.',
    mechanics:
      '+10-foot status bonus to Speed. +20-foot status bonus to Speed for travel speed calculations.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'scouts-pounce',
    name: "Scout's Pounce",
    level: 10,
    category: 'archetype',
    source: 'Player Core 2, pg. 212',
    traits: ['Archetype', 'Flourish'],
    prerequisites: ['Scout Dedication'],
    description:
      'You leap from the shadows to strike your foes. Stride up to your Speed, then make two Strikes against the same target at the same MAP.',
    mechanics:
      "Requirement: hidden or undetected by all opponents and not within 10 feet of any enemy. Stride up to your Speed + make two Strikes against the same target. Both count toward MAP but penalty doesn't increase until both attacks are made. Shared feat: available to Scout and Verduran Shadow archetypes.",
    actionCost: 2,
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  SCROLL TRICKSTER  (PC2 pg. 213)
// ──────────────────────────────────────────────
export const SCROLL_TRICKSTER_FEATS: FeatEntry[] = [
  {
    id: 'scroll-trickster-dedication',
    name: 'Scroll Trickster Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 213',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in Arcana, Nature, Occultism, or Religion'],
    description:
      "You gain Trick Magic Item and a +2 circumstance bonus to Trick scrolls. Critical failure to Trick a scroll becomes a failure instead.",
    mechanics:
      'Gain Trick Magic Item feat. +2 circumstance bonus to Trick Magic Item checks on scrolls. Critical failure on Trick Magic Item for a scroll becomes a failure.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'basic-scroll-cache',
    name: 'Basic Scroll Cache',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 213',
    traits: ['Archetype'],
    prerequisites: ['Scroll Trickster Dedication'],
    description:
      'Each day during daily preparations, you create a temporary scroll with a 1st-rank spell. At 8th level, add a 2nd-rank scroll.',
    mechanics:
      'Daily: 1 temporary scroll with a 1st-rank spell (common or accessible, trained in corresponding tradition skill). Can Learn a Spell to add options. Expires at next daily preparations. At 8th level, add a second temporary scroll with a 2nd-rank spell.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'skim-scroll',
    name: 'Skim Scroll',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 213',
    traits: ['Archetype'],
    prerequisites: ['Scroll Trickster Dedication'],
    description:
      'You activate a scroll with a cursory read as you draw it. Interact to draw a scroll, then use Trick Magic Item on it.',
    mechanics:
      'Interact to draw a scroll + Trick Magic Item on it, all as a single action.',
    actionCost: 1,
    implemented: 'full',
  },
  {
    id: 'expert-scroll-cache',
    name: 'Expert Scroll Cache',
    level: 12,
    category: 'archetype',
    source: 'Player Core 2, pg. 213',
    traits: ['Archetype'],
    prerequisites: ['Basic Scroll Cache'],
    description:
      'In addition to your Basic Scroll Cache, add a temporary scroll with a 3rd-rank spell. Additional scrolls at higher levels.',
    mechanics:
      'Add a 3rd-rank temporary scroll. At 14th level: add 4th-rank scroll. At 16th level: add 5th-rank scroll.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'master-scroll-cache',
    name: 'Master Scroll Cache',
    level: 18,
    category: 'archetype',
    source: 'Player Core 2, pg. 213',
    traits: ['Archetype'],
    prerequisites: ['Expert Scroll Cache'],
    description:
      'In addition to your Basic and Expert Scroll Caches, add a temporary scroll with a 6th-rank spell. At 20th level, add a 7th-rank scroll.',
    mechanics:
      'Add a 6th-rank temporary scroll. At 20th level: add 7th-rank scroll.',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  SCROUNGER  (PC2 pg. 214)
// ──────────────────────────────────────────────
export const SCROUNGER_FEATS: FeatEntry[] = [
  {
    id: 'scrounger-dedication',
    name: 'Scrounger Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 214',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Crafting'],
    description:
      'You can Craft without appropriate tools or a workshop. You memorize all formulas. You gain the Cobble Together exploration activity to create temporary items.',
    mechanics:
      'Craft without tools or workshop. Memorize formulas (no formula book needed). Cobble Together (exploration, 10 min): Craft a temporary item — common, non-magical, ≤ half level, must be weapon/armor/adventuring gear (or 10 ammunition). Shoddy, but one chosen creature ignores shoddy penalty. Lasts 1d4 hours (GM rolls secretly).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'reverse-engineering',
    name: 'Reverse Engineering',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 214',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Scrounger Dedication', 'expert in Crafting'],
    description:
      'You gain a +2 circumstance bonus to Crafting checks to reverse engineer formulas and can attempt it after 1 day instead of 2. On a critical success, you keep both the formula and the reassembled item.',
    mechanics:
      '+2 circumstance bonus to Crafting (reverse engineer). Setup: 1 day (instead of 2). On critical success: get both the formula and the reassembled original item (instead of formula + half-value raw materials).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'magical-scrounger',
    name: 'Magical Scrounger',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 214',
    traits: ['Archetype'],
    prerequisites: ['Magical Crafting', 'Scrounger Dedication'],
    description:
      'Once per day, you can Cobble Together a temporary magic item (common, magical, half your level or lower, held/wielded/worn).',
    mechanics:
      '1/day: Cobble Together a temporary magic item (common, magical, ≤ half level, must be held/wielded/worn). Cannot be consumable, rune, or item with runes. Removing a worn/affixed item destroys it. Must meet Craft requirements.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'expert-disassembly',
    name: 'Expert Disassembly',
    level: 7,
    category: 'archetype',
    source: 'Player Core 2, pg. 214',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Scrounger Dedication', 'master in Crafting'],
    description:
      'You can use Crafting instead of Thievery to Disable a Device or Pick a Lock.',
    mechanics:
      'Use Crafting instead of Thievery for Disable a Device and Pick a Lock.',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  SENTINEL  (PC2 pg. 215)
// ──────────────────────────────────────────────
export const SENTINEL_FEATS: FeatEntry[] = [
  {
    id: 'sentinel-dedication',
    name: 'Sentinel Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 215',
    traits: ['Archetype', 'Dedication'],
    prerequisites: [],
    description:
      'You become trained in light and medium armor. If already trained in both, you gain training in heavy armor. Class features that grant higher armor proficiency also apply to armors granted by this feat.',
    mechanics:
      'Trained in light + medium armor (or heavy if already trained in both). When a class feature grants expert+ proficiency in any armor (not unarmored defense), you also gain that proficiency in armors from this feat. If a class feature grants expert unarmored defense and you are 13th+, also become expert in these armors.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'steel-skin',
    name: 'Steel Skin',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 215',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Sentinel Dedication', 'trained in Survival'],
    description:
      "You wear your armor like a second skin. You don't become fatigued if you sleep while wearing armor.",
    mechanics:
      'No fatigue from sleeping in armor. Shared feat: available to Sentinel and Stalwart Defender archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'armor-specialist',
    name: 'Armor Specialist',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 215',
    traits: ['Archetype'],
    prerequisites: ['Sentinel Dedication'],
    description:
      'You gain the armor specialization effects for all armors you are proficient with.',
    mechanics:
      'Gain armor specialization effects for all armors in which you are proficient.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'armored-rebuff',
    name: 'Armored Rebuff',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 215',
    traits: ['Archetype'],
    prerequisites: ['Sentinel Dedication'],
    description:
      'When an adjacent enemy critically fails a melee attack against you, you attempt Athletics to Shove them.',
    mechanics:
      'Trigger: Adjacent enemy critically fails an attack roll to Strike you with a melee weapon or unarmed attack. Requirement: wearing medium armor or heavier. Attempt Athletics to Shove the enemy. Cannot Stride to follow. Shared feat: available to Sentinel and Stalwart Defender archetypes.',
    actionCost: 'reaction',
    implemented: 'full',
  },
  {
    id: 'mighty-bulwark',
    name: 'Mighty Bulwark',
    level: 10,
    category: 'archetype',
    source: 'Player Core 2, pg. 215',
    traits: ['Archetype', 'Guardian'],
    prerequisites: ['Sentinel Dedication'],
    description:
      'Your bulwark armor trait bonus increases from +3 to +4 and applies on all Reflex saves, not just damaging ones.',
    mechanics:
      'Bulwark trait bonus: +4 (from +3). Applies on ALL Reflex saves, not just damaging Reflex saves. Shared feat: available to Sentinel and Stalwart Defender archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  SHADOWDANCER  (Legacy — APG pg. 192)
// ──────────────────────────────────────────────
export const SHADOWDANCER_FEATS: FeatEntry[] = [
  {
    id: 'shadowdancer-dedication',
    name: 'Shadowdancer Dedication',
    level: 8,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['expert in Performance', 'master in Stealth'],
    description:
      'You gain greater darkvision and a +2 circumstance bonus to Stealth checks when in dim light or darkness.',
    mechanics:
      "Legacy. Gain greater darkvision. +2 circumstance bonus to Stealth checks while in dim light or darkness. Special: Can't take another dedication feat until you have gained two other feats from the shadowdancer archetype.",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'shadow-sneak-attack',
    name: 'Shadow Sneak Attack',
    level: 10,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype'],
    prerequisites: ['Shadowdancer Dedication'],
    description:
      "You gain sneak attack, dealing 1d6 precision damage regardless of your level. Not cumulative with other sneak attack sources; use only the highest.",
    mechanics:
      'Legacy. Gain sneak attack (1d6 precision damage, does not scale). Use only the highest sneak attack dice if you have multiple sources.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'shadow-magic',
    name: 'Shadow Magic',
    level: 10,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype'],
    prerequisites: ['Shadowdancer Dedication'],
    description:
      'You learn a shadowdancer focus spell (dance of darkness or shadow jump). You gain a focus pool of 1 Focus Point if you don\'t have one.',
    mechanics:
      'Legacy. Learn dance of darkness or shadow jump focus spell. Gain 1 Focus Point (if needed). Refocus: meditate in dim light or darkness. Occult tradition, Charisma-based. Become trained in occult spell attack rolls and DCs. Shared feat: available to Shadowdancer and Shadowcaster archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'additional-shadow-magic',
    name: 'Additional Shadow Magic',
    level: 12,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype'],
    prerequisites: ['Shadow Magic'],
    description:
      "Choose the other shadowdancer focus spell you didn't select from Shadow Magic. +1 Focus Point.",
    mechanics:
      'Legacy. Learn the other shadowdancer focus spell (dance of darkness or shadow jump). +1 Focus Point. Shared feat: available to Shadowdancer and Shadowcaster archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'shadow-illusion',
    name: 'Shadow Illusion',
    level: 12,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype'],
    prerequisites: ['Shadow Magic'],
    description:
      'You shape shadows into illusory forms. You gain the shadow illusion focus spell. +1 Focus Point. You become an expert in occult spell attacks and DCs.',
    mechanics:
      'Legacy. Learn shadow illusion focus spell. +1 Focus Point. Expert in occult spell attack rolls and DCs. Shared feat: available to Shadowdancer and Shadowcaster archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'shadow-power',
    name: 'Shadow Power',
    level: 14,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype'],
    prerequisites: ['Shadow Magic'],
    description:
      'You can cast shadow blast as an innate occult spell once per day at a rank 1 lower than your shadowdancer focus spells.',
    mechanics:
      'Legacy. Cast shadow blast 1/day as innate occult spell. Rank = your shadowdancer focus spell rank − 1. Expert in occult spell attack rolls and DCs. Shared feat: available to Shadowdancer and Shadowcaster archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'shadow-master',
    name: 'Shadow Master',
    level: 18,
    category: 'archetype',
    source: "Advanced Player's Guide, pg. 192",
    traits: ['Archetype'],
    prerequisites: ['Shadowdancer Dedication'],
    description:
      'In dim light or darkness, you gain resistance 5 to all damage except force and ghost touch Strikes. You also roll Reflex saves twice in dim light or darkness.',
    mechanics:
      'Legacy. While in dim light or darkness: resistance 5 to all damage except force damage and Strikes with the ghost touch property rune. Reflex saves in dim light or darkness: roll twice, take higher result (fortune effect).',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  SNARECRAFTER  (PC2 pg. 216)
// ──────────────────────────────────────────────
export const SNARECRAFTER_FEATS: FeatEntry[] = [
  {
    id: 'snarecrafter-dedication',
    name: 'Snarecrafter Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 216',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in Crafting'],
    description:
      "You gain Snare Crafting. Snare DCs use the higher of your class DC or the snare's DC. 1-minute snares can be Crafted with 3 Interact actions. You prepare four snares daily for free quick deployment.",
    mechanics:
      'Gain Snare Crafting feat. Snare save DC = higher of class DC or snare DC. 1-minute snares: Craft with 3 Interact actions. Daily prep: prepare 4 quick-deploy snares for free (6 at master Crafting, 8 at legendary). Each Crafting proficiency increase (expert/master/legendary): +3 snare formulas (≤ your level). Special: Rangers can use Survival instead of Crafting for all prereqs and functions.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'surprise-snare',
    name: 'Surprise Snare',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 216',
    traits: ['Archetype', 'Manipulate'],
    prerequisites: ['Snarecrafter Dedication'],
    description:
      'You install one prepared snare in a space occupied by an enemy. It must normally take 1 minute or less to Craft. The snare automatically triggers.',
    mechanics:
      'Install 1 prepared quick-deploy snare in an enemy-occupied space. Must normally take ≤ 1 minute to Craft. Snare triggers automatically.',
    actionCost: 3,
    implemented: 'full',
  },
  {
    id: 'remote-trigger',
    name: 'Remote Trigger',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 216',
    traits: ['Archetype'],
    prerequisites: ['Snarecrafter Dedication'],
    description:
      'You can Strike a snare to trigger it prematurely. You automatically hit snares you crafted; for others, attempt a ranged Strike against the Crafting DC.',
    mechanics:
      'Strike a snare to trigger it. Own snares: automatic hit. Others: ranged Strike vs Crafting DC, triggers only on a hit.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'giant-snare',
    name: 'Giant Snare',
    level: 10,
    category: 'archetype',
    source: 'Player Core 2, pg. 216',
    traits: ['Archetype'],
    prerequisites: ['Snarecrafter Dedication'],
    description:
      'You can create bigger snares. A giant snare takes up a 10-by-10-foot area but costs two quick-deploy snares. Effects apply over the full area.',
    mechanics:
      'When preparing snares for quick deployment, some can be giant snares: 10×10-foot area, costs 2 quick-deploy snares. Can trigger from any creature entering the area. All effects apply over the full area.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'lightning-snares',
    name: 'Lightning Snares',
    level: 12,
    category: 'archetype',
    source: 'Player Core 2, pg. 216',
    traits: ['Archetype'],
    prerequisites: ['Snarecrafter Dedication', 'master in Crafting'],
    description:
      'Snares that normally take 1 minute to Craft can be Crafted using a single Interact action instead.',
    mechanics:
      '1-minute snares: Craft with a single Interact action.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'plentiful-snares',
    name: 'Plentiful Snares',
    level: 12,
    category: 'archetype',
    source: 'Player Core 2, pg. 216',
    traits: ['Archetype'],
    prerequisites: ['Snarecrafter Dedication'],
    description:
      'Double the number of prepared snares granted by Snarecrafter Dedication.',
    mechanics:
      'Double daily quick-deploy snares from Snarecrafter Dedication.',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  TALISMAN DABBLER  (PC2 pg. 217)
// ──────────────────────────────────────────────
export const TALISMAN_DABBLER_FEATS: FeatEntry[] = [
  {
    id: 'talisman-dabbler-dedication',
    name: 'Talisman Dabbler Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 217',
    traits: ['Archetype', 'Dedication'],
    prerequisites: [],
    description:
      'You know all common talisman formulas of your level or lower and memorize them. Each day, you make two temporary talismans (item level ≤ half your level). You can affix or remove up to four talismans in 10 minutes.',
    mechanics:
      'Know all common talisman formulas ≤ your level (memorized, no formula book). Daily prep: make 2 temporary talismans (item level ≤ half level, must know formula). Expire at next daily prep. Save DC = highest of class DC / spell DC / talisman DC. Affix a Talisman: affix or remove up to 4 talismans in 10 minutes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'quick-fix',
    name: 'Quick Fix',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 217',
    traits: ['Archetype'],
    prerequisites: ['Talisman Dabbler Dedication'],
    description:
      'You gain Rapid Affixture (ignore prereqs). You can affix or remove up to four talismans in 1 minute. You gain the 3-action Affix a Talisman at 12th level.',
    mechanics:
      'Gain Rapid Affixture skill feat (ignore prereqs). Affix/remove up to 4 talismans in 1 minute (instead of 1). Gain 3-action Affix a Talisman at 12th level regardless of Crafting proficiency.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'deeper-dabbler',
    name: 'Deeper Dabbler',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 217',
    traits: ['Archetype'],
    prerequisites: ['Talisman Dabbler Dedication'],
    description:
      'You create two additional talismans during daily preparations.',
    mechanics:
      '+2 daily temporary talismans. Special: At 14th level or higher, select a second time for another +2.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'talismanic-sage',
    name: 'Talismanic Sage',
    level: 14,
    category: 'archetype',
    source: 'Player Core 2, pg. 217',
    traits: ['Archetype'],
    prerequisites: ['Talisman Dabbler Dedication'],
    description:
      'When you Affix a Talisman, you can treat one item to hold two active talismans at once instead of one. This ends if you treat a new item.',
    mechanics:
      'One item can hold 2 active talismans (normally multiple talismans on one item are suppressed). Special treatment ends if you treat a new item for this ability.',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  VIGILANTE  (PC2 pg. 218)
// ──────────────────────────────────────────────
export const VIGILANTE_FEATS: FeatEntry[] = [
  {
    id: 'vigilante-dedication',
    name: 'Vigilante Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 218',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    prerequisites: ['trained in Deception'],
    description:
      'You have two identities: a social identity and a vigilante identity. Changing takes 1 minute out of sight. Detection effects target only your current identity. Perception to uncover your identity uses your Deception DC (20 + proficiency modifier).',
    mechanics:
      "Two identities (social + vigilante). Change: 1 minute, out of sight. Seek to uncover identity: Perception vs Deception DC (20 + proficiency modifier). Recall Knowledge about one identity doesn't reveal the other. Detection effects target only current identity. Class/vigilante feats are associated with vigilante identity — using them socially risks exposure. If exposed, lose disguise benefits; 1 week downtime for new social identity. Also grants access to Gray Gardener archetype.",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'hidden-magic',
    name: 'Hidden Magic',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Vigilante Dedication', 'expert in Arcana, Nature, Occultism, or Religion'],
    description:
      'During daily preparations, you can make your magic items appear non-magical. Detect magic or read aura requires a Perception check against your Deception DC.',
    mechanics:
      'During daily preparations: adjust any/all magic items to appear non-magical (lasts until next prep). Detect magic / read aura: caster must succeed Perception check vs your Deception DC.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'minion-guise',
    name: 'Minion Guise',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Vigilante Dedication', 'expert in Deception', 'animal companion or familiar'],
    description:
      "When you change to your social identity, you also change your minion's appearance to a socially acceptable creature of its type.",
    mechanics:
      "Change minion (companion, familiar, pet from class feature) appearance when switching to social identity (wolf → large dog, familiar → exotic pet, etc.). Using unusual class-granted abilities with minion in social identity risks exposing vigilante identity.",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'safe-house',
    name: 'Safe House',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype'],
    prerequisites: ['Vigilante Dedication'],
    description:
      'You establish a safe house that protects objects and people inside from magical detection, with the effects of veil of privacy.',
    mechanics:
      'Safe house: ~two 10-foot cubes, accessible location. Veil of privacy effect (counteract DC = Deception modifier, counteract rank = half level rounded up). Setup/move: 1 week downtime. Size: 4 cubes (expert Deception), 8 cubes (master), 16 cubes (legendary).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'social-purview',
    name: 'Social Purview',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Vigilante Dedication'],
    description:
      "Choose one archetype you meet the prerequisites for. You gain that archetype's dedication feat as part of your social identity.",
    mechanics:
      "Gain another archetype's dedication feat (must meet prereqs). Can select feats from that archetype without meeting vigilante archetype feat count requirement. These feats are part of social identity — using them socially doesn't risk exposure, but using them as vigilante could.",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'startling-appearance',
    name: 'Startling Appearance',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Emotion', 'Fear', 'Mental', 'Vigilante'],
    prerequisites: ['Vigilante Dedication'],
    description:
      'You make a Strike against a target unaware of your presence. The target is off-guard and becomes frightened.',
    mechanics:
      'Requirement: You are unnoticed by or hidden from the target. Strike the target. Target is off-guard for the rest of your turn and is frightened 1 (frightened 2 on a critical hit).',
    actionCost: 1,
    implemented: 'full',
  },
  {
    id: 'quick-change',
    name: 'Quick Change',
    level: 7,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype'],
    prerequisites: ['Vigilante Dedication', 'master in Deception'],
    description:
      'Change identity as a 3-action activity instead of 1 minute. Legendary Deception: single action.',
    mechanics:
      'Change identity: 3-action activity (instead of 1 minute). Legendary in Deception: single action. Shared feat: available to Vigilante and Venture-Gossip archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'subjective-truth',
    name: 'Subjective Truth',
    level: 7,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Skill'],
    prerequisites: ['Vigilante Dedication', 'master in Deception'],
    description:
      'Your disparate identities defeat lie-detecting magic. Statements true from your current identity\'s perspective can deceive effects like ring of truth.',
    mechanics:
      'Statements true from the perspective of your current identity defeat lie-detecting effects (e.g., ring of truth). Shared feat: available to Vigilante and Venture-Gossip archetypes.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'many-guises',
    name: 'Many Guises',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype'],
    prerequisites: ['Vigilante Dedication', 'master in Deception'],
    description:
      'You can take on any number of mundane guises — becoming a nondescript ordinary person instead of either of your real identities.',
    mechanics:
      'When changing identity, can become a nondescript member of your ancestry (any gender, mundane occupation) instead of social or vigilante identity. Detection effects treat you as this ordinary identity. Counteract check vs Deception DC to penetrate. Using class or dedication abilities ends the disguise.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'reminder-of-the-greater-fear',
    name: 'Reminder of the Greater Fear',
    level: 8,
    category: 'archetype',
    source: 'Night of the Gray Death, pg. 65',
    traits: ['Archetype', 'Vigilante'],
    prerequisites: ['master in Intimidation', 'Vigilante Dedication'],
    description:
      'You give a stern glower to remind an ally that your presence is more fearsome. Reduce the frightened value another creature would gain by 1.',
    mechanics:
      'Legacy. Trigger: Another creature within 30 feet that can see you would gain the frightened condition. Reduce the value of frightened that creature would gain by 1.',
    actionCost: 'reaction',
    implemented: 'full',
  },
  {
    id: 'frightening-appearance',
    name: 'Frightening Appearance',
    level: 12,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Vigilante'],
    prerequisites: ['Startling Appearance', 'expert in Intimidation'],
    description:
      'When you use Startling Appearance, you can also Demoralize each enemy in a 10-foot emanation that you were unnoticed by before your Strike.',
    mechanics:
      'When using Startling Appearance, also attempt to Demoralize each enemy within 10-foot emanation that you were unnoticed by before the Strike.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'stunning-appearance',
    name: 'Stunning Appearance',
    level: 16,
    category: 'archetype',
    source: 'Player Core 2, pg. 219',
    traits: ['Archetype', 'Vigilante'],
    prerequisites: ['Startling Appearance'],
    description:
      'When you use Startling Appearance and hit an enemy of your level or lower, they are stunned.',
    mechanics:
      'When Startling Appearance Strike hits an enemy of your level or lower: stunned 1 (stunned 2 on critical hit).',
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  VIKING  (PC2 pg. 220)
// ──────────────────────────────────────────────
export const VIKING_FEATS: FeatEntry[] = [
  {
    id: 'viking-dedication',
    name: 'Viking Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 220',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in Athletics'],
    description:
      'You gain Sailing Lore and Warfare Lore. You ignore difficult terrain from shallow water. Success on Athletics checks to Swim becomes a critical success.',
    mechanics:
      'Gain Sailing Lore + Warfare Lore via Additional Lore. Ignore difficult terrain from shallow water when using land Speed. Auto-upgrade success → critical success on Athletics checks to Swim.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'hurling-charge',
    name: 'Hurling Charge',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 220',
    traits: ['Archetype'],
    prerequisites: ['Viking Dedication'],
    description:
      "You make a ranged Strike with your thrown weapon, Stride, and Interact to draw another weapon. The Interact doesn't trigger reactions.",
    mechanics:
      "Requirement: wielding a thrown weapon. Ranged Strike + Stride + Interact to draw another weapon (Interact doesn't trigger reactions). Special: If raging and ending Stride adjacent to an enemy, that enemy is off-guard against your next Strike with the drawn weapon before end of next turn.",
    actionCost: 2,
    implemented: 'full',
  },
  {
    id: 'viking-weapon-familiarity',
    name: 'Viking Weapon Familiarity',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 220',
    traits: ['Archetype'],
    prerequisites: ['Viking Dedication'],
    description:
      'You gain Shield Block. You treat battle axe, hatchet, longsword, shield boss, shield spikes, and shortsword as simple weapons for proficiency.',
    mechanics:
      'Gain Shield Block reaction. Treat battle axe, hatchet, longsword, shield boss, shield spikes, and shortsword as simple weapons. At 5th level, critical hits with these weapons grant their critical specialization effect.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'second-shield',
    name: 'Second Shield',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 220',
    traits: ['Archetype'],
    prerequisites: ['Viking Dedication'],
    description:
      'When your Shield Block breaks your shield, you immediately draw a backup shield or grab a nearby object as an improvised shield.',
    mechanics:
      "Trigger: Your Shield Block causes your shield to break or be destroyed. Interact to draw a shield on your person or unattended shield within reach. Can also grab a suitable nearby object as an improvised shield (GM determines). New shield isn't raised until you use Raise a Shield.",
    actionCost: 'free',
    implemented: 'full',
  },
  {
    id: 'into-the-fray',
    name: 'Into the Fray',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 220',
    traits: ['Archetype'],
    prerequisites: ['Viking Dedication'],
    description:
      'You charge into battle. Leap, Stride, or Swim, making two melee Strikes during the movement — one with your weapon and one with your shield.',
    mechanics:
      "Requirement: wielding one-handed melee weapon + shield. Leap, Stride, or Swim. During movement, make 2 melee Strikes: one with your weapon, one with shield/boss/spikes. Must target different enemies. Both count toward MAP but penalty doesn't increase until both are made.",
    actionCost: 2,
    implemented: 'full',
  },
  {
    id: 'viking-vindicator',
    name: 'Viking Vindicator',
    level: 8,
    category: 'archetype',
    source: 'Knights of Lastwall, pg. 81',
    traits: ['Uncommon', 'Archetype'],
    prerequisites: ['Viking Dedication'],
    description:
      "You gain Sudden Charge (as a viking feat). When using Sudden Charge in shallow water, the target is off-guard. You can add bastard sword and rapier to Viking Weapon Familiarity/Specialist.",
    mechanics:
      "Legacy. Gain Sudden Charge (fighter feat, becomes viking feat). Doesn't count toward Viking Dedication special requirement. Sudden Charge in shallow water: target is off-guard. If you have Viking Weapon Familiarity or Viking Weapon Specialist, add bastard sword and rapier to their weapon lists.",
    actionCost: 'passive',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  WEAPON IMPROVISER  (PC2 pg. 221)
// ──────────────────────────────────────────────
export const WEAPON_IMPROVISER_FEATS: FeatEntry[] = [
  {
    id: 'weapon-improviser-dedication',
    name: 'Weapon Improviser Dedication',
    level: 2,
    category: 'archetype',
    source: 'Player Core 2, pg. 221',
    traits: ['Archetype', 'Dedication'],
    prerequisites: ['trained in martial weapons'],
    description:
      "You don't take the –2 penalty to attack rolls with improvised weapons. Your improvised weapons have a minimum damage die of 1d6 (1d4 if agile).",
    mechanics:
      'No –2 penalty on improvised weapon attack rolls. Minimum improvised weapon damage die: 1d6 (1d4 if agile).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'improvised-pummel',
    name: 'Improvised Pummel',
    level: 4,
    category: 'archetype',
    source: 'Player Core 2, pg. 221',
    traits: ['Archetype'],
    prerequisites: ['Weapon Improviser Dedication'],
    description:
      'When you Strike with an improvised weapon, you gain a +1 item bonus and can have the Strike deal two weapon damage dice. On a critical hit, the weapon breaks.',
    mechanics:
      '+1 item bonus to improvised weapon attack rolls (+2 at 12th level). Can have Strike deal 2 weapon damage dice (3 at 16th level). On critical hit, improvised weapon breaks (unless Hardness > level, artifact, or cursed — then normal hit instead). Can opt out of Improvised Pummel effects. Handwraps of mighty blows: use higher item bonus and their damage dice (with property runes if applicable).',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'surprise-strike',
    name: 'Surprise Strike',
    level: 6,
    category: 'archetype',
    source: 'Player Core 2, pg. 221',
    traits: ['Archetype'],
    prerequisites: ['Weapon Improviser Dedication'],
    description:
      "A creature that hasn't observed you using improvised weapons or is ignorant of your skill is off-guard against your improvised weapon Strike.",
    mechanics:
      "When Striking with an improvised weapon against a creature that hasn't observed you making an improvised weapon Strike, or is otherwise ignorant of your skill, the creature is off-guard against that Strike.",
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'improvised-critical',
    name: 'Improvised Critical',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 221',
    traits: ['Archetype'],
    prerequisites: ['Weapon Improviser Dedication'],
    description:
      'You can apply critical specialization effects to improvised weapons you wield. The GM determines which effect is most applicable.',
    mechanics:
      'Improvised weapons gain critical specialization effects. GM determines which effect applies based on object type.',
    actionCost: 'passive',
    implemented: 'full',
  },
  {
    id: 'makeshift-strike',
    name: 'Makeshift Strike',
    level: 8,
    category: 'archetype',
    source: 'Player Core 2, pg. 221',
    traits: ['Archetype'],
    prerequisites: ['Weapon Improviser Dedication'],
    description:
      'You quickly snatch up a nearby object and attack. Interact to pick up an unattended object in reach, then Strike with it as an improvised weapon.',
    mechanics:
      'Interact to pick up an unattended object in reach, then Strike with it as an improvised weapon.',
    actionCost: 1,
    implemented: 'full',
  },
  {
    id: 'shattering-strike-weapon-improviser',
    name: 'Shattering Strike',
    level: 10,
    category: 'archetype',
    source: 'Player Core 2, pg. 221',
    traits: ['Archetype'],
    prerequisites: ['Improvised Pummel'],
    description:
      'When your Improvised Pummel critical success breaks your weapon, the shattering deals additional piercing damage.',
    mechanics:
      'Trigger: An improvised weapon you wield becomes broken from an Improvised Pummel critical success. Deal an additional 3d6 piercing damage to the creature (does not double from the critical hit).',
    actionCost: 'reaction',
    implemented: 'full',
  },
];

// ──────────────────────────────────────────────
//  WRESTLER  (PC2 pg. 222)
// ──────────────────────────────────────────────

export const WRESTLER_FEATS: FeatEntry[] = [
  {
    id: 'wrestler-dedication',
    name: 'Wrestler Dedication',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'Your training in the wrestling arts has made you particularly adept at moving, striking, and grappling while unencumbered. You become an expert in Athletics and gain the Titan Wrestler skill feat. You don\'t take the \u20132 circumstance penalty for making a lethal attack with your nonlethal unarmed attacks. In addition, you gain a +2 circumstance bonus to your Fortitude DC when resisting an opponent\'s attempts to Grapple you or Swallow you Whole.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Athletics'],
    mechanics: 'Grants expert in Athletics + Titan Wrestler feat. No \u20132 penalty for lethal unarmed attacks (normally nonlethal). +2 circumstance bonus to Fortitude DC vs Grapple/Swallow Whole. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'wrestler-disengaging-twist',
    name: 'Disengaging Twist',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your ability to twist your opponents\' bodies into painful locks and holds makes you particularly adept at escaping such predicaments. Attempt an Athletics check to Escape the triggering condition. You gain a +2 circumstance bonus to this check.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Trigger: A creature gives you the grabbed or restrained condition. Attempt Athletics to Escape with +2 circumstance bonus.',
  },
  {
    id: 'wrestler-elbow-breaker',
    name: 'Elbow Breaker',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You bend your opponent\'s body or limbs into agonizing positions that make it difficult for them to maintain their grip. Make an unarmed melee Strike against the creature you have grabbed or restrained. Critical Success: You knock one held item out of the creature\'s grasp; it falls to the ground in the creature\'s space. Success: You weaken the target\'s grasp \u2014 further Disarm attempts gain +2, and the target takes \u20132 to attacks/checks with that item until it Interacts to change grip.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Requires: creature grabbed/restrained. Unarmed melee Strike. Crit success: knock one held item to ground. Success: +2 to further Disarm of that item, target \u20132 to attacks/checks with it until they Interact to fix grip.',
  },
  {
    id: 'wrestler-suplex',
    name: 'Suplex',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Flexing your entire body, you heave your opponent over your head and slam them into the ground. Make an unarmed melee Strike against the creature you have grabbed or restrained. On a success, the target lands prone, and on a critical success, the target lands prone and takes an additional 2d6 bludgeoning damage. Regardless of whether the Strike is successful, you immediately release your hold on the target.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Requires: creature grabbed/restrained. Unarmed melee Strike. Success: target falls prone. Crit success: prone + 2d6 bludgeoning. Always releases the grab afterward.',
  },
  {
    id: 'wrestler-clinch-strike',
    name: 'Clinch Strike',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your opponents can\'t slip your grasp without punishment. Make an unarmed melee Strike against the triggering creature.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Trigger: A creature you had grabbed or restrained successfully Escapes. Make an unarmed melee Strike against that creature.',
  },
  {
    id: 'wrestler-running-tackle',
    name: 'Running Tackle',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You charge, throwing your body at your foe in a vicious tackle. Stride twice or make a High Jump or Long Jump, then attempt to Grapple or Trip a creature within your reach. You can use this ability against a creature at any point during your movement or jump, but you can\'t travel any farther on the jump after you do.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Stride twice (or High Jump/Long Jump), then Grapple or Trip a creature within reach. May target creature at any point during movement/jump, but movement stops after the attempt.',
  },
  {
    id: 'wrestler-strangle',
    name: 'Strangle',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You squeeze the breath out of your foe. Make an unarmed melee Strike against the creature you have grabbed or restrained. On a success, you gain a circumstance bonus to damage equal to the number of weapon damage dice, and the target can barely speak until the start of your next turn or until it Escapes. While it can barely speak, the target can\'t vocalize above a hoarse whisper, and it must succeed at a DC 10 flat check or lose any action that requires speech. For an action requiring speech that is also a manipulate action, like Casting a Spell with the concentrate and manipulate trait, the target just rolls a single DC 10 flat check.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Requires: creature grabbed/restrained. Unarmed melee Strike. Success: +[weapon dice] circumstance bonus to damage. Target can barely speak (hoarse whisper, DC 10 flat check to use speech actions) until start of your next turn or Escape. Concentrate+manipulate spells: single DC 10 flat check (not stacked with grab\'s DC 5).',
  },
  {
    id: 'wrestler-submission-hold',
    name: 'Submission Hold',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your iron grip saps your opponent\'s strength. Attempt an Athletics check to Grapple the creature you have grabbed or restrained, with the following additional effects if you succeed. Critical Success: The target is enfeebled 2 until the end of its next turn and then is enfeebled 1 for 1 minute. Success: The target is enfeebled 1 until the end of its next turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Requires: creature grabbed/restrained. Athletics to Grapple with added effects. Crit success: enfeebled 2 until end of target\'s next turn, then enfeebled 1 for 1 min. Success: enfeebled 1 until end of target\'s next turn.',
  },
  {
    id: 'wrestler-aerial-piledriver',
    name: 'Aerial Piledriver',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'Heaving both yourself and your opponent into the air, you bring them crashing to the ground. Make an unarmed melee Strike against the creature you have grabbed or restrained. This Strike deals 1d6 additional damage per weapon damage die. Success: The target lands prone. Failure: You lose your grip on the target, and it is no longer grabbed or restrained by you. Critical Failure: You lose both your grip on the target and your balance. You fall prone, and the target is no longer grabbed or restrained.',
    implemented: 'full',
    traits: ['Archetype', 'Attack'],
    actionCost: 2,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Requires: creature grabbed/restrained. Unarmed melee Strike with +1d6 per weapon die. Success: target prone. Failure: target released. Crit failure: you fall prone + target released.',
  },
  {
    id: 'wrestler-spinebreaker',
    name: 'Spinebreaker',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You squeeze your opponent in a vicious bear hug, putting intense pressure on their nerves, joints, or other pain points. Attempt an Athletics check to Grapple a creature you have grabbed or restrained, with the following additional effects if you succeed. Critical Success: The target is clumsy 2 until the end of its next turn and then is clumsy 1 for 1 minute. Success: The target is clumsy 1 until the end of its next turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Requires: creature grabbed/restrained. Athletics to Grapple with added effects. Crit success: clumsy 2 until end of target\'s next turn, then clumsy 1 for 1 min. Success: clumsy 1 until end of target\'s next turn.',
  },
  {
    id: 'wrestler-inescapable-grasp',
    name: 'Inescapable Grasp',
    source: 'Wrestler (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your grasp has a supernatural quality to it, preventing your foes from easily escaping\u2014with or without magical assistance. If a creature you have grabbed attempts to use a teleportation spell or effect, it must succeed at a DC 15 flat check or the spell fails. If a creature you have grabbed attempts to Escape while under the effect of unfettered movement or a similar effect, it must succeed at a DC 15 flat check or be forced to roll the Escape attempt normally, rather than automatically succeeding.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Wrestler Dedication'],
    mechanics: 'Grabbed creatures: teleportation requires DC 15 flat check or fails. Escape under freedom of movement/similar requires DC 15 flat check or must roll normally instead of auto-succeeding.',
  },
];

/* ════════════════════════════════════════════════
   COMBINED CATALOG  (Pirate → Wrestler)
   ════════════════════════════════════════════════ */
export const STANDALONE_ARCHETYPE_FEATS_PW: FeatEntry[] = [
  ...PIRATE_FEATS,
  ...POISONER_FEATS,
  ...RITUALIST_FEATS,
  ...SCOUT_FEATS,
  ...SCROLL_TRICKSTER_FEATS,
  ...SCROUNGER_FEATS,
  ...SENTINEL_FEATS,
  ...SHADOWDANCER_FEATS,
  ...SNARECRAFTER_FEATS,
  ...TALISMAN_DABBLER_FEATS,
  ...VIGILANTE_FEATS,
  ...VIKING_FEATS,
  ...WEAPON_IMPROVISER_FEATS,
  ...WRESTLER_FEATS,
];
