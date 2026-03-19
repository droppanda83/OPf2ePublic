import { Creature, CreatureWeapon, GameState, Position } from 'pf2e-shared';

export interface WeaponActionContext {
  calculateDistance: (from: Position, to: Position) => number;
}

/**
 * Resolve which weapon/attack to use for a Strike.
 * Priority: explicit weaponId -> first held weapon -> legacy weaponDamageDice path -> unarmed
 */
export function resolveSelectedWeapon(actor: Creature, weaponId?: string): CreatureWeapon | null {
  const inv = actor.weaponInventory;
  if (!inv || inv.length === 0) return null;

  if (weaponId) {
    const slot = inv.find(s => s.weapon.id === weaponId);
    if (slot) return slot.weapon;
  }

  const firstHeld = inv.find(s => s.state === 'held');
  if (firstHeld) return firstHeld.weapon;
  const firstNatural = inv.find(s => s.weapon.isNatural);
  if (firstNatural) return firstNatural.weapon;

  return null;
}

/**
 * Draw a weapon (Interact action, 1 action). Move weapon from stowed -> held.
 * Must have free hands to hold it.
 */
export function resolveDrawWeapon(actor: Creature, weaponId?: string): any {
  if (!actor.weaponInventory || !weaponId) {
    return { success: false, message: 'No weapon to draw.' };
  }
  const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
  if (!slot) return { success: false, message: 'Weapon not found in inventory.' };
  if (slot.state === 'held') return { success: false, message: `${slot.weapon.display} is already drawn.` };
  if (slot.state === 'dropped') return { success: false, message: `${slot.weapon.display} was dropped. Pick it up first.` };

  const handsNeeded = slot.weapon.hands;
  const handsInUse = getHandsInUse(actor);
  if (handsInUse + handsNeeded > 2) {
    return { success: false, message: `Not enough free hands to draw ${slot.weapon.display} (need ${handsNeeded}, ${2 - handsInUse} free).` };
  }

  slot.state = 'held';
  actor.weaponDisplay = slot.weapon.display;
  actor.weaponDamageDice = slot.weapon.damageDice;
  actor.weaponDamageBonus = slot.weapon.damageBonus;
  actor.weaponDamageType = slot.weapon.damageType;

  return { success: true, message: `${actor.name} draws ${slot.weapon.display}.` };
}

/**
 * Stow a weapon (Interact action, 1 action). Move weapon from held -> stowed.
 */
export function resolveStowWeapon(actor: Creature, weaponId?: string): any {
  if (!actor.weaponInventory || !weaponId) {
    return { success: false, message: 'No weapon to stow.' };
  }
  const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
  if (!slot) return { success: false, message: 'Weapon not found in inventory.' };
  if (slot.state !== 'held') return { success: false, message: `${slot.weapon.display} is not held.` };
  if (slot.weapon.isNatural) return { success: false, message: 'Cannot stow natural attacks.' };

  slot.state = 'stowed';
  syncLegacyWeaponFields(actor);

  return { success: true, message: `${actor.name} stows ${slot.weapon.display}.` };
}

/**
 * Drop a weapon (free action). Move weapon from held -> dropped.
 */
export function resolveDropWeapon(actor: Creature, gameState: GameState, weaponId?: string): any {
  if (!actor.weaponInventory || !weaponId) {
    return { success: false, message: 'No weapon to drop.' };
  }
  const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
  if (!slot) return { success: false, message: 'Weapon not found in inventory.' };
  if (slot.state !== 'held') return { success: false, message: `${slot.weapon.display} is not held.` };
  if (slot.weapon.isNatural) return { success: false, message: 'Cannot drop natural attacks.' };

  slot.state = 'dropped';
  syncLegacyWeaponFields(actor);

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

  return { success: true, message: `${actor.name} drops ${slot.weapon.display}.` };
}

export function resolvePickUpWeapon(
  ctx: WeaponActionContext,
  actor: Creature,
  gameState: GameState,
  groundObjectId?: string,
  pickupDestination?: string
): any {
  if (!groundObjectId || !gameState.groundObjects || !actor.weaponInventory) {
    return { success: false, message: 'Cannot pick up weapon.' };
  }

  const groundObject = gameState.groundObjects.find(obj => obj.id === groundObjectId);
  if (!groundObject) {
    return { success: false, message: 'Weapon not found on ground.' };
  }

  const distance = ctx.calculateDistance(actor.positions, groundObject.position);
  if (distance > Math.sqrt(2) + 0.1) {
    return { success: false, message: `${actor.name} is too far from ${groundObject.weapon.display}.` };
  }

  let newState: 'held' | 'stowed' = (pickupDestination as ('held' | 'stowed')) || 'held';

  if (newState === 'held') {
    const handsNeeded = groundObject.weapon.hands || 1;
    const handsInUse = getHandsInUse(actor);

    if (handsInUse + handsNeeded > 2) {
      newState = 'stowed';
    }
  }

  let existingSlot = actor.weaponInventory.find(s => s.weapon.id === groundObject.weapon.id && s.state === 'dropped');

  if (!existingSlot) {
    existingSlot = actor.weaponInventory.find(s =>
      s.state === 'dropped' &&
      s.weapon.display === groundObject.weapon.display
    );
  }

  if (existingSlot) {
    existingSlot.state = newState;
  } else {
    const weaponCopy: CreatureWeapon = JSON.parse(JSON.stringify(groundObject.weapon));
    actor.weaponInventory.push({
      weapon: weaponCopy,
      state: newState
    });
  }

  syncLegacyWeaponFields(actor);

  gameState.groundObjects = gameState.groundObjects.filter(obj => obj.id !== groundObjectId);

  const message = newState === 'held'
    ? `${actor.name} picks up ${groundObject.weapon.display}.`
    : `${actor.name} picks up ${groundObject.weapon.display} and places it in their pack (hands full).`;

  return { success: true, message };
}

function getHandsInUse(actor: Creature): number {
  if (!actor.weaponInventory) return 0;
  return actor.weaponInventory
    .filter(s => s.state === 'held' && !s.weapon.isNatural)
    .reduce((sum, s) => sum + s.weapon.hands, 0);
}

function syncLegacyWeaponFields(actor: Creature): void {
  const firstHeld = actor.weaponInventory?.find(s => s.state === 'held');
  if (firstHeld) {
    actor.weaponDisplay = firstHeld.weapon.display;
    actor.weaponDamageDice = firstHeld.weapon.damageDice;
    actor.weaponDamageBonus = firstHeld.weapon.damageBonus;
    actor.weaponDamageType = firstHeld.weapon.damageType;
  } else {
    actor.weaponDisplay = undefined;
    actor.weaponDamageDice = undefined;
    actor.weaponDamageBonus = undefined;
    actor.weaponDamageType = undefined;
  }
}
