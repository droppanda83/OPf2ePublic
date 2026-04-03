import { GameEngine } from './game/engine';
import { AIManager } from './ai/manager';
import { GMChatbot } from './ai/gmChatbot';
import { AIProviders } from './ai/providers';
import { LLMService } from './ai/llm';
import { PersistenceManager } from './persistence/persistenceManager';
import { BugReportManager } from './persistence/bugReportManager';
import { GameEventBus } from './events/eventBus';
import { ContextCompiler } from './services/contextCompiler';
import { KnowledgeBase } from './services/knowledgeBase';
import { NarratorAI, TacticianAI, StoryAI, ExplorationAI, DowntimeAI, EncounterAI } from './ai/roles';
import { AIGMCoordinator } from './ai/coordinator';
import { WorldMemory } from './ai/memory';
import { SessionZeroGenerator, NPCGenerator, CreatureBuilder, TreasureGenerator, AdventureArcGenerator, ContentGenerator } from './ai/generators';

/**
 * Shared application context passed to all route modules.
 * Holds singleton service references so routes don't need direct imports.
 */
export interface AppContext {
  gameEngine: GameEngine;
  aiManager: AIManager;
  gmChatbot: GMChatbot;
  aiProviders: AIProviders;
  llmService: LLMService;
  persistenceManager: PersistenceManager;
  bugReportManager: BugReportManager;
  eventBus: GameEventBus;
  contextCompiler: ContextCompiler;
  knowledgeBase: KnowledgeBase;
  narratorAI: NarratorAI;
  tacticianAI: TacticianAI;
  storyAI: StoryAI;
  explorationAI: ExplorationAI;
  downtimeAI: DowntimeAI;
  encounterAI: EncounterAI;
  coordinator: AIGMCoordinator;
  worldMemory: WorldMemory;
  sessionZeroGenerator: SessionZeroGenerator;
  npcGenerator: NPCGenerator;
  creatureBuilder: CreatureBuilder;
  treasureGenerator: TreasureGenerator;
  adventureArcGenerator: AdventureArcGenerator;
  contentGenerator: ContentGenerator;
}
