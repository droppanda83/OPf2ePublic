/**
 * Wave Function Collapse (WFC) Solver
 * ====================================
 *
 * A constraint-based procedural generation algorithm that fills a 2D grid
 * with terrain types while respecting adjacency rules.
 *
 * How it works:
 * 1. Each cell starts with all terrain types as possibilities
 * 2. The cell with fewest possibilities (lowest entropy) is "collapsed" —
 *    one type is chosen via weighted random selection
 * 3. Constraints propagate to neighbors: incompatible types are removed
 * 4. Repeat until all cells are collapsed or a contradiction occurs
 * 5. On contradiction, restart from scratch (up to maxAttempts)
 *
 * Usage:
 *   const solver = new WFCSolver(config, rng);
 *   solver.constrain(5, 3, WATER);   // force cell (5,3) to WATER
 *   solver.ban(10, 8, STONE);        // prevent STONE at (10,8)
 *   const grid = solver.solve();      // returns number[][] or null
 */
export interface WFCSolverConfig {
    /** Grid width in cells */
    width: number;
    /** Grid height in cells */
    height: number;
    /** Number of distinct terrain / tile types */
    numTypes: number;
    /** Weight for each type index — higher weight → more likely to appear */
    weights: number[];
    /**
     * Symmetric adjacency matrix: adjacency[a][b] = true means type `a`
     * can be horizontally or vertically adjacent to type `b`.
     * Must satisfy adjacency[a][b] === adjacency[b][a].
     */
    adjacency: boolean[][];
}
/** Minimal RNG interface — any object with a next() returning [0,1) works. */
export interface WFCRng {
    next(): number;
}
export declare class WFCSolver {
    private readonly W;
    private readonly H;
    private readonly N;
    private readonly total;
    private readonly weights;
    private readonly adj;
    private readonly rng;
    private possible;
    private counts;
    private wSums;
    private result;
    private readonly preseeds;
    constructor(config: WFCSolverConfig, rng: WFCRng);
    /**
     * Force a cell to a specific type. Call before solve().
     * Returns false if this immediately causes a contradiction.
     */
    constrain(x: number, y: number, type: number): boolean;
    /**
     * Remove a type possibility from a cell. Call before solve().
     * Returns false if this causes a contradiction.
     */
    ban(x: number, y: number, type: number): boolean;
    /**
     * Run the solver. Returns a 2D grid of type indices, or null on failure.
     * Each cell will have a value in [0, numTypes).
     */
    solve(maxAttempts?: number): number[][] | null;
    private _constrain;
    private _ban;
    /**
     * Find the uncollapsed cell with the fewest remaining options.
     * Ties are broken randomly. Returns -1 when all cells are collapsed.
     */
    private _lowestEntropy;
    /**
     * Collapse a cell: pick one type from its remaining options
     * using weighted random selection, then propagate.
     */
    private _collapse;
    /**
     * Arc-consistency propagation (AC-3 style).
     *
     * For each modified cell in the stack, inspect all 4 neighbors.
     * For each possible type in a neighbor, check if it's compatible with
     * at least one remaining type in the modified cell.  If not, remove it.
     * Removed types may cascade to further neighbors.
     */
    private _propagate;
    /** Reset all cells and re-apply pre-seeds for a fresh attempt. */
    private _reset;
    /** Convert flat result array to height × width 2D grid. */
    private _toGrid;
}
