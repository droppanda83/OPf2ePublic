/**
 * Phase 6 — AI GM Coordinator types.
 *
 * Defines the contracts for the unified orchestrator that routes player
 * messages and game events to the appropriate Phase 5 role services.
 */

import type {
  GameState,
  GMSession,
  GMChatMessage,
  TensionTracker,
  RecurringNPC,
} from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../contextCompiler';
import type { KnowledgeBase } from '../../knowledgeBase';
import type { GameEventBus } from '../../eventBus';
import type { GameEngine } from '../../game/engine';
import type { NarratorAI } from '../roles/narratorAI';
import type { TacticianAI } from '../roles/tacticianAI';
import type { StoryAI } from '../roles/storyAI';
import type { ExplorationAI } from '../roles/explorationAI';
import type { DowntimeAI } from '../roles/downtimeAI';
import type { EncounterAI } from '../roles/encounterAI';

// ---------------------------------------------------------------------------
// Coordinator dependencies
// ---------------------------------------------------------------------------

export interface CoordinatorDependencies {
  llmService: LLMService;
  contextCompiler: ContextCompiler;
  knowledgeBase: KnowledgeBase;
  eventBus: GameEventBus;
  gameEngine: GameEngine;

  // Phase 5 role services
  narratorAI: NarratorAI;
  tacticianAI: TacticianAI;
  storyAI: StoryAI;
  explorationAI: ExplorationAI;
  downtimeAI: DowntimeAI;
  encounterAI: EncounterAI;
}

// ---------------------------------------------------------------------------
// Gameplay modes & transitions
// ---------------------------------------------------------------------------

/** The five gameplay modes the coordinator tracks. */
export type GameplayMode = 'exploration' | 'encounter' | 'downtime' | 'social' | 'travel';

export interface ModeTransition {
  from: GameplayMode;
  to: GameplayMode;
  reason: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Coordinator configuration
// ---------------------------------------------------------------------------

export interface CoordinatorConfig {
  /** 'full' = AI drives everything; 'assisted' = AI suggests, player confirms */
  mode: 'full' | 'assisted';

  /** When true, narrate combat actions automatically */
  combatNarration: boolean;

  /** Per-role max-token budgets (override LLM service defaults) */
  tokenBudgets?: Partial<Record<string, number>>;

  /** Minimum seconds between non-combat AI calls (rate limit) */
  minCallIntervalMs?: number;
}

export const DEFAULT_COORDINATOR_CONFIG: CoordinatorConfig = {
  mode: 'full',
  combatNarration: true,
  minCallIntervalMs: 500,
};

// ---------------------------------------------------------------------------
// In-game clock
// ---------------------------------------------------------------------------

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'evening' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface InGameClock {
  /** Narrative day count (1-indexed). */
  day: number;
  /** Current time of day. */
  timeOfDay: TimeOfDay;
  /** Current season (cosmetic / narrative flavour). */
  season: Season;
  /** Hours elapsed within today (0-23). */
  hour: number;
  /** Whether the party has performed daily preparations today. */
  dailyPrepDone: boolean;
  /** Timestamp of last advance. */
  lastAdvanced: number;
}

export const DEFAULT_CLOCK: InGameClock = {
  day: 1,
  timeOfDay: 'morning',
  season: 'summer',
  hour: 8,
  dailyPrepDone: true,
  lastAdvanced: Date.now(),
};

// ---------------------------------------------------------------------------
// Consequence scheduling
// ---------------------------------------------------------------------------

export type ConsequenceStatus = 'pending' | 'triggered' | 'expired' | 'cancelled';

export interface ConsequenceEntry {
  id: string;
  /** Human-readable trigger condition. */
  trigger: string;
  /** Narrative/mechanical effect when fired. */
  effect: string;
  /** Timing hint from StoryAI. */
  timing: string; // 'next-scene' | 'next-session' | 'when-<condition>'
  /** Current status. */
  status: ConsequenceStatus;
  /** Scene / mode count at creation. */
  createdAtScene: number;
  /** Optional expiry: number of scene transitions before auto-expire. */
  expiresAfterScenes?: number;
}

// ---------------------------------------------------------------------------
// Natural language intent
// ---------------------------------------------------------------------------

export type PlayerIntentType =
  | 'attack'
  | 'move'
  | 'cast-spell'
  | 'use-skill'
  | 'interact'
  | 'explore'
  | 'investigate'
  | 'social'
  | 'rest'
  | 'travel'
  | 'shop'
  | 'craft'
  | 'start-encounter'
  | 'end-encounter'
  | 'recall-knowledge'
  | 'free-form'
  | 'meta'; // out-of-character: recap, help, status

export interface PlayerIntent {
  type: PlayerIntentType;
  /** Raw player message. */
  raw: string;
  /** Target noun (creature name, location, item, etc.) */
  target?: string;
  /** Secondary detail (weapon, spell name, skill, etc.) */
  detail?: string;
  /** Confidence 0-1 of the parse. If low, the coordinator asks for clarification. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Coordinator response (superset returned to the route layer)
// ---------------------------------------------------------------------------

export interface CoordinatorResponse {
  /** The GM chat message to show the player. */
  gmMessage: GMChatMessage;
  /** Mechanical actions to be executed by the route / engine. */
  mechanicalActions: GMChatMessage['mechanicalAction'][];
  /** Mutations to apply to GMSession (tension, NPCs, phase, etc.). */
  sessionUpdates: Partial<GMSession>;
  /** Optional narration text (separate from gmMessage for overlay display). */
  narration?: string;
  /** Mode transitions that occurred during processing. */
  modeTransitions: ModeTransition[];
  /** Consequences that were triggered this turn. */
  triggeredConsequences: ConsequenceEntry[];
  /** Updated clock state. */
  clock?: InGameClock;
}

// ---------------------------------------------------------------------------
// Event → role routing
// ---------------------------------------------------------------------------

/** Which role service(s) should respond to a given event category. */
export type EventRouteTarget = 'narrator' | 'tactician' | 'story' | 'exploration' | 'downtime' | 'encounter';

export interface EventRoute {
  eventPattern: string; // prefix match, e.g. 'combat:', 'action:'
  targets: EventRouteTarget[];
  /** If true, only fire when combatNarration is enabled. */
  requiresNarration?: boolean;
}

/** Default event→role routing table. */
export const DEFAULT_EVENT_ROUTES: EventRoute[] = [
  { eventPattern: 'combat:started',   targets: ['narrator', 'encounter'] },
  { eventPattern: 'combat:ended',     targets: ['narrator', 'story'] },
  { eventPattern: 'round:started',    targets: ['narrator'], requiresNarration: true },
  { eventPattern: 'turn:started',     targets: ['tactician'] },
  { eventPattern: 'turn:ended',       targets: [] },
  { eventPattern: 'action:executed',  targets: ['narrator'], requiresNarration: true },
  { eventPattern: 'action:failed',    targets: [] },
  { eventPattern: 'creature:damaged', targets: ['narrator'], requiresNarration: true },
  { eventPattern: 'creature:healed',  targets: ['narrator'], requiresNarration: true },
  { eventPattern: 'creature:dying',   targets: ['narrator', 'story'] },
  { eventPattern: 'creature:dead',    targets: ['narrator', 'story'] },
  { eventPattern: 'creature:stabilized', targets: ['narrator'], requiresNarration: true },
  { eventPattern: 'condition:applied',   targets: ['narrator'], requiresNarration: true },
  { eventPattern: 'condition:removed',   targets: [] },
  { eventPattern: 'reaction:opportunity', targets: ['tactician'] },
  { eventPattern: 'initiative:rolled',    targets: [] },
];
