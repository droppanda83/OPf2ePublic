const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_FILE = path.join(__dirname, 'source', 'maps.source.json');
const OUTPUT_FILE = path.join(ROOT, 'shared', 'foundryEncounterMaps.ts');
const REPORT_FILE = path.join(__dirname, 'generated', 'maps-import-report.json');

const VALID_THEMES = new Set(['dungeon', 'wilderness', 'urban', 'indoor', 'special']);
const VALID_TILE_TYPES = new Set(['empty', 'difficult', 'impassable', 'water', 'lava', 'pit', 'elevation', 'cover', 'hazard']);
const VALID_FEATURE_TYPES = new Set(['wall', 'difficult-terrain', 'cover', 'elevation', 'hazard', 'door', 'trap', 'water', 'lava', 'pit']);

function fail(message) {
  throw new Error(`[foundry-import:maps] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function readSource() {
  if (!fs.existsSync(SOURCE_FILE)) {
    fail(`Source file missing: ${SOURCE_FILE}`);
  }
  const raw = fs.readFileSync(SOURCE_FILE, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function buildEmptyTerrain(width, height) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({ x, y, type: 'empty' });
    }
    grid.push(row);
  }
  return grid;
}

function normalizeTerrain(map) {
  const width = Number(map.width);
  const height = Number(map.height);
  const empty = buildEmptyTerrain(width, height);

  if (!Array.isArray(map.terrain) || map.terrain.length === 0) {
    return empty;
  }

  const terrain = map.terrain;

  // Shape A: TerrainTile[][] where each tile has x/y/type
  const firstTile = terrain[0]?.[0];
  if (Array.isArray(terrain[0]) && firstTile && typeof firstTile === 'object' && 'type' in firstTile) {
    return terrain.map((row, y) => {
      assert(Array.isArray(row), `Map '${map.id}' terrain row ${y} is not an array`);
      assert(row.length === width, `Map '${map.id}' terrain row ${y} width mismatch`);
      return row.map((tile, x) => {
        const type = String(tile?.type || 'empty');
        assert(VALID_TILE_TYPES.has(type), `Map '${map.id}' terrain tile type '${type}' at ${x},${y} is invalid`);
        return { x, y, type };
      });
    });
  }

  // Shape B: string[][] of tile types
  if (Array.isArray(terrain[0]) && typeof terrain[0][0] === 'string') {
    return terrain.map((row, y) => {
      assert(Array.isArray(row), `Map '${map.id}' terrain row ${y} is not an array`);
      assert(row.length === width, `Map '${map.id}' terrain row ${y} width mismatch`);
      return row.map((cell, x) => {
        const type = String(cell || 'empty');
        assert(VALID_TILE_TYPES.has(type), `Map '${map.id}' terrain tile type '${type}' at ${x},${y} is invalid`);
        return { x, y, type };
      });
    });
  }

  fail(`Map '${map.id}' has unsupported terrain shape`);
}

function normalizePositions(rawPositions, context) {
  assert(Array.isArray(rawPositions), `${context} must be an array`);
  return rawPositions.map((pos, index) => {
    const x = Number(pos?.x);
    const y = Number(pos?.y);
    assert(Number.isInteger(x) && x >= 0, `${context}[${index}] invalid x`);
    assert(Number.isInteger(y) && y >= 0, `${context}[${index}] invalid y`);
    return { x, y };
  });
}

function normalizeMap(rawMap, index, seenIds) {
  const id = String(rawMap?.id || '').trim();
  const name = String(rawMap?.name || '').trim();
  const theme = String(rawMap?.theme || '').trim();
  const subTheme = String(rawMap?.subTheme || '').trim();
  const description = String(rawMap?.description || '').trim();
  const width = Number(rawMap?.width);
  const height = Number(rawMap?.height);

  assert(id.length > 0, `Map[${index}] missing id`);
  assert(!seenIds.has(id), `Duplicate map id '${id}'`);
  seenIds.add(id);

  assert(name.length > 0, `Map '${id}' missing name`);
  assert(VALID_THEMES.has(theme), `Map '${id}' invalid theme '${theme}'`);
  assert(subTheme.length > 0, `Map '${id}' missing subTheme`);
  assert(description.length > 0, `Map '${id}' missing description`);
  assert(Number.isInteger(width) && width > 0, `Map '${id}' invalid width '${rawMap?.width}'`);
  assert(Number.isInteger(height) && height > 0, `Map '${id}' invalid height '${rawMap?.height}'`);

  const terrain = normalizeTerrain({ ...rawMap, id, width, height });

  const startingZones = rawMap?.startingZones || {};
  const players = normalizePositions(startingZones.players || [], `Map '${id}' startingZones.players`);
  const enemies = normalizePositions(startingZones.enemies || [], `Map '${id}' startingZones.enemies`);

  const features = Array.isArray(rawMap?.features) ? rawMap.features.map((feature, featureIndex) => {
    const featureName = String(feature?.name || '').trim();
    const featureType = String(feature?.type || '').trim();
    assert(featureName.length > 0, `Map '${id}' feature[${featureIndex}] missing name`);
    assert(VALID_FEATURE_TYPES.has(featureType), `Map '${id}' feature '${featureName}' invalid type '${featureType}'`);
    const positions = normalizePositions(feature?.positions || [], `Map '${id}' feature '${featureName}' positions`);
    const out = {
      name: featureName,
      type: featureType,
      positions,
    };
    const descriptionText = typeof feature?.description === 'string' ? feature.description.trim() : '';
    if (descriptionText.length > 0) {
      out.description = descriptionText;
    }
    return out;
  }) : [];

  return {
    id,
    name,
    theme,
    subTheme,
    description,
    width,
    height,
    terrain,
    startingZones: { players, enemies },
    features,
    imageUrl: typeof rawMap?.imageUrl === 'string' && rawMap.imageUrl.trim() ? rawMap.imageUrl.trim() : undefined,
    tags: Array.isArray(rawMap?.tags) ? rawMap.tags.map(t => String(t).trim()).filter(Boolean) : undefined,
  };
}

function renderMap(map) {
  const terrainRows = map.terrain.map((row) => {
    const rowTiles = row.map((tile) => `{ x: ${tile.x}, y: ${tile.y}, type: '${tile.type}' }`).join(', ');
    return `      [${rowTiles}],`;
  }).join('\n');

  const renderPositions = (positions) => positions.map((p) => `{ x: ${p.x}, y: ${p.y} }`).join(', ');

  const features = map.features.map((feature) => {
    const positions = feature.positions.map((p) => `{ x: ${p.x}, y: ${p.y} }`).join(', ');
    const description = feature.description ? `, description: '${esc(feature.description)}'` : '';
    return `      { name: '${esc(feature.name)}', type: '${feature.type}', positions: [${positions}]${description} },`;
  }).join('\n');

  return `  {
    id: '${esc(map.id)}',
    name: '${esc(map.name)}',
    theme: '${map.theme}',
    subTheme: '${esc(map.subTheme)}',
    description: '${esc(map.description)}',
    width: ${map.width},
    height: ${map.height},
    terrain: [
${terrainRows}
    ],
    startingZones: {
      players: [${renderPositions(map.startingZones.players)}],
      enemies: [${renderPositions(map.startingZones.enemies)}],
    },
    features: [
${features}
    ],${map.imageUrl ? `
    imageUrl: '${esc(map.imageUrl)}',` : ''}${map.tags && map.tags.length > 0 ? `
    tags: [${map.tags.map(t => `'${esc(t)}'`).join(', ')}],` : ''}
  }`;
}

function renderOutput(maps) {
  const body = maps.map(renderMap).join(',\n\n');
  return `/**
 * Foundry map definitions for PF2e Rebirth
 *
 * AUTO-GENERATED by scripts/foundry-import/import-maps.js
 * Source: scripts/foundry-import/source/maps.source.json
 * Do not edit this file manually; rerun npm run import:foundry.
 */

import { EncounterMapTemplate } from './types';

export const FOUNDRY_MAP_CATALOG: EncounterMapTemplate[] = [
${body}
];
`;
}

function writeReport(maps) {
  const themeCounts = maps.reduce((acc, map) => {
    acc[map.theme] = (acc[map.theme] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(ROOT, SOURCE_FILE).replace(/\\/g, '/'),
    outputFile: path.relative(ROOT, OUTPUT_FILE).replace(/\\/g, '/'),
    mapCount: maps.length,
    themeCounts,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  return report;
}

function run() {
  const source = readSource();
  const inputMaps = Array.isArray(source?.maps) ? source.maps : [];

  const seenIds = new Set();
  const maps = inputMaps.map((map, index) => normalizeMap(map, index, seenIds));
  maps.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(OUTPUT_FILE, renderOutput(maps));
  const report = writeReport(maps);

  console.log(`[foundry-import] Imported ${report.mapCount} maps into shared/foundryEncounterMaps.ts`);
  console.log('[foundry-import] Map themes:', report.themeCounts);
}

if (require.main === module) {
  run();
}

module.exports = { run };
