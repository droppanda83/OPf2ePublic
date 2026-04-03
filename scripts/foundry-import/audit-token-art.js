/**
 * Token Art Audit Script — Analyzes art coverage across the bestiary.
 * 
 * Run via: node scripts/foundry-import/audit-token-art.js
 * 
 * Reports:
 *   - Total creatures with/without specific art
 *   - Breakdown by creature type (humanoid, undead, beast, etc.)
 *   - NPC/humanoid coverage detail
 *   - Missing art by level range
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BESTIARY_SOURCE = path.join(__dirname, 'source', 'bestiary.source.json');
const TOKEN_DIR = path.join(ROOT, 'frontend', 'public', 'art', 'tokens');
const SVG_TOKEN_DIR = path.join(ROOT, 'frontend', 'public', 'tokens');

// ─── Load the PF2E_CREATURE_ART_PATHS and FA_CREATURE_TOKENS from tokenArt.ts ─
// We'll parse them manually since this is a CJS script and tokenArt.ts is ESM/TS
// Instead, we read the TS source and extract the keys

function extractMapKeys(filePath, varName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  // Match patterns like:  'Creature Name': {
  //   or  'creature-id': 'path',
  const regex = new RegExp(`(?:^|\\n)\\s+'([^']+)'\\s*:`, 'g');
  
  // Find the variable declaration
  const varStart = content.indexOf(`${varName}`);
  if (varStart === -1) return keys;
  
  // Find the opening brace
  const braceStart = content.indexOf('{', varStart);
  if (braceStart === -1) return keys;
  
  // Find matching closing brace
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) { braceEnd = i; break; }
    }
  }
  if (braceEnd === -1) return keys;
  
  const section = content.substring(braceStart, braceEnd + 1);
  
  // Extract top-level keys (lines with key: { or key: 'value')
  const keyRegex = /^\s+'([^']+)'\s*:/gm;
  let match;
  // We need to only get the top-level keys, not nested ones
  // Top-level keys are at 2-space indent, nested are at 4+
  const lines = section.split('\n');
  for (const line of lines) {
    const m = line.match(/^  '([^']+)'\s*:/);
    if (m) keys.push(m[1]);
  }
  
  return keys;
}

function normalizeId(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           TOKEN ART COVERAGE AUDIT                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Load bestiary
  if (!fs.existsSync(BESTIARY_SOURCE)) {
    console.error('ERROR: bestiary.source.json not found');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(BESTIARY_SOURCE, 'utf8'));
  const bestiary = raw.creatures || raw; // Handle {creatures:[...]} or plain array
  if (!Array.isArray(bestiary)) {
    console.error('ERROR: Could not find creatures array in bestiary source');
    process.exit(1);
  }
  console.log(`Bestiary: ${bestiary.length} creatures loaded\n`);

  // Load art catalog keys from tokenArt.ts
  const tokenArtPath = path.join(ROOT, 'shared', 'tokenArt.ts');
  const pf2eArtCreatures = extractMapKeys(tokenArtPath, 'PF2E_CREATURE_ART_PATHS');
  const faTokenCreatures = extractMapKeys(tokenArtPath, 'FA_CREATURE_TOKENS');
  
  const pf2eArtSet = new Set(pf2eArtCreatures.map(n => n.toLowerCase()));
  const faArtSet = new Set(faTokenCreatures); // Already lowercase hyphenated

  // Check for actual downloaded files
  const downloadedTokens = new Set();
  if (fs.existsSync(TOKEN_DIR)) {
    for (const f of fs.readdirSync(TOKEN_DIR)) {
      if (/\.(webp|png|jpg)$/i.test(f)) {
        downloadedTokens.add(path.basename(f, path.extname(f)));
      }
    }
  }

  // Check SVG fallback tokens
  const svgTokens = new Set();
  if (fs.existsSync(SVG_TOKEN_DIR)) {
    for (const f of fs.readdirSync(SVG_TOKEN_DIR)) {
      if (f.endsWith('.svg')) {
        svgTokens.add(path.basename(f, '.svg'));
      }
    }
  }

  // ─── Categorize each creature ──────────────────────
  const withPf2eArt = [];
  const withFAArt = [];
  const withDownloaded = [];
  const svgFallbackOnly = [];
  const noArtAtAll = [];

  // Tag-based grouping
  const byTag = {};        // tag -> { total, withArt, missing[] }
  const byLevel = {};      // level -> { total, withArt, missingCount }
  const npcDetails = [];   // All humanoid/NPC creatures with their art status

  for (const creature of bestiary) {
    const name = creature.name;
    const id = normalizeId(name);
    const tags = creature.tags || [];
    const level = creature.level;

    let artStatus = 'none';
    let artSource = 'svg-fallback';

    // Check sources in priority order
    if (downloadedTokens.has(id)) {
      artStatus = 'downloaded';
      artSource = 'downloaded-file';
      withDownloaded.push(name);
    } else if (pf2eArtSet.has(name.toLowerCase())) {
      artStatus = 'pf2e-catalog';
      artSource = 'pf2e-foundry';
      withPf2eArt.push(name);
    } else if (faArtSet.has(id)) {
      artStatus = 'fa-catalog';
      artSource = 'forgotten-adventures';
      withFAArt.push(name);
    } else {
      // Check if tags map to an SVG
      const primaryTag = tags[0]?.toLowerCase() || '';
      if (svgTokens.has(primaryTag)) {
        artStatus = 'svg-fallback';
        artSource = `svg:${primaryTag}`;
        svgFallbackOnly.push(name);
      } else {
        artStatus = 'none';
        artSource = 'default.svg';
        noArtAtAll.push(name);
      }
    }

    // Track by tag
    for (const tag of tags) {
      if (!byTag[tag]) byTag[tag] = { total: 0, withSpecificArt: 0, svgFallback: 0, missing: [] };
      byTag[tag].total++;
      if (artStatus === 'downloaded' || artStatus === 'pf2e-catalog' || artStatus === 'fa-catalog') {
        byTag[tag].withSpecificArt++;
      } else if (artStatus === 'svg-fallback') {
        byTag[tag].svgFallback++;
      } else {
        byTag[tag].missing.push(name);
      }
    }

    // Track by level
    const lvKey = level;
    if (!byLevel[lvKey]) byLevel[lvKey] = { total: 0, withArt: 0, missingCount: 0 };
    byLevel[lvKey].total++;
    if (artStatus === 'downloaded' || artStatus === 'pf2e-catalog' || artStatus === 'fa-catalog') {
      byLevel[lvKey].withArt++;
    } else {
      byLevel[lvKey].missingCount++;
    }

    // NPC / Humanoid detail
    if (tags.includes('humanoid') || tags.includes('human') || tags.some(t => 
        ['elf', 'dwarf', 'halfling', 'gnome', 'orc', 'goblin', 'hobgoblin', 'kobold', 'drow', 'fetchling', 'catfolk', 'ratfolk', 'tengu', 'grippli', 'lizardfolk', 'gnoll', 'bugbear', 'azarketi', 'hryngar', 'caligni', 'grioth', 'duergar', 'deep-one'].includes(t)
    )) {
      npcDetails.push({ name, level, tags, artStatus, artSource });
    }
  }

  // ─── Report: Overall Summary ───────────────────────
  const totalWithSpecific = withDownloaded.length + withPf2eArt.length + withFAArt.length;
  
  console.log('────────────── OVERALL COVERAGE ──────────────────');
  console.log(`  Total creatures:         ${bestiary.length}`);
  console.log(`  With specific art:       ${totalWithSpecific} (${pct(totalWithSpecific, bestiary.length)})`);
  console.log(`    Downloaded files:      ${withDownloaded.length}`);
  console.log(`    PF2e catalog mapped:   ${withPf2eArt.length}`);
  console.log(`    F.A. catalog mapped:   ${withFAArt.length}`);
  console.log(`  SVG type fallback only:  ${svgFallbackOnly.length} (${pct(svgFallbackOnly.length, bestiary.length)})`);
  console.log(`  No art at all:           ${noArtAtAll.length}`);
  console.log(`  SVG token types avail:   ${svgTokens.size} (${[...svgTokens].join(', ')})`);
  console.log('');

  // ─── Report: By Creature Type ──────────────────────
  console.log('────────────── COVERAGE BY CREATURE TYPE ─────────');
  console.log(padR('Type', 20) + padR('Total', 8) + padR('Art', 8) + padR('SVG', 8) + padR('None', 8) + 'Coverage');
  console.log('─'.repeat(70));
  
  const sortedTags = Object.entries(byTag).sort((a, b) => b[1].total - a[1].total);
  for (const [tag, data] of sortedTags) {
    const none = data.total - data.withSpecificArt - data.svgFallback;
    console.log(
      padR(tag, 20) +
      padR(String(data.total), 8) +
      padR(String(data.withSpecificArt), 8) +
      padR(String(data.svgFallback), 8) +
      padR(String(none), 8) +
      pct(data.withSpecificArt, data.total)
    );
  }
  console.log('');

  // ─── Report: NPC / Humanoid Detail ─────────────────
  console.log('────────────── NPC / HUMANOID ART STATUS ─────────');
  const npcsWithArt = npcDetails.filter(n => n.artStatus !== 'svg-fallback' && n.artStatus !== 'none');
  const npcsWithSvg = npcDetails.filter(n => n.artStatus === 'svg-fallback');
  const npcsNoArt = npcDetails.filter(n => n.artStatus === 'none');
  
  console.log(`  Total humanoid/NPC creatures: ${npcDetails.length}`);
  console.log(`  With specific art:            ${npcsWithArt.length} (${pct(npcsWithArt.length, npcDetails.length)})`);
  console.log(`  SVG "humanoid" fallback:      ${npcsWithSvg.length}`);
  console.log(`  No art at all:                ${npcsNoArt.length}`);
  console.log('');
  
  if (npcsWithArt.length > 0) {
    console.log('  ✓ NPCs WITH specific art:');
    for (const npc of npcsWithArt.sort((a, b) => a.level - b.level)) {
      console.log(`    Lv${padR(String(npc.level), 4)} ${padR(npc.name, 35)} [${npc.artSource}]`);
    }
    console.log('');
  }

  console.log('  ✗ NPCs MISSING specific art (using generic humanoid SVG):');
  const missingNpcs = [...npcsWithSvg, ...npcsNoArt].sort((a, b) => a.level - b.level);
  for (const npc of missingNpcs) {
    console.log(`    Lv${padR(String(npc.level), 4)} ${padR(npc.name, 35)} tags: [${npc.tags.join(', ')}]`);
  }
  console.log('');

  // ─── Report: Coverage by Level Range ───────────────
  console.log('────────────── COVERAGE BY LEVEL ─────────────────');
  console.log(padR('Level', 10) + padR('Total', 8) + padR('Art', 8) + padR('Missing', 8) + 'Coverage');
  console.log('─'.repeat(50));
  
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
  for (const lv of levels) {
    const d = byLevel[lv];
    console.log(
      padR(String(lv), 10) +
      padR(String(d.total), 8) +
      padR(String(d.withArt), 8) +
      padR(String(d.missingCount), 8) +
      pct(d.withArt, d.total)
    );
  }
  console.log('');

  // ─── Report: Most-Needed Art (high-frequency creatures) ────
  console.log('────────────── TOP PRIORITY MISSING ART ──────────');
  console.log('(Common encounter creatures without specific art)\n');
  
  // Priority: low-level creatures players will encounter most often
  const priorityMissing = [...svgFallbackOnly, ...noArtAtAll]
    .map(name => {
      const entry = bestiary.find(b => b.name === name);
      return { name, level: entry?.level ?? 99, tags: entry?.tags || [] };
    })
    .filter(c => c.level >= -1 && c.level <= 10)  // Focus on common encounter levels
    .sort((a, b) => a.level - b.level);

  if (priorityMissing.length > 0) {
    for (const c of priorityMissing.slice(0, 60)) {
      console.log(`  Lv${padR(String(c.level), 4)} ${padR(c.name, 35)} [${c.tags.join(', ')}]`);
    }
    if (priorityMissing.length > 60) {
      console.log(`  ... and ${priorityMissing.length - 60} more at level 0-10`);
    }
  }
  console.log('');

  // ─── Portrait Art Status ───────────────────────────
  console.log('────────────── PORTRAIT ART STATUS ───────────────');
  console.log('  Portrait-specific art:     0 (no portraits in catalog yet)');
  console.log('  All creatures fall back to their token art for portraits.');
  console.log('');
}

function pct(n, total) {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function padR(str, len) {
  return str.padEnd(len);
}

run();
