import { Position, TerrainTile } from './types';
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
