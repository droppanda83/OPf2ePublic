/**
 * Spell import script — transforms spells.source.json → shared/spells.ts
 *
 * Part of the Foundry VTT Data Pipeline (Phase 13).
 * Run via: npm run import:foundry
 *
 * Generates the full spells.ts file including type definitions,
 * the SPELL_CATALOG record, and utility functions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_FILE = path.join(__dirname, 'source', 'spells.source.json');
const OUTPUT_FILE = path.join(ROOT, 'shared', 'spells.ts');
const REPORT_FILE = path.join(__dirname, 'generated', 'spells-import-report.json');

const VALID_DAMAGE_TYPES = new Set([
  'bludgeoning', 'piercing', 'slashing', 'bleed',
  'fire', 'cold', 'electricity', 'sonic', 'acid',
  'vitality', 'void', 'spirit',
  'poison', 'mental', 'force', 'precision', 'negative',
]);

const VALID_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal']);
const VALID_TARGET_TYPES = new Set(['single', 'aoe']);
const VALID_SAVE_TYPES = new Set(['reflex', 'fortitude', 'will']);
const VALID_AOE_SHAPES = new Set(['burst', 'emanation', 'cone', 'line']);
const VALID_HEIGHTENING_TYPES = new Set(['interval', 'fixed']);
const VALID_PERSISTENT_CHANCES = new Set(['always', 'critical-failure', 'failure']);

function fail(message) {
  throw new Error(`[foundry-import:spells] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readSource() {
  if (!fs.existsSync(SOURCE_FILE)) {
    fail(`Source file missing: ${SOURCE_FILE}`);
  }
  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  return JSON.parse(raw);
}

function validateSpell(s, index) {
  const ctx = `Spell[${index}] "${s.name || s.id || '?'}"`;

  // Required fields
  const required = ['id', 'name', 'rank', 'traditions', 'cost', 'range', 'description', 'icon', 'targetType'];
  for (const field of required) {
    assert(s[field] !== undefined && s[field] !== null, `${ctx} missing field '${field}'`);
  }

  // Type checks
  assert(typeof s.id === 'string' && s.id.length > 0, `${ctx} id must be non-empty string`);
  assert(typeof s.name === 'string' && s.name.length > 0, `${ctx} name must be non-empty string`);
  assert(typeof s.rank === 'number' && s.rank >= 0 && s.rank <= 10, `${ctx} rank must be 0-10`);
  assert(typeof s.cost === 'number' && s.cost >= 1 && s.cost <= 3, `${ctx} cost must be 1-3`);
  assert(typeof s.range === 'number' && s.range >= 0, `${ctx} range must be >= 0`);
  assert(typeof s.description === 'string', `${ctx} description must be string`);
  assert(VALID_TARGET_TYPES.has(s.targetType), `${ctx} invalid targetType '${s.targetType}'`);

  // Traditions (focus spells may have none)
  assert(Array.isArray(s.traditions), `${ctx} traditions must be an array`);
  if (!s.focus) {
    assert(s.traditions.length > 0, `${ctx} must have at least one tradition`);
  }
  for (const t of s.traditions) {
    assert(VALID_TRADITIONS.has(t), `${ctx} invalid tradition '${t}'`);
  }

  // Optional: damageType
  if (s.damageType) {
    assert(VALID_DAMAGE_TYPES.has(s.damageType), `${ctx} invalid damageType '${s.damageType}'`);
  }

  // Optional: saveType
  if (s.saveType) {
    assert(VALID_SAVE_TYPES.has(s.saveType), `${ctx} invalid saveType '${s.saveType}'`);
  }

  // Optional: aoeShape
  if (s.aoeShape) {
    assert(VALID_AOE_SHAPES.has(s.aoeShape), `${ctx} invalid aoeShape '${s.aoeShape}'`);
  }

  // Optional: heightening
  if (s.heightening) {
    assert(VALID_HEIGHTENING_TYPES.has(s.heightening.type), `${ctx} invalid heightening type '${s.heightening.type}'`);
    if (s.heightening.type === 'interval') {
      assert(typeof s.heightening.interval === 'number', `${ctx} interval heightening requires interval number`);
    }
    if (s.heightening.type === 'fixed') {
      assert(s.heightening.fixedLevels && typeof s.heightening.fixedLevels === 'object', `${ctx} fixed heightening requires fixedLevels`);
    }
  }

  // Optional: persistentDamageChance
  if (s.persistentDamageChance) {
    assert(VALID_PERSISTENT_CHANCES.has(s.persistentDamageChance), `${ctx} invalid persistentDamageChance '${s.persistentDamageChance}'`);
  }
}

function esc(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function renderSpell(s) {
  const lines = [];
  lines.push(`  '${esc(s.id)}': {`);
  lines.push(`    id: '${esc(s.id)}',`);
  lines.push(`    name: '${esc(s.name)}',`);
  lines.push(`    rank: ${s.rank},`);

  // Traditions
  const trads = s.traditions.map((t) => `'${t}'`).join(', ');
  lines.push(`    traditions: [${trads}],`);
  lines.push(`    cost: ${s.cost},`);
  lines.push(`    range: ${s.range},`);
  lines.push(`    description: '${esc(s.description)}',`);
  lines.push(`    icon: '${esc(s.icon)}',`);
  lines.push(`    targetType: '${s.targetType}',`);

  // Optional AoE fields
  if (s.aoeRadius !== undefined) {
    lines.push(`    aoeRadius: ${s.aoeRadius},`);
  }
  if (s.aoeShape) {
    lines.push(`    aoeShape: '${s.aoeShape}',`);
  }

  // Optional save fields
  if (s.saveType) {
    lines.push(`    saveType: '${s.saveType}',`);
  }
  if (s.basicSave !== undefined) {
    lines.push(`    basicSave: ${s.basicSave},`);
  }

  // Optional damage fields
  if (s.damageType) {
    lines.push(`    damageType: '${s.damageType}',`);
  }
  if (s.damageFormula) {
    lines.push(`    damageFormula: '${esc(s.damageFormula)}',`);
  }
  if (s.persistentDamageFormula) {
    lines.push(`    persistentDamageFormula: '${esc(s.persistentDamageFormula)}',`);
  }
  if (s.persistentDamageChance) {
    lines.push(`    persistentDamageChance: '${s.persistentDamageChance}',`);
  }

  // Optional heightening
  if (s.heightening) {
    lines.push(`    heightening: {`);
    lines.push(`      type: '${s.heightening.type}',`);
    if (s.heightening.type === 'interval') {
      if (s.heightening.interval !== undefined) {
        lines.push(`      interval: ${s.heightening.interval},`);
      }
      if (s.heightening.damage) {
        lines.push(`      damage: '${esc(s.heightening.damage)}',`);
      }
      if (s.heightening.perInterval) {
        lines.push(`      perInterval: '${esc(s.heightening.perInterval)}',`);
      }
    }
    if (s.heightening.type === 'fixed' && s.heightening.fixedLevels) {
      lines.push(`      fixedLevels: {`);
      for (const [level, desc] of Object.entries(s.heightening.fixedLevels)) {
        lines.push(`        ${level}: '${esc(desc)}',`);
      }
      lines.push(`      },`);
    }
    lines.push(`    },`);
  }

  // Optional flags
  if (s.focus) {
    lines.push(`    focus: true,`);
  }
  if (s.sustained) {
    lines.push(`    sustained: true,`);
  }

  lines.push(`  },`);
  return lines.join('\n');
}

function renderSpellsTs(spells) {
  const header = `/**
 * Spell definitions and utilities for PF2e Rebirth
 *
 * AUTO-GENERATED by scripts/foundry-import/import-spells.js
 * Source: scripts/foundry-import/source/spells.source.json
 * Do not edit this file manually; rerun npm run import:foundry.
 */

// Damage Type Union - PF2e Remaster Complete List
export type DamageType = 
  // Physical
  | 'bludgeoning' | 'piercing' | 'slashing' | 'bleed'
  // Energy
  | 'fire' | 'cold' | 'electricity' | 'sonic' | 'acid'
  // Alignment/Spirit (Remaster)
  | 'vitality' | 'void' | 'spirit'
  // Special
  | 'poison' | 'mental' | 'force' | 'precision' | 'negative';

// Heightening configuration for spells that scale
export interface SpellHeightening {
  type: 'interval' | 'fixed'; // Interval = +X per Y ranks, Fixed = specific rank bonuses
  interval?: number; // For interval type: heighten every X ranks (e.g., 2)
  damage?: string; // Damage increase per interval (e.g., '+1d4' or '+2d6')
  perInterval?: string; // Description of effect per interval
  fixedLevels?: Record<number, string>; // For fixed type: rank → effect description
}

export interface Spell {
  id: string;
  name: string;
  rank: number; // 0 = cantrip, 1-10 = spell rank (PF2e Remaster terminology)
  traditions: ('arcane' | 'divine' | 'occult' | 'primal')[]; // Which traditions can cast this spell
  cost: number; // Action cost (1, 2, 3)
  range: number; // In squares (5ft per square)
  description: string;
  icon: string;
  targetType: 'single' | 'aoe'; // Single target or area of effect
  aoeRadius?: number; // Radius in squares for AoE spells
  aoeShape?: 'burst' | 'emanation' | 'cone' | 'line'; // Shape of AoE (default: burst)
  saveDC?: number; // DC for saves (if applicable)
  saveType?: 'reflex' | 'fortitude' | 'will'; // Save type
  basicSave?: boolean; // True if this uses basic save rules (crit success = 0, success = half, fail = full, crit fail = double)
  damageType?: DamageType;
  damageFormula?: string; // e.g., "1d6+1" or "2d6" at base rank
  persistentDamageFormula?: string; // Formula for persistent damage on failure (e.g., "1d6" for lingering fire)
  persistentDamageChance?: 'always' | 'critical-failure' | 'failure'; // When persistent damage applies
  heightening?: SpellHeightening; // How the spell scales when cast at higher ranks
  focus?: boolean; // True if this is a focus spell
  sustained?: boolean; // True if this spell can/must be sustained
}

`;

  // Group spells by rank
  const byRank = {};
  for (const s of spells) {
    if (!byRank[s.rank]) byRank[s.rank] = [];
    byRank[s.rank].push(s);
  }

  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  const bodyParts = [];

  for (const rank of ranks) {
    const label = rank === 0 ? 'CANTRIPS (RANK 0)' : `RANK ${rank} SPELLS`;
    bodyParts.push(`\n  // ========== ${label} ==========`);
    // Sort alphabetically within rank
    byRank[rank].sort((a, b) => a.name.localeCompare(b.name));
    for (const s of byRank[rank]) {
      bodyParts.push(renderSpell(s));
    }
  }

  const catalog = `// Spell catalog
export const SPELL_CATALOG: Record<string, Spell> = {${bodyParts.join('\n')}
};
`;

  const utilities = `
/**
 * Legacy (pre-Remaster) spell ID → Remaster spell ID.
 * Allows code written with old names to find spells by their new IDs.
 */
export const LEGACY_SPELL_ALIASES: Record<string, string> = {
  'magic-missile': 'force-barrage',
  'true-strike': 'sure-strike',
  'produce-flame': 'ignition',
  'chill-touch': 'void-warp',
  'mage-armor': 'mystic-armor',
  'mage-hand': 'telekinetic-hand',
  'ray-of-frost': 'winter-bolt',
  'hideous-laughter': 'laughing-fit',
  'remove-disease': 'cleanse-affliction',
  'remove-curse': 'clear-mind',
  'phantasmal-killer': 'vision-of-death',
  'acid-arrow': 'acid-grip',
  'burning-hands': 'breathe-fire',
  'color-spray': 'dizzying-colors',
  'magic-weapon': 'runic-weapon',
  'spider-sting': 'spider-venom',
  'dimension-door': 'translocate',
  'blink': 'flicker',
  'magic-mouth': 'embed-message',
  'obscuring-mist': 'mist',
  'see-invisibility': 'see-the-unseen',
  'remove-fear': 'clear-mind',
  'detect-magic': 'detect-magic',
  'detect-evil': 'detect-alignment',
  'protection': 'protection',
  'aid': 'aid',
  'guidance': 'guidance',
  'light': 'light',
  'tanglefoot': 'tangle-vine',
  'disrupt-undead': 'vitality-lash',
  'ray-of-enfeeblement': 'enfeeble',
  'acid-splash': 'acid-splash',
  'ghost-sound': 'figment',
  'divine-lance': 'holy-light',
  'forbidding-ward': 'protect-companion',
  'telekinetic-projectile': 'telekinetic-projectile',
  'electric-arc': 'electric-arc',
  'shield': 'shield',
  'daze': 'daze',
  'heal': 'heal',
  'grease': 'grease',
  'haste': 'haste',
  'slow': 'slow',
  'fireball': 'fireball',
  'lightning-bolt': 'lightning-bolt',
  'heroism': 'heroism',
  'fear': 'fear',
  'warp-step': 'warp-step',
};

// Build reverse map: Remaster name → legacy name (for display name lookups)
const _REVERSE_ALIASES: Record<string, string> = {};
for (const [legacy, remaster] of Object.entries(LEGACY_SPELL_ALIASES)) {
  if (legacy !== remaster) _REVERSE_ALIASES[remaster] = legacy;
}

export function getSpell(spellId: string): Spell | undefined {
  return SPELL_CATALOG[spellId] || SPELL_CATALOG[LEGACY_SPELL_ALIASES[spellId]];
}

/**
 * Look up a spell by its display name (case-insensitive).
 * Handles Pathbuilder names like "Sure Strike" → finds 'true-strike' entry.
 * Also strips suffixes like " (Archetype)" from Pathbuilder focus spell names.
 * Checks both Remaster and legacy display names.
 */
export function getSpellByName(displayName: string): Spell | undefined {
  const cleaned = displayName
    .replace(/\\s*\\(Archetype\\)\\s*$/i, '')
    .replace(/\\s*\\(Psychic\\)\\s*$/i, '')
    .trim()
    .toLowerCase();

  // Direct name match
  const direct = Object.values(SPELL_CATALOG).find(
    spell => spell.name.toLowerCase() === cleaned
  );
  if (direct) return direct;

  // Try converting display name to kebab-case and checking via alias
  const asId = cleaned.replace(/\\s+/g, '-').replace(/[^\\w-]/g, '');
  const aliased = LEGACY_SPELL_ALIASES[asId];
  if (aliased && SPELL_CATALOG[aliased]) return SPELL_CATALOG[aliased];

  return undefined;
}

/**
 * Convert a Pathbuilder spell display name to a SPELL_CATALOG id.
 * Returns the spell id if found, or a kebab-case fallback.
 * Handles both legacy and Remaster names.
 * Examples:
 *   "Sure Strike" → "sure-strike"
 *   "True Strike" → "sure-strike" (via legacy alias)
 *   "Warp Step (Archetype)" → "warp-step"
 *   "Fireball" → "fireball"
 */
export function resolveSpellId(displayName: string): string {
  const spell = getSpellByName(displayName);
  if (spell) return spell.id;
  // Fallback: convert display name to kebab-case id, check alias
  const asId = displayName
    .replace(/\\s*\\(Archetype\\)\\s*$/i, '')
    .replace(/\\s*\\(Psychic\\)\\s*$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\\s+/g, '-')
    .replace(/[^\\w-]/g, '');
  return LEGACY_SPELL_ALIASES[asId] || asId;
}

export const rollDamageFormula = (formula: string): { results: number[]; total: number } => {
  // Parse simple formulas like "1d6+1" or "2d6"
  const match = /^(\\d+)d(\\d+)(?:\\+(\\d+))?$/.exec(formula);
  if (!match) {
    return { results: [], total: 0 };
  }

  const times = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;

  const results: number[] = [];
  for (let i = 0; i < times; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = results.reduce((a, b) => a + b, 0) + bonus;

  return { results, total };
};
`;

  return header + catalog + utilities;
}

function writeReport(spells) {
  const rankCounts = {};
  const traditionCounts = {};
  let focusCount = 0;
  let cantrips = 0;
  let damageSpells = 0;
  let saveSpells = 0;
  let healingSpells = 0;
  let buffDebuffSpells = 0;

  for (const s of spells) {
    rankCounts[s.rank] = (rankCounts[s.rank] || 0) + 1;
    for (const t of s.traditions) {
      traditionCounts[t] = (traditionCounts[t] || 0) + 1;
    }
    if (s.focus) focusCount++;
    if (s.rank === 0) cantrips++;
    if (s.damageFormula) damageSpells++;
    if (s.saveType) saveSpells++;
    if (s.damageType === 'vitality') healingSpells++;
    if (!s.damageFormula && !s.saveType && s.rank > 0) buffDebuffSpells++;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(ROOT, SOURCE_FILE).replace(/\\/g, '/'),
    outputFile: path.relative(ROOT, OUTPUT_FILE).replace(/\\/g, '/'),
    spellCount: spells.length,
    rankCounts,
    traditionCounts,
    focusCount,
    cantrips,
    damageSpells,
    saveSpells,
    healingSpells,
    buffDebuffSpells,
    meetsPhase13Target: spells.length >= 60,
    rankRange: {
      min: Math.min(...spells.map((s) => s.rank)),
      max: Math.max(...spells.map((s) => s.rank)),
    },
  };

  // Ensure generated directory exists
  const genDir = path.dirname(REPORT_FILE);
  if (!fs.existsSync(genDir)) {
    fs.mkdirSync(genDir, { recursive: true });
  }

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  return report;
}

function run() {
  const source = readSource();
  assert(Array.isArray(source.spells), 'Expected source.spells to be an array');

  // Validate
  const seen = new Set();
  source.spells.forEach((s, i) => {
    validateSpell(s, i);
    assert(!seen.has(s.id), `Duplicate spell id '${s.id}'`);
    seen.add(s.id);
  });

  // Sort by rank, then name
  const spells = source.spells.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

  assert(spells.length >= 60, `Expected at least 60 spells, found ${spells.length}`);

  const tsContent = renderSpellsTs(spells);
  fs.writeFileSync(OUTPUT_FILE, tsContent);

  const report = writeReport(spells);
  console.log(`[foundry-import] Imported ${report.spellCount} spells into shared/spells.ts`);
  console.log(`[foundry-import] Rank range: ${report.rankRange.min} to ${report.rankRange.max}`);
  console.log(`[foundry-import] Cantrips: ${report.cantrips}, Focus spells: ${report.focusCount}`);
  console.log(`[foundry-import] Damage spells: ${report.damageSpells}, Save-based: ${report.saveSpells}`);
}

if (require.main === module) {
  run();
}

module.exports = { run };
