import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameEngine } from './game/engine';
import { AIManager } from './ai/manager';

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

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Game endpoints
app.post('/api/game/create', (req: Request, res: Response) => {
  console.log('🎮 Game create endpoint hit');
  console.log('📦 Request body:', req.body);
  const { players, creatures, mapSize } = req.body;
  try {
    console.log('🔄 Creating game with', players.length, 'players and', creatures.length, 'creatures');
    const gameState = gameEngine.createGame(players, creatures, mapSize);
    console.log('✅ Game created:', gameState.id);
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
  const { creatureId, actionId, targetId, targetPosition } = req.body;
  try {
    console.log('🔄 Executing action:', actionId, 'for creature:', creatureId);
    console.log('📍 Target ID:', targetId, 'Target Position:', targetPosition);
    const result = gameEngine.executeAction(
      gameId,
      creatureId,
      actionId,
      targetId,
      targetPosition
    );
    console.log('✅ Action executed:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error executing action:', error);
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
