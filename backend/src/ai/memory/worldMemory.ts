/**
 * Phase 7 — World Memory Service.
 *
 * The unified persistent memory layer that ties together all Phase 7
 * sub-systems into a single API. Handles:
 *
 *   - Session summary generation & storage
 *   - NPC relationship tracking
 *   - Plot thread & quest management
 *   - Character knowledge (Recall Knowledge)
 *   - Location & faction tracking
 *   - Conversation compression
 *   - Checkpoint save/load to JSON files
 *   - Memory retrieval for AI context injection
 *
 * Storage: JSON files in {savesDir}/memory/{campaignId}.json
 * Recovery: auto-checkpoints after every significant state change
 */

import * as fs from 'fs';
import * as path from 'path';

import type { GameState, GMSession, RecurringNPC } from 'pf2e-shared';
import type { InGameClock, ConsequenceEntry } from '../coordinator/types';
import type { PlotUpdate } from '../roles/types';
import type {
  MemoryDependencies,
  WorldSnapshot,
  SessionSummary,
  CompressedHistory,
  LocationMemory,
  FactionMemory,
  KnowledgeEntry,
} from './types';
import { DEFAULT_WORLD_SNAPSHOT, WORLD_SNAPSHOT_VERSION } from './types';

import { SessionSummarizer } from './sessionSummarizer';
import { NPCTracker } from './npcTracker';
import { PlotTracker } from './plotTracker';
import { CharacterKnowledgeTracker } from './characterKnowledge';

/** How often to auto-checkpoint (in ms). */
const CHECKPOINT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class WorldMemory {
  private deps: MemoryDependencies;
  private savesDir: string;

  // Sub-systems
  private summarizer: SessionSummarizer;
  private npcTracker: NPCTracker;
  private plotTracker: PlotTracker;
  private knowledgeTracker: CharacterKnowledgeTracker;

  // State
  private snapshot: WorldSnapshot;
  private locations: Map<string, LocationMemory> = new Map();
  private factions: Map<string, FactionMemory> = new Map();
  private dirty = false;
  private lastCheckpoint = 0;

  constructor(deps: MemoryDependencies, savesDir: string = 'saves') {
    this.deps = deps;
    this.savesDir = savesDir;

    this.summarizer = new SessionSummarizer(deps);
    this.npcTracker = new NPCTracker();
    this.plotTracker = new PlotTracker();
    this.knowledgeTracker = new CharacterKnowledgeTracker();

    this.snapshot = { ...DEFAULT_WORLD_SNAPSHOT, lastSaved: Date.now() };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Initialize world memory for a campaign. Loads existing snapshot
   * if available, otherwise creates a fresh one.
   */
  async initialize(campaignId: string): Promise<void> {
    this.snapshot.campaignId = campaignId;

    const loaded = this.loadFromDisk(campaignId);
    if (loaded) {
      this.snapshot = loaded;
      this.npcTracker.load(loaded.npcs);
      this.plotTracker.loadThreads(loaded.plotThreads);
      this.plotTracker.loadQuests(loaded.quests);
      this.knowledgeTracker.load(loaded.characterKnowledge);
      this.loadLocationsAndFactions(loaded);
      console.log(`🧠 [WorldMemory] Loaded snapshot for campaign "${campaignId}" (session ${loaded.currentSession})`);
    } else {
      console.log(`🧠 [WorldMemory] Fresh memory for campaign "${campaignId}"`);
    }

    this.lastCheckpoint = Date.now();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Sub-system accessors
  // ═══════════════════════════════════════════════════════════════════════

  get npcs(): NPCTracker { return this.npcTracker; }
  get plots(): PlotTracker { return this.plotTracker; }
  get knowledge(): CharacterKnowledgeTracker { return this.knowledgeTracker; }

  // ═══════════════════════════════════════════════════════════════════════
  // Session lifecycle
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * End the current session: generate summary, compress chat, increment
   * session counter, and save to disk.
   */
  async endSession(
    session: GMSession,
    clock: InGameClock,
    xpAwarded: number,
  ): Promise<SessionSummary> {
    // Generate session summary
    const summary = await this.summarizer.generateSessionSummary(
      session,
      this.snapshot.currentSession,
      clock,
      xpAwarded,
    );
    this.snapshot.sessionSummaries.push(summary);

    // Compress chat history
    const compressed = await this.summarizer.compressIfNeeded(
      session.chatHistory,
      this.snapshot.compressedHistory,
    );
    if (compressed) {
      this.snapshot.compressedHistory = compressed;
    }

    // Sync state from session
    this.syncFromSession(session, clock);

    // Increment session
    this.snapshot.currentSession++;
    this.dirty = true;

    // Save to disk
    this.saveToDisk();

    return summary;
  }

  /**
   * Mid-session checkpoint. Call periodically to protect against crashes.
   */
  checkpoint(session: GMSession, clock: InGameClock): void {
    const now = Date.now();
    if (now - this.lastCheckpoint < CHECKPOINT_INTERVAL && !this.dirty) return;

    this.syncFromSession(session, clock);
    this.saveToDisk();
    this.lastCheckpoint = now;
    this.dirty = false;
  }

  /**
   * Force a checkpoint regardless of timing.
   */
  forceCheckpoint(session: GMSession, clock: InGameClock): void {
    this.syncFromSession(session, clock);
    this.saveToDisk();
    this.lastCheckpoint = Date.now();
    this.dirty = false;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Memory retrieval for AI context
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Build a compressed memory context string for AI prompts.
   * Pulls the most relevant memories based on the current context.
   */
  buildMemoryContext(options?: {
    maxTokens?: number;
    includeNPCs?: string[];
    includePlots?: boolean;
    includeQuests?: boolean;
    includeKnowledge?: string[];
    includeHistory?: boolean;
  }): string {
    const parts: string[] = [];
    const maxTokens = options?.maxTokens || 500;

    // Session history summary (most recent summary)
    if (options?.includeHistory !== false && this.snapshot.sessionSummaries.length > 0) {
      const recent = this.snapshot.sessionSummaries[this.snapshot.sessionSummaries.length - 1];
      parts.push(`Last session: ${recent.narrative}`);
    }

    // Compressed chat summary
    if (this.snapshot.compressedHistory?.summary) {
      parts.push(`Prior events: ${this.snapshot.compressedHistory.summary.slice(0, 200)}`);
    }

    // NPC context
    if (options?.includeNPCs && options.includeNPCs.length > 0) {
      const npcContext = this.npcTracker.buildContextForScene(options.includeNPCs);
      if (npcContext) parts.push(npcContext);
    }

    // Plot threads
    if (options?.includePlots !== false) {
      const plotSummary = this.plotTracker.buildPlotSummary();
      if (plotSummary !== 'No active plot threads.') parts.push(plotSummary);
    }

    // Quest log
    if (options?.includeQuests !== false) {
      const questLog = this.plotTracker.buildQuestLog();
      if (questLog !== 'No active quests.') parts.push(questLog);
    }

    // Character knowledge
    if (options?.includeKnowledge && options.includeKnowledge.length > 0) {
      const knowledgeCtx = this.knowledgeTracker.buildKnowledgeContext(options.includeKnowledge);
      if (knowledgeCtx) parts.push(knowledgeCtx);
    }

    // Relationship summary (compact)
    const relationshipSummary = this.npcTracker.buildRelationshipSummary();
    if (relationshipSummary !== 'No known NPCs.') parts.push(relationshipSummary);

    // Truncate to token budget (rough estimate: 4 chars per token)
    let combined = parts.join('\n\n');
    const estimatedTokens = Math.ceil(combined.length / 4);
    if (estimatedTokens > maxTokens) {
      combined = combined.slice(0, maxTokens * 4);
    }

    return combined;
  }

  /**
   * Get the most recent session summaries (for recap display).
   */
  getRecentSummaries(count: number = 3): SessionSummary[] {
    return this.snapshot.sessionSummaries.slice(-count);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // State synchronization
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Apply StoryAI result side-effects to persistent memory.
   */
  applyStoryResult(result: {
    plotUpdates?: PlotUpdate[];
    npcDispositionChanges?: Record<string, number>;
    consequences?: { id: string; trigger: string; effect: string; timing: string }[];
  }): void {
    if (result.plotUpdates) {
      this.plotTracker.applyPlotUpdates(result.plotUpdates);
    }
    if (result.npcDispositionChanges) {
      this.npcTracker.applyDispositionChanges(result.npcDispositionChanges);
    }
    this.dirty = true;
  }

  /**
   * Record a Recall Knowledge check result.
   */
  recordKnowledge(entry: KnowledgeEntry): void {
    this.knowledgeTracker.recordKnowledge(entry);
    this.dirty = true;
  }

  /**
   * Register a player character for knowledge tracking.
   */
  registerCharacter(characterId: string, characterName: string): void {
    this.knowledgeTracker.registerCharacter(characterId, characterName);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Location & faction tracking
  // ═══════════════════════════════════════════════════════════════════════

  recordLocationVisit(id: string, name: string, description: string, day: number): void {
    const existing = this.locations.get(id);
    if (existing) {
      existing.lastVisitedDay = day;
      if (existing.status === 'unexplored') existing.status = 'visited';
    } else {
      this.locations.set(id, {
        id,
        name,
        description,
        status: 'visited',
        knownNPCs: [],
        events: [],
        firstVisitedDay: day,
        lastVisitedDay: day,
      });
    }
    this.dirty = true;
  }

  addLocationEvent(locationId: string, event: string): void {
    const loc = this.locations.get(locationId);
    if (loc) {
      loc.events.push(event);
      this.dirty = true;
    }
  }

  getLocation(id: string): LocationMemory | undefined {
    return this.locations.get(id);
  }

  getAllLocations(): LocationMemory[] {
    return Array.from(this.locations.values());
  }

  recordFaction(id: string, name: string, disposition: number = 0): void {
    if (!this.factions.has(id)) {
      this.factions.set(id, {
        id,
        name,
        disposition,
        knownMembers: [],
        events: [],
      });
      this.dirty = true;
    }
  }

  adjustFactionDisposition(id: string, delta: number, event?: string): void {
    const faction = this.factions.get(id);
    if (!faction) return;
    faction.disposition = Math.max(-100, Math.min(100, faction.disposition + delta));
    if (event) faction.events.push(event);
    this.dirty = true;
  }

  getAllFactions(): FactionMemory[] {
    return Array.from(this.factions.values());
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Conversation compression (delegate to summarizer)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Check and compress chat history if needed. Returns updated history
   * or null if no compression occurred.
   */
  async compressChatIfNeeded(
    chatHistory: import('pf2e-shared').GMChatMessage[],
  ): Promise<CompressedHistory | null> {
    const result = await this.summarizer.compressIfNeeded(
      chatHistory,
      this.snapshot.compressedHistory,
    );
    if (result) {
      this.snapshot.compressedHistory = result;
      this.dirty = true;
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Snapshot access
  // ═══════════════════════════════════════════════════════════════════════

  getSnapshot(): WorldSnapshot {
    return this.buildSnapshot();
  }

  getCurrentSession(): number {
    return this.snapshot.currentSession;
  }

  getCampaignId(): string {
    return this.snapshot.campaignId;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Private — persistence
  // ═══════════════════════════════════════════════════════════════════════

  private buildSnapshot(): WorldSnapshot {
    return {
      ...this.snapshot,
      npcs: this.npcTracker.getAll(),
      plotThreads: this.plotTracker.getAllThreads(),
      quests: this.plotTracker.getAllQuests(),
      characterKnowledge: this.knowledgeTracker.getAll(),
      locations: Array.from(this.locations.values()),
      factions: Array.from(this.factions.values()),
      lastSaved: Date.now(),
    };
  }

  private syncFromSession(session: GMSession, clock: InGameClock): void {
    // Sync NPCs bidirectionally
    this.npcTracker.syncFromSession(session.recurringNPCs);

    // Sync tension
    this.snapshot.tension = { ...session.tensionTracker };

    // Sync story arc
    this.snapshot.storyArc = session.storyArc ? { ...session.storyArc } : undefined;

    // Sync clock
    this.snapshot.clock = { ...clock };

    // Sync session notes
    this.snapshot.sessionNotes = [...session.sessionNotes];
  }

  private getMemoryDir(): string {
    return path.join(this.savesDir, 'memory');
  }

  private getFilePath(campaignId: string): string {
    // Sanitize campaign ID for filesystem safety
    const safe = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    return path.join(this.getMemoryDir(), `${safe}.json`);
  }

  private saveToDisk(): void {
    try {
      const dir = this.getMemoryDir();
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const snapshot = this.buildSnapshot();
      const filePath = this.getFilePath(this.snapshot.campaignId);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
      console.log(`🧠 [WorldMemory] Saved to ${filePath}`);
    } catch (err) {
      console.error('🧠 [WorldMemory] Save failed:', err);
    }
  }

  private loadFromDisk(campaignId: string): WorldSnapshot | null {
    try {
      const filePath = this.getFilePath(campaignId);
      if (!fs.existsSync(filePath)) return null;

      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as WorldSnapshot;

      // Version check
      if (data.version !== WORLD_SNAPSHOT_VERSION) {
        console.warn(`🧠 [WorldMemory] Snapshot version mismatch (${data.version} vs ${WORLD_SNAPSHOT_VERSION}), starting fresh`);
        return null;
      }

      return data;
    } catch (err) {
      console.error('🧠 [WorldMemory] Load failed:', err);
      return null;
    }
  }

  private loadLocationsAndFactions(snapshot: WorldSnapshot): void {
    this.locations.clear();
    for (const loc of snapshot.locations || []) {
      this.locations.set(loc.id, { ...loc });
    }
    this.factions.clear();
    for (const fac of snapshot.factions || []) {
      this.factions.set(fac.id, { ...fac });
    }
  }
}
