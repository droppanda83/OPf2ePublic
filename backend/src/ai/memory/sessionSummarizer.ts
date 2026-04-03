/**
 * Phase 7 — Session Summarizer.
 *
 * Auto-generates compressed session summaries from chat history and
 * game events. Also handles conversation compression when the chat
 * history approaches the context budget limit.
 *
 * Two capabilities:
 *   1. End-of-session summary generation (for SessionSummary)
 *   2. Mid-session chat compression (for CompressedHistory)
 */

import type { GMChatMessage, GMSession } from 'pf2e-shared';
import type { LLMService } from '../llm';
import type { InGameClock } from '../coordinator/types';
import type { SessionSummary, CompressedHistory, MemoryDependencies } from './types';

/** Approximate tokens per message (conservative estimate). */
const TOKENS_PER_MESSAGE = 40;

/** Compress when chat history exceeds this many messages. */
const COMPRESSION_THRESHOLD = 60;

/** Keep this many recent messages un-compressed. */
const KEEP_RECENT = 15;

const SUMMARY_SYSTEM_PROMPT = `You are a concise session summarizer for a PF2e solo campaign.
Given a sequence of GM chat messages, produce a JSON object with:
- "narrative": a 2-4 sentence summary of what happened
- "keyDecisions": array of 1-3 key player decisions (short strings)
- "npcsEncountered": array of NPC names mentioned
- "encounters": array of encounter/combat descriptions (1 sentence each)
- "plotAdvanced": array of plot thread titles that progressed
- "consequenceActivity": array of consequences created or triggered

Be concise. Capture only the most important information.
Respond with ONLY the JSON object, no markdown fences.`;

const COMPRESSION_SYSTEM_PROMPT = `You are a chat history compressor for a PF2e campaign.
Given old chat messages, produce a concise 3-5 sentence summary that preserves:
- Key story events and decisions
- NPC interactions and disposition changes
- Combat outcomes
- Plot thread progress

Respond with ONLY the summary text, no JSON, no markdown.`;

export class SessionSummarizer {
  private llmService: LLMService;

  constructor(deps: MemoryDependencies) {
    this.llmService = deps.llmService;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Session summary generation
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Generate a session summary from the current GM session state.
   * Called at the end of a play session (or when the player requests a save).
   */
  async generateSessionSummary(
    session: GMSession,
    sessionNumber: number,
    clock: InGameClock,
    xpAwarded: number,
  ): Promise<SessionSummary> {
    const messages = session.chatHistory;

    // Try LLM-powered summary
    try {
      return await this.generateWithLLM(messages, sessionNumber, clock, xpAwarded, session);
    } catch {
      // Fallback to extraction-based summary
      return this.generateFallback(messages, sessionNumber, clock, xpAwarded, session);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Conversation compression
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Check if chat history needs compression and compress if so.
   * Returns updated CompressedHistory, or null if no compression needed.
   */
  async compressIfNeeded(
    chatHistory: GMChatMessage[],
    existingCompression?: CompressedHistory,
  ): Promise<CompressedHistory | null> {
    if (chatHistory.length < COMPRESSION_THRESHOLD) return null;

    const toCompress = chatHistory.slice(0, chatHistory.length - KEEP_RECENT);
    const recent = chatHistory.slice(chatHistory.length - KEEP_RECENT);

    // Build text to compress (includes prior summary if any)
    const priorSummary = existingCompression?.summary || '';
    const messagesText = toCompress
      .map(m => `[${m.role}] ${m.content.slice(0, 150)}`)
      .join('\n');

    const compressInput = priorSummary
      ? `Previous summary:\n${priorSummary}\n\nNew messages to incorporate:\n${messagesText}`
      : messagesText;

    let summary: string;
    try {
      const response = await this.llmService.complete({
        role: 'general',
        messages: [
          { role: 'system', content: COMPRESSION_SYSTEM_PROMPT },
          { role: 'user', content: compressInput },
        ],
        maxTokens: 300,
        temperature: 0.3,
        timeoutMs: 8000,
      });
      summary = response.content.trim();
    } catch {
      // Fallback: take first sentence of last N messages
      summary = priorSummary
        ? priorSummary
        : toCompress
          .filter(m => m.role === 'gm')
          .slice(-5)
          .map(m => m.content.split('.')[0])
          .join('. ') + '.';
    }

    return {
      summary,
      compressedCount: (existingCompression?.compressedCount || 0) + toCompress.length,
      recentMessages: recent,
      lastCompressed: Date.now(),
    };
  }

  /**
   * Get an estimated token count for the current chat history.
   */
  estimateTokens(chatHistory: GMChatMessage[]): number {
    return chatHistory.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════

  private async generateWithLLM(
    messages: GMChatMessage[],
    sessionNumber: number,
    clock: InGameClock,
    xpAwarded: number,
    session: GMSession,
  ): Promise<SessionSummary> {
    // Collect only GM and player messages, truncate for token budget
    const relevant = messages
      .filter(m => m.role !== 'system')
      .slice(-40) // last 40 messages max
      .map(m => `[${m.role}] ${m.content.slice(0, 200)}`)
      .join('\n');

    const response = await this.llmService.complete({
      role: 'general',
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: relevant },
      ],
      maxTokens: 400,
      temperature: 0.3,
      timeoutMs: 10000,
    });

    const parsed = this.parseSummaryJSON(response.content);

    return {
      sessionNumber,
      narrative: parsed.narrative || 'Session events were not captured.',
      keyDecisions: parsed.keyDecisions || [],
      npcsEncountered: parsed.npcsEncountered || this.extractNPCNames(session),
      encounters: parsed.encounters || [],
      plotThreadsAdvanced: parsed.plotAdvanced || [],
      consequenceActivity: parsed.consequenceActivity || [],
      clockSnapshot: { ...clock },
      tensionSnapshot: session.tensionTracker.score,
      xpAwarded,
      timestamp: Date.now(),
    };
  }

  private generateFallback(
    messages: GMChatMessage[],
    sessionNumber: number,
    clock: InGameClock,
    xpAwarded: number,
    session: GMSession,
  ): SessionSummary {
    // Extract key info from messages directly
    const gmMessages = messages.filter(m => m.role === 'gm');
    const playerMessages = messages.filter(m => m.role === 'player');

    // Build a simple narrative from the last few GM messages
    const narrative = gmMessages
      .slice(-5)
      .map(m => m.content.split('.')[0])
      .filter(Boolean)
      .join('. ') + '.';

    // Extract decisions from player messages
    const keyDecisions = playerMessages
      .slice(-3)
      .map(m => m.content.slice(0, 80))
      .filter(d => d.length > 5);

    // Find encounter-related actions
    const encounters = messages
      .filter(m => m.mechanicalAction?.actionType === 'start-encounter')
      .map(m => `Encounter: ${m.mechanicalAction?.details?.title || 'Unknown'}`);

    return {
      sessionNumber,
      narrative: narrative || 'No significant events recorded.',
      keyDecisions,
      npcsEncountered: this.extractNPCNames(session),
      encounters,
      plotThreadsAdvanced: [],
      consequenceActivity: [],
      clockSnapshot: { ...clock },
      tensionSnapshot: session.tensionTracker.score,
      xpAwarded,
      timestamp: Date.now(),
    };
  }

  private parseSummaryJSON(raw: string): Record<string, any> {
    try {
      // Strip markdown fences if present
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { narrative: raw.slice(0, 300) };
    }
  }

  private extractNPCNames(session: GMSession): string[] {
    return session.recurringNPCs
      .filter(n => n.interactions.length > 0)
      .map(n => n.name);
  }
}
