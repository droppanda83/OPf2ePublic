import { FeatEntry } from './featTypes';

// ══════════════════════════════════════════════════════════
// NON-CORE ARCHETYPE FEATS — Tian Xia Character Guide
// & Howl of the Wild
// Familiar Sage, Fan Dancer, Five-breath Vanguard,
// Spirit Warrior, Ostilli Host, Swarmkeeper
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// FAMILIAR SAGE  (Tian Xia Character Guide pg. 116)
// Category: Mystical
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=279
// Empowered bond between caster and familiar, unlocking
// elemental and spiritual magic through the familiar.
// Level 4+ Dedication. 11 feats total.
// ──────────────────────────────────────────────────────────

export const FAMILIAR_SAGE_FEATS: FeatEntry[] = [
  // ─── Level 4 ───
  {
    id: 'familiar-sage-dedication',
    name: 'Familiar Sage Dedication',
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You forge an empowered mystical bond with your familiar, gaining the Enhanced Familiar feat. You can also take feats from the Familiar Master archetype, and you can take Familiar Master Dedication even without three feats from this archetype. You can\'t select another dedication feat until you\'ve gained two other feats from the familiar master or familiar sage archetypes.',
    implemented: 'full',
    traits: ['Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['You have a familiar', 'You\'re able to cast spells'],
    mechanics: 'Grants Enhanced Familiar feat. Can take Familiar Master feats. Dedication-lock: 2 feats from familiar master or familiar sage before next dedication.',
  },

  // ─── Level 6 ───
  {
    id: 'familiar-sage-familiars-resolve',
    name: "Familiar's Resolve",
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'When you weave magic, your familiar traces symbols that ward off fear and doubt. If the next action you use is to Cast a Spell, you or an ally within 30 feet gain a +2 status bonus to saving throws against effects that would cause you to be doomed or frightened for 1 round. At 14th level, the status bonus increases to +3.',
    implemented: 'full',
    traits: ['Archetype', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Familiar Sage Dedication'],
    mechanics: 'Spellshape. If next action is Cast a Spell: you or ally within 30 ft gain +2 status to saves vs doomed/frightened for 1 round (+3 at 14th level).',
  },
  {
    id: 'familiar-sage-fulu-familiar',
    name: 'Fulu Familiar',
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You can imprint your familiar\'s spiritual essence into a fulu, a small paper charm. You gain the Create Familiar Fulu action (2 actions, concentrate, manipulate, once per day). Your familiar dissolves into magical energy that becomes a fulu item at least two levels lower than your level with no monetary cost or Crafting check. You can Affix the fulu as part of the same action. While transformed, the familiar doesn\'t grant normal benefits. At 12th level, you can use this twice per day, and at 18th level, three times per day.',
    implemented: 'full',
    traits: ['Archetype', 'Talisman'],
    actionCost: 'passive',
    prerequisites: ['Familiar Sage Dedication', 'Expert in Occultism or Religion'],
    mechanics: 'Grants Create Familiar Fulu [two-action]. 1/day (2/day at 12th, 3/day at 18th). Creates a fulu item (at least 2 levels lower, no cost). Familiar unavailable while transformed into fulu. Reverts on daily prep or fulu activation.',
  },
  {
    id: 'familiar-sage-tempest-clouds-speed',
    name: "Tempest Cloud's Speed",
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You and your familiar coordinate to channel elemental air. Your familiar gains the Path of the Tempest ability (2 actions, once per 10 minutes). When activated, you gain a +10-foot status bonus to Speed until end of turn, your Stride doesn\'t trigger reactions this turn, and you don\'t need to Stride before a Long Jump this turn.',
    implemented: 'full',
    traits: ['Air', 'Archetype', 'Magical'],
    actionCost: 'passive',
    prerequisites: ['Familiar Sage Dedication'],
    mechanics: 'Familiar gains Path of the Tempest [two-action] (1/10 min). Grants +10-ft status to Speed, Stride doesn\'t trigger reactions, no Stride needed before Long Jump this turn. Requires not encumbered.',
  },

  // ─── Level 8 ───
  {
    id: 'familiar-sage-familiar-ritualist',
    name: 'Familiar Ritualist',
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your familiar\'s magical presence can serve as an aspect of a ritual. When you cast a ritual, your familiar can serve as a secondary caster, fulfilling any requirements for the secondary caster as well as a secondary check. You can\'t replace a secondary caster who\'s the target of the spell.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Familiar Sage Dedication', 'Ability to cast a ritual'],
    mechanics: 'Familiar can serve as secondary caster for rituals, fulfilling requirements and making secondary checks. Cannot replace a secondary caster who is the spell target.',
  },
  {
    id: 'familiar-sage-golden-dragons-bounty',
    name: "Golden Dragon's Bounty",
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your familiar alters the material of a spell into precious metal. If the next action you use is to Cast a Spell that deals bludgeoning, piercing, or slashing damage, that damage counts as your choice of cold iron, silver, or steel for the purposes of weaknesses, resistances, and vulnerabilities. At 14th level, adamantine is added to the list. The spell gains the metal trait.',
    implemented: 'full',
    traits: ['Archetype', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Familiar Sage Dedication'],
    mechanics: 'Spellshape. Next spell\'s physical damage counts as cold iron, silver, or steel (choice). Adamantine added at 14th. Gains metal trait.',
  },
  {
    id: 'familiar-sage-lightning-rings-intervention',
    name: "Lightning Rings' Intervention",
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your familiar learns to empower spells with an electrical discharge, gaining the Lightning Needles ability (1 action). After you Cast a Spell with the air or electricity trait, your familiar unleashes a 5-foot emanation of static electricity. Creatures in the emanation that fail a Fortitude save against your spell DC become clumsy 1 until end of their next turn. Soaked creatures or those standing in water also take 1d4 persistent electricity damage on a failed save.',
    implemented: 'full',
    traits: ['Archetype', 'Electricity', 'Manipulate'],
    actionCost: 'passive',
    prerequisites: ['Familiar Sage Dedication'],
    mechanics: 'Familiar gains Lightning Needles [one-action]. Requires: Cast air/electricity spell this turn. 5-ft emanation, Fort save vs spell DC: clumsy 1 until end of next turn. In water: also 1d4 persistent electricity on fail.',
  },

  // ─── Level 10 ───
  {
    id: 'familiar-sage-seal-of-the-golden-dragon',
    name: 'Seal of the Golden Dragon',
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'Your familiar coils around you, protecting you with its magical resistance. When you would take acid, cold, electricity, poison, fire, or sonic damage while your familiar has the resistance ability and is adjacent to you, you gain the benefits of your familiar\'s resistance ability until the start of your next turn (including any upgrades like major resistance). Once per day, if the triggering damage type differs from your familiar\'s current resistance, the familiar\'s resistance changes to match.',
    implemented: 'full',
    traits: ['Archetype', 'Magical'],
    actionCost: 'reaction',
    prerequisites: ['Familiar Sage Dedication', "Golden Dragon's Bounty"],
    mechanics: 'Reaction. Trigger: take acid/cold/electricity/poison/fire/sonic damage. Requires familiar adjacent with resistance ability. Gain familiar\'s resistance until start of next turn. 1/day: can change familiar\'s resistance type to match triggering damage.',
  },

  // ─── Level 12 ───
  {
    id: 'familiar-sage-lightning-rings-overcharge',
    name: "Lightning Rings' Overcharge",
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your familiar can adopt an electrical form to empower weapon strikes, gaining the Lightning Armillary ability (1 action). Your familiar flies around an adjacent ally\'s weapon or hand, dissolving into rings of lightning. Until the beginning of your next turn, the affected weapon or unarmed attack deals an additional 1d6 electricity damage, or 1d8 if you Cast a Spell with the air or electricity trait this turn. The familiar remains in lightning ring form and can\'t be targeted or take actions.',
    implemented: 'full',
    traits: ['Archetype', 'Electricity', 'Magical'],
    actionCost: 'passive',
    prerequisites: ['Familiar Sage Dedication', "Lightning Rings' Intervention"],
    mechanics: 'Familiar gains Lightning Armillary [one-action]. Adjacent ally\'s weapon/unarmed deals +1d6 electricity (+1d8 if you cast air/electricity spell this turn) until start of next turn. Familiar untargetable in this form.',
  },
  {
    id: 'familiar-sage-vexing-tempest',
    name: 'Vexing Tempest',
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your familiar channels elemental air to unleash a disruptive gust. If the next action you use is to Cast a Spell with the air trait, all creatures within a 15-foot emanation of your familiar must attempt a Reflex save against your spell DC or be pushed 10 feet away. On a critical failure, they\'re also knocked prone.',
    implemented: 'full',
    traits: ['Air', 'Archetype', 'Spellshape'],
    actionCost: 1,
    prerequisites: ['Familiar Sage Dedication', "Tempest Cloud's Speed"],
    mechanics: 'Spellshape. If next action is Cast a Spell with air trait: 15-ft emanation from familiar, Reflex save vs spell DC. Fail: pushed 10 ft. Crit fail: also prone.',
  },

  // ─── Level 16 ───
  {
    id: 'familiar-sage-phoenixs-flight',
    name: "Phoenix's Flight",
    source: 'Familiar Sage (Archetype)',
    category: 'archetype',
    level: 16,
    description: 'You and your familiar learn the secrets of elemental fire, merging together to become a legendary phoenix. You can cast monstrosity form as an occult innate spell once per day, except you transform only into a phoenix and your familiar must be adjacent. While transformed, you gain the Blazing Conflagration action (3 actions): dismiss phoenix form with a fiery eruption dealing 16d6 fire damage in a 10-foot burst (basic Fortitude; critical failure blinds 1 round). You gain 8d6 temporary HP. At 18th and 20th level, burst deals +2d6 fire and you gain +1d6 temp HP.',
    implemented: 'full',
    traits: ['Archetype', 'Fire', 'Magical', 'Polymorph'],
    actionCost: 'passive',
    prerequisites: ['Familiar Sage Dedication'],
    mechanics: 'Monstrosity form (phoenix only) 1/day as occult innate spell. Requires familiar adjacent. Blazing Conflagration [three-action]: dismiss form, 10-ft burst 16d6 fire (basic Fort, crit fail: blinded 1 round), gain 8d6 temp HP. Scales at 18th/20th (+2d6 fire, +1d6 temp HP each).',
  },
];

// ──────────────────────────────────────────────────────────
// FAN DANCER  (Tian Xia Character Guide pg. 98)
// Category: Combat Style — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=276
// Elegant fan-wielding combat style with air-themed
// offense, defense, and battlefield movement.
// Level 2+ Dedication. 14 feats total.
// ──────────────────────────────────────────────────────────

export const FAN_DANCER_FEATS: FeatEntry[] = [
  // ─── Level 2 ───
  {
    id: 'fan-dancer-dedication',
    name: 'Fan Dancer Dedication',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You combine graceful spring breezes and crisp autumn gusts in combat. You become an expert in Performance (master at 7th, legendary at 15th). Whenever you Feint while holding a fan, you can give the Feint the air trait, and if you do, you can Stride 10 feet before or after as part of the same action.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Performance'],
    mechanics: 'Expert in Performance (master 7th, legendary 15th). Feint with fan gains air trait + Stride 10 ft before/after. Access: Tian Xia origin. Dedication-lock enforced by validateDedicationTaking().',
  },

  // ─── Level 4 ───
  {
    id: 'fan-dancer-petal-step',
    name: 'Petal Step',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You distribute your weight with such mastery that you dance lightly over the ground like petals drifting on water. You gain a +1 circumstance bonus to Stealth checks to Sneak and aren\'t detectable by tremorsense.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: '+1 circumstance to Stealth to Sneak. Undetectable by tremorsense.',
  },
  {
    id: 'fan-dancer-solo-dancer',
    name: 'Solo Dancer',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You dance alone with exceptional grace, carrying yourself with poise and confidence that draws attention. You can always roll Performance for initiative, and during the first round of combat, creatures that act after you are off-guard to you.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication', 'Expert in Performance'],
    mechanics: 'Can always roll Performance for initiative. Round 1: creatures acting after you are off-guard to you.',
  },
  {
    id: 'fan-dancer-twirl-through',
    name: 'Twirl Through',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You sweep across the battlefield with perfectly spaced movements honed from years of coordination alongside fellow dancers. When you attempt to Tumble Through an enemy\'s space, you can use Performance instead of Acrobatics.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: 'Use Performance instead of Acrobatics for Tumble Through.',
  },

  // ─── Level 6 ───
  {
    id: 'fan-dancer-fluttering-misdirection',
    name: 'Fluttering Misdirection',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You manipulate your fans to draw the eyes of your audience to specific aspects of your performance. While wielding a fan, you and adjacent allies gain a constant +1 circumstance bonus to Stealth checks to Conceal an Object and to Thievery checks to Steal or Palm an Object.',
    implemented: 'full',
    traits: ['Archetype', 'Skill'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: 'While wielding fan: you + adjacent allies get +1 circumstance to Conceal an Object (Stealth) and Steal/Palm an Object (Thievery).',
  },
  {
    id: 'fan-dancer-sweeping-fan-block',
    name: 'Sweeping Fan Block',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You snap your fans open and sweep them across your body, disrupting an incoming ranged attack with gusts of air. You gain a +2 circumstance bonus to AC against the triggering attack. If the attack misses, you can redirect the ammunition into a nearby container for later reuse.',
    implemented: 'full',
    traits: ['Air', 'Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: 'Reaction. Trigger: targeted by ranged attack using ammunition. Requires: wielding 2 fans. +2 circumstance to AC vs triggering attack. If miss: recover ammunition.',
  },

  // ─── Level 8 ───
  {
    id: 'fan-dancer-pushing-wind',
    name: 'Pushing Wind',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'As you spin and glide your fans, you kick up winds that carry your allies forward and impede your foes. While holding a fan, you and allies who start their turn in a 30-foot aura gain a +5-foot circumstance bonus to land Speed (and fly Speed if applicable) for 1 round. Additionally, a 10-foot aura around you is difficult terrain for all enemies.',
    implemented: 'full',
    traits: ['Air', 'Archetype', 'Aura'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: '30-ft aura: allies starting turn in aura gain +5-ft circumstance to Speed for 1 round. 10-ft aura: difficult terrain for enemies. Requires wielding a fan.',
  },
  {
    id: 'fan-dancer-twirling-strike',
    name: 'Twirling Strike',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your fans become a blur as you twirl across the battlefield. Attempt to Tumble Through an enemy\'s space using Performance. On a success, you can make a melee Strike with a fan at any point during the movement. On a critical success, the enemy is off-guard against this attack.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Fan Dancer Dedication', 'Twirl Through'],
    mechanics: 'Tumble Through (Performance) + melee fan Strike during movement. Crit success on Tumble: target off-guard vs this Strike. Requires wielding a fan.',
  },

  // ─── Level 10 ───
  {
    id: 'fan-dancer-close-formation',
    name: 'Close Formation',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You practiced fan dance as a member of a large group, heightening your spatial awareness. When you wield two fans (each in a different hand), you gain tremorsense as an imprecise sense with a range of 20 feet.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication', 'Master in Performance'],
    mechanics: 'Tremorsense (imprecise) 20 ft while wielding 2 fans.',
  },
  {
    id: 'fan-dancer-dizzying-spin-dance',
    name: 'Dizzying Spin Dance',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You spin with dizzying speed through multiple opponents. Tumble Through an opponent\'s space and Strike with your fan. On success, the opponent is off-guard to the next attack against it before start of your next turn. You can then repeat against a second opponent, and if successful again, a third. Each Tumble Through + Strike is against a different opponent.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 3,
    prerequisites: ['Fan Dancer Dedication', 'Twirling Strike'],
    mechanics: 'Up to 3 Tumble Through + Strike combos vs different opponents. Each successful hit makes target off-guard to next attack before your next turn. Requires wielding a fan.',
  },
  {
    id: 'fan-dancer-fluttering-distraction',
    name: 'Fluttering Distraction',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You snap and flutter your fans to draw the eyes of observers, creating a distraction when an enemy attacks your ally. The enemy must roll its attack twice and take the lower result.',
    implemented: 'full',
    traits: ['Archetype', 'Manipulate', 'Misfortune'],
    actionCost: 'reaction',
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: 'Reaction. Trigger: enemy attempts Strike vs ally within 30 ft. Requires 2 fans. Misfortune: enemy rolls attack twice, takes lower result.',
  },
  {
    id: 'fan-dancer-sweeping-fan-redirection',
    name: 'Sweeping Fan Redirection',
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You can redirect ammunition back at the creature that fired it with sweeping gusts of wind. When Sweeping Fan Block prevents an attack from hitting you, instead of recovering the ammunition, you can make a ranged Strike against the triggering target using the normal attack bonus and damage of your fans as part of the same reaction, applying any special effects the ammunition might have.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Fan Dancer Dedication', 'Sweeping Fan Block'],
    mechanics: 'Upgrades Sweeping Fan Block. When block causes miss: make ranged Strike vs attacker using fan stats + ammo special effects, as part of the same reaction. Requires 2 fans.',
  },

  // ─── Level 14 ───
  {
    id: 'fan-dancer-dragons-journey',
    name: "Dragon's Journey",
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 14,
    description: 'Your movements are like a dragon weaving a serpentine path. Using your fans, you slice the air and create a path of least resistance. You Stride; your movement doesn\'t trigger enemy reactions. Any allies you pass within 5 feet of can immediately use their reaction to Stride in the same direction. Allies must end their movement as close as possible to you or another ally who benefited. During Dragon\'s Journey, ally movement doesn\'t trigger reactions.',
    implemented: 'full',
    traits: ['Air', 'Archetype', 'Flourish', 'Move'],
    actionCost: 1,
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: 'Stride without triggering reactions. Allies within 5 ft can reaction-Stride in same direction (also no reactions). Requires wielding 2 fans. Flourish (1/turn).',
  },
  {
    id: 'fan-dancer-peonys-flourish',
    name: "Peony's Flourish",
    source: 'Fan Dancer (Archetype)',
    category: 'archetype',
    level: 14,
    description: 'You spin and create wide arching circles with your fans, manifesting a mosaic of peonies that confuses enemies. Stride twice and then attempt a Performance check against the Will DC of each creature you passed adjacent to. Critical Success: stunned 3 and dazzled while stunned. Success: stunned 1 and dazzled for 1 round. Failure: dazzled for 1 round. Critical Failure: unaffected and immune for 24 hours.',
    implemented: 'full',
    traits: ['Archetype', 'Incapacitation', 'Visual'],
    actionCost: 3,
    prerequisites: ['Fan Dancer Dedication'],
    mechanics: 'Stride twice + Performance vs Will DC of adjacent creatures. Crit success: stunned 3 + dazzled. Success: stunned 1 + dazzled 1 round. Fail: dazzled 1 round. Crit fail: immune 24h. Requires 2 fans.',
  },
];

// ──────────────────────────────────────────────────────────
// FIVE-BREATH VANGUARD  (Tian Xia Character Guide pg. 90)
// Category: Combat Style — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=272
// Elemental martial arts cycling between five stances.
// Level 6+ Dedication. 5 feats total.
// ──────────────────────────────────────────────────────────

export const FIVE_BREATH_VANGUARD_FEATS: FeatEntry[] = [
  // ─── Level 6 ───
  {
    id: 'five-breath-vanguard-dedication',
    name: 'Five-breath Vanguard Dedication',
    source: 'Five-breath Vanguard (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You flow like the elemental cycle, adapting your stance and techniques in response to circumstances. You gain the Cycle Elemental Stance action (1 action): Stride or Step, then enter a different elemental stance from the one you\'re currently in. The five elemental stances are Ironblood Stance (metal), Mountain Stance (earth), Reflective Ripple Stance (water), Stoked Flame Stance (fire), and Tangled Forest Stance (wood).',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Two of the five elemental stances (Ironblood, Mountain, Reflective Ripple, Stoked Flame, Tangled Forest)'],
    mechanics: 'Grants Cycle Elemental Stance [one-action]: Stride or Step, then enter a different elemental stance. Access: Tian Xia origin or exposure to Tian elementalism. Dedication-lock enforced by validateDedicationTaking().',
  },

  // ─── Level 10 ───
  {
    id: 'five-breath-vanguard-renewing-cycle',
    name: 'Renewing Cycle',
    source: 'Five-breath Vanguard (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'The first time each round that you Cycle Elemental Stance, you gain temporary Hit Points equal to half your level that last until the start of your next turn. After gaining temp HP from entering a specific stance, you can\'t gain them from that stance again until you\'ve entered every other elemental stance you know or 10 minutes pass.',
    implemented: 'full',
    traits: ['Archetype', 'Healing', 'Magical'],
    actionCost: 'passive',
    prerequisites: ['Five-breath Vanguard Dedication'],
    mechanics: 'First Cycle Elemental Stance each round: gain temp HP = half level (until start of next turn). Can\'t reuse same stance for temp HP until all known stances cycled or 10 min. Requires elemental stance.',
  },

  // ─── Level 14 ───
  {
    id: 'five-breath-vanguard-induce-imbalance',
    name: 'Induce Imbalance',
    source: 'Five-breath Vanguard (Archetype)',
    category: 'archetype',
    level: 14,
    description: 'Your blows disrupt the balance of elemental energies that keep a body in good health. Strike the target using the unarmed attack associated with your current elemental stance. On a success, the target must attempt a Fortitude save against your class DC. Failure: clumsy 2 until end of your next turn. Critical Failure: clumsy 3 for 1 minute. Elementals take a -2 circumstance penalty to the save.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 2,
    prerequisites: ['Five-breath Vanguard Dedication'],
    mechanics: 'Strike with current stance\'s unarmed attack + Fort save vs class DC. Fail: clumsy 2 (until end of next turn). Crit fail: clumsy 3 (1 min). Elementals take -2 to save. Requires elemental stance. Flourish (1/turn).',
  },

  // ─── Level 16 ───
  {
    id: 'five-breath-vanguard-protective-cycle',
    name: 'Protective Cycle',
    source: 'Five-breath Vanguard (Archetype)',
    category: 'archetype',
    level: 16,
    description: 'You react to harm by flowing into an elemental stance with new advantages. When you take damage from an attack, you Cycle Elemental Stance and gain a +2 circumstance bonus to AC until the end of your next turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Five-breath Vanguard Dedication'],
    mechanics: 'Reaction. Trigger: take damage from an attack. Requires elemental stance. Cycle Elemental Stance + +2 circumstance to AC until end of next turn.',
  },

  // ─── Level 18 ───
  {
    id: 'five-breath-vanguard-five-breaths-one-death',
    name: 'Five Breaths, One Death',
    source: 'Five-breath Vanguard (Archetype)',
    category: 'archetype',
    level: 18,
    description: 'You cycle through the elements in a devastating combination attack. Strike the target with your current stance\'s unarmed attack, then Cycle Elemental Stance and Strike again. Continue cycling and striking until you\'ve made a Strike using every elemental stance you know, applying multiple attack penalty normally. If all five Strikes hit, the target must attempt a Fortitude save against your class DC or die as each elementally associated organ shuts down. This is a death effect.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Induce Imbalance'],
    mechanics: 'Frequency: 1/10 min. Requires elemental stance + target under Induce Imbalance. Cycle through all known stances with Strikes (MAP applies). If all 5 hit: Fort save vs class DC or death (death effect).',
  },
];

// ──────────────────────────────────────────────────────────
// SPIRIT WARRIOR  (Tian Xia Character Guide pg. 92)
// Category: Combat Style — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=274
// Warriors combining blade and fist, channeling spirit
// energy through martial arts. 13 feats total.
// ──────────────────────────────────────────────────────────

export const SPIRIT_WARRIOR_FEATS: FeatEntry[] = [
  // ─── Level 2 ───
  {
    id: 'spirit-warrior-dedication',
    name: 'Spirit Warrior Dedication',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You train your spirit and body to work in perfect harmony, combining blade and fist. Your fist damage die becomes 1d6 (instead of 1d4) and gains the parry trait. You don\'t take the -2 circumstance penalty for making lethal attacks with unarmed attacks. You gain the Overwhelming Combination action (1 action, flourish): make two Strikes against a target within reach — one with a one-handed melee weapon (or agile/finesse weapon) and one with your fist. If both hit, combine their damage for resistances and weaknesses. Apply MAP to each Strike normally.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: [],
    mechanics: 'Fist: 1d6, gains parry. No -2 for lethal unarmed. Overwhelming Combination [one-action] (flourish): 2 Strikes (weapon + fist), combine damage vs resistances/weaknesses if both hit. Access: Tian Xia origin. Dedication-lock enforced by validateDedicationTaking().',
  },

  // ─── Level 4 ───
  {
    id: 'spirit-warrior-kaiju-defense-oath',
    name: 'Kaiju Defense Oath',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You\'ve sworn an oath to defend the helpless from titanic beasts. Overwhelming Combination attacks gain +4 circumstance bonus to damage against creatures at least 2 sizes larger than you (+6 with master proficiency). You gain +2 circumstance bonus to saves and DCs against kaiju hazards. Edict: protect others from massive creatures they can\'t defend themselves from.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Overwhelming Combination: +4 circumstance damage vs 2+ sizes larger (+6 with master). +2 circumstance to saves/DCs vs kaiju hazards. Edict: protect others from massive creatures.',
  },
  {
    id: 'spirit-warrior-sacred-wilds-oath',
    name: 'Sacred Wilds Oath',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You\'ve sworn to protect nature\'s holy places and the spirits within. You can use Diplomacy to Make an Impression on animals and make simple Requests of them. You gain +2 circumstance bonus to Make an Impression when interacting with a beast, fey, or kami. Edict: aid any animal or nature spirit in need.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Diplomacy on animals (Impression + simple Requests). +2 circumstance to Make an Impression vs beast/fey/kami. Edict: aid animals and nature spirits in need.',
  },
  {
    id: 'spirit-warrior-tricksterbane-oath',
    name: 'Tricksterbane Oath',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'You\'ve sworn to ferret out and destroy malevolent shapechangers posing as mortals. You gain +4 circumstance bonus to Perception to detect a shapechanged creature\'s disguise and +2 to Recall Knowledge about shapechangers. Whenever you use Overwhelming Combination against a shapechanged creature, you attempt to counteract one polymorph effect (counteract rank = half level rounded up, check modifier = CHA + weapon proficiency). Edict: reveal and slay evil or predatory shapechangers.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: '+4 circumstance to Perception vs disguised shapechangers. +2 circumstance to Recall Knowledge on shapechangers. Overwhelming Combination: counteract polymorph (rank = half level, CHA + weapon proficiency). Edict: reveal/slay evil shapechangers.',
  },

  // ─── Level 6 ───
  {
    id: 'spirit-warrior-cutting-heaven-crushing-earth',
    name: 'Cutting Heaven, Crushing Earth',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your skill in combining fist and blade has grown into a seamless art. As long as you have invested handwraps of mighty blows, their runes also apply to a single weapon usable with Overwhelming Combination. When you hit with this weapon, the target is off-guard to your next fist Strike before end of your next turn. When you hit with your fist, the target is off-guard to your next Strike with a one-handed, agile, or finesse melee weapon before end of your next turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Handwraps runes apply to weapon used with Overwhelming Combination. Weapon hit → target off-guard vs fist. Fist hit → target off-guard vs weapon. Each until end of next turn.',
  },
  {
    id: 'spirit-warrior-flowing-palm-deflection',
    name: 'Flowing Palm Deflection',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'The precise movements of your hands allow you to deflect blows with the same efficacy as a raised shield. When you parry with your fist, the circumstance bonus to AC increases from +1 to +2.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Fist parry AC bonus: +1 → +2.',
  },
  {
    id: 'spirit-warrior-spirit-of-the-blade',
    name: 'Spirit of the Blade',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You charge your blade with spiritual energy, allowing it to cut through spirits and fiends with fearsome efficiency. Your next Strike deals an additional 1d6 spirit damage. This bonus damage is lost if you don\'t attempt a Strike before the start of your next turn. At 10th level: 2d6 spirit damage. At 18th level: 3d6 spirit damage.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Next Strike: +1d6 spirit damage (2d6 at 10th, 3d6 at 18th). Lost if no Strike before start of next turn. Flourish (1/turn).',
  },
  {
    id: 'spirit-warrior-sword-light-wave',
    name: 'Sword-light Wave',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You channel spiritual energy through your weapon, unleashing it as a torrent of power. Make a ranged Strike against an opponent within 60 feet using a one-handed, agile, or finesse melee weapon, or your fist. The attack uses your normal proficiency and same traits/damage dice/runes, but all damage is spirit damage.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Ranged Strike within 60 ft using melee weapon (one-handed/agile/finesse) or fist. Normal proficiency, traits, dice, runes. All damage becomes spirit damage.',
  },

  // ─── Level 8 ───
  {
    id: 'spirit-warrior-gods-palm',
    name: "Gods' Palm",
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You control your spirit energy when you attack, using it to reinforce yourself or to thrust past enemy defenses. Make a fist Strike; on a success, choose one: deal all damage as spirit damage, OR deal damage as normal but gain temporary HP equal to half your level for 1 round.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Fist Strike. On success, choose: (1) all damage as spirit, OR (2) normal damage + temp HP = half level for 1 round. Flourish (1/turn).',
  },
  {
    id: 'spirit-warrior-sheltering-pulse',
    name: 'Sheltering Pulse',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'You thrust your hand or weapon into the ground and release a pulse that creates a sheltering nexus of energy. Choose an unoccupied square within 15 feet. The nexus appears in a 15-foot emanation around that square and lasts for 3 rounds. You and your allies gain a +1 status bonus to AC while in the area.',
    implemented: 'full',
    traits: ['Archetype', 'Manipulate'],
    actionCost: 2,
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: '15-ft emanation nexus around unoccupied square within 15 ft. Duration: 3 rounds. Allies in area: +1 status to AC.',
  },

  // ─── Level 10 ───
  {
    id: 'spirit-warrior-transcendent-deflection',
    name: 'Transcendent Deflection',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'You charge your weapon with spiritual energy and intercept an attack. The weapon becomes broken, and the target is unharmed by the attack. If you\'re carrying another one-handed, agile, or finesse melee weapon, you can immediately swap it for the broken weapon.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'reaction',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Reaction (1/10 min). Trigger: enemy within reach would damage you/ally with an attack. Requires one-handed/agile/finesse melee weapon. Weapon becomes broken, attack negated. Can swap to another qualifying weapon.',
  },

  // ─── Level 12 ───
  {
    id: 'spirit-warrior-intercepting-hand',
    name: 'Intercepting Hand',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your martial art includes defensive actions to remove your opponent\'s ability to cause harm. Your fist unarmed attack gains the disarm trait. You gain the Disarming Interception reaction: when an enemy within reach targets you or an ally with a weapon Strike while you have your fist positioned to parry, attempt to Disarm with a +2 status bonus. On success, the triggering attack is disrupted. On critical success with a free hand, catch the weapon.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Fist gains disarm trait. Disarming Interception [reaction]: Trigger: enemy weapon Strike vs you/ally. Requires fist parry. Disarm with +2 status. Success: attack disrupted. Crit success + free hand: catch weapon.',
  },
  {
    id: 'spirit-warrior-sword-of-sealing',
    name: 'Sword of Sealing',
    source: 'Spirit Warrior (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your spiritual power pierces both body and soul, pinning your foe in place. Make a melee Strike with a one-handed, agile, or finesse weapon, or your fist. On a successful hit, the target must succeed at a Fortitude save against the higher of your class DC or spell DC, or become immobilized. The target can end the immobilization with a successful Escape attempt against the same DC.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 2,
    prerequisites: ['Spirit Warrior Dedication'],
    mechanics: 'Melee Strike (one-handed/agile/finesse or fist). On hit: Fort save vs higher of class DC or spell DC. Fail: immobilized (Escape to end, same DC).',
  },
];

// ──────────────────────────────────────────────────────────
// OSTILLI HOST  (Howl of the Wild pg. 70)
// Category: Mystical — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=222
// Symbiotic bond with an ostilli organism that absorbs
// and redirects ambient magic. 12 feats total.
// ──────────────────────────────────────────────────────────

export const OSTILLI_HOST_FEATS: FeatEntry[] = [
  // ─── Level 2 ───
  {
    id: 'ostilli-host-dedication',
    name: 'Ostilli Host Dedication',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'You bond with a symbiotic ostilli grafted to your body. You become trained in Ostilli Lore (expert if already trained). The ostilli is Tiny, grafted, and can\'t be targeted separately. It constantly siphons ambient magic, granting two actions. Repel Ambient Magic (1 action, concentrate): +1 circumstance to AC and saves vs next magical effect targeting you (+2 at 12th). Spit Ambient Magic (1 action, concentrate, magical, 1/round): 30-ft ranged dart dealing 1d6 piercing (basic Reflex, +1d6 at 6th and every 4 levels) vs higher of class DC or spell DC.',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Arcana or Nature'],
    mechanics: 'Trained in Ostilli Lore. Repel Ambient Magic [one-action]: +1 circumstance AC/saves vs next magical effect (+2 at 12th). Spit Ambient Magic [one-action] (1/round): 30-ft dart, 1d6 piercing basic Reflex (+1d6 at 6th, every 4 levels). Access: surki ancestry. Dedication-lock enforced by validateDedicationTaking().',
  },

  // ─── Level 4 ───
  {
    id: 'ostilli-host-soothing-pulse',
    name: 'Soothing Pulse',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your ostilli can convert stored magic into a curative balm. You gain the Administer Ambient Magic action (2 actions, healing, once per hour): regain 2d4 Hit Points and immediately attempt a flat check to recover from persistent bleed damage with DC reduced to 10. Healing increases by 2d4 at 8th level and every 4 levels thereafter.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Grants Administer Ambient Magic [two-action] (1/hour, healing). Heal 2d4 HP (+2d4 at 8th, every 4 levels). Flat check vs persistent bleed at DC 10.',
  },
  {
    id: 'ostilli-host-tactile-magic-feedback',
    name: 'Tactile Magic Feedback',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your ostilli can sense nearby spellcasters. You gain spellsense as an imprecise sense with a range of 60 feet, which detects only creatures capable of casting spells (including innate spells). You also gain a +2 circumstance bonus to Recall Knowledge checks about creatures you\'re detecting with spellsense.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Spellsense (imprecise) 60 ft — detects spellcasting creatures only. +2 circumstance to Recall Knowledge on detected creatures.',
  },
  {
    id: 'ostilli-host-versatile-mutation',
    name: 'Versatile Mutation',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your ostilli\'s darts can deal different types of damage. When you Spit Ambient Magic, you can choose bludgeoning or slashing instead of piercing. At 8th level, choose one energy type (acid, cold, electricity, fire, or sonic); your ostilli can deal that damage type instead, and the action gains that trait.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Spit Ambient Magic: can deal bludgeoning or slashing instead of piercing. At 8th: choose one energy type (acid/cold/electricity/fire/sonic) as additional option.',
    subChoices: { label: 'Choose an energy type (8th level)', options: [
      { id: 'acid', name: 'Acid' },
      { id: 'cold', name: 'Cold' },
      { id: 'electricity', name: 'Electricity' },
      { id: 'fire', name: 'Fire' },
      { id: 'sonic', name: 'Sonic' },
    ] },
  },

  // ─── Level 6 ───
  {
    id: 'ostilli-host-cloaking-pulse',
    name: 'Cloaking Pulse',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your ostilli can emit illusion magic to mask your position. You gain the Drape Ambient Magic action (1 action, illusion, once per round): your ostilli converts stored magic into a bubble of refracting light. You become hidden to all creatures until the end of your turn. If you Strike a creature, that creature is off-guard against that attack, and you then become observed.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Grants Drape Ambient Magic [one-action] (illusion, 1/round). Become hidden until end of turn. Strike makes target off-guard vs that attack, then you become observed.',
  },
  {
    id: 'ostilli-host-deflecting-pulse',
    name: 'Deflecting Pulse',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your ostilli can use stored magic to protect you from energy damage. You gain the Turn Aside Ambient Magic action (1 action, concentrate): choose acid, cold, electricity, fire, or sonic damage. Until the beginning of your next turn, you gain resistance against the chosen damage type equal to half your level.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Grants Turn Aside Ambient Magic [one-action] (concentrate). Choose acid/cold/electricity/fire/sonic. Resistance = half level to chosen type until start of next turn.',
    subChoices: { label: 'Choose damage type to resist', options: [
      { id: 'acid', name: 'Acid' },
      { id: 'cold', name: 'Cold' },
      { id: 'electricity', name: 'Electricity' },
      { id: 'fire', name: 'Fire' },
      { id: 'sonic', name: 'Sonic' },
    ] },
  },
  {
    id: 'ostilli-host-propulsive-mutation',
    name: 'Propulsive Mutation',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your ostilli can fire its dart farther. When you Spit Ambient Magic, the range increases from 30 feet to 60 feet.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Spit Ambient Magic range: 30 ft → 60 ft.',
  },

  // ─── Level 8 ───
  {
    id: 'ostilli-host-chaining-mutation',
    name: 'Chaining Mutation',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'The dart fired by your ostilli can ricochet to a second target. The first time each round that a target takes damage from your Spit Ambient Magic, you can choose a second target within 20 feet of the first; that target is also affected by Spit Ambient Magic.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Spit Ambient Magic: 1/round, if target takes damage, choose second target within 20 ft of first for same effect.',
  },
  {
    id: 'ostilli-host-deadly-mutation',
    name: 'Deadly Mutation',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'The dart fired by your ostilli is more dangerous. The damage dice of Spit Ambient Magic increase to d8s, and when a target critically fails its save, it also takes 1d6 persistent bleed damage. If you dealt energy damage with Spit Ambient Magic (e.g., fire via Versatile Mutation), the persistent damage is of that energy type instead of bleed.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Spit Ambient Magic: damage dice → d8s. Crit fail: +1d6 persistent bleed (or matching energy type if Versatile Mutation used).',
  },

  // ─── Level 10 ───
  {
    id: 'ostilli-host-spell-swallow',
    name: 'Spell Swallow',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'Your ostilli can completely consume a spell cast at you. You gain the Devour Ambient Magic reaction (concentrate, once per day): when a creature Casts a Spell targeting only you, you can attempt to counteract the spell with an Arcana or Nature check and a counteract rank equal to half your level.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Grants Devour Ambient Magic [reaction] (1/day, concentrate). Trigger: creature Casts a Spell targeting only you. Counteract with Arcana or Nature, counteract rank = half level.',
  },
  {
    id: 'ostilli-host-spraying-mutation',
    name: 'Spraying Mutation',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'Your ostilli can launch a multitude of darts at once over a short distance. When you Spit Ambient Magic, you can have it affect all creatures within a 15-foot cone instead of the normal single target.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Spit Ambient Magic: can target 15-ft cone instead of single target.',
  },

  // ─── Level 12 ───
  {
    id: 'ostilli-host-cellular-reconstruction',
    name: 'Cellular Reconstruction',
    source: 'Ostilli Host (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your ostilli takes control of your nervous system and kicks your cellular functions into overdrive when you\'re about to die. When you fail a recovery check while dying, you regain Hit Points equal to your level. For the next 2 rounds, at the start of your turn, you regain HP equal to half your level. The first time you regain HP this way, reduce your wounded condition by 1.',
    implemented: 'full',
    traits: ['Archetype', 'Healing'],
    actionCost: 'reaction',
    prerequisites: ['Ostilli Host Dedication'],
    mechanics: 'Reaction (1/day). Trigger: fail recovery check while dying. Heal HP = level immediately. Next 2 rounds: heal half level at start of turn. First heal reduces wounded by 1.',
  },
];

// ──────────────────────────────────────────────────────────
// SWARMKEEPER  (Howl of the Wild pg. 72)
// Category: Combat Style, Core — Uncommon
// AoN: https://2e.aonprd.com/Archetypes.aspx?ID=223
// Symbiotic hive of crawling insects within your body.
// Level 2+ Dedication. 11 feats total.
// ──────────────────────────────────────────────────────────

export const SWARMKEEPER_FEATS: FeatEntry[] = [
  // ─── Level 2 ───
  {
    id: 'swarmkeeper-dedication',
    name: 'Swarmkeeper Dedication',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 2,
    description: 'Your body has become a symbiotic hive for a swarm of crawling insects. You can emit your swarm with Swarm Forth (2 actions, concentrate): swarm appears adjacent to you (Large, Speed 15, climb 15). This precludes having an animal companion. Your swarm uses your defenses, is immune to grappled/prone/restrained/mental effects, has resistance = level to physical and weakness = level to area/splash damage. Damage to the swarm is dealt to you instead. Bite and Sting (1 action): each creature in swarm\'s space takes 1d4 piercing (basic Reflex, +1d4 at 4th and every 2 levels).',
    implemented: 'full',
    traits: ['Uncommon', 'Archetype', 'Dedication'],
    actionCost: 'passive',
    prerequisites: ['Trained in Nature'],
    mechanics: 'Swarm Forth [two-action]: deploy Large swarm (Speed 15, climb 15). Sustain up to 1 min. Swarm uses your defenses. Resistance = level to physical, weakness = level to area/splash. Bite and Sting [one-action]: 1d4 piercing basic Reflex (+1d4 at 4th + every 2 levels). Dedication-lock enforced by validateDedicationTaking().',
  },

  // ─── Level 4 ───
  {
    id: 'swarmkeeper-aphet-flash',
    name: 'Aphet Flash',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your swarm can emit a bright flash like aphet beetles. Each creature in its space must succeed at a Fortitude save or be dazzled for 1 round (2 rounds on a critical failure). The swarm then glows with light like a torch until it returns to your body.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: '1/round. Requires swarm outside body. Fort save vs class DC or spell DC: dazzled 1 round (crit fail: 2 rounds). Swarm glows like a torch. Flourish (1/turn).',
  },
  {
    id: 'swarmkeeper-pyre-ant-sting',
    name: 'Pyre Ant Sting',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your swarm\'s stings burn with agonizing pain, like pyre ants. Each creature in your swarm\'s space must succeed at a Fortitude save or take 1d6 persistent poison damage. A creature that critically fails is also enfeebled 1 for as long as it takes the persistent poison damage. Damage increases by 1d6 at 8th level and every 4 levels thereafter.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Requires swarm outside body. Fort save: 1d6 persistent poison (+1d6 at 8th, every 4 levels). Crit fail: also enfeebled 1 while taking persistent poison. Flourish (1/turn).',
  },
  {
    id: 'swarmkeeper-weavers-web',
    name: "Weaver's Web",
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 4,
    description: 'Your swarm can spin dense webs. When your swarm ends its turn, it fills all surfaces in its space with sticky webs lasting 1 minute. The webs are difficult terrain. A creature ending its turn in the webs must succeed at a Reflex save or be immobilized until it Escapes. The save and Escape DCs equal the higher of your class DC or spell DC. The swarm is immune to its own webs.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Requires swarm outside body. Swarm\'s space: difficult terrain webs for 1 min. End of turn in webs: Reflex save or immobilized (Escape to end). DC = higher of class/spell DC. Swarm immune. Flourish (1/turn).',
  },

  // ─── Level 6 ───
  {
    id: 'swarmkeeper-distracting-bites',
    name: 'Distracting Bites',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'You know how to take advantage of those your swarm has attacked. A creature that has taken damage from your swarm\'s Bite and Sting is off-guard against the first Strike you make against it in the same turn.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Creature damaged by Bite and Sting is off-guard vs your first Strike against it that same turn.',
  },
  {
    id: 'swarmkeeper-mobile-swarm',
    name: 'Mobile Swarm',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 6,
    description: 'Your swarm moves quickly in all kinds of environments. Your swarm\'s land and climb Speeds increase to 20 feet, and it gains a 20-foot swim Speed.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Swarm Speeds: land 20 ft, climb 20 ft, swim 20 ft (up from 15/15/none).',
  },

  // ─── Level 8 ───
  {
    id: 'swarmkeeper-carried-with-the-swarm',
    name: 'Carried with the Swarm',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'When your swarm is sharing your space and Strides, you can choose to have it carry you along. You stay in the same position within its space while it moves. This is voluntary movement and still triggers reactions based on movement. If your swarm Flies and you lack a fly Speed, you fall at the end of the movement.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'When swarm shares your space and Strides, you can ride it. Voluntary movement (triggers reactions). If swarm Flies and you can\'t fly, you fall at end.',
  },
  {
    id: 'swarmkeeper-sportlebore-choke',
    name: 'Sportlebore Choke',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 8,
    description: 'Your swarm forces insects down the throats of creatures in its space. Each creature takes 4d4 piercing damage based on a Fortitude save vs the higher of your class DC or spell DC. Damage increases by 1d4 at 10th level and every 2 levels. Regardless of save result, the creature is immune to Sportlebore Choke for 1 hour. Critical Success: unaffected. Success: half damage, sickened 1. Failure: full damage, sickened 1. Critical Failure: double damage, sickened 2.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 1,
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Requires swarm outside body. Fort save: 4d4 piercing (+1d4 at 10th + every 2 levels). Crit success: nothing. Success: half + sickened 1. Fail: full + sickened 1. Crit fail: double + sickened 2. Immune 1 hour after. Flourish (1/turn).',
  },

  // ─── Level 10 ───
  {
    id: 'swarmkeeper-veil-of-bugs',
    name: 'Veil of Bugs',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 10,
    description: 'Your swarm is dense, blotting out vision. You and your allies gain lesser cover when in your swarm\'s space.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'You and allies gain lesser cover (+1 circumstance to AC) while in swarm\'s space.',
  },

  // ─── Level 12 ───
  {
    id: 'swarmkeeper-buzzing-death-cicadas',
    name: 'Buzzing Death Cicadas',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 12,
    description: 'Your swarm takes on characteristics of the death cicadas of the Mana Wastes. The swarm gains a fly Speed of 20 feet. You also gain the Death Drone action (1 action, auditory, flourish, mental): each creature in your swarm\'s space takes 6d4 mental damage and must attempt a Will save. Critical Success: unaffected. Success: half damage. Failure: full damage, frightened 1, -2 circumstance penalty to Perception checks requiring hearing. Critical Failure: double damage, frightened 2, deafened until start of your next turn.',
    implemented: 'full',
    traits: ['Archetype', 'Flourish'],
    actionCost: 'passive',
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Swarm gains fly Speed 20 ft. Death Drone [one-action] (auditory, flourish, mental): 6d4 mental, Will save. Crit success: none. Success: half. Fail: full + frightened 1 + -2 Perception (hearing). Crit fail: double + frightened 2 + deafened 1 round.',
  },

  // ─── Level 14 ───
  {
    id: 'swarmkeeper-expanded-swarm',
    name: 'Expanded Swarm',
    source: 'Swarmkeeper (Archetype)',
    category: 'archetype',
    level: 14,
    description: 'Your hive has grown to the point where it is difficult to keep your swarm contained. When you release your swarm with Swarm Forth, you can choose for it to be Huge instead of Large.',
    implemented: 'full',
    traits: ['Archetype'],
    actionCost: 'passive',
    prerequisites: ['Swarmkeeper Dedication'],
    mechanics: 'Swarm Forth: can choose Huge instead of Large.',
  },
];

// ──────────────────────────────────────────────────────────
// COMBINED CATALOG
// ──────────────────────────────────────────────────────────

export const STANDALONE_ARCHETYPE_FEATS_NON_CORE_TH: FeatEntry[] = [
  ...FAMILIAR_SAGE_FEATS,
  ...FAN_DANCER_FEATS,
  ...FIVE_BREATH_VANGUARD_FEATS,
  ...SPIRIT_WARRIOR_FEATS,
  ...OSTILLI_HOST_FEATS,
  ...SWARMKEEPER_FEATS,
];
