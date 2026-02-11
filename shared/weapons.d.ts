/**
 * Weapon definitions for PF2e Rebirth
 */
import { DamageType } from './spells';
export interface Weapon {
    id: string;
    name: string;
    damageFormula: string;
    damageType: DamageType;
    type: 'melee' | 'ranged';
    range?: number;
    hands: number;
    proficiencyCategory: 'unarmed' | 'simple' | 'martial' | 'advanced';
    rarity: 'common' | 'uncommon' | 'rare' | 'unique';
    traits: string[];
    icon: string;
    description: string;
}
export declare const WEAPON_CATALOG: Record<string, Weapon>;
export declare const getWeapon: (weaponId: string) => Weapon | undefined;
