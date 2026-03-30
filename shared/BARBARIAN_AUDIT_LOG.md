# Barbarian Feat Audit Log
**Last updated: 2026-02-24**
**Status: COMPLETE — all data collected, rewrite in progress**

---

## CLASS FEATURES (Correct AoN Remastered Progression — PC2 pg 70-76)

All features below are CONFIRMED from https://2e.aonprd.com/Classes.aspx?ID=57

| Level | Feature | Notes |
|-------|---------|-------|
| 1 | Rage | [1-action] Concentrate, Rage. +2 damage, -1 AC, can't use Concentrate except Rage actions. Lasts 1 minute or until no enemies/hostile actions for 1 round. |
| 1 | Quick-Tempered | [free-action] Trigger: You roll initiative. Rage as free action. At L11+ gain bonus damage. |
| 1 | Instinct | Choose animal, dragon, fury, giant, spirit, superstition. Grants instinct ability + anathema. |
| 1 | Barbarian Feat | — |
| 3 | Furious Footfalls | +5 ft Speed. While raging +10 ft Speed. |
| 5 | Brutality | Martial weapons expert. Unarmed attacks expert. |
| 7 | Juggernaut | Fortitude saves master. Successes → crit successes. (SHARED: createClassFeature(JUGGERNAUT, 'Barbarian', 7)) |
| 7 | Weapon Specialization | +2/+3/+4 damage by proficiency. (SHARED: createClassFeature(WEAPON_SPECIALIZATION, 'Barbarian', 7)) |
| 9 | Raging Resistance | Resistance while raging based on instinct type. Amount = 3 + Constitution modifier. |
| 9 | Reflex Expertise | Reflex saves → expert. |
| 11 | Mighty Rage | Class DC → expert. Quick-Tempered Strike damage increases. |
| 13 | Greater Juggernaut | Fortitude saves legendary. Crit fails → fails. Take half on fail. |
| 13 | Medium Armor Expertise | Light + medium armor → expert. Unarmored → expert. |
| 13 | Weapon Mastery | Martial weapons → master. |
| 15 | Greater Weapon Specialization | Double weapon spec damage. (SHARED: createClassFeature(GREATER_WEAPON_SPECIALIZATION, 'Barbarian', 15)) |
| 15 | Indomitable Will | Will saves → master. Successes → crit successes. |
| 17 | Perception Mastery | Perception → master. |
| 17 | Revitalizing Rage | Quickened during first round of a new Rage. |
| 19 | Armor Mastery | Light + medium armor → master. Unarmored → master. |
| 19 | Devastator | Class DC → master. Melee Strikes ignore first 10 points of resistance. |

### Current File ERRORS (to fix in rewrite):
- ❌ MISSING: Quick-Tempered (L1), Furious Footfalls (L3), Raging Resistance (L9), Reflex Expertise (L9), Revitalizing Rage (L17)
- ❌ WRONG: "Deny Advantage" at L3 — this is a Rogue feature, NOT Barbarian
- ❌ WRONG LEVEL: "Greater Juggernaut" at L9 → should be L13
- ❌ WRONG LEVEL: "Medium Armor Expertise" at L11 → should be L13
- ❌ WRONG NAME/LEVEL: "Weapon Fury" at L11 → "Weapon Mastery" at L13
- ❌ WRONG NAME/LEVEL: "Heightened Senses" at L13 → "Perception Mastery" at L17
- ❌ WRONG NAME: "Armor of Fury" at L19 → "Armor Mastery"
- ❌ WRONG NAME/DESC: "Devastating Strikes" at L19 → "Devastator" (class DC master + ignore 10 resistance)
- ❌ WRONG DESC: "Mighty Rage" at L11 → Remastered version is class DC expert + Quick-Tempered bonus damage

---

## CLASS FEATS — CONFIRMED FROM AoN (PC2 source, trait ID 813)

### Level 1
| Feat | Action | Traits | Prerequisites | Description (AoN) | AoN ID |
|------|--------|--------|---------------|-------------------|--------|
| Acute Vision | passive | Barbarian | — | When you are raging, your visual senses improve, granting you darkvision. | 5810? |
| Adrenaline Rush | passive | Barbarian, Rage | — | In the heat of battle, you are capable of amazing feats of strength. | — |
| Draconic Arrogance | passive | Barbarian, Rage | dragon instinct | Few can sway you from your goals while the fury of combat fills you. | — |
| Moment of Clarity | 1-action | Barbarian, Concentrate, Rage | — | You push back your rage for a moment in order to think clearly. | — |
| Raging Intimidation | passive | Barbarian | — | Your fury fills your foes with fear. | — |
| Raging Thrower | passive | Barbarian | — | Thrown weapons become especially deadly in your fury. | — |
| Sudden Charge | 2-actions | Barbarian, Fighter, Flourish | — | With a quick sprint, you dash up to your foe and swing. Stride twice, then Strike. | shared w/ Fighter |

### Level 2
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Acute Scent | passive | Barbarian | — | When your anger is heightened, your sense of smell improves. When raging gain imprecise scent 30 ft. | — |
| Bashing Charge | 2-actions | Barbarian, Flourish | Trained Athletics | You smash, bust, and charge through solid obstacles without hesitation. | NEW - not in old file |
| Furious Finish | 1-action | Barbarian, Rage | — | Desperate to finish the fight, you pour all your rage into one final blow. Maximise damage dice on next strike, then rage ends. | NEW |
| Intimidating Strike | 2-actions | Barbarian, Fighter, Emotion, Fear, Mental | — | Your blow not only wounds creatures but also shatters their confidence. Strike + Demoralize. | shared w/ Fighter, NEW |
| No Escape | reaction | Barbarian, Rage | — | Trigger: enemy within reach attempts to move away. You keep pace with a retreating foe. Stride up to your Speed following the enemy. | — |
| Second Wind | passive | Barbarian | — | You can enter a second rage, but afterward you need to catch your breath. | — |
| Shake It Off | 1-action | Barbarian, Concentrate, Rage | — | You concentrate on your rage, overcoming fear and fighting back sickness. Reduce frightened by 1, attempt save vs sickened. | — |

### Level 4
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Barreling Charge | 2-actions | Barbarian, Fighter, Flourish | Trained Athletics | You rush forward, moving enemies aside to reach your foe. | shared w/ Fighter, NEW |
| Oversized Throw | 2-actions | Barbarian, Rage | hands free | With a great heave, you seize a piece of your surroundings, such as a boulder, log, table, wagon, or chunk of earth, and hurl it at your foes. | NEW |
| Raging Athlete | passive | Barbarian | Expert Athletics | Physical obstacles can't hold back your fury. While raging, climb/swim don't trigger reactions, high jump/long jump as 1 action. | — |
| Scars of Steel | reaction | Barbarian, Rage | fury instinct (freq: 1/day) | Trigger: crit hit with physical damage. Flex muscles to turn aside some damage. | NEW |
| Spiritual Guides | reaction | Barbarian, Fortune | spirit instinct (freq: 1/day) | Trigger: fail (not crit fail) Perception/skill check. Spirits guide you to reroll. | NEW |
| Supernatural Senses | passive | Barbarian, Rage | Acute Scent or scent | Your scent is preternaturally sharp; can rely on smell when vision is compromised. | NEW |
| Swipe | 2-actions | Barbarian, Fighter, Flourish | — | You make a wide, arcing swing. Strike two adjacent targets. | shared w/ Fighter |
| Wounded Rage | reaction | Barbarian | — | Trigger: take damage, capable of raging. You Rage as a reaction. | NEW |

### Level 6
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Animal Skin | passive | Barbarian, Morph, Primal | animal instinct | Unarmored defense → expert. | NEW |
| Brutal Bully | passive | Barbarian | Expert Athletics | Shove/Trip/Grapple/Disarm deal your Str mod damage on success. | NEW |
| Cleave | reaction | Barbarian, Rage | — | Trigger: melee Strike reduces enemy to 0 HP, another adjacent. Swing through to Strike adjacent enemy. | — |
| Dragon's Rage Breath | 2-actions | Barbarian, Concentrate, Rage | dragon instinct (freq: 1/10min) | 30-ft cone, 1d6/level damage, basic Reflex vs class DC. | NEW |
| Giant's Stature | 1-action | Barbarian, Polymorph, Primal, Rage | Giant instinct (req: Medium or smaller) | Grow to Large, +5 ft reach, clumsy 1. | NEW |
| Inner Strength | 1-action | Barbarian, Concentrate, Rage | spirit instinct | Your strength is part of your rage. Gain temp HP. | NEW |
| Mage Hunter | 2-actions | Barbarian, Rage | superstition instinct (req: seen target Cast a Spell) | Stride + Strike vs spellcaster. +2 circumstance bonus to attack. | NEW |
| Nocturnal Senses | passive | Barbarian, Rage | low-light vision or scent | While raging: low-light → darkvision, scent becomes precise 10 ft. | NEW |
| Reactive Strike | reaction | Barbarian (+6 other classes) | — | Trigger: creature in reach uses manipulate/move action, ranged attack, or leaves square. Strike vs triggering creature. | Renamed from "Attack of Opportunity" |
| Scouring Rage | free-action | Barbarian | instinct that changes Rage damage type (trigger: You Rage) | Emit surge of instinctual energy dealing damage in 5-ft emanation. | NEW |
| Spirits' Interference | 1-action | Barbarian, Divine, Rage | spirit instinct | Call forth protective spirits. Ranged attacks vs you are off-guard until start of next turn. | NEW |

### Level 8
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Animalistic Brutality | 1-action | Barbarian, Concentrate, Morph, Primal, Rage | animal instinct | Deepen animal connection. Unarmed strikes from instinct gain extra damage die. | NEW |
| Disarming Assault | 1-action | Barbarian, Flourish, Rage | Trained Athletics | Attack to knock weapon from foe's hands. Strike + free Disarm. | NEW |
| Follow-up Assault | 1-action | Barbarian, Rage | — (req: previous action was melee strike that missed) | Press the attack after a miss. Make another Strike with same MAP. | NEW |
| Friendly Toss | 2-actions | Barbarian, Manipulate, Rage | — (req: adjacent ally, hand free) | Toss willing ally up to 30 feet. | NEW |
| Furious Bully | passive | Barbarian | Master Athletics | Shove/Trip/Grapple/Disarm deal Str mod *2 damage. | NEW |
| Instinctive Strike | passive | Barbarian | Acute Scent or Scent | Use scent to pinpoint hidden enemies. While raging, don't need to succeed flat check to target concealed creatures your scent can detect. | NEW |
| Invulnerable Rager | passive | Barbarian | — | Even heavy armor serves to enhance your fury. Reduce AC penalty from Rage by 1 while wearing heavy armor. | NEW |
| Renewed Vigor | 1-action | Barbarian, Concentrate, Rage | — | Gain temporary HP = half level + Con modifier. | — (was not in old file correctly) |
| Share Rage | 1-action | Auditory, Barbarian, Rage, Visual | — (req: haven't used since last Raged) | Stoke ally's fury. Ally within 30 ft gains Rage bonus damage. | NEW |
| Sudden Leap | 2-actions | Barbarian, Fighter | — | Leap and Strike while soaring. Long Jump or High Jump, Strike at any point. | shared w/ Fighter |
| Thrash | 1-action | Barbarian, Rage | — (req: enemy grabbed/restrained) | Deal weapon damage + specialization to grabbed enemy, basic Fort save. | — |

### Level 10
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Come and Get Me | 1-action | Barbarian, Concentrate, Rage | — | Become off-guard, enemies get +2 damage. If hit, that creature is off-guard to you; hitting them grants temp HP = Con mod (double on crit). Lasts until rage ends. | — (was in old file) |
| Furious Sprint | 2-actions/3-actions | Barbarian, Rage | — | Stride up to 5 times (or 8 with 3 actions). Must be straight line. Can substitute Balance (using Athletics). | NEW |
| Great Cleave | passive | Barbarian, Rage | Cleave | When Cleaving, if Strike also reduces to 0, continue making Strikes until one doesn't reduce to 0 or no adjacent enemies. | — |
| Impressive Landing | reaction | Barbarian | — (trigger: fall 10+ feet, land on solid surface) | Fall treated as 10 ft shorter. Land on feet. 5-ft emanation = difficult terrain, 5 bludgeoning damage, creatures off-guard. | NEW |
| Knockback | 1-action | Barbarian, Rage | — (req: last action was successful Strike) | Push enemy 5 feet (as Shove success). Can follow. | — |
| Overpowering Charge | passive | Barbarian, Fighter | Barreling Charge | Trample foes as you charge past. | shared w/ Fighter, NEW |
| Resounding Blow | 2-actions | Barbarian | — (req: melee weapon w/ bludgeoning) | Strike. If hits+damages, target deafened until start of your next turn (1 min on crit). | NEW |
| Silencing Strike | 1-action | Barbarian, Incapacitation, Rage | — | Melee Strike, enemy Fort save vs class DC. F: stunned 1, DC 11 flat check for linguistic/spells. CF: stunned 3. | NEW |
| Tangle of Battle | reaction | Barbarian, Rage | — (trigger: crit hit adjacent enemy) | Attempt to Grapple triggering enemy. | NEW |
| Terrifying Howl | 1-action | Auditory, Barbarian, Rage | — | Demoralize each enemy within 30 ft (no language penalty). Each target then immune 1 min. | — |

### Level 12
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Dragon's Rage Wings | 1-action | Barbarian, Morph, Rage | dragon instinct | Sprout wings, gain fly Speed = land Speed while raging. Fall safely when rage ends. | NEW |
| Embrace the Pain | reaction | Barbarian, Rage | — (trigger: creature in reach damages you with melee) | Attempt Grapple or Disarm vs triggering creature. | NEW |
| Furious Grab | 1-action | Barbarian, Rage | — (req: last action successful Strike, hand free or grapple weapon) | Enemy hit becomes grabbed, as if successful Grapple. | NEW |
| Predator's Pounce | 1-action | Barbarian, Flourish, Rage | animal instinct (req: unarmored/light armor) | Stride up to Speed + Strike at end. | NEW |
| Spirit's Wrath | 1-action | Attack, Barbarian, Concentrate, Rage | spirit instinct | Wisp attacks enemy within 120 ft. 4d8+Con spirit damage. Crit = double + frightened 1. | NEW |
| Sunder Spell | 2-actions | Attack, Barbarian, Concentrate, Rage | superstition instinct | Melee Strike vs creature/object/spell. Attempt counteract vs spell/magical effect. | NEW |
| Titan's Stature | passive | Barbarian | Giant's Stature | Can become Huge with Giant's Stature (+10 ft reach if Medium or smaller). | NEW |
| Unbalancing Sweep | 3-actions | Barbarian, Flourish | — | Choose 3 enemies in reach, choose Shove or Trip all. Separate Athletics vs each. | NEW |

### Level 14
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Awesome Blow | passive | Barbarian, Concentrate, Rage | Knockback | Use Knockback with Athletics vs Fort DC. CritS: Shove+Trip crit. S: Shove+Trip. F: normal Knockback. | — |
| Impaling Thrust | 2-actions | Barbarian, Rage | — (req: melee piercing weapon) | Strike, if hits target is grabbed. When freed, persistent bleed = weapon damage dice count. | NEW |
| Sunder Enchantment | passive | Barbarian | Sunder Spell | Sunder Spell can also counteract magic items (mundane for 10 min). | NEW |
| Whirlwind Strike | 3-actions | Barbarian, Fighter, Flourish | — | Strike all enemies within reach. | shared w/ Fighter |

| Giant's Lunge | 1-action | Barbarian, Concentrate, Rage | Giant instinct | All melee weapons and unarmed attacks gain reach 10 feet until rage ends. | ID 5863 ✅ |
| Vengeful Strike | reaction | Barbarian, Rage | Come and Get Me | Trigger: creature in reach succeeds attack. Make melee Strike. If crit success trigger, Strike is free action instead. | ID 5866 ✅ |

### Level 16
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Collateral Thrash | passive | Barbarian, Rage | Thrash | When you Thrash, choose adjacent enemy. That enemy also takes Thrash damage, basic Reflex vs class DC. | ID 5867 ✅ |
| Desperate Wrath | free-action | Barbarian, Rage | — (trigger: turn begins, HP ≤ half) | +2 circumstance to attacks, -1 AC, -1 saves. Until rage ends or above half HP. Renamed from "Reckless Abandon." | ID 5868 ✅ |
| Dragon Transformation | 1-action | Barbarian, Concentrate, Polymorph, Primal, Rage | Dragon's Rage Wings (freq: 1/10min) | Transform into Large dragon (6th-rank dragon form). Use own AC/attack, apply Rage damage, class DC for Dragon Breath. | ID 5869 ✅ |
| Furious Vengeance | reaction | Barbarian, Rage | fury instinct | Trigger: enemy within melee reach crit hits you with melee Strike. Immediate retaliation Strike. | ID 5870 ✅ |
| Penetrating Projectile | 2-actions | Barbarian, Flourish, Rage | — (req: ranged/thrown piercing weapon) | Projectile passes through target, potentially hitting creatures behind. | ID 5871 ✅ |
| Shattering Blows | passive | Barbarian, Rage | — | While raging, melee Strikes ignore first 5 Hardness (10 with Devastator). | ID 5872 ✅ |

### Level 18
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Brutal Critical | passive | Barbarian | — | On crit with melee: +1 extra damage die. Target takes persistent bleed = 2 damage dice. | ID 5873 ✅ |
| Perfect Clarity | reaction | Barbarian, Concentrate, Fortune, Rage | — (trigger: fail/crit fail attack or Will save) | Reroll with +2 circumstance bonus, use better. Then stop raging. | ID 5874 ✅ |
| Vicious Evisceration | 2-actions | Barbarian, Rage | — | Make vicious melee Strike. On hit, target Fort save vs class DC or drained 1 (drained 2 on CF). | ID 5875 ✅ |
| Whirlwind Toss | 2-actions | Barbarian, Rage | Collateral Thrash | Whirl a foe to smash into nearby creatures, then throw far away. | ID 5876 ✅ |

*Note: AoN ID 5877 is NOT a barbarian feat (confirmed via search — no L18 barbarian feat with that ID exists).*

### Level 20
| Feat | Action | Traits | Prerequisites | Description (AoN) | Notes |
|------|--------|--------|---------------|-------------------|-------|
| Contagious Rage | passive | Auditory, Barbarian, Rage, Visual | Share Rage | Share with all willing allies within 30 ft. They also gain instinct specialization ability. | ID 5878 ✅ |
| Quaking Stomp | 1-action | Barbarian, Manipulate, Rage | — (freq: 1/10min) | Stomp creates minor earthquake with effects of earthquake spell. | ID 5879 ✅ |
| Unstoppable Juggernaut | passive | Barbarian | — | Resistance 3+Con to all damage. At 0 HP while raging, reaction to stay at 1 HP (become wounded 2). | ID 5880 ✅ |

---

## FETCH STATUS TRACKER

### All AoN Data Collected ✅
All 81 PC2 Barbarian feats confirmed via direct ID fetch + AoN Search fallback.
All 19 class features confirmed from AoN Classes.aspx?ID=57.

**Total PC2 Barbarian feats:** 81 (L1×7, L2×7, L4×8, L6×11, L8×11, L10×10, L12×8, L14×6, L16×6, L18×4, L20×3)
**Total class features:** 19

**Resolved:**
- ID 5870 = Furious Vengeance (L16) — found via AoN Search
- ID 5871 = Penetrating Projectile (L16) — found via AoN Search  
- ID 5877 = NOT a barbarian feat (confirmed only 4 L18 feats exist)
- "Spell Deflection" = does NOT exist as PC2 barbarian feat
- "Reckless Abandon" = renamed to "Desperate Wrath" (ID 5868)

---

## NON-PC2 FEATS (from supplemental sources, also have Barbarian trait 813)
These appeared in the feat list but are from other sources. Include common ones, skip uncommon/AP-specific:

### From Rage of Elements:
- Elemental Evolution (L2) — prereq: elemental instinct
- Elemental Explosion (L6) — prereq: elemental instinct

### From Howl of the Wild:
- Brutal Crush (L4) — prereq: animal instinct or untamed order (also Druid)
- Creature Comforts (L4) — prereq: animal instinct or untamed order (also Druid)
- Rip and Tear (L4) — prereq: animal instinct or untamed order (also Druid)
- Towering Transformation (L14) — polymorph trigger (also Druid)

### Uncommon / AP-specific (SKIP):
- Farabellus Flip (L4) — Uncommon, PFS Guide
- Inured to Alchemy (L4) — Uncommon, Outlaws of Alkenstar
- Pain Tolerance (L6) — Uncommon, Outlaws of Alkenstar
- Ghost Wrangler (L4) — Uncommon, Knights of Lastwall
- Corpse-Killer's Defiance (L10) — Uncommon, Knights of Lastwall

### Legacy (trait 18, SKIP):
- Animal Rage (L8) — Core Rulebook (replaced by Animalistic Brutality in PC2)
- Determined Dash (L10) — Advanced Player's Guide

---

## PLAN FOR REWRITE
1. Retry failed IDs: 5863, 5866-5868, 5870-5871, 5875-5877, 5879
2. Write all ~17 class features with correct names/levels/descriptions
3. Write all PC2 common class feats (~55-60 feats) + Rage of Elements feats
4. Use createClassFeature() for shared templates at correct levels
5. Verify build with `cd shared; npx tsc --pretty false 2>&1`
