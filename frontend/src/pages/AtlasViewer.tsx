import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import './AtlasViewer.css';

// ─── Types ──────────────────────────────────────────────

type AtlasName = 'terrain' | 'base' | 'house_inside' | 'dungeon_floors'
  | 'lpc_exterior' | 'lpc_interior' | 'lpc_interior2' | 'lpc_outside_obj'
  | 'lpc_terrain_out' | 'lpc_effects' | 'lpc_items' | 'lpc_greek';

interface TileInfo {
  atlas: AtlasName;
  col: number;
  row: number;
  empty: boolean;
  hasTransparency: boolean;
  fullyTransparent: boolean;
  avgColor: string;       // hex
  opaquePixelCount: number;
}

interface TileMetadata {
  description: string;
  tags: string[];
  tileType?: string;      // map to game TileType
  category?: 'object' | 'terrain' | 'group';  // disambiguate tile purpose
  groupDescription?: string;   // description of the tile group (for 'group' category)
  repeatableRow?: boolean;     // generator can duplicate/remove this row to adjust height
  repeatableCol?: boolean;     // generator can duplicate/remove this column to adjust width
}

type MetadataMap = Record<string, TileMetadata>; // key = "atlas:col,row"

interface AtlasConfig {
  name: AtlasName;
  src: string;
  label: string;
  group: 'Core' | 'Interiors' | 'LPC Merged' | 'LPC Extensions';
  tilePx: number; // source tile size in pixels
}

const ATLAS_FILES: AtlasConfig[] = [
  { name: 'terrain',         src: '/textures/terrain_atlas.png',            label: 'Terrain Atlas',            group: 'Core',           tilePx: 32 },
  { name: 'base',            src: '/textures/base_out_atlas.png',           label: 'Base/Built Atlas',         group: 'Core',           tilePx: 32 },
  { name: 'house_inside',    src: '/textures/house_inside.png',             label: 'House Inside',             group: 'Interiors',      tilePx: 32 },
  { name: 'dungeon_floors',  src: '/textures/dungeon_walls_floors.png',     label: 'Dungeon Walls/Floors',     group: 'Interiors',      tilePx: 16 },
  { name: 'lpc_exterior',    src: '/textures/lpc_exterior_tiles.png',       label: 'LPC Exterior Tiles',       group: 'LPC Merged',     tilePx: 32 },
  { name: 'lpc_interior',    src: '/textures/lpc_interior.png',             label: 'LPC Interior',             group: 'LPC Merged',     tilePx: 32 },
  { name: 'lpc_interior2',   src: '/textures/lpc_interior_2.png',           label: 'LPC Interior 2',           group: 'LPC Merged',     tilePx: 32 },
  { name: 'lpc_outside_obj', src: '/textures/lpc_outside_objects.png',      label: 'LPC Outside Objects',      group: 'LPC Merged',     tilePx: 32 },
  { name: 'lpc_terrain_out', src: '/textures/lpc_terrain_outside.png',      label: 'LPC Terrain & Outside',    group: 'LPC Merged',     tilePx: 32 },
  { name: 'lpc_effects',     src: '/textures/lpc_effects.png',              label: 'LPC Effects',              group: 'LPC Extensions', tilePx: 32 },
  { name: 'lpc_items',       src: '/textures/lpc_items.png',                label: 'LPC Items',                group: 'LPC Extensions', tilePx: 32 },
  { name: 'lpc_greek',       src: '/textures/lpc_greek_architecture.png',   label: 'LPC Greek Architecture',   group: 'LPC Extensions', tilePx: 32 },
];

const ATLAS_GROUP_ORDER: AtlasConfig['group'][] = ['Core', 'Interiors', 'LPC Merged', 'LPC Extensions'];

/** Look up the tile px for a given atlas. */
function getAtlasTilePx(atlas: AtlasName): number {
  return ATLAS_FILES.find((a) => a.name === atlas)?.tilePx ?? 32;
}

const TAG_PRESETS = [
  'terrain', 'ground', 'edge', 'overlay', 'tree', 'rock', 'water',
  'wall', 'path', 'building', 'indoor', 'decoration', 'vegetation',
  'stone', 'dirt', 'grass', 'sand', 'snow', 'lava', 'bridge', 'entrance',
];

const SIZE_OPTIONS = [
  { key: 'small',  label: '48px', px: 48 },
  { key: 'medium', label: '64px', px: 64 },
  { key: 'large',  label: '96px', px: 96 },
] as const;

function tileKey(atlas: AtlasName, col: number, row: number): string {
  return `${atlas}:${col},${row}`;
}

/** Fast DJB2-style hash from raw RGBA pixel data of a tile. */
function hashTilePixels(
  imgData: ImageData,
  col: number,
  row: number,
  tilePx: number,
): string {
  let h1 = 5381;
  let h2 = 52711;
  for (let py = 0; py < tilePx; py++) {
    for (let px = 0; px < tilePx; px++) {
      const sx = col * tilePx + px;
      const sy = row * tilePx + py;
      const idx = (sy * imgData.width + sx) * 4;
      const r = imgData.data[idx];
      const g = imgData.data[idx + 1];
      const b = imgData.data[idx + 2];
      const a = imgData.data[idx + 3];
      const v = (r << 24) | (g << 16) | (b << 8) | a;
      h1 = ((h1 << 5) + h1 + v) | 0;
      h2 = ((h2 << 5) + h2 + v) | 0;
    }
  }
  return `${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}_${tilePx}`;
}

// ─── Helpers ────────────────────────────────────────────

/** Draw a tile from an atlas image onto a canvas context at (0,0). */
function drawTileToCtx(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  col: number,
  row: number,
  destSize: number,
  withCheckerboard = true,
  tilePx = 32,
) {
  ctx.clearRect(0, 0, destSize, destSize);

  // Checkerboard background to show transparency
  if (withCheckerboard) {
    const sq = Math.max(4, destSize / 8);
    for (let ry = 0; ry < destSize; ry += sq) {
      for (let rx = 0; rx < destSize; rx += sq) {
        const light = ((Math.floor(rx / sq) + Math.floor(ry / sq)) % 2) === 0;
        ctx.fillStyle = light ? '#3a3a3a' : '#2a2a2a';
        ctx.fillRect(rx, ry, sq, sq);
      }
    }
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    col * tilePx, row * tilePx, tilePx, tilePx,
    0, 0, destSize, destSize,
  );
}

/** Analyse a single tile and return metadata about it. */
function analyseTile(
  imgData: ImageData,
  col: number,
  row: number,
  tilePx = 32,
): Pick<TileInfo, 'empty' | 'hasTransparency' | 'fullyTransparent' | 'avgColor' | 'opaquePixelCount'> {
  let rSum = 0, gSum = 0, bSum = 0;
  let opaqueCount = 0;
  let transparentCount = 0;

  for (let py = 0; py < tilePx; py++) {
    for (let px = 0; px < tilePx; px++) {
      const sx = col * tilePx + px;
      const sy = row * tilePx + py;
      const idx = (sy * imgData.width + sx) * 4;
      const a = imgData.data[idx + 3];
      if (a > 0) {
        rSum += imgData.data[idx];
        gSum += imgData.data[idx + 1];
        bSum += imgData.data[idx + 2];
        opaqueCount++;
      } else {
        transparentCount++;
      }
    }
  }

  const empty = opaqueCount === 0;
  const fullyTransparent = empty;
  const hasTransparency = transparentCount > 0 && !empty;

  let avgColor = '#000000';
  if (opaqueCount > 0) {
    const r = Math.round(rSum / opaqueCount);
    const g = Math.round(gSum / opaqueCount);
    const b = Math.round(bSum / opaqueCount);
    avgColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return { empty, hasTransparency, fullyTransparent, avgColor, opaquePixelCount: opaqueCount };
}

/** Compute the directional quadrant label (N/S/E/W/NE/NW/SE/SW/C) for
 *  a tile at (relCol, relRow) within a bounding box of (width × height). */
function getQuadrantLabel(relCol: number, relRow: number, width: number, height: number): string {
  if (width === 1 && height === 1) return 'C';

  let vertical = '';
  if (height >= 2) {
    if (relRow === 0) vertical = 'N';
    else if (relRow === height - 1) vertical = 'S';
  }

  let horizontal = '';
  if (width >= 2) {
    if (relCol === 0) horizontal = 'W';
    else if (relCol === width - 1) horizontal = 'E';
  }

  return (vertical + horizontal) || 'C';
}

type ObjectModeType = 'object' | 'terrain';

// ─── Terrain slot system ────────────────────────────────

type TerrainSlotId =
  | 'C' | 'C2' | 'C3' | 'C4'
  | 'N' | 'S' | 'E' | 'W'
  | 'NE' | 'NW' | 'SE' | 'SW'
  | 'iNE' | 'iNW' | 'iSE' | 'iSW';

interface TerrainSlotDef {
  id: TerrainSlotId;
  label: string;
  group: 'center' | 'edge' | 'corner' | 'inner';
  gridCol: number;  // 1-based CSS grid column
  gridRow: number;  // 1-based CSS grid row
}

/** Outer 3×3 grid: corners, edges, center.
 *  Inner-corner slots sit in a separate 2×2 grid below. */
const TERRAIN_SLOTS: TerrainSlotDef[] = [
  // Row 1
  { id: 'NW', label: 'NW',  group: 'corner', gridCol: 1, gridRow: 1 },
  { id: 'N',  label: 'N',   group: 'edge',   gridCol: 2, gridRow: 1 },
  { id: 'NE', label: 'NE',  group: 'corner', gridCol: 3, gridRow: 1 },
  // Row 2
  { id: 'W',  label: 'W',   group: 'edge',   gridCol: 1, gridRow: 2 },
  { id: 'C',  label: 'C',   group: 'center', gridCol: 2, gridRow: 2 },
  { id: 'E',  label: 'E',   group: 'edge',   gridCol: 3, gridRow: 2 },
  // Row 3
  { id: 'SW', label: 'SW',  group: 'corner', gridCol: 1, gridRow: 3 },
  { id: 'S',  label: 'S',   group: 'edge',   gridCol: 2, gridRow: 3 },
  { id: 'SE', label: 'SE',  group: 'corner', gridCol: 3, gridRow: 3 },
];

const INNER_CORNER_SLOTS: TerrainSlotDef[] = [
  { id: 'iNW', label: 'iNW', group: 'inner', gridCol: 1, gridRow: 1 },
  { id: 'iNE', label: 'iNE', group: 'inner', gridCol: 2, gridRow: 1 },
  { id: 'iSW', label: 'iSW', group: 'inner', gridCol: 1, gridRow: 2 },
  { id: 'iSE', label: 'iSE', group: 'inner', gridCol: 2, gridRow: 2 },
];

const ALT_CENTER_SLOTS: TerrainSlotDef[] = [
  { id: 'C2', label: 'C2', group: 'center', gridCol: 1, gridRow: 1 },
  { id: 'C3', label: 'C3', group: 'center', gridCol: 2, gridRow: 1 },
  { id: 'C4', label: 'C4', group: 'center', gridCol: 3, gridRow: 1 },
];

const ALL_TERRAIN_SLOTS = [...TERRAIN_SLOTS, ...INNER_CORNER_SLOTS, ...ALT_CENTER_SLOTS];

type TerrainSlotMap = Partial<Record<TerrainSlotId, string>>; // slotId → tileKey

interface DetectedTerrain {
  name: string;
  slots: TerrainSlotMap;
  atlas: AtlasName;
  slotCount: number;
  associatedGroups: { label: string; description: string; tiles: { key: string; col: number; row: number; index: number; atlas: AtlasName }[] }[];
}

interface DetectedObject {
  name: string;
  tiles: { key: string; col: number; row: number; quadrant: string; atlas: AtlasName }[];
  width: number;
  height: number;
  minCol: number;
  minRow: number;
  atlas: AtlasName;
}

interface DetectedGroup {
  name: string;
  description: string;
  tiles: { key: string; col: number; row: number; index: number; atlas: AtlasName }[];
  atlas: AtlasName;
}

interface ObjectLayoutTile {
  key: string;
  col: number;
  row: number;
  atlas: AtlasName;
  quadrant: string;
  relCol: number;
  relRow: number;
}

interface ObjectLayout {
  tiles: ObjectLayoutTile[];
  width: number;
  height: number;
  minCol: number;
  minRow: number;
}

// ─── Component ──────────────────────────────────────────

export const AtlasViewer: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  // Atlas images
  const [images, setImages] = useState<Record<AtlasName, HTMLImageElement | null>>({
    terrain: null, base: null, house_inside: null, dungeon_floors: null,
    lpc_exterior: null, lpc_interior: null, lpc_interior2: null, lpc_outside_obj: null,
    lpc_terrain_out: null, lpc_effects: null, lpc_items: null, lpc_greek: null,
  });
  const [tileInfos, setTileInfos] = useState<TileInfo[]>([]);
  const [metadata, setMetadata] = useState<MetadataMap>({});
  const metadataRef = useRef<MetadataMap>({});
  const [dirty, setDirty] = useState(false);

  // UI state
  const [activeAtlas, setActiveAtlas] = useState<AtlasName>('terrain');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tileSize, setTileSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showEmpty, setShowEmpty] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [duplicateMap, setDuplicateMap] = useState<Record<string, string[]>>({});
  const [duplicateScanDone, setDuplicateScanDone] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Inspector form
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTileType, setEditTileType] = useState('');

  // Object/Builder mode — always active (no individual tile metadata editing)
  const objectMode = true;
  const [objectModeType, setObjectModeType] = useState<ObjectModeType>('object');
  const [objectSelection, setObjectSelection] = useState<Set<string>>(new Set());
  const [objectName, setObjectName] = useState('');
  const [objectDesc, setObjectDesc] = useState('');

  // Manual layout overrides for object builder rearrangement
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, { relCol: number; relRow: number }>>({});
  const [gridSizeOverride, setGridSizeOverride] = useState<{ width: number; height: number } | null>(null);
  const dragKeyRef = useRef<string | null>(null);

  // Builder tags — applied to all tiles on approve (shared across modes)
  const [builderTags, setBuilderTags] = useState<string[]>([]);

  // Repeatable rows/cols — marks which rows/columns can be extended by the generator
  const [repeatableRows, setRepeatableRows] = useState<Set<number>>(new Set());
  const [repeatableCols, setRepeatableCols] = useState<Set<number>>(new Set());

  // Terrain mode state
  const [terrainSlots, setTerrainSlots] = useState<TerrainSlotMap>({});
  const [activeSlot, setActiveSlot] = useState<TerrainSlotId | null>(null);

  // Multiple associated tile groups for terrain mode
  const [terrainAssocGroups, setTerrainAssocGroups] = useState<{ label: string; description: string; keys: string[] }[]>([]);
  const [activeGroupLabel, setActiveGroupLabel] = useState('');

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Load atlas images ──────────────────────────────────

  useEffect(() => {
    ATLAS_FILES.forEach(({ name, src }) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        setImages((prev) => ({ ...prev, [name]: img }));
      };
    });
  }, []);

  // ── Analyse tiles when image loads ─────────────────────

  useEffect(() => {
    const img = images[activeAtlas];
    if (!img) return;

    const tilePx = getAtlasTilePx(activeAtlas);
    const gridCols = Math.floor(img.width / tilePx);
    const gridRows = Math.floor(img.height / tilePx);

    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    const ctx = offscreen.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, img.width, img.height);

    const infos: TileInfo[] = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const analysis = analyseTile(imgData, col, row, tilePx);
        infos.push({
          atlas: activeAtlas,
          col,
          row,
          ...analysis,
        });
      }
    }
    setTileInfos(infos);
  }, [images, activeAtlas]);

  // ── Load saved metadata from backend ───────────────────

  useEffect(() => {
    axios
      .get('/api/atlas/metadata')
      .then((res) => {
        if (res.data && typeof res.data === 'object') {
          setMetadata(res.data);
          metadataRef.current = res.data;
        }
      })
      .catch(() => {
        // No saved metadata yet, that's fine
      });
  }, []);

  // ── Save metadata to backend ───────────────────────────

  const saveMetadata = useCallback(async () => {
    try {
      await axios.post('/api/atlas/metadata', metadataRef.current);
      setDirty(false);
      showToast('Metadata saved!', 'success');
    } catch {
      showToast('Failed to save metadata', 'error');
    }
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Export metadata as JSON download ───────────────────

  const exportMetadata = () => {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-metadata.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export as TypeScript ATLAS_TILES constant ──────────

  const exportTypeScript = () => {
    const entries: string[] = [];
    for (const [key, meta] of Object.entries(metadata)) {
      if (!meta.tileType) continue;
      const [atlas, coords] = key.split(':');
      const [col, row] = coords.split(',').map(Number);
      entries.push(`  '${meta.tileType}': { atlas: '${atlas}', col: ${col}, row: ${row} },  // ${meta.description || ''}`);
    }
    const code = `const ATLAS_TILES: Partial<Record<TileType, AtlasRef>> = {\n${entries.join('\n')}\n};\n`;
    navigator.clipboard.writeText(code).then(() => {
      showToast('TypeScript copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  // ── Selection handling ─────────────────────────────────

  const selectTile = useCallback((key: string) => {
    setSelectedKey(key);
    const meta = metadata[key];
    setEditDesc(meta?.description || '');
    setEditTags(meta?.tags || []);
    setEditTileType(meta?.tileType || '');
  }, [metadata]);

  const applyEdit = useCallback(() => {
    if (!selectedKey) return;
    setMetadata((prev) => {
      const next = {
        ...prev,
        [selectedKey]: {
          description: editDesc,
          tags: editTags,
          tileType: editTileType || undefined,
        } as TileMetadata,
      };
      metadataRef.current = next;
      return next;
    });
    setDirty(true);
  }, [selectedKey, editDesc, editTags, editTileType]);

  // ── Duplicate scanner ─────────────────────────────────
  // Hashes ALL non-empty tiles, groups by pixel hash, and flags duplicates.
  // If the original approved tile still exists → non-approved copies are flagged.
  // If the original was deleted → copies that match each other are still flagged
  // (so previously-labelled duplicates remain detected even without an original).

  const scanForDuplicates = useCallback(() => {
    // Step 1: collect per-atlas ImageData
    const atlasData: Record<string, { imgData: ImageData; tilePx: number }> = {};
    ATLAS_FILES.forEach(({ name, tilePx }) => {
      const img = images[name];
      if (!img) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      atlasData[name] = { imgData: ctx.getImageData(0, 0, img.width, img.height), tilePx };
    });

    const approvedKeySet = new Set<string>(Object.keys(metadata));

    // Step 2: hash ALL non-empty tiles and group by hash
    const hashToKeys: Record<string, string[]> = {};
    ATLAS_FILES.forEach(({ name, tilePx }) => {
      const ad = atlasData[name];
      if (!ad) return;
      const cols = Math.floor(ad.imgData.width / tilePx);
      const rows = Math.floor(ad.imgData.height / tilePx);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const key = tileKey(name, col, row);

          // Quick empty check
          let hasPixel = false;
          outer:
          for (let py = 0; py < tilePx; py++) {
            for (let px = 0; px < tilePx; px++) {
              const sx = col * tilePx + px;
              const sy = row * tilePx + py;
              const idx = (sy * ad.imgData.width + sx) * 4;
              if (ad.imgData.data[idx + 3] > 0) { hasPixel = true; break outer; }
            }
          }
          if (!hasPixel) continue;

          const hash = hashTilePixels(ad.imgData, col, row, tilePx);
          if (!hashToKeys[hash]) hashToKeys[hash] = [];
          hashToKeys[hash].push(key);
        }
      }
    });

    // Step 3: build duplicate map — only flag non-approved tiles that match an approved original
    const dupMap: Record<string, string[]> = {};
    for (const keys of Object.values(hashToKeys)) {
      if (keys.length < 2) continue;

      const approved = keys.filter((k) => approvedKeySet.has(k));
      const notApproved = keys.filter((k) => !approvedKeySet.has(k));

      if (approved.length > 0) {
        // Flag non-approved copies of approved originals
        for (const k of notApproved) {
          dupMap[k] = approved;
        }
      }
      // If no approved original exists, these are just similar tiles — don't flag them
    }

    setDuplicateMap(dupMap);
    setDuplicateScanDone(true);
    const msg = `Scan complete — ${Object.keys(dupMap).length} tiles are copies of approved originals`;
    showToast(msg, 'success');
  }, [images, metadata]);

  const toggleTag = (tag: string) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // ── Object mode helpers ────────────────────────────────

  /** Detect multi-tile objects from existing metadata using the "Name - Quadrant" convention.
   *  Also separates terrain sets (which use edge/corner/Inner Corner naming) and tile groups. */
  const { detectedObjects, detectedTerrains, detectedGroups } = useMemo(() => {
    const objGroups: Record<string, { name: string; tiles: { key: string; col: number; row: number; quadrant: string; atlas: AtlasName }[] }> = {};
    const terrainGroups: Record<string, { name: string; slots: TerrainSlotMap; atlas: AtlasName; groupTilesMap: Record<string, { label: string; description: string; tiles: { key: string; col: number; row: number; index: number; atlas: AtlasName }[] }> }> = {};
    const tileGroups: Record<string, { name: string; description: string; tiles: { key: string; col: number; row: number; index: number; atlas: AtlasName }[] }> = {};

    // Terrain slot regex: "Name edge/corner/Inner Corner - Direction" or "Name - C"
    const terrainRe = /^(.+?)\s+(?:(edge|corner|Inner Corner))\s*-?\s*(N|S|E|W|NE|NW|SE|SW)\s*$/i;
    const innerCornerRe = /^(.+?)\s+Inner Corner\s*-?\s*(NE|NW|SE|SW)\s*$/i;

    for (const [key, meta] of Object.entries(metadata)) {
      if (!meta.tileType) continue;

      // Detect groups first (explicit category)
      if (meta.category === 'group') {
        const match = meta.tileType.match(/^(.+?)\s*-\s*(\d+)\s*$/);
        if (match) {
          const groupName = match[1].trim();
          const index = parseInt(match[2], 10);
          const [atlas, coords] = key.split(':');
          const [col, row] = coords.split(',').map(Number);
          if (!tileGroups[groupName]) {
            tileGroups[groupName] = { name: groupName, description: meta.groupDescription || '', tiles: [] };
          }
          tileGroups[groupName].tiles.push({ key, col, row, index, atlas: atlas as AtlasName });
        }
        continue;
      }

      // Detect terrain-associated group tiles (category: 'terrain', tileType: "Name group:Label - N")
      if (meta.category === 'terrain') {
        const terrGrp = meta.tileType.match(/^(.+?)\s+group(?::(.+?))?\s*-\s*(\d+)\s*$/i);
        if (terrGrp) {
          const tName = terrGrp[1].trim();
          const grpLabel = terrGrp[2]?.trim() || 'default';
          const index = parseInt(terrGrp[3], 10);
          const [atlas, coords] = key.split(':');
          const [col, row] = coords.split(',').map(Number);
          if (!terrainGroups[tName]) {
            terrainGroups[tName] = { name: tName, slots: {}, atlas: atlas as AtlasName, groupTilesMap: {} };
          }
          if (!terrainGroups[tName].groupTilesMap[grpLabel]) {
            terrainGroups[tName].groupTilesMap[grpLabel] = { label: grpLabel, description: meta.groupDescription || '', tiles: [] };
          }
          terrainGroups[tName].groupTilesMap[grpLabel].tiles.push({ key, col, row, index, atlas: atlas as AtlasName });
          continue;
        }
      }

      // If category is explicitly set, use it to route directly
      if (meta.category === 'object') {
        const match = meta.tileType.match(/^(.+?)\s*-\s*((?:N|S|E|W|NE|NW|SE|SW|C|T|M)\d*)\s*$/i);
        if (match) {
          const objName = match[1].trim();
          const quadrant = match[2].toUpperCase();
          const [atlas, coords] = key.split(':');
          const [col, row] = coords.split(',').map(Number);
          if (!objGroups[objName]) {
            objGroups[objName] = { name: objName, tiles: [] };
          }
          objGroups[objName].tiles.push({ key, col, row, quadrant, atlas: atlas as AtlasName });
        }
        continue;
      }

      // Check inner corner first (most specific)
      const ic = meta.tileType.match(innerCornerRe);
      if (ic) {
        const tName = ic[1].trim();
        const dir = 'i' + ic[2].toUpperCase() as TerrainSlotId;
        if (!terrainGroups[tName]) {
          const [atlas] = key.split(':');
          terrainGroups[tName] = { name: tName, slots: {}, atlas: atlas as AtlasName, groupTilesMap: {} };
        }
        terrainGroups[tName].slots[dir] = key;
        continue;
      }

      // Check standard terrain
      const tm = meta.tileType.match(terrainRe);
      if (tm) {
        const tName = tm[1].trim();
        const slotType = tm[2].toLowerCase(); // edge, corner
        const dir = tm[3].toUpperCase();
        let slotId: TerrainSlotId;
        if (slotType === 'edge') {
          slotId = dir as TerrainSlotId;  // N, S, E, W
        } else {
          slotId = dir as TerrainSlotId;  // NE, NW, SE, SW
        }
        if (!terrainGroups[tName]) {
          const [atlas] = key.split(':');
          terrainGroups[tName] = { name: tName, slots: {}, atlas: atlas as AtlasName, groupTilesMap: {} };
        }
        terrainGroups[tName].slots[slotId] = key;
        continue;
      }

      // Check center tile (including alt centers: C, C2, C3, C4)
      const cm = meta.tileType.match(/^(.+?)\s*-\s*(C[234]?)\s*$/i);
      if (cm) {
        const tName = cm[1].trim();
        const centerId = cm[2].toUpperCase() as TerrainSlotId;
        if (!terrainGroups[tName]) {
          const [atlas] = key.split(':');
          terrainGroups[tName] = { name: tName, slots: {}, atlas: atlas as AtlasName, groupTilesMap: {} };
        }
        terrainGroups[tName].slots[centerId] = key;
        continue;
      }

      // Regular object quadrant detection (supports numbered duplicates like C1, W2, etc.)
      const match = meta.tileType.match(/^(.+?)\s*-\s*((?:N|S|E|W|NE|NW|SE|SW|C|T|M)\d*)\s*$/i);
      if (!match) continue;

      const objName = match[1].trim();
      const quadrant = match[2].toUpperCase();
      const [atlas, coords] = key.split(':');
      const [col, row] = coords.split(',').map(Number);

      if (!objGroups[objName]) {
        objGroups[objName] = { name: objName, tiles: [] };
      }
      objGroups[objName].tiles.push({ key, col, row, quadrant, atlas: atlas as AtlasName });
    }

    // Filter terrain groups: only those with > 1 slot filled, or at least one non-center slot, or has group tiles
    const terrains: DetectedTerrain[] = Object.values(terrainGroups)
      .filter((g) => {
        const slotCount = Object.keys(g.slots).length;
        const hasGroups = Object.keys(g.groupTilesMap).length > 0;
        return slotCount >= 2 || (slotCount === 1 && !g.slots['C']) || hasGroups;
      })
      .map((g) => ({
        ...g,
        slotCount: Object.keys(g.slots).length,
        associatedGroups: Object.values(g.groupTilesMap).map((grp) => ({
          ...grp,
          tiles: grp.tiles.sort((a, b) => a.index - b.index),
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Remove terrain names from object groups to avoid duplicates
    const terrainNames = new Set(terrains.map((t) => t.name));

    const objects: DetectedObject[] = Object.values(objGroups)
      .filter((g) => g.tiles.length >= 1 && !terrainNames.has(g.name))
      .map((g) => {
        const cols = g.tiles.map((t) => t.col);
        const rows = g.tiles.map((t) => t.row);
        return {
          ...g,
          width: Math.max(...cols) - Math.min(...cols) + 1,
          height: Math.max(...rows) - Math.min(...rows) + 1,
          minCol: Math.min(...cols),
          minRow: Math.min(...rows),
          atlas: g.tiles[0].atlas,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Build detected groups
    const groups: DetectedGroup[] = Object.values(tileGroups)
      .filter((g) => g.tiles.length > 0)
      .map((g) => ({
        ...g,
        tiles: g.tiles.sort((a, b) => a.index - b.index),
        atlas: g.tiles[0].atlas,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { detectedObjects: objects, detectedTerrains: terrains, detectedGroups: groups };
  }, [metadata]);

  const buildObjectLayout = useCallback((keys: string[]): ObjectLayout | null => {
    if (keys.length === 0) return null;
    const tiles: { key: string; col: number; row: number; atlas: AtlasName }[] = [];
    keys.forEach((key) => {
      const [atlas, coords] = key.split(':');
      const [col, row] = coords.split(',').map(Number);
      tiles.push({ key, col, row, atlas: atlas as AtlasName });
    });

    const cols = tiles.map((t) => t.col);
    const rows = tiles.map((t) => t.row);
    const minCol = Math.min(...cols);
    const minRow = Math.min(...rows);
    const width = Math.max(...cols) - minCol + 1;
    const height = Math.max(...rows) - minRow + 1;

    // First pass: count how many tiles map to the same raw label
    const rawLabels = tiles.map((t) =>
      getQuadrantLabel(t.col - minCol, t.row - minRow, width, height),
    );
    const labelCounts: Record<string, number> = {};
    rawLabels.forEach((l) => (labelCounts[l] = (labelCounts[l] || 0) + 1));

    // Second pass: assign labels, numbering duplicates
    const labelIndex: Record<string, number> = {};
    const sorted = [...tiles].sort((a, b) => (a.row - b.row) || (a.col - b.col));
    const tilesWithQuadrant: ObjectLayoutTile[] = sorted.map((t) => {
      const relCol = t.col - minCol;
      const relRow = t.row - minRow;
      let label = getQuadrantLabel(relCol, relRow, width, height);
      if (labelCounts[label] > 1) {
        labelIndex[label] = (labelIndex[label] || 0) + 1;
        label = `${label}${labelIndex[label]}`;
      }
      return { ...t, quadrant: label, relCol, relRow };
    });

    return { tiles: tilesWithQuadrant, width, height, minCol, minRow };
  }, []);

  /** Compute layout grid with quadrant labels for the current object selection.
   *  If manual overrides exist, use those positions instead. */
  const objectLayout = useMemo((): ObjectLayout | null => {
    if (objectSelection.size === 0) return null;
    const base = buildObjectLayout(Array.from(objectSelection));
    if (!base) return null;

    const hasOverrides = Object.keys(layoutOverrides).length > 0;
    const overrideWidth = gridSizeOverride?.width ?? base.width;
    const overrideHeight = gridSizeOverride?.height ?? base.height;

    if (!hasOverrides && !gridSizeOverride) return base;

    // Rebuild tiles with overridden positions
    const tiles: ObjectLayoutTile[] = base.tiles.map((t) => {
      const ov = layoutOverrides[t.key];
      if (ov) {
        return { ...t, relCol: ov.relCol, relRow: ov.relRow };
      }
      return t;
    });

    // Recompute quadrant labels based on new positions
    const reassigned: ObjectLayoutTile[] = tiles.map((t) => {
      const label = getQuadrantLabel(t.relCol, t.relRow, overrideWidth, overrideHeight);
      return { ...t, quadrant: label };
    });

    // Number duplicate labels
    const labelCounts: Record<string, number> = {};
    reassigned.forEach((t) => (labelCounts[t.quadrant] = (labelCounts[t.quadrant] || 0) + 1));
    const labelIndex: Record<string, number> = {};
    const finalTiles = reassigned.map((t) => {
      if (labelCounts[t.quadrant] > 1) {
        labelIndex[t.quadrant] = (labelIndex[t.quadrant] || 0) + 1;
        return { ...t, quadrant: `${t.quadrant}${labelIndex[t.quadrant]}` };
      }
      return t;
    });

    return { tiles: finalTiles, width: overrideWidth, height: overrideHeight, minCol: base.minCol, minRow: base.minRow };
  }, [objectSelection, buildObjectLayout, layoutOverrides, gridSizeOverride]);

  /** Swap two tiles in the object layout (drag-and-drop rearrange). */
  const swapLayoutTiles = useCallback((fromKey: string, toRelCol: number, toRelRow: number) => {
    if (!objectLayout) return;
    // Find if there's already a tile at the target position
    const targetTile = objectLayout.tiles.find((t) => t.relCol === toRelCol && t.relRow === toRelRow);
    const sourceTile = objectLayout.tiles.find((t) => t.key === fromKey);
    if (!sourceTile) return;
    if (sourceTile.relCol === toRelCol && sourceTile.relRow === toRelRow) return; // same cell

    setLayoutOverrides((prev) => {
      const next = { ...prev };
      // Move source to target position
      next[fromKey] = { relCol: toRelCol, relRow: toRelRow };
      // Swap: move target tile to source's old position
      if (targetTile) {
        next[targetTile.key] = { relCol: sourceTile.relCol, relRow: sourceTile.relRow };
      }
      return next;
    });
  }, [objectLayout]);

  const addGridRow = useCallback(() => {
    if (!objectLayout) return;
    setGridSizeOverride((prev) => ({
      width: prev?.width ?? objectLayout.width,
      height: (prev?.height ?? objectLayout.height) + 1,
    }));
  }, [objectLayout]);

  const removeGridRow = useCallback(() => {
    if (!objectLayout || objectLayout.height <= 1) return;
    setGridSizeOverride((prev) => ({
      width: prev?.width ?? objectLayout.width,
      height: Math.max(1, (prev?.height ?? objectLayout.height) - 1),
    }));
  }, [objectLayout]);

  const addGridCol = useCallback(() => {
    if (!objectLayout) return;
    setGridSizeOverride((prev) => ({
      width: (prev?.width ?? objectLayout.width) + 1,
      height: prev?.height ?? objectLayout.height,
    }));
  }, [objectLayout]);

  const removeGridCol = useCallback(() => {
    if (!objectLayout || objectLayout.width <= 1) return;
    setGridSizeOverride((prev) => ({
      width: Math.max(1, (prev?.width ?? objectLayout.width) - 1),
      height: prev?.height ?? objectLayout.height,
    }));
  }, [objectLayout]);

  const resetLayout = useCallback(() => {
    setLayoutOverrides({});
    setGridSizeOverride(null);
  }, []);

  const toggleTileInObject = useCallback((key: string) => {
    if (objectModeType === 'terrain' && activeSlot) {
      // In terrain mode, clicking a tile assigns it to the active slot
      setTerrainSlots((prev) => {
        const next = { ...prev };
        // If this key was already assigned to another slot, remove it
        for (const [slotId, slotKey] of Object.entries(next)) {
          if (slotKey === key) delete next[slotId as TerrainSlotId];
        }
        next[activeSlot] = key;
        return next;
      });
      // Auto-advance to next empty slot
      const slotOrder = ALL_TERRAIN_SLOTS.map((s) => s.id);
      const curIdx = slotOrder.indexOf(activeSlot);
      const nextEmpty = slotOrder.find((id, idx) => idx > curIdx && !terrainSlots[id] && id !== activeSlot);
      setActiveSlot(nextEmpty || null);
      return;
    }
    // Object mode: toggle tile selection
    setObjectSelection((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [objectModeType, activeSlot, terrainSlots]);

  const applyObjectToMetadata = useCallback(async () => {
    if (!objectLayout || !objectName.trim()) return;
    // Build new metadata directly from ref (avoids React 18 batching delay)
    const next = { ...metadataRef.current };
    objectLayout.tiles.forEach((t) => {
      const existing = next[t.key] || { description: '', tags: [] };
      // Builder tags are authoritative — replace existing tags entirely
      const finalTags = builderTags.length > 0 ? [...builderTags] : (existing.tags.length > 0 ? existing.tags : ['overlay']);
      next[t.key] = {
        description: objectDesc || existing.description || `${objectName.trim()} - ${t.quadrant}`,
        tags: finalTags,
        tileType: `${objectName.trim()} - ${t.quadrant}`,
        category: 'object',
        repeatableRow: repeatableRows.has(t.relRow) || undefined,
        repeatableCol: repeatableCols.has(t.relCol) || undefined,
      };
    });
    metadataRef.current = next;
    setMetadata(next);

    try {
      await axios.post('/api/atlas/metadata', next);
      setDirty(false);
      setObjectSelection(new Set());
      setObjectName('');
      setObjectDesc('');
      setTerrainSlots({});
      setActiveSlot(null);
      setLayoutOverrides({});
      setGridSizeOverride(null);
      setBuilderTags([]);
      setRepeatableRows(new Set());
      setRepeatableCols(new Set());
      showToast(`Approved "${objectName}" and saved (${objectLayout.tiles.length} tiles)`, 'success');
    } catch {
      setDirty(true);
      showToast('Applied locally, but failed to save metadata', 'error');
    }
  }, [objectLayout, objectName, objectDesc, builderTags, repeatableRows, repeatableCols]);

  /** Build tileType string for a terrain slot */
  const terrainSlotTileType = (name: string, slotId: TerrainSlotId): string => {
    const slot = ALL_TERRAIN_SLOTS.find((s) => s.id === slotId)!;
    if (slot.group === 'center') return `${name} - ${slotId}`;
    if (slot.group === 'edge') return `${name} edge - ${slot.id}`;
    if (slot.group === 'corner') return `${name} corner - ${slot.id}`;
    // inner corner: strip the 'i' prefix for the direction
    return `${name} Inner Corner - ${slot.id.slice(1)}`;
  };

  /** Build description for a terrain slot */
  const terrainSlotDescription = (name: string, slotId: TerrainSlotId): string => {
    const slot = ALL_TERRAIN_SLOTS.find((s) => s.id === slotId)!;
    if (slot.group === 'center') {
      if (slotId === 'C') return `${name} - center fill tile`;
      return `${name} - alternate center fill tile (${slotId})`;
    }
    if (slot.group === 'edge') {
      const dirs: Record<string, string> = { N: 'north', S: 'south', E: 'east', W: 'west' };
      return `${name} - ${dirs[slot.id] || slot.id} side transitions to transparent`;
    }
    if (slot.group === 'corner') {
      const parts = slot.id.split('').map((c) =>
        ({ N: 'north', S: 'south', E: 'east', W: 'west' }[c] || c),
      );
      return `${name} - ${parts.join(' and ')} sides transition to transparent`;
    }
    const dir = slot.id.slice(1);
    return `${name} - inner corner ${dir}, concave transition`;
  };

  const applyTerrainToMetadata = useCallback(async () => {
    if (!objectName.trim()) return;
    const filledSlots = Object.entries(terrainSlots) as [TerrainSlotId, string][];
    // Collect all groups: finalized groups + any unsaved current selection
    const allGroups = [...terrainAssocGroups];
    if (objectSelection.size > 0) {
      allGroups.push({
        label: activeGroupLabel.trim() || 'default',
        description: objectDesc,
        keys: Array.from(objectSelection),
      });
    }
    const totalGroupTiles = allGroups.reduce((sum, g) => sum + g.keys.length, 0);
    if (filledSlots.length === 0 && totalGroupTiles === 0) return;

    // Build new metadata directly from ref (avoids React 18 batching delay)
    const next = { ...metadataRef.current };
    // Save terrain slots
    filledSlots.forEach(([slotId, key]) => {
      const existing = next[key] || { description: '', tags: [] };
      const slot = ALL_TERRAIN_SLOTS.find((s) => s.id === slotId)!;
      // Builder tags are authoritative; auto-add 'edge' for edge/corner/inner slots
      const slotAutoTags: string[] = [];
      if (slot.group === 'edge' || slot.group === 'corner' || slot.group === 'inner') {
        slotAutoTags.push('edge');
      }
      const finalTags = builderTags.length > 0
        ? Array.from(new Set([...builderTags, ...slotAutoTags]))
        : (existing.tags.length > 0 ? existing.tags : ['terrain', 'ground', ...slotAutoTags]);
      next[key] = {
        description: terrainSlotDescription(objectName.trim(), slotId),
        tags: finalTags,
        tileType: terrainSlotTileType(objectName.trim(), slotId),
        category: 'terrain',
      };
    });
    // Save all associated tile groups
    allGroups.forEach((grp) => {
      const grpSuffix = grp.label && grp.label !== 'default' ? `:${grp.label}` : '';
      grp.keys.forEach((key, idx) => {
        const existing = next[key] || { description: '', tags: [] };
        const grpFinalTags = builderTags.length > 0 ? [...builderTags] : (existing.tags.length > 0 ? existing.tags : ['terrain', 'ground']);
        next[key] = {
          description: grp.description || existing.description || `${objectName.trim()} - associated tile ${idx + 1}`,
          tags: grpFinalTags,
          tileType: `${objectName.trim()} group${grpSuffix} - ${idx + 1}`,
          category: 'terrain',
          groupDescription: grp.description || undefined,
        };
      });
    });
    metadataRef.current = next;
    setMetadata(next);

    try {
      await axios.post('/api/atlas/metadata', next);
      setDirty(false);
      setObjectSelection(new Set());
      setObjectName('');
      setObjectDesc('');
      setTerrainSlots({});
      setActiveSlot(null);
      setBuilderTags([]);
      setTerrainAssocGroups([]);
      setActiveGroupLabel('');
      const groupMsg = allGroups.length > 0 ? ` + ${totalGroupTiles} tiles in ${allGroups.length} group${allGroups.length > 1 ? 's' : ''}` : '';
      showToast(`Approved terrain "${objectName}" and saved (${filledSlots.length} slots${groupMsg})`, 'success');
    } catch {
      setDirty(true);
      showToast('Applied terrain locally, but failed to save metadata', 'error');
    }
  }, [terrainSlots, objectName, objectDesc, objectSelection, builderTags, terrainAssocGroups, activeGroupLabel]);

  /** Approve a tile group — a labelled collection of associated tiles. */
  const applyGroupToMetadata = useCallback(async () => {
    if (!objectName.trim() || objectSelection.size === 0) return;
    const keys = Array.from(objectSelection);

    // Build new metadata directly from ref (avoids React 18 batching delay)
    const next = { ...metadataRef.current };
    keys.forEach((key, idx) => {
      const existing = next[key] || { description: '', tags: [] };
      const grpFinalTags = builderTags.length > 0 ? [...builderTags] : (existing.tags.length > 0 ? existing.tags : []);
      next[key] = {
        description: objectDesc || existing.description || `${objectName.trim()} tile ${idx + 1}`,
        tags: grpFinalTags,
        tileType: `${objectName.trim()} - ${idx + 1}`,
        category: 'group',
        groupDescription: objectDesc || undefined,
      };
    });
    metadataRef.current = next;
    setMetadata(next);

    try {
      await axios.post('/api/atlas/metadata', next);
      setDirty(false);
      setObjectSelection(new Set());
      setObjectName('');
      setObjectDesc('');
      setBuilderTags([]);
      showToast(`Approved group "${objectName}" and saved (${keys.length} tiles)`, 'success');
    } catch {
      setDirty(true);
      showToast('Applied group locally, but failed to save metadata', 'error');
    }
  }, [objectSelection, objectName, objectDesc, builderTags]);

  const selectExistingObject = useCallback((obj: DetectedObject) => {
    setObjectModeType('object');
    const keys = new Set(obj.tiles.map((t) => t.key));
    setObjectSelection(keys);
    setObjectName(obj.name);
    setTerrainSlots({});
    setActiveSlot(null);
    const firstMeta = metadata[obj.tiles[0]?.key];
    setObjectDesc(firstMeta?.description || '');
    // Restore builder tags: use intersection of tags across ALL tiles
    const allTileTags = obj.tiles.map((t) => metadata[t.key]?.tags || []);
    const sharedTags = allTileTags.length > 0
      ? allTileTags[0].filter((tag) => allTileTags.every((tags) => tags.includes(tag)))
      : [];
    setBuilderTags(sharedTags);
    // Restore repeatable rows/cols from saved metadata
    const newRepRows = new Set<number>();
    const newRepCols = new Set<number>();
    obj.tiles.forEach((t) => {
      const meta = metadata[t.key];
      const relRow = t.row - obj.minRow;
      const relCol = t.col - obj.minCol;
      if (meta?.repeatableRow) newRepRows.add(relRow);
      if (meta?.repeatableCol) newRepCols.add(relCol);
    });
    setRepeatableRows(newRepRows);
    setRepeatableCols(newRepCols);
    if (obj.atlas !== activeAtlas) {
      setActiveAtlas(obj.atlas);
    }
  }, [metadata, activeAtlas]);

  const selectExistingTerrain = useCallback((terr: DetectedTerrain) => {
    setObjectModeType('terrain');
    setObjectName(terr.name);
    setTerrainSlots(terr.slots);
    setActiveSlot(null);
    // Restore associated groups
    if (terr.associatedGroups && terr.associatedGroups.length > 0) {
      setTerrainAssocGroups(terr.associatedGroups.map((g) => ({
        label: g.label,
        description: g.description,
        keys: g.tiles.map((t) => t.key),
      })));
    } else {
      setTerrainAssocGroups([]);
    }
    setObjectSelection(new Set());
    setObjectDesc('');
    setActiveGroupLabel('');
    // Restore builder tags: use intersection of tags across ALL slot tiles
    const allSlotKeys = Object.values(terr.slots).filter(Boolean) as string[];
    const allSlotTags = allSlotKeys.map((key) => metadata[key]?.tags || []);
    const sharedTags = allSlotTags.length > 0
      ? allSlotTags[0].filter((tag) => allSlotTags.every((tags) => tags.includes(tag)))
      : [];
    setBuilderTags(sharedTags);
    if (terr.atlas !== activeAtlas) {
      setActiveAtlas(terr.atlas);
    }
  }, [metadata, activeAtlas]);

  const selectExistingGroup = useCallback((grp: DetectedGroup) => {
    setObjectModeType('terrain');
    const keys = new Set(grp.tiles.map((t) => t.key));
    setObjectSelection(keys);
    setObjectName(grp.name);
    setObjectDesc(grp.description);
    setTerrainSlots({});
    setActiveSlot(null);
    // Restore builder tags from the first tile's tags
    const firstMeta = metadata[grp.tiles[0]?.key];
    setBuilderTags(firstMeta?.tags || []);
    if (grp.atlas !== activeAtlas) {
      setActiveAtlas(grp.atlas);
    }
  }, [metadata, activeAtlas]);

  const queryLoadHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqKind = params.get('setKind');
    const reqName = params.get('setName');
    const reqAtlas = params.get('setAtlas') as AtlasName | null;
    if (!reqKind || !reqName) return;

    const token = `${reqKind}:${reqName}:${reqAtlas || ''}`;
    if (queryLoadHandledRef.current === token) return;

    const nameMatches = (value: string) => value.toLowerCase() === reqName.toLowerCase();

    if (reqKind === 'object') {
      const found = detectedObjects.find((obj) =>
        nameMatches(obj.name) && (!reqAtlas || obj.atlas === reqAtlas),
      );
      if (!found) return;
      selectExistingObject(found);
      queryLoadHandledRef.current = token;
      showToast(`Loaded approved object "${found.name}"`, 'success');
      return;
    }

    if (reqKind === 'terrain') {
      const found = detectedTerrains.find((terr) =>
        nameMatches(terr.name) && (!reqAtlas || terr.atlas === reqAtlas),
      );
      if (!found) return;
      selectExistingTerrain(found);
      queryLoadHandledRef.current = token;
      showToast(`Loaded approved terrain "${found.name}"`, 'success');
    }

    if (reqKind === 'group') {
      const found = detectedGroups.find((grp) =>
        nameMatches(grp.name) && (!reqAtlas || grp.atlas === reqAtlas),
      );
      if (!found) return;
      selectExistingGroup(found);
      queryLoadHandledRef.current = token;
      showToast(`Loaded approved group "${found.name}"`, 'success');
    }
  }, [detectedObjects, detectedTerrains, detectedGroups, selectExistingObject, selectExistingTerrain, selectExistingGroup]);

  const clearObjectSelection = useCallback(() => {
    setObjectSelection(new Set());
    setObjectName('');
    setObjectDesc('');
    setTerrainSlots({});
    setActiveSlot(null);
    setLayoutOverrides({});
    setGridSizeOverride(null);
    setBuilderTags([]);
    setRepeatableRows(new Set());
    setRepeatableCols(new Set());
    setTerrainAssocGroups([]);
    setActiveGroupLabel('');
  }, []);

  // ── Draw preview canvas when selection changes ─────────

  useEffect(() => {
    if (!selectedKey || !previewCanvasRef.current) return;
    const [atlas, coords] = selectedKey.split(':');
    const [col, row] = coords.split(',').map(Number);
    const img = images[atlas as AtlasName];
    if (!img) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    drawTileToCtx(ctx, img, col, row, 128, true, getAtlasTilePx(atlas as AtlasName));
  }, [selectedKey, images]);

  // ── Filtered tile list ─────────────────────────────────

  const filteredTiles = useMemo(() => {
    return tileInfos.filter((t) => {
      if (!showEmpty && t.empty) return false;
      const key = tileKey(t.atlas, t.col, t.row);
      const meta = metadata[key];

      // Duplicates and completed tiles are faded (not removed) — see tile render

      if (filterTag) {
        if (!meta?.tags?.includes(filterTag)) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const desc = meta?.description?.toLowerCase() || '';
        const tags = meta?.tags?.join(' ').toLowerCase() || '';
        const coord = `${t.col},${t.row}`;
        const tType = meta?.tileType?.toLowerCase() || '';
        if (!desc.includes(q) && !tags.includes(q) && !coord.includes(q) && !tType.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [tileInfos, metadata, showEmpty, search, filterTag]);

  // ── Stats ──────────────────────────────────────────────

  const describedCount = useMemo(
    () => Object.values(metadata).filter((m) => m.description).length,
    [metadata],
  );

  const selectedInfo = useMemo(() => {
    if (!selectedKey) return null;
    return tileInfos.find(
      (t) => tileKey(t.atlas, t.col, t.row) === selectedKey,
    ) || null;
  }, [selectedKey, tileInfos]);

  // ── Render ─────────────────────────────────────────────

  const sizeOption = SIZE_OPTIONS.find((s) => s.key === tileSize)!;
  const activeAtlasConfig = ATLAS_FILES.find((a) => a.name === activeAtlas);

  // Compute actual grid columns for the active atlas
  const activeImg = images[activeAtlas];
  const activeTilePx = getAtlasTilePx(activeAtlas);
  const gridCols = activeImg ? Math.floor(activeImg.width / activeTilePx) : 32;

  return (
    <div className="atlas-viewer">
      {/* ── Header ── */}
      <div className="atlas-viewer__header">
        <h1>Atlas Tile Viewer</h1>

        {/* Atlas picker */}
        <select
          value={activeAtlas}
          onChange={(e) => {
            setActiveAtlas(e.target.value as AtlasName);
            setSelectedKey(null);
          }}
        >
          {ATLAS_GROUP_ORDER.map((group) => {
            const entries = ATLAS_FILES.filter((a) => a.group === group);
            if (entries.length === 0) return null;
            return (
              <optgroup key={group} label={group}>
                {entries.map((a) => (
                  <option key={a.name} value={a.name}>{a.label}</option>
                ))}
              </optgroup>
            );
          })}
        </select>

        {/* Size */}
        <select value={tileSize} onChange={(e) => setTileSize(e.target.value as any)}>
          {SIZE_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        {/* Search */}
        <input
          className="atlas-search"
          placeholder="Search tiles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Show empty toggle */}
        <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={showEmpty}
            onChange={(e) => setShowEmpty(e.target.checked)}
          />
          Show empty
        </label>

        <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show completed
        </label>

        <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={showDuplicates}
            onChange={(e) => setShowDuplicates(e.target.checked)}
            disabled={!duplicateScanDone}
          />
          Show dupes
        </label>

        <button
          onClick={scanForDuplicates}
          style={{ background: '#1a1a2e', color: '#fff', border: '1px solid #2a3f69', borderRadius: 4, padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
        >
          {duplicateScanDone ? '↻ Re-scan Dupes' : '⚡ Scan Duplicates'}
        </button>

        {/* Save */}
        <button onClick={saveMetadata} style={dirty ? { background: '#e94560' } : undefined}>
          {dirty ? '● Save' : 'Save'}
        </button>
        <button onClick={exportMetadata}>Export JSON</button>
        <button onClick={exportTypeScript}>Copy TS</button>

        {onClose && <button onClick={onClose}>✕ Close</button>}

        <span className="atlas-stats">
          {filteredTiles.length} tiles shown · {describedCount} described · {activeAtlasConfig?.group || 'Pack'}
        </span>
      </div>

      {/* ── Tag filter bar ── */}
      <div style={{ padding: '6px 20px', background: '#16213e', borderBottom: '1px solid #0f3460' }}>
        <div className="atlas-filter-chips">
          <button
            className={`atlas-filter-chip ${!filterTag ? 'atlas-filter-chip--active' : ''}`}
            onClick={() => setFilterTag(null)}
          >
            All
          </button>
          {TAG_PRESETS.map((tag) => (
            <button
              key={tag}
              className={`atlas-filter-chip ${filterTag === tag ? 'atlas-filter-chip--active' : ''}`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="atlas-viewer__body">
        {/* ── Tile Grid ── */}
        <div className="atlas-grid-wrap">
          <div
            className={`atlas-grid atlas-grid--${tileSize}`}
            style={{ gridTemplateColumns: `repeat(${gridCols}, ${sizeOption.px}px)` }}
          >
            {filteredTiles.map((tile) => {
              const key = tileKey(tile.atlas, tile.col, tile.row);
              const meta = metadata[key];
              const isDuplicate = !!duplicateMap[key];
              const isSelected = key === selectedKey;
              const isCompleted = !!meta;
              const isFaded = (!showDuplicates && isDuplicate) || (!showCompleted && isCompleted);
              const isObjSelected = objectModeType === 'object'
                ? objectSelection.has(key)
                : (Object.values(terrainSlots).includes(key) || objectSelection.has(key));
              const terrainSlotLabel = objectModeType === 'terrain'
                ? (Object.entries(terrainSlots).find(([, v]) => v === key)?.[0] || null)
                : null;
              const classes = [
                'atlas-tile',
                isObjSelected && 'atlas-tile--object-selected',
                tile.empty && 'atlas-tile--empty',
                tile.hasTransparency && 'atlas-tile--has-transparency',
                meta?.description && 'atlas-tile--has-desc',
                isDuplicate && 'atlas-tile--duplicate',
                isFaded && 'atlas-tile--faded',
              ].filter(Boolean).join(' ');

              return (
                <div
                  key={key}
                  className={classes}
                  onClick={() => toggleTileInObject(key)}
                  title={`[${tile.col}, ${tile.row}] ${meta?.description || ''}`}
                  style={{ width: sizeOption.px, height: sizeOption.px }}
                >
                  <TileCanvas
                    atlas={tile.atlas}
                    col={tile.col}
                    row={tile.row}
                    size={sizeOption.px}
                    img={images[tile.atlas]}
                  />
                  {isDuplicate && (
                    <span style={{ position: 'absolute', top: 2, left: 2, fontSize: '0.55rem', background: '#e67e22', color: '#fff', borderRadius: 3, padding: '0 3px', lineHeight: 1.4, pointerEvents: 'none' }}>DUP</span>
                  )}
                  <span className="atlas-tile__coord">
                    {terrainSlotLabel || `${tile.col},${tile.row}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Inspector ── */}
        <div className="atlas-inspector">
            {/* ── Object / Terrain Builder Panel ── */}
            <>
              <h2>Builder</h2>

              {/* Name + Type selector */}
              <div>
                <label>Name</label>
                <input
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  placeholder="e.g. Tree1, Water, grass…"
                />
              </div>

              <div>
                <label>Type</label>
                <div className="atlas-mode-toggle">
                  <button
                    className={`atlas-mode-toggle__btn ${objectModeType === 'object' ? 'atlas-mode-toggle__btn--active' : ''}`}
                    onClick={() => {
                      if (objectModeType !== 'object') {
                        setObjectModeType('object');
                        setTerrainSlots({});
                        setActiveSlot(null);
                      }
                    }}
                  >
                    📦 Object
                  </button>
                  <button
                    className={`atlas-mode-toggle__btn ${objectModeType === 'terrain' ? 'atlas-mode-toggle__btn--active' : ''}`}
                    onClick={() => {
                      if (objectModeType !== 'terrain') {
                        setObjectModeType('terrain');
                      }
                    }}
                  >
                    🌍 Terrain
                  </button>
                </div>
                <div style={{ opacity: 0.5, fontSize: '0.7rem', marginTop: 4 }}>
                  {objectModeType === 'object'
                    ? 'Fixed multi-tile sprite — all pieces are used together (e.g. tree, barrel cluster)'
                    : 'Tiling terrain & tile groups — edges, corners & inner corners, plus associated tile collections'
                  }
                </div>
              </div>

              {/* ── Builder Tags (shared across all modes) ── */}
              <div>
                <label>Builder Tags (applied to all tiles on approve)</label>
                <div className="atlas-inspector__tags">
                  {TAG_PRESETS.map((tag) => (
                    <button
                      key={tag}
                      className={`atlas-inspector__tag ${builderTags.includes(tag) ? 'atlas-inspector__tag--active' : ''}`}
                      onClick={() => {
                        setBuilderTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                        );
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {objectModeType === 'terrain' && (
                /* ── Terrain Builder ── */
                <>
                  <div style={{ opacity: 0.7, fontSize: '0.75rem', marginBottom: 4 }}>
                    Click a slot below, then click a tile in the atlas to assign it.
                  </div>

                  {/* Edges + Corners (3×3) */}
                  <div>
                    <label>Edges & Corners</label>
                    <div className="atlas-terrain-grid">
                      {TERRAIN_SLOTS.map((slot) => {
                        const slotKey = terrainSlots[slot.id];
                        const isActive = activeSlot === slot.id;
                        const isFilled = !!slotKey;
                        let tileCol = 0, tileRow = 0;
                        let tileAtlas: AtlasName = activeAtlas;
                        if (slotKey) {
                          const [a, coords] = slotKey.split(':');
                          [tileCol, tileRow] = coords.split(',').map(Number);
                          tileAtlas = a as AtlasName;
                        }
                        return (
                          <div
                            key={slot.id}
                            className={[
                              'atlas-terrain-slot',
                              isActive && 'atlas-terrain-slot--active',
                              isFilled && 'atlas-terrain-slot--filled',
                              `atlas-terrain-slot--${slot.group}`,
                            ].filter(Boolean).join(' ')}
                            style={{ gridColumn: slot.gridCol, gridRow: slot.gridRow }}
                            onClick={() => setActiveSlot(isActive ? null : slot.id)}
                            title={`${slot.label} (${slot.group})${isFilled ? ` ← ${slotKey}` : ''}`}
                          >
                            {isFilled ? (
                              <TileCanvas
                                atlas={tileAtlas}
                                col={tileCol}
                                row={tileRow}
                                size={48}
                                img={images[tileAtlas]}
                              />
                            ) : (
                              <span className="atlas-terrain-slot__empty">—</span>
                            )}
                            <span className="atlas-terrain-slot__label">{slot.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inner Corners (2×2) */}
                  <div>
                    <label>Inner Corners</label>
                    <div className="atlas-terrain-grid atlas-terrain-grid--inner">
                      {INNER_CORNER_SLOTS.map((slot) => {
                        const slotKey = terrainSlots[slot.id];
                        const isActive = activeSlot === slot.id;
                        const isFilled = !!slotKey;
                        let tileCol = 0, tileRow = 0;
                        let tileAtlas: AtlasName = activeAtlas;
                        if (slotKey) {
                          const [a, coords] = slotKey.split(':');
                          [tileCol, tileRow] = coords.split(',').map(Number);
                          tileAtlas = a as AtlasName;
                        }
                        return (
                          <div
                            key={slot.id}
                            className={[
                              'atlas-terrain-slot',
                              isActive && 'atlas-terrain-slot--active',
                              isFilled && 'atlas-terrain-slot--filled',
                              'atlas-terrain-slot--inner',
                            ].filter(Boolean).join(' ')}
                            style={{ gridColumn: slot.gridCol, gridRow: slot.gridRow }}
                            onClick={() => setActiveSlot(isActive ? null : slot.id)}
                            title={`${slot.label} (inner corner)${isFilled ? ` ← ${slotKey}` : ''}`}
                          >
                            {isFilled ? (
                              <TileCanvas
                                atlas={tileAtlas}
                                col={tileCol}
                                row={tileRow}
                                size={48}
                                img={images[tileAtlas]}
                              />
                            ) : (
                              <span className="atlas-terrain-slot__empty">—</span>
                            )}
                            <span className="atlas-terrain-slot__label">{slot.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alt Centers (1×3 row) */}
                  <div>
                    <label>Alt Centers</label>
                    <div className="atlas-terrain-grid atlas-terrain-grid--alt-centers">
                      {ALT_CENTER_SLOTS.map((slot) => {
                        const slotKey = terrainSlots[slot.id];
                        const isActive = activeSlot === slot.id;
                        const isFilled = !!slotKey;
                        let tileCol = 0, tileRow = 0;
                        let tileAtlas: AtlasName = activeAtlas;
                        if (slotKey) {
                          const [a, coords] = slotKey.split(':');
                          [tileCol, tileRow] = coords.split(',').map(Number);
                          tileAtlas = a as AtlasName;
                        }
                        return (
                          <div
                            key={slot.id}
                            className={[
                              'atlas-terrain-slot',
                              isActive && 'atlas-terrain-slot--active',
                              isFilled && 'atlas-terrain-slot--filled',
                              'atlas-terrain-slot--alt-center',
                            ].filter(Boolean).join(' ')}
                            style={{ gridColumn: slot.gridCol, gridRow: slot.gridRow }}
                            onClick={() => setActiveSlot(isActive ? null : slot.id)}
                            title={`${slot.label} (alt center)${isFilled ? ` ← ${slotKey}` : ''}`}
                          >
                            {isFilled ? (
                              <TileCanvas
                                atlas={tileAtlas}
                                col={tileCol}
                                row={tileRow}
                                size={48}
                                img={images[tileAtlas]}
                              />
                            ) : (
                              <span className="atlas-terrain-slot__empty">—</span>
                            )}
                            <span className="atlas-terrain-slot__label">{slot.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="atlas-object-size">
                    <span className="label">Slots filled: </span>
                    <strong>{Object.keys(terrainSlots).length}</strong> / 16
                  </div>

                  <div className="atlas-inspector__actions">
                    <button
                      className="atlas-inspector__save"
                      onClick={applyTerrainToMetadata}
                      disabled={!objectName.trim() || (Object.keys(terrainSlots).length === 0 && objectSelection.size === 0 && terrainAssocGroups.length === 0)}
                    >
                      Approve "{objectName || '…'}" terrain ({Object.keys(terrainSlots).length} slots
                      {(terrainAssocGroups.length + (objectSelection.size > 0 ? 1 : 0)) > 0
                        ? ` + ${terrainAssocGroups.length + (objectSelection.size > 0 ? 1 : 0)} group${(terrainAssocGroups.length + (objectSelection.size > 0 ? 1 : 0)) > 1 ? 's' : ''}`
                        : ''})
                    </button>
                  </div>

                  {/* ── Associated Tile Groups (within terrain mode) ── */}
                  <div style={{ borderTop: '1px solid #0f3460', paddingTop: 10, marginTop: 6 }}>
                    <label>📋 Associated Tile Groups ({terrainAssocGroups.length + (objectSelection.size > 0 ? 1 : 0)})</label>
                    <div style={{ opacity: 0.6, fontSize: '0.72rem', marginBottom: 6 }}>
                      Deselect all terrain slots, then click tiles to add them to a group.
                      Use "Add Group" to finalize and start another. All groups save with Approve.
                    </div>

                    {/* ── Finalized groups list ── */}
                    {terrainAssocGroups.map((grp, gi) => (
                      <div key={`grp-${gi}`} style={{ background: '#101826', border: '1px solid #1f3257', borderRadius: 4, padding: 6, marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.78rem' }}>
                            {grp.label || 'Unnamed group'} <span style={{ opacity: 0.5, fontWeight: 'normal' }}>({grp.keys.length} tiles)</span>
                          </strong>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => {
                                // Edit: load back into working selection
                                setObjectSelection(new Set(grp.keys));
                                setObjectDesc(grp.description);
                                setActiveGroupLabel(grp.label);
                                setTerrainAssocGroups((prev) => prev.filter((_, i) => i !== gi));
                              }}
                              style={{ background: '#1a1a2e', color: '#7eb8da', border: '1px solid #2a3f69', borderRadius: 3, padding: '1px 6px', fontSize: '0.68rem', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setTerrainAssocGroups((prev) => prev.filter((_, i) => i !== gi))}
                              style={{ background: '#3a1414', color: '#ffb4b4', border: '1px solid #e74c3c', borderRadius: 3, padding: '1px 6px', fontSize: '0.68rem', cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        {grp.description && (
                          <div style={{ fontSize: '0.68rem', opacity: 0.7, fontStyle: 'italic', marginBottom: 4 }}>{grp.description}</div>
                        )}
                        <div className="atlas-group-tiles" style={{ gap: 2 }}>
                          {grp.keys.map((key) => {
                            const [atlas, coords] = key.split(':');
                            const [col, row] = coords.split(',').map(Number);
                            return (
                              <div key={key} style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
                                <TileCanvas
                                  atlas={atlas as AtlasName}
                                  col={col}
                                  row={row}
                                  size={28}
                                  img={images[atlas as AtlasName]}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* ── Working group builder ── */}
                    <div style={{ background: '#0d1520', border: '1px dashed #2a3f69', borderRadius: 4, padding: 6 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <input
                          value={activeGroupLabel}
                          onChange={(e) => setActiveGroupLabel(e.target.value)}
                          placeholder="Group label (e.g. 'Cobblestone variants')"
                          style={{ flex: 1, background: '#15152a', color: '#eee', border: '1px solid #2a3f69', borderRadius: 3, padding: '3px 6px', fontSize: '0.75rem' }}
                        />
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <textarea
                          value={objectDesc}
                          onChange={(e) => setObjectDesc(e.target.value)}
                          placeholder="Group description (optional)"
                          style={{ minHeight: 30, fontSize: '0.75rem' }}
                        />
                      </div>

                      {objectSelection.size > 0 ? (
                        <>
                          <div className="atlas-object-size" style={{ marginBottom: 4 }}>
                            <span className="label">Tiles in group: </span>
                            <strong>{objectSelection.size}</strong>
                          </div>

                          <div className="atlas-group-tiles">
                            {Array.from(objectSelection).map((key, idx) => {
                              const [atlas, coords] = key.split(':');
                              const [col, row] = coords.split(',').map(Number);
                              return (
                                <div
                                  key={key}
                                  className="atlas-group-tile"
                                  title={`${key} — click to remove`}
                                  onClick={() => {
                                    setObjectSelection((prev) => {
                                      const next = new Set(prev);
                                      next.delete(key);
                                      return next;
                                    });
                                  }}
                                >
                                  <TileCanvas
                                    atlas={atlas as AtlasName}
                                    col={col}
                                    row={row}
                                    size={40}
                                    img={images[atlas as AtlasName]}
                                  />
                                  <span className="atlas-group-tile__index">{idx + 1}</span>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => {
                              setTerrainAssocGroups((prev) => [
                                ...prev,
                                {
                                  label: activeGroupLabel.trim() || `Group ${prev.length + 1}`,
                                  description: objectDesc,
                                  keys: Array.from(objectSelection),
                                },
                              ]);
                              setObjectSelection(new Set());
                              setObjectDesc('');
                              setActiveGroupLabel('');
                            }}
                            style={{ marginTop: 6, background: '#0f3460', color: '#fff', border: '1px solid #2f6ea7', borderRadius: 4, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', width: '100%' }}
                          >
                            + Add Group{activeGroupLabel.trim() ? ` "${activeGroupLabel.trim()}"` : ''} ({objectSelection.size} tiles)
                          </button>
                        </>
                      ) : (
                        <div style={{ opacity: 0.4, fontSize: '0.72rem', textAlign: 'center', padding: '8px 0' }}>
                          Deselect terrain slots, then click atlas tiles to build a group.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {objectModeType === 'object' && (
                /* ── Object Builder ── */
                <>
                  <div>
                    <label>Object Description</label>
                    <textarea
                      value={objectDesc}
                      onChange={(e) => setObjectDesc(e.target.value)}
                      placeholder="Describe this object…"
                    />
                  </div>

                  {objectLayout ? (
                    <>
                      <div className="atlas-object-size">
                        <span className="label">Size: </span>
                        <strong>{objectLayout.width} × {objectLayout.height}</strong> tiles
                        <span style={{ marginLeft: 8, opacity: 0.6 }}>({objectSelection.size} selected)</span>
                      </div>

                      {/* Grid resize controls */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>Grid:</span>
                        <button onClick={removeGridCol} style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #2a3f69', borderRadius: 3, padding: '1px 6px', fontSize: '0.72rem', cursor: 'pointer' }} title="Remove column">Col −</button>
                        <button onClick={addGridCol} style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #2a3f69', borderRadius: 3, padding: '1px 6px', fontSize: '0.72rem', cursor: 'pointer' }} title="Add column">Col +</button>
                        <button onClick={removeGridRow} style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #2a3f69', borderRadius: 3, padding: '1px 6px', fontSize: '0.72rem', cursor: 'pointer' }} title="Remove row">Row −</button>
                        <button onClick={addGridRow} style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #2a3f69', borderRadius: 3, padding: '1px 6px', fontSize: '0.72rem', cursor: 'pointer' }} title="Add row">Row +</button>
                        {(Object.keys(layoutOverrides).length > 0 || gridSizeOverride) && (
                          <button onClick={resetLayout} style={{ background: '#3a1414', color: '#ffb4b4', border: '1px solid #e74c3c', borderRadius: 3, padding: '1px 6px', fontSize: '0.72rem', cursor: 'pointer' }} title="Reset layout to auto">Reset</button>
                        )}
                      </div>
                      <div style={{ opacity: 0.5, fontSize: '0.65rem', marginBottom: 6 }}>Drag tiles to rearrange · Click ↔/↕ headers to mark repeatable</div>

                      <div>
                        <label>Object Layout</label>

                        {/* Column repeat headers */}
                        <div style={{ display: 'flex', marginLeft: 22, marginBottom: 2, gap: 2 }}>
                          {Array.from({ length: objectLayout.width }, (_, c) => (
                            <button
                              key={`col-rep-${c}`}
                              className={`atlas-repeat-header ${repeatableCols.has(c) ? 'atlas-repeat-header--active' : ''}`}
                              style={{ width: 52 }}
                              onClick={() => setRepeatableCols((prev) => {
                                const next = new Set(prev);
                                next.has(c) ? next.delete(c) : next.add(c);
                                return next;
                              })}
                              title={`Column ${c}${repeatableCols.has(c) ? ' (repeatable — click to unmark)' : ' — click to mark as repeatable'}`}
                            >
                              ↔
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: 2 }}>
                          {/* Row repeat headers */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 0 }}>
                            {Array.from({ length: objectLayout.height }, (_, r) => (
                              <button
                                key={`row-rep-${r}`}
                                className={`atlas-repeat-header atlas-repeat-header--row ${repeatableRows.has(r) ? 'atlas-repeat-header--active' : ''}`}
                                style={{ height: 52 }}
                                onClick={() => setRepeatableRows((prev) => {
                                  const next = new Set(prev);
                                  next.has(r) ? next.delete(r) : next.add(r);
                                  return next;
                                })}
                                title={`Row ${r}${repeatableRows.has(r) ? ' (repeatable — click to unmark)' : ' — click to mark as repeatable'}`}
                              >
                                ↕
                              </button>
                            ))}
                          </div>

                          {/* The grid itself */}
                          <div
                            className="atlas-object-grid"
                            style={{
                              gridTemplateColumns: `repeat(${objectLayout.width}, 52px)`,
                              gridTemplateRows: `repeat(${objectLayout.height}, 52px)`,
                            }}
                          >
                          {Array.from({ length: objectLayout.height }, (_, r) =>
                            Array.from({ length: objectLayout.width }, (_, c) => {
                              const tile = objectLayout.tiles.find(
                                (t) => t.relCol === c && t.relRow === r,
                              );
                              if (tile) {
                                const isRepRow = repeatableRows.has(r);
                                const isRepCol = repeatableCols.has(c);
                                return (
                                  <div
                                    key={`${c},${r}`}
                                    className={[
                                      'atlas-object-grid__cell atlas-object-grid__cell--filled',
                                      isRepRow && 'atlas-object-grid__cell--rep-row',
                                      isRepCol && 'atlas-object-grid__cell--rep-col',
                                    ].filter(Boolean).join(' ')}
                                    draggable
                                    onDragStart={(e) => {
                                      dragKeyRef.current = tile.key;
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (dragKeyRef.current) {
                                        swapLayoutTiles(dragKeyRef.current, c, r);
                                        dragKeyRef.current = null;
                                      }
                                    }}
                                    style={{ cursor: 'grab' }}
                                  >
                                    <TileCanvas
                                      atlas={tile.atlas}
                                      col={tile.col}
                                      row={tile.row}
                                      size={48}
                                      img={images[tile.atlas]}
                                    />
                                    <span className="atlas-object-grid__label">{tile.quadrant}</span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`${c},${r}`}
                                  className="atlas-object-grid__cell atlas-object-grid__cell--empty"
                                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (dragKeyRef.current) {
                                      swapLayoutTiles(dragKeyRef.current, c, r);
                                      dragKeyRef.current = null;
                                    }
                                  }}
                                >
                                  <span style={{ opacity: 0.3, fontSize: '0.7rem' }}>—</span>
                                </div>
                              );
                            }),
                          )}
                        </div>
                      </div>{/* end flex row (row headers + grid) */}

                      {/* Repeatable legend */}
                      {(repeatableRows.size > 0 || repeatableCols.size > 0) && (
                        <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 4 }}>
                          {repeatableRows.size > 0 && <span style={{ color: '#2ecc71' }}>↕ {repeatableRows.size} repeatable row{repeatableRows.size > 1 ? 's' : ''} </span>}
                          {repeatableCols.size > 0 && <span style={{ color: '#2ecc71' }}>↔ {repeatableCols.size} repeatable col{repeatableCols.size > 1 ? 's' : ''}</span>}
                        </div>
                      )}
                      </div>{/* end Object Layout */}

                      <div className="atlas-inspector__actions">
                        <button
                          className="atlas-inspector__save"
                          onClick={applyObjectToMetadata}
                          disabled={!objectName.trim()}
                        >
                          Approve "{objectName || '…'}" ({objectSelection.size} tiles)
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
                      <p>Click tiles in the grid to select them.</p>
                      <p style={{ fontSize: '0.75rem' }}>
                        Select tiles that make up a multi-tile object,<br />
                        then name it to assign quadrant labels.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Clear button always visible */}
              {(objectSelection.size > 0 || Object.keys(terrainSlots).length > 0 || objectName) && (
                <button
                  className="atlas-inspector__export"
                  onClick={clearObjectSelection}
                  style={{ width: '100%', padding: 6, marginTop: 4 }}
                >
                  Clear
                </button>
              )}
            </>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`atlas-toast atlas-toast--${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
};

// ─── Mini tile canvas component (memoized) ──────────────

const TileCanvas: React.FC<{
  atlas: AtlasName;
  col: number;
  row: number;
  size: number;
  img: HTMLImageElement | null;
}> = React.memo(({ atlas, col, row, size, img }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const tilePx = getAtlasTilePx(atlas);

  useEffect(() => {
    if (!ref.current || !img) return;
    const ctx = ref.current.getContext('2d')!;
    drawTileToCtx(ctx, img, col, row, size, true, tilePx);
  }, [img, col, row, size, tilePx]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className="atlas-tile__canvas"
    />
  );
});

export default AtlasViewer;
