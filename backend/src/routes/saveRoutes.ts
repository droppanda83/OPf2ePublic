/**
 * Save / Load / Delete persistence routes.
 * Extracted from index.ts during Audit Phase E.3.
 */
import { Router, Request, Response } from 'express';
import { AppContext } from '../appContext';

export function createSaveRoutes(ctx: AppContext): Router {
  const router = Router();

  // List all saves
  router.get('/api/game/saves', (req: Request, res: Response) => {
    try {
      const saves = ctx.persistenceManager.listSaves();
      res.json({ saves });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Load a save
  router.post('/api/game/load/:saveId', (req: Request, res: Response) => {
    const { saveId } = req.params;
    try {
      const gameSave = ctx.persistenceManager.loadGame(saveId);
      if (!gameSave) {
        res.status(404).json({ error: 'Save not found' });
        return;
      }
      const loadedGameState = gameSave.gameState;
      ctx.gameEngine.loadGameState(loadedGameState);
      res.json(loadedGameState);
    } catch (error) {
      console.error('❌ Error loading game:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Delete a save
  router.delete('/api/game/saves/:saveId', (req: Request, res: Response) => {
    const { saveId } = req.params;
    try {
      const success = ctx.persistenceManager.deleteSave(saveId);
      if (!success) {
        res.status(404).json({ error: 'Save not found' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Save current game
  router.post('/api/game/:gameId/save', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { saveName } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }
      const metadata = ctx.persistenceManager.saveGame(gameState, saveName);
      res.json({ success: true, metadata });
    } catch (error) {
      console.error('❌ Error saving game:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
