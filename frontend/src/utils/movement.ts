/**
 * Movement cost calculation with terrain and pathfinding support
 * (Frontend copy to avoid monorepo import issues during dev)
 */

import type { Creature } from '../../../shared/types';
import { calculateSpeedPenalty, getArmor } from '../../../shared/armor';

export interface Position {
  x: number;
  y: number;
}

export interface TerrainTile {
  x: number;
  y: number;
  type: 'empty' | 'difficult' | 'impassable';
}

export interface MovementCostOptions {
  maxDistance?: number;
  allowDiagonal?: boolean;
  diagonalStepCost?: number;
  diagonalCostMode?: 'pf2e-alternating' | 'euclidean';
  terrainCostMultiplier?: Partial<Record<TerrainTile['type'], number>>;
  impassableTypes?: TerrainTile['type'][];
  occupiedPositions?: Set<string>;
}

export interface MovementCostResult {
  costMap: Map<string, number>;
}

const DEFAULT_TERRAIN_COST: Record<TerrainTile['type'], number> = {
  empty: 1,
  difficult: 2,
  impassable: Number.POSITIVE_INFINITY,
};

const DEFAULT_DIAGONALS = [
  { dx: -1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 1 },
];

const CARDINAL_DIRECTIONS = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
];

const DEFAULT_DIAGONAL_COST = Math.SQRT2;
const DEFAULT_DIAGONAL_MODE: 'pf2e-alternating' | 'euclidean' = 'pf2e-alternating';

const keyFor = (x: number, y: number): string => `${x},${y}`;
const keyForParity = (x: number, y: number, parity: number): string => `${x},${y},${parity}`;

const isWithinBounds = (terrain: TerrainTile[][], x: number, y: number): boolean => {
  if (!terrain || terrain.length === 0) {
    return false;
  }
  const rows = terrain.length;
  const cols = terrain[0]?.length ?? 0;
  return x >= 0 && y >= 0 && x < cols && y < rows;
};

const resolveTerrainMultiplier = (
  tile: TerrainTile | undefined,
  overrides?: Partial<Record<TerrainTile['type'], number>>
): number => {
  const type = tile?.type ?? 'empty';
  if (overrides && overrides[type] !== undefined) {
    return overrides[type]!;
  }
  return DEFAULT_TERRAIN_COST[type] ?? 1;
};

const isImpassable = (
  tile: TerrainTile | undefined,
  overrides?: Partial<Record<TerrainTile['type'], number>>,
  extraImpassables?: TerrainTile['type'][]
): boolean => {
  const type = tile?.type ?? 'empty';
  if (extraImpassables && extraImpassables.includes(type)) {
    return true;
  }
  const baseCost = DEFAULT_TERRAIN_COST[type];
  const overrideCost = overrides?.[type];
  return baseCost === Number.POSITIVE_INFINITY || overrideCost === Number.POSITIVE_INFINITY;
};

const shouldSkipPosition = (key: string, occupied?: Set<string>): boolean => {
  return occupied ? occupied.has(key) : false;
};

export function computeMovementCostMap(
  start: Position,
  terrain: TerrainTile[][],
  options: MovementCostOptions = {}
): MovementCostResult {
  const {
    maxDistance = Number.POSITIVE_INFINITY,
    allowDiagonal = true,
    diagonalStepCost = DEFAULT_DIAGONAL_COST,
    diagonalCostMode = DEFAULT_DIAGONAL_MODE,
    terrainCostMultiplier,
    impassableTypes,
    occupiedPositions,
  } = options;

  const costMap: Map<string, number> = new Map();
  const parityCostMap: Map<string, number> = new Map();
  const frontier: Array<{ x: number; y: number; parity: number }> = [];

  const originKey = keyFor(start.x, start.y);
  const originParityKey = keyForParity(start.x, start.y, 0);
  costMap.set(originKey, 0);
  parityCostMap.set(originParityKey, 0);
  frontier.push({ x: start.x, y: start.y, parity: 0 });

  while (frontier.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < frontier.length; i++) {
      const currentKey = keyForParity(frontier[i].x, frontier[i].y, frontier[i].parity);
      const bestKey = keyForParity(frontier[bestIndex].x, frontier[bestIndex].y, frontier[bestIndex].parity);
      const currentCost = parityCostMap.get(currentKey) ?? Number.POSITIVE_INFINITY;
      const bestCost = parityCostMap.get(bestKey) ?? Number.POSITIVE_INFINITY;
      if (currentCost < bestCost) {
        bestIndex = i;
      }
    }

    const current = frontier.splice(bestIndex, 1)[0];
    const currentKey = keyFor(current.x, current.y);
    const currentParityKey = keyForParity(current.x, current.y, current.parity);
    const currentCost = parityCostMap.get(currentParityKey) ?? Number.POSITIVE_INFINITY;

    if (currentCost > maxDistance) {
      continue;
    }

    const directions = allowDiagonal
      ? [...CARDINAL_DIRECTIONS, ...DEFAULT_DIAGONALS]
      : CARDINAL_DIRECTIONS;

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      if (!isWithinBounds(terrain, nx, ny)) {
        continue;
      }

      const neighbourKey = keyFor(nx, ny);
      if (shouldSkipPosition(neighbourKey, occupiedPositions) && neighbourKey !== originKey) {
        continue;
      }

      const tile = terrain[ny]?.[nx];
      if (isImpassable(tile, terrainCostMultiplier, impassableTypes)) {
        continue;
      }

      const isDiagonal = dir.dx !== 0 && dir.dy !== 0;
      let stepCost = 1;
      let nextParity = current.parity;

      if (isDiagonal) {
        if (diagonalCostMode === 'pf2e-alternating') {
          stepCost = current.parity === 0 ? 1 : 2;
          nextParity = current.parity === 0 ? 1 : 0;
        } else {
          stepCost = diagonalStepCost;
          nextParity = current.parity;
        }
      }
      const multiplier = resolveTerrainMultiplier(tile, terrainCostMultiplier);
      const totalStepCost = stepCost * multiplier;

      if (totalStepCost === Number.POSITIVE_INFINITY) {
        continue;
      }

      const tentativeCost = currentCost + totalStepCost;
      if (tentativeCost > maxDistance + 1e-6) {
        continue;
      }

      const neighbourParityKey = keyForParity(nx, ny, nextParity);
      const existingParityCost = parityCostMap.get(neighbourParityKey);
      if (existingParityCost === undefined || tentativeCost + 1e-6 < existingParityCost) {
        parityCostMap.set(neighbourParityKey, tentativeCost);
        const existingBest = costMap.get(neighbourKey);
        if (existingBest === undefined || tentativeCost + 1e-6 < existingBest) {
          costMap.set(neighbourKey, tentativeCost);
        }
        frontier.push({ x: nx, y: ny, parity: nextParity });
      }
    }
  }

  return { costMap };
}

export function computePathCost(
  start: Position,
  goal: Position,
  terrain: TerrainTile[][],
  options: MovementCostOptions = {}
): number {
  const result = computeMovementCostMap(start, terrain, options);
  const goalKey = keyFor(goal.x, goal.y);
  return result.costMap.get(goalKey) ?? Number.POSITIVE_INFINITY;
}

export function formatMovementCost(value: number): string {
  if (!Number.isFinite(value)) {
    return '∞';
  }
  return Math.abs(value - Math.round(value)) < 0.05
    ? Math.round(value).toString()
    : value.toFixed(1);
}

/**
 * PHASE 9.4: Get effective speed including armor speed penalty
 * PF2e: Medium armor -5ft (0 if STR req met), Heavy armor -10ft (-5ft if STR req met)
 */
export function getEffectiveSpeed(creature: Creature): number {
  const baseSpeed = creature.speed ?? 25;
  
  if (!creature.equippedArmor) {
    return baseSpeed;
  }
  
  // Apply armor speed penalty
  const armor = getArmor(creature.equippedArmor);
  if (!armor) {
    return baseSpeed;
  }
  
  const speedPenalty = calculateSpeedPenalty(armor, creature.abilities?.strength ?? 0);
  return baseSpeed + speedPenalty; // Penalty is negative, so we add it
}
