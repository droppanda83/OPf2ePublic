// Movement & Positioning - extracted from RulesEngine
// Handles stride/step movement, distance calculations, and flanking cleanup.

import { Creature, GameState, CreatureWeapon, Position, computePathCost, getEffectiveReach, getWeapon } from 'pf2e-shared';

// Trait helpers (duplicated from rules.ts — small pure functions)
function hasTrait(traits: string[] | undefined, traitName: string): boolean {
  if (!traits) return false;
  return traits.some((t) => t.toLowerCase().startsWith(traitName.toLowerCase()));
}

function getTraitParam(traits: string[] | undefined, traitName: string): string | number | undefined {
  if (!traits) return undefined;
  const trait = traits.find((t) => t.toLowerCase().startsWith(traitName.toLowerCase()));
  if (!trait) return undefined;
  const parts = trait.split(' ');
  if (parts.length < 2) return undefined;
  const val = parts.slice(1).join(' ');
  const num = Number(val);
  return isNaN(num) ? val : num;
}

// ——— Shared ok/fail helpers ———
function ok(message: string, extra?: Record<string, unknown>): { success: true; message: string; [key: string]: unknown } {
  return { success: true, message, ...extra };
}

function fail(message: string, errorCode?: string): { success: false; message: string; errorCode?: string; [key: string]: unknown } {
  return errorCode
    ? { success: false, message, errorCode }
    : { success: false, message };
}

export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validate attack range: melee must be within reach (1.5 squares),
 * ranged must be within weapon range (in squares).
 */
export function validateAttackRange(
  actor: Creature,
  target: Creature,
  weapon: CreatureWeapon | null
): { ok: boolean; message: string } {
    const distance = calculateDistance(actor.positions, target.positions);
    const isRanged = weapon?.attackType === 'ranged';
    
    // Check for THROWN trait: allows melee weapons to be thrown at specified range
    const isThrown = hasTrait(weapon?.traits, 'thrown');
    const thrownRange = isThrown ? getTraitParam(weapon?.traits, 'thrown') : undefined;

    if (isRanged || isThrown) {
      // Ranged weapon or thrown melee weapon
      // PF2e Remaster: Range increment system with 6 total increments max
      let rangeIncrementSq = weapon?.range ?? 12; // default 12 squares (60ft) if not specified
      
      // If Thrown trait on non-ranged weapon, use its range instead (trait value is in feet)
      if (isThrown && !isRanged && thrownRange) {
        rangeIncrementSq = Math.round(parseInt(thrownRange as string) / 5); // Convert feet to squares
      }

      // Max 6 range increments (PF2e rule)
      const maxRangeSq = rangeIncrementSq * 6;

      if (distance > maxRangeSq + 1e-6) { // Floating-point tolerance
        return {
          ok: false,
          message: `${target.name} is beyond maximum range! (${Math.round(distance * 5)}ft away, max 6 increments × ${rangeIncrementSq * 5}ft = ${maxRangeSq * 5}ft)`
        };
      }
    } else {
      // Melee weapon: use getEffectiveReach for proper reach calculation (size, traits, feats)
      const dx = Math.abs(actor.positions.x - target.positions.x);
      const dy = Math.abs(actor.positions.y - target.positions.y);
      const gridDistance = Math.max(dx, dy); // Chebyshev distance for grid-based melee
      const maxReach = getEffectiveReach(actor, weapon);
      if (gridDistance > maxReach) {
        return { ok: false, message: `${target.name} is out of melee reach (${maxReach * 5}ft)! Move closer first.` };
      }
    }

    return { ok: true, message: '' };
}

export function isTargetFlanked(attacker: Creature, target: Creature, gameState: GameState): boolean {
  const weapon = attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : null;
  if (weapon && weapon.type !== 'melee') return false;

  const allies = gameState.creatures.filter((c) => {
    if (c.id === attacker.id || c.id === target.id) return false;
    if (c.currentHealth <= 0) return false;
    const dyingCondition = c.conditions?.find((cond) => cond.name === 'dying');
    if (dyingCondition) return false;
    const allyWeapon = c.equippedWeapon ? getWeapon(c.equippedWeapon) : null;
    if (!allyWeapon || allyWeapon.type !== 'melee') return false;
    const distX = c.positions.x - target.positions.x;
    const distY = c.positions.y - target.positions.y;
    const distance = Math.sqrt(distX ** 2 + distY ** 2);
    if (distance > 1.5) return false;
    return true;
  });

  if (allies.length === 0) return false;

  for (const ally of allies) {
    const targetToAttacker = {
      x: attacker.positions.x - target.positions.x,
      y: attacker.positions.y - target.positions.y,
    };
    const targetToAlly = {
      x: ally.positions.x - target.positions.x,
      y: ally.positions.y - target.positions.y,
    };
    const dotProduct = targetToAttacker.x * targetToAlly.x + targetToAttacker.y * targetToAlly.y;
    const attackerDist = Math.sqrt(targetToAttacker.x ** 2 + targetToAttacker.y ** 2);
    if (attackerDist <= 1.5 && dotProduct < 0) {
      console.log(`\n⚔️  [FLANKING] ${target.name} is flanked by ${attacker.name} and ${ally.name}`);
      return true;
    }
  }

  return false;
}

export function cleanupStaleFlankingConditions(gameState: GameState): void {
  gameState.creatures.forEach((target) => {
    if (!target.conditions || target.conditions.length === 0) return;

    target.conditions = target.conditions.filter((cond) => {
      if (cond.name !== 'off-guard' || !cond.source?.includes('Flanking')) return true;
      
      const flankingCreature = gameState.creatures.find((c) => c.id === cond.appliesAgainst);
      if (!flankingCreature) return false;
      
      const isStillFlanked = isTargetFlanked(flankingCreature, target, gameState);
      if (!isStillFlanked) {
        console.log(`  ÔØî After movement: ${flankingCreature.name} no longer flanking ${target.name}, removing off-guard`);
        return false;
      }
      
      return true; // Keep it, still flanked
    });
  });
}

export function resolveMovement(actor: Creature, gameState: GameState, targetPosition?: Position, actionId?: string): any {
  if (!targetPosition) {
    return fail('No destination specified');
  }

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // PHASE 2.1: IMMOBILIZATION CHECKS
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Check for conditions that prevent movement
  const immobilizedCondition = actor.conditions?.find((c) => ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name));
  if (immobilizedCondition) {
    return {
      success: false,
      message: `${actor.name} cannot move while ${immobilizedCondition.name}!`,
      errorCode: 'IMMOBILIZED'
    };
  }

  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // PHASE 1.1 FIX: MOVEMENT SYSTEM - PF2e Remaster Compliance
  // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
  // Reference: Player Core p.471 (Stride), p.420 (Step)
  
  // 1. SPEED CALCULATION
  // In PF2e: Speed is in feet. 1 square = 5 feet.
  // Prone creatures treat difficult terrain as greater difficult terrain (4x cost instead of 2x)
  const isProne = actor.conditions?.some(c => c.name === 'prone') ?? false;
  const terrainMultiplier = isProne ? { difficult: 4 } : { difficult: 2 };
  
  const maxDistance = (actor.speed ?? 25) / 5; // Convert feet to squares
  
  // 2. PATHFINDING WITH TERRAIN
  const gameMap = (actor as any)._map as any;
  const terrainGrid = gameMap?.terrain;
  const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
  const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;

  // Reject out-of-bounds destinations early
  if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
    return {
      success: false,
      message: `Cannot move to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
      errorCode: 'OUT_OF_BOUNDS'
    };
  }
  
  // Exclude self and dead creatures from occupied positions (multi-tile aware)
  const occupiedPositions = new Set<string>();
  gameState.creatures
    .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
    .forEach((creature) => {
      for (const key of getOccupiedKeys(creature)) {
        occupiedPositions.add(key);
      }
    });
  
  // 4. VALIDATE DESTINATION NOT OCCUPIED
  const destKey = `${targetPosition.x},${targetPosition.y}`;
  if (occupiedPositions.has(destKey)) {
    return {
      success: false,
      message: `Cannot move to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
      errorCode: 'DESTINATION_OCCUPIED'
    };
  }

  let pathCost = calculateDistance(actor.positions, targetPosition);
  
  if (terrainGrid) {
    pathCost = computePathCost(actor.positions, targetPosition, terrainGrid, {
      maxDistance,
      occupiedPositions,
      terrainCostMultiplier: terrainMultiplier,
    });
  }
  
  // 3. DESTINATION VALIDITY
  if (pathCost === Infinity) {
    return fail('No valid path to destination.', 'BLOCKED_PATH');
  }
  
  if (pathCost > maxDistance) {
    return { 
      success: false, 
      message: `Cannot move ${pathCost.toFixed(1)} squares - max is ${maxDistance}`,
      errorCode: 'INSUFFICIENT_MOVEMENT',
      movementCost: pathCost,
      maxDistance
    };
  }
  
  // 5. EXECUTE MOVEMENT
  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = targetPosition;
  
  // 6. FLANKING CLEANUP
  // Re-evaluate flanking conditions based on new positions
  cleanupStaleFlankingConditions(gameState);
  
  // 7. MOVEMENT LOG
  const movementLog = `${actor.name} moved from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y}) [${pathCost.toFixed(1)} squares]`;
  
  // 8. REACTIVE STRIKE TRIGGER (handled by GameEngine)
  // GameEngine.findReactiveStrikeOpportunities() will detect this movement
  // and create reactive strike opportunities for adjacent enemies.
  // Stride triggers reactions, Step and move do not.
  
  return {
    success: true,
    message: movementLog,
    newPosition: targetPosition,
    movementCost: pathCost,
    maxDistance,
    oldPosition: oldPos,
    actionId, // Pass back for engine to identify Stride
    isProne,
  };
}

/**
 * Resolve Step action (PF2e: 1 action, 5 feet, no Reactive Strike)
 * Reference: Player Core p.420
 */
export function resolveStep(
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position
): any {
  if (!targetPosition) {
    return fail('No destination specified for Step action');
  }
  
  // 1. CALCULATE DISTANCE
  const distance = calculateDistance(actor.positions, targetPosition);
  
  // 2. VALIDATE 5-FOOT LIMIT
  // Step allows moving exactly 5 feet (1 square), including diagonals
  if (distance > 1.5) { // 1.5 accounts for diagonal movement (ÔêÜ2 Ôëê 1.414)
    return {
      success: false,
      message: `Step allows only 5 feet (1 square) of movement. Distance to (${targetPosition.x}, ${targetPosition.y}) is ${(distance * 5).toFixed(1)} feet.`,
      errorCode: 'STEP_TOO_FAR'
    };
  }
  
  // 3. VALIDATE DESTINATION WITHIN BOUNDS
  const gameMap = (actor as any)._map as any;
  const terrainGrid = gameMap?.terrain;
  const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
  const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;
  
  if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
    return {
      success: false,
      message: `Cannot step to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
      errorCode: 'OUT_OF_BOUNDS'
    };
  }
  
  // 4. VALIDATE DESTINATION NOT OCCUPIED (multi-tile aware)
  const occupiedPositions = new Set<string>();
  gameState.creatures
    .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
    .forEach((creature) => {
      for (const key of getOccupiedKeys(creature)) {
        occupiedPositions.add(key);
      }
    });
  
  const destKey = `${targetPosition.x},${targetPosition.y}`;
  if (occupiedPositions.has(destKey)) {
    return {
      success: false,
      message: `Cannot step to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
      errorCode: 'DESTINATION_OCCUPIED'
    };
  }
  
  // 5. EXECUTE STEP
  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = targetPosition;
  
  // 6. FLANKING CLEANUP
  // Re-evaluate flanking conditions based on new positions
  cleanupStaleFlankingConditions(gameState);
  
  // 7. STEP LOG
  const stepLog = `${actor.name} stepped from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y})`;
  
  // 8. NO REACTIVE STRIKE TRIGGER
  // Step does NOT trigger Reactive Strike (unlike Stride)
  // The engine checks actionId and 'step' is not in the moveActions list
  
  return {
    success: true,
    message: stepLog,
    newPosition: targetPosition,
    oldPosition: oldPos,
    actionId: 'step',
  };
}
