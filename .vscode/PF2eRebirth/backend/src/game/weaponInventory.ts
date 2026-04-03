// Weapon Inventory - extracted from RulesEngine
// Manages weapon draw/stow/drop/pickup state machine and weapon selection.

import { Creature, GameState, CreatureWeapon, Position, getWeapon } from 'pf2e-shared';

// ——— Shared ok/fail helpers ———
function ok(message: string, extra?: Record<string, unknown>): { success: true; message: string; [key: string]: unknown } {
  return { success: true, message, ...extra };
}

function fail(message: string, errorCode?: string): { success: false; message: string; errorCode?: string; [key: string]: unknown } {
  return errorCode
    ? { success: false, message, errorCode }
    : { success: false, message };
}

// Simple distance calculation (shared with movement)
function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Resolve which weapon/attack to use for a Strike.
 * Priority: explicit weaponId ÔåÆ first held weapon ÔåÆ legacy weaponDamageDice path ÔåÆ unarmed
 */
export function resolveSelectedWeapon(actor: Creature, weaponId?: string): CreatureWeapon | null {
  const buildLegacyWeapon = (): CreatureWeapon => {
    const catalogWeapon = actor.equippedWeapon ? getWeapon(actor.equippedWeapon) : undefined;
    const attackType: 'melee' | 'ranged' = catalogWeapon?.type === 'ranged' ? 'ranged' : 'melee';

    return {
      id: weaponId || actor.equippedWeapon || '__legacy__',
      display: actor.weaponDisplay || catalogWeapon?.name || 'Unarmed Strike',
      attackType,
      attackBonus: actor.pbAttackBonus,
      damageDice: actor.weaponDamageDice || catalogWeapon?.damageFormula || '1d4',
      damageBonus: actor.weaponDamageBonus ?? 0,
      damageType: actor.weaponDamageType || catalogWeapon?.damageType || 'bludgeoning',
      hands: Number(catalogWeapon?.hands) || (actor.equippedWeapon ? 1 : 0),
      traits: catalogWeapon?.traits || [],
      range: catalogWeapon?.range,
      weaponCatalogId: actor.equippedWeapon,
      isNatural: !actor.equippedWeapon,
    };
  };

  const inv = actor.weaponInventory;
  if (!inv || inv.length === 0) return buildLegacyWeapon();

  if (weaponId) {
    const slot = inv.find(s => s.weapon.id === weaponId);
    if (slot) return slot.weapon;
  }

  // Default: first held weapon, or first natural attack
  const firstHeld = inv.find(s => s.state === 'held');
  if (firstHeld) return firstHeld.weapon;
  const firstNatural = inv.find(s => s.weapon.isNatural);
  if (firstNatural) return firstNatural.weapon;

  return buildLegacyWeapon();
}

/**
 * Draw a weapon (Interact action, 1 action). Move weapon from stowed ÔåÆ held.
 * Must have free hands to hold it.
 */
export function resolveDrawWeapon(actor: Creature, weaponId?: string): any {
  if (!actor.weaponInventory || !weaponId) {
    return fail('No weapon to draw.');
  }
  const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
  if (!slot) return fail('Weapon not found in inventory.');
  if (slot.state === 'held') return fail(`${slot.weapon.display} is already drawn.`);
  if (slot.state === 'dropped') return fail(`${slot.weapon.display} was dropped. Pick it up first.`);

  // Check hands
  const handsNeeded = slot.weapon.hands;
  const handsInUse = getHandsInUse(actor);
  if (handsInUse + handsNeeded > 2) {
    return fail(`Not enough free hands to draw ${slot.weapon.display} (need ${handsNeeded}, ${2 - handsInUse} free).`);
  }

  slot.state = 'held';
  // Also update legacy fields for backwards compatibility
  actor.weaponDisplay = slot.weapon.display;
  actor.weaponDamageDice = slot.weapon.damageDice;
  actor.weaponDamageBonus = slot.weapon.damageBonus;
  actor.weaponDamageType = slot.weapon.damageType;

  return ok(`${actor.name} draws ${slot.weapon.display}.`);
}

/**
 * Stow a weapon (Interact action, 1 action). Move weapon from held ÔåÆ stowed.
 */
export function resolveStowWeapon(actor: Creature, weaponId?: string): any {
  if (!actor.weaponInventory || !weaponId) {
    return fail('No weapon to stow.');
  }
  const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
  if (!slot) return fail('Weapon not found in inventory.');
  if (slot.state !== 'held') return fail(`${slot.weapon.display} is not held.`);
  if (slot.weapon.isNatural) return fail(`Cannot stow natural attacks.`);

  slot.state = 'stowed';
  // Update legacy fields to next held weapon
  syncLegacyWeaponFields(actor);

  return ok(`${actor.name} stows ${slot.weapon.display}.`);
}

/**
 * Drop a weapon (free action). Move weapon from held ÔåÆ dropped.
 */
export function resolveDropWeapon(actor: Creature, gameState: GameState, weaponId?: string): any {
  if (!actor.weaponInventory || !weaponId) {
    return fail('No weapon to drop.');
  }
  const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
  if (!slot) return fail('Weapon not found in inventory.');
  if (slot.state !== 'held') return fail(`${slot.weapon.display} is not held.`);
  if (slot.weapon.isNatural) return fail(`Cannot drop natural attacks.`);

  // Mark as dropped in inventory
  slot.state = 'dropped';
  syncLegacyWeaponFields(actor);

  // Add to ground objects
  if (!gameState.groundObjects) {
    gameState.groundObjects = [];
  }
  
  const groundObjectId = `ground-${weaponId}-${Date.now()}`;
  gameState.groundObjects.push({
    id: groundObjectId,
    weapon: slot.weapon,
    position: { ...actor.positions },
    droppedByCreatureId: actor.id,
    droppedAtRound: gameState.currentRound.number
  });

  return ok(`${actor.name} drops ${slot.weapon.display}.`);
}

/** Count hands currently occupied by held weapons */
function getHandsInUse(actor: Creature): number {
  if (!actor.weaponInventory) return 0;
  return actor.weaponInventory
    .filter(s => s.state === 'held' && !s.weapon.isNatural)
    .reduce((sum, s) => sum + s.weapon.hands, 0);
}

/** Update the legacy flat weapon fields to match the first held weapon */
function syncLegacyWeaponFields(actor: Creature): void {
  const firstHeld = actor.weaponInventory?.find(s => s.state === 'held');
  if (firstHeld) {
    actor.weaponDisplay = firstHeld.weapon.display;
    actor.weaponDamageDice = firstHeld.weapon.damageDice;
    actor.weaponDamageBonus = firstHeld.weapon.damageBonus;
    actor.weaponDamageType = firstHeld.weapon.damageType;
  } else {
    // No held weapon ÔÇö show unarmed
    actor.weaponDisplay = undefined;
    actor.weaponDamageDice = undefined;
    actor.weaponDamageBonus = undefined;
    actor.weaponDamageType = undefined;
  }
}

export function resolvePickUpWeapon(actor: Creature, gameState: GameState, groundObjectId?: string, pickupDestination?: string): any {
  if (!groundObjectId || !gameState.groundObjects || !actor.weaponInventory) {
    return fail('Cannot pick up weapon.');
  }

  const groundObject = gameState.groundObjects.find(obj => obj.id === groundObjectId);
  if (!groundObject) {
    return fail('Weapon not found on ground.');
  }

  // Check if creature is adjacent to the weapon (within 1 square)
  const distance = calculateDistance(actor.positions, groundObject.position);
  if (distance > Math.sqrt(2) + 0.1) {
    return fail(`${actor.name} is too far from ${groundObject.weapon.display}.`);
  }

  // Determine destination based on user preference or hand availability
  let newState: 'held' | 'stowed' = pickupDestination as ('held' | 'stowed') || 'held';
  
  // If user wants to wield, check if hands are available
  if (newState === 'held') {
    const handsNeeded = groundObject.weapon.hands || 1;
    const handsInUse = getHandsInUse(actor);
    
    if (handsInUse + handsNeeded > 2) {
      // Not enough hands ÔÇö add as stowed instead
      newState = 'stowed';
    }
  }

  // Check if this weapon is already in the inventory (with 'dropped' state)
  // If so, update its state; otherwise create a new entry
  let existingSlot = actor.weaponInventory.find(s => s.weapon.id === groundObject.weapon.id && s.state === 'dropped');
  
  // Fallback: if no exact match, look for any dropped weapon with same display name
  if (!existingSlot) {
    existingSlot = actor.weaponInventory.find(s => 
      s.state === 'dropped' && 
      s.weapon.display === groundObject.weapon.display
    );
  }
  
  if (existingSlot) {
    // Update existing slot
    existingSlot.state = newState;
  } else {
    // Create new inventory entry
    const weaponCopy: CreatureWeapon = JSON.parse(JSON.stringify(groundObject.weapon));
    actor.weaponInventory.push({
      weapon: weaponCopy,
      state: newState
    });
  }

  syncLegacyWeaponFields(actor);

  // Remove from ground
  gameState.groundObjects = gameState.groundObjects.filter(obj => obj.id !== groundObjectId);

  const message = newState === 'held' 
    ? `${actor.name} picks up ${groundObject.weapon.display}.`
    : `${actor.name} picks up ${groundObject.weapon.display} and places it in their pack (hands full).`;
  
  return ok(message);
}
