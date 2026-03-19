// 
// heroPoints.ts  Extracted hero point methods from RulesEngine
// Phase 14 refactor: hero point spending and stabilization
// 

import { Creature, rollD20 } from 'pf2e-shared';

export function spendHeroPoints(
  creature: Creature,
  heroPointsSpent: number,
  currentRoll: { d20: number; bonus: number; total: number; result: string }
): {
  success: boolean;
  message: string;
  newRoll?: { d20: number; bonus: number; total: number; result: string };
  heroPointsUsed?: number;
} {
  // Validation: can't spend 0 or more than available
  const availableHP = creature.heroPoints ?? 1;
  
  if (heroPointsSpent === 0) {
    return { success: true, message: `${creature.name} keeps the roll of ${currentRoll.total}.`, heroPointsUsed: 0 };
  }

  if (heroPointsSpent < 0 || heroPointsSpent > 3) {
    return { 
      success: false, 
      message: `Invalid hero point spend: ${heroPointsSpent}. Must be 0-3.` 
    };
  }

  if (heroPointsSpent > availableHP) {
    return { 
      success: false, 
      message: `${creature.name} only has ${availableHP} hero point${availableHP === 1 ? '' : 's'}, cannot spend ${heroPointsSpent}.` 
    };
  }

  // Apply house rule based on hero points spent
  let newD20: number;
  let newTotal: number;
  let message: string;

  if (heroPointsSpent === 1) {
    // 1 HP: Roll twice, take better
    const secondRoll = rollD20();
    newD20 = Math.max(currentRoll.d20, secondRoll);
    newTotal = newD20 + currentRoll.bonus;
    message = `${creature.name} spends 1 Hero Point! Rolls: [${currentRoll.d20}, ${secondRoll}] â†’ ${newD20}`;
  } else if (heroPointsSpent === 2) {
    // 2 HP: Roll twice, add +10 to second (result capped at natural 20)
    const secondRoll = rollD20();
    const secondRollWithBonus = Math.min(secondRoll + 10, 20); // Cap at natural 20
    newD20 = Math.max(currentRoll.d20, secondRollWithBonus);
    newTotal = newD20 + currentRoll.bonus;
    message = `${creature.name} spends 2 Hero Points! Rolls: [${currentRoll.d20}, ${secondRoll}+10=${secondRollWithBonus}] â†’ ${newD20}`;
  } else if (heroPointsSpent === 3) {
    // 3 HP: Automatic natural 20
    newD20 = 20;
    newTotal = 20 + currentRoll.bonus;
    message = `${creature.name} spends 3 Hero Points! AUTOMATIC NATURAL 20!`;
  } else {
    return { 
      success: false, 
      message: `Unknown hero point spend code path: ${heroPointsSpent}` 
    };
  }

  // Calculate new degree of success (will be determined when this is used)
  const newResult = 'pending'; // Will be calculated when we know the DC

  // Deduct hero points
  creature.heroPoints = (creature.heroPoints ?? 1) - heroPointsSpent;

  return {
    success: true,
    message,
    newRoll: {
      d20: newD20,
      bonus: currentRoll.bonus,
      total: newTotal,
      result: newResult // Will be updated once DC is known
    },
    heroPointsUsed: heroPointsSpent
  };
}

export function stabilizeWithHeroPoints(creature: Creature): {
  success: boolean;
  message: string;
  heroPointsSpent?: number;
} {
  if (!creature.dying) {
    return {
      success: false,
      message: `${creature.name} is not dying and cannot use hero points to stabilize.`
    };
  }

  const availableHP = creature.heroPoints ?? 1;
  if (availableHP === 0) {
    return {
      success: false,
      message: `${creature.name} has no hero points left to stabilize.`
    };
  }

  // Stabilize
  creature.dying = false;
  creature.currentHealth = 0;
  creature.deathSaveFailures = 0;
  creature.deathSaveSuccesses = 0;
  
  // Remove dying condition
  creature.conditions = creature.conditions?.filter(c => c.name !== 'dying') || [];
  
  // All hero points spent
  const hpSpent = availableHP;
  creature.heroPoints = 0;

  return {
    success: true,
    message: `${creature.name} spends all ${hpSpent} hero point${hpSpent === 1 ? '' : 's'} to stabilize! Stabilized at 0 HP.`,
    heroPointsSpent: hpSpent
  };
}
