import { Creature, Condition } from './types';
import { getShield } from './shields';
import { getWeapon } from './weapons';
import { getArmor, getArmorDexCap } from './armor';
import {
  Bonus, Penalty, ProficiencyRank,
  getProficiencyBonus, resolveStacking, calculateMAP
} from './bonuses';
import { getEquipmentBonusesFor, getEquipmentDexCap, getEquipmentDegreeAdjustments, getEquipmentModifierAdjustments } from './equipmentBonuses';

// ─── Condition → Modifier Mapping ────────────────────

/**
 * Convert active conditions into typed bonuses/penalties for a specific check.
 * This is the core bridge between the condition system and the bonus stacking system.
 */
export function getConditionModifiers(
  conditions: Condition[],
  applyTo: string,
  attackerId?: string, // For checking conditional effects like Feint
  attackType?: 'melee' | 'ranged'
): { bonuses: Bonus[]; penalties: Penalty[] } {
  const bonuses: Bonus[] = [];
  const penalties: Penalty[] = [];

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
          if (cond.attackType && attackType && cond.attackType !== attackType) break;

          // Check if this is a conditional off-guard (only applies to specific attacker)
          if (cond.appliesAgainst) {
            // Only apply if the attacker matches
            if (attackerId && cond.appliesAgainst === attackerId) {
              penalties.push({ type: 'circumstance', value: 2, source: 'Off-Guard' });
            }
          } else {
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
          // Prone creatures are off-guard
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
      
      // ═══════════════════════════════════════════════════════════
      // ACTIVE FEAT CONDITIONS
      // ═══════════════════════════════════════════════════════════
      
      case 'nimble-dodge':
        // Nimble Dodge (Rogue): +2 circumstance bonus to AC for 1 round
        if (applyTo === 'ac') {
          bonuses.push({ type: 'circumstance', value: val, source: 'Nimble Dodge' });
        }
        break;
      
      case 'mirror-dodge':
        // Mirror Dodge (Reflection): +2 circumstance bonus to AC for 1 round
        if (applyTo === 'ac') {
          bonuses.push({ type: 'circumstance', value: val, source: 'Mirror Dodge' });
        }
        break;
      
      case 'bon-mot':
        // Bon Mot: -2/-3 status penalty to Perception and Will saves
        if (['will', 'perception'].includes(applyTo)) {
          penalties.push({ type: 'status', value: val, source: `Bon Mot -${val}` });
        }
        break;
      
      case 'point-blank-stance':
        // Point-Blank Stance: +2 circumstance bonus to ranged Strike damage
        if (applyTo === 'damage' && attackType === 'ranged') {
          bonuses.push({ type: 'circumstance', value: val, source: 'Point-Blank Stance' });
        }
        break;
      
      case 'stunned':
        // Stunned: lose actions, -4 to AC (simplified)
        if (applyTo === 'ac') {
          penalties.push({ type: 'status', value: val, source: `Stunned ${val}` });
        }
        break;
      
      case 'slowed':
        // Slowed: lose actions (effect handled in engine, no stat penalty)
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
function gatherModifiers(
  creature: Creature,
  applyTo: string,
  attackerId?: string,
  attackType?: 'melee' | 'ranged'
): { bonuses: Bonus[]; penalties: Penalty[] } {
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

  // Equipment bonuses from worn/held magic items
  if (creature.equippedWornItems && creature.equippedWornItems.length > 0) {
    const equipBonuses = getEquipmentBonusesFor(creature.equippedWornItems, applyTo);
    for (const b of equipBonuses) {
      bonuses.push(b);
    }

    // Apply equipment modifier adjustments (e.g., compass removes no-compass penalty)
    const modAdj = getEquipmentModifierAdjustments(creature.equippedWornItems, applyTo);
    for (const adj of modAdj) {
      if (adj.mode === 'remove') {
        // Remove penalties matching the slug (e.g., 'no-compass', 'no-crowbar')
        const idx = penalties.findIndex(p => p.source?.toLowerCase().replace(/\s+/g, '-') === adj.slug || p.applyTo === adj.slug);
        if (idx >= 0) penalties.splice(idx, 1);
      } else if (adj.mode === 'override' && adj.value !== undefined) {
        // Override: set a specific modifier value (e.g., Pactmaster's Grace override saves to +3)
        bonuses.push({
          type: 'item',
          value: adj.value,
          source: adj.source,
          applyTo,
          condition: adj.condition,
        });
      }
    }
  }

  return { bonuses, penalties };
}

// ─── AC Calculation ──────────────────────────────────

/**
 * Calculate Armor Class.
 * PF2e: 10 + DEX mod (capped by armor) + armor proficiency bonus + item bonus (armor) + stacked modifiers
 */
export function calculateAC(
  creature: Creature,
  attackerId?: string,
  attackType?: 'melee' | 'ranged'
): number {
  const rawDexMod = creature.abilities?.dexterity ?? 0;
  
  // Apply DEX cap from equipped armor (if any)
  let dexCap: number | undefined = undefined;
  if (creature.equippedArmor) {
    const armor = getArmor(creature.equippedArmor);
    if (armor) {
      const cap = getArmorDexCap(armor);
      dexCap = cap !== null ? cap : undefined;
    }
  }

  // Also check equipment DEX cap (e.g., Bands of Force impose DEX cap 5)
  if (creature.equippedWornItems && creature.equippedWornItems.length > 0) {
    const equipDexCap = getEquipmentDexCap(creature.equippedWornItems);
    if (equipDexCap !== undefined) {
      // Use the lower of armor DEX cap and equipment DEX cap
      dexCap = dexCap !== undefined ? Math.min(dexCap, equipDexCap) : equipDexCap;
    }
  }

  const dexMod = dexCap !== undefined ? Math.min(rawDexMod, dexCap) : rawDexMod;

  const armorProfRank: ProficiencyRank = creature.armorBonus > 0
    ? (creature.proficiencies?.lightArmor ?? 'trained')
    : (creature.proficiencies?.unarmored ?? 'trained');
  const profBonus = getProficiencyBonus(armorProfRank, creature.level);

  let ac = 10 + dexMod + profBonus;

  // Gather typed modifiers for AC (passing attackerId for conditional effects)
  const { bonuses, penalties } = gatherModifiers(creature, 'ac', attackerId, attackType);

  // Armor item bonus (goes through stacking)
  if (creature.armorBonus > 0) {
    bonuses.push({ type: 'item', value: creature.armorBonus, source: 'Armor' });
  }

  // Shield circumstance bonus (only when raised — stacks with nothing else of same type)
  if (creature.equippedShield && creature.shieldRaised) {
    const shield = getShield(creature.equippedShield);
    if (shield) {
      bonuses.push({ type: 'circumstance', value: shield.armorBonus, source: shield.name });
    }
  }

  ac += resolveStacking(bonuses, penalties);
  return ac; // PF2e has no AC floor — AC can go below 10 with enough penalties
}

// ─── Attack Bonus ────────────────────────────────────

/**
 * Calculate attack bonus including proficiency, ability modifier, MAP,
 * and all stacking modifiers from conditions/effects.
 */
export function calculateAttackBonus(creature: Creature, attackType?: 'melee' | 'ranged'): number {
  // NPC/bestiary creatures with a flat attack bonus bypass the proficiency calculation
  if (creature.pbAttackBonus !== undefined) {
    const map = calculateMAP(creature.attacksMadeThisTurn ?? 0, false);
    const { bonuses, penalties } = gatherModifiers(creature, 'attack');
    if (map < 0) {
      penalties.push({ type: 'untyped', value: Math.abs(map), source: 'Multiple Attack Penalty' });
    }
    const pbResult = creature.pbAttackBonus + map + resolveStacking(bonuses, penalties);
    console.log(`[ATK CALC] ${creature.name} pbAttackBonus path: pb=${creature.pbAttackBonus} MAP=${map} mods=${resolveStacking(bonuses, penalties)} => ${pbResult}`);
    return pbResult;
  }

  const weapon = creature.equippedWeapon ? getWeapon(creature.equippedWeapon) : null;
  const effectiveType = attackType ?? weapon?.type ?? 'melee';
  
  console.log(`[ATK CALC] ${creature.name}: equippedWeapon="${creature.equippedWeapon}" weaponFound=${!!weapon} weaponCat=${weapon?.proficiencyCategory ?? 'N/A'}`);
  
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
  let abilityMod: number;
  if (weapon && weapon.traits.includes('finesse')) {
    abilityMod = Math.max(creature.abilities?.strength ?? 0, creature.abilities?.dexterity ?? 0);
  } else if (effectiveType === 'ranged') {
    abilityMod = creature.abilities?.dexterity ?? 0;
  } else {
    abilityMod = creature.abilities?.strength ?? 0;
  }

  // Weapon proficiency
  let profRank: ProficiencyRank = creature.proficiencies?.unarmed ?? 'trained';
  const hasAdvancedWeaponTraining = creature.feats?.some((feat: string | { name?: string }) => {
    const name = typeof feat === 'string' ? feat : feat?.name;
    return typeof name === 'string' && name.toLowerCase().trim() === 'advanced weapon training';
  }) || creature.specials?.some((entry: string) =>
    typeof entry === 'string' && entry.toLowerCase().trim() === 'advanced weapon training'
  );
  if (weapon) {
    const cat = weapon.proficiencyCategory ?? 'simple';
    switch (cat) {
      case 'simple':   profRank = creature.proficiencies?.simpleWeapons ?? 'trained'; break;
      case 'martial':  profRank = creature.proficiencies?.martialWeapons ?? 'untrained'; break;
      case 'advanced':
        profRank = hasAdvancedWeaponTraining
          ? (creature.proficiencies?.martialWeapons ?? 'untrained')
          : (creature.proficiencies?.advancedWeapons ?? 'untrained');
        break;
      case 'unarmed':  profRank = creature.proficiencies?.unarmed ?? 'trained'; break;
    }
  }
  let profBonus = getProficiencyBonus(profRank, creature.level);

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
  } else if (isIsera && !weapon) {
    console.log(`\n⚠️  Skipping weapon-specific bonus check: weapon is null`);
  }

  let total = abilityMod + profBonus;

  // Gather modifiers for attack
  const { bonuses, penalties } = gatherModifiers(creature, 'attack');

  // Multiple Attack Penalty
  const isAgile = weapon ? weapon.traits.includes('agile') : false;
  const map = calculateMAP(creature.attacksMadeThisTurn ?? 0, isAgile);
  if (map < 0) {
    penalties.push({ type: 'untyped', value: Math.abs(map), source: 'Multiple Attack Penalty' });
  }

  const finalModifier = resolveStacking(bonuses, penalties);
  total += finalModifier;
  
  console.log(`[ATK CALC] ${creature.name}: abilityMod=${abilityMod} profRank=${profRank} profBonus=${profBonus} MAP=${map} mods=${finalModifier} => total=${total} (level=${creature.level}, attacksMade=${creature.attacksMadeThisTurn})`);
  console.log(`[ATK CALC] ${creature.name}: bonuses=[${bonuses.map(b => `${b.type}:${b.value}(${b.source})`).join(', ')}] penalties=[${penalties.map(p => `${p.type}:${p.value}(${p.source})`).join(', ')}]`);
  
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
export function calculateSaveBonus(
  creature: Creature,
  saveType: 'reflex' | 'fortitude' | 'will'
): number {
  let abilityMod: number;
  let profRank: ProficiencyRank;

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

  const profBonus = getProficiencyBonus(profRank, creature.level);
  let total = abilityMod + profBonus;

  const { bonuses, penalties } = gatherModifiers(creature, saveType);
  total += resolveStacking(bonuses, penalties);

  return total;
}

// ─── Spell DC ────────────────────────────────────────

/**
 * Calculate spell DC (10 + key ability + spell DC proficiency + modifiers).
 */
export function calculateSpellDC(creature: Creature): number {
  const keyAbility = creature.keyAbility || 'charisma';
  const abilityMod = creature.abilities?.[keyAbility] ?? 0;
  const profBonus = getProficiencyBonus(
    creature.proficiencies?.spellDC ?? 'trained',
    creature.level
  );

  let dc = 10 + abilityMod + profBonus;

  const { bonuses, penalties } = gatherModifiers(creature, 'spell-dc');
  dc += resolveStacking(bonuses, penalties);

  return dc;
}

/**
 * Calculate spell attack bonus (for spells that require an attack roll).
 * Formula: key ability modifier + proficiency bonus + bonuses - penalties
 */
export function calculateSpellAttack(creature: Creature): number {
  const keyAbility = creature.keyAbility || 'charisma';
  const abilityMod = creature.abilities?.[keyAbility] ?? 0;
  const profBonus = getProficiencyBonus(
    creature.proficiencies?.spellAttack ?? 'trained',
    creature.level
  );

  let attackBonus = abilityMod + profBonus;

  const { bonuses, penalties } = gatherModifiers(creature, 'spell-attack');
  attackBonus += resolveStacking(bonuses, penalties);

  return attackBonus;
}

/**
 * Get just the spell casting ability modifier (for adding to spell damage/healing).
 * Returns the key ability modifier.
 */
export function calculateSpellAttackModifier(creature: Creature): number {
  const keyAbility = creature.keyAbility || 'charisma';
  return creature.abilities?.[keyAbility] ?? 0;
}

// ─── Derived Stats ───────────────────────────────────

/**
 * Recompute cached/derived stats on a creature (call after any stat change).
 */
export function computeDerivedStats(creature: Creature): void {
  creature.armorClass = calculateAC(creature);
}

// ─── Dice & Attack Resolution ────────────────────────

/**
 * Roll a d20.
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Determine the degree of success for an attack roll vs AC.
 * PF2e: Natural 20 improves by one degree, Natural 1 worsens by one degree.
 */
export type AttackResult = 'critical-success' | 'success' | 'failure' | 'critical-failure';

export function getAttackResult(d20: number, total: number, targetAC: number): AttackResult {
  const margin = total - targetAC;

  // Base result from margin
  let result: AttackResult;
  if (margin >= 10)      result = 'critical-success';
  else if (margin >= 0)  result = 'success';
  else if (margin <= -10) result = 'critical-failure';
  else                    result = 'failure';

  // Natural 20: improve by one degree
  if (d20 === 20) {
    if (result === 'failure')          result = 'success';
    else if (result === 'success')     result = 'critical-success';
    else if (result === 'critical-failure') result = 'failure';
  }

  // Natural 1: worsen by one degree
  if (d20 === 1) {
    if (result === 'success')          result = 'failure';
    else if (result === 'critical-success') result = 'success';
    else if (result === 'failure')     result = 'critical-failure';
  }

  return result;
}

/**
 * Generic degree-of-success resolver for any check (saves, skill checks, flat checks).
 * PF2e: Natural 20 improves by one degree, Natural 1 worsens by one degree.
 * Use this instead of duplicating the margin + nat20/nat1 logic everywhere.
 */
export type DegreeOfSuccess = 'critical-success' | 'success' | 'failure' | 'critical-failure';

export function getDegreeOfSuccess(d20: number, total: number, dc: number): DegreeOfSuccess {
  const margin = total - dc;

  // Base result from margin
  let result: DegreeOfSuccess;
  if (margin >= 10)       result = 'critical-success';
  else if (margin >= 0)   result = 'success';
  else if (margin <= -10) result = 'critical-failure';
  else                    result = 'failure';

  // Natural 20: improve by one degree
  if (d20 === 20) {
    if (result === 'failure')               result = 'success';
    else if (result === 'success')          result = 'critical-success';
    else if (result === 'critical-failure') result = 'failure';
  }

  // Natural 1: worsen by one degree
  if (d20 === 1) {
    if (result === 'success')               result = 'failure';
    else if (result === 'critical-success') result = 'success';
    else if (result === 'failure')          result = 'critical-failure';
  }

  return result;
}

/**
 * Apply equipment-based degree-of-success adjustments.
 * Items like Armbands of the Gorgon can upgrade success → critical success on saves vs incapacitation,
 * or Headbands of Translocation can upgrade critical failure → failure on skill checks.
 *
 * @param result - The base degree of success
 * @param equippedWornItems - IDs of equipped worn/held items
 * @param selector - The check type ('saving-throw', 'skill-check', 'attack-roll')
 * @returns The adjusted degree of success
 */
export function applyDegreeAdjustments(
  result: DegreeOfSuccess,
  equippedWornItems: string[] | undefined,
  selector: string
): DegreeOfSuccess {
  if (!equippedWornItems || equippedWornItems.length === 0) return result;

  const adjustments = getEquipmentDegreeAdjustments(equippedWornItems, selector);
  let adjusted = result;

  for (const adj of adjustments) {
    // Parse adjustment string: "success:one-degree-better,criticalFailure:one-degree-better"
    const parts = adj.adjustment.split(',');
    for (const part of parts) {
      const [fromDeg, direction] = part.split(':');
      if (adjusted !== fromDeg && adjusted !== camelToKebab(fromDeg)) continue;

      if (direction === 'one-degree-better') {
        if (adjusted === 'critical-failure') adjusted = 'failure';
        else if (adjusted === 'failure') adjusted = 'success';
        else if (adjusted === 'success') adjusted = 'critical-success';
      } else if (direction === 'one-degree-worse') {
        if (adjusted === 'critical-success') adjusted = 'success';
        else if (adjusted === 'success') adjusted = 'failure';
        else if (adjusted === 'failure') adjusted = 'critical-failure';
      }
    }
  }

  return adjusted;
}

/** Convert camelCase degree name to kebab-case (e.g., 'criticalFailure' → 'critical-failure') */
function camelToKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ─── Damage Calculation ──────────────────────────────

/**
 * Calculate weapon damage bonus for attacks
 * PF2e: Damage always uses STR for melee (finesse only affects attack rolls, not damage)
 * Includes ability modifier + item bonuses
 */
export function calculateDamageBonus(creature: Creature, attackType?: 'melee' | 'ranged'): number {
  const weapon = creature.equippedWeapon ? getWeapon(creature.equippedWeapon) : null;
  const effectiveType = attackType ?? weapon?.type ?? 'melee';

  // PF2e: Damage always uses STR for melee (finesse only applies to attack rolls)
  // Ranged: Propulsive = half STR if positive, Thrown = full STR, otherwise 0
  let abilityMod: number;
  if (effectiveType === 'ranged') {
    abilityMod = 0; // Simplified — propulsive/thrown not yet tracked
  } else {
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
export function calculateDamageFormula(creature: Creature, attackType?: 'melee' | 'ranged'): string {
  const weapon = creature.equippedWeapon ? getWeapon(creature.equippedWeapon) : null;
  if (!weapon) return '1d4';

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
  } else if (bonus < 0) {
    formula += `${bonus}`;
  }

  return formula;
}

