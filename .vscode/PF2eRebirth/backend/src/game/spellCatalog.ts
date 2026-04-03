// Spell Catalog - extracted from RulesEngine
// All functions follow the SpellContext pattern: (ctx, actor, gameState, ...) => any
// Converted from private RulesEngine methods to standalone functions.

import { Creature, GameState, Position, rollDamageFormula, calculateFinalDamage, calculateSpellDC, calculateSpellAttack, calculateSpellAttackModifier, rollD20, getSpell, getDegreeOfSuccess, calculateSaveBonus, getConditionModifiers, computePathCost, getEffectiveReach } from 'pf2e-shared';

// ——— Shared ok/fail helpers ———
function ok(message: string, extra?: Record<string, unknown>): { success: true; message: string; [key: string]: unknown } {
  return { success: true, message, ...extra };
}

function fail(message: string, errorCode?: string): { success: false; message: string; errorCode?: string; [key: string]: unknown } {
  return errorCode
    ? { success: false, message, errorCode }
    : { success: false, message };
}

// ——— Spell Context Interface ———
export interface SpellContext {
  calculateDistance(pos1: Position, pos2: Position): number;
  cleanupStaleFlankingConditions(gameState: GameState): void;
  rollSave(creature: Creature, saveType: 'reflex' | 'fortitude' | 'will', saveDC: number, heroPointsSpent?: number): {
    d20: number; bonus: number; total: number; result: string;
  };
  consumeFocusPointForAmp(creature: Creature): boolean;
  hasPsychicUnboundStep(creature: Creature): boolean;
}

// ——— Spell Type for Resolver ———
export type SpellResolver = (
  ctx: SpellContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  targetPosition?: Position,
  heightenedRank?: number
) => any;

// ——— Spell Map ———
export const spellCatalogMap: Record<string, SpellResolver> = {
  "magic-missile": resolveMagicMissile,
  "force-barrage": resolveMagicMissile,
  "fireball": resolveFireball,
  "burning-hands": resolveBurningHands,
  "breathe-fire": resolveBurningHands,
  "shield": resolveShield,
  "heal": resolveHeal,
  "produce-flame": resolveProduceFlame,
  "electric-arc": resolveElectricArc,
  "telekinetic-projectile": resolveTelekineticProjectile,
  "daze": resolveDaze,
  "fear": resolveFear,
  "grease": resolveGrease,
  "haste": resolveHaste,
  "slow": resolveSlow,
  "lightning-bolt": resolveLightningBolt,
  "heroism": resolveHeroism,
  "true-strike": resolveTrueStrike,
  "sure-strike": resolveTrueStrike,
  "warp-step": resolveWarpStep,
};

// ——— Spell Implementations ———

/**
 * Generic spell resolver ÔÇö auto-resolves spells from catalog data.
 *
 * Supports:
 *  ÔÇó AoE + basic save + damage (fireball-like)
 *  ÔÇó Single-target + spell attack + damage (ray-of-frostÔÇôlike)
 *  ÔÇó Single-target + save + damage (daze-like)
 *  ÔÇó Save-only spells (condition application)
 *  ÔÇó Healing spells (vitality damage type ÔåÆ heals instead)
 *  ÔÇó Pure buff / utility (no damage, no save)
 */
export function resolveGenericSpell(ctx: SpellContext, 
  actor: Creature,
  gameState: GameState,
  spell: any,
  targetId?: string,
  targetPosition?: Position,
  heightenedRank: number = 1
): any {
  // ÔöÇÔöÇ Heightened damage formula ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const calcDamageFormula = (base: string, rank: number): string => {
    if (!spell.heightening || spell.heightening.type !== 'interval' || !spell.heightening.damage) return base;
    const extraSteps = Math.max(0, Math.floor((rank - spell.rank) / spell.heightening.interval));
    if (extraSteps <= 0) return base;
    const extraMatch = /(\d+)d(\d+)/.exec(spell.heightening.damage);
    if (!extraMatch) return base;
    const baseMatch = /(\d+)d(\d+)/.exec(base);
    if (!baseMatch) return base;
    const baseSides = parseInt(baseMatch[2], 10);
    const extraDice = parseInt(extraMatch[1], 10) * extraSteps;
    const baseDice = parseInt(baseMatch[1], 10);
    const bonusMatch = /[+-]\d+/.exec(base);
    const bonusStr = bonusMatch ? bonusMatch[0] : '';
    return `${baseDice + extraDice}d${baseSides}${bonusStr}`;
  };

  // ÔöÇÔöÇ Determine if this is a healing spell ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const isHealing = spell.damageType === 'vitality' || spell.name.toLowerCase().includes('heal') || spell.name.toLowerCase().includes('soothe');

  // ÔöÇÔöÇ AoE save spells (damage or condition) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if (spell.targetType === 'aoe' && spell.saveType) {
    const radius = spell.aoeRadius ?? 4;
    const saveDC = calculateSpellDC(actor);
    const centerX = targetPosition?.x ?? actor.positions.x;
    const centerY = targetPosition?.y ?? actor.positions.y;

    const targetsInAoE = gameState.creatures.filter((c) => {
      if (c.id === actor.id) return false;
      const dx = c.positions.x - centerX;
      const dy = c.positions.y - centerY;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });

    const formula = spell.damageFormula ? calcDamageFormula(spell.damageFormula, heightenedRank) : null;
    const baseDamageRoll = formula ? rollDamageFormula(formula) : null;
    const results: any[] = [];

    for (const target of targetsInAoE) {
      const saveRoll = ctx.rollSave(target, spell.saveType, saveDC);
      let damage = baseDamageRoll?.total ?? 0;

      if (spell.basicSave) {
        if (saveRoll.result === 'critical-success') damage = 0;
        else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
        else if (saveRoll.result === 'critical-failure') damage = damage * 2;
      } else {
        // Non-basic save: success = no effect, failure = full, crit fail = double
        if (saveRoll.result === 'critical-success' || saveRoll.result === 'success') damage = 0;
        else if (saveRoll.result === 'critical-failure') damage = damage * 2;
      }

      if (damage > 0 && spell.damageType) {
        const damageCalc = calculateFinalDamage(damage, spell.damageType, target);
        const finalDmg = damageCalc.finalDamage;
        const shieldResult = applyDamageToShield(target, finalDmg);
        target.currentHealth -= shieldResult.creatureTakenDamage;
        let msg = `${target.name}: ${saveRoll.result} (${saveRoll.d20}+${saveRoll.bonus}=${saveRoll.total} vs DC ${saveDC}) ÔåÆ ${shieldResult.creatureTakenDamage} ${spell.damageType} damage`;
        if (damageCalc.modifier !== 'normal') msg += ` (${damageCalc.modifier})`;
        if (target.currentHealth <= 0 && !target.dying) msg += initDying(target);
        results.push({ target: target.name, save: saveRoll.result, damage: shieldResult.creatureTakenDamage, msg });
      } else {
        // Condition-only AoE (e.g. fear, slow)
        const applied = saveRoll.result === 'failure' || saveRoll.result === 'critical-failure';
        results.push({ target: target.name, save: saveRoll.result, applied, msg: `${target.name}: ${saveRoll.result} (${saveRoll.d20}+${saveRoll.bonus}=${saveRoll.total} vs DC ${saveDC})${applied ? ' ÔÇö effect applied' : ' ÔÇö resisted'}` });
      }
    }

    const summary = results.map(r => r.msg).join('\n');
    const heightenNote = heightenedRank > spell.rank ? ` (Heightened to rank ${heightenedRank})` : '';
    return {
      success: true,
      message: `${spell.icon} ${actor.name} casts ${spell.name}${heightenNote} as a ${radius * 5}-foot ${spell.aoeShape || 'burst'}!\n${summary || 'No targets in area.'}`,
      targetCount: targetsInAoE.length,
      results,
      heightenedRank,
    };
  }

  // ÔöÇÔöÇ Single-target spells ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if (spell.targetType === 'single') {
    // ÔöÇÔöÇ Healing ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (isHealing && spell.damageFormula) {
      const target = targetId ? gameState.creatures.find(c => c.id === targetId) : actor;
      if (!target) return fail('Target not found');
      const formula = calcDamageFormula(spell.damageFormula, heightenedRank);
      const roll = rollDamageFormula(formula);
      const healed = Math.min(roll.total, (target.maxHealth ?? target.currentHealth + roll.total) - target.currentHealth);
      target.currentHealth += healed;
      const heightenNote = heightenedRank > spell.rank ? ` (Heightened to rank ${heightenedRank})` : '';
      return {
        success: true,
        message: `${spell.icon} ${actor.name} casts ${spell.name}${heightenNote} on ${target.name}, restoring ${healed} HP! [${formula}: ${roll.total}]`,
        healing: healed,
        heightenedRank,
      };
    }

    // ÔöÇÔöÇ Damage spell with save (no attack roll) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (spell.damageFormula && spell.saveType && !spell.damageType?.includes('attack')) {
      if (!targetId) return fail('No target specified');
      const target = gameState.creatures.find(c => c.id === targetId);
      if (!target) return fail('Target not found');

      const saveDC = calculateSpellDC(actor);
      const saveRoll = ctx.rollSave(target, spell.saveType, saveDC);
      const formula = calcDamageFormula(spell.damageFormula, heightenedRank);
      const roll = rollDamageFormula(formula);
      let damage = roll.total;

      if (spell.basicSave) {
        if (saveRoll.result === 'critical-success') damage = 0;
        else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
        else if (saveRoll.result === 'critical-failure') damage = damage * 2;
      } else {
        if (saveRoll.result === 'critical-success' || saveRoll.result === 'success') damage = 0;
        else if (saveRoll.result === 'critical-failure') damage = damage * 2;
      }

      let finalDmg = damage;
      let modNote = '';
      if (damage > 0 && spell.damageType) {
        const damageCalc = calculateFinalDamage(damage, spell.damageType, target);
        finalDmg = damageCalc.finalDamage;
        if (damageCalc.modifier !== 'normal') modNote = ` (${damageCalc.modifier})`;
        const shieldResult = applyDamageToShield(target, finalDmg);
        target.currentHealth -= shieldResult.creatureTakenDamage;
        finalDmg = shieldResult.creatureTakenDamage;
      }

      let msg = `${spell.icon} ${actor.name} casts ${spell.name} on ${target.name}! ${saveRoll.result} (${saveRoll.d20}+${saveRoll.bonus}=${saveRoll.total} vs DC ${saveDC}) ÔåÆ ${finalDmg} ${spell.damageType || ''} damage${modNote}`;
      if (heightenedRank > spell.rank) msg += ` (Heightened to rank ${heightenedRank})`;
      if (target.currentHealth <= 0 && !target.dying) msg += initDying(target);

      return {
        success: true,
        message: msg,
        damage: { type: spell.damageType, formula, rolled: roll.total, final: finalDmg },
        save: saveRoll,
        heightenedRank,
      };
    }

    // ÔöÇÔöÇ Damage spell with spell attack roll ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (spell.damageFormula && !spell.saveType) {
      if (!targetId) return fail('No target specified');
      const target = gameState.creatures.find(c => c.id === targetId);
      if (!target) return fail('Target not found');

      const attackBonus = calculateSpellAttack(actor);
      const d20 = rollD20();
      const total = d20 + attackBonus;
      const targetAC = calculateAC(target);
      const attackResult = getAttackResult(d20, total, targetAC);

      if (attackResult === 'critical-failure' || attackResult === 'failure') {
        return {
          success: true,
          message: `${spell.icon} ${actor.name} casts ${spell.name} at ${target.name} but misses! (${d20}+${attackBonus}=${total} vs AC ${targetAC})`,
          attackResult,
          heightenedRank,
        };
      }

      const formula = calcDamageFormula(spell.damageFormula, heightenedRank);
      const roll = rollDamageFormula(formula);
      let damage = roll.total;
      if (attackResult === 'critical-success') damage = damage * 2;

      let finalDmg = damage;
      let modNote = '';
      if (spell.damageType) {
        const damageCalc = calculateFinalDamage(damage, spell.damageType, target);
        finalDmg = damageCalc.finalDamage;
        if (damageCalc.modifier !== 'normal') modNote = ` (${damageCalc.modifier})`;
        const shieldResult = applyDamageToShield(target, finalDmg);
        target.currentHealth -= shieldResult.creatureTakenDamage;
        finalDmg = shieldResult.creatureTakenDamage;
      }

      const critLabel = attackResult === 'critical-success' ? ' CRITICAL HIT!' : '';
      let msg = `${spell.icon} ${actor.name} casts ${spell.name} at ${target.name}!${critLabel} (${d20}+${attackBonus}=${total} vs AC ${targetAC}) ÔåÆ ${finalDmg} ${spell.damageType || ''} damage${modNote}`;
      if (heightenedRank > spell.rank) msg += ` (Heightened to rank ${heightenedRank})`;
      if (target.currentHealth <= 0 && !target.dying) msg += initDying(target);

      return {
        success: true,
        message: msg,
        attackResult,
        damage: { type: spell.damageType, formula, rolled: roll.total, final: finalDmg },
        heightenedRank,
      };
    }

    // ÔöÇÔöÇ Save-only spell (condition, no damage) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (spell.saveType && !spell.damageFormula) {
      if (!targetId) return fail('No target specified');
      const target = gameState.creatures.find(c => c.id === targetId);
      if (!target) return fail('Target not found');

      const saveDC = calculateSpellDC(actor);
      const saveRoll = ctx.rollSave(target, spell.saveType, saveDC);
      const failed = saveRoll.result === 'failure' || saveRoll.result === 'critical-failure';
      const critFail = saveRoll.result === 'critical-failure';

      let effectNote = failed ? 'Effect applied!' : 'Target resists.';
      if (critFail) effectNote = 'Critical failure ÔÇö enhanced effect!';

      let msg = `${spell.icon} ${actor.name} casts ${spell.name} on ${target.name}! ${saveRoll.result} (${saveRoll.d20}+${saveRoll.bonus}=${saveRoll.total} vs DC ${saveDC}) ÔÇö ${effectNote}`;
      if (heightenedRank > spell.rank) msg += ` (Heightened to rank ${heightenedRank})`;

      return {
        success: true,
        message: msg,
        save: saveRoll,
        effectApplied: failed,
        criticalFailure: critFail,
        heightenedRank,
      };
    }

    // ÔöÇÔöÇ Buff / utility / summon (no damage, no save) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    const heightenNote = heightenedRank > spell.rank ? ` (Heightened to rank ${heightenedRank})` : '';
    return {
      success: true,
      message: `${spell.icon} ${actor.name} casts ${spell.name}${heightenNote}. ${spell.description.slice(0, 120)}`,
      heightenedRank,
    };
  }

  // ÔöÇÔöÇ AoE damage with no save (unlikely but handled) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if (spell.targetType === 'aoe' && spell.damageFormula && !spell.saveType) {
    const radius = spell.aoeRadius ?? 4;
    const centerX = targetPosition?.x ?? actor.positions.x;
    const centerY = targetPosition?.y ?? actor.positions.y;
    const formula = calcDamageFormula(spell.damageFormula, heightenedRank);
    const roll = rollDamageFormula(formula);

    const targetsInAoE = gameState.creatures.filter((c) => {
      if (c.id === actor.id) return false;
      const dx = c.positions.x - centerX;
      const dy = c.positions.y - centerY;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });

    const results: any[] = [];
    for (const target of targetsInAoE) {
      const damageCalc = calculateFinalDamage(roll.total, spell.damageType || 'force', target);
      const shieldResult = applyDamageToShield(target, damageCalc.finalDamage);
      target.currentHealth -= shieldResult.creatureTakenDamage;
      let msg = `${target.name}: ${shieldResult.creatureTakenDamage} ${spell.damageType || 'force'} damage`;
      if (target.currentHealth <= 0 && !target.dying) msg += initDying(target);
      results.push({ target: target.name, damage: shieldResult.creatureTakenDamage, msg });
    }

    const summary = results.map(r => r.msg).join('\n');
    return {
      success: true,
      message: `${spell.icon} ${actor.name} casts ${spell.name}!\n${summary || 'No targets in area.'}`,
      targetCount: targetsInAoE.length,
      results,
      heightenedRank,
    };
  }

  // ÔöÇÔöÇ Fallback: truly unresolvable stub ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  return ok(`${spell.icon} ${actor.name} casts ${spell.name}. ${spell.description.slice(0, 140)}`);
}

export function resolveMagicMissile(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found');
  }

  // Magic Missile: 1 missile at rank 1, +1 missile per 2 ranks above 1
  // Rank 1 = 1 missile, Rank 3 = 2 missiles, Rank 5 = 3 missiles, etc.
  const numMissiles = 1 + Math.floor((heightenedRank - 1) / 2);

  let totalDamage = 0;
  const missileRolls: number[] = [];

  // Roll damage for each missile
  for (let i = 0; i < numMissiles; i++) {
    const roll = rollDamageFormula('1d4+1');
    missileRolls.push(roll.total);
    totalDamage += roll.total;
  }

  // Apply force damage resistances
  const damageCalc = calculateFinalDamage(totalDamage, 'force', target);
  const finalDamage = damageCalc.finalDamage;

  target.currentHealth -= finalDamage;

  let statusMessage = `Ô£¿ ${actor.name} unleashes ${numMissiles} Magic Missile${numMissiles > 1 ? 's' : ''} on ${target.name} for ${finalDamage} damage!`;
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
      baseDamage: totalDamage,
      damageModifier: damageCalc.modifier,
      modifierValue: damageCalc.modifierValue,
      finalDamage: finalDamage,
      formula: `${numMissiles}├ù(1d4+1)`,
      rolls: missileRolls,
    },
    heightenedRank,
    numMissiles,
  };
}

export function resolveFireball(ctx: SpellContext, actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 3): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return fail('Invalid target location specified');
  }

  const aoeRadius = 4; // 20-foot burst = 4 squares radius
  const saveDC = calculateSpellDC(actor);

  // Find all creatures in the AoE
  const targetsInAoE = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false; // Don't target self
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= aoeRadius;
  });

  // Fireball damage: 6d6 at rank 3, +2d6 per rank above 3
  const baseDice = 6 + 2 * Math.max(0, heightenedRank - 3);
  const damageFormula = `${baseDice}d6`;

  // Allow casting even with no targets (just wasted spell)
  if (targetsInAoE.length === 0) {
    return {
      success: true,
      message: `­ƒöÑ ${actor.name} casts Fireball${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y}), but there are no targets in the blast radius!`,
      targetCount: 0,
      aoeRadius,
      centerPosition: targetPosition,
      baseRoll: { results: [], total: 0 },
      results: [],
      heightenedRank,
      damageFormula,
    };
  }

  // Roll damage once for all targets
  const baseDamageRoll = rollDamageFormula(damageFormula);
  const results: any[] = [];

  targetsInAoE.forEach((target) => {
    // Make a Reflex save
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;

    // PF2e Basic Save: crit-success = 0, success = half, failure = full, crit-failure = double
    if (saveRoll.result === 'critical-success') {
      damage = 0;
    } else if (saveRoll.result === 'success') {
      damage = Math.floor(baseDamageRoll.total / 2);
    } else if (saveRoll.result === 'critical-failure') {
      damage = baseDamageRoll.total * 2;
    }
    // else: failure = full damage

    // Apply fire damage resistances/immunities/weaknesses
    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    const finalDamage = damageCalc.finalDamage;

    // Apply damage through shield (if equipped)
    const shieldResult = applyDamageToShield(target, finalDamage);
    target.currentHealth -= shieldResult.creatureTakenDamage;

    // Fireball has no persistent damage effect per PF2e Remaster
    const persistentDamageApplied = false;

    let targetStatus = '';
    if (target.currentHealth <= 0 && !target.dying) {
      targetStatus = initDying(target);
    }

    // Build damage description with modifier if applicable
    let damageDescription = `${damage}`;
    if (damageCalc.modifier === 'immune') {
      damageDescription = '0 (immune)';
    } else if (damageCalc.modifier === 'resist') {
      damageDescription = `${finalDamage} (resisted by ${damageCalc.modifierValue})`;
    } else if (damageCalc.modifier === 'weak') {
      damageDescription = `${finalDamage} (weak +${damageCalc.modifierValue})`;
    }

    // Add shield info to description if shield active
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

  const message = `­ƒöÑ ${actor.name} casts Fireball${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y})! Base damage: ${baseDamageRoll.total} (${baseDamageRoll.results.join(', ')})`;

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

export function resolveBurningHands(ctx: SpellContext, actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 1): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return fail('Invalid target location specified');
  }

  const coneRange = 3; // 15-foot cone Ôëê 3 squares
  const saveDC = calculateSpellDC(actor);

  // Calculate direction vector from caster to target position
  const dx = targetPosition.x - actor.positions.x;
  const dy = targetPosition.y - actor.positions.y;
  const coneDistance = Math.sqrt(dx * dx + dy * dy);

  // If no clear direction (caster targeting self), use a default cone direction
  const coneDirectionX = coneDistance > 0 ? dx / coneDistance : 1;
  const coneDirectionY = coneDistance > 0 ? dy / coneDistance : 0;

  // Find all creatures in cone AoE
  const targetsInAoE = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false; // Don't target self
    
    const cdx = creature.positions.x - actor.positions.x;
    const cdy = creature.positions.y - actor.positions.y;
    const creatureDistance = Math.sqrt(cdx * cdx + cdy * cdy);

    // Must be within cone range
    if (creatureDistance > coneRange) return false;

    // Check if creature is within cone angle (~90 degree cone = 45 degrees on each side)
    if (creatureDistance > 0) {
      const creatureDirX = cdx / creatureDistance;
      const creatureDirY = cdy / creatureDistance;
      
      // Dot product to get angle between cone direction and creature direction
      const dotProduct = coneDirectionX * creatureDirX + coneDirectionY * creatureDirY;
      
      // cos(45┬░) Ôëê 0.707, so dot product > 0.5 gives roughly 60-degree cone spread
      if (dotProduct < 0.5) return false;
    }

    return true;
  });

  // Burning Hands damage: 2d6 at rank 1, +2d6 per rank above 1
  const baseDice = 2 + 2 * Math.max(0, heightenedRank - 1);
  const damageFormula = `${baseDice}d6`;

  // Allow casting even with no targets
  if (targetsInAoE.length === 0) {
    return {
      success: true,
      message: `­ƒöÑ ${actor.name} casts Burning Hands${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} in a cone from (${actor.positions.x}, ${actor.positions.y}), but there are no targets in the blast!`,
      targetCount: 0,
      coneRange,
      centerPosition: actor.positions,
      results: [],
      heightenedRank,
      damageFormula,
    };
  }

  // Roll damage once for all targets
  const baseDamageRoll = rollDamageFormula(damageFormula);
  const results: any[] = [];

  targetsInAoE.forEach((target) => {
    // Make a Reflex save (basic save)
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;

    // PF2e Basic Save: crit-success = 0, success = half, failure = full, crit-failure = double
    if (saveRoll.result === 'critical-success') {
      damage = 0;
    } else if (saveRoll.result === 'success') {
      damage = Math.floor(baseDamageRoll.total / 2);
    } else if (saveRoll.result === 'critical-failure') {
      damage = baseDamageRoll.total * 2;
    }
    // else: failure = full damage

    // Breathe Fire (Remaster) has NO persistent damage

    // Apply fire damage resistances/immunities/weaknesses
    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    const finalDamage = damageCalc.finalDamage;

    // Apply damage through shield (if equipped)
    const shieldResult = applyDamageToShield(target, finalDamage);
    target.currentHealth -= shieldResult.creatureTakenDamage;

    let targetStatus = '';
    if (target.currentHealth <= 0 && !target.dying) {
      targetStatus = initDying(target);
    }

    // Build damage description
    let damageDescription = `${damage}`;
    if (damageCalc.modifier === 'immune') {
      damageDescription = '0 (immune)';
    } else if (damageCalc.modifier === 'resist') {
      damageDescription = `${finalDamage} (resisted by ${damageCalc.modifierValue})`;
    } else if (damageCalc.modifier === 'weak') {
      damageDescription = `${finalDamage} (weak +${damageCalc.modifierValue})`;
    }

    // Build shield description
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

  const message = `­ƒöÑ ${actor.name} casts Burning Hands in a cone! Base damage: ${baseDamageRoll.total} (${baseDamageRoll.results.join(', ')})`;

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

export function resolveShield(ctx: SpellContext, actor: Creature, heightenedRank: number = 1): any {
  // PF2e Remaster: Shield cantrip grants +1 circumstance bonus to AC
  // TODO: Implement full Shield mechanics (Hardness, HP, Broken Threshold based on heightening)
  // Rank 1: Hardness 5, HP 20, BT 10
  // +2 ranks: +2 Hardness, +10 HP, +5 BT
  actor.conditions.push({ name: 'shield', duration: 1, value: 1 }); // +1 AC for 1 round
  return {
    success: true,
    message: `­ƒøí´©Å ${actor.name} casts Shield${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}, gaining +1 AC this round!`,
    acBonus: 1,
    heightenedRank,
  };
}

export function resolveHeal(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Heal!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Heal: 1d8 per rank (heightening +1d8 per rank). No modifier added per Remaster.
  const numDice = heightenedRank;
  const healFormula = `${numDice}d8`;
  const healRoll = rollDamageFormula(healFormula);
  
  const totalHealing = healRoll.total;

  const previousHP = target.currentHealth;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + totalHealing);
  const actualHealing = target.currentHealth - previousHP;

  let message = `­ƒÆÜ ${actor.name} casts Heal${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} on ${target.name} for ${actualHealing} HP!`;
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

export function resolveProduceFlame(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Produce Flame!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Ignition (Remaster): 2d4 fire at base, +1d4 per heightened rank
  const numDice = 1 + heightenedRank;
  const damageFormula = `${numDice}d4`;

  // Spell attack roll (check for Sure Strike fortune effect)
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

  let message = `­ƒöÑ ${actor.name} casts Ignition${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  if (sureStrikeUsed) {
    message += `Sure Strike: rolled ${sureStrikeRolls![0]} and ${sureStrikeRolls![1]}, using ${d20}\n`;
  }
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${total} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return ok(message, { result, targetHealth: target.currentHealth });
  }

  // Roll damage
  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  // Critical hit doubles damage and applies persistent fire
  if (result === 'critical-success') {
    damage *= 2;
    // Persistent fire on critical hit: 1d4 per rank
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

  message += `\n­ƒÆÑ Damage: ${finalDamage} fire`;
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

export function resolveElectricArc(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Electric Arc!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Electric Arc: 2d4 at base, +1d4 per heightened rank (Remaster)
  const numDice = 1 + heightenedRank;
  const damageFormula = `${numDice}d4`;
  const saveDC = calculateSpellDC(actor);

  // Basic Reflex save
  const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  // Apply basic save rules
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

  let message = `ÔÜí ${actor.name} casts Electric Arc${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Reflex Save: ${saveRoll.total} vs DC ${saveDC} ÔåÆ **${saveRoll.result.toUpperCase()}**\n`;
  message += `­ƒÆÑ Damage: ${finalDamage} electricity`;

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

export function resolveTelekineticProjectile(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Telekinetic Projectile!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Telekinetic Projectile: 2d6 at base, +1d6 per heightened rank
  const numDice = 1 + heightenedRank;
  const damageFormula = `${numDice}d6`;

  // Spell attack roll (check for Sure Strike fortune effect)
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

  let message = `­ƒ¬¿ ${actor.name} casts Telekinetic Projectile${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  if (sureStrikeUsed) {
    message += `Sure Strike: rolled ${sureStrikeRolls![0]} and ${sureStrikeRolls![1]}, using ${d20}\n`;
  }
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${total} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return ok(message, { result, targetHealth: target.currentHealth });
  }

  // Roll damage
  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  if (result === 'critical-success') {
    damage *= 2;
  }

  const damageCalc = calculateFinalDamage(damage, 'bludgeoning', target);
  const finalDamage = damageCalc.finalDamage;
  target.currentHealth -= finalDamage;

  message += `\n­ƒÆÑ Damage: ${finalDamage} bludgeoning`;

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

export function resolveDaze(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Daze!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Daze: 1d6, heightens +1d6 per 2 ranks
  const numDice = 1 + Math.floor((heightenedRank - 1) / 2);
  const damageFormula = `${numDice}d6`;
  const saveDC = calculateSpellDC(actor);

  // Basic Will save
  const saveRoll = ctx.rollSave(target, 'will', saveDC);
  const baseDamageRoll = rollDamageFormula(damageFormula);
  let damage = baseDamageRoll.total;

  // Apply basic save rules
  if (saveRoll.result === 'critical-success') {
    damage = 0;
  } else if (saveRoll.result === 'success') {
    damage = Math.floor(damage / 2);
  } else if (saveRoll.result === 'critical-failure') {
    damage *= 2;
    // Apply stunned 1 on critical failure
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'stunned', duration: 'permanent', value: 1 });
  }

  const damageCalc = calculateFinalDamage(damage, 'mental', target);
  const finalDamage = damageCalc.finalDamage;
  target.currentHealth -= finalDamage;

  let message = `­ƒÿÁ ${actor.name} casts Daze${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} ÔåÆ **${saveRoll.result.toUpperCase()}**\n`;
  message += `­ƒÆÑ Damage: ${finalDamage} mental`;

  if (saveRoll.result === 'critical-failure') {
    message += `\nÔ£¿ ${target.name} is **stunned 1**!`;
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

export function resolveFear(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Fear!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC);

  let message = `­ƒÿ▒ ${actor.name} casts Fear${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} ÔåÆ **${saveRoll.result.toUpperCase()}**`;

  // Apply frightened based on save result (PF2e Remaster)
  // Crit Success: unaffected, Success: frightened 1, Failure: frightened 2, Crit Failure: frightened 3 + fleeing 1 round
  if (saveRoll.result === 'critical-failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'frightened', duration: 'permanent', value: 3 });
    target.conditions.push({ name: 'fleeing', duration: 1, value: 1 });
    message += `\nÔ£¿ ${target.name} is **frightened 3** and **fleeing** for 1 round!`;
  } else if (saveRoll.result === 'failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'frightened', duration: 'permanent', value: 2 });
    message += `\nÔ£¿ ${target.name} is **frightened 2**!`;
  } else if (saveRoll.result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'frightened', duration: 'permanent', value: 1 });
    message += `\nÔ£¿ ${target.name} is **frightened 1**!`;
  } else {
    message += `\nÔØî ${target.name} is unaffected!`;
  }

  return {
    success: true,
    message,
    saveResult: saveRoll.result,
    targetHealth: target.currentHealth,
    heightenedRank,
  };
}

export function resolveGrease(ctx: SpellContext, actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 1): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return fail('Invalid target location specified for Grease!');
  }

  const aoeRadius = 2; // 2-square radius (covers 4 squares in a 2x2 area)
  const saveDC = calculateSpellDC(actor);

  // Find all creatures in the greased area
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
      message: `­ƒøó´©Å ${actor.name} casts Grease${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y}), but no creatures are in the area!`,
      heightenedRank,
    };
  }

  const results: any[] = [];
  let message = `­ƒøó´©Å ${actor.name} casts Grease${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y})!\n`;

  targetsInAoE.forEach((target) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    
    let targetMessage = `${target.name}: ${saveRoll.result.toUpperCase()}`;

    if (saveRoll.result === 'critical-failure') {
      // Prone + off-guard
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'prone', duration: 'permanent', value: 1 });
      target.conditions.push({ name: 'off-guard', duration: 1, value: 1 });
      targetMessage += ' ÔåÆ **prone + off-guard**';
    } else if (saveRoll.result === 'failure') {
      // Off-guard only
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'off-guard', duration: 1, value: 1 });
      targetMessage += ' ÔåÆ **off-guard**';
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

export function resolveHaste(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Haste!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Haste: Duration 1 minute (10 rounds), NOT sustained
  if (!target.conditions) target.conditions = [];
  target.conditions.push({ 
    name: 'quickened', 
    duration: 10, // 1 minute = 10 rounds
    value: 1,
    source: `haste-${actor.id}`,
  });

  let message = `ÔÜí ${actor.name} casts Haste${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Ô£¿ ${target.name} is **quickened** (extra action each turn for Stride, Strike, or Step only)!`;

  return {
    success: true,
    message,
    targetHealth: target.currentHealth,
    heightenedRank,
  };
}

export function resolveSlow(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
  if (!targetId) {
    return fail('No target specified for Slow!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'fortitude', saveDC);

  let message = `­ƒÉî ${actor.name} casts Slow${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} ÔåÆ **${saveRoll.result.toUpperCase()}**`;

  // Apply slowed based on save result (PF2e Remaster)
  // Crit Success: unaffected, Success: slowed 1 for 1 round, Failure: slowed 1 for 1 minute, Crit Failure: slowed 2 for 1 minute
  if (saveRoll.result === 'critical-failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ 
      name: 'slowed', 
      duration: 10, // 1 minute = 10 rounds
      value: 2,
      source: `slow-${actor.id}`,
    });
    message += `\nÔ£¿ ${target.name} is **slowed 2** for 1 minute!`;
  } else if (saveRoll.result === 'failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ 
      name: 'slowed', 
      duration: 10, // 1 minute = 10 rounds
      value: 1,
      source: `slow-${actor.id}`,
    });
    message += `\nÔ£¿ ${target.name} is **slowed 1** for 1 minute!`;
  } else if (saveRoll.result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ 
      name: 'slowed', 
      duration: 1, // 1 round only
      value: 1,
      source: `slow-${actor.id}`,
    });
    message += `\nÔ£¿ ${target.name} is **slowed 1** for 1 round!`;
  } else {
    message += `\nÔØî ${target.name} resists the slow effect!`;
  }

  return {
    success: true,
    message,
    saveResult: saveRoll.result,
    targetHealth: target.currentHealth,
    heightenedRank,
  };
}

export function resolveLightningBolt(ctx: SpellContext, actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 3): any {
  if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
    return fail('Invalid target location specified for Lightning Bolt!');
  }

  const lineRange = 24; // 120 feet = 24 squares
  const saveDC = calculateSpellDC(actor);

  // Calculate direction vector from caster to target position
  const dx = targetPosition.x - actor.positions.x;
  const dy = targetPosition.y - actor.positions.y;
  const lineDistance = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction
  const lineDirX = lineDistance > 0 ? dx / lineDistance : 1;
  const lineDirY = lineDistance > 0 ? dy / lineDistance : 0;

  // Find all creatures in the line
  const targetsInLine = gameState.creatures.filter((creature) => {
    if (creature.id === actor.id) return false;

    const cdx = creature.positions.x - actor.positions.x;
    const cdy = creature.positions.y - actor.positions.y;
    const creatureDistance = Math.sqrt(cdx * cdx + cdy * cdy);

    // Must be within line range
    if (creatureDistance > lineRange) return false;

    // Check if creature is close to the line (within 0.5 squares perpendicular distance)
    if (creatureDistance > 0) {
      // Project creature position onto line direction
      const projection = (cdx * lineDirX + cdy * lineDirY);
      
      // Calculate perpendicular distance from line
      const perpX = cdx - projection * lineDirX;
      const perpY = cdy - projection * lineDirY;
      const perpDistance = Math.sqrt(perpX * perpX + perpY * perpY);
      
      // Must be within 0.5 squares of the line (line is 1 square wide)
      if (perpDistance > 0.5) return false;
      
      // Must be in the forward direction
      if (projection < 0) return false;
    }

    return true;
  });

  // Lightning Bolt damage: 4d12 at rank 3, +1d12 per rank above 3
  const baseDice = 4 + Math.max(0, heightenedRank - 3);
  const damageFormula = `${baseDice}d12`;

  if (targetsInLine.length === 0) {
    return {
      success: true,
      message: `ÔÜí ${actor.name} casts Lightning Bolt${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''}, but no creatures are caught in the line!`,
      heightenedRank,
      damageFormula,
    };
  }

  const baseDamageRoll = rollDamageFormula(damageFormula);
  const results: any[] = [];

  targetsInLine.forEach((target) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;

    // Basic save rules
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

  let message = `ÔÜí ${actor.name} casts Lightning Bolt${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamageRoll.total}`;
  results.forEach((r) => {
    message += `\n- ${r.targetName}: ${r.saveResult.toUpperCase()} ÔåÆ ${r.damage} damage${r.targetStatus}`;
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

export function resolveHeroism(ctx: SpellContext, actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 3): any {
  if (!targetId) {
    return fail('No target specified for Heroism!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Status bonus increases every 3 ranks: rank 3 = +1, rank 6 = +2, rank 9 = +3
  const statusBonus = 1 + Math.floor((heightenedRank - 3) / 3);

  // Apply heroism condition (status bonus to attacks, saves, and skills)
  // Duration: 10 minutes = 100 rounds
  if (!target.conditions) target.conditions = [];
  target.conditions.push({ 
    name: 'heroism', 
    duration: 100, // 10 minutes = 100 rounds
    value: statusBonus,
    source: `heroism-${actor.id}`,
  });

  let message = `­ƒª© ${actor.name} casts Heroism${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Ô£¿ ${target.name} gains **+${statusBonus} status bonus** to attack rolls, saves, and skill checks!`;

  return {
    success: true,
    message,
    targetHealth: target.currentHealth,
    statusBonus,
    heightenedRank,
  };
}

export function resolveTrueStrike(ctx: SpellContext, actor: Creature, gameState: GameState, heightenedRank: number = 1): any {
  // PF2e Remaster "Sure Strike": Roll next attack twice, take the better result (fortune effect)
  // Also ignores circumstance penalties to attack and flat checks for concealed/hidden
  if (!actor.conditions) actor.conditions = [];
  
  // Remove any existing sure-strike condition first (they don't stack)
  actor.conditions = actor.conditions.filter(c => c.name !== 'sure-strike');
  
  actor.conditions.push({ 
    name: 'sure-strike', 
    duration: 1, // Until end of turn
    value: 1, // Flag: roll twice, take higher
    source: `sure-strike-${actor.id}`,
  });

  let message = `­ƒÄ» ${actor.name} casts Sure Strike!\n`;
  message += `Ô£¿ ${actor.name}'s next attack this turn will be rolled twice, taking the better result! Also ignores concealment.`;

  return {
    success: true,
    message,
    heightenedRank,
  };
}

/**
 * Warp Step ÔÇö Psi Cantrip (Psychic / Psychic Dedication)
 * PF2e Remaster rules:
 *   Base: +5ft status bonus to Speed until end of turn, then Stride twice. (2 actions)
 *   Unbound Step conscious mind: +10ft status bonus instead of +5ft.
 *   Amp (costs 1 focus point): Cast as a single action instead of 2.
 *   Amp Heightened (4th): Can choose to teleport instead of Striding.
 *     Teleport range = 2├ù Speed (after status bonus). Gains teleportation trait.
 *     Teleportation does NOT trigger Reactive Strike.
 */
export function resolveWarpStep(ctx: SpellContext, 
  actor: Creature,
  gameState: GameState,
  heightenedRank: number = 1,
  targetPosition?: Position,
  amped: boolean = false
): any {
  if (!actor.conditions) actor.conditions = [];

  // ÔöÇÔöÇ Determine speed bonus ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Base Warp Step: +5ft status bonus to Speed
  // Unbound Step conscious mind: +10ft instead
  const hasUnboundStep = ctx.hasPsychicUnboundStep(actor);
  const speedBonusFeet = hasUnboundStep ? 10 : 5;

  // ÔöÇÔöÇ Amp: consume focus point for enhanced effect ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if (amped) {
    if (!ctx.consumeFocusPointForAmp(actor)) {
      return {
        success: false,
        message: `${actor.name} has no focus points to amp Warp Step!`,
      };
    }
  }

  // ÔöÇÔöÇ Amp Heightened (4th): Teleportation option ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // At heightened 4th+ AND amped, the caster can choose to teleport
  // Range = 2├ù Speed (after applying the status bonus from Warp Step)
  if (amped && heightenedRank >= 4 && targetPosition) {
    return resolveWarpStepTeleport(ctx, actor, gameState, speedBonusFeet, heightenedRank, targetPosition);
  }

  // If amped + heightened 4th but no target position, grant teleport-ready condition
  if (amped && heightenedRank >= 4) {
    const boostedSpeedFeet = (actor.speed ?? 25) + speedBonusFeet;
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

    let message = `Ô£¿ ${actor.name} casts Warp Step (Amped, Heightened ${heightenedRank})!\n`;
    message += `Ô£¿ +${speedBonusFeet}ft status bonus to Speed`;
    if (hasUnboundStep) message += ` (Unbound Step)`;
    message += `\nÔ£¿ ${actor.name} can teleport up to ${teleportRangeFeet}ft this turn! (No reactions triggered)`;

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

  // ÔöÇÔöÇ Standard effect: speed bonus + Stride twice (as movement) ÔöÇÔöÇ
  // PF2e: "You gain a +5-foot status bonus to your Speed, then Stride twice."
  // Implemented as a single movement to targetPosition with range = 2 ├ù boosted speed.
  if (!targetPosition) {
    return fail('No destination specified for Warp Step.');
  }

  // Immobilization check
  const immob = actor.conditions?.find(c =>
    ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name)
  );
  if (immob) {
    return fail(`${actor.name} cannot move while ${immob.name}!`, 'IMMOBILIZED');
  }

  const baseSpeedFeet = actor.speed ?? 25;
  const boostedSpeedFeet = baseSpeedFeet + speedBonusFeet;
  const maxDistanceSquares = (boostedSpeedFeet * 2) / 5; // 2 Strides at boosted speed

  // Validate bounds
  const mw = gameState.map?.width ?? 0;
  const mh = gameState.map?.height ?? 0;
  if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mw || targetPosition.y >= mh) {
    return fail('Destination is outside map bounds.', 'OUT_OF_BOUNDS');
  }

  // Validate destination not occupied
  const occupiedPositions = new Set<string>(
    gameState.creatures
      .filter(c => c.id !== actor.id && c.currentHealth > 0)
      .map(c => `${c.positions.x},${c.positions.y}`)
  );
  if (occupiedPositions.has(`${targetPosition.x},${targetPosition.y}`)) {
    return fail('Destination is occupied by another creature.', 'DESTINATION_OCCUPIED');
  }

  // Pathfind to destination respecting terrain
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
    return fail('No valid path to destination.', 'BLOCKED_PATH');
  }
  if (pathCost > maxDistanceSquares) {
    return {
      success: false,
      message: `Cannot move ${(pathCost * 5).toFixed(0)}ft ÔÇö Warp Step range is ${boostedSpeedFeet * 2}ft.`,
      errorCode: 'INSUFFICIENT_MOVEMENT',
    };
  }

  // Execute movement
  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = { x: targetPosition.x, y: targetPosition.y };
  ctx.cleanupStaleFlankingConditions(gameState);

  const distFeet = (pathCost * 5).toFixed(0);
  let message = `Ô£¿ ${actor.name} casts Warp Step`;
  if (amped) message += ` (Amped)`;
  message += `!\n`;
  message += `Ô£¿ +${speedBonusFeet}ft status bonus to Speed`;
  if (hasUnboundStep) message += ` (Unbound Step)`;
  message += `\n­ƒæú Strides ${distFeet}ft to (${targetPosition.x}, ${targetPosition.y})`;

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
    actionId: 'warp-step', // For engine to identify as Stride-like movement
  };
}

/**
 * Warp Step Teleportation ÔÇö Amp Heightened (4th)
 * PF2e: "You twist space so completely you don't need to travel the
 * interposing distance. You can choose to instead teleport to a space
 * within your line of sight and line of effect with a range equal to
 * double your Speed (after applying the status bonus from warp step).
 * This grants the spell the teleportation trait."
 *
 * Teleportation does NOT trigger Reactive Strike.
 * Ignores difficult terrain (no pathfinding needed).
 * Destination must not be occupied.
 * Must be within map bounds.
 */
export function resolveWarpStepTeleport(ctx: SpellContext, 
  actor: Creature,
  gameState: GameState,
  speedBonusFeet: number,
  heightenedRank: number,
  targetPosition: Position
): any {
  // ÔöÇÔöÇ Immobilization check ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

  // ÔöÇÔöÇ Calculate teleport range ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  // Range = 2├ù Speed (after the status bonus from Warp Step)
  const boostedSpeedFeet = (actor.speed ?? 25) + speedBonusFeet;
  const teleportRangeFeet = boostedSpeedFeet * 2;
  const teleportRangeSquares = teleportRangeFeet / 5;

  const distance = ctx.calculateDistance(actor.positions, targetPosition);

  if (distance > teleportRangeSquares) {
    return {
      success: false,
      message: `Cannot teleport ${(distance * 5).toFixed(0)}ft ÔÇö max range is ${teleportRangeFeet}ft.`,
      errorCode: 'OUT_OF_RANGE',
    };
  }

  // Validate destination within map bounds
  const mapWidth = gameState.map?.width ?? 0;
  const mapHeight = gameState.map?.height ?? 0;
  if (targetPosition.x < 0 || targetPosition.y < 0 ||
      targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
    return {
      success: false,
      message: `Cannot teleport to (${targetPosition.x}, ${targetPosition.y}) ÔÇö outside map bounds.`,
      errorCode: 'OUT_OF_BOUNDS',
    };
  }

  // Validate destination not occupied
  const occupied = gameState.creatures.some(c =>
    c.id !== actor.id &&
    c.currentHealth > 0 &&
    c.positions.x === targetPosition.x &&
    c.positions.y === targetPosition.y
  );
  if (occupied) {
    return {
      success: false,
      message: `Cannot teleport to (${targetPosition.x}, ${targetPosition.y}) ÔÇö occupied by another creature.`,
      errorCode: 'DESTINATION_OCCUPIED',
    };
  }

  // ÔöÇÔöÇ Execute teleportation ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const oldPos = { x: actor.positions.x, y: actor.positions.y };
  actor.positions = { x: targetPosition.x, y: targetPosition.y };

  // Flanking cleanup after teleport
  ctx.cleanupStaleFlankingConditions(gameState);

  const teleportDist = (distance * 5).toFixed(0);
  return {
    success: true,
    message: `Ô£¿ ${actor.name} casts Warp Step (Amped, Heightened ${heightenedRank})!\n` +
      `­ƒîÇ ${actor.name} teleports from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y}) [${teleportDist}ft]!\n` +
      `­ƒîÇ Teleportation ÔÇö no reactions triggered!`,
    heightenedRank,
    oldPosition: oldPos,
    newPosition: targetPosition,
    teleportDistance: distance,
    amped: true,
    isTeleport: true,
  };
}
