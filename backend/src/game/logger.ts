/**
 * Debug logger for combat engine.
 * Gated behind DEBUG_COMBAT env var to avoid noisy output in production.
 * Set DEBUG_COMBAT=true to enable verbose combat logging.
 */
const DEBUG = process.env.DEBUG_COMBAT === 'true';

export function debugLog(...args: unknown[]): void {
  if (DEBUG) console.log(...args);
}
