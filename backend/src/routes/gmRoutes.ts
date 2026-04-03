/**
 * GM Chatbot routes: init, chat, narration, tension, preferences, NPCs, notes,
 * story arcs, encounter start/intro/conclusion, map selection, exploration movement.
 * Extracted from index.ts during Audit Phase E.3.
 */
import { Router, Request, Response } from 'express';
import { AppContext } from '../appContext';
import { createDefaultGMSession, getTensionBand } from '../ai/gmChatbot';
import {
  applyMapTemplateToGame, generateAndApplyProceduralMap, toneToMapTheme,
  inferMapThemeFromChat, normalizeDifficulty, buildEncounterEnemies,
  createDefaultAbilities, createDefaultProficiencies,
  findExplorationPath, getCreatureByName,
  getCreatureXP, XP_PER_LEVEL,
} from '../routeHelpers';
import { getTokenArtUrl } from '../services/tokenArtService';
import { selectMapForNarrative } from '../services/mapSelectionService';
import { getFoundryMapById, FOUNDRY_MAP_CATALOG } from 'pf2e-shared/foundryMapCatalog';
import type { Creature, MapGeneratorTheme, EncounterMapTemplate, Difficulty } from '../routeHelpers';
import type { CampaignPreferences, GMChatMessage, GMSession, RecurringNPC, StoryArc } from 'pf2e-shared';

interface SceneAction {
  actionType?: string;
  details?: {
    name?: string;
    creature?: string;
    displayName?: string;
    role?: RecurringNPC['role'];
    description?: string;
    icon?: string;
    x?: number;
    y?: number;
    disposition?: string;
  };
}

interface CampaignFramework {
  openingNarration?: string;
  storyArc?: {
    bbegName?: string;
    bbegMotivation?: string;
    keyLocations?: string[];
    milestones?: unknown[];
    secretPlots?: unknown[];
  };
  npcs?: Array<{
    name?: string;
    role?: RecurringNPC['role'];
    disposition?: number;
    description?: string;
    location?: string;
  }>;
}

export function createGMRoutes(ctx: AppContext): Router {
  const router = Router();

  const emitTensionChanged = (
    gameId: string,
    previousScore: number,
    session: GMSession,
    reason: string,
  ) => {
    if (previousScore === session.tensionTracker.score) return;
    ctx.eventBus.emit({
      type: 'world:tension-changed',
      timestamp: Date.now(),
      gameId,
      previousScore,
      newScore: session.tensionTracker.score,
      trend: session.tensionTracker.trend,
      reason,
    });
  };

  const emitTimeAdvanced = (gameId: string, amount: number, unit: 'rounds' | 'minutes' | 'hours' | 'days', reason: string) => {
    ctx.eventBus.emit({
      type: 'world:time-advanced',
      timestamp: Date.now(),
      gameId,
      amount,
      unit,
      reason,
    });
  };

  const emitQuestUpdated = (
    gameId: string,
    questId: string,
    title: string,
    status: 'introduced' | 'active' | 'completed' | 'failed' | 'updated',
    description: string,
    source: string,
  ) => {
    ctx.eventBus.emit({
      type: 'world:quest-updated',
      timestamp: Date.now(),
      gameId,
      questId,
      title,
      status,
      description,
      source,
    });
  };

  // ─── Initialize GM session ───────────────────────────────────
  router.post('/api/game/:gameId/gm/init', async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const preferences: Partial<CampaignPreferences> = req.body.preferences || {};
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      // Determine if full campaign initialization is needed:
      // - No gmSession exists yet, OR
      // - A stub gmSession was pre-created by game/create (empty chatHistory) and caller wants campaign mode
      const needsFullInit = !gameState.gmSession
        || (gameState.gmSession.chatHistory.length === 0
            && preferences.mode !== 'encounter');

      if (needsFullInit) {
        gameState.gmSession = createDefaultGMSession({
          ...preferences,
          playerCount: gameState.creatures.filter(c => c.type === 'player').length,
          averageLevel: Math.round(
            gameState.creatures
              .filter(c => c.type === 'player')
              .reduce((sum, c) => sum + (c.level || 1), 0) /
            Math.max(1, gameState.creatures.filter(c => c.type === 'player').length)
          ),
        });

        // Apply map: prefer explicit Foundry map > AI-selected Foundry map (campaign) > atlas generation
        try {
          const foundryMapId = (preferences as Partial<CampaignPreferences> & { foundryMapId?: string }).foundryMapId;
          let foundryMap;
          if (foundryMapId === '__random__') {
            foundryMap = FOUNDRY_MAP_CATALOG.length > 0
              ? FOUNDRY_MAP_CATALOG[Math.floor(Math.random() * FOUNDRY_MAP_CATALOG.length)]
              : undefined;
            if (foundryMap) console.log(`🎲 Random Foundry map selected: "${foundryMap.name}" (${foundryMap.id})`);
          } else {
            foundryMap = foundryMapId ? getFoundryMapById(foundryMapId) : undefined;
          }
          if (foundryMap) {
            // Explicitly selected Foundry map (encounter mode)
            applyMapTemplateToGame(gameState, foundryMap);
            gameState.gmSession.currentEncounterMapId = foundryMap.id;
            console.log(`🗺️ GM init: applied player-selected Foundry map "${foundryMap.name}" (${foundryMap.id})`);
          } else if (preferences.mode === 'campaign' || !preferences.mode) {
            // Campaign mode: AI GM picks a Foundry map based on campaign keywords
            const narrativeContext = [
              preferences.campaignName,
              preferences.tone,
              ...(preferences.themes || []),
              preferences.customNotes || '',
            ].filter(Boolean).join(' ');

            const avgLevel = gameState.creatures
              .filter((c: Creature) => c.type === 'player')
              .reduce((sum: number, c: Creature) => sum + (c.level || 1), 0) /
              Math.max(1, gameState.creatures.filter((c: Creature) => c.type === 'player').length);

            const aiSelection = selectMapForNarrative({
              narrativeContext,
              partyLevel: Math.round(avgLevel),
            });

            if (aiSelection.map) {
              applyMapTemplateToGame(gameState, aiSelection.map);
              gameState.gmSession.currentEncounterMapId = aiSelection.map.id;
              console.log(`🗺️ GM init: AI selected Foundry map "${aiSelection.map.name}" (confidence: ${aiSelection.confidence}%, reason: ${aiSelection.reason})`);
            } else {
              // Fallback to atlas generation if no Foundry map scored well
              const validThemes: string[] = ['dungeon', 'cave', 'wilderness', 'urban', 'indoor', 'ship', 'tower', 'bridge', 'caravan', 'sewers', 'castle', 'mine'];
              const procTheme: MapGeneratorTheme = (preferences.mapTheme && validThemes.includes(preferences.mapTheme))
                ? preferences.mapTheme as MapGeneratorTheme
                : toneToMapTheme(preferences.tone);
              const procResult = generateAndApplyProceduralMap(gameState, procTheme, undefined, undefined,
                (() => {
                  const raw = preferences.mapSubTheme;
                  if (Array.isArray(raw) && raw.length > 0) return { subTheme: raw[Math.floor(Math.random() * raw.length)] };
                  if (typeof raw === 'string' && raw) return { subTheme: raw };
                  return undefined;
                })());
              gameState.gmSession.currentEncounterMapId = procResult.id;
            }
          } else {
            // Encounter mode without explicit Foundry map: atlas generation
            const validThemes: string[] = ['dungeon', 'cave', 'wilderness', 'urban', 'indoor', 'ship', 'tower', 'bridge', 'caravan', 'sewers', 'castle', 'mine'];
            const procTheme: MapGeneratorTheme = (preferences.mapTheme && validThemes.includes(preferences.mapTheme))
              ? preferences.mapTheme as MapGeneratorTheme
              : toneToMapTheme(preferences.tone);
            const procResult = generateAndApplyProceduralMap(gameState, procTheme, undefined, undefined,
              (() => {
                const raw = preferences.mapSubTheme;
                if (Array.isArray(raw) && raw.length > 0) return { subTheme: raw[Math.floor(Math.random() * raw.length)] };
                if (typeof raw === 'string' && raw) return { subTheme: raw };
                return undefined;
              })());
            gameState.gmSession.currentEncounterMapId = procResult.id;
          }
        } catch (mapErr) {
          console.warn('⚠️ Map application failed during GM init, using existing map:', mapErr);
        }

        // Generate opening scene
        let openingContent: string;
        let sceneActions: SceneAction[] = [];
        try {
          const sceneResult = await ctx.gmChatbot.generateOpeningScene(gameState, gameState.gmSession);
          openingContent = sceneResult.content;
          sceneActions = sceneResult.actions || [];
        } catch (err) {
          console.warn('Opening scene generation failed, using default welcome:', err);
          openingContent = `Welcome to "${gameState.gmSession.campaignPreferences.campaignName}"! I am your Game Master. I'll narrate your adventure, describe the world around you, and manage encounters. Type anything to interact — ask me to describe the scene, talk to NPCs, or tell me what your character does. Let's begin!`;
        }

        // Execute NPC placement actions from the AI-generated scene
        const mapW = gameState.map.width;
        const mapH = gameState.map.height || mapW;
        const impassable = new Set(['wall', 'water-deep', 'lava', 'pit', 'pillar', 'tree', 'rock', 'void']);

        const findWalkable = (x: number, y: number): { x: number; y: number } => {
          let cx = Math.max(0, Math.min(x, mapW - 1));
          let cy = Math.max(0, Math.min(y, mapH - 1));
          if (gameState.map.tiles) {
            const tiles = gameState.map.tiles;
            if (tiles[cy]?.[cx] && impassable.has(tiles[cy][cx])) {
              for (let r = 1; r <= 5; r++) {
                for (let dy = -r; dy <= r; dy++) {
                  for (let dx = -r; dx <= r; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < mapW && ny >= 0 && ny < mapH && tiles[ny]?.[nx] && !impassable.has(tiles[ny][nx])) {
                      return { x: nx, y: ny };
                    }
                  }
                }
              }
            }
          }
          return { x: cx, y: cy };
        };

        let placedNpcCount = 0;
        for (const action of sceneActions) {
          if (action?.actionType === 'place-npc') {
            const npcName = action.details?.name || 'NPC';
            const rawX = typeof action.details?.x === 'number' ? action.details.x : Math.floor(mapW / 2) + placedNpcCount;
            const rawY = typeof action.details?.y === 'number' ? action.details.y : Math.floor(mapH / 2);
            const npcIcon = action.details?.icon || '🧑';
            const pos = findWalkable(rawX, rawY);
            const npcId = `npc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

            const npcCreature: Creature = {
              id: npcId, name: npcName, type: 'npc', level: 0,
              abilities: createDefaultAbilities({ strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }),
              maxHealth: 1, currentHealth: 1,
              proficiencies: createDefaultProficiencies(),
              armorClass: 10, armorBonus: 0, shieldRaised: false,
              bonuses: [], penalties: [], speed: 25,
              positions: { x: pos.x, y: pos.y }, conditions: [],
              initiative: -999, attacksMadeThisTurn: 0,
              dying: false, deathSaveFailures: 0, deathSaveSuccesses: 0, deathSaveMadeThisTurn: false,
              wounded: 0, damageResistances: [], damageImmunities: [], damageWeaknesses: [],
              specials: [npcIcon],
            };
            gameState.creatures.push(npcCreature);
            npcCreature._map = gameState.map;

            if (!gameState.gmSession.recurringNPCs.find((n: RecurringNPC) => n.name.toLowerCase() === npcName.toLowerCase())) {
              gameState.gmSession.recurringNPCs.push({
                id: npcId, name: npcName,
                role: action.details?.role || 'neutral',
                disposition: action.details?.role === 'ally' ? 70 : action.details?.role === 'enemy' ? -50 : 50,
                description: action.details?.description || `${npcName} present in the area`,
                interactions: [], isAlive: true, location: 'Opening scene',
              });
            }
            placedNpcCount++;
            console.log(`📍 Placed NPC: ${npcName} (${npcIcon}) at (${pos.x}, ${pos.y})`);

          } else if (action?.actionType === 'place-creature-npc') {
            const creatureName = action.details?.name || action.details?.creature;
            if (creatureName) {
              const bestiaryEntry = getCreatureByName(creatureName);
              if (bestiaryEntry) {
                const rawX = typeof action.details?.x === 'number' ? action.details.x : Math.floor(mapW / 2) + placedNpcCount;
                const rawY = typeof action.details?.y === 'number' ? action.details.y : Math.floor(mapH / 2);
                const pos = findWalkable(rawX, rawY);
                const npcId = `cnpc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
                const displayName = action.details?.displayName || bestiaryEntry.creature.name || creatureName;
                const disposition = action.details?.disposition || 'neutral';
                const bc = bestiaryEntry.creature;
                const hp = bc.maxHealth || 20;

                const creatureNpc: Creature = {
                  ...bc, id: npcId, name: displayName, type: 'npc',
                  maxHealth: hp, currentHealth: bc.currentHealth ?? hp,
                  positions: { x: pos.x, y: pos.y }, initiative: -999,
                  actionsRemaining: 3, attacksMadeThisTurn: 0, reactionUsed: false,
                  flourishUsedThisTurn: false, shieldRaised: false, dead: false,
                  dying: bc.dying || false, deathSaveFailures: bc.deathSaveFailures || 0,
                  deathSaveSuccesses: bc.deathSaveSuccesses || 0, deathSaveMadeThisTurn: bc.deathSaveMadeThisTurn || false,
                  wounded: bc.wounded || 0, bonuses: bc.bonuses || [], penalties: bc.penalties || [],
                  conditions: bc.conditions || [], damageResistances: bc.damageResistances || [],
                  damageImmunities: bc.damageImmunities || [], damageWeaknesses: bc.damageWeaknesses || [],
                  skills: bc.skills || [], specials: bc.specials || [],
                  tokenImageUrl: bc.tokenImageUrl || getTokenArtUrl(bestiaryEntry.creature.name, bestiaryEntry.tags),
                  npcDisposition: disposition, bestiaryName: bestiaryEntry.creature.name,
                  _map: gameState.map,
                } as Creature;

                gameState.creatures.push(creatureNpc);
                if (!gameState.gmSession.recurringNPCs.find((n: RecurringNPC) => n.name.toLowerCase() === displayName.toLowerCase())) {
                  gameState.gmSession.recurringNPCs.push({
                    id: npcId, name: displayName,
                    role: disposition === 'hostile' ? 'enemy' : disposition === 'friendly' ? 'ally' : 'neutral',
                    disposition: disposition === 'hostile' ? -50 : disposition === 'friendly' ? 75 : 0,
                    description: `${bestiaryEntry.description} (${bestiaryEntry.creature.name} Lv${bc.level || 0})`,
                    interactions: [], isAlive: true, location: 'Opening scene',
                  });
                }
                placedNpcCount++;
                console.log(`🐾 Placed creature NPC: ${displayName} (${bestiaryEntry.creature.name} Lv${bc.level}) at (${pos.x}, ${pos.y}) [${disposition}]`);
              } else {
                console.warn(`⚠️ Bestiary creature "${creatureName}" not found for opening scene placement`);
              }
            }
          }
        }

        // Fallback NPCs if none placed
        if (placedNpcCount === 0) {
          const cx = Math.floor(mapW / 2);
          const cy = Math.floor(mapH / 2);
          const tone = preferences.tone || 'heroic';
          const fallbackNPCs: { name: string; icon: string; x: number; y: number; role: string; description: string }[] = [];

          if (tone === 'heroic') fallbackNPCs.push({ name: 'Town Elder', icon: '👴', x: cx, y: cy - 2, role: 'neutral', description: 'A town elder who seems to have been expecting you' });
          else if (tone === 'gritty') fallbackNPCs.push({ name: 'Innkeeper', icon: '🍺', x: cx, y: cy + 1, role: 'neutral', description: 'A scarred innkeeper who has seen too much' });
          else if (tone === 'horror') fallbackNPCs.push({ name: 'Flickering Shadow', icon: '👻', x: cx + 4, y: cy, role: 'neutral', description: 'A barely-visible shape at the edge of the light' });
          else if (tone === 'dungeon-crawl') fallbackNPCs.push({ name: 'Expedition Leader', icon: '🗺️', x: 3, y: cy, role: 'ally', description: 'The expedition coordinator, nervously checking their notes' });
          else if (tone === 'mystery') fallbackNPCs.push({ name: 'Butler', icon: '🎩', x: cx, y: cy - 2, role: 'neutral', description: 'An impeccably dressed butler whose composure is cracking' });
          else if (tone === 'political') fallbackNPCs.push({ name: 'Courtier', icon: '👑', x: cx, y: cy - 3, role: 'neutral', description: 'A courtier who watches you with appraising eyes' });
          else fallbackNPCs.push({ name: 'Stranger', icon: '🧑', x: cx - 2, y: cy - 1, role: 'neutral', description: 'A mysterious figure who seems to know more than they let on' });

          for (const npc of fallbackNPCs) {
            const npcId = `npc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
            const pos = findWalkable(npc.x, npc.y);
            const npcCreature: Creature = {
              id: npcId, name: npc.name, type: 'npc', level: 0,
              abilities: createDefaultAbilities({ strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }),
              maxHealth: 1, currentHealth: 1,
              proficiencies: createDefaultProficiencies(),
              armorClass: 10, armorBonus: 0, shieldRaised: false,
              bonuses: [], penalties: [], speed: 25,
              positions: { x: pos.x, y: pos.y }, conditions: [],
              initiative: -999, attacksMadeThisTurn: 0,
              dying: false, deathSaveFailures: 0, deathSaveSuccesses: 0, deathSaveMadeThisTurn: false,
              wounded: 0, damageResistances: [], damageImmunities: [], damageWeaknesses: [],
              specials: [npc.icon],
            };
            gameState.creatures.push(npcCreature);
            npcCreature._map = gameState.map;
            if (!gameState.gmSession.recurringNPCs.find((n: RecurringNPC) => n.name.toLowerCase() === npc.name.toLowerCase())) {
              gameState.gmSession.recurringNPCs.push({
                id: npcId, name: npc.name,
                role: npc.role,
                disposition: npc.role === 'ally' ? 70 : 50,
                description: npc.description,
                interactions: [], isAlive: true, location: 'Opening scene',
              });
            }
            console.log(`📍 Placed fallback NPC: ${npc.name} (${npc.icon}) at (${pos.x}, ${pos.y})`);
          }
        }

        const welcomeMsg: GMChatMessage = {
          id: `gm-welcome-${Date.now()}`,
          role: 'gm', content: openingContent, timestamp: Date.now(),
        };
        gameState.gmSession.chatHistory.push(welcomeMsg);
      }

      console.log(`🎭 GM session initialized for game ${gameId}`);
      res.json({ gmSession: gameState.gmSession, gameState });
    } catch (error) {
      console.error('❌ Error initializing GM session:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Get GM session state ────────────────────────────────────
  router.get('/api/game/:gameId/gm', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }
      res.json({ gmSession: gameState.gmSession || null });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Toggle combat narration ─────────────────────────────────
  router.post('/api/game/:gameId/gm/narration-toggle', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { enabled } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }
      if (!gameState.gmSession) gameState.gmSession = createDefaultGMSession();
      gameState.gmSession.combatNarrationEnabled = !!enabled;
      console.log(`🎭 Combat narration ${enabled ? 'ENABLED' : 'DISABLED'} for game ${gameId}`);
      res.json({ combatNarrationEnabled: gameState.gmSession.combatNarrationEnabled });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Token limits ────────────────────────────────────────────
  router.post('/api/game/:gameId/gm/token-limits', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { narrationMaxTokens, gmResponseMaxTokens } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }
      if (!gameState.gmSession) gameState.gmSession = createDefaultGMSession();
      if (narrationMaxTokens !== undefined) {
        gameState.gmSession.narrationMaxTokens = Math.max(50, Math.min(2000, Number(narrationMaxTokens) || 300));
      }
      if (gmResponseMaxTokens !== undefined) {
        gameState.gmSession.gmResponseMaxTokens = Math.max(100, Math.min(4000, Number(gmResponseMaxTokens) || 1500));
      }
      console.log(`🎛️ Token limits updated for game ${gameId}: narration=${gameState.gmSession.narrationMaxTokens}, gmResponse=${gameState.gmSession.gmResponseMaxTokens}`);
      res.json({
        narrationMaxTokens: gameState.gmSession.narrationMaxTokens,
        gmResponseMaxTokens: gameState.gmSession.gmResponseMaxTokens,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── GM Chat ─────────────────────────────────────────────────
  router.post('/api/game/:gameId/gm/chat', async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { message } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }
      if (!gameState.gmSession) gameState.gmSession = createDefaultGMSession();

      const playerMsg: GMChatMessage = {
        id: `player-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        role: 'player', content: message, timestamp: Date.now(),
      };
      gameState.gmSession.chatHistory.push(playerMsg);
      const previousTension = gameState.gmSession.tensionTracker.score;

      const { response, sessionUpdates, mechanicalActions } = await ctx.gmChatbot.processMessage(
        message, gameState, gameState.gmSession,
      );

      if (sessionUpdates.tensionTracker) {
        gameState.gmSession.tensionTracker = sessionUpdates.tensionTracker;
        emitTensionChanged(gameId, previousTension, gameState.gmSession, 'GM chat update');
      }
      gameState.gmSession.chatHistory.push(response);

      // Process mechanical actions through the rules engine
      const executedActions: GMChatMessage['mechanicalAction'][] = [];
      for (const action of mechanicalActions) {
        if (!action) continue;

        if (action.actionType === 'narrate' || action.actionType === 'adjust-tension') {
          action.success = true;
          executedActions.push(action);
        } else if (action.actionType === 'set-encounter-map') {
          const requestedTheme = typeof action.details?.theme === 'string' ? action.details.theme as MapGeneratorTheme : undefined;
          const requestedSubTheme = typeof action.details?.subTheme === 'string' ? action.details.subTheme : undefined;
          const genOptions: Record<string, unknown> = {};
          if (requestedSubTheme) genOptions.subTheme = requestedSubTheme;
          if (action.details?.type) genOptions.type = action.details.type;
          if (action.details?.density) genOptions.density = action.details.density;
          if (action.details?.hasRiver !== undefined) genOptions.hasRiver = action.details.hasRiver;
          if (action.details?.hasPath !== undefined) genOptions.hasPath = action.details.hasPath;

          const requestedMapId = typeof action.details?.mapId === 'string'
            ? action.details.mapId
            : typeof action.details?.raw === 'string' ? action.details.raw : undefined;
          const catalogMap = requestedMapId ? getFoundryMapById(requestedMapId) : undefined;
          if (catalogMap) {
            applyMapTemplateToGame(gameState, catalogMap);
            gameState.gmSession.currentEncounterMapId = catalogMap.id;
            action.success = true;
            action.details = { ...action.details, mapId: catalogMap.id, mapName: catalogMap.name };
          } else {
            const tone = gameState.gmSession?.campaignPreferences?.tone;
            let procTheme: MapGeneratorTheme;
            let procOptions = Object.keys(genOptions).length > 0 ? genOptions : undefined;
            if (requestedTheme) {
              procTheme = requestedTheme;
            } else {
              const inferred = inferMapThemeFromChat(gameState.gmSession, tone);
              procTheme = inferred.theme;
              if (!procOptions && inferred.options) procOptions = inferred.options;
            }
            const procResult = generateAndApplyProceduralMap(gameState, procTheme, undefined, undefined, procOptions);
            gameState.gmSession.currentEncounterMapId = procResult.id;
            action.success = true;
            action.details = { ...action.details, mapId: procResult.id, mapName: procResult.name, procedural: true, theme: procTheme, subTheme: requestedSubTheme };
          }
          executedActions.push(action);
        } else if (action.actionType === 'start-encounter') {
          const rawDifficulty = typeof action.details?.difficulty === 'string' ? action.details.difficulty : undefined;
          const effectiveDifficulty = normalizeDifficulty(rawDifficulty || (gameState.gmSession.campaignPreferences.encounterBalance as string));
          const requestedMapId = typeof action.details?.mapId === 'string' ? action.details.mapId : undefined;
          let selectedMap: EncounterMapTemplate | undefined = requestedMapId ? getFoundryMapById(requestedMapId) : undefined;

          // Prefer the current map for chat-triggered encounters if it's suitable for combat
          const currentMapSuitable = !selectedMap && gameState.map
            && gameState.map.width >= 10 && (gameState.map.height || 0) >= 10
            && gameState.map.terrain?.length > 0;

          if (currentMapSuitable) {
            // Current map is already suitable — stay on it instead of picking a new one
            if (gameState.gmSession.currentEncounterMapId) {
              selectedMap = getFoundryMapById(gameState.gmSession.currentEncounterMapId);
            }
            console.log(`🗺️ Keeping current map for chat-triggered encounter`);
          } else if (!selectedMap) {
            // Current map not suitable — AI GM picks a Foundry map based on recent chat context
            if (gameState.gmSession.currentEncounterMapId) selectedMap = getFoundryMapById(gameState.gmSession.currentEncounterMapId);
            if (!selectedMap) {
              const recentChat = gameState.gmSession.chatHistory.slice(-10).map((m: GMChatMessage) => m.content).join(' ');
              const avgLevel = Math.round(
                gameState.creatures.filter((c: Creature) => c.type === 'player')
                  .reduce((sum: number, c: Creature) => sum + (c.level || 1), 0) /
                Math.max(1, gameState.creatures.filter((c: Creature) => c.type === 'player').length)
              );
              const aiSelection = selectMapForNarrative({
                narrativeContext: recentChat,
                theme: gameState.gmSession.campaignPreferences.mapTheme as MapGeneratorTheme,
                partyLevel: avgLevel,
                campaignId: gameId,
              });
              if (aiSelection.map) {
                applyMapTemplateToGame(gameState, aiSelection.map);
                gameState.gmSession.currentEncounterMapId = aiSelection.map.id;
                selectedMap = aiSelection.map;
                console.log(`🗺️ AI GM selected Foundry map for encounter: "${aiSelection.map.name}" (${aiSelection.confidence}%)`);
              } else {
                // Fallback to atlas
                const tone = gameState.gmSession?.campaignPreferences?.tone;
                const inferred = inferMapThemeFromChat(gameState.gmSession, tone);
                const procResult = generateAndApplyProceduralMap(gameState, inferred.theme, undefined, undefined, inferred.options);
                gameState.gmSession.currentEncounterMapId = procResult.id;
                selectedMap = procResult;
              }
            } else {
              applyMapTemplateToGame(gameState, selectedMap);
              gameState.gmSession.currentEncounterMapId = selectedMap.id;
            }
          } else {
            applyMapTemplateToGame(gameState, selectedMap);
            gameState.gmSession.currentEncounterMapId = selectedMap.id;
          }

          const npcs = gameState.creatures.filter((c: Creature) => c.type === 'npc');
          const hostileCreatureNpcs = npcs.filter((c: Creature) => c.bestiaryName && c.npcDisposition === 'hostile');
          const nonCombatNpcs = npcs.filter((c: Creature) => !c.bestiaryName || c.npcDisposition !== 'hostile');
          if (nonCombatNpcs.length > 0) gameState.gmSession.stashedNPCs = nonCombatNpcs;
          for (const hNpc of hostileCreatureNpcs) { hNpc.type = 'creature'; hNpc.initiative = 0; console.log(`⚔️ Hostile NPC "${hNpc.name}" joins combat as enemy!`); }
          gameState.gmSession.stashedMap = gameState.map ? JSON.parse(JSON.stringify(gameState.map)) : undefined;
          gameState.gmSession.stashedMapId = gameState.gmSession.currentEncounterMapId;

          const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
          const enemies = buildEncounterEnemies(gameState, effectiveDifficulty, selectedMap);
          gameState.creatures = [...players, ...hostileCreatureNpcs, ...enemies];
          gameState.creatures.forEach((c: Creature) => { c._map = gameState.map; });
          ctx.gameEngine.rerollInitiative(gameId);
          gameState.gmSession.currentPhase = 'combat';
          gameState.gmSession.encounterCount += 1;

          action.success = true;
          action.details = { ...action.details, difficulty: effectiveDifficulty, enemyCount: enemies.length, mapId: selectedMap?.id, mapName: selectedMap?.name };
          executedActions.push(action);
        } else if (action.actionType === 'place-npc') {
          const npcName = action.details?.name || 'NPC';
          const npcX = typeof action.details?.x === 'number' ? action.details.x : Math.floor(gameState.map.width / 2);
          const npcY = typeof action.details?.y === 'number' ? action.details.y : Math.floor((gameState.map.height || gameState.map.width) / 2);
          const npcIcon = action.details?.icon || '🧑';
          const npcId = `npc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
          const mapW = gameState.map.width;
          const mapH = gameState.map.height || gameState.map.width;
          const clampedX = Math.max(0, Math.min(npcX, mapW - 1));
          const clampedY = Math.max(0, Math.min(npcY, mapH - 1));

          const npcCreature: Creature = {
            id: npcId, name: npcName, type: 'npc', level: 0,
            abilities: createDefaultAbilities({ strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 }),
            maxHealth: 1, currentHealth: 1,
            proficiencies: createDefaultProficiencies(),
            armorClass: 10, armorBonus: 0, shieldRaised: false,
            bonuses: [], penalties: [], speed: 25,
            positions: { x: clampedX, y: clampedY }, conditions: [],
            initiative: -999, attacksMadeThisTurn: 0,
            dying: false, deathSaveFailures: 0, deathSaveSuccesses: 0, deathSaveMadeThisTurn: false,
            wounded: 0, damageResistances: [], damageImmunities: [], damageWeaknesses: [],
            specials: [npcIcon],
          };
          gameState.creatures.push(npcCreature);
          npcCreature._map = gameState.map;

          const existingRecurring = gameState.gmSession.recurringNPCs.find((n: RecurringNPC) => n.name.toLowerCase() === npcName.toLowerCase());
          if (!existingRecurring) {
            ctx.gmChatbot.addRecurringNPC(gameState.gmSession, {
              name: npcName, role: action.details?.role || 'neutral',
              disposition: action.details?.disposition ?? 50,
              description: action.details?.description || `${npcName} placed on the map`,
              location: `(${clampedX}, ${clampedY})`, interactions: [], isAlive: true,
            });
          }
          action.success = true;
          action.details = { ...action.details, npcId, position: { x: clampedX, y: clampedY } };
          executedActions.push(action);
          console.log(`🧑 Placed NPC "${npcName}" at (${clampedX}, ${clampedY})`);
        } else if (action.actionType === 'remove-npc') {
          const removeTarget = action.details?.name || action.details?.npcId;
          if (removeTarget) {
            const idx = gameState.creatures.findIndex((c: Creature) =>
              c.type === 'npc' && (c.id === removeTarget || c.name.toLowerCase() === removeTarget.toLowerCase())
            );
            if (idx !== -1) {
              const removed = gameState.creatures.splice(idx, 1)[0];
              action.success = true;
              action.details = { ...action.details, removedName: removed.name, removedId: removed.id };
              console.log(`🚪 Removed NPC "${removed.name}" from map`);
            } else {
              action.success = false;
              action.details = { ...action.details, error: `NPC "${removeTarget}" not found on the map` };
            }
          }
          executedActions.push(action);
        } else if (action.actionType === 'place-creature-npc') {
          const creatureName = action.details?.name || action.details?.creature;
          if (!creatureName) {
            action.success = false;
            action.details = { ...action.details, error: 'No creature name provided' };
            executedActions.push(action);
            continue;
          }
          const bestiaryEntry = getCreatureByName(creatureName);
          if (!bestiaryEntry) {
            action.success = false;
            action.details = { ...action.details, error: `Creature "${creatureName}" not found in bestiary` };
            executedActions.push(action);
            continue;
          }

          const mapW = gameState.map.width;
          const mapH = gameState.map.height || gameState.map.width;
          const cx = typeof action.details?.x === 'number' ? action.details.x : Math.floor(mapW / 2);
          const cy = typeof action.details?.y === 'number' ? action.details.y : Math.floor(mapH / 2);
          const clampedX = Math.max(0, Math.min(cx, mapW - 1));
          const clampedY = Math.max(0, Math.min(cy, mapH - 1));
          const disposition = action.details?.disposition || 'neutral';
          const npcId = `cnpc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
          const displayName = action.details?.displayName || bestiaryEntry.creature.name || creatureName;
          const npcIcon = action.details?.icon;
          const bestiaryCreature = bestiaryEntry.creature;
          const hp = bestiaryCreature.maxHealth || 20;

          const creatureNpc: Creature = {
            ...bestiaryCreature, id: npcId, name: displayName, type: 'npc',
            maxHealth: hp, currentHealth: bestiaryCreature.currentHealth ?? hp,
            positions: { x: clampedX, y: clampedY }, initiative: -999,
            actionsRemaining: 3, attacksMadeThisTurn: 0, reactionUsed: false,
            flourishUsedThisTurn: false, shieldRaised: false, dead: false,
            dying: bestiaryCreature.dying || false, deathSaveFailures: bestiaryCreature.deathSaveFailures || 0,
            deathSaveSuccesses: bestiaryCreature.deathSaveSuccesses || 0, deathSaveMadeThisTurn: bestiaryCreature.deathSaveMadeThisTurn || false,
            wounded: bestiaryCreature.wounded || 0,
            bonuses: bestiaryCreature.bonuses || [], penalties: bestiaryCreature.penalties || [],
            conditions: bestiaryCreature.conditions || [], damageResistances: bestiaryCreature.damageResistances || [],
            damageImmunities: bestiaryCreature.damageImmunities || [], damageWeaknesses: bestiaryCreature.damageWeaknesses || [],
            skills: bestiaryCreature.skills || [],
            specials: npcIcon ? [npcIcon, ...(bestiaryCreature.specials || [])] : (bestiaryCreature.specials || []),
            tokenImageUrl: bestiaryCreature.tokenImageUrl || getTokenArtUrl(bestiaryEntry.creature.name, bestiaryEntry.tags),
            npcDisposition: disposition, bestiaryName: bestiaryEntry.creature.name,
            _map: gameState.map,
          } as Creature;

          gameState.creatures.push(creatureNpc);
          const existingRecurring = gameState.gmSession.recurringNPCs.find((n: RecurringNPC) => n.name.toLowerCase() === displayName.toLowerCase());
          if (!existingRecurring) {
            ctx.gmChatbot.addRecurringNPC(gameState.gmSession, {
              name: displayName,
              role: disposition === 'hostile' ? 'enemy' : disposition === 'friendly' ? 'ally' : 'neutral',
              disposition: disposition === 'hostile' ? -50 : disposition === 'friendly' ? 75 : 0,
              description: `${bestiaryEntry.description} (${bestiaryEntry.creature.name} Lv${bestiaryCreature.level || 0})`,
              location: `(${clampedX}, ${clampedY})`, interactions: [], isAlive: true,
            });
          }
          action.success = true;
          action.details = { ...action.details, npcId, creatureName: bestiaryEntry.creature.name, displayName, level: bestiaryCreature.level, hp, disposition, position: { x: clampedX, y: clampedY } };
          executedActions.push(action);
          console.log(`🐾 Placed creature NPC "${displayName}" (${bestiaryEntry.creature.name} Lv${bestiaryCreature.level}) at (${clampedX}, ${clampedY}) [${disposition}]`);
        } else if (action.actionType === 'aggro-npc') {
          const aggroTarget = action.details?.name || action.details?.npcId;
          if (!aggroTarget) {
            action.success = false;
            action.details = { ...action.details, error: 'No NPC name provided' };
            executedActions.push(action);
            continue;
          }
          const npc = gameState.creatures.find((c: Creature) =>
            c.type === 'npc' && (c.id === aggroTarget || c.name.toLowerCase() === aggroTarget.toLowerCase())
          );
          if (!npc) {
            action.success = false;
            action.details = { ...action.details, error: `NPC "${aggroTarget}" not found on the map` };
            executedActions.push(action);
            continue;
          }
          npc.type = 'creature';
          npc.npcDisposition = 'hostile';
          npc.initiative = 0;
          if (gameState.gmSession.currentPhase === 'combat' && gameState.currentRound) {
            const initBonus = npc.initiativeBonus ?? 0;
            npc.initiative = Math.floor(Math.random() * 20) + 1 + initBonus;
            const turnOrder = gameState.currentRound.turnOrder || [];
            turnOrder.push(npc.id);
            const creatureMap = new Map(gameState.creatures.map((c: Creature) => [c.id, c]));
            turnOrder.sort((a: string, b: string) => {
              const ca = creatureMap.get(a);
              const cb = creatureMap.get(b);
              return (cb?.initiative || 0) - (ca?.initiative || 0);
            });
            gameState.currentRound.turnOrder = turnOrder;
          }
          action.success = true;
          action.details = { ...action.details, convertedName: npc.name, convertedId: npc.id };
          executedActions.push(action);
          console.log(`⚔️ NPC "${npc.name}" turned hostile and is now a combatant!`);
        }
      }

      console.log(`🎭 GM chat: "${message.substring(0, 50)}..." → "${response.content.substring(0, 50)}..."`);
      res.json({
        playerMessage: playerMsg, gmResponse: response,
        tensionTracker: gameState.gmSession.tensionTracker,
        executedActions, gmSession: gameState.gmSession, gameState,
      });
    } catch (error) {
      console.error('❌ Error in GM chat:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Exploration Movement ────────────────────────────────────
  router.post('/api/game/:gameId/exploration/move', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { creatureId, targetPosition } = req.body;
    console.log(`🚶 Exploration move request: gameId=${gameId}, creatureId="${creatureId}", target=${JSON.stringify(targetPosition)}`);
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { console.error(`❌ Game not found: ${gameId}`); res.status(404).json({ error: 'Game not found' }); return; }
      if (gameState.gmSession?.currentPhase === 'combat') { res.status(400).json({ error: 'Cannot use exploration movement during combat. Use combat actions instead.' }); return; }
      const creature = gameState.creatures.find((c: Creature) => c.id === creatureId);
      if (!creature) {
        console.error(`❌ Creature not found! creatureId="${creatureId}", available: [${gameState.creatures.map((c: Creature) => `"${c.id}"(${c.name}/${c.type})`).join(', ')}]`);
        res.status(404).json({ error: 'Creature not found' }); return;
      }
      if (creature.type !== 'player') { res.status(400).json({ error: 'Only player characters can move during exploration' }); return; }
      if (!targetPosition || typeof targetPosition.x !== 'number' || typeof targetPosition.y !== 'number') { res.status(400).json({ error: 'Invalid target position' }); return; }

      const mapW = gameState.map.width;
      const mapH = gameState.map.height || gameState.map.width;
      const tx = Math.max(0, Math.min(Math.floor(targetPosition.x), mapW - 1));
      const ty = Math.max(0, Math.min(Math.floor(targetPosition.y), mapH - 1));

      const occupied = gameState.creatures.some((c: Creature) =>
        c.id !== creatureId && c.positions.x === tx && c.positions.y === ty && c.currentHealth > 0
      );
      if (occupied) { res.status(400).json({ error: 'That position is occupied' }); return; }

      const occupiedSet = new Set<string>();
      gameState.creatures.forEach((c: Creature) => {
        if (c.id !== creatureId && c.currentHealth > 0) occupiedSet.add(`${c.positions.x},${c.positions.y}`);
      });

      const path = findExplorationPath(
        { x: creature.positions.x, y: creature.positions.y },
        { x: tx, y: ty },
        {
          mapWidth: mapW, mapHeight: mapH,
          terrain: gameState.map.terrain, tiles: gameState.map.tiles,
          moveCostOverride: (gameState.map as { moveCostOverride?: EncounterMapTemplate['moveCostOverride'] }).moveCostOverride,
          occupiedPositions: occupiedSet, allowDiagonal: true,
        },
      );
      if (!path || path.length === 0) { res.status(400).json({ error: 'No walkable path to that position' }); return; }

      const oldPos = { ...creature.positions };
      creature.positions = { x: tx, y: ty };
      ctx.eventBus.emit({
        type: 'exploration:travel',
        timestamp: Date.now(),
        gameId,
        creatureId: creature.id,
        creatureName: creature.name,
        fromPosition: oldPos,
        toPosition: { x: tx, y: ty },
        pathLength: path.length,
        mode: 'exploration-move',
      });
      ctx.eventBus.emit({
        type: 'exploration:room-entered',
        timestamp: Date.now(),
        gameId,
        creatureId: creature.id,
        creatureName: creature.name,
        fromPosition: oldPos,
        toPosition: { x: tx, y: ty },
        pathLength: path.length,
        summary: `${creature.name} moved to (${tx}, ${ty})`,
      });
      console.log(`🚶 Exploration move: ${creature.name} (${oldPos.x},${oldPos.y}) → (${tx},${ty}) [${path.length} steps]`);
      res.json({ success: true, creature: creature.id, from: oldPos, to: { x: tx, y: ty }, path, gameState });
    } catch (error) {
      console.error('❌ Error in exploration move:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Tension tracker ─────────────────────────────────────────
  router.post('/api/game/:gameId/gm/tension', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { delta, reason, autoCalculate } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const session = gameState.gmSession;
      const previousScore = session.tensionTracker.score;
      let newScore: number;
      if (autoCalculate) {
        newScore = ctx.gmChatbot.calculateAutoTension(gameState, session);
      } else {
        newScore = Math.max(0, Math.min(100, session.tensionTracker.score + (delta || 0)));
      }
      session.tensionTracker = {
        ...session.tensionTracker, score: newScore,
        trend: newScore > session.tensionTracker.score ? 'rising' : newScore < session.tensionTracker.score ? 'falling' : 'stable',
        lastUpdated: Date.now(),
        history: [...session.tensionTracker.history, { score: newScore, reason: reason || 'Manual adjustment', timestamp: Date.now() }],
      };
      emitTensionChanged(gameId, previousScore, session, reason || (autoCalculate ? 'Auto recalculation' : 'Manual adjustment'));
      res.json({ tensionTracker: session.tensionTracker, band: getTensionBand(newScore) });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Preferences ──────────────────────────────────────────────
  router.put('/api/game/:gameId/gm/preferences', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const updates: Partial<CampaignPreferences> = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      gameState.gmSession.campaignPreferences = { ...gameState.gmSession.campaignPreferences, ...updates };
      res.json({ preferences: gameState.gmSession.campaignPreferences });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Difficulty ───────────────────────────────────────────────
  router.post('/api/game/:gameId/gm/difficulty', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { difficulty } = req.body as { difficulty: 'easy' | 'normal' | 'hard' | 'deadly' };
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      gameState.gmSession.difficulty = difficulty;
      ctx.aiManager.setDifficulty(difficulty);
      res.json({ difficulty });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Phase ────────────────────────────────────────────────────
  router.post('/api/game/:gameId/gm/phase', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { phase } = req.body as { phase: GMSession['currentPhase'] };
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      ctx.gmChatbot.setPhase(gameState.gmSession, phase);
      if (phase === 'social') {
        ctx.eventBus.emit({
          type: 'exploration:social-started',
          timestamp: Date.now(),
          gameId,
          location: gameState.gmSession.storyArc?.keyLocations?.[0] || 'Unknown',
        });
      }
      res.json({ phase: gameState.gmSession.currentPhase });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── NPC Management ───────────────────────────────────────────
  router.post('/api/game/:gameId/gm/npcs', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const npcData = req.body as Omit<RecurringNPC, 'id'>;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const npc = ctx.gmChatbot.addRecurringNPC(gameState.gmSession, npcData);
      res.json({ npc });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/api/game/:gameId/gm/npcs', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      res.json({ npcs: gameState.gmSession.recurringNPCs });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Session Notes ────────────────────────────────────────────
  router.post('/api/game/:gameId/gm/notes', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { title, summary } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const note = ctx.gmChatbot.createSessionNote(gameState.gmSession, title, summary);
      res.json({ note });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.get('/api/game/:gameId/gm/notes', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      res.json({ notes: gameState.gmSession.sessionNotes });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Story Arc ────────────────────────────────────────────────
  router.post('/api/game/:gameId/gm/story', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const arcData = req.body as Omit<StoryArc, 'milestones' | 'secretPlots'>;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      ctx.gmChatbot.createStoryArc(gameState.gmSession, arcData);
      emitQuestUpdated(
        gameId,
        'story-arc',
        arcData.bbegName || 'Story Arc Updated',
        'updated',
        arcData.bbegMotivation || 'Story arc changed',
        'gm/story',
      );
      res.json({ storyArc: gameState.gmSession.storyArc });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.post('/api/game/:gameId/gm/story/advance', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      ctx.gmChatbot.advanceStoryPhase(gameState.gmSession);
      emitQuestUpdated(
        gameId,
        'story-arc',
        gameState.gmSession.storyArc?.bbegName || 'Story Arc',
        'updated',
        gameState.gmSession.storyArc?.storyPhase || 'Story advanced',
        'gm/story/advance',
      );
      res.json({ storyArc: gameState.gmSession.storyArc });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Encounter Map Selection ──────────────────────────────────
  router.post('/api/game/:gameId/gm/map', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { mapId } = req.body as { mapId: string };
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const map = getFoundryMapById(mapId);
      if (!map) { res.status(404).json({ error: 'Map not found' }); return; }
      applyMapTemplateToGame(gameState, map);
      gameState.gmSession.currentEncounterMapId = map.id;
      ctx.eventBus.emit({
        type: 'exploration:area-discovered',
        timestamp: Date.now(),
        gameId,
        areaId: map.id,
        title: map.name,
        description: `Map selected: ${map.name}`,
      });
      res.json({ map, gameState, gmSession: gameState.gmSession });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Encounter Start (button-triggered) ───────────────────────
  router.post('/api/game/:gameId/gm/encounter/start', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { difficulty, mapId, autoPickMap } = req.body as { difficulty?: string; mapId?: string; autoPickMap?: boolean; };
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const previousTension = gameState.gmSession.tensionTracker.score;

      const prefsDifficulty = gameState.gmSession.campaignPreferences.encounterBalance as string;
      const chosenDifficulty: Difficulty = normalizeDifficulty(difficulty || prefsDifficulty);

      let selectedMap: EncounterMapTemplate | undefined;
      if (mapId) selectedMap = getFoundryMapById(mapId);
      else if (gameState.gmSession.currentEncounterMapId) selectedMap = getFoundryMapById(gameState.gmSession.currentEncounterMapId);
      if (!selectedMap) {
        // AI GM picks a Foundry map based on recent narrative
        const recentChat = gameState.gmSession.chatHistory.slice(-10).map((m: GMChatMessage) => m.content).join(' ');
        const avgLevel = Math.round(
          gameState.creatures.filter((c: Creature) => c.type === 'player')
            .reduce((sum: number, c: Creature) => sum + (c.level || 1), 0) /
          Math.max(1, gameState.creatures.filter((c: Creature) => c.type === 'player').length)
        );
        const aiSelection = selectMapForNarrative({
          narrativeContext: recentChat,
          theme: gameState.gmSession.campaignPreferences.mapTheme as MapGeneratorTheme,
          partyLevel: avgLevel,
          campaignId: gameId,
        });
        if (aiSelection.map) {
          applyMapTemplateToGame(gameState, aiSelection.map);
          gameState.gmSession.currentEncounterMapId = aiSelection.map.id;
          selectedMap = aiSelection.map;
          console.log(`🗺️ Button encounter: AI GM selected Foundry map "${aiSelection.map.name}" (${aiSelection.confidence}%)`);
        } else {
          const tone = gameState.gmSession?.campaignPreferences?.tone;
          const inferred = inferMapThemeFromChat(gameState.gmSession, tone);
          const procResult = generateAndApplyProceduralMap(gameState, inferred.theme, undefined, undefined, inferred.options);
          gameState.gmSession.currentEncounterMapId = procResult.id;
          selectedMap = procResult;
        }
      } else {
        applyMapTemplateToGame(gameState, selectedMap);
        gameState.gmSession.currentEncounterMapId = selectedMap.id;
      }

      const npcs = gameState.creatures.filter((c: Creature) => c.type === 'npc');
      const hostileCreatureNpcs = npcs.filter((c: Creature) => c.bestiaryName && c.npcDisposition === 'hostile');
      const nonCombatNpcs = npcs.filter((c: Creature) => !c.bestiaryName || c.npcDisposition !== 'hostile');
      if (nonCombatNpcs.length > 0) gameState.gmSession.stashedNPCs = nonCombatNpcs;
      for (const hNpc of hostileCreatureNpcs) { hNpc.type = 'creature'; hNpc.initiative = 0; console.log(`⚔️ Hostile NPC "${hNpc.name}" joins combat as enemy!`); }
      gameState.gmSession.stashedMap = gameState.map ? JSON.parse(JSON.stringify(gameState.map)) : undefined;
      gameState.gmSession.stashedMapId = gameState.gmSession.currentEncounterMapId;

      const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
      const enemies = buildEncounterEnemies(gameState, chosenDifficulty, selectedMap);
      gameState.creatures = [...players, ...hostileCreatureNpcs, ...enemies];
      gameState.creatures.forEach((c: Creature) => { c._map = gameState.map; });
      ctx.gameEngine.rerollInitiative(gameId);

      const intro = ctx.gmChatbot.generateEncounterIntro(gameState, gameState.gmSession);
      const introMsg: GMChatMessage = {
        id: `gm-encounter-start-${Date.now()}`, role: 'gm', content: intro, timestamp: Date.now(),
        mechanicalAction: { actionType: 'start-encounter', details: { difficulty: chosenDifficulty, enemyCount: enemies.length, mapId: selectedMap?.id, mapName: selectedMap?.name }, success: true },
      };
      gameState.gmSession.chatHistory.push(introMsg);
      gameState.gmSession.encounterCount += 1;
      gameState.gmSession.currentPhase = 'combat';
      gameState.gmSession.tensionTracker.score = Math.min(100, gameState.gmSession.tensionTracker.score + 15);
      gameState.gmSession.tensionTracker.trend = 'rising';
      gameState.gmSession.tensionTracker.lastUpdated = Date.now();
      gameState.gmSession.tensionTracker.history.push({ score: gameState.gmSession.tensionTracker.score, reason: 'Encounter started', timestamp: Date.now() });
      ctx.eventBus.emit({
        type: 'combat:started',
        timestamp: Date.now(),
        gameId,
        turnOrder: gameState.currentRound.turnOrder,
        creatureCount: gameState.creatures.length,
      });
      emitTensionChanged(gameId, previousTension, gameState.gmSession, 'Encounter started');

      res.json({ intro, map: selectedMap, enemies, gameState, gmSession: gameState.gmSession });
    } catch (error) {
      console.error('❌ Error starting GM encounter:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Encounter Intro Narration ────────────────────────────────
  router.post('/api/game/:gameId/gm/encounter/intro', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const previousTension = gameState.gmSession.tensionTracker.score;
      const intro = ctx.gmChatbot.generateEncounterIntro(gameState, gameState.gmSession);
      const introMsg: GMChatMessage = { id: `gm-encounter-intro-${Date.now()}`, role: 'gm', content: intro, timestamp: Date.now() };
      gameState.gmSession.chatHistory.push(introMsg);
      gameState.gmSession.encounterCount++;
      gameState.gmSession.tensionTracker.score = Math.min(100, gameState.gmSession.tensionTracker.score + 15);
      gameState.gmSession.tensionTracker.trend = 'rising';
      gameState.gmSession.tensionTracker.lastUpdated = Date.now();
      gameState.gmSession.tensionTracker.history.push({ score: gameState.gmSession.tensionTracker.score, reason: 'Encounter started', timestamp: Date.now() });
      gameState.gmSession.currentPhase = 'combat';
      emitTensionChanged(gameId, previousTension, gameState.gmSession, 'Encounter intro');
      res.json({ intro, gmSession: gameState.gmSession });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Encounter Conclusion ─────────────────────────────────────
  router.post('/api/game/:gameId/gm/encounter/conclusion', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { victory } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const previousTension = gameState.gmSession.tensionTracker.score;

      const conclusion = ctx.gmChatbot.generateEncounterConclusion(gameState, gameState.gmSession, victory !== false);
      const conclusionMsg: GMChatMessage = { id: `gm-encounter-conclusion-${Date.now()}`, role: 'gm', content: conclusion, timestamp: Date.now() };
      gameState.gmSession.chatHistory.push(conclusionMsg);

      gameState.gmSession.tensionTracker.score = Math.max(0, gameState.gmSession.tensionTracker.score - 20);
      gameState.gmSession.tensionTracker.trend = 'falling';
      gameState.gmSession.tensionTracker.lastUpdated = Date.now();
      gameState.gmSession.tensionTracker.history.push({
        score: gameState.gmSession.tensionTracker.score,
        reason: victory !== false ? 'Encounter won' : 'Party defeated',
        timestamp: Date.now(),
      });

      // XP award
      const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
      const enemies = gameState.creatures.filter((c: Creature) => c.type !== 'player');
      const partyLevel = players.length > 0
        ? Math.round(players.reduce((sum: number, c: Creature) => sum + (c.level || 1), 0) / players.length)
        : 1;
      let totalEncounterXP = 0;
      for (const enemy of enemies) totalEncounterXP += getCreatureXP(enemy.level, partyLevel);
      const xpAward = Math.max(10, totalEncounterXP);
      gameState.gmSession.xpAwarded += xpAward;

      const levelUps: { id: string; name: string; oldLevel: number; newLevel: number }[] = [];
      for (const player of players) {
        const prevXP = player.currentXP || 0;
        const newXP = prevXP + xpAward;
        if (newXP >= XP_PER_LEVEL) {
          const oldLevel = player.level;
          player.level += 1;
          player.currentXP = newXP - XP_PER_LEVEL;
          levelUps.push({ id: player.id, name: player.name, oldLevel, newLevel: player.level });
          console.log(`🎉 ${player.name} leveled up! ${oldLevel} → ${player.level} (XP: ${newXP} → ${player.currentXP})`);
        } else {
          player.currentXP = newXP;
        }
      }

      const note = ctx.gmChatbot.createSessionNote(
        gameState.gmSession,
        `Encounter ${gameState.gmSession.encounterCount}: ${victory !== false ? 'Victory' : 'Defeat'}`,
        `Party ${victory !== false ? 'defeated' : 'was defeated by'} ${enemies.map(e => e.name).join(', ')}. XP awarded: ${xpAward}.${levelUps.length > 0 ? ` Level ups: ${levelUps.map(l => `${l.name} → Lv${l.newLevel}`).join(', ')}.` : ''}`,
      );

      if (levelUps.length > 0) {
        const levelUpMsg: GMChatMessage = {
          id: `gm-levelup-${Date.now()}`, role: 'gm',
          content: `🎉 **LEVEL UP!** ${levelUps.map(l => `${l.name} has reached Level ${l.newLevel}!`).join(' ')} Open the character sheet to make your level-up choices.`,
          timestamp: Date.now(),
        };
        gameState.gmSession.chatHistory.push(levelUpMsg);
      }

      gameState.gmSession.currentPhase = 'exploration';

      // Restore stashed NPCs and exploration map
      const restoredNPCs: Creature[] = [];
      if (gameState.gmSession.stashedNPCs && gameState.gmSession.stashedNPCs.length > 0) {
        const survivingPlayers = gameState.creatures.filter((c: Creature) => c.type === 'player' && !c.dead);
        const stashedNPCs = gameState.gmSession.stashedNPCs;
        if (gameState.gmSession.stashedMap) {
          stashedNPCs.forEach((npc: Creature) => { npc._map = gameState.gmSession!.stashedMap; });
          survivingPlayers.forEach((p: Creature) => { p._map = gameState.gmSession!.stashedMap; });
        }
        gameState.creatures = [...survivingPlayers, ...stashedNPCs];
        restoredNPCs.push(...stashedNPCs);
        console.log(`🔄 Restored ${stashedNPCs.length} NPCs after encounter: ${stashedNPCs.map((n: Creature) => n.name).join(', ')}`);
      } else {
        gameState.creatures = gameState.creatures.filter((c: Creature) => c.type === 'player' && !c.dead);
      }
      if (gameState.gmSession.stashedMap) {
        gameState.map = gameState.gmSession.stashedMap;
        if (gameState.gmSession.stashedMapId) gameState.gmSession.currentEncounterMapId = gameState.gmSession.stashedMapId;
        console.log(`🗺️ Restored exploration map after encounter`);
      }
      gameState.gmSession.stashedNPCs = undefined;
      gameState.gmSession.stashedMap = undefined;
      gameState.gmSession.stashedMapId = undefined;

      emitTensionChanged(gameId, previousTension, gameState.gmSession, victory !== false ? 'Encounter won' : 'Encounter lost');
      ctx.eventBus.emit({
        type: 'combat:ended',
        timestamp: Date.now(),
        gameId,
        totalRounds: gameState.currentRound.number,
        outcome: victory !== false ? 'players' : 'enemies',
      });
      emitQuestUpdated(
        gameId,
        `encounter-${gameState.gmSession.encounterCount}`,
        `Encounter ${gameState.gmSession.encounterCount}`,
        victory !== false ? 'completed' : 'failed',
        `XP awarded: ${xpAward}`,
        'gm/encounter/conclusion',
      );

      res.json({
        conclusion, xpAward, levelUps, sessionNote: note,
        gmSession: gameState.gmSession, gameState,
        restoredNPCs: restoredNPCs.map((n: Creature) => ({ id: n.id, name: n.name })),
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Session Zero (Phase 9) ───────────────────────────────────
  router.post('/api/game/:gameId/gm/session-zero', async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const input = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }

      // Build preferences from Session Zero input
      const preferences: Partial<CampaignPreferences> = {
        campaignName: String(input.campaignName || 'Solo Campaign').slice(0, 100),
        tone: input.tone || 'heroic',
        themes: Array.isArray(input.themes) ? input.themes.slice(0, 10) : ['adventure'],
        pacing: input.pacing || 'moderate',
        encounterBalance: input.encounterBalance || 'moderate',
        customNotes: String(input.customNotes || '').slice(0, 500),
        playerCount: Math.max(1, Math.min(6, Number(input.playerCount) || 1)),
        averageLevel: Math.max(1, Math.min(20, Number(input.averageLevel) || 1)),
      };

      // Try to generate campaign framework via Session Zero generator
      let campaignFramework: CampaignFramework | null = null;
      try {
        campaignFramework = await ctx.sessionZeroGenerator.generate({
          campaignName: preferences.campaignName!,
          tone: preferences.tone!,
          themes: preferences.themes!,
          pacing: preferences.pacing!,
          encounterBalance: preferences.encounterBalance!,
          lootLevel: input.lootLevel || 'standard',
          playerCount: preferences.playerCount!,
          averageLevel: preferences.averageLevel!,
          customNotes: preferences.customNotes,
          companionAI: input.companionAI || 'full',
          narrationVerbosity: input.narrationVerbosity || 'standard',
          ruleCitations: input.ruleCitations !== false,
        });
        console.log(`🎭 Session Zero: generated campaign framework "${preferences.campaignName}"`);
      } catch (err) {
        console.warn('⚠️ Session Zero generator failed, using defaults:', err);
      }

      // Initialize GM session with these preferences
      if (!gameState.gmSession) {
        gameState.gmSession = createDefaultGMSession(preferences);
      } else {
        gameState.gmSession.campaignPreferences = {
          ...gameState.gmSession.campaignPreferences,
          ...preferences,
        };
      }

      // If framework was generated, enrich the session
      if (campaignFramework) {
        if (campaignFramework.storyArc) {
          gameState.gmSession.storyArc = {
            bbegName: campaignFramework.storyArc.bbegName || 'Unknown',
            bbegMotivation: campaignFramework.storyArc.bbegMotivation || 'Unknown',
            keyLocations: campaignFramework.storyArc.keyLocations || [],
            storyPhase: 'setup',
            milestones: campaignFramework.storyArc.milestones || [],
            secretPlots: campaignFramework.storyArc.secretPlots || [],
          };
        }
        if (Array.isArray(campaignFramework.npcs)) {
          for (const npc of campaignFramework.npcs) {
            if (!gameState.gmSession.recurringNPCs.find((n: RecurringNPC) => n.name?.toLowerCase() === npc.name?.toLowerCase())) {
              gameState.gmSession.recurringNPCs.push({
                id: `npc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: npc.name || 'Unknown NPC',
                role: npc.role || 'neutral',
                disposition: npc.disposition ?? 50,
                description: npc.description || '',
                interactions: [],
                isAlive: true,
                location: npc.location || 'Unknown',
              });
            }
          }
        }
      }

      // Store Session Zero metadata on the GM session
      gameState.gmSession.sessionZeroComplete = true;
      gameState.gmSession.lootLevel = input.lootLevel || 'standard';
      gameState.gmSession.companionAI = input.companionAI || 'full';
      gameState.gmSession.narrationVerbosity = input.narrationVerbosity || 'standard';
      gameState.gmSession.ruleCitations = input.ruleCitations !== false;

      // Add welcome message
      const welcomeMsg: GMChatMessage = {
        id: `gm-session-zero-${Date.now()}`,
        role: 'gm',
        content: campaignFramework?.openingNarration
          || `Welcome to "${preferences.campaignName}"! Your ${preferences.tone} campaign is ready. The AI Game Master awaits your first move. Type anything to begin your adventure!`,
        timestamp: Date.now(),
      };
      gameState.gmSession.chatHistory.push(welcomeMsg);

      emitQuestUpdated(
        gameId,
        'campaign-start',
        preferences.campaignName || 'Campaign Start',
        'introduced',
        welcomeMsg.content.slice(0, 240),
        'gm/session-zero',
      );

      console.log(`🎭 Session Zero complete for game ${gameId}: "${preferences.campaignName}" (${preferences.tone})`);
      res.json({ gmSession: gameState.gmSession, gameState, campaignFramework });
    } catch (error) {
      console.error('❌ Error in Session Zero:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Runtime GM Settings (Phase 9) ────────────────────────────
  router.put('/api/game/:gameId/gm/settings', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { companionAI, narrationVerbosity, ruleCitations, lootLevel } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }

      const VALID_COMPANION = ['full', 'assisted', 'manual'];
      const VALID_VERBOSITY = ['brief', 'standard', 'detailed', 'elaborate'];
      const VALID_LOOT = ['standard', 'high'];

      if (companionAI && VALID_COMPANION.includes(companionAI)) gameState.gmSession.companionAI = companionAI;
      if (narrationVerbosity && VALID_VERBOSITY.includes(narrationVerbosity)) gameState.gmSession.narrationVerbosity = narrationVerbosity;
      if (typeof ruleCitations === 'boolean') gameState.gmSession.ruleCitations = ruleCitations;
      if (lootLevel && VALID_LOOT.includes(lootLevel)) gameState.gmSession.lootLevel = lootLevel;

      res.json({
        companionAI: gameState.gmSession.companionAI,
        narrationVerbosity: gameState.gmSession.narrationVerbosity,
        ruleCitations: gameState.gmSession.ruleCitations,
        lootLevel: gameState.gmSession.lootLevel,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── World State Summary (Phase 9) ────────────────────────────
  router.get('/api/game/:gameId/gm/world-state', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }

      // Extract quest-like info from session notes and story arc
      const quests: { id: string; title: string; status: string; description: string }[] = [];
      const session = gameState.gmSession;

      // Derive quests from story arc milestones
      if (session.storyArc?.milestones) {
        for (let i = 0; i < session.storyArc.milestones.length; i++) {
          const m = session.storyArc.milestones[i];
          quests.push({
            id: `milestone-${i}`,
            title: typeof m === 'string' ? m : ((m as { title?: string }).title || `Milestone ${i + 1}`),
            status: typeof m === 'object' && m !== null && Boolean((m as { completed?: boolean }).completed) ? 'completed' : 'active',
            description: typeof m === 'object' && m !== null ? ((m as { description?: string }).description || '') : '',
          });
        }
      }

      // Simple calendar based on encounter count (approximation)
      const daysElapsed = Math.max(1, (session.encounterCount ?? 0) * 2 + (session.sessionNotes?.length ?? 0));
      const seasons = ['Abadius (Winter)', 'Calistril (Winter)', 'Pharast (Spring)', 'Gozran (Spring)', 'Desnus (Spring)', 'Sarenith (Summer)', 'Erastus (Summer)', 'Arodus (Summer)', 'Rova (Autumn)', 'Lamashan (Autumn)', 'Neth (Autumn)', 'Kuthona (Winter)'];
      const seasonIdx = Math.floor(((daysElapsed - 1) / 30)) % 12;
      const hoursOfDay = [
        'Dawn', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Night',
      ];
      const timeIdx = (session.encounterCount + (session.sessionNotes?.length || 0)) % hoursOfDay.length;

      res.json({
        quests,
        calendar: {
          day: daysElapsed,
          season: seasons[seasonIdx],
          timeOfDay: hoursOfDay[timeIdx],
        },
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Encounter Preview (Phase 9) ──────────────────────────────
  router.post('/api/game/:gameId/gm/encounter/preview', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { difficulty } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }

      const chosenDifficulty = normalizeDifficulty(difficulty || 'moderate');
      const players = gameState.creatures.filter((c: Creature) => c.type === 'player');
      const avgLevel = players.length > 0
        ? Math.round(players.reduce((sum: number, c: Creature) => sum + (c.level || 1), 0) / players.length)
        : 1;

      // Generate preview enemies on a shallow copy — never mutate actual game state for a preview
      const previewState = { ...gameState, creatures: [...gameState.creatures] };
      const enemies = buildEncounterEnemies(previewState, chosenDifficulty, undefined);
      // Extract only the newly-added creatures (those not in the original list)
      const originalIds = new Set(gameState.creatures.map((c: Creature) => c.id));
      const newEnemies = previewState.creatures.filter((c: Creature) => !originalIds.has(c.id));
      const previewEnemies = newEnemies.map((e: Creature) => ({
        name: e.name,
        level: e.level || 0,
        hp: e.maxHealth || 1,
        description: (e as Creature & { bestiaryDescription?: string }).bestiaryDescription || '',
      }));

      // Calculate XP
      let totalXP = 0;
      for (const e of newEnemies) totalXP += getCreatureXP(e.level, avgLevel);

      // Get map name
      let mapName: string | undefined;
      if (gameState.gmSession?.currentEncounterMapId) {
        const map = getFoundryMapById(gameState.gmSession.currentEncounterMapId);
        if (map) mapName = map.name;
      }

      // Simple narrative hook based on tone
      const hooks: Record<string, string[]> = {
        heroic: ['The ground trembles as danger approaches...', 'Steel gleams in the torchlight as foes emerge!', 'A horn sounds in the distance — battle draws near.'],
        gritty: ['Blood and darkness await around the corner...', 'The stench of death fills the air.', 'Shadows move with hostile intent.'],
        horror: ['Something unspeakable stirs in the darkness...', 'A chill runs down your spine as shapes emerge.', 'The silence is broken by an inhuman shriek.'],
        'dungeon-crawl': ['You hear movement beyond the next door...', 'The chamber ahead is not empty.', 'Territorial creatures guard the passage.'],
      };
      const tone = gameState.gmSession?.campaignPreferences?.tone || 'heroic';
      const toneHooks = hooks[tone] || hooks.heroic;
      const narrativeHook = toneHooks[Math.floor(Math.random() * toneHooks.length)];

      res.json({
        difficulty: chosenDifficulty,
        enemies: previewEnemies,
        mapName,
        narrativeHook,
        xpReward: Math.max(10, totalXP),
      });
    } catch (error) {
      console.error('❌ Error in encounter preview:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── Downtime Activities (Phase 9) ────────────────────────────
  router.get('/api/game/:gameId/gm/downtime/activities', (req: Request, res: Response) => {
    const { gameId } = req.params;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState) { res.status(404).json({ error: 'Game not found' }); return; }

      // Base activities always available
      const activities: Array<{ id: string; name: string; icon: string; description: string; daysRequired: number }> = [
        { id: 'long-rest', name: 'Rest & Recover', icon: '😴', description: 'Full rest — restore HP and daily resources.', daysRequired: 1 },
        { id: 'gather-info', name: 'Gather Information', icon: '🔍', description: 'Ask around to learn about the area, rumors, or people.', daysRequired: 1 },
        { id: 'earn-income', name: 'Earn Income', icon: '💰', description: 'Use a skill to earn money during your downtime.', daysRequired: 1 },
        { id: 'retrain', name: 'Retrain', icon: '📖', description: 'Retrain a feat, skill, or class feature with a trainer.', daysRequired: 7 },
      ];

      // Check for merchant NPCs to enable shopping
      const merchants = (gameState.gmSession?.recurringNPCs || []).filter((n: RecurringNPC) => n.role === 'merchant');
      for (const merchant of merchants.slice(0, 3)) {
        activities.push({
          id: 'shop-' + merchant.id,
          name: `Shop at ${merchant.name}`,
          icon: '🏪',
          description: `Browse ${merchant.name}'s wares`,
          daysRequired: 0,
        });
      }

      res.json({ activities });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  router.post('/api/game/:gameId/gm/downtime/perform', async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { activityId, days } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }
      const previousTension = gameState.gmSession.tensionTracker.score;

      const safeDays = Math.max(0, Math.min(30, Number(days) || 1));
      const safeActivityId = String(activityId || '').slice(0, 100);

      // Generate narrative response for the activity
      let narrative = '';
      try {
        const result = await ctx.gmChatbot.processMessage(
          `I want to spend ${safeDays} day(s) performing the downtime activity: ${safeActivityId}. Describe what happens.`,
          gameState,
          gameState.gmSession,
        );
        narrative = result.response.content;
        gameState.gmSession.chatHistory.push(result.response);
        if (result.sessionUpdates.tensionTracker) {
          gameState.gmSession.tensionTracker = result.sessionUpdates.tensionTracker;
          emitTensionChanged(gameId, previousTension, gameState.gmSession, `Downtime: ${safeActivityId}`);
        }
      } catch {
        narrative = `You spend ${safeDays} day(s) on ${safeActivityId}. The time passes uneventfully.`;
        const fallbackMsg: GMChatMessage = {
          id: `gm-downtime-${Date.now()}`,
          role: 'gm',
          content: narrative,
          timestamp: Date.now(),
        };
        gameState.gmSession.chatHistory.push(fallbackMsg);
      }

      // Handle healing during rest
      if (safeActivityId === 'long-rest') {
        for (const c of gameState.creatures.filter((c: Creature) => c.type === 'player')) {
          c.currentHealth = c.maxHealth;
          c.conditions = [];
        }
      }

      // Set phase to downtime
      gameState.gmSession.currentPhase = 'rest';
      emitTimeAdvanced(gameId, safeDays, 'days', `Downtime activity: ${safeActivityId}`);

      if (safeActivityId === 'earn-income') {
        ctx.eventBus.emit({
          type: 'downtime:income-earned',
          timestamp: Date.now(),
          gameId,
          amount: 0,
          currency: 'gp',
          source: 'earn-income',
          daysSpent: safeDays,
        });
      } else if (safeActivityId === 'retrain') {
        ctx.eventBus.emit({
          type: 'downtime:retrain-complete',
          timestamp: Date.now(),
          gameId,
          target: 'retraining',
          daysSpent: safeDays,
        });
      } else if (safeActivityId === 'gather-info') {
        ctx.eventBus.emit({
          type: 'downtime:rumor-heard',
          timestamp: Date.now(),
          gameId,
          rumor: narrative.slice(0, 240),
        });
      } else if (safeActivityId.startsWith('craft')) {
        ctx.eventBus.emit({
          type: 'downtime:crafting-complete',
          timestamp: Date.now(),
          gameId,
          itemName: 'Crafting task',
          daysSpent: safeDays,
        });
      }

      res.json({ narrative, gmSession: gameState.gmSession, gameState });
    } catch (error) {
      console.error('❌ Error in downtime activity:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // ─── XP Award (referenced by GMChatPanel) ─────────────────────
  router.post('/api/game/:gameId/xp/award', (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { amount, reason } = req.body;
    try {
      const gameState = ctx.gameEngine.getGameState(gameId);
      if (!gameState || !gameState.gmSession) { res.status(404).json({ error: 'Game or GM session not found' }); return; }

      const xpAmount = Math.max(0, Math.min(1000, Number(amount) || 0));
      gameState.gmSession.xpAwarded += xpAmount;

      const levelUps: { id: string; name: string; oldLevel: number; newLevel: number }[] = [];
      for (const player of gameState.creatures.filter((c: Creature) => c.type === 'player')) {
        const prevXP = Math.max(0, player.currentXP ?? 0);
        const oldLevel = Math.max(1, player.level ?? 1);
        const newXP = prevXP + xpAmount;
        if (newXP >= XP_PER_LEVEL) {
          player.level = oldLevel + 1;
          player.currentXP = newXP - XP_PER_LEVEL;
          levelUps.push({ id: player.id, name: player.name, oldLevel, newLevel: player.level });
        } else {
          player.currentXP = newXP;
        }
      }

      res.json({ xpAwarded: xpAmount, gmSession: gameState.gmSession, levelUps });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
