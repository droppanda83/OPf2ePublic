import { Position, TerrainTile, Creature } from './types';
import { calculateSpeedPenalty, getArmor } from './armor';

export interface MovementCostOptions {
  /** Optional cap on total movement cost; Infinity by default */
  maxDistance?: number;
  /** Allow diagonal movement (default true) */
  allowDiagonal?: boolean;
  /** Cost applied to diagonal steps when they are allowed */
  diagonalStepCost?: number;
  /** Diagonal cost mode (PF2e alternates 5/10 ft) */
  diagonalCostMode?: 'pf2e-alternating' | 'euclidean';
  /** Movement cost multipliers per terrain type */
  terrainCostMultiplier?: Partial<Record<TerrainTile['type'], number>>;
  /** Additional terrain types considered impassable */
  impassableTypes?: TerrainTile['type'][];
  /** Grid positions that cannot be traversed (e.g. occupied by creatures) */
  occupiedPositions?: Set<string>;
}

export interface MovementCostResult {
  /** Map key is formatted as `${x},${y}` */
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
    // Retrieve the node with the smallest current cost (Dijkstra without a dedicated priority queue)
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

// ─── A* Pathfinding for Exploration Movement ─────────────────────────
// Finds shortest walkable path between two positions, respecting walls & impassable tiles.
// Used for exploration movement so characters walk around walls instead of through them.

/** String-based tile types that block movement */
const IMPASSABLE_TILE_TYPES = ['wall', 'water-deep', 'lava', 'pit', 'pillar', 'tree', 'rock', 'void'];

interface PathfindingOptions {
  /** Map width in tiles */
  mapWidth: number;
  /** Map height in tiles */
  mapHeight: number;
  /** Terrain array (TerrainTile[][]) – legacy terrain system */
  terrain?: TerrainTile[][];
  /** Procedural tile array (string[][]) – new tile system */
  tiles?: string[][];
  /** Per-cell movement cost override (null = use tile default). Bridges, etc. */
  moveCostOverride?: (number | null)[][];
  /** Positions occupied by other creatures (as "x,y" strings) */
  occupiedPositions?: Set<string>;
  /** Allow diagonal movement (default true) */
  allowDiagonal?: boolean;
}

/**
 * A* pathfinding: returns an array of positions from start to goal (inclusive),
 * or null if no path exists. Path avoids impassable terrain and walls.
 */
export function findExplorationPath(
  start: Position,
  goal: Position,
  options: PathfindingOptions,
): Position[] | null {
  const { mapWidth, mapHeight, terrain, tiles, moveCostOverride, occupiedPositions, allowDiagonal = true } = options;

  const isBlocked = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return true;

    // Per-cell override takes priority — if set, the cell is passable regardless of tile
    if (moveCostOverride && moveCostOverride[y]?.[x] != null) return false;

    // Check legacy terrain
    if (terrain && terrain[y] && terrain[y][x]) {
      if (terrain[y][x].type === 'impassable') return true;
    }

    // Check procedural tiles
    if (tiles && tiles[y] && tiles[y][x] !== undefined) {
      if (IMPASSABLE_TILE_TYPES.includes(tiles[y][x])) return true;
    }

    // Check occupied positions (but allow the goal itself – we already validated it)
    const key = `${x},${y}`;
    if (occupiedPositions && occupiedPositions.has(key)) {
      // Allow goal position (caller already checked it's empty)
      if (x !== goal.x || y !== goal.y) return true;
    }

    return false;
  };

  // Quick exit: goal is blocked
  if (isBlocked(goal.x, goal.y)) return null;

  const gk = (x: number, y: number) => `${x},${y}`;
  const heuristic = (a: Position, b: Position): number => {
    // Chebyshev distance (allows diagonal)
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  };

  const openSet: Array<{ pos: Position; f: number }> = [];
  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, Position>();

  const startKey = gk(start.x, start.y);
  gScore.set(startKey, 0);
  openSet.push({ pos: start, f: heuristic(start, goal) });

  const dirs = allowDiagonal
    ? [...CARDINAL_DIRECTIONS, ...DEFAULT_DIAGONALS]
    : CARDINAL_DIRECTIONS;

  while (openSet.length > 0) {
    // Find lowest f-score
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
    }
    const current = openSet.splice(bestIdx, 1)[0];
    const cx = current.pos.x;
    const cy = current.pos.y;
    const cKey = gk(cx, cy);

    // Reached goal
    if (cx === goal.x && cy === goal.y) {
      // Reconstruct path
      const path: Position[] = [];
      let cur: Position | undefined = goal;
      while (cur) {
        path.unshift({ x: cur.x, y: cur.y });
        const ck = gk(cur.x, cur.y);
        cur = cameFrom.get(ck);
      }
      return path;
    }

    const currentG = gScore.get(cKey) ?? Infinity;

    for (const d of dirs) {
      const nx = cx + d.dx;
      const ny = cy + d.dy;

      if (isBlocked(nx, ny)) continue;

      // For diagonal moves, also check that both adjacent cardinal cells are passable
      // (prevents cutting corners through walls)
      if (d.dx !== 0 && d.dy !== 0) {
        if (isBlocked(cx + d.dx, cy) || isBlocked(cx, cy + d.dy)) continue;
      }

      const stepCost = (d.dx !== 0 && d.dy !== 0) ? 1.414 : 1;
      const tentativeG = currentG + stepCost;
      const nKey = gk(nx, ny);
      const existingG = gScore.get(nKey) ?? Infinity;

      if (tentativeG < existingG - 0.001) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, { x: cx, y: cy });
        const f = tentativeG + heuristic({ x: nx, y: ny }, goal);
        openSet.push({ pos: { x: nx, y: ny }, f });
      }
    }
  }

  // No path found
  return null;
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