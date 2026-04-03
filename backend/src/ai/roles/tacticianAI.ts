/**
 * TacticianAI — Hybrid LLM + rule-based NPC combat decision service.
 *
 * Attempts personality-aware tactical decisions via the LLM 'tactician' role.
 * Falls back to the existing rule-based TacticalAI on timeout, error, or
 * when the LLM returns invalid actions.
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — outputs action intents, engine validates
 *   #4  Constrained Output — JSON schema enforced for action lists
 *   #5  KV Cache-Aware — static tactical system prompt cached
 *   #6  Role Specialization — focused tactical context only
 *   #8  Graceful Degradation — 5s timeout, then TacticalAI fallback
 *   #11 No Fudging — difficulty set before combat, not adjusted mid-fight
 */
import type { GameState, Creature, AITurnResponse, CombatAction } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import { TacticalAI, AIDifficulty } from '../tacticalAI';
import type { RoleDependencies, TacticianRequest, TacticianResponse, TacticianAction } from './types';

// ─── System Prompt (static — cached by KV cache) ───────────

const TACTICIAN_SYSTEM_PROMPT = `You are the Tactician for a PF2e combat encounter. You decide NPC actions.

PF2e Combat Rules:
- Each creature gets 3 actions per turn.
- Multiple Attack Penalty (MAP): 2nd attack -5, 3rd attack -10 (agile: -4/-8).
- Stride = move up to Speed in feet. Step = 5 feet without triggering reactions.
- Raise Shield = +2 AC until next turn (great 3rd action).
- Demoralize = Intimidation vs Will DC. No Attack trait, no MAP. Frightened reduces all checks.
- Trip = Athletics vs Reflex DC. On success: target is prone (off-guard, must spend action to stand).
- Grapple = Athletics vs Fortitude DC. On success: target is grabbed (immobilized + off-guard).
- Flanking = two allies on opposite sides of enemy → enemy is off-guard (-2 AC) to them.

Your response MUST be a JSON array of actions. Each action:
{
  "actionId": "strike" | "stride" | "step" | "raise-shield" | "demoralize" | "trip" | "grapple" | "shove" | "cast-spell" | "take-cover" | "end-turn",
  "targetId": "creature-id or null",
  "targetPosition": { "x": N, "y": N } (for movement only),
  "weaponId": "weapon-id or null",
  "spellId": "spell-id or null",
  "reasoning": "brief tactical reasoning"
}

Respond ONLY with the JSON array. No explanation outside the array.`;

// ─── JSON Schema for Structured Output ──────────────────────

const TACTICIAN_JSON_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      actionId: { type: 'string' },
      targetId: { type: ['string', 'null'] },
      targetPosition: {
        type: ['object', 'null'],
        properties: { x: { type: 'number' }, y: { type: 'number' } },
      },
      weaponId: { type: ['string', 'null'] },
      spellId: { type: ['string', 'null'] },
      reasoning: { type: 'string' },
    },
    required: ['actionId', 'reasoning'],
  },
};

// ─── TacticianAI Service ────────────────────────────────────

export class TacticianAI {
  private llmService: LLMService;
  private contextCompiler: ContextCompiler;
  private knowledgeBase: KnowledgeBase;
  private localTacticalAI: TacticalAI;
  private static readonly TIMEOUT_MS = 5000;

  constructor(deps: RoleDependencies) {
    this.llmService = deps.llmService;
    this.contextCompiler = deps.contextCompiler;
    this.knowledgeBase = deps.knowledgeBase;
    this.localTacticalAI = new TacticalAI('normal');
  }

  /** Set difficulty for the rule-based fallback engine. */
  setDifficulty(difficulty: AIDifficulty): void {
    this.localTacticalAI.setDifficulty(difficulty);
  }

  /**
   * Decide a full turn of actions for an NPC creature.
   * Tries LLM-powered personality-aware decisions first,
   * falls back to rule-based TacticalAI on failure.
   */
  async decideTurn(request: TacticianRequest): Promise<TacticianResponse> {
    try {
      return await this.decideWithLLM(request);
    } catch {
      return this.decideWithFallback(request);
    }
  }

  /**
   * LLM-powered tactical decision with personality awareness.
   */
  private async decideWithLLM(request: TacticianRequest): Promise<TacticianResponse> {
    const { gameState, creatureId, personality } = request;
    const creature = gameState.creatures.find(c => c.id === creatureId);
    if (!creature) throw new Error(`Creature ${creatureId} not found`);

    // Compile tactical context
    const ctx = this.contextCompiler.compile(gameState, {
      profile: 'combat-detailed',
      viewerId: creatureId,
    });

    // Look up creature-specific abilities if they have unusual traits
    let abilityHint = '';
    if (creature.specials && creature.specials.length > 0) {
      const ragResults = this.knowledgeBase.query(
        creature.specials.join(' ') + ' ' + creature.name,
        1,
      );
      if (ragResults.length > 0 && ragResults[0].score > 0.2) {
        abilityHint = `\nSpecial abilities: ${ragResults[0].content.slice(0, 300)}`;
      }
    }

    // Build personality directive
    const personalityDirective = personality
      ? `\nPersonality: ${personality}. Let this influence your tactical priorities (e.g. a coward retreats early, a fanatic fights to the death, a protector shields allies).`
      : '';

    const userContent = [
      `Acting as: ${creature.name} (Level ${creature.level}, HP ${creature.currentHealth}/${creature.maxHealth})`,
      `Actions remaining: ${creature.actionsRemaining ?? 3}`,
      `Attacks made this turn: ${creature.attacksMadeThisTurn ?? 0}`,
      personalityDirective,
      abilityHint,
      '',
      ctx.text,
    ].join('\n');

    const response = await this.llmService.complete({
      role: 'tactician',
      messages: [
        { role: 'system', content: TACTICIAN_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      maxTokens: 500,
      timeoutMs: TacticianAI.TIMEOUT_MS,
      jsonSchema: TACTICIAN_JSON_SCHEMA,
      kvCacheHint: {
        staticPrefixId: 'tactician-system-v1',
        staticMessageCount: 1,
      },
    });

    // Parse and validate the action list
    const actions = this.parseActions(response.content, creature);
    if (actions.length === 0) throw new Error('LLM returned no valid actions');

    return {
      actions,
      usedLLM: true,
      reasoning: actions.map(a => a.reasoning).join('; '),
    };
  }

  /**
   * Rule-based fallback using existing TacticalAI.
   */
  private decideWithFallback(request: TacticianRequest): TacticianResponse {
    const { gameState, creatureId } = request;
    const creature = gameState.creatures.find(c => c.id === creatureId);
    if (!creature) {
      return { actions: [], usedLLM: false, reasoning: 'Creature not found' };
    }

    const localActions = this.localTacticalAI.decideTurn(gameState, creature);

    // Convert AITurnResponse[] → TacticianAction[]
    const actions: TacticianAction[] = localActions.map(a => ({
      actionId: a.action.actionId,
      targetId: a.action.targetId,
      targetPosition: a.action.targetPosition,
      weaponId: a.action.details?.weaponId,
      spellId: a.action.details?.spellId,
      reasoning: a.reasoning,
    }));

    return {
      actions,
      usedLLM: false,
      reasoning: 'Rule-based fallback: ' + actions.map(a => a.reasoning).join('; '),
    };
  }

  /**
   * Parse LLM JSON output into validated TacticianAction array.
   * Tolerant of minor formatting issues.
   */
  private parseActions(content: string, creature: Creature): TacticianAction[] {
    let parsed: unknown;
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON array from surrounding text
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (!arrayMatch) return [];
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    const maxActions = creature.actionsRemaining ?? 3;
    const actions: TacticianAction[] = [];

    for (const item of parsed as Record<string, unknown>[]) {
      if (actions.length >= maxActions) break;
      if (!item || typeof item.actionId !== 'string') continue;

      actions.push({
        actionId: item.actionId,
        targetId: typeof item.targetId === 'string' ? item.targetId : undefined,
        targetPosition: item.targetPosition && typeof (item.targetPosition as Record<string, unknown>).x === 'number'
          ? item.targetPosition as { x: number; y: number }
          : undefined,
        weaponId: typeof item.weaponId === 'string' ? item.weaponId : undefined,
        spellId: typeof item.spellId === 'string' ? item.spellId : undefined,
        reasoning: typeof item.reasoning === 'string' ? item.reasoning : 'no reasoning provided',
      });
    }

    return actions;
  }
}
