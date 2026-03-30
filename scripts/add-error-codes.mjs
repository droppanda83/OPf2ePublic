/**
 * B.7 - Add errorCode to all success:false validation returns that lack one.
 * Run: node scripts/add-error-codes.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'backend', 'src', 'game');

const FILES = [
  'rules.ts',
  'combatActions.ts',
  'skillActions.ts',
  'classActions.ts',
  'featActions.ts',
];

// Lines that are LEGITIMATE combat outcomes (no errorCode needed)
// These are misses / flat check failures in combatActions.ts
const SKIP_PATTERNS = [
  'the attack missed',
  'the strike missed',
  'critical failure on the strike',
  'fails the flat check',
  'failed the flat check',
  'misses the flat check',
  'attack roll',
  'no damage dealt',
  'missed!',
  // Damage-is-zero outcomes
  'takes 0',
  'resisted all',
];

function classifyMessage(msg) {
  const m = msg.toLowerCase();

  // ── Specific overrides first (order-sensitive) ──

  if (m.includes('dying')) return 'DYING';
  if (m.includes('unconscious') && !m.includes('not found')) return 'UNCONSCIOUS';
  if (m.includes('hero point')) return 'NO_HERO_POINTS';
  if (m.includes('not implemented') || m.includes('not yet implemented') || m.includes('not supported yet')) return 'NOT_IMPLEMENTED';
  if (m.includes('unknown action') || m.includes('unsupported action')) return 'UNKNOWN_ACTION';

  // Flourish (before feat/state checks because messages contain "Flourish action")
  if (m.includes('flourish')) return 'FLOURISH_USED';

  // Reaction already spent
  if (m.includes('reaction') && (m.includes('already used') || m.includes('already spent'))) return 'REACTION_USED';

  // Already in state ("already has X active", "already raging", etc.)
  if (m.includes('already has') || m.includes('already active') || m.includes('is already active') ||
      (m.includes('already') && m.includes('active')) || m.includes('already raging') || m.includes('already in ')) return 'ALREADY_IN_STATE';

  // Already used (encounter/day ability)
  if (m.includes('already used')) return 'ALREADY_USED';

  // Resource checks
  if (m.includes('focus point')) return 'NO_FOCUS_POINTS';
  if (m.includes('reagent')) return 'INSUFFICIENT_RESOURCE';
  if (m.includes('spell slot') || m.includes('no spells')) return 'NO_SPELL_SLOTS';
  if (m.includes('spell not found') || m.includes('unknown spell')) return 'SPELL_NOT_FOUND';

  // ── State prerequisite ("doesn't have X active", "needs Panache", "no active ikon") ──
  // Must come BEFORE the general "does not have" feat check
  if ((m.includes("doesn't have") || m.includes('does not have')) && m.includes('active')) return 'NOT_IN_STATE';
  if (m.includes('has no active')) return 'NOT_IN_STATE';
  if (m.includes('needs panache') || m.includes('need panache')) return 'NOT_IN_STATE';
  if (m.includes('has no ikon') || m.includes('no ikon')) return 'NOT_IN_STATE';

  // ── Feat / class checks ──
  if (m.includes('does not have') || m.includes("doesn't have") || m.includes("doesn't know") || 
      m.includes('does not know') || m.includes('has not learned')) return 'FEAT_NOT_AVAILABLE';

  // Class mismatch: "X is not a Fighter / is not an Investigator"
  if (m.includes('is not a ') || m.includes('is not an ')) return 'CLASS_MISMATCH';

  // ── Target checks ──
  if (m.includes('no weapon specified')) return 'NO_WEAPON';
  if (m.includes('no target') || m.includes('no ally specified') || m.includes('no enemy specified') ||
      m.includes('no redirect target')) return 'NO_TARGET';
  if (m.includes('target not found') || m.includes('ally not found') || m.includes('redirect target not found') ||
      m.includes('not found or is unconscious') || m.includes('creature not found') || m.includes('not found')) return 'TARGET_NOT_FOUND';

  // ── Range / position checks ──
  if (m.includes('out of range') || m.includes('out of melee reach') || m.includes('too far') || 
      m.includes('not adjacent') || m.includes('not in range') || m.includes('not within range') || 
      m.includes('squares away') || m.includes('beyond maximum range')) return 'OUT_OF_RANGE';
  if (m.includes('stride position') || (m.includes('position') && m.includes('must be provided')) ||
      m.includes('no target position')) return 'NO_DESTINATION';

  // ── Weapon / equipment checks ──
  if (m.includes('must be wielding') || m.includes('must wield') || m.includes('must have a weapon') ||
      m.includes('no weapon') || m.includes('weapon is not')) return 'NO_WEAPON';
  if (m.includes('not drawn') || m.includes('weapon not drawn') || m.includes('not wielding')) return 'WEAPON_NOT_DRAWN';
  if (m.includes('two weapons') || m.includes('dual wield') || m.includes('two weapons held')) return 'INSUFFICIENT_WEAPONS';
  if (m.includes('one-handed') || m.includes('weapon type')) return 'WEAPON_TYPE_MISMATCH';
  if (m.includes('more than one held weapon')) return 'TOO_MANY_WEAPONS';
  if (m.includes('free hand')) return 'NO_FREE_HAND';
  if (m.includes('shield') && (m.includes('must have') || m.includes('equipped') || m.includes('must be'))) return 'NO_SHIELD_EQUIPPED';

  // ── Condition / state prerequisites ──
  if (m.includes('not prone') || m.includes('is not prone')) return 'NOT_PRONE';
  if (m.includes('not sickened') || m.includes('is not sickened')) return 'NOT_SICKENED';
  if (m.includes('not raging') || m.includes("isn't raging") || m.includes('not in ')) return 'NOT_IN_STATE';
  if (m.includes('frightened') || m.includes('must be grabbed') || m.includes('must be restrained') ||
      m.includes('must be frightened') || m.includes('is not grabbed') || m.includes('is not prone') ||
      m.includes('is not restrained')) return 'TARGET_CONDITION_UNMET';
  if (m.includes('immune') || m.includes('already demoralized')) return 'TARGET_IMMUNE';

  // ── No valid targets / conditions ──
  if (m.includes('no conditions') || m.includes('no enemies') || m.includes('no targets in range') || 
      m.includes('no valid') || m.includes('no enemies within')) return 'NO_VALID_TARGET';

  // ── Default catch-all ──
  return 'VALIDATION_FAILED';
}

function isSkipLine(line) {
  const l = line.toLowerCase();
  return SKIP_PATTERNS.some(p => l.includes(p));
}

let totalModified = 0;

for (const file of FILES) {
  const filepath = join(BASE, file);
  let content;
  try {
    content = readFileSync(filepath, 'utf8');
  } catch (e) {
    console.log(`  SKIP: ${file} not found`);
    continue;
  }
  
  const lines = content.split('\n');
  let modified = 0;
  let details = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip lines that already have errorCode
    if (line.includes('errorCode')) continue;
    
    // Must contain success: false pattern
    if (!line.includes('success: false')) continue;
    if (!line.includes('message:')) continue;
    
    // Skip legitimate combat outcomes 
    if (isSkipLine(line)) continue;
    
    // Extract message text for classification (works with `, ', or ")
    const msgMatch = line.match(/message:\s*([`'"])([\s\S]*?)\1/);
    const msg = msgMatch ? msgMatch[2] : line;
    
    const errorCode = classifyMessage(msg);
    
    // Insert errorCode before the final closing brace
    // Pattern: find the last `}` followed by optional `;` at end of line
    const newLine = line.replace(
      /\}\s*;?\s*$/,
      `, errorCode: '${errorCode}' };`
    );
    
    if (newLine !== line) {
      lines[i] = newLine;
      modified++;
      details.push(`  L${i+1}: ${errorCode}`);
    }
  }
  
  if (modified > 0) {
    writeFileSync(filepath, lines.join('\n'), 'utf8');
    console.log(`✓ ${file}: ${modified} returns updated`);
    details.forEach(d => console.log(d));
    totalModified += modified;
  } else {
    console.log(`  ${file}: no changes needed`);
  }
}

console.log(`\nTotal: ${totalModified} returns updated across ${FILES.length} files`);
