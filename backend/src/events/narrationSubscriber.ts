/**
 * Combat Narration Subscriber — Listens to EventBus and generates AI narration.
 *
 * Replaces the fire-and-forget narration code previously in gameRoutes.ts.
 * The GM chatbot generates narrative descriptions of combat events and pushes
 * them to the GM session's chat history.
 */
import type { GameEventBus } from './eventBus';
import type { GMChatbot } from '../ai/gmChatbot';
import type { GameEngine } from '../game/engine';
import type { GameLog, GMChatMessage, ActionExecutedEvent } from 'pf2e-shared';

/**
 * Register the combat narration subscriber on the event bus.
 * Call once during server startup.
 */
export function registerNarrationSubscriber(
  eventBus: GameEventBus,
  gmChatbot: GMChatbot,
  gameEngine: GameEngine
): () => void {
  const unsubscribe = eventBus.on('action:executed', (event: ActionExecutedEvent) => {
    const gameState = gameEngine.getGameState(event.gameId);
    if (!gameState) return;
    if (!gameState.gmSession?.combatNarrationEnabled) return;

    const logEntry = event.logEntry;
    if (!logEntry || logEntry.type === 'system') return;

    gmChatbot.narrateCombatEvent(logEntry, gameState, gameState.gmSession)
      .then(narrative => {
        if (narrative && gameState.gmSession) {
          const narrationMsg: GMChatMessage = {
            id: `narration-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
            role: 'gm',
            content: narrative,
            timestamp: Date.now(),
          };
          gameState.gmSession.chatHistory.push(narrationMsg);
        }
      })
      .catch(err => console.warn('Combat narration failed (non-blocking):', err));
  });

  return unsubscribe;
}
