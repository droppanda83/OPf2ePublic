/**
 * Bestiary import script — transforms bestiary.source.json → shared/bestiary.ts
 *
 * Part of the Foundry VTT Data Pipeline (Phase 13).
 * Run via: npm run import:foundry
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_FILE = path.join(__dirname, 'source', 'bestiary.source.json');
const OUTPUT_FILE = path.join(ROOT, 'shared', 'bestiary.ts');
const REPORT_FILE = path.join(__dirname, 'generated', 'bestiary-import-report.json');

const VALID_DAMAGE_TYPES = new Set([
  'bludgeoning', 'piercing', 'slashing', 'bleed',
  'fire', 'cold', 'electricity', 'sonic', 'acid',
  'vitality', 'void', 'spirit',
  'poison', 'mental', 'force', 'precision', 'negative',
]);

const VALID_ATTACK_TYPES = new Set(['melee', 'ranged']);
const VALID_STATES = new Set(['held', 'stowed', 'natural']);
const VALID_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal']);

function fail(message) {
  throw new Error(`[foundry-import:bestiary] ${message}`);
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

function validateCreature(c, index) {
  const ctx = `Creature[${index}] "${c.name || c.id || '?'}"`;

  // Required fields
  const required = ['id', 'name', 'level', 'hp', 'ac', 'speed', 'abilities', 'attackBonus', 'attacks', 'tags', 'description'];
  for (const field of required) {
    assert(c[field] !== undefined && c[field] !== null, `${ctx} missing field '${field}'`);
  }

  // Abilities
  const abilFields = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  for (const a of abilFields) {
    assert(typeof c.abilities[a] === 'number', `${ctx} missing ability '${a}'`);
  }

  // Attacks
  assert(Array.isArray(c.attacks) && c.attacks.length > 0, `${ctx} must have at least one attack`);
  for (const atk of c.attacks) {
    assert(atk.id && atk.name, `${ctx} attack missing id/name`);
    assert(VALID_ATTACK_TYPES.has(atk.type), `${ctx} attack '${atk.id}' invalid type '${atk.type}'`);
    assert(VALID_STATES.has(atk.state), `${ctx} attack '${atk.id}' invalid state '${atk.state}'`);
    assert(VALID_DAMAGE_TYPES.has(atk.damageType), `${ctx} attack '${atk.id}' invalid damageType '${atk.damageType}'`);
  }

  // Tags
  assert(Array.isArray(c.tags) && c.tags.length > 0, `${ctx} must have at least one tag`);

  // Optional: resistances, weaknesses, immunities
  if (c.resistances) {
    for (const r of c.resistances) {
      assert(VALID_DAMAGE_TYPES.has(r.type), `${ctx} resistance invalid type '${r.type}'`);
    }
  }
  if (c.weaknesses) {
    for (const w of c.weaknesses) {
      assert(VALID_DAMAGE_TYPES.has(w.type), `${ctx} weakness invalid type '${w.type}'`);
    }
  }
  if (c.immunities) {
    for (const imm of c.immunities) {
      assert(typeof imm === 'string', `${ctx} immunity must be string`);
    }
  }

  // Optional: spells
  if (c.spells) {
    assert(VALID_TRADITIONS.has(c.spells.tradition), `${ctx} spells invalid tradition '${c.spells.tradition}'`);
  }
}

function esc(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function renderAttack(atk, indent) {
  const pad = ' '.repeat(indent);
  const traits = (atk.traits || []).map((t) => `'${esc(t)}'`).join(', ');
  const icon = atk.icon || (atk.type === 'ranged' ? '🏹' : '⚔️');

  if (atk.state === 'natural') {
    // natural(id, display, dice, bonus, dmgType, traits?)
    const traitsArg = atk.traits && atk.traits.length > 0 ? `, [${traits}]` : '';
    return `${pad}natural('${esc(atk.id)}', '${esc(atk.name)}', '${atk.damageDice}', ${atk.damageBonus || 0}, '${atk.damageType}'${traitsArg}),`;
  }

  // held or stowed
  const fn = atk.state; // 'held' or 'stowed'
  let props = `id: '${esc(atk.id)}', display: '${esc(atk.name)}', attackType: '${atk.type}', damageDice: '${atk.damageDice}', damageBonus: ${atk.damageBonus || 0}, damageType: '${atk.damageType}', hands: ${atk.hands || 1}`;
  if (atk.type === 'ranged' && atk.range) {
    props += `, range: ${atk.range}`;
  }
  if (atk.traits && atk.traits.length > 0) {
    props += `, traits: [${traits}]`;
  }
  props += `, icon: '${icon}'`;

  return `${pad}${fn}({ ${props} }),`;
}

function renderCreature(c) {
  const lines = [];
  lines.push('  {');
  lines.push('    creature: {');
  lines.push(`      name: '${esc(c.name)}',`);
  lines.push(`      level: ${c.level},`);
  lines.push(`      maxHealth: ${c.hp},`);
  lines.push(`      armorClass: ${c.ac},`);
  lines.push(`      speed: ${c.speed},`);

  // Size & Rarity
  if (c.size && c.size !== 'medium') {
    lines.push(`      size: '${c.size}',`);
  }

  lines.push(`      abilities: abs({ str: ${c.abilities.str}, dex: ${c.abilities.dex}, con: ${c.abilities.con}, int: ${c.abilities.int}, wis: ${c.abilities.wis}, cha: ${c.abilities.cha} }),`);
  lines.push(`      pbAttackBonus: ${c.attackBonus},`);

  // Perception, Saves, Senses, Languages, Rarity
  if (typeof c.perception === 'number') {
    lines.push(`      perception: ${c.perception},`);
  }
  if (typeof c.fortitudeSave === 'number') {
    lines.push(`      fortitudeSave: ${c.fortitudeSave},`);
  }
  if (typeof c.reflexSave === 'number') {
    lines.push(`      reflexSave: ${c.reflexSave},`);
  }
  if (typeof c.willSave === 'number') {
    lines.push(`      willSave: ${c.willSave},`);
  }
  if (c.senses && c.senses.length > 0) {
    const sensesStr = c.senses.map((s) => `'${esc(s)}'`).join(', ');
    lines.push(`      senses: [${sensesStr}],`);
  }
  if (c.languages && c.languages.length > 0) {
    const langsStr = c.languages.map((l) => `'${esc(l)}'`).join(', ');
    lines.push(`      languages: [${langsStr}],`);
  }
  if (c.rarity && c.rarity !== 'common') {
    lines.push(`      rarity: '${c.rarity}',`);
  }

  // Legacy weapon fields (first attack)
  const primary = c.attacks[0];
  lines.push(`      weaponDamageDice: '${primary.damageDice}',`);
  lines.push(`      weaponDamageBonus: ${primary.damageBonus || 0},`);
  lines.push(`      weaponDamageType: '${primary.damageType}',`);
  lines.push(`      weaponDisplay: '${esc(primary.name)}',`);

  // Damage resistances
  if (c.resistances && c.resistances.length > 0) {
    lines.push('      damageResistances: [');
    for (const r of c.resistances) {
      lines.push(`        { type: '${r.type}' as any, value: ${r.value} },`);
    }
    lines.push('      ],');
  }

  // Damage immunities
  if (c.immunities && c.immunities.length > 0) {
    const imm = c.immunities.map((i) => `'${esc(i)}' as any`).join(', ');
    lines.push(`      damageImmunities: [${imm}],`);
  }

  // Damage weaknesses
  if (c.weaknesses && c.weaknesses.length > 0) {
    lines.push('      damageWeaknesses: [');
    for (const w of c.weaknesses) {
      lines.push(`        { type: '${w.type}' as any, value: ${w.value} },`);
    }
    lines.push('      ],');
  }

  // Equipped shield
  if (c.equippedShield) {
    lines.push(`      equippedShield: '${esc(c.equippedShield)}',`);
  }

  // Specials
  if (c.specials && c.specials.length > 0) {
    const specs = c.specials.map((s) => `'${esc(s)}'`).join(', ');
    lines.push(`      specials: [${specs}],`);
  }

  // Skills
  if (c.skills && c.skills.length > 0) {
    lines.push('      skills: [');
    for (const sk of c.skills) {
      lines.push(`        { name: '${esc(sk.name)}', bonus: ${sk.bonus}, proficiency: 'trained' as any, abilityMod: 0, profBonus: 0 },`);
    }
    lines.push('      ],');
  }

  // Spellcasters
  if (c.spells) {
    lines.push('      spellcasters: [{');
    lines.push(`        tradition: '${c.spells.tradition}',`);
    lines.push(`        castingType: '${c.spells.castingType || 'spontaneous'}',`);
    lines.push(`        spellAttackBonus: ${c.spells.attackBonus || 0},`);
    lines.push(`        spellDC: ${c.spells.dc || 0},`);
    lines.push('        spells: [');
    for (const sp of c.spells.knownSpells) {
      const trad = sp.tradition ? `, tradition: '${sp.tradition}'` : '';
      lines.push(`          { name: '${esc(sp.name)}', level: ${sp.level}${trad} },`);
    }
    lines.push('        ],');
    lines.push('        slots: [');
    for (const sl of (c.spells.slots || [])) {
      lines.push(`          { level: ${sl.level}, available: ${sl.available}, max: ${sl.max} },`);
    }
    lines.push('        ],');
    lines.push('      }],');
  }

  // Weapon inventory
  lines.push('      weaponInventory: [');
  for (const atk of c.attacks) {
    lines.push(renderAttack(atk, 8));
  }
  lines.push('      ],');

  lines.push('    },');
  lines.push(`    description: '${esc(c.description)}',`);
  const tags = c.tags.map((t) => `'${esc(t)}'`).join(', ');
  lines.push(`    tags: [${tags}],`);
  if (c.rarity && c.rarity !== 'common') {
    lines.push(`    rarity: '${c.rarity}',`);
  }
  lines.push('  },');

  return lines.join('\n');
}

function renderBestiaryTs(creatures) {
  const header = `/**
 * PF2e Bestiary — Curated creature data for encounter building.
 * Stats sourced from the open-source Foundry VTT PF2e system (ORC license).
 *
 * AUTO-GENERATED by scripts/foundry-import/import-bestiary.js
 * Source: scripts/foundry-import/source/bestiary.source.json
 * Do not edit this file manually; rerun npm run import:foundry.
 *
 * Each entry is a Partial<Creature> that can be passed directly to
 * the game engine's initializeCreature(). NPC creatures use:
 *   - armorClass: flat AC (preserved by engine for NPCs)
 *   - pbAttackBonus: flat attack bonus (bypasses proficiency calc)
 *   - weaponDamageDice / weaponDamageBonus / weaponDamageType: damage
 *   - weaponDisplay: attack name shown in UI
 */

import { Creature, CreatureWeapon, WeaponSlot, DamageType } from './types';
import { AbilityScores } from './bonuses';

// ─── Bestiary Entry ──────────────────────────────────

export interface BestiaryEntry {
  /** Partial creature data for the game engine */
  creature: Partial<Creature>;
  /** Short description for the UI */
  description: string;
  /** Creature tags for filtering (e.g., 'undead', 'beast', 'humanoid') */
  tags: string[];
  /** Rarity: common, uncommon, rare, or unique */
  rarity?: 'common' | 'uncommon' | 'rare' | 'unique';
}

// ─── Helper ──────────────────────────────────────────

function abs(scores: {
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
}): AbilityScores {
  return {
    strength: scores.str,
    dexterity: scores.dex,
    constitution: scores.con,
    intelligence: scores.int,
    wisdom: scores.wis,
    charisma: scores.cha,
  };
}

/** Helper: create a held weapon slot from a CreatureWeapon */
function held(w: CreatureWeapon): WeaponSlot { return { weapon: w, state: 'held' }; }
/** Helper: create a stowed weapon slot */
function stowed(w: CreatureWeapon): WeaponSlot { return { weapon: w, state: 'stowed' }; }
/** Helper: create a natural attack (always held, 0 hands) */
function natural(id: string, display: string, dice: string, bonus: number, dmgType: string, traits?: string[]): WeaponSlot {
  return held({
    id, display, attackType: 'melee' as const, damageDice: dice, damageBonus: bonus,
    damageType: dmgType as DamageType, hands: 0, isNatural: true, traits,
  });
}

// ─── Bestiary Data ───────────────────────────────────

// @ts-ignore — union too complex for 1600+ entries; runtime types are correct
export const BESTIARY: BestiaryEntry[] = [
`;

  // Group creatures by level
  const byLevel = {};
  for (const c of creatures) {
    if (!byLevel[c.level]) byLevel[c.level] = [];
    byLevel[c.level].push(c);
  }

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
  const bodyParts = [];

  for (const level of levels) {
    bodyParts.push(`\n  // ────────────── Level ${level} ──────────────\n`);
    for (const c of byLevel[level]) {
      bodyParts.push(renderCreature(c));
    }
  }

  const footer = `
];

// ─── Lookup helpers ──────────────────────────────────

/** Get all creatures at a specific level */
export function getCreaturesByLevel(level: number): BestiaryEntry[] {
  return BESTIARY.filter((b) => b.creature.level === level);
}

/** Get all creatures within a level range (inclusive) */
export function getCreaturesInRange(minLevel: number, maxLevel: number): BestiaryEntry[] {
  return BESTIARY.filter((b) => {
    const lv = b.creature.level ?? 0;
    return lv >= minLevel && lv <= maxLevel;
  });
}

/** Get all creatures matching any of the given tags */
export function getCreaturesByTag(tags: string[]): BestiaryEntry[] {
  return BESTIARY.filter((b) => b.tags.some((t) => tags.includes(t)));
}

/** Find a creature by exact name (case-insensitive) */
export function getCreatureByName(name: string): BestiaryEntry | undefined {
  const lower = name.toLowerCase();
  return BESTIARY.find((b) => (b.creature.name ?? '').toLowerCase() === lower);
}

/** Pick a random creature from a list */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
`;

  return header + bodyParts.join('\n') + footer;
}

function writeReport(creatures) {
  const levelCounts = {};
  const tagCounts = {};
  let spellcasterCount = 0;

  for (const c of creatures) {
    levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    for (const tag of c.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    if (c.spells) spellcasterCount++;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(ROOT, SOURCE_FILE).replace(/\\/g, '/'),
    outputFile: path.relative(ROOT, OUTPUT_FILE).replace(/\\/g, '/'),
    creatureCount: creatures.length,
    levelCounts,
    tagCounts,
    spellcasterCount,
    meetsPhase13Target: creatures.length >= 80,
    levelRange: {
      min: Math.min(...creatures.map((c) => c.level)),
      max: Math.max(...creatures.map((c) => c.level)),
    },
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  return report;
}

function run() {
  const source = readSource();
  assert(Array.isArray(source.creatures), 'Expected source.creatures to be an array');

  // Validate
  const seen = new Set();
  source.creatures.forEach((c, i) => {
    validateCreature(c, i);
    assert(!seen.has(c.id), `Duplicate creature id '${c.id}'`);
    seen.add(c.id);
  });

  // Sort by level, then name
  const creatures = source.creatures.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  assert(creatures.length >= 80, `Expected at least 80 creatures, found ${creatures.length}`);

  const tsContent = renderBestiaryTs(creatures);
  fs.writeFileSync(OUTPUT_FILE, tsContent);

  const report = writeReport(creatures);
  console.log(`[foundry-import] Imported ${report.creatureCount} creatures into shared/bestiary.ts`);
  console.log(`[foundry-import] Level range: ${report.levelRange.min} to ${report.levelRange.max}`);
  console.log(`[foundry-import] Spellcasters: ${report.spellcasterCount}`);
}

if (require.main === module) {
  run();
}

module.exports = { run };
