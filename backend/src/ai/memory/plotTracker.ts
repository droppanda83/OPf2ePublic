/**
 * Phase 7 — Plot Tracker.
 *
 * Manages plot threads and the quest log. Implements the plot thread
 * state machine:
 *
 *   introduced → active → complication → climax → resolved
 *                  ↓                                  ↓
 *               abandoned                         (archived)
 *
 * Integrates with StoryAI's PlotUpdate outputs to advance threads
 * automatically.
 */

import type { PlotThread, PlotThreadStatus, PlotBranch, Quest, QuestStatus, QuestObjective } from './types';
import type { PlotUpdate } from '../roles/types';

/** Valid state transitions for plot threads. */
const VALID_TRANSITIONS: Record<PlotThreadStatus, PlotThreadStatus[]> = {
  'introduced': ['active', 'abandoned'],
  'active': ['complication', 'climax', 'resolved', 'abandoned'],
  'complication': ['active', 'climax', 'resolved', 'abandoned'],
  'climax': ['resolved', 'abandoned'],
  'resolved': [],
  'abandoned': ['active'], // can be revived
};

export class PlotTracker {
  private threads: Map<string, PlotThread> = new Map();
  private quests: Map<string, Quest> = new Map();
  private nextThreadId = 1;
  private nextQuestId = 1;

  constructor(initialThreads?: PlotThread[], initialQuests?: Quest[]) {
    if (initialThreads) {
      for (const t of initialThreads) {
        this.threads.set(t.id, { ...t });
        const numId = parseInt(t.id.replace('thread-', ''), 10);
        if (!isNaN(numId) && numId >= this.nextThreadId) this.nextThreadId = numId + 1;
      }
    }
    if (initialQuests) {
      for (const q of initialQuests) {
        this.quests.set(q.id, { ...q });
        const numId = parseInt(q.id.replace('quest-', ''), 10);
        if (!isNaN(numId) && numId >= this.nextQuestId) this.nextQuestId = numId + 1;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Plot thread queries
  // ═══════════════════════════════════════════════════════════════════════

  getAllThreads(): PlotThread[] {
    return Array.from(this.threads.values());
  }

  getActiveThreads(): PlotThread[] {
    return this.getAllThreads().filter(
      t => t.status !== 'resolved' && t.status !== 'abandoned',
    );
  }

  getThread(id: string): PlotThread | undefined {
    return this.threads.get(id);
  }

  getThreadByTitle(title: string): PlotThread | undefined {
    const lower = title.toLowerCase();
    for (const t of this.threads.values()) {
      if (t.title.toLowerCase().includes(lower)) return t;
    }
    return undefined;
  }

  /** Build a compact plot summary for AI context. */
  buildPlotSummary(): string {
    const active = this.getActiveThreads();
    if (active.length === 0) return 'No active plot threads.';

    const lines = active.map(t => {
      const milestonesDone = t.milestones.filter(m => m.completed).length;
      const milestonesTotal = t.milestones.length;
      return `• [${t.priority}] "${t.title}" (${t.status}): ${t.description.slice(0, 80)}` +
        (milestonesTotal > 0 ? ` [${milestonesDone}/${milestonesTotal} milestones]` : '');
    });

    return `Active plot threads:\n${lines.join('\n')}`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Plot thread mutations
  // ═══════════════════════════════════════════════════════════════════════

  /** Create a new plot thread. */
  createThread(
    title: string,
    description: string,
    options?: {
      priority?: PlotThread['priority'];
      involvedNPCs?: string[];
      locations?: string[];
      parentThread?: string;
    },
  ): PlotThread {
    const id = `thread-${this.nextThreadId++}`;
    const thread: PlotThread = {
      id,
      title,
      description,
      status: 'introduced',
      involvedNPCs: options?.involvedNPCs || [],
      locations: options?.locations || [],
      milestones: [],
      branches: [],
      introducedAt: Date.now(),
      lastUpdated: Date.now(),
      parentThread: options?.parentThread,
      priority: options?.priority || 'secondary',
    };
    this.threads.set(id, thread);
    return thread;
  }

  /** Advance a plot thread's status. Returns false if transition is invalid. */
  advanceThread(id: string, newStatus: PlotThreadStatus): boolean {
    const thread = this.threads.get(id);
    if (!thread) return false;

    const valid = VALID_TRANSITIONS[thread.status];
    if (!valid.includes(newStatus)) return false;

    thread.status = newStatus;
    thread.lastUpdated = Date.now();
    return true;
  }

  /** Complete a milestone within a thread. */
  completeMilestone(threadId: string, milestoneDescription: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    const milestone = thread.milestones.find(
      m => !m.completed && m.description.toLowerCase().includes(milestoneDescription.toLowerCase().slice(0, 20)),
    );
    if (!milestone) return false;

    milestone.completed = true;
    milestone.timestamp = Date.now();
    thread.lastUpdated = Date.now();

    // Auto-advance thread if all milestones complete
    const allDone = thread.milestones.every(m => m.completed);
    if (allDone && thread.milestones.length > 0) {
      if (thread.status === 'active') this.advanceThread(thread.id, 'climax');
    }

    return true;
  }

  /** Add a milestone to a thread. */
  addMilestone(threadId: string, description: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    thread.milestones.push({ description, completed: false });
    thread.lastUpdated = Date.now();
  }

  /** Add a branch to a thread. */
  addBranch(threadId: string, branch: Omit<PlotBranch, 'id' | 'taken'>): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;
    thread.branches.push({
      id: `branch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...branch,
      taken: false,
    });
    thread.lastUpdated = Date.now();
  }

  /** Take a branch (mark it as the chosen path). */
  takeBranch(threadId: string, branchId: string, outcome?: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    const branch = thread.branches.find(b => b.id === branchId);
    if (!branch) return false;
    branch.taken = true;
    if (outcome) branch.outcome = outcome;
    thread.lastUpdated = Date.now();
    return true;
  }

  /**
   * Process PlotUpdate outputs from StoryAI.
   * Attempts to match updates to existing threads or create new ones.
   */
  applyPlotUpdates(updates: PlotUpdate[]): void {
    for (const update of updates) {
      switch (update.type) {
        case 'quest-advance': {
          // Try to find and advance an existing thread
          const thread = this.findThreadByDescription(update.description);
          if (thread) {
            if (thread.status === 'introduced') this.advanceThread(thread.id, 'active');
            else if (thread.status === 'active') this.advanceThread(thread.id, 'complication');
          }
          break;
        }
        case 'milestone': {
          // Try to complete a milestone on any active thread
          for (const thread of this.getActiveThreads()) {
            if (this.completeMilestone(thread.id, update.description)) break;
          }
          break;
        }
        case 'new-hook': {
          // Create a new side thread
          this.createThread(
            update.description.slice(0, 60),
            update.description,
            { priority: 'side' },
          );
          break;
        }
        case 'npc-reaction':
        case 'consequence-trigger':
          // These are handled by other systems (NPCTracker, ConsequenceScheduler)
          break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Quest log queries
  // ═══════════════════════════════════════════════════════════════════════

  getAllQuests(): Quest[] {
    return Array.from(this.quests.values());
  }

  getActiveQuests(): Quest[] {
    return this.getAllQuests().filter(q => q.status === 'active');
  }

  getQuest(id: string): Quest | undefined {
    return this.quests.get(id);
  }

  /** Build a compact quest log for AI context. */
  buildQuestLog(): string {
    const active = this.getActiveQuests();
    if (active.length === 0) return 'No active quests.';

    const lines = active.map(q => {
      const done = q.objectives.filter(o => o.completed).length;
      const total = q.objectives.length;
      const deadline = q.deadlineDay ? ` (deadline: day ${q.deadlineDay})` : '';
      return `• "${q.title}": ${q.description.slice(0, 60)} [${done}/${total}]${deadline}`;
    });

    return `Active quests:\n${lines.join('\n')}`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Quest mutations
  // ═══════════════════════════════════════════════════════════════════════

  createQuest(
    title: string,
    description: string,
    options?: {
      source?: string;
      plotThreadId?: string;
      objectives?: Omit<QuestObjective, 'id'>[];
      xpReward?: number;
      rewards?: string[];
      deadlineDay?: number;
      introducedDay?: number;
    },
  ): Quest {
    const id = `quest-${this.nextQuestId++}`;
    const quest: Quest = {
      id,
      title,
      description,
      status: 'active',
      source: options?.source || 'AI GM',
      plotThreadId: options?.plotThreadId,
      objectives: (options?.objectives || []).map((o, i) => ({
        ...o,
        id: `obj-${id}-${i}`,
      })),
      xpReward: options?.xpReward,
      rewards: options?.rewards || [],
      introducedDay: options?.introducedDay || 1,
      deadlineDay: options?.deadlineDay,
    };
    this.quests.set(id, quest);
    return quest;
  }

  completeObjective(questId: string, objectiveId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    const obj = quest.objectives.find(o => o.id === objectiveId);
    if (!obj) return false;
    obj.completed = true;

    // Auto-complete quest if all required objectives done
    const requiredDone = quest.objectives
      .filter(o => o.required)
      .every(o => o.completed);
    if (requiredDone && quest.objectives.filter(o => o.required).length > 0) {
      quest.status = 'completed';
      quest.completedAt = Date.now();
    }

    return true;
  }

  setQuestStatus(questId: string, status: QuestStatus): void {
    const quest = this.quests.get(questId);
    if (quest) {
      quest.status = status;
      if (status === 'completed') quest.completedAt = Date.now();
    }
  }

  /** Check quests for deadline expiry. Returns expired quest ids. */
  checkDeadlines(currentDay: number): string[] {
    const expired: string[] = [];
    for (const quest of this.quests.values()) {
      if (
        quest.status === 'active' &&
        quest.deadlineDay &&
        currentDay > quest.deadlineDay
      ) {
        quest.status = 'expired';
        expired.push(quest.id);
      }
    }
    return expired;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Persistence
  // ═══════════════════════════════════════════════════════════════════════

  loadThreads(threads: PlotThread[]): void {
    this.threads.clear();
    for (const t of threads) {
      this.threads.set(t.id, { ...t });
    }
  }

  loadQuests(quests: Quest[]): void {
    this.quests.clear();
    for (const q of quests) {
      this.quests.set(q.id, { ...q });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════

  private findThreadByDescription(description: string): PlotThread | undefined {
    const lower = description.toLowerCase();
    const words = lower.split(/\s+/).filter(w => w.length > 3);

    let bestMatch: PlotThread | undefined;
    let bestScore = 0;

    for (const thread of this.getActiveThreads()) {
      const threadText = `${thread.title} ${thread.description}`.toLowerCase();
      const score = words.filter(w => threadText.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = thread;
      }
    }

    return bestScore >= 2 ? bestMatch : undefined;
  }
}
