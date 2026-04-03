/**
 * Token Art Service — Resolves creature token and portrait art at runtime.
 *
 * Resolution priority:
 *   1. Art manifest (downloaded by import-token-art.js) — local cached files
 *   2. Cross-system alias lookup (D&D/generic names → PF2e equivalents)
 *   3. Generic SVG token by creature type tags (always available)
 *
 * The service loads the art manifest at startup and serves art URLs
 * without needing network access at runtime.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeCreatureId,
  resolveTokenArt,
  CROSS_SYSTEM_ALIASES,
  getArtCoverage,
} from 'pf2e-shared/tokenArt';

// ─── Manifest Types ──────────────────────────────────

interface ManifestEntry {
  token?: string;
  portrait?: string;
  source?: string;
  displayName?: string;
  tags?: string[];
  fallbackOnly?: boolean;
  cached?: boolean;
}

interface ArtManifest {
  version: string;
  generatedAt: string;
  totalEntries: number;
  withSpecificArt: number;
  entries: Record<string, ManifestEntry>;
}

// ─── Service State ───────────────────────────────────

let manifest: ArtManifest | null = null;
let artDir: string = '';

/**
 * Initialize the token art service.
 * Loads the art manifest and validates the art directory.
 *
 * @param publicDir  Path to frontend/public/ (where art/ lives)
 */
export function initTokenArtService(publicDir?: string): void {
  // Default: look for frontend/public relative to backend
  const resolvedPublicDir = publicDir || path.resolve(__dirname, '..', '..', '..', 'frontend', 'public');
  artDir = resolvedPublicDir;

  const manifestPath = path.resolve(__dirname, '..', '..', '..', 'scripts', 'foundry-import', 'generated', 'art-manifest.json');

  if (fs.existsSync(manifestPath)) {
    try {
      const raw = fs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(raw);
      console.log(`[token-art] Loaded art manifest: ${manifest!.withSpecificArt}/${manifest!.totalEntries} creatures with specific art`);
    } catch (err) {
      console.warn('[token-art] Failed to parse art manifest:', err);
      manifest = null;
    }
  } else {
    console.log('[token-art] No art manifest found — run "npm run import:token-art" to download creature art');
    manifest = null;
  }
}

// ─── Public API ──────────────────────────────────────

/**
 * Get the best available token art URL for a creature.
 *
 * @param creatureName  Exact bestiary name (e.g., "Goblin Warrior")
 * @param tags          Creature tags for fallback (e.g., ['humanoid', 'goblin'])
 * @returns             Relative URL path (e.g., "/art/tokens/goblin-warrior.webp" or "/tokens/humanoid.svg")
 */
export function getTokenArtUrl(creatureName: string, tags: string[] = []): string {
  const id = normalizeCreatureId(creatureName);

  // Check manifest first (actual downloaded files)
  if (manifest?.entries[id]) {
    const entry = manifest.entries[id];
    if (entry.token && !entry.fallbackOnly) {
      // Verify file exists on disk
      const filePath = path.join(artDir, entry.token.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        return entry.token;
      }
    }
  }

  // Check cross-system alias
  if (CROSS_SYSTEM_ALIASES[id]) {
    const aliasedId = normalizeCreatureId(CROSS_SYSTEM_ALIASES[id]);
    if (manifest?.entries[aliasedId]?.token && !manifest.entries[aliasedId].fallbackOnly) {
      const filePath = path.join(artDir, manifest.entries[aliasedId].token!.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        return manifest.entries[aliasedId].token!;
      }
    }
  }

  // Fall back to the shared resolution logic (which ultimately falls back to SVG tokens)
  return resolveTokenArt(creatureName, tags);
}

/**
 * Get portrait art URL for a creature.
 * Falls back to token art if no portrait available.
 */
export function getPortraitArtUrl(creatureName: string, tags: string[] = []): string {
  const id = normalizeCreatureId(creatureName);

  // Check manifest portrait
  if (manifest?.entries[id]?.portrait) {
    const filePath = path.join(artDir, manifest.entries[id].portrait!.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      return manifest.entries[id].portrait!;
    }
  }

  // Fall back to token art
  return getTokenArtUrl(creatureName, tags);
}

/**
 * Get art info for a creature — includes source/license for attribution.
 */
export function getCreatureArtInfo(creatureName: string, tags: string[] = []): {
  tokenUrl: string;
  portraitUrl: string;
  source: string;
  hasSpecificArt: boolean;
} {
  const tokenUrl = getTokenArtUrl(creatureName, tags);
  const portraitUrl = getPortraitArtUrl(creatureName, tags);
  const id = normalizeCreatureId(creatureName);
  const entry = manifest?.entries[id];

  return {
    tokenUrl,
    portraitUrl,
    source: entry?.source || 'svg-fallback',
    hasSpecificArt: !!(entry && !entry.fallbackOnly),
  };
}

/**
 * Get overall art coverage statistics.
 */
export function getArtStats(): {
  manifestLoaded: boolean;
  totalCreatures: number;
  withSpecificArt: number;
  coveragePercent: number;
  sources: Record<string, number>;
} {
  if (!manifest) {
    const coverage = getArtCoverage();
    return {
      manifestLoaded: false,
      totalCreatures: coverage.total,
      withSpecificArt: 0,
      coveragePercent: 0,
      sources: {},
    };
  }

  const sources: Record<string, number> = {};
  for (const entry of Object.values(manifest.entries)) {
    if (entry.source && !entry.fallbackOnly) {
      sources[entry.source] = (sources[entry.source] || 0) + 1;
    }
  }

  return {
    manifestLoaded: true,
    totalCreatures: manifest.totalEntries,
    withSpecificArt: manifest.withSpecificArt,
    coveragePercent: Math.round((manifest.withSpecificArt / Math.max(manifest.totalEntries, 1)) * 100),
    sources,
  };
}

/**
 * Check if a specific creature has non-fallback art available.
 */
export function hasSpecificArt(creatureName: string): boolean {
  const id = normalizeCreatureId(creatureName);
  const entry = manifest?.entries[id];
  return !!(entry && !entry.fallbackOnly && entry.token);
}
