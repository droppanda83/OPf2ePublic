/**
 * Augment local pipeline source JSON from a sparse-cloned Foundry PF2e repo.
 *
 * Usage:
 *   node scripts/foundry-import/augment-from-foundry-local.js
 *
 * Optional env overrides:
 *   FOUNDRY_LOCAL_ROOT=... (default: temp/foundry-pf2e)
 *   MAX_SPELLS=600
 *   MAX_CREATURES=800
 *   MAX_FEATS=2000
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FOUNDRY_ROOT = path.resolve(
  ROOT,
  process.env.FOUNDRY_LOCAL_ROOT || path.join('temp', 'foundry-pf2e')
);

const SOURCE_DIR = path.join(__dirname, 'source');
const SPELLS_SOURCE_FILE = path.join(SOURCE_DIR, 'spells.source.json');
const BESTIARY_SOURCE_FILE = path.join(SOURCE_DIR, 'bestiary.source.json');
const FEATS_SOURCE_FILE = path.join(SOURCE_DIR, 'feats.source.json');

const MAX_SPELLS = Number(process.env.MAX_SPELLS || 2000);
const MAX_CREATURES = Number(process.env.MAX_CREATURES || 800);
const MAX_FEATS = Number(process.env.MAX_FEATS || 2000);

const VALID_DAMAGE_TYPES = new Set([
  'bludgeoning', 'piercing', 'slashing', 'bleed',
  'fire', 'cold', 'electricity', 'sonic', 'acid',
  'vitality', 'void', 'spirit',
  'poison', 'mental', 'force', 'precision', 'negative',
]);

const VALID_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal']);
const VALID_SAVE_TYPES = new Set(['reflex', 'fortitude', 'will']);
const VALID_AOE_SHAPES = new Set(['burst', 'emanation', 'cone', 'line']);

const CREATURE_PACKS = [
  'pathfinder-monster-core',
  'pathfinder-monster-core-2',
  'pathfinder-bestiary',
  'pathfinder-bestiary-2',
  'pathfinder-bestiary-3',
  'pathfinder-npc-core',
];

function fail(message) {
  throw new Error(`[foundry-augment] ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function listJsonFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== '_folders.json') {
        out.push(full);
      }
    }
  }
  out.sort();
  return out;
}

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromSlug(input) {
  return String(input || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stripHtml(html) {
  const src = String(html || '');
  return src
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(text, maxLen = 220) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  const idx = text.indexOf('. ');
  if (idx > 40 && idx < maxLen) {
    return text.slice(0, idx + 1);
  }
  return `${text.slice(0, maxLen - 1)}…`;
}

function parseActionCost(rawValue) {
  const val = String(rawValue ?? '').toLowerCase().trim();
  if (!val) return 'passive';
  if (val === 'reaction') return 'reaction';
  if (val === 'free') return 'free';
  const match = val.match(/[123]/);
  if (match) return Number(match[0]);
  return 'passive';
}

function parseFeetToSquares(rawValue) {
  const val = String(rawValue ?? '').toLowerCase().trim();
  if (!val || val === '—' || val === '-') return 0;
  if (val.includes('self')) return 0;
  if (val.includes('touch')) return 1;
  const numMatch = val.match(/(\d+)/);
  if (!numMatch) return 0;
  const feet = Number(numMatch[1]);
  if (!Number.isFinite(feet) || feet < 0) return 0;
  return Math.max(0, Math.round(feet / 5));
}

function parseCost(rawValue) {
  const val = String(rawValue ?? '').trim();
  const n = Number(val);
  if (Number.isFinite(n) && n >= 1 && n <= 3) return n;
  const match = val.match(/[123]/);
  if (match) return Number(match[0]);
  return 2;
}

function mapDamageType(raw) {
  const lower = String(raw || '').toLowerCase().trim();
  if (!lower) return null;
  const mapped = {
    positive: 'vitality',
    negative: 'void',
    untyped: 'force',
  }[lower] || lower;
  return VALID_DAMAGE_TYPES.has(mapped) ? mapped : null;
}

function parseDamageFormula(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/@|\{|\}|\[|\]/.test(value)) return null;
  if (!/[0-9]d[0-9]/i.test(value) && !/^\d+$/.test(value)) return null;
  return value;
}

function parseSpellHeightening(heightening) {
  if (!heightening || typeof heightening !== 'object') return null;
  if (heightening.type === 'interval') {
    const interval = Number(heightening.interval);
    const damage = heightening.damage && typeof heightening.damage === 'object'
      ? Object.values(heightening.damage)[0]
      : null;
    const perInterval = parseDamageFormula(damage) || null;
    if (Number.isFinite(interval) && interval > 0 && perInterval) {
      return { type: 'interval', interval, damage: perInterval, perInterval: `Damage increases by ${perInterval}` };
    }
    return null;
  }

  if (heightening.type === 'fixed' && heightening.levels && typeof heightening.levels === 'object') {
    const fixedLevels = {};
    for (const [lvl, data] of Object.entries(heightening.levels)) {
      const n = Number(lvl);
      if (!Number.isFinite(n)) continue;
      const damageObj = data && data.damage && typeof data.damage === 'object' ? data.damage : null;
      const formula = damageObj ? parseDamageFormula(Object.values(damageObj)[0]?.formula || Object.values(damageObj)[0]) : null;
      if (formula) fixedLevels[n] = formula;
    }
    if (Object.keys(fixedLevels).length > 0) {
      return { type: 'fixed', fixedLevels };
    }
  }

  return null;
}

function pickSpellIcon(spell) {
  const damageType = spell.damageType;
  const traits = spell.traits || [];
  if (damageType === 'fire' || traits.includes('fire')) return '🔥';
  if (damageType === 'cold' || traits.includes('cold')) return '❄️';
  if (damageType === 'electricity' || traits.includes('electricity')) return '⚡';
  if (damageType === 'acid' || traits.includes('acid')) return '🧪';
  if (damageType === 'mental' || traits.includes('mental')) return '🧠';
  if (traits.includes('healing') || spell.name.toLowerCase().includes('heal')) return '💚';
  if (traits.includes('force') || damageType === 'force') return '✨';
  return '✨';
}

function convertSpell(foundry, fileName) {
  if (!foundry || foundry.type !== 'spell') return null;

  const system = foundry.system || {};
  const traits = system.traits || {};
  const traitValues = Array.isArray(traits.value) ? traits.value.map((v) => String(v).toLowerCase()) : [];
  const traditions = (Array.isArray(traits.traditions) ? traits.traditions : [])
    .map((t) => String(t).toLowerCase())
    .filter((t) => VALID_TRADITIONS.has(t));

  // Focus spells often have no traditions — allow them through if they carry the focus trait
  const isFocusSpell = traitValues.includes('focus');
  if (traditions.length === 0 && !isFocusSpell) return null;

  const rankValue = Number(system.level?.value ?? 1);
  const rank = traitValues.includes('cantrip') ? 0 : Math.max(0, Math.min(10, rankValue));

  const desc = firstSentence(stripHtml(system.description?.value || ''));
  if (!desc) return null;

  const id = toSlug(path.basename(fileName, '.json'));
  const targetType = system.area ? 'aoe' : 'single';

  const spell = {
    id,
    name: String(foundry.name || id),
    rank,
    traditions,
    cost: parseCost(system.time?.value),
    range: parseFeetToSquares(system.range?.value),
    description: desc,
    icon: '✨',
    targetType,
  };

  const defense = system.defense || {};
  const saveType = String(defense?.save?.statistic || '').toLowerCase();
  if (VALID_SAVE_TYPES.has(saveType)) {
    spell.saveType = saveType;
    if (defense.save?.basic === true) spell.basicSave = true;
  }

  if (system.area && typeof system.area === 'object') {
    const shape = String(system.area.type || '').toLowerCase();
    if (VALID_AOE_SHAPES.has(shape)) spell.aoeShape = shape;
    const areaValue = Number(system.area.value);
    if (Number.isFinite(areaValue) && areaValue > 0) {
      spell.aoeRadius = Math.max(1, Math.round(areaValue / 5));
    }
  }

  if (system.duration?.sustained === true) {
    spell.sustained = true;
  }

  if (traitValues.includes('focus')) {
    spell.focus = true;
  }

  const dmg = system.damage && typeof system.damage === 'object' ? Object.values(system.damage) : [];
  const dmgEntry = dmg.find((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const kinds = Array.isArray(entry.kinds) ? entry.kinds : [];
    return kinds.includes('damage') && entry.category !== 'splash';
  }) || null;

  if (dmgEntry) {
    const damageType = mapDamageType(dmgEntry.type);
    const formula = parseDamageFormula(dmgEntry.formula);
    if (damageType) spell.damageType = damageType;
    if (formula) spell.damageFormula = formula;
  }

  const heightening = parseSpellHeightening(system.heightening);
  if (heightening) spell.heightening = heightening;

  spell.icon = pickSpellIcon({ ...spell, traits: traitValues });
  return spell;
}

function convertFeat(foundry, filePath) {
  if (!foundry || foundry.type !== 'feat') return null;

  const system = foundry.system || {};
  const category = String(system.category || '').toLowerCase();
  if (!['ancestry', 'general', 'skill'].includes(category)) return null;

  const id = toSlug(path.basename(filePath, '.json'));
  const description = firstSentence(stripHtml(system.description?.value || ''), 260);
  if (!description) return null;

  const traitValues = Array.isArray(system.traits?.value) ? system.traits.value : [];
  const traits = traitValues
    .map((t) => titleFromSlug(String(t)))
    .filter((t) => t.length > 0);

  let source = null;
  if (category === 'ancestry') {
    const rel = filePath.replace(/\\/g, '/');
    const marker = '/feats/ancestry/';
    const idx = rel.indexOf(marker);
    if (idx !== -1) {
      const rest = rel.slice(idx + marker.length);
      const ancestrySlug = rest.split('/')[0];
      source = titleFromSlug(ancestrySlug);
    }
  }

  const prereqRaw = Array.isArray(system.prerequisites?.value) ? system.prerequisites.value : [];
  const prerequisites = prereqRaw
    .map((p) => {
      if (typeof p === 'string') return p.trim();
      if (p && typeof p === 'object' && typeof p.value === 'string') return p.value.trim();
      return '';
    })
    .filter(Boolean);

  const actionType = String(system.actionType?.value || '').toLowerCase();
  let actionCost = 'passive';
  if (actionType === 'reaction') actionCost = 'reaction';
  else if (actionType === 'free') actionCost = 'free';
  else if (actionType === 'action') actionCost = parseActionCost(system.actions?.value);

  const feat = {
    id,
    name: String(foundry.name || id),
    category,
    level: Number(system.level?.value || 1),
    description,
    implemented: 'not_implemented',
    source,
    traits,
    actionCost,
  };

  if (prerequisites.length > 0) {
    feat.prerequisites = prerequisites;
  }

  return feat;
}

function defaultDamageDice(level) {
  if (level <= 0) return { dice: '1d4', bonus: 0 };
  if (level <= 2) return { dice: '1d6', bonus: 2 };
  if (level <= 5) return { dice: '1d8', bonus: 4 };
  if (level <= 9) return { dice: '2d8', bonus: 5 };
  if (level <= 13) return { dice: '3d8', bonus: 6 };
  if (level <= 17) return { dice: '4d8', bonus: 7 };
  return { dice: '5d8', bonus: 8 };
}

function parseDamageRoll(raw) {
  const value = String(raw || '').trim().toLowerCase();
  const m = value.match(/(\d+d\d+)(\s*[+-]\s*\d+)?/);
  if (!m) return null;
  const dice = m[1].replace(/\s+/g, '');
  const bonus = m[2] ? Number(m[2].replace(/\s+/g, '')) : 0;
  return { dice, bonus: Number.isFinite(bonus) ? bonus : 0 };
}

function convertCreature(foundry, filePath) {
  if (!foundry || foundry.type !== 'npc') return null;

  const system = foundry.system || {};
  const details = system.details || {};
  const attrs = system.attributes || {};
  const abilities = system.abilities || {};

  const level = Number(details.level?.value ?? 0);
  const hp = Number(attrs.hp?.max ?? attrs.hp?.value ?? 1);
  const ac = Number(attrs.ac?.value ?? 10);
  const speedRaw = attrs.speed?.value;
  let speed = Number(speedRaw);
  if (!Number.isFinite(speed)) {
    speed = parseFeetToSquares(speedRaw) || 5;
  }

  const creature = {
    id: toSlug(path.basename(filePath, '.json')),
    name: String(foundry.name || path.basename(filePath, '.json')),
    level,
    hp: Math.max(1, Number.isFinite(hp) ? hp : 1),
    ac: Math.max(10, Number.isFinite(ac) ? ac : 10),
    speed: Math.max(5, Number.isFinite(speed) ? speed : 5),
    abilities: {
      str: Number(abilities.str?.mod ?? 0),
      dex: Number(abilities.dex?.mod ?? 0),
      con: Number(abilities.con?.mod ?? 0),
      int: Number(abilities.int?.mod ?? 0),
      wis: Number(abilities.wis?.mod ?? 0),
      cha: Number(abilities.cha?.mod ?? 0),
    },
    attackBonus: Math.max(level + 6, 4),
    attacks: [],
    tags: [],
    description: firstSentence(stripHtml(details.publicNotes || details.blurb || ''), 300) || 'Creature imported from Foundry PF2e data.',
  };

  const traitValues = Array.isArray(system.traits?.value)
    ? system.traits.value.map((t) => String(t).toLowerCase())
    : [];
  creature.tags = traitValues.length > 0 ? traitValues.slice(0, 8) : ['creature'];

  const meleeItems = Array.isArray(foundry.items)
    ? foundry.items.filter((it) => it && it.type === 'melee')
    : [];

  let bestAttackBonus = creature.attackBonus;
  for (let index = 0; index < meleeItems.length; index += 1) {
    const item = meleeItems[index];
    const itemSystem = item.system || {};
    const bonus = Number(itemSystem.bonus?.value ?? level + 6);
    if (Number.isFinite(bonus) && bonus > bestAttackBonus) bestAttackBonus = bonus;

    const rollEntry = itemSystem.damageRolls && typeof itemSystem.damageRolls === 'object'
      ? Object.values(itemSystem.damageRolls)[0]
      : null;

    let parsed = parseDamageRoll(rollEntry?.damage || '');
    if (!parsed) parsed = defaultDamageDice(level);

    const damageType = mapDamageType(rollEntry?.damageType) || 'bludgeoning';
    const isRanged = !!itemSystem.range;
    const rangeSquares = isRanged
      ? parseFeetToSquares(itemSystem.range?.increment ?? itemSystem.range?.max ?? itemSystem.range?.value ?? '')
      : undefined;

    const atk = {
      id: toSlug(`${item.name || 'attack'}-${index + 1}`),
      name: String(item.name || 'Strike'),
      type: isRanged ? 'ranged' : 'melee',
      state: 'natural',
      damageDice: parsed.dice,
      damageBonus: parsed.bonus,
      damageType,
      traits: Array.isArray(itemSystem.traits?.value) ? itemSystem.traits.value.map((t) => String(t).toLowerCase()) : [],
    };

    if (isRanged && rangeSquares > 0) {
      atk.range = rangeSquares;
    }

    creature.attacks.push(atk);
  }

  if (creature.attacks.length === 0) {
    const fallback = defaultDamageDice(level);
    creature.attacks.push({
      id: 'strike',
      name: 'Strike',
      type: 'melee',
      state: 'natural',
      damageDice: fallback.dice,
      damageBonus: fallback.bonus,
      damageType: 'bludgeoning',
      traits: [],
    });
  }

  creature.attackBonus = bestAttackBonus;

  const resistances = Array.isArray(attrs.resistances) ? attrs.resistances : [];
  const weaknesses = Array.isArray(attrs.weaknesses) ? attrs.weaknesses : [];
  const immunities = Array.isArray(attrs.immunities) ? attrs.immunities : [];

  const mappedRes = resistances
    .map((r) => ({ type: mapDamageType(r?.type), value: Number(r?.value || 0) }))
    .filter((r) => r.type && Number.isFinite(r.value) && r.value > 0);
  if (mappedRes.length > 0) creature.resistances = mappedRes;

  const mappedWeak = weaknesses
    .map((w) => ({ type: mapDamageType(w?.type), value: Number(w?.value || 0) }))
    .filter((w) => w.type && Number.isFinite(w.value) && w.value > 0);
  if (mappedWeak.length > 0) creature.weaknesses = mappedWeak;

  const mappedImm = immunities
    .map((i) => String(i?.type || '').toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  if (mappedImm.length > 0) creature.immunities = mappedImm;

  return creature;
}

function augmentSpells(existing) {
  const spellDir = path.join(FOUNDRY_ROOT, 'packs', 'pf2e', 'spells', 'spells');
  const focusDir = path.join(FOUNDRY_ROOT, 'packs', 'pf2e', 'spells', 'focus');
  const files = [
    ...listJsonFilesRecursive(spellDir),
    ...listJsonFilesRecursive(focusDir),
  ];
  if (files.length === 0) fail(`No Foundry spell files found in ${spellDir} or ${focusDir}`);

  const map = new Map(existing.spells.map((s) => [s.id, s]));
  let added = 0;
  for (const filePath of files) {
    if (map.size >= MAX_SPELLS) break;
    try {
      const foundry = readJson(filePath);
      const converted = convertSpell(foundry, filePath);
      if (!converted) continue;
      if (!map.has(converted.id)) {
        map.set(converted.id, converted);
        added += 1;
      }
    } catch {
      // skip malformed entries
    }
  }

  const spells = Array.from(map.values())
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

  return {
    ...existing,
    meta: {
      ...existing.meta,
      source: 'Foundry PF2e packs + curated seed',
      notes: `Augmented from local Foundry checkout at temp/foundry-pf2e (max ${MAX_SPELLS}).`,
      augmentedAt: new Date().toISOString(),
    },
    spells,
    _added: added,
  };
}

function augmentFeats(existing) {
  const featsRoot = path.join(FOUNDRY_ROOT, 'packs', 'pf2e', 'feats');
  const categories = ['ancestry', 'general', 'skill'];
  const map = new Map(existing.feats.map((f) => [f.id, f]));

  let added = 0;
  for (const category of categories) {
    const files = listJsonFilesRecursive(path.join(featsRoot, category));
    for (const filePath of files) {
      if (map.size >= MAX_FEATS) break;
      try {
        const foundry = readJson(filePath);
        const converted = convertFeat(foundry, filePath);
        if (!converted) continue;
        if (!map.has(converted.id)) {
          map.set(converted.id, converted);
          added += 1;
        }
      } catch {
        // skip malformed entries
      }
    }
  }

  const feats = Array.from(map.values())
    .sort((a, b) => a.category.localeCompare(b.category) || a.level - b.level || a.name.localeCompare(b.name));

  return {
    ...existing,
    meta: {
      ...existing.meta,
      source: 'Foundry PF2e feats + curated seed',
      notes: `Augmented ancestry/general/skill feats from local Foundry checkout (max ${MAX_FEATS}).`,
      augmentedAt: new Date().toISOString(),
    },
    feats,
    _added: added,
  };
}

function augmentBestiary(existing) {
  const map = new Map(existing.creatures.map((c) => [c.id, c]));
  let added = 0;

  for (const pack of CREATURE_PACKS) {
    const dir = path.join(FOUNDRY_ROOT, 'packs', 'pf2e', pack);
    const files = listJsonFilesRecursive(dir);
    for (const filePath of files) {
      if (map.size >= MAX_CREATURES) break;
      try {
        const foundry = readJson(filePath);
        const converted = convertCreature(foundry, filePath);
        if (!converted) continue;
        if (!map.has(converted.id)) {
          map.set(converted.id, converted);
          added += 1;
        }
      } catch {
        // skip malformed entries
      }
    }
    if (map.size >= MAX_CREATURES) break;
  }

  const creatures = Array.from(map.values())
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return {
    ...existing,
    meta: {
      ...existing.meta,
      source: 'Foundry PF2e bestiary packs + curated seed',
      notes: `Augmented from core Foundry monster packs (max ${MAX_CREATURES}).`,
      augmentedAt: new Date().toISOString(),
    },
    creatures,
    _added: added,
  };
}

function main() {
  if (!fs.existsSync(FOUNDRY_ROOT)) {
    fail(`Foundry local root not found: ${FOUNDRY_ROOT}`);
  }

  const existingSpells = readJson(SPELLS_SOURCE_FILE);
  const existingBestiary = readJson(BESTIARY_SOURCE_FILE);
  const existingFeats = readJson(FEATS_SOURCE_FILE);

  const nextSpells = augmentSpells(existingSpells);
  const nextBestiary = augmentBestiary(existingBestiary);
  const nextFeats = augmentFeats(existingFeats);

  const spellsAdded = nextSpells._added;
  const creaturesAdded = nextBestiary._added;
  const featsAdded = nextFeats._added;

  delete nextSpells._added;
  delete nextBestiary._added;
  delete nextFeats._added;

  writeJson(SPELLS_SOURCE_FILE, nextSpells);
  writeJson(BESTIARY_SOURCE_FILE, nextBestiary);
  writeJson(FEATS_SOURCE_FILE, nextFeats);

  console.log('[foundry-augment] Done');
  console.log(`[foundry-augment] Spells: ${existingSpells.spells.length} -> ${nextSpells.spells.length} (+${spellsAdded})`);
  console.log(`[foundry-augment] Bestiary: ${existingBestiary.creatures.length} -> ${nextBestiary.creatures.length} (+${creaturesAdded})`);
  console.log(`[foundry-augment] Feats: ${existingFeats.feats.length} -> ${nextFeats.feats.length} (+${featsAdded})`);
}

main();
