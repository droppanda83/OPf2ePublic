import { Creature, GameState, EncounterMap, TerrainTile, CombatRound, Position, getShield, getWeapon, computeDerivedStats, createDefaultAbilities, createDefaultProficiencies } from 'pf2e-shared';
import { RulesEngine } from './rules';
import { getActionCost } from './ruleValidator';
import { debugLog } from './logger';
import { applySize, getSpaceForSize, getEffectiveSize } from './subsystems';

export class GameEngine {
  private games: Map<string, GameState> = new Map();
  private rulesEngine: RulesEngine;

  constructor() {
    this.rulesEngine = new RulesEngine();
  }

  createGame(
    players: Partial<Creature>[],
    creatures: Partial<Creature>[],
    mapSize: number = 20
  ): GameState {
    const id = this.generateId();

    // Initialize creatures with proper structure
    const allCreatures: Creature[] = [
      ...players.map((p, i) => this.initializeCreature(p, 'player', i, mapSize)),
      ...creatures.map((c, i) => this.initializeCreature(c, 'creature', i, mapSize)),
    ];

    // Roll initiative
    const turnOrder = this.rulesEngine.rollInitiative(allCreatures);

    const gameState: GameState = {
      id,
      name: 'Encounter',
      creatures: allCreatures,
      map: this.generateMap(mapSize),
      currentRound: {
        number: 1,
        turnOrder,
        currentTurnIndex: 0,
        actions: [],
      },
      log: [{ timestamp: Date.now(), type: 'system', message: 'Combat started' }],
      groundObjects: [],
    };
    // attach map reference to each creature for rules that need terrain info
    allCreatures.forEach((c) => (c._map = gameState.map));

    // Fix overlapping positions — nudge creatures that share squares (multi-tile aware)
    const occupied = new Set<string>();
    for (const c of allCreatures) {
      const effectiveSize = getEffectiveSize(c);
      const space = getSpaceForSize(effectiveSize);
      const gridSpace = Math.max(1, Math.ceil(space));

      // Check if ALL squares this creature needs are free and in bounds
      const getKeys = (x: number, y: number): string[] => {
        const keys: string[] = [];
        for (let dy = 0; dy < gridSpace; dy++) {
          for (let dx = 0; dx < gridSpace; dx++) {
            keys.push(`${x + dx},${y + dy}`);
          }
        }
        return keys;
      };

      const fitsAndFree = (x: number, y: number): boolean => {
        if (x < 0 || y < 0 || x + gridSpace > mapSize || y + gridSpace > mapSize) return false;
        return getKeys(x, y).every(k => !occupied.has(k));
      };

      let attempts = 0;
      while (!fitsAndFree(c.positions.x, c.positions.y) && attempts < mapSize * mapSize) {
        c.positions.x = Math.floor(Math.random() * (mapSize - gridSpace + 1));
        c.positions.y = Math.floor(Math.random() * (mapSize - gridSpace + 1));
        attempts++;
      }
      // Mark all occupied squares
      for (const key of getKeys(c.positions.x, c.positions.y)) {
        occupied.add(key);
      }
    }

    this.games.set(id, gameState);
    return gameState;
  }

  executeAction(
    gameId: string,
    creatureId: string,
    actionId: string,
    targetId?: string,
    targetPosition?: Position,
    weaponId?: string,
    pickupDestination?: string,
    heroPointsSpent?: number,
    readyActionId?: string,
    itemId?: string,
    spellId?: string
  ): any {
    const gameState = this.games.get(gameId);
    if (!gameState) throw new Error('Game not found');

    const actor = gameState.creatures.find((c) => c.id === creatureId)
      || (gameState.companions || []).find((c) => c.id === creatureId);
    if (!actor) throw new Error('Creature not found');

    const prePosition = { ...actor.positions };

    // Resolve action based on action system rules
    const result = this.rulesEngine.resolveAction(
      actor,
      gameState,
      actionId,
      targetId,
      targetPosition,
      weaponId,
      pickupDestination,
      heroPointsSpent,
      readyActionId,
      itemId,
      spellId
    );

    const actionCost = getActionCost(actionId);
    if (!result?.errorCode) {
      if (typeof actionCost === 'number') {
        const remaining = actor.actionsRemaining ?? 3;
        actor.actionsRemaining = Math.max(0, remaining - actionCost);
      } else if (actionCost === 'reaction') {
        actor.reactionUsed = true;
      }
    }

    // Log the action
    gameState.log.push({
      timestamp: Date.now(),
      type: 'action',
      message: result.message,
      details: result,
    });

    const skipReactionCheck = ['reactive-strike', 'shield-block', 'resolve-pending-damage', 'teleport'].includes(actionId);
    const reactionOpportunities = skipReactionCheck
      ? []
      : this.findReactiveStrikeOpportunities(gameState, actor, actionId, prePosition);
    const readyOpportunities = this.findReadyActionOpportunities(gameState, actor, actionId);

    // Do NOT auto-advance turn - let player manually end their turn
    // Refresh derived stats for all creatures
    this.refreshDerivedStats(gameState);
    return { gameState, result, reactionOpportunities: [...reactionOpportunities, ...readyOpportunities] };
  }

  private findReactiveStrikeOpportunities(
    gameState: GameState,
    actor: Creature,
    actionId: string,
    prePosition: Position
  ): any[] {
    debugLog('🔍 [FIND_OPPS] Called for actionId:', actionId);
    const trigger = this.getReactiveStrikeTrigger(actionId, actor);
    debugLog('🔍 [GET_TRIGGER] Result:', trigger);
    if (!trigger) return [];

    if (trigger.type === 'move' && actionId === 'stride') {
      const hasShieldedStride = this.hasFeat(actor, 'Shielded Stride');
      if (hasShieldedStride && actor.shieldRaised) {
        const distanceMoved = Math.sqrt(
          Math.pow(actor.positions.x - prePosition.x, 2) + Math.pow(actor.positions.y - prePosition.y, 2)
        );
        const maxShieldedStrideSquares = ((actor.speed ?? 25) / 2) / 5;
        if (distanceMoved <= maxShieldedStrideSquares + 0.01) {
          debugLog('[ReactiveStrike] Shielded Stride suppresses move trigger', {
            actor: actor.name,
            distanceMoved,
            maxShieldedStrideSquares,
          });
          return [];
        }
      }
    }
    const actionName = this.getActionDisplayName(actionId, actor);

    const opportunities: any[] = [];
    const triggerContext = {
      actionId,
      actionName,
      trigger: trigger.type,
      actorId: actor.id,
      actorName: actor.name,
      prePosition,
      postPosition: actor.positions,
    };
    debugLog('[ReactiveStrike] Trigger candidate', triggerContext);
    for (const creature of gameState.creatures) {
      debugLog(`🔎 [LOOP] Checking creature: ${creature.name} (${creature.id})`);
      if (creature.id === actor.id) { debugLog(`  ⏭️  Skip: same as actor`); continue; }
      if (creature.currentHealth <= 0 || creature.dying) { debugLog(`  ⏭️  Skip: dead/dying`); continue; }
      if (creature.reactionUsed) { debugLog(`  ⏭️  Skip: reaction already used`); continue; }
      const hasFeat = this.hasReactiveStrikeFeat(creature);
      debugLog(`  🎯 Has Reactive Strike feat: ${hasFeat}`);
      if (!hasFeat) { debugLog(`  ⏭️  Skip: no feat`); continue; }

      const reactorContext = {
        reactorId: creature.id,
        reactorName: creature.name,
      };

      if (trigger.type === 'move') {
        const wasInReach = this.isWithinReach(creature.positions, prePosition);
        const moved = prePosition.x !== actor.positions.x || prePosition.y !== actor.positions.y;
        debugLog('[ReactiveStrike] Move check', {
          ...reactorContext,
          ...triggerContext,
          wasInReach,
          moved,
        });
        if (wasInReach && moved) {
          opportunities.push({
            type: 'reactive-strike',
            reactorId: creature.id,
            reactorName: creature.name,
            targetId: actor.id,
            targetName: actor.name,
            trigger: trigger.type,
            triggeringActionId: actionId,
            triggeringActionName: actionName,
            triggeringCreatureName: actor.name,
          });
        }
      } else {
        const isInReach = this.isWithinReach(creature.positions, actor.positions);
        debugLog('[ReactiveStrike] Non-move check', {
          ...reactorContext,
          ...triggerContext,
          isInReach,
        });
        if (isInReach) {
          opportunities.push({
            type: 'reactive-strike',
            reactorId: creature.id,
            reactorName: creature.name,
            targetId: actor.id,
            targetName: actor.name,
            trigger: trigger.type,
            triggeringActionId: actionId,
            triggeringActionName: actionName,
            triggeringCreatureName: actor.name,
          });
        }
      }
    }

    return opportunities;
  }

  private findReadyActionOpportunities(
    gameState: GameState,
    actor: Creature,
    actionId: string
  ): any[] {
    if (['ready', 'execute-ready', 'resume-delay', 'delay'].includes(actionId)) {
      return [];
    }

    const opportunities: any[] = [];
    for (const creature of gameState.creatures) {
      if (creature.id === actor.id) continue;
      if (creature.currentHealth <= 0 || creature.dying) continue;
      if (!creature.readyAction) continue;
      if (creature.reactionUsed) continue;

      const triggerType = creature.readyAction.triggerType ?? 'custom';
      if (triggerType !== 'custom') continue;

      const targetId = creature.readyAction.targetId ?? actor.id;
      const target = gameState.creatures.find(c => c.id === targetId);
      const actionName = this.getActionDisplayName(actionId, actor);

      opportunities.push({
        type: 'ready-action',
        reactorId: creature.id,
        reactorName: creature.name,
        targetId,
        targetName: target?.name ?? actor.name,
        trigger: triggerType,
        readiedActionId: creature.readyAction.actionId,
        triggeringActionId: actionId,
        triggeringActionName: actionName,
        triggeringCreatureName: actor.name,
      });
    }

    return opportunities;
  }

  private getActionDisplayName(actionId: string, actor: Creature): string {
    if (actionId === 'strike') {
      const weapon = actor.equippedWeapon ? getWeapon(actor.equippedWeapon) : null;
      const weaponType = weapon?.type ?? 'melee';
      return `Strike (${weaponType})`;
    }

    const nameMap: Record<string, string> = {
      move: 'Move',
      stride: 'Stride',
      step: 'Step',
      'raise-shield': 'Raise Shield',
      'lower-shield': 'Lower Shield',
      'take-cover': 'Take Cover',
      aid: 'Aid',
      'recall-knowledge': 'Recall Knowledge',
      interact: 'Interact',
      escape: 'Escape',
      seek: 'Seek',
      hide: 'Hide',
      sneak: 'Sneak',
    };

    return nameMap[actionId] ?? actionId;
  }

  private getReactiveStrikeTrigger(actionId: string, actor: Creature): { type: 'move' | 'manipulate' | 'ranged' } | null {
    const moveActions = ['move', 'stride', 'warp-step'];
    if (moveActions.includes(actionId)) {
      return { type: 'move' };
    }

    const manipulateActions = [
      'raise-shield',
      'lower-shield',
      'take-cover',
      'aid',
      'interact',
    ];
    if (manipulateActions.includes(actionId)) {
      return { type: 'manipulate' };
    }

    if (actionId === 'strike') {
      const weapon = actor.equippedWeapon ? getWeapon(actor.equippedWeapon) : null;
      const weaponType = weapon?.type ?? 'melee';
      if (weaponType === 'ranged') {
        return { type: 'ranged' };
      }
    }

    return null;
  }

  private hasReactiveStrikeFeat(creature: Creature): boolean {
    debugLog(`🔎 [HAS_FEAT] Checking ${creature.name}:`);
    debugLog(`  📋 feats:`, creature.feats);
    debugLog(`  💫 specials:`, creature.specials);
    
    const featMatch = creature.feats?.some((feat) => {
      if (typeof feat?.name !== 'string') return false;
      const name = feat.name.toLowerCase();
      return name.includes('reactive strike') || name.includes('attack of opportunity');
    }) ?? false;

    const specials = creature.specials;
    const specialsMatch = Array.isArray(specials)
      ? specials.some((entry: any) => typeof entry === 'string' && entry.toLowerCase().includes('reactive strike'))
      : false;

    debugLog(`  ✅ featMatch: ${featMatch}, specialsMatch: ${specialsMatch}`);
    return featMatch || specialsMatch;
  }

  private hasFeat(creature: Creature, featName: string): boolean {
    const lowerFeatName = featName.toLowerCase().trim();
    const featMatch = creature.feats?.some((feat: any) => {
      const name = typeof feat === 'string' ? feat : feat?.name;
      return typeof name === 'string' && name.toLowerCase().trim() === lowerFeatName;
    }) ?? false;
    const specialsMatch = creature.specials?.some((entry: any) =>
      typeof entry === 'string' && entry.toLowerCase().trim() === lowerFeatName
    ) ?? false;
    return featMatch || specialsMatch;
  }

  private isWithinReach(pos1: Position, pos2: Position): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return Math.max(dx, dy) <= 1; // Chebyshev distance: adjacent including diagonals
  }

  startTurn(gameId: string, creatureId: string): any {
    const gameState = this.games.get(gameId);
    if (!gameState) throw new Error('Game not found');

    const creature = gameState.creatures.find((c) => c.id === creatureId);
    if (!creature) throw new Error('Creature not found');

    // ═══════════════════════════════════════════════════════════
    // PHASE 2.2 & 2.3: ACTION ECONOMY CONDITIONS (Stunned, Slowed, Quickened)
    // ═══════════════════════════════════════════════════════════
    
    let actionsLost = 0;
    const conditionMessages: string[] = [];
    
    // STUNNED: Lose actions equal to stunned value, then reduce stunned by that amount
    const stunnedCondition = creature.conditions?.find((c) => c.name === 'stunned');
    if (stunnedCondition && stunnedCondition.value) {
      const stunnedLoss = Math.min(3, stunnedCondition.value);
      actionsLost += stunnedLoss;
      conditionMessages.push(`💫 ${creature.name} is stunned! Loses ${stunnedLoss} action(s)`);
      
      // Reduce stunned value by amount lost
      stunnedCondition.value -= stunnedLoss;
      if (stunnedCondition.value <= 0) {
        creature.conditions = creature.conditions?.filter((c) => c.name !== 'stunned');
        conditionMessages.push(`  ↳ Stunned condition removed`);
      }
    }
    
    // SLOWED: Lose actions equal to slowed value (persistent, doesn't reduce on its own)
    const slowedCondition = creature.conditions?.find((c) => c.name === 'slowed');
    if (slowedCondition && slowedCondition.value) {
      actionsLost += slowedCondition.value;
      conditionMessages.push(`🐌 ${creature.name} is slowed ${slowedCondition.value}! Loses ${slowedCondition.value} action(s)`);
    }
    
    // Calculate final action count for the turn (default 3, minus actions lost)
    let actionPoints = Math.max(0, 3 - actionsLost);
    
    // QUICKENED: Gain 1 extra action (with restrictions)
    const quickenedCondition = creature.conditions?.find((c) => c.name === 'quickened');
    if (quickenedCondition) {
      actionPoints += 1;
      conditionMessages.push(`⚡ ${creature.name} is quickened! Gains 1 extra action (restricted use)`);
    }
    
    // Log condition effects
    conditionMessages.forEach((msg) => {
      gameState.log.push({
        timestamp: Date.now(),
        type: 'condition',
        message: msg,
      });
    });

    // Auto-lower shield at start of turn
    if (creature.shieldRaised) {
      creature.shieldRaised = false;
      debugLog(`🛡️ ${creature.name}'s shield auto-lowered at turn start`);
    }

    // Reset reaction availability at the start of the turn
    creature.reactionUsed = false;
    // Reset Combat Reflexes extra reaction
    (creature as any).combatReflexesUsed = false;

    // Clear any pending shield block state
    if (creature.conditions?.length) {
      creature.conditions = creature.conditions.filter((c) => c.name !== 'shield-block-ready');
    }

    // Reset Multiple Attack Penalty counter
    creature.attacksMadeThisTurn = 0;
    creature.attackTargetsThisTurn = [];
    creature.flourishUsedThisTurn = false;

    // PASSIVE FIGHTER FEAT: Improved Dueling Parry — auto-apply +2 AC if wielding 1-handed weapon with free hand
    const hasFeat = (c: any, name: string) => {
      const lower = name.toLowerCase();
      return c.feats?.some((f: any) => {
        const n = typeof f === 'string' ? f : f?.name;
        return typeof n === 'string' && n.toLowerCase().trim() === lower;
      }) || c.specials?.some((s: string) => typeof s === 'string' && s.toLowerCase().trim() === lower);
    };

    // Remove previous auto-parry bonuses
    creature.bonuses = (creature.bonuses || []).filter(b => b.source !== 'improved-dueling-parry' && b.source !== 'twinned-defense');

    if (hasFeat(creature, 'improved dueling parry')) {
      const heldWeapons = creature.weaponInventory?.filter((s: any) => s.state === 'held') || [];
      if (heldWeapons.length === 1) {
        if (!creature.bonuses) creature.bonuses = [];
        creature.bonuses.push({ source: 'improved-dueling-parry', value: 2, type: 'circumstance', applyTo: 'ac' });
        conditionMessages.push(`🤺 ${creature.name}: Improved Dueling Parry — auto +2 AC`);
      }
    }

    // PASSIVE FIGHTER FEAT: Twinned Defense — auto-apply Twin Parry AC bonus if dual-wielding
    if (hasFeat(creature, 'twinned defense')) {
      const heldWeapons = creature.weaponInventory?.filter((s: any) => s.state === 'held') || [];
      if (heldWeapons.length >= 2) {
        const hasParryTrait = heldWeapons.some((s: any) =>
          s.weapon?.traits?.some((t: string) => typeof t === 'string' && t.toLowerCase() === 'parry')
        );
        const acBonus = hasParryTrait ? 2 : 1;
        if (!creature.bonuses) creature.bonuses = [];
        creature.bonuses.push({ source: 'twinned-defense', value: acBonus, type: 'circumstance', applyTo: 'ac' });
        conditionMessages.push(`🤺 ${creature.name}: Twinned Defense — auto +${acBonus} AC`);
      }
    }

    // Process persistent damage at the start of the turn
    const persistentDamageEntries = this.rulesEngine.processPersistentDamage(creature);

    // Log each persistent damage effect
    persistentDamageEntries.forEach((entry) => {
      gameState.log.push({
        timestamp: Date.now(),
        type: 'damage',
        message: entry.message,
        details: entry,
      });
    });

    creature.actionsRemaining = actionPoints;
    return { gameState, persistentDamageEntries, actionPoints, conditionMessages };
  }

  /** Recompute derived stats (AC, etc.) for all creatures */
  private refreshDerivedStats(gameState: GameState): void {
    for (const c of gameState.creatures) {
      computeDerivedStats(c);
    }
  }

  getGameState(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getAvailableGameIds(): string[] {
    return Array.from(this.games.keys());
  }

  loadGameState(gameState: GameState): void {
    this.games.set(gameState.id, gameState);
  }

  rerollInitiative(gameId: string): GameState {
    const gameState = this.games.get(gameId);
    if (!gameState) throw new Error('Game not found');

    // Filter out NPC tokens — they are non-combatants and don't participate in initiative
    const combatants = gameState.creatures.filter(c => c.type !== 'npc');
    const turnOrder = this.rulesEngine.rollInitiative(combatants);
    gameState.currentRound = {
      ...gameState.currentRound,
      number: 1,
      turnOrder,
      currentTurnIndex: 0,
      actions: [],
    };

    return gameState;
  }

  endTurn(gameId: string): GameState {
    const gameState = this.games.get(gameId);
    if (!gameState) throw new Error('Game not found');
    const round = gameState.currentRound;
    const endingCreatureId = round.turnOrder[round.currentTurnIndex];

    this.expireEndOfTurnConditions(gameState, endingCreatureId);
    this.advanceTurn(gameState);
    return gameState;
  }

  private expireEndOfTurnConditions(gameState: GameState, endingCreatureId: string): void {
    const endingCreature = gameState.creatures.find(c => c.id === endingCreatureId);
    debugLog(`\n⏰ [EXPIRE] Turn ending for: ${endingCreature?.name ?? endingCreatureId}`);

    gameState.creatures.forEach((creature) => {
      if (!creature.conditions || creature.conditions.length === 0) return;

      const before = creature.conditions.length;
      
      // Decrement condition values for the ending creature (e.g., frightened reduces by 1)
      if (creature.id === endingCreatureId) {
        creature.conditions.forEach((cond) => {
          if (cond.name === 'frightened' && typeof cond.value === 'number' && cond.value > 0) {
            cond.value -= 1;
            debugLog(`  📉 ${creature.name}: Frightened ${cond.value + 1} → ${cond.value}`);
          }
        });
      }

      // Remove conditions that have expired or have value 0
      creature.conditions = creature.conditions.filter((cond) => {
        // Remove frightened if value reaches 0
        if (cond.name === 'frightened' && typeof cond.value === 'number' && cond.value <= 0) {
          debugLog(`  ✅ ${creature.name}: Frightened removed (value reached 0)`);
          return false;
        }

        // Only process turn-end expiration conditions
        if (cond.expiresOnTurnEndOf !== endingCreatureId) return true;

        if (typeof cond.turnEndsRemaining === 'number') {
          cond.turnEndsRemaining -= 1;
          const keep = cond.turnEndsRemaining > 0;
          debugLog(`  📋 ${creature.name}: "${cond.name}" (source: ${cond.source}) turnEndsRemaining: ${cond.turnEndsRemaining + 1} → ${cond.turnEndsRemaining} → ${keep ? 'KEEP' : 'REMOVE'}`);
          return keep;
        }

        debugLog(`  📋 ${creature.name}: "${cond.name}" (source: ${cond.source}) no turnEndsRemaining → REMOVE`);
        return false;
      });
      const after = creature.conditions.length;
      if (before !== after) {
        debugLog(`  ✅ ${creature.name}: conditions ${before} → ${after}`);
      }

      // Handle Unleash Psyche duration tracking
      if (creature.id === endingCreatureId && creature.unleashPsycheActive) {
        if (typeof creature.unleashPsycheRoundsLeft === 'number') {
          creature.unleashPsycheRoundsLeft -= 1;
          if (creature.unleashPsycheRoundsLeft <= 0) {
            // Psyche collapse — remove bonuses, apply stupefied 1 for 2 rounds
            creature.unleashPsycheActive = false;
            creature.bonuses = (creature.bonuses ?? []).filter(b => b.source !== 'Unleash Psyche');
            creature.conditions = creature.conditions ?? [];
            creature.conditions.push({ name: 'stupefied', value: 1, duration: 2 });
            debugLog(`  🧠 ${creature.name}: Unleash Psyche ends — stupefied 1 for 2 rounds!`);
          } else {
            debugLog(`  🧠 ${creature.name}: Unleash Psyche — ${creature.unleashPsycheRoundsLeft} round(s) left`);
          }
        }
      }
    });
  }

  private initializeWeaponInventory(partial: Partial<Creature>): any[] {
    // If weaponInventory is already provided, use that
    if (partial.weaponInventory && partial.weaponInventory.length > 0) {
      return partial.weaponInventory;
    }

    // Otherwise, try to build from equippedWeapon
    const inventory: any[] = [];
    if (partial.equippedWeapon) {
      const weapon = getWeapon(partial.equippedWeapon);
      if (weapon) {
        // Convert Weapon from catalog to CreatureWeapon
        const creatureWeapon: any = {
          id: weapon.id,
          display: weapon.name,
          attackType: weapon.type,
          damageDice: weapon.damageFormula.split('+')[0], // e.g., "1d6" from "1d6+2"
          damageBonus: weapon.damageFormula.includes('+') ? parseInt(weapon.damageFormula.split('+')[1]) : undefined,
          damageType: weapon.damageType,
          hands: weapon.hands,
          traits: weapon.traits,
          range: weapon.range,
          weaponCatalogId: weapon.id,
          isNatural: false,
          icon: weapon.icon,
        };
        inventory.push({
          weapon: creatureWeapon,
          state: 'held'
        });
      }
    }

    // Always add Unarmed Strike as fallback if not already present
    if (!inventory.some(s => s.weapon.isNatural)) {
      inventory.push({
        weapon: {
          id: 'unarmed-strike',
          display: 'Unarmed Strike',
          attackType: 'melee',
          damageDice: '1d4',
          damageBonus: 0,
          damageType: 'bludgeoning',
          hands: 0,
          traits: ['agile', 'finesse', 'nonlethal'],
          range: 1,
          isNatural: true,
          icon: '👊',
        },
        state: 'held'
      });
    }

    return inventory;
  }

  private initializeCreature(partial: Partial<Creature>, type: Creature['type'], index: number, mapSize: number = 20): Creature {
    const level = partial.level || 1;
    const abilities = partial.abilities || createDefaultAbilities();
    const proficiencies = partial.proficiencies || createDefaultProficiencies();

    // Auto-fix class proficiencies for Character Builder characters that were saved
    // before their class data was corrected (e.g., Fighters should have expert weapons)
    const className = partial.characterClass?.toLowerCase();
    if (className === 'fighter') {
      const p = proficiencies as any;
      // Fighter: expert in unarmed, simple, martial weapons; trained in advanced
      if (p.unarmed !== 'expert' && p.unarmed !== 'master' && p.unarmed !== 'legendary') p.unarmed = 'expert';
      if (p.simpleWeapons !== 'expert' && p.simpleWeapons !== 'master' && p.simpleWeapons !== 'legendary') p.simpleWeapons = 'expert';
      if (p.martialWeapons !== 'expert' && p.martialWeapons !== 'master' && p.martialWeapons !== 'legendary') p.martialWeapons = 'expert';
      if (!p.advancedWeapons || p.advancedWeapons === 'untrained') p.advancedWeapons = 'trained';
      // Fighter: expert in fortitude, reflex, perception; trained in will
      if (p.fortitude !== 'expert' && p.fortitude !== 'master' && p.fortitude !== 'legendary') p.fortitude = 'expert';
      if (p.reflex !== 'expert' && p.reflex !== 'master' && p.reflex !== 'legendary') p.reflex = 'expert';
      if (p.perception !== 'expert' && p.perception !== 'master' && p.perception !== 'legendary') p.perception = 'expert';
      debugLog(`🛠️ [PROFICIENCY FIX] Fighter "${partial.name}" proficiencies auto-corrected`);
    }

    const armorBonus = partial.armorBonus ?? 2; // Default +2 from armor

    // Initialize shield HP if equipped
    let currentShieldHp: number | undefined;
    if (partial.equippedShield) {
      const shield = getShield(partial.equippedShield);
      if (shield) {
        currentShieldHp = shield.maxHp;
      }
    }

    const creature: Creature = {
      id: this.generateId(),
      name: partial.name || `${type}-${index}`,
      type,
      level,
      abilities,
      maxHealth: partial.maxHealth || 20,
      currentHealth: partial.currentHealth || partial.maxHealth || 20,
      proficiencies,
      armorClass: 10, // Computed below
      equippedWeapon: partial.equippedWeapon,
      armorBonus,
      equippedShield: partial.equippedShield,
      shieldRaised: partial.shieldRaised || false,
      currentShieldHp: currentShieldHp || partial.currentShieldHp,
      bonuses: partial.bonuses || [],
      penalties: partial.penalties || [],
      positions: partial.positions || { x: Math.floor(Math.random() * mapSize), y: Math.floor(Math.random() * mapSize) },
      speed: partial.speed || 25, // Speed in feet (default 25 for medium creatures)
      conditions: [],
      initiative: 0,
      attacksMadeThisTurn: 0,
      attackTargetsThisTurn: [],
      actionsRemaining: 3,
      flourishUsedThisTurn: false,
      reactionUsed: false,
      dying: false,
      deathSaveFailures: 0,
      deathSaveSuccesses: 0,
      deathSaveMadeThisTurn: false,
      wounded: 0,
      keyAbility: partial.keyAbility,
      spells: partial.spells || [],
      damageResistances: partial.damageResistances || [],
      damageImmunities: partial.damageImmunities || [],
      damageWeaknesses: partial.damageWeaknesses || [],
      // Preserve Pathbuilder-imported character data (only if defined)
      ...(partial.skills && { skills: partial.skills }),
      ...(partial.feats && { feats: partial.feats }),
      ...(partial.specials && { specials: partial.specials }),
      ...(partial.lores && { lores: partial.lores }),
      ...(partial.weaponDamageDice && { weaponDamageDice: partial.weaponDamageDice }),
      ...(partial.weaponDamageBonus !== undefined && { weaponDamageBonus: partial.weaponDamageBonus }),
      ...(partial.weaponDamageType && { weaponDamageType: partial.weaponDamageType }),
      ...(partial.characterClass && { characterClass: partial.characterClass }),
      ...(partial.ancestry && { ancestry: partial.ancestry }),
      ...(partial.heritage && { heritage: partial.heritage }),
      ...(partial.weaponDisplay && { weaponDisplay: partial.weaponDisplay }),
      ...(partial.pbAttackBonus !== undefined && { pbAttackBonus: partial.pbAttackBonus }),
      ...(partial.initiativeBonus !== undefined && { initiativeBonus: partial.initiativeBonus }),
      ...(partial.maxFocusPoints !== undefined && { maxFocusPoints: partial.maxFocusPoints }),
      ...(partial.focusPoints !== undefined && { focusPoints: partial.focusPoints }),
      ...(partial.heroPoints !== undefined && { heroPoints: partial.heroPoints }),
      ...(partial.focusSpells && { focusSpells: partial.focusSpells }),
      ...(partial.spellcasters && { spellcasters: partial.spellcasters }),
      // Token & portrait images (player uploads or bestiary type tokens)
      ...(partial.tokenImageUrl && { tokenImageUrl: partial.tokenImageUrl }),
      ...(partial.portraitImageUrl && { portraitImageUrl: partial.portraitImageUrl }),
      // Weapon inventory — initialize from weaponInventory or equippedWeapon
      weaponInventory: this.initializeWeaponInventory(partial),
    };

    // Compute derived stats (AC)
    computeDerivedStats(creature);

    // Initialize size-derived fields (space, naturalReach) from creature size
    const creatureSize = partial.size ?? 'medium';
    applySize(creature, creatureSize as any);

    // For NPC/bestiary creatures with an explicitly provided AC, override the computed value
    if (partial.armorClass !== undefined && partial.armorClass > 0) {
      creature.armorClass = partial.armorClass;
    }

    return creature;
  }

  private generateMap(size: number): EncounterMap {
    const terrain: TerrainTile[][] = [];
    for (let y = 0; y < size; y++) {
      terrain[y] = [];
      for (let x = 0; x < size; x++) {
        terrain[y][x] = {
          x,
          y,
          type: 'empty', // Map generator disabled for testing — was: Math.random() > 0.9 ? 'difficult' : 'empty'
        };
      }
    }
    return { width: size, height: size, terrain };
  }

  private advanceTurn(gameState: GameState): void {
    const round = gameState.currentRound;
    round.currentTurnIndex = (round.currentTurnIndex + 1) % round.turnOrder.length;

    // Reset death save flag for the new current creature
    let currentCreatureId = round.turnOrder[round.currentTurnIndex];
    let currentCreature = gameState.creatures.find((c) => c.id === currentCreatureId);
    const visited = new Set<string>();

    while (currentCreature?.isDelaying && !visited.has(currentCreature.id)) {
      visited.add(currentCreature.id);
      round.currentTurnIndex = (round.currentTurnIndex + 1) % round.turnOrder.length;
      currentCreatureId = round.turnOrder[round.currentTurnIndex];
      currentCreature = gameState.creatures.find((c) => c.id === currentCreatureId);
    }
    if (currentCreature) {
      currentCreature.deathSaveMadeThisTurn = false;
      // NOTE: The remaining turn-start resets (attacksMadeThisTurn, flourishUsedThisTurn,
      // reactionUsed, actionsRemaining, shield lowering, condition processing, etc.)
      // are handled comprehensively in startTurn(). We only reset deathSaveMadeThisTurn
      // here because it gates death-save availability before startTurn is called.

      // PASSIVE FIGHTER FEAT: Boundless Reprisals — all creatures with this feat
      // gain a reaction at the start of each OTHER creature's turn
      gameState.creatures.forEach((c) => {
        if (c.id !== currentCreature!.id && c.reactionUsed) {
          const hasBoundless = c.feats?.some((f: any) => {
            const name = typeof f === 'string' ? f : f?.name;
            return typeof name === 'string' && name.toLowerCase().trim() === 'boundless reprisals';
          }) || c.specials?.some((s: string) => s.toLowerCase().trim() === 'boundless reprisals');
          if (hasBoundless) {
            c.reactionUsed = false;
            (c as any).combatReflexesUsed = false;
            debugLog(`⚔️ ${c.name}: Boundless Reprisals — reaction refreshed for ${currentCreature!.name}'s turn`);
          }
        }
      });
    }

    if (round.currentTurnIndex === 0) {
      round.number++;
      // Apply condition durations, etc.
      gameState.creatures.forEach((c) => {
        c.conditions = c.conditions.filter((cond) => {
          if (cond.expiresOnTurnEndOf) return true;
          if (cond.duration === 'permanent') return true;
          cond.duration--;
          if (cond.duration > 0) return true;
          // Condition is expiring — clean up side effects
          if (cond.name === 'iron-body') {
            // Remove the physical resistances that were added by Iron Body
            c.damageResistances = (c.damageResistances || []).filter(
              r => r.source !== 'Iron Body'
            );
            debugLog(`  🪨 ${c.name}: Iron Body expired, removed physical resistances`);
          }
          return false;
        });
      });
    }
  }

  private generateId(): string {
    return crypto.randomUUID().slice(0, 8);
  }
}
