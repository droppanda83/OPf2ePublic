# Agent Task Prompts — Token Burn Sprint (March 31, 2026)

> 9 independent agent tasks. Each prompt is self-contained. Agents should NOT modify files owned by another agent. The AI GM system (coordinator, roles, memory, generators, llm services) is being developed by a separate agent — do NOT touch `backend/src/ai/`.

---

## TASK 1: Class & Archetype Implementation Audit + Completion

### Context
This is a PF2e Remaster digital tabletop project (React + Express + TypeScript). 27 classes exist with feat data files in `shared/`, but only a subset have runtime combat mechanics wired in the game engine.

**Current engine state (from audit):**
- **Full runtime actions (9 classes):** Fighter, Rogue, Barbarian, Monk, Ranger, Champion, Magus, Kineticist, Druid
- **Partial runtime (3 classes):** Psychic (Unleash Psyche only), Bard (Courageous Anthem only), Summoner (companion spawn only)
- **Data-only (15 classes):** Cleric, Wizard, Sorcerer, Oracle, Witch, Swashbuckler, Gunslinger, Inventor, Investigator, Thaumaturge, Alchemist, Guardian, Commander, Exemplar, Animist

### Files You Own
- `backend/src/game/classActions.ts` — Add new class action resolvers here
- `backend/src/game/featActions.ts` — Wire individual feat runtime effects
- `backend/src/game/barbarianFeatActions.ts` — Existing pattern for dedicated feat files
- `shared/*Feats.ts` — Update `implemented` status fields as you wire feats
- You may create new files like `backend/src/game/clericFeatActions.ts` etc. following the barbarian pattern

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- `frontend/` components (managed by other tasks)
- `backend/src/routes/` (API layer)
- `shared/types.ts` (only add new types if absolutely needed, don't modify existing)

### Task Steps

**Phase 1: Audit (report findings before implementing)**

1. Read `backend/src/game/classActions.ts` fully — document every class action that exists
2. Read `backend/src/game/combatActions.ts` — document class-specific combat logic
3. Read `backend/src/game/featActions.ts` — document which feats have runtime handlers
4. Read `backend/src/game/engine.ts` — understand how `executeAction` dispatches to action handlers
5. For each of the 27 classes, read the first 50 lines of `shared/{class}Feats.ts` to check implementation status counts
6. Check `shared/feats.ts` to see which feat files are imported into the FEAT_CATALOG
7. Produce a status table: Class | Engine Actions | Feat Handlers | Data Status | Gaps

**Phase 2: Implement missing class mechanics (priority order)**

For each class missing engine actions, implement following this pattern from existing classes:

```typescript
// In classActions.ts — add a resolveXxx function:
export function resolveClassName(actor: Creature, target: Creature | null, gameState: any, actionType: string): ActionResult {
    // Switch on actionType for class-specific actions
    // Return { success, message, damage?, conditions?, etc. }
}
```

**Priority order for implementation:**
1. **Cleric** — resolveHeal (divine font), resolveHarm, channel energy. These are critical for party survival.
2. **Wizard** — No unique combat actions needed beyond spellcasting (handled by spellActions.ts), but add: Drain Bonded Item, school spell features
3. **Sorcerer** — Bloodline focus spells, dangerous sorcery
4. **Oracle** — Cursebound mechanic (track curse stage 1→2→3, apply penalties/bonuses per mystery)
5. **Witch** — Hex cantrip resolution (Evil Eye, Needle of Vengeance, etc.), cackle sustain
6. **Swashbuckler** — Panache tracking (gain on skill success), finisher resolution (bonus damage when panache active)
7. **Investigator** — Devise a Stratagem (pre-roll attack, choose to use), Strategic Strike damage
8. **Gunslinger** — Reload tracking (loaded/unloaded weapon state), Way features
9. **Inventor** — Overdrive (flat bonus to damage on success), Innovation features, Unstable actions
10. **Thaumaturge** — Exploit Vulnerability (choose weakness to apply), Implement features
11. **Alchemist** — Quick Alchemy, perpetual infusions, research field features
12. **Summoner** — Act Together (shared action economy with eidolon), eidolon attacks
13. **Guardian** — Intercept Strike reaction, taunt, bodyguard actions
14. **Commander** — Tactical commands (grant allies actions/bonuses), battle plans
15. **Exemplar** — Ikons (body/worn/weapon), ikon activation/shift, transcend
16. **Animist** — Apparition channeling, lore spirit

For each class, at minimum implement:
- The class-defining mechanic (Rage, Panache, Exploit Vulnerability, etc.)
- State tracking on the Creature object (e.g., `isPanache`, `curseStage`, `overdriveActive`)
- Integration with the action dispatch in engine.ts

**Phase 3: Update feat status fields**
After wiring each class action, update the corresponding `shared/{class}Feats.ts` entries to change `implemented: 'not_implemented'` → `'full'` for any feats whose mechanics are now covered by your engine logic.

### Success Criteria
- All 27 classes have at least their core mechanic wired in classActions.ts
- Engine.ts dispatcher routes to all new class actions
- No TypeScript compile errors (`npx tsc --noEmit` in backend/)
- A summary table of what was implemented and what edge cases remain

---

## TASK 2: `any` Type Elimination

### Context
The codebase has ~1,551 `any` type occurrences (backend: 502, shared: 854, frontend: 195). The project goal (Phase 27) is zero `any` types. The largest source was `bestiary.ts` (828 `as any` casts already fixed in Audit Phase D). Remaining `any` types are scattered across game logic, components, and utility functions.

### Files You Own
- ALL `.ts` and `.tsx` files EXCEPT:
  - `backend/src/ai/` (AI GM agent)
  - Files being actively modified by other task agents (classActions.ts, featActions.ts, spellActions.ts, hazards, CSS files, CharacterSheetModal, DiceRoller3D)
  
Focus on these high-impact files first:
- `backend/src/game/engine.ts`
- `backend/src/game/combatActions.ts`
- `backend/src/game/rules.ts`
- `backend/src/game/skillActions.ts`
- `backend/src/routes/gameRoutes.ts`
- `backend/src/routes/gmRoutes.ts`
- `frontend/src/components/CombatInterface.tsx`
- `frontend/src/components/ActionPanel.tsx`
- `frontend/src/App.tsx`
- `shared/actions.ts`

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- `shared/bestiary.ts` (already fixed)
- Don't change `any` in function signatures that are part of Express middleware (req, res, next) — use proper Express types instead

### Task Steps

1. Run: `grep -rn ": any" backend/src/game/ --include="*.ts" | head -100` to find concentrated `any` usage
2. Run: `grep -rn ": any" frontend/src/ --include="*.tsx" --include="*.ts" | head -100`
3. Run: `grep -rn "as any" shared/ --include="*.ts" | head -100`

4. For each `any` found, replace with the correct type:
   - `gameState: any` → import/define `GameState` interface
   - `creature: any` → `Creature` (from shared/types.ts)
   - `action: any` → `Action` or specific action type
   - `result: any` → `ActionResult` or specific result type
   - `data: any` in routes → define request body interfaces
   - `(c: any)` in array callbacks → `(c: Creature)`
   - `as any` casts → proper type assertions or type guards

5. For `CombatInterface.tsx`, the most impactful fix is typing `gameState` in `GameUIState` — define a proper `GameState` interface in `shared/types.ts` and import it.

6. Verify no compile errors after each file: `npx tsc --noEmit`

### Important Patterns
- `Creature` type is defined in `shared/types.ts`
- `ActionResult` is the standard return type for action resolvers
- `FeatEntry` is defined in `shared/featTypes.ts`
- Route handlers use Express `Request`, `Response` from express
- Game state typically has: `{ id, creatures, round, currentTurn, map, log }` shape

### Success Criteria
- Reduce total `any` count by at least 70% (from 1,551 to under 465)
- Zero TypeScript compile errors in all three packages
- No runtime behavior changes (this is a types-only refactor)
- Report final `any` count per package

---

## TASK 3: General + Skill Feat Audit & Implementation

### Context
- `shared/generalFeats.ts`: 40 entries, only 5 implemented (Diehard, Fleet, Incredible Initiative, Shield Block Feat, Toughness)
- `shared/skillFeats.ts`: 239 entries, only 6 implemented (Battle Medicine, Bon Mot, Dirty Trick, Intimidating Prowess, Kip Up, Scare to Death)
- Total gap: 268 feats marked `not_implemented`
- These feats are class-agnostic and benefit ALL characters

### Files You Own
- `shared/skillFeats.ts` — Update data entries and status
- `shared/generalFeats.ts` — Update data entries and status
- `backend/src/game/skillActions.ts` — Wire runtime skill feat effects
- `backend/src/game/featActions.ts` — Wire runtime general feat effects (coordinate: Task 1 also touches this file, add general feats in a clearly separated section)

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- Class-specific feat files (managed by Task 1)
- Frontend components

### Task Steps

**Phase 1: Audit**
1. Read `shared/skillFeats.ts` fully — list every feat and its `implemented` status
2. Read `shared/generalFeats.ts` fully — list every feat and its `implemented` status
3. Read `backend/src/game/skillActions.ts` — understand the existing resolution pattern for Battle Medicine, Bon Mot, etc.
4. Cross-reference feat descriptions against PF2e Remaster rules:
   - Verify level requirements match AoN
   - Verify prerequisites are correct
   - Verify trait lists are complete
   - Flag any pre-Remaster naming (e.g., "flat-footed" should be "off-guard")

**Phase 2: Implement (categorized by complexity)**

**Passive feats (modify stats, no action needed):**
These only need `implemented: 'full'` and proper description — they take effect through character building, not runtime actions:
- Toughness (done), Fleet (done), Incredible Initiative (done), Diehard (done)
- Canny Acumen, Ancestral Paragon, Armor Proficiency, Weapon Proficiency
- Untrained Improvisation, Incredible Investiture, Expeditious Search
- Assurance (auto-succeed with 10+prof), Dubious Knowledge, Experienced Tracker
- Skill Training, Multilingual, Polyglot, Oddity Identification
- Survey Wildlife, Streetwise, Underground Network, Legendary X feats

For passive feats: update `implemented: 'full'`, ensure description is complete and accurate.

**Active feats (need runtime handlers in skillActions.ts):**
Wire these with actual game logic:
- **Cat Fall** — Reduce falling damage based on Acrobatics proficiency
- **Quick Jump** — Jump as single action instead of 2
- **Steady Balance** — Bonus to Balance, treat success as crit success  
- **Titan Wrestler** — Can Grapple/Trip creatures larger than you
- **Powerful Leap** — Jump 5 extra feet
- **Quick Squeeze** — Squeeze at normal speed
- **Fascinating Performance** — Fascinate creatures with Performance
- **Impressive Performance** — Make an Impression with Performance
- **Glad-Hand** — Make an Impression with Diplomacy at -5 immediately
- **Group Impression** — Diplomacy on multiple targets
- **Lie to Me** — Use Deception defensively to detect lies
- **Confabulator** — Persistent lies are harder to see through
- **Quick Disguise** — Don a Disguise in half the time
- **Slippery Secrets** — Higher DC to Read your emotions
- **Robust Recovery** — Better Treat Disease/Poison outcomes
- **Continual Recovery** — Treat Wounds every 10 min instead of 1 hour
- **Ward Medic** — Treat Wounds on 2 targets at once
- **Legendary Medic** — Remove disease/conditions with Medicine
- **Pickpocket** — Steal from aware targets
- **Subtle Theft** — Hide Steal attempts
- **Unified Theory** — Use Arcana for all magical Recall Knowledge
- **Recognize Spell** — Identify spells as free action on trigger
- **Quick Recognition** — Recognize Spell as free action
- **Magical Shorthand** — Learn spells faster
- All Lore-related feats (Additional Lore, Experienced Professional, etc.)

For active feats: add a case in `resolveSkillAction()` or `resolveFeatAction()` with proper PF2e mechanics.

**Phase 3: Verify**
- Run `npx tsc --noEmit` in backend/ and shared/
- Count remaining `not_implemented` entries
- Report what was implemented vs what remains (with reason for any skips)

### Success Criteria
- All 40 general feats have `implemented: 'full'` with accurate data
- At least 200 of 239 skill feats upgraded to `'full'` (passive ones are quick wins)
- Active skill feats have runtime handlers matching PF2e rules
- Zero compile errors

---

## TASK 4: Environmental Hazards & Traps System

### Context
The development plan (Phase 24) calls for a full hazard system. Currently:
- `EncounterHazard` interface exists in `backend/src/ai/roles/types.ts` (AI narrative only)
- Hidden element types exist: `trap | secret-door | hidden-item | ambush | clue`
- No `shared/hazards.ts` file exists
- No runtime hazard resolution in the game engine
- No hazard damage, saves, or disable checks

### Files You Own
- `shared/hazards.ts` — CREATE this file (type definitions + hazard catalog)
- `backend/src/game/hazardActions.ts` — CREATE this file (runtime resolution)
- `backend/src/game/engine.ts` — Add hazard triggering to movement/turn flow (small additions only)
- `shared/types.ts` — Add hazard-related types if needed (keep additions minimal)

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- `backend/src/ai/roles/types.ts` (the AI already has its own hazard types)
- Frontend components (the UI display will be done separately)
- Existing action resolution files (don't refactor existing patterns)

### Task Steps

**Step 1: Define hazard types in `shared/hazards.ts`**

```typescript
export interface Hazard {
  id: string;
  name: string;
  level: number;
  complexity: 'simple' | 'complex';
  type: 'trap' | 'environmental' | 'haunt';
  stealthDC: number;        // Perception DC to detect
  description: string;
  disable: DisableOption[];  // Ways to disable (skill + DC)
  trigger: string;           // What triggers it
  effect: HazardEffect;      // Damage, conditions, etc.
  reset?: string;            // How/if it resets
  traits: string[];
  // Complex hazard fields
  initiative?: number;
  ac?: number;
  hp?: number;
  hardness?: number;
  fortSave?: number;
  refSave?: number;
  immunities?: string[];
  routineActions?: HazardRoutineAction[];
}
```

**Step 2: Build hazard catalog (PF2e official hazards)**

Include at minimum 30 hazards across levels 0-10:
- **Traps (mechanical):** Spike Pit (Lv0), Crossbow Trap (Lv1), Slamming Door (Lv1), Poisoned Lock (Lv1), Hallway Trap (Lv2), Scythe Blades (Lv4), Falling Block (Lv2), Electric Floor (Lv3), Spear Launcher (Lv2), Fireball Rune (Lv5), Teleportation Trap (Lv6), Disintegration Trap (Lv8)
- **Environmental:** Collapsing Floor (Lv0), Quicksand (Lv3), Vent of Scalding Steam (Lv2), Lava (Lv10), Avalanche (Lv6), Brown Mold (Lv2), Poisonous Gas (Lv4), Flooding Room (Lv3)
- **Haunts:** Phantom Bells (Lv1), Ghostly Choir (Lv3), Poltergeist Attack (Lv5), Spectral Hands (Lv4), Bleeding Walls (Lv2)
- **Complex:** Blade Barrier Hall (Lv4), Drowning Pit (Lv5), Crushing Walls (Lv7), Fire Jet Hallway (Lv6)

For each, follow PF2e Gamemastery Guide stat tables:
- Level determines DCs, damage dice, attack bonus, save DC
- Simple hazards: trigger → effect → done (or reset)
- Complex hazards: roll initiative, take actions each round

**Step 3: Build runtime resolution in `backend/src/game/hazardActions.ts`**

```typescript
export function triggerHazard(hazard: Hazard, targets: Creature[], gameState: any): HazardResult
export function disableHazard(actor: Creature, hazard: Hazard, method: DisableOption): DisableResult
export function detectHazard(actor: Creature, hazard: Hazard): DetectionResult
export function complexHazardTurn(hazard: Hazard, creatures: Creature[], gameState: any): HazardTurnResult
```

Resolution must:
- Roll saves for affected creatures (Reflex for physical traps, Will for haunts, Fort for poison/gas)
- Apply damage with correct type (bludgeoning, piercing, fire, negative, poison, etc.)
- Apply conditions on failed saves (frightened, sickened, grabbed, prone)
- Track complex hazard HP (can be attacked/destroyed)
- Respect hazard immunities and hardness

**Step 4: Hook into engine.ts movement**
Add a lightweight check when creatures move: if destination has a hazard and creature hasn't detected it, trigger it. This should be 10-20 lines added to the movement resolution in engine.ts.

### Success Criteria
- `shared/hazards.ts` exists with full type definitions + 30+ hazard catalog entries
- `backend/src/game/hazardActions.ts` can trigger, resolve, detect, and disable hazards
- Complex hazards can take turns in initiative
- PF2e-accurate DCs, damage, and save mechanics
- Zero compile errors

---

## TASK 5: Character Sheet Overhaul + Inventory System

### Context
`CharacterSheetModal.tsx` currently has 5 tabs (main, skills, spells, combat, feats) in a dark modal. It's functional but missing:
- Per-character inventory (only a shared party stash exists in PartyStash.tsx)
- Equipped vs carried item distinction
- Bulk/encumbrance calculation
- Worn items (magic rings, cloaks, etc.) linked to character
- Consumable tracking per character
- Ancestry/heritage display
- Condition modifier display
- Dense PF2e-style layout

### Files You Own
- `frontend/src/components/CharacterSheetModal.tsx` — Overhaul layout
- `frontend/src/components/CharacterSheetModal.css` — Restyle
- `frontend/src/components/EquipmentPicker.tsx` — May need updates for equip/unequip flow
- `shared/types.ts` — Add inventory-related types (keep additions minimal and backward-compatible)
- NEW: You may create `frontend/src/components/CharacterInventory.tsx` + `.css` as a sub-component

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- `PartyStash.tsx` (keep party stash separate, but inventory should integrate)
- `CombatInterface.tsx`, `ActionPanel.tsx` (other agents)
- Backend routes (no API changes needed; inventory lives on the Creature object)

### Existing Design System (MUST follow)
- Dark theme: `#1a1210` base, `#0f0a08` deep, `#d0c3b4` text
- Gold accent: `#d4af37`
- Fonts: `'Cinzel', 'Times New Roman'` for headers, `'Segoe UI'` for body
- Proficiency colors: untrained `#666`, trained `#b0b0cc`, expert `#4fc3f7`, master `#ffd700`, legendary `#ff5722`
- Border pattern: gold borders for important sections, gray for secondary
- Border radius: 4-12px

### Task Steps

**Step 1: Add inventory types to shared/types.ts**

```typescript
export interface InventoryItem {
  id: string;
  name: string;
  bulk: number;       // 0 = negligible, 0.1 = light, 1+ = standard
  equipped: boolean;
  invested?: boolean;  // For magic items requiring investiture
  quantity: number;
  category: 'weapon' | 'armor' | 'shield' | 'worn' | 'held' | 'consumable' | 'gear';
  slot?: 'head' | 'face' | 'neck' | 'chest' | 'back' | 'hands' | 'ring1' | 'ring2' | 'belt' | 'feet' | 'armor' | 'shield';
  itemData?: any;      // Reference to full item data (weapon stats, armor stats, etc.)
}
```

Add to Creature interface (optional field for backward compat):
```typescript
inventory?: InventoryItem[];
currency?: { gp: number; sp: number; cp: number; pp: number };
```

**Step 2: Add 6th tab "Inventory" to CharacterSheetModal**

Layout:
- **Equipment slots** — Visual body diagram or slot grid showing: Head, Face, Neck, Chest, Back, Hands (2), Ring (2), Belt, Feet, Armor, Shield, Held (2)
- **Backpack** — Scrollable list of non-equipped items with quantity, bulk
- **Consumables** — Quick-access section (potions, scrolls, elixirs) with use buttons
- **Bulk tracker** — Current bulk / max bulk (5 + STR mod), encumbered threshold (5 + STR mod + 5)
- **Currency** — GP/SP/CP/PP display with edit buttons

**Step 3: Overhaul existing tabs for density**

- **Main tab**: Add ancestry/heritage/background display, perception, speed, class DC
- **Skills tab**: Add lore skills, show conditional modifiers (item bonuses, circumstance bonuses)
- **Combat tab**: Show weapon runes, property runes, striking descriptions
- **Feats tab**: Add collapsible descriptions, filter by type, search

**Step 4: Add equip/unequip flow**
- Click slot → opens EquipmentPicker filtered to that slot type
- Equipping a worn item checks investiture limit (10 invested items max)
- Bulk updates automatically when equipping/unequipping

### Success Criteria
- 6-tab character sheet with full inventory management
- Per-character inventory with equip/unequip, slot-based equipment
- Bulk tracking with encumbered warning
- Currency tracking per character
- Ancestry/heritage/background on main tab
- Matches existing PF2e dark theme with gold accents
- No compile errors

---

## TASK 6: CSS/Aesthetic PF2e Compliance Pass

### Context
The project has a working dark theme with gold accents (#d4af37) and PF2e-appropriate fonts (Cinzel for headers, Segoe UI for body). However, many components have inconsistent styling, basic default looks, or miss PF2e-specific visual elements.

### Current Design System
- **Colors:** Dark brown `#1a1210`, deep `#0f0a08`, text `#d0c3b4`/`#ead8be`, gold `#d4af37`, error `#f44336`
- **Fonts:** `'Cinzel', 'Times New Roman'` (headers), `'Segoe UI', Arial` (body)
- **PF2e elements present:** Gold borders, Cinzel headers, dark backgrounds, hero point circles
- **Missing:** Consistent action icons, damage type icons, condition icons, proper PF2e color coding for degrees of success

### Files You Own
- ALL `.css` files in `frontend/src/components/` and `frontend/src/pages/`
- `frontend/src/index.css`
- You may create `frontend/src/styles/pf2e-tokens.css` for shared CSS custom properties

### DO NOT TOUCH
- `.tsx` files (structure changes) — CSS only
- `backend/` anything
- `shared/` anything
- Component logic or state management

### Task Steps

**Step 1: Create design token file `frontend/src/styles/pf2e-tokens.css`**

Define CSS custom properties for consistent use across all components:
```css
:root {
  /* PF2e Core Colors */
  --pf2e-bg-darkest: #0f0a08;
  --pf2e-bg-dark: #1a1210;
  --pf2e-bg-medium: #2a1f18;
  --pf2e-bg-card: #1e1814;
  --pf2e-gold: #d4af37;
  --pf2e-gold-dim: #8b7533;
  --pf2e-text: #d0c3b4;
  --pf2e-text-bright: #ead8be;
  --pf2e-text-dim: #888;
  
  /* Degree of Success */
  --pf2e-crit-success: #00e676;   /* Bright green */
  --pf2e-success: #4caf50;        /* Green */
  --pf2e-failure: #f44336;        /* Red */
  --pf2e-crit-failure: #b71c1c;   /* Dark red */
  
  /* Damage Types */
  --pf2e-dmg-fire: #ff6d00;
  --pf2e-dmg-cold: #40c4ff;
  --pf2e-dmg-electric: #ffea00;
  --pf2e-dmg-acid: #76ff03;
  --pf2e-dmg-poison: #8bc34a;
  --pf2e-dmg-sonic: #e040fb;
  --pf2e-dmg-force: #7c4dff;
  --pf2e-dmg-mental: #f48fb1;
  --pf2e-dmg-positive: #ffd54f;
  --pf2e-dmg-negative: #90a4ae;
  --pf2e-dmg-bleed: #d50000;
  --pf2e-dmg-bludgeoning: #9e9e9e;
  --pf2e-dmg-piercing: #bdbdbd;
  --pf2e-dmg-slashing: #e0e0e0;
  
  /* Proficiency Ranks */
  --pf2e-untrained: #666;
  --pf2e-trained: #b0b0cc;
  --pf2e-expert: #4fc3f7;
  --pf2e-master: #ffd700;
  --pf2e-legendary: #ff5722;
  
  /* Rarity */
  --pf2e-common: #d0c3b4;
  --pf2e-uncommon: #ff9800;
  --pf2e-rare: #2196f3;
  --pf2e-unique: #9c27b0;
  
  /* Typography */
  --pf2e-font-display: 'Cinzel', 'Times New Roman', serif;
  --pf2e-font-body: 'Segoe UI', Arial, sans-serif;
  --pf2e-font-mono: 'Consolas', 'Courier New', monospace;
  
  /* Spacing */
  --pf2e-gap-xs: 4px;
  --pf2e-gap-sm: 8px;
  --pf2e-gap-md: 12px;
  --pf2e-gap-lg: 16px;
  --pf2e-gap-xl: 24px;
  
  /* Borders */
  --pf2e-border-gold: 1px solid #d4af37;
  --pf2e-border-subtle: 1px solid #333;
  --pf2e-border-radius-sm: 4px;
  --pf2e-border-radius-md: 8px;
  --pf2e-border-radius-lg: 12px;
}
```

**Step 2: Update each component CSS to use tokens**

Go through every CSS file and replace hardcoded colors/fonts with `var(--pf2e-xxx)`. Priority components:
1. `CombatInterface.css` — Main gameplay view
2. `ActionPanel.css` — Action buttons, spell cards
3. `GameLog.css` — Combat log entries (add degree-of-success colors)
4. `BattleGrid.css` — Grid themes, token styling
5. `CreaturePanel.css` — HP bars, condition badges
6. `CharacterTracker.css` — Initiative tracker
7. `GMChatPanel.css` — GM chat styling
8. `CampaignDashboard.css` — Dashboard cards
9. `SessionZeroWizard.css` — Wizard steps
10. `EncounterPreview.css` — Encounter setup
11. `DowntimeMenu.css` — Downtime activities
12. `LandingPage.css` — Home page
13. `SaveLoadModal.css`, `BugReportModal.css`, `LevelUpWizard.css` — Modals

**Step 3: Add PF2e-specific visual elements**

- Add action cost icon styling (◆ = 1 action, ◆◆ = 2 actions, ◆◆◆ = 3 actions, ↺ = reaction, ◇ = free)
- Add damage type color coding in GameLog entries
- Add rarity border styling (common = no border, uncommon = orange left border, rare = blue, unique = purple)
- Add condition severity indicators (frightened 1/2/3 with increasing intensity)
- Ensure all scrollbars are styled dark with gold thumb
- Add subtle hover states on all interactive elements (gold glow, slight lift)
- Add transition animations (0.2s ease) to buttons and panels

**Step 4: Responsive improvements**
- Ensure combat view works at 1280px and 1920px widths
- Collapse action panel to icons-only below 1366px
- Stack layout vertically below 1024px (if not already)

### Success Criteria  
- All components use CSS custom properties from pf2e-tokens.css
- Consistent PF2e color scheme across all views
- Degree-of-success, damage type, proficiency, and rarity color coding everywhere
- Action cost icons styled in PF2e format
- Smooth hover/transition animations on interactive elements
- No visual regressions (functional elements still visible and clickable)
- Import pf2e-tokens.css in index.css so it's available globally

---

## TASK 7: 3D Dice Roller Physics & Texture Improvements

### Context
The project has a working Three.js (v0.183.1) dice roller in `DiceRoller3D.tsx` that supports d4/d6/d8/d10/d12/d20. Current issues identified:
- **No true physics engine** — uses spring-based position interpolation, not real rigid body physics
- **No dice-to-dice collision** — dice clip through each other
- **Fixed horizontal layout** — dice always land in a neat row, not a natural pile
- **Canvas textures** — 256×256 dynamically generated, plain colored backgrounds with white numbers
- **Material is uniform** — single MeshStandardMaterial with metalness 0.2, roughness 0.5 for all dice
- **No variety** — all dice use hardcoded colors (d4 red, d6 blue, d8 green, d10 purple, d12 orange, d20 dark gray)

The user wants an AI agent to **brainstorm and research solutions** for more natural-looking rolls, then implement improvements.

### Files You Own
- `frontend/src/components/DiceRoller3D.tsx`
- `frontend/src/components/DiceRoller3D.css`
- `frontend/src/components/DiceQuickRoll.tsx`
- `frontend/src/components/DiceQuickRoll.css`
- `frontend/src/components/DiceRollerContext.tsx`
- `frontend/package.json` — may add new dependencies (physics engine, textures)

### DO NOT TOUCH
- Backend files
- Other frontend components
- Shared types

### Task Steps

**Phase 1: Research & Brainstorm (document findings before implementing)**

Investigate approaches to each problem:

1. **Physics engine options for Three.js:**
   - Cannon.js (cannon-es) — lightweight, well-documented, real rigid body physics
   - Rapier.js (@dimforge/rapier3d-compat) — Rust-based WASM, extremely fast, deterministic
   - Ammo.js — Bullet physics port, heavy but full-featured
   - Evaluate: bundle size, ease of integration, dice-specific suitability, browser compat
   - **Recommendation needed**: Which engine gives the best "natural dice tumble" feel with smallest bundle?

2. **Natural roll behavior:**
   - Real initial velocity + angular velocity (randomized per axis)
   - Gravity with proper bounce coefficient (restitution ~0.3 for dice on felt)
   - Dice-to-dice collisions (need convex hull shapes matching actual die geometry)
   - Dice-to-wall collisions (invisible box walls to keep dice on table)
   - Settling detection (when angular velocity < threshold, snap to nearest face)
   - Reading the result face (determine which face points up after settling)

3. **Texture variety approaches:**
   - Multiple texture sets: "Classic Stone" (granite-like), "Metallic" (gold/silver/bronze), "Gem" (transparent colored), "Wooden" (walnut/oak), "Obsidian" (dark with gold numbers), "Bone" (ivory with dark numbers)
   - PBR texture approach: base color + normal map + roughness map for realistic surfaces
   - Can generate procedurally or use simple tileable patterns via canvas
   - Number styling: engraved (inset shadow), painted (flat), gilded (gold metallic)

4. **Performance considerations:**
   - Physics step rate (60 Hz is fine for dice)
   - Maximum simultaneous dice (damage rolls can have 8-12 dice)
   - WASM loading time for Rapier vs pure-JS Cannon
   - Mobile/low-end GPU fallback (skip physics, use current spring animation)

**Phase 2: Implement physics engine**

Based on research (likely Cannon-es for simplicity):
1. Add physics engine dependency to frontend/package.json
2. Create physics world with gravity, floor plane, invisible walls
3. Create rigid body shapes for each die type (use ConvexPolyhedron with actual vertex data)
4. On roll: apply random initial position (above table), velocity (forward + downward), and angular velocity (random 3-axis spin)
5. Step physics until settled (all dice angular velocity < 0.1 rad/s)
6. Read result by checking which face normal points most upward
7. Sync Three.js mesh positions/rotations from physics bodies each frame

**Phase 3: Implement texture variety**

1. Create a `DiceTheme` type: `'classic' | 'metallic' | 'gem' | 'obsidian' | 'bone' | 'wooden'`
2. For each theme, define: base color (or gradient), number color, material properties (metalness, roughness, opacity, emissive)
3. Update the canvas texture generator to support theme parameters
4. Add theme selection in dice roller settings (or randomize per roll)
5. Implement at minimum 4 distinct themes:
   - **Classic** (current look but polished) — solid colors, white numbers
   - **Metallic** — gold base, dark engraved numbers, metalness 0.7, roughness 0.2
   - **Obsidian** — near-black with gold/red numbers, slight emissive glow
   - **Stone** — mottled gray with noise pattern, chiseled-looking numbers

**Phase 4: Polish**
- Add subtle shadow improvement (softer PCF, better light positioning)
- Add slight camera shake on dice impact
- Add "bounce" sound trigger points (optional — just emit events, audio handled elsewhere)
- Ensure the result reading is correct for all die types across all physics outcomes
- Add fallback: if physics engine fails to load, fall back to current spring animation

### Success Criteria
- Dice physically collide with each other and bounce off invisible walls
- Rolls look natural — varied trajectories, realistic tumbling and settling
- At least 4 texture themes available
- Physics engine chosen and justified in a code comment
- Correct face reading for all die types (d4, d6, d8, d10, d12, d20)
- Performance: <16ms per frame during roll animation, handles 12 simultaneous dice
- Graceful fallback if physics fails
- No compile errors, no runtime errors

---

## TASK 8: Spell System Audit & Completion

### Context
- `shared/spells.ts` contains **1,297 spell entries** in SPELL_CATALOG with complete data (name, level, traditions, description, components, range, area, etc.)
- Only **23 spells** have runtime resolution handlers in `backend/src/game/spellActions.ts`
- The dispatcher uses a switch statement — unhandled spells return "Spell not yet implemented"
- Spell resolution patterns are well-established from the 23 existing implementations

### Implemented spells (for reference / pattern matching):
magic-missile, fireball, burning-hands, shield, heal, produce-flame, electric-arc, telekinetic-projectile, daze, fear, grease, haste, slow, lightning-bolt, heroism, true-strike, warp-step, imaginary-weapon, forbidden-thought, phase-bolt, ray-of-frost, mage-hand, detect-magic, message

### Files You Own
- `shared/spells.ts` — Verify data accuracy, fix any errors
- `backend/src/game/spellActions.ts` — Add runtime handlers

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- Frontend components
- Other game engine files
- Existing 23 spell implementations (don't refactor, only add new)

### Task Steps

**Phase 1: Audit**
1. Read `backend/src/game/spellActions.ts` fully — document the exact resolution pattern used
2. Read `shared/spells.ts` — sample 20-30 spells across tiers to verify:
   - Spell names match PF2e Remaster (not legacy names)
   - Levels/ranks are correct
   - Traditions are accurate
   - Descriptions are sufficient for resolution
3. Identify which spells are highest priority to implement (most commonly cast in actual play)

**Phase 2: Implement spell handlers by category**

Use the established patterns from existing spells. Group by resolution type:

**Damage + Basic Save (highest priority — bulk of combat spells):**
Pattern: Roll damage dice, target makes basic save (crit success = no damage, success = half, failure = full, crit failure = double)
- Rank 1: Breathe Fire, Thunderstrike, Horizon Thunder Sphere, Runic Weapon area
- Rank 2: Acid Arrow, Blazing Bolt, Resist Energy (buff), Sound Burst, Scorching Ray
- Rank 3: Vampiric Feast, Crashing Wave, Fireball (done), Searing Light
- Rank 4: Weapon Storm, Fire Shield, Confusion, Phantasmal Killer
- Rank 5: Cone of Cold, Flame Strike, Banishment, Wall of Force
- Rank 6-10: Chain Lightning, Disintegrate, Power Word Kill, Meteor Swarm

**Attack Roll + Damage:**
Pattern: Roll spell attack vs AC, deal damage on hit, bonus on crit
- Telekinetic Projectile (done), Produce Flame (done), Gouging Claw, Horizon Thunder Sphere
- Polar Ray, Disintegrate (attack variant)

**Buff/Utility (no target saves):**
- Rank 1: Bless (status bonus to attacks in area), Sanctuary, Magic Weapon
- Rank 2: Resist Energy, See the Unseen, Dispel Magic
- Rank 3: Haste (done), Heroism (done), Fly
- Rank 4: Freedom of Movement, Stoneskin
- Higher: True Seeing, Foresight

**Debuff/Control (save-based, no damage):**
- Fear (done), Slow (done), Daze (done)
- Command, Paralyze, Confusion, Hideous Laughter, Blindness
- Banishment, Maze, Feeblemind

**Healing:**
- Heal (done, but verify heightening works for all ranks)
- Soothe, Restoration, Breath of Life, Regenerate

**Cantrips (always available, scale with level):**
Highest priority since they're used every combat:
- Shield (done), Produce Flame (done), Electric Arc (done), Ray of Frost (done), Daze (done)
- Add: Guidance, Light, Stabilize, Prestidigitation, Read Aura
- Add: Divine Lance, Scatter Scree, Slashing Gust, Ignition, Frostbite
- Add: Vitality Lash, Void Warp, Protect Companion, Needle Darts

**Target: implement at least 100 additional spells** (cantrips first, then rank 1-3, then rank 4-5, then 6+).

For each spell, the handler must:
1. Check valid targets (self, creature, area)
2. Roll attacks or require saves as appropriate
3. Calculate damage with heightening (most spells add dice per heightened rank)
4. Apply conditions with duration tracking
5. Return proper ActionResult with all effects

### Success Criteria
- At minimum 120+ spells have runtime handlers (23 existing + 100 new)
- All cantrips implemented (they're used every single combat round)
- Rank 1-3 spells have near-complete coverage
- Heightening works correctly (additional dice/effects per rank)
- Save DCs calculated correctly (class DC or spell DC)
- Zero compile errors

---

## TASK 9: Content Accuracy Audit

### Context
This project has 172,438 lines of TypeScript with extensive PF2e data:
- 1,297 spells in SPELL_CATALOG
- ~800 creatures in BESTIARY
- 5,000+ feat entries across all class/archetype/general/skill/ancestry files
- 27 class feat files, 40+ archetype feat files, ancestry feat files (5 split files A-V)
- Equipment files: weapons.ts, armor.ts, shields.ts, consumables.ts, wornItems.ts, adventuringGear.ts, runes.ts

The project targets **PF2e Remaster** (not legacy). Any pre-Remaster terminology or mechanics is incorrect.

### Files You Audit (read-only analysis, then fix data errors)
- All `shared/*.ts` data files
- `.vscode/PF2eRebirth/shared/*.md` reference documents

### DO NOT TOUCH
- `backend/src/ai/` (managed by AI GM agent)
- Frontend components
- Backend route/engine logic
- File structure or imports

### Task Steps

**Step 1: Remaster Terminology Sweep**
Search the entire `shared/` directory for pre-Remaster terms that should be updated:
- `flat-footed` → should be `off-guard`
- `Spell Level` → should be `Spell Rank`
- `Ability Score` → should be `Ability Modifier` (Remaster removed scores)
- `Alignment` (Lawful Good, etc.) → Remaster removed alignment; use `Edicts and Anathema`
- `School of Magic` (evocation, necromancy, etc.) → Remaster removed spell schools; use traits instead
- `spell level` in descriptions → `spell rank`
- `Hero Points` → verify they follow Remaster rules (1-3 points, spend 1 to reroll or all to stabilize)
- Check for legacy spell names: `Magic Missile` should still be `Magic Missile` (some spells were renamed in Remaster, like `Mage Armor` → `Mystic Armor`)

Key remaster spell renames to check:
- Mage Armor → Mystic Armor
- Chill Touch → Void Warp
- Acid Splash → Caustic Blast
- Disrupt Undead → Vitality Lash
- Guidance → Guidance (unchanged)
- Ray of Enfeeblement → Enfeeble
- True Strike → Sure Strike
- Hideous Laughter → Laughing Fit
- Blindness → Blindness (unchanged)

**Step 2: Feat Data Accuracy Audit (sample-based)**
For each class, spot-check 5 feats against Archives of Nethys (https://2e.aonprd.com/):
- Correct level requirement
- Correct prerequisite (class feature, proficiency, or other feat)
- Correct traits
- Correct action cost (1, 2, 3, reaction, free)
- Description matches current published text (paraphrased, not verbatim copied)

Flag any feats where the level, prereqs, or action cost is wrong.

**Step 3: Bestiary Stat Block Verification (sample-based)**
For 20 common creatures, verify:
- AC matches published value
- HP matches published value
- Attack bonus matches
- Damage matches
- Speed matches
- Resistances/weaknesses/immunities match
Sample creatures: Skeleton Guard, Zombie Shambler, Goblin Warrior, Wolf, Giant Rat, Kobold, Orc Warrior, Bandit, Ogre, Troll, Dragon (Young Red), Lich, Vampire, Drow, Hill Giant, Owlbear, Griffon, Wight, Ghoul, Shadow

**Step 4: Equipment Data Verification**
- Verify weapon damage dice, traits, price for 15 common weapons
- Verify armor AC bonus, Dex cap, check penalty, speed penalty for all armors
- Verify shield hardness, HP, BT values
- Check for any missing Remaster equipment (bastard sword should be available, etc.)

**Step 5: Produce an audit report**
Create a section at the bottom of FIXES_TRACKER.md with all findings:
```
## Content Audit (March 2026)
### Remaster Terminology Issues
- File: location: issue description
### Feat Data Errors
- Feat name (file): what's wrong
### Bestiary Errors
- Creature (file): what's wrong
### Equipment Errors
- Item (file): what's wrong
```

Then fix all issues found directly in the source files.

### Success Criteria
- All pre-Remaster terminology replaced
- Feat spot-check errors fixed
- Bestiary stat errors fixed
- Equipment data errors fixed
- Audit report appended to FIXES_TRACKER.md
- Zero compile errors after changes

---

## COORDINATION NOTES FOR ALL AGENTS

### File Ownership (no conflicts)
| Task | Primary Files |
|------|--------------|
| 1 (Classes) | `backend/src/game/classActions.ts`, `backend/src/game/featActions.ts`, new `*FeatActions.ts` files |
| 2 (any types) | All files EXCEPT those owned by other tasks |
| 3 (Skill/Gen feats) | `shared/skillFeats.ts`, `shared/generalFeats.ts`, `backend/src/game/skillActions.ts` |
| 4 (Hazards) | `shared/hazards.ts` (NEW), `backend/src/game/hazardActions.ts` (NEW) |
| 5 (Char Sheet) | `CharacterSheetModal.tsx/css`, new `CharacterInventory.tsx/css` |
| 6 (CSS) | All `.css` files, new `pf2e-tokens.css` |
| 7 (Dice) | `DiceRoller3D.tsx/css`, `DiceQuickRoll.tsx/css`, `DiceRollerContext.tsx` |
| 8 (Spells) | `shared/spells.ts`, `backend/src/game/spellActions.ts` |
| 9 (Content Audit) | All `shared/*.ts` data files (data corrections only) |

### Shared file `shared/types.ts`
- Task 4 may add hazard types
- Task 5 may add inventory types
- Task 2 may tighten existing types
- **Rule: only APPEND new types/interfaces, never modify existing ones**

### Build Verification
Every agent must run `npx tsc --noEmit` in the relevant package before finishing.

### The AI GM system (`backend/src/ai/`) is OFF LIMITS to all agents.

---

# Wave 2 Follow-Up Prompts

These prompts are based on the current post-sprint state of the repo and the latest audits.

## TASK 10: Archetype Audit + Completion

### Planned / Unplanned
- **Planned**: Completes the long-running archetype content/data track already reflected across `shared/archetypeFeats*.ts`
- **Unplanned addition**: Perform a quality sweep for stale Remaster terminology, broken prerequisites, duplicate IDs, and incomplete implementation status markers while completing the catalog

### Context
Archetype support is broad but uneven. The repo already contains a large distributed archetype catalog:
- `shared/archetypeFeats.ts`
- `shared/archetypeFeatsLegacyBD1-4.ts`
- `shared/archetypeFeatsLegacyLO1-6.ts`
- `shared/archetypeFeatsLegacySM1-3.ts`
- `shared/archetypeFeatsStandaloneAD.ts`
- `shared/archetypeFeatsStandaloneDG.ts`
- `shared/archetypeFeatsStandaloneHM.ts`
- `shared/archetypeFeatsStandalonePW.ts`
- `shared/archetypeFeatsNonCore*.ts`

Recent content work already touched many archetype files for Remaster terminology (`spell level` → `spell rank`, alignment language → sanctification/edicts, etc.), but this was not a complete pass and may have introduced minor inconsistencies such as BOM markers or uneven formatting.

### Files You Own
- All `shared/archetypeFeats*.ts`
- `shared/feats.ts`
- `backend/src/game/featActions.ts` only for archetype feat runtime effects that are clearly missing and can be safely added without touching class-mechanic ownership

### DO NOT TOUCH
- `backend/src/ai/`
- `frontend/`
- `backend/src/game/classActions.ts` unless absolutely required for routing an archetype-specific feat action and no class behavior changes are needed
- `AGENT_TASK_PROMPTS.md`

### Task Steps

**Phase 1: Audit**

1. Read `shared/feats.ts` and enumerate every imported archetype catalog file.
2. For each archetype catalog file, count entries by `implemented` status: `full`, `partial`, `stub`, `not_implemented`.
3. Search for likely data quality problems:
    - duplicate feat IDs
    - lingering `spell level`, `flat-footed`, alignment prerequisites, or legacy spell names that should be Remaster-safe in descriptions/mechanics
    - broken or empty prerequisites arrays where prerequisites should still exist
    - malformed trait lists or action costs
4. Cross-check against the markdown research/reference docs under `.vscode/PF2eRebirth/shared/`:
    - `multiclass-archetype-feats.md`
    - `pf2e-archetypes-complete.md`
    - `lost-omens-remaining-archetypes.md`
    - `secrets-of-magic-archetypes.md`
    - `book-of-the-dead-archetypes*.md`
    - `alter-ego-archetype-da.md`
    - `archetype-research-batch.md`
5. Produce a table: Archetype file | archetype count | feat count | remaining non-full entries | notable data issues.

**Phase 2: Complete the data layer**

For every archetype feat still marked `partial`, `stub`, or `not_implemented`:
- complete its data entry so it has accurate:
   - `id`
   - `name`
   - `source`
   - `level`
   - `traits`
   - `actionCost`
   - `prerequisites`
   - `description`
   - `mechanics`
   - `subChoices` where needed
- upgrade `implemented` to `full` when the feat is fully represented in data and either:
   - is passive/data-only, or
   - already works through existing generic systems

**Phase 3: Runtime support for safe archetype feats**

Implement only archetype feats that can be added without stepping on class ownership. Good candidates:
- passive dedication effects already handled by progression logic
- generic combat feat interactions
- archetype-granted reactions or actions that are self-contained in `featActions.ts`
- multiclass dedication validation or dedication-lock enforcement gaps

Avoid re-implementing full class engines through archetype feats. If an archetype feat relies on a class mechanic that does not yet exist, keep the feat data-complete and document the dependency.

**Phase 4: Cleanup**

- Remove accidental BOM characters if present.
- Normalize terminology to current Remaster language where appropriate.
- Ensure `shared/feats.ts` exports and FEAT_CATALOG assembly remain correct.

### Success Criteria
- Every archetype feat entry is audited and categorized correctly.
- All remaining data-only archetype feats are brought to complete, high-quality entries.
- Safe runtime archetype feat effects are wired where feasible.
- Duplicate IDs and obvious bad prerequisites are fixed.
- No TypeScript errors in `shared/` or `backend/`.

---

## TASK 11: Background Audit + Completion

### Planned / Unplanned
- **Planned**: Completes Phase 11.3 background expansion in `PF2E_DEVELOPMENT_PLAN.md`
- **Unplanned addition**: Bring the builder’s background data model up to parity by adding descriptions, skill feats, and validation utilities rather than only name/boost coverage

### Context
Backgrounds are much further along than the old development plan claims. The current builder already has large `BACKGROUND_BOOSTS` and `BACKGROUND_SKILLS` maps in `frontend/src/components/characterBuilderData.ts`, and builder logic consumes them in `CharacterBuilder.tsx` and `characterBuilderHelpers.tsx`.

What is likely still missing:
- full background coverage versus current Player Core / Player Core 2 / remastered options
- background descriptions and presentation quality
- guaranteed one-to-one parity between:
   - background list
   - boost map
   - skills map
   - lore mapping
   - background feat granted by the background
- explicit validation/reporting helpers

### Files You Own
- `frontend/src/components/characterBuilderData.ts`
- `frontend/src/components/characterBuilderHelpers.tsx`
- `frontend/src/components/CharacterBuilder.tsx`
- `shared/types.ts` only if a small background-related type is needed

### DO NOT TOUCH
- `backend/src/ai/`
- class feat files
- archetype feat files
- unrelated frontend styling files

### Task Steps

**Phase 1: Audit**

1. Read `characterBuilderData.ts` fully for:
    - `BACKGROUND_BOOSTS`
    - `BACKGROUND_SKILLS`
    - `BACKGROUNDS`
    - any background helper/validation functions
2. Confirm how background selection is rendered in `CharacterBuilder.tsx` and applied in `characterBuilderHelpers.tsx`.
3. Count current backgrounds and compare against current Remaster target coverage.
4. Identify mismatches:
    - background present in `BACKGROUNDS` but not in one of the supporting maps
    - map entry without a corresponding background option
    - wrong number of granted skills
    - wrong lore names
    - missing background feat mapping
    - backgrounds with outdated wording or legacy/remaster naming issues

**Phase 2: Complete background data**

For every supported background, ensure the builder has:
- name
- correct specific boost choices
- free boost handling
- one trained skill
- one lore skill
- granted background feat
- short flavor/description text suitable for builder UI

If the existing data model lacks a background feat or description map, add one, for example:

```typescript
export const BACKGROUND_DETAILS: Record<string, {
   description: string;
   feat: string;
}> = { ... };
```

**Phase 3: Builder integration**

- Display the granted feat and short description in the background selection step.
- Add validation helpers similar to `validateAncestryCoverage()` for background coverage.
- Ensure the selected background cleanly propagates skills, lore, boosts, and feat metadata.

**Phase 4: Quality checks**

- Verify background counts and data parity programmatically.
- Update any stale comments claiming only ~28 or ~50 backgrounds if current coverage is higher.

### Success Criteria
- Background catalog is complete for the intended Remaster scope.
- Every background has boost, skill, lore, and feat data.
- Builder UI surfaces enough context to make background selection meaningful.
- Background validation utilities exist and report zero mismatches.
- No TypeScript errors.

---

## TASK 12: Development Documentation Collation + Cleanup

### Planned / Unplanned
- **Planned**: Mark completed milestones accurately in the development plans
- **Unplanned addition**: Consolidate stale top-level documentation, archive or delete obsolete trackers, and turn the docs into a coherent source of truth

### Context
Top-level development docs are currently fragmented and partly stale.

Examples from the audit:
- `DEVELOPMENT.md` is mostly environment/setup guidance, not active development tracking
- `PROJECT_VISION.md` is outdated and still describes early-MVP work as in progress
- `README_MAIN.md` references deleted or obsolete files like `GridDisplay.tsx` and older AI architecture
- `CONTEXT.md` has an outdated root path and outdated architecture notes
- `FIXES_TRACKER.md` is almost entirely complete, but still includes completed sections mixed with open work and a large appended audit block
- `PF2E_DEVELOPMENT_PLAN.md` still claims background work is far earlier than the builder audit indicates
- `PHASE_0_CODE_REVIEW.md` is complete historical record, but should be treated as archival rather than active planning

The user explicitly does **not** want `AI-GM-DEVELOPMENT.md` modified in this task.

### Files You Own
- `README.md`
- `README_MAIN.md`
- `CONTEXT.md`
- `DEVELOPMENT.md`
- `PROJECT_VISION.md`
- `PF2E_DEVELOPMENT_PLAN.md`
- `FIXES_TRACKER.md`
- `PHASE_0_CODE_REVIEW.md`
- Any other top-level `.md` file except `AI-GM-DEVELOPMENT.md`

### DO NOT TOUCH
- `AI-GM-DEVELOPMENT.md`
- source code files except where doc references must be verified

### Task Steps

**Phase 1: Audit and classify docs**

For every top-level documentation file, classify it as one of:
- `source-of-truth`
- `active-supporting-doc`
- `archival-history`
- `obsolete/delete`

Produce a table with:
- file name
- current purpose
- overlap/conflict with other docs
- recommended action

**Phase 2: Consolidate active docs**

Make the top-level docs coherent using this target structure:
- `README.md`: public-facing project overview, quick start, main feature status, current architecture summary
- `DEVELOPMENT.md`: developer workflow, local setup, build/test/debug commands, repo conventions
- `CONTEXT.md`: concise assistant/bootstrap context for future chats, updated paths and current architecture
- `PF2E_DEVELOPMENT_PLAN.md`: canonical milestone plan with completed phases checked/annotated accurately
- `FIXES_TRACKER.md`: only active/open fixes and genuinely unresolved audit findings

**Phase 3: Clean up trackers and completed lists**

- Remove or archive fully completed fix sections from `FIXES_TRACKER.md`.
- Preserve only genuinely open work.
- Move completed audit history out of the active tracker if it no longer belongs there.
- If a doc is purely historical and still valuable, keep it but clearly mark it archival.
- If a doc is obsolete and redundant, delete it.

Good candidates for archival or deletion, depending on overlap after consolidation:
- `PROJECT_VISION.md`
- `README_MAIN.md`
- `PHASE_0_CODE_REVIEW.md`

**Phase 4: Update milestones in the main plan**

In `PF2E_DEVELOPMENT_PLAN.md`:
- mark completed milestones that are currently stale
- correct outdated counts and notes
- ensure phases already completed in code are clearly marked complete
- update builder/background/archetype progress if the code audit shows the plan is behind reality
- do **not** invent progress; only mark milestones complete if verified in code/docs

**Phase 5: Final verification**

- Search for stale references to deleted files (for example `GridDisplay.tsx`)
- Search for outdated ports, root paths, or obsolete architecture descriptions
- Ensure no broken internal doc references remain

### Success Criteria
- One clear source of truth for roadmap, setup, and context.
- Completed to-fix lists removed from active tracking.
- Development plan milestones reflect the verified current state.
- Obsolete or duplicate docs deleted or clearly marked archival.
- `AI-GM-DEVELOPMENT.md` untouched.

---

## Recommended Additional Ready Tasks

These are ready now even if they were not part of the original 9-task sprint.

### TASK 13: Builder Data Integrity Sweep
- **Planned**: adjacent to Phase 11 builder polish
- **Why now**: ancestry, background, class, feat, and proficiency data are spread across large maps and helper functions; this is a good time to add validation/report tooling and close any remaining parity gaps.
- **Scope**:
   - add validation helpers for backgrounds, classes, class spellcasting, deity mappings, subclass lists, and feat option lists
   - identify orphaned options and dead builder branches
   - verify imports/Pathbuilder integration assumptions

### TASK 14: Rules Engine Exploration/Downtime Completion
- **Planned**: corresponds directly to `LOW-05` in `FIXES_TRACKER.md`
- **Why now**: it is the major remaining open item in the active fix tracker
- **Scope**:
   - audit exploration and downtime actions currently stubbed in the engine
   - implement the missing action handlers or route them through dedicated subsystems
   - close the remaining open tracker item if fully verified

### TASK 15: Bestiary Completeness + Common Creature Backfill
- **Planned**: aligns with ongoing bestiary content work
- **Why now**: the content audit already flagged common missing or previously weak creatures; several recent bestiary edits suggest active work is already underway
- **Scope**:
   - audit for missing iconic/common creatures
   - verify stat block completeness (skills, saves, senses, languages, attacks, rarity)
   - finish the “common encounter baseline” creature set for testing and AI encounter generation
