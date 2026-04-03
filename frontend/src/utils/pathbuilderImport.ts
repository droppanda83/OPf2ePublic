/**
 * Pathbuilder JSON format parser and converter
 * Converts Pathbuilder 2e character sheets to our Creature type
 */

import { Creature, Position, DamageType } from '../../../shared/types';
import type { ProficiencyRank } from '../../../shared/bonuses';
import { resolveSpellId } from '../../../shared/spells';

type PathbuilderTradition = 'arcane' | 'divine' | 'occult' | 'primal';
type PathbuilderCastingType = 'prepared' | 'spontaneous' | 'innate';

function toTradition(value: unknown, fallback: PathbuilderTradition): PathbuilderTradition {
  if (typeof value !== 'string') return fallback;
  const normalized = value.toLowerCase();
  if (normalized === 'arcane' || normalized === 'divine' || normalized === 'occult' || normalized === 'primal') {
    return normalized;
  }
  return fallback;
}

function toCastingType(value: unknown, fallback: PathbuilderCastingType): PathbuilderCastingType {
  if (typeof value !== 'string') return fallback;
  const normalized = value.toLowerCase();
  if (normalized === 'prepared' || normalized === 'spontaneous' || normalized === 'innate') {
    return normalized;
  }
  return fallback;
}

/**
 * Parse Pathbuilder JSON and convert to Creature
 * Handles the actual Pathbuilder 2e export format
 */
export function parsePathbuilderCharacter(data: unknown): Creature {
  // Handle both raw data and stringified data
  let character = typeof data === 'string' ? JSON.parse(data) : data;

  // Extract the build object if this is a full export
  if (character.success && character.build) {
    character = character.build;
  }

  if (!character.name) {
    throw new Error('Character must have a name');
  }

  if (!character.level || character.level < 1 || character.level > 20) {
    throw new Error('Character must have a valid level (1-20)');
  }

  // Extract ability scores and convert to modifiers
  // Pathbuilder stores raw scores (e.g., 18), but our system uses modifiers (e.g., +4)
  // Formula: modifier = floor((score - 10) / 2)
  const scoreToModifier = (score: number) => Math.floor((score - 10) / 2);
  
  const abilities = {
    strength: scoreToModifier(character.abilities?.str || 10),
    dexterity: scoreToModifier(character.abilities?.dex || 10),
    constitution: scoreToModifier(character.abilities?.con || 10),
    intelligence: scoreToModifier(character.abilities?.int || 10),
    wisdom: scoreToModifier(character.abilities?.wis || 10),
    charisma: scoreToModifier(character.abilities?.cha || 10),
  };

  // Calculate max HP with proper level scaling
  // PF2e formula: (classhp + CON_mod) × level + ancestryhp + feat_bonuses
  // Example for Isera: (10 + 3) × 5 + 8 + 5 (Toughness) = 78
  const conMod = scoreToModifier(character.abilities?.con || 10);
  const classHp = character.attributes?.classhp || 10;
  const ancestryHp = character.attributes?.ancestryhp || 8;
  
  // Calculate feat bonuses (especially Toughness which adds +1 HP/level)
  let featHpBonus = 0;
  if (character.feats && Array.isArray(character.feats)) {
    character.feats.forEach((feat: unknown) => {
      const featName = Array.isArray(feat) && typeof feat[0] === 'string' ? feat[0].toLowerCase() : '';
      if (featName.includes('toughness')) {
        // Toughness adds +1 HP per level
        featHpBonus += character.level || 1;
      }
      // Could add more feat parsing here (Durable, etc.)
    });
  }

  const maxHP = ((classHp + conMod) * (character.level || 1)) + ancestryHp + featHpBonus;

  if (maxHP < 1) {
    throw new Error('Character must have at least 1 HP');
  }

  // Get AC from acTotal
  const armorClass = character.acTotal?.acTotal || 10;

  // Extract proficiencies from the proficiencies object
  // Pathbuilder stores proficiency as base bonus: 0=untrained, 2=trained, 4=expert, 6=master, 8=legendary
  const proficiencies = {
    // Weapons
    unarmed: numToProfRank(character.proficiencies?.unarmed ?? 0),
    simpleWeapons: numToProfRank(character.proficiencies?.simple ?? 0),
    martialWeapons: numToProfRank(character.proficiencies?.martial ?? 0),
    advancedWeapons: numToProfRank(character.proficiencies?.advanced ?? 0),
    
    // Armor
    unarmored: numToProfRank(character.proficiencies?.unarmored ?? 0),
    lightArmor: numToProfRank(character.proficiencies?.light ?? 0),
    mediumArmor: numToProfRank(character.proficiencies?.medium ?? 0),
    heavyArmor: numToProfRank(character.proficiencies?.heavy ?? 0),
    
    // Saves
    fortitude: numToProfRank(character.proficiencies?.fortitude ?? 0),
    reflex: numToProfRank(character.proficiencies?.reflex ?? 0),
    will: numToProfRank(character.proficiencies?.will ?? 0),
    
    // Other
    perception: numToProfRank(character.proficiencies?.perception ?? 0),
    classDC: numToProfRank(character.proficiencies?.classDC ?? 0),
    spellAttack: numToProfRank(character.proficiencies?.castingArcane ?? character.proficiencies?.castingDivine ?? character.proficiencies?.castingOccult ?? character.proficiencies?.castingPrimal ?? 0),
    spellDC: numToProfRank(character.proficiencies?.castingArcane ?? character.proficiencies?.castingDivine ?? character.proficiencies?.castingOccult ?? character.proficiencies?.castingPrimal ?? 0),
  };

  console.log(`[pathbuilderImport] ${character.name} raw proficiencies:`, character.proficiencies);
  console.log(`[pathbuilderImport] ${character.name} converted proficiencies:`, proficiencies);
  console.log(`[pathbuilderImport] ${character.name} specificProficiencies:`, character.specificProficiencies);

  // Get equipped weapon info and its proficiency bonus
  // IMPORTANT: Convert weapon name to weapon ID format (lowercase, with hyphens)
  let weaponId: string | undefined = undefined;
  if (character.weapons?.[0]?.name) {
    // Convert "Greatsword" → "greatsword", "Short Sword" → "short-sword"
    weaponId = character.weapons[0].name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]/g, '');
  }
  const equippedWeapon = character.weapons?.[0]?.name || undefined;
  
  console.log(`[pathbuilderImport] ${character.name} weapon:`, {
    pbName: equippedWeapon,
    weaponId,
    specificMaster: character.specificProficiencies?.master,
    isMaster: equippedWeapon && character.specificProficiencies?.master?.includes(equippedWeapon)
  });
  
  // Check for weapon-specific proficiency bonuses and damage info
  // Pathbuilder uses specificProficiencies to store weapon-specific ranks (trained/expert/master/legendary)
  let weaponSpecificProfRank: ProficiencyRank = 'trained'; // default
  let weaponSpecificProfBonus = 0;
  let weaponDamageBonus = 0;
  let weaponDamageDice = ''; // e.g., "2d8"
  let weaponDamageType: DamageType | '' = '';
  let weaponStrikingRunes = 0;
  let weaponPotencyRunes = 0;
  
  if (character.weapons?.[0]) {
    const pbWeapon = character.weapons[0];
    console.log('[pathbuilderImport] Weapon object keys:', Object.keys(pbWeapon));
    console.log('[pathbuilderImport] Full weapon object:', JSON.stringify(pbWeapon, null, 2));
    // Pathbuilder stores damageBonus (STR + item bonus)
    weaponDamageBonus = pbWeapon.damageBonus || 0;
    
    // Extract damage dice: base die + striking rune bonus
    // die: "d12" is the base die
    // str: "striking", "greaterStriking", "majorStriking" add extra dice
    const baseDie = pbWeapon.die || ''; // e.g., "d12"
    let diceCount = 1; // Start with 1 base die
    
    // Check for Striking rune(s) which add dice
    if (pbWeapon.str === 'striking') {
      weaponStrikingRunes = 1;
      diceCount = 2; // 1d12 becomes 2d12
    } else if (pbWeapon.str === 'greaterStriking') {
      weaponStrikingRunes = 2;
      diceCount = 3; // 1d12 becomes 3d12
    } else if (pbWeapon.str === 'majorStriking') {
      weaponStrikingRunes = 3;
      diceCount = 4; // 1d12 becomes 4d12
    }
    
    // Extract Potency runes (PF2e: only add to attack bonus, NOT damage)
    // Pathbuilder stores as: pot: 1, pot: 2, pot: 3 (or similar field name)
    if (pbWeapon.pot) {
      const potValue = parseInt(pbWeapon.pot, 10);
      if (!isNaN(potValue) && potValue > 0) {
        weaponPotencyRunes = potValue; // +1, +2, or +3
      }
    }
    
    // Build the full damage dice string
    weaponDamageDice = diceCount > 0 && baseDie ? `${diceCount}${baseDie}` : '';
    
    // Extract damage type (S = slashing, B = bludgeoning, P = piercing)
    const damageTypeMap: Record<string, string> = {
      'S': 'slashing',
      'B': 'bludgeoning',
      'P': 'piercing',
      'F': 'fire',
      'C': 'cold',
      'E': 'electricity',
      'A': 'acid',
      'So': 'sonic',
      'N': 'negative',
      'Po': 'positive',
      'M': 'mental',
      'Fo': 'force'
    };
    weaponDamageType = pbWeapon.damageType ? ((damageTypeMap[pbWeapon.damageType] || pbWeapon.damageType) as DamageType) : '';
    
    // Look up weapon-specific proficiency from specificProficiencies
    if (equippedWeapon && character.specificProficiencies) {
      const specProfs = character.specificProficiencies;
      // Check which rank the weapon belongs to
      if (specProfs.master?.includes(equippedWeapon)) {
        weaponSpecificProfRank = 'master';
        weaponSpecificProfBonus = 6 + (character.level || 1);
      } else if (specProfs.legendary?.includes(equippedWeapon)) {
        weaponSpecificProfRank = 'legendary';
        weaponSpecificProfBonus = 8 + (character.level || 1);
      } else if (specProfs.expert?.includes(equippedWeapon)) {
        weaponSpecificProfRank = 'expert';
        weaponSpecificProfBonus = 4 + (character.level || 1);
      } else if (specProfs.trained?.includes(equippedWeapon)) {
        weaponSpecificProfRank = 'trained';
        weaponSpecificProfBonus = 2 + (character.level || 1);
      } else {
        weaponSpecificProfRank = 'trained'; // fallback
        weaponSpecificProfBonus = 2 + (character.level || 1);
      }
    }
    
    console.log(`[pathbuilderImport] ${character.name} weapon-specific prof for ${equippedWeapon}:`, weaponSpecificProfRank);
  }
  
  // Override martialWeapons proficiency with weapon-specific rank if available
  if (weaponSpecificProfRank !== 'trained') {
    proficiencies.martialWeapons = weaponSpecificProfRank;
  }

  // Get equipped armor info
  const equippedArmor = character.armor?.[0]?.name;
  const armorBonus = character.acTotal?.acItemBonus || 0;

  // Extract feats from Pathbuilder format: [name, null, type, level, ...]
  const feats: { name: string; type: string; level: number }[] = [];
  if (character.feats && Array.isArray(character.feats)) {
    character.feats.forEach((feat: unknown) => {
      if (Array.isArray(feat) && feat[0]) {
        feats.push({
          name: feat[0],
          type: feat[2] || 'General', // e.g. "Class Feat", "Ancestry Feat", "Skill Feat"
          level: feat[3] || 1,
        });
      }
    });
  }
  
  console.log('[pathbuilderImport] Extracted feats:', feats);
  console.log('[pathbuilderImport] Feats count:', feats.length);

  // Extract specials array (contains abilities like "Reactive Strike", "Shield Block", etc.)
  const specials: string[] = Array.isArray(character.specials) ? character.specials : [];
  console.log('[pathbuilderImport] Extracted specials:', specials);

  // Extract senses from specials array and/or dedicated senses field.
  // Pathbuilder puts vision senses (darkvision, low-light vision, etc.) in the specials array.
  const SENSE_PATTERNS = /darkvision|low[- ]?light vision|greater darkvision|scent|tremorsense|echolocation|spiritsense|wavesense|lifesense|thoughtsense/i;
  const sensesFromSpecials = specials.filter(s => SENSE_PATTERNS.test(s));
  const sensesFromField: string[] = Array.isArray(character.senses) ? character.senses : [];
  const senses = [...new Set([...sensesFromSpecials, ...sensesFromField])];
  console.log('[pathbuilderImport] Extracted senses:', senses);

  // Extract ALL skills with proficiency ranks (including untrained)
  const skillKeys = [
    'acrobatics', 'arcana', 'athletics', 'crafting', 'deception',
    'diplomacy', 'intimidation', 'medicine', 'nature', 'occultism',
    'performance', 'religion', 'society', 'stealth', 'survival', 'thievery'
  ];
  const skills: { name: string; proficiency: ProficiencyRank; bonus: number; abilityMod: number; profBonus: number }[] = [];
  
  // Log available keys to debug
  console.log('[pathbuilderImport] character structure keys:', Object.keys(character || {}).slice(0, 20));
  console.log('[pathbuilderImport] character.skills exists?', !!character.skills, typeof character.skills);
  console.log('[pathbuilderImport] character.proficiencies:', character.proficiencies);
  
  // Try to extract skills from different possible locations
  const skillsSource = character.skills || character.proficiencies;
  
  //If we have a skills object (either dedicated or proficiencies with skill keys)
  if (skillsSource) {
    for (const skill of skillKeys) {
      // Could be a number directly, or an object with proficiency prop
      const skillData = skillsSource[skill];
      let rawVal = 0;
      
      if (typeof skillData === 'number') {
        rawVal = skillData;
      } else if (skillData?.proficiency) {
        // Convert shorthand: 'T' -> 2, 'E' -> 4, 'M' -> 6, 'L' -> 8
        const shortMap: Record<string, number> = { 'U': 0, 'T': 2, 'E': 4, 'M': 6, 'L': 8 };
        rawVal = shortMap[skillData.proficiency] || 0;
      } else if (typeof skillData === 'object' && skillData?.bonus !== undefined) {
        // Some formats might store a bonus directly
        skills.push({
          name: skill.charAt(0).toUpperCase() + skill.slice(1),
          proficiency: 'trained',
          bonus: skillData.bonus,
          abilityMod: 0,
          profBonus: skillData.bonus,
        });
        continue;
      }
      
      // Calculate bonus for ALL skills (including untrained)
      const rank = numToProfRank(rawVal);
      const abilityMap: Record<string, string> = {
        acrobatics: 'dex', arcana: 'int', athletics: 'str', crafting: 'int',
        deception: 'cha', diplomacy: 'cha', intimidation: 'cha', medicine: 'wis',
        nature: 'wis', occultism: 'int', performance: 'cha', religion: 'wis',
        society: 'int', stealth: 'dex', survival: 'wis', thievery: 'dex'
      };
      const abilityKey = abilityMap[skill] || 'str';
      const abilityScore = character.abilities?.[abilityKey] || 10;
      const abilityMod = Math.floor((abilityScore - 10) / 2);
      const profBonus = rawVal > 0 ? rawVal + (character.level || 1) : 0;
      
      skills.push({
        name: skill.charAt(0).toUpperCase() + skill.slice(1),
        proficiency: rank,
        bonus: abilityMod + profBonus,
        abilityMod,
        profBonus,
      });
    }
  }
  
  console.log('[pathbuilderImport] Extracted skills:', skills);
  console.log('[pathbuilderImport] Skills detail:', skills.map(s => `${s.name} (${s.proficiency}): ${s.bonus}`));

  // Extract lores
  const lores: { name: string; bonus: number }[] = [];
  if (character.lores && Array.isArray(character.lores)) {
    character.lores.forEach((lore: unknown) => {
      if (Array.isArray(lore)) {
        const loreName = lore[0] || 'Unknown';
        const loreRaw = lore[1] || 0;
        const profBonus = loreRaw + (character.level || 1);
        // Lore uses INT modifier
        const intMod = Math.floor(((character.abilities?.int || 10) - 10) / 2);
        lores.push({
          name: `${loreName} Lore`,
          bonus: intMod + profBonus,
        });
      }
    });
  }

  // Store Pathbuilder's calculated attack bonus and weapon display name
  const pbAttackBonus = character.weapons?.[0]?.attack || undefined;
  const weaponDisplayName = character.weapons?.[0]?.display || equippedWeapon || undefined;

  // Extract focus points and hero points
  // Focus points can come from: top-level focusPoints field, spellCasters, or focus object
  let maxFocusPoints = character.focusPoints || 0;
  
  // Check spellCasters for additional focus points
  if (character.spellCasters && Array.isArray(character.spellCasters)) {
    character.spellCasters.forEach((spellCaster: unknown) => {
      if (spellCaster.focusPoints) {
        maxFocusPoints = Math.max(maxFocusPoints, spellCaster.focusPoints);
      }
    });
  }
  
  // If focus object has entries, character has at least 1 focus point (from dedication feats etc.)
  // The focus pool size isn't always stored explicitly - infer from having focus cantrips/spells
  if (maxFocusPoints === 0 && character.focus && typeof character.focus === 'object') {
    const hasFocusEntries = Object.keys(character.focus).some((tradition: string) => {
      const tradData = character.focus[tradition];
      if (!tradData || typeof tradData !== 'object') return false;
      return Object.keys(tradData).some((ability: string) => {
        const abilData = tradData[ability];
        return (abilData?.focusCantrips?.length > 0 || abilData?.focusSpells?.length > 0);
      });
    });
    if (hasFocusEntries) {
      maxFocusPoints = 1; // Dedication feats grant at least 1 focus point
    }
  }
  
  let focusPoints = maxFocusPoints; // Assume full focus at character creation
  const heroPoints = character.attributes?.heroPoints || 1; // Default to 1 hero point

  console.log('[pathbuilderImport] ===== START FOCUS SPELL EXTRACTION =====' );
  console.log('[pathbuilderImport] character.focus exists:', !!character.focus);
  console.log('[pathbuilderImport] character.focus type:', typeof character.focus);
  if (character.focus) {
    console.log('[pathbuilderImport] character.focus keys:', Object.keys(character.focus));
  }
  
  // Extract focus spells and psi cantrips from character.focus object
  // Pathbuilder stores focus data as: focus.{tradition}.{ability}.{focusCantrips[], focusSpells[]}
  const focusSpells: { name: string; level: number; type: 'cantrip' | 'spell'; ampable?: boolean; tradition?: string }[] = [];
  
  if (character.focus && typeof character.focus === 'object') {
    console.log('[pathbuilderImport] Focus data found:', JSON.stringify(character.focus));
    
    // Iterate through traditions (occult, arcane, divine, primal)
    for (const tradition of Object.keys(character.focus)) {
      const traditionData = character.focus[tradition];
      if (!traditionData || typeof traditionData !== 'object') continue;
      
      // Iterate through ability keys (cha, int, wis, etc.)
      for (const ability of Object.keys(traditionData)) {
        const abilityData = traditionData[ability];
        if (!abilityData || typeof abilityData !== 'object') continue;
        
        console.log(`[pathbuilderImport] Focus ${tradition}/${ability}:`, JSON.stringify(abilityData));
        
        // Extract focus cantrips (psi cantrips - castable at will, can be amped with focus point)
        if (abilityData.focusCantrips && Array.isArray(abilityData.focusCantrips)) {
          abilityData.focusCantrips.forEach((cantrip: string) => {
            console.log(`[pathbuilderImport] Found focus cantrip: ${cantrip}`);
            focusSpells.push({
              name: cantrip,
              level: 0,
              type: 'cantrip',
              ampable: true,  // Psi cantrips from Psychic can always be amped
              tradition: tradition
            });
          });
        }
        
        // Extract focus spells (cost 1 focus point to cast)
        if (abilityData.focusSpells && Array.isArray(abilityData.focusSpells)) {
          abilityData.focusSpells.forEach((spell: string) => {
            console.log(`[pathbuilderImport] Found focus spell: ${spell}`);
            focusSpells.push({
              name: spell,
              level: 0,
              type: 'spell',
              ampable: false,
              tradition: tradition
            });
          });
        }
      }
    }
  }
  
  console.log('[pathbuilderImport] Total focus spells/cantrips extracted:', focusSpells);
  console.log('[pathbuilderImport] ===== END FOCUS SPELL EXTRACTION =====' );
  console.log('[pathbuilderImport] Total focus cantrips/spells extracted:', focusSpells.length);
  console.log('[pathbuilderImport] Focus spells detail:', focusSpells);
  console.log('[pathbuilderImport] Will focusSpells be added to creature?', focusSpells.length > 0 ? 'YES' : 'NO');

  // Get spells if any - enhanced extraction with metadata
  let keyAbility: Creature['keyAbility'] = 'wisdom';
  let spells: string[] = []; // Fallback for backward compatibility
  let spellcasters: Array<{
    tradition: 'arcane' | 'divine' | 'occult' | 'primal';
    castingType: 'prepared' | 'spontaneous' | 'innate';
    spells: Array<{
      name: string;
      level: number;
      usage?: 'at-will' | 'once-per-day' | 'twice-per-day' | 'three-times-per-day' | 'once-per-week';
      traits?: string[];
    }>;
    slots: Array<{ level: number; available: number; max: number }>;
    spellAttackBonus?: number;
    spellDC?: number;
  }> = [];

  if (character.spellCasters && character.spellCasters.length > 0) {
    const abilityMap: Record<string, Creature['keyAbility']> = {
      'str': 'strength',
      'dex': 'dexterity',
      'con': 'constitution',
      'int': 'intelligence',
      'wis': 'wisdom',
      'cha': 'charisma'
    };

    character.spellCasters.forEach((spellCaster: unknown, index: number) => {
      if (!spellCaster || typeof spellCaster !== 'object') return;
      const caster = spellCaster as Record<string, unknown>;
      console.log(`[pathbuilderImport] SpellCaster ${index} raw data:`, JSON.stringify(spellCaster, null, 2).substring(0, 1000));
      console.log(`[pathbuilderImport] SpellCaster ${index} keys:`, Object.keys(spellCaster));
      console.log(`[pathbuilderImport] SpellCaster ${index} tradition field:`, caster.tradition);
      console.log(`[pathbuilderImport] SpellCaster ${index} magicTradition field:`, caster.magicTradition);
      console.log(`[pathbuilderImport] SpellCaster ${index} name field:`, caster.name);
      console.log(`[pathbuilderImport] SpellCaster ${index} type field:`, caster.type);
      
      const key = typeof caster.ability === 'string' ? caster.ability : 'wis';
      keyAbility = abilityMap[key] || 'wisdom';

      // Determine tradition - Pathbuilder uses 'magicTradition' field
      let tradition: PathbuilderTradition = 'arcane';
      if (caster.magicTradition) {
        tradition = toTradition(caster.magicTradition, tradition);
      } else if (caster.tradition) {
        tradition = toTradition(caster.tradition, tradition);
      } else if (character.class) {
        const classStr = character.class.toLowerCase();
        if (classStr.includes('cleric') || classStr.includes('champion')) tradition = 'divine';
        else if (classStr.includes('wizard') || classStr.includes('magus')) tradition = 'arcane';
        else if (classStr.includes('sorcerer')) tradition = 'arcane';
        else if (classStr.includes('witch') || classStr.includes('bard') || classStr.includes('psychic')) tradition = 'occult';
        else if (classStr.includes('druid') || classStr.includes('ranger')) tradition = 'primal';
      }

      // Determine casting type - Pathbuilder uses 'spellcastingType' field
      let castingType: PathbuilderCastingType = 'spontaneous';
      if (caster.spellcastingType) {
        castingType = toCastingType(caster.spellcastingType, castingType);
      } else if (caster.innate === true) {
        castingType = 'innate';
      }

      // Extract spells organized by level
      const spellsByLevel: Array<{
        name: string;
        level: number;
        usage?: 'at-will' | 'once-per-day' | 'twice-per-day' | 'three-times-per-day' | 'once-per-week';
        traits?: string[];
      }> = [];

      if (caster.spells && Array.isArray(caster.spells)) {
        caster.spells.forEach((levelData: unknown, levelIndex: number) => {
          if (!levelData || typeof levelData !== 'object') return;
          const levelEntry = levelData as { list?: unknown[] };
          if (levelEntry.list && Array.isArray(levelEntry.list)) {
            levelEntry.list.forEach((spellData: unknown) => {
              const spellRecord = (spellData && typeof spellData === 'object') ? spellData as Record<string, unknown> : null;
              const spellName = typeof spellData === 'string'
                ? spellData
                : (typeof spellRecord?.name === 'string' ? spellRecord.name : 'Unknown Spell');
              spellsByLevel.push({
                name: spellName,
                level: levelIndex,
                usage: spellRecord?.usage as 'at-will' | 'once-per-day' | 'twice-per-day' | 'three-times-per-day' | 'once-per-week' | undefined,
                traits: Array.isArray(spellRecord?.traits) ? (spellRecord?.traits as string[]) : undefined
              });
              
              // Also populate fallback simple spells array
              // Convert Pathbuilder display name to SPELL_CATALOG id
              spells.push(resolveSpellId(spellName));
            });
          }
        });
      }

      // Calculate spell DC and attack bonus
      const abilityScore = character.abilities?.[key] || 10;
      const abilityMod = Math.floor((abilityScore - 10) / 2);
      
      // DC = 10 + proficiency (+2 for trained) + character level + ability modifier
      const spellDC = 10 + 2 + abilityMod + (character.level || 1);
      // Attack bonus follows same pattern without the initial 10
      const spellAttackBonus = 2 + abilityMod + (character.level || 1);

      // Build spell slots array from perDay (Pathbuilder's format)
      const slots: Array<{ level: number; available: number; max: number }> = [];
      if (caster.perDay && Array.isArray(caster.perDay)) {
        caster.perDay.forEach((count: unknown, levelIndex: number) => {
          if (typeof count !== 'number') return;
          if (count > 0) {
            slots.push({
              level: levelIndex,
              available: count,
              max: count
            });
          }
        });
      } else if (caster.slots && Array.isArray(caster.slots)) {
        caster.slots.forEach((slotData: unknown, levelIndex: number) => {
          if (!slotData || typeof slotData !== 'object') return;
          const slot = slotData as { available?: number; max?: number };
          if (slotData) {
            slots.push({
              level: levelIndex,
              available: slot.available || slot.max || 0,
              max: slot.max || 0
            });
          }
        });
      }

      // Only add if has spells
      if (spellsByLevel.length > 0) {
        spellcasters.push({
          tradition,
          castingType,
          spells: spellsByLevel,
          slots,
          spellDC,
          spellAttackBonus
        });
      }
    });
  }

  console.log('[pathbuilderImport] Extracted spells:', spells);
  console.log('[pathbuilderImport] Spellcasters:', spellcasters);
  console.log('[pathbuilderImport] Spells detail:', spells.slice(0, 5).join(', '));

  // Add focus cantrips/spells to the main spells array so they appear in the UI spell menu
  // Convert Pathbuilder display names (e.g., "Warp Step (Archetype)") to SPELL_CATALOG IDs
  for (const fs of focusSpells) {
    const spellId = resolveSpellId(fs.name);
    if (!spells.includes(spellId)) {
      spells.push(spellId);
      console.log(`[pathbuilderImport] Added focus ${fs.type} to spells list: "${fs.name}" → "${spellId}"`);
    }
  }

  // Calculate initiative bonus (Perception skill bonus in PF2e)
  // Initiative = Wisdom mod + Perception proficiency bonus
  const wisMod = scoreToModifier(character.abilities?.wis || 10);
  const perceptionRank = numToProfRank(character.proficiencies?.perception ?? 0);
  const perceptionRankValues: Record<string, number> = {
    'untrained': 0,
    'trained': 2,
    'expert': 4,
    'master': 6,
    'legendary': 8
  };
  const perceptionProfBonus = (perceptionRankValues[perceptionRank] || 0) + (character.level || 1);

  const creature: Creature = {
    id: `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: character.name,
    type: 'player',
    level: character.level,
    abilities,
    maxHealth: maxHP,
    currentHealth: maxHP,
    proficiencies,
    armorClass,
    equippedWeapon: weaponId, // Use weapon ID for backend calculations
    armorBonus,
    equippedShield: undefined,
    shieldRaised: false,
    bonuses: [
      // NOTE: Weapon-specific proficiency bonus is NOT added here because it's already
      // calculated by calculateAttackBonus() - adding it would double-count the bonus!
      // Only add actual item bonuses and rune information for reference
      
      // Potency rune: Item bonus to attack rolls only (PF2e rule)
      // Does NOT have weapon-specific applyTo because it applies to all attacks with the weapon
      ...(weaponPotencyRunes > 0 && equippedWeapon
        ? [{
            type: 'item' as const,
            value: weaponPotencyRunes,
            source: `${equippedWeapon} potency rune +${weaponPotencyRunes}`,
            applyTo: 'attack',
          }]
        : []),
      
      // Weapon damage bonus (STR mod + item bonus from runes)
      ...(weaponDamageBonus > 0 && equippedWeapon
        ? [{
            type: 'status' as const,
            value: weaponDamageBonus,
            source: `${equippedWeapon} damage bonus`,
            applyTo: `damage:${equippedWeapon}`,
          }]
        : []),
    ],
    penalties: [],
    positions: { x: 0, y: 0 } as Position,
    speed: 25, // Default speed for medium creatures
    conditions: [],
    initiative: 0,
    initiativeBonus: wisMod + perceptionProfBonus,
    attacksMadeThisTurn: 0,
    dying: false,
    deathSaveFailures: 0,
    deathSaveSuccesses: 0,
    deathSaveMadeThisTurn: false,
    wounded: 0,
    keyAbility,
    spells,
    spellcasters: spellcasters.length > 0 ? spellcasters : undefined,
    damageResistances: [],
    damageImmunities: [],
    damageWeaknesses: [],
    // Pathbuilder extras
    feats,
    specials: specials.length > 0 ? specials : undefined,
    senses: senses.length > 0 ? senses : undefined,
    skills,
    lores,
    weaponDisplay: weaponDisplayName,
    pbAttackBonus,
    weaponDamageDice: weaponDamageDice || undefined,
    weaponDamageBonus: weaponDamageBonus || undefined,
    weaponDamageType: weaponDamageType || undefined,
    characterClass: character.class || undefined,
    ancestry: (typeof character.ancestry === 'string' ? character.ancestry : character.ancestry?.name) || undefined,
    heritage: character.heritage || character.ancestry?.heritage || undefined,
    maxFocusPoints,
    focusPoints,
    heroPoints,
    focusSpells: focusSpells.length > 0 ? focusSpells : undefined,
  };

  console.log('[pathbuilderImport] ===== FINAL CREATURE OBJECT =====');
  console.log('[pathbuilderImport] Name:', creature.name);
  console.log('[pathbuilderImport] Skills:', creature.skills);
  console.log('[pathbuilderImport] Skills count:', creature.skills?.length ?? 0);
  console.log('[pathbuilderImport] Feats:', creature.feats);
  console.log('[pathbuilderImport] Feats count:', creature.feats?.length ?? 0);
  console.log('[pathbuilderImport] Spells:', creature.spells);
  console.log('[pathbuilderImport] Spells count:', creature.spells?.length ?? 0);
  console.log('[pathbuilderImport] Focus Spells:', creature.focusSpells);
  console.log('[pathbuilderImport] Focus Spells count:', creature.focusSpells?.length ?? 0);
  console.log('[pathbuilderImport] ================================');

  return creature;
}

/**
 * Convert numeric proficiency value from Pathbuilder to our ProficiencyRank
 * 
 * NOTE: Pathbuilder's numeric scale appears to be:
 * 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
 * However this may not account for feats or other modifiers.
 * These values may need adjustment if combat calculations are incorrect.
 */
function numToProfRank(value: number): ProficiencyRank {
  // Pathbuilder stores proficiency as the base bonus value (without level):
  // 0 = untrained, 2 = trained, 4 = expert, 6 = master, 8 = legendary
  switch (value) {
    case 0: return 'untrained';
    case 2: return 'trained';
    case 4: return 'expert';
    case 6: return 'master';
    case 8: return 'legendary';
    default:
      // Handle unexpected values by rounding to nearest known value
      if (value <= 0) return 'untrained';
      if (value <= 3) return 'trained';
      if (value <= 5) return 'expert';
      if (value <= 7) return 'master';
      return 'legendary';
  }
}

/**
 * Validate Pathbuilder JSON format
 */
export function validatePathbuilderJSON(data: unknown): { valid: boolean; error?: string } {
  if (!data) {
    return { valid: false, error: 'Empty data' };
  }

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (_e: unknown) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  // Extract build if this is a full export
  let character = data;
  if (data.success && data.build) {
    character = data.build;
  }

  // Check for required fields
  if (!character.name) {
    return { valid: false, error: 'Missing character name' };
  }

  if (typeof character.level !== 'number' || character.level < 1 || character.level > 20) {
    return { valid: false, error: 'Invalid level (should be 1-20)' };
  }

  // Validate ability scores if present
  if (character.abilities) {
    const { str, dex, con, int: int_val, wis, cha } = character.abilities;
    const abilities = [str, dex, con, int_val, wis, cha].filter(v => v !== undefined);
    
    if (abilities.some((a: number) => typeof a !== 'number' || a < 3 || a > 25)) {
      return { valid: false, error: 'Invalid ability score (should be 3-25)' };
    }
  }

  // Validate HP calculation
  const maxHP = (character.attributes?.ancestryhp || 8) + 
                (character.attributes?.classhp || 10) + 
                (character.attributes?.bonushp || 0);
  
  if (maxHP < 1) {
    return { valid: false, error: 'Invalid maximum HP' };
  }

  return { valid: true };
}
