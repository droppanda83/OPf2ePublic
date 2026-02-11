/**
 * Shield definitions for PF2e Rebirth
 */
export interface Shield {
    id: string;
    name: string;
    armorBonus: number;
    hardness: number;
    hp: number;
    maxHp: number;
    hands: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'unique';
    traits: string[];
    icon: string;
    description: string;
}
export declare const SHIELD_CATALOG: Record<string, Shield>;
export declare const getShield: (shieldId: string) => Shield | undefined;
