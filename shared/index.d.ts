export * from './types';
export declare function calculateDistance(from: {
    x: number;
    y: number;
}, to: {
    x: number;
    y: number;
}): number;
export declare function isCreatureAlive(creature: any): boolean;
export declare function formatHealth(current: number, max: number): string;
export declare function getCreatureStatus(creature: any): string;
export declare function getColor(status: string): string;
export declare function rollDice(times: number, sides: number): number[];
export declare function rollD20(): number;
export declare function sumDice(rolls: number[]): number;
