/**
 * Foundry PF2e Equipment → wornItems.ts / adventuringGear.ts converter
 *
 * Usage:  node scripts/convertFoundryEquipment.js
 *
 * Reads  pf2e-data/packs/pf2e/equipment/*.json
 * Writes shared/wornItems.generated.ts   (MagicItem catalog)
 *        shared/adventuringGear.generated.ts  (GearItem catalog)
 */

const fs   = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────
const DATA_DIR   = path.join(__dirname, '..', 'pf2e-data', 'packs', 'pf2e', 'equipment');
const OUT_WORN   = path.join(__dirname, '..', 'shared', 'wornItems.generated.ts');
const OUT_GEAR   = path.join(__dirname, '..', 'shared', 'adventuringGear.generated.ts');

// ── Source book filter (remaster core + supplements) ───────────────
const CORE_BOOKS = new Set([
  'Pathfinder GM Core',
  'Pathfinder Player Core',
  'Pathfinder Player Core 2',
  'Pathfinder Treasure Vault (Remastered)',
  'Pathfinder Rage of Elements',
  'Pathfinder Howl of the Wild',
  'Pathfinder War of Immortals',
  'Pathfinder Dark Archive (Remastered)',
  'Pathfinder Battlecry!',
  'Pathfinder Beginner Box',
  'Pathfinder Lost Omens Tian Xia Character Guide',
  'Pathfinder Lost Omens Rival Academies',
  'Pathfinder Lost Omens Shining Kingdoms',
  'Pathfinder Lost Omens Draconic Codex',
  'Pathfinder Lost Omens Divine Mysteries',
  'Pathfinder Monster Core',
  'Pathfinder Monster Core 2',
  'Pathfinder NPC Core',
]);

// ── Slot mapping: Foundry usage → our WornSlot ────────────────────
const USAGE_TO_SLOT = {
  wornarmbands:  'bracers',
  wornbracers:   'bracers',
  wornbracelet:  'bracers',
  wornboots:     'boots',    // not in Foundry but just in case
  wornshoes:     'boots',
  wornanklets:   'boots',
  worncloak:     'cloak',
  worncape:      'cloak',
  wornnecklace:  'necklace',
  worncollar:    'necklace',
  wornamulet:    'necklace',
  wornheadwear:  'headwear',
  worncirclet:   'headwear',
  wornmask:      'headwear',
  worneyepiece:  'eyepiece',
  worneyeglasses:'eyepiece',
  wornbelt:      'belt',
  worngloves:    'gloves',
  wornring:      'ring',
  wornclothing:  'worn',
  worngarment:   'worn',
  worn:          'worn',
  wornbackpack:  'worn',
  wornepaulet:   'worn',
  'worn-under-armor': 'worn',
  'worn-and-attached-to-two-weapons': 'worn',
  // Skip these (animal items)
  wornhorseshoes: null,
  wornsaddle:     null,
};

// ── Helpers ────────────────────────────────────────────────────────

/** Strip HTML tags, Foundry @UUID references, [[/r ...]] rolls, and clean up */
function stripHtml(html) {
  if (!html) return '';
  return html
    // Remove @Embed references entirely
    .replace(/@Embed\[[^\]]+\][^\s]*/g, '')
    // Replace @UUID references with just the display name
    .replace(/@UUID\[.*?\]\{([^}]+)\}/g, '$1')
    .replace(/@UUID\[.*?\.Item\.([^\]]+)\]/g, '$1')
    // Replace Foundry roll syntax
    .replace(/\[\[\/r\s+[^\]]+\]\]\{([^}]+)\}/g, '$1')
    .replace(/\[\[\/r\s+[^\]]+\]\]/g, '')
    // Replace action glyphs
    .replace(/<span class="action-glyph">1<\/span>/g, '(1 action)')
    .replace(/<span class="action-glyph">2<\/span>/g, '(2 actions)')
    .replace(/<span class="action-glyph">3<\/span>/g, '(3 actions)')
    .replace(/<span class="action-glyph">R<\/span>/g, '(reaction)')
    .replace(/<span class="action-glyph">F<\/span>/g, '(free action)')
    .replace(/<span class="action-glyph">[^<]*<\/span>/g, '')
    // Replace <hr /> with separator
    .replace(/<hr\s*\/?>/g, ' | ')
    // Replace list items
    .replace(/<li>/g, '• ')
    .replace(/<\/li>/g, ' ')
    // Replace paragraph/block breaks
    .replace(/<\/p>\s*<p>/g, ' ')
    .replace(/<br\s*\/?>/g, ' ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .replace(/\s*\|\s*\|\s*/g, ' | ')
    .trim();
}

/** Convert Foundry price object to gp number */
function priceToGp(priceObj) {
  if (!priceObj || !priceObj.value) return 0;
  const v = priceObj.value;
  let total = 0;
  if (v.gp) total += v.gp;
  if (v.sp) total += v.sp / 10;
  if (v.cp) total += v.cp / 100;
  return Math.round(total * 100) / 100; // avoid floating point
}

/** Convert Foundry bulk to our format */
function convertBulk(bulkVal) {
  if (bulkVal === 0.1) return "'L'";
  if (bulkVal === 0 || bulkVal === null || bulkVal === undefined) return '0';
  return String(Math.round(bulkVal));
}

/** Create a slug ID from name */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Extract first sentence as description, rest as effect */
function splitDescEffect(rawHtml) {
  const text = stripHtml(rawHtml);
  
  // Try to split at first " | " (which was <hr/>) - before that is description, after is mechanical
  const hrSplit = text.indexOf(' | ');
  if (hrSplit > 0) {
    const desc = text.slice(0, hrSplit).trim();
    const effect = text.slice(hrSplit + 3).trim();
    return { description: truncate(desc, 200), effect: truncate(effect, 500) };
  }
  
  // Try to split at "Activate" keyword
  const actIdx = text.indexOf('Activate');
  if (actIdx > 20) {
    return {
      description: truncate(text.slice(0, actIdx).trim(), 200),
      effect: truncate(text.slice(actIdx).trim(), 500),
    };
  }
  
  // Just use the whole text as effect, first sentence as description
  const firstDot = text.indexOf('. ');
  if (firstDot > 0 && firstDot < 200) {
    return {
      description: text.slice(0, firstDot + 1).trim(),
      effect: truncate(text, 500),
    };
  }
  
  return { description: truncate(text, 200), effect: truncate(text, 500) };
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

/** Escape string for TypeScript single-quoted string (or use double quotes if has apostrophe) */
function tsString(s) {
  // If it contains an apostrophe/single-quote, use double quotes
  if (s.includes("'")) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `'${s.replace(/\\/g, '\\\\')}'`;
}

/**
 * Extract mechanical effects from Foundry VTT rules array.
 * Returns an array of EquipmentEffect objects.
 *
 * Supported rule keys:
 *   FlatModifier  → { type: 'bonus', bonusType, target, value }
 *   Resistance    → { type: 'resistance', damageType, value }
 *   BaseSpeed     → { type: 'speed', speedType, value }
 *   Sense         → { type: 'sense', sense }
 *   DexterityModifierCap → { type: 'dexCap', value }
 */
function extractEffects(rules) {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return [];

  const effects = [];

  // Map Foundry selectors to our target names
  const SELECTOR_MAP = {
    'ac':             'ac',
    'saving-throw':   'saving-throw',
    'fortitude':      'fortitude',
    'reflex':         'reflex',
    'will':           'will',
    'perception':     'perception',
    'perception-dc':  'perception',
    'skill-check':    'skill-check',
    'attack':         'attack',
    'attack-roll':    'attack',
    'initiative':     'initiative',
    'land-speed':     'speed',
    'speed':          'speed',
    // Skills (PF2e skill names)
    'acrobatics':     'acrobatics',
    'arcana':         'arcana',
    'athletics':      'athletics',
    'crafting':       'crafting',
    'deception':      'deception',
    'diplomacy':      'diplomacy',
    'intimidation':   'intimidation',
    'lore-skill-check':'lore',
    'medicine':       'medicine',
    'nature':         'nature',
    'occultism':      'occultism',
    'performance':    'performance',
    'religion':       'religion',
    'society':        'society',
    'stealth':        'stealth',
    'survival':       'survival',
    'thievery':       'thievery',
    // Save DCs
    'fortitude-dc':   'fortitude',
    'reflex-dc':      'reflex',
    // Damage
    'healing':        'healing',
  };

  // ── Map common Foundry predicates to human-readable condition strings ──
  function mapPredicate(preds) {
    if (!preds || preds.length === 0) return null;

    // Simple single-string predicates
    if (preds.length === 1 && typeof preds[0] === 'string') {
      const p = preds[0];
      if (p === 'playing') return 'while-playing-instrument';
      if (p === 'visual') return 'vs:visual';
      if (p === 'mental') return 'vs:mental';
      if (p === 'auditory') return 'vs:auditory';
      if (p === 'emotion') return 'vs:emotion';
      if (p === 'fear') return 'vs:fear';
      if (p === 'death') return 'vs:death';
      if (p === 'disease') return 'vs:disease';
      if (p === 'poison') return 'vs:poison';
      if (p === 'curse') return 'vs:curse';
      if (p === 'darkness') return 'vs:darkness';
      if (p === 'light') return 'vs:light';
      if (p.startsWith('action:')) return p; // action:demoralize, action:recall-knowledge, etc.
      if (p.startsWith('target:trait:')) return 'vs:' + p.replace('target:trait:', '');
      if (p.startsWith('item:trait:')) return 'with:' + p.replace('item:trait:', '');
      // Self conditions and traits
      if (p === 'encounter') return 'in-encounter';
      if (p.startsWith('self:condition:')) return 'self:' + p.replace('self:condition:', '');
      if (p.startsWith('self:trait:')) return 'self:' + p.replace('self:trait:', '');
      if (p.startsWith('target:condition:')) return 'vs:' + p.replace('target:condition:', '');
      if (p.startsWith('check:outcome:')) return 'on:' + p.replace('check:outcome:', '');
      if (p.startsWith('feature:')) return p;
      if (p.startsWith('target:mark:')) return p;
      // Foundry roll options — generic condition tags
      if (p === 'inflicts:prone') return 'vs:prone';
      if (p.startsWith('inflicts:')) return 'vs:' + p.replace('inflicts:', '');
    }

    // Two predicates — often action + qualifier
    if (preds.length === 2) {
      const mapped = preds.map(p => typeof p === 'string' ? p : null);
      // ["action:recall-knowledge", "mental"] → action:recall-knowledge
      const action = mapped.find(p => p && p.startsWith('action:'));
      if (action) return action;
      // ["playing", ...] → while-playing-instrument
      if (mapped.includes('playing')) return 'while-playing-instrument';
      // ["visual", ...] → vs:visual
      const trait = mapped.find(p => p && ['visual','mental','auditory','emotion','fear','death','disease','poison','curse'].includes(p));
      if (trait) return 'vs:' + trait;
    }

    // Single object predicate — OR conditions
    if (preds.length === 1 && typeof preds[0] === 'object' && preds[0].or) {
      const ors = preds[0].or;
      // All actions → pick the first one as representative
      if (ors.every(o => typeof o === 'string' && o.startsWith('action:'))) {
        return ors.join('|'); // e.g. "action:lie|action:feint"
      }
    }

    // Multi-object predicates with an OR containing actions
    const orObj = preds.find(p => typeof p === 'object' && p.or);
    if (orObj) {
      const ors = orObj.or;
      if (ors.every(o => typeof o === 'string' && o.startsWith('action:'))) {
        return ors.join('|');
      }
    }

    // Fallback: couldn't map this predicate
    return null;
  }

  for (const rule of rules) {
    // ── FlatModifier → bonus effect ──
    if (rule.key === 'FlatModifier') {
      const bonusType = rule.type || 'item';
      if (!['item', 'circumstance', 'status'].includes(bonusType)) continue;
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value === null || value <= 0) continue;

      // Try to map predicate to a condition string
      let condition = null;
      if (rule.predicate && rule.predicate.length > 0) {
        condition = mapPredicate(rule.predicate);
        if (!condition) continue; // Skip unmappable predicates
      }

      // Handle array selectors (e.g., ["ac", "saving-throw"])
      const selectors = Array.isArray(rule.selector) ? rule.selector : [rule.selector];
      for (const sel of selectors) {
        const target = SELECTOR_MAP[sel];
        if (!target) continue;
        // Skip dynamic selectors
        if (sel.startsWith('{')) continue;
        const eff = { type: 'bonus', bonusType, target, value };
        if (condition) eff.condition = condition;
        effects.push(eff);
      }
    }

    // ── Resistance → resistance effect ──
    if (rule.key === 'Resistance') {
      const damageType = rule.type;
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (!damageType || value === null || value <= 0) continue;
      effects.push({ type: 'resistance', damageType, value });
    }

    // ── BaseSpeed → speed effect ──
    if (rule.key === 'BaseSpeed') {
      const speedType = rule.selector || 'land';
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value === null || value <= 0) continue;
      // Skip formula-based speeds (too complex)
      effects.push({ type: 'speed', speedType, value });
    }

    // ── Sense → sense effect ──
    if (rule.key === 'Sense') {
      const sense = rule.selector;
      if (!sense) continue;
      // Skip predicated senses
      if (rule.predicate && rule.predicate.length > 0) continue;
      effects.push({ type: 'sense', sense });
    }

    // ── DexterityModifierCap → dexCap effect ──
    if (rule.key === 'DexterityModifierCap') {
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value === null) continue;
      effects.push({ type: 'dexCap', value });
    }

    // ── ActiveEffectLike → various effects ──
    if (rule.key === 'ActiveEffectLike') {
      const p = rule.path || '';
      const val = typeof rule.value === 'number' ? rule.value : null;

      // Bulk capacity (Lifting Belt)
      if (p === 'inventory.bulk.encumberedAfterAddend' && val !== null) {
        effects.push({ type: 'bulkCapacity', value: val });
      }
      // Extra languages (Choker of Elocution)
      if (p === 'system.build.languages.max' && val !== null) {
        effects.push({ type: 'languages', value: val });
      }
      // Dying recovery DC modifier (Locket of Love Left Behind)
      if (p === 'system.attributes.dying.recoveryDC' && val !== null) {
        const mod = rule.mode === 'subtract' ? -val : val;
        effects.push({ type: 'dyingRecovery', value: mod });
      }
      // Rage temp HP (Instinct Crown variants)
      if (p === 'flags.system.rageTempHP' && val !== null) {
        effects.push({ type: 'rageTempHP', value: val });
      }
    }

    // ── TempHP → tempHP effect ──
    if (rule.key === 'TempHP') {
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value === null) continue;
      effects.push({ type: 'tempHP', value });
    }

    // ── Strike → strike effect (grants additional attacks) ──
    if (rule.key === 'Strike') {
      const label = rule.label || '';
      const category = rule.category || 'unarmed';
      const base = rule.damage?.base || {};
      const damageType = base.damageType || 'bludgeoning';
      const die = base.die || 'd4';
      const dice = base.dice || 1;
      const damageDie = `${dice}${die}`;
      // Extract name from label — Foundry uses 'PF2E.BattleForm.Attack.Jaws' format
      let name = label.split('.').pop() || 'Strike';
      const eff = { type: 'strike', name, category, damageType, damageDie };
      // Collect traits
      const traits = rule.traits || [];
      if (rule.range) traits.push(`thrown-${rule.range}`);
      if (traits.length > 0) eff.traits = traits;
      effects.push(eff);
    }

    // ── AdjustDegreeOfSuccess → adjustDegree effect ──
    if (rule.key === 'AdjustDegreeOfSuccess') {
      const selector = rule.selector || '';
      const adj = rule.adjustment || {};
      // Map adjustment object to a string, e.g., "success→one-degree-better"
      const adjustmentStr = Object.entries(adj).map(([from, to]) => `${from}:${to}`).join(',');
      if (!adjustmentStr) continue;
      const eff = { type: 'adjustDegree', selector, adjustment: adjustmentStr };
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── SubstituteRoll → substituteRoll effect ──
    if (rule.key === 'SubstituteRoll') {
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value === null) continue;
      const selector = rule.selector || 'check';
      const label = rule.slug || 'substitute-roll';
      effects.push({ type: 'substituteRoll', selector, value, label });
    }

    // ── Aura → aura effect ──
    if (rule.key === 'Aura') {
      const radius = typeof rule.radius === 'number' ? rule.radius : 0;
      if (radius <= 0) continue;
      // Summarize the aura effects
      const effectsList = (rule.effects || []).map(e => {
        const uuid = e.uuid || '';
        const name = uuid.split('.').pop() || 'unknown';
        return name;
      });
      effects.push({ type: 'aura', radius, effects: effectsList.join(', ') || 'passive' });
    }

    // ── Resistance (direct rule) → resistance effect ──
    if (rule.key === 'Resistance') {
      const rawType = rule.type;
      const rawValue = rule.value;
      const value = typeof rawValue === 'number' ? rawValue : null;
      if (value === null) continue; // Skip formula-based values
      // Handle array types (e.g., ['physical', 'precision']) and single strings
      const types = Array.isArray(rawType) ? rawType : [rawType];
      for (const t of types) {
        // Skip Foundry variable references like {item|flags.system...}
        if (!t || typeof t !== 'string' || t.includes('{')) continue;
        effects.push({ type: 'resistance', damageType: t, value });
      }
    }

    // ── BaseSpeed → speed effect ──
    if (rule.key === 'BaseSpeed') {
      const speedType = rule.selector || '';
      const rawVal = rule.value;
      // Only handle numeric values (skip formulas like "max(30,@actor...)")
      const value = typeof rawVal === 'number' ? rawVal : parseInt(rawVal, 10);
      if (speedType && !isNaN(value) && value > 0) {
        const eff = { type: 'speed', speedType, value };
        effects.push(eff);
      }
    }

    // ── Immunity → immunity effect ──
    if (rule.key === 'Immunity') {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      for (const t of types) {
        if (t) effects.push({ type: 'immunity', immunityType: t });
      }
    }

    // ── Weakness → weakness effect ──
    if (rule.key === 'Weakness') {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value !== null) {
        for (const t of types) {
          if (t) effects.push({ type: 'weakness', damageType: t, value });
        }
      }
    }

    // ── AdjustModifier → adjustModifier effect ──
    if (rule.key === 'AdjustModifier') {
      const selector = rule.selector || '';
      const slug = rule.slug || '';
      const mode = rule.mode || 'add';
      if (!selector || !slug) continue;
      const eff = { type: 'adjustModifier', selector, slug, mode };
      if (typeof rule.value === 'number') eff.value = rule.value;
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── Note → note effect (reminder text on roll outcomes) ──
    if (rule.key === 'Note') {
      const rawSel = rule.selector || '';
      const text = rule.text || '';
      if (!text) continue;
      // Normalize selector — strip {item|_id}/{item|id} refs
      let normSelector = Array.isArray(rawSel) ? rawSel[0] : rawSel;
      normSelector = normSelector.replace(/\{item\|[^}]+\}/g, 'item');
      const eff = { type: 'note', selector: normSelector, text };
      if (rule.outcome && rule.outcome.length > 0) eff.outcome = rule.outcome;
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── DamageDice → damageDice effect (extra dice on attacks) ──
    if (rule.key === 'DamageDice') {
      let normSelector = rule.selector || 'strike-damage';
      normSelector = normSelector.replace(/\{item\|[^}]+\}/g, 'item');
      const eff = { type: 'damageDice', selector: normSelector };
      if (typeof rule.diceNumber === 'number') eff.diceNumber = rule.diceNumber;
      else if (typeof rule.diceNumber === 'string') eff.diceNumber = parseInt(rule.diceNumber) || 1;
      if (rule.dieSize) eff.dieSize = rule.dieSize;
      if (rule.damageType) eff.damageType = rule.damageType;
      if (rule.critical === true) eff.critical = true;
      if (rule.category) eff.category = rule.category;
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── DamageAlteration → damageAlteration effect ──
    if (rule.key === 'DamageAlteration') {
      const mode = rule.mode || 'override';
      const property = rule.property || '';
      const value = rule.value != null ? String(rule.value) : '';
      if (!property) continue;
      // Skip complex formula-based values
      if (value.startsWith('ternary(')) continue;
      // Skip dynamic ChoiceSet references
      if (value.includes('{item|flags.')) continue;
      const eff = { type: 'damageAlteration', mode, property, value };
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── AdjustStrike → adjustStrike effect (add material/trait to strikes) ──
    if (rule.key === 'AdjustStrike') {
      const property = rule.property || '';
      const value = rule.value || '';
      if (!property || !value) continue;
      // Skip dynamic ChoiceSet references
      if (typeof value === 'string' && value.includes('{item|flags.')) continue;
      const eff = { type: 'adjustStrike', property, value };
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── GrantItem → grantCondition effect (grant conditions like Clumsy, Drained) ──
    if (rule.key === 'GrantItem') {
      const uuid = rule.uuid || '';
      // Only handle condition grants
      if (!uuid.includes('conditionitems.Item.')) continue;
      const condName = uuid.split('.').pop().toLowerCase().replace(/\s+/g, '-');
      const eff = { type: 'grantCondition', conditionSlug: condName };
      // Extract badge value (severity) from alterations
      if (rule.alterations && rule.alterations.length > 0) {
        const badge = rule.alterations.find(a => a.property === 'badge-value');
        if (badge && typeof badge.value === 'number') eff.value = badge.value;
      }
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── RollTwice → rollTwice effect (fortune/misfortune) ──
    if (rule.key === 'RollTwice') {
      const selector = rule.selector || '';
      const keep = rule.keep || 'higher';
      if (!selector) continue;
      effects.push({ type: 'rollTwice', selector, keep });
    }

    // ── FastHealing → fastHealing effect ──
    if (rule.key === 'FastHealing') {
      const value = typeof rule.value === 'number' ? rule.value : null;
      if (value === null) continue;
      const eff = { type: 'fastHealing', value };
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }

    // ── EphemeralEffect → ephemeralEffect (temporary effect trigger) ──
    if (rule.key === 'EphemeralEffect') {
      const uuid = rule.uuid || '';
      if (!uuid) continue;
      // Extract the effect name from the UUID
      const effectName = uuid.split('.').pop().replace('Effect: ', '').trim();
      const rawSel = rule.selectors || '';
      const normSelector = typeof rawSel === 'string' ? rawSel : (Array.isArray(rawSel) ? rawSel[0] : '');
      const eff = { type: 'ephemeralEffect', selector: normSelector, effectName };
      if (rule.predicate && rule.predicate.length > 0) {
        const cond = mapPredicate(rule.predicate);
        if (cond) eff.condition = cond;
      }
      effects.push(eff);
    }
  }

  return effects;
}

/**
 * Extract activated abilities from HTML description.
 * Parses Foundry's standard Activate block format.
 *
 * Returns an array of { name?, actions, traits?, frequency?, effect } objects.
 */
function extractActivations(descHtml) {
  if (!descHtml || !descHtml.includes('Activate')) return [];

  const activations = [];

  // Split on activate blocks. Foundry uses two patterns:
  //   <strong>Activate</strong> ...
  //   <strong>Activate—Name</strong> ...
  // We split using a regex that matches both
  const parts = descHtml.split(/(?=<strong>Activate)/);

  for (let i = 0; i < parts.length; i++) {
    const block = parts[i];
    if (!block.startsWith('<strong>Activate')) continue;

    // Parse optional activation name from inside the strong tag
    // Pattern: <strong>Activate—Name</strong> or <strong>Activate</strong>—Name
    let name = null;
    const nameInStrongMatch = block.match(/<strong>Activate\s*(?:&mdash;|—|&#8212;)\s*([^<]+)<\/strong>/);
    if (nameInStrongMatch) {
      name = nameInStrongMatch[1].trim();
    } else {
      const nameAfterStrongMatch = block.match(/<\/strong>\s*(?:&mdash;|—|&#8212;)\s*([^<(]+)/);
      if (nameAfterStrongMatch) {
        name = nameAfterStrongMatch[1].trim();
      }
    }
    if (name && name.length > 50) name = null;

    // Parse action cost from glyph
    let actions = null;
    const glyphMatch = block.match(/<span class="action-glyph">([^<]+)<\/span>/);
    if (glyphMatch) {
      const g = glyphMatch[1].trim();
      const map = {
        '1': '1', 'A': '1', 'a': '1',
        '2': '2', 'D': '2', 'd': '2',
        '3': '3', 'T': '3', 't': '3',
        'F': 'free', 'f': 'free',
        'R': 'reaction', 'r': 'reaction',
      };
      actions = map[g] || null;
    }

    // Check for Cast a Spell — skip these (handled by staffSpells)
    if (block.includes('Cast a Spell')) continue;

    // If no actions found, skip
    if (!actions) continue;

    // Parse traits from parentheses after the glyph
    let traits = [];
    const traitMatch = block.match(/<\/span>\s*\(([^)]+)\)/);
    if (traitMatch) {
      traits = traitMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    }

    // Parse frequency
    let frequency = null;
    const freqMatch = block.match(/<strong>Frequency<\/strong>\s*([^<]+)/);
    if (freqMatch) {
      frequency = freqMatch[1].trim().replace(/;$/, '');
    }

    // Parse effect text
    let effect = '';
    const effectMatch = block.match(/<strong>Effect<\/strong>\s*(.*?)(?=<strong>Activate|<hr|$)/s);
    if (effectMatch) {
      effect = effectMatch[1]
        .replace(/@UUID\[.*?\]\{([^}]+)\}/g, '$1')
        .replace(/@UUID\[.*?\.Item\.([^\]]+)\]/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (!effect) {
      // Fallback: grab all text from the block
      const fallback = block
        .replace(/@UUID\[.*?\]\{([^}]+)\}/g, '$1')
        .replace(/@UUID\[.*?\.Item\.([^\]]+)\]/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const idx = fallback.indexOf('Effect');
      if (idx >= 0) {
        effect = fallback.substring(idx + 6).trim();
      }
    }
    effect = truncate(effect, 300);

    if (!effect) continue;

    const activation = { actions, effect };
    if (name) activation.name = name;
    if (traits.length > 0) activation.traits = traits;
    if (frequency) activation.frequency = frequency;
    activations.push(activation);
  }

  return activations;
}

/**
 * Extract staff spell list from HTML description.
 * Parses the <li><strong>Level</strong> SpellName</li> structure.
 *
 * Returns an array of { level: number, name: string } objects.
 */
function extractStaffSpells(descHtml) {
  if (!descHtml || !descHtml.includes('Cast a Spell')) return [];

  const spells = [];
  const levelMap = {
    'cantrip': 0, 'cantrips': 0,
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
    '6th': 6, '7th': 7, '8th': 8, '9th': 9, '10th': 10,
  };

  // Pattern: <li><strong>Level</strong> @UUID[...]{SpellName}, @UUID[...]{SpellName2}</li>
  const listMatches = descHtml.matchAll(/<li>\s*<strong>([^<]+)<\/strong>\s*(.*?)<\/li>/gs);
  for (const m of listMatches) {
    const levelStr = m[1].trim().toLowerCase();
    const level = levelMap[levelStr];
    if (level === undefined) continue;

    const spellBlock = m[2];

    // Extract spell names from @UUID[...]{DisplayName}
    const uuidNameMatches = spellBlock.matchAll(/@UUID\[.*?\]\{([^}]+)\}/g);
    for (const um of uuidNameMatches) {
      spells.push({ level, name: um[1] });
    }

    // Also handle @UUID[...Item.SpellSlug] without display name
    const uuidSlugMatches = spellBlock.matchAll(/@UUID\[Compendium\.pf2e\.spells-srd\.Item\.([^\]]+)\](?!\{)/g);
    for (const sm of uuidSlugMatches) {
      const slug = sm[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (!spells.find(s => s.name === slug && s.level === level)) {
        spells.push({ level, name: slug });
      }
    }
  }

  return spells;
}

// ── Main ───────────────────────────────────────────────────────────

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${files.length} equipment files`);

const wornItems = [];  // MagicItem[]
const gearItems = [];  // GearItem[]

// Adventuring gear categories we recognize
const GEAR_CATEGORIES = {
  'adventuring gear': 'General',
  'held-in-one-hand': 'Tools',
  'held-in-two-hands': 'Tools',
};

for (const file of files) {
  const raw  = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
  const json = JSON.parse(raw);
  const sys  = json.system;

  // Filter: remaster items only
  if (!sys.publication?.remaster) continue;
  // Filter: core books only
  if (!CORE_BOOKS.has(sys.publication?.title)) continue;
  // Filter: level 0-20
  const level = sys.level?.value ?? 0;
  if (level > 20) continue;

  const name    = json.name;
  const price   = priceToGp(sys.price);
  const rarity  = sys.traits?.rarity || 'common';
  const traits  = [...(sys.traits?.value || [])];
  if (rarity !== 'common') traits.unshift(rarity);
  const usage   = sys.usage?.value || '';
  const bulkVal = sys.bulk?.value ?? 0;
  const descHtml = sys.description?.value || '';

  // ── Worn Items (type=equipment, worn usage) ──
  if (json.type === 'equipment' && usage.startsWith('worn')) {
    let slot = USAGE_TO_SLOT[usage];
    if (slot === null) continue; // horseshoes, saddles
    if (!slot) { console.warn(`Unknown usage: ${usage} for ${name}`); continue; }

    // Name-based slot override for items with generic 'worn' usage
    if (slot === 'worn') {
      const nl = name.toLowerCase();
      if (nl.includes('ring') || nl.includes('signet') || nl === 'doubling rings' || nl.includes('doubling rings')) slot = 'ring';
      else if (nl.includes('aeon stone')) slot = 'worn'; // aeon stones stay as worn
      else if (nl.includes('boots') || nl.includes('sandals') || nl.includes('shoes')) slot = 'boots';
      else if (nl.includes('cloak') || nl.includes('mantle') || nl.includes('cape')) slot = 'cloak';
      else if (nl.includes('belt') || nl.includes('cincture') || nl.includes('sash')) slot = 'belt';
      else if (nl.includes('crown') || nl.includes('circlet') || nl.includes('diadem') || nl.includes('helm') || nl.includes('mask') || nl.includes('hat')) slot = 'headwear';
      else if (nl.includes('necklace') || nl.includes('amulet') || nl.includes('pendant') || nl.includes('gorget') || nl.includes('collar') || nl.includes('choker') || nl.includes('periapt')) slot = 'necklace';
      else if (nl.includes('gloves') || nl.includes('gauntlet')) slot = 'gloves';
      else if (nl.includes('bracers') || nl.includes('bracelet') || nl.includes('bands') || nl.includes('handwraps') || nl.includes('armbands')) slot = 'bracers';
      else if (nl.includes('goggles') || nl.includes('spectacles') || nl.includes('lens') || nl.includes('monocle') || nl.includes('blindfold') || nl.includes('eye')) slot = 'eyepiece';
    }

    const { description, effect } = splitDescEffect(descHtml);
    const id = slugify(name);
    
    // Skip items with empty descriptions
    if (!description && !effect) continue;

    // Extract mechanical effects from Foundry rules
    const effects = extractEffects(sys.rules);
    // Extract activated abilities from description
    const activations = extractActivations(descHtml);
    
    wornItems.push({
      id, name, price, level, slot, traits,
      description, effect,
      bulk: bulkVal,
      effects,
      activations,
    });
  }

  // ── Staves (type=weapon, staff trait) for wornItems as held ──
  if (json.type === 'weapon' && traits.includes('staff')) {
    const { description, effect } = splitDescEffect(descHtml);
    const id = slugify(name);
    const effects = extractEffects(sys.rules);
    const activations = extractActivations(descHtml);
    const staffSpells = extractStaffSpells(descHtml);
    
    wornItems.push({
      id, name, price, level, slot: 'held', traits,
      description, effect,
      bulk: bulkVal,
      effects,
      activations,
      staffSpells,
    });
  }

  // ── Held equipment (type=equipment, held usage) for wornItems ──
  if (json.type === 'equipment' && usage.startsWith('held')) {
    const { description, effect } = splitDescEffect(descHtml);
    const id = slugify(name);
    const effects = extractEffects(sys.rules);
    const activations = extractActivations(descHtml);

    wornItems.push({
      id, name, price, level, slot: 'held', traits,
      description, effect,
      bulk: bulkVal,
      effects,
      activations,
    });
  }

  // ── Adventuring Gear (type=backpack or non-magical equipment) ──
  if (json.type === 'backpack' || json.type === 'kit') {
    const desc = stripHtml(descHtml);
    const id = slugify(name);
    gearItems.push({
      id, name, price, bulk: bulkVal, level,
      description: truncate(desc, 300),
      category: 'Containers',
    });
  }

  // Non-magical consumables that are actually gear (torches, etc.)
  if (json.type === 'consumable' && !traits.some(t => ['magical', 'invested', 'alchemical'].includes(t))) {
    const desc = stripHtml(descHtml);
    const id = slugify(name);
    if (price <= 10 && level <= 1) { // basic gear only
      gearItems.push({
        id, name, price, bulk: bulkVal, level,
        description: truncate(desc, 300),
        category: 'Consumables',
      });
    }
  }
}

// ── Sort ─────────────────────────────────────────────────────────
wornItems.sort((a, b) => {
  // Sort by slot, then level, then name
  const slotOrder = ['headwear','eyepiece','necklace','cloak','belt','bracers','gloves','ring','boots','worn','held'];
  const sa = slotOrder.indexOf(a.slot);
  const sb = slotOrder.indexOf(b.slot);
  if (sa !== sb) return sa - sb;
  if (a.level !== b.level) return a.level - b.level;
  return a.name.localeCompare(b.name);
});

gearItems.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

// ── Deduplicate by ID ─────────────────────────────────────────────
function dedup(items) {
  const seen = new Set();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

const uniqueWorn = dedup(wornItems);
const uniqueGear = dedup(gearItems);

console.log(`Worn/Held items: ${uniqueWorn.length}`);
console.log(`Gear items: ${uniqueGear.length}`);

// ── Slot statistics ──
const slotStats = {};
for (const item of uniqueWorn) {
  slotStats[item.slot] = (slotStats[item.slot] || 0) + 1;
}
console.log('Slot breakdown:', slotStats);

// ── Effects statistics ──
let effectCount = 0;
let itemsWithEffects = 0;
const effectTypes = {};
for (const item of uniqueWorn) {
  if (item.effects && item.effects.length > 0) {
    itemsWithEffects++;
    effectCount += item.effects.length;
    for (const eff of item.effects) {
      effectTypes[eff.type] = (effectTypes[eff.type] || 0) + 1;
    }
  }
}
console.log(`Items with mechanical effects: ${itemsWithEffects}/${uniqueWorn.length}`);
console.log(`Total effects: ${effectCount}`);
console.log('Effect types:', effectTypes);

// ── Activation statistics ──
let itemsWithActivations = 0;
let totalActivations = 0;
let itemsWithStaffSpells = 0;
let totalStaffSpells = 0;
const conditionCounts = {};
for (const item of uniqueWorn) {
  if (item.activations && item.activations.length > 0) {
    itemsWithActivations++;
    totalActivations += item.activations.length;
  }
  if (item.staffSpells && item.staffSpells.length > 0) {
    itemsWithStaffSpells++;
    totalStaffSpells += item.staffSpells.length;
  }
  if (item.effects) {
    for (const eff of item.effects) {
      if (eff.type === 'bonus' && eff.condition) {
        conditionCounts[eff.condition] = (conditionCounts[eff.condition] || 0) + 1;
      }
    }
  }
}
console.log(`Items with activations: ${itemsWithActivations}/${uniqueWorn.length} (${totalActivations} total)`);
console.log(`Items with staff spells: ${itemsWithStaffSpells}/${uniqueWorn.length} (${totalStaffSpells} total)`);
console.log(`Conditional bonuses:`, conditionCounts);

// ── Generate wornItems.generated.ts ──────────────────────────────

const SLOT_LABELS = {
  headwear: 'HEADWEAR',
  eyepiece: 'EYEPIECE',
  necklace: 'NECKLACE / COLLAR',
  cloak:    'CLOAK',
  belt:     'BELT',
  bracers:  'BRACERS / ARMBANDS',
  gloves:   'GLOVES',
  ring:     'RING',
  boots:    'BOOTS',
  worn:     'GENERAL WORN',
  held:     'HELD ITEMS',
};

let ts = `/**
 * PF2e Remaster — Worn & Held Magic Items
 * AUTO-GENERATED from Foundry VTT PF2e system data (foundryvtt/pf2e)
 * Source: packs/pf2e/equipment
 * 
 * ${uniqueWorn.length} items total
 * Generated: ${new Date().toISOString().split('T')[0]}
 * 
 * Remaster naming (GM Core):
 *     Cloak of Elvenkind→Cloak of Illusions, Boots of Speed→Propulsive Boots,
 *     Winged Boots→Winged Sandals, Bracers of Armor→Bands of Force,
 *     Belt of Giant Strength→Bracers of Strength, Diadem of Intellect→Crown of Intellect,
 *     Headband of Inspired Wisdom→Crown of the Companion,
 *     Boots of Elvenkind→Arboreal Boots,
 *     Cloak of Resistance→(removed; saves via Resilient rune),
 *     Bag of Holding→Spacious Pouch.
 */

export type WornSlot =
  | 'worn'
  | 'headwear'
  | 'eyepiece'
  | 'necklace'
  | 'cloak'
  | 'belt'
  | 'bracers'
  | 'gloves'
  | 'ring'
  | 'boots'
  | 'held';

/**
 * A single mechanical effect from an equipment item.
 * Extracted from Foundry VTT PF2e system rules.
 */
export type EquipmentEffect =
  | { type: 'bonus'; bonusType: 'item' | 'circumstance' | 'status'; target: string; value: number; condition?: string }
  | { type: 'resistance'; damageType: string; value: number }
  | { type: 'speed'; speedType: string; value: number }
  | { type: 'sense'; sense: string }
  | { type: 'dexCap'; value: number }
  | { type: 'bulkCapacity'; value: number }
  | { type: 'languages'; value: number }
  | { type: 'dyingRecovery'; value: number }
  | { type: 'rageTempHP'; value: number }
  | { type: 'tempHP'; value: number }
  | { type: 'strike'; name: string; category: 'unarmed' | 'simple' | 'martial'; damageType: string; damageDie: string; traits?: string[] }
  | { type: 'adjustDegree'; selector: string; adjustment: string; condition?: string }
  | { type: 'substituteRoll'; selector: string; value: number; label: string }
  | { type: 'adjustModifier'; selector: string; slug: string; mode: 'override' | 'upgrade' | 'downgrade' | 'add' | 'remove'; value?: number; condition?: string }
  | { type: 'aura'; radius: number; effects: string }
  | { type: 'immunity'; immunityType: string }
  | { type: 'weakness'; damageType: string; value: number }
  | { type: 'note'; selector: string; text: string; outcome?: string[]; condition?: string }
  | { type: 'damageDice'; selector: string; diceNumber?: number; dieSize?: string; damageType?: string; critical?: boolean; category?: string; condition?: string }
  | { type: 'damageAlteration'; mode: string; property: string; value: string; condition?: string }
  | { type: 'adjustStrike'; property: string; value: string; condition?: string }
  | { type: 'grantCondition'; conditionSlug: string; value?: number; condition?: string }
  | { type: 'rollTwice'; selector: string; keep: 'higher' | 'lower' }
  | { type: 'fastHealing'; value: number; condition?: string }
  | { type: 'ephemeralEffect'; selector: string; effectName: string; condition?: string };

/** Action cost for an activated ability */
export type ActionCost = '1' | '2' | '3' | 'free' | 'reaction';

/** An activated ability on an equipment item */
export interface ActivatedAbility {
  /** Optional name for the activation (e.g. "Draw Hood", "Quickening Stomp") */
  name?: string;
  /** Action cost */
  actions: ActionCost;
  /** Activation traits (e.g. ['concentrate', 'manipulate']) */
  traits?: string[];
  /** How often can this be used */
  frequency?: string;
  /** Human-readable effect description */
  effect: string;
}

/** A spell available from a staff */
export interface StaffSpell {
  /** Spell level (0 = cantrip, 1-10 = rank) */
  level: number;
  /** Spell name (must match spell catalog ID when slugified) */
  name: string;
}

export interface MagicItem {
  id: string;
  name: string;
  price: number;       // gp
  level: number;
  slot: WornSlot;
  traits: string[];
  description: string;
  effect: string;
  bulk: number | 'L';
  usesPerDay?: number;
  /** Mechanical effects extracted from Foundry VTT PF2e rules data */
  effects?: EquipmentEffect[];
  /** Activated abilities (Interact, Envision, Command, etc.) */
  activations?: ActivatedAbility[];
  /** Spells available from a staff (requires charges to cast) */
  staffSpells?: StaffSpell[];
}

export const WORN_ITEMS: Record<string, MagicItem> = {\n`;

let currentSlot = '';
for (const item of uniqueWorn) {
  // Section header
  if (item.slot !== currentSlot) {
    currentSlot = item.slot;
    const label = SLOT_LABELS[currentSlot] || currentSlot.toUpperCase();
    ts += `\n  // ══════════════════════════════════════════════════════════════\n`;
    ts += `  // ── ${label} ──\n`;
    ts += `  // ══════════════════════════════════════════════════════════════\n\n`;
  }

  const bulk = item.bulk === 0.1 ? "'L'" : String(item.bulk);
  
  ts += `  ${tsString(item.id)}: {\n`;
  ts += `    id: ${tsString(item.id)}, name: ${tsString(item.name)}, price: ${item.price}, level: ${item.level},\n`;
  ts += `    slot: '${item.slot}', traits: [${item.traits.map(t => tsString(t)).join(', ')}],\n`;
  ts += `    description: ${tsString(item.description)},\n`;
  ts += `    effect: ${tsString(item.effect)},\n`;
  ts += `    bulk: ${bulk},\n`;
  
  // Output effects array if non-empty
  if (item.effects && item.effects.length > 0) {
    ts += `    effects: [\n`;
    for (const eff of item.effects) {
      if (eff.type === 'bonus') {
        const condStr = eff.condition ? `, condition: '${eff.condition}'` : '';
        ts += `      { type: 'bonus', bonusType: '${eff.bonusType}', target: '${eff.target}', value: ${eff.value}${condStr} },\n`;
      } else if (eff.type === 'resistance') {
        ts += `      { type: 'resistance', damageType: '${eff.damageType}', value: ${eff.value} },\n`;
      } else if (eff.type === 'speed') {
        ts += `      { type: 'speed', speedType: '${eff.speedType}', value: ${eff.value} },\n`;
      } else if (eff.type === 'sense') {
        ts += `      { type: 'sense', sense: '${eff.sense}' },\n`;
      } else if (eff.type === 'dexCap') {
        ts += `      { type: 'dexCap', value: ${eff.value} },\n`;
      } else if (eff.type === 'bulkCapacity') {
        ts += `      { type: 'bulkCapacity', value: ${eff.value} },\n`;
      } else if (eff.type === 'languages') {
        ts += `      { type: 'languages', value: ${eff.value} },\n`;
      } else if (eff.type === 'dyingRecovery') {
        ts += `      { type: 'dyingRecovery', value: ${eff.value} },\n`;
      } else if (eff.type === 'rageTempHP') {
        ts += `      { type: 'rageTempHP', value: ${eff.value} },\n`;
      } else if (eff.type === 'tempHP') {
        ts += `      { type: 'tempHP', value: ${eff.value} },\n`;
      } else if (eff.type === 'strike') {
        const traitsStr = eff.traits && eff.traits.length > 0 ? `, traits: [${eff.traits.map(t => `'${t}'`).join(', ')}]` : '';
        ts += `      { type: 'strike', name: '${eff.name}', category: '${eff.category}', damageType: '${eff.damageType}', damageDie: '${eff.damageDie}'${traitsStr} },\n`;
      } else if (eff.type === 'adjustDegree') {
        const condStr = eff.condition ? `, condition: ${tsString(eff.condition)}` : '';
        ts += `      { type: 'adjustDegree', selector: '${eff.selector}', adjustment: '${eff.adjustment}'${condStr} },\n`;
      } else if (eff.type === 'substituteRoll') {
        ts += `      { type: 'substituteRoll', selector: '${eff.selector}', value: ${eff.value}, label: '${eff.label}' },\n`;
      } else if (eff.type === 'adjustModifier') {
        let parts = `type: 'adjustModifier', selector: '${eff.selector}', slug: '${eff.slug}', mode: '${eff.mode}'`;
        if (typeof eff.value === 'number') parts += `, value: ${eff.value}`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'aura') {
        ts += `      { type: 'aura', radius: ${eff.radius}, effects: ${tsString(eff.effects)} },\n`;
      } else if (eff.type === 'immunity') {
        ts += `      { type: 'immunity', immunityType: '${eff.immunityType}' },\n`;
      } else if (eff.type === 'weakness') {
        ts += `      { type: 'weakness', damageType: '${eff.damageType}', value: ${eff.value} },\n`;
      } else if (eff.type === 'note') {
        let parts = `type: 'note', selector: ${tsString(eff.selector)}, text: ${tsString(eff.text)}`;
        if (eff.outcome && eff.outcome.length > 0) parts += `, outcome: [${eff.outcome.map(o => `'${o}'`).join(', ')}]`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'damageDice') {
        let parts = `type: 'damageDice', selector: '${eff.selector}'`;
        if (typeof eff.diceNumber === 'number') parts += `, diceNumber: ${eff.diceNumber}`;
        if (eff.dieSize) parts += `, dieSize: '${eff.dieSize}'`;
        if (eff.damageType) parts += `, damageType: '${eff.damageType}'`;
        if (eff.critical) parts += `, critical: true`;
        if (eff.category) parts += `, category: '${eff.category}'`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'damageAlteration') {
        let parts = `type: 'damageAlteration', mode: '${eff.mode}', property: '${eff.property}', value: '${eff.value}'`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'adjustStrike') {
        let parts = `type: 'adjustStrike', property: '${eff.property}', value: '${eff.value}'`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'grantCondition') {
        let parts = `type: 'grantCondition', conditionSlug: '${eff.conditionSlug}'`;
        if (typeof eff.value === 'number') parts += `, value: ${eff.value}`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'rollTwice') {
        ts += `      { type: 'rollTwice', selector: '${eff.selector}', keep: '${eff.keep}' },\n`;
      } else if (eff.type === 'fastHealing') {
        let parts = `type: 'fastHealing', value: ${eff.value}`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      } else if (eff.type === 'ephemeralEffect') {
        let parts = `type: 'ephemeralEffect', selector: '${eff.selector}', effectName: ${tsString(eff.effectName)}`;
        if (eff.condition) parts += `, condition: ${tsString(eff.condition)}`;
        ts += `      { ${parts} },\n`;
      }
    }
    ts += `    ],\n`;
  }

  // Output activations array if non-empty
  if (item.activations && item.activations.length > 0) {
    ts += `    activations: [\n`;
    for (const act of item.activations) {
      const parts = [`actions: '${act.actions}'`];
      if (act.name) parts.push(`name: ${tsString(act.name)}`);
      if (act.traits && act.traits.length > 0) parts.push(`traits: [${act.traits.map(t => tsString(t)).join(', ')}]`);
      if (act.frequency) parts.push(`frequency: ${tsString(act.frequency)}`);
      parts.push(`effect: ${tsString(act.effect)}`);
      ts += `      { ${parts.join(', ')} },\n`;
    }
    ts += `    ],\n`;
  }

  // Output staffSpells array if non-empty
  if (item.staffSpells && item.staffSpells.length > 0) {
    ts += `    staffSpells: [\n`;
    for (const sp of item.staffSpells) {
      ts += `      { level: ${sp.level}, name: ${tsString(sp.name)} },\n`;
    }
    ts += `    ],\n`;
  }
  
  ts += `  },\n`;
}

ts += `};\n`;

fs.writeFileSync(OUT_WORN, ts, 'utf8');
console.log(`Wrote ${OUT_WORN}`);

// ── Generate adventuringGear.generated.ts ──────────────────────────

let gearTs = `/**
 * PF2e Remaster — Adventuring Gear
 * AUTO-GENERATED from Foundry VTT PF2e system data
 * ${uniqueGear.length} items
 * Generated: ${new Date().toISOString().split('T')[0]}
 */

export interface GearItem {
  id: string;
  name: string;
  price: number;       // gp
  bulk: number | 'L';
  level: number;
  description: string;
  category: string;
}

export const adventuringGear: Record<string, GearItem> = {\n`;

for (const item of uniqueGear) {
  const bulk = item.bulk === 0.1 ? "'L'" : String(item.bulk);
  gearTs += `  ${tsString(item.id)}: {\n`;
  gearTs += `    id: ${tsString(item.id)}, name: ${tsString(item.name)}, price: ${item.price},\n`;
  gearTs += `    bulk: ${bulk}, level: ${item.level},\n`;
  gearTs += `    description: ${tsString(item.description)},\n`;
  gearTs += `    category: ${tsString(item.category)},\n`;
  gearTs += `  },\n`;
}

gearTs += `};\n`;

fs.writeFileSync(OUT_GEAR, gearTs, 'utf8');
console.log(`Wrote ${OUT_GEAR}`);
