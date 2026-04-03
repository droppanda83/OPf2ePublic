// ═══════════════════════════════════════════════════════════════════════════════
// companionManager.ts — PF2e Animal Companion Management System
//
// Handles the full lifecycle of animal companions:
//  • Spawning a companion from template + maturity
//  • Levelling / maturing companions (young → mature → nimble/savage → etc.)
//  • Command an Animal action economy (1 PC action → 2 companion actions)
//  • Support benefit resolution
//  • Companion stat calculation (AC, HP, attacks, saves scaled with owner level)
//  • Adding/removing companions from GameState
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Creature,
  GameState,
  CompanionCreature,
  CompanionMaturity,
  CreatureSize,
  CreatureWeapon,
  WeaponSlot,
  Position,
  getCompanionTemplate,
  MATURITY_SCALING,
  COMPANION_SPECIALIZATIONS,
  createDefaultAbilities,
  createDefaultProficiencies,
} from 'pf2e-shared';
import { getTokenArtUrl } from '../services/tokenArtService';
import { debugLog } from './logger';

// ─── ID Generation ──────────────────────────────────────
let companionCounter = 0;
function generateCompanionId(speciesId: string, ownerId: string): string {
  return `companion-${speciesId}-${ownerId}-${++companionCounter}`;
}

// ─── Size Progression ───────────────────────────────────
const SIZE_ORDER: CreatureSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
function growSize(current: CreatureSize): CreatureSize {
  const idx = SIZE_ORDER.indexOf(current);
  return idx < SIZE_ORDER.length - 1 ? SIZE_ORDER[idx + 1] : current;
}

/**
 * Create a new companion creature from a template, tied to an owner.
 * The companion starts at maturity 'young' and can be upgraded later.
 */
export function spawnCompanion(
  owner: Creature,
  speciesId: string,
  gameState: GameState,
  maturity: CompanionMaturity = 'young',
  position?: Position
): { success: boolean; companion?: CompanionCreature; message: string } {
  const template = getCompanionTemplate(speciesId);
  if (!template) {
    return { success: false, message: `Unknown companion species: "${speciesId}". Valid: badger, bear, bird, cat, dromaeosaur, horse, snake, wolf, ape, shark, scorpion, pangolin, raptor.` };
  }

  const companionId = generateCompanionId(speciesId, owner.id);
  const ownerLevel = owner.level ?? 1;
  const scaling = MATURITY_SCALING[maturity] ?? MATURITY_SCALING.young;

  // Size: young uses template size, mature+ uses matureSize or grows
  let size = template.size;
  if (scaling.sizeIncrease && template.matureSize) {
    size = template.matureSize;
  } else if (scaling.sizeIncrease) {
    size = growSize(template.size);
  }

  // Ability mods: template base + maturity scaling
  const [bStr, bDex, bCon, bInt, bWis, bCha] = template.abilityMods;
  const str = bStr + scaling.strMod;
  const dex = bDex + scaling.dexMod;
  const con = bCon + scaling.conMod;
  const wis = bWis + scaling.wisMod;

  // HP: baseHp + (con + 6 + hpPerLevel) * level
  const hpPerLevel = con + 6 + scaling.hpPerLevel;
  const totalHp = template.baseHp + (hpPerLevel * ownerLevel);

  // AC: 10 + dex (capped at 3) + level + maturity bonus + proficiency (trained = 2)
  const dexCap = 3;
  const acDex = Math.min(dex, dexCap);
  const ac = 10 + acDex + ownerLevel + scaling.acBonus + 2; // trained proficiency

  // Build weapon inventory from template attacks
  const weaponInventory: WeaponSlot[] = template.attacks.map((atk, idx) => ({
    weapon: {
      id: `${companionId}-${atk.name.toLowerCase().replace(/\s+/g, '-')}`,
      display: atk.name,
      attackType: 'melee' as const,
      damageDice: atk.damage,
      damageType: atk.damageType,
      hands: 0, // natural attack
      traits: atk.traits ?? [],
      attackBonus: ownerLevel + str + 2 + scaling.attackBonus,
      isNatural: true,
      range: 1,
    },
    state: 'held' as const,
  }));

  // Position: near owner or specified
  const pos: Position = position ?? {
    x: (owner.positions?.x ?? 0) + 1,
    y: owner.positions?.y ?? 0,
  };

  const companion: CompanionCreature = {
    // Base Creature fields
    id: companionId,
    name: `${owner.name}'s ${template.name}`,
    type: 'creature',
    level: ownerLevel,
    abilities: {
      ...createDefaultAbilities(),
      strength: 10 + str * 2,
      dexterity: 10 + dex * 2,
      constitution: 10 + con * 2,
      intelligence: 10 + (bInt) * 2,
      wisdom: 10 + wis * 2,
      charisma: 10 + bCha * 2,
    },
    size,
    maxHealth: totalHp,
    currentHealth: totalHp,
    proficiencies: createDefaultProficiencies(),
    armorClass: ac,
    armorBonus: 0,
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
    specials: ['minion'],
    feats: [],
    tokenImageUrl: getTokenArtUrl(template.name, ['animal', 'beast']),

    // CompanionCreature fields
    companionType: 'animal-companion',
    ownerId: owner.id,
    manifested: true,
    speciesId: template.id,
    maturity,
    supportBenefit: template.supportBenefit,
    advancedManeuver: template.advancedManeuver?.name,
    commandedThisTurn: false,
    commandedActions: 2,
  };

  // Fix speed (can't reference companion before it's assigned)
  companion.speed = template.speed;

  // Add senses as special abilities
  if (template.senses) {
    companion.specials = [...(companion.specials ?? []), ...template.senses];
  }

  // Add special speeds as specials
  if (template.specialSpeeds) {
    for (const sp of template.specialSpeeds) {
      companion.specials?.push(`${sp.type} ${sp.speed} feet`);
    }
  }

  // Register with GameState
  gameState.companions = gameState.companions ?? [];
  gameState.companions.push(companion);

  // Link to owner
  owner.companionIds = owner.companionIds ?? [];
  owner.companionIds.push(companionId);

  // Add to turn order (acts on owner's initiative, right after owner)
  const ownerIdx = gameState.currentRound.turnOrder.indexOf(owner.id);
  if (ownerIdx >= 0) {
    gameState.currentRound.turnOrder.splice(ownerIdx + 1, 0, companionId);
  } else {
    gameState.currentRound.turnOrder.push(companionId);
  }

  debugLog(`[COMPANION] Spawned ${companion.name} (${speciesId}, ${maturity}) for ${owner.name}. HP: ${totalHp}, AC: ${ac}`);

  return {
    success: true,
    companion,
    message: `🐾 ${companion.name} appears! (${maturity} ${template.name}, HP ${totalHp}, AC ${ac}, Speed ${companion.speed} ft)`,
  };
}

/**
 * Command an Animal — costs the owner 1 action, grants companion 2 actions.
 * PF2e rules: The companion gains 2 actions. If not commanded, it does nothing
 * (minion trait). Some feats modify this (Mature = 3 actions if owner spends 2).
 */
export function commandCompanion(
  owner: Creature,
  companionId: string,
  gameState: GameState
): { success: boolean; message: string; companion?: CompanionCreature } {
  const companion = getCompanion(companionId, gameState);
  if (!companion) {
    return { success: false, message: `Companion "${companionId}" not found.` };
  }
  if (companion.ownerId !== owner.id) {
    return { success: false, message: `${companion.name} is not ${owner.name}'s companion.` };
  }
  if (companion.currentHealth <= 0 || companion.dying) {
    return { success: false, message: `${companion.name} is unconscious and cannot be commanded.` };
  }
  if (companion.commandedThisTurn) {
    return { success: false, message: `${companion.name} has already been commanded this turn.` };
  }

  // Check owner has actions to spend
  const remaining = owner.actionsRemaining ?? 3;
  if (remaining < 1) {
    return { success: false, message: `${owner.name} has no actions remaining to command ${companion.name}.` };
  }

  // Spend 1 owner action
  owner.actionsRemaining = remaining - 1;

  // Grant companion actions
  companion.commandedThisTurn = true;
  companion.actionsRemaining = companion.commandedActions ?? 2;
  companion.attacksMadeThisTurn = 0;

  debugLog(`[COMPANION] ${owner.name} commands ${companion.name}. Companion gets ${companion.actionsRemaining} actions.`);

  return {
    success: true,
    message: `🐾 ${owner.name} commands ${companion.name}! The companion gains ${companion.actionsRemaining} actions this turn.`,
    companion,
  };
}

/**
 * Companion uses its Support action — grants a benefit to the owner.
 * Support: 1 companion action. The companion encourages you, granting its support benefit
 * until the start of your next turn.
 */
export function companionSupport(
  owner: Creature,
  companionId: string,
  gameState: GameState
): { success: boolean; message: string } {
  const companion = getCompanion(companionId, gameState);
  if (!companion) return { success: false, message: `Companion not found.` };
  if (!companion.commandedThisTurn) return { success: false, message: `${companion.name} must be commanded first.` };
  if ((companion.actionsRemaining ?? 0) < 1) return { success: false, message: `${companion.name} has no actions remaining.` };

  companion.actionsRemaining = (companion.actionsRemaining ?? 1) - 1;

  // Apply support benefit as a condition on the owner
  owner.conditions.push({
    name: 'companion-support',
    duration: 'permanent', // Until start of owner's next turn
    source: companion.name,
    expiresOnTurnEndOf: owner.id,
    turnEndsRemaining: 1,
  });

  const benefit = companion.supportBenefit ?? 'No special support benefit.';
  return {
    success: true,
    message: `🐾🤝 ${companion.name} supports ${owner.name}! ${benefit}`,
  };
}

/**
 * Mature a companion to the next maturity level.
 * Called when the owner gains the appropriate feat (Mature, Nimble/Savage, etc.)
 */
export function matureCompanion(
  companionId: string,
  newMaturity: CompanionMaturity,
  gameState: GameState,
  specialization?: string
): { success: boolean; message: string } {
  const companion = getCompanion(companionId, gameState);
  if (!companion) return { success: false, message: `Companion not found.` };

  const template = getCompanionTemplate(companion.speciesId);
  if (!template) return { success: false, message: `Template not found for ${companion.speciesId}.` };

  const scaling = MATURITY_SCALING[newMaturity];
  if (!scaling) return { success: false, message: `Unknown maturity level: ${newMaturity}.` };

  companion.maturity = newMaturity;

  // Recalculate stats
  const [bStr, bDex, bCon, bInt, bWis, bCha] = template.abilityMods;
  const str = bStr + scaling.strMod;
  const dex = bDex + scaling.dexMod;
  const con = bCon + scaling.conMod;
  const wis = bWis + scaling.wisMod;

  companion.abilities = {
    ...companion.abilities,
    strength: 10 + str * 2,
    dexterity: 10 + dex * 2,
    constitution: 10 + con * 2,
    wisdom: 10 + wis * 2,
  };

  // Size
  if (scaling.sizeIncrease && template.matureSize) {
    companion.size = template.matureSize;
  } else if (scaling.sizeIncrease) {
    companion.size = growSize(template.size);
  }

  // HP
  const hpPerLevel = con + 6 + scaling.hpPerLevel;
  companion.maxHealth = template.baseHp + (hpPerLevel * companion.level);
  companion.currentHealth = companion.maxHealth;

  // AC
  const acDex = Math.min(dex, 3);
  companion.armorClass = 10 + acDex + companion.level + scaling.acBonus + 2;

  // Speed (apply specialization bonus if applicable)
  let speedBonus = 0;
  if (specialization) {
    companion.specialization = specialization;
    const spec = COMPANION_SPECIALIZATIONS[specialization];
    if (spec?.speedBonus) speedBonus = spec.speedBonus;
  }
  companion.speed = template.speed + speedBonus;

  // Recalculate attacks
  companion.weaponInventory = template.attacks.map((atk, idx) => ({
    weapon: {
      id: `${companion.id}-${atk.name.toLowerCase().replace(/\s+/g, '-')}`,
      display: atk.name,
      attackType: 'melee' as const,
      damageDice: atk.damage,
      damageType: atk.damageType,
      hands: 0,
      traits: atk.traits ?? [],
      attackBonus: companion.level + str + 2 + scaling.attackBonus,
      isNatural: true,
      range: 1,
    },
    state: 'held' as const,
  }));

  // Add advanced maneuver at Nimble/Savage+
  if (['nimble', 'savage', 'specialized', 'incredible'].includes(newMaturity) && template.advancedManeuver) {
    companion.advancedManeuver = template.advancedManeuver.name;
  }

  debugLog(`[COMPANION] ${companion.name} matured to ${newMaturity}. HP: ${companion.maxHealth}, AC: ${companion.armorClass}`);

  return {
    success: true,
    message: `🐾✨ ${companion.name} has matured to ${newMaturity}! HP: ${companion.maxHealth}, AC: ${companion.armorClass}, Size: ${companion.size}${specialization ? `, Specialization: ${specialization}` : ''}.`,
  };
}

/**
 * Remove a companion from the battlefield (dismissed, dead, unsummoned).
 */
export function dismissCompanion(
  companionId: string,
  gameState: GameState,
  reason: string = 'dismissed'
): { success: boolean; message: string } {
  const companion = getCompanion(companionId, gameState);
  if (!companion) return { success: false, message: `Companion not found.` };

  // Remove from turn order
  const turnIdx = gameState.currentRound.turnOrder.indexOf(companionId);
  if (turnIdx >= 0) {
    gameState.currentRound.turnOrder.splice(turnIdx, 1);
  }

  // Remove from owner's companion list
  const owner = gameState.creatures.find(c => c.id === companion.ownerId);
  if (owner?.companionIds) {
    owner.companionIds = owner.companionIds.filter(id => id !== companionId);
  }

  // Remove from companions array
  gameState.companions = (gameState.companions ?? []).filter(c => c.id !== companionId);

  return {
    success: true,
    message: `🐾 ${companion.name} has been ${reason}.`,
  };
}

/**
 * Reset companion state at start of owner's turn.
 * Called by the engine's turn-start logic.
 */
export function resetCompanionTurnState(ownerId: string, gameState: GameState): void {
  const companions = getOwnerCompanions(ownerId, gameState);
  for (const c of companions) {
    c.commandedThisTurn = false;
    c.actionsRemaining = 0; // Minions get 0 actions until commanded
    c.attacksMadeThisTurn = 0;
    c.flourishUsedThisTurn = false;
    c.reactionUsed = false;
  }
}

// ─── Lookup Helpers ─────────────────────────────────────

/**
 * Get a companion creature by ID from the GameState
 */
export function getCompanion(companionId: string, gameState: GameState): CompanionCreature | undefined {
  return (gameState.companions ?? []).find(c => c.id === companionId) as CompanionCreature | undefined;
}

/**
 * Get all companions owned by a creature
 */
export function getOwnerCompanions(ownerId: string, gameState: GameState): CompanionCreature[] {
  return (gameState.companions ?? []).filter(c => (c as CompanionCreature).ownerId === ownerId) as CompanionCreature[];
}

/**
 * Check if a creature ID belongs to a companion (not a regular creature)
 */
export function isCompanion(creatureId: string, gameState: GameState): boolean {
  return (gameState.companions ?? []).some(c => c.id === creatureId);
}

/**
 * Get the companion creature OR regular creature by ID (searches both arrays)
 */
export function getAnyCreature(creatureId: string, gameState: GameState): Creature | undefined {
  return gameState.creatures.find(c => c.id === creatureId) ?? getCompanion(creatureId, gameState);
}
