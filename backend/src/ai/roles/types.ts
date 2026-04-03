/**
 * Shared types for Phase 5 Role-Based AI Services.
 * Each service produces structured output conforming to these interfaces.
 */

// ─── Common ─────────────────────────────────────────────────

/** Dependencies injected into every role service. */
export interface RoleDependencies {
  llmService: import('../llm').LLMService;
  contextCompiler: import('../../services/contextCompiler').ContextCompiler;
  knowledgeBase: import('../../services/knowledgeBase').KnowledgeBase;
  eventBus: import('../../events/eventBus').GameEventBus;
}

// ─── NarratorAI ─────────────────────────────────────────────

export interface NarrationRequest {
  gameState: import('pf2e-shared').GameState;
  /** The triggering event type (e.g. 'action:executed', 'creature:dead'). */
  eventType: string;
  /** Brief description of what just happened mechanically. */
  mechanicalSummary: string;
  /** Vocabulary to avoid for anti-repetition. */
  recentVocabulary?: string[];
}

export interface NarrationResponse {
  narration: string;
  /** Key vocabulary used (tracked for anti-repetition). */
  vocabulary: string[];
  /** Whether this was a template fallback rather than LLM output. */
  isFallback: boolean;
}

// ─── TacticianAI ────────────────────────────────────────────

export interface TacticianRequest {
  gameState: import('pf2e-shared').GameState;
  creatureId: string;
  /** NPC personality tag influencing decisions (e.g. 'coward', 'fanatic', 'tactical'). */
  personality?: string;
}

export interface TacticianAction {
  actionId: string;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  weaponId?: string;
  spellId?: string;
  reasoning: string;
}

export interface TacticianResponse {
  actions: TacticianAction[];
  /** Whether the LLM was used (true) or rule-based TacticalAI fallback (false). */
  usedLLM: boolean;
  /** Overall tactical reasoning summary. */
  reasoning: string;
}

// ─── StoryAI ────────────────────────────────────────────────

export interface StoryRequest {
  gameState: import('pf2e-shared').GameState;
  playerMessage: string;
  /** Current GM session with chat history, NPCs, story arc. */
  session: import('pf2e-shared').GMSession;
}

export interface PlotUpdate {
  type: 'quest-advance' | 'npc-reaction' | 'consequence-trigger' | 'new-hook' | 'milestone';
  description: string;
}

export interface PendingConsequence {
  id: string;
  trigger: string;
  effect: string;
  /** When it should fire: 'next-scene' | 'next-session' | 'when-<condition>'. */
  timing: string;
}

export interface StoryResponse {
  dialogue: string;
  plotUpdates: PlotUpdate[];
  tensionDelta: number;
  consequences: PendingConsequence[];
  /** Updated NPC dispositions: { npcId: delta }. */
  npcDispositionChanges: Record<string, number>;
  isFallback: boolean;
}

// ─── ExplorationAI ──────────────────────────────────────────

export interface ExplorationRequest {
  gameState: import('pf2e-shared').GameState;
  /** What the player is doing: 'enter-area' | 'investigate' | 'social' | 'travel' | 'skill-check'. */
  action: 'enter-area' | 'investigate' | 'social' | 'travel' | 'skill-check';
  /** Additional context — NPC name for social, skill name for checks, etc. */
  detail?: string;
  /** Skill check result if action is 'skill-check'. */
  checkResult?: {
    skill: string;
    dc: number;
    total: number;
    degree: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  };
}

export interface HiddenElement {
  type: 'trap' | 'secret-door' | 'hidden-item' | 'ambush' | 'clue';
  description: string;
  perceptionDC: number;
  /** Skill + DC to interact with (e.g. "Thievery 22" to disable a trap). */
  interactDC?: string;
}

export interface ExplorationResponse {
  description: string;
  /** Suggested actions available to the player. */
  availableActions: string[];
  /** Elements the player hasn't detected yet (GM-only). */
  hiddenElements: HiddenElement[];
  /** NPCs present in the scene. */
  npcsPresent: string[];
  isFallback: boolean;
}

// ─── DowntimeAI ─────────────────────────────────────────────

export interface DowntimeRequest {
  gameState: import('pf2e-shared').GameState;
  /** What the player wants to do. */
  activity: 'craft' | 'earn-income' | 'retrain' | 'shop' | 'gather-info' | 'rest' | 'socialize';
  /** Additional context — item name, NPC name, skill used, etc. */
  detail?: string;
  /** How many in-game days allocated. */
  daysAvailable?: number;
}

export interface ShopItem {
  name: string;
  level: number;
  price: string;
  description: string;
}

export interface DowntimeResponse {
  narration: string;
  /** Mechanical outcome (e.g. gold earned, item crafted). */
  mechanicalResult?: string;
  /** Shop inventory if activity is 'shop'. */
  shopInventory?: ShopItem[];
  /** Rumors or hooks learned during downtime. */
  rumors: string[];
  /** In-game days consumed. */
  daysConsumed: number;
  isFallback: boolean;
}

// ─── EncounterAI ────────────────────────────────────────────

export interface EncounterDesignRequest {
  /** Party member levels. */
  partyLevels: number[];
  /** Target difficulty. */
  difficulty: 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme';
  /** Story/location context for thematic creature selection. */
  storyContext: string;
  /** Current tension score (0-100). */
  tensionScore: number;
  /** Map theme if available. */
  mapTheme?: string;
}

export interface EncounterCreature {
  name: string;
  level: number;
  count: number;
  role: 'boss' | 'elite' | 'standard' | 'lackey';
  /** Tactical personality tag. */
  personality: string;
  /** Suggested initial position zone: 'front' | 'center' | 'rear' | 'flanking' | 'hidden'. */
  placement: string;
}

export interface EncounterHazard {
  name: string;
  level: number;
  type: 'simple' | 'complex';
  description: string;
}

export interface EncounterDesignResponse {
  /** Encounter name/title. */
  title: string;
  /** Opening narration when encounter begins. */
  openingNarration: string;
  creatures: EncounterCreature[];
  hazards: EncounterHazard[];
  /** Total XP budget used. */
  xpBudget: number;
  /** Tactical objectives beyond "kill everything". */
  objectives: string[];
  /** Environmental features that affect combat. */
  terrain: string[];
  isFallback: boolean;
}
