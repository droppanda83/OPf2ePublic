import { Creature, GameState, Position } from 'pf2e-shared';

/**
 * Modular Rules Engine for PF2e
 * Expandable system for adding new rules and mechanics
 */

export interface RuleModule {
  name: string;
  version: string;
  initialize(): void;
  validate(action: any): boolean;
  apply(actor: Creature, gameState: GameState, action: any): any;
}

export abstract class BaseRuleModule implements RuleModule {
  abstract name: string;
  abstract version: string;

  initialize(): void {
    console.log(`Initialized rule module: ${this.name} v${this.version}`);
  }

  abstract validate(action: any): boolean;
  abstract apply(actor: Creature, gameState: GameState, action: any): any;
}

/**
 * Action Economy Module
 * Manages action points and action costs
 */
export class ActionEconomyModule extends BaseRuleModule {
  name = 'ActionEconomy';
  version = '1.0.0';
  
  private readonly actionsPerTurn = 3;
  private actionsTaken: Map<string, number> = new Map();

  initialize(): void {
    super.initialize();
    this.actionsTaken.clear();
  }

  validate(action: any): boolean {
    const creatureId = action.creatureId;
    const actionCost = action.actionCost || 1;
    const currentActions = this.actionsTaken.get(creatureId) || 0;
    
    return currentActions + actionCost <= this.actionsPerTurn;
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    const actionCost = action.actionCost || 1;
    const currentActions = this.actionsTaken.get(actor.id) || 0;
    const newTotal = currentActions + actionCost;
    
    this.actionsTaken.set(actor.id, newTotal);
    
    return {
      success: true,
      actionsRemaining: this.actionsPerTurn - newTotal,
      message: `Used ${actionCost} action(s). ${this.actionsPerTurn - newTotal} remaining.`
    };
  }

  resetTurnActions(creatureId: string): void {
    this.actionsTaken.set(creatureId, 0);
  }

  getActionsUsed(creatureId: string): number {
    return this.actionsTaken.get(creatureId) || 0;
  }
}

/**
 * Movement Module
 * Manages character movement and positioning on grid
 */
export class MovementModule extends BaseRuleModule {
  name = 'Movement';
  version = '1.0.0';
  
  private readonly baseSpeed = 6; // squares

  validate(action: any): boolean {
    return action.targetPosition && 
           action.targetPosition.x !== undefined && 
           action.targetPosition.y !== undefined;
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    const distance = this.calculateDistance(actor.positions, action.targetPosition);
    const speedAvailable = this.baseSpeed;

    if (distance > speedAvailable) {
      return {
        success: false,
        message: `Cannot move ${distance} squares - maximum is ${speedAvailable}`,
        distance,
        maxDistance: speedAvailable
      };
    }

    // Check for terrain obstacles
    const terrainCheck = this.checkTerrain(gameState, actor.positions, action.targetPosition);
    if (!terrainCheck.passable) {
      return {
        success: false,
        message: `Path blocked by ${terrainCheck.terrainType}`,
        terrainType: terrainCheck.terrainType
      };
    }

    actor.positions = action.targetPosition;
    
    return {
      success: true,
      message: `${actor.name} moved to (${action.targetPosition.x}, ${action.targetPosition.y})`,
      distance,
      newPosition: action.targetPosition
    };
  }

  private calculateDistance(from: Position, to: Position): number {
    // Using Chebyshev distance (diagonal movement allowed)
    return Math.max(
      Math.abs(to.x - from.x),
      Math.abs(to.y - from.y)
    );
  }

  private checkTerrain(gameState: GameState, from: Position, to: Position): any {
    const terrain = gameState.map.terrain[to.y]?.[to.x];
    
    if (!terrain) {
      return { passable: false, terrainType: 'out-of-bounds' };
    }

    if (terrain.type === 'impassable') {
      return { passable: false, terrainType: 'impassable' };
    }

    // Difficult terrain costs 2x movement
    if (terrain.type === 'difficult') {
      return { passable: true, terrainType: 'difficult', costMultiplier: 2 };
    }

    return { passable: true, terrainType: 'empty' };
  }
}

/**
 * Combat Module
 * Handles attacks, damage, and combat resolution
 */
export class CombatModule extends BaseRuleModule {
  name = 'Combat';
  version = '1.0.0';

  validate(action: any): boolean {
    return action.targetId && action.type === 'strike';
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    const target = gameState.creatures.find(c => c.id === action.targetId);
    
    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    if (target.currentHealth <= 0) {
      return { success: false, message: 'Target is already defeated' };
    }

    const attackRoll = this.rollAttack(actor, target);
    let damage = 0;

    if (attackRoll.result !== 'failure' && attackRoll.result !== 'critical-failure') {
      damage = this.rollDamage(actor, attackRoll.result === 'critical-success');
      target.currentHealth -= damage;

      if (target.currentHealth <= 0) {
        target.currentHealth = 0;
      }
    }

    return {
      success: attackRoll.result !== 'failure' && attackRoll.result !== 'critical-failure',
      message: this.formatAttackMessage(actor, target, attackRoll, damage),
      attackRoll,
      damage,
      targetHealth: target.currentHealth,
      targetDefeated: target.currentHealth <= 0
    };
  }

  private rollAttack(attacker: Creature, target: Creature): any {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const attackBonus = attacker.level + 2;
    const total = d20 + attackBonus;
    const targetAC = target.armor;

    let result = 'failure';
    if (d20 === 20 || total >= targetAC + 10) {
      result = 'critical-success';
    } else if (total >= targetAC) {
      result = 'success';
    } else if (d20 === 1 || total <= targetAC - 10) {
      result = 'critical-failure';
    }

    return { d20, bonus: attackBonus, total, targetAC, result };
  }

  private rollDamage(attacker: Creature, isCritical: boolean): number {
    const baseDamage = Math.floor(Math.random() * 8) + 1; // 1d8
    const bonus = attacker.level;
    const multiplier = isCritical ? 2 : 1;
    
    return (baseDamage + bonus) * multiplier;
  }

  private formatAttackMessage(actor: Creature, target: Creature, roll: any, damage: number): string {
    const resultText = {
      'critical-success': `critically hit`,
      'success': `hit`,
      'failure': `missed`,
      'critical-failure': `critically missed`
    };

    let message = `${actor.name} ${resultText[roll.result as keyof typeof resultText]} ${target.name}`;
    
    if (damage > 0) {
      message += ` for ${damage} damage`;
    }
    
    if (target.currentHealth <= 0) {
      message += ` - ${target.name} is defeated!`;
    }

    return message;
  }
}

/**
 * Condition Module
 * Manages temporary and permanent conditions
 */
export class ConditionModule extends BaseRuleModule {
  name = 'Conditions';
  version = '1.0.0';

  validate(action: any): boolean {
    return action.condition && action.condition.name;
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    const condition = action.condition;
    
    // Check if condition already exists
    const existing = actor.conditions.find(c => c.name === condition.name);
    
    if (existing) {
      if (existing.duration === 'permanent') {
        return { success: false, message: `${actor.name} already has permanent ${condition.name}` };
      }
      existing.duration = condition.duration;
      return { success: true, message: `${actor.name}'s ${condition.name} duration refreshed` };
    }

    actor.conditions.push({
      name: condition.name,
      duration: condition.duration || 1,
      value: condition.value
    });

    return {
      success: true,
      message: `${actor.name} is ${condition.name}`,
      condition: { name: condition.name, duration: condition.duration }
    };
  }

  applyEndOfTurnEffects(creatures: Creature[]): void {
    creatures.forEach(creature => {
      creature.conditions = creature.conditions.filter(condition => {
        if (condition.duration === 'permanent') {
          return true;
        }
        
        if (typeof condition.duration === 'number') {
          condition.duration--;
          return condition.duration > 0;
        }
        
        return true;
      });
    });
  }
}

/**
 * Module Registry
 * Central system for managing all rule modules
 */
export class ModuleRegistry {
  private modules: Map<string, RuleModule> = new Map();

  registerModule(module: RuleModule): void {
    this.modules.set(module.name, module);
    module.initialize();
  }

  getModule(name: string): RuleModule | undefined {
    return this.modules.get(name);
  }

  getAllModules(): RuleModule[] {
    return Array.from(this.modules.values());
  }

  validateAction(action: any): boolean {
    // Check with all relevant modules
    for (const module of this.modules.values()) {
      if (!module.validate(action)) {
        return false;
      }
    }
    return true;
  }
}
