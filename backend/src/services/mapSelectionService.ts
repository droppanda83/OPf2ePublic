/**
 * Map Selection Service — Provides AI-powered map selection for campaigns
 * and player-driven selection for single encounter mode.
 *
 * In campaign mode: the AI GM picks a contextually appropriate map based on
 * narrative keywords, theme, and campaign history (avoiding repeats).
 *
 * In encounter mode: the player browses and picks a map.
 */

import {
  FOUNDRY_MAP_CATALOG,
  FoundryMapEntry,
  scoreFoundryMaps,
  getFoundryMapsByTheme,
  getFoundryMapsByLevel,
  getFoundryMapById,
} from 'pf2e-shared/foundryMapCatalog';
import {
  campaignMapTracker,
  CampaignMapUsage,
} from 'pf2e-shared/campaignMapTracker';
import type { EncounterMapTemplate, MapTheme } from 'pf2e-shared';

// ─── AI-Driven Map Selection (Campaign Mode) ─────────────────

export interface MapSelectionContext {
  /** Recent narrative / chat messages for context matching */
  narrativeContext?: string;
  /** Explicit theme request (from GM or AI) */
  theme?: MapTheme;
  /** Party level for difficulty matching */
  partyLevel?: number;
  /** Campaign ID to check history */
  campaignId?: string;
  /** Whether revisiting a previously used map is acceptable */
  allowRevisit?: boolean;
  /** Specific tags to prefer */
  preferTags?: string[];
}

export interface MapSelectionResult {
  /** The selected map */
  map: FoundryMapEntry;
  /** Confidence score (0-100) */
  confidence: number;
  /** Why this map was selected */
  reason: string;
  /** Whether this is a revisit of a known location */
  isRevisit: boolean;
  /** Previous usage data if revisiting */
  previousUsage?: CampaignMapUsage;
}

/**
 * AI GM map selection: picks the best map for the current narrative context.
 * Considers: narrative keywords, theme, party level, campaign history.
 */
export function selectMapForNarrative(ctx: MapSelectionContext): MapSelectionResult {
  const usedIds = ctx.campaignId
    ? campaignMapTracker.getUsedMapIds(ctx.campaignId)
    : [];
  const excludeIds = ctx.allowRevisit ? [] : usedIds;

  // Step 1: Check if narrative mentions a known location (revisit)
  if (ctx.campaignId && ctx.narrativeContext) {
    const revisitable = campaignMapTracker.getRevisitableLocations(ctx.campaignId);
    for (const usage of revisitable) {
      const locName = usage.locationName?.toLowerCase() || '';
      if (locName && ctx.narrativeContext.toLowerCase().includes(locName)) {
        const map = getFoundryMapById(usage.mapId);
        if (map) {
          return {
            map,
            confidence: 95,
            reason: `Revisiting known location: "${usage.locationName}"`,
            isRevisit: true,
            previousUsage: usage,
          };
        }
      }
    }
  }

  // Step 2: Score all maps against the narrative context
  const query = [
    ctx.narrativeContext || '',
    ctx.theme || '',
    ...(ctx.preferTags || []),
  ].join(' ');

  const scored = scoreFoundryMaps(query, {
    theme: ctx.theme,
    level: ctx.partyLevel,
    excludeIds,
  });

  if (scored.length > 0) {
    const best = scored[0];
    const confidence = Math.min(95, Math.max(10, best.score * 5));
    return {
      map: best.map,
      confidence,
      reason: `Best narrative match (score: ${best.score})${ctx.theme ? ` for theme "${ctx.theme}"` : ''}`,
      isRevisit: usedIds.includes(best.map.id),
    };
  }

  // Step 3: Fallback — pick by theme or random
  let pool: FoundryMapEntry[] = [];
  if (ctx.theme) pool = getFoundryMapsByTheme(ctx.theme);
  if (pool.length === 0 && ctx.partyLevel) pool = getFoundryMapsByLevel(ctx.partyLevel);
  if (pool.length === 0) pool = FOUNDRY_MAP_CATALOG;

  // Filter out used maps if possible
  const fresh = pool.filter(m => !excludeIds.includes(m.id));
  const finalPool = fresh.length > 0 ? fresh : pool;

  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
  return {
    map: chosen,
    confidence: 30,
    reason: 'Random selection (no strong narrative match)',
    isRevisit: usedIds.includes(chosen.id),
  };
}

/**
 * Record that a map was used in a campaign encounter.
 */
export function recordMapUsage(
  campaignId: string,
  map: FoundryMapEntry,
  options?: {
    narrativeContext?: string;
    locationName?: string;
    gmNotes?: string;
    revisitable?: boolean;
    encounterLevel?: number;
    partyMembers?: string[];
  }
): void {
  campaignMapTracker.recordUsage({
    mapId: map.id,
    campaignId,
    usedAt: new Date().toISOString(),
    narrativeContext: options?.narrativeContext,
    locationName: options?.locationName,
    gmNotes: options?.gmNotes,
    revisitable: options?.revisitable ?? true,
    encounterLevel: options?.encounterLevel,
    partyMembers: options?.partyMembers,
  });
}

/**
 * Get narrative summary of map history for AI GM context.
 */
export function getMapHistoryForAI(campaignId: string): string {
  return campaignMapTracker.getAiSummary(campaignId);
}

// ─── Chat-Based Theme Inference (adapted from routeHelpers) ──

interface ThemeInferenceResult {
  theme: MapTheme;
  subTheme?: string;
  confidence: number;
}

/**
 * Infer the best map theme from recent chat messages.
 * Adapted from the existing inferMapThemeFromChat() to work with
 * the Foundry map catalog's tag-based scoring.
 */
export function inferThemeFromChat(chatHistory: { content: string }[]): ThemeInferenceResult {
  if (!chatHistory || chatHistory.length === 0) {
    return { theme: 'dungeon', confidence: 10 };
  }

  const recentMessages = chatHistory
    .slice(-8)
    .map(m => (m.content || '').toLowerCase())
    .join(' ');

  const themeScores: Record<string, number> = {};

  const themeKeywords: Record<MapTheme, string[]> = {
    dungeon: ['dungeon', 'crypt', 'tomb', 'catacomb', 'labyrinth', 'vault', 'prison', 'cell', 'jail', 'underground', 'passage'],
    wilderness: ['forest', 'woods', 'mountain', 'river', 'desert', 'swamp', 'field', 'road', 'outdoor', 'camp', 'snow', 'clearing', 'cliff'],
    urban: ['city', 'town', 'street', 'market', 'dock', 'port', 'gate', 'alley', 'plaza', 'graveyard', 'arena'],
    indoor: ['tavern', 'inn', 'library', 'temple', 'manor', 'mansion', 'throne', 'hall', 'room', 'building', 'inside'],
    cave: ['cave', 'cavern', 'grotto', 'stalactite', 'underground lake', 'lair', 'den', 'crystal', 'mushroom'],
    ship: ['ship', 'boat', 'deck', 'pirate', 'naval', 'sailing', 'ocean', 'boarding'],
    tower: ['tower', 'wizard', 'spire', 'mage', 'arcane', 'circle', 'summoning'],
    bridge: ['bridge', 'crossing', 'river crossing', 'toll', 'span'],
    caravan: ['caravan', 'wagon', 'road', 'highway', 'ambush', 'bandit', 'merchant'],
    sewers: ['sewer', 'drain', 'pipe', 'waste', 'tunnel', 'rats', 'ooze'],
    castle: ['castle', 'keep', 'fortress', 'courtyard', 'rampart', 'battlement', 'siege'],
    mine: ['mine', 'mineshaft', 'dwarf', 'dig', 'ore', 'tunnel', 'cart', 'collapse'],
    special: ['arena', 'lava', 'volcanic', 'portal', 'dimension'],
  };

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (recentMessages.includes(keyword)) score += 2;
    }
    if (score > 0) themeScores[theme] = score;
  }

  let bestTheme: MapTheme = 'dungeon';
  let bestScore = 0;
  for (const [theme, score] of Object.entries(themeScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme as MapTheme;
    }
  }

  const confidence = Math.min(90, bestScore * 10);
  return { theme: bestTheme, confidence };
}

// ─── Player Map Selection (Encounter Mode) ────────────────────

export interface MapBrowseOptions {
  theme?: MapTheme;
  tags?: string[];
  level?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface MapBrowseResult {
  maps: FoundryMapEntry[];
  total: number;
  page: number;
  pageSize: number;
  themes: MapTheme[];
  allTags: string[];
}

/**
 * Browse the map catalog with filtering and pagination.
 * Used by the player in encounter mode.
 */
export function browseMapCatalog(options: MapBrowseOptions = {}): MapBrowseResult {
  let pool = [...FOUNDRY_MAP_CATALOG];

  // Filter by theme
  if (options.theme) {
    pool = pool.filter(m => m.theme === options.theme);
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    const tagSet = new Set(options.tags.map(t => t.toLowerCase()));
    pool = pool.filter(m =>
      (m.tags || []).some(t => tagSet.has(t.toLowerCase()))
    );
  }

  // Filter by level
  if (options.level) {
    pool = pool.filter(m =>
      !m.suggestedLevels ||
      (options.level! >= m.suggestedLevels.min && options.level! <= m.suggestedLevels.max)
    );
  }

  // Text search
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    pool = pool.filter(m =>
      m.name.toLowerCase().includes(searchLower) ||
      m.description.toLowerCase().includes(searchLower) ||
      (m.tags || []).some(t => t.toLowerCase().includes(searchLower))
    );
  }

  // Pagination
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, Math.min(50, options.pageSize || 12));
  const start = (page - 1) * pageSize;
  const paged = pool.slice(start, start + pageSize);

  // Collect all themes and tags for filter UI
  const themes: MapTheme[] = [...new Set(FOUNDRY_MAP_CATALOG.map(m => m.theme))];
  const allTags: string[] = [];
  const tagSet = new Set<string>();
  for (const m of FOUNDRY_MAP_CATALOG) {
    for (const t of (m.tags || [])) {
      if (!tagSet.has(t)) {
        tagSet.add(t);
        allTags.push(t);
      }
    }
  }

  return {
    maps: paged,
    total: pool.length,
    page,
    pageSize,
    themes,
    allTags: allTags.sort(),
  };
}
