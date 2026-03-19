import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type AtlasName =
  | 'terrain' | 'base' | 'house_inside' | 'dungeon_floors'
  | 'lpc_exterior' | 'lpc_interior' | 'lpc_interior2' | 'lpc_outside_obj'
  | 'lpc_terrain_out' | 'lpc_effects' | 'lpc_items' | 'lpc_greek';

type AtlasGroup = 'Core' | 'Interiors' | 'LPC Merged' | 'LPC Extensions';

const ATLAS_LABELS: Record<AtlasName, { label: string; group: AtlasGroup }> = {
  terrain: { label: 'Terrain Atlas', group: 'Core' },
  base: { label: 'Base/Built Atlas', group: 'Core' },
  house_inside: { label: 'House Inside', group: 'Interiors' },
  dungeon_floors: { label: 'Dungeon Walls/Floors', group: 'Interiors' },
  lpc_exterior: { label: 'LPC Exterior Tiles', group: 'LPC Merged' },
  lpc_interior: { label: 'LPC Interior', group: 'LPC Merged' },
  lpc_interior2: { label: 'LPC Interior 2', group: 'LPC Merged' },
  lpc_outside_obj: { label: 'LPC Outside Objects', group: 'LPC Merged' },
  lpc_terrain_out: { label: 'LPC Terrain & Outside', group: 'LPC Merged' },
  lpc_effects: { label: 'LPC Effects', group: 'LPC Extensions' },
  lpc_items: { label: 'LPC Items', group: 'LPC Extensions' },
  lpc_greek: { label: 'LPC Greek Architecture', group: 'LPC Extensions' },
};

const ATLAS_FILES: Record<AtlasName, { src: string; tilePx: number }> = {
  terrain: { src: '/textures/terrain_atlas.png', tilePx: 32 },
  base: { src: '/textures/base_out_atlas.png', tilePx: 32 },
  house_inside: { src: '/textures/house_inside.png', tilePx: 32 },
  dungeon_floors: { src: '/textures/dungeon_walls_floors.png', tilePx: 16 },
  lpc_exterior: { src: '/textures/lpc_exterior_tiles.png', tilePx: 32 },
  lpc_interior: { src: '/textures/lpc_interior.png', tilePx: 32 },
  lpc_interior2: { src: '/textures/lpc_interior_2.png', tilePx: 32 },
  lpc_outside_obj: { src: '/textures/lpc_outside_objects.png', tilePx: 32 },
  lpc_terrain_out: { src: '/textures/lpc_terrain_outside.png', tilePx: 32 },
  lpc_effects: { src: '/textures/lpc_effects.png', tilePx: 32 },
  lpc_items: { src: '/textures/lpc_items.png', tilePx: 32 },
  lpc_greek: { src: '/textures/lpc_greek_architecture.png', tilePx: 32 },
};

function parseKey(key: string): { atlas: AtlasName; col: number; row: number } | null {
  const [atlas, coords] = key.split(':');
  if (!atlas || !coords) return null;
  const [col, row] = coords.split(',').map(Number);
  if (Number.isNaN(col) || Number.isNaN(row)) return null;
  return { atlas: atlas as AtlasName, col, row };
}

function drawTileToCtx(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  col: number,
  row: number,
  tilePx: number,
  destSize: number,
) {
  ctx.clearRect(0, 0, destSize, destSize);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, destSize, destSize);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    col * tilePx,
    row * tilePx,
    tilePx,
    tilePx,
    0,
    0,
    destSize,
    destSize,
  );
}

const PreviewTile: React.FC<{
  atlas: AtlasName;
  col: number;
  row: number;
  size: number;
  img: HTMLImageElement | null;
}> = ({ atlas, col, row, size, img }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current || !img) return;
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;
    drawTileToCtx(ctx, img, col, row, ATLAS_FILES[atlas].tilePx, size);
  }, [atlas, col, row, size, img]);

  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, imageRendering: 'pixelated', border: '1px solid #2a3f69', borderRadius: 3 }} />;
};

interface TileMetadata {
  description: string;
  tags: string[];
  tileType?: string;
  category?: 'object' | 'terrain' | 'group';
  groupDescription?: string;
  repeatableRow?: boolean;
  repeatableCol?: boolean;
}

type MetadataMap = Record<string, TileMetadata>;

interface ApprovedSet {
  kind: 'object' | 'terrain' | 'group';
  name: string;
  keys: string[];
  tileTypes: string[];
  items: { key: string; tileType: string }[];
  atlases: AtlasName[];
  groupDescription?: string;
  sharedTags: string[];
}

type TerrainSlotId =
  | 'C' | 'C2' | 'C3' | 'C4'
  | 'N' | 'S' | 'E' | 'W'
  | 'NE' | 'NW' | 'SE' | 'SW'
  | 'iNE' | 'iNW' | 'iSE' | 'iSW';

const TERRAIN_OUTER_LAYOUT: { slot: TerrainSlotId; col: number; row: number }[] = [
  { slot: 'NW', col: 1, row: 1 },
  { slot: 'N', col: 2, row: 1 },
  { slot: 'NE', col: 3, row: 1 },
  { slot: 'W', col: 1, row: 2 },
  { slot: 'C', col: 2, row: 2 },
  { slot: 'E', col: 3, row: 2 },
  { slot: 'SW', col: 1, row: 3 },
  { slot: 'S', col: 2, row: 3 },
  { slot: 'SE', col: 3, row: 3 },
];

const TERRAIN_INNER_LAYOUT: { slot: TerrainSlotId; col: number; row: number }[] = [
  { slot: 'iNW', col: 1, row: 1 },
  { slot: 'iNE', col: 2, row: 1 },
  { slot: 'iSW', col: 1, row: 2 },
  { slot: 'iSE', col: 2, row: 2 },
];

const TERRAIN_ALT_CENTER_LAYOUT: { slot: TerrainSlotId; col: number; row: number }[] = [
  { slot: 'C2', col: 1, row: 1 },
  { slot: 'C3', col: 2, row: 1 },
  { slot: 'C4', col: 3, row: 1 },
];

function parseBaseName(tileType: string, category?: 'object' | 'terrain' | 'group'): { kind: 'object' | 'terrain' | 'group'; name: string } | null {
  if (!tileType) return null;

  if (category === 'group') {
    const grp = tileType.match(/^(.+?)\s*-\s*\d+\s*$/);
    if (grp) return { kind: 'group', name: grp[1].trim() };
  }

  if (category === 'terrain') {
    const inner = tileType.match(/^(.+?)\s+Inner Corner\s*-?\s*(NE|NW|SE|SW)\s*$/i);
    if (inner) return { kind: 'terrain', name: inner[1].trim() };

    const edgeCorner = tileType.match(/^(.+?)\s+(edge|corner)\s*-?\s*(N|S|E|W|NE|NW|SE|SW)\s*$/i);
    if (edgeCorner) return { kind: 'terrain', name: edgeCorner[1].trim() };

    const center = tileType.match(/^(.+?)\s*-\s*(C[234]?)\s*$/i);
    if (center) return { kind: 'terrain', name: center[1].trim() };

    const terrGroup = tileType.match(/^(.+?)\s+group(?::.*?)?\s*-\s*\d+\s*$/i);
    if (terrGroup) return { kind: 'terrain', name: terrGroup[1].trim() };
  }

  if (category === 'object') {
    const obj = tileType.match(/^(.+?)\s*-\s*((?:N|S|E|W|NE|NW|SE|SW|C|T|M)\d*)\s*$/i);
    if (obj) return { kind: 'object', name: obj[1].trim() };
  }

  const terrainInner = tileType.match(/^(.+?)\s+Inner Corner\s*-?\s*(NE|NW|SE|SW)\s*$/i);
  if (terrainInner) return { kind: 'terrain', name: terrainInner[1].trim() };

  const terrainEdgeCorner = tileType.match(/^(.+?)\s+(edge|corner)\s*-?\s*(N|S|E|W|NE|NW|SE|SW)\s*$/i);
  if (terrainEdgeCorner) return { kind: 'terrain', name: terrainEdgeCorner[1].trim() };

  const obj = tileType.match(/^(.+?)\s*-\s*((?:N|S|E|W|NE|NW|SE|SW|C|T|M)\d*)\s*$/i);
  if (obj) return { kind: 'object', name: obj[1].trim() };

  return null;
}

function parseTerrainSlot(tileType: string): TerrainSlotId | null {
  const inner = tileType.match(/^.+?\s+Inner Corner\s*-?\s*(NE|NW|SE|SW)\s*$/i);
  if (inner) return (`i${inner[1].toUpperCase()}` as TerrainSlotId);

  const edgeCorner = tileType.match(/^.+?\s+(?:edge|corner)\s*-?\s*(N|S|E|W|NE|NW|SE|SW)\s*$/i);
  if (edgeCorner) return edgeCorner[1].toUpperCase() as TerrainSlotId;

  const center = tileType.match(/^.+?\s*-\s*(C[234]?)\s*$/i);
  if (center) return center[1].toUpperCase() as TerrainSlotId;

  return null;
}

export const AtlasApprovedDatabase: React.FC = () => {
  const [metadata, setMetadata] = useState<MetadataMap>({});
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'object' | 'terrain' | 'group'>('all');
  const [atlasFilter, setAtlasFilter] = useState<'all' | AtlasName>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | AtlasGroup>('all');
  const [images, setImages] = useState<Record<AtlasName, HTMLImageElement | null>>({
    terrain: null,
    base: null,
    house_inside: null,
    dungeon_floors: null,
    lpc_exterior: null,
    lpc_interior: null,
    lpc_interior2: null,
    lpc_outside_obj: null,
    lpc_terrain_out: null,
    lpc_effects: null,
    lpc_items: null,
    lpc_greek: null,
  });

  useEffect(() => {
    (Object.entries(ATLAS_FILES) as [AtlasName, { src: string; tilePx: number }][]).forEach(([atlas, cfg]) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = cfg.src;
      img.onload = () => {
        setImages((prev) => ({ ...prev, [atlas]: img }));
      };
    });
  }, []);

  useEffect(() => {
    axios.get('/api/atlas/metadata').then((res) => {
      if (res.data && typeof res.data === 'object') {
        setMetadata(res.data as MetadataMap);
      }
    }).catch(() => {
      setMetadata({});
    });
  }, []);

  const approvedSets = useMemo(() => {
    const groups: Record<string, ApprovedSet> = {};

    Object.entries(metadata).forEach(([key, meta]) => {
      if (!meta?.tileType) return;
      const parsed = parseBaseName(meta.tileType, meta.category);
      if (!parsed) return;

      const groupKey = `${parsed.kind}:${parsed.name}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          kind: parsed.kind,
          name: parsed.name,
          keys: [],
          tileTypes: [],
          items: [],
          atlases: [],
          sharedTags: [],
        };
      }

      groups[groupKey].keys.push(key);
      groups[groupKey].tileTypes.push(meta.tileType);
      groups[groupKey].items.push({ key, tileType: meta.tileType });
      const [atlas] = key.split(':');
      if (!groups[groupKey].atlases.includes(atlas as AtlasName)) {
        groups[groupKey].atlases.push(atlas as AtlasName);
      }
      // Capture group description from first tile that has one
      if (meta.groupDescription && !groups[groupKey].groupDescription) {
        groups[groupKey].groupDescription = meta.groupDescription;
      }
      // Collect all tags from each tile
      if (meta.tags && meta.tags.length > 0) {
        meta.tags.forEach((tag) => {
          if (!groups[groupKey].sharedTags.includes(tag)) {
            groups[groupKey].sharedTags.push(tag);
          }
        });
      }
    });

    // Compute truly shared tags: only keep tags present on ALL tiles
    Object.values(groups).forEach((g) => {
      if (g.keys.length <= 1) return;
      g.sharedTags = g.sharedTags.filter((tag) =>
        g.keys.every((key) => metadata[key]?.tags?.includes(tag)),
      );
    });

    return Object.values(groups)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [metadata]);

  const filtered = useMemo(() => {
    return approvedSets.filter((s) => {
      if (kindFilter !== 'all' && s.kind !== kindFilter) return false;
      if (atlasFilter !== 'all' && !s.atlases.includes(atlasFilter)) return false;
      if (groupFilter !== 'all') {
        const hasGroup = s.atlases.some((atlas) => ATLAS_LABELS[atlas]?.group === groupFilter);
        if (!hasGroup) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.tileTypes.some((t) => t.toLowerCase().includes(q));
    });
  }, [approvedSets, kindFilter, atlasFilter, groupFilter, search]);

  const groupedCounts = useMemo(() => {
    const counts: Record<AtlasGroup, number> = {
      Core: 0,
      Interiors: 0,
      'LPC Merged': 0,
      'LPC Extensions': 0,
    };
    filtered.forEach((entry) => {
      const seen = new Set<AtlasGroup>();
      entry.atlases.forEach((atlas) => {
        const group = ATLAS_LABELS[atlas]?.group;
        if (!group || seen.has(group)) return;
        counts[group] += 1;
        seen.add(group);
      });
    });
    return counts;
  }, [filtered]);

  const exportApprovedSets = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      totalSets: filtered.length,
      sets: filtered,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'approved-atlas-sets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openSetInAtlasViewer = (entry: ApprovedSet) => {
    const params = new URLSearchParams();
    params.set('atlas', '1');
    params.set('setKind', entry.kind);
    params.set('setName', entry.name);
    if (entry.atlases[0]) {
      params.set('setAtlas', entry.atlases[0]);
    }
    window.location.search = `?${params.toString()}`;
  };

  const deleteSet = async (entry: ApprovedSet) => {
    const updated = { ...metadata };
    entry.keys.forEach((key) => {
      delete updated[key];
    });
    setMetadata(updated);
    try {
      await axios.post('/api/atlas/metadata', updated);
    } catch {
      // silent failure — local state is still updated
    }
  };

  return (
    <div style={{ height: '100%', background: '#0f0f1a', color: '#e0e0e0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1d2a4d', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Approved Atlas Database</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search approved entries..."
          style={{ background: '#15152a', color: '#eee', border: '1px solid #2a3f69', borderRadius: 4, padding: '6px 8px', minWidth: 260 }}
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as 'all' | 'object' | 'terrain' | 'group')}
          style={{ background: '#15152a', color: '#eee', border: '1px solid #2a3f69', borderRadius: 4, padding: '6px 8px' }}
        >
          <option value="all">All types</option>
          <option value="object">Objects</option>
          <option value="terrain">Terrain</option>
          <option value="group">Groups</option>
        </select>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value as 'all' | AtlasGroup)}
          style={{ background: '#15152a', color: '#eee', border: '1px solid #2a3f69', borderRadius: 4, padding: '6px 8px' }}
        >
          <option value="all">All packs</option>
          <option value="Core">Core</option>
          <option value="Interiors">Interiors</option>
          <option value="LPC Merged">LPC Merged</option>
          <option value="LPC Extensions">LPC Extensions</option>
        </select>
        <select
          value={atlasFilter}
          onChange={(e) => setAtlasFilter(e.target.value as 'all' | AtlasName)}
          style={{ background: '#15152a', color: '#eee', border: '1px solid #2a3f69', borderRadius: 4, padding: '6px 8px', minWidth: 180 }}
        >
          <option value="all">All atlas files</option>
          {Object.entries(ATLAS_LABELS).map(([atlas, info]) => (
            <option key={atlas} value={atlas}>{info.group} · {info.label}</option>
          ))}
        </select>
        <button onClick={exportApprovedSets} style={{ background: '#0f3460', color: '#fff', border: '1px solid #2f6ea7', borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>
          Export shown
        </button>
        <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>{filtered.length} sets · {Object.keys(metadata).length} metadata tiles</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 16px', borderBottom: '1px solid #1d2a4d', background: '#12122a' }}>
        {(Object.keys(groupedCounts) as AtlasGroup[]).map((group) => (
          <div key={group} style={{ padding: '4px 8px', border: '1px solid #2a3f69', borderRadius: 999, fontSize: '0.75rem', opacity: 0.9 }}>
            {group}: {groupedCounts[group]}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 12, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, alignContent: 'start' }}>
        {filtered.map((entry) => (
          <div
            key={`${entry.kind}:${entry.name}`}
            style={{ border: '1px solid #2a3f69', background: '#15152a', borderRadius: 6, padding: 10, cursor: 'pointer' }}
            onClick={() => openSetInAtlasViewer(entry)}
            title="Open this set in Atlas Viewer"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong>{entry.kind === 'object' ? '📦' : entry.kind === 'group' ? '📋' : '🌍'} {entry.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ opacity: 0.75, fontSize: '0.75rem' }}>{entry.keys.length} tiles</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openSetInAtlasViewer(entry);
                  }}
                  style={{ background: '#0f3460', color: '#fff', border: '1px solid #2f6ea7', borderRadius: 4, padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  Open
                </button>
              </div>
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm(`Delete "${entry.name}"? This will remove metadata for all ${entry.keys.length} tiles in this set.`)) return;
                  deleteSet(entry);
                }}
                style={{ background: '#3a1414', color: '#ffb4b4', border: '1px solid #e74c3c', borderRadius: 4, padding: '2px 6px', fontSize: '0.68rem', cursor: 'pointer' }}
              >
                🗑 Delete
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 4 }}>
              atlases: {entry.atlases.map((atlas) => ATLAS_LABELS[atlas]?.label || atlas).join(', ')}
            </div>
            {entry.sharedTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                {entry.sharedTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.62rem',
                      padding: '1px 5px',
                      borderRadius: 999,
                      background: '#1a2744',
                      border: '1px solid #2a3f69',
                      color: '#7eb8da',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {entry.kind === 'object' ? (
              (() => {
                const parsed = entry.items
                  .map((item) => {
                    const p = parseKey(item.key);
                    if (!p) return null;
                    const qMatch = item.tileType.match(/^.+?\s*-\s*((?:N|S|E|W|NE|NW|SE|SW|C|T|M)\d*)\s*$/i);
                    const quadrant = qMatch ? qMatch[1].toUpperCase() : 'C';
                    const base = quadrant.replace(/\d+$/, '');
                    const numMatch = quadrant.match(/(\d+)$/);
                    const num = numMatch ? parseInt(numMatch[1], 10) : 0;
                    return { ...p, key: item.key, tileType: item.tileType, quadrant, base, num };
                  })
                  .filter((v): v is { atlas: AtlasName; col: number; row: number; key: string; tileType: string; quadrant: string; base: string; num: number } => !!v);

                if (parsed.length === 0) return null;

                // Categorise tiles by directional base
                const cornerMap: Record<string, typeof parsed[number]> = {};
                const nArr: typeof parsed = [];
                const sArr: typeof parsed = [];
                const wArr: typeof parsed = [];
                const eArr: typeof parsed = [];
                const cArr: typeof parsed = [];
                parsed.forEach((t) => {
                  if (['NW', 'NE', 'SW', 'SE'].includes(t.base)) cornerMap[t.base] = t;
                  else if (t.base === 'N') nArr.push(t);
                  else if (t.base === 'S') sArr.push(t);
                  else if (t.base === 'W') wArr.push(t);
                  else if (t.base === 'E') eArr.push(t);
                  else cArr.push(t); // C, T, M, or unknown
                });

                const byNum = (a: { num: number }, b: { num: number }) => a.num - b.num;
                nArr.sort(byNum); sArr.sort(byNum);
                wArr.sort(byNum); eArr.sort(byNum);
                cArr.sort(byNum);

                // Derive grid dimensions from the tile categories
                const centerCols = Math.max(nArr.length, sArr.length, cArr.length > 0 ? 1 : 0);
                let middleRows = Math.max(wArr.length, eArr.length);
                if (middleRows === 0 && cArr.length > 0) {
                  middleRows = Math.ceil(cArr.length / Math.max(1, centerCols));
                }

                const hasTop = !!cornerMap['NW'] || !!cornerMap['NE'] || nArr.length > 0;
                const hasBot = !!cornerMap['SW'] || !!cornerMap['SE'] || sArr.length > 0;
                const hasLeft = !!cornerMap['NW'] || !!cornerMap['SW'] || wArr.length > 0;
                const hasRight = !!cornerMap['NE'] || !!cornerMap['SE'] || eArr.length > 0;

                const height = (hasTop ? 1 : 0) + middleRows + (hasBot ? 1 : 0);
                const width = (hasLeft ? 1 : 0) + centerCols + (hasRight ? 1 : 0);
                if (height === 0 || width === 0) return null;

                const topRow = 0;
                const midStart = hasTop ? 1 : 0;
                const botRow = height - 1;
                const leftCol = 0;
                const cenStart = hasLeft ? 1 : 0;
                const rightCol = width - 1;

                // Place each tile into the grid
                const grid = new Map<string, typeof parsed[number]>();
                if (cornerMap['NW']) grid.set(`${leftCol},${topRow}`, cornerMap['NW']);
                if (cornerMap['NE']) grid.set(`${rightCol},${topRow}`, cornerMap['NE']);
                if (cornerMap['SW']) grid.set(`${leftCol},${botRow}`, cornerMap['SW']);
                if (cornerMap['SE']) grid.set(`${rightCol},${botRow}`, cornerMap['SE']);
                nArr.forEach((t, i) => grid.set(`${cenStart + i},${topRow}`, t));
                sArr.forEach((t, i) => grid.set(`${cenStart + i},${botRow}`, t));
                wArr.forEach((t, i) => grid.set(`${leftCol},${midStart + i}`, t));
                eArr.forEach((t, i) => grid.set(`${rightCol},${midStart + i}`, t));
                cArr.forEach((t, i) => {
                  const r = Math.floor(i / Math.max(1, centerCols));
                  const c = i % Math.max(1, centerCols);
                  grid.set(`${cenStart + c},${midStart + r}`, t);
                });

                return (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${width}, 22px)`,
                      gridTemplateRows: `repeat(${height}, 22px)`,
                      gap: 2,
                      width: 'fit-content',
                      padding: 4,
                      background: '#101826',
                      border: '1px solid #1f3257',
                      borderRadius: 4,
                    }}
                  >
                    {Array.from({ length: height }, (_, r) =>
                      Array.from({ length: width }, (_, c) => {
                        const p = grid.get(`${c},${r}`);
                        if (!p) {
                          return <div key={`e-${r}-${c}`} style={{ width: 22, height: 22, background: '#0e1320', border: '1px solid #1a2844', borderRadius: 3 }} />;
                        }
                        return (
                          <PreviewTile
                            key={`${entry.name}-${p.key}`}
                            atlas={p.atlas}
                            col={p.col}
                            row={p.row}
                            size={22}
                            img={images[p.atlas]}
                          />
                        );
                      }),
                    )}
                  </div>
                );
              })()
            ) : entry.kind === 'group' ? (
              (() => {
                const parsed = entry.items
                  .map((item) => {
                    const p = parseKey(item.key);
                    if (!p) return null;
                    return { ...p, key: item.key };
                  })
                  .filter((v): v is { atlas: AtlasName; col: number; row: number; key: string } => !!v);

                return (
                  <div style={{ marginTop: 8 }}>
                    {entry.groupDescription && (
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4, fontStyle: 'italic', color: '#7eb8da' }}>
                        {entry.groupDescription}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        padding: 4,
                        background: '#101826',
                        border: '1px solid #1f3257',
                        borderRadius: 4,
                        maxHeight: 80,
                        overflow: 'auto',
                      }}
                    >
                      {parsed.map((p) => (
                        <PreviewTile
                          key={`${entry.name}-${p.key}`}
                          atlas={p.atlas}
                          col={p.col}
                          row={p.row}
                          size={22}
                          img={images[p.atlas]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              (() => {
                const slotMap: Partial<Record<TerrainSlotId, { atlas: AtlasName; col: number; row: number }>> = {};
                const assocGroupsMap: Record<string, { label: string; tiles: { atlas: AtlasName; col: number; row: number; key: string }[] }> = {};
                entry.items.forEach((item) => {
                  const slot = parseTerrainSlot(item.tileType);
                  const parsed = parseKey(item.key);
                  if (!parsed) return;
                  if (slot) {
                    slotMap[slot] = { atlas: parsed.atlas, col: parsed.col, row: parsed.row };
                  } else {
                    // Parse group label from tileType "Name group:Label - N"
                    const grpMatch = item.tileType.match(/^.+?\s+group(?::(.+?))?\s*-\s*\d+\s*$/i);
                    const grpLabel = grpMatch?.[1]?.trim() || 'default';
                    if (!assocGroupsMap[grpLabel]) {
                      assocGroupsMap[grpLabel] = { label: grpLabel, tiles: [] };
                    }
                    assocGroupsMap[grpLabel].tiles.push({ ...parsed, key: item.key });
                  }
                });
                const assocGroups = Object.values(assocGroupsMap);

                const hasAny = Object.keys(slotMap).length > 0 || assocGroups.length > 0;
                if (!hasAny) return null;

                const renderSlotGrid = (layout: { slot: TerrainSlotId; col: number; row: number }[], columns: number, rows: number) => (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns}, 22px)`,
                      gridTemplateRows: `repeat(${rows}, 22px)`,
                      gap: 2,
                      padding: 4,
                      background: '#101826',
                      border: '1px solid #1f3257',
                      borderRadius: 4,
                      width: 'fit-content',
                    }}
                  >
                    {layout.map((cell) => {
                      const tile = slotMap[cell.slot];
                      if (!tile) {
                        return <div key={cell.slot} style={{ width: 22, height: 22, background: '#0e1320', border: '1px solid #1a2844', borderRadius: 3 }} />;
                      }
                      return (
                        <PreviewTile
                          key={`${entry.name}-${cell.slot}-${tile.atlas}-${tile.col}-${tile.row}`}
                          atlas={tile.atlas}
                          col={tile.col}
                          row={tile.row}
                          size={22}
                          img={images[tile.atlas]}
                        />
                      );
                    })}
                  </div>
                );

                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {renderSlotGrid(TERRAIN_OUTER_LAYOUT, 3, 3)}
                      {renderSlotGrid(TERRAIN_INNER_LAYOUT, 2, 2)}
                      {renderSlotGrid(TERRAIN_ALT_CENTER_LAYOUT, 3, 1)}
                    </div>
                    {assocGroups.length > 0 && assocGroups.map((grp) => (
                      <div key={`${entry.name}-grp-${grp.label}`} style={{ marginTop: 6 }}>
                        <div style={{ fontSize: '0.68rem', opacity: 0.6, marginBottom: 2 }}>
                          {grp.label === 'default' ? 'Associated tiles' : grp.label} ({grp.tiles.length})
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 2,
                            padding: 4,
                            background: '#101826',
                            border: '1px solid #1f3257',
                            borderRadius: 4,
                            maxHeight: 60,
                            overflow: 'auto',
                          }}
                        >
                          {grp.tiles.map((p) => (
                            <PreviewTile
                              key={`${entry.name}-grp-${grp.label}-${p.key}`}
                              atlas={p.atlas}
                              col={p.col}
                              row={p.row}
                              size={22}
                              img={images[p.atlas]}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
            <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto', fontSize: '0.72rem', lineHeight: 1.35, borderTop: '1px solid #1f3257', paddingTop: 6 }}>
              {entry.tileTypes.slice(0, 20).map((t, i) => (
                <div key={`${t}-${i}`}>{t}</div>
              ))}
              {entry.tileTypes.length > 20 && <div style={{ opacity: 0.6 }}>… +{entry.tileTypes.length - 20} more</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AtlasApprovedDatabase;
