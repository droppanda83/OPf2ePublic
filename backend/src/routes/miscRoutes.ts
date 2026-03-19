/**
 * Miscellaneous routes: health, AI models, token usage, campaign suggest,
 * XP management, creature images/level-up, atlas metadata, bug reports.
 * Extracted from index.ts during Audit Phase E.3.
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AppContext } from '../appContext';
import { getCreatureXP, XP_PER_LEVEL } from '../routeHelpers';
import type { Creature } from '../routeHelpers';
import type { GMChatMessage } from 'pf2e-shared';

export function createMiscRoutes(ctx: AppContext): Router {
  const router = Router();

  // ─── Health check ──────────────────────────────────────────
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // ─── Campaign Suggestion ───────────────────────────────────
  router.post('/api/campaign/suggest', async (req: Request, res: Response) => {
    try {
      const { hint, recentNames, aiModel } = req.body || {};
      const suggestion = await ctx.gmChatbot.suggestCampaign(
        hint || undefined,
        recentNames,
        typeof aiModel === 'string' ? aiModel.trim() : undefined,
      );
      res.json(suggestion);
    } catch (error) {
      console.error('Campaign suggestion error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── AI Models ─────────────────────────────────────────────
  router.get('/api/ai/models', async (req: Request, res: Response) => {
    try {
      const models = await ctx.gmChatbot.getAvailableModels();
      res.json({ models, currentModel: ctx.gmChatbot.getDefaultModel() });
    } catch (error) {
      console.error('AI model list error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.put('/api/ai/models/default', async (req: Request, res: Response) => {
    try {
      const aiModel = String(req.body?.aiModel || '').trim();
      if (!aiModel) {
        res.status(400).json({ error: 'aiModel is required' });
        return;
      }

      const models = await ctx.gmChatbot.getAvailableModels();
      if (models.length > 0 && !models.includes(aiModel)) {
        res.status(400).json({ error: `Unknown model: ${aiModel}` });
        return;
      }

      ctx.gmChatbot.setDefaultModel(aiModel);
      res.json({ ok: true, currentModel: ctx.gmChatbot.getDefaultModel() });
    } catch (error) {
      console.error('AI model update error:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Token usage tracking ──────────────────────────────────
  router.get('/api/ai/token-usage', (_req: Request, res: Response) => {
    res.json(ctx.aiProviders.tokenUsage);
  });

  // ─── XP: Manual award ─────────────────────────────────────
  router.post('/api/game/:gameId/xp/award', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { amount, reason } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }

      const xpAmount = Math.max(0, Math.min(1000, Number(amount) || 0));
      if (xpAmount === 0) { res.status(400).json({ error: 'Invalid XP amount' }); return; }

      const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
      const levelUps: { id: string; name: string; oldLevel: number; newLevel: number }[] = [];

      for (const player of players) {
        const prevXP = player.currentXP || 0;
        const newXP = prevXP + xpAmount;
        if (newXP >= XP_PER_LEVEL) {
          const oldLevel = player.level;
          player.level += 1;
          player.currentXP = newXP - XP_PER_LEVEL;
          levelUps.push({ id: player.id, name: player.name, oldLevel, newLevel: player.level });
        } else {
          player.currentXP = newXP;
        }
      }

      if (gameState.gmSession) {
        gameState.gmSession.xpAwarded += xpAmount;
        if (levelUps.length > 0) {
          const levelUpMsg: GMChatMessage = {
            id: `gm-levelup-${Date.now()}`, role: 'gm',
            content: `🎉 **LEVEL UP!** ${levelUps.map(l => `${l.name} has reached Level ${l.newLevel}!`).join(' ')} Open the character sheet to make your level-up choices.`,
            timestamp: Date.now(),
          };
          gameState.gmSession.chatHistory.push(levelUpMsg);
        }
      }

      res.json({
        awarded: xpAmount, reason: reason || 'Manual award', levelUps,
        players: players.map((p: Creature) => ({
          id: p.id, name: p.name, level: p.level,
          currentXP: p.currentXP || 0, xpToNextLevel: XP_PER_LEVEL - (p.currentXP || 0),
        })),
        gmSession: gameState.gmSession || undefined,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── XP: Get status ───────────────────────────────────────
  router.get('/api/game/:gameId/xp', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }

      const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
      res.json({
        xpPerLevel: XP_PER_LEVEL,
        totalXpAwarded: gameState.gmSession?.xpAwarded || 0,
        players: players.map((p: Creature) => ({
          id: p.id, name: p.name, level: p.level,
          currentXP: p.currentXP || 0,
          xpToNextLevel: XP_PER_LEVEL - (p.currentXP || 0),
          xpPercent: Math.round(((p.currentXP || 0) / XP_PER_LEVEL) * 100),
        })),
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Creature Images ──────────────────────────────────────
  router.patch('/api/game/:gameId/creature/:creatureId/images', (req: Request, res: Response) => {
    const { gameId, creatureId } = req.params;
    const { tokenImageUrl, portraitImageUrl } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }
      const creature = gameState.creatures.find((c: Creature) => c.id === creatureId);
      if (!creature) { res.status(404).json({ error: 'Creature not found' }); return; }
      if (tokenImageUrl !== undefined) creature.tokenImageUrl = tokenImageUrl || undefined;
      if (portraitImageUrl !== undefined) creature.portraitImageUrl = portraitImageUrl || undefined;
      console.log(`🖼️ Updated images for ${creature.name}`);
      res.json({ success: true, creature });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Level-Up ─────────────────────────────────────────────
  router.post('/api/game/:gameId/creature/:creatureId/levelup', (req: Request, res: Response) => {
    const { gameId, creatureId } = req.params;
    const { updates } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }
      const creature = gameState.creatures.find((c: Creature) => c.id === creatureId);
      if (!creature) { res.status(404).json({ error: 'Creature not found' }); return; }

      if (updates.abilities) creature.abilities = updates.abilities;
      if (updates.maxHealth) {
        const hpGain = updates.maxHealth - creature.maxHealth;
        creature.maxHealth = updates.maxHealth;
        creature.currentHealth = Math.min(creature.currentHealth + Math.max(0, hpGain), creature.maxHealth);
      }
      if (updates.armorClass) creature.armorClass = updates.armorClass;
      if (updates.proficiencies) creature.proficiencies = updates.proficiencies;
      if (updates.feats) creature.feats = updates.feats;
      if (updates.skills) creature.skills = updates.skills;
      if (updates.speed) creature.speed = updates.speed;
      if (updates.specials) creature.specials = updates.specials;
      if (updates.spellcasters) creature.spellcasters = updates.spellcasters;
      if (updates.weaponInventory) creature.weaponInventory = updates.weaponInventory;
      if (updates.focusSpells) creature.focusSpells = updates.focusSpells;
      if (updates.maxFocusPoints !== undefined) creature.maxFocusPoints = updates.maxFocusPoints;
      if (updates.focusPoints !== undefined) creature.focusPoints = updates.focusPoints;

      console.log(`✅ Level-up applied for ${creature.name} (now level ${creature.level})`);
      res.json({ creature, success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Atlas Tile Metadata ──────────────────────────────────
  const atlasMetadataPath = path.join(__dirname, '../../frontend/public/textures/atlas-metadata.json');

  router.get('/api/atlas/metadata', (_req: Request, res: Response) => {
    try {
      if (fs.existsSync(atlasMetadataPath)) {
        const data = JSON.parse(fs.readFileSync(atlasMetadataPath, 'utf-8'));
        res.json(data);
      } else {
        res.json({});
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.post('/api/atlas/metadata', (req: Request, res: Response) => {
    try {
      fs.writeFileSync(atlasMetadataPath, JSON.stringify(req.body, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Bug Reports ──────────────────────────────────────────
  router.post('/api/bugs', (req: Request, res: Response) => {
    try {
      const { title, description, stepsToReproduce, expectedBehaviour, actualBehaviour, category, severity, context, gameId, userAgent, screenResolution } = req.body;
      if (!title || !description || !category || !severity) {
        return res.status(400).json({ error: 'title, description, category and severity are required' });
      }
      const report = ctx.bugReportManager.create({
        title, description, stepsToReproduce, expectedBehaviour, actualBehaviour,
        category, severity, context, gameId, userAgent, screenResolution,
      });
      res.status(201).json(report);
    } catch (error) {
      console.error('Error creating bug report:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/api/bugs', (req: Request, res: Response) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.severity) filters.severity = req.query.severity as string;
      const reports = ctx.bugReportManager.list(filters);
      res.json(reports);
    } catch (error) {
      console.error('Error listing bug reports:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/api/bugs/stats', (_req: Request, res: Response) => {
    try {
      res.json(ctx.bugReportManager.stats());
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/api/bugs/:bugId', (req: Request, res: Response) => {
    try {
      const report = ctx.bugReportManager.getById(req.params.bugId);
      if (!report) return res.status(404).json({ error: 'Bug report not found' });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.patch('/api/bugs/:bugId', (req: Request, res: Response) => {
    try {
      const updated = ctx.bugReportManager.update(req.params.bugId, req.body);
      if (!updated) return res.status(404).json({ error: 'Bug report not found' });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.delete('/api/bugs/:bugId', (req: Request, res: Response) => {
    try {
      const deleted = ctx.bugReportManager.delete(req.params.bugId);
      if (!deleted) return res.status(404).json({ error: 'Bug report not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
