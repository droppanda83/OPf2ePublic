/**
 * Pathfinder 2e Core Actions
 * These are the basic actions available to all creatures
 */
export interface PF2eAction {
    id: string;
    name: string;
    cost: number;
    description: string;
    icon: string;
    requiresTarget?: boolean;
    range?: number;
    trait?: 'attack' | 'move' | 'manipulate' | 'concentrate' | 'secret';
}
/**
 * Core PF2e actions available to all creatures
 */
export declare const CORE_ACTIONS: PF2eAction[];
import { Creature } from './types';
/**
 * Get all available actions for a creature
 * Filters based on what the creature has equipped/can do
 */
export declare function getAvailableActions(creature: Partial<Creature>): PF2eAction[];
