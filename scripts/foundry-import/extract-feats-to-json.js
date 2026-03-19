/**
 * One-time helper: extract existing feat data from TS files into feats.source.json
 * Run: node scripts/foundry-import/extract-feats-to-json.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT = path.join(__dirname, 'source', 'feats.source.json');

function extractFeats(filePath, expectedCategory) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const feats = [];

  // Match each feat object block
  const regex = /\{\s*\n\s+id:\s*'([^']+)',\s*\n\s+name:\s*'([^']*(?:\\.[^']*)*)',\s*\n\s+source:\s*(null|'[^']*(?:\\.[^']*)*'),\s*\n\s+category:\s*'([^']+)',\s*\n\s+level:\s*(\d+),\s*\n\s+description:\s*'((?:[^'\\]|\\.)*)',\s*\n\s+implemented:\s*'([^']+)'([\s\S]*?)\n\s+\},/g;

  let match;
  while ((match = regex.exec(raw)) !== null) {
    const feat = {
      id: match[1],
      name: match[2].replace(/\\'/g, "'"),
      category: match[4],
      level: parseInt(match[5]),
      description: match[6].replace(/\\'/g, "'").replace(/\\\\/g, "\\"),
      implemented: match[7],
    };

    // Source
    const srcMatch = match[3];
    if (srcMatch !== 'null') {
      feat.source = srcMatch.replace(/^'|'$/g, '').replace(/\\'/g, "'");
    }

    // Parse optional fields from the rest
    const rest = match[8];
    
    // traits
    const traitsMatch = /traits:\s*\[([^\]]*)\]/.exec(rest);
    if (traitsMatch) {
      feat.traits = traitsMatch[1].match(/'([^']*)'/g)?.map(s => s.replace(/'/g, '')) || [];
    }

    // actionCost
    const acMatch = /actionCost:\s*('([^']+)'|(\d+))/.exec(rest);
    if (acMatch) {
      feat.actionCost = acMatch[2] || parseInt(acMatch[3]);
    }

    // prerequisites
    const preMatch = /prerequisites:\s*\[([^\]]*)\]/.exec(rest);
    if (preMatch) {
      feat.prerequisites = preMatch[1].match(/'((?:[^'\\]|\\.)*)'/g)?.map(s => s.replace(/^'|'$/g, '').replace(/\\'/g, "'")) || [];
    }

    feats.push(feat);
  }

  return feats;
}

const ancestryFile = path.join(ROOT, 'shared', 'ancestryFeats.ts');
const generalFile = path.join(ROOT, 'shared', 'generalFeats.ts');
const skillFile = path.join(ROOT, 'shared', 'skillFeats.ts');

const ancestry = extractFeats(ancestryFile, 'ancestry');
const general = extractFeats(generalFile, 'general');
const skill = extractFeats(skillFile, 'skill');

console.log(`Extracted: ${ancestry.length} ancestry, ${general.length} general, ${skill.length} skill`);

const allFeats = [...ancestry, ...general, ...skill];

// Check for duplicates
const ids = new Set();
for (const f of allFeats) {
  if (ids.has(f.id)) {
    console.warn(`DUPLICATE: ${f.id}`);
  }
  ids.add(f.id);
}

const output = {
  meta: {
    source: "PF2e Remaster Player Core (ORC License)",
    generatedFor: "PF2e Rebirth tactical combat game",
    version: "1.0.0",
    notes: "Ancestry, general, and skill feats. Class feats managed separately."
  },
  feats: allFeats
};

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
console.log(`Written ${allFeats.length} feats to ${OUTPUT}`);
