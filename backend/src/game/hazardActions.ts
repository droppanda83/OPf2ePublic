// ═══════════════════════════════════════════════════════════
// hazardActions.ts — Hazard runtime resolution
// Phase 24: Environmental Hazards & Traps System
// ═══════════════════════════════════════════════════════════

import {
  Creature,
  GameState,
  rollD20,
  rollDamageFormula,
  calculateFinalDamage,
  getDegreeOfSuccess,
  calculateSaveBonus,
  DegreeOfSuccess,
} from 'pf2e-shared';

import {
  Hazard,
  HazardInstance,
  HazardEffect,
  HazardTargetResult,
  HazardTriggerResult,
  DetectionResult,
  DisableResult,
  HazardTurnResult,
  DisableOption,
  getHazard,
} from 'pf2e-shared/hazards';

import { debugLog } from './logger';

// ─── Detection ──────────────────────────────────────────

/**
 * A creature attempts to detect a hazard via Perception.
 * PF2e: Perception check vs hazard Stealth DC.
 */
export function detectHazard(
  actor: Creature,
  instance: HazardInstance,
): DetectionResult {
  const hazard = getHazard(instance.hazardId);
  if (!hazard) {
    return {
      hazardId: instance.hazardId,
      hazardName: 'Unknown',
      detected: false,
      creatureId: actor.id,
      perceptionRoll: 0,
      perceptionTotal: 0,
      stealthDC: 0,
      message: `Hazard ${instance.hazardId} not found in catalog.`,
    };
  }

  // Already detected by this creature
  if (instance.detectedBy.includes(actor.id) || instance.detectedBy.includes('all')) {
    return {
      hazardId: instance.hazardId,
      hazardName: hazard.name,
      detected: true,
      creatureId: actor.id,
      perceptionRoll: 0,
      perceptionTotal: 0,
      stealthDC: hazard.stealthDC,
      message: `${actor.name} already knows about the ${hazard.name}.`,
    };
  }

  // Obviously visible hazards (stealthDC 0) — e.g., lava
  if (hazard.stealthDC === 0) {
    instance.detected = true;
    instance.detectedBy.push(actor.id);
    return {
      hazardId: instance.hazardId,
      hazardName: hazard.name,
      detected: true,
      creatureId: actor.id,
      perceptionRoll: 20,
      perceptionTotal: 20,
      stealthDC: 0,
      message: `${actor.name} can clearly see the ${hazard.name}.`,
    };
  }

  // Roll Perception against hazard Stealth DC
  const d20 = rollD20();
  const perceptionMod = actor.perception ?? 0;
  const total = d20 + perceptionMod;
  const detected = total >= hazard.stealthDC;

  if (detected) {
    instance.detectedBy.push(actor.id);
    // Mark globally detected if all living creatures have detected it
    if (!instance.detected) {
      instance.detected = true; // At least one creature detected it
    }
  }

  debugLog('[HAZARD] Detection attempt', {
    creature: actor.name,
    hazard: hazard.name,
    d20,
    perceptionMod,
    total,
    stealthDC: hazard.stealthDC,
    detected,
  });

  return {
    hazardId: instance.hazardId,
    hazardName: hazard.name,
    detected,
    creatureId: actor.id,
    perceptionRoll: d20,
    perceptionTotal: total,
    stealthDC: hazard.stealthDC,
    message: detected
      ? `${actor.name} notices the ${hazard.name}! (Perception ${d20}+${perceptionMod}=${total} vs DC ${hazard.stealthDC})`
      : `${actor.name} doesn't notice anything unusual. (Perception ${d20}+${perceptionMod}=${total} vs DC ${hazard.stealthDC})`,
  };
}

// ─── Disable ────────────────────────────────────────────

/**
 * A creature attempts to disable a hazard using a specified skill check.
 */
export function disableHazard(
  actor: Creature,
  instance: HazardInstance,
  method: DisableOption,
): DisableResult {
  const hazard = getHazard(instance.hazardId);
  if (!hazard) {
    return {
      hazardId: instance.hazardId,
      hazardName: 'Unknown',
      disabled: false,
      creatureId: actor.id,
      skillRoll: 0,
      skillTotal: 0,
      dc: 0,
      degree: 'failure',
      message: `Hazard ${instance.hazardId} not found.`,
    };
  }

  if (instance.disabled) {
    return {
      hazardId: instance.hazardId,
      hazardName: hazard.name,
      disabled: true,
      creatureId: actor.id,
      skillRoll: 0,
      skillTotal: 0,
      dc: method.dc,
      degree: 'success',
      message: `${hazard.name} is already disabled.`,
    };
  }

  // Calculate skill bonus
  // Use the creature's skill proficiency if available, otherwise use a basic modifier
  const skillBonus = getSkillMod(actor, method.skill);

  const d20 = rollD20();
  const total = d20 + skillBonus;
  const degree = getDegreeOfSuccess(d20, total, method.dc);

  let disabled = false;
  let triggeredOnFailure = false;

  switch (degree) {
    case 'critical-success':
      disabled = true;
      instance.disabled = true;
      break;
    case 'success':
      disabled = true;
      instance.disabled = true;
      break;
    case 'failure':
      disabled = false;
      break;
    case 'critical-failure':
      disabled = false;
      // On critical failure to disable a trap, it often triggers
      if (hazard.type === 'trap') {
        triggeredOnFailure = true;
      }
      break;
  }

  debugLog('[HAZARD] Disable attempt', {
    creature: actor.name,
    hazard: hazard.name,
    skill: method.skill,
    d20,
    skillBonus,
    total,
    dc: method.dc,
    degree,
    disabled,
    triggeredOnFailure,
  });

  return {
    hazardId: instance.hazardId,
    hazardName: hazard.name,
    disabled,
    creatureId: actor.id,
    skillRoll: d20,
    skillTotal: total,
    dc: method.dc,
    degree,
    message: getDisableMessage(actor.name, hazard.name, method.skill, d20, skillBonus, total, method.dc, degree, triggeredOnFailure),
    triggeredOnFailure,
  };
}

function getDisableMessage(
  actorName: string, hazardName: string, skill: string,
  d20: number, bonus: number, total: number, dc: number,
  degree: DegreeOfSuccess, triggeredOnFailure: boolean
): string {
  const rollStr = `(${skill} ${d20}+${bonus}=${total} vs DC ${dc})`;
  switch (degree) {
    case 'critical-success':
      return `${actorName} expertly disables the ${hazardName}! ${rollStr}`;
    case 'success':
      return `${actorName} disables the ${hazardName}. ${rollStr}`;
    case 'failure':
      return `${actorName} fails to disable the ${hazardName}. ${rollStr}`;
    case 'critical-failure':
      return triggeredOnFailure
        ? `${actorName} critically fails to disable the ${hazardName} and triggers it! ${rollStr}`
        : `${actorName} critically fails to disable the ${hazardName}. ${rollStr}`;
  }
}

// ─── Trigger ────────────────────────────────────────────

/**
 * Trigger a hazard against one or more target creatures.
 * Resolves saves, damage, and conditions per PF2e rules.
 */
export function triggerHazard(
  hazard: Hazard,
  instance: HazardInstance,
  targets: Creature[],
): HazardTriggerResult {
  if (instance.disabled || instance.destroyed) {
    return {
      hazardName: hazard.name,
      hazardId: hazard.id,
      triggered: false,
      message: `${hazard.name} is ${instance.disabled ? 'disabled' : 'destroyed'}.`,
      targetResults: [],
    };
  }

  // Simple hazards that have already triggered and don't reset
  if (instance.triggered && hazard.complexity === 'simple' && !hazard.reset) {
    return {
      hazardName: hazard.name,
      hazardId: hazard.id,
      triggered: false,
      message: `${hazard.name} has already been triggered.`,
      targetResults: [],
    };
  }

  instance.triggered = true;
  const targetResults = targets.map(t => resolveHazardEffect(hazard.effect, t, hazard.name));

  debugLog('[HAZARD] Triggered', {
    hazard: hazard.name,
    targets: targets.map(t => t.name),
    results: targetResults.map(r => ({ creature: r.creatureName, damage: r.damageTaken, degree: r.degree })),
  });

  return {
    hazardName: hazard.name,
    hazardId: hazard.id,
    triggered: true,
    message: `⚠️ ${hazard.name} triggers!`,
    targetResults,
  };
}

// ─── Complex Hazard Turn ────────────────────────────────

/**
 * Execute a complex hazard's routine actions during its turn in initiative.
 */
export function complexHazardTurn(
  hazard: Hazard,
  instance: HazardInstance,
  targets: Creature[],
): HazardTurnResult {
  if (!hazard.routineActions || hazard.complexity !== 'complex') {
    return {
      hazardId: hazard.id,
      hazardName: hazard.name,
      actions: [],
    };
  }

  if (instance.disabled || instance.destroyed) {
    return {
      hazardId: hazard.id,
      hazardName: hazard.name,
      actions: [{ actionName: 'None', targetResults: [], message: `${hazard.name} is ${instance.disabled ? 'disabled' : 'destroyed'} and cannot act.` }],
    };
  }

  const actions = hazard.routineActions.map(routine => {
    const targetResults = targets.map(t => resolveHazardEffect(routine.effect, t, `${hazard.name} — ${routine.name}`));
    return {
      actionName: routine.name,
      targetResults,
      message: `${hazard.name} performs ${routine.name}: ${routine.description}`,
    };
  });

  debugLog('[HAZARD] Complex turn', {
    hazard: hazard.name,
    actionsPerformed: actions.map(a => a.actionName),
  });

  return {
    hazardId: hazard.id,
    hazardName: hazard.name,
    actions,
  };
}

// ─── Attack Complex Hazard ──────────────────────────────

/**
 * Apply damage to a complex hazard (creatures can attack hazards to destroy them).
 */
export function damageHazard(
  instance: HazardInstance,
  rawDamage: number,
): { destroyed: boolean; damageDealt: number; message: string } {
  const hazard = getHazard(instance.hazardId);
  if (!hazard || instance.currentHp === undefined) {
    return { destroyed: false, damageDealt: 0, message: 'This hazard cannot be damaged.' };
  }

  const hardness = hazard.hardness ?? 0;
  const damageDealt = Math.max(0, rawDamage - hardness);
  instance.currentHp = Math.max(0, instance.currentHp - damageDealt);

  if (instance.currentHp <= 0) {
    instance.destroyed = true;
    return {
      destroyed: true,
      damageDealt,
      message: `The ${hazard.name} is destroyed! (${rawDamage} damage - ${hardness} hardness = ${damageDealt} HP lost)`,
    };
  }

  return {
    destroyed: false,
    damageDealt,
    message: `The ${hazard.name} takes ${damageDealt} damage (${rawDamage} - ${hardness} hardness). HP: ${instance.currentHp}/${hazard.hp}`,
  };
}

// ─── Movement Check ─────────────────────────────────────

/**
 * Check if a creature moving to a position triggers any hazards.
 * Called from engine.ts after movement resolution.
 */
export function checkHazardsAtPosition(
  creature: Creature,
  position: { x: number; y: number },
  hazardInstances: HazardInstance[],
): HazardTriggerResult[] {
  const results: HazardTriggerResult[] = [];

  for (const instance of hazardInstances) {
    // Skip disabled/destroyed/already-triggered (non-resetting) hazards
    if (instance.disabled || instance.destroyed) continue;

    const hazard = getHazard(instance.hazardId);
    if (!hazard) continue;

    // Already triggered simple hazard with no reset
    if (instance.triggered && hazard.complexity === 'simple' && !hazard.reset) continue;

    // Check if creature is at hazard position
    const size = instance.sizeSquares ?? 1;
    const inRange =
      position.x >= instance.position.x &&
      position.x < instance.position.x + size &&
      position.y >= instance.position.y &&
      position.y < instance.position.y + size;

    if (!inRange) continue;

    // If creature detected this hazard, they presumably avoid it (they walked there knowingly)
    // Only trigger if the creature hasn't detected it
    if (instance.detectedBy.includes(creature.id) || instance.detectedBy.includes('all')) {
      continue;
    }

    const result = triggerHazard(hazard, instance, [creature]);
    if (result.triggered) {
      // Apply damage and conditions to the creature
      for (const tr of result.targetResults) {
        if (tr.damageTaken > 0) {
          creature.currentHealth = Math.max(0, creature.currentHealth - tr.damageTaken);
        }
        for (const condName of tr.conditionsApplied) {
          const effectCond = hazard.effect.conditions?.find(c => c.name === condName);
          if (effectCond && creature.conditions) {
            creature.conditions.push({
              name: effectCond.name,
              value: effectCond.value,
              duration: effectCond.duration,
              source: hazard.name,
            });
          }
        }
      }
      results.push(result);
    }
  }

  return results;
}

// ─── Internal Helpers ───────────────────────────────────

/**
 * Resolve a single hazard effect against a single target creature.
 */
function resolveHazardEffect(
  effect: HazardEffect,
  target: Creature,
  sourceName: string,
): HazardTargetResult {
  const result: HazardTargetResult = {
    creatureId: target.id,
    creatureName: target.name,
    damageTaken: 0,
    conditionsApplied: [],
    message: '',
  };

  // If no save required (e.g., lava — automatic damage)
  if (!effect.saveType || !effect.saveDC) {
    // Just apply damage directly
    if (effect.damage) {
      const roll = rollDamageFormula(effect.damage.formula);
      const { finalDamage } = calculateFinalDamage(roll.total, effect.damage.damageType, target);
      result.damageTaken = finalDamage;
      result.damageType = effect.damage.damageType;
      result.message = `${target.name} takes ${finalDamage} ${effect.damage.damageType} damage from ${sourceName}.`;
    }
    if (effect.type === 'special' && effect.specialDescription) {
      result.message = `${sourceName}: ${effect.specialDescription}`;
    }
    return result;
  }

  // Roll saving throw
  const d20 = rollD20();
  const saveBonus = calculateSaveBonus(target, effect.saveType);
  const total = d20 + saveBonus;
  const degree = getDegreeOfSuccess(d20, total, effect.saveDC);

  result.saveRoll = d20;
  result.saveTotal = total;
  result.saveDC = effect.saveDC;
  result.degree = degree;

  // Apply effects based on degree of success
  switch (degree) {
    case 'critical-success':
      // No damage, no conditions
      result.message = `${target.name} critically succeeds their ${effect.saveType} save against ${sourceName}! (${d20}+${saveBonus}=${total} vs DC ${effect.saveDC})`;
      break;

    case 'success':
      // Half damage, no conditions
      if (effect.damage) {
        const roll = rollDamageFormula(effect.damage.formula);
        const halfRaw = Math.floor(roll.total / 2);
        const { finalDamage } = calculateFinalDamage(halfRaw, effect.damage.damageType, target);
        result.damageTaken = finalDamage;
        result.damageType = effect.damage.damageType;
      }
      result.message = `${target.name} succeeds their ${effect.saveType} save against ${sourceName}. (${d20}+${saveBonus}=${total} vs DC ${effect.saveDC})${result.damageTaken > 0 ? ` Takes ${result.damageTaken} damage (halved).` : ''}`;
      break;

    case 'failure':
      // Full damage + conditions
      if (effect.damage) {
        const roll = rollDamageFormula(effect.damage.formula);
        const { finalDamage } = calculateFinalDamage(roll.total, effect.damage.damageType, target);
        result.damageTaken = finalDamage;
        result.damageType = effect.damage.damageType;
      }
      // Additional damage sources
      if (effect.additionalDamage) {
        for (const extra of effect.additionalDamage) {
          const extraRoll = rollDamageFormula(extra.formula);
          const { finalDamage } = calculateFinalDamage(extraRoll.total, extra.damageType, target);
          result.damageTaken += finalDamage;
        }
      }
      // Apply conditions
      if (effect.conditions) {
        for (const cond of effect.conditions) {
          result.conditionsApplied.push(cond.name);
        }
      }
      result.message = `${target.name} fails their ${effect.saveType} save against ${sourceName}! (${d20}+${saveBonus}=${total} vs DC ${effect.saveDC}) Takes ${result.damageTaken} damage.${result.conditionsApplied.length > 0 ? ` Conditions: ${result.conditionsApplied.join(', ')}.` : ''}`;
      break;

    case 'critical-failure':
      // Double damage + worse conditions
      if (effect.damage) {
        const roll = rollDamageFormula(effect.damage.formula);
        const doubled = roll.total * 2;
        const { finalDamage } = calculateFinalDamage(doubled, effect.damage.damageType, target);
        result.damageTaken = finalDamage;
        result.damageType = effect.damage.damageType;
      }
      // Additional damage sources (also doubled on crit fail)
      if (effect.additionalDamage) {
        for (const extra of effect.additionalDamage) {
          const extraRoll = rollDamageFormula(extra.formula);
          const { finalDamage } = calculateFinalDamage(extraRoll.total * 2, extra.damageType, target);
          result.damageTaken += finalDamage;
        }
      }
      // Apply conditions with upgraded value
      if (effect.conditions) {
        for (const cond of effect.conditions) {
          const upgradedName = cond.name;
          result.conditionsApplied.push(upgradedName);
        }
      }
      result.message = `${target.name} critically fails their ${effect.saveType} save against ${sourceName}! (${d20}+${saveBonus}=${total} vs DC ${effect.saveDC}) Takes ${result.damageTaken} DOUBLE damage!${result.conditionsApplied.length > 0 ? ` Conditions: ${result.conditionsApplied.join(', ')}.` : ''}`;
      break;
  }

  return result;
}

/**
 * Get a creature's modifier for a given skill name.
 * Falls back to ability modifier + level if no proficiency data is available.
 */
function getSkillMod(creature: Creature, skill: string): number {
  // Check if the creature has skill proficiency data
  const skillMap: Record<string, { ability: keyof NonNullable<Creature['abilities']>; profKey?: string }> = {
    thievery: { ability: 'dexterity' },
    athletics: { ability: 'strength' },
    arcana: { ability: 'intelligence' },
    religion: { ability: 'wisdom' },
    nature: { ability: 'wisdom' },
    occultism: { ability: 'intelligence' },
    crafting: { ability: 'intelligence' },
    performance: { ability: 'charisma' },
    survival: { ability: 'wisdom' },
    perception: { ability: 'wisdom' },
  };

  const info = skillMap[skill.toLowerCase()];
  if (!info) {
    // Unknown skill, use level as a rough modifier
    return creature.level;
  }

  const abilityMod = creature.abilities?.[info.ability] ?? 0;

  // Check skills array on the creature
  if (creature.skills) {
    const sp = creature.skills.find(
      s => s.name.toLowerCase() === skill.toLowerCase()
    );
    if (sp && sp.bonus !== undefined) {
      return sp.bonus;
    }
  }

  // Fallback: ability mod + level (assumes trained = level + 2 + abilityMod, simplified)
  return abilityMod + creature.level + 2;
}
