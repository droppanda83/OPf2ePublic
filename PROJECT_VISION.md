# PF2e AI-Powered Tactical Combat Game - Project Vision

## Project Overview

**PF2e Rebirth** is a comprehensive digital tabletop gaming platform for Pathfinder 2nd Edition (PF2e) that combines:
- **AI-Driven Game Mastering** - An intelligent virtual Game Master that understands PF2e rules and narrates encounters
- **Tactical Combat Engine** - Real-time 20×20 grid-based combat with terrain interactions and movement costs
- **Character Management** - Full character sheet tracking with skill checks, conditions, and character progression
- **Story & Narrative Tools** - Plot tracking, tension management, and dynamic story progression
- **Dynamic World Building** - Procedural map generation, custom encounter design, and creature bestiary

This platform empowers both Game Masters and players by automating rules adjudication, reducing prep time, and enhancing storytelling through AI assistance while maintaining player agency and strategic depth.

---

## Core Feature Set

### PHASE 1: MVP (Current/In Progress)

#### ✅ Completed
- [x] Express.js backend with TypeScript
- [x] React + Vite frontend
- [x] 20×20 tactical grid
- [x] Pathfinding with terrain costs (difficult/impassable)
- [x] Movement distance visualization (up to 6.5 squares)
- [x] Turn-based combat system
- [x] Basic creature initialization
- [x] Health tracking
- [x] Turn order initiative
- [x] Manual turn ending
- [x] Action point system (3 actions per turn)

#### 🔄 In Development
- [ ] Armor Class (AC) system and defense mechanics
- [ ] Attack roll resolution (d20 + mods vs AC)
- [ ] Saving throw system (Fortitude, Reflex, Will)
- [ ] Critical success/failure mechanics (nat 20/1, ±10 from DC)
- [ ] Basic damage system with damage types
- [ ] Condition tracking (frightened, stunned, etc.)
- [ ] Multiple Attack Penalty (MAP) calculations
- [ ] Range and visibility mechanics

#### 📋 Planned for Phase 1
- [ ] Game state persistence (save/load systems) **CRITICAL**
- [ ] Encounter end conditions and victory/defeat detection
- [ ] Loot distribution system
- [ ] Experience point tracking (basic)
- [ ] Multiple sample encounters with varied terrain
- [ ] Basic visual polish and UI refinement

---

### PHASE 2: Rules & Actions System

#### Core Combat Resolution

**Armor Class (AC) System**
- Base AC = 10 + proficiency + DEX mod + armor bonus + shield
- AC modifiers: cover (+1 to +4), concealment, conditions
- Attack vs AC for hit/miss determination

**Attack Rolls & Strike Actions**
- d20 + attack modifier vs target AC
- Bonuses: weapon proficiency, ability mod, magic items, circumstance
- Penalties: MAP, conditions, difficult terrain (ranged)
- Hit thresholds: miss, success, critical success (beat by 10+), critical failure

**Saving Throws**
- Three save types: Fortitude (STR-based), Reflex (DEX-based), Will (WIS-based)
- Formula: d20 + save bonus vs spell/effect DC
- Same result scale: failure, success, critical failure, critical success
- Save modifiers from abilities, items, and conditions

**Critical Success/Failure**
- Natural 20 or beating DC by 10+ = critical success (double effect typically)
- Natural 1 or failing by 10+ = critical failure
- Critical hits double weapon damage
- Critical spell failures often prevent the effect entirely

**Multiple Attack Penalty (MAP)**
- First attack in a round: full bonus
- Second attack (Stride + Strike): -5 penalty
- Third+ attack: -10 penalty
- MAP reduction via feats: some feats reduce or eliminate penalties

**Damage Types & Resistances**
- Physical damage: bludgeoning, piercing, slashing, persistent
- Energy damage: fire, cold, electricity, sonic
- Special damage: positive, negative, poison, mental, force
- Calculate resistance/immunity/weakness after damage rolls
- Multiple resistance applications (stack or priority system)

**Range & Visibility**
- Melee strikes: 5 ft reach (10 ft with reach weapons)
- Ranged attacks: weapon-determined ranges (15-120 ft typical)
- Perception checks vs DC to detect hidden/invisible creatures
- Visibility states: bright light, dim light, darkness
- Concealment: miss chance and AC penalties
- Cover: +1 (lesser), +2 (standard), +4 (greater)
- Line of sight blocking

#### Action Economy Modifiers

**Quickened Status**
- Grants bonus actions beyond standard 3-action economy per round
- Typically grants 1 extra action for 1 round (can stack with multiple sources)
- Haste spell grants quickened effect
- Track separately from regular actions (don't auto-deduct from 3)
- Visual indicator on action panel when quickened

**Additional Reactions**
- Default: 1 reaction per round (resets at start of next turn)
- Feat-based expansion: certain feats grant additional reactions
  - Example: Reactive Striker feat allows 2nd reaction per round
  - Some feats grant reaction-based abilities multiple times
- Display current reaction pool vs used reactions
- Reaction types: Shield Block, Reactive Strike, Catch Off-Guard, etc.
- Visual feedback when reactions exhausted

#### Full Action List

**Movement Actions**
- **Stride**: Move up to movement speed (typically 25-30 ft)
  - Calculate path via pathfinding with terrain costs
  - Provokes reactions in some conditions
  - Can be used multiple times (up to speed limit per round)

- **Step**: Move 5 ft without triggering reactions
  - Counts as 1 action/activity
  - Ignores difficult terrain for this step

**Strike Actions**
- **Strike**: Make an attack roll with equipped melee weapon
  - Scales with attack modifiers
  - Subject to MAP on 2nd/3rd strikes
  - Includes damage roll on hit

- **Ranged Strike**: Attack with ranged weapon (bow, crossbow, etc.)
  - Same mechanics as melee but with range distances
  - Penalties for attacking beyond first range increment

**Interaction Actions**
- **Interact with Object**: Use/manipulate an item or environmental element
  - Open door, draw weapon, drink potion, etc.
  - Typically 1 action (some free actions exist)

- **Cast a Spell**: Initiate a spell
  - Spell level determines action cost (1-3 actions for normal, can be reaction)
  - Requires applicable action types (V, S, M)
  - Spell DC for saves determined by caster stats

**Technique Actions**
- **Dodge**: Become harder to hit this round
  - Gain +2 to AC until next turn + fail saves by less
  - 1 action cost

- **Raise Shield**: Put shield to use
  - Gain AC bonus from shield (typically +1)
  - Shield becomes breakable (hardness prevents HP damage)

- **Take Cover**: Hide behind cover and gain concealment
  - Requires environmental cover adjacent to you
  - Gain concealment bonus and ability to hide

- **Recall Knowledge**: Identify creature abilities
  - Roll skill check (Nature, Occultism, Religion, Arcana)
  - Difficulty: moderate DC for that creature level
  - Success reveals specific weakness, resistance, or ability

**Social/Mental Actions**
- **Command an Ally**: Give instructions to ally
  - Ally rolls d20 to follow complex orders
  - Simple commands (attack target) are automatic

- **Demoralize**: Attempt Intimidation check
  - d20 + Intimidation modifier vs target Will DC
  - Failure = no effect; success = frightened 1; critical success = frightened 2

- **Hide/Sneak**: Enter stealth
  - Stealth check vs enemy Perception DC
  - While hidden: +2 circumstance bonus to Strike against target
  - Attacks reveal your position (unless specific feat prevents)

**Reaction-Based Actions**
- **Shield Block**: Use when you would take damage
  - Reduce damage by shield hardness (and absorb remainder until shield breaks)
  - Usable 1 per round (or multiple if has feat)

- **Reactive Strike**: Make attack when enemy provokes
  - Grants Strike against creature that moved adjacent to you
  - Some creatures cannot trigger (if you can't reach them)
  - Usable once per round base

#### Spell System
- **Basic Spell Framework**
  - Spell levels (1-10)
  - Action costs (1-3 actions, or reaction)
  - Range types (touch, 30 ft, 60 ft, unlimited within sight)
  - Area of Effect (single target, cone, line, burst)
  - Saving throws (basic, advanced)

- **Core Spells by Level**
  - Level 1: Magic Missile, Shield, Burning Hands, Shocking Grasp
  - Level 2: Fireball, Invisibility, Mirror Image
  - Level 3: Fly, Heroism, Dispel Magic
  - (Expandable to all 10 spell levels)

- **Spell Components**
  - Verbal (requires speaking)
  - Somatic (requires hand gestures)
  - Material (requires components)
  - Focus (reusable item)

#### Advanced Actions
- **Strike**: Melee or ranged attacks with multiple attack penalties
  - Right of first refusal
  - Armor class calculations
  - Critical success/failure mechanics
  - Attack modifiers (flanking, concealment)

- **Spellcasting**: Cast spells from character repertoire
  - Spell slots management
  - Concentration checks
  - Spell save DCs

- **Ability Checks**: Initiative, Perception, Athletics, Stealth, etc.
  - Modifier calculations from ability scores
  - Proficiency bonuses
  - Circumstance modifiers

- **Defense Actions**: Dodge, Raise Shield, Take Cover
  - AC bonuses
  - Duration and conditions

#### Equipment & Items

**Armor System**
- Light, medium, heavy armors with AC bonuses
- Dexterity cap (some armors limit maximum DEX bonus applied)
- Armor strength requirements
- Specific armor traits (flexible, noisy, bulky, etc.)

**Weapons**
- Damage dice and type (d4, d6, d8, d10, d12)
- Weapon traits: agile, finesse, reach, thrown, etc.
- Special properties: knockout, deadly (extra d12 on crit), trip, etc.
- Weapon groups affecting proficiency bonuses

**Shields**
- AC bonus when raised (typically +1 or +2)
- Hardness value (mitigates damage to shield)
- Shield break thresholds
- Special shield abilities and reactions

**Bulk System (PF2e core mechanic)**
- Item bulk assigned to each item
- Encumbrance limits: 10 + STR modifier bulk
- Move speed penalties when carrying over limit
- Bulk calculator in character sheet
- Dead weight and item quantity tracking

**Consumable Items**
- Potions: healing, buff potions, resistance potions
- Scrolls: one-time spell scrolls
- Talismans: single-use magical items
- Wands: limited-charge magical items
- Alchemical items: bombs, elixirs, mutagens

---

### PHASE 3: Character Management

#### Character Sheet System
- **Ability Scores**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
  - Modifiers (-5 to +6 typical range)
  - Ability increases every 4 levels

- **Derived Statistics**
  - Hit Points (HP) = Constitution mod + class HP + bonuses
  - Armor Class (AC) = 10 + proficiency + DEX mod + armor bonus
  - Fortitude, Reflex, Will saves with modifiers
  - Speeds (walk, climb, swim, fly, burrow)
  - Perception and initiative

- **Skills** (18 skills tracked)
  - Proficiency levels (untrained, trained, expert, master, legendary)
  - Ability modifier + proficiency bonus + circumstance mods
  - Skill checks with DC comparison
  - Trained-only skill enforcement

- **Feats & Abilities**
  - Class feats (selected every odd level)
  - Ancestry feats
  - General feats (every 4 levels)
  - Archetype dedication and related feats
  - **Feat-based special features:**
    - Extra reactions per round (e.g., Reactive Striker feat grants 2nd reaction)
    - Quickened action granting (e.g., Haste spell grants 1 extra action)
    - Special action types unavailable to base ancestry
    - Modified damage/saves from feat selection
  - Display what feats grant and track accordingly

- **Character Progression**
  - Experience points (XP) accumulation from combat
  - Level tracking (1-20)
  - Automatic advancement with XP thresholds
  - Ability score increases every 4 levels (+2 to one score)
  - Proficiency scaling with level

- **Conditions & Effects**
  - Conditions with levels (frightened 1-4, sickened 1-3, etc.)
  - Duration tracking (rounds, minutes, hours, permanent)
  - Flat-footed, stunned, slowed, hasted, quickened
  - Invisible, concealed, hidden visibility states
  - Buffs/debuffs with clear visual indicators
  - Persistent damage (per round damage until healed certain amount)

#### Party Management
- **Multiple Characters**
  - Store 4-6 player characters per campaign
  - Quick-swap between characters in combat
  - Roster management interface
  - Character portrait/token assignment

- **Campaign Persistence**
  - Multiple battle sessions per campaign
  - Character level and progression across sessions
  - Shared treasure pool and item management
  - Campaign session history and notes

#### Experience & Leveling
- **XP Award System**
  - Per-encounter XP calculation based on difficulty
  - Level-based XP scaling
  - Adjustments for party size
  - XP tracker in campaign

- **Leveling Up**
  - Automatic level-up prompts at XP thresholds
  - Feat selection on level-up (every odd level)
  - Ability score increases at 4, 8, 12, 16, 20
  - New proficiencies and bonuses per class

#### Healing & Recovery
- **Hit Point Restoration**
  - Healing spells (Healing Hands, Cure Light Wounds, etc.)
  - Medicine skill healing (maximum once per day per creature)
  - Treat Wounds action (1 hour craft, healing check vs creature's DC)

- **Rest Mechanics**
  - 8-hour rest restores all HP and recovers daily spell slots
  - 1-hour exploration pace recovery
  - Regeneration and fast healing tracking
  - Dying/unconscious recovery rules

#### Character Import/Export
- **PF2e Character Sheet Support**
  - JSON import from official character builders
  - CSV import from Pathbuilder 2e
  - Manual character creation wizard
  - Character file export (JSON format)

- **Monster Import**
  - Import stat blocks from bestiary sources
  - Auto-calculate modifiers
  - Searchable creature database
  - Quick-add to combat from library

---

### PHASE 4: AI Game Master & Narrative Tools

#### Virtual AI Game Master
- **Real-time Rules Adjudication**
  - Answers PF2e rules questions
  - Adjudicates edge cases
  - Suggests RAW vs RAI interpretations
  - Explains skill check DC values and calculations
  - Action economy validation (MAP, reaction tracking, quickened status)
  - Feat ability clarification and cost validation
  - Condition effect clarification

- **NPC Interaction Engine**
  - Dialogue with NPCs using GPT-4
  - Context-aware responses based on party actions
  - Personality and motivations
  - Reaction to party choices

- **Combat Narration**
  - Descriptive combat text for each action
  - Environmental hazard descriptions
  - Creature behavior narration
  - Victory/defeat condition descriptions
  - Damage description variability (crit vs normal)

- **Encounter Generation**
  - Dynamic difficulty scaling
  - Threat assessment for party level
  - Treasure allocation per PF2e rules
  - Environmental storytelling
  - Loot generation with appropriate item levels
 and subplots
- Side quest management
- NPC motivations and relationships
- Milestone documentation
- Foreshadowing and secret management
- Player choices and consequences

**Tension Tracker**
- Encounter difficulty curve
- Pacing recommendations
- Emotional beat tracking
- Combat intensity scale (1-10)
- Story drama meter
- Recommendations for action vs. roleplay balance

**Session Log**
- Automatic session transcription
- Notable moments highlighting
- Character progression tracking
- Treasure acquired and loot distribution
- Attendance tracking
- Session XP awards
- Post-combat summary

**Encounter Building Assistant**
- XP budget calculator for party level
- Difficulty scaling (trivial, low, moderate, severe, extreme)
- Party composition analyzer
- Suggested creature combinations
- Encounter balance recommendations

**Visibility & Fog Of War**
- Hide unexplored areas from players
- Darkness/dim light visibility zones
- Character perception range indicators
- Separate GM view vs player view maps
- Creature visibility states (hidden, invisible, concealed)

**Round & Time Tracking**
- Clear round counter display
- Combat duration timer
- Effect duration countdowns
- Turn order with initiative scores
- Buff/debuff timer display
- Reaction count display (current/used per round)
- Speed/effect expiration warningsranscription
- Notable moments highlighting
- Character progression tracking
- Treasure acquired
- Loot distribution
- Attendance tracking

---

### PHASE 5: Maps & Dungeons
 (normal movement cost = 1)
- Difficult terrain (10 ft cost = 2 movement)
- Impassable terrain (blocks all movement)
- Hazardous terrain (lava, acid, spikes, fire → damage per round)
- Elevated terrain (cliffs, platforms, bridges)
- Water (swimming costs 2×, wading costs 1.5×, drowning risk)
- Magical terrain (antimagic zones, enhancement fields, elemental areas)
- Visibility modifiers (darkness zones, fog, concealment overlays)

#### Encounter End Conditions
- **Victory Conditions**
  - All enemies defeated or surrendered
  - Objective completion (defend location, retrieve item, etc.)
  - Enemy retreat/escape
  - Parley/negotiation success

- **Defeat Conditions**
  - All PCs defeated or at 0 HP
  - Objective failed
  - Party surrender
  - In-game loss conditions

- **Post-Combat Resolution**
  - Auto-calculate encounter XP
  - Loot generation and distribution
  - Gold/treasure display
  - Damage healing prompt
  - Session notes capture
  - Return to exploration/story mode
- Customizable generation parameters (size, density, style)
- Biome-specific generation (mountain, swamp, desert, coastal)

**Custom Map Editor**
- Drag-and-drop terrain placement
- Preset dungeon tiles and objects
- Custom texture support
- Dynamic lighting/darkness zones
- Trap and hazard placement
- Environmental effect zones (fire, ice, magical auras)

**Map Library**
- Pregenerated adventure maps
- Community-created maps
- Quick-access templates
- Seasonal themed maps (winter, spooky, mystical)

**Terrain Types**
- Empty ground
- Difficult terrain (10 ft cost = 2 movement)
- Impassable terrain
- Hazardous terrain  with hazard indicators
  - Distance measurement tool (click-to-click pathfinding)
  - Square/hex toggle (currently on square grid)
  - Grid overlay showing difficult terrain costs
  - 5 ft scale indicators
  - Distance labels on movement preview

- **Action Panel Redesign**
  - Large, clear action buttons
  - Spell preview on hover (range, area, effect, DC, saving throw)
  - Attack preview (show bonuses before rolling, MAP visualization)
  - Save preview (show DC and save type before using)
  - Quick action macros
  - Radial menu for contextual actions

- **Visual Effects & Feedback**
  - Spell area highlighting (before casting)
  - Damage radius visualization
  - Movement path preview
  - Attack range indicators
  - Spell save indicators
  - MAP penalty visualization (greyed out 2nd/3rd attacks)
  - Reaction count display (current/used per round)
  - Quickened action glow and visual indicator
  - Condition badge animations
  - Damage/effect number floating text
- **Common Roll Types**
  - Attack roll (d20 + mods + effects)
  - Damage roll (multiple dice, add modifiers)
  - Saving throw (d20 + mod with DC comparison)
  - Skill check (d20 + skill mod with DC comparison)
  - Initiative (d20 + dex mod + effects)

- **Roll Tracking**
  - Full roll history in chat
  - Dice pool management
  - Critical success/failure highlighting
  - Fate point rules integration (if applicable)

#### Character Tokens & Avatars
- **Token Customization**
  - Character portrait/miniature
  - HP bar overlay
  - Condition indicator badges (stunned, frightened, etc.)
  - Size indicators (tiny, small, medium, large, huge, gargantuan)
  - Aura/effect visualizations

- **Visual Status Indicators**
  - Turn highlight when active
  - Dead/unconscious graying out
  - Hostile/friendly color coding
  - Buffs/debuffs visual effects
  - Flanking visualization

#### Combat UI Improvements
- **Grid Enhancements**
  - Miniature-style artwork for creatures
  - Terrain textures
  - Distance measurement tool (click-to-click pathfinding)
  - Square/hex toggle (currently on square grid)
  - Grid scale options (5 ft per square)

- **Action Panel Redesign**
  - Large, clear action buttons
  - Spell preview on hover (range, area, effect)
  - Quick action macros
  - Radial menu for contextual actions

- **Visual Effects**
  - Spell area highlighting (before casting)
  - Damage radius visualization
  - Movement path preview
  - Attack range indicators

---

### PHASE 7: Bestiary & Reference Tools

#### Creature Bestiary
- **Searchable Database**
  - Filter by level, type, trait
  - Advanced search (AC range, ability scores)
  - Quick stat block display

- **Creature Management**
  - Add creatures to encounters
  - Customize stat blocks (adjust HP, abilities)
  - Create custom creatures
  - Creature templates (advanced, elite, weak)

- **Loot Tables**
  - Automatic treasure generation
  - Level-appropriate loot rules
  - Special item allocation
  - Consumable distribution

#### Rules Reference
- **Searchable Rules Engine**
  - Full PF2e core rulebook text
  - FAQ section
  - Common modifiers lookup
  - Skill DC table
  - Condition descriptions

- **Action Reference**
  - All 3-action system actions
  - Spell database with full text
  - Feat descriptions
  - Item abilities

---

## Chat & Communication System

### In-Game Chat Window

**Features**
- Real-time messaging between players
- GM-to-party announcements
- Dice roll results display
- Action descriptions from AI narration
- System messages (initiative order, turn notices)
- Emote/action descriptions (/me syntax)

**Chat Parsing**
- Automatic `/roll` command support
- `/skill` checks with DC results
- `/cast` spell casting with effects
- Custom macros creation
- Whispers to specific players

**Message Organization**
- Tabs for different conversation types (combat, roleplay, OOC)
- Searchable history
- Highlighted important messages
- Pinned messages for reference

---

## Technical Architecture

### Backend (Express.js + TypeScript)
```
├── game/
│   ├── engine.ts (Game state management)
│   ├── rules.ts (PF2e rules implementation)combat resolution
- [x] Turn system with action tracking
- [x] Movement with terrain costs
- [ ] **Game state persistence (save/load) - CRITICAL**
- [ ] AC system and attack resolution
- [ ] Saving throw system
- [ ] Critical success/failure mechanics
- [ ] Basic damage resolution
- [ ] Encounter end conditions
- [ ] Experience tracking (basic)
- [ ] Session playable end-to-end with persistence

### Phase 2 - Weeks 3-5
**Goal**: Full PF2e combat rules implementation
- [ ] All basic actions (Stride, Strike, Cast Spell, Dodge, Item Interact, etc.)
- [ ] Multiple Attack Penalty (MAP) system
- [ ] Spell framework with sample spells
- [ ] Damage types and resistances
- [ ] Armor system with AC modifiers
- [ ] Range and cover mechanics
- [ ] Critical success/failure for all rolls
- [ ] Condition tracking with levels and durations
- [ ] Reactions framework (default 1 per round)
- [ ] Action economy modifiers (quickened status)
- [ ] Recall Knowledge actions
- [ ] Flanking bonus system

### Phase 3 - Weeks 6-9
**Goal**: Character management, progression, and party system
- [ ] Full character sheet system with all PF2e stats
- [ ] Character importer (Pathbuilder 2e, official builder)
- [ ] Skill check system with proficiency levels
- [ ] Equipment and item management
- [ ] Bulk system and carrying capacity
- [ ] Feat system with feat-based features:
    - Additional reactions from feats
    - Quickened action granting
    - Special action types
- [ ] Experience tracking and leveling system
- [ ] Healing and recovery mechanics
- [ ] Party management (4-6 characters)
- [ ] Campaign persistence across sessions
- [ ] Character progression tracking
- [ ] Conditions with levels and durations
### Frontend (React + Vite)
```
├── components/
│   ├── BattleGrid.tsx
│   ├── CombatInterface.tsx
│   ├── ActionPanel.tsx
│   ├── CharacterSheet.tsx
│   ├── ChatWindow.tsx
│   ├── DiceRoller.tsx
│   └── MapEditor.tsx
├── hooks/
│   ├── useCombat.ts
│   ├── useCharacter.ts
│   └── useChat.ts
├── utils/
│   ├── movement.ts
│   ├── rules.ts
│   └── dice.ts
└── pages/
    ├── GamePage.tsx
    ├── CharacterPage.tsx
    └── CampaignPage.tsx
```

### Shared Module
```
├── types.ts (TypeScript interfaces)
├── movement.ts (Pathfinding & costs)
├── rules.ts (Shared rule constants)
└── dice.ts (Dice roll utilities)
```

---

## Development Roadmap

### Phase 1 (MVP) - Weeks 1-2
**Goal**: Functional turn-based tactical grid with basic actions
- [x] Turn system with action tracking
- [x] Movement with terrain costs
- [ ] Strike action mechanics
- [ ] Dodge/damage resolution
- [ ] Session playable end-to-end

### Phase 2 - Weeks 3-4
**Goal**: Full action & spell system per PF2e rules
- [ ] All basic actions (Stride, Strike, Cast Spell, Dodge, etc.)
- [ ] Spell framework with sample spells
- [ ] Armored creature support
- [ ] Condition tracking system

### Phase 3 - Weeks 5-7
**Goal**: Character management and creation
- [ ] AC system works: armor + mods vs d20 + attack bonus
- [ ] Attack hits/misses/crits correctly
- [ ] Saving throws resolve correctly
- [ ] Damage is calculated with resistances
- [ ] Movement calculation is correct including terrain
- [ ] Turn order is managed automatically
- [ ] Encounters end with victory/defeat detection
- [ ] Game state persists (can save and load)
- [ ] Player can resume mid-combat after reload
- [ ] Experience is awarded on encounter completion
- [ ] Game can be played end-to-end with persistence

### Phase 2 Success
- [ ] Strike action with modifiers and MAP works correctly
- [ ] All basic actions available and functional
- [ ] Spell system framework is extensible with ≥5 spells
- [ ] Saving throws required by spells resolve correctly
- [ ] Critical successes deal double damage
- [ ] Conditions persist with levels and durations
- [ ] Conditions affect gameplay (frightened reduces hit bonus, stunned loses actions, etc.)
- [ ] Damage types and resistances work correctly
- [ ] Armor and cover provide AC bonuses
- [ ] Reactions framework is in place with 1 reaction/round default
- [ ] Quickened status grants extra actions
- [ ] Flanking mechanics grant +2 to hit

### Phase 3 Success
- [ ] Character sheet displays all necessary information from PF2e ruleset
- [ ] Pathbuilder 2e character importer works and imports all stats correctly
- [ ] Skills and ability modifiers calculate with proficiency levels
- [ ] Equipment system tracks armor, weapons, shields, and items
- [ ] Bulk system calculates encumbrance and movement penalties
- [ ] Characters can be created and saved
- [ ] Party management allows 4-6 characters per campaign
- [ ] Campaign persistence across multiple combat sessions
- [ ] Experience tracking and leveling system works
- [ ] Characters level up and gain feats automatically
- [ ] Feat-based features work (extra reactions, quickened actions)
- [ ] Healing spells and medicine skill healing restore HP
- [ ] Conditions state is tracked with levels and durations
- [ ] Terrain customization
- [ ] Dungeon generation
- [ ] Map library

### Phase 6 - Weeks 13-14
**Goal**: Visual enhancements and polish
- [ ] 3D dice roller
- [ ] Token customization
- [ ] UI/UX refinement
- [ ] Sound effects and animations

### Phase 7 - Weeks 15+
**Goal**: Extended content and campaign tools
- [ ] Bestiary system
- [ ] Loot table generation
- [ ] Campaign/session tracking
- [ ] Plot and tension trackers

---

## Technology Stack

### Frontend
- **React 18.2** - UI framework
- **Vite 5.x** - Build tool and dev server
- **TypeScript 5.3** - Type safety
- **CSS3** - Styling (dark theme)
- **Axios** - HTTP client

### Backend
- **Node.js 20+** - Runtime
- **Express 4.18** - Web framework
- **TypeScript 5.3** - Type safety
- **OpenAI API** (optional) - AI Game Master

### DevOps
- **Git/GitHub** - Version control
- **npm** - Package management
- **Docker** (future) - Containerization

---

## Feature Priorities by User Type

### For Game Masters
- Priority 1: Rules adjudication, encounter building, NPC management
- Priority 2: Map creation, loot generation, creature management
- Priority 3: Plot tracking, tension tracking, story tools

### For Players
- Priority 1: Character sheet, turn-based actions, clear feedback
- Priority 2: Skill checks, spell casting, equipment management
- Priority 3: Customization, character progression, story immersion

### For Everyone
- Priority 1: Combat clarity, rule clarity, smooth turns
- Priority 2: Visual polish, animations, satisfying feedback
- Priority 3: Community content, shared maps, custom campaigns

---

## Success Criteria

### Phase 1 Success
- [ ] Full turn can be completed: select action → confirm → resolve
- [ ] At least 2 creatures can fight on a grid
- [ ] Movement calculation is correct including terrain
- [ ] Turn order is managed automatically
- [ ] Game can be played end-to-end

### Phase 2 Success
- [ ] Strike action with modifiers works correctly
- [ ] Spell system framework is extensible
- [ ] Conditions persist and affect gameplay
- [ ] At least 5 different actions are available

### Phase 3 Success
- [ ] Character sheet displays all necessary information
- [ ] At least one character importer works
- [ ] Skills and ability modifiers calculate correctly
- [ ] Characters can be created and saved

### Phase 4 Success (if AI is prioritized)
- [ ] AI can narrate combat actions
- [ ] AI can answer PF2e rules questions
- [ ] AI can generate NPC dialogue
- [ ] Narration enhances rather than detracts from gameplay

---

## Known Limitations & Future Considerations

### Current Limitations
- Single grid-based combat only (no theater of mind)
- No multi-floor dungeons yet
- No persistent campaign save system
- No multiplayer sync (only same-device play)
- No sound system yet

### Future Considerations
- WebSocket support for remote play
- Database persistence (PostgreSQL/MongoDB)
- User authentication and accounts
- Campaign cloud storage
- Mobile app version
- VTT integration (plug-in compatibility)
- Accessibility improvements (screen reader support)

---

## Contributing to This Vision

This document serves as a north star for development. As features are completed, this document will be updated to reflect current state. New ideas can be added to the appropriate phase or as new phases.

**Quick Links:**
- [Issue Tracker](./issues)
- [Development Notes](./DEVELOPMENT.md)
- [API Documentation](./API.md)
- [Component Documentation](./COMPONENTS.md)

---

**Last Updated**: February 8, 2026  
**Current Phase**: MVP (Phase 1) - In Progress  
**Lead Developer**: You  
**Project Status**: Early Development
