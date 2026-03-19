/**
 * LevelUpWizard.tsx — Level-Up Modal for PF2e Characters
 * 
 * Reuses character builder helper functions to present level-up choices:
 * - Ability Boosts (at levels 5, 10, 15, 20)
 * - Skill Increases
 * - Class Feats, Skill Feats, General Feats, Ancestry Feats
 * - Free Archetype Feats (if variant rule is active)
 * - Automatic class feature proficiency upgrades
 * 
 * Works directly with Creature objects from the combat state.
 */

import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import type { Creature } from '../../../shared/types';
import { XP_PER_LEVEL } from '../../../shared/types';
import {
  getSelectableClassFeats,
  getClassFeatures,
  getSelectableSkillFeats,
  getSelectableGeneralFeats,
  getSelectableAncestryFeats,
  getSelectableArchetypeFeats,
  getFeatById,
} from '../../../shared/feats';
import type { FeatEntry } from '../../../shared/featTypes';
import {
  getClassProgression,
  PROFICIENCY_RANKS,
  type ProfRank,
  applyClassFeatureProficiencies,
  BASE_PROFICIENCIES,
  CLASS_STARTING_PROFICIENCIES,
} from './characterBuilderData';
import {
  implementationBadge,
  featTypeLabel,
  getMaxProficiencyAtLevel,
} from './characterBuilderHelpers';
import './LevelUpWizard.css';

const API_BASE = '/api';

// ── Interfaces ──

interface LevelUpWizardProps {
  creature: Creature;
  newLevel: number;
  gameId?: string;  // Optional — when absent, applies level-up locally without backend
  onComplete: (updatedCreature: Creature) => void;
  onCancel: () => void;
}

interface LevelUpChoices {
  abilityBoosts: string[];  // 4 ability names (at boost levels)
  skillIncrease: string;    // Skill name to increase
  classFeat: string;        // Feat ID
  skillFeat: string;        // Feat ID
  generalFeat: string;      // Feat ID
  ancestryFeat: string;     // Feat ID
  archetypeFeat: string;    // Feat ID (free archetype)
}

// ── Constants ──

const ABILITY_BOOST_LEVELS = [5, 10, 15, 20];
const ALL_ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;

const ABILITY_SHORT: Record<string, string> = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON',
  intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
};

const RANK_COLORS: Record<string, string> = {
  untrained: '#888', trained: '#90ee90', expert: '#87ceeb',
  master: '#c4a6e8', legendary: '#ffd700',
};

// ── Component ──

export const LevelUpWizard: React.FC<LevelUpWizardProps> = ({
  creature,
  newLevel,
  gameId,
  onComplete,
  onCancel,
}) => {
  const [choices, setChoices] = useState<LevelUpChoices>({
    abilityBoosts: [],
    skillIncrease: '',
    classFeat: '',
    skillFeat: '',
    generalFeat: '',
    ancestryFeat: '',
    archetypeFeat: '',
  });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const className = creature.characterClass || 'Fighter';
  const ancestry = creature.ancestry || 'Human';
  const heritage = creature.heritage || '';

  // Get class progression table
  const progression = useMemo(() => getClassProgression(className), [className]);

  // Determine what choices are available at this level
  const isBoostLevel = ABILITY_BOOST_LEVELS.includes(newLevel);
  const hasSkillIncrease = progression?.skillIncreaseLevels.includes(newLevel) ?? false;
  const hasClassFeat = progression?.classFeatLevels.includes(newLevel) ?? false;
  const hasSkillFeat = progression?.skillFeatLevels.includes(newLevel) ?? false;
  const hasGeneralFeat = progression?.generalFeatLevels.includes(newLevel) ?? false;
  const hasAncestryFeat = (() => {
    // Ancestry feats at levels 1, 5, 9, 13, 17
    const ancestryFeatLevels = [1, 5, 9, 13, 17];
    return ancestryFeatLevels.includes(newLevel);
  })();
  const hasFreeArchetype = creature.dedications && creature.dedications.length > 0 && newLevel % 2 === 0;

  // Get class features that become automatic at this level
  const classFeatures = useMemo(() => {
    try {
      return getClassFeatures(className, newLevel).filter(f => f.level === newLevel);
    } catch { return []; }
  }, [className, newLevel]);

  // Current ability scores from creature
  const currentAbilities = creature.abilities;

  // Build skill proficiency map from creature data
  const skillProficiencies = useMemo((): Record<string, ProfRank> => {
    const profs: Record<string, ProfRank> = {};
    if (creature.skills) {
      for (const sk of creature.skills) {
        // Determine rank from proficiency bonus
        const profBonus = sk.profBonus || 0;
        const level = creature.level;
        const rawProfRank = profBonus > 0 ? profBonus - level : 0;
        if (rawProfRank >= 8) profs[sk.name] = 'legendary';
        else if (rawProfRank >= 6) profs[sk.name] = 'master';
        else if (rawProfRank >= 4) profs[sk.name] = 'expert';
        else if (rawProfRank >= 2) profs[sk.name] = 'trained';
        else profs[sk.name] = 'untrained';
      }
    }
    return profs;
  }, [creature.skills, creature.level]);

  // Existing feat IDs
  const existingFeatNames = useMemo(() => {
    return (creature.feats || []).map(f => f.name.toLowerCase());
  }, [creature.feats]);

  // ── Ability Boosts ──
  const renderAbilityBoosts = () => {
    if (!isBoostLevel) return null;

    return (
      <div className="lu-section lu-section-boosts">
        <h3>💪 Ability Boosts (Choose 4 Different)</h3>
        <p className="lu-hint">
          Each boost adds +2, or +1 if the score is already 18+. All 4 must be different abilities.
        </p>
        <div className="lu-boost-grid">
          {[0, 1, 2, 3].map(idx => {
            const otherPicks = choices.abilityBoosts.filter((_, i) => i !== idx);
            return (
              <select
                key={`boost-${idx}`}
                value={choices.abilityBoosts[idx] || ''}
                onChange={(e) => {
                  const newBoosts = [...choices.abilityBoosts];
                  while (newBoosts.length <= idx) newBoosts.push('');
                  newBoosts[idx] = e.target.value;
                  setChoices({ ...choices, abilityBoosts: newBoosts });
                }}
                className="lu-select"
              >
                <option value="">Select ability...</option>
                {ALL_ABILITIES.map(ability => {
                  const key = ability.toLowerCase();
                  const score = currentAbilities[key as keyof typeof currentAbilities] || 10;
                  const boostAmt = score >= 18 ? 1 : 2;
                  const isDupe = otherPicks.includes(ability);
                  return (
                    <option key={ability} value={ability} disabled={isDupe}>
                      {ability} ({score} → {score + boostAmt}){isDupe ? ' [taken]' : ''}
                    </option>
                  );
                })}
              </select>
            );
          })}
        </div>
        {/* Preview updated scores */}
        <div className="lu-scores-preview">
          <div className="lu-scores-label">Updated Scores:</div>
          <div className="lu-scores-row">
            {ALL_ABILITIES.map(ability => {
              const key = ability.toLowerCase();
              const base = currentAbilities[key as keyof typeof currentAbilities] || 10;
              const boosted = choices.abilityBoosts.includes(ability);
              const score = boosted ? base + (base >= 18 ? 1 : 2) : base;
              const mod = Math.floor((score - 10) / 2);
              return (
                <div key={key} className={`lu-score-box ${boosted ? 'lu-score-boosted' : ''}`}>
                  <div className="lu-score-label">{ABILITY_SHORT[key]}</div>
                  <div className="lu-score-value">{score}</div>
                  <div className="lu-score-mod">{mod >= 0 ? '+' : ''}{mod}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Skill Increase ──
  const renderSkillIncrease = () => {
    if (!hasSkillIncrease) return null;

    const maxRank = getMaxProficiencyAtLevel(newLevel);
    const maxRankIdx = PROFICIENCY_RANKS.indexOf(maxRank);

    // Build options: skills that can be increased
    const options: { name: string; currentRank: ProfRank; nextRank: ProfRank }[] = [];
    
    // Include trained+ skills that can go higher
    for (const [name, rank] of Object.entries(skillProficiencies)) {
      const rankIdx = PROFICIENCY_RANKS.indexOf(rank);
      if (rankIdx >= 1 && rankIdx < maxRankIdx) {
        options.push({ name, currentRank: rank, nextRank: PROFICIENCY_RANKS[rankIdx + 1] as ProfRank });
      }
    }
    
    // Include untrained skills (become trained)
    if (creature.skills) {
      for (const sk of creature.skills) {
        const rank = skillProficiencies[sk.name] || 'untrained';
        if (rank === 'untrained') {
          options.push({ name: sk.name, currentRank: 'untrained', nextRank: 'trained' });
        }
      }
    }

    options.sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="lu-section lu-section-skills">
        <h3>📈 Skill Increase</h3>
        <p className="lu-hint">
          Raise one skill's proficiency by one rank.
          Max at level {newLevel}: {maxRank}.
        </p>
        <div className="lu-skill-row">
          <select
            value={choices.skillIncrease}
            onChange={(e) => setChoices({ ...choices, skillIncrease: e.target.value })}
            className="lu-select lu-select-wide"
          >
            <option value="">Select skill to increase...</option>
            {options.map(opt => (
              <option key={opt.name} value={opt.name}>
                {opt.name}: {opt.currentRank} → {opt.nextRank}
              </option>
            ))}
          </select>
          {choices.skillIncrease && (() => {
            const opt = options.find(o => o.name === choices.skillIncrease);
            if (!opt) return null;
            return (
              <span className="lu-skill-change">
                <span style={{ color: RANK_COLORS[opt.currentRank] }}>{opt.currentRank}</span>
                {' → '}
                <span style={{ color: RANK_COLORS[opt.nextRank], fontWeight: 'bold' }}>{opt.nextRank}</span>
              </span>
            );
          })()}
        </div>
      </div>
    );
  };

  // ── Feat Selection Helper ──
  const renderFeatSection = (
    title: string,
    icon: string,
    featType: 'class' | 'skill' | 'general' | 'ancestry' | 'archetype',
    available: FeatEntry[],
    selectedId: string,
    onSelect: (id: string) => void,
    color: string,
  ) => {
    return (
      <div className="lu-section" style={{ borderColor: `${color}44` }}>
        <h3 style={{ color }}>{icon} {title}</h3>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="lu-select lu-select-wide"
          style={{ borderColor: `${color}66` }}
        >
          <option value="">Select {featType} feat...</option>
          {available.map(feat => {
            const alreadyHas = existingFeatNames.includes(feat.name.toLowerCase());
            return (
              <option key={feat.id} value={feat.id} disabled={alreadyHas}>
                {feat.name} (Lv {feat.level}){alreadyHas ? ' [already taken]' : ''}
              </option>
            );
          })}
        </select>
        {selectedId && (() => {
          const feat = getFeatById(selectedId);
          if (!feat) return null;
          return (
            <div className="lu-feat-detail">
              <div className="lu-feat-header">
                <strong>{feat.name}</strong>
                {featTypeLabel(feat)}
                {implementationBadge(feat)}
              </div>
              <p className="lu-feat-desc">{feat.description}</p>
              {feat.traits && feat.traits.length > 0 && (
                <div className="lu-feat-traits">
                  {feat.traits.map(t => (
                    <span key={t} className="lu-trait-tag">{t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  // ── Class Features (automatic) ──
  const renderClassFeatures = () => {
    if (classFeatures.length === 0) return null;
    return (
      <div className="lu-section lu-section-features">
        <h3>🏆 Class Features (Automatic at Level {newLevel})</h3>
        <div className="lu-features-list">
          {classFeatures.map(feat => (
            <div key={feat.id} className="lu-feature-item">
              <div className="lu-feature-header">
                <strong>{feat.name}</strong>
                {featTypeLabel(feat)}
                {implementationBadge(feat)}
              </div>
              <p className="lu-feat-desc">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Proficiency Upgrades ──
  const renderProficiencyUpgrades = () => {
    // Compare proficiencies at old level vs new level
    const baseProficiencies = {
      ...BASE_PROFICIENCIES,
      ...(CLASS_STARTING_PROFICIENCIES[className] || {}),
    };
    const oldProfs = applyClassFeatureProficiencies(className, newLevel - 1, baseProficiencies);
    const newProfs = applyClassFeatureProficiencies(className, newLevel, baseProficiencies);

    const upgrades: { stat: string; from: string; to: string }[] = [];
    for (const [key, val] of Object.entries(newProfs)) {
      const oldVal = (oldProfs as any)[key] || 'untrained';
      if (val !== oldVal) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        upgrades.push({ stat: label, from: oldVal, to: val });
      }
    }

    if (upgrades.length === 0) return null;

    return (
      <div className="lu-section lu-section-prof-upgrades">
        <h3>🛡️ Proficiency Upgrades (Automatic)</h3>
        <div className="lu-prof-list">
          {upgrades.map(u => (
            <div key={u.stat} className="lu-prof-item">
              <span className="lu-prof-name">{u.stat}</span>
              <span style={{ color: RANK_COLORS[u.from] }}>{u.from}</span>
              {' → '}
              <span style={{ color: RANK_COLORS[u.to], fontWeight: 'bold' }}>{u.to}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── HP Increase ──
  const renderHPIncrease = () => {
    const conMod = Math.floor(((currentAbilities.constitution || 10) - 10) / 2);
    // HP per level = class hit die + CON mod
    const classHitDie: Record<string, number> = {
      Fighter: 10, Champion: 10, Barbarian: 12, Ranger: 10, Monk: 10,
      Rogue: 8, Bard: 8, Cleric: 8, Druid: 8, Wizard: 6, Sorcerer: 6,
      Witch: 6, Oracle: 8, Investigator: 8, Swashbuckler: 10, Magus: 8,
      Summoner: 10, Gunslinger: 8, Inventor: 8, Psychic: 6, Thaumaturge: 8,
      Kineticist: 8, Alchemist: 8,
    };
    const hitDie = classHitDie[className] || 8;
    const hpGain = hitDie + conMod;
    const boostConGain = isBoostLevel && choices.abilityBoosts.includes('Constitution') ? 1 : 0;
    const totalHPGain = hpGain + boostConGain;

    return (
      <div className="lu-section lu-section-hp">
        <h3>❤️ Hit Points</h3>
        <div className="lu-hp-calc">
          <span>+{hitDie} (class hit die)</span>
          <span>+{conMod} (CON modifier)</span>
          {boostConGain > 0 && <span>+{boostConGain} (CON boost this level)</span>}
          <span className="lu-hp-total">= +{totalHPGain} HP</span>
          <span className="lu-hp-result">
            {creature.maxHealth} → {(creature.maxHealth || 0) + totalHPGain}
          </span>
        </div>
      </div>
    );
  };

  // ── Validation ──
  const getValidationIssues = (): string[] => {
    const issues: string[] = [];
    if (isBoostLevel) {
      const filled = choices.abilityBoosts.filter(Boolean);
      if (filled.length < 4) issues.push(`Select ${4 - filled.length} more ability boost${filled.length < 3 ? 's' : ''}`);
      if (new Set(filled).size < filled.length) issues.push('All ability boosts must be different');
    }
    if (hasSkillIncrease && !choices.skillIncrease) issues.push('Select a skill to increase');
    if (hasClassFeat && !choices.classFeat) issues.push('Select a class feat');
    if (hasSkillFeat && !choices.skillFeat) issues.push('Select a skill feat');
    if (hasGeneralFeat && !choices.generalFeat) issues.push('Select a general feat');
    if (hasAncestryFeat && !choices.ancestryFeat) issues.push('Select an ancestry feat');
    return issues;
  };

  const validationIssues = getValidationIssues();
  const isValid = validationIssues.length === 0;

  // ── Apply Level Up ──
  const applyLevelUp = useCallback(async () => {
    if (!isValid || applying) return;
    setApplying(true);
    setError(null);

    try {
      // Build updated creature data
      const updatedAbilities = { ...creature.abilities };
      if (isBoostLevel) {
        for (const ability of choices.abilityBoosts) {
          if (!ability) continue;
          const key = ability.toLowerCase() as keyof typeof updatedAbilities;
          const current = updatedAbilities[key] || 10;
          updatedAbilities[key] = current + (current >= 18 ? 1 : 2);
        }
      }

      // Calculate HP gain
      const conMod = Math.floor(((creature.abilities.constitution || 10) - 10) / 2);
      const classHitDie: Record<string, number> = {
        Fighter: 10, Champion: 10, Barbarian: 12, Ranger: 10, Monk: 10,
        Rogue: 8, Bard: 8, Cleric: 8, Druid: 8, Wizard: 6, Sorcerer: 6,
        Witch: 6, Oracle: 8, Investigator: 8, Swashbuckler: 10, Magus: 8,
        Summoner: 10, Gunslinger: 8, Inventor: 8, Psychic: 6, Thaumaturge: 8,
        Kineticist: 8, Alchemist: 8,
      };
      const hitDie = classHitDie[className] || 8;
      const boostConGain = isBoostLevel && choices.abilityBoosts.includes('Constitution') ? 1 : 0;
      const hpGain = hitDie + conMod + boostConGain;
      const newMaxHP = (creature.maxHealth || 0) + hpGain;

      // Updated proficiencies
      const baseProficiencies = {
        ...BASE_PROFICIENCIES,
        ...(CLASS_STARTING_PROFICIENCIES[className] || {}),
      };
      const newProficiencies = applyClassFeatureProficiencies(className, newLevel, baseProficiencies);

      // Build updated skills
      const updatedSkills = (creature.skills || []).map(sk => {
        const isIncreased = sk.name === choices.skillIncrease;
        if (!isIncreased) return sk;
        // Increase proficiency rank
        const currentRankIdx = PROFICIENCY_RANKS.indexOf(skillProficiencies[sk.name] || 'untrained');
        const newRankIdx = Math.min(currentRankIdx + 1, PROFICIENCY_RANKS.length - 1);
        const newRank = PROFICIENCY_RANKS[newRankIdx];
        const profBonus = newRank === 'trained' ? 2 : newRank === 'expert' ? 4 : newRank === 'master' ? 6 : newRank === 'legendary' ? 8 : 0;
        const levelBonus = newRank !== 'untrained' ? newLevel : 0;
        return {
          ...sk,
          proficiency: newRank,
          profBonus: profBonus + levelBonus,
          bonus: sk.abilityMod + profBonus + levelBonus,
        };
      });

      // Build new feats array
      const newFeats = [...(creature.feats || [])];
      const addFeat = (id: string, type: string) => {
        const feat = getFeatById(id);
        if (feat) {
          newFeats.push({ name: feat.name, type, level: feat.level });
        }
      };
      if (choices.classFeat) addFeat(choices.classFeat, 'class');
      if (choices.skillFeat) addFeat(choices.skillFeat, 'skill');
      if (choices.generalFeat) addFeat(choices.generalFeat, 'general');
      if (choices.ancestryFeat) addFeat(choices.ancestryFeat, 'ancestry');
      if (choices.archetypeFeat) addFeat(choices.archetypeFeat, 'archetype');

      // Collect specials (from class features)
      const updatedSpecials = [...(creature.specials || [])];
      for (const feat of classFeatures) {
        if (feat.implemented !== 'not_implemented' && !updatedSpecials.includes(feat.name)) {
          updatedSpecials.push(feat.name);
        }
      }

      // Build the locally-computed updated creature
      const updatedCreature: Creature = {
        ...creature,
        level: newLevel,
        abilities: updatedAbilities,
        maxHealth: newMaxHP,
        currentHealth: (creature.currentHealth || 0) + hpGain,
        feats: newFeats,
        skills: updatedSkills,
        specials: updatedSpecials.length > 0 ? updatedSpecials : undefined,
        currentXP: (creature.currentXP || 0) % XP_PER_LEVEL,
      };

      if (gameId) {
        // In-game: send update to backend
        const updates = {
          abilities: updatedAbilities,
          maxHealth: newMaxHP,
          proficiencies: newProficiencies,
          feats: newFeats,
          skills: updatedSkills,
          specials: updatedSpecials.length > 0 ? updatedSpecials : undefined,
        };

        const res = await axios.post(
          `${API_BASE}/game/${gameId}/creature/${creature.id}/levelup`,
          { updates }
        );

        onComplete(res.data.creature || updatedCreature);
      } else {
        // Local-only mode (landing page): apply directly
        onComplete(updatedCreature);
      }
    } catch (err: any) {
      console.error('Level-up failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to apply level up');
    } finally {
      setApplying(false);
    }
  }, [choices, creature, newLevel, gameId, isValid, applying, isBoostLevel, className, classFeatures, skillProficiencies, onComplete]);

  // ── Render ──
  return (
    <div className="lu-overlay" role="dialog" aria-modal="true" aria-label="Level Up">
      <div className="lu-modal">
        {/* Header */}
        <div className="lu-header">
          <div className="lu-header-icon">⬆️</div>
          <div className="lu-header-text">
            <h2>Level Up! {creature.name}</h2>
            <p>Level {newLevel - 1} → Level {newLevel} • {className}</p>
          </div>
          <button className="lu-close-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="lu-body">
          {/* HP Increase (always) */}
          {renderHPIncrease()}

          {/* Proficiency Upgrades (automatic) */}
          {renderProficiencyUpgrades()}

          {/* Class Features (automatic) */}
          {renderClassFeatures()}

          {/* Ability Boosts (at levels 5, 10, 15, 20) */}
          {renderAbilityBoosts()}

          {/* Skill Increase */}
          {renderSkillIncrease()}

          {/* Class Feat */}
          {hasClassFeat && renderFeatSection(
            `${className} Class Feat`,
            '🗡️',
            'class',
            getSelectableClassFeats(className, newLevel),
            choices.classFeat,
            (id) => setChoices({ ...choices, classFeat: id }),
            '#87ceeb',
          )}

          {/* Skill Feat */}
          {hasSkillFeat && renderFeatSection(
            'Skill Feat',
            '📚',
            'skill',
            getSelectableSkillFeats(newLevel),
            choices.skillFeat,
            (id) => setChoices({ ...choices, skillFeat: id }),
            '#90ee90',
          )}

          {/* General Feat */}
          {hasGeneralFeat && renderFeatSection(
            'General Feat',
            '⭐',
            'general',
            getSelectableGeneralFeats(newLevel),
            choices.generalFeat,
            (id) => setChoices({ ...choices, generalFeat: id }),
            '#dda0dd',
          )}

          {/* Ancestry Feat */}
          {hasAncestryFeat && renderFeatSection(
            `${ancestry} Ancestry Feat`,
            '🌿',
            'ancestry',
            getSelectableAncestryFeats(ancestry, newLevel, heritage || undefined),
            choices.ancestryFeat,
            (id) => setChoices({ ...choices, ancestryFeat: id }),
            '#f4a460',
          )}

          {/* Free Archetype Feat */}
          {hasFreeArchetype && renderFeatSection(
            'Free Archetype Feat',
            '🏛️',
            'archetype',
            getSelectableArchetypeFeats(newLevel),
            choices.archetypeFeat,
            (id) => setChoices({ ...choices, archetypeFeat: id }),
            '#d8a0d8',
          )}
        </div>

        {/* Footer */}
        <div className="lu-footer">
          {/* Validation messages */}
          {validationIssues.length > 0 && (
            <div className="lu-validation">
              {validationIssues.map((issue, i) => (
                <div key={i} className="lu-validation-item">⚠️ {issue}</div>
              ))}
            </div>
          )}

          {error && (
            <div className="lu-error">❌ {error}</div>
          )}

          <div className="lu-actions">
            <button className="lu-btn lu-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="lu-btn lu-btn-apply"
              onClick={applyLevelUp}
              disabled={!isValid || applying}
            >
              {applying ? 'Applying...' : `Level Up to ${newLevel}!`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelUpWizard;
