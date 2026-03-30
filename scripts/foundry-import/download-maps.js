/**
 * Download free battle maps from Dice Grimorium
 * https://dicegrimorium.com/free-rpg-map-library/
 *
 * Usage:
 *   node scripts/foundry-import/download-maps.js [--all]
 *
 * Downloads free ZIP files, extracts map images to frontend/public/maps/,
 * and generates a maps.source.json ready for the import pipeline.
 *
 * By default downloads a curated test set of ~15 diverse maps.
 * Use --all to download all 351 maps from the library.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MAPS_DIR = path.join(ROOT, 'frontend', 'public', 'maps');
const ZIPS_DIR = path.join(ROOT, 'temp', 'map-zips');
const SOURCE_FILE = path.join(__dirname, 'source', 'maps.source.json');

// ─── Curated test set: 15 diverse maps covering all themes ───

const CURATED_MAPS = [
  // Dungeon / Cave
  { slug: 'large-cave', name: 'Large Cave', pascalName: 'LargeCave' },
  { slug: 'dragon-lair', name: 'Dragon Lair', pascalName: 'DragonLair' },
  { slug: 'ancient-crypt-dungeon', name: 'Ancient Crypt Dungeon', pascalName: 'AncientCryptDungeon' },
  { slug: 'treasure-cave', name: 'Treasure Cave', pascalName: 'TreasureCave' },
  // Wilderness
  { slug: 'forest-path', name: 'Forest Path', pascalName: 'ForestPath' },
  { slug: 'mountain-pass', name: 'Mountain Pass', pascalName: 'MountainPass' },
  { slug: 'swamp-path', name: 'Swamp Path', pascalName: 'SwampPath' },
  { slug: 'desert-path', name: 'Desert Path', pascalName: 'DesertPath' },
  { slug: 'river-crossing', name: 'River Crossing', pascalName: 'RiverCrossing' },
  // Indoor
  { slug: 'sacred-cathedral', name: 'Sacred Cathedral', pascalName: 'SacredCathedral' },
  { slug: 'sleeping-dwarf-inn', name: 'Sleeping Dwarf Inn', pascalName: 'SleepingDwarfInn' },
  { slug: 'old-library', name: 'Old Library', pascalName: 'OldLibrary' },
  // Urban
  { slug: 'city-streets', name: 'City Streets', pascalName: 'CityStreets' },
  { slug: 'city-gates', name: 'City Gates', pascalName: 'CityGates' },
  // Special
  { slug: 'ice-dragon-cave', name: 'Ice Dragon Cave', pascalName: 'IceDragonCave' },
];

// ─── HTTP helpers ────────────────────────────────────────────

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    };
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'PF2eRebirth-MapDownloader/1.0' } }, handler).on('error', reject);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
      res.on('error', reject);
    };
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'PF2eRebirth-MapDownloader/1.0' } }, handler).on('error', reject);
  });
}

// ─── Scraping (used in --all mode) ──────────────────────────

function extractMapPageUrls(html) {
  const regex = /href="(https:\/\/dicegrimorium\.com\/[a-z0-9-]+-(?:dnd|battle)-(?:battle-)?map\/?)"[^>]*>/gi;
  const urls = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.add(match[1].replace(/\/$/, ''));
  }
  return [...urls];
}

function extractFreeZipUrl(html) {
  const patterns = [
    /href="(https?:\/\/dicegrimorium\.com\/files\/[^"]+Public\.zip)"/i,
    /href="(\/files\/[^"]+Public\.zip)"/i,
    /href="(https?:\/\/dicegrimorium\.com\/files\/[^"]+\.zip)"/i,
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const url = m[1].startsWith('/') ? `https://dicegrimorium.com${m[1]}` : m[1];
      return url;
    }
  }
  return null;
}

function extractMapName(html) {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^<|–]+)/i);
  return m ? m[1].trim() : null;
}

/** Convert slug to PascalCase for ZIP URL generation */
function slugToPascalName(slug) {
  return slug
    .replace(/-dnd-battle-map$/, '')
    .split('-')
    .map(w => {
      // Handle "vol" + number: "vol-2" → "Vol2"
      if (/^\d+$/.test(w)) return w; // bare number stays
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join('');
}

// ─── Theme inference ─────────────────────────────────────────

function inferTheme(name) {
  const text = name.toLowerCase();
  if (/(dungeon|crypt|catacomb|cave|vault|sewer|temple|tomb|lair|mine)/.test(text)) return 'dungeon';
  if (/(forest|swamp|mountain|river|wilderness|grove|jungle|camp|path|field|lake|pond|beach|desert|snow|ice|volcanic|waterfall|cliff|island|oasis)/.test(text)) return 'wilderness';
  if (/(street|city|town|market|dock|rooftop|alley|plaza|gate|bridge|harbor|port|village)/.test(text)) return 'urban';
  if (/(manor|inn|hall|library|tower|house|palace|room|interior|tavern|cathedral|church|chapel|shrine|throne|treasury|prison|courtyard|garden)/.test(text)) return 'indoor';
  return 'special';
}

function inferSubTheme(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-?vol(?:ume)?-?\d+/g, '')
    .replace(/-?d-?n-?d-?/g, '')
    .replace(/-?battle-?map-?/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'generic';
}

function inferTags(name, theme) {
  const text = name.toLowerCase();
  const tags = [theme];
  const tagPatterns = [
    [/(dark|shadow|dim|night)/, 'dark'],
    [/(narrow|corridor|passage|tunnel)/, 'narrow'],
    [/(underground|under|below|depth)/, 'underground'],
    [/(open|wide|field|clearing)/, 'open'],
    [/(water|river|lake|pond|stream|ocean|flood)/, 'water'],
    [/(fire|lava|flame|burning|volcanic)/, 'fire'],
    [/(ice|frozen|cold|frost|snow|winter|snowy)/, 'ice'],
    [/(throne|king|queen|royal|court)/, 'royal'],
    [/(ruin|ancient|crumbl|decay|abandon|corrupt)/, 'ruins'],
    [/(bridge|crossing)/, 'bridge'],
    [/(ship|boat|dock|pier|harbor|port)/, 'nautical'],
    [/(arena|pit|colosseum|gladiator)/, 'arena'],
    [/(garden|hedge|grove|druid)/, 'nature'],
    [/(tavern|inn|bar|pub)/, 'tavern'],
    [/(market|shop|bazaar|store)/, 'market'],
    [/(cemetery|grave|tomb|burial|crypt)/, 'graves'],
    [/(forest|tree|wood)/, 'forest'],
    [/(mountain|hill|cliff|pass|ridge|peak)/, 'mountain'],
    [/(swamp|bog|marsh|mire)/, 'swamp'],
    [/(cave|cavern|grotto)/, 'cave'],
    [/(library|book|scroll|study)/, 'library'],
    [/(temple|shrine|altar|chapel|holy|sacred|cathedral)/, 'temple'],
    [/(tower|spire|wizard|mage|watchtower)/, 'tower'],
    [/(street|alley|plaza|road|gate)/, 'street'],
    [/(rooftop|roof|above)/, 'rooftop'],
    [/(manor|hall|mansion|noble|estate)/, 'manor'],
    [/(desert|sand|dune|oasis)/, 'desert'],
    [/(beach|coast|shore|island)/, 'coastal'],
    [/(dragon)/, 'dragon'],
    [/(prison|dungeon|cell|jail)/, 'prison'],
    [/(sewer|drain)/, 'sewer'],
    [/(camp|tent|caravan)/, 'camp'],
    [/(path|road|trail)/, 'path'],
    [/(treasure|treasury|vault|hoard)/, 'treasure'],
    [/(labyrinth|maze)/, 'maze'],
  ];
  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(text)) tags.push(tag);
  }
  return [...new Set(tags)];
}

// ─── ZIP extraction ──────────────────────────────────────────

function extractZip(zipPath, outDir) {
  // Use PowerShell Expand-Archive on Windows
  try {
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir}' -Force"`,
      { stdio: 'pipe', timeout: 30000 }
    );
    return true;
  } catch (e) {
    console.warn(`  ⚠ Failed to extract ${path.basename(zipPath)}: ${e.message}`);
    return false;
  }
}

function findImageInDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const imageFiles = [];
  for (const f of files) {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory()) {
      const nested = findImageInDir(fullPath);
      if (nested) imageFiles.push(nested);
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
      // Skip promo collages and macOS resource fork files
      if (/^promo\./i.test(f.name) || f.name.startsWith('._')) continue;
      const stats = fs.statSync(fullPath);
      imageFiles.push({ path: fullPath, size: stats.size, name: f.name });
    }
  }
  if (imageFiles.length === 0) return null;
  // Return the largest non-promo image (highest resolution actual map)
  imageFiles.sort((a, b) => b.size - a.size);
  return imageFiles[0];
}

// ─── Main ────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build the download list.
 * In curated mode: use hardcoded list with known ZIP URLs.
 * In --all mode: scrape the library page for all map URLs, then visit each page.
 */
async function buildDownloadList(useAll) {
  if (!useAll) {
    // Curated mode: known maps with predictable ZIP URLs
    console.log(`[map-download] Using curated set of ${CURATED_MAPS.length} maps`);
    return CURATED_MAPS.map(m => ({
      slug: m.slug,
      name: m.name,
      zipUrl: `https://dicegrimorium.com/files/${m.pascalName}Public.zip`,
    }));
  }

  // --all mode: scrape
  console.log('[map-download] Fetching full map library (--all mode)...');
  const libraryHtml = await fetchPage('https://dicegrimorium.com/free-rpg-map-library/');
  const mapPageUrls = extractMapPageUrls(libraryHtml);
  console.log(`[map-download] Found ${mapPageUrls.length} map pages to scrape`);

  const downloads = [];
  for (let i = 0; i < mapPageUrls.length; i++) {
    const pageUrl = mapPageUrls[i];
    const slug = pageUrl.replace('https://dicegrimorium.com/', '').replace(/\/$/, '');
    if (i > 0) await sleep(300);
    try {
      const pageHtml = await fetchPage(pageUrl);
      const name = extractMapName(pageHtml) || slug;
      const zipUrl = extractFreeZipUrl(pageHtml);
      if (zipUrl) {
        downloads.push({ slug, name, zipUrl });
        console.log(`  [${i + 1}/${mapPageUrls.length}] ${name}`);
      } else {
        console.log(`  [${i + 1}/${mapPageUrls.length}] ⚠ No ZIP: ${slug}`);
      }
    } catch (err) {
      console.log(`  [${i + 1}/${mapPageUrls.length}] ❌ ${slug}: ${err.message}`);
    }
  }
  return downloads;
}

async function run() {
  const useAll = process.argv.includes('--all');

  // Ensure directories exist
  fs.mkdirSync(MAPS_DIR, { recursive: true });
  fs.mkdirSync(ZIPS_DIR, { recursive: true });

  const downloads = await buildDownloadList(useAll);
  console.log(`\n[map-download] Downloading ${downloads.length} maps...\n`);

  const results = [];
  const errors = [];

  for (let i = 0; i < downloads.length; i++) {
    const { slug, name, zipUrl } = downloads[i];
    console.log(`[${i + 1}/${downloads.length}] ${name}`);

    try {
      // Download the ZIP
      const zipFilename = path.basename(zipUrl);
      const zipPath = path.join(ZIPS_DIR, zipFilename);

      if (!fs.existsSync(zipPath)) {
        console.log(`  Downloading ${zipFilename}...`);
        await downloadFile(zipUrl, zipPath);
        await sleep(300); // Rate limit
      } else {
        console.log(`  ZIP cached: ${zipFilename}`);
      }

      // Verify the downloaded file is actually a ZIP (check magic bytes)
      const header = Buffer.alloc(4);
      const fd = fs.openSync(zipPath, 'r');
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      if (header[0] !== 0x50 || header[1] !== 0x4B) {
        console.log(`  ⚠ Not a valid ZIP file, skipping`);
        fs.unlinkSync(zipPath);
        errors.push({ slug, error: 'Invalid ZIP (possibly 404 HTML page)' });
        continue;
      }

      // Extract the ZIP
      const extractDir = path.join(ZIPS_DIR, zipFilename.replace('.zip', ''));
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }
      if (!extractZip(zipPath, extractDir)) {
        errors.push({ slug, error: 'ZIP extraction failed' });
        continue;
      }

      // Find the best image
      const imageInfo = findImageInDir(extractDir);
      if (!imageInfo) {
        console.log(`  ⚠ No image found in ZIP`);
        errors.push({ slug, error: 'No image in ZIP' });
        continue;
      }

      // Copy image to maps directory with a clean name
      const mapSlug = slugify(name);
      const ext = path.extname(imageInfo.name).toLowerCase();
      const destFilename = `${mapSlug}${ext}`;
      const destPath = path.join(MAPS_DIR, destFilename);
      fs.copyFileSync(imageInfo.path, destPath);
      console.log(`  ✅ → ${destFilename} (${(imageInfo.size / 1024).toFixed(0)} KB)`);

      // Build map entry
      const theme = inferTheme(name);
      const tags = inferTags(name, theme);

      results.push({
        id: `dg-${mapSlug}`,
        name,
        theme,
        subTheme: inferSubTheme(name),
        description: `${name} — Free battle map by Dice Grimorium`,
        width: 30,
        height: 20,
        terrain: [],
        startingZones: {
          players: [
            { x: 1, y: 9 }, { x: 1, y: 10 }, { x: 2, y: 9 }, { x: 2, y: 10 },
          ],
          enemies: [
            { x: 28, y: 9 }, { x: 28, y: 10 }, { x: 27, y: 9 }, { x: 27, y: 10 },
          ],
        },
        features: [],
        imageUrl: destFilename,
        tags,
      });

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      errors.push({ slug, error: err.message });
    }
  }

  // Write maps.source.json
  const payload = { maps: results };
  fs.writeFileSync(SOURCE_FILE, JSON.stringify(payload, null, 2));
  console.log(`\n[map-download] ════════════════════════════════════════`);
  console.log(`[map-download] Downloaded: ${results.length} maps`);
  console.log(`[map-download] Errors: ${errors.length}`);
  console.log(`[map-download] Source file: ${path.relative(ROOT, SOURCE_FILE)}`);
  console.log(`[map-download] Images in: ${path.relative(ROOT, MAPS_DIR)}`);

  if (errors.length > 0) {
    console.log(`\n[map-download] Failed maps:`);
    for (const e of errors) {
      console.log(`  - ${e.slug}: ${e.error}`);
    }
  }

  console.log(`\n[map-download] Next step: run 'node scripts/foundry-import/import-maps.js' to generate TypeScript catalog`);
}

run().catch((err) => {
  console.error(`[map-download] Fatal error: ${err.message}`);
  process.exit(1);
});
