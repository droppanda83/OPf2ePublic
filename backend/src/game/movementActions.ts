import { Creature, GameState, Position, computePathCost, findExplorationPath } from 'pf2e-shared';
import { getEffectiveSpeed } from './helpers';

export interface MovementContext {
  calculateDistance: (from: Position, to: Position) => number;
  hasFeat: (actor: Creature, featName: string) => boolean;
  cleanupStaleFlankingConditions: (gameState: GameState) => void;
}

export function resolveMovementAction(
  ctx: MovementContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  actionId?: string
): any {
  if (!targetPosition) {
    return { success: false, message: 'No destination specified' };
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2.1: IMMOBILIZATION CHECKS
  // ═══════════════════════════════════════════════════════════
  const immobilizedCondition = actor.conditions?.find((c) =>
    ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name)
  );
  if (immobilizedCondition) {
    return {
      success: false,
      message: `${actor.name} cannot move while ${immobilizedCondition.name}!`,
      errorCode: 'IMMOBILIZED',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 1.1 FIX: MOVEMENT SYSTEM - PF2e Remaster Compliance
  // ═══════════════════════════════════════════════════════════
  const isProne = actor.conditions?.some(c => c.name === 'prone') ?? false;
  const hasLightStep = ctx.hasFeat(actor, 'Light Step');
  const difficultCost = hasLightStep ? 1 : (isProne ? 4 : 2);
  const terrainMultiplier = { difficult: difficultCost };

  const maxDistance = getEffectiveSpeed(actor) / 5; // Convert feet to squares

  // 2. PATHFINDING WITH TERRAIN
  const gameMap = actor._map;
  const terrainGrid = gameMap?.terrain;
  const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
  const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;

  // Reject out-of-bounds destinations early
  if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
    return {
      success: false,
      message: `Cannot move to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
      errorCode: 'OUT_OF_BOUNDS',
    };
  }

  // Exclude self and dead creatures from occupied positions
  const occupiedPositions = new Set<string>(
    gameState.creatures
      .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
      .map((creature) => `${creature.positions.x},${creature.positions.y}`)
  );

  // 4. VALIDATE DESTINATION NOT OCCUPIED
  const destKey = `${targetPosition.x},${targetPosition.y}`;
  if (occupiedPositions.has(destKey)) {
    return {
      success: false,
      message: `Cannot move to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
      errorCode: 'DESTINATION_OCCUPIED',
    };
  }

  let pathCost = ctx.calculateDistance(actor.positions, targetPosition);

  if (terrainGrid) {
    pathCost = computePathCost(actor.positions, targetPosition, terrainGrid, {
      maxDistance,
      occupiedPositions,
      terrainCostMultiplier: terrainMultiplier,
    });
  }

  // 3. DESTINATION VALIDITY
  if (pathCost === Infinity) {
    return { success: false, message: 'No valid path to destination.', errorCode: 'BLOCKED_PATH' };
  }

  if (pathCost > maxDistance) {
    return {
      success: false,
      message: `Cannot move ${pathCost.toFixed(1)} squares - max is ${maxDistance}`,
      errorCode: 'INSUFFICIENT_MOVEMENT',
      movementCost: pathCost,
      maxDistance,
    };
  }

  // 5. EXECUTE MOVEMENT
  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = targetPosition;

  // 6. FLANKING CLEANUP
  ctx.cleanupStaleFlankingConditions(gameState);

  // 7. MOVEMENT LOG
  let movementLog = `${actor.name} moved from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y}) [${pathCost.toFixed(1)} squares]`;

  if (hasLightStep) {
    movementLog += ' (Light Step ignores difficult terrain)';
  }

  if (actionId === 'stride' && ctx.hasFeat(actor, 'Mobility')) {
    actor.conditions = (actor.conditions || []).filter((c) => c.name !== 'mobility-vs-reactions');
    actor.conditions.push({ name: 'mobility-vs-reactions', duration: 1, value: 2, source: 'mobility' });
    movementLog += ' (Mobility: +2 AC vs reactions from this movement)';
  }

  // Compute the full path for step-by-step animation
  let path: Position[] | null = null;
  const tiles = (gameState.map as any)?.tiles as string[][] | undefined;
  const moveCostOverride = (gameState.map as any)?.moveCostOverride as (number | null)[][] | undefined;
  path = findExplorationPath(oldPos, targetPosition, {
    mapWidth,
    mapHeight,
    terrain: terrainGrid,
    tiles,
    moveCostOverride,
    occupiedPositions,
  });
  // Fallback: if pathfinding fails, just use start and end
  if (!path || path.length < 2) {
    path = [oldPos, targetPosition];
  }

  return {
    success: true,
    message: movementLog,
    newPosition: targetPosition,
    movementCost: pathCost,
    maxDistance,
    oldPosition: oldPos,
    actionId,
    isProne,
    path,
  };
}

export function resolveStepAction(
  ctx: MovementContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position
): any {
  if (!targetPosition) {
    return { success: false, message: 'No destination specified for Step action' };
  }

  // 1. CALCULATE DISTANCE
  const distance = ctx.calculateDistance(actor.positions, targetPosition);

  // 2. VALIDATE STEP DISTANCE
  const maxStepSquares = ctx.hasFeat(actor, 'Elf Step') ? 2.5 : 1.5;
  if (distance > maxStepSquares) {
    const maxFeet = ctx.hasFeat(actor, 'Elf Step') ? 10 : 5;
    return {
      success: false,
      message: `Step allows only ${maxFeet} feet of movement. Distance to (${targetPosition.x}, ${targetPosition.y}) is ${(distance * 5).toFixed(1)} feet.`,
      errorCode: 'STEP_TOO_FAR',
    };
  }

  // 3. VALIDATE DESTINATION WITHIN BOUNDS
  const gameMap = actor._map;
  const terrainGrid = gameMap?.terrain;
  const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
  const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;

  if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
    return {
      success: false,
      message: `Cannot step to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
      errorCode: 'OUT_OF_BOUNDS',
    };
  }

  // 4. VALIDATE DESTINATION NOT OCCUPIED
  const occupiedPositions = new Set<string>(
    gameState.creatures
      .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
      .map((creature) => `${creature.positions.x},${creature.positions.y}`)
  );

  const destKey = `${targetPosition.x},${targetPosition.y}`;
  if (occupiedPositions.has(destKey)) {
    return {
      success: false,
      message: `Cannot step to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
      errorCode: 'DESTINATION_OCCUPIED',
    };
  }

  // 5. EXECUTE STEP
  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = targetPosition;

  // 6. FLANKING CLEANUP
  ctx.cleanupStaleFlankingConditions(gameState);

  // 7. STEP LOG
  const stepLog = `${actor.name} stepped from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y})`;

  return {
    success: true,
    message: stepLog,
    newPosition: targetPosition,
    oldPosition: oldPos,
    actionId: 'step',
    path: [oldPos, targetPosition],
  };
}

export function resolveStandAction(actor: Creature): any {
  const proneCondition = actor.conditions?.find((c) => c.name === 'prone');
  if (!proneCondition) {
    return {
      success: false,
      message: `${actor.name} is not prone!`,
    };
  }

  actor.conditions = actor.conditions?.filter((c) => c.name !== 'prone') || [];

  return {
    success: true,
    message: `🧍 ${actor.name} stands up from prone!`,
  };
}

export function resolveCrawlAction(
  ctx: MovementContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position
): any {
  const isProne = (actor.conditions ?? []).some((c: any) => c.name === 'prone');
  if (!isProne) {
    return { success: false, message: 'You must be prone to Crawl. You can just Stride instead.' };
  }

  if (!targetPosition) {
    return { success: false, message: 'No destination specified for Crawl.' };
  }

  const distance = ctx.calculateDistance(actor.positions, targetPosition);
  if (distance > 1.5) {
    return { success: false, message: 'Crawl only allows 5ft of movement (1 square).' };
  }

  const mw = gameState.map?.width ?? 0;
  const mh = gameState.map?.height ?? 0;
  if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mw || targetPosition.y >= mh) {
    return { success: false, message: 'Destination is outside map bounds.' };
  }

  const occupiedPositions = new Set<string>(
    gameState.creatures
      .filter(c => c.id !== actor.id && c.currentHealth > 0)
      .map(c => `${c.positions.x},${c.positions.y}`)
  );
  if (occupiedPositions.has(`${targetPosition.x},${targetPosition.y}`)) {
    return { success: false, message: 'Destination is occupied by another creature.' };
  }

  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = { x: targetPosition.x, y: targetPosition.y };
  ctx.cleanupStaleFlankingConditions(gameState);

  const message = `🦞 ${actor.name} crawls from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y}).\n✅ Crawl does not trigger reactions.`;

  return { success: true, message, newPosition: targetPosition, oldPosition: oldPos };
}
