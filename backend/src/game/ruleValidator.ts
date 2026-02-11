import { Creature, GameState, Position } from 'pf2e-shared';

/**
 * RULE VALIDATOR MODULE
 * 
 * Centralized validation for all actions in the PF2e combat system.
 * Every action must pass through validation before execution.
 * 
 * This ensures the engine enforces PF2e rules consistently and prevents
 * invalid actions from being processed.
 * 
 * Phase 0 - Rule Enforcement Framework
 */

export interface ValidationResult {
  /** Whether the action is valid */
  valid: boolean;
  /** Human-readable reason if invalid */
  reason?: string;
  /** Technical error code for debugging */
  errorCode?: string;
}

/**
 * Validate an action before it executes.
 * Returns { valid: true } if action can proceed, or { valid: false, reason } if blocked.
 */
export function validateAction(
  actor: Creature,
  gameState: GameState,
  actionId: string,
  targetId?: string,
  targetPosition?: Position,
  weaponId?: string
): ValidationResult {
  
  // 1. ACTOR STATE VALIDATION
  // ──────────────────────────
  
  // Dying creatures can only make recovery checks (death saves)
  if (actor.dying && actionId !== 'death-save') {
    return {
      valid: false,
      reason: `${actor.name} is dying and can only make recovery checks!`,
      errorCode: 'ACTOR_DYING'
    };
  }

  // Unconscious creatures cannot act
  if (actor.currentHealth <= 0 && !actor.dying) {
    return {
      valid: false,
      reason: `${actor.name} is unconscious and cannot act.`,
      errorCode: 'ACTOR_UNCONSCIOUS'
    };
  }

  // Dead creatures cannot act
  if (actor.currentHealth <= 0 && actor.dying && !actionId.includes('death')) {
    return {
      valid: false,
      reason: `${actor.name} cannot act while dying.`,
      errorCode: 'ACTOR_DEAD'
    };
  }

  // 2. ACTION COST VALIDATION
  // ──────────────────────────
  
  // TODO Phase 0: Action economy tracking not fully implemented yet.
  // Need to add `actionsRemaining` property to Creature type and track it per turn.
  // For now, action cost validation is disabled.
  
  /*
  const actionCost = getActionCost(actionId);
  const availableActions = actor.actionsRemaining ?? 3;

  if (actionCost > availableActions) {
    return {
      valid: false,
      reason: `${actor.name} needs ${actionCost} action(s) but only has ${availableActions} remaining.`,
      errorCode: 'INSUFFICIENT_ACTIONS'
    };
  }

  // Reactions require unused reaction
  if (actionCost === 'reaction' && actor.reactionUsed) {
    return {
      valid: false,
      reason: `${actor.name} has already used their reaction this round.`,
      errorCode: 'REACTION_USED'
    };
  }
  */

  // 3. TRAIT RESTRICTION VALIDATION
  // ─────────────────────────────────
  
  const actionTraits = getActionTraits(actionId);
  
  // FLOURISH trait: Can only use one flourish action per turn
  if (actionTraits.includes('flourish')) {
    if (actor.flourishUsedThisTurn) {
      return {
        valid: false,
        reason: `${actor.name} has already used a Flourish action this turn.`,
        errorCode: 'FLOURISH_ONCE_PER_TURN'
      };
    }
  }

  // PRESS trait: Requires MAP ≥ 1 (must have attacked this turn already)
  if (actionTraits.includes('press')) {
    const currentMAP = actor.attacksMadeThisTurn ?? 0;
    if (currentMAP === 0) {
      return {
        valid: false,
        reason: `${actionId} has the Press trait and requires a prior attack this turn.`,
        errorCode: 'PRESS_REQUIRES_PRIOR_ATTACK'
      };
    }
  }

  // OPEN trait: Requires MAP = 0 (must be first attack)
  if (actionTraits.includes('open')) {
    const currentMAP = actor.attacksMadeThisTurn ?? 0;
    if (currentMAP !== 0) {
      return {
        valid: false,
        reason: `${actionId} has the Open trait and must be the first attack of your turn.`,
        errorCode: 'OPEN_MUST_BE_FIRST'
      };
    }
  }

  // 4. TARGET VALIDATION
  // ──────────────────────
  
  if (targetId) {
    const target = gameState.creatures.find(c => c.id === targetId);
    
    if (!target) {
      return {
        valid: false,
        reason: `Target not found.`,
        errorCode: 'TARGET_NOT_FOUND'
      };
    }

    // Cannot target dead creatures (except for certain actions like Treat Wounds)
    if (target.currentHealth <= 0 && !['treat-wounds', 'stabilize'].includes(actionId)) {
      return {
        valid: false,
        reason: `Cannot target ${target.name} - they are unconscious or dead.`,
        errorCode: 'TARGET_DEAD'
      };
    }

    // Range validation for attacks
    if (actionTraits.includes('attack') || ['strike', 'vicious-swing'].includes(actionId)) {
      const rangeValid = validateAttackRange(actor, target, gameState, weaponId);
      if (!rangeValid.valid) {
        return rangeValid;
      }
    }
  }

  // 5. REQUIREMENT VALIDATION (action-specific)
  // ─────────────────────────────────────────────
  
  switch (actionId) {
    case 'grapple':
    case 'disarm':
      // Requires free hand
      if (!hasFreeHand(actor)) {
        return {
          valid: false,
          reason: `${actionId} requires a free hand.`,
          errorCode: 'REQUIRES_FREE_HAND'
        };
      }
      break;

    case 'strike':
    case 'vicious-swing':
      // Requires weapon
      if (!weaponId) {
        return {
          valid: false,
          reason: `Strike requires a weapon.`,
          errorCode: 'NO_WEAPON_SELECTED'
        };
      }
      const weapon = actor.weaponInventory?.find((ws) => ws.weapon.id === weaponId);
      if (!weapon || weapon.state !== 'held') {
        return {
          valid: false,
          reason: `You must be holding a weapon to strike.`,
          errorCode: 'WEAPON_NOT_HELD'
        };
      }
      break;

    case 'stride':
    case 'move':
      // Cannot move while immobilized
      if (hasCondition(actor, 'immobilized') || hasCondition(actor, 'grabbed') || hasCondition(actor, 'restrained')) {
        return {
          valid: false,
          reason: `${actor.name} is immobilized and cannot move.`,
          errorCode: 'IMMOBILIZED'
        };
      }
      break;

    case 'raise-shield':
      // Must have shield equipped
      if (!actor.equippedShield) {
        return {
          valid: false,
          reason: `${actor.name} has no shield equipped.`,
          errorCode: 'NO_SHIELD'
        };
      }
      if (actor.shieldRaised) {
        return {
          valid: false,
          reason: `Shield is already raised.`,
          errorCode: 'SHIELD_ALREADY_RAISED'
        };
      }
      break;

    case 'shield-block':
      if (!actor.equippedShield || !actor.shieldRaised) {
        return {
          valid: false,
          reason: `Shield Block requires a raised shield.`,
          errorCode: 'SHIELD_NOT_RAISED'
        };
      }
      break;
  }

  // 6. CONDITION RESTRICTIONS - PHASE 0 INTERACTION VALIDATION
  // ────────────────────────────────────────────────────────────
  // PF2e Remaster condition interactions that prevent or restrict actions.
  // Reference: Player Core p.426-437
  
  // ABSOLUTE ACTION BLOCKERS (cannot act at all)
  if (hasCondition(actor, 'paralyzed')) {
    return {
      valid: false,
      reason: `${actor.name} is paralyzed and cannot act.`,
      errorCode: 'PARALYZED'
    };
  }

  // MOVEMENT BLOCKERS (Immobilized = no Stride/Step)
  if ((hasCondition(actor, 'immobilized') || hasCondition(actor, 'grabbed') || hasCondition(actor, 'restrained')) 
      && (actionId === 'stride' || actionId === 'step')) {
    return {
      valid: false,
      reason: `${actor.name} is immobilized and cannot move.`,
      errorCode: 'IMMOBILIZED_NO_STRIDE'
    };
  }

  // GRAB/RESTRAIN/GRAPPLE interaction: Grabbed/Restrained causes off-guard (handled at attack roll calculation)
  // No validation block needed here, just documented.

  // OFF-GUARD CONDITIONS (not blocking actions, but affects defense)
  // Prone: Affected by prone condition penalty on ranged attacks (handled at attack calculation)
  // Cover: Affects AC bonuses (handled at AC calculation)
  // Documented for reference:
  // - Blinded: off-guard, all terrain is uneven, -4 status to Perception (Phase 2)
  // - Concealed: DC 5 flat check on attacks/spells (Phase 2)
  // - Hidden: Must guess square, DC 11 flat check (Phase 2)
  // - Invisible: Combined hidden + undetected (Phase 2)
  // - Prone: -2 status to ranged attacks (not blocking actions)

  // PERSISTENT CONDITIONS (handled at turn start, documented here)
  // Stunned N: Lose N actions at turn start, duration reduces by N (Phase 1)
  // Slowed N: Start turn with max(1, 3-N) actions (Phase 2)
  // Quickened: Start with 4 actions, extra action restricted (Phase 2)
  // Confused: Must use actions to attack only (Phase 2)
  // Fleeing F: Must Stride away each turn (Phase 2)
  // Doomed D: Die at dying (4-D) instead of dying 4 (Phase 2)

  // INTERACTION WARNING: Exhausted + Fatigued
  // Exhausted cannot be combined with fatigued (mutually exclusive, Phase 2)
  if (hasCondition(actor, 'exhausted') && hasCondition(actor, 'fatigued')) {
    // This is a protocol error - these conditions shouldn't coexist
    // Log warning but allow action (condition system should enforce this)
    console.warn(`⚠️ ${actor.name} has both exhausted and fatigued - these may be mutually exclusive.`);
  }

  // STUNNED: Action cost validation (if stunned value reduces available actions to 0, fail later at engine level)
  // Documented: Stunned N = lose N actions at turn start. Engine manages available action pool.
  
  // SLOWED: Action cost validation (similar to stunned)
  // Documented: Slowed N = start with 3-N actions. Quickened 1 = start with 4 actions.

  // CONFUSED: Action restriction (Phase 2, placeholder for now)
  if (hasCondition(actor, 'confused')) {
    // TODO Phase 2: Enforce confused behavior - can only Strike, lose 1 action if can't act
    // For now, allow action (validation will be implemented in Phase 2)
  }

  // CONDITION COMBINATIONS DOCUMENTATION
  // ─────────────────────────────────────
  // The following condition combinations are allowed and meaningful:
  // - Grabbed + Off-Guard: Yes (grabbed causes off-guard)
  // - Prone + Cover: Yes (both apply)
  // - Stunned + Slowed: Yes (both reduce actions independently) - Phase 2
  // - Frightened + other conditions: Yes (fear only limits positive effects)
  // - Persistent Damage + other conditions: Yes (stacks independently)

  // ALL VALIDATIONS PASSED
  return { valid: true };
}

/**
 * Get the action cost for an action ID.
 * Returns number of actions (1-3), 'reaction', or 'free'.
 */
function getActionCost(actionId: string): number | 'reaction' | 'free' {
  // Reactions
  if (['reactive-strike', 'shield-block', 'attack-of-opportunity'].includes(actionId)) {
    return 'reaction';
  }

  // Free actions
  if (['drop-weapon', 'release-grip', 'lower-shield', 'teleport'].includes(actionId)) {
    return 'free';
  }

  // 3-action activities
  if (['sudden-charge'].includes(actionId)) {
    return 3;
  }

  // 2-action activities
  if (['power-attack', 'double-slice', 'intimidating-strike', 'knockdown', 'shove', 'trip', 'warp-step'].includes(actionId)) {
    return 2;
  }

  // Most actions are 1 action
  return 1;
}

/**
 * Get action traits (Attack, Flourish, Press, Open, etc.)
 */
function getActionTraits(actionId: string): string[] {
  const traitMap: Record<string, string[]> = {
    'strike': ['attack'],
    'vicious-swing': ['attack', 'flourish'],
    'power-attack': ['attack', 'flourish'],
    'double-slice': ['attack', 'flourish'],
    'intimidating-strike': ['attack', 'flourish'],
    'knockdown': ['attack', 'flourish'],
    'exacting-strike': ['attack', 'press'],
    'snagging-strike': ['attack'],
    'grapple': ['attack'],
    'trip': ['attack'],
    'shove': ['attack'],
    'disarm': ['attack'],
    'feint': [],
    'demoralize': [],
  };

  return traitMap[actionId] || [];
}

/**
 * Validate that an attack is within range.
 */
function validateAttackRange(
  actor: Creature,
  target: Creature,
  gameState: GameState,
  weaponId?: string
): ValidationResult {
  if (!weaponId) {
    return {
      valid: false,
      reason: 'No weapon selected for attack range validation.',
      errorCode: 'NO_WEAPON_FOR_RANGE'
    };
  }

  const weapon = actor.weaponInventory?.find((ws) => ws.weapon.id === weaponId)?.weapon;
  if (!weapon) {
    return {
      valid: false,
      reason: 'Weapon not found.',
      errorCode: 'WEAPON_NOT_FOUND'
    };
  }

  const distance = Math.abs(actor.positions.x - target.positions.x) + 
                   Math.abs(actor.positions.y - target.positions.y);

  const reach = weapon.range || (weapon.attackType === 'melee' ? 1 : 6);

  // Reach trait adds +1 to melee range
  if (weapon.traits?.includes('reach') && weapon.attackType === 'melee') {
    const reachBonus = 1;
    if (distance > reach + reachBonus) {
      return {
        valid: false,
        reason: `Target is ${distance} squares away, but weapon reach is ${reach + reachBonus}.`,
        errorCode: 'OUT_OF_RANGE'
      };
    }
  } else if (distance > reach) {
    return {
      valid: false,
      reason: `Target is ${distance} squares away, but weapon range is ${reach}.`,
      errorCode: 'OUT_OF_RANGE'
    };
  }

  return { valid: true };
}

/**
 * Check if creature has a free hand.
 * Uses new hand tracking system if available (Phase 0.4),
 * falls back to legacy handsUsed tracking.
 * 
 * PF2e: Free hand required for: Grapple, Disarm, some unarmed actions
 */
function hasFreeHand(actor: Creature): boolean {
  // New hand tracking system (Phase 0.4)
  if (actor.hands) {
    const primaryEmpty = actor.hands.primary.itemType === 'empty';
    const secondaryEmpty = actor.hands.secondary.itemType === 'empty';
    return primaryEmpty || secondaryEmpty;
  }

  // Legacy: handsUsed tracking (will be removed after Phase 0.4)
  const handsUsed = actor.handsUsed ?? 0;
  return handsUsed < 2;
}

/**
 * Check if creature has a specific condition.
 */
function hasCondition(actor: Creature, conditionName: string): boolean {
  return actor.conditions?.some(c => c.name === conditionName) ?? false;
}
