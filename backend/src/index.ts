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
import { GameEventBus } from './events/eventBus';
import { registerNarrationSubscriber } from './events/narrationSubscriber';
import { ContextCompiler } from './services/contextCompiler';
import { KnowledgeBase } from './services/knowledgeBase';
import { initTokenArtService } from './services/tokenArtService';
import { LLMService, CloudLLMProvider, OllamaProvider, LlamaCppProvider } from './ai/llm';
import type { LLMServiceConfig } from './ai/llm';
import { NarratorAI, TacticianAI, StoryAI, ExplorationAI, DowntimeAI, EncounterAI } from './ai/roles';
import { AIGMCoordinator } from './ai/coordinator';
import type { CoordinatorDependencies } from './ai/coordinator';
import { WorldMemory } from './ai/memory';
import { SessionZeroGenerator, NPCGenerator, CreatureBuilder, TreasureGenerator, AdventureArcGenerator, ContentGenerator } from './ai/generators';

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
const eventBus = new GameEventBus({ debug: process.env.EVENT_BUS_DEBUG === 'true' });
const gameEngine = new GameEngine(eventBus);
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
const contextCompiler = new ContextCompiler();
const knowledgeBase = new KnowledgeBase({
  contentDirs: [
    path.resolve(__dirname, '../../.vscode/PF2eRebirth/shared'),
    path.resolve(__dirname, '../../shared'),
  ],
  cachePath: path.resolve(__dirname, '../../data/rag-cache.json'),
});

// ─── LLM Service (Phase 4) ─────────────────────────────────
const defaultModel = (process.env.OPENAI_MODEL || 'gpt-5').trim();
const llmConfig: LLMServiceConfig = {
  defaultRole: {
    model: defaultModel,
    temperature: 0.7,
    maxTokens: 1024,
    timeoutMs: 30000,
    fallbackModels: process.env.LLM_FALLBACK_MODELS
      ? process.env.LLM_FALLBACK_MODELS.split(',').map(s => s.trim())
      : [],
  },
  roles: {
    narrator: {
      model: process.env.LLM_NARRATOR_MODEL || defaultModel,
      temperature: 0.8,
      maxTokens: 300,
      timeoutMs: 5000,
    },
    tactician: {
      model: process.env.LLM_TACTICIAN_MODEL || defaultModel,
      temperature: 0.4,
      maxTokens: 500,
      timeoutMs: 8000,
    },
    story: {
      model: process.env.LLM_STORY_MODEL || defaultModel,
      temperature: 0.9,
      maxTokens: 800,
      timeoutMs: 15000,
    },
    encounter: {
      model: process.env.LLM_ENCOUNTER_MODEL || defaultModel,
      temperature: 0.7,
      maxTokens: 1200,
      timeoutMs: 30000,
    },
  },
  globalFallbackModels: process.env.LLM_GLOBAL_FALLBACKS
    ? process.env.LLM_GLOBAL_FALLBACKS.split(',').map(s => s.trim())
    : [],
  debug: process.env.LLM_DEBUG === 'true',
};
const llmService = new LLMService(llmConfig);

// Register cloud provider (wraps existing AIProviders)
llmService.registerProvider(new CloudLLMProvider(aiProviders));

// Register local providers (will be unavailable until hardware/software is set up,
// but the service gracefully skips unavailable providers)
const ollamaProvider = new OllamaProvider({
  baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
});
const llamaCppProvider = new LlamaCppProvider({
  baseUrl: process.env.LLAMACPP_URL || 'http://localhost:8080',
});
llmService.registerProvider(ollamaProvider);
llmService.registerProvider(llamaCppProvider);

// ─── Role-Based AI Services (Phase 5) ──────────────────────
const roleDeps = { llmService, contextCompiler, knowledgeBase, eventBus };
const narratorAI = new NarratorAI(roleDeps);
const tacticianAI = new TacticianAI(roleDeps);
const storyAI = new StoryAI(roleDeps);
const explorationAI = new ExplorationAI(roleDeps);
const downtimeAI = new DowntimeAI(roleDeps);
const encounterAI = new EncounterAI(roleDeps);

// ─── AI GM Coordinator (Phase 6) ────────────────────────────
const coordinatorDeps: CoordinatorDependencies = {
  llmService,
  contextCompiler,
  knowledgeBase,
  eventBus,
  gameEngine,
  narratorAI,
  tacticianAI,
  storyAI,
  explorationAI,
  downtimeAI,
  encounterAI,
};
const coordinator = new AIGMCoordinator(coordinatorDeps);

// ─── Persistent World Memory (Phase 7) ──────────────────────
const worldMemory = new WorldMemory(
  { llmService, contextCompiler, knowledgeBase },
  'saves',
);

// ─── Adventure & Encounter Generators (Phase 8) ─────────────
const generatorDeps = { llmService, contextCompiler, knowledgeBase, eventBus, worldMemory };
const sessionZeroGenerator = new SessionZeroGenerator(generatorDeps);
const npcGenerator = new NPCGenerator(generatorDeps);
const creatureBuilder = new CreatureBuilder(generatorDeps);
const treasureGenerator = new TreasureGenerator(generatorDeps);
const adventureArcGenerator = new AdventureArcGenerator(generatorDeps);
const contentGenerator = new ContentGenerator(generatorDeps);

// ─── Application context ───────────────────────────────────
const ctx: AppContext = {
  gameEngine,
  aiManager,
  gmChatbot,
  aiProviders,
  persistenceManager,
  bugReportManager,
  eventBus,
  contextCompiler,
  knowledgeBase,
  llmService,
  narratorAI,
  tacticianAI,
  storyAI,
  explorationAI,
  downtimeAI,
  encounterAI,
  coordinator,
  worldMemory,
  sessionZeroGenerator,
  npcGenerator,
  creatureBuilder,
  treasureGenerator,
  adventureArcGenerator,
  contentGenerator,
};

// ─── Event Bus subscribers ──────────────────────────────────
registerNarrationSubscriber(eventBus, gmChatbot, gameEngine);
coordinator.start(); // Phase 6: coordinator event subscriptions

// ─── Token Art Service ──────────────────────────────────────
const publicDir = path.join(__dirname, '../../frontend/public');
initTokenArtService(publicDir);

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

const artPath = path.join(__dirname, '../../frontend/public/art');
app.use('/art', express.static(artPath));

const texturesPath = path.join(__dirname, '../../frontend/public/textures');
app.use('/textures', express.static(texturesPath));

const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA catch-all
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ─── Start server ───────────────────────────────────────────
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  // Initialize RAG knowledge base in background (non-blocking)
  knowledgeBase.initialize().catch(err =>
    console.error('📚 KnowledgeBase initialization failed:', err)
  );
  // Probe local LLM providers (non-blocking — logs availability)
  ollamaProvider.checkAvailability().then(ok => {
    if (ok) console.log('🦙 Ollama provider is available');
  }).catch(() => {});
  llamaCppProvider.checkAvailability().then(ok => {
    if (ok) console.log('🖥️  llama.cpp provider is available');
  }).catch(() => {});
});
