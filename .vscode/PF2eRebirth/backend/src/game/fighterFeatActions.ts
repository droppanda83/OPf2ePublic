// Fighter Feat Actions - extracted from RulesEngine
// All functions follow the FeatActionContext pattern: (ctx, actor, gameState, targetId?, targetPosition?) => any
// Converted from private RulesEngine methods to standalone functions.

import { Creature, GameState, Position, CreatureWeapon, rollDamageFormula, calculateFinalDamage, getEffectiveReach } from 'pf2e-shared';
import { FeatActionContext } from './featActions';

// â€”â€”â€” Shared ok/fail helpers â€”â€”â€”
function ok(message: string, extra?: Record<string, unknown>): { success: true; message: string; [key: string]: unknown } {
  return { success: true, message, ...extra };
}

function fail(message: string, errorCode?: string): { success: false; message: string; errorCode?: string; [key: string]: unknown } {
  return errorCode
    ? { success: false, message, errorCode }
    : { success: false, message };
}

/**
 * Power Attack (Level 1)
 * 2-action Flourish. Strike with one extra weapon die.
 */
export function resolvePowerAttack(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Power Attack feat
  const hasFeature = ctx.hasFeat(actor, 'power attack');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Power Attack.`);
  }

  // Flourish: only once per turn
  if (actor.flourishUsedThisTurn) {
    return fail(`${actor.name} has already used a Flourish action this turn.`);
  }
  actor.flourishUsedThisTurn = true;

  // Perform strike with extra damage die
  const strikeResult = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  if (!strikeResult.success) {
    // Unfail, flourish was used
    return strikeResult;
  }

  // Add one extra damage die to the damage
  if (strikeResult.details?.damage) {
    const weapon = ctx.resolveSelectedWeapon(actor, weaponId);
    const baseFormula = weapon?.damageDice ?? actor.weaponDamageDice ?? '1d4';
    const dieMatch = baseFormula.match(/(\d+)d(\d+)/i);
    const dieSides = dieMatch ? parseInt(dieMatch[2], 10) : 6;
    
    const extraRoll = rollDamageFormula(`1d${dieSides}`);
    const extraDamage = strikeResult.details?.damage?.isCriticalHit ? extraRoll.total * 2 : extraRoll.total;
    
    strikeResult.details.damage.appliedDamage += extraDamage;
    
    // Recalculate final damage
    const damageCalc = calculateFinalDamage(strikeResult.details.damage.appliedDamage, 'bludgeoning', gameState.creatures.find(c => c.id === targetId) || {} as any);
    const finalDamage = damageCalc.finalDamage;
    strikeResult.targetHealth = (gameState.creatures.find(c => c.id === targetId)?.currentHealth || 0) - finalDamage;
    strikeResult.message = `Â­Æ’Ã¶Â¿ POWER ATTACK! ${strikeResult.message} (+${extraDamage} extra die)`;
  }

  return strikeResult;
}

/**
 * Sudden Charge (Level 1)
 * 2-action Attack. Stride twice, then Strike.
 */
export function resolveSuddenCharge(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  targetPosition?: Position,
  heroPointsSpent?: number
): any {
  // Check for Sudden Charge feat
  const hasFeature = ctx.hasFeat(actor, 'sudden charge');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Sudden Charge.`);
  }

  if (!targetPosition) {
    return fail('Stride position must be provided for Sudden Charge.');
  }

  // First Stride
  const stride1 = ctx.resolveMovement(actor, gameState, targetPosition, 'stride');
  if (!stride1.success) {
    return stride1;
  }

  // Move to the new position
  actor.positions = targetPosition;

  // Second Stride (calculate intermediate position)
  // For simplicity, we'll use the same target position for both strides
  const stride2 = ctx.resolveMovement(actor, gameState, targetPosition, 'stride');
  if (!stride2.success) {
    return stride2;
  }

  actor.positions = targetPosition;

  // Strike
  const strike = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  if (!strike.success) {
    return strike;
  }

  return {
    success: true,
    message: `Ã”ÃœÃ¶Â´Â©Ã… SUDDEN CHARGE! ${actor.name} charged twice and struck ${strike.details?.targetName || targetId}!`,
    details: strike.details,
    targetHealth: strike.targetHealth,
    targetDying: strike.targetDying,
  };
}

/**
 * Double Slice (Level 1)
 * 2-action activity. Strike with each held weapon against the same target.
 * The second Strike uses the same MAP as the first (both count for 1 MAP increase).
 * PF2e: Double Slice does NOT have the Flourish trait.
 */

/**
 * Double Slice (Level 1)
 * 2-action activity. Strike with each held weapon against the same target.
 * The second Strike uses the same MAP as the first (both count for 1 MAP increase).
 * PF2e: Double Slice does NOT have the Flourish trait.
 */
export function resolveDoubleSlice(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  // Check for Double Slice feat
  const hasFeature = ctx.hasFeat(actor, 'double slice');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Double Slice.`);
  }

  // Double Slice is NOT Flourish Ã”Ã‡Ã¶ no flourish check needed

  if (!targetId) {
    return fail('No target specified for Double Slice.');
  }

  // Check if actor has dual wielding setup
  const heldWeapons = actor.weaponInventory?.filter(s => s.state === 'held') || [];
  if (heldWeapons.length < 2) {
    return fail(`${actor.name} does not have two weapons held for Double Slice.`);
  }

  // Strike with first weapon
  const strike1 = ctx.resolveAttackAction(actor, gameState, targetId, heldWeapons[0].weapon.id, { isVicious: false }, heroPointsSpent);
  if (!strike1.success) {
    return strike1;
  }

  // Strike with second weapon (inherits full MAP from first, but both count as 1 action)
  const strike2 = ctx.resolveAttackAction(actor, gameState, targetId, heldWeapons[1].weapon.id, { isVicious: false }, heroPointsSpent);
  if (!strike2.success) {
    return strike2;
  }

  const totalDamage = (strike1.details?.damage?.appliedDamage || 0) + (strike2.details?.damage?.appliedDamage || 0);

  return {
    success: true,
    message: `Ã”ÃœÃ¶Â´Â©Ã…Ã”ÃœÃ¶Â´Â©Ã… DOUBLE SLICE! ${actor.name} struck ${strike1.details?.targetName || targetId} with both weapons for total ${totalDamage} damage!`,
    details: { strike1: strike1.details, strike2: strike2.details },
    totalDamage,
    targetHealth: strike2.targetHealth,
  };
}

/**
 * Intimidating Strike (Level 1)
 * 2-action Flourish. Strike, and on hit, target is Frightened 1 (or 2 on crit).
 */
export function resolveIntimidatingStrike(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Intimidating Strike feat
  const hasFeature = ctx.hasFeat(actor, 'intimidating strike');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Intimidating Strike.`);
  }

  // Flourish: only once per turn
  if (actor.flourishUsedThisTurn) {
    return fail(`${actor.name} has already used a Flourish action this turn.`);
  }
  actor.flourishUsedThisTurn = true;

  // Perform the strike
  const strikeResult = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  if (!strikeResult.success) {
    // Unfail, flourish was used
    return strikeResult;
  }

  // Apply Frightened condition based on hit/crit
  const target = gameState.creatures.find(c => c.id === targetId);
  if (target) {
    const isCrit = strikeResult.details?.damage?.isCriticalHit;
    const frightLevel = isCrit ? 2 : 1;
    
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 1,
      value: frightLevel,
      source: `intimidating-strike-${actor.id}`,
    });
    
    strikeResult.message += ` Â­Æ’Ã¿Â¿ ${target.name} is now Frightened ${frightLevel}!`;
  }

  return strikeResult;
}

/**
 * Exacting Strike (Level 1)
 * 1-action Press. Strike, and if you miss, it doesn't count for MAP.
 * Press trait: requires you to have already made an attack this turn.
 */

/**
 * Exacting Strike (Level 1)
 * 1-action Press. Strike, and if you miss, it doesn't count for MAP.
 * Press trait: requires you to have already made an attack this turn.
 */
export function resolveExactingStrike(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Exacting Strike feat
  const hasFeature = ctx.hasFeat(actor, 'exacting strike');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Exacting Strike.`);
  }

  // Press trait: must have already attacked this turn
  if ((actor.attacksMadeThisTurn ?? 0) < 1) {
    return fail(`${actor.name} must make at least one Strike before using Exacting Strike (Press trait).`);
  }

  // Save the current MAP count
  const originalMAP = actor.attacksMadeThisTurn ?? 0;

  // Attempt the strike
  const strikeResult = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);

  // If the strike misses, reset the MAP counter
  if (!strikeResult.success) {
    actor.attacksMadeThisTurn = originalMAP;
    strikeResult.message += ` (doesn't count for MAP)`;
  }

  return strikeResult;
}

/**
 * Snagging Strike (Level 1)
 * 1-action. Strike, and on hit, target is off-guard until start of next turn.
 */
export function resolveSnaggingStrike(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Snagging Strike feat
  const hasFeature = ctx.hasFeat(actor, 'snagging strike');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Snagging Strike.`);
  }

  // Perform the strike
  const strikeResult = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  if (!strikeResult.success) {
    return strikeResult;
  }

  // Apply off-guard condition
  const target = gameState.creatures.find(c => c.id === targetId);
  if (target) {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'off-guard',
      duration: 1,
      source: `snagging-strike-${actor.id}`,
      expiresOnTurnEndOf: actor.id,
    });
    
    strikeResult.message += ` The target is off-guard until the start of your next turn!`;
  }

  return strikeResult;
}

/**
 * Knockdown (Level 2)
 * 2-action Flourish. Strike, and if hit, Trip for free.
 */
export function resolveKnockdown(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Knockdown feat
  const hasFeature = ctx.hasFeat(actor, 'knockdown');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Knockdown.`);
  }

  // Flourish: only once per turn
  if (actor.flourishUsedThisTurn) {
    return fail(`${actor.name} has already used a Flourish action this turn.`);
  }
  actor.flourishUsedThisTurn = true;

  // Perform the strike
  const strikeResult = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  if (!strikeResult.success) {
    // Unfail, flourish was used
    return strikeResult;
  }

  // Attempt free Trip if strike hits
  const tripResult = ctx.resolveTrip(actor, gameState, targetId, 0);
  if (tripResult.success) {
    strikeResult.message += ` ${tripResult.message}`;
  }

  return strikeResult;
}

/**
 * Brutish Shove (Level 2)
 * Shove success: target is also off-guard until end of next turn.
 */
export function resolveBrutishShove(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  // Check for Brutish Shove feat
  const hasFeature = ctx.hasFeat(actor, 'brutish shove');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Brutish Shove.`);
  }

  // Perform normal Shove
  const shoveResult = ctx.resolveShove(actor, gameState, targetId, heroPointsSpent);
  
  if (!shoveResult.success) {
    return shoveResult;
  }

  // Apply off-guard condition if Shove succeeded
  const target = gameState.creatures.find(c => c.id === targetId);
  if (target) {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'off-guard',
      duration: 1,
      source: `brutish-shove-${actor.id}`,
      expiresOnTurnEndOf: actor.id,
    });
    
    shoveResult.message += ` ${target.name} is also off-guard until the end of your next turn!`;
  }

  return shoveResult;
}

/**
 * Dueling Parry (Level 2)
 * 1-action. +2 circumstance AC while wielding 1-handed weapon with free hand.
 */
export function resolveDuelingParry(ctx: FeatActionContext, actor: Creature): any {
  // Check for Dueling Parry feat
  const hasFeature = ctx.hasFeat(actor, 'dueling parry');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Dueling Parry.`);
  }

  // Check if using 1-handed weapon with free hand
  const heldWeapons = actor.weaponInventory?.filter(s => s.state === 'held') || [];
  if (heldWeapons.length === 0) {
    return fail(`${actor.name} must be wielding a weapon for Dueling Parry.`);
  }

  // Must have one held weapon and free hand
  if (heldWeapons.length > 1) {
    return fail(`${actor.name} cannot have more than one held weapon for Dueling Parry.`);
  }

  // Check if free hand requirement is met
  const handsUsed = actor.handsUsed ?? 0;
  if (handsUsed >= 2) {
    return fail(`${actor.name} must have a free hand for Dueling Parry.`);
  }

  // Apply +2 circumstance bonus to AC
  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses.push({
    source: 'dueling-parry',
    value: 2,
    type: 'circumstance',
    applyTo: 'ac',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} assumes a dueling stance! +2 circumstance bonus to AC until end of turn.`,
  };
}

/**
 * Lunge (Level 2)
 * 1-action. Extend reach by 5 feet for next Strike.
 */
export function resolveLunge(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Lunge feat
  const hasFeature = ctx.hasFeat(actor, 'lunge');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Lunge.`);
  }

  // Apply extended reach bonus
  if (!actor.bonuses) actor.bonuses = [];
  const weapon = ctx.resolveSelectedWeapon(actor, weaponId);
  const baseReach = getEffectiveReach(actor, weapon) * 5; // Convert squares to feet
  
  actor.bonuses.push({
    source: 'lunge',
    value: 5,
    type: 'circumstance',
    applyTo: `reach:${weapon?.id || 'unarmed'}`,
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} lunges forward, extending their reach by 5 feet for the next Strike.`,
  };
}

/**
 * Twin Parry (Level 4)
 * 1-action. +1 circumstance AC while dual wielding (or +2 if parry trait).
 */
export function resolveTwinParry(ctx: FeatActionContext, actor: Creature): any {
  // Check for Twin Parry feat
  const hasFeature = ctx.hasFeat(actor, 'twin parry');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Twin Parry.`);
  }

  // Required: dual wielding
  const heldWeapons = actor.weaponInventory?.filter(s => s.state === 'held') || [];
  if (heldWeapons.length < 2) {
    return fail(`${actor.name} must have two weapons held for Twin Parry.`);
  }

  // Check for parry trait
  let acBonus = 1;
  const hasParryTrait = heldWeapons.some(s => 
    s.weapon.traits && s.weapon.traits.some(t => 
      typeof t === 'string' && t.toLowerCase() === 'parry'
    )
  );
  if (hasParryTrait) {
    acBonus = 2;
  }

  // Apply bonus
  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses.push({
    source: 'twin-parry',
    value: acBonus,
    type: 'circumstance',
    applyTo: 'ac',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} parries with both weapons! +${acBonus} circumstance bonus to AC until end of turn.`,
  };
}

/**
 * Shatter Defenses (Level 4)
 * 1-action Press. Strike a frightened target, and on hit, they become off-guard
 * for the remainder of the current turn.
 * PF2e Remaster: Requires a frightened target (not off-guard).
 */

/**
 * Shatter Defenses (Level 4)
 * 1-action Press. Strike a frightened target, and on hit, they become off-guard
 * for the remainder of the current turn.
 * PF2e Remaster: Requires a frightened target (not off-guard).
 */
export function resolveShatterDefenses(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Shatter Defenses feat
  const hasFeature = ctx.hasFeat(actor, 'shatter defenses');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Shatter Defenses.`);
  }

  // Press trait: must have already attacked this turn
  if ((actor.attacksMadeThisTurn ?? 0) < 1) {
    return fail(`${actor.name} must make at least one Strike before using Shatter Defenses (Press trait).`);
  }

  if (!targetId) {
    return fail('No target specified.');
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return fail('Target not found.');
  }

  // PF2e: Requires target to be frightened (not off-guard)
  const targetIsFrightened = target.conditions?.some(c => c.name === 'frightened');
  if (!targetIsFrightened) {
    return fail(`${target.name} must be frightened for Shatter Defenses.`);
  }

  // Perform the strike
  const strikeResult = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  if (!strikeResult.success) {
    return strikeResult;
  }

  // Apply off-guard to all (long-lasting)
  if (target) {
    // Check if target already has the extended off-guard
    const existingOffGuard = target.conditions?.find(c => c.name === 'off-guard' && c.source === `shatter-defenses-${actor.id}`);
    if (!existingOffGuard) {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({
        name: 'off-guard',
        duration: 1,
        source: `shatter-defenses-${actor.id}`,
        expiresOnTurnEndOf: actor.id,
      });
    }
    
    strikeResult.message += ` ${target.name} is off-guard to all attacks until the end of your next turn!`;
  }

  return strikeResult;
}

/**
 * Helper method to check if a creature has a specific fighter feat.
 * Uses exact name matching (case-insensitive) to avoid false positives.
 * e.g. searching for 'reactive shield' won't match 'Reactive Strike'.
 */


/**
 * Armor Specialization (Level 6)
 * Receive damage reduction equal to the armor's hardness while wearing armor.
 * Activates as a passive bonus (no action required).
 */

/**
 * Helper method to check if a creature has a specific fighter feat.
 * Uses exact name matching (case-insensitive) to avoid false positives.
 * e.g. searching for 'reactive shield' won't match 'Reactive Strike'.
 */


/**
 * Armor Specialization (Level 6)
 * Receive damage reduction equal to the armor's hardness while wearing armor.
 * Activates as a passive bonus (no action required).
 */
export function resolveArmorSpecialization(ctx: FeatActionContext, actor: Creature): any {
  // Check for Armor Specialization feat
  const hasFeature = ctx.hasFeat(actor, 'armor specialization');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Armor Specialization.`);
  }

  // Get equipped armor
  const equippedArmor = actor.equippedShield ? 'shield' : 'armor';
  if (!actor.equippedShield && !actor.armorBonus) {
    return fail(`${actor.name} is not wearing armor to benefit from Armor Specialization.`);
  }

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} is benefiting from Armor Specialization. Damage reduction is applied to all incoming damage.`,
    effect: 'armor-specialization-active',
  };
}

/**
 * Fearless / Bravery (Fighter Class Feature, Level 3+)
 * Success on Will saves against fear effects counts as a critical success.
 * Reduce frightened condition value by 1 if already frightened.
 * PF2e Remaster: This is the Fighter's Bravery class feature.
 */

/**
 * Fearless / Bravery (Fighter Class Feature, Level 3+)
 * Success on Will saves against fear effects counts as a critical success.
 * Reduce frightened condition value by 1 if already frightened.
 * PF2e Remaster: This is the Fighter's Bravery class feature.
 */
export function resolveFearless(ctx: FeatActionContext, actor: Creature): any {
  // Check for Fearless/Bravery feat or class feature
  const hasFeature = ctx.hasFeat(actor, 'fearless') || ctx.hasFeat(actor, 'bravery');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Bravery/Fearless.`);
  }

  // Check if frightened
  const frightenedCondition = actor.conditions?.find(c => c.name === 'frightened');
  
  if (frightenedCondition) {
    // Reduce frightened value by 1 (minimum 0, then remove)
    const newValue = (frightenedCondition.value ?? 1) - 1;
    if (newValue <= 0) {
      actor.conditions = actor.conditions.filter(c => c.name !== 'frightened');
      return {
        success: true,
        message: `Ã”Â£Ã´ ${actor.name} overcomes their fear! Frightened condition removed.`,
      };
    } else {
      frightenedCondition.value = newValue;
      return {
        success: true,
        message: `Ã”Â£Ã´ ${actor.name}'s fear is reduced! Now Frightened ${newValue}.`,
      };
    }
  }

  // Add immunity to future fear effects
  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses.push({
    source: 'fearless',
    value: 999, // Functionally infinity - prevents fear
    type: 'untyped',
    applyTo: 'fear-immunity',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} is now fearless and immune to fear effects!`,
  };
}

/**
 * Weapon Mastery (Level 8)
 * Unlock critical specialization effects for all weapons. 
 * This is a passive ability that modifies weapon behavior on critical hits.
 */

/**
 * Weapon Mastery (Level 8)
 * Unlock critical specialization effects for all weapons. 
 * This is a passive ability that modifies weapon behavior on critical hits.
 */
export function resolveWeaponMastery(ctx: FeatActionContext, actor: Creature): any {
  // Check for Weapon Mastery feat
  const hasFeature = ctx.hasFeat(actor, 'weapon mastery');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Weapon Mastery.`);
  }

  // Mark the actor as having Weapon Mastery
  // This will be checked during damage calculation to apply critical specialization effects
  if (!actor.bonuses) actor.bonuses = [];
  
  // Check if already marked
  const alreadyHas = actor.bonuses.some(b => b.source === 'weapon-mastery');
  if (alreadyHas) {
    return {
      success: true,
      message: `${actor.name} already has Weapon Mastery active.`,
    };
  }

  actor.bonuses.push({
    source: 'weapon-mastery',
    value: 1,
    type: 'untyped',
    applyTo: 'critical-specialization',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} unlocks Weapon Mastery! Critical strikes now apply critical specialization effects.`,
    effect: 'weapon-mastery-active',
  };
}

/**
 * Flexible Flurry (Level 10)
 * You can use multiple different weapons in a single turn without MAP penalties accumulating.
 * Each weapon type (or weapon group) resets the MAP counter for that weapon.
 */

/**
 * Flexible Flurry (Level 10)
 * You can use multiple different weapons in a single turn without MAP penalties accumulating.
 * Each weapon type (or weapon group) resets the MAP counter for that weapon.
 */
export function resolveFlexibleFlurry(ctx: FeatActionContext, actor: Creature): any {
  // Check for Flexible Flurry feat
  const hasFeature = ctx.hasFeat(actor, 'flexible flurry');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Flexible Flurry.`);
  }

  // Track which weapons have been used this turn for MAP purposes
  const mapByWeapon = new Map<string, number>();
  
  actor.feats?.forEach((f: any) => {
    const name = typeof f === 'string' ? f : f?.name;
    if (typeof name === 'string' && name.toLowerCase().includes('flexible flurry')) {
      // Store reference to weapon-specific MAP tracking
      actor.mapByWeapon = mapByWeapon;
    }
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} activates Flexible Flurry! Multiple attack patterns are now possible without full MAP penalties.`,
    effect: 'flexible-flurry-active',
  };
}

/**
 * Iron Will (Fighter Class Feature, Level 9)
 * Your mental fortitude is legendary. Your Will save proficiency increases to expert.
 * PF2e Remaster: This is a class feature granting expert Will saves, not a feat. 
 * Implemented as +2 status bonus to Will saves for simplicity.
 */

/**
 * Iron Will (Fighter Class Feature, Level 9)
 * Your mental fortitude is legendary. Your Will save proficiency increases to expert.
 * PF2e Remaster: This is a class feature granting expert Will saves, not a feat. 
 * Implemented as +2 status bonus to Will saves for simplicity.
 */
export function resolveIronWill(ctx: FeatActionContext, actor: Creature, heroPointsSpent?: number): any {
  // Check for Iron Will class feature
  const hasFeature = ctx.hasFeat(actor, 'iron will');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Iron Will.`);
  }

  // PF2e: Expert proficiency = +2 over trained. Apply as status bonus.
  const bonus = 2;
  
  // Apply as status bonus to Will saves
  if (!actor.bonuses) actor.bonuses = [];
  const existing = actor.bonuses.some(b => b.source === 'iron-will');
  if (existing) {
    return {
      success: true,
      message: `${actor.name} already has Iron Will active (+${bonus} status bonus to Will saves).`,
    };
  }

  actor.bonuses.push({
    source: 'iron-will',
    value: bonus,
    type: 'status',
    applyTo: 'will',
  });

  let message = `Ã”Â£Ã´ ${actor.name} hardens their will! +${bonus} status bonus to Will saves.`;

  // Optional: spend hero points for additional resistance
  if (heroPointsSpent && heroPointsSpent > 0) {
    const hpBonus = heroPointsSpent;
    actor.bonuses.push({
      source: 'iron-will-heropoint',
      value: hpBonus,
      type: 'untyped',
      applyTo: 'will',
    });
    message += ` Additional +${hpBonus} from hero points!`;
    actor.heroPoints = (actor.heroPoints ?? 0) - heroPointsSpent;
  }

  return {
    success: true,
    message,
    bonus,
    ...(heroPointsSpent && { heroPointsSpent }),
  };
}

/**
 * Reflexive Shield (Level 10)
 * You can raise your shield as a free action when you are targeted by an attack.
 * This must happen before the attack roll.
 */

/**
 * Reflexive Shield (Level 10)
 * You can raise your shield as a free action when you are targeted by an attack.
 * This must happen before the attack roll.
 */
export function resolveReflexiveShield(ctx: FeatActionContext, actor: Creature): any {
  // Check for Reflexive Shield feat
  const hasFeature = ctx.hasFeat(actor, 'reflexive shield');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Reflexive Shield.`);
  }

  // Check if shield is equipped
  if (!actor.equippedShield) {
    return fail(`${actor.name} must have a shield equipped to benefit from Reflexive Shield.`);
  }

  // Raise shield if not already raised
  if (actor.shieldRaised) {
    return {
      success: true,
      message: `${actor.name}'s shield is already raised.`,
    };
  }

  actor.shieldRaised = true;

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name}'s shield raises reflexively! Shield is now raised and ready to block.`,
    effect: 'reflexive-shield-ready',
  };
}

/**
 * Improved Reflexes (Level 12)
 * Gain an extra reaction each round. Can be used for Reactive Strike or Shield Block.
 */
export function resolveImprovedReflexes(ctx: FeatActionContext, actor: Creature): any {
  // Check for Improved Reflexes feat
  const hasFeature = ctx.hasFeat(actor, 'improved reflexes');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Improved Reflexes.`);
  }

  // Grant extra reaction capacity
  if (!actor.bonuses) actor.bonuses = [];
  const existing = actor.bonuses.some(b => b.source === 'improved-reflexes');
  if (existing) {
    return {
      success: true,
      message: `${actor.name} already has Improved Reflexes active.`,
    };
  }

  actor.bonuses.push({
    source: 'improved-reflexes',
    value: 1,
    type: 'untyped',
    applyTo: 'extra-reaction',
  });

  // Mark that the fighter has an extra reaction this round
  actor.extraReactionsAvailable = 1;

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name}'s reflexes sharpen! Gains an additional reaction this round.`,
    effect: 'improved-reflexes-active',
  };
}

/**
 * Reaction Enhancement (Higher-level Fighter class feature)
 * Enhances reaction abilities with bonuses.
 * Requires the 'reaction enhancement' feat/feature specifically.
 */

/**
 * Reaction Enhancement (Higher-level Fighter class feature)
 * Enhances reaction abilities with bonuses.
 * Requires the 'reaction enhancement' feat/feature specifically.
 */
export function resolveReactionEnhancement(ctx: FeatActionContext, actor: Creature): any {
  // Check for Reaction Enhancement - must exactly match
  const hasFeature = ctx.hasFeat(actor, 'reaction enhancement');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Reaction Enhancement.`);
  }

  // Grant bonuses to reaction-based abilities
  if (!actor.bonuses) actor.bonuses = [];
  
  actor.bonuses.push({
    source: 'reaction-enhancement',
    value: 1,
    type: 'circumstance',
    applyTo: 'reaction',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} enhances their reaction abilities! +1 circumstance bonus to reaction-based checks.`,
    effect: 'reaction-enhancement-active',
  };
}

/**
 * Reactive Shield (Level 1)
 * Reaction. Raise your shield as a reaction when you're targeted by an attack.
 */
export function resolveReactiveShield(ctx: FeatActionContext, actor: Creature): any {
  // Check for Reactive Shield feat
  const hasFeature = ctx.hasFeat(actor, 'reactive shield');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Reactive Shield.`);
  }

  // Check if shield equipped
  if (!actor.equippedShield) {
    return fail(`${actor.name} must have a shield equipped for Reactive Shield.`);
  }

  // Check if reaction already used
  if (actor.reactionUsed) {
    return fail(`${actor.name} has already used their reaction this round.`);
  }

  actor.reactionUsed = true;
  actor.shieldRaised = true;

  return {
    success: true,
    message: `Ã”ÃœÃ­ REACTION: ${actor.name} raises their shield reactively!`,
  };
}

/**
 * Cleaving Finish (Level 4 Reaction)
 * Reaction trigger: Your melee Strike kills a creature or knocks it unconscious.
 * Effect: Make a melee Strike against another creature adjacent to the original target.
 * PF2e: This is a Reaction, NOT a Flourish. It triggers only when you down an enemy.
 */

/**
 * Cleaving Finish (Level 4 Reaction)
 * Reaction trigger: Your melee Strike kills a creature or knocks it unconscious.
 * Effect: Make a melee Strike against another creature adjacent to the original target.
 * PF2e: This is a Reaction, NOT a Flourish. It triggers only when you down an enemy.
 */
export function resolveCleavingFinish(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Cleaving Finish feat
  const hasFeature = ctx.hasFeat(actor, 'cleaving finish');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Cleaving Finish.`);
  }

  // Reaction: check if reaction used this round
  if (actor.reactionUsed) {
    return fail(`${actor.name} has already used their reaction this round.`);
  }

  actor.reactionUsed = true;

  if (!targetId) {
    return fail('No target specified for Cleaving Finish follow-up strike.');
  }

  // Make the follow-up melee strike against an adjacent target
  const strike = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  return {
    success: strike.success,
    message: `Ã”ÃœÃ­ REACTION: ${actor.name} cleaves through to the next target! ${strike.message}`,
    details: strike.details,
  };
}

/**
 * Intimidating Prowess (Skill Feat, Level 2)
 * Your physical might enhances your Intimidation.
 * PF2e: Adds STR modifier as a circumstance bonus to Intimidation (Demoralize)
 * if your STR score is at least 16 (+3). Requires trained in Intimidation.
 */

/**
 * Intimidating Prowess (Skill Feat, Level 2)
 * Your physical might enhances your Intimidation.
 * PF2e: Adds STR modifier as a circumstance bonus to Intimidation (Demoralize)
 * if your STR score is at least 16 (+3). Requires trained in Intimidation.
 */
export function resolveIntimidatingProwess(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  // Check for Intimidating Prowess feat
  const hasFeature = ctx.hasFeat(actor, 'intimidating prowess');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Intimidating Prowess.`);
  }

  // Apply STR modifier as circumstance bonus to Demoralize
  const strMod = actor.abilities?.strength ?? 0;

  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses.push({
    source: 'intimidating-prowess',
    value: strMod,
    type: 'circumstance',
    applyTo: 'demoralize',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} radiates intimidating prowess! +${strMod} circumstance bonus to Demoralize (STR mod).`,
    bonus: strMod,
  };
}

/**
 * Shield Warden (Level 6 Fighter/Champion feat)
 * Reaction trigger: An ally within your shield's reach is hit or critically hit by a Strike.
 * Effect: You can use Shield Block to reduce damage to the ally instead of yourself.
 * PF2e Remaster: Extends Shield Block to protect adjacent allies.
 */

/**
 * Shield Warden (Level 6 Fighter/Champion feat)
 * Reaction trigger: An ally within your shield's reach is hit or critically hit by a Strike.
 * Effect: You can use Shield Block to reduce damage to the ally instead of yourself.
 * PF2e Remaster: Extends Shield Block to protect adjacent allies.
 */
export function resolveShieldWarden(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string
): any {
  // Check for Shield Warden feat
  const hasFeature = ctx.hasFeat(actor, 'shield warden');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Shield Warden.`);
  }

  // Check if reaction available
  if (actor.reactionUsed) {
    return fail(`${actor.name} has already used their reaction this round.`);
  }

  // Must have a shield raised
  if (!actor.equippedShield || !actor.shieldRaised) {
    return fail(`${actor.name} must have a shield raised for Shield Warden.`);
  }

  // Find ally
  if (!targetId) {
    return fail('No ally specified for Shield Warden.');
  }

  const ally = gameState.creatures.find(c => c.id === targetId);
  if (!ally) {
    return fail('Target not found.');
  }

  actor.reactionUsed = true;

  // Shield Block damage reduction applies to ally (shield hardness)
  // Typical shield hardness: 3-5 for steel shields
  const shieldHardness = actor.armorBonus >= 2 ? 5 : 3;
  
  return {
    success: true,
    message: `Ã”ÃœÃ­ REACTION: ${actor.name} interposes their shield to protect ${ally.name}! Shield Block reduces damage by ${shieldHardness}.`,
    damageReduced: shieldHardness,
  };
}

/**
 * Weapon Supremacy (Level 10)
 * Unlock the full potential of your weapons with enhanced critical strengths.
 */
export function resolveWeaponSupremacy(ctx: FeatActionContext, actor: Creature): any {
  // Check for Weapon Supremacy feat
  const hasFeature = ctx.hasFeat(actor, 'weapon supremacy');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Weapon Supremacy.`);
  }

  if (!actor.bonuses) actor.bonuses = [];
  const existing = actor.bonuses.some(b => b.source === 'weapon-supremacy');
  if (existing) {
    return {
      success: true,
      message: `${actor.name} already has Weapon Supremacy active.`,
    };
  }

  actor.bonuses.push({
    source: 'weapon-supremacy',
    value: 1,
    type: 'untyped',
    applyTo: 'critical-specialization-enhanced',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} achieves Weapon Supremacy! Critical specialization effects are enhanced.`,
    effect: 'weapon-supremacy-active',
  };
}

/**
 * Legendary Weapon (Level 10)
 * You become legendary with one weapon group. Strikes with that group ignore resistances of up to 5.
 */
export function resolveLegendaryWeapon(ctx: FeatActionContext, actor: Creature): any {
  // Check for Legendary Weapon feat
  const hasFeature = ctx.hasFeat(actor, 'legendary weapon');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Legendary Weapon.`);
  }

  // Mark which weapon group (defaulted to equipped weapon's group)
  const equipped = actor.equippedWeapon ? actor.weaponInventory?.find(w => w.weapon.id === actor.equippedWeapon) : null;
  const weaponName = equipped?.weapon.display ?? 'unarmed';

  if (!actor.bonuses) actor.bonuses = [];
  actor.bonuses.push({
    source: 'legendary-weapon',
    value: 5,
    type: 'untyped',
    applyTo: `penetrate-resistance:${weaponName}`,
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} has achieved legendary mastery! ${weaponName} now ignores resistances up to 5.`,
    weaponFocus: weaponName,
  };
}

/**
 * Berserk Striker (Level 12)
 * When you Strike and miss by 4 or less, spend hero point to reroll once.
 */
export function resolveBerserkStrike(ctx: FeatActionContext, actor: Creature,
  heroPointsSpent?: number
): any {
  // Check for Berserk Striker feat
  const hasFeature = ctx.hasFeat(actor, 'berserk striker');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Berserk Striker.`);
  }

  const availableHeroPoints = actor.heroPoints ?? 0;
  if (availableHeroPoints < 1) {
    return fail(`${actor.name} needs at least 1 hero point for Berserk Striker.`);
  }

  actor.heroPoints = availableHeroPoints - 1;

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} rerolls their attack with berserk fury! (Spent 1 hero point)`,
    heroPointsSpent: 1,
    effect: 'berserk-striker-reroll',
  };
}

/**
 * Reactive Assault (Level 12)
 * Reaction. When a creature misses you with a melee attack, Strike it in retaliation.
 */
export function resolveReactiveAssault(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Reactive Assault feat
  const hasFeature = ctx.hasFeat(actor, 'reactive assault');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Reactive Assault.`);
  }

  // Check if reaction available
  if (actor.reactionUsed) {
    return fail(`${actor.name} has already used their reaction this round.`);
  }

  actor.reactionUsed = true;

  if (!targetId) {
    return fail('No target specified for Reactive Assault.');
  }

  // Make a strike against the creature that missed
  const strike = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  
  return {
    success: strike.success,
    message: `Ã”ÃœÃ­ REACTION: ${actor.name} retaliates! ${strike.message}`,
    details: strike.details,
  };
}

/**
 * Close Quarters Shot (Level 8 Fighter feat)
 * You can make ranged Strikes while within reach of a foe without triggering
 * Reactive Strike. You also don't take the -2 penalty for making ranged Strikes
 * within your weapon's second and third range increments against a target within
 * your melee reach.
 * PF2e: This is a passive benefit, not an attack bonus.
 */

/**
 * Close Quarters Shot (Level 8 Fighter feat)
 * You can make ranged Strikes while within reach of a foe without triggering
 * Reactive Strike. You also don't take the -2 penalty for making ranged Strikes
 * within your weapon's second and third range increments against a target within
 * your melee reach.
 * PF2e: This is a passive benefit, not an attack bonus.
 */
export function resolveCloseQuartersShot(ctx: FeatActionContext, actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  heroPointsSpent?: number
): any {
  // Check for Close Quarters Shot feat
  const hasFeature = ctx.hasFeat(actor, 'close quarters shot');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Close Quarters Shot.`);
  }

  // Verify we have a ranged weapon
  const weapon = ctx.resolveSelectedWeapon(actor, weaponId);
  if (!weapon || weapon.attackType !== 'ranged') {
    return fail(`${actor.name} must have a ranged weapon for Close Quarters Shot.`);
  }

  // Make ranged strike Ã”Ã‡Ã¶ no AoO triggers and no range penalty in close quarters
  const strike = ctx.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);

  return {
    success: strike.success,
    message: `Ã”Â£Ã´ ${actor.name} fires at close range without penalty! ${strike.message}`,
    details: strike.details,
  };
}

/**
 * Blade Ally (Level 4)
 * You have an weapon ally that provides bonuses to combat.
 * +1 item bonus to attacks with that weapon, or +2 if 2d6 or larger and wielded two-handed.
 */

/**
 * Blade Ally (Level 4)
 * You have an weapon ally that provides bonuses to combat.
 * +1 item bonus to attacks with that weapon, or +2 if 2d6 or larger and wielded two-handed.
 */
export function resolveBladeAlly(ctx: FeatActionContext, actor: Creature): any {
  // Check for Blade Ally feat
  const hasFeature = ctx.hasFeat(actor, 'blade ally');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Blade Ally.`);
  }

  // Need to designate a weapon
  const equipped = actor.equippedWeapon;
  if (!equipped) {
    return fail(`${actor.name} must wield a weapon to benefit from Blade Ally.`);
  }

  if (!actor.bonuses) actor.bonuses = [];
  const existing = actor.bonuses.some(b => b.source === 'blade-ally');
  if (existing) {
    return {
      success: true,
      message: `${actor.name}'s Blade Ally is already active.`,
    };
  }

  // Determine bonus value based on weapon size
  const weapon = actor.weaponInventory?.find(w => w.weapon.id === equipped);
  let bonus = 1;
  if (weapon && actor.handsUsed && actor.handsUsed >= 2) {
    // Two-handed bonus
    bonus = 2;
  }

  actor.bonuses.push({
    source: 'blade-ally',
    value: bonus,
    type: 'item',
    applyTo: `attack:${equipped}`,
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name}'s Blade Ally enhances their weapon! +${bonus} item bonus to attacks.`,
    bonus,
  };
}

/**
 * Versatile Heritage (Level 6)
 * You've trained your body and mind to move fluidly through battle.
 * +1 circumstance AC when you're not restrained and not in heavy armor.
 */

/**
 * Versatile Heritage (Level 6)
 * You've trained your body and mind to move fluidly through battle.
 * +1 circumstance AC when you're not restrained and not in heavy armor.
 */
export function resolveVersatileHeritage(ctx: FeatActionContext, actor: Creature, weaponId?: string): any {
  // Check for Versatile Heritage feat
  const hasFeature = ctx.hasFeat(actor, 'versatile heritage');
  if (!hasFeature) {
    return fail(`${actor.name} does not have Versatile Heritage.`);
  }

  // Check if already applied
  if (!actor.bonuses) actor.bonuses = [];
  const existing = actor.bonuses.some(b => b.source === 'versatile-heritage');
  if (existing) {
    return {
      success: true,
      message: `${actor.name} already has Versatile Heritage active.`,
    };
  }

  actor.bonuses.push({
    source: 'versatile-heritage',
    value: 1,
    type: 'circumstance',
    applyTo: 'ac',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} moves fluidly through battle! +1 circumstance AC (if not restrained/heavy armor).`,
  };
}

/**
 * Duelist's Expertise (Level 2)
 * +1 circumstance AC when wielding and using a one-handed weapon without a shield.
 * +1 circumstance bonus to Riposte counterattacks.
 */

/**
 * Duelist's Expertise (Level 2)
 * +1 circumstance AC when wielding and using a one-handed weapon without a shield.
 * +1 circumstance bonus to Riposte counterattacks.
 */
export function resolveDuelistsExpertise(ctx: FeatActionContext, actor: Creature): any {
  // Check for Duelist's Expertise feat
  const hasFeature = ctx.hasFeat(actor, "duelist's expertise");
  if (!hasFeature) {
    return fail(`${actor.name} does not have Duelist's Expertise.`);
  }

  if (!actor.bonuses) actor.bonuses = [];
  const existing = actor.bonuses.some(b => b.source === 'duelists-expertise');
  if (existing) {
    return {
      success: true,
      message: `${actor.name}'s Duelist's Expertise is already active.`,
    };
  }

  // Verify one-handed weapon with no shield
  const equipped = actor.equippedWeapon;
  if (!equipped) {
    return fail(`${actor.name} must wield a one-handed weapon for Duelist's Expertise.`);
  }

  actor.bonuses.push({
    source: 'duelists-expertise',
    value: 1,
    type: 'circumstance',
    applyTo: 'ac',
  });

  return {
    success: true,
    message: `Ã”Â£Ã´ ${actor.name} assumes a duelist's stance! +1 circumstance AC (one-handed weapon, no shield).`,
  };
}

/**
 * Pushing Strike (Level 1) Ã”Ã‡Ã¶ PLACEHOLDER
 * NOT YET IMPLEMENTED: Attack action that pushes enemy back 5 feet on hit.
 */
