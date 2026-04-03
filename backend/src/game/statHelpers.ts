// 
// statHelpers.ts  Extracted stat calculation/utility methods from RulesEngine
// Phase 14 refactor: skill bonuses, save DCs, distance, weapon selection, feat checks
// 

import { Creature, CreatureWeapon, Position, WeaponSlot, Spell, getProficiencyBonus, calculateSaveBonus, getArmor, calculateCheckPenalty } from 'pf2e-shared';
import type { AbilityScores } from 'pf2e-shared';

export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getSkillBonus(creature: Creature, skillName: string): number {
  // Try to find the skill in the creature's skills array (from Pathbuilder import)
  const skill = creature.skills?.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
  
  let bonus = 0;
  
  if (skill) {
    bonus = skill.bonus; // Use precomputed bonus from Pathbuilder
  } else {
    // Fallback: compute manually
    // For Deception, use CHA modifier
    const abilityMap: Record<string, keyof AbilityScores> = {
      'deception': 'charisma',
      'perception': 'wisdom',
      'intimidation': 'charisma',
      'diplomacy': 'charisma',
      'athletics': 'strength',
      'acrobatics': 'dexterity',
      'stealth': 'dexterity',
    };

    const abilityKey = abilityMap[skillName.toLowerCase()] || 'charisma';
    const abilityMod = creature.abilities?.[abilityKey] ?? 0;
    
    // Default to trained proficiency if not found
    const profBonus = getProficiencyBonus('trained', creature.level);
    
    bonus = abilityMod + profBonus;
  }
  
  // PHASE 9.3: Apply armor check penalty to STR/DEX-based skills
  // Athletics, Acrobatics, and Stealth suffer armor check penalty unless trained in armor
  const skillsAffectedByArmor = ['athletics', 'acrobatics', 'stealth'];
  if (skillsAffectedByArmor.includes(skillName.toLowerCase()) && creature.equippedArmor) {
    const armor = getArmor(creature.equippedArmor);
    if (armor) {
      // Determine which armor proficiency to use based on armor category
      let armorProficiency: 'untrained' | 'trained' | 'expert' | 'master' | 'legendary' = 'untrained';
      if (armor.category === 'light') {
        armorProficiency = creature.proficiencies?.lightArmor ?? 'untrained';
      } else if (armor.category === 'medium') {
        armorProficiency = creature.proficiencies?.mediumArmor ?? 'untrained';
      } else if (armor.category === 'heavy') {
        armorProficiency = creature.proficiencies?.heavyArmor ?? 'untrained';
      }
      
      const armorCheckPenalty = calculateCheckPenalty(armor, armorProficiency);
      bonus += armorCheckPenalty; // Penalty is negative, so we add it
    }
  }
  
  return bonus;
}

export function getPerceptionDC(creature: Creature): number {
  // Try to find Perception in skills array
  const perceptionSkill = creature.skills?.find((s) => s.name.toLowerCase() === 'perception');
  
  if (perceptionSkill) {
    let bonus = perceptionSkill.bonus;
    
    // PHASE 5.1: FIGHTER BATTLEFIELD SURVEYOR
    // Fighters can take Battlefield Surveyor at level 2+: +2 Perception
    const hasBattlefieldSurveyor = creature.feats?.some((f) => f.name.toLowerCase().includes('battlefield surveyor'));
    if (hasBattlefieldSurveyor) {
      bonus += 2;
    }
    
    return 10 + bonus;
  }

  // Fallback: compute manually
  const wisMod = creature.abilities?.wisdom ?? 0;
  const profBonus = getProficiencyBonus(creature.proficiencies?.perception ?? 'trained', creature.level);
  let perception = wisMod + profBonus;
  
  // PHASE 5.1: FIGHTER BATTLEFIELD SURVEYOR
  // Fighters can take Battlefield Surveyor at level 2+: +2 Perception
  const hasBattlefieldSurveyor = creature.feats?.some((f) => f.name.toLowerCase().includes('battlefield surveyor'));
  if (hasBattlefieldSurveyor) {
    perception += 2;
  }
  
  return 10 + perception;
}

export function getWillDC(creature: Creature): number {
  const willMod = calculateSaveBonus(creature, 'will');
  return 10 + willMod;
}

export function getReflexDC(creature: Creature): number {
  const reflexMod = calculateSaveBonus(creature, 'reflex');
  return 10 + reflexMod;
}

export function getFortitudeDC(creature: Creature): number {
  const fortitudeMod = calculateSaveBonus(creature, 'fortitude');
  return 10 + fortitudeMod;
}

export function getSelectedWeapon(actor: Creature, weaponId?: string): CreatureWeapon | null {
  if (weaponId && actor.weaponInventory) {
    const slot = actor.weaponInventory.find((s: WeaponSlot) => s.weapon?.id === weaponId);
    if (slot) return slot.weapon;
  }
  // Fallback to first held weapon
  if (actor.weaponInventory) {
    const held = actor.weaponInventory.find((s: WeaponSlot) => s.state === 'held');
    if (held) return held.weapon;
  }
  return null;
}

export function hasFeat(creature: Creature, featName: string): boolean {
  const lowerFeatName = featName.toLowerCase().trim();
  
  // Check feats array (exact match on feat name)
  const featMatch = creature.feats?.some((f) => {
    const name = f?.name;
    return typeof name === 'string' && name.toLowerCase().trim() === lowerFeatName;
  });
  
  // Check specials array (exact match)
  const hasSpecial = creature.specials?.some((s: string) => 
    typeof s === 'string' && s.toLowerCase().trim() === lowerFeatName
  );
  
  return featMatch || hasSpecial || false;
}

export function canCastAndConsumeSlot(actor: Creature, spell: Spell, requestedRank?: number): { canCast: boolean; message?: string; heightenedRank?: number } {
  // Cantrips (rank 0) don't consume slots
  if (spell.rank === 0) {
    // Auto-heighten cantrips to half caster level (rounded up)
    const cantripRank = Math.ceil(actor.level / 2);
    return { canCast: true, heightenedRank: cantripRank };
  }

  // Focus spells consume focus points
  if (spell.focus) {
    const availableFP = actor.focusPoints ?? 0;
    if (availableFP <= 0) {
      return { canCast: false, message: `${actor.name} has no focus points remaining!` };
    }
    // Consume 1 focus point
    actor.focusPoints = Math.max(0, availableFP - 1);
    return { canCast: true, heightenedRank: requestedRank ?? spell.rank };
  }

  // Regular spells consume slots
  if (!actor.spellcasters || actor.spellcasters.length === 0) {
    return { canCast: false, message: `${actor.name} is not a spellcaster!` };
  }

  // Find a spellcaster tradition that can cast this spell
  const castingTradition = actor.spellcasters.find((tradition) =>
    spell.traditions.includes(tradition.tradition)
  );

  if (!castingTradition) {
    return { canCast: false, message: `${actor.name} cannot cast ${spell.name} (no matching tradition)!` };
  }

  // Determine which rank to cast at (default to spell's base rank, or heightened rank if requested)
  const rankToCast = requestedRank ?? spell.rank;

  // Find available slot at that rank
  const slot = castingTradition.slots.find((s) => s.level === rankToCast && s.available > 0);

  if (!slot) {
    return { canCast: false, message: `${actor.name} has no rank ${rankToCast} spell slots remaining!` };
  }

  // Consume the slot
  slot.available = Math.max(0, slot.available - 1);

  return { canCast: true, heightenedRank: rankToCast };
}
