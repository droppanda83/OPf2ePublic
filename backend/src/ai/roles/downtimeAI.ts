/**
 * DowntimeAI — Crafting, shopping, rest, NPC relationships, and downtime activities.
 *
 * Manages the connective tissue of a campaign: what happens in town between
 * adventures. Generates shop inventories, resolves crafting/income, deepens
 * NPC relationships, and produces rumors/hooks. Uses the 'downtime' LLM role.
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — narrates outcomes, engine resolves mechanics
 *   #6  Role Specialization — downtime-focused context
 *   #7  RAG — crafting rules, wealth-by-level, skill actions from knowledge base
 *   #8  Graceful Degradation — 8s timeout, template fallback
 *   #14 All Three Modes — downtime is first-class
 */
import type { GameState } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import type {
  RoleDependencies,
  DowntimeRequest,
  DowntimeResponse,
  ShopItem,
} from './types';

// ─── System Prompt (static — cached) ────────────────────────

const DOWNTIME_SYSTEM_PROMPT = `You are the Downtime GM for a solo PF2e campaign. You manage activities between adventures.

Your responsibilities:
- Narrate downtime activities (crafting, earning income, rest, socializing) with immersive flavor
- Generate level-appropriate shop inventories when the player shops
- Provide rumors and hooks that tie into the current story
- Resolve NPC interactions during downtime
- Track time consumed by activities

PF2e Downtime Rules:
- Crafting: Requires Crafting skill, formula, materials (half item price). 4 days base, then Crafting check to reduce remaining cost
- Earn Income: Skill check vs task level DC. Trained tasks available based on proficiency
- Retraining: 1 week per feat/feature retrained
- Rest: Full night's rest restores all HP, resets daily preparations
- Shop inventories should be level-appropriate: a frontier village sells up to level 3 items, a major city up to level 10+

Rules:
- Keep narration concise (2-4 sentences per activity)
- Shop items must include name, level, and price
- Rumors should be actionable hooks, not vague flavor
- Days consumed must be realistic (crafting takes days, shopping takes hours)

You MUST respond with a JSON object:
{
  "narration": "What happens during the downtime activity",
  "mechanicalResult": "Gold earned: 2 gp" or null,
  "shopInventory": [{ "name": "Healing Potion (Minor)", "level": 1, "price": "4 gp", "description": "Restores 1d8 HP" }] or null,
  "rumors": ["The old mine north of town has been making strange noises at night"],
  "daysConsumed": 1
}`;

// ─── JSON Schema ────────────────────────────────────────────

const DOWNTIME_JSON_SCHEMA = {
  type: 'object',
  properties: {
    narration: { type: 'string' },
    mechanicalResult: { type: ['string', 'null'] },
    shopInventory: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'number' },
          price: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'level', 'price', 'description'],
      },
    },
    rumors: { type: 'array', items: { type: 'string' } },
    daysConsumed: { type: 'number' },
  },
  required: ['narration', 'rumors', 'daysConsumed'],
};

// ─── DowntimeAI Service ─────────────────────────────────────

export class DowntimeAI {
  private llmService: LLMService;
  private contextCompiler: ContextCompiler;
  private knowledgeBase: KnowledgeBase;
  private static readonly TIMEOUT_MS = 8000;

  constructor(deps: RoleDependencies) {
    this.llmService = deps.llmService;
    this.contextCompiler = deps.contextCompiler;
    this.knowledgeBase = deps.knowledgeBase;
  }

  /**
   * Resolve a downtime activity — crafting, shopping, resting, etc.
   */
  async resolveActivity(request: DowntimeRequest): Promise<DowntimeResponse> {
    try {
      return await this.resolveWithLLM(request);
    } catch {
      return this.resolveFallback(request);
    }
  }

  /**
   * LLM-powered downtime resolution.
   */
  private async resolveWithLLM(request: DowntimeRequest): Promise<DowntimeResponse> {
    const { gameState, activity, detail, daysAvailable } = request;

    // Compile downtime context
    const ctx = this.contextCompiler.compile(gameState, {
      profile: 'downtime-summary',
    });

    // RAG: pull relevant rules for the activity
    const ragQuery = this.buildRAGQuery(activity, detail);
    let rulesHint = '';
    const ragResults = this.knowledgeBase.query(ragQuery, 2);
    const relevant = ragResults.filter(r => r.score > 0.2);
    if (relevant.length > 0) {
      rulesHint = '\nRelevant rules:\n' + relevant.map(r => r.content.slice(0, 300)).join('\n');
    }

    // Party level for treasure/shop generation
    const partyLevel = this.getAveragePartyLevel(gameState);
    const tone = gameState.gmSession?.campaignPreferences?.tone || 'heroic';
    const location = gameState.gmSession?.currentPhase === 'rest' ? 'camp' : 'settlement';

    const userContent = [
      `Tone: ${tone}`,
      `Activity: ${activity}`,
      detail ? `Detail: ${detail}` : '',
      `Party level: ${partyLevel}`,
      `Location: ${location}`,
      daysAvailable ? `Days available: ${daysAvailable}` : '',
      ctx.text,
      rulesHint,
    ].filter(Boolean).join('\n');

    const response = await this.llmService.complete({
      role: 'downtime',
      messages: [
        { role: 'system', content: DOWNTIME_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      maxTokens: 600,
      timeoutMs: DowntimeAI.TIMEOUT_MS,
      jsonSchema: DOWNTIME_JSON_SCHEMA,
      kvCacheHint: {
        staticPrefixId: 'downtime-system-v1',
        staticMessageCount: 1,
      },
    });

    return this.parseDowntimeResponse(response.content, request);
  }

  /**
   * Build a RAG query appropriate for the activity type.
   */
  private buildRAGQuery(activity: string, detail?: string): string {
    switch (activity) {
      case 'craft':
        return `crafting rules ${detail || 'PF2e'}`;
      case 'earn-income':
        return `earn income skill check downtime ${detail || ''}`;
      case 'retrain':
        return `retraining rules PF2e ${detail || ''}`;
      case 'shop':
        return `magic items equipment ${detail || 'level appropriate'}`;
      case 'gather-info':
        return `gather information rumor ${detail || ''}`;
      default:
        return `downtime ${activity} ${detail || ''}`;
    }
  }

  /**
   * Get average party level from player creatures.
   */
  private getAveragePartyLevel(gameState: GameState): number {
    const players = gameState.creatures.filter(c => c.type === 'player');
    if (players.length === 0) return 1;
    return Math.round(players.reduce((sum, p) => sum + p.level, 0) / players.length);
  }

  /**
   * Parse LLM JSON response into DowntimeResponse.
   */
  private parseDowntimeResponse(content: string, request: DowntimeRequest): DowntimeResponse {
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
      narration: typeof parsed.narration === 'string' ? parsed.narration : 'Time passes in quiet routine.',
      mechanicalResult: typeof parsed.mechanicalResult === 'string' ? parsed.mechanicalResult : undefined,
      shopInventory: Array.isArray(parsed.shopInventory)
        ? (parsed.shopInventory as ShopItem[]).filter(i => i.name && i.level !== undefined && i.price)
        : undefined,
      rumors: Array.isArray(parsed.rumors) ? (parsed.rumors as string[]) : [],
      daysConsumed: typeof parsed.daysConsumed === 'number' ? Math.max(0, parsed.daysConsumed) : 1,
      isFallback: false,
    };
  }

  /**
   * Template fallback.
   */
  private resolveFallback(request: DowntimeRequest): DowntimeResponse {
    const narrations: Record<string, string> = {
      craft: 'You spend time at the workbench, making progress on your project.',
      'earn-income': 'You put your skills to work and earn a modest sum.',
      retrain: 'You dedicate time to practice and study, refining your abilities.',
      shop: 'You browse the local marketplace.',
      'gather-info': 'You spend time listening to gossip and asking questions around town.',
      rest: 'You rest and recover. Daily preparations are restored.',
      socialize: 'You spend time among the locals, building connections.',
    };

    return {
      narration: narrations[request.activity] || 'Time passes quietly.',
      rumors: [],
      daysConsumed: request.activity === 'rest' ? 1 : request.daysAvailable || 1,
      isFallback: true,
    };
  }
}
