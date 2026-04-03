/**
 * Token & Portrait Art System — Maps creatures to specific art assets.
 *
 * Priority order for art resolution:
 *   1. Exact name match (PF2e-specific creature art)
 *   2. Alias match (cross-system names, e.g., D&D → PF2e equivalents)
 *   3. Tag-based fallback (generic creature-type SVG tokens)
 *
 * Art sources (priority order):
 *   - PF2e Foundry VTT system (ORC-licensed creature portraits/tokens)
 *   - Forgotten Adventures (CC-BY free token packs)
 *   - Game-icons.net (CC-BY-3.0 icons for conditions/abilities)
 *   - Generic SVG tokens (already in frontend/public/tokens/)
 *
 * Downloaded art is cached in frontend/public/art/tokens/ and frontend/public/art/portraits/
 */

import { getCreatureTokenUrl } from './creatureTokens';

// ─── Types ───────────────────────────────────────────

/** Where the art originally came from */
export type ArtSource =
  | 'pf2e-foundry'        // Official PF2e Foundry VTT system (ORC)
  | 'forgotten-adventures' // Forgotten Adventures free token packs
  | 'game-icons'           // game-icons.net (CC-BY-3.0)
  | 'pf2e-remaster'       // Paizo Community Use art
  | 'dnd-generic'          // Cross-system generic fantasy (e.g., skeleton, bandit)
  | 'generic-fantasy'      // Setting-agnostic humanoid/creature art
  | 'custom'               // User-provided art
  | 'generated'            // AI-generated (future)
  | 'svg-fallback';        // Our generic SVG type tokens

/** Art file format */
export type ArtFormat = 'webp' | 'png' | 'jpg' | 'svg';

/** A single art asset (token or portrait) */
export interface ArtAsset {
  /** Relative URL path from public root (e.g., "/art/tokens/goblin-warrior.webp") */
  url: string;
  /** Art dimensions in pixels (tokens are typically 280x280 or 140x140) */
  width: number;
  height: number;
  /** File format */
  format: ArtFormat;
  /** Where this art came from */
  source: ArtSource;
  /** License identifier */
  license: string;
  /** Attribution text (required for CC-BY) */
  attribution?: string;
}

/** Complete art entry for a creature — may have both token and portrait */
export interface CreatureArt {
  /** Normalized creature name (lowercase, hyphenated, e.g., "goblin-warrior") */
  creatureId: string;
  /** Display name matching bestiary (e.g., "Goblin Warrior") */
  displayName: string;
  /** Round token image for battle grid */
  token?: ArtAsset;
  /** Portrait image for character sheet / sidebar */
  portrait?: ArtAsset;
  /** Tags from bestiary for fallback matching */
  tags: string[];
  /** Cross-system aliases (e.g., a D&D "Skeleton" maps to PF2e "Skeleton Guard") */
  aliases?: string[];
}

/** Registry of all known creature art mappings */
export interface TokenArtCatalog {
  /** Version for cache busting */
  version: string;
  /** Generation timestamp */
  generatedAt: string;
  /** All creature art entries, keyed by creatureId */
  entries: Record<string, CreatureArt>;
}

// ─── Normalization ───────────────────────────────────

/** Normalize a creature name to a stable ID: lowercase, spaces→hyphens, strip special chars */
export function normalizeCreatureId(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')       // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // Strip non-alphanumeric
    .replace(/\s+/g, '-')       // Spaces to hyphens
    .replace(/-+/g, '-')        // Collapse multiple hyphens
    .replace(/^-|-$/g, '');     // Trim leading/trailing hyphens
}

// ─── Cross-System Alias Map ──────────────────────────
/**
 * Maps generic/D&D creature names to PF2e bestiary names.
 * Used when a creature is conceptually identical across settings.
 * Key = normalized alias, Value = PF2e bestiary creature name.
 */
export const CROSS_SYSTEM_ALIASES: Record<string, string> = {
  // Undead — nearly identical across all fantasy settings
  'skeleton': 'Skeleton Guard',
  'skeleton-warrior': 'Skeleton Guard',
  'skeleton-soldier': 'Skeleton Guard',
  'zombie': 'Zombie Shambler',
  'zombie-walker': 'Zombie Shambler',
  'ghoul': 'Ghoul',
  'ghost': 'Ghost Commoner',
  'specter': 'Wraith',
  'spectre': 'Wraith',
  'wight': 'Wight',
  'mummy': 'Mummy Guardian',
  'vampire': 'Vampire Count',
  'vampire-spawn': 'Vampire Spawn',
  'lich': 'Lich',

  // Humanoid NPCs — generic across all fantasy settings
  'bandit': 'Bandit',
  'guard': 'Guard',
  'thug': 'Bandit',
  'ruffian': 'Bandit',
  'soldier': 'Guard',
  'town-guard': 'Guard',
  'city-guard': 'Guard',
  'commoner': 'Halfling Street Watcher',
  'peasant': 'Halfling Street Watcher',
  'tavern-keeper': 'Guard',          // Generic humanoid NPC
  'innkeeper': 'Guard',
  'merchant': 'Halfling Street Watcher',
  'noble': 'Watch Officer',

  // Goblinoids — shared across D&D and PF2e
  'goblin': 'Goblin Warrior',
  'hobgoblin': 'Hobgoblin Soldier',
  'kobold': 'Kobold Warrior',

  // Classic beasts — same in any fantasy setting
  'wolf': 'Wolf',
  'dire-wolf': 'Dire Wolf',
  'giant-spider': 'Giant Spider',
  'giant-rat': 'Giant Rat',
  'bear': 'Grizzly Bear',
  'boar': 'Boar',
  'giant-scorpion': 'Giant Scorpion',
  'giant-snake': 'Giant Viper',
  'crocodile': 'Crocodile',
  'eagle': 'Eagle',
  'hawk': 'Eagle',
  'horse': 'War Horse',
  'riding-horse': 'Riding Horse',
  'mule': 'Riding Pony',
  'pony': 'Riding Pony',
  'dog': 'Guard Dog',
  'hound': 'Guard Dog',
  'snake': 'Viper',
  'rat': 'Giant Rat',
  'bat': 'Giant Bat',
  'cat': 'Cunning Fox',

  // Elementals
  'fire-elemental': 'Living Wildfire',
  'water-elemental': 'Living Waterfall',
  'earth-elemental': 'Living Landslide',
  'air-elemental': 'Living Whirlwind',

  // Classic monsters — shared across most fantasy TTRPGs
  'ogre': 'Ogre Warrior',
  'troll': 'Troll',
  'minotaur': 'Minotaur',
  'harpy': 'Harpy',
  'basilisk': 'Basilisk',
  'manticore': 'Manticore',
  'griffon': 'Griffon',
  'sphinx': 'Sphinx',
  'medusa': 'Medusa',
  'cyclops': 'Cyclops',
  'chimera': 'Chimera',
  'hydra': 'Hydra',
  'wyvern': 'Wyvern',

  // Oozes
  'ooze': 'Ooze',
  'gelatinous-cube': 'Gelatinous Cube',
  'black-pudding': 'Black Pudding',

  // Constructs
  'golem': 'Stone Golem',
  'stone-golem': 'Stone Golem',
  'iron-golem': 'Iron Golem',
  'clay-golem': 'Clay Golem',
  'animated-armor': 'Animated Armor',

  // Demons & Devils — broadly shared
  'imp': 'Imp',
  'quasit': 'Quasit',

  // Dragons
  'dragon': 'Young Red Dragon',
  'red-dragon': 'Young Red Dragon',
  'young-dragon': 'Young Red Dragon',
};

// ─── Art Sources ─────────────────────────────────────
/**
 * game-icons.net — CC-BY 3.0 SVG icons for creature identification.
 * Downloaded by import-token-art.js to frontend/public/art/tokens/
 * Attribution required: see https://game-icons.net/about.html#authors
 */
export const GAME_ICONS_ATTRIBUTION = 'Icons by game-icons.net contributors (CC-BY 3.0)';

// ─── Art Resolution ──────────────────────────────────

/**
 * Resolve the best available token art URL for a creature.
 *
 * At compile time, this only does tag-based fallback.
 * At runtime, the tokenArtService checks the art manifest for specific icons
 * downloaded by import-token-art.js (game-icons.net SVGs).
 *
 * Priority (runtime — handled by tokenArtService):
 *   1. Art manifest match (downloaded game-icons SVG)
 *   2. Cross-system alias → manifest match
 *   3. Generic SVG token by creature type tags (this function)
 *
 * @param creatureName  Exact bestiary name (e.g., "Goblin Warrior")
 * @param tags          Creature tags for fallback (e.g., ['humanoid', 'goblin'])
 * @returns             Best available token URL (tag-based fallback)
 */
export function resolveTokenArt(_creatureName: string, tags: string[]): string {
  // Tag-based fallback — the runtime service handles manifest lookups
  return getCreatureTokenUrl(tags);
}

/**
 * Resolve portrait art URL for a creature.
 * Falls back to token art since we don't have portrait-specific art yet.
 */
export function resolvePortraitArt(creatureName: string, tags: string[]): string {
  return resolveTokenArt(creatureName, tags);
}

// ─── Catalog Stats ───────────────────────────────────

/** Get count of creatures with specific art (not generic fallback) */
export function getArtCoverage(): { withArt: number; total: number; percentage: number } {
  // At compile time, we don't know exact coverage — the manifest is generated at import time.
  // Return 0 and let the runtime service provide actual stats from the manifest.
  return {
    withArt: 0,
    total: 1737,
    percentage: 0,
  };
}

/** List all creature names that have specific art available */
export function getCreaturesWithArt(): string[] {
  // At compile time, return empty — runtime service reads from manifest
  return [];
}

