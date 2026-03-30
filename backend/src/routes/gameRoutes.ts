/**
 * Core game routes: create, get state, execute actions, turn management, AI turns, add creatures.
 * Extracted from index.ts during Audit Phase E.3.
 */
import { Router, Request, Response } from 'express';
import { AppContext } from '../appContext';
import { createDefaultGMSession, getTensionBand } from '../ai/gmChatbot';
import { generateAndApplyAtlasMap, fallbackPosition } from '../routeHelpers';
import type { Creature } from '../routeHelpers';
import type { GMChatMessage, GameLog, Difficulty } from 'pf2e-shared';
import type { MapGeneratorTheme } from 'pf2e-shared';

export function createGameRoutes(ctx: AppContext): Router {
  const router = Router();

  // Create game
  router.post('/api/game/create', (req: Request, res: Response) => {
    console.log('🎮 Game create endpoint hit');
    const { players = [], creatures = [], mapSize, mapTheme, mapSubTheme, aiModel } = req.body;

    // Debug logging
    console.log(`\n[BACKEND] ===== GAME CREATE REQUEST =====`);
    console.log(`[BACKEND] Players count: ${players?.length || 0}`);
    if (players && players.length > 0) {
      players.forEach((p: any, i: number) => {
        console.log(`[BACKEND] Player ${i} (${p.name}):`, {
          hasSkills: !!p.skills, skillsCount: p.skills?.length,
          hasFeats: !!p.feats, featsCount: p.feats?.length,
          hasSpecials: !!p.specials, specialsCount: p.specials?.length, specials: p.specials,
          hasSpells: !!p.spells, spellsCount: p.spells?.length,
          hasFocusSpells: !!p.focusSpells, focusSpellsCount: p.focusSpells?.length, focusSpells: p.focusSpells,
          hasLores: !!p.lores, loresCount: p.lores?.length,
        });
      });
    }
    console.log(`[BACKEND] Creatures count: ${creatures?.length || 0}`);
    if (creatures && creatures.length > 0) {
      creatures.forEach((c: any, i: number) => {
        console.log(`🦸 Creature ${i} (${c.name}):`, {
          equippedWeapon: c.equippedWeapon,
          bonuses: c.bonuses?.map((b: any) => ({ value: b.value, applyTo: b.applyTo, source: b.source })),
          bonusesCount: c.bonuses?.length || 0,
        });
      });
    }

    try {
      console.log('🔄 Creating game with', players.length, 'players and', creatures.length, 'creatures');
      const gameState = ctx.gameEngine.createGame(players, creatures, mapSize);
      console.log(`✅ Game created: ${gameState.id}`);

      // Debug: Log what comes OUT of createGame
      console.log(`[BACKEND] ===== GAME STATE CREATED =====`);
      gameState.creatures.forEach((c: any, i: number) => {
        console.log(`[BACKEND] GameState Creature ${i} (${c.name}):`, {
          hasSkills: !!c.skills, skillsCount: c.skills?.length,
          skills: c.skills?.slice(0, 2).map((s: any) => `${s.name}(${s.proficiency})`),
          hasSpecials: !!c.specials, specialsCount: c.specials?.length, specials: c.specials,
          hasFeats: !!c.feats, featsCount: c.feats?.length,
          feats: c.feats?.slice(0, 2).map((f: any) => `${f.name}(${f.type})`),
          hasSpells: !!c.spells, spellsCount: c.spells?.length,
          hasFocusSpells: !!c.focusSpells, focusSpellsCount: c.focusSpells?.length, focusSpells: c.focusSpells,
        });
      });
      console.log(`[BACKEND] =============================\n`);

      console.log('🛡️ Game creatures shield properties:');
      gameState.creatures.forEach((c, i) => {
        console.log(`🛡️ Creature ${i} (${c.name}):`, {
          equippedWeapon: c.equippedWeapon, equippedShield: c.equippedShield,
          shieldRaised: c.shieldRaised, currentShieldHp: c.currentShieldHp,
          proficiencies: {
            martialWeapons: c.proficiencies?.martialWeapons,
            simpleWeapons: c.proficiencies?.simpleWeapons,
            unarmed: c.proficiencies?.unarmed,
          },
          bonuses: c.bonuses?.map((b: any) => ({ value: b.value, applyTo: b.applyTo })),
        });
      });

      // Encounter-mode map generation (atlas-based with procedural fallback)
      const validThemes: string[] = ['dungeon', 'cave', 'wilderness', 'urban', 'indoor', 'ship', 'tower', 'bridge', 'caravan', 'sewers', 'castle', 'mine'];
      console.log(`🗺️ [MAP DEBUG] mapTheme="${mapTheme}", mapSubTheme=${JSON.stringify(mapSubTheme)}, valid=${mapTheme ? validThemes.includes(mapTheme) : 'N/A'}`);
      if (mapTheme && validThemes.includes(mapTheme)) {
        try {
          // Resolve sub-theme: if an array was sent, pick one at random
          let resolvedSubTheme: string | undefined;
          if (Array.isArray(mapSubTheme) && mapSubTheme.length > 0) {
            resolvedSubTheme = mapSubTheme[Math.floor(Math.random() * mapSubTheme.length)];
          } else if (typeof mapSubTheme === 'string' && mapSubTheme) {
            resolvedSubTheme = mapSubTheme;
          }
          console.log(`🗺️ [MAP DEBUG] Calling generateAndApplyAtlasMap with theme="${mapTheme}", subTheme="${resolvedSubTheme}"`);
          generateAndApplyAtlasMap(gameState, mapTheme as MapGeneratorTheme, undefined, undefined,
            resolvedSubTheme ? { subTheme: resolvedSubTheme } : undefined);
          console.log(`🗺️ Encounter: applied atlas ${mapTheme} map${resolvedSubTheme ? ` (sub: ${resolvedSubTheme})` : ''}`);
          console.log(`🗺️ [MAP DEBUG] Map result: width=${gameState.map?.width}, height=${gameState.map?.height}, hasTiles=${!!gameState.map?.tiles}, tileRows=${gameState.map?.tiles?.length || 0}, overlays=${gameState.map?.overlays?.length || 0}, procedural=${gameState.map?.procedural}`);
        } catch (mapErr) {
          console.warn('⚠️ Atlas map generation failed, using default grid:', mapErr);
        }
      } else {
        console.log(`🗺️ [MAP DEBUG] Skipping map generation — mapTheme="${mapTheme}" not valid or missing`);
      }
      if (aiModel && typeof aiModel === 'string' && aiModel.trim().length > 0) {
        if (!gameState.gmSession) {
          gameState.gmSession = createDefaultGMSession({
            campaignName: 'Quick Encounter',
            aiModel: aiModel.trim(),
            mode: 'encounter',
          });
        } else {
          gameState.gmSession.campaignPreferences.aiModel = aiModel.trim();
        }
        gameState.gmSession.currentPhase = 'combat';
        console.log(`🤖 Encounter: AI model set to ${aiModel.trim()}, phase=combat`);
      }

      res.json(gameState);
    } catch (error) {
      console.error('❌ Error creating game:', error);
      res.status(400).json({ error: String(error) });
    }
  });

  // Execute action
  router.post('/api/game/:gameId/action', async (req: Request, res: Response) => {
    console.log('🎬 Action endpoint hit');
    console.log('📦 Request body:', req.body);
    const { gameId } = req.params;
    const { creatureId, actionId, targetId, targetPosition, weaponId, pickupDestination, heroPointsSpent, readyActionId, itemId, spellId } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }
      console.log('🔄 Executing action:', {
        actionId, creatureId, targetId,
        heroPointsSpent: heroPointsSpent ?? 'NONE',
        weaponId: weaponId ?? 'NONE',
        spellId: spellId ?? 'NONE',
      });
      const result = ctx.gameEngine.executeAction(
        gameId, creatureId, actionId, targetId, targetPosition,
        weaponId, pickupDestination, heroPointsSpent, readyActionId, itemId, spellId,
      );
      console.log('✅ Action result received:', {
        success: result.result?.success,
        message: result.result?.message,
        hasDetails: !!result.result?.details,
        hasHeroPointMessage: !!result.result?.details?.heroPointMessage,
      });

      // GM Combat Narration: fire-and-forget
      if (gameState.gmSession?.combatNarrationEnabled && gameState.log.length > 0) {
        const latestEntry = gameState.log[gameState.log.length - 1];
        if (latestEntry.type !== 'system') {
          ctx.gmChatbot.narrateCombatEvent(latestEntry, gameState, gameState.gmSession)
            .then(narrative => {
              if (narrative) {
                const narrationMsg: GMChatMessage = {
                  id: `narration-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
                  role: 'gm',
                  content: narrative,
                  timestamp: Date.now(),
                };
                gameState.gmSession!.chatHistory.push(narrationMsg);
              }
            })
            .catch(err => console.warn('Combat narration failed (non-blocking):', err));
        }
      }

      const actor = gameState.creatures.find((c) => c.id === creatureId);
      if (actor) {
        console.log('🔍 Creature state:', { name: actor.name, heroPoints: actor.heroPoints });
      }

      res.json(result);
    } catch (error) {
      console.error('❌ Error executing action:', error);
      res.status(400).json({ error: String(error) });
    }
  });

  // Start turn
  router.post('/api/game/:gameId/start-turn', (req: Request, res: Response) => {
    console.log('🌅 Start turn endpoint hit');
    const { gameId } = req.params;
    const { creatureId } = req.body;
    try {
      console.log('🔄 Starting turn for creature:', creatureId);
      const result = ctx.gameEngine.startTurn(gameId, creatureId);
      console.log('✅ Turn started, persistent damage processed:', result.persistentDamageEntries.length);
      res.json(result);
    } catch (error) {
      console.error('❌ Error starting turn:', error);
      res.status(400).json({ error: String(error) });
    }
  });

  // End turn
  router.post('/api/game/:gameId/end-turn', (req: Request, res: Response) => {
    console.log('🏁 End turn endpoint hit');
    const { gameId } = req.params;
    try {
      console.log('🔄 Ending turn for game:', gameId);
      const gameState = ctx.gameEngine.endTurn(gameId);
      const nextCreatureId = gameState.currentRound.turnOrder[gameState.currentRound.currentTurnIndex];
      console.log('✅ Turn ended, next creature:', nextCreatureId);

      // Auto-call startTurn for the next creature so action points,
      // persistent damage, conditions, shield lowering, etc. are processed
      let actionPoints = 3;
      let startTurnMessages: string[] = [];
      try {
        const startResult = ctx.gameEngine.startTurn(gameId, nextCreatureId);
        actionPoints = startResult.actionPoints ?? 3;
        startTurnMessages = startResult.conditionMessages ?? [];
        console.log(`🌅 Auto-started turn for ${nextCreatureId}: ${actionPoints} action points`);
      } catch (e) {
        console.warn('⚠️ Auto-startTurn failed (non-blocking):', e);
      }

      res.json({ gameState, actionPoints, startTurnMessages });
    } catch (error) {
      console.error('❌ Error ending turn:', error);
      res.status(400).json({ error: String(error) });
    }
  });

  // Get game state
  router.get('/api/game/:gameId', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const gameState = ctx.gameEngine.getGameState(gameId);
    if (!gameState) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(gameState);
  });

  // AI turn
  router.post('/api/game/:gameId/ai-turn', async (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const { difficulty } = req.body as { difficulty?: 'easy' | 'normal' | 'hard' | 'deadly' };
      if (difficulty) {
        ctx.aiManager.setDifficulty(difficulty);
      }

      const gs = ctx.gameEngine.getGameState(gameId);
      const turnIdx = gs?.currentRound?.currentTurnIndex ?? -1;
      const turnCreatureId = gs?.currentRound?.turnOrder?.[turnIdx];
      const turnCreature = gs?.creatures?.find((c: any) => c.id === turnCreatureId);
      console.log(`🤖 AI turn requested for game ${gameId}`);
      console.log(`🤖 Current turn: idx=${turnIdx}, creatureId=${turnCreatureId}, name=${turnCreature?.name}, type=${turnCreature?.type}, hp=${turnCreature?.currentHealth}/${turnCreature?.maxHealth}, pos=(${turnCreature?.positions?.x},${turnCreature?.positions?.y}), weapons=${turnCreature?.weaponInventory?.length ?? 0}`);

      const plannedActions = await ctx.aiManager.decideTurn(gameId, ctx.gameEngine);
      console.log(`🤖 AI planned ${plannedActions.length} actions:`, plannedActions.map(a => `${a.action.actionId}(target=${a.action.targetId || 'none'}, pos=${a.action.targetPosition ? `${a.action.targetPosition.x},${a.action.targetPosition.y}` : 'none'}, weapon=${(a.action.details as any)?.weaponId || 'none'})`).join(' → '));

      const executionResults: Array<{
        planned: unknown;
        result: { success: boolean; message: string } | Record<string, unknown>;
        reactionOpportunities: unknown[];
        stateSnapshot?: {
          creatures: Array<{ id: string; name: string; positions: { x: number; y: number }; currentHealth: number; maxHealth: number; conditions: any[]; dead?: boolean }>;
          log: any[];
        };
      }> = [];

      for (const planned of plannedActions) {
        const details = planned.action.details as
          | { weaponId?: string; pickupDestination?: string; heroPointsSpent?: number; readyActionId?: string; itemId?: string; spellId?: string; }
          | undefined;

        try {
          if (planned.action.actionId === 'end_turn') {
            const endedState = ctx.gameEngine.endTurn(gameId);
            const nextId = endedState.currentRound.turnOrder[endedState.currentRound.currentTurnIndex];
            let earlyAP = 3;
            try {
              const sr = ctx.gameEngine.startTurn(gameId, nextId);
              earlyAP = sr.actionPoints ?? 3;
            } catch (_e) { /* non-blocking */ }
            executionResults.push({
              planned,
              result: { success: true, message: 'AI ended turn.' },
              reactionOpportunities: [],
            });
            res.json({ plannedActions, executionResults, gameState: endedState, actionPoints: earlyAP });
            return;
          }

          const executed = ctx.gameEngine.executeAction(
            gameId, planned.action.creatureId, planned.action.actionId,
            planned.action.targetId, planned.action.targetPosition,
            details?.weaponId, details?.pickupDestination,
            details?.heroPointsSpent, details?.readyActionId,
            details?.itemId, details?.spellId,
          );

          const midState = ctx.gameEngine.getGameState(gameId);
          const snapshot = midState ? {
            creatures: midState.creatures.map((c: any) => ({
              id: c.id, name: c.name,
              positions: { x: c.positions.x, y: c.positions.y },
              currentHealth: c.currentHealth, maxHealth: c.maxHealth,
              conditions: c.conditions || [], dead: c.dead,
            })),
            log: midState.log.slice(-3),
          } : undefined;

          executionResults.push({
            planned,
            result: executed.result,
            reactionOpportunities: executed.reactionOpportunities,
            stateSnapshot: snapshot,
          });

          console.log(`🤖 Action ${planned.action.actionId}: ${executed.result?.success ? '✅' : '❌'} — ${executed.result?.message || 'no message'}`);

          if (!executed.result?.success) {
            const isMovementAction = ['stride', 'move', 'step'].includes(planned.action.actionId);
            if (isMovementAction) {
              console.log(`🤖 Movement failed, skipping: ${executed.result?.message}`);
              continue;
            }
            const msg = executed.result?.message || '';
            const isMissOrFumble = msg.includes('missed') || msg.includes('fumbled') || msg.includes('CRITICAL FAILURE');
            if (isMissOrFumble) {
              console.log(`🤖 Attack missed, continuing chain: ${msg}`);
              continue;
            }
            console.log(`🤖 Stopping action chain due to failure: ${msg}`);
            break;
          }
        } catch (error) {
          console.log(`🤖 Action ${planned.action.actionId} threw error: ${String(error)}`);
          executionResults.push({
            planned,
            result: { success: false, message: String(error) },
            reactionOpportunities: [],
          });
          break;
        }
      }

      const endedState = ctx.gameEngine.endTurn(gameId);

      // Auto-start next creature's turn (reset actions, process conditions/persistent damage)
      const nextCreatureId = endedState.currentRound.turnOrder[endedState.currentRound.currentTurnIndex];
      let actionPoints = 3;
      try {
        const startResult = ctx.gameEngine.startTurn(gameId, nextCreatureId);
        actionPoints = startResult.actionPoints ?? 3;
        console.log(`🌅 AI turn done → auto-started turn for ${nextCreatureId}: ${actionPoints} AP`);
      } catch (e) {
        console.warn('⚠️ Auto-startTurn after AI turn failed (non-blocking):', e);
      }

      // GM Combat Narration for NPC actions: fire-and-forget
      if (endedState?.gmSession?.combatNarrationEnabled && endedState.log?.length > 0) {
        const recentEntries = endedState.log
          .slice(-executionResults.length * 2)
          .filter(e => e.type !== 'system');
        if (recentEntries.length > 0) {
          const combinedMessage = recentEntries.map(e => e.message).join(' | ');
          const batchEntry: GameLog = { timestamp: Date.now(), type: 'action', message: combinedMessage };
          ctx.gmChatbot.narrateCombatEvent(batchEntry, endedState, endedState.gmSession)
            .then(narrative => {
              if (narrative) {
                const narrationMsg: GMChatMessage = {
                  id: `narration-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
                  role: 'gm', content: narrative, timestamp: Date.now(),
                };
                endedState.gmSession!.chatHistory.push(narrationMsg);
              }
            })
            .catch(err => console.warn('NPC combat narration failed (non-blocking):', err));
        }
      }

      res.json({ plannedActions, executionResults, gameState: endedState, actionPoints });
    } catch (error) {
      console.error('❌ AI turn error:', error);
      try {
        const recoveredState = ctx.gameEngine.endTurn(gameId);
        res.json({ plannedActions: [], executionResults: [], gameState: recoveredState, error: String(error) });
      } catch {
        res.status(500).json({ error: String(error) });
      }
    }
  });

  // Add creatures to existing game
  router.post('/api/game/:gameId/add-creatures', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { creatures } = req.body;
    console.log(`📥 Add creatures endpoint called`);
    console.log(`   GameID: ${gameId}`);
    console.log(`   Creatures count: ${creatures?.length || 0}`);

    if (creatures && creatures.length > 0) {
      creatures.forEach((c: any, idx: number) => {
        console.log(`[Backend] Creature ${idx} received:`, {
          name: c.name, skills: c.skills, skillsCount: c.skills?.length,
          feats: c.feats, featsCount: c.feats?.length,
          spells: c.spells, spellsCount: c.spells?.length,
        });
      });
    }

    try {
      if (!creatures || !Array.isArray(creatures) || creatures.length === 0) {
        console.error('   ❌ No creatures provided');
        res.status(400).json({ error: 'No creatures provided' });
        return;
      }

      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) {
        const availableIds = ctx.gameEngine.getAvailableGameIds();
        console.error(`   ❌ Game not found with ID: ${gameId}`);
        console.error(`   Available game IDs: ${availableIds.length === 0 ? 'NONE' : availableIds.join(', ')}`);
        res.status(404).json({ error: `Game not found: ${gameId}` });
        return;
      }
      console.log(`   ✅ Found game: ${gameState.id}`);
      console.log(`🔍 Adding ${creatures.length} creatures to game ${gameId}`);

      const newCreatures = creatures.map((creature: any) => ({
        ...creature,
        id: creature.id || `creature-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        positions: creature.positions || { x: 0, y: 0 },
        initiative: creature.initiative || 0,
        bonuses: creature.bonuses || [],
        penalties: creature.penalties || [],
        conditions: creature.conditions || [],
      }));

      gameState.creatures.push(...newCreatures);
      console.log(`   ✅ Added ${newCreatures.length} creatures. Total creatures: ${gameState.creatures.length}`);
      res.json(gameState);
    } catch (error) {
      console.error('   ❌ Error adding creatures:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
