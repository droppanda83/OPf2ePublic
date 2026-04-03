import { Creature, GameState, Position, ActionResult, rollD20, getDegreeOfSuccess, rollDamageFormula, calculateSaveBonus, computePathCost } from 'pf2e-shared';
import { getEffectiveSpeed } from './helpers';
import { applyForcedMovement } from './subsystems';

export interface SkillActionContext {
  getSkillBonus: (actor: Creature, skillName: string) => number;
  getWillDC: (target: Creature) => number;
  getReflexDC: (target: Creature) => number;
  getFortitudeDC: (target: Creature) => number;
  getMapPenalty: (actor: Creature) => number;
  spendHeroPoints: (actor: Creature, heroPointsSpent: number, roll: { d20: number; bonus: number; total: number; result: string }) => { success: boolean; newRoll?: { d20: number; total: number }; message?: string };
  hasFeat: (actor: Creature, featName: string) => boolean;
  calculateDistance: (from: Position, to: Position) => number;
  cleanupStaleFlankingConditions: (gameState: GameState) => void;
}

function getLowestSave(creature: Creature): string {
  const fort = calculateSaveBonus(creature, 'fortitude');
  const ref = calculateSaveBonus(creature, 'reflex');
  const will = calculateSaveBonus(creature, 'will');

  const saves = [
    { name: 'Fortitude', value: fort },
    { name: 'Reflex', value: ref },
    { name: 'Will', value: will },
  ];

  saves.sort((a, b) => a.value - b.value);
  return `${saves[0].name} (+${saves[0].value})`;
}

export function resolveDemoralizeAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Demoralize!' , errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const existingFrightened = target.conditions?.find(
    (cond) => cond.name === 'frightened' && cond.source === `demoralize-${actor.id}`
  );

  if (existingFrightened) {
    return {
      success: false,
      message: `${target.name} is already frightened by your Demoralize! (Immune for 10 minutes)`,
      errorCode: 'TARGET_IMMUNE',
    };
  }

  const intimidationBonus = ctx.getSkillBonus(actor, 'intimidation');
  const willDC = ctx.getWillDC(target);

  const d20 = rollD20();
  let total = d20 + intimidationBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: intimidationBonus,
      total,
      result: 'pending',
    });

    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }
  const margin = total - willDC;
  const result = getDegreeOfSuccess(finalD20, total, willDC);

  let message = `${actor.name} attempts to Demoralize ${target.name}!\n`;
  message += `Intimidation check: ${finalD20} + ${intimidationBonus} = ${total} vs Will DC ${willDC}\n`;
  message += `Result: **${result.toUpperCase()}** (margin: ${margin >= 0 ? '+' : ''}${margin})`;

  if (result === 'critical-success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 2,
      source: `demoralize-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **frightened 2**! (Status penalty to all checks/DCs, decreases by 1 each turn)`;
    if (ctx.hasFeat(actor, 'Fearsome Brute')) {
      target.conditions.push({
        name: 'off-guard', duration: 'permanent', value: 1, source: 'fearsome-brute',
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: 2,
      });
      message += `\n💪 Fearsome Brute! ${target.name} is also **off-guard** until end of your next turn!`;
    }
  } else if (result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 1,
      source: `demoralize-${actor.id}`,
    });
    message += `\n✅ ${target.name} is **frightened 1**! (Status penalty to all checks/DCs, decreases by 1 each turn)`;
    if (ctx.hasFeat(actor, 'Fearsome Brute')) {
      target.conditions.push({
        name: 'off-guard', duration: 'permanent', value: 1, source: 'fearsome-brute',
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: 2,
      });
      message += `\n💪 Fearsome Brute! ${target.name} is also **off-guard** until end of your next turn!`;
    }
  } else if (result === 'critical-failure') {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'immune-to-demoralize',
      duration: 'permanent',
      value: 1,
      source: `demoralize-${targetId}`,
    });
    message += `\n❌ ${actor.name} critically fails and can't Demoralize ${target.name} again for 10 minutes!`;
  } else {
    message += `\n❌ The Demoralize attempt fails.`;
  }

  return {
    success: true,
    message,
    details: {
      d20: finalD20,
      intimidationBonus,
      total,
      willDC,
      margin,
      result,
      ...(heroPointMessage && { heroPointMessage, heroPointsSpent }),
    },
  };
}

export function resolveShoveAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Shove!' , errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const dx = Math.abs(actor.positions.x - target.positions.x);
  const dy = Math.abs(actor.positions.y - target.positions.y);
  const chebyshev = Math.max(dx, dy);
  if (chebyshev > 1) {
    return { success: false, message: `${target.name} is too far away for Shove!` , errorCode: 'OUT_OF_RANGE' };
  }

  const athleticsBonus = ctx.getSkillBonus(actor, 'athletics');
  const fortitudeDC = ctx.getFortitudeDC(target);
  const mapPenalty = ctx.getMapPenalty(actor);

  const d20 = rollD20();
  const athleticsTotalBonus = athleticsBonus + mapPenalty;
  let total = d20 + athleticsTotalBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: athleticsTotalBonus,
      total,
      result: 'pending',
    });

    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }
  const margin = total - fortitudeDC;

  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;

  const result = getDegreeOfSuccess(finalD20, total, fortitudeDC);

  let message = `${actor.name} attempts to Shove ${target.name}!\n`;
  message += `Athletics check: ${finalD20} + ${athleticsBonus}${mapPenalty ? ` (MAP ${mapPenalty})` : ''} = ${total} vs Fortitude DC ${fortitudeDC}\n`;
  message += `Result: **${result.toUpperCase()}** (margin: ${margin >= 0 ? '+' : ''}${margin})`;

  if (result === 'critical-success') {
    const moveResult = applyForcedMovement(target, gameState, {
      distanceFt: 10,
      direction: 'away',
      sourcePosition: actor.positions,
    });
    if (moveResult.distanceMoved > 0) {
      message += `\n✨ ${target.name} is shoved **${moveResult.distanceMoved} feet** away to (${moveResult.newPosition.x}, ${moveResult.newPosition.y})!`;
    } else {
      message += `\n✨ Critical success, but ${target.name} can't be pushed further (${moveResult.blockReason || 'blocked'})!`;
    }
  } else if (result === 'success') {
    const moveResult = applyForcedMovement(target, gameState, {
      distanceFt: 5,
      direction: 'away',
      sourcePosition: actor.positions,
    });
    if (moveResult.distanceMoved > 0) {
      message += `\n✅ ${target.name} is shoved **${moveResult.distanceMoved} feet** away to (${moveResult.newPosition.x}, ${moveResult.newPosition.y})!`;
    } else {
      message += `\n✅ Success, but ${target.name} can't be pushed further (${moveResult.blockReason || 'blocked'})!`;
    }
  } else if (result === 'critical-failure') {
    message += `\n❌ ${actor.name} loses balance and falls prone!`;
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: 'shove-critical-failure'
    });
  } else {
    message += `\n❌ The Shove attempt fails.`;
  }

  return {
    success: true,
    message,
    details: {
      d20: finalD20,
      athleticsBonus,
      total,
      fortitudeDC,
      margin,
      result,
      ...(heroPointMessage && { heroPointMessage, heroPointsSpent }),
    },
  };
}

export function resolveTripAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Trip!' , errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const athleticsBonus = ctx.getSkillBonus(actor, 'athletics');
  const reflexDC = ctx.getReflexDC(target);
  const mapPenalty = ctx.getMapPenalty(actor);

  const d20 = rollD20();
  const athleticsTotalBonus = athleticsBonus + mapPenalty;
  let total = d20 + athleticsTotalBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: athleticsTotalBonus,
      total,
      result: 'pending',
    });

    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }
  const margin = total - reflexDC;

  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;

  const result = getDegreeOfSuccess(finalD20, total, reflexDC);

  let message = `${actor.name} attempts to Trip ${target.name}!\n`;
  message += `Athletics check: ${finalD20} + ${athleticsBonus}${mapPenalty ? ` (MAP ${mapPenalty})` : ''} = ${total} vs Reflex DC ${reflexDC}\n`;
  message += `Result: **${result.toUpperCase()}** (margin: ${margin >= 0 ? '+' : ''}${margin})`;

  if (result === 'critical-success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: `trip-${actor.id}`,
    });

    const fallDamage = Math.floor(Math.random() * 6) + 1;
    target.currentHealth = Math.max(0, target.currentHealth - fallDamage);

    message += `\n✨ ${target.name} falls **prone** and takes ${fallDamage} bludgeoning damage from the fall!`;
    message += `\n   ${target.name}: ${target.currentHealth + fallDamage}/${target.maxHealth} HP → ${target.currentHealth}/${target.maxHealth} HP`;
  } else if (result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: `trip-${actor.id}`,
    });
    message += `\n✅ ${target.name} falls **prone**! (off-guard, -2 to attack rolls, must use an action to Stand)`;
  } else if (result === 'critical-failure') {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: 'trip-self',
    });
    message += `\n❌ ${actor.name} loses balance and falls **prone**!`;
  } else {
    message += `\n❌ The Trip attempt fails.`;
  }

  return {
    success: true,
    message,
    details: {
      d20: finalD20,
      athleticsBonus,
      total,
      reflexDC,
      margin,
      result,
      ...(heroPointMessage && { heroPointMessage, heroPointsSpent }),
    },
  };
}

export function resolveGrappleAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Grapple.' , errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target || target.currentHealth <= 0) {
    return { success: false, message: 'Target not found or is unconscious.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const hasFreeHand = !actor.hands?.primary?.item || !actor.hands?.secondary?.item;
  const hasGrappleWeapon = (actor.weaponInventory ?? []).some((w) =>
    Array.isArray(w.traits) && w.traits.includes('grapple') && w.state === 'held'
  );
  if (!hasFreeHand && !hasGrappleWeapon) {
    return { success: false, message: 'You need a free hand or a grapple weapon to Grapple.' , errorCode: 'NO_FREE_HAND' };
  }

  const athleticsBonus = ctx.getSkillBonus(actor, 'athletics');
  const fortDC = ctx.getFortitudeDC(target);
  const mapPenalty = ctx.getMapPenalty(actor);

  const d20 = rollD20();
  const athleticsTotalBonus = athleticsBonus + mapPenalty;
  let total = d20 + athleticsTotalBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: athleticsTotalBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;
  const result = getDegreeOfSuccess(finalD20, total, fortDC);

  let message = `🪢 ${actor.name} attempts to Grapple ${target.name}!\n`;
  message += `Athletics check: ${finalD20} + ${athleticsBonus}${mapPenalty ? ` (MAP ${mapPenalty})` : ''} = ${total} vs Fortitude DC ${fortDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success') {
    if (!target.conditions) target.conditions = [];
    target.conditions = target.conditions.filter((c) => c.name !== 'grabbed');
    target.conditions.push({ name: 'restrained', duration: 1, source: 'grapple' });
    message += `\n✨ ${target.name} is restrained! (off-guard, immobilized)`;
  } else if (result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions = target.conditions.filter((c) => c.name !== 'restrained');
    target.conditions.push({ name: 'grabbed', duration: 1, source: 'grapple' });
    message += `\n✅ ${target.name} is grabbed! (off-guard, immobilized)`;
  } else if (result === 'critical-failure') {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({ name: 'off-guard', duration: 1, source: 'grapple' });
    message += `\n💥 Critical Failure! ${actor.name} is off-guard until the start of their next turn.`;
  } else {
    message += `\n❌ The Grapple attempt fails.`;
  }

  return { success: true, message, details: { d20: finalD20, athleticsBonus, total, fortDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveEscapeAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  const escapeConditions = ['grabbed', 'restrained', 'immobilized'];
  const hasEscape = (actor.conditions ?? []).some((c) => escapeConditions.includes(c.name));
  if (!hasEscape) {
    return { success: false, message: 'You are not grabbed, restrained, or immobilized.' , errorCode: 'VALIDATION_FAILED' };
  }

  let grabber = null;
  if (targetId) {
    grabber = gameState.creatures.find((c) => c.id === targetId);
  }

  const unarmedWeapon = actor.weaponInventory?.find((w) => w.weapon?.isNatural && w.state === 'held');
  const unarmedMod = unarmedWeapon?.weapon?.attackBonus ?? ctx.getSkillBonus(actor, 'athletics');
  const athleticsMod = ctx.getSkillBonus(actor, 'athletics');
  const acrobaticsMod = ctx.getSkillBonus(actor, 'acrobatics');
  const bestMod = Math.max(unarmedMod, athleticsMod, acrobaticsMod);

  const d20 = rollD20();
  let total = d20 + bestMod;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: bestMod,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const escapeDC = 10 + (grabber ? ctx.getSkillBonus(grabber, 'athletics') : Math.max(
    calculateSaveBonus(actor, 'fortitude'),
    calculateSaveBonus(actor, 'reflex')
  ));

  const result = getDegreeOfSuccess(finalD20, total, escapeDC);

  let message = `🦶 ${actor.name} attempts to Escape!\n`;
  message += `Check: ${finalD20} + ${bestMod} = ${total} vs DC ${escapeDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success' || result === 'success') {
    actor.conditions = (actor.conditions ?? []).filter((c) => !escapeConditions.includes(c.name));
    message += result === 'critical-success'
      ? `\n✨ Critical Success! You escape and can Step 5ft as a free action.`
      : `\n✅ Success! You escape.`;
  } else if (result === 'critical-failure') {
    message += `\n💥 Critical Failure! You can't attempt to Escape again until your next turn.`;
  } else {
    message += `\n❌ Failure. You remain restrained.`;
  }

  return { success: true, message, details: { d20: finalD20, bestMod, total, escapeDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveDisarmAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Disarm.' , errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target || target.currentHealth <= 0) {
    return { success: false, message: 'Target not found or is unconscious.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const hasFreeHand = !actor.hands?.primary?.item || !actor.hands?.secondary?.item;
  const hasDisarmWeapon = (actor.weaponInventory ?? []).some((w) =>
    Array.isArray(w.traits) && w.traits.includes('disarm') && w.state === 'held'
  );
  if (!hasFreeHand && !hasDisarmWeapon) {
    return { success: false, message: 'You need a free hand or a disarm weapon to Disarm.' , errorCode: 'NO_FREE_HAND' };
  }

  const targetHasWeapon = (target.weaponInventory ?? []).some((w) => w.state === 'held' && !w.weapon?.isNatural);
  if (!targetHasWeapon) {
    return { success: false, message: `${target.name} has no weapon to disarm.` , errorCode: 'NO_WEAPON' };
  }

  const athleticsBonus = ctx.getSkillBonus(actor, 'athletics');
  const reflexDC = ctx.getReflexDC(target);
  const mapPenalty = ctx.getMapPenalty(actor);

  const d20 = rollD20();
  const athleticsTotalBonus = athleticsBonus + mapPenalty;
  let total = d20 + athleticsTotalBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: athleticsTotalBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;
  const result = getDegreeOfSuccess(finalD20, total, reflexDC);

  let message = `🗡️ ${actor.name} attempts to Disarm ${target.name}!\n`;
  message += `Athletics check: ${finalD20} + ${athleticsBonus}${mapPenalty ? ` (MAP ${mapPenalty})` : ''} = ${total} vs Reflex DC ${reflexDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success') {
    const weaponSlot = target.weaponInventory?.find((w) => w.state === 'held' && !w.weapon?.isNatural);
    if (weaponSlot) {
      weaponSlot.state = 'dropped';
      const weaponName = weaponSlot.weapon?.display ?? 'weapon';
      message += `\n✨ ${target.name}'s ${weaponName} falls to the ground!`;
    }
  } else if (result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'disarmed',
      duration: 1,
      value: -2,
      source: 'disarm',
    });
    message += `\n✅ ${target.name} takes -2 circumstance penalty to attacks with that weapon until start of your next turn!`;
  } else {
    message += `\n❌ The Disarm attempt fails.`;
  }

  return { success: true, message, details: { d20: finalD20, athleticsBonus, total, reflexDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveBattleMedicineAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Battle Medicine.' , errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target || target.currentHealth <= 0) {
    return { success: false, message: 'Target not found or is unconscious.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const battleMedicineUsed = actor.battleMedicineTargets ?? [];
  if (battleMedicineUsed.includes(targetId)) {
    return { success: false, message: `You've already used Battle Medicine on ${target.name} today!` , errorCode: 'ALREADY_USED' };
  }

  const medicineBonus = ctx.getSkillBonus(actor, 'medicine');
  const baseDC = 15;

  const d20 = rollD20();
  let total = d20 + medicineBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: medicineBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, baseDC);

  let message = `🩹 ${actor.name} uses Battle Medicine on ${target.name}!\n`;
  message += `Medicine check: ${finalD20} + ${medicineBonus} = ${total} vs DC ${baseDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  let healing = 0;
  if (result === 'critical-success') {
    healing = rollDamageFormula('2d8').total + rollDamageFormula('2d8').total;
    message += `\n✨ Critical Success! Heals ${healing} HP!`;
  } else if (result === 'success') {
    healing = rollDamageFormula('2d8').total;
    message += `\n✅ Success! Heals ${healing} HP!`;
  } else if (result === 'critical-failure') {
    healing = -rollDamageFormula('1d8').total;
    message += `\n💥 Critical Failure! Deals ${Math.abs(healing)} damage!`;
  } else {
    message += `\n❌ Failure. No effect.`;
  }

  if (healing !== 0) {
    const oldHP = target.currentHealth;
    target.currentHealth = Math.max(0, Math.min(target.maxHealth, target.currentHealth + healing));
    message += `\n   ${target.name}: ${oldHP}/${target.maxHealth} HP → ${target.currentHealth}/${target.maxHealth} HP`;
  }

  actor.battleMedicineTargets = actor.battleMedicineTargets ?? [];
  actor.battleMedicineTargets.push(targetId);

  return { success: true, message, details: { d20: finalD20, medicineBonus, total, baseDC, result, healing, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveTumbleThroughAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Tumble Through.' , errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target || target.currentHealth <= 0) {
    return { success: false, message: 'Target not found or is unconscious.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const distance = ctx.calculateDistance(actor.positions, target.positions);
  if (distance > 1.5) {
    return { success: false, message: 'You must be adjacent to the target to Tumble Through.' , errorCode: 'VALIDATION_FAILED' };
  }

  const acrobaticsBonus = ctx.getSkillBonus(actor, 'acrobatics');
  const reflexDC = ctx.getReflexDC(target);

  const d20 = rollD20();
  let total = d20 + acrobaticsBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: acrobaticsBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, reflexDC);

  let message = `🤸 ${actor.name} attempts to Tumble Through ${target.name}'s space!\n`;
  message += `Acrobatics check: ${finalD20} + ${acrobaticsBonus} = ${total} vs Reflex DC ${reflexDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success' || result === 'success') {
    message += `\n✅ Success! You can move through ${target.name}'s space without triggering reactions!`;
    message += `\n   (Continue moving with remaining actions)`;
  } else {
    message += `\n❌ Failure! Your movement ends in the space before ${target.name}.`;
  }

  return { success: true, message, details: { d20: finalD20, acrobaticsBonus, total, reflexDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveHideAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  heroPointsSpent?: number
): ActionResult {
  const stealthBonus = ctx.getSkillBonus(actor, 'stealth');
  const enemies = gameState.creatures.filter((c) => c.id !== actor.id && c.currentHealth > 0);
  const highestEnemyLevel = Math.max(...enemies.map((e) => e.level ?? 1), 1);
  const perceptionDC = 15 + highestEnemyLevel;

  const d20 = rollD20();
  let total = d20 + stealthBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: stealthBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, perceptionDC);

  let message = `🫥 ${actor.name} attempts to Hide!\n`;
  message += `Stealth check: ${finalD20} + ${stealthBonus} = ${total} vs Perception DC ${perceptionDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success' || result === 'success') {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({ name: 'hidden', duration: 'permanent', source: 'hide' });
    message += result === 'critical-success'
      ? `\n✨ Critical Success! You are undetected (DC 11 flat check to target you, enemies can't use reactions against you)!`
      : `\n✅ Success! You are hidden (DC 11 flat check to target you)!`;
    
    // Hidden Paragon (Level 20 Rogue feat): Become invisible for 1 round on successful Hide
    const hasHiddenParagon = actor.level >= 20 && 
      actor.characterClass === 'Rogue' && 
      (actor.feats?.some((f) => {
        const name = typeof f === 'string' ? f : f?.name;
        return typeof name === 'string' && name.toLowerCase().includes('hidden paragon');
      }) || actor.specials?.some((s: string) => s.toLowerCase().includes('hidden paragon')));
    
    if (hasHiddenParagon) {
      actor.conditions.push({ 
        name: 'invisible', 
        duration: 'permanent', 
        value: 1, 
        source: 'hidden-paragon',
        expiresOnTurnEndOf: actor.id,
        turnEndsRemaining: 1
      });
      message += `\n🌟 **Hidden Paragon!** You become invisible for 1 round!`;
    }
  } else {
    message += `\n❌ Failure. You remain observed.`;
  }

  return { success: true, message, details: { d20: finalD20, stealthBonus, total, perceptionDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveSneakAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heroPointsSpent?: number
): ActionResult {
  const isHidden = (actor.conditions ?? []).some((c) => c.name === 'hidden');
  if (!isHidden) {
    return { success: false, message: 'You must be hidden to Sneak. Use Hide first.' , errorCode: 'VALIDATION_FAILED' };
  }

  const stealthBonus = ctx.getSkillBonus(actor, 'stealth');
  const enemies = gameState.creatures.filter((c) => c.id !== actor.id && c.currentHealth > 0);
  const highestEnemyLevel = Math.max(...enemies.map((e) => e.level ?? 1), 1);
  const perceptionDC = 15 + highestEnemyLevel;

  const d20 = rollD20();
  let total = d20 + stealthBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: stealthBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, perceptionDC);

  let movementSummary = '';
  let movementCost = 0;
  let maxDistance = 0;
  if ((result === 'critical-success' || result === 'success') && targetPosition) {
    const hasSneakSavant = ctx.hasFeat(actor, 'Sneak Savant');
    const effectiveSpeedFeet = getEffectiveSpeed(actor);
    const sneakSpeedFeet = hasSneakSavant ? effectiveSpeedFeet : Math.floor(effectiveSpeedFeet / 2);
    maxDistance = sneakSpeedFeet / 5;

    const gameMap = actor._map;
    const terrainGrid = gameMap?.terrain;
    const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
    const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;

    if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
      return {
        success: false,
        message: `Cannot Sneak to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
        errorCode: 'OUT_OF_BOUNDS',
      };
    }

    const occupiedPositions = new Set<string>(
      gameState.creatures
        .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
        .map((creature) => `${creature.positions.x},${creature.positions.y}`)
    );

    const destKey = `${targetPosition.x},${targetPosition.y}`;
    if (occupiedPositions.has(destKey)) {
      return {
        success: false,
        message: `Cannot Sneak to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
        errorCode: 'DESTINATION_OCCUPIED',
      };
    }

    movementCost = ctx.calculateDistance(actor.positions, targetPosition);
    if (terrainGrid) {
      const isProne = actor.conditions?.some(c => c.name === 'prone') ?? false;
      const hasLightStep = ctx.hasFeat(actor, 'Light Step');
      const difficultCost = hasLightStep ? 1 : (isProne ? 4 : 2);
      movementCost = computePathCost(actor.positions, targetPosition, terrainGrid, {
        maxDistance,
        occupiedPositions,
        terrainCostMultiplier: { difficult: difficultCost },
      });
    }

    if (movementCost === Infinity) {
      return { success: false, message: 'No valid path to destination while sneaking.', errorCode: 'BLOCKED_PATH' };
    }

    if (movementCost > maxDistance) {
      return {
        success: false,
        message: `Cannot Sneak ${movementCost.toFixed(1)} squares - max is ${maxDistance.toFixed(1)} (${hasSneakSavant ? 'full' : 'half'} Speed).`,
        errorCode: 'INSUFFICIENT_MOVEMENT',
        movementCost,
        maxDistance,
      };
    }

    const oldPos = { x: actor.positions.x, y: actor.positions.y };
    actor.positions = targetPosition;
    ctx.cleanupStaleFlankingConditions(gameState);
    movementSummary = `\n📍 Sneak movement: (${oldPos.x}, ${oldPos.y}) → (${targetPosition.x}, ${targetPosition.y}) [${movementCost.toFixed(1)} squares, max ${maxDistance.toFixed(1)}]`;
  }

  let message = `🥷 ${actor.name} attempts to Sneak!\n`;
  message += `Stealth check: ${finalD20} + ${stealthBonus} = ${total} vs Perception DC ${perceptionDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success' || result === 'success') {
    message += `\n✅ Success! You remain hidden while moving.`;
    if (ctx.hasFeat(actor, 'Sneak Savant')) {
      message += ` (Sneak Savant: full Speed)`;
    }
    message += movementSummary;
    
    // Hidden Paragon (Level 20 Rogue feat): Become invisible for 1 round on successful Sneak
    const hasHiddenParagon = actor.level >= 20 && 
      actor.characterClass === 'Rogue' && 
      (actor.feats?.some((f) => {
        const name = typeof f === 'string' ? f : f?.name;
        return typeof name === 'string' && name.toLowerCase().includes('hidden paragon');
      }) || actor.specials?.some((s: string) => s.toLowerCase().includes('hidden paragon')));
    
    if (hasHiddenParagon) {
      if (!actor.conditions) actor.conditions = [];
      actor.conditions.push({ 
        name: 'invisible', 
        duration: 'permanent', 
        value: 1, 
        source: 'hidden-paragon',
        expiresOnTurnEndOf: actor.id,
        turnEndsRemaining: 1
      });
      message += `\n🌟 **Hidden Paragon!** You become invisible for 1 round!`;
    }
  } else if (result === 'critical-failure' || result === 'failure') {
    actor.conditions = (actor.conditions ?? []).filter((c) => c.name !== 'hidden');
    message += `\n❌ Failure! You are detected and no longer hidden.`;
  }

  return {
    success: true,
    message,
    details: { d20: finalD20, stealthBonus, total, perceptionDC, result, movementCost, maxDistance, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) },
  };
}

export function resolveRecallKnowledgeAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Recall Knowledge.' , errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target || target.currentHealth <= 0) {
    return { success: false, message: 'Target not found or is unconscious.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const recallUsed = actor.recallKnowledgeTargets ?? [];
  if (recallUsed.includes(targetId)) {
    return { success: false, message: `You've already used Recall Knowledge on ${target.name} this combat!` , errorCode: 'ALREADY_USED' };
  }

  const arcanaBonus = ctx.getSkillBonus(actor, 'arcana');
  const natureBonus = ctx.getSkillBonus(actor, 'nature');
  const occultismBonus = ctx.getSkillBonus(actor, 'occultism');
  const religionBonus = ctx.getSkillBonus(actor, 'religion');
  const bestBonus = Math.max(arcanaBonus, natureBonus, occultismBonus, religionBonus);

  const knowledgeDC = 15 + (target.level ?? 1);

  const d20 = rollD20();
  let total = d20 + bestBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: bestBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, knowledgeDC);

  let message = `📖 ${actor.name} recalls knowledge about ${target.name}!\n`;
  message += `Knowledge check: ${finalD20} + ${bestBonus} = ${total} vs DC ${knowledgeDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success') {
    message += `\n✨ Critical Success! You learn two useful facts:`;
    message += `\n   • Weaknesses: ${target.damageWeaknesses?.map((w) => `${w.type} ${w.value}`).join(', ') ?? 'None'}`;
    message += `\n   • Resistances: ${target.damageResistances?.map((r) => `${r.type} ${r.value}`).join(', ') ?? 'None'}`;
    message += `\n   • Lowest Save: ${getLowestSave(target)}`;
  } else if (result === 'success') {
    message += `\n✅ Success! You learn one useful fact:`;
    message += `\n   • Lowest Save: ${getLowestSave(target)}`;
  } else {
    message += `\n❌ Failure. You don't recall anything useful.`;
  }

  actor.recallKnowledgeTargets = actor.recallKnowledgeTargets ?? [];
  actor.recallKnowledgeTargets.push(targetId);

  return { success: true, message, details: { d20: finalD20, bestBonus, total, knowledgeDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveSeekAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  heroPointsSpent?: number
): ActionResult {
  const perceptionBonus = ctx.getSkillBonus(actor, 'perception');
  const hiddenEnemies = gameState.creatures.filter((c) =>
    c.id !== actor.id &&
    c.currentHealth > 0 &&
    (c.conditions ?? []).some((cond) => cond.name === 'hidden')
  );

  if (hiddenEnemies.length === 0) {
    return { success: false, message: 'There are no hidden creatures to seek.' , errorCode: 'VALIDATION_FAILED' };
  }

  const stealthDCs = hiddenEnemies.map((e) => 15 + ctx.getSkillBonus(e, 'stealth'));
  const highestDC = Math.max(...stealthDCs);

  const d20 = rollD20();
  let total = d20 + perceptionBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: perceptionBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, highestDC);

  let message = `🔍 ${actor.name} seeks hidden creatures!\n`;
  message += `Perception check: ${finalD20} + ${perceptionBonus} = ${total} vs Stealth DC ${highestDC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'critical-success' || result === 'success') {
    hiddenEnemies.forEach((enemy) => {
      enemy.conditions = (enemy.conditions ?? []).filter((c) => c.name !== 'hidden');
    });
    const names = hiddenEnemies.map((e) => e.name).join(', ');
    message += `\n✅ Success! You find: ${names}`;
  } else {
    message += `\n❌ Failure. You don't locate any hidden creatures.`;

    if (ctx.hasFeat(actor, 'Sense the Unseen')) {
      const nearbyHidden = hiddenEnemies
        .map((enemy) => ({ enemy, distance: ctx.calculateDistance(actor.positions, enemy.positions) }))
        .filter((entry) => entry.distance <= 6)
        .sort((a, b) => a.distance - b.distance);

      if (nearbyHidden.length > 0) {
        const nearest = nearbyHidden[0];
        const dx = nearest.enemy.positions.x - actor.positions.x;
        const dy = nearest.enemy.positions.y - actor.positions.y;
        const directionY = dy < 0 ? 'north' : dy > 0 ? 'south' : '';
        const directionX = dx < 0 ? 'west' : dx > 0 ? 'east' : '';
        const direction = [directionY, directionX].filter(Boolean).join('-') || 'nearby';

        message += `\n👁️ Sense the Unseen: You sense a hidden creature ${direction} (${Math.round(nearest.distance * 5)} ft away).`;
      }
    }
  }

  return { success: true, message, details: { d20: finalD20, perceptionBonus, total, highestDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}

export function resolveAidAction(
  ctx: SkillActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified to Aid.' , errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target || target.currentHealth <= 0) {
    return { success: false, message: 'Target not found or is unconscious.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const skills = ['athletics', 'acrobatics', 'medicine', 'arcana', 'nature', 'occultism', 'religion'] as const;
  const bonuses = skills.map(s => ctx.getSkillBonus(actor, s));
  let bestBonus = Math.max(...bonuses);

  if (ctx.hasFeat(actor, 'Cooperative Nature')) {
    bestBonus += 4;
  }

  const aidDC = 20;

  const d20 = rollD20();
  let total = d20 + bestBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: bestBonus,
      total,
      result: 'pending',
    });
    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, aidDC);

  let finalAidResult = result;
  if (ctx.hasFeat(actor, 'Cooperative Soul')) {
    if (finalAidResult === 'failure' || finalAidResult === 'critical-failure') {
      finalAidResult = 'success';
    }
  }

  let message = `🤝 ${actor.name} attempts to Aid ${target.name}!\n`;
  message += `Skill check: ${finalD20} + ${bestBonus} = ${total} vs DC ${aidDC}\n`;
  message += `Result: **${finalAidResult.toUpperCase()}**`;

  if (!target.conditions) target.conditions = [];

  if (finalAidResult === 'critical-success') {
    target.conditions.push({ name: 'aided', duration: 1, value: 2, source: 'aid' });
    message += `\n✨ Critical Success! ${target.name} gets +2 circumstance bonus to their next action!`;
  } else if (finalAidResult === 'success') {
    target.conditions.push({ name: 'aided', duration: 1, value: 1, source: 'aid' });
    message += `\n✅ Success! ${target.name} gets +1 circumstance bonus to their next action!`;
  } else if (finalAidResult === 'critical-failure') {
    target.conditions.push({ name: 'aided', duration: 1, value: -1, source: 'aid' });
    message += `\n💥 Critical Failure! ${target.name} takes -1 circumstance penalty to their next action!`;
  } else {
    message += `\n❌ Failure. No effect.`;
  }

  actor.reactionUsed = true;

  return { success: true, message, details: { d20: finalD20, bestBonus, total, aidDC, result, ...(heroPointMessage && { heroPointMessage, heroPointsSpent }) } };
}
