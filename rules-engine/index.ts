/**
 * PF2e Rules Engine - Modular System
 * Central export point for all rule modules
 */

export { ModuleRegistry, BaseRuleModule } from './moduleSystem';
export {
  ActionEconomyModule,
  MovementModule,
  CombatModule,
  ConditionModule
} from './moduleSystem';

export {
  SpellModule,
  AbilityModule,
  ResistanceModule
} from './specialModules';

// Initialize default rules system
export function createDefaultRulesEngine() {
  const {
    ModuleRegistry,
    ActionEconomyModule,
    MovementModule,
    CombatModule,
    ConditionModule
  } = require('./moduleSystem.js');

  const {
    SpellModule,
    AbilityModule,
    ResistanceModule
  } = require('./specialModules.js');

  const registry = new ModuleRegistry();

  // Register core modules
  registry.registerModule(new ActionEconomyModule());
  registry.registerModule(new MovementModule());
  registry.registerModule(new CombatModule());
  registry.registerModule(new ConditionModule());

  // Register specialized modules
  registry.registerModule(new SpellModule());
  registry.registerModule(new AbilityModule());
  registry.registerModule(new ResistanceModule());

  return registry;
}

export interface RuleModule {
  name: string;
  version: string;
  initialize(): void;
  validate(action: any): boolean;
  apply(actor: any, gameState: any, action: any): any;
}
