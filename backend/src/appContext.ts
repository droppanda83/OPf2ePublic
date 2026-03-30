import { GameEngine } from './game/engine';
import { AIManager } from './ai/manager';
import { GMChatbot } from './ai/gmChatbot';
import { AIProviders } from './ai/providers';
import { PersistenceManager } from './persistence/persistenceManager';
import { BugReportManager } from './persistence/bugReportManager';

/**
 * Shared application context passed to all route modules.
 * Holds singleton service references so routes don't need direct imports.
 */
export interface AppContext {
  gameEngine: GameEngine;
  aiManager: AIManager;
  gmChatbot: GMChatbot;
  aiProviders: AIProviders;
  persistenceManager: PersistenceManager;
  bugReportManager: BugReportManager;
}
