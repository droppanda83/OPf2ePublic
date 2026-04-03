// 
// turnManagement.ts  Extracted turn/initiative methods from RulesEngine
// Phase 14 refactor: initiative, persistent damage, delay, ready actions
// 

import { Creature, GameState, ActionResult, rollD20, rollDamageFormula, calculateFinalDamage, getProficiencyBonus } from 'pf2e-shared';
import { initDying } from './helpers';

export interface TurnManagementContext {
  hasFeat: (creature: Creature, featName: string) => boolean;
  resolveStrike: (actor: Creature, gameState: GameState, targetId?: string, weaponId?: string, heroPointsSpent?: number) => ActionResult;
  resolveRaiseShield: (actor: Creature) => ActionResult;
  resolveShieldBlock: (actor: Creature) => ActionResult;
  resolveHide: (actor: Creature, gameState: GameState, heroPointsSpent?: number) => ActionResult;
  resolveSeek: (actor: Creature, gameState: GameState, heroPointsSpent?: number) => ActionResult;
}

interface PersistentDamageLogEntry {
  type: 'persistent-damage';
  source: string;
  conditionName: string;
  damageType?: string;
  baseDamage: number;
  damageModifier: string;
  modifierValue: number;
  finalDamage: number;
  rollResults: number[];
  durationRemaining: number;
  message: string;
}

export function rollInitiative(ctx: TurnManagementContext, creatures: Creature[]): string[] {
  creatures.forEach((creature) => {
    const d20 = rollD20();
    // PF2e initiative uses Perception: WIS mod + perception proficiency bonus
    const wisMod = creature.abilities?.wisdom ?? 0;
    const percProf = getProficiencyBonus(creature.proficiencies?.perception ?? 'trained', creature.level);
    let initBonus = wisMod + percProf;
    // Incredible Initiative / Predator's Instinct: +2 circumstance to initiative
    if (ctx.hasFeat(creature, 'Incredible Initiative') ||
        ctx.hasFeat(creature, "Predator's Instinct")) {
      initBonus += 2;
    }
    // PASSIVE ROGUE FEAT: Scout's Warning â€” allies gain +1 initiative
    const hasScoutWarningAlly = creatures.some((ally) =>
      ally.id !== creature.id &&
      ally.type === creature.type &&
      ctx.hasFeat(ally, "Scout's Warning")
    );
    if (hasScoutWarningAlly) {
      initBonus += 1;
    }
    creature.initiative = d20 + initBonus;
  });

  return creatures
    .sort((a, b) => b.initiative - a.initiative)
    .map((c) => c.id);
}

/**
 * Process persistent damage (fire burns, bleed, etc.) at the start of a creature's turn
 * Returns array of log entries for this creature's persistent damage
 */
export function processPersistentDamage(creature: Creature): PersistentDamageLogEntry[] {
  const entries: PersistentDamageLogEntry[] = [];

  if (!creature.conditions || creature.conditions.length === 0) {
    return entries;
  }

  // Find all persistent damage conditions
  const persistentConditions = creature.conditions.filter((c) => c.isPersistentDamage);

  persistentConditions.forEach((condition) => {
    if (typeof condition.duration === 'number' && condition.duration > 0) {
      // Roll damage
      let damage = 0;
      const rollResults: number[] = [];

      if (condition.damageFormula) {
        const damageRoll = rollDamageFormula(condition.damageFormula);
        damage = damageRoll.total;
        rollResults.push(...damageRoll.results);
      } else if (condition.damagePerTurn) {
        damage = condition.damagePerTurn;
      }

      // Apply damage with resistances
      let finalDamage = damage;
      let damageModifier = 'normal';
      let modifierValue = 0;

      if (damage > 0 && condition.damageType) {
        const calc = calculateFinalDamage(damage, condition.damageType, creature);
        finalDamage = calc.finalDamage;
        damageModifier = calc.modifier;
        modifierValue = calc.modifierValue || 0;
      }

      // Apply damage to creature
      creature.currentHealth -= finalDamage;

      // Decrement duration
      if (typeof condition.duration === 'number') {
        condition.duration--;
      }

      let statusMessage = '';
      if (creature.currentHealth <= 0 && !creature.dying) {
        statusMessage = initDying(creature);
      }

      entries.push({
        type: 'persistent-damage',
        source: condition.source || condition.name,
        conditionName: condition.name,
        damageType: condition.damageType,
        baseDamage: damage,
        damageModifier,
        modifierValue,
        finalDamage,
        rollResults,
        durationRemaining: typeof condition.duration === 'number' ? condition.duration : 0,
        message: `ðŸ’¥ ${creature.name} takes ${finalDamage} ${condition.damageType} damage from ${condition.source}${statusMessage}`,
      });
    }
  });

  // Remove expired conditions
  creature.conditions = creature.conditions.filter((c) => {
    if (c.isPersistentDamage && typeof c.duration === 'number') {
      return c.duration > 0;
    }
    return true;
  });

  return entries;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PHASE 8.1: Delay (wait for later in initiative)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Delay - Wait and act later in the initiative order
 * PF2e: You can choose to delay your turn. When you do, you delay until 
 * just before another creature's turn. Your initiative becomes just before 
 * that creature's initiative.
 * 
 * Implementation: Mark creature as delaying. They skip their turn and can 
 * choose when to re-enter the initiative order.
 */
export function resolveDelay(actor: Creature): ActionResult {
  // Mark creature as delaying
  actor.isDelaying = true;
  
  const message = `â¸ï¸ ${actor.name} delays their turn!\n` +
    `They can choose to act before any other creature's turn this round.`;
  
  return { 
    success: true, 
    message, 
    isDelaying: true,
    details: { action: 'delay' }
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PHASE 8.1: Resume Delay (re-enter initiative)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function resolveResumeDelay(actor: Creature, gameState: GameState): ActionResult {
  if (!actor.isDelaying) {
    return { success: false, message: `${actor.name} is not delaying.` };
  }

  const round = gameState.currentRound;
  if (!round) {
    return { success: false, message: 'No active round found.' };
  }

  const currentId = round.turnOrder[round.currentTurnIndex];
  const currentCreature = gameState.creatures.find(c => c.id === currentId);
  const actorIndex = round.turnOrder.indexOf(actor.id);
  if (actorIndex === -1) {
    return { success: false, message: 'Delaying creature is not in the turn order.' };
  }

  // Remove and insert immediately before the current creature's turn
  round.turnOrder.splice(actorIndex, 1);
  let insertIndex = round.currentTurnIndex;
  if (actorIndex < round.currentTurnIndex) {
    insertIndex -= 1;
  }
  insertIndex = Math.max(0, insertIndex);
  round.turnOrder.splice(insertIndex, 0, actor.id);
  round.currentTurnIndex = insertIndex;
  actor.isDelaying = false;

  const interruptedName = currentCreature?.name ?? 'another creature';
  const message = `â© ${actor.name} resumes their delayed turn, interrupting ${interruptedName}.`;

  return { success: true, message, details: { action: 'resume-delay' } };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PHASE 8.2: Ready (prepare an action with a trigger)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Ready - Prepare a single action to perform as a reaction when triggered
 * PF2e: 2 actions. You prepare to use an action that will occur outside your turn.
 * Choose a single action and a trigger. Your turn then ends. If before the start 
 * of your next turn the trigger occurs, you can use a reaction to perform the 
 * readied action.
 * 
 * Implementation: Store the ready action and basic trigger description. 
 * The trigger will be manually detected (simplified for now - GM/player confirms trigger).
 */
export function resolveReady(
  actor: Creature, 
  actionId?: string,
  targetId?: string
): ActionResult {
  // Ready requires specifying an action
  if (!actionId) {
    return { 
      success: false, 
      message: 'Ready requires specifying which action to prepare. Use the action dropdown to select the readied action.' 
    };
  }
  
  // Validate action is a single-action activity
  const validReadyActions = ['strike', 'stride', 'step', 'interact', 'hide', 'seek', 'shield-block', 'raise-shield'];
  if (!validReadyActions.includes(actionId)) {
    return { 
      success: false, 
      message: `Cannot ready "${actionId}". Ready can only be used with single actions (1 action cost).` 
    };
  }
  
  // Store ready action
  actor.readyAction = {
    actionId,
    targetId,
    trigger: `When an enemy acts`, // Simplified trigger description
    triggerType: 'custom' // For now, all triggers are custom (GM confirms)
  };
  
  const message = `âš”ï¸ ${actor.name} readies an action!\n` +
    `Prepared action: **${actionId.toUpperCase()}**\n` +
    `Trigger: *When an enemy acts*\n` +
    `${actor.name} can use a reaction to perform this action when the trigger occurs.`;
  
  return { 
    success: true, 
    message, 
    readyAction: actor.readyAction,
    endsTurn: true, // Ready ends the creature's turn
    details: { action: 'ready', readied: actionId }
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PHASE 8.2: Execute Readied Action (reaction)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function resolveExecuteReady(ctx: TurnManagementContext, 
  actor: Creature,
  gameState: GameState,
  heroPointsSpent?: number
): ActionResult {
  const ready = actor.readyAction;
  if (!ready) {
    return { success: false, message: `${actor.name} has no readied action.` };
  }

  actor.readyAction = undefined;

  switch (ready.actionId) {
    case 'strike':
      if (!ready.targetId) {
        return { success: false, message: 'Readied Strike requires a target.' };
      }
      return ctx.resolveStrike(actor, gameState, ready.targetId, undefined, heroPointsSpent);
    case 'raise-shield':
      return ctx.resolveRaiseShield(actor);
    case 'shield-block':
      return ctx.resolveShieldBlock(actor);
    case 'hide':
      return ctx.resolveHide(actor, gameState, heroPointsSpent);
    case 'seek':
      return ctx.resolveSeek(actor, gameState, heroPointsSpent);
    case 'interact':
      return { success: false, message: 'Interact is not implemented yet.' };
    case 'step':
    case 'stride':
      return { success: false, message: 'Readied movement requires a target position.' };
    default:
      return { success: false, message: `Readied action "${ready.actionId}" cannot be executed yet.` };
  }
}
