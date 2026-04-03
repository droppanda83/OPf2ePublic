/**
 * NarratorAI — Reactive combat/exploration narration service.
 *
 * Listens to game events and produces contextual narrative text.
 * Uses the 'narrator' LLM role (fast, creative, small model).
 * Falls back to template narration if the LLM is unavailable or too slow.
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — narration is flavor only, never modifies state
 *   #5  KV Cache-Aware — static system prompt cached, dynamic context appended
 *   #6  Role Specialization — tiny focused prompt (~1K tokens input)
 *   #8  Graceful Degradation — 3s timeout, then template fallback
 *   #12 Information Asymmetry — creature detail filtered by Recall Knowledge
 *   #16 Anti-Repetition — tracks recent vocabulary, injects avoidance hints
 */
import type { GameState, Creature } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import type { RoleDependencies, NarrationRequest, NarrationResponse } from './types';

// ─── System Prompt (static — cached by KV cache on local models) ────

const NARRATOR_SYSTEM_PROMPT = `You are the Narrator for a solo PF2e campaign. Your ONLY job is to describe combat and exploration events with vivid, concise prose.

Rules:
- NEVER reference game mechanics, dice rolls, numbers, or rules. Only narrate what characters SEE and FEEL.
- Keep narration to 1-3 sentences. Be punchy, not purple.
- Vary your vocabulary. Avoid repeating any word from the "avoid" list.
- Match the campaign tone provided.
- For critical hits, describe devastating impact. For near-deaths, convey desperation.
- For misses, keep it brief — don't dwell on failures.
- You produce ONLY narrative text. No JSON, no labels, no commentary.`;

// ─── Template Fallback Narration ────────────────────────────

const TEMPLATES: Record<string, string[]> = {
  strike: [
    '{attacker} swings at {target}.',
    '{attacker} lashes out at {target}.',
    '{attacker} attacks {target}.',
  ],
  'critical-hit': [
    '{attacker} lands a devastating blow on {target}!',
    '{attacker} strikes {target} with bone-crushing force!',
    'A perfect strike from {attacker} catches {target} off guard!',
  ],
  miss: [
    '{attacker}\'s strike goes wide.',
    '{target} sidesteps {attacker}\'s attack.',
    '{attacker} swings and misses.',
  ],
  'creature-down': [
    '{creature} collapses to the ground.',
    '{creature} falls, defeated.',
    '{creature} crumples lifelessly.',
  ],
  'spell-cast': [
    '{caster} channels arcane energy.',
    '{caster} weaves a spell into existence.',
    'Power ripples from {caster}\'s outstretched hand.',
  ],
  'condition-applied': [
    '{target} is now {condition}.',
    '{condition} takes hold of {target}.',
  ],
  'heal': [
    'Healing energy flows into {target}.',
    '{target}\'s wounds begin to close.',
  ],
  default: [
    'The battle continues.',
    'Steel clashes.',
    'The combatants trade blows.',
  ],
};

function pickTemplate(category: string, vars: Record<string, string>): string {
  const pool = TEMPLATES[category] || TEMPLATES.default;
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || key);
}

// ─── NarratorAI Service ─────────────────────────────────────

export class NarratorAI {
  private llmService: LLMService;
  private contextCompiler: ContextCompiler;
  private knowledgeBase: KnowledgeBase;
  private recentVocabulary: string[] = [];
  private static readonly MAX_VOCAB_HISTORY = 60;
  private static readonly TIMEOUT_MS = 3000;

  constructor(deps: RoleDependencies) {
    this.llmService = deps.llmService;
    this.contextCompiler = deps.contextCompiler;
    this.knowledgeBase = deps.knowledgeBase;
  }

  /**
   * Generate narration for a game event.
   * Tries LLM first within 3s budget, falls back to templates.
   */
  async narrate(request: NarrationRequest): Promise<NarrationResponse> {
    const vocabToAvoid = request.recentVocabulary || this.recentVocabulary;

    try {
      const result = await this.narrateWithLLM(request, vocabToAvoid);
      this.trackVocabulary(result.narration);
      return result;
    } catch {
      return this.narrateFallback(request);
    }
  }

  /**
   * Generate narration via the LLM 'narrator' role.
   */
  private async narrateWithLLM(
    request: NarrationRequest,
    vocabToAvoid: string[],
  ): Promise<NarrationResponse> {
    // Compile compressed game context
    const ctx = this.contextCompiler.compile(request.gameState, {
      profile: 'narration-context',
      recentVocabulary: vocabToAvoid,
      recentLogCount: 3,
    });

    // Retrieve any relevant rules if a specific mechanic is mentioned
    let rulesHint = '';
    if (request.mechanicalSummary.length > 10) {
      const ragResults = this.knowledgeBase.query(request.mechanicalSummary, 1);
      if (ragResults.length > 0 && ragResults[0].score > 0.3) {
        rulesHint = `\nRelevant lore: ${ragResults[0].content.slice(0, 200)}`;
      }
    }

    // Build tone hint from campaign preferences
    const tone = request.gameState.gmSession?.campaignPreferences?.tone || 'heroic';
    const avoidStr = vocabToAvoid.length > 0
      ? `\nAvoid these words: ${vocabToAvoid.slice(-20).join(', ')}`
      : '';

    const userContent = [
      `Tone: ${tone}`,
      `Event: ${request.eventType}`,
      `What happened: ${request.mechanicalSummary}`,
      ctx.text,
      rulesHint,
      avoidStr,
    ].filter(Boolean).join('\n');

    const response = await this.llmService.complete({
      role: 'narrator',
      messages: [
        { role: 'system', content: NARRATOR_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      maxTokens: 200,
      timeoutMs: NarratorAI.TIMEOUT_MS,
      kvCacheHint: {
        staticPrefixId: 'narrator-system-v1',
        staticMessageCount: 1,
      },
    });

    const narration = response.content.trim();
    const vocabulary = this.extractKeyWords(narration);

    return { narration, vocabulary, isFallback: false };
  }

  /**
   * Template-based fallback when LLM is unavailable/slow.
   */
  private narrateFallback(request: NarrationRequest): NarrationResponse {
    // Determine template category from event type + mechanical summary
    const summary = request.mechanicalSummary.toLowerCase();
    let category = 'default';
    const vars: Record<string, string> = {};

    if (summary.includes('critical hit') || summary.includes('crit')) {
      category = 'critical-hit';
    } else if (summary.includes('miss') || summary.includes('fumble')) {
      category = 'miss';
    } else if (summary.includes('strike') || summary.includes('attack')) {
      category = 'strike';
    } else if (summary.includes('dies') || summary.includes('falls') || summary.includes('defeated')) {
      category = 'creature-down';
    } else if (summary.includes('spell') || summary.includes('cast')) {
      category = 'spell-cast';
    } else if (summary.includes('heal')) {
      category = 'heal';
    } else if (summary.includes('condition') || summary.includes('frightened') || summary.includes('grabbed')) {
      category = 'condition-applied';
    }

    // Try to extract names from the mechanical summary
    const nameMatch = summary.match(/^(\w+(?:\s\w+)?)\s+(?:strikes?|attacks?|hits?|misses?|casts?|heals?)/i);
    if (nameMatch) vars.attacker = nameMatch[1];
    vars.caster = vars.attacker || 'The caster';
    vars.target = 'the enemy';
    vars.creature = vars.attacker || 'The creature';
    vars.condition = 'a debilitating effect';

    const narration = pickTemplate(category, vars);
    return { narration, vocabulary: [], isFallback: true };
  }

  /**
   * Track vocabulary used in recent narrations for anti-repetition.
   */
  private trackVocabulary(text: string): void {
    const words = this.extractKeyWords(text);
    this.recentVocabulary.push(...words);
    if (this.recentVocabulary.length > NarratorAI.MAX_VOCAB_HISTORY) {
      this.recentVocabulary = this.recentVocabulary.slice(-NarratorAI.MAX_VOCAB_HISTORY);
    }
  }

  /**
   * Extract notable vocabulary from narration (adjectives, verbs, nouns > 4 chars).
   */
  private extractKeyWords(text: string): string[] {
    const stopWords = new Set([
      'the', 'and', 'with', 'that', 'this', 'from', 'into', 'their', 'they',
      'have', 'been', 'were', 'will', 'what', 'when', 'where', 'which', 'your',
    ]);
    return text
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w));
  }

  /** Clear vocabulary history (e.g. between encounters). */
  clearVocabulary(): void {
    this.recentVocabulary = [];
  }

  /** Get current vocabulary for external anti-repetition coordination. */
  getRecentVocabulary(): string[] {
    return [...this.recentVocabulary];
  }
}
