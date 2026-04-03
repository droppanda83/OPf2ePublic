/**
 * ExplorationAI — Scene description, investigation, social encounters, and skill challenges.
 *
 * Manages everything that happens outside of combat: entering new areas,
 * investigating objects, social encounters with NPCs, travel narration,
 * and skill check outcomes. Uses the 'exploration' LLM role.
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — descriptions only, engine handles checks
 *   #6  Role Specialization — exploration-focused context
 *   #8  Graceful Degradation — 5s timeout, template fallback
 *   #12 Information Asymmetry — hidden elements based on Perception/skill DCs
 *   #14 All Three Modes — exploration is first-class, not an afterthought
 *   #16 Anti-Repetition — varied scene descriptions
 */
import type { GameState } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import type {
  RoleDependencies,
  ExplorationRequest,
  ExplorationResponse,
  HiddenElement,
} from './types';

// ─── System Prompt (static — cached) ────────────────────────

const EXPLORATION_SYSTEM_PROMPT = `You are the Exploration GM for a solo PF2e campaign. You describe scenes, manage investigation, and run social encounters.

Your responsibilities:
- Describe locations vividly but concisely (2-4 sentences for rooms, 3-5 for major areas)
- Note available actions the player can take (exits, interactable objects, NPCs to talk to)
- Track hidden elements (traps, secret doors, hidden items, ambushes) with Perception DCs
- For social encounters, write NPC dialogue that reflects their personality and disposition
- For skill checks, narrate the outcome based on the degree of success
- For travel, describe the journey with terrain, weather, and points of interest

Rules:
- Detail scales with character Perception and relevant skills — don't reveal what characters can't see
- Hidden elements have DCs. Players must actively Search or have high passive Perception
- Social encounters use Diplomacy, Deception, Intimidation — reflect check results in NPC reactions
- Every location should feel distinct. Avoid generic descriptions

You MUST respond with a JSON object:
{
  "description": "The scene description shown to the player",
  "availableActions": ["Search the room", "Talk to the merchant", "Continue north"],
  "hiddenElements": [{ "type": "trap|secret-door|hidden-item|ambush|clue", "description": "what it is", "perceptionDC": 20, "interactDC": "Thievery 22" }],
  "npcsPresent": ["Merchant Halvar", "Guard Captain Lyra"]
}`;

// ─── JSON Schema ────────────────────────────────────────────

const EXPLORATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    availableActions: { type: 'array', items: { type: 'string' } },
    hiddenElements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          perceptionDC: { type: 'number' },
          interactDC: { type: 'string' },
        },
        required: ['type', 'description', 'perceptionDC'],
      },
    },
    npcsPresent: { type: 'array', items: { type: 'string' } },
  },
  required: ['description', 'availableActions', 'hiddenElements', 'npcsPresent'],
};

// ─── Fallback Templates ─────────────────────────────────────

const SCENE_FALLBACKS: Record<string, string[]> = {
  'enter-area': [
    'You enter a new area. Take a moment to look around.',
    'The path opens before you. What do you do?',
  ],
  investigate: [
    'You examine the area carefully.',
    'A closer look reveals nothing immediately unusual.',
  ],
  social: [
    'The NPC regards you with a measured expression.',
    '"What do you want?" they ask.',
  ],
  travel: [
    'The journey continues without incident.',
    'You make steady progress along the path.',
  ],
  'skill-check': [
    'You attempt the task.',
    'The result is clear.',
  ],
};

// ─── ExplorationAI Service ──────────────────────────────────

export class ExplorationAI {
  private llmService: LLMService;
  private contextCompiler: ContextCompiler;
  private knowledgeBase: KnowledgeBase;
  private recentVocabulary: string[] = [];
  private static readonly TIMEOUT_MS = 5000;
  private static readonly MAX_VOCAB_HISTORY = 40;

  constructor(deps: RoleDependencies) {
    this.llmService = deps.llmService;
    this.contextCompiler = deps.contextCompiler;
    this.knowledgeBase = deps.knowledgeBase;
  }

  /**
   * Handle an exploration action — scene entry, investigation, social, travel, or skill check.
   */
  async explore(request: ExplorationRequest): Promise<ExplorationResponse> {
    try {
      return await this.exploreWithLLM(request);
    } catch {
      return this.exploreFallback(request);
    }
  }

  /**
   * LLM-powered exploration.
   */
  private async exploreWithLLM(request: ExplorationRequest): Promise<ExplorationResponse> {
    const { gameState, action, detail, checkResult } = request;

    // Compile exploration context
    const ctx = this.contextCompiler.compile(gameState, {
      profile: 'exploration-scene',
      recentVocabulary: this.recentVocabulary,
    });

    // RAG: pull relevant location/creature/hazard info
    const searchTerm = detail || action;
    let loreHint = '';
    const ragResults = this.knowledgeBase.query(searchTerm, 2);
    const relevant = ragResults.filter(r => r.score > 0.2);
    if (relevant.length > 0) {
      loreHint = '\nRelevant info:\n' + relevant.map(r => r.content.slice(0, 250)).join('\n');
    }

    // Build the action-specific prompt section
    let actionPrompt: string;
    switch (action) {
      case 'enter-area':
        actionPrompt = `The party enters a new area.${detail ? ` Context: ${detail}` : ''}`;
        break;
      case 'investigate':
        actionPrompt = `The player investigates: ${detail || 'the surroundings'}.`;
        break;
      case 'social':
        actionPrompt = `The player engages in a social encounter with ${detail || 'an NPC'}.`;
        break;
      case 'travel':
        actionPrompt = `The party travels. ${detail || ''}`;
        break;
      case 'skill-check':
        actionPrompt = checkResult
          ? `Skill check result: ${checkResult.skill} (total ${checkResult.total} vs DC ${checkResult.dc}) → ${checkResult.degree}. ${detail || ''}`
          : `A skill check is attempted. ${detail || ''}`;
        break;
      default:
        actionPrompt = detail || 'The party explores.';
    }

    const tone = gameState.gmSession?.campaignPreferences?.tone || 'heroic';
    const vocabStr = this.recentVocabulary.length > 0
      ? `\nAvoid these words: ${this.recentVocabulary.slice(-15).join(', ')}`
      : '';

    const userContent = [
      `Tone: ${tone}`,
      `Action: ${action}`,
      actionPrompt,
      ctx.text,
      loreHint,
      vocabStr,
    ].filter(Boolean).join('\n');

    const response = await this.llmService.complete({
      role: 'exploration',
      messages: [
        { role: 'system', content: EXPLORATION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      maxTokens: 600,
      timeoutMs: ExplorationAI.TIMEOUT_MS,
      jsonSchema: EXPLORATION_JSON_SCHEMA,
      kvCacheHint: {
        staticPrefixId: 'exploration-system-v1',
        staticMessageCount: 1,
      },
    });

    const result = this.parseExplorationResponse(response.content);
    this.trackVocabulary(result.description);
    return result;
  }

  /**
   * Parse LLM JSON response into ExplorationResponse.
   */
  private parseExplorationResponse(content: string): ExplorationResponse {
    let parsed: Record<string, unknown>;
    try {
      const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (!objMatch) throw new Error('Invalid JSON');
      parsed = JSON.parse(objMatch[0]);
    }

    return {
      description: typeof parsed.description === 'string' ? parsed.description : 'You see nothing remarkable.',
      availableActions: Array.isArray(parsed.availableActions)
        ? (parsed.availableActions as string[])
        : ['Look around', 'Continue'],
      hiddenElements: Array.isArray(parsed.hiddenElements)
        ? (parsed.hiddenElements as HiddenElement[]).filter(h => h.type && h.perceptionDC)
        : [],
      npcsPresent: Array.isArray(parsed.npcsPresent)
        ? (parsed.npcsPresent as string[])
        : [],
      isFallback: false,
    };
  }

  /**
   * Template fallback.
   */
  private exploreFallback(request: ExplorationRequest): ExplorationResponse {
    const pool = SCENE_FALLBACKS[request.action] || SCENE_FALLBACKS['enter-area'];
    const description = pool[Math.floor(Math.random() * pool.length)];

    return {
      description,
      availableActions: ['Look around', 'Continue', 'Rest'],
      hiddenElements: [],
      npcsPresent: [],
      isFallback: true,
    };
  }

  /** Track vocabulary for anti-repetition. */
  private trackVocabulary(text: string): void {
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 5);
    this.recentVocabulary.push(...words);
    if (this.recentVocabulary.length > ExplorationAI.MAX_VOCAB_HISTORY) {
      this.recentVocabulary = this.recentVocabulary.slice(-ExplorationAI.MAX_VOCAB_HISTORY);
    }
  }

  /** Clear vocabulary (e.g. new area/chapter). */
  clearVocabulary(): void {
    this.recentVocabulary = [];
  }
}
