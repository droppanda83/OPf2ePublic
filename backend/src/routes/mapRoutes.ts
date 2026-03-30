/**
 * Map catalog and bestiary encounter routes.
 * Extracted from index.ts during Audit Phase E.3.
 */
import { Router, Request, Response } from 'express';
import { AppContext } from '../appContext';
import {
  ENCOUNTER_MAP_CATALOG, DIFFICULTIES,
  getMapsByTheme, getMapById, getMapThemes,
  buildEncounter, Difficulty,
} from '../routeHelpers';
import type { EncounterMapTemplate } from '../routeHelpers';

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

  return router;
}
