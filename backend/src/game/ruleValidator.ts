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

  const actionCost = getActionCost(actionId);
  const availableActions = actor.actionsRemaining ?? 3;

  if (actionCost === 'reaction') {
    if (actor.reactionUsed) {
      return {
        valid: false,
        reason: `${actor.name} has already used their reaction this round.`,
        errorCode: 'REACTION_USED'
      };
    }
  } else if (actionCost !== 'free' && actionCost > availableActions) {
    return {
      valid: false,
      reason: `${actor.name} needs ${actionCost} action(s) but only has ${availableActions} remaining.`,
      errorCode: 'INSUFFICIENT_ACTIONS'
    };
  }

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
 *
 * Reference: PF2e Player Core (Remaster) action tables.
 * Spell costs are NOT handled here — spellActions resolves those from spell data.
 */
export function getActionCost(actionId: string): number | 'reaction' | 'free' {
  const COST_TABLE: Record<string, number | 'reaction' | 'free'> = {
    // ── Reactions ─────────────────────────────────────────
    'reactive-strike':              'reaction',
    'shield-block':                 'reaction',
    'attack-of-opportunity':        'reaction',
    'attack-of-opportunity-reactive': 'reaction',
    'execute-ready':                'reaction',
    'aid':                          'reaction',
    'youre-next':                   'reaction',
    'opportune-backstab':           'reaction',
    'cognitive-loophole':           'reaction',
    'clever-gambit':                'reaction',
    'reactive-pursuit':             'reaction',
    'sidestep':                     'reaction',
    'leave-an-opening':             'reaction',
    'reactive-interference':        'reaction',
    'champion-reaction':            'reaction',
    'counter-performance':          'reaction',
    'blade-brake':                  'reaction',
    'reactive-shield':              'reaction',
    'nimble-dodge':                 'reaction',
    'mirror-dodge':                 'reaction',
    'hydraulic-deflection':         'reaction',
    'intercept-strike':             'reaction',

    // ── Free actions ──────────────────────────────────────
    'drop-weapon':                  'free',
    'release-grip':                 'free',
    'lower-shield':                 'free',
    'teleport':                     'free',
    'resume-delay':                 'free',
    'delay':                        'free',
    'end-rage':                     'free',
    'dismiss-aura':                 'free',
    'revert-form':                  'free',
    'end-courageous-anthem':        'free',
    'unleash-psyche':               'free',
    'gain-panache':                 'free',
    'stance-savant':                'free',
    'kip-up':                       'free',
    'retching':                     'free',
    'resolve-pending-damage':       'free',
    'stabilize-with-hero-points':   'free',

    // ── 3-action activities ───────────────────────────────
    'sudden-charge':                3,
    'whirlwind-strike':             3,
    'impossible-volley':            3,
    'manifest-eidolon':             3,

    // ── 2-action activities ───────────────────────────────
    'vicious-swing':                2,
    'double-slice':                 2,
    'intimidating-strike':          2,
    'knockdown':                    2,
    'swipe':                        2,
    'double-shot':                  2,
    'triple-shot':                  2,
    'dazing-blow':                  2,
    'incredible-aim':               2,
    'positioning-assault':          2,
    'fighter-debilitating-shot':    2,
    'overwhelming-blow':            2,
    'barreling-charge':             2,
    'parting-shot':                 2,
    'revealing-stab':               2,
    'felling-strike':               2,
    'sudden-leap':                  2,
    'felling-shot':                 2,
    'twin-feint':                   2,
    'fantastic-leap':               2,
    'dragon-breath':                2,
    'ready':                        2,
    'spellstrike':                  2,
    'wild-shape':                   2,
    'warp-step':                    2,
    'warp-step-amped':              2,
    'explode':                      2,
    'spark-transcendence':          2,
    'elemental-blast-2':            2,

    // ── 1-action activities (explicit) ────────────────────
    'strike':                       1,
    'stride':                       1,
    'move':                         1,
    'step':                         1,
    'stand':                        1,
    'crawl':                        1,
    'raise-shield':                 1,
    'take-cover':                   1,
    'draw-weapon':                  1,
    'stow-weapon':                  1,
    'pick-up-weapon':               1,
    'use-item':                     1,
    'interact':                     1,
    'demoralize':                   1,
    'feint':                        1,
    'grapple':                      1,
    'trip':                         1,
    'shove':                        1,
    'disarm':                       1,
    'battle-medicine':              1,
    'tumble-through':               1,
    'recall-knowledge':             1,
    'escape':                       1,
    'seek':                         1,
    'hide':                         1,
    'sneak':                        1,
    'exacting-strike':              1,
    'snagging-strike':              1,
    'brutish-shove':                1,
    'combat-grab':                  1,
    'dueling-parry':                1,
    'lunge':                        1,
    'twin-parry':                   1,
    'shatter-defenses':             1,
    'combat-assessment':            1,
    'point-blank-stance':           1,
    'assisting-shot':               1,
    'sleek-reposition':             1,
    'dual-handed-assault':          1,
    'quick-reversal':               1,
    'advantageous-assault':         1,
    'certain-strike':               1,
    'spring-attack':                1,
    'brutal-finish':                1,
    'rebounding-toss':              1,
    'disarming-stance':             1,
    'ricochet-stance':              1,
    'disruptive-stance':            1,
    'incredible-ricochet':          1,
    'lunging-stance':               1,
    'determination':                1,
    'guiding-finish':               1,
    'multishot-stance':             1,
    'battle-assessment':            1,
    'poison-weapon':                1,
    'twist-the-knife':              1,
    'blur-slam':                    1,
    'instant-opening':              1,
    'perfect-distraction':          1,
    'spring-from-the-shadows':      1,
    'bon-mot':                      1,
    'dirty-trick':                  1,
    'scare-to-death':               1,
    'quick-draw':                   1,
    'skirmish-strike':              1,
    'running-reload':               1,
    'elemental-assault':            1,
    'heroic-presence':              1,
    'rage':                         1,
    'flurry-of-blows':              1,
    'hunt-prey':                    1,
    'lay-on-hands':                 1,
    'channel-elements':             1,
    'elemental-blast':              1,
    'courageous-anthem':            1,
    'recharge-spellstrike':         1,
    'arcane-cascade':               1,
    'devise-a-stratagem':           1,
    'taunt':                        1,
    'finisher':                     1,
    'exploit-vulnerability':        1,
    'commanders-order':             1,
    'slingers-reload':              1,
    'overdrive':                    1,
    'revelation-spell':             1,
    'quick-alchemy':                1,
    'shift-immanence':              1,
  };

  return COST_TABLE[actionId] ?? 1;
}

/**
 * Get action traits (Attack, Flourish, Press, Open, Move, Stance, etc.)
 *
 * These traits drive validation:
 *  - attack:   increments MAP, triggers reactive-strike AoO
 *  - flourish: once per turn
 *  - press:    requires prior attack this turn (MAP ≥ 1)
 *  - open:     must be the first attack of the turn (MAP = 0)
 *  - move:     triggers reactive-strike for movement
 *  - stance:   one active stance at a time (not yet enforced)
 */
function getActionTraits(actionId: string): string[] {
  const traitMap: Record<string, string[]> = {
    // ── Core combat ──────────────────────────────────────
    'strike':                       ['attack'],
    'raise-shield':                 [],
    'lower-shield':                 [],
    'reactive-strike':              [],
    'shield-block':                 [],
    'take-cover':                   [],

    // ── Movement ─────────────────────────────────────────
    'stride':                       ['move'],
    'move':                         ['move'],
    'step':                         ['move'],
    'stand':                        ['move'],
    'crawl':                        ['move'],
    'tumble-through':               ['move'],
    'sneak':                        ['move'],

    // ── Weapon interaction ───────────────────────────────
    'draw-weapon':                  ['interact'],
    'stow-weapon':                  ['interact'],
    'pick-up-weapon':               ['interact'],
    'use-item':                     ['interact'],

    // ── Skill actions ────────────────────────────────────
    'demoralize':                   ['auditory', 'concentrate', 'emotion', 'mental'],
    'feint':                        ['mental'],
    'grapple':                      ['attack'],
    'trip':                         ['attack'],
    'shove':                        ['attack'],
    'disarm':                       ['attack'],
    'escape':                       ['attack'],
    'battle-medicine':              ['healing', 'manipulate'],
    'recall-knowledge':             ['concentrate', 'secret'],
    'seek':                         ['concentrate', 'secret'],
    'hide':                         [],
    'aid':                          [],

    // ── Fighter feats (L1–4) ─────────────────────────────
    'vicious-swing':                ['attack', 'flourish'],
    'sudden-charge':                ['flourish', 'open', 'move'],
    'double-slice':                 ['attack', 'flourish'],
    'intimidating-strike':          ['attack', 'flourish'],
    'exacting-strike':              ['attack', 'press'],
    'snagging-strike':              ['attack'],
    'knockdown':                    ['attack', 'flourish'],
    'brutish-shove':                ['attack', 'press'],
    'combat-grab':                  ['attack', 'press'],
    'dueling-parry':                [],
    'lunge':                        ['attack'],
    'combat-assessment':            [],

    // ── Fighter feats (L6–10) ────────────────────────────
    'swipe':                        ['attack', 'flourish'],
    'twin-parry':                   [],
    'shatter-defenses':             ['attack', 'press'],
    'point-blank-stance':           ['stance'],
    'assisting-shot':               ['attack'],
    'sleek-reposition':             ['attack', 'press'],
    'dual-handed-assault':          ['attack', 'flourish'],
    'quick-reversal':               ['attack', 'flourish', 'press'],
    'double-shot':                  ['attack', 'flourish'],
    'dazing-blow':                  ['attack', 'flourish'],
    'advantageous-assault':         ['attack', 'press'],
    'incredible-aim':               ['attack', 'concentrate'],
    'positioning-assault':          ['attack', 'flourish'],

    // ── Fighter feats (L12–20) ───────────────────────────
    'certain-strike':               ['attack', 'press'],
    'fighter-debilitating-shot':    ['attack', 'flourish'],
    'spring-attack':                ['attack', 'move'],
    'brutal-finish':                ['attack', 'press'],
    'overwhelming-blow':            ['attack', 'flourish'],
    'rebounding-toss':              ['attack'],
    'barreling-charge':             ['attack', 'flourish', 'move'],
    'parting-shot':                 ['attack', 'move'],
    'disarming-stance':             ['stance'],
    'revealing-stab':               ['attack'],
    'ricochet-stance':              ['stance'],
    'triple-shot':                  ['attack', 'flourish'],
    'felling-strike':               ['attack', 'flourish'],
    'sudden-leap':                  ['attack'],
    'disruptive-stance':            ['stance'],
    'incredible-ricochet':          ['attack', 'press'],
    'lunging-stance':               ['stance'],
    'determination':                [],
    'guiding-finish':               ['attack'],
    'multishot-stance':             ['stance'],
    'impossible-volley':            ['attack', 'flourish', 'open'],
    'whirlwind-strike':             ['attack', 'flourish', 'open'],

    // ── Rogue feats ──────────────────────────────────────
    'battle-assessment':            [],
    'poison-weapon':                [],
    'twist-the-knife':              ['attack'],
    'blur-slam':                    ['attack'],
    'felling-shot':                 ['attack'],
    'spring-from-the-shadows':      ['attack'],
    'instant-opening':              [],
    'perfect-distraction':          [],
    'reactive-pursuit':             ['move'],

    // ── Skill / General / Ancestry feats ─────────────────
    'bon-mot':                      ['auditory', 'concentrate', 'emotion', 'linguistic'],
    'dirty-trick':                  ['attack'],
    'kip-up':                       ['move'],
    'scare-to-death':               ['emotion', 'incapacitation'],
    'nimble-dodge':                 [],
    'quick-draw':                   [],
    'skirmish-strike':              ['attack'],
    'twin-feint':                   ['attack'],
    'fantastic-leap':               ['move'],
    'running-reload':               [],
    'dragon-breath':                ['arcane', 'evocation'],
    'elemental-assault':            [],
    'heroic-presence':              ['aura', 'emotion'],

    // ── Class actions ────────────────────────────────────
    'spellstrike':                  ['attack'],
    'recharge-spellstrike':         [],
    'arcane-cascade':               ['stance'],
    'rage':                         ['concentrate', 'emotion', 'mental'],
    'flurry-of-blows':              ['attack', 'flourish'],
    'hunt-prey':                    ['concentrate'],
    'lay-on-hands':                 ['healing', 'necromancy'],
    'channel-elements':             [],
    'elemental-blast':              ['attack'],
    'elemental-blast-2':            ['attack'],
    'wild-shape':                   ['concentrate', 'polymorph'],
    'courageous-anthem':            ['auditory', 'composition', 'emotion', 'mental'],
    'counter-performance':          ['auditory', 'composition'],
    'devise-a-stratagem':           ['concentrate'],
    'taunt':                        ['auditory', 'emotion'],
    'finisher':                     ['attack', 'finisher'],
    'exploit-vulnerability':        ['concentrate'],
    'commanders-order':             ['auditory'],
    'overdrive':                    ['manipulate'],
    'explode':                      ['fire', 'manipulate'],
    'quick-alchemy':                ['manipulate'],

    // ── Turn management ──────────────────────────────────
    'ready':                        ['concentrate'],
    'delay':                        [],
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
  // Resolve weapon: explicit weaponId, active weapon, or first held weapon
  let weapon = weaponId
    ? actor.weaponInventory?.find((ws) => ws.weapon.id === weaponId)?.weapon
    : undefined;
  const activeWeaponId = (actor as Creature & { activeWeaponId?: string }).activeWeaponId;
  if (!weapon && activeWeaponId) {
    weapon = actor.weaponInventory?.find((ws) => ws.weapon.id === activeWeaponId)?.weapon;
  }
  if (!weapon) {
    weapon = actor.weaponInventory?.find((ws) => ws.state === 'held')?.weapon;
  }
  if (!weapon) {
    // No weapon found — skip range validation here; combatActions will handle it
    return { valid: true };
  }

  const isRanged = weapon.attackType === 'ranged';

  if (isRanged) {
    // Ranged: Euclidean distance with range increments
    const dx = actor.positions.x - target.positions.x;
    const dy = actor.positions.y - target.positions.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const rangeIncrementSq = (weapon.range || 60) / 5;
    const maxRangeSq = rangeIncrementSq * 6;
    if (distance > maxRangeSq + 1e-6) {
      return {
        valid: false,
        reason: `Target is beyond maximum range! (${Math.round(distance * 5)}ft away, max ${Math.round(maxRangeSq * 5)}ft)`,
        errorCode: 'OUT_OF_RANGE'
      };
    }
  } else {
    // Melee: Chebyshev distance (diagonals count as 1 square)
    const dx = Math.abs(actor.positions.x - target.positions.x);
    const dy = Math.abs(actor.positions.y - target.positions.y);
    const gridDistance = Math.max(dx, dy);
    const hasReach = weapon.traits?.includes('reach');
    const maxReach = hasReach ? 2 : 1;
    if (gridDistance > maxReach) {
      return {
        valid: false,
        reason: `Target is out of melee reach${hasReach ? ' (10ft reach)' : ''}! Move closer first.`,
        errorCode: 'OUT_OF_RANGE'
      };
    }
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
