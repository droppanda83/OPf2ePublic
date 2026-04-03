/**
 * SessionZeroGenerator — Creates a full campaign framework from player input.
 *
 * Given the player's character, backstory, and preferences, generates:
 *  - BBEG + motivation tied to backstory hooks
 *  - Starting location + key campaign locations
 *  - Nested story arc (campaign → acts → episodes)
 *  - Initial NPCs, quests, and opening scene
 *  - Secret plots hidden from the player
 *
 * Design Principles:
 *   This is "Phase 0" — must work before the first session can begin.
 *   #1 AI Narrates, Rules Judge — generates story, not mechanics
 *   #7 RAG — pulls Golarion lore + creatures for thematic grounding
 *   #8 Graceful Degradation — 60s timeout, then template-based fallback
 *   #15 Tension-Driven — arc structure follows tension curve
 */
import type { GeneratorDependencies, SessionZeroInput, CampaignFramework, GeneratedNPC, GeneratedLocation, StoryAct, StoryEpisode, GeneratedQuest } from './types';

// ─── System Prompt ──────────────────────────────────────────

const SESSION_ZERO_SYSTEM_PROMPT = `You are the Campaign Architect for a solo PF2e game set in Golarion (Pathfinder's Inner Sea region).

Given a player's character (class, ancestry, backstory) and campaign preferences (tone, themes, pacing), you design a complete campaign framework.

Rules:
1. The BBEG's motivation MUST connect to the player's backstory or chosen themes.
2. The story uses a nested arc structure: Campaign Arc → 3 Acts → 3-5 Episodes each.
3. Act 1 = setup/rising action, Act 2 = complications/escalation, Act 3 = climax/resolution.
4. Each episode has a primary gameplay mode (exploration, encounter, social, downtime, travel).
5. Include 2-3 secret plots the player won't learn until later.
6. Initial NPCs should include at least 1 ally, 1 quest-giver, and 1 suspicious neutral.
7. Opening scene should hook the player within the first 5 minutes.
8. Quest objectives should be concrete and achievable, not vague.
9. Locations must be real Golarion locations OR logically placed custom locations.
10. Encounters should reference appropriate creatures for the region and level.

Always respond with valid JSON matching the requested schema.`;

// ─── Timeout / fallback ─────────────────────────────────────
const GENERATION_TIMEOUT_MS = 60_000;

export class SessionZeroGenerator {
  private deps: GeneratorDependencies;

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /**
   * Generate a full campaign framework from Session Zero input.
   */
  async generate(input: SessionZeroInput): Promise<CampaignFramework> {
    try {
      // Pull lore relevant to the player's themes and backstory
      const loreContext = await this.gatherLoreContext(input);

      const userPrompt = this.buildUserPrompt(input, loreContext);

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: SESSION_ZERO_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        jsonSchema: SESSION_ZERO_SCHEMA,
        maxTokens: 4000,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'session-zero',
      });

      const parsed = JSON.parse(result.content);
      return this.validateAndNormalize(parsed, input);
    } catch (err) {
      console.error('SessionZeroGenerator: LLM generation failed, using fallback:', err);
      return this.buildFallback(input);
    }
  }

  // ─── Context gathering ──────────────────────────────────────

  private async gatherLoreContext(input: SessionZeroInput): Promise<string> {
    const queries = [
      input.backstory,
      input.campaignPreferences.themes.join(' '),
      `${input.ancestry} ${input.characterClass} Golarion`,
    ];

    const chunks: string[] = [];
    for (const q of queries) {
      const results = await this.deps.knowledgeBase.query(q, 3);
      for (const r of results) {
        if (chunks.length < 8) {
          chunks.push(`[${r.title}] ${r.content.slice(0, 300)}`);
        }
      }
    }
    return chunks.join('\n\n');
  }

  private buildUserPrompt(input: SessionZeroInput, lore: string): string {
    const prefs = input.campaignPreferences;
    return `Generate a campaign framework for this player:

CHARACTER:
- Name: ${input.characterName}
- Class: ${input.characterClass}, Level ${input.characterLevel}
- Ancestry: ${input.ancestry}
- Background: ${input.background}
- Backstory: ${input.backstory}

PREFERENCES:
- Campaign Name: ${prefs.campaignName || '(suggest one)'}
- Tone: ${prefs.tone}
- Themes: ${prefs.themes.join(', ')}
- Pacing: ${prefs.pacing}
- Encounter Balance: ${prefs.encounterBalance}
${prefs.customNotes ? `- Player Notes: ${prefs.customNotes}` : ''}

GOLARION LORE CONTEXT:
${lore || '(No specific lore retrieved — use general Inner Sea knowledge)'}

Generate:
1. Campaign name and synopsis
2. A BBEG connected to the character's backstory or themes
3. Starting location + 3-5 key locations
4. 3 acts, each with 3-5 episodes (mode, objectives, planned encounters, branches)
5. 3-5 initial NPCs (ally, quest-giver, neutral, potential enemy)
6. Opening scene narration (2-3 paragraphs, hook the player immediately)
7. 2-3 initial quests
8. 2-3 secret plots

JSON format required.`;
  }

  // ─── Validation ─────────────────────────────────────────────

  private validateAndNormalize(raw: any, input: SessionZeroInput): CampaignFramework {
    const framework: CampaignFramework = {
      campaignName: raw.campaignName || input.campaignPreferences.campaignName || 'Untitled Campaign',
      synopsis: raw.synopsis || 'A solo adventure in the Inner Sea.',
      tone: raw.tone || input.campaignPreferences.tone,
      themes: raw.themes || input.campaignPreferences.themes,
      bbeg: this.normalizeNPC(raw.bbeg, 'bbeg', input.characterLevel + 3),
      bbegMotivation: raw.bbegMotivation || 'Seeks power at any cost.',
      startingLocation: this.normalizeLocation(raw.startingLocation),
      keyLocations: Array.isArray(raw.keyLocations)
        ? raw.keyLocations.map((l: any) => this.normalizeLocation(l))
        : [],
      acts: Array.isArray(raw.acts)
        ? raw.acts.map((a: any, i: number) => this.normalizeAct(a, i + 1))
        : this.defaultActs(),
      initialNPCs: Array.isArray(raw.initialNPCs)
        ? raw.initialNPCs.map((n: any) => this.normalizeNPC(n, n.role || 'neutral', input.characterLevel))
        : [],
      openingScene: raw.openingScene || 'You arrive at a crossroads as the sun sets...',
      initialQuests: Array.isArray(raw.initialQuests)
        ? raw.initialQuests.map((q: any) => this.normalizeQuest(q))
        : [],
      secretPlots: Array.isArray(raw.secretPlots) ? raw.secretPlots : [],
      isFallback: false,
    };
    return framework;
  }

  private normalizeNPC(raw: any, defaultRole: string, level: number): GeneratedNPC {
    if (!raw || typeof raw !== 'object') {
      return {
        name: 'Unknown NPC', role: defaultRole as any, ancestry: 'Human',
        level, description: 'A mysterious figure.', personality: 'Guarded and watchful.',
        disposition: 0, location: 'Unknown', connections: [],
      };
    }
    return {
      name: raw.name || 'Unnamed NPC',
      role: raw.role || defaultRole,
      ancestry: raw.ancestry || 'Human',
      class: raw.class,
      level: raw.level || level,
      description: raw.description || 'An unremarkable individual.',
      personality: raw.personality || 'Reserved.',
      secretGoal: raw.secretGoal,
      disposition: typeof raw.disposition === 'number' ? Math.max(-100, Math.min(100, raw.disposition)) : 0,
      location: raw.location || 'Unknown',
      speechPattern: raw.speechPattern,
      tacticalPreference: raw.tacticalPreference,
      connections: Array.isArray(raw.connections) ? raw.connections : [],
    };
  }

  private normalizeLocation(raw: any): GeneratedLocation {
    if (!raw || typeof raw !== 'object') {
      return {
        name: 'Unknown Location', type: 'town', region: 'Inner Sea',
        description: 'A settlement.', atmosphere: 'Quiet.',
        notableFeatures: [], connections: [],
      };
    }
    return {
      name: raw.name || 'Unknown',
      type: raw.type || 'town',
      region: raw.region || 'Inner Sea',
      description: raw.description || '',
      atmosphere: raw.atmosphere || '',
      notableFeatures: Array.isArray(raw.notableFeatures) ? raw.notableFeatures : [],
      connections: Array.isArray(raw.connections) ? raw.connections : [],
    };
  }

  private normalizeAct(raw: any, actNumber: number): StoryAct {
    const tensionGoals: Array<'rising' | 'peak' | 'falling'> = ['rising', 'peak', 'falling'];
    return {
      actNumber,
      title: raw?.title || `Act ${actNumber}`,
      synopsis: raw?.synopsis || '',
      tensionGoal: raw?.tensionGoal || tensionGoals[Math.min(actNumber - 1, 2)],
      episodes: Array.isArray(raw?.episodes)
        ? raw.episodes.map((e: any, i: number) => this.normalizeEpisode(e, i + 1))
        : [],
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
        ? raw.plannedEncounters.map((e: any) => ({
            description: e?.description || 'An encounter',
            difficulty: e?.difficulty || 'moderate',
            creatureThemes: Array.isArray(e?.creatureThemes) ? e.creatureThemes : [],
            terrain: e?.terrain,
            objectiveOverride: e?.objectiveOverride,
          }))
        : [],
      branches: Array.isArray(raw?.branches)
        ? raw.branches.map((b: any) => ({
            condition: b?.condition || 'If the player acts differently',
            outcome: b?.outcome || 'The story adapts.',
          }))
        : [],
    };
  }

  private normalizeQuest(raw: any): GeneratedQuest {
    return {
      title: raw?.title || 'Unnamed Quest',
      description: raw?.description || 'A task awaits.',
      type: raw?.type || 'side',
      source: raw?.source || 'Unknown',
      objectives: Array.isArray(raw?.objectives)
        ? raw.objectives.map((o: any) => ({
            description: typeof o === 'string' ? o : o?.description || 'Complete objective',
            optional: typeof o === 'object' ? !!o.optional : false,
          }))
        : [{ description: 'Complete the quest.', optional: false }],
      xpReward: raw?.xpReward || 80,
      rewards: Array.isArray(raw?.rewards) ? raw.rewards : [],
      plotThreadId: raw?.plotThreadId,
      deadlineDays: raw?.deadlineDays,
    };
  }

  // ─── Fallback ───────────────────────────────────────────────

  private buildFallback(input: SessionZeroInput): CampaignFramework {
    const prefs = input.campaignPreferences;
    const themeStr = prefs.themes.join(' and ');

    return {
      campaignName: prefs.campaignName || `${input.characterName}'s Quest`,
      synopsis: `${input.characterName}, a ${input.ancestry} ${input.characterClass}, embarks on a journey through the Inner Sea. Drawn by fate and ${themeStr}, they must uncover the truth behind a growing threat and confront the mastermind within.`,
      tone: prefs.tone,
      themes: prefs.themes,
      bbeg: {
        name: 'The Veiled Sovereign',
        role: 'bbeg',
        ancestry: 'Human',
        level: input.characterLevel + 3,
        description: 'A shadowy figure whose influence extends across the region.',
        personality: 'Methodical, patient, and utterly convinced of their righteousness.',
        secretGoal: `To reshape the world according to their vision of ${themeStr}.`,
        disposition: -80,
        location: 'Unknown',
        connections: [],
      },
      bbegMotivation: `Believes that ${themeStr} is the key to reshaping the world. Their plan requires resources the player's homeland possesses.`,
      startingLocation: {
        name: 'Otari', type: 'town', region: 'Absalom and Starstone Isle',
        description: 'A small lumber town nestled at the edge of the Immenwood forest.',
        atmosphere: 'Quiet but hiding secrets beneath the surface.',
        notableFeatures: ['Wrin\'s Wonders (oddities shop)', 'The Crook\'s Nook (tavern)', 'Gauntlight lighthouse (ruin)'],
        connections: ['Absalom', 'Immenwood Forest'],
      },
      keyLocations: [
        { name: 'Absalom', type: 'city', region: 'Absalom and Starstone Isle', description: 'The great city at the center of the world.', atmosphere: 'Bustling, cosmopolitan, layered with history.', notableFeatures: ['Starstone Cathedral', 'Grand Bazaar'], connections: ['Otari'] },
        { name: 'The Immenwood', type: 'wilderness', region: 'Absalom and Starstone Isle', description: 'A vast ancient forest concealing forgotten ruins.', atmosphere: 'Dark, primal, watchful.', notableFeatures: ['Ancient fey circles', 'Overgrown waypoints'], connections: ['Otari'] },
        { name: 'Gauntlight', type: 'dungeon', region: 'Absalom and Starstone Isle', description: 'An ancient lighthouse turned dungeon.', atmosphere: 'Eerie, decaying, magically charged.', notableFeatures: ['Ghost-light beacon', 'Underground levels'], connections: ['Otari'] },
      ],
      acts: this.defaultActs(),
      initialNPCs: [
        { name: 'Tamilyn Greyforge', role: 'ally', ancestry: 'Dwarf', level: input.characterLevel, description: 'A stout dwarven smith with calloused hands and a warm grin.', personality: 'Blunt, loyal, and quietly brave.', disposition: 40, location: 'Otari', connections: ['Wrin Sivinxi'] },
        { name: 'Wrin Sivinxi', role: 'quest-giver', ancestry: 'Elf', level: input.characterLevel + 1, description: 'An eccentric elf who runs an oddities shop.', personality: 'Cryptic, enthusiastic, easily distracted.', secretGoal: 'Searching for a lost fey artifact.', disposition: 30, location: 'Otari', connections: ['Tamilyn Greyforge'] },
        { name: 'Jarik Pale', role: 'neutral', ancestry: 'Human', level: input.characterLevel, description: 'A quiet traveler who arrived in town recently.', personality: 'Evasive, polite, watching everything.', secretGoal: 'Spy for a distant faction.', disposition: 0, location: 'Otari', connections: [] },
      ],
      openingScene: `The road to Otari is quiet as ${input.characterName} crests the final hill. Below, the small lumber town sits at the forest's edge, smoke curling from chimneys in the fading afternoon light. The Crook's Nook tavern glows warmly, but something else catches your eye — a pale light flickering atop the old Gauntlight lighthouse to the north. It hasn't been lit in decades.\n\nAs you descend into town, a dwarven woman flags you down from her open forge. "You look like someone who handles trouble. Name's Tamilyn. I'd buy you an ale if you've got a minute — there's been strange goings-on and I could use someone with your look about them."`,
      initialQuests: [
        { title: 'The Flickering Light', description: 'Investigate the mysterious light seen atop the Gauntlight lighthouse.', type: 'main', source: 'Tamilyn Greyforge', objectives: [{ description: 'Travel to Gauntlight and investigate the source of the light.', optional: false }, { description: 'Report findings back to Tamilyn.', optional: false }], xpReward: 80, rewards: ['Information about the region', 'Tamilyn\'s friendship'], deadlineDays: 7 },
        { title: 'Wrin\'s Curio', description: 'Wrin Sivinxi is looking for a specific item lost in the Immenwood.', type: 'side', source: 'Wrin Sivinxi', objectives: [{ description: 'Search the Immenwood for the fey artifact Wrin described.', optional: false }], xpReward: 60, rewards: ['Uncommon magic item'], deadlineDays: 14 },
      ],
      secretPlots: [
        'Jarik Pale is a spy for the Veiled Sovereign, reporting on newcomers.',
        'The Gauntlight is being reactivated as part of the BBEG\'s larger plan.',
        'Tamilyn\'s family mine was seized by the BBEG\'s agents years ago — she doesn\'t know they\'re connected.',
      ],
      isFallback: true,
    };
  }

  private defaultActs(): StoryAct[] {
    return [
      {
        actNumber: 1, title: 'Gathering Storm', synopsis: 'The player arrives, meets allies, and uncovers the first signs of a larger threat.',
        tensionGoal: 'rising',
        episodes: [
          { episodeNumber: 1, title: 'Arrival', synopsis: 'Player arrives at the starting location and meets initial NPCs.', mode: 'exploration', keyNPCs: [], location: 'Starting Town', objectives: ['Meet key NPCs', 'Accept first quest'], plannedEncounters: [], branches: [] },
          { episodeNumber: 2, title: 'First Task', synopsis: 'Player undertakes their first quest.', mode: 'exploration', keyNPCs: [], location: 'Nearby', objectives: ['Complete first objective'], plannedEncounters: [{ description: 'A minor threat guards the objective.', difficulty: 'low', creatureThemes: ['beast'] }], branches: [] },
          { episodeNumber: 3, title: 'Rising Stakes', synopsis: 'Discovery reveals the threat is larger than expected.', mode: 'social', keyNPCs: [], location: 'Starting Town', objectives: ['Learn about the larger threat'], plannedEncounters: [], branches: [] },
        ],
      },
      {
        actNumber: 2, title: 'Into the Depths', synopsis: 'The player pursues the main threat, facing escalating challenges and hard choices.',
        tensionGoal: 'peak',
        episodes: [
          { episodeNumber: 1, title: 'Pursuit', synopsis: 'Player follows leads to a new location.', mode: 'travel', keyNPCs: [], location: 'Wilderness', objectives: ['Reach the next location'], plannedEncounters: [{ description: 'Road encounter.', difficulty: 'moderate', creatureThemes: [] }], branches: [] },
          { episodeNumber: 2, title: 'Confrontation', synopsis: 'A lieutenant of the BBEG is encountered.', mode: 'encounter', keyNPCs: [], location: 'Key Location', objectives: ['Defeat or negotiate with the lieutenant'], plannedEncounters: [{ description: 'Lieutenant boss fight.', difficulty: 'severe', creatureThemes: [] }], branches: [{ condition: 'Player negotiates', outcome: 'Lieutenant becomes informant.' }] },
          { episodeNumber: 3, title: 'Revelations', synopsis: 'The true scope of the BBEG\'s plan is revealed.', mode: 'exploration', keyNPCs: [], location: 'Key Location', objectives: ['Uncover the BBEG\'s plan'], plannedEncounters: [], branches: [] },
        ],
      },
      {
        actNumber: 3, title: 'The Final Reckoning', synopsis: 'The player confronts the BBEG and determines the fate of the region.',
        tensionGoal: 'falling',
        episodes: [
          { episodeNumber: 1, title: 'Preparations', synopsis: 'Player gathers allies and resources for the final confrontation.', mode: 'downtime', keyNPCs: [], location: 'Starting Town', objectives: ['Prepare for the final battle'], plannedEncounters: [], branches: [] },
          { episodeNumber: 2, title: 'The Siege', synopsis: 'The final location under assault.', mode: 'encounter', keyNPCs: [], location: 'BBEG Stronghold', objectives: ['Breach the stronghold'], plannedEncounters: [{ description: 'Stronghold defenders.', difficulty: 'severe', creatureThemes: [] }], branches: [] },
          { episodeNumber: 3, title: 'Climax', synopsis: 'Face-to-face with the BBEG.', mode: 'encounter', keyNPCs: [], location: 'BBEG Stronghold', objectives: ['Defeat the BBEG'], plannedEncounters: [{ description: 'BBEG final battle.', difficulty: 'extreme', creatureThemes: ['bbeg'] }], branches: [{ condition: 'Player spares the BBEG', outcome: 'The BBEG returns as a recurring threat in future campaigns.' }] },
        ],
      },
    ];
  }
}

// ─── JSON Schema for LLM constraint ─────────────────────────

const SESSION_ZERO_SCHEMA = {
  type: 'object',
  properties: {
    campaignName: { type: 'string' },
    synopsis: { type: 'string' },
    tone: { type: 'string' },
    themes: { type: 'array', items: { type: 'string' } },
    bbeg: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        role: { type: 'string' },
        ancestry: { type: 'string' },
        class: { type: 'string' },
        level: { type: 'number' },
        description: { type: 'string' },
        personality: { type: 'string' },
        secretGoal: { type: 'string' },
        disposition: { type: 'number' },
        location: { type: 'string' },
        speechPattern: { type: 'string' },
        connections: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'description', 'personality'],
    },
    bbegMotivation: { type: 'string' },
    startingLocation: { $ref: '#/$defs/location' },
    keyLocations: { type: 'array', items: { $ref: '#/$defs/location' } },
    acts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          synopsis: { type: 'string' },
          tensionGoal: { type: 'string', enum: ['rising', 'peak', 'falling'] },
          episodes: {
            type: 'array', items: {
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
          },
        },
      },
    },
    initialNPCs: { type: 'array', items: { type: 'object' } },
    openingScene: { type: 'string' },
    initialQuests: { type: 'array', items: { type: 'object' } },
    secretPlots: { type: 'array', items: { type: 'string' } },
  },
  required: ['campaignName', 'synopsis', 'bbeg', 'acts', 'openingScene'],
  $defs: {
    location: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        region: { type: 'string' },
        description: { type: 'string' },
        atmosphere: { type: 'string' },
        notableFeatures: { type: 'array', items: { type: 'string' } },
        connections: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'description'],
    },
  },
};
