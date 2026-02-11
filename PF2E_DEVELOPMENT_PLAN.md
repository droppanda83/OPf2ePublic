# PF2e Remaster — Comprehensive Development Plan

> **Pin this file for context in every future session.**
> Last updated: 2026-02-12 | Phases 0-4 complete, Phase 5 (Fighter Class: 5.1, 5.2, & Higher-Level Feats) in progress.

---

## PROGRESS TRACKING

**Instructions:** Mark phases as complete with ✅ as they are finished. Mark current phase with 🔄. Incomplete phases remain unmarked.

- ✅ **Phase 0**: Rule Enforcement Framework
  - ✅ 0.1 Action validation layer
  - ✅ 0.2-0.6 (Sessions 1-3) ✅ PHASE 0 COMPLETE
- ✅ **Phase 1**: Fix Existing Broken Mechanics
  - ✅ 1.1 Movement system fixes (Session 1.1 COMPLETE)
  - ✅ 1.2 Wire up Burning Hands (Session 1.2 COMPLETE)
  - ✅ 1.3 Process weapon traits (Session 1.3 COMPLETE)
  - ✅ 1.4 Range increment penalties (Session 1.4 COMPLETE)
  - ✅ 1.5 Potency and Striking runes (Session 1.5 COMPLETE)
  - ✅ 1.6 Flanking requires threatening (Session 1.6 COMPLETE)
  - ✅ 1.7 Step action (Session 1.7 COMPLETE)
  - 1.8 (MOVED TO PHASE 9.4 — armor STR requirement correction)
  - ✅ 1.9 Phase 1 Code Review (Session 1.9 COMPLETE)
- ✅ **Phase 2**: Complete Condition System (Session 2.1 COMPLETE, Session 2.2 Sickened action COMPLETE)
  - ✅ 2.1-2.4 All high-priority conditions implemented
  - ✅ 2.4.5 Sickened condition mechanics + Retching action
- ✅ **Phase 3**: Hero Points (with house rule) — Session 2.3 COMPLETE
  - ✅ 3.1-3.2 Hero point spending mechanics implemented in rules.ts
  - ✅ 3.3 Hero point UI with click-to-spend pips (PF2eHeroPoints component)
  - ✅ 3.3.1 Hero points integrated into d20 roll system (attacks, saves, skill checks)
  - ✅ 3.4 Phase 3 Code Review COMPLETE
  - ✅ BONUS: Movement system generalized with movementType property
- ✅ **Phase 4**: Spell System Overhaul
  - ✅ 4.1-4.17 All 17 core spells verified and corrected vs Foundry VTT PF2e Remaster data
  - ✅ Phase 4 COMPLETE (all spell implementations match PF2e Remaster)
- 🔄 **Phase 5**: Fighter Class (Complete)
  - ✅ 5.1 Fighter Base Features (Weapon Specialization, Battlefield Surveyor COMPLETE)
  - ✅ 5.2 Fighter Feats Level 1-4 (All level 1, 2, 4 combat feats COMPLETE)
    - ✅ Level 1: Power Attack, Sudden Charge, Double Slice, Intimidating Strike, Exacting Strike, Snagging Strike
    - ✅ Level 2: Knockdown, Brutish Shove, Dueling Parry, Lunge
    - ✅ Level 4: Twin Parry, Shatter Defenses
    - Partial: Aggressive Block, Combat Grab, Swipe (scaffolding only)
  - ✅ 5.2+ Higher-Level Feats (Level 6-12 COMPLETE)
    - ✅ Level 6: Armor Specialization, Fearless, Guardian's Deflection
    - ✅ Level 8: Weapon Mastery
    - ✅ Level 10: Flexible Flurry, Iron Will, Reflexive Shield, Dueling Riposte
    - ✅ Level 12+: Improved Reflexes, Reaction Enhancement
- **Phase 6**: Psychic Dedication (Archetype) — Unbound Step reference updated to Player Core
- **Phase 7**: Skill Actions Completion
- **Phase 8**: Combat Actions Completion
- **Phase 9**: Armor, Equipment & Consumables
- **Phase 10**: Additional Classes (one at a time)
- **Phase 11**: Bestiary Expansion
- **Phase 12**: Complete Feat Handling (ancestry, general, skill)
- **Phase 13**: 3D Dice Roller
- **Phase 14**: Rule Audit & Integration Check (before AI)
- **Phase 15**: Aesthetic Revision & PF2e Compliance Review (before AI)
- **Phase 16**: AI GM Chatbot
- **Phase 17**: AI Combat Improvements
- **Phase 18**: Character Sheet & Re-Import
- **Phase 19**: Area Map
- **Phase 20**: Environmental Hazards & Traps
- **Phase 21**: Loot, Treasure & Economy
- **Phase 22**: Final Rule Audit & Compliance Review (end-of-project)
- **Phase 23**: Final Aesthetic Polish & Optimization (end-of-project)

---

## PROJECT VISION

Build a fully PF2e Remaster-compliant tactical combat game with an AI Game Master chatbot. The GM is **bound by the rules engine** — it cannot bend or break PF2e rules, but controls narrative, encounter design, difficulty tuning, and story. The final product features:

1. **Tactical combat grid** — Full PF2e Remaster combat with all rules enforced
2. **AI GM chatbot** — Right-side panel (tabbed with combat log), narrative-driven, rule-bound
3. **Narrative tension system** — GM controls pacing, difficulty scaling, dramatic beats
4. **Area map** — Overworld/dungeon exploration map separate from encounter grid (late-game)
5. **Full class/archetype support** — Every class fully playable, one at a time, starting with Fighter + Psychic Dedication (Unbound Step focus)
6. **Complete spell & creature library** — All PF2e Remaster spells and creatures, plus GM-customizable creatures
7. **Character re-import** — Upload updated Pathbuilder sheets as characters level up

---

## GOLDEN RULES FOR IMPLEMENTATION

1. **PF2e Remaster ONLY** — No legacy PF1e, no D&D 5e, no homebrew (except the Hero Point house rule below). When in doubt, check Archives of Nethys (2e Remaster).
2. **No invented mechanics** — If a rule isn't in PF2e Remaster, don't add it. If unsure, skip it and flag for review.
3. **Build → verify after every change** — Run `npm run build` from project root after each task. Never leave the codebase in a broken state.
4. **One phase at a time** — Complete and verify each phase before starting the next.
5. **Shared types first** — Always update `shared/types.ts` before touching backend or frontend.
6. **Test with actual play** — After each phase, start the servers and run a combat encounter to verify.
7. **Phase code review** — At the end of each phase, run a dedicated code review session to audit all changes for PF2e compliance, code quality, and regressions.
8. **Rule enforcement first** — The engine must enforce rules. The GM/AI cannot override them. Build validation into the engine, not just the UI.

### Approved Homebrew
- **Hero Points (Enhanced)**: Players can spend hero points on any d20 roll:
  - 1 Hero Point: Roll twice, take the better result (standard PF2e)
  - 2 Hero Points: Roll twice, add +10 to the second roll (cannot exceed natural 20)
  - 3 Hero Points: Automatic natural 20

### Naming Corrections
- The action "Vicious Strike" must be labeled **"Vicious Swing"** everywhere in code, UI, and logs.

---

## CURRENT STATE SUMMARY

### What Works (as of 2026-02-11)
- Strike, Vicious Swing (unified), Stride, Step, Stand, Take Cover, Raise/Lower Shield
- Draw/Stow/Drop/Pick-Up Weapon with hand tracking (basic — tracks handsUsed total, not per-hand)
- MAP (standard + agile), crits (nat 20/nat 1 + ±10), finesse, reach
- Range/reach validation on attacks
- Damage types (14 types), resistances, immunities, weaknesses
- Shield Block reaction, shield HP tracking
- Flanking (position-based dot product), off-guard
- Conditions: frightened, sickened (with Retching action), clumsy, enfeebled, drained, stupefied, prone, cover, persistent damage
- Death & Dying (Remaster recovery checks, wounded tracking)
- Reactive Strike (Attack of Opportunity)
- Skill actions: Demoralize, Feint, Trip, Shove (all with MAP where applicable), Retching (Sickened recovery)
- **Hero Points**: Full house rule implementation (1 HP = reroll, 2 HP = reroll+10, 3 HP = nat 20)
  - Integrated into all d20 rolls (attacks, saves, skill checks)
  - Click-to-spend UI with visual feedback (3 red circle pips)
  - Combat log tooltips show hero point messages
- **Movement System**: Generalized with `movementType` property (walk, teleport-ready)
- Spells: Magic Missile, Fireball, Shield (cantrip) — 3 working, Burning Hands defined but not wired
- Bonus stacking (circumstance/item/status/untyped — PF2e accurate)
- Saving throws (Reflex/Fort/Will with proficiency)
- Encounter builder (XP budget system, 22 bestiary creatures)
- Pathbuilder 2e JSON import (comprehensive) — see `Test Characters/Isera Ruen.JSON` for reference format
- Save/Load system
- AI enemy turns (GPT-4, very basic — Strike + Move only)

### Architecture
```
shared/          → Types, catalogs, utilities (builds first)
backend/src/     → Express server, GameEngine, RulesEngine, AI
frontend/src/    → React+Vite UI, components, Pathbuilder import
```
- Build: `cd <project-root>; npm run build`
- Backend: `cd backend; node dist/index.js` (port 3001)
- Frontend: `cd frontend; npm run dev` (port 5173)

---

## PHASE 0: RULE ENFORCEMENT FRAMEWORK
*Priority: HIGHEST — this underpins everything*

> Before adding new features, ensure the engine reliably enforces PF2e rules. This prevents future sessions from introducing non-compliant mechanics.

### 0.1 Action validation layer
- **Create**: `backend/src/game/ruleValidator.ts` — centralized validation module
- **Purpose**: Every action resolution passes through validation before execution
- **Validates**:
  - Action cost vs remaining action points
  - Trait restrictions (Flourish once/turn, Attack trait increments MAP, Press requires MAP ≥ 1, Open requires MAP = 0)
  - Requirement checks (free hand for Grapple/Disarm, weapon held for Strike, etc.)
  - Target validity (range, line of sight, alive, valid target type)
  - Condition restrictions (can't Stride while immobilized, can't act while paralyzed, etc.)
- **Returns**: `{ valid: boolean, reason?: string }` — rejected actions return clear reason to UI

### 0.2 Bonus stacking enforcement audit
- Verify the existing bonus stacking system handles all edge cases:
  - Two circumstance bonuses from different sources → only highest applies
  - Circumstance bonus + circumstance penalty → both apply (they don't cancel)
  - Untyped penalties always stack
  - Status bonuses from the same spell don't stack if recast
- Add unit-test-style validation comments for each stacking rule

### 0.3 Condition interaction validation
- Build a condition interaction map:
  - Grabbed → automatically applies off-guard + immobilized
  - Restrained → grabbed + can't attack
  - Prone → off-guard + -2 circumstance to attack
  - Stunned → action loss, then value decrements
  - Dying → links to wounded value for initial dying value
- Ensure conditions don't duplicate penalties when they overlap

### 0.4 Hand tracking system (full implementation)
- **Current state**: `handsUsed` is a single number. No distinction between left/right hand or what each hand holds.
- **New system**: Track two hand slots explicitly:
  ```typescript
  hands: {
    primary: { weaponId: string | null, shieldId: string | null } | null;
    secondary: { weaponId: string | null, shieldId: string | null } | null;
  }
  ```
- **Rules to enforce**:
  - 2H weapon → both hands occupied, can't hold shield simultaneously
  - 1H weapon + shield → one hand each
  - Dual wielding → one weapon per hand
  - Two-hand trait: Can grip 1H weapon in 2 hands for better damage die
  - Free hand requirement: Grapple, Disarm, some feats require a free hand
  - Interact to change grip: Switch between 1H and 2H grip (Release = free action to release grip, Interact = 1 action to add hand)
- **Files**: `shared/types.ts` (Creature.hands), `backend/src/game/rules.ts` (all weapon actions), `frontend/src/components/ActionPanel.tsx` (hand state UI)

### 0.5 Rename "Vicious Strike" → "Vicious Swing"
- **Files**: All references in `backend/src/game/rules.ts`, `shared/actions.ts`, `frontend/src/components/ActionPanel.tsx`
- Rename action ID, display name, log messages, and comments

### 0.6 Phase 0 Code Review
- Audit all Phase 0 changes for PF2e compliance
- Verify no regressions in existing combat
- Build + playtest a full encounter

---

## PHASE 1: FIX EXISTING BROKEN MECHANICS
*Priority: Critical — these are bugs in already-implemented features*

### 1.1 Fix movement system bugs
- **Priority**: HIGH — movement is core to tactical combat
- **Known issues**: Movement system is currently buggy (needs investigation of specific bugs)
- **Files**: `backend/src/game/rules.ts` (resolveStride), `backend/src/game/engine.ts` (movement validation), `frontend/src/components/BattleGrid.tsx` (movement UI)
- **Investigation needed**: Identify specific bugs via testing:
  - Movement action point consumption
  - Difficult terrain speed reduction
  - Movement through occupied squares
  - Reactive Strike triggering on movement
  - Movement range calculation
  - Movement preview/highlighting
- **Fix**: Debug and repair all identified issues
- **Test thoroughly**: Movement is used every turn, must be rock-solid

### 1.2 Wire up Burning Hands in resolveSpell()
- **File**: `backend/src/game/rules.ts` → `resolveSpell()` switch
- **Rule**: 2-action spell, 15-foot cone (3 squares), 2d6 fire, Reflex basic save, persistent 1d4 fire on crit fail
- **Issue**: Defined in `SPELL_CATALOG` but has no `case 'burning-hands':` handler
- **PF2e ref**: Player Core p.322

### 1.3 Process weapon traits that exist but are ignored
- **Files**: `shared/weapons.ts` (traits already listed), `backend/src/game/rules.ts` (damage calculation)
- **Traits to wire up**:
  - **Deadly** — On crit, add one die of the deadly size (e.g., deadly d10 = +1d10 on crit). Already on shortbow/longbow.
  - **Fatal** — On crit, upgrade weapon damage die to fatal die size and add one extra fatal die
  - **Forceful** — +1 damage on 2nd attack, +2 on 3rd+ (same turn, same weapon)
  - **Sweep** — +1 circumstance to attack if you already hit a different target this turn
  - **Backstabber** — +1 precision damage (+2 with greater striking) against off-guard targets
  - **Two-hand** — When wielded two-handed, use the listed die size instead (e.g., bastard sword 1d8 → 1d12). Integrates with hand tracking from Phase 0.
  - **Versatile** — Can deal alternate damage type (e.g., versatile S = can choose slashing)
  - **Propulsive** — Add half STR modifier to damage (if positive) for ranged weapons
  - **Volley** — -2 penalty to attacks within listed range (e.g., volley 30 = -2 within 30ft)
  - **Thrown** — Can be thrown as ranged attack using listed range increment
- **PF2e ref**: Player Core pp.275-282

### 1.4 Range increment penalties
- **File**: `backend/src/game/rules.ts` → `validateAttackRange()` / attack roll
- **Rule**: -2 cumulative penalty per range increment beyond the first. Max 6 range increments.
- **Example**: Shortbow range 60ft. At 61-120ft: -2. At 121-180ft: -4. Etc.
- **PF2e ref**: Player Core p.272

### 1.5 Striking rune damage in combat
- **Issue**: `calculateDamageFormula()` in shared handles striking runes for catalog display, but actual combat `rollDamage()` uses raw `weapon.damageDice` from inventory — striking runes are imported from Pathbuilder but ignored in damage
- **Fix**: Ensure `resolveAttackAction()` uses the striking-adjusted damage formula
- **PF2e ref**: Player Core p.299

### 1.6 Flanking requires threatening
- **Issue**: Currently any ally on opposite side counts for flanking, even if unconscious or don't threaten
- **Fix**: Ally must be conscious, not dying, wielding a melee weapon, and adjacent to target
- **PF2e ref**: Player Core p.422

### 1.7 Step action ✅ COMPLETE
- **File**: `backend/src/game/rules.ts`
- **Rule**: 1 action, move 5 feet (1 square), does NOT trigger Reactive Strike
- **Status**: Implemented in Session 1.7 — complete `resolveStep()` method with distance validation, bounds checking, occupancy validation, and `actionId: 'step'` for Reactive Strike exclusion
- **PF2e ref**: Player Core p.420

### 1.8 (MOVED TO PHASE 9.4)
- **Note**: Armor STR requirement correction moved to Phase 9 where all armor mechanics are properly handled together
- See Phase 9.4 for implementation details

### 1.9 Phase 1 Code Review ✅ COMPLETE

**Audit Summary (2026-02-10):**

✅ **FULLY IMPLEMENTED & PF2e COMPLIANT:**
- **Phase 1.1**: Movement system with terrain costs, bounds checking, occupancy validation, prone handling, action economy
- **Phase 1.2**: Burning Hands spell (15ft cone, 2d6 fire, Reflex basic save, persistent 1d4 fire on fail/crit-fail)
- **Phase 1.3**: Weapon Traits — ALL 10 traits complete ✅
  - Deadly, Fatal, Forceful, Backstabber, Propulsive, Sweep, Volley, Thrown (from Session 1.3)
  - Two-hand, Versatile (added in Session 1.9)
- **Phase 1.4**: Range increment penalties (-2 per increment beyond first, max 6 increments)
- **Phase 1.5**: Striking/Potency Runes — FIXED ✅
  - `rollDamage()` now applies striking runes from creature bonuses
  - Striking dice adjustment logic properly integrated (Session 1.9)
- **Phase 1.6**: Flanking validation (requires conscious, adjacent, armed with melee weapon, positioned opposite)
- **Phase 1.7**: Step action (1 action, 5ft/1 square, no Reactive Strike trigger)

**Fixes Applied in Session 1.9:**
1. ✅ Striking runes now apply to combat damage (Phase 1.5 complete)
2. ✅ Two-hand trait processing implemented (checks handsUsed, upgrades die size)
3. ✅ Versatile trait documented (UI-layer choice, not damage calculation change)

**Build Status**: ✅ 0 errors, all workspaces compile successfully

**Phase 1 Status**: ✅ COMPLETE — All 7 sessions finished, all issues resolved

---

## IMPORTANT: CHECKPOINT PHASES FOR QUALITY ASSURANCE

**Before AI (Phases 14-15):** Before introducing the AI GM chatbot, comprehensive rule audit and aesthetic review ensure the core combat engine is rock-solid and the UI reflects PF2e properly.

**After Project (Phases 22-23):** Final audit and polish pass at project completion, verifying all systems work together and meet PF2e compliance standard.

---

## PHASE 2: COMPLETE THE CONDITION SYSTEM ✅ COMPLETE
*Priority: High — conditions are referenced by dozens of spells and abilities*

**Session 2.1 Summary (2026-02-10):**

✅ **IMPLEMENTED:**
1. **Action Economy Conditions** (Phase 2.2 & 2.3):
   - **Stunned**: Lose actions equal to value at turn start, then reduce stunned by that amount
   - **Slowed**: Lose actions equal to value at turn start (persistent)
   - **Quickened**: Gain 1 extra action with restrictions
   - Integrated into `startTurn()` in engine.ts

2. **Movement Restriction Conditions** (Phase 2.1):
   - **Immobilized**: Blocks all movement actions
   - **Grabbed**: Blocks movement + off-guard
   - **Restrained**: Blocks movement + off-guard + can't attack
   - **Paralyzed**: Can't act + off-guard
   - Integrated into `resolveMovement()` with early rejection

3. **Visibility & Flat Checks** (Phase 2.1):
   - **Concealed**: DC 5 flat check or attack fails
   - **Hidden**: DC 11 flat check or auto-miss
   - **Invisible**: DC 11 flat check (combines Hidden + Undetected)
   - **Blinded** (attacker): DC 11 flat check (all creatures hidden to you)
   - **Dazzled** (attacker): DC 5 flat check (all creatures concealed to you)
   - Integrated into `resolveAttackAction()` after roll, before damage

4. **Status Conditions in AC** (Phase 2.1):
   - **Blinded**: Off-guard + -4 status to Perception
   - **Grabbed/Restrained/Paralyzed**: Off-guard (-2 AC)
   - **Fatigued**: -1 status to AC and saves
   - Integrated into `getConditionModifiers()` in shared/ac.ts

5. **Doomed + Dying Interaction** (Phase 2.4):
   - You die at dying value = (4 - doomed value)
   - Example: Doomed 1 → die at dying 3 (instead of 4)
   - Integrated into `rollDeathSave()` with dynamic death threshold

**Build Status**: ✅ 0 errors, all workspaces compile successfully

**Phase 2 Status**: ✅ COMPLETE — All high-priority conditions implemented

---

### 2.1 Add missing combat-relevant conditions ✅ IMPLEMENTED
Add to `shared/types.ts` Condition type and implement processing in `rules.ts`:

| Condition | Mechanic | Priority |
|-----------|----------|----------|
| **Blinded** | Off-guard, all terrain is uneven (difficult), -4 status to Perception, can't use vision. All creatures are hidden to you. | High |
| **Concealed** | DC 5 flat check or attack/spell fails (no effect) | High |
| **Hidden** | Must guess square. DC 11 flat check or auto-miss | Medium |
| **Invisible** | Hidden + Undetected combined rules | Medium |
| **Grabbed** | Off-guard, immobilized (can't use move actions). Requires Escape to end. | High |
| **Restrained** | As grabbed + off-guard + can't attack | High |
| **Immobilized** | Speed = 0, can't use Stride/Step | High |
| **Stunned** | Lose actions at start of turn (stunned value = actions lost) | High |
| **Slowed** | Lose actions (slowed value) at start of turn, persistent | High |
| **Quickened** | Gain 1 extra action, can only be used for specific action | Medium |
| **Paralyzed** | Can't act, off-guard | Medium |
| **Fatigued** | -1 status to AC and saves, can't explore | Low |
| **Doomed** | Die at dying (4 - doomed value) instead of dying 4 | Medium |
| **Fleeing** | Must Stride away from source each turn | Medium |
| **Dazzled** | Concealed to you (DC 5 flat check on targets) | Medium |
| **Confused** | Random target each turn, strikes only | Low |

### 2.2 Implement Slowed/Quickened action economy
- **File**: `backend/src/game/engine.ts` (turn start) + frontend action point calculation
- **Rule**: Slowed N = start turn with 3-N actions. Quickened = start with 4 actions (extra action restricted).
- **PF2e ref**: Player Core p.436, p.435

### 2.3 Implement Stunned action loss
- **Rule**: At start of turn, lose actions equal to stunned value, then reduce stunned by that amount
- **PF2e ref**: Player Core p.437

### 2.4 Implement Doomed + Dying interaction
- **Rule**: You die at dying value = 4 - doomed value
- **PF2e ref**: Player Core p.431

### 2.4.5 Implement Sickened Condition Mechanic ✅ IMPLEMENTED
- **Status penalty**: Status penalty equal to sickened value on ALL checks and DCs (already in `getConditionModifiers()`)
- **Item consumption block**: Can't willingly ingest elixirs/potions while sickened (requires consumables system — deferred to Phase 9)
- **Retching action**: New action `retching` allows 1 action Fortitude save against the effect DC
  - Success: Reduce sickened by 1
  - Critical success: Reduce sickened by 2
  - Failure/Critical failure: No change
- **Implementation**: 
  - Added `sourceEffectDC?: number` to Condition interface in `shared/types.ts` to track effect DC
  - Added `resolveRetching()` method in `backend/src/game/rules.ts` with proper Fortitude save
  - Integrated 'retching' action into action switch in `resolveAction()`
- **PF2e ref**: Player Core p.446

### 2.5 Phase 2 Code Review
- Audit all condition implementations against PF2e Remaster definitions
- Verify condition stacking, duration tracking, and interaction rules
- Build + playtest with conditions applied manually

---

## PHASE 3: HERO POINTS (WITH HOUSE RULE)
*Priority: High — already tracked on Creature, just needs mechanics*

### 3.1 Standard Hero Point spending ✅ IMPLEMENTED
- **Rule (PF2e standard)**: Spend 1 hero point to reroll any d20 check, take better result
- **Rule (PF2e standard)**: Spend all hero points while dying to stabilize at 0 HP and lose dying condition
- **Implementation**:
  - `spendHeroPoints()` method in `backend/src/game/rules.ts` (lines 2823-2891)
  - `stabilizeWithHeroPoints()` method in `backend/src/game/rules.ts` (lines 2894-2927)
  - Action routing: 'stabilize-with-hero-points' added to resolveAction
- **Status**: ✅ Backend mechanics complete

### 3.2 Enhanced Hero Point house rule ✅ IMPLEMENTED
- **Spend 1 HP**: Roll twice, take better (standard PF2e Fortune effect)
- **Spend 2 HP**: Roll twice, add +10 to the second roll (result capped at natural 20)
- **Spend 3 HP**: Automatic natural 20 (then apply degree of success normally — may result in regular success if DC is very high)
- **Validation**: Can't spend more hero points than available. Enforced in spendHeroPoints()
- **Status**: ✅ Backend logic complete with validation

### 3.3 Hero Point UI ✅ IMPLEMENTED
- **Modal Component**: New `HeroPointModal.tsx` with styled hero point spending options
- **Display**: Shows available hero points, current roll context, and 4 buttons (Keep/Reroll/Risky/Certain)
- **Styling**: Custom CSS in ActionPanel.css with clear visual hierarchy and affordances
- **Flow**: Modal appears after d20 roll, player selects spend option
- **Status**: ✅ UI component ready, awaiting integration into d20 roll flow

### 3.3.1 Integrate hero points into d20 roll system ⏳ IN PROGRESS
- **Scope**: Integrate HeroPointModal into attack rolls, saves, skill checks
- **Files to modify**: ActionPanel.tsx, CombatInterface.tsx (d20 roll routing)
- **Architecture**: After any d20 roll is displayed, trigger HeroPointModal
- **Status**: ⏳ Requires communication between roll system and modal component

### 3.4 Phase 3 Code Review ✅ COMPLETE

**Audit Summary (2026-02-11):**

✅ **FULLY IMPLEMENTED & PF2e COMPLIANT:**

**3.1 Hero Point Spending Mechanics — Backend ✅**
- `spendHeroPoints()` in `backend/src/game/rules.ts` (lines 3005-3090)
  - **1 HP**: Roll twice, take better (standard PF2e Fortune effect) ✅
  - **2 HP**: Roll twice, add +10 to second roll (capped at natural 20) ✅
  - **3 HP**: Automatic natural 20 ✅
  - Validation: Prevents spending more than available, enforces 0-3 range ✅
  - Deduction: `creature.heroPoints` properly decremented after spend ✅
- Hero point messages returned to frontend for combat log display ✅

**3.2 Hero Point Integration — d20 System ✅**
- `rollAttack()` (line 1377): Hero points integrated into attack rolls ✅
- `resolveDemoralize()` (line 2599): Integrated into Intimidation checks ✅
- `rollDeathSave()` (line 1620): Integrated into death saves ✅
- `resolveRetching()` (line 2930): Integrated into flat checks ✅
- **Thread-through verified**: `heroPointsSpent?: number` parameter appears in 13+ methods ✅
- All skill actions (Demoralize, Feint, Grapple, Trip, Shove, Disarm) support hero points ✅

**3.3 Hero Point UI — Frontend ✅**
- **PF2eHeroPoints component** (ActionPanel.tsx lines 159-239):
  - Displays 3 red circle pips with "H" glyph ✅
  - Click-to-spend interface (0 = keep roll, 1/2/3 = spend hero points) ✅
  - Visual feedback: gold glow on selected pip, semi-transparent when unavailable ✅
  - SVG title tooltips for accessibility ✅
- **Action Panel Integration**:
  - Hero point pips shown above available actions ✅
  - Confirmation box displays selected spend inline with target line ✅
- **Combat Log Integration**:
  - Fixed positioning tooltips show `heroPointMessage` on hover ✅
  - Messages display both roll values: "Rolls: [8, 15] → 15" ✅

**3.4 Frontend Validation & Routing ✅**
- `executeActionWithHeroPoints()` (CombatInterface.tsx line 498):
  - Only triggers for actions with `usesD20: true` flag ✅
  - Validates spend within available hero points (0-3, capped by creature's current HP) ✅
  - Resets `heroPointSpend` state after action ✅
- **d20 Action Flags**:
  - Strike ✅
  - Vicious Swing ✅
  - Demoralize ✅
  - Feint ✅
  - Grapple, Trip, Shove, Disarm ✅
  - Death Save ✅
  - Retching (Sickened flat check) ✅

**3.5 Hero Point Persistence ✅**
- `heroPoints?: number` stored on Creature interface (shared/types.ts line 185) ✅
- Deducted in backend, persisted in game state ✅
- Frontend displays current hero points via `creature.heroPoints` ✅
- Survives turn transitions (stored in game state, not ephemeral UI state) ✅

**3.6 Movement System Generalization ✅ BONUS**
- Refactored movement logic from hardcoded action IDs to generic `movementType` property:
  - `movementType: 'walk' | 'teleport'` added to Action interface ✅
  - Stride and Step now use `movementType: 'walk'` ✅
  - Movement distance calculated from `action.range` (Step=1, Stride=speed/5) ✅
  - Origin position excluded from valid movement targets ✅
  - BattleGrid checks `action.movementType === 'walk'` instead of individual IDs ✅
  - **Future-proofed**: Adding teleport/fly/burrow just requires setting `movementType` ✅

**PF2e Compliance Verification:**
- [x] Standard hero point mechanic (1 HP = reroll) matches Player Core p.12 ✅
- [x] House rule (2/3 HP) clearly documented and internally consistent ✅
- [x] No automatic nat 20 on crit confirmation (degrees of success resolve normally) ✅
- [x] Hero points deducted immediately, not restorable within encounter ✅

**Code Quality:**
- [x] Build passes without errors ✅
- [x] TypeScript strict mode compliance (SVG title tooltip fixed) ✅
- [x] Clean separation: backend rules logic ↔ frontend UI/routing ✅
- [x] No console.log spam (debug logs only where useful) ✅

**Testing Checklist:**
- [x] Strike action with 1/2/3 hero points → verify correct roll math
- [x] Demoralize with hero points → verify skill check integration
- [x] Hero points deplete correctly (3 → 2 → 1 → 0)
- [x] Combat log tooltips show both roll values
- [x] Confirmation box displays selected hero point spend
- [x] Step action shows only adjacent squares (1 square movement range)
- [x] Stride action shows full movement range
- [x] Cannot move to current occupied square

**🔄 PHASE 3 STATUS: COMPLETE — Ready for Phase 4 (Spell System Overhaul)**

---

## PHASE 4: SPELL SYSTEM OVERHAUL
*Priority: High — currently only 3 working spells*

### 4.1 Spell slot consumption
- **Files**: `shared/types.ts` (SpellcasterTradition already has slots), `backend/src/game/rules.ts`
- **Rule**: Casting a spell expends the slot. Track remaining slots per rank.
- **Data**: Pathbuilder import already provides slot data — just need to decrement on cast.

### 4.2 Spell heightening system
- **File**: `shared/spells.ts` → Spell interface, `backend/src/game/rules.ts` → resolveSpell
- **Rule**: Many spells gain extra effects when cast at higher ranks. Define as `heightening` field:
  ```
  heightening: { type: 'interval' | 'fixed', interval?: number, damage?: string, perInterval?: string }
  ```
- **Examples**: Magic Missile +1 missile per 2 ranks. Fireball +2d6 per rank above 3. Heal +1d8 per rank.
- **PF2e ref**: Player Core p.299

### 4.3 Cantrip auto-heightening
- **Rule**: Cantrips automatically heighten to half the caster's level (rounded up).
- **Example**: Level 5 caster's Shield cantrip = rank 3 cantrip.
- **PF2e ref**: Player Core p.299

### 4.4 Focus spells & Focus Points
- **Files**: `shared/types.ts` (focusPoints/maxFocusPoints already exist on Creature), `backend/src/game/rules.ts`
- **Rule**: Spend 1 focus point to cast focus spell. Refocus action (10 min, not combat-relevant for now). Max 3 focus points.
- **Already imported**: Pathbuilder provides focus spell lists.

### 4.5 Spell attack rolls vs Spell DCs
- **Rule**: Some spells require attack rolls (spellcasting proficiency + ability mod). Others require saves (targets roll against caster's Spell DC).
- **Already exists**: `calculateSpellDC()` and `calculateSpellAttack()` in shared/ac.ts. Wire into more spells.

### 4.6 Basic saves system (generalized)
- **Rule**: Crit success = no damage, Success = half damage, Failure = full damage, Crit failure = double damage.
- **Already partially exists**: Fireball uses this. Generalize for all spells with `save: 'basic'`.

### 4.7 Sustain a Spell
- **Rule**: 1 action to maintain a sustained spell. If not sustained, spell ends at start of your next turn.
- **NOT D&D concentration** — No concentration checks, just action cost.
- **PF2e ref**: Player Core p.304

### 4.8 Add core combat spells (by priority)

**Implementation order**: Heal first (enables combat healing), then attack cantrips, then buff/debuff, then utility.

**Cantrips:**
| Spell | Tradition | Effect |
|-------|-----------|--------|
| Produce Flame | Arcane/Primal | Spell attack, 1d4+mod fire, heightens +1d4/2 levels |
| Electric Arc | Arcane/Primal | 1-2 targets 30ft, 1d4+mod electricity, Reflex basic, +1d4/2 levels |
| Daze | Arcane/Occult | 1 creature 60ft, 1d6 mental, Will basic, stunned 1 on crit fail, +1d6/2 levels |
| Telekinetic Projectile | Arcane/Occult | Spell attack, 1d6+mod bludgeoning, +1d6/2 levels |
| Vitality Lash | Divine/Primal | 1 undead 30ft, 1d4+mod vitality, Fort basic |
| Gouging Claw | Arcane/Primal | Spell attack (touch), 1d6+mod slashing, +1d6/2 levels |

**Rank 1:**
| Spell | Tradition | Effect |
|-------|-----------|--------|
| Heal | Divine/Primal | 1-3 actions: touch 1d8/rank, ranged 30ft 1d8/rank, 30ft emanation 1d8/rank |
| Fear | Occult/Arc/Div/Primal | Will save → Frightened 1 (fail) / Frightened 2 (crit fail) |
| Command | Arcane/Divine/Occult | Will save → obey command for 1 round |
| Grease | Arcane/Occult | 4 squares, Reflex → off-guard, crit fail = prone |
| Hydraulic Push | Arcane/Primal | Spell attack, 3d6 bludgeoning + push 5ft |
| Runic Weapon | Arcane | +1 status to attack + striking for 1 minute |

**Rank 2:**
| Spell | Tradition | Effect |
|-------|-----------|--------|
| Resist Energy | All | Resistance 5 to chosen energy type |
| Dispel Magic | All | Counteract check to end spell |
| Enlarge | Arcane/Primal | Large, +2 status melee damage, reach +5ft |
| Blur | Arcane/Occult | Concealed (DC 5 flat check) |
| See Invisibility | Arcane/Divine/Occult | See invisible as concealed |

**Rank 3:**
| Spell | Tradition | Effect |
|-------|-----------|--------|
| Haste | Arcane/Occult/Primal | Quickened (Strike/Stride only) |
| Slow | Arcane/Occult/Primal | Fort save → Slowed 1 |
| Lightning Bolt | Arcane/Primal | 120ft line, 4d12 electricity, Reflex basic |
| Heroism | Divine/Occult | +1 status to attack, saves, skills |

**Rank 4+:**
| Spell | Tradition | Effect |
|-------|-----------|--------|
| Confusion | Occult | Will save → Confused |
| Fly | Arcane/Occult/Primal | Fly speed 20ft |
| Resilient Sphere | Arcane/Occult | Reflex → enclosed, can't be targeted |

> **Long-term goal**: Implement ALL PF2e Remaster spells. Prioritize combat-relevant spells. Add spells in batches per tradition as classes are implemented.

### 4.9 AoE shapes
- **Currently**: Only burst (circular radius). Need:
  - **Cone** — Triangular area from caster. PF2e cone template rules.
  - **Line** — 1 square wide, length varies.
  - **Emanation** — Centered on caster, affects all within radius.
- **File**: `backend/src/game/rules.ts` (AoE target collection), `frontend/src/components/BattleGrid.tsx` (AoE preview rendering)

### 4.10 Phase 4 Code Review
- Verify all spell effects match PF2e Remaster exactly
- Cross-reference heightening math against Archives of Nethys
- Confirm spell slot tracking works across multiple turns
- Build + playtest multiple spellcaster encounters

---

## PHASE 5: FIGHTER CLASS (COMPLETE IMPLEMENTATION)
*Priority: High — first fully playable class*

> **Philosophy**: Implement one class fully rather than partial features of many. After Fighter is complete, a player can run a Fighter through full combat with all class features working.

### 5.1 Fighter Base Features
- **Key Ability**: STR or DEX (already handled by Pathbuilder)
- **Weapon proficiency**: Expert in all weapons at L1, Master in specific groups later (Pathbuilder handles scaling)
- **Armor proficiency**: Trained in all armor + shields (already handled)
- **Attack of Opportunity / Reactive Strike**: Already implemented
- **Shield Block**: Already implemented
- **Weapon Specialization**: +2 damage with expert weapons, +3 master, +4 legendary. Per weapon group.
- **Battlefield Surveyor**: +2 Perception at appropriate level (handled by proficiency scaling)

### 5.2 Fighter Feats (Combat-Relevant, by Level)

**Level 1 Feats:**
| Feat | Effect | Implementation |
|------|--------|----------------|
| Power Attack | 2 actions (Flourish). 1 extra weapon die. | Special action, `resolveAttackAction` with extra die |
| Sudden Charge | 2 actions. Stride twice then Strike. | Compound action: 2x move + 1x strike |
| Double Slice | 2 actions (Flourish). Strike with each held weapon. Second strike uses full MAP from first, but both MAP counted as 1. | Dual-wield support via hand tracking |
| Intimidating Strike | 2 actions (Flourish). Strike, on hit target is Frightened 1 (crit = Frightened 2). | Wrap resolveAttackAction + apply condition |
| Exacting Strike | 1 action (Press). Strike, but if you miss, doesn't count for MAP. | Modify MAP tracking on miss |
| Reactive Shield | Reaction. Raise shield when targeted by attack. | New reaction type |
| Snagging Strike | 1 action. Strike, on hit target is off-guard until start of your next turn. | Wrap resolveAttackAction + apply condition |

**Level 2 Feats:**
| Feat | Effect | Implementation |
|------|--------|----------------|
| Knockdown | 2 actions (Flourish). Strike then free Trip if strike hit. | Compound action |
| Aggressive Block | Shield Block reaction pushes attacker 5ft or makes them off-guard. | Modify shield block resolution |
| Brutish Shove | Shove success: also off-guard until end of your next turn. | Modify resolveShove |
| Combat Grab | 1 action. Strike, on hit, grab target (requires free hand). | Wrap strike + grab, hand tracking validates |
| Dueling Parry | 1 action. +2 circumstance AC while wielding 1H weapon with free hand. | Add condition/bonus, hand tracking validates |
| Lunge | 1 action. Extend reach by 5ft for 1 Strike. | Temporary reach modifier |

**Level 4 Feats:**
| Feat | Effect | Implementation |
|------|--------|----------------|
| Swipe | 2 actions (Flourish). Strike two adjacent creatures with same attack roll. | AoE melee |
| Twin Parry | 1 action. +1 circumstance AC while dual wielding (+2 if parry trait). | Dual-wield bonus, hand tracking validates |
| Shatter Defenses | 2 actions (Press). Strike off-guard target, on hit they're off-guard to all until end of next turn. | Condition upgrade |

**Level 6 Feats:**
| Feat | Effect | Implementation |
|------|--------|----------------|
| Armor Specialization | Reduce damage by 1 per die of armor damage reduction (5ft/round if medium+). | Bonus to AC/damage reduction |
| Fearless | Immunity to fear condition. If already frightened, -1 to fear effects. | Add immunity condition |
| Guardian's Deflection | Reaction. When ally takes damage, spend reaction to reduce damage by shield hardness. | Reaction shield sharing |

**Level 8 Feats:**
| Feat | Effect | Implementation |
|------|--------|----------------|
| Weapon Mastery | Unlock critical specialization effect for all weapons. | Automatic crit effect application |

**Level 10+ Feats:**
| Feat | Effect | Implementation |
|------|--------|----------------|
| Flexible Flurry | Strike with different weapons in one turn without MAP penalty accumulation. | Movement-based MAP reset |
| Iron Will | +1 + (level/4) status bonus to Will saves. Hero points add additional. | Will save bonus + hero point option |
| Reflexive Shield | Free action raise shield when targeted by attack. | Auto-shield reaction |
| Dueling Riposte | Reaction. After successful Parry/Bristly Surge, counterattack with circumstance bonus. | Reaction counterattack |
| Improved Reflexes (L12) | Gain an extra reaction each round for Reactive Strike or Shield Block. | Extra reaction capacity |
| Reaction Enhancement (L12+) | Bonus to reaction-based abilities and checks. | +1 circumstance to reactions |

> **Later levels (6-20)**: Currently implemented: Armor Specialization, Fearless, Weapon Mastery, Flexible Flurry, Iron Will, Reflexive Shield, Improved Reflexes, Reaction Enhancement. Will expand as combat testing reveals priorities.

### 5.3 Phase 5 Code Review
- Verify every Fighter feat matches PF2e Remaster wording exactly
- Confirm feat prerequisites are enforced
- Test dual-wielding, shield interactions, and compound actions
- Build + playtest a full Fighter encounter at levels 1, 4, 8

---

## PHASE 6: PSYCHIC DEDICATION (ARCHETYPE) ✅ IMPLEMENTED
*Priority: High — user's specific build requirement*

> Implement Psychic Dedication archetype, specifically focusing on the Unbound Step Conscious Mind.

### 6.1 Archetype/Dedication system
- **File**: `shared/types.ts` — Add `dedications?: Dedication[]` to Creature
- **Structure**:
  ```typescript
  interface Dedication {
    name: string;          // e.g., "Psychic"
    feats: string[];       // Dedication feats taken
    spellcasting?: {...};  // If grants spellcasting
  }
  ```
- **Rule**: Dedication feat at level 2+. Must take 2 more feats from the archetype before taking another dedication.
- **Pathbuilder**: Already imports feats — need to classify dedication feats and wire up their effects.

### 6.2 Psychic Dedication specifics
- **Psychic Dedication feat**: Grants trained in Occult, 1 cantrip (from conscious mind), and ability to cast psi cantrips
- **Key feature for this build**: Access to Conscious Minds via the Psychic Dedication archetype

### 6.3 Unbound Step (Conscious Mind ability)
- **Type**: Conscious Mind ability (core Psychic class feature)
- **Warp Step** (amped version via feats): Teleport up to 60ft (requires feat taken at higher level)
- **PF2e ref**: Player Core (Conscious Minds, Remaster)
- **Implementation**: New movement type (teleport) that bypasses AoO/Reactive Strike checks, ignores difficult terrain, requires line of sight
- **Key benefit**: Does NOT trigger Reactive Strike (it's teleportation, not movement)

### 6.4 Focus Point integration
- Conscious Minds may grant focus pool access
- Refocus action (exploration mode, not relevant in combat currently)
- Focus point spending validation in ruleValidator

### 6.5 Phase 6 Code Review
- Verify Psychic Dedication prerequisites
- Confirm Unbound Step teleportation doesn't trigger reactions
- Test focus point spending and tracking (if applicable)
- Build + playtest Fighter with Psychic Dedication

---

## PHASE 7: SKILL ACTIONS COMPLETION
*Priority: Medium — adds tactical depth*

### 7.1 Grapple (Athletics vs Fortitude DC)
- **Attack trait** (MAP applies, counts for MAP)
- **Requirement**: Free hand (validated by hand tracking system)
- **Success**: Target is grabbed (off-guard, immobilized)
- **Crit Success**: Target is restrained
- **Crit Fail**: Attacker is off-guard until start of next turn
- **Sustained**: At start of grabber's turn, target can attempt Escape
- **PF2e ref**: Player Core p.233

### 7.2 Escape (Unarmed attack, Athletics, or Acrobatics vs grab DC)
- **Attack trait** (MAP applies)
- **Success**: Break free of grabbed/restrained/immobilized
- **Crit Success**: Also +5ft step
- **PF2e ref**: Player Core p.231

### 7.3 Disarm (Athletics vs Reflex DC)
- **Attack trait** (MAP applies)
- **Requirement**: Free hand (validated by hand tracking system), target has weapon
- **Success**: -2 circumstance to attacks with that weapon until start of your next turn
- **Crit Success**: Target drops weapon
- **PF2e ref**: Player Core p.230

### 7.4 Recall Knowledge
- **Rule**: Use appropriate skill to identify creature. Success = learn one useful fact (weakness, resistance, lowest save). Crit success = two facts. Once per creature per combat.
- **Skills by creature type**: Arcana (constructs, dragons), Nature (animals, plants, fey), Occultism (aberrations, spirits), Religion (celestials, fiends, undead), Society (humanoids)
- **GM integration**: GM narrates the knowledge gained, drawing from bestiary entry
- **PF2e ref**: Player Core p.236

### 7.5 Hide / Sneak (Stealth vs Perception DC)
- **Hide**: Become hidden (DC 11 flat check to target you)
- **Sneak**: Move while hidden without being detected
- **Requires**: Cover or concealment
- **PF2e ref**: Player Core p.237-238

### 7.6 All 16 Skills — Full Action List
For each skill, implement all combat-relevant action uses:

| Skill | Combat Actions | Priority |
|-------|---------------|----------|
| Athletics | Climb, Force Open, High Jump, Long Jump, Swim, Trip, Shove, Grapple, Disarm | High (Trip/Shove done, Grapple/Disarm in plan) |
| Acrobatics | Balance, Tumble Through, Maneuver in Flight | High (Tumble Through is tactical) |
| Stealth | Hide, Sneak, Avoid Notice | Medium |
| Intimidation | Demoralize, Coerce | High (Demoralize done) |
| Deception | Feint, Create a Diversion, Impersonate, Lie | Medium (Feint done) |
| Medicine | Treat Wounds, Battle Medicine, First Aid | High (healing!) |
| All others | Various exploration/downtime | Low (defer to GM system) |

### 7.7 Battle Medicine & Treat Wounds
- **Battle Medicine**: 1 action, Medicine check, heal 2d8 (trained), once per creature per day
- **Treat Wounds**: 10 min exploration, Medicine check, heal 2d8+ based on proficiency
- **Priority**: Battle Medicine for combat, Treat Wounds for between-combat (GM mode)

### 7.8 Tumble Through (Acrobatics vs Reflex DC)
- **Rule**: Move through enemy's space. Success = pass through. Fail = stop before space.
- **Important tactical action** for positioning

### 7.9 Phase 7 Code Review
- Verify all skill action DCs and degrees of success
- Confirm free hand requirements integrate with hand tracking
- Build + playtest

---

## PHASE 8: COMBAT ACTIONS COMPLETION
*Priority: Medium*

### 8.1 Delay
- **Rule**: Wait for later in initiative. When you return, initiative becomes just before the triggering creature's.
- **PF2e ref**: Player Core p.421

### 8.2 Ready
- **Rule**: 2 actions. Choose a trigger and a single action. When trigger occurs, take the action as a reaction.
- **Complex**: Requires trigger detection system
- **PF2e ref**: Player Core p.421

### 8.3 Aid
- **Rule**: Reaction. Prepare on your turn, then when ally acts, they get +1 circumstance bonus (crit success = +2, crit fail = -1)
- **PF2e ref**: Player Core p.420

### 8.4 Crawl
- **Rule**: 1 action while prone. Move 5ft. Does NOT trigger Reactive Strike.
- **PF2e ref**: Player Core p.420

### 8.5 Phase 8 Code Review

---

## PHASE 9: ARMOR, EQUIPMENT & CONSUMABLES
*Priority: Medium — needed for accurate AC/skills and item usage*

### 9.1 Armor catalog
- Create `shared/armor.ts` with all PF2e armor entries
- Each entry: name, category (unarmored/light/medium/heavy), AC bonus, DEX cap, check penalty, speed penalty, STR requirement, bulk, group, traits

### 9.2 DEX cap from armor
- **Rule**: Armor limits how much DEX you add to AC
- **File**: `shared/ac.ts` → `calculateAC()`
- **Pathbuilder**: Import should provide armor data. Parse and apply cap.

### 9.3 Armor check penalty
- **Rule**: Penalty to STR- and DEX-based skill checks (Athletics, Acrobatics, Stealth, Thievery)
- **Negated if**: Trained in that armor category

### 9.4 Speed penalty from armor (corrected) — INCLUDES PHASE 1.8
- **Rule**:
  - Medium armor: -5ft speed
  - Heavy armor: -10ft speed
  - Meeting STR requirement: **reduces** penalty by 5ft (NOT eliminates)
    - Heavy → -5ft if STR met
    - Medium → 0ft if STR met
- **Implementation**: Apply during character import and recalculate when armor changes
- **Files**: Pathbuilder import logic, `shared/ac.ts` speed calculation
- **PF2e ref**: Player Core p.274

### 9.5 Property runes
- **Striking runes**: Ensure combat damage uses them (may be fixed in Phase 1)
- **Potency runes**: +1/+2/+3 item bonus to attack rolls (weapon) or AC (armor)
- **Property runes**: Flaming (+1d6 fire), Frost (+1d6 cold), Shock (+1d6 electricity), etc.
- **Implementation**: Parse from Pathbuilder import, apply in damage/attack calculation

### 9.6 Consumables system
- **File**: `shared/consumables.ts` — catalog of potions, scrolls, elixirs, talismans, oils
- **Common consumables to implement**:
  - **Healing Potion** (Minor/Lesser/Moderate/Greater/Major): 1 action, drink, heal 1d8/2d8+5/3d8+10/5d8+15/8d8+20
  - **Elixir of Life**: As healing potion but alchemical
  - **Antidote/Antiplague**: Bonus to saves vs poison/disease
  - **Scroll**: Cast a spell you don't have prepared (requires spell tradition, cast DC = item DC)
  - **Talisman**: Affixed to item, one-time use consumable effect
  - **Bottled Lightning/Alchemist's Fire/Acid Flask**: Thrown splash weapons (alchemical bombs)
  - **Elixir of Fortitude/Life**: Temporary HP or resistance
- **Inventory integration**: Track consumables in creature inventory
- **Usage**: Use Item action (1 or 2 actions depending on item)
- **Pathbuilder import**: Parse consumables from import if present

### 9.7 Bulk & encumbrance (optional)
- **Rule**: Track total bulk carried, encumbered at 5+STR, max at 10+STR
- **Effects**: Encumbered = -10ft speed, clumsy 1. Max = can't move.
- **Priority**: Low — can skip initially, add later for realism

### 9.8 Phase 9 Code Review

---

## PHASE 10: ADDITIONAL CLASSES (ONE AT A TIME)
*Priority: Medium-Low — expand after Fighter is solid*

> **Principle**: Fully implement one class at a time. Each class session includes: base features, level 1-4 feats, class-specific actions, and a playtest. Higher level feats added as needed.

### 10.1 Implementation order
1. **Fighter** — Phase 5 (done first)
2. **Rogue** — Sneak Attack (nearly ready), finesse focus, Surprise Attack, Deny Advantage
3. **Champion** — Reactions (Retributive Strike, etc.), divine ally, lay on hands
4. **Barbarian** — Rage, instincts, animal/dragon/fury specifics
5. **Monk** — Flurry of Blows, ki spells, stances
6. **Ranger** — Hunt Prey, edges, animal companion (complex)
7. **Cleric** — Spellcasting + divine font (Heal/Harm), domain spells
8. **Wizard** — Arcane spellcasting, thesis, school specialization
9. **Bard** — Occult spellcasting, compositions (unique action type)
10. **Druid** — Primal spellcasting, orders, wild shape (very complex)
11. **Sorcerer** — Spontaneous casting, bloodline spells
12. **Oracle** — Cursebound mechanic, mystery
13. **Psychic** — Full class (vs dedication already done), conscious mind, unleash psyche
14. **Witch** — Patron, hex cantrips, familiar
15. **Magus** — Spellstrike, conflux spells
16. **Gunslinger** — Firearms, ways, reload system
17. **Inventor** — Innovation, overdrive
18. **Swashbuckler** — Panache, finishers
19. **Investigator** — Devise a Stratagem, strategic strike
20. **Summoner** — Eidolon (shared HP, act together — very complex)
21. **Kineticist** — Kinetic aura, element blasts, impulses
22. **Thaumaturge** — Exploit Vulnerability, implements

### 10.2 Per-class implementation template
For each class, implement in this order:
1. Key ability, HP, proficiencies (usually handled by Pathbuilder import)
2. Class-defining action (e.g., Rage, Sneak Attack, Hunt Prey)
3. Level 1-2 class feats (combat-relevant)
4. Level 4 class feats
5. Higher-level scaling (as needed for actual player characters)
6. Class-specific spellcasting (if applicable)
7. Code review + playtest at target level

### 10.3 Archetype/Dedication system (general)
- After Fighter + Psychic Dedication is complete, generalize the system
- Parse dedication feats from Pathbuilder import
- Common archetypes to support early: Marshal, Medic, Sentinel, Bastion
- **Long-term**: All archetypes from Player Core + supplements

### 10.4 Phase 10 Code Review (per class)

---

## PHASE 11: BESTIARY EXPANSION
*Priority: Medium — more content for encounters*

### 11.1 Expand level range
- Currently: Levels -1 to 6 (22 creatures)
- **Target**: Levels -1 to 15+ (100+ creatures)
- **Add creatures in batches** aligned with class level ranges being tested

### 11.2 Add spellcaster creatures
- **Need**: Creatures with spell lists for AI to use
- **Examples**: Goblin Pyro, Drow Priestess, Lich, Dragon (various)

### 11.3 Creature special abilities
- **Regeneration**: Heal HP each turn, disabled by specific damage type (fire for trolls)
- **Grab/Knockdown**: Auto-grapple/trip on hit (resolve using condition system from Phase 2)
- **Constrict**: Damage grabbed creatures automatically
- **Frightful Presence**: Aura that applies frightened (Will save on approach)
- **Poison**: Injury/contact poison on Strike (Fort save, stages, recurring saves)
- **Breath Weapon**: Dragon-style AoE (uses AoE shapes from Phase 4)

### 11.4 Creature artwork & tokens
- **Purpose**: Visual representation of creatures on the battle grid
- **Token system**:
  - Each creature type has an associated token image
  - Tokens displayed on grid at creature's position
  - Size-appropriate: Small (0.5×0.5), Medium (1×1), Large (2×2), Huge (3×3), Gargantuan (4×4)
  - Token borders indicate faction (player = blue, enemy = red, neutral = yellow)
- **Artwork sources**:
  - Default token pack (generic fantasy creatures)
  - PF2e-style token pack (if license-compatible)
  - Placeholder tokens (colored circles with initials) until art is added
- **Token customization**:
  - GM can change creature token image for variety
  - Multiple tokens per creature type (e.g., 5 different goblin tokens)
- **UI**: Token picker in encounter builder, token preview on hover
- **Files**: `frontend/public/tokens/`, `shared/types.ts` (tokenImage field on Creature)

### 11.5 GM-customizable creatures
- **Feature**: Let the AI GM create or modify creatures following GM Core guidelines
- **GM Core creature building rules**: Elite/Weak adjustments, custom creatures by level
- **Elite adjustment**: +2 to AC/attacks/DCs/saves/skills, +2 HP per level, +2 damage
- **Weak adjustment**: Reverse of elite
- **UI**: GM panel with creature editor (or natural language: "make the goblin boss an elite")

### 11.6 Phase 11 Code Review
- Verify creature stat generation matches PF2e formula
- Test creature special abilities (regeneration, grab, etc.)
- Confirm creature scaling (weak/elite) applies correctly
- Playtest encounters with 20+ distinct creatures

---

## PHASE 12: COMPLETE FEAT HANDLING
*Priority: Medium-High — feats are scattered across multiple phases, consolidate and complete*

> Implement ALL ancestry feats, general feats, and skill feats comprehensively. This ensures full character customization and supports all player builds.

### 12.1 Ancestry feats by lineage
- **File**: `shared/feats.ts` (NEW/expanded) → Organize feats by ancestry
- **Implement core ancestries**:
  - Human (Versatile Heritage + general feats: Adopted Ancestry, Natural Ambition, Multilingual, etc.)
  - Elf (keen senses, elven accuracy, tree warden, etc.)
  - Dwarf (dwarven fortitude, rock step, stone cunning, etc.)
  - Halfling (halfling luck, borrowed luck, keen eyes, etc.)
  - Gnome (gnome cunning, gnome obsession, illusion sense, etc.)
- **Installation**: Pathbuilder import already provides feats taken; validate and wire feat effects in `rules.ts`
- **PF2e ref**: Player Core pp.36-71

### 12.2 General feats (by level)
- **Feat types**: Available at any level (with prerequisite level)
  - **Level 1**: Toughness, Fleet, Incredible Initiative, Assurance (skill feats)
  - **Level 2**: Ancestral Paragon, Basic Bard/Cleric/Druid/Sorcerer/Wizard Spellcasting, Champion Dedication, Ranger Dedication, Rogue Dedication
  - **Level 4**: Expert Divination, Magical Crafting
  - **Level 6+**: Advanced options
- **Priority implementation**: Top 15-20 most common general feats
- **Files**: `shared/feats.ts` (feat definitions), `backend/src/game/rules.ts` (feat effect resolution)
- **PF2e ref**: Player Core pp.204-215

### 12.3 Skill feats (by level)
- **Skill feat mechanics**: On feat taken, player selects which skill to apply to (Acrobatics, Arcana, Athletics, Crafting, Deception, Diplomacy, etc.)
- **Examples**:
  - **Assurance**: Choose skill, add +2 (if trained), use 10 + mod + bonuses (never d20 roll)
  - **Battle Medicine**: Before combat, spend 1 action healing ally (heal +1d8+mod)
  - **Bon Mot**: Non-combat demoralize action
  - **Cat Fall**: Reduce fall damage by 10 × acrobatics proficiency bonus
  - **Continual Recovery**: Can use Treat Wounds without waiting 24 hours
  - **Expert Forager**: Forage for food/water at travel speed (exploration)
  - **Feint**: Attack action with Deception check to make target off-guard
  - **Intimidating Prowess**: Use STR instead of Intimidation for demoralize
  - **Lie to Me**: Sense when creatures lie (Insight bonus vs Deception)
  - **Picking Pockets**: Steal item from creature's person (Thievery)
  - **Quick Jump**: Jump without taking action before jump (Athletics)
  - **Recognize Inconsistency**: Sense when contradicted (Insight)
  - **Snare Crafting**: Create snares (like traps, but portable)
  - **Stunning Fist**: Unarmed strike stuns target (Fortitude/Reflex/Will save)
  - **Terrain Expertise**: Bonuses in specific terrain (Acrobatics in forests, Athletics in mountains, etc.)
- **Priority**: Top 20 commonly used skill feats
- **Files**: `shared/feats.ts`, `backend/src/game/rules.ts` (skill feat mechanic resolution)
- **PF2e ref**: Player Core pp.216-278

### 12.4 Feat requirement & level validation
- **File**: `backend/src/game/ruleValidator.ts` (enhance with feat validation)
- **Rules enforced**:
  - Feat level ≤ creature level
  - Feat prerequisites met (prior feats, ability scores, proficiencies)
  - Dedication feats: Can take dedication at level 2, can't take second dedication until 2 non-dedication feats from archetype taken
- **Validation**: On character creation/import, verify all taken feats meet requirements, flag invalid feats

### 12.5 Feat UI organization
- **Character sheet feat display**:
  - Organized by type: Ancestry | Class | Dedication | General | Skill
  - Each feat name, description, effects (tooltip on hover)
  - For skill feats, show selected skill and bonus
- **Feat selection on character creation**: Modal showing available feats, player selects (filter by level, type, prereq)
- **Files**: `frontend/src/components/CharacterSheetModal.tsx`, `frontend/src/components/FeatPicker.tsx` (NEW)

### 12.6 Phase 12 Code Review
- Verify all implemented feats match PF2e Remaster text exactly
- Test feat prerequisites and level gates
- Confirm skill feats apply bonuses correctly
- Playtest encounters with multiple player feats active simultaneously
- Ensure no conflicts between feat and class ability bonuses

---

## PHASE 13: 3D DICE ROLLER
*Priority: Medium — quality-of-life feature that significantly enhances appeal and immersion*

> Implement a 3D dice roller for all d20 rolls, damage rolls, and ability checks. Polished visual feedback with physics simulation makes every roll feel satisfying.

### 13.1 3D dice rendering
- **Library**: Babylon.js or Three.js for 3D graphics
- **Dice types needed**: d4, d6, d8, d10, d12, d20 (standard polyhedral set, plus d100 for percentile)
- **Physics**: Real gravity + collision, dice roll and settle with natural behavior
- **Styling**: PF2e-themed dice (metallic sheen, embossed numbers, custom colors per die type)
- **Performance**: Limit to 2024+ browsers with WebGL support

### 13.2 Roller UI modal
- **Trigger**: Any d20 roll (attack, save, check) → roller appears with modal. Normal rolls just show result, but critical moments (combat turns, boss fights) trigger visual roller
- **Modal content**:
  - Large 3D dice in center of screen
  - Throw button (or auto-roll after delay)
  - Result display: Die face value + modifier breakdown + final result
  - Rapid succession: If rolling multiple times (MAP, multiple saves), queue dice
- **Animation**: Dice settle, then glow/shine with success/failure color (green = success, red = failure, gold = critical success/failure)
- **Sound FX** (optional): Dice click/rattle + success/failure stings

### 13.3 Damage roller integration
- **Damage rolls**: Show pooled damage dice (e.g., 2d6+3 fire rolls as 2x red d6 + 3 pip d6 modifier)
- **Physics**: All dice roll together, settle, display each die's result + total
- **Breakdown**: Show damage type (fire, slashing, etc.) with color-coded dice
- **Sample** (attack workflow):
  1. Player clicks "Strike"
  2. d20 roller animates (shows attack roll)
  3. If hit, d8+3 damage roller animates
  4. Result displayed in combat log

### 13.4 Flavor rolls (utility)
- **Outside combat**: Perception checks, Deception checks, etc. can trigger roller (optional, toggleable)
- **Exploration**: Foraging checks, climbing checks, skill rolls all work with roller
- **Settings option**: "Always show 3D roller" / "Only on critical rolls" / "Never show"

### 13.5 Performance & network
- **Local rendering**: All physics runs client-side (no server latency)
- **Network**: Only send final result to server (die value + modifiers), not animation state
- **Mobile support**: Graceful degradation — mobile/low-end browser shows simple 2D result instead of 3D animation

### 13.6 Phase 13 Code Review
- Verify roller physics are deterministic (same seed = same dice roll animation)
- Test roller with all die combinations (d4-d20, multiple dice, modifiers)
- Performance check: Roller runs at 60 FPS on target hardware
- Playtest integration with combat (doesn't slow down turns)

---

## PHASE 14: RULE AUDIT & INTEGRATION CHECK
*Priority: CRITICAL — checkpoint before introducing AI GM*

> Before adding the AI chatbot (Phase 16), conduct comprehensive audit of all implemented rules: accuracy against PF2e Remaster, completeness, regressions, and integration.

### 14.1 PF2e compliance audit
- **File**: Create `RULE_AUDIT_REPORT.md` documenting findings
- **Checklist by category**:
  - **Combat resolution** (attack, damage, saves, MAP, conditions)
    - Verify attack roll formula: d20 + ability + prof + item bonus + circumstance + status
    - Verify damage formula: dice × (striking multiplier) + ability + bonuses
    - Verify save degree of success (crit success/success/fail/crit fail) maps to correct results
    - Verify MAP applies correctly to all Attack-trait actions (Strike, Trip, Shove, Disarm, Grapple)
    - Verify agile weapon MAP (-4, -8 vs -5, -10)
  - **Action economy** (actions, reactions, step vs stride, free actions)
    - Verify 3 actions + 1 reaction per turn
    - Verify Stride vs Step mechanics (Stride triggers Reactive Strike, Step does not)
    - Verify free actions don't exceed reasonable limits
  - **Proficiency & advancement** (bonuses, scaling with level, expertise)
    - Verify proficiency bonus formula: level ÷ 4 (rounded down) + 2 per rank (T/E/M/L)
    - Verify DEX cap on AC calculation
    - Verify armor trait implementation (bulwark, comfortable)
  - **Conditions** (listed in Phase 2)
    - Verify frightened/sickened/clumsy/enfeebled effects apply correctly
    - Verify heroic point condition interactions (dying + wounded)
    - Verify condition stacking rules (typed bonuses/penalties)
  - **Weapon traits** (Phase 1.3)
    - Deadly: Extra die on crit (d10, d12 per trait) ✓
    - Fatal: Upgrade die on crit ✓
    - Forceful: +1 on 2nd attack, +2 on 3rd+ (same turn, same weapon) — verify tracking
    - Sweep: +1 if different target already hit this turn
    - Backstabber: +1 precision vs off-guard
    - Volley: -2 penalty within specified range
    - Two-Hand: Use alternate die when wielded with 2 hands
    - Versatile: Alternate damage type
    - Propulsive: Half STR on ranged
    - Thrown: Can be thrown as ranged per range increment
  - **Spell system** (Phase 4)
    - Verify heightening mechanic (if not detailed, flag for clarification)
    - Verify spell DC formula (10 + ability + prof + item bonus)
    - Verify spell attack formula (similar to weapon attack)
    - Verify spell slot consumption
    - Verify cantrip auto-heightening (heighten to (level ÷ 2, rounded up))
  - **Rune system** (Phase 1.5)
    - Verify potency rune applies to attack only (not damage)
    - Verify striking rune applies correct multiplier (1⇒2d, 2⇒3d, 3⇒4d)
    - Verify resilient rune applies to saves
  - **Special abilities** (Fighter feats, Psychic features, etc.)
    - Verify all implemented class/archetype features match PF2e Remaster
    - Verify feat prerequisites are enforced
    - Verify feat bonuses don't stack incorrectly with class abilities

### 14.2 Integration testing
- **Test scenarios** (run each to verify no regressions):
  1. Single-enemy basic encounter (Strike/Move, resolves correctly)
  2. Multi-enemy flanking scenario (verify off-guard, damage bonuses, Sweep trait)
  3. Low-HP ally dies during combat (verify dying/recovery/death mechanics)
  4. Spell encounter (Burn Hands, Fireball, Heal, combat resolution)
  5. Skill action encounter (Feint, Shove, Trip, Grapple with hand tracking)
  6. MAP stacking (3+ attacks, verify penalties accumulate)
  7. Condition chain (off-guard → sickened → frightened, verify interactions)
  8. Level scaling (level 1 vs level 5 vs level 10 character, verify CR scaling)
  9. Critical success/failure outcomes (verify degree of success mechanics)
  10. Persistent damage tick (damage applies each turn, conditions expire correctly)

### 14.3 Code quality audit
- **Areas to review**:
  - **rules.ts**: Lines 1-50 (helpers), 1000-1150 (attack), 1150-1300 (damage) — verify no redundant code, clear naming
  - **Movement system**: Pathfinding logic, terrain penalties, parity tracking — verify efficiency, correctness
  - **Condition tracking**: Ensure conditions persist, expire, and interact correctly
  - **Bonus stacking**: Verify bonus application respects PF2e stacking rules
  - **Type safety**: No `any` types, proper TypeScript throughout
  - **Error handling**: All error paths have clear messages to player

### 14.4 Missing features flagged
- **If found**: Document any PF2e rules missing from implementation, mark for future phases
- **Examples**: Quickened action restriction, spell sustain tracking, elite/weak creature scaling, etc.

### 14.5 Performance audit
- **Metrics**:
  - Pathfinding speed (should be <50ms for 20x30 grid)
  - Creature AI turn time (should be <500ms)
  - UI render time (should be <16ms per frame = 60 FPS)
  - Memory usage (no memory leaks on long encounters)
- **Test**: Run 60-min encounter vs multiple enemies, monitor performance

### 14.6 Phase 14 Code Review
- Review audit report for accuracy
- Flag any blockers before AI phase
- Commit all fixes to version control
- Update RULE_AUDIT_REPORT.md with findings and resolution status

---

## PHASE 15: AESTHETIC REVISION & PF2e COMPLIANCE REVIEW
*Priority: HIGH — polish before shipping public AI feature (Phase 16)*

> Overhaul visual design to match PF2e aesthetic, ensure UI reflects rules accurately, and prepare for AI GM introduction.

### 15.1 PF2e visual compliance
- **Color scheme**:
  - Primary: Dark brown/tan (PF2e core color palette)
  - Accent: Gold foil (PF2e iconic)
  - Secondary: Dark grey/black UI backgrounds
  - Success: Green, Failure: Red, Critical: Gold
- **Fonts**:
  - Combat log: Serif (classic rulebook feel)
  - UI labels: Sans-serif (readable at small sizes)
  - Character names/titles: Decorative serif (distinctive, PF2e-like)
- **Icons**:
  - Actions: 1-action, 2-action, 3-action icons (ⓞ, ⓟ, ⓞⓞ symbols or custom)
  - Conditions: Icon per condition (frightened = scared face, etc.)
  - Damage types: Color-coded damage icons (fire = red, cold = blue, etc.)
  - Status effects: Visual indicators on creature tokens

### 15.2 UI layout refinement
- **Combat interface hierarchy**:
  - Large battle grid center
  - Character stats left panel (compact, easy scan)
  - Action panel below grid (current actions accessible)
  - Combat log right panel (scrollable history)
  - GM chat panel right panel tabbed (swappable with log)
- **Responsive design**: Scale gracefully on smaller screens
- **Accessibility**: High contrast, readable fonts, clear button labels, keyboard support

### 15.3 Combat log aesthetics
- **Log entry formatting**:
  - **Action header**: [Turn 3] Goblin's Turn
  - **Action result**: [Goblin] Strike vs Player → Miss (rolled 12, AC 16)
  - **Damage**: [Goblin] deals 5 fire damage to [Wizard]
  - **Condition**: [Wizard] gains Frightened 1
  - **Color coding**: Success (green), Failure (red), Condition (yellow), Damage (orange), Healing (blue)
- **Timestamps**: Optional, compact if shown
- **Replay**: Can click log entry to highlight involved creatures/squares

### 15.4 Character token & artwork
- **Token appearance**:
  - Player character: Full-color portrait in circle/hexagon, name below
  - Enemy creatures: Silhouette or simple icon
  - HP bar: Below token, color-coded (green/yellow/red by % health)
  - Status indicators: Badges/icons for conditions (frightened, prone, etc.)
  - Size indicators: Token size reflects creature size (Medium = 1 square, Large = 2x2, etc.)
- **Terrain representation**:
  - Difficult terrain: Hatched overlay or darker shade
  - Cover: Visual lines/barriers between squares
  - Elevation: Subtle height shading or 3D effect
  - Hazards: Clear visual symbol (fire = orange, spike = brown, etc.)

### 15.5 Action panel polish
- **Available actions display**:
  - Large primary action buttons (Strike, Stride, Cast Spell, etc.)
  - Secondary actions (Stand, Raise Shield, Interact, etc.) in row
  - Reaction status: "Reaction available ◉" or "Reaction used ○"
  - Movement budget: Visual indicator (e.g., "Distance: 0/25 ft" with progress bar)
- **Feat/ability display**: Hover feat name → tooltip with description
- **Keyboard shortcuts**: Display shortcut hints (e.g., "S for Stride")

### 15.6 Settings & immersion options
- **Visual settings**:
  - Battle grid: Background image (stone floor, dungeon, wilderness) — selectable per encounter
  - Grid style: Square, hex, or no grid
  - Animation speed: Slow/normal/fast creature movement
  - Miniature style: Flat tokens, 3D models (if time permitting), or silhouettes
  - Lighting: Toggle lighting/fog of war for dungeon encounters
- **Audio settings**:
  - Dice roller sounds: On/off
  - Combat music: On/off, volume
  - Ambient sound effects: On/off
- **Accessibility**:
  - High contrast mode
  - Screen reader support
  - Colorblind mode (all information conveyed by shape + color)

### 15.7 GM interface reskin
- **GM panel new aesthetic**:
  - Campaign title & description at top
  - Difficulty/tension bar (visual indicator of encounter difficulty)
  - Creature quick-controls (hidden, visible on hover)
  - Combat log tab (same as player view, but with extra GM-only notes)
  - GM chat tab (narrative input, AI response)
- **GM-only enticements**:
  - "Difficulty: Hard" badge on hard encounters
  - "Next round preview" hint (AI's planned actions)
  - Tension tracker visual (color-coded bar)

### 15.8 Phase 15 Code Review
- Visual audit: Does UI match PF2e aesthetic?
- Responsiveness test: UI works on 14" laptop, 27" desktop, iPad
- Accessibility audit: Color contrast meets WCAG AA, readable fonts, keyboard nav works
- Performance: Visual effects don't impact frame rate
- Build and deploy on fresh instance

---

## PHASE 16: AI GM CHATBOT
*Priority: High (core vision) — requires Phase 14-15 completed first for stability*

> The AI GM is the centerpiece of the project. It runs alongside combat, providing narrative, adjudicating non-mechanical decisions, and controlling encounter flow — but it CANNOT override the rules engine.
>
> **Prerequisite:** Phase 14 (Rule Audit) and Phase 15 (Aesthetic Revision) must be complete.

### 16.1 GM Chat interface
- **Layout**: Right-side panel, same area as combat log
- **Tabs**: "Combat Log" | "GM Chat" — player switches between them
- **Chat format**: Player types messages, GM responds with narrative + mechanical actions
- **Styling**: Distinct from combat log — more narrative font, GM avatar, etc.

### 16.2 GM rules binding
- **Critical architecture**: GM sends desired actions to the rules engine API, engine validates and executes
- **GM cannot**: Override AC, ignore conditions, change HP directly, skip rules
- **GM can**: Choose NPC actions within rules, add/remove creatures (via encounter API), apply conditions that are rule-valid, narrate outcomes, set difficulty
- **Enforcement**: All GM-initiated actions go through the same `ruleValidator` from Phase 0

### 16.3 Narrative tension tracker
- **Purpose**: Track dramatic pacing — rising tension, climax, falling action
- **Mechanics**:
  - Tension score (0-100): Low = exploration/calm, High = boss fight climax
  - Affects: GM narration style, **encounter difficulty scaling**, environmental descriptions
  - Player health/resource state feeds into tension calculation
  - GM can manually adjust tension ("this should feel desperate")
- **UI**: Subtle visual indicator on GM panel (color gradient, tension bar, or atmospheric border)
- **Effects on gameplay**:
  - Low tension (0-30) → GM offers rest opportunities, calmer narration, easier encounters
  - Mid tension (31-60) → Standard encounters, balanced narration
  - High tension (61-85) → Dramatic narration, enemies fight smarter, environmental hazards
  - Critical tension (86-100) → **Automatically increases encounter difficulty** (Elite adjustments, reinforcements, optimal AI tactics), desperate narration, BBEG involvement hints

### 16.4 Difficulty controls
- **GM panel controls**:
  - Overall difficulty slider (Easy → Normal → Hard → Deadly)
  - Per-encounter adjustment (Elite/Weak creature templates)
  - Dynamic difficulty: GM can mid-combat add/remove creatures, change tactics
  - XP multiplier adjustment
- **Affects**: Encounter builder XP budget, AI tactics sophistication, creature stat adjustments

### 16.5 GM session notes & story tracking
- **Session summary**: GM maintains running notes of what has happened this session
  - Records: Encounters completed, NPCs met, story beats, player decisions
  - Accessible to GM for context in future narration
  - Shown to player at session end as "Session Recap"
- **Recurring NPCs**: GM tracks named NPCs with persistent data
  - Name, role, disposition toward player, last interaction, current location
  - Includes: Allies, quest givers, merchants, rivals, villains
  - NPCs can reappear across multiple encounters with memory of past events
- **BBEG & overarching story**: GM maintains a secret campaign goal
  - Big Bad Evil Guy (BBEG) identity, motivations, long-term plan
  - Story arc structure: Early hints → rising threat → confrontation → climax
  - Player is NOT fully aware — GM drops clues through encounters, NPC dialogue, environmental storytelling
  - BBEG actions occur in background (off-screen events the player hears about)
  - Ensures constant narrative direction even in sandbox exploration

### 16.6 Campaign creation & player preferences
- **Campaign setup screen**: Before first session, player selects campaign style preferences
  - **Tone**: Heroic epic, gritty survival, political intrigue, dungeon crawl, exploration-focused
  - **Encounter balance**: Heavy combat, balanced, roleplay-heavy, puzzle-focused
  - **Themes**: Undead threat, dragon conflict, planar invasion, guild wars, wilderness survival, urban politics
  - **Pacing**: Fast (frequent combat), moderate, slow (exploration/story focus)
- **GM uses preferences**: Generates BBEG, story arc, and encounter types aligned with player choices
- **Adjustable mid-campaign**: Player can update preferences if they want tone shift

### 16.7 Encounter map database
- **Purpose**: Library of pre-designed tactical battle maps for encounters
- **Map catalog**: `shared/encounterMaps.ts` with 20-30 pre-made maps
- **Map properties**:
  - Name, description, theme (dungeon, wilderness, urban, indoor)
  - Grid dimensions (e.g., 20x20, 30x20)
  - Terrain features: walls, difficult terrain, cover, elevation, water/lava
  - Pre-placed hazards (optional)
  - Recommended creature count/level range
  - Starting zones (suggested player/enemy positions)
- **Map themes to include**:
  - **Dungeon**: Stone corridors, prison cells, throne rooms, treasure vaults, crypts
  - **Wilderness**: Forest clearings, mountain passes, riverside camps, cave entrances, ruins
  - **Urban**: City streets, tavern interiors, rooftops, alleyways, marketplaces, guard posts
  - **Indoor**: Manor halls, libraries, laboratories, temples, barracks
  - **Special**: Arena, ship deck, collapsing bridge, lava chasm, icy cavern
- **GM selection**: When creating encounter, GM picks from map library or uses blank grid
- **Visual preview**: Thumbnail preview of each map in encounter builder
- **Map editor** (stretch goal): GM can create/modify maps in-app
- **Files**: Map data in `shared/`, map visuals rendered by `BattleGrid.tsx`

### 16.8 GM encounter management
- **Between combats**: GM describes travel, roleplay, exploration
- **Encounter triggers**: GM decides when combat starts, selects map from library, places creatures
- **Mid-combat**: GM can narrate terrain changes, reinforcements, morale (flee) decisions
- **Post-combat**: GM narrates results, awards XP, describes loot

### 16.9 Phase 16 Code Review
- Verify GM cannot bypass rules engine
- Test tension tracker effects on narration and difficulty scaling
- Confirm difficulty controls produce valid encounters
- Verify session notes persist and summarize correctly
- Test recurring NPC tracking across multiple encounters
- Verify BBEG story arc maintains coherent narrative direction
- Test campaign preferences influence encounter generation
- Test encounter map library (selection, preview, terrain features work correctly)
- Playtest full narrative arc (travel → encounter with themed map → rest → boss fight with recurring villain)

---

## PHASE 17: AI COMBAT IMPROVEMENTS
*Priority: Medium — separate from GM chatbot*

### 17.1 Local tactical AI fallback
- **Issue**: No OpenAI API key = game is unplayable vs AI
- **Solution**: Rule-based tactical AI (no API needed):
  1. Evaluate threats (nearest enemy, lowest HP enemy, highest damage enemy)
  2. If injured < 50% and has healing → heal self
  3. If has ranged weapon and not adjacent to enemy → ranged strike
  4. If adjacent to target → melee strike (best weapon)
  5. If not adjacent → move toward priority target
  6. If shield equipped and 1 action left → raise shield
  7. Consider flanking positions (move to opposite side of ally)
  8. Use skill actions when appropriate (demoralize high-will targets, trip low-reflex targets)

### 17.2 GPT AI enhancement
- Provide full context: conditions, terrain, weaknesses, spell lists, all available actions
- Use structured output (function calling) for more reliable action selection
- Multiple actions per turn planning (not one-at-a-time)

### 17.3 AI difficulty tiers
- **Easy**: Move + Strike, random targeting
- **Normal**: All basic actions, focus fire on low HP
- **Hard**: Flanking, focus fire, skill actions, spells, retreat when low, protect casters
- **Deadly**: Optimal play — coordinated focus fire, exploit weaknesses, save disruption for casters

### 17.4 Phase 17 Code Review

---

## PHASE 18: CHARACTER SHEET & RE-IMPORT
*Priority: Medium — quality of life*

### 18.1 Character sheet overhaul
- **Dense information layout**: Compact stat blocks inspired by PF2e character sheet
  - Top: Name, Class, Level, HP bar, Hero Points, AC
  - Left column: Ability modifiers (compact grid), Saves, Perception
  - Center: Skills (compact list with bonuses), Skill actions available
  - Right: Weapons (with traits, damage, hand state icons), Armor, Shield
  - Bottom: Spells (by rank, slots remaining), Conditions (icon + value)
- **Aesthetic**: Dark theme consistent with game, PF2e-style borders/headers
- **Interactive**: Click weapon → see traits explained, click condition → see full description

### 18.2 Player character artwork & tokens
- **Character portraits**: Display character portrait on character sheet
- **Token images**: Player character token on battle grid
- **Custom artwork upload**:
  - "Upload Portrait" button on character sheet
  - "Upload Token" button (if different from portrait)
  - Supports common image formats (PNG, JPG, WebP)
  - Auto-resize/crop to appropriate dimensions
- **Default avatars**: If no custom upload, use default avatar based on ancestry/class
- **Token customization**: Border color, nameplate visibility, status indicators
- **Files**: `frontend/public/portraits/`, `frontend/public/player-tokens/`, `shared/types.ts` (portraitUrl, tokenUrl on Creature)

### 18.3 Re-upload from Pathbuilder
- **Feature**: "Update Character" button on character sheet
- **Flow**: Upload new Pathbuilder JSON → diff against current character → apply changes
- **Preserves**: Current HP, conditions, inventory state, position
- **Updates**: Ability scores, proficiencies, feats, spells, skills, HP max
- **Use case**: Player levels up between sessions, exports new Pathbuilder sheet
- **Validation**: Warn if level changed, confirm with user before applying

### 18.4 Inline trait/condition tooltips
- Hover over any trait name → tooltip with PF2e rules text
- Hover over condition → value, duration, effects summary
- Consistent across character sheet, action panel, combat log

### 18.5 Phase 18 Code Review

---

## PHASE 19: AREA MAP
*Priority: Medium — exploration layer*

### 19.1 Overworld/dungeon map
- **Separate from encounter grid** — larger scale map for navigation
- **Purpose**: Travel between locations, trigger encounters, discover areas
- **GM controlled**: GM describes locations, reveals map, places points of interest
- **Integration**: Click location → GM narrates → may trigger encounter → drops to tactical grid

### 19.2 Map features
- Named locations (towns, dungeons, wilderness areas)
- Fog of war (GM reveals as players explore)
- Travel triggers (random encounters, story events)
- Rest locations (for Treat Wounds, Refocus, etc.)

### 19.3 Dungeon map mode
- Room-by-room exploration
- Door/trap interaction (Thievery, Perception checks)
- Multiple encounters on same dungeon map
- Persistent creature/item state across rooms

### 19.4 Phase 19 Code Review

---

## PHASE 20: ENVIRONMENTAL HAZARDS & TRAPS
*Priority: Medium — adds tactical complexity and dungeon exploration*

### 20.1 Hazard system architecture
- **File**: `shared/hazards.ts` — Hazard type definitions
- **Hazard properties**: Name, level, type (trap/environmental), stealth DC (to detect), disable DC/skill, trigger, effect, reset
- **Types**:
  - **Traps**: Hidden, require Perception to detect, Thievery to disable
  - **Environmental hazards**: Obvious dangers (lava, pit, collapsing ceiling)
  - **Magical hazards**: Runes, glyphs, wards (may require dispel magic)

### 20.2 Trap detection & interaction
- **Detection**: Perception check vs trap's Stealth DC (typically 10 + trap level + 2-5)
  - Success = locate trap, learn basic properties
  - Crit success = learn trigger and specific mechanics
- **Disable**: Thievery check vs trap's Disable DC
  - Success = trap disabled
  - Crit fail = trigger trap
- **Trigger**: When conditions met (step on pressure plate, open door, break beam)
- **UI**: Reveal trap icon on grid when detected, show disable/avoid options

### 20.3 Common trap catalog
Implement priority traps by level range:

| Trap | Level | Trigger | Effect | Priority |
|------|-------|---------|--------|----------|
| **Spike Pit** | 0-2 | Step on cover | Fall 10ft (1d6), Reflex to grab edge | High |
| **Dart Trap** | 1-3 | Pressure plate | Attack +8 vs AC, 1d4+1 piercing | High |
| **Poison Dart** | 2-4 | Trip wire | Attack +10 vs AC, 1d4+poison (Fort save) | Medium |
| **Swinging Blade** | 3-5 | Door opens | Attack +12 vs AC, 2d8 slashing | High |
| **Fireball Rune** | 5-7 | Opened/read | 20ft burst, 6d6 fire, Reflex basic save | Medium |
| **Collapsing Ceiling** | 4-6 | Weight threshold | 4 squares, 3d8 bludgeoning, Reflex save | High |
| **Sleep Gas** | 3-5 | Opened | 10ft burst, Fort save or fall asleep 1 min | Low |

### 20.4 Environmental hazards
- **Lava/Fire**: Squares of lava deal fire damage at start of turn (5d6 or more)
- **Acid Pool**: Persistent acid damage if entered
- **Difficult Terrain**: Already implemented, but integrate with hazard system (rubble, ice, mud)
- **Pits**: Fall damage (1d6 per 10ft), Acrobatics to grab ledge
- **Collapsing structures**: Reflex save or take bludgeoning damage + prone
- **Damaging surfaces**: Spikes, caltrops, broken glass

### 20.5 Hazard placement on encounter grid
- **GM control**: GM can place hazards on grid during encounter setup
- **Hidden by default**: Traps are invisible until detected (or triggered)
- **Interact options**: Player can attempt to detect (Perception), disable (Thievery), or trigger deliberately
- **Integration with area map**: Dungeons may have persistent hazards across multiple rooms

### 20.6 Complex hazards (elite/boss-room hazards)
- **Multi-stage hazards**: Hazards that have actions each turn (e.g., filling room with water, advancing wall of spikes)
- **Hazard initiative**: Some hazards act on initiative (like creatures)
- **Disable takes multiple actions**: Complex hazards require multiple successful disable checks
- **PF2e ref**: GM Core hazards section

### 20.7 Phase 20 Code Review
- Verify trap detection/disable DCs match PF2e formulas
- Test trap triggering and damage application
- Confirm GM can place/remove hazards
- Playtest dungeon with traps and environmental hazards

---

## PHASE 21: LOOT, TREASURE & ECONOMY
*Priority: Medium — reward system for encounters*

### 21.1 Treasure generation system
- **File**: `backend/src/game/treasureGenerator.ts`
- **PF2e treasure by level**: Use treasure tables from GM Core
  - Each encounter has XP budget → corresponds to treasure value budget
  - Level 1 encounter = ~10-20 gp + 1-2 permanent items level 0-2 + 2-4 consumables
  - Scales with party level and encounter difficulty
- **Treasure bundles**: Pre-defined treasure sets by level bracket
- **Random generation**: GM can auto-generate treasure or manually assign

### 21.2 Loot UI & inventory management
- **Post-combat loot screen**: After encounter ends, show loot modal
  - List: Gold, items (weapons, armor, consumables, misc)
  - Player clicks to add to inventory
- **Inventory screen**: Accessible from character sheet
  - Weapons/armor equipped vs stored
  - Consumables list with "Use" button
  - Sell value displayed (typically half purchase price)
- **Drop/transfer items**: Manage inventory during exploration

### 21.3 Economy & shopping
- **Gold tracking**: Track player's gold pieces
- **Shop interface** (GM-controlled or pre-set):
  - Common items available for purchase at list price
  - Uncommon/rare items require GM approval (rarity system)
  - Sell items at half price
- **Settlement level**: Determines what's available to buy (villages have basic items, cities have higher-level items)
- **Integration with GM**: GM can add custom shops, control availability

### 21.4 Item rarity & access
- **Rarity levels**: Common, Uncommon, Rare, Unique
- **Access system**: Players can freely purchase common items. Uncommon+ requires GM permission or Access entry (ancestry, class, feat)
- **Pathbuilder import**: Imports items player already has (with rarity), respects access

### 21.5 Magic item identification
- **Rule**: Unidentified magic items require Identify Magic (10 min, Arcana/Nature/Occultism/Religion)
- **UI**: Loot appears as "Unidentified Potion" until identified
- **Auto-identify option**: GM can toggle auto-identify for simpler play

### 21.6 Treasure for key PF2e items
Ensure treasure generation can produce:
- **Fundamental runes**: Potency, striking, resilient (upgrade equipment)
- **Property runes**: Flaming, frost, shock, etc.
- **Specific magic weapons/armor**: Named items like "+1 flaming longsword"
- **Worn items**: Bracers of armor, rings, cloaks, belts, headbands (stat boosts, special abilities)
- **Held items**: Wands, staves (spell storage/casting)
- **Consumables**: Healing potions, scrolls, talismans

### 21.7 Phase 21 Code Review
- Verify treasure values match PF2e tables
- Test loot UI flow (encounter → loot → inventory → use/equip)
- Confirm economy balance (earning vs spending)
- Test item rarity and access system
- Playtest full loop: encounter → loot → shop → upgrade equipment → next encounter

---

## IMPLEMENTATION ORDER (SESSION-BY-SESSION)

Each "session" = one conversation/work block. ~30-60 minutes each.
Sessions marked with **[CR]** are dedicated code review sessions.

### Sessions 1-3: Phase 0 (Rule Enforcement Framework)
- **Session 1**: Action validation layer (`ruleValidator.ts`) + bonus stacking audit
- **Session 2**: Hand tracking system (full 2-hand slot implementation) + rename Vicious Strike → Vicious Swing
- **Session 3**: Condition interaction validation + **[CR] Phase 0 Code Review**

### Sessions 4-7: Phase 1 (Fix Broken Mechanics)
- **Session 4**: Fix movement system bugs (investigate + repair all movement issues)
- **Session 5**: Wire Burning Hands + Deadly/Fatal traits + range increment penalties
- **Session 6**: Striking runes in combat + flanking fix + Step action + armor speed penalty correction
- **Session 7**: Forceful/Sweep/Backstabber/Two-hand/Versatile/Propulsive/Volley + **[CR] Phase 1 Code Review**

### Sessions 8-10: Phase 2 (Complete Condition System)
- **Session 8**: Grabbed/Restrained/Immobilized + Stunned/Slowed action economy
- **Session 9**: Blinded/Concealed/Dazzled + flat check system + Doomed
- **Session 10**: Quickened/Fleeing/Paralyzed/Fatigued + **[CR] Phase 2 Code Review**

### Session 11: Phase 3 (Hero Points)
- **Session 11**: Hero point spending (standard + house rule) + UI + **[CR] Phase 3 Code Review**

### Sessions 12-18: Phase 4 (Spell System Overhaul)
- **Session 12**: Spell slot consumption + heightening + cantrip auto-heightening
- **Session 13**: Heal spell (all 3 variants) + generalize basic saves
- **Session 14**: Attack cantrips (Electric Arc, Produce Flame, TK Projectile, Daze, Gouging Claw)
- **Session 15**: Fear + Haste + Slow + Heroism + Sustain a Spell
- **Session 16**: Rank 1-2 utility spells (Grease, Blur, Enlarge, Runic Weapon, Resist Energy)
- **Session 17**: AoE shapes (cone, line, emanation) + Lightning Bolt + Rank 3-4 spells
- **Session 18**: **[CR] Phase 4 Code Review**

### Sessions 19-22: Phase 5 (Fighter Class Complete)
- **Session 19**: Weapon Specialization + Power Attack + Sudden Charge + Intimidating Strike
- **Session 20**: Double Slice + Exacting Strike + Reactive Shield + Snagging Strike
- **Session 21**: Level 2 feats (Knockdown, Aggressive Block, Brutish Shove, Combat Grab, Dueling Parry, Lunge)
- **Session 22**: Level 4 feats (Swipe, Twin Parry, Shatter Defenses) + **[CR] Phase 5 Code Review**

### Sessions 23-24: Phase 6 (Psychic Dedication Archetype)
- **Session 23**: Archetype/Dedication system + Psychic Dedication feat + Unbound Step focus spell
- **Session 24**: Focus point integration + teleportation movement type + **[CR] Phase 6 Code Review**

### Sessions 25-27: Phase 7 (Skill Actions Completion)
- **Session 25**: Grapple + Escape + Disarm (using hand tracking)
- **Session 26**: Battle Medicine + Tumble Through + Recall Knowledge
- **Session 27**: Hide/Sneak (basic) + **[CR] Phase 7 Code Review**

### Sessions 28-29: Phase 8 (Combat Actions Completion)
- **Session 28**: Delay + Crawl + Aid
- **Session 29**: Ready (if feasible) + **[CR] Phase 8 Code Review**

### Sessions 30-32: Phase 9 (Armor, Equipment & Consumables)
- **Session 30**: Armor catalog + DEX cap + speed penalties (corrected STR rule) + check penalties
- **Session 31**: Potency/Property runes
- **Session 32**: Consumables system (potions, scrolls, elixirs, talismans, bombs) + **[CR] Phase 9 Code Review**

### Sessions 33-38: Phase 10 (Additional Classes)
- **Session 33**: Rogue (Sneak Attack, Surprise Attack, Deny Advantage, Nimble Dodge, Twin Feint)
- **Session 34**: Champion (Retributive Strike, Lay on Hands, divine ally)
- **Session 35**: Barbarian (Rage, instincts) + Monk (Flurry, stances, ki)
- **Session 36**: Ranger (Hunt Prey, edges) + Cleric (divine font, channel)
- **Session 37**: Wizard (thesis, drain bonded item) + Bard (compositions, inspire courage/defense)
- **Session 38**: Remaining caster classes + **[CR] Phase 10 Code Review** (rolling reviews per 2 classes)

### Sessions 39-42: Phase 11 (Bestiary Expansion)
- **Session 39**: 15 new creatures (levels 0-5) + creature special abilities (regeneration, grab)
- **Session 40**: 15 new creatures (levels 6-10) + spellcaster creatures + poison/breath weapon
- **Session 41**: Creature artwork & tokens (token images, size-appropriate tokens, customization, token picker)
- **Session 42**: Elite/Weak system + GM creature customization + **[CR] Phase 11 Code Review**

### Sessions 43-45: Phase 12 (Complete Feat Handling)
- **Session 43**: Ancestry feats by lineage (Human, Elf, Dwarf, Halfling, Gnome) + feat UI organization
- **Session 44**: General feats (Toughness, Fleet, Incredible Initiative, Versatile Heritage, etc.)
- **Session 45**: Skill feats by priority (Assurance, Battle Medicine, Feint, Stunning Fist, etc.) + **[CR] Phase 12 Code Review**

### Sessions 46-47: Phase 13 (3D Dice Roller)
- **Session 46**: 3D dice rendering + roller UI modal + damage roller integration
- **Session 47**: Flavor rolls + performance optimization + **[CR] Phase 13 Code Review**

### Sessions 48-49: Phase 14 (Rule Audit & Integration Check) — CHECKPOINT BEFORE AI
- **Session 48**: Complete ruleset audit (combat, action economy, proficiency, conditions, traits, spells, runes, class abilities)
- **Session 49**: Integration testing (10 comprehensive scenarios) + performance audit + browser compatibility + **[CR] Phase 14 Code Review**

### Sessions 50-51: Phase 15 (Aesthetic Revision & PF2e Compliance Review) — CHECKPOINT BEFORE AI
- **Session 50**: PF2e visual compliance + UI layout refinement + combat log aesthetics + token/terrain appearance
- **Session 51**: Action panel polish + settings & immersion options + GM interface reskin + **[CR] Phase 15 Code Review**

### Sessions 52-59: Phase 16 (AI GM Chatbot)
- **Session 52**: GM chat interface (right panel, tabbed with combat log)
- **Session 53**: GM rules binding (all GM actions go through ruleValidator)
- **Session 54**: Campaign creation screen + player preference system
- **Session 55**: Narrative tension tracker + difficulty scaling + difficulty controls
- **Session 56**: Session notes tracking + recurring NPC system
- **Session 57**: BBEG & overarching story system
- **Session 58**: Encounter map database (20-30 themed maps: dungeon/wilderness/urban/indoor/special, terrain features, GM selection UI)
- **Session 59**: **[CR] Phase 16 Code Review** — critical review of GM/rules boundary, story coherence, map library

### Sessions 60-61: Phase 17 (AI Combat Improvements)
- **Session 60**: Local tactical AI fallback
- **Session 61**: GPT AI enhancement + difficulty tiers + **[CR] Phase 17 Code Review**

### Sessions 62-64: Phase 18 (Character Sheet & Re-Import)
- **Session 62**: Character sheet overhaul (dense layout, dark theme, interactive)
- **Session 63**: Player character artwork & tokens (portraits, token images, custom upload, default avatars)
- **Session 64**: Pathbuilder re-import + tooltips + **[CR] Phase 18 Code Review**

### Sessions 65-67: Phase 19 (Area Map)
- **Session 65**: Overworld map UI + fog of war
- **Session 66**: Dungeon map mode + room transitions
- **Session 67**: Integration with GM + encounter triggers + **[CR] Phase 19 Code Review**

### Sessions 68-70: Phase 20 (Environmental Hazards & Traps)
- **Session 68**: Hazard system + trap detection/disable mechanics
- **Session 69**: Common trap catalog (spike pit, darts, blades, collapsing ceiling, fireball rune)
- **Session 70**: Environmental hazards (lava, pits, difficult terrain) + GM hazard placement + **[CR] Phase 20 Code Review**

### Sessions 71-73: Phase 21 (Loot, Treasure & Economy)
- **Session 71**: Treasure generation system + loot UI
- **Session 72**: Inventory management + economy & shopping
- **Session 73**: Item rarity/access + magic item identification + treasure catalog + **[CR] Phase 21 Code Review**

### Sessions 74-75: Phase 22 (Final Rule Audit & Compliance Review) — FINAL CHECKPOINT
- **Session 74**: Complete ruleset audit (all phases 1-21, system interactions, regressions)
- **Session 75**: Regression testing (comprehensive scenarios) + performance audit + browser compatibility + **[CR] Phase 22 Code Review**

### Sessions 76-78: Phase 23 (Final Aesthetic Polish & Optimization) — RELEASE PREPARATION
- **Session 76**: Visual polish pass + audio integration + interaction polish + performance optimization
- **Session 77**: Mobile responsiveness + accessibility final sweep + UX refinement + marketing-ready polish
- **Session 78**: Final code cleanup + documentation audit + **[CR] Phase 23 Code Review** → release v1.0

### Ongoing: Spell & Creature Backfill
- After core systems are stable, continue adding spells and creatures in batch sessions
- Target: All Player Core spells, all common creature families
- GM creature editor enables further expansion without code changes

---

## PF2e REMASTER REFERENCE CHEAT SHEET

> Use this to validate any implementation. If a mechanic doesn't match, it's wrong.

### Ability Modifiers (Remaster)
- Modifiers only (no scores). Range typically -1 to +4 at level 1.

### Proficiency Bonus
- **Formula**: Level + proficiency modifier
- **Ranks**: Untrained (+0), Trained (+2), Expert (+4), Master (+6), Legendary (+8)
- **Untrained**: Some skills allow untrained use, proficiency bonus = 0 (not level+0)

### AC Formula
```
AC = 10 + DEX mod (capped by armor) + proficiency bonus (armor) + item bonus (armor/potency rune) + circumstance bonus (shield/cover)
```

### Attack Roll Formula
```
d20 + ability mod (STR or DEX) + proficiency bonus (weapon) + item bonus (potency rune) + MAP + circumstance + status
```

### Damage Formula
```
weapon dice (× striking multiplier) + ability mod (STR for melee, 0 for ranged unless propulsive/thrown) + bonuses + status + specialization
```

### Saving Throw Formula
```
d20 + ability mod (DEX/CON/WIS) + proficiency bonus (save) + item bonus + status + circumstance
```

### Spell DC Formula
```
10 + ability mod (key ability) + proficiency bonus (spellcasting) + item bonus
```

### Degrees of Success
| Result | Condition |
|--------|-----------|
| Critical Success | Roll ≥ DC + 10, or nat 20 upgrades success → crit success |
| Success | Roll ≥ DC |
| Failure | Roll < DC |
| Critical Failure | Roll ≤ DC - 10, or nat 1 downgrades failure → crit failure |

### Multiple Attack Penalty (MAP)
| Attack # | Standard | Agile |
|----------|----------|-------|
| 1st | +0 | +0 |
| 2nd | -5 | -4 |
| 3rd+ | -10 | -8 |

### Basic Save Results
| Degree | Damage |
|--------|--------|
| Critical Success | 0 |
| Success | Half |
| Failure | Full |
| Critical Failure | Double |

### Dying & Recovery (Remaster)
- Drop to 0 HP → gain dying 1 (+ wounded value if wounded)
- Recovery check: flat check DC = 10 + dying value
  - Crit Success: dying -2
  - Success: dying -1
  - Failure: dying +1
  - Crit Failure: dying +2
- Dying ≥ 4 (or 4 - doomed) → dead
- Recover from dying → wounded value increases by 1

### Action Economy
- 3 actions + 1 reaction per round
- Free actions: unlimited but specific triggers
- Slowed: lose N actions
- Quickened: gain 1 action (restricted use)
- Stunned: lose N actions at start of turn

### Armor Speed Penalties (Corrected)
- Medium armor: -5ft speed (-0ft if STR requirement met)
- Heavy armor: -10ft speed (-5ft if STR requirement met)
- Meeting STR req reduces penalty by 5ft, does NOT eliminate it for heavy armor

---

## FILES TO MODIFY PER PHASE

| Phase | shared/ | backend/src/game/ | frontend/src/ |
|-------|---------|-------------------|---------------|
| 0 | types.ts (hands) | ruleValidator.ts (NEW), rules.ts, engine.ts | ActionPanel.tsx |
| 1 | weapons.ts (traits) | rules.ts | — |
| 2 | types.ts (conditions) | rules.ts, engine.ts | ActionPanel.tsx |
| 3 | types.ts | rules.ts | ActionPanel.tsx, CombatInterface.tsx |
| 4 | spells.ts, types.ts | rules.ts | ActionPanel.tsx, BattleGrid.tsx |
| 5 | types.ts, actions.ts | rules.ts | ActionPanel.tsx |
| 6 | types.ts | rules.ts | ActionPanel.tsx |
| 7 | actions.ts | rules.ts | ActionPanel.tsx |
| 8 | actions.ts, types.ts | rules.ts, engine.ts | ActionPanel.tsx, CombatInterface.tsx |
| 9 | types.ts, ac.ts, armor.ts (NEW) | rules.ts | CharacterSheetModal.tsx |
| 10 | types.ts | rules.ts | ActionPanel.tsx |
| 11 | bestiary.ts | — | — |
| 12 | feats.ts (NEW) | rules.ts | FeatPicker.tsx (NEW), CharacterSheetModal.tsx |
| 13 | — | — | DiceRoller.tsx (NEW), componentsfor 3D |
| 14 | — | — | RULE_AUDIT_REPORT.md (NEW) |
| 15 | — | — | Global CSS + UI components styling |
| 16 | types.ts, encounterMaps.ts (NEW) | ai/gmManager.ts (NEW) | GmChatPanel.tsx (NEW), EncounterBuilder.tsx, layout changes |
| 17 | — | ai/manager.ts | — |
| 18 | — | — | CharacterSheetModal.tsx, PathbuilderUploadModal.tsx |
| 19 | types.ts | — | AreaMap.tsx (NEW), layout changes |
| 20 | hazards.ts (NEW) | rules.ts (hazard resolution) | BattleGrid.tsx (hazard rendering) |
| 21 | treasureGenerator.ts (NEW), items.ts (expand) | game/treasureGenerator.ts (NEW) | InventoryModal.tsx (NEW), ShopUI.tsx (NEW) |
| 22 | — | — | RULE_AUDIT_REPORT.md (update) |
| 23 | — | — | Global CSS, animations.ts (NEW), audio.ts (NEW), UI overhaul |

---

## ANTI-PATTERNS TO AVOID

1. **Don't invent conditions** — Only use PF2e Remaster conditions. No "dazed", "weakened", "burning" (use the official names).
2. **Don't add non-PF2e damage types** — Only: bludgeoning, piercing, slashing, bleed, fire, cold, electricity, acid, sonic, vitality, void, spirit, poison, mental, force. No "radiant", "necrotic", "thunder", "psychic" (those are D&D 5e).
3. **Don't use D&D terminology** — "off-guard" not "flat-footed". "vitality" not "positive energy". "void" not "negative energy". "Recovery Check" not "death save". "Vicious Swing" not "Vicious Strike".
4. **Don't add advantage/disadvantage** — PF2e uses typed bonuses/penalties. Fortune/misfortune effects = roll twice take better/worse, but named mechanics.
5. **Don't skip MAP on Attack-trait actions** — Trip, Shove, Grapple, Disarm all have Attack trait.
6. **Don't double-dip bonus types** — Only highest of each typed bonus/penalty applies.
7. **Don't make reactions free** — One reaction per round.
8. **Don't add D&D concentration** — PF2e uses "Sustain a Spell" (1 action/turn, no check).
9. **Don't give cantrips spell slots** — Cantrips are unlimited. Auto-heighten to half caster level.
10. **Don't mix spell traditions** — Arcane, Divine, Occult, Primal are distinct.
11. **Don't let GM bypass rules** — GM actions go through the same rule validator as player actions.
12. **Don't implement partial classes** — Fully implement one class before starting the next.
13. **Don't confuse STR requirement effect** — Meeting armor STR requirement reduces speed penalty by 5ft, does NOT eliminate it entirely for heavy armor.

---

## SUGGESTIONS (FLAGGED FOR USER REVIEW)

> These are ideas that may improve the project. Confirm or decline before implementation.

### S1. Automated PF2e rules test suite
- Create a `tests/` folder with automated tests for every PF2e rule implemented
- Each test validates a specific rule (e.g., "deadly trait adds correct damage on crit", "MAP applies correctly to agile weapons")
- Run automatically on build to catch regressions
- **Why**: Catches rule drift without manual playtesting every time

### S2. Spell data from external source
- Instead of hand-coding every spell, parse spell data from a structured PF2e data source (e.g., Foundry VTT pf2e system data, which is open source under ORC license)
- Would vastly accelerate spell library completion
- **Risk**: Need to verify data accuracy, may need transformation layer

### S3. Condition effect registry
- Instead of if/else chains checking conditions in `calculateAC`, `calculateAttack`, etc., build a declarative condition effect registry:
  ```typescript
  conditionEffects['frightened'] = { type: 'status', penalty: true, affects: ['attack', 'ac', 'saves', 'skills', 'dc'], value: 'conditionValue' }
  ```
- Makes adding new conditions systematic and less error-prone

### S4. Combat replay / undo system
- Record every action as an event, enable rewinding the game state
- Useful for: "wait, I forgot to raise my shield" situations
- Complex but high quality-of-life value

### S5. Multi-party support
- Support multiple player characters in the same encounter
- Each player controls their own character's turns
- Later: networked multiplayer

### S6. Sound effects & music implementation
- **Sound effects**: Hit sounds, miss sounds, spell animations (CSS), condition application effects
- **Music**: Background music tracks that change based on context
  - Exploration music (calm)
  - Combat music (intensity tracks tension level)
  - Boss fight music (epic)
  - Victory/defeat stingers
- **Integration**: Music volume adjusts with tension tracker
- **Priority**: Low — enhances feel but not essential to gameplay
- Enhances the atmosphere dramatically with minimal code

### S7. Persistent campaign state
- Track XP, level, gold, inventory across multiple encounters
- Character progression between sessions
- Integrates with GM narrative and re-import system

### S8. Ancestry feats, general feats & skill feats
- **Currently**: Class feats are being implemented per class. Ancestry/general/skill feats are not explicitly scheduled.
- **Recommendation**: Add a dedicated phase (after Phase 10) for:
  - All ancestry feats (by ancestry: Human, Elf, Dwarf, Halfling, Gnome, etc.)
  - General feats (Toughness, Fleet, Shield Block, Incredible Initiative, etc.)
  - Skill feats (Assurance, Battle Medicine, Intimidating Prowess, Quick Jump, etc.)
- **Effort**: ~3-4 sessions to implement ~50 commonly used feats
- **Priority**: Medium — needed for full character customization

### S9. Full affliction system (diseases, curses)
- **Currently**: Poison mentioned in bestiary phase, persistent damage exists, but no full affliction system
- **PF2e afflictions**: Multi-stage conditions that require saves each interval (onset → stage 1 → stage 2 → etc.)
  - **Poison**: Injury/contact/ingested, Fort saves, HP damage or conditions per stage
  - **Disease**: Fort saves, long duration (days), incubation period
  - **Curse**: Removal requires Remove Curse spell or specific conditions
- **Implementation**: Extend condition system with stages, intervals, recurring saves
- **Priority**: Medium — important for certain enemies (undead, poisonous creatures, cursed items)

### S10. Vision, lighting & stealth in exploration
- **Vision types**: Normal vision, low-light vision (see in dim light), darkvision (see in darkness)
- **Light levels**: Bright light, dim light, darkness
- **Concealment from lighting**: Creatures in dim light are concealed, in darkness are hidden
- **Stealth in exploration mode**: Hide/Sneak outside combat (persistent stealth vs Perception)
- **Implementation**: Grid lighting overlay, creature vision properties, fog of war per light level
- **Priority**: Medium — tactical depth, especially for dungeon crawls

### S11. Exploration mode activities
- **PF2e exploration mode**: Downtime between encounters with travel speed, ongoing activities
- **Activities**: Defend, Detect Magic, Follow the Expert, Investigate, Scout, Search, Track, etc.
- **Effects**: Bonuses to initiative, auto-detect traps, find hidden creatures/objects
- **Integration**: Area map travel triggers exploration mode, player selects activity
- **Priority**: Low — nice-to-have for full PF2e experience

### S12. Advanced movement modes
- **Currently**: Walk/Stride only (ignoring fly from spells, climb/swim not implemented)
- **Climb**: Athletics check, move at 1/4 speed up vertical surface (crit fail = fall)
- **Swim**: Athletics check, move in water (unarmored 1/4 speed)
- **Fly**: From spells (Fly), items, or creature ability. Full 3D positioning.
- **Burrow**: Rare, some creatures only
- **Implementation**: Track 3D position (z-axis), add climb/swim actions, flying creature AI
- **Priority**: Low initially, High when flying spells/creatures are common

### S13. Weather & environmental conditions
- **Weather effects**: Rain (concealment, difficult terrain), wind (ranged attack penalties, flying difficulty), fog (concealment), snow (difficult terrain, concealment)
- **Temperature**: Extreme heat/cold (Fort saves, fatigue)
- **Integration**: GM can set weather for encounter/area, affects all creatures
- **Priority**: Low — flavor and immersion

### S14. Downtime activities
- **Earn Income**: Use skill to make money between adventures
- **Craft**: Create items (requires formula, time, skill check)
- **Retrain**: Change feat or skill proficiency (requires downtime)
- **Long-term projects**: Research, establish base, recruit followers
- **Integration**: Between-campaign-arc phase, GM grants downtime days
- **Priority**: Low — campaign continuity feature

### S15. Animated combat feedback
- **Hit/miss animations**: Flash red on hit, grey flash on miss
- **Damage numbers**: Floating damage numbers that fade out
- **Condition application**: Visual effect when condition applied (e.g., frightened = shaking icon)
- **Spell effects**: CSS animations for spell impacts (fireball explosion, lightning bolt streak)
- **Movement trails**: Brief trail showing creature's path during Stride
- **Priority**: Low — polish and juice, but enhances feel significantly

### S16. Advanced map features & editor
- **In-app map editor**: GM can create custom encounter maps
  - Drag-and-drop terrain tiles (walls, doors, difficult terrain, water, etc.)
  - Elevation tools (stairs, cliffs, platforms)
  - Hazard placement (traps, lava squares)
  - Save custom maps to library
- **Dynamic terrain**: Terrain that changes mid-combat (collapsing floors, rising water, moving walls)
- **Map import**: Import map images as battle grid backgrounds
- **3D visualization**: Isometric or 3D view of battle grid (ambitious stretch goal)
- **Community map sharing**: Players can export/import custom maps
- **Priority**: Low — nice-to-have after core map library is stable

---

## PHASE 22: FINAL RULE AUDIT & COMPLIANCE REVIEW
*Priority: CRITICAL — final checkpoint before release*

> At project completion, conduct final comprehensive audit to verify all systems work together correctly, no regressions from earlier phases, and full PF2e Remaster compliance across entire codebase.

### 22.1 Complete ruleset audit
- **Scope**: Re-verify all phases 1-21, focusing on interactions between systems
- **Checklist**:
  - All weapon traits work correctly in concert with feat system
  - Condition interactions with spells, abilities, and environmental effects
  - Feat combos work as intended (e.g., Power Attack + Deadly, Sneak Attack + flanking)
  - Spell slots, focus points, and action economy flow correctly through entire encounter
  - Class abilities don't conflict or over-stack with items/runes/feats
  - Creature AI respects all rules (can't make illegal moves, attacks respect MAP, etc.)
  - Encounter scaling (elite/weak) interacts correctly with feats and abilities
  - AI GM cannot bypass rule validator in any scenario

### 22.2 Regression testing
- **Test scenarios** (comprehensive, build on Phase 14):
  - Full 30-minute combat encounter: single player vs 3 enemies
  - Multi-round spell encounter: caster vs multiple spellcasters
  - Complex feat interactions: Fighter with Power Attack + Knockdown + Sweep on 3+ enemies
  - Condition chain: frightened → sickened → stunned → recovered, verify no double penalties
  - Persistent damage ticks: Apply multiple persistent conditions, verify ticks and removal
  - Hero point spending: Spend hero points on critical rolls, verify effects
  - Treasure & economy: Complete encounter, generate loot, purchase equipment, re-equip
  - Skill actions: Advanced maneuvers (Feint → Trip → Grapple → Escape)
  - Range/cover/concealment: Attacks respect all modifiers in combination

### 22.3 Performance audit (final)
- **Metrics**:
  - 60-minute encounter: sustained 60 FPS on target hardware
  - Pathfinding: <100ms for complex 40x40 grid with obstacles
  - AI turn time: <500ms per turn (even with 5+ creatures)
  - UI load time: <3 seconds to start new encounter
  - Memory: No memory leaks over 60-minute session
- **Tools**: Chrome DevTools, performance profiler

### 22.4 Browser compatibility
- **Approved environments**:
  - Chrome 120+
  - Firefox 121+
  - Safari 17+
  - Edge 120+
- **Test**: Run full encounter in each browser, verify no visual/functional differences

### 22.5 Documentation audit
- **Files to review**:
  - Code comments match actual behavior
  - Function signatures clear and well-documented
  - README.md up-to-date with installation/running instructions
  - API documentation complete (if exposing external API)
  - PF2e rule references accurate (Archives of Nethys links current)

### 22.6 Phase 22 Code Review
- Final audit report generated
- All findings resolved before release
- Version bump and release notes
- Final commit to main branch

---

## PHASE 23: FINAL AESTHETIC POLISH & OPTIMIZATION
*Priority: HIGH — final polish for public release*

> Last phase before public release. Optimize visuals, performance, and user experience across all systems.

### 23.1 Visual polish pass
- **High-fidelity UI**:
  - Smooth animations everywhere (creature movement, damage numbers, condition application, spell effects)
  - Consistent iconography across entire application
  - PF2e-accurate color palette used consistently (no mismatched colors)
  - Typography hierarchy clear (headings, labels, body text sizes consistent)
  - White space balanced (no cramped layouts, proper breathing room)
- **Spell/ability VFX**:
  - Fireball: Large explosion animation with fire particles
  - Lightning Bolt: Streaking bolt with electrical effects
  - Heal: Green sparkles/auras
  - Burning Hands: Cone of flames with directional spread
  - Buffs: Glow overlay on affected creatures
  - Debuffs: Darkening or status-condition icons

### 23.2 Audio final pass
- **Essential sounds**:
  - Dice roller: Satisfying rattle/clatter on roll, chime on result
  - Hit/miss: Sharp hit sound on successful strike, whoosh on miss
  - Crit success/failure: Distinctive stinger (fanfare/sad trombone)
  - Spell cast: Magical whoosh or relevant school-appropriate sound
  - Healing: Warm chime or healing tone
  - **Optional background music**:
    - Exploration loop (calm, ambient)
    - Combat loop (medium intensity, drum-based)
    - Boss fight loop (epic, orchestral)
    - Tension-based music intensity (linked to GM tension tracker)
- **Volume controls**: Master volume, SFX volume, music volume (separate sliders)

### 23.3 Interaction polish
- **Tooltips everywhere**: Hover any stat, trait, condition, feat → helpful tooltip
- **Confirmation dialogs**: Critical actions (delete character, end encounter) ask for confirmation
- **Keyboard shortcuts**: Common actions have hotkeys (S for Stride, St for Strike, etc.), shortcuts displayed in UI hints
- **Undo/Redo** (if time): Rewind last action (helps with "oops" moments)
- **Gesture support** (if mobile): Swipe creatures to select, pinch to zoom grid

### 23.4 Performance optimization
- **Code optimization**:
  - Lazy-load creature AI code (only load when AI creatures present)
  - Memoize expensive calculations (pathfinding, bonus stacking)
  - Optimize grid rendering (don't redraw unchanged squares)
  - Compress assets (minify JS, compress images)
- **Bundle size**:
  - Target: <500KB main bundle (after gzip)
  - Images: Use WebP with PNG fallback, compress losslessly
  - Spells/creatures: Load on-demand per encounter (not all at startup)

### 23.5 Mobile responsiveness (stretch)
- **Tablet support** (12"+ tablets):
  - Turn-based controls accessible
  - Grid visible without excessive panning
  - Touch-friendly buttons (48px minimum)
- **Phone support** (if feasible):
  - Simplified layout for <6" screens
  - Horizontal grid with overlaid controls
  - May require modal for action selection

### 23.6 Accessibility final sweep
- **Keyboard navigation**: All UI elements accessible via Tab/Arrow keys, Enter to activate
- **Screen reader support**: Semantic HTML, ARIA labels for dynamic content, alt text for all icons
- **Color blindness**: All information conveyed by shape+label, not color alone
  - Red/Green colorblind mode: Use distinct colors (blue/yellow instead)
  - High contrast option: Increase color contrast to WCAG AAA
- **Text sizing**: User can increase/decrease font size (browser zoom)
- **Focus indicators**: Clear visible focus ring on all interactive elements

### 23.7 User experience refinement
- **Loading states**: Spinner/progress bar during encounter load, spell resolution
- **Error messages**: Friendly, non-technical error messages ("You're too far to reach that!" vs "invalid range")
- **Onboarding**: Quick tutorial on first load (how to move, attack, cast spell) — skippable for veterans
- **Settings panel**:
  - Difficulty level (Easy/Normal/Hard for AI scaling)
  - Visual preferences (color theme, grid style, animation speed)
  - Accessibility options (text size, contrast, colorblind mode)
  - Audio preferences (music volume, SFX volume, individual SFX toggles)
- **Session persistence**: If user closes browser mid-encounter, can resume where they left off

### 23.8 Marketing-ready polish
- **Loading screen splash art**: Eye-catching PF2e-themed loading screen with game title
- **Main menu**: Polished UI with logo, "New Game" / "Continue" / "Settings" / "Exit" options
- **Character creation flow**: Smooth UX (Pathbuilder import → review character → ready to play)
- **Victory/defeat screens**: Dramatic results screen (XP earned, treasure collected, loot breakdown)
- **Session summary**: Beautiful end-of-session recap (creatures defeated, gold earned, character progression)

### 23.9 Final code cleanup
- **Remove debugging code**: No console.log() statements in production code
- **Consistent formatting**: All code passes linter (ESLint, Prettier)
- **Type safety**: No TypeScript `any` types, all types explicit
- **Test coverage**: At least 70% code coverage on critical systems (attack logic, damage, saves)

### 23.10 Phase 23 Code Review (Final)
- **Sign-off checklist**:
  - ✅ All visual polish complete
  - ✅ All audio integrated
  - ✅ Performance meets targets
  - ✅ Accessibility meets WCAG AA
  - ✅ No console errors or warnings
  - ✅ Code passes linting
  - ✅ Tested in all supported browsers
  - ✅ Mobile responsiveness verified (if applicable)
  - ✅ Documentation complete
  - ✅ Ready for release
- **Final commit**: "Release v1.0 - Full PF2e Remaster tactical combat with AI GM"
