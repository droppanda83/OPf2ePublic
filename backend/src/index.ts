import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameEngine } from './game/engine';
import { AIManager } from './ai/manager';
import { PersistenceManager } from './persistence/persistenceManager';
import { buildEncounter, Difficulty, DIFFICULTIES } from 'pf2e-shared';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

const gameEngine = new GameEngine();
const aiManager = new AIManager(process.env.OPENAI_API_KEY || '');
const persistenceManager = new PersistenceManager('saves');

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Persistence endpoints (MUST be before /api/game/:gameId routes)
app.get('/api/game/saves', (req: Request, res: Response) => {
  try {
    const saves = persistenceManager.listSaves();
    res.json({ saves });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/game/load/:saveId', (req: Request, res: Response) => {
  const { saveId } = req.params;
  try {
    const gameSave = persistenceManager.loadGame(saveId);
    if (!gameSave) {
      res.status(404).json({ error: 'Save not found' });
      return;
    }
    const loadedGameState = gameSave.gameState;
    gameEngine.loadGameState(loadedGameState);
    res.json(loadedGameState);
  } catch (error) {
    console.error('❌ Error loading game:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.delete('/api/game/saves/:saveId', (req: Request, res: Response) => {
  const { saveId } = req.params;
  try {
    const success = persistenceManager.deleteSave(saveId);
    if (!success) {
      res.status(404).json({ error: 'Save not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ─── Encounter / Bestiary endpoint ─────────────────
app.get('/api/bestiary/encounter', (req: Request, res: Response) => {
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

// Game endpoints
app.post('/api/game/create', (req: Request, res: Response) => {
  console.log('🎮 Game create endpoint hit');
  const { players, creatures, mapSize } = req.body;
  
  // Debug: Log what we receive from the frontend for players
  console.log(`\n[BACKEND] ===== GAME CREATE REQUEST =====`);
  console.log(`[BACKEND] Players count: ${players?.length || 0}`);
  if (players && players.length > 0) {
    players.forEach((p: any, i: number) => {
      console.log(`[BACKEND] Player ${i} (${p.name}):`, {
        hasSkills: !!p.skills,
        skillsCount: p.skills?.length,
        hasFeats: !!p.feats,
        featsCount: p.feats?.length,
        hasSpecials: !!p.specials,
        specialsCount: p.specials?.length,
        specials: p.specials,
        hasSpells: !!p.spells,
        spellsCount: p.spells?.length,
        hasFocusSpells: !!p.focusSpells,
        focusSpellsCount: p.focusSpells?.length,
        focusSpells: p.focusSpells,
        hasLores: !!p.lores,
        loresCount: p.lores?.length
      });
    });
  }
  
  console.log(`[BACKEND] Creatures count: ${creatures?.length || 0}`);
  if (creatures && creatures.length > 0) {
    creatures.forEach((c: any, i: number) => {
      console.log(`🦸 Creature ${i} (${c.name}):`, {
        equippedWeapon: c.equippedWeapon,
        bonuses: c.bonuses?.map((b: any) => ({ value: b.value, applyTo: b.applyTo, source: b.source })),
        bonusesCount: c.bonuses?.length || 0
      });
    });
  }
  
  try {
    console.log('🔄 Creating game with', players.length, 'players and', creatures.length, 'creatures');
    const gameState = gameEngine.createGame(players, creatures, mapSize);
    console.log(`✅ Game created: ${gameState.id}`);
    
    // Debug: Log what comes OUT of createGame
    console.log(`[BACKEND] ===== GAME STATE CREATED =====`);
    gameState.creatures.forEach((c: any, i: number) => {
      console.log(`[BACKEND] GameState Creature ${i} (${c.name}):`, {
        hasSkills: !!c.skills,
        skillsCount: c.skills?.length,
        skills: c.skills?.slice(0, 2).map((s: any) => `${s.name}(${s.proficiency})`),
        hasFeacials: !!c.specials,
        specialsCount: c.specials?.length,
        specials: c.specials,
        hasSpets: !!c.feats,
        featsCount: c.feats?.length,
        feats: c.feats?.slice(0, 2).map((f: any) => `${f.name}(${f.type})`),
        hasSpells: !!c.spells,
        spellsCount: c.spells?.length,
        hasFocusSpells: !!c.focusSpells,
        focusSpellsCount: c.focusSpells?.length,
        focusSpells: c.focusSpells
      });
    });
    console.log(`[BACKEND] =============================\n`);
    
    // Debug: log the actual creatures with their shield properties
    console.log('🛡️ Game creatures shield properties:');
    gameState.creatures.forEach((c, i) => {
      console.log(`🛡️ Creature ${i} (${c.name}):`, {
        equippedWeapon: c.equippedWeapon,
        equippedShield: c.equippedShield,
        shieldRaised: c.shieldRaised,
        currentShieldHp: c.currentShieldHp,
        proficiencies: {
          martialWeapons: c.proficiencies?.martialWeapons,
          simpleWeapons: c.proficiencies?.simpleWeapons,
          unarmed: c.proficiencies?.unarmed
        },
        bonuses: c.bonuses?.map((b: any) => ({ value: b.value, applyTo: b.applyTo }))
      });
    });
    
    res.json(gameState);
  } catch (error) {
    console.error('❌ Error creating game:', error);
    res.status(400).json({ error: String(error) });
  }
});

app.post('/api/game/:gameId/action', (req: Request, res: Response) => {
  console.log('🎬 Action endpoint hit');
  console.log('📦 Request body:', req.body);
  const { gameId } = req.params;
  const { creatureId, actionId, targetId, targetPosition, weaponId, pickupDestination, heroPointsSpent } = req.body;
  try {
    console.log('🔄 Executing action:', {
      actionId,
      creatureId,
      targetId,
      heroPointsSpent: heroPointsSpent ?? 'NONE',
      weaponId: weaponId ?? 'NONE'
    });
    const result = gameEngine.executeAction(
      gameId,
      creatureId,
      actionId,
      targetId,
      targetPosition,
      weaponId,
      pickupDestination,
      heroPointsSpent
    );
    console.log('✅ Action result received:', {
      success: result.result?.success,
      message: result.result?.message,
      hasDetails: !!result.result?.details,
      hasHeroPointMessage: !!result.result?.details?.heroPointMessage
    });
    
    // Debug: Log the creature state before sending to frontend
    const gameState = gameEngine.getGameState(gameId);
    const actor = gameState?.creatures.find((c) => c.id === creatureId);
    if (actor) {
      console.log('🔍 Creature state:', {
        name: actor.name,
        heroPoints: actor.heroPoints
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error executing action:', error);
    res.status(400).json({ error: String(error) });
  }
});

app.post('/api/game/:gameId/start-turn', (req: Request, res: Response) => {
  console.log('🌅 Start turn endpoint hit');
  const { gameId } = req.params;
  const { creatureId } = req.body;
  try {
    console.log('🔄 Starting turn for creature:', creatureId);
    const result = gameEngine.startTurn(gameId, creatureId);
    console.log('✅ Turn started, persistent damage processed:', result.persistentDamageEntries.length);
    res.json(result);
  } catch (error) {
    console.error('❌ Error starting turn:', error);
    res.status(400).json({ error: String(error) });
  }
});

app.post('/api/game/:gameId/end-turn', (req: Request, res: Response) => {
  console.log('🏁 End turn endpoint hit');
  const { gameId } = req.params;
  try {
    console.log('🔄 Ending turn for game:', gameId);
    const gameState = gameEngine.endTurn(gameId);
    const nextCreatureId = gameState.currentRound.turnOrder[gameState.currentRound.currentTurnIndex];
    console.log('✅ Turn ended, next creature:', nextCreatureId);
    res.json({ gameState });
  } catch (error) {
    console.error('❌ Error ending turn:', error);
    res.status(400).json({ error: String(error) });
  }
});

app.get('/api/game/:gameId', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const gameState = gameEngine.getGameState(gameId);
  if (!gameState) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json(gameState);
});

app.post('/api/game/:gameId/ai-turn', async (req: Request, res: Response) => {
  const { gameId } = req.params;
  try {
    const result = await aiManager.decideTurn(gameId, gameEngine);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Add creatures to existing game
app.post('/api/game/:gameId/add-creatures', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { creatures } = req.body;
  console.log(`📥 Add creatures endpoint called`);
  console.log(`   GameID: ${gameId}`);
  console.log(`   Creatures count: ${creatures?.length || 0}`);
  
  // Debug: Check what data we received for skills/feats/spells
  if (creatures && creatures.length > 0) {
    creatures.forEach((c: any, idx: number) => {
      console.log(`[Backend] Creature ${idx} received:`, {
        name: c.name,
        skills: c.skills,
        skillsCount: c.skills?.length,
        feats: c.feats,
        featsCount: c.feats?.length,
        spells: c.spells,
        spellsCount: c.spells?.length
      });
    });
  }
  
  try {
    if (!creatures || !Array.isArray(creatures) || creatures.length === 0) {
      console.error('   ❌ No creatures provided');
      res.status(400).json({ error: 'No creatures provided' });
      return;
    }

    const gameState = gameEngine.getGameState(gameId);
    if (!gameState) {
      const availableIds = gameEngine.getAvailableGameIds();
      console.error(`   ❌ Game not found with ID: ${gameId}`);
      console.error(`   Available game IDs: ${availableIds.length === 0 ? 'NONE' : availableIds.join(', ')}`);
      res.status(404).json({ error: `Game not found: ${gameId}` });
      return;
    }
    console.log(`   ✅ Found game: ${gameState.id}`);

    console.log(`📝 Adding ${creatures.length} creatures to game ${gameId}`);
    
    // Add creatures to game state
    const newCreatures = creatures.map((creature: any) => ({
      ...creature,
      id: creature.id || `creature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Ensure required fields have values
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

// Persistence endpoints
app.post('/api/game/:gameId/save', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { saveName } = req.body;
  try {
    const gameState = gameEngine.getGameState(gameId);
    if (!gameState) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    const metadata = persistenceManager.saveGame(gameState, saveName);
    res.json({ success: true, metadata });
  } catch (error) {
    console.error('❌ Error saving game:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
