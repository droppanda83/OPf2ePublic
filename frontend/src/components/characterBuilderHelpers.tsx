/**
 * Character Builder Helper Functions
 * Pure computation helpers extracted from CharacterBuilder.
 * All state-dependent functions take character: BuilderState as first parameter.
 */

import React from 'react';
import { getFeatById, type FeatEntry, ANCESTRY_FEAT_CATALOG } from '../../../shared/feats';
import {
  BuilderState,
  BASE_ABILITIES,
  ANCESTRY_BOOSTS,
  SKILLS,
  SKILL_ABILITIES,
  BACKGROUND_SKILLS,
  CLASS_SKILLS,
  ROGUE_RACKETS,
  PROFICIENCY_RANKS,
  type ProfRank,
  getClassProgression,
} from './characterBuilderData';

// ─── ABILITY SCORE COMPUTATION ──────────────────────────
// Shared helper: computes final scores from all boost sources.
// If upToLevel is provided, only includes level-up boosts at or below that level.
// PF2e rule: a boost adds +2 if the score is below 18, +1 if 18+.
export const computeAbilityScores = (character: BuilderState, upToLevel?: number): Record<string, number> => {
  const scores: Record<string, number> = { ...BASE_ABILITIES };
  const ancestryData = ANCESTRY_BOOSTS[character.ancestry] || { flavor: '' };
  const applyBoost = (ability: string, boostValue?: number) => {
    if (!ability) return;
    const key = ability.toLowerCase();
    if (typeof boostValue === 'number' && boostValue < 0) {
      scores[key] = (scores[key] || 10) + boostValue;
      return;
    }
    const current = scores[key] || 10;
    const delta = current >= 18 ? 1 : 2;
    scores[key] = current + delta;
  };

  // 1. Fixed ancestry boosts
  if (ancestryData.fixedBoosts) {
    Object.entries(ancestryData.fixedBoosts).forEach(([ability, boost]) => {
      applyBoost(ability, boost as number);
    });
  }
  // 2. Free ancestry boosts (capped to the number the current ancestry actually grants)
  const maxFreeBoosts = ancestryData.freeBoosts || 0;
  character.ancestryBoosts.slice(0, maxFreeBoosts).forEach((ability) => {
    applyBoost(ability);
  });
  // 3. Background specific boost
  if (character.backgroundBoost) {
    applyBoost(character.backgroundBoost);
  }
  // 4. Background free boost
  if (character.backgroundFreeBoost) {
    applyBoost(character.backgroundFreeBoost);
  }
  // 5. Class boost
  if (character.classBoost) {
    applyBoost(character.classBoost);
  }
  // 6. Four free boosts (level 1)
  character.freeBoosts.forEach((ability) => {
    applyBoost(ability);
  });
  // 7. Level-up boosts (apply 18+ rule: +1 if score ≥ 18, else +2)
  const boostLevels = getBoostLevels(character);
  const applicableLevels = boostLevels.filter(l => l <= (upToLevel ?? character.level));
  for (const lvl of applicableLevels) {
    const picks = character.levelBoosts[lvl] || [];
    for (const ability of picks) {
      if (ability) {
        const k = ability.toLowerCase();
        scores[k] = (scores[k] || 10) + (scores[k] >= 18 ? 1 : 2);
      }
    }
  }
  return scores;
};

// Returns the boost levels depending on optional rules
export const getBoostLevels = (character: BuilderState): number[] => {
  if (character.optionalRules.gradualAbilityBoosts) {
    // Gradual: 1 boost at each of the 4 levels leading up to 5, 10, 15, 20
    return [2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20];
  }
  return [5, 10, 15, 20];
};

// Number of boosts per level event
export const getBoostsPerLevel = (character: BuilderState, boostLevel: number): number => {
  if (character.optionalRules.gradualAbilityBoosts) {
    return 1; // 1 boost per gradual level
  }
  return 4; // 4 boosts at each standard boost level
};

// Ancestry Paragon: 2 at level 1, then 1 at every odd level 3–19
// Without paragon: use base class progression (1, 5, 9, 13, 17)
export const getAncestryFeatSlots = (character: BuilderState, maxLevel?: number): number[] => {
  const lvl = maxLevel ?? character.level;
  const progression = getClassProgression(character.class);
  if (!progression) return [];
  if (character.optionalRules.ancestryParagon) {
    const slots: number[] = [1, 1.5]; // 2 at level 1 (1.5 = paragon extra)
    for (let l = 3; l <= 19; l += 2) {
      slots.push(l);
    }
    return slots.filter(l => Math.floor(l) <= lvl);
  }
  return progression.ancestryFeatLevels.filter(l => l <= lvl);
};

// Gradual Ability Boosts: groups of 4 levels that together replace one standard boost event.
// Within a group, all 4 picks must be different abilities.
export const getGradualBoostGroup = (boostLevel: number): number[] => {
  if (boostLevel <= 5) return [2, 3, 4, 5];
  if (boostLevel <= 10) return [7, 8, 9, 10];
  if (boostLevel <= 15) return [12, 13, 14, 15];
  return [17, 18, 19, 20];
};

// ─── SKILL PROFICIENCY COMPUTATION ───────────────────────
// Computes each skill's proficiency rank from all sources:
//   1. Background auto-trained skills + lore
//   2. Class auto-trained skills (e.g., Rogue → Stealth)
//   3. Class choice-trained (e.g., Fighter → Acrobatics or Athletics)
//   4. Class additional skill picks
//   5. Skill increases at levels from class progression
// Returns a map: skillName -> proficiency rank
export const computeSkillProficiencies = (character: BuilderState, upToLevel?: number): Record<string, ProfRank> => {
  const maxLvl = upToLevel ?? character.level;
  const profs: Record<string, ProfRank> = {};

  // Initialize all skills as untrained
  SKILLS.forEach(s => { if (s !== 'Lore') profs[s] = 'untrained'; });

  // Helper to bump a skill's proficiency by one rank
  const bumpSkill = (skill: string) => {
    const current = profs[skill] || 'untrained';
    const idx = PROFICIENCY_RANKS.indexOf(current);
    if (idx < PROFICIENCY_RANKS.length - 1) {
      profs[skill] = PROFICIENCY_RANKS[idx + 1];
    }
  };

  // 1. Background skills → Trained
  const bgData = BACKGROUND_SKILLS[character.background];
  if (bgData) {
    bgData.skills.slice(0, 1).forEach(s => { profs[s] = 'trained'; });
    // Background lore is always trained
    profs[bgData.lore] = 'trained';
  }

  // 2. Class auto-trained skills → Trained (or bump if already trained)
  const classData = CLASS_SKILLS[character.class];
  if (classData) {
    classData.autoTrained.forEach(s => {
      if (profs[s] === 'untrained') {
        profs[s] = 'trained';
      }
      // If background already trained it, it just stays trained (no double bump at lv1)
    });
  }

  // 3. Class choice-trained (e.g., Fighter picks Acrobatics or Athletics)
  if (classData?.choiceTrained && character.classAutoSkillChoice) {
    if (profs[character.classAutoSkillChoice] === 'untrained') {
      profs[character.classAutoSkillChoice] = 'trained';
    }
  }

  // 3b. Rogue racket trained skill
  if (character.class === 'Rogue' && character.rogueRacket) {
    const racket = ROGUE_RACKETS.find(r => r.id === character.rogueRacket);
    if (racket && profs[racket.trainedSkill] === 'untrained') {
      profs[racket.trainedSkill] = 'trained';
    }
  }

  // 4. Class additional skill picks → Trained
  character.classSkills.filter(Boolean).forEach(s => {
    if (profs[s] === 'untrained') profs[s] = 'trained';
  });

  // 4b. INT bonus skills from level-up boosts
  const boostLvls = character.optionalRules.gradualAbilityBoosts
    ? [2,3,4,5,7,8,9,10,12,13,14,15,17,18,19,20]
    : [5, 10, 15, 20];
  boostLvls.filter(l => l <= maxLvl).forEach(bl => {
    const bonusSkill = character.intBonusSkills[bl];
    if (bonusSkill && profs[bonusSkill] === 'untrained') {
      profs[bonusSkill] = 'trained';
    }
  });

  // 5. Skill increases at level-up (respects per-level gating)
  if (maxLvl > 1) {
    const progression = getClassProgression(character.class);
    if (progression) {
      const skillIncreaseLvls = progression.skillIncreaseLevels.filter(l => l <= maxLvl);
      skillIncreaseLvls.forEach(lvl => {
        const skill = character.skillIncreases[lvl];
        if (skill) bumpSkill(skill);
      });
    }
  }

  return profs;
};

// Returns the maximum proficiency rank achievable at a given level
export const getMaxProficiencyAtLevel = (level: number): ProfRank => {
  if (level >= 15) return 'legendary';
  if (level >= 7) return 'master';
  if (level >= 3) return 'expert';
  return 'trained';
};

// Returns the number of additional trained skills from INT (used for INT boost changes)
export const getIntSkillSlots = (character: BuilderState, intScore?: number): number => {
  const scores = computeAbilityScores(character);
  const intVal = intScore ?? (scores.intelligence || 10);
  const classData = CLASS_SKILLS[character.class];
  const basePicks = classData?.additionalPicks ?? 0;
  const intMod = Math.floor((intVal - 10) / 2);
  return Math.max(0, basePicks + intMod);
};

// Returns the level-up boost levels at which INT modifier increased,
// granting an additional trained skill at each.
export const getIntBonusSkillLevels = (character: BuilderState): number[] => {
  const boostLevels = getBoostLevels(character).filter(l => l <= character.level);
  const result: number[] = [];
  for (const bl of boostLevels) {
    const picks = character.levelBoosts[bl] || [];
    // Check if Intelligence was boosted at this level
    if (picks.some(p => p === 'Intelligence')) {
      // Compute INT score just before this boost
      const scoresBefore = computeAbilityScores(character, bl - 1);
      const intBefore = scoresBefore.intelligence || 10;
      const modBefore = Math.floor((intBefore - 10) / 2);
      // Compute INT score after this boost
      const scoresAfter = computeAbilityScores(character, bl);
      const intAfter = scoresAfter.intelligence || 10;
      const modAfter = Math.floor((intAfter - 10) / 2);
      if (modAfter > modBefore) {
        result.push(bl);
      }
    }
  }
  return result;
};

// ─── FEAT PREREQUISITE CHECKING ──────────────────────────
// Returns { met: true } if all prerequisites are satisfied, or
// { met: false, reasons: [...] } listing which ones are unmet.

export const checkFeatPrerequisites = (character: BuilderState, feat: FeatEntry, atLevel: number): { met: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // ── LINEAGE TRAIT EXCLUSIVITY ──
  // A character can only have one feat with the Lineage trait unless they have Crossblooded Evolution
  if (feat.traits?.includes('Lineage')) {
    const allSelectedFeatIds = new Set<string>([
      ...Object.values(character.skillFeats).filter(Boolean),
      ...Object.values(character.generalFeats).filter(Boolean),
      ...Object.values(character.classFeats).filter(Boolean),
      ...Object.values(character.ancestryFeats).filter(Boolean),
      ...Object.values(character.archetypeFeats).filter(Boolean),
    ]);
    const hasCrossbloodedEvolution = allSelectedFeatIds.has('crossblooded-evolution');
    if (!hasCrossbloodedEvolution) {
      // Check if any other selected feat already has the Lineage trait
      for (const selectedId of allSelectedFeatIds) {
        if (selectedId === feat.id) continue; // Don't block the same feat
        const selectedFeat = ANCESTRY_FEAT_CATALOG.find(f => f.id === selectedId);
        if (selectedFeat?.traits?.includes('Lineage')) {
          reasons.push('You can only select one Lineage feat (take Crossblooded Evolution for a second)');
          break;
        }
      }
    }
  }

  if (!feat.prerequisites || feat.prerequisites.length === 0) {
    return { met: reasons.length === 0, reasons };
  }

  const profs = computeSkillProficiencies(character, atLevel);
  const scores = computeAbilityScores(character, atLevel);

  // All feats currently selected (across all categories) — for "has feat X" prereqs
  const allSelectedFeatIds = new Set<string>([
    ...Object.values(character.skillFeats).filter(Boolean),
    ...Object.values(character.generalFeats).filter(Boolean),
    ...Object.values(character.classFeats).filter(Boolean),
    ...Object.values(character.ancestryFeats).filter(Boolean),
    ...Object.values(character.archetypeFeats).filter(Boolean),
  ]);

  // Skill names for "or" style prereqs
  const SKILL_NAMES = ['Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception',
    'Diplomacy', 'Intimidation', 'Lore', 'Medicine', 'Nature', 'Occultism',
    'Performance', 'Religion', 'Society', 'Stealth', 'Survival', 'Thievery'];

  const RANK_VALUES: Record<string, number> = {
    'untrained': 0, 'trained': 1, 'expert': 2, 'master': 3, 'legendary': 4,
  };

  for (const prereq of feat.prerequisites) {
    const lower = prereq.toLowerCase();

    // ─ Rogue's Racket prerequisite: "Rogue's Racket: Thief", etc. ─
    const racketMatch = prereq.match(/^Rogue's Racket:\s*(.+)$/i);
    if (racketMatch) {
      const requiredRacket = racketMatch[1].trim().toLowerCase();
      if (character.rogueRacket !== requiredRacket) {
        reasons.push(prereq);
      }
      continue;
    }

    // ─ Skill proficiency: "Trained in Athletics", "Expert in Stealth", etc. ─
    const skillMatch = prereq.match(/^(Trained|Expert|Master|Legendary) in (.+)$/i);
    if (skillMatch) {
      const requiredRank = skillMatch[1].toLowerCase();
      const skillPart = skillMatch[2];
      const requiredVal = RANK_VALUES[requiredRank] ?? 0;

      // Handle "X, Y, or Z" patterns like "Arcana, Nature, Occultism, or Religion"
      const orSkills = skillPart.split(/,\s*/).map(s => s.replace(/^or\s+/i, '').trim());
      // Handle "at least one skill" generics
      if (lower.includes('at least one skill')) {
        const hasAny = SKILL_NAMES.some(s => RANK_VALUES[profs[s] || 'untrained'] >= requiredVal);
        if (!hasAny) reasons.push(prereq);
        continue;
      }
      // Handle "a skill with the Recall Knowledge action"
      if (lower.includes('a skill with the recall knowledge')) {
        const rkSkills = ['Arcana', 'Crafting', 'Medicine', 'Nature', 'Occultism', 'Religion', 'Society'];
        const hasAny = rkSkills.some(s => RANK_VALUES[profs[s] || 'untrained'] >= requiredVal);
        if (!hasAny) reasons.push(prereq);
        continue;
      }
      // Check if ANY of the listed skills meet the required rank
      const matchedSkills = orSkills.filter(s => SKILL_NAMES.includes(s));
      if (matchedSkills.length > 0) {
        // Also handle "Athletics or Warfare Lore" — skip non-standard lore
        const meetsAny = matchedSkills.some(s => RANK_VALUES[profs[s] || 'untrained'] >= requiredVal);
        // Also check "Warfare Lore" or other Lore specialties against generic Lore
        const orParts = orSkills.filter(s => !SKILL_NAMES.includes(s));
        const hasLoreMatch = orParts.some(s => s.toLowerCase().includes('lore') && RANK_VALUES[profs['Lore'] || 'untrained'] >= requiredVal);
        if (!meetsAny && !hasLoreMatch) reasons.push(prereq);
      } else {
        // Unrecognized skill pattern — be permissive, don't block
      }
      continue;
    }

    // ─ Ability score: "STR 16+", "Constitution 14+", "Dexterity 14+", "Charisma 16+" ─
    const abilityMatch = prereq.match(/^(STR|DEX|CON|INT|WIS|CHA|Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(\d+)\+?$/i);
    if (abilityMatch) {
      const abilityMap: Record<string, string> = {
        'str': 'strength', 'dex': 'dexterity', 'con': 'constitution',
        'int': 'intelligence', 'wis': 'wisdom', 'cha': 'charisma',
        'strength': 'strength', 'dexterity': 'dexterity', 'constitution': 'constitution',
        'intelligence': 'intelligence', 'wisdom': 'wisdom', 'charisma': 'charisma',
      };
      const abilityKey = abilityMap[abilityMatch[1].toLowerCase()];
      const requiredScore = parseInt(abilityMatch[2], 10);
      const currentScore = scores[abilityKey] || 10;
      if (currentScore < requiredScore) reasons.push(prereq);
      continue;
    }

    // ─ Feat prerequisite: "Prescient Planner", "Swift Sneak", etc. ─
    // Convert name to id format (lowercase, spaces to hyphens)
    const featId = prereq.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (allSelectedFeatIds.has(featId)) continue;
    // Also check by looking up the feat catalog
    const foundFeat = getFeatById(featId);
    if (foundFeat) {
      // It's a valid feat reference that the character hasn't taken
      reasons.push(prereq);
      continue;
    }
    // Unknown prereq (e.g., "spellcasting class feature") — be permissive for now
  }

  return { met: reasons.length === 0, reasons };
};

// Filters a feat array to only include feats whose prerequisites are met
export const filterFeatsByPrerequisites = (character: BuilderState, feats: FeatEntry[], atLevel: number): FeatEntry[] => {
  return feats.filter(feat => checkFeatPrerequisites(character, feat, atLevel).met);
};

// ─── SHARED FEAT UI HELPERS ──────────────────────────────

export const implementationBadge = (feat: FeatEntry) => {
  const colors: Record<string, string> = {
    full: '#4caf50', partial: '#ff9800', stub: '#f44336', not_implemented: '#666'
  };
  const labels: Record<string, string> = {
    full: '✓ Implemented', partial: '~ Partial', stub: '○ Stub', not_implemented: '✗ Not Impl.'
  };
  return (
    <span style={{ fontSize: '11px', color: colors[feat.implemented], marginLeft: '8px' }}>
      [{labels[feat.implemented]}]
    </span>
  );
};

export const featTypeLabel = (feat: FeatEntry) => {
  const typeColors: Record<string, string> = {
    class: '#87ceeb', class_feature: '#ffd700', skill: '#90ee90', general: '#dda0dd', ancestry: '#f4a460'
  };
  const typeLabels: Record<string, string> = {
    class: 'Class', class_feature: 'Class Feature', skill: 'Skill', general: 'General', ancestry: 'Ancestry'
  };
  return (
    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.3)', color: typeColors[feat.category], border: `1px solid ${typeColors[feat.category]}40`, marginLeft: '6px' }}>
      {typeLabels[feat.category]} Lv{feat.level}
    </span>
  );
};

export const ddStyle: React.CSSProperties = {
  padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)',
  color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px',
  width: '100%', maxWidth: '480px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
};

/** Renders a single feat-slot dropdown with duplicate prevention and prerequisite filtering */
export const renderFeatSlot = (
  character: BuilderState,
  slotLevel: number,
  selectedId: string,
  availableFeats: FeatEntry[],
  alreadySelected: string[],
  onSelect: (id: string) => void,
  accentColor: string,
  /** Optional: callback when a feat sub-choice is made (for feats with subChoices) */
  onSubChoiceSelect?: (featId: string, choiceId: string) => void,
) => {
  const displayLevel = Math.floor(slotLevel);
  // Split feats into qualified and unqualified based on prerequisites
  const qualifiedFeats: FeatEntry[] = [];
  const unqualifiedFeats: { feat: FeatEntry; reasons: string[] }[] = [];
  for (const feat of availableFeats) {
    const check = checkFeatPrerequisites(character, feat, displayLevel);
    if (check.met) {
      qualifiedFeats.push(feat);
    } else {
      unqualifiedFeats.push({ feat, reasons: check.reasons });
    }
  }

  const selectedFeat = availableFeats.find(f => f.id === selectedId);
  const isParagonSlot = slotLevel !== Math.floor(slotLevel);
  return (
    <div key={slotLevel} style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ minWidth: '90px', fontSize: '13px', color: accentColor, fontWeight: 'bold' }}>
          Lv {displayLevel}{isParagonSlot ? '★' : ''} slot:
        </span>
        {availableFeats.length > 0 ? (
          <select value={selectedId} onChange={(e) => onSelect(e.target.value)} style={ddStyle}>
            <option value="">Select feat...</option>
            {qualifiedFeats.length > 0 && (
              <optgroup label="Available">
                {qualifiedFeats.map(feat => {
                  const isDupe = alreadySelected.includes(feat.id) && feat.id !== selectedId;
                  const actionLabel = feat.actionCost !== undefined && feat.actionCost !== 'passive'
                    ? `, ${typeof feat.actionCost === 'number' ? feat.actionCost + '◆' : feat.actionCost === 'reaction' ? '↺' : '◇'}`
                    : '';
                  return (
                    <option key={feat.id} value={feat.id} disabled={isDupe}>
                      {feat.name} (Lv{feat.level}{actionLabel}) — {feat.description.slice(0, 45)}...{isDupe ? ' [taken]' : ''}
                    </option>
                  );
                })}
              </optgroup>
            )}
            {unqualifiedFeats.length > 0 && (
              <optgroup label="Prerequisites not met">
                {unqualifiedFeats.map(({ feat, reasons }) => {
                  const actionLabel = feat.actionCost !== undefined && feat.actionCost !== 'passive'
                    ? `, ${typeof feat.actionCost === 'number' ? feat.actionCost + '◆' : feat.actionCost === 'reaction' ? '↺' : '◇'}`
                    : '';
                  return (
                    <option key={feat.id} value={feat.id} disabled>
                      {feat.name} (Lv{feat.level}{actionLabel}) — Requires: {reasons.join(', ')}
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>
        ) : (
          <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>No feats in catalog yet</span>
        )}
      </div>
      {selectedFeat && (
        <div style={{ marginLeft: '100px', marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px', fontSize: '12px', color: '#999', borderLeft: `2px solid ${accentColor}` }}>
          {selectedFeat.description}
          {implementationBadge(selectedFeat)}
          {selectedFeat.prerequisites && selectedFeat.prerequisites.length > 0 && (
            <div style={{ marginTop: '2px', fontSize: '11px', color: '#b0a060' }}>
              Prerequisites: {selectedFeat.prerequisites.join(', ')}
            </div>
          )}
          {selectedFeat.traits && (
            <span style={{ marginLeft: '6px' }}>
              {selectedFeat.traits.map(t => (
                <span key={t} style={{ fontSize: '10px', padding: '1px 4px', marginRight: '3px', borderRadius: '2px', backgroundColor: 'rgba(100,100,200,0.2)', color: '#aac' }}>{t}</span>
              ))}
            </span>
          )}
          {/* Sub-choice dropdown (or free-text input) for feats that require the player to pick an option */}
          {selectedFeat.subChoices && onSubChoiceSelect && (
            <div style={{ marginTop: '6px' }}>
              <label style={{ fontSize: '12px', color: '#d4af37', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                {selectedFeat.subChoices.label}:
              </label>
              {selectedFeat.subChoices.freeText ? (
                <input
                  type="text"
                  value={character.featSubChoices?.[selectedFeat.id] || ''}
                  onChange={(e) => onSubChoiceSelect(selectedFeat.id, e.target.value)}
                  placeholder="Type here..."
                  style={{ ...ddStyle, maxWidth: '360px', fontSize: '13px' }}
                />
              ) : (
                <select
                  value={character.featSubChoices?.[selectedFeat.id] || ''}
                  onChange={(e) => onSubChoiceSelect(selectedFeat.id, e.target.value)}
                  style={{ ...ddStyle, maxWidth: '360px', fontSize: '13px' }}
                >
                  <option value="">Select...</option>
                  {selectedFeat.subChoices.options.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}{opt.description ? ` — ${opt.description}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
