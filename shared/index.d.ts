export * from './types';
export * from './movement';
export * from './ac';
export * from './spells';
export { getSpell } from './spells';
export * from './weapons';
export * from './shields';
export * from './actions';
export * from './bonuses';
export * from './bestiary';
export * from './encounterBuilder';
export declare function rollDice(times: number, sides: number): number[];
import { DamageType, Creature } from './types';
export declare function calculateFinalDamage(baseDamage: number, damageType: DamageType, target: Creature): {
    finalDamage: number;
    modifier: 'immune' | 'resist' | 'weak' | 'normal';
    modifierValue?: number;
};
export interface ShieldDamageResult {
    incomingDamage: number;
    shieldAbsorbed: number;
    shieldTakenDamage: number;
    creatureTakenDamage: number;
    shieldBroken: boolean;
    shieldHpRemaining: number;
}
export declare function applyDamageToShield(creature: Creature, incomingDamage: number): ShieldDamageResult;
