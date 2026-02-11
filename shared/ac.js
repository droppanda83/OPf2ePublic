"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConditionModifiers = getConditionModifiers;
exports.calculateAC = calculateAC;
exports.calculateAttackBonus = calculateAttackBonus;
exports.calculateSaveBonus = calculateSaveBonus;
exports.calculateSpellDC = calculateSpellDC;
exports.calculateSpellAttack = calculateSpellAttack;
exports.calculateSpellAttackModifier = calculateSpellAttackModifier;
exports.computeDerivedStats = computeDerivedStats;
exports.rollD20 = rollD20;
exports.getAttackResult = getAttackResult;
exports.getDegreeOfSuccess = getDegreeOfSuccess;
exports.calculateDamageBonus = calculateDamageBonus;
exports.calculateDamageFormula = calculateDamageFormula;
const shields_1 = require("./shields");
const weapons_1 = require("./weapons");
const bonuses_1 = require("./bonuses");
// ─── Condition → Modifier Mapping ────────────────────
/**
 * Convert active conditions into typed bonuses/penalties for a specific check.
 * This is the core bridge between the condition system and the bonus stacking system.
 */
function getConditionModifiers(conditions, applyTo, attackerId, // For checking conditional effects like Feint
attackType) {
    const bonuses = [];
    const penalties = [];
    for (const cond of conditions) {
        const val = cond.value ?? 1;
        switch (cond.name) {
            // ── Status penalties to ALL checks/DCs ──
            case 'frightened':
                penalties.push({ type: 'status', value: val, source: `Frightened ${val}` });
                break;
            case 'sickened':
                penalties.push({ type: 'status', value: val, source: `Sickened ${val}` });
                break;
            // ── Targeted status penalties ──
            case 'clumsy':
                if (['ac', 'reflex', 'attack'].includes(applyTo)) {
                    penalties.push({ type: 'status', value: val, source: `Clumsy ${val}` });
                }
                break;
            case 'enfeebled':
                if (['attack', 'damage'].includes(applyTo)) {
                    penalties.push({ type: 'status', value: val, source: `Enfeebled ${val}` });
                }
                break;
            case 'drained':
                if (applyTo === 'fortitude') {
                    penalties.push({ type: 'status', value: val, source: `Drained ${val}` });
                }
                break;
            case 'stupefied':
                if (['will', 'spell-dc', 'spell-attack'].includes(applyTo)) {
                    penalties.push({ type: 'status', value: val, source: `Stupefied ${val}` });
                }
                break;
            // ── Circumstance penalties ──
            case 'flat-footed':
            case 'off-guard':
                if (applyTo === 'ac') {
                    // If the condition is limited to a specific attack type, skip non-matching attacks
                    // e.g. Feint sets attackType='melee', so ranged attacks don't get the penalty
                    // If attackType is undefined on the condition, it applies to ALL attack types
                    if (cond.attackType && attackType && cond.attackType !== attackType)
                        break;
                    // Check if this is a conditional off-guard (only applies to specific attacker)
                    if (cond.appliesAgainst) {
                        // Only apply if the attacker matches
                        if (attackerId && cond.appliesAgainst === attackerId) {
                            penalties.push({ type: 'circumstance', value: 2, source: 'Off-Guard' });
                        }
                    }
                    else {
                        // Unconditional off-guard applies to everyone
                        penalties.push({ type: 'circumstance', value: 2, source: 'Off-Guard' });
                    }
                }
                break;
            case 'prone':
                if (applyTo === 'attack') {
                    // Prone creatures have -2 circumstance penalty to attack rolls
                    penalties.push({ type: 'circumstance', value: 2, source: 'Prone' });
                }
                if (applyTo === 'ac') {
                    // Prone creatures are flat-footed (off-guard)
                    penalties.push({ type: 'circumstance', value: 2, source: 'Prone (off-guard)' });
                }
                break;
            case 'hunker-down':
                if (applyTo === 'ac' && attackType === 'ranged') {
                    // Hunkering down grants +4 circumstance bonus to AC vs ranged attacks
                    bonuses.push({ type: 'circumstance', value: 4, source: 'Hunker Down vs Ranged' });
                }
                break;
            case 'cover':
                if (applyTo === 'ac') {
                    // Taking cover grants +2 circumstance bonus to AC
                    bonuses.push({ type: 'circumstance', value: 2, source: 'Cover' });
                }
                break;
            // ── Circumstance bonuses ──
            case 'shield':
                if (applyTo === 'ac') {
                    bonuses.push({ type: 'circumstance', value: val, source: 'Shield Spell' });
                }
                break;
            // ═══════════════════════════════════════════════════════════
            // PHASE 2.1: NEW CONDITIONS
            // ═══════════════════════════════════════════════════════════
            case 'blinded':
                // Blinded: Off-guard, -4 status to Perception, all terrain is difficult
                if (applyTo === 'ac') {
                    penalties.push({ type: 'circumstance', value: 2, source: 'Blinded (off-guard)' });
                }
                if (applyTo === 'perception') {
                    penalties.push({ type: 'status', value: 4, source: 'Blinded' });
                }
                break;
            case 'grabbed':
            case 'restrained':
                // Grabbed & Restrained: Off-guard, immobilized
                if (applyTo === 'ac') {
                    penalties.push({ type: 'circumstance', value: 2, source: `${cond.name} (off-guard)` });
                }
                break;
            case 'paralyzed':
                // Paralyzed: Can't act, off-guard
                if (applyTo === 'ac') {
                    penalties.push({ type: 'circumstance', value: 2, source: 'Paralyzed (off-guard)' });
                }
                break;
            case 'fatigued':
                // Fatigued: -1 status to AC and saves
                if (['ac', 'fortitude', 'reflex', 'will'].includes(applyTo)) {
                    penalties.push({ type: 'status', value: 1, source: 'Fatigued' });
                }
                break;
            case 'dazzled':
                // Dazzled: All creatures/objects are concealed to you (handled in attack resolution)
                break;
        }
    }
    return { bonuses, penalties };
}
// ─── Modifier Gathering ──────────────────────────────
/**
 * Gather all applicable bonuses/penalties for a creature on a specific check.
 * Merges condition-based modifiers with the creature's active bonuses/penalties arrays.
 */
function gatherModifiers(creature, applyTo, attackerId, attackType) {
    const { bonuses, penalties } = getConditionModifiers(creature.conditions || [], applyTo, attackerId, attackType);
    for (const b of creature.bonuses || []) {
        if (!b.applyTo || b.applyTo === applyTo) {
            bonuses.push({ ...b });
        }
    }
    for (const p of creature.penalties || []) {
        if (!p.applyTo || p.applyTo === applyTo) {
            penalties.push({ ...p });
        }
    }
    return { bonuses, penalties };
}
// ─── AC Calculation ──────────────────────────────────
/**
 * Calculate Armor Class.
 * PF2e: 10 + DEX mod + armor proficiency bonus + item bonus (armor) + stacked modifiers
 */
function calculateAC(creature, attackerId, attackType) {
    const dexMod = creature.abilities?.dexterity ?? 0;
    const armorProfRank = creature.armorBonus > 0
        ? (creature.proficiencies?.lightArmor ?? 'trained')
        : (creature.proficiencies?.unarmored ?? 'trained');
    const profBonus = (0, bonuses_1.getProficiencyBonus)(armorProfRank, creature.level);
    let ac = 10 + dexMod + profBonus;
    // Gather typed modifiers for AC (passing attackerId for conditional effects)
    const { bonuses, penalties } = gatherModifiers(creature, 'ac', attackerId, attackType);
    // Armor item bonus (goes through stacking)
    if (creature.armorBonus > 0) {
        bonuses.push({ type: 'item', value: creature.armorBonus, source: 'Armor' });
    }
    // Shield circumstance bonus (only when raised — stacks with nothing else of same type)
    if (creature.equippedShield && creature.shieldRaised) {
        const shield = (0, shields_1.getShield)(creature.equippedShield);
        if (shield) {
            bonuses.push({ type: 'circumstance', value: shield.armorBonus, source: shield.name });
        }
    }
    ac += (0, bonuses_1.resolveStacking)(bonuses, penalties);
    return ac; // PF2e has no AC floor — AC can go below 10 with enough penalties
}
// ─── Attack Bonus ────────────────────────────────────
/**
 * Calculate attack bonus including proficiency, ability modifier, MAP,
 * and all stacking modifiers from conditions/effects.
 */
function calculateAttackBonus(creature, attackType) {
    // NPC/bestiary creatures with a flat attack bonus bypass the proficiency calculation
    if (creature.pbAttackBonus !== undefined) {
        const map = (0, bonuses_1.calculateMAP)(creature.attacksMadeThisTurn ?? 0, false);
        const { bonuses, penalties } = gatherModifiers(creature, 'attack');
        if (map < 0) {
            penalties.push({ type: 'untyped', value: Math.abs(map), source: 'Multiple Attack Penalty' });
        }
        return creature.pbAttackBonus + map + (0, bonuses_1.resolveStacking)(bonuses, penalties);
    }
    const weapon = creature.equippedWeapon ? (0, weapons_1.getWeapon)(creature.equippedWeapon) : null;
    const effectiveType = attackType ?? weapon?.type ?? 'melee';
    // DEBUG: Log the calculation details
    const isIsera = creature.name && creature.name.includes('Isera');
    if (isIsera) {
        console.log(`
🔍 [CALCULATE ATTACK BONUS] ${creature.name} at level ${creature.level}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Weapon Lookup:
  equippedWeapon ID: "${creature.equippedWeapon}"
  weapon found: ${weapon ? '✅ YES' : '❌ NO'}
  ${weapon ? `weapon name: "${weapon.name}", profCat: "${weapon.proficiencyCategory}"` : ''}
Bonuses Array:
  count: ${creature.bonuses?.length || 0}
  ${creature.bonuses?.map((b, i) => `  [${i}] applyTo="${b.applyTo}" value=${b.value}`).join('\n')}
    `);
    }
    // Ability modifier (finesse: use better of STR/DEX)
    let abilityMod;
    if (weapon && weapon.traits.includes('finesse')) {
        abilityMod = Math.max(creature.abilities?.strength ?? 0, creature.abilities?.dexterity ?? 0);
    }
    else if (effectiveType === 'ranged') {
        abilityMod = creature.abilities?.dexterity ?? 0;
    }
    else {
        abilityMod = creature.abilities?.strength ?? 0;
    }
    // Weapon proficiency
    let profRank = creature.proficiencies?.unarmed ?? 'trained';
    if (weapon) {
        const cat = weapon.proficiencyCategory ?? 'simple';
        switch (cat) {
            case 'simple':
                profRank = creature.proficiencies?.simpleWeapons ?? 'trained';
                break;
            case 'martial':
                profRank = creature.proficiencies?.martialWeapons ?? 'untrained';
                break;
            case 'advanced':
                profRank = creature.proficiencies?.advancedWeapons ?? 'untrained';
                break;
            case 'unarmed':
                profRank = creature.proficiencies?.unarmed ?? 'trained';
                break;
        }
    }
    let profBonus = (0, bonuses_1.getProficiencyBonus)(profRank, creature.level);
    if (isIsera) {
        console.log(`[DEBUG] Proficiency calculation:`, { profRank, profBonus, weaponExists: !!weapon });
    }
    // Check for weapon-specific proficiency bonuses (e.g., Master proficiency with Greatsword)
    if (weapon && creature.bonuses) {
        if (isIsera) {
            console.log(`\n🔎 Checking ${creature.bonuses.length} bonuses for weapon-specific match...`);
        }
        for (const bonus of creature.bonuses) {
            const expectedFormat = `attack:${weapon.name}`;
            const isMatch = bonus.applyTo === expectedFormat;
            if (isIsera) {
                console.log(`  Bonus: "${bonus.applyTo}" ${isMatch ? '✅ MATCHES' : '❌ no match'} (expected: "${expectedFormat}")`);
            }
            if (isMatch) {
                if (isIsera) {
                    console.log(`🎯 WEAPON-SPECIFIC BONUS APPLIED: +${bonus.value} (was +${profBonus}, now +${bonus.value})`);
                }
                profBonus = bonus.value;
                break;
            }
        }
    }
    else if (isIsera && !weapon) {
        console.log(`\n⚠️  Skipping weapon-specific bonus check: weapon is null`);
    }
    let total = abilityMod + profBonus;
    // Gather modifiers for attack
    const { bonuses, penalties } = gatherModifiers(creature, 'attack');
    // Multiple Attack Penalty
    const isAgile = weapon ? weapon.traits.includes('agile') : false;
    const map = (0, bonuses_1.calculateMAP)(creature.attacksMadeThisTurn ?? 0, isAgile);
    if (map < 0) {
        penalties.push({ type: 'untyped', value: Math.abs(map), source: 'Multiple Attack Penalty' });
    }
    const finalModifier = (0, bonuses_1.resolveStacking)(bonuses, penalties);
    total += finalModifier;
    if (isIsera) {
        console.log(`
✨ FINAL ATTACK BONUS CALCULATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ability Modifier (STR):        +${abilityMod}
Proficiency Bonus (${profRank}): +${profBonus}
  └─ Base (${profBonus - creature.level}) + Level(${creature.level})
Base Total:                    +${abilityMod + profBonus}

Additional Modifiers:
  Bonuses:  ${bonuses.map(b => `+${b.value}(${b.source})`).join(', ') || 'none'}
  Penalties: ${penalties.map(p => `-${p.value}(${p.source})`).join(', ') || 'none'}
  Net Modifier:                ${finalModifier > 0 ? '+' : ''}${finalModifier}

✅ FINAL ATTACK BONUS:         +${total}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
    }
    return total;
}
// ─── Save Bonus ──────────────────────────────────────
/**
 * Calculate saving throw bonus (ability + proficiency + modifiers).
 */
function calculateSaveBonus(creature, saveType) {
    let abilityMod;
    let profRank;
    switch (saveType) {
        case 'reflex':
            abilityMod = creature.abilities?.dexterity ?? 0;
            profRank = creature.proficiencies?.reflex ?? 'trained';
            break;
        case 'fortitude':
            abilityMod = creature.abilities?.constitution ?? 0;
            profRank = creature.proficiencies?.fortitude ?? 'trained';
            break;
        case 'will':
            abilityMod = creature.abilities?.wisdom ?? 0;
            profRank = creature.proficiencies?.will ?? 'trained';
            break;
    }
    const profBonus = (0, bonuses_1.getProficiencyBonus)(profRank, creature.level);
    let total = abilityMod + profBonus;
    const { bonuses, penalties } = gatherModifiers(creature, saveType);
    total += (0, bonuses_1.resolveStacking)(bonuses, penalties);
    return total;
}
// ─── Spell DC ────────────────────────────────────────
/**
 * Calculate spell DC (10 + key ability + spell DC proficiency + modifiers).
 */
function calculateSpellDC(creature) {
    const keyAbility = creature.keyAbility || 'charisma';
    const abilityMod = creature.abilities?.[keyAbility] ?? 0;
    const profBonus = (0, bonuses_1.getProficiencyBonus)(creature.proficiencies?.spellDC ?? 'trained', creature.level);
    let dc = 10 + abilityMod + profBonus;
    const { bonuses, penalties } = gatherModifiers(creature, 'spell-dc');
    dc += (0, bonuses_1.resolveStacking)(bonuses, penalties);
    return dc;
}
/**
 * Calculate spell attack bonus (for spells that require an attack roll).
 * Formula: key ability modifier + proficiency bonus + bonuses - penalties
 */
function calculateSpellAttack(creature) {
    const keyAbility = creature.keyAbility || 'charisma';
    const abilityMod = creature.abilities?.[keyAbility] ?? 0;
    const profBonus = (0, bonuses_1.getProficiencyBonus)(creature.proficiencies?.spellAttack ?? 'trained', creature.level);
    let attackBonus = abilityMod + profBonus;
    const { bonuses, penalties } = gatherModifiers(creature, 'spell-attack');
    attackBonus += (0, bonuses_1.resolveStacking)(bonuses, penalties);
    return attackBonus;
}
/**
 * Get just the spell casting ability modifier (for adding to spell damage/healing).
 * Returns the key ability modifier.
 */
function calculateSpellAttackModifier(creature) {
    const keyAbility = creature.keyAbility || 'charisma';
    return creature.abilities?.[keyAbility] ?? 0;
}
// ─── Derived Stats ───────────────────────────────────
/**
 * Recompute cached/derived stats on a creature (call after any stat change).
 */
function computeDerivedStats(creature) {
    creature.armorClass = calculateAC(creature);
}
// ─── Dice & Attack Resolution ────────────────────────
/**
 * Roll a d20.
 */
function rollD20() {
    return Math.floor(Math.random() * 20) + 1;
}
function getAttackResult(d20, total, targetAC) {
    const margin = total - targetAC;
    // Base result from margin
    let result;
    if (margin >= 10)
        result = 'critical-success';
    else if (margin >= 0)
        result = 'success';
    else if (margin <= -10)
        result = 'critical-failure';
    else
        result = 'failure';
    // Natural 20: improve by one degree
    if (d20 === 20) {
        if (result === 'failure')
            result = 'success';
        else if (result === 'success')
            result = 'critical-success';
        else if (result === 'critical-failure')
            result = 'failure';
    }
    // Natural 1: worsen by one degree
    if (d20 === 1) {
        if (result === 'success')
            result = 'failure';
        else if (result === 'critical-success')
            result = 'success';
        else if (result === 'failure')
            result = 'critical-failure';
    }
    return result;
}
function getDegreeOfSuccess(d20, total, dc) {
    const margin = total - dc;
    // Base result from margin
    let result;
    if (margin >= 10)
        result = 'critical-success';
    else if (margin >= 0)
        result = 'success';
    else if (margin <= -10)
        result = 'critical-failure';
    else
        result = 'failure';
    // Natural 20: improve by one degree
    if (d20 === 20) {
        if (result === 'failure')
            result = 'success';
        else if (result === 'success')
            result = 'critical-success';
        else if (result === 'critical-failure')
            result = 'failure';
    }
    // Natural 1: worsen by one degree
    if (d20 === 1) {
        if (result === 'success')
            result = 'failure';
        else if (result === 'critical-success')
            result = 'success';
        else if (result === 'failure')
            result = 'critical-failure';
    }
    return result;
}
// ─── Damage Calculation ──────────────────────────────
/**
 * Calculate weapon damage bonus for attacks
 * PF2e: Damage always uses STR for melee (finesse only affects attack rolls, not damage)
 * Includes ability modifier + item bonuses
 */
function calculateDamageBonus(creature, attackType) {
    const weapon = creature.equippedWeapon ? (0, weapons_1.getWeapon)(creature.equippedWeapon) : null;
    const effectiveType = attackType ?? weapon?.type ?? 'melee';
    // PF2e: Damage always uses STR for melee (finesse only applies to attack rolls)
    // Ranged: Propulsive = half STR if positive, Thrown = full STR, otherwise 0
    let abilityMod;
    if (effectiveType === 'ranged') {
        abilityMod = 0; // Simplified — propulsive/thrown not yet tracked
    }
    else {
        abilityMod = creature.abilities?.strength ?? 0;
    }
    // Start with ability modifier
    let total = abilityMod;
    // Check for weapon-specific damage bonuses (item runes, etc.)
    if (weapon && creature.bonuses) {
        for (const bonus of creature.bonuses) {
            if (bonus.applyTo === `damage:${weapon.name}`) {
                total += bonus.value;
                break;
            }
        }
    }
    return total;
}
/**
 * Calculate the damage formula string for a weapon, accounting for Striking runes
 * E.g., "1d6+4" or "3d8+5"
 */
function calculateDamageFormula(creature, attackType) {
    const weapon = creature.equippedWeapon ? (0, weapons_1.getWeapon)(creature.equippedWeapon) : null;
    if (!weapon)
        return '1d4';
    // Get base formula (e.g., "2d12")
    let formula = weapon.damageFormula;
    // Check for Striking runes and adjust dice count
    if (creature.bonuses) {
        for (const bonus of creature.bonuses) {
            if (bonus.applyTo === `striking:${weapon.name}` && typeof bonus.value === 'number') {
                // Striking runes add dice
                // Extract current dice from formula (e.g., "2d12" -> {count: 2, die: 12})
                const match = formula.match(/(\d+)d(\d+)/);
                if (match) {
                    const originalCount = parseInt(match[1], 10);
                    const die = match[2];
                    // Each Striking rune adds one die
                    const newCount = originalCount + bonus.value;
                    formula = `${newCount}d${die}`;
                }
                break;
            }
        }
    }
    // Add damage bonus
    const bonus = calculateDamageBonus(creature, attackType);
    if (bonus > 0) {
        formula += `+${bonus}`;
    }
    else if (bonus < 0) {
        formula += `${bonus}`;
    }
    return formula;
}
