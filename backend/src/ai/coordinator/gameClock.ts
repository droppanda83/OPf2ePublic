/**
 * Phase 6 — In-Game Clock.
 *
 * Tracks narrative time-of-day, day count, and season. Advances
 * proportionally based on gameplay mode:
 *   - Encounter: ~10 min per round
 *   - Exploration: ~1 hour per scene
 *   - Travel: ~4 hours per scene
 *   - Social: ~30 min per scene
 *   - Downtime: ~8 hours per scene (one "activity block")
 *
 * The clock is integrated into narration context so the AI can
 * reference dawn / dusk / night in its descriptions.
 */

import type { InGameClock, TimeOfDay, Season, GameplayMode } from './types';
import { DEFAULT_CLOCK } from './types';

/** Hours per mode-scene advance. */
const MODE_HOURS: Record<GameplayMode, number> = {
  encounter: 0.17,   // ~10 minutes
  exploration: 1,
  travel: 4,
  social: 0.5,
  downtime: 8,
};

const TIME_OF_DAY_RANGES: [number, number, TimeOfDay][] = [
  [5, 7, 'dawn'],
  [7, 12, 'morning'],
  [12, 17, 'afternoon'],
  [17, 19, 'dusk'],
  [19, 22, 'evening'],
  // 22-5 = night (default)
];

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export class GameClock {
  private state: InGameClock;

  constructor(initial?: InGameClock) {
    this.state = initial ? { ...initial } : { ...DEFAULT_CLOCK };
  }

  // ── Queries ──────────────────────────────────────────────────────────

  getState(): InGameClock {
    return { ...this.state };
  }

  getTimeOfDay(): TimeOfDay {
    return this.state.timeOfDay;
  }

  getDay(): number {
    return this.state.day;
  }

  isDaytime(): boolean {
    return this.state.hour >= 6 && this.state.hour < 20;
  }

  hasDonenDailyPrep(): boolean {
    return this.state.dailyPrepDone;
  }

  /** Produce a short narration-friendly time string. */
  describeTime(): string {
    return `Day ${this.state.day}, ${this.state.timeOfDay} (${this.state.season})`;
  }

  // ── Mutations ────────────────────────────────────────────────────────

  /**
   * Advance the clock by one "scene" in the given mode.
   * Returns true if a new day started (triggers daily-prep prompt).
   */
  advanceScene(mode: GameplayMode): boolean {
    const hours = MODE_HOURS[mode];
    return this.advanceHours(hours);
  }

  /** Advance an explicit number of hours (e.g. 8 hours for long rest). */
  advanceHours(hours: number): boolean {
    const previousDay = this.state.day;
    this.state.hour += hours;

    // Roll over days
    while (this.state.hour >= 24) {
      this.state.hour -= 24;
      this.state.day++;
      this.state.dailyPrepDone = false;

      // Advance season every 90 days
      if (this.state.day % 90 === 0) {
        const idx = SEASONS.indexOf(this.state.season);
        this.state.season = SEASONS[(idx + 1) % SEASONS.length];
      }
    }

    this.state.timeOfDay = this.resolveTimeOfDay(this.state.hour);
    this.state.lastAdvanced = Date.now();

    return this.state.day > previousDay;
  }

  /** Mark daily preparations as done. */
  completeDailyPrep(): void {
    this.state.dailyPrepDone = true;
  }

  /** Restore from a saved session. */
  load(saved: InGameClock): void {
    this.state = { ...saved };
  }

  /**
   * Rest the party: advance 8 hours (long rest).
   * Returns true if a new day started.
   */
  longRest(): boolean {
    const newDay = this.advanceHours(8);
    return newDay;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private resolveTimeOfDay(hour: number): TimeOfDay {
    for (const [start, end, tod] of TIME_OF_DAY_RANGES) {
      if (hour >= start && hour < end) return tod;
    }
    return 'night';
  }
}
