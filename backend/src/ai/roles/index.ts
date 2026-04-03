/**
 * Phase 5 — Role-Based AI Services barrel export.
 */
export { NarratorAI } from './narratorAI';
export { TacticianAI } from './tacticianAI';
export { StoryAI } from './storyAI';
export { ExplorationAI } from './explorationAI';
export { DowntimeAI } from './downtimeAI';
export { EncounterAI } from './encounterAI';

export type {
  RoleDependencies,
  NarrationRequest,
  NarrationResponse,
  TacticianRequest,
  TacticianResponse,
  TacticianAction,
  StoryRequest,
  StoryResponse,
  PlotUpdate,
  PendingConsequence,
  ExplorationRequest,
  ExplorationResponse,
  HiddenElement,
  DowntimeRequest,
  DowntimeResponse,
  ShopItem,
  EncounterDesignRequest,
  EncounterDesignResponse,
  EncounterCreature,
  EncounterHazard,
} from './types';
