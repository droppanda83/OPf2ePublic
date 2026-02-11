import { Creature, GameState, EncounterMap, TerrainTile, CombatRound, Position, getShield, getWeapon, computeDerivedStats, createDefaultAbilities, createDefaultProficiencies } from 'pf2e-shared';
import { RulesEngine } from './rules';

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
      ...players.map((p, i) => this.initializeCreature(p, 'player', i)),
      ...creatures.map((c, i) => this.initializeCreature(c, 'creature', i)),
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
    allCreatures.forEach((c) => ((c as any)._map = gameState.map));

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
    heroPointsSpent?: number
  ): any {
    const gameState = this.games.get(gameId);
    if (!gameState) throw new Error('Game not found');

    const actor = gameState.creatures.find((c) => c.id === creatureId);
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
      heroPointsSpent
    );

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

    // Do NOT auto-advance turn - let player manually end their turn
    // Refresh derived stats for all creatures
    this.refreshDerivedStats(gameState);
    return { gameState, result, reactionOpportunities };
  }

  private findReactiveStrikeOpportunities(
    gameState: GameState,
    actor: Creature,
    actionId: string,
    prePosition: Position
  ): any[] {
    console.log('🔍 [FIND_OPPS] Called for actionId:', actionId);
    const trigger = this.getReactiveStrikeTrigger(actionId, actor);
    console.log('🔍 [GET_TRIGGER] Result:', trigger);
    if (!trigger) return [];
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
    console.log('[ReactiveStrike] Trigger candidate', triggerContext);
    for (const creature of gameState.creatures) {
      console.log(`🔎 [LOOP] Checking creature: ${creature.name} (${creature.id})`);
      if (creature.id === actor.id) { console.log(`  ⏭️  Skip: same as actor`); continue; }
      if (creature.currentHealth <= 0 || creature.dying) { console.log(`  ⏭️  Skip: dead/dying`); continue; }
      if (creature.reactionUsed) { console.log(`  ⏭️  Skip: reaction already used`); continue; }
      const hasFeat = this.hasReactiveStrikeFeat(creature);
      console.log(`  🎯 Has Reactive Strike feat: ${hasFeat}`);
      if (!hasFeat) { console.log(`  ⏭️  Skip: no feat`); continue; }

      const reactorContext = {
        reactorId: creature.id,
        reactorName: creature.name,
      };

      if (trigger.type === 'move') {
        const wasInReach = this.isWithinReach(creature.positions, prePosition);
        const moved = prePosition.x !== actor.positions.x || prePosition.y !== actor.positions.y;
        console.log('[ReactiveStrike] Move check', {
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
        console.log('[ReactiveStrike] Non-move check', {
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
      'recall-knowledge',
      'interact',
      'escape',
      'seek',
      'hide',
      'sneak',
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
    console.log(`🔎 [HAS_FEAT] Checking ${creature.name}:`);
    console.log(`  📋 feats:`, creature.feats);
    console.log(`  💫 specials:`, (creature as any).specials);
    
    const featMatch = creature.feats?.some((feat) => {
      if (typeof feat?.name !== 'string') return false;
      const name = feat.name.toLowerCase();
      return name.includes('reactive strike') || name.includes('attack of opportunity');
    }) ?? false;

    const specials = (creature as any).specials;
    const specialsMatch = Array.isArray(specials)
      ? specials.some((entry: any) => typeof entry === 'string' && entry.toLowerCase().includes('reactive strike'))
      : false;

    console.log(`  ✅ featMatch: ${featMatch}, specialsMatch: ${specialsMatch}`);
    return featMatch || specialsMatch;
  }

  private isWithinReach(pos1: Position, pos2: Position): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy) <= 1.5;
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
      actionsLost += stunnedCondition.value;
      conditionMessages.push(`💫 ${creature.name} is stunned! Loses ${stunnedCondition.value} action(s)`);
      
      // Reduce stunned value by amount lost
      stunnedCondition.value -= stunnedCondition.value;
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
      console.log(`🛡️ ${creature.name}'s shield auto-lowered at turn start`);
    }

    // Reset reaction availability at the start of the turn
    creature.reactionUsed = false;

    // Clear any pending shield block state
    if (creature.conditions?.length) {
      creature.conditions = creature.conditions.filter((c) => c.name !== 'shield-block-ready');
    }

    // Reset Multiple Attack Penalty counter
    creature.attacksMadeThisTurn = 0;
    creature.flourishUsedThisTurn = false;

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
    console.log(`\n⏰ [EXPIRE] Turn ending for: ${endingCreature?.name ?? endingCreatureId}`);

    gameState.creatures.forEach((creature) => {
      if (!creature.conditions || creature.conditions.length === 0) return;

      const before = creature.conditions.length;
      
      // Decrement condition values for the ending creature (e.g., frightened reduces by 1)
      if (creature.id === endingCreatureId) {
        creature.conditions.forEach((cond) => {
          if (cond.name === 'frightened' && typeof cond.value === 'number' && cond.value > 0) {
            cond.value -= 1;
            console.log(`  📉 ${creature.name}: Frightened ${cond.value + 1} → ${cond.value}`);
          }
        });
      }

      // Remove conditions that have expired or have value 0
      creature.conditions = creature.conditions.filter((cond) => {
        // Remove frightened if value reaches 0
        if (cond.name === 'frightened' && typeof cond.value === 'number' && cond.value <= 0) {
          console.log(`  ✅ ${creature.name}: Frightened removed (value reached 0)`);
          return false;
        }

        // Only process turn-end expiration conditions
        if (cond.expiresOnTurnEndOf !== endingCreatureId) return true;

        if (typeof cond.turnEndsRemaining === 'number') {
          cond.turnEndsRemaining -= 1;
          const keep = cond.turnEndsRemaining > 0;
          console.log(`  📋 ${creature.name}: "${cond.name}" (source: ${cond.source}) turnEndsRemaining: ${cond.turnEndsRemaining + 1} → ${cond.turnEndsRemaining} → ${keep ? 'KEEP' : 'REMOVE'}`);
          return keep;
        }

        console.log(`  📋 ${creature.name}: "${cond.name}" (source: ${cond.source}) no turnEndsRemaining → REMOVE`);
        return false;
      });
      const after = creature.conditions.length;
      if (before !== after) {
        console.log(`  ✅ ${creature.name}: conditions ${before} → ${after}`);
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

  private initializeCreature(partial: Partial<Creature>, type: Creature['type'], index: number): Creature {
    const level = partial.level || 1;
    const abilities = partial.abilities || createDefaultAbilities();
    const proficiencies = partial.proficiencies || createDefaultProficiencies();
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
      positions: partial.positions || { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) },
      speed: partial.speed || 25, // Speed in feet (default 25 for medium creatures)
      conditions: [],
      initiative: 0,
      attacksMadeThisTurn: 0,
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
      // Weapon inventory — initialize from weaponInventory or equippedWeapon
      weaponInventory: this.initializeWeaponInventory(partial),
    };

    // Compute derived stats (AC)
    computeDerivedStats(creature);

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
          type: Math.random() > 0.9 ? 'difficult' : 'empty',
        };
      }
    }
    return { width: size, height: size, terrain };
  }

  private advanceTurn(gameState: GameState): void {
    const round = gameState.currentRound;
    round.currentTurnIndex = (round.currentTurnIndex + 1) % round.turnOrder.length;

    // Reset death save flag for the new current creature
    const currentCreatureId = round.turnOrder[round.currentTurnIndex];
    const currentCreature = gameState.creatures.find((c) => c.id === currentCreatureId);
    if (currentCreature) {
      currentCreature.deathSaveMadeThisTurn = false;
      currentCreature.flourishUsedThisTurn = false;
      currentCreature.attacksMadeThisTurn = 0;
      currentCreature.reactionUsed = false;
      // Auto-lower shield at start of turn
      if (currentCreature.shieldRaised) {
        currentCreature.shieldRaised = false;
        console.log(`🛡️ ${currentCreature.name}'s shield auto-lowered at turn start`);
      }
    }

    if (round.currentTurnIndex === 0) {
      round.number++;
      // Apply condition durations, etc.
      gameState.creatures.forEach((c) => {
        c.conditions = c.conditions.filter((cond) => {
          if (cond.expiresOnTurnEndOf) return true;
          if (cond.duration === 'permanent') return true;
          cond.duration--;
          return cond.duration > 0;
        });
      });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(7);
  }
}
