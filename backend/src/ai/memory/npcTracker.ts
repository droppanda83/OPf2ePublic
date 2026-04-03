/**
 * Phase 7 — NPC Relationship Tracker.
 *
 * Tracks all named NPCs, their dispositions, interaction history,
 * and relationship dynamics. Integrates with the RecurringNPC type
 * from shared/types.ts but adds richer tracking for the memory system.
 */

import type { RecurringNPC } from 'pf2e-shared';

/** Maximum interactions to keep per NPC (older ones are summarized). */
const MAX_INTERACTIONS = 30;

/** Disposition labels for narration context. */
const DISPOSITION_LABELS: [number, string][] = [
  [-100, 'hostile'],
  [-60, 'unfriendly'],
  [-20, 'indifferent-negative'],
  [20, 'indifferent'],
  [60, 'friendly'],
  [100, 'helpful'],
];

export class NPCTracker {
  private npcs: Map<string, RecurringNPC> = new Map();

  constructor(initialNPCs?: RecurringNPC[]) {
    if (initialNPCs) {
      for (const npc of initialNPCs) {
        this.npcs.set(npc.id, { ...npc });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════════════════

  getAll(): RecurringNPC[] {
    return Array.from(this.npcs.values());
  }

  getById(id: string): RecurringNPC | undefined {
    return this.npcs.get(id);
  }

  getByName(name: string): RecurringNPC | undefined {
    const lower = name.toLowerCase();
    for (const npc of this.npcs.values()) {
      if (npc.name.toLowerCase() === lower) return npc;
    }
    return undefined;
  }

  /** Get all living NPCs. */
  getLiving(): RecurringNPC[] {
    return this.getAll().filter(n => n.isAlive);
  }

  /** Get NPCs by role. */
  getByRole(role: RecurringNPC['role']): RecurringNPC[] {
    return this.getAll().filter(n => n.role === role);
  }

  /** Get NPCs at a specific location. */
  getAtLocation(location: string): RecurringNPC[] {
    const lower = location.toLowerCase();
    return this.getAll().filter(
      n => n.location?.toLowerCase().includes(lower),
    );
  }

  /** Get a human-readable disposition label for an NPC. */
  getDispositionLabel(id: string): string {
    const npc = this.npcs.get(id);
    if (!npc) return 'unknown';
    for (const [threshold, label] of DISPOSITION_LABELS) {
      if (npc.disposition <= threshold) return label;
    }
    return 'helpful';
  }

  /**
   * Build a compact NPC context string for AI prompts.
   * Includes only NPCs relevant to the current scene.
   */
  buildContextForScene(npcNamesInScene: string[]): string {
    if (npcNamesInScene.length === 0) return '';

    const lines: string[] = [];
    for (const name of npcNamesInScene) {
      const npc = this.getByName(name);
      if (!npc) continue;

      const disp = this.getDispositionLabel(npc.id);
      const recentInteraction = npc.interactions.length > 0
        ? npc.interactions[npc.interactions.length - 1].summary
        : 'no prior interaction';

      lines.push(
        `${npc.name} (${npc.role}, ${disp}): ${npc.description.slice(0, 80)}. Last: ${recentInteraction.slice(0, 60)}`,
      );
    }

    return lines.length > 0 ? `NPCs present:\n${lines.join('\n')}` : '';
  }

  /**
   * Build a full relationship summary for session summaries.
   */
  buildRelationshipSummary(): string {
    const living = this.getLiving();
    if (living.length === 0) return 'No known NPCs.';

    const groups = {
      allies: living.filter(n => n.disposition >= 60),
      friendly: living.filter(n => n.disposition >= 20 && n.disposition < 60),
      neutral: living.filter(n => n.disposition > -20 && n.disposition < 20),
      unfriendly: living.filter(n => n.disposition <= -20 && n.disposition > -60),
      hostile: living.filter(n => n.disposition <= -60),
    };

    const parts: string[] = [];
    if (groups.allies.length) parts.push(`Allies: ${groups.allies.map(n => n.name).join(', ')}`);
    if (groups.friendly.length) parts.push(`Friendly: ${groups.friendly.map(n => n.name).join(', ')}`);
    if (groups.neutral.length) parts.push(`Neutral: ${groups.neutral.map(n => n.name).join(', ')}`);
    if (groups.unfriendly.length) parts.push(`Unfriendly: ${groups.unfriendly.map(n => n.name).join(', ')}`);
    if (groups.hostile.length) parts.push(`Hostile: ${groups.hostile.map(n => n.name).join(', ')}`);

    return parts.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Mutations
  // ═══════════════════════════════════════════════════════════════════════

  /** Register a new NPC or update an existing one. */
  upsert(npc: RecurringNPC): void {
    this.npcs.set(npc.id, { ...npc });
  }

  /** Adjust disposition by delta, clamped to [-100, 100]. */
  adjustDisposition(id: string, delta: number, reason: string): void {
    const npc = this.npcs.get(id);
    if (!npc) return;
    npc.disposition = Math.max(-100, Math.min(100, npc.disposition + delta));
    this.recordInteraction(id, `Disposition ${delta >= 0 ? '+' : ''}${delta}: ${reason}`);
  }

  /** Record an interaction with an NPC. */
  recordInteraction(id: string, summary: string): void {
    const npc = this.npcs.get(id);
    if (!npc) return;
    npc.interactions.push({ summary, timestamp: Date.now() });

    // Trim old interactions
    if (npc.interactions.length > MAX_INTERACTIONS) {
      npc.interactions = npc.interactions.slice(-MAX_INTERACTIONS);
    }
  }

  /** Update NPC location. */
  setLocation(id: string, location: string): void {
    const npc = this.npcs.get(id);
    if (npc) npc.location = location;
  }

  /** Mark NPC as dead. */
  kill(id: string): void {
    const npc = this.npcs.get(id);
    if (npc) {
      npc.isAlive = false;
      this.recordInteraction(id, 'Died');
    }
  }

  /** Change NPC role (e.g. neutral → ally after a quest). */
  setRole(id: string, role: RecurringNPC['role']): void {
    const npc = this.npcs.get(id);
    if (npc) npc.role = role;
  }

  /** Apply batch disposition changes (from StoryAI responses). */
  applyDispositionChanges(changes: Record<string, number>): void {
    for (const [name, delta] of Object.entries(changes)) {
      const npc = this.getByName(name);
      if (npc) {
        this.adjustDisposition(npc.id, delta, 'Story interaction');
      }
    }
  }

  /** Sync from GMSession's recurringNPCs (two-way merge). */
  syncFromSession(sessionNPCs: RecurringNPC[]): void {
    for (const npc of sessionNPCs) {
      const existing = this.npcs.get(npc.id);
      if (!existing) {
        this.npcs.set(npc.id, { ...npc });
      } else {
        // Merge: take the newer disposition, combine interactions
        existing.disposition = npc.disposition;
        existing.isAlive = npc.isAlive;
        existing.location = npc.location || existing.location;
        existing.role = npc.role;
        // Add any new interactions
        const existingTimestamps = new Set(existing.interactions.map(i => i.timestamp));
        for (const interaction of npc.interactions) {
          if (!existingTimestamps.has(interaction.timestamp)) {
            existing.interactions.push(interaction);
          }
        }
      }
    }
  }

  /** Export back to RecurringNPC[] for session sync. */
  exportToSession(): RecurringNPC[] {
    return this.getAll().map(n => ({ ...n }));
  }

  /** Load from a saved array (full replacement). */
  load(npcs: RecurringNPC[]): void {
    this.npcs.clear();
    for (const npc of npcs) {
      this.npcs.set(npc.id, { ...npc });
    }
  }
}
