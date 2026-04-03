
Date: 2026-04-02
Scope audited: backend/src/game, shared/*.ts

## Audit Guardrails (Confirmed)
- Planning-only: propose changes only, no implementation in this workflow.
- Code-only: include TypeScript code modules only; exclude content-writing tasks.
- Correctness first: PF2e rules fidelity takes precedence over maintainability/performance.
- No guessing: if a rules assertion lacks source support, mark it as needs source verification.
## Quick Findings Summary
- Major hotspot: backend/src/game/rules.ts (11,984 lines).
- Action dispatch density in rules engine: 231 case entries in one switch.
- High duplication of failure response patterns: 335 occurrences of `return { success: false, message: ... }`.
- High type-safety debt: 276 `as any`/any-cast style occurrences in rules engine.
- Shared TypeScript files likely stale/placeholder: 12 files are zero bytes.

## Priority 0 (Blocker): Stabilize Rules Engine Surface

### Finding A: Monolithic rules engine file is too large and high-risk
Evidence:
- backend/src/game/rules.ts:1 (file start)
- backend/src/game/rules.ts:11984 (file end)
- backend/src/game/rules.ts:305 (large central action switch area)

Planned change:
1. Split `RulesEngine` into focused modules while preserving API behavior.
2. Keep `resolveAction` in a small orchestrator and move action handlers into domain files:
   - combat actions
   - skill actions
   - exploration actions
   - class-specific actions
   - spell/ritual actions
3. Replace giant switch with an action registry map (`Record<string, ActionResolver>`).

Why:
- Reduce regression risk and merge conflicts.
- Make per-action testing and ownership practical.

Acceptance criteria:
- `rules.ts` reduced below 2,000 lines.
- No behavior change in existing action resolution smoke tests.
- New actions can be registered without editing a giant switch.

## Priority 1: Remove Duplicated Drop-to-0-HP Logic

### Finding B: Dying initialization still appears duplicated
Evidence (examples):
- backend/src/game/rules.ts:80-87 (`initDying` helper exists)
- backend/src/game/rules.ts:2716
- backend/src/game/rules.ts:2812
- backend/src/game/rules.ts:2973
- backend/src/game/rules.ts:3157
- backend/src/game/rules.ts:3211
- backend/src/game/rules.ts:3282
- backend/src/game/rules.ts:3343
- backend/src/game/rules.ts:4117-4121
- backend/src/game/rules.ts:4152-4156
- backend/src/game/rules.ts:6108
- backend/src/game/rules.ts:6628
- backend/src/game/rules.ts:6666
- backend/src/game/rules.ts:7701

Planned change:
1. Replace all inline dying initialization blocks with a single helper path (`initDying`).
2. Add guard against duplicate `dying` condition insertion.
3. Add test matrix for "drop to 0 from strike", "drop to 0 from persistent damage", and "already dying".

Why:
- Prevent diverging edge-case behavior across action handlers.
- Ensure consistent wounded/death-save resets.

Acceptance criteria:
- One canonical dying initialization implementation.
- No duplicate `dying` condition records created.

## Priority 1: Improve Type Safety and Error Shape Consistency

### Finding C: Extensive any-casts and ad-hoc failure responses
Evidence:
- backend/src/game/rules.ts:95-145 (`(creature as any)` usage in initiative flow)
- backend/src/game/rules.ts:335+ repeated `return { success: false, message: ... }` patterns

Planned change:
1. Introduce typed action result models:
   - `ActionSuccess`
   - `ActionFailure` with optional `errorCode`
   - `ActionResult = ActionSuccess | ActionFailure`
2. Add typed transient combat state interfaces instead of raw `(actor as any)` fields.
3. Add helper constructors:
   - `fail(message, errorCode?)`
   - `ok(payload)`
4. Migrate the top 20 most-used actions first, then continue incrementally.

Why:
- Reduce runtime mistakes from typo-prone dynamic fields.
- Standardize client/server expectations for failures.

Acceptance criteria:
- New handlers avoid `as any`.
- Common return shapes use helper constructors.

## Priority 2: Proposed Deletions for Empty Shared TypeScript Files

### Finding D: 12 zero-byte TS files in shared/ with no active references
Evidence:
- shared/archetypeFeatsLegacyBD2.ts
- shared/archetypeFeatsLegacyBD3.ts
- shared/archetypeFeatsLegacyLO2.ts
- shared/archetypeFeatsLegacyLO3.ts
- shared/archetypeFeatsLegacyLO4.ts
- shared/archetypeFeatsLegacyLO5.ts
- shared/archetypeFeatsLegacyLO6.ts
- shared/archetypeFeatsLegacySM1.ts
- shared/archetypeFeatsLegacySM2.ts
- shared/archetypeFeatsNonCoreDC.ts
- shared/archetypeFeatsNonCoreGG.ts
- shared/archetypeFeatsStandaloneHM.ts
- No references found outside this audit document in current workspace scan.

Planned prior-purpose mapping (filename-based, confidence noted):
- high confidence: `LegacyBD*` likely Book of the Dead archetype feat split modules; related source files include `shared/book-of-the-dead-archetypes.md` and `shared/book-of-the-dead-archetypes-2.md`.
- high confidence: `LegacyLO*` likely Lost Omens archetype feat split modules; related source files include `shared/lost-omens-cg-archetypes-1.md` and `shared/lost-omens-remaining-archetypes.md`.
- high confidence: `LegacySM*` likely Secrets of Magic archetype feat split modules; related source file includes `shared/secrets-of-magic-archetypes.md`.
- medium confidence: `NonCoreGG` likely non-core archetype feats from Guns and Gears lineage; no direct archetype markdown file with matching stem discovered.
- low confidence: `NonCoreDC` and `StandaloneHM` purpose remains unresolved from current code-only evidence; mark for source verification before permanent removal.

Planned change:
1. Mark all 12 files for proposed deletion in this plan (status: pending approval).
2. Before delete execution, run one final reference check and confirm no dynamic import expectations.
3. For unresolved-purpose files (`NonCoreDC`, `StandaloneHM`), require source verification note before final approval.
4. Record deletion rationale in changelog as "empty, unreferenced placeholder module".

Why:
- Empty modules create confusion and can mask missing data imports.
- Removing unreferenced empty files reduces false-positive maintenance overhead.

Acceptance criteria:
- Proposed deletion list explicitly approved.
- After approval and execution, no zero-byte `.ts` files remain in `shared/`.
- Any deferred file has an explicit keep-rationale plus provenance note.

## Priority 2: Validation and Tooling Baseline

### Finding E: No obvious typecheck script discovered at workspace root/backend root
Evidence:
- no `package.json` typecheck script discovered in current checked paths

Planned change:
1. Add or document project-level validation command(s): lint, typecheck, targeted tests.
2. Add a short `docs/dev-validation.md` with canonical commands.
3. Add CI gate for at least lint + typecheck for touched packages.

Why:
- Planned refactors need guardrails to avoid regressions.

Acceptance criteria:
- Developers can run one documented validation sequence locally.
- CI verifies baseline checks.

## Phased Execution Plan

Phase 1 (1-2 days):
- Introduce action result types and helper constructors.
- Add tests around dying initialization behavior.

Phase 2 (2-4 days):
- Create action registry and carve out initial handler modules (combat + exploration).
- Reduce switch size and begin removing inline error return duplication.

Phase 3 (2-3 days):
- Continue migrating class/spell handlers.
- Eliminate remaining duplicated dying blocks.
- Remove or populate empty shared files.

Phase 4 (1 day):
- Final validation pass, docs update, CI checks.

## Risks and Mitigation
- Risk: behavior drift during handler extraction.
  Mitigation: lock behavior with before/after golden tests for key actions.
- Risk: hidden dependencies on `(actor as any)` fields.
  Mitigation: inventory transient fields before migration; add transitional interfaces.
- Risk: stale imports after shared-file cleanup.
  Mitigation: run global reference search before delete operations.
- Risk: PF2e behavior regression caused by implementation assumptions.
  Mitigation: require official-source citation or explicit "needs source verification" status for each correctness-sensitive change.

## Immediate Next Actions
1. Build `ActionResult` types and helper constructors in a shared rules utility module.
2. Refactor `resolveAction` to use an action registry for at least 10 high-frequency actions.
3. Replace duplicated dying logic in the top 5 repeated handlers and add regression tests.

## Phase 1A: Prompt 1 Output (Correctness-Only Audit, Planning Mode)

Scope:
- File reviewed: `backend/src/game/rules.ts`
- Focus: PF2e correctness risks only
- Method: code evidence plus source-verification tags; no implementation actions performed

### P1A-F1 (Critical): Dying/Wounded transition logic appears to increase Wounded when entering Dying
Evidence:
- `backend/src/game/rules.ts:81` sets `creature.wounded = (creature.wounded ?? 0) + 1` in `initDying`.
- `backend/src/game/rules.ts:86` pushes `dying` condition with value from wounded.
- Additional repeated wounded increment blocks appear at `backend/src/game/rules.ts:2337` and `backend/src/game/rules.ts:2350`.

Likely impact/risk:
- Characters may escalate to higher dying severity faster than intended across repeated knockdowns.
- High risk of systemic combat survivability distortion.

Source status:
- needs source verification against official PF2e dying/wounded transition text.

### P1A-F2 (High): Internal timing inconsistency in persistent damage handling
Evidence:
- `backend/src/game/rules.ts:141` states persistent damage is processed at start of turn.
- `backend/src/game/rules.ts:191` states PF2e flat check to end persistent damage is at end of turn.
- Same function sets flat-check outcome immediately (`backend/src/game/rules.ts:194-200`).

Likely impact/risk:
- Persistent damage resolution timing may diverge from intended encounter sequencing.
- Can alter expected number of damage ticks and recovery probability over multiple rounds.

Source status:
- needs source verification against official PF2e persistent damage timing text.

### P1A-F3 (High): Quickened action policy is internally contradictory
Evidence:
- Restriction message says extra quickened action can only be Strike or Stride (`backend/src/game/rules.ts:308`).
- Allowed list includes extra entries `move` and `vicious-swing` (`backend/src/game/rules.ts:304`).

Likely impact/risk:
- Engine behavior may allow actions beyond stated quickened policy.
- User-facing message and rules enforcement can disagree, causing adjudication confusion.

Source status:
- code contradiction confirmed internally.
- external rule intent still needs source verification.

### P1A-F4 (Medium-High): Stealth initiative assigns permanent hidden condition on encounter start
Evidence:
- Avoid Notice path detected in initiative (`backend/src/game/rules.ts:99-104`).
- Code applies `hidden` with `duration: 'permanent'` and source `stealth-initiative` (`backend/src/game/rules.ts:114-120`).

Likely impact/risk:
- Visibility state may persist too long without re-evaluation by Perception DC checks and subsequent detection updates.
- Can over-grant concealment advantage in opening rounds.

Source status:
- needs source verification against official PF2e Avoid Notice/encounter start visibility handling.

### P1A-F5 (Medium): Undefined hero points default to 1 in spend validation/deduction paths
Evidence:
- Validation default uses `actor.heroPoints ?? 1` at `backend/src/game/rules.ts:283`.
- Spend deduction default uses `(creature.heroPoints ?? 1) - heroPointsSpent` at `backend/src/game/rules.ts:6424`.

Likely impact/risk:
- Actors with undefined hero point state may be treated as having 1 point, potentially permitting unintended rerolls/stabilization.
- Session continuity can drift from authoritative state if initialization is missing.

Source status:
- needs source verification for expected engine baseline and session-start assumptions.

### P1A-F6 (Medium): Repeated direct insertion of dying condition without single canonical gate
Evidence:
- Multiple direct pushes to `dying` condition are present (`backend/src/game/rules.ts:86`, `backend/src/game/rules.ts:4121`, `backend/src/game/rules.ts:4156`).
- Counter resets appear in several code paths (`backend/src/game/rules.ts:4119-4120`, `backend/src/game/rules.ts:4154-4155`, `backend/src/game/rules.ts:6466-6467`).

Likely impact/risk:
- Path-dependent differences in dying condition stack state can occur during edge cases.
- Increases probability of contradictory state under chained damage/effects.

Source status:
- code consistency risk confirmed internally.
- PF2e semantics per transition still needs source verification.

### Phase 1A Planning Notes
- Prioritize verification of P1A-F1 and P1A-F2 first due to direct survivability and turn-sequencing impact.
- Track each correctness-sensitive item with one of: `verified-official-source`, `needs-source-verification`, `deferred`.
- Do not approve implementation work for any P1A finding until source status is upgraded from `needs-source-verification`.

## Phase 1B: Prompt 2 Output (Planning-Only Module Split Proposal)

Scope:
- File analyzed: `backend/src/game/rules.ts`
- Goal: split architecture proposal with migration order that preserves behavior
- Constraint: planning only, no code changes executed

### Current Architecture Snapshot (Evidence)
- Entrypoint dispatcher: `resolveAction` at `backend/src/game/rules.ts:240`.
- Central action switch starts at `backend/src/game/rules.ts:313` and covers broad domains (combat, skills, classes, spells, exploration, downtime).
- Spell sub-dispatch starts in `resolveSpell` with additional spell cases around `backend/src/game/rules.ts:2696` onward.
- Shared cross-cutting helpers used throughout:
  - `calculateDistance` at `backend/src/game/rules.ts:1405`
  - `cleanupStaleFlankingConditions` at `backend/src/game/rules.ts:1909`
  - `applyFlankingOffGuard` at `backend/src/game/rules.ts:2033`
  - `rollAttack` at `backend/src/game/rules.ts:2080`
  - `rollSave` at `backend/src/game/rules.ts:6005`
  - `getSkillBonus` at `backend/src/game/rules.ts:4677`

### Proposed Target Module Boundaries
1. Action Orchestrator Module
- Responsibility: validation gate, turn-state gate, registry lookup, unified unknown-action handling.
- Keeps `resolveAction` surface stable while delegating to registry handlers.

2. Combat Core Module
- Responsibility: strike pipeline, attack roll, damage roll, flanking/off-guard, movement-combat coupling.
- Candidate methods centered around strike/movement/roll pipelines near `backend/src/game/rules.ts:692-2245`.

3. Conditions and Lifecycle Module
- Responsibility: dying/wounded transitions, persistent damage lifecycle, start/end-of-turn condition processing.
- Candidate logic includes current dying and persistent-damage blocks near `backend/src/game/rules.ts:74-233` and repeated dying updates.

4. Skills and General Actions Module
- Responsibility: aid, demoralize, grapple/trip/shove/disarm, seek/hide/sneak, downtime skill actions.

5. Class Actions Modules (one per class family)
- Responsibility: class-specific actions grouped by class to reduce cross-class coupling.

6. Spellcasting Modules
- Spell dispatcher module: spell id routing only.
- Spell effects modules: split by rank/theme or source family to keep each file reviewable.

7. Hazards and Environment Module
- Responsibility: hazard trigger/detect/disable/damage and map-zone environmental interactions.

8. Shared Rules Kernel Module
- Responsibility: stable pure helpers and typed result constructors used across all modules.

### Migration Order (Behavior-Preserving)
Phase B1: Introduce registry shell without moving behavior
- Keep existing class and methods intact.
- Add a registry that points to existing methods first.
- Risk control: identical input-output snapshots for a fixed scenario suite.

Phase B2: Extract low-coupling domains first
- Move exploration and downtime actions first (lower combat correctness blast radius).
- Preserve old method signatures via thin adapters.

Phase B3: Extract skills and non-spell combat utilities
- Migrate skill checks and utility action handlers while keeping attack pipeline centralized.

Phase B4: Extract spell dispatcher and spell effect groups
- First split routing from effects, then split effects by coherent families.
- Gate each moved spell effect with source-verification tag status from Phase 1A.

Phase B5: Extract combat core and lifecycle logic last
- Move strike/damage/flanking and dying/persistent damage only after golden tests are stable.
- This phase has highest correctness risk and should be last.

### Risk Matrix (Planning)
| Area | Risk Level | Primary Risk | Likely Impact | Mitigation |
|---|---|---|---|---|
| Action dispatcher split | Medium | Registry wiring mistakes | Wrong handler invoked | Keep old switch fallback during transition and diff outputs |
| Spell module extraction | High | Lost edge-case behavior in spell effects | PF2e effect mismatch in combat | Per-spell snapshot tests and source-verification gate |
| Combat core extraction | Critical | Drift in attack/damage/condition order | Systemic encounter correctness regressions | Golden combat transcripts before/after for representative encounters |
| Dying/persistent lifecycle extraction | Critical | Timing/state transition divergence | Survivability and turn-order distortions | Dedicated lifecycle test matrix and explicit turn-step assertions |
| Skill action extraction | Medium | DC/degree-of-success drift | Action resolution inconsistency | Shared degree-of-success helper and fixture comparisons |

### Compatibility Constraints to Preserve
1. Keep existing externally visible action ids unchanged during migration.
2. Preserve action result shape contract while introducing typed internal wrappers.
3. Preserve execution ordering for side effects in combat and lifecycle flows.
4. Preserve turn accounting semantics and action economy enforcement.
5. Preserve PF2e-correctness gate: no correctness-sensitive behavior change without official-source verification status.

### Acceptance Criteria for Phase 1B Plan Approval
1. Proposed module boundaries are mapped to concrete method clusters with no orphaned handlers.
2. Migration order clearly places highest correctness-risk domains last.
3. Each migration phase has a defined behavior-preservation control.
4. Correctness-sensitive areas from Phase 1A are explicitly linked to source-verification gating.

## Phase 1C: Prompt 3 Output (Duplicated Dying-State Paths and Canonical Flow Plan)

Scope:
- File analyzed: `backend/src/game/rules.ts`
- Goal: identify duplicated dying-state paths and propose one canonical flow
- Constraint: planning only; no implementation changes

### Inventory of Dying-State Entry Paths (Evidence)
Canonical helper exists:
- `backend/src/game/rules.ts:79` `initDying(creature)`.

Helper usage appears in many damage paths:
- Examples: `backend/src/game/rules.ts:188`, `backend/src/game/rules.ts:1181`, `backend/src/game/rules.ts:2875`, `backend/src/game/rules.ts:2971`, `backend/src/game/rules.ts:3132`, `backend/src/game/rules.ts:3316`, `backend/src/game/rules.ts:3370`, `backend/src/game/rules.ts:3441`, `backend/src/game/rules.ts:3502`, `backend/src/game/rules.ts:3794`, `backend/src/game/rules.ts:6267`, `backend/src/game/rules.ts:6787`, `backend/src/game/rules.ts:6825`, `backend/src/game/rules.ts:7860`, `backend/src/game/rules.ts:12411`, `backend/src/game/rules.ts:13215`, `backend/src/game/rules.ts:13305`, `backend/src/game/rules.ts:13388`.

Inline non-helper entry paths still exist:
- `backend/src/game/rules.ts:4275-4279` sets dying and pushes condition directly.
- `backend/src/game/rules.ts:4310-4314` sets dying and pushes condition directly.

### Inventory of Dying-State Exit/Cleanup Paths (Evidence)
Death-save exit paths:
- `backend/src/game/rules.ts:2492-2496` clears dying, removes condition, increments wounded.
- `backend/src/game/rules.ts:2505-2510` clears dying, removes condition, increments wounded, sets unconscious.
- `backend/src/game/rules.ts:2519-2522` and `backend/src/game/rules.ts:2533-2536` clear dying and remove condition in additional branches.

Other clear paths outside death saves:
- `backend/src/game/rules.ts:6128-6131` clears dying and removes condition (long-term rest flow).
- `backend/src/game/rules.ts:6622-6628` clears dying and removes condition in another branch.
- `backend/src/game/rules.ts:15109` sets `target.dying = false` (requires source-verification of surrounding semantics).

### Correctness and Consistency Risks (Planning)
1. Entry-path inconsistency risk
- Mixing helper and inline entry logic can diverge over time.
- Evidence: helper at `backend/src/game/rules.ts:79` vs inline blocks at `backend/src/game/rules.ts:4275-4279` and `backend/src/game/rules.ts:4310-4314`.

2. Exit-path asymmetry risk
- Dying cleanup happens in multiple branches with potentially different side effects.
- Evidence: `backend/src/game/rules.ts:2492-2536`, `backend/src/game/rules.ts:6128-6131`, `backend/src/game/rules.ts:6622-6628`, `backend/src/game/rules.ts:15109`.

3. Wounded transition risk
- Wounded increments occur at both entry and recovery/stabilization paths in current logic.
- Evidence: `backend/src/game/rules.ts:81`, `backend/src/game/rules.ts:2495`, `backend/src/game/rules.ts:2508`, and inline `actor.wounded++` at `backend/src/game/rules.ts:4276`, `backend/src/game/rules.ts:4311`.
- Source status: `needs-source-verification` against official PF2e dying/wounded sequence text.

### Proposed Canonical Dying-State Flow (Planning Only)
1. Single entry gate
- All transitions from alive to dying must call one entry function.
- No action handler should directly set dying flags or push dying condition.

2. Single exit gate
- All transitions from dying to stable/recovered/dead must call one exit function with explicit reason code.

3. Centralized side-effect ordering
- Enforce one defined sequence for: flags, condition list mutation, wounded updates, death save counters, unconscious application.

4. Idempotency requirements
- Repeated calls in same state must not duplicate `dying` condition records.
- Entry/exit should be safe if invoked after partial state mutation.

5. Source-verification gate
- Any step that changes wounded/dying numeric progression stays `needs-source-verification` until mapped to official PF2e text.

### Regression Test Plan (Planning Only)
Test suite A: Entry transitions
1. A1: non-dying creature dropped to 0 HP by strike enters dying exactly once.
2. A2: non-dying creature dropped to 0 HP by persistent damage enters dying exactly once.
3. A3: already-dying creature taking additional damage does not duplicate `dying` condition entry.

Test suite B: Death save progression
1. B1: critical success branch clears dying correctly and applies expected follow-up state.
2. B2: success branch stabilizes correctly and sets expected unconscious state where applicable.
3. B3: failure and critical failure branches update counters and terminal state correctly.

Test suite C: Recovery/cleanup cross-path consistency
1. C1: long-term rest dying cleanup matches canonical exit state contract.
2. C2: any non-death-save dying clear path yields same postconditions as canonical exit gate.
3. C3: no orphan `dying` condition remains when dying flag is false.

Test suite D: Wounded correctness safeguards
1. D1: wounded progression around enter-dying and stabilize/recover matches verified rule profile.
2. D2: repeated knockdown cycle preserves verified wounded/dying progression.
3. D3: treat-wounds and other wounded-clearing effects interact with dying flow without contradiction.

Test suite E: Invariants
1. E1: invariant `dying == true` implies exactly one `dying` condition record.
2. E2: invariant `dying == false` implies no `dying` condition record.
3. E3: death save counters reset only on verified transition points.

### Phase 1C Approval Criteria
1. All dying entry points are enumerated and mapped to canonical entry gate plan.
2. All dying exit points are enumerated and mapped to canonical exit gate plan.
3. Regression suites A-E are accepted as required pre-merge gates for future implementation work.
4. Wounded/dying progression tests remain blocked on official-source verification where marked.

## Phase 1D: Prompt 4 Output (Typed Action Result Migration Plan, Staged)

Scope:
- File analyzed: `backend/src/game/rules.ts`
- Goal: planning-only migration from ad-hoc return shapes to typed action results
- Constraint: no implementation changes, risk controls first

### Baseline Metrics (Evidence)
- `failureReturns=473`
- `successReturns=101`
- `errorCodeFields=22`
- `anyUsages=620`

Representative return-shape evidence:
- Generic failures: `backend/src/game/rules.ts:274`, `backend/src/game/rules.ts:279`, `backend/src/game/rules.ts:285`.
- Success returns with message only: `backend/src/game/rules.ts:487`, `backend/src/game/rules.ts:500`, `backend/src/game/rules.ts:1259`.
- Failure returns with structured code in subset paths: `backend/src/game/rules.ts:632`, `backend/src/game/rules.ts:640`, `backend/src/game/rules.ts:647`, `backend/src/game/rules.ts:1788`.

Representative typing-debt evidence:
- Dynamic action state fields: `backend/src/game/rules.ts:103-104`, `backend/src/game/rules.ts:303`, `backend/src/game/rules.ts:4484`.
- Method signatures returning `any`: e.g., `backend/src/game/rules.ts:1236`, `backend/src/game/rules.ts:1709`, `backend/src/game/rules.ts:2437`, `backend/src/game/rules.ts:2684`, `backend/src/game/rules.ts:6057`.
- Widespread cast-based access in features/spells/hazards: e.g., `backend/src/game/rules.ts:4790`, `backend/src/game/rules.ts:6304-6395`, `backend/src/game/rules.ts:6754`, `backend/src/game/rules.ts:6894`.

### Findings (Planning)
1. Return-shape fragmentation risk (High)
- Not all failures carry `errorCode`, making caller behavior inconsistent.
- Message-only failures dominate and reduce machine-actionable handling.

2. Contract ambiguity risk (High)
- `any` return signatures obscure guaranteed fields and optional fields.
- Increases chance of runtime mismatches when clients depend on action results.

3. Incremental migration risk (Medium-High)
- Large volume means all-at-once typing is likely destabilizing.
- Requires phased approach with compatibility wrappers.

### Proposed Target Result Contract (Planning Only)
1. Core union type
- `ActionResult = ActionSuccess | ActionFailure`

2. Failure contract
- Required: `success: false`, `message: string`
- Optional but standardized: `errorCode: ActionErrorCode`
- Optional metadata bag for diagnostics without breaking clients

3. Success contract
- Required: `success: true`, `message: string`
- Optional typed payload fields by action category (combat, movement, spells, hazards)

4. Compatibility rule
- Existing fields remain available during transition via adapters; no abrupt field removals.

### Staged Migration Plan with Risk Controls
Stage D1: Define contracts and constructors (no behavior change)
- Add planning target for `ok(...)` and `fail(...)` constructors.
- Add `ActionErrorCode` enum proposal with existing literal codes mapped first.
- Risk control: compile-time-only diff in planned phase; runtime behavior unchanged.

Stage D2: Normalize dispatcher-level returns first
- Apply target contract only at top-level dispatch exits while preserving internal handler output through adapters.
- Risk control: golden action transcript comparisons for top 30 actions.

Stage D3: Migrate low-coupling handlers
- Weapon inventory and simple utility actions first.
- Risk control: per-handler snapshot tests, no PF2e semantic change.

Stage D4: Migrate skills and exploration handlers
- Standardize error codes for common preconditions (target missing, out of range, invalid state).
- Risk control: behavior parity tests and unchanged user-facing text where possible.

Stage D5: Migrate spells, combat core, and lifecycle paths last
- Highest correctness risk due to deeper state mutations and PF2e-sensitive sequencing.
- Risk control: blocked until Phase 1A/1C source-verification gates are satisfied for sensitive branches.

### Error Code Standardization Plan (Planning)
1. Preserve existing literals initially:
- `OUT_OF_RANGE`, `OUT_OF_BOUNDS`, `DESTINATION_OCCUPIED`, `IMMOBILIZED`, `BLOCKED_PATH`, `INSUFFICIENT_MOVEMENT`, `STEP_TOO_FAR`.

2. Add planned canonical buckets:
- `INVALID_ACTION_STATE`
- `TARGET_REQUIRED`
- `TARGET_NOT_FOUND`
- `RULE_PREREQUISITE_FAILED`
- `SOURCE_VERIFICATION_REQUIRED` (planning workflow gate only, not runtime gameplay path)

3. Do not convert PF2e semantics into generic buckets where precision is needed.

### Regression/Test Plan (Planning Only)
1. Contract conformance tests
- Assert every action result conforms to union contract after each stage.

2. Backward compatibility tests
- Assert legacy expected fields remain present during staged rollout.

3. Error-code consistency tests
- Assert known precondition failures map to stable code set.

4. No-semantics-drift tests
- Re-run golden transcripts for representative combat, spell, movement, and hazard scenarios.

5. Correctness gating tests
- Any PF2e-sensitive handler touched in D5 requires source-verification status before migration approval.

### Phase 1D Approval Criteria
1. Staged migration order is accepted with high-risk domains last.
2. Contract proposal preserves compatibility during transition.
3. Error-code plan maps existing literals first and avoids semantic loss.
4. D5 migration remains blocked until correctness source-verification gates are met.

## Phase 1E: Prompt 5 Output (Deletion Candidate Validation for Empty Shared Modules)

Scope:
- Directory analyzed: `shared/`
- Goal: planning-only final validation workflow for empty/unreferenced TypeScript module deletion candidates
- Constraint: no file deletions performed

### Validation Evidence Collected
1. Candidate file state
- All 12 `archetypeFeats*.ts` candidates are currently zero bytes.

2. Direct reference scan (non-doc files)
- Filename-stem scan returned `NO_HITS` for every candidate across non-doc files.

3. Broader indirect scan
- Regex scan for `archetypeFeats(Legacy|NonCore|Standalone)` returned `NO_HITS`.
- Regex scan for `from ... archetypeFeats` returned `NO_HITS`.
- No dynamic-import style `import(...)` / `require(...)` hits were found in scanned code/config files.

### Final Proposed Deletion Candidate List (Planning Status)
`proposed-delete-ready`:
1. `shared/archetypeFeatsLegacyBD2.ts`
2. `shared/archetypeFeatsLegacyBD3.ts`
3. `shared/archetypeFeatsLegacyLO2.ts`
4. `shared/archetypeFeatsLegacyLO3.ts`
5. `shared/archetypeFeatsLegacyLO4.ts`
6. `shared/archetypeFeatsLegacyLO5.ts`
7. `shared/archetypeFeatsLegacyLO6.ts`
8. `shared/archetypeFeatsLegacySM1.ts`
9. `shared/archetypeFeatsLegacySM2.ts`
10. `shared/archetypeFeatsNonCoreGG.ts`

`proposed-delete-pending-source-verification`:
11. `shared/archetypeFeatsNonCoreDC.ts`
12. `shared/archetypeFeatsStandaloneHM.ts`

Rationale for pending status:
- Filename-purpose mapping remains lower-confidence for `NonCoreDC` and `StandaloneHM` compared with BD/LO/SM/GG groups.
- Keep planning gate until one provenance confirmation pass is completed.

### Proposed Deletion Workflow (Planning Only)
Step E1: Pre-delete freeze point
- Record current candidate list and hashes/sizes for change audit.

Step E2: Final reference sweep
- Re-run non-doc reference scan immediately before deletion approval.
- Include generated/build output if present in this repository at that time.

Step E3: Source/provenance confirmation
- Confirm unresolved abbreviations (`DC`, `HM`) from available project notes or source trackers.
- If unresolved, keep pending status and do not delete in same batch as ready files.

Step E4: Batch proposal structure
- Batch A: delete all `proposed-delete-ready` candidates.
- Batch B: handle pending files only after provenance decision.

Step E5: Post-delete validation gates
- Verify no import-resolution/runtime startup errors in affected package(s).
- Verify no generated index or registry references expect these paths.

### Risk Controls
1. Separate ready vs pending candidates to avoid accidental historical-data loss.
2. Use two-step approval (`scan verified` then `delete approved`) to reduce race-condition risk from concurrent edits.
3. Keep deletion rollback simple by deleting in small grouped commits rather than one large sweep.

### Phase 1E Approval Criteria
1. All 12 files have explicit status (`ready` or `pending`) and rationale.
2. Pre-delete and post-delete validation steps are accepted before any execution.
3. Pending files remain blocked until provenance/source verification is completed.

## Phase 1F: Prompt 6 Output (PF2e Combat Correctness Verification Checklist)

Scope:
- File analyzed: `backend/src/game/rules.ts`
- Goal: combat-action correctness checklist with mandatory official-source verification tags
- Constraint: planning only; no gameplay behavior changes

### Combat Action Surface (Evidence)
- Dispatcher entries include: `strike`, `vicious-swing`, `raise-shield`, `reactive-strike`, `shield-block`, `demoralize`, `feint`, `grapple`, `trip`, `shove`, `disarm`, `quick-draw`, `flurry-of-blows`, `power-attack`, `double-slice`, `knockdown` at `backend/src/game/rules.ts:314-521`.

### Official-Source-Required Checklist
Status legend:
- `required-source`: must cite official PF2e source before approval
- `verified`: source citation present and reviewed
- `blocked`: implementation blocked pending source verification

1. Action Economy and Turn Structure
- Verify quickened extra-action limits and allowed action set consistency.
- Evidence: `backend/src/game/rules.ts:296-308`, `backend/src/game/rules.ts:3631-3638`.
- Tag: `required-source`, default `blocked`.

2. Multiple Attack Penalty (MAP)
- Verify MAP progression and agile handling across sequential attacks.
- Evidence: `backend/src/game/rules.ts:948-949`, `backend/src/game/rules.ts:2235-2238`.
- Tag: `required-source`, default `blocked`.

3. Range, Reach, and Increment Penalties
- Verify max range increments, range increment penalties, and reach distance handling.
- Evidence: `backend/src/game/rules.ts:49-69`, `backend/src/game/rules.ts:1523-1562`, `backend/src/game/rules.ts:2145`.
- Tag: `required-source`, default `blocked`.

4. Visibility and Flat Checks in Attacks
- Verify concealed/hidden/invisible/blinded/dazzled flat-check DCs and failure outcomes.
- Evidence: `backend/src/game/rules.ts:952-1034`.
- Tag: `required-source`, default `blocked`.

5. Flanking and Off-Guard Application
- Verify conditions for flanking eligibility and off-guard scope/lifetime.
- Evidence: `backend/src/game/rules.ts:940-941`, `backend/src/game/rules.ts:1909-2077`.
- Tag: `required-source`, default `blocked`.

6. Feint and Off-Guard Consumption
- Verify "next melee attack" consumption semantics and target scoping.
- Evidence: `backend/src/game/rules.ts:945`, `backend/src/game/rules.ts:1938-1947`.
- Tag: `required-source`, default `blocked`.

7. Reactions in Combat
- Verify reaction economy for Reactive Strike, Shield Block, delay interactions, and teleport/no-reaction exceptions.
- Evidence: `backend/src/game/rules.ts:4189-4254`, `backend/src/game/rules.ts:4460-4499`, `backend/src/game/rules.ts:3942`, `backend/src/game/rules.ts:4132`, `backend/src/game/rules.ts:658`.
- Tag: `required-source`, default `blocked`.

8. Shield Raise/Block Mechanics
- Verify when shield AC/hardness applies and damage reduction sequence.
- Evidence: `backend/src/game/rules.ts:4155-4183`, `backend/src/game/rules.ts:4226-4254`, `backend/src/game/rules.ts:1121`, `backend/src/game/rules.ts:3193-3195`.
- Tag: `required-source`, default `blocked`.

9. Damage Resolution Ordering
- Verify ordering between hit resolution, weakness/resistance/immunity, shield interaction, and dying transition.
- Evidence: `backend/src/game/rules.ts:1108-1183`, `backend/src/game/rules.ts:2958-3015`, `backend/src/game/rules.ts:3122-3173`.
- Tag: `required-source`, default `blocked`.

10. Persistent Damage in Encounter Loop
- Verify persistent damage timing and end-check sequencing in turn lifecycle.
- Evidence: `backend/src/game/rules.ts:141-231`.
- Tag: `required-source`, default `blocked`.

11. Dying, Wounded, and Recovery Checks
- Verify transitions when dropping to 0 HP and death-save progression with doomed interaction.
- Evidence: `backend/src/game/rules.ts:75-87`, `backend/src/game/rules.ts:2430-2555`, `backend/src/game/rules.ts:4274-4317`.
- Tag: `required-source`, default `blocked`.

12. Hero Point Combat Interactions
- Verify hero-point reroll and stabilize pathways used in combat contexts.
- Evidence: `backend/src/game/rules.ts:285-288`, `backend/src/game/rules.ts:369-370`, `backend/src/game/rules.ts:2437`.
- Tag: `required-source`, default `blocked`.

### Verification Artifact Template (Per Checklist Item)
Use this template when validating each item:
1. `item-id`:
2. `official-source-citation`: book + section + page/rule anchor
3. `current-implementation-evidence`: file + line
4. `match-status`: `verified` | `partial` | `mismatch`
5. `notes`: exact divergence description (no assumptions)
6. `approval-gate`: `pass` | `blocked`

### Phase 1F Approval Criteria
1. Each checklist item has at least one official-source citation before implementation approval.
2. Any `partial` or `mismatch` result stays blocked until resolved in planning and re-verified.
3. No PF2e-sensitive combat behavior changes proceed without a filled verification artifact.

## Phase 1G: Prompt 7 Output (Planning-Only CI Validation Roadmap)

Scope:
- Repository snapshot analyzed for CI/tooling anchors
- Goal: define rollout plan for lint, typecheck, and targeted tests with explicit failure policy
- Constraint: planning only; no pipeline files created yet

### Current Baseline (Evidence)
1. No detected CI workflow files under `.github/workflows/` in this workspace snapshot.
2. No detected `package.json`, `tsconfig*.json`, ESLint, Jest, or Vitest config files in this snapshot.
3. Code hotspot currently present as a single backend TypeScript file: `backend/src/game/rules.ts`.

### CI Roadmap Principles
1. Correctness-first gates before stylistic gates.
2. Introduce checks in low-friction warning mode first, then hard-fail mode.
3. Keep PF2e source-verification artifacts as release blockers for correctness-sensitive changes.

### Phased Rollout Plan
Phase G0: Bootstrap Validation Surface (Foundational)
1. Define canonical local commands (planned):
- `validate:syntax` (TypeScript parse/compile guard)
- `validate:types` (strict or staged strictness profile)
- `validate:rules-audit` (checks verification artifact completeness for PF2e-sensitive changes)
2. Add one planning doc describing expected command outputs and pass/fail semantics.
3. Outcome target: repeatable local validation path exists before CI hardening.

Phase G1: Advisory CI (Non-Blocking)
1. Run syntax/type checks and report warnings in CI without failing merges.
2. Run targeted regression suite for dying/persistent/attack-sequence fixtures as informational.
3. Outcome target: collect baseline failure patterns and flaky areas.

Phase G2: Correctness Hard Gate (Blocking)
1. Promote PF2e correctness-sensitive checks to required status:
- source-verification artifact present for touched checklist items
- core regression suite for combat lifecycle passes
2. Keep style/lint checks advisory if still noisy.
3. Outcome target: no correctness-sensitive PR merges without passing core rules gates.

Phase G3: Type/Contract Hard Gate (Blocking)
1. Require typed action-result contract conformance checks for touched action handlers.
2. Require error-code consistency checks for known precondition paths.
3. Outcome target: return-shape drift is blocked before merge.

Phase G4: Full Validation Gate
1. Promote lint/style and broader regression suites to required if signal quality is acceptable.
2. Keep correctness and source-verification gates as highest-priority required checks.
3. Outcome target: stable, comprehensive gate with low false positives.

### Failure Policy (Required)
Policy F1: Correctness blockers
1. Fail CI immediately if PF2e-sensitive behavior changed without a linked verification artifact.
2. Fail CI if any checklist item touched in code is `blocked` or missing official-source citation.

Policy F2: Regression blockers
1. Fail CI on any regression in core combat lifecycle tests (attack resolution, visibility checks, dying/persistent flow).
2. Fail CI on snapshot/transcript drift unless explicitly approved in planning notes.

Policy F3: Contract blockers
1. Fail CI when action result schema contract is violated in modified handlers.
2. Fail CI when known error-code mappings regress for precondition failures.

Policy F4: Temporary exceptions
1. Allow time-boxed waivers only with documented risk, owner, and expiry date.
2. Waivers cannot bypass correctness/source-verification blockers.

### Targeted Test Buckets for CI Prioritization
1. Combat resolution bucket
- strike/vicious swing, MAP, range/reach, flanking/off-guard, concealment flat checks.
2. Survivability lifecycle bucket
- dying/wounded transitions, death saves, stabilize flows, persistent damage timing.
3. Action economy bucket
- quickened constraints, reactions, shield raise/block ordering.
4. Spell-combat interaction bucket
- representative spells that alter combat state (visibility, movement, action economy).

### Minimal Initial Pipeline Shape (Planning Template)
1. Job `rules-correctness-core` (required by G2)
- runs core regression + verification artifact presence check
2. Job `types-contract` (required by G3)
- runs type/contract assertions
3. Job `lint-style` (advisory until G4)
- runs lint/style checks when introduced

### Readiness Checklist Before Enabling Blocking CI
1. Local command parity documented and reproducible.
2. Core test fixtures for Phase 1A/1C risks are in place.
3. False-positive rate measured during advisory period and reduced to acceptable level.
4. Owners assigned for each required gate.

### Phase 1G Approval Criteria
1. Rollout phases G0-G4 are accepted with explicit gate promotions.
2. Failure policy F1-F4 is accepted, with correctness/source verification non-bypassable.
3. Core test buckets are prioritized in the same order as project risk profile.

## Prompt Backlog for Small Task Decomposition
1. "Audit `backend/src/game/rules.ts` for PF2e correctness risks only; output a planning-only list with source-verification tags and no implementation suggestions."
2. "Create a planning-only module split proposal for `RulesEngine`, including risk matrix and migration order that preserves current behavior."
3. "Identify all duplicated dying-state logic paths and propose a single canonical flow, with explicit regression test plan only."
4. "Audit action failure return shapes in `rules.ts` and propose a typed result model migration plan with staged risk controls."
5. "Scan `shared/` for empty or unreferenced TypeScript modules and generate a deletion proposal with confidence levels and validation steps."
6. "Generate a PF2e correctness verification checklist for combat actions, using official-source-required annotations for each rule-sensitive item."
7. "Produce a planning-only CI validation roadmap for this repo (lint, typecheck, targeted tests), including rollout phases and failure policy."
