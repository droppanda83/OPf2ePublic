import { Creature, GameState, EncounterMap, TerrainTile, CombatRound, Position } from 'pf2e-shared';
import { RulesEngine } from './rules';

export class GameEngine {
  private games: Map<string, GameState> = new Map();
  private rulesEngine: RulesEngine;

  constructor() {
    this.rulesEngine = new RulesEngine();
  }

  createGame(
    players: Partial<Creature>[],
    creatures: Partial<Creature>[],
    mapSize: number = 20
  ): GameState {
    const id = this.generateId();

    // Initialize creatures with proper structure
    const allCreatures: Creature[] = [
      ...players.map((p, i) => this.initializeCreature(p, 'player', i)),
      ...creatures.map((c, i) => this.initializeCreature(c, 'creature', i)),
    ];

    // Roll initiative
    const turnOrder = this.rulesEngine.rollInitiative(allCreatures);

    const gameState: GameState = {
      id,
      name: 'Encounter',
      creatures: allCreatures,
      map: this.generateMap(mapSize),
      currentRound: {
        number: 1,
        turnOrder,
        currentTurnIndex: 0,
        actions: [],
      },
      log: [{ timestamp: Date.now(), type: 'system', message: 'Combat started' }],
    };
    // attach map reference to each creature for rules that need terrain info
    allCreatures.forEach((c) => ((c as any)._map = gameState.map));

    this.games.set(id, gameState);
    return gameState;
  }

  executeAction(
    gameId: string,
    creatureId: string,
    actionId: string,
    targetId?: string,
    targetPosition?: Position
  ): any {
    const gameState = this.games.get(gameId);
    if (!gameState) throw new Error('Game not found');

    const actor = gameState.creatures.find((c) => c.id === creatureId);
    if (!actor) throw new Error('Creature not found');

    // Resolve action based on action system rules
    const result = this.rulesEngine.resolveAction(
      actor,
      gameState,
      actionId,
      targetId,
      targetPosition
    );

    // Log the action
    gameState.log.push({
      timestamp: Date.now(),
      type: 'action',
      message: result.message,
      details: result,
    });

    // Advance turn if no more actions available
    if (actor.currentHealth > 0) {
      this.advanceTurn(gameState);
    }

    return { gameState, result };
  }

  getGameState(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  private initializeCreature(partial: Partial<Creature>, type: Creature['type'], index: number): Creature {
    return {
      id: this.generateId(),
      name: partial.name || `${type}-${index}`,
      type,
      level: partial.level || 1,
      maxHealth: partial.maxHealth || 20,
      currentHealth: partial.currentHealth || partial.maxHealth || 20,
      armor: partial.armor || 10,
      positions: partial.positions || { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) },
      conditions: [],
      initiative: 0,
    };
  }

  private generateMap(size: number): EncounterMap {
    const terrain: TerrainTile[][] = [];
    for (let y = 0; y < size; y++) {
      terrain[y] = [];
      for (let x = 0; x < size; x++) {
        terrain[y][x] = {
          x,
          y,
          type: Math.random() > 0.9 ? 'difficult' : 'empty',
        };
      }
    }
    return { width: size, height: size, terrain };
  }

  private advanceTurn(gameState: GameState): void {
    const round = gameState.currentRound;
    round.currentTurnIndex = (round.currentTurnIndex + 1) % round.turnOrder.length;

    if (round.currentTurnIndex === 0) {
      round.number++;
      // Apply condition durations, etc.
      gameState.creatures.forEach((c) => {
        c.conditions = c.conditions.filter((cond) => {
          if (cond.duration === 'permanent') return true;
          cond.duration--;
          return cond.duration > 0;
        });
      });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(7);
  }
}
