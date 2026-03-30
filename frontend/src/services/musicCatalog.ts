/**
 * Music Catalog — Free ambient background music for GM context-dependent playback.
 *
 * All tracks listed here are royalty-free / Creative Commons Zero (CC0) or
 * equivalent public-domain-style licences suitable for personal & non-commercial use.
 *
 * The player can load tracks from:
 *   1. This built-in catalog (curated free tracks)
 *   2. Custom URLs added by the GM at runtime
 *   3. Local files dropped onto the player
 */

// ─── Types ──────────────────────────────────────────

export type MusicTag =
  | 'combat'
  | 'exploration'
  | 'tavern'
  | 'rest'
  | 'dramatic'
  | 'mystery'
  | 'horror'
  | 'victory'
  | 'boss'
  | 'town'
  | 'dungeon'
  | 'nature'
  | 'stealth'
  | 'sad'
  | 'epic';

export interface MusicTrack {
  /** Unique ID */
  id: string;
  /** Display name */
  title: string;
  /** Artist / source credit */
  artist: string;
  /** GM-facing context tags */
  tags: MusicTag[];
  /** Audio URL — can be external (https) or a relative path to /public/music/ */
  url: string;
  /** Duration hint in seconds (0 = unknown / will be auto-detected) */
  duration: number;
  /** Is this a user-added custom track? */
  custom?: boolean;
}

// ─── Tag metadata ───────────────────────────────────

export const MUSIC_TAG_META: Record<MusicTag, { label: string; icon: string; color: string }> = {
  combat:      { label: 'Combat',      icon: '⚔️', color: '#e53935' },
  boss:        { label: 'Boss Fight',  icon: '💀', color: '#b71c1c' },
  exploration: { label: 'Exploration', icon: '🗺️', color: '#43a047' },
  tavern:      { label: 'Tavern',      icon: '🍺', color: '#ff8f00' },
  town:        { label: 'Town',        icon: '🏘️', color: '#8d6e63' },
  rest:        { label: 'Rest',        icon: '🌙', color: '#5c6bc0' },
  dramatic:    { label: 'Dramatic',    icon: '🎭', color: '#ab47bc' },
  mystery:     { label: 'Mystery',     icon: '🔍', color: '#7e57c2' },
  horror:      { label: 'Horror',      icon: '👻', color: '#37474f' },
  dungeon:     { label: 'Dungeon',     icon: '🏰', color: '#546e7a' },
  nature:      { label: 'Nature',      icon: '🌲', color: '#2e7d32' },
  stealth:     { label: 'Stealth',     icon: '🗡️', color: '#455a64' },
  sad:         { label: 'Sad',         icon: '💧', color: '#1565c0' },
  victory:     { label: 'Victory',     icon: '🏆', color: '#fdd835' },
  epic:        { label: 'Epic',        icon: '🔥', color: '#d84315' },
};

export const ALL_MUSIC_TAGS: MusicTag[] = Object.keys(MUSIC_TAG_META) as MusicTag[];

// ─── Built-in Catalog ───────────────────────────────
// These tracks are free to use. URLs point to reliable CDN/hosting.
// Replace or extend with your own tracks as desired.
//
// Sources used:
//   • Freesound.org (freesound.org) — Creative Commons licensed tracks
//     Preview URLs are low-quality MP3 snippets hosted on Freesound CDN.
//   • Additional free ambient loops from public domain composers
//
// To add local music: place .mp3/.ogg files in frontend/public/music/ and
// reference them as "/music/filename.mp3".

export const BUILT_IN_TRACKS: MusicTrack[] = [
  // ── Combat ──
  {
    id: 'builtin-combat-1',
    title: 'Epic Game Soundtrack',
    artist: 'Matio888 (Freesound)',
    tags: ['combat', 'epic'],
    url: 'https://cdn.freesound.org/previews/789/789294_16936704-lq.mp3',
    duration: 131,
  },
  {
    id: 'builtin-combat-2',
    title: 'Cinematic Epic',
    artist: 'AudioCoffee (Freesound)',
    tags: ['combat', 'boss', 'epic'],
    url: 'https://cdn.freesound.org/previews/725/725001_15232790-lq.mp3',
    duration: 81,
  },
  {
    id: 'builtin-combat-3',
    title: 'Fast Epic Trailer',
    artist: 'LiteSaturation (Freesound)',
    tags: ['combat', 'dramatic'],
    url: 'https://cdn.freesound.org/previews/785/785643_14640845-lq.mp3',
    duration: 66,
  },

  // ── Exploration ──
  {
    id: 'builtin-explore-1',
    title: 'Realm of Adventure',
    artist: 'waxsocks (Freesound)',
    tags: ['exploration', 'nature'],
    url: 'https://cdn.freesound.org/previews/683/683938_1766049-lq.mp3',
    duration: 83,
  },
  {
    id: 'builtin-explore-2',
    title: 'Born To Fly',
    artist: 'AudioCoffee (Freesound)',
    tags: ['exploration', 'epic'],
    url: 'https://cdn.freesound.org/previews/710/710833_15232790-lq.mp3',
    duration: 60,
  },

  // ── Tavern ──
  {
    id: 'builtin-tavern-1',
    title: 'RPG Village Theme',
    artist: 'Mark_Murray (Freesound)',
    tags: ['tavern', 'town'],
    url: 'https://cdn.freesound.org/previews/706/706052_13315998-lq.mp3',
    duration: 86,
  },
  {
    id: 'builtin-tavern-2',
    title: 'Ambient Loop',
    artist: 'michael_grinnell (Freesound)',
    tags: ['tavern', 'rest'],
    url: 'https://cdn.freesound.org/previews/464/464384_7372230-lq.mp3',
    duration: 120,
  },

  // ── Mystery / Dungeon ──
  {
    id: 'builtin-mystery-1',
    title: 'Dark Cave Background',
    artist: 'SolarPhasing (Freesound)',
    tags: ['mystery', 'dungeon', 'horror'],
    url: 'https://cdn.freesound.org/previews/490/490585_8568126-lq.mp3',
    duration: 135,
  },
  {
    id: 'builtin-dungeon-1',
    title: 'Dark Dungeon Ambience',
    artist: 'Kinoton (Freesound)',
    tags: ['dungeon', 'stealth'],
    url: 'https://cdn.freesound.org/previews/516/516566_2247456-lq.mp3',
    duration: 180,
  },

  // ── Rest / Calm ──
  {
    id: 'builtin-rest-1',
    title: 'Peaceful Forest',
    artist: 'klankbeeld (Freesound)',
    tags: ['rest', 'nature'],
    url: 'https://cdn.freesound.org/previews/528/528752_1648170-lq.mp3',
    duration: 59,
  },
  {
    id: 'builtin-rest-2',
    title: 'Calm Overlook',
    artist: 'SondreDrakensson (Freesound)',
    tags: ['rest', 'town'],
    url: 'https://cdn.freesound.org/previews/506/506495_6628165-lq.mp3',
    duration: 120,
  },

  // ── Dramatic / Sad ──
  {
    id: 'builtin-dramatic-1',
    title: 'Abstract Ambient',
    artist: 'ShadyDave (Freesound)',
    tags: ['dramatic', 'sad'],
    url: 'https://cdn.freesound.org/previews/345/345838_4548252-lq.mp3',
    duration: 120,
  },
  {
    id: 'builtin-victory-1',
    title: 'Above The Sky',
    artist: 'MusicByMisterbates (Freesound)',
    tags: ['victory', 'epic'],
    url: 'https://cdn.freesound.org/previews/716/716385_3968818-lq.mp3',
    duration: 42,
  },

  // ── Horror ──
  {
    id: 'builtin-horror-1',
    title: 'Dark Cave Atmosphere',
    artist: 'SolarPhasing (Freesound)',
    tags: ['horror', 'mystery'],
    url: 'https://cdn.freesound.org/previews/490/490584_8568126-lq.mp3',
    duration: 240,
  },
];

// ─── Persistence helpers ────────────────────────────

const CUSTOM_TRACKS_KEY = 'pf2e_custom_music';
const MUSIC_VOLUME_KEY = 'pf2e_music_volume';

export function loadCustomTracks(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TRACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTracks(tracks: MusicTrack[]): void {
  localStorage.setItem(CUSTOM_TRACKS_KEY, JSON.stringify(tracks));
}

export function loadVolume(): number {
  const raw = localStorage.getItem(MUSIC_VOLUME_KEY);
  const val = raw ? parseFloat(raw) : 0.3;
  return isNaN(val) ? 0.3 : Math.max(0, Math.min(1, val));
}

export function saveVolume(vol: number): void {
  localStorage.setItem(MUSIC_VOLUME_KEY, String(Math.max(0, Math.min(1, vol))));
}

/** Get ALL available tracks (built-in + custom) */
export function getAllTracks(): MusicTrack[] {
  return [...BUILT_IN_TRACKS, ...loadCustomTracks()];
}
