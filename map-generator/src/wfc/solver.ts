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

// ─── Configuration ──────────────────────────────────────────

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

// ─── Solver ─────────────────────────────────────────────────

export class WFCSolver {
  private readonly W: number;
  private readonly H: number;
  private readonly N: number;
  private readonly total: number;
  private readonly weights: number[];
  private readonly adj: boolean[][];
  private readonly rng: WFCRng;

  // Per-cell state arrays (indexed by flat cell index = y * W + x)
  private possible: boolean[][];   // [cellIdx][typeIdx]
  private counts: number[];        // # remaining possibilities
  private wSums: number[];         // sum of weights of remaining possibilities
  private result: number[];        // collapsed type (-1 = uncollapsed)

  // Saved pre-seeds so we can re-apply on restart
  private readonly preseeds: { ci: number; type: number }[] = [];

  constructor(config: WFCSolverConfig, rng: WFCRng) {
    this.W = config.width;
    this.H = config.height;
    this.N = config.numTypes;
    this.total = this.W * this.H;
    this.weights = config.weights.slice();
    this.adj = config.adjacency.map(row => row.slice());
    this.rng = rng;

    // Validate
    if (this.weights.length !== this.N) throw new Error('weights.length must equal numTypes');
    if (this.adj.length !== this.N) throw new Error('adjacency rows must equal numTypes');

    const totalW = this.weights.reduce((a, b) => a + b, 0);
    this.possible = Array.from({ length: this.total }, () => Array(this.N).fill(true));
    this.counts = Array(this.total).fill(this.N);
    this.wSums = Array(this.total).fill(totalW);
    this.result = Array(this.total).fill(-1);
  }

  // ── Public API ──────────────────────────────────────────

  /**
   * Force a cell to a specific type. Call before solve().
   * Returns false if this immediately causes a contradiction.
   */
  constrain(x: number, y: number, type: number): boolean {
    const ci = y * this.W + x;
    this.preseeds.push({ ci, type });
    return this._constrain(ci, type);
  }

  /**
   * Remove a type possibility from a cell. Call before solve().
   * Returns false if this causes a contradiction.
   */
  ban(x: number, y: number, type: number): boolean {
    const ci = y * this.W + x;
    return this._ban(ci, type);
  }

  /**
   * Run the solver. Returns a 2D grid of type indices, or null on failure.
   * Each cell will have a value in [0, numTypes).
   */
  solve(maxAttempts = 10): number[][] | null {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) this._reset();

      let ok = true;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const ci = this._lowestEntropy();
        if (ci === -1) break;       // all collapsed → success
        if (!this._collapse(ci)) {
          ok = false;
          break;                    // contradiction → restart
        }
      }

      if (ok) return this._toGrid();
    }
    return null;
  }

  // ── Internals ───────────────────────────────────────────

  private _constrain(ci: number, type: number): boolean {
    if (this.result[ci] === type) return true;
    if (!this.possible[ci][type]) return false;

    // Ban every other type in this cell
    const dirty: number[] = [];
    for (let t = 0; t < this.N; t++) {
      if (t !== type && this.possible[ci][t]) {
        this.possible[ci][t] = false;
        this.wSums[ci] -= this.weights[t];
      }
    }
    this.counts[ci] = 1;
    this.result[ci] = type;
    dirty.push(ci);
    return this._propagate(dirty);
  }

  private _ban(ci: number, type: number): boolean {
    if (!this.possible[ci][type]) return true;

    this.possible[ci][type] = false;
    this.counts[ci]--;
    this.wSums[ci] -= this.weights[type];

    if (this.counts[ci] === 0) return false;

    // Auto-collapse if only one option left
    if (this.counts[ci] === 1) {
      for (let t = 0; t < this.N; t++) {
        if (this.possible[ci][t]) { this.result[ci] = t; break; }
      }
    }
    return this._propagate([ci]);
  }

  /**
   * Find the uncollapsed cell with the fewest remaining options.
   * Ties are broken randomly. Returns -1 when all cells are collapsed.
   */
  private _lowestEntropy(): number {
    let minCount = this.N + 1;
    let best: number[] = [];

    for (let i = 0; i < this.total; i++) {
      if (this.result[i] >= 0) continue; // already collapsed
      const c = this.counts[i];
      if (c < minCount) {
        minCount = c;
        best = [i];
      } else if (c === minCount) {
        best.push(i);
      }
    }
    if (best.length === 0) return -1;
    return best[Math.floor(this.rng.next() * best.length)];
  }

  /**
   * Collapse a cell: pick one type from its remaining options
   * using weighted random selection, then propagate.
   */
  private _collapse(ci: number): boolean {
    if (this.counts[ci] === 0) return false;

    // Weighted random pick
    let r = this.rng.next() * this.wSums[ci];
    let chosen = -1;
    for (let t = 0; t < this.N; t++) {
      if (!this.possible[ci][t]) continue;
      r -= this.weights[t];
      if (r <= 0) { chosen = t; break; }
    }
    // Float precision fallback
    if (chosen === -1) {
      for (let t = this.N - 1; t >= 0; t--) {
        if (this.possible[ci][t]) { chosen = t; break; }
      }
    }
    if (chosen === -1) return false;

    // Ban everything else
    for (let t = 0; t < this.N; t++) {
      if (t !== chosen && this.possible[ci][t]) {
        this.possible[ci][t] = false;
        this.wSums[ci] -= this.weights[t];
      }
    }
    this.counts[ci] = 1;
    this.result[ci] = chosen;

    return this._propagate([ci]);
  }

  /**
   * Arc-consistency propagation (AC-3 style).
   *
   * For each modified cell in the stack, inspect all 4 neighbors.
   * For each possible type in a neighbor, check if it's compatible with
   * at least one remaining type in the modified cell.  If not, remove it.
   * Removed types may cascade to further neighbors.
   */
  private _propagate(stack: number[]): boolean {
    while (stack.length > 0) {
      const ci = stack.pop()!;
      const cx = ci % this.W;
      const cy = (ci - cx) / this.W;

      // Cardinal neighbors
      const neighbors: number[] = [];
      if (cx > 0)          neighbors.push(ci - 1);
      if (cx < this.W - 1) neighbors.push(ci + 1);
      if (cy > 0)          neighbors.push(ci - this.W);
      if (cy < this.H - 1) neighbors.push(ci + this.W);

      for (const ni of neighbors) {
        if (this.result[ni] >= 0) continue; // skip collapsed cells

        let neighborChanged = false;

        for (let nt = 0; nt < this.N; nt++) {
          if (!this.possible[ni][nt]) continue;

          // Is nt compatible with ANY remaining type in ci?
          let compatible = false;
          for (let ct = 0; ct < this.N; ct++) {
            if (this.possible[ci][ct] && this.adj[ct][nt]) {
              compatible = true;
              break;
            }
          }

          if (!compatible) {
            this.possible[ni][nt] = false;
            this.counts[ni]--;
            this.wSums[ni] -= this.weights[nt];
            neighborChanged = true;

            if (this.counts[ni] === 0) return false; // contradiction!

            // Auto-collapse
            if (this.counts[ni] === 1) {
              for (let t = 0; t < this.N; t++) {
                if (this.possible[ni][t]) { this.result[ni] = t; break; }
              }
            }
          }
        }

        if (neighborChanged) stack.push(ni);
      }
    }
    return true;
  }

  /** Reset all cells and re-apply pre-seeds for a fresh attempt. */
  private _reset(): void {
    const totalW = this.weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < this.total; i++) {
      this.possible[i] = Array(this.N).fill(true);
      this.counts[i] = this.N;
      this.wSums[i] = totalW;
      this.result[i] = -1;
    }
    for (const { ci, type } of this.preseeds) {
      this._constrain(ci, type);
    }
  }

  /** Convert flat result array to height × width 2D grid. */
  private _toGrid(): number[][] {
    const grid: number[][] = [];
    for (let y = 0; y < this.H; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.W; x++) {
        const r = this.result[y * this.W + x];
        row.push(r >= 0 ? r : 0); // fallback (shouldn't happen after successful solve)
      }
      grid.push(row);
    }
    return grid;
  }
}
