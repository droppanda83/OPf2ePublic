/**
 * tacticalAI.ts — Rule-based tactical AI for PF2e Remaster combat.
 * Works entirely without an API key, using actual game state and rules.
 * 
 * Decision priority (configurable by difficulty tier):
 * 1. Self-preservation (heal/retreat when critical)
 * 2. Spell evaluation (AoE, buffs, debuffs)
 * 3. Skill actions (Demoralize, Trip, Grapple)
 * 4. Strike (best weapon, targets, flanking)
 * 5. Movement (position for flank, close distance)
 * 6. Defensive actions (Raise Shield, Take Cover)
 */

import {
  Creature,
  GameState,
  Position,
  CombatAction,
  AITurnResponse,
  computeMovementCostMap,
  TerrainTile,
} from 'pf2e-shared';
import { getSpell, Spell, SPELL_CATALOG } from 'pf2e-shared';

// ─── Difficulty Tiers ────────────────────────────────────────────────

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'deadly';

interface DifficultyConfig {
  /** Use skill actions (Demoralize, Trip, etc.) */
  useSkillActions: boolean;
  /** Attempt flanking positioning */
  useFlankingPositioning: boolean;
  /** Focus fire on weakened targets */
  focusFire: boolean;
  /** Use spells intelligently */
  useSpells: boolean;
  /** Retreat when low HP */
  retreatWhenLow: boolean;
  /** Use Raise Shield / Take Cover */
  useDefensiveActions: boolean;
  /** Consider MAP when deciding # of attacks */
  respectMAP: boolean;
  /** Chance (0-1) of making a suboptimal choice */
  mistakeChance: number;
  /** Coordinate with allies (share targets) */
  coordinateWithAllies: boolean;
}

const DIFFICULTY_CONFIGS: Record<AIDifficulty, DifficultyConfig> = {
  easy: {
    useSkillActions: false,
    useFlankingPositioning: false,
    focusFire: false,
    useSpells: false,
    retreatWhenLow: false,
    useDefensiveActions: false,
    respectMAP: false,
    mistakeChance: 0.4,
    coordinateWithAllies: false,
  },
  normal: {
    useSkillActions: false,
    useFlankingPositioning: true,
    focusFire: true,
    useSpells: true,
    retreatWhenLow: false,
    useDefensiveActions: true,
    respectMAP: true,
    mistakeChance: 0.15,
    coordinateWithAllies: false,
  },
  hard: {
    useSkillActions: true,
    useFlankingPositioning: true,
    focusFire: true,
    useSpells: true,
    retreatWhenLow: true,
    useDefensiveActions: true,
    respectMAP: true,
    mistakeChance: 0.05,
    coordinateWithAllies: true,
  },
  deadly: {
    useSkillActions: true,
    useFlankingPositioning: true,
    focusFire: true,
    useSpells: true,
    retreatWhenLow: true,
    useDefensiveActions: true,
    respectMAP: true,
    mistakeChance: 0,
    coordinateWithAllies: true,
  },
};

// ─── Helper Types ────────────────────────────────────────────────────

interface TacticalAction {
  actionId: string;
  targetId?: string;
  targetPosition?: Position;
  weaponId?: string;
  spellId?: string;
  itemId?: string;
  score: number;       // Higher = better tactical choice
  reasoning: string;
  actionCost: number;  // 1, 2, or 3 actions
}

interface EnemyThreat {
  creature: Creature;
  distance: number;
  healthPercent: number;
  threatScore: number; // Higher = more dangerous
  isAdjacent: boolean;
  canFlank: boolean;   // Can we move to flank this target?
}

interface AllyInfo {
  creature: Creature;
  distance: number;
  healthPercent: number;
  isAdjacent: boolean;
}

// ─── Main Tactical AI ────────────────────────────────────────────────

export class TacticalAI {
  private difficulty: AIDifficulty;
  private config: DifficultyConfig;

  constructor(difficulty: AIDifficulty = 'normal') {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
  }

  /**
   * Decide a full turn's worth of actions (up to 3 actions).
   * Returns an array of CombatActions to execute sequentially.
   */
  decideTurn(gameState: GameState, creature: Creature): AITurnResponse[] {
    const actions: AITurnResponse[] = [];
    let actionsRemaining = creature.actionsRemaining ?? 3;
    let attacksMade = creature.attacksMadeThisTurn ?? 0;
    let shieldRaised = creature.shieldRaised ?? false;
    let flourishUsed = creature.flourishUsedThisTurn ?? false;

    // Build tactical context
    const enemies = this.getEnemies(gameState, creature);
    const allies = this.getAllies(gameState, creature);

    if (enemies.length === 0) {
      // No enemies — end turn
      actions.push(this.makeResponse(creature, 'end_turn', 'No enemies remaining.'));
      return actions;
    }

    // Simulate position (may change after move actions)
    let currentPos = { ...creature.positions };

    // Plan actions sequentially
    while (actionsRemaining > 0) {
      const context = {
        actionsRemaining,
        attacksMade,
        shieldRaised,
        flourishUsed,
        currentPos,
        enemies: this.refreshEnemyDistances(enemies, currentPos),
        allies,
      };

      const bestAction = this.evaluateBestAction(creature, gameState, context);

      if (!bestAction) {
        // No good action found — end turn
        break;
      }

      // Apply mistake chance (easy/normal difficulty makes suboptimal choices sometimes)
      const finalAction = this.applyMistakeChance(creature, gameState, context, bestAction);

      actions.push({
        action: {
          id: crypto.randomUUID(),
          creatureId: creature.id,
          actionId: finalAction.actionId,
          targetId: finalAction.targetId,
          targetPosition: finalAction.targetPosition,
          result: 'pending',
          details: {
            weaponId: finalAction.weaponId,
            spellId: finalAction.spellId,
            itemId: finalAction.itemId,
          },
        },
        reasoning: finalAction.reasoning,
      });

      // Update simulated state
      actionsRemaining -= finalAction.actionCost;

      if (finalAction.actionId === 'strike') {
        attacksMade++;
      } else if (finalAction.actionId === 'raise-shield') {
        shieldRaised = true;
      } else if (['stride', 'move'].includes(finalAction.actionId) && finalAction.targetPosition) {
        currentPos = { ...finalAction.targetPosition };
      } else if (['trip', 'shove', 'grapple', 'disarm'].includes(finalAction.actionId)) {
        attacksMade++; // These have the Attack trait
      }

      // Mark flourish used
      if (['vicious-swing', 'double-slice', 'intimidating-strike', 'knockdown', 'whirlwind-strike'].includes(finalAction.actionId)) {
        flourishUsed = true;
      }
    }

    // If no actions were chosen at all, end turn
    if (actions.length === 0) {
      actions.push(this.makeResponse(creature, 'end_turn', 'No viable actions available.'));
    }

    return actions;
  }

  /**
   * Legacy single-action API: decide one action at a time.
   */
  decideSingleAction(gameState: GameState, creature: Creature): AITurnResponse {
    const turnActions = this.decideTurn(gameState, creature);
    return turnActions[0];
  }

  // ─── Core Evaluation ────────────────────────────────────────────────

  private evaluateBestAction(
    creature: Creature,
    gameState: GameState,
    ctx: TurnContext
  ): TacticalAction | null {
    const candidates: TacticalAction[] = [];

    // 1. Self-preservation
    if (this.config.retreatWhenLow) {
      const healAction = this.evaluateHealing(creature, gameState, ctx);
      if (healAction) candidates.push(healAction);
    }

    // 2. Spell evaluation
    if (this.config.useSpells) {
      const spellActions = this.evaluateSpells(creature, gameState, ctx);
      candidates.push(...spellActions);
    }

    // 3. Skill actions (Demoralize doesn't use MAP)
    if (this.config.useSkillActions) {
      const skillActions = this.evaluateSkillActions(creature, gameState, ctx);
      candidates.push(...skillActions);
    }

    // 4. Strike
    const strikeActions = this.evaluateStrikes(creature, gameState, ctx);
    candidates.push(...strikeActions);

    // 5. Movement (toward enemies, flanking positions)
    const moveActions = this.evaluateMovement(creature, gameState, ctx);
    candidates.push(...moveActions);

    // 6. Defensive actions
    if (this.config.useDefensiveActions) {
      const defActions = this.evaluateDefensiveActions(creature, gameState, ctx);
      candidates.push(...defActions);
    }

    // Filter by action cost
    const affordable = candidates.filter(a => a.actionCost <= ctx.actionsRemaining);

    if (affordable.length === 0) return null;

    // Sort by score, pick best
    affordable.sort((a, b) => b.score - a.score);
    return affordable[0];
  }

  // ─── Strike Evaluation ────────────────────────────────────────────

  private evaluateStrikes(
    creature: Creature,
    _gameState: GameState,
    ctx: TurnContext
  ): TacticalAction[] {
    const actions: TacticalAction[] = [];
    const weapons = creature.weaponInventory || [];
    const adjacentEnemies = ctx.enemies.filter(e => e.isAdjacent);

    if (weapons.length === 0 && adjacentEnemies.length > 0) {
      // Unarmed attack fallback
      const target = this.pickTarget(ctx.enemies.filter(e => e.isAdjacent), ctx);
      if (target) {
        const mapPenalty = this.getMapPenalty(ctx.attacksMade, false);
        const score = 60 + (target.healthPercent < 0.25 ? 20 : 0) - Math.abs(mapPenalty) * 2;
        actions.push({
          actionId: 'strike',
          targetId: target.creature.id,
          score: Math.max(score, 5),
          reasoning: `Unarmed strike against ${target.creature.name}${mapPenalty ? ` (MAP ${mapPenalty})` : ''}.`,
          actionCost: 1,
        });
      }
      return actions;
    }

    for (const slot of weapons) {
      const weapon = slot.weapon;
      if (slot.state !== 'held') continue; // Only use held weapons
      const isMelee = weapon.attackType === 'melee';
      const isRanged = weapon.attackType === 'ranged';
      const isAgile = weapon.traits?.includes('agile') ?? false;
      const mapPenalty = this.getMapPenalty(ctx.attacksMade, isAgile);

      // Get valid targets for this weapon
      const validTargets = isMelee
        ? adjacentEnemies
        : ctx.enemies.filter(e => {
            const range = weapon.range || 6;
            return e.distance <= range;
          });

      if (validTargets.length === 0) continue;

      const target = this.pickTarget(validTargets, ctx);
      if (!target) continue;

      // Base score: strikes are good but diminish with MAP
      let score = 70;

      // MAP considerations
      if (this.config.respectMAP) {
        if (ctx.attacksMade === 0) {
          score += 15; // First attack is very good
        } else if (ctx.attacksMade === 1) {
          score -= 10; // Second attack is okay
          if (isAgile) score += 5; // Agile weapons are better for 2nd attack
        } else {
          score -= 30; // Third+ attack is usually bad
          if (isAgile) score += 5;
        }
      }

      // Focus fire bonus
      if (this.config.focusFire && target.healthPercent < 0.5) {
        score += 15;
      }
      if (this.config.focusFire && target.healthPercent < 0.25) {
        score += 10; // Even more bonus for nearly-dead enemies
      }

      // Ranged attacks while not adjacent avoid reactions
      if (isRanged && adjacentEnemies.length === 0) {
        score += 5;
      }

      // Ranged attacks while adjacent are risky (provoke reactive strike potential)
      if (isRanged && adjacentEnemies.length > 0) {
        // Check if any adjacent enemies have Reactive Strike
        const hasReactiveEnemy = adjacentEnemies.some(e =>
          e.creature.specials?.includes('Reactive Strike')
        );
        if (hasReactiveEnemy) {
          score -= 25;
        }
      }

      actions.push({
        actionId: 'strike',
        targetId: target.creature.id,
        weaponId: weapon.id,
        score: Math.max(score, 1),
        reasoning: `Strike ${target.creature.name} with ${weapon.display}${mapPenalty ? ` (MAP ${mapPenalty})` : ''}.`,
        actionCost: 1,
      });
    }

    return actions;
  }

  // ─── Movement Evaluation ────────────────────────────────────────

  private evaluateMovement(
    creature: Creature,
    gameState: GameState,
    ctx: TurnContext
  ): TacticalAction[] {
    const actions: TacticalAction[] = [];
    const adjacentEnemies = ctx.enemies.filter(e => e.isAdjacent);

    // If already adjacent to target and has melee weapon, movement is less useful
    const hasMeleeWeapon = (creature.weaponInventory || []).some(w => w.weapon.attackType === 'melee');
    const hasRangedWeapon = (creature.weaponInventory || []).some(w => w.weapon.attackType === 'ranged');

    // Check if ANY ranged weapon can reach the nearest enemy
    const bestRangedRange = Math.max(0, ...(creature.weaponInventory || [])
      .filter(w => w.weapon.attackType === 'ranged' && w.state === 'held')
      .map(w => w.weapon.range || 6));
    const nearestEnemy = ctx.enemies.length > 0
      ? ctx.enemies.reduce((min, e) => e.distance < min.distance ? e : min, ctx.enemies[0])
      : null;
    const canReachWithRanged = nearestEnemy && hasRangedWeapon && nearestEnemy.distance <= bestRangedRange;

    // Move toward nearest enemy if not adjacent (melee creature or ANY creature with no valid attack)
    const needsToApproach = adjacentEnemies.length === 0 && (
      hasMeleeWeapon ||                                    // Standard melee approach
      (!canReachWithRanged && nearestEnemy)                 // Ranged creature with no enemies in range
    );

    if (needsToApproach && nearestEnemy) {
      const target = this.pickTarget(ctx.enemies, ctx);
      if (target) {
        const movePos = this.computeMoveToward(ctx.currentPos, target.creature.positions, creature.speed, gameState);
        if (movePos) {
          const newDist = this.manhattanDistance(movePos, target.creature.positions);
          const willBeAdjacent = newDist <= 1;
          let score = 55;

          // Higher score if this will let us strike next action
          if (willBeAdjacent && hasMeleeWeapon) score += 20;

          // For ranged creatures approaching, score based on getting into range
          if (!hasMeleeWeapon && hasRangedWeapon) {
            const willBeInRange = newDist <= bestRangedRange;
            score = willBeInRange ? 75 : 60; // High priority if we'll be in range
          }

          // If we haven't attacked yet, moving first is fine
          if (ctx.attacksMade === 0) score += 5;

          actions.push({
            actionId: 'stride',
            targetPosition: movePos,
            score,
            reasoning: `Stride toward ${target.creature.name} (${target.distance} squares away).`,
            actionCost: 1,
          });
        }
      }
    }

    // Flanking move: if we have an ally adjacent to an enemy, move to flank
    if (this.config.useFlankingPositioning && adjacentEnemies.length === 0 && hasMeleeWeapon) {
      const flankPos = this.findFlankingPosition(creature, ctx, gameState);
      if (flankPos) {
        actions.push({
          actionId: 'stride',
          targetPosition: flankPos.position,
          score: 80, // Flanking is very valuable (+2 to attack via off-guard)
          reasoning: `Move to flank ${flankPos.targetName} with ally.`,
          actionCost: 1,
        });
      }
    }

    // Retreat: if low HP and adjacent to enemy, step away
    if (this.config.retreatWhenLow && adjacentEnemies.length > 0) {
      const hpPercent = creature.currentHealth / creature.maxHealth;
      if (hpPercent < 0.25 && hasRangedWeapon) {
        const retreatPos = this.computeRetreatPosition(ctx.currentPos, adjacentEnemies, gameState);
        if (retreatPos) {
          actions.push({
            actionId: 'step',
            targetPosition: retreatPos,
            score: 85,
            reasoning: `Step away from melee (${Math.round(hpPercent * 100)}% HP) to use ranged attacks.`,
            actionCost: 1,
          });
        }
      }
    }

    // If only ranged and too close, step back
    if (hasRangedWeapon && !hasMeleeWeapon && adjacentEnemies.length > 0) {
      const retreatPos = this.computeRetreatPosition(ctx.currentPos, adjacentEnemies, gameState);
      if (retreatPos) {
        actions.push({
          actionId: 'step',
          targetPosition: retreatPos,
          score: 70,
          reasoning: 'Step away from melee to avoid penalties on ranged attacks.',
          actionCost: 1,
        });
      }
    }

    return actions;
  }

  // ─── Skill Action Evaluation ────────────────────────────────────

  private evaluateSkillActions(
    creature: Creature,
    _gameState: GameState,
    ctx: TurnContext
  ): TacticalAction[] {
    const actions: TacticalAction[] = [];
    const skills = creature.skills || [];
    const adjacentEnemies = ctx.enemies.filter(e => e.isAdjacent);

    // Demoralize — doesn't have Attack trait (no MAP), excellent for 3rd action
    const intimidation = skills.find(s => s.name.toLowerCase() === 'intimidation');
    if (intimidation && ctx.enemies.length > 0) {
      // Demoralize works at 6 squares range
      const demoTargets = ctx.enemies.filter(e => e.distance <= 6);
      for (const target of demoTargets) {
        // Don't demoralize already-frightened targets
        const alreadyFrightened = target.creature.conditions?.some(c => c.name === 'frightened');
        if (alreadyFrightened) continue;

        let score = 40;
        // Demoralize is excellent as the last action since no MAP
        if (ctx.attacksMade >= 2) score += 30;
        if (ctx.attacksMade >= 1) score += 15;
        // Higher score against high-threat targets
        if (target.threatScore > 5) score += 10;

        actions.push({
          actionId: 'demoralize',
          targetId: target.creature.id,
          score,
          reasoning: `Demoralize ${target.creature.name} (no MAP penalty, frightened reduces their attacks/DCs).`,
          actionCost: 1,
        });
      }
    }

    // Trip — has Attack trait (uses MAP), but very strong (prone = off-guard + costs action to stand)
    const athletics = skills.find(s => s.name.toLowerCase() === 'athletics');
    if (athletics && adjacentEnemies.length > 0) {
      for (const target of adjacentEnemies) {
        const alreadyProne = target.creature.conditions?.some(c => c.name === 'prone');
        if (alreadyProne) continue;

        const mapPenalty = this.getMapPenalty(ctx.attacksMade, false);
        let score = 50 - Math.abs(mapPenalty) * 2;
        // Trip is better early in turn (before MAP stacks)
        if (ctx.attacksMade === 0) score += 15;
        // Good against enemies with low Reflex
        score += 5;

        actions.push({
          actionId: 'trip',
          targetId: target.creature.id,
          score: Math.max(score, 5),
          reasoning: `Trip ${target.creature.name} (prone = off-guard, costs them an action to stand).`,
          actionCost: 1,
        });
      }
    }

    // Grapple — has Attack trait, immobilizes + off-guard
    if (athletics && adjacentEnemies.length > 0) {
      for (const target of adjacentEnemies) {
        const alreadyGrabbed = target.creature.conditions?.some(
          c => c.name === 'grabbed' || c.name === 'restrained'
        );
        if (alreadyGrabbed) continue;

        const mapPenalty = this.getMapPenalty(ctx.attacksMade, false);
        let score = 45 - Math.abs(mapPenalty) * 2;
        if (ctx.attacksMade === 0) score += 10;
        // Good against ranged/caster enemies
        if (target.creature.weaponInventory?.some(w => w.weapon.attackType === 'ranged') ||
            target.creature.spellcasters?.length) {
          score += 15;
        }

        actions.push({
          actionId: 'grapple',
          targetId: target.creature.id,
          score: Math.max(score, 5),
          reasoning: `Grapple ${target.creature.name} (immobilized + off-guard).`,
          actionCost: 1,
        });
      }
    }

    // Shove — push enemy out of position, Attack trait
    if (athletics && adjacentEnemies.length > 0) {
      for (const target of adjacentEnemies) {
        const mapPenalty = this.getMapPenalty(ctx.attacksMade, false);
        let score = 30 - Math.abs(mapPenalty) * 2;
        // Shove is less valuable than Trip/Grapple
        // But good to push toward hazards or off edges
        if (ctx.attacksMade === 0) score += 5;

        actions.push({
          actionId: 'shove',
          targetId: target.creature.id,
          score: Math.max(score, 1),
          reasoning: `Shove ${target.creature.name} out of position.`,
          actionCost: 1,
        });
      }
    }

    return actions;
  }

  // ─── Spell Evaluation ────────────────────────────────────────────

  private evaluateSpells(
    creature: Creature,
    _gameState: GameState,
    ctx: TurnContext
  ): TacticalAction[] {
    const actions: TacticalAction[] = [];
    const casterData = creature.spellcasters;
    if (!casterData || casterData.length === 0) return actions;

    // Get available spells
    const availableSpells = this.getAvailableSpells(creature);

    for (const spellEntry of availableSpells) {
      const spell = spellEntry.spell;
      if (!spell) continue;
      if (spell.cost > ctx.actionsRemaining) continue;

      // Evaluate based on spell type
      if (spell.damageFormula && spell.targetType === 'aoe') {
        // AoE damage spell — score based on enemies in area
        const clusteredEnemies = this.countEnemiesInAoE(ctx.enemies, ctx.currentPos, spell);
        if (clusteredEnemies >= 2) {
          const score = 75 + (clusteredEnemies * 10);
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            score,
            reasoning: `Cast ${spell.name} (AoE hitting ${clusteredEnemies} enemies).`,
            actionCost: spell.cost,
          });
        } else if (clusteredEnemies === 1) {
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            targetId: ctx.enemies[0]?.creature.id,
            score: 35,
            reasoning: `Cast ${spell.name} on single target (AoE wasted).`,
            actionCost: spell.cost,
          });
        }
      } else if (spell.damageFormula && spell.targetType === 'single') {
        // Single target damage spell
        const target = this.pickTarget(ctx.enemies.filter(e => e.distance <= spell.range), ctx);
        if (target) {
          let score = 55;
          // Cantrips are decent filler (free resource)
          if (spell.rank === 0) score = 45;
          // Higher rank spells are more valuable
          score += spell.rank * 5;
          // Spells don't have MAP — good after strikes
          if (ctx.attacksMade >= 1) score += 10;

          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            targetId: target.creature.id,
            score,
            reasoning: `Cast ${spell.name} on ${target.creature.name} (${spell.damageFormula} ${spell.damageType || ''}).`,
            actionCost: spell.cost,
          });
        }
      } else if (spell.id === 'heal') {
        // Healing spell — evaluate based on party HP
        const woundedAllies = ctx.allies.filter(a => a.healthPercent < 0.5);
        const selfWounded = creature.currentHealth / creature.maxHealth < 0.5;
        if (selfWounded || woundedAllies.length > 0) {
          const target = selfWounded
            ? { creature, distance: 0, healthPercent: creature.currentHealth / creature.maxHealth }
            : woundedAllies.sort((a, b) => a.healthPercent - b.healthPercent)[0];
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            targetId: target.creature.id,
            score: 80 - target.healthPercent * 40, // Lower HP = higher priority
            reasoning: `Cast Heal on ${target.creature.name} (${Math.round(target.healthPercent * 100)}% HP).`,
            actionCost: spell.cost,
          });
        }
      } else if (spell.id === 'fear') {
        // Debuff: Fear causes frightened
        const target = this.pickTarget(ctx.enemies.filter(e => e.distance <= spell.range), ctx);
        if (target && !target.creature.conditions?.some(c => c.name === 'frightened')) {
          let score = 55;
          if (target.threatScore > 5) score += 10;
          if (ctx.attacksMade >= 1) score += 10; // No MAP
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            targetId: target.creature.id,
            score,
            reasoning: `Cast Fear on ${target.creature.name} (frightened penalty).`,
            actionCost: spell.cost,
          });
        }
      } else if (spell.id === 'slow') {
        // Debuff: Slow reduces actions
        const target = this.pickTarget(ctx.enemies.filter(e => e.distance <= spell.range), ctx);
        if (target && !target.creature.conditions?.some(c => c.name === 'slowed')) {
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            targetId: target.creature.id,
            score: 70,
            reasoning: `Cast Slow on ${target.creature.name} (reduces their actions).`,
            actionCost: spell.cost,
          });
        }
      } else if (spell.id === 'haste') {
        // Buff: Haste gives quickened
        const bestAlly = ctx.allies
          .filter(a => !a.creature.conditions?.some(c => c.name === 'quickened'))
          .sort((a, b) => b.creature.level - a.creature.level)[0];
        if (bestAlly && bestAlly.distance <= spell.range) {
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            targetId: bestAlly.creature.id,
            score: 65,
            reasoning: `Cast Haste on ${bestAlly.creature.name} (extra action).`,
            actionCost: spell.cost,
          });
        }
      } else if (spell.id === 'shield') {
        // Shield cantrip: +1 AC
        if (!creature.equippedShield && !creature.conditions?.some(c => c.name === 'shield-spell')) {
          let score = 30;
          // Better as last action
          if (ctx.actionsRemaining === 1) score += 15;
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            score,
            reasoning: 'Cast Shield (+1 AC for the round).',
            actionCost: spell.cost,
          });
        }
      } else if (spell.id === 'true-strike') {
        // True Strike before a big attack
        if (ctx.attacksMade === 0 && ctx.actionsRemaining >= 2) {
          actions.push({
            actionId: spell.id,
            spellId: spell.id,
            score: 60,
            reasoning: 'Cast True Strike (roll twice, keep higher on next attack).',
            actionCost: spell.cost,
          });
        }
      }
    }

    return actions;
  }

  // ─── Healing / Self-Preservation ────────────────────────────────

  private evaluateHealing(
    creature: Creature,
    _gameState: GameState,
    ctx: TurnContext
  ): TacticalAction | null {
    const hpPercent = creature.currentHealth / creature.maxHealth;
    if (hpPercent >= 0.5) return null;

    // Check for healing spells
    const healSpell = this.getAvailableSpells(creature).find(s => s.spell.id === 'heal');
    if (healSpell && hpPercent < 0.3) {
      return {
        actionId: 'heal',
        spellId: 'heal',
        targetId: creature.id,
        score: 90,
        reasoning: `Self-heal (${Math.round(hpPercent * 100)}% HP remaining).`,
        actionCost: healSpell.spell.cost,
      };
    }

    // Check for healing potions
    const healingPotion = creature.consumables?.find(c =>
      c.id.includes('healing') && c.quantity > 0
    );
    if (healingPotion && hpPercent < 0.25) {
      return {
        actionId: 'use-item',
        itemId: healingPotion.id,
        targetId: creature.id,
        score: 85,
        reasoning: `Use healing potion (${Math.round(hpPercent * 100)}% HP remaining).`,
        actionCost: 1,
      };
    }

    return null;
  }

  // ─── Defensive Action Evaluation ────────────────────────────────

  private evaluateDefensiveActions(
    creature: Creature,
    _gameState: GameState,
    ctx: TurnContext
  ): TacticalAction[] {
    const actions: TacticalAction[] = [];

    // Raise Shield — best as last action after attacking
    if (creature.equippedShield && !ctx.shieldRaised) {
      let score = 25;
      // Much better as the last action
      if (ctx.actionsRemaining === 1) score += 35;
      if (ctx.attacksMade >= 2) score += 20;
      // Better when adjacent to enemies
      if (ctx.enemies.some(e => e.isAdjacent)) score += 15;

      actions.push({
        actionId: 'raise-shield',
        score,
        reasoning: 'Raise Shield (+2 AC, enables Shield Block reaction).',
        actionCost: 1,
      });
    }

    // Take Cover — if behind cover
    if (ctx.actionsRemaining === 1 && ctx.attacksMade >= 2) {
      actions.push({
        actionId: 'take-cover',
        score: 20,
        reasoning: 'Take Cover for +2 circumstance AC.',
        actionCost: 1,
      });
    }

    return actions;
  }

  // ─── Target Selection ──────────────────────────────────────────

  private pickTarget(
    candidates: EnemyThreat[],
    ctx: TurnContext
  ): EnemyThreat | null {
    if (candidates.length === 0) return null;

    if (this.config.focusFire) {
      // Focus fire: prioritize low HP targets
      const sorted = [...candidates].sort((a, b) => {
        // Heavily prioritize nearly-dead enemies
        if (a.healthPercent < 0.25 && b.healthPercent >= 0.25) return -1;
        if (b.healthPercent < 0.25 && a.healthPercent >= 0.25) return 1;
        // Then by health percent
        if (Math.abs(a.healthPercent - b.healthPercent) > 0.2) {
          return a.healthPercent - b.healthPercent;
        }
        // Then by threat score
        return b.threatScore - a.threatScore;
      });
      return sorted[0];
    }

    if (this.config.coordinateWithAllies) {
      // Coordinate: focus on highest threat
      const sorted = [...candidates].sort((a, b) => b.threatScore - a.threatScore);
      return sorted[0];
    }

    // Default: nearest enemy
    const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
    return sorted[0];
  }

  // ─── Flanking Geometry ──────────────────────────────────────────

  private findFlankingPosition(
    creature: Creature,
    ctx: TurnContext,
    gameState: GameState
  ): { position: Position; targetName: string } | null {
    const speed = creature.speed || 25;
    const maxSquares = Math.floor(speed / 5);

    for (const ally of ctx.allies) {
      if (!ally.isAdjacent) continue; // Ally must be adjacent to an enemy

      // Which enemy is the ally adjacent to?
      for (const enemy of ctx.enemies) {
        const allyToEnemy = this.manhattanDistance(ally.creature.positions, enemy.creature.positions);
        if (allyToEnemy > 1) continue; // Ally not adjacent to this enemy

        // Find opposite side of enemy from ally
        const oppositeX = enemy.creature.positions.x * 2 - ally.creature.positions.x;
        const oppositeY = enemy.creature.positions.y * 2 - ally.creature.positions.y;

        // Check if we can reach that position
        const distToOpposite = this.manhattanDistance(ctx.currentPos, { x: oppositeX, y: oppositeY });
        const flankTerrain = gameState.map?.terrain;
        const flankTile = flankTerrain?.[oppositeY]?.[oppositeX];
        const flankPassable = !flankTile || flankTile.type !== 'impassable';
        if (distToOpposite <= maxSquares && flankPassable && this.isValidPosition({ x: oppositeX, y: oppositeY }, gameState) && !this.isOccupied({ x: oppositeX, y: oppositeY }, gameState)) {
          // Verify dot product confirms flanking
          const toUs = { x: oppositeX - enemy.creature.positions.x, y: oppositeY - enemy.creature.positions.y };
          const toAlly = { x: ally.creature.positions.x - enemy.creature.positions.x, y: ally.creature.positions.y - enemy.creature.positions.y };
          if (toUs.x * toAlly.x + toUs.y * toAlly.y < 0) {
            return {
              position: { x: oppositeX, y: oppositeY },
              targetName: enemy.creature.name,
            };
          }
        }
      }
    }

    return null;
  }

  // ─── Movement Helpers ──────────────────────────────────────────

  /**
   * Compute the best reachable position that moves toward a target,
   * using Dijkstra pathfinding through actual terrain.
   */
  private computeMoveToward(
    from: Position,
    to: Position,
    speed: number,
    gameState: GameState
  ): Position | null {
    const maxSquares = Math.floor(speed / 5);
    if (maxSquares <= 0) return null;

    const terrainGrid = gameState.map?.terrain;

    // Build occupied set (exclude self)
    const occupied = new Set<string>(
      gameState.creatures
        .filter(c => c.currentHealth > 0 && !c.dead && !(c.positions.x === from.x && c.positions.y === from.y))
        .map(c => `${c.positions.x},${c.positions.y}`)
    );

    // If we have terrain data, use Dijkstra flood-fill for accurate reachable squares
    if (terrainGrid && terrainGrid.length > 0) {
      const result = computeMovementCostMap(from, terrainGrid, {
        maxDistance: maxSquares,
        occupiedPositions: occupied,
      });

      // Find reachable position closest to target (but not ON the target)
      let bestPos: Position | null = null;
      let bestDist = Infinity;

      for (const [key, cost] of result.costMap.entries()) {
        if (cost <= 0 || cost > maxSquares) continue; // Skip origin and over-budget
        const [xStr, yStr] = key.split(',');
        const px = parseInt(xStr, 10);
        const py = parseInt(yStr, 10);
        if (occupied.has(key)) continue; // Skip occupied squares

        // Don't move ON TOP of the target
        if (px === to.x && py === to.y) continue;

        const distToGoal = Math.abs(px - to.x) + Math.abs(py - to.y);
        if (distToGoal < bestDist) {
          bestDist = distToGoal;
          bestPos = { x: px, y: py };
        }
      }

      return bestPos;
    }

    // Fallback: simple math if no terrain grid (shouldn't happen)
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let moveX = Math.sign(dx) * Math.min(Math.abs(dx), maxSquares);
    let moveY = Math.sign(dy) * Math.min(Math.abs(dy), Math.max(0, maxSquares - Math.abs(moveX)));

    const newPos = { x: from.x + moveX, y: from.y + moveY };
    if (newPos.x === to.x && newPos.y === to.y) {
      if (Math.abs(moveX) > Math.abs(moveY)) { moveX -= Math.sign(moveX); }
      else { moveY -= Math.sign(moveY); }
    }

    const finalPos = { x: from.x + moveX, y: from.y + moveY };
    if (finalPos.x === from.x && finalPos.y === from.y) return null;
    if (!this.isValidPosition(finalPos, gameState)) return null;
    if (occupied.has(`${finalPos.x},${finalPos.y}`)) return null;

    return finalPos;
  }

  private computeRetreatPosition(
    from: Position,
    adjacentEnemies: EnemyThreat[],
    gameState: GameState
  ): Position | null {
    // Step action = 1 square in any direction
    const directions = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 1 }, { x: 1, y: 1 },
    ];

    let bestPos: Position | null = null;
    let bestMinDist = 0;

    const terrainGrid = gameState.map?.terrain;

    for (const dir of directions) {
      const pos = { x: from.x + dir.x, y: from.y + dir.y };
      if (!this.isValidPosition(pos, gameState)) continue;

      // Check terrain passability
      if (terrainGrid) {
        const tile = terrainGrid[pos.y]?.[pos.x];
        if (tile && tile.type === 'impassable') continue;
      }

      // Check if this position is occupied by any creature
      const occupied = this.isOccupied(pos, gameState);
      if (occupied) continue;

      // Calculate minimum distance to any adjacent enemy
      const minDist = Math.min(...adjacentEnemies.map(e =>
        this.manhattanDistance(pos, e.creature.positions)
      ));

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestPos = pos;
      }
    }

    return bestPos;
  }

  // ─── Spell Helpers ──────────────────────────────────────────────

  private getAvailableSpells(creature: Creature): { spell: Spell; rank: number }[] {
    const available: { spell: Spell; rank: number }[] = [];
    const casterData = creature.spellcasters;
    if (!casterData || casterData.length === 0) return available;

    // Get focus spells
    if (creature.focusSpells) {
      for (const fs of creature.focusSpells) {
        if (creature.focusPoints && creature.focusPoints > 0) {
          const spell = getSpell(fs.name.toLowerCase().replace(/\s+/g, '-'));
          if (spell) {
            available.push({ spell, rank: fs.level });
          }
        }
      }
    }

    // Get spells from each spellcaster tradition
    for (const spellcaster of casterData) {
      // Iterate through creature's actual known spells
      for (const castableSpell of spellcaster.spells) {
        const spellId = castableSpell.name.toLowerCase().replace(/\s+/g, '-');
        const spell = getSpell(spellId);
        
        if (!spell) {
          console.warn(`AI: Spell "${castableSpell.name}" not found in SPELL_CATALOG`);
          continue;
        }

        // For innate spells, check usage limits
        if (spellcaster.castingType === 'innate') {
          // TODO: Track innate spell usage per creature
          // For now, assume all innate spells are available
          available.push({ spell, rank: castableSpell.level });
          continue;
        }

        // For prepared/spontaneous spells, check slot availability
        const spellRank = castableSpell.level;
        
        // Cantrips are always available
        if (spellRank === 0) {
          available.push({ spell, rank: 0 });
          continue;
        }

        // Check if slots are available at this spell rank
        const slotInfo = spellcaster.slots.find(s => s.level === spellRank);
        if (slotInfo && slotInfo.available > 0) {
          available.push({ spell, rank: spellRank });
        }
      }
    }

    return available;
  }

  private countEnemiesInAoE(
    enemies: EnemyThreat[],
    casterPos: Position,
    spell: Spell
  ): number {
    if (spell.targetType !== 'aoe' || !spell.aoeRadius) return 0;

    // For burst/emanation, find the position that hits the most enemies
    // Simplified: count enemies within aoeRadius of the center of the cluster
    if (enemies.length === 0) return 0;

    // Find center of enemy cluster (within spell range)
    const inRange = enemies.filter(e => e.distance <= spell.range);
    if (inRange.length === 0) return 0;

    // For each enemy position, count how many other enemies are within aoeRadius
    let bestCount = 0;
    for (const center of inRange) {
      let count = 0;
      for (const other of inRange) {
        const dist = this.manhattanDistance(center.creature.positions, other.creature.positions);
        if (dist <= (spell.aoeRadius || 0)) count++;
      }
      bestCount = Math.max(bestCount, count);
    }

    return bestCount;
  }

  // ─── Mistake / Suboptimal Decisions ──────────────────────────────

  private applyMistakeChance(
    creature: Creature,
    gameState: GameState,
    ctx: TurnContext,
    bestAction: TacticalAction
  ): TacticalAction {
    if (this.config.mistakeChance <= 0) return bestAction;
    if (Math.random() >= this.config.mistakeChance) return bestAction;

    // Make a suboptimal choice: pick a random valid action
    const allCandidates: TacticalAction[] = [];

    // Simple fallback actions
    const adjacentEnemies = ctx.enemies.filter(e => e.isAdjacent);
    if (adjacentEnemies.length > 0) {
      // Random strike at random adjacent enemy
      const randomEnemy = adjacentEnemies[Math.floor(Math.random() * adjacentEnemies.length)];
      allCandidates.push({
        actionId: 'strike',
        targetId: randomEnemy.creature.id,
        score: 1,
        reasoning: `Attacking ${randomEnemy.creature.name} (suboptimal choice).`,
        actionCost: 1,
      });
    } else {
      // Move toward random enemy
      const randomEnemy = ctx.enemies[Math.floor(Math.random() * ctx.enemies.length)];
      const movePos = this.computeMoveToward(ctx.currentPos, randomEnemy.creature.positions, creature.speed, gameState);
      if (movePos) {
        allCandidates.push({
          actionId: 'stride',
          targetPosition: movePos,
          score: 1,
          reasoning: `Moving toward ${randomEnemy.creature.name} (suboptimal choice).`,
          actionCost: 1,
        });
      }
    }

    if (allCandidates.length > 0) {
      return allCandidates[Math.floor(Math.random() * allCandidates.length)];
    }

    return bestAction;
  }

  // ─── Utility Functions ──────────────────────────────────────────

  private getEnemies(gameState: GameState, creature: Creature): EnemyThreat[] {
    return gameState.creatures
      .filter(c =>
        c.id !== creature.id &&
        c.type !== creature.type &&
        c.currentHealth > 0 &&
        !c.dead
      )
      .map(c => {
        const dist = this.manhattanDistance(creature.positions, c.positions);
        const hpPercent = c.currentHealth / c.maxHealth;

        // Threat score: higher level = more threatening, higher damage potential
        let threat = c.level;
        if (c.weaponInventory && c.weaponInventory.length > 0) {
          // Estimate damage output from best weapon
          const bestDmg = Math.max(...c.weaponInventory.map(w => {
            const match = w.weapon.damageDice?.match(/(\d+)d(\d+)/);
            return match ? parseInt(match[1]) * parseInt(match[2]) / 2 : 3;
          }));
          threat += bestDmg / 5;
        }
        if (c.spellcasters && c.spellcasters.length > 0) threat += 2;

        return {
          creature: c,
          distance: dist,
          healthPercent: hpPercent,
          threatScore: threat,
          isAdjacent: dist <= 1,
          canFlank: false, // Computed later
        };
      });
  }

  private getAllies(gameState: GameState, creature: Creature): AllyInfo[] {
    return gameState.creatures
      .filter(c =>
        c.id !== creature.id &&
        c.type === creature.type &&
        c.currentHealth > 0 &&
        !c.dead
      )
      .map(c => ({
        creature: c,
        distance: this.manhattanDistance(creature.positions, c.positions),
        healthPercent: c.currentHealth / c.maxHealth,
        isAdjacent: this.manhattanDistance(creature.positions, c.positions) <= 1,
      }));
  }

  private refreshEnemyDistances(enemies: EnemyThreat[], currentPos: Position): EnemyThreat[] {
    return enemies.map(e => ({
      ...e,
      distance: this.manhattanDistance(currentPos, e.creature.positions),
      isAdjacent: this.manhattanDistance(currentPos, e.creature.positions) <= 1,
    }));
  }

  private manhattanDistance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getMapPenalty(attacksMade: number, agile: boolean): number {
    if (attacksMade === 0) return 0;
    if (attacksMade === 1) return agile ? -4 : -5;
    return agile ? -8 : -10;
  }

  private isValidPosition(pos: Position, gameState: GameState): boolean {
    return pos.x >= 0 && pos.y >= 0 &&
           pos.x < gameState.map.width && pos.y < gameState.map.height;
  }

  private isOccupied(pos: Position, gameState: GameState): boolean {
    return gameState.creatures.some(c =>
      c.currentHealth > 0 && !c.dead &&
      c.positions.x === pos.x && c.positions.y === pos.y
    );
  }

  private makeResponse(creature: Creature, actionId: string, reasoning: string): AITurnResponse {
    return {
      action: {
        id: crypto.randomUUID(),
        creatureId: creature.id,
        actionId,
        result: 'pending',
      },
      reasoning,
    };
  }
}

// Context type for passing turn state
interface TurnContext {
  actionsRemaining: number;
  attacksMade: number;
  shieldRaised: boolean;
  flourishUsed: boolean;
  currentPos: Position;
  enemies: EnemyThreat[];
  allies: AllyInfo[];
}
