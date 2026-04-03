/**
 * StoryAI — Plot thread, NPC dialogue, and consequence management service.
 *
 * Handles player conversation, NPC dialogue, quest progression, tension
 * adjustment, and the consequence engine. Uses the 'story' LLM role
 * (smart, can be slower — 10s budget).
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — returns narrative + structured updates, never mutates state directly
 *   #6  Role Specialization — story-focused context only
 *   #10 Conversation Summarization — compresses old chat history
 *   #13 Consequence Engine — tracks pending consequences, triggers when appropriate
 *   #15 Tension-Driven — tension delta influences pacing
 *   #16 Anti-Repetition — varies NPC dialogue and plot beats
 *   #18 NPC Voice & Personality Persistence — personality cards drive dialogue
 */
import type { GameState, GMSession, RecurringNPC } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import type {
  RoleDependencies,
  StoryRequest,
  StoryResponse,
  PlotUpdate,
  PendingConsequence,
} from './types';

// ─── System Prompt (static — cached) ────────────────────────

const STORY_SYSTEM_PROMPT = `You are the StoryWeaver for a solo PF2e campaign. You manage plot threads, NPC dialogue, and consequences.

Your responsibilities:
- Write NPC dialogue that matches their personality (speech patterns, mannerisms, goals)
- Advance or complicate plot threads based on player actions
- Suggest tension adjustments (-10 to +10) based on story beats
- Track consequences: when the player makes a meaningful choice, create a consequence that fires later
- Weave player character backstory into the broader narrative naturally

Rules:
- NEVER override mechanical outcomes. If the player failed a check, the story reflects failure.
- NPCs have their own goals and may disagree with or refuse the player.
- Consequences should feel natural, not punitive. Spare the bandit → he returns later. Burn the bridge → travel route changes.
- Vary NPC speech patterns. The gruff dwarf sounds different from the nervous scholar.
- Keep responses under 500 words unless the scene demands more.

You MUST respond with a JSON object:
{
  "dialogue": "The narrative text and NPC dialogue to show the player",
  "plotUpdates": [{ "type": "quest-advance|npc-reaction|consequence-trigger|new-hook|milestone", "description": "what changed" }],
  "tensionDelta": 0,
  "consequences": [{ "id": "unique-id", "trigger": "when this happens", "effect": "this is the consequence", "timing": "next-scene|next-session|when-<condition>" }],
  "npcDispositionChanges": { "npc-id": 5 }
}`;

// ─── JSON Schema ────────────────────────────────────────────

const STORY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    dialogue: { type: 'string' },
    plotUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['type', 'description'],
      },
    },
    tensionDelta: { type: 'number' },
    consequences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          trigger: { type: 'string' },
          effect: { type: 'string' },
          timing: { type: 'string' },
        },
        required: ['id', 'trigger', 'effect', 'timing'],
      },
    },
    npcDispositionChanges: { type: 'object' },
  },
  required: ['dialogue', 'plotUpdates', 'tensionDelta', 'consequences', 'npcDispositionChanges'],
};

// ─── Fallback Templates ─────────────────────────────────────

const FALLBACK_RESPONSES = [
  'The GM pauses thoughtfully before continuing...',
  'A moment of silence passes as events unfold.',
  'The story continues to develop...',
];

// ─── StoryAI Service ────────────────────────────────────────

export class StoryAI {
  private llmService: LLMService;
  private contextCompiler: ContextCompiler;
  private knowledgeBase: KnowledgeBase;
  private static readonly TIMEOUT_MS = 10000;

  constructor(deps: RoleDependencies) {
    this.llmService = deps.llmService;
    this.contextCompiler = deps.contextCompiler;
    this.knowledgeBase = deps.knowledgeBase;
  }

  /**
   * Process a player message in the context of the ongoing story.
   * Returns NPC dialogue, plot updates, tension changes, and consequences.
   */
  async processMessage(request: StoryRequest): Promise<StoryResponse> {
    try {
      return await this.processWithLLM(request);
    } catch {
      return this.processFallback();
    }
  }

  /**
   * LLM-powered story processing.
   */
  private async processWithLLM(request: StoryRequest): Promise<StoryResponse> {
    const { gameState, playerMessage, session } = request;

    // Compile story-focused context
    const ctx = this.contextCompiler.compile(gameState, {
      profile: 'story-context',
    });

    // Build NPC personality context for any NPCs the player is interacting with
    const npcContext = this.buildNPCContext(session, playerMessage);

    // RAG: pull relevant lore if the player mentions specific topics
    let loreHint = '';
    const ragResults = this.knowledgeBase.query(playerMessage, 2);
    const relevant = ragResults.filter(r => r.score > 0.25);
    if (relevant.length > 0) {
      loreHint = '\nRelevant lore:\n' + relevant.map(r => r.content.slice(0, 200)).join('\n');
    }

    // Build recent chat summary (last 6 messages max to save tokens)
    const recentChat = session.chatHistory
      .slice(-6)
      .map(m => `${m.role === 'player' ? 'Player' : 'GM'}: ${m.content.slice(0, 150)}`)
      .join('\n');

    // Story arc context
    const arcContext = session.storyArc
      ? `\nStory Arc: ${session.storyArc.bbegName} (${session.storyArc.storyPhase}). Motivation: ${session.storyArc.bbegMotivation}`
      : '';

    // Tension context
    const tension = session.tensionTracker;
    const tensionStr = `\nTension: ${tension.score}/100 (${tension.trend})`;

    const userContent = [
      ctx.text,
      arcContext,
      tensionStr,
      npcContext,
      loreHint,
      '',
      'Recent conversation:',
      recentChat,
      '',
      `Player says: "${playerMessage}"`,
    ].join('\n');

    const response = await this.llmService.complete({
      role: 'story',
      messages: [
        { role: 'system', content: STORY_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      maxTokens: 800,
      timeoutMs: StoryAI.TIMEOUT_MS,
      jsonSchema: STORY_JSON_SCHEMA,
      kvCacheHint: {
        staticPrefixId: 'story-system-v1',
        staticMessageCount: 1,
      },
    });

    return this.parseStoryResponse(response.content);
  }

  /**
   * Build NPC personality context for NPCs mentioned in the player message.
   */
  private buildNPCContext(session: GMSession, playerMessage: string): string {
    if (!session.recurringNPCs || session.recurringNPCs.length === 0) return '';

    const lowerMsg = playerMessage.toLowerCase();
    const mentionedNPCs = session.recurringNPCs.filter(npc =>
      lowerMsg.includes(npc.name.toLowerCase()),
    );

    // If no specific NPC mentioned, include nearby/recently interacted NPCs
    const npcsToInclude = mentionedNPCs.length > 0
      ? mentionedNPCs
      : session.recurringNPCs
          .filter(npc => npc.isAlive)
          .sort((a, b) => {
            const aLast = a.interactions.length > 0 ? a.interactions[a.interactions.length - 1].timestamp : 0;
            const bLast = b.interactions.length > 0 ? b.interactions[b.interactions.length - 1].timestamp : 0;
            return bLast - aLast;
          })
          .slice(0, 3);

    if (npcsToInclude.length === 0) return '';

    const lines = npcsToInclude.map(npc => {
      const disposition = npc.disposition > 30 ? 'friendly' : npc.disposition < -30 ? 'hostile' : 'neutral';
      return `- ${npc.name} (${npc.role}, ${disposition}): ${npc.description}`;
    });

    return '\nNPCs present:\n' + lines.join('\n');
  }

  /**
   * Parse the LLM's JSON response into a StoryResponse.
   */
  private parseStoryResponse(content: string): StoryResponse {
    let parsed: Record<string, unknown>;
    try {
      const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try extracting JSON object from surrounding text
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (!objMatch) return this.processFallback();
      try {
        parsed = JSON.parse(objMatch[0]);
      } catch {
        return this.processFallback();
      }
    }

    return {
      dialogue: typeof parsed.dialogue === 'string' ? parsed.dialogue : 'The story continues...',
      plotUpdates: Array.isArray(parsed.plotUpdates)
        ? (parsed.plotUpdates as PlotUpdate[]).filter(p => p.type && p.description)
        : [],
      tensionDelta: typeof parsed.tensionDelta === 'number'
        ? Math.max(-10, Math.min(10, parsed.tensionDelta))
        : 0,
      consequences: Array.isArray(parsed.consequences)
        ? (parsed.consequences as PendingConsequence[]).filter(c => c.id && c.trigger && c.effect)
        : [],
      npcDispositionChanges: typeof parsed.npcDispositionChanges === 'object' && parsed.npcDispositionChanges !== null
        ? parsed.npcDispositionChanges as Record<string, number>
        : {},
      isFallback: false,
    };
  }

  /**
   * Template fallback when LLM is unavailable.
   */
  private processFallback(): StoryResponse {
    return {
      dialogue: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)],
      plotUpdates: [],
      tensionDelta: 0,
      consequences: [],
      npcDispositionChanges: {},
      isFallback: true,
    };
  }
}
