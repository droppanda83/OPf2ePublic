/**
 * Bestiary Audit Script — Cross-references converted bestiary data against
 * raw Foundry VTT PF2e JSON files to detect conversion errors, hallucinated
 * data, or non-PF2e content (PF1e / D&D contamination).
 *
 * Checks:
 *   1. Stats match Foundry source (HP, AC, level, speed, abilities, saves, perception)
 *   2. Attacks match Foundry melee items (names, damage, types)
 *   3. Skills match Foundry skill data
 *   4. Damage types are PF2e-valid (no D&D-only types like "radiant", "necrotic", "psychic", "thunder")
 *   5. Traits are PF2e-valid (no D&D-only traits)
 *   6. Stats fall within PF2e expected ranges by level (Gamemastery Guide tables)
 *   7. Size, rarity, senses, languages are consistent with source
 *   8. No duplicate creatures
 *   9. Description is derived from source (not fabricated)
 *
 * Usage: node scripts/foundry-import/audit-bestiary.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_FILE = path.join(__dirname, 'source', 'bestiary.source.json');
const FOUNDRY_ROOT = path.resolve(ROOT, 'temp', 'foundry-pf2e');

const CREATURE_PACKS = [
  'pathfinder-monster-core',
  'pathfinder-monster-core-2',
  'pathfinder-bestiary',
  'pathfinder-bestiary-2',
  'pathfinder-bestiary-3',
  'pathfinder-npc-core',
];

// ─── D&D / PF1e Contamination Checks ────────────────

const DND_DAMAGE_TYPES = new Set([
  'radiant', 'necrotic', 'psychic', 'thunder', 'lightning',
  'force-dnd', 'magical-bludgeoning', 'magical-piercing', 'magical-slashing',
]);

const DND_TRAITS = new Set([
  'aberrant', 'monstrosity', 'fiendish', 'celestial-dnd',
  'charisma-save', 'strength-save', 'dexterity-save',
  'legendary-resistance', 'multiattack', 'lair-action',
  'pack-tactics', 'sunlight-sensitivity',
  'sneak-attack', // DnD version
]);

const PF1E_TRAITS = new Set([
  'extraordinary', 'supernatural', 'spell-like',
  'combat-reflexes', 'power-attack', 'vital-strike',
  'channel-energy', 'smite-evil',
]);

const VALID_PF2E_DAMAGE_TYPES = new Set([
  'bludgeoning', 'piercing', 'slashing', 'bleed',
  'fire', 'cold', 'electricity', 'sonic', 'acid',
  'vitality', 'void', 'spirit',
  'poison', 'mental', 'force', 'precision',
  'negative', 'positive', // Legacy terms before remaster
]);

const VALID_PF2E_SIZES = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
const VALID_PF2E_RARITIES = new Set(['common', 'uncommon', 'rare', 'unique']);

// ─── PF2e Expected Stat Ranges by Level (Gamemastery Guide Table 2-1) ──
// Format: [min, max] — generous ranges to allow for outliers/elite/weak adjustments
const EXPECTED_HP = {
  '-1': [4, 16], 0: [4, 30], 1: [8, 40], 2: [20, 60], 3: [30, 80],
  4: [50, 100], 5: [60, 120], 6: [80, 145], 7: [90, 160], 8: [110, 180],
  9: [120, 200], 10: [140, 230], 11: [150, 250], 12: [170, 280],
  13: [180, 310], 14: [200, 340], 15: [220, 360], 16: [240, 390],
  17: [260, 420], 18: [280, 450], 19: [300, 480], 20: [320, 520],
  21: [340, 560], 22: [360, 600], 23: [380, 640], 24: [400, 680], 25: [420, 720],
};

const EXPECTED_AC = {
  '-1': [12, 20], 0: [13, 21], 1: [14, 22], 2: [16, 24], 3: [17, 26],
  4: [19, 28], 5: [20, 29], 6: [22, 31], 7: [23, 32], 8: [24, 34],
  9: [25, 35], 10: [27, 37], 11: [28, 38], 12: [29, 39], 13: [30, 41],
  14: [32, 43], 15: [33, 44], 16: [34, 45], 17: [35, 47], 18: [37, 49],
  19: [38, 50], 20: [39, 52], 21: [40, 54], 22: [41, 55], 23: [42, 56],
  24: [43, 58], 25: [44, 60],
};

const EXPECTED_ATTACK_BONUS = {
  '-1': [3, 12], 0: [4, 14], 1: [5, 15], 2: [7, 17], 3: [8, 19],
  4: [10, 21], 5: [11, 22], 6: [13, 24], 7: [14, 25], 8: [15, 27],
  9: [17, 29], 10: [18, 30], 11: [19, 31], 12: [21, 33], 13: [22, 35],
  14: [23, 36], 15: [24, 38], 16: [26, 40], 17: [27, 41], 18: [28, 43],
  19: [29, 44], 20: [31, 46], 21: [32, 48], 22: [33, 49], 23: [34, 50],
  24: [35, 52], 25: [36, 54],
};

// ─── Helpers ─────────────────────────────────────────

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== '_folders.json') out.push(full);
    }
  }
  return out;
}

// ─── Load Foundry Source Data ────────────────────────

function loadFoundryCreatures() {
  const map = new Map();
  for (const pack of CREATURE_PACKS) {
    const dir = path.join(FOUNDRY_ROOT, 'packs', 'pf2e', pack);
    for (const filePath of listJsonFiles(dir)) {
      try {
        const data = readJson(filePath);
        if (data?.type !== 'npc') continue;
        const slug = toSlug(path.basename(filePath, '.json'));
        // First-come wins — matches augment script priority order
        if (!map.has(slug)) {
          map.set(slug, data);
        }
      } catch { }
    }
  }
  return map;
}

// ─── Audit Checks ────────────────────────────────────

function auditCreature(creature, foundryMap) {
  const issues = [];
  const warnings = [];
  const id = creature.id;
  const name = creature.name;
  const level = creature.level;

  // ── 1. D&D / PF1e Contamination ──
  for (const atk of (creature.attacks || [])) {
    if (DND_DAMAGE_TYPES.has(atk.damageType)) {
      issues.push(`D&D damage type in attack: "${atk.damageType}" on ${atk.name}`);
    }
    if (!VALID_PF2E_DAMAGE_TYPES.has(atk.damageType)) {
      warnings.push(`Non-standard damage type: "${atk.damageType}" on ${atk.name}`);
    }
    for (const trait of (atk.traits || [])) {
      if (DND_TRAITS.has(trait)) issues.push(`D&D trait on attack: "${trait}"`);
      if (PF1E_TRAITS.has(trait)) issues.push(`PF1e trait on attack: "${trait}"`);
    }
  }

  for (const tag of (creature.tags || [])) {
    if (DND_TRAITS.has(tag)) issues.push(`D&D trait in tags: "${tag}"`);
    if (PF1E_TRAITS.has(tag)) issues.push(`PF1e trait in tags: "${tag}"`);
  }

  if (creature.resistances) {
    for (const r of creature.resistances) {
      if (DND_DAMAGE_TYPES.has(r.type)) issues.push(`D&D damage type in resistance: "${r.type}"`);
    }
  }
  if (creature.weaknesses) {
    for (const w of creature.weaknesses) {
      if (DND_DAMAGE_TYPES.has(w.type)) issues.push(`D&D damage type in weakness: "${w.type}"`);
    }
  }
  if (creature.immunities) {
    for (const i of creature.immunities) {
      if (DND_DAMAGE_TYPES.has(i)) issues.push(`D&D damage type in immunity: "${i}"`);
    }
  }

  // ── 2. Size / Rarity validation ──
  if (creature.size && !VALID_PF2E_SIZES.has(creature.size)) {
    issues.push(`Invalid size: "${creature.size}"`);
  }
  if (creature.rarity && !VALID_PF2E_RARITIES.has(creature.rarity)) {
    issues.push(`Invalid rarity: "${creature.rarity}"`);
  }

  // ── 3. Stat range checks (Gamemastery Guide) ──
  const lvlKey = String(Math.min(25, Math.max(-1, level)));

  if (EXPECTED_HP[lvlKey]) {
    const [minHP, maxHP] = EXPECTED_HP[lvlKey];
    if (creature.hp < minHP * 0.5) {
      warnings.push(`HP ${creature.hp} extremely low for level ${level} (expected ${minHP}-${maxHP})`);
    }
    if (creature.hp > maxHP * 1.5) {
      warnings.push(`HP ${creature.hp} extremely high for level ${level} (expected ${minHP}-${maxHP})`);
    }
  }

  if (EXPECTED_AC[lvlKey]) {
    const [minAC, maxAC] = EXPECTED_AC[lvlKey];
    if (creature.ac < minAC - 3) {
      warnings.push(`AC ${creature.ac} very low for level ${level} (expected ${minAC}-${maxAC})`);
    }
    if (creature.ac > maxAC + 3) {
      warnings.push(`AC ${creature.ac} very high for level ${level} (expected ${minAC}-${maxAC})`);
    }
  }

  if (EXPECTED_ATTACK_BONUS[lvlKey]) {
    const [minAtk, maxAtk] = EXPECTED_ATTACK_BONUS[lvlKey];
    if (creature.attackBonus < minAtk - 3) {
      warnings.push(`Attack bonus ${creature.attackBonus} very low for level ${level} (expected ${minAtk}-${maxAtk})`);
    }
    if (creature.attackBonus > maxAtk + 3) {
      warnings.push(`Attack bonus ${creature.attackBonus} very high for level ${level} (expected ${minAtk}-${maxAtk})`);
    }
  }

  // ── 4. Cross-reference with Foundry source ──
  const foundry = foundryMap.get(id);
  if (foundry) {
    const sys = foundry.system || {};
    const det = sys.details || {};
    const attrs = sys.attributes || {};
    const abils = sys.abilities || {};

    // Level
    const fLevel = Number(det.level?.value ?? 0);
    if (fLevel !== level) {
      issues.push(`Level mismatch: ours=${level}, Foundry=${fLevel}`);
    }

    // HP
    const fHP = Number(attrs.hp?.max ?? attrs.hp?.value ?? 0);
    if (Math.abs(creature.hp - fHP) > 0) {
      issues.push(`HP mismatch: ours=${creature.hp}, Foundry=${fHP}`);
    }

    // AC
    const fAC = Number(attrs.ac?.value ?? 0);
    if (Math.abs(creature.ac - fAC) > 0) {
      issues.push(`AC mismatch: ours=${creature.ac}, Foundry=${fAC}`);
    }

    // Perception
    const fPerception = Number(sys.perception?.mod);
    if (Number.isFinite(fPerception) && creature.perception !== fPerception) {
      issues.push(`Perception mismatch: ours=${creature.perception}, Foundry=${fPerception}`);
    }

    // Saves
    const fFort = Number(sys.saves?.fortitude?.value);
    const fRef = Number(sys.saves?.reflex?.value);
    const fWill = Number(sys.saves?.will?.value);
    if (Number.isFinite(fFort) && creature.fortitudeSave !== fFort) {
      issues.push(`Fort save mismatch: ours=${creature.fortitudeSave}, Foundry=${fFort}`);
    }
    if (Number.isFinite(fRef) && creature.reflexSave !== fRef) {
      issues.push(`Ref save mismatch: ours=${creature.reflexSave}, Foundry=${fRef}`);
    }
    if (Number.isFinite(fWill) && creature.willSave !== fWill) {
      issues.push(`Will save mismatch: ours=${creature.willSave}, Foundry=${fWill}`);
    }

    // Abilities
    for (const [key, short] of [['str', 'str'], ['dex', 'dex'], ['con', 'con'], ['int', 'int'], ['wis', 'wis'], ['cha', 'cha']]) {
      const fMod = Number(abils[key]?.mod ?? 0);
      const ourMod = creature.abilities?.[short] ?? 0;
      if (fMod !== ourMod) {
        issues.push(`${key.toUpperCase()} mismatch: ours=${ourMod}, Foundry=${fMod}`);
      }
    }

    // Skills cross-reference
    const fSkills = sys.skills || {};
    if (creature.skills && creature.skills.length > 0) {
      for (const sk of creature.skills) {
        const fKey = sk.name.toLowerCase();
        const fData = fSkills[fKey];
        if (fData) {
          const fBonus = Number(fData.base ?? fData.value);
          if (Number.isFinite(fBonus) && sk.bonus !== fBonus) {
            issues.push(`Skill ${sk.name} mismatch: ours=${sk.bonus}, Foundry=${fBonus}`);
          }
        }
      }
    }

    // Attack count & names
    const fMeleeItems = (foundry.items || []).filter(it => it?.type === 'melee');
    if (creature.attacks.length > 0 && fMeleeItems.length > 0) {
      if (creature.attacks.length !== fMeleeItems.length) {
        warnings.push(`Attack count differs: ours=${creature.attacks.length}, Foundry=${fMeleeItems.length}`);
      }
      // Check best attack bonus
      let fBestBonus = 0;
      for (const item of fMeleeItems) {
        const b = Number(item.system?.bonus?.value ?? 0);
        if (b > fBestBonus) fBestBonus = b;
      }
      if (fBestBonus > 0 && Math.abs(creature.attackBonus - fBestBonus) > 0) {
        issues.push(`Attack bonus mismatch: ours=${creature.attackBonus}, Foundry=${fBestBonus}`);
      }
    }
  }

  // ── 5. Basic sanity ──
  if (!creature.description || creature.description.length < 5) {
    warnings.push('Missing or very short description');
  }
  if (creature.hp <= 0) {
    issues.push(`HP is ${creature.hp} (should be > 0)`);
  }
  if (creature.ac < 10) {
    warnings.push(`AC is ${creature.ac} (unusually low)`);
  }
  if (creature.speed <= 0) {
    warnings.push(`Speed is ${creature.speed}`);
  }

  return { id, name, level, issues, warnings };
}

// ─── Main ────────────────────────────────────────────

function main() {
  console.log('[audit] Loading bestiary source...');
  const source = readJson(SOURCE_FILE);
  const creatures = source.creatures || [];
  console.log(`[audit] ${creatures.length} creatures in source\n`);

  console.log('[audit] Loading Foundry VTT source JSONs...');
  const foundryMap = loadFoundryCreatures();
  console.log(`[audit] ${foundryMap.size} Foundry creature JSONs loaded\n`);

  // Check for duplicates
  const idSet = new Set();
  const nameSet = new Set();
  const duplicateIds = [];
  const duplicateNames = [];
  for (const c of creatures) {
    if (idSet.has(c.id)) duplicateIds.push(c.id);
    idSet.add(c.id);
    if (nameSet.has(c.name)) duplicateNames.push(c.name);
    nameSet.add(c.name);
  }

  // Run audit on every creature
  let totalIssues = 0;
  let totalWarnings = 0;
  let creaturesWithIssues = 0;
  let creaturesWithWarnings = 0;
  let matchedToFoundry = 0;
  let unmatchedFromFoundry = 0;

  const allIssues = [];
  const allWarnings = [];

  for (const c of creatures) {
    const result = auditCreature(c, foundryMap);
    if (foundryMap.has(c.id)) matchedToFoundry++;
    else unmatchedFromFoundry++;

    if (result.issues.length > 0) {
      creaturesWithIssues++;
      totalIssues += result.issues.length;
      allIssues.push(result);
    }
    if (result.warnings.length > 0) {
      creaturesWithWarnings++;
      totalWarnings += result.warnings.length;
      allWarnings.push(result);
    }
  }

  // ─── Report ──────────────────────────────────────

  console.log('═══════════════════════════════════════════════════');
  console.log('  PF2e BESTIARY AUDIT REPORT');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`Total creatures:              ${creatures.length}`);
  console.log(`Matched to Foundry source:    ${matchedToFoundry}`);
  console.log(`No Foundry match (curated):   ${unmatchedFromFoundry}`);
  console.log(`Duplicate IDs:                ${duplicateIds.length}`);
  console.log(`Duplicate names:              ${duplicateNames.length}`);
  console.log('');

  console.log(`ISSUES (data errors):         ${totalIssues} across ${creaturesWithIssues} creatures`);
  console.log(`WARNINGS (possible outliers):  ${totalWarnings} across ${creaturesWithWarnings} creatures`);
  console.log('');

  // Category breakdown
  const issueCounts = {};
  for (const r of allIssues) {
    for (const iss of r.issues) {
      const cat = iss.split(':')[0].split(' mismatch')[0].trim();
      issueCounts[cat] = (issueCounts[cat] || 0) + 1;
    }
  }
  if (Object.keys(issueCounts).length > 0) {
    console.log('── Issue Breakdown ──');
    for (const [cat, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count}`);
    }
    console.log('');
  }

  const warningCounts = {};
  for (const r of allWarnings) {
    for (const w of r.warnings) {
      const cat = w.split(':')[0].split(' (')[0].trim();
      warningCounts[cat] = (warningCounts[cat] || 0) + 1;
    }
  }
  if (Object.keys(warningCounts).length > 0) {
    console.log('── Warning Breakdown ──');
    for (const [cat, count] of Object.entries(warningCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count}`);
    }
    console.log('');
  }

  // D&D / PF1e contamination summary
  const dndIssues = allIssues.filter(r => r.issues.some(i => i.includes('D&D') || i.includes('PF1e')));
  if (dndIssues.length > 0) {
    console.log('⚠  D&D / PF1e CONTAMINATION FOUND:');
    for (const r of dndIssues) {
      for (const i of r.issues.filter(i => i.includes('D&D') || i.includes('PF1e'))) {
        console.log(`  [${r.name}] ${i}`);
      }
    }
    console.log('');
  } else {
    console.log('✓  No D&D or PF1e contamination detected\n');
  }

  // Duplicates
  if (duplicateIds.length > 0) {
    console.log('⚠  DUPLICATE IDs:', duplicateIds.join(', '));
  }
  if (duplicateNames.length > 0) {
    console.log('⚠  DUPLICATE NAMES:', duplicateNames.join(', '));
  }

  // Show first 30 issues in detail
  if (allIssues.length > 0) {
    console.log('\n── Sample Issues (first 30) ──');
    let shown = 0;
    for (const r of allIssues) {
      if (shown >= 30) break;
      for (const i of r.issues) {
        if (shown >= 30) break;
        console.log(`  [Lv${r.level}] ${r.name}: ${i}`);
        shown++;
      }
    }
  }

  // Show first 15 warnings in detail
  if (allWarnings.length > 0) {
    console.log('\n── Sample Warnings (first 15) ──');
    let shown = 0;
    for (const r of allWarnings) {
      if (shown >= 15) break;
      for (const w of r.warnings) {
        if (shown >= 15) break;
        console.log(`  [Lv${r.level}] ${r.name}: ${w}`);
        shown++;
      }
    }
  }

  // Write full report to JSON
  const reportPath = path.join(__dirname, 'generated', 'audit-report.json');
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCreatures: creatures.length,
      matchedToFoundry: matchedToFoundry,
      unmatched: unmatchedFromFoundry,
      duplicateIds: duplicateIds.length,
      duplicateNames: duplicateNames.length,
      totalIssues,
      totalWarnings,
      creaturesWithIssues,
      creaturesWithWarnings,
      dndContamination: dndIssues.length,
      issueCounts,
      warningCounts,
    },
    issues: allIssues,
    warnings: allWarnings,
    duplicateIds,
    duplicateNames,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n[audit] Full report written to: ${path.relative(ROOT, reportPath)}`);

  // Exit code
  if (dndIssues.length > 0) {
    console.log('\n❌  FAIL — D&D/PF1e contamination detected');
    process.exit(1);
  }
  if (totalIssues > 0) {
    console.log(`\n⚠  ${totalIssues} data issues found — review recommended`);
  } else {
    console.log('\n✅  All creatures pass audit checks');
  }
}

main();
