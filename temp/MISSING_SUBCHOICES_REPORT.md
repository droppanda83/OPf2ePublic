# Missing subChoices Audit Report

**Total feats with choice language but no `subChoices:`**: ~495  
**Files scanned**: 73 feat `.ts` files  
**Existing `subChoices:` implementations**: ~80  

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| **P1** | Permanent build choice (class feature, archetype dedication, feat selection) — definitely needs `subChoices` |
| **P2** | Permanent feat choice made when taking the feat (energy type, skill, stance, domain, weapon trait) — needs `subChoices` |
| **P3** | Daily preparation choice — could benefit from `subChoices` |
| **P4** | Runtime/combat choice or multiclass "choose 1 class feat" — may want `subChoices` for UI |
| **P5** | Marginal — "choose a target" or "choose whether to…" (binary/tactical) |

---

## Table of Contents

1. [alchemistFeats.ts](#alchemistfeatsts)
2. [ancestryFeatsAC.ts](#ancestryfeatsacts)
3. [ancestryFeatsDG.ts](#ancestryfeatsdgts)
4. [ancestryFeatsHN.ts](#ancestryfeatshnts)
5. [ancestryFeatsOV.ts](#ancestryfeatsovts)
6. [ancestryFeatsVH.ts](#ancestryfeatsvhts)
7. [animistFeats.ts](#animistfeatsts)
8. [archetypeFeats.ts (multiclass)](#archetypefeatsts-multiclass)
9. [archetypeFeatsLegacy files](#archetypefeatslegacy-files)
10. [archetypeFeatsNonCore files](#archetypefeatsnoncorefile)
11. [archetypeFeatsStandalone files](#archetypefeatsstandalone-files)
12. [barbarianFeats.ts](#barbarianfeatsts)
13. [bardFeats.ts](#bardfeatsts)
14. [championFeats.ts](#championfeatsts)
15. [clericFeats.ts](#clericfeatsts)
16. [commanderFeats.ts](#commanderfeatsts)
17. [druidFeats.ts](#druidfeatsts)
18. [exemplarFeats.ts](#exemplarfeatsts)
19. [fighterFeats.ts](#fighterfeatsts)
20. [generalFeats.ts](#generalfeatsts)
21. [guardianFeats.ts](#guardianfeatsts)
22. [gunslingerFeats.ts](#gunslingerfeatsts)
23. [inventorFeats.ts](#inventorfeatsts)
24. [investigatorFeats.ts](#investigatorfeatsts)
25. [kineticistFeats.ts](#kineticistfeatsts)
26. [magusFeats.ts](#magusfeatsts)
27. [monkFeats.ts](#monkfeatsts)
28. [oracleFeats.ts](#oraclefeatsts)
29. [psychicFeats.ts](#psychicfeatsts)
30. [rangerFeats.ts](#rangerfeatsts)
31. [rogueFeats.ts](#roguefeatsts)
32. [skillFeats.ts](#skillfeatsts)
33. [sorcererFeats.ts](#sorcererfeatsts)
34. [summonerFeats.ts](#summonerfeatsts)
35. [swashbucklerFeats.ts](#swashbucklerfeatsts)
36. [thaumaturgeFeats.ts](#thaumaturgefeatsts)
37. [witchFeats.ts](#witchfeatsts)
38. [wizardFeats.ts](#wizardfeatsts)

---

## alchemistFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `alchemist-research-field` | Research Field | P1 | Choose research field | `Bomber, Chirurgeon, Mutagenist, Toxicologist` |
| 2 | `alchemist-field-discovery` | Field Discovery | P2 | Based on research field | Options depend on field choice |
| 3 | `alchemist-perpetual-infusions` | Perpetual Infusions | P2 | Choose items based on field | Options depend on field |
| 4 | `alchemist-perpetual-potency` | Perpetual Potency | P2 | Choose based on field | Options depend on field |
| 5 | `alchemist-perpetual-perfection` | Perpetual Perfection | P2 | Choose based on field | Options depend on field |

---

## ancestryFeatsAC.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `android-emotionless` | Emotionless | P5 | Choose penalty flavor | — (passive trade-off) |
| 2 | `android-advanced-targeting-system` | Advanced Targeting System | P5 | Choose weakness or resistance to learn | — (runtime) |
| 3 | `catfolk-well-met-traveler` | Well-Met Traveler | P2 | Choose trained skill | Skill list |
| 4 | `catfolk-springing-leaper` | Springing Leaper | P5 | Choose which jump | — (runtime) |
| 5 | `catfolk-saber-teeth` | Saber Teeth | P2 | Choose 2nd jaws damage die | `1d8 slashing, 1d6 piercing + backstabber` |
| 6 | `conrasu-ceremony-of-knowledge` | Ceremony of Knowledge | P2 | Choose a skill | All skills |
| 7 | `conrasu-ceremony-of-the-evened-hand` | Ceremony of the Evened Hand | P2 | Choose damage type | `Bludgeoning, Piercing, Slashing` |

---

## ancestryFeatsDG.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `dwarf-forge-dwarf` | Forge Dwarf | P5 | Fire vs cold choice context | — (passive) |
| 2 | `dwarf-clan-protector` | Clan Protector | P2 | Choose small/medium shield | `Steel Shield, Wooden Shield, etc.` |
| 3 | `elf-know-your-own` | Know Your Own | P2 | Choose tradition | `Arcane, Divine, Occult, Primal` |
| 4 | `elf-brightness-seeker` | Brightness Seeker | P2 | Choose cantrip | `Dancing Lights, Light, etc.` |
| 5 | `fetchling-skiff` | Skiff | P2 | Choose Occultism or Religion | `Occultism, Religion` |
| 6 | `gnoll-pack-stalker` | Pack Stalker | P5 | Choose terrain | — (runtime) |
| 7 | `gnome-first-world-magic` | First World Magic | P2 | Choose cantrip | Primal cantrips |
| 8 | `gnome-energized-font` | Energized Font | P2 | Choose energy type | `Acid, Cold, Electricity, Fire` |
| 9 | `goblin-burn-it` | Burn It! | P5 | Flavor only | — |
| 10 | `grippli-hunter-grippli` | Hunter Grippli | P2 | Choose prey type | Creature types |

---

## ancestryFeatsHN.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `halfling-cultural-adaptability` | Cultural Adaptability | P2 | Choose 1st-level ancestry feat | Ancestry feats from adopted culture |
| 2 | `human-natural-ambition` | Natural Ambition | P2 | Choose 1st-level class feat | Class feats |
| 3 | `human-multitalented` | Multitalented | P2 | Choose multiclass dedication | Multiclass dedications |
| 4 | `human-clever-improviser` | Clever Improviser | P5 | Uses untrained | — (passive) |
| 5 | `kashrishi-glean-lore` | Glean Lore | P5 | Sense info from creatures | — (runtime) |
| 6 | `kitsune-foxfire` | Foxfire | P2 | Choose tradition | `Arcane, Divine, Occult, Primal` |
| 7 | `kobold-kobold-breath` | Kobold Breath | P2 | Choose energy + shape | `Acid/line, Fire/cone, etc.` |
| 8 | `leshy-leshy-superstition` | Leshy Superstition | P5 | Flavor choices | — |
| 9 | `lizardfolk-parthenogenic-hatchling` | Parthenogenic Hatchling | P2 | Choose 1st-level ancestry feat | Lizardfolk ancestry feats |
| 10 | `nagaji-hypnotic-lure` | Hypnotic Lure | P5 | Choose a creature | — (runtime) |
| 11 | `nephilim-celestial-resistance` | Celestial Resistance | P2 | Choose energy resistance | Energy types by lineage |

---

## ancestryFeatsOV.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `orc-hold-mark` | Hold Mark | P2 | Choose skill | Skills |
| 2 | `ratfolk-cheek-pouches` | Cheek Pouches | P5 | Choose items to carry | — (inventory) |
| 3 | `sprite-energize-wings` | Energize Wings | P2 | Choose energy type | Energy types |
| 4 | `tengu-storm-birth` | Storm Birth | P2 | Choose cantrip or resistance | Options vary |
| 5 | `vanara-ragdya-dance` | Ragdya's Dance | P5 | Choose movement | — (runtime) |

---

## ancestryFeatsVH.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `versatile-heritage-ancient-blood-magic` | Ancient Blood Magic | P2 | Choose arcane/occult + cantrip | `Arcane, Occult` + cantrip list |
| 2 | `versatile-heritage-celestial-resistance` | Celestial Resistance (VH) | P2 | Choose energy | Energy types by lineage |
| 3 | `versatile-heritage-fiendish-resistance` | Fiendish Resistance | P2 | Choose energy | Energy types by lineage |
| 4 | `versatile-heritage-draconic-arcanist` | Draconic Arcanist | P2 | Choose cantrip | Arcane cantrips |
| 5 | `versatile-heritage-dragon-breath` | Dragon Breath (VH) | P2 | Choose energy + shape | Dragon type table |
| 6 | `versatile-heritage-changeling-accursed-claws` | Accursed Claws | P2 | Choose claw damage | Options vary |

---

## animistFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `animist-apparition-implementation` | Apparitions (class feature) | P1 | Choose apparitions | All apparition types |
| 2 | `animist-embodiment` | Embodiment | P1 | Choose embodiment type | Embodiment list |
| 3 | `animist-wandering-soul` | Wandering Soul | P3 | Daily choice of apparition | Apparition list |
| 4 | `animist-spiritual-strike` | Spiritual Strike | P4 | Choose vitality or void | `Vitality, Void` |
| 5 | `animist-medium` | Medium | P5 | Channel spirit information | — |

---

## archetypeFeats.ts (multiclass)

*~40+ multiclass dedication feats with "Selection mechanic: choose 1 class feat" — these all need subChoices for the class feat selection UI.*

| # | Key Feats | Priority | Choice |
|---|-----------|----------|--------|
| 1-40+ | All multiclass dedication `basic-X-spellcasting`, `breadth`, `expert-X-spellcasting`, `master-X-spellcasting` | P1 | Choose class feat from source class |
| — | Each dedication (Alchemist, Barbarian, Bard, Champion, Cleric, Druid, Fighter, etc.) | P1 | Build-time class feat selection |

---

## archetypeFeatsLegacy files

### archetypeFeatsLegacyBD1.ts
| # | Feat ID | Feat Name | Priority | Choice |
|---|---------|-----------|----------|--------|
| 1 | `assassin-dedication` | Assassin Dedication | P1 | Choose mark |
| 2 | `bastion-dedication` | Bastion Dedication | P2 | Choose shield |
| 3 | `beastmaster-special-mount` | Special Mount | P2 | Choose mature companion |

### archetypeFeatsLegacyBD2.ts
| # | Feat ID | Feat Name | Priority | Choice |
|---|---------|-----------|----------|--------|
| 1 | `blessed-one-mercy` | Mercy selection | P2 | Choose mercy condition |
| 2 | `bounty-hunter-tools-of-the-trade` | Tools of the Trade | P2 | Choose ranger feat |
| 3 | `captivator-countercharm` | Countercharm | P2 | Choose composition spell |

### archetypeFeatsLegacyFR.ts
| # | Feat ID | Feat Name | Priority | Choice |
|---|---------|-----------|----------|--------|
| 1 | `eldritch-archer-dedication` | Eldritch Archer Dedication | P2 | Choose tradition |
| 2 | `familiar-master-dedication` | Familiar Master | P2 | Choose familiar abilities |

### archetypeFeatsLegacyLO1–LO6.ts
| # | Key Feats | Priority | Choice |
|---|-----------|----------|--------|
| — | `knight-vigilant-vigilant-benediction` | P2 | Choose domain spell |
| — | `lastwall-sentry-everstand-stance` | P2 | Choose shield type |
| — | Various Lost Omens archetype choices | P2-P4 | Varies |

### archetypeFeatsLegacySM1–SM2.ts
| # | Key Feats | Priority | Choice |
|---|-----------|----------|--------|
| — | `soul-warden-cycle-spell` | P2 | Choose cycle spell |
| — | `fulminating-synergy` | P2 | Choose empowerment |
| — | `fulminating-shot` | P2 | Choose energy type |

---

## archetypeFeatsNonCore files

### archetypeFeatsNonCoreDC.ts
| # | Feat ID | Feat Name | Priority | Choice |
|---|---------|-----------|----------|--------|
| 1 | `chronoskimmer-turn-back-the-clock` | Turn Back the Clock | P4 | Choose to reverse/accept |
| 2 | `chronoskimmer-borrowed-time` | Borrowed Time | P4 | Choose action quantity |
| 3 | `commander-dedication` | Commander Dedication | P1 | Choose initial tactics |
| 4 | `demonologist-lesser-specialized-summoning` | Lesser Specialized Summoning | P2 | Choose demon specialization |

### archetypeFeatsNonCoreFR.ts
| # | Key Feats | Priority | Choice |
|---|-----------|----------|--------|
| — | `fake-it-till-you-make-it` | P2 | Choose tradition to fake |
| — | `guerrilla` | P2 | Choose terrain |
| — | `field-propagandist` | P2 | Choose propaganda benefit |

### archetypeFeatsNonCoreTH.ts
| # | Key Feats | Priority | Choice |
|---|-----------|----------|--------|
| — | `precious-ammunition` | P2 | Choose precious material |
| — | `deflecting-pulse` | P2 | Choose damage type |

### archetypeFeatsStandaloneAD–PW.ts
| # | Key Feats | Priority | Choice |
|---|-----------|----------|--------|
| — | Various dedication choices (Acrobat, Archaeologist, Duelist, Medic, etc.) | P2-P4 | Varies |

---

## barbarianFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `barbarian-instinct` | Instinct | P1 | Choose instinct | `Animal, Dragon, Fury, Giant, Spirit, Superstition` |
| 2 | `barbarian-second-wind` | Second Wind | P4 | Choose to reduce fatigue | — |
| 3 | `barbarian-dragon-transformation` | Dragon Transformation | P4 | Choose dragon form options | — (runtime) |

---

## bardFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `bard-muse` | Muse | P1 | Choose muse | `Enigma, Maestro, Polymath, Warrior` |
| 2 | `bard-spell-repertoire` | Spell Repertoire | P3 | Choose spells for repertoire | Occult spells |
| 3 | `bard-signature-spells` | Signature Spells | P3 | Choose signature per rank | Repertoire spells |
| 4 | `bard-eclectic-skill` | Eclectic Skill | P5 | Untrained as trained | — (passive) |
| 5 | `bard-studious-capacity` | Studious Capacity | P3 | Choose two spells | Occult spells |

---

## championFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `champion-cause` | Cause | P1 | Choose cause | `Justice, Liberation, Obedience, Redemption, Grandeur, Iniquity, Tyranny, Vengeance` |
| 2 | `champion-deity-and-sanctification` | Deity and Sanctification | P1 | Choose deity + sanctification | Deity list + `Holy, Unholy, None` |
| 3 | `champion-smite` | Smite | P1 | Choose smite type | `Smite Good, Smite Evil` |
| 4 | `champion-divine-ally` | Divine Ally | P1 | Choose ally | `Blade, Shield, Steed` |
| 5 | `champion-aura-of-courage` | Aura of Courage | P5 | Passive | — |
| 6 | `champion-second-ally` | Second Ally | P2 | Choose 2nd divine ally | `Blade, Shield, Steed` |
| 7 | `champion-shield-of-grace` | Shield of Grace | P4 | Choose to redirect damage | — |
| 8 | `champion-ultimate-mercy` | Ultimate Mercy | P4 | Choose to raise dead | — |

---

## clericFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `cleric-deity` | Deity | P1 | Choose deity | Full deity list |
| 2 | `cleric-doctrine` | Doctrine | P1 | Choose doctrine | `Cloistered Cleric, Warpriest` |
| 3 | `cleric-divine-font` | Divine Font | P1 | Choose font | `Healing Font, Harmful Font` |
| 4 | `cleric-raise-symbol` | Raise Symbol | P2 | Choose symbol benefits | — |
| 5 | `cleric-channel-smite` | Channel Smite | P4 | Choose harm/heal spell | — (runtime) |
| 6 | `cleric-domain-focus` | Domain Focus | P2 | Choose domain | Deity's domains |

---

## commanderFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `commander-drilled-reactions` | Drilled Reactions | P2 | Choose ally reaction type | Reaction options |
| 2 | `commander-peerless-mascot-companion` | Peerless Mascot/Companion | P1 | Choose companion type | Animal companions |
| 3 | `commander-tactical-expansion` | Tactical Expansion | P2 | Choose additional tactic | Tactic list |

---

## druidFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `druid-druidic-order` | Druidic Order | P1 | Choose order | `Animal, Leaf, Stone, Storm, Wave, Wild, Untamed` |
| 2 | `druid-form-control` | Form Control | P4 | Choose duration | — (runtime) |
| 3 | `druid-current-spell` | Current Spell | P3 | Choose current spell | Spell list |
| 4 | `druid-invoke-disaster` | Invoke Disaster | P4 | Choose disaster type | Disaster options |
| 5 | `druid-hierophant-druidry` | Hierophant's Druidry | P3 | Choose 10th-rank spell | 10th-rank primal spells |

---

## exemplarFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `exemplar-spark-of-divinity` | Spark of Divinity/Ikon | P1 | Choose ikons | Ikon list |
| 2 | `exemplar-divine-body` | Divine Body | P2 | Choose body ikon | Body ikon list |
| 3 | `exemplar-divine-weapon` | Divine Weapon | P2 | Choose weapon ikon | Weapon ikon list |
| 4 | `exemplar-divine-worn` | Divine Worn | P2 | Choose worn ikon | Worn ikon list |
| 5 | `exemplar-shift-ikon` | Shift Ikon | P4 | Choose which ikon to shift to | — (runtime) |
| 6 | `exemplar-gleaming-blade` | Gleaming Blade | P2 | Choose damage type | `Fire, Good, Sonic` |
| 7 | `exemplar-sanctified-soul` | Sanctified Soul | P1 | Choose sanctification | `Holy, Unholy` |
| 8 | `exemplar-root-to-the-source` | Root to the Source | P2 | Choose tradition | `Arcane, Divine, Occult, Primal` |

---

## fighterFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `fighter-combat-flexibility` | Combat Flexibility | P3 | Daily choose fighter feat | Fighter feats ≤8th level |
| 2 | `fighter-improved-flexibility` | Improved Flexibility | P3 | Choose 2nd feat | Fighter feats ≤14th level |

---

## generalFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `general-canny-acumen` | Canny Acumen | P2 | Choose save or Perception | `Fortitude, Reflex, Will, Perception` |
| 2 | `general-incredible-initiative` | Incredible Initiative | P5 | Passive bonus | — |

---

## guardianFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `guardian-armor-of-the-faithful` | Armor of the Faithful | P1 | Choose doctrine-like | Guardian options |
| 2 | `guardian-intercept-strike` | Intercept Strike | P4 | Choose to intercept | — (runtime reaction) |
| 3 | `guardian-sentinel-lockdown` | Sentinel Lockdown | P4 | Choose enemies | — (runtime) |
| 4 | `guardian-shield-redirect` | Shield Redirect | P4 | Choose to redirect | — (runtime) |
| 5 | `guardian-taunt` | Taunt | P4 | Choose creature | — (runtime) |
| 6 | `guardian-retributive-strike` | Retributive Strike | P4 | Choose to retaliate | — (runtime) |
| 7 | `guardian-stalwart-determination` | Stalwart Determination | P2 | Choose save | `Fortitude, Reflex, Will` |

---

## gunslingerFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `gunslinger-way` | Gunslinger's Way | P1 | Choose way | `Way of the Drifter, Pistolero, Sniper, Triggerbrand, Vanguard` |
| 2 | `gunslinger-munitions-crafter` | Munitions Crafter | P2 | Choose formulas | Ammunition formulas |
| 3 | `gunslinger-risky-reload` | Risky Reload | P4 | Choose melee/ranged | — (runtime) |
| 4 | `gunslinger-slinger-reflexes` | Slinger's Reflexes | P5 | Passive | — |
| 5 | `gunslinger-deflecting-shot` | Deflecting Shot | P4 | Choose to shoot down | — (runtime) |
| 6 | `gunslinger-trick-shot` | Trick Shot | P4 | Choose trick effect | `Scatter debris, Shoot out supports, etc.` |
| 7 | `gunslinger-unerring-shot` | Unerring Shot | P4 | Choose ignoring concealment | — (runtime) |

---

## inventorFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `inventor-innovation` | Innovation | P1 | Choose innovation type | `Armor, Construct, Weapon` |
| 2 | `inventor-initial-modification` | Initial Modification | P1 | Choose modification | Modification list per innovation type |
| 3 | `inventor-built-in-tools` | Built-In Tools | P2 | Choose built-in tools | Tool list |
| 4 | `inventor-dual-form-weapon` | Dual-Form Weapon | P2 | Choose 2nd weapon form | Weapon forms |
| 5 | `inventor-searing-restoration` | Searing Restoration | P2 | Choose damage type | `Fire, Acid, Electricity` |
| 6 | `inventor-clockwork-celerity` | Clockwork Celerity | P4 | Choose action | `Interact, Stand, Step, Stride, Strike` |
| 7 | `inventor-breakthrough-innovation` | Breakthrough Innovation | P1 | Choose breakthrough mod | Breakthrough modification list |
| 8 | `inventor-revolutionary-innovation` | Revolutionary Innovation | P1 | Choose revolution mod | Revolutionary modification list |
| 9 | `inventor-overdrive` | Overdrive | P4 | Choose how to overclock | — (runtime) |
| 10 | `inventor-construct-companion` | Construct Companion | P2 | Choose construct type | Construct companion types |
| 11 | `inventor-variable-core` | Variable Core | P2 | Choose energy type | `Acid, Cold, Electricity, Fire` |
| 12 | `inventor-soaring-armor` | Soaring Armor | P2 | Choose flight modification | Flight options |
| 13 | `inventor-gigaton-strike` | Gigaton Strike | P4 | Choose empowerment | — (runtime) |

---

## investigatorFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `investigator-methodology` | Methodology | P1 | Choose methodology | `Alchemical Sciences, Empiricism, Forensic Medicine, Interrogation` |
| 2 | `investigator-devise-a-stratagem` | Devise a Stratagem | P4 | Choose to use roll | — (runtime) |
| 3 | `investigator-clue-in` | Clue In | P4 | Choose ally | — (runtime) |
| 4 | `investigator-strategic-assessment` | Strategic Assessment | P4 | Choose info to learn | — (runtime) |
| 5 | `investigator-predictive-purchase` | Predictive Purchase | P4 | Choose item retroactively | — |
| 6 | `investigator-forensic-acumen` | Forensic Acumen | P2 | Choose forensic specialty | Specialties |
| 7 | `investigator-just-the-facts` | Just the Facts | P4 | Choose what to investigate | — (runtime) |
| 8 | `investigator-lead-investigator` | Lead Investigator | P4 | Choose party member to aid | — |
| 9 | `investigator-the-grand-design` | The Grand Design | P4 | Choose design pattern | — |

---

## kineticistFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `kineticist-kinetic-gate` | Kinetic Gate | P1 | Choose element(s) | `Air, Earth, Fire, Metal, Water, Wood` |
| 2 | `kineticist-elemental-blast` | Elemental Blast | P1 | Choose element for blast | Selected elements |
| 3 | `kineticist-base-kinesis` | Base Kinesis | P1 | Choose element for kinesis | Selected elements |
| 4 | `kineticist-channel-elements` | Channel Elements | P4 | Choose to channel | — (runtime) |
| 5 | `kineticist-extract-element` | Extract Element | P4 | Choose element to extract | — (runtime) |
| 6 | `kineticist-kinetic-aura` | Kinetic Aura | P4 | Choose aura stance | — (runtime) |
| 7 | `kineticist-wings-of-air` | Wings of Air | P5 | — | — |
| 8 | `kineticist-stone-shield` | Stone Shield | P5 | — | — |
| 9 | `kineticist-thermal-nimbus` | Thermal Nimbus | P2 | Choose fire or cold | `Fire, Cold` |
| 10 | `kineticist-desert-wind` | Desert Wind | P4 | — | — |
| 11 | `kineticist-consume-power` | Consume Power | P4 | Choose eligible energy type | `Acid, Electricity, Fire, Sonic` |
| 12 | `kineticist-dash-of-herbs` | Dash of Herbs | P4 | Choose malady type | `Confused, Disease, Poison, Sickened, Injuries` |
| 13 | `kineticist-rising-hurricane` | Rising Hurricane | P5 | Choose height | — (runtime) |
| 14 | `kineticist-purify-element` | Purify Element | P4 | Choose element | Selected elements |
| 15 | `kineticist-aura-shaping` | Aura Shaping | P4 | Choose aura size | `5, 10, 15, 20 ft` |
| 16 | `kineticist-barrier-of-boreal-frost` | Barrier of Boreal Frost | P4 | Choose transparent/opaque | `Transparent, Opaque` |
| 17 | `kineticist-usurp-the-lunar-reins` | Usurp the Lunar Reins | P4 | Choose 2 effects | `Flood, Control, Modulate, Slow` |
| 18 | `kineticist-turn-the-wheel-of-seasons` | Turn the Wheel of Seasons | P4 | Choose starting season | `Spring, Summer, Autumn, Winter` |

---

## magusFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `magus-spellstrike` | Spellstrike | P4 | Choose spell + variable actions | — (runtime) |
| 2 | `magus-hybrid-study` | Hybrid Study | P1 | Choose study | `Inexorable Iron, Laughing Shadow, Sparkling Targe, Starlit Span, Twisting Tree` |
| 3 | `magus-double-spellstrike` | Double Spellstrike | P4 | Choose to re-cast stored spell | — (runtime) |
| 4 | `magus-irezoko-tattoo` (choose) | Irezoko Tattoo | P2 | Choose class with focus pool | Classes with focus pools |
| 5 | `magus-spell-swipe` | Spell Swipe | P4 | Choose target for spell effect | — (runtime) |
| 6 | (choose) Standby Spell | Standby Spell | P2 | Choose spellbook spell for Spellstrike | Spellbook spells |
| 7 | `magus-cascading-ray` | Cascading Ray | P4 | Choose energy type (if multi) | — (runtime) |
| 8 | `magus-dimensional-disappearance` | Dimensional Disappearance | P4 | Choose to Strike or not | — (runtime) |
| 9 | `magus-arcane-shroud` | Arcane Shroud | P2 | Choose 3 aftereffect spells | `False Vitality, Fire Shield, Fleet Step, Flicker, Invisibility, Mountain Resilience, See the Unseen` |
| 10 | `magus-whirlwind-spell` | Whirlwind Spell | P4 | Choose which foes affected | — (runtime) |
| 11 | `magus-heaven-earth-encompassing-sleeves` | Heaven-Earth Encompassing Sleeves | P2 | Choose sleeves or train storage | `Sleeves, Train` |

---

## monkFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `monk-path-to-perfection` | Path to Perfection | P1 | Choose save | `Fortitude, Reflex, Will` |
| 2 | `monk-second-path-to-perfection` | Second Path to Perfection | P1 | Choose different save | Remaining saves |
| 3 | `monk-third-path-to-perfection` | Third Path to Perfection | P1 | Choose from first two | Previously chosen saves |
| 4 | `qi-spells` | Qi Spells | P1 | Choose divine or occult | `Divine, Occult` |
| 5 | `elemental-fist` | Elemental Fist | P2 | Choose elemental damage | `Air→Electricity, Earth→Bludgeoning, Fire→Fire, Metal→Slashing, Water→Cold, Wood→Bludgeoning` |
| 6 | `winding-flow` | Winding Flow | P4 | Choose 2 of Stand/Step/Stride | `Stand, Step, Stride` |
| 7 | `form-lock` | Form Lock | P4 | Choose polymorph to counter | — (runtime) |
| 8 | **`fuse-stance`** | Fuse Stance | P2 | Choose 2 stances to combine | Known stances |
| 9 | `vitality-manipulating-stance` | Vitality-Manipulating Stance | P4 | Choose stunning effect | — (runtime) |

---

## oracleFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `oracle-spell-repertoire` | Spell Repertoire | P3 | Choose spells | Divine spells |
| 2 | (choose) Mystery | Mystery | P1 | Choose mystery | `Ancestors, Battle, Bones, Cosmos, Flames, Life, Lore, Tempest, Time` |
| 3 | `oracle-signature-spells` | Signature Spells | P3 | Choose signature per rank | Repertoire spells |
| 4 | `oracle-divine-access` | Divine Access (class feature) | P2 | Choose deity + 3 spells | Deities with matching domain |
| 5 | `oracle-nudge-the-scales` | Nudge the Scales | P3 | Choose life or death (daily) | `Life, Death` |
| 6 | `oracle-domain-acumen` | Domain Acumen | P2 | Choose domain | Mystery-associated domains |
| 7 | `oracle-divine-access-feat` | Divine Access (feat) | P2 | Choose deity + 3 spells | Deities with matching domain |
| 8 | (Choose) Irezoko Tattoo | Irezoko Tattoo | P2 | Choose class with focus pool | Classes with focus pools |
| 9 | `oracle-domain-fluency` | Domain Fluency | P2 | Choose domain with initial spell | Domains with initial spell |
| 10 | `oracle-diverse-mystery` | Diverse Mystery | P2 | Choose revelation spell | Initial/advanced revelation spells from other mysteries |
| 11 | `oracle-paradoxical-mystery` | Paradoxical Mystery | P3 | Daily choose spell | Domain/revelation spells |

---

## psychicFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `psychic-spell-repertoire` | Spell Repertoire | P3 | Choose spells | Occult spells |
| 2 | (choose) Psi Cantrips and Amps | Psi Cantrips | P1 | Choose conscious mind determines | — (linked to conscious mind) |
| 3 | (Choose) Conscious Mind | Conscious Mind | P1 | Choose conscious mind | `The Distant Grasp, The Infinite Eye, The Oscillating Wave, The Silent Whisper, The Tangible Dream, The Unbound Step` |
| 4 | (Choose) Signature Spells | Signature Spells | P3 | Choose signature per rank | Repertoire spells |
| 5 | `psychic-warp-space` | Warp Space | P4 | Choose origin square | — (runtime) |
| 6 | `psychic-homing-beacon` | Homing Beacon | P4 | Choose creature to mark | — (runtime) |
| 7 | `psychic-violent-unleash` | Violent Unleash | P4 | Choose to deal damage | — (runtime) |
| 8 | **`psychic-brain-drain`** | Brain Drain | P2 | Choose skill to gain | All skills |
| 9 | (choose) Dark Persona | Dark Persona | P4 | Choose to emit aura | — (runtime) |
| 10 | `psychic-target-of-psychic-ire` | Target of Psychic Ire | P4 | Choose creature | — (runtime) |
| 11 | `psychic-automatic-psychic-action` | Automatic Psychic Action | P2 | Choose spell ≤5th rank | Psychic spells ≤5th rank |
| 12 | `psychic-mind-over-matter` | Mind over Matter | P3 | Daily choose slot use | `10th-rank spell, Infinite Mind slot` |

---

## rangerFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `ranger-manifold-edge` | Manifold Edge | P4 | Choose different hunter's edge | Hunter's edge options |
| 2 | `ranger-shadow-hunter` | Shadow Hunter | P5 | Choose to be concealed | — (passive toggle) |

---

## rogueFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `predictable` | Predictable! | P4 | Choose target | — (runtime) |
| 2 | `sabotage` | Sabotage | P4 | Choose item on target | — (runtime) |
| 3 | `methodical-debilitations` | Methodical Debilitations | P2 | New debilitation options | Mastermind debilitations |
| 4 | `precise-debilitations` | Precise Debilitations | P2 | New debilitation options | Thief debilitations |
| 5 | `tactical-debilitations` | Tactical Debilitations | P2 | New debilitation options | Scoundrel debilitations |
| 6 | (choose) Vicious Debilitations | Vicious Debilitations | P2 | New debilitation options | `Weakness 5, Clumsy 1` |
| 7 | (choose) Bloody Debilitation | Bloody Debilitation | P2 | New debilitation option | `3d6 persistent bleed` |
| 8 | (choose) Critical Debilitation | Critical Debilitation | P2 | New debilitation option | `Slowed/Paralyzed on crit` |
| 9 | `instant-opening` | Instant Opening | P4 | Choose target + auditory/visual | — (runtime) |

---

## skillFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `bon-mot` | Bon Mot | P4 | Choose creature within 30 ft | — (runtime) |

---

## sorcererFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `sorcerer-bloodline` | Bloodline | P1 | Choose bloodline | `Aberrant, Angelic, Demonic, Diabolic, Draconic, Elemental, Fey, Hag, Imperial, Undead` |
| 2 | `sorcerer-spell-repertoire` | Spell Repertoire | P3 | Choose spells | Tradition spells |
| 3 | `sorcerer-signature-spells` | Signature Spells | P3 | Choose signature per rank | Repertoire spells |
| 4 | `sorcerer-arcane-evolution` | Arcane Evolution | P3 | Daily choose signature + skill | `Arcane spells` + skills |
| 5 | `sorcerer-occult-evolution` | Occult Evolution | P3 | 1/day add mental occult spell | Mental occult spells |
| 6 | `sorcerer-split-shot` | Split Shot | P4 | Choose second target | — (runtime) |
| 7 | `sorcerer-irezoko-tattoo` | Irezoko Tattoo | P2 | Choose class with focus pool | Classes with focus pools |
| 8 | `sorcerer-divine-emissary` | Divine Emissary | P2 | Choose divine familiar ability | `Erudite, Luminous, Medic, Radiant` |
| 9 | `sorcerer-energy-fusion` | Energy Fusion | P4 | Choose secondary spell | — (runtime) |
| 10 | `sorcerer-blood-sovereignty` | Blood Sovereignty | P4 | Choose two blood magic effects | — (runtime) |
| 11 | `sorcerer-greater-spiritual-evolution` | Greater Spiritual Evolution | P5 | Choose to target projections | — (passive) |
| 12 | `sorcerer-blood-ascendancy` | Blood Ascendancy | P4 | Choose two blood effects | — (runtime) |
| 13 | `sorcerer-greater-crossblooded-evolution` | Greater Crossblooded Evolution | P2 | Choose up to 3 gift spells | Secondary bloodline gift spells |
| 14 | `sorcerer-bloodline-mutation` | Bloodline Mutation | P2 | Choose fly/swim/resistance | `Fly Speed, Swim Speed + Amphibious, Resistance 20 to [type]` |

---

## summonerFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `summoner-eidolon` | Eidolon | P1 | Choose eidolon type | `Angel, Anger Phantom, Beast, Construct, Demon, Devotion Phantom, Dragon, Elemental, Fey, Plant, Psychopomp, Undead` |
| 2 | `summoner-advanced-weaponry` | Advanced Weaponry | P2 | Choose attack + trait | Unarmed attacks × `Disarm, Grapple, Nonlethal, Shove, Trip, Versatile B/P/S` |
| 3 | (Choose) Dual Studies | Dual Studies | P2 | Choose 2 skills | All skills |
| 4 | `summoner-dual-energy-heart` | Dual Energy Heart | P2 | Choose 2nd energy type | Energy types |
| 5 | `summoner-eidolons-wrath` | Eidolon's Wrath | P2 | Choose damage type | `Acid, Cold, Electricity, Fire, Negative, Positive, Sonic` (+ alignment) |
| 6 | `summoner-ostentatious-arrival` | Ostentatious Arrival | P4 | Choose damage type if multi-trait | — (runtime if applicable) |
| 7 | `summoner-magical-adept` | Magical Adept | P2 | Choose 2nd-level + 1st-level spell | Tradition spells |
| 8 | `summoner-protective-pose` | Protective Pose | P4 | Choose energy type | `Acid, Cold, Electricity, Fire, Sonic` |
| 9 | `summoner-pushing-attack` | Pushing Attack | P2 | Choose unarmed attack with shove | Eidolon attacks with shove |
| 10 | `summoner-weighty-impact` | Weighty Impact | P2 | Choose unarmed attack with trip | Eidolon attacks with trip |
| 11 | (Choose) Flexible Transmogrification | Flexible Transmogrification | P3 | Daily choose evolution feat ≤6 | Evolution feats ≤6th level |
| 12 | (choose) Grasping Limbs | Grasping Limbs | P2 | Choose unarmed attack with grapple | Eidolon attacks with grapple |
| 13 | `summoner-magical-master` | Magical Master | P2 | Choose innate spells L1–7 | Tradition spells |

---

## swashbucklerFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `swashbuckler-swashbucklers-style` | Swashbuckler's Style | P1 | Choose style | `Battledancer, Braggart, Fencer, Gymnast, Rascal, Wit` |
| 2 | `swashbuckler-after-you` | After You | P4 | Choose to go last | — (runtime) |
| 3 | `swashbuckler-fanes-fourberie` | Fane's Fourberie | P2 | Choose daggers or darts | `Daggers, Darts` |
| 4 | `swashbuckler-flamboyant-cruelty` | Flamboyant Cruelty | P4 | Choose enemy for damage | — (runtime) |

---

## thaumaturgeFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `thaumaturge-first-implement-and-esoterica` | First Implement | P1 | Choose implement | `Amulet, Bell, Chalice, Lantern, Mirror, Regalia, Shield, Tome, Wand, Weapon` |
| 2 | (Choose) Exploit Vulnerability | Exploit Vulnerability | P4 | Choose mortal weakness vs personal antithesis | `Mortal Weakness, Personal Antithesis` |
| 3 | `thaumaturge-second-implement` | Second Implement | P1 | Choose 2nd implement (different) | Remaining implements |
| 4 | `thaumaturge-implement-adept` | Implement Adept | P2 | Choose which implement gets adept | Owned implements |
| 5 | (Choose) Intensify Vulnerability | Intensify Vulnerability | P4 | Choose implement's intensify benefit | Held implement benefits |
| 6 | `thaumaturge-implement-paragon` | Implement Paragon | P2 | Choose implement with adept → paragon | Implements with adept |
| 7 | `thaumaturge-scroll-thaumaturgy` | Scroll Thaumaturgy | P4 | Choose tradition for multi-list spells | `Arcane, Divine, Occult, Primal` |
| 8 | `thaumaturge-breached-defenses` | Breached Defenses | P4 | Choose breached vs normal benefit | — (runtime) |
| 9 | `thaumaturge-thaumaturgic-ritualist` | Thaumaturgic Ritualist | P2 | Choose uncommon rituals | Uncommon rituals ≤ half level |
| 10 | `thaumaturge-incredible-familiar` | Incredible Familiar | P5 | Passive upgrade | — |
| 11 | `thaumaturge-shared-warding` | Shared Warding | P4 | Choose to extend benefit | — (runtime) |
| 12 | (choose) Thaumaturge Demesne | Thaumaturge Demesne | P2 | Choose area for demesne | — (location) |
| 13 | `thaumaturge-ubiquitous-weakness` | Ubiquitous Weakness | P4 | Select allies for mortal weakness | — (runtime) |
| 14 | `thaumaturge-wonder-worker` | Wonder Worker | P3 | Choose any tradition spell ≤8th | Tradition spells (by legendary skill) |

---

## witchFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `witch-patron` | Patron | P1 | Choose patron | 16 patrons (Baba Yaga, Choir Politic, etc.) |
| 2 | `witch-hex-cantrips` | Hex Cantrips | P5 | Determined by patron | — (linked) |
| 3 | `witch-witchs-armaments` | Witch's Armaments | P2 | Choose unarmed attack | `Eldritch Nails, Iron Teeth, Living Hair` |
| 4 | `witch-scatter-swarm` | Scatter Swarm | P2 | Choose damage type | `Acid, Cold, Electricity, Fire` |
| 5 | `witch-irezoko-tattoo` | Irezoko Tattoo | P2 | Choose class with focus pool | Classes with focus pools |
| 6 | `witch-rites-of-convocation` | Rites of Convocation | P2 | Choose summon spell | Summon spells on tradition list |
| 7 | `witch-divine-emissary` | Divine Emissary | P2 | Choose divine familiar ability | `Erudite, Luminous, Medic, Radiant` |
| 8 | `select one` → Greater Lesson | Greater Lesson | P2 | Choose greater or basic lesson | 9 greater lessons + basic lessons |
| 9 | `witch-incredible-familiar` | Incredible Familiar | P5 | Passive upgrade | — |
| 10 | `witch-coven-spell` | Coven Spell | P4 | Choose bonus damage or spellshape | — (runtime) |
| 11 | `witch-split-hex` | Split Hex | P4 | Choose second target | — (runtime) |

---

## wizardFeats.ts

| # | Feat ID | Feat Name | Priority | Choice | Suggested Options |
|---|---------|-----------|----------|--------|-------------------|
| 1 | `wizard-arcane-thesis` | Arcane Thesis | P1 | Choose thesis | `Experimental Spellshaping, Improved Familiar Attunement, Spell Blending, Spell Substitution, Staff Nexus` |
| 2 | (Choose) Arcane School | Arcane School | P1 | Choose school | 14 schools (7 core + 7 supplement) |
| 3 | `wizard-irezoko-tattoo` | Irezoko Tattoo | P2 | Choose class with focus pool | Classes with focus pools |
| 4 | `wizard-spell-protection-array` | Spell Protection Array | P4 | Choose point within 30 ft | — (runtime) |
| 5 | `wizard-split-slot` | Split Slot | P3 | Choose which spell to cast | — (casting time) |
| 6 | `wizard-forcible-energy` | Forcible Energy | P4 | Choose target for weakness | — (runtime) |
| 7 | `wizard-spell-mastery` | Spell Mastery | P2 | Choose 4 spells of different ranks | Spellbook spells ≤9th |

---

## Summary by Priority

### P1 — Permanent Build Choices (MUST HAVE subChoices) — ~45 feats

These define the character and must be selected at build time in the builder UI:

- **alchemistFeats**: Research Field
- **animistFeats**: Apparitions, Embodiment
- **archetypeFeats**: All multiclass dedication feat selections (~40)
- **barbarianFeats**: Instinct
- **bardFeats**: Muse
- **championFeats**: Cause, Deity+Sanctification, Smite, Divine Ally
- **clericFeats**: Deity, Doctrine, Divine Font
- **commanderFeats**: Peerless Mascot/Companion
- **druidFeats**: Druidic Order
- **exemplarFeats**: Spark of Divinity/Ikons, Sanctified Soul
- **gunslingerFeats**: Way
- **inventorFeats**: Innovation, Initial Modification, Breakthrough, Revolutionary
- **investigatorFeats**: Methodology
- **kineticistFeats**: Kinetic Gate, Elemental Blast, Base Kinesis
- **magusFeats**: Hybrid Study
- **monkFeats**: Path to Perfection (1st/2nd/3rd), Qi Spells tradition
- **oracleFeats**: Mystery
- **psychicFeats**: Conscious Mind
- **sorcererFeats**: Bloodline
- **summonerFeats**: Eidolon
- **swashbucklerFeats**: Style
- **thaumaturgeFeats**: First Implement, Second Implement
- **witchFeats**: Patron
- **wizardFeats**: Arcane Thesis, Arcane School

### P2 — Permanent Feat Choices — ~120 feats

Selected when taking the feat, with finite enumerable options. Prime candidates for subChoices.

### P3 — Daily Preparation Choices — ~25 feats

Changed during daily preparations. Could use subChoices with daily-swap UI.

### P4 — Runtime/Combat Choices — ~200+ feats

Tactical decisions made each round. Many are "choose a target" or "choose how to use." Some (like debilitation choices) have enumerable options worth modeling.

### P5 — Marginal / Passive — ~20 feats

Binary toggles, passive effects with "choose" in flavor text only.

---

## User-Requested Specific Feats — Status

| Feat | File | Found | Priority |
|------|------|-------|----------|
| `fulminating-synergy` | archetypeFeatsLegacySM1 | ✅ | P2 |
| `fulminating-shot` | archetypeFeatsNonCoreTH | ✅ | P2 |
| `deflecting-pulse` | archetypeFeatsNonCoreTH | ✅ | P2 |
| `precious-ammunition` | archetypeFeatsNonCoreTH | ✅ | P2 |
| `fake-it-till-you-make-it` | archetypeFeatsNonCoreFR | ✅ | P2 |
| `brain-drain` | psychicFeats | ✅ | P2 |
| inventor feats (all) | inventorFeats | ✅ 13 feats | P1-P4 |
| `knight-vigilant-vigilant-benediction` | archetypeFeatsLegacyLO2 | ✅ | P2 |
| `fuse-stance` | monkFeats | ✅ | P2 |
| oracle feats | oracleFeats | ✅ 11 feats | P1-P3 |
| `magus-irezoko-tattoo` (as `choose`) | magusFeats | ✅ | P2 |
| `cleric-deity` | clericFeats | ✅ | P1 |
| `commander-peerless-mascot-companion` | commanderFeats | ✅ | P1 |
| `kineticist-elemental-blast` | kineticistFeats | ✅ | P1 |
| `kineticist-base-kinesis` | kineticistFeats | ✅ | P1 |

All user-requested feats confirmed found.
