/**
 * Backend entry point — Express server setup, middleware, service wiring, route mounting.
 * Route handlers live in routes/*.ts; helpers in routeHelpers.ts.
 * Refactored from a ~2700-line monolith during Audit Phase E.3.
 */
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { GameEngine } from './game/engine';
import { AIManager } from './ai/manager';
import { GMChatbot } from './ai/gmChatbot';
import { AIProviders } from './ai/providers';
import { PersistenceManager } from './persistence/persistenceManager';
import { BugReportManager } from './persistence/bugReportManager';

import type { AppContext } from './appContext';
import { createSaveRoutes } from './routes/saveRoutes';
import { createGameRoutes } from './routes/gameRoutes';
import { createGMRoutes } from './routes/gmRoutes';
import { createMapRoutes } from './routes/mapRoutes';
import { createMiscRoutes } from './routes/miscRoutes';

// ─── Environment ─────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });
dotenv.config(); // fallback: project-root .env

const app: Express = express();
const port = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Request logging
app.use((req: Request, _res: Response, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// ─── Service instantiation ──────────────────────────────────
const gameEngine = new GameEngine();
const aiProviders = new AIProviders({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
});
const aiManager = new AIManager(aiProviders);
const gmChatbot = new GMChatbot(aiProviders);
const persistenceManager = new PersistenceManager('saves');
const bugReportManager = new BugReportManager('saves');

// ─── Application context ───────────────────────────────────
const ctx: AppContext = {
  gameEngine,
  aiManager,
  gmChatbot,
  aiProviders,
  persistenceManager,
  bugReportManager,
};

// ─── Mount route modules ────────────────────────────────────
// Order matters: save routes MUST be before /api/game/:gameId routes
app.use(createSaveRoutes(ctx));
app.use(createMiscRoutes(ctx));   // health, AI models, campaign, bugs, atlas, XP, creature mgmt
app.use(createMapRoutes(ctx));    // bestiary/encounter, map catalog
app.use(createGameRoutes(ctx));   // game CRUD, actions, turns, AI turn
app.use(createGMRoutes(ctx));     // GM session, chat, exploration, encounters

// ─── Static file serving ────────────────────────────────────
const mapsPath = path.join(__dirname, '../../frontend/public/maps');
app.use('/maps', express.static(mapsPath));

const tokensPath = path.join(__dirname, '../../frontend/public/tokens');
app.use('/tokens', express.static(tokensPath));

const texturesPath = path.join(__dirname, '../../frontend/public/textures');
app.use('/textures', express.static(texturesPath));

const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA catch-all
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ─── Start server ───────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
