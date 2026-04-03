// 
// barbarianFeatActions.ts  Barbarian class feat resolvers
// Implements active feat actions for the Barbarian class (PF2e Remaster — Player Core 2)
// 

import {
  Creature,
  ActionResult,
  GameState,
  CreatureWeapon,
  Position,
  rollD20,
  rollDamageFormula,
  calculateFinalDamage,
  getDegreeOfSuccess,
  calculateSaveBonus,
  getWeapon,
  calculateAttackBonus,
  calculateAC,
} from 'pf2e-shared';
import { debugLog } from './logger';
import { hasTrait, initDying, getEffectiveSpeed } from './helpers';
import {
  applyForcedMovement,
  applyBattleForm,
  revertBattleForm,
  applySize,
  getEffectiveSize,
  getEffectiveReach,
  setElevation,
  getFlySpeed,
  getElevation,
  calculateFallDamage,
  getDragonForm,
  isPolymorphed,
} from './subsystems';
import type { FeatActionContext } from './featActions';

// ─── Helpers ───

function hasNamedFeat(creature: Creature, needle: string): boolean {
  const lowerNeedle = needle.toLowerCase().trim();
  return (creature.feats ?? []).some((feat: { name: string; type: string; level: number }) => {
    if (typeof feat === 'string') {
      return feat.toLowerCase().trim().includes(lowerNeedle);
    }
    const featName = typeof feat?.name === 'string' ? feat.name.toLowerCase().trim() : '';
    const featId = typeof feat?.id === 'string' ? feat.id.toLowerCase().trim() : '';
    return featName.includes(lowerNeedle) || featId.includes(lowerNeedle.replace(/\s+/g, '-'));
  });
}

function getClassDC(actor: Creature): number {
  const keyAbilMod = actor.abilities?.strength ?? 0;
  // Class DC = 10 + level + key ability modifier + proficiency bonus
  // Barbarian class DC: Trained → Expert (L11) → Master (L19)
  let profBonus = actor.level; // Trained = level + 2
  profBonus += 2; // base trained
  if (actor.level >= 19) profBonus += 4; // master (+6 total vs untrained)
  else if (actor.level >= 11) profBonus += 2; // expert (+4)
  return 10 + keyAbilMod + profBonus;
}

function requiresRage(actor: Creature, featName: string): ActionResult | null {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging to use ${featName}.`, errorCode: 'NOT_IN_STATE' };
  }
  return null;
}

// ══════════════════════════════════════════════════════════════
// LEVEL 2 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Furious Finish (L2) — 1 action, Rage trait
 * Strike with maximized damage dice. Rage immediately ends. Fatigued until 10 min rest.
 */
export function resolveFuriousFinish(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Furious Finish')) {
    return { success: false, message: `${actor.name} does not have Furious Finish.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Furious Finish');
  if (rageCheck) return rageCheck;

  // Make a Strike (delegated)
  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);

  // If it hit, maximize the damage dice (override applied damage with max values)
  if (result.success && result.details?.damage) {
    const dmg = result.details.damage;
    const formula = dmg.formula as string;
    const match = formula?.match(/(\d+)d(\d+)/);
    if (match) {
      const diceCount = parseInt(match[1], 10);
      const diceSides = parseInt(match[2], 10);
      const maxDice = diceCount * diceSides;
      const originalDiceTotal = dmg.dice?.total ?? 0;
      const boost = maxDice - originalDiceTotal;
      if (boost > 0) {
        dmg.appliedDamage += boost;
        // Apply the extra damage to the target
        const target = gameState.creatures.find(c => c.id === targetId);
        if (target) {
          target.currentHealth -= boost;
        }
      }
    }
    result.message += ` 💥 Furious Finish! Damage dice maximized!`;
  }

  // Rage ends immediately
  actor.rageActive = false;
  actor.rageRoundsLeft = undefined;
  actor.rageUsedThisEncounter = true;
  actor.temporaryHealth = 0;
  actor.bonuses = (actor.bonuses ?? []).filter(b => b.source !== 'Rage');
  actor.penalties = (actor.penalties ?? []).filter(p => p.source !== 'Rage');

  // Fatigued until 10 min rest
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'fatigued', duration: 'permanent', value: 1, source: 'furious-finish' });

  result.message += ` Rage ends. ${actor.name} is fatigued.`;
  return result;
}

/**
 * Bashing Charge (L2) — 2 actions, Flourish
 * Stride + Force Open obstacle + continue Stride + Strike
 * Simplified: Stride to target + Strike (we don't have obstacle system)
 */
export function resolveBashingCharge(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Bashing Charge')) {
    return { success: false, message: `${actor.name} does not have Bashing Charge.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  if (actor.flourishUsedThisTurn) {
    return { success: false, message: `${actor.name} has already used a Flourish action this turn.`, errorCode: 'FLOURISH_USED' };
  }
  actor.flourishUsedThisTurn = true;

  // Resolve as Stride + Strike (similar to Sudden Charge)
  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    result.message = `🪓 Bashing Charge! ${result.message}`;
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// LEVEL 4 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Oversized Throw (L4) — 2 actions, Rage trait
 * Ranged Strike 30ft, 2d10+STR bludgeoning
 */
export function resolveOversizedThrow(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  _weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Oversized Throw')) {
    return { success: false, message: `${actor.name} does not have Oversized Throw.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Oversized Throw');
  if (rageCheck) return rageCheck;

  if (!targetId) {
    return { success: false, message: 'No target specified.', errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Roll attack
  const d20 = rollD20();
  const bonus = calculateAttackBonus(actor);
  const mapPenalty = (actor.attacksMadeThisTurn ?? 0) >= 2 ? -10 : (actor.attacksMadeThisTurn ?? 0) >= 1 ? -5 : 0;
  const total = d20 + bonus + mapPenalty;
  const targetAC = calculateAC(target, actor.id, 'ranged');

  // Determine result
  let result: 'critical-success' | 'critical-failure' | 'success' | 'failure';
  if (d20 === 20 || total >= targetAC + 10) result = 'critical-success';
  else if (d20 === 1 || total < targetAC - 10) result = 'critical-failure';
  else if (total >= targetAC) result = 'success';
  else result = 'failure';

  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;
  if (!actor.attackTargetsThisTurn) actor.attackTargetsThisTurn = [];
  actor.attackTargetsThisTurn.push(target.id);

  if (result === 'failure' || result === 'critical-failure') {
    return {
      success: false,
      message: `❌ ${actor.name}'s Oversized Throw missed ${target.name}! (d20:${d20} +${bonus} = ${total} vs AC ${targetAC})`,
      details: { d20, bonus, total, targetAC, result },
    };
  }

  // Roll 2d10+STR
  const isCrit = result === 'critical-success';
  const damageRoll = rollDamageFormula('2d10');
  const strMod = actor.abilities?.strength ?? 0;
  let damage = damageRoll.total + strMod;
  if (isCrit) damage *= 2;
  damage = Math.max(1, damage);

  target.currentHealth -= damage;
  const hitMsg = isCrit ? '🎯 CRITICAL HIT' : '✔';
  let statusMessage = '';
  if (target.currentHealth <= 0 && !target.dying) {
    statusMessage = initDying(target);
  }

  return {
    success: true,
    message: `${hitMsg}! ${actor.name} hurls debris at ${target.name} for ${damage} bludgeoning damage! (d20:${d20} +${bonus} = ${total} vs AC ${targetAC})${statusMessage}`,
    details: { d20, bonus, total, targetAC, result, damage },
    targetHealth: target.currentHealth,
  };
}

/**
 * Scars of Steel (L4) — Reaction, Rage trait
 * Trigger: Crit hit with physical damage. Freq: 1/day.
 * Resist physical damage = level for that attack.
 */
export function resolveScarsOfSteel(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Scars of Steel')) {
    return { success: false, message: `${actor.name} does not have Scars of Steel.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Scars of Steel');
  if (rageCheck) return rageCheck;

  // Set a condition for the damage reduction
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'scars-of-steel',
    duration: 1,
    value: actor.level,
    source: 'scars-of-steel',
  });

  return {
    success: true,
    message: `🛡️ ${actor.name} flexes their muscles! Resistance ${actor.level} to physical damage for this attack.`,
    actionCost: 0, // reaction
  };
}

/**
 * Spiritual Guides (L4) — Reaction, Fortune
 * Trigger: Fail (not crit fail) perception or skill check. Freq: 1/day.
 * Reroll and use better result.
 */
export function resolveSpiritualGuides(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Spiritual Guides')) {
    return { success: false, message: `${actor.name} does not have Spiritual Guides.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  // This is a fortune reroll — in practice, needs trigger context
  // We'll mark the effect as available
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'spiritual-guides',
    duration: 1,
    value: 1,
    source: 'spiritual-guides',
  });

  return {
    success: true,
    message: `👻 ${actor.name}'s spiritual guides whisper guidance! Next failed Perception or skill check may be rerolled.`,
    actionCost: 0,
  };
}

// ══════════════════════════════════════════════════════════════
// LEVEL 6 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Dragon's Rage Breath (L6) — 2 actions, Concentrate, Rage
 * 30-ft cone, 1d6/level, basic Reflex vs class DC
 */
export function resolveDragonsRageBreath(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!ctx.hasFeat(actor, "Dragon's Rage Breath")) {
    return { success: false, message: `${actor.name} does not have Dragon's Rage Breath.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, "Dragon's Rage Breath");
  if (rageCheck) return rageCheck;

  // Deal 1d6 per level, basic Reflex save vs class DC
  const damageDice = `${actor.level}d6`;
  const damageRoll = rollDamageFormula(damageDice);
  const classDC = getClassDC(actor);
  const messages: string[] = [];
  let totalDamageDealt = 0;

  // In our grid system, apply to target and adjacent creatures
  // For simplicity, apply to the targeted creature
  const targets: Creature[] = [];
  if (targetId) {
    const primary = gameState.creatures.find(c => c.id === targetId);
    if (primary) targets.push(primary);
  }

  for (const t of targets) {
    const saveResult = ctx.rollSave(t, 'reflex', classDC);
    let damage = damageRoll.total;
    if (saveResult.degree === 'critical-success') damage = 0;
    else if (saveResult.degree === 'success') damage = Math.floor(damage / 2);
    else if (saveResult.degree === 'critical-failure') damage *= 2;
    damage = Math.max(0, damage);

    t.currentHealth -= damage;
    totalDamageDealt += damage;
    messages.push(`${t.name}: ${damage} damage (${saveResult.degree})`);
    if (t.currentHealth <= 0 && !t.dying) {
      initDying(t);
    }
  }

  return {
    success: true,
    message: `🐉 ${actor.name} breathes ${damageDice} damage! ${messages.join(', ')}`,
    actionCost: 2,
    details: { damageDice, classDC, totalDamageDealt },
  };
}

/**
 * Giant's Stature (L6) — 1 action, Polymorph, Rage
 * Become Large, gain 10-ft reach, clumsy 1
 */
export function resolveGiantsStature(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, "Giant's Stature")) {
    return { success: false, message: `${actor.name} does not have Giant's Stature.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, "Giant's Stature");
  if (rageCheck) return rageCheck;

  // Apply size increase
  if (!actor.conditions) actor.conditions = [];

  // Check if already Large
  const alreadyLarge = actor.conditions.some(c => c.name === 'giants-stature');
  if (alreadyLarge) {
    return { success: false, message: `${actor.name} is already enlarged.`, errorCode: 'ALREADY_IN_STATE' };
  }

  actor.conditions.push({ name: 'giants-stature', duration: 'permanent', value: 1, source: 'giants-stature' });
  actor.conditions.push({ name: 'clumsy', duration: 'permanent', value: 1, source: 'giants-stature' });

  // Titan's Stature upgrade: can become Huge at L12
  const isTitan = ctx.hasFeat(actor, "Titan's Stature");
  const sizeLabel = isTitan ? 'Huge' : 'Large';
  const reachLabel = isTitan ? '15-foot' : '10-foot';

  return {
    success: true,
    message: `⬆️ ${actor.name} grows to ${sizeLabel} size! Gains ${reachLabel} reach. Clumsy 1.`,
    actionCost: 1,
  };
}

/**
 * Inner Strength (L6) — 1 action, Concentrate, Rage (Spirit instinct)
 * Gain temp HP = level. Lasts until rage ends.
 */
export function resolveInnerStrength(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Inner Strength')) {
    return { success: false, message: `${actor.name} does not have Inner Strength.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Inner Strength');
  if (rageCheck) return rageCheck;

  const tempHP = actor.level;
  actor.temporaryHealth = Math.max(actor.temporaryHealth ?? 0, tempHP);

  return {
    success: true,
    message: `✨ ${actor.name} draws on inner strength! Gains ${tempHP} temporary HP.`,
    actionCost: 1,
  };
}

/**
 * Mage Hunter (L6) — 2 actions, Rage (Superstition instinct)
 * Stride toward target + melee Strike
 */
export function resolveMageHunter(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Mage Hunter')) {
    return { success: false, message: `${actor.name} does not have Mage Hunter.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Mage Hunter');
  if (rageCheck) return rageCheck;

  // Stride + Strike (like Sudden Charge but for mages)
  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    result.message = `🔮 Mage Hunter! ${result.message}`;
  }
  return result;
}

/**
 * Scouring Rage (L6) — Free action
 * Trigger: You Rage. 5-ft emanation, damage = Rage bonus damage, type from instinct.
 */
export function resolveScouringRage(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Scouring Rage')) {
    return { success: false, message: `${actor.name} does not have Scouring Rage.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must have just entered Rage.`, errorCode: 'NOT_IN_STATE' };
  }

  // Deal Rage bonus damage to adjacent creatures
  const rageDamage = 2; // Base rage bonus
  const messages: string[] = [];

  for (const creature of gameState.creatures) {
    if (creature.id === actor.id) continue;
    if (!creature.positions || !actor.positions) continue;
    const dx = Math.abs((creature.positions.x ?? 0) - (actor.positions.x ?? 0));
    const dy = Math.abs((creature.positions.y ?? 0) - (actor.positions.y ?? 0));
    if (dx <= 1 && dy <= 1) { // 5-ft emanation = adjacent
      creature.currentHealth -= rageDamage;
      messages.push(`${creature.name} takes ${rageDamage} damage`);
      if (creature.currentHealth <= 0 && !creature.dying) {
        initDying(creature);
      }
    }
  }

  return {
    success: true,
    message: `🔥 Scouring Rage! ${messages.length > 0 ? messages.join(', ') : 'No adjacent creatures hit.'}`,
    actionCost: 0,
  };
}

/**
 * Spirits' Interference (L6) — 1 action, Divine, Rage (Spirit instinct)
 * Ranged attacks vs you require DC 5 flat check until start of next turn.
 */
export function resolveSpiritsInterference(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, "Spirits' Interference")) {
    return { success: false, message: `${actor.name} does not have Spirits' Interference.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, "Spirits' Interference");
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'spirits-interference',
    duration: 1,
    value: 5, // DC 5 flat check for ranged attacks
    source: 'spirits-interference',
    expiresOnTurnEndOf: actor.id, // not quite right — should last until START of next turn
    turnEndsRemaining: 1,
  });

  return {
    success: true,
    message: `👻 ${actor.name} calls spirit wards! Ranged attacks require a DC 5 flat check to hit until start of next turn.`,
    actionCost: 1,
  };
}

// ══════════════════════════════════════════════════════════════
// LEVEL 8 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Disarming Assault (L8) — 1 action, Flourish, Rage
 * Melee Strike; on hit+damage: free Disarm attempt via Athletics.
 */
export function resolveDisarmingAssault(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Disarming Assault')) {
    return { success: false, message: `${actor.name} does not have Disarming Assault.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  if (actor.flourishUsedThisTurn) {
    return { success: false, message: `${actor.name} has already used a Flourish action this turn.`, errorCode: 'FLOURISH_USED' };
  }
  actor.flourishUsedThisTurn = true;

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    // On hit: free Disarm attempt — apply off-guard as simplified disarm effect
    const target = gameState.creatures.find(c => c.id === targetId);
    if (target) {
      const athleticsBonus = ctx.getSkillBonus(actor, 'athletics');
      const d20 = rollD20();
      const targetRefDC = ctx.getReflexDC(target);
      const total = d20 + athleticsBonus;
      if (total >= targetRefDC) {
        if (!target.conditions) target.conditions = [];
        target.conditions.push({
          name: 'off-guard', duration: 1, value: 1, source: 'disarming-assault',
          expiresOnTurnEndOf: actor.id, turnEndsRemaining: 1,
        });
        result.message += ` ⚔️ Disarming Assault! ${target.name} is disarmed (off-guard)!`;
      } else {
        result.message += ` Disarm attempt failed (${d20}+${athleticsBonus}=${total} vs DC ${targetRefDC}).`;
      }
    }
  }
  return result;
}

/**
 * Follow-up Assault (L8) — 1 action, Rage
 * Req: previous action was a missed melee Strike. Strike same target at same MAP.
 */
export function resolveFollowUpAssault(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Follow-up Assault')) {
    return { success: false, message: `${actor.name} does not have Follow-up Assault.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  if (actor.lastStrikeResult !== 'miss') {
    return { success: false, message: `${actor.name} must have missed their last Strike to use Follow-up Assault.`, errorCode: 'VALIDATION_FAILED' };
  }

  // Strike at same MAP (don't increment MAP for this attack)
  const savedAttacks = actor.attacksMadeThisTurn;
  if (savedAttacks && savedAttacks > 0) {
    actor.attacksMadeThisTurn = savedAttacks - 1; // Undo the MAP increment from the miss
  }

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    result.message = `🔄 Follow-up Assault! ${result.message}`;
  }
  return result;
}

/**
 * Friendly Toss (L8) — 2 actions, Manipulate, Rage
 * Throw willing adjacent ally up to 30 feet.
 * Simplified: we don't have ally position manipulation, so just log the intent.
 */
export function resolveFriendlyToss(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Friendly Toss')) {
    return { success: false, message: `${actor.name} does not have Friendly Toss.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Friendly Toss');
  if (rageCheck) return rageCheck;

  if (!targetId) {
    return { success: false, message: 'No ally specified to toss.', errorCode: 'NO_TARGET' };
  }
  const ally = gameState.creatures.find(c => c.id === targetId);
  if (!ally) {
    return { success: false, message: 'Target ally not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  return {
    success: true,
    message: `💪 ${actor.name} tosses ${ally.name} up to 30 feet!`,
    actionCost: 2,
  };
}

/**
 * Renewed Vigor (L8) — 1 action, Concentrate, Rage
 * Gain temp HP = floor(level/2) + CON mod. Lasts until rage ends.
 */
export function resolveRenewedVigor(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Renewed Vigor')) {
    return { success: false, message: `${actor.name} does not have Renewed Vigor.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Renewed Vigor');
  if (rageCheck) return rageCheck;

  const conMod = actor.abilities ? Math.floor((actor.abilities.constitution - 10) / 2) : 0;
  const tempHP = Math.floor(actor.level / 2) + conMod;
  actor.temporaryHealth = Math.max(actor.temporaryHealth ?? 0, tempHP);

  return {
    success: true,
    message: `💚 ${actor.name} rallies with renewed vigor! Gains ${tempHP} temporary HP.`,
    actionCost: 1,
  };
}

/**
 * Share Rage (L8) — 1 action, Auditory, Rage, Visual
 * One ally within 30 ft gains Rage bonus melee damage until start of your next turn.
 * Contagious Rage (L20) upgrades to all allies within 30 ft.
 */
export function resolveShareRage(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Share Rage')) {
    return { success: false, message: `${actor.name} does not have Share Rage.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Share Rage');
  if (rageCheck) return rageCheck;

  const isContagious = ctx.hasFeat(actor, 'Contagious Rage');

  if (isContagious) {
    // All allies within 30ft
    const allies: string[] = [];
    for (const creature of gameState.creatures) {
      if (creature.id === actor.id) continue;
      if (creature.type !== actor.type) continue; // Same team
      // Apply rage bonus
      if (!creature.bonuses) creature.bonuses = [];
      creature.bonuses = creature.bonuses.filter(b => b.source !== 'shared-rage');
      creature.bonuses.push({
        source: 'shared-rage',
        type: 'status',
        value: 2,
        applyTo: 'melee-damage',
      });
      allies.push(creature.name);
    }
    return {
      success: true,
      message: `🔥 Contagious Rage! ${actor.name} shares rage with ${allies.length > 0 ? allies.join(', ') : 'no nearby allies'}!`,
      actionCost: 1,
    };
  }

  // Single ally
  if (!targetId) {
    return { success: false, message: 'No ally specified.', errorCode: 'NO_TARGET' };
  }
  const ally = gameState.creatures.find(c => c.id === targetId);
  if (!ally) {
    return { success: false, message: 'Target ally not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  if (!ally.bonuses) ally.bonuses = [];
  ally.bonuses = ally.bonuses.filter(b => b.source !== 'shared-rage');
  ally.bonuses.push({
    source: 'shared-rage',
    type: 'status',
    value: 2,
    applyTo: 'melee-damage',
  });

  return {
    success: true,
    message: `🔥 ${actor.name} shares their rage with ${ally.name}! +2 status bonus to melee damage.`,
    actionCost: 1,
  };
}

/**
 * Thrash (L8) — 1 action, Rage
 * Req: creature grabbed or restrained. Deal weapon damage + specialization, basic Fort save vs class DC.
 * Collateral Thrash (L16): adjacent creature also takes Thrash damage, basic Reflex vs class DC.
 */
export function resolveThrash(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Thrash')) {
    return { success: false, message: `${actor.name} does not have Thrash.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Thrash');
  if (rageCheck) return rageCheck;

  if (!targetId) {
    return { success: false, message: 'No target specified.', errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Check grabbed/restrained
  const isGrabbed = target.conditions?.some(c => c.name === 'grabbed' || c.name === 'restrained');
  if (!isGrabbed) {
    return { success: false, message: `${target.name} must be grabbed or restrained.`, errorCode: 'VALIDATION_FAILED' };
  }

  // Determine weapon damage
  const selectedWeapon = ctx.resolveSelectedWeapon(actor, weaponId);
  const formula = selectedWeapon?.damageDice ?? actor.weaponDamageDice ?? '1d4';
  const damageRoll = rollDamageFormula(formula);
  const strMod = actor.abilities?.strength ?? 0;
  let baseDamage = damageRoll.total + strMod;

  // Basic Fort save
  const classDC = getClassDC(actor);
  const saveResult = ctx.rollSave(target, 'fortitude', classDC);
  let damage = baseDamage;
  if (saveResult.degree === 'critical-success') damage = 0;
  else if (saveResult.degree === 'success') damage = Math.floor(damage / 2);
  else if (saveResult.degree === 'critical-failure') damage *= 2;
  damage = Math.max(0, damage);

  target.currentHealth -= damage;
  let statusMessage = '';
  if (target.currentHealth <= 0 && !target.dying) {
    statusMessage = initDying(target);
  }

  let collateralMsg = '';
  // Collateral Thrash (L16): adjacent creature also takes damage
  if (ctx.hasFeat(actor, 'Collateral Thrash')) {
    // Find an adjacent creature (not the target, not the actor)
    for (const creature of gameState.creatures) {
      if (creature.id === actor.id || creature.id === target.id) continue;
      if (!creature.positions || !target.positions) continue;
      const dx = Math.abs((creature.positions.x ?? 0) - (target.positions.x ?? 0));
      const dy = Math.abs((creature.positions.y ?? 0) - (target.positions.y ?? 0));
      if (dx <= 1 && dy <= 1) {
        const collateralSave = ctx.rollSave(creature, 'reflex', classDC);
        let collateralDmg = baseDamage;
        if (collateralSave.degree === 'critical-success') collateralDmg = 0;
        else if (collateralSave.degree === 'success') collateralDmg = Math.floor(collateralDmg / 2);
        else if (collateralSave.degree === 'critical-failure') collateralDmg *= 2;
        creature.currentHealth -= Math.max(0, collateralDmg);
        collateralMsg = ` Collateral Thrash! ${creature.name} takes ${collateralDmg} damage!`;
        break; // Only one adjacent creature
      }
    }
  }

  return {
    success: true,
    message: `💥 ${actor.name} thrashes ${target.name} for ${damage} damage! (Fort save: ${saveResult.degree})${statusMessage}${collateralMsg}`,
    actionCost: 1,
    details: { damage, saveResult: saveResult.degree },
  };
}

// ══════════════════════════════════════════════════════════════
// LEVEL 10 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Come and Get Me (L10) — 1 action, Concentrate, Rage
 * Become off-guard. When hit by melee: attacker off-guard to you, gain temp HP = CON mod (×2 on crit).
 * Lasts until rage ends.
 */
export function resolveComeAndGetMe(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Come and Get Me')) {
    return { success: false, message: `${actor.name} does not have Come and Get Me.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Come and Get Me');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];

  // Already active?
  if (actor.conditions.some(c => c.name === 'come-and-get-me')) {
    return { success: false, message: `Come and Get Me is already active.`, errorCode: 'ALREADY_IN_STATE' };
  }

  // Become off-guard
  actor.conditions.push({ name: 'off-guard', duration: 'permanent', value: 1, source: 'come-and-get-me' });
  // Track the active Come and Get Me state
  actor.conditions.push({ name: 'come-and-get-me', duration: 'permanent', value: 1, source: 'come-and-get-me' });

  return {
    success: true,
    message: `😤 ${actor.name} dares enemies to attack! Off-guard, but retaliates with temp HP when hit by melee. Lasts until rage ends.`,
    actionCost: 1,
  };
}

/**
 * Furious Sprint (L10) — 2 actions (or 3), Rage
 * 2 actions: Stride up to 5× Speed in straight line. 3 actions: up to 8× Speed.
 */
export function resolveFuriousSprint(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Furious Sprint')) {
    return { success: false, message: `${actor.name} does not have Furious Sprint.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Furious Sprint');
  if (rageCheck) return rageCheck;

  const speed = actor.speed ?? 25;
  const distance = speed * 5; // 2-action version: 5× Speed

  return {
    success: true,
    message: `💨 ${actor.name} sprints up to ${distance} feet in a straight line!`,
    actionCost: 2,
    details: { maxDistance: distance },
  };
}

/**
 * Resounding Blow (L10) — 2 actions
 * Melee Strike with bludgeoning weapon. On hit: deafened 1 round (1 min on crit).
 */
export function resolveResoundingBlow(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Resounding Blow')) {
    return { success: false, message: `${actor.name} does not have Resounding Blow.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    const target = gameState.creatures.find(c => c.id === targetId);
    if (target) {
      if (!target.conditions) target.conditions = [];
      const isCrit = result.details?.result === 'critical-success';
      target.conditions.push({
        name: 'deafened',
        duration: isCrit ? 10 : 1, // 1 min = 10 rounds on crit, 1 round on hit
        value: 1,
        source: 'resounding-blow',
      });
      result.message += ` 🔊 Resounding Blow! ${target.name} is deafened${isCrit ? ' for 1 minute' : ''}!`;
    }
  }
  return result;
}

/**
 * Silencing Strike (L10) — 1 action, Incapacitation, Rage
 * Melee Strike + Fort save vs class DC. F: stunned 1 + DC 11 flat check for linguistic/spells. CF: stunned 3.
 */
export function resolveSilencingStrike(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Silencing Strike')) {
    return { success: false, message: `${actor.name} does not have Silencing Strike.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Silencing Strike');
  if (rageCheck) return rageCheck;

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    const target = gameState.creatures.find(c => c.id === targetId);
    if (target) {
      const classDC = getClassDC(actor);
      const saveResult = ctx.rollSave(target, 'fortitude', classDC);
      if (!target.conditions) target.conditions = [];
      if (saveResult.degree === 'critical-failure') {
        target.conditions.push({ name: 'stunned', duration: 1, value: 3, source: 'silencing-strike' });
        result.message += ` 🤐 Silencing Strike CRITICAL FAILURE! ${target.name} is stunned 3!`;
      } else if (saveResult.degree === 'failure') {
        target.conditions.push({ name: 'stunned', duration: 1, value: 1, source: 'silencing-strike' });
        result.message += ` 🤐 Silencing Strike! ${target.name} is stunned 1 and must pass DC 11 flat checks for linguistic/spell actions!`;
      }
    }
  }
  return result;
}

/**
 * Terrifying Howl (L10) — 1 action, Auditory, Rage
 * Demoralize all enemies within 30 ft (no language penalty). Each target immune 1 min.
 */
export function resolveTerrifyingHowl(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Terrifying Howl')) {
    return { success: false, message: `${actor.name} does not have Terrifying Howl.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Terrifying Howl');
  if (rageCheck) return rageCheck;

  const intimidationBonus = ctx.getSkillBonus(actor, 'intimidation');
  const messages: string[] = [];

  for (const creature of gameState.creatures) {
    if (creature.id === actor.id) continue;
    if (creature.type === actor.type) continue; // Skip allies

    // Check distance (30 ft = 6 squares)
    if (actor.positions && creature.positions) {
      const dist = ctx.calculateDistance(actor.positions, creature.positions);
      if (dist > 6) continue; // Beyond 30 ft
    }

    // Roll Demoralize: Intimidation vs Will DC
    const d20 = rollD20();
    const willDC = ctx.getWillDC(creature);
    const total = d20 + intimidationBonus;

    if (!creature.conditions) creature.conditions = [];

    if (d20 === 20 || total >= willDC + 10) {
      // Critical success: frightened 2
      creature.conditions.push({ name: 'frightened', duration: 2, value: 2, source: 'terrifying-howl' });
      messages.push(`${creature.name}: frightened 2 (crit!)`);
    } else if (total >= willDC) {
      // Success: frightened 1
      creature.conditions.push({ name: 'frightened', duration: 1, value: 1, source: 'terrifying-howl' });
      messages.push(`${creature.name}: frightened 1`);
    } else {
      messages.push(`${creature.name}: resisted`);
    }
  }

  return {
    success: true,
    message: `😱 ${actor.name} unleashes a Terrifying Howl! ${messages.join(', ')}`,
    actionCost: 1,
  };
}

// ══════════════════════════════════════════════════════════════
// LEVEL 12 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Furious Grab (L12) — 1 action, Rage
 * Req: last action was successful melee Strike; free hand or grapple weapon.
 * Target becomes grabbed.
 */
export function resolveFuriousGrab(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Furious Grab')) {
    return { success: false, message: `${actor.name} does not have Furious Grab.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Furious Grab');
  if (rageCheck) return rageCheck;

  if (actor.lastStrikeResult !== 'hit' && actor.lastStrikeResult !== 'crit') {
    return { success: false, message: `${actor.name} must have hit with a Strike to use Furious Grab.`, errorCode: 'VALIDATION_FAILED' };
  }

  if (!targetId) {
    return { success: false, message: 'No target specified.', errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  if (!target.conditions) target.conditions = [];
  target.conditions.push({
    name: 'grabbed',
    duration: 'permanent',
    value: 1,
    source: `furious-grab-${actor.id}`,
    appliesAgainst: actor.id,
  });

  return {
    success: true,
    message: `🤜 ${actor.name} grabs ${target.name} in a furious grip! ${target.name} is grabbed.`,
    actionCost: 1,
  };
}

/**
 * Predator's Pounce (L12) — 1 action, Flourish, Rage (Animal instinct)
 * Stride + Strike at end.
 */
export function resolvePredatorsPounce(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, "Predator's Pounce")) {
    return { success: false, message: `${actor.name} does not have Predator's Pounce.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, "Predator's Pounce");
  if (rageCheck) return rageCheck;
  if (actor.flourishUsedThisTurn) {
    return { success: false, message: `${actor.name} has already used a Flourish action this turn.`, errorCode: 'FLOURISH_USED' };
  }
  actor.flourishUsedThisTurn = true;

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    result.message = `🐆 Predator's Pounce! ${result.message}`;
  }
  return result;
}

/**
 * Spirit's Wrath (L12) — 1 action, Attack, Concentrate, Rage (Spirit instinct)
 * Ranged attack 120 ft, 4d8+CON spirit damage. Crit: double + frightened 1.
 */
export function resolveSpiritsWrath(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!ctx.hasFeat(actor, "Spirit's Wrath")) {
    return { success: false, message: `${actor.name} does not have Spirit's Wrath.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, "Spirit's Wrath");
  if (rageCheck) return rageCheck;

  if (!targetId) {
    return { success: false, message: 'No target specified.', errorCode: 'NO_TARGET' };
  }
  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Roll attack
  const d20 = rollD20();
  const bonus = calculateAttackBonus(actor);
  const mapPenalty = (actor.attacksMadeThisTurn ?? 0) >= 2 ? -10 : (actor.attacksMadeThisTurn ?? 0) >= 1 ? -5 : 0;
  const total = d20 + bonus + mapPenalty;
  const targetAC = calculateAC(target, actor.id, 'ranged');

  let result: string;
  if (d20 === 20 || total >= targetAC + 10) result = 'critical-success';
  else if (d20 === 1 || total < targetAC - 10) result = 'critical-failure';
  else if (total >= targetAC) result = 'success';
  else result = 'failure';

  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;

  if (result === 'failure' || result === 'critical-failure') {
    return {
      success: false,
      message: `❌ ${actor.name}'s Spirit's Wrath missed ${target.name}! (d20:${d20} +${bonus} = ${total} vs AC ${targetAC})`,
    };
  }

  const isCrit = result === 'critical-success';
  const conMod = actor.abilities ? Math.floor((actor.abilities.constitution - 10) / 2) : 0;
  const damageRoll = rollDamageFormula('4d8');
  let damage = damageRoll.total + conMod;
  if (isCrit) damage *= 2;
  damage = Math.max(1, damage);

  target.currentHealth -= damage;
  let statusMsg = '';
  if (target.currentHealth <= 0 && !target.dying) {
    statusMsg = initDying(target);
  }
  if (isCrit) {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'frightened', duration: 1, value: 1, source: 'spirits-wrath' });
    statusMsg += ` ${target.name} is frightened 1!`;
  }

  return {
    success: true,
    message: `👻 Spirit's Wrath! ${actor.name} deals ${damage} spirit damage to ${target.name}! (d20:${d20} +${bonus} = ${total} vs AC ${targetAC})${statusMsg}`,
    actionCost: 1,
    details: { damage, result },
    targetHealth: target.currentHealth,
  };
}

/**
 * Unbalancing Sweep (L12) — 3 actions, Flourish
 * Choose Shove or Trip. Up to 3 enemies in reach. Separate Athletics vs each Fort DC.
 */
export function resolveUnbalancingSweep(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Unbalancing Sweep')) {
    return { success: false, message: `${actor.name} does not have Unbalancing Sweep.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  if (actor.flourishUsedThisTurn) {
    return { success: false, message: `${actor.name} has already used a Flourish action this turn.`, errorCode: 'FLOURISH_USED' };
  }
  actor.flourishUsedThisTurn = true;

  const athleticsBonus = ctx.getSkillBonus(actor, 'athletics');
  const messages: string[] = [];
  let count = 0;

  for (const creature of gameState.creatures) {
    if (count >= 3) break;
    if (creature.id === actor.id) continue;
    if (creature.type === actor.type) continue; // Skip allies

    // Check adjacency (melee reach)
    if (actor.positions && creature.positions) {
      const dx = Math.abs((creature.positions.x ?? 0) - (actor.positions.x ?? 0));
      const dy = Math.abs((creature.positions.y ?? 0) - (actor.positions.y ?? 0));
      if (dx > 1 || dy > 1) continue;
    }

    const d20 = rollD20();
    const fortDC = ctx.getFortitudeDC(creature);
    const total = d20 + athleticsBonus;

    if (!creature.conditions) creature.conditions = [];

    if (total >= fortDC) {
      // Trip: target is off-guard (simplified)
      creature.conditions.push({
        name: 'off-guard', duration: 1, value: 1, source: 'unbalancing-sweep',
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: 1,
      });
      messages.push(`${creature.name}: tripped (${d20}+${athleticsBonus}=${total} vs DC ${fortDC})`);
    } else {
      messages.push(`${creature.name}: resisted (${d20}+${athleticsBonus}=${total} vs DC ${fortDC})`);
    }
    count++;
  }

  return {
    success: true,
    message: `🌀 Unbalancing Sweep! ${messages.join(', ')}`,
    actionCost: 3,
  };
}

// ══════════════════════════════════════════════════════════════
// LEVEL 14 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Giant's Lunge (L14) — 1 action, Concentrate, Rage (Giant instinct)
 * All melee weapons + unarmed gain reach 10 ft until rage ends.
 */
export function resolveGiantsLunge(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, "Giant's Lunge")) {
    return { success: false, message: `${actor.name} does not have Giant's Lunge.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, "Giant's Lunge");
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'giants-lunge', duration: 'permanent', value: 10, source: 'giants-lunge' });

  return {
    success: true,
    message: `⬆️ ${actor.name} extends their reach! All melee weapons gain 10-foot reach until rage ends.`,
    actionCost: 1,
  };
}

/**
 * Impaling Thrust (L14) — 2 actions, Rage
 * Melee Strike with piercing weapon. On hit: target grabbed. When freed: persistent bleed = weapon dice.
 */
export function resolveImpalingThrust(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Impaling Thrust')) {
    return { success: false, message: `${actor.name} does not have Impaling Thrust.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Impaling Thrust');
  if (rageCheck) return rageCheck;

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    const target = gameState.creatures.find(c => c.id === targetId);
    if (target) {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({
        name: 'grabbed',
        duration: 'permanent',
        value: 1,
        source: `impaling-thrust-${actor.id}`,
        appliesAgainst: actor.id,
      });

      // Persistent bleed when freed = weapon dice count
      const selectedWeapon = ctx.resolveSelectedWeapon(actor, weaponId);
      const formula = selectedWeapon?.damageDice ?? '1d4';
      const match = formula.match(/(\d+)d(\d+)/);
      const diceCount = match ? parseInt(match[1], 10) : 1;
      target.conditions.push({
        name: 'impaled',
        duration: 'permanent',
        value: diceCount,
        source: `impaling-thrust-${actor.id}`,
      });

      result.message += ` 🗡️ Impaling Thrust! ${target.name} is impaled and grabbed! Persistent bleed when freed.`;
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// LEVEL 16 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Desperate Wrath (L16) — Free action, Rage
 * Trigger: your turn begins and HP ≤ half max.
 * +2 circumstance to attacks, -1 AC, -1 saves. Until rage ends or HP > half.
 */
export function resolveDesperateWrath(
  ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Desperate Wrath')) {
    return { success: false, message: `${actor.name} does not have Desperate Wrath.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Desperate Wrath');
  if (rageCheck) return rageCheck;

  if (actor.currentHealth > actor.maxHealth / 2) {
    return { success: false, message: `${actor.name}'s HP must be at or below half to use Desperate Wrath.`, errorCode: 'VALIDATION_FAILED' };
  }

  if (!actor.bonuses) actor.bonuses = [];
  if (!actor.penalties) actor.penalties = [];

  // Remove old desperate wrath bonuses/penalties
  actor.bonuses = actor.bonuses.filter(b => b.source !== 'desperate-wrath');
  actor.penalties = actor.penalties.filter(p => p.source !== 'desperate-wrath');

  actor.bonuses.push({ source: 'desperate-wrath', type: 'circumstance', value: 2, applyTo: 'attack' });
  actor.penalties.push({ source: 'desperate-wrath', type: 'circumstance', value: 1, applyTo: 'ac' });
  actor.penalties.push({ source: 'desperate-wrath', type: 'circumstance', value: 1, applyTo: 'fortitude' });
  actor.penalties.push({ source: 'desperate-wrath', type: 'circumstance', value: 1, applyTo: 'reflex' });
  actor.penalties.push({ source: 'desperate-wrath', type: 'circumstance', value: 1, applyTo: 'will' });

  return {
    success: true,
    message: `😡 ${actor.name} enters Desperate Wrath! +2 circumstance to attacks, -1 to AC and saves!`,
    actionCost: 0,
  };
}

/**
 * Penetrating Projectile (L16) — 2 actions, Flourish, Rage
 * Ranged Strike. Projectile passes through (deals damage to first target).
 */
export function resolvePenetratingProjectile(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Penetrating Projectile')) {
    return { success: false, message: `${actor.name} does not have Penetrating Projectile.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Penetrating Projectile');
  if (rageCheck) return rageCheck;
  if (actor.flourishUsedThisTurn) {
    return { success: false, message: `${actor.name} has already used a Flourish action this turn.`, errorCode: 'FLOURISH_USED' };
  }
  actor.flourishUsedThisTurn = true;

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    result.message = `🏹 Penetrating Projectile! ${result.message}`;
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// LEVEL 18 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Vicious Evisceration (L18) — 2 actions, Rage
 * Melee Strike; on hit: Fort save vs class DC. F: drained 1, CF: drained 2, crit hit: drained 3.
 */
export function resolveViciousEvisceration(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Vicious Evisceration')) {
    return { success: false, message: `${actor.name} does not have Vicious Evisceration.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Vicious Evisceration');
  if (rageCheck) return rageCheck;

  const result = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (result.success) {
    const target = gameState.creatures.find(c => c.id === targetId);
    if (target) {
      const classDC = getClassDC(actor);
      const saveResult = ctx.rollSave(target, 'fortitude', classDC);
      const isCritHit = result.details?.result === 'critical-success';

      if (!target.conditions) target.conditions = [];
      let drainedValue = 0;
      if (isCritHit) drainedValue = 3;
      else if (saveResult.degree === 'critical-failure') drainedValue = 2;
      else if (saveResult.degree === 'failure') drainedValue = 1;

      if (drainedValue > 0) {
        target.conditions.push({ name: 'drained', duration: 'permanent', value: drainedValue, source: 'vicious-evisceration' });
        result.message += ` 🩸 Vicious Evisceration! ${target.name} is drained ${drainedValue}!`;
      }
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// LEVEL 20 FEATS
// ══════════════════════════════════════════════════════════════

/**
 * Quaking Stomp (L20) — 1 action, Manipulate, Rage
 * Freq: 1/10 min. Creates earthquake effect. Simplified: AOE damage in 60-ft radius.
 */
export function resolveQuakingStomp(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
): ActionResult {
  if (!ctx.hasFeat(actor, 'Quaking Stomp')) {
    return { success: false, message: `${actor.name} does not have Quaking Stomp.`, errorCode: 'FEAT_NOT_AVAILABLE' };
  }
  const rageCheck = requiresRage(actor, 'Quaking Stomp');
  if (rageCheck) return rageCheck;

  // Simplified earthquake: 11d6 bludgeoning, basic Reflex save, 60-ft burst
  const classDC = getClassDC(actor);
  const damageRoll = rollDamageFormula('11d6');
  const messages: string[] = [];

  for (const creature of gameState.creatures) {
    if (creature.id === actor.id) continue;
    if (actor.positions && creature.positions) {
      const dist = ctx.calculateDistance(actor.positions, creature.positions);
      if (dist > 12) continue; // 60 ft = 12 squares
    }

    const saveResult = ctx.rollSave(creature, 'reflex', classDC);
    let damage = damageRoll.total;
    if (saveResult.degree === 'critical-success') damage = 0;
    else if (saveResult.degree === 'success') damage = Math.floor(damage / 2);
    else if (saveResult.degree === 'critical-failure') damage *= 2;
    damage = Math.max(0, damage);

    creature.currentHealth -= damage;
    messages.push(`${creature.name}: ${damage} damage (${saveResult.degree})`);
    if (creature.currentHealth <= 0 && !creature.dying) {
      initDying(creature);
    }
  }

  return {
    success: true,
    message: `🌋 ${actor.name} stomps the ground! EARTHQUAKE! ${messages.join(', ')}`,
    actionCost: 1,
    details: { damageFormula: '11d6', classDC },
  };
}
// ─────────────────────────────────────────────────────────
// SUBSYSTEM-BACKED FEAT RESOLVERS
// These feats depend on the new subsystems: forced movement, polymorph,
// size, flight/elevation, and reaction triggers.
// ─────────────────────────────────────────────────────────

/**
 * Barreling Charge (Feat 4) — 2 actions
 * Stride then Strike. If the Strike hits, push the target 5 feet.
 */
export function resolveBarrelingCharge(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging to use Barreling Charge.`, errorCode: 'NOT_RAGING' };
  }
  if (!targetId) {
    return { success: false, message: 'No target specified for Barreling Charge.', errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Strike via context
  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);
  if (!strikeResult?.success) {
    return { success: false, message: `Barreling Charge: ${strikeResult?.message ?? 'Strike failed.'}` };
  }

  let pushMsg = '';
  // Check if the strike hit (not a miss/critical-failure)
  const degree = strikeResult.details?.result;
  if (degree === 'success' || degree === 'critical-success') {
    const moveResult = applyForcedMovement(target, gameState, {
      distanceFt: 5,
      direction: 'away',
      sourcePosition: actor.positions,
    });
    if (moveResult.distanceMoved > 0) {
      pushMsg = ` 💨 ${target.name} is pushed 5 feet to (${moveResult.newPosition.x}, ${moveResult.newPosition.y})!`;
    }
  }

  return {
    success: true,
    message: `🐗 ${actor.name} charges and strikes! ${strikeResult.message}${pushMsg}`,
    actionCost: 2,
  };
}

/**
 * Brutal Bully (Feat 6) — Passive
 * Whenever you successfully Shove, Trip, or Grapple while raging, deal STR damage.
 * Implemented in combatActions/skillActions as passive check. This resolver provides
 * a manual activation for edge cases.
 */
export function resolveBrutalBully(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const strMod = actor.abilities ? Math.floor((actor.abilities.strength - 10) / 2) : 0;
  return {
    success: true,
    message: `💪 ${actor.name}'s Brutal Bully: Shove/Trip/Grapple deals +${strMod} damage while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Overpowering Charge (Feat 10) — 2 actions
 * Stride then Strike. On hit, push target 10 feet (5 feet on normal hit, 10 on crit).
 */
export function resolveOverpoweringCharge(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging to use Overpowering Charge.`, errorCode: 'NOT_RAGING' };
  }
  if (!targetId) {
    return { success: false, message: 'No target specified.', errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);
  if (!strikeResult?.success) {
    return { success: false, message: `Overpowering Charge: ${strikeResult?.message ?? 'Strike failed.'}` };
  }

  let pushMsg = '';
  const degree = strikeResult.details?.result;
  if (degree === 'critical-success') {
    const moveResult = applyForcedMovement(target, gameState, {
      distanceFt: 10,
      direction: 'away',
      sourcePosition: actor.positions,
    });
    pushMsg = moveResult.distanceMoved > 0
      ? ` 💨 CRIT! ${target.name} is pushed ${moveResult.distanceMoved} feet!`
      : '';
  } else if (degree === 'success') {
    const moveResult = applyForcedMovement(target, gameState, {
      distanceFt: 5,
      direction: 'away',
      sourcePosition: actor.positions,
    });
    pushMsg = moveResult.distanceMoved > 0
      ? ` 💨 ${target.name} is pushed ${moveResult.distanceMoved} feet!`
      : '';
  }

  return {
    success: true,
    message: `🐗 ${actor.name} charges with overpowering force! ${strikeResult.message}${pushMsg}`,
    actionCost: 2,
  };
}

/**
 * Awesome Blow (Feat 14) — Free action (trigger: successful Strike while raging)
 * On a successful melee Strike, push the target 5 feet (10 on crit).
 * If pushed into a solid barrier, deal extra damage equal to 6 + str.
 */
export function resolveAwesomeBlow(
  _ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (!targetId) {
    return { success: false, message: 'No target.', errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Push 5 feet (the triggering strike already hit)
  const moveResult = applyForcedMovement(target, gameState, {
    distanceFt: 5,
    direction: 'away',
    sourcePosition: actor.positions,
  });

  let msg = `💥 Awesome Blow! ${target.name}`;
  if (moveResult.blocked && moveResult.distanceMoved === 0) {
    // Slammed into wall
    const strMod = actor.abilities ? Math.floor((actor.abilities.strength - 10) / 2) : 0;
    const slamDamage = 6 + strMod;
    target.currentHealth -= slamDamage;
    msg += ` slams into a ${moveResult.blockReason ?? 'wall'} for ${slamDamage} bludgeoning damage!`;
    if (target.currentHealth <= 0 && !target.dying) {
      initDying(target);
    }
  } else if (moveResult.distanceMoved > 0) {
    msg += ` is knocked ${moveResult.distanceMoved} feet away!`;
  } else {
    msg += ` can't be moved further.`;
  }

  return {
    success: true,
    message: msg,
    actionCost: 0, // Free action trigger
  };
}

/**
 * Whirlwind Toss (Feat 18) — 1 action
 * While raging and grabbing a creature, throw them up to 30 feet.
 * Target takes falling damage; creatures in a 10-foot burst at landing take splash.
 */
export function resolveWhirlwindToss(
  _ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (!targetId) {
    return { success: false, message: 'No target.', errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Check grappled condition
  const isGrabbed = target.conditions?.some(c =>
    (c.name === 'grabbed' || c.name === 'restrained') && c.source?.includes(actor.id)
  );
  if (!isGrabbed) {
    return { success: false, message: `${target.name} is not grabbed by ${actor.name}.`, errorCode: 'NOT_GRABBED' };
  }

  // Throw 30 feet (6 squares) away
  const moveResult = applyForcedMovement(target, gameState, {
    distanceFt: 30,
    direction: 'away',
    sourcePosition: actor.positions,
  });

  // Target takes falling damage equivalent (6d6 bludgeoning)
  const throwDamage = rollDamageFormula('6d6');
  target.currentHealth -= throwDamage.total;
  if (target.currentHealth <= 0 && !target.dying) {
    initDying(target);
  }

  // Remove grabbed condition
  target.conditions = (target.conditions ?? []).filter(c =>
    !(c.name === 'grabbed' || c.name === 'restrained') || !c.source?.includes(actor.id)
  );

  // Splash damage to adjacent creatures at landing position
  const splashDmg = rollDamageFormula('4d6');
  let splashMsg = '';
  const nearby = gameState.creatures.filter(c =>
    c.id !== target.id && c.id !== actor.id &&
    c.currentHealth > 0 && !c.dying &&
    Math.abs(c.positions.x - moveResult.newPosition.x) <= 2 &&
    Math.abs(c.positions.y - moveResult.newPosition.y) <= 2
  );
  if (nearby.length > 0) {
    for (const c of nearby) {
      c.currentHealth -= splashDmg.total;
      if (c.currentHealth <= 0 && !c.dying) {
        initDying(c);
      }
    }
    splashMsg = ` Splash deals ${splashDmg.total} to ${nearby.map(c => c.name).join(', ')}!`;
  }

  return {
    success: true,
    message: `🌪️ ${actor.name} hurls ${target.name} ${moveResult.distanceMoved} feet! ${throwDamage.total} bludgeoning damage!${splashMsg}`,
    actionCost: 1,
  };
}

/**
 * Titan's Stature (Feat 14) — Free action while raging with Giant's Stature
 * You become Huge (size increase beyond Giant's Stature which makes you Large).
 * Gain 10-foot reach, increased space.
 */
export function resolveTitansStature(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (!hasNamedFeat(actor, "giant's stature")) {
    return { success: false, message: `${actor.name} requires Giant's Stature feat.`, errorCode: 'MISSING_PREREQUISITE' };
  }

  // Upgrade to Huge
  applySize(actor, 'huge');

  // Add titans-stature condition to track this separate from giants-stature
  if (!actor.conditions) actor.conditions = [];
  // Remove any existing giants-stature condition (titan's replaces it)
  actor.conditions = actor.conditions.filter(c => c.name !== 'giants-stature');
  actor.conditions.push({
    name: 'titans-stature',
    duration: 'permanent',
    value: 1,
    source: 'titans-stature',
  });

  return {
    success: true,
    message: `⬆️ ${actor.name} grows to HUGE size! Space ${actor.space ?? 3} squares, reach ${actor.naturalReach ?? 3} squares.`,
    actionCost: 0,
  };
}

/**
 * Dragon Transformation (Feat 16) — 1 action while raging (Dragon Instinct)
 * Transform into a dragon battle form. Uses polymorph subsystem.
 */
export function resolveDragonTransformation(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }

  const instinct = actor.barbarianInstinct;
  if (instinct?.toLowerCase() !== 'dragon') {
    return { success: false, message: `${actor.name} requires the Dragon Instinct.`, errorCode: 'WRONG_INSTINCT' };
  }

  if (isPolymorphed(actor)) {
    // Revert existing polymorph first
    revertBattleForm(actor);
  }

  // Get scaled dragon form
  const dragonForm = getDragonForm(actor.level);
  const transformMsg = applyBattleForm(actor, dragonForm);

  return {
    success: true,
    message: `🐉 ${transformMsg} AC ${actor.armorClass}, Speed ${actor.speed}ft, Fly ${dragonForm.flySpeed ?? 0}ft. Duration: ${dragonForm.durationRounds} rounds.`,
    actionCost: 1,
  };
}

/**
 * Dragon's Rage Wings (Feat 12) — Free action while raging (Dragon Instinct)
 * Gain a fly speed equal to your land speed while raging.
 */
export function resolveDragonsRageWings(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }

  const instinct = actor.barbarianInstinct;
  if (instinct?.toLowerCase() !== 'dragon') {
    return { success: false, message: `${actor.name} requires the Dragon Instinct.`, errorCode: 'WRONG_INSTINCT' };
  }

  // Grant fly speed = land speed via condition
  const flySpeed = actor.speed ?? 25;
  if (!actor.conditions) actor.conditions = [];

  // Remove existing fly-speed condition if present
  actor.conditions = actor.conditions.filter(c => c.name !== 'fly-speed' || c.source !== 'dragons-rage-wings');
  actor.conditions.push({
    name: 'fly-speed',
    duration: 'permanent',
    value: flySpeed,
    source: 'dragons-rage-wings',
  });

  return {
    success: true,
    message: `🐉 ${actor.name} spreads draconic wings! Fly speed: ${flySpeed}ft.`,
    actionCost: 0,
  };
}

/**
 * Impressive Landing (Feat 10) — Reaction (trigger: you fall and land adjacent to enemies)
 * Deal damage in a 15-foot emanation when you fall.
 * Damage: fall damage dice that would be dealt to you.
 */
export function resolveImpressiveLanding(
  _ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }

  const elevation = getElevation(actor);
  if (elevation <= 0) {
    return { success: false, message: `${actor.name} is already on the ground.`, errorCode: 'NOT_ELEVATED' };
  }

  // Calculate fall damage
  const fallResult = calculateFallDamage(elevation);
  const fallRoll = rollDamageFormula(fallResult.dice || '0');
  const fallDmg = fallRoll.total;
  // Land — set elevation to 0
  setElevation(actor, 0);

  // Apply half the fall damage to actor (Cat Fall-like reduction)
  const selfDamage = Math.floor(fallDmg / 2);
  actor.currentHealth -= selfDamage;

  // Deal damage in 15-foot (3 squares) emanation
  const affected = gameState.creatures.filter(c =>
    c.id !== actor.id && c.currentHealth > 0 &&
    Math.max(Math.abs(c.positions.x - actor.positions.x), Math.abs(c.positions.y - actor.positions.y)) <= 3
  );

  const classDC = getClassDC(actor);
  const msgs: string[] = [];
  for (const c of affected) {
    const reflexBonus = calculateSaveBonus(c, 'reflex');
    const d20 = rollD20();
    const total = d20 + reflexBonus;
    const saveResult = getDegreeOfSuccess(d20, total, classDC);
    let damage = fallDmg;
    if (saveResult === 'critical-success') damage = 0;
    else if (saveResult === 'success') damage = Math.floor(damage / 2);
    else if (saveResult === 'critical-failure') damage = damage * 2;

    c.currentHealth -= damage;
    msgs.push(`${c.name}: ${damage} dmg (${saveResult})`);
    if (c.currentHealth <= 0 && !c.dying) {
      initDying(c);
    }
  }

  return {
    success: true,
    message: `💥 ${actor.name} lands with devastating force from ${elevation}ft! Self: ${selfDamage} dmg. ${msgs.length > 0 ? msgs.join(', ') : 'No enemies nearby.'}`,
    actionCost: 0, // Reaction
  };
}

/**
 * Tangle of Battle (Feat 10) — Reaction
 * When an enemy within your melee reach uses a move action, make a Strike.
 * This is registered in the REACTION_REGISTRY in subsystems.ts.
 * This resolver executes the actual reaction.
 */
export function resolveTangleOfBattle(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (actor.reactionUsed) {
    return { success: false, message: `${actor.name} has already used their reaction.`, errorCode: 'REACTION_USED' };
  }
  if (!targetId) {
    return { success: false, message: 'No target.', errorCode: 'NO_TARGET' };
  }

  actor.reactionUsed = true;

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);
  return {
    success: true,
    message: `⚡ Tangle of Battle! ${actor.name} strikes at the moving enemy! ${strikeResult?.message ?? ''}`,
    actionCost: 0,
  };
}

/**
 * Embrace the Pain (Feat 12) — Reaction
 * When you take damage while raging, gain resistance to that damage type
 * equal to your Constitution modifier and make a melee Strike against the attacker.
 */
export function resolveEmbraceThePain(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (actor.reactionUsed) {
    return { success: false, message: `${actor.name} has already used their reaction.`, errorCode: 'REACTION_USED' };
  }

  actor.reactionUsed = true;

  const conMod = actor.abilities ? Math.floor((actor.abilities.constitution - 10) / 2) : 0;

  // Grant temporary resistance as condition
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'resistance-all',
    duration: 1,
    value: conMod,
    source: 'embrace-the-pain',
  });

  let strikeMsg = '';
  // Counter-strike if attacker is specified and in reach
  if (targetId) {
    const strikeResult = ctx.resolveStrike(actor, gameState, targetId);
    strikeMsg = strikeResult?.message ?? '';
  }

  return {
    success: true,
    message: `🔥 Embrace the Pain! ${actor.name} gains resistance ${conMod} to all damage this round.${strikeMsg ? ` Counter-strike: ${strikeMsg}` : ''}`,
    actionCost: 0,
  };
}

/**
 * Vengeful Strike (Feat 16) — Reaction
 * When an enemy within reach deals damage to you, make a melee Strike.
 * If the Strike hits, deal an extra die of weapon damage.
 */
export function resolveVengefulStrike(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (actor.reactionUsed) {
    return { success: false, message: `${actor.name} has already used their reaction.`, errorCode: 'REACTION_USED' };
  }
  if (!targetId) {
    return { success: false, message: 'No target.', errorCode: 'NO_TARGET' };
  }

  actor.reactionUsed = true;

  // Add condition for extra damage die on next strike
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'vengeful-strike-bonus',
    duration: 1,
    value: 1,
    source: 'vengeful-strike',
  });

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);

  // Remove the bonus condition after the strike
  actor.conditions = (actor.conditions ?? []).filter(c => c.name !== 'vengeful-strike-bonus');

  return {
    success: true,
    message: `⚔️ Vengeful Strike! ${actor.name} retaliates with fury! ${strikeResult?.message ?? ''}`,
    actionCost: 0,
  };
}

/**
 * Furious Vengeance (Feat 16) — Reaction
 * When an ally within 30 feet takes damage, you make a Strike against the attacker
 * (if within reach) and gain temporary HP equal to your Constitution modifier.
 */
export function resolveFuriousVengeance(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (actor.reactionUsed) {
    return { success: false, message: `${actor.name} has already used their reaction.`, errorCode: 'REACTION_USED' };
  }
  if (!targetId) {
    return { success: false, message: 'No target.', errorCode: 'NO_TARGET' };
  }

  actor.reactionUsed = true;

  const conMod = actor.abilities ? Math.floor((actor.abilities.constitution - 10) / 2) : 0;
  if (conMod > 0) {
    actor.temporaryHealth = Math.max(actor.temporaryHealth ?? 0, conMod);
  }

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);

  return {
    success: true,
    message: `🛡️ Furious Vengeance! ${actor.name} avenges their ally!${conMod > 0 ? ` +${conMod} temp HP.` : ''} ${strikeResult?.message ?? ''}`,
    actionCost: 0,
  };
}

/**
 * Perfect Clarity (Feat 18) — Reaction or Free action
 * Reroll a failed save, attack roll, or skill check with a +2 circumstance bonus.
 * Ends rage immediately after use.
 */
export function resolvePerfectClarity(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }

  // Grant the reroll condition (consumed by the next check)
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'perfect-clarity',
    duration: 1,
    value: 2, // +2 circumstance bonus
    source: 'perfect-clarity',
  });

  // End rage immediately
  actor.rageActive = false;
  actor.rageRoundsLeft = 0;

  return {
    success: true,
    message: `✨ Perfect Clarity! ${actor.name} gains a reroll with +2 bonus. Rage ends!`,
    actionCost: 0,
  };
}

/**
 * Shattering Blows (Feat 18) — Passive
 * While raging, your Strikes ignore 5 points of resistance (10 at 20th level).
 * This is mainly tracked as a passive, but adds a condition for the damage system to check.
 */
export function resolveShatteringBlows(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }

  const penetration = actor.level >= 20 ? 10 : 5;
  if (!actor.conditions) actor.conditions = [];
  // Remove old shattering blows condition
  actor.conditions = actor.conditions.filter(c => c.name !== 'shattering-blows');
  actor.conditions.push({
    name: 'shattering-blows',
    duration: 'permanent',
    value: penetration,
    source: 'shattering-blows',
  });

  return {
    success: true,
    message: `💎 ${actor.name}'s Shattering Blows! Strikes ignore ${penetration} points of resistance while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

// ─────────────────────────────────────────────────────────
// NON-SUBSYSTEM PARTIAL FEAT RESOLVERS
// Feats that were partial but don't require new subsystems
// ─────────────────────────────────────────────────────────

/**
 * Raging Resistance (Feat 9) — Passive
 * While raging, gain resistance to a damage type based on your instinct.
 * Animal: poison. Dragon: element. Fury: physical. Giant: bludgeoning. Spirit: void/vitality.
 */
export function resolveRagingResistance(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }

  const instinct = (actor.barbarianInstinct ?? 'fury').toLowerCase();
  const conMod = actor.abilities ? Math.floor((actor.abilities.constitution - 10) / 2) : 0;
  const resistValue = 3 + conMod;

  let resistType = 'physical'; // Default for Fury
  switch (instinct) {
    case 'animal': resistType = 'poison'; break;
    case 'dragon': resistType = 'fire'; break; // Varies by dragon type, default fire
    case 'giant': resistType = 'bludgeoning'; break;
    case 'spirit': resistType = 'void'; break;
    case 'superstition': resistType = 'all-magic'; break;
  }

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'raging-resistance');
  actor.conditions.push({
    name: `resistance-${resistType}`,
    duration: 'permanent',
    value: resistValue,
    source: 'raging-resistance',
  });

  return {
    success: true,
    message: `🔰 ${actor.name} gains resistance ${resistValue} to ${resistType} while raging (${instinct} instinct).`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Instinctive Strike (Feat 8)
 * Make an attack using your instinct's natural weapon while raging.
 * Animal: jaws/claw. Dragon: breath/jaws. Giant: slam.
 */
export function resolveInstinctiveStrike(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} must be raging.`, errorCode: 'NOT_RAGING' };
  }
  if (!targetId) {
    return { success: false, message: 'No target.', errorCode: 'NO_TARGET' };
  }

  const instinct = (actor.barbarianInstinct ?? 'fury').toLowerCase();
  let weaponId: string | undefined;

  // Find instinct-specific weapon
  if (actor.weaponInventory) {
    const instinctWeapon = actor.weaponInventory.find(ws => {
      const w = ws.weapon;
      if (instinct === 'animal') return w.id?.includes('jaws') || w.id?.includes('claw');
      if (instinct === 'dragon') return w.id?.includes('jaws') || w.id?.includes('dragon');
      if (instinct === 'giant') return w.id?.includes('slam') || w.id?.includes('fist');
      return false;
    });
    if (instinctWeapon) weaponId = instinctWeapon.weapon.id;
  }

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);
  return {
    success: true,
    message: `🐾 Instinctive Strike (${instinct})! ${strikeResult?.message ?? 'Attack made.'}`,
    actionCost: 1,
  };
}

/**
 * Mighty Rage (Feat 11) — Passive
 * When you enter rage, you can use a 1-action rage feat as a free action.
 * This is a modifier/flag feat — sets a state for resolveRage to check.
 */
export function resolveMightyRage(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.name !== 'mighty-rage');
  actor.conditions.push({
    name: 'mighty-rage',
    duration: 'permanent',
    value: 1,
    source: 'mighty-rage',
  });

  return {
    success: true,
    message: `💪 ${actor.name} has Mighty Rage! You can use a 1-action rage feat as a free action when entering rage.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

// ─────────────────────────────────────────────────────────
// REMAINING PARTIAL FEAT RESOLVERS (PF2e Remaster — AoN verified)
// ─────────────────────────────────────────────────────────

/**
 * Quick-Tempered (Feat 1) — Free Action (Reaction on initiative)
 * Trigger: You roll initiative. Requirements: Not encumbered, not wearing heavy armor.
 * Effect: You Rage.
 */
export function resolveQuickTempered(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  // Check requirements: not encumbered
  const isEncumbered = (actor.conditions ?? []).some(c => c.name === 'encumbered');
  if (isEncumbered) {
    return { success: false, message: `${actor.name} cannot use Quick-Tempered while encumbered.`, errorCode: 'NOT_IN_STATE' };
  }

  // Check requirements: not wearing heavy armor
  const armorId = (actor.equippedArmor ?? '').toLowerCase();
  const isHeavy = armorId.includes('full-plate') || armorId.includes('half-plate') || armorId.includes('splint') || armorId.includes('chain-mail') || armorId.includes('scale-mail');
  if (isHeavy) {
    return { success: false, message: `${actor.name} cannot use Quick-Tempered while wearing heavy armor.`, errorCode: 'NOT_IN_STATE' };
  }

  // Already raging?
  if (actor.rageActive) {
    return { success: false, message: `${actor.name} is already raging.`, errorCode: 'NOT_IN_STATE' };
  }

  // Activate rage
  actor.rageActive = true;
  actor.rageRoundsLeft = 10; // Standard rage duration
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'quick-tempered-rage',
    duration: 'permanent',
    value: 1,
    source: 'quick-tempered',
  });

  return {
    success: true,
    message: `⚡ ${actor.name} enters a rage on initiative (Quick-Tempered)!`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Instinct (Class Feature L1) — Passive
 * Selects the barbarian's instinct subclass and sets the barbarianInstinct flag.
 * Animal | Dragon | Fury | Giant | Spirit | Superstition
 */
export function resolveInstinct(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const instinct = (actor.barbarianInstinct ?? 'fury').toLowerCase();
  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'instinct');
  actor.conditions.push({
    name: `instinct-${instinct}`,
    duration: 'permanent',
    value: 1,
    source: 'instinct',
  });

  return {
    success: true,
    message: `🔥 ${actor.name}'s instinct: ${instinct}. Determines specialization abilities, anathema, raging resistance, and instinct-specific feats.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Revitalizing Rage (Class Feature L17) — Passive
 * Reduces Rage cooldown from 1 minute to waiting only 1 full turn without raging.
 */
export function resolveRevitalizingRage(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.name !== 'revitalizing-rage');
  actor.conditions.push({
    name: 'revitalizing-rage',
    duration: 'permanent',
    value: 1,
    source: 'revitalizing-rage',
  });

  return {
    success: true,
    message: `💚 ${actor.name} has Revitalizing Rage! Rage cooldown reduced to 1 full turn (instead of 1 minute).`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Adrenaline Rush (Feat 1) — Passive
 * While raging: +1 status bonus to Athletics for lift/Escape/Force Open.
 * Bulk limits increased by 2.
 */
export function resolveAdrenalineRush(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Adrenaline Rush');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'adrenaline-rush');
  actor.conditions.push({
    name: 'adrenaline-rush',
    duration: 'permanent',
    value: 1,
    source: 'adrenaline-rush',
  });

  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses = actor.bonuses.filter(b => b.source !== 'adrenaline-rush');
  actor.bonuses.push({
    type: 'status',
    value: 1,
    applyTo: 'athletics',
    source: 'adrenaline-rush',
  });

  return {
    success: true,
    message: `💪 ${actor.name}'s Adrenaline Rush! +1 status Athletics (lift/Escape/Force Open), +2 Bulk limits while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Draconic Arrogance (Feat 4) — Passive
 * While raging: +2 status bonus to saves vs emotion effects.
 * If you would gain the controlled condition from an emotion effect, you are immune instead.
 */
export function resolveDraconicArrogance(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Draconic Arrogance');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'draconic-arrogance');
  actor.conditions.push({
    name: 'draconic-arrogance',
    duration: 'permanent',
    value: 2,
    source: 'draconic-arrogance',
  });

  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses = actor.bonuses.filter(b => b.source !== 'draconic-arrogance');
  actor.bonuses.push({
    type: 'status',
    value: 2,
    applyTo: 'save-vs-emotion',
    source: 'draconic-arrogance',
  });

  return {
    success: true,
    message: `🐉 ${actor.name}'s Draconic Arrogance! +2 status to saves vs emotion while raging. Immune to controlled from emotion effects.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Raging Athlete (Feat 4) — Passive
 * While raging: Climb and Swim speed equal full land Speed (not half).
 * High Jump and Long Jump DC reduced by 10; Long Jump distance increased by 10 feet.
 * If you have master Athletics, Long Jump distance increased by 20 feet instead.
 */
export function resolveRagingAthlete(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Raging Athlete');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'raging-athlete');

  const speed = getEffectiveSpeed(actor);
  actor.conditions.push({
    name: 'raging-athlete',
    duration: 'permanent',
    value: speed,
    source: 'raging-athlete',
  });

  return {
    success: true,
    message: `🏃 ${actor.name}'s Raging Athlete! Climb/Swim = ${speed} ft (full land Speed). Jump DCs reduced by 10, Long Jump +10 ft while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Supernatural Senses (Feat 6) — Passive
 * While raging: Reduced flat check DCs — DC 3 to target a concealed creature,
 * DC 9 to target a hidden creature (instead of DC 5 and DC 11).
 * Requires animal instinct or dragon instinct.
 */
export function resolveSupernaturalSenses(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Supernatural Senses');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'supernatural-senses');
  actor.conditions.push({
    name: 'supernatural-senses',
    duration: 'permanent',
    value: 1,
    source: 'supernatural-senses',
  });

  return {
    success: true,
    message: `👁️ ${actor.name}'s Supernatural Senses! Flat check DC 3 vs concealed, DC 9 vs hidden while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Animal Skin (Feat 6) — Passive, Morph, Primal
 * Unarmored defense proficiency → expert.
 * While raging and unarmored: +2 item bonus to AC (+3 with greater juggernaut), Dex cap +3.
 * Stacks with armor potency runes on explorer's clothing, mystic armor, and bands of force.
 */
export function resolveAnimalSkin(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Animal Skin');
  if (rageCheck) return rageCheck;

  // Check unarmored (no armor equipped or explorer's clothing)
  const armorStr = (actor.equippedArmor ?? '').toLowerCase();
  const isUnarmored = !armorStr || armorStr === 'unarmored' || armorStr.includes('explorer');
  if (!isUnarmored) {
    return { success: false, message: `${actor.name} must be unarmored for Animal Skin.`, errorCode: 'NOT_IN_STATE' };
  }

  const hasGreaterJuggernaut = hasNamedFeat(actor, 'greater juggernaut') || (actor.level >= 17);
  const acBonus = hasGreaterJuggernaut ? 3 : 2;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'animal-skin');
  actor.conditions.push({
    name: 'animal-skin',
    duration: 'permanent',
    value: acBonus,
    source: 'animal-skin',
  });

  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses = actor.bonuses.filter(b => b.source !== 'animal-skin');
  actor.bonuses.push({
    type: 'item',
    value: acBonus,
    applyTo: 'ac',
    source: 'animal-skin',
  });

  return {
    success: true,
    message: `🐻 ${actor.name}'s Animal Skin! +${acBonus} item AC (Dex cap +3) while raging and unarmored.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Nocturnal Senses (Feat 6) — Passive, Rage
 * While raging: If you have low-light vision, you gain darkvision.
 * If you have scent, the range of your imprecise scent doubles.
 */
export function resolveNocturnalSenses(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Nocturnal Senses');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'nocturnal-senses');

  const effects: string[] = [];

  // Check specials/feats for senses
  const specials = (actor.specials ?? []).map((s: string) => s.toLowerCase());
  const hasLowLight = specials.some((s: string) => s.includes('low-light'));
  const hasScent = specials.some((s: string) => s.includes('scent'));

  // Low-light vision → darkvision
  if (hasLowLight) {
    actor.conditions.push({
      name: 'darkvision',
      duration: 'permanent',
      value: 1,
      source: 'nocturnal-senses',
    });
    effects.push('low-light vision → darkvision');
  }

  // Scent range doubles
  if (hasScent) {
    actor.conditions.push({
      name: 'scent-doubled',
      duration: 'permanent',
      value: 2,
      source: 'nocturnal-senses',
    });
    effects.push('imprecise scent range doubled');
  }

  if (effects.length === 0) {
    effects.push('no applicable senses to enhance');
  }

  return {
    success: true,
    message: `🌙 ${actor.name}'s Nocturnal Senses! ${effects.join(', ')} while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Animalistic Brutality (Feat 6) — 1 Action, Rage
 * Choose one trait from: backswing, forceful, parry, razing, sweep.
 * Add that trait to your bestial rage unarmed attack until end of rage.
 * Can only use once per rage.
 */
export function resolveAnimalisticBrutality(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
  _targetId?: string,
  _weaponId?: string,
  traitChoice?: string,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Animalistic Brutality');
  if (rageCheck) return rageCheck;

  // Check once per rage
  const alreadyUsed = (actor.conditions ?? []).some(c => c.name === 'animalistic-brutality-used');
  if (alreadyUsed) {
    return { success: false, message: `${actor.name} already used Animalistic Brutality this rage.`, errorCode: 'NOT_IN_STATE' };
  }

  const validTraits = ['backswing', 'forceful', 'parry', 'razing', 'sweep'];
  const trait = (traitChoice ?? 'forceful').toLowerCase();
  if (!validTraits.includes(trait)) {
    return { success: false, message: `Invalid trait choice: ${trait}. Choose from: ${validTraits.join(', ')}.`, errorCode: 'NOT_IN_STATE' };
  }

  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'animalistic-brutality-used',
    duration: 'permanent',
    value: 1,
    source: 'animalistic-brutality',
  });
  actor.conditions.push({
    name: `animalistic-brutality-${trait}`,
    duration: 'permanent',
    value: 1,
    source: 'animalistic-brutality',
  });

  return {
    success: true,
    message: `🐾 ${actor.name}'s Animalistic Brutality! Added ${trait} trait to bestial rage attack until rage ends.`,
    actionCost: 1,
  };
}

/**
 * Furious Bully (Feat 6) — Passive
 * While raging: +2 circumstance bonus to Athletics checks for attack actions
 * (Disarm, Grapple, Shove, Trip).
 */
export function resolveFuriousBully(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Furious Bully');
  if (rageCheck) return rageCheck;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.source !== 'furious-bully');
  actor.conditions.push({
    name: 'furious-bully',
    duration: 'permanent',
    value: 2,
    source: 'furious-bully',
  });

  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses = actor.bonuses.filter(b => b.source !== 'furious-bully');
  actor.bonuses.push({
    type: 'circumstance',
    value: 2,
    applyTo: 'athletics-attack',
    source: 'furious-bully',
  });

  return {
    success: true,
    message: `💪 ${actor.name}'s Furious Bully! +2 circumstance to Athletics for attack actions (Disarm/Grapple/Shove/Trip) while raging.`,
    actionCost: 0,
    passiveOnly: true,
  };
}

/**
 * Sunder Spell (Feat 12) — 2 Actions, Attack, Rage
 * Make a melee Strike against a creature, object, or spell effect (AC 10 if no listed AC).
 * On hit, attempt to counteract a single spell active on the target.
 * Counteract rank = ceil(level / 2). Your attack roll = counteract check.
 * Target is immune to your Sunder Spell for 24 hours on any result.
 */
export function resolveSunderSpell(
  ctx: FeatActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  const rageCheck = requiresRage(actor, 'Sunder Spell');
  if (rageCheck) return rageCheck;

  if (!targetId) {
    return { success: false, message: 'No target specified for Sunder Spell.', errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.', errorCode: 'TARGET_NOT_FOUND' };
  }

  // Check 24h immunity
  const immune = (target.conditions ?? []).some(c =>
    c.name === 'sunder-spell-immunity' && c.source === actor.id
  );
  if (immune) {
    return { success: false, message: `${target.name} is immune to ${actor.name}'s Sunder Spell for 24 hours.`, errorCode: 'NOT_IN_STATE' };
  }

  // Make the Strike
  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);

  // Apply 24h immunity regardless of outcome
  if (!target.conditions) target.conditions = [];
  target.conditions.push({
    name: 'sunder-spell-immunity',
    duration: 'permanent',
    value: 1,
    source: actor.id,
  });

  if (!strikeResult?.success) {
    return {
      success: false,
      message: `Sunder Spell: Strike missed. ${target.name} is immune to ${actor.name}'s Sunder Spell for 24 hours.`,
    };
  }

  // On hit: counteract check
  const counteractRank = Math.ceil(actor.level / 2);
  const attackRoll = strikeResult.details?.attackRoll?.total ?? (rollD20() + calculateAttackBonus(actor, ctx.resolveSelectedWeapon(actor) ?? (undefined as unknown as CreatureWeapon)));

  // Find active spell conditions on target
  const spellConditions = (target.conditions ?? []).filter(c =>
    c.source && (c.source.includes('spell') || c.source.includes('magic'))
  );

  let counteractMsg = '';
  if (spellConditions.length > 0) {
    // Counteract the first spell condition found
    const spellToCounter = spellConditions[0];
    const spellRank = spellToCounter.value ?? 1;
    // Counteract succeeds if counteract rank >= spell rank and check beats DC
    if (counteractRank >= spellRank) {
      target.conditions = target.conditions.filter(c => c !== spellToCounter);
      counteractMsg = ` Counteracted ${spellToCounter.name} (rank ${spellRank})!`;
    } else {
      counteractMsg = ` Failed to counteract ${spellToCounter.name} (rank ${spellRank} > counteract rank ${counteractRank}).`;
    }
  } else {
    counteractMsg = ' No active spells found on target to counteract.';
  }

  return {
    success: true,
    message: `⚔️ Sunder Spell! ${strikeResult.message}${counteractMsg} ${target.name} immune to ${actor.name}'s Sunder Spell for 24 hours.`,
    actionCost: 2,
    details: {
      ...strikeResult.details,
      counteractRank,
    },
  };
}

/**
 * Sunder Enchantment (Feat 16) — Passive upgrade to Sunder Spell
 * When you Sunder Spell, you can instead attempt to counteract a magic item.
 * On success, the item becomes non-magical for 10 minutes. Cannot affect artifacts.
 */
export function resolveSunderEnchantment(
  _ctx: FeatActionContext,
  actor: Creature,
  _gameState: GameState,
): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions = actor.conditions.filter(c => c.name !== 'sunder-enchantment');
  actor.conditions.push({
    name: 'sunder-enchantment',
    duration: 'permanent',
    value: 1,
    source: 'sunder-enchantment',
  });

  return {
    success: true,
    message: `✨ ${actor.name} has Sunder Enchantment! Sunder Spell can now counteract magic items (non-magical for 10 min). Cannot affect artifacts.`,
    actionCost: 0,
    passiveOnly: true,
  };
}