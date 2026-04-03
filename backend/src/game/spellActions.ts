import { Creature, GameState, Position, ActionResult, Spell, rollD20, rollDamageFormula, calculateSpellDC, calculateSpellAttack, calculateFinalDamage, applyDamageToShield, calculateAC, getAttackResult, computePathCost } from 'pf2e-shared';
import { getEffectiveSpeed, initDying } from './helpers';

export interface SpellActionContext {
  canCastAndConsumeSlot: (actor: Creature, spell: Spell, requestedRank?: number) => { canCast: boolean; message?: string; heightenedRank?: number };
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
  spell: Spell,
  targetId?: string,
  targetPosition?: Position,
  requestedRank?: number
): ActionResult {
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

    // ===== NEW CANTRIPS =====
    case 'acid-splash':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'acid-splash', 'Acid Splash', '🧪', 'acid', 2, 4, 1, 'reflex');
    case 'caustic-blast':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'caustic-blast', 'Caustic Blast', '🧪', 'acid', 2, 4, 1);
    case 'divine-lance':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'divine-lance', 'Divine Lance', '🔱', 'spirit', 2, 4, 1);
    case 'frostbite':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'frostbite', 'Frostbite', '❄️', 'cold', 2, 4, 1);
    case 'gouging-claw':
      return resolveGougingClaw(ctx, actor, gameState, targetId, heightenedRank);
    case 'ignition':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'ignition', 'Ignition', '🔥', 'fire', 2, 4, 1);
    case 'needle-darts':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'needle-darts', 'Needle Darts', '💫', 'piercing', 3, 4, 1);
    case 'scatter-scree':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'scatter-scree', 'Scatter Scree', '🪨', 'bludgeoning', 2, 4, 1, 'reflex');
    case 'slashing-gust':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'slashing-gust', 'Slashing Gust', '💨', 'slashing', 2, 4, 1);
    case 'tangle-vine':
      return resolveTangleVine(ctx, actor, gameState, targetId, heightenedRank);
    case 'vitality-lash':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'vitality-lash', 'Vitality Lash', '💚', 'vitality', 2, 4, 1);
    case 'void-warp':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'void-warp', 'Void Warp', '🌑', 'void', 2, 4, 1);
    case 'haunting-hymn':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'haunting-hymn', 'Haunting Hymn', '🎵', 'sonic', 1, 8, 2, 'will');
    case 'puff-of-poison':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'puff-of-poison', 'Puff of Poison', '☠️', 'poison', 1, 4, 2, 'fortitude');
    case 'spout':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'spout', 'Spout', '💧', 'bludgeoning', 2, 4, 1, 'reflex');
    case 'live-wire':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'live-wire', 'Live Wire', '⚡', 'electricity', 1, 4, 2);
    case 'guidance':
      return resolveGuidance(actor, gameState, targetId);
    case 'stabilize':
      return resolveStabilize(actor, gameState, targetId);
    case 'glass-shield':
      return resolveGlassShield(actor, heightenedRank);
    case 'rousing-splash':
      return resolveRousingSplash(actor, gameState, targetId);
    case 'protect-companion':
      return resolveProtectCompanion(actor, gameState, targetId);
    case 'dancing-blade':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'dancing-blade', 'Dancing Blade', '⚔️', 'slashing', 2, 6, 1);
    case 'telekinetic-rend':
      return resolveSpellAttackCantrip(ctx, actor, gameState, targetId, heightenedRank, 'telekinetic-rend', 'Telekinetic Rend', '🌀', 'bludgeoning', 2, 6, 1);
    case 'bramble-bush':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'bramble-bush', 'Bramble Bush', '🌿', 'piercing', 2, 4, 1, 'reflex');
    case 'gale-blast':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'gale-blast', 'Gale Blast', '💨', 'bludgeoning', 2, 4, 1, 'fortitude');
    case 'torturous-trauma':
      return resolveBasicSaveCantrip(ctx, actor, gameState, targetId, heightenedRank, 'torturous-trauma', 'Torturous Trauma', '🩸', 'mental', 2, 4, 1, 'will');

    // ===== NEW RANK 1 SPELLS =====
    case 'bane':
      return resolveBane(ctx, actor, gameState, heightenedRank);
    case 'bless':
      return resolveBless(actor, gameState);
    case 'command':
      return resolveCommand(ctx, actor, gameState, targetId, heightenedRank);
    case 'breathe-fire':
      return resolveBreatheFire(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'thunderstrike':
      return resolveThunderstrike(ctx, actor, gameState, targetId, heightenedRank);
    case 'mystic-armor':
      return resolveMysticArmor(actor, heightenedRank);
    case 'soothe':
      return resolveSoothe(actor, gameState, targetId, heightenedRank);
    case 'sanctuary':
      return resolveSanctuary(actor, gameState, targetId);
    case 'force-barrage':
      return resolveForceBarrage(actor, gameState, targetId, heightenedRank);
    case 'runic-weapon':
    case 'magic-weapon':
      return resolveMagicWeapon(actor, gameState, targetId, heightenedRank);

    // ===== NEW RANK 2 SPELLS =====
    case 'blazing-bolt':
      return resolveBlazingBolt(ctx, actor, gameState, targetId, heightenedRank);
    case 'resist-energy':
      return resolveResistEnergy(actor, gameState, targetId, heightenedRank);
    case 'enlarge':
      return resolveEnlarge(actor, gameState, targetId, heightenedRank);
    case 'dispel-magic':
      return resolveDispelMagic(actor, gameState, targetId, heightenedRank);
    case 'see-the-unseen':
    case 'see-invisibility':
      return resolveSeeTheUnseen(actor, heightenedRank);
    case 'laughing-fit':
    case 'hideous-laughter':
      return resolveLaughingFit(ctx, actor, gameState, targetId, heightenedRank);
    case 'calm-emotions':
      return resolveCalmEmotions(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'sound-burst':
      return resolveSoundBurst(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'acid-arrow':
      return resolveAcidArrow(ctx, actor, gameState, targetId, heightenedRank);
    case 'deafness':
      return resolveDeafness(ctx, actor, gameState, targetId);
    case 'false-life':
    case 'false-vitality':
      return resolveFalseVitality(actor, gameState, targetId, heightenedRank);
    case 'invisibility':
      return resolveInvisibility(actor, gameState, targetId, heightenedRank);

    // ===== NEW RANK 3 SPELLS =====
    case 'vampiric-feast':
    case 'vampiric-touch':
      return resolveVampiricFeast(ctx, actor, gameState, targetId, heightenedRank);
    case 'searing-light':
    case 'holy-light':
      return resolveSearingLight(ctx, actor, gameState, targetId, heightenedRank);
    case 'paralyze':
      return resolveParalyze(ctx, actor, gameState, targetId, heightenedRank);
    case 'blindness':
      return resolveBlindness(ctx, actor, gameState, targetId);
    case 'crashing-wave':
      return resolveCrashingWave(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'fly':
      return resolveFly(actor, gameState, targetId, heightenedRank);

    // ===== NEW RANK 4 SPELLS =====
    case 'confusion':
      return resolveConfusion(ctx, actor, gameState, targetId, heightenedRank);
    case 'phantasmal-killer':
      return resolvePhantasmalKiller(ctx, actor, gameState, targetId, heightenedRank);
    case 'fire-shield':
      return resolveFireShield(actor, heightenedRank);
    case 'freedom-of-movement':
      return resolveFreedomOfMovement(actor, gameState, targetId);
    case 'stoneskin':
      return resolveStoneskin(actor, gameState, targetId, heightenedRank);

    // ===== NEW RANK 5 SPELLS =====
    case 'cone-of-cold':
      return resolveConeOfCold(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'flame-strike':
      return resolveFlameStrike(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'banishment':
      return resolveBanishment(ctx, actor, gameState, targetId, heightenedRank);
    case 'wall-of-force':
      return resolveWallOfForce(actor, gameState, targetPosition, heightenedRank);
    case 'breath-of-life':
      return resolveBreathOfLife(actor, gameState, targetId, heightenedRank);

    // ===== NEW RANK 6+ SPELLS =====
    case 'chain-lightning':
      return resolveChainLightning(ctx, actor, gameState, targetId, heightenedRank);
    case 'disintegrate':
      return resolveDisintegrate(ctx, actor, gameState, targetId, heightenedRank);
    case 'true-seeing':
    case 'truesight':
      return resolveTrueSeeing(actor, heightenedRank);
    case 'regenerate':
      return resolveRegenerate(actor, gameState, targetId, heightenedRank);
    case 'execute':
    case 'finger-of-death':
      return resolveExecute(ctx, actor, gameState, targetId, heightenedRank);
    case 'power-word-kill':
      return resolvePowerWordKill(actor, gameState, targetId);
    case 'meteor-swarm':
      return resolveMeteorSwarm(ctx, actor, gameState, targetPosition, heightenedRank);
    case 'foresight':
      return resolveForesight(actor, gameState, targetId);
    case 'maze':
      return resolveMaze(ctx, actor, gameState, targetId);
    case 'sunburst':
      return resolveSunburst(ctx, actor, gameState, targetPosition, heightenedRank);

    // ===== UTILITY SPELLS (no combat effect) =====
    case 'mage-hand':
    case 'detect-magic':
    case 'message':
    case 'prestidigitation':
    case 'light':
    case 'read-aura':
    case 'ghost-sound':
    case 'sigil':
    case 'approximate':
    case 'bullhorn':
    case 'deep-breath':
    case 'detect-metal':
    case 'draw-moisture':
    case 'eat-fire':
    case 'figment':
    case 'glamorize':
    case 'glowing-trail':
    case 'illuminate':
    case 'infectious-enthusiasm':
    case 'inside-ropes':
    case 'invoke-true-name':
    case 'join-pasts':
    case 'know-the-way':
    case 'musical-accompaniment':
    case 'read-the-air':
    case 'redistribute-potential':
    case 'root-reading':
    case 'summon-instrument':
    case 'take-root':
    case 'tame':
    case 'telekinetic-hand':
    case 'timber':
    case 'time-sense':
    case 'tremor-signs':
    case 'wash-your-luck':
    case 'forbidding-ward':
    case 'glimpse-weakness':
    case 'ancient-dust':
    case 'elemental-counter':
    case 'frosts-touch':
    case 'healing-plaster':
    case 'mending':
      return { success: true, message: `✨ ${actor.name} casts ${spell.name}. (Utility spell — no combat effect.)` };
    default:
      return resolveGenericSpell(ctx, actor, gameState, spell, targetId, targetPosition, heightenedRank);
  }
}

export function resolveMagicMissile(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): ActionResult {
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
): ActionResult {
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
  const results: ActionResult[] = [];

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
): ActionResult {
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
  const results: ActionResult[] = [];

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

export function resolveShield(actor: Creature, heightenedRank: number = 1): ActionResult {
  actor.conditions.push({ name: 'shield', duration: 1, value: 1 });
  return {
    success: true,
    message: `🛡️ ${actor.name} casts Shield${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}, gaining +1 AC this round!`,
    acBonus: 1,
    heightenedRank,
  };
}

export function resolveHeal(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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

  const results: ActionResult[] = [];
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

export function resolveHaste(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
  const results: ActionResult[] = [];

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

export function resolveHeroism(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 3): ActionResult {
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

export function resolveTrueStrike(actor: Creature, heightenedRank: number = 1): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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
): ActionResult {
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

type SpellRuntimeCreature = Creature & { temporaryHealth?: number };

function ensureCreatureConditions(creature: Creature): NonNullable<Creature['conditions']> {
  if (!creature.conditions) {
    creature.conditions = [];
  }
  return creature.conditions;
}

function addOrRefreshCondition(
  creature: Creature,
  name: string,
  duration: number | string,
  value: number,
  source: string
): void {
  const conditions = ensureCreatureConditions(creature);
  const existing = conditions.find((condition) => condition.name === name && condition.source === source);

  if (existing) {
    existing.duration = duration;
    existing.value = value;
    return;
  }

  conditions.push({ name, duration, value, source });
}

function applyTemporaryHealth(creature: Creature, amount: number, source: string): number {
  const runtimeCreature = creature as SpellRuntimeCreature;
  runtimeCreature.temporaryHealth = Math.max(runtimeCreature.temporaryHealth || 0, amount);
  addOrRefreshCondition(creature, source, '8-hours', amount, source);
  return runtimeCreature.temporaryHealth;
}

// =============================================================================
// GENERIC SPELL RESOLUTION HELPERS
// =============================================================================

/** Generic handler for cantrips that use a spell attack roll */
function resolveSpellAttackCantrip(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId: string | undefined,
  heightenedRank: number,
  spellId: string,
  spellName: string,
  icon: string,
  damageType: string,
  baseDice: number,
  dieSize: number,
  heightenInterval: number
): ActionResult {
  if (!targetId) return { success: false, message: `No target specified for ${spellName}!` };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = baseDice + Math.floor(heightenedRank / heightenInterval);
  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `${icon} ${actor.name} casts ${spellName}${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
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

  const damageCalc = calculateFinalDamage(damage, damageType, target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} ${damageType}`;
  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

/** Generic handler for cantrips that use a basic save (reflex/fort/will) */
function resolveBasicSaveCantrip(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId: string | undefined,
  heightenedRank: number,
  spellId: string,
  spellName: string,
  icon: string,
  damageType: string,
  baseDice: number,
  dieSize: number,
  heightenInterval: number,
  saveType: 'reflex' | 'fortitude' | 'will'
): ActionResult {
  if (!targetId) return { success: false, message: `No target specified for ${spellName}!` };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = baseDice + Math.floor(heightenedRank / heightenInterval);
  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, saveType, saveDC);

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * dieSize) + 1;
  }

  // Basic save: crit success = 0, success = half, failure = full, crit failure = double
  if (saveRoll.result === 'critical-success') damage = 0;
  else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
  else if (saveRoll.result === 'critical-failure') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, damageType, target);
  target.currentHealth -= damageCalc.finalDamage;

  let message = `${icon} ${actor.name} casts ${spellName}${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `${saveType.charAt(0).toUpperCase() + saveType.slice(1)} Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
  message += `💥 Damage: ${damageCalc.finalDamage} ${damageType}`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, saveResult: saveRoll.result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

/** Generic fallback for catalog spells that have damageFormula + saveType/basicSave */
function resolveGenericSpell(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  spell: Spell,
  targetId: string | undefined,
  targetPosition: Position | undefined,
  heightenedRank: number
): ActionResult {
  // If the spell has damage + basic save, handle generically
  if (spell.damageFormula && spell.saveType && spell.basicSave && spell.targetType === 'single') {
    if (!targetId) return { success: false, message: `No target specified for ${spell.name}!` };
    const target = gameState.creatures.find((c: Creature) => c.id === targetId);
    if (!target) return { success: false, message: 'Target not found!' };

    const baseDamageRoll = rollDamageFormula(spell.damageFormula);
    let extraDice = 0;
    if (spell.heightening?.type === 'interval' && spell.heightening.damage) {
      const intervals = Math.floor((heightenedRank - spell.rank) / (spell.heightening.interval || 1));
      if (intervals > 0 && spell.heightening.damage) {
        const match = spell.heightening.damage.match(/(\d+)d(\d+)/);
        if (match) {
          for (let i = 0; i < intervals * parseInt(match[1]); i++) {
            extraDice += Math.floor(Math.random() * parseInt(match[2])) + 1;
          }
        }
      }
    }

    let damage = baseDamageRoll.total + extraDice;
    const saveDC = calculateSpellDC(actor);
    const saveRoll = ctx.rollSave(target, spell.saveType, saveDC);

    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, spell.damageType || 'force', target);
    target.currentHealth -= damageCalc.finalDamage;

    let message = `✨ ${actor.name} casts ${spell.name}${heightenedRank > spell.rank ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
    message += `${spell.saveType.charAt(0).toUpperCase() + spell.saveType.slice(1)} Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
    message += `💥 Damage: ${damageCalc.finalDamage} ${spell.damageType || 'force'}`;

    if (target.currentHealth <= 0 && !target.dying) {
      message += initDying(target);
    }

    return { success: true, message, saveResult: saveRoll.result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
  }

  // If the spell has damage + spell attack (no save), handle generically
  if (spell.damageFormula && !spell.saveType && spell.targetType === 'single') {
    if (!targetId) return { success: false, message: `No target specified for ${spell.name}!` };
    const target = gameState.creatures.find((c: Creature) => c.id === targetId);
    if (!target) return { success: false, message: 'Target not found!' };

    const baseDamageRoll = rollDamageFormula(spell.damageFormula);
    let extraDice = 0;
    if (spell.heightening?.type === 'interval' && spell.heightening.damage) {
      const intervals = Math.floor((heightenedRank - spell.rank) / (spell.heightening.interval || 1));
      if (intervals > 0) {
        const match = spell.heightening.damage.match(/(\d+)d(\d+)/);
        if (match) {
          for (let i = 0; i < intervals * parseInt(match[1]); i++) {
            extraDice += Math.floor(Math.random() * parseInt(match[2])) + 1;
          }
        }
      }
    }

    const spellAttackBonus = calculateSpellAttack(actor);
    const d20 = rollD20();
    const totalAttack = d20 + spellAttackBonus;
    const targetAC = calculateAC(target, actor.id, 'ranged');
    const result = getAttackResult(d20, totalAttack, targetAC);

    let damage = baseDamageRoll.total + extraDice;
    if (result === 'failure' || result === 'critical-failure') damage = 0;
    else if (result === 'critical-success') damage *= 2;

    if (damage > 0) {
      const damageCalc = calculateFinalDamage(damage, spell.damageType || 'force', target);
      target.currentHealth -= damageCalc.finalDamage;

      let message = `✨ ${actor.name} casts ${spell.name}${heightenedRank > spell.rank ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
      message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC} → **${result.toUpperCase()}**\n`;
      message += `💥 Damage: ${damageCalc.finalDamage} ${spell.damageType || 'force'}`;

      if (target.currentHealth <= 0 && !target.dying) {
        message += initDying(target);
      }

      return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
    }

    return { success: true, message: `✨ ${actor.name} casts ${spell.name} at ${target.name} but misses! (${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC})`, result, heightenedRank };
  }

  // AoE + basic save fallback
  if (spell.damageFormula && spell.saveType && spell.basicSave && spell.targetType === 'aoe' && targetPosition) {
    const aoeRadius = spell.aoeRadius || 4;
    const saveDC = calculateSpellDC(actor);
    const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
      if (creature.id === actor.id) return false;
      const dx = creature.positions.x - targetPosition.x;
      const dy = creature.positions.y - targetPosition.y;
      return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
    });

    if (targetsInAoE.length === 0) {
      return { success: true, message: `✨ ${actor.name} casts ${spell.name} but no targets are in the area!`, heightenedRank };
    }

    const baseDamageRoll = rollDamageFormula(spell.damageFormula);
    let extraDice = 0;
    if (spell.heightening?.type === 'interval' && spell.heightening.damage) {
      const intervals = Math.floor((heightenedRank - spell.rank) / (spell.heightening.interval || 1));
      if (intervals > 0) {
        const match = spell.heightening.damage.match(/(\d+)d(\d+)/);
        if (match) {
          for (let i = 0; i < intervals * parseInt(match[1]); i++) {
            extraDice += Math.floor(Math.random() * parseInt(match[2])) + 1;
          }
        }
      }
    }
    const baseDamage = baseDamageRoll.total + extraDice;

    const results: ActionResult[] = [];
    targetsInAoE.forEach((target: Creature) => {
      const saveRoll = ctx.rollSave(target, spell.saveType!, saveDC);
      let damage = baseDamage;
      if (saveRoll.result === 'critical-success') damage = 0;
      else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
      else if (saveRoll.result === 'critical-failure') damage *= 2;

      const damageCalc = calculateFinalDamage(damage, spell.damageType || 'force', target);
      target.currentHealth -= damageCalc.finalDamage;

      let status = '';
      if (target.currentHealth <= 0 && !target.dying) {
        status = initDying(target);
      }

      results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
    });

    return { success: true, message: `✨ ${actor.name} casts ${spell.name}${heightenedRank > spell.rank ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamage} ${spell.damageType || 'force'}`, results, heightenedRank };
  }

  // Non-combat / unhandled
  return { success: true, message: `✨ ${actor.name} casts ${spell.name}. (Resolution pending — effects applied narratively.)` };
}

// =============================================================================
// CANTRIP RESOLVERS
// =============================================================================

export function resolveGougingClaw(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Gouging Claw!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = 2 + heightenedRank;
  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'melee');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `💥 ${actor.name} casts Gouging Claw${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * 6) + 1;
  }
  if (result === 'critical-success') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'slashing', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} slashing`;

  // Persistent bleed on hit
  if (result === 'critical-success') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'persistent-damage', duration: 'permanent', value: 2, source: `gouging-claw-${actor.id}` });
    message += `\n🩸 ${target.name} takes persistent bleed damage!`;
  }

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

export function resolveTangleVine(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Tangle Vine!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `🌿 ${actor.name} casts Tangle Vine${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  if (!target.conditions) target.conditions = [];
  if (result === 'critical-success') {
    target.conditions.push({ name: 'immobilized', duration: 2, value: 1, source: `tangle-vine-${actor.id}` });
    message += `\n🌿 ${target.name} is **immobilized** for 2 rounds! (Critical Hit)`;
  } else {
    target.conditions.push({ name: 'immobilized', duration: 1, value: 1, source: `tangle-vine-${actor.id}` });
    message += `\n🌿 ${target.name} is **immobilized** until the end of your next turn!`;
  }

  return { success: true, message, result, targetHealth: target.currentHealth, heightenedRank };
}

export function resolveGuidance(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Guidance!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'guidance', duration: 1, value: 1, source: `guidance-${actor.id}` });

  return { success: true, message: `✋ ${actor.name} casts Guidance on ${target.name}! They gain a +1 status bonus to one attack roll, Perception check, saving throw, or skill check.` };
}

export function resolveStabilize(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Stabilize!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.dying) {
    return { success: false, message: `${target.name} is not dying!` };
  }

  target.dying = false;
  target.conditions = (target.conditions || []).filter((c) => c.name !== 'dying');

  return { success: true, message: `🏥 ${actor.name} casts Stabilize on ${target.name}! They are no longer dying.`, targetHealth: target.currentHealth };
}

export function resolveGlassShield(actor: Creature, heightenedRank: number = 1): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'shield', duration: 1, value: 1, source: 'glass-shield' });

  return { success: true, message: `🔷 ${actor.name} casts Glass Shield, gaining +1 AC this round! Enemies that hit in melee take piercing damage.`, acBonus: 1, heightenedRank };
}

export function resolveRousingSplash(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Rousing Splash!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  // Remove unconscious condition
  if (target.conditions) {
    target.conditions = target.conditions.filter((c) => c.name !== 'unconscious');
  }

  // Small healing
  const healing = Math.floor(Math.random() * 4) + 1;
  const previousHP = target.currentHealth;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + healing);
  const actualHealing = target.currentHealth - previousHP;

  return { success: true, message: `💧 ${actor.name} casts Rousing Splash on ${target.name}! They wake up${actualHealing > 0 ? ` and recover ${actualHealing} HP` : ''}.`, targetHealth: target.currentHealth };
}

export function resolveProtectCompanion(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Protect Companion!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'protect-companion', duration: 1, value: 2, source: `protect-companion-${actor.id}` });

  return { success: true, message: `🛡️ ${actor.name} casts Protect Companion on ${target.name}! They gain +2 circumstance bonus to AC until your next turn.` };
}

// =============================================================================
// RANK 1 SPELL RESOLVERS
// =============================================================================

export function resolveBless(actor: Creature, gameState: GameState): ActionResult {
  const allies = gameState.creatures.filter((c: Creature) => {
    if (c.id === actor.id) return false;
    if (c.isNPC !== actor.isNPC) return false;
    const dx = c.positions.x - actor.positions.x;
    const dy = c.positions.y - actor.positions.y;
    return Math.sqrt(dx * dx + dy * dy) <= 3;
  });

  allies.forEach((ally: Creature) => {
    if (!ally.conditions) ally.conditions = [];
    ally.conditions.push({ name: 'bless', duration: 'sustained', value: 1, source: `bless-${actor.id}` });
  });

  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'bless', duration: 'sustained', value: 1, source: `bless-${actor.id}` });

  return { success: true, message: `⭐ ${actor.name} casts Bless! ${allies.length + 1} creatures gain +1 status bonus to attack rolls. (Sustained)`, affectedCount: allies.length + 1 };
}

export function resolveBane(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  heightenedRank: number = 1
): ActionResult {
  const saveDC = calculateSpellDC(actor);
  const enemies = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    if (creature.isNPC === actor.isNPC) return false;
    const dx = creature.positions.x - actor.positions.x;
    const dy = creature.positions.y - actor.positions.y;
    return Math.sqrt(dx * dx + dy * dy) <= 3;
  });

  const affected: string[] = [];
  const resisted: string[] = [];

  enemies.forEach((enemy: Creature) => {
    const saveRoll = ctx.rollSave(enemy, 'will', saveDC, undefined, ['auditory', 'emotion', 'fear', 'mental']);
    if (saveRoll.result === 'failure' || saveRoll.result === 'critical-failure') {
      addOrRefreshCondition(enemy, 'bane', 'sustained', 1, `bane-${actor.id}`);
      affected.push(enemy.name);
    } else {
      resisted.push(enemy.name);
    }
  });

  addOrRefreshCondition(actor, 'bane-aura', 'sustained', Math.max(1, heightenedRank), `bane-${actor.id}`);

  let message = `👿 ${actor.name} casts Bane! Enemies within 15 feet must save vs DC ${saveDC}.`;
  if (affected.length > 0) {
    message += ` ${affected.join(', ')} take a -1 status penalty to attack rolls while within the emanation.`;
  }
  if (resisted.length > 0) {
    message += ` ${resisted.join(', ')} resist the dirge.`;
  }
  if (affected.length === 0 && resisted.length === 0) {
    message += ' No enemies are in range.';
  }

  return { success: true, message, affectedCount: affected.length, heightenedRank };
}

export function resolveCommand(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Command!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['auditory', 'linguistic', 'mental']);

  let message = `🗣️ ${actor.name} casts Command${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (saveRoll.result === 'critical-failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'commanded', duration: 2, value: 1, source: `command-${actor.id}` });
    message += `\n✨ ${target.name} must obey the command for 2 rounds!`;
  } else if (saveRoll.result === 'failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'commanded', duration: 1, value: 1, source: `command-${actor.id}` });
    message += `\n✨ ${target.name} must obey the command on their next turn!`;
  } else {
    message += `\n❌ ${target.name} resists the command!`;
  }

  return { success: true, message, saveResult: saveRoll.result, heightenedRank };
}

export function resolveBreatheFire(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 1
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Breathe Fire!' };

  const aoeRadius = 3;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  const baseDice = 2 + 2 * Math.max(0, heightenedRank - 1);
  const damageFormula = `${baseDice}d6`;
  const baseDamageRoll = rollDamageFormula(damageFormula);

  if (targetsInAoE.length === 0) {
    return { success: true, message: `🔥 ${actor.name} casts Breathe Fire${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} but no targets are in the cone!`, heightenedRank };
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamageRoll.total;
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    target.currentHealth -= damageCalc.finalDamage;

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
  });

  return { success: true, message: `🔥 ${actor.name} casts Breathe Fire${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamageRoll.total} fire (${damageFormula})`, results, heightenedRank };
}

export function resolveThunderstrike(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 1
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Thunderstrike!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = 1 + Math.max(0, heightenedRank - 1);
  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'reflex', saveDC);

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * 12) + 1;
  }

  if (saveRoll.result === 'critical-success') damage = 0;
  else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
  else if (saveRoll.result === 'critical-failure') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'electricity', target);
  target.currentHealth -= damageCalc.finalDamage;

  let message = `⚡ ${actor.name} casts Thunderstrike${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Reflex Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
  message += `💥 Damage: ${damageCalc.finalDamage} electricity`;

  if (saveRoll.result === 'failure' || saveRoll.result === 'critical-failure') {
    message += `\n🔊 ${target.name} is **deafened** for 1 round!`;
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'deafened', duration: 1, value: 1, source: `thunderstrike-${actor.id}` });
  }

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, saveResult: saveRoll.result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

export function resolveMysticArmor(actor: Creature, heightenedRank: number = 1): ActionResult {
  let bonus = 1;
  if (heightenedRank >= 10) bonus = 4;
  else if (heightenedRank >= 7) bonus = 3;
  else if (heightenedRank >= 4) bonus = 2;

  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'mystic-armor', duration: 'until-rest', value: bonus, source: 'mystic-armor' });

  return { success: true, message: `🛡️ ${actor.name} casts Mystic Armor${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''}! Gains +${bonus} item bonus to AC.`, acBonus: bonus, heightenedRank };
}

export function resolveSoothe(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Soothe!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = heightenedRank;
  let healing = 4; // base +4
  for (let i = 0; i < numDice; i++) {
    healing += Math.floor(Math.random() * 10) + 1;
  }

  const previousHP = target.currentHealth;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + healing);
  const actualHealing = target.currentHealth - previousHP;

  return { success: true, message: `💚 ${actor.name} casts Soothe${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} on ${target.name} for ${actualHealing} HP!`, targetHealth: target.currentHealth, healing: actualHealing, heightenedRank };
}

export function resolveSanctuary(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Sanctuary!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'sanctuary', duration: 10, value: 1, source: `sanctuary-${actor.id}` });

  const saveDC = calculateSpellDC(actor);

  return { success: true, message: `✨ ${actor.name} casts Sanctuary on ${target.name}! Enemies must succeed at a Will save (DC ${saveDC}) to target ${target.name} with hostile actions.` };
}

export function resolveForceBarrage(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Force Barrage!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  // Identical to Magic Missile: 1 missile per action, each does 1d4+1. Heighten (+2) adds 1 missile.
  const numMissiles = 1 + Math.max(0, Math.floor((heightenedRank - 1) / 2));
  let totalDamage = 0;
  const missileResults: number[] = [];

  for (let i = 0; i < numMissiles; i++) {
    const dmg = Math.floor(Math.random() * 4) + 1 + 1;
    missileResults.push(dmg);
    totalDamage += dmg;
  }

  const damageCalc = calculateFinalDamage(totalDamage, 'force', target);
  target.currentHealth -= damageCalc.finalDamage;

  let message = `💫 ${actor.name} casts Force Barrage${heightenedRank > 1 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}! ${numMissiles} missile(s) deal ${damageCalc.finalDamage} force damage (${missileResults.join(', ')})!`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, damage: damageCalc.finalDamage, targetHealth: target.currentHealth, heightenedRank };
}

export function resolveMagicWeapon(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 1): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Magic Weapon!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'magic-weapon', duration: 10, value: 1, source: `magic-weapon-${actor.id}` });

  return { success: true, message: `⚔️ ${actor.name} casts Magic Weapon on ${target.name}! Their weapon gains a +1 item bonus to attack rolls and deals an extra die of damage.`, heightenedRank };
}

// =============================================================================
// RANK 2 SPELL RESOLVERS
// =============================================================================

export function resolveBlazingBolt(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 2
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Blazing Bolt!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = 3 + Math.max(0, heightenedRank - 2);
  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `🔥 ${actor.name} casts Blazing Bolt${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * 6) + 1;
  }
  if (result === 'critical-success') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'fire', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} fire`;
  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

export function resolveResistEnergy(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 2): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Resist Energy!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const resistance = heightenedRank <= 4 ? 5 : heightenedRank <= 6 ? 10 : 15;

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'resist-energy', duration: 10, value: resistance, source: `resist-energy-${actor.id}` });

  return { success: true, message: `🛡️ ${actor.name} casts Resist Energy${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}! They gain resistance ${resistance} to one energy type.`, heightenedRank };
}

export function resolveEnlarge(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 2): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Enlarge!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'enlarge', duration: 10, value: 2, source: `enlarge-${actor.id}` });

  return { success: true, message: `📏 ${actor.name} casts Enlarge${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}! They become Large, gaining +2 status bonus to melee attack damage and 10 extra feet of reach.`, heightenedRank };
}

export function resolveDispelMagic(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 2): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Dispel Magic!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  // Remove magical conditions
  const removedConditions: string[] = [];
  if (target.conditions) {
    const magicConditions = ['haste', 'slow', 'heroism', 'bless', 'mystic-armor', 'magic-weapon', 'enlarge', 'sanctuary', 'fire-shield', 'stoneskin', 'fly', 'freedom-of-movement', 'resist-energy', 'true-seeing', 'foresight'];
    target.conditions = target.conditions.filter((c) => {
      if (magicConditions.includes(c.name)) {
        removedConditions.push(c.name);
        return false;
      }
      return true;
    });
  }

  if (removedConditions.length > 0) {
    return { success: true, message: `✨ ${actor.name} casts Dispel Magic on ${target.name}! Removed: ${removedConditions.join(', ')}`, heightenedRank };
  }

  return { success: true, message: `✨ ${actor.name} casts Dispel Magic on ${target.name}, but there are no magical effects to dispel.`, heightenedRank };
}

export function resolveSeeTheUnseen(actor: Creature, heightenedRank: number = 2): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'see-the-unseen', duration: 10, value: 1, source: 'see-the-unseen' });

  return { success: true, message: `👁️ ${actor.name} casts See the Unseen! They can see invisible and ethereal creatures for the duration.`, heightenedRank };
}

export function resolveLaughingFit(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 2
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Laughing Fit!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['emotion', 'mental']);

  let message = `😂 ${actor.name} casts Laughing Fit${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (!target.conditions) target.conditions = [];

  if (saveRoll.result === 'critical-failure') {
    target.conditions.push({ name: 'slowed', duration: 'sustained', value: 1, source: `laughing-fit-${actor.id}` });
    target.conditions.push({ name: 'off-guard', duration: 'sustained', value: 1, source: `laughing-fit-${actor.id}` });
    message += `\n😂 ${target.name} is **slowed 1** and **off-guard** (sustained)! Prone on crit fail!`;
  } else if (saveRoll.result === 'failure') {
    target.conditions.push({ name: 'slowed', duration: 'sustained', value: 1, source: `laughing-fit-${actor.id}` });
    message += `\n😂 ${target.name} is **slowed 1** (sustained)!`;
  } else {
    message += `\n❌ ${target.name} resists the laughter!`;
  }

  return { success: true, message, saveResult: saveRoll.result, heightenedRank };
}

export function resolveCalmEmotions(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 2
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Calm Emotions!' };

  const aoeRadius = 2;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  let calmed = 0;
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['emotion', 'mental', 'incapacitation']);
    if (saveRoll.result === 'failure' || saveRoll.result === 'critical-failure') {
      if (target.conditions) {
        target.conditions = target.conditions.filter((c) => !['frightened', 'rage', 'confused', 'hostile'].includes(c.name));
      }
      calmed++;
    }
  });

  return { success: true, message: `☮️ ${actor.name} casts Calm Emotions! ${calmed} creature(s) have their emotion effects suppressed.`, heightenedRank };
}

export function resolveSoundBurst(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 2
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Sound Burst!' };

  const aoeRadius = 2;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  if (targetsInAoE.length === 0) {
    return { success: true, message: `🔊 ${actor.name} casts Sound Burst but no targets are in the area!`, heightenedRank };
  }

  const baseDice = 2 + Math.max(0, heightenedRank - 2);
  let baseDamage = 0;
  for (let i = 0; i < baseDice; i++) {
    baseDamage += Math.floor(Math.random() * 10) + 1;
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'fortitude', saveDC);
    let damage = baseDamage;
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'sonic', target);
    target.currentHealth -= damageCalc.finalDamage;

    if (saveRoll.result === 'critical-failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'stunned', duration: 1, value: 1, source: `sound-burst-${actor.id}` });
    }

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
  });

  return { success: true, message: `🔊 ${actor.name} casts Sound Burst${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamage} sonic`, results, heightenedRank };
}

export function resolveAcidArrow(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 2
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Acid Arrow!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `🧪 ${actor.name} casts Acid Arrow${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  const baseDice = 3 + Math.max(0, heightenedRank - 2) * 2;

  export function resolveDeafness(
    ctx: SpellActionContext,
    actor: Creature,
    gameState: GameState,
    targetId?: string
  ): ActionResult {
    if (!targetId) return { success: false, message: 'No target specified for Deafness!' };
    const target = gameState.creatures.find((c: Creature) => c.id === targetId);
    if (!target) return { success: false, message: 'Target not found!' };

    const saveDC = calculateSpellDC(actor);
    const saveRoll = ctx.rollSave(target, 'fortitude', saveDC, undefined, ['auditory']);

    let message = `🔇 ${actor.name} casts Deafness on ${target.name}!\n`;
    message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

    if (saveRoll.result === 'critical-failure') {
      addOrRefreshCondition(target, 'deafened', 'permanent', 1, `deafness-${actor.id}`);
      message += `\n🔇 ${target.name} is permanently **deafened**!`;
    } else if (saveRoll.result === 'failure') {
      addOrRefreshCondition(target, 'deafened', 10, 1, `deafness-${actor.id}`);
      message += `\n🔇 ${target.name} is **deafened** for 1 minute!`;
    } else if (saveRoll.result === 'success') {
      addOrRefreshCondition(target, 'deafened', 1, 1, `deafness-${actor.id}`);
      message += `\n🔇 ${target.name} is **deafened** for 1 round.`;
    } else {
      message += `\n❌ ${target.name} shrugs off the magic.`;
    }

    return { success: true, message, saveResult: saveRoll.result };
  }

  export function resolveFalseVitality(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heightenedRank: number = 2
  ): ActionResult {
    const target = targetId ? gameState.creatures.find((c: Creature) => c.id === targetId) : actor;
    if (!target) return { success: false, message: 'Target not found!' };

    const tempHP = 6 + Math.max(0, heightenedRank - 2) * 3;
    const appliedTempHP = applyTemporaryHealth(target, tempHP, `false-vitality-${actor.id}`);

    return {
      success: true,
      message: `💛 ${actor.name} casts False Vitality${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''}${target.id !== actor.id ? ` on ${target.name}` : ''}! ${target.name} gains ${tempHP} temporary HP for 8 hours. Current temp HP: ${appliedTempHP}.`,
      temporaryHealth: appliedTempHP,
      heightenedRank,
    };
  }

  export function resolveInvisibility(
    actor: Creature,
    gameState: GameState,
    targetId?: string,
    heightenedRank: number = 2
  ): ActionResult {
    const target = targetId ? gameState.creatures.find((c: Creature) => c.id === targetId) : actor;
    if (!target) return { success: false, message: 'Target not found!' };

    const duration = heightenedRank >= 4 ? 10 : 100;
    addOrRefreshCondition(target, 'invisible', duration, 1, `invisibility-${actor.id}`);

    if (heightenedRank < 4) {
      addOrRefreshCondition(target, 'invisibility-breaks-on-hostile-action', duration, 1, `invisibility-${actor.id}`);
    }

    let message = `👻 ${actor.name} casts Invisibility${heightenedRank > 2 ? ` (Rank ${heightenedRank})` : ''}${target.id !== actor.id ? ` on ${target.name}` : ''}! ${target.name} becomes **invisible**.`;
    if (heightenedRank >= 4) {
      message += ' The effect lasts for 1 minute and is marked to persist through hostile actions.';
    } else {
      message += ' The effect lasts up to 10 minutes and is marked to end if the target takes a hostile action.';
    }

    return { success: true, message, heightenedRank };
  }
  let damage = 0;
  for (let i = 0; i < baseDice; i++) {
    damage += Math.floor(Math.random() * 8) + 1;
  }
  if (result === 'critical-success') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'acid', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} acid`;

  // Persistent acid damage
  if (!target.conditions) target.conditions = [];
  const persistDice = result === 'critical-success' ? 4 : 2;
  target.conditions.push({ name: 'persistent-damage', duration: 'permanent', value: persistDice, source: `acid-arrow-${actor.id}` });
  message += `\n🧪 ${target.name} takes persistent acid damage (${persistDice}d6)!`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

// =============================================================================
// RANK 3 SPELL RESOLVERS
// =============================================================================

export function resolveVampiricFeast(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 3
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Vampiric Feast!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = 5 + 2 * Math.max(0, heightenedRank - 3);
  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'fortitude', saveDC);

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * 6) + 1;
  }

  if (saveRoll.result === 'critical-success') damage = 0;
  else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
  else if (saveRoll.result === 'critical-failure') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'void', target);
  target.currentHealth -= damageCalc.finalDamage;

  // Heal caster for half the damage dealt
  const healing = Math.floor(damageCalc.finalDamage / 2);
  const previousHP = actor.currentHealth;
  actor.currentHealth = Math.min(actor.maxHealth, actor.currentHealth + healing);
  const actualHealing = actor.currentHealth - previousHP;

  let message = `🧛 ${actor.name} casts Vampiric Feast${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
  message += `💥 Damage: ${damageCalc.finalDamage} void | 💚 Healed: ${actualHealing} HP`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, saveResult: saveRoll.result, damage: damageCalc.finalDamage, healing: actualHealing, targetHealth: target.currentHealth, heightenedRank };
}

export function resolveSearingLight(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 3
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Searing Light!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const numDice = 5 + 2 * Math.max(0, heightenedRank - 3);
  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `☀️ ${actor.name} casts Searing Light${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  let damage = 0;
  for (let i = 0; i < numDice; i++) {
    damage += Math.floor(Math.random() * 6) + 1;
  }
  // Extra damage vs undead/fiends  
  const isUndead = target.traits?.includes('undead') || target.traits?.includes('fiend');
  if (isUndead) {
    damage += numDice; // +1 per die as bonus
  }
  if (result === 'critical-success') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'fire', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} fire${isUndead ? ' (bonus vs undead/fiend!)' : ''}`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

export function resolveParalyze(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 3
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Paralyze!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['incapacitation', 'mental']);

  let message = `🧊 ${actor.name} casts Paralyze${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (!target.conditions) target.conditions = [];

  if (saveRoll.result === 'critical-failure') {
    target.conditions.push({ name: 'paralyzed', duration: 4, value: 1, source: `paralyze-${actor.id}` });
    message += `\n🧊 ${target.name} is **paralyzed** for 4 rounds!`;
  } else if (saveRoll.result === 'failure') {
    target.conditions.push({ name: 'paralyzed', duration: 1, value: 1, source: `paralyze-${actor.id}` });
    message += `\n🧊 ${target.name} is **paralyzed** for 1 round!`;
  } else if (saveRoll.result === 'success') {
    target.conditions.push({ name: 'stunned', duration: 1, value: 1, source: `paralyze-${actor.id}` });
    message += `\n⚡ ${target.name} is **stunned 1**!`;
  } else {
    message += `\n❌ ${target.name} is unaffected!`;
  }

  return { success: true, message, saveResult: saveRoll.result, heightenedRank };
}

export function resolveBlindness(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Blindness!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'fortitude', saveDC, undefined, ['incapacitation']);

  let message = `🙈 ${actor.name} casts Blindness on ${target.name}!\n`;
  message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (!target.conditions) target.conditions = [];

  if (saveRoll.result === 'critical-failure') {
    target.conditions.push({ name: 'blinded', duration: 'permanent', value: 1, source: `blindness-${actor.id}` });
    message += `\n🙈 ${target.name} is permanently **blinded**!`;
  } else if (saveRoll.result === 'failure') {
    target.conditions.push({ name: 'blinded', duration: 10, value: 1, source: `blindness-${actor.id}` });
    message += `\n🙈 ${target.name} is **blinded** for 1 minute!`;
  } else if (saveRoll.result === 'success') {
    target.conditions.push({ name: 'dazzled', duration: 1, value: 1, source: `blindness-${actor.id}` });
    message += `\n😵 ${target.name} is **dazzled** for 1 round!`;
  } else {
    message += `\n❌ ${target.name} is unaffected!`;
  }

  return { success: true, message, saveResult: saveRoll.result };
}

export function resolveCrashingWave(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 3
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Crashing Wave!' };

  const aoeRadius = 3;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  const baseDice = 6 + 2 * Math.max(0, heightenedRank - 3);
  let baseDamage = 0;
  for (let i = 0; i < baseDice; i++) {
    baseDamage += Math.floor(Math.random() * 6) + 1;
  }

  if (targetsInAoE.length === 0) {
    return { success: true, message: `🌊 ${actor.name} casts Crashing Wave but no targets are in the area!`, heightenedRank };
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamage;
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'bludgeoning', target);
    target.currentHealth -= damageCalc.finalDamage;

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
  });

  return { success: true, message: `🌊 ${actor.name} casts Crashing Wave${heightenedRank > 3 ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamage} bludgeoning`, results, heightenedRank };
}

export function resolveFly(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 4): ActionResult {
  const target = targetId ? gameState.creatures.find((c: Creature) => c.id === targetId) : actor;
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'fly', duration: 10, value: 1, source: `fly-${actor.id}` });

  return { success: true, message: `🦅 ${actor.name} casts Fly${targetId && target.id !== actor.id ? ` on ${target.name}` : ''}! ${target.name} gains a fly speed of 20 feet for the duration.`, heightenedRank };
}

// =============================================================================
// RANK 4 SPELL RESOLVERS
// =============================================================================

export function resolveConfusion(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 4
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Confusion!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['mental']);

  let message = `🧠 ${actor.name} casts Confusion${heightenedRank > 4 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (!target.conditions) target.conditions = [];

  if (saveRoll.result === 'critical-failure') {
    target.conditions.push({ name: 'confused', duration: 10, value: 1, source: `confusion-${actor.id}` });
    message += `\n🧠 ${target.name} is **confused** for 1 minute!`;
  } else if (saveRoll.result === 'failure') {
    target.conditions.push({ name: 'confused', duration: 1, value: 1, source: `confusion-${actor.id}` });
    message += `\n🧠 ${target.name} is **confused** for 1 round!`;
  } else if (saveRoll.result === 'success') {
    message += `\n😵 ${target.name} babbles incoherently for 1 action.`;
  } else {
    message += `\n❌ ${target.name} is unaffected!`;
  }

  return { success: true, message, saveResult: saveRoll.result, heightenedRank };
}

export function resolvePhantasmalKiller(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 4
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Phantasmal Killer!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const willSave = ctx.rollSave(target, 'will', saveDC, undefined, ['death', 'emotion', 'fear', 'illusion', 'mental']);

  let message = `💀 ${actor.name} casts Phantasmal Killer${heightenedRank > 4 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Will Save: ${willSave.total} vs DC ${saveDC} → **${willSave.result.toUpperCase()}**`;

  if (willSave.result === 'critical-success') {
    message += `\n❌ ${target.name} sees through the illusion completely!`;
    return { success: true, message, saveResult: willSave.result, heightenedRank };
  }

  if (willSave.result === 'success') {
    const dmg = Math.floor(heightenedRank * 2);
    const damageCalc = calculateFinalDamage(dmg, 'mental', target);
    target.currentHealth -= damageCalc.finalDamage;
    message += `\n💥 ${target.name} takes ${damageCalc.finalDamage} mental damage (glancing fear).`;
    return { success: true, message, saveResult: willSave.result, damage: damageCalc.finalDamage, heightenedRank };
  }

  // Failure or critical failure -- make a fortitude save
  const fortSave = ctx.rollSave(target, 'fortitude', saveDC);
  message += `\nFortitude Save: ${fortSave.total} vs DC ${saveDC} → **${fortSave.result.toUpperCase()}**`;

  const baseDice = 8 + 2 * Math.max(0, heightenedRank - 4);
  let damage = 0;
  for (let i = 0; i < baseDice; i++) {
    damage += Math.floor(Math.random() * 6) + 1;
  }

  if (willSave.result === 'critical-failure' && fortSave.result === 'critical-failure') {
    // Death effect
    target.currentHealth = 0;
    target.dying = true;
    message += `\n💀💀 ${target.name} is KILLED by their worst fear!`;
    return { success: true, message, saveResult: 'death', heightenedRank };
  }

  if (fortSave.result === 'critical-success') damage = 0;
  else if (fortSave.result === 'success') damage = Math.floor(damage / 2);
  else if (fortSave.result === 'critical-failure') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'mental', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} mental`;

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'frightened', duration: 'permanent', value: willSave.result === 'critical-failure' ? 3 : 1, source: `phantasmal-killer-${actor.id}` });
  message += `\n😱 ${target.name} is **frightened ${willSave.result === 'critical-failure' ? 3 : 1}**!`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
  }

  return { success: true, message, saveResult: fortSave.result, damage: damageCalc.finalDamage, targetHealth: target.currentHealth, heightenedRank };
}

export function resolveFireShield(actor: Creature, heightenedRank: number = 4): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'fire-shield', duration: 10, value: 1, source: 'fire-shield' });

  return { success: true, message: `🔥🛡️ ${actor.name} casts Fire Shield! For the next minute, creatures that hit ${actor.name} in melee take 2d6 fire damage. Also grants resistance 5 to cold.`, heightenedRank };
}

export function resolveFreedomOfMovement(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  const target = targetId ? gameState.creatures.find((c: Creature) => c.id === targetId) : actor;
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  // Remove movement-restricting conditions
  target.conditions = target.conditions.filter((c) => !['immobilized', 'grabbed', 'restrained', 'paralyzed', 'slowed'].includes(c.name));
  target.conditions.push({ name: 'freedom-of-movement', duration: 10, value: 1, source: `freedom-of-movement-${actor.id}` });

  return { success: true, message: `🕊️ ${actor.name} casts Freedom of Movement on ${target.name}! They can't be immobilized, grabbed, restrained, or paralyzed for the duration.` };
}

export function resolveStoneskin(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 4): ActionResult {
  const target = targetId ? gameState.creatures.find((c: Creature) => c.id === targetId) : actor;
  if (!target) return { success: false, message: 'Target not found!' };

  const resistance = heightenedRank >= 6 ? 10 : 5;

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'stoneskin', duration: 20, value: resistance, source: `stoneskin-${actor.id}` });

  return { success: true, message: `🪨 ${actor.name} casts Stoneskin${heightenedRank > 4 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}! They gain resistance ${resistance} to physical damage.`, heightenedRank };
}

// =============================================================================
// RANK 5 SPELL RESOLVERS
// =============================================================================

export function resolveConeOfCold(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 5
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Cone of Cold!' };

  const aoeRadius = 12;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  const baseDice = 12 + 2 * Math.max(0, heightenedRank - 5);
  let baseDamage = 0;
  for (let i = 0; i < baseDice; i++) {
    baseDamage += Math.floor(Math.random() * 6) + 1;
  }

  if (targetsInAoE.length === 0) {
    return { success: true, message: `❄️ ${actor.name} casts Cone of Cold but no targets are in the area!`, heightenedRank };
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamage;
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'cold', target);
    target.currentHealth -= damageCalc.finalDamage;

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
  });

  return { success: true, message: `❄️ ${actor.name} casts Cone of Cold${heightenedRank > 5 ? ` (Rank ${heightenedRank})` : ''}! Base damage: ${baseDamage} cold (${baseDice}d6)`, results, heightenedRank };
}

export function resolveFlameStrike(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 5
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Flame Strike!' };

  const aoeRadius = 2;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  const baseDice = 8 + 2 * Math.max(0, heightenedRank - 5);
  let baseDamage = 0;
  for (let i = 0; i < baseDice; i++) {
    baseDamage += Math.floor(Math.random() * 6) + 1;
  }

  if (targetsInAoE.length === 0) {
    return { success: true, message: `🔥🌩️ ${actor.name} casts Flame Strike but no targets are in the area!`, heightenedRank };
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamage;
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    target.currentHealth -= damageCalc.finalDamage;

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
  });

  return { success: true, message: `🔥🌩️ ${actor.name} casts Flame Strike${heightenedRank > 5 ? ` (Rank ${heightenedRank})` : ''}! Pillar of fire deals ${baseDamage} fire damage (half fire, half spirit)`, results, heightenedRank };
}

export function resolveBanishment(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 5
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Banishment!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'will', saveDC, undefined, ['incapacitation']);

  let message = `🌀 ${actor.name} casts Banishment${heightenedRank > 5 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Will Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**`;

  if (saveRoll.result === 'critical-failure') {
    target.currentHealth = 0;
    target.dying = true;
    message += `\n🌀 ${target.name} is **banished** from this plane!`;
  } else if (saveRoll.result === 'failure') {
    if (!target.conditions) target.conditions = [];
    target.conditions.push({ name: 'stunned', duration: 1, value: 1, source: `banishment-${actor.id}` });
    message += `\n🌀 ${target.name} is partially banished and **stunned 1**!`;
  } else {
    message += `\n❌ ${target.name} resists banishment!`;
  }

  return { success: true, message, saveResult: saveRoll.result, heightenedRank };
}

export function resolveWallOfForce(actor: Creature, gameState: GameState, targetPosition?: Position, heightenedRank: number = 6): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Wall of Force!' };

  return {
    success: true,
    message: `🧱 ${actor.name} casts Wall of Force at (${targetPosition.x}, ${targetPosition.y})! An invisible wall of force blocks movement and attacks through the area. HP 60, immune to most damage.`,
    wallPosition: targetPosition,
    heightenedRank,
  };
}

export function resolveBreathOfLife(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 5): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Breath of Life!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.dying) {
    return { success: false, message: `${target.name} is not dying!` };
  }

  target.dying = false;
  if (target.conditions) {
    target.conditions = target.conditions.filter((c) => c.name !== 'dying');
  }

  const numDice = 4 + Math.max(0, heightenedRank - 5);
  let healing = 0;
  for (let i = 0; i < numDice; i++) {
    healing += Math.floor(Math.random() * 8) + 1;
  }

  target.currentHealth = Math.min(target.maxHealth, Math.max(1, healing));

  return {
    success: true,
    message: `💖 ${actor.name} casts Breath of Life${heightenedRank > 5 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}! They return to life with ${target.currentHealth} HP!`,
    targetHealth: target.currentHealth,
    healing,
    heightenedRank,
  };
}

// =============================================================================
// RANK 6+ SPELL RESOLVERS
// =============================================================================

export function resolveChainLightning(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 6
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Chain Lightning!' };
  const primaryTarget = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!primaryTarget) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const baseDice = 8 + Math.max(0, heightenedRank - 6);
  let baseDamage = 0;
  for (let i = 0; i < baseDice; i++) {
    baseDamage += Math.floor(Math.random() * 12) + 1;
  }

  // Primary target
  const primarySave = ctx.rollSave(primaryTarget, 'reflex', saveDC);
  let primaryDmg = baseDamage;
  if (primarySave.result === 'critical-success') primaryDmg = 0;
  else if (primarySave.result === 'success') primaryDmg = Math.floor(primaryDmg / 2);
  else if (primarySave.result === 'critical-failure') primaryDmg *= 2;

  const primaryCalc = calculateFinalDamage(primaryDmg, 'electricity', primaryTarget);
  primaryTarget.currentHealth -= primaryCalc.finalDamage;

  const results: ActionResult[] = [{
    targetId: primaryTarget.id,
    targetName: primaryTarget.name,
    saveResult: primarySave.result,
    finalDamage: primaryCalc.finalDamage,
    targetHealth: primaryTarget.currentHealth,
    isPrimary: true,
  }];

  if (primaryTarget.currentHealth <= 0 && !primaryTarget.dying) {
    initDying(primaryTarget);
  }

  // Chain to up to 4 secondary targets within 6 squares
  const secondaryTargets = gameState.creatures.filter((c: Creature) => {
    if (c.id === actor.id || c.id === primaryTarget.id) return false;
    if (c.isNPC === actor.isNPC) return false;
    const dx = c.positions.x - primaryTarget.positions.x;
    const dy = c.positions.y - primaryTarget.positions.y;
    return Math.sqrt(dx * dx + dy * dy) <= 6;
  }).slice(0, 4);

  secondaryTargets.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = Math.floor(baseDamage / 2); // Secondary targets take half base
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'electricity', target);
    target.currentHealth -= damageCalc.finalDamage;

    if (target.currentHealth <= 0 && !target.dying) {
      initDying(target);
    }

    results.push({
      targetId: target.id,
      targetName: target.name,
      saveResult: saveRoll.result,
      finalDamage: damageCalc.finalDamage,
      targetHealth: target.currentHealth,
      isPrimary: false,
    });
  });

  return {
    success: true,
    message: `⚡⚡ ${actor.name} casts Chain Lightning${heightenedRank > 6 ? ` (Rank ${heightenedRank})` : ''}! Primary: ${primaryCalc.finalDamage} electricity to ${primaryTarget.name}. Chains to ${secondaryTargets.length} additional targets.`,
    results,
    heightenedRank,
  };
}

export function resolveDisintegrate(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 6
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Disintegrate!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const spellAttackBonus = calculateSpellAttack(actor);
  const d20 = rollD20();
  const totalAttack = d20 + spellAttackBonus;
  const targetAC = calculateAC(target, actor.id, 'ranged');
  const result = getAttackResult(d20, totalAttack, targetAC);

  let message = `💥 ${actor.name} casts Disintegrate${heightenedRank > 6 ? ` (Rank ${heightenedRank})` : ''} at ${target.name}!\n`;
  message += `Spell Attack: ${d20} + ${spellAttackBonus} = ${totalAttack} vs AC ${targetAC}\n`;
  message += `Result: **${result.toUpperCase()}**`;

  if (result === 'failure' || result === 'critical-failure') {
    return { success: true, message, result, targetHealth: target.currentHealth };
  }

  const baseDice = 12 + 2 * Math.max(0, heightenedRank - 6);
  let damage = 0;
  for (let i = 0; i < baseDice; i++) {
    damage += Math.floor(Math.random() * 10) + 1;
  }
  if (result === 'critical-success') damage *= 2;

  // Fortitude save to reduce
  const saveDC = calculateSpellDC(actor);
  const fortSave = ctx.rollSave(target, 'fortitude', saveDC);
  message += `\nFortitude Save: ${fortSave.total} vs DC ${saveDC} → **${fortSave.result.toUpperCase()}**`;

  if (fortSave.result === 'critical-success') damage = 0;
  else if (fortSave.result === 'success') damage = Math.floor(damage / 2);

  const damageCalc = calculateFinalDamage(damage, 'force', target);
  target.currentHealth -= damageCalc.finalDamage;

  message += `\n💥 Damage: ${damageCalc.finalDamage} force`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
    if (fortSave.result === 'critical-failure') {
      message += `\n☠️ ${target.name} is completely disintegrated!`;
    }
  }

  return { success: true, message, result, saveResult: fortSave.result, targetHealth: target.currentHealth, damage: damageCalc.finalDamage, heightenedRank };
}

export function resolveTrueSeeing(actor: Creature, heightenedRank: number = 6): ActionResult {
  if (!actor.conditions) actor.conditions = [];
  actor.conditions.push({ name: 'true-seeing', duration: 100, value: 1, source: 'true-seeing' });

  return { success: true, message: `👁️ ${actor.name} casts True Seeing! They can see through illusions, invisibility, polymorphed forms, and into the Ethereal Plane for the duration.`, heightenedRank };
}

export function resolveRegenerate(actor: Creature, gameState: GameState, targetId?: string, heightenedRank: number = 7): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Regenerate!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  // Immediate healing
  const healing = 40;
  const previousHP = target.currentHealth;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + healing);
  const actualHealing = target.currentHealth - previousHP;

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'regenerate', duration: 10, value: 15, source: `regenerate-${actor.id}` });

  if (target.dying) {
    target.dying = false;
    target.conditions = target.conditions.filter((c) => c.name !== 'dying');
  }

  return {
    success: true,
    message: `💚 ${actor.name} casts Regenerate${heightenedRank > 7 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}! Heals ${actualHealing} HP immediately and regenerates 15 HP per round for 1 minute.`,
    targetHealth: target.currentHealth,
    healing: actualHealing,
    heightenedRank,
  };
}

export function resolveExecute(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heightenedRank: number = 7
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Execute!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  const saveDC = calculateSpellDC(actor);
  const saveRoll = ctx.rollSave(target, 'fortitude', saveDC, undefined, ['death']);

  let baseDamage = 70;
  if (heightenedRank > 7) baseDamage += (heightenedRank - 7) * 10;

  let damage = baseDamage;
  if (saveRoll.result === 'critical-success') damage = 0;
  else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
  else if (saveRoll.result === 'critical-failure') damage *= 2;

  const damageCalc = calculateFinalDamage(damage, 'void', target);
  target.currentHealth -= damageCalc.finalDamage;

  let message = `☠️ ${actor.name} casts Execute${heightenedRank > 7 ? ` (Rank ${heightenedRank})` : ''} on ${target.name}!\n`;
  message += `Fortitude Save: ${saveRoll.total} vs DC ${saveDC} → **${saveRoll.result.toUpperCase()}**\n`;
  message += `💥 Damage: ${damageCalc.finalDamage} void`;

  if (target.currentHealth <= 0 && !target.dying) {
    message += initDying(target);
    if (saveRoll.result === 'critical-failure') {
      message += `\n💀 ${target.name} is instantly slain!`;
    }
  }

  return { success: true, message, saveResult: saveRoll.result, damage: damageCalc.finalDamage, targetHealth: target.currentHealth, heightenedRank };
}

export function resolvePowerWordKill(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Power Word Kill!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  // Power Word Kill instantly kills a creature with 50 HP or fewer (no save)
  if (target.currentHealth <= 50) {
    target.currentHealth = 0;
    target.dying = true;
    return { success: true, message: `⚡💀 ${actor.name} speaks the Power Word Kill! ${target.name} (${target.currentHealth} HP) is **instantly killed**!` };
  }

  return { success: true, message: `⚡ ${actor.name} speaks the Power Word Kill, but ${target.name} has more than 50 HP and resists the effect!` };
}

export function resolveMeteorSwarm(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 9
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Meteor Swarm!' };

  const aoeRadius = 8;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  // 6d10 fire per meteor, 4 meteors, basic reflex save
  let totalBase = 0;
  for (let i = 0; i < 24; i++) { // 4 meteors x 6d10
    totalBase += Math.floor(Math.random() * 10) + 1;
  }

  if (targetsInAoE.length === 0) {
    return { success: true, message: `☄️ ${actor.name} casts Meteor Swarm but no targets are in the area!`, heightenedRank };
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = totalBase;
    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    target.currentHealth -= damageCalc.finalDamage;

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, status });
  });

  return { success: true, message: `☄️☄️☄️☄️ ${actor.name} casts Meteor Swarm! Four meteors rain down dealing ${totalBase} total fire damage!`, results, heightenedRank };
}

export function resolveForesight(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  const target = targetId ? gameState.creatures.find((c: Creature) => c.id === targetId) : actor;
  if (!target) return { success: false, message: 'Target not found!' };

  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'foresight', duration: 100, value: 2, source: `foresight-${actor.id}` });

  return { success: true, message: `🔮 ${actor.name} casts Foresight on ${target.name}! They gain +2 status bonus to initiative and are never off-guard. Duration: until your next daily preparations.` };
}

export function resolveMaze(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string
): ActionResult {
  if (!targetId) return { success: false, message: 'No target specified for Maze!' };
  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found!' };

  // No save — target is banished into an extradimensional maze
  if (!target.conditions) target.conditions = [];
  target.conditions.push({ name: 'maze', duration: 'sustained', value: 1, source: `maze-${actor.id}` });

  return {
    success: true,
    message: `🌀 ${actor.name} casts Maze on ${target.name}! They are trapped in an extradimensional maze! They must use Survival DC 27 to escape each round. (Sustained, up to 1 minute)`,
  };
}

export function resolveSunburst(
  ctx: SpellActionContext,
  actor: Creature,
  gameState: GameState,
  targetPosition?: Position,
  heightenedRank: number = 7
): ActionResult {
  if (!targetPosition) return { success: false, message: 'No target position for Sunburst!' };

  const aoeRadius = 12;
  const saveDC = calculateSpellDC(actor);
  const targetsInAoE = gameState.creatures.filter((creature: Creature) => {
    if (creature.id === actor.id) return false;
    const dx = creature.positions.x - targetPosition.x;
    const dy = creature.positions.y - targetPosition.y;
    return Math.sqrt(dx * dx + dy * dy) <= aoeRadius;
  });

  const baseDice = 8 + 2 * Math.max(0, heightenedRank - 7);
  let baseDamage = 0;
  for (let i = 0; i < baseDice; i++) {
    baseDamage += Math.floor(Math.random() * 10) + 1;
  }

  if (targetsInAoE.length === 0) {
    return { success: true, message: `☀️ ${actor.name} casts Sunburst but no targets are in the area!`, heightenedRank };
  }

  const results: ActionResult[] = [];
  targetsInAoE.forEach((target: Creature) => {
    const saveRoll = ctx.rollSave(target, 'reflex', saveDC);
    let damage = baseDamage;
    const isUndead = target.traits?.includes('undead');
    if (isUndead) damage = Math.floor(damage * 1.5);

    if (saveRoll.result === 'critical-success') damage = 0;
    else if (saveRoll.result === 'success') damage = Math.floor(damage / 2);
    else if (saveRoll.result === 'critical-failure') damage *= 2;

    const damageCalc = calculateFinalDamage(damage, 'fire', target);
    target.currentHealth -= damageCalc.finalDamage;

    if (saveRoll.result === 'failure' || saveRoll.result === 'critical-failure') {
      if (!target.conditions) target.conditions = [];
      target.conditions.push({ name: 'blinded', duration: 'permanent', value: 1, source: `sunburst-${actor.id}` });
    }

    let status = '';
    if (target.currentHealth <= 0 && !target.dying) {
      status = initDying(target);
    }

    results.push({ targetId: target.id, targetName: target.name, saveResult: saveRoll.result, finalDamage: damageCalc.finalDamage, targetHealth: target.currentHealth, isUndead, status });
  });

  return { success: true, message: `☀️ ${actor.name} casts Sunburst${heightenedRank > 7 ? ` (Rank ${heightenedRank})` : ''}! Blinding radiance deals ${baseDamage} fire damage!`, results, heightenedRank };
}
