# Fixes Tracker

Tracking required fixes discovered in the project audit. Each item should move from "Planned" to "In Progress" to "Done" as fixes land.

## Critical
- [x] CRIT-01: `sheetToCreature()` uses raw ability scores instead of modifiers (combat math broken).
- [x] CRIT-02: Action economy not enforced in engine (unlimited actions per turn).
- [x] CRIT-03: Sneak Attack damage missing on critical hits.
- [x] CRIT-04: `handleCreate()` does not populate `feats` array (feat selections lost).
- [x] CRIT-05: Duplicate feat IDs (`debilitating-shot`, `subtle-theft`) cause `getFeatById()` collisions.
- [x] CRIT-06: `use-item` and `ready` actions receive wrong parameters.
- [x] CRIT-07: `createBlankCharacter()` proficiencies schema mismatches `ProficiencyProfile`.

## High
- [x] HIGH-01: Fighter weapon specialization applied from level 1 (should be level 7; greater at 15).
- [x] HIGH-02: Fighter feature levels incorrect in feat catalog (Weapon Spec, Battlefield Surveyor, Kip Up, Spring Attack).
- [x] HIGH-03: Debilitation feats listed at level 6 but require level 9 feature.
- [x] HIGH-04: Duplicate `vicious-swing` switch case; correct implementation unreachable.
- [x] HIGH-05: Rogue key ability boost fixed to Dex/Cha instead of racket-driven.
- [x] HIGH-06: Stunned action loss not capped at 3; value always zeroed.
- [x] HIGH-07: Thief racket damage bonus discards item bonuses.
- [x] HIGH-08: Double Slice applies increasing MAP to second strike.
- [x] HIGH-09: Level-1 boosts ignore 18+ rule (+1 vs +2).
- [x] HIGH-10: No class-specific starting proficiencies.
- [x] HIGH-11: Background skills grant 2 + Lore instead of 1 + Lore.

## Medium
- [x] MED-01: Reactive Strike triggers on actions without Manipulate trait.
- [x] MED-02: Delay/Ready not integrated into turn order execution.
- [x] MED-03: Avenger racket Sneak Attack ignores favored weapon restriction.
- [x] MED-04: `rogueRacket` / `rogueDeity` duplicated between `Creature` and `CharacterSheet`.
- [x] MED-05: Rogue class features missing trait metadata.
- [x] MED-06: "flat-footed" terminology remains; should be "off-guard".
- [x] MED-07: Sweep trait always assumes previous hit; unconditional +1.
- [x] MED-08: Speed hardcoded to 25 in conversions.
- [x] MED-09: Ancestry ability penalties still present (Remaster removed).
- [x] MED-10: Thaumaturge key ability set to Wisdom (should be Charisma).

## Low
- [x] LOW-01: `ANCESTRIES` and `CLASSES` lists are truncated vs boost maps.
- [x] LOW-02: Free Archetype toggle has no implementation.
- [x] LOW-03: PDF export truncates skills to 8 and feats to 5.
- [x] LOW-04: `CharacterBuilder.tsx` is too large (split into subcomponents).
- [ ] LOW-05: Exploration/downtime actions are stubs in combat engine.
- [x] LOW-06: Debug `console.log` statements in engine should be gated.
- [x] LOW-07: Duplicate `recall-knowledge` switch case (dead code).
- [x] LOW-08: `Action.actionCost` should support `number | 'reaction'`.
- [x] LOW-09: `DamageWeakness.value` comment says multiplier (should be additive).
- [x] LOW-10: `knockdown` feat ID/name mismatch (Slam Down).
- [x] LOW-11: Shield Block marked implemented in one place, not in another.
- [x] LOW-12: Missing `Triple Shot` feat referenced by Multishot Stance.
- [x] LOW-13: Typo `endstur` -> `endsTurn`.
- [x] LOW-14: `_map` attached via `any` cast; should be typed.
- [x] LOW-15: Legacy weapon fields synced alongside inventory system.
- [x] LOW-16: `initDying` increment order confusing (clarity fix).
