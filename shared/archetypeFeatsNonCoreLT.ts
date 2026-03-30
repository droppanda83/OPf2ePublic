import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// NON-CORE ARCHETYPE FEATS — L through T
// Living Vessel, Mind Smith, Pactbinder, Sleepwalker, Time Mage
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// LIVING VESSEL  (Dark Archives Remastered pg. 140)
// Category: Mystical / Core — Rare
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=259
// ──────────────────────────────────────────────────────────

export const LIVING_VESSEL_FEATS: FeatEntry[] = [
  {
    id: 'living-vessel-dedication',
    name: 'Living Vessel Dedication',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'Whether willingly or not, you\'ve become a vessel for a being of unimaginable power. You need to spend at least an hour each day assuaging the entity or take a -1 penalty to Will saves for 24 hours. After a full week of failure, you become doomed 1 until you let the entity take full possession for 24 hours. You also gain Entity\'s Resurgence: when you would be reduced to 0 HP, you remain at 1 HP and gain temporary HP equal to your level + key attribute modifier for 1 minute. The entity takes control for 1 minute with a +1 status bonus to attack and damage rolls.',
    implemented: 'full',
    traits: ['Rare', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: [],
    mechanics:
      'Daily 1-hour assuagement or -1 Will saves (24 hr). Week neglect → doomed 1. Entity\'s Resurgence [reaction]: trigger: reduced to 0 HP. Stay at 1 HP + temp HP (level + key attr mod, 1 min). Entity controls for 1 min with +1 status to attacks/damage. GM typically controls character. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'living-vessel-entitys-strike',
    name: 'Entity\'s Strike',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'The entity within you refuses to be contained, warping your body to channel its energy. You gain an unarmed attack with its type determined by your entity. It deals 1d6 damage of an appropriate damage type. This unarmed attack is in the brawling weapon group and has the agile, finesse, and magical traits.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Living Vessel Dedication'],
    mechanics:
      'Gain 1d6 unarmed attack (type varies by entity: horns, claw, tentacle, etc.). Brawling group, agile, finesse, magical traits.',
  },
  {
    id: 'living-vessel-tap-vitality',
    name: 'Tap Vitality',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You tap into the entity\'s life force to heal your wounds, though at the cost of the entity\'s personality bleeding into your own. You recover a number of Hit Points equal to four times your level. Each time you use this, the entity\'s personality bleeds further until your next assuagement session.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Healing', 'Vitality'],
    actionCost: 2,
    prerequisites: ['Living Vessel Dedication'],
    mechanics:
      'Freq: 1/hour. Heal 4 × level HP. Personality bleed side effect (narrative). Has tradition trait based on entity type (divine for demon, occult for aberration/outer, primal for fey).',
  },
  {
    id: 'living-vessel-exude-demonic-corruption',
    name: 'Exude Demonic Corruption',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You expel some of the corruption within you to poison others. Until the beginning of your next turn, your melee Strikes deal an additional 1d6 poison damage, and each time a creature hits you with a melee unarmed attack or otherwise touches you, it takes 1d6 poison damage. At 14th level the poison damage increases to 2d6, and at 20th level to 3d6.',
    implemented: 'full',
    traits: ['Archetype', 'Manipulate', 'Poison'],
    actionCost: 2,
    prerequisites: ['Living Vessel Dedication', 'Your entity is a demon'],
    mechanics:
      'Until start of next turn: melee Strikes deal +1d6 poison; creatures that touch/unarmed-attack you take 1d6 poison. Scales: 2d6 (14th), 3d6 (20th).',
  },
  {
    id: 'living-vessel-feys-trickery',
    name: 'Fey\'s Trickery',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You connect with the fey trickster within yourself to momentarily vanish from sight. This has the effects of invisibility.',
    implemented: 'full',
    traits: ['Archetype', 'Illusion', 'Primal', 'Subtle'],
    actionCost: 2,
    prerequisites: ['Living Vessel Dedication', 'Your entity is a fey'],
    mechanics: 'Freq: 1/hour. Cast invisibility on self.',
  },
  {
    id: 'living-vessel-warped-constriction',
    name: 'Warped Constriction',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'Tendrils and tentacles unfurl from your body to crush your foe and pollute it with alien wrongness. Your grabbed or restrained foe takes bludgeoning damage equal to your level and mental damage equal to your highest mental attribute modifier. The creature attempts a basic Will save using the higher of your class DC or spell DC.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Living Vessel Dedication', 'Your entity is an aberration or outer entity'],
    mechanics:
      'Req: Grabbed or restrained enemy. Bludgeoning damage = level + mental damage = highest mental attr mod. Basic Will save (higher of class DC/spell DC).',
  },
  {
    id: 'living-vessel-vessels-form',
    name: 'Vessel\'s Form',
    source: 'Living Vessel (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'You symbiotically combine your form with that of the entity, taking a powerful hybrid form for 1 minute. If Medium or smaller, you become Large with 10-foot reach. You gain a +2 status bonus to attack and damage rolls, +1 status bonus on saves vs spells. Entity\'s Strike damage die increases to 1d8. You gain 40 temporary Hit Points and a fly Speed equal to your Speed.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Polymorph'],
    actionCost: 2,
    prerequisites: ['Living Vessel Dedication'],
    mechanics:
      'Freq: 1/day. 1 min: Large (10 ft reach), +2 status attack/damage, +1 status vs spells, Entity\'s Strike → 1d8, 40 temp HP, fly Speed = Speed. +3 status attack/damage while overlapping with Entity\'s Resurgence. Tradition trait based on entity type.',
  },
];

// ──────────────────────────────────────────────────────────
// MIND SMITH  (Dark Archives Remastered pg. 204)
// Category: Mystical / Core
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=351
// ──────────────────────────────────────────────────────────

export const MIND_SMITH_FEATS: FeatEntry[] = [
  {
    id: 'mind-smith-dedication',
    name: 'Mind Smith Dedication',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You gain a martial melee mind weapon. Choose one stat line: one-handed 1d4 (agile, finesse); one-handed 1d6 (finesse); one-handed 1d8; or two-handed 1d10 (reach). Each day during preparations, choose bludgeoning (club group), piercing (spear group), or slashing (sword group). Only you can wield it; if held by another it disappears. If disarmed, it dematerializes but can be redrawn. You also gain a mind smith\'s keepsake (light Bulk item) that holds weapon runes for your mind weapon.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: [],
    mechanics:
      'Mind weapon: martial melee, 4 stat-line options. Daily damage type/group choice. Personal only (vanishes if not held by you). Keepsake holds runes that apply to mind weapon. If keepsake lost, 1 week downtime to imprint new one (no rune transfer). Dedication-lock enforced by validateDedicationTaking().',
    subChoices: { label: 'Choose mind weapon stat line', options: [
      { id: 'one-hand-d6', name: 'One-hand d6', description: '1d6, versatile (choose type)' },
      { id: 'one-hand-d4', name: 'One-hand d4 agile/finesse', description: '1d4, agile, finesse' },
      { id: 'two-hand-d10', name: 'Two-hand d10', description: '1d10, two-hand' },
      { id: 'two-hand-d8', name: 'Two-hand d8 reach', description: '1d8, reach' },
    ] },
  },
  {
    id: 'mind-smith-malleable-movement',
    name: 'Malleable Movement',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'You shift the shape of your weapon to help you Leap farther and faster. You shift your weapon into a long flexible pole, climbing hook, or similar aid, adding an extra 5 feet to the distance you\'re able to Leap. As normal, this can\'t increase the distance beyond your Speed.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'free',
    prerequisites: ['Mind Smith Dedication', 'Expert in Athletics'],
    mechanics: 'Trigger: You Leap. +5 ft to Leap distance (capped by Speed).',
  },
  {
    id: 'mind-smith-ghost-blade',
    name: 'Ghost Blade',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You alter your weapon\'s phase so it can more easily strike incorporeal creatures. Your mind weapon gains the effects of a ghost touch property rune for 1 minute.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate'],
    actionCost: 1,
    prerequisites: ['Mind Smith Dedication'],
    mechanics: 'Freq: 1/hour. Mind weapon gains ghost touch for 1 minute.',
  },
  {
    id: 'mind-smith-just-the-tool',
    name: 'Just the Tool',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You temporarily change your weapon\'s shape to assist you in the field. You morph your weapon into a single simple tool, such as a shovel or crowbar. You can\'t replicate entire toolkits. Use this action again to change it back to a weapon.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 1,
    prerequisites: ['Mind Smith Dedication'],
    mechanics: 'Morph mind weapon into a single simple tool (or back). Can\'t replicate toolkits.',
  },
  {
    id: 'mind-smith-mental-forge',
    name: 'Mental Forge',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'Choose two of the following weapon traits to give your mind weapon: grapple, modular (B, P, or S), nonlethal, shove, or trip. Once chosen, these traits can\'t be changed unless you spend 1 week retraining to swap one for another from the list.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Mind Smith Dedication'],
    mechanics:
      'Permanently add 2 weapon traits from: grapple, modular, nonlethal, shove, trip. Retraining: 1 week per swap.',
    subChoices: { label: 'Choose weapon traits (pick 2)', options: [
      { id: 'grapple', name: 'Grapple' },
      { id: 'modular', name: 'Modular' },
      { id: 'nonlethal', name: 'Nonlethal' },
      { id: 'shove', name: 'Shove' },
      { id: 'trip', name: 'Trip' },
    ] },
  },
  {
    id: 'mind-smith-mind-shards',
    name: 'Mind Shards',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You detonate your mind weapon into a burst of psychic shards. You concentrate and unleash a 15-foot cone that deals 3d6 mental damage to all creatures in the area, with a basic Will save against the higher of your class DC or spell DC. The damage increases by 1d6 at level 7 and every two levels thereafter.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Magical', 'Mental'],
    actionCost: 2,
    prerequisites: ['Mind Smith Dedication'],
    mechanics:
      'Freq: 1/minute. 15-ft cone, 3d6 mental damage (basic Will, higher of class DC/spell DC). Scales +1d6 at 7th and every 2 levels. Mind weapon auto-reforms after.',
  },
  {
    id: 'mind-smith-malleable-mental-forge',
    name: 'Malleable Mental Forge',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'During your daily preparations, you can choose any two weapon traits from the Mental Forge list for 24 hours, replacing previous choices. This allows daily swapping instead of 1-week retraining.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Mind Smith Dedication'],
    mechanics:
      'Upgrades Mental Forge: the 2 weapon traits can now be swapped daily during preparations instead of requiring 1-week retraining.',
    subChoices: { label: 'Choose two weapon traits', options: [
      { id: 'grapple-modular', name: 'Grapple + Modular' },
      { id: 'grapple-nonlethal', name: 'Grapple + Nonlethal' },
      { id: 'grapple-shove', name: 'Grapple + Shove' },
      { id: 'grapple-trip', name: 'Grapple + Trip' },
      { id: 'modular-nonlethal', name: 'Modular + Nonlethal' },
      { id: 'modular-shove', name: 'Modular + Shove' },
      { id: 'modular-trip', name: 'Modular + Trip' },
      { id: 'nonlethal-shove', name: 'Nonlethal + Shove' },
      { id: 'nonlethal-trip', name: 'Nonlethal + Trip' },
      { id: 'shove-trip', name: 'Shove + Trip' },
    ] },
  },
  {
    id: 'mind-smith-mind-projectiles',
    name: 'Mind Projectiles',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You can make ranged mind weapon Strikes with a maximum range of 30 feet that deal 1d6 damage of the same type as your mind weapon. Your ranged mind weapon Strike gains all the benefits of your mind weapon\'s runes as long as they still apply to a ranged weapon.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Mind Smith Dedication'],
    mechanics: 'Ranged mind weapon Strikes: 30 ft range, 1d6 (same damage type). Runes apply if applicable to ranged.',
  },
  {
    id: 'mind-smith-runic-mind-smithing',
    name: 'Runic Mind Smithing',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'During your daily preparations, choose one weapon property rune from: corrosive, flaming, frost, shock, thundering, and vitalizing. Your mind weapon is enhanced with that rune until your next daily preparations. This counts toward your maximum rune limit.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Mind Smith Dedication'],
    mechanics:
      'Daily-prep free property rune from: corrosive, flaming, frost, shock, thundering, vitalizing. Counts toward rune limit.',
    subChoices: { label: 'Choose property rune', options: [
      { id: 'corrosive', name: 'Corrosive', description: '+1d6 acid damage' },
      { id: 'flaming', name: 'Flaming', description: '+1d6 fire damage' },
      { id: 'frost', name: 'Frost', description: '+1d6 cold damage' },
      { id: 'shock', name: 'Shock', description: '+1d6 electricity damage' },
      { id: 'thundering', name: 'Thundering', description: '+1d6 sonic damage' },
      { id: 'vitalizing', name: 'Vitalizing', description: '+1d6 vitality damage vs undead' },
    ] },
  },
  {
    id: 'mind-smith-metallic-envisionment',
    name: 'Metallic Envisionment',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You allow your mind to imagine the right physical form to exploit your opponents\' weaknesses. Choose between cold iron or silver; all your mind weapon Strikes are treated as the chosen material.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Mind Smith Dedication'],
    mechanics: 'Permanent choice: all mind weapon Strikes count as cold iron OR silver.',
    subChoices: { label: 'Choose material', options: [
      { id: 'cold-iron', name: 'Cold Iron' },
      { id: 'silver', name: 'Silver' },
    ] },
  },
  {
    id: 'mind-smith-advanced-runic-mind-smithing',
    name: 'Advanced Runic Mind-Smithing',
    source: 'Mind Smith (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'You can etch the greater forms of any runes from the Runic Mind Smithing list and add holy and unholy runes to the list. Additionally, once per day you can spend 10 minutes to swap your daily prepared rune to another from the same list.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Mind Smith Dedication'],
    mechanics:
      'Upgrades Runic Mind Smithing: greater rune forms + holy/unholy added to list. 1/day mid-day rune swap (10 minutes).',
  },
];

// ──────────────────────────────────────────────────────────
// PACTBINDER  (Dark Archives Remastered pg. 166)
// Category: Mystical / Core — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=262
// ──────────────────────────────────────────────────────────

export const PACTBINDER_FEATS: FeatEntry[] = [
  {
    id: 'pactbinder-dedication',
    name: 'Pactbinder Dedication',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 2,
    description:
      'The first step toward forming a successful pact is understanding the magic behind it. You become expert in Diplomacy and in one of Arcana, Nature, Occultism, or Religion. You gain the Binding Vow action: formally speak a binding vow (1/day). Breaking it is anathema — you lose all pactbinder benefits until fulfilled or atoned. When you Request or Coerce in service of your vow, you gain a +1 circumstance bonus against creatures aware of it.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Diplomacy', 'Trained in Arcana, Nature, Occultism, or Religion'],
    mechanics:
      'Expert in Diplomacy + 1 magic skill. Binding Vow [1-action] (auditory, concentrate, occult, freq: 1/day): supernatural vow, anathema to break. +1 circ to Request/Coerce in service of vow (vs aware creatures). Can\'t retrain pact feats. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'pactbinder-sociable-vow',
    name: 'Sociable Vow',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'The circumstance bonus from your Binding Vow also applies to attempts to Gather Information, Make an Impression, or Demoralize you make directly in service of fulfilling the vow.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication', 'Expert in Diplomacy'],
    mechanics:
      'Extends +1 circ from Binding Vow to Gather Information, Make an Impression, Demoralize (in service of vow).',
  },
  {
    id: 'pactbinder-pact-of-fey-glamour',
    name: 'Pact of Fey Glamour',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You\'ve sworn a pact with fey powers. Your base appearance changes indefinitely to any one appearance within your ancestry bounds; this can\'t be counteracted. You can also cast illusory disguise as a primal innate spell once per hour. Exchange: you must accept any fey\'s request for hospitality and must not harm anyone under hospitality.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Illusion', 'Primal'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Permanent appearance change (within ancestry). Illusory disguise 1/hour (primal innate, higher of class/spell DC). Exchange: fey hospitality obligations.',
  },
  {
    id: 'pactbinder-pact-of-huldras-renewal',
    name: 'Pact of Huldra\'s Renewal',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You\'ve sworn a pact with Zemnaïdé, a huldra professor at Cobyslarni. You can cast entangling flora as a primal innate spell once per day. After the spell ends, the plants become mundane. Fiends that fail a save against this or another plant spell you cast become sickened 1. Exchange: never aid demons or despoil natural environments.',
    implemented: 'full',
    traits: ['Rare', 'Archetype', 'Primal'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Entangling flora 1/day (primal innate). Fiends get sickened 1 on failed saves vs your plant spells. Exchange: anti-demon/anti-despoilment oath. Source: Rival Academies pg. 46.',
  },
  {
    id: 'pactbinder-pact-of-draconic-fury',
    name: 'Pact of Draconic Fury',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You\'ve sworn a pact with a dragon. You gain Dragon Breath [2-actions] (freq: 1/hour): exhale a breath weapon matching the dragon\'s type — 30-foot cone, 60-foot line, or 10-foot burst within 60 feet. Deals 1d6 damage per level, basic Reflex save. Exchange: you search for objects the dragon wants for their hoard.',
    implemented: 'full',
    traits: ['Uncommon', 'Arcane', 'Archetype'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Dragon Breath [2-actions] (freq: 1/hour): 1d6/level damage, basic Reflex (higher of class/spell DC). Shape/type based on pact dragon. Exchange: treasure-hunting for dragon.',
  },
  {
    id: 'pactbinder-ouroboric-pact',
    name: 'Ouroboric Pact',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You\'ve studied pacts at Cobyslarni and understand them as separate entities. You gain Entreat Pact [free-action] (concentrate, fortune, freq: 1/hour): when you attempt a skill check directly related to a pact\'s conditions, roll twice and take the better result. Special: you can never retrain pactbinder feats.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication', 'Master in Occultism'],
    mechanics:
      'Entreat Pact [free-action] (fortune, 1/hour): roll twice on pact-related skill checks. Tradeoff: can never retrain pactbinder feats. Source: Rival Academies pg. 46.',
  },
  {
    id: 'pactbinder-pact-of-infernal-prowess',
    name: 'Pact of Infernal Prowess',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'You\'ve sworn a pact with devils, granting success in exchange for your soul. Once per hour, when you critically fail a check, you can reroll it (fortune). You automatically succeed at Earn Income checks below your level. Exchange: your soul goes to Hell when you die; resurrection requires powerful magic, and devils track you for 1 year.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Divine'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Reroll critical failures 1/hour (fortune, free-action). Auto-succeed Earn Income below level. Exchange: soul to Hell on death. Can\'t retrain without destroying contract in Hell.',
  },
  {
    id: 'pactbinder-pact-of-the-nightblossom',
    name: 'Pact of the Nightblossom',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You\'ve sworn a pact with Jenway Nightblossom of the Synod of Truth in Dreams. You\'re immune to nightmare. During daily preparations (if you slept and dreamed), learn a helpful piece of advice as read omens. Exchange: Jenway telepathically learns your significant discoveries when you sleep.',
    implemented: 'full',
    traits: ['Rare', 'Archetype', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Immune to nightmare. Daily read omens from dreams. Exchange: Jenway learns your discoveries telepathically. Source: Rival Academies pg. 46.',
  },
  {
    id: 'pactbinder-pact-of-the-crossroads',
    name: 'Pact of the Crossroads',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You\'ve sworn a pact with Ng the Hooded, Lord of the Crossroads. Anyone tracking you must succeed at a Survival check against your DC. Creatures meeting you for the first time must succeed at a Will save or forget your features. Exchange: never settle in one place for more than a month; never reveal Ng\'s name as your patron.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Primal'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Anti-tracking (Survival vs higher of class/spell DC). Feature-forgetting (Will vs same DC). Exchange: wanderer oath, no revealing Ng. Source: Rival Academies pg. 47.',
  },
  {
    id: 'pactbinder-pact-of-the-final-breath',
    name: 'Pact of the Final Breath',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'You\'ve sworn a pact with a powerful psychopomp. You live twice as long before dying of natural causes. The first time each day you would be reduced to 0 HP and gain the dying condition, you instead regain HP equal to twice your level, remain conscious, and gain fast healing equal to your level for 3 rounds. Exchange: treat the dead with respect and destroy undead you encounter.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Divine'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Double natural lifespan. 1/day death prevention: instead of dying, heal 2×level HP + fast healing (level) for 3 rounds. Exchange: respect the dead, destroy undead when feasible.',
  },
  {
    id: 'pactbinder-pact-of-eldritch-eyes',
    name: 'Pact of Eldritch Eyes',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You\'ve sworn a pact with an entity beyond mortal comprehension. You can cast scouting eye as an occult innate spell once per hour. Exchange: the entity peers through you, giving strange dreams. Each morning you awaken trained in a random Lore skill (GM\'s choice) until next rest. Occasional daytime visions may penalize initiative.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Scouting eye 1/hour (occult innate, higher of class/spell DC). Daily random Lore skill. Exchange: nightmares, occasional visions. Easily retrainable.',
  },
  {
    id: 'pactbinder-pact-of-the-death-hunter',
    name: 'Pact of the Death Hunter',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You\'ve sworn a pact with a psychopomp bent on destroying all undeath. You gain an imprecise deathsense that detects undead up to 60 feet away. Whenever an undead is destroyed within 60 feet, you gain temporary HP equal to its level for 1 minute. Exchange: never aid undead creation; seek out and destroy mindless/destructive undead.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Divine'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      '60-ft imprecise deathsense for undead. Temp HP = destroyed undead\'s level (1 min). Exchange: anti-undead oath. Source: Rival Academies pg. 47.',
  },
  {
    id: 'pactbinder-pact-of-the-fey-paths',
    name: 'Pact of the Fey Paths',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You\'ve sworn a pact with a powerful fey that longs to see the Universe. You gain Fey Jump [1-action] (concentrate, primal, teleportation, freq: 1/hour): teleport up to 60 feet to an empty space you can see. Can\'t bring other creatures. Exchange: you can no longer see the moon or stars; must gaze at empty sky 10 minutes nightly.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Primal'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Fey Jump [1-action] (1/hour): 60-ft teleport to visible empty space (solo only). Exchange: no moon/stars vision, nightly sky gazing. Source: Rival Academies pg. 47.',
  },
  {
    id: 'pactbinder-pact-of-the-rune-dragon',
    name: 'Pact of the Rune Dragon',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'A pact with a rune dragon. You immediately learn 10 languages chosen from common, uncommon, and others the dragon has access to. You can Identify Magic at a range of 30 feet as a single action with the concentrate trait. Exchange: annual research report for the dragon.',
    implemented: 'full',
    traits: ['Uncommon', 'Arcane', 'Archetype'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Learn 10 languages. Identify Magic at 30-ft range as 1-action (concentrate). Exchange: annual research report. Source: Rival Academies pg. 47.',
  },
  {
    id: 'pactbinder-pact-of-the-living-pact',
    name: 'Pact of the Living Pact',
    source: 'Pactbinder (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'You\'ve sworn a pact with a living pact that survived its original pactbinder. You gain Forced Pact [1-action] (concentrate, freq: 1/hour): choose attack, move, manipulate, or concentrate. Target within 60 ft attempts Will save. Failure: if you or target uses an action with that trait within 1 minute, both take 10d6 mental damage. Critical failure: only target takes the damage.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype'],
    actionCost: 'passive',
    prerequisites: ['Pactbinder Dedication'],
    mechanics:
      'Forced Pact [1-action] (1/hour, 60 ft, Will save). Choose action trait (attack/move/manipulate/concentrate). Failure: mutual 10d6 mental on violation. Crit failure: only target takes damage. Exchange: pacts flee at dying 3+; sense direction to recover. Source: Rival Academies pg. 47.',
  },
];

// ──────────────────────────────────────────────────────────
// SLEEPWALKER  (Dark Archives Remastered pg. 206)
// Category: Mystical / Core — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=261
// ──────────────────────────────────────────────────────────

export const SLEEPWALKER_FEATS: FeatEntry[] = [
  {
    id: 'sleepwalker-dedication',
    name: 'Sleepwalker Dedication',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 4,
    description:
      'You\'ve learned to manipulate states of consciousness. You gain Daydream Trance [1-action] (mental, occult): lasts 1 minute or until unconscious. You gain +1 status bonus to Will saves (+2 vs mental effects, +3 if legendary in Occultism), but take -1 penalty to Perception and initiative. Dismissing requires a Will save against your own DC. After ending, 1-minute cooldown.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Expert in Occultism'],
    mechanics:
      'Daydream Trance [1-action] (mental, occult): 1 min, +1 status Will (+2 vs mental, +3 if legendary Occultism), -1 Perception/initiative. Dismiss requires Will save vs own DC. 1 min cooldown. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'sleepwalker-infiltrate-dream',
    name: 'Infiltrate Dream',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'If you\'re adjacent to a sleeping creature, you can enter their dreamscape (10-minute activity). You witness dream contents as an undetectable observer. You can attempt an Occultism check against the target\'s Will DC to learn information about a topic. Critical success: direct info (or related if target would hide it); success: cryptic hint; critical failure: erroneous info. Target immune for 1 week.',
    implemented: 'full',
    traits: ['Archetype', 'Mental', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      '10-min activity. Enter adjacent sleeping creature\'s dream as undetectable observer. Occultism vs Will DC for info. 4-tier results. Target immune 1 week.',
  },
  {
    id: 'sleepwalker-vision-of-foresight',
    name: 'Vision of Foresight',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You use your daydreams to predict the success of actions. Once before the end of your next turn, you can roll a saving throw or skill check twice and take the better result.',
    implemented: 'full',
    traits: ['Archetype', 'Fortune', 'Occult', 'Prediction'],
    actionCost: 1,
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      'Req: In Daydream Trance. Fortune reroll: 1 saving throw or skill check before end of next turn, roll twice take higher.',
  },
  {
    id: 'sleepwalker-dream-magic',
    name: 'Dream Magic',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'Choose dream message or sleep; you gain it as a 4th-rank occult innate spell (1/day). Sleep can only be cast while in Daydream Trance. Wisdom is your spellcasting attribute. Special: Can take this feat twice for the other spell.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      'Gain dream message or sleep as 4th-rank occult innate (1/day, WIS-based). Sleep requires Daydream Trance. Special: can take twice for the other spell.',
    subChoices: { label: 'Choose spell', options: [
      { id: 'dream-message', name: 'Dream Message' },
      { id: 'sleep', name: 'Sleep', description: 'Requires Daydream Trance' },
    ] },
  },
  {
    id: 'sleepwalker-waking-dream',
    name: 'Waking Dream',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'While in your Daydream Trance, you can blur the line between dreams and reality. You gain the waking dream focus spell (usable only in Daydream Trance). You gain 1 Focus Point and can Refocus by taking a 10-minute nap. Wisdom is your spellcasting attribute.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      'Gain waking dream focus spell (only in trance). 1 Focus Point. Refocus via 10-min nap. WIS-based.',
  },
  {
    id: 'sleepwalker-oneiric-influence',
    name: 'Oneiric Influence',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'While Infiltrating a Dream, you can implant a suggestion in the target\'s mind. The target attempts a Will save against your DC. Effects are as subconscious suggestion, but even on a critical success, the target doesn\'t realize you were trying to control them. The suggestion remains for 1 week or until triggered. Memories of carrying it out are hazy and dreamlike.',
    implemented: 'full',
    traits: ['Archetype', 'Incapacitation', 'Mental', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Infiltrate Dream'],
    mechanics:
      'During Infiltrate Dream: implant subconscious suggestion (Will vs your DC). Crit success: target unaware of attempt. Lasts 1 week or until triggered. Incapacitation trait.',
  },
  {
    id: 'sleepwalker-ward-slumber',
    name: 'Ward Slumber',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'Before going to sleep, perform a 10-minute ward to protect up to 8 creatures within 30 feet. All affected gain a +4 status bonus on saves against nightmare or dream-influencing effects until your next daily preparations. They heal double the usual HP from resting.',
    implemented: 'full',
    traits: ['Archetype', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      '10-min ward before sleep: up to 8 creatures within 30 ft get +4 status vs dream effects + double HP from resting, until next daily prep.',
  },
  {
    id: 'sleepwalker-dream-logic',
    name: 'Dream Logic',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 14,
    description:
      'You can transmit a sense of dreamy nonchalance. While in Daydream Trance, if you do something strange or dangerous, non-ally creatures must pass a Perception check against your DC or believe nothing is out of the ordinary. Hostile actions against a creature end the effect for them. Affected creatures retain memories but view events as unremarkable.',
    implemented: 'full',
    traits: ['Archetype', 'Mental', 'Occult'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      'While in trance: non-allies Perception vs your DC or find strange actions normal. Hostile actions break effect for target. Memories persist but feel unremarkable.',
  },
  {
    id: 'sleepwalker-shared-dream',
    name: 'Shared Dream',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'You\'ve learned to create a shared dreamscape. You can cast dream council as an innate occult spell once per day.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics: 'Dream council 1/day (occult innate).',
  },
  {
    id: 'sleepwalker-ever-dreaming',
    name: 'Ever Dreaming',
    source: 'Sleepwalker (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'You draw no distinction between sleeping and waking worlds. Your Daydream Trance has unlimited duration and you no longer need an action to enter it. While asleep: no -4 penalty to AC, Perception, and Reflex saves; no off-guard condition; can act on your turn (slowed 2 until fully awake). Still blinded while asleep.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Sleepwalker Dedication'],
    mechanics:
      'Daydream Trance: permanent, free-action entry. While asleep: no -4 penalty (AC/Perception/Reflex), no off-guard; can act (slowed 2). Still blinded.',
  },
];

// ──────────────────────────────────────────────────────────
// TIME MAGE  (Dark Archives Remastered pg. 184)
// Category: Mystical / Core — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=263
// ──────────────────────────────────────────────────────────

export const TIME_MAGE_FEATS: FeatEntry[] = [
  {
    id: 'time-mage-dedication',
    name: 'Time Mage Dedication',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 6,
    description:
      'You gain the delay consequence focus spell (domain spell) and time sense as an innate cantrip. You can Refocus by revisiting past moments and contemplating futures. These spells are of the same tradition as the class you used to meet the prerequisites.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['You have a spellcasting class feature'],
    mechanics:
      'Gain delay consequence focus spell + time sense innate cantrip. Same tradition as qualifying class. Dedication-lock enforced by validateDedicationTaking().',
  },
  {
    id: 'time-mage-chronocognizance',
    name: 'Chronocognizance',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 7,
    description:
      'The flows and ebbs of time are obvious to you. You automatically detect if any observed creature is under slowed or quickened. You have a general sense when near time-manipulating phenomena. If legendary in Arcana, Nature, Occultism, or Religion, you can observe what happens during freeze time and similar effects (though you still can\'t act).',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Time Mage Dedication', 'Master in Perception'],
    mechanics:
      'Auto-detect slowed/quickened. Sense time anomalies. Legendary magic skill → observe frozen-time events (can\'t act).',
  },
  {
    id: 'time-mage-chronomancers-secrets',
    name: 'Chronomancer\'s Secrets',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'The secrets of time peel back, revealing deeper truths. You gain either the stasis domain spell or the path of least resistance focus spell. Special: You can take this feat a second time for the other option.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Gain 1 focus spell: stasis or path of least resistance. Special: can take twice for the other.',
  },
  {
    id: 'time-mage-future-spell-learning',
    name: 'Future Spell Learning',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'More future memories percolate back to the present. Add behold the weave, cast into time, haste, loose time\'s arrow, quicken time, slow, and stagnate time to your spell list. Prepared casters add to spellbook; spontaneous casters can retrain one spell for one of these.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Add 7 time spells to spell list: behold the weave, cast into time, haste, loose time\'s arrow, quicken time, slow, stagnate time. Spellbook: add all. Repertoire: retrain 1.',
  },
  {
    id: 'time-mage-what-could-have-been',
    name: 'What Could Have Been',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 8,
    description:
      'Rather than conjuring creatures from elsewhere, you temporarily pull a different version of yourself from an alternate timeline to serve as a summoned creature when you cast a summon spell.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Spellshape'],
    actionCost: 'free',
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Spellshape (free-action): next summon spell pulls an alternate-timeline version of yourself instead of a normal creature. Uses appropriate stat block.',
  },
  {
    id: 'time-mage-into-the-future',
    name: 'Into the Future',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 10,
    description:
      'You cast your magic into the future. If your next action is to Cast a Spell that takes 1 or 2 actions, the spell\'s effects occur at the beginning of your next turn rather than immediately. Targets and choices must be determined when cast. Line of sight/effect must be valid at both times. Consequences for the Casting action itself aren\'t delayed.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Spellshape (1-action): next 1-or-2-action spell effects delayed 1 round (start of next turn). Targets set at cast time. LoS/LoE required at both times.',
  },
  {
    id: 'time-mage-spell-acceleration',
    name: 'Spell Acceleration',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 12,
    description:
      'Special time-weaving techniques let you cast with incredible speed. You gain the Quickened Casting feat, applying to cantrips and spells from the class you used to qualify for Time Mage Dedication.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Gain Quickened Casting feat for qualifying class\'s spells (cantrips and spells). 1/day quickened casting.',
  },
  {
    id: 'time-mage-purge-of-moments',
    name: 'Purge of Moments',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 16,
    description:
      'Five rounds of apparent time occur for you. No one can act during this time, but effects on you run their course, including beneficial effects, afflictions, conditions, and persistent damage. Roll saving throws, flat checks, damage, and other rolls normally as if time had passed.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate'],
    actionCost: 3,
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Freq: 1/hour. Self-time-skip: instantly advance 5 rounds of effect duration (afflictions, conditions, persistent damage, buffs, etc.) with normal rolls.',
  },
  {
    id: 'time-mage-timeline-splitting-spell',
    name: 'Timeline-Splitting Spell',
    source: 'Time Mage (Archetype)',
    category: 'archetype',
    level: 18,
    description:
      'You invest in two futures, then choose one. Cast two Spells that each take 1 or 2 actions (can\'t be same spell at different ranks). Expend resources for both. Roll results for both, then choose which takes effect. The other spell\'s resources are spent but the spell has no effect.',
    implemented: 'full',
    traits: ['Archetype', 'Concentrate', 'Manipulate'],
    actionCost: 3,
    prerequisites: ['Time Mage Dedication'],
    mechanics:
      'Freq: 1/day. Cast 2 different spells (1-or-2-action each), roll for both, pick one to take effect. Other fizzles but resources spent. Extremely powerful "best of two" capstone.',
  },
];

// ══════════════════════════════════════════════════════════
// CATALOG — Non-Core Archetype Feats L–T
// ══════════════════════════════════════════════════════════

export const STANDALONE_ARCHETYPE_FEATS_NON_CORE_LT: FeatEntry[] = [
  ...LIVING_VESSEL_FEATS,
  ...MIND_SMITH_FEATS,
  ...PACTBINDER_FEATS,
  ...SLEEPWALKER_FEATS,
  ...TIME_MAGE_FEATS,
];
