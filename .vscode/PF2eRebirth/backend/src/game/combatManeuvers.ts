// Combat Maneuvers - extracted from RulesEngine
// Contains skill-based combat maneuvers and DC helper functions.
// Maneuver functions follow ManeuverContext pattern: (ctx, actor, gameState, ...) => any
// DC helpers are standalone pure functions.

import { Creature, GameState, CreatureWeapon, AbilityScores, rollD20, getDegreeOfSuccess, calculateSaveBonus, getProficiencyBonus } from 'pf2e-shared';

// ——— Shared ok/fail helpers ———
function ok(message: string, extra?: Record<string, unknown>): { success: true; message: string; [key: string]: unknown } {
  return { success: true, message, ...extra };
}

function fail(message: string, errorCode?: string): { success: false; message: string; errorCode?: string; [key: string]: unknown } {
  return errorCode
    ? { success: false, message, errorCode }
    : { success: false, message };
}

// ——— Maneuver Context Interface ———
export interface ManeuverContext {
  getMapPenalty(attacker: Creature, selectedWeapon?: CreatureWeapon | null): number;
  spendHeroPoints(creature: Creature, heroPointsSpent: number, currentRoll: any): any;
  rollSave(creature: Creature, saveType: 'reflex' | 'fortitude' | 'will', saveDC: number, heroPointsSpent?: number): {
    d20: number; bonus: number; total: number; result: string;
  };
}

// ——— DC & Skill Helper Functions ———

/**
 * Take Cover - Gain protection from ranged attacks
 * If prone: Hunker down for +4 AC vs ranged (but still off-guard)
 * If not prone: Gain +2 AC with cover (requires cover nearby, simplified to always succeed)
 */
export function resolveTakeCover(actor: Creature): any {
  const isProne = actor.conditions?.some((c) => c.name === 'prone') || false;

  if (isProne) {
    // Hunker down while prone
    const existingHunker = actor.conditions?.find((c) => c.name === 'hunker-down');
    if (existingHunker) {
      return {
        success: false,
        message: `${actor.name} is already hunkered down!`,
      };
    }

    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'hunker-down',
      duration: 'permanent',
      source: 'take-cover',
    });

    return {
      success: true,
      message: `­ƒ¬Á ${actor.name} hunkers down! Gains **+4 AC vs ranged attacks** (still off-guard to all attacks).`,
    };
  } else {
    // Normal take cover (requires cover nearby - simplified to always succeed)
    const existingCover = actor.conditions?.find((c) => c.name === 'cover');
    if (existingCover) {
      return {
        success: false,
        message: `${actor.name} is already taking cover!`,
      };
    }

    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'cover',
      duration: 'permanent',
      source: 'take-cover',
    });

    return {
      success: true,
      message: `­ƒ¬Á ${actor.name} takes cover! Gains **+2 AC** from cover.`,
    };
  }
}

/**
 * Get a creature's skill bonus (ability mod + proficiency bonus + item bonuses)
 */
export function getSkillBonus(creature: Creature, skillName: string): number {
  // Try to find the skill in the creature's skills array (from Pathbuilder import)
  const skill = creature.skills?.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
  
  if (skill) {
    return skill.bonus; // Use precomputed bonus from Pathbuilder
  }

  // Fallback: compute manually
  // For Deception, use CHA modifier
  const abilityMap: Record<string, keyof AbilityScores> = {
    'deception': 'charisma',
    'perception': 'wisdom',
    'intimidation': 'charisma',
    'diplomacy': 'charisma',
    'athletics': 'strength',
    'acrobatics': 'dexterity',
  };

  const abilityKey = abilityMap[skillName.toLowerCase()] || 'charisma';
  const abilityMod = creature.abilities?.[abilityKey] ?? 0;
  
  // Default to trained proficiency if not found
  const profBonus = getProficiencyBonus('trained', creature.level);
  
  return abilityMod + profBonus;
}

/**
 * Calculate a creature's Perception DC (10 + Perception modifier)
 * Includes Fighter Battlefield Surveyor feat (+2 Perception) if applicable
 */
export function getPerceptionDC(creature: Creature): number {
  // Try to find Perception in skills array
  const perceptionSkill = creature.skills?.find((s) => s.name.toLowerCase() === 'perception');
  
  if (perceptionSkill) {
    let bonus = perceptionSkill.bonus;
    
    // PHASE 5.1: FIGHTER BATTLEFIELD SURVEYOR
    // Fighters can take Battlefield Surveyor at level 2+: +2 Perception
    const hasBattlefieldSurveyor = creature.feats?.some((f) => f.name.toLowerCase().includes('battlefield surveyor'));
    if (hasBattlefieldSurveyor) {
      bonus += 2;
    }
    
    return 10 + bonus;
  }

  // Fallback: compute manually
  const wisMod = creature.abilities?.wisdom ?? 0;
  const profBonus = getProficiencyBonus(creature.proficiencies?.perception ?? 'trained', creature.level);
  let perception = wisMod + profBonus;
  
  // PHASE 5.1: FIGHTER BATTLEFIELD SURVEYOR
  // Fighters can take Battlefield Surveyor at level 2+: +2 Perception
  const hasBattlefieldSurveyor = creature.feats?.some((f) => f.name.toLowerCase().includes('battlefield surveyor'));
  if (hasBattlefieldSurveyor) {
    perception += 2;
  }
  
  return 10 + perception;
}

/**
 * Calculate a creature's Will DC (10 + Will save modifier)
 */
export function getWillDC(creature: Creature): number {
  const willMod = calculateSaveBonus(creature, 'will');
  return 10 + willMod;
}

/**
 * Calculate a creature's Reflex DC (10 + Reflex save modifier)
 */
export function getReflexDC(creature: Creature): number {
  const reflexMod = calculateSaveBonus(creature, 'reflex');
  return 10 + reflexMod;
}

/**
 * Calculate a creature's Fortitude DC (10 + Fortitude save modifier)
 */
export function getFortitudeDC(creature: Creature): number {
  const fortitudeMod = calculateSaveBonus(creature, 'fortitude');
  return 10 + fortitudeMod;
}

// ——— Combat Maneuver Functions ———

/**
 * Feint - Make a Deception check against the target's Perception DC
 * Success: Target is flat-footed (off-guard) against your melee attacks until end of your next turn
 * Critical Success: Target is flat-footed against all your attacks until end of your next turn
 */
export function resolveFeint(
  ctx: ManeuverContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  if (!targetId) {
    return fail('No target specified for Feint!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Get Deception skill bonus
  const deceptionBonus = getSkillBonus(actor, 'Deception');
  const perceptionDC = getPerceptionDC(target);

  // Roll Deception check
  const d20 = rollD20();
  let total = d20 + deceptionBonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(actor, heroPointsSpent, {
      d20,
      bonus: deceptionBonus,
      total,
      result: 'pending',
    });

    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }
  const margin = total - perceptionDC;

  const result = getDegreeOfSuccess(finalD20, total, perceptionDC);

  let message = '';

  if (result === 'critical-success') {
    // Target is off-guard vs the actor's melee attacks until end of actor's next turn
    target.conditions = target.conditions || [];
    const cond = {
      name: 'off-guard',
      duration: 'permanent' as const,
      source: `Feint from ${actor.name}`,
      appliesAgainst: actor.id,
      attackType: 'melee' as const,
      expiresOnTurnEndOf: actor.id,
      turnEndsRemaining: 2,
    };
    target.conditions.push(cond);
    console.log(`\n­ƒÄ¡ [FEINT CRIT SUCCESS] Applied off-guard to ${target.name}:`, JSON.stringify(cond));
    message = `­ƒÄ¡ CRITICAL SUCCESS! ${actor.name} feints masterfully! ${target.name} is OFF-GUARD against ${actor.name}'s melee attacks until end of ${actor.name}'s next turn!`;
  } else if (result === 'success') {
    // Target is off-guard vs the actor's next melee attack before end of current turn
    target.conditions = target.conditions || [];
    const cond = {
      name: 'off-guard',
      duration: 'permanent' as const,
      source: `Feint from ${actor.name}`,
      appliesAgainst: actor.id,
      attackType: 'melee' as const,
      usesRemaining: 1,
      expiresOnTurnEndOf: actor.id,
      turnEndsRemaining: 1,
    };
    target.conditions.push(cond);
    console.log(`\n­ƒÄ¡ [FEINT SUCCESS] Applied off-guard to ${target.name}:`, JSON.stringify(cond));
    message = `­ƒÄ¡ SUCCESS! ${actor.name} feints ${target.name}! ${target.name} is OFF-GUARD against ${actor.name}'s next melee attack before end of ${actor.name}'s current turn!`;
  } else if (result === 'critical-failure') {
    // Actor becomes off-guard vs the target's melee attacks until end of actor's next turn
    actor.conditions = actor.conditions || [];
    const cond = {
      name: 'off-guard',
      duration: 'permanent' as const,
      source: `Failed Feint against ${target.name}`,
      appliesAgainst: target.id,
      attackType: 'melee' as const,
      expiresOnTurnEndOf: actor.id,
      turnEndsRemaining: 2,
    };
    actor.conditions.push(cond);
    console.log(`\n­ƒÄ¡ [FEINT CRIT FAIL] Applied off-guard to ${actor.name}:`, JSON.stringify(cond));
    message = `­ƒÄ¡ CRITICAL FAILURE! ${actor.name}'s feint backfires. ${actor.name} is OFF-GUARD against ${target.name}'s melee attacks until end of ${actor.name}'s next turn!`;
  } else {
    message = `­ƒÄ¡ FAILURE! ${target.name} sees through ${actor.name}'s feint.`;
  }

  return {
    success: result === 'success' || result === 'critical-success',
    message,
    details: {
      action: 'feint',
      actor: actor.name,
      target: target.name,
      d20,
      deceptionBonus,
      total,
      perceptionDC,
      margin,
      result,
    },
  };
}

/**
 * Demoralize - Make an Intimidation check against the target's Will DC
 * Success: Target is frightened 1
 * Critical Success: Target is frightened 2
 */
export function resolveDemoralize(
  ctx: ManeuverContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  if (!targetId) {
    return fail('No target specified for Demoralize!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Check if target is already frightened from this actor
  const existingFrightened = target.conditions?.find(
    (cond) => cond.name === 'frightened' && cond.source === `demoralize-${actor.id}`
  );

  if (existingFrightened) {
    return {
      success: false,
      message: `${target.name} is already frightened by your Demoralize! (Immune for 10 minutes)`
    };
  }

  const intimidationBonus = getSkillBonus(actor, 'intimidation');
  const willDC = getWillDC(target);

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

  // Apply effects based on result
  if (result === 'critical-success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 2,
      source: `demoralize-${actor.id}`,
    });
    message += `\nÔ£¿ ${target.name} is **frightened 2**! (Status penalty to all checks/DCs, decreases by 1 each turn)`;
  } else if (result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'frightened',
      duration: 'permanent',
      value: 1,
      source: `demoralize-${actor.id}`,
    });
    message += `\nÔ£à ${target.name} is **frightened 1**! (Status penalty to all checks/DCs, decreases by 1 each turn)`;
  } else if (result === 'critical-failure') {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'immune-to-demoralize',
      duration: 'permanent',
      value: 1,
      source: `demoralize-${targetId}`,
    });
    message += `\nÔØî ${actor.name} critically fails and can't Demoralize ${target.name} again for 10 minutes!`;
  } else {
    message += `\nÔØî The Demoralize attempt fails.`;
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

/**
 * Shove - Make an Athletics check against the target's Fortitude DC
 * Success: Push target 5 feet
 * Critical Success: Push target 10 feet
 * Critical Failure: You fall prone
 */
export function resolveShove(
  ctx: ManeuverContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  if (!targetId) {
    return fail('No target specified for Shove!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  // Check if target is within reach (1 square)
  const dx = Math.abs(actor.positions.x - target.positions.x);
  const dy = Math.abs(actor.positions.y - target.positions.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > 1.5) {
    return fail(`${target.name} is too far away for Shove!`);
  }

  const athleticsBonus = getSkillBonus(actor, 'athletics');
  const fortitudeDC = getFortitudeDC(target);

  // Shove has the Attack trait ÔÇö apply MAP (not agile, so standard -5/-10)
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

  // Increment MAP counter (Attack trait)
  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;

  const result = getDegreeOfSuccess(finalD20, total, fortitudeDC);

  let message = `${actor.name} attempts to Shove ${target.name}!\n`;
  message += `Athletics check: ${finalD20} + ${athleticsBonus}${mapPenalty ? ` (MAP ${mapPenalty})` : ''} = ${total} vs Fortitude DC ${fortitudeDC}\n`;
  message += `Result: **${result.toUpperCase()}** (margin: ${margin >= 0 ? '+' : ''}${margin})`;

  // Calculate push direction (away from actor)
  const pushDirX = target.positions.x - actor.positions.x;
  const pushDirY = target.positions.y - actor.positions.y;
  const pushDist = Math.sqrt(pushDirX * pushDirX + pushDirY * pushDirY);
  const normX = pushDirX / pushDist;
  const normY = pushDirY / pushDist;

  // Apply effects based on result
  if (result === 'critical-success') {
    // Push 2 squares (10 feet)
    const newX = Math.round(target.positions.x + normX * 2);
    const newY = Math.round(target.positions.y + normY * 2);
    
    // Check bounds
    const mapSize = gameState.map?.width || 20;
    target.positions.x = Math.max(0, Math.min(mapSize - 1, newX));
    target.positions.y = Math.max(0, Math.min(mapSize - 1, newY));
    
    message += `\nÔ£¿ ${target.name} is shoved **10 feet** away to (${target.positions.x}, ${target.positions.y})!`;
  } else if (result === 'success') {
    // Push 1 square (5 feet)
    const newX = Math.round(target.positions.x + normX);
    const newY = Math.round(target.positions.y + normY);
    
    // Check bounds
    const mapSize = gameState.map?.width || 20;
    target.positions.x = Math.max(0, Math.min(mapSize - 1, newX));
    target.positions.y = Math.max(0, Math.min(mapSize - 1, newY));
    
    message += `\nÔ£à ${target.name} is shoved **5 feet** away to (${target.positions.x}, ${target.positions.y})!`;
  } else if (result === 'critical-failure') {
    // PF2e Remaster: critical failure on Shove = you fall prone
    message += `\nÔØî ${actor.name} loses balance and falls prone!`;
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: 'shove-critical-failure'
    });
  } else {
    message += `\nÔØî The Shove attempt fails.`;
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

export function resolveTrip(ctx: ManeuverContext,

  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): any {
  if (!targetId) {
    return fail('No target specified for Trip!');
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return fail('Target not found!');
  }

  const athleticsBonus = getSkillBonus(actor, 'athletics');
  const reflexDC = getReflexDC(target);

  // Trip has the Attack trait ÔÇö apply MAP (not agile, so standard -5/-10)
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

  // Increment MAP counter (Attack trait)
  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;

  const result = getDegreeOfSuccess(finalD20, total, reflexDC);

  let message = `${actor.name} attempts to Trip ${target.name}!\n`;
  message += `Athletics check: ${finalD20} + ${athleticsBonus}${mapPenalty ? ` (MAP ${mapPenalty})` : ''} = ${total} vs Reflex DC ${reflexDC}\n`;
  message += `Result: **${result.toUpperCase()}** (margin: ${margin >= 0 ? '+' : ''}${margin})`;

  // Apply effects based on result
  if (result === 'critical-success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: `trip-${actor.id}`,
    });
    
    // Apply 1d6 bludgeoning damage
    const fallDamage = Math.floor(Math.random() * 6) + 1;
    target.currentHealth = Math.max(0, target.currentHealth - fallDamage);
    
    message += `\nÔ£¿ ${target.name} falls **prone** and takes ${fallDamage} bludgeoning damage from the fall!`;
    message += `\n   ${target.name}: ${target.currentHealth + fallDamage}/${target.maxHealth} HP ÔåÆ ${target.currentHealth}/${target.maxHealth} HP`;
  } else if (result === 'success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: `trip-${actor.id}`,
    });
    message += `\nÔ£à ${target.name} falls **prone**! (off-guard, -2 to attack rolls, must use an action to Stand)`;
  } else if (result === 'critical-failure') {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({
      name: 'prone',
      duration: 'permanent',
      source: 'trip-self',
    });
    message += `\nÔØî ${actor.name} loses balance and falls **prone**!`;
  } else {
    message += `\nÔØî The Trip attempt fails.`;
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

// ÔöÇÔöÇÔöÇ Sickened Condition: Retching Action ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// PF2e Remaster: Spend 1 action to make a Fortitude save against the effect DC
// Success: Reduce sickened by 1. Crit success: Reduce by 2
export function resolveRetching(ctx: ManeuverContext, actor: Creature, heroPointsSpent?: number): any {
  // Check if actor is Sickened
  const sickenedCondition = actor.conditions?.find(c => c.name === 'sickened');
  if (!sickenedCondition) {
    return { 
      success: false, 
      message: `${actor.name} is not sickened and cannot use the Retching action.` 
    };
  }

  // Roll Fortitude save against the effect DC that applied sickened
  // Default DC 16 if no effect DC was tracked (should be tracking effect DC with condition)
  const effectDC = sickenedCondition.sourceEffectDC || 16;
  const saveRoll = ctx.rollSave(actor, 'fortitude', effectDC, heroPointsSpent);

  let sickenedReduction = 0;
  let message = '';

  if (saveRoll.result === 'critical-success') {
    sickenedReduction = 2;
    message = `${actor.name} retches desperately. Critical Success! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) ÔÇö Sickened reduced by 2.`;
  } else if (saveRoll.result === 'success') {
    sickenedReduction = 1;
    message = `${actor.name} retches. Success! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) ÔÇö Sickened reduced by 1.`;
  } else if (saveRoll.result === 'failure') {
    message = `${actor.name} retches unsuccessfully. Failure! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) ÔÇö Sickened remains unchanged.`;
  } else if (saveRoll.result === 'critical-failure') {
    message = `${actor.name} retches but worsens. Critical Failure! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) ÔÇö Sickened remains unchanged.`;
  }

  // Apply sickened reduction
  if (sickenedReduction > 0) {
    const newValue = Math.max(0, (sickenedCondition.value ?? 1) - sickenedReduction);
    if (newValue === 0) {
      // Remove sickened condition entirely
      actor.conditions = actor.conditions.filter(c => c.name !== 'sickened');
      message += ` ${actor.name} is no longer sickened.`;
    } else {
      // Update sickened value
      sickenedCondition.value = newValue;
    }
  }

  return {
    success: true,
    message,
    saveRoll: {
      type: 'fortitude',
      d20: saveRoll.d20,
      bonus: saveRoll.bonus,
      total: saveRoll.total,
      dc: effectDC,
      result: saveRoll.result
    },
    conditionUpdated: sickenedReduction > 0
  };
}
