/**
 * Phase 6 — AI GM Coordinator barrel export.
 */

// Core coordinator
export { AIGMCoordinator } from './coordinator';

// Sub-systems
export { ConsequenceScheduler } from './consequenceScheduler';
export type { ConsequenceContext } from './consequenceScheduler';
export { GameClock } from './gameClock';
export { NLParser } from './nlParser';

// Types
export type {
  CoordinatorDependencies,
  CoordinatorConfig,
  CoordinatorResponse,
  GameplayMode,
  ModeTransition,
  InGameClock,
  TimeOfDay,
  Season,
  ConsequenceEntry,
  ConsequenceStatus,
  PlayerIntent,
  PlayerIntentType,
  EventRoute,
  EventRouteTarget,
} from './types';
export { DEFAULT_COORDINATOR_CONFIG, DEFAULT_CLOCK, DEFAULT_EVENT_ROUTES } from './types';
