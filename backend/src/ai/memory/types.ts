/**
 * Phase 7 — Persistent World Memory types.
 *
 * Defines contracts for cross-session continuity: session summaries,
 * NPC relationship tracking, plot thread state machine, character
 * knowledge, consequence ledger, and the unified world snapshot.
 */

import type {
  RecurringNPC,
  StoryArc,
  TensionTracker,
  SessionNote,
  GMChatMessage,
} from 'pf2e-shared';
import type { ConsequenceEntry, InGameClock } from '../coordinator/types';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';

// ---------------------------------------------------------------------------
// Memory service dependencies
// ---------------------------------------------------------------------------

export interface MemoryDependencies {
  llmService: LLMService;
  contextCompiler: ContextCompiler;
  knowledgeBase: KnowledgeBase;
}

// ---------------------------------------------------------------------------
// Plot thread state machine
// ---------------------------------------------------------------------------

export type PlotThreadStatus =
  | 'introduced'
  | 'active'
  | 'complication'
  | 'climax'
  | 'resolved'
  | 'abandoned';

export interface PlotThread {
  id: string;
  title: string;
  description: string;
  status: PlotThreadStatus;
  /** NPCs involved in this thread (by id). */
  involvedNPCs: string[];
  /** Key locations involved. */
  locations: string[];
  /** Milestones within this thread. */
  milestones: { description: string; completed: boolean; timestamp?: number }[];
  /** Possible branches/outcomes. */
  branches: PlotBranch[];
  /** When this thread was introduced. */
  introducedAt: number;
  /** When this thread last changed status. */
  lastUpdated: number;
  /** Parent thread id (for sub-plots). */
  parentThread?: string;
  /** Priority: how important this thread is to the campaign arc. */
  priority: 'main' | 'secondary' | 'side';
}

export interface PlotBranch {
  id: string;
  description: string;
  /** Condition that triggers this branch. */
  triggerCondition: string;
  /** Whether this branch has been taken. */
  taken: boolean;
  /** Outcome summary if resolved. */
  outcome?: string;
}

// ---------------------------------------------------------------------------
// Quest log
// ---------------------------------------------------------------------------

export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  /** Source: how the quest was discovered. */
  source: string;
  /** Related plot thread. */
  plotThreadId?: string;
  /** Objectives within this quest. */
  objectives: QuestObjective[];
  /** XP reward when completed. */
  xpReward?: number;
  /** Loot / item rewards. */
  rewards: string[];
  /** In-game day introduced. */
  introducedDay: number;
  /** Optional deadline (in-game day). */
  deadlineDay?: number;
  completedAt?: number;
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
  /** Optional: completing this objective is required for quest completion. */
  required: boolean;
}

// ---------------------------------------------------------------------------
// Character knowledge (Recall Knowledge / information asymmetry)
// ---------------------------------------------------------------------------

export interface KnowledgeEntry {
  /** What was identified (creature name, item, lore topic). */
  subject: string;
  /** Category: creature, hazard, item, lore, npc. */
  category: 'creature' | 'hazard' | 'item' | 'lore' | 'npc';
  /** Degree of success from the Recall Knowledge check. */
  degree: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  /** The character who made the check. */
  characterId: string;
  /** What was revealed (or mis-revealed on crit fail). */
  revealedInfo: string;
  /** In-game timestamp. */
  learnedAt: number;
}

/** Per-character knowledge map. */
export interface CharacterKnowledge {
  characterId: string;
  characterName: string;
  /** All knowledge entries for this character. */
  entries: KnowledgeEntry[];
}

// ---------------------------------------------------------------------------
// Location / world state tracking
// ---------------------------------------------------------------------------

export type LocationStatus = 'unexplored' | 'visited' | 'cleared' | 'hostile' | 'friendly' | 'destroyed';

export interface LocationMemory {
  id: string;
  name: string;
  /** Brief description of the location. */
  description: string;
  status: LocationStatus;
  /** NPCs known to be at this location. */
  knownNPCs: string[];
  /** Notable events that happened here. */
  events: string[];
  /** First visited (in-game day). */
  firstVisitedDay?: number;
  /** Last visited (in-game day). */
  lastVisitedDay?: number;
}

export interface FactionMemory {
  id: string;
  name: string;
  /** Party's current standing with this faction. */
  disposition: number; // -100 to 100
  /** Known members (NPC ids). */
  knownMembers: string[];
  /** Key events involving this faction. */
  events: string[];
}

// ---------------------------------------------------------------------------
// Session summary (auto-generated)
// ---------------------------------------------------------------------------

export interface SessionSummary {
  sessionNumber: number;
  /** LLM-compressed summary of the session's events. */
  narrative: string;
  /** Key decisions made by the player. */
  keyDecisions: string[];
  /** NPCs interacted with. */
  npcsEncountered: string[];
  /** Encounters that occurred. */
  encounters: string[];
  /** Plot threads advanced. */
  plotThreadsAdvanced: string[];
  /** Consequences created or triggered. */
  consequenceActivity: string[];
  /** Clock state at session end. */
  clockSnapshot: InGameClock;
  /** Tension at session end. */
  tensionSnapshot: number;
  /** XP awarded this session. */
  xpAwarded: number;
  /** Real-world timestamp. */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Conversation compression
// ---------------------------------------------------------------------------

export interface CompressedHistory {
  /** Compressed summary of older messages. */
  summary: string;
  /** How many raw messages were compressed. */
  compressedCount: number;
  /** The remaining recent messages (not yet compressed). */
  recentMessages: GMChatMessage[];
  /** Timestamp of last compression. */
  lastCompressed: number;
}

// ---------------------------------------------------------------------------
// Unified world snapshot (the full persistent state)
// ---------------------------------------------------------------------------

export interface WorldSnapshot {
  /** Schema version for migration support. */
  version: number;
  /** Campaign identifier. */
  campaignId: string;
  /** In-game clock state. */
  clock: InGameClock;
  /** All tracked NPCs. */
  npcs: RecurringNPC[];
  /** All plot threads. */
  plotThreads: PlotThread[];
  /** Quest log. */
  quests: Quest[];
  /** Story arc state. */
  storyArc?: StoryArc;
  /** Tension tracker state. */
  tension: TensionTracker;
  /** Consequence ledger. */
  consequences: ConsequenceEntry[];
  /** Scene counter for consequence scheduling. */
  sceneCount: number;
  /** Per-character knowledge maps. */
  characterKnowledge: CharacterKnowledge[];
  /** Known locations. */
  locations: LocationMemory[];
  /** Known factions. */
  factions: FactionMemory[];
  /** Session summaries. */
  sessionSummaries: SessionSummary[];
  /** Compressed chat history. */
  compressedHistory?: CompressedHistory;
  /** Session notes (from GMSession — preserved here too). */
  sessionNotes: SessionNote[];
  /** Current session number. */
  currentSession: number;
  /** Last save timestamp. */
  lastSaved: number;
}

export const WORLD_SNAPSHOT_VERSION = 1;

export const DEFAULT_WORLD_SNAPSHOT: WorldSnapshot = {
  version: WORLD_SNAPSHOT_VERSION,
  campaignId: '',
  clock: {
    day: 1,
    timeOfDay: 'morning',
    season: 'summer',
    hour: 8,
    dailyPrepDone: true,
    lastAdvanced: Date.now(),
  },
  npcs: [],
  plotThreads: [],
  quests: [],
  tension: {
    score: 20,
    trend: 'stable',
    lastUpdated: Date.now(),
    history: [],
  },
  consequences: [],
  sceneCount: 0,
  characterKnowledge: [],
  locations: [],
  factions: [],
  sessionSummaries: [],
  sessionNotes: [],
  currentSession: 1,
  lastSaved: Date.now(),
};
