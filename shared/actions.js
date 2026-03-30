"use strict";
/**
 * Pathfinder 2e Core Actions
 * These are the basic actions available to all creatures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORE_ACTIONS = void 0;
exports.getAvailableActions = getAvailableActions;
/**
 * Core PF2e actions available to all creatures
 */
exports.CORE_ACTIONS = [
    {
        id: 'strike',
        name: 'Strike',
        cost: 1,
        description: 'Make a melee or ranged attack',
        icon: '⚔️',
        requiresTarget: true,
        range: 1,
        trait: 'attack'
    },
    {
        id: 'stride',
        name: 'Stride',
        cost: 1,
        description: 'Move up to your Speed',
        icon: '👣',
        requiresTarget: true,
        range: 6.5,
        trait: 'move'
    },
    {
        id: 'raise-shield',
        name: 'Raise Shield',
        cost: 1,
        description: 'Gain +2 AC and use your shield\'s Hardness',
        icon: '🛡️',
        requiresTarget: false,
        trait: 'manipulate'
    },
    {
        id: 'shove',
        name: 'Shove',
        cost: 1,
        description: 'Push a creature 5 feet away (Athletics vs Fortitude DC)',
        icon: '🫸',
        requiresTarget: true,
        range: 1,
        trait: 'attack'
    }
];
/**
 * Get all available actions for a creature
 * Filters based on what the creature has equipped/can do
 */
function getAvailableActions(creature) {
    const actions = [];
    // Always include Strike, Stride, and Shove
    actions.push(exports.CORE_ACTIONS.find(a => a.id === 'strike'), exports.CORE_ACTIONS.find(a => a.id === 'stride'), exports.CORE_ACTIONS.find(a => a.id === 'shove'));
    // Add Raise Shield only if creature has a shield equipped
    if (creature.equippedShield) {
        const raiseShield = exports.CORE_ACTIONS.find(a => a.id === 'raise-shield');
        // Modify action if shield is already raised
        if (creature.shieldRaised) {
            actions.push({
                ...raiseShield,
                id: 'lower-shield',
                name: 'Lower Shield',
                description: 'Lower your shield',
                icon: '⬇️',
                cost: 0
            });
        }
        else {
            actions.push(raiseShield);
        }
    }
    return actions;
}
