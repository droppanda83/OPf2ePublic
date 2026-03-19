const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT = path.join(__dirname, 'source', 'maps.source.json');
const MAPS_DIR = path.join(ROOT, 'frontend', 'public', 'maps');

function fail(message) {
  throw new Error(`[foundry-scenes:convert] ${message}`);
}

function parseArgs(argv) {
  const args = { input: '', output: DEFAULT_OUTPUT, foundryDataDir: '' };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--input' || token === '-i') {
      args.input = argv[++i] || '';
    } else if (token === '--output' || token === '-o') {
      args.output = argv[++i] || DEFAULT_OUTPUT;
    } else if (token === '--foundry-data' || token === '-d') {
      args.foundryDataDir = argv[++i] || '';
    }
  }
  if (!args.input) {
    fail('Missing required --input <path-to-foundry-scene-export.json>');
  }
  return args;
}

function readJson(filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(absolute)) {
    fail(`Input file not found: ${absolute}`);
  }
  const raw = fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferTheme(name) {
  const text = String(name || '').toLowerCase();
  if (/(dungeon|crypt|catacomb|cave|vault|sewer|temple)/.test(text)) return 'dungeon';
  if (/(forest|swamp|mountain|river|wilderness|grove|jungle|camp)/.test(text)) return 'wilderness';
  if (/(street|city|town|market|dock|rooftop|alley|plaza)/.test(text)) return 'urban';
  if (/(manor|inn|hall|library|tower|house|palace|room|interior)/.test(text)) return 'indoor';
  return 'special';
}

/** Infer descriptive tags from the scene name + theme for GM AI matching */
function inferTags(name, theme) {
  const text = String(name || '').toLowerCase();
  const tags = [theme];
  const tagPatterns = [
    [/(dark|shadow|dim)/, 'dark'],
    [/(narrow|corridor|passage|tunnel)/, 'narrow'],
    [/(underground|under|below|depth)/, 'underground'],
    [/(open|wide|field|clearing)/, 'open'],
    [/(water|river|lake|pond|stream|ocean)/, 'water'],
    [/(fire|lava|flame|burning)/, 'fire'],
    [/(ice|frozen|cold|frost|snow|winter)/, 'ice'],
    [/(spider|web)/, 'spiders'],
    [/(undead|skeleton|zombie|ghost|haunt)/, 'undead'],
    [/(trap|hazard)/, 'traps'],
    [/(throne|king|queen|royal|court)/, 'royal'],
    [/(ruin|ancient|crumbl|decay|abandon)/, 'ruins'],
    [/(bridge|crossing)/, 'bridge'],
    [/(ship|boat|dock|pier|harbor)/, 'nautical'],
    [/(arena|pit|colosseum)/, 'arena'],
    [/(garden|hedge|grove|druid)/, 'nature'],
    [/(tavern|inn|bar|pub)/, 'tavern'],
    [/(market|shop|bazaar|store)/, 'market'],
    [/(cemetery|grave|tomb|burial)/, 'graves'],
    [/(mine|quarry|dig)/, 'mine'],
  ];
  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(text)) tags.push(tag);
  }
  return [...new Set(tags)];
}

function toGridCoordinate(pixelValue, gridSize) {
  if (!Number.isFinite(pixelValue) || gridSize <= 0) return 0;
  return Math.max(0, Math.floor(pixelValue / gridSize));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniquePositions(positions) {
  const seen = new Set();
  const out = [];
  for (const pos of positions) {
    const key = `${pos.x},${pos.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(pos);
    }
  }
  return out;
}

function rasterizeLine(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    dx = Math.abs(x1 - x0);
    dy = Math.abs(y1 - y0);
  }

  return points;
}

function buildEmptyTerrain(width, height) {
  const terrain = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push('empty');
    }
    terrain.push(row);
  }
  return terrain;
}

function markTerrain(terrain, positions, type) {
  for (const pos of positions) {
    if (terrain[pos.y] && terrain[pos.y][pos.x] !== undefined) {
      terrain[pos.y][pos.x] = type;
    }
  }
}

function normalizeWalls(scene, gridSize, width, height) {
  const walls = ensureArray(scene?.walls);
  const positions = [];

  for (const wall of walls) {
    const c = Array.isArray(wall?.c) ? wall.c : Array.isArray(wall) ? wall : [];
    if (c.length !== 4) continue;
    const x0 = clamp(toGridCoordinate(Number(c[0]), gridSize), 0, width - 1);
    const y0 = clamp(toGridCoordinate(Number(c[1]), gridSize), 0, height - 1);
    const x1 = clamp(toGridCoordinate(Number(c[2]), gridSize), 0, width - 1);
    const y1 = clamp(toGridCoordinate(Number(c[3]), gridSize), 0, height - 1);
    positions.push(...rasterizeLine(x0, y0, x1, y1));
  }

  return uniquePositions(positions);
}

function normalizeDrawings(scene, gridSize, width, height) {
  const drawings = ensureArray(scene?.drawings);
  const difficult = [];

  for (const drawing of drawings) {
    const shape = drawing?.shape || {};
    const x = Number(shape.x ?? drawing.x ?? 0);
    const y = Number(shape.y ?? drawing.y ?? 0);
    const w = Number(shape.width ?? drawing.width ?? 0);
    const h = Number(shape.height ?? drawing.height ?? 0);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;

    const minX = clamp(toGridCoordinate(x, gridSize), 0, width - 1);
    const minY = clamp(toGridCoordinate(y, gridSize), 0, height - 1);
    const maxX = clamp(toGridCoordinate(x + w, gridSize), 0, width - 1);
    const maxY = clamp(toGridCoordinate(y + h, gridSize), 0, height - 1);

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        difficult.push({ x: gx, y: gy });
      }
    }
  }

  return uniquePositions(difficult);
}

function defaultStartingZones(width, height) {
  const mid = Math.max(1, Math.floor(height / 2));
  return {
    players: [
      { x: 1, y: clamp(mid - 1, 0, height - 1) },
      { x: 1, y: clamp(mid, 0, height - 1) },
      { x: 2, y: clamp(mid - 1, 0, height - 1) },
      { x: 2, y: clamp(mid, 0, height - 1) },
    ],
    enemies: [
      { x: clamp(width - 2, 0, width - 1), y: clamp(mid - 1, 0, height - 1) },
      { x: clamp(width - 2, 0, width - 1), y: clamp(mid, 0, height - 1) },
      { x: clamp(width - 3, 0, width - 1), y: clamp(mid - 1, 0, height - 1) },
      { x: clamp(width - 3, 0, width - 1), y: clamp(mid, 0, height - 1) },
    ],
  };
}

/** Try to resolve and copy the scene background image to frontend/public/maps/ */
function resolveBackgroundImage(scene, foundryDataDir, mapSlug) {
  // Foundry stores background in several formats
  const bgSrc = scene?.background?.src || scene?.img || '';
  if (!bgSrc) return undefined;

  // Determine file extension from the source path
  const ext = path.extname(bgSrc).toLowerCase() || '.webp';
  const targetFilename = `${mapSlug}${ext}`;

  // If we have a Foundry data directory, try to copy the file
  if (foundryDataDir) {
    const absFoundry = path.isAbsolute(foundryDataDir) ? foundryDataDir : path.join(ROOT, foundryDataDir);
    // Foundry paths are usually relative to the Data directory
    const absoluteSrc = path.join(absFoundry, bgSrc.replace(/^\/?/, ''));
    if (fs.existsSync(absoluteSrc)) {
      if (!fs.existsSync(MAPS_DIR)) {
        fs.mkdirSync(MAPS_DIR, { recursive: true });
      }
      fs.copyFileSync(absoluteSrc, path.join(MAPS_DIR, targetFilename));
      console.log(`[foundry-scenes:convert]   Copied image: ${targetFilename}`);
      return targetFilename;
    } else {
      console.warn(`[foundry-scenes:convert]   ⚠ Image not found: ${absoluteSrc}`);
      console.warn(`[foundry-scenes:convert]     Copy manually to frontend/public/maps/${targetFilename}`);
      return targetFilename; // Still set the URL so it's ready when the file is placed
    }
  }

  // No data dir — output the filename for manual placement
  console.log(`[foundry-scenes:convert]   Image referenced: ${bgSrc}`);
  console.log(`[foundry-scenes:convert]     Copy to frontend/public/maps/${targetFilename}`);
  return targetFilename;
}

function normalizeScene(scene, index, foundryDataDir) {
  const sceneId = String(scene?._id || scene?.id || `foundry-scene-${index + 1}`);
  const sceneName = String(scene?.name || `Foundry Scene ${index + 1}`);

  const gridSize = Number(scene?.grid?.size || scene?.grid || 100);
  const pixelWidth = Number(scene?.width || 0);
  const pixelHeight = Number(scene?.height || 0);
  if (!Number.isFinite(pixelWidth) || !Number.isFinite(pixelHeight) || pixelWidth <= 0 || pixelHeight <= 0) {
    fail(`Scene '${sceneName}' has invalid width/height`);
  }

  const width = Math.max(4, Math.round(pixelWidth / Math.max(gridSize, 1)));
  const height = Math.max(4, Math.round(pixelHeight / Math.max(gridSize, 1)));
  const terrain = buildEmptyTerrain(width, height);

  const wallPositions = normalizeWalls(scene, gridSize, width, height);
  const difficultPositions = normalizeDrawings(scene, gridSize, width, height);

  markTerrain(terrain, wallPositions, 'impassable');
  markTerrain(terrain, difficultPositions, 'difficult');

  const features = [];
  if (wallPositions.length > 0) {
    features.push({
      name: 'Imported Walls',
      type: 'wall',
      positions: wallPositions,
      description: 'Generated from Foundry wall segments',
    });
  }
  if (difficultPositions.length > 0) {
    features.push({
      name: 'Imported Drawings',
      type: 'difficult-terrain',
      positions: difficultPositions,
      description: 'Generated from Foundry drawing rectangles',
    });
  }

  const startingZones = defaultStartingZones(width, height);
  const theme = inferTheme(sceneName);
  const tags = inferTags(sceneName, theme);
  const mapSlug = slugify(sceneId) || `scene-${index + 1}`;
  const imageUrl = resolveBackgroundImage(scene, foundryDataDir, mapSlug);

  const result = {
    id: `foundry-${mapSlug}`,
    name: sceneName,
    theme,
    subTheme: mapSlug,
    description: `Imported from Foundry scene export: ${sceneName}`,
    width,
    height,
    terrain,
    startingZones,
    features,
    tags,
  };
  if (imageUrl) result.imageUrl = imageUrl;
  return result;
}

function extractScenes(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.scenes)) return input.scenes;
  if (Array.isArray(input?.documents)) return input.documents.filter((d) => d?.name && d?.width && d?.height);
  if (input && typeof input === 'object' && input.name && input.width && input.height) return [input];
  return [];
}

function run() {
  const { input, output, foundryDataDir } = parseArgs(process.argv);
  const source = readJson(input);
  const scenes = extractScenes(source);
  if (scenes.length === 0) {
    fail('No scenes found in input JSON. Expected an array of scenes or an object with a scenes array.');
  }

  const maps = scenes.map((scene, index) => normalizeScene(scene, index, foundryDataDir));
  maps.sort((a, b) => a.id.localeCompare(b.id));

  const payload = { maps };
  const outputFile = path.isAbsolute(output) ? output : path.join(ROOT, output);
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));

  console.log(`[foundry-scenes:convert] Converted ${maps.length} scene(s)`);
  console.log(`[foundry-scenes:convert] Wrote ${path.relative(ROOT, outputFile).replace(/\\/g, '/')}`);
}

if (require.main === module) {
  run();
}

module.exports = { run };
