// 
// combatActions.ts  Combat resolution logic extracted from RulesEngine
// 

import { Creature, GameState, AttackRoll, Position, CreatureWeapon, ActionResult, calculateAC, getAttackResult, getDegreeOfSuccess, calculateAttackBonus, calculateSaveBonus, getConditionModifiers, resolveStacking, rollD20, getWeapon, rollDamageFormula, calculateFinalDamage, applyDamageToShield } from 'pf2e-shared';
import { hasTrait, getTraitParam, calculateRangeIncrementPenalty, initDying } from './helpers';
import { debugLog } from './logger';
import { getEffectiveReach, threatensPosition, fireReactionTrigger } from './subsystems';

type SpendHeroPointsResult = {
  success: boolean;
  newRoll?: { d20: number; total: number };
  message?: string;
};

type StrikeResolutionResult = ActionResult & {
  hit?: boolean;
  damage?: number;
  targetHealth?: number;
  targetDying?: boolean;
};

interface DamageRollResult {
  dice: { times: number; sides: number; results: number[]; total: number };
  weaponName: string;
  formula: string;
  abilityMod: number;
  traitBonuses?: number;
  weaponSpecializationBonus?: number;
  arcaneCascadeBonus?: number;
  sneakAttackDamage?: number;
  isCriticalHit: boolean;
  total: number;
  appliedDamage: number;
}

/**
 * Standalone creature feat check for use inside rollDamage (which has no ctx).
 * Mirrors statHelpers.hasFeat but avoids a circular import.
 */
function hasNamedFeatOnCreature(creature: Creature, featName: string): boolean {
  const lower = featName.toLowerCase().trim();
  const fromFeats = creature.feats?.some((f) => {
    const n = typeof f === 'string' ? f : f?.name;
    return typeof n === 'string' && n.toLowerCase().trim() === lower;
  });
  const fromSpecials = creature.specials?.some(
    (s: string) => typeof s === 'string' && s.toLowerCase().trim() === lower,
  );
  return fromFeats || fromSpecials || false;
}

// 
// Context interface: callbacks bound from the RulesEngine class
// 

export interface CombatActionContext {
  hasFeat: (creature: Creature, featName: string) => boolean;
  spendHeroPoints: (creature: Creature, heroPointsSpent: number, currentRoll: { d20: number; bonus: number; total: number; result: string }) => SpendHeroPointsResult;
  calculateDistance: (pos1: Position, pos2: Position) => number;
  getPerceptionDC: (creature: Creature) => number;
  getSkillBonus: (creature: Creature, skillName: string) => number;
  resolveSelectedWeapon: (actor: Creature, weaponId?: string) => CreatureWeapon | null;
  resolveStrike: (actor: Creature, gameState: GameState, targetId?: string) => StrikeResolutionResult;
}


// 
// Standalone helpers (module-level)
// 

const AVENGER_FAVORED_WEAPONS: Record<string, string[]> = {
  Abadar: ['crossbow'],
  Asmodeus: ['mace'],
  Calistria: ['whip'],
  'Cayden Cailean': ['rapier'],
  Desna: ['starknife'],
  Erastil: ['longbow'],
  Gorum: ['greatsword'],
  Gozreh: ['trident'],
  Iomedae: ['longsword'],
  Irori: ['fist', 'unarmed'],
  Lamashtu: ['falchion'],
  Nethys: ['staff'],
  Norgorber: ['dagger'],
  Pharasma: ['dagger'],
  Rovagug: ['greataxe'],
  Sarenrae: ['scimitar'],
  Shelyn: ['glaive'],
  Torag: ['warhammer'],
  Urgathoa: ['scythe'],
  'Zon-Kuthon': ['spiked chain'],
};


/**
 * PHASE 10.1: Check if creature can deal Sneak Attack damage
 * PF2e: Strike with agile/finesse melee weapon, agile/finesse unarmed attack, or ranged attack vs off-guard target
 * Racket modifiers:
 * - Ruffian: Can Sneak Attack with simple weapons (d8 or less) and martial weapons (d6 or less)
 * - Avenger: Can Sneak Attack with deity's favored weapon
 * Archetype: Sneak Attacker feat grants sneak attack (1d4) to non-Rogues
 */
function canDealSneakAttack(attacker: Creature, selectedWeapon: CreatureWeapon | undefined, targetIsOffGuard: boolean): boolean {
  if (!targetIsOffGuard) {
    return false;
  }

  // Check if character has Sneak Attack ability (Rogue class or Sneak Attacker archetype feat)
  const isRogue = attacker.characterClass === 'Rogue';
  const hasSneakAttackerArchetype = attacker.feats?.some((f) => {
    const id = typeof f === 'string' ? f : f?.id;
    const name = typeof f === 'string' ? f : f?.name;
    return (typeof id === 'string' && id.toLowerCase().trim() === 'sneak-attacker') ||
           (typeof name === 'string' && name.toLowerCase().trim() === 'sneak attacker');
  }) || attacker.specials?.some((s: string) => s.toLowerCase().includes('sneak attacker'));

  if (!isRogue && !hasSneakAttackerArchetype) {
    return false;
  }

  if (!selectedWeapon) {
    return false;
  }

  const traits = selectedWeapon.traits || [];
  const isAgileOrFinesse = hasTrait(traits, 'agile') || hasTrait(traits, 'finesse');
  const isRanged = selectedWeapon.attackType === 'ranged';
  
  // Base Sneak Attack: agile/finesse melee or ranged weapons
  if (isAgileOrFinesse || isRanged) {
    return true;
  }

  // Ruffian racket: Can Sneak Attack with simple weapons (d8 or less) and martial (d6 or less)
  if (attacker.rogueRacket === 'ruffian') {
    const damageMatch = selectedWeapon.damageDice?.match(/1d(\d+)/);
    if (damageMatch) {
      const damageDie = parseInt(damageMatch[1], 10);
      // Simple weapons: d8 or less, Martial weapons: d6 or less
      // We can check weapon type from catalog if available, for now assume it's simple if d8 or less
      if (damageDie <= 8) {
        return true;
      }
    }
  }

  // Avenger racket: Can Sneak Attack with deity's favored weapon
  if (attacker.rogueRacket === 'avenger' && attacker.rogueDeity) {
    const favoredWeapons = AVENGER_FAVORED_WEAPONS[attacker.rogueDeity] || [];
    if (favoredWeapons.length === 0) {
      return false;
    }
    const catalogWeapon = selectedWeapon.weaponCatalogId ? getWeapon(selectedWeapon.weaponCatalogId) : undefined;
    const weaponName = (catalogWeapon?.name || selectedWeapon.display || '').toLowerCase();
    return favoredWeapons.some(favored => weaponName.includes(favored.toLowerCase()));
  }

  return false;
}

/**
 * Calculate Sneak Attack precision damage dice
 * PF2e: 1d6 @ level 1, 2d6 @ level 5, 3d6 @ level 11, 4d6 @ level 17
 * Archetype: 1d4 flat (from Sneak Attacker archetype feat)
 * NOTE: Precision damage is NOT doubled on critical hits
 */
function rollSneakAttack(attacker: Creature): { dice: number; damage: number } {
  // Check if this is archetype sneak attack (1d4 flat) or full class sneak attack
  const hasSneakAttackerArchetype = attacker.feats?.some((f) => {
    const id = typeof f === 'string' ? f : f?.id;
    const name = typeof f === 'string' ? f : f?.name;
    return (typeof id === 'string' && id.toLowerCase().trim() === 'sneak-attacker') ||
           (typeof name === 'string' && name.toLowerCase().trim() === 'sneak attacker');
  }) || attacker.specials?.some((s: string) => s.toLowerCase().includes('sneak attacker'));

  const isFullRogue = attacker.characterClass === 'Rogue';

  // Archetype Sneak Attack: 1d4 flat (unless you're also a Rogue, then use full scaling)
  if (hasSneakAttackerArchetype && !isFullRogue) {
    const roll = rollDamageFormula('1d4');
    return { dice: 1, damage: roll.total };
  }

  // Full Rogue Sneak Attack: 1d6 scaling by level
  let dice = 1;
  if (attacker.level >= 17) {
    dice = 4;
  } else if (attacker.level >= 11) {
    dice = 3;
  } else if (attacker.level >= 5) {
    dice = 2;
  }

  const roll = rollDamageFormula(`${dice}d6`);
  let totalDamage = roll.total;

  // Sly Striker: Add ability modifier to sneak attack damage
  const hasSlyStriker = attacker.feats?.some((f) => {
    const name = typeof f === 'string' ? f : f?.name;
    return typeof name === 'string' && name.toLowerCase().trim() === 'sly striker';
  }) || attacker.specials?.some((s: string) => s.toLowerCase().trim() === 'sly striker');
  if (hasSlyStriker) {
    const abilityMod = Math.max(attacker.abilities?.dexterity ?? 0, attacker.abilities?.strength ?? 0);
    totalDamage += abilityMod;
  }

  return { dice, damage: totalDamage };
}

/**
 * PHASE 10.1: Calculate precision resistance bypass for Powerful Sneak feat
 * Level 18 Rogue feat: Treat target's precision resistance as 10 lower
 * Returns the effective precision resistance after Powerful Sneak reduction
 */
export function calculateEffectivePrecisionResistance(attacker: Creature, target: Creature, originalResistance: number): number {
  if (attacker.characterClass !== 'Rogue' || attacker.level < 18) {
    return originalResistance;
  }

  const hasPowerfulSneak = attacker.feats?.some((f) => {
    const name = typeof f === 'string' ? f : f?.name;
    return typeof name === 'string' && name.toLowerCase().includes('powerful sneak');
  }) || attacker.specials?.some((s: string) => s.toLowerCase().includes('powerful sneak'));

  if (hasPowerfulSneak) {
    return Math.max(0, originalResistance - 10);
  }

  return originalResistance;
}


// 
// Flanking & Off-Guard helpers
// 

export function cleanupStaleFlankingConditions(gameState: GameState): void {
  gameState.creatures.forEach((target) => {
    if (!target.conditions || target.conditions.length === 0) return;

    target.conditions = target.conditions.filter((cond) => {
      if (cond.name !== 'off-guard' || !cond.source?.includes('Flanking')) return true;
      
      // Check if this flanker is still flanking this target
      const flankingCreature = gameState.creatures.find((c) => c.id === cond.appliesAgainst);
      if (!flankingCreature) return false; // Creature doesn't exist, remove condition
      
      const isStillFlanked = isTargetFlanked(flankingCreature, target, gameState);
      if (!isStillFlanked) {
        debugLog(`  âŒ After movement: ${flankingCreature.name} no longer flanking ${target.name}, removing off-guard`);
        return false;
      }
      
      return true; // Keep it, still flanked
    });
  });
}

export function consumeFeintOffGuard(target: Creature, attacker: Creature): void {
  if (!target.conditions || target.conditions.length === 0) return;

  const weapon = attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : null;
  const attackType = weapon?.type ?? 'melee';

  debugLog(`\nðŸŽ¯ [CONSUME FEINT] ${attacker.name} attacking ${target.name} with ${attackType} attack`);
  debugLog(`  Target conditions: ${target.conditions.map(c => `${c.name}(appliesAgainst=${c.appliesAgainst}, uses=${c.usesRemaining}, attackType=${c.attackType})`).join(', ')}`);

  // Only consume on melee attacks (Feint only grants off-guard vs melee)
  if (attackType !== 'melee') {
    debugLog(`  âŒ Not a melee attack, skipping consumption`);
    return;
  }

  target.conditions = target.conditions.filter((cond) => {
    if (cond.name !== 'off-guard') return true;
    if (!cond.appliesAgainst || cond.appliesAgainst !== attacker.id) return true;
    if (cond.attackType && cond.attackType !== 'melee') return true;

    if (typeof cond.usesRemaining === 'number') {
      cond.usesRemaining -= 1;
      const keep = cond.usesRemaining > 0;
      debugLog(`  ðŸ”„ Consumed use: usesRemaining ${cond.usesRemaining + 1} â†’ ${cond.usesRemaining} â†’ ${keep ? 'KEEP' : 'REMOVE'}`);
      return keep;
    }

    debugLog(`  â„¹ï¸ No usesRemaining (crit success), keeping condition`);
    return true;
  });
}

/**
 * Check if target is flanked by attacker (ally on opposite side)
 * PF2e: Flanking requires an ally on the opposite side of the target
 * Ally must be:
 * - Conscious (not dying)
 * - Adjacent to target (within 1.5 squares melee range)
 * - Wielding a melee weapon (threatening)
 * Simplified: Check if any other ally is roughly opposite attacker relative to target
 */
export function isTargetFlanked(attacker: Creature, target: Creature, gameState: GameState): boolean {
  // Only melee attacks can flank
  // Prefer weaponInventory (held weapon), fall back to legacy equippedWeapon
  const attackerHeldWeapon = attacker.weaponInventory?.find(ws => ws.state === 'held')?.weapon;
  const attackerWeapon = attackerHeldWeapon ?? (attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : null);
  const attackerWeaponType = attackerWeapon ? ('attackType' in attackerWeapon ? attackerWeapon.attackType : attackerWeapon.type) : null;
  if (attackerWeaponType && attackerWeaponType !== 'melee') return false;

  const allies = gameState.creatures.filter(
    (c) => {
      // Must be a different creature (not attacker or target)
      if (c.id === attacker.id || c.id === target.id) return false;
      
      // Must be alive (not dead)
      if (c.currentHealth <= 0) return false;
      
      // Must be conscious (not dying)
      const dyingCondition = c.conditions?.find((cond) => cond.name === 'dying');
      if (dyingCondition) return false;
      
      // Must be wielding a melee weapon
      // Prefer weaponInventory (held weapon), fall back to legacy equippedWeapon
      const allyHeldWeapon = c.weaponInventory?.find(ws => ws.state === 'held')?.weapon;
      const allyWeapon = allyHeldWeapon ?? (c.equippedWeapon ? getWeapon(c.equippedWeapon) : null);
      const allyWeaponType = allyWeapon ? ('attackType' in allyWeapon ? allyWeapon.attackType : allyWeapon.type) : null;
      if (!allyWeapon || (allyWeaponType !== 'melee')) return false;
      
      // Must be adjacent to target (threatening) — accounts for size/reach/feats
      if (!threatensPosition(c, target.positions, allyWeapon as CreatureWeapon)) return false;
      
      return true;
    }
  );

  if (allies.length === 0) return false;

  for (const ally of allies) {
    // Check if ally is roughly opposite attacker relative to target
    // Simple check: ally and attacker are on roughly opposite sides of target
    const targetToAttacker = {
      x: attacker.positions.x - target.positions.x,
      y: attacker.positions.y - target.positions.y,
    };
    const targetToAlly = {
      x: ally.positions.x - target.positions.x,
      y: ally.positions.y - target.positions.y,
    };

    // Dot product < 0 means roughly opposite directions
    const dotProduct = targetToAttacker.x * targetToAlly.x + targetToAttacker.y * targetToAlly.y;
    
    // Attacker must threaten the target (reach-aware) and ally must be on the opposite side
    const attackerWeapon = attacker.weaponInventory?.[0]?.weapon as CreatureWeapon | undefined;
    if (threatensPosition(attacker, target.positions, attackerWeapon) && dotProduct < 0) {
      debugLog(`\nâš”ï¸  [FLANKING] ${target.name} is flanked by ${attacker.name} and ${ally.name}`);
      return true;
    }
  }

  return false;
}

export function applyFlankingOffGuard(attacker: Creature, target: Creature, gameState: GameState): void {
  // PHASE 10.1: ROGUE DENY ADVANTAGE
  // Rogues at level 3+ aren't off-guard to creatures of equal or lower level using Surprise Attack or flanking
  if (target.characterClass === 'Rogue' && target.level >= 3 && attacker.level <= target.level) {
    // Check if attacker would only apply Surprise Attack or flanking (not other off-guard sources)
    const onlyFlankingOrSurprise = true; // This function only handles flanking
    if (onlyFlankingOrSurprise) {
      // Deny Advantage blocks this off-guard - return early
      return;
    }
  }

  // First, remove any stale flanking off-guard conditions from creatures that are no longer flanking
  target.conditions = target.conditions?.filter((cond) => {
    if (cond.name !== 'off-guard' || !cond.source?.includes('Flanking')) return true;
    
    // Check if this flanker is still flanking
    const flankingCreature = gameState.creatures.find((c) => c.id === cond.appliesAgainst);
    if (!flankingCreature) return false; // Creature doesn't exist, remove condition
    
    const isStillFlanked = isTargetFlanked(flankingCreature, target, gameState);
    if (!isStillFlanked) {
      debugLog(`  âŒ ${flankingCreature.name} no longer flanking ${target.name}, removing off-guard`);
      return false;
    }
    
    return true; // Keep it, still flanked
  }) || [];

  // Now check if current attacker is flanking and apply off-guard if needed
  if (!isTargetFlanked(attacker, target, gameState)) {
    return;
  }

  // Check if flanking off-guard already exists for THIS attacker
  const existingFlankingOffGuard = target.conditions?.find(
    (c) => c.name === 'off-guard' && c.appliesAgainst === attacker.id && c.source?.includes('Flanking')
  );

  if (existingFlankingOffGuard) {
    debugLog(`  â„¹ï¸ ${attacker.name} already has flanking off-guard on ${target.name}`);
    return;
  }

  // Apply flanking off-guard: melee-only, only vs this attacker
  target.conditions = target.conditions || [];
  const flankingOffGuard = {
    name: 'off-guard',
    duration: 'permanent' as const,
    source: `Flanking from ${attacker.name}`,
    appliesAgainst: attacker.id,
    attackType: 'melee' as const,
    // No expiresOnTurnEndOf: persistence is based on position, not turns
  };
  target.conditions.push(flankingOffGuard);
  debugLog(`  âœ… ${attacker.name} is flanking ${target.name} - applied melee off-guard`);
}

// 
// Attack Resolution Pipeline
// 

/**
 * Validate attack range: melee uses Chebyshev grid distance (diagonals = 1 square),
 * standard reach = 1 square, 'reach' trait = 2 squares.
 * Ranged weapons use Euclidean distance with range increments.
 */
export function validateAttackRange(ctx: CombatActionContext, 
  actor: Creature,
  target: Creature,
  weapon: CreatureWeapon | null
): { ok: boolean; message: string } {
  const distance = ctx.calculateDistance(actor.positions, target.positions);
  const isRanged = weapon?.attackType === 'ranged';
  
  // Check for THROWN trait: allows melee weapons to be thrown at specified range
  const isThrown = hasTrait(weapon?.traits, 'thrown');
  const thrownRange = isThrown ? getTraitParam(weapon?.traits, 'thrown') : undefined;

  if (isRanged || isThrown) {
    // Ranged weapon or thrown melee weapon
    // PF2e Remaster: Range increment system with 6 total increments max
    let rangeIncrementSq = weapon?.range ?? 12; // default 12 squares (60ft) if not specified
    
    // If Thrown trait on non-ranged weapon, use its range instead (trait value is in feet)
    if (isThrown && !isRanged && thrownRange) {
      rangeIncrementSq = Math.round(parseInt(thrownRange as string) / 5); // Convert feet to squares
    }
    
    // Max 6 range increments (PF2e rule)
    const maxRangeSq = rangeIncrementSq * 6;
    
    if (distance > maxRangeSq + 1e-6) { // Floating-point tolerance
      return { 
        ok: false, 
        message: `${target.name} is beyond maximum range! (${Math.round(distance * 5)}ft away, max 6 increments × ${rangeIncrementSq * 5}ft = ${maxRangeSq * 5}ft)` 
      };
    }
  } else {
    // Melee weapon: use Chebyshev distance (grid distance where diagonals count as 1 square)
    // Reach accounts for creature size, weapon traits, and feat/condition bonuses
    const dx = Math.abs(actor.positions.x - target.positions.x);
    const dy = Math.abs(actor.positions.y - target.positions.y);
    const gridDistance = Math.max(dx, dy); // Chebyshev distance for grid-based melee
    const maxReach = getEffectiveReach(actor, weapon);
    if (gridDistance > maxReach) {
      return { ok: false, message: `${target.name} is out of melee reach (${maxReach * 5}ft)! Move closer first.` };
    }
  }

  return { ok: true, message: '' };
}

/**
 * Get MAP penalty considering 'agile' trait on the selected weapon
 * PASSIVE FIGHTER FEAT: Graceful Poise â€” while dual-wielding, second weapon's MAP is reduced (agile-like)
 */
export function getMapPenalty(ctx: CombatActionContext, attacker: Creature, selectedWeapon?: CreatureWeapon | null): number {
  const attacks = attacker.attacksMadeThisTurn ?? 0;
  if (attacks === 0) return 0;
  let isAgile = selectedWeapon?.traits?.includes('agile') ?? false;
  
  // Graceful Poise: if dual-wielding, treat second (off-hand) weapon as agile
  if (!isAgile && ctx.hasFeat(attacker, 'Graceful Poise')) {
    const heldWeapons = attacker.weaponInventory?.filter(s => s.state === 'held') || [];
    if (heldWeapons.length >= 2 && selectedWeapon) {
      // If the selected weapon is the second held weapon, treat as agile
      const secondWeapon = heldWeapons[1]?.weapon;
      if (secondWeapon && secondWeapon.id === selectedWeapon.id) {
        isAgile = true;
      }
    }
  }
  
  if (attacks === 1) return isAgile ? -4 : -5;
  return isAgile ? -8 : -10;
}

export function rollAttack(ctx: CombatActionContext, 
  attacker: Creature,
  target: Creature,
  gameState: GameState,
  selectedWeapon?: CreatureWeapon | null,
  heroPointsSpent?: number
): AttackRoll {
  const getWeaponProficiencyRank = (): 'untrained' | 'trained' | 'expert' | 'master' | 'legendary' => {
    const catalogWeapon = selectedWeapon?.weaponCatalogId
      ? getWeapon(selectedWeapon.weaponCatalogId)
      : (attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : undefined);

    const category = catalogWeapon?.proficiencyCategory;
    if (category === 'unarmed') return attacker.proficiencies?.unarmed ?? 'untrained';
    if (category === 'simple') return attacker.proficiencies?.simpleWeapons ?? 'untrained';
    if (category === 'martial') return attacker.proficiencies?.martialWeapons ?? 'untrained';
    if (category === 'advanced') return attacker.proficiencies?.advancedWeapons ?? 'untrained';

    return selectedWeapon?.isNatural
      ? (attacker.proficiencies?.unarmed ?? 'untrained')
      : (attacker.proficiencies?.simpleWeapons ?? 'untrained');
  };

  // Roll d20 for the attack
  let d20 = rollD20();
  let sureStrikeUsed = false;
  let sureStrikeRolls: number[] | undefined;
  
  // Sure Strike (fortune effect): roll twice, take the higher result
  const sureStrikeIdx = (attacker.conditions || []).findIndex(c => c.name === 'sure-strike');
  if (sureStrikeIdx !== -1) {
    const secondD20 = rollD20();
    sureStrikeRolls = [d20, secondD20];
    d20 = Math.max(d20, secondD20);
    sureStrikeUsed = true;
    // Consume the sure-strike condition (one use only)
    attacker.conditions.splice(sureStrikeIdx, 1);
  }
  
  // Use the canonical calculateAttackBonus which already handles:
  // ability mod, proficiency (based on equippedWeapon), MAP, and condition modifiers.
  let bonus = calculateAttackBonus(attacker);
  console.log(`⚔️ [ATTACK] ${attacker.name}: calculateAttackBonus=${bonus} (attacksMade=${attacker.attacksMadeThisTurn})`);
  
  // Apply weapon trait modifiers and range penalties
  let traitModifier = 0;
  let rangeModifier = 0;
  
  const distance = Math.sqrt(
    Math.pow(target.positions.x - attacker.positions.x, 2) +
    Math.pow(target.positions.y - attacker.positions.y, 2)
  );
  
  // Check if this is a ranged attack (melee weapons have range=1 for reach, not for ranged increment)
  const isRanged = selectedWeapon?.attackType === 'ranged';
  const isThrown = hasTrait(selectedWeapon?.traits, 'thrown');
  
  if (isRanged || isThrown) {
    let rangeIncrementSq = selectedWeapon?.range ?? 12; // Default 12 squares (60ft) if not specified
    
    // If Thrown trait, use its range as the increment (trait value is in feet)
    if (isThrown && !isRanged) {
      const thrownRange = getTraitParam(selectedWeapon?.traits, 'thrown');
      if (thrownRange) {
        rangeIncrementSq = Math.round(parseInt(thrownRange as string) / 5);
      }
    }
    
    const { penalty: incrementPenalty, inRange } = calculateRangeIncrementPenalty(distance, rangeIncrementSq);
    
    if (!inRange) {
      return {
        success: false,
        message: `Target is beyond maximum range! (${Math.round(distance * 5)}ft away, max 6 range increments = ${rangeIncrementSq * 5 * 6}ft)`,
        details: { distance: Math.round(distance * 5), maxRange: rangeIncrementSq * 5 * 6 },
        errorCode: 'OUT_OF_RANGE',
      } as unknown as AttackRoll;
    }
    
    rangeModifier = incrementPenalty;
  }
  
  if (selectedWeapon?.traits) {
    // SWEEP: +1 circumstance to attack if you already attacked a different target this turn
    // PF2e: "When you attack with this weapon, you gain a +1 circumstance bonus to your
    // attack roll if you already attempted to attack a different target this turn using this weapon."
    if (hasTrait(selectedWeapon.traits, 'sweep') && (attacker.attacksMadeThisTurn ?? 0) >= 1) {
      const previousTargets = attacker.attackTargetsThisTurn ?? [];
      const hasAttackedDifferentTarget = previousTargets.some(id => id !== target.id);
      if (hasAttackedDifferentTarget) {
        traitModifier += 1;
      }
    }
    
    // VOLLEY: -2 penalty to attacks within listed range
    if (hasTrait(selectedWeapon.traits, 'volley')) {
      const volleyRange = getTraitParam(selectedWeapon.traits, 'volley');
      if (volleyRange) {
        const volleyRangeSq = parseInt(volleyRange as string) / 5; // Convert feet to squares
        if (distance <= volleyRangeSq) {
          traitModifier -= 2;
        }
      }
    }
  }

  // PASSIVE FIGHTER CLASS FEAT: Weapon Supremacy (Level 20)
  // Permanent +4 circumstance bonus to attack rolls with weapons in which you have legendary proficiency
  if (ctx.hasFeat(attacker, 'Weapon Supremacy')) {
    const proficiencyRank = getWeaponProficiencyRank();
    if (proficiencyRank === 'legendary') {
      bonus += 4;
    }
  }
  
  bonus += traitModifier + rangeModifier;
  let total = d20 + bonus;
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(attacker, heroPointsSpent, {
      d20,
      bonus,
      total,
      result: 'pending',
    });

    if (!spendResult.success || !spendResult.newRoll) {
      return {
        attacker: attacker.id,
        target: target.id,
        targetAC: 0,
        d20,
        bonus,
        total,
        result: 'critical-failure',
        marginOfSuccess: -999,
        heroPointError: spendResult.message,
      } as unknown as AttackRoll;
    }

    finalD20 = spendResult.newRoll.d20;
    total = spendResult.newRoll.total;
    heroPointMessage = spendResult.message;
  }

  // Determine attack type from selected weapon, then creature's equippedWeapon, then default melee
  const attackType = selectedWeapon?.attackType
    ?? (attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon)?.type : null)
    ?? 'melee';

  // Calculate target's AC with all modifiers (pass attacker ID for conditional effects)
  const targetAC = calculateAC(target, attacker.id, attackType);
  
  // Determine result vs target AC using PF2e rules
  const result = getAttackResult(finalD20, total, targetAC);
  const marginOfSuccess = total - targetAC;

  console.log(`🎯 [ROLL_ATTACK RETURN] d20=${finalD20} bonus=${bonus} total=${total} targetAC=${targetAC} result=${result}`);

  return {
    attacker: attacker.id,
    target: target.id,
    targetAC,
    d20: finalD20,
    bonus,
    total,
    result,
    marginOfSuccess,
    ...(heroPointMessage && { heroPointMessage, heroPointsSpent }),
    ...(sureStrikeUsed && { sureStrikeUsed, sureStrikeRolls }),
  };
}

export function rollDamage(attacker: Creature, isCriticalHit: boolean = false, selectedWeapon?: CreatureWeapon | null, targetIsOffGuard: boolean = false): DamageRollResult {
  // If a specific weapon from inventory is selected, use its stats
  if (selectedWeapon) {
    // PHASE 1.5 FIX: Apply striking runes from creature bonuses
    let formula = selectedWeapon.damageDice;
    const weapon = selectedWeapon.weaponCatalogId ? getWeapon(selectedWeapon.weaponCatalogId) : null;
    
    // Check for Striking runes and adjust dice count
    if (weapon && attacker.bonuses) {
      for (const bonus of attacker.bonuses) {
        if (bonus.applyTo === `striking:${weapon.name}` && typeof bonus.value === 'number') {
          // Striking runes add dice (e.g., "1d8" -> "2d8" with striking)
          const match = formula.match(/(\d+)d(\d+)/);
          if (match) {
            const originalCount = parseInt(match[1], 10);
            const die = match[2];
            const newCount = originalCount + bonus.value;
            formula = `${newCount}d${die}`;
          }
          break;
        }
      }
    }
    
    const roll = rollDamageFormula(formula);
    const strengthMod = attacker.abilities?.strength ?? 0;
    const isMeleeAttack = selectedWeapon.attackType === 'melee';
    let flatBonus = (selectedWeapon.damageBonus ?? 0) + (isMeleeAttack ? strengthMod : 0);

    // PHASE 10.1: THIEF RACKET - Use DEX for finesse weapons
    // Thief applies DEX instead of STR to finesse melee weapons
    if (attacker.rogueRacket === 'thief' && hasTrait(selectedWeapon.traits, 'finesse')) {
      const dexMod = attacker.abilities?.dexterity ?? 0;
      const strMod = attacker.abilities?.strength ?? 0;
      // Replace STR portion with DEX portion while preserving other bonuses
      flatBonus = flatBonus - strMod + dexMod;
    }

    const { bonuses: dmgBonuses, penalties: dmgPenalties } = getConditionModifiers(attacker.conditions || [], 'damage');
    const condMod = resolveStacking(dmgBonuses, dmgPenalties);

    // ── RAGE DAMAGE BONUS ──
    // Apply damage bonuses from attacker.bonuses (e.g., Rage +2 status melee-damage)
    let rageDamageBonus = 0;
    const isThrown = selectedWeapon.attackType === 'ranged' && hasTrait(selectedWeapon.traits, 'thrown');
    if (attacker.bonuses) {
      for (const b of attacker.bonuses) {
        if (b.applyTo === 'melee-damage' && (isMeleeAttack || (isThrown && hasNamedFeatOnCreature(attacker, 'raging thrower')))) {
          rageDamageBonus += b.value;
        }
      }
    }

    let baseDamage = Math.max(1, roll.total + flatBonus + condMod + rageDamageBonus);
    let traitBonuses = 0;

    // Weapon traits affecting damage
    if (selectedWeapon.traits) {
      // TWO-HAND: When wielded two-handed, use specified die size
      // NOTE: This requires hand tracking to detect two-handed grip
      // For now, we check if the weapon has two-hand trait and handsUsed >= 2
      if (hasTrait(selectedWeapon.traits, 'two-hand')) {
        const twoHandDie = getTraitParam(selectedWeapon.traits, 'two-hand');
        if (twoHandDie && attacker.handsUsed && attacker.handsUsed >= 2) {
          // Re-roll with the two-handed die size
          const match = formula.match(/(\d+)d\d+/);
          if (match) {
            const diceCount = match[1];
            const twoHandFormula = `${diceCount}${twoHandDie}`;
            const twoHandRoll = rollDamageFormula(twoHandFormula);
            // Replace original roll with two-hand roll
            baseDamage = baseDamage - roll.total + twoHandRoll.total;
          }
        }
      }
      
      // VERSATILE: Can deal alternate damage type
      // NOTE: This is a UI choice (player selects damage type)
      // The damage calculation remains the same, only the type changes
      // This would be handled in the UI layer, not in damage calculation
      
      // BACKSTABBER: +1 precision damage (+2 with greater striking) against off-guard targets
      if (hasTrait(selectedWeapon.traits, 'backstabber') && targetIsOffGuard) {
        traitBonuses += 1; // Could be +2 with greater striking, but we'll use +1 for now
      }

      // DEADLY on critical hit: add specified die
      if (isCriticalHit && hasTrait(selectedWeapon.traits, 'deadly')) {
        const deadlyDie = getTraitParam(selectedWeapon.traits, 'deadly');
        if (deadlyDie) {
          const deadlyRoll = rollDamageFormula(`1${deadlyDie}`);
          traitBonuses += deadlyRoll.total;
        }
      }

      // FATAL on critical hit: upgrade to fatal die and add extra fatal die
      if (isCriticalHit && hasTrait(selectedWeapon.traits, 'fatal')) {
        const fatalDie = getTraitParam(selectedWeapon.traits, 'fatal');
        if (fatalDie) {
          // Fatal: replace weapon die with fatal die AND add one fatal die
          // This is modeled as if we're rolling the fatal die twice
          const fatalRoll = rollDamageFormula(`2${fatalDie}`);
          // On crit with fatal, we add the two fatal dice (they replace the normal crit doubling)
          baseDamage = baseDamage - roll.total + fatalRoll.total; // Remove original roll, add fatal roll
        }
      }

      // FORCEFUL: +1 damage on 2nd attack, +2 on 3rd+ (same turn, same weapon)
      // This should be calculated from attacker's attacksMadeThisTurn
      if (hasTrait(selectedWeapon.traits, 'forceful')) {
        const attacks = attacker.attacksMadeThisTurn ?? 0;
        if (attacks === 1) traitBonuses += 1; // 2nd attack
        else if (attacks >= 2) traitBonuses += 2; // 3rd+ attacks
      }

      // PROPULSIVE: Add half STR modifier to damage (if positive) for ranged weapons
      if (hasTrait(selectedWeapon.traits, 'propulsive') && selectedWeapon.attackType === 'ranged') {
        const strMod = attacker.abilities?.strength ?? 0;
        if (strMod > 0) {
          traitBonuses += Math.floor(strMod / 2);
        }
      }
    }

    const getWeaponProficiencyRank = (): 'untrained' | 'trained' | 'expert' | 'master' | 'legendary' => {
      const category = weapon?.proficiencyCategory;
      if (category === 'unarmed') return attacker.proficiencies?.unarmed ?? 'untrained';
      if (category === 'simple') return attacker.proficiencies?.simpleWeapons ?? 'untrained';
      if (category === 'martial') return attacker.proficiencies?.martialWeapons ?? 'untrained';
      if (category === 'advanced') return attacker.proficiencies?.advancedWeapons ?? 'untrained';
      return selectedWeapon?.isNatural
        ? (attacker.proficiencies?.unarmed ?? 'untrained')
        : (attacker.proficiencies?.simpleWeapons ?? 'untrained');
    };

    // PHASE 5.1 / PHASE 10.1: WEAPON SPECIALIZATION SCALING
    // Standard: +2 (expert), +3 (master), +4 (legendary)
    // Greater: +4 (expert), +6 (master), +8 (legendary)
    let weaponSpecializationBonus = 0;
    const proficiencyRank = getWeaponProficiencyRank();
    const standardSpecByRank: Record<'untrained' | 'trained' | 'expert' | 'master' | 'legendary', number> = {
      untrained: 0,
      trained: 0,
      expert: 2,
      master: 3,
      legendary: 4,
    };
    const greaterSpecByRank: Record<'untrained' | 'trained' | 'expert' | 'master' | 'legendary', number> = {
      untrained: 0,
      trained: 0,
      expert: 4,
      master: 6,
      legendary: 8,
    };

    if (attacker.characterClass === 'Fighter' && attacker.level >= 7) {
      weaponSpecializationBonus = attacker.level >= 15
        ? greaterSpecByRank[proficiencyRank]
        : standardSpecByRank[proficiencyRank];
    } else if (attacker.characterClass === 'Rogue' && attacker.level >= 7) {
      weaponSpecializationBonus = attacker.level >= 15
        ? greaterSpecByRank[proficiencyRank]
        : standardSpecByRank[proficiencyRank];
    } else if (attacker.characterClass === 'Barbarian' && attacker.level >= 7) {
      // Barbarian gets Weapon Specialization at 7. Greater Weapon Specialization at 15.
      weaponSpecializationBonus = attacker.level >= 15
        ? greaterSpecByRank[proficiencyRank]
        : standardSpecByRank[proficiencyRank];
    }

    // ── INVULNERABLE RAGER (L8) ──
    // While raging: resistance to ALL damage (2/4/6/8 by level bracket)
    let invulnerableRagerReduction = 0;
    if (attacker.rageActive && hasNamedFeatOnCreature(attacker, 'invulnerable rager')) {
      // Target-side resistance — we note it here for the return value,
      // but actual application happens at damage-receive time (see resolveAttackAction)
    }

    // MAGUS ARCANE CASCADE
    // Magus gains +1 force damage (or more with Weapon Specialization) while in Arcane Cascade stance
    // +1 base, +2 with Weapon Specialization (level 7), +3 with Greater Weapon Specialization (level 15)
    let arcaneCascadeBonus = 0;
    const hasArcaneCascade = attacker.conditions && attacker.conditions.some(c => c.name === 'Arcane Cascade');
    if (hasArcaneCascade) {
      arcaneCascadeBonus = 1; // +1 base force damage
      if (attacker.characterClass === 'Magus') {
        if (attacker.level >= 15) {
          arcaneCascadeBonus = 3;
        } else if (attacker.level >= 7) {
          arcaneCascadeBonus = 2;
        }
      }
    }

    // PHASE 10.1: ROGUE SNEAK ATTACK
    // Rogues add precision damage when target is off-guard
    // Precision damage is NOT doubled on critical hits
    let sneakAttackDamage = 0;
    if (canDealSneakAttack(attacker, selectedWeapon, targetIsOffGuard)) {
      const sneakAttack = rollSneakAttack(attacker);
      sneakAttackDamage = sneakAttack.damage;
    }

    baseDamage = Math.max(1, baseDamage + traitBonuses + weaponSpecializationBonus + arcaneCascadeBonus);
    const appliedDamage = isCriticalHit ? baseDamage * 2 + sneakAttackDamage : baseDamage + sneakAttackDamage;

    const dieMatch1 = formula.match(/(\d+)d(\d+)/);
    return {
      dice: { times: dieMatch1 ? parseInt(dieMatch1[1], 10) : 1, sides: dieMatch1 ? parseInt(dieMatch1[2], 10) : 1, results: roll.results, total: roll.total },
      weaponName: selectedWeapon.display,
      formula,
      abilityMod: flatBonus,
      traitBonuses,
      weaponSpecializationBonus,
      arcaneCascadeBonus,
      sneakAttackDamage,
      isCriticalHit,
      total: baseDamage,
      appliedDamage,
    };
  }

  // NPC/bestiary creatures with explicit weapon damage fields (legacy path)
  if (attacker.weaponDamageDice) {
    const formula = attacker.weaponDamageDice; // e.g. "1d6" or "2d8"
    const roll = rollDamageFormula(formula);
    const flatBonus = attacker.weaponDamageBonus ?? 0;

    const { bonuses: dmgBonuses, penalties: dmgPenalties } = getConditionModifiers(attacker.conditions || [], 'damage');
    const condMod = resolveStacking(dmgBonuses, dmgPenalties);

    const baseDamage = Math.max(1, roll.total + flatBonus + condMod);
    const appliedDamage = isCriticalHit ? baseDamage * 2 : baseDamage;

    const dieMatch2 = formula.match(/(\d+)d(\d+)/);
    return {
      dice: { times: dieMatch2 ? parseInt(dieMatch2[1], 10) : 1, sides: dieMatch2 ? parseInt(dieMatch2[2], 10) : 1, results: roll.results, total: roll.total },
      weaponName: attacker.weaponDisplay ?? 'Natural Attack',
      formula,
      abilityMod: flatBonus,
      isCriticalHit,
      total: baseDamage,
      appliedDamage,
    };
  }

  // Get weapon damage formula (unarmed = 1d4)
  const weapon = attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : null;
  const formula = weapon?.damageFormula ?? '1d4';
  const roll = rollDamageFormula(formula);

  // STR mod for melee damage (finesse still uses STR for damage in PF2e)
  const weaponType = weapon?.type ?? 'melee';
  const abilityMod = weaponType === 'melee' ? (attacker.abilities?.strength ?? 0) : 0;

  // Condition modifiers to damage (enfeebled, etc.)
  const { bonuses: dmgBonuses, penalties: dmgPenalties } = getConditionModifiers(attacker.conditions || [], 'damage');
  const condMod = resolveStacking(dmgBonuses, dmgPenalties);

  const baseDamage = Math.max(1, roll.total + abilityMod + condMod);

  // Critical hits double the damage (PF2e rule)
  const appliedDamage = isCriticalHit ? baseDamage * 2 : baseDamage;

  const dieMatch3 = formula.match(/(\d+)d(\d+)/);
  return {
    dice: { times: dieMatch3 ? parseInt(dieMatch3[1], 10) : 1, sides: dieMatch3 ? parseInt(dieMatch3[2], 10) : 1, results: roll.results, total: roll.total },
    weaponName: weapon?.name ?? 'Unarmed Strike',
    formula,
    abilityMod,
    isCriticalHit,
    total: baseDamage,
    appliedDamage,
  };
}

/**
 * Unified attack resolution for Strike and Vicious Swing.
 * Both share ~80% identical logic; differences are parameterized via options.
 */
export function resolveAttackAction(ctx: CombatActionContext, 
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  options: { isVicious: boolean } = { isVicious: false },
  heroPointsSpent?: number
): ActionResult {
  const actionName = options.isVicious ? 'Vicious Swing' : 'Strike';

  if (!targetId) {
    return { success: false, message: 'No target specified' , errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found' , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Resolve the weapon to use for this Strike
  const selectedWeapon = ctx.resolveSelectedWeapon(actor, weaponId);

  // Vicious Swing requires a melee weapon
  if (options.isVicious && selectedWeapon && selectedWeapon.attackType === 'ranged') {
    return { success: false, message: `Vicious Swing requires a melee weapon, but ${selectedWeapon.display} is ranged.` , errorCode: 'VALIDATION_FAILED' };
  }

  // If a non-natural weapon was specified, verify it's held
  if (selectedWeapon && !selectedWeapon.isNatural) {
    const slot = actor.weaponInventory?.find(s => s.weapon.id === selectedWeapon.id);
    if (slot && slot.state !== 'held') {
      return { success: false, message: `${selectedWeapon.display} is not drawn. Use Draw Weapon first.` , errorCode: 'WEAPON_NOT_DRAWN' };
    }
  }

  // Range/reach validation
  const rangeCheck = validateAttackRange(ctx, actor, target, selectedWeapon);
  if (!rangeCheck.ok) {
    return { success: false, message: rangeCheck.message , errorCode: 'VALIDATION_FAILED' };
  }

  // Check for flanking and apply off-guard condition if applicable
  applyFlankingOffGuard(actor, target, gameState);

  // PASSIVE ROGUE FEAT: Dread Striker
  // Frightened targets are off-guard against the Rogue's attacks
  if (ctx.hasFeat(actor, 'Dread Striker') && target.conditions?.some(c => c.name === 'frightened')) {
    if (!target.conditions) target.conditions = [];
    if (!target.conditions.some(c => c.name === 'off-guard' && c.source === 'dread-striker')) {
      target.conditions.push({ name: 'off-guard', duration: 0, value: 1, source: 'dread-striker', appliesAgainst: actor.id });
    }
  }

  // PASSIVE ROGUE FEAT: Gang Up
  // Foe within melee reach of you AND at least one ally = off-guard against you
  if (ctx.hasFeat(actor, 'Gang Up')) {
    const hasAllyAdjacent = gameState.creatures.some(c =>
      c.id !== actor.id && c.id !== target.id && c.currentHealth > 0 &&
      ctx.calculateDistance(c.positions, target.positions) <= 1.5
    );
    if (hasAllyAdjacent) {
      if (!target.conditions) target.conditions = [];
      if (!target.conditions.some(c => c.name === 'off-guard' && c.source === 'gang-up')) {
        target.conditions.push({ name: 'off-guard', duration: 0, value: 1, source: 'gang-up', appliesAgainst: actor.id });
      }
    }
  }

  // PHASE 10.1: ROGUE SURPRISE ATTACK
  // On round 1, if Rogue rolled Deception or Stealth for initiative and target hasn't acted, apply off-guard
  if (actor.characterClass === 'Rogue' && gameState.currentRound?.number === 1) {
    // Check if target hasn't acted yet (target's turn hasn't come in the initiative order)
    const targetIndex = gameState.currentRound?.turnOrder?.indexOf(target.id) ?? -1;
    const currentTurnIndex = gameState.currentRound?.currentTurnIndex ?? 0;
    if (targetIndex > currentTurnIndex || targetIndex === -1) {
      // PHASE 10.1: ROGUE DENY ADVANTAGE
      // Rogues at level 3+ deny Surprise Attack from equal or lower level creatures
      if (target.characterClass !== 'Rogue' || target.level < 3 || actor.level > target.level) {
        // Target doesn't have Deny Advantage, or attacker is higher level - apply off-guard
        if (!target.conditions) target.conditions = [];
        const existingOffGuard = target.conditions.find(c => c.name === 'off-guard' && c.source === `surprise-attack-${actor.id}`);
        if (!existingOffGuard) {
          target.conditions.push({
            name: 'off-guard',
            duration: 1, // Surprise Attack applies until target's turn ends
            source: `surprise-attack-${actor.id}`,
            appliesAgainst: actor.id,
          });
        }
      }
    }
  }

  // Consume Feint's "next melee attack" off-guard if it applies
  consumeFeintOffGuard(target, actor);

  const attackRoll = rollAttack(ctx, actor, target, gameState, selectedWeapon, heroPointsSpent);

  // Increment MAP counter and track target for Sweep (happens regardless of hit/miss)
  actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;
  if (!actor.attackTargetsThisTurn) actor.attackTargetsThisTurn = [];
  actor.attackTargetsThisTurn.push(target.id);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PHASE 2.1: FLAT CHECKS FOR CONCEALED/HIDDEN/INVISIBLE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Check for visibility conditions that require flat checks
  
  // BLINDED attacker: All creatures are hidden to you (DC 11 flat check)
  const attackerBlinded = actor.conditions?.some((c) => c.name === 'blinded');
  if (attackerBlinded) {
    const flatCheck = rollD20();
    if (flatCheck < 11) {
      return {
        success: false,
        message: `${actor.name} is blinded! DC 11 flat check failed (${flatCheck}) - attack failed`,
        details: { ...attackRoll, flatCheckFailed: true, flatCheck, flatCheckDC: 11 },
      };
    }
  }
  
  // DAZZLED attacker: All creatures are concealed to you (DC 5 flat check)
  const attackerDazzled = actor.conditions?.some((c) => c.name === 'dazzled');
  if (attackerDazzled) {
    const flatCheck = rollD20();
    if (flatCheck < 5) {
      return {
        success: false,
        message: `${actor.name} is dazzled! DC 5 flat check failed (${flatCheck}) - attack failed`,
        details: { ...attackRoll, flatCheckFailed: true, flatCheck, flatCheckDC: 5 },
      };
    }
  }
  
  // CONCEALED target: DC 5 flat check or attack fails
  // Blind-Fight: No flat check against concealed targets
  const hasBlindFight = ctx.hasFeat(actor, 'Blind-Fight');
  const targetConcealed = target.conditions?.some((c) => c.name === 'concealed');
  if (targetConcealed && !hasBlindFight) {
    const flatCheck = rollD20();
    if (flatCheck < 5) {
      return {
        success: false,
        message: `${target.name} is concealed! DC 5 flat check failed (${flatCheck}) - attack failed`,
        details: { ...attackRoll, flatCheckFailed: true, flatCheck, flatCheckDC: 5 },
      };
    }
  }
  
  // HIDDEN target: DC 11 flat check or attack auto-misses
  // Blind-Fight: Hidden creatures are only concealed (DC 5) instead of hidden (DC 11)
  const targetHidden = target.conditions?.some((c) => c.name === 'hidden');
  if (targetHidden) {
    const blindFightDC = hasBlindFight ? 5 : 11;
    const flatCheck = rollD20();
    if (flatCheck < blindFightDC) {
      return {
        success: false,
        message: `${target.name} is hidden! DC ${blindFightDC} flat check failed (${flatCheck}) - attack auto-missed${hasBlindFight ? ' (Blind-Fight: reduced DC)' : ''}`,
        details: { ...attackRoll, flatCheckFailed: true, flatCheck, flatCheckDC: blindFightDC },
      };
    }
  }
  
  // INVISIBLE target: combines Hidden + Undetected rules (DC 11 flat check)
  const targetInvisible = target.conditions?.some((c) => c.name === 'invisible');
  if (targetInvisible) {
    const flatCheck = rollD20();
    if (flatCheck < 11) {
      return {
        success: false,
        message: `${target.name} is invisible! DC 11 flat check failed (${flatCheck}) - attack auto-missed`,
        details: { ...attackRoll, flatCheckFailed: true, flatCheck, flatCheckDC: 11 },
      };
    }
  }

  // Handle misses and critical failures
  console.log(`🎯 [RESOLVE_ATTACK] attackRoll keys: ${Object.keys(attackRoll).join(',')}`);
  console.log(`🎯 [RESOLVE_ATTACK] attackRoll.bonus=${attackRoll.bonus} attackRoll.d20=${attackRoll.d20} attackRoll.total=${attackRoll.total} attackRoll.targetAC=${attackRoll.targetAC}`);
  console.log(`🎯 [RESOLVE_ATTACK] attackRoll full:`, JSON.stringify(attackRoll));
  const rollBreakdown = `(d20:${attackRoll.d20} +${attackRoll.bonus} = ${attackRoll.total} vs AC ${attackRoll.targetAC})`;
  if (attackRoll.result === 'critical-failure') {
    return {
      success: false,
      message: options.isVicious
        ? `âš°ï¸ CRITICAL FAILURE! ${actor.name} fumbled their vicious swing against ${target.name}! ${rollBreakdown}`
        : `âš°ï¸ CRITICAL FAILURE! ${actor.name} fumbled badly against ${target.name}! ${rollBreakdown}`,
      details: attackRoll,
    };
  }

  if (attackRoll.result === 'failure') {
    return {
      success: false,
      message: options.isVicious
        ? `âŒ ${actor.name}'s vicious swing missed ${target.name}! ${rollBreakdown}`
        : `âŒ ${actor.name} missed ${target.name}! ${rollBreakdown}`,
      details: attackRoll,
    };
  }

  // Roll damage - base weapon damage
  const isCriticalHit = attackRoll.result === 'critical-success';
  
  // Check if target is off-guard (for Backstabber trait)
  const targetIsOffGuard = target.conditions?.some((c) => c.name === 'off-guard') ?? false;
  
  const damageRoll = rollDamage(actor, isCriticalHit, selectedWeapon, targetIsOffGuard);

  // Vicious Swing: Add one extra damage die (doubles on crit)
  let extraDamage = 0;
  if (options.isVicious) {
    const baseFormula = selectedWeapon?.damageDice
      ?? actor.weaponDamageDice
      ?? (actor.equippedWeapon ? getWeapon(actor.equippedWeapon)?.damageFormula : null)
      ?? '1d4';
    const dieMatch = baseFormula.match(/(\d+)d(\d+)/i);
    const dieSides = dieMatch ? parseInt(dieMatch[2], 10) : 6;
    const extraRoll = rollDamageFormula(`1d${dieSides}`);
    extraDamage = isCriticalHit ? extraRoll.total * 2 : extraRoll.total;
    damageRoll.appliedDamage += extraDamage;
  }

  // PASSIVE FIGHTER FEAT: Savage Critical â€” extra weapon damage die on crits
  let savageCritDamage = 0;
  if (isCriticalHit && ctx.hasFeat(actor, 'Savage Critical')) {
    const baseFormula = selectedWeapon?.damageDice
      ?? actor.weaponDamageDice
      ?? (actor.equippedWeapon ? getWeapon(actor.equippedWeapon)?.damageFormula : null)
      ?? '1d4';
    const dieMatch = baseFormula.match(/(\d+)d(\d+)/i);
    const dieSides = dieMatch ? parseInt(dieMatch[2], 10) : 6;
    const savageRoll = rollDamageFormula(`1d${dieSides}`);
    savageCritDamage = savageRoll.total * 2; // Doubled because it's a crit
    damageRoll.appliedDamage += savageCritDamage;
  }

  // PASSIVE BARBARIAN FEAT: Brutal Critical (L18) — extra weapon die + persistent bleed on melee crits
  let brutalCritDamage = 0;
  let brutalCritBleed = 0;
  const resolvedAttackType = selectedWeapon?.attackType
    ?? (actor.equippedWeapon ? getWeapon(actor.equippedWeapon)?.type : null)
    ?? 'melee';
  if (isCriticalHit && resolvedAttackType === 'melee' && ctx.hasFeat(actor, 'Brutal Critical')) {
    const baseFormula = selectedWeapon?.damageDice
      ?? actor.weaponDamageDice
      ?? (actor.equippedWeapon ? getWeapon(actor.equippedWeapon)?.damageFormula : null)
      ?? '1d4';
    const dieMatch = baseFormula.match(/(\d+)d(\d+)/i);
    const dieSides = dieMatch ? parseInt(dieMatch[2], 10) : 6;
    // +1 weapon die (doubled on crit)
    const brutalRoll = rollDamageFormula(`1d${dieSides}`);
    brutalCritDamage = brutalRoll.total * 2;
    damageRoll.appliedDamage += brutalCritDamage;
    // Persistent bleed = 2 weapon dice
    const bleedRoll = rollDamageFormula(`2d${dieSides}`);
    brutalCritBleed = bleedRoll.total;
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'persistent-damage',
      duration: 'permanent',
      value: brutalCritBleed,
      source: 'brutal-critical',
    });
  }

  attackRoll.damage = damageRoll;

  // Elemental Assault: Add bonus elemental damage if condition is active
  let elementalDamage = 0;
  const elementalAssault = actor.conditions?.find(c => c.name === 'elemental-assault');
  if (elementalAssault) {
    const hasElementalWrath = ctx.hasFeat(actor, 'Elemental Wrath');
    const eaDice = hasElementalWrath ? '2d6' : '1d6';
    const eaRoll = rollDamageFormula(eaDice);
    elementalDamage = isCriticalHit ? eaRoll.total * 2 : eaRoll.total;
    damageRoll.appliedDamage += elementalDamage;
  }

  // Apply damage resistances using weapon's damage type
  // PASSIVE ROGUE FEAT: Impossible Striker â€” ignore ALL resistances vs off-guard targets
  const weaponDamageType = selectedWeapon?.damageType
    ?? actor.weaponDamageType
    ?? (actor.equippedWeapon ? getWeapon(actor.equippedWeapon)?.damageType : null)
    ?? 'bludgeoning';
  let damageCalc;
  if (targetIsOffGuard && ctx.hasFeat(actor, 'Impossible Striker')) {
    damageCalc = { finalDamage: damageRoll.appliedDamage, modifier: 'normal' as const };
  } else {
    damageCalc = calculateFinalDamage(damageRoll.appliedDamage, weaponDamageType, target);
  }
  let finalDamage = damageCalc.finalDamage;

  // PASSIVE BARBARIAN FEAT: Invulnerable Rager (L8) — resist ALL damage while raging
  if (target.rageActive && hasNamedFeatOnCreature(target, 'invulnerable rager')) {
    let invRes = 2;
    if (target.level >= 20) invRes = 8;
    else if (target.level >= 16) invRes = 6;
    else if (target.level >= 12) invRes = 4;
    finalDamage = Math.max(0, finalDamage - invRes);
  }

  // PASSIVE BARBARIAN FEAT: Unstoppable Juggernaut (L20) — resist (3+CON) all damage while raging
  if (target.rageActive && hasNamedFeatOnCreature(target, 'unstoppable juggernaut')) {
    const conMod = target.abilities ? Math.floor((target.abilities.constitution - 10) / 2) : 0;
    const unstoppableRes = 3 + conMod;
    finalDamage = Math.max(0, finalDamage - unstoppableRes);
  }

  // Hydraulic Deflection: Reduce physical damage by level if condition is active on target
  const hydraulicDeflection = target.conditions?.find(c => c.name === 'hydraulic-deflection');
  if (hydraulicDeflection && ['bludgeoning', 'piercing', 'slashing'].includes(weaponDamageType)) {
    const reduction = hydraulicDeflection.value ?? 0;
    finalDamage = Math.max(0, finalDamage - reduction);
    // Remove the condition after it's been consumed (one-time reaction)
    target.conditions = (target.conditions || []).filter(c => c.name !== 'hydraulic-deflection');
  }

  if (target.conditions?.length) {
    target.conditions = target.conditions.filter((c) => c.name !== 'shield-block-ready');
  }

  // Shield Block prompt
  const canShieldBlock = !!target.equippedShield && target.shieldRaised && !target.reactionUsed;
  if (canShieldBlock) {
    if (!target.conditions) target.conditions = [];
    target.conditions = target.conditions.filter((c) => c.name !== 'pending-damage');
    target.conditions.push({
      name: 'pending-damage',
      duration: 'permanent',
      value: finalDamage,
      source: `${options.isVicious ? 'vicious-swing' : 'strike'}-${actor.id}`,
      appliesAgainst: actor.id,
    });

    const extraInfo = options.isVicious ? ` (+${extraDamage} extra die)` : '';
    const damageMessage = isCriticalHit
      ? `${options.isVicious ? 'ðŸ©¸ VICIOUS CRITICAL' : 'ðŸŽ¯ CRITICAL HIT'}! ${actor.name} ${options.isVicious ? 'brutally swung at' : 'devastated'} ${target.name} for ${finalDamage} damage${extraInfo}! ${rollBreakdown}`
      : `${options.isVicious ? 'ðŸ©¸ VICIOUS SWING' : 'âœ“'} ${actor.name} ${options.isVicious ? 'savagely hit' : 'hit'} ${target.name} for ${finalDamage} damage${extraInfo} ${rollBreakdown}`;

    return {
      success: true,
      message: `${damageMessage} ${target.name} can Shield Block.`,
      details: attackRoll,
      pendingDamage: {
        targetId: target.id,
        targetName: target.name,
        amount: finalDamage,
        attackerId: actor.id,
        attackerName: actor.name,
        triggeringActionName: actionName,
      },
      ...(options.isVicious && { extraDamage }),
    };
  }

  // Apply damage through shield (if equipped and Shield Block is armed)
  const shieldResult = applyDamageToShield(target, finalDamage);

  // Apply creature damage
  target.currentHealth -= shieldResult.creatureTakenDamage;

  // Build damage message with shield info
  let shieldMessage = '';
  if (shieldResult.shieldAbsorbed > 0) {
    shieldMessage += ` [Shield absorbed ${shieldResult.shieldAbsorbed}]`;
    if (shieldResult.shieldTakenDamage > 0) {
      shieldMessage += ` [Shield takes ${shieldResult.shieldTakenDamage} dmg]`;
    }
    if (shieldResult.shieldBroken) {
      shieldMessage += ` ðŸ’¥ SHIELD BROKEN!`;
    }
  }

  const extraInfo = options.isVicious ? ` (+${extraDamage} extra die)` : '';
  const damageMessage = isCriticalHit
    ? `${options.isVicious ? 'ðŸ©¸ VICIOUS CRITICAL' : 'ðŸŽ¯ CRITICAL HIT'}! ${actor.name} ${options.isVicious ? 'brutally swung at' : 'devastated'} ${target.name} for ${finalDamage} damage${extraInfo}${shieldMessage}! ${rollBreakdown}`
    : `${options.isVicious ? 'ðŸ©¸ VICIOUS SWING' : 'âœ“'} ${actor.name} ${options.isVicious ? 'savagely hit' : 'hit'} ${target.name} for ${finalDamage} damage${extraInfo}${shieldMessage} ${rollBreakdown}`;

  let statusMessage = '';
  // Handle death saves and dying condition
  if (target.currentHealth <= 0) {
    if (!target.dying) {
      statusMessage = initDying(target);
    } else {
      statusMessage = ` ðŸ’€ ${target.name} is still dying...`;
    }
  }

  const finalMessage = `${damageMessage}${statusMessage}`;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PASSIVE ROGUE FEAT: Post-hit effects
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let passiveMessage = '';

  // Unbalancing Blow: Crit = target off-guard until end of next turn
  if (isCriticalHit && ctx.hasFeat(actor, 'Unbalancing Blow')) {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({
      name: 'off-guard', duration: 2, value: 1, source: 'unbalancing-blow',
      appliesAgainst: actor.id, expiresOnTurnEndOf: actor.id, turnEndsRemaining: 2,
    });
    passiveMessage += ` ðŸŒ€ Unbalancing Blow! ${target.name} is off-guard vs ${actor.name}!`;
  }

  // Brutal Beating: Crit melee sneak attack = target frightened 1
  if (isCriticalHit && ctx.hasFeat(actor, 'Brutal Beating') && damageRoll.sneakAttackDamage > 0) {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'frightened', duration: 1, value: 1, source: 'brutal-beating' });
    passiveMessage += ` ðŸ˜± Brutal Beating! ${target.name} is frightened 1!`;
  }

  // Poison Weapon: consume poison on hit, deal extra poison damage
  // PASSIVE ROGUE FEAT: Improved Poison Weapon â€” poison lasts for 2 strikes instead of 1
  const poisonCond = actor.conditions?.find(c => c.name === 'poison-weapon' && (c.usesRemaining ?? 0) > 0);
  if (poisonCond) {
    const poisonDice = poisonCond.value ?? 1;
    const poisonRoll = rollDamageFormula(`${poisonDice}d4`);
    const poisonDmg = isCriticalHit ? poisonRoll.total * 2 : poisonRoll.total;
    target.currentHealth -= poisonDmg;
    passiveMessage += ` ðŸ§ª Poison! +${poisonDmg} poison damage!`;
    // Consume a use (Improved Poison Weapon grants 2 uses)
    poisonCond.usesRemaining = (poisonCond.usesRemaining ?? 1) - 1;
    if (poisonCond.usesRemaining <= 0) {
      actor.conditions = (actor.conditions || []).filter(c => c.name !== 'poison-weapon');
    }
  }

  // PASSIVE ROGUE FEAT: Master Strike â€” sneak attack forces Fort save; enfeebled 2 or stunned 2
  if (damageRoll.sneakAttackDamage > 0 && ctx.hasFeat(actor, 'Master Strike')) {
    const keyAbilMod = Math.max(actor.abilities?.dexterity ?? 0, actor.abilities?.strength ?? 0);
    const classDC = 10 + actor.level + keyAbilMod;
    const fortBonus = calculateSaveBonus(target, 'fortitude');
    const d20 = rollD20();
    const total = d20 + fortBonus;
    const msResult = getDegreeOfSuccess(d20, total, classDC);
    if (!target.conditions) target.conditions = [];
    if (msResult === 'failure') {
      target.conditions.push({ name: 'enfeebled', duration: 'permanent', value: 2, source: 'master-strike', expiresOnTurnEndOf: actor.id, turnEndsRemaining: 2 });
      passiveMessage += ` âš”ï¸ Master Strike! ${target.name} fails Fort save (${d20}+${fortBonus}=${total} vs DC ${classDC}) â€” enfeebled 2!`;
    } else if (msResult === 'critical-failure') {
      target.conditions.push({ name: 'stunned', duration: 1, value: 2, source: 'master-strike' });
      passiveMessage += ` âš”ï¸ Master Strike! ${target.name} crit fails Fort save (${d20}+${fortBonus}=${total} vs DC ${classDC}) â€” stunned 2!`;
    } else {
      passiveMessage += ` âš”ï¸ Master Strike: ${target.name} resists (${d20}+${fortBonus}=${total} vs DC ${classDC})`;
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ROGUE CLASS FEATURE: Debilitating Strikes
  // On sneak attack hit, apply debilitation(s) to the target
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (damageRoll.sneakAttackDamage > 0 && ctx.hasFeat(actor, 'Debilitating Strikes')) {
    if (!target.conditions) target.conditions = [];
    // Remove old debilitations from this actor
    target.conditions = target.conditions.filter(c => c.source !== `debilitation-${actor.id}`);

    const debDuration = (isCriticalHit && ctx.hasFeat(actor, 'Critical Debilitation')) ? 4 : 2;
    const hasDouble = ctx.hasFeat(actor, 'Double Debilitation');
    let debCount = 0;

    // Base debilitation: -10 Speed
    target.conditions.push({
      name: 'slowed-speed', duration: 'permanent', value: 10, source: `debilitation-${actor.id}`,
      expiresOnTurnEndOf: actor.id, turnEndsRemaining: debDuration,
    });
    passiveMessage += ` ðŸŽ¯ Debilitating Strike! ${target.name} takes -10 ft Speed penalty!`;
    debCount++;

    // Double Debilitation: also apply off-guard
    if (hasDouble) {
      target.conditions.push({
        name: 'off-guard', duration: 'permanent', value: 1, source: `debilitation-${actor.id}`,
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: debDuration,
      });
      passiveMessage += ` Double Debilitation! Also off-guard!`;
      debCount++;
    }

    // Racket-specific debilitations (if Double Debilitation, add as 2nd; otherwise replace base)
    if (actor.rogueRacket === 'thief' && ctx.hasFeat(actor, 'Precise Debilitations')) {
      // +2d6 precision damage on next attack vs target (implemented as a condition the attacker checks)
      target.conditions.push({
        name: 'precise-debilitation', duration: 'permanent', value: 2, source: `debilitation-${actor.id}`,
        appliesAgainst: actor.id, expiresOnTurnEndOf: actor.id, turnEndsRemaining: debDuration,
      });
      passiveMessage += ` ðŸŽ¯ Precise Debilitation!`;
    } else if (actor.rogueRacket === 'mastermind' && ctx.hasFeat(actor, 'Methodical Debilitations')) {
      target.conditions.push({
        name: 'clumsy', duration: 'permanent', value: 1, source: `debilitation-${actor.id}`,
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: debDuration,
      });
      passiveMessage += ` ðŸ§  Methodical Debilitation! ${target.name} is clumsy 1!`;
    } else if (actor.rogueRacket === 'ruffian' && ctx.hasFeat(actor, 'Vicious Debilitations')) {
      target.conditions.push({
        name: 'enfeebled', duration: 'permanent', value: 1, source: `debilitation-${actor.id}`,
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: debDuration,
      });
      passiveMessage += ` ðŸ’ª Vicious Debilitation! ${target.name} is enfeebled 1!`;
    } else if (actor.rogueRacket === 'scoundrel' && ctx.hasFeat(actor, 'Tactical Debilitations')) {
      target.conditions.push({
        name: 'off-guard', duration: 'permanent', value: 1, source: `debilitation-tactical-${actor.id}`,
        expiresOnTurnEndOf: actor.id, turnEndsRemaining: debDuration,
      });
      passiveMessage += ` ðŸŽ­ Tactical Debilitation! ${target.name} is off-guard!`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PASSIVE BARBARIAN FEAT: Post-hit effects
  // ═══════════════════════════════════════════════════════════

  // Brutal Critical messaging (damage already applied above)
  if (brutalCritDamage > 0) {
    passiveMessage += ` 💀 Brutal Critical! +${brutalCritDamage} damage and ${brutalCritBleed} persistent bleed!`;
  }

  // Come and Get Me: if target has condition, attacker becomes off-guard and target gains temp HP
  if (target.rageActive) {
    const comeAndGetMe = target.conditions?.find(c => c.name === 'come-and-get-me');
    if (comeAndGetMe) {
      // Attacker becomes off-guard to target's melee attacks
      if (!actor.conditions) actor.conditions = [];
      const alreadyOffGuard = actor.conditions.some(c =>
        c.name === 'off-guard' && c.source === 'come-and-get-me' && c.appliesAgainst === target.id);
      if (!alreadyOffGuard) {
        actor.conditions.push({
          name: 'off-guard', duration: 'permanent', value: 1,
          source: 'come-and-get-me', appliesAgainst: target.id,
        });
      }
      // Target gains temp HP = CON mod (doubled on crit)
      const conMod = target.abilities ? Math.floor((target.abilities.constitution - 10) / 2) : 0;
      const tempHP = isCriticalHit ? conMod * 2 : conMod;
      if (tempHP > 0) {
        target.temporaryHealth = Math.max(target.temporaryHealth ?? 0, tempHP);
        passiveMessage += ` 🛡️ Come and Get Me! ${target.name} gains ${tempHP} temp HP!`;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REACTION TRIGGERS: Fire events for reactive abilities
  // Collects available reactions so the UI can prompt players.
  // ═══════════════════════════════════════════════════════════
  const triggerContext = {
    damageAmount: finalDamage,
    damageType: weaponDamageType,
    attackResult: (isCriticalHit ? 'crit' : 'hit') as 'hit' | 'crit',
    isMelee: selectedWeapon?.attackType === 'melee',
    isRanged: selectedWeapon?.attackType === 'ranged',
  };

  // Fire hit/crit triggers (allies of the target may react, e.g., Reactive Strike)
  const hitReactions = fireReactionTrigger(
    isCriticalHit ? 'on-crit' : 'on-hit',
    actor.id,
    gameState,
    triggerContext,
  );

  // Fire on-damaged trigger (target itself may react, e.g., Vengeful Strike)
  const damagedReactions = fireReactionTrigger(
    'on-damaged',
    actor.id,
    gameState,
    triggerContext,
  );

  // Combine all pending reactions for the return payload
  const pendingReactions = [...hitReactions, ...damagedReactions];

  return {
    success: true,
    message: finalMessage + passiveMessage,
    details: attackRoll,
    targetHealth: target.currentHealth,
    targetDying: target.dying,
    shieldDamage: shieldResult,
    ...(options.isVicious && { extraDamage }),
    ...(brutalCritDamage > 0 && { brutalCritDamage, brutalCritBleed }),
    ...(pendingReactions.length > 0 && { pendingReactions }),
  };
}

// 
// Death Saves
// 

/**
 * PF2e Remaster Recovery Check
 * Flat check DC = 10 + dying value
 * Critical Success: dying reduced by 2 (if dying reaches 0, creature wakes at 0 HP, wounded +1)
 * Success: dying reduced by 1 (if dying reaches 0, creature stabilizes, wounded +1)
 * Failure: dying increased by 1
 * Critical Failure: dying increased by 2
 * Dying 4+ = dead
 */
export function rollDeathSave(ctx: CombatActionContext, creature: Creature, heroPointsSpent?: number): ActionResult {
  // Check if recovery check already made this turn
  if (creature.deathSaveMadeThisTurn) {
    return {
      success: false,
      message: `${creature.name} has already made their recovery check this turn!`,
      errorCode: 'ALREADY_USED',
    };
  }

  // Mark that recovery check was made this turn
  creature.deathSaveMadeThisTurn = true;

  // Get current dying value from condition
  const dyingCondition = creature.conditions?.find((c) => c.name === 'dying');
  const dyingValue = dyingCondition?.value ?? 1;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PHASE 2.4: DOOMED + DYING INTERACTION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Check for doomed condition - you die at dying value = (4 - doomed value)
  const doomedCondition = creature.conditions?.find((c) => c.name === 'doomed');
  const doomedValue = doomedCondition?.value ?? 0;
  // Diehard (and Grimspawn lineage): die at dying 5 instead of 4
  const hasDiehardLikeBenefit = ctx.hasFeat(creature, 'Diehard') || ctx.hasFeat(creature, 'Grimspawn');
  const baseDyingMax = hasDiehardLikeBenefit ? 5 : 4;
  const deathThreshold = baseDyingMax - doomedValue;

  // PF2e Recovery Check: flat check DC = 10 + dying value
  const d20 = rollD20();
  let total = d20; // Flat check â€” no modifiers
  let finalD20 = d20;
  let heroPointMessage: string | undefined;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(creature, heroPointsSpent, {
      d20,
      bonus: 0,
      total,
      result: 'pending',
    });

    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
      heroPointMessage = spendResult.message;
    }
  }
  // Toughness: reduce recovery check DC by 1
  const toughnessBonus = ctx.hasFeat(creature, 'Toughness') ? 1 : 0;
  const dc = 10 + dyingValue - toughnessBonus;

  const result = getDegreeOfSuccess(finalD20, total, dc);

  let statusUpdate = '';
  let newDyingValue = dyingValue;

  if (result === 'critical-success') {
    // Reduce dying by 2
    newDyingValue = Math.max(0, dyingValue - 2);
    if (newDyingValue <= 0) {
      creature.dying = false;
      creature.conditions = creature.conditions.filter((c) => c.name !== 'dying');
      creature.wounded = (creature.wounded ?? 0) + 1;
      // Bounce Back: regain 2Ã—level + CON mod HP on recovery
      if (ctx.hasFeat(creature, 'Bounce Back')) {
        const conMod = creature.abilities?.constitution ?? 0;
        creature.currentHealth = Math.max(1, (creature.level * 2) + conMod);
        statusUpdate = `âœ¨ ${creature.name} BOUNCES BACK with ${creature.currentHealth} HP! (wounded ${creature.wounded})`;
      } else {
        creature.currentHealth = 0;
        statusUpdate = `âœ¨ ${creature.name} RECOVERS! (no longer dying, wounded ${creature.wounded})`;
      }
    } else {
      if (dyingCondition) dyingCondition.value = newDyingValue;
      statusUpdate = `âœ¨ ${creature.name} improves! (dying ${dyingValue} â†’ ${newDyingValue})`;
    }
  } else if (result === 'success') {
    // Reduce dying by 1
    newDyingValue = Math.max(0, dyingValue - 1);
    if (newDyingValue <= 0) {
      creature.dying = false;
      creature.conditions = creature.conditions.filter((c) => c.name !== 'dying');
      creature.wounded = (creature.wounded ?? 0) + 1;
      creature.conditions.push({ name: 'unconscious', duration: 'permanent' });
      // Bounce Back: regain HP on recovery
      if (ctx.hasFeat(creature, 'Bounce Back')) {
        const conMod = creature.abilities?.constitution ?? 0;
        creature.currentHealth = Math.max(1, (creature.level * 2) + conMod);
        statusUpdate = `ðŸ›¡ï¸ ${creature.name} stabilizes and BOUNCES BACK with ${creature.currentHealth} HP! (unconscious, wounded ${creature.wounded})`;
      } else {
        creature.currentHealth = 0;
        statusUpdate = `ðŸ›¡ï¸ ${creature.name} stabilizes! (unconscious at 0 HP, wounded ${creature.wounded})`;
      }
    } else {
      if (dyingCondition) dyingCondition.value = newDyingValue;
      statusUpdate = `âœ“ ${creature.name} holds on! (dying ${dyingValue} â†’ ${newDyingValue})`;
    }
  } else if (result === 'failure') {
    // Increase dying by 1
    newDyingValue = dyingValue + 1;
    if (newDyingValue >= deathThreshold) {
      creature.dying = false;
      creature.dead = true;
      creature.currentHealth = 0;
      creature.conditions = creature.conditions.filter((c) => c.name !== 'dying');
      const doomMessage = doomedValue > 0 ? ` (doomed ${doomedValue}, death at dying ${deathThreshold})` : '';
      statusUpdate = `ðŸ’€ ${creature.name} is DEAD! (dying ${newDyingValue}${doomMessage})`;
    } else {
      if (dyingCondition) dyingCondition.value = newDyingValue;
      statusUpdate = `âœ— ${creature.name} worsens! (dying ${dyingValue} â†’ ${newDyingValue})`;
    }
  } else {
    // Critical failure: increase dying by 2
    newDyingValue = dyingValue + 2;
    if (newDyingValue >= deathThreshold) {
      creature.dying = false;
      creature.dead = true;
      creature.currentHealth = 0;
      creature.conditions = creature.conditions.filter((c) => c.name !== 'dying');
      const doomMessage = doomedValue > 0 ? ` (doomed ${doomedValue}, death at dying ${deathThreshold})` : '';
      statusUpdate = `ðŸ’€ ${creature.name} is DEAD! (dying ${newDyingValue}${doomMessage})`;
    } else {
      if (dyingCondition) dyingCondition.value = newDyingValue;
      statusUpdate = `âš°ï¸ ${creature.name} fails badly! (dying ${dyingValue} â†’ ${newDyingValue})`;
    }
  }

  return {
    success: true,
    message: statusUpdate,
    details: {
      d20: finalD20,
      total,
      dc,
      result,
      dyingValue: newDyingValue,
      wounded: creature.wounded,
      isDying: creature.dying,
      isDead: creature.dead ?? false,
      doomedValue,
      deathThreshold,
      ...(heroPointMessage && { heroPointMessage, heroPointsSpent }),
    },
  };
}

// 
// Shield Actions
// 

export function resolveRaiseShield(actor: Creature): ActionResult {
  // Check if actor has an equipped shield
  if (!actor.equippedShield) {
    return {
      success: false,
      message: `${actor.name} has no shield equipped!`,
      errorCode: 'NO_SHIELD_EQUIPPED',
    };
  }

  // Check if shield is already raised
  if (actor.shieldRaised) {
    return {
      success: false,
      message: `${actor.name} already has their shield raised!`,
      errorCode: 'ALREADY_IN_STATE',
    };
  }

  // Raise the shield
  actor.shieldRaised = true;

  return {
    success: true,
    message: `ðŸ›¡ï¸ ${actor.name} raises their shield! AC and shield hardness now active.`,
    shieldRaised: true,
  };
}

export function resolveLowerShield(actor: Creature): ActionResult {
  // Check if shield is raised
  if (!actor.shieldRaised) {
    return {
      success: false,
      message: `${actor.name} doesn't have a shield raised!`,
      errorCode: 'NOT_IN_STATE',
    };
  }

  // Lower the shield
  actor.shieldRaised = false;

  return {
    success: true,
    message: `${actor.name} lowers their shield. Shield AC and hardness no longer active.`,
    shieldRaised: false,
  };
}

/**
 * Shield Block - Use a reaction to reduce incoming damage with a raised shield
 */
export function resolveShieldBlock(actor: Creature): ActionResult {
  if (actor.reactionUsed) {
    return { success: false, message: `${actor.name} has already used their reaction this round!` , errorCode: 'REACTION_USED' };
  }

  if (!actor.equippedShield) {
    return { success: false, message: `${actor.name} has no shield equipped!` , errorCode: 'NO_SHIELD_EQUIPPED' };
  }

  if (!actor.shieldRaised) {
    return { success: false, message: `${actor.name} must have their shield raised to block!` , errorCode: 'NO_SHIELD_EQUIPPED' };
  }

  const pending = actor.conditions?.find((c) => c.name === 'pending-damage' && typeof c.value === 'number');
  if (!pending || typeof pending.value !== 'number') {
    return { success: false, message: `${actor.name} has no damage to block right now.` , errorCode: 'VALIDATION_FAILED' };
  }

  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({
    name: 'shield-block-ready',
    duration: 'permanent',
    usesRemaining: 1,
    source: 'shield-block',
  });

  actor.reactionUsed = true;

  const shieldResult = applyDamageToShield(actor, pending.value);
  actor.currentHealth -= shieldResult.creatureTakenDamage;

  actor.conditions = actor.conditions.filter((c) => c !== pending);

  let shieldMessage = '';
  if (shieldResult.shieldAbsorbed > 0) {
    shieldMessage += ` [Shield absorbed ${shieldResult.shieldAbsorbed}]`;
    if (shieldResult.shieldTakenDamage > 0) {
      shieldMessage += ` [Shield takes ${shieldResult.shieldTakenDamage} dmg]`;
    }
    if (shieldResult.shieldBroken) {
      shieldMessage += ` ðŸ’¥ SHIELD BROKEN!`;
    }
  }

  let statusMessage = '';
  if (actor.currentHealth <= 0) {
    if (!actor.dying) {
      statusMessage = initDying(actor);
    } else {
      statusMessage = ` ðŸ’€ ${actor.name} is still dying...`;
    }
  }

  return {
    success: true,
    message: `ðŸ›¡ï¸ ${actor.name} Shield Blocks the hit!${shieldMessage}${statusMessage}`,
    targetHealth: actor.currentHealth,
    targetDying: actor.dying,
    shieldDamage: shieldResult,
  };
}

/**
 * Resolve pending damage without Shield Block
 */
export function resolvePendingDamage(actor: Creature): ActionResult {
  const pending = actor.conditions?.find((c) => c.name === 'pending-damage' && typeof c.value === 'number');
  if (!pending || typeof pending.value !== 'number') {
    return { success: false, message: `${actor.name} has no pending damage to resolve.` , errorCode: 'VALIDATION_FAILED' };
  }

  actor.currentHealth -= pending.value;
  actor.conditions = actor.conditions.filter((c) => c !== pending);

  let statusMessage = '';
  if (actor.currentHealth <= 0) {
    if (!actor.dying) {
      statusMessage = initDying(actor);
    } else {
      statusMessage = ` ðŸ’€ ${actor.name} is still dying...`;
    }
  }

  return {
    success: true,
    message: `âœ“ ${actor.name} takes ${pending.value} damage.${statusMessage}`,
    targetHealth: actor.currentHealth,
    targetDying: actor.dying,
  };
}

// 
// Reactive Strike
// 

/**
 * Reactive Strike - Make a Strike as a reaction
 * PASSIVE FIGHTER FEAT: Combat Reflexes â€” gain one extra reaction per round for Reactive Strike only
 * PASSIVE FIGHTER FEAT: Boundless Reprisals â€” gain a reaction at the start of each enemy's turn
 */
export function resolveReactiveStrike(ctx: CombatActionContext, actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  // Combat Reflexes: Allow a second Reactive Strike if normal reaction is used
  const hasCombatReflexes = ctx.hasFeat(actor, 'Combat Reflexes');
  const extraRSAvailable = hasCombatReflexes && !actor.combatReflexesUsed;
  
  if (actor.reactionUsed && !extraRSAvailable) {
    return { success: false, message: `${actor.name} has already used their reaction this round!` , errorCode: 'REACTION_USED' };
  }

  const featMatch = actor.feats?.some((feat) => {
    if (typeof feat?.name !== 'string') return false;
    const name = feat.name.toLowerCase();
    return name.includes('reactive strike') || name.includes('attack of opportunity');
  }) ?? false;

  const specials = actor.specials;
  const specialsMatch = Array.isArray(specials)
    ? specials.some((entry) => typeof entry === 'string' && entry.toLowerCase().includes('reactive strike'))
    : false;

  const hasReactiveStrike = featMatch || specialsMatch;
  if (!hasReactiveStrike) {
    return { success: false, message: `${actor.name} does not have Reactive Strike.` , errorCode: 'NOT_IN_STATE' };
  }

  if (!targetId) {
    return { success: false, message: 'No target specified for Reactive Strike!' , errorCode: 'NO_TARGET' };
  }

  // Mark reaction as used; if already used and Combat Reflexes, use the extra
  if (actor.reactionUsed && extraRSAvailable) {
    actor.combatReflexesUsed = true;
  } else {
    actor.reactionUsed = true;
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  let appliedMobilityBonus = false;
  if (target?.conditions?.some((c) => c.name === 'mobility-vs-reactions')) {
    if (!target.bonuses) target.bonuses = [];
    target.bonuses.push({ source: 'mobility-vs-reactions', value: 2, type: 'circumstance', applyTo: 'ac' });
    appliedMobilityBonus = true;
  }

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId);

  // PASSIVE FIGHTER FEAT: Guiding Riposte â€” if parrying and riposte hits, can move target 10 ft
  const hasGuidingRiposte = ctx.hasFeat(actor, 'Guiding Riposte');
  const hasParryDefenseActive = (actor.bonuses || []).some((b) =>
    ['dueling-parry', 'twin-parry', 'improved-dueling-parry', 'twinned-defense'].includes(b.source)
  );
  const hit = strikeResult?.details?.result === 'success' || strikeResult?.details?.result === 'critical-success';
  if (hasGuidingRiposte && hasParryDefenseActive && hit) {
    strikeResult.message += ' âš”ï¸âž¡ï¸ Guiding Riposte! You can move the target up to 10 feet within your reach.';
  }

  if (appliedMobilityBonus && target) {
    target.bonuses = (target.bonuses || []).filter((b) => b.source !== 'mobility-vs-reactions');
    target.conditions = (target.conditions || []).filter((c) => c.name !== 'mobility-vs-reactions');
    strikeResult.message += ' (target had Mobility +2 AC vs this reaction)';
  }

  return {
    ...strikeResult,
    message: `âš¡ Reactive Strike! ${strikeResult.message}`,
  };
}

// 
// Take Cover
// 

export function resolveTakeCover(actor: Creature): ActionResult {
  const isProne = actor.conditions?.some((c) => c.name === 'prone') || false;

  if (isProne) {
    // Hunker down while prone
    const existingHunker = actor.conditions?.find((c) => c.name === 'hunker-down');
    if (existingHunker) {
      return {
        success: false,
        message: `${actor.name} is already hunkered down!`,
        errorCode: 'ALREADY_IN_STATE',
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
      message: `ðŸªµ ${actor.name} hunkers down! Gains **+4 AC vs ranged attacks** (still off-guard to all attacks).`,
    };
  } else {
    // Normal take cover (requires cover nearby - simplified to always succeed)
    const existingCover = actor.conditions?.find((c) => c.name === 'cover');
    if (existingCover) {
      return {
        success: false,
        message: `${actor.name} is already taking cover!`,
        errorCode: 'ALREADY_IN_STATE',
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
      message: `ðŸªµ ${actor.name} takes cover! Gains **+2 AC** from cover.`,
    };
  }
}

// 
// Feint
// 

/**
 * Feint - Make a Deception check against the target's Perception DC
* Success: Target is off-guard against your melee attacks until end of your next turn
* Critical Success: Target is off-guard against all your attacks until end of your next turn
 */
export function resolveFeint(ctx: CombatActionContext, 
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent?: number
): ActionResult {
  if (!targetId) {
    return { success: false, message: 'No target specified for Feint!' , errorCode: 'NO_TARGET' };
  }

  const target = gameState.creatures.find((c) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found!' , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Get Deception skill bonus
  const deceptionBonus = ctx.getSkillBonus(actor, 'Deception');
  const perceptionDC = ctx.getPerceptionDC(target);

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
    // PHASE 10.1: SCOUNDREL RACKET
    // Scoundrel's Feint on crit: target is off-guard against ALL melee attacks
    if (actor.rogueRacket === 'scoundrel') {
      target.conditions = target.conditions || [];
      const cond = {
        name: 'off-guard',
        duration: 'permanent' as const,
        source: `Feint from ${actor.name}`,
        // No appliesAgainst: applies to all melee attacks
        attackType: 'melee' as const,
        expiresOnTurnEndOf: actor.id,
        turnEndsRemaining: 2,
      };
      target.conditions.push(cond);
      message = `ðŸŽ­ CRITICAL SUCCESS! ${actor.name} feints masterfully! ${target.name} is OFF-GUARD against all melee attacks until end of ${actor.name}'s next turn!`;
    } else {
      // Standard Feint: off-guard vs actor's melee attacks
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
      message = `ðŸŽ­ CRITICAL SUCCESS! ${actor.name} feints masterfully! ${target.name} is OFF-GUARD against ${actor.name}'s melee attacks until end of ${actor.name}'s next turn!`;
    }
  } else if (result === 'success') {
    // PHASE 10.1: SCOUNDREL RACKET
    // Scoundrel's Feint on success: off-guard until end of next turn (not just next attack)
    if (actor.rogueRacket === 'scoundrel') {
      target.conditions = target.conditions || [];
      const cond = {
        name: 'off-guard',
        duration: 'permanent' as const,
        source: `Feint from ${actor.name}`,
        appliesAgainst: actor.id,
        attackType: 'melee' as const,
        expiresOnTurnEndOf: actor.id,
        turnEndsRemaining: 2, // Until end of next turn
      };
      target.conditions.push(cond);
      message = `ðŸŽ­ SUCCESS! ${actor.name} feints ${target.name}! ${target.name} is OFF-GUARD against ${actor.name}'s melee attacks until end of ${actor.name}'s next turn!`;
    } else {
      // Standard Feint: off-guard against next melee attack
      // PASSIVE ROGUE FEAT: Distracting Feint â€” off-guard vs ALL your attacks until end of next turn
      const hasDistractingFeint = ctx.hasFeat(actor, 'Distracting Feint');
      target.conditions = target.conditions || [];
      if (hasDistractingFeint) {
        const cond = {
          name: 'off-guard',
          duration: 'permanent' as const,
          source: `Feint from ${actor.name}`,
          appliesAgainst: actor.id,
          // No attackType restriction: applies to ALL attacks
          expiresOnTurnEndOf: actor.id,
          turnEndsRemaining: 2,
        };
        target.conditions.push(cond);
        message = `ðŸŽ­ SUCCESS! ${actor.name} feints ${target.name}! ðŸŽª Distracting Feint! ${target.name} is OFF-GUARD against ALL of ${actor.name}'s attacks until end of ${actor.name}'s next turn!`;
      } else {
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
        message = `ðŸŽ­ SUCCESS! ${actor.name} feints ${target.name}! ${target.name} is OFF-GUARD against ${actor.name}'s next melee attack before end of ${actor.name}'s current turn!`;
      }
    }
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
    debugLog(`\nðŸŽ­ [FEINT CRIT FAIL] Applied off-guard to ${actor.name}:`, JSON.stringify(cond));
    message = `ðŸŽ­ CRITICAL FAILURE! ${actor.name}'s feint backfires. ${actor.name} is OFF-GUARD against ${target.name}'s melee attacks until end of ${actor.name}'s next turn!`;
  } else {
    message = `ðŸŽ­ FAILURE! ${target.name} sees through ${actor.name}'s feint.`;
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

// 
// Saving Throws & Retching
// 

export function rollSave(ctx: CombatActionContext, 
  creature: Creature,
  saveType: 'reflex' | 'fortitude' | 'will',
  saveDC: number,
  heroPointsSpent?: number,
  effectTraits?: string[]
): {
  d20: number;
  bonus: number;
  total: number;
  result: string;
} {
  const d20 = rollD20();
  const bonus = calculateSaveBonus(creature, saveType);
  let total = d20 + bonus;
  let finalD20 = d20;

  if (heroPointsSpent && heroPointsSpent > 0) {
    const spendResult = ctx.spendHeroPoints(creature, heroPointsSpent, {
      d20,
      bonus,
      total,
      result: 'pending',
    });

    if (spendResult.success && spendResult.newRoll) {
      finalD20 = spendResult.newRoll.d20;
      total = spendResult.newRoll.total;
    }
  }

  const result = getDegreeOfSuccess(finalD20, total, saveDC);

  // PHASE 10.1: ROGUE SAVE IMPROVEMENTS
  // Evasive Reflexes (level 7): Reflex success â†’ critical success
  // Rogue Resilience (level 9): Fortitude success â†’ critical success
  // Greater Rogue Reflexes (level 13): Reflex crit fail â†’ fail, fail â†’ success, success â†’ crit success
  // Agile Mind (level 17): Will success â†’ critical success
  let finalResult = result;
  if (creature.characterClass === 'Rogue') {
    if (saveType === 'reflex' && creature.level >= 13) {
      // Greater Rogue Reflexes: upgrade all results one step up
      if (finalResult === 'critical-failure') {
        finalResult = 'failure';
      } else if (finalResult === 'failure') {
        finalResult = 'success';
      } else if (finalResult === 'success') {
        finalResult = 'critical-success';
      }
    } else if (saveType === 'reflex' && creature.level >= 7) {
      // Evasive Reflexes: success â†’ critical success
      if (finalResult === 'success') {
        finalResult = 'critical-success';
      }
    } else if (saveType === 'fortitude' && creature.level >= 9) {
      // Rogue Resilience: success â†’ critical success
      if (finalResult === 'success') {
        finalResult = 'critical-success';
      }
    } else if (saveType === 'will' && creature.level >= 17) {
      // Agile Mind: success â†’ critical success
      if (finalResult === 'success') {
        finalResult = 'critical-success';
      }
    }
  }

  // â”€â”€ FEAT-BASED SAVE BONUSES (conditional on effect traits) â”€â”€
  const traits = effectTraits ?? [];
  const hasEmotion = traits.includes('emotion');
  const hasMentalControl = traits.includes('mental') && (traits.includes('incapacitation') || traits.includes('controlled'));
  const hasMagic = traits.includes('magical') || traits.includes('spell') || traits.includes('arcane') || traits.includes('divine') || traits.includes('occult') || traits.includes('primal');

  // Forlorn: success â†’ crit success vs emotion effects
  if (hasEmotion && ctx.hasFeat(creature, 'Forlorn') && finalResult === 'success') {
    finalResult = 'critical-success';
  }
  // Haughty Obstinacy: success â†’ crit success vs mental control
  if (hasMentalControl && ctx.hasFeat(creature, 'Haughty Obstinacy') && finalResult === 'success') {
    finalResult = 'critical-success';
  }
  // Unwavering Mien: success â†’ crit success vs sleep effects
  if (traits.includes('sleep') && ctx.hasFeat(creature, 'Unwavering Mien') && finalResult === 'success') {
    finalResult = 'critical-success';
  }
  // Ancestral Suspicion: +2 circumstance vs mental control (already baked into bonuses via sheetToCreature)
  // Pervasive Superstition: +1 circumstance vs magic (already baked into bonuses via sheetToCreature)

  return { d20: finalD20, bonus, total, result: finalResult };
}


// â”€â”€â”€ Sickened Condition: Retching Action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PF2e Remaster: Spend 1 action to make a Fortitude save against the effect DC
// Success: Reduce sickened by 1. Crit success: Reduce by 2
export function resolveRetching(ctx: CombatActionContext, actor: Creature, heroPointsSpent?: number): ActionResult {
  // Check if actor is Sickened
  const sickenedCondition = actor.conditions?.find(c => c.name === 'sickened');
  if (!sickenedCondition) {
    return { 
      success: false, 
      message: `${actor.name} is not sickened and cannot use the Retching action.`,
      errorCode: 'NOT_IN_STATE',
    };
  }

  // Roll Fortitude save against the effect DC that applied sickened
  // Default DC 16 if no effect DC was tracked (should be tracking effect DC with condition)
  const effectDC = sickenedCondition.sourceEffectDC || 16;
  const saveRoll = rollSave(ctx, actor, 'fortitude', effectDC, heroPointsSpent);

  let sickenedReduction = 0;
  let message = '';

  if (saveRoll.result === 'critical-success') {
    sickenedReduction = 2;
    message = `${actor.name} retches desperately. Critical Success! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) â€” Sickened reduced by 2.`;
  } else if (saveRoll.result === 'success') {
    sickenedReduction = 1;
    message = `${actor.name} retches. Success! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) â€” Sickened reduced by 1.`;
  } else if (saveRoll.result === 'failure') {
    message = `${actor.name} retches unsuccessfully. Failure! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) â€” Sickened remains unchanged.`;
  } else if (saveRoll.result === 'critical-failure') {
    message = `${actor.name} retches but worsens. Critical Failure! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) â€” Sickened remains unchanged.`;
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

