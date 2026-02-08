import { Creature, GameState, AttackRoll, DiceRoll, Position } from 'pf2e-shared';

export class RulesEngine {
  /**
   * Core PF2e Rules - Foundation for expandable system
   * All dice rolls use standard d20 system
   * Damage resolution includes resistances/immunities
   */

  rollInitiative(creatures: Creature[]): string[] {
    // Roll d20 + DEX modifier for each creature
    // For now simplified - roll d20 and add a modifier based on level
    creatures.forEach((creature) => {
      const d20 = this.rollDice(1, 20)[0];
      const dexModifier = creature.level; // Simplified - would be actual DEX from character
      creature.initiative = d20 + dexModifier;
    });

    return creatures
      .sort((a, b) => b.initiative - a.initiative)
      .map((c) => c.id);
  }

  resolveAction(
    actor: Creature,
    gameState: GameState,
    actionId: string,
    targetId?: string,
    targetPosition?: Position
  ): any {
    // Validate action is possible (health > 0, etc.)
    if (actor.currentHealth <= 0) {
      return { success: false, message: `${actor.name} is unconscious` };
    }

    // Route to specific action type
    // This grows as you add more action types
    switch (actionId) {
      case 'strike':
        return this.resolveStrike(actor, gameState, targetId);
      case 'move':
        return this.resolveMovement(actor, targetPosition);
      default:
        return { success: false, message: 'Unknown action' };
    }
  }

  private resolveStrike(actor: Creature, gameState: GameState, targetId?: string): any {
    if (!targetId) {
      return { success: false, message: 'No target specified' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    const attackRoll = this.rollAttack(actor, target);

    if (attackRoll.result === 'critical-failure' || attackRoll.result === 'failure') {
      return {
        success: false,
        message: `${actor.name} missed ${target.name}!`,
        details: attackRoll,
      };
    }

    // Roll damage
    const damageRoll = this.rollDamage(actor);
    attackRoll.damage = damageRoll;

    // Apply damage (simplified - no resistances yet)
    const damageApplied = damageRoll.appliedDamage;
    target.currentHealth -= damageApplied;

    const message = `${actor.name} hit ${target.name} for ${damageApplied} damage${
      target.currentHealth <= 0 ? ' - ${target.name} is unconscious!' : ''
    }`;

    return {
      success: true,
      message,
      details: attackRoll,
      targetHealth: target.currentHealth,
    };
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  private resolveMovement(actor: Creature, targetPosition?: Position): any {
    if (!targetPosition) {
      return { success: false, message: 'No destination specified' };
    }

    // Movement budget in squares (PF2e simplified): 6
    const maxDistance = 6;

    // Attempt to get map terrain from actor._map (optional). If not present, fallback to Euclidean distance.
    const gameMap = (actor as any)._map as any;

    const computePathCost = (start: Position, goal: Position, terrainGrid: any[][]) => {
      const rows = terrainGrid?.length || 0;
      const cols = terrainGrid?.[0]?.length || 0;

      const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && y < rows && x < cols;

      const neighbors = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }
      ];

      const key = (x: number, y: number) => `${x},${y}`;
      const dist: Map<string, number> = new Map();
      const visited: Set<string> = new Set();

      const startKey = key(start.x, start.y);
      dist.set(startKey, 0);
      const pq: { x: number; y: number }[] = [{ x: start.x, y: start.y }];

      while (pq.length > 0) {
        // pop min
        let minIdx = 0;
        for (let i = 1; i < pq.length; i++) {
          if ((dist.get(key(pq[i].x, pq[i].y)) || Infinity) < (dist.get(key(pq[minIdx].x, pq[minIdx].y)) || Infinity)) minIdx = i;
        }
        const current = pq.splice(minIdx, 1)[0];
        const currentKey = key(current.x, current.y);
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);

        if (current.x === goal.x && current.y === goal.y) break;

        for (const n of neighbors) {
          const nx = current.x + n.dx;
          const ny = current.y + n.dy;
          if (!inBounds(nx, ny)) continue;

          const tile = terrainGrid?.[ny]?.[nx] || { type: 'empty' };
          if (tile.type === 'impassable') continue;

          const stepCost = (Math.abs(n.dx) + Math.abs(n.dy) === 2) ? Math.SQRT2 : 1;
          const terrainMultiplier = tile.type === 'difficult' ? 2 : 1;
          const cost = stepCost * terrainMultiplier;

          const neighKey = key(nx, ny);
          const newDist = (dist.get(currentKey) || Infinity) + cost;
          if (newDist < (dist.get(neighKey) || Infinity)) {
            dist.set(neighKey, newDist);
            pq.push({ x: nx, y: ny });
          }
        }
      }

      return dist.get(key(goal.x, goal.y)) ?? Infinity;
    };

    const terrainGrid = (gameMap && gameMap.terrain) ? gameMap.terrain : undefined;

    let pathCost = Infinity;
    if (terrainGrid) {
      pathCost = computePathCost(actor.positions, targetPosition, terrainGrid);
    } else {
      pathCost = this.calculateDistance(actor.positions, targetPosition);
    }

    if (pathCost === Infinity) {
      return { success: false, message: 'No valid path to destination (impassable terrain)' };
    }

    if (pathCost > maxDistance) {
      return { success: false, message: `Cannot move ${pathCost.toFixed(1)} squares - max is ${maxDistance}` };
    }

    actor.positions = targetPosition;
    return { success: true, message: `${actor.name} moved to (${targetPosition.x}, ${targetPosition.y})`, newPosition: targetPosition };
  }

  private rollAttack(attacker: Creature, target: Creature): AttackRoll {
    const d20 = this.rollDice(1, 20)[0];
    const bonus = attacker.level + 2; // Simplified
    const total = d20 + bonus;

    // Determine result vs target AC
    const targetAC = target.armor;
    let result: 'critical-success' | 'success' | 'failure' | 'critical-failure';

    if (d20 === 20 || total >= targetAC + 10) {
      result = 'critical-success';
    } else if (total >= targetAC) {
      result = 'success';
    } else if (d20 === 1 || total <= targetAC - 10) {
      result = 'critical-failure';
    } else {
      result = 'failure';
    }

    return {
      attacker: attacker.id,
      target: target.id,
      d20,
      bonus,
      total,
      result,
    };
  }

  private rollDamage(attacker: Creature): any {
    // Simplified damage: 1d8 + level (would be weapon dice + STR modifier)
    const dice = { times: 1, sides: 8, results: this.rollDice(1, 8), total: 0 };
    dice.total = dice.results.reduce((a, b) => a + b, 0);

    return {
      dice,
      total: dice.total + attacker.level,
      appliedDamage: dice.total + attacker.level, // Simplified - no resistances yet
    };
  }

  rollDice(times: number, sides: number): number[] {
    const results: number[] = [];
    for (let i = 0; i < times; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
  }
}
