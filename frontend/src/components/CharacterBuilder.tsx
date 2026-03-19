/**
 * Character Builder Wizard
 * Step-by-step PF2e character creation interface
 * Steps: 1. Ancestry/Heritage, 2. Background, 3. Class, 4. Abilities, 5. Name/Level, 6. Optional Rules, 7. Level 1 Skills/Feats, 8. Level Progression (2+), 9. Buy Equipment, 10. Review
 */

import React, { useState, useEffect } from 'react';
import type { CharacterSheet, SkillProficiency, ProficiencyProfile } from '../../../shared/types';
import type { AbilityName } from '../../../shared/bonuses';
import { getSelectableClassFeats, getClassFeatures, getSelectableSkillFeats, getSelectableGeneralFeats, getSelectableAncestryFeats, getFeatById, type FeatEntry } from '../../../shared/feats';
import { CharacterService } from '../services/characterService';
import { WEAPON_CATALOG } from '../../../shared/weapons';
import { ARMOR_CATALOG } from '../../../shared/armor';
import { SHIELD_CATALOG } from '../../../shared/shields';
import { CONSUMABLES_HEALING, CONSUMABLE_CATALOG, CONSUMABLES_BOMBS, CONSUMABLES_ELIXIRS, CONSUMABLES_SCROLLS, CONSUMABLES_TALISMANS } from '../../../shared/consumables';
import { ADVENTURING_GEAR } from '../../../shared/adventuringGear';
import { WORN_ITEMS } from '../../../shared/wornItems';
import { WEAPON_PROPERTY_RUNES, ARMOR_PROPERTY_RUNES } from '../../../shared/runes';
import { SPELL_CATALOG, type Spell } from '../../../shared/spells';
import './CharacterBuilder.css';
import { EquipmentPicker, type PickerItem } from './EquipmentPicker';
import {
  type CharacterBuilderProps, type BuilderState,
  HERITAGES, VERSATILE_HERITAGES, VERSATILE_HERITAGE_DESCRIPTIONS,
  ANCESTRY_BOOSTS, ANCESTRIES, BACKGROUND_BOOSTS, BACKGROUNDS, getEffectiveSenses,
  SKILLS, SKILL_ABILITIES, BACKGROUND_SKILLS, CLASS_SKILLS,
  getClassProgression, CLASS_BOOSTS, getClassBoostOptions,
  BASE_PROFICIENCIES, CLASS_STARTING_PROFICIENCIES, CLASSES, SUPPORTED_CLASSES,
  BASE_ABILITIES, ABILITY_LABELS, ROGUE_RACKETS, DEITIES,
  applyClassFeatureProficiencies,
  PROFICIENCY_RANKS, type ProfRank,
  WEALTH_BY_LEVEL, getDefaultGold,
  CONSCIOUS_MINDS, SUBCONSCIOUS_MINDS, HYBRID_STUDIES,
  SORCERER_BLOODLINES,
  WIZARD_ARCANE_SCHOOLS,
  BARBARIAN_INSTINCTS,
  CHAMPION_CAUSES,
  RANGER_HUNTERS_EDGES,
  CLERIC_DOCTRINES,
  CLASS_SPELLCASTING, isSpellcastingClass, validateAncestryCoverage,
} from './characterBuilderData';
import {
  computeAbilityScores, computeSkillProficiencies,
  getBoostLevels, getBoostsPerLevel, getAncestryFeatSlots,
  getIntSkillSlots, getIntBonusSkillLevels,
} from './characterBuilderHelpers';
import { BuilderStepLevel1 } from './BuilderStepLevel1';
import { BuilderStepProgression } from './BuilderStepProgression';
import { BuilderStepClass } from './BuilderStepClass';
import { generateRandomName } from './nameGenerator';

const DEFAULT_BUILDER_STATE: BuilderState = {
    name: '',
    level: 1,
    ancestry: 'Human',
    heritage: HERITAGES.Human[0],
    heritageType: 'standard',
    background: 'Acrobat',
    class: 'Fighter',
    ancestryBoosts: [],
    backgroundBoost: 'Strength',
    backgroundFreeBoost: 'Constitution',
    classBoost: 'Strength',
    freeBoosts: ['strength', 'dexterity', 'constitution', 'intelligence'],
    abilities: { ...BASE_ABILITIES },
    optionalRules: {
      gradualAbilityBoosts: false,
      ancestryParagon: false,
      freeArchetype: false,
    },
    classAutoSkillChoice: '',
    classSkills: [],
    rogueRacket: '',
    rogueDeity: '',
    consciousMind: '',
    subconsciousMind: '',
    hybridStudy: '',
    bloodline: '',
    arcaneSchool: '',
    instinct: '',
    championCause: '',
    huntersEdge: '',
    doctrine: '',
    loreSpecialty: 'Circus Lore',
    skillIncreases: {},
    intBonusSkills: {},
    classFeats: {},
    skillFeats: {},
    generalFeats: {},
    ancestryFeats: {},
    archetypeFeats: {},
    archetypeBonusFeats: {},
    archetypeConsciousMind: '',
    archetypePsiCantrip: '',
    archetypePsiCantrip2: '',
    ancestryBonusClassFeat: '',
    ancestryBonusGeneralFeat: '',
    featSubChoices: {},
    levelBoosts: {},
    notes: '',
    // Equipment / Buy step
    equipmentWeapons: [],
    equipmentWeaponRunes: [],
    equipmentArmor: '',
    equipmentArmorRunes: {},
    equipmentShield: '',
    equipmentHandwraps: false,
    equipmentHandwrapRunes: {},
    equipmentConsumables: [],
    equipmentGear: [],
    equipmentWornItems: [],
    goldBudget: 15, // Default level 1 wealth
    customGold: false,
    // Spellcasting
    knownCantrips: [],
    knownSpells: [],
    preparedSpells: {},
    // Token & Portrait images
    tokenImageUrl: '',
    portraitImageUrl: '',
    // Bio / Description
    pronouns: '',
    age: '',
    height: '',
    weight: '',
    description: '',
  };

export const CharacterBuilder: React.FC<CharacterBuilderProps> = ({ onCharacterCreated, onCancel, initialState, editingCharacterId }) => {
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [character, setCharacter] = useState<BuilderState>(
    initialState ? { ...DEFAULT_BUILDER_STATE, ...initialState } : DEFAULT_BUILDER_STATE
  );

  const ancestryCoverageIssues = validateAncestryCoverage();

  // ── Sync goldBudget with level when using default (instead of setState during render) ──
  useEffect(() => {
    if (!character.customGold) {
      const defaultGold = getDefaultGold(character.level);
      if (character.goldBudget !== defaultGold) {
        setCharacter(prev => ({ ...prev, goldBudget: defaultGold }));
      }
    }
  }, [character.level, character.customGold]);


  // ─── STEP VALIDATION ────────────────────────────────────

  const validateStep = (stepNum: number): boolean => {
    const errors: string[] = [];

    switch (stepNum) {
      case 1:
        if (!character.ancestry) errors.push('Please select an ancestry.');
        if (!character.heritage) errors.push('Please select a heritage.');
        break;
      case 2:
        if (!character.background) errors.push('Please select a background.');
        break;
      case 3:
        if (!character.class) errors.push('Please select a class.');
        if (character.class === 'Rogue' && !character.rogueRacket) errors.push("Please select a Rogue's Racket.");
        if (character.class === 'Rogue' && character.rogueRacket === 'avenger' && !character.rogueDeity) errors.push('Please select a deity for the Avenger racket.');
        if (character.class === 'Psychic' && !character.consciousMind) errors.push('Please select a Conscious Mind.');
        if (character.class === 'Psychic' && !character.subconsciousMind) errors.push('Please select a Subconscious Mind.');
        if (character.class === 'Magus' && !character.hybridStudy) errors.push('Please select a Hybrid Study.');
        if (character.class === 'Sorcerer' && !character.bloodline) errors.push('Please select a Bloodline.');
        if (character.class === 'Wizard' && !character.arcaneSchool) errors.push('Please select an Arcane School.');
        if (character.class === 'Barbarian' && !character.instinct) errors.push('Please select an Instinct.');
        if (character.class === 'Champion' && !character.championCause) errors.push('Please select a Cause.');
        if (character.class === 'Ranger' && !character.huntersEdge) errors.push('Please select a Hunter\'s Edge.');
        if (character.class === 'Cleric' && !character.doctrine) errors.push('Please select a Doctrine.');
        break;
      case 4:
        // Step 4 validates level-1 boosts only (level-up boosts are in step 7)
        break;
      case 5:
        if (!character.name) errors.push('Please enter your character name.');
        if (character.level < 1 || character.level > 20) errors.push('Level must be between 1 and 20.');
        break;
      case 6:
        break; // Optional rules step
      case 7: {
        // Validate Level 1 skills and feats only
        const classSkillData = CLASS_SKILLS[character.class];
        // Validate class auto skill choice (e.g., Fighter: Acrobatics or Athletics)
        if (classSkillData?.choiceTrained && classSkillData.choiceTrained.length > 0 && !character.classAutoSkillChoice) {
          errors.push(`Please choose one of: ${classSkillData.choiceTrained.join(' or ')}.`);
        }
        // Validate additional skill picks
        const numAdditional = getIntSkillSlots(character);
        const selectedSkills = character.classSkills.filter(s => s !== '');
        if (selectedSkills.length < numAdditional) {
          errors.push(`Please select ${numAdditional} additional trained skills (${selectedSkills.length}/${numAdditional} selected).`);
        }
        // Validate Level 1 feat slots only
        const prog7 = getClassProgression(character.class);
        if (prog7) {
          const lv1ClassFeats = prog7.classFeatLevels.filter(l => l === 1);
          const unfilledLv1ClassFeats = lv1ClassFeats
            .filter(l => getSelectableClassFeats(character.class, l).length > 0 && !character.classFeats[l]);
          if (unfilledLv1ClassFeats.length > 0) {
            errors.push('Please select your level 1 class feat.');
          }
          const lv1SkillFeats = prog7.skillFeatLevels.filter(l => l === 1);
          const unfilledLv1SkillFeats = lv1SkillFeats
            .filter(l => getSelectableSkillFeats(l).length > 0 && !character.skillFeats[l]);
          if (unfilledLv1SkillFeats.length > 0) {
            errors.push('Please select your level 1 skill feat.');
          }
          // Level 1 ancestry feats (including paragon extra at level 1)
          const lv1AncestrySlots = getAncestryFeatSlots(character).filter(l => Math.floor(l) === 1);
          const vh = character.heritageType === 'versatile' ? character.heritage : undefined;
          const unfilledLv1Ancestry = lv1AncestrySlots
            .filter(l => getSelectableAncestryFeats(character.ancestry, Math.floor(l), vh).length > 0 && !character.ancestryFeats[l]);
          if (unfilledLv1Ancestry.length > 0) {
            errors.push(`Please select your level 1 ancestry feat${unfilledLv1Ancestry.length > 1 ? 's' : ''}.`);
          }
          // Validate bonus feats from Natural Ambition / General Training
          const selectedAncestryFeatIds = Object.values(character.ancestryFeats).filter(Boolean);
          if (selectedAncestryFeatIds.includes('natural-ambition') && !character.ancestryBonusClassFeat) {
            errors.push('Natural Ambition: please select your bonus 1st-level class feat.');
          }
          if (selectedAncestryFeatIds.includes('general-training') && !character.ancestryBonusGeneralFeat) {
            errors.push('General Training: please select your bonus 1st-level general feat.');
          }
        }
        break;
      }
      case 8: {
        // Validate Level 2+ progression (ability boosts + feats + skill increases)
        if (character.level > 1) {
          // Validate level-up ability boosts
          const boostLevels = getBoostLevels(character).filter(l => l <= character.level);
          for (const bl of boostLevels) {
            const needed = getBoostsPerLevel(character, bl);
            const picks = (character.levelBoosts[bl] || []).filter(Boolean);
            if (picks.length < needed) {
              errors.push(`Please select ${needed} ability boost${needed > 1 ? 's' : ''} at level ${bl} (${picks.length}/${needed}).`);
            }
          }
          // Validate skill increases
          const prog8si = getClassProgression(character.class);
          if (prog8si) {
            const unfilledSkillIncreases = prog8si.skillIncreaseLevels
              .filter(l => l <= character.level)
              .filter(l => !character.skillIncreases[l]);
            if (unfilledSkillIncreases.length > 0) {
              errors.push(`Please select skill increases for level ${unfilledSkillIncreases.join(', ')}.`);
            }
          }
          // Validate INT bonus skills
          const intBonusLvls = getIntBonusSkillLevels(character);
          const unfilledIntBonus = intBonusLvls.filter(l => !character.intBonusSkills[l]);
          if (unfilledIntBonus.length > 0) {
            errors.push(`Please select additional trained skills from Intelligence at level ${unfilledIntBonus.join(', ')}.`);
          }
          // Validate Lv2+ feat slots
          const prog8 = getClassProgression(character.class);
          if (prog8) {
            const unfilledClassFeats = prog8.classFeatLevels
              .filter(l => l > 1 && l <= character.level)
              .filter(l => getSelectableClassFeats(character.class, l).length > 0 && !character.classFeats[l]);
            if (unfilledClassFeats.length > 0) {
              errors.push(`Please select class feats for level ${unfilledClassFeats.join(', ')} slot(s).`);
            }
            const unfilledSkillFeats = prog8.skillFeatLevels
              .filter(l => l > 1 && l <= character.level)
              .filter(l => getSelectableSkillFeats(l).length > 0 && !character.skillFeats[l]);
            if (unfilledSkillFeats.length > 0) {
              errors.push(`Please select skill feats for level ${unfilledSkillFeats.join(', ')} slot(s).`);
            }
            const unfilledGeneralFeats = prog8.generalFeatLevels
              .filter(l => l <= character.level)
              .filter(l => getSelectableGeneralFeats(l).length > 0 && !character.generalFeats[l]);
            if (unfilledGeneralFeats.length > 0) {
              errors.push(`Please select general feats for level ${unfilledGeneralFeats.join(', ')} slot(s).`);
            }
            // Ancestry feats Lv2+ (using getAncestryFeatSlots helper)
            const lv2PlusAncestrySlots = getAncestryFeatSlots(character).filter(l => Math.floor(l) > 1);
            const vh2 = character.heritageType === 'versatile' ? character.heritage : undefined;
            const unfilledAncestryFeats = lv2PlusAncestrySlots
              .filter(l => getSelectableAncestryFeats(character.ancestry, Math.floor(l), vh2).length > 0 && !character.ancestryFeats[l]);
            if (unfilledAncestryFeats.length > 0) {
              errors.push(`Please select ancestry feats for level ${unfilledAncestryFeats.map(l => Math.floor(l)).join(', ')} slot(s).`);
            }
          }
        }
        break;
      }
      case 9: {
        // Spellcasting step — skip validation for non-casters
        if (isSpellcastingClass(character.class)) {
          const config = CLASS_SPELLCASTING[character.class];
          if (config) {
            const cantripSlots = config.cantripsKnown(character.level);
            if (character.knownCantrips.length < cantripSlots) {
              errors.push(`Please select ${cantripSlots} cantrips (${character.knownCantrips.length}/${cantripSlots} selected).`);
            }
            const spellsKnownByRank = config.getSpellsKnown(character.level);
            const totalNeeded = spellsKnownByRank.reduce((sum, s) => sum + s.count, 0);
            if (character.knownSpells.length < totalNeeded) {
              errors.push(`Please select ${totalNeeded} spells for your spellbook/repertoire (${character.knownSpells.length}/${totalNeeded} selected).`);
            }
            // Validate prepared spells for prepared casters
            if (config.castingType === 'prepared') {
              const slots = config.getSlots(character.level);
              for (const slot of slots) {
                const prepared = character.preparedSpells[slot.rank] || [];
                if (prepared.length < slot.count) {
                  errors.push(`Please prepare ${slot.count} rank ${slot.rank} spell(s) (${prepared.length}/${slot.count} prepared).`);
                }
              }
            }
          }
        }
        break;
      }
      case 10: {
        // Equipment step — no mandatory purchases, but warn if overspent
        const spent = getEquipmentSpent();
        if (spent > character.goldBudget) {
          errors.push(`You have overspent your gold budget by ${formatGp(spent - character.goldBudget)}. Remove items or increase your budget.`);
        }
        break;
      }
      case 11:
        // Final validation before creation
        if (!character.name) errors.push('Character name is required.');
        if (!character.class) errors.push('Character class is required.');
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ─── STEP NAVIGATION ────────────────────────────────────

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
      setValidationErrors([]);
    }
  };

  /** Build a CharacterSheet from the current builder state (returns null if validation fails) */
  const buildCharacterSheet = (): CharacterSheet | null => {
    if (!validateStep(11)) return null;

    // Compute final ability scores including all level-up boosts
    const finalScores = computeAbilityScores(character);
    // Compute final skill proficiencies
    const finalProfs = computeSkillProficiencies(character);
    const skillsArray: SkillProficiency[] = [];
    Object.entries(finalProfs).forEach(([name, rank]) => {
      const ability = (SKILL_ABILITIES[name] || 'intelligence') as AbilityName;
      const abilityMod = Math.floor(((finalScores[ability] || 10) - 10) / 2);
      const profBonus = rank === 'trained' ? 2 : rank === 'expert' ? 4 : rank === 'master' ? 6 : rank === 'legendary' ? 8 : 0;
      skillsArray.push({ name, proficiency: rank, ability, bonus: abilityMod + profBonus + (rank !== 'untrained' ? character.level : 0) });
    });

    const selectedFeats: CharacterSheet['feats'] = [];
    const pushFeat = (featId: string, type: 'class' | 'skill' | 'general' | 'ancestry' | 'archetype', fallbackLevel: number) => {
      const feat = getFeatById(featId);
      selectedFeats.push({
        name: feat?.name ?? featId,
        level: feat?.level ?? fallbackLevel,
        type,
      });
    };

    Object.entries(character.classFeats).forEach(([level, featId]) => {
      if (!featId) return;
      pushFeat(featId, 'class', Number(level));
    });
    Object.entries(character.skillFeats).forEach(([level, featId]) => {
      if (!featId) return;
      pushFeat(featId, 'skill', Number(level));
    });
    Object.entries(character.generalFeats).forEach(([level, featId]) => {
      if (!featId) return;
      pushFeat(featId, 'general', Number(level));
    });
    Object.entries(character.ancestryFeats).forEach(([level, featId]) => {
      if (!featId) return;
      pushFeat(featId, 'ancestry', Math.floor(Number(level)));
    });
    // Bonus feats from ancestry feats (Natural Ambition → class feat, General Training → general feat)
    if (character.ancestryBonusClassFeat) {
      pushFeat(character.ancestryBonusClassFeat, 'class', 1);
    }
    if (character.ancestryBonusGeneralFeat) {
      pushFeat(character.ancestryBonusGeneralFeat, 'general', 1);
    }
    // Free Archetype feats (text input until catalog is populated)
    if (character.optionalRules.freeArchetype) {
      Object.entries(character.archetypeFeats).forEach(([level, featName]) => {
        if (!featName) return;
        // Try catalog lookup first, fall back to raw name
        const feat = getFeatById(featName);
        selectedFeats.push({
          name: feat?.name ?? featName,
          level: feat?.level ?? Number(level),
          type: 'archetype',
        });
      });
      // Also add bonus feats granted by archetype feats (e.g., from Basic Maneuver)
      Object.entries(character.archetypeBonusFeats).forEach(([level, featId]) => {
        if (!featId) return;
        pushFeat(featId, 'class', Number(level));
      });
    }

    // Convert BuilderState to CharacterSheet
    const proficiencies: ProficiencyProfile = applyClassFeatureProficiencies(
      character.class,
      character.level,
      {
        ...BASE_PROFICIENCIES,
        ...(CLASS_STARTING_PROFICIENCIES[character.class] || {}),
      },
      { doctrine: character.doctrine }
    );

    const characterSheet: CharacterSheet = {
      id: CharacterService.generateCharacterId(),
      name: character.name,
      level: character.level,
      currentXP: 0,
      ancestry: character.ancestry,
      heritage: character.heritage,
      background: character.background,
      class: character.class,
      abilities: finalScores as any,
      proficiencies,
      skills: skillsArray,
      feats: selectedFeats,
      specialNotes: character.notes,
      createdAt: Date.now(),
      // Equipment purchases
      weaponIds: character.equipmentWeapons.length > 0 ? character.equipmentWeapons : undefined,
      weaponRunes: character.equipmentWeaponRunes.some(r => (r.potencyRune || r.strikingRune || (r.propertyRunes && r.propertyRunes.length > 0)))
        ? character.equipmentWeaponRunes
        : undefined,
      armorId: character.equipmentArmor || undefined,
      armorRunes: (character.equipmentArmorRunes.potencyRune || character.equipmentArmorRunes.resilientRune || (character.equipmentArmorRunes.propertyRunes && character.equipmentArmorRunes.propertyRunes.length > 0))
        ? character.equipmentArmorRunes
        : undefined,
      shieldId: character.equipmentShield || undefined,
      handwrapRunes: character.equipmentHandwraps && (character.equipmentHandwrapRunes.potencyRune || character.equipmentHandwrapRunes.strikingRune || (character.equipmentHandwrapRunes.propertyRunes && character.equipmentHandwrapRunes.propertyRunes.length > 0))
        ? character.equipmentHandwrapRunes
        : character.equipmentHandwraps ? {} : undefined,
      inventory: (() => {
        const items: { id: string; itemName: string; quantity: number }[] = [];
        // Consumables (all types)
        for (const c of character.equipmentConsumables) {
          const item = CONSUMABLE_CATALOG[c.id];
          items.push({ id: c.id, itemName: item?.name ?? c.id, quantity: c.qty });
        }
        // Adventuring Gear
        for (const g of character.equipmentGear) {
          const item = ADVENTURING_GEAR[g.id];
          items.push({ id: g.id, itemName: item?.name ?? g.id, quantity: g.qty });
        }
        // Worn / Held Magic Items
        for (const wId of character.equipmentWornItems) {
          const item = WORN_ITEMS[wId];
          items.push({ id: wId, itemName: item?.name ?? wId, quantity: 1 });
        }
        return items.length > 0 ? items : undefined;
      })(),
      equippedWornItems: character.equipmentWornItems.length > 0 ? [...character.equipmentWornItems] : undefined,
      remainingGold: Math.max(0, character.goldBudget - getEquipmentSpent()),
      // Spellcasting
      knownCantrips: character.knownCantrips.length > 0 ? character.knownCantrips : undefined,
      knownSpells: character.knownSpells.length > 0 ? character.knownSpells : undefined,
      preparedSpells: Object.keys(character.preparedSpells).length > 0 ? character.preparedSpells : undefined,
      // Token & Portrait images
      tokenImageUrl: character.tokenImageUrl || undefined,
      portraitImageUrl: character.portraitImageUrl || undefined,
      // Bio / Description
      pronouns: character.pronouns || undefined,
      age: character.age || undefined,
      height: character.height || undefined,
      weight: character.weight || undefined,
      description: character.description || undefined,
    };

    // Add class-specific fields
    if (character.class === 'Rogue' && character.rogueRacket) {
      characterSheet.classSpecific = {
        rogueRacket: character.rogueRacket as 'thief' | 'ruffian' | 'scoundrel' | 'mastermind' | 'avenger',
        ...(character.rogueRacket === 'avenger' && character.rogueDeity ? { rogueDeity: character.rogueDeity } : {}),
      };
    }
    if (character.class === 'Psychic') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        consciousMind: character.consciousMind,
        subconsciousMind: character.subconsciousMind,
      };
    }
    if (character.class === 'Magus') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        hybridStudy: character.hybridStudy,
      };
    }
    if (character.class === 'Sorcerer') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        bloodline: character.bloodline,
      };
    }
    if (character.class === 'Wizard') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        arcaneSchool: character.arcaneSchool,
      };
    }
    if (character.class === 'Barbarian') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        instinct: character.instinct,
      };
    }
    if (character.class === 'Champion') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        championCause: character.championCause,
      };
    }
    if (character.class === 'Ranger') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        huntersEdge: character.huntersEdge,
      };
    }
    if (character.class === 'Cleric') {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        doctrine: character.doctrine,
      };
    }

    // Archetype psychic dedication sub-choices (stored even if not class Psychic)
    if (character.archetypeConsciousMind) {
      characterSheet.classSpecific = {
        ...(characterSheet.classSpecific || {}),
        archetypeConsciousMind: character.archetypeConsciousMind,
        archetypePsiCantrip: character.archetypePsiCantrip,
        archetypePsiCantrip2: character.archetypePsiCantrip2,
      };
    }

    // Attach the full BuilderState so the character can be re-opened for editing
    characterSheet.builderState = { ...character };

    // If editing an existing character, preserve the original ID
    if (editingCharacterId) {
      characterSheet.id = editingCharacterId;
    }

    return characterSheet;
  };

  const handleCreate = () => {
    try {
      const sheet = buildCharacterSheet();
      if (sheet) {
        onCharacterCreated(sheet);
      }
    } catch (error: any) {
      console.error('Character creation failed:', error);
      setValidationErrors([`Creation error: ${error?.message || String(error)}`]);
    }
  };

  // ─── STEP RENDERERS ────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderAncestryStep();
      case 2:
        return renderBackgroundStep();
      case 3:
        return renderClassStep();
      case 4:
        return renderAbilitiesStep();
      case 5:
        return renderNameAndLevelStep();
      case 6:
        return renderOptionalRulesStep();
      case 7:
        return <BuilderStepLevel1 character={character} setCharacter={setCharacter} />;
      case 8:
        return <BuilderStepProgression character={character} setCharacter={setCharacter} />;
      case 9:
        return renderSpellcastingStep();
      case 10:
        return renderEquipmentStep();
      case 11:
        return renderReviewStep();
      default:
        return null;
    }
  };

  // ─── SPELLCASTING STEP RENDERER ──────────────────────────

  const renderSpellcastingStep = () => {
    const baseConfig = CLASS_SPELLCASTING[character.class];
    if (!baseConfig) {
      return (
        <div className="step-content">
          <h2>📖 Spellcasting</h2>
          <p style={{ color: '#aaa', padding: '20px' }}>
            {character.class} does not have spellcasting. You can skip this step.
          </p>
        </div>
      );
    }

    // Override tradition for Sorcerers based on bloodline choice
    const bloodlineData = character.class === 'Sorcerer'
      ? SORCERER_BLOODLINES.find(b => b.id === character.bloodline)
      : null;
    const config = bloodlineData
      ? { ...baseConfig, tradition: bloodlineData.tradition }
      : baseConfig;

    const cantripSlots = config.cantripsKnown(character.level);
    const slots = config.getSlots(character.level);
    const spellsKnownConfig = config.getSpellsKnown(character.level);
    const totalSpellsNeeded = spellsKnownConfig.reduce((sum, s) => sum + s.count, 0);
    const maxRank = spellsKnownConfig.length > 0 ? Math.max(...spellsKnownConfig.map(s => s.rank)) : 0;

    // Per-rank limits map for spell enforcement
    const rankLimits: Record<number, number> = {};
    for (const { rank, count } of spellsKnownConfig) {
      rankLimits[rank] = count;
    }

    // Psychic conscious mind cantrips (granted automatically)
    const consciousMindData = character.class === 'Psychic'
      ? CONSCIOUS_MINDS.find(m => m.id === character.consciousMind)
      : null;
    const grantedCantripIds = new Set<string>(consciousMindData?.grantedCantrips ?? []);
    const standardCantripIds = new Set<string>(consciousMindData?.standardCantrips ?? []);

    // Filter SPELL_CATALOG by tradition
    const availableCantrips = Object.values(SPELL_CATALOG).filter(
      s => s.rank === 0 && s.traditions.includes(config.tradition)
    );
    const availableSpellsByRank: Record<number, Spell[]> = {};
    for (let rank = 1; rank <= maxRank; rank++) {
      availableSpellsByRank[rank] = Object.values(SPELL_CATALOG).filter(
        s => s.rank === rank && s.traditions.includes(config.tradition)
      );
    }

    const toggleCantrip = (spellId: string) => {
      // Don't allow toggling off granted psi cantrips
      if (grantedCantripIds.has(spellId) || standardCantripIds.has(spellId)) return;
      const current = [...character.knownCantrips];
      const idx = current.indexOf(spellId);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else if (current.length < cantripSlots) {
        current.push(spellId);
      }
      setCharacter({ ...character, knownCantrips: current });
    };

    const toggleSpell = (spellId: string) => {
      const spell = SPELL_CATALOG[spellId];
      if (!spell) return;
      const current = [...character.knownSpells];
      const idx = current.indexOf(spellId);
      if (idx >= 0) {
        current.splice(idx, 1);
        // Also remove from prepared if present
        const newPrepared = { ...character.preparedSpells };
        for (const rank of Object.keys(newPrepared)) {
          newPrepared[Number(rank)] = newPrepared[Number(rank)].filter(id => id !== spellId);
        }
        setCharacter({ ...character, knownSpells: current, preparedSpells: newPrepared });
      } else {
        // Enforce per-rank limit
        const knownAtThisRank = current.filter(id => {
          const s = SPELL_CATALOG[id];
          return s && s.rank === spell.rank;
        }).length;
        const limit = rankLimits[spell.rank] ?? 0;
        if (knownAtThisRank < limit) {
          current.push(spellId);
          setCharacter({ ...character, knownSpells: current });
        }
      }
    };

    const togglePrepared = (rank: number, spellId: string) => {
      const slotConfig = slots.find(s => s.rank === rank);
      if (!slotConfig) return;
      const newPrepared = { ...character.preparedSpells };
      const current = newPrepared[rank] || [];
      const idx = current.indexOf(spellId);
      if (idx >= 0) {
        newPrepared[rank] = current.filter(id => id !== spellId);
      } else if (current.length < slotConfig.count) {
        newPrepared[rank] = [...current, spellId];
      }
      setCharacter({ ...character, preparedSpells: newPrepared });
    };

    return (
      <div className="step-content">
        <h2>📖 Spellcasting — {config.tradition.charAt(0).toUpperCase() + config.tradition.slice(1)} ({config.castingType})</h2>
        <p style={{ color: '#aaa', marginBottom: '16px' }}>
          {config.castingType === 'prepared'
            ? `As a prepared caster, you learn spells into your spellbook, then prepare specific spells each day into your spell slots.`
            : `As a spontaneous caster, you build a spell repertoire. You can cast any spell you know using an available slot of that rank or higher.`
          }
        </p>

        {/* ── Cantrip Selection ── */}
        <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(120,80,200,0.1)', border: '1px solid rgba(120,80,200,0.3)', borderRadius: '8px' }}>
          <h3 style={{ color: '#b898e0', margin: '0 0 8px' }}>
            Cantrips ({character.knownCantrips.length}/{cantripSlots})
          </h3>
          <p style={{ fontSize: '12px', color: '#999', margin: '0 0 12px' }}>
            Cantrips are at-will spells that auto-heighten to rank {Math.ceil(character.level / 2)}. Select {cantripSlots} cantrips.
          </p>
          {/* Granted psi cantrips (Psychic only) */}
          {consciousMindData && (grantedCantripIds.size > 0 || standardCantripIds.size > 0) && (
            <div style={{ marginBottom: '10px', padding: '8px 12px', background: 'rgba(180,120,255,0.12)', border: '1px solid rgba(180,120,255,0.25)', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: '#c8a8f0', fontWeight: 'bold' }}>
                🧠 {consciousMindData.name} — Granted Cantrips:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {[...grantedCantripIds, ...standardCantripIds].map(id => {
                  const spell = SPELL_CATALOG[id];
                  if (!spell) return null;
                  return (
                    <span key={id} style={{
                      padding: '4px 10px', borderRadius: '6px',
                      border: '2px solid #c8a8f0', background: 'rgba(180,120,255,0.2)',
                      color: '#e0d0ff', fontSize: '12px',
                    }}>
                      {spell.icon} {spell.name} {grantedCantripIds.has(id) ? '(Psi)' : ''}  ✦
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {availableCantrips.map(spell => {
              const selected = character.knownCantrips.includes(spell.id);
              return (
                <button
                  key={spell.id}
                  onClick={() => toggleCantrip(spell.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: selected ? '2px solid #b898e0' : '1px solid #555',
                    background: selected ? 'rgba(120,80,200,0.25)' : 'rgba(40,40,50,0.8)',
                    color: selected ? '#e0d0ff' : '#aaa',
                    cursor: character.knownCantrips.length >= cantripSlots && !selected ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: character.knownCantrips.length >= cantripSlots && !selected ? 0.5 : 1,
                  }}
                  disabled={character.knownCantrips.length >= cantripSlots && !selected}
                >
                  {spell.icon} {spell.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Spell Selection by Rank ── */}
        {spellsKnownConfig.map(({ rank, count }) => {
          const spellsAtRank = availableSpellsByRank[rank] || [];
          const knownAtRank = character.knownSpells.filter(id => {
            const s = SPELL_CATALOG[id];
            return s && s.rank === rank;
          });
          const slotConfig = slots.find(s => s.rank === rank);
          const preparedAtRank = character.preparedSpells[rank] || [];

          return (
            <div key={rank} style={{ marginBottom: '20px', padding: '16px', background: 'rgba(60,120,200,0.08)', border: '1px solid rgba(60,120,200,0.25)', borderRadius: '8px' }}>
              <h3 style={{ color: '#8eb8e0', margin: '0 0 4px' }}>
                Rank {rank} Spells — {config.castingType === 'prepared' ? 'Spellbook' : 'Repertoire'} ({knownAtRank.length}/{count})
                {slotConfig && (
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#999', marginLeft: '12px' }}>
                    {slotConfig.count} slot{slotConfig.count !== 1 ? 's' : ''}/day
                  </span>
                )}
              </h3>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>
                {config.castingType === 'prepared'
                  ? `Learn ${count} rank ${rank} spells into your spellbook. Then prepare them in your ${slotConfig?.count || 0} daily slot(s).`
                  : `Add ${count} rank ${rank} spell(s) to your repertoire.`
                }
              </p>
              {/* Available spells to learn */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: config.castingType === 'prepared' ? '12px' : '0' }}>
                {spellsAtRank.map(spell => {
                  const known = character.knownSpells.includes(spell.id);
                  const canAdd = knownAtRank.length < count || known;
                  return (
                    <button
                      key={spell.id}
                      onClick={() => toggleSpell(spell.id)}
                      title={spell.description}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: known ? '2px solid #6496c8' : '1px solid #555',
                        background: known ? 'rgba(60,120,200,0.2)' : 'rgba(40,40,50,0.8)',
                        color: known ? '#b8d0f0' : '#aaa',
                        cursor: !canAdd ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        opacity: !canAdd ? 0.5 : 1,
                      }}
                      disabled={!canAdd}
                    >
                      {spell.icon} {spell.name}
                      {spell.damageFormula && <span style={{ fontSize: '11px', color: '#888', marginLeft: '4px' }}>({spell.damageFormula})</span>}
                    </button>
                  );
                })}
                {spellsAtRank.length === 0 && (
                  <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>No rank {rank} spells available in the {config.tradition} tradition yet.</p>
                )}
              </div>

              {/* Prepared caster: slot assignment */}
              {config.castingType === 'prepared' && slotConfig && knownAtRank.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,200,50,0.08)', border: '1px solid rgba(255,200,50,0.2)', borderRadius: '6px' }}>
                  <h4 style={{ color: '#d4a050', margin: '0 0 6px', fontSize: '13px' }}>
                    Prepare in Slots ({preparedAtRank.length}/{slotConfig.count})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {knownAtRank.map(id => {
                      const spell = SPELL_CATALOG[id];
                      if (!spell) return null;
                      const isPrepared = preparedAtRank.includes(id);
                      const canPrepare = preparedAtRank.length < slotConfig.count || isPrepared;
                      return (
                        <button
                          key={id}
                          onClick={() => togglePrepared(rank, id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: isPrepared ? '2px solid #d4a050' : '1px solid #555',
                            background: isPrepared ? 'rgba(255,200,50,0.15)' : 'rgba(40,40,50,0.6)',
                            color: isPrepared ? '#f0d080' : '#888',
                            cursor: !canPrepare ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            opacity: !canPrepare ? 0.5 : 1,
                          }}
                          disabled={!canPrepare}
                        >
                          {isPrepared ? '✦ ' : '○ '}{spell.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div style={{ padding: '12px', background: 'rgba(50,50,60,0.5)', borderRadius: '6px', marginTop: '12px' }}>
          <h4 style={{ color: '#ccc', margin: '0 0 8px', fontSize: '14px' }}>Spell Summary</h4>
          <div style={{ fontSize: '13px', color: '#aaa' }}>
            <div>Tradition: <strong style={{ color: '#e0e0e0' }}>{config.tradition}</strong> | Casting: <strong style={{ color: '#e0e0e0' }}>{config.castingType}</strong></div>
            <div>Cantrips: {character.knownCantrips.length}/{cantripSlots}</div>
            <div>Spells known: {character.knownSpells.length}/{totalSpellsNeeded}</div>
            {config.castingType === 'prepared' && (
              <div>
                Slots prepared: {slots.map(s => {
                  const prepared = character.preparedSpells[s.rank] || [];
                  return `R${s.rank}: ${prepared.length}/${s.count}`;
                }).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── EQUIPMENT HELPERS ──────────────────────────────────

  /** Format GP value with proper PF2e denominations */
  const formatGp = (gp: number): string => {
    if (gp >= 1) return `${gp.toLocaleString()} gp`;
    const sp = Math.round(gp * 10);
    if (sp >= 1) return `${sp} sp`;
    const cp = Math.round(gp * 100);
    return `${cp} cp`;
  };

  const WEAPON_POTENCY_RUNE_PRICES: Record<1 | 2 | 3, number> = { 1: 35, 2: 935, 3: 8935 };
  const ARMOR_POTENCY_RUNE_PRICES: Record<1 | 2 | 3, number> = { 1: 160, 2: 1060, 3: 20560 };
  const STRIKING_RUNE_PRICES: Record<'striking' | 'greater-striking' | 'major-striking', number> = {
    'striking': 65,
    'greater-striking': 1065,
    'major-striking': 31065,
  };
  const RESILIENT_RUNE_PRICES: Record<'resilient' | 'greater-resilient' | 'major-resilient', number> = {
    'resilient': 340,
    'greater-resilient': 3440,
    'major-resilient': 49440,
  };

  const updateWeaponRunesAt = (weaponIndex: number, patch: Partial<BuilderState['equipmentWeaponRunes'][number]>) => {
    const nextRunes = [...character.equipmentWeaponRunes];
    if (!nextRunes[weaponIndex]) nextRunes[weaponIndex] = {};
    nextRunes[weaponIndex] = { ...nextRunes[weaponIndex], ...patch };
    setCharacter({ ...character, equipmentWeaponRunes: nextRunes });
  };

  /** Calculate total GP spent on selected equipment */
  const getEquipmentSpent = (): number => {
    let total = 0;
    // Weapons
    for (let index = 0; index < character.equipmentWeapons.length; index++) {
      const wId = character.equipmentWeapons[index];
      const w = WEAPON_CATALOG[wId];
      if (w) total += w.price;

      const runeData = character.equipmentWeaponRunes[index];
      if (runeData?.potencyRune) total += WEAPON_POTENCY_RUNE_PRICES[runeData.potencyRune];
      if (runeData?.strikingRune) total += STRIKING_RUNE_PRICES[runeData.strikingRune];
      if (runeData?.propertyRunes && runeData.propertyRunes.length > 0) {
        for (const runeId of runeData.propertyRunes) {
          const rune = WEAPON_PROPERTY_RUNES[runeId];
          if (rune) total += rune.price;
        }
      }
    }
    // Armor
    if (character.equipmentArmor) {
      const a = ARMOR_CATALOG[character.equipmentArmor];
      if (a) total += a.price;

      if (character.equipmentArmorRunes.potencyRune) {
        total += ARMOR_POTENCY_RUNE_PRICES[character.equipmentArmorRunes.potencyRune];
      }
      if (character.equipmentArmorRunes.resilientRune) {
        total += RESILIENT_RUNE_PRICES[character.equipmentArmorRunes.resilientRune];
      }
      if (character.equipmentArmorRunes.propertyRunes && character.equipmentArmorRunes.propertyRunes.length > 0) {
        for (const runeId of character.equipmentArmorRunes.propertyRunes) {
          const rune = ARMOR_PROPERTY_RUNES[runeId];
          if (rune) total += rune.price;
        }
      }
    }
    // Shield
    if (character.equipmentShield) {
      const s = SHIELD_CATALOG[character.equipmentShield];
      if (s) total += s.price;
    }
    // Handwraps of Mighty Blows (base: 5 gp)
    if (character.equipmentHandwraps) {
      total += 5;
      const hw = character.equipmentHandwrapRunes;
      if (hw?.potencyRune) total += WEAPON_POTENCY_RUNE_PRICES[hw.potencyRune];
      if (hw?.strikingRune) total += STRIKING_RUNE_PRICES[hw.strikingRune];
      if (hw?.propertyRunes && hw.propertyRunes.length > 0) {
        for (const runeId of hw.propertyRunes) {
          const rune = WEAPON_PROPERTY_RUNES[runeId];
          if (rune) total += rune.price;
        }
      }
    }
    // Consumables
    for (const c of character.equipmentConsumables) {
      const item = CONSUMABLE_CATALOG[c.id];
      if (item) total += item.price * c.qty;
    }
    // Adventuring Gear
    for (const g of character.equipmentGear) {
      const item = ADVENTURING_GEAR[g.id];
      if (item) total += item.price * g.qty;
    }
    // Worn / Held Magic Items
    for (const wId of character.equipmentWornItems) {
      const item = WORN_ITEMS[wId];
      if (item) total += item.price;
    }
    return Math.round(total * 100) / 100; // Avoid floating point drift
  };

  // ─── EQUIPMENT STEP RENDERER ────────────────────────────

  const renderEquipmentStep = () => {
    const defaultGold = getDefaultGold(character.level);
    const spent = getEquipmentSpent();
    const remaining = character.goldBudget - spent;
    const overspent = remaining < 0;

    const selectStyle: React.CSSProperties = {
      padding: '8px 10px', fontSize: '14px',
      backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0',
      border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    };

    const itemRowStyle: React.CSSProperties = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
      marginBottom: '4px',
    };

    return (
      <div className="step-content" style={{ maxWidth: '700px' }}>
        <h2>🛒 Buy Equipment</h2>
        <p>Purchase weapons, armor, shields, and consumables for your character. Items deduct from your gold budget.</p>

        {/* ── Gold Budget ── */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: overspent ? '1px solid #e74c3c' : '1px solid #4a4a6a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#d4af37', fontWeight: 600 }}>💰 Gold Budget</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: overspent ? '#e74c3c' : '#4caf50' }}>
              {formatGp(remaining)} remaining
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ccc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={character.customGold}
                onChange={e => {
                  if (!e.target.checked) {
                    setCharacter({ ...character, customGold: false, goldBudget: defaultGold });
                  } else {
                    setCharacter({ ...character, customGold: true });
                  }
                }}
              />
              Custom gold amount
            </label>
            {character.customGold ? (
              <input
                type="number"
                min={0}
                step={1}
                value={character.goldBudget}
                onChange={e => setCharacter({ ...character, goldBudget: Math.max(0, Number(e.target.value)) })}
                style={{ ...selectStyle, width: '120px' }}
              />
            ) : (
              <span style={{ color: '#aaa' }}>Default for level {character.level}: {formatGp(defaultGold)}</span>
            )}
          </div>

          {character.customGold && character.goldBudget !== defaultGold && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(231, 165, 50, 0.15)', border: '1px solid #e7a532', borderRadius: '4px', fontSize: '12px', color: '#e7a532' }}>
              ⚠️ Custom gold amount ({formatGp(character.goldBudget)}) differs from the standard PF2e wealth for level {character.level} ({formatGp(defaultGold)}). This may affect game balance.
            </div>
          )}

          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            Spent: {formatGp(spent)} / {formatGp(character.goldBudget)}
          </div>
        </div>

        {/* ── Weapons ── */}
        <div className="form-group">
          <label>⚔️ Weapons</label>
          {character.equipmentWeapons.map((wId, idx) => {
            const w = WEAPON_CATALOG[wId];
            const runeData = character.equipmentWeaponRunes[idx] || {};
            return (
              <div key={idx} style={{ ...itemRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span>{w?.icon} {w?.name} ({w?.damageFormula} {w?.damageType}) — {formatGp(w?.price ?? 0)}</span>
                    {w?.traits && w.traits.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {w.traits.map(t => (
                          <span key={t} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(147,112,219,0.25)', border: '1px solid rgba(147,112,219,0.4)', color: '#c4a6e8' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const nextWeapons = [...character.equipmentWeapons];
                      nextWeapons.splice(idx, 1);
                      const nextRunes = [...character.equipmentWeaponRunes];
                      nextRunes.splice(idx, 1);
                      setCharacter({ ...character, equipmentWeapons: nextWeapons, equipmentWeaponRunes: nextRunes });
                    }}
                  >✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select
                    value={runeData.potencyRune ?? ''}
                    onChange={(e) => updateWeaponRunesAt(idx, {
                      potencyRune: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined,
                    })}
                    style={selectStyle}
                  >
                    <option value="">Potency Rune (none)</option>
                    <option value="1">+1 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[1])}</option>
                    <option value="2">+2 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[2])}</option>
                    <option value="3">+3 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[3])}</option>
                  </select>

                  <select
                    value={runeData.strikingRune ?? ''}
                    onChange={(e) => updateWeaponRunesAt(idx, {
                      strikingRune: e.target.value ? e.target.value as 'striking' | 'greater-striking' | 'major-striking' : undefined,
                    })}
                    style={selectStyle}
                  >
                    <option value="">Striking Rune (none)</option>
                    <option value="striking">Striking — {formatGp(STRIKING_RUNE_PRICES['striking'])}</option>
                    <option value="greater-striking">Greater Striking — {formatGp(STRIKING_RUNE_PRICES['greater-striking'])}</option>
                    <option value="major-striking">Major Striking — {formatGp(STRIKING_RUNE_PRICES['major-striking'])}</option>
                  </select>
                </div>

                <div>
                  {(runeData.propertyRunes ?? []).map((runeId) => {
                    const rune = WEAPON_PROPERTY_RUNES[runeId];
                    return (
                      <div key={`${idx}-${runeId}`} style={{ ...itemRowStyle, marginBottom: '6px' }}>
                        <span>🔷 {rune?.name ?? runeId} — {formatGp(rune?.price ?? 0)}</span>
                        <button
                          style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                          onClick={() => {
                            const next = (runeData.propertyRunes ?? []).filter(id => id !== runeId);
                            updateWeaponRunesAt(idx, { propertyRunes: next });
                          }}
                        >✕</button>
                      </div>
                    );
                  })}
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const existing = runeData.propertyRunes ?? [];
                      if (existing.includes(e.target.value)) return;
                      updateWeaponRunesAt(idx, { propertyRunes: [...existing, e.target.value] });
                    }}
                    style={selectStyle}
                  >
                    <option value="">+ Add weapon property rune...</option>
                    {Object.values(WEAPON_PROPERTY_RUNES)
                      .filter(r => !(runeData.propertyRunes ?? []).includes(r.id))
                      .map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} (Lv {r.level}) — {formatGp(r.price)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            );
          })}
          <EquipmentPicker
            label="+ Add weapon..."
            items={Object.values(WEAPON_CATALOG).map(w => ({
              id: w.id, name: w.name, price: w.price,
              category: w.proficiencyCategory,
              traits: w.traits,
              subtitle: `${w.damageFormula} ${w.damageType} · ${w.type} · ${w.hands}h`,
            }))}
            categoryLabel="Proficiency"
            categories={['simple', 'martial', 'advanced', 'unarmed']}
            onPick={id => {
              setCharacter({
                ...character,
                equipmentWeapons: [...character.equipmentWeapons, id],
                equipmentWeaponRunes: [...character.equipmentWeaponRunes, {}],
              });
            }}
            formatGp={formatGp}
            allowDuplicates
          />
        </div>

        {/* ── Handwraps of Mighty Blows ── */}
        <div className="form-group">
          <label>🥊 Handwraps of Mighty Blows</label>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
            Applies fundamental and property runes to all your unarmed attacks (fist, claw, etc.). Base cost: {formatGp(5)}.
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', cursor: 'pointer', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={character.equipmentHandwraps}
              onChange={e => {
                if (!e.target.checked) {
                  setCharacter({ ...character, equipmentHandwraps: false, equipmentHandwrapRunes: {} });
                } else {
                  setCharacter({ ...character, equipmentHandwraps: true });
                }
              }}
            />
            Purchase Handwraps of Mighty Blows — {formatGp(5)}
          </label>

          {character.equipmentHandwraps && (
            <div style={{ ...itemRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select
                  value={character.equipmentHandwrapRunes.potencyRune ?? ''}
                  onChange={(e) => setCharacter({
                    ...character,
                    equipmentHandwrapRunes: {
                      ...character.equipmentHandwrapRunes,
                      potencyRune: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined,
                    },
                  })}
                  style={selectStyle}
                >
                  <option value="">Potency Rune (none)</option>
                  <option value="1">+1 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[1])}</option>
                  <option value="2">+2 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[2])}</option>
                  <option value="3">+3 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[3])}</option>
                </select>

                <select
                  value={character.equipmentHandwrapRunes.strikingRune ?? ''}
                  onChange={(e) => setCharacter({
                    ...character,
                    equipmentHandwrapRunes: {
                      ...character.equipmentHandwrapRunes,
                      strikingRune: e.target.value ? e.target.value as 'striking' | 'greater-striking' | 'major-striking' : undefined,
                    },
                  })}
                  style={selectStyle}
                >
                  <option value="">Striking Rune (none)</option>
                  <option value="striking">Striking — {formatGp(STRIKING_RUNE_PRICES['striking'])}</option>
                  <option value="greater-striking">Greater Striking — {formatGp(STRIKING_RUNE_PRICES['greater-striking'])}</option>
                  <option value="major-striking">Major Striking — {formatGp(STRIKING_RUNE_PRICES['major-striking'])}</option>
                </select>
              </div>

              <div>
                {(character.equipmentHandwrapRunes.propertyRunes ?? []).map((runeId) => {
                  const rune = WEAPON_PROPERTY_RUNES[runeId];
                  return (
                    <div key={`hw-${runeId}`} style={{ ...itemRowStyle, marginBottom: '6px' }}>
                      <span>🔷 {rune?.name ?? runeId} — {formatGp(rune?.price ?? 0)}</span>
                      <button
                        style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => setCharacter({
                          ...character,
                          equipmentHandwrapRunes: {
                            ...character.equipmentHandwrapRunes,
                            propertyRunes: (character.equipmentHandwrapRunes.propertyRunes ?? []).filter(id => id !== runeId),
                          },
                        })}
                      >✕</button>
                    </div>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const existing = character.equipmentHandwrapRunes.propertyRunes ?? [];
                    if (existing.includes(e.target.value)) return;
                    setCharacter({
                      ...character,
                      equipmentHandwrapRunes: {
                        ...character.equipmentHandwrapRunes,
                        propertyRunes: [...existing, e.target.value],
                      },
                    });
                  }}
                  style={selectStyle}
                >
                  <option value="">+ Add weapon property rune...</option>
                  {Object.values(WEAPON_PROPERTY_RUNES)
                    .filter(r => !(character.equipmentHandwrapRunes.propertyRunes ?? []).includes(r.id))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Lv {r.level}) — {formatGp(r.price)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Armor ── */}
        <div className="form-group">
          <label>🛡️ Armor</label>
          {character.equipmentArmor && (
            <div style={itemRowStyle}>
              <span>
                {ARMOR_CATALOG[character.equipmentArmor]?.icon}{' '}
                {ARMOR_CATALOG[character.equipmentArmor]?.name}{' '}
                (AC +{ARMOR_CATALOG[character.equipmentArmor]?.acBonus}, DEX cap {ARMOR_CATALOG[character.equipmentArmor]?.dexCap ?? '∞'})
                {' — '}{formatGp(ARMOR_CATALOG[character.equipmentArmor]?.price ?? 0)}
                {ARMOR_CATALOG[character.equipmentArmor]?.traits?.length > 0 && (
                  <span style={{ marginLeft: '6px' }}>
                    {ARMOR_CATALOG[character.equipmentArmor].traits.map(t => (
                      <span key={t} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(100,149,237,0.25)', border: '1px solid rgba(100,149,237,0.4)', color: '#87ceeb', marginLeft: '3px' }}>{t}</span>
                    ))}
                  </span>
                )}
              </span>
              <button
                style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setCharacter({ ...character, equipmentArmor: '', equipmentArmorRunes: {} })}
              >✕</button>
            </div>
          )}
          <select
            value={character.equipmentArmor}
            onChange={e => setCharacter({
              ...character,
              equipmentArmor: e.target.value,
              equipmentArmorRunes: e.target.value ? character.equipmentArmorRunes : {},
            })}
            style={selectStyle}
          >
            <option value="">None (unarmored)</option>
            {Object.values(ARMOR_CATALOG)
              .filter(a => a.id !== 'unarmored') // Skip the "no armor" placeholder
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.category}) — AC +{a.acBonus}, DEX cap {a.dexCap ?? '∞'}{a.traits.length > 0 ? ` [${a.traits.join(', ')}]` : ''} — {formatGp(a.price)}
                </option>
              ))}
          </select>

          {character.equipmentArmor && (
            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={character.equipmentArmorRunes.potencyRune ?? ''}
                onChange={(e) => setCharacter({
                  ...character,
                  equipmentArmorRunes: {
                    ...character.equipmentArmorRunes,
                    potencyRune: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined,
                  },
                })}
                style={selectStyle}
              >
                <option value="">Armor Potency (none)</option>
                <option value="1">+1 Potency — {formatGp(ARMOR_POTENCY_RUNE_PRICES[1])}</option>
                <option value="2">+2 Potency — {formatGp(ARMOR_POTENCY_RUNE_PRICES[2])}</option>
                <option value="3">+3 Potency — {formatGp(ARMOR_POTENCY_RUNE_PRICES[3])}</option>
              </select>

              <select
                value={character.equipmentArmorRunes.resilientRune ?? ''}
                onChange={(e) => setCharacter({
                  ...character,
                  equipmentArmorRunes: {
                    ...character.equipmentArmorRunes,
                    resilientRune: e.target.value ? e.target.value as 'resilient' | 'greater-resilient' | 'major-resilient' : undefined,
                  },
                })}
                style={selectStyle}
              >
                <option value="">Resilient Rune (none)</option>
                <option value="resilient">Resilient — {formatGp(RESILIENT_RUNE_PRICES['resilient'])}</option>
                <option value="greater-resilient">Greater Resilient — {formatGp(RESILIENT_RUNE_PRICES['greater-resilient'])}</option>
                <option value="major-resilient">Major Resilient — {formatGp(RESILIENT_RUNE_PRICES['major-resilient'])}</option>
              </select>

              <div style={{ gridColumn: '1 / -1' }}>
                {(character.equipmentArmorRunes.propertyRunes ?? []).map((runeId) => {
                  const rune = ARMOR_PROPERTY_RUNES[runeId];
                  return (
                    <div key={`armor-${runeId}`} style={{ ...itemRowStyle, marginBottom: '6px' }}>
                      <span>🔶 {rune?.name ?? runeId} — {formatGp(rune?.price ?? 0)}</span>
                      <button
                        style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => setCharacter({
                          ...character,
                          equipmentArmorRunes: {
                            ...character.equipmentArmorRunes,
                            propertyRunes: (character.equipmentArmorRunes.propertyRunes ?? []).filter(id => id !== runeId),
                          },
                        })}
                      >✕</button>
                    </div>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const existing = character.equipmentArmorRunes.propertyRunes ?? [];
                    if (existing.includes(e.target.value)) return;
                    setCharacter({
                      ...character,
                      equipmentArmorRunes: {
                        ...character.equipmentArmorRunes,
                        propertyRunes: [...existing, e.target.value],
                      },
                    });
                  }}
                  style={selectStyle}
                >
                  <option value="">+ Add armor property rune...</option>
                  {Object.values(ARMOR_PROPERTY_RUNES)
                    .filter(r => !(character.equipmentArmorRunes.propertyRunes ?? []).includes(r.id))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Lv {r.level}) — {formatGp(r.price)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Shield ── */}
        <div className="form-group">
          <label>🛡️ Shield</label>
          {character.equipmentShield && (
            <div style={itemRowStyle}>
              <span>
                {SHIELD_CATALOG[character.equipmentShield]?.icon}{' '}
                {SHIELD_CATALOG[character.equipmentShield]?.name}{' '}
                (AC +{SHIELD_CATALOG[character.equipmentShield]?.armorBonus}, Hardness {SHIELD_CATALOG[character.equipmentShield]?.hardness})
                {' — '}{formatGp(SHIELD_CATALOG[character.equipmentShield]?.price ?? 0)}
                {SHIELD_CATALOG[character.equipmentShield]?.traits?.length > 0 && (
                  <span style={{ marginLeft: '6px' }}>
                    {SHIELD_CATALOG[character.equipmentShield].traits.map(t => (
                      <span key={t} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(100,149,237,0.25)', border: '1px solid rgba(100,149,237,0.4)', color: '#87ceeb', marginLeft: '3px' }}>{t}</span>
                    ))}
                  </span>
                )}
              </span>
              <button
                style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setCharacter({ ...character, equipmentShield: '' })}
              >✕</button>
            </div>
          )}
          <select
            value={character.equipmentShield}
            onChange={e => setCharacter({ ...character, equipmentShield: e.target.value })}
            style={selectStyle}
          >
            <option value="">None</option>
            {Object.values(SHIELD_CATALOG).map(s => (
              <option key={s.id} value={s.id}>
                {s.name} — AC +{s.armorBonus}, Hardness {s.hardness}, HP {s.maxHp}{s.traits.length > 0 ? ` [${s.traits.join(', ')}]` : ''} — {formatGp(s.price)}
              </option>
            ))}
          </select>
        </div>

        {/* ── Adventuring Gear ── */}
        <div className="form-group">
          <label>🎒 Adventuring Gear</label>
          {character.equipmentGear.map((g, idx) => {
            const item = ADVENTURING_GEAR[g.id];
            return (
              <div key={idx} style={itemRowStyle}>
                <span>{item?.name ?? g.id} × {g.qty} — {formatGp((item?.price ?? 0) * g.qty)}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentGear];
                      if (next[idx].qty > 1) {
                        next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
                      } else {
                        next.splice(idx, 1);
                      }
                      setCharacter({ ...character, equipmentGear: next });
                    }}
                  >−</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentGear];
                      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                      setCharacter({ ...character, equipmentGear: next });
                    }}
                  >+</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentGear];
                      next.splice(idx, 1);
                      setCharacter({ ...character, equipmentGear: next });
                    }}
                  >✕</button>
                </div>
              </div>
            );
          })}
          <EquipmentPicker
            label="+ Add adventuring gear..."
            items={Object.values(ADVENTURING_GEAR).map(g => ({
              id: g.id, name: g.name, price: g.price,
              category: g.category,
            }))}
            categoryLabel="Category"
            onPick={id => {
              const existing = character.equipmentGear.findIndex(g => g.id === id);
              if (existing >= 0) {
                const next = [...character.equipmentGear];
                next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
                setCharacter({ ...character, equipmentGear: next });
              } else {
                setCharacter({ ...character, equipmentGear: [...character.equipmentGear, { id, qty: 1 }] });
              }
            }}
            formatGp={formatGp}
            allowDuplicates
          />
        </div>

        {/* ── Worn & Held Magic Items ── */}
        <div className="form-group">
          <label>✨ Worn & Held Magic Items</label>
          {character.equipmentWornItems.map((wId, idx) => {
            const item = WORN_ITEMS[wId];
            return (
              <div key={idx} style={itemRowStyle}>
                <span>{item?.name ?? wId} — {formatGp(item?.price ?? 0)}</span>
                <button
                  style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                  onClick={() => {
                    const next = [...character.equipmentWornItems];
                    next.splice(idx, 1);
                    setCharacter({ ...character, equipmentWornItems: next });
                  }}
                >✕</button>
              </div>
            );
          })}
          <EquipmentPicker
            label="+ Add worn/held item..."
            items={Object.values(WORN_ITEMS).map(i => ({
              id: i.id, name: i.name, price: i.price,
              level: i.level,
              category: i.slot,
              traits: i.traits,
            }))}
            categoryLabel="Slot"
            showLevelFilter
            maxLevel={character.level}
            onPick={id => {
              if (!character.equipmentWornItems.includes(id)) {
                setCharacter({ ...character, equipmentWornItems: [...character.equipmentWornItems, id] });
              }
            }}
            formatGp={formatGp}
            selected={character.equipmentWornItems}
          />
        </div>

        {/* ── Consumables ── */}
        <div className="form-group">
          <label>🧪 Consumables</label>
          {character.equipmentConsumables.map((c, idx) => {
            const item = CONSUMABLE_CATALOG[c.id];
            return (
              <div key={idx} style={itemRowStyle}>
                <span>{item?.name ?? c.id} × {c.qty} — {formatGp((item?.price ?? 0) * c.qty)}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentConsumables];
                      if (next[idx].qty > 1) {
                        next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
                      } else {
                        next.splice(idx, 1);
                      }
                      setCharacter({ ...character, equipmentConsumables: next });
                    }}
                  >−</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentConsumables];
                      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                      setCharacter({ ...character, equipmentConsumables: next });
                    }}
                  >+</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentConsumables];
                      next.splice(idx, 1);
                      setCharacter({ ...character, equipmentConsumables: next });
                    }}
                  >✕</button>
                </div>
              </div>
            );
          })}
          <EquipmentPicker
            label="+ Add consumable..."
            items={Object.values(CONSUMABLE_CATALOG).map(c => ({
              id: c.id, name: c.name, price: c.price,
              level: c.level,
              category: c.type,
              traits: c.traits,
            }))}
            categoryLabel="Type"
            showLevelFilter
            maxLevel={character.level}
            onPick={id => {
              const existing = character.equipmentConsumables.findIndex(c => c.id === id);
              if (existing >= 0) {
                const next = [...character.equipmentConsumables];
                next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
                setCharacter({ ...character, equipmentConsumables: next });
              } else {
                setCharacter({ ...character, equipmentConsumables: [...character.equipmentConsumables, { id, qty: 1 }] });
              }
            }}
            formatGp={formatGp}
            allowDuplicates
          />
        </div>

        {/* ── Shopping Summary ── */}
        <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid #4a4a6a' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#d4af37' }}>📋 Cart Summary</h3>
          <div style={{ fontSize: '13px', color: '#ccc' }}>
            {character.equipmentWeapons.length === 0 && !character.equipmentArmor && !character.equipmentShield && character.equipmentConsumables.length === 0 && character.equipmentGear.length === 0 && character.equipmentWornItems.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No equipment selected. You can skip this step.</div>
            ) : (
              <>
                {character.equipmentWeapons.map((wId, i) => {
                  const w = WEAPON_CATALOG[wId];
                  const runeData = character.equipmentWeaponRunes[i] || {};
                  const runeLabels: string[] = [];
                  if (runeData.potencyRune) runeLabels.push(`+${runeData.potencyRune} potency`);
                  if (runeData.strikingRune) runeLabels.push(runeData.strikingRune);
                  if (runeData.propertyRunes && runeData.propertyRunes.length > 0) {
                    for (const runeId of runeData.propertyRunes) {
                      const rune = WEAPON_PROPERTY_RUNES[runeId];
                      runeLabels.push(rune?.name ?? runeId);
                    }
                  }
                  return <div key={`w${i}`}>• {w?.name}{runeLabels.length > 0 ? ` [${runeLabels.join(', ')}]` : ''} — {formatGp(w?.price ?? 0)}</div>;
                })}
                {character.equipmentArmor && (() => {
                  const a = ARMOR_CATALOG[character.equipmentArmor];
                  const armorRuneLabels: string[] = [];
                  if (character.equipmentArmorRunes.potencyRune) armorRuneLabels.push(`+${character.equipmentArmorRunes.potencyRune} potency`);
                  if (character.equipmentArmorRunes.resilientRune) armorRuneLabels.push(character.equipmentArmorRunes.resilientRune);
                  if (character.equipmentArmorRunes.propertyRunes && character.equipmentArmorRunes.propertyRunes.length > 0) {
                    for (const runeId of character.equipmentArmorRunes.propertyRunes) {
                      const rune = ARMOR_PROPERTY_RUNES[runeId];
                      armorRuneLabels.push(rune?.name ?? runeId);
                    }
                  }
                  return <div>• {a?.name}{armorRuneLabels.length > 0 ? ` [${armorRuneLabels.join(', ')}]` : ''} — {formatGp(a?.price ?? 0)}</div>;
                })()}
                {character.equipmentShield && (() => {
                  const s = SHIELD_CATALOG[character.equipmentShield];
                  return <div>• {s?.name} — {formatGp(s?.price ?? 0)}</div>;
                })()}
                {character.equipmentGear.map((g, i) => {
                  const item = ADVENTURING_GEAR[g.id];
                  return <div key={`g${i}`}>• {item?.name} × {g.qty} — {formatGp((item?.price ?? 0) * g.qty)}</div>;
                })}
                {character.equipmentWornItems.map((wId, i) => {
                  const item = WORN_ITEMS[wId];
                  return <div key={`m${i}`}>• {item?.name} — {formatGp(item?.price ?? 0)}</div>;
                })}
                {character.equipmentConsumables.map((c, i) => {
                  const item = CONSUMABLE_CATALOG[c.id];
                  return <div key={`c${i}`}>• {item?.name} × {c.qty} — {formatGp((item?.price ?? 0) * c.qty)}</div>;
                })}
              </>
            )}
          </div>
          <div style={{ marginTop: '8px', borderTop: '1px solid #4a4a6a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Total Spent:</span>
            <span style={{ color: overspent ? '#e74c3c' : '#4caf50' }}>{formatGp(spent)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Budget:</span>
            <span>{formatGp(character.goldBudget)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Remaining:</span>
            <span style={{ color: overspent ? '#e74c3c' : '#4caf50' }}>{formatGp(remaining)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAncestryStep = () => {
    const getHeritageDescription = (): string => {
      if (character.heritageType === 'versatile') {
        return VERSATILE_HERITAGE_DESCRIPTIONS[character.heritage] || 'A unique heritage with special powers and features.';
      }
      return '';
    };

    return (
      <div className="step-content">
        <h2>Choose Your Ancestry & Heritage</h2>

        {ancestryCoverageIssues.length > 0 && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.5)', color: '#ffb3aa', fontSize: '13px' }}>
            <strong>Ancestry data check found issues:</strong>
            <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
              {ancestryCoverageIssues.map(issue => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        )}
        
        <div className="form-group">
          <label>Ancestry</label>
          <select 
            value={character.ancestry}
            onChange={(e) => {
              const selectedAncestry = e.target.value;
              const standardHeritages = HERITAGES[selectedAncestry] || [];
              const defaultHeritage = standardHeritages.length > 0 ? standardHeritages[0] : '';
              setCharacter({ 
                ...character, 
                ancestry: selectedAncestry, 
                heritage: defaultHeritage,
                heritageType: 'standard',
                ancestryBoosts: [],  // Reset free ancestry boosts when ancestry changes
              });
            }}
            style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            {ANCESTRIES.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        {/* Ancestry Stat Block */}
        {character.ancestry && ANCESTRY_BOOSTS[character.ancestry] && (() => {
          const a = ANCESTRY_BOOSTS[character.ancestry];
          return (
            <div style={{ marginTop: '12px', marginBottom: '16px', padding: '12px 16px', backgroundColor: 'rgba(100, 80, 120, 0.15)', borderRadius: '6px', border: '1px solid #6b5a8a', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#ccc' }}>
              <div><strong style={{ color: '#d4af37' }}>HP</strong> {a.hp}</div>
              <div><strong style={{ color: '#d4af37' }}>Speed</strong> {a.speed} ft</div>
              <div><strong style={{ color: '#d4af37' }}>Size</strong> {a.size}</div>
              <div><strong style={{ color: '#d4af37' }}>Senses</strong> {getEffectiveSenses(a.senses, character.heritageType as 'standard' | 'versatile', character.heritage)}</div>
              <div><strong style={{ color: '#d4af37' }}>Traits</strong> {a.traits.join(', ')}</div>
            </div>
          );
        })()}

        <div className="form-group">
          <label>Heritage Type</label>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="radio"
                checked={character.heritageType === 'standard'}
                onChange={() => {
                  const standardHeritages = HERITAGES[character.ancestry] || [];
                  const defaultHeritage = standardHeritages.length > 0 ? standardHeritages[0] : '';
                  setCharacter({ 
                    ...character, 
                    heritageType: 'standard',
                    heritage: defaultHeritage
                  });
                }}
              />
              Ancestral Heritage
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="radio"
                checked={character.heritageType === 'versatile'}
                onChange={() => {
                  setCharacter({ 
                    ...character, 
                    heritageType: 'versatile',
                    heritage: VERSATILE_HERITAGES[0]
                  });
                }}
              />
              Versatile Heritage
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Heritage {character.heritageType === 'versatile' && '(Versatile)'}</label>
          <select 
            value={character.heritage}
            onChange={(e) => setCharacter({ ...character, heritage: e.target.value })}
            style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            {character.heritageType === 'standard' 
              ? (HERITAGES[character.ancestry] || []).map(h => <option key={h}>{h}</option>)
              : VERSATILE_HERITAGES.map(h => <option key={h}>{h}</option>)
            }
          </select>
        </div>

        {getHeritageDescription() && (
          <div className="flavor-text" style={{ marginTop: '10px', fontStyle: 'italic', borderLeft: '4px solid #9370db', paddingLeft: '10px' }}>
            <strong>{character.heritage}:</strong> {getHeritageDescription()}
          </div>
        )}

        <p className="flavor-text">
          Your ancestry defines your character's species and cultural background.
          Choose an <strong>ancestral heritage</strong> specific to your ancestry, or select a <strong>versatile heritage</strong> 
          that reflects a mixed or unusual lineage (such as being part celestial, draconic, or part-fey).
        </p>
      </div>
    );
  };

  const renderBackgroundStep = () => (
    <div className="step-content">
      <h2>Choose Your Background</h2>
      
      <div className="form-group">
        <label>Background</label>
        <select 
          value={character.background}
          onChange={(e) => {
            const newBg = e.target.value;
            const bgBoostOptions = BACKGROUND_BOOSTS[newBg];
            const firstBoost = Array.isArray(bgBoostOptions) ? bgBoostOptions[0] : bgBoostOptions;
            setCharacter({ ...character, background: newBg, backgroundBoost: firstBoost, backgroundFreeBoost: '' });
          }}
          style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          {BACKGROUNDS.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      <p className="flavor-text">
        Your background represents your life before becoming an adventurer.
        It grants you training in skills and provides narrative flavor.
      </p>
    </div>
  );

  const renderClassStep = () => <BuilderStepClass character={character} setCharacter={setCharacter} />;

  const renderAbilitiesStep = () => {
    const ancestryData = ANCESTRY_BOOSTS[character.ancestry] || { flavor: '' };
    const allAbilities = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
    
    // Use the shared computation (level 1 boosts only — level-up boosts are in step 7)
    const finalAbilities = computeAbilityScores(character, 1);

    return (
      <div className="step-content">
        <h2>Ability Scores</h2>
        <p>Choose your ability score boosts from ancestry, background, and class.</p>
        
        {/* ANCESTRY BOOSTS SECTION */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(100, 80, 120, 0.2)', borderRadius: '6px', border: '1px solid #8b7aa8' }}>
          <h3 style={{ marginTop: 0, color: '#d4af37', fontSize: '16px' }}>Ancestry: {character.ancestry}</h3>
          
          <div style={{ fontSize: '14px', marginBottom: '8px', color: '#aaa' }}>Ability Boosts:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Fixed boosts display inline — styled to match dropdown look */}
            {ancestryData.fixedBoosts && Object.entries(ancestryData.fixedBoosts).map(([ability, amount]) => {
              const label = ability.charAt(0).toUpperCase() + ability.slice(1);
              return (
                <div key={ability} style={{ 
                  padding: '8px 10px', 
                  fontSize: '14px', 
                  backgroundColor: 'rgba(20, 20, 35, 0.9)', 
                  color: '#e0e0e0', 
                  border: '1px solid #4a4a6a', 
                  borderRadius: '4px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  cursor: 'default',
                  height: 'auto',
                  lineHeight: 'normal',
                }}>
                  {label} <span style={{ color: '#d4af37', fontWeight: 'bold' }}>(fixed)</span>
                </div>
              );
            })}
            
            {/* Free boosts inline */}
            {ancestryData.freeBoosts && Array.from({ length: ancestryData.freeBoosts }).map((_, idx) => {
              const fixedAbilities = ancestryData.fixedBoosts ? Object.keys(ancestryData.fixedBoosts) : [];
              const selectedBoosts = character.ancestryBoosts.filter((_, i) => i !== idx);
              
              return (
                <select
                  key={`ancestry-free-${idx}`}
                  value={character.ancestryBoosts[idx] || ''}
                  onChange={(e) => {
                    const newBoosts = [...character.ancestryBoosts];
                    newBoosts[idx] = e.target.value;
                    setCharacter({ ...character, ancestryBoosts: newBoosts });
                  }}
                  style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  <option value="" disabled>Choose...</option>
                  {allAbilities.map(ability => {
                    const abilityKey = ability.toLowerCase();
                    const isFixed = fixedAbilities.includes(abilityKey);
                    const isAlreadySelected = selectedBoosts.includes(abilityKey);
                    const isDisabled = isFixed || isAlreadySelected;
                    
                    return (
                      <option key={ability} value={abilityKey} disabled={isDisabled}>
                        {ability}{isFixed ? ' (fixed)' : ''}{isAlreadySelected ? ' (selected)' : ''}
                      </option>
                    );
                  })}
                </select>
              );
            })}
          </div>
        </div>
        
        {/* BACKGROUND BOOST SECTION */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(80, 120, 80, 0.2)', borderRadius: '6px', border: '1px solid #6b9b6b' }}>
          <h3 style={{ marginTop: 0, color: '#d4af37', fontSize: '16px' }}>Background: {character.background}</h3>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', color: '#aaa' }}>Specific Boost:</div>
              <select 
                value={character.backgroundBoost}
                onChange={(e) => setCharacter({ ...character, backgroundBoost: e.target.value })}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                {(() => {
                  const bgBoost = BACKGROUND_BOOSTS[character.background];
                  const options = Array.isArray(bgBoost) ? bgBoost : [bgBoost];
                  return options.map(ability => (
                    <option key={ability} value={ability}>{ability}</option>
                  ));
                })()}
              </select>
            </div>
            
            <div style={{ flex: '1', minWidth: '180px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', color: '#aaa' }}>Free Boost:</div>
              <select 
                value={character.backgroundFreeBoost}
                onChange={(e) => setCharacter({ ...character, backgroundFreeBoost: e.target.value })}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                <option value="" disabled>Choose...</option>
                {allAbilities.map(ability => {
                  const isAlreadySelected = character.backgroundBoost === ability;
                  return (
                    <option key={ability} value={ability} disabled={isAlreadySelected}>
                      {ability}{isAlreadySelected ? ' (selected)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
        
        {/* CLASS BOOST SECTION */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(80, 100, 140, 0.2)', borderRadius: '6px', border: '1px solid #6a84aa' }}>
          <h3 style={{ marginTop: 0, color: '#d4af37', fontSize: '16px' }}>Class: {character.class}</h3>
          <div style={{ fontSize: '14px', marginBottom: '8px', color: '#aaa' }}>Class Boost:</div>
          <select 
            value={character.classBoost}
            onChange={(e) => setCharacter({ ...character, classBoost: e.target.value })}
            style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            {(() => {
              const options = getClassBoostOptions(character.class, character.rogueRacket);
              return options.map(ability => (
                <option key={ability} value={ability}>{ability}</option>
              ));
            })()}
          </select>
        </div>
        
        {/* FREE BOOSTS SECTION */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(120, 100, 60, 0.2)', borderRadius: '6px', border: '1px solid #9a8a5a' }}>
          <h3 style={{ marginTop: 0, color: '#d4af37', fontSize: '16px' }}>Free Ability Boosts</h3>
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '12px' }}>Every character gets 4 additional free boosts to any abilities:</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const selectedBoosts = character.freeBoosts.filter((_, i) => i !== idx);
              
              return (
                <select
                  key={`free-boost-${idx}`}
                  value={character.freeBoosts[idx] || 'strength'}
                  onChange={(e) => {
                    const newBoosts = [...character.freeBoosts];
                    newBoosts[idx] = e.target.value;
                    setCharacter({ ...character, freeBoosts: newBoosts });
                  }}
                  style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '140px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                  {allAbilities.map(ability => {
                    const abilityKey = ability.toLowerCase();
                    const isAlreadySelected = selectedBoosts.includes(abilityKey);
                    
                    return (
                      <option key={ability} value={abilityKey} disabled={isAlreadySelected}>
                        {ability}{isAlreadySelected ? ' (selected)' : ''}
                      </option>
                    );
                  })}
                </select>
              );
            })}
          </div>
        </div>
        
        {/* FINAL ABILITY SCORES */}
        <div style={{ padding: '15px', backgroundColor: 'rgba(40, 40, 60, 0.4)', borderRadius: '6px', border: '2px solid #d4af37' }}>
          <h3 style={{ marginTop: 0, color: '#d4af37', fontSize: '16px' }}>Final Ability Scores</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(ABILITY_LABELS).map(([abilityKey, label]) => {
              const score = finalAbilities[abilityKey] || 10;
              const modifier = Math.floor((score - 10) / 2);
              const shortName = label.split(' ')[0].slice(0, 3).toUpperCase();
              return (
                <div key={abilityKey} style={{
                  padding: '10px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(20, 20, 40, 0.6)',
                  borderRadius: '4px',
                  border: '1px solid #666',
                  width: '80px',
                  minWidth: '80px',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '4px', fontWeight: '600' }}>{shortName}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d4af37' }}>{score}</div>
                  <div style={{ fontSize: '14px', color: '#999', fontWeight: 'bold', marginTop: '2px' }}>
                    {modifier >= 0 ? '+' : ''}{modifier}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderNameAndLevelStep = () => (
    <div className="step-content">
      <h2>Character Name & Level</h2>
      
      <div className="form-group">
        <label>Character Name</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={character.name}
            onChange={(e) => setCharacter({ ...character, name: e.target.value })}
            placeholder="e.g., Aria Swiftblade"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setCharacter({ ...character, name: generateRandomName(character.ancestry) })}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              backgroundColor: 'rgba(100, 80, 160, 0.3)',
              color: '#d4af37',
              border: '1px solid #8b7aa8',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title={`Generate a random ${character.ancestry} name`}
          >
            🎲 Random
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Level (1-20)</label>
        <input
          type="number"
          min="1"
          max="20"
          value={character.level}
          onChange={(e) => {
            const newLevel = parseInt(e.target.value) || 1;
            const update: Partial<BuilderState> = { level: newLevel };
            // Auto-sync gold budget when not using custom amount
            if (!character.customGold) {
              update.goldBudget = getDefaultGold(newLevel);
            }
            setCharacter({ ...character, ...update });
          }}
        />
      </div>

      {/* Bio / Description */}
      <div className="form-group bio-section">
        <h3>Character Details</h3>
        <p className="bio-help">Physical details and description for the GM's reference.</p>

        <div className="bio-row">
          <div className="bio-field">
            <label>Pronouns</label>
            <input
              type="text"
              value={character.pronouns}
              onChange={(e) => setCharacter({ ...character, pronouns: e.target.value })}
              placeholder="e.g., she/her, he/him, they/them"
            />
          </div>
          <div className="bio-field">
            <label>Age</label>
            <input
              type="text"
              value={character.age}
              onChange={(e) => setCharacter({ ...character, age: e.target.value })}
              placeholder="e.g., 28, Young adult"
            />
          </div>
        </div>

        <div className="bio-row">
          <div className="bio-field">
            <label>Height</label>
            <input
              type="text"
              value={character.height}
              onChange={(e) => setCharacter({ ...character, height: e.target.value })}
              placeholder={`e.g., 5'8", 172 cm`}
            />
          </div>
          <div className="bio-field">
            <label>Weight</label>
            <input
              type="text"
              value={character.weight}
              onChange={(e) => setCharacter({ ...character, weight: e.target.value })}
              placeholder="e.g., 160 lbs, 73 kg"
            />
          </div>
        </div>

        <div className="bio-description">
          <label>Description</label>
          <textarea
            value={character.description}
            onChange={(e) => setCharacter({ ...character, description: e.target.value })}
            placeholder="Physical appearance, personality traits, distinguishing features..."
            rows={3}
          />
        </div>
      </div>

      {/* Token & Portrait Image Upload */}
      <div className="form-group image-upload-section">
        <h3>Character Art</h3>
        <p className="image-upload-help">Upload images for your character's token (battle grid) and portrait (character sheet). Supported formats: PNG, JPG, WebP.</p>
        
        <div className="image-upload-row">
          {/* Token Image */}
          <div className="image-upload-card">
            <label>Battle Token</label>
            <div 
              className={`image-preview token-preview ${character.tokenImageUrl ? 'has-image' : ''}`}
              onClick={() => document.getElementById('token-upload')?.click()}
            >
              {character.tokenImageUrl ? (
                <img src={character.tokenImageUrl} alt="Token" />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">🛡️</span>
                  <span className="upload-text">Click to upload</span>
                </div>
              )}
            </div>
            <input
              id="token-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { alert('Token image must be under 2MB'); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setCharacter({ ...character, tokenImageUrl: ev.target?.result as string });
                };
                reader.readAsDataURL(file);
              }}
            />
            {character.tokenImageUrl && (
              <button 
                className="remove-image-btn" 
                onClick={() => setCharacter({ ...character, tokenImageUrl: '' })}
              >
                Remove
              </button>
            )}
          </div>

          {/* Portrait Image */}
          <div className="image-upload-card">
            <label>Portrait</label>
            <div 
              className={`image-preview portrait-preview ${character.portraitImageUrl ? 'has-image' : ''}`}
              onClick={() => document.getElementById('portrait-upload')?.click()}
            >
              {character.portraitImageUrl ? (
                <img src={character.portraitImageUrl} alt="Portrait" />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">🖼️</span>
                  <span className="upload-text">Click to upload</span>
                </div>
              )}
            </div>
            <input
              id="portrait-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 4 * 1024 * 1024) { alert('Portrait image must be under 4MB'); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setCharacter({ ...character, portraitImageUrl: ev.target?.result as string });
                };
                reader.readAsDataURL(file);
              }}
            />
            {character.portraitImageUrl && (
              <button 
                className="remove-image-btn" 
                onClick={() => setCharacter({ ...character, portraitImageUrl: '' })}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={character.notes}
          onChange={(e) => setCharacter({ ...character, notes: e.target.value })}
          placeholder="Any special notes about your character..."
          rows={4}
        />
      </div>
    </div>
  );

  const renderOptionalRulesStep = () => (
    <div className="step-content">
      <h2>Optional Rules</h2>
      <p>Select any optional rules for this character.</p>
      
      <div className="rules-options">
        <label className="checkbox-group">
          <input
            type="checkbox"
            checked={character.optionalRules.gradualAbilityBoosts}
            onChange={(e) => setCharacter({
              ...character,
              optionalRules: {
                ...character.optionalRules,
                gradualAbilityBoosts: e.target.checked
              }
            })}
          />
          <span className="label-text">
            <strong>Gradual Ability Boosts</strong>
            <p>Instead of 4 ability boosts at levels 5, 10, 15, and 20, receive 1 boost at each of the 4 preceding levels (e.g. one each at 2nd, 3rd, 4th, 5th instead of all four at 5th).</p>
          </span>
        </label>

        <label className="checkbox-group">
          <input
            type="checkbox"
            checked={character.optionalRules.ancestryParagon}
            onChange={(e) => setCharacter({
              ...character,
              optionalRules: {
                ...character.optionalRules,
                ancestryParagon: e.target.checked
              }
            })}
          />
          <span className="label-text">
            <strong>Ancestry Paragon</strong>
            <p>Gain one additional ancestry feat at every level that normally grants one (1st, 5th, 9th, 13th, 17th), doubling your ancestry feat slots.</p>
          </span>
        </label>

        <label className="checkbox-group">
          <input
            type="checkbox"
            checked={character.optionalRules.freeArchetype}
            onChange={(e) => setCharacter({
              ...character,
              optionalRules: {
                ...character.optionalRules,
                freeArchetype: e.target.checked
              }
            })}
          />
          <span className="label-text">
            <strong>Free Archetype</strong>
            <p>Gain a free archetype feat at 2nd level and every even level thereafter. These must be archetype feats (dedication or from an existing dedication).</p>
          </span>
        </label>
      </div>
    </div>
  );


  const renderReviewStep = () => {
    // Compute final scores for display
    const finalScores = computeAbilityScores(character);

    // Gather all selected feats for display
    const prog = getClassProgression(character.class);
    const allSelectedFeats: { label: string; level: number; featName: string; color: string }[] = [];

    if (prog) {
      prog.classFeatLevels.filter(l => l <= character.level).forEach(l => {
        const id = character.classFeats[l];
        if (id) {
          const feat = getFeatById(id);
          allSelectedFeats.push({ label: 'Class', level: l, featName: feat?.name || id, color: '#87ceeb' });
        }
      });
      // Ancestry feats — uses getAncestryFeatSlots helper (handles Ancestry Paragon)
      const reviewAncestrySlots = getAncestryFeatSlots(character);
      reviewAncestrySlots.forEach(l => {
        const id = character.ancestryFeats[l];
        if (id) {
          const feat = getFeatById(id);
          allSelectedFeats.push({ label: 'Ancestry', level: Math.floor(l), featName: feat?.name || id, color: '#f4a460' });
        }
      });
      prog.skillFeatLevels.filter(l => l <= character.level).forEach(l => {
        const id = character.skillFeats[l];
        if (id) {
          const feat = getFeatById(id);
          allSelectedFeats.push({ label: 'Skill', level: l, featName: feat?.name || id, color: '#90ee90' });
        }
      });
      prog.generalFeatLevels.filter(l => l <= character.level).forEach(l => {
        const id = character.generalFeats[l];
        if (id) {
          const feat = getFeatById(id);
          allSelectedFeats.push({ label: 'General', level: l, featName: feat?.name || id, color: '#dda0dd' });
        }
      });
    }
    allSelectedFeats.sort((a, b) => a.level - b.level);

    const classFeatures = getClassFeatures(character.class, character.level);

    return (
    <div className="step-content">
      <h2>Review Your Character</h2>
      
      <div className="review-grid">
        <div className="review-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {(character.portraitImageUrl || character.tokenImageUrl) && (
              <img 
                src={character.portraitImageUrl || character.tokenImageUrl}
                alt={character.name}
                style={{
                  width: '64px',
                  height: character.portraitImageUrl ? '85px' : '64px',
                  borderRadius: character.portraitImageUrl ? '8px' : '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(212, 175, 55, 0.5)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                }}
              />
            )}
            <div>
              <h3>{character.name}</h3>
              <p className="review-info">Level {character.level} {character.ancestry} {character.heritage}</p>
              <p className="review-info">{character.background} {character.class}</p>
              {(character.pronouns || character.age) && (
                <p className="review-info" style={{ color: '#aaa', fontSize: '12px' }}>
                  {[character.pronouns, character.age ? `Age: ${character.age}` : ''].filter(Boolean).join(' · ')}
                </p>
              )}
              {(character.height || character.weight) && (
                <p className="review-info" style={{ color: '#aaa', fontSize: '12px' }}>
                  {[character.height ? `Height: ${character.height}` : '', character.weight ? `Weight: ${character.weight}` : ''].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {character.class === 'Rogue' && character.rogueRacket && (() => {
            const racket = ROGUE_RACKETS.find(r => r.id === character.rogueRacket);
            return racket ? (
              <>
                <p className="review-info" style={{ color: '#d4af37' }}>
                  Racket: {racket.name} (Key: {racket.keyAbility})
                </p>
                {character.rogueRacket === 'avenger' && character.rogueDeity && (
                  <p className="review-info" style={{ color: '#c4a6e8' }}>
                    Deity: {character.rogueDeity}
                  </p>
                )}
              </>
            ) : null;
          })()}
        </div>

        {/* Description */}
        {character.description && (
          <div className="review-section">
            <h4>Description</h4>
            <p style={{ color: '#ccc', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{character.description}</p>
          </div>
        )}

        <div className="review-section">
          <h4>Ability Scores</h4>
          <div className="review-abilities">
            {Object.entries(ABILITY_LABELS).map(([key, label]) => {
              const score = finalScores[key] || 10;
              const mod = Math.floor((score - 10) / 2);
              return (
                <div key={key} className="ability-line">
                  <span>{label.split(' ')[0]}: {score}</span>
                  <span className="mod">{mod > 0 ? '+' : ''}{mod}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Class Features */}
        {classFeatures.length > 0 && (
          <div className="review-section">
            <h4>Class Features</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {classFeatures.map(f => (
                <li key={f.id} style={{ padding: '2px 0', color: '#ffd700', fontSize: '13px' }}>
                  ⚔️ {f.name} (Lv{f.level})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Selected Feats */}
        {allSelectedFeats.length > 0 && (
          <div className="review-section">
            <h4>Selected Feats</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {allSelectedFeats.map((f, i) => (
                <li key={i} style={{ padding: '2px 0', fontSize: '13px' }}>
                  <span style={{ color: f.color, fontWeight: 'bold' }}>[{f.label}]</span>{' '}
                  <span style={{ color: '#e0e0e0' }}>{f.featName}</span>{' '}
                  <span style={{ color: '#888', fontSize: '11px' }}>(Lv{f.level} slot)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills — Full Proficiency Overview */}
        {(() => {
          const profs = computeSkillProficiencies(character);
          const trainedOrHigher = Object.entries(profs)
            .filter(([, rank]) => rank !== 'untrained')
            .sort((a, b) => {
              const rankOrder = PROFICIENCY_RANKS.indexOf(b[1]) - PROFICIENCY_RANKS.indexOf(a[1]);
              return rankOrder !== 0 ? rankOrder : a[0].localeCompare(b[0]);
            });
          if (trainedOrHigher.length === 0) return null;
          const rankColors: Record<string, string> = {
            trained: '#90ee90', expert: '#87ceeb', master: '#c4a6e8', legendary: '#ffd700'
          };
          const rankSymbols: Record<string, string> = {
            trained: 'T', expert: 'E', master: 'M', legendary: 'L'
          };
          return (
            <div className="review-section">
              <h4>Skills</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {trainedOrHigher.map(([skill, rank]) => (
                  <span key={skill} style={{
                    padding: '3px 8px', fontSize: '12px', borderRadius: '4px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: rankColors[rank],
                    border: `1px solid ${rankColors[rank]}40`,
                  }}>
                    <strong>[{rankSymbols[rank]}]</strong> {skill}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Level-Up Ability Boosts */}
        {(() => {
          const boostLevels = getBoostLevels(character).filter(l => l <= character.level);
          if (boostLevels.length === 0) return null;
          return (
            <div className="review-section">
              <h4>Level-Up Ability Boosts</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {boostLevels.map(bl => {
                  const picks = (character.levelBoosts[bl] || []).filter(Boolean);
                  return picks.length > 0 ? (
                    <li key={bl} style={{ padding: '2px 0', fontSize: '13px', color: '#d4af37' }}>
                      Lv {bl}: {picks.join(', ')}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          );
        })()}

        {/* Equipment Summary */}
        {(() => {
          const hasEquipment = character.equipmentWeapons.length > 0 || character.equipmentArmor || character.equipmentShield || character.equipmentHandwraps || character.equipmentGear.length > 0 || character.equipmentWornItems.length > 0 || character.equipmentConsumables.length > 0;
          if (!hasEquipment) return null;
          const spent = getEquipmentSpent();
          const remaining = character.goldBudget - spent;
          return (
            <div className="review-section">
              <h4>🛒 Equipment</h4>
              <div style={{ fontSize: '12px', color: remaining < 0 ? '#e74c3c' : '#4caf50', marginBottom: '6px' }}>
                💰 {formatGp(spent)} spent / {formatGp(character.goldBudget)} budget ({formatGp(Math.abs(remaining))} {remaining >= 0 ? 'remaining' : 'over'})
              </div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px' }}>
                {character.equipmentWeapons.map((wId, i) => {
                  const w = WEAPON_CATALOG[wId];
                  const runes = character.equipmentWeaponRunes[i];
                  const parts: string[] = [];
                  if (runes?.potencyRune) parts.push(`+${runes.potencyRune}`);
                  if (runes?.strikingRune) parts.push(runes.strikingRune === 'striking' ? 'Striking' : runes.strikingRune === 'greater-striking' ? 'Greater Striking' : 'Major Striking');
                  return <li key={`w${i}`} style={{ padding: '2px 0', color: '#e0e0e0' }}>⚔️ {parts.join(' ')} {w?.name ?? wId}</li>;
                })}
                {character.equipmentArmor && (() => {
                  const a = ARMOR_CATALOG[character.equipmentArmor];
                  const ar = character.equipmentArmorRunes;
                  const parts: string[] = [];
                  if (ar?.potencyRune) parts.push(`+${ar.potencyRune}`);
                  if (ar?.resilientRune) parts.push(ar.resilientRune === 'resilient' ? 'Resilient' : ar.resilientRune === 'greater-resilient' ? 'Greater Resilient' : 'Major Resilient');
                  return <li style={{ padding: '2px 0', color: '#e0e0e0' }}>🛡️ {parts.join(' ')} {a?.name ?? character.equipmentArmor}</li>;
                })()}
                {character.equipmentShield && <li style={{ padding: '2px 0', color: '#e0e0e0' }}>🛡️ {SHIELD_CATALOG[character.equipmentShield]?.name ?? character.equipmentShield}</li>}
                {character.equipmentHandwraps && (() => {
                  const hw = character.equipmentHandwrapRunes;
                  const parts: string[] = [];
                  if (hw?.potencyRune) parts.push(`+${hw.potencyRune}`);
                  if (hw?.strikingRune) parts.push(hw.strikingRune === 'striking' ? 'Striking' : hw.strikingRune === 'greater-striking' ? 'Greater Striking' : 'Major Striking');
                  return <li style={{ padding: '2px 0', color: '#e0e0e0' }}>🥊 {parts.join(' ')} Handwraps of Mighty Blows</li>;
                })()}
                {character.equipmentGear.map((g, i) => {
                  const item = ADVENTURING_GEAR[g.id];
                  return <li key={`g${i}`} style={{ padding: '2px 0', color: '#ccc' }}>🎒 {item?.name ?? g.id} ×{g.qty}</li>;
                })}
                {character.equipmentWornItems.map((wId, i) => {
                  const item = WORN_ITEMS[wId];
                  return <li key={`wi${i}`} style={{ padding: '2px 0', color: '#c4a6e8' }}>✨ {item?.name ?? wId}</li>;
                })}
                {character.equipmentConsumables.map((c, i) => {
                  const item = CONSUMABLE_CATALOG[c.id];
                  return <li key={`c${i}`} style={{ padding: '2px 0', color: '#87ceeb' }}>🧪 {item?.name ?? c.id} ×{c.qty}</li>;
                })}
              </ul>
            </div>
          );
        })()}

        {character.notes && (
          <div className="review-section">
            <h4>Notes</h4>
            <p>{character.notes}</p>
          </div>
        )}

        {(character.optionalRules.gradualAbilityBoosts || 
          character.optionalRules.ancestryParagon || 
          character.optionalRules.freeArchetype) && (
          <div className="review-section">
            <h4>Optional Rules</h4>
            <ul>
              {character.optionalRules.gradualAbilityBoosts && <li>Gradual Ability Boosts</li>}
              {character.optionalRules.ancestryParagon && <li>Ancestry Paragon</li>}
              {character.optionalRules.freeArchetype && <li>Free Archetype</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Export button */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          className="btn-outline"
          onClick={() => {
            try {
              const sheet = buildCharacterSheet();
              if (sheet) {
                CharacterService.downloadCharacterJSON(sheet);
              } else {
                setValidationErrors(['Export failed — please ensure your character name and class are set.']);
              }
            } catch (error: any) {
              console.error('Export failed:', error);
              setValidationErrors([`Export error: ${error?.message || String(error)}`]);
            }
          }}
          style={{ fontSize: '13px' }}
        >
          📥 Export as JSON
        </button>
      </div>
    </div>
    );
  };


  // ─── MAIN RENDER ────────────────────────────────────

  const STEP_LABELS = ['', 'Ancestry', 'Background', 'Class', 'Abilities', 'Name', 'Options', 'Lv1 Feats', 'Progression', 'Spells', 'Equipment', 'Review'];

  /** Quick check whether a step has been filled in (for progress indicators) */
  const isStepComplete = (s: number): boolean => {
    switch (s) {
      case 1: return !!character.ancestry && !!character.heritage;
      case 2: return !!character.background;
      case 3: return !!character.class;
      case 4: return Object.values(character.abilities).some(v => (v as number) > 10);
      case 5: return !!character.name && character.level >= 1;
      case 6: return true; // optional
      case 7: return true; // always valid (feats optional at level 1)
      case 8: return true; // always valid
      case 9: return !CLASS_SPELLCASTING[character.class] || character.knownCantrips.length > 0 || character.knownSpells.length > 0;
      case 10: return true; // equipment is optional
      case 11: return !!character.name && !!character.class;
      default: return false;
    }
  };

  return (
    <div className="character-builder-modal">
      <div className="builder-header">
        <h1>⚔️ Character Builder</h1>
        <div className="progress-bar">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(s => (
            <div
              key={s}
              className={`progress-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}
              onClick={() => { if (s < step) setStep(s); }}
              style={{ cursor: s < step ? 'pointer' : 'default', position: 'relative' }}
              title={STEP_LABELS[s]}
            >
              {s < step && isStepComplete(s) && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', fontSize: '8px', color: '#4caf50' }}>✓</span>
              )}
            </div>
          ))}
        </div>
        <p className="step-label">
          Step {step}/11: {STEP_LABELS[step]}
          {character.name && step > 5 && (
            <span style={{ marginLeft: '12px', color: '#d4af37', fontSize: '12px' }}>
              {character.name} — Lv{character.level} {character.ancestry} {character.class}
            </span>
          )}
        </p>
      </div>

      <div className="builder-content">
        {validationErrors.length > 0 && (
          <div className="error-box">
            <h4>⚠️ Validation Errors:</h4>
            <ul>
              {validationErrors.map((error, idx) => <li key={idx}>{error}</li>)}
            </ul>
          </div>
        )}

        {renderStep()}
      </div>

      <div className="builder-footer">
        <button
          className="btn-secondary"
          onClick={handlePrevious}
          disabled={step === 1}
        >
          ← Back
        </button>

        {step < 11 ? (
          <button
            className="btn-primary"
            onClick={handleNext}
          >
            Next →
          </button>
        ) : (
          <button
            className="btn-success"
            onClick={handleCreate}
          >
            ✓ Create Character
          </button>
        )}

        <button
          className="btn-outline"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};