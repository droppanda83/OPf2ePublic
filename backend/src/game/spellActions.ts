import { Creature, GameState, Position, rollD20, rollDamageFormula, calculateSpellDC, calculateSpellAttack, calculateFinalDamage, applyDamageToShield, calculateAC, getAttackResult, computePathCost } from 'pf2e-shared';
import { getEffectiveSpeed, initDying } from './helpers';

export interface SpellActionContext {
  canCastAndConsumeSlot: (actor: Creature, spell: any, requestedRank?: number) => { canCast: boolean; message?: string; heightenedRank?: number };
  canAmpCantrip: (creature: Creature, spellName: string) => boolean;
  consumeFocusPointForAmp: (creature: Creature) => boolean;
  rollSave: (creature: Creature, saveType: 'reflex' | 'fortitude' | 'will', saveDC: number, heroPointsSpent?: number, effectTraits?: string[]) => { d20: number; bonus: number; total: number; result: string };
  calculateDistance: (from: Position, to: Position) => number;
  cleanupStaleFlankingConditions: (gameState: GameState) => void;
  hasPsychicUnboundStep: (creature: Creature) => boolean;
}

export function resolveSpellAction(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  spell: any,
  targetId?: string,
  targetPosition?: Position,
  requestedRank?: number
): any {
  const castCheck = ctx.canCastAndConsumeSlot(actor, spell, requestedRank);

  if (!castCheck.canCast) {
    return { success: false, message: castCheck.message || 'Cannot cast spell' };
  }

  const heightenedRank = castCheck.heightenedRank ?? spell.rank;

  switch (spell.id) {
    case 'magic-missile':
      return resolveMagicMissile(actor, gameState, targetId, heightenedRank);
    case 'fireball':
      return resolveFireball(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'burning-hands':
      return resolveBurningHands(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'shield':
      return resolveShield(actor, heightenedRank);
    case 'heal':
      return resolveHeal(actor, gameState, targetId, heightenedRank);
    case 'produce-flame': {
      const isAmped = ctx.canAmpCantrip(actor, 'produce-flame');
      return resolveProduceFlame(ctx, actor, gameState, targetId, heightenedRank, isAmped);
    }
    case 'electric-arc':
      return resolveElectricArc(ctx, actor, gameState, targetId, heightenedRank);
    case 'telekinetic-projectile': {
      const isAmped = ctx.canAmpCantrip(actor, 'telekinetic-projectile');
      return resolveTelekineticProjectile(ctx, actor, gameState, targetId, heightenedRank, isAmped);
    }
    case 'daze': {
      const isAmped = ctx.canAmpCantrip(actor, 'daze');
      return resolveDaze(ctx, actor, gameState, targetId, heightenedRank, isAmped);
    }
    case 'fear':
      return resolveFear(ctx, actor, gameState, targetId, heightenedRank);
    case 'grease':
      return resolveGrease(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'haste':
      return resolveHaste(actor, gameState, targetId, heightenedRank);
    case 'slow':
      return resolveSlow(ctx, actor, gameState, targetId, heightenedRank);
    case 'lightning-bolt':
      return resolveLightningBolt(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'heroism':
      return resolveHeroism(actor, gameState, targetId, heightenedRank);
    case 'true-strike':
      return resolveTrueStrike(actor, heightenedRank);
    case 'warp-step':
      return resolveWarpStep(ctx, actor, gameState, heightenedRank, targetPosition, false);
    case 'imaginary-weapon': {
      const isAmped = ctx.canAmpCantrip(actor, 'imaginary-weapon');
      return resolveImaginaryWeapon(ctx, actor, gameState, targetId, isAmped);
    }
    case 'forbidden-thought': {
      const isAmped = ctx.canAmpCantrip(actor, 'forbidden-thought');
      return resolveForbiddenThought(ctx, actor, gameState, targetId, isAmped);
    }
    case 'phase-bolt': {
      const isAmped = ctx.canAmpCantrip(actor, 'phase-bolt');
      return resolvePhaseBolt(ctx, actor, gameState, targetId, heightenedRank, isAmped);
    }
    case 'ray-of-frost':
      return resolveRayOfFrost(ctx, actor, gameState, targetId, heightenedRank);
    case 'mage-hand':
    case 'detect-magic':
    case 'message':
      return { success: true, message: `✨ ${actor.name} casts ${spell.name}. (Utility cantrip — no combat effect.)` };
    default:
      return { success: false, message: `Spell "${spell.name}" not yet implemented` };
  }
}

export function resolveMagicMissile(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return { success: false, message: 'No target specified' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found' };
  }

  const numMissiles = 1 + Math.floor((heightenedRank - 1) / 2);

  let totalDamage = 0;
  const missileRolls: number[] = [];

  for (let i = 0; i < numMissiles; i++) {
    const roll = rollDamageFormula('1d4+1');
    missileRolls.push(roll.total);
    totalDamage += roll.total;
  }

  const damageCalc = calculateFinalDamage(totalDamage, 'force', target);
  const finalDamage = damageCalc.finalDamage;

  target.currentHealth -= finalDamage;

  let statusMessage = `✨ ${actor.name} unleashes ${numMissiles} Magic Missile${numMissiles > 1 ? 's' : ''} on ${target.name} for ${finalDamage} damage!`;
  if (heightenedRank > 1) {
    statusMessage += ` (Heightened to rank ${heightenedRank})`;
  }

  if (target.currentHealth <= 0 && !target.dying) {
    statusMessage += initDying(target);
  }

  return {
    success: true,
    message: statusMessage,
    targetHealth: target.currentHealth,
    targetDying: target.dying,
    damage: {
      type: 'force',
      baseDamage: totalDamage, damageModifier: damageCalc.modifier, modifierValue: damageCalc.modifierValue,
      finalDamage, formula: `${numMissiles}×(1d4+1)`, rolls: missileRolls,
    },
    heightenedRank,
    numMissiles,
  };
}

export function resolveFireball(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 3
): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return { success: false, message: 'Invalid target location specified' };
  }

  const aoeRadius = 4;
  const saveDC = calculateSpellDC(actor);

  const targetsInAoE = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= aoeRadius;
  });

  const baseDice = 6 + 2 * Math.max(0, heightenedRank - 3);
  const damageFormula = `${baseDice}d6`;

  if (targetsInAoE.length === 0) {
    return {
      success: true,
      message: `🔥 ${actor.name} casts Fireball${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y}), but there are no targets in the blast radius!`,
      targetCount: 0,
      aoeRadius,
      centerPosition: targetPosition,
      baseRoll: { results: [], total: 0 },
      results: [],
      heightenedRank,
      damageFormula,
    };
  }

  const baseDamageRoll = rollDamageFormula(damageFormula);
  const results: any[] = [];

  targetsInAoE.forEach((target) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;

    if (saveRoll.result === 'critical-success') {
      damage = 0;
    } else if (saveRoll.result === 'success') {
      damage = Math.floor(baseDamageRoll.total / 2);
    } else if (saveRoll.result === 'critical-failure') {
      damage = baseDamageRoll.total * 2;
    }

    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    const finalDamage = damageCalc.finalDamage;

    const shieldResult = applyDamageToShield(target, finalDamage);
    target.currentHealth -= shieldResult.creatureTakenDamage;

    const persistentDamageApplied = false;

    let targetStatus = '';
    if (target.currentHealth <= 0 && !target.dying) {
      targetStatus = initDying(target);
    }

    let damageDescription = `${damage}`;
    if (damageCalc.modifier === 'immune') {
      damageDescription = '0 (immune)';
    } else if (damageCalc.modifier === 'resist') {
      damageDescription = `${finalDamage} (resisted by ${damageCalc.modifierValue})`;
    } else if (damageCalc.modifier === 'weak') {
      damageDescription = `${finalDamage} (weak +${damageCalc.modifierValue})`;
    }

    let shieldDescription = '';
    if (shieldResult.shieldAbsorbed > 0) {
      shieldDescription = ` [Shield: ${shieldResult.shieldAbsorbed} hardness`;
      if (shieldResult.shieldTakenDamage > 0) {
        shieldDescription += `, takes ${shieldResult.shieldTakenDamage} dmg`;
      }
      if (shieldResult.shieldBroken) {
        shieldDescription += ', BROKEN';
      }
      shieldDescription += ']';
    }

    results.push({
      targetId: target.id,
      targetName: target.name,
      saveResult: saveRoll.result,
      saveRoll: saveRoll.d20,
      saveBonus: saveRoll.bonus,
      saveTotal: saveRoll.total,
      baseDamage: damage,
      damageModifier: damageCalc.modifier,
      modifierValue: damageCalc.modifierValue,
      finalDamage,
      damageDescription,
      shieldDescription,
      shieldDamage: shieldResult,
      persistentDamageApplied,
      targetHealth: target.currentHealth,
      targetDying: target.dying,
      status: targetStatus,
    });
  });

  const message = `🔥 ${actor.name} casts Fireball${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y})! Base damage: ${baseDamageRoll.total} (${baseDamageRoll.results.join(', ')})`;

  return {
    success: true,
    message,
    targetCount: targetsInAoE.length,
    aoeRadius,
    centerPosition: targetPosition,
    baseRoll: baseDamageRoll,
    results,
    heightenedRank,
    damageFormula,
  };
}

export function resolveBurningHands(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 1
): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return { success: false, message: 'Invalid target location specified' };
  }

  const coneRange = 3;
  const saveDC = calculateSpellDC(actor);

  const dx = targetPosition.x - actor.positions.x;
  const dy = targetPosition.y - actor.positions.y;
  const coneDistance = Math.sqrt(dx * dx + dy * dy);

  const coneDirectionX = coneDistance > 0 ? dx / coneDistance : 1;
  const coneDirectionY = coneDistance > 0 ? dy / coneDistance : 0;

  const targetsInAoE = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false;

    const cdx = creature.positions.x - actor.positions.x;
    const cdy = creature.positions.y - actor.positions.y;
    const creatureDistance = Math.sqrt(cdx * cdx + cdy * cdy);

    if (creatureDistance > coneRange) return false;

    if (creatureDistance > 0) {
      const creatureDirX = cdx / creatureDistance;
      const creatureDirY = cdy / creatureDistance;

      const dotProduct = coneDirectionX * creatureDirX + coneDirectionY * creatureDirY;
      if (dotProduct < 0.5) return false;
    }

    return true;
  });

  const baseDice = 2 + 2 * Math.max(0, heightenedRank - 1);
  const damageFormula = `${baseDice}d6`;

  if (targetsInAoE.length === 0) {
    return {
      success: true,
      message: `🔥 ${actor.name} casts Burning Hands${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} in a cone from (${actor.positions.x}, ${actor.positions.y}), but there are no targets in the blast!`,
      targetCount: 0,
      coneRange,
      centerPosition: actor.positions,
      results: [],
      heightenedRank,
      damageFormula,
    };
  }

  const baseDamageRoll = rollDamageFormula(damageFormula);
  const results: any[] = [];

  targetsInAoE.forEach((target) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;

    if (saveRoll.result === 'critical-success') {
      damage = 0;
    } else if (saveRoll.result === 'success') {
      damage = Math.floor(damage / 2);
    } else if (saveRoll.result === 'critical-failure') {
      damage *= 2;
    }

    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    const finalDamage = damageCalc.finalDamage;

    const shieldResult = applyDamageToShield(target, finalDamage);
    target.currentHealth -= shieldResult.creatureTakenDamage;

    let targetStatus = '';
    if (target.currentHealth <= 0 && !target.dying) {
      targetStatus = initDying(target);
    }

    let damageDescription = `${damage}`;
    if (damageCalc.modifier === 'immune') {
      damageDescription = '0 (immune)';
    } else if (damageCalc.modifier === 'resist') {
      damageDescription = `${finalDamage} (resisted by ${damageCalc.modifierValue})`;
    } else if (damageCalc.modifier === 'weak') {
      damageDescription = `${finalDamage} (weak +${damageCalc.modifierValue})`;
    }

    let shieldDescription = '';
    if (shieldResult.shieldAbsorbed > 0) {
      shieldDescription = ` [Shield: ${shieldResult.shieldAbsorbed} hardness`;
      if (shieldResult.shieldTakenDamage > 0) {
        shieldDescription += `, takes ${shieldResult.shieldTakenDamage} dmg`;
      }
      if (shieldResult.shieldBroken) {
        shieldDescription += ', BROKEN';
      }
      shieldDescription += ']';
    }

    results.push({
      targetId: target.id,
      targetName: target.name,
      saveResult: saveRoll.result,
      saveRoll: saveRoll.d20,
      saveBonus: saveRoll.bonus,
      saveTotal: saveRoll.total,
      baseDamage: damage,
      damageModifier: damageCalc.modifier,
      modifierValue: damageCalc.modifierValue,
      finalDamage,
      damageDescription,
      shieldDescription,
      shieldDamage: shieldResult,
      targetHealth: target.currentHealth,
      targetDying: target.dying,
      status: targetStatus,
    });
  });

  const message = `🔥 ${actor.name} casts Burning Hands in a cone! Base damage: ${baseDamageRoll.total} (${baseDamageRoll.results.join(', ')})`;

  return {
    success: true,
    message,
    targetCount: targetsInAoE.length,
    coneRange,
    centerPosition: actor.positions,
    baseRoll: baseDamageRoll,
    results,
  };
}

export function resolveShield(actor: Creature, heightenedRank: number = 1): any {
  actor.conditions.push({ name: 'shield', duration: 1, value: 1 });
  return {
    success: true,
    message: `🛡️ ${actor.name} casts Shield${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}, gaining +1 AC this round!`,
    acBonus: 1,
    heightenedRank,
  };
}

export function resolveHeal(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Heal!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  const numDice = heightenedRank;
  const healFormula = `${numDice}d8`;
  const healRoll = rollDamageFormula(healFormula);

  const totalHealing = healRoll.total;

  const previousHP = target.currentHealth;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + totalHealing);
  const actualHealing = target.currentHealth - previousHP;

  let message = `💚 ${actor.name} casts Heal${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} on ${target.name} for ${actualHealing} HP!`;
  if (actualHealing < totalHealing) {
    message += ` (${totalHealing} rolled, capped at max HP)`;
  }

  return {
    success: true,
    message,
    targetHealth: target.currentHealth,
    healing: actualHealing,
    healRoll: healRoll.results,
    formula: healFormula,
    heightenedRank,
  };
}

export function resolveProduceFlame(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1,
  amped: boolean = false
): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Produce Flame!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      amped = false;
    }
  }

  const dieSize = amped ? 10 : 4;
  const numDice = 1 + heightenedRank;
  const damageFormula = `${numDice}d${dieSize}`;

  const spellAttackBonus = calculateSpellAttack(actor);
  let d20 = rollD20();
  let sureStrikeUsed = false;
  let sureStrikeRolls: number[] | undefined;
  const sureStrikeIdx = (actor.conditions || []).findIndex(c => c.name === 'sure-strike');
  if (sureStrikeIdx !== -1) {
    const secondD20 = rollD20();
    sureStrikeRolls = [d20, secondD20];
    d20 = Math.max(d20, secondD20);
    sureStrikeUsed = true;
    actor.conditions.splice(sureStrikeIdx, 1);
  }
  const total = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, total, targetAC);

  let message = `🔥 ${actor.name} casts Ignition${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}${amped ? ' [AMPED]' : ''} at ${target.name}!\n`;
  if (sureStrikeUsed) {
    message += `Sure Strike: rolled ${sureStrikeRolls![0]} and ${sureStrikeRolls![1]}, using ${d20}\n`;
  }
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${total} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  if (actor.unleashPsycheActive) {
    damage += heightenedRank * 2;
  }

  if (result === 'critical-success') {
    damage *= 2;
    if (!target.conditions) target.conditions = [];
    const persistentFormula = `${heightenedRank}d4`;
    const persistentRoll = rollDamageFormula(persistentFormula);
    target.conditions.push({
      name: 'persistent-damage',
      duration: 'permanent',
      value: persistentRoll.total,
      isPersistentDamage: true,
      damageFormula: persistentFormula,
      damageType: 'fire',
      source: `Ignition crit (${actor.name})`,
    });
  }

  const damageCalc = calculateFinalDamage(damage, 'fire', target);
  const finalDamage = damageCalc.finalDamage;
  target.currentHealth -= finalDamage;

  message += `\n💥 Damage: ${finalDamage} fire`;
  if (result === 'critical-success') {
    message += ` + persistent fire!`;
  }

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return {
    success: true,
    message,
    result,
    targetHealth: target.currentHealth,
    targetDying: target.dying,
    damage: finalDamage,
    heightenedRank,
  };
}

export function resolveElectricArc(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Electric Arc!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  const numDice = 1 + heightenedRank;
  const damageFormula = `${numDice}d4`;
  const saveDC = calculateSpellDC(actor);

  const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  if (saveRoll.result === 'critical-success') {
    damage = 0;
  } else if (saveRoll.result === 'success') {
    damage = Math.floor(damage / 2);
  } else if (saveRoll.result === 'critical-failure') {
    damage *= 2;
  }

  const damageCalc = calculateFinalDamage(damage, 'electricity', target);
  const finalDamage = damageCalc.finalDamage;
  target.currentHealth -= finalDamage;

  let message = `⚡ ${actor.name} casts Electric Arc${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Reflex Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
  message += `💥 Damage: ${finalDamage} electricity`;

  if (saveRoll.result === 'critical-failure') {
    message += `\n✨ ${target.name} is **stunned 1**!`;
  }

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return {
    success: true,
    message,
    saveResult: saveRoll.result,
    targetHealth: target.currentHealth,
    targetDying: target.dying,
    damage: finalDamage,
    heightenedRank,
  };
}

export function resolveTelekineticProjectile(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1,
  amped: boolean = false
): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Telekinetic Projectile!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      amped = false;
    }
  }

  const numDice = amped ? heightenedRank * 2 : 1 + heightenedRank;
  const damageFormula = `${numDice}d6`;

  const spellAttackBonus = calculateSpellAttack(actor);
  let d20 = rollD20();
  let sureStrikeUsed = false;
  let sureStrikeRolls: number[] | undefined;
  const sureStrikeIdx = (actor.conditions || []).findIndex(c => c.name === 'sure-strike');
  if (sureStrikeIdx !== -1) {
    const secondD20 = rollD20();
    sureStrikeRolls = [d20, secondD20];
    d20 = Math.max(d20, secondD20);
    sureStrikeUsed = true;
    actor.conditions.splice(sureStrikeIdx, 1);
  }
  const total = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, total, targetAC);

  let message = `🪨 ${actor.name} casts Telekinetic Projectile${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}${amped ? ' [AMPED]' : ''} at ${target.name}!\n`;
  if (sureStrikeUsed) {
    message += `Sure Strike: rolled ${sureStrikeRolls![0]} and ${sureStrikeRolls![1]}, using ${d20}\n`;
  }
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${total} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  if (actor.unleashPsycheActive) {
    damage += heightenedRank * 2;
  }

  if (result === 'critical-success') {
    damage *= 2;
  }

  const damageCalc = calculateFinalDamage(damage, 'bludgeoning', target);
  const finalDamage = damageCalc.finalDamage;
  target.currentHealth -= finalDamage;

  message += `\n💥 Damage: ${finalDamage} bludgeoning`;

  if (amped && (result === 'success' || result === 'critical-success')) {
    const pushDist = result === 'critical-success' ? 10 : 5;
    message += `\n🌀 The psychic force pushes ${target.name} ${pushDist} feet! (The Distant Grasp amp)`;
  }

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return {
    success: true,
    message,
    result,
    targetHealth: target.currentHealth,
    targetDying: target.dying,
    damage: finalDamage,
    heightenedRank,
  };
}

export function resolveDaze(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1,
  amped: boolean = false
): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Daze!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      amped = false;
    }
  }

  const dieSize = amped ? 10 : 6;
  const numDice = amped
    ? 1 + Math.floor((heightenedRank - 1) / 2) * 2
    : 1 + Math.floor((heightenedRank - 1) / 2);
  const damageFormula = `${numDice}d${dieSize}`;
  const saveDC = calculateSpellDC(actor);

  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['mental', 'cantrip']);
  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  if (saveRoll.result === 'critical-success') {
    damage = 0;
  } else if (saveRoll.result === 'success') {
    damage = Math.floor(damage / 2);
  } else if (saveRoll.result === 'critical-failure') {
    damage *= 2;
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'stunned',
      duration: 'permanent',
      value: 1,
      source: `fear-${actor.id}`,
    });
  }

  if (actor.unleashPsycheActive && damage > 0) {
    damage += heightenedRank * 2;
  }

  const damageCalc = calculateFinalDamage(damage, 'mental', target);
  const finalDamage = damageCalc.finalDamage;
  target.currentHealth -= finalDamage;

  let message = `😵 ${actor.name} casts Daze${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}${amped ? ' [AMPED]' : ''} at ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
  message += `💥 Damage: ${finalDamage} mental`;

  if (saveRoll.result === 'critical-failure') {
    message += `\n✨ ${target.name} is **stunned 1**!`;
  }

  if (amped && (saveRoll.result === 'failure' || saveRoll.result === 'critical-failure')) {
    if (!target.conditions) target.conditions = [];
    const weaknessValue = saveRoll.result === 'critical-failure' ? 3 : 1;
    target.conditions.push({
      name: 'mental-weakness',
      duration: 1,
      value: weaknessValue,
      source: `daze-amp-${actor.id}`,
    });
    target.conditions.push({
      name: 'will-penalty',
      duration: 1,
      value: -1,
      source: `daze-amp-${actor.id}`,
    });
    message += `\n🧠 ${target.name} gains weakness ${weaknessValue} to mental and -1 status penalty to Will saves! (The Silent Whisper amp)`;
    if (saveRoll.result === 'critical-failure') {
      target.conditions.push({ name: 'stunned', duration: 'permanent', value: 1, source: `daze-amp-${actor.id}` });
      message += `\n✨ ${target.name} is also **stunned 1**!`;
    }
  }

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return {
    success: true,
    message,
    saveResult: saveRoll.result,
    targetHealth: target.currentHealth,
    targetDying: target.dying,
    damage: finalDamage,
    heightenedRank,
  };
}

export function resolveFear(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Fear!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['emotion', 'mental', 'fear', 'spell']);

  let message = `😱 ${actor.name} casts Fear${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (saveRoll.result === 'critical-failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 3,
      source: `fear-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **frightened 3** and **fleeing** for 1 round!`;
  } else if (saveRoll.result === 'failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 2,
      source: `fear-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **frightened 2**!`;
  } else if (saveRoll.result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 1,
      source: `fear-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **frightened 1**!`;
  } else {
    message += `\n❌ ${target.name} is unaffected!`;
  }

  return {
    success: true,
    message,
    saveResult: saveRoll.result,
    targetHealth: target.currentHealth,
    heightenedRank,
  };
}

export function resolveGrease(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 1
): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return { success: false, message: 'Invalid target location specified for Grease!' };
  }

  const aoeRadius = 2;
  const saveDC = calculateSpellDC(actor);

  const targetsInAoE = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= aoeRadius;
  });

  if (targetsInAoE.length === 0) {
    return {
      success: true,
      message: `🛢️ ${actor.name} casts Grease${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y}), but no creatures are in the area!`,
      heightenedRank,
    };
  }

  const results: any[] = [];
  let message = `🛢️ ${actor.name} casts Grease${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y})!\n`;

  targetsInAoE.forEach((target) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);

    let targetMessage = `${target.name}: ${saveRoll.result.toUpperCase()}`;

    if (saveRoll.result === 'critical-failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'prone', duration: 'permanent', value: 1 });
      target.conditions.push({ name: 'off-guard', duration: 1, value: 1 });
      targetMessage += ' → **prone + off-guard**';
    } else if (saveRoll.result === 'failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'off-guard', duration: 1, value: 1 });
      targetMessage += ' → **off-guard**';
    }

    results.push({ targetName: target.name, saveResult: saveRoll.result });
    message += `\n- ${targetMessage}`;
  });

  return {
    success: true,
    message,
    results,
    heightenedRank,
  };
}

export function resolveHaste(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Haste!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  if (!target.conditions) target.conditions = [];
  target.conditions.push({
    name: 'quickened',
    duration: 10,
    value: 1,
    source: `haste-${actor.id}`,
  });

  let message = `⚡ ${actor.name} casts Haste${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `✨ ${target.name} is **quickened** (extra action each turn for Strike or Stride only)!`;

  return {
    success: true,
    message,
    targetHealth: target.currentHealth,
    heightenedRank,
  };
}

export function resolveSlow(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Slow!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'fortitude', saveDC);

  let message = `🐌 ${actor.name} casts Slow${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (saveRoll.result === 'critical-failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'slowed',
      duration: 10,
      value: 2,
      source: `slow-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **slowed 2** for 1 minute!`;
  } else if (saveRoll.result === 'failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'slowed',
      duration: 10,
      value: 1,
      source: `slow-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **slowed 1** for 1 minute!`;
  } else if (saveRoll.result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'slowed',
      duration: 1,
      value: 1,
      source: `slow-${actor.id}`,
    });
    message += `\n✨ ${target.name} is **slowed 1** for 1 round!`;
  } else {
    message += `\n❌ ${target.name} resists the slow effect!`;
  }

  return {
    success: true,
    message,
    saveResult: saveRoll.result,
    targetHealth: target.currentHealth,
    heightenedRank,
  };
}

export function resolveLightningBolt(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 3
): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return { success: false, message: 'Invalid target location specified for Lightning Bolt!' };
  }

  const lineRange = 24;
  const saveDC = calculateSpellDC(actor);

  const dx = targetPosition.x - actor.positions.x;
  const dy = targetPosition.y - actor.positions.y;
  const lineDistance = Math.sqrt(dx * dx + dy * dy);

  const lineDirX = lineDistance > 0 ? dx / lineDistance : 1;
  const lineDirY = lineDistance > 0 ? dy / lineDistance : 0;

  const targetsInLine = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false;

    const cdx = creature.positions.x - actor.positions.x;
    const cdy = creature.positions.y - actor.positions.y;
    const creatureDistance = Math.sqrt(cdx * cdx + cdy * cdy);

    if (creatureDistance > lineRange) return false;

    if (creatureDistance > 0) {
      const projection = (cdx * lineDirX + cdy * lineDirY);

      const perpX = cdx - projection * lineDirX;
      const perpY = cdy - projection * lineDirY;
      const perpDistance = Math.sqrt(perpX * perpX + perpY * perpY);

      if (perpDistance > 0.5) return false;
      if (projection < 0) return false;
    }

    return true;
  });

  const baseDice = 4 + Math.max(0, heightenedRank - 3);
  const damageFormula = `${baseDice}d12`;

  if (targetsInLine.length === 0) {
    return {
      success: true,
      message: `⚡ ${actor.name} casts Lightning Bolt${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''}, but no creatures are caught in the line!`,
      heightenedRank,
      damageFormula,
    };
  }

  const baseDamageRoll = rollDamageFormula(damageFormula);
  const results: any[] = [];

  targetsInLine.forEach((target) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;

    if (saveRoll.result === 'critical-success') {
      damage = 0;
    } else if (saveRoll.result === 'success') {
      damage = Math.floor(damage / 2);
    } else if (saveRoll.result === 'critical-failure') {
      damage *= 2;
    }

    const damageCalc = calculateFinalDamage(damage, 'electricity', target);
    const finalDamage = damageCalc.finalDamage;
    target.currentHealth -= finalDamage;

    let targetStatus = '';
    if (target.currentHealth <= 0 && !target.dying) {
      targetStatus = initDying(target);
    }

    results.push({
      targetName: target.name,
      saveResult: saveRoll.result,
      damage: finalDamage,
      targetStatus,
    });
  });

  let message = `⚡ ${actor.name} casts Lightning Bolt${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamageRoll.total}`;
  results.forEach((r) => {
    message += `\n- ${r.targetName}: ${r.saveResult.toUpperCase()} → ${r.damage} damage${r.targetStatus}`;
  });

  return {
    success: true,
    message,
    results,
    baseRoll: baseDamageRoll,
    heightenedRank,
    damageFormula,
  };
}

export function resolveHeroism(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 3): any {
  if (!targetId) {
    return { success: false, message: 'No target specified for Heroism!' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' };
  }

  const statusBonus = 1 + Math.floor((heightenedRank - 3) / 3);

  if (!target.conditions) target.conditions = [];
  target.conditions.push({
    name: 'heroism',
    duration: 100,
    value: statusBonus,
    source: `heroism-${actor.id}`,
  });

  let message = `🦸 ${actor.name} casts Heroism${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `✨ ${target.name} gains **+${statusBonus} status bonus** to attack rolls, saves, and skill checks!`;

  return {
    success: true,
    message,
    targetHealth: target.currentHealth,
    statusBonus,
    heightenedRank,
  };
}

export function resolveTrueStrike(actor: Creature, heightenedRank: number = 1): any {
  if (!actor.conditions) actor.conditions = [];

  actor.conditions = actor.conditions.filter(c => c.name !== 'sure-strike');

  actor.conditions.push({
    name: 'sure-strike',
    duration: 1,
    value: 1,
    source: `sure-strike-${actor.id}`,
  });

  let message = `🎯 ${actor.name} casts Sure Strike!\n`;
  message += `✨ ${actor.name}'s next attack this turn will be rolled twice, taking the better result! Also ignores concealment.`;

  return {
    success: true,
    message,
    heightenedRank,
  };
}

export function resolveWarpStep(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  heightenedRank: number = 1,
  targetPosition?: Position,
  amped: boolean = false
): any {
  if (!actor.conditions) actor.conditions = [];

  const hasUnboundStep = ctx.hasPsychicUnboundStep(actor);
  const speedBonusFeet = hasUnboundStep ? 10 : 5;

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      return {
        success: false,
        message: `${actor.name} has no focus points to amp Warp Step!`,
      };
    }
  }

  if (amped && heightenedRank >= 4 && targetPosition) {
    return resolveWarpStepTeleport(ctx, actor, gameState, speedBonusFeet, heightenedRank, targetPosition);
  }

  if (amped && heightenedRank >= 4) {
    const boostedSpeedFeet = getEffectiveSpeed(actor) + speedBonusFeet;
    const teleportRangeFeet = boostedSpeedFeet * 2;
    const teleportRangeSquares = teleportRangeFeet / 5;

    actor.conditions = actor.conditions.filter(c =>
      c.name !== 'warp-step' && c.name !== 'warp-step-speed' && c.name !== 'warp-step-teleport'
    );

    actor.conditions.push({
      name: 'warp-step-teleport',
      duration: 1,
      value: teleportRangeSquares,
      source: 'warp-step-amped',
    });

    let message = `✨ ${actor.name} casts Warp Step (Amped, Heightened ${heightenedRank})!\n`;
    message += `✨ +${speedBonusFeet}ft status bonus to Speed`;
    if (hasUnboundStep) message += ` (Unbound Step)`;
    message += `\n✨ ${actor.name} can teleport up to ${teleportRangeFeet}ft this turn! (No reactions triggered)`;

    return {
      success: true,
      message,
      heightenedRank,
      teleportRangeFeet,
      teleportRangeSquares,
      speedBonusFeet,
      amped: true,
      canTeleport: true,
    };
  }

  if (!targetPosition) {
    return { success: false, message: 'No destination specified for Warp Step.' };
  }

  const immob = actor.conditions?.find(c =>
    ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name)
  );
  if (immob) {
    return { success: false, message: `${actor.name} cannot move while ${immob.name}!`};
  }

  const baseSpeedFeet = getEffectiveSpeed(actor);
  const boostedSpeedFeet = baseSpeedFeet + speedBonusFeet;
  const maxDistanceSquares = (boostedSpeedFeet * 2) / 5;

  const mw = gameState.map?.width ?? 0;
  const mh = gameState.map?.height ?? 0;
  if (targetPosition.x < 0 || targetPosition.y < 0 ||
      targetPosition.x >= mw || targetPosition.y >= mh) {
    return { success: false, message: 'Destination is outside map bounds.', errorCode: 'OUT_OF_BOUNDS' };
  }

  const occupiedPositions = new Set<string>(
    gameState.creatures
      .filter(c => c.id !== actor.id && c.currentHealth > 0)
      .map(c => `${c.positions.x},${c.positions.y}`)
  );
  if (occupiedPositions.has(`${targetPosition.x},${targetPosition.y}`)) {
    return { success: false, message: 'Destination is occupied by another creature.', errorCode: 'DESTINATION_OCCUPIED' };
  }

  const isProne = actor.conditions?.some(c => c.name === 'prone') ?? false;
  const terrainMultiplier = isProne ? { difficult: 4 } : { difficult: 2 };
  const terrainGrid = gameState.map?.terrain;
  let pathCost = ctx.calculateDistance(actor.positions, targetPosition);
  if (terrainGrid) {
    pathCost = computePathCost(actor.positions, targetPosition, terrainGrid, {
      maxDistance: maxDistanceSquares,
      occupiedPositions,
      terrainCostMultiplier: terrainMultiplier,
    });
  }

  if (pathCost === Infinity) {
    return { success: false, message: 'No valid path to destination.', errorCode: 'BLOCKED_PATH' };
  }
  if (pathCost > maxDistanceSquares) {
    return {
      success: false,
      message: `Cannot move ${(pathCost * 5).toFixed(0)}ft — Warp Step range is ${boostedSpeedFeet * 2}ft.`,
      errorCode: 'INSUFFICIENT_MOVEMENT',
    };
  }

  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = { x: targetPosition.x, y: targetPosition.y };
  ctx.cleanupStaleFlankingConditions(gameState);

  const distFeet = (pathCost * 5).toFixed(0);
  let message = `✨ ${actor.name} casts Warp Step`;
  if (amped) message += ` (Amped)`;
  message += `!\n`;
  message += `✨ +${speedBonusFeet}ft status bonus to Speed`;
  if (hasUnboundStep) message += ` (Unbound Step)`;
  message += `\n👣 Strides ${distFeet}ft to (${targetPosition.x}, ${targetPosition.y})`;

  return {
    success: true,
    message,
    heightenedRank,
    speedBonusFeet,
    amped,
    newPosition: targetPosition,
    oldPosition: oldPos,
    movementCost: pathCost,
    maxDistance: maxDistanceSquares,
    actionId: 'warp-step',
  };
}

function resolveWarpStepTeleport(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  speedBonusFeet: number,
  heightenedRank: number,
  targetPosition: Position
): any {
  const immobilized = actor.conditions?.find(c =>
    ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name)
  );
  if (immobilized) {
    return {
      success: false,
      message: `${actor.name} cannot teleport while ${immobilized.name}!`,
      errorCode: 'IMMOBILIZED',
    };
  }

  const boostedSpeedFeet = getEffectiveSpeed(actor) + speedBonusFeet;
  const teleportRangeFeet = boostedSpeedFeet * 2;
  const teleportRangeSquares = teleportRangeFeet / 5;

  const distance = ctx.calculateDistance(actor.positions, targetPosition);

  if (distance > teleportRangeSquares) {
    return {
      success: false,
      message: `Cannot teleport ${(distance * 5).toFixed(0)}ft — max range is ${teleportRangeFeet}ft.`,
      errorCode: 'OUT_OF_RANGE',
    };
  }

  const mapWidth = gameState.map?.width ?? 0;
  const mapHeight = gameState.map?.height ?? 0;
  if (targetPosition.x < 0 || targetPosition.y < 0 ||
      targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
    return {
      success: false,
      message: `Cannot teleport to (${targetPosition.x}, ${targetPosition.y}) — outside map bounds.`,
      errorCode: 'OUT_OF_BOUNDS',
    };
  }

  const occupied = gameState.creatures.some(c =>
    c.id !== actor.id &&
    c.currentHealth > 0 &&
    c.positions.x === targetPosition.x &&
    c.positions.y === targetPosition.y
  );
  if (occupied) {
    return {
      success: false,
      message: `Cannot teleport to (${targetPosition.x}, ${targetPosition.y}) — occupied by another creature.`,
      errorCode: 'DESTINATION_OCCUPIED',
    };
  }

  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = { x: targetPosition.x, y: targetPosition.y };

  ctx.cleanupStaleFlankingConditions(gameState);

  const teleportDist = (distance * 5).toFixed(0);
  return {
    success: true,
    message: `✨ ${actor.name} casts Warp Step (Amped, Heightened ${heightenedRank})!\n` +
      `🌀 ${actor.name} teleports from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y}) [${teleportDist}ft]!\n` +
      `🌀 Teleportation — no reactions triggered!`,
    heightenedRank,
    oldPosition: oldPos,
    newPosition: targetPosition,
    teleportDistance: distance,
    amped: true,
    isTeleport: true,
  };
}

export function resolveImaginaryWeapon(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  amped: boolean = false
): any {
  if (!targetId) return { success: false, message: 'Imaginary Weapon requires a target.' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found.' };

  const dist = ctx.calculateDistance(actor.positions, target.positions);
  if (dist > 1.5) {
    return { success: false, message: `Target is ${Math.round(dist * 5)}ft away — Imaginary Weapon has melee range.`, errorCode: 'OUT_OF_RANGE' };
  }

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      return { success: false, message: 'No focus points available to amp this cantrip.' };
    }
  }

  const heightenedRank = Math.max(1, Math.ceil(actor.level / 2));
  const numDice = amped ? heightenedRank + 2 : 1 + heightenedRank;
  const dieSize = 8;

  const attackRoll = Math.floor(Math.random() * 20) + 1;
  const keyAbility = actor.keyAbility || 'intelligence';
  const keyMod = actor.abilities[keyAbility] ?? 0;
  const profBonus = 2 + actor.level;
  const totalAttack = attackRoll + keyMod + profBonus;
  const targetAC = target.armorClass ?? 10;

  const isNat20 = attackRoll === 20;
  const isNat1 = attackRoll === 1;
  let degree: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  if (isNat20 || totalAttack >= targetAC + 10) degree = 'critical-success';
  else if (totalAttack >= targetAC) degree = isNat1 ? 'failure' : 'success';
  else if (totalAttack >= targetAC - 10) degree = isNat1 ? 'critical-failure' : 'failure';
  else degree = 'critical-failure';

  if (degree === 'failure' || degree === 'critical-failure') {
    return {
      success: true,
      message: `🗡️ ${actor.name} swings an Imaginary Weapon at ${target.name} — misses! (${attackRoll} + ${keyMod + profBonus} = ${totalAttack} vs AC ${targetAC})${amped ? ' [AMPED]' : ''}`,
      spellAttack: totalAttack,
      targetAC,
      degree,
    };
  }

  let totalDamage = 0;
  const diceResults: number[] = [];
  for (let i = 0; i < numDice; i++) {
    const roll = Math.floor(Math.random() * dieSize) + 1;
    diceResults.push(roll);
    totalDamage += roll;
  }

  if (actor.unleashPsycheActive) {
    const psycheBonus = heightenedRank * 2;
    totalDamage += psycheBonus;
  }

  if (degree === 'critical-success') {
    totalDamage *= 2;
  }

  target.currentHealth = Math.max(0, target.currentHealth - totalDamage);

  let message = `🗡️ ${actor.name} strikes ${target.name} with an Imaginary Weapon! ${degree === 'critical-success' ? 'CRITICAL HIT! ' : ''}(${attackRoll} + ${keyMod + profBonus} = ${totalAttack} vs AC ${targetAC}) ${numDice}d${dieSize} = ${totalDamage} bludgeoning damage${amped ? ' [AMPED]' : ''}`;

  if (amped && degree === 'critical-success') {
    message += ` — Target pushed 10ft!`;
  }

  if (target.currentHealth <= 0) {
    target.dying = true;
    message += ` 💀 ${target.name} falls!`;
  }

  return {
    success: true,
    message,
    damage: totalDamage,
    damageType: 'bludgeoning',
    degree,
  };
}

export function resolveForbiddenThought(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  amped: boolean = false
): any {
  if (!targetId) return { success: false, message: 'Forbidden Thought requires a target.' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found.' };

  const dist = ctx.calculateDistance(actor.positions, target.positions);
  if (dist > 6) {
    return { success: false, message: `Target is ${Math.round(dist * 5)}ft away — Forbidden Thought has 30ft range.`, errorCode: 'OUT_OF_RANGE' };
  }

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      return { success: false, message: 'No focus points available to amp this cantrip.' };
    }
  }

  const heightenedRank = Math.max(1, Math.ceil(actor.level / 2));
  const numDice = heightenedRank;
  const dieSize = 6;

  const saveRoll = Math.floor(Math.random() * 20) + 1;
  const keyAbility = actor.keyAbility || 'intelligence';
  const keyMod = actor.abilities[keyAbility] ?? 0;
  const profBonus = 2 + actor.level;
  const spellDC = 10 + keyMod + profBonus;
  const willMod = (target.abilities?.wisdom ?? 0) + (target.proficiencies?.will === 'expert' ? 4 : target.proficiencies?.will === 'master' ? 6 : target.proficiencies?.will === 'trained' ? 2 : 0) + target.level;
  const totalSave = saveRoll + willMod;

  let degree: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  if (saveRoll === 20 || totalSave >= spellDC + 10) degree = 'critical-success';
  else if (totalSave >= spellDC) degree = saveRoll === 1 ? 'failure' : 'success';
  else if (totalSave >= spellDC - 10) degree = saveRoll === 1 ? 'critical-failure' : 'failure';
  else degree = 'critical-failure';

  let totalDamage = 0;
  for (let i = 0; i < numDice; i++) {
    totalDamage += Math.floor(Math.random() * dieSize) + 1;
  }

  if (actor.unleashPsycheActive) {
    totalDamage += heightenedRank * 2;
  }

  let message = `🧠 ${actor.name} plants a Forbidden Thought in ${target.name}'s mind!${amped ? ' [AMPED]' : ''} (Will save: ${saveRoll} + ${willMod} = ${totalSave} vs DC ${spellDC}) `;

  if (degree === 'critical-success') {
    message += `Critical Success — No effect!`;
    return { success: true, message, degree };
  } else if (degree === 'success') {
    const halfDamage = Math.floor(totalDamage / 2);
    target.currentHealth = Math.max(0, target.currentHealth - halfDamage);
    message += `Success — ${halfDamage} mental damage (halved).`;
  } else if (degree === 'failure') {
    target.currentHealth = Math.max(0, target.currentHealth - totalDamage);
    message += `Failure — ${totalDamage} mental damage and -2 status penalty to attacks!`;
    target.conditions = target.conditions ?? [];
    target.conditions.push({ name: 'forbidden-thought-penalty', value: 2, duration: 2 });
    if (amped) {
      target.conditions.push({ name: 'stunned', value: 1, duration: 1 });
      message += ` Also stunned 1!`;
    }
  } else {
    const doubleDamage = totalDamage * 2;
    target.currentHealth = Math.max(0, target.currentHealth - doubleDamage);
    message += `Critical Failure — ${doubleDamage} mental damage (doubled), -2 status penalty to attacks!`;
    target.conditions = target.conditions ?? [];
    target.conditions.push({ name: 'forbidden-thought-penalty', value: 2, duration: 2 });
    if (amped) {
      target.conditions.push({ name: 'stunned', value: 1, duration: 1 });
      message += ` Also stunned 1!`;
    }
  }

  if (target.currentHealth <= 0) {
    target.dying = true;
    message += ` 💀 ${target.name} falls!`;
  }

  return { success: true, message, damage: totalDamage, damageType: 'mental', degree };
}

export function resolvePhaseBolt(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1,
  amped: boolean = false
): any {
  if (!targetId) return { success: false, message: 'Phase Bolt requires a target.' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found.' };

  const dist = ctx.calculateDistance(actor.positions, target.positions);
  if (dist > 6) {
    return { success: false, message: `Target is ${Math.round(dist * 5)}ft away — Phase Bolt has 30ft range.`, errorCode: 'OUT_OF_RANGE' };
  }

  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      return { success: false, message: 'No focus points available to amp this cantrip.' };
    }
  }

  const numDice = amped ? heightenedRank * 2 : 1 + heightenedRank;
  const dieSize = 4;
  const damageType = 'piercing';

  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  let targetAC = calculateAC(target, actor.id, 'ranged');
  if (amped) {
    targetAC = Math.max(0, targetAC - 2);
  }

  const isNat20 = d20 === 20;
  const isNat1 = d20 === 1;
  let degree: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  if (isNat20 || totalAttack >= targetAC + 10) degree = 'critical-success';
  else if (totalAttack >= targetAC) degree = isNat1 ? 'failure' : 'success';
  else if (totalAttack >= targetAC - 10) degree = isNat1 ? 'critical-failure' : 'failure';
  else degree = 'critical-failure';

  if (degree === 'failure' || degree === 'critical-failure') {
    return {
      success: true,
      message: `🔮 ${actor.name} fires a Phase Bolt at ${target.name} — misses! (${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC})${amped ? ' [AMPED - flat-footed]' : ''}`,
      degree,
    };
  }

  let totalDamage = 0;
  for (let i = 0; i < numDice; i++) {
    totalDamage += Math.floor(Math.random() * dieSize) + 1;
  }

  if (actor.unleashPsycheActive) {
    totalDamage += heightenedRank * 2;
  }

  if (degree === 'critical-success') totalDamage *= 2;

  const damageCalc = calculateFinalDamage(totalDamage, damageType, target);
  target.currentHealth -= damageCalc.finalDamage;

  let message = `🔮 ${actor.name} fires a Phase Bolt at ${target.name}! ${degree === 'critical-success' ? 'CRITICAL HIT! ' : ''}(${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}) ${numDice}d${dieSize} = ${damageCalc.finalDamage} ${damageType} damage${amped ? ' [AMPED - target flat-footed, ignores Hardness]' : ' (ignores cover)'}`;

  if (amped && degree === 'critical-success') {
    message += ` — Target can't teleport until start of your next turn!`;
  }

  if (target.currentHealth <= 0) {
    target.dying = true;
    message += ` 💀 ${target.name} falls!`;
  }

  return { success: true, message, damage: damageCalc.finalDamage, damageType, degree };
}

export function resolveRayOfFrost(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): any {
  if (!targetId) return { success: false, message: 'Frostbite requires a target.' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found.' };

  const dist = ctx.calculateDistance(actor.positions, target.positions);
  if (dist > 24) {
    return { success: false, message: 'Target is out of range for Frostbite (120ft max).', errorCode: 'OUT_OF_RANGE' };
  }

  const numDice = 1 + heightenedRank;
  const dieSize = 4;

  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `❄️ ${actor.name} casts Frostbite${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * dieSize) + 1;
  }
  if (result === 'critical-success') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'cold', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} cold`;
  if (target.currentHealth <= 0 && !target.dying) {
    target.dying = true;
    message += `\n💀 ${target.name} falls!`;
  }

  return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}
