/**
 * Phase 6 — Natural Language Parser (Phase A).
 *
 * Lightweight keyword-based intent classifier. No LLM call — this
 * runs synchronously so the coordinator can decide which role
 * service to invoke without an extra round-trip.
 *
 * Phase B (future) will add an LLM fallback for ambiguous inputs.
 */

import type { PlayerIntent, PlayerIntentType, GameplayMode } from './types';

// ---------------------------------------------------------------------------
// Keyword tables
// ---------------------------------------------------------------------------

interface PatternEntry {
  type: PlayerIntentType;
  /** At least one keyword must appear. */
  keywords: string[];
  /** Optional: require current mode for match. */
  modes?: GameplayMode[];
}

const PATTERNS: PatternEntry[] = [
  // ── Combat ────────────────────────────────────────────────────────
  {
    type: 'attack',
    keywords: ['attack', 'strike', 'hit', 'slash', 'stab', 'shoot', 'smash', 'punch', 'kick', 'bite', 'claw'],
    modes: ['encounter'],
  },
  {
    type: 'cast-spell',
    keywords: ['cast', 'spell', 'cantrip', 'fireball', 'heal', 'magic missile', 'electric arc', 'shield'],
  },
  {
    type: 'move',
    keywords: ['move to', 'step to', 'stride', 'run to', 'walk to', 'go to', 'approach', 'flee', 'retreat'],
    modes: ['encounter'],
  },

  // ── Exploration ───────────────────────────────────────────────────
  {
    type: 'explore',
    keywords: ['explore', 'look around', 'search the area', 'enter the', 'go into', 'head to'],
  },
  {
    type: 'investigate',
    keywords: ['investigate', 'examine', 'inspect', 'study', 'search for', 'check the', 'perception'],
  },
  {
    type: 'use-skill',
    keywords: [
      'athletics', 'acrobatics', 'stealth', 'thievery', 'arcana', 'crafting',
      'deception', 'diplomacy', 'intimidation', 'medicine', 'nature',
      'occultism', 'performance', 'religion', 'society', 'survival',
      'climb', 'swim', 'balance', 'tumble', 'pick lock', 'disable',
      'sneak', 'hide', 'recall knowledge',
    ],
  },

  // ── Social ────────────────────────────────────────────────────────
  {
    type: 'social',
    keywords: [
      'talk to', 'speak with', 'ask about', 'persuade', 'convince',
      'negotiate', 'barter', 'haggle', 'greet', 'threaten', 'lie to',
      'request', 'chat with', 'say to',
    ],
  },

  // ── Downtime ──────────────────────────────────────────────────────
  {
    type: 'rest',
    keywords: ['rest', 'sleep', 'camp', 'long rest', 'take a break', 'recover'],
  },
  {
    type: 'shop',
    keywords: ['shop', 'buy', 'purchase', 'sell', 'store', 'merchant', 'market', 'vendor'],
  },
  {
    type: 'craft',
    keywords: ['craft', 'forge', 'brew', 'create item', 'make a'],
  },
  {
    type: 'travel',
    keywords: ['travel to', 'journey to', 'head towards', 'march to', 'ride to', 'set out for'],
  },

  // ── Encounter management ──────────────────────────────────────────
  {
    type: 'start-encounter',
    keywords: ['start encounter', 'begin combat', 'roll initiative', 'fight', 'ambush'],
  },
  {
    type: 'end-encounter',
    keywords: ['end encounter', 'end combat', 'stop fighting', 'combat over', 'victory'],
    modes: ['encounter'],
  },

  // ── Recall knowledge ─────────────────────────────────────────────
  {
    type: 'recall-knowledge',
    keywords: ['recall knowledge', 'what do i know', 'identify', 'recognize'],
  },

  // ── Meta / out-of-character ────────────────────────────────────────
  {
    type: 'meta',
    keywords: [
      'recap', 'summary', 'help', 'status', 'what happened',
      'party status', 'inventory', 'what can i do', 'options',
    ],
  },
];

// ---------------------------------------------------------------------------
// Interact keywords (requires a target noun)
// ---------------------------------------------------------------------------

const INTERACT_KEYWORDS = ['interact', 'open', 'close', 'pull', 'push', 'use', 'activate', 'pick up', 'grab', 'take'];

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class NLParser {
  /**
   * Parse a player's natural-language message into a structured intent.
   * Returns the highest-confidence match. If nothing matches, returns
   * `free-form` so the coordinator routes it to StoryAI.
   */
  parse(message: string, currentMode: GameplayMode): PlayerIntent {
    const lower = message.toLowerCase().trim();
    if (!lower) {
      return { type: 'free-form', raw: message, confidence: 0 };
    }

    let bestMatch: { type: PlayerIntentType; score: number; target?: string; detail?: string } | null = null;

    for (const pattern of PATTERNS) {
      // Mode constraint
      if (pattern.modes && !pattern.modes.includes(currentMode)) continue;

      for (const kw of pattern.keywords) {
        const idx = lower.indexOf(kw);
        if (idx === -1) continue;

        // Score: longer keyword matches are higher confidence
        const score = kw.length / lower.length;
        if (!bestMatch || score > bestMatch.score) {
          const after = lower.slice(idx + kw.length).trim();
          bestMatch = {
            type: pattern.type,
            score: Math.min(score * 1.5, 0.95), // cap below 1.0
            target: this.extractTarget(after),
            detail: this.extractDetail(lower, pattern.type),
          };
        }
      }
    }

    // Check interact keywords separately (they always need a target)
    for (const kw of INTERACT_KEYWORDS) {
      const idx = lower.indexOf(kw);
      if (idx === -1) continue;
      const after = lower.slice(idx + kw.length).trim();
      if (after.length > 0) {
        const score = kw.length / lower.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            type: 'interact',
            score: Math.min(score * 1.5, 0.95),
            target: this.extractTarget(after),
          };
        }
      }
    }

    if (bestMatch) {
      return {
        type: bestMatch.type,
        raw: message,
        target: bestMatch.target,
        detail: bestMatch.detail,
        confidence: Math.round(bestMatch.score * 100) / 100,
      };
    }

    // No pattern matched — free-form (StoryAI will handle it)
    return { type: 'free-form', raw: message, confidence: 0.1 };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /** Pull the first noun-phrase after a keyword. */
  private extractTarget(after: string): string | undefined {
    if (!after) return undefined;
    // Strip common filler words
    const cleaned = after
      .replace(/^(the|a|an|my|this|that)\s+/i, '')
      .replace(/\s*(with|using|at|on|in|from)\s+.*$/, '')
      .trim();
    return cleaned || undefined;
  }

  /** Extract secondary detail (weapon, spell, skill name). */
  private extractDetail(full: string, type: PlayerIntentType): string | undefined {
    if (type === 'attack') {
      const m = full.match(/with\s+(my\s+)?(.+?)$/i);
      return m ? m[2].trim() : undefined;
    }
    if (type === 'cast-spell') {
      const m = full.match(/cast\s+(.+?)(?:\s+on|\s+at|$)/i);
      return m ? m[1].trim() : undefined;
    }
    if (type === 'use-skill') {
      // The matched keyword IS the skill name
      return undefined;
    }
    return undefined;
  }
}
