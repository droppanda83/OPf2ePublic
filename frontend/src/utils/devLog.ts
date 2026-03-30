/**
 * C.6 — Development-only logging utility.
 * All frontend console.log calls should use these instead.
 * In production builds, these become no-ops via tree-shaking.
 */

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

/** General debug log — only in dev mode */
export function devLog(...args: any[]): void {
  if (isDev) console.log(...args);
}

/** Warning log — only in dev mode */
export function devWarn(...args: any[]): void {
  if (isDev) console.warn(...args);
}

/** Error log — always active (errors should always be visible) */
export function devError(...args: any[]): void {
  console.error(...args);
}
