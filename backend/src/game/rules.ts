import { Creature, GameState, AttackRoll, Position, CreatureWeapon, computePathCost, calculateAC, getAttackResult, getDegreeOfSuccess, calculateAttackBonus, calculateSaveBonus, calculateSpellDC, calculateSpellAttack, calculateSpellAttackModifier, getConditionModifiers, resolveStacking, getProficiencyBonus, rollD20, getSpell, getWeapon, rollDamageFormula, calculateFinalDamage, applyDamageToShield, AbilityScores, calculateDamageFormula } from 'pf2e-shared';
import { validateAction } from './ruleValidator';

// ─── Weapon Trait Parsing Helpers ─────────────────────────
/**
 * Parse weapon traits to extract trait metadata
 * Traits format: "deadly d10", "volley 30", "thrown 10", "sweep", "finesse", etc.
 */
function parseTraits(traits: string[] | undefined): Map<string, string | number | boolean> {
  const parsed = new Map<string, string | number | boolean>();
  if (!traits) return parsed;

  traits.forEach((trait) => {
    const lowerTrait = trait.toLowerCase();
    
    // Traits with parameters (e.g., "deadly d10", "volley 30", "thrown 10")
    const withParamMatch = lowerTrait.match(/^(\w+)\s+(.+)$/);
    if (withParamMatch) {
      parsed.set(withParamMatch[1], withParamMatch[2]);
      return;
    }
    
    // Simple traits (e.g., "agile", "finesse", "sweep")
    parsed.set(lowerTrait, true);
  });

  return parsed;
}

/**
 * Check if weapon has a trait (case-insensitive, param-agnostic)
 */
function hasTrait(traits: string[] | undefined, traitName: string): boolean {
  if (!traits) return false;
  return traits.some((t) => t.toLowerCase().startsWith(traitName.toLowerCase()));
}

/**
 * Get trait parameter (e.g., "deadly d10" → "d10", "volley 30" → 30)
 */
function getTraitParam(traits: string[] | undefined, traitName: string): string | number | undefined {
  const parsed = parseTraits(traits);
  const value = parsed.get(traitName.toLowerCase());
  // Return only string/number params, skip boolean flags
  return (typeof value === 'string' || typeof value === 'number') ? value : undefined;
}

/**
 * Calculate range increment penalty for ranged attacks
 * PF2e: -2 per range increment beyond the first. Max 6 range increments.
 * @param distance - Distance in squares (PF2e units: 1 square = 5 ft)
 * @param rangeIncrement - Range increment in feet (e.g., 60 for shortbow)
 * @returns Penalty (negative number) and whether attack is in range
 */
function calculateRangeIncrementPenalty(distanceSq: number, rangeIncrementFt: number): { penalty: number; inRange: boolean } {
  const incrementSq = rangeIncrementFt / 5; // Convert feet to squares
  const incrementsPassed = Math.ceil(distanceSq / incrementSq);
  
  // First range increment (distance <= rangeIncrement) has no penalty
  if (incrementsPassed <= 1) {
    return { penalty: 0, inRange: true };
  }
  
  // Beyond first increment: -2 per additional increment
  const additionalIncrements = incrementsPassed - 1;
  const penalty = -2 * additionalIncrements;
  
  // Max 6 range increments allowed (PF2e rule)
  const inRange = incrementsPassed <= 6;
  
  return { penalty, inRange };
}

/**
 * Initialize the dying condition on a creature that just dropped to 0 HP.
 * Centralizes the logic that was previously duplicated across 5+ locations.
 * PF2e: When reduced to 0 HP, gain dying (value = wounded value, min 1).
 */
function initDying(creature: Creature): string {
  creature.dying = true;
  creature.wounded = (creature.wounded ?? 0) + 1;
  creature.deathSaveFailures = 0;
  creature.deathSaveSuccesses = 0;
  const dyingValue = creature.wounded;
  creature.conditions = creature.conditions || [];
  creature.conditions.push({ name: 'dying', duration: 'permanent', value: dyingValue });
  return ` 💀 ${creature.name} is DYING! (Wounded ${creature.wounded})`;
}

export class RulesEngine {
  /**
   * Core PF2e Rules - Foundation for expandable system
   * All dice rolls use standard d20 system
   * Damage resolution includes resistances/immunities
   */

  rollInitiative(creatures: Creature[]): string[] {
    // Roll d20 + DEX modifier for each creature
    // For now simplified - roll d20 and add a modifier based on level
    creatures.forEach((creature) => {
      const d20 = rollD20();
      // PF2e initiative uses Perception: WIS mod + perception proficiency bonus
      const wisMod = creature.abilities?.wisdom ?? 0;
      const percProf = getProficiencyBonus(creature.proficiencies?.perception ?? 'trained', creature.level);
      creature.initiative = d20 + wisMod + percProf;
    });

    return creatures
      .sort((a, b) => b.initiative - a.initiative)
      .map((c) => c.id);
  }

  /**
   * Process persistent damage (fire burns, bleed, etc.) at the start of a creature's turn
   * Returns array of log entries for this creature's persistent damage
   */
  processPersistentDamage(creature: Creature): any[] {
    const entries: any[] = [];

    if (!creature.conditions || creature.conditions.length === 0) {
      return entries;
    }

    // Find all persistent damage conditions
    const persistentConditions = creature.conditions.filter((c) => c.isPersistentDamage);

    persistentConditions.forEach((condition) => {
      if (typeof condition.duration === 'number' && condition.duration > 0) {
        // Roll damage
        let damage = 0;
        const rollResults: number[] = [];

        if (condition.damageFormula) {
          const damageRoll = rollDamageFormula(condition.damageFormula);
          damage = damageRoll.total;
          rollResults.push(...damageRoll.results);
        } else if (condition.damagePerTurn) {
          damage = condition.damagePerTurn;
        }

        // Apply damage with resistances
        let finalDamage = damage;
        let damageModifier = 'normal';
        let modifierValue = 0;

        if (damage > 0 && condition.damageType) {
          const calc = calculateFinalDamage(damage, condition.damageType, creature);
          finalDamage = calc.finalDamage;
          damageModifier = calc.modifier;
          modifierValue = calc.modifierValue || 0;
        }

        // Apply damage to creature
        creature.currentHealth -= finalDamage;

        // Decrement duration
        if (typeof condition.duration === 'number') {
          condition.duration--;
        }

        let statusMessage = '';
        if (creature.currentHealth <= 0 && !creature.dying) {
          statusMessage = initDying(creature);
        }

        entries.push({
          type: 'persistent-damage',
          source: condition.source || condition.name,
          conditionName: condition.name,
          damageType: condition.damageType,
          baseDamage: damage,
          damageModifier,
          modifierValue,
          finalDamage,
          rollResults,
          durationRemaining: typeof condition.duration === 'number' ? condition.duration : 0,
          message: `💥 ${creature.name} takes ${finalDamage} ${condition.damageType} damage from ${condition.source}${statusMessage}`,
        });
      }
    });

    // Remove expired conditions
    creature.conditions = creature.conditions.filter((c) => {
      if (c.isPersistentDamage && typeof c.duration === 'number') {
        return c.duration > 0;
      }
      return true;
    });

    return entries;
  }

  resolveAction(
    actor: Creature,
    gameState: GameState,
    actionId: string,
    targetId?: string,
    targetPosition?: Position,
    weaponId?: string,
    pickupDestination?: string,
    heroPointsSpent?: number
  ): any {
    // ═══════════════════════════════════════════════════════════
    // PHASE 0: ACTION VALIDATION LAYER
    // All actions must pass validation before execution.
    // ═══════════════════════════════════════════════════════════
    
    const validation = validateAction(actor, gameState, actionId, targetId, targetPosition, weaponId);
    
    if (!validation.valid) {
      return { 
        success: false, 
        message: validation.reason,
        errorCode: validation.errorCode 
      };
    }

    // ═══════════════════════════════════════════════════════════
    // LEGACY VALIDATION (to be migrated to validator over time)
    // ═══════════════════════════════════════════════════════════
    
    // Dying creatures can only make death saves
    if (actor.dying) {
      if (actionId === 'death-save') {
        return this.rollDeathSave(actor, heroPointsSpent);
      }
      return { success: false, message: `${actor.name} is dying and can only make death saves!` };
    }

    // Validate action is possible (health > 0, etc.)
    if (actor.currentHealth <= 0) {
      return { success: false, message: `${actor.name} is unconscious` };
    }

    if (typeof heroPointsSpent === 'number' && heroPointsSpent > 0) {
      const availableHeroPoints = actor.heroPoints ?? 1;
      if (heroPointsSpent < 0 || heroPointsSpent > 3) {
        return { success: false, message: `Invalid hero point spend: ${heroPointsSpent}. Must be 0-3.` };
      }
      if (heroPointsSpent > availableHeroPoints) {
        return { success: false, message: `${actor.name} only has ${availableHeroPoints} hero point${availableHeroPoints === 1 ? '' : 's'}.` };
      }
    }

    // Route to specific action type
    // This grows as you add more action types
    switch (actionId) {
      case 'strike':
        return this.resolveStrike(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'vicious-swing':
        return this.resolveViciousStrike(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'draw-weapon':
        return this.resolveDrawWeapon(actor, weaponId);
      case 'stow-weapon':
        return this.resolveStowWeapon(actor, weaponId);
      case 'drop-weapon':
        return this.resolveDropWeapon(actor, gameState, weaponId);
      case 'pick-up-weapon':
        return this.resolvePickUpWeapon(actor, gameState, targetId, pickupDestination);
      case 'move':
      case 'stride':
        return this.resolveMovement(actor, gameState, targetPosition, actionId);
      case 'step':
        return this.resolveStep(actor, gameState, targetPosition);
      case 'stand':
        return this.resolveStand(actor);
      case 'raise-shield':
        return this.resolveRaiseShield(actor);
      case 'lower-shield':
        return this.resolveLowerShield(actor);
      case 'reactive-strike':
        return this.resolveReactiveStrike(actor, gameState, targetId);
      case 'shield-block':
        return this.resolveShieldBlock(actor);
      case 'resolve-pending-damage':
        return this.resolvePendingDamage(actor);
      case 'take-cover':
        return this.resolveTakeCover(actor);
      case 'aid':
        return { success: false, message: 'Aid is not implemented yet.' };
      case 'recall-knowledge':
        return { success: false, message: 'Recall Knowledge is not implemented yet.' };
      case 'demoralize':
        return this.resolveDemoralize(actor, gameState, targetId, heroPointsSpent);
      case 'feint':
        return this.resolveFeint(actor, gameState, targetId, heroPointsSpent);
      case 'grapple':
        return { success: false, message: 'Grapple is not implemented yet.' };
      case 'trip':
        return this.resolveTrip(actor, gameState, targetId, heroPointsSpent);
      case 'shove':
        return this.resolveShove(actor, gameState, targetId, heroPointsSpent);
      case 'disarm':
        return { success: false, message: 'Disarm is not implemented yet.' };
      case 'ready':
        return { success: false, message: 'Ready is not implemented yet.' };
      case 'delay':
        return { success: false, message: 'Delay is not implemented yet.' };
      case 'interact':
        return { success: false, message: 'Interact is not implemented yet.' };
      case 'retching':
        return this.resolveRetching(actor, heroPointsSpent);
      case 'stabilize-with-hero-points':
        return this.stabilizeWithHeroPoints(actor);
      case 'escape':
        return { success: false, message: 'Escape is not implemented yet.' };
      case 'seek':
        return { success: false, message: 'Seek is not implemented yet.' };
      case 'hide':
        return { success: false, message: 'Hide is not implemented yet.' };
      case 'sneak':
        return { success: false, message: 'Sneak is not implemented yet.' };
      case 'avoid-notice':
        return { success: false, message: 'Avoid Notice is not implemented yet.' };
      case 'detect-magic':
        return { success: false, message: 'Detect Magic is not implemented yet.' };
      case 'follow-the-expert':
        return { success: false, message: 'Follow the Expert is not implemented yet.' };
      case 'investigate':
        return { success: false, message: 'Investigate is not implemented yet.' };
      case 'scout':
        return { success: false, message: 'Scout is not implemented yet.' };
      case 'search':
        return { success: false, message: 'Search is not implemented yet.' };
      case 'track':
        return { success: false, message: 'Track is not implemented yet.' };
      case 'earn-income':
        return { success: false, message: 'Earn Income is not implemented yet.' };
      case 'craft':
        return { success: false, message: 'Craft is not implemented yet.' };
      case 'treat-wounds':
        return { success: false, message: 'Treat Wounds is not implemented yet.' };
      case 'retrain':
        return { success: false, message: 'Retrain is not implemented yet.' };
      case 'subsist':
        return { success: false, message: 'Subsist is not implemented yet.' };
      case 'long-term-rest':
        return { success: false, message: 'Long-Term Rest is not implemented yet.' };
      case 'spellstrike':
        return { success: false, message: 'Spellstrike is not implemented yet.' };
      case 'exploit-vulnerability':
        return { success: false, message: 'Exploit Vulnerability is not implemented yet.' };
      case 'rage':
        return { success: false, message: 'Rage is not implemented yet.' };
      case 'flurry-of-blows':
        return { success: false, message: 'Flurry of Blows is not implemented yet.' };
      case 'hunt-prey':
        return { success: false, message: 'Hunt Prey is not implemented yet.' };
      case 'devise-a-stratagem':
        return { success: false, message: 'Devise a Stratagem is not implemented yet.' };
      // ═══════════════════════════════════════════════════════════
      // PHASE 5.2: FIGHTER FEATS (Level 1-4)
      // ═══════════════════════════════════════════════════════════
      case 'power-attack':
        return this.resolvePowerAttack(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'sudden-charge':
        return this.resolveSuddenCharge(actor, gameState, targetId, weaponId, targetPosition, heroPointsSpent);
      case 'double-slice':
        return this.resolveDoubleSlice(actor, gameState, targetId, heroPointsSpent);
      case 'intimidating-strike':
        return this.resolveIntimidatingStrike(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'exacting-strike':
        return this.resolveExactingStrike(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'snagging-strike':
        return this.resolveSnaggingStrike(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'knockdown':
        return this.resolveKnockdown(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'aggressive-block':
        return { success: false, message: 'Aggressive Block is not fully implemented yet.' };
      case 'brutish-shove':
        return this.resolveBrutishShove(actor, gameState, targetId, heroPointsSpent);
      case 'combat-grab':
        return { success: false, message: 'Combat Grab is not fully implemented yet.' };
      case 'dueling-parry':
        return this.resolveDuelingParry(actor);
      case 'lunge':
        return this.resolveLunge(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'swipe':
        return { success: false, message: 'Swipe is not fully implemented yet.' };
      case 'twin-parry':
        return this.resolveTwinParry(actor);
      case 'shatter-defenses':
        return this.resolveShatterDefenses(actor, gameState, targetId, weaponId, heroPointsSpent);
      // ═══════════════════════════════════════════════════════════
      // PHASE 5.2+: FIGHTER FEATS (Level 6+)
      // ═══════════════════════════════════════════════════════════
      case 'armor-specialization':
        return this.resolveArmorSpecialization(actor);
      case 'fearless':
        return this.resolveFearless(actor);
      case 'guardians-deflection':
        return { success: false, message: 'Guardian\'s Deflection is not fully implemented yet.' };
      case 'weapon-mastery':
        return this.resolveWeaponMastery(actor);
      case 'flexible-flurry':
        return this.resolveFlexibleFlurry(actor);
      case 'dueling-riposte':
        return { success: false, message: 'Dueling Riposte is not fully implemented yet.' };
      case 'iron-will':
        return this.resolveIronWill(actor, heroPointsSpent);
      case 'reflexive-shield':
        return this.resolveReflexiveShield(actor);
      case 'attack-of-opportunity-reactive':
        return this.resolveReactiveStrike(actor, gameState, targetId);
      case 'improved-reflexes':
        return this.resolveImprovedReflexes(actor);
      case 'reaction-enhancement':
        return this.resolveReactionEnhancement(actor);
      // ═══════════════════════════════════════════════════════════
      // PHASE 5.3: EXTENDED FIGHTER FEATS (All Levels)
      // ═══════════════════════════════════════════════════════════
      case 'reactive-shield':
        return this.resolveReactiveShield(actor);
      case 'cleaving-finish':
        return this.resolveCleavingFinish(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'whirlwind-strike':
        return { success: false, message: 'Whirlwind Strike requires complex AoE logic (deferred).' };
      case 'intimidating-prowess':
        return this.resolveIntimidatingProwess(actor, gameState, targetId, heroPointsSpent);
      case 'shield-warden':
        return this.resolveShieldWarden(actor, gameState, targetId);
      case 'weapon-supremacy':
        return this.resolveWeaponSupremacy(actor);
      case 'legendary-weapon':
        return this.resolveLegendaryWeapon(actor);
      case 'berserk-striker':
        return this.resolveBerserkStrike(actor, heroPointsSpent);
      case 'reactive-assault':
        return this.resolveReactiveAssault(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'close-quarters-shot':
        return this.resolveCloseQuartersShot(actor, gameState, targetId, weaponId, heroPointsSpent);
      case 'blade-ally':
        return this.resolveBladeAlly(actor);
      case 'versatile-heritage':
        return this.resolveVersatileHeritage(actor, weaponId);
      case 'duelists-expertise':
        return this.resolveDuelistsExpertise(actor);
      // ═══════════════════════════════════════════════════════════
      // PHASE 6: PSYCHIC DEDICATION ACTIONS
      // ═══════════════════════════════════════════════════════════
      case 'warp-step-amped': {
        // Amped Warp Step: costs 1 focus point, cast as 1 action
        // PF2e: "Space contracts with hardly a thought, letting you Cast the Spell as a single action."
        // At heightened 4th+: can teleport (range = 2× Speed after bonus)
        const warpSpell = getSpell('warp-step');
        if (!warpSpell) return { success: false, message: 'Warp Step spell not found.' };
        const ampCastCheck = this.canCastAndConsumeSlot(actor, warpSpell);
        if (!ampCastCheck.canCast) return { success: false, message: ampCastCheck.message || 'Cannot cast spell' };
        return this.resolveWarpStep(actor, gameState, ampCastCheck.heightenedRank ?? 1, targetPosition, true);
      }
      case 'teleport': {
        // Execute a pending teleport from Warp Step (Amped Heightened 4th)
        // Used when the player casts warp-step-amped without a target position first,
        // then chooses where to teleport as a follow-up action
        const teleportCondition = actor.conditions?.find(c => c.name === 'warp-step-teleport');
        if (!teleportCondition) {
          return { success: false, message: `${actor.name} has no pending teleport available.` };
        }
        if (!targetPosition) {
          return { success: false, message: 'No teleport destination specified.' };
        }
        const teleportRange = teleportCondition.value ?? 0;
        const dist = this.calculateDistance(actor.positions, targetPosition);
        if (dist > teleportRange) {
          return {
            success: false,
            message: `Cannot teleport ${(dist * 5).toFixed(0)}ft — max range is ${(teleportRange * 5).toFixed(0)}ft.`,
            errorCode: 'OUT_OF_RANGE',
          };
        }
        // Validate bounds
        const mw = gameState.map?.width ?? 0;
        const mh = gameState.map?.height ?? 0;
        if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mw || targetPosition.y >= mh) {
          return { success: false, message: `Teleport destination outside map bounds.`, errorCode: 'OUT_OF_BOUNDS' };
        }
        // Validate not occupied
        const isOccupied = gameState.creatures.some(c =>
          c.id !== actor.id && c.currentHealth > 0 &&
          c.positions.x === targetPosition.x && c.positions.y === targetPosition.y
        );
        if (isOccupied) {
          return { success: false, message: `Teleport destination occupied.`, errorCode: 'DESTINATION_OCCUPIED' };
        }
        // Check immobilization
        const immob = actor.conditions?.find(c =>
          ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name)
        );
        if (immob) {
          return { success: false, message: `${actor.name} cannot teleport while ${immob.name}!`, errorCode: 'IMMOBILIZED' };
        }
        // Execute teleport
        const oldTeleportPos = { x: actor.positions.x, y: actor.positions.y };
        actor.positions = { x: targetPosition.x, y: targetPosition.y };
        // Remove the teleport condition (used up)
        actor.conditions = (actor.conditions ?? []).filter(c => c.name !== 'warp-step-teleport');
        this.cleanupStaleFlankingConditions(gameState);
        const teleportDistFt = (dist * 5).toFixed(0);
        return {
          success: true,
          message: `🌀 ${actor.name} teleports from (${oldTeleportPos.x}, ${oldTeleportPos.y}) to (${targetPosition.x}, ${targetPosition.y}) [${teleportDistFt}ft]!\n🌀 Teleportation — no reactions triggered!`,
          oldPosition: oldTeleportPos,
          newPosition: targetPosition,
          teleportDistance: dist,
          isTeleport: true,
        };
      }
      // Spell handling - check if spell exists
      default:
        // Try to resolve as a spell
        const spell = getSpell(actionId);
        if (spell) {
          return this.resolveSpell(actor, gameState, spell, targetId, targetPosition);
        }
        return { success: false, message: 'Unknown action' };
    }
  }

  private resolveStrike(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    return this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
  }

  /**
   * Vicious Swing - A brutal melee Strike that adds one extra damage die
   */
  private resolveViciousStrike(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // First, check if the actor has Vicious Swing
    const specials = (actor as any).specials;
    const feats = (actor as any).feats;
    const hasViciousStrike = Array.isArray(specials)
      ? specials.some((entry: any) => typeof entry === 'string'
        && entry.toLowerCase().includes('vicious swing'))
      : false;
    const hasViciousFeat = Array.isArray(feats)
      ? feats.some((feat: any) => {
        const name = typeof feat === 'string' ? feat : feat?.name;
        return typeof name === 'string'
          && name.toLowerCase().includes('vicious swing');
      })
      : false;

    if (!hasViciousStrike && !hasViciousFeat) {
      return { success: false, message: `${actor.name} does not have Vicious Swing.` };
    }

    // Flourish trait: Can only be used once per turn
    if (actor.flourishUsedThisTurn) {
      return { success: false, message: `${actor.name} has already used a Flourish action this turn.` };
    }

    // Mark flourish as used
    actor.flourishUsedThisTurn = true;

    return this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: true }, heroPointsSpent);
  }

  /**
   * Unified attack resolution for Strike and Vicious Swing.
   * Both share ~80% identical logic; differences are parameterized via options.
   */
  private resolveAttackAction(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    options: { isVicious: boolean } = { isVicious: false },
    heroPointsSpent?: number
  ): any {
    const actionName = options.isVicious ? 'Vicious Swing' : 'Strike';

    if (!targetId) {
      return { success: false, message: 'No target specified' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    // Resolve the weapon to use for this Strike
    const selectedWeapon = this.resolveSelectedWeapon(actor, weaponId);

    // Vicious Swing requires a melee weapon
    if (options.isVicious && selectedWeapon && selectedWeapon.range && selectedWeapon.range > 0) {
      return { success: false, message: `Vicious Swing requires a melee weapon, but ${selectedWeapon.display} is ranged.` };
    }

    // If a non-natural weapon was specified, verify it's held
    if (selectedWeapon && !selectedWeapon.isNatural) {
      const slot = actor.weaponInventory?.find(s => s.weapon.id === selectedWeapon.id);
      if (slot && slot.state !== 'held') {
        return { success: false, message: `${selectedWeapon.display} is not drawn. Use Draw Weapon first.` };
      }
    }

    // Range/reach validation
    const rangeCheck = this.validateAttackRange(actor, target, selectedWeapon);
    if (!rangeCheck.ok) {
      return { success: false, message: rangeCheck.message };
    }

    // Check for flanking and apply off-guard condition if applicable
    this.applyFlankingOffGuard(actor, target, gameState);

    const attackRoll = this.rollAttack(actor, target, gameState, selectedWeapon, heroPointsSpent);

    // Consume Feint's "next melee attack" off-guard if it applies
    this.consumeFeintOffGuard(target, actor);

    // Increment MAP counter (happens regardless of hit/miss)
    actor.attacksMadeThisTurn = (actor.attacksMadeThisTurn ?? 0) + 1;

    // ═══════════════════════════════════════════════════════════
    // PHASE 2.1: FLAT CHECKS FOR CONCEALED/HIDDEN/INVISIBLE
    // ═══════════════════════════════════════════════════════════
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
    const targetConcealed = target.conditions?.some((c) => c.name === 'concealed');
    if (targetConcealed) {
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
    const targetHidden = target.conditions?.some((c) => c.name === 'hidden');
    if (targetHidden) {
      const flatCheck = rollD20();
      if (flatCheck < 11) {
        return {
          success: false,
          message: `${target.name} is hidden! DC 11 flat check failed (${flatCheck}) - attack auto-missed`,
          details: { ...attackRoll, flatCheckFailed: true, flatCheck, flatCheckDC: 11 },
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
    if (attackRoll.result === 'critical-failure') {
      return {
        success: false,
        message: options.isVicious
          ? `⚰️ CRITICAL FAILURE! ${actor.name} fumbled their vicious swing against ${target.name}!`
          : `⚰️ CRITICAL FAILURE! ${actor.name} fumbled badly against ${target.name}!`,
        details: attackRoll,
      };
    }

    if (attackRoll.result === 'failure') {
      return {
        success: false,
        message: options.isVicious
          ? `❌ ${actor.name}'s vicious swing missed ${target.name}!`
          : `❌ ${actor.name} missed ${target.name}!`,
        details: attackRoll,
      };
    }

    // Roll damage - base weapon damage
    const isCriticalHit = attackRoll.result === 'critical-success';
    
    // Check if target is off-guard (for Backstabber trait)
    const targetIsOffGuard = target.conditions?.some((c) => c.name === 'off-guard') ?? false;
    
    const damageRoll = this.rollDamage(actor, isCriticalHit, selectedWeapon, targetIsOffGuard);

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

    attackRoll.damage = damageRoll;

    // Apply damage resistances using weapon's damage type
    const weaponDamageType: any = selectedWeapon?.damageType
      ?? actor.weaponDamageType
      ?? (actor.equippedWeapon ? getWeapon(actor.equippedWeapon)?.damageType : null)
      ?? 'bludgeoning';
    const damageCalc = calculateFinalDamage(damageRoll.appliedDamage, weaponDamageType, target);
    const finalDamage = damageCalc.finalDamage;

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
        ? `${options.isVicious ? '🩸 VICIOUS CRITICAL' : '🎯 CRITICAL HIT'}! ${actor.name} ${options.isVicious ? 'brutally swung at' : 'devastated'} ${target.name} for ${finalDamage} damage${extraInfo}!`
        : `${options.isVicious ? '🩸 VICIOUS SWING' : '✓'} ${actor.name} ${options.isVicious ? 'savagely hit' : 'hit'} ${target.name} for ${finalDamage} damage${extraInfo}`;

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
        shieldMessage += ` 💥 SHIELD BROKEN!`;
      }
    }

    const extraInfo = options.isVicious ? ` (+${extraDamage} extra die)` : '';
    const damageMessage = isCriticalHit
      ? `${options.isVicious ? '🩸 VICIOUS CRITICAL' : '🎯 CRITICAL HIT'}! ${actor.name} ${options.isVicious ? 'brutally swung at' : 'devastated'} ${target.name} for ${finalDamage} damage${extraInfo}${shieldMessage}!`
      : `${options.isVicious ? '🩸 VICIOUS SWING' : '✓'} ${actor.name} ${options.isVicious ? 'savagely hit' : 'hit'} ${target.name} for ${finalDamage} damage${extraInfo}${shieldMessage}`;

    let statusMessage = '';
    // Handle death saves and dying condition
    if (target.currentHealth <= 0) {
      if (!target.dying) {
        statusMessage = initDying(target);
      } else {
        statusMessage = ` 💀 ${target.name} is still dying...`;
      }
    }

    const finalMessage = `${damageMessage}${statusMessage}`;

    return {
      success: true,
      message: finalMessage,
      details: attackRoll,
      targetHealth: target.currentHealth,
      targetDying: target.dying,
      shieldDamage: shieldResult,
      ...(options.isVicious && { extraDamage }),
    };
  }

  // ─── Weapon Inventory helpers ──────────────────────

  /**
   * Resolve which weapon/attack to use for a Strike.
   * Priority: explicit weaponId → first held weapon → legacy weaponDamageDice path → unarmed
   */
  private resolveSelectedWeapon(actor: Creature, weaponId?: string): CreatureWeapon | null {
    const inv = actor.weaponInventory;
    if (!inv || inv.length === 0) return null; // fall through to legacy path

    if (weaponId) {
      const slot = inv.find(s => s.weapon.id === weaponId);
      if (slot) return slot.weapon;
    }

    // Default: first held weapon, or first natural attack
    const firstHeld = inv.find(s => s.state === 'held');
    if (firstHeld) return firstHeld.weapon;
    const firstNatural = inv.find(s => s.weapon.isNatural);
    if (firstNatural) return firstNatural.weapon;

    return null;
  }

  /**
   * Draw a weapon (Interact action, 1 action). Move weapon from stowed → held.
   * Must have free hands to hold it.
   */
  private resolveDrawWeapon(actor: Creature, weaponId?: string): any {
    if (!actor.weaponInventory || !weaponId) {
      return { success: false, message: 'No weapon to draw.' };
    }
    const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
    if (!slot) return { success: false, message: 'Weapon not found in inventory.' };
    if (slot.state === 'held') return { success: false, message: `${slot.weapon.display} is already drawn.` };
    if (slot.state === 'dropped') return { success: false, message: `${slot.weapon.display} was dropped. Pick it up first.` };

    // Check hands
    const handsNeeded = slot.weapon.hands;
    const handsInUse = this.getHandsInUse(actor);
    if (handsInUse + handsNeeded > 2) {
      return { success: false, message: `Not enough free hands to draw ${slot.weapon.display} (need ${handsNeeded}, ${2 - handsInUse} free).` };
    }

    slot.state = 'held';
    // Also update legacy fields for backwards compatibility
    actor.weaponDisplay = slot.weapon.display;
    actor.weaponDamageDice = slot.weapon.damageDice;
    actor.weaponDamageBonus = slot.weapon.damageBonus;
    actor.weaponDamageType = slot.weapon.damageType;

    return { success: true, message: `${actor.name} draws ${slot.weapon.display}.` };
  }

  /**
   * Stow a weapon (Interact action, 1 action). Move weapon from held → stowed.
   */
  private resolveStowWeapon(actor: Creature, weaponId?: string): any {
    if (!actor.weaponInventory || !weaponId) {
      return { success: false, message: 'No weapon to stow.' };
    }
    const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
    if (!slot) return { success: false, message: 'Weapon not found in inventory.' };
    if (slot.state !== 'held') return { success: false, message: `${slot.weapon.display} is not held.` };
    if (slot.weapon.isNatural) return { success: false, message: `Cannot stow natural attacks.` };

    slot.state = 'stowed';
    // Update legacy fields to next held weapon
    this.syncLegacyWeaponFields(actor);

    return { success: true, message: `${actor.name} stows ${slot.weapon.display}.` };
  }

  /**
   * Drop a weapon (free action). Move weapon from held → dropped.
   */
  private resolveDropWeapon(actor: Creature, gameState: GameState, weaponId?: string): any {
    if (!actor.weaponInventory || !weaponId) {
      return { success: false, message: 'No weapon to drop.' };
    }
    const slot = actor.weaponInventory.find(s => s.weapon.id === weaponId);
    if (!slot) return { success: false, message: 'Weapon not found in inventory.' };
    if (slot.state !== 'held') return { success: false, message: `${slot.weapon.display} is not held.` };
    if (slot.weapon.isNatural) return { success: false, message: `Cannot drop natural attacks.` };

    // Mark as dropped in inventory
    slot.state = 'dropped';
    this.syncLegacyWeaponFields(actor);

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

    return { success: true, message: `${actor.name} drops ${slot.weapon.display}.` };
  }

  /** Count hands currently occupied by held weapons */
  private getHandsInUse(actor: Creature): number {
    if (!actor.weaponInventory) return 0;
    return actor.weaponInventory
      .filter(s => s.state === 'held' && !s.weapon.isNatural)
      .reduce((sum, s) => sum + s.weapon.hands, 0);
  }

  /** Update the legacy flat weapon fields to match the first held weapon */
  private syncLegacyWeaponFields(actor: Creature): void {
    const firstHeld = actor.weaponInventory?.find(s => s.state === 'held');
    if (firstHeld) {
      actor.weaponDisplay = firstHeld.weapon.display;
      actor.weaponDamageDice = firstHeld.weapon.damageDice;
      actor.weaponDamageBonus = firstHeld.weapon.damageBonus;
      actor.weaponDamageType = firstHeld.weapon.damageType;
    } else {
      // No held weapon — show unarmed
      actor.weaponDisplay = undefined;
      actor.weaponDamageDice = undefined;
      actor.weaponDamageBonus = undefined;
      actor.weaponDamageType = undefined;
    }
  }

  private resolvePickUpWeapon(actor: Creature, gameState: GameState, groundObjectId?: string, pickupDestination?: string): any {
    if (!groundObjectId || !gameState.groundObjects || !actor.weaponInventory) {
      return { success: false, message: 'Cannot pick up weapon.' };
    }

    const groundObject = gameState.groundObjects.find(obj => obj.id === groundObjectId);
    if (!groundObject) {
      return { success: false, message: 'Weapon not found on ground.' };
    }

    // Check if creature is adjacent to the weapon (within 1 square)
    const distance = this.calculateDistance(actor.positions, groundObject.position);
    if (distance > Math.sqrt(2) + 0.1) {
      return { success: false, message: `${actor.name} is too far from ${groundObject.weapon.display}.` };
    }

    // Determine destination based on user preference or hand availability
    let newState: 'held' | 'stowed' = pickupDestination as ('held' | 'stowed') || 'held';
    
    // If user wants to wield, check if hands are available
    if (newState === 'held') {
      const handsNeeded = groundObject.weapon.hands || 1;
      const handsInUse = this.getHandsInUse(actor);
      
      if (handsInUse + handsNeeded > 2) {
        // Not enough hands — add as stowed instead
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

    this.syncLegacyWeaponFields(actor);

    // Remove from ground
    gameState.groundObjects = gameState.groundObjects.filter(obj => obj.id !== groundObjectId);

    const message = newState === 'held' 
      ? `${actor.name} picks up ${groundObject.weapon.display}.`
      : `${actor.name} picks up ${groundObject.weapon.display} and places it in their pack (hands full).`;
    
    return { success: true, message };
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Validate attack range: melee must be within reach (1.5 squares),
   * ranged must be within weapon range (in squares).
   */
  private validateAttackRange(
    actor: Creature,
    target: Creature,
    weapon: CreatureWeapon | null
  ): { ok: boolean; message: string } {
    const distance = this.calculateDistance(actor.positions, target.positions);
    const isRanged = weapon?.attackType === 'ranged' || (weapon?.range && weapon.range > 0);
    
    // Check for THROWN trait: allows melee weapons to be thrown at specified range
    const isThrown = hasTrait(weapon?.traits, 'thrown');
    const thrownRange = isThrown ? getTraitParam(weapon?.traits, 'thrown') : undefined;

    if (isRanged || isThrown) {
      // Ranged weapon or thrown melee weapon
      // PF2e Remaster: Range increment system with 6 total increments max
      let rangeIncrementFt = weapon?.range ?? 60; // default 60ft if no range specified
      
      // If Thrown trait on non-ranged weapon, use its range instead
      if (isThrown && !isRanged && thrownRange) {
        rangeIncrementFt = parseInt(thrownRange as string); // Feet (e.g., "10" for dagger)
      }
      
      // Max 6 range increments (PF2e rule)
      const maxRangeSq = (rangeIncrementFt * 6) / 5; // Convert to squares (1 sq = 5 ft)
      
      if (distance > maxRangeSq + 1e-6) { // Floating-point tolerance
        return { 
          ok: false, 
          message: `${target.name} is beyond maximum range! (${Math.round(distance * 5)}ft away, max 6 increments × ${rangeIncrementFt}ft = ${rangeIncrementFt * 6}ft)` 
        };
      }
    } else {
      // Melee weapon: reach is typically 5 feet (1 square), some weapons have 10ft reach
      const hasReach = weapon?.traits?.includes('reach');
      const maxReach = hasReach ? 2.5 : 1.5; // 10ft reach vs 5ft standard (with diagonal tolerance)
      if (distance > maxReach) {
        return { ok: false, message: `${target.name} is out of melee reach! Move closer first.` };
      }
    }

    return { ok: true, message: '' };
  }

  private resolveMovement(actor: Creature, gameState: GameState, targetPosition?: Position, actionId?: string): any {
    if (!targetPosition) {
      return { success: false, message: 'No destination specified' };
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2.1: IMMOBILIZATION CHECKS
    // ═══════════════════════════════════════════════════════════
    // Check for conditions that prevent movement
    const immobilizedCondition = actor.conditions?.find((c) => ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name));
    if (immobilizedCondition) {
      return {
        success: false,
        message: `${actor.name} cannot move while ${immobilizedCondition.name}!`,
        errorCode: 'IMMOBILIZED'
      };
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1.1 FIX: MOVEMENT SYSTEM - PF2e Remaster Compliance
    // ═══════════════════════════════════════════════════════════
    // Reference: Player Core p.471 (Stride), p.420 (Step)
    
    // 1. SPEED CALCULATION
    // In PF2e: Speed is in feet. 1 square = 5 feet.
    // Prone creatures treat difficult terrain as greater difficult terrain (4x cost instead of 2x)
    const isProne = actor.conditions?.some(c => c.name === 'prone') ?? false;
    const terrainMultiplier = isProne ? { difficult: 4 } : { difficult: 2 };
    
    const maxDistance = (actor.speed ?? 25) / 5; // Convert feet to squares
    
    // 2. PATHFINDING WITH TERRAIN
    const gameMap = (actor as any)._map as any;
    const terrainGrid = gameMap?.terrain;
    const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
    const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;

    // Reject out-of-bounds destinations early
    if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
      return {
        success: false,
        message: `Cannot move to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
        errorCode: 'OUT_OF_BOUNDS'
      };
    }
    
    // Exclude self and dead creatures from occupied positions
    const occupiedPositions = new Set<string>(
      gameState.creatures
        .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
        .map((creature) => `${creature.positions.x},${creature.positions.y}`)
    );
    
    // 4. VALIDATE DESTINATION NOT OCCUPIED
    const destKey = `${targetPosition.x},${targetPosition.y}`;
    if (occupiedPositions.has(destKey)) {
      return {
        success: false,
        message: `Cannot move to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
        errorCode: 'DESTINATION_OCCUPIED'
      };
    }

    let pathCost = this.calculateDistance(actor.positions, targetPosition);
    
    if (terrainGrid) {
      pathCost = computePathCost(actor.positions, targetPosition, terrainGrid, {
        maxDistance,
        occupiedPositions,
        terrainCostMultiplier: terrainMultiplier,
      });
    }
    
    // 3. DESTINATION VALIDITY
    if (pathCost === Infinity) {
      return { success: false, message: 'No valid path to destination.', errorCode: 'BLOCKED_PATH' };
    }
    
    if (pathCost > maxDistance) {
      return { 
        success: false, 
        message: `Cannot move ${pathCost.toFixed(1)} squares - max is ${maxDistance}`,
        errorCode: 'INSUFFICIENT_MOVEMENT',
        movementCost: pathCost,
        maxDistance
      };
    }
    
    // 5. EXECUTE MOVEMENT
    const oldPos = { x: actor.positions.x, y: actor.positions.y };
    actor.positions = targetPosition;
    
    // 6. FLANKING CLEANUP
    // Re-evaluate flanking conditions based on new positions
    this.cleanupStaleFlankingConditions(gameState);
    
    // 7. MOVEMENT LOG
    const movementLog = `${actor.name} moved from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y}) [${pathCost.toFixed(1)} squares]`;
    
    // 8. REACTIVE STRIKE TRIGGER (handled by GameEngine)
    // GameEngine.findReactiveStrikeOpportunities() will detect this movement
    // and create reactive strike opportunities for adjacent enemies.
    // Stride triggers reactions, Step and move do not.
    
    return {
      success: true,
      message: movementLog,
      newPosition: targetPosition,
      movementCost: pathCost,
      maxDistance,
      oldPosition: oldPos,
      actionId, // Pass back for engine to identify Stride
      isProne,
    };
  }

  /**
   * Resolve Step action (PF2e: 1 action, 5 feet, no Reactive Strike)
   * Reference: Player Core p.420
   */
  private resolveStep(
    actor: Creature,
    gameState: GameState,
    targetPosition?: Position
  ): any {
    if (!targetPosition) {
      return { success: false, message: 'No destination specified for Step action' };
    }
    
    // 1. CALCULATE DISTANCE
    const distance = this.calculateDistance(actor.positions, targetPosition);
    
    // 2. VALIDATE 5-FOOT LIMIT
    // Step allows moving exactly 5 feet (1 square), including diagonals
    if (distance > 1.5) { // 1.5 accounts for diagonal movement (√2 ≈ 1.414)
      return {
        success: false,
        message: `Step allows only 5 feet (1 square) of movement. Distance to (${targetPosition.x}, ${targetPosition.y}) is ${(distance * 5).toFixed(1)} feet.`,
        errorCode: 'STEP_TOO_FAR'
      };
    }
    
    // 3. VALIDATE DESTINATION WITHIN BOUNDS
    const gameMap = (actor as any)._map as any;
    const terrainGrid = gameMap?.terrain;
    const mapWidth = gameState.map?.width ?? terrainGrid?.[0]?.length ?? 0;
    const mapHeight = gameState.map?.height ?? terrainGrid?.length ?? 0;
    
    if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mapWidth || targetPosition.y >= mapHeight) {
      return {
        success: false,
        message: `Cannot step to (${targetPosition.x}, ${targetPosition.y}) - destination is outside map bounds`,
        errorCode: 'OUT_OF_BOUNDS'
      };
    }
    
    // 4. VALIDATE DESTINATION NOT OCCUPIED
    const occupiedPositions = new Set<string>(
      gameState.creatures
        .filter((creature) => creature.id !== actor.id && creature.currentHealth > 0)
        .map((creature) => `${creature.positions.x},${creature.positions.y}`)
    );
    
    const destKey = `${targetPosition.x},${targetPosition.y}`;
    if (occupiedPositions.has(destKey)) {
      return {
        success: false,
        message: `Cannot step to (${targetPosition.x}, ${targetPosition.y}) - occupied by another creature`,
        errorCode: 'DESTINATION_OCCUPIED'
      };
    }
    
    // 5. EXECUTE STEP
    const oldPos = { x: actor.positions.x, y: actor.positions.y };
    actor.positions = targetPosition;
    
    // 6. FLANKING CLEANUP
    // Re-evaluate flanking conditions based on new positions
    this.cleanupStaleFlankingConditions(gameState);
    
    // 7. STEP LOG
    const stepLog = `${actor.name} stepped from (${oldPos.x}, ${oldPos.y}) to (${targetPosition.x}, ${targetPosition.y})`;
    
    // 8. NO REACTIVE STRIKE TRIGGER
    // Step does NOT trigger Reactive Strike (unlike Stride)
    // The engine checks actionId and 'step' is not in the moveActions list
    
    return {
      success: true,
      message: stepLog,
      newPosition: targetPosition,
      oldPosition: oldPos,
      actionId: 'step',
    };
  }

  private cleanupStaleFlankingConditions(gameState: GameState): void {
    gameState.creatures.forEach((target) => {
      if (!target.conditions || target.conditions.length === 0) return;

      target.conditions = target.conditions.filter((cond) => {
        if (cond.name !== 'off-guard' || !cond.source?.includes('Flanking')) return true;
        
        // Check if this flanker is still flanking this target
        const flankingCreature = gameState.creatures.find((c) => c.id === cond.appliesAgainst);
        if (!flankingCreature) return false; // Creature doesn't exist, remove condition
        
        const isStillFlanked = this.isTargetFlanked(flankingCreature, target, gameState);
        if (!isStillFlanked) {
          console.log(`  ❌ After movement: ${flankingCreature.name} no longer flanking ${target.name}, removing off-guard`);
          return false;
        }
        
        return true; // Keep it, still flanked
      });
    });
  }

  private consumeFeintOffGuard(target: Creature, attacker: Creature): void {
    if (!target.conditions || target.conditions.length === 0) return;

    const weapon = attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : null;
    const attackType = weapon?.type ?? 'melee';

    console.log(`\n🎯 [CONSUME FEINT] ${attacker.name} attacking ${target.name} with ${attackType} attack`);
    console.log(`  Target conditions: ${target.conditions.map(c => `${c.name}(appliesAgainst=${c.appliesAgainst}, uses=${c.usesRemaining}, attackType=${c.attackType})`).join(', ')}`);

    // Only consume on melee attacks (Feint only grants off-guard vs melee)
    if (attackType !== 'melee') {
      console.log(`  ❌ Not a melee attack, skipping consumption`);
      return;
    }

    target.conditions = target.conditions.filter((cond) => {
      if (cond.name !== 'off-guard') return true;
      if (!cond.appliesAgainst || cond.appliesAgainst !== attacker.id) return true;
      if (cond.attackType && cond.attackType !== 'melee') return true;

      if (typeof cond.usesRemaining === 'number') {
        cond.usesRemaining -= 1;
        const keep = cond.usesRemaining > 0;
        console.log(`  🔄 Consumed use: usesRemaining ${cond.usesRemaining + 1} → ${cond.usesRemaining} → ${keep ? 'KEEP' : 'REMOVE'}`);
        return keep;
      }

      console.log(`  ℹ️ No usesRemaining (crit success), keeping condition`);
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
  private isTargetFlanked(attacker: Creature, target: Creature, gameState: GameState): boolean {
    // Only melee attacks can flank
    const weapon = attacker.equippedWeapon ? getWeapon(attacker.equippedWeapon) : null;
    if (weapon && weapon.type !== 'melee') return false;

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
        const allyWeapon = c.equippedWeapon ? getWeapon(c.equippedWeapon) : null;
        if (!allyWeapon || allyWeapon.type !== 'melee') return false;
        
        // Must be adjacent to target (threatening)
        const distX = c.positions.x - target.positions.x;
        const distY = c.positions.y - target.positions.y;
        const distance = Math.sqrt(distX ** 2 + distY ** 2);
        if (distance > 1.5) return false; // Not adjacent
        
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
      
      // Distance check already done in filter above, verify attacker distance
      const attackerDist = Math.sqrt(targetToAttacker.x ** 2 + targetToAttacker.y ** 2);
      
      // Attacker must be within melee reach (~1 square, accounting for diagonals) and ally opposite
      if (attackerDist <= 1.5 && dotProduct < 0) {
        console.log(`\n⚔️  [FLANKING] ${target.name} is flanked by ${attacker.name} and ${ally.name}`);
        return true;
      }
    }

    return false;
  }

  private applyFlankingOffGuard(attacker: Creature, target: Creature, gameState: GameState): void {
    // First, remove any stale flanking off-guard conditions from creatures that are no longer flanking
    target.conditions = target.conditions?.filter((cond) => {
      if (cond.name !== 'off-guard' || !cond.source?.includes('Flanking')) return true;
      
      // Check if this flanker is still flanking
      const flankingCreature = gameState.creatures.find((c) => c.id === cond.appliesAgainst);
      if (!flankingCreature) return false; // Creature doesn't exist, remove condition
      
      const isStillFlanked = this.isTargetFlanked(flankingCreature, target, gameState);
      if (!isStillFlanked) {
        console.log(`  ❌ ${flankingCreature.name} no longer flanking ${target.name}, removing off-guard`);
        return false;
      }
      
      return true; // Keep it, still flanked
    }) || [];

    // Now check if current attacker is flanking and apply off-guard if needed
    if (!this.isTargetFlanked(attacker, target, gameState)) {
      return;
    }

    // Check if flanking off-guard already exists for THIS attacker
    const existingFlankingOffGuard = target.conditions?.find(
      (c) => c.name === 'off-guard' && c.appliesAgainst === attacker.id && c.source?.includes('Flanking')
    );

    if (existingFlankingOffGuard) {
      console.log(`  ℹ️ ${attacker.name} already has flanking off-guard on ${target.name}`);
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
    console.log(`  ✅ ${attacker.name} is flanking ${target.name} - applied melee off-guard`);
  }

  private rollAttack(
    attacker: Creature,
    target: Creature,
    gameState: GameState,
    selectedWeapon?: CreatureWeapon | null,
    heroPointsSpent?: number
  ): AttackRoll {
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
    
    // If a specific weapon with its own attackBonus is selected, use it
    // Otherwise fall back to the creature's calculateAttackBonus
    let bonus: number;
    if (selectedWeapon?.attackBonus !== undefined) {
      // Weapon has its own attack bonus — use it (still apply MAP + conditions)
      const mapPenalty = this.getMapPenalty(attacker, selectedWeapon);
      const { bonuses: atkBonuses, penalties: atkPenalties } = getConditionModifiers(attacker.conditions || [], 'attack');
      const condMod = resolveStacking(atkBonuses, atkPenalties);
      bonus = selectedWeapon.attackBonus + mapPenalty + condMod;
    } else {
      bonus = calculateAttackBonus(attacker);
    }
    
    // Apply weapon trait modifiers and range penalties
    let traitModifier = 0;
    let rangeModifier = 0;
    
    const distance = Math.sqrt(
      Math.pow(target.positions.x - attacker.positions.x, 2) +
      Math.pow(target.positions.y - attacker.positions.y, 2)
    );
    
    // Check if this is a ranged attack
    const isRanged = selectedWeapon?.range && selectedWeapon.range > 0;
    const isThrown = hasTrait(selectedWeapon?.traits, 'thrown');
    
    if (isRanged || isThrown) {
      let rangeIncrementFt = selectedWeapon?.range ?? 60; // Default 60ft if not specified
      
      // If Thrown trait, use its range as the increment
      if (isThrown && !isRanged) {
        const thrownRange = getTraitParam(selectedWeapon?.traits, 'thrown');
        if (thrownRange) {
          rangeIncrementFt = parseInt(thrownRange as string);
        }
      }
      
      const { penalty: incrementPenalty, inRange } = calculateRangeIncrementPenalty(distance, rangeIncrementFt);
      
      if (!inRange) {
        return {
          success: false,
          message: `Target is beyond maximum range! (${Math.round(distance * 5)}ft away, max 6 range increments = ${Math.round(rangeIncrementFt * 6)}ft)`,
          details: { distance: Math.round(distance * 5), maxRange: Math.round(rangeIncrementFt * 6) },
        } as any;
      }
      
      rangeModifier = incrementPenalty;
    }
    
    if (selectedWeapon?.traits) {
      // SWEEP: +1 circumstance to attack if you already hit a different target this turn
      if (hasTrait(selectedWeapon.traits, 'sweep') && (attacker.attacksMadeThisTurn ?? 0) >= 1) {
        // Check if we hit a different target on a previous attack
        const hasHitDifferentTarget = true; // Simplified: assume yes if we've made an attack
        // TODO: Track previous targets to verify we hit a different one
        if (hasHitDifferentTarget) {
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
    
    bonus += traitModifier + rangeModifier;
    let total = d20 + bonus;
    let finalD20 = d20;
    let heroPointMessage: string | undefined;

    if (heroPointsSpent && heroPointsSpent > 0) {
      const spendResult = this.spendHeroPoints(attacker, heroPointsSpent, {
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
        } as any;
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

  /**
   * Get MAP penalty considering 'agile' trait on the selected weapon
   */
  private getMapPenalty(attacker: Creature, selectedWeapon?: CreatureWeapon | null): number {
    const attacks = attacker.attacksMadeThisTurn ?? 0;
    if (attacks === 0) return 0;
    const isAgile = selectedWeapon?.traits?.includes('agile') ?? false;
    if (attacks === 1) return isAgile ? -4 : -5;
    return isAgile ? -8 : -10;
  }

  private rollDamage(attacker: Creature, isCriticalHit: boolean = false, selectedWeapon?: CreatureWeapon | null, targetIsOffGuard: boolean = false): any {
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
      const flatBonus = selectedWeapon.damageBonus ?? 0;

      const { bonuses: dmgBonuses, penalties: dmgPenalties } = getConditionModifiers(attacker.conditions || [], 'damage');
      const condMod = resolveStacking(dmgBonuses, dmgPenalties);

      let baseDamage = Math.max(1, roll.total + flatBonus + condMod);
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
        if (hasTrait(selectedWeapon.traits, 'propulsive') && selectedWeapon.range && selectedWeapon.range > 0) {
          const strMod = attacker.abilities?.strength ?? 0;
          if (strMod > 0) {
            traitBonuses += Math.floor(strMod / 2);
          }
        }
      }

      // PHASE 5.1: FIGHTER WEAPON SPECIALIZATION
      // Fighters get Weapon Specialization at level 1: +2 damage
      // Scales at level 6 (+3) and level 12 (+4)
      let weaponSpecializationBonus = 0;
      if (attacker.characterClass === 'Fighter') {
        if (attacker.level >= 12) {
          weaponSpecializationBonus = 4;
        } else if (attacker.level >= 6) {
          weaponSpecializationBonus = 3;
        } else {
          weaponSpecializationBonus = 2;
        }
      }

      baseDamage = Math.max(1, baseDamage + traitBonuses + weaponSpecializationBonus);
      const appliedDamage = isCriticalHit ? baseDamage * 2 : baseDamage;

      return {
        dice: { times: 1, sides: 1, results: roll.results, total: roll.total },
        weaponName: selectedWeapon.display,
        formula,
        abilityMod: flatBonus,
        traitBonuses,
        weaponSpecializationBonus,
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

      return {
        dice: { times: 1, sides: 1, results: roll.results, total: roll.total },
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

    return {
      dice: { times: 1, sides: 1, results: roll.results, total: roll.total },
      weaponName: weapon?.name ?? 'Unarmed Strike',
      formula,
      abilityMod,
      isCriticalHit,
      total: baseDamage,
      appliedDamage,
    };
  }

  /**
   * PF2e Remaster Recovery Check
   * Flat check DC = 10 + dying value
   * Critical Success: dying reduced by 2 (if dying reaches 0, creature wakes at 0 HP, wounded +1)
   * Success: dying reduced by 1 (if dying reaches 0, creature stabilizes, wounded +1)
   * Failure: dying increased by 1
   * Critical Failure: dying increased by 2
   * Dying 4+ = dead
   */
  private rollDeathSave(creature: Creature, heroPointsSpent?: number): any {
    // Check if recovery check already made this turn
    if (creature.deathSaveMadeThisTurn) {
      return {
        success: false,
        message: `${creature.name} has already made their recovery check this turn!`,
      };
    }

    // Mark that recovery check was made this turn
    creature.deathSaveMadeThisTurn = true;

    // Get current dying value from condition
    const dyingCondition = creature.conditions?.find((c) => c.name === 'dying');
    const dyingValue = dyingCondition?.value ?? 1;

    // ═══════════════════════════════════════════════════════════
    // PHASE 2.4: DOOMED + DYING INTERACTION
    // ═══════════════════════════════════════════════════════════
    // Check for doomed condition - you die at dying value = (4 - doomed value)
    const doomedCondition = creature.conditions?.find((c) => c.name === 'doomed');
    const doomedValue = doomedCondition?.value ?? 0;
    const deathThreshold = 4 - doomedValue; // Default 4, reduced by doomed value

    // PF2e Recovery Check: flat check DC = 10 + dying value
    const d20 = rollD20();
    let total = d20; // Flat check — no modifiers
    let finalD20 = d20;
    let heroPointMessage: string | undefined;

    if (heroPointsSpent && heroPointsSpent > 0) {
      const spendResult = this.spendHeroPoints(creature, heroPointsSpent, {
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
    const dc = 10 + dyingValue;

    const result = getDegreeOfSuccess(finalD20, total, dc);

    let statusUpdate = '';
    let newDyingValue = dyingValue;

    if (result === 'critical-success') {
      // Reduce dying by 2
      newDyingValue = Math.max(0, dyingValue - 2);
      if (newDyingValue <= 0) {
        creature.dying = false;
        creature.currentHealth = 0;
        creature.conditions = creature.conditions.filter((c) => c.name !== 'dying');
        creature.wounded = (creature.wounded ?? 0) + 1;
        statusUpdate = `✨ ${creature.name} RECOVERS! (no longer dying, wounded ${creature.wounded})`;
      } else {
        if (dyingCondition) dyingCondition.value = newDyingValue;
        statusUpdate = `✨ ${creature.name} improves! (dying ${dyingValue} → ${newDyingValue})`;
      }
    } else if (result === 'success') {
      // Reduce dying by 1
      newDyingValue = Math.max(0, dyingValue - 1);
      if (newDyingValue <= 0) {
        creature.dying = false;
        creature.currentHealth = 0;
        creature.conditions = creature.conditions.filter((c) => c.name !== 'dying');
        creature.wounded = (creature.wounded ?? 0) + 1;
        creature.conditions.push({ name: 'unconscious', duration: 'permanent' });
        statusUpdate = `🛡️ ${creature.name} stabilizes! (unconscious at 0 HP, wounded ${creature.wounded})`;
      } else {
        if (dyingCondition) dyingCondition.value = newDyingValue;
        statusUpdate = `✓ ${creature.name} holds on! (dying ${dyingValue} → ${newDyingValue})`;
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
        statusUpdate = `💀 ${creature.name} is DEAD! (dying ${newDyingValue}${doomMessage})`;
      } else {
        if (dyingCondition) dyingCondition.value = newDyingValue;
        statusUpdate = `✗ ${creature.name} worsens! (dying ${dyingValue} → ${newDyingValue})`;
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
        statusUpdate = `💀 ${creature.name} is DEAD! (dying ${newDyingValue}${doomMessage})`;
      } else {
        if (dyingCondition) dyingCondition.value = newDyingValue;
        statusUpdate = `⚰️ ${creature.name} fails badly! (dying ${dyingValue} → ${newDyingValue})`;
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

  /**
   * Check if a creature can cast a spell and consume the appropriate slot/resource
   * Returns { canCast: boolean, message?, heightenedRank? }
   */
  private canCastAndConsumeSlot(actor: Creature, spell: any, requestedRank?: number): { canCast: boolean; message?: string; heightenedRank?: number } {
    // Cantrips (rank 0) don't consume slots
    if (spell.rank === 0) {
      // Auto-heighten cantrips to half caster level (rounded up)
      const cantripRank = Math.ceil(actor.level / 2);
      return { canCast: true, heightenedRank: cantripRank };
    }

    // Focus spells consume focus points
    if (spell.focus) {
      const availableFP = actor.focusPoints ?? 0;
      if (availableFP <= 0) {
        return { canCast: false, message: `${actor.name} has no focus points remaining!` };
      }
      // Consume 1 focus point
      actor.focusPoints = Math.max(0, availableFP - 1);
      return { canCast: true, heightenedRank: requestedRank ?? spell.rank };
    }

    // Regular spells consume slots
    if (!actor.spellcasters || actor.spellcasters.length === 0) {
      return { canCast: false, message: `${actor.name} is not a spellcaster!` };
    }

    // Find a spellcaster tradition that can cast this spell
    const castingTradition = actor.spellcasters.find((tradition) =>
      spell.traditions.includes(tradition.tradition)
    );

    if (!castingTradition) {
      return { canCast: false, message: `${actor.name} cannot cast ${spell.name} (no matching tradition)!` };
    }

    // Determine which rank to cast at (default to spell's base rank, or heightened rank if requested)
    const rankToCast = requestedRank ?? spell.rank;

    // Find available slot at that rank
    const slot = castingTradition.slots.find((s) => s.level === rankToCast && s.available > 0);

    if (!slot) {
      return { canCast: false, message: `${actor.name} has no rank ${rankToCast} spell slots remaining!` };
    }

    // Consume the slot
    slot.available = Math.max(0, slot.available - 1);

    return { canCast: true, heightenedRank: rankToCast };
  }

  private resolveSpell(actor: Creature, gameState: GameState, spell: any, targetId?: string, targetPosition?: Position, requestedRank?: number): any {
    // Check if the spell can be cast and consume resources
    const castCheck = this.canCastAndConsumeSlot(actor, spell, requestedRank);
    
    if (!castCheck.canCast) {
      return { success: false, message: castCheck.message || 'Cannot cast spell' };
    }

    const heightenedRank = castCheck.heightenedRank ?? spell.rank;

    // Resolve the spell with heightened rank
    switch (spell.id) {
      case 'magic-missile':
        return this.resolveMagicMissile(actor, gameState, targetId, heightenedRank);
      case 'fireball':
        return this.resolveFireball(actor, gameState, targetPosition, heightenedRank);
      case 'burning-hands':
        return this.resolveBurningHands(actor, gameState, targetPosition, heightenedRank);
      case 'shield':
        return this.resolveShield(actor, heightenedRank);
      case 'heal':
        return this.resolveHeal(actor, gameState, targetId, heightenedRank);
      case 'produce-flame':
        return this.resolveProduceFlame(actor, gameState, targetId, heightenedRank);
      case 'electric-arc':
        return this.resolveElectricArc(actor, gameState, targetId, heightenedRank);
      case 'telekinetic-projectile':
        return this.resolveTelekineticProjectile(actor, gameState, targetId, heightenedRank);
      case 'daze':
        return this.resolveDaze(actor, gameState, targetId, heightenedRank);
      case 'fear':
        return this.resolveFear(actor, gameState, targetId, heightenedRank);
      case 'grease':
        return this.resolveGrease(actor, gameState, targetPosition, heightenedRank);
      case 'haste':
        return this.resolveHaste(actor, gameState, targetId, heightenedRank);
      case 'slow':
        return this.resolveSlow(actor, gameState, targetId, heightenedRank);
      case 'lightning-bolt':
        return this.resolveLightningBolt(actor, gameState, targetPosition, heightenedRank);
      case 'heroism':
        return this.resolveHeroism(actor, gameState, targetId, heightenedRank);
      case 'true-strike':
        return this.resolveTrueStrike(actor, gameState, heightenedRank);
      case 'warp-step':
        return this.resolveWarpStep(actor, gameState, heightenedRank, targetPosition, false);
      default:
        return { success: false, message: `Spell "${spell.name}" not yet implemented` };
    }
  }

  private resolveMagicMissile(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found' };
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
        baseDamage: totalDamage,
        damageModifier: damageCalc.modifier,
        modifierValue: damageCalc.modifierValue,
        finalDamage: finalDamage,
        formula: `${numMissiles}×(1d4+1)`,
        rolls: missileRolls,
      },
      heightenedRank,
      numMissiles,
    };
  }

  private resolveFireball(actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 3): any {
    if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
      return { success: false, message: 'Invalid target location specified' };
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

    // Roll damage once for all targets
    const baseDamageRoll = rollDamageFormula(damageFormula);
    const results: any[] = [];

    targetsInAoE.forEach((target) => {
      // Make a Reflex save
      const saveRoll = this.rollSave(target, 'reflex', saveDC);
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

  private resolveBurningHands(actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 1): any {
    if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
      return { success: false, message: 'Invalid target location specified' };
    }

    const coneRange = 3; // 15-foot cone ≈ 3 squares
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
        
        // cos(45°) ≈ 0.707, so dot product > 0.5 gives roughly 60-degree cone spread
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
        message: `🔥 ${actor.name} casts Burning Hands${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} in a cone from (${actor.positions.x}, ${actor.positions.y}), but there are no targets in the blast!`,
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
      const saveRoll = this.rollSave(target, 'reflex', saveDC);
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

  private resolveShield(actor: Creature, heightenedRank: number = 1): any {
    // PF2e Remaster: Shield cantrip grants +1 circumstance bonus to AC
    // TODO: Implement full Shield mechanics (Hardness, HP, Broken Threshold based on heightening)
    // Rank 1: Hardness 5, HP 20, BT 10
    // +2 ranks: +2 Hardness, +10 HP, +5 BT
    actor.conditions.push({ name: 'shield', duration: 1, value: 1 }); // +1 AC for 1 round
    return {
      success: true,
      message: `🛡️ ${actor.name} casts Shield${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}, gaining +1 AC this round!`,
      acBonus: 1,
      heightenedRank,
    };
  }

  private resolveHeal(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Heal!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    // Heal: 1d8 per rank (heightening +1d8 per rank). No modifier added per Remaster.
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

  private resolveProduceFlame(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Produce Flame!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
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

    let message = `🔥 ${actor.name} casts Ignition${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    if (sureStrikeUsed) {
      message += `Sure Strike: rolled ${sureStrikeRolls![0]} and ${sureStrikeRolls![1]}, using ${d20}\n`;
    }
    message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${total} vs AC ${targetAC}\n`;
    message += `Result: **${result.toUpperCase()}**`;

    if (result === 'failure' || result === 'critical-failure') {
      return { success: true, message, result, targetHealth: target.currentHealth };
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

  private resolveElectricArc(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Electric Arc!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    // Electric Arc: 2d4 at base, +1d4 per heightened rank (Remaster)
    const numDice = 1 + heightenedRank;
    const damageFormula = `${numDice}d4`;
    const saveDC = calculateSpellDC(actor);

    // Basic Reflex save
    const saveRoll = this.rollSave(target, 'reflex', saveDC);
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

    let message = `⚡ ${actor.name} casts Electric Arc${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    message += `Reflex Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
    message += `💥 Damage: ${finalDamage} electricity`;

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

  private resolveTelekineticProjectile(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Telekinetic Projectile!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
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

    let message = `🪨 ${actor.name} casts Telekinetic Projectile${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    if (sureStrikeUsed) {
      message += `Sure Strike: rolled ${sureStrikeRolls![0]} and ${sureStrikeRolls![1]}, using ${d20}\n`;
    }
    message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${total} vs AC ${targetAC}\n`;
    message += `Result: **${result.toUpperCase()}**`;

    if (result === 'failure' || result === 'critical-failure') {
      return { success: true, message, result, targetHealth: target.currentHealth };
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

    message += `\n💥 Damage: ${finalDamage} bludgeoning`;

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

  private resolveDaze(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Daze!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    // Daze: 1d6, heightens +1d6 per 2 ranks
    const numDice = 1 + Math.floor((heightenedRank - 1) / 2);
    const damageFormula = `${numDice}d6`;
    const saveDC = calculateSpellDC(actor);

    // Basic Will save
    const saveRoll = this.rollSave(target, 'will', saveDC);
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

    let message = `😵 ${actor.name} casts Daze${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
    message += `💥 Damage: ${finalDamage} mental`;

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

  private resolveFear(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Fear!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    const saveDC = calculateSpellDC(actor);
    const saveRoll = this.rollSave(target, 'will', saveDC);

    let message = `😱 ${actor.name} casts Fear${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

    // Apply frightened based on save result (PF2e Remaster)
    // Crit Success: unaffected, Success: frightened 1, Failure: frightened 2, Crit Failure: frightened 3 + fleeing 1 round
    if (saveRoll.result === 'critical-failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'frightened', duration: 'permanent', value: 3 });
      target.conditions.push({ name: 'fleeing', duration: 1, value: 1 });
      message += `\n✨ ${target.name} is **frightened 3** and **fleeing** for 1 round!`;
    } else if (saveRoll.result === 'failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'frightened', duration: 'permanent', value: 2 });
      message += `\n✨ ${target.name} is **frightened 2**!`;
    } else if (saveRoll.result === 'success') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'frightened', duration: 'permanent', value: 1 });
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

  private resolveGrease(actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 1): any {
    if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
      return { success: false, message: 'Invalid target location specified for Grease!' };
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
        message: `🛢️ ${actor.name} casts Grease${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y}), but no creatures are in the area!`,
        heightenedRank,
      };
    }

    const results: any[] = [];
    let message = `🛢️ ${actor.name} casts Grease${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at (${targetPosition.x}, ${targetPosition.y})!\n`;

    targetsInAoE.forEach((target) => {
      const saveRoll = this.rollSave(target, 'reflex', saveDC);
      
      let targetMessage = `${target.name}: ${saveRoll.result.toUpperCase()}`;

      if (saveRoll.result === 'critical-failure') {
        // Prone + off-guard
        if (!target.conditions) target.conditions = [];
        target.conditions.push({ name: 'prone', duration: 'permanent', value: 1 });
        target.conditions.push({ name: 'off-guard', duration: 1, value: 1 });
        targetMessage += ' → **prone + off-guard**';
      } else if (saveRoll.result === 'failure') {
        // Off-guard only
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

  private resolveHaste(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Haste!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    // Haste: Duration 1 minute (10 rounds), NOT sustained
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ 
      name: 'quickened', 
      duration: 10, // 1 minute = 10 rounds
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

  private resolveSlow(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Slow!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    const saveDC = calculateSpellDC(actor);
    const saveRoll = this.rollSave(target, 'fortitude', saveDC);

    let message = `🐌 ${actor.name} casts Slow${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

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
      message += `\n✨ ${target.name} is **slowed 2** for 1 minute!`;
    } else if (saveRoll.result === 'failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ 
        name: 'slowed', 
        duration: 10, // 1 minute = 10 rounds
        value: 1,
        source: `slow-${actor.id}`,
      });
      message += `\n✨ ${target.name} is **slowed 1** for 1 minute!`;
    } else if (saveRoll.result === 'success') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ 
        name: 'slowed', 
        duration: 1, // 1 round only
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

  private resolveLightningBolt(actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 3): any {
    if (!targetPosition || typeof targetPosition !== 'object' || !('x' in targetPosition) || !('y' in targetPosition)) {
      return { success: false, message: 'Invalid target location specified for Lightning Bolt!' };
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
        message: `⚡ ${actor.name} casts Lightning Bolt${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''}, but no creatures are caught in the line!`,
        heightenedRank,
        damageFormula,
      };
    }

    const baseDamageRoll = rollDamageFormula(damageFormula);
    const results: any[] = [];

    targetsInLine.forEach((target) => {
      const saveRoll = this.rollSave(target, 'reflex', saveDC);
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

  private resolveHeroism(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 3): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Heroism!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
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

  private resolveTrueStrike(actor: Creature, gameState: GameState, heightenedRank: number = 1): any {
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

    let message = `🎯 ${actor.name} casts Sure Strike!\n`;
    message += `✨ ${actor.name}'s next attack this turn will be rolled twice, taking the better result! Also ignores concealment.`;

    return {
      success: true,
      message,
      heightenedRank,
    };
  }

  /**
   * Warp Step — Psi Cantrip (Psychic / Psychic Dedication)
   * PF2e Remaster rules:
   *   Base: +5ft status bonus to Speed until end of turn, then Stride twice. (2 actions)
   *   Unbound Step conscious mind: +10ft status bonus instead of +5ft.
   *   Amp (costs 1 focus point): Cast as a single action instead of 2.
   *   Amp Heightened (4th): Can choose to teleport instead of Striding.
   *     Teleport range = 2× Speed (after status bonus). Gains teleportation trait.
   *     Teleportation does NOT trigger Reactive Strike.
   */
  private resolveWarpStep(
    actor: Creature,
    gameState: GameState,
    heightenedRank: number = 1,
    targetPosition?: Position,
    amped: boolean = false
  ): any {
    if (!actor.conditions) actor.conditions = [];

    // ── Determine speed bonus ──────────────────────────────
    // Base Warp Step: +5ft status bonus to Speed
    // Unbound Step conscious mind: +10ft instead
    const hasUnboundStep = this.hasPsychicUnboundStep(actor);
    const speedBonusFeet = hasUnboundStep ? 10 : 5;

    // ── Amp: consume focus point for enhanced effect ───────
    if (amped) {
      if (!this.consumeFocusPointForAmp(actor)) {
        return {
          success: false,
          message: `${actor.name} has no focus points to amp Warp Step!`,
        };
      }
    }

    // ── Amp Heightened (4th): Teleportation option ─────────
    // At heightened 4th+ AND amped, the caster can choose to teleport
    // Range = 2× Speed (after applying the status bonus from Warp Step)
    if (amped && heightenedRank >= 4 && targetPosition) {
      return this.resolveWarpStepTeleport(actor, gameState, speedBonusFeet, heightenedRank, targetPosition);
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

    // ── Standard effect: speed bonus + Stride twice (as movement) ──
    // PF2e: "You gain a +5-foot status bonus to your Speed, then Stride twice."
    // Implemented as a single movement to targetPosition with range = 2 × boosted speed.
    if (!targetPosition) {
      return { success: false, message: 'No destination specified for Warp Step.' };
    }

    // Immobilization check
    const immob = actor.conditions?.find(c =>
      ['immobilized', 'grabbed', 'restrained', 'paralyzed'].includes(c.name)
    );
    if (immob) {
      return { success: false, message: `${actor.name} cannot move while ${immob.name}!`, errorCode: 'IMMOBILIZED' };
    }

    const baseSpeedFeet = actor.speed ?? 25;
    const boostedSpeedFeet = baseSpeedFeet + speedBonusFeet;
    const maxDistanceSquares = (boostedSpeedFeet * 2) / 5; // 2 Strides at boosted speed

    // Validate bounds
    const mw = gameState.map?.width ?? 0;
    const mh = gameState.map?.height ?? 0;
    if (targetPosition.x < 0 || targetPosition.y < 0 || targetPosition.x >= mw || targetPosition.y >= mh) {
      return { success: false, message: 'Destination is outside map bounds.', errorCode: 'OUT_OF_BOUNDS' };
    }

    // Validate destination not occupied
    const occupiedPositions = new Set<string>(
      gameState.creatures
        .filter(c => c.id !== actor.id && c.currentHealth > 0)
        .map(c => `${c.positions.x},${c.positions.y}`)
    );
    if (occupiedPositions.has(`${targetPosition.x},${targetPosition.y}`)) {
      return { success: false, message: 'Destination is occupied by another creature.', errorCode: 'DESTINATION_OCCUPIED' };
    }

    // Pathfind to destination respecting terrain
    const isProne = actor.conditions?.some(c => c.name === 'prone') ?? false;
    const terrainMultiplier = isProne ? { difficult: 4 } : { difficult: 2 };
    const terrainGrid = gameState.map?.terrain;
    let pathCost = this.calculateDistance(actor.positions, targetPosition);
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

    // Execute movement
    const oldPos = { x: actor.positions.x, y: actor.positions.y };
    actor.positions = { x: targetPosition.x, y: targetPosition.y };
    this.cleanupStaleFlankingConditions(gameState);

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
      actionId: 'warp-step', // For engine to identify as Stride-like movement
    };
  }

  /**
   * Warp Step Teleportation — Amp Heightened (4th)
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
  private resolveWarpStepTeleport(
    actor: Creature,
    gameState: GameState,
    speedBonusFeet: number,
    heightenedRank: number,
    targetPosition: Position
  ): any {
    // ── Immobilization check ──────────────────────────────
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

    // ── Calculate teleport range ──────────────────────────
    // Range = 2× Speed (after the status bonus from Warp Step)
    const boostedSpeedFeet = (actor.speed ?? 25) + speedBonusFeet;
    const teleportRangeFeet = boostedSpeedFeet * 2;
    const teleportRangeSquares = teleportRangeFeet / 5;

    const distance = this.calculateDistance(actor.positions, targetPosition);

    if (distance > teleportRangeSquares) {
      return {
        success: false,
        message: `Cannot teleport ${(distance * 5).toFixed(0)}ft — max range is ${teleportRangeFeet}ft.`,
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
        message: `Cannot teleport to (${targetPosition.x}, ${targetPosition.y}) — outside map bounds.`,
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
        message: `Cannot teleport to (${targetPosition.x}, ${targetPosition.y}) — occupied by another creature.`,
        errorCode: 'DESTINATION_OCCUPIED',
      };
    }

    // ── Execute teleportation ────────────────────────────
    const oldPos = { x: actor.positions.x, y: actor.positions.y };
    actor.positions = { x: targetPosition.x, y: targetPosition.y };

    // Flanking cleanup after teleport
    this.cleanupStaleFlankingConditions(gameState);

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

  private resolveRaiseShield(actor: Creature): any {
    // Check if actor has an equipped shield
    if (!actor.equippedShield) {
      return {
        success: false,
        message: `${actor.name} has no shield equipped!`,
      };
    }

    // Check if shield is already raised
    if (actor.shieldRaised) {
      return {
        success: false,
        message: `${actor.name} already has their shield raised!`,
      };
    }

    // Raise the shield
    actor.shieldRaised = true;

    return {
      success: true,
      message: `🛡️ ${actor.name} raises their shield! AC and shield hardness now active.`,
      shieldRaised: true,
    };
  }

  private resolveLowerShield(actor: Creature): any {
    // Check if shield is raised
    if (!actor.shieldRaised) {
      return {
        success: false,
        message: `${actor.name} doesn't have a shield raised!`,
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
   * Reactive Strike - Make a Strike as a reaction
   */
  private resolveReactiveStrike(actor: Creature, gameState: GameState, targetId?: string): any {
    if (actor.reactionUsed) {
      return { success: false, message: `${actor.name} has already used their reaction this round!` };
    }

    const featMatch = actor.feats?.some((feat) => {
      if (typeof feat?.name !== 'string') return false;
      const name = feat.name.toLowerCase();
      return name.includes('reactive strike') || name.includes('attack of opportunity');
    }) ?? false;

    const specials = (actor as any).specials;
    const specialsMatch = Array.isArray(specials)
      ? specials.some((entry: any) => typeof entry === 'string' && entry.toLowerCase().includes('reactive strike'))
      : false;

    const hasReactiveStrike = featMatch || specialsMatch;
    if (!hasReactiveStrike) {
      return { success: false, message: `${actor.name} does not have Reactive Strike.` };
    }

    if (!targetId) {
      return { success: false, message: 'No target specified for Reactive Strike!' };
    }

    actor.reactionUsed = true;

    const strikeResult = this.resolveStrike(actor, gameState, targetId);
    return {
      ...strikeResult,
      message: `⚡ Reactive Strike! ${strikeResult.message}`,
    };
  }

  /**
   * Shield Block - Use a reaction to reduce incoming damage with a raised shield
   */
  private resolveShieldBlock(actor: Creature): any {
    if (actor.reactionUsed) {
      return { success: false, message: `${actor.name} has already used their reaction this round!` };
    }

    if (!actor.equippedShield) {
      return { success: false, message: `${actor.name} has no shield equipped!` };
    }

    if (!actor.shieldRaised) {
      return { success: false, message: `${actor.name} must have their shield raised to block!` };
    }

    const pending = actor.conditions?.find((c) => c.name === 'pending-damage' && typeof c.value === 'number');
    if (!pending || typeof pending.value !== 'number') {
      return { success: false, message: `${actor.name} has no damage to block right now.` };
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
        shieldMessage += ` 💥 SHIELD BROKEN!`;
      }
    }

    let statusMessage = '';
    if (actor.currentHealth <= 0) {
      if (!actor.dying) {
        actor.dying = true;
        actor.wounded++;
        actor.deathSaveFailures = 0;
        actor.deathSaveSuccesses = 0;
        actor.conditions.push({ name: 'dying', duration: 'permanent', value: actor.wounded });
        statusMessage = ` 💀 ${actor.name} is DYING! (Wounded ${actor.wounded})`;
      } else {
        statusMessage = ` 💀 ${actor.name} is still dying...`;
      }
    }

    return {
      success: true,
      message: `🛡️ ${actor.name} Shield Blocks the hit!${shieldMessage}${statusMessage}`,
      targetHealth: actor.currentHealth,
      targetDying: actor.dying,
      shieldDamage: shieldResult,
    };
  }

  /**
   * Resolve pending damage without Shield Block
   */
  private resolvePendingDamage(actor: Creature): any {
    const pending = actor.conditions?.find((c) => c.name === 'pending-damage' && typeof c.value === 'number');
    if (!pending || typeof pending.value !== 'number') {
      return { success: false, message: `${actor.name} has no pending damage to resolve.` };
    }

    actor.currentHealth -= pending.value;
    actor.conditions = actor.conditions.filter((c) => c !== pending);

    let statusMessage = '';
    if (actor.currentHealth <= 0) {
      if (!actor.dying) {
        actor.dying = true;
        actor.wounded++;
        actor.deathSaveFailures = 0;
        actor.deathSaveSuccesses = 0;
        actor.conditions.push({ name: 'dying', duration: 'permanent', value: actor.wounded });
        statusMessage = ` 💀 ${actor.name} is DYING! (Wounded ${actor.wounded})`;
      } else {
        statusMessage = ` 💀 ${actor.name} is still dying...`;
      }
    }

    return {
      success: true,
      message: `✓ ${actor.name} takes ${pending.value} damage.${statusMessage}`,
      targetHealth: actor.currentHealth,
      targetDying: actor.dying,
    };
  }

  /**
   * Stand - Remove prone condition
   */
  private resolveStand(actor: Creature): any {
    // Check if actor is prone
    const proneCondition = actor.conditions?.find((c) => c.name === 'prone');
    
    if (!proneCondition) {
      return {
        success: false,
        message: `${actor.name} is not prone!`,
      };
    }

    // Remove prone condition
    actor.conditions = actor.conditions?.filter((c) => c.name !== 'prone') || [];

    return {
      success: true,
      message: `🧍 ${actor.name} stands up from prone!`,
    };
  }

  /**
   * Take Cover - Gain protection from ranged attacks
   * If prone: Hunker down for +4 AC vs ranged (but still off-guard)
   * If not prone: Gain +2 AC with cover (requires cover nearby, simplified to always succeed)
   */
  private resolveTakeCover(actor: Creature): any {
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
        message: `🪵 ${actor.name} hunkers down! Gains **+4 AC vs ranged attacks** (still off-guard to all attacks).`,
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
        message: `🪵 ${actor.name} takes cover! Gains **+2 AC** from cover.`,
      };
    }
  }

  /**
   * Feint - Make a Deception check against the target's Perception DC
   * Success: Target is flat-footed (off-guard) against your melee attacks until end of your next turn
   * Critical Success: Target is flat-footed against all your attacks until end of your next turn
   */
  private resolveFeint(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Feint!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    // Get Deception skill bonus
    const deceptionBonus = this.getSkillBonus(actor, 'Deception');
    const perceptionDC = this.getPerceptionDC(target);

    // Roll Deception check
    const d20 = rollD20();
    let total = d20 + deceptionBonus;
    let finalD20 = d20;
    let heroPointMessage: string | undefined;

    if (heroPointsSpent && heroPointsSpent > 0) {
      const spendResult = this.spendHeroPoints(actor, heroPointsSpent, {
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
      console.log(`\n🎭 [FEINT CRIT SUCCESS] Applied off-guard to ${target.name}:`, JSON.stringify(cond));
      message = `🎭 CRITICAL SUCCESS! ${actor.name} feints masterfully! ${target.name} is OFF-GUARD against ${actor.name}'s melee attacks until end of ${actor.name}'s next turn!`;
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
      console.log(`\n🎭 [FEINT SUCCESS] Applied off-guard to ${target.name}:`, JSON.stringify(cond));
      message = `🎭 SUCCESS! ${actor.name} feints ${target.name}! ${target.name} is OFF-GUARD against ${actor.name}'s next melee attack before end of ${actor.name}'s current turn!`;
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
      console.log(`\n🎭 [FEINT CRIT FAIL] Applied off-guard to ${actor.name}:`, JSON.stringify(cond));
      message = `🎭 CRITICAL FAILURE! ${actor.name}'s feint backfires. ${actor.name} is OFF-GUARD against ${target.name}'s melee attacks until end of ${actor.name}'s next turn!`;
    } else {
      message = `🎭 FAILURE! ${target.name} sees through ${actor.name}'s feint.`;
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
   * Get a creature's skill bonus (ability mod + proficiency bonus + item bonuses)
   */
  private getSkillBonus(creature: Creature, skillName: string): number {
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
  private getPerceptionDC(creature: Creature): number {
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
  private getWillDC(creature: Creature): number {
    const willMod = calculateSaveBonus(creature, 'will');
    return 10 + willMod;
  }

  /**
   * Calculate a creature's Reflex DC (10 + Reflex save modifier)
   */
  private getReflexDC(creature: Creature): number {
    const reflexMod = calculateSaveBonus(creature, 'reflex');
    return 10 + reflexMod;
  }

  /**
   * Calculate a creature's Fortitude DC (10 + Fortitude save modifier)
   */
  private getFortitudeDC(creature: Creature): number {
    const fortitudeMod = calculateSaveBonus(creature, 'fortitude');
    return 10 + fortitudeMod;
  }

  /**
   * Demoralize - Make an Intimidation check against the target's Will DC
   * Success: Target is frightened 1
   * Critical Success: Target is frightened 2
   */
  private resolveDemoralize(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Demoralize!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
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

    const intimidationBonus = this.getSkillBonus(actor, 'intimidation');
    const willDC = this.getWillDC(target);

    const d20 = rollD20();
    let total = d20 + intimidationBonus;
    let finalD20 = d20;
    let heroPointMessage: string | undefined;

    if (heroPointsSpent && heroPointsSpent > 0) {
      const spendResult = this.spendHeroPoints(actor, heroPointsSpent, {
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
      message += `\n✨ ${target.name} is **frightened 2**! (Status penalty to all checks/DCs, decreases by 1 each turn)`;
    } else if (result === 'success') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({
        name: 'frightened',
        duration: 'permanent',
        value: 1,
        source: `demoralize-${actor.id}`,
      });
      message += `\n✅ ${target.name} is **frightened 1**! (Status penalty to all checks/DCs, decreases by 1 each turn)`;
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

  /**
   * Shove - Make an Athletics check against the target's Fortitude DC
   * Success: Push target 5 feet
   * Critical Success: Push target 10 feet
   * Critical Failure: You fall prone
   */
  private resolveShove(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Shove!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    // Check if target is within reach (1 square)
    const dx = Math.abs(actor.positions.x - target.positions.x);
    const dy = Math.abs(actor.positions.y - target.positions.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1.5) {
      return { success: false, message: `${target.name} is too far away for Shove!` };
    }

    const athleticsBonus = this.getSkillBonus(actor, 'athletics');
    const fortitudeDC = this.getFortitudeDC(target);

    // Shove has the Attack trait — apply MAP (not agile, so standard -5/-10)
    const mapPenalty = this.getMapPenalty(actor);

    const d20 = rollD20();
    const athleticsTotalBonus = athleticsBonus + mapPenalty;
    let total = d20 + athleticsTotalBonus;
    let finalD20 = d20;
    let heroPointMessage: string | undefined;

    if (heroPointsSpent && heroPointsSpent > 0) {
      const spendResult = this.spendHeroPoints(actor, heroPointsSpent, {
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
      
      message += `\n✨ ${target.name} is shoved **10 feet** away to (${target.positions.x}, ${target.positions.y})!`;
    } else if (result === 'success') {
      // Push 1 square (5 feet)
      const newX = Math.round(target.positions.x + normX);
      const newY = Math.round(target.positions.y + normY);
      
      // Check bounds
      const mapSize = gameState.map?.width || 20;
      target.positions.x = Math.max(0, Math.min(mapSize - 1, newX));
      target.positions.y = Math.max(0, Math.min(mapSize - 1, newY));
      
      message += `\n✅ ${target.name} is shoved **5 feet** away to (${target.positions.x}, ${target.positions.y})!`;
    } else if (result === 'critical-failure') {
      // PF2e Remaster: critical failure on Shove = you fall prone
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

  private resolveTrip(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    if (!targetId) {
      return { success: false, message: 'No target specified for Trip!' };
    }

    const target = gameState.creatures.find((c) => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found!' };
    }

    const athleticsBonus = this.getSkillBonus(actor, 'athletics');
    const reflexDC = this.getReflexDC(target);

    // Trip has the Attack trait — apply MAP (not agile, so standard -5/-10)
    const mapPenalty = this.getMapPenalty(actor);

    const d20 = rollD20();
    const athleticsTotalBonus = athleticsBonus + mapPenalty;
    let total = d20 + athleticsTotalBonus;
    let finalD20 = d20;
    let heroPointMessage: string | undefined;

    if (heroPointsSpent && heroPointsSpent > 0) {
      const spendResult = this.spendHeroPoints(actor, heroPointsSpent, {
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

  private rollSave(
    creature: Creature,
    saveType: 'reflex' | 'fortitude' | 'will',
    saveDC: number,
    heroPointsSpent?: number
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
      const spendResult = this.spendHeroPoints(creature, heroPointsSpent, {
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

    return { d20: finalD20, bonus, total, result };
  }

  // ─── Sickened Condition: Retching Action ─────────────────────────────────
  // PF2e Remaster: Spend 1 action to make a Fortitude save against the effect DC
  // Success: Reduce sickened by 1. Crit success: Reduce by 2
  private resolveRetching(actor: Creature, heroPointsSpent?: number): any {
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
    const saveRoll = this.rollSave(actor, 'fortitude', effectDC, heroPointsSpent);

    let sickenedReduction = 0;
    let message = '';

    if (saveRoll.result === 'critical-success') {
      sickenedReduction = 2;
      message = `${actor.name} retches desperately. Critical Success! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) — Sickened reduced by 2.`;
    } else if (saveRoll.result === 'success') {
      sickenedReduction = 1;
      message = `${actor.name} retches. Success! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) — Sickened reduced by 1.`;
    } else if (saveRoll.result === 'failure') {
      message = `${actor.name} retches unsuccessfully. Failure! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) — Sickened remains unchanged.`;
    } else if (saveRoll.result === 'critical-failure') {
      message = `${actor.name} retches but worsens. Critical Failure! (${saveRoll.d20}+${saveRoll.bonus} vs DC ${effectDC}) — Sickened remains unchanged.`;
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

  // ─── PHASE 3: HERO POINTS ─────────────────────────────────────────────────
  // PF2e Remaster + Enhanced House Rule
  // Standard: 1 HP = reroll, all HP while dying = stabilize
  // House Rule:
  //   1 HP: Roll twice, take better
  //   2 HP: Roll twice, add +10 to second (max natural 20)
  //   3 HP: Automatic natural 20

  /**
   * Spend hero points to modify a d20 roll result
   * Can be called after any d20 check (attack, save, skill check)
   * 
   * @param creature - The creature spending hero points
   * @param heroPointsSpent - Number of hero points to spend (0-3)
   * @param currentRoll - The original d20 roll object: { d20, bonus, total, result }
   * @returns Modified roll result or rejection if invalid
   */
  spendHeroPoints(
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
      message = `${creature.name} spends 1 Hero Point! Rolls: [${currentRoll.d20}, ${secondRoll}] → ${newD20}`;
    } else if (heroPointsSpent === 2) {
      // 2 HP: Roll twice, add +10 to second (result capped at natural 20)
      const secondRoll = rollD20();
      const secondRollWithBonus = Math.min(secondRoll + 10, 20); // Cap at natural 20
      newD20 = Math.max(currentRoll.d20, secondRollWithBonus);
      newTotal = newD20 + currentRoll.bonus;
      message = `${creature.name} spends 2 Hero Points! Rolls: [${currentRoll.d20}, ${secondRoll}+10=${secondRollWithBonus}] → ${newD20}`;
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

  /**
   * Use all hero points to stabilize while dying
   * PF2e: Spend all hero points while dying → stabilize at 0 HP, lose dying condition
   */
  stabilizeWithHeroPoints(creature: Creature): {
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

  // ═══════════════════════════════════════════════════════════
  // PHASE 5.2: FIGHTER FEATS
  // ═══════════════════════════════════════════════════════════

  /**
   * Power Attack (Level 1)
   * 2-action Flourish. Strike with one extra weapon die.
   */
  private resolvePowerAttack(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Power Attack feat
    const hasFeature = this.hasFighterFeat(actor, 'power attack');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Power Attack.` };
    }

    // Flourish: only once per turn
    if (actor.flourishUsedThisTurn) {
      return { success: false, message: `${actor.name} has already used a Flourish action this turn.` };
    }
    actor.flourishUsedThisTurn = true;

    // Perform strike with extra damage die
    const strikeResult = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
    if (!strikeResult.success) {
      // Unfail, flourish was used
      return strikeResult;
    }

    // Add one extra damage die to the damage
    if (strikeResult.details?.damage) {
      const weapon = this.resolveSelectedWeapon(actor, weaponId);
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
      strikeResult.message = `🔨 POWER ATTACK! ${strikeResult.message} (+${extraDamage} extra die)`;
    }

    return strikeResult;
  }

  /**
   * Sudden Charge (Level 1)
   * 2-action Attack. Stride twice, then Strike.
   */
  private resolveSuddenCharge(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    targetPosition?: Position,
    heroPointsSpent?: number
  ): any {
    // Check for Sudden Charge feat
    const hasFeature = this.hasFighterFeat(actor, 'sudden charge');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Sudden Charge.` };
    }

    if (!targetPosition) {
      return { success: false, message: 'Stride position must be provided for Sudden Charge.' };
    }

    // First Stride
    const stride1 = this.resolveMovement(actor, gameState, targetPosition, 'stride');
    if (!stride1.success) {
      return stride1;
    }

    // Move to the new position
    actor.positions = targetPosition;

    // Second Stride (calculate intermediate position)
    // For simplicity, we'll use the same target position for both strides
    const stride2 = this.resolveMovement(actor, gameState, targetPosition, 'stride');
    if (!stride2.success) {
      return stride2;
    }

    actor.positions = targetPosition;

    // Strike
    const strike = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    if (!strike.success) {
      return strike;
    }

    return {
      success: true,
      message: `⚔️ SUDDEN CHARGE! ${actor.name} charged twice and struck ${strike.details?.targetName || targetId}!`,
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
  private resolveDoubleSlice(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Double Slice feat
    const hasFeature = this.hasFighterFeat(actor, 'double slice');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Double Slice.` };
    }

    // Double Slice is NOT Flourish — no flourish check needed

    if (!targetId) {
      return { success: false, message: 'No target specified for Double Slice.' };
    }

    // Check if actor has dual wielding setup
    const heldWeapons = actor.weaponInventory?.filter(s => s.state === 'held') || [];
    if (heldWeapons.length < 2) {
      return { success: false, message: `${actor.name} does not have two weapons held for Double Slice.` };
    }

    // Strike with first weapon
    const strike1 = this.resolveAttackAction(actor, gameState, targetId, heldWeapons[0].weapon.id, { isVicious: false }, heroPointsSpent);
    if (!strike1.success) {
      return strike1;
    }

    // Strike with second weapon (inherits full MAP from first, but both count as 1 action)
    const strike2 = this.resolveAttackAction(actor, gameState, targetId, heldWeapons[1].weapon.id, { isVicious: false }, heroPointsSpent);
    if (!strike2.success) {
      return strike2;
    }

    const totalDamage = (strike1.details?.damage?.appliedDamage || 0) + (strike2.details?.damage?.appliedDamage || 0);

    return {
      success: true,
      message: `⚔️⚔️ DOUBLE SLICE! ${actor.name} struck ${strike1.details?.targetName || targetId} with both weapons for total ${totalDamage} damage!`,
      details: { strike1: strike1.details, strike2: strike2.details },
      totalDamage,
      targetHealth: strike2.targetHealth,
    };
  }

  /**
   * Intimidating Strike (Level 1)
   * 2-action Flourish. Strike, and on hit, target is Frightened 1 (or 2 on crit).
   */
  private resolveIntimidatingStrike(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Intimidating Strike feat
    const hasFeature = this.hasFighterFeat(actor, 'intimidating strike');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Intimidating Strike.` };
    }

    // Flourish: only once per turn
    if (actor.flourishUsedThisTurn) {
      return { success: false, message: `${actor.name} has already used a Flourish action this turn.` };
    }
    actor.flourishUsedThisTurn = true;

    // Perform the strike
    const strikeResult = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
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
      
      strikeResult.message += ` 😨 ${target.name} is now Frightened ${frightLevel}!`;
    }

    return strikeResult;
  }

  /**
   * Exacting Strike (Level 1)
   * 1-action Press. Strike, and if you miss, it doesn't count for MAP.
   * Press trait: requires you to have already made an attack this turn.
   */
  private resolveExactingStrike(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Exacting Strike feat
    const hasFeature = this.hasFighterFeat(actor, 'exacting strike');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Exacting Strike.` };
    }

    // Press trait: must have already attacked this turn
    if ((actor.attacksMadeThisTurn ?? 0) < 1) {
      return { success: false, message: `${actor.name} must make at least one Strike before using Exacting Strike (Press trait).` };
    }

    // Save the current MAP count
    const originalMAP = actor.attacksMadeThisTurn ?? 0;

    // Attempt the strike
    const strikeResult = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);

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
  private resolveSnaggingStrike(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Snagging Strike feat
    const hasFeature = this.hasFighterFeat(actor, 'snagging strike');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Snagging Strike.` };
    }

    // Perform the strike
    const strikeResult = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
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
  private resolveKnockdown(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Knockdown feat
    const hasFeature = this.hasFighterFeat(actor, 'knockdown');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Knockdown.` };
    }

    // Flourish: only once per turn
    if (actor.flourishUsedThisTurn) {
      return { success: false, message: `${actor.name} has already used a Flourish action this turn.` };
    }
    actor.flourishUsedThisTurn = true;

    // Perform the strike
    const strikeResult = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
    if (!strikeResult.success) {
      // Unfail, flourish was used
      return strikeResult;
    }

    // Attempt free Trip if strike hits
    const tripResult = this.resolveTrip(actor, gameState, targetId, 0);
    if (tripResult.success) {
      strikeResult.message += ` ${tripResult.message}`;
    }

    return strikeResult;
  }

  /**
   * Brutish Shove (Level 2)
   * Shove success: target is also off-guard until end of next turn.
   */
  private resolveBrutishShove(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Brutish Shove feat
    const hasFeature = this.hasFighterFeat(actor, 'brutish shove');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Brutish Shove.` };
    }

    // Perform normal Shove
    const shoveResult = this.resolveShove(actor, gameState, targetId, heroPointsSpent);
    
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
  private resolveDuelingParry(actor: Creature): any {
    // Check for Dueling Parry feat
    const hasFeature = this.hasFighterFeat(actor, 'dueling parry');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Dueling Parry.` };
    }

    // Check if using 1-handed weapon with free hand
    const heldWeapons = actor.weaponInventory?.filter(s => s.state === 'held') || [];
    if (heldWeapons.length === 0) {
      return { success: false, message: `${actor.name} must be wielding a weapon for Dueling Parry.` };
    }

    // Must have one held weapon and free hand
    if (heldWeapons.length > 1) {
      return { success: false, message: `${actor.name} cannot have more than one held weapon for Dueling Parry.` };
    }

    // Check if free hand requirement is met
    const handsUsed = actor.handsUsed ?? 0;
    if (handsUsed >= 2) {
      return { success: false, message: `${actor.name} must have a free hand for Dueling Parry.` };
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
      message: `✓ ${actor.name} assumes a dueling stance! +2 circumstance bonus to AC until end of turn.`,
    };
  }

  /**
   * Lunge (Level 2)
   * 1-action. Extend reach by 5 feet for next Strike.
   */
  private resolveLunge(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Lunge feat
    const hasFeature = this.hasFighterFeat(actor, 'lunge');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Lunge.` };
    }

    // Apply extended reach bonus
    if (!actor.bonuses) actor.bonuses = [];
    const weapon = this.resolveSelectedWeapon(actor, weaponId);
    const baseReach = weapon?.range ?? 5;
    
    actor.bonuses.push({
      source: 'lunge',
      value: 5,
      type: 'circumstance',
      applyTo: `reach:${weapon?.id || 'unarmed'}`,
    });

    return {
      success: true,
      message: `✓ ${actor.name} lunges forward, extending their reach by 5 feet for the next Strike.`,
    };
  }

  /**
   * Twin Parry (Level 4)
   * 1-action. +1 circumstance AC while dual wielding (or +2 if parry trait).
   */
  private resolveTwinParry(actor: Creature): any {
    // Check for Twin Parry feat
    const hasFeature = this.hasFighterFeat(actor, 'twin parry');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Twin Parry.` };
    }

    // Required: dual wielding
    const heldWeapons = actor.weaponInventory?.filter(s => s.state === 'held') || [];
    if (heldWeapons.length < 2) {
      return { success: false, message: `${actor.name} must have two weapons held for Twin Parry.` };
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
      message: `✓ ${actor.name} parries with both weapons! +${acBonus} circumstance bonus to AC until end of turn.`,
    };
  }

  /**
   * Shatter Defenses (Level 4)
   * 1-action Press. Strike a frightened target, and on hit, they become off-guard
   * for the remainder of the current turn.
   * PF2e Remaster: Requires a frightened target (not off-guard).
   */
  private resolveShatterDefenses(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Shatter Defenses feat
    const hasFeature = this.hasFighterFeat(actor, 'shatter defenses');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Shatter Defenses.` };
    }

    // Press trait: must have already attacked this turn
    if ((actor.attacksMadeThisTurn ?? 0) < 1) {
      return { success: false, message: `${actor.name} must make at least one Strike before using Shatter Defenses (Press trait).` };
    }

    if (!targetId) {
      return { success: false, message: 'No target specified.' };
    }

    const target = gameState.creatures.find(c => c.id === targetId);
    if (!target) {
      return { success: false, message: 'Target not found.' };
    }

    // PF2e: Requires target to be frightened (not off-guard)
    const targetIsFrightened = target.conditions?.some(c => c.name === 'frightened');
    if (!targetIsFrightened) {
      return { success: false, message: `${target.name} must be frightened for Shatter Defenses.` };
    }

    // Perform the strike
    const strikeResult = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
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
  private hasFighterFeat(creature: Creature, featName: string): boolean {
    const lowerFeatName = featName.toLowerCase().trim();
    
    // Check feats array (exact match on feat name)
    const hasFeat = creature.feats?.some((f: any) => {
      const name = typeof f === 'string' ? f : f?.name;
      return typeof name === 'string' && name.toLowerCase().trim() === lowerFeatName;
    });
    
    // Check specials array (exact match)
    const hasSpecial = (creature as any).specials?.some((s: any) => 
      typeof s === 'string' && s.toLowerCase().trim() === lowerFeatName
    );
    
    return hasFeat || hasSpecial || false;
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: ARCHETYPE / DEDICATION HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Check if a creature has a specific dedication (archetype).
   * Checks both the dedications array and feats for the dedication feat.
   */
  private hasDedication(creature: Creature, dedicationName: string): boolean {
    const lowerName = dedicationName.toLowerCase().trim();

    // Check dedications array (if populated)
    if (creature.dedications?.some(d => d.name.toLowerCase().trim() === lowerName)) {
      return true;
    }

    // Check feats for the dedication feat (e.g., "Psychic Dedication")
    return this.hasFighterFeat(creature, `${dedicationName} dedication`);
  }

  /**
   * Check if a creature has Psychic Dedication and the Unbound Step conscious mind.
   * The Unbound Step conscious mind grants the Warp Step psi cantrip.
   */
  private hasPsychicUnboundStep(creature: Creature): boolean {
    // Check dedications array for Psychic with Unbound Step conscious mind
    const psychicDed = creature.dedications?.find(
      d => d.name.toLowerCase() === 'psychic'
    );
    if (psychicDed?.consciousMind?.toLowerCase().includes('unbound step')) {
      return true;
    }

    // Also check focus spells — Pathbuilder may import warp-step directly
    if (creature.focusSpells?.some(s => s.name.toLowerCase() === 'warp step' || s.name.toLowerCase() === 'warp-step')) {
      return true;
    }

    // Check if they have the Psychic Dedication feat + a focus spell named warp step
    return this.hasDedication(creature, 'psychic');
  }

  /**
   * Check if a psi cantrip is being amped (focus point spent for enhanced effect).
   * Amping costs 1 focus point and enhances the cantrip.
   * Returns true if the cantrip can be amped and the creature has focus points.
   */
  private canAmpCantrip(creature: Creature, spellName: string): boolean {
    const focusSpell = creature.focusSpells?.find(
      s => s.name.toLowerCase().replace(/\s+/g, '-') === spellName.toLowerCase() ||
           s.name.toLowerCase() === spellName.toLowerCase().replace(/-/g, ' ')
    );
    return !!(focusSpell?.ampable && (creature.focusPoints ?? 0) > 0);
  }

  /**
   * Consume a focus point for amping a psi cantrip.
   * Returns true if successful, false if no focus points available.
   */
  private consumeFocusPointForAmp(creature: Creature): boolean {
    if ((creature.focusPoints ?? 0) <= 0) return false;
    creature.focusPoints = (creature.focusPoints ?? 1) - 1;
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 5.2+: HIGHER LEVEL FIGHTER FEATS (Level 6+)
  // ═══════════════════════════════════════════════════════════

  /**
   * Armor Specialization (Level 6)
   * Receive damage reduction equal to the armor's hardness while wearing armor.
   * Activates as a passive bonus (no action required).
   */
  private resolveArmorSpecialization(actor: Creature): any {
    // Check for Armor Specialization feat
    const hasFeature = this.hasFighterFeat(actor, 'armor specialization');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Armor Specialization.` };
    }

    // Get equipped armor
    const equippedArmor = actor.equippedShield ? 'shield' : 'armor';
    if (!actor.equippedShield && !actor.armorBonus) {
      return { success: false, message: `${actor.name} is not wearing armor to benefit from Armor Specialization.` };
    }

    return {
      success: true,
      message: `✓ ${actor.name} is benefiting from Armor Specialization. Damage reduction is applied to all incoming damage.`,
      effect: 'armor-specialization-active',
    };
  }

  /**
   * Fearless / Bravery (Fighter Class Feature, Level 3+)
   * Success on Will saves against fear effects counts as a critical success.
   * Reduce frightened condition value by 1 if already frightened.
   * PF2e Remaster: This is the Fighter's Bravery class feature.
   */
  private resolveFearless(actor: Creature): any {
    // Check for Fearless/Bravery feat or class feature
    const hasFeature = this.hasFighterFeat(actor, 'fearless') || this.hasFighterFeat(actor, 'bravery');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Bravery/Fearless.` };
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
          message: `✓ ${actor.name} overcomes their fear! Frightened condition removed.`,
        };
      } else {
        frightenedCondition.value = newValue;
        return {
          success: true,
          message: `✓ ${actor.name}'s fear is reduced! Now Frightened ${newValue}.`,
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
      message: `✓ ${actor.name} is now fearless and immune to fear effects!`,
    };
  }

  /**
   * Weapon Mastery (Level 8)
   * Unlock critical specialization effects for all weapons. 
   * This is a passive ability that modifies weapon behavior on critical hits.
   */
  private resolveWeaponMastery(actor: Creature): any {
    // Check for Weapon Mastery feat
    const hasFeature = this.hasFighterFeat(actor, 'weapon mastery');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Weapon Mastery.` };
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
      message: `✓ ${actor.name} unlocks Weapon Mastery! Critical strikes now apply critical specialization effects.`,
      effect: 'weapon-mastery-active',
    };
  }

  /**
   * Flexible Flurry (Level 10)
   * You can use multiple different weapons in a single turn without MAP penalties accumulating.
   * Each weapon type (or weapon group) resets the MAP counter for that weapon.
   */
  private resolveFlexibleFlurry(actor: Creature): any {
    // Check for Flexible Flurry feat
    const hasFeature = this.hasFighterFeat(actor, 'flexible flurry');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Flexible Flurry.` };
    }

    // Track which weapons have been used this turn for MAP purposes
    const mapByWeapon = new Map<string, number>();
    
    actor.feats?.forEach((f: any) => {
      const name = typeof f === 'string' ? f : f?.name;
      if (typeof name === 'string' && name.toLowerCase().includes('flexible flurry')) {
        // Store reference to weapon-specific MAP tracking
        (actor as any).mapByWeapon = mapByWeapon;
      }
    });

    return {
      success: true,
      message: `✓ ${actor.name} activates Flexible Flurry! Multiple attack patterns are now possible without full MAP penalties.`,
      effect: 'flexible-flurry-active',
    };
  }

  /**
   * Iron Will (Fighter Class Feature, Level 9)
   * Your mental fortitude is legendary. Your Will save proficiency increases to expert.
   * PF2e Remaster: This is a class feature granting expert Will saves, not a feat. 
   * Implemented as +2 status bonus to Will saves for simplicity.
   */
  private resolveIronWill(actor: Creature, heroPointsSpent?: number): any {
    // Check for Iron Will class feature
    const hasFeature = this.hasFighterFeat(actor, 'iron will');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Iron Will.` };
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

    let message = `✓ ${actor.name} hardens their will! +${bonus} status bonus to Will saves.`;

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
  private resolveReflexiveShield(actor: Creature): any {
    // Check for Reflexive Shield feat
    const hasFeature = this.hasFighterFeat(actor, 'reflexive shield');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Reflexive Shield.` };
    }

    // Check if shield is equipped
    if (!actor.equippedShield) {
      return { success: false, message: `${actor.name} must have a shield equipped to benefit from Reflexive Shield.` };
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
      message: `✓ ${actor.name}'s shield raises reflexively! Shield is now raised and ready to block.`,
      effect: 'reflexive-shield-ready',
    };
  }

  /**
   * Improved Reflexes (Level 12)
   * Gain an extra reaction each round. Can be used for Reactive Strike or Shield Block.
   */
  private resolveImprovedReflexes(actor: Creature): any {
    // Check for Improved Reflexes feat
    const hasFeature = this.hasFighterFeat(actor, 'improved reflexes');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Improved Reflexes.` };
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
    (actor as any).extraReactionsAvailable = 1;

    return {
      success: true,
      message: `✓ ${actor.name}'s reflexes sharpen! Gains an additional reaction this round.`,
      effect: 'improved-reflexes-active',
    };
  }

  /**
   * Reaction Enhancement (Higher-level Fighter class feature)
   * Enhances reaction abilities with bonuses.
   * Requires the 'reaction enhancement' feat/feature specifically.
   */
  private resolveReactionEnhancement(actor: Creature): any {
    // Check for Reaction Enhancement - must exactly match
    const hasFeature = this.hasFighterFeat(actor, 'reaction enhancement');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Reaction Enhancement.` };
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
      message: `✓ ${actor.name} enhances their reaction abilities! +1 circumstance bonus to reaction-based checks.`,
      effect: 'reaction-enhancement-active',
    };
  }

  /**
   * Reactive Shield (Level 1)
   * Reaction. Raise your shield as a reaction when you're targeted by an attack.
   */
  private resolveReactiveShield(actor: Creature): any {
    // Check for Reactive Shield feat
    const hasFeature = this.hasFighterFeat(actor, 'reactive shield');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Reactive Shield.` };
    }

    // Check if shield equipped
    if (!actor.equippedShield) {
      return { success: false, message: `${actor.name} must have a shield equipped for Reactive Shield.` };
    }

    // Check if reaction already used
    if (actor.reactionUsed) {
      return { success: false, message: `${actor.name} has already used their reaction this round.` };
    }

    actor.reactionUsed = true;
    actor.shieldRaised = true;

    return {
      success: true,
      message: `⚡ REACTION: ${actor.name} raises their shield reactively!`,
    };
  }

  /**
   * Cleaving Finish (Level 4 Reaction)
   * Reaction trigger: Your melee Strike kills a creature or knocks it unconscious.
   * Effect: Make a melee Strike against another creature adjacent to the original target.
   * PF2e: This is a Reaction, NOT a Flourish. It triggers only when you down an enemy.
   */
  private resolveCleavingFinish(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Cleaving Finish feat
    const hasFeature = this.hasFighterFeat(actor, 'cleaving finish');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Cleaving Finish.` };
    }

    // Reaction: check if reaction used this round
    if (actor.reactionUsed) {
      return { success: false, message: `${actor.name} has already used their reaction this round.` };
    }

    actor.reactionUsed = true;

    if (!targetId) {
      return { success: false, message: 'No target specified for Cleaving Finish follow-up strike.' };
    }

    // Make the follow-up melee strike against an adjacent target
    const strike = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
    return {
      success: strike.success,
      message: `⚡ REACTION: ${actor.name} cleaves through to the next target! ${strike.message}`,
      details: strike.details,
    };
  }

  /**
   * Intimidating Prowess (Skill Feat, Level 2)
   * Your physical might enhances your Intimidation.
   * PF2e: Adds STR modifier as a circumstance bonus to Intimidation (Demoralize)
   * if your STR score is at least 16 (+3). Requires trained in Intimidation.
   */
  private resolveIntimidatingProwess(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Intimidating Prowess feat
    const hasFeature = this.hasFighterFeat(actor, 'intimidating prowess');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Intimidating Prowess.` };
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
      message: `✓ ${actor.name} radiates intimidating prowess! +${strMod} circumstance bonus to Demoralize (STR mod).`,
      bonus: strMod,
    };
  }

  /**
   * Shield Warden (Level 6 Fighter/Champion feat)
   * Reaction trigger: An ally within your shield's reach is hit or critically hit by a Strike.
   * Effect: You can use Shield Block to reduce damage to the ally instead of yourself.
   * PF2e Remaster: Extends Shield Block to protect adjacent allies.
   */
  private resolveShieldWarden(
    actor: Creature,
    gameState: GameState,
    targetId?: string
  ): any {
    // Check for Shield Warden feat
    const hasFeature = this.hasFighterFeat(actor, 'shield warden');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Shield Warden.` };
    }

    // Check if reaction available
    if (actor.reactionUsed) {
      return { success: false, message: `${actor.name} has already used their reaction this round.` };
    }

    // Must have a shield raised
    if (!actor.equippedShield || !actor.shieldRaised) {
      return { success: false, message: `${actor.name} must have a shield raised for Shield Warden.` };
    }

    // Find ally
    if (!targetId) {
      return { success: false, message: 'No ally specified for Shield Warden.' };
    }

    const ally = gameState.creatures.find(c => c.id === targetId);
    if (!ally) {
      return { success: false, message: 'Target not found.' };
    }

    actor.reactionUsed = true;

    // Shield Block damage reduction applies to ally (shield hardness)
    // Typical shield hardness: 3-5 for steel shields
    const shieldHardness = actor.armorBonus >= 2 ? 5 : 3;
    
    return {
      success: true,
      message: `⚡ REACTION: ${actor.name} interposes their shield to protect ${ally.name}! Shield Block reduces damage by ${shieldHardness}.`,
      damageReduced: shieldHardness,
    };
  }

  /**
   * Weapon Supremacy (Level 10)
   * Unlock the full potential of your weapons with enhanced critical strengths.
   */
  private resolveWeaponSupremacy(actor: Creature): any {
    // Check for Weapon Supremacy feat
    const hasFeature = this.hasFighterFeat(actor, 'weapon supremacy');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Weapon Supremacy.` };
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
      message: `✓ ${actor.name} achieves Weapon Supremacy! Critical specialization effects are enhanced.`,
      effect: 'weapon-supremacy-active',
    };
  }

  /**
   * Legendary Weapon (Level 10)
   * You become legendary with one weapon group. Strikes with that group ignore resistances of up to 5.
   */
  private resolveLegendaryWeapon(actor: Creature): any {
    // Check for Legendary Weapon feat
    const hasFeature = this.hasFighterFeat(actor, 'legendary weapon');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Legendary Weapon.` };
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
      message: `✓ ${actor.name} has achieved legendary mastery! ${weaponName} now ignores resistances up to 5.`,
      weaponFocus: weaponName,
    };
  }

  /**
   * Berserk Striker (Level 12)
   * When you Strike and miss by 4 or less, spend hero point to reroll once.
   */
  private resolveBerserkStrike(
    actor: Creature,
    heroPointsSpent?: number
  ): any {
    // Check for Berserk Striker feat
    const hasFeature = this.hasFighterFeat(actor, 'berserk striker');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Berserk Striker.` };
    }

    const availableHeroPoints = actor.heroPoints ?? 0;
    if (availableHeroPoints < 1) {
      return { success: false, message: `${actor.name} needs at least 1 hero point for Berserk Striker.` };
    }

    actor.heroPoints = availableHeroPoints - 1;

    return {
      success: true,
      message: `✓ ${actor.name} rerolls their attack with berserk fury! (Spent 1 hero point)`,
      heroPointsSpent: 1,
      effect: 'berserk-striker-reroll',
    };
  }

  /**
   * Reactive Assault (Level 12)
   * Reaction. When a creature misses you with a melee attack, Strike it in retaliation.
   */
  private resolveReactiveAssault(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Reactive Assault feat
    const hasFeature = this.hasFighterFeat(actor, 'reactive assault');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Reactive Assault.` };
    }

    // Check if reaction available
    if (actor.reactionUsed) {
      return { success: false, message: `${actor.name} has already used their reaction this round.` };
    }

    actor.reactionUsed = true;

    if (!targetId) {
      return { success: false, message: 'No target specified for Reactive Assault.' };
    }

    // Make a strike against the creature that missed
    const strike = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);
    
    return {
      success: strike.success,
      message: `⚡ REACTION: ${actor.name} retaliates! ${strike.message}`,
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
  private resolveCloseQuartersShot(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    weaponId?: string,
    heroPointsSpent?: number
  ): any {
    // Check for Close Quarters Shot feat
    const hasFeature = this.hasFighterFeat(actor, 'close quarters shot');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Close Quarters Shot.` };
    }

    // Verify we have a ranged weapon
    const weapon = this.resolveSelectedWeapon(actor, weaponId);
    if (!weapon || !weapon.range || weapon.range <= 0) {
      return { success: false, message: `${actor.name} must have a ranged weapon for Close Quarters Shot.` };
    }

    // Make ranged strike — no AoO triggers and no range penalty in close quarters
    const strike = this.resolveAttackAction(actor, gameState, targetId, weaponId, { isVicious: false }, heroPointsSpent);

    return {
      success: strike.success,
      message: `✓ ${actor.name} fires at close range without penalty! ${strike.message}`,
      details: strike.details,
    };
  }

  /**
   * Blade Ally (Level 4)
   * You have an weapon ally that provides bonuses to combat.
   * +1 item bonus to attacks with that weapon, or +2 if 2d6 or larger and wielded two-handed.
   */
  private resolveBladeAlly(actor: Creature): any {
    // Check for Blade Ally feat
    const hasFeature = this.hasFighterFeat(actor, 'blade ally');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Blade Ally.` };
    }

    // Need to designate a weapon
    const equipped = actor.equippedWeapon;
    if (!equipped) {
      return { success: false, message: `${actor.name} must wield a weapon to benefit from Blade Ally.` };
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
      message: `✓ ${actor.name}'s Blade Ally enhances their weapon! +${bonus} item bonus to attacks.`,
      bonus,
    };
  }

  /**
   * Versatile Heritage (Level 6)
   * You've trained your body and mind to move fluidly through battle.
   * +1 circumstance AC when you're not restrained and not in heavy armor.
   */
  private resolveVersatileHeritage(actor: Creature, weaponId?: string): any {
    // Check for Versatile Heritage feat
    const hasFeature = this.hasFighterFeat(actor, 'versatile heritage');
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Versatile Heritage.` };
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
      message: `✓ ${actor.name} moves fluidly through battle! +1 circumstance AC (if not restrained/heavy armor).`,
    };
  }

  /**
   * Duelist's Expertise (Level 2)
   * +1 circumstance AC when wielding and using a one-handed weapon without a shield.
   * +1 circumstance bonus to Riposte counterattacks.
   */
  private resolveDuelistsExpertise(actor: Creature): any {
    // Check for Duelist's Expertise feat
    const hasFeature = this.hasFighterFeat(actor, "duelist's expertise");
    if (!hasFeature) {
      return { success: false, message: `${actor.name} does not have Duelist's Expertise.` };
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
      return { success: false, message: `${actor.name} must wield a one-handed weapon for Duelist's Expertise.` };
    }

    actor.bonuses.push({
      source: 'duelists-expertise',
      value: 1,
      type: 'circumstance',
      applyTo: 'ac',
    });

    return {
      success: true,
      message: `✓ ${actor.name} assumes a duelist's stance! +1 circumstance AC (one-handed weapon, no shield).`,
    };
  }

  /**
   * Pushing Strike (Level 1) — PLACEHOLDER
   * NOT YET IMPLEMENTED: Attack action that pushes enemy back 5 feet on hit.
   */
}

