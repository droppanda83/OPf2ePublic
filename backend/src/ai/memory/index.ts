/**
 * Phase 7 — World Memory barrel export.
 */

// Core service
export { WorldMemory } from './worldMemory';

// Sub-systems
export { SessionSummarizer } from './sessionSummarizer';
export { NPCTracker } from './npcTracker';
export { PlotTracker } from './plotTracker';
export { CharacterKnowledgeTracker } from './characterKnowledge';

// Types
export type {
  MemoryDependencies,
  WorldSnapshot,
  SessionSummary,
  CompressedHistory,
  PlotThread,
  PlotThreadStatus,
  PlotBranch,
  Quest,
  QuestStatus,
  QuestObjective,
  KnowledgeEntry,
  CharacterKnowledge,
  LocationMemory,
  LocationStatus,
  FactionMemory,
} from './types';
export { DEFAULT_WORLD_SNAPSHOT, WORLD_SNAPSHOT_VERSION } from './types';
