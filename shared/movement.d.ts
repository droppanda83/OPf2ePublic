import { Position, TerrainTile, Creature } from './types';
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
export declare function computeMovementCostMap(start: Position, terrain: TerrainTile[][], options?: MovementCostOptions): MovementCostResult;
export declare function computePathCost(start: Position, goal: Position, terrain: TerrainTile[][], options?: MovementCostOptions): number;
export declare function formatMovementCost(value: number): string;
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
export declare function findExplorationPath(start: Position, goal: Position, options: PathfindingOptions): Position[] | null;
/**
 * PHASE 9.4: Get effective speed including armor speed penalty
 * PF2e: Medium armor -5ft (0 if STR req met), Heavy armor -10ft (-5ft if STR req met)
 */
export declare function getEffectiveSpeed(creature: Creature): number;
export {};
