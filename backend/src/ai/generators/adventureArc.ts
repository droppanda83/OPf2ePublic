/**
 * AdventureArcGenerator — Generates multi-encounter story arcs with branching paths.
 *
 * Creates tension-responsive arcs:
 *  - Side quests at low tension (give player breathing room)
 *  - Main plot pressure at high tension (drive toward climax)
 *  - Improvisation when players go off-script (re-plans based on current state)
 *
 * Uses the nested arc structure: Campaign → Acts → Episodes, each with planned encounters.
 *
 * Design Principles:
 *   #7  RAG — pulls existing lore/creatures for thematic arcs
 *   #8  Graceful Degradation — 30s timeout, template arcs
 *   #15 Tension-Driven — arc content responds to tension score
 */
import type {
  GeneratorDependencies,
  ArcGenerationRequest,
  GeneratedArc,
  StoryAct,
  StoryEpisode,
  GeneratedQuest,
  PlannedEncounter,
} from './types';

// ─── System Prompt ──────────────────────────────────────────

const ARC_SYSTEM_PROMPT = `You are the Story Arc Architect for a solo PF2e campaign set in Golarion.

Given the current state of the campaign (active plot threads, tension, recent events, party level), generate a story arc — a sequence of episodes that advances or introduces plot threads.

Rules:
1. Each arc has 1-3 acts, each act has 2-4 episodes.
2. Episodes have a primary mode: exploration, encounter, social, downtime, or travel.
3. High tension (70+) → main plot episodes dominate. Low tension (<30) → side content, downtime.
4. Moderate tension (30-70) → mix of main plot and side content.
5. Each encounter should have a difficulty appropriate for the tension and story moment.
6. Include branching outcomes: what happens if the player succeeds, fails, or does something unexpected.
7. Quest objectives should be concrete and measurable.
8. Plot threads should reference existing threads when advancing, or clearly introduce new ones.
9. Act tension goals: 'rising' for buildup, 'peak' for climax, 'falling' for resolution/cooldown.

Respond with valid JSON.`;

const GENERATION_TIMEOUT_MS = 30_000;

export class AdventureArcGenerator {
  private deps: GeneratorDependencies;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /**
   * Generate a new story arc based on current campaign state.
   */
  async generate(request: ArcGenerationRequest): Promise<GeneratedArc> {
    try {
      const lore = await this.gatherContext(request);
      const prompt = this.buildPrompt(request, lore);

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: ARC_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: ARC_SCHEMA,
        maxTokens: 3000,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'arc-gen',
      });

      const parsed = JSON.parse(result.content);
      return this.normalizeArc(parsed, request);
    } catch {
      return this.buildFallback(request);
    }
  }

  /**
   * Improvise: re-plan the next few episodes when the player goes off-script.
   * Less expensive than full arc gen — just 2-3 episodes.
   */
  async improvise(
    currentSituation: string,
    partyLevel: number,
    tension: number,
    location: string,
  ): Promise<StoryEpisode[]> {
    try {
      const prompt = `The player has gone off-script. Current situation:
${currentSituation}

Party level: ${partyLevel}, Tension: ${tension}/100, Location: ${location}

Generate 2-3 improvised episodes that:
1. Acknowledge what the player did
2. Incorporate consequences of their actions
3. Create new hooks that can reconnect to the main plot later
4. Match the tension level (${tension <= 30 ? 'low — lighter content' : tension >= 70 ? 'high — urgent, main plot' : 'moderate — mixed'})

JSON format: array of episodes.`;

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: ARC_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: EPISODES_SCHEMA,
        maxTokens: 1500,
        timeoutMs: 15_000,
        kvCacheHint: 'arc-gen',
      });

      const parsed = JSON.parse(result.content);
      const episodes: any[] = Array.isArray(parsed) ? parsed : parsed.episodes || [];
      return episodes.map((e: any, i: number) => this.normalizeEpisode(e, i + 1));
    } catch {
      return this.fallbackEpisodes(partyLevel, tension);
    }
  }

  // ─── Context ────────────────────────────────────────────────

  private async gatherContext(request: ArcGenerationRequest): Promise<string> {
    const query = `${request.themes.join(' ')} ${request.location} level ${request.partyLevel}`;
    const results = await this.deps.knowledgeBase.query(query, 4);
    return results.map(r => `[${r.title}] ${r.content.slice(0, 200)}`).join('\n');
  }

  private buildPrompt(request: ArcGenerationRequest, lore: string): string {
    const tensionLabel = request.currentTension <= 30 ? 'LOW' : request.currentTension >= 70 ? 'HIGH' : 'MODERATE';

    return `Generate a story arc for this campaign state:

- Party Level: ${request.partyLevel}
- Current Tension: ${request.currentTension}/100 (${tensionLabel})
- Location: ${request.location}
- Themes: ${request.themes.join(', ')}
- Active Plot Threads: ${request.activeThreads.length > 0 ? request.activeThreads.join(', ') : '(none)'}
- Recent Events: ${request.recentEvents || '(fresh start)'}

${lore ? `LORE CONTEXT:\n${lore}` : ''}

Generate:
1. Arc title
2. 1-3 acts with episodes (mode, encounters, branches)
3. New plot threads to introduce (if any)
4. New quests to offer the player

JSON format.`;
  }

  // ─── Normalize ──────────────────────────────────────────────

  private normalizeArc(raw: any, request: ArcGenerationRequest): GeneratedArc {
    return {
      title: raw.title || 'Untitled Arc',
      acts: Array.isArray(raw.acts)
        ? raw.acts.map((a: any, i: number) => this.normalizeAct(a, i + 1, request))
        : this.defaultActs(request),
      newPlotThreads: Array.isArray(raw.newPlotThreads)
        ? raw.newPlotThreads.map((t: any) => ({
            title: t.title || 'New Thread',
            description: t.description || '',
            priority: t.priority || 'side',
          }))
        : [],
      newQuests: Array.isArray(raw.newQuests)
        ? raw.newQuests.map((q: any) => this.normalizeQuest(q, request))
        : [],
      isFallback: false,
    };
  }

  private normalizeAct(raw: any, actNumber: number, request: ArcGenerationRequest): StoryAct {
    const tensionGoals: Array<'rising' | 'peak' | 'falling'> = ['rising', 'peak', 'falling'];
    return {
      actNumber,
      title: raw?.title || `Act ${actNumber}`,
      synopsis: raw?.synopsis || '',
      tensionGoal: raw?.tensionGoal || tensionGoals[Math.min(actNumber - 1, 2)],
      episodes: Array.isArray(raw?.episodes)
        ? raw.episodes.map((e: any, i: number) => this.normalizeEpisode(e, i + 1))
        : this.fallbackEpisodes(request.partyLevel, request.currentTension),
    };
  }

  private normalizeEpisode(raw: any, episodeNumber: number): StoryEpisode {
    return {
      episodeNumber,
      title: raw?.title || `Episode ${episodeNumber}`,
      synopsis: raw?.synopsis || '',
      mode: raw?.mode || 'exploration',
      keyNPCs: Array.isArray(raw?.keyNPCs) ? raw.keyNPCs : [],
      location: raw?.location || 'Unknown',
      objectives: Array.isArray(raw?.objectives) ? raw.objectives : [],
      plannedEncounters: Array.isArray(raw?.plannedEncounters)
        ? raw.plannedEncounters.map((e: any) => this.normalizeEncounter(e))
        : [],
      branches: Array.isArray(raw?.branches)
        ? raw.branches.map((b: any) => ({
            condition: b?.condition || 'Alternative',
            outcome: b?.outcome || 'The story adapts.',
          }))
        : [],
    };
  }

  private normalizeEncounter(raw: any): PlannedEncounter {
    return {
      description: raw?.description || 'An encounter',
      difficulty: raw?.difficulty || 'moderate',
      creatureThemes: Array.isArray(raw?.creatureThemes) ? raw.creatureThemes : [],
      terrain: raw?.terrain,
      objectiveOverride: raw?.objectiveOverride,
    };
  }

  private normalizeQuest(raw: any, request: ArcGenerationRequest): GeneratedQuest {
    return {
      title: raw?.title || 'New Quest',
      description: raw?.description || 'A task for the adventurer.',
      type: raw?.type || 'side',
      source: raw?.source || 'Unknown',
      objectives: Array.isArray(raw?.objectives)
        ? raw.objectives.map((o: any) => ({
            description: typeof o === 'string' ? o : o?.description || 'Complete objective',
            optional: typeof o === 'object' ? !!o.optional : false,
          }))
        : [{ description: 'Complete the quest.', optional: false }],
      xpReward: raw?.xpReward || this.xpForLevel(request.partyLevel),
      rewards: Array.isArray(raw?.rewards) ? raw.rewards : [],
      plotThreadId: raw?.plotThreadId,
      deadlineDays: raw?.deadlineDays,
    };
  }

  // ─── Fallback ───────────────────────────────────────────────

  private buildFallback(request: ArcGenerationRequest): GeneratedArc {
    return {
      title: request.currentTension >= 70 ? 'Rising Confrontation' : request.currentTension <= 30 ? 'Quiet Interlude' : 'Unfolding Events',
      acts: this.defaultActs(request),
      newPlotThreads: [{
        title: 'Mysterious Signs',
        description: 'Strange occurrences hint at a deeper threat in the region.',
        priority: 'secondary',
      }],
      newQuests: [{
        title: 'Investigate the Disturbance',
        description: 'Something unusual has been reported nearby. It warrants investigation.',
        type: 'side',
        source: 'Local rumor',
        objectives: [{ description: 'Travel to the disturbance site.', optional: false }, { description: 'Determine the cause.', optional: false }],
        xpReward: this.xpForLevel(request.partyLevel),
        rewards: ['Information about the region'],
      }],
      isFallback: true,
    };
  }

  private defaultActs(request: ArcGenerationRequest): StoryAct[] {
    const episodes = this.fallbackEpisodes(request.partyLevel, request.currentTension);
    return [{
      actNumber: 1,
      title: 'Investigation',
      synopsis: 'The adventurer follows leads and uncovers what lies beneath the surface.',
      tensionGoal: request.currentTension >= 70 ? 'peak' : 'rising',
      episodes,
    }];
  }

  private fallbackEpisodes(partyLevel: number, tension: number): StoryEpisode[] {
    const difficulty = tension >= 70 ? 'severe' as const : tension >= 40 ? 'moderate' as const : 'low' as const;

    const episodes: StoryEpisode[] = [
      {
        episodeNumber: 1,
        title: 'Investigation',
        synopsis: 'Gather information and explore the area.',
        mode: 'exploration',
        keyNPCs: [],
        location: 'Local area',
        objectives: ['Search for clues', 'Talk to locals'],
        plannedEncounters: [],
        branches: [],
      },
      {
        episodeNumber: 2,
        title: 'Confrontation',
        synopsis: 'Face the source of the disturbance.',
        mode: 'encounter',
        keyNPCs: [],
        location: 'Threat location',
        objectives: ['Defeat or resolve the threat'],
        plannedEncounters: [{
          description: 'The source of the trouble.',
          difficulty,
          creatureThemes: [],
        }],
        branches: [{ condition: 'Player negotiates', outcome: 'Peaceful resolution, different rewards.' }],
      },
    ];

    // Low tension: add downtime episode
    if (tension < 30) {
      episodes.push({
        episodeNumber: 3,
        title: 'Rest & Recovery',
        synopsis: 'Time to rest, shop, and prepare.',
        mode: 'downtime',
        keyNPCs: [],
        location: 'Town',
        objectives: ['Rest and prepare', 'Visit shops'],
        plannedEncounters: [],
        branches: [],
      });
    }

    return episodes;
  }

  private xpForLevel(level: number): number {
    // Roughly: moderate encounter XP (solo) as quest reward
    if (level <= 3) return 60;
    if (level <= 7) return 80;
    if (level <= 12) return 100;
    if (level <= 16) return 120;
    return 150;
  }
}

// ─── JSON Schemas ───────────────────────────────────────────

const ARC_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    acts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          synopsis: { type: 'string' },
          tensionGoal: { type: 'string', enum: ['rising', 'peak', 'falling'] },
          episodes: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    newPlotThreads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['main', 'secondary', 'side'] },
        },
      },
    },
    newQuests: { type: 'array', items: { type: 'object' } },
  },
  required: ['title', 'acts'],
};

const EPISODES_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      synopsis: { type: 'string' },
      mode: { type: 'string' },
      keyNPCs: { type: 'array', items: { type: 'string' } },
      location: { type: 'string' },
      objectives: { type: 'array', items: { type: 'string' } },
      plannedEncounters: { type: 'array', items: { type: 'object' } },
      branches: { type: 'array', items: { type: 'object' } },
    },
  },
};
