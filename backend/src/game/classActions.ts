// 
// classActions.ts  Extracted class feature methods from RulesEngine
// Phase 14 refactor: Psychic, Magus class features + archetype helpers
// 

import { Creature, GameState, CreatureWeapon, getSpell, ActionResult } from 'pf2e-shared';
import { applyBattleForm, revertBattleForm, BattleFormStats } from './subsystems';

type StrikeActionResult = ActionResult & {
  hit?: boolean;
  damage?: number;
};

export interface ClassActionContext {
  resolveSelectedWeapon: (actor: Creature, weaponId?: string) => CreatureWeapon | null;
  resolveStrike: (actor: Creature, gameState: GameState, targetId?: string, weaponId?: string, heroPointsSpent?: number) => StrikeActionResult;
  hasFeat: (creature: Creature, featName: string) => boolean;
}

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

export function resolveUnleashPsyche(actor: Creature, gameState: GameState): ActionResult {
  if (actor.unleashPsycheUsedThisEncounter) {
    return { success: false, message: `${actor.name} has already Unleashed their Psyche this encounter.` , errorCode: 'VALIDATION_FAILED' };
  }

  if (actor.unleashPsycheActive) {
    return { success: false, message: `${actor.name}'s Psyche is already unleashed!` , errorCode: 'VALIDATION_FAILED' };
  }

  if (actor.characterClass !== 'Psychic') {
    return { success: false, message: `${actor.name} is not a Psychic.` , errorCode: 'CLASS_MISMATCH' };
  }

  actor.unleashPsycheActive = true;
  actor.unleashPsycheRoundsLeft = 2;
  actor.unleashPsycheUsedThisEncounter = true;

  const bonusValue = 2;
  actor.bonuses = actor.bonuses ?? [];
  actor.bonuses.push({
    source: 'Unleash Psyche',
    type: 'status',
    value: bonusValue,
    applyTo: 'spell-damage',
  });

  return {
    success: true,
    message: `🧠 ${actor.name} Unleashes their Psyche! For 2 rounds, spell damage gains a status bonus equal to double the spell's level. After, they'll be stupefied 1 for 2 rounds.`,
    actionCost: 0,
  };
}

export function resolveSpellstrike(
  ctx: ClassActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
  spellId?: string,
  heroPointsSpent: number = 0
): ActionResult {
  const hasSpellstrike = actor.characterClass === 'Magus' || hasNamedFeat(actor, 'spellstrike');
  if (!hasSpellstrike) {
    return { success: false, message: `${actor.name} does not have access to Spellstrike.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  const spellstrikeExpended = actor.conditions?.some((c) => c.name === 'spellstrike-expended');
  if (spellstrikeExpended) {
    return {
      success: false,
      message: `${actor.name}'s Spellstrike is expended. Use Recharge Spellstrike first.`,
      errorCode: 'SPELLSTRIKE_EXPENDED',
    };
  }

  if (!targetId) return { success: false, message: 'Spellstrike requires a target.' , errorCode: 'VALIDATION_FAILED' };
  if (!weaponId) return { success: false, message: 'Spellstrike requires a weapon.' , errorCode: 'VALIDATION_FAILED' };
  if (!spellId) return { success: false, message: 'Spellstrike requires a spell to be selected.' , errorCode: 'VALIDATION_FAILED' };

  const target = gameState.creatures.find((c: Creature) => c.id === targetId);
  if (!target) return { success: false, message: 'Target not found.' , errorCode: 'TARGET_NOT_FOUND' };

  const actorSpellIds = (actor.spells ?? [])
    .map((s: string) => {
      if (typeof s === 'string') return s;
      if (s && typeof s.id === 'string') return s.id;
      return null;
    })
    .filter((s: string | null): s is string => !!s);

  if (!actorSpellIds.includes(spellId)) {
    return { success: false, message: `Spell "${spellId}" not found in ${actor.name}'s spells.` , errorCode: 'TARGET_NOT_FOUND' };
  }

  const spell = getSpell(spellId);
  if (!spell) {
    return { success: false, message: `Spell data for "${spellId}" is unavailable.` , errorCode: 'VALIDATION_FAILED' };
  }

  const spellActionCost = spell.cost || 1;
  if (spellActionCost > 2) {
    return {
      success: false,
      message: `Spellstrike can only combine 1-2 action spells. "${spell.name}" costs ${spellActionCost} actions.`,
      errorCode: 'VALIDATION_FAILED',
    };
  }

  const selectedWeapon = ctx.resolveSelectedWeapon(actor, weaponId);
  if (!selectedWeapon) {
    return { success: false, message: 'Spellstrike requires a valid weapon.' , errorCode: 'VALIDATION_FAILED' };
  }

  if (selectedWeapon.range && selectedWeapon.range > 0) {
    return { success: false, message: `Spellstrike requires a melee weapon, but ${selectedWeapon.display} is ranged.` , errorCode: 'VALIDATION_FAILED' };
  }

  const strikeResult = ctx.resolveStrike(actor, gameState, targetId, weaponId, heroPointsSpent);
  const spellStruck = {
    spellId,
    spellName: spell.name,
    spellActionCost,
  };

  actor.conditions = actor.conditions ?? [];
  if (!actor.conditions.some((c) => c.name === 'spellstrike-expended')) {
    actor.conditions.push({
      name: 'spellstrike-expended',
      duration: 'permanent',
      source: 'spellstrike',
    });
  }

  if (!strikeResult?.success) {
    return {
      ...strikeResult,
      message: `⚔️ ${actor.name} channels ${spell.name} with Spellstrike, but the Strike fails. ${strikeResult?.message ?? ''}`,
      actionCost: 2,
      spellstrikeExpended: true,
      spellStruck,
    };
  }

  return {
    ...strikeResult,
    success: true,
    message: `⚔️ ${actor.name} uses Spellstrike! ${spell.name} is delivered through the Strike against ${target.name}. ${strikeResult?.message ?? ''}`,
    actionCost: 2,
    spellstrikeExpended: true,
    spellStruck,
  };
}

export function resolveRechargeSpellstrike(actor: Creature): ActionResult {
  const hasSpellstrike = actor.characterClass === 'Magus' || hasNamedFeat(actor, 'spellstrike');
  if (!hasSpellstrike) {
    return { success: false, message: `${actor.name} does not have access to Spellstrike.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  const hasExpended = actor.conditions?.some((c) => c.name === 'spellstrike-expended');
  if (!hasExpended) {
    return {
      success: false,
      message: `${actor.name}'s Spellstrike is already ready.`,
      errorCode: 'SPELLSTRIKE_ALREADY_READY',
    };
  }

  actor.conditions = (actor.conditions ?? []).filter((c) => c.name !== 'spellstrike-expended');
  return {
    success: true,
    message: `✨ ${actor.name} recharges Spellstrike and can use it again.`,
    actionCost: 1,
    spellstrikeRecharged: true,
  };
}

export function resolveArcaneCascade(actor: Creature): ActionResult {
  const hasArcaneCascade = actor.characterClass === 'Magus' || hasNamedFeat(actor, 'arcane cascade');
  if (!hasArcaneCascade) {
    return { success: false, message: `${actor.name} does not have access to Arcane Cascade.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  const inStance = actor.conditions && actor.conditions.some((c) => c.name === 'Arcane Cascade');
  if (inStance) {
    return {
      success: false,
      message: `${actor.name} is already in Arcane Cascade stance.`,
      errorCode: 'ALREADY_IN_STANCE',
    };
  }

  actor.conditions = actor.conditions ?? [];
  actor.conditions.push({
    name: 'Arcane Cascade',
    duration: 'permanent',
    value: 1,
  });

  return {
    success: true,
    message: `✨ ${actor.name} enters Arcane Cascade stance! Melee Strikes gain +1 force damage (increasing with weapon specialization).`,
    actionCost: 1,
    stanceActive: 'arcane-cascade',
  };
}

export function hasDedication(ctx: ClassActionContext, creature: Creature, dedicationName: string): boolean {
  const lowerName = dedicationName.toLowerCase().trim();

  if (creature.dedications?.some((d) => d.name.toLowerCase().trim() === lowerName)) {
    return true;
  }

  return ctx.hasFeat(creature, `${dedicationName} dedication`);
}

export function hasPsychicUnboundStep(ctx: ClassActionContext, creature: Creature): boolean {
  const psychicDed = creature.dedications?.find((d) => d.name.toLowerCase() === 'psychic');
  if (psychicDed?.consciousMind?.toLowerCase().includes('unbound step')) {
    return true;
  }

  if (creature.focusSpells?.some((s) => s.name.toLowerCase() === 'warp step' || s.name.toLowerCase() === 'warp-step')) {
    return true;
  }

  return hasDedication(ctx, creature, 'psychic');
}

export function canAmpCantrip(creature: Creature, spellName: string): boolean {
  const focusSpell = creature.focusSpells?.find(
    (s) =>
      s.name.toLowerCase().replace(/\s+/g, '-') === spellName.toLowerCase() ||
      s.name.toLowerCase() === spellName.toLowerCase().replace(/-/g, ' ')
  );
  return !!(focusSpell?.ampable && (creature.focusPoints ?? 0) > 0);
}

export function consumeFocusPointForAmp(creature: Creature): boolean {
  if ((creature.focusPoints ?? 0) <= 0) return false;
  creature.focusPoints = (creature.focusPoints ?? 1) - 1;
  return true;
}

// ──────────────────────────────────────────────────────────
// BARBARIAN: RAGE
// ──────────────────────────────────────────────────────────

export function resolveRage(actor: Creature): ActionResult {
  if (actor.characterClass !== 'Barbarian' && !hasNamedFeat(actor, 'rage')) {
    return { success: false, message: `${actor.name} does not have the Rage ability.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  if (actor.rageActive) {
    return { success: false, message: `${actor.name} is already raging!` , errorCode: 'ALREADY_IN_STATE' };
  }

  if (actor.rageUsedThisEncounter) {
    // PASSIVE BARBARIAN FEAT: Second Wind (L2) — can Rage again immediately after first Rage ends
    // After this second Rage ends, fatigued for 1 round
    if (hasNamedFeat(actor, 'second wind') && !actor.secondWindUsed) {
      actor.secondWindUsed = true;
      // Allow the Rage to proceed — fatigued condition applied when this Rage ends
    } else {
      return { success: false, message: `${actor.name} cannot Rage again yet (1-minute cooldown after ending Rage).` , errorCode: 'VALIDATION_FAILED' };
    }
  }

  actor.rageActive = true;
  actor.rageRoundsLeft = 10; // 1 minute = 10 rounds

  // PF2e Remaster (Player Core 2): Gain temp HP = level + Con modifier
  const conMod = actor.abilities ? Math.floor((actor.abilities.constitution - 10) / 2) : 0;
  const tempHP = actor.level + conMod;
  actor.temporaryHealth = (actor.temporaryHealth ?? 0) + tempHP;

  // +2 melee damage (halved for agile weapons — tracked at damage resolution time)
  // No AC penalty in Remaster (Legacy had -1 AC, removed in Player Core 2)
  actor.bonuses = actor.bonuses ?? [];
  actor.bonuses.push({
    source: 'Rage',
    type: 'status',
    value: 2,
    applyTo: 'melee-damage',
  });

  // Cannot use concentrate actions (except rage trait actions and Seek)
  // Mighty Rage (L11): class DC → expert (handled in proficiency progression),
  // + when using Quick-Tempered, first Strike on first turn deals extra Rage damage
  const hasMightyRage = hasNamedFeat(actor, 'mighty rage') || (actor.level >= 11 && actor.characterClass === 'Barbarian');
  const mightyMsg = hasMightyRage ? ' Mighty Rage: first Strike this turn deals extra Rage damage!' : '';

  return {
    success: true,
    message: `🔥 ${actor.name} enters a RAGE! Gains ${tempHP} temp HP, +2 damage to melee Strikes (+1 for agile). Cannot use concentrate actions.${mightyMsg}`,
    actionCost: 1,
    rageActive: true,
    temporaryHP: tempHP,
  };
}

export function resolveEndRage(actor: Creature): ActionResult {
  if (!actor.rageActive) {
    return { success: false, message: `${actor.name} is not raging.` , errorCode: 'NOT_IN_STATE' };
  }

  actor.rageActive = false;
  actor.rageRoundsLeft = undefined;
  actor.rageUsedThisEncounter = true; // PF2e Remaster: can't Rage again for 1 minute

  // Lose remaining temp HP from Rage (PF2e Remaster rule)
  actor.temporaryHealth = 0;

  // Remove rage bonuses (no AC penalty in Remaster, so only remove damage bonus)
  actor.bonuses = (actor.bonuses ?? []).filter((b) => b.source !== 'Rage');
  actor.penalties = (actor.penalties ?? []).filter((p) => p.source !== 'Rage');

  // Remove Come and Get Me condition when rage ends
  actor.conditions = (actor.conditions ?? []).filter(c => c.name !== 'come-and-get-me');

  // Second Wind: if this was the second rage, apply fatigued 1 round
  let secondWindMsg = '';
  if (actor.secondWindUsed) {
    if (!actor.conditions) actor.conditions = [];
    actor.conditions.push({ name: 'fatigued', duration: 1, value: 1, source: 'second-wind' });
    secondWindMsg = ' Fatigued for 1 round (Second Wind).';
  }

  // Note: PF2e Remaster removed the fatigued condition after rage.
  // You simply cannot Rage again for 1 minute (10 rounds).

  return {
    success: true,
    message: `${actor.name}'s rage ends. Temp HP from Rage lost. Cannot Rage again for 1 minute.${secondWindMsg}`,
    actionCost: 0,
    rageActive: false,
  };
}

// ──────────────────────────────────────────────────────────
// MONK: FLURRY OF BLOWS
// ──────────────────────────────────────────────────────────

export function resolveFlurryOfBlows(
  ctx: ClassActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  heroPointsSpent: number = 0
): ActionResult {
  const hasFlurry = actor.characterClass === 'Monk' || hasNamedFeat(actor, 'flurry of blows');
  if (!hasFlurry) {
    return { success: false, message: `${actor.name} does not have Flurry of Blows.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  if (!targetId) {
    return { success: false, message: 'Flurry of Blows requires a target.' , errorCode: 'VALIDATION_FAILED' };
  }

  const target = gameState.creatures?.find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Find an unarmed strike in the actor's weapon inventory
  const unarmedWeapon = actor.weaponInventory?.find(
    (ws) => ws.weapon.isNatural || ws.weapon.id === 'fist' || ws.weapon.id === 'unarmed'
  )?.weapon;

  const weaponId = unarmedWeapon?.id || 'fist';

  // Make two unarmed Strikes — these use the current MAP but together count as only 1 attack for MAP
  const savedMAP = actor.attacksMadeThisTurn;

  const strike1 = ctx.resolveStrike(actor, gameState, targetId, weaponId, heroPointsSpent);

  // Reset MAP to what it was before the first strike + 1 (so both strikes use the same MAP progression)
  actor.attacksMadeThisTurn = savedMAP + 1;

  const strike2 = ctx.resolveStrike(actor, gameState, targetId, weaponId, 0);

  // PF2e Remaster: both strikes count for MAP normally (each is an attack)
  // After Flurry, MAP has increased by 2 from the two Strikes
  actor.attacksMadeThisTurn = savedMAP + 2;

  const messages: string[] = ['👊 Flurry of Blows!'];
  if (strike1?.message) messages.push(`  Strike 1: ${strike1.message}`);
  if (strike2?.message) messages.push(`  Strike 2: ${strike2.message}`);

  return {
    success: true,
    message: messages.join('\n'),
    actionCost: 1,
    strikes: [strike1, strike2],
  };
}

// ──────────────────────────────────────────────────────────
// RANGER: HUNT PREY
// ──────────────────────────────────────────────────────────

export function resolveHuntPrey(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  const hasHuntPrey = actor.characterClass === 'Ranger' || hasNamedFeat(actor, 'hunt prey');
  if (!hasHuntPrey) {
    return { success: false, message: `${actor.name} does not have Hunt Prey.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  if (!targetId) {
    return { success: false, message: 'Hunt Prey requires a target creature.' , errorCode: 'VALIDATION_FAILED' };
  }

  const target = gameState.creatures?.find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target creature not found.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  actor.huntedPreyId = targetId;

  // Apply hunter's edge bonuses
  const edge = actor.huntersEdge || 'precision';
  let edgeMsg = '';
  switch (edge) {
    case 'flurry':
      edgeMsg = 'Flurry: Reduced MAP (-4/-8 instead of -5/-10) against hunted prey.';
      break;
    case 'precision':
      edgeMsg = 'Precision: First hit per round against hunted prey deals 1d8 extra precision damage.';
      break;
    case 'outwit':
      edgeMsg = 'Outwit: +2 circumstance bonus to Deception, Intimidation, Stealth, and Recall Knowledge against hunted prey.';
      break;
  }

  return {
    success: true,
    message: `🎯 ${actor.name} designates ${target.name} as their hunted prey! ${edgeMsg}`,
    actionCost: 1,
    huntedPreyId: targetId,
  };
}

// ──────────────────────────────────────────────────────────
// CHAMPION: CHAMPION'S REACTION (Retributive Strike / Liberating Step / Glimpse of Redemption)
// ──────────────────────────────────────────────────────────

export function resolveChampionReaction(
  actor: Creature,
  gameState: GameState,
  targetId?: string
): ActionResult {
  if (actor.characterClass !== 'Champion') {
    return { success: false, message: `${actor.name} is not a Champion.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (actor.reactionUsed) {
    return { success: false, message: `${actor.name} has already used their reaction this round.` , errorCode: 'REACTION_USED' };
  }

  const cause = actor.championCause || 'paladin';
  actor.reactionUsed = true;

  const ally = targetId ? gameState.creatures?.find((c: Creature) => c.id === targetId) : null;

  switch (cause) {
    case 'paladin':
      // Retributive Strike: ally gains resistance equal to 2 + champion level
      // Champion makes a Strike against the triggering enemy
      return {
        success: true,
        message: `⚔️ ${actor.name} uses Retributive Strike! ${ally ? `${ally.name} gains resistance ${2 + actor.level} against the triggering damage.` : ''} ${actor.name} can make a melee Strike against the attacker if in reach.`,
        actionCost: 'reaction',
        damageReduction: 2 + actor.level,
        cause: 'paladin',
      };

    case 'liberator':
      // Liberating Step: ally can Step as a free action and gains resistance
      return {
        success: true,
        message: `🛡️ ${actor.name} uses Liberating Step! ${ally ? `${ally.name} gains resistance ${2 + actor.level} against the triggering damage and can Step as a free action.` : 'Ally gains damage resistance and can Step.'}`,
        actionCost: 'reaction',
        damageReduction: 2 + actor.level,
        cause: 'liberator',
        allyCanStep: true,
      };

    case 'redeemer':
      // Glimpse of Redemption: attacker must choose to deal half damage or take enfeebled 2
      return {
        success: true,
        message: `✨ ${actor.name} uses Glimpse of Redemption! The attacker must choose: deal no damage to ${ally?.name || 'the ally'}, or deal full damage and become enfeebled 2 until end of their next turn.`,
        actionCost: 'reaction',
        cause: 'redeemer',
        enfeebledValue: 2,
      };
  }
}

// ──────────────────────────────────────────────────────────
// MONK: STUNNING FIST (free action on crit with Flurry)
// ──────────────────────────────────────────────────────────

export function resolveStunningFist(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  // PF2e Remaster: Stunning Fist is a Level 4 Monk feat, not a default class feature
  if (!hasNamedFeat(actor, 'stunning fist')) {
    return { success: false, message: `${actor.name} does not have the Stunning Fist feat.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  if (!targetId) {
    return { success: false, message: 'Stunning Fist requires a target.' , errorCode: 'VALIDATION_FAILED' };
  }

  const target = gameState.creatures?.find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Target must attempt a Fortitude save vs class DC
  // On failure: stunned 1. On critical failure: stunned 3.
  return {
    success: true,
    message: `💫 ${actor.name} uses Stunning Fist! ${target.name} must make a Fortitude save or be stunned 1 (stunned 3 on critical failure).`,
    actionCost: 'free',
    requiresSave: 'fortitude',
    saveEffects: {
      criticalSuccess: 'No effect',
      success: 'No effect',
      failure: 'Stunned 1',
      criticalFailure: 'Stunned 3',
    },
  };
}

// ──────────────────────────────────────────────────────────
// CHAMPION: LAY ON HANDS (focus spell)
// ──────────────────────────────────────────────────────────

export function resolveLayOnHands(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if (actor.characterClass !== 'Champion' && !hasNamedFeat(actor, 'lay on hands')) {
    return { success: false, message: `${actor.name} does not have Lay on Hands.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  if ((actor.focusPoints ?? 0) <= 0) {
    return { success: false, message: `${actor.name} has no focus points remaining.` , errorCode: 'NO_FOCUS_POINTS' };
  }

  if (!targetId) {
    return { success: false, message: 'Lay on Hands requires a target.' , errorCode: 'VALIDATION_FAILED' };
  }

  const target = gameState.creatures?.find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Spend focus point
  actor.focusPoints = (actor.focusPoints ?? 1) - 1;

  // Healing: 6 HP per spell rank (heightened = half character level, minimum 1)
  const spellRank = Math.max(1, Math.ceil(actor.level / 2));
  const healAmount = 6 * spellRank;

  // Check if target is undead (would take damage instead)
  const isUndead = target.damageImmunities?.includes('positive') ||
    target.traits?.includes('undead');

  if (isUndead) {
    // Deal vitality (positive) damage to undead
    const damage = healAmount;
    target.currentHealth = Math.max(0, target.currentHealth - damage);
    return {
      success: true,
      message: `✨ ${actor.name} channels Lay on Hands against undead ${target.name}, dealing ${damage} vitality damage! (Rank ${spellRank})`,
      actionCost: 1,
      damage,
      focusPointSpent: true,
    };
  }

  // Heal the target
  const actualHeal = Math.min(healAmount, target.maxHealth - target.currentHealth);
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + healAmount);

  return {
    success: true,
    message: `✨ ${actor.name} uses Lay on Hands on ${target.name}, healing ${actualHeal} HP! (Rank ${spellRank})`,
    actionCost: 1,
    healAmount: actualHeal,
    focusPointSpent: true,
  };
}

// ──────────────────────────────────────────────────────────
// KINETICIST CLASS ACTIONS
// Reference: https://2e.aonprd.com/Classes.aspx?ID=23
// ──────────────────────────────────────────────────────────

/**
 * Channel Elements (1 action)
 * Activates the kineticist's kinetic aura (10-foot emanation).
 * Resets the overflow state. Can optionally include a 1-action Elemental Blast.
 */
export function resolveChannelElements(actor: Creature): ActionResult {
  if (actor.characterClass !== 'Kineticist') {
    return { success: false, message: `${actor.name} is not a Kineticist.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (actor.kineticAuraActive) {
    return { success: false, message: `${actor.name}'s kinetic aura is already active.` , errorCode: 'ALREADY_IN_STATE' };
  }

  actor.kineticAuraActive = true;
  actor.overflowUsedThisRound = false;
  actor.gatheredElement = true;

  const element = actor.kineticElement ?? 'unknown';

  return {
    success: true,
    message: `🌀 ${actor.name} Channels Elements! Their kinetic aura activates (${element}, 10-foot emanation). They can now use impulses.`,
    actionCost: 1,
  };
}

/**
 * Dismiss Kinetic Aura (free action or overflow consequence)
 */
export function resolveDismissAura(actor: Creature): ActionResult {
  if (actor.characterClass !== 'Kineticist') {
    return { success: false, message: `${actor.name} is not a Kineticist.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (!actor.kineticAuraActive) {
    return { success: false, message: `${actor.name}'s kinetic aura is not active.` , errorCode: 'VALIDATION_FAILED' };
  }

  actor.kineticAuraActive = false;
  actor.gatheredElement = false;

  return {
    success: true,
    message: `🌀 ${actor.name} dismisses their kinetic aura.`,
    actionCost: 0,
  };
}

/**
 * Elemental Blast (1 or 2 actions)
 * Ranged or melee impulse attack with element-appropriate damage.
 * 1-action: basic blast. 2-action: adds CON modifier to damage.
 * Damage dice scale: 1 die at L1, +1 die every 4 levels (L5, L9, L13, L17).
 */
export function resolveElementalBlast(
  ctx: ClassActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  twoAction: boolean = false,
  heroPointsSpent: number = 0
): ActionResult {
  if (actor.characterClass !== 'Kineticist') {
    return { success: false, message: `${actor.name} is not a Kineticist.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (!actor.kineticAuraActive) {
    return { success: false, message: `${actor.name}'s kinetic aura is not active. Use Channel Elements first.` , errorCode: 'VALIDATION_FAILED' };
  }

  if (!targetId) {
    return { success: false, message: 'Elemental Blast requires a target.' , errorCode: 'VALIDATION_FAILED' };
  }

  const target = gameState.creatures?.find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: 'Target not found.' , errorCode: 'TARGET_NOT_FOUND' };
  }

  const element = actor.kineticElement ?? 'fire';
  const conMod = Math.floor(((actor.abilities?.constitution ?? 10) - 10) / 2);

  // Element damage properties
  const elementData: Record<string, { dieSize: number; damageType: string; range: number }> = {
    air: { dieSize: 6, damageType: 'electricity', range: 60 },
    earth: { dieSize: 8, damageType: 'bludgeoning', range: 30 },
    fire: { dieSize: 6, damageType: 'fire', range: 60 },
    metal: { dieSize: 8, damageType: 'slashing', range: 30 },
    water: { dieSize: 8, damageType: 'cold', range: 30 },
    wood: { dieSize: 8, damageType: 'vitality', range: 30 },
  };

  const elData = elementData[element.toLowerCase()] ?? elementData.fire;

  // Dice scale: 1 die + 1 per 4 levels after 1st
  const numDice = 1 + Math.floor((actor.level - 1) / 4);

  // Roll damage
  let totalDamage = 0;
  for (let i = 0; i < numDice; i++) {
    totalDamage += Math.floor(Math.random() * elData.dieSize) + 1;
  }

  // 2-action version adds CON modifier to damage
  if (twoAction) {
    totalDamage += conMod;
  }

  // Weapon specialization bonus (Level 13+)
  if (actor.level >= 13) {
    totalDamage += actor.level >= 15 ? 4 : 2; // Greater at 15+
  }

  // Make impulse attack roll (uses class DC - 10 as attack bonus)
  const profBonus = actor.level + (actor.level >= 11 ? 4 : 2); // Trained(+2) → Expert(+4) at L11
  const attackBonus = profBonus + conMod;
  const d20Roll = Math.floor(Math.random() * 20) + 1;
  const attackTotal = d20Roll + attackBonus;
  const targetAC = target.armorClass ?? 10;

  let hit = false;
  let critical = false;

  if (d20Roll === 20 || attackTotal >= targetAC + 10) {
    hit = true;
    critical = true;
    totalDamage *= 2;
  } else if (d20Roll === 1 || attackTotal < targetAC - 10) {
    hit = false;
  } else if (attackTotal >= targetAC) {
    hit = true;
  }

  const actionCost = twoAction ? 2 : 1;
  const actionLabel = twoAction ? '(2-action, +CON)' : '(1-action)';

  if (!hit) {
    return {
      success: true,
      message: `💨 ${actor.name} hurls an Elemental Blast ${actionLabel} at ${target.name} — Miss! (Roll: ${d20Roll}+${attackBonus}=${attackTotal} vs AC ${targetAC})`,
      actionCost,
      hit: false,
    };
  }

  target.currentHealth = Math.max(0, target.currentHealth - totalDamage);

  const critLabel = critical ? ' CRITICAL HIT!' : '';
  return {
    success: true,
    message: `🔥 ${actor.name}'s Elemental Blast ${actionLabel} hits ${target.name}!${critLabel} ${totalDamage} ${elData.damageType} damage (${numDice}d${elData.dieSize}${twoAction ? `+${conMod}` : ''}). Roll: ${d20Roll}+${attackBonus}=${attackTotal} vs AC ${targetAC}`,
    actionCost,
    damage: totalDamage,
    damageType: elData.damageType,
    hit: true,
    critical,
  };
}

// ──────────────────────────────────────────────────────────
// DRUID CLASS ACTIONS
// Reference: https://2e.aonprd.com/Classes.aspx?ID=34
// ──────────────────────────────────────────────────────────

/**
 * Wild Shape battle form definitions.
 * Converted to BattleFormStats for the polymorph subsystem.
 * Reference: https://2e.aonprd.com/Spells.aspx?ID=442 (Animal Form)
 */
const WILD_SHAPE_FORMS: Record<string, BattleFormStats & { description: string }> = {
  // Pest Form (Focus Spell — Untamed Shift, L1)
  pest: {
    formName: 'Pest Form',
    size: 'tiny',
    speed: 20,
    durationRounds: 100, // 10 minutes
    description: 'A Tiny animal (cat, insect, lizard, etc.). Cannot attack. +1 Stealth.',
  },
  // Animal Form (Rank 2 spell — base form)
  animal: {
    formName: 'Animal Form',
    size: 'medium',
    tempHp: 5,
    speed: 30,
    armorClass: 16, // + level applied at transform time
    attackBonus: 9,
    damageBonus: 1,
    attacks: [
      { id: 'animal-jaws', display: 'Jaws', attackType: 'melee', damageDice: '2d8', damageType: 'bludgeoning', hands: 0, isNatural: true, traits: [] },
      { id: 'animal-claw', display: 'Claw', attackType: 'melee', damageDice: '1d10', damageType: 'slashing', hands: 0, isNatural: true, traits: ['agile'] },
    ],
    durationRounds: 10,
    description: 'A Medium or Small battle form animal. Attacks use battle form stats.',
  },
  // Insect Form (Rank 4 spell)
  insect: {
    formName: 'Insect Form',
    size: 'medium',
    tempHp: 10,
    speed: 25,
    armorClass: 20,
    attackBonus: 13,
    damageBonus: 5,
    attacks: [
      { id: 'insect-mandibles', display: 'Mandibles', attackType: 'melee', damageDice: '2d8', damageType: 'piercing', hands: 0, isNatural: true, traits: [] },
    ],
    durationRounds: 10,
    description: 'A Medium insect such as a giant ant, mantis, or scorpion.',
  },
  // Elemental Form (Rank 5 spell)
  elemental: {
    formName: 'Elemental Form',
    size: 'medium',
    tempHp: 10,
    speed: 30,
    armorClass: 22,
    attackBonus: 15,
    damageBonus: 7,
    attacks: [
      { id: 'elemental-slam', display: 'Slam', attackType: 'melee', damageDice: '2d10', damageType: 'bludgeoning', hands: 0, isNatural: true, traits: [] },
    ],
    durationRounds: 10,
    description: 'A Medium elemental (fire, water, earth, air).',
  },
  // Plant Form (Rank 5 spell)
  plant: {
    formName: 'Plant Form',
    size: 'large',
    tempHp: 12,
    speed: 25,
    armorClass: 22,
    attackBonus: 15,
    damageBonus: 7,
    attacks: [
      { id: 'plant-branch', display: 'Branch', attackType: 'melee', damageDice: '2d10', damageType: 'bludgeoning', hands: 0, isNatural: true, traits: ['reach'] },
    ],
    durationRounds: 10,
    description: 'A Large plant creature like a shambling mound or arboreal.',
  },
  // Dragon Form (Rank 6 spell)
  dragon: {
    formName: 'Dragon Form',
    size: 'large',
    tempHp: 15,
    speed: 40,
    flySpeed: 100,
    armorClass: 25,
    attackBonus: 18,
    damageBonus: 9,
    attacks: [
      { id: 'dragon-jaws', display: 'Jaws', attackType: 'melee', damageDice: '2d12', damageType: 'piercing', hands: 0, isNatural: true, traits: ['reach'] },
      { id: 'dragon-claw', display: 'Claw', attackType: 'melee', damageDice: '2d10', damageType: 'slashing', hands: 0, isNatural: true, traits: ['agile'] },
    ],
    durationRounds: 10,
    description: 'A Large dragon with a breath weapon and flight.',
  },
  // Monstrosity Form (Rank 8 spell)
  monstrosity: {
    formName: 'Monstrosity Form',
    size: 'huge',
    tempHp: 20,
    speed: 40,
    armorClass: 28,
    attackBonus: 22,
    damageBonus: 12,
    attacks: [
      { id: 'monster-slam', display: 'Slam', attackType: 'melee', damageDice: '3d10', damageType: 'slashing', hands: 0, isNatural: true, traits: ['reach'] },
    ],
    durationRounds: 10,
    description: 'A Huge monstrosity such as a phoenix, purple worm, or sea serpent.',
  },
};

/**
 * Wild Shape (2 actions)
 * Transform into a battle form using the polymorph subsystem.
 * Requires Untamed Order or Wild Shape feat, plus an appropriate spell slot.
 */
export function resolveWildShape(actor: Creature, formName?: string): ActionResult {
  if (actor.characterClass !== 'Druid') {
    return { success: false, message: `${actor.name} is not a Druid.` , errorCode: 'CLASS_MISMATCH' };
  }

  // Check for Untamed Order or Wild Shape feat
  const hasWildShapeFeat = actor.druidOrder === 'untamed' ||
    (actor.feats ?? []).some((f: { name: string; type: string; level: number }) => {
      const name = typeof f === 'string' ? f : (f?.name ?? f?.id ?? '');
      return name.toLowerCase().includes('wild shape') || name.toLowerCase().includes('untamed form');
    });

  if (!hasWildShapeFeat) {
    return { success: false, message: `${actor.name} doesn't have Wild Shape or the Untamed order.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  // If already in a form, revert first
  if (actor.polymorphForm) {
    return resolveRevertForm(actor);
  }

  const formEntry = WILD_SHAPE_FORMS[formName?.toLowerCase() ?? 'animal'] ?? WILD_SHAPE_FORMS.animal;

  // Scale AC by level
  const scaledForm: BattleFormStats = {
    ...formEntry,
    armorClass: formEntry.armorClass ? formEntry.armorClass + actor.level : undefined,
  };

  // Apply battle form via subsystem
  const transformMsg = applyBattleForm(actor, scaledForm);

  // Preserve legacy wild shape fields for compatibility
  actor.wildShapeActive = true;
  actor.wildShapeForm = formEntry.formName;
  actor.wildShapeRoundsLeft = formEntry.durationRounds ?? 10;

  return {
    success: true,
    message: `🐾 ${actor.name} uses Wild Shape to become a ${formEntry.formName}! (${formEntry.size ?? 'medium'}, ${formEntry.description}) AC ${actor.armorClass}, Speed ${actor.speed}ft. ${formEntry.tempHp ? `+${formEntry.tempHp} temp HP. ` : ''}Lasts 1 minute (10 rounds).`,
    actionCost: 2,
    battleForm: formEntry.formName,
  };
}

/**
 * Revert Form (1 action or free with Dismiss)
 * Return from Wild Shape to original form using the polymorph subsystem.
 */
export function resolveRevertForm(actor: Creature): ActionResult {
  if (!actor.polymorphForm && !actor.wildShapeActive) {
    return { success: false, message: `${actor.name} is not in a wild shape form.` , errorCode: 'NOT_IN_STATE' };
  }

  const formName = actor.polymorphForm ?? actor.wildShapeForm ?? 'unknown';

  // Use subsystem to revert
  const revertMsg = revertBattleForm(actor);

  // Clear legacy wild shape fields
  actor.wildShapeActive = false;
  actor.wildShapeForm = undefined;
  actor.wildShapeRoundsLeft = undefined;
  actor.wildShapeOriginalStats = undefined;

  return {
    success: true,
    message: `🐾 ${actor.name} reverts from ${formName} to their natural form.`,
    actionCost: 1,
  };
}

// ──────────────────────────────────────────────────────────
// ── BARD CLASS ACTIONS ──────────────────────────────────
// ──────────────────────────────────────────────────────────

/**
 * Courageous Anthem (1 action, Composition Cantrip)
 * Bard composition cantrip — +1 status bonus to attack rolls, damage rolls,
 * and saves vs fear for all allies in a 60-foot emanation.
 * Reference: https://2e.aonprd.com/Spells.aspx?ID=386
 */
export function resolveCourageousAnthem(actor: Creature): ActionResult {
  // Must be a bard (or have courageous anthem)
  const className = (actor.characterClass ?? '').toLowerCase();
  if (!className.includes('bard')) {
    return { success: false, message: `${actor.name} doesn't know Courageous Anthem.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  // Only one composition cantrip active at a time (unless Harmonize feat)
  if (actor.courageousAnthemActive) {
    return { success: false, message: `${actor.name} already has Courageous Anthem active!` , errorCode: 'ALREADY_IN_STATE' };
  }

  // Activate the anthem
  actor.courageousAnthemActive = true;
  actor.courageousAnthemRoundsLeft = 1; // Lasts until start of next turn (sustained)

  return {
    success: true,
    message: `🎵 ${actor.name} performs a Courageous Anthem! Allies within 60 feet gain a +1 status bonus to attack rolls, damage rolls, and saves against fear until the start of ${actor.name}'s next turn.`,
    actionCost: 1,
    statusBonus: {
      attack: 1,
      damage: 1,
      savesVsFear: 1,
      range: 60,
    },
  };
}

/**
 * End Courageous Anthem (free action)
 * End the active Courageous Anthem composition.
 */
export function resolveEndCourageousAnthem(actor: Creature): ActionResult {
  if (!actor.courageousAnthemActive) {
    return { success: false, message: `${actor.name} doesn't have Courageous Anthem active.` , errorCode: 'NOT_IN_STATE' };
  }

  actor.courageousAnthemActive = false;
  actor.courageousAnthemRoundsLeft = undefined;

  return {
    success: true,
    message: `🎵 ${actor.name} ends their Courageous Anthem.`,
    actionCost: 0,
  };
}

/**
 * Counter Performance (Reaction, 1 Focus Point)
 * Bard composition focus spell — reaction to protect against auditory or visual effects.
 * When an ally within 60 feet would be affected by an auditory or visual effect,
 * the bard can use their Performance check as the ally's saving throw.
 * Reference: https://2e.aonprd.com/Spells.aspx?ID=381
 */
export function resolveCounterPerformance(actor: Creature): ActionResult {
  const className = (actor.characterClass ?? '').toLowerCase();
  if (!className.includes('bard')) {
    return { success: false, message: `${actor.name} doesn't know Counter Performance.` , errorCode: 'FEAT_NOT_AVAILABLE' };
  }

  // Check focus points
  const focusPoints = actor.focusPoints ?? 0;
  if (focusPoints <= 0) {
    return { success: false, message: `${actor.name} has no Focus Points remaining for Counter Performance.` , errorCode: 'NO_FOCUS_POINTS' };
  }

  // Spend focus point
  actor.focusPoints = focusPoints - 1;

  return {
    success: true,
    message: `🎵 ${actor.name} uses Counter Performance! (1 Focus Point spent, ${actor.focusPoints} remaining) An ally within 60 feet can use ${actor.name}'s Performance check in place of their saving throw against an auditory or visual effect.`,
    actionCost: 0, // Reaction
    isReaction: true,
  };
}

// ═══════════════════════════════════════════════════════════
// GUARDIAN ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveTaunt(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'guardian') {
    return { success: false, message: `${actor.name} is not a Guardian.` , errorCode: 'CLASS_MISMATCH' };
  }
  if (!targetId) {
    return { success: false, message: `No target specified for Taunt.` , errorCode: 'NO_TARGET' };
  }
  const target = (gameState.creatures ?? []).find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: `Target not found.` , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Apply off-guard against attacks not targeting the Guardian
  target.conditions = target.conditions ?? [];
  target.conditions.push({
    name: 'taunted',
    source: actor.id,
    duration: 1, // Until start of Guardian's next turn
  });

  return {
    success: true,
    message: `🛡️ ${actor.name} Taunts ${target.name}! ${target.name} is off-guard against attacks from creatures other than ${actor.name} until the start of ${actor.name}'s next turn, and takes a -1 circumstance penalty to attacks that don't include ${actor.name}.`,
    actionCost: 1,
  };
}

export function resolveInterceptStrike(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'guardian') {
    return { success: false, message: `${actor.name} is not a Guardian.` , errorCode: 'CLASS_MISMATCH' };
  }

  const allyId = targetId;
  if (!allyId) {
    return { success: false, message: `No ally specified for Intercept Strike.` , errorCode: 'NO_TARGET' };
  }

  return {
    success: true,
    message: `🛡️ ${actor.name} Intercepts a Strike against an adjacent ally! The attack targets ${actor.name}'s AC instead. If it hits, ${actor.name} takes the damage (reduced by Shield Block if raised).`,
    actionCost: 0, // Reaction
    isReaction: true,
  };
}

// ═══════════════════════════════════════════════════════════
// SWASHBUCKLER ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveGainPanache(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'swashbuckler') {
    return { success: false, message: `${actor.name} is not a Swashbuckler.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (actor.classSpecific?.hasPanache) {
    return { success: false, message: `${actor.name} already has Panache!` , errorCode: 'ALREADY_IN_STATE' };
  }

  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.hasPanache = true;

  // Panache grants +5 status bonus to Speed
  actor.bonuses = actor.bonuses ?? [];
  actor.bonuses.push({
    source: 'Panache',
    type: 'status',
    value: 5,
    applyTo: 'speed',
  });

  return {
    success: true,
    message: `⚔️ ${actor.name} gains Panache! +5 status bonus to Speed, and Finishers deal extra Precise Strike damage.`,
    actionCost: 0, // Gained from style-specific actions
  };
}

export function resolveFinisher(
  ctx: ClassActionContext,
  actor: Creature,
  gameState: GameState,
  targetId?: string,
  weaponId?: string,
): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'swashbuckler') {
    return { success: false, message: `${actor.name} is not a Swashbuckler.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (!actor.classSpecific?.hasPanache) {
    return { success: false, message: `${actor.name} needs Panache to use a Finisher!` , errorCode: 'NOT_IN_STATE' };
  }

  // Resolve the strike
  const strikeResult = ctx.resolveStrike(actor, gameState, targetId, weaponId);

  // Consume panache regardless of hit/miss
  actor.classSpecific.hasPanache = false;
  // Remove panache speed bonus
  actor.bonuses = (actor.bonuses ?? []).filter((b) => b.source !== 'Panache');

  // Add Precise Strike damage on hit
  if (strikeResult.hit) {
    const level = actor.level ?? 1;
    let preciseStrikeDice = 2;
    if (level >= 5) preciseStrikeDice = 3;
    if (level >= 9) preciseStrikeDice = 4;
    if (level >= 13) preciseStrikeDice = 5;
    if (level >= 17) preciseStrikeDice = 6;
    // Finisher doubles Precise Strike dice
    const finisherDice = preciseStrikeDice * 2;
    const bonusDamage = Array.from({ length: finisherDice }, () => Math.ceil(Math.random() * 6)).reduce((a, b) => a + b, 0);
    strikeResult.damage = (strikeResult.damage ?? 0) + bonusDamage;
    strikeResult.message += ` Confident Finisher adds ${bonusDamage} precision damage (${finisherDice}d6)!`;
  }

  strikeResult.message += ` Panache consumed.`;
  return strikeResult;
}

// ═══════════════════════════════════════════════════════════
// INVESTIGATOR ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveDeviseAStratagem(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'investigator') {
    return { success: false, message: `${actor.name} is not an Investigator.` , errorCode: 'CLASS_MISMATCH' };
  }
  if (!targetId) {
    return { success: false, message: `No target specified for Devise a Stratagem.` , errorCode: 'NO_TARGET' };
  }
  const target = (gameState.creatures ?? []).find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: `Target not found.` , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Roll d20 for the stratagem
  const roll = Math.ceil(Math.random() * 20);

  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.hasStratagem = true;
  actor.classSpecific.strategemTargetId = targetId;
  actor.classSpecific.strategemRoll = roll;

  return {
    success: true,
    message: `🔍 ${actor.name} Devises a Stratagem against ${target.name}! Rolled a ${roll}. This roll will be used in place of the attack roll for the next Strike against ${target.name} this turn.`,
    actionCost: 1,
    strategemRoll: roll,
  };
}

// ═══════════════════════════════════════════════════════════
// THAUMATURGE ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveExploitVulnerability(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'thaumaturge') {
    return { success: false, message: `${actor.name} is not a Thaumaturge.` , errorCode: 'CLASS_MISMATCH' };
  }
  if (!targetId) {
    return { success: false, message: `No target specified for Exploit Vulnerability.` , errorCode: 'NO_TARGET' };
  }
  const target = (gameState.creatures ?? []).find((c: Creature) => c.id === targetId);
  if (!target) {
    return { success: false, message: `Target not found.` , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Determine exploit type: mortal weakness vs personal antithesis
  // Mortal weakness applies if creature has specific weakness, otherwise personal antithesis
  const exploitType = (target.damageWeaknesses && target.damageWeaknesses.length > 0) ? 'mortal-weakness' : 'personal-antithesis';
  const level = actor.level ?? 1;
  let bonusDamage = 2;
  if (level >= 5) bonusDamage = 4;
  if (level >= 9) bonusDamage = 6;
  if (level >= 13) bonusDamage = 8;
  if (level >= 17) bonusDamage = 10;

  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.exploitVulnerabilityTargetId = targetId;
  actor.classSpecific.exploitVulnerabilityType = exploitType;

  actor.bonuses = actor.bonuses ?? [];
  actor.bonuses.push({
    source: 'Exploit Vulnerability',
    type: 'status',
    value: bonusDamage,
    applyTo: 'damage',
  });

  const typeName = exploitType === 'mortal-weakness' ? 'Mortal Weakness' : 'Personal Antithesis';
  return {
    success: true,
    message: `🔮 ${actor.name} Exploits ${target.name}'s Vulnerability (${typeName})! Strikes against ${target.name} deal +${bonusDamage} damage. The vulnerability applies until ${actor.name} Exploits a different creature.`,
    actionCost: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// COMMANDER ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveCommandersOrder(actor: Creature, gameState: GameState, targetId?: string): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'commander') {
    return { success: false, message: `${actor.name} is not a Commander.` , errorCode: 'CLASS_MISMATCH' };
  }
  if (!targetId) {
    return { success: false, message: `No ally specified for Commander's Order.` , errorCode: 'NO_TARGET' };
  }
  const ally = (gameState.creatures ?? []).find((c: Creature) => c.id === targetId);
  if (!ally) {
    return { success: false, message: `Ally not found.` , errorCode: 'TARGET_NOT_FOUND' };
  }

  // Grant the ally a reaction to Strike or Step
  return {
    success: true,
    message: `📢 ${actor.name} issues a Commander's Order to ${ally.name}! ${ally.name} can use a reaction to Strike or Step.`,
    actionCost: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// GUNSLINGER ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveSlingersReload(
  actor: Creature,
): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'gunslinger') {
    return { success: false, message: `${actor.name} is not a Gunslinger.` , errorCode: 'CLASS_MISMATCH' };
  }

  // Mark weapon as loaded + way-specific benefit
  const way = actor.classSpecific?.gunslingerWay ?? 'way-of-the-pistolero';

  let extraMessage = '';
  if (way === 'way-of-the-drifter') {
    extraMessage = 'You also Step or Stride as part of this reload.';
  } else if (way === 'way-of-the-pistolero') {
    extraMessage = 'You also Interact to draw a weapon or pick up a dropped weapon.';
  } else if (way === 'way-of-the-sniper') {
    extraMessage = 'You also Hide or create a Sniper\'s Cover (lesser cover).';
  } else if (way === 'way-of-the-vanguard') {
    extraMessage = 'You also Interact to draw a melee weapon or Raise a Shield.';
  } else if (way === 'way-of-the-triggerbrand') {
    extraMessage = 'You also switch your weapon between melee and ranged mode.';
  }

  return {
    success: true,
    message: `🔫 ${actor.name} uses Slinger's Reload! Reloads their firearm/crossbow. ${extraMessage}`,
    actionCost: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// INVENTOR ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveOverdrive(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'inventor') {
    return { success: false, message: `${actor.name} is not an Inventor.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (actor.classSpecific?.overdriveActive) {
    return { success: false, message: `${actor.name}'s Overdrive is already active!` , errorCode: 'ALREADY_IN_STATE' };
  }

  // Crafting check vs standard DC for level
  const level = actor.level ?? 1;
  const intMod = actor.abilities?.intelligence ?? 0;
  const craftingProf = 2 + level; // Trained at minimum
  const roll = Math.ceil(Math.random() * 20);
  const total = roll + intMod + craftingProf;
  const dc = 15 + (level * 1); // Simplified level DC

  let bonusDamage = 0;
  let resultLevel: 'normal' | 'critical' = 'normal';

  if (total >= dc + 10) {
    // Critical success
    bonusDamage = Math.max(2, Math.floor(level / 2)) + intMod;
    resultLevel = 'critical';
  } else if (total >= dc) {
    // Success
    bonusDamage = Math.max(1, Math.floor(level / 4));
    resultLevel = 'normal';
  } else {
    // Failure — no overdrive
    return {
      success: true,
      message: `⚙️ ${actor.name} attempts to Overdrive but fails! (Rolled ${roll} + ${intMod + craftingProf} = ${total} vs DC ${dc})`,
      actionCost: 1,
    };
  }

  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.overdriveActive = true;
  actor.classSpecific.overdriveLevel = resultLevel;

  actor.bonuses = actor.bonuses ?? [];
  actor.bonuses.push({
    source: 'Overdrive',
    type: 'status',
    value: bonusDamage,
    applyTo: 'damage',
  });

  const critMsg = resultLevel === 'critical' ? ' (Critical Success!)' : '';
  return {
    success: true,
    message: `⚙️ ${actor.name} activates Overdrive!${critMsg} (Rolled ${roll} + ${intMod + craftingProf} = ${total} vs DC ${dc}) Strikes deal +${bonusDamage} additional damage.`,
    actionCost: 1,
  };
}

export function resolveExplode(actor: Creature, gameState: GameState): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'inventor') {
    return { success: false, message: `${actor.name} is not an Inventor.` , errorCode: 'CLASS_MISMATCH' };
  }

  // Unstable action — innovation explodes dealing area damage
  const level = actor.level ?? 1;
  const diceCount = Math.max(2, Math.floor(level / 2));
  const damage = Array.from({ length: diceCount }, () => Math.ceil(Math.random() * 6)).reduce((a, b) => a + b, 0);

  // Check for unstable mishap (flat DC 17)
  const flatCheck = Math.ceil(Math.random() * 20);
  let mishapMsg = '';
  if (flatCheck <= 1) {
    // Critical failure on flat check
    mishapMsg = ` MISHAP! The innovation is temporarily broken and ${actor.name} takes ${Math.floor(damage / 2)} fire damage!`;
    actor.currentHealth = Math.max(0, (actor.currentHealth ?? 0) - Math.floor(damage / 2));
    actor.classSpecific = actor.classSpecific ?? {};
    actor.classSpecific.unstableActive = true;
  }

  return {
    success: true,
    message: `💥 ${actor.name}'s Innovation Explodes! ${diceCount}d6 = ${damage} fire damage in a 20-foot emanation (basic Reflex save). Flat check: ${flatCheck}.${mishapMsg}`,
    actionCost: 2,
    areaOfEffect: { shape: 'emanation', radius: 20 },
    damage,
    damageType: 'fire',
    saveType: 'reflex',
  };
}

// ═══════════════════════════════════════════════════════════
// ORACLE ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveRevelationSpell(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'oracle') {
    return { success: false, message: `${actor.name} is not an Oracle.` , errorCode: 'CLASS_MISMATCH' };
  }

  const focusPoints = actor.focusPoints ?? 0;
  if (focusPoints <= 0) {
    return { success: false, message: `${actor.name} has no Focus Points for a Revelation Spell.` , errorCode: 'NO_FOCUS_POINTS' };
  }

  // Spend focus point and advance curse
  actor.focusPoints = focusPoints - 1;

  actor.classSpecific = actor.classSpecific ?? {};
  const currentCurse = actor.classSpecific.curseLevel ?? 'minor';
  const curseProgression: Record<'minor' | 'moderate' | 'major' | 'extreme', 'minor' | 'moderate' | 'major' | 'extreme'> = {
    'minor': 'moderate',
    'moderate': 'major',
    'major': 'extreme',
    'extreme': 'extreme',
  };
  actor.classSpecific.curseLevel = curseProgression[currentCurse];

  const mystery = actor.classSpecific.oracleMystery ?? 'unknown';
  return {
    success: true,
    message: `✨ ${actor.name} casts a Revelation Spell (${mystery} mystery)! Curse advances from ${currentCurse} to ${actor.classSpecific.curseLevel}. (${actor.focusPoints} Focus Points remaining)`,
    actionCost: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// ALCHEMIST ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveQuickAlchemy(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'alchemist') {
    return { success: false, message: `${actor.name} is not an Alchemist.` , errorCode: 'CLASS_MISMATCH' };
  }

  const reagents = actor.classSpecific?.infusedReagents ?? 0;
  if (reagents <= 0) {
    return { success: false, message: `${actor.name} has no Infused Reagents remaining.` , errorCode: 'INSUFFICIENT_RESOURCE' };
  }

  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.infusedReagents = reagents - 1;

  return {
    success: true,
    message: `⚗️ ${actor.name} uses Quick Alchemy! Spends 1 infused reagent (${actor.classSpecific.infusedReagents} remaining) to create an alchemical item of their level or lower. The item is infused and lasts until the start of their next turn.`,
    actionCost: 1,
  };
}

// ═══════════════════════════════════════════════════════════
// EXEMPLAR ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveShiftImmanence(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'exemplar') {
    return { success: false, message: `${actor.name} is not an Exemplar.` , errorCode: 'CLASS_MISMATCH' };
  }

  const ikons = actor.classSpecific?.ikons ?? [];
  if (ikons.length === 0) {
    return { success: false, message: `${actor.name} has no Ikons to shift Immanence to.` , errorCode: 'NOT_IN_STATE' };
  }

  // Cycle to next ikon
  const currentIkon = actor.classSpecific?.immanenceIkon ?? '';
  const currentIdx = ikons.indexOf(currentIkon);
  const nextIdx = (currentIdx + 1) % ikons.length;
  
  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.immanenceIkon = ikons[nextIdx];

  return {
    success: true,
    message: `✦ ${actor.name} Shifts Immanence to ${ikons[nextIdx]}! That ikon's immanence effect is now active.`,
    actionCost: 0, // Free action
  };
}

export function resolveSparkTranscendence(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'exemplar') {
    return { success: false, message: `${actor.name} is not an Exemplar.` , errorCode: 'CLASS_MISMATCH' };
  }

  const currentIkon = actor.classSpecific?.immanenceIkon;
  if (!currentIkon) {
    return { success: false, message: `${actor.name} has no active Immanence ikon to Transcend.` , errorCode: 'NOT_IN_STATE' };
  }

  if (!actor.classSpecific?.transcendenceAvailable) {
    return { success: false, message: `${actor.name} has already used Spark Transcendence this turn.` , errorCode: 'ALREADY_USED' };
  }

  actor.classSpecific.transcendenceAvailable = false;

  return {
    success: true,
    message: `🌟 ${actor.name} Sparks Transcendence with ${currentIkon}! The ikon's powerful transcendence effect activates. Immanence shifts to a different ikon.`,
    actionCost: 0, // Free action (part of other action)
  };
}

// ═══════════════════════════════════════════════════════════
// SUMMONER ACTIONS
// ═══════════════════════════════════════════════════════════

export function resolveActTogether(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'summoner') {
    return { success: false, message: `${actor.name} is not a Summoner.` , errorCode: 'CLASS_MISMATCH' };
  }

  if (actor.classSpecific?.actTogetherUsed) {
    return { success: false, message: `${actor.name} has already used Act Together this turn.` , errorCode: 'ALREADY_USED' };
  }

  actor.classSpecific = actor.classSpecific ?? {};
  actor.classSpecific.actTogetherUsed = true;

  return {
    success: true,
    message: `🤝 ${actor.name} and their Eidolon Act Together! One takes a single action, and the other takes 1-2 actions (total up to 3). Both act simultaneously.`,
    actionCost: 0, // Replaces normal action budgeting
  };
}

export function resolveManifestEidolon(actor: Creature): ActionResult {
  if ((actor.characterClass ?? '').toLowerCase() !== 'summoner') {
    return { success: false, message: `${actor.name} is not a Summoner.` , errorCode: 'CLASS_MISMATCH' };
  }

  const eidolonType = actor.classSpecific?.eidolonType ?? 'unknown';
  return {
    success: true,
    message: `✨ ${actor.name} Manifests their ${eidolonType} Eidolon! The Eidolon appears in an adjacent space. They share HP and actions.`,
    actionCost: 3,
  };
}
