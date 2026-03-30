/**
 * MapTester — Atlas-based map generation testing page.
 *
 * Uses the approved atlas tile sets (terrain + objects) from exported JSON files
 * to generate maps with proper 2×2 sub-tiles per game grid cell and a separate
 * mechanics layer for movement qualifiers.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  parseAtlasData,
  generateAtlasMap,
  AtlasData,
  GeneratedMap,
  MapTheme,
  MapGenOptions,
  MechanicsCell,
  MovementType,
  PlacedOverlay,
  Season,
} from '../atlasMapGenerator';

// ─── Constants ──────────────────────────────────────────────

const ATLAS_TILE_PX = 32;

/** Map of atlas name → image URL for all atlas sheets. */
const ATLAS_URLS: Record<string, string> = {
  terrain:         '/textures/terrain_atlas.png',
  base:            '/textures/base_out_atlas.png',
  lpc_exterior:    '/textures/lpc_exterior_tiles.png',
  lpc_outside_obj: '/textures/lpc_outside_objects.png',
  lpc_terrain_out: '/textures/lpc_terrain_outside.png',
  house_inside:    '/textures/house_inside.png',
  lpc_interior:    '/textures/lpc_interior.png',
  lpc_interior2:   '/textures/lpc_interior_2.png',
  lpc_effects:     '/textures/lpc_effects.png',
  lpc_items:       '/textures/lpc_items.png',
  lpc_greek:       '/textures/lpc_greek_architecture.png',
  dungeon_floors:  '/textures/dungeon_walls_floors.png',
};

/** Movement type → colour for the mechanics debug overlay */
const MOVEMENT_COLORS: Record<MovementType, string> = {
  normal:    'rgba(0, 200, 0, 0.18)',
  difficult: 'rgba(255, 165, 0, 0.30)',
  hazardous: 'rgba(255, 40, 40, 0.35)',
  swim:      'rgba(30, 120, 255, 0.35)',
  climb:     'rgba(180, 100, 50, 0.35)',
  blocked:   'rgba(60, 60, 60, 0.50)',
  'fly-only':'rgba(200, 180, 255, 0.30)',
  door:      'rgba(200, 200, 50, 0.35)',
};

const MOVEMENT_LABELS: Record<MovementType, string> = {
  normal:    '·',
  difficult: 'D',
  hazardous: '!',
  swim:      '~',
  climb:     '↑',
  blocked:   '█',
  'fly-only':'∞',
  door:      '⊞',
};

// ─── Atlas image cache ──────────────────────────────────────

const atlasImageCache: Record<string, HTMLImageElement> = {};

function getAtlasImage(name: string): HTMLImageElement | null {
  if (atlasImageCache[name]) return atlasImageCache[name];
  const url = ATLAS_URLS[name];
  if (!url) {
    console.warn(`Unknown atlas sheet: "${name}"`);
    return null;
  }
  const img = new Image();
  img.src = url;
  atlasImageCache[name] = img;
  return img;
}

/** Preload all atlas images and return a promise that resolves when complete */
function preloadAtlasImages(): Promise<void> {
  const promises = Object.entries(ATLAS_URLS).map(([name, url]) => {
    return new Promise<void>((resolve) => {
      let img = atlasImageCache[name];
      if (!img) {
        img = new Image();
        img.src = url;
        atlasImageCache[name] = img;
      }
      if (img.complete) { resolve(); return; }
      img.onload = () => resolve();
      img.onerror = () => { console.warn(`Failed to load atlas: ${name}`); resolve(); };
    });
  });
  return Promise.all(promises).then(() => {});
}

// ─── Atlas metadata for tile inspector ──────────────────────

interface AtlasMetaEntry {
  description: string;
  tags: string[];
  tileType: string;
}

interface EnrichedOverlay extends PlacedOverlay {
  meta: AtlasMetaEntry | null;
}

/** Inspected cell data */
interface InspectedCell {
  x: number;
  y: number;
  terrain: string | null;
  mechanics: MechanicsCell;
  overlays: EnrichedOverlay[];
  nearbyOverlays: EnrichedOverlay[];
}

// ─── Theme metadata ─────────────────────────────────────────

const THEMES: { value: MapTheme; label: string; defaultW: number; defaultH: number }[] = [
  { value: 'wilderness', label: 'Wilderness',  defaultW: 30, defaultH: 20 },
  { value: 'dungeon',    label: 'Dungeon',     defaultW: 30, defaultH: 20 },
  { value: 'indoor',     label: 'Indoor',      defaultW: 24, defaultH: 18 },
  { value: 'cave',       label: 'Cave',        defaultW: 28, defaultH: 22 },
  { value: 'urban',      label: 'Urban',       defaultW: 30, defaultH: 20 },
];

const DENSITY_OPTIONS = ['sparse', 'normal', 'dense'] as const;
const SEASON_OPTIONS: { value: Season | ''; label: string }[] = [
  { value: '',       label: 'Any (no filter)' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
];

// ─── Renderer ───────────────────────────────────────────────

/** Render a GeneratedMap to a canvas context */
function renderAtlasMap(
  ctx: CanvasRenderingContext2D,
  map: GeneratedMap,
  cellSize: number,
  showGrid: boolean,
  showMechanics: boolean,
): void {
  const { width, height, overlays, mechanics } = map;
  const canvasW = width * cellSize;
  const canvasH = height * cellSize;

  // Clear
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Background fill (dark)  
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // ── Draw atlas overlays ──
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  for (const ov of overlays) {
    const img = getAtlasImage(ov.atlas);
    if (!img?.complete) continue;

    const srcX = ov.col * ATLAS_TILE_PX;
    const srcY = ov.row * ATLAS_TILE_PX;
    const s = ov.scale ?? 0.5;
    const dstSize = cellSize * s;

    ctx.drawImage(
      img,
      srcX, srcY, ATLAS_TILE_PX, ATLAS_TILE_PX,
      ov.x * cellSize, ov.y * cellSize, dstSize, dstSize,
    );
  }

  ctx.imageSmoothingEnabled = prevSmoothing;

  // ── Mechanics debug overlay ──
  if (showMechanics && mechanics) {
    ctx.save();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = mechanics[y]?.[x];
        if (!cell) continue;

        const px = x * cellSize;
        const py = y * cellSize;

        // Fill with movement colour
        ctx.fillStyle = MOVEMENT_COLORS[cell.movement] || 'rgba(0,0,0,0)';
        ctx.fillRect(px, py, cellSize, cellSize);

        // Cover indicator (border)
        if (cell.cover !== 'none') {
          const coverColors = { lesser: '#ffeb3b', standard: '#ff9800', greater: '#f44336' };
          ctx.strokeStyle = coverColors[cell.cover] || '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }

        // Opaque indicator
        if (cell.opaque) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(px + cellSize - 6, py + 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Movement label
        const label = MOVEMENT_LABELS[cell.movement];
        if (label && cell.movement !== 'normal') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = `bold ${Math.max(8, cellSize * 0.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, px + cellSize / 2, py + cellSize / 2);
        }

        // Elevation text
        if (cell.elevation !== 0) {
          ctx.fillStyle = cell.elevation > 0 ? 'rgba(255, 200, 50, 0.8)' : 'rgba(100, 180, 255, 0.8)';
          ctx.font = `${Math.max(7, cellSize * 0.2)}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(cell.elevation > 0 ? `+${cell.elevation}` : `${cell.elevation}`, px + 2, py + 2);
        }
      }
    }
    ctx.restore();
  }

  // ── Grid lines ──
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvasH);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvasW, y * cellSize);
      ctx.stroke();
    }
  }
}

// ─── Styles ─────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100vh',
    background: '#1a1a2e', color: '#e0e0e0', fontFamily: "'Segoe UI', Tahoma, sans-serif",
    overflow: 'hidden',
  },
  header: {
    padding: '8px 16px', background: '#16213e', borderBottom: '1px solid #0f3460',
    display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
  },
  title: { margin: 0, fontSize: 18, color: '#e94560', fontWeight: 700, letterSpacing: 1 },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 300, minWidth: 300, background: '#16213e', borderRight: '1px solid #0f3460',
    display: 'flex', flexDirection: 'column', overflow: 'auto', padding: 12, gap: 10,
  },
  canvasArea: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'auto', padding: 16, position: 'relative' as any,
  },
  canvas: { border: '2px solid #0f3460', borderRadius: 4, imageRendering: 'pixelated' as any },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' as any, letterSpacing: 1 },
  input: {
    padding: '6px 8px', background: '#0a0a1a', border: '1px solid #333',
    borderRadius: 4, color: '#e0e0e0', fontSize: 13, width: '100%', boxSizing: 'border-box' as any,
  },
  select: {
    padding: '6px 8px', background: '#0a0a1a', border: '1px solid #333',
    borderRadius: 4, color: '#e0e0e0', fontSize: 13, width: '100%', boxSizing: 'border-box' as any,
  },
  btn: {
    padding: '10px 16px', background: '#e94560', border: 'none', borderRadius: 6,
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
  },
  btnSecondary: {
    padding: '8px 12px', background: '#0f3460', border: '1px solid #1a4b8c',
    borderRadius: 6, color: '#e0e0e0', fontSize: 12, cursor: 'pointer',
  },
  row: { display: 'flex', gap: 8 },
  section: {
    borderTop: '1px solid #333', paddingTop: 8, marginTop: 4,
  },
  metaBox: {
    background: '#0a0a1a', borderRadius: 6, padding: 10, fontSize: 12,
    lineHeight: 1.6, whiteSpace: 'pre-wrap' as any, maxHeight: 240, overflow: 'auto',
  },
  checkbox: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' },
  badge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 10,
    background: '#0f3460', color: '#7ac7ff', fontSize: 11, fontWeight: 600,
  },
  inspector: {
    position: 'absolute' as any, bottom: 0, left: 0, right: 0,
    background: '#0d1b2a', borderTop: '2px solid #e94560',
    padding: '10px 16px', display: 'flex', gap: 24, alignItems: 'flex-start',
    fontSize: 12, zIndex: 10, maxHeight: 260, overflow: 'auto',
  },
  inspectorCol: {
    display: 'flex', flexDirection: 'column' as any, gap: 3, minWidth: 160,
  },
  inspectorLabel: {
    fontSize: 10, color: '#e94560', textTransform: 'uppercase' as any,
    letterSpacing: 1, fontWeight: 700, marginBottom: 2,
  },
  inspectorValue: {
    color: '#e0e0e0', fontSize: 13, fontFamily: "'Consolas', 'Courier New', monospace",
  },
  inspectorMuted: {
    color: '#666', fontSize: 11,
  },
  overlayChip: {
    display: 'inline-block', padding: '2px 6px', borderRadius: 4, margin: '1px 4px 1px 0',
    background: '#2a1a3c', color: '#c89cff', fontSize: 11, fontFamily: "'Consolas', monospace",
  },
  legendBox: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: 11,
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: 4,
  },
  legendSwatch: {
    width: 14, height: 14, borderRadius: 2, border: '1px solid #444', flexShrink: 0,
  },
};

// ─── Component ──────────────────────────────────────────────

export const MapTester: React.FC = () => {
  // ── State: atlas data ──
  const [atlasData, setAtlasData] = useState<AtlasData | null>(null);
  const [atlasMeta, setAtlasMeta] = useState<Record<string, AtlasMetaEntry>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [atlasReady, setAtlasReady] = useState(false);

  // Load JSON data + preload atlas images on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [setsResp, metaResp] = await Promise.all([
          fetch('/approved-atlas-sets.json'),
          fetch('/atlas-metadata.json'),
        ]);
        if (!setsResp.ok) throw new Error(`Failed to load approved-atlas-sets.json: ${setsResp.status}`);
        if (!metaResp.ok) throw new Error(`Failed to load atlas-metadata.json: ${metaResp.status}`);

        const [setsJson, metaJson] = await Promise.all([setsResp.json(), metaResp.json()]);
        if (cancelled) return;

        const data = parseAtlasData(setsJson, metaJson);
        setAtlasData(data);
        setAtlasMeta(metaJson);

        // Preload atlas images
        await preloadAtlasImages();
        if (cancelled) return;
        setAtlasReady(true);

        console.log(`Atlas loaded: ${data.terrains.length} terrains, ${data.objects.length} objects`);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
        console.error('Failed to load atlas data:', err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  /** Lookup metadata for an overlay */
  const lookupMeta = useCallback((o: PlacedOverlay): AtlasMetaEntry | null => {
    const key = `${o.atlas}:${o.col},${o.row}`;
    return atlasMeta[key] ?? null;
  }, [atlasMeta]);

  /** Enrich an overlay with its metadata */
  const enrichOverlay = useCallback((o: PlacedOverlay): EnrichedOverlay => {
    return { ...o, meta: lookupMeta(o) };
  }, [lookupMeta]);

  // ── State: controls ──
  const [theme, setTheme] = useState<MapTheme>('wilderness');
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(20);
  const [seed, setSeed] = useState<number | ''>('');
  const [cellSize, setCellSize] = useState(32);
  const [showGrid, setShowGrid] = useState(true);
  const [showMechanics, setShowMechanics] = useState(false);
  const [density, setDensity] = useState<'sparse' | 'normal' | 'dense'>('normal');
  const [season, setSeason] = useState<Season | ''>('');

  // ── State: map ──
  const [mapData, setMapData] = useState<GeneratedMap | null>(null);
  const [renderTime, setRenderTime] = useState(0);
  const [history, setHistory] = useState<{ seed: number; theme: string }[]>([]);
  const [inspected, setInspected] = useState<InspectedCell | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // When theme changes, update default dimensions
  useEffect(() => {
    const t = THEMES.find(t => t.value === theme);
    if (t) {
      setWidth(t.defaultW);
      setHeight(t.defaultH);
    }
  }, [theme]);

  // ── Render ──
  const renderMap = useCallback((map: GeneratedMap) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = map.width * cellSize;
    canvas.height = map.height * cellSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t0 = performance.now();
    renderAtlasMap(ctx, map, cellSize, showGrid, showMechanics);
    setRenderTime(Math.round(performance.now() - t0));
  }, [cellSize, showGrid, showMechanics]);

  // ── Canvas interaction ──
  const canvasToGrid = useCallback((e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const gx = Math.floor(px / cellSize);
    const gy = Math.floor(py / cellSize);
    if (gx < 0 || gy < 0 || gx >= mapData.width || gy >= mapData.height) return null;
    return { x: gx, y: gy };
  }, [cellSize, mapData]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = canvasToGrid(e);
    if (!pos || !mapData) { setInspected(null); return; }

    const terrain = mapData.terrainGrid[pos.y]?.[pos.x] ?? null;
    const mech = mapData.mechanics[pos.y]?.[pos.x] ?? {
      movement: 'normal' as MovementType, cover: 'none' as const,
      elevation: 0, opaque: false,
    };

    // Overlays at this cell
    const overlaysHere = (mapData.overlays ?? [])
      .filter(o => Math.floor(o.x) === pos.x && Math.floor(o.y) === pos.y)
      .map(enrichOverlay);

    // Nearby overlays (±1 tile)
    const nearbyOverlays = (mapData.overlays ?? [])
      .filter(o =>
        Math.abs(Math.floor(o.x) - pos.x) <= 1 &&
        Math.abs(Math.floor(o.y) - pos.y) <= 1 &&
        !(Math.floor(o.x) === pos.x && Math.floor(o.y) === pos.y)
      )
      .map(enrichOverlay);

    setInspected({ x: pos.x, y: pos.y, terrain, mechanics: mech, overlays: overlaysHere, nearbyOverlays });

    // Re-render with highlight
    renderMap(mapData);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x * cellSize + 1, pos.y * cellSize + 1, cellSize - 2, cellSize - 2);
      ctx.restore();
    }, 10);
  }, [canvasToGrid, mapData, renderMap, enrichOverlay, cellSize]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoverPos(canvasToGrid(e));
  }, [canvasToGrid]);

  // ── Generate ──
  const generate = useCallback(() => {
    if (!atlasData) return;

    const useSeed = typeof seed === 'number' && seed > 0
      ? seed
      : Math.floor(Math.random() * 999999);
    if (typeof seed !== 'number' || seed <= 0) setSeed(useSeed);

    const opts: MapGenOptions = {
      width, height, theme, seed: useSeed, density,
      ...(season ? { season } : {}),
    };

    const map = generateAtlasMap(opts, atlasData);
    setMapData(map);

    setHistory(prev => [
      { seed: useSeed, theme },
      ...prev.slice(0, 19),
    ]);

    // Render after a tick so canvas can update
    setTimeout(() => renderMap(map), 0);
  }, [atlasData, theme, width, height, seed, density, season, renderMap]);

  // Re-render on visual option changes
  useEffect(() => {
    if (mapData) {
      renderMap(mapData);
    }
  }, [cellSize, showGrid, showMechanics, mapData, renderMap]);

  // Keyboard shortcut: Enter to generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) generate();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [generate]);

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 999999));

  // ── Terrain stats ──
  const terrainStats = mapData ? (() => {
    const counts: Record<string, number> = {};
    for (const row of mapData.terrainGrid) {
      for (const t of row) {
        const key = t ?? '(empty)';
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${t}: ${c}`)
      .join('\n');
  })() : '';

  // ── Mechanics stats ──
  const mechStats = mapData ? (() => {
    const counts: Partial<Record<MovementType, number>> = {};
    for (const row of mapData.mechanics) {
      for (const cell of row) {
        counts[cell.movement] = (counts[cell.movement] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([t, c]) => `${t}: ${c}`)
      .join('\n');
  })() : '';

  // ── Loading/Error state ──
  if (loadError) {
    return (
      <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#e94560' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Failed to load atlas data</div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>{loadError}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 16 }}>
            Make sure <code>approved-atlas-sets.json</code> and <code>atlas-metadata.json</code>{' '}
            are in the public directory.
          </div>
        </div>
      </div>
    );
  }

  if (!atlasData || !atlasReady) {
    return (
      <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#7ac7ff' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16 }}>Loading atlas data & textures...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🗺️ Atlas Map Generator</h1>
        <span style={{ fontSize: 12, color: '#666' }}>
          {atlasData.terrains.length} terrains · {atlasData.objects.length} objects loaded
        </span>
        <div style={{ flex: 1 }} />
      </div>

      <div style={styles.body}>
        {/* Sidebar Controls */}
        <div style={styles.sidebar}>
          {/* Theme */}
          <div style={styles.field}>
            <label style={styles.label}>Theme</label>
            <select
              style={styles.select}
              value={theme}
              onChange={e => setTheme(e.target.value as MapTheme)}
            >
              {THEMES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Dimensions */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Width</label>
              <input
                type="number" min={8} max={60} style={styles.input}
                value={width} onChange={e => setWidth(Number(e.target.value))}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Height</label>
              <input
                type="number" min={8} max={40} style={styles.input}
                value={height} onChange={e => setHeight(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Seed */}
          <div style={styles.field}>
            <label style={styles.label}>Seed</label>
            <div style={styles.row}>
              <input
                type="number" style={{ ...styles.input, flex: 1 }}
                value={seed} placeholder="Random"
                onChange={e => setSeed(e.target.value ? Number(e.target.value) : '')}
              />
              <button style={styles.btnSecondary} onClick={randomizeSeed}>🎲</button>
            </div>
          </div>

          {/* Cell Size */}
          <div style={styles.field}>
            <label style={styles.label}>Cell Size: {cellSize}px</label>
            <input
              type="range" min={16} max={64} step={4}
              value={cellSize} onChange={e => setCellSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Density */}
          <div style={styles.field}>
            <label style={styles.label}>Density</label>
            <select
              style={styles.select}
              value={density}
              onChange={e => setDensity(e.target.value as any)}
            >
              {DENSITY_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Season */}
          <div style={styles.field}>
            <label style={styles.label}>Season</label>
            <select
              style={styles.select}
              value={season}
              onChange={e => setSeason(e.target.value as Season | '')}
            >
              {SEASON_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Visual toggles */}
          <label style={styles.checkbox}>
            <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
            Show Grid
          </label>
          <label style={styles.checkbox}>
            <input type="checkbox" checked={showMechanics} onChange={e => setShowMechanics(e.target.checked)} />
            Show Mechanics Layer
          </label>

          {/* Mechanics legend */}
          {showMechanics && (
            <div style={styles.section}>
              <label style={styles.label}>Mechanics Legend</label>
              <div style={styles.legendBox}>
                {Object.entries(MOVEMENT_COLORS).map(([type, color]) => (
                  <div key={type} style={styles.legendItem}>
                    <div style={{ ...styles.legendSwatch, background: color.replace(/[\d.]+\)$/, '0.8)') }} />
                    <span>{type}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                Cover: <span style={{ color: '#ffeb3b' }}>■ lesser</span>{' '}
                <span style={{ color: '#ff9800' }}>■ standard</span>{' '}
                <span style={{ color: '#f44336' }}>■ greater</span>{' '}
                | ● = opaque (blocks LoS)
              </div>
            </div>
          )}

          {/* Generate buttons */}
          <button style={styles.btn} onClick={generate}>
            ⚡ Generate Map
          </button>
          <button
            style={styles.btnSecondary}
            onClick={() => { randomizeSeed(); setTimeout(generate, 0); }}
          >
            🔀 Random Seed & Generate
          </button>

          {/* Map Info */}
          {mapData && (
            <div style={styles.section}>
              <label style={styles.label}>Map Info</label>
              <div style={styles.metaBox}>
                <div>Theme: <span style={styles.badge}>{mapData.theme}</span></div>
                <div>Size: {mapData.width}×{mapData.height} ({mapData.width * mapData.height} cells)</div>
                <div>Rooms: {mapData.rooms.length}</div>
                <div>Overlays: {mapData.overlays.length}</div>
                <div>Gen: {mapData.genTimeMs}ms | Render: {renderTime}ms</div>
                <div>Seed: {mapData.seed}</div>
              </div>
            </div>
          )}

          {/* Terrain Distribution */}
          {mapData && (
            <div style={styles.section}>
              <label style={styles.label}>Terrain Distribution</label>
              <div style={{ ...styles.metaBox, fontSize: 11, maxHeight: 120 }}>
                {terrainStats}
              </div>
            </div>
          )}

          {/* Mechanics Distribution */}
          {mapData && (
            <div style={styles.section}>
              <label style={styles.label}>Movement Distribution</label>
              <div style={{ ...styles.metaBox, fontSize: 11, maxHeight: 120 }}>
                {mechStats}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div style={styles.section}>
              <label style={styles.label}>History ({history.length})</label>
              <div style={{ ...styles.metaBox, maxHeight: 140, fontSize: 11 }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{ cursor: 'pointer', padding: '2px 0', borderBottom: '1px solid #222' }}
                    onClick={() => {
                      setSeed(h.seed);
                      setTheme(h.theme as MapTheme);
                    }}
                    title={`Click to restore seed ${h.seed}`}
                  >
                    <span style={{ color: '#666' }}>#{h.seed}</span> {h.theme}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div style={styles.canvasArea}>
          {!mapData ? (
            <div style={{ textAlign: 'center', color: '#555' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
              <div style={{ fontSize: 16 }}>Configure settings and click <strong>Generate Map</strong></div>
              <div style={{ fontSize: 12, marginTop: 8, color: '#444' }}>
                Or press <kbd style={{ padding: '2px 6px', background: '#222', borderRadius: 3, border: '1px solid #444' }}>Enter</kbd> to generate
              </div>
            </div>
          ) : (
            <>
              {/* Hover coordinate readout */}
              {hoverPos && (
                <div style={{
                  position: 'absolute', top: 8, right: 16, zIndex: 5,
                  background: 'rgba(0,0,0,0.85)', padding: '4px 10px', borderRadius: 4,
                  fontSize: 12, fontFamily: "'Consolas', monospace", color: '#7ac7ff',
                }}>
                  ({hoverPos.x}, {hoverPos.y})
                  {mapData.terrainGrid[hoverPos.y]?.[hoverPos.x] && (
                    <span style={{ color: '#4caf50', marginLeft: 8 }}>
                      {mapData.terrainGrid[hoverPos.y][hoverPos.x]}
                    </span>
                  )}
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    {mapData.mechanics[hoverPos.y]?.[hoverPos.x]?.movement ?? '?'}
                  </span>
                  {(() => {
                    const hovOverlays = mapData.overlays.filter(
                      o => Math.floor(o.x) === hoverPos.x && Math.floor(o.y) === hoverPos.y
                    );
                    if (hovOverlays.length === 0) return null;
                    return (
                      <span style={{ color: '#c89cff', marginLeft: 8 }}>
                        [{hovOverlays.length} overlay{hovOverlays.length > 1 ? 's' : ''}]
                      </span>
                    );
                  })()}
                </div>
              )}

              <canvas
                ref={canvasRef}
                style={{ ...styles.canvas, cursor: 'crosshair' }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
                onMouseLeave={() => setHoverPos(null)}
              />

              {/* Tile Inspector Panel */}
              {inspected && (
                <div style={{ ...styles.inspector, flexWrap: 'wrap' as any }}>
                  {/* Column 1: Position & Terrain */}
                  <div style={styles.inspectorCol}>
                    <div style={styles.inspectorLabel}>Position</div>
                    <div style={styles.inspectorValue}>x: {inspected.x}, y: {inspected.y}</div>
                    <div style={{ ...styles.inspectorLabel, marginTop: 6 }}>Terrain</div>
                    <div style={{
                      ...styles.inspectorValue, fontSize: 15, fontWeight: 700, color: '#4caf50',
                    }}>
                      {inspected.terrain ?? <span style={{ color: '#666' }}>empty</span>}
                    </div>
                  </div>

                  {/* Column 2: Mechanics */}
                  <div style={styles.inspectorCol}>
                    <div style={styles.inspectorLabel}>Mechanics</div>
                    <div>Movement: <span style={{
                      color: inspected.mechanics.movement === 'normal' ? '#4caf50'
                        : inspected.mechanics.movement === 'blocked' ? '#e94560'
                          : '#ff9800',
                      fontWeight: 700,
                    }}>{inspected.mechanics.movement}</span></div>
                    <div>Cover: <span style={styles.inspectorValue}>{inspected.mechanics.cover}</span></div>
                    <div>Elevation: <span style={{
                      color: inspected.mechanics.elevation > 0 ? '#ff9800'
                        : inspected.mechanics.elevation < 0 ? '#29b6f6'
                          : '#666',
                    }}>
                      {inspected.mechanics.elevation > 0 ? `+${inspected.mechanics.elevation}` : inspected.mechanics.elevation}
                    </span></div>
                    <div>Opaque: <span style={{
                      color: inspected.mechanics.opaque ? '#ff9800' : '#4caf50',
                    }}>{inspected.mechanics.opaque ? 'Yes' : 'No'}</span></div>
                    {inspected.mechanics.hazardType && (
                      <div style={{ color: '#e94560' }}>Hazard: {inspected.mechanics.hazardType}</div>
                    )}
                  </div>

                  {/* Column 3: Overlays */}
                  <div style={{ ...styles.inspectorCol, minWidth: 240 }}>
                    <div style={styles.inspectorLabel}>
                      Overlays at Cell ({inspected.overlays.length})
                    </div>
                    {inspected.overlays.length === 0 ? (
                      <div style={styles.inspectorMuted}>No overlays at this cell</div>
                    ) : (
                      inspected.overlays.map((o, i) => (
                        <div key={i} style={{
                          display: 'block', padding: '4px 8px', marginBottom: 4,
                          borderRadius: 4,
                          border: o.meta ? '1px solid #4a2a6c' : '1px solid #e94560',
                          background: o.meta ? '#2a1a3c' : '#3c1a1a',
                          fontSize: 11, fontFamily: "'Consolas', monospace",
                        }}>
                          <div style={{ fontWeight: 700, color: '#c89cff' }}>
                            {o.meta?.description ?? <span style={{ color: '#e94560' }}>⚠ NO METADATA</span>}
                          </div>
                          <div style={{ fontSize: 10, color: '#888' }}>
                            {o.atlas}:{o.col},{o.row} z:{o.z}
                            {o.meta && <span style={{ marginLeft: 6, color: '#7ac7ff' }}>type: {o.meta.tileType}</span>}
                          </div>
                          {o.meta?.tags && o.meta.tags.length > 0 && (
                            <div style={{ fontSize: 10, marginTop: 2 }}>
                              {o.meta.tags.map((t, j) => (
                                <span key={j} style={{
                                  display: 'inline-block', padding: '1px 4px', borderRadius: 3,
                                  background: '#1a2a3c', color: '#6ca8d4', fontSize: 9, marginRight: 3,
                                }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Column 4: Nearby overlays */}
                  <div style={{ ...styles.inspectorCol, minWidth: 220 }}>
                    <div style={styles.inspectorLabel}>Nearby Overlays (±1)</div>
                    {inspected.nearbyOverlays.length === 0 ? (
                      <div style={styles.inspectorMuted}>None</div>
                    ) : (
                      inspected.nearbyOverlays.slice(0, 10).map((o, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
                          <span style={{ color: '#666' }}>({o.x},{o.y})</span>{' '}
                          <span style={{ color: o.meta ? '#c89cff' : '#e94560' }}>
                            {o.meta?.description ?? 'NO METADATA'}
                          </span>
                          <span style={{ color: '#555', marginLeft: 4, fontSize: 10 }}>
                            {o.atlas}:{o.col},{o.row}
                          </span>
                        </div>
                      ))
                    )}
                    {inspected.nearbyOverlays.length > 10 && (
                      <div style={styles.inspectorMuted}>+{inspected.nearbyOverlays.length - 10} more</div>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => { setInspected(null); if (mapData) renderMap(mapData); }}
                    style={{
                      position: 'absolute', top: 6, right: 12,
                      background: 'none', border: 'none', color: '#e94560',
                      fontSize: 18, cursor: 'pointer', fontWeight: 700,
                    }}
                    title="Close inspector"
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapTester;
