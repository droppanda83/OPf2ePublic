// ═══════════════════════════════════════════════════════════
// subsystems.ts — Cross-class combat subsystems
// Size, Reach, Forced Movement, Polymorph, Elevation, Reactions
// ═══════════════════════════════════════════════════════════

import {
  Creature,
  GameState,
  CreatureWeapon,
  Position,
  CreatureSize,
  rollD20,
} from 'pf2e-shared';
import { debugLog } from './logger';
import { hasTrait } from './helpers';

// ─────────────────────────────────────────────────────────
// SIZE SUBSYSTEM
// PF2e sizes: Tiny (0.5sq), Small/Medium (1sq), Large (2sq),
// Huge (3sq), Gargantuan (4sq)
// ─────────────────────────────────────────────────────────

/** Ordered sizes for comparison (index = numeric rank) */
const SIZE_ORDER: CreatureSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

/** Get numeric size rank for comparison (0=tiny, 5=gargantuan) */
export function getSizeRank(size: CreatureSize | undefined): number {
  return SIZE_ORDER.indexOf(size ?? 'medium');
}

/** Compare two sizes: <0 if a is smaller, 0 if equal, >0 if a is bigger */
export function compareSizes(a: CreatureSize | undefined, b: CreatureSize | undefined): number {
  return getSizeRank(a) - getSizeRank(b);
}

/** Get the grid space (in squares) for a creature size */
export function getSpaceForSize(size: CreatureSize | undefined): number {
  switch (size ?? 'medium') {
    case 'tiny': return 0.5; // Shares squares
    case 'small':
    case 'medium': return 1;
    case 'large': return 2;
    case 'huge': return 3;
    case 'gargantuan': return 4;
    default: return 1;
  }
}

/** Get the natural (base) unarmed reach in feet for a creature size */
export function getNaturalReachForSize(size: CreatureSize | undefined): number {
  switch (size ?? 'medium') {
    case 'tiny': return 0;   // Can only attack own square
    case 'small':
    case 'medium': return 5; // 1 square
    case 'large': return 10; // 2 squares
    case 'huge': return 15;  // 3 squares
    case 'gargantuan': return 20; // 4 squares
    default: return 5;
  }
}

/** Get the effective size of a creature, accounting for polymorph/conditions */
export function getEffectiveSize(creature: Creature): CreatureSize {
  // Check for size-changing conditions (Giant's Stature, Enlarge, etc.)
  if (creature.conditions) {
    // Largest active size change wins
    const titanStature = creature.conditions.some(c => c.name === 'titans-stature');
    if (titanStature) return 'huge';
    const giantsStature = creature.conditions.some(c => c.name === 'giants-stature');
    if (giantsStature) return 'large';
    const enlarged = creature.conditions.some(c => c.name === 'enlarged');
    if (enlarged) {
      const base = creature.size ?? 'medium';
      const rank = getSizeRank(base);
      return SIZE_ORDER[Math.min(rank + 1, 5)] as CreatureSize;
    }
    const shrunk = creature.conditions.some(c => c.name === 'shrunk');
    if (shrunk) {
      const base = creature.size ?? 'medium';
      const rank = getSizeRank(base);
      return SIZE_ORDER[Math.max(rank - 1, 0)] as CreatureSize;
    }
  }
  return creature.size ?? 'medium';
}

/**
 * Initialize size-derived fields on a creature.
 * Call after creation or after any form change.
 */
export function applySize(creature: Creature, size: CreatureSize): void {
  creature.size = size;
  creature.space = getSpaceForSize(size);
  creature.naturalReach = getNaturalReachForSize(size);
}

/**
 * Get all grid squares occupied by a creature.
 * The creature's position is the top-left origin.
 * Tiny creatures (0.5 space) still occupy 1 square for grid purposes.
 * Returns array of {x, y} for every square the creature fills.
 */
export function getOccupiedSquares(creature: Creature): Position[] {
  const effectiveSize = getEffectiveSize(creature);
  const space = getSpaceForSize(effectiveSize);
  const gridSpace = Math.max(1, Math.ceil(space)); // Tiny → 1 square
  const squares: Position[] = [];
  for (let dy = 0; dy < gridSpace; dy++) {
    for (let dx = 0; dx < gridSpace; dx++) {
      squares.push({ x: creature.positions.x + dx, y: creature.positions.y + dy });
    }
  }
  return squares;
}

/**
 * Get all grid square keys ("x,y") occupied by a creature.
 * Useful for Set lookups.
 */
export function getOccupiedKeys(creature: Creature): string[] {
  return getOccupiedSquares(creature).map(p => `${p.x},${p.y}`);
}

/**
 * Compute minimum Chebyshev (grid) distance between two multi-tile creatures.
 * PF2e: distance is measured from the nearest edge/square of each creature.
 */
export function distanceBetweenCreatures(a: Creature, b: Creature): number {
  const squaresA = getOccupiedSquares(a);
  const squaresB = getOccupiedSquares(b);
  let minDist = Infinity;
  for (const sa of squaresA) {
    for (const sb of squaresB) {
      const dx = Math.abs(sa.x - sb.x);
      const dy = Math.abs(sa.y - sb.y);
      const dist = Math.max(dx, dy); // Chebyshev
      if (dist < minDist) minDist = dist;
    }
  }
  return minDist;
}

/**
 * Compute minimum Euclidean distance between two multi-tile creatures.
 * Used for ranged & spell targeting.
 */
export function euclideanDistanceBetweenCreatures(a: Creature, b: Creature): number {
  const squaresA = getOccupiedSquares(a);
  const squaresB = getOccupiedSquares(b);
  let minDist = Infinity;
  for (const sa of squaresA) {
    for (const sb of squaresB) {
      const dx = sa.x - sb.x;
      const dy = sa.y - sb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
  }
  return minDist;
}

/**
 * Check if a creature's occupied area overlaps with a set of occupied position keys.
 * Returns true if ANY of the creature's squares overlap.
 */
export function creatureOverlapsOccupied(creature: Creature, occupiedKeys: Set<string>): boolean {
  return getOccupiedKeys(creature).some(key => occupiedKeys.has(key));
}

/**
 * Check if placing a creature at a given position (top-left origin) would fit within map bounds.
 */
export function creatureFitsInBounds(
  pos: Position,
  size: CreatureSize | undefined,
  mapWidth: number,
  mapHeight: number,
): boolean {
  const space = getSpaceForSize(size);
  const gridSpace = Math.max(1, Math.ceil(space));
  return pos.x >= 0 && pos.y >= 0 &&
    pos.x + gridSpace <= mapWidth &&
    pos.y + gridSpace <= mapHeight;
}

// ─────────────────────────────────────────────────────────
// REACH SUBSYSTEM
// Computes effective melee reach accounting for size, weapons,
// feats, conditions, and polymorph effects.
// ─────────────────────────────────────────────────────────

/**
 * Get the effective melee reach (in grid squares) for a creature
 * with a given weapon, accounting for:
 * - Base size reach
 * - Weapon "reach" trait (+5ft / +1sq)
 * - Giant's Stature / Titan's Stature conditions
 * - Giant's Lunge condition
 * - Lunging Stance condition
 * - Lunge condition
 */
export function getEffectiveReach(
  creature: Creature,
  weapon?: CreatureWeapon | null,
): number {
  // Start with size-based natural reach (in feet)
  const effectiveSize = getEffectiveSize(creature);
  let reachFt = getNaturalReachForSize(effectiveSize);

  // Weapon reach trait: +5ft
  if (weapon && hasTrait(weapon.traits, 'reach')) {
    reachFt += 5;
  }

  // Giant's Lunge condition: sets all melee reach to 10ft minimum
  // (already Large from Giant's Stature, so this adds effective reach)
  if (creature.conditions?.some(c => c.name === 'giants-lunge')) {
    reachFt = Math.max(reachFt, 10);
  }

  // Lunging Stance: +5ft to all melee reach
  if (creature.conditions?.some(c => c.name === 'lunging-stance')) {
    reachFt += 5;
  }

  // Lunge action: +5ft for next attack (condition-based)
  if (creature.conditions?.some(c => c.name === 'lunge-active')) {
    reachFt += 5;
  }

  // Convert feet to grid squares (5ft per square, minimum 0)
  return Math.max(0, Math.round(reachFt / 5));
}

/**
 * Check if a creature threatens a position (for flanking, Reactive Strike, etc.)
 * Accounts for size-based reach and reach-extending conditions.
 * Multi-tile creatures: measures from the nearest occupied square.
 */
export function threatensPosition(
  creature: Creature,
  targetPos: Position,
  weapon?: CreatureWeapon | null,
): boolean {
  const reach = getEffectiveReach(creature, weapon);
  const squares = getOccupiedSquares(creature);
  for (const sq of squares) {
    const dx = Math.abs(sq.x - targetPos.x);
    const dy = Math.abs(sq.y - targetPos.y);
    const gridDistance = Math.max(dx, dy); // Chebyshev distance
    if (gridDistance <= reach && gridDistance > 0) return true;
  }
  return false;
}

/**
 * Check if creature A is adjacent to creature B (within 1 square / 5ft).
 * Multi-tile creatures: adjacent if ANY pair of occupied squares is adjacent or overlapping.
 * For Tiny creatures sharing a square, always adjacent.
 */
export function isAdjacentCreatures(a: Creature, b: Creature): boolean {
  const squaresA = getOccupiedSquares(a);
  const squaresB = getOccupiedSquares(b);
  for (const sa of squaresA) {
    for (const sb of squaresB) {
      const dx = Math.abs(sa.x - sb.x);
      const dy = Math.abs(sa.y - sb.y);
      if (Math.max(dx, dy) <= 1) return true;
    }
  }
  return false;
}

/**
 * Check if two positions are adjacent (within 1 square / 5ft).
 * For point-based checks (e.g. position-to-position).
 */
export function isAdjacent(a: Position, b: Position): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) <= 1 && (dx + dy > 0);
}

// ─────────────────────────────────────────────────────────
// FORCED MOVEMENT SUBSYSTEM
// Push, pull, and slide creatures with validation.
// Handles map bounds, occupied squares, and immovable checks.
// ─────────────────────────────────────────────────────────

export type ForcedMovementDirection = 'away' | 'toward' | 'custom';

export interface ForcedMovementOptions {
  /** Distance in feet to push/pull */
  distanceFt: number;
  /** Direction: 'away' from source, 'toward' source, or 'custom' with explicit dx/dy */
  direction: ForcedMovementDirection;
  /** Source position (the creature doing the pushing/pulling) */
  sourcePosition: Position;
  /** Custom direction vector (only used when direction === 'custom') */
  customDirection?: { dx: number; dy: number };
  /** Whether this movement triggers reactions (default: true) */
  triggersReactions?: boolean;
  /** Whether the target can be pushed through occupied squares (default: false) */
  ignoreOccupied?: boolean;
}

export interface ForcedMovementResult {
  success: boolean;
  /** Actual distance moved in feet */
  distanceMoved: number;
  /** Old position */
  oldPosition: Position;
  /** New position */
  newPosition: Position;
  /** Whether movement was blocked early (wall, edge, occupied) */
  blocked: boolean;
  /** Reason for blocking if applicable */
  blockReason?: string;
  message: string;
}

/**
 * Apply forced movement (push/pull/slide) to a creature.
 * Validates map bounds, occupied squares, and immovable conditions.
 * Moves the creature step-by-step to handle blockers.
 */
export function applyForcedMovement(
  target: Creature,
  gameState: GameState,
  options: ForcedMovementOptions,
): ForcedMovementResult {
  const oldPos = { x: target.positions.x, y: target.positions.y };
  
  // Check if target is immovable
  const immovable = target.conditions?.find(c =>
    ['immobilized', 'petrified'].includes(c.name)
  );
  if (immovable) {
    return {
      success: false,
      distanceMoved: 0,
      oldPosition: oldPos,
      newPosition: oldPos,
      blocked: true,
      blockReason: `${target.name} is ${immovable.name} and cannot be moved.`,
      message: `${target.name} is ${immovable.name} and cannot be forced to move.`,
    };
  }

  // Determine direction vector
  let dirX: number;
  let dirY: number;

  if (options.direction === 'custom' && options.customDirection) {
    dirX = options.customDirection.dx;
    dirY = options.customDirection.dy;
  } else {
    // Calculate from source to target
    const rawDx = target.positions.x - options.sourcePosition.x;
    const rawDy = target.positions.y - options.sourcePosition.y;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    
    if (dist < 0.01) {
      // Overlapping — push in a random cardinal direction
      dirX = 1;
      dirY = 0;
    } else {
      dirX = rawDx / dist;
      dirY = rawDy / dist;
    }

    // Reverse for "toward"
    if (options.direction === 'toward') {
      dirX = -dirX;
      dirY = -dirY;
    }
  }

  // Normalize to unit vector
  const mag = Math.sqrt(dirX * dirX + dirY * dirY);
  if (mag > 0.01) {
    dirX /= mag;
    dirY /= mag;
  }

  // Convert distance to squares and move step-by-step
  const distanceSq = Math.round(options.distanceFt / 5);
  const mapWidth = gameState.map?.width ?? 30;
  const mapHeight = gameState.map?.height ?? 30;

  let currentX = target.positions.x;
  let currentY = target.positions.y;
  let squaresMoved = 0;
  let blocked = false;
  let blockReason: string | undefined;

  for (let step = 0; step < distanceSq; step++) {
    const nextX = Math.round(currentX + dirX);
    const nextY = Math.round(currentY + dirY);

    // Check map bounds
    if (nextX < 0 || nextX >= mapWidth || nextY < 0 || nextY >= mapHeight) {
      blocked = true;
      blockReason = 'map edge';
      break;
    }

    // Check for impassable terrain
    if (gameState.map?.terrain) {
      const terrain = gameState.map.terrain[nextY]?.[nextX];
      const terrainBlocking = terrain && terrain.type === 'impassable';
      if (terrainBlocking) {
        blocked = true;
        blockReason = 'impassable terrain';
        break;
      }
    }

    // Check for occupied squares (unless allowed) — multi-tile aware
    if (!options.ignoreOccupied) {
      const occupiedKeys = new Set<string>();
      gameState.creatures
        .filter(c => c.id !== target.id && c.currentHealth > 0)
        .forEach(c => { for (const k of getOccupiedKeys(c)) occupiedKeys.add(k); });
      const nextKey = `${nextX},${nextY}`;
      if (occupiedKeys.has(nextKey)) {
        blocked = true;
        blockReason = 'occupied square';
        break;
      }
    }

    currentX = nextX;
    currentY = nextY;
    squaresMoved++;
  }

  // Apply final position
  target.positions.x = currentX;
  target.positions.y = currentY;
  const newPos = { x: currentX, y: currentY };
  const distMovedFt = squaresMoved * 5;

  const directionStr = options.direction === 'toward' ? 'pulled' : 'pushed';
  let message: string;
  if (squaresMoved === 0) {
    message = `${target.name} could not be ${directionStr}.`;
  } else if (blocked) {
    message = `${target.name} was ${directionStr} ${distMovedFt}ft (blocked by ${blockReason}).`;
  } else {
    message = `${target.name} was ${directionStr} ${distMovedFt}ft.`;
  }

  return {
    success: squaresMoved > 0,
    distanceMoved: distMovedFt,
    oldPosition: oldPos,
    newPosition: newPos,
    blocked,
    blockReason,
    message,
  };
}

// ─────────────────────────────────────────────────────────
// POLYMORPH / FORM CHANGE SUBSYSTEM
// Generic transform + revert for battle forms, Wild Shape,
// Dragon Transformation, Giant's Stature, etc.
// ─────────────────────────────────────────────────────────

export interface BattleFormStats {
  /** Display name of the form */
  formName: string;
  /** New creature size */
  size?: CreatureSize;
  /** Override speed in feet */
  speed?: number;
  /** Override STR modifier */
  strength?: number;
  /** Override DEX modifier */
  dexterity?: number;
  /** Override AC */
  armorClass?: number;
  /** Replacement attacks (replaces weapon inventory for the form's duration) */
  attacks?: CreatureWeapon[];
  /** Temp HP granted on transformation */
  tempHp?: number;
  /** Conditions to apply (e.g., clumsy 1 from Giant's Stature) */
  conditions?: { name: string; value?: number }[];
  /** Duration in rounds (undefined = until dismissed) */
  durationRounds?: number;
  /** Whether creature can cast spells in this form */
  canCastSpells?: boolean;
  /** Fly speed in feet (0 = no flight) */
  flySpeed?: number;
  /** Bonus to attack rolls in this form */
  attackBonus?: number;
  /** Damage bonus added to all form attacks */
  damageBonus?: number;
}

/**
 * Transform a creature into a battle form.
 * Saves original stats and applies new form's overrides.
 * Follows PF2e polymorph rules: stats are overridden (not added to),
 * equipment bonuses don't apply, can't use most consumables.
 */
export function applyBattleForm(creature: Creature, form: BattleFormStats): string {
  // Save original stats for reverting
  creature.polymorphOriginalStats = {
    size: creature.size,
    space: creature.space,
    naturalReach: creature.naturalReach,
    speed: creature.speed,
    strength: creature.abilities?.strength,
    dexterity: creature.abilities?.dexterity,
    armorClass: creature.armorClass,
    attacks: creature.weaponInventory?.map(ws => ({ ...ws.weapon })) as CreatureWeapon[],
  };

  creature.polymorphForm = form.formName;

  // Apply size change
  if (form.size) {
    applySize(creature, form.size);
  }

  // Apply stat overrides (PF2e: use form's stats if HIGHER than creature's)
  if (form.speed !== undefined) {
    creature.speed = form.speed;
  }
  if (form.strength !== undefined && creature.abilities) {
    creature.abilities.strength = form.strength;
  }
  if (form.dexterity !== undefined && creature.abilities) {
    creature.abilities.dexterity = form.dexterity;
  }
  if (form.armorClass !== undefined) {
    creature.armorClass = form.armorClass;
  }

  // Replace attacks if form provides them
  if (form.attacks && form.attacks.length > 0) {
    creature.weaponInventory = form.attacks.map(atk => ({
      weapon: atk,
      state: 'held' as const,
      hand: 'primary' as const,
    }));
  }

  // Apply temp HP
  if (form.tempHp) {
    creature.temporaryHealth = Math.max(creature.temporaryHealth ?? 0, form.tempHp);
  }

  // Apply conditions
  if (form.conditions) {
    if (!creature.conditions) creature.conditions = [];
    for (const cond of form.conditions) {
      creature.conditions.push({
        name: cond.name,
        duration: form.durationRounds ?? 'permanent',
        value: cond.value ?? 1,
        source: `polymorph-${form.formName}`,
      });
    }
  }

  // Add polymorph tracking condition
  if (!creature.conditions) creature.conditions = [];
  creature.conditions.push({
    name: 'polymorphed',
    duration: form.durationRounds ?? 'permanent',
    value: 1,
    source: form.formName,
  });

  // Store fly speed on a condition for the movement system to check
  if (form.flySpeed && form.flySpeed > 0) {
    creature.conditions.push({
      name: 'fly-speed',
      duration: form.durationRounds ?? 'permanent',
      value: form.flySpeed,
      source: `polymorph-${form.formName}`,
    });
  }

  const sizeStr = form.size ? ` (${form.size})` : '';
  return `${creature.name} transforms into ${form.formName}${sizeStr}!`;
}

/**
 * Revert a creature from a battle form to its original form.
 * Restores saved stats and removes polymorph-sourced conditions.
 */
export function revertBattleForm(creature: Creature): string {
  if (!creature.polymorphForm) {
    return `${creature.name} is not polymorphed.`;
  }

  const formName = creature.polymorphForm;
  const original = creature.polymorphOriginalStats;

  if (original) {
    // Restore size
    if (original.size) {
      applySize(creature, original.size);
    }
    // Restore stats
    if (original.speed !== undefined) creature.speed = original.speed;
    if (original.strength !== undefined && creature.abilities) {
      creature.abilities.strength = original.strength;
    }
    if (original.dexterity !== undefined && creature.abilities) {
      creature.abilities.dexterity = original.dexterity;
    }
    if (original.armorClass !== undefined) {
      creature.armorClass = original.armorClass;
    }
    // Restore attacks
    if (original.attacks) {
      creature.weaponInventory = original.attacks.map(atk => ({
        weapon: atk,
        state: 'held' as const,
        hand: 'primary' as const,
      }));
    }
  }

  // Remove polymorph-sourced conditions
  creature.conditions = (creature.conditions ?? []).filter(c =>
    c.source !== `polymorph-${formName}` && c.name !== 'polymorphed'
  );

  creature.polymorphForm = undefined;
  creature.polymorphOriginalStats = undefined;

  return `${creature.name} reverts from ${formName} to their natural form.`;
}

/**
 * Check if a creature is currently in a polymorph/battle form.
 */
export function isPolymorphed(creature: Creature): boolean {
  return !!creature.polymorphForm;
}

// ─────────────────────────────────────────────────────────
// ELEVATION / FLIGHT SUBSYSTEM
// Tracks vertical position for flight, levitation, and
// fall damage calculations.
// ─────────────────────────────────────────────────────────

/**
 * Get a creature's fly speed (0 if none).
 * Checks for fly-speed conditions from polymorph, spells, or feats.
 */
export function getFlySpeed(creature: Creature): number {
  const flyCondition = creature.conditions?.find(c => c.name === 'fly-speed');
  return flyCondition?.value ?? 0;
}

/**
 * Get a creature's current elevation in feet.
 */
export function getElevation(creature: Creature): number {
  return creature.positions?.elevation ?? 0;
}

/**
 * Set a creature's elevation (fly up/down).
 * Validates fly speed availability.
 */
export function setElevation(
  creature: Creature,
  newElevationFt: number,
): { success: boolean; message: string } {
  const flySpeed = getFlySpeed(creature);
  const currentElev = getElevation(creature);

  if (newElevationFt > 0 && flySpeed <= 0) {
    return {
      success: false,
      message: `${creature.name} cannot fly (no fly speed).`,
    };
  }

  if (newElevationFt < 0) {
    newElevationFt = 0; // Can't go underground in standard play
  }

  // Movement cost check could be added here (elevation change = movement spent)
  creature.positions.elevation = newElevationFt;

  if (newElevationFt > currentElev) {
    return {
      success: true,
      message: `${creature.name} flies up to ${newElevationFt}ft elevation.`,
    };
  } else if (newElevationFt < currentElev) {
    return {
      success: true,
      message: `${creature.name} descends to ${newElevationFt}ft elevation.`,
    };
  }
  return { success: true, message: `${creature.name} remains at ${newElevationFt}ft elevation.` };
}

/**
 * Calculate fall damage when a flying creature loses flight.
 * PF2e: 1d6 per 10 feet fallen, half on Reflex save (DC varies).
 */
export function calculateFallDamage(heightFt: number): { dice: string; averageDamage: number } {
  const d6Count = Math.floor(heightFt / 10);
  if (d6Count <= 0) return { dice: '0', averageDamage: 0 };
  return {
    dice: `${d6Count}d6`,
    averageDamage: Math.round(d6Count * 3.5),
  };
}

/**
 * Calculate 3D distance between two positions (accounts for elevation).
 * Returns distance in grid squares.
 */
export function calculate3DDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const elevDiffSq = ((a.elevation ?? 0) - (b.elevation ?? 0)) / 5; // Convert feet to squares
  // Euclidean distance including elevation
  return Math.sqrt(dx * dx + dy * dy + elevDiffSq * elevDiffSq);
}

// ─────────────────────────────────────────────────────────
// REACTION TRIGGER SYSTEM
// Provides hooks that can be called from the combat pipeline
// to automatically check for and prompt reactions.
// ─────────────────────────────────────────────────────────

export type ReactionTriggerType =
  | 'on-hit'             // Creature was hit by an attack
  | 'on-crit'            // Creature was critically hit
  | 'on-damaged'         // Creature took damage (any source)
  | 'on-ally-damaged'    // An adjacent ally took damage
  | 'on-enemy-movement'  // An enemy moved within reach (Reactive Strike trigger)
  | 'on-enemy-manipulate' // An enemy used a manipulate action within reach
  | 'on-enemy-cast'      // An enemy cast a spell within reach
  | 'on-critical-fail-save' // Creature critically failed a saving throw
  | 'on-fail-save'       // Creature failed a saving throw
  | 'on-turn-start'      // Start of creature's turn
  | 'on-turn-end'        // End of creature's turn
  | 'on-fall';           // Creature falls

export interface ReactionTrigger {
  type: ReactionTriggerType;
  /** Creature that triggered the reaction (e.g., the attacker) */
  triggerId?: string;
  /** Creature that may react */
  reactorId: string;
  /** Additional context */
  context?: {
    damageAmount?: number;
    damageType?: string;
    attackResult?: 'hit' | 'miss' | 'crit';
    isMelee?: boolean;
    isRanged?: boolean;
    fallHeight?: number;
  };
}

/**
 * Registry of reaction capabilities keyed by feat/ability name.
 * Each entry defines when it triggers and what condition enables it.
 */
export interface ReactionCapability {
  /** Name of the feat/ability granting this reaction */
  name: string;
  /** What triggers this reaction */
  triggerType: ReactionTriggerType;
  /** Action ID to dispatch when triggered (for rules.ts switch) */
  actionId: string;
  /** Additional validation before the reaction is offered */
  validate?: (reactor: Creature, trigger: ReactionTrigger, gameState: GameState) => boolean;
}

/** 
 * Built-in reaction capabilities from core rules and class features.
 * Extend this array as more classes are integrated.
 */
export const REACTION_REGISTRY: ReactionCapability[] = [
  // Core: Reactive Strike (AoO)
  {
    name: 'Reactive Strike',
    triggerType: 'on-enemy-manipulate',
    actionId: 'reactive-strike',
    validate: (reactor, trigger, gs) => {
      if (reactor.reactionUsed) return false;
      const enemy = gs.creatures.find(c => c.id === trigger.triggerId);
      if (!enemy) return false;
      // Must be within melee reach
      return threatensPosition(reactor, enemy.positions);
    },
  },
  // Core: Shield Block
  {
    name: 'Shield Block',
    triggerType: 'on-damaged',
    actionId: 'shield-block',
    validate: (reactor) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.shieldRaised;
    },
  },
  // Champion: Glimpse of Redemption / Liberating Step / Retributive Strike
  {
    name: 'Champion Reaction',
    triggerType: 'on-ally-damaged',
    actionId: 'champion-reaction',
    validate: (reactor) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.championCause;
    },
  },
  // Barbarian: Vengeful Strike (Come and Get Me upgrade)
  {
    name: 'Vengeful Strike',
    triggerType: 'on-hit',
    actionId: 'vengeful-strike',
    validate: (reactor) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.conditions?.some(c => c.name === 'come-and-get-me');
    },
  },
  // Barbarian: Furious Vengeance (L16)
  {
    name: 'Furious Vengeance',
    triggerType: 'on-crit',
    actionId: 'furious-vengeance',
    validate: (reactor) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.rageActive;
    },
  },
  // Barbarian: Tangle of Battle (L10)
  {
    name: 'Tangle of Battle',
    triggerType: 'on-crit',
    actionId: 'tangle-of-battle',
    validate: (reactor, trigger) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.rageActive && trigger.context?.isMelee === true;
    },
  },
  // Barbarian: Embrace the Pain (L12)
  {
    name: 'Embrace the Pain',
    triggerType: 'on-damaged',
    actionId: 'embrace-the-pain',
    validate: (reactor, trigger) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.rageActive && trigger.context?.isMelee === true;
    },
  },
  // Barbarian: Perfect Clarity (L18)
  {
    name: 'Perfect Clarity',
    triggerType: 'on-fail-save',
    actionId: 'perfect-clarity',
    validate: (reactor) => {
      if (reactor.reactionUsed) return false;
      return !!reactor.rageActive;
    },
  },
  // Barbarian: Impressive Landing (L10)
  {
    name: 'Impressive Landing',
    triggerType: 'on-fall',
    actionId: 'impressive-landing',
    validate: (reactor, trigger) => {
      if (reactor.reactionUsed) return false;
      return (trigger.context?.fallHeight ?? 0) >= 10;
    },
  },
  // Fighter: Reactive Shield
  {
    name: 'Reactive Shield',
    triggerType: 'on-hit',
    actionId: 'reactive-shield',
    validate: (reactor) => {
      if (reactor.reactionUsed) return false;
      return !reactor.shieldRaised;
    },
  },
  // Rogue: Nimble Dodge
  {
    name: 'Nimble Dodge',
    triggerType: 'on-hit',
    actionId: 'nimble-dodge',
    validate: (reactor) => !reactor.reactionUsed,
  },
];

/**
 * Check which reactions are available for a creature given a trigger event.
 * Returns a list of reaction capabilities that can be activated.
 */
export function getAvailableReactions(
  reactor: Creature,
  trigger: ReactionTrigger,
  gameState: GameState,
): ReactionCapability[] {
  if (reactor.reactionUsed) return [];
  if (reactor.dying || reactor.dead) return [];
  if (reactor.currentHealth <= 0) return [];

  return REACTION_REGISTRY.filter(cap => {
    // Trigger type must match
    if (cap.triggerType !== trigger.type) return false;

    // Creature must have the feat/special
    const hasAbility = (reactor.feats ?? []).some((f: any) => {
      const name = typeof f === 'string' ? f : f?.name ?? '';
      return name.toLowerCase().includes(cap.name.toLowerCase());
    }) || (reactor.specials ?? []).some(s =>
      s.toLowerCase().includes(cap.name.toLowerCase())
    );
    if (!hasAbility) return false;

    // Run custom validation
    if (cap.validate && !cap.validate(reactor, trigger, gameState)) return false;

    return true;
  });
}

/**
 * Fire a trigger event and return all available reactions across all creatures.
 * Used by the combat pipeline to prompt players for reaction choices.
 */
export function fireReactionTrigger(
  triggerType: ReactionTriggerType,
  triggerId: string,
  gameState: GameState,
  context?: ReactionTrigger['context'],
): { reactorId: string; reactions: ReactionCapability[] }[] {
  const results: { reactorId: string; reactions: ReactionCapability[] }[] = [];

  for (const creature of gameState.creatures) {
    // Skip the trigger source, dead creatures, etc.
    if (creature.id === triggerId) continue;
    if (creature.currentHealth <= 0 || creature.dying || creature.dead) continue;
    if (creature.reactionUsed) continue;

    const trigger: ReactionTrigger = {
      type: triggerType,
      triggerId,
      reactorId: creature.id,
      context,
    };

    const reactions = getAvailableReactions(creature, trigger, gameState);
    if (reactions.length > 0) {
      results.push({ reactorId: creature.id, reactions });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────
// BATTLE FORM CATALOG
// Pre-defined battle forms for common polymorph effects.
// ─────────────────────────────────────────────────────────

/** Dragon Form (Barbarian Dragon Instinct / Dragon Form spell) */
export function getDragonForm(level: number): BattleFormStats {
  // Scales with level per PF2e Dragon Form spell
  const isGreater = level >= 14;
  return {
    formName: 'Dragon Form',
    size: isGreater ? 'huge' : 'large',
    speed: isGreater ? 40 : 30,
    flySpeed: isGreater ? 120 : 100,
    strength: isGreater ? 8 : 6,
    dexterity: isGreater ? 4 : 3,
    armorClass: 18 + level, // Form AC
    tempHp: isGreater ? 20 : 10,
    conditions: [{ name: 'clumsy', value: 1 }],
    attacks: [
      {
        id: 'dragon-jaws',
        display: 'Jaws',
        attackType: 'melee',
        damageDice: isGreater ? '3d12' : '2d12',
        damageType: 'piercing',
        traits: ['reach'],
        attackBonus: 0,
        hands: 0,
        isNatural: true,
      },
      {
        id: 'dragon-claw',
        display: 'Claw',
        attackType: 'melee',
        damageDice: isGreater ? '3d10' : '2d10',
        damageType: 'slashing',
        traits: ['agile'],
        attackBonus: 0,
        hands: 0,
        isNatural: true,
      },
    ],
    durationRounds: 10, // 1 minute
  };
}

/** Animal Form (Barbarian Animal Instinct / Animal Form spell) */
export function getAnimalForm(animalType: string, level: number): BattleFormStats {
  const isGreater = level >= 10;
  const size = isGreater ? 'large' : 'medium';
  return {
    formName: `${animalType} Form`,
    size: size as CreatureSize,
    speed: isGreater ? 40 : 30,
    strength: isGreater ? 6 : 4,
    dexterity: isGreater ? 4 : 3,
    armorClass: 16 + level,
    tempHp: isGreater ? 15 : 5,
    attacks: [
      {
        id: 'animal-jaws',
        display: 'Jaws',
        attackType: 'melee',
        damageDice: isGreater ? '2d10' : '2d8',
        damageType: 'piercing',
        traits: [],
        attackBonus: 0,
        hands: 0,
        isNatural: true,
      },
      {
        id: 'animal-claw',
        display: 'Claw',
        attackType: 'melee',
        damageDice: isGreater ? '2d8' : '2d6',
        damageType: 'slashing',
        traits: ['agile'],
        attackBonus: 0,
        hands: 0,
        isNatural: true,
      },
    ],
    durationRounds: 10,
  };
}
