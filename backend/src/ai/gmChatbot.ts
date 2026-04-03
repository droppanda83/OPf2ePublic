/**
 * PHASE 19: AI GM Chatbot
 * 
 * The AI GM runs alongside combat, providing narrative, adjudicating
 * non-mechanical decisions, and controlling encounter flow — but it
 * CANNOT override the rules engine. All mechanical actions go through
 * the same ruleValidator from Phase 0.
 */

import { AIProviders, detectProvider } from './providers';
import {
  GameState,
  GMSession,
  GMChatMessage,
  GameLog,
  CampaignPreferences,
  TensionTracker,
  TensionBand,
  RecurringNPC,
  StoryArc,
  SessionNote,
  SceneVisualState,
  Creature,
  BestiaryEntry,
  ENCOUNTER_MAP_CATALOG,
  getMapById,
} from 'pf2e-shared';
import type { FoundryMapEntry } from 'pf2e-shared/foundryMapCatalog';
// Heavy data import – loaded directly to keep the barrel lightweight
import { BESTIARY } from 'pf2e-shared/bestiary';

// ─── Tension Band Helpers ──────────────────────────────────────

export function getTensionBand(score: number): TensionBand {
  if (score <= 30) return 'low';
  if (score <= 60) return 'mid';
  if (score <= 85) return 'high';
  return 'critical';
}

function tensionBandDescription(band: TensionBand): string {
  switch (band) {
    case 'low': return 'Calm exploration, rest opportunities, lighter tone';
    case 'mid': return 'Standard encounters, balanced narration';
    case 'high': return 'Dramatic narration, enemies fight smarter, environmental hazards';
    case 'critical': return 'Desperate climax, reinforcements possible, survival stakes';
  }
}

// ─── Default GM Session Factory ────────────────────────────────

export function createDefaultGMSession(preferences?: Partial<CampaignPreferences>): GMSession {
  return {
    campaignPreferences: {
      campaignName: preferences?.campaignName || 'Untitled Campaign',
      tone: preferences?.tone || 'heroic',
      themes: preferences?.themes || ['adventure', 'exploration'],
      pacing: preferences?.pacing || 'moderate',
      encounterBalance: preferences?.encounterBalance || 'moderate',
      playerCount: preferences?.playerCount || 4,
      averageLevel: preferences?.averageLevel || 1,
      allowPvP: preferences?.allowPvP || false,
      customNotes: preferences?.customNotes,
      aiModel: preferences?.aiModel,
      mode: preferences?.mode,
      mapTheme: preferences?.mapTheme,
    },
    tensionTracker: {
      score: 20,
      trend: 'stable',
      lastUpdated: Date.now(),
      history: [{ score: 20, reason: 'Campaign start', timestamp: Date.now() }],
    },
    chatHistory: [],
    sessionNotes: [],
    recurringNPCs: [],
    storyArc: undefined,
    currentPhase: 'exploration',
    difficulty: 'normal',
    encounterCount: 0,
    xpAwarded: 0,
    currentSceneVisual: undefined,
    currentEncounterMapId: undefined,
  };
}

// ─── GM Chatbot Class ──────────────────────────────────────────

export class GMChatbot {
  private providers: AIProviders;
  private modelName: string;

  constructor(providers: AIProviders) {
    this.modelName = (process.env.OPENAI_MODEL || 'gpt-5').trim();
    this.providers = providers;
  }

  getDefaultModel(): string {
    return this.modelName;
  }

  setDefaultModel(modelName: string): void {
    const next = (modelName || '').trim();
    if (!next) return;
    this.modelName = next;
  }

  private resolveModel(session?: GMSession): string {
    const preferred = session?.campaignPreferences?.aiModel?.trim();
    return preferred && preferred.length > 0 ? preferred : this.modelName;
  }

  async getAvailableModels(): Promise<string[]> {
    return this.providers.getAvailableModels();
  }

  /**
   * Process a player message and generate a GM response.
   * The GM can:
   *   - Narrate events
   *   - Describe the environment
   *   - Control NPC dialogue
   *   - Suggest mechanical actions (which go through the rules engine)
   *   - Adjust tension
   *   - Track story/NPC state
   * 
   * The GM CANNOT:
   *   - Override AC, ignore conditions, change HP directly
   *   - Skip rules validation
   *   - Alter dice results
   */
  async processMessage(
    playerMessage: string,
    gameState: GameState,
    session: GMSession
  ): Promise<{
    response: GMChatMessage;
    sessionUpdates: Partial<GMSession>;
    mechanicalActions: GMChatMessage['mechanicalAction'][];
  }> {
    // Build conversation context
    const recentChat = session.chatHistory.slice(-20); // Last 20 messages for context

    // Try AI-powered response first
    if (this.providers.hasAny) {
      try {
        return await this.generateAIResponse(playerMessage, gameState, session, recentChat);
      } catch (error) {
        console.warn('AI GM API call failed, using local fallback:', error);
      }
    }

    // Local fallback GM
    return this.generateLocalResponse(playerMessage, gameState, session);
  }

  // ─── AI-Powered GM Response ─────────────────────────────────

  private async generateAIResponse(
    playerMessage: string,
    gameState: GameState,
    session: GMSession,
    recentChat: GMChatMessage[]
  ): Promise<{
    response: GMChatMessage;
    sessionUpdates: Partial<GMSession>;
    mechanicalActions: GMChatMessage['mechanicalAction'][];
  }> {
    if (!this.providers.hasAny) throw new Error('No AI provider configured');

    const systemPrompt = this.buildGMSystemPrompt(gameState, session);
    const conversationHistory = recentChat.map(msg => ({
      role: msg.role === 'gm' ? 'assistant' as const : 'user' as const,
      content: msg.role === 'system' ? `[System] ${msg.content}` : msg.content,
    }));

    const result = await this.providers.chatComplete({
      model: this.resolveModel(session),
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: playerMessage },
      ],
      temperature: 0.85,
      max_tokens: session.gmResponseMaxTokens || 2000,
    });

    const rawResponse = result.content;

    // Parse response for mechanical actions and narrative
    const { narrative, mechanicalActions, tensionDelta } = this.parseGMResponse(rawResponse);

    // Build session updates
    const sessionUpdates: Partial<GMSession> = {};

    if (tensionDelta !== 0) {
      const newScore = Math.max(0, Math.min(100, session.tensionTracker.score + tensionDelta));
      sessionUpdates.tensionTracker = {
        ...session.tensionTracker,
        score: newScore,
        trend: tensionDelta > 0 ? 'rising' : tensionDelta < 0 ? 'falling' : 'stable',
        lastUpdated: Date.now(),
        history: [
          ...session.tensionTracker.history,
          { score: newScore, reason: 'GM narration adjustment', timestamp: Date.now() },
        ],
      };
    }

    const response: GMChatMessage = {
      id: `gm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      role: 'gm',
      content: narrative,
      timestamp: Date.now(),
    };

    return { response, sessionUpdates, mechanicalActions };
  }

  // ─── Bestiary Lookup Helper ─────────────────────────────────────

  private lookupBestiary(creatureName: string): BestiaryEntry | undefined {
    const lower = creatureName.toLowerCase();
    return BESTIARY.find(b => b.creature.name?.toLowerCase() === lower);
  }

  private getCreatureLore(creature: Creature): string {
    const entry = this.lookupBestiary(creature.name);
    const parts: string[] = [];
    parts.push(`${creature.name} (Lv${creature.level})`);
    if (entry) {
      if (entry.tags.length > 0) parts.push(`[${entry.tags.join(', ')}]`);
      if (entry.description) parts.push(entry.description);
    }
    if (creature.specials && creature.specials.length > 0) {
      parts.push(`Abilities: ${creature.specials.slice(0, 5).join(', ')}`);
    }
    if (creature.damageResistances.length > 0) {
      parts.push(`Resists: ${creature.damageResistances.map(r => `${r.type} ${r.value}`).join(', ')}`);
    }
    if (creature.damageWeaknesses.length > 0) {
      parts.push(`Weak to: ${creature.damageWeaknesses.map(w => `${w.type} ${w.value}`).join(', ')}`);
    }
    if (creature.damageImmunities.length > 0) {
      parts.push(`Immune: ${creature.damageImmunities.join(', ')}`);
    }
    return parts.join(' — ');
  }

  // ─── Local Fallback GM ──────────────────────────────────────

  private generateLocalResponse(
    playerMessage: string,
    gameState: GameState,
    session: GMSession
  ): {
    response: GMChatMessage;
    sessionUpdates: Partial<GMSession>;
    mechanicalActions: GMChatMessage['mechanicalAction'][];
  } {
    const lowerMsg = playerMessage.toLowerCase().trim();
    const band = getTensionBand(session.tensionTracker.score);
    const tone = session.campaignPreferences.tone;
    let narrative = '';
    let tensionDelta = 0;
    const mechanicalActions: GMChatMessage['mechanicalAction'][] = [];

    // ─── Look Around / Perception ─────────────────────────────────
    if (lowerMsg.includes('look around') || lowerMsg.includes('what do i see') || lowerMsg.includes('describe') || lowerMsg.includes('perception')) {
      narrative = this.describeEnvironment(gameState, session, band);
    }
    // ─── Rest / Camp ──────────────────────────────────────────────
    else if (lowerMsg.includes('rest') || lowerMsg.includes('camp') || lowerMsg.includes('take a break') || lowerMsg.includes('sleep')) {
      narrative = this.generateRestNarration(gameState, session, band);
      if (band !== 'high' && band !== 'critical') {
        tensionDelta = -10;
        mechanicalActions.push({
          actionType: 'narrate',
          details: { event: 'rest', healAmount: 'full' },
          success: true,
        });
      }
    }
    // ─── Talk to NPC ──────────────────────────────────────────────
    else if (lowerMsg.includes('talk to') || lowerMsg.includes('speak with') || lowerMsg.includes('ask about') || lowerMsg.includes('greet') || lowerMsg.includes('approach')) {
      narrative = this.generateNPCInteraction(lowerMsg, session, band);
    }
    // ─── Search / Investigate ─────────────────────────────────────
    else if (lowerMsg.includes('search') || lowerMsg.includes('investigate') || lowerMsg.includes('examine') || lowerMsg.includes('check') || lowerMsg.includes('inspect')) {
      narrative = this.generateSearchResult(gameState, session, band);
    }
    // ─── Attack / Fight ───────────────────────────────────────────
    else if (lowerMsg.includes('attack') || lowerMsg.includes('fight') || lowerMsg.includes('charge') || lowerMsg.includes('draw weapon')) {
      narrative = this.generateCombatResponse(gameState, session, band);
      if (session.currentPhase !== 'combat') tensionDelta = 5;
    }
    // ─── Explicit Encounter Start ─────────────────────────────────
    else if (lowerMsg.includes('start encounter') || lowerMsg.includes('begin encounter') || lowerMsg.includes('start combat') || lowerMsg.includes('begin combat') || lowerMsg.includes('roll initiative')) {
      narrative = 'You brace for battle as danger closes in. I will assemble a fitting encounter, choose terrain, and set the scene. Steel yourselves — initiative is about to begin.';
      mechanicalActions.push({
        actionType: 'start-encounter',
        details: {},
        success: false,
      });
      tensionDelta = 10;
    }
    // ─── Stealth / Sneak ──────────────────────────────────────────
    else if (lowerMsg.includes('sneak') || lowerMsg.includes('stealth') || lowerMsg.includes('hide') || lowerMsg.includes('quietly')) {
      narrative = this.generateStealthNarration(gameState, session, band);
    }
    // ─── Magic / Cast / Detect ────────────────────────────────────
    else if (lowerMsg.includes('cast') || lowerMsg.includes('magic') || lowerMsg.includes('detect') || lowerMsg.includes('arcana') || lowerMsg.includes('spell')) {
      narrative = this.generateMagicNarration(gameState, session, band);
    }
    // ─── Move / Travel / Explore ──────────────────────────────────
    else if (lowerMsg.includes('move') || lowerMsg.includes('travel') || lowerMsg.includes('walk') || lowerMsg.includes('go to') || lowerMsg.includes('head') || lowerMsg.includes('explore')) {
      narrative = this.generateTravelNarration(gameState, session, band);
    }
    // ─── What happened / Recap ────────────────────────────────────
    else if (lowerMsg.includes('recap') || lowerMsg.includes('what happened') || lowerMsg.includes('summary') || lowerMsg.includes('story so far')) {
      narrative = this.generateRecap(session);
    }
    // ─── Tension check ────────────────────────────────────────────
    else if (lowerMsg.includes('tension') || lowerMsg.includes('how dangerous') || lowerMsg.includes('how safe')) {
      narrative = `Current tension: ${session.tensionTracker.score}/100 (${band}). ${tensionBandDescription(band)}.`;
    }
    // ─── Who am I / Party info ────────────────────────────────────
    else if (lowerMsg.includes('who am i') || lowerMsg.includes('my character') || lowerMsg.includes('party') || lowerMsg.includes('companions')) {
      narrative = this.generatePartyDescription(gameState, session);
    }
    // ─── What enemies / monster info ──────────────────────────────
    else if (lowerMsg.includes('enemies') || lowerMsg.includes('monster') || lowerMsg.includes('creature') || lowerMsg.includes('what is that') || lowerMsg.includes('identify')) {
      narrative = this.generateEnemyDescription(gameState, session, band);
    }
    // ─── Loot / Treasure ──────────────────────────────────────────
    else if (lowerMsg.includes('loot') || lowerMsg.includes('treasure') || lowerMsg.includes('gold') || lowerMsg.includes('reward') || lowerMsg.includes('pick up')) {
      narrative = this.generateLootNarration(session, band);
    }
    // ─── Help / What can I do ─────────────────────────────────────
    else if (lowerMsg.includes('help') || lowerMsg.includes('what can i do') || lowerMsg.includes('options') || lowerMsg.includes('what now')) {
      narrative = this.generateSuggestions(gameState, session, band);
    }
    // ─── Generic / Roleplay response ──────────────────────────────
    else {
      narrative = this.generateGenericResponse(playerMessage, session, band);
    }

    // Apply tension changes
    const sessionUpdates: Partial<GMSession> = {};
    if (tensionDelta !== 0) {
      const newScore = Math.max(0, Math.min(100, session.tensionTracker.score + tensionDelta));
      sessionUpdates.tensionTracker = {
        ...session.tensionTracker,
        score: newScore,
        trend: tensionDelta > 0 ? 'rising' : tensionDelta < 0 ? 'falling' : 'stable',
        lastUpdated: Date.now(),
        history: [
          ...session.tensionTracker.history,
          { score: newScore, reason: `Player: ${lowerMsg.substring(0, 40)}`, timestamp: Date.now() },
        ],
      };
    }

    const response: GMChatMessage = {
      id: `gm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      role: 'gm',
      content: narrative,
      timestamp: Date.now(),
    };

    return { response, sessionUpdates, mechanicalActions };
  }

  // ─── Narrative Generation Helpers ───────────────────────────

  private describeEnvironment(gameState: GameState, session: GMSession, band: TensionBand): string {
    const { map, creatures } = gameState;
    const aliveEnemies = creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
    const alivePlayers = creatures.filter(c => c.type === 'player' && !c.dead && c.currentHealth > 0);
    const tone = session.campaignPreferences.tone;
    const parts: string[] = [];

    // Atmospheric opening based on tone + tension
    const atmospheres: Record<string, Record<TensionBand, string>> = {
      heroic: {
        low: 'Golden light filters through the area, casting long shadows across the ground. A sense of calm pervades, though adventure beckons around every corner.',
        mid: 'The wind picks up and the light dims slightly — your instincts tell you that this calm won\'t last forever.',
        high: 'The air thrums with energy. Your hand instinctively moves to your weapon as the hairs on your neck stand on end.',
        critical: 'Thunder rumbles overhead. The very ground seems to tremble with the weight of what is to come. This is it — the moment of reckoning.',
      },
      gritty: {
        low: 'The mud squelches beneath your boots. Flies buzz lazily in the stale air. It\'s quiet — too quiet for comfort in this godforsaken place.',
        mid: 'A foul wind carries the scent of something rotting. The silence is occasionally broken by distant sounds you can\'t quite identify.',
        high: 'Blood stains the earth. The stench of death hangs thick, and you can hear labored breathing from somewhere nearby.',
        critical: 'Screams echo in the distance. The ground is slick with blood, and the shadows themselves seem alive with malice.',
      },
      horror: {
        low: 'An unnatural stillness hangs in the air. Your breath mists despite the season, and the shadows seem to shift when you\'re not looking directly at them.',
        mid: 'The darkness presses against the edges of your light like a living thing. Whispers tickle the edge of your hearing — words you almost recognize.',
        high: 'Reality feels thin here. The walls seem to breathe, and faces form in the grain of the wood only to dissolve when you blink.',
        critical: 'The world tilts and warps around you. Something vast and terrible is aware of your presence, and it is hungry.',
      },
      political: {
        low: 'The tapestries and finery of the surroundings speak of wealth and power. Servants move quietly, eyes averted but ears open.',
        mid: 'You notice guards positioned at key points, their hands resting on weapon hilts. Someone is watching you — you can feel it.',
        high: 'Hushed, urgent conversations die as you approach. Alliances are shifting, and you\'re at the center of a web you can barely see.',
        critical: 'The tension is palpable. One wrong word could spark bloodshed. Hands rest on hidden blades, and smiles don\'t reach anyone\'s eyes.',
      },
      'dungeon-crawl': {
        low: 'Torchlight flickers across damp stone walls etched with ancient runes. Water drips somewhere in the distance. The air is cool and still.',
        mid: 'The corridor narrows ahead. You spot scratch marks on the walls — something large has passed through here recently.',
        high: 'The dungeon groans around you like a living thing. Traps and threats lurk in every shadow, and the path back is no longer certain.',
        critical: 'The walls close in. Distant rumbling shakes dust from the ceiling. You are deep now — deeper than anyone has ventured in living memory.',
      },
      mystery: {
        low: 'Everything appears ordinary at first glance, but your trained eye catches small details that don\'t add up. A misplaced book. A fresh scratch on an old lock.',
        mid: 'The evidence is mounting, but the picture remains incomplete. Each clue seems to contradict the last, as if someone has been covering their tracks.',
        high: 'The pieces are falling into place, and the truth is more disturbing than you imagined. Someone doesn\'t want you to solve this — and they\'re getting desperate.',
        critical: 'You\'re close — dangerously close. The final pieces of the puzzle are within reach, but so is the person who\'s been pulling the strings all along.',
      },
    };

    parts.push(atmospheres[tone]?.[band] || atmospheres.heroic[band]);

    // Enemy descriptions with bestiary lore
    if (aliveEnemies.length > 0) {
      const enemyDescs = aliveEnemies.map(e => {
        const entry = this.lookupBestiary(e.name);
        const hpState = e.currentHealth / e.maxHealth;
        const condition = hpState > 0.75 ? 'looks strong' : hpState > 0.5 ? 'shows signs of wear' : hpState > 0.25 ? 'is visibly wounded' : 'is barely standing';
        if (entry && entry.description) {
          return `**${e.name}** — ${entry.description} It ${condition}. (${e.currentHealth}/${e.maxHealth} HP)`;
        }
        return `**${e.name}** (Lv${e.level}) ${condition}. (${e.currentHealth}/${e.maxHealth} HP)`;
      });
      parts.push(`\n\nHostile creatures present:\n${enemyDescs.join('\n')}`);
    } else {
      parts.push('\n\nNo hostile creatures are visible — for now.');
    }

    // Party status with flavor
    const partyStatus = alivePlayers.map(p => {
      const hpPct = p.currentHealth / p.maxHealth;
      const status = hpPct > 0.75 ? 'in good shape' : hpPct > 0.5 ? 'lightly battered' : hpPct > 0.25 ? 'bloodied and bruised' : 'barely clinging to consciousness';
      return `${p.name} (${p.characterClass || 'Adventurer'}) — ${status}`;
    });
    parts.push(`\nYour party: ${partyStatus.join(', ')}.`);

    return parts.join('\n');
  }

  private generateNPCInteraction(message: string, session: GMSession, band: TensionBand): string {
    const npcs = session.recurringNPCs.filter(n => n.isAlive);

    // Try to find a specific NPC mentioned in the message
    let targetNPC = npcs.find(n => message.includes(n.name.toLowerCase()));
    if (!targetNPC && npcs.length > 0) targetNPC = npcs[0];

    if (!targetNPC) {
      // No NPCs registered — introduce a random ambient NPC
      return this.generateAmbientNPCEncounter(session, band);
    }

    return this.generateNPCDialogue(targetNPC, session, band);
  }

  private generateAmbientNPCEncounter(session: GMSession, band: TensionBand): string {
    const tone = session.campaignPreferences.tone;
    const ambientNPCs: Record<string, string[]> = {
      heroic: [
        'A weathered traveler approaches, leaning on a gnarled walking staff. "Well met, adventurers! The road ahead is long, but I\'ve heard tales of a shrine to Sarenrae that shelters weary travelers. Might I share your fire for a spell?"',
        'A young messenger dashes past, nearly colliding with you. She stops, breathless. "Please — are you the heroes they speak of? The village elder sent me. Something terrible has happened at the old mill."',
        'An armored dwarf sits on a fallen log, polishing a notched warhammer. He grunts as you approach. "Another group heading into trouble, I take it. I\'ve seen three parties go that way this month. None came back. But you lot look different."',
        'A half-elf merchant beckons from her colorful wagon. "Rare goods from the Mwangi Expanse! Potions, scrolls, and curiosities — and information, if you have the coin for it. I hear things, traveling as I do."',
      ],
      gritty: [
        'A gaunt figure huddled against the wall watches you with hollow eyes. "Spare a copper? No? Then take some advice instead — don\'t go north. The things that come out after dark... they ain\'t natural."',
        'A scarred mercenary leans against a post, picking her teeth with a knife. She looks you up and down. "You\'re either brave or stupid. Either way, I could use the company. I know a shortcut — for a price."',
        'An old gravedigger pauses his work and squints at you. "More bodies for the pits, eh? No offense — it\'s just that everyone who comes through here ends up the same way eventually."',
      ],
      horror: [
        'A pale child stands in the road, staring at you with eyes too large for her face. "You shouldn\'t be here," she whispers. "It already knows your names." Before you can respond, she\'s gone — as if she were never there at all.',
        'An elderly woman rocks slowly in a chair on a sagging porch. She doesn\'t look at you, but speaks clearly: "The last group asked the same questions you\'re about to ask. I buried what was left of them behind the church."',
        'A hooded figure materialises from the fog, offering a tattered map. "Take it. You\'ll need it more than I will. I\'ve already seen what\'s at the end — and I\'m not going back."',
      ],
      political: [
        'A well-dressed courtier falls into step beside you, speaking in low tones. "A word of advice, friends — Lord Thane\'s patience wears thin, and the Merchant\'s Guild has been making... arrangements. Choose your allies carefully in the days ahead."',
        'A servant bows low and presents a sealed letter. "From an anonymous benefactor. They say you\'ll know what it means." The wax seal bears no recognizable crest.',
        'A foreign diplomat eyes you from across the hall. After a moment, she raises her glass in a subtle toast — an invitation, or a warning.',
      ],
      'dungeon-crawl': [
        'You come across the remains of a previous adventuring party. Among the scattered bones, a journal with a final entry: "Level 3 — DON\'T TRUST THE STATUES. They watch. They wait. And when the torches dim..." The writing trails off into nothing.',
        'A goblin merchant has set up an improbable shop in an alcove, surrounded by scavenged goods. "Heroes! Excellent! I trade! You want potions? Maps? Information about the big ugly thing two rooms over? I saw it eat a whole knight!"',
        'A spectral figure drifts through a wall, pausing to regard you. "Alive, are you? How refreshing. I\'ve been dead for... well, long enough to lose count. If you free my remains from the vault below, I could tell you about the treasure the dragon was guarding."',
      ],
      mystery: [
        'A nervous scholar approaches, clutching a stack of documents. "Thank the gods — someone who\'ll listen! I\'ve been studying the case files and I\'ve found a pattern no one else has noticed. The victims all visited the same location three days before they disappeared."',
        'An informant slides into the seat across from you, eyes darting. "You didn\'t hear this from me, but the inspector isn\'t what he seems. Check the records from ten years ago. The same name appears — in the victim column."',
        'A blind oracle sits at a crossroads, her fingers tracing patterns in the dust. "You seek answers, but you\'re asking the wrong questions. The killer isn\'t hiding — they\'re in plain sight. You\'ve already spoken to them."',
      ],
    };

    const options = ambientNPCs[tone] || ambientNPCs.heroic;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateNPCDialogue(npc: RecurringNPC, session: GMSession, band: TensionBand): string {
    const parts: string[] = [];
    const disposition = npc.disposition;
    const role = npc.role;

    // Physical description and approach
    if (disposition > 50) {
      parts.push(`${npc.name} brightens as you approach, a genuine warmth in their expression.`);
    } else if (disposition > 20) {
      parts.push(`${npc.name} nods in acknowledgment as you approach, their posture relaxed but guarded.`);
    } else if (disposition > -20) {
      parts.push(`${npc.name} regards you with a measured look, giving nothing away.`);
    } else if (disposition > -50) {
      parts.push(`${npc.name} crosses their arms as you approach, their jaw tight and eyes narrowing.`);
    } else {
      parts.push(`${npc.name} turns to face you with undisguised hostility, every muscle coiled like a spring.`);
    }

    // NPC description if available
    if (npc.description) {
      parts.push(npc.description);
    }

    // Role-flavored dialogue
    const roleDialogue: Record<string, Record<string, string[]>> = {
      ally: {
        friendly: [
          `"My friends! I was hoping you'd come. I've learned something that could change everything — but we must speak privately."`,
          `"Ah, perfect timing! I've been gathering supplies and intelligence for your next move. Here's what I've found..."`,
          `"It warms my heart to see you all safe. The road hasn't been kind to anyone lately. Tell me — what do you need?"`,
        ],
        neutral: [
          `"You're here. Good. We have matters to discuss, and time is short."`,
          `"I have information, but information has a cost. What can you offer in return?"`,
        ],
        hostile: [
          `"I... I'm reconsidering our arrangement. Perhaps I've chosen the wrong side."`,
          `"We need to talk. About what happened. What you did... I'm not sure I can look past it."`,
        ],
      },
      enemy: {
        friendly: [
          `"Perhaps we've been too hasty — both of us. There may be a way to resolve this without more bloodshed."`,
          `"I'll admit, you're more formidable than I expected. Perhaps we can... come to terms?"`,
        ],
        neutral: [
          `"We meet again. I wonder — are you here to fight, or to negotiate? Choose carefully."`,
          `"You have something I want. I have something you need. Shall we be civilized about this?"`,
        ],
        hostile: [
          `"Enjoy your last breaths, heroes. My plans are already in motion, and you are far too late to stop them."`,
          `"You dare show your faces here? After everything you've done? This ends NOW."`,
          `"How delightful — the pests return. I've prepared something special for this reunion."`,
        ],
      },
      neutral: {
        friendly: [
          `"I try to stay out of these matters, but you've earned my trust. Ask what you will — I'll help where I can."`,
          `"You've been good to this community. Let me return the favor with some information..."`,
        ],
        neutral: [
          `"I don't take sides, and I'd advise you not to ask me to. But I see things — things others miss. Make of that what you will."`,
          `"I'm just trying to get by, same as anyone. But if you're buying, I might have something worth selling."`,
        ],
        hostile: [
          `"I want nothing to do with you or your problems. Every time you come around, trouble follows."`,
          `"I told you before — leave me out of it. I have a family to think about."`,
        ],
      },
      bbeg: {
        friendly: [
          `"Surprised? Even I can appreciate worthy adversaries. But don't mistake this moment of civility for weakness."`,
        ],
        neutral: [
          `"You're persistent — I'll give you that. But persistence without understanding is just stubbornness. Do you even know what you're fighting against?"`,
        ],
        hostile: [
          `"ENOUGH! You insects have meddled in my affairs for the last time. When I am done with you, not even the gods will find the pieces."`,
          `"You think you're heroes? You're chess pieces, and I've been playing this game since before your grandparents were born."`,
          `"Every time you 'thwart' my plans, you only bring me closer to my true goal. But please — keep trying. Your desperation amuses me."`,
        ],
      },
    };

    const dispositionKey = disposition > 30 ? 'friendly' : disposition > -30 ? 'neutral' : 'hostile';
    const dialogueOptions = roleDialogue[role]?.[dispositionKey] || roleDialogue.neutral[dispositionKey];
    parts.push(dialogueOptions[Math.floor(Math.random() * dialogueOptions.length)]);

    // Reference past interactions if any exist
    if (npc.interactions.length > 0) {
      const lastInteraction = npc.interactions[npc.interactions.length - 1];
      parts.push(`\n*You recall your last encounter with ${npc.name}: ${lastInteraction.summary}*`);
    }

    // Hint at secret goal if player is very friendly with enemy/bbeg
    if (npc.secretGoal && disposition > 60 && (role === 'ally' || role === 'neutral')) {
      parts.push(`\n*Something about ${npc.name}'s manner suggests they're holding something back — a hidden concern or agenda.*`);
    }

    return parts.join('\n');
  }

  private generateSearchResult(gameState: GameState, session: GMSession, band: TensionBand): string {
    const hasEnemies = gameState.creatures.some(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
    const tone = session.campaignPreferences.tone;

    if (hasEnemies && session.currentPhase === 'combat') {
      return 'The middle of combat is hardly the time for a thorough search! Focus on the enemies at hand — you can investigate once the dust settles.';
    }

    const results: Record<string, string[]> = {
      heroic: [
        'Your careful search reveals a hidden compartment in the stonework. Inside, wrapped in oilcloth, you find a faded letter bearing the seal of a long-fallen kingdom. The ink is still legible — it speaks of a "weapon of last resort" hidden beneath the old temple.',
        'Among the debris, you discover a beautifully crafted pendant — silver, set with a tiny sapphire. It pulses faintly with magic. Someone treasured this once, and may come looking for it.',
        'The ground here has been disturbed recently. Fresh tracks lead deeper — boots, at least three sets, and something dragged between them. Whatever was taken was heavy.',
        'You notice patterns carved into the floor that align with the stars overhead. An astronomy check might reveal their purpose — this looks like a celestial lock of some kind.',
        'Tucked behind a fallen beam, you find a leather-bound journal filled with observations about the local wildlife. The last entry, dated two weeks ago, reads: "The creatures are behaving strangely — gathering at the old stones. Something is calling them."',
      ],
      gritty: [
        'You find the remains of a campfire — still warm. Whoever was here left in a hurry. A bloodstained knife lies discarded nearby.',
        'Scratched into the wall at waist height, as if by fingernails: "They came from below." The scratches are fresh.',
        'A hidden cache reveals several days\' worth of rations, a waterskin, and a crudely drawn map. Someone was planning an escape route.',
        'The ground is soft here — too soft. You prod with your weapon and uncover a shallow grave. Whoever buried this body didn\'t want it found anytime soon.',
      ],
      horror: [
        'Your fingers brush against something cold and wet behind the loose stone. You pull out a glass jar containing a perfectly preserved eye. It blinks.',
        'The wall here is covered in hundreds of tiny scratches — tally marks. Someone was counting days. The marks stop abruptly after what appears to be 347.',
        'You find a child\'s doll, pristine and clean despite the filth surrounding it. As you pick it up, you could swear its head turns slightly to look at you. You blink, and it\'s just a doll.',
        'Behind a loose panel, you discover a mirror. Your reflection stares back — but it\'s smiling, and you are not.',
      ],
      'dungeon-crawl': [
        'A loose flagstone conceals a narrow passage leading down. Warm, stale air wafts up from below, carrying the faint sound of flowing water.',
        'You discover a pressure plate cleverly disguised as ordinary stonework. It connects to a mechanism in the wall — disarming it might open a hidden door, or it might trigger something worse.',
        'Among the bones of a previous adventurer, you find a waterproof scroll case. Inside is a partial map of this level — several rooms are marked with skull symbols.',
        'The chest is trapped — a thin wire connects the lid to a vial of something that sizzles against the stone. But the contents might be worth the risk...',
      ],
      mystery: [
        'Hidden beneath a floorboard, you find a bundle of letters — correspondence between two people using coded names. With time and a cipher, these could blow the case wide open.',
        'A tiny scrap of fabric caught on a nail near the scene. The weave is distinctive — expensive, imported. Only a handful of tailors in the city work with material like this.',
        'You notice the dust patterns on the shelf are wrong. Books have been moved recently and put back in the wrong order — someone was searching for something specific.',
        'A receipt for a large quantity of arsenic, dated three days before the incident. The buyer\'s name is smudged, but the shop address is legible.',
      ],
      political: [
        'Tucked into a book of poetry, you find a coded message between two noble houses. The cipher is simple — it speaks of a planned coup during the upcoming festival.',
        'A hidden drawer in the desk contains a ledger of payments — bribes, by the look of it. Several prominent names appear repeatedly.',
        'You overhear a whispered conversation drifting through the ventilation: "...the ambassador knows. We need to move before the next council session..."',
      ],
    };

    const options = results[tone] || results.heroic;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateRecap(session: GMSession): string {
    if (session.sessionNotes.length === 0 && session.encounterCount === 0) {
      return 'Your adventure has just begun. No notable events have occurred yet.';
    }

    const parts: string[] = [];
    parts.push(`Campaign: ${session.campaignPreferences.campaignName}`);
    parts.push(`Encounters completed: ${session.encounterCount}`);
    parts.push(`Total XP awarded: ${session.xpAwarded}`);

    if (session.storyArc) {
      parts.push(`Story phase: ${session.storyArc.storyPhase}`);
      const completedMilestones = session.storyArc.milestones.filter(m => m.completed).length;
      parts.push(`Milestones: ${completedMilestones}/${session.storyArc.milestones.length}`);
    }

    if (session.recurringNPCs.length > 0) {
      const aliveNPCs = session.recurringNPCs.filter(n => n.isAlive);
      parts.push(`Known NPCs: ${aliveNPCs.map(n => `${n.name} (${n.role})`).join(', ')}`);
    }

    if (session.sessionNotes.length > 0) {
      const latest = session.sessionNotes[session.sessionNotes.length - 1];
      parts.push(`Last session: "${latest.title}" — ${latest.summary}`);
    }

    return parts.join('\n');
  }

  private generateRestNarration(gameState: GameState, session: GMSession, band: TensionBand): string {
    const tone = session.campaignPreferences.tone;

    if (band === 'high' || band === 'critical') {
      const denyRest: Record<string, string[]> = {
        heroic: [
          'Your instincts scream that danger is near. Every hero knows when to push forward — and this is not the time to rest. The enemy won\'t wait for you to recover.',
          'You try to settle in, but a distant war horn shatters the silence. Rest will have to wait — there\'s work to be done.',
        ],
        gritty: [
          'You can feel eyes on you. The darkness between the trees shifts and stirs. Only a fool would sleep here, and you\'re no fool. Not yet, anyway.',
          'The ground is wet with something you don\'t want to identify. Every sound could be a predator. This is no place to let your guard down.',
        ],
        horror: [
          'You close your eyes, and the whispers begin immediately — insistent, hungry. Sleep would mean surrender to whatever lurks in the dark. Not here. Not now.',
          'The moment you sit down, the temperature drops sharply. Frost forms on your armor. Something does not want you to rest — it wants you to run.',
        ],
        political: [
          'A servant appears with an urgent message: your rivals are making their move. There will be time to rest once the crisis is resolved — if it can be resolved.',
          'The clock tower chimes ominously. The vote is in three hours, and your enemies are already gathering allies. Rest is a luxury you cannot afford.',
        ],
        'dungeon-crawl': [
          'The distant sound of grinding stone reaches your ears — something is moving between you and the exit. Resting now could mean being trapped forever.',
          'The torches along the wall flicker and die, one by one. The dungeon itself seems to be closing in. You need to keep moving.',
        ],
        mystery: [
          'A new clue has emerged — you can feel it. The pieces are shifting, and the window to act is closing. Rest now, and the trail goes cold.',
          'Your informant\'s message was clear: "Midnight. The docks. Don\'t be late." You check the time — two hours. No time for rest.',
        ],
      };
      const options = denyRest[tone] || denyRest.heroic;
      return options[Math.floor(Math.random() * options.length)];
    }

    const restNarrations: Record<string, string[]> = {
      heroic: [
        'You find a sheltered alcove bathed in fading sunlight. As the party settles in, the tension ebbs from weary muscles. Someone starts a quiet melody, and for a moment, the weight of the world feels lighter. You rest, heal your wounds, and prepare for what comes next.',
        'A warm fire crackles as you make camp beneath the stars. Stories are shared, bonds are strengthened, and for a precious few hours, you are not heroes — just travelers sharing a night\'s rest.',
      ],
      gritty: [
        'You hunker down in the least miserable spot you can find, taking turns on watch. Sleep comes in fitful bursts, haunted by the sounds of the wild. But when dawn breaks, you\'re alive, and that\'s enough.',
        'Cold rations and colder ground. You rest, but comfort is a distant memory in these lands. Still, your wounds close, your mind clears, and you\'re ready to face whatever tomorrow throws at you.',
      ],
      horror: [
        'You rest, but true sleep eludes you. Dreams bleed into reality — faces in the firelight that aren\'t your companions, whispers that might be the wind. When you wake, you feel better physically, but something nags at the edges of your mind.',
        'The night passes slowly. Every creak and rustle sends your hand to your weapon. But morning comes, as it always does, and the horrors of the night retreat — for now.',
      ],
      'dungeon-crawl': [
        'You barricade a defensible room and take turns keeping watch. The dungeon is never truly silent — distant drips, groaning stone, the skittering of unseen things. But you manage to rest, patch yourselves up, and steel your nerves for the next level.',
      ],
      political: [
        'You retire to your quarters, though even here you check for listening devices and hidden passages. A servant brings food and wine — you taste both carefully before eating. Paranoid? Perhaps. But caution has kept you alive in this court.',
      ],
      mystery: [
        'You take a few hours to rest and review your notes. Pinning evidence to the board, drawing connections, rereading witness statements. When you finally sleep, your mind continues working — and you wake with a fresh perspective.',
      ],
    };
    const options = restNarrations[tone] || restNarrations.heroic;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateCombatResponse(gameState: GameState, session: GMSession, band: TensionBand): string {
    if (session.currentPhase === 'combat') {
      const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
      if (enemies.length > 0) {
        const target = enemies[0];
        const entry = this.lookupBestiary(target.name);
        const desc = entry ? entry.description : 'a dangerous foe';
        return `You\'re in the thick of battle! ${target.name} — ${desc} — stands before you. Use the action panel to select your combat actions. Remember: you have 3 actions per turn, and multiple attacks suffer an increasing penalty.`;
      }
      return 'The battle rages around you! Use the action panel to take your combat actions.';
    }

    const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
    if (enemies.length > 0) {
      return `You grip your weapon and eye your foes. ${enemies.map(e => e.name).join(', ')} stand ready. Use the encounter controls to begin combat — initiative will be rolled automatically.`;
    }
    return 'You ready your weapon and scan for threats. No enemies are present — use the encounter builder to create an encounter, or continue exploring.';
  }

  private generateStealthNarration(gameState: GameState, session: GMSession, band: TensionBand): string {
    const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
    const tone = session.campaignPreferences.tone;

    if (enemies.length > 0) {
      return `You press yourself against the shadows, controlling your breathing. ${enemies.length} hostile creature${enemies.length > 1 ? 's lurk' : ' lurks'} nearby — ${enemies.map(e => e.name).join(', ')}. One wrong step and you\'ll be discovered. The tension is palpable.`;
    }

    const stealth: string[] = [
      'You move silently through the area, each footfall carefully placed. The shadows welcome you like an old friend. For now, you are unseen.',
      'Pressed flat against the cold stone, you inch forward. Your heartbeat seems impossibly loud, but nothing stirs. You remain hidden — for now.',
      'You blend into the environment, moving with practiced grace. Whatever lies ahead, you\'ll see it before it sees you.',
    ];
    return stealth[Math.floor(Math.random() * stealth.length)];
  }

  private generateMagicNarration(gameState: GameState, session: GMSession, band: TensionBand): string {
    const tone = session.campaignPreferences.tone;
    const magicFlavor: Record<string, string[]> = {
      heroic: [
        'You extend your senses beyond the physical. Threads of magical energy shimmer in the air around you — faint but unmistakable. Something in this area has been touched by arcane power.',
        'Your hands glow softly as you channel magical energy, feeling the ebb and flow of the arcane currents in this location. The ley lines here are strong.',
      ],
      gritty: [
        'Magic comes at a cost in these lands. You feel the familiar tingle in your fingertips, accompanied by the iron taste of blood. The power answers your call, but reluctantly.',
        'The arcane energy here feels raw and untamed. Your spell components react unpredictably — this area has been tainted by wild magic.',
      ],
      horror: [
        'As you reach for the arcane, something reaches back. The magic here is wrong — tainted, twisted. Your detection spell reveals not just magic, but something... aware.',
        'The moment you open your magical senses, you wish you hadn\'t. The walls are covered in invisible sigils — binding magic, ancient and desperate. Someone trapped something here. Something that\'s still waiting.',
      ],
      'dungeon-crawl': [
        'Your detect magic reveals a web of enchantments throughout this area — wards, traps, and preservation spells layered over centuries. Someone went to great trouble to protect whatever lies deeper.',
        'Arcane residue coats everything here like dust. Powerful magic was used in this place, and recently. The air still hums with residual energy.',
      ],
      mystery: [
        'Your arcane analysis reveals traces of transmutation magic — someone used magic to alter evidence. But magic always leaves traces, and now you have a thread to follow.',
        'The magical signatures here are faint but distinct. Two different casters were present recently — one using divine magic, the other arcane. An unlikely combination.',
      ],
      political: [
        'Your subtle magical probe confirms what you suspected — the room is warded against scrying, and several courtiers carry concealed enchantments. Not unusual in court, but the specific enchantments tell a story.',
        'Magical detection in court is a delicate art. You notice abjuration wards on important documents, and at least one person in the room is under the effects of an enchantment spell.',
      ],
    };
    const options = magicFlavor[tone] || magicFlavor.heroic;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateTravelNarration(gameState: GameState, session: GMSession, band: TensionBand): string {
    const tone = session.campaignPreferences.tone;
    const travel: Record<string, string[]> = {
      heroic: [
        'The road stretches before you, winding through rolling hills dotted with wildflowers. Birds wheel overhead in a clear sky. The journey is long, but your spirits are high — adventure awaits at every bend.',
        'You press onward through varied terrain, your map guiding the way. Landmarks from travelers\' tales begin to appear: a crooked oak, a moss-covered milestone, a stream that flows uphill. You\'re getting closer.',
        'As you travel, you pass the ruins of an old watchtower. Vines have reclaimed most of it, but the foundations are solid. It would make a defensible camp — worth remembering for the return journey.',
      ],
      gritty: [
        'Every mile is a struggle. The road — if you can call it that — is little more than a muddy track through hostile terrain. Your boots are soaked, your pack is heavy, and the day is far from over.',
        'You travel in wary silence, weapons close at hand. The countryside bears the scars of conflict — burned farmsteads, abandoned villages, fields gone to seed. This land has seen better days.',
      ],
      horror: [
        'The further you walk, the wronger things feel. The trees lean toward the path as if listening. No animals are visible — no birds, no insects. Just silence, and the soft susurrus of wind through dead leaves.',
        'The mist thickens as you travel, until you can barely see ten paces ahead. Shapes loom and dissolve in the gray. You\'re not lost — you know exactly where you\'re going. You just wish you didn\'t.',
      ],
      'dungeon-crawl': [
        'You descend deeper into the complex. The architecture changes subtly — the stonework is older, the carvings more intricate, the air thicker with dust and secrets. Each room tells a story of the civilization that built this place.',
        'The corridor branches ahead. From the left, you hear the distant sound of water. From the right, a faint glow and the smell of something acrid. Both paths disappear into darkness after a few yards.',
      ],
      mystery: [
        'You make your way through the city streets, each block revealing another layer of the case. A witness\'s apartment is above a pawn shop; the victim\'s workplace overlooks the suspect\'s usual route. The geography of the crime begins to tell its own story.',
      ],
      political: [
        'You move through the palace corridors, nodding to courtiers and servants alike. Every face is a potential ally or enemy. The political landscape shifts daily, and staying connected means staying alive.',
      ],
    };
    const options = travel[tone] || travel.heroic;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generatePartyDescription(gameState: GameState, session: GMSession): string {
    const players = gameState.creatures.filter(c => c.type === 'player' && !c.dead);
    if (players.length === 0) return 'No party members are present.';

    const parts = ['**Your Party:**\n'];
    for (const p of players) {
      const hpPct = p.currentHealth / p.maxHealth;
      const status = hpPct >= 1 ? 'at full health' : hpPct > 0.75 ? 'in good shape' : hpPct > 0.5 ? 'slightly wounded' : hpPct > 0.25 ? 'badly hurt' : 'in critical condition';
      const conditions = p.conditions.length > 0 ? ` (${p.conditions.map(c => c.name).join(', ')})` : '';
      parts.push(`• **${p.name}** — Level ${p.level} ${p.characterClass || 'Adventurer'} (${p.ancestry || 'Unknown ancestry'}), ${status}${conditions}, ${p.currentHealth}/${p.maxHealth} HP`);
    }

    if (session.storyArc) {
      parts.push(`\n**Current Quest:** ${session.storyArc.bbegName ? `Stop ${session.storyArc.bbegName} — ${session.storyArc.bbegMotivation}` : 'The story unfolds...'}`);
      parts.push(`**Story Phase:** ${session.storyArc.storyPhase}`);
    }

    return parts.join('\n');
  }

  private generateEnemyDescription(gameState: GameState, session: GMSession, band: TensionBand): string {
    const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
    if (enemies.length === 0) return 'No enemies are present. The area appears safe — for now.';

    const parts = ['**Hostile Creatures:**\n'];
    for (const e of enemies) {
      const entry = this.lookupBestiary(e.name);
      const hpPct = e.currentHealth / e.maxHealth;
      const status = hpPct >= 1 ? 'uninjured' : hpPct > 0.5 ? 'wounded' : 'heavily damaged';
      parts.push(`• **${e.name}** (Level ${e.level}) — ${status}, ${e.currentHealth}/${e.maxHealth} HP`);
      if (entry) {
        parts.push(`  ${entry.description}`);
        if (entry.tags.length > 0) parts.push(`  *Traits: ${entry.tags.join(', ')}*`);
      }
      if (e.damageResistances.length > 0) parts.push(`  *Resists: ${e.damageResistances.map(r => `${r.type} ${r.value}`).join(', ')}*`);
      if (e.damageWeaknesses.length > 0) parts.push(`  *Weak to: ${e.damageWeaknesses.map(w => `${w.type} ${w.value}`).join(', ')}*`);
      if (e.damageImmunities.length > 0) parts.push(`  *Immune to: ${e.damageImmunities.join(', ')}*`);
      if (e.specials && e.specials.length > 0) parts.push(`  *Special abilities: ${e.specials.slice(0, 4).join(', ')}*`);
    }
    return parts.join('\n');
  }

  private generateLootNarration(session: GMSession, band: TensionBand): string {
    const tone = session.campaignPreferences.tone;
    const loot: Record<string, string[]> = {
      heroic: [
        'Among the spoils of your victory, you find a handful of coins, a minor healing potion, and something curious — a small wooden figurine carved in the shape of a rearing griffin. It\'s warm to the touch.',
        'The treasure is modest but welcome: gold coins stamped with an unfamiliar crest, a serviceable shortsword, and a tightly rolled scroll sealed with wax. The seal bears a mark you don\'t recognize.',
      ],
      gritty: [
        'Scavenging the remains, you recover what you can — a few copper coins, a bent dagger, and a blood-stained map. Not much, but in these times, every scrap counts.',
        'The pickings are slim. Some tarnished coins, a moldy ration pack, and a set of lock picks. Someone was either a thief or planning to become one.',
      ],
      horror: [
        'Among the creature\'s disturbing possessions, you find teeth — human teeth, dozens of them, strung on twine like a necklace. And beneath them, a child\'s locket containing a faded portrait.',
        'The treasure chest opens with a groan. Inside: coins blackened with age, a journal written in a shaking hand, and a porcelain mask that seems to follow you with its hollow eyes.',
      ],
      'dungeon-crawl': [
        'The treasure hoard glints in your torchlight: piles of mixed coins, a jeweled dagger, two potion vials (one red, one suspiciously green), and a gem-encrusted shield that looks too clean for this dusty vault.',
        'You open the ancient chest carefully. Inside: a velvet pouch of gemstones, a wand carved from bone, and a rolled-up map showing a level of this dungeon you haven\'t explored yet.',
      ],
      mystery: [
        'More valuable than gold — you find a bundle of correspondence that connects several key suspects. This evidence could crack the case wide open.',
      ],
      political: [
        'Hidden at the bottom of the chest, beneath the gold and jewels, you find what matters most: a sealed treaty, unsigned, that would change the balance of power in the entire region.',
      ],
    };
    const options = loot[tone] || loot.heroic;
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateSuggestions(gameState: GameState, session: GMSession, band: TensionBand): string {
    const parts = ['Here are some things you could do:\n'];
    const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);
    const npcs = session.recurringNPCs.filter(n => n.isAlive);

    if (session.currentPhase === 'combat') {
      parts.push('• **Use the action panel** to take your combat actions (Strike, Move, Cast a Spell, etc.)');
      parts.push('• **"Look around"** to assess the battlefield');
      parts.push('• **"What enemies are here?"** to learn about your foes');
    } else {
      parts.push('• **"Look around"** or **"describe"** to survey your surroundings');
      parts.push('• **"Search"** or **"investigate"** to examine the area for clues and treasure');
      if (npcs.length > 0) {
        parts.push(`• **"Talk to ${npcs[0].name}"** to interact with known NPCs`);
      } else {
        parts.push('• **"Talk to"** or **"approach"** to interact with NPCs');
      }
      parts.push('• **"Sneak"** or **"stealth"** to move carefully');
      parts.push('• **"Cast"** or **"detect magic"** to use your arcane senses');
      if (enemies.length > 0) {
        parts.push('• **"Attack"** to engage hostile creatures');
      }
      if (band !== 'high' && band !== 'critical') {
        parts.push('• **"Rest"** to recover and tend to wounds');
      }
      parts.push('• **"Explore"** or **"travel"** to move to a new area');
      parts.push('• **"Recap"** to review the story so far');
      parts.push('\nYou can also just describe what you want to do in your own words — be creative!');
    }
    return parts.join('\n');
  }

  private generateGenericResponse(message: string, session: GMSession, band: TensionBand): string {
    const tone = session.campaignPreferences.tone;
    // The generic response should feel like the GM is engaging with what the player said
    // and driving the story forward
    const toneResponses: Record<string, string[]> = {
      heroic: [
        'The winds of fate respond to your words. You feel a subtle shift in the world around you — as if the universe itself is listening, waiting to see what you\'ll do next. The path of the hero is never straightforward, but greatness awaits those bold enough to seize it.',
        'Your sense of purpose deepens. Around you, the world seems to hold its breath. Somewhere ahead, destiny waits — in a hidden ruin, a forgotten temple, or the court of a threatened king. What will you do next, hero?',
        'A distant horn echoes across the land — a call to action, or a warning. The threads of fate are weaving around you, drawing you toward something important. Trust your instincts and press forward.',
      ],
      gritty: [
        'You take stock of the situation with practiced cynicism. Nothing in this world comes free, and pretty words don\'t stop blades. But you\'re still alive, still armed, and still angry — and in these lands, that\'s more than most can say.',
        'The wind picks up, carrying the smell of smoke from somewhere to the east. Trouble, probably. In your experience, it\'s always trouble. But trouble means opportunity for those with the stomach for it.',
        'You spit into the dirt and consider your options. None of them are good, but you\'ve survived worse with less. Time to decide — do you take the hard road or the harder one?',
      ],
      political: [
        'Words are weapons in this arena, and you\'ve just loaded yours. Every conversation plants seeds — of alliance, of suspicion, of carefully orchestrated betrayal. The question is: whose game are you playing?',
        'You feel the weight of watchful eyes. In this court, nothing is said without purpose, and silence speaks louder than words. Someone is making a move — you need to decide whether to counter, ally, or simply observe.',
        'The political landscape shifts beneath your feet like sand. Yesterday\'s enemy extends an olive branch; yesterday\'s ally sends a veiled threat. Stay sharp — the game is always being played, whether you\'re at the table or not.',
      ],
      'dungeon-crawl': [
        'The dungeon breathes around you — a vast, ancient organism with a will of its own. Every corridor is a choice, every door a gamble. Torchlight catches on carved walls that tell stories of the builders\' pride, and their downfall.',
        'Stone dust drifts from the ceiling as something shifts in the depths below. This place has secrets, and it\'s slowly deciding whether to share them or bury you alongside them.',
        'Your torchlight catches a glint of something embedded in the far wall — metal, or crystal? The dungeon rewards the curious and punishes the careless. Decide which you are.',
      ],
      horror: [
        'Something shifts at the edge of perception — not quite seen, not quite heard. Your rational mind insists there\'s nothing there. But your body knows better. Your pulse quickens. Your palms sweat. And deep in the darkness, something smiles.',
        'The silence presses against your eardrums like a physical weight. You know you\'re not alone. You\'ve known for a while now, haven\'t you? The question isn\'t whether something is watching — it\'s what it\'s waiting for.',
        'Reality hiccups. For a fraction of a second, you see the world as it truly is — layered, bleeding, alive with things that should not be. Then it snaps back to normal. But you noticed. And whatever is behind the veil noticed that you noticed.',
      ],
      mystery: [
        'Another piece of the puzzle slides into place — but the picture it reveals raises more questions than it answers. The truth is a living thing, and it doesn\'t want to be found.',
        'Your detective\'s instincts are firing on all cylinders. Something about what you just learned connects to something else — a name, a date, a location. The pattern is there, just below the surface. You need to think.',
        'The web of deception grows more complex with every passing hour. But webs have a center, and something sits there, patient and waiting. You\'re getting closer — but so is whatever is at the heart of this mystery.',
      ],
    };

    const responses = toneResponses[tone] || toneResponses.heroic;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ─── GM System Prompt Builder ───────────────────────────────

  private buildGMSystemPrompt(gameState: GameState, session: GMSession): string {
    const band = getTensionBand(session.tensionTracker.score);
    const prefs = session.campaignPreferences;

    const alivePlayers = gameState.creatures.filter(c => c.type === 'player' && !c.dead);
    const aliveEnemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);

    // Rich player summaries
    const playerSummary = alivePlayers.map(p => {
      const hpPct = p.currentHealth / p.maxHealth;
      const status = hpPct >= 1 ? 'full HP' : hpPct > 0.5 ? 'lightly wounded' : hpPct > 0.25 ? 'badly hurt' : 'near death';
      const conditions = p.conditions.length > 0 ? `, conditions: ${p.conditions.map(c => c.name).join(', ')}` : '';
      return `${p.name} (Lv${p.level} ${p.ancestry || ''} ${p.characterClass || 'Unknown'}): ${status} ${p.currentHealth}/${p.maxHealth} HP${conditions}`;
    }).join('\n  ');

    // Rich enemy summaries with bestiary lore
    const enemySummary = aliveEnemies.length > 0
      ? aliveEnemies.map(e => this.getCreatureLore(e)).join('\n  ')
      : 'No enemies present';

    // Detailed NPC context
    const npcContext = session.recurringNPCs.length > 0
      ? `\nKNOWN NPCs:\n${session.recurringNPCs.map(n => {
          const dispLabel = n.disposition > 50 ? 'friendly' : n.disposition > 20 ? 'warm' : n.disposition > -20 ? 'neutral' : n.disposition > -50 ? 'unfriendly' : 'hostile';
          const interactions = n.interactions.length > 0 ? `, last interaction: "${n.interactions[n.interactions.length - 1].summary}"` : '';
          return `- ${n.name} (${n.role}, ${dispLabel}${n.isAlive ? '' : ', DECEASED'}): ${n.description}${n.location ? `, location: ${n.location}` : ''}${interactions}${n.secretGoal ? ` [SECRET GOAL: ${n.secretGoal}]` : ''}`;
        }).join('\n')}`
      : '';

    // Story arc with milestones
    let storyContext = '';
    if (session.storyArc) {
      const arc = session.storyArc;
      const completedMilestones = arc.milestones.filter(m => m.completed);
      const pendingMilestones = arc.milestones.filter(m => !m.completed);
      storyContext = `\nSTORY ARC:\n- Phase: ${arc.storyPhase}\n- BBEG: "${arc.bbegName}" — Motivation: ${arc.bbegMotivation}`;
      if (arc.keyLocations.length > 0) storyContext += `\n- Key Locations: ${arc.keyLocations.join(', ')}`;
      if (completedMilestones.length > 0) storyContext += `\n- Completed milestones: ${completedMilestones.map(m => m.description).join('; ')}`;
      if (pendingMilestones.length > 0) storyContext += `\n- Upcoming milestones: ${pendingMilestones.map(m => m.description).join('; ')}`;
      if (arc.secretPlots.length > 0) storyContext += `\n- Secret plots (reveal gradually): ${arc.secretPlots.join('; ')}`;
    }

    // Session history
    const historyContext = session.sessionNotes.length > 0
      ? `\nSESSION HISTORY:\n${session.sessionNotes.slice(-3).map(n => `- Session ${n.sessionNumber} "${n.title}": ${n.summary}`).join('\n')}`
      : '';

    return `You are an expert Game Master for a Pathfinder 2e Remaster tabletop RPG session. You are creative, immersive, and a brilliant storyteller.

═══ CAMPAIGN SETTING ═══
Campaign: "${prefs.campaignName}"
Tone: ${prefs.tone} | Pacing: ${prefs.pacing}
Themes: ${prefs.themes.join(', ')}
${prefs.customNotes ? `GM Notes: ${prefs.customNotes}` : ''}

═══ CURRENT STATE ═══
Phase: ${session.currentPhase}
Tension: ${session.tensionTracker.score}/100 (${band}) — ${tensionBandDescription(band)}
Trend: ${session.tensionTracker.trend}
Round: ${gameState.currentRound.number}
Encounters completed: ${session.encounterCount} | XP awarded: ${session.xpAwarded}

═══ PARTY ═══
  ${playerSummary}

═══ ENEMIES ═══
  ${enemySummary}
${npcContext}${storyContext}${historyContext}

═══ YOUR ROLE AS GM ═══
You are the heart and soul of this adventure. Your job is to bring the world to life:

**STORYTELLING (HIGHEST PRIORITY):**
- Drive the narrative forward with every response. Don't just react — advance the story
- Create vivid, sensory descriptions: sights, sounds, smells, textures, temperature
- Introduce interesting NPCs organically. Give them names, personalities, motivations, quirks, and distinctive speech patterns
- When enemies appear, describe them dramatically using their lore, appearance, and abilities — don't just list stats
- Weave the campaign themes (${prefs.themes.join(', ')}) into your narration naturally
- Plant story hooks, foreshadowing, and mysteries for the players to uncover
- React to player creativity with "yes, and" improvisation — reward bold ideas
- Reference past events, NPC interactions, and story milestones for continuity

**NPCs & MONSTERS:**
- Give every NPC a distinct voice and personality. Use dialogue frequently
- NPCs should have their own agendas and react authentically to player actions
- Describe monsters vividly when they first appear — their size, sounds, movement, how they make the heroes feel
- Reference creature abilities and weaknesses narratively ("the troll's flesh knits before your eyes" for regeneration)
- If the BBEG or major NPC is relevant, hint at their influence even when they're not present

**TONE MATCHING (${prefs.tone}):**
${this.getToneGuidance(prefs.tone)}

**TENSION MANAGEMENT (current: ${band}):**
- Match narration intensity to the tension band
- Low (0-30): Calm exploration, worldbuilding, character moments, offer rest/shopping/roleplay
- Mid (31-60): Building suspense, hints of danger, introduce complications
- High (61-85): Dramatic stakes, vivid danger, enemies are smart and ruthless
- Critical (86-100): Desperate climax, survival horror, every choice matters
- Include [TENSION:+X] or [TENSION:-X] to adjust tension when narratively appropriate

**MAP & SCENE:**
- Battle maps are PROCEDURALLY GENERATED to match the current narrative scene
- When starting an encounter OR entering a new area, use [ACTION:set-encounter-map:{...}] BEFORE [ACTION:start-encounter:{...}]
- You MUST specify both "theme" AND "subTheme" to get the right map layout:

  **"urban" theme sub-themes:**
  - "town-square" / "plaza" — large open plaza with buildings around edges, fountain in center. Use for: town squares, village greens, open plazas
  - "market" — open area with scattered market stalls for cover. Use for: bazaars, marketplaces, trading posts  
  - "docks" — waterfront with warehouses and piers. Use for: harbors, ports, waterfronts
  - "city-streets" — city blocks with buildings and alleys. Use for: general city encounters, back alleys

  **"indoor" theme sub-themes (use "type" field):**
  - "tavern" — multi-room tavern/inn layout. Use for: pubs, inns, alehouses
  - "temple" — temple with pillars and carpet. Use for: shrines, chapels, cathedrals
  - "manor" — central hall with wing rooms. Use for: mansions, estates, palaces
  - "library" — rooms with bookshelves. Use for: archives, studies
  - "hall" — ONE large open room with pillars and carpet. Use for: throne rooms, banquet halls, great halls, council chambers
  - "arena" — ONE open room with dirt/sand floor. Use for: fighting pits, gladiator arenas, training grounds

  **"wilderness" theme sub-themes:**
  - "forest" — trees, path, bushes (default). Use for: forest encounters, woodland
  - "clearing" — sparse trees, open grassy area. Use for: meadows, glades, open fields
  - "camp" — sparse trees around a campsite area. Use for: campsites, bivouacs
  - "swamp" — wetland with water features. Use for: marshes, bogs
  - "desert" — sparse, sandy terrain. Use for: deserts, dunes, arid wastes

  **"dungeon" theme** — multi-room dungeon with corridors (crypts, vaults, sewers)
  **"cave" theme** — organic cavern with cellular automata (caverns, mines, lairs)

- **Examples:**
  - Town square: [ACTION:set-encounter-map:{"theme":"urban","subTheme":"town-square"}]
  - Tavern: [ACTION:set-encounter-map:{"theme":"indoor","type":"tavern"}]
  - Throne room: [ACTION:set-encounter-map:{"theme":"indoor","type":"hall"}]
  - Forest clearing: [ACTION:set-encounter-map:{"theme":"wilderness","subTheme":"clearing"}]
  - Docks: [ACTION:set-encounter-map:{"theme":"urban","subTheme":"docks"}]
  - Arena fight: [ACTION:set-encounter-map:{"theme":"indoor","type":"arena"}]

- ALWAYS match the map to WHERE the scene takes place. A town square MUST use urban/town-square, not dungeon!
- The map will also auto-detect from narration if no subTheme specified, but being explicit is much better

**RULES BOUNDARIES:**
- You may suggest mechanical actions, but ALL game mechanics MUST go through the rules engine
- You CANNOT: override AC, ignore conditions, change HP directly, skip rules, alter dice results
- If suggesting a mechanical action, wrap it in [ACTION:type:details]
- Supported control actions: [ACTION:start-encounter:{"difficulty":"moderate"}], [ACTION:set-encounter-map:{"theme":"urban","subTheme":"town-square"}]
- When players ask about rules, give accurate PF2e Remaster guidance

**NPC PLACEMENT:**
- You can place NPCs on the battle map as visible tokens using [ACTION:place-npc:{"name":"NPC Name","x":5,"y":8}]
- Provide a name and grid position. Optional fields: "icon" (emoji like "🧙" "🧝" "👸" "🧔" "🧑‍🌾" "🧑‍🍳" "💂" "🧟"), "role" ("ally"/"enemy"/"neutral"), "description"
- Place NPCs when the party enters a new area with inhabitants (tavern → bartender, shop → merchant, etc.)
- Place multiple NPCs at once for populated areas. Choose positions that make spatial sense (bartender behind bar, guards at doors)
- To remove an NPC from the map: [ACTION:remove-npc:{"name":"NPC Name"}]
- Players can move freely during exploration by clicking the map — no need to handle movement for them

**MONSTER/CREATURE NPC PLACEMENT:**
- You can place bestiary creatures on the map as non-combatant NPCs during exploration: [ACTION:place-creature-npc:{"name":"Lion","x":10,"y":6,"disposition":"neutral"}]
- This looks up the creature from the game's bestiary and places it with FULL combat stats (HP, AC, attacks) but as a non-combatant NPC token
- Use this for: caged animals, neutral monsters in lairs, bandits not yet attacking, guard dogs, mounts, resting dragons, wandering beasts, etc.
- The "name" field must match a creature name in the bestiary (e.g., "Lion", "Wolf", "Bandit", "Goblin Warrior", "Giant Spider", "Skeleton Guard")
- Optional fields:
  - "disposition": "hostile" (will fight if provoked), "neutral" (passive observer), or "friendly" (allied). Default: "neutral"
  - "displayName": override the displayed name (e.g., displayName: "Caged Lion" for a creature named "Lion")
  - "icon": emoji to show alongside the token
- To make a creature NPC turn hostile and join combat: [ACTION:aggro-npc:{"name":"Lion"}]
  - This converts the NPC into a combatant with full stats, mid-combat if needed (rolls initiative and joins the turn order)
  - Use this when: the party attacks a neutral creature, a trap springs releasing caged beasts, an NPC betrays the party, etc.
- Examples:
  - Caged lion: [ACTION:place-creature-npc:{"name":"Lion","x":3,"y":7,"disposition":"neutral","displayName":"Caged Lion"}]
  - Bandit lookout: [ACTION:place-creature-npc:{"name":"Bandit","x":12,"y":2,"disposition":"hostile","displayName":"Bandit Lookout"}]
  - Guard dog: [ACTION:place-creature-npc:{"name":"Wolf","x":8,"y":8,"disposition":"neutral","displayName":"Guard Dog"}]
  - Provoked creature: [ACTION:aggro-npc:{"name":"Caged Lion"}]

**RESPONSE FORMAT:**
- Write in second person ("You see...", "The creature turns to face you...")
- Use **bold** for emphasis and NPC names on first introduction
- Use dialogue with quotation marks for NPC speech
- Aim for 2-4 paragraphs — rich but not overwhelming
- End responses with a hook, question, or narrative prompt that invites player engagement
- CRITICAL: Always complete every sentence fully. Never stop mid-sentence or mid-word. End with proper punctuation.
- Never break character as the GM`;
  }

  private getToneGuidance(tone: string): string {
    const guidance: Record<string, string> = {
      heroic: '- Epic and inspiring. Heroes are larger than life. Good vs evil is clear but complex.\n- Use dramatic descriptions, triumphant moments, and noble sacrifices.\n- NPCs should be impressed by the heroes. The world needs saving, and these are the ones to do it.',
      gritty: '- Harsh and realistic. Resources are scarce, victories are costly, morality is gray.\n- Describe injuries in detail, make comfort rare, and let consequences have weight.\n- NPCs are survivors first. Trust is earned slowly and betrayed easily.',
      political: '- Intricate and nuanced. Words are weapons, alliances shift like sand.\n- Every NPC has an agenda. Conversations are layered with subtext.\n- Power dynamics matter more than combat. Information is the most valuable currency.',
      'dungeon-crawl': '- Atmospheric and dangerous. The dungeon is a character unto itself.\n- Describe architecture, traps, and environmental hazards vividly.\n- Treasure and discovery reward clever exploration. Death lurks behind every door.',
      horror: '- Unsettling and atmospheric. Fear comes from the unknown and the uncanny.\n- Use sensory details that create dread: wrong smells, impossible sounds, things glimpsed from the corner of the eye.\n- NPCs are unreliable, sanity frays, and the greatest threats are not always visible.',
      mystery: '- Cerebral and layered. Every detail could be a clue.\n- Plant red herrings and genuine leads side by side. Reward investigation and deduction.\n- NPCs all have secrets. The truth is always more complicated than it first appears.',
    };
    return guidance[tone] || guidance.heroic;
  }

  /** Build a compact map catalog for the GM system prompt */
  private buildMapCatalogPrompt(): string {
    return ENCOUNTER_MAP_CATALOG.map(m => {
      const hasImage = m.imageUrl ? '🖼️ ' : '';
      const tags = m.tags && m.tags.length > 0 ? ` [${m.tags.join(', ')}]` : '';
      return `  ${hasImage}${m.id} (${m.theme}/${m.subTheme}): ${m.description}${tags}`;
    }).join('\n');
  }

  // ─── Response Parser ────────────────────────────────────────

  private parseGMResponse(raw: string): {
    narrative: string;
    mechanicalActions: GMChatMessage['mechanicalAction'][];
    tensionDelta: number;
  } {
    let narrative = raw;
    const mechanicalActions: GMChatMessage['mechanicalAction'][] = [];
    let tensionDelta = 0;

    // Extract tension adjustments: [TENSION:+10] or [TENSION:-5]
    const tensionMatch = raw.match(/\[TENSION:([+-]?\d+)\]/g);
    if (tensionMatch) {
      for (const match of tensionMatch) {
        const val = parseInt(match.replace(/\[TENSION:/, '').replace(/\]/, ''));
        if (!isNaN(val)) tensionDelta += val;
        narrative = narrative.replace(match, '');
      }
    }

    // Extract mechanical action tags: [ACTION:type:details]
    const actionMatches = raw.match(/\[ACTION:([^:]+):([^\]]+)\]/g);
    if (actionMatches) {
      for (const match of actionMatches) {
        const parts = match.replace(/\[ACTION:/, '').replace(/\]/, '').split(':');
        if (parts.length >= 2) {
          const rawDetails = parts.slice(1).join(':').trim();
          let details: Record<string, any> = { raw: rawDetails };
          if (rawDetails.startsWith('{') && rawDetails.endsWith('}')) {
            try {
              const parsed = JSON.parse(rawDetails);
              if (parsed && typeof parsed === 'object') {
                details = parsed;
              }
            } catch {
              details = { raw: rawDetails };
            }
          }

          mechanicalActions.push({
            actionType: parts[0] as any,
            details,
            success: false, // Will be validated by rules engine
          });
        }
        narrative = narrative.replace(match, '');
      }
    }

    return {
      narrative: narrative.trim(),
      mechanicalActions,
      tensionDelta,
    };
  }

  // ─── Tension Auto-Calculation ───────────────────────────────

  /**
   * Calculate tension score based on the current game state.
   * This feeds into the tension tracker automatically.
   */
  calculateAutoTension(gameState: GameState, session: GMSession): number {
    let tension = session.tensionTracker.score;

    const players = gameState.creatures.filter(c => c.type === 'player' && !c.dead);
    const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);

    // Player health factor
    const avgPlayerHpPercent = players.length > 0
      ? players.reduce((sum, p) => sum + (p.currentHealth / p.maxHealth), 0) / players.length
      : 1;

    if (avgPlayerHpPercent < 0.3) tension += 10;  // Party in trouble
    else if (avgPlayerHpPercent < 0.5) tension += 5;
    else if (avgPlayerHpPercent > 0.8) tension -= 3;

    // Enemy count factor
    if (enemies.length > players.length * 2) tension += 8;
    else if (enemies.length > players.length) tension += 3;
    else if (enemies.length === 0) tension -= 15;

    // Downed players
    const downedPlayers = players.filter(p => p.currentHealth <= 0 || p.dying);
    if (downedPlayers.length > 0) tension += downedPlayers.length * 8;

    // Phase factor
    if (session.currentPhase === 'combat') tension += 5;
    else if (session.currentPhase === 'rest') tension -= 10;

    return Math.max(0, Math.min(100, tension));
  }

  // ─── NPC Management ─────────────────────────────────────────

  addRecurringNPC(session: GMSession, npc: Omit<RecurringNPC, 'id'>): RecurringNPC {
    const newNPC: RecurringNPC = {
      ...npc,
      id: `npc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    };
    session.recurringNPCs.push(newNPC);
    return newNPC;
  }

  updateNPCDisposition(session: GMSession, npcId: string, delta: number): RecurringNPC | null {
    const npc = session.recurringNPCs.find(n => n.id === npcId);
    if (!npc) return null;
    npc.disposition = Math.max(-100, Math.min(100, npc.disposition + delta));
    return npc;
  }

  addNPCInteraction(session: GMSession, npcId: string, summary: string): void {
    const npc = session.recurringNPCs.find(n => n.id === npcId);
    if (npc) {
      npc.interactions.push({ summary, timestamp: Date.now() });
    }
  }

  // ─── Session Notes ──────────────────────────────────────────

  createSessionNote(session: GMSession, title: string, summary: string): SessionNote {
    const note: SessionNote = {
      id: `note-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      sessionNumber: session.sessionNotes.length + 1,
      title,
      summary,
      keyDecisions: [],
      npcsEncountered: [],
      encountersCompleted: session.encounterCount,
      timestamp: Date.now(),
    };
    session.sessionNotes.push(note);
    return note;
  }

  // ─── Story Arc Management ───────────────────────────────────

  createStoryArc(session: GMSession, arc: Omit<StoryArc, 'milestones' | 'secretPlots'>): void {
    session.storyArc = {
      ...arc,
      milestones: [],
      secretPlots: [],
    };
  }

  advanceStoryPhase(session: GMSession): void {
    if (!session.storyArc) return;
    const phases: StoryArc['storyPhase'][] = ['setup', 'rising-action', 'climax', 'resolution'];
    const currentIdx = phases.indexOf(session.storyArc.storyPhase);
    if (currentIdx < phases.length - 1) {
      session.storyArc.storyPhase = phases[currentIdx + 1];
    }
  }

  completeMilestone(session: GMSession, index: number): void {
    if (!session.storyArc || !session.storyArc.milestones[index]) return;
    session.storyArc.milestones[index].completed = true;
    session.storyArc.milestones[index].timestamp = Date.now();
  }

  // ─── Phase Transitions ─────────────────────────────────────

  setPhase(session: GMSession, phase: GMSession['currentPhase']): void {
    session.currentPhase = phase;
  }

  // ─── Scene Visual Selection ───────────────────────────────────

  private getSceneSeed(parts: string[]): string {
    return parts
      .map(p => p.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      .filter(Boolean)
      .join('-');
  }

  private toneBackdropTag(tone: CampaignPreferences['tone']): string {
    const byTone: Record<CampaignPreferences['tone'], string> = {
      heroic: 'sunlit-ruins',
      gritty: 'storm-road',
      political: 'candle-hall',
      'dungeon-crawl': 'deep-vault',
      horror: 'fog-marsh',
      mystery: 'moonlit-manor',
    };
    return byTone[tone] || 'fantasy-scene';
  }

  createSceneVisual(
    session: GMSession,
    options?: {
      source?: SceneVisualState['source'];
      mapId?: string;
      mapName?: string;
      mapTheme?: string;
      caption?: string;
    }
  ): SceneVisualState {
    const source = options?.source || 'ai';
    const toneTag = this.toneBackdropTag(session.campaignPreferences.tone);
    const phaseTag = session.currentPhase || 'exploration';
    const mapTag = options?.mapTheme || options?.mapId || 'unmapped';
    const seed = this.getSceneSeed([
      session.campaignPreferences.campaignName,
      toneTag,
      phaseTag,
      mapTag,
      String(Date.now()),
    ]);

    return {
      imageUrl: `https://picsum.photos/seed/pf2e-${seed}/1280/720`,
      caption: options?.caption
        || (options?.mapName
          ? `${options.mapName} — ${session.currentPhase} scene`
          : `${session.campaignPreferences.tone} ${session.currentPhase} scene`),
      source,
      mapId: options?.mapId,
      mapName: options?.mapName,
      updatedAt: Date.now(),
    };
  }

  setSceneVisual(session: GMSession, visual: SceneVisualState): SceneVisualState {
    session.currentSceneVisual = visual;
    return visual;
  }

  // ─── Generate Opening Scene ──────────────────────────────────

  async generateOpeningScene(gameState: GameState, session: GMSession): Promise<{ content: string; isAIGenerated: boolean; actions: GMChatMessage['mechanicalAction'][] }> {
    const prefs = session.campaignPreferences;
    const tone = prefs.tone;
    const players = gameState.creatures.filter(c => c.type === 'player');
    const mapW = gameState.map?.width || 20;
    const mapH = gameState.map?.height || gameState.map?.width || 20;

    // Look up Foundry map narration context if available
    const currentMapId = session.currentEncounterMapId;
    const currentMap = currentMapId ? getMapById(currentMapId) : undefined;
    const foundryMap = currentMap as FoundryMapEntry | undefined;
    const mapNarration = foundryMap?.narrationContext || '';
    const mapTactical = foundryMap?.tacticalNotes || '';
    const mapDescription = currentMap?.description || '';
    const mapName = currentMap?.name || '';

    const playerIntros = players.map(p =>
      `${p.name} (Level ${p.level} ${p.ancestry || ''} ${p.characterClass || 'Adventurer'})`
    ).join(', ');

    // If AI is available, generate a rich opening scene
    if (this.providers.hasAny) {
      try {
        const result = await this.providers.chatComplete({
          model: this.resolveModel(session),
          messages: [
            {
              role: 'system',
              content: `You are an expert Game Master for a Pathfinder 2e tabletop RPG. You are about to narrate the very first scene of a brand-new campaign. This is the opening — make it CINEMATIC, vivid, and unforgettable.

CAMPAIGN DETAILS:
- Campaign Name: "${prefs.campaignName}"
- Tone: ${tone}
- Themes: ${prefs.themes.join(', ')}
- Pacing: ${prefs.pacing}
${prefs.customNotes ? `- GM Notes: ${prefs.customNotes}` : ''}

THE PARTY:
${playerIntros || 'A group of brave adventurers'}

MAP INFO:
- The battle map is ${mapW} tiles wide and ${mapH} tiles tall (grid coordinates 0-${mapW - 1} x, 0-${mapH - 1} y)
- The party tokens start near the center of the map
${mapName ? `- Map Name: "${mapName}"` : ''}
${mapDescription ? `- Map Description: ${mapDescription}` : ''}
${mapNarration ? `- Scene Atmosphere (USE THIS for your narration): ${mapNarration}` : ''}
${mapTactical ? `- Tactical Layout: ${mapTactical}` : ''}
- Place NPCs at positions that make spatial sense for the scene

YOUR TASK:
Write the opening scene of this campaign. This should be 4-6 paragraphs that:
1. **Set the scene** — Describe the location vividly with sensory details (sights, sounds, smells, weather, atmosphere). Where are the heroes? What time of day is it? What does this place look and feel like?
2. **Introduce the world** — Give a sense of the larger setting and its current state. What's the mood of the people? What recent events have shaped this place?
3. **Introduce the heroes** — Reference the party members by name. How did they come to be here? Are they meeting for the first time, or do they have a shared history? Describe the scene from their perspective.
4. **Present the hook** — Introduce an inciting incident, mysterious event, urgent summons, or compelling call to action that demands the heroes' attention. Make it specific and intriguing.
5. **End with a clear prompt** — Give the players 2-3 concrete options for how to proceed, or pose a direct question that demands a response.

NPC PLACEMENT (CRITICAL):
After your narrative, you MUST place every named NPC that appears in your scene on the map using action tags. This is how they appear as tokens on the battle grid.
- For non-combatant NPCs (townsfolk, merchants, quest givers, etc.): [ACTION:place-npc:{"name":"NPC Name","x":5,"y":8,"icon":"🧔","role":"neutral","description":"Brief description"}]
- For creatures/monsters in the scene (caged beasts, guard animals, wild creatures that aren't attacking yet): [ACTION:place-creature-npc:{"name":"BestiaryName","x":10,"y":6,"disposition":"neutral","displayName":"Displayed Name"}]
- Choose appropriate emoji icons for NPCs: 🧙 wizard/mage, 🧝 elf, 👸 noble, 🧔 male NPC, 👩 female NPC, 🧑‍🌾 farmer, 🧑‍🍳 cook, 💂 guard, 🧟 undead, 🏇 rider, 👴 elder, 📚 scholar, 🎩 formal, ⚔️ warrior, 🧥 hooded/suspicious, 🍺 bartender, 📜 messenger, 👑 royalty, 🗺️ guide, 🔥 torchbearer
- Place as many NPCs as the scene calls for — a busy tavern might have 4-6, a lonely road might have 1, a royal court could have 8+
- Position NPCs logically: bartender behind the bar (far side of map), guards at map edges, a speaker at center, crowd spread out
- Do NOT skip NPC placement — every named NPC in the narrative must have an action tag

STYLE GUIDELINES:
- Write in second person ("You find yourselves...", "The air around you...")
- Use **bold** for important NPC names, locations, and key terms on first mention
- Use dialogue with quotation marks for any NPC speech
- Match the ${tone} tone throughout
- Be specific and detailed — generic fantasy is boring
- The hook should feel urgent and personal, not just a quest board posting
- CRITICAL: Always complete every sentence fully. Never stop mid-sentence or mid-word. End with proper punctuation.

Do NOT include any mechanical game information, dice rolls, or rules references. Only the narrative text and NPC placement action tags.`
            },
            {
              role: 'user',
              content: `Begin the opening scene for "${prefs.campaignName}". The party consists of: ${playerIntros || 'adventurers gathering for the first time'}.`
            }
          ],
          temperature: 0.9,
          max_tokens: 2500,
        });

        const content = result.content;
        if (content && content.trim().length > 50) {
          // Parse action tags from the AI response
          const parsed = this.parseGMResponse(content.trim());
          return {
            content: parsed.narrative,
            isAIGenerated: true,
            actions: parsed.mechanicalActions,
          };
        }
      } catch (error) {
        console.warn('AI opening scene generation failed, using local fallback:', error);
      }
    }

    // Local fallback: tone-aware opening scenes
    return { content: this.generateLocalOpeningScene(gameState, session), isAIGenerated: false, actions: [] };
  }

  private generateLocalOpeningScene(gameState: GameState, session: GMSession): string {
    const prefs = session.campaignPreferences;
    const tone = prefs.tone;
    const players = gameState.creatures.filter(c => c.type === 'player');
    const campaignName = prefs.campaignName;
    const themes = prefs.themes;

    const playerList = players.length > 0
      ? players.map(p => `**${p.name}** the ${p.ancestry || ''} ${p.characterClass || 'adventurer'}`.trim()).join(', ')
      : 'a band of brave adventurers';

    const openingScenes: Record<string, string> = {
      heroic: `The morning sun breaks through a canopy of gold-leafed oaks as you arrive at the crossroads town of **Thornhaven**. The air smells of fresh bread and chimney smoke, and the sounds of a bustling market fill the cobblestone square. Banners of crimson and silver snap in the breeze — the festival of the Founding is only days away, and the town is alive with preparation.

${playerList} — you have each been drawn here by different roads, but fate has a way of weaving threads together. Perhaps it was the posting at the Adventurer's Guild, perhaps a letter sealed with an unfamiliar crest, or perhaps simply the restless itch in your bones that says *something important is about to happen*.

As you take in the scene, a commotion erupts near the town hall. A woman in mud-splattered riding leathers pushes through the crowd, her face pale with exhaustion and fear. She staggers up the steps and cries out: "The **Silverdeep Mine** has collapsed — but not from any cave-in! Something *moved* down there. Something ancient. And the miners... the miners aren't coming back up."

The crowd murmurs. The mayor, a stout dwarf named **Alderman Greystone**, steps forward with furrowed brows. His eyes scan the crowd and land on you — armed, capable, and exactly what he needs.

"You there," he calls, his voice carrying the weight of authority. "Thornhaven will pay handsomely for brave souls willing to investigate. But I won't lie to you — the last patrol we sent hasn't returned either."

**What do you do?** You could speak with the rider to learn more about what she saw, approach Alderman Greystone to negotiate terms, or head directly to the Silverdeep Mine before whatever lurks below can dig any deeper.`,

      gritty: `Rain hammers the warped shingles of the **Broken Antler Inn** as you huddle inside, nursing drinks that are more water than ale. The fire in the hearth is anemic, throwing more smoke than heat, and the other patrons eye you with the practiced suspicion of people who've learned not to trust strangers. The town of **Ashwick** has seen better days — better decades, really. The mines dried up years ago, and what's left is a husk of weathered wood and desperate people.

${playerList} — you've each washed up here for your own reasons, none of them good. The roads aren't safe anymore. Bandits to the south, plague rumors to the east, and something worse in the forests to the north that the locals won't even name.

The inn door crashes open. A man stumbles in — no, he *falls* in, leaving a smear of blood across the threshold. He's young, maybe a farmer's son, and his left arm hangs at a wrong angle. "They... they took the whole caravan," he gasps, his eyes wild. "At the **Gallows Bridge**. Not bandits. Something wearing the skins of dead men. They... they were eating..."

He collapses. The innkeeper, a scarred woman named **Marta**, doesn't look surprised. She looks *resigned*.

"This is the third time this month," she says quietly, wringing a dirty rag. "If any of you has a sword arm and a stomach for ugly work, there's coin in it. The bailiff's too drunk to care, and the garrison rode north and never came back."

She slides a hand-drawn map across the bar. The bridge is marked in charcoal. Someone has drawn a skull next to it.

You can question the injured man before he passes out, examine Marta's map for tactical information, or venture out into the rain toward Gallows Bridge — though nightfall is only an hour away.`,

      horror: `You can't quite remember when the fog rolled in. One moment the road was clear, the stars faint but visible above; the next, a thick, cloying mist swallowed everything beyond arm's reach. The air has a taste — wet and sweet and wrong, like flowers left too long in stagnant water. Your footsteps sound muffled, as though the ground itself is absorbing sound.

${playerList} — you were traveling together, weren't you? Or were you? The details feel slippery, like trying to hold water in cupped hands. You know you're heading to **Ravenhollow**, a village at the edge of the **Whispervale Marsh**. But *why* you're going there... the reason keeps shifting at the edge of your thoughts.

Then you see the lights. Pale, flickering lampposts emerge from the fog, marking what might be a village square. The buildings are there — squat, dark-windowed structures with peaked roofs — but something is fundamentally wrong. Every door in the village is open. Not broken, not forced. Just... *open*. Swinging gently in a breeze you can't feel.

In the center of the square, you find a well. Nailed to its stone rim is a piece of leather — old, cracked, covered in writing that might be ink or might be something else. The words are simple: "DO NOT LOOK INTO THE WELL. DO NOT ANSWER IF IT SPEAKS."

A sound rises from below the well. Not a voice. Not quite. Something between a hum and a sob.

You could read the rest of the leather scroll nailed to the well, investigate the nearest open building for signs of the missing villagers, or call out into the fog to see if anyone in Ravenhollow is still alive — though you might not like what answers.`,

      'dungeon-crawl': `The entrance yawns before you like the mouth of some great stone beast. Carved pillars, half-swallowed by centuries of root and vine, flank a descending staircase that disappears into absolute darkness. The air rising from below is cool and carries the scent of wet stone, old metal, and something faintly chemical — alchemical residue, perhaps, or something older still.

${playerList} — you've been hired by the **Pathfinder Society** to map and clear the **Vaults of Kol-Tharen**, a pre-Earthfall dwarven stronghold that was sealed during the Age of Darkness and never reopened. The bounty is considerable: 500 gold per floor cleared, plus salvage rights on anything not of historical significance. The catch? Three teams have entered before you. None returned. The Society's field coordinator, a gnome named **Thistle Brightwick**, gave you the rundown at base camp an hour ago, her usual cheerfulness strained thin.

"The architectural surveys suggest at least seven sublevels," she told you, adjusting her spectacles. "The first team made it to level three before their sending stone went dead. The second and third..." She paused. "Let's just say we stopped tracking them after the screaming."

Now you stand at the threshold, torches lit, weapons ready. The first room is visible just past the stairs — a grand entry hall with a mosaic floor depicting a dwarven king holding a hammer above an anvil. Half the tiles are cracked, and from somewhere deeper, you hear the rhythmic sound of metal striking stone. *Tink. Tink. Tink.* Steady as a heartbeat.

You could descend carefully and examine the mosaic for trap mechanisms, investigate the source of the hammering sound, or search the area around the entrance for the previous teams' base camps and any notes they might have left behind.`,

      mystery: `The letter arrived three days ago, sealed with black wax and stamped with a sigil none of you recognized — a moth encircling a keyhole. Inside, a single card of heavy cream stock bore a message in precise, mechanical type: "Your presence is requested at **Hathcourt Manor** for a reading of the last will and testament of **Lord Aldric Hathcourt**. You are named as beneficiaries. Come alone. Tell no one."

${playerList} — you've each received the same letter. And none of you have ever heard of Lord Aldric Hathcourt.

Now you stand in the foyer of the manor, a cavernous space of dark wood paneling and taxidermied animals that stare with glass eyes from every alcove. The butler — a gaunt, impeccably dressed man who introduced himself only as **Graves** — led you here and instructed you to wait. That was forty-five minutes ago. The grandfather clock in the corner ticks with surgical precision.

There are six chairs arranged in a semicircle. You count five other guests besides yourselves, each looking equally confused and suspicious. A pale woman in scholars' robes keeps checking her pocket watch. A broad-shouldered man with mercenary's scars picks at his fingernails with a knife. A young halfling clutches a copy of the same letter you received, her eyes darting to every shadow.

Then the lights flicker. When they stabilize, Graves has returned — but his composure has cracked. "I regret to inform you," he says, his voice barely steady, "that the reading of the will must be... postponed. Lord Hathcourt's study has been found... disturbed. And the document itself is missing." He pauses. "Also, I must ask that no one attempt to leave. The bridge across the ravine has been destroyed. We are, I'm afraid, quite trapped."

A crash echoes from upstairs. Someone screams.

You could interrogate Graves about Lord Hathcourt and his connection to you, rush upstairs to investigate the scream, or scan the other guests for anyone who seems less surprised than they should be.`,

      political: `The great hall of the **Argent Senate** buzzes with barely contained tension. Hundreds of candles illuminate the vaulted ceiling and its painted constellations, but the light does nothing to warm the icy atmosphere between the assembled dignitaries. The death of **Empress Valcora III** — announced just this morning — has left the throne of **Aranthis** empty for the first time in forty years, and already the vultures are circling.

${playerList} — you have each been summoned to this gathering by different patrons, for different reasons. Some of you serve noble houses. Others carry debts or secrets that certain powerful people would prefer remain buried. Welcome to the most dangerous game in the empire: politics.

**Chancellor Dorian Ashvale**, the acting head of state, descends the marble dais with carefully practiced grief on his face. "The Empress's death was sudden," he announces to the assembly. "But the physicians assure us it was natural." A ripple of disbelief passes through the crowd. The Empress was fifty-two and in perfect health a week ago. *Natural.*

Near the wine table, a woman in a midnight-blue gown catches your eye. She is **Lady Serena Voss**, spymaster of House Voss, and she does not look like she believes a word the Chancellor has said. She raises her glass in your direction with a razor-thin smile and mouths two words: "Find me."

At the same moment, a courier in imperial livery approaches your group. He hands you a sealed envelope and vanishes into the crowd before you can question him. Inside is a torn piece of parchment — half of what appears to be an imperial decree, the ink still fresh. The visible portion reads: "...hereby transfer all authority to..." The rest is missing.

You could seek out Lady Voss before someone else gets to her first, examine the torn decree for clues about its origin, or mingle with the dignitaries to gauge which factions are already forming around the empty throne.`,
    };

    return openingScenes[tone] || openingScenes.heroic;
  }

  // ─── Generate Encounter Narration ───────────────────────────

  generateEncounterIntro(gameState: GameState, session: GMSession): string {
    const band = getTensionBand(session.tensionTracker.score);
    const tone = session.campaignPreferences.tone;
    const enemies = gameState.creatures.filter(c => c.type !== 'player' && !c.dead && c.currentHealth > 0);

    if (enemies.length === 0) return 'An encounter begins, but no enemies are visible yet...';

    // Inject Foundry map narration context if available
    const currentMapId = session.currentEncounterMapId;
    const currentMap = currentMapId ? getMapById(currentMapId) : undefined;
    const foundryMap = currentMap as FoundryMapEntry | undefined;
    const mapNarration = foundryMap?.narrationContext;

    // Build rich enemy introductions with bestiary data
    const enemyIntros = enemies.map(e => {
      const entry = this.lookupBestiary(e.name);
      if (entry && entry.description) {
        return `**${e.name}** (Lv${e.level}) — ${entry.description}`;
      }
      return `**${e.name}** (Lv${e.level})`;
    });

    const toneIntros: Record<string, Record<TensionBand, string>> = {
      heroic: {
        low: `A challenge presents itself! From the shadows step your foes:\n\n${enemyIntros.join('\n')}\n\nDraw your weapons and ready your spells — the battle is joined! Roll for initiative!`,
        mid: `Danger! The path ahead is blocked by hostile forces:\n\n${enemyIntros.join('\n')}\n\nSteel yourselves, heroes — this fight will test your mettle! Combat begins!`,
        high: `With a thunderous crash, your enemies reveal themselves! The air crackles with violent intent:\n\n${enemyIntros.join('\n')}\n\nThis is no ordinary skirmish — fight with everything you have!`,
        critical: `The moment of truth is upon you! The ground trembles as your most dangerous foes yet emerge:\n\n${enemyIntros.join('\n')}\n\nEverything hangs in the balance — FIGHT FOR YOUR LIVES!`,
      },
      gritty: {
        low: `Movement ahead — and it\'s not friendly. You spot your adversaries:\n\n${enemyIntros.join('\n')}\n\nWeapons ready. This won\'t be clean.`,
        mid: `Trouble finds you again. Hostile figures emerge from the surroundings:\n\n${enemyIntros.join('\n')}\n\nNo time to think — only survive. Initiative.`,
        high: `Ambush! Enemies close in from multiple directions:\n\n${enemyIntros.join('\n')}\n\nThe odds are against you. When aren\'t they? Fight dirty if you have to.`,
        critical: `This is it — the fight you weren\'t sure you\'d survive. Your worst fears materialize:\n\n${enemyIntros.join('\n')}\n\nSay your prayers. Then fight like hell.`,
      },
      horror: {
        low: `Something stirs in the darkness. Your dread becomes reality as shapes take form:\n\n${enemyIntros.join('\n')}\n\nThe horror begins. Steel your nerves and roll for initiative.`,
        mid: `The air goes cold. From the impossible shadows emerge nightmarish forms:\n\n${enemyIntros.join('\n')}\n\nYour hand trembles on your weapon. But you must fight — there is no other way.`,
        high: `A scream tears through the silence — and then they come. Things that should not exist, given terrible form:\n\n${enemyIntros.join('\n')}\n\nReason fails. All that remains is survival.`,
        critical: `Reality cracks. The boundary between worlds shivers and breaks, disgorging horrors beyond comprehension:\n\n${enemyIntros.join('\n')}\n\nSanity is a luxury you can no longer afford. FIGHT.`,
      },
      'dungeon-crawl': {
        low: `The dungeon\'s guardians reveal themselves. Your torchlight falls on:\n\n${enemyIntros.join('\n')}\n\nAnother room, another fight. Roll initiative!`,
        mid: `The corridor opens into a larger chamber — and you\'re not alone. The dungeon\'s denizens eye you hungrily:\n\n${enemyIntros.join('\n')}\n\nReady your gear — combat begins!`,
        high: `A trap triggers — not a mechanical one, but a carefully laid ambush! Creatures pour from hidden passages:\n\n${enemyIntros.join('\n')}\n\nThe dungeon fights back. Show it what heroes are made of!`,
        critical: `The vault guardian awakens. The floor trembles. Ancient wards flare with dying light as the dungeon\'s deadliest protectors emerge:\n\n${enemyIntros.join('\n')}\n\nThis is the deepest level. There is no retreat.`,
      },
      mystery: {
        low: `Your investigation has led you directly into danger. The suspects have become aggressors:\n\n${enemyIntros.join('\n')}\n\nSomeone doesn\'t want you solving this case. Time to fight back.`,
        mid: `The trap springs — not a dungeon trap, but a carefully planned ambush. Your enemies reveal themselves:\n\n${enemyIntros.join('\n')}\n\nSomeone hired professionals. Time to show them they underestimated you.`,
        high: `Cornered and outnumbered, you face the truth: this conspiracy goes deeper than you thought. Armed enforcers close in:\n\n${enemyIntros.join('\n')}\n\nThe evidence can\'t help you now. Only your weapons can.`,
        critical: `The mastermind behind everything steps from the shadows, flanked by their deadliest servants:\n\n${enemyIntros.join('\n')}\n\nAll the clues led here. Now the final confrontation begins.`,
      },
      political: {
        low: `Diplomacy has failed. Your political enemies have resorted to more... direct methods:\n\n${enemyIntros.join('\n')}\n\nThe masks come off. Draw your weapons.`,
        mid: `An assassination attempt! Hired blades emerge from hidden positions:\n\n${enemyIntros.join('\n')}\n\nSomeone wants you dead, and they\'ve invested heavily in making it happen.`,
        high: `The coup begins. Loyal and treasonous forces clash around you as enemies reveal themselves:\n\n${enemyIntros.join('\n')}\n\nThe fate of the realm hangs on this battle. For your allies — FIGHT!`,
        critical: `All masks are off. The full force of your enemies\' conspiracy crashes down upon you:\n\n${enemyIntros.join('\n')}\n\nThis is the battle that will determine the future of everything you\'ve fought for.`,
      },
    };

    const baseIntro = toneIntros[tone]?.[band] || toneIntros.heroic[band];

    // Prepend map narration context if we have one from a Foundry map
    if (mapNarration) {
      return `*${mapNarration}*\n\n${baseIntro}`;
    }
    return baseIntro;
  }

  generateEncounterConclusion(gameState: GameState, session: GMSession, victory: boolean): string {
    const band = getTensionBand(session.tensionTracker.score);
    const tone = session.campaignPreferences.tone;
    const players = gameState.creatures.filter(c => c.type === 'player' && !c.dead);
    const downedPlayers = players.filter(p => p.currentHealth <= 0 || p.dying);

    if (victory) {
      const pyrrhic = downedPlayers.length > 0;
      const victoryNarrations: Record<string, string[]> = {
        heroic: pyrrhic
          ? ['The last enemy falls, but the victory rings hollow. Your companions lie wounded on the battlefield. Tend to them quickly — this battle is won, but the war continues. The cost of heroism is written in scars and sacrifice.']
          : [
            'The final blow lands, and silence returns like a held breath being released. You stand victorious! The dust settles around you as the reality sinks in — you\'ve done it. Take a moment to catch your breath, check your companions, and savor this hard-won triumph.',
            'Victory! Your enemies lie defeated, and the echoes of battle fade into memory. Your weapons drip, your muscles ache, but your spirits soar. Another chapter of your legend is written in steel and courage.',
          ],
        gritty: pyrrhic
          ? ['It\'s over. You\'re alive — barely. Your companions groan and bleed, and the cost of this fight is measured in blood and nightmares. Patch what you can. Move when you\'re able. This world doesn\'t give you time to mourn.']
          : [
            'The fighting stops. You stand among the fallen, breathing hard, splattered with blood that\'s not all yours. No glory here — just survival. Check the bodies for anything useful, then keep moving.',
            'Done. The silence after combat is always the worst — that\'s when the shakes start. You wipe your blade clean and force yourself to focus. What\'s next?',
          ],
        horror: pyrrhic
          ? ['The thing stops twitching. Is it truly dead? You\'re not sure — nothing in this cursed place stays dead for long. Your companions are in bad shape. Worse, you swear you can still hear it breathing...']
          : [
            'It\'s over — or at least, this part is. The remains of your foes dissolve, sink into the ground, or simply stop moving. But the wrongness lingers. The air is still cold. And somewhere in the dark, you hear the echo of laughter that isn\'t yours.',
            'Silence falls like a curtain. The horror retreats, but doesn\'t disappear — it merely waits. You know it will come again. It always does.',
          ],
        'dungeon-crawl': pyrrhic
          ? ['The guardian falls, but it took everything you had. Half the party is down, potions are running low, and the dungeon stretches endlessly ahead. But the treasure — oh, the treasure might make it all worthwhile...']
          : [
            'The room falls silent as the last guardian crumbles. The dungeon relents — for now. Somewhere deeper, you hear the click of a mechanism: a new passage, perhaps? Or was that sound always there? Take what you can from the fallen. The next chamber awaits.',
            'Victory in the deep! The echoes of battle fade through ancient corridors, and the dungeon seems to exhale. New paths open ahead. What secrets lie beyond?',
          ],
        mystery: [
          'The fight is over, but it\'s raised more questions than answers. Why were they so desperate to stop you? What were they protecting? Search the area carefully — the answer might be here, hidden among the evidence.',
        ],
        political: [
          'The would-be assassins lie defeated. This changes everything — an armed attack means someone is desperate, and desperate people make mistakes. The political fallout from this will shake the entire court. Use it wisely.',
        ],
      };
      const options = victoryNarrations[tone] || victoryNarrations.heroic;
      return options[Math.floor(Math.random() * options.length)];
    } else {
      const defeatNarrations: Record<string, string[]> = {
        heroic: ['Darkness claims you... but heroes do not die so easily. In legends, this is the moment where the fallen are touched by divine grace, where fate itself intervenes. Perhaps this is not the end of your story, but merely a turning point.'],
        gritty: ['You fall. The world goes dark around the edges, and the last thing you hear is the sound of your enemies\' boots on stone. In a kinder world, this would be the end. But the cruelest thing about this world is that it doesn\'t always let you die...'],
        horror: ['Consciousness fades, but something prevents you from slipping into oblivion. It wants you alive. It has plans for you. In the dark behind your eyes, something smiles with too many teeth...'],
        'dungeon-crawl': ['The dungeon claims another party. Your vision fades as the cold stone drinks your blood. Perhaps, centuries from now, another group of adventurers will find your bones — and hopefully learn from your mistakes.'],
        mystery: ['The case goes cold as darkness takes you. But the evidence remains — someone, someday, will pick up where you left off. The truth always comes out eventually.'],
        political: ['You fall, and with you fall the hopes of your faction. But in politics, no defeat is ever truly final. Allies will regroup, debts will be called in, and the game will continue — with or without you.'],
      };
      const options = defeatNarrations[tone] || defeatNarrations.heroic;
      return options[Math.floor(Math.random() * options.length)];
    }
  }

  // ─── Campaign Setting Suggestion ──────────────────────────────

  /**
   * Generate AI-powered campaign setting suggestions.
   * Takes an optional user hint/prompt and returns suggested campaign settings.
   */
  async suggestCampaign(userHint?: string, recentNames?: string[], modelOverride?: string): Promise<{
    campaignName: string;
    tone: string;
    themes: string[];
    pacing: string;
    description: string;
    _meta?: {
      source: 'ai' | 'local-fallback';
      model: string;
      provider?: 'openai' | 'anthropic' | 'google' | 'deepseek';
      requestedModel?: string;
      reason?: string;
      diagnostics?: Array<{
        model: string;
        provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
        outcome: 'success' | 'error';
        status?: number;
        error?: string;
      }>;
    };
  }> {
    const validTones = ['heroic', 'gritty', 'political', 'dungeon-crawl', 'horror', 'mystery'];
    const validThemes = [
      'adventure', 'exploration', 'undead', 'dragons', 'nature',
      'intrigue', 'war', 'planar', 'divine', 'arcane',
      'pirates', 'heist', 'survival', 'ancient ruins', 'prophecy'
    ];
    const validPacing = ['slow', 'moderate', 'fast'];

    const preferredModel = (modelOverride || '').trim();
    const requestedModel = preferredModel.length > 0 ? preferredModel : this.modelName;
    let modelForSuggestion = requestedModel;

    const requestedProvider = detectProvider(requestedModel);
    if (!this.providers.hasProvider(requestedProvider)) {
      const available = await this.getAvailableModels();
      const workingModel = available.find((m) => this.providers.hasProvider(detectProvider(m)));
      if (workingModel) {
        modelForSuggestion = workingModel;
      }
    }

    if (!this.providers.hasAny) {
      // Local fallback: generate a random suggestion
      return {
        ...this.generateLocalCampaignSuggestion(userHint, recentNames),
        _meta: {
          source: 'local-fallback',
          model: modelForSuggestion,
          requestedModel,
          reason: 'No AI provider configured',
        },
      };
    }

    // Build a varied prompt that avoids recent suggestions
    const avoidClause = recentNames && recentNames.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat or rephrase these recently suggested campaigns: ${recentNames.join(', ')}. Suggest something completely different in tone, setting, and premise.`
      : '';

    // Pick a random creative direction to encourage variety
    const angles = [
      'Focus on an unusual location in Golarion that most campaigns overlook.',
      'Center the campaign around a moral dilemma or ethical conflict, not just combat.',
      'Build the campaign around a unique mechanic or gimmick (e.g., time pressure, faction reputation, mystery clues).',
      'Draw inspiration from a non-Western mythology or folklore tradition.',
      'Create a campaign that starts in media res — the heroes are already in danger when it begins.',
      'Design a campaign where the antagonist has sympathetic motivations.',
      'Set the campaign in an unexpected environment: underwater, in the sky, underground, or in another plane entirely.',
      'Create a campaign centered on a heist, competition, or social challenge rather than a dungeon.',
      'Build a survival-focused campaign where resources and shelter matter as much as combat.',
      'Design a mystery where nothing is as it seems and the true enemy is hidden.',
      'Focus on a war campaign where the heroes lead troops and make strategic decisions.',
      'Create a campaign exploring the aftermath of a great catastrophe.',
    ];
    const creativeAngle = angles[Math.floor(Math.random() * angles.length)];

    const prompt = userHint
      ? `The user wants a Pathfinder 2e campaign with the following idea: "${userHint}".

IMPORTANT REQUIREMENTS:
- You MUST base the campaign directly on this idea and keep the same core premise.
- Do NOT output a generic concept unrelated to the user's hint.
- Reuse at least 2 specific concepts/terms from the user's hint in the campaign name or description.

Creative direction: ${creativeAngle}${avoidClause}`
      : `Suggest a creative and unique Pathfinder 2e campaign setting. Be imaginative, surprising, and specific. Creative direction: ${creativeAngle}${avoidClause}`;

    const discoveredModels = await this.getAvailableModels();
    const candidateModels = Array.from(new Set([
      modelForSuggestion,
      ...discoveredModels.filter((m) => this.providers.hasProvider(detectProvider(m))),
    ])).slice(0, 5);

    const attemptErrors: string[] = [];
    const diagnostics: Array<{
      model: string;
      provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
      outcome: 'success' | 'error';
      status?: number;
      error?: string;
    }> = [];
    for (const candidateModel of candidateModels) {
      const provider = detectProvider(candidateModel);
      try {
        const result = await this.providers.chatComplete({
          model: candidateModel,
          messages: [
            {
              role: 'system',
              content: `You are a creative Pathfinder 2e Game Master helping a player set up a new campaign. 
Generate campaign settings as a JSON object with exactly these fields:
- "campaignName": A creative campaign name (max 60 chars)
- "tone": One of: ${validTones.join(', ')}
- "themes": An array of 2-4 themes from: ${validThemes.join(', ')}
- "pacing": One of: ${validPacing.join(', ')}
- "description": A 2-3 sentence adventure hook/description (max 300 chars)

Respond with ONLY the JSON object, no markdown, no explanation.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 1.0,
          max_tokens: 300,
        });

        const raw = result.content;
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = await this.parseCampaignSuggestionJSON(cleaned, candidateModel);

        return {
          campaignName: String(parsed.campaignName || 'Untitled Campaign').slice(0, 60),
          tone: validTones.includes(parsed.tone) ? parsed.tone : 'heroic',
          themes: Array.isArray(parsed.themes)
            ? parsed.themes.filter((t: string) => validThemes.includes(t)).slice(0, 4)
            : ['adventure', 'exploration'],
          pacing: validPacing.includes(parsed.pacing) ? parsed.pacing : 'moderate',
          description: String(parsed.description || '').slice(0, 1000),
          _meta: {
            source: 'ai',
            model: result.model || candidateModel,
            provider: result.provider,
            requestedModel,
            reason: requestedModel !== (result.model || candidateModel)
              ? `Requested model unavailable or rate-limited; used ${result.model || candidateModel} instead`
              : undefined,
            diagnostics: [
              ...diagnostics,
              {
                model: candidateModel,
                provider,
                outcome: 'success',
              },
            ],
          },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const status = (error as any)?.status || (error as any)?.response?.status || (error as any)?.statusCode;
        diagnostics.push({
          model: candidateModel,
          provider,
          outcome: 'error',
          status: typeof status === 'number' ? status : undefined,
          error: msg,
        });
        attemptErrors.push(`${candidateModel}: ${msg}`);
      }
    }

    console.warn('AI campaign suggestion failed across all models, using local fallback:', attemptErrors);
    return {
      ...this.generateLocalCampaignSuggestion(userHint, recentNames),
      _meta: {
        source: 'local-fallback',
        model: modelForSuggestion,
        requestedModel,
        reason: attemptErrors.slice(0, 3).join(' | '),
        diagnostics,
      },
    };
  }

  private async parseCampaignSuggestionJSON(raw: string, model: string): Promise<any> {
    const attempts: string[] = [];
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    attempts.push(cleaned);

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      attempts.push(cleaned.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of attempts) {
      try {
        return JSON.parse(candidate);
      } catch {
        const normalized = candidate
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/,\s*([}\]])/g, '$1');
        try {
          return JSON.parse(normalized);
        } catch {
          // continue
        }
      }
    }

    const repair = await this.providers.chatComplete({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON repair utility. Return only valid minified JSON. Do not add explanations or markdown.',
        },
        {
          role: 'user',
          content: `Fix this into valid JSON with fields campaignName, tone, themes, pacing, description:\n\n${cleaned}`,
        },
      ],
      temperature: 0,
      max_tokens: 350,
    });

    const repaired = repair.content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(repaired);
  }

  private generateLocalCampaignSuggestion(userHint?: string, recentNames?: string[]): {
    campaignName: string;
    tone: string;
    themes: string[];
    pacing: string;
    description: string;
  } {
    const suggestions = [
      {
        campaignName: 'The Shattered Crown',
        tone: 'heroic',
        themes: ['adventure', 'war', 'prophecy'],
        pacing: 'moderate',
        description: 'A legendary crown, shattered into five pieces and scattered across Golarion, holds the key to uniting the warring kingdoms. The heroes must recover the fragments before the Lich King reassembles them first.',
      },
      {
        campaignName: 'Whispers of the Deep',
        tone: 'horror',
        themes: ['exploration', 'ancient ruins', 'arcane'],
        pacing: 'slow',
        description: 'Strange whispers echo from the ruins of a sunken temple off the Arcadian coast. Fishfolk go missing. Dreams turn to nightmares. Something ancient stirs beneath the waves.',
      },
      {
        campaignName: 'The Iron Conspiracy',
        tone: 'political',
        themes: ['intrigue', 'heist', 'war'],
        pacing: 'moderate',
        description: 'A web of conspiracies threatens to tear apart the great city of Absalom. The heroes are drawn into a shadow war between rival factions, each hiding dangerous secrets.',
      },
      {
        campaignName: 'Vault of the Wyrm Lords',
        tone: 'dungeon-crawl',
        themes: ['dragons', 'ancient ruins', 'survival'],
        pacing: 'fast',
        description: 'Beneath the Mindspin Mountains lies a network of vaults built by ancient dragons. Legendary treasure awaits — but so do deadly traps, cunning guardians, and a dragon who never truly left.',
      },
      {
        campaignName: 'The Verdant Pact',
        tone: 'mystery',
        themes: ['nature', 'divine', 'intrigue'],
        pacing: 'slow',
        description: 'The forests are dying. Ancient druids have vanished. A mysterious pact made centuries ago is unraveling, and the heroes must uncover the truth before the natural world collapses.',
      },
      {
        campaignName: 'Crimson Tides',
        tone: 'gritty',
        themes: ['pirates', 'survival', 'exploration'],
        pacing: 'fast',
        description: 'Stranded on an uncharted archipelago after a devastating shipwreck, the heroes must navigate treacherous waters, hostile pirates, and ancient island secrets to find a way home.',
      },
      {
        campaignName: 'The Planar Convergence',
        tone: 'heroic',
        themes: ['planar', 'arcane', 'prophecy'],
        pacing: 'moderate',
        description: 'The boundaries between planes are weakening. Elemental storms ravage the land, fiendish portals open without warning, and only the heroes can reach the Nexus and restore the cosmic balance.',
      },
      {
        campaignName: 'Siege of the Undying',
        tone: 'gritty',
        themes: ['undead', 'war', 'survival'],
        pacing: 'fast',
        description: 'A relentless undead horde marches on the last free city. The heroes must rally defenders, uncover the necromancer\'s weakness, and hold the walls against impossible odds.',
      },
      {
        campaignName: 'The Gilded Masquerade',
        tone: 'political',
        themes: ['intrigue', 'heist', 'arcane'],
        pacing: 'moderate',
        description: 'Behind the masks of Oppara\'s grandest ball, assassins and spymasters play a deadly game. The heroes must infiltrate high society, expose a plot against the empress, and survive until dawn.',
      },
      {
        campaignName: 'Embers of the Forge God',
        tone: 'dungeon-crawl',
        themes: ['divine', 'ancient ruins', 'dragons'],
        pacing: 'fast',
        description: 'A dormant volcano rumbles to life, revealing the buried forge of a forgotten god. Heroes delve into a molten labyrinth of clockwork guardians, imprisoned elementals, and a weapon that could reshape the world.',
      },
      {
        campaignName: 'The Hollow Stars',
        tone: 'horror',
        themes: ['planar', 'arcane', 'survival'],
        pacing: 'slow',
        description: 'The stars are going out, one by one. As cosmic darkness spreads, reality frays at the edges. The heroes must journey to the edge of existence itself to learn why — and whether anything can be done.',
      },
      {
        campaignName: 'Song of the Shifting Sands',
        tone: 'mystery',
        themes: ['exploration', 'ancient ruins', 'prophecy'],
        pacing: 'moderate',
        description: 'A sandstorm reveals an ancient city that should not exist. Inside, music plays from nowhere, time flows strangely, and a long-dead civilization offers a bargain the heroes may not be able to refuse.',
      },
      {
        campaignName: 'The Last Caravan',
        tone: 'gritty',
        themes: ['survival', 'exploration', 'nature'],
        pacing: 'moderate',
        description: 'Hired to guard a merchant caravan through the Mwangi Expanse, the heroes find their journey beset by ancient curses, territorial beasts, and a rival expedition willing to kill for the same prize.',
      },
      {
        campaignName: 'Court of Thorns',
        tone: 'political',
        themes: ['nature', 'intrigue', 'divine'],
        pacing: 'slow',
        description: 'The fey courts are at war. Mortals are being drawn in as pawns, champions, and collateral. The heroes must navigate impossible bargains, shifting alliances, and rules that change with the seasons.',
      },
      {
        campaignName: 'Chains of the Architect',
        tone: 'heroic',
        themes: ['heist', 'arcane', 'adventure'],
        pacing: 'fast',
        description: 'A mad wizard has built a prison from which no one has ever escaped — and your ally is inside. The heroes must plan the greatest heist in Golarion\'s history, outsmarting traps that rewrite themselves.',
      },
      {
        campaignName: 'The Drowned Kingdom',
        tone: 'horror',
        themes: ['undead', 'exploration', 'ancient ruins'],
        pacing: 'moderate',
        description: 'Centuries ago, a kingdom sank beneath the sea in a single night. Now its ghosts have begun walking on land, seeking something they lost. The heroes must descend into the flooded ruins to end the haunting.',
      },
    ];

    // Filter out recently suggested campaigns
    let available = suggestions;
    if (recentNames && recentNames.length > 0) {
      const recentSet = new Set(recentNames.map(n => n.toLowerCase()));
      const filtered = suggestions.filter(s => !recentSet.has(s.campaignName.toLowerCase()));
      if (filtered.length > 0) available = filtered;
    }

    return available[Math.floor(Math.random() * available.length)];
  }

  // ─── Combat Event Narration ─────────────────────────────────

  // Track narration requests to detect and handle rapid-fire scenarios
  private _lastNarrationTime = 0;
  private _narrationCooldownMs = 3000; // Minimum 3s between narration requests

  /**
   * Generate a dramatic narrative for a combat log entry.
   * Uses AI when available, falls back to local templates.
   * Includes cooldown protection — if narrations are requested too rapidly,
   * it will skip AI and use local templates to avoid rate-limit errors.
   */
  async narrateCombatEvent(
    logEntry: GameLog,
    gameState: GameState,
    session: GMSession
  ): Promise<string> {
    // Only narrate action-type entries with meaningful content
    if (logEntry.type === 'system') return '';

    const now = Date.now();
    const elapsed = now - this._lastNarrationTime;

    // Try AI narration first (with cooldown check)
    if (this.providers.hasAny) {
      if (elapsed < this._narrationCooldownMs) {
        console.log(`⏭️ Narration cooldown: ${elapsed}ms since last (min ${this._narrationCooldownMs}ms). Using local template.`);
        return this.narrateCombatEventLocal(logEntry, gameState, session);
      }

      try {
        this._lastNarrationTime = now;
        return await this.narrateCombatEventAI(logEntry, gameState, session);
      } catch (error) {
        console.warn('AI combat narration failed, using local fallback:', error);
      }
    }

    // Local template fallback
    return this.narrateCombatEventLocal(logEntry, gameState, session);
  }

  private async narrateCombatEventAI(
    logEntry: GameLog,
    gameState: GameState,
    session: GMSession
  ): Promise<string> {
    const tone = session.campaignPreferences?.tone || 'heroic';
    const creatures = gameState.creatures || [];
    const players = creatures.filter(c => c.type === 'player').map(c => c.name).join(', ');
    const enemies = creatures.filter(c => c.type !== 'player' && !c.dead).map(c => c.name).join(', ');

    const systemPrompt = [
      `You are a ${tone} fantasy RPG Game Master narrating combat. Generate a vivid, dramatic 2-4 sentence narration for this combat event.`,
      `Tone: ${tone}. Be descriptive and immersive — describe the action, the environment, the emotions.`,
      `Party members: ${players || 'unknown'}`,
      `Enemies: ${enemies || 'none remaining'}`,
      `Do NOT include mechanical numbers, dice rolls, or HP values. Only narrative flavor.`,
      `Do NOT repeat the exact wording of the mechanical message.`,
      `Write as a narrator speaking in present tense. Respond with ONLY the narrative text, no quotes or labels.`,
      `CRITICAL: Always complete every sentence. Never stop mid-sentence or mid-word. End with a complete thought and proper punctuation.`,
    ].join('\n');

    const result = await this.providers.chatComplete({
      model: this.resolveModel(session),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Combat event: ${logEntry.message}` },
      ],
      max_tokens: session.narrationMaxTokens || 500,
      temperature: 0.85,
    });

    const raw = result?.content || '';
    console.log(`🎭 Narration raw (${raw.length} chars): "${raw}"`);
    // Check for null bytes or other control chars that might truncate
    const hasNullByte = raw.includes('\0');
    const hasControlChars = /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw);
    if (hasNullByte || hasControlChars) {
      console.warn(`🎭 WARNING: Narration contains control characters! nullByte=${hasNullByte}, controlChars=${hasControlChars}`);
    }
    return raw.trim();
  }

  private narrateCombatEventLocal(
    logEntry: GameLog,
    _gameState: GameState,
    _session: GMSession
  ): string {
    const msg = logEntry.message;

    // Critical hit narration
    if (msg.includes('CRITICAL HIT') || msg.includes('CRITICAL')) {
      const templates = [
        'A devastating blow lands with bone-shattering force!',
        'The strike finds a fatal opening, hitting with incredible precision!',
        'A masterful attack connects with devastating effect!',
        'Time seems to slow as the blow lands with unstoppable power!',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Critical fumble
    if (msg.includes('CRITICAL FAILURE') || msg.includes('fumble')) {
      const templates = [
        'A wild swing goes terribly wrong, leaving an embarrassing opening!',
        'The attack goes awry in the worst possible way!',
        'An overcommitted strike misses entirely, throwing off balance!',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Miss
    if (msg.includes('missed')) {
      const templates = [
        'The attack whistles harmlessly past its target.',
        'A near miss — the strike barely fails to connect.',
        'The blow is deflected away at the last moment.',
        'The target narrowly evades the incoming attack.',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Regular hit with damage
    if (msg.includes('hit') && msg.includes('damage')) {
      const templates = [
        'Steel meets flesh as the attack strikes true!',
        'A solid blow connects, drawing blood!',
        'The strike lands with a satisfying impact!',
        'The attack finds its mark with punishing force!',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Death/defeat
    if (msg.includes('falls') || msg.includes('defeated') || msg.includes('slain') || logEntry.type === 'death') {
      const templates = [
        'Another foe crumbles to the ground, vanquished!',
        'The light fades from their eyes as they collapse.',
        'With a final gasp, the combatant falls still.',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Movement
    if (msg.includes('moved') || msg.includes('steps') || msg.includes('stride')) {
      const templates = [
        'Boots scrape against stone as the combatant repositions.',
        'A tactical shift across the battlefield.',
        'Swift footwork carries them to a new position.',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Healing
    if (msg.includes('heal') || msg.includes('restored')) {
      const templates = [
        'Warm light flows through wounds as divine energy mends flesh.',
        'Restorative magic knits torn tissue back together.',
        'A surge of vitality washes over the injured combatant.',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Spellcasting
    if (msg.includes('cast') || msg.includes('spell')) {
      const templates = [
        'Arcane energy crackles as the incantation takes shape!',
        'Words of power echo across the battlefield!',
        'The air shimmers with magical energy!',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Condition applied
    if (logEntry.type === 'condition') {
      const templates = [
        'The effect takes hold, altering the flow of battle.',
        'A shift in the combatant\'s condition changes the dynamics.',
        'The battlefield conditions shift once more.',
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    // Generic fallback
    const fallbacks = [
      'The battle continues to rage.',
      'Combat unfolds across the battlefield.',
      'The clash of arms echoes through the air.',
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
