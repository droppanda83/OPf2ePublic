// Combat and Game State Types
export interface Creature {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'creature';
  level: number;
  maxHealth: number;
  currentHealth: number;
  armor: number;
  positions: Position; // Current grid position
  conditions: Condition[];
  initiative: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Condition {
  name: string;
  duration: number | 'permanent'; // turns remaining, or permanent
  value?: number; // for conditions with values (e.g., frightened 2)
}

export interface Action {
  id: string;
  name: string;
  type: 'strike' | 'spell' | 'ability' | 'movement';
  actionCost: number; // 1, 2, 3, or 'reaction'
  description: string;
}

export interface CombatRound {
  number: number;
  turnOrder: string[]; // creature IDs in initiative order
  currentTurnIndex: number;
  actions: CombatAction[];
}

export interface CombatAction {
  id: string;
  creatureId: string;
  actionId: string;
  targetId?: string;
  targetPosition?: Position;
  result: 'pending' | 'executed' | 'failed';
  details?: Record<string, any>;
}

export interface EncounterMap {
  width: number;
  height: number;
  terrain: TerrainTile[][];
}

export interface TerrainTile {
  x: number;
  y: number;
  type: 'empty' | 'difficult' | 'impassable';
}

export interface GameState {
  id: string;
  name: string;
  creatures: Creature[];
  map: EncounterMap;
  currentRound: CombatRound;
  log: GameLog[];
}

export interface GameLog {
  timestamp: number;
  type: 'action' | 'damage' | 'condition' | 'death' | 'system';
  message: string;
  details?: Record<string, any>;
}

export interface DiceRoll {
  times: number;
  sides: number;
  results: number[];
  total: number;
}

export interface AttackRoll {
  attacker: string;
  target: string;
  d20: number;
  bonus: number;
  total: number;
  result: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  damage?: DamageResult;
}

export interface DamageResult {
  dice: DiceRoll;
  total: number;
  appliedDamage: number; // after resistances/immunities
}

// API Request/Response Types
export interface AITurnRequest {
  gameState: GameState;
  currentCreatureId: string;
  availableActions: Action[];
}

export interface AITurnResponse {
  action: CombatAction;
  reasoning: string;
}
