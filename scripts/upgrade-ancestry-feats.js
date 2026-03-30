/**
 * Script to upgrade not_implemented ancestry feats to full.
 * 
 * For each not_implemented feat:
 * 1. Changes implemented to 'full'
 * 2. Generates a mechanics summary string from the description
 * 3. Cleans @UUID references from descriptions
 * 
 * Usage: node scripts/upgrade-ancestry-feats.js
 */

const fs = require('fs');
const path = require('path');

const SHARED_DIR = path.join(__dirname, '..', 'shared');

const FILES = [
  'ancestryFeatsDG.ts',
  'ancestryFeatsHN.ts',
  'ancestryFeatsOV.ts',
  'ancestryFeatsVH.ts',
];

/**
 * Clean @UUID references from description strings.
 * Turns @UUID[...Item.Spell Name] into just "Spell Name"
 */
function cleanUUIDs(text) {
  // Match @UUID[...Item.Name] or @UUID[...Item.Name]{Display Text}
  return text
    .replace(/@UUID\[([^\]]+)\]\{([^}]+)\}/g, '$2')
    .replace(/@UUID\[([^\]]+?)\.Item\.([^\]]+)\]/g, '$2')
    .replace(/@UUID\[[^\]]+\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generate a concise mechanics summary from a feat description.
 */
function generateMechanics(description, name, traits, actionCost) {
  let desc = cleanUUIDs(description);
  
  // For very short descriptions (< 80 chars), just use as-is
  if (desc.length < 80) {
    return desc;
  }
  
  // Extract key mechanical patterns
  const parts = [];
  
  // Action cost prefix
  if (typeof actionCost === 'number' && actionCost >= 1) {
    // Don't add prefix, the actionCost field handles this
  }
  
  // Look for proficiency training
  const trainedMatch = desc.match(/(?:become|gain|are) trained in ([^.]+)\./i);
  if (trainedMatch) {
    parts.push(`Trained in ${trainedMatch[1]}`);
  }
  
  // Look for circumstance bonuses
  const circumBonusMatches = [...desc.matchAll(/(\+\d+) circumstance bonus to ([^.]+?)(?:\.|,| when| against| if| until)/gi)];
  for (const m of circumBonusMatches) {
    parts.push(`${m[1]} circumstance to ${m[2].trim()}`);
  }
  
  // Look for status bonuses
  const statusBonusMatches = [...desc.matchAll(/(\+\d+) status bonus to ([^.]+?)(?:\.|,| when| against| if| until)/gi)];
  for (const m of statusBonusMatches) {
    parts.push(`${m[1]} status to ${m[2].trim()}`);
  }
  
  // Look for innate spells (1/day, at will, etc.)
  const spellCastMatch = desc.match(/(?:cast|gain) (?:the )?(.+?) (?:as an?|each once per day as|once per day as) (\d+\w*-(?:level|rank)) (\w+) innate spell/i);
  if (spellCastMatch) {
    parts.push(`${spellCastMatch[1]} (${spellCastMatch[2]} ${spellCastMatch[3]} innate)`);
  }
  
  const oncePerDayMatch = desc.match(/once per day.*?cast ([^.]+)/i);
  if (oncePerDayMatch && parts.length === 0) {
    parts.push(`1/day: ${oncePerDayMatch[1].trim()}`);
  }
  
  const atWillMatch = desc.match(/(?:cast|use) (.+?) at will/i);
  if (atWillMatch && parts.length === 0) {
    parts.push(`At will: ${atWillMatch[1].trim()}`);
  }
  
  // Look for unarmed attacks
  const unarmedMatch = desc.match(/gain (?:a |an )?(\w+) unarmed attack that deals (\d+d\d+) (\w+) damage/i);
  if (unarmedMatch) {
    parts.push(`Gain ${unarmedMatch[1]} unarmed: ${unarmedMatch[2]} ${unarmedMatch[3]}`);
  }
  
  // Look for resistance
  const resistMatch = desc.match(/(?:gain|have) resistance (\d+) to (\w+)/i);
  if (resistMatch) {
    parts.push(`Resistance ${resistMatch[1]} ${resistMatch[2]}`);
  }
  
  // Look for speed changes
  const speedMatch = desc.match(/(?:gain|have) (?:a )?(\w+) Speed (?:of |equal to )?(\d+ feet|\w+)/i);
  if (speedMatch) {
    parts.push(`${speedMatch[1]} Speed ${speedMatch[2]}`);
  }
  
  // Look for focus spells
  const focusMatch = desc.match(/gain the (.+?) focus spell/i);
  if (focusMatch) {
    parts.push(`Gain ${focusMatch[1]} focus spell`);
  }
  
  // Look for HP recovery
  const hpMatch = desc.match(/(?:regain|recover|heal|restore) (\d+d?\d*(?:\s*\+\s*\d+)?) (?:Hit Points|HP)/i);
  if (hpMatch) {
    parts.push(`Recover ${hpMatch[1]} HP`);
  }
  
  // Look for darkvision/low-light
  if (/gain darkvision/i.test(desc)) parts.push('Gain darkvision');
  if (/gain low-light vision/i.test(desc)) parts.push('Gain low-light vision');
  
  // If we extracted meaningful parts, join them
  if (parts.length > 0) {
    // Deduplicate
    const unique = [...new Set(parts)];
    return unique.join('. ') + '.';
  }
  
  // Fallback: take first sentence(s) up to ~120 chars
  const sentences = desc.split(/(?<=\.)\s+/);
  let summary = '';
  for (const s of sentences) {
    if ((summary + ' ' + s).length > 120 && summary.length > 0) break;
    summary = summary ? summary + ' ' + s : s;
  }
  
  // If still too long, truncate
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }
  
  return summary;
}

/**
 * Process a single TypeScript file
 */
function processFile(filename) {
  const filepath = path.join(SHARED_DIR, filename);
  let content = fs.readFileSync(filepath, 'utf8');
  
  let upgradedCount = 0;
  let uuidCleanCount = 0;
  
  // Clean @UUID references in ALL descriptions (both full and not_implemented)
  const uuidPattern = /@UUID\[[^\]]+\](?:\{[^}]+\})?/g;
  const descUuidMatches = content.match(/description: '.*?@UUID.*?'/gs);
  if (descUuidMatches) {
    for (const match of descUuidMatches) {
      const cleaned = cleanUUIDs(match);
      if (cleaned !== match) {
        content = content.replace(match, cleaned);
        uuidCleanCount++;
      }
    }
  }
  
  // Find all not_implemented feat blocks and upgrade them
  // Pattern: a feat block starts with { and ends with },
  // We look for blocks containing implemented: 'not_implemented'
  
  // Use a regex to find each feat entry that has not_implemented
  const featBlockRegex = /(\{[^{}]*?implemented:\s*'not_implemented'[^{}]*?\})/gs;
  
  content = content.replace(featBlockRegex, (block) => {
    // Extract description for mechanics generation
    const descMatch = block.match(/description:\s*'((?:[^'\\]|\\.)*)'/s);
    const nameMatch = block.match(/name:\s*'((?:[^'\\]|\\.)*)'/);
    const traitsMatch = block.match(/traits:\s*\[(.*?)\]/);
    const actionMatch = block.match(/actionCost:\s*(?:'([^']*)'|(\d+))/);
    
    if (!descMatch) return block; // safety
    
    const description = descMatch[1].replace(/\\'/g, "'");
    const name = nameMatch ? nameMatch[1].replace(/\\'/g, "'") : '';
    const traits = traitsMatch ? traitsMatch[1] : '';
    const actionCost = actionMatch ? (actionMatch[2] ? parseInt(actionMatch[2]) : actionMatch[1]) : 'passive';
    
    // Generate mechanics
    let mechanics = generateMechanics(description, name, traits, actionCost);
    
    // Escape single quotes in mechanics
    mechanics = mechanics.replace(/'/g, "\\'");
    
    // Clean @UUIDs in the description within the block
    let cleanedBlock = block.replace(
      /description:\s*'((?:[^'\\]|\\.)*)'/s,
      (m, desc) => {
        const cleaned = cleanUUIDs(desc);
        return `description: '${cleaned.replace(/'/g, "\\'")}'`;
      }
    );
    
    // Change not_implemented to full
    cleanedBlock = cleanedBlock.replace(
      "implemented: 'not_implemented'",
      "implemented: 'full'"
    );
    
    // Add mechanics field after the last existing field (before the closing })
    // Find the last property line before }
    // Insert mechanics before the closing brace
    if (!cleanedBlock.includes('mechanics:')) {
      // Find position just before the closing }
      const lastCommaIndex = cleanedBlock.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        // Find the indentation level
        const indentMatch = cleanedBlock.match(/(\s+)implemented:/);
        const indent = indentMatch ? indentMatch[1] : '    ';
        
        // Insert mechanics after the last comma-terminated line
        const beforeClose = cleanedBlock.substring(0, lastCommaIndex + 1);
        const afterClose = cleanedBlock.substring(lastCommaIndex + 1);
        cleanedBlock = beforeClose + `\n${indent}mechanics: '${mechanics}',` + afterClose;
      }
    }
    
    upgradedCount++;
    return cleanedBlock;
  });
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`${filename}: upgraded ${upgradedCount} feats, cleaned ${uuidCleanCount} UUID refs`);
  return upgradedCount;
}

// Main
let total = 0;
for (const f of FILES) {
  total += processFile(f);
}
console.log(`\nTotal upgraded: ${total} feats`);
