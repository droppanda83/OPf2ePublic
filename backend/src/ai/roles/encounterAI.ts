/**
 * EncounterAI — Encounter design, creature selection, and placement service.
 *
 * Designs encounters using party data, story context, terrain, and tension level.
 * Uses PF2e encounter building rules (XP budgets) and the bestiary RAG index.
 * Uses the 'encounter' LLM role (thorough, no time pressure — 30s budget).
 *
 * Design Principles:
 *   #1  AI Narrates, Rules Judge — designs encounters, engine runs them
 *   #7  RAG — creature/hazard data from knowledge base + bestiary
 *   #8  Graceful Degradation — 30s timeout, then formulaic encounter
 *   #11 No Fudging — difficulty set at design time, not adjusted mid-combat
 *   #15 Tension-Driven — higher tension → harder encounters, more plot-critical enemies
 */
import type { GameState } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { ContextCompiler } from '../../services/contextCompiler';
import type { KnowledgeBase } from '../../services/knowledgeBase';
import type { GameEventBus } from '../../events/eventBus';
import type {
  RoleDependencies,
  EncounterDesignRequest,
  EncounterDesignResponse,
  EncounterCreature,
  EncounterHazard,
} from './types';

// ─── PF2e XP Budget Tables ─────────────────────────────────

/** XP budget per party member by difficulty tier. */
const XP_BUDGETS: Record<string, number> = {
  trivial: 40,
  low: 60,
  moderate: 80,
  severe: 120,
  extreme: 160,
};

/** XP value of a single creature by level difference (creature level - party level). */
const CREATURE_XP: Record<number, number> = {
  '-4': 10, '-3': 15, '-2': 20, '-1': 30,
  '0': 40, '1': 60, '2': 80, '3': 120, '4': 160,
};

// ─── System Prompt (static — cached) ────────────────────────

const ENCOUNTER_SYSTEM_PROMPT = `You are the Encounter Designer for a solo PF2e campaign. You build balanced, thematic combat encounters.

PF2e Encounter Building Rules:
- XP budgets per player: Trivial 40, Low 60, Moderate 80, Severe 120, Extreme 160
- Creature XP by level difference (creature - party): -4=10, -3=15, -2=20, -1=30, 0=40, +1=60, +2=80, +3=120, +4=160
- Never use creatures more than 4 levels above or below party level
- A "boss" creature is typically party level +2 to +4
- "Lackeys" are party level -2 to -4
- Mix creature roles for interesting encounters (front-line + ranged + support)

Design Principles:
- Encounters should serve the story, not just fill space
- Higher tension scores → harder encounters, more plot-relevant enemies
- Include terrain features and hazards when they enhance tactical depth
- Give each creature a personality tag that influences TacticianAI decisions
- Every encounter should have at least one interesting tactical choice beyond "attack closest enemy"

You MUST respond with a JSON object:
{
  "title": "Ambush at the Bridge",
  "openingNarration": "As you round the corner...",
  "creatures": [{ "name": "Goblin Warrior", "level": 1, "count": 3, "role": "standard", "personality": "aggressive", "placement": "front" }],
  "hazards": [{ "name": "Pit Trap", "level": 2, "type": "simple", "description": "Covered pit in the center of the bridge" }],
  "xpBudget": 120,
  "objectives": ["Survive the ambush", "Prevent goblins from destroying the bridge"],
  "terrain": ["Narrow bridge (10ft wide)", "River 20ft below", "Rubble providing cover on the far side"]
}`;

// ─── JSON Schema ────────────────────────────────────────────

const ENCOUNTER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    openingNarration: { type: 'string' },
    creatures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'number' },
          count: { type: 'number' },
          role: { type: 'string' },
          personality: { type: 'string' },
          placement: { type: 'string' },
        },
        required: ['name', 'level', 'count', 'role', 'personality', 'placement'],
      },
    },
    hazards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'number' },
          type: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'level', 'type', 'description'],
      },
    },
    xpBudget: { type: 'number' },
    objectives: { type: 'array', items: { type: 'string' } },
    terrain: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'openingNarration', 'creatures', 'hazards', 'xpBudget', 'objectives', 'terrain'],
};

// ─── EncounterAI Service ────────────────────────────────────

export class EncounterAI {
  private llmService: LLMService;
  private contextCompiler: ContextCompiler;
  private knowledgeBase: KnowledgeBase;
  private static readonly TIMEOUT_MS = 30000;

  constructor(deps: RoleDependencies) {
    this.llmService = deps.llmService;
    this.contextCompiler = deps.contextCompiler;
    this.knowledgeBase = deps.knowledgeBase;
  }

  /**
   * Design a complete encounter based on party data, difficulty, and story context.
   */
  async designEncounter(request: EncounterDesignRequest): Promise<EncounterDesignResponse> {
    try {
      return await this.designWithLLM(request);
    } catch {
      return this.designFallback(request);
    }
  }

  /**
   * LLM-powered encounter design.
   */
  private async designWithLLM(request: EncounterDesignRequest): Promise<EncounterDesignResponse> {
    const { partyLevels, difficulty, storyContext, tensionScore, mapTheme } = request;

    const partySize = partyLevels.length;
    const avgLevel = Math.round(partyLevels.reduce((a, b) => a + b, 0) / partySize);
    const xpBudget = (XP_BUDGETS[difficulty] || 80) * partySize;

    // RAG: pull creature data appropriate for the context
    const creatureQuery = `creature level ${avgLevel - 2} to ${avgLevel + 2} ${storyContext} ${mapTheme || ''}`;
    const ragCreatures = this.knowledgeBase.query(creatureQuery, 4);
    const creatureHints = ragCreatures
      .filter(r => r.score > 0.15)
      .map(r => r.content.slice(0, 200))
      .join('\n');

    // RAG: pull hazard data if appropriate
    let hazardHints = '';
    if (tensionScore > 50 || storyContext.toLowerCase().includes('trap') || storyContext.toLowerCase().includes('hazard')) {
      const ragHazards = this.knowledgeBase.query(`hazard trap level ${avgLevel}`, 2);
      hazardHints = ragHazards
        .filter(r => r.score > 0.15)
        .map(r => r.content.slice(0, 200))
        .join('\n');
    }

    // Tension modifier: higher tension → push toward harder creature composition
    const tensionHint = tensionScore > 70
      ? 'Tension is HIGH — include a boss or elite creature. This encounter should feel dangerous and plot-relevant.'
      : tensionScore > 40
        ? 'Tension is moderate — a solid challenge with variety.'
        : 'Tension is LOW — this could be a simpler fight or include a social/avoidable element.';

    const userContent = [
      `Party: ${partySize} characters, average level ${avgLevel}`,
      `Difficulty: ${difficulty} (XP budget: ${xpBudget})`,
      `Tension: ${tensionScore}/100. ${tensionHint}`,
      `Story context: ${storyContext}`,
      mapTheme ? `Map theme: ${mapTheme}` : '',
      '',
      'Available creature types (from bestiary):',
      creatureHints || '(Use generic creatures appropriate to the theme)',
      hazardHints ? '\nAvailable hazards:\n' + hazardHints : '',
      '',
      `Remember: total creature XP must be close to ${xpBudget}. Creature XP by level difference: -4=10, -3=15, -2=20, -1=30, 0=40, +1=60, +2=80, +3=120, +4=160`,
    ].filter(Boolean).join('\n');

    const response = await this.llmService.complete({
      role: 'encounter',
      messages: [
        { role: 'system', content: ENCOUNTER_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      maxTokens: 1200,
      timeoutMs: EncounterAI.TIMEOUT_MS,
      jsonSchema: ENCOUNTER_JSON_SCHEMA,
      kvCacheHint: {
        staticPrefixId: 'encounter-system-v1',
        staticMessageCount: 1,
      },
    });

    return this.parseEncounterResponse(response.content, xpBudget);
  }

  /**
   * Parse LLM JSON response into EncounterDesignResponse.
   */
  private parseEncounterResponse(content: string, targetXP: number): EncounterDesignResponse {
    let parsed: Record<string, unknown>;
    try {
      const cleaned = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (!objMatch) throw new Error('Invalid JSON');
      parsed = JSON.parse(objMatch[0]);
    }

    const creatures = Array.isArray(parsed.creatures)
      ? (parsed.creatures as EncounterCreature[]).filter(c => c.name && c.level !== undefined && c.count > 0)
      : [];

    return {
      title: typeof parsed.title === 'string' ? parsed.title : 'Combat Encounter',
      openingNarration: typeof parsed.openingNarration === 'string' ? parsed.openingNarration : 'Battle begins!',
      creatures,
      hazards: Array.isArray(parsed.hazards)
        ? (parsed.hazards as EncounterHazard[]).filter(h => h.name && h.level !== undefined)
        : [],
      xpBudget: typeof parsed.xpBudget === 'number' ? parsed.xpBudget : targetXP,
      objectives: Array.isArray(parsed.objectives) ? (parsed.objectives as string[]) : ['Defeat the enemies'],
      terrain: Array.isArray(parsed.terrain) ? (parsed.terrain as string[]) : [],
      isFallback: false,
    };
  }

  /**
   * Formulaic fallback encounter when LLM is unavailable.
   * Uses XP budgets to create a simple but balanced encounter.
   */
  private designFallback(request: EncounterDesignRequest): EncounterDesignResponse {
    const { partyLevels, difficulty, storyContext } = request;
    const partySize = partyLevels.length;
    const avgLevel = Math.round(partyLevels.reduce((a, b) => a + b, 0) / partySize);
    const xpBudget = (XP_BUDGETS[difficulty] || 80) * partySize;

    // Simple formula: fill budget with same-level creatures (40 XP each)
    const creatureCount = Math.max(1, Math.round(xpBudget / 40));

    return {
      title: 'Combat Encounter',
      openingNarration: 'Enemies appear before you!',
      creatures: [{
        name: 'Enemy',
        level: avgLevel,
        count: creatureCount,
        role: 'standard',
        personality: 'aggressive',
        placement: 'front',
      }],
      hazards: [],
      xpBudget,
      objectives: ['Defeat the enemies'],
      terrain: [],
      isFallback: true,
    };
  }

  /**
   * Calculate total XP of an encounter design for validation.
   */
  calculateEncounterXP(creatures: EncounterCreature[], partyLevel: number): number {
    let total = 0;
    for (const c of creatures) {
      const diff = c.level - partyLevel;
      const xpPerCreature = CREATURE_XP[diff.toString() as unknown as number] || 0;
      total += xpPerCreature * c.count;
    }
    return total;
  }
}
