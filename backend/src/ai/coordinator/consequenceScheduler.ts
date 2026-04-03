/**
 * Phase 6 — Consequence Scheduler.
 *
 * Tracks pending consequences produced by StoryAI and fires them
 * when their trigger conditions are met (mode transitions, scene
 * count, or explicit condition strings).
 */

import type { PendingConsequence } from '../roles/types';
import type { ConsequenceEntry, ConsequenceStatus, GameplayMode } from './types';

export class ConsequenceScheduler {
  private ledger: ConsequenceEntry[] = [];
  private sceneCounter = 0;

  // ── Queries ──────────────────────────────────────────────────────────

  /** All consequences regardless of status. */
  getAll(): ConsequenceEntry[] {
    return [...this.ledger];
  }

  /** Only consequences that haven't fired / expired / been cancelled. */
  getPending(): ConsequenceEntry[] {
    return this.ledger.filter(c => c.status === 'pending');
  }

  /** Return the current scene counter (useful for display / debug). */
  getSceneCount(): number {
    return this.sceneCounter;
  }

  // ── Mutations ────────────────────────────────────────────────────────

  /** Ingest new consequences from a StoryAI response. */
  add(consequences: PendingConsequence[]): void {
    for (const c of consequences) {
      // Avoid duplicates by id
      if (this.ledger.some(e => e.id === c.id)) continue;
      this.ledger.push({
        ...c,
        status: 'pending',
        createdAtScene: this.sceneCounter,
        expiresAfterScenes: this.parseExpiry(c.timing),
      });
    }
  }

  /** Cancel a consequence by id (e.g. player prevented the event). */
  cancel(id: string): boolean {
    const entry = this.ledger.find(e => e.id === id);
    if (!entry || entry.status !== 'pending') return false;
    entry.status = 'cancelled';
    return true;
  }

  /**
   * Evaluate all pending consequences against current conditions.
   * Returns the ones that fired this tick.
   *
   * Call this on every mode transition and at the start of each
   * coordinator turn.
   */
  evaluate(context: ConsequenceContext): ConsequenceEntry[] {
    this.sceneCounter++;
    const triggered: ConsequenceEntry[] = [];

    for (const entry of this.ledger) {
      if (entry.status !== 'pending') continue;

      // Expire old consequences
      if (
        entry.expiresAfterScenes !== undefined &&
        this.sceneCounter - entry.createdAtScene > entry.expiresAfterScenes
      ) {
        entry.status = 'expired';
        continue;
      }

      if (this.shouldTrigger(entry, context)) {
        entry.status = 'triggered';
        triggered.push(entry);
      }
    }

    return triggered;
  }

  /** Replace the entire ledger (e.g. when loading from saved session). */
  loadLedger(entries: ConsequenceEntry[]): void {
    this.ledger = entries;
  }

  /** Re-set scene counter (e.g. when loading from saved session). */
  setSceneCount(n: number): void {
    this.sceneCounter = n;
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private shouldTrigger(entry: ConsequenceEntry, ctx: ConsequenceContext): boolean {
    const t = entry.timing.toLowerCase().trim();

    // "next-scene" fires on the very next evaluation after creation
    if (t === 'next-scene') {
      return this.sceneCounter > entry.createdAtScene;
    }

    // "next-session" — we can't detect session boundaries in-process,
    // so treat it as 6+ scenes ahead (≈ one short session)
    if (t === 'next-session') {
      return this.sceneCounter - entry.createdAtScene >= 6;
    }

    // "when-<condition>" — keyword match against the current context
    if (t.startsWith('when-')) {
      const condition = t.slice(5).trim();
      return this.matchCondition(condition, ctx);
    }

    // Unknown timing — fire after 3 scenes as safety valve
    return this.sceneCounter - entry.createdAtScene >= 3;
  }

  /**
   * Simple keyword match for "when-<condition>" consequences.
   * Looks for the condition phrase in recent chat, current mode,
   * and NPC names present in the scene.
   */
  private matchCondition(condition: string, ctx: ConsequenceContext): boolean {
    const words = condition.toLowerCase().split(/\s+/);

    // Check if the condition keywords appear in the combined context blob
    const blob = [
      ctx.currentMode,
      ctx.recentPlayerMessage,
      ...ctx.npcsInScene,
    ].join(' ').toLowerCase();

    // All words must appear (loose AND match)
    return words.every(w => blob.includes(w));
  }

  /** Map timing strings to an expiry scene count. */
  private parseExpiry(timing: string): number | undefined {
    const t = timing.toLowerCase().trim();
    if (t === 'next-scene') return 2; // generous buffer
    if (t === 'next-session') return 12;
    if (t.startsWith('when-')) return 20; // long-running
    return 10; // default
  }
}

// ---------------------------------------------------------------------------
// Context passed into evaluate()
// ---------------------------------------------------------------------------

export interface ConsequenceContext {
  currentMode: GameplayMode;
  recentPlayerMessage: string;
  npcsInScene: string[];
  tensionScore: number;
}
