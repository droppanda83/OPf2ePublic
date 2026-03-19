"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WFCSolver = void 0;
// ─── Solver ─────────────────────────────────────────────────
class WFCSolver {
    constructor(config, rng) {
        // Saved pre-seeds so we can re-apply on restart
        this.preseeds = [];
        this.W = config.width;
        this.H = config.height;
        this.N = config.numTypes;
        this.total = this.W * this.H;
        this.weights = config.weights.slice();
        this.adj = config.adjacency.map(row => row.slice());
        this.rng = rng;
        // Validate
        if (this.weights.length !== this.N)
            throw new Error('weights.length must equal numTypes');
        if (this.adj.length !== this.N)
            throw new Error('adjacency rows must equal numTypes');
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
    constrain(x, y, type) {
        const ci = y * this.W + x;
        this.preseeds.push({ ci, type });
        return this._constrain(ci, type);
    }
    /**
     * Remove a type possibility from a cell. Call before solve().
     * Returns false if this causes a contradiction.
     */
    ban(x, y, type) {
        const ci = y * this.W + x;
        return this._ban(ci, type);
    }
    /**
     * Run the solver. Returns a 2D grid of type indices, or null on failure.
     * Each cell will have a value in [0, numTypes).
     */
    solve(maxAttempts = 10) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0)
                this._reset();
            let ok = true;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const ci = this._lowestEntropy();
                if (ci === -1)
                    break; // all collapsed → success
                if (!this._collapse(ci)) {
                    ok = false;
                    break; // contradiction → restart
                }
            }
            if (ok)
                return this._toGrid();
        }
        return null;
    }
    // ── Internals ───────────────────────────────────────────
    _constrain(ci, type) {
        if (this.result[ci] === type)
            return true;
        if (!this.possible[ci][type])
            return false;
        // Ban every other type in this cell
        const dirty = [];
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
    _ban(ci, type) {
        if (!this.possible[ci][type])
            return true;
        this.possible[ci][type] = false;
        this.counts[ci]--;
        this.wSums[ci] -= this.weights[type];
        if (this.counts[ci] === 0)
            return false;
        // Auto-collapse if only one option left
        if (this.counts[ci] === 1) {
            for (let t = 0; t < this.N; t++) {
                if (this.possible[ci][t]) {
                    this.result[ci] = t;
                    break;
                }
            }
        }
        return this._propagate([ci]);
    }
    /**
     * Find the uncollapsed cell with the fewest remaining options.
     * Ties are broken randomly. Returns -1 when all cells are collapsed.
     */
    _lowestEntropy() {
        let minCount = this.N + 1;
        let best = [];
        for (let i = 0; i < this.total; i++) {
            if (this.result[i] >= 0)
                continue; // already collapsed
            const c = this.counts[i];
            if (c < minCount) {
                minCount = c;
                best = [i];
            }
            else if (c === minCount) {
                best.push(i);
            }
        }
        if (best.length === 0)
            return -1;
        return best[Math.floor(this.rng.next() * best.length)];
    }
    /**
     * Collapse a cell: pick one type from its remaining options
     * using weighted random selection, then propagate.
     */
    _collapse(ci) {
        if (this.counts[ci] === 0)
            return false;
        // Weighted random pick
        let r = this.rng.next() * this.wSums[ci];
        let chosen = -1;
        for (let t = 0; t < this.N; t++) {
            if (!this.possible[ci][t])
                continue;
            r -= this.weights[t];
            if (r <= 0) {
                chosen = t;
                break;
            }
        }
        // Float precision fallback
        if (chosen === -1) {
            for (let t = this.N - 1; t >= 0; t--) {
                if (this.possible[ci][t]) {
                    chosen = t;
                    break;
                }
            }
        }
        if (chosen === -1)
            return false;
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
    _propagate(stack) {
        while (stack.length > 0) {
            const ci = stack.pop();
            const cx = ci % this.W;
            const cy = (ci - cx) / this.W;
            // Cardinal neighbors
            const neighbors = [];
            if (cx > 0)
                neighbors.push(ci - 1);
            if (cx < this.W - 1)
                neighbors.push(ci + 1);
            if (cy > 0)
                neighbors.push(ci - this.W);
            if (cy < this.H - 1)
                neighbors.push(ci + this.W);
            for (const ni of neighbors) {
                if (this.result[ni] >= 0)
                    continue; // skip collapsed cells
                let neighborChanged = false;
                for (let nt = 0; nt < this.N; nt++) {
                    if (!this.possible[ni][nt])
                        continue;
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
                        if (this.counts[ni] === 0)
                            return false; // contradiction!
                        // Auto-collapse
                        if (this.counts[ni] === 1) {
                            for (let t = 0; t < this.N; t++) {
                                if (this.possible[ni][t]) {
                                    this.result[ni] = t;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (neighborChanged)
                    stack.push(ni);
            }
        }
        return true;
    }
    /** Reset all cells and re-apply pre-seeds for a fresh attempt. */
    _reset() {
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
    _toGrid() {
        const grid = [];
        for (let y = 0; y < this.H; y++) {
            const row = [];
            for (let x = 0; x < this.W; x++) {
                const r = this.result[y * this.W + x];
                row.push(r >= 0 ? r : 0); // fallback (shouldn't happen after successful solve)
            }
            grid.push(row);
        }
        return grid;
    }
}
exports.WFCSolver = WFCSolver;
