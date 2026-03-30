// ═══════════════════════════════════════════════════════════════════════════════
// familiarManager.ts — PF2e Familiar Management System
//
// Handles familiar lifecycle:
//  • Spawning a familiar (tiny creature with no real combat stats)
//  • Daily ability selection (2 base, 4/6 with Enhanced/Incredible)
//  • Familiar actions: deliver touch spell, scout, independent movement
//  • Master abilities: cantrip connection, spell battery, familiar focus, etc.
//  • Familiar HP = 5 × owner level (no Constitution, fragile by design)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Creature,
  GameState,
  CompanionCreature,
  Position,
  FamiliarAbility,
  getFamiliarAbility,
  createDefaultAbilities,
  createDefaultProficiencies,
} from 'pf2e-shared';
import { debugLog } from './logger';

// ─── ID Generation ──────────────────────────────────────
let familiarCounter = 0;
function generateFamiliarId(ownerId: string): string {
  return `familiar-${ownerId}-${++familiarCounter}`;
}

/**
 * Spawn a familiar for a PC. Familiars are tiny, have low HP,
 * and rely on daily ability selection for their capabilities.
 *
 * PF2e Familiar Rules (Remaster):
 * - Tiny size, same saves as master (uses master's modifier)
 * - HP = 5 × master's level
 * - AC = master's AC (unarmored proficiency)
 * - Perception = master's Perception
 * - No attacks of their own (unless given abilities)
 * - Must be Commanded (1 action) for 2 actions, or Independent for 1 action
 */
export function spawnFamiliar(
  owner: Creature,
  gameState: GameState,
  name?: string,
  position?: Position
): { success: boolean; familiar?: CompanionCreature; message: string } {
  // Check if owner already has a familiar
  if (owner.familiar?.id) {
    const existing = (gameState.companions ?? []).find(c => c.id === owner.familiar!.id);
    if (existing) {
      return { success: false, message: `${owner.name} already has a familiar: ${existing.name}.` };
    }
  }

  const familiarId = generateFamiliarId(owner.id);
  const ownerLevel = owner.level ?? 1;
  const familiarHp = 5 * ownerLevel;

  // Determine ability slots
  const abilitiesPerDay = owner.familiar?.abilitiesPerDay ?? 2;

  const pos: Position = position ?? {
    x: (owner.positions?.x ?? 0),
    y: (owner.positions?.y ?? 0) + 1,
  };

  const familiarName = name ?? `${owner.name}'s Familiar`;

  const familiar: CompanionCreature = {
    id: familiarId,
    name: familiarName,
    type: 'creature',
    level: ownerLevel,
    abilities: createDefaultAbilities(),
    size: 'tiny',
    space: 0.5,
    maxHealth: familiarHp,
    currentHealth: familiarHp,
    proficiencies: createDefaultProficiencies(),
    armorClass: owner.armorClass, // Uses master's AC
    armorBonus: 0,
    shieldRaised: false,
    weaponInventory: [], // Familiars have no attacks by default
    bonuses: [],
    penalties: [],
    speed: 25, // Base familiar speed
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
    specials: ['minion', 'familiar'],
    feats: [],

    // CompanionCreature fields
    companionType: 'familiar',
    ownerId: owner.id,
    manifested: true,
    speciesId: 'familiar',
    commandedThisTurn: false,
    commandedActions: 2,
    familiarAbilities: [],
    masterAbilities: [],
    canActIndependently: false,
  };

  // Register with GameState
  gameState.companions = gameState.companions ?? [];
  gameState.companions.push(familiar);

  // Link to owner
  owner.familiar = {
    id: familiarId,
    abilitiesPerDay,
    selectedAbilities: [],
  };
  owner.companionIds = owner.companionIds ?? [];
  owner.companionIds.push(familiarId);

  // Familiars share initiative with master
  const ownerIdx = gameState.currentRound.turnOrder.indexOf(owner.id);
  if (ownerIdx >= 0) {
    gameState.currentRound.turnOrder.splice(ownerIdx + 1, 0, familiarId);
  }

  debugLog(`[FAMILIAR] Spawned ${familiarName} for ${owner.name}. HP: ${familiarHp}, Abilities/day: ${abilitiesPerDay}`);

  return {
    success: true,
    familiar,
    message: `🐾✨ ${familiarName} appears! (Tiny familiar, HP ${familiarHp}, ${abilitiesPerDay} abilities/day)`,
  };
}

/**
 * Select daily familiar abilities. Called during daily preparations.
 * Owner picks N abilities from the catalog (2 base, more with feats).
 */
export function selectFamiliarAbilities(
  owner: Creature,
  abilityIds: string[],
  gameState: GameState
): { success: boolean; message: string } {
  if (!owner.familiar?.id) {
    return { success: false, message: `${owner.name} does not have a familiar.` };
  }

  const familiar = (gameState.companions ?? []).find(c => c.id === owner.familiar!.id) as CompanionCreature | undefined;
  if (!familiar) {
    return { success: false, message: `Familiar not found in game state.` };
  }

  const maxAbilities = owner.familiar.abilitiesPerDay;
  if (abilityIds.length > maxAbilities) {
    return { success: false, message: `Too many abilities selected (${abilityIds.length}/${maxAbilities}).` };
  }

  // Validate ability IDs
  const resolved: FamiliarAbility[] = [];
  for (const id of abilityIds) {
    const ability = getFamiliarAbility(id);
    if (!ability) {
      return { success: false, message: `Unknown familiar ability: "${id}".` };
    }
    // Check uniqueness
    if (ability.unique && resolved.some(r => r.id === ability.id)) {
      return { success: false, message: `Duplicate unique ability: "${ability.name}".` };
    }
    resolved.push(ability);
  }

  // Apply abilities
  const familiarAbilities: string[] = [];
  const masterAbilities: string[] = [];

  for (const ability of resolved) {
    if (ability.type === 'familiar') {
      familiarAbilities.push(ability.id);
      applyFamiliarAbility(familiar, ability);
    } else {
      masterAbilities.push(ability.id);
      applyMasterAbility(owner, ability);
    }
  }

  familiar.familiarAbilities = familiarAbilities;
  familiar.masterAbilities = masterAbilities;
  owner.familiar.selectedAbilities = abilityIds;

  debugLog(`[FAMILIAR] ${owner.name} selected abilities for ${familiar.name}: ${abilityIds.join(', ')}`);

  return {
    success: true,
    message: `🐾📋 ${familiar.name}'s daily abilities set: ${resolved.map(a => a.name).join(', ')}.`,
  };
}

/**
 * Apply a familiar-type ability to the familiar creature
 */
function applyFamiliarAbility(familiar: CompanionCreature, ability: FamiliarAbility): void {
  switch (ability.id) {
    case 'darkvision':
      familiar.specials = [...(familiar.specials ?? []), 'darkvision'];
      break;
    case 'flier':
      familiar.specials = [...(familiar.specials ?? []), 'fly 25 feet'];
      break;
    case 'climber':
      familiar.specials = [...(familiar.specials ?? []), 'climb 25 feet'];
      break;
    case 'amphibious':
      familiar.specials = [...(familiar.specials ?? []), 'swim 25 feet', 'breathe underwater'];
      break;
    case 'burrower':
      familiar.specials = [...(familiar.specials ?? []), 'burrow 5 feet'];
      break;
    case 'fast-movement':
      familiar.speed += 10;
      break;
    case 'independent':
      familiar.canActIndependently = true;
      break;
    case 'scent':
      familiar.specials = [...(familiar.specials ?? []), 'scent (imprecise) 30 feet'];
      break;
    case 'speech':
      familiar.specials = [...(familiar.specials ?? []), 'speech (1 language)'];
      break;
    case 'tough':
      familiar.maxHealth += familiar.level;
      familiar.currentHealth = familiar.maxHealth;
      break;
    case 'manual-dexterity':
      familiar.specials = [...(familiar.specials ?? []), 'manual dexterity (2 hands)'];
      break;
    case 'resistance':
      // Default to fire+cold — actual selection handled by UI
      familiar.damageResistances.push(
        { type: 'fire', value: Math.max(1, Math.floor(familiar.level / 2)) },
        { type: 'cold', value: Math.max(1, Math.floor(familiar.level / 2)) }
      );
      break;
    default:
      // Generic: just record it in specials
      familiar.specials = [...(familiar.specials ?? []), ability.name.toLowerCase()];
      break;
  }
}

/**
 * Apply a master-type ability as a buff on the owner
 */
function applyMasterAbility(owner: Creature, ability: FamiliarAbility): void {
  switch (ability.id) {
    case 'cantrip-connection':
      owner.bonuses = owner.bonuses ?? [];
      owner.bonuses.push({ source: 'Cantrip Connection', type: 'untyped', value: 1, applyTo: 'cantrip-slots' });
      break;
    case 'familiar-focus':
      // Tracked as a daily use — check during focus point restoration
      owner.specials = [...(owner.specials ?? []), 'familiar-focus'];
      break;
    case 'spell-delivery':
      owner.specials = [...(owner.specials ?? []), 'spell-delivery'];
      break;
    case 'spell-battery':
      owner.bonuses = owner.bonuses ?? [];
      owner.bonuses.push({ source: 'Spell Battery', type: 'untyped', value: 1, applyTo: 'spell-slots-low' });
      break;
    case 'share-senses':
      owner.specials = [...(owner.specials ?? []), 'share-senses'];
      break;
    case 'lifelink':
      owner.specials = [...(owner.specials ?? []), 'lifelink'];
      break;
    default:
      owner.specials = [...(owner.specials ?? []), `master-${ability.id}`];
      break;
  }
}

/**
 * Dismiss (de-manifest) a familiar. It's not destroyed, just goes away.
 */
export function dismissFamiliar(
  owner: Creature,
  gameState: GameState
): { success: boolean; message: string } {
  if (!owner.familiar?.id) {
    return { success: false, message: `${owner.name} does not have a familiar.` };
  }

  const familiar = (gameState.companions ?? []).find(c => c.id === owner.familiar!.id);
  if (!familiar) {
    return { success: false, message: `Familiar not found.` };
  }

  // Remove from turn order
  const turnIdx = gameState.currentRound.turnOrder.indexOf(familiar.id);
  if (turnIdx >= 0) {
    gameState.currentRound.turnOrder.splice(turnIdx, 1);
  }

  // Remove from companions array
  gameState.companions = (gameState.companions ?? []).filter(c => c.id !== familiar.id);

  // Remove from owner references
  owner.companionIds = (owner.companionIds ?? []).filter(id => id !== familiar.id);
  owner.familiar = undefined;

  return {
    success: true,
    message: `🐾 ${familiar.name} has been dismissed.`,
  };
}

/**
 * Familiar delivers a touch spell for its master.
 * Requires: Spell Delivery master ability selected, familiar adjacent to target.
 */
export function familiarDeliverSpell(
  owner: Creature,
  targetId: string,
  gameState: GameState
): { success: boolean; message: string } {
  if (!owner.familiar?.id) {
    return { success: false, message: `${owner.name} does not have a familiar.` };
  }

  if (!(owner.specials ?? []).includes('spell-delivery')) {
    return { success: false, message: `Familiar does not have the Spell Delivery ability today.` };
  }

  const familiar = (gameState.companions ?? []).find(c => c.id === owner.familiar!.id) as CompanionCreature | undefined;
  if (!familiar || !familiar.manifested) {
    return { success: false, message: `Familiar is not on the battlefield.` };
  }

  const target = gameState.creatures.find(c => c.id === targetId);
  if (!target) {
    return { success: false, message: `Target not found.` };
  }

  // Check adjacency (within 5 feet)
  const dx = Math.abs(familiar.positions.x - target.positions.x);
  const dy = Math.abs(familiar.positions.y - target.positions.y);
  if (dx > 1 || dy > 1) {
    return { success: false, message: `${familiar.name} must be adjacent to ${target.name} to deliver a touch spell.` };
  }

  return {
    success: true,
    message: `🐾✨ ${familiar.name} delivers a touch spell to ${target.name}! Cast the spell using the familiar's position.`,
  };
}
