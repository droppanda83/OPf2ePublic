import { OpenAI } from 'openai';
import { GameEngine } from '../game/engine';
import { AITurnResponse } from 'pf2e-shared';

export class AIManager {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async decideTurn(gameId: string, gameEngine: GameEngine): Promise<AITurnResponse> {
    const gameState = gameEngine.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const currentCreatureIndex = gameState.currentRound.currentTurnIndex;
    const currentCreatureId = gameState.currentRound.turnOrder[currentCreatureIndex];
    const currentCreature = gameState.creatures.find((c) => c.id === currentCreatureId);

    if (!currentCreature || currentCreature.type !== 'npc' && currentCreature.type !== 'creature') {
      throw new Error('Not an NPC turn');
    }

    // Build context for AI
    const gameContext = this.buildGameContext(gameState, currentCreature);

    const message = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a tactical combat AI for Pathfinder 2e. You control creatures in an encounter.
          
You have these action types available:
- "strike": Attack a target with a weapon
- "move": Move to a new position on the grid

Respond ONLY with valid JSON in this format:
{
  "action": "strike" | "move",
  "targetId": "string (for strike)",
  "targetPosition": {x: number, y: number} (for move),
  "reasoning": "Brief explanation of your decision"
}

You MUST follow the hardcoded rules:
- Strikes deal 1d8 + creature level damage
- Movement is up to 6 squares per turn
- Target AC must beat the defender's armor value
- You have 3 actions per turn max

Current creatures in combat:
${gameContext}

Make a tactical decision based on positioning, health, and threat assessment.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const responseText = message.choices[0].message.content || '';
    const actionData = JSON.parse(responseText);

    return {
      action: {
        id: Math.random().toString(),
        creatureId: currentCreature.id,
        actionId: actionData.action,
        targetId: actionData.targetId,
        targetPosition: actionData.targetPosition,
        result: 'pending',
      },
      reasoning: actionData.reasoning,
    };
  }

  private buildGameContext(gameState: any, currentCreature: any): string {
    const context = `
Current Creature: ${currentCreature.name} (${currentCreature.currentHealth}/${currentCreature.maxHealth} HP)
Position: (${currentCreature.positions.x}, ${currentCreature.positions.y})

Other combatants:
${gameState.creatures
  .filter((c: any) => c.id !== currentCreature.id)
  .map((c: any) => `- ${c.name}: ${c.currentHealth}/${c.maxHealth} HP at (${c.positions.x}, ${c.positions.y})`)
  .join('\n')}

Map size: ${gameState.map.width}x${gameState.map.height}
`;
    return context;
  }
}
