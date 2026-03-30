// ═══════════════════════════════════════════════════════════════════════════════
// eidolonManager.ts — PF2e Eidolon Management System (Summoner)
//
// Handles the Summoner's eidolon:
//  • Manifesting/dismissing the eidolon
//  • Shared HP pool (Summoner + Eidolon share a single pool)
//  • Act Together action economy (replaces normal turn)
//  • Command Eidolon (1 Summoner action → 2 eidolon actions)
//  • Evolution feat application
//  • Stat calculation from eidolon template + Summoner level
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Creature,
  GameState,
  CompanionCreature,
  CreatureWeapon,
  WeaponSlot,
  Position,
  getEidolonTemplate,
  createDefaultAbilities,
  createDefaultProficiencies,
} from 'pf2e-shared';
import { debugLog } from './logger';

// ─── ID Generation ──────────────────────────────────────
let eidolonCounter = 0;
function generateEidolonId(ownerId: string): string {
  return `eidolon-${ownerId}-${++eidolonCounter}`;
}

/**
 * Manifest (summon) an eidolon onto the battlefield.
 *
 * PF2e Summoner Eidolon Rules:
 * - Shares an HP pool with the Summoner (combined HP)
 * - When either takes damage, it comes from the shared pool
 * - If either reaches 0 HP, both fall unconscious
 * - Eidolon uses Summoner's level, proficiencies, and spell DC
 * - Act Together: Summoner uses 3 actions total split between self and eidolon
 * - Command Eidolon: 1 Summoner action → 2 eidolon actions
 * - Manifest Eidolon: 3-action activity to bring eidolon to battlefield
 */
export function manifestEidolon(
  summoner: Creature,
  gameState: GameState,
  position?: Position
): { success: boolean; eidolon?: CompanionCreature; message: string } {
  if ((summoner.characterClass ?? '').toLowerCase() !== 'summoner') {
    return { success: false, message: `${summoner.name} is not a Summoner.` };
  }

  // Check if already manifested
  if (summoner.eidolonId) {
    const existing = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId);
    if (existing && (existing as CompanionCreature).manifested) {
      return { success: false, message: `${summoner.name}'s eidolon is already manifested.` };
    }
  }

  const subtypeId = summoner.classSpecific?.eidolonType ?? 'beast';
  const template = getEidolonTemplate(subtypeId);
  if (!template) {
    return { success: false, message: `Unknown eidolon subtype: "${subtypeId}".` };
  }

  const eidolonId = generateEidolonId(summoner.id);
  const level = summoner.level ?? 1;

  // Ability mods from template
  const [bStr, bDex, bCon, bInt, bWis, bCha] = template.abilityMods;

  // Shared HP pool: The Summoner and Eidolon share a combined HP pool
  // Eidolon's "HP contribution" = base + (CON + 6) * level
  // But they literally share the summoner's HP. We track eidolon separately but sync.
  const eidolonHpContribution = template.baseHp + ((bCon + 6) * level);
  const combinedMaxHp = summoner.maxHealth + eidolonHpContribution;

  // AC from template
  const dexMod = Math.min(bDex, template.dexCap);
  const ac = 10 + dexMod + level + template.acBonus + 2; // trained proficiency

  const pos: Position = position ?? {
    x: (summoner.positions?.x ?? 0) + 1,
    y: summoner.positions?.y ?? 0,
  };

  // Build weapon inventory
  const weaponInventory: WeaponSlot[] = [
    {
      weapon: {
        id: `${eidolonId}-primary`,
        display: template.primaryAttack.name,
        attackType: 'melee',
        damageDice: template.primaryAttack.damage,
        damageType: template.primaryAttack.damageType,
        hands: 0,
        traits: template.primaryAttack.traits ?? [],
        attackBonus: level + bStr + 4, // expert proficiency
        isNatural: true,
        range: 1,
      },
      state: 'held',
    },
    {
      weapon: {
        id: `${eidolonId}-secondary`,
        display: template.secondaryAttack.name,
        attackType: 'melee',
        damageDice: template.secondaryAttack.damage,
        damageType: template.secondaryAttack.damageType,
        hands: 0,
        traits: template.secondaryAttack.traits ?? [],
        attackBonus: level + (template.secondaryAttack.traits?.includes('finesse') ? bDex : bStr) + 4,
        isNatural: true,
        range: 1,
      },
      state: 'held',
    },
  ];

  const eidolon: CompanionCreature = {
    id: eidolonId,
    name: `${summoner.name}'s ${template.name}`,
    type: 'creature',
    level,
    abilities: {
      strength: 10 + bStr * 2,
      dexterity: 10 + bDex * 2,
      constitution: 10 + bCon * 2,
      intelligence: 10 + bInt * 2,
      wisdom: 10 + bWis * 2,
      charisma: 10 + bCha * 2,
    },
    size: template.size,
    maxHealth: combinedMaxHp,
    currentHealth: combinedMaxHp, // Will be synced with summoner
    proficiencies: createDefaultProficiencies(),
    armorClass: ac,
    armorBonus: template.acBonus,
    shieldRaised: false,
    weaponInventory,
    bonuses: [],
    penalties: [],
    speed: template.speed,
    positions: pos,
    conditions: [],
    initiative: 0,
    attacksMadeThisTurn: 0,
    dying: false,
    deathSaveFailures: 0,
    deathSaveSuccesses: 0,
    deathSaveMadeThisTurn: false,
    wounded: 0,
    damageResistances: [],
    damageImmunities: [],
    damageWeaknesses: [],
    specials: ['eidolon'],
    feats: [],

    // CompanionCreature fields
    companionType: 'eidolon',
    ownerId: summoner.id,
    manifested: true,
    speciesId: subtypeId,
    eidolonSubtype: subtypeId,
    sharedHpPool: true,
    commandedThisTurn: false,
    commandedActions: 2,
    evolutionFeats: [],
  };

  // Add senses
  if (template.senses) {
    eidolon.specials = [...(eidolon.specials ?? []), ...template.senses];
  }

  // Add special speeds
  if (template.specialSpeeds) {
    for (const sp of template.specialSpeeds) {
      eidolon.specials?.push(`${sp.type} ${sp.speed} feet`);
    }
  }

  // Update shared HP pool
  summoner.maxHealth = combinedMaxHp;
  summoner.currentHealth = Math.min(summoner.currentHealth, combinedMaxHp);

  // Register
  gameState.companions = gameState.companions ?? [];
  gameState.companions.push(eidolon);
  summoner.eidolonId = eidolonId;
  summoner.companionIds = summoner.companionIds ?? [];
  summoner.companionIds.push(eidolonId);

  // Add to turn order after summoner
  const ownerIdx = gameState.currentRound.turnOrder.indexOf(summoner.id);
  if (ownerIdx >= 0) {
    gameState.currentRound.turnOrder.splice(ownerIdx + 1, 0, eidolonId);
  }

  debugLog(`[EIDOLON] ${summoner.name} manifests ${eidolon.name}. Shared HP: ${combinedMaxHp}, AC: ${ac}`);

  return {
    success: true,
    eidolon,
    message: `✨ ${eidolon.name} manifests! (${template.name}, shared HP ${combinedMaxHp}, AC ${ac}, Speed ${template.speed} ft). ${template.initialAbility.name}: ${template.initialAbility.description}`,
  };
}

/**
 * Act Together — The Summoner's signature action economy.
 * Instead of the normal turn, the Summoner and Eidolon share 3 actions total.
 * One gets 1 action, the other gets 2 (Summoner chooses).
 *
 * This replaces Summoner's normal turn — they don't take separate eidolon turn.
 */
export function actTogether(
  summoner: Creature,
  gameState: GameState,
  summonerActions: 1 | 2,
): { success: boolean; message: string } {
  if (!summoner.eidolonId) {
    return { success: false, message: `${summoner.name} has no manifested eidolon.` };
  }

  const eidolon = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId) as CompanionCreature | undefined;
  if (!eidolon || !eidolon.manifested) {
    return { success: false, message: `Eidolon is not manifested.` };
  }

  if (summoner.classSpecific?.actTogetherUsed) {
    return { success: false, message: `Act Together already used this turn.` };
  }

  const eidolonActions = 3 - summonerActions; // Total 3 actions split

  summoner.actionsRemaining = summonerActions;
  eidolon.actionsRemaining = eidolonActions;
  eidolon.commandedThisTurn = true;
  eidolon.attacksMadeThisTurn = 0;

  summoner.classSpecific = summoner.classSpecific ?? {};
  summoner.classSpecific.actTogetherUsed = true;

  debugLog(`[EIDOLON] Act Together: ${summoner.name} gets ${summonerActions} actions, ${eidolon.name} gets ${eidolonActions} actions.`);

  return {
    success: true,
    message: `🤝 Act Together! ${summoner.name} takes ${summonerActions} action${summonerActions > 1 ? 's' : ''}, ${eidolon.name} takes ${eidolonActions} action${eidolonActions > 1 ? 's' : ''}. Both act simultaneously.`,
  };
}

/**
 * Command Eidolon — simpler alternative to Act Together.
 * Costs 1 Summoner action, grants eidolon 2 actions.
 */
export function commandEidolon(
  summoner: Creature,
  gameState: GameState
): { success: boolean; message: string; eidolon?: CompanionCreature } {
  if (!summoner.eidolonId) {
    return { success: false, message: `${summoner.name} has no manifested eidolon.` };
  }

  const eidolon = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId) as CompanionCreature | undefined;
  if (!eidolon || !eidolon.manifested) {
    return { success: false, message: `Eidolon is not manifested.` };
  }

  if (eidolon.commandedThisTurn) {
    return { success: false, message: `${eidolon.name} has already been commanded this turn.` };
  }

  const remaining = summoner.actionsRemaining ?? 3;
  if (remaining < 1) {
    return { success: false, message: `${summoner.name} has no actions to command the eidolon.` };
  }

  summoner.actionsRemaining = remaining - 1;
  eidolon.commandedThisTurn = true;
  eidolon.actionsRemaining = 2;
  eidolon.attacksMadeThisTurn = 0;

  return {
    success: true,
    message: `✨ ${summoner.name} commands ${eidolon.name}! The eidolon gains 2 actions.`,
    eidolon,
  };
}

/**
 * Sync shared HP between Summoner and Eidolon.
 * Must be called after any damage or healing to either.
 * PF2e rule: They share one HP pool. Damage to either reduces the same pool.
 */
export function syncSharedHp(summoner: Creature, gameState: GameState): void {
  if (!summoner.eidolonId) return;

  const eidolon = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId) as CompanionCreature | undefined;
  if (!eidolon || !eidolon.sharedHpPool) return;

  // Whoever has the lower HP is "correct" (damage was applied to one)
  // Actually: both should always match. We sync to whichever changed.
  if (eidolon.currentHealth !== summoner.currentHealth) {
    const lower = Math.min(eidolon.currentHealth, summoner.currentHealth);
    summoner.currentHealth = lower;
    eidolon.currentHealth = lower;

    // Check for unconsciousness
    if (lower <= 0) {
      summoner.dying = true;
      eidolon.dying = true;
      eidolon.manifested = false;
      debugLog(`[EIDOLON] Shared HP reached 0. Both ${summoner.name} and ${eidolon.name} fall unconscious.`);
    }
  }
}

/**
 * Dismiss (un-manifest) the eidolon. The eidolon disappears but isn't destroyed.
 * HP pool returns to summoner-only pool.
 */
export function dismissEidolon(
  summoner: Creature,
  gameState: GameState
): { success: boolean; message: string } {
  if (!summoner.eidolonId) {
    return { success: false, message: `${summoner.name} has no manifested eidolon.` };
  }

  const eidolon = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId) as CompanionCreature | undefined;
  if (!eidolon) {
    return { success: false, message: `Eidolon not found.` };
  }

  // Un-manifest
  eidolon.manifested = false;

  // Remove from turn order
  const turnIdx = gameState.currentRound.turnOrder.indexOf(eidolon.id);
  if (turnIdx >= 0) {
    gameState.currentRound.turnOrder.splice(turnIdx, 1);
  }

  // Restore summoner's solo HP pool (subtract eidolon's contribution)
  const template = getEidolonTemplate(eidolon.eidolonSubtype ?? 'beast');
  if (template) {
    const eidolonHpContribution = template.baseHp + ((template.abilityMods[2] + 6) * summoner.level);
    summoner.maxHealth = Math.max(1, summoner.maxHealth - eidolonHpContribution);
    summoner.currentHealth = Math.min(summoner.currentHealth, summoner.maxHealth);
  }

  debugLog(`[EIDOLON] ${eidolon.name} dismissed. ${summoner.name} HP reverted to solo pool: ${summoner.maxHealth}.`);

  return {
    success: true,
    message: `✨ ${eidolon.name} fades from the battlefield. ${summoner.name}'s HP pool returns to normal (${summoner.maxHealth}).`,
  };
}

/**
 * Apply an evolution feat to the eidolon, modifying its stats.
 */
export function applyEvolution(
  summoner: Creature,
  evolutionId: string,
  gameState: GameState
): { success: boolean; message: string } {
  if (!summoner.eidolonId) {
    return { success: false, message: `${summoner.name} has no eidolon.` };
  }

  const eidolon = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId) as CompanionCreature | undefined;
  if (!eidolon) {
    return { success: false, message: `Eidolon not found.` };
  }

  eidolon.evolutionFeats = eidolon.evolutionFeats ?? [];
  if (eidolon.evolutionFeats.includes(evolutionId)) {
    return { success: false, message: `Evolution "${evolutionId}" already applied.` };
  }

  eidolon.evolutionFeats.push(evolutionId);

  // Apply specific evolution effects
  switch (evolutionId) {
    case 'energy-heart': {
      const resistValue = summoner.level >= 9 ? 10 : 5;
      eidolon.damageResistances.push({ type: 'fire', value: resistValue });
      return { success: true, message: `✨ ${eidolon.name} gains Energy Heart: fire resistance ${resistValue}.` };
    }
    case 'expanded-senses':
      eidolon.specials = [...(eidolon.specials ?? []), 'darkvision'];
      return { success: true, message: `✨ ${eidolon.name} gains Expanded Senses: darkvision.` };
    case 'glider-form':
      eidolon.specials = [...(eidolon.specials ?? []), `fly ${eidolon.speed} feet (must land)`];
      return { success: true, message: `✨ ${eidolon.name} gains Glider Form: fly speed ${eidolon.speed} ft (must end on surface).` };
    case 'hulking-size':
      if (eidolon.size === 'medium') {
        eidolon.size = 'large';
        eidolon.naturalReach = 10;
      } else if (eidolon.size === 'large') {
        eidolon.size = 'huge';
        eidolon.naturalReach = 15;
      }
      return { success: true, message: `✨ ${eidolon.name} gains Hulking Size: now ${eidolon.size}, reach ${eidolon.naturalReach} ft, +2 damage.` };
    case 'towering-size':
      if (eidolon.size === 'large') {
        eidolon.size = 'huge';
        eidolon.naturalReach = 15;
      } else if (eidolon.size === 'huge') {
        eidolon.size = 'gargantuan';
        eidolon.naturalReach = 20;
      }
      return { success: true, message: `✨ ${eidolon.name} gains Towering Size: now ${eidolon.size}, reach ${eidolon.naturalReach} ft, +6 damage.` };
    default:
      return { success: true, message: `✨ ${eidolon.name} gains evolution: ${evolutionId}.` };
  }
}

/**
 * Reset eidolon state at start of summoner's turn.
 */
export function resetEidolonTurnState(summoner: Creature, gameState: GameState): void {
  if (!summoner.eidolonId) return;

  const eidolon = (gameState.companions ?? []).find(c => c.id === summoner.eidolonId) as CompanionCreature | undefined;
  if (!eidolon) return;

  eidolon.commandedThisTurn = false;
  eidolon.actionsRemaining = 0;
  eidolon.attacksMadeThisTurn = 0;
  eidolon.flourishUsedThisTurn = false;
  eidolon.reactionUsed = false;

  if (summoner.classSpecific) {
    summoner.classSpecific.actTogetherUsed = false;
  }

  // Sync HP
  syncSharedHp(summoner, gameState);
}
