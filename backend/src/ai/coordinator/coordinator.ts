/**
 * Phase 6 — AI GM Coordinator.
 *
 * The unified orchestrator that replaces the disparate GMChatbot + AIManager
 * entry-points with a single hub. The coordinator:
 *
 *   1. Accepts player messages → parses intent → routes to Phase 5 role services
 *   2. Subscribes to EventBus for combat narration + state tracking
 *   3. Manages gameplay-mode transitions (exploration ↔ encounter ↔ downtime …)
 *   4. Runs the consequence scheduler on every scene transition
 *   5. Advances the in-game clock
 *   6. Tracks tension and applies StoryAI updates (NPC dispositions, plot arcs)
 *
 * The existing GMChatbot and AIManager remain available as fallback paths.
 */

import type {
  GameState,
  GMSession,
  GMChatMessage,
  TensionTracker,
  RecurringNPC,
  ActionExecutedEvent,
  CombatStartedEvent,
  CombatEndedEvent,
  CreatureDyingEvent,
  CreatureDeadEvent,
  TurnStartedEvent,
  GameEvent,
} from 'pf2e-shared';

import type {
  CoordinatorDependencies,
  CoordinatorConfig,
  CoordinatorResponse,
  GameplayMode,
  ModeTransition,
  InGameClock,
  ConsequenceEntry,
  EventRoute,
} from './types';
import {
  DEFAULT_COORDINATOR_CONFIG,
  DEFAULT_EVENT_ROUTES,
} from './types';

import { NLParser } from './nlParser';
import { ConsequenceScheduler } from './consequenceScheduler';
import type { ConsequenceContext } from './consequenceScheduler';
import { GameClock } from './gameClock';

import type { NarrationRequest } from '../roles/types';
import type { TacticianResponse } from '../roles/types';

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export class AIGMCoordinator {
  private deps: CoordinatorDependencies;
  private config: CoordinatorConfig;
  private parser: NLParser;
  private consequences: ConsequenceScheduler;
  private clock: GameClock;
  private eventRoutes: EventRoute[];

  /** Narration queue: events that occurred since last player message. */
  private narrationQueue: string[] = [];

  /** Unsubscribe handles from EventBus. */
  private unsubscribers: (() => void)[] = [];

  /** Current gameplay mode (mirrors gmSession.currentPhase). */
  private currentMode: GameplayMode = 'exploration';

  /** Rate-limit: timestamp of last AI call. */
  private lastCallTs = 0;

  constructor(deps: CoordinatorDependencies, config?: Partial<CoordinatorConfig>) {
    this.deps = deps;
    this.config = { ...DEFAULT_COORDINATOR_CONFIG, ...config };
    this.parser = new NLParser();
    this.consequences = new ConsequenceScheduler();
    this.clock = new GameClock();
    this.eventRoutes = [...DEFAULT_EVENT_ROUTES];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════

  /** Subscribe to EventBus. Call once during server startup. */
  start(): void {
    // Combat narration via EventBus
    this.unsubscribers.push(
      this.deps.eventBus.on('action:executed', (e) => this.onActionExecuted(e)),
    );
    this.unsubscribers.push(
      this.deps.eventBus.on('combat:started', (e) => this.onCombatStarted(e)),
    );
    this.unsubscribers.push(
      this.deps.eventBus.on('combat:ended', (e) => this.onCombatEnded(e)),
    );
    this.unsubscribers.push(
      this.deps.eventBus.on('creature:dying', (e) => this.onCreatureDying(e)),
    );
    this.unsubscribers.push(
      this.deps.eventBus.on('creature:dead', (e) => this.onCreatureDead(e)),
    );
    this.unsubscribers.push(
      this.deps.eventBus.on('turn:started', (e) => this.onTurnStarted(e)),
    );
  }

  /** Unsubscribe from all events. */
  stop(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Public API — replaces GMChatbot.processMessage()
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Main entry point for player messages. The route layer calls this
   * instead of GMChatbot.processMessage().
   *
   * Returns a unified CoordinatorResponse that the route can directly
   * serialize.
   */
  async processPlayerMessage(
    message: string,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    // Sync internal mode with session
    this.syncMode(session);

    // 1. Parse player intent
    const intent = this.parser.parse(message, this.currentMode);

    // 2. Advance clock
    this.clock.advanceScene(this.currentMode);

    // 3. Evaluate pending consequences
    const consequenceCtx = this.buildConsequenceContext(message, gameState, session);
    const triggered = this.consequences.evaluate(consequenceCtx);

    // 4. Route to appropriate role service(s)
    const modeTransitions: ModeTransition[] = [];
    let response: CoordinatorResponse;

    switch (intent.type) {
      // ── Exploration intents ───────────────────────────────────────
      case 'explore':
      case 'investigate':
        response = await this.handleExploration(intent.type === 'investigate' ? 'investigate' : 'enter-area', intent.detail || intent.target, gameState, session);
        break;

      // ── Social intents ────────────────────────────────────────────
      case 'social':
        response = await this.handleSocial(message, gameState, session);
        break;

      // ── Downtime / rest ───────────────────────────────────────────
      case 'rest':
        response = await this.handleDowntime('rest', intent.detail, gameState, session);
        break;
      case 'shop':
        response = await this.handleDowntime('shop', intent.detail, gameState, session);
        break;
      case 'craft':
        response = await this.handleDowntime('craft', intent.detail, gameState, session);
        break;

      // ── Travel ────────────────────────────────────────────────────
      case 'travel':
        response = await this.handleTravel(intent.target, gameState, session);
        break;

      // ── Encounter management ──────────────────────────────────────
      case 'start-encounter':
        response = await this.handleStartEncounter(gameState, session);
        break;
      case 'end-encounter':
        response = await this.handleEndEncounter(gameState, session);
        break;

      // ── Combat actions (forwarded to route layer as mechanical actions) ──
      case 'attack':
      case 'move':
      case 'cast-spell':
      case 'use-skill':
      case 'interact':
        response = await this.handleCombatIntent(intent, gameState, session);
        break;

      // ── Recall knowledge ─────────────────────────────────────────
      case 'recall-knowledge':
        response = await this.handleRecallKnowledge(intent.target, gameState, session);
        break;

      // ── Meta / out-of-character ──────────────────────────────────
      case 'meta':
        response = await this.handleMeta(message, gameState, session);
        break;

      // ── Free-form / fallback → StoryAI ───────────────────────────
      case 'free-form':
      default:
        response = await this.handleFreeForm(message, gameState, session);
        break;
    }

    // 5. Attach triggered consequences
    response.triggeredConsequences = triggered;

    // If consequences triggered, append their effects to the GM narrative
    if (triggered.length > 0) {
      const effects = triggered.map(c => c.effect).join(' ');
      response.gmMessage.content += `\n\n*${effects}*`;
    }

    // 6. Attach mode transitions
    response.modeTransitions = modeTransitions;

    // 7. Attach clock
    response.clock = this.clock.getState();

    // 8. Drain narration queue (combat narrations accumulated between calls)
    if (this.narrationQueue.length > 0) {
      response.narration = this.narrationQueue.join('\n\n');
      this.narrationQueue = [];
    }

    return response;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Public API — replaces AIManager.decideTurn()
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Decide and return tactical actions for the current NPC's turn.
   * Called by the route layer instead of AIManager.decideTurn().
   */
  async handleAITurn(
    gameId: string,
    gameState: GameState,
  ): Promise<TacticianResponse> {
    const currentCreatureId = gameState.turnOrder?.[gameState.currentTurnIndex];
    if (!currentCreatureId) {
      return { actions: [], usedLLM: false, reasoning: 'No creature in turn order' };
    }

    const creature = gameState.creatures.find(c => c.id === currentCreatureId);
    const personality = creature?.aiPersonality || undefined;

    return this.deps.tacticianAI.decideTurn({
      gameState,
      creatureId: currentCreatureId,
      personality,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Public API — state management
  // ═══════════════════════════════════════════════════════════════════════

  getConfig(): CoordinatorConfig { return { ...this.config }; }
  setConfig(partial: Partial<CoordinatorConfig>): void { Object.assign(this.config, partial); }

  getClock(): InGameClock { return this.clock.getState(); }
  loadClock(saved: InGameClock): void { this.clock.load(saved); }

  getConsequences(): ConsequenceEntry[] { return this.consequences.getAll(); }
  loadConsequences(entries: ConsequenceEntry[], sceneCount: number): void {
    this.consequences.loadLedger(entries);
    this.consequences.setSceneCount(sceneCount);
  }
  cancelConsequence(id: string): boolean { return this.consequences.cancel(id); }

  getCurrentMode(): GameplayMode { return this.currentMode; }

  // ═══════════════════════════════════════════════════════════════════════
  // Intent handlers — each invokes the relevant Phase 5 role service
  // ═══════════════════════════════════════════════════════════════════════

  private async handleExploration(
    action: 'enter-area' | 'investigate',
    detail: string | undefined,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    this.transitionMode('exploration', session);

    const result = await this.deps.explorationAI.explore({
      gameState,
      action,
      detail,
    });

    return this.buildResponse(result.description, session, {
      tensionDelta: result.hiddenElements.length > 0 ? 5 : 0,
    });
  }

  private async handleSocial(
    message: string,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    this.transitionMode('social', session);

    const result = await this.deps.storyAI.processMessage({
      gameState,
      playerMessage: message,
      session,
    });

    // Apply StoryAI side-effects
    this.applyStoryEffects(result, session);

    return this.buildResponse(result.dialogue, session, {
      tensionDelta: result.tensionDelta,
      plotUpdates: result.plotUpdates,
      consequences: result.consequences,
    });
  }

  private async handleDowntime(
    activity: 'rest' | 'shop' | 'craft',
    detail: string | undefined,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    this.transitionMode('downtime', session);

    // If resting, advance clock for long rest
    if (activity === 'rest') {
      const newDay = this.clock.longRest();
      if (newDay) {
        this.clock.completeDailyPrep();
      }
    }

    const result = await this.deps.downtimeAI.resolveActivity({
      gameState,
      activity,
      detail,
    });

    const content = result.mechanicalResult
      ? `${result.narration}\n\n**${result.mechanicalResult}**`
      : result.narration;

    const response = this.buildResponse(content, session);

    // Attach shop inventory as mechanical action if present
    if (result.shopInventory && result.shopInventory.length > 0) {
      response.mechanicalActions.push({
        actionType: 'narrate',
        details: { shopInventory: result.shopInventory },
        success: true,
      });
    }

    return response;
  }

  private async handleTravel(
    destination: string | undefined,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    this.transitionMode('travel', session);

    const result = await this.deps.explorationAI.explore({
      gameState,
      action: 'travel',
      detail: destination,
    });

    // Travel costs more time
    this.clock.advanceHours(3);

    return this.buildResponse(result.description, session, {
      tensionDelta: result.hiddenElements.length > 0 ? 3 : -2,
    });
  }

  private async handleStartEncounter(
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    const partyLevels = gameState.creatures
      .filter(c => c.type === 'player')
      .map(c => c.level);

    if (partyLevels.length === 0) {
      return this.buildResponse(
        'There are no player characters to start an encounter with.',
        session,
      );
    }

    // Use tension to influence difficulty
    const tensionDifficulty = this.tensionToDifficulty(session.tensionTracker.score);

    const design = await this.deps.encounterAI.designEncounter({
      partyLevels,
      difficulty: tensionDifficulty,
      storyContext: this.buildStoryContext(session),
      tensionScore: session.tensionTracker.score,
      mapTheme: session.campaignPreferences.mapTheme,
    });

    this.transitionMode('encounter', session);

    const response = this.buildResponse(design.openingNarration, session, {
      tensionDelta: 15,
    });

    // Emit mechanical action for the route to create the encounter
    response.mechanicalActions.push({
      actionType: 'start-encounter',
      details: {
        title: design.title,
        creatures: design.creatures,
        hazards: design.hazards,
        xpBudget: design.xpBudget,
        objectives: design.objectives,
        terrain: design.terrain,
      },
      success: true,
    });

    return response;
  }

  private async handleEndEncounter(
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    this.transitionMode('exploration', session);

    const response = this.buildResponse(
      'The encounter concludes. You take a moment to catch your breath.',
      session,
      { tensionDelta: -10 },
    );

    response.mechanicalActions.push({
      actionType: 'end-encounter',
      details: {},
      success: true,
    });

    return response;
  }

  private async handleCombatIntent(
    intent: { type: string; target?: string; detail?: string; raw: string },
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    // In encounter mode, translate NL to a mechanical action hint
    if (this.currentMode === 'encounter') {
      return this.buildResponse(
        `*${intent.raw}* — Use the action bar to execute combat actions, or let the AI handle your turn.`,
        session,
      );
    }

    // Outside encounter, treat combat intent as story / exploration
    return this.handleFreeForm(intent.raw, gameState, session);
  }

  private async handleRecallKnowledge(
    topic: string | undefined,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    if (!topic) {
      return this.buildResponse(
        'What would you like to recall knowledge about?',
        session,
      );
    }

    // Query the knowledge base directly
    const results = this.deps.knowledgeBase.query(topic, 3);
    if (results.length === 0) {
      return this.buildResponse(
        `You wrack your brain but can't recall anything specific about "${topic}".`,
        session,
      );
    }

    const snippets = results.map(r => r.content.slice(0, 300)).join('\n\n');
    const narration = `You recall the following about **${topic}**:\n\n${snippets}`;

    return this.buildResponse(narration, session);
  }

  private async handleMeta(
    message: string,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    const lower = message.toLowerCase();

    if (lower.includes('recap') || lower.includes('summary') || lower.includes('what happened')) {
      return this.buildRecap(session);
    }

    if (lower.includes('status') || lower.includes('party')) {
      return this.buildPartyStatus(gameState, session);
    }

    // Generic help
    const helpText = [
      '**Available commands:**',
      '• *explore / investigate* — Explore your surroundings',
      '• *talk to [NPC]* — Engage in social interaction',
      '• *rest* — Take a long rest',
      '• *shop / craft* — Downtime activities',
      '• *travel to [location]* — Journey to a new area',
      '• *recall knowledge about [topic]* — Check your memory',
      '• *start encounter* — Begin combat',
      `• *recap* — Get a story summary`,
      `\n**Current time:** ${this.clock.describeTime()}`,
      `**Mode:** ${this.currentMode}`,
      `**Tension:** ${session.tensionTracker.score}/100 (${session.tensionTracker.trend})`,
    ].join('\n');

    return this.buildResponse(helpText, session);
  }

  private async handleFreeForm(
    message: string,
    gameState: GameState,
    session: GMSession,
  ): Promise<CoordinatorResponse> {
    // Route free-form text to StoryAI
    const result = await this.deps.storyAI.processMessage({
      gameState,
      playerMessage: message,
      session,
    });

    this.applyStoryEffects(result, session);

    return this.buildResponse(result.dialogue, session, {
      tensionDelta: result.tensionDelta,
      plotUpdates: result.plotUpdates,
      consequences: result.consequences,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EventBus handlers (fire-and-forget narration + state tracking)
  // ═══════════════════════════════════════════════════════════════════════

  private async onActionExecuted(event: ActionExecutedEvent): Promise<void> {
    if (!this.config.combatNarration) return;

    try {
      const gameState = this.deps.gameEngine.getGameState(event.gameId);
      if (!gameState?.gmSession?.combatNarrationEnabled) return;

      const result = await this.deps.narratorAI.narrate({
        gameState,
        eventType: 'action:executed',
        mechanicalSummary: `${event.actorName} used ${event.actionId}${event.targetName ? ` on ${event.targetName}` : ''}: ${event.result?.message || ''}`,
      });

      if (!result.isFallback || result.narration) {
        this.pushNarration(result.narration, gameState.gmSession!);
      }
    } catch {
      // Non-blocking — narration failure never breaks the game
    }
  }

  private onCombatStarted(_event: CombatStartedEvent): void {
    this.currentMode = 'encounter';
  }

  private onCombatEnded(_event: CombatEndedEvent): void {
    this.currentMode = 'exploration';
  }

  private async onCreatureDying(event: CreatureDyingEvent): Promise<void> {
    if (!this.config.combatNarration) return;

    try {
      const gameState = this.deps.gameEngine.getGameState(event.gameId);
      if (!gameState?.gmSession?.combatNarrationEnabled) return;

      const result = await this.deps.narratorAI.narrate({
        gameState,
        eventType: 'creature:dying',
        mechanicalSummary: `${event.creatureName} is dying! (value: ${event.dyingValue})`,
      });

      this.pushNarration(result.narration, gameState.gmSession!);
    } catch { /* non-blocking */ }
  }

  private async onCreatureDead(event: CreatureDeadEvent): Promise<void> {
    if (!this.config.combatNarration) return;

    try {
      const gameState = this.deps.gameEngine.getGameState(event.gameId);
      if (!gameState?.gmSession?.combatNarrationEnabled) return;

      const result = await this.deps.narratorAI.narrate({
        gameState,
        eventType: 'creature:dead',
        mechanicalSummary: `${event.creatureName} has fallen!`,
      });

      this.pushNarration(result.narration, gameState.gmSession!);
    } catch { /* non-blocking */ }
  }

  private onTurnStarted(_event: TurnStartedEvent): void {
    // Track turn starts for pacing — could trigger consequences
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Internal helpers
  // ═══════════════════════════════════════════════════════════════════════

  /** Push narration into both the queue and the session chat history. */
  private pushNarration(text: string, session: GMSession): void {
    this.narrationQueue.push(text);
    session.chatHistory.push({
      id: `narration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'gm',
      content: text,
      timestamp: Date.now(),
    });
  }

  /** Sync internal mode with the session's currentPhase. */
  private syncMode(session: GMSession): void {
    const phaseMap: Record<string, GameplayMode> = {
      exploration: 'exploration',
      combat: 'encounter',
      social: 'social',
      rest: 'downtime',
      travel: 'travel',
    };
    this.currentMode = phaseMap[session.currentPhase] || 'exploration';
  }

  /** Transition to a new gameplay mode and update the session. */
  private transitionMode(to: GameplayMode, session: GMSession): void {
    if (this.currentMode === to) return;
    const phaseMap: Record<GameplayMode, GMSession['currentPhase']> = {
      exploration: 'exploration',
      encounter: 'combat',
      social: 'social',
      downtime: 'rest',
      travel: 'travel',
    };
    this.currentMode = to;
    session.currentPhase = phaseMap[to];
  }

  /** Apply StoryAI side-effects to the session. */
  private applyStoryEffects(
    result: {
      tensionDelta?: number;
      consequences?: { id: string; trigger: string; effect: string; timing: string }[];
      npcDispositionChanges?: Record<string, number>;
      plotUpdates?: { type: string; description: string }[];
    },
    session: GMSession,
  ): void {
    // Tension
    if (result.tensionDelta) {
      this.adjustTension(session, result.tensionDelta, 'Story interaction');
    }

    // Consequences
    if (result.consequences && result.consequences.length > 0) {
      this.consequences.add(result.consequences);
    }

    // NPC disposition changes
    if (result.npcDispositionChanges) {
      for (const [npcName, delta] of Object.entries(result.npcDispositionChanges)) {
        const npc = session.recurringNPCs.find(
          n => n.name.toLowerCase() === npcName.toLowerCase(),
        );
        if (npc) {
          npc.disposition = Math.max(-100, Math.min(100, npc.disposition + delta));
        }
      }
    }

    // Milestone completion from plot updates
    if (result.plotUpdates && session.storyArc) {
      for (const update of result.plotUpdates) {
        if (update.type === 'milestone') {
          const milestone = session.storyArc.milestones.find(
            m => !m.completed && m.description.toLowerCase().includes(update.description.toLowerCase().slice(0, 20)),
          );
          if (milestone) {
            milestone.completed = true;
            milestone.timestamp = Date.now();
          }
        }
      }
    }
  }

  /** Adjust tension score and update trend. */
  private adjustTension(session: GMSession, delta: number, reason: string): void {
    const tracker = session.tensionTracker;
    const oldScore = tracker.score;
    tracker.score = Math.max(0, Math.min(100, tracker.score + delta));

    if (tracker.score > oldScore) tracker.trend = 'rising';
    else if (tracker.score < oldScore) tracker.trend = 'falling';
    else tracker.trend = 'stable';

    tracker.lastUpdated = Date.now();
    tracker.history.push({
      score: tracker.score,
      reason,
      timestamp: Date.now(),
    });

    // Keep history bounded
    if (tracker.history.length > 50) {
      tracker.history = tracker.history.slice(-50);
    }
  }

  /** Map tension score to encounter difficulty. */
  private tensionToDifficulty(
    score: number,
  ): 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme' {
    if (score < 20) return 'low';
    if (score < 40) return 'moderate';
    if (score < 60) return 'moderate';
    if (score < 80) return 'severe';
    return 'extreme';
  }

  /** Build a short story context string for encounter design. */
  private buildStoryContext(session: GMSession): string {
    const parts: string[] = [];
    if (session.storyArc) {
      parts.push(`Story phase: ${session.storyArc.storyPhase}`);
      if (session.storyArc.bbegName) parts.push(`BBEG: ${session.storyArc.bbegName}`);
    }
    if (session.campaignPreferences.tone) {
      parts.push(`Tone: ${session.campaignPreferences.tone}`);
    }
    parts.push(`Tension: ${session.tensionTracker.score}/100`);
    return parts.join('. ') || 'Standard adventure';
  }

  /** Build consequence evaluation context. */
  private buildConsequenceContext(
    message: string,
    gameState: GameState,
    session: GMSession,
  ): ConsequenceContext {
    const npcsInScene = gameState.creatures
      .filter(c => c.type === 'npc' || c.type === 'companion')
      .map(c => c.name);

    return {
      currentMode: this.currentMode,
      recentPlayerMessage: message,
      npcsInScene,
      tensionScore: session.tensionTracker.score,
    };
  }

  /** Build a recap from session notes + recent chat. */
  private buildRecap(session: GMSession): CoordinatorResponse {
    const parts: string[] = ['**Session Recap:**\n'];

    if (session.storyArc) {
      parts.push(`**Story:** ${session.storyArc.storyPhase} — BBEG: ${session.storyArc.bbegName || 'Unknown'}`);
    }

    if (session.sessionNotes.length > 0) {
      const latest = session.sessionNotes[session.sessionNotes.length - 1];
      parts.push(`**Last session:** ${latest.summary}`);
      if (latest.keyDecisions.length > 0) {
        parts.push(`**Key decisions:** ${latest.keyDecisions.join(', ')}`);
      }
    }

    parts.push(`\n**Encounters completed:** ${session.encounterCount}`);
    parts.push(`**XP awarded:** ${session.xpAwarded}`);
    parts.push(`**Tension:** ${session.tensionTracker.score}/100 (${session.tensionTracker.trend})`);
    parts.push(`**Time:** ${this.clock.describeTime()}`);

    const pendingConsequences = this.consequences.getPending();
    if (pendingConsequences.length > 0) {
      parts.push(`\n**Pending events:** ${pendingConsequences.length} consequence(s) awaiting trigger`);
    }

    return this.buildResponse(parts.join('\n'), session);
  }

  /** Build party status summary. */
  private buildPartyStatus(gameState: GameState, session: GMSession): CoordinatorResponse {
    const players = gameState.creatures.filter(c => c.type === 'player');
    if (players.length === 0) {
      return this.buildResponse('No player characters found.', session);
    }

    const lines = players.map(p => {
      const hp = `${p.currentHitPoints}/${p.maxHitPoints} HP`;
      const conditions = (p.conditions || []).map(c => c.name).join(', ') || 'none';
      return `• **${p.name}** (Level ${p.level}) — ${hp}, Conditions: ${conditions}`;
    });

    const content = `**Party Status:**\n${lines.join('\n')}\n\n**Time:** ${this.clock.describeTime()}`;
    return this.buildResponse(content, session);
  }

  /**
   * Build a CoordinatorResponse with standard scaffolding.
   */
  private buildResponse(
    content: string,
    session: GMSession,
    effects?: {
      tensionDelta?: number;
      plotUpdates?: { type: string; description: string }[];
      consequences?: { id: string; trigger: string; effect: string; timing: string }[];
    },
  ): CoordinatorResponse {
    // Apply tension delta
    if (effects?.tensionDelta) {
      this.adjustTension(session, effects.tensionDelta, 'Scene effect');
    }

    // Ingest consequences
    if (effects?.consequences) {
      this.consequences.add(effects.consequences);
    }

    const gmMessage: GMChatMessage = {
      id: `gm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'gm',
      content,
      timestamp: Date.now(),
    };

    return {
      gmMessage,
      mechanicalActions: [],
      sessionUpdates: {
        tensionTracker: { ...session.tensionTracker },
        currentPhase: session.currentPhase,
      },
      modeTransitions: [],
      triggeredConsequences: [],
    };
  }
}
