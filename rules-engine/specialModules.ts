import { Creature, GameState, Action } from 'pf2e-shared';
import { BaseRuleModule } from './moduleSystem';

/**
 * Spell System Module
 * Manages spell casting, spell slots, and spell effects
 */
export class SpellModule extends BaseRuleModule {
  name = 'SpellSystem';
  version = '1.0.0';

  private spellDatabase: Map<string, SpellDefinition> = new Map();
  private spellSlotsUsed: Map<string, number[]> = new Map(); // [level: usedCount]

  initialize(): void {
    super.initialize();
    this.registerDefaultSpells();
  }

  validate(action: any): boolean {
    return action.type === 'spell' && this.spellDatabase.has(action.spellId);
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    const spell = this.spellDatabase.get(action.spellId);
    if (!spell) {
      return { success: false, message: 'Spell not found' };
    }

    // Check spell slots
    const usedSlots = this.spellSlotsUsed.get(actor.id) || new Array(10).fill(0);
    if (usedSlots[spell.level] >= actor.level) {
      return { success: false, message: `No spell slots of level ${spell.level} available` };
    }

    // Resolve spell effects
    const result = this.resolveSpell(actor, gameState, spell, action);

    if (result.success) {
      usedSlots[spell.level]++;
      this.spellSlotsUsed.set(actor.id, usedSlots);
    }

    return {
      success: result.success,
      message: result.message,
      spellName: spell.name,
      effect: result.effect,
      actionCost: spell.actionCost
    };
  }

  private resolveSpell(actor: Creature, gameState: GameState, spell: SpellDefinition, action: any): any {
    switch (spell.school) {
      case 'evocation':
        return this.resolveEvocationSpell(actor, gameState, spell, action);
      case 'transmutation':
        return this.resolveTransmutationSpell(actor, gameState, spell, action);
      case 'abjuration':
        return this.resolveAbjurationSpell(actor, gameState, spell, action);
      default:
        return { success: false, message: 'Unknown spell school' };
    }
  }

  private resolveEvocationSpell(actor: Creature, gameState: GameState, spell: SpellDefinition, action: any): any {
    // Evocation spells deal damage
    const target = gameState.creatures.find(c => c.id === action.targetId);
    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    const damage = Math.floor(Math.random() * 6) + 1 + actor.level; // 1d6 + level simplified
    target.currentHealth -= damage;

    return {
      success: true,
      message: `${actor.name} cast ${spell.name} for ${damage} damage to ${target.name}`,
      effect: { type: 'damage', damage, targetId: action.targetId }
    };
  }

  private resolveTransmutationSpell(actor: Creature, gameState: GameState, spell: SpellDefinition, action: any): any {
    // Transmutation spells modify properties
    if (action.targetId === actor.id) {
      actor.conditions.push({
        name: `enhanced-${spell.id}`,
        duration: spell.duration,
        value: spell.effect?.bonus
      });
      return {
        success: true,
        message: `${actor.name} cast ${spell.name} on self, gaining ${spell.effect?.bonus} bonus`,
        effect: { type: 'buff', bonus: spell.effect?.bonus }
      };
    }
    return { success: false, message: 'Transmutation spell requires valid target' };
  }

  private resolveAbjurationSpell(actor: Creature, gameState: GameState, spell: SpellDefinition, action: any): any {
    // Abjuration spells protect
    actor.conditions.push({
      name: `protected-${spell.id}`,
      duration: spell.duration,
      value: spell.effect?.armorBonus
    });
    return {
      success: true,
      message: `${actor.name} cast ${spell.name}, gaining ${spell.effect?.armorBonus} AC`,
      effect: { type: 'protection', armorBonus: spell.effect?.armorBonus }
    };
  }

  private registerDefaultSpells(): void {
    this.spellDatabase.set('magic-missile', {
      id: 'magic-missile',
      name: 'Magic Missile',
      level: 1,
      school: 'evocation',
      actionCost: 2,
      duration: 0,
      description: 'Conjure magical projectiles that strike the target',
      effect: { damage: 3 }
    });

    this.spellDatabase.set('shield', {
      id: 'shield',
      name: 'Shield',
      level: 1,
      school: 'abjuration',
      actionCost: 1,
      duration: 1,
      description: 'Grant temporary protection',
      effect: { armorBonus: 2 }
    });

    this.spellDatabase.set('haste', {
      id: 'haste',
      name: 'Haste',
      level: 3,
      school: 'transmutation',
      actionCost: 2,
      duration: 3,
      description: 'Increase movement and attack speed',
      effect: { bonus: 1 }
    });
  }

  resetSpellSlots(creatureId: string): void {
    this.spellSlotsUsed.set(creatureId, new Array(10).fill(0));
  }
}

/**
 * Ability Module
 * Manages special abilities and unique creature actions
 */
export class AbilityModule extends BaseRuleModule {
  name = 'Abilities';
  version = '1.0.0';

  private abilityDatabase: Map<string, AbilityDefinition> = new Map();
  private abilityUsesRemaining: Map<string, Map<string, number>> = new Map();

  initialize(): void {
    super.initialize();
    this.registerDefaultAbilities();
  }

  validate(action: any): boolean {
    return action.type === 'ability' && this.abilityDatabase.has(action.abilityId);
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    const ability = this.abilityDatabase.get(action.abilityId);
    if (!ability) {
      return { success: false, message: 'Ability not found' };
    }

    // Check ability uses
    const creatureUses = this.abilityUsesRemaining.get(actor.id) || new Map();
    const usesRemaining = creatureUses.get(ability.id) || ability.chargesPerDay;

    if (usesRemaining <= 0) {
      return { success: false, message: `${ability.name} has no charges remaining` };
    }

    // Resolve ability
    const result = this.resolveAbility(actor, gameState, ability, action);

    if (result.success) {
      creatureUses.set(ability.id, usesRemaining - 1);
      this.abilityUsesRemaining.set(actor.id, creatureUses);
    }

    return {
      ...result,
      abilityName: ability.name,
      chargesRemaining: usesRemaining - 1
    };
  }

  private resolveAbility(actor: Creature, gameState: GameState, ability: AbilityDefinition, action: any): any {
    // Implementation depends on ability type
    switch (ability.type) {
      case 'damage':
        return { success: true, message: `${actor.name} used ${ability.name}!`, effect: { type: 'damage' } };
      case 'heal':
        return { success: true, message: `${actor.name} used ${ability.name}!`, effect: { type: 'heal' } };
      case 'utility':
        return { success: true, message: `${actor.name} used ${ability.name}!`, effect: { type: 'utility' } };
      default:
        return { success: false, message: 'Unknown ability type' };
    }
  }

  private registerDefaultAbilities(): void {
    this.abilityDatabase.set('power-attack', {
      id: 'power-attack',
      name: 'Power Attack',
      type: 'damage',
      actionCost: 2,
      chargesPerDay: null, // unlimited
      description: 'Make a powerful attack with penalty to hit but bonus damage'
    });

    this.abilityDatabase.set('second-wind', {
      id: 'second-wind',
      name: 'Second Wind',
      type: 'heal',
      actionCost: 1,
      chargesPerDay: 1,
      description: 'Restore some health during combat'
    });
  }

  resetAbilityCharges(creatureId: string): void {
    this.abilityUsesRemaining.delete(creatureId);
  }
}

/**
 * Resistance and Immunity Module
 * Manages damage resistance, immunities, and weaknesses
 */
export class ResistanceModule extends BaseRuleModule {
  name = 'Resistances';
  version = '1.0.0';

  private damageResistances: Map<string, DamageResistance[]> = new Map();

  validate(action: any): boolean {
    // This module validates damage application
    return action.type === 'damage' || action.type === 'strike';
  }

  apply(actor: Creature, gameState: GameState, action: any): any {
    // Should be called after damage is calculated
    if (action.damage === undefined) {
      return action;
    }

    const resistances = this.damageResistances.get(actor.id) || [];
    let finalDamage = action.damage;

    for (const resistance of resistances) {
      finalDamage = this.applyResistance(finalDamage, resistance);
    }

    return {
      ...action,
      originalDamage: action.damage,
      finalDamage,
      resistancesApplied: resistances.length > 0
    };
  }

  private applyResistance(damage: number, resistance: DamageResistance): number {
    switch (resistance.type) {
      case 'immunity':
        return 0;
      case 'resistance':
        return Math.max(0, damage - (resistance.value || 10));
      case 'weakness':
        return damage + (resistance.value || 5);
      default:
        return damage;
    }
  }

  addResistance(creatureId: string, type: 'immunity' | 'resistance' | 'weakness', damageType: string, value?: number): void {
    if (!this.damageResistances.has(creatureId)) {
      this.damageResistances.set(creatureId, []);
    }
    
    const resistances = this.damageResistances.get(creatureId)!;
    resistances.push({ type, damageType, value });
  }
}

// Type definitions
interface SpellDefinition {
  id: string;
  name: string;
  level: number;
  school: 'evocation' | 'transmutation' | 'abjuration' | 'divination' | 'necromancy' | 'enchantment' | 'conjuration' | 'illusion';
  actionCost: number;
  duration: number;
  description: string;
  effect?: Record<string, any>;
}

interface AbilityDefinition {
  id: string;
  name: string;
  type: 'damage' | 'heal' | 'utility' | 'movement' | 'special';
  actionCost: number;
  chargesPerDay: number | null;
  description: string;
}

interface DamageResistance {
  type: 'immunity' | 'resistance' | 'weakness';
  damageType: string;
  value?: number;
}
