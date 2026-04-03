/**
 * Game Event Bus — Typed event definitions for the AI GM system.
 *
 * Every significant game state change emits a typed event through the GameEventBus.
 * AI subsystems subscribe to these events rather than being called directly from
 * routes or the game engine.
 */
import type { GameLog, Position } from './types';

// ─── Event Type Union ────────────────────────────────────────

export type GameEventType =
  // Combat lifecycle
  | 'combat:started'
  | 'combat:ended'
  // Round lifecycle
  | 'round:started'
  // Turn lifecycle
  | 'turn:started'
  | 'turn:ended'
  // Actions
  | 'action:executed'
  | 'action:failed'
  // Creature state changes
  | 'creature:damaged'
  | 'creature:healed'
  | 'creature:dying'
  | 'creature:dead'
  | 'creature:stabilized'
  // Conditions
  | 'condition:applied'
  | 'condition:removed'
  // Reactions
  | 'reaction:opportunity'
  // Initiative
  | 'initiative:rolled'
  // Exploration
  | 'exploration:room-entered'
  | 'exploration:area-discovered'
  | 'exploration:trap-detected'
  | 'exploration:secret-found'
  | 'exploration:skill-check'
  | 'exploration:social-started'
  | 'exploration:travel'
  // Downtime
  | 'downtime:crafting-complete'
  | 'downtime:income-earned'
  | 'downtime:retrain-complete'
  | 'downtime:relationship-changed'
  | 'downtime:rumor-heard'
  // World
  | 'world:time-advanced'
  | 'world:tension-changed'
  | 'world:consequence-triggered'
  | 'world:quest-updated';

// ─── Base Event ──────────────────────────────────────────────

export interface GameEventBase {
  /** Event type discriminator */
  type: GameEventType;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Game ID this event belongs to */
  gameId: string;
}

// ─── Combat Lifecycle Events ─────────────────────────────────

export interface CombatStartedEvent extends GameEventBase {
  type: 'combat:started';
  /** Creature IDs in initiative order */
  turnOrder: string[];
  /** Total number of creatures */
  creatureCount: number;
}

export interface CombatEndedEvent extends GameEventBase {
  type: 'combat:ended';
  /** Total rounds the combat lasted */
  totalRounds: number;
  /** Which side won, or null for inconclusive */
  outcome: 'players' | 'enemies' | 'inconclusive' | null;
}

// ─── Round Events ────────────────────────────────────────────

export interface RoundStartedEvent extends GameEventBase {
  type: 'round:started';
  roundNumber: number;
}

// ─── Turn Events ─────────────────────────────────────────────

export interface TurnStartedEvent extends GameEventBase {
  type: 'turn:started';
  creatureId: string;
  creatureName: string;
  creatureType: 'player' | 'creature' | 'companion' | 'npc';
  /** Actions available this turn (after stunned/slowed/quickened) */
  actionPoints: number;
  /** Conditions that affected action economy this turn */
  conditionMessages: string[];
  /** Persistent damage entries applied at turn start */
  persistentDamage: Array<{ source: string; damage: number; damageType: string }>;
}

export interface TurnEndedEvent extends GameEventBase {
  type: 'turn:ended';
  creatureId: string;
  creatureName: string;
  /** Conditions that expired at end of this turn */
  expiredConditions: string[];
}

// ─── Action Events ───────────────────────────────────────────

export interface ActionExecutedEvent extends GameEventBase {
  type: 'action:executed';
  /** Who performed the action */
  actorId: string;
  actorName: string;
  /** What action was performed */
  actionId: string;
  /** Target creature, if any */
  targetId?: string;
  targetName?: string;
  /** The result returned by RulesEngine.resolveAction */
  result: {
    success: boolean;
    message: string;
    [key: string]: unknown;
  };
  /** The corresponding GameLog entry */
  logEntry: GameLog;
}

export interface ActionFailedEvent extends GameEventBase {
  type: 'action:failed';
  actorId: string;
  actorName: string;
  actionId: string;
  errorCode: string;
  message: string;
}

// ─── Creature State Events ───────────────────────────────────

export interface CreatureDamagedEvent extends GameEventBase {
  type: 'creature:damaged';
  creatureId: string;
  creatureName: string;
  damage: number;
  damageType: string;
  source: string;
  currentHp: number;
  maxHp: number;
}

export interface CreatureHealedEvent extends GameEventBase {
  type: 'creature:healed';
  creatureId: string;
  creatureName: string;
  healing: number;
  source: string;
  currentHp: number;
  maxHp: number;
}

export interface CreatureDyingEvent extends GameEventBase {
  type: 'creature:dying';
  creatureId: string;
  creatureName: string;
  dyingValue: number;
}

export interface CreatureDeadEvent extends GameEventBase {
  type: 'creature:dead';
  creatureId: string;
  creatureName: string;
}

export interface CreatureStabilizedEvent extends GameEventBase {
  type: 'creature:stabilized';
  creatureId: string;
  creatureName: string;
}

// ─── Condition Events ────────────────────────────────────────

export interface ConditionAppliedEvent extends GameEventBase {
  type: 'condition:applied';
  creatureId: string;
  creatureName: string;
  condition: {
    name: string;
    value?: number;
    source?: string;
    duration: number | 'permanent';
  };
}

export interface ConditionRemovedEvent extends GameEventBase {
  type: 'condition:removed';
  creatureId: string;
  creatureName: string;
  conditionName: string;
  reason: 'expired' | 'removed' | 'overridden';
}

// ─── Reaction Events ─────────────────────────────────────────

export interface ReactionOpportunityEvent extends GameEventBase {
  type: 'reaction:opportunity';
  /** Creature that can react */
  reactorId: string;
  reactorName: string;
  /** Creature that triggered the reaction */
  triggerId: string;
  triggerName: string;
  /** What kind of reaction */
  reactionType: 'reactive-strike' | 'shield-block' | 'ready-action';
  /** What triggered it */
  triggerAction: string;
}

// ─── Initiative Events ───────────────────────────────────────

export interface InitiativeRolledEvent extends GameEventBase {
  type: 'initiative:rolled';
  results: Array<{ creatureId: string; creatureName: string; initiative: number }>;
  turnOrder: string[];
}

// ─── Exploration Events ─────────────────────────────────────

export interface RoomEnteredEvent extends GameEventBase {
  type: 'exploration:room-entered';
  creatureId: string;
  creatureName: string;
  fromPosition: Position;
  toPosition: Position;
  pathLength: number;
  summary?: string;
}

export interface AreaDiscoveredEvent extends GameEventBase {
  type: 'exploration:area-discovered';
  areaId: string;
  title: string;
  description?: string;
}

export interface TrapDetectedEvent extends GameEventBase {
  type: 'exploration:trap-detected';
  creatureId: string;
  creatureName: string;
  trapId: string;
  trapName: string;
  location?: string;
}

export interface SecretFoundEvent extends GameEventBase {
  type: 'exploration:secret-found';
  creatureId: string;
  creatureName: string;
  secretId: string;
  summary: string;
}

export interface SkillCheckResultEvent extends GameEventBase {
  type: 'exploration:skill-check';
  creatureId: string;
  creatureName: string;
  skill: string;
  dc?: number;
  total?: number;
  outcome: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  summary: string;
}

export interface SocialEncounterStartEvent extends GameEventBase {
  type: 'exploration:social-started';
  npcId?: string;
  npcName?: string;
  location?: string;
  triggerMessage?: string;
}

export interface TravelEvent extends GameEventBase {
  type: 'exploration:travel';
  creatureId: string;
  creatureName: string;
  fromPosition: Position;
  toPosition: Position;
  pathLength: number;
  mode: 'exploration-move' | 'journey';
}

// ─── Downtime Events ───────────────────────────────────────

export interface CraftingCompleteEvent extends GameEventBase {
  type: 'downtime:crafting-complete';
  actorId?: string;
  actorName?: string;
  itemName: string;
  daysSpent: number;
}

export interface IncomeEarnedEvent extends GameEventBase {
  type: 'downtime:income-earned';
  actorId?: string;
  actorName?: string;
  amount: number;
  currency: string;
  source: string;
  daysSpent: number;
}

export interface RetrainCompleteEvent extends GameEventBase {
  type: 'downtime:retrain-complete';
  actorId?: string;
  actorName?: string;
  target: string;
  daysSpent: number;
}

export interface RelationshipChangedEvent extends GameEventBase {
  type: 'downtime:relationship-changed';
  npcId?: string;
  npcName: string;
  previousDisposition?: number;
  newDisposition?: number;
  reason: string;
}

export interface RumorHeardEvent extends GameEventBase {
  type: 'downtime:rumor-heard';
  rumor: string;
  sourceNpcId?: string;
  sourceNpcName?: string;
}

// ─── World Events ──────────────────────────────────────────

export interface TimeAdvancedEvent extends GameEventBase {
  type: 'world:time-advanced';
  amount: number;
  unit: 'rounds' | 'minutes' | 'hours' | 'days';
  reason: string;
}

export interface TensionChangedEvent extends GameEventBase {
  type: 'world:tension-changed';
  previousScore: number;
  newScore: number;
  trend: 'rising' | 'falling' | 'stable';
  reason: string;
}

export interface ConsequenceTriggeredEvent extends GameEventBase {
  type: 'world:consequence-triggered';
  consequenceId: string;
  title: string;
  description?: string;
  trigger: string;
}

export interface QuestUpdatedEvent extends GameEventBase {
  type: 'world:quest-updated';
  questId: string;
  title: string;
  status: 'introduced' | 'active' | 'completed' | 'failed' | 'updated';
  description?: string;
  source: string;
}

// ─── Discriminated Union ─────────────────────────────────────

export type GameEvent =
  | CombatStartedEvent
  | CombatEndedEvent
  | RoundStartedEvent
  | TurnStartedEvent
  | TurnEndedEvent
  | ActionExecutedEvent
  | ActionFailedEvent
  | CreatureDamagedEvent
  | CreatureHealedEvent
  | CreatureDyingEvent
  | CreatureDeadEvent
  | CreatureStabilizedEvent
  | ConditionAppliedEvent
  | ConditionRemovedEvent
  | ReactionOpportunityEvent
  | InitiativeRolledEvent
  | RoomEnteredEvent
  | AreaDiscoveredEvent
  | TrapDetectedEvent
  | SecretFoundEvent
  | SkillCheckResultEvent
  | SocialEncounterStartEvent
  | TravelEvent
  | CraftingCompleteEvent
  | IncomeEarnedEvent
  | RetrainCompleteEvent
  | RelationshipChangedEvent
  | RumorHeardEvent
  | TimeAdvancedEvent
  | TensionChangedEvent
  | ConsequenceTriggeredEvent
  | QuestUpdatedEvent;

// ─── Subscriber Type ─────────────────────────────────────────

/** Callback signature for event subscribers */
export type GameEventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

/** Map from event type to its specific event interface — used for typed subscriptions */
export interface GameEventMap {
  'combat:started': CombatStartedEvent;
  'combat:ended': CombatEndedEvent;
  'round:started': RoundStartedEvent;
  'turn:started': TurnStartedEvent;
  'turn:ended': TurnEndedEvent;
  'action:executed': ActionExecutedEvent;
  'action:failed': ActionFailedEvent;
  'creature:damaged': CreatureDamagedEvent;
  'creature:healed': CreatureHealedEvent;
  'creature:dying': CreatureDyingEvent;
  'creature:dead': CreatureDeadEvent;
  'creature:stabilized': CreatureStabilizedEvent;
  'condition:applied': ConditionAppliedEvent;
  'condition:removed': ConditionRemovedEvent;
  'reaction:opportunity': ReactionOpportunityEvent;
  'initiative:rolled': InitiativeRolledEvent;
  'exploration:room-entered': RoomEnteredEvent;
  'exploration:area-discovered': AreaDiscoveredEvent;
  'exploration:trap-detected': TrapDetectedEvent;
  'exploration:secret-found': SecretFoundEvent;
  'exploration:skill-check': SkillCheckResultEvent;
  'exploration:social-started': SocialEncounterStartEvent;
  'exploration:travel': TravelEvent;
  'downtime:crafting-complete': CraftingCompleteEvent;
  'downtime:income-earned': IncomeEarnedEvent;
  'downtime:retrain-complete': RetrainCompleteEvent;
  'downtime:relationship-changed': RelationshipChangedEvent;
  'downtime:rumor-heard': RumorHeardEvent;
  'world:time-advanced': TimeAdvancedEvent;
  'world:tension-changed': TensionChangedEvent;
  'world:consequence-triggered': ConsequenceTriggeredEvent;
  'world:quest-updated': QuestUpdatedEvent;
}

// ─── SSE Stream Messages ───────────────────────────────────

export interface GameEventStreamMessage {
  kind: 'connected' | 'game-event';
  gameId: string;
  timestamp: number;
  message?: string;
  event?: GameEvent;
}
