# AI GM Development Plan

## Project Vision
Build a fully autonomous AI Game Master for a **solo PF2e campaign experience** spanning all three gameplay modes — **Encounter, Exploration, and Downtime**. The AI GM narrates, runs NPCs (including AI party companions), designs encounters, manages plot threads, tracks an evolving world with consequences, and adapts to player choices. Designed to run locally on consumer hardware with cloud fallback during development.

**Player context**: Single player controlling one or more characters, with optional AI-controlled party companions. PF2e's tactical depth is preserved — no fudging, no safety nets. If you lose, you learn.

---

## Core Design Principles

These principles must be followed throughout ALL phases of development.

### 1. The AI Narrates, the Rules Engine Judges
The AI NEVER directly modifies game state, rolls dice, calculates damage, or applies conditions. It expresses *intent* ("I want to Strike the wizard with my greatsword") and the existing `RulesEngine` validates and resolves everything mechanically. This prevents hallucinated rules and keeps the game accurate.

### 2. Token Efficiency is Everything
Every byte sent to the AI costs context window space. On a local model, context may be as small as 4K-8K tokens. All game state must be **compressed** before being sent to the AI. Raw JSON objects are forbidden in AI prompts — use dense natural-language summaries instead.

**Target budgets per AI call:**
- Combat narration: ~1K tokens input, ~200 tokens output
- Tactical decision: ~2K tokens input, ~300 tokens output
- Story/dialogue: ~3K tokens input, ~500 tokens output
- Encounter design: ~2K tokens input, ~800 tokens output
- Exploration scene: ~2K tokens input, ~500 tokens output
- Downtime resolution: ~1K tokens input, ~300 tokens output

### 3. Provider-Agnostic LLM Layer
The `LLMService` abstracts all model interaction behind a single interface. Swapping between cloud (OpenAI, Claude, etc.) and local (Ollama, llama.cpp) must require ZERO code changes outside configuration. All AI services call `LLMService`, never a provider directly.

```typescript
// CORRECT — provider-agnostic
const response = await llmService.complete(prompt, options);

// FORBIDDEN — provider-specific calls in service code
const response = await openai.chat.completions.create(...);
```

### 4. Constrained Output (Grammar/Schema Enforcement)
All AI responses must conform to predefined JSON schemas. On local models, use GBNF grammars to physically prevent invalid output. On cloud APIs, use structured output / function calling. Never trust the AI to produce valid JSON on its own — always constrain it.

### 5. KV Cache-Aware Prompt Structure
System prompts (role instructions, rules reference) go FIRST and stay static across calls. Dynamic content (current game state) goes LAST. This allows local models to cache the static prefix and skip re-processing it, giving 50-80% speed improvements on repeated calls.

```
[STATIC — cached between calls]
System: You are the Narrator for a PF2e game...
Rules reference: <retrieved RAG chunk>

[DYNAMIC — changes each call]  
Current state: Korra (Fighter 5) just crit the goblin chief...
```

### 6. Role Specialization Over Monolithic Prompts
Never build one "do everything" GM prompt. Split into specialized roles (Narrator, Tactician, StoryWeaver, EncounterDesigner, ExplorationGM, etc.), each with a tiny focused context. A 7B model with 1K tokens of focused context outperforms a 70B model with 8K tokens of unfocused context.

### 7. Retrieval Over Training (RAG, Not Fine-Tuning)
PF2e knowledge comes from indexed `shared/*.md` files retrieved on demand — NOT from fine-tuning the model. This means:
- Rules are always accurate and up-to-date
- You can add new content by dropping in a markdown file
- No expensive/fragile training pipeline
- Works with any base model

### 8. Graceful Degradation
If the AI service is slow, unavailable, or returns nonsense:
- **Tactical decisions** fall back to the existing `TacticalAI` (already built)
- **Narration** falls back to template-based descriptions ("Korra strikes the goblin for 15 damage")
- **Story** pauses gracefully ("The GM is thinking...")
- Time budgets enforce this: if no response in N seconds, use fallback

### 9. Event-Driven, Not Polling
The AI GM reacts to typed game events (`CriticalHit`, `CreatureDown`, `SpellCast`, `RoomEntered`, `TrapTriggered`, `SkillCheckResult`), not by polling game state. This enables reactive narration and ensures the AI only processes when something actually happens. Mechanical results and narrative stream are separate channels — mechanics resolve instantly, narration streams in parallel.

### 10. Conversation Summarization
Chat history and session context must be automatically summarized when approaching the context budget limit (~60% of window). Old messages compress into summary paragraphs. The AI never sees raw history longer than the budget allows.

### 11. No Fudging — Fair Tactical Play
PF2e is a tactical game. The AI GM does NOT dynamically adjust difficulty mid-encounter, fudge dice, add/remove HP, or save the player from bad decisions. If you lose a fight, the answer is to play better next time. Encounter difficulty is set *before* combat begins and stays fixed. The challenge is real or it's not worth playing.

### 12. Information Asymmetry via Recall Knowledge
The AI GM knows everything, but only reveals what characters *earn the right to know*. When encountering creatures, the GM **automatically and secretly** rolls Recall Knowledge checks for **every party member** with a relevant skill (Arcana, Nature, Religion, Occultism, Society) against the creature's DC (based on level and rarity). Degree of success determines how much detail narration includes:
- **Critical Success**: Full tactical info — weaknesses, resistances, signature abilities
- **Success**: General description — creature type, notable features, basic threat level
- **Failure**: Vague description — size, general shape, demeanor
- **Critical Failure**: Possibly misleading information

**Visibility**: Rolls are hidden by default — the player only sees the quality of information revealed ("You recognize this creature well..." vs "You can't quite place what this is..."). A system setting allows showing the hidden rolls for players who want to see the dice. Each character gets their own narration based on their individual result.

This applies to creatures, hazards, magic items, and lore. Characters with relevant skills/lores should naturally learn more.

### 13. Consequence Engine — Choices Ripple Forward
Player decisions have lasting effects. Spare the bandit → he appears 3 sessions later (ally or enemy depending on context). Burn the bridge → travel route changes. Ignore the plague rumor → it spreads. The AI GM tracks pending consequences and weaves them into future content. This is NOT just flavor — consequences affect encounters, NPC availability, plot branches, and world state.

### 14. All Three Gameplay Modes Are Equal
The game is not just combat. **Exploration** (travel, investigation, dungeon crawling, social encounters) and **Downtime** (crafting, earning income, retraining, shopping, NPC relationships) are first-class systems, not afterthoughts. The AI GM must manage transitions between modes naturally and give each mode appropriate depth and pacing.

### 15. Tension-Driven Campaign Arc
The tension tracker is a core pacing mechanic that **drives world events rather than responding to them**. Tension is primarily driven by **in-game time passing** — the world doesn't wait for the player. As tension rises, the AI GM escalates: harder encounters, more plot pressure, time-sensitive objectives, BBEG influence increases, fewer opportunities to rest safely.

**Nested Arc Structure** (like a TV show):
- **Campaign Arc**: Overall tension across the entire campaign. Starts low, builds to final confrontation
- **Act Arcs** (Act 1, Act 2, etc.): Each major story act has its own tension curve within the campaign arc
- **Episode Arcs**: Individual sessions/adventures have mini-tension curves even within an act

Think of it like a TV series: the show gets more dangerous over seasons (campaign), each season has its own rising/falling tension (act), and individual episodes have their own mini-climaxes (episode). After slaying a major enemy or completing a story arc, tension drops considerably — the player feels less pressure, fights get easier, side quests open up. Then it builds again.

**Tension affects:**
- Encounter difficulty (higher tension → harder XP budgets)
- World events (army attacks at critical tension, not randomly)
- Time pressure on objectives (low tension = explore freely, high tension = the clock is ticking)
- NPC urgency and availability
- Rest/downtime availability (hard to rest when the city is under siege)
- Random encounter frequency and severity

**Tension does NOT directly dictate**: narration mood. A tense moment (army attacking) should feel tense because of *what's happening*, not because the AI was told to sound dramatic. The events themselves create the mood.

**Player visibility**: The tension value is hidden. The player feels it through the game's pacing, not through a number on screen.

### 16. Anti-Repetition & Narrative Momentum
The AI must not repeat itself. Track recently used vocabulary, descriptions, and narrative beats. Vary combat narration, NPC dialogue, and scene descriptions. The AI is the primary storyteller — it should push content forward, advance plot threads, develop NPC relationships, and create memorable moments. Don't describe another "dimly lit tavern" — make every location feel distinct.

### 17. Natural Language Action Input
Players can type natural language instead of (or alongside) clicking mechanical buttons. The rules engine still validates everything — the AI just translates intent.

**Progressive scope** (build minimal, design for ambitious):
- **Phase A (Launch)**: Simple action parsing — "attack goblin with sword" → Strike action. Single actions, explicit targets
- **Phase B**: Multi-action sequences — "feint then strike" → Feint + Strike. Two-action combos, implicit target resolution
- **Phase C (Goal)**: Complex intent with improvisation — "knock over the barrels as a distraction while my companion sneaks behind them" → multi-character coordination with improvised actions, environmental interaction, and creative problem-solving

The architecture must support Phase C from day one (intent → structured action plan → rules validation), even if the parser only handles Phase A initially.

### 18. NPC Voice & Personality Persistence
Every named NPC has a personality card that defines their speech patterns, mannerisms, goals, fears, and relationship to the player. The gruff dwarf always sounds gruff. The nervous scholar always stutters. AI party companions have significantly richer personality profiles — personal goals, combat preferences, relationship dynamics with the player and each other, character growth arcs.

### 19. Rule Citation (Toggleable)
When enabled, the AI GM cites which rules govern mechanical effects. "Korra's Reactive Strike triggers (Fighter feature, Player Core p.XXX)." Helps players learn PF2e rules. Off by default — toggled when the player wants to learn or verify rulings.

---

## Campaign Setting

### Golarion (Inner Sea)
The default campaign setting is **Golarion** — Paizo's official PF2e setting. This means:
- The RAG knowledge base indexes Golarion lore: nations (Absalom, Cheliax, Varisia, etc.), deities (Pharasma, Sarenrae, etc.), factions (Pathfinder Society, Hellknights, etc.), major NPCs, historical events
- Geographic data is based on published Inner Sea maps — the AI knows where cities are relative to each other, travel times, terrain types, political boundaries
- Creatures, cultures, and languages respect established lore
- Published free Golarion wiki content to be indexed alongside `shared/*.md` files
- Custom/homebrew regions can be layered on top of the existing Golarion framework

### Campaign Generation
The AI generates entire campaigns from scratch based on player prompts during **Session Zero**. The player provides:
- Character(s) and backstory
- Starting level and preferred ending level range
- Tone preferences (gritty, heroic, political intrigue, dungeon-focused, etc.)
- Campaign hooks or themes ("I want a story about preventing a dragon war" or "surprise me")
- Loot level preference (standard / high)
- Party composition (solo, player + AI companions, multiple player characters)

The AI then generates:
- Overarching campaign plot with BBEG, major factions, and central conflict
- Act structure with tension arcs
- Starting location, opening hook, first few planned encounters
- Key NPCs with personality cards
- Initial geographic context (region map data, nearby points of interest)
- First adventure arc ready to play

Subsequent content is generated on-demand as the campaign progresses, adapting to player choices.

### Custom Creature Design
The AI can design custom creatures (especially BBEGs and lieutenants) using PF2e's creature building rules (Gamemastery Guide):
- Stat blocks constrained by level-appropriate formulae (HP ranges, attack bonuses, DCs, damage)
- The AI picks thematic abilities and narrative flavor
- The rules engine enforces the mathematical constraints
- Creature building rules indexed via RAG
- Custom creatures get personality cards like any NPC

---

## Gameplay Systems

### Encounter Mode (Combat)
The existing combat system. AI GM handles:
- NPC tactical decisions influenced by personality (coward retreats, fanatic fights to death)
- Combat narration reactive to events (crits feel epic, near-deaths feel tense)
- Trap and hazard deployment and management (PF2e mechanical traps/hazards)
- Speculative pre-generation of narrative branches during player turns (local models only — too costly for cloud per-call billing)
- Async narration: mechanical results resolve instantly, flavor text streams in parallel

### Exploration Mode
What happens between fights. AI GM handles:
- **Scene Description**: Room/area descriptions when entering new locations. Detail scales with character perception and relevant skills
- **Travel & Navigation**: Overland travel with encounters, weather, terrain hazards. Uses world/region maps for geographic awareness
- **Investigation**: Searching rooms, examining objects, finding clues. Driven by Perception, skill checks, and character abilities
- **Social Encounters**: NPC conversations, negotiations, information gathering. Driven by Diplomacy, Deception, Intimidation, etc.
- **Dungeon Crawling**: Room-by-room exploration with trap detection, secret doors, environmental storytelling
- **Skill Challenges**: Structured non-combat encounters — chase scenes, heists, puzzles, negotiations. Multiple skill checks with branching outcomes based on successes/failures

### Downtime Mode
The connective tissue of a campaign. AI GM handles:
- **Crafting**: Follow PF2e crafting rules with AI narration of the process
- **Earn Income**: Skill-based income generation with narrative flavor
- **Retraining**: Swapping feats, skills, etc. per PF2e retraining rules
- **Shopping & Markets**: Browse available items (level-appropriate), haggle with merchants (who are NPCs with personality)
- **NPC Relationships**: Deepen relationships with companions, allies, contacts during downtime
- **Personal Quests**: AI-generated side activities based on character backstory and current plot hooks
- **Rest & Recovery**: Managing daily preparations, long-term healing, removing persistent conditions
- **Information Gathering**: Hear rumors, research in libraries, consult sages — feeds into exploration/encounter planning

### Between-Mode Transitions
The AI GM manages flow between modes naturally:
- Combat ends → "The dust settles..." → Exploration (loot, investigate, move on)
- Exploration discovers threat → "You hear growling ahead..." → Encounter
- Arrive in town → "The gates open before you..." → Downtime available
- Downtime event triggers → "A messenger bursts in..." → Exploration or Encounter
- In-game clock advances during all modes (see Time Tracking)

---

## World Systems

### In-Game Time Tracking
The game maintains a persistent in-game clock (date, time of day, season). This is separate from real-world time. Time advances:
- **Encounter**: Rounds (6 seconds each)
- **Exploration**: Minutes/hours (travel time, investigation time)
- **Downtime**: Days/weeks (crafting, earning income, retraining)

Time matters because:
- Daily preparations (spell slots, focus points) reset at dawn
- Buff durations expire
- Overland travel takes real in-game time
- Plot events have deadlines (tension-driven time pressure)
- NPCs have schedules and plans that advance with time
- Seasons/weather affect travel and encounters

### Treasure & Loot Economy
Loot is level-appropriate and story-relevant, following PF2e wealth-by-level guidelines:
- Total character wealth tracks roughly to the PF2e average for level (slightly below early on, slightly above near level-up)
- Loot is distributed through play — quest rewards, enemy drops, treasure hoards, purchased items — NOT handed out arbitrarily
- High-loot campaigns supported as a toggleable setting, but even then, progression feels earned
- Powerful items are rare, narratively significant, and often quest rewards — the AI does NOT inflate the economy just because the player enjoys getting loot
- Consumables (potions, scrolls, talismans) are more common than permanent items
- Shop inventories are level-appropriate and location-appropriate (a frontier village doesn't sell +2 striking runes)

### Maps & Geography
The AI GM has access to and understands geographic context at multiple scales:
- **World Map**: Golarion / Inner Sea region. Based on published free maps. Stored as **structured geographic data** (graph of locations, connections, distances, terrain types) — the AI works with the data, a separate rendering layer draws it
- **Region Map**: Provinces, cities, roads, wilderness areas, points of interest. Can be AI-generated for custom/dynamic regions (e.g., Kingmaker-style territory that changes based on player actions). Mutable data, re-rendered on change
- **City Map**: Districts, key buildings, NPCs tied to locations, shops, quest hubs. AI-generated based on settlement size and region context
- **Dungeon/Encounter Map**: Tactical grid for combat — imported from Foundry VTT (existing system). These are pre-made visual maps, not AI-generated

**Map data format**: Geographic data is stored as a graph (nodes = locations, edges = connections with distance/terrain/travel time). NOT as images the AI interprets. The AI reads structured data; the frontend renders visuals. This means:
- AI can reason about travel routes, distances, and geographic relationships efficiently
- Maps can be modified by game events (bridge destroyed → edge removed, new settlement → node added)
- Published Golarion geography provides the initial template
- AI can generate new regions/cities by creating new graph nodes within the existing framework

The AI uses map knowledge for:
- Coherent travel narration ("You follow the King's Road east toward Absalom...")
- Geographically appropriate encounters (desert creatures in deserts, not forests)
- NPC knowledge of their surroundings ("The old mine? North of the river, past the dead oak.")
- Plot that respects geography (distant threats take time to reach)
- Dynamic world events that happen in specific locations
- Kingmaker-style territory management (territory changes reflected in map data)

### Trap & Hazard System
PF2e traps and hazards are mechanical creatures in their own right. The AI GM:
- Deploys traps/hazards appropriate to the environment and encounter design
- Runs trap mechanics through the rules engine (Perception to detect, Thievery to disable, saves to resist)
- Narrates trap triggers dramatically
- Supports both simple hazards (trigger once) and complex hazards (act in initiative)
- Environmental hazards: collapsing floors, flooding rooms, spreading fire

---

## Party & Companion System

### Solo Player, Flexible Party
The player controls one or more characters directly. Party size is configurable, and encounter difficulty auto-adjusts based on party count using PF2e's encounter building rules.

### AI Party Companions (Long-Term Goal)
Optional AI-controlled party members who fight alongside the player:
- **Rich Personality Profiles**: Far more detailed than typical NPCs — personal goals, fears, moral lines, combat preferences, humor style, speech patterns
- **Relationship Dynamics**: Opinions of the player and each other that evolve over time. May disagree, argue, or refuse certain actions based on personality
- **Character Arcs**: Personal quests and growth arcs that interweave with the main plot
- **Tactical Autonomy**: Make their own combat decisions based on personality + TacticianAI (the cautious cleric heals proactively, the reckless barbarian overextends)
- **Dialogue & Banter**: Speak up during exploration and downtime, react to events, have conversations with the player and each other
- **Player Override**: Player can suggest or command companion actions, but companions may push back if it conflicts with their personality ("I won't abandon the prisoners.")

---

## Hardware Strategy

### Current Hardware (Development Phase)
- **Machine 1**: ASUS Vivobook M1502YA, AMD Ryzen 7 7730U, AMD Radeon integrated graphics, 16GB RAM
- **Machine 2**: (Gaming machine — discrete GPU specs TBD)
- **Status**: No discrete GPU suitable for local LLM inference on either current machine

### Development Approach
Use **cloud APIs** (OpenAI/Claude) during development and testing phases. The provider-agnostic `LLMService` (Principle #3) ensures zero-effort migration to local models later. Speculative pre-generation disabled during cloud phase to control costs.

### Model Landscape (Updated March 2026)
Notable models available via Ollama — landscape has shifted significantly toward efficient smaller models:

| Model | Params | VRAM (Q4) | Highlights |
|-------|--------|-----------|------------|
| **Nemotron-Mini** | 4B | ~4GB | NVIDIA. **Optimized for roleplay, RAG, and function calling** — near purpose-built for our use case |
| **Gemma 3n** | e2b/e4b | Very low | Google. Designed for **edge/everyday devices** — could run on current laptops for light roles |
| **Gemma 3** | 4B-27B | 4-18GB | Google. "Most capable model on single GPU." 12B strong middle ground |
| **Qwen3.5** | 0.8B-122B | Varies | Alibaba. Brand new. Vision + tools + thinking. 9B/27B are sweet spots |
| **Qwen3** | 0.6B-235B | Varies | Strong tool calling + thinking mode. 8B/14B good for structured output |
| **DeepSeek-R1** | 1.5B-671B | Varies | Reasoning-focused. 7B/8B distilled versions strong at structured decisions |
| **Mistral Small 3.2** | 24B | ~16GB | Vision + tools. Strong overall quality |
| **Phi-4** | 14B | ~10GB | Microsoft. Strong reasoning for its size |
| **GPT-OSS** | 20B/120B | 16GB+ | OpenAI open-weight. Tools + thinking mode |
| **Cogito** | 3B-70B | Varies | MIT license. Outperforms equivalents across benchmarks |

### Future Hardware Targets
When desktop/server is ready:

| VRAM | Recommended Models | Context | Quality |
|------|-------------------|---------|---------|
| 8GB | Gemma 3 4B / Qwen3 8B / Nemotron-Mini 4B | 8-32K | Decent narration, structured tactics |
| 12GB | Gemma 3 12B / Phi-4 14B / Qwen3 14B | 16-32K | Good reasoning, longer context |
| 16GB | Mistral Small 3.2 24B / Qwen3.5 27B / Gemma 3 27B | 32-128K | Strong GM quality (recommended target) |
| 24GB+ | Qwen3.5 35B / Llama 3 70B Q4 / GPT-OSS 120B Q2 | 16-128K | Near cloud-level quality |

**Recommended minimum target**: 16GB VRAM GPU (e.g., RTX 4060 Ti 16GB, RTX 3090, or RTX 4080) for the 22-27B model sweet spot.

### Multi-Model Routing (Future)
Different AI roles can use different models simultaneously for optimal speed/quality tradeoffs:
- **Narrator** (fast, creative) → Small model (4-8B), 1-2s responses
- **Tactician** (structured, fast) → Small model (4-8B) + grammar constraints
- **StoryWeaver** (smart, can be slower) → Large model (22-27B), 3-5s responses
- **EncounterDesigner** (thorough, offline) → Large model, no time pressure
- **Exploration GM** (descriptive, moderate) → Medium model (12-14B), 2-3s responses

Note: Multi-model routing works seamlessly because each role makes independent `LLMService` calls — models don't need to be the same to work together.

---

## Migration Strategy

### Existing AI Code: Replace, Don't Maintain
The existing `GMChatbot`, `AIManager`, and `TacticalAI` have significant problems and will be **replaced outright** as new systems are built — not maintained in parallel. The local `TacticalAI` is the only component worth preserving as a fallback during transition.

**Replacement order:**
1. `TacticalAI` → kept as fallback, gradually replaced by Phase 5 TacticianAI
2. `AIManager` → replaced by Phase 4 LLMService + Phase 6 Coordinator
3. `GMChatbot` → replaced by Phase 5 StoryAI + NarratorAI

### Expanded Bestiary & Token Art
The current bestiary has ~100+ creatures imported from Foundry. This needs significant expansion:
- More creatures across all level ranges
- Complete stat blocks (currently missing skill proficiencies and spell lists on some)
- Expanded token/art library for visual representation in-game
- Custom creature support (see Campaign Setting > Custom Creature Design)
- This is an ongoing content expansion, not a blocking phase — creatures can be added incrementally

---

## Verified Progress Update

Verified against the current codebase on March 31, 2026.

### Phase Status Summary
- **Phase 1**: Implemented for current systems. The typed `GameEventBus` now covers combat, exploration, downtime, and world events used by the current app, with SSE streaming to the frontend and a live dashboard consumer.
- **Phase 2**: Implemented. `ContextCompiler` exists with seven compression profiles and anti-repetition hints.
- **Phase 3**: Implemented. `KnowledgeBase` exists with flat-file TF-IDF retrieval and disk caching.
- **Phase 4**: Implemented. Provider-agnostic `LLMService` plus cloud, Ollama, and llama.cpp providers are present.
- **Phase 5**: Implemented. `NarratorAI`, `TacticianAI`, `StoryAI`, `ExplorationAI`, `DowntimeAI`, and `EncounterAI` are present.
- **Phase 6**: Implemented. `AIGMCoordinator`, `GameClock`, `ConsequenceScheduler`, and `NLParser` are wired in.
- **Phase 7**: Implemented. Persistent world memory, session summarization, NPC tracking, plot tracking, and character knowledge tracking are present.
- **Phase 8**: Implemented. Session Zero generation, encounter/adventure generation, NPC generation, creature building, and treasure generation are present.
- **Phase 9**: Core campaign UI is implemented, but not every item in the original phase scope is done yet.
- **Phase 10**: Not started.

### Verified Recent Progress
- Added Session Zero flow, encounter preview, downtime menu, and campaign dashboard frontend flows.
- Added runtime GM settings for companion AI mode, narration verbosity, loot level, and rule citations.
- Added companion and NPC panel UI, map browser access from the dashboard, tension sparkline, refresh controls, and safer campaign-state refresh after combat.
- Fixed encounter preview state mutation, XP/world-state `NaN` edge cases, and empty downtime activity results.
- Added API timeouts and debounced encounter preview refreshes.
- Completed the missing EventBus work for the current feature set: richer event taxonomy, combat delta emission, exploration/downtime/world route events, SSE transport, and frontend live event feed consumption.

### Current Verified Gaps
- Some planned future event families are now defined in the shared event model but still depend on gameplay systems that are not built yet, such as trap detection, secret discovery, and richer structured skill-challenge outcomes.
- Environmental hazards, broad feat/class completion, and bestiary completeness remain open.
- Phase 9 still has planned items beyond the implemented subset, especially dedicated realtime narrative streaming and broader settings UX.

---

## Comprehensive Missing Features Audit

Full codebase audit performed March 31, 2026. Every item below is either completely missing or partially stubbed in the current implementation.

### Priority Legend
- 🔴 **CRITICAL** — Blocks core gameplay or violates a design principle
- 🟡 **HIGH** — Significant gap in the player experience
- 🟢 **MEDIUM** — Important for polish and depth, not blocking
- ⚪ **LOW** — Nice-to-have, can be deferred indefinitely

---

### A. Rules Engine — Combat Mechanics

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| A1 | **Recall Knowledge** | ✅ 100% — IMPLEMENTED | 🔴 CRITICAL | Full implementation: creature-type-to-skill mapping (16 types), level-based DC table, +5 DC per repeated attempt, tiered info reveal (weaknesses/resistances/immunities/saves), false info on crit fail |
| A2 | **Environmental Hazards & Traps** | ✅ 100% — IMPLEMENTED | 🔴 CRITICAL | resolveHazard (simple/complex), resolveDisableTrap (Thievery/Arcana/skill), processHazardTurn (per-round effects), triggerTrap (stealth DC detection). Supports haunt/mechanical/environmental types |
| A3 | **Delay & Ready Actions** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | Delay: stores original initiative, prevents reactions. Ready: 2-action cost, validates single actions, stores readied action as condition |
| A4 | **Cover Degrees** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | Lesser (+1), Standard (+2), Greater (+4). Take Cover upgrades standard→greater. Hunker down (prone) grants greater cover vs ranged. applyLesserCover() public method |
| A5 | **Persistent Damage Flat Checks** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | DC 15 flat check after damage. Assisted recovery (DC 10) flag support. Fixed permanent duration handling |
| A6 | **AoE Wall/LOS Blocking** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | Bresenham line-trace LOS through terrain grid. isWallCell supports terrain strings/numbers/objects + explicit walls array. Integrated into Fireball, Burning Hands, Lightning Bolt |
| A7 | **Selective AoE Targeting** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | applySelectiveFiltering: explicit excludeIds + automatic Selective metamagic feat (exclude allies = spellcasting mod). Integrated into Fireball, Burning Hands, Lightning Bolt |
| A8 | **Quickened Action Restriction** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | 4th action (quickened) restricted to Strike/Stride only. Enforced in resolveAction validation layer |
| A9 | **Squeeze Mechanics** | ❌ Missing | ⚪ LOW | Moving through spaces occupied by larger creatures or tight spaces |
| A10 | **Greater Difficult Terrain** | ✅ Implemented | ✅ DONE | 3x movement cost for greater difficult terrain tiles, 4x when prone. Both movement systems updated. |

### B. Rules Engine — Non-Combat Mechanics

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| B1 | **Daily Preparations** | ✅ 100% — IMPLEMENTED | 🔴 CRITICAL | resolveLongTermRest: heals to full HP, restores spell slots & focus points, reduces drained/doomed by 1, removes wounded/fatigued/dying, resets hero points to 1 |
| B2 | **Refocus Action** | ✅ 100% — IMPLEMENTED | 🔴 CRITICAL | resolveRefocus: recovers 1 focus point up to maxFocusPoints. Plus resolveTreatWounds with DC scaling by proficiency |
| B3 | **Prepared vs Spontaneous Casting** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | canCastAndConsumeSlot rewritten: prepared casters consume exact-rank slots. Spontaneous casters consume highest available slot ≥ spell rank. Validates against spellcasting.type |
| B4 | **Signature Spells** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | Integrated into canCastAndConsumeSlot: signature spells can be freely heightened to any rank the sorcerer has slots for. Checks spellcasting.signatureSpells array |
| B5 | **Consumable Items** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | resolveInteract: potions (healing formula), elixirs (condition buff), antidotes/antiplague (save bonus), scrolls (spell delegation), generic consumables. Uses _consumables array |
| B6 | **Magic Item Activation** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | resolveInvestItem (max 10/day), resolveActivateItem (Command/Envision/Interact/Cast types), heal/damage/buff/utility effects, consumable destruction, daily use limits, resetDailyItemInvestments |
| B7 | **Hero Point Regeneration** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | awardHeroPoint() for GM awards (max 3), sessionStartHeroPoints() for session-start grants. Reason tracking |
| B8 | **Light Level Spectrum** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | getLightLevelAt (bright/dim/dark/magical-darkness), getVisibilityCondition (normal/low-light/darkvision), resolveEquipLightSource (torch/lantern/candle/sunrod), resolveCreateLightZone, ambient light + creature light sources |
| B9 | **Stealth Initiative & Surprise** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | rollInitiative enhanced: _stealthInitiative flag uses Stealth bonus instead of Perception. Hidden creature starts with hidden/undetected condition automatically |
| B10 | **Skill Challenges (Structured)** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | startSkillChallenge (chase/infiltration/research/negotiation/custom), resolveSkillChallengeCheck with crit-success=2, proper DC checks, progress tracking, success/failure thresholds |

### C. Class Features & Feats

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| C1 | **Stubbed Feat Implementations** | ⚠️ ~685 of ~1000 feats unimplemented; 124+ class feats now added | 🟡 HIGH | Batch C1: Added 60+ L1-10 class feats across 10 classes. **Batch C1-L12+:** Added 37 higher-level feats (L12-20). **Ranger L12-20:** Distracting Shot, Double Prey, Impossible Flurry, Impossible Volley, Perfect Shot, Sense the Unseen. **Rogue L12-20:** Preparation, Spring from the Shadows, Defensive Roll, Instant Opening, Felling Shot, Dispelling Slice, Reactive Interference. **Monk L12-20:** Disrupt Qi, Dodging Roll, Reflexive Stance, Mountain Quake, Shattering Strike, Diamond Fists. **Swashbuckler L12-20:** Cheat Death, Mobile Finisher, Perfect Finisher, Lethal Finisher, Revitalizing Finisher. **Magus L12-20:** Overwhelming Spellstrike, Arcane Shroud, Dispelling Spellstrike, Preternatural Parry. **Thaumaturge L12-20:** Shared Warding, Sever Magic, Implement's Assault. **Oracle L12-20:** Forestall Curse, Conduit of Void and Vitality, Greater Revelation. **Sorcerer L12-20:** Bloodline Focus, Interweave Dispel, Blood Sovereignty. **Batch C1-B4:** 27 new feats across 5 classes. **Psychic:** Counter Thought, Mental Buffer, Psi Burst, Psi Strikes, Violent Unleash, Brain Drain, Emotional Surge. **Witch:** Witch's Armaments, Sympathetic Strike, Wild Witch's Armaments. **Summoner:** Energy Heart, Reinforce Eidolon, Defend Summoner, Eidolon's Opportunity, Tandem Strike. **Kineticist:** Blazing Wave, Lightning Dash, Lava Leap, Calcifying Sand, Tidal Hands, Tremor, Shard Strike. **Gunslinger:** Pistol Twirl, Warning Shot, Risky Reload, Black Powder Boost. Still ~685 feats remaining (archetype, multiclass, more class feats). |
| C2 | **Alchemist Class Mechanics** | ✅ Core implemented | 🟡 HIGH | resolveQuickAlchemy (versatile vials → temporary items), resolveQuickBomber (draw+throw in 1 action, splash on miss), setupAlchemistDailyPreparations (vials=level+INT). Mutagens/elixirs still need individual item entries |
| C3 | **Witch Hexes** | ✅ Core implemented | 🟡 HIGH | Hex cantrip (Evil Eye), focus hexes (Needle of Vengeance, Life Boost, Malicious Shadow), Cackle sustain, Phase Familiar, Patron's Puppet. One-hex-per-turn enforcement. |
| C4 | **Kineticist Impulses** | ✅ Core implemented | 🟡 HIGH | Elemental Blast (6 elements, Con-based), Channel Elements, Gather Element, Overflow Impulse router, Scorching Column, Ocean's Balm, Timber Sentinel. |
| C5 | **Summoner Eidolon Sync** | ✅ Core implemented | 🟡 HIGH | resolveActTogether (shared MAP sync, eidolon Strike), resolveBoostEidolon (+2 status damage 1 round), syncSummonerEidolonHP (shared HP pool, dying sync). Eidolon evolution feats still needed |
| C6 | **Familiar Abilities** | ✅ Backend implemented | 🟢 MEDIUM | assignFamiliarAbilities: Valet, Independent (+1 action), Flier (25ft fly), Darkvision, Scent (30ft), Cantrip Connection, Spell Delivery, Resistance (half level). Daily assignment during prep. UI selection still needed |
| C7 | **Ancestry/Heritage Feats** | ⚠️ 15% — mostly stubbed | 🟢 MEDIUM | Hereditary feats, ancestry-specific abilities. Heritage ability boosts not auto-applied |
| C8 | **General/Skill Feats** | ✅ Core 12 implemented | 🟢 MEDIUM | resolveBattleMedicine (proficiency-scaled heals, 1/target/day), resolveBonMot (-2/-3 Will via Diplomacy), resolveFeint (off-guard via Deception), resolveTumbleThrough (Acrobatics vs Reflex), resolveCreateADiversion (multi-target Deception→hidden), resolveKipUp (free stand), resolveQuickDraw (draw+Strike). Plus resolveEarnIncome, resolveCraft, resolveSubsist downtime actions |

### D. Spells & Magic

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| D1 | **Spell Coverage** | ⚠️ 66 of 500+ spells | 🟡 HIGH | 20 more spells added batch 7 (Hydraulic Push, Magic Weapon, Mystic Armor, Color Spray, Gust of Wind, Enervation, Vampiric Maiden, Calm, Resist Energy, See the Unseen, Summon Animal, Wall of Fire, Chain Lightning, Cone of Cold, Dimension Door, Fly, Invisibility, Restoration, Breathe Fire, Force Barrage) |
| D2 | **Buff/Debuff Cascading** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | applyConditionWithCascade: value-condition stacking (highest wins), same-type bonus stacking (PF2e rules). recalculateConditionEffects: clumsy→AC/Reflex, enfeebled→melee, drained→HP/Fort, stupefied→spell penalties. removeConditionWithCascade |
| D3 | **Spell Sustaining** | ✅ 100% — ALREADY IMPLEMENTED | 🟢 MEDIUM | resolveSustainSpell marks sustainedThisTurn, processEndOfTurn removes unsustained spells. External creature conditions also tracked |
| D4 | **Counteracting/Dispelling** | ✅ 100% — ALREADY IMPLEMENTED | 🟢 MEDIUM | performCounteractCheck (d20+mod vs DC, degree→rank threshold), resolveDispelMagic (removes highest-rank spell effect), resolveRemoveCurse, resolveRemoveDisease, resolveNeutralizePoison, resolveCounteractAffliction |
| D5 | **Ritual Spells** | ✅ Framework + 8 rituals | ✅ DONE | Planar Ally, Resurrect, Animate Dead, Consecrate, Teleportation Circle, Commune, Plant Growth, Awaken Animal. Skill-check based with secondary casters. |

### E. Exploration & World Systems

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| E1 | **ExplorationView Component** | ❌ 0% — no frontend component | 🔴 CRITICAL | Exploration is text-chat only. No spatial visualization, room layout, or interactive exploration grid |
| E2 | **World Geographic Graph** | ❌ 0% — locations are plain text strings | 🔴 CRITICAL | No `LocationNode` type, no edges/connections, no distance/terrain data. AI can't reason about geography coherently. Breaks Design Principle #14 |
| E3 | **World/Region Map UI** | ❌ 0% — no interactive map display | 🟡 HIGH | Geographic data exists only as NPC.location strings. Players never see where they are in the world |
| E4 | **Travel Pathfinding & Distance** | ❌ 0% | 🟡 HIGH | No route planning, terrain-adjusted travel times, or geographic distance calculation. Travel is purely narrative |
| E5 | **Location Persistence** | ❌ 0% | 🟡 HIGH | Visited areas not tracked. Returning to a location doesn't recall previous state. Dynamic map changes (bridge destroyed) not persisted |
| E6 | **Trap/Secret Interaction Mechanics** | ✅ 100% — IMPLEMENTED | 🟡 HIGH | Integrated via A2 hazard framework: resolveDisableTrap rolls Thievery/Arcana vs trap DC, triggerTrap detects via Perception vs stealth DC, per-round hazard effects via processHazardTurn |
| E7 | **Narrative Streaming (Token-by-Token)** | ⚠️ Partial — SSE events exist, no progressive text | 🟡 HIGH | SSE infrastructure built but NarratorAI output isn't streamed token-by-token to the frontend yet |
| E8 | **Exploration Activities** | ✅ 100% — IMPLEMENTED | 🟢 MEDIUM | resolveExplorationActivity: Avoid Notice, Defend, Detect Magic, Follow the Expert, Hustle, Investigate, Scout, Search, Track. Sets _explorationActivity flag + mode-specific effects |
| E9 | **Weather & Environmental Effects** | ✅ Implemented | 🟢 MEDIUM | setWeather (clear/fog/rain/storm/blizzard/sandstorm/extreme-heat/extreme-cold), applyWeatherEffects (Fort saves for temperature, concealment, difficult terrain, speed penalties). 8 weather types with visibility/movement/condition effects |
| E10 | **Dungeon Layout Persistence** | ❌ Missing | 🟢 MEDIUM | ContentGenerator creates dungeon layouts but they aren't persisted or rendered in frontend |

### F. Frontend & UI

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| F1 | **Consequence Visibility Panel** | ❌ 0% — consequences tracked backend-only | 🟡 HIGH | Players never see the ripple effects of their choices. No UI to show pending/triggered consequences |
| F2 | **Timeline/Calendar View** | ❌ 0% — GameClock exists, no UI | 🟢 MEDIUM | In-game date, time of day, season exist in backend but not displayed to player |
| F3 | **NPC Dialogue Branching UI** | ⚠️ 40% — chat works, no branches | 🟢 MEDIUM | Can talk to NPCs via GM chat but no visual dialogue tree, option selection, or skill-check branching |
| F4 | **Deeper Downtime Activity UIs** | ⚠️ Partial — activities listed, minimal narrative | 🟢 MEDIUM | Crafting workshop, market browsing, training montages lack visual depth |
| F5 | **Full AI GM Mode Toggle** | ⚠️ Settings exist, not fully wired | 🟢 MEDIUM | Full AI GM / Assisted / Manual mode selector partially implemented |
| F6 | **Companion Tactical Override** | ❌ Missing | ⚪ LOW | Player suggesting/commanding AI companion actions in combat |

### G. Backend & Infrastructure

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| G1 | **API Input Validation** | ❌ No validation on routes | 🟡 HIGH | Security gap — no schema validation on incoming request bodies. Should add before any public deployment |
| G2 | **Exploration Dedicated Routes** | ⚠️ Stubbed — ExplorationAI exists, no endpoint | 🟢 MEDIUM | Exploration handled through GM chat. Dedicated `/api/game/:gameId/gm/exploration` route would improve structure |
| G3 | **World State API** | ⚠️ Partial | 🟢 MEDIUM | Routes for clock, NPCs, quests, locations exist through world-state but not granularly exposed |
| G4 | **Multi-Session Auto-Save** | ❌ Missing | 🟢 MEDIUM | Manual checkpoints only. No incremental world snapshots or crash recovery |
| G5 | **Undo/Session Branching** | ❌ Missing | ⚪ LOW | No mid-session rewind or "what if" branching. Save scumming is the only option |

### H. Content & Data

| # | Feature | Status | Priority | Notes |
|---|---------|--------|----------|-------|
| H1 | **Bestiary Completion** | ⚠️ ~100 creatures, many missing skills/spells | 🟡 HIGH | Creatures imported from Foundry but many lack skill proficiencies, feat data, and spellcasting details |
| H2 | **Creature Level Coverage** | ⚠️ Gaps in level ranges | 🟢 MEDIUM | Some level ranges have sparse creature options for encounter design |
| H3 | **Expanded Token/Art Library** | ⚠️ Partial | 🟢 MEDIUM | ~800 creatures in bestiary but art coverage inconsistent. SVG fallback exists |
| H4 | **Golarion Lore RAG Content** | ⚠️ Partial — some lore indexed | 🟢 MEDIUM | Nations, deities, factions partially in RAG. Could be deeper for geographic/political reasoning |
| H5 | **Data-Driven Spell Definitions** | ❌ Missing | 🟡 HIGH | Spells currently require code per spell. A data-driven format (JSON/YAML) would enable bulk spell addition |

---

### Feature Priority Summary

| Priority | Count | Key Blockers |
|----------|-------|-------------|
| 🔴 CRITICAL | 3 remaining (of 8) | ~~Recall Knowledge~~ ✅, ~~Hazards~~ ✅, ~~Daily Preparations~~ ✅, ~~Refocus~~ ✅, Stubbed Feats, ExplorationView, World Graph, Exploration Backend |
| 🟡 HIGH | 3 remaining (of 20) | ~~Cover~~ ✅, ~~Delay/Ready~~ ✅, ~~Consumables~~ ✅, ~~Magic Items~~ ✅, ~~Casting Types~~ ✅, ~~Signature Spells~~ ✅, ~~Buff Cascading~~ ✅, ~~Trap Mechanics~~ ✅, ~~Alchemist~~ ✅, ~~Summoner~~ ✅, ~~Witch Hexes~~ ✅, ~~Kineticist Impulses~~ ✅, Spells, Travel, Narrative Streaming, API Validation, Bestiary |
| 🟢 MEDIUM | 1 remaining (of 14) | ~~Quickened~~ ✅, ~~Spell Sustaining~~ ✅, ~~Hero Points~~ ✅, ~~Light Levels~~ ✅, ~~Stealth Initiative~~ ✅, ~~Skill Challenges~~ ✅, ~~AoE LOS~~ ✅, ~~Selective AoE~~ ✅, ~~Exploration Activities~~ ✅, ~~Counteracting~~ ✅, ~~Weather~~ ✅, ~~Skill Feats~~ ✅, ~~Familiar~~ ✅ |
| ⚪ LOW | 1 | Squeeze |

**Recently Implemented** (Batches 1–4):
- ✅ A1: Recall Knowledge, A2: Environmental Hazards, A3: Delay & Ready, A4: Cover Degrees, A5: Persistent Damage, A6: AoE Wall/LOS, A7: Selective AoE, A8: Quickened Restriction
- ✅ B1: Daily Preparations, B2: Refocus + Treat Wounds, B3: Prepared/Spontaneous Casting, B4: Signature Spells, B5: Consumable Items, B6: Magic Item Activation, B7: Hero Point Regeneration, B8: Light Level Spectrum, B9: Stealth Initiative, B10: Skill Challenges
- ✅ D2: Buff/Debuff Cascading, D3: Spell Sustaining, D4: Counteracting/Dispelling
- ✅ E6: Trap/Secret Interaction, E8: Exploration Activities, E9: Weather & Environmental Effects
- ✅ Combat: Grapple, Escape, Disarm, Aid, Seek, Hide, Sneak
- ✅ Class Actions: Rage, Flurry of Blows, Hunt Prey, Devise a Stratagem, Spellstrike, Exploit Vulnerability
- ✅ C2: Alchemist Core (Quick Alchemy, Quick Bomber, Daily Vials), C5: Summoner Eidolon Sync (Act Together, Boost, Shared HP/MAP), C6: Familiar Abilities (8 ability types), C8: Skill Feats (Battle Medicine, Bon Mot, Feint, Tumble Through, Create a Diversion, Kip Up, Quick Draw, Earn Income, Craft, Subsist)
- ✅ Fighter Feats: Aggressive Block, Combat Grab, Swipe, Guardian's Deflection, Dueling Riposte, Whirlwind Strike
- ✅ C3: Witch Hexes (Evil Eye, Needle of Vengeance, Life Boost, Malicious Shadow, Cackle, Phase Familiar, Patron's Puppet — one-hex-per-turn enforcement)
- ✅ C4: Kineticist Impulses (Elemental Blast 6 elements, Channel Elements, Gather Element, Overflow router, Scorching Column, Ocean's Balm, Timber Sentinel)
- ✅ D1: 16 New Spells (Command, Dizzying Colors, Goblin Pox, Phantom Pain, Ray of Enfeeblement, Ray of Frost, Acid Splash, Ignition, Sanctuary, Soothe, Spirit Link, Sudden Blight, Vampiric Feast, Web, Forbidding Ward, Runic Weapon)
- ✅ Batch 7: 20 More Spells (Hydraulic Push, Magic Weapon, Mystic Armor, Color Spray, Gust of Wind, Enervation, Vampiric Maiden, Calm, Resist Energy, See the Unseen, Summon Animal, Wall of Fire, Chain Lightning, Cone of Cold, Dimension Door, Fly, Invisibility, Restoration, Breathe Fire, Force Barrage)
- ✅ D5: Ritual Spell Framework (8 rituals: Planar Ally, Resurrect, Animate Dead, Consecrate, Teleportation Circle, Commune, Plant Growth, Awaken Animal)
- ✅ A10: Greater Difficult Terrain (3x cost general system, 4x when prone)
- ✅ Pushing Strike Fighter Feat (implemented, no longer placeholder)
- ✅ Removed 4 duplicate action dispatcher cases, fixed all pre-existing type errors (52 → 1)

### Recommended Implementation Order

**Tier 1 — Unblock Full Campaign Play** (addresses 🔴 CRITICAL items):
1. Daily Preparations & Rest system (B1) — without this, multi-encounter adventuring days don't work
2. Refocus Action (B2) — focus casters are crippled without it
3. Recall Knowledge (A1) — Design Principle #12 requires it; already has AI integration points
4. Environmental Hazards framework (A2) — enables ExplorationAI trap deployment
5. Exploration mechanics backbone (E6) — Perception/Thievery checks for traps/secrets
6. ExplorationView frontend (E1) — visual exploration instead of text-only
7. World Geographic Graph (E2) — structured location data for travel and AI reasoning

**Tier 2 — Deepen Core Gameplay** (addresses 🟡 HIGH items):
8. Consumable item activation (B5, B6) — potions, scrolls, wands usable in combat
9. Delay & Ready actions (A3) — tactical depth staples
10. Cover degrees (A4) — tactical positioning depth
11. Persistent damage flat checks (A5) — correct persistent damage recovery mechanic
12. Data-driven spell system (H5) — unblock bulk spell addition
13. Prepared vs Spontaneous casting (B3) — differentiate wizard/sorcerer
14. Narrative streaming (E7) — token-by-token AI narration to frontend
15. Buff/debuff cascading (D2) — stat recalculation on buff apply/remove
16. API input validation (G1) — security prerequisite
17. Feat implementations — prioritize by class popularity (Fighter → Rogue → Wizard → Cleric → rest)

**Tier 3 — Polish & Expand** (🟢 MEDIUM + content):
18. World/region map UI (E3) + travel pathfinding (E4)
19. Bestiary completion (H1) — fill skill/spell gaps on existing creatures
20. Class-specific fixes (C2-C6) — Alchemist, Witch, Kineticist, Summoner, Familiar
21. Consequence visibility UI (F1) + timeline/calendar (F2)
22. Light levels, weather, exploration activities (B8, E8, E9)
23. Spell sustaining, counteracting (D3, D4)
24. Skill challenges mechanical framework (B10)
25. NPC dialogue branching, deeper downtime UIs (F3, F4)

---

## Historical Baseline Audit

This section is preserved as the pre-implementation baseline captured before the AI GM phases were built out. It is not the current state of the project; use the verified progress update above for current status.

### What Works End-to-End
- **Full combat loop**: Initiative → turn order → player turns → NPC AI → reactions → damage/conditions → defeat
- **Strike system**: MAP, crits, weapon traits (agile, finesse, deadly, reach), flanking, runes
- **Spellcasting**: 13+ spells, heightened, saves, AoE, focus/cantrip amplification, Spellstrike
- **Conditions**: 30+ conditions with duration/stacking, persistent damage, dying/death saves
- **Shield block**: Full reaction system
- **Tactical AI**: Local difficulty tiers (easy→deadly), threat assessment, flanking, retreat logic
- **Save/Load**: Game state persistence working

### Partially Implemented
- **60+ feats stubbed**: Fighter/multiclass feats architecturally sound but logic missing
- **Class mechanics incomplete**: Monk KI partial, Witch hexes mostly missing, Alchemist modifiers broken, Summoner eidolon sync half-done, Familiar abilities missing UI
- **Equipment interactions**: Aura effects defined but not cascading, roll substitutions not wired
- **GM system**: Conversation works, tension tracker calculated but not affecting mechanics, NPC state stored but not mutated, no consequence persistence

### Major Gaps
- **No WebSocket/SSE** — All updates via HTTP polling (blocking for Phase 1)
- **No environmental hazards** — Traps, lava, complex hazards not implemented
- **No combat narration** — Strikes happen silently
- **No long-term memory** — Multi-session arcs not tracked
- **Spell effect cascading** — Buffs don't auto-recalc when applied
- **Bestiary incomplete** — ~100 creatures but missing skill proficiencies and spell lists on many

### Component Readiness

| Component | Status | Notes |
|-----------|--------|-------|
| Combat Engine | 85% | Strikes/spells/conditions solid |
| Rules Validation | 70% | Action costs work, feat interactions incomplete |
| Tactical AI | 60% | Local version solid, spell/feat selection basic |
| GM Chatbot | 50% | Conversation works, consequences not tracked |
| Frontend UI | 75% | Main combat functional, exploration/downtime missing |
| Campaign System | 30% | Structure exists, mechanics unconnected |
| WebSocket/Real-time | 0% | No infrastructure exists |

### Audit Action Items
These will be addressed as part of Phase 1 and ongoing development:
- [ ] Add WebSocket/SSE infrastructure (Phase 1 requirement)
- [ ] Fill stubbed feats (ongoing, not blocking)
- [ ] Complete bestiary stat blocks (ongoing, not blocking)
- [ ] Add input validation to API routes (security, before Phase 4)
- [ ] Implement environmental hazards (before Phase 5 ExplorationAI)

---

## Development Phases

### Phase 1: Event Bus System
**Foundation — everything else builds on this.**
**Current status:** Implemented for the current game surface. The current codebase has a typed in-process event bus, combat plus campaign/downtime/world event emission, backend subscribers, SSE forwarding, and frontend live consumption. A few future-facing event types remain reserved for systems that are not built yet.

- Create `GameEventBus` with typed events for all three gameplay modes:
  - **Encounter**: `CriticalHit`, `CreatureDown`, `SpellCast`, `ConditionApplied`, `TurnStart`, `TurnEnd`, `RoundStart`, `EncounterStart`, `EncounterEnd`, `TrapTriggered`, `HazardActivated`
  - **Exploration**: `RoomEntered`, `AreaDiscovered`, `TrapDetected`, `SecretFound`, `SkillCheckResult`, `SocialEncounterStart`, `TravelEvent`
  - **Downtime**: `CraftingComplete`, `IncomeEarned`, `RetrainComplete`, `RelationshipChanged`, `RumorHeard`
  - **World**: `TimeAdvanced`, `TensionChanged`, `ConsequenceTriggered`, `QuestUpdated`
- Hook into `GameEngine` so every action resolution emits events
- Support both synchronous listeners (for rules) and async listeners (for AI)
- Separate mechanical and narrative event channels — mechanics resolve instantly, narration streams async
- Add streaming support (WebSocket/SSE) for frontend event consumption
- **Principle adherence**: #9 (Event-Driven), #14 (All Three Modes)

### Phase 2: Context Compiler Service
**Token-efficient game state compression.**
- Build `ContextCompiler` that converts raw `GameState` → compressed natural language
- Compression profiles:
  - `combat-snapshot` (~200 tokens): positions, HP, conditions, last action
  - `tactical-full` (~800 tokens): all NPC options, player positions, terrain, spell slots
  - `narrative` (~500 tokens): scene description, tension level, recent events
  - `story` (~1500 tokens): active plot threads, NPC relationships, session history
  - `exploration` (~600 tokens): current location, visible exits, environmental details, party state
  - `downtime` (~400 tokens): available activities, current resources, NPC availability, time budget
  - `world-state` (~800 tokens): in-game date/time, tension level, active consequences, geographic context
- Only include fields relevant to the requesting AI role
- **Recall Knowledge filter**: Adjust creature/hazard descriptions based on character knowledge check results (Principle #12)
- **Anti-repetition tracking**: Log recently used description vocabulary, inject avoidance hints into context
- **Principle adherence**: #2 (Token Efficiency), #6 (Role Specialization), #12 (Information Asymmetry), #16 (Anti-Repetition)

### Phase 3: RAG Knowledge Base
**PF2e rules retrieval without fine-tuning.**
- Index all `shared/*.md` files using embeddings (lightweight local embeddings via `@xenova/transformers` or similar)
- Vector store: ChromaDB (local) or flat-file cosine similarity for simplicity
- Retrieval API: `query("Flurry of Blows monk") → relevant 200-token chunk`
- Chunk strategy: split by feat/feature/item boundary, ~200-300 tokens each
- Pre-compute embeddings on startup, cache to disk
- **Additional knowledge sources to index**:
  - Bestiary creature entries (for encounter design + recall knowledge)
  - Trap/hazard entries (for exploration mode)
  - Skill action descriptions (for exploration + downtime resolution)
  - Settlement/location data (for geographic context)
  - Crafting rules, downtime activity rules
  - **Golarion lore**: nations, deities, factions, major NPCs, geography, history (from freely available wiki/SRD content)
  - **Creature building rules**: Gamemastery Guide formulae for custom creature design
  - **Wealth-by-level tables**: for treasure generation
- **Principle adherence**: #7 (RAG Not Fine-Tuning), #2 (Token Efficiency)

### Phase 4: LLM Service Integration
**Provider-agnostic model interface.**
- `LLMService` interface: `complete(prompt, options) → Response`
- Providers: `CloudLLMProvider` (OpenAI/Claude), `OllamaProvider`, `LlamaCppProvider`
- Configuration: model selection, temperature, max tokens, timeout per provider — **per-role configurable** (different roles can use different models/providers)
- Structured output: JSON schema enforcement via function calling (cloud) or GBNF grammar (local)
- KV cache optimization: static prompt prefix detection and caching hints
- Streaming support: token-by-token output for frontend consumption
- Fallback chain: primary provider → secondary → template fallback
- Rate limiting and cost tracking for cloud providers
- **Speculative pre-generation** (local models only): queue likely narrative branches during player turns. Disabled when using cloud providers to control costs
- **Model warm-up**: keep model loaded with warm KV cache during player turns for faster response when AI turn begins
- **Principle adherence**: #3 (Provider-Agnostic), #4 (Constrained Output), #5 (KV Cache), #8 (Graceful Degradation)

### Phase 5: Role-Based AI Services
**Specialized AI roles with focused prompts.**

#### NarratorAI
- Listens to game events across ALL modes (combat, exploration, downtime), produces contextual narration
- Input: last event + compressed snapshot + scene description
- Output: narrative text (streamed to frontend)
- Time budget: 3 seconds max, then template fallback
- **Recall Knowledge integration**: creature/hazard description detail based on check results (Principle #12)
- **Anti-repetition**: tracks recent vocabulary, varies descriptions

#### TacticianAI
- Merges existing `TacticalAI` logic with LLM personality-aware decisions
- Input: NPC stats + nearby creatures + available actions + personality tag
- Output: ordered action list (JSON schema enforced)
- Time budget: 5 seconds max, then pure `TacticalAI` fallback
- NPC personality influences decisions (coward retreats, fanatic fights to death)
- Also drives AI party companion combat decisions (with richer personality context)

#### StoryAI
- Manages plot threads, NPC dialogue, quest progression, consequence tracking
- Input: session summary + active threads + player chat/action + active consequences
- Output: NPC dialogue + plot updates + tension adjustment + new consequences
- Time budget: 10 seconds (story moments aren't time-critical)
- **Consequence engine**: tracks pending consequences, inserts them when narratively appropriate
- **Backstory weaving**: integrates player character backstory elements as part of (not the entirety of) the broader story

#### ExplorationAI
- Manages exploration mode: scene descriptions, investigation, social encounters, skill challenges
- Input: current location + map context + party state + character skills/perception
- Output: scene description + available actions/exits + hidden elements (DCs for detection) + NPC presence
- Handles travel narration using geographic/map data
- Runs social encounter logic: NPC reactions based on Diplomacy/Deception/Intimidation checks
- Manages skill challenges (chase scenes, heists, puzzles) with branching outcomes
- Time budget: 5 seconds

#### DowntimeAI
- Manages downtime activities, shopping, NPC deepening, personal quests
- Input: available time + character resources + NPC relationships + location context
- Output: activity results + NPC interactions + rumor/hook generation + time advancement
- Generates shop inventories (level-appropriate, location-appropriate)
- Drives personal quest hooks based on character backstory + current plot state
- Time budget: 8 seconds

#### EncounterAI
- Designs encounters using party data + story context + terrain + tension level
- Input: party composition + difficulty target + available maps + story context + tension level
- Output: creature selection + placement + NPC personality cards + objectives + traps/hazards
- Tension-driven difficulty: higher tension → harder encounters, more plot-critical enemies
- Generates appropriate traps/hazards for environment
- Time budget: 30 seconds (pre-combat, not time-critical)

- **Principle adherence**: #6 (Role Specialization), #1 (AI Narrates, Rules Judge), #4 (Constrained Output), #14 (All Three Modes)

### Phase 6: Unified AI GM Coordinator
**Orchestrates all AI roles into one coherent GM.**
- `AIGMCoordinator` replaces separate `GMChatbot` + `AIManager` + `TacticalAI` entry points
- Listens to `GameEventBus`, decides which role-service to invoke
- Manages token budget across roles (total context budget per turn)
- NPC personality shared between all role services (TacticianAI and StoryAI share personality context)
- **Mode management**: tracks current gameplay mode (Encounter/Exploration/Downtime), manages transitions
- **Tension-driven pacing**: adjusts encounter difficulty, plot pressure, and downtime availability based on tension level (Principle #15)
- **In-game clock**: advances time appropriately per mode, enforces daily preparation resets, buff expirations, plot deadlines
- **Consequence scheduler**: checks pending consequences each scene, triggers when conditions are met
- Pacing control: fast responses during combat, richer responses during RP/exploration
- Mode toggle: "Full AI GM" vs "Assisted" (suggests, player approves)
- **Natural language parser**: translates player text input into mechanical actions when possible (Principle #17)
- **Dynamic difficulty scaling**: adjusts encounter budget based on party size (NOT mid-combat — only at design time)
- **Principle adherence**: #8 (Graceful Degradation), #2 (Token Efficiency), #13 (Consequences), #14 (All Three Modes), #15 (Tension)

### Phase 7: Persistent World Memory
**Cross-session continuity.**
- Auto-generated session summaries after each encounter/exploration/downtime phase
- NPC relationship tracker: disposition changes from player actions, tracks all named NPCs + AI companions
- Plot thread state machine: `introduced → active → complication → climax → resolved`
- Quest log with branching outcomes
- **Consequence ledger**: all pending consequences with trigger conditions and expiration
- **World state snapshot**: current state of locations, factions, political situations, ongoing events
- **In-game calendar**: persistent date/time tracking with seasonal effects
- **Character memory**: what each character knows (for Recall Knowledge / information asymmetry)
- Conversation summarization: compress old chat when hitting 60% of context budget
- **AI companion state**: persistent personality evolution, relationship scores, personal quest progress
- Storage: SQLite or JSON file (simple, portable)
- Memory retrieval: coordinator pulls relevant memories based on current context
- **Mid-session recovery**: checkpoint state regularly so crashes/restarts don't lose narrative context
- **Principle adherence**: #10 (Conversation Summarization), #2 (Token Efficiency), #13 (Consequences), #12 (Information Asymmetry)

### Phase 8: Adventure/Encounter Generator
**AI creates content, not just reacts to it. This is also effectively "Phase 0" — the Session Zero campaign generator must work before the first session can begin.**
- **Session Zero flow**: Player provides character, backstory, campaign preferences → AI generates full campaign framework (see Campaign Setting > Campaign Generation)
- Generate multi-encounter story arcs with branching paths following nested tension arc structure
- Create NPC personality cards and tactical preferences
- **Custom creature design**: Build BBEGs and lieutenants using PF2e creature building formulae + RAG
- Design encounters using party level + story context + map data + tension level
- **Generate exploration content**: dungeon layouts (room descriptions, connections, traps, loot), wilderness travel encounters, city districts and points of interest
- **Generate downtime content**: shop inventories, available NPCs, rumors, personal quest hooks
- **Treasure generation**: level-appropriate loot following PF2e wealth-by-level tables. Story-relevant items tied to quests. Consumables more common than permanent items. High-loot toggle as campaign setting
- Improvise when players go off-script (re-plan based on current state)
- Use RAG to pull appropriate creatures/items from bestiary/item data
- **Geographic coherence**: encounters and content respect map/location context
- **Tension-responsive arcs**: side quests at low tension, main plot pressure at high tension
- **Principle adherence**: #7 (RAG), #1 (AI Narrates, Rules Judge), #15 (Tension)

### Phase 9: Frontend GM Interface
**Player-facing AI GM experience.**
**Current status:** Core campaign UI is implemented: Session Zero, Campaign Dashboard, Encounter Preview, Downtime Menu, Companion Panel, GM runtime settings, and map access. Some planned Phase 9 items remain aspirational rather than fully implemented.

- **Narrative stream**: auto-narration alongside combat/exploration log (streamed token-by-token)
- **GM Chat panel**: conversational interface for RP, questions, NPC interaction, natural language actions
- **Mode indicators**: clear display of current mode (Encounter/Exploration/Downtime) with appropriate UI
- **World state dashboard**: active quests, NPC relationships, tension arc visualization, in-game calendar
- **Map views**: world/region/city map display with current location, points of interest, travel routes
- **Encounter preview**: AI proposes encounter, player can review/edit before starting
- **Downtime menu**: available activities, time budget, expected outcomes
- **Session Zero setup**: tone/theme preferences, campaign settings (loot level, companion AI, etc.)
- **Companion panel**: AI party companion status, personality summaries, relationship indicators
- **Rule citation toggle**: show/hide rule references in output
- Mode toggle: Full AI GM / Assisted / Manual (AI off)
- Settings: model selection, response speed vs quality slider, narration verbosity
- **Principle adherence**: #8 (Graceful Degradation), #17 (Natural Language), #19 (Rule Citation)

### Phase 10: Testing & Tuning
**Iterate on quality.**
- **Replay mode**: feed saved game states through AI roles, compare outputs without playing full encounters
- Prompt optimization: A/B test system prompts for each role
- Context budget tuning: measure quality vs. token usage tradeoffs
- Model comparison: benchmark different models on GM tasks
- Edge cases: what happens when AI suggests something rules engine rejects?
- Latency profiling: ensure combat pacing stays snappy
- Grammar/schema coverage: ensure all output schemas handle edge cases
- **Anti-repetition quality**: verify narration stays fresh over extended play sessions
- **Consequence testing**: verify choices create meaningful ripple effects
- **Mode transition testing**: verify smooth flow between Encounter/Exploration/Downtime
- **Companion coherence**: verify AI companions maintain consistent personalities across sessions

---

## Future Considerations (Post-Phase 10)

These are valuable features that don't require architectural changes and can be added when the core system is complete:

- **Voice/TTS Integration**: AI GM narrates aloud using local TTS (Piper, Bark, or similar). Dramatic immersion boost. High interest.
- **Player Preference Learning**: Over multiple sessions, adapt GMing style to player tendencies (loves RP? more social encounters. Loves tactics? more complex combats). High interest, post-core.
- **Map Generation Hints**: AI suggests visual map layouts for encounters it designs, integrated with existing terrain system
- **Content Rating System**: Configurable tone filter (G/PG/M) for different play preferences. Lower priority since solo player
- **Advanced NPC AI**: NPCs that pursue their own goals independently of the player — factional politics, rival adventurers, evolving villains
- **Expanded Token/Art Library**: More creature/NPC art and token images for visual variety in-game. Ongoing content expansion

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────┐
│                        Frontend                            │
│  BattleGrid │ ExplorationView │ DowntimeMenu │ WorldMap   │
│  ActionPanel │ GMChat │ NarrStream │ CompanionPanel        │
└────────────────────────────┬──────────────────────────────┘
                             │ REST + SSE today; WebSocket optional later
┌────────────────────────────▼──────────────────────────────┐
│                     Express Backend                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              AIGMCoordinator (Phase 6)                │ │
│  │    Mode Manager │ Tension Engine │ Consequence Sched  │ │
│  │    Time Clock │ NL Parser │ Pacing Controller         │ │
│  │  ┌─────────┬──────────┬───────────┬───────────────┐  │ │
│  │  │Narrator │Tactician │  Story    │ Exploration   │  │ │
│  │  │  AI     │  AI      │   AI      │    AI         │  │ │
│  │  ├─────────┼──────────┼───────────┼───────────────┤  │ │
│  │  │Downtime │Encounter │ Future    │  NL Action    │  │ │
│  │  │  AI     │Designer  │ Companion │   Parser      │  │ │
│  │  └────┬────┴────┬─────┴─────┬─────┴──────┬────────┘  │ │
│  │       │         │           │             │           │ │
│  │  ┌────▼─────────▼───────────▼─────────────▼────────┐  │ │
│  │  │       LLMService (Provider-Agnostic)            │  │ │
│  │  │  Cloud (OpenAI/Claude) ←→ Local (Ollama/llama)  │  │ │
│  │  │  Per-role model routing │ Grammar constraints    │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────┬──────────────────────────────┘ │
│                          │                                 │
│  ┌───────────────────────▼──────────────────────────────┐ │
│  │  ContextCompiler │ RAG │ WorldMemory │ MapService    │ │
│  │  Recall Knowledge │ Anti-Repetition │ Consequence DB │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                                 │
│  ┌───────────────────────▼──────────────────────────────┐ │
│  │           GameEngine + RulesEngine                    │ │
│  │           (Mechanical truth source)                   │ │
│  │  Encounter │ Exploration │ Downtime │ Time Tracking   │ │
│  └───────────────────────┬──────────────────────────────┘ │
│                          │                                 │
│  ┌───────────────────────▼──────────────────────────────┐ │
│  │              GameEventBus (Phase 1)                   │ │
│  │  Combat │ Exploration │ Downtime │ World │ Companion  │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM abstraction | Provider interface pattern | Swap cloud ↔ local with config change only. Per-role model routing |
| Output constraints | GBNF grammar (local) + JSON schema (cloud) | Prevents invalid/hallucinated output formats |
| Knowledge source | RAG over shared/*.md + bestiary + items | Accurate, updatable, no training needed |
| State compression | Natural language summaries | 10x token reduction vs raw JSON |
| Streaming | REST + SSE today | Live event transport exists; richer narrative streaming can build on it |
| Persistence | SQLite or JSON files | Simple, portable, no external DB needed |
| Fallback strategy | TacticalAI (existing) + templates | Never blocks gameplay waiting for AI |
| Prompt structure | Static prefix + dynamic suffix | KV cache reuse for 50-80% speed gain |
| Difficulty fairness | No mid-combat adjustment | PF2e is tactical — challenge is real or worthless |
| Information asymmetry | Recall Knowledge checks | Earned knowledge, not vibes |
| Time tracking | Persistent in-game clock | Enables deadlines, daily preps, buff tracking, travel |
| Consequence tracking | Ledger with trigger conditions | Player choices ripple through future sessions |
| Party scaling | Encounter budget adjusts to party size | Solo player, flexible party count |
| Loot economy | Wealth-by-level guidelines | Keeps progression meaningful, not inflationary |
| Map awareness | Multi-scale geographic data | AI makes geographically coherent decisions |
