/**
 * Map catalog, Foundry map browsing, campaign tracking, and bestiary encounter routes.
 * Extended to support the Foundry VTT map integration system.
 */
import { Router, Request, Response } from 'express';
import { AppContext } from '../appContext';
import {
  ENCOUNTER_MAP_CATALOG, DIFFICULTIES,
  getMapsByTheme, getMapById, getMapThemes,
  buildEncounter, Difficulty,
} from '../routeHelpers';
import type { EncounterMapTemplate } from '../routeHelpers';
import {
  browseMapCatalog,
  selectMapForNarrative,
  recordMapUsage,
  getMapHistoryForAI,
  inferThemeFromChat,
} from '../services/mapSelectionService';
import {
  getTokenArtUrl,
  getPortraitArtUrl,
  getCreatureArtInfo,
  getArtStats,
  hasSpecificArt,
} from '../services/tokenArtService';
import {
  FOUNDRY_MAP_CATALOG,
  getFoundryMapById,
  getFoundryMapSources,
  getFoundryMapThemes,
  getFoundryMapTags,
} from 'pf2e-shared/foundryMapCatalog';
import {
  campaignMapTracker,
} from 'pf2e-shared/campaignMapTracker';
import type { MapTheme } from 'pf2e-shared';

export function createMapRoutes(_ctx: AppContext): Router {
  const router = Router();

  // ─── Encounter / Bestiary endpoint ─────────────────────────
  router.get('/api/bestiary/encounter', (req: Request, res: Response) => {
    try {
      const difficulty = (req.query.difficulty as Difficulty) || 'moderate';
      const partyLevel = parseInt(req.query.partyLevel as string) || 1;
      const partySize = parseInt(req.query.partySize as string) || 4;

      if (!DIFFICULTIES.includes(difficulty)) {
        res.status(400).json({ error: `Invalid difficulty. Must be one of: ${DIFFICULTIES.join(', ')}` });
        return;
      }

      const encounter = buildEncounter(difficulty, partyLevel, partySize);
      res.json(encounter);
    } catch (error) {
      console.error('Error building encounter:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Get all available maps (catalog overview) ─────────────
  router.get('/api/maps', (req: Request, res: Response) => {
    const theme = req.query.theme as EncounterMapTemplate['theme'] | undefined;
    const maps = theme ? getMapsByTheme(theme) : ENCOUNTER_MAP_CATALOG;
    res.json({
      maps: maps.map(m => ({
        id: m.id,
        name: m.name,
        theme: m.theme,
        description: m.description,
        gridWidth: m.width,
        gridHeight: m.height,
        imageUrl: m.imageUrl,
        tags: m.tags,
      })),
      themes: getMapThemes(),
    });
  });

  // ─── Get a specific map by ID ──────────────────────────────
  router.get('/api/maps/:mapId', (req: Request, res: Response) => {
    const map = getMapById(req.params.mapId);
    if (!map) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }
    res.json({ map });
  });

  // ═══ FOUNDRY MAP CATALOG ENDPOINTS ═════════════════════════

  // ─── Browse Foundry maps with filtering/pagination ─────────
  router.get('/api/foundry-maps', (req: Request, res: Response) => {
    try {
      const result = browseMapCatalog({
        theme: req.query.theme as MapTheme | undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        level: req.query.level ? parseInt(req.query.level as string) : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      });
      res.json({
        maps: result.maps.map(m => ({
          id: m.id,
          name: m.name,
          theme: m.theme,
          subTheme: m.subTheme,
          description: m.description,
          width: m.width,
          height: m.height,
          imageUrl: m.imageUrl,
          tags: m.tags,
          sourceModule: m.sourceModule,
          author: m.author,
          suggestedLevels: m.suggestedLevels,
          lightingMood: m.lightingMood,
          hasHazards: m.hasHazards,
          narrationContext: m.narrationContext,
          tacticalNotes: m.tacticalNotes,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        themes: result.themes,
        allTags: result.allTags,
      });
    } catch (error) {
      console.error('Error browsing Foundry maps:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Get a specific Foundry map with full data ─────────────
  router.get('/api/foundry-maps/:mapId', (req: Request, res: Response) => {
    const map = getFoundryMapById(req.params.mapId);
    if (!map) {
      res.status(404).json({ error: 'Foundry map not found' });
      return;
    }
    res.json({ map });
  });

  // ─── Get Foundry map source module info ────────────────────
  router.get('/api/foundry-maps-meta/sources', (_req: Request, res: Response) => {
    res.json({ sources: getFoundryMapSources() });
  });

  // ─── Get all Foundry map themes and tags ───────────────────
  router.get('/api/foundry-maps-meta/filters', (_req: Request, res: Response) => {
    res.json({
      themes: getFoundryMapThemes(),
      tags: getFoundryMapTags(),
      totalMaps: FOUNDRY_MAP_CATALOG.length,
    });
  });

  // ═══ AI MAP SELECTION ENDPOINTS ════════════════════════════

  // ─── AI-driven map selection for campaign mode ─────────────
  router.post('/api/maps/select', (req: Request, res: Response) => {
    try {
      const { narrativeContext, theme, partyLevel, campaignId, allowRevisit, preferTags } = req.body;
      const result = selectMapForNarrative({
        narrativeContext,
        theme,
        partyLevel,
        campaignId,
        allowRevisit,
        preferTags,
      });
      res.json({
        map: {
          id: result.map.id,
          name: result.map.name,
          theme: result.map.theme,
          subTheme: result.map.subTheme,
          description: result.map.description,
          width: result.map.width,
          height: result.map.height,
          imageUrl: result.map.imageUrl,
          narrationContext: result.map.narrationContext,
          tacticalNotes: result.map.tacticalNotes,
        },
        confidence: result.confidence,
        reason: result.reason,
        isRevisit: result.isRevisit,
        previousUsage: result.previousUsage,
      });
    } catch (error) {
      console.error('Error selecting map:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Infer theme from chat messages ────────────────────────
  router.post('/api/maps/infer-theme', (req: Request, res: Response) => {
    try {
      const { chatHistory } = req.body;
      if (!Array.isArray(chatHistory)) {
        res.status(400).json({ error: 'chatHistory must be an array of messages' });
        return;
      }
      const result = inferThemeFromChat(chatHistory);
      res.json(result);
    } catch (error) {
      console.error('Error inferring theme:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ═══ CAMPAIGN MAP TRACKING ENDPOINTS ═══════════════════════

  // ─── Record map usage in campaign ──────────────────────────
  router.post('/api/campaigns/:campaignId/map-usage', (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { mapId, locationName, gmNotes, revisitable, narrativeContext, encounterLevel, partyMembers } = req.body;

      if (!mapId) {
        res.status(400).json({ error: 'mapId is required' });
        return;
      }

      const map = getFoundryMapById(mapId);
      if (!map) {
        res.status(404).json({ error: `Map "${mapId}" not found in catalog` });
        return;
      }

      recordMapUsage(campaignId, map, {
        narrativeContext,
        locationName,
        gmNotes,
        revisitable: revisitable ?? true,
        encounterLevel,
        partyMembers,
      });

      res.json({ success: true, message: `Map "${map.name}" recorded for campaign ${campaignId}` });
    } catch (error) {
      console.error('Error recording map usage:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Get campaign map history ──────────────────────────────
  router.get('/api/campaigns/:campaignId/map-history', (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const history = campaignMapTracker.getHistory(campaignId);
    res.json({
      campaignId,
      usages: history,
      summary: getMapHistoryForAI(campaignId),
    });
  });

  // ─── Get revisitable locations in a campaign ───────────────
  router.get('/api/campaigns/:campaignId/revisitable-locations', (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const locations = campaignMapTracker.getRevisitableLocations(campaignId);
    res.json({
      campaignId,
      locations: locations.map(l => ({
        mapId: l.mapId,
        locationName: l.locationName,
        usedAt: l.usedAt,
        narrativeContext: l.narrativeContext,
        gmNotes: l.gmNotes,
      })),
    });
  });

  // ═══ TOKEN ART ENDPOINTS ═══════════════════════════════════

  // ─── Get token art URL for a creature ──────────────────────
  router.get('/api/art/token/:creatureName', (req: Request, res: Response) => {
    const { creatureName } = req.params;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : [];
    const url = getTokenArtUrl(decodeURIComponent(creatureName), tags);
    res.json({ creatureName: decodeURIComponent(creatureName), tokenUrl: url });
  });

  // ─── Get portrait art URL for a creature ───────────────────
  router.get('/api/art/portrait/:creatureName', (req: Request, res: Response) => {
    const { creatureName } = req.params;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : [];
    const url = getPortraitArtUrl(decodeURIComponent(creatureName), tags);
    res.json({ creatureName: decodeURIComponent(creatureName), portraitUrl: url });
  });

  // ─── Get full art info for a creature ──────────────────────
  router.get('/api/art/info/:creatureName', (req: Request, res: Response) => {
    const { creatureName } = req.params;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : [];
    const info = getCreatureArtInfo(decodeURIComponent(creatureName), tags);
    res.json(info);
  });

  // ─── Batch resolve art for multiple creatures ──────────────
  router.post('/api/art/batch', (req: Request, res: Response) => {
    const { creatures } = req.body;
    if (!Array.isArray(creatures)) {
      res.status(400).json({ error: 'creatures must be an array of { name, tags? }' });
      return;
    }

    const results = creatures.map((c: { name: string; tags?: string[] }) => ({
      name: c.name,
      ...getCreatureArtInfo(c.name, c.tags || []),
    }));
    res.json({ results });
  });

  // ─── Art coverage statistics ───────────────────────────────
  router.get('/api/art/stats', (_req: Request, res: Response) => {
    res.json(getArtStats());
  });

  return router;
}
