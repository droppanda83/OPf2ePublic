/**
 * Phase 7 — Character Knowledge Tracker.
 *
 * Implements Principle #12: Information Asymmetry via Recall Knowledge.
 * Tracks what each character has learned through Recall Knowledge checks,
 * NPC conversations, and environmental discovery. The AI GM uses this
 * to filter narration detail per-character.
 */

import type { KnowledgeEntry, CharacterKnowledge } from './types';

export class CharacterKnowledgeTracker {
  private knowledge: Map<string, CharacterKnowledge> = new Map();

  constructor(initial?: CharacterKnowledge[]) {
    if (initial) {
      for (const ck of initial) {
        this.knowledge.set(ck.characterId, { ...ck, entries: [...ck.entries] });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════════════════

  /** Get all knowledge for a character. */
  getForCharacter(characterId: string): KnowledgeEntry[] {
    return this.knowledge.get(characterId)?.entries || [];
  }

  /** Get knowledge about a specific subject for a character. */
  getAbout(characterId: string, subject: string): KnowledgeEntry | undefined {
    const entries = this.getForCharacter(characterId);
    const lower = subject.toLowerCase();
    return entries.find(e => e.subject.toLowerCase() === lower);
  }

  /**
   * Get the best knowledge about a subject across all characters.
   * Returns the entry with the highest degree of success.
   */
  getBestKnowledge(subject: string): KnowledgeEntry | undefined {
    const lower = subject.toLowerCase();
    const degreeOrder = ['critical-success', 'success', 'failure', 'critical-failure'];
    let best: KnowledgeEntry | undefined;
    let bestIdx = degreeOrder.length;

    for (const ck of this.knowledge.values()) {
      for (const entry of ck.entries) {
        if (entry.subject.toLowerCase() === lower) {
          const idx = degreeOrder.indexOf(entry.degree);
          if (idx < bestIdx) {
            bestIdx = idx;
            best = entry;
          }
        }
      }
    }

    return best;
  }

  /** Check if any character knows about a subject (success or better). */
  partyKnows(subject: string): boolean {
    const best = this.getBestKnowledge(subject);
    return !!best && (best.degree === 'success' || best.degree === 'critical-success');
  }

  /** Get all known subjects across all characters. */
  getAllKnownSubjects(): string[] {
    const subjects = new Set<string>();
    for (const ck of this.knowledge.values()) {
      for (const entry of ck.entries) {
        if (entry.degree === 'success' || entry.degree === 'critical-success') {
          subjects.add(entry.subject);
        }
      }
    }
    return Array.from(subjects);
  }

  /**
   * Build a knowledge context string for AI prompts.
   * Describes what the party collectively knows about subjects mentioned.
   */
  buildKnowledgeContext(mentionedSubjects: string[]): string {
    if (mentionedSubjects.length === 0) return '';

    const lines: string[] = [];
    for (const subject of mentionedSubjects) {
      const best = this.getBestKnowledge(subject);
      if (!best) continue;

      switch (best.degree) {
        case 'critical-success':
          lines.push(`${subject}: [DETAILED] ${best.revealedInfo}`);
          break;
        case 'success':
          lines.push(`${subject}: [KNOWN] ${best.revealedInfo}`);
          break;
        case 'failure':
          lines.push(`${subject}: [VAGUE] Party has only vague knowledge`);
          break;
        case 'critical-failure':
          lines.push(`${subject}: [MISLEADING] Party may have incorrect information`);
          break;
      }
    }

    return lines.length > 0 ? `Party knowledge:\n${lines.join('\n')}` : '';
  }

  /** Get all character knowledge records (for persistence). */
  getAll(): CharacterKnowledge[] {
    return Array.from(this.knowledge.values());
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Mutations
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Record a Recall Knowledge result for a character.
   * If the character already knows about this subject, only upgrade
   * (never downgrade from a prior success).
   */
  recordKnowledge(entry: KnowledgeEntry): void {
    let ck = this.knowledge.get(entry.characterId);
    if (!ck) {
      ck = { characterId: entry.characterId, characterName: '', entries: [] };
      this.knowledge.set(entry.characterId, ck);
    }

    // Check for existing knowledge about the same subject
    const existing = ck.entries.find(
      e => e.subject.toLowerCase() === entry.subject.toLowerCase(),
    );

    if (existing) {
      // Only upgrade knowledge, never downgrade
      const degreeRank = { 'critical-success': 0, 'success': 1, 'failure': 2, 'critical-failure': 3 };
      if (degreeRank[entry.degree] < degreeRank[existing.degree]) {
        existing.degree = entry.degree;
        existing.revealedInfo = entry.revealedInfo;
        existing.learnedAt = entry.learnedAt;
      }
    } else {
      ck.entries.push({ ...entry });
    }
  }

  /**
   * Register a character (sets their name for display).
   */
  registerCharacter(characterId: string, characterName: string): void {
    let ck = this.knowledge.get(characterId);
    if (!ck) {
      ck = { characterId, characterName, entries: [] };
      this.knowledge.set(characterId, ck);
    } else {
      ck.characterName = characterName;
    }
  }

  /**
   * Record "free" knowledge (learned through NPC conversation,
   * environmental discovery, etc. — not from a Recall Knowledge check).
   */
  recordDiscovery(
    characterId: string,
    subject: string,
    category: KnowledgeEntry['category'],
    info: string,
  ): void {
    this.recordKnowledge({
      subject,
      category,
      degree: 'success',
      characterId,
      revealedInfo: info,
      learnedAt: Date.now(),
    });
  }

  /**
   * Record knowledge for ALL party members (e.g. something revealed publicly).
   */
  recordPartyKnowledge(
    characterIds: string[],
    subject: string,
    category: KnowledgeEntry['category'],
    info: string,
  ): void {
    for (const id of characterIds) {
      this.recordDiscovery(id, subject, category, info);
    }
  }

  /** Load from saved state (full replacement). */
  load(data: CharacterKnowledge[]): void {
    this.knowledge.clear();
    for (const ck of data) {
      this.knowledge.set(ck.characterId, { ...ck, entries: [...ck.entries] });
    }
  }
}
