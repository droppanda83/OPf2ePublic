// 
// itemActions.ts  Extracted item usage methods from RulesEngine
// Phase 14 refactor: consumable item activation (potions, elixirs, scrolls)
// 

import { Creature, GameState, getConsumable, rollDamageFormula, ActionResult } from 'pf2e-shared';

export function resolveUseItem(
  actor: Creature,
  gameState: GameState,
  itemId?: string,
  targetId?: string
): ActionResult {
  // Validate item ID provided
  if (!itemId) {
    return {
      success: false,
      message: 'Use Item requires specifying which item to use. Select an item from your inventory.'
    };
  }
  
  // Get consumable from catalog
  const consumable = getConsumable(itemId);
  if (!consumable) {
    return {
      success: false,
      message: `Consumable item "${itemId}" not found in catalog.`
    };
  }
  
  // Check inventory
  if (!actor.consumables || actor.consumables.length === 0) {
    return {
      success: false,
      message: `${actor.name} has no items in inventory!`
    };
  }
  
  const inventoryEntry = actor.consumables.find(c => c.id === itemId);
  if (!inventoryEntry || inventoryEntry.quantity <= 0) {
    return {
      success: false,
      message: `${actor.name} doesn't have any ${consumable.name}!`
    };
  }
  
  // Consume item (reduce quantity)
  inventoryEntry.quantity -= 1;
  if (inventoryEntry.quantity <= 0) {
    // Remove from inventory if depleted
    actor.consumables = actor.consumables.filter(c => c.id !== itemId);
  }
  
  // Determine target
  let target: Creature | undefined = actor; // Default to self
  if (targetId && targetId !== actor.id) {
    target = gameState.creatures.find(c => c.id === targetId);
    if (!target) {
      return {
        success: false,
        message: `Target creature not found!`
      };
    }
  }
  
  let effectMessage = '';
  
  // Apply effect based on consumable type
  switch (consumable.type) {
    case 'potion':
    case 'elixir':
      if (consumable.healingFormula) {
        // Healing potion/elixir
        const healingRoll = rollDamageFormula(consumable.healingFormula);
        const healingAmount = healingRoll.total;
        const oldHP = target.currentHealth;
        target.currentHealth = Math.min(target.currentHealth + healingAmount, target.maxHealth);
        const actualHealing = target.currentHealth - oldHP;
        
        effectMessage = `ðŸ’Š ${actor.name} uses **${consumable.name}**!\n` +
          `ðŸŽ² Healing Roll (${consumable.healingFormula}): ${healingAmount}\n` +
          `â¤ï¸ ${target.name} heals **${actualHealing} HP** (${oldHP} â†’ ${target.currentHealth}/${target.maxHealth})`;
      } else if (consumable.bonusType && consumable.bonusValue) {
        // Bonus elixir (e.g., Antidote, Antiplague)
        effectMessage = `ðŸ’Š ${actor.name} uses **${consumable.name}**!\n` +
          `âœ¨ Grants +${consumable.bonusValue} ${consumable.bonusType} bonus to ${consumable.bonusAppliesTo} for ${consumable.duration}`;
        // Note: Bonuses should be tracked as conditions in a full implementation
      } else {
        effectMessage = `ðŸ’Š ${actor.name} uses **${consumable.name}**!\n` +
          `${consumable.effect}`;
      }
      break;
    
    case 'scroll':
      // Scroll activation (simplified - actual spell casting would need full spell system integration)
      effectMessage = `ðŸ“œ ${actor.name} casts from **${consumable.name}**!\n` +
        `${consumable.effect}`;
      // TODO: Integrate with spell system (resolveSpell)
      break;
    
    case 'bomb':
      // Bombs require Strike action (separate from Use Item)
      return {
        success: false,
        message: 'Alchemical bombs are thrown using the Strike action, not Use Item.'
      };
    
    case 'talisman':
      // Talismans are free action/reaction activations
      effectMessage = `âœ¨ ${actor.name} activates **${consumable.name}**!\n` +
        `${consumable.effect}`;
      break;
    
    default:
      effectMessage = `${actor.name} uses **${consumable.name}**!\n` +
        `${consumable.effect}`;
  }
  
  return {
    success: true,
    message: effectMessage,
    details: {
      action: 'use-item',
      item: consumable.name,
      itemType: consumable.type,
      remainingQuantity: inventoryEntry?.quantity || 0
    }
  };
}
