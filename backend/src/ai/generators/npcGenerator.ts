/**
 * NPCGenerator — Creates NPC personality cards with tactical preferences.
 *
 * Generates thematic NPCs grounded in Golarion lore via RAG.
 * Each NPC has personality, speech pattern, connections, and tactical behavior
 * that other systems (StoryAI, TacticianAI, ExplorationAI) can reference.
 *
 * Design Principles:
 *   #7  RAG — pulls ancestries, classes, and lore from knowledge base
 *   #8  Graceful Degradation — 15s timeout, template fallback
 *   #15 Tension-Driven — enemy NPCs generated at appropriate threat level
 */
import type {
  GeneratorDependencies,
  NPCGenerationRequest,
  GeneratedNPC,
  TacticalPreference,
} from './types';

// ─── System Prompt ──────────────────────────────────────────

const NPC_SYSTEM_PROMPT = `You are the NPC Designer for a solo PF2e campaign set in Golarion.

Given a role, level, location, and themes, create a vivid NPC personality card.

Rules:
1. Names should fit Golarion's setting (Pathfinder ancestries and cultures).
2. Description should be 1-2 sentences of VISUAL appearance only.
3. Personality should be 1-2 sentences of behavioral traits and demeanor.
4. Speech patterns should be brief and distinctive (e.g., "formal, avoids contractions", "peppers speech with dwarven oaths").
5. Secret goals should exist for most NPCs — even allies have personal agendas.
6. Tactical preference should match the NPC's personality (a coward flees early, a fanatic fights to the death).
7. Avoid generic fantasy tropes. Give each NPC a distinctive quirk or hook.
8. Connections should reference other NPCs when provided.

Respond with valid JSON.`;

const GENERATION_TIMEOUT_MS = 15_000;

/** Pre-built name pools by ancestry for fallback generation. */
const NAME_POOLS: Record<string, string[]> = {
  human: ['Alaric Thorne', 'Mira Blackwell', 'Caelen Dross', 'Jorin Ashford', 'Sable Voss', 'Theron Gale', 'Elara Nightwind', 'Bran Copperfield'],
  elf: ['Aelindra Starweave', 'Thalion Moonbark', 'Liressil Dawnpetal', 'Caelthir Windglass', 'Faelyn Mosswhisper', 'Oriniel Ashbloom'],
  dwarf: ['Brunhild Ironmantle', 'Torgin Deepdelve', 'Hilda Stoneblaze', 'Kragdir Greyhelm', 'Thordis Fireforge', 'Olvir Coalheart'],
  halfling: ['Pip Greenbottle', 'Rosalind Bramblewood', 'Corwin Lightfoot', 'Della Thistlethatch', 'Finch Hollybough'],
  gnome: ['Bixby Fizzlecrank', 'Nixie Sparklethorn', 'Tumble Cogsworth', 'Wren Glitterdust', 'Zinnia Moonsprocket'],
  goblin: ['Skreek Bonecrunch', 'Noggin Fangpicker', 'Zitta Sparks', 'Blort Mudstomp', 'Krikit Shinythief'],
  orc: ['Grath Ironfist', 'Murka Bloodstone', 'Dregak Ashclaw', 'Yenna Stormtooth', 'Brokk Skullrend'],
  default: ['Vex Shadowmere', 'Kira Stonebridge', 'Doran Ashwick', 'Lyza Fernhollow', 'Garrett Blackthorn'],
};

const PERSONALITY_TEMPLATES: Record<string, { personality: string; speechPattern: string }> = {
  ally: { personality: 'Warm and dependable, if somewhat cautious about trusting strangers.', speechPattern: 'straightforward, occasional dry humor' },
  enemy: { personality: 'Cold and calculating, with a grudge that runs deep.', speechPattern: 'precise, clipped, intimidating' },
  neutral: { personality: 'Pragmatic and self-interested, but not unkind.', speechPattern: 'casual, noncommittal' },
  bbeg: { personality: 'Charismatic and utterly ruthless, convinced of their own righteousness.', speechPattern: 'eloquent, menacing undertones' },
  merchant: { personality: 'Shrewd with a practiced smile, always looking for the profitable angle.', speechPattern: 'friendly but evasive about prices until pressed' },
  'quest-giver': { personality: 'Earnest and slightly desperate, clearly out of their depth.', speechPattern: 'breathless, speaks quickly when excited' },
};

const TACTICAL_DEFAULTS: Record<string, TacticalPreference> = {
  ally: { style: 'supportive', preferredRange: 'mixed', fleeThreshold: 25, notes: 'Stays near the player, supports with healing or flanking.' },
  enemy: { style: 'tactical', preferredRange: 'melee', fleeThreshold: 15, notes: 'Fights intelligently, uses terrain to advantage.' },
  neutral: { style: 'defensive', preferredRange: 'ranged', fleeThreshold: 50, notes: 'Avoids combat if possible. Fights only if cornered.' },
  bbeg: { style: 'tactical', preferredRange: 'mixed', fleeThreshold: 0, notes: 'Fights with minion support. Uses legendary actions and terrain. Never flees.' },
  merchant: { style: 'cowardly', preferredRange: 'ranged', fleeThreshold: 80, notes: 'Runs at the first sign of danger. May throw valuables to distract.' },
  'quest-giver': { style: 'defensive', preferredRange: 'ranged', fleeThreshold: 40, notes: 'Hides behind cover. Will fight if protecting something important.' },
};

export class NPCGenerator {
  private deps: GeneratorDependencies;
  private usedNames: Set<string> = new Set();

  constructor(deps: GeneratorDependencies) {
    this.deps = deps;
  }

  /**
   * Generate a single NPC personality card.
   */
  async generate(request: NPCGenerationRequest): Promise<GeneratedNPC> {
    // Register existing names to avoid
    if (request.existingNames) {
      for (const n of request.existingNames) this.usedNames.add(n.toLowerCase());
    }

    try {
      const lore = await this.gatherContext(request);
      const prompt = this.buildPrompt(request, lore);

      const result = await this.deps.llmService.complete({
        role: 'story',
        messages: [
          { role: 'system', content: NPC_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        jsonSchema: NPC_SCHEMA,
        maxTokens: 800,
        timeoutMs: GENERATION_TIMEOUT_MS,
        kvCacheHint: 'npc-gen',
      });

      const parsed = JSON.parse(result.content);
      const npc = this.normalize(parsed, request);
      this.usedNames.add(npc.name.toLowerCase());
      return npc;
    } catch {
      return this.buildFallback(request);
    }
  }

  /**
   * Generate a batch of NPCs for a location/scene.
   */
  async generateBatch(requests: NPCGenerationRequest[]): Promise<GeneratedNPC[]> {
    const results: GeneratedNPC[] = [];
    for (const req of requests) {
      // Pass already-generated names to avoid duplicates
      req.existingNames = [
        ...req.existingNames || [],
        ...results.map(n => n.name),
      ];
      results.push(await this.generate(req));
    }
    return results;
  }

  /** Reset the used-names tracker (e.g. new campaign). */
  resetNames(): void {
    this.usedNames.clear();
  }

  // ─── Context ────────────────────────────────────────────────

  private async gatherContext(request: NPCGenerationRequest): Promise<string> {
    const queries: string[] = [];
    if (request.location) queries.push(request.location);
    if (request.themes?.length) queries.push(request.themes.join(' '));

    const chunks: string[] = [];
    for (const q of queries) {
      const results = await this.deps.knowledgeBase.query(q, 2);
      for (const r of results) {
        chunks.push(`[${r.title}] ${r.content.slice(0, 200)}`);
      }
    }
    return chunks.join('\n');
  }

  private buildPrompt(request: NPCGenerationRequest, lore: string): string {
    const avoidList = request.existingNames?.length
      ? `\nAvoid these names (already used): ${request.existingNames.join(', ')}`
      : '';

    return `Generate an NPC with these parameters:
- Role: ${request.role}
- Level: ${request.level}
${request.location ? `- Location: ${request.location}` : ''}
${request.themes?.length ? `- Themes: ${request.themes.join(', ')}` : ''}
${request.plotThreadId ? `- Related plot thread: ${request.plotThreadId}` : ''}
${avoidList}

${lore ? `LORE CONTEXT:\n${lore}` : ''}

Generate a vivid NPC personality card. JSON format.`;
  }

  // ─── Normalize ──────────────────────────────────────────────

  private normalize(raw: any, request: NPCGenerationRequest): GeneratedNPC {
    const role = request.role;
    const template = PERSONALITY_TEMPLATES[role] || PERSONALITY_TEMPLATES.neutral;
    const tacticalDefault = TACTICAL_DEFAULTS[role] || TACTICAL_DEFAULTS.neutral;

    return {
      name: raw.name || this.pickFallbackName(raw.ancestry),
      role: role as any,
      ancestry: raw.ancestry || 'Human',
      class: raw.class,
      level: raw.level || request.level,
      description: raw.description || 'An unremarkable individual.',
      personality: raw.personality || template.personality,
      secretGoal: raw.secretGoal,
      disposition: typeof raw.disposition === 'number'
        ? Math.max(-100, Math.min(100, raw.disposition))
        : (role === 'ally' ? 30 : role === 'enemy' || role === 'bbeg' ? -60 : 0),
      location: raw.location || request.location || 'Unknown',
      speechPattern: raw.speechPattern || template.speechPattern,
      tacticalPreference: raw.tacticalPreference || tacticalDefault,
      connections: Array.isArray(raw.connections) ? raw.connections : [],
    };
  }

  // ─── Fallback ───────────────────────────────────────────────

  private buildFallback(request: NPCGenerationRequest): GeneratedNPC {
    const ancestry = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome'][Math.floor(Math.random() * 5)];
    const template = PERSONALITY_TEMPLATES[request.role] || PERSONALITY_TEMPLATES.neutral;
    const tactical = TACTICAL_DEFAULTS[request.role] || TACTICAL_DEFAULTS.neutral;
    const name = this.pickFallbackName(ancestry);

    this.usedNames.add(name.toLowerCase());

    return {
      name,
      role: request.role as any,
      ancestry,
      level: request.level,
      description: `A ${ancestry.toLowerCase()} of average build.`,
      personality: template.personality,
      disposition: request.role === 'ally' ? 30 : request.role === 'enemy' || request.role === 'bbeg' ? -60 : 0,
      location: request.location || 'Unknown',
      speechPattern: template.speechPattern,
      tacticalPreference: tactical,
      connections: [],
    };
  }

  private pickFallbackName(ancestry?: string): string {
    const key = (ancestry || 'default').toLowerCase();
    const pool = NAME_POOLS[key] || NAME_POOLS.default;
    const available = pool.filter(n => !this.usedNames.has(n.toLowerCase()));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    // All names used — generate a numbered fallback
    return `Traveler #${this.usedNames.size + 1}`;
  }
}

// ─── JSON Schema ────────────────────────────────────────────

const NPC_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    ancestry: { type: 'string' },
    class: { type: 'string' },
    level: { type: 'number' },
    description: { type: 'string' },
    personality: { type: 'string' },
    secretGoal: { type: 'string' },
    disposition: { type: 'number' },
    location: { type: 'string' },
    speechPattern: { type: 'string' },
    tacticalPreference: {
      type: 'object',
      properties: {
        style: { type: 'string' },
        preferredRange: { type: 'string' },
        fleeThreshold: { type: 'number' },
        notes: { type: 'string' },
      },
    },
    connections: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'description', 'personality'],
};
