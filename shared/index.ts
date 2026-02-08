// Export all shared types
export * from './types';

// Utility functions
export function calculateDistance(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

export function isCreatureAlive(creature: any): boolean {
  return creature.currentHealth > 0;
}

export function formatHealth(current: number, max: number): string {
  return `${current}/${max} HP`;
}

export function getCreatureStatus(creature: any): string {
  if (!isCreatureAlive(creature)) {
    return 'Defeated';
  }
  const healthPercent = (creature.currentHealth / creature.maxHealth) * 100;
  if (healthPercent > 75) return 'Healthy';
  if (healthPercent > 50) return 'Injured';
  if (healthPercent > 25) return 'Badly Wounded';
  return 'Critical';
}

export function getColor(status: string): string {
  switch (status) {
    case 'Healthy': return '#4CAF50';
    case 'Injured': return '#FFC107';
    case 'Badly Wounded': return '#FF9800';
    case 'Critical': return '#F44336';
    case 'Defeated': return '#9E9E9E';
    default: return '#2196F3';
  }
}

// Dice rolling utility
export function rollDice(times: number, sides: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < times; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }
  return results;
}

export function rollD20(): number {
  return rollDice(1, 20)[0];
}

export function sumDice(rolls: number[]): number {
  return rolls.reduce((a, b) => a + b, 0);
}
