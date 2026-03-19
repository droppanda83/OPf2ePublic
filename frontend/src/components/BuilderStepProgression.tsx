/**
 * Builder Step 8: Level Progression (Lv2+)
 * Extracted from CharacterBuilder for maintainability.
 */

import React from 'react';
import { getSelectableClassFeats, getClassFeatures, getSelectableSkillFeats, getSelectableGeneralFeats, getSelectableAncestryFeats, getSelectableArchetypeFeats, validateDedicationTaking, getFeatById } from '../../../shared/feats';
import {
  BuilderState,
  ABILITY_LABELS,
  SKILLS,
  PROFICIENCY_RANKS,
  type ProfRank,
  getClassProgression,
  CONSCIOUS_MINDS,
} from './characterBuilderData';
import {
  computeAbilityScores,
  computeSkillProficiencies,
  getBoostLevels,
  getBoostsPerLevel,
  getGradualBoostGroup,
  getMaxProficiencyAtLevel,
  getIntBonusSkillLevels,
  getAncestryFeatSlots,
  renderFeatSlot,
  implementationBadge,
  featTypeLabel,
} from './characterBuilderHelpers';
import type { FeatEntry } from '../../../shared/featTypes';

interface BuilderStepProgressionProps {
  character: BuilderState;
  setCharacter: (s: BuilderState) => void;
}

// Helper: Determine if a feat grants a bonus feat selection
type BonusFeatSource = 'fighter' | 'rogue' | 'magus' | 'sorcerer' | 'wizard' | 'barbarian' | 'champion' | 'monk' | 'ranger' | 'cleric' | 'psychic';
const getBonusFeatInfo = (featId: string, characterLevel: number): { grants: boolean; source: BonusFeatSource | null; maxLevel: number } | null => {
  // Basic archetype feats grant a 1st- or 2nd-level class feat
  const basicFeatMap: Record<string, BonusFeatSource> = {
    'basic-fighter-maneuver': 'fighter',
    'basic-trickery': 'rogue',
    'basic-martial-magic': 'magus',
    'basic-blood-potency': 'sorcerer',
    'basic-arcana': 'wizard',
    'basic-fury': 'barbarian',
    'basic-devotion': 'champion',
    'basic-kata': 'monk',
    'basic-hunters-trick': 'ranger',
    'basic-dogma': 'cleric',
    'basic-thoughtform': 'psychic',
  };
  // Advanced archetype feats grant a class feat up to half character level
  const advancedFeatMap: Record<string, BonusFeatSource> = {
    'advanced-fighter-maneuver': 'fighter',
    'advanced-trickery': 'rogue',
    'advanced-blood-potency': 'sorcerer',
    'advanced-arcana': 'wizard',
    'advanced-fury': 'barbarian',
    'advanced-devotion': 'champion',
    'advanced-kata': 'monk',
    'advanced-hunters-trick': 'ranger',
    'advanced-dogma': 'cleric',
    'advanced-thoughtform': 'psychic',
  };

  if (basicFeatMap[featId]) {
    return { grants: true, source: basicFeatMap[featId], maxLevel: 2 };
  }
  if (advancedFeatMap[featId]) {
    return { grants: true, source: advancedFeatMap[featId], maxLevel: Math.floor(characterLevel / 2) };
  }
  return null;
};

export const BuilderStepProgression: React.FC<BuilderStepProgressionProps> = ({ character, setCharacter }) => {
  const progression = getClassProgression(character.class);
  if (!progression) return <div className="step-content"><h2>Level Progression</h2><p>No progression data for this class.</p></div>;

  // Tab state for feat slot tabbing (per slot level)
  const [archetypeTabs, setArchetypeTabs] = React.useState<Record<number, 'dedications' | 'feats'>>({});
  const [classFeatTabs, setClassFeatTabs] = React.useState<Record<number, 'class' | 'dedications' | 'archetype'>>({});

  // Only levels 2+
  const classFeatSlots = progression.classFeatLevels.filter(l => l > 1 && l <= character.level);
  const skillFeatSlots = progression.skillFeatLevels.filter(l => l > 1 && l <= character.level);
  const generalFeatSlots = progression.generalFeatLevels.filter(l => l <= character.level); // First is Lv3
  const ancestryFeatSlots = getAncestryFeatSlots(character).filter(l => Math.floor(l) > 1);
  const classFeatures = getClassFeatures(character.class, character.level).filter(f => f.level > 1);

  const selectedClassFeatIds = [
    ...Object.values(character.classFeats).filter(Boolean),
    ...(character.ancestryBonusClassFeat ? [character.ancestryBonusClassFeat] : []),
  ];
  const selectedSkillFeatIds = Object.values(character.skillFeats).filter(Boolean);
  const selectedGeneralFeatIds = Object.values(character.generalFeats).filter(Boolean);
  const selectedAncestryFeatIds = Object.values(character.ancestryFeats).filter(Boolean);

  const hasProgression = character.level > 1;

  return (
    <div className="step-content">
      <h2>Level Progression (Lv 2–{character.level})</h2>

      {!hasProgression && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          <p style={{ fontSize: '16px' }}>Your character is level 1 — no additional progression to configure.</p>
          <p style={{ fontSize: '13px' }}>Increase your character's level in Step 5 to unlock feat and ability boost progression here.</p>
        </div>
      )}

      {hasProgression && (
        <>
          {/* Level Progression Summary */}
          <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: 'rgba(40, 40, 60, 0.3)', borderRadius: '8px', border: '1px solid rgba(100, 100, 150, 0.3)' }}>
            <h3 style={{ marginTop: 0, color: '#b0b0d0', fontSize: '15px' }}>
              Level {character.level} {character.class} Progression
            </h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#999' }}>
              <span>🗡️ Class Feats (2+): {classFeatSlots.length}</span>
              <span>📚 Skill Feats (2+): {skillFeatSlots.length}</span>
              <span>📈 Skill Increases: {progression.skillIncreaseLevels.filter(l => l <= character.level).length}</span>
              <span>⭐ General Feats: {generalFeatSlots.length}</span>
              <span>🌿 Ancestry Feats (2+): {ancestryFeatSlots.length}</span>
            </div>
          </div>

          {/* Auto-Granted Class Features Lv2+ */}
          {classFeatures.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(100, 85, 20, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 170, 40, 0.3)' }}>
              <h3 style={{ marginTop: 0, color: '#ffd700' }}>Class Features (Automatic)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {classFeatures.map(feat => (
                  <div key={feat.id} style={{ padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', borderLeft: '3px solid #ffd700' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#e0e0e0' }}>{feat.name}</strong>
                      {featTypeLabel(feat)}
                      {implementationBadge(feat)}
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Level-Up Ability Boosts ── */}
          {(() => {
            const boostLevels = getBoostLevels(character).filter(l => l <= character.level);
            if (boostLevels.length === 0) return null;
            const allAbilities = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
            return (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(120, 100, 40, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 170, 60, 0.3)' }}>
                <h3 style={{ marginTop: 0, color: '#d4af37' }}>
                  💪 Ability Boosts ({character.optionalRules.gradualAbilityBoosts ? 'Gradual' : 'Standard'})
                </h3>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                  {character.optionalRules.gradualAbilityBoosts
                    ? 'You gain 1 ability boost at each of these levels. Within each group of 4, all must be different abilities. Each boost adds +2 (or +1 if 18+).'
                    : 'You gain 4 ability boosts at the levels below. Each boost adds +2 (or +1 if the score is already 18+). All 4 must be different abilities.'}
                </p>
                {boostLevels.map(boostLevel => {
                  const numBoosts = getBoostsPerLevel(character, boostLevel);
                  const currentPicks = character.levelBoosts[boostLevel] || [];
                  const scoresBeforeThisBoost = computeAbilityScores(character, boostLevel - 1);
                  // Show group header for gradual boosts
                  const isGradual = character.optionalRules.gradualAbilityBoosts;
                  const group = isGradual ? getGradualBoostGroup(boostLevel) : [boostLevel];
                  const isFirstInGroup = group[0] === boostLevel;
                  return (
                    <React.Fragment key={boostLevel}>
                      {isGradual && isFirstInGroup && (
                        <div style={{ fontSize: '12px', color: '#b0a060', fontWeight: 'bold', marginTop: '8px', marginBottom: '4px', borderBottom: '1px solid rgba(200, 170, 60, 0.2)', paddingBottom: '4px' }}>
                          ─── Group: Levels {group[0]}–{group[group.length - 1]} (4 different abilities) ───
                        </div>
                      )}
                      <div style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', borderLeft: '3px solid #d4af37' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d4af37', marginBottom: '6px' }}>
                          Level {boostLevel} — {numBoosts} boost{numBoosts > 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {Array.from({ length: numBoosts }).map((_, idx) => {
                            // Prevent duplicates within the same level (standard mode)
                            const selectedInThisLevel = currentPicks.filter((_, i) => i !== idx);
                            // For gradual boosts, also prevent duplicates within the same group of 4
                            let groupTakenAbilities: string[] = [];
                            if (character.optionalRules.gradualAbilityBoosts) {
                              const groupLevels = getGradualBoostGroup(boostLevel);
                              groupTakenAbilities = groupLevels
                                .filter(gl => gl !== boostLevel)
                                .flatMap(gl => (character.levelBoosts[gl] || []).filter(Boolean));
                            }
                            return (
                              <select
                                key={`boost-${boostLevel}-${idx}`}
                                value={currentPicks[idx] || ''}
                                onChange={(e) => {
                                  const newPicks = [...currentPicks];
                                  while (newPicks.length <= idx) newPicks.push('');
                                  newPicks[idx] = e.target.value;
                                  setCharacter({
                                    ...character,
                                    levelBoosts: { ...character.levelBoosts, [boostLevel]: newPicks }
                                  });
                                }}
                                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '160px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                              >
                                <option value="">Select...</option>
                                {allAbilities.map(ability => {
                                  const k = ability.toLowerCase();
                                  const isDupeInLevel = selectedInThisLevel.includes(ability);
                                  const isDupeInGroup = groupTakenAbilities.includes(ability);
                                  const isDupe = isDupeInLevel || isDupeInGroup;
                                  const currentScore = scoresBeforeThisBoost[k] || 10;
                                  const boostAmount = currentScore >= 18 ? 1 : 2;
                                  return (
                                    <option key={ability} value={ability} disabled={isDupe}>
                                      {ability} ({currentScore} → {currentScore + boostAmount}){isDupeInGroup ? ' [group]' : isDupeInLevel ? ' [taken]' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            );
                          })}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {/* Show updated final scores */}
                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(40, 40, 60, 0.4)', borderRadius: '6px', border: '1px solid #d4af37' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#d4af37', marginBottom: '8px' }}>Final Ability Scores (with all boosts)</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(ABILITY_LABELS).map(([abilityKey, label]) => {
                      const allScores = computeAbilityScores(character);
                      const score = allScores[abilityKey] || 10;
                      const modifier = Math.floor((score - 10) / 2);
                      const shortName = label.split(' ')[0].slice(0, 3).toUpperCase();
                      return (
                        <div key={abilityKey} style={{
                          padding: '8px',
                          textAlign: 'center',
                          backgroundColor: 'rgba(20, 20, 40, 0.6)',
                          borderRadius: '4px',
                          border: '1px solid #666',
                          width: '65px',
                        }}>
                          <div style={{ fontSize: '11px', color: '#aaa', fontWeight: '600' }}>{shortName}</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4af37' }}>{score}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{modifier >= 0 ? '+' : ''}{modifier}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Skill Increases ── */}
          {(() => {
            const skillIncreaseLvls = progression.skillIncreaseLevels.filter(l => l <= character.level);
            if (skillIncreaseLvls.length === 0) return null;
            return (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(40, 120, 120, 0.15)', borderRadius: '8px', border: '1px solid rgba(80, 200, 200, 0.3)' }}>
                <h3 style={{ marginTop: 0, color: '#7dd8d8' }}>
                  📈 Skill Increases ({skillIncreaseLvls.length})
                </h3>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                  At each skill increase, raise one skill's proficiency by one rank.
                  Trained → Expert (Lv3+) → Master (Lv7+) → Legendary (Lv15+).
                </p>
                {skillIncreaseLvls.map(lvl => {
                  const profsBeforeThis = computeSkillProficiencies(character, lvl - 1);
                  const maxRank = getMaxProficiencyAtLevel(lvl);
                  const maxRankIdx = PROFICIENCY_RANKS.indexOf(maxRank);
                  const eligibleSkills = Object.entries(profsBeforeThis)
                    .filter(([, rank]) => {
                      const rankIdx = PROFICIENCY_RANKS.indexOf(rank);
                      return rankIdx >= 1 && rankIdx < maxRankIdx;
                    })
                    .map(([name, rank]) => ({ name, rank, nextRank: PROFICIENCY_RANKS[PROFICIENCY_RANKS.indexOf(rank) + 1] }));
                  const untrainedSkills = Object.entries(profsBeforeThis)
                    .filter(([, rank]) => rank === 'untrained')
                    .map(([name]) => ({ name, rank: 'untrained' as ProfRank, nextRank: 'trained' as ProfRank }));
                  const allOptions = [...eligibleSkills, ...untrainedSkills];
                  allOptions.sort((a, b) => a.name.localeCompare(b.name));

                  const rankColors: Record<string, string> = {
                    untrained: '#888', trained: '#90ee90', expert: '#87ceeb', master: '#c4a6e8', legendary: '#ffd700'
                  };

                  return (
                    <div key={lvl} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ minWidth: '60px', fontSize: '13px', fontWeight: 'bold', color: '#7dd8d8' }}>Level {lvl}:</span>
                      <select
                        value={character.skillIncreases[lvl] || ''}
                        onChange={(e) => {
                          setCharacter({ ...character, skillIncreases: { ...character.skillIncreases, [lvl]: e.target.value } });
                        }}
                        style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '250px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                      >
                        <option value="">Select skill to increase...</option>
                        {allOptions.map(opt => (
                          <option key={opt.name} value={opt.name}>
                            {opt.name}: {opt.rank} → {opt.nextRank}
                          </option>
                        ))}
                      </select>
                      {character.skillIncreases[lvl] && (() => {
                        const picked = allOptions.find(o => o.name === character.skillIncreases[lvl]);
                        if (!picked) return null;
                        return (
                          <span style={{ fontSize: '12px' }}>
                            <span style={{ color: rankColors[picked.rank] }}>{picked.rank}</span>
                            {' → '}
                            <span style={{ color: rankColors[picked.nextRank], fontWeight: 'bold' }}>{picked.nextRank}</span>
                          </span>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── INT Bonus Skills (from Intelligence boosts) ── */}
          {(() => {
            const intBonusLevels = getIntBonusSkillLevels(character);
            if (intBonusLevels.length === 0) return null;
            const currentProfs = computeSkillProficiencies(character);
            const untrainedCoreSkills = SKILLS.filter(s => s !== 'Lore' && currentProfs[s] === 'untrained');
            const alreadyPickedIntBonus = Object.values(character.intBonusSkills).filter(Boolean);

            return (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(70, 50, 120, 0.15)', borderRadius: '8px', border: '1px solid rgba(140, 100, 220, 0.3)' }}>
                <h3 style={{ marginTop: 0, color: '#c4a6e8' }}>
                  🧠 Additional Skills from Intelligence ({intBonusLevels.length})
                </h3>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                  Your Intelligence modifier increased at the following levels, granting you an additional trained skill at each.
                </p>
                {intBonusLevels.map(bl => {
                  const available = untrainedCoreSkills.filter(s => {
                    return character.intBonusSkills[bl] === s || !alreadyPickedIntBonus.includes(s) || character.intBonusSkills[bl] === s;
                  });
                  return (
                    <div key={bl} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ minWidth: '80px', fontSize: '13px', fontWeight: 'bold', color: '#c4a6e8' }}>Level {bl}:</span>
                      <select
                        value={character.intBonusSkills[bl] || ''}
                        onChange={(e) => {
                          setCharacter({ ...character, intBonusSkills: { ...character.intBonusSkills, [bl]: e.target.value } });
                        }}
                        style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                      >
                        <option value="">Select skill to train...</option>
                        {available.map(skill => {
                          const isOtherPick = alreadyPickedIntBonus.includes(skill) && character.intBonusSkills[bl] !== skill;
                          return (
                            <option key={skill} value={skill} disabled={isOtherPick}>
                              {skill}{isOtherPick ? ' (selected)' : ''} → Trained
                            </option>
                          );
                        })}
                      </select>
                      {character.intBonusSkills[bl] && (
                        <span style={{ fontSize: '12px', color: '#90ee90', fontWeight: 'bold' }}>
                          → Trained
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Class Feats (Lv2+) ── */}
          {classFeatSlots.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(50, 70, 120, 0.15)', borderRadius: '8px', border: '1px solid rgba(100, 140, 220, 0.3)' }}>
              <h3 style={{ marginTop: 0, color: '#87ceeb' }}>
                🗡️ {character.class} Class Feats ({classFeatSlots.length})
              </h3>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px 0' }}>
                You may spend class feat slots on archetype dedication or archetype feats instead.
              </p>
              {classFeatSlots.map(slotLevel => {
                const activeTab = classFeatTabs[slotLevel] || 'class';
                const selectedId = character.classFeats[slotLevel] || '';

                // Gather feats for each tab
                const classFeats = getSelectableClassFeats(character.class, slotLevel);

                const allArchetypeFeats = getSelectableArchetypeFeats(slotLevel);
                const ownClassDedicationId = `${character.class.toLowerCase()}-dedication`;

                // Combine archetype feats from BOTH archetype slots AND class feat slots for validation
                const allArchetypeSelections = [
                  ...Object.values(character.archetypeFeats).filter(Boolean),
                  ...Object.entries(character.classFeats)
                    .filter(([_, id]) => id && allArchetypeFeats.some(f => f.id === id))
                    .map(([_, id]) => id),
                ].filter(Boolean);
                // Remove THIS slot's pick to avoid self-referencing
                const otherArchetypeSelections = allArchetypeSelections.filter(id => id !== selectedId);

                const dedicationFeats = allArchetypeFeats.filter(feat => {
                  if (!feat.traits?.includes('Dedication')) return false;
                  if (feat.id === ownClassDedicationId) return false;
                  const validation = validateDedicationTaking(feat.id, otherArchetypeSelections);
                  return validation.valid;
                });

                const archNonDedFeats = allArchetypeFeats.filter(f => !f.traits?.includes('Dedication'));

                // Determine which feats go into the dropdown based on active tab
                let tabFeats: FeatEntry[];
                if (activeTab === 'dedications') tabFeats = dedicationFeats;
                else if (activeTab === 'archetype') tabFeats = archNonDedFeats;
                else tabFeats = classFeats;

                // Dedup: combine class feat IDs + archetype feat IDs
                const allSelectedIds = [
                  ...selectedClassFeatIds,
                  ...Object.values(character.archetypeFeats).filter(Boolean),
                ];

                const tabStyle = (isActive: boolean, color: string): React.CSSProperties => ({
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  color: isActive ? color : '#888',
                  backgroundColor: isActive ? 'rgba(100, 140, 220, 0.15)' : 'transparent',
                  border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                  borderBottom: isActive ? 'none' : '1px solid rgba(100, 140, 220, 0.2)',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                });

                return (
                  <div key={slotLevel}>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '-1px', marginLeft: '100px' }}>
                      <div style={tabStyle(activeTab === 'class', '#87ceeb')} onClick={() => setClassFeatTabs({ ...classFeatTabs, [slotLevel]: 'class' })}>
                        Class ({classFeats.length})
                      </div>
                      <div style={tabStyle(activeTab === 'dedications', '#d8a0d8')} onClick={() => setClassFeatTabs({ ...classFeatTabs, [slotLevel]: 'dedications' })}>
                        Dedications ({dedicationFeats.length})
                      </div>
                      <div style={tabStyle(activeTab === 'archetype', '#d8a0d8')} onClick={() => setClassFeatTabs({ ...classFeatTabs, [slotLevel]: 'archetype' })}>
                        Archetype ({archNonDedFeats.length})
                      </div>
                    </div>
                    {renderFeatSlot(
                      character,
                      slotLevel,
                      selectedId,
                      tabFeats,
                      allSelectedIds,
                      (id) => setCharacter({ ...character, classFeats: { ...character.classFeats, [slotLevel]: id } }),
                      activeTab === 'class' ? '#87ceeb' : '#d8a0d8',
                      (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Free Archetype Feats (even levels, variant rule) ── */}
          {character.optionalRules.freeArchetype && (() => {
            const FREE_ARCHETYPE_LEVELS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
            const archetypeSlots = FREE_ARCHETYPE_LEVELS.filter(l => l <= character.level);
            if (archetypeSlots.length === 0) return null;
            
            const selectedArchetypeFeatIds = Object.values(character.archetypeFeats).filter(Boolean);
            
            return (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(120, 50, 120, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 100, 200, 0.3)' }}>
                <h3 style={{ marginTop: 0, color: '#d8a0d8' }}>
                  🏛️ Free Archetype Feats ({archetypeSlots.length})
                </h3>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                  Free Archetype grants an additional feat slot at every even level.
                  These must be dedication feats or feats from a dedication you already have.
                  <br />
                  <strong>Rule:</strong> You cannot select another dedication feat until you take 2 other archetype feats.
                </p>
                {archetypeSlots.map(slotLevel => {
                  const selectedId = character.archetypeFeats[slotLevel] || '';
                  
                  // Get all archetype feats for this level
                  const allArchetypeFeats = getSelectableArchetypeFeats(slotLevel);
                  const ownClassDedicationId = `${character.class.toLowerCase()}-dedication`;
                  
                  // Get other archetype feats (excluding this slot) for validation
                  // Include archetype feats picked in class feat slots too
                  const classSlotArchetypeFeats = Object.values(character.classFeats)
                    .filter(id => id && allArchetypeFeats.some(f => f.id === id))
                    .filter(Boolean);
                  const otherArchetypeFeats = [
                    ...Object.entries(character.archetypeFeats)
                      .filter(([lvl]) => parseInt(lvl) !== slotLevel)
                      .map(([_, id]) => id)
                      .filter(Boolean),
                    ...classSlotArchetypeFeats,
                  ];
                  
                  // Filter available feats: exclude own class dedication AND invalid dedications
                  const availableFeats = allArchetypeFeats.filter(feat => {
                    // Exclude own class dedication
                    if (feat.id === ownClassDedicationId) return false;
                    
                    // If it's a dedication feat, check if it violates the rule
                    if (feat.traits?.includes('Dedication')) {
                      const validation = validateDedicationTaking(feat.id, otherArchetypeFeats);
                      return validation.valid;
                    }
                    
                    return true;
                  });
                  
                  // Check if selected feat grants a bonus feat
                  const bonusFeatInfo = selectedId ? getBonusFeatInfo(selectedId, character.level) : null;
                  const bonusSelectedFeatId = character.archetypeBonusFeats[slotLevel] || '';
                  
                  return (
                    <div key={slotLevel}>
                      {/* Tab buttons for archetype feat slot */}
                      {(() => {
                        const activeTab = archetypeTabs[slotLevel] || 'dedications';
                        const dedicationFeats = availableFeats.filter(f => f.traits?.includes('Dedication'));
                        const archetypeNonDedFeats = availableFeats.filter(f => !f.traits?.includes('Dedication'));
                        const tabFeats = activeTab === 'dedications' ? dedicationFeats : archetypeNonDedFeats;
                        const tabStyle = (isActive: boolean): React.CSSProperties => ({
                          padding: '4px 12px',
                          fontSize: '12px',
                          fontWeight: isActive ? 'bold' : 'normal',
                          color: isActive ? '#d8a0d8' : '#888',
                          backgroundColor: isActive ? 'rgba(200, 100, 200, 0.15)' : 'transparent',
                          border: isActive ? '1px solid rgba(200, 100, 200, 0.4)' : '1px solid transparent',
                          borderBottom: isActive ? 'none' : '1px solid rgba(200, 100, 200, 0.2)',
                          borderRadius: '4px 4px 0 0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        });
                        return (
                          <>
                            <div style={{ display: 'flex', gap: '2px', marginBottom: '-1px', marginLeft: '100px' }}>
                              <div style={tabStyle(activeTab === 'dedications')} onClick={() => setArchetypeTabs({ ...archetypeTabs, [slotLevel]: 'dedications' })}>
                                Dedications ({dedicationFeats.length})
                              </div>
                              <div style={tabStyle(activeTab === 'feats')} onClick={() => setArchetypeTabs({ ...archetypeTabs, [slotLevel]: 'feats' })}>
                                Archetype Feats ({archetypeNonDedFeats.length})
                              </div>
                            </div>
                            {renderFeatSlot(
                              character,
                              slotLevel,
                              selectedId,
                              tabFeats,
                              selectedArchetypeFeatIds,
                              (id) => {
                                const newState = { ...character, archetypeFeats: { ...character.archetypeFeats, [slotLevel]: id } };
                                // Clear bonus feat if changing archetype feat selection
                                if (id !== selectedId && character.archetypeBonusFeats[slotLevel]) {
                                  newState.archetypeBonusFeats = { ...character.archetypeBonusFeats };
                                  delete newState.archetypeBonusFeats[slotLevel];
                                }
                                // Clear psychic dedication sub-choices if deselecting psychic-dedication
                                if (selectedId === 'psychic-dedication' && id !== 'psychic-dedication') {
                                  newState.archetypeConsciousMind = '';
                                  newState.archetypePsiCantrip = '';
                                  newState.archetypePsiCantrip2 = '';
                                }
                                // Clear psi development cantrip if deselecting psi-development
                                if (selectedId === 'psi-development' && id !== 'psi-development') {
                                  newState.archetypePsiCantrip2 = '';
                                }
                                setCharacter(newState);
                              },
                              '#d8a0d8',
                              (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
                            )}
                          </>
                        );
                      })()}
                      
                      {/* Bonus feat selection for feats like Basic Maneuver */}
                      {bonusFeatInfo && bonusFeatInfo.grants && (
                        <div style={{ marginLeft: '100px', marginTop: '8px', padding: '10px', backgroundColor: 'rgba(150, 100, 200, 0.1)', borderRadius: '4px', borderLeft: '3px solid #b888ff' }}>
                          <div style={{ fontSize: '12px', color: '#b888ff', marginBottom: '6px', fontWeight: 'bold' }}>
                            ✨ Bonus Feat Selection (from {getFeatById(selectedId)?.name})
                          </div>
                          {(() => {
                            const sourceClassMap: Record<string, string> = {
                              fighter: 'Fighter', rogue: 'Rogue', magus: 'Magus',
                              sorcerer: 'Sorcerer', wizard: 'Wizard', barbarian: 'Barbarian',
                              champion: 'Champion', monk: 'Monk', ranger: 'Ranger',
                              cleric: 'Cleric', psychic: 'Psychic',
                            };
                            const className = bonusFeatInfo.source ? sourceClassMap[bonusFeatInfo.source] : '';
                            const bonusFeats = className
                              ? getSelectableClassFeats(className, bonusFeatInfo.maxLevel)
                              : [];
                            
                            const selectedBonusFeat = bonusFeats.find(f => f.id === bonusSelectedFeatId);
                            
                            return (
                              <>
                                <select
                                  value={bonusSelectedFeatId}
                                  onChange={(e) => setCharacter({
                                    ...character,
                                    archetypeBonusFeats: { ...character.archetypeBonusFeats, [slotLevel]: e.target.value }
                                  })}
                                  style={{ padding: '6px 10px', fontSize: '13px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #6a4a9a', borderRadius: '4px', width: '100%', marginBottom: '4px' }}
                                >
                                  <option value="">Select {bonusFeatInfo.source} feat (Lv 1-{bonusFeatInfo.maxLevel})...</option>
                                  {bonusFeats.map(feat => (
                                    <option key={feat.id} value={feat.id}>
                                      {feat.name} (Lv {feat.level}) — {feat.description.slice(0, 50)}...
                                    </option>
                                  ))}
                                </select>
                                {selectedBonusFeat && (
                                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px', padding: '4px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '3px' }}>
                                    {selectedBonusFeat.description}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* ── Psychic Dedication: Conscious Mind + Psi Cantrip selection ── */}
                      {selectedId === 'psychic-dedication' && (() => {
                        const selectedMind = CONSCIOUS_MINDS.find(m => m.id === character.archetypeConsciousMind);
                        return (
                          <div style={{ marginLeft: '100px', marginTop: '8px', padding: '12px', backgroundColor: 'rgba(120, 60, 180, 0.1)', borderRadius: '6px', borderLeft: '3px solid #c084fc' }}>
                            <div style={{ fontSize: '13px', color: '#c084fc', fontWeight: 'bold', marginBottom: '8px' }}>
                              🧠 Choose Conscious Mind
                            </div>
                            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 10px 0' }}>
                              Your conscious mind determines which psi cantrips are available to you.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                              {CONSCIOUS_MINDS.map(mind => {
                                const isSelected = character.archetypeConsciousMind === mind.id;
                                return (
                                  <div
                                    key={mind.id}
                                    onClick={() => {
                                      const newState = { ...character, archetypeConsciousMind: mind.id, archetypePsiCantrip: '', archetypePsiCantrip2: '' };
                                      setCharacter(newState);
                                    }}
                                    style={{
                                      padding: '10px 14px',
                                      backgroundColor: isSelected ? 'rgba(160, 100, 220, 0.15)' : 'rgba(0,0,0,0.2)',
                                      borderRadius: '5px',
                                      border: isSelected ? '2px solid #c084fc' : '1px solid rgba(100, 100, 150, 0.3)',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: isSelected ? '#c084fc' : '#e0e0e0' }}>
                                        {mind.name}
                                      </span>
                                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(160,100,220,0.2)', color: '#c9a6f0' }}>
                                        Cantrips: {mind.standardCantrips.join(', ')} + {mind.grantedCantrips.join(', ')}
                                      </span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#999', margin: '0 0 3px 0', fontStyle: 'italic' }}>{mind.description}</p>
                                    <p style={{ fontSize: '11px', color: isSelected ? '#c084fc' : '#888', margin: 0 }}>
                                      <strong>Benefit:</strong> {mind.benefit}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Psi cantrip selection (pick one from standard or unique surface cantrips) */}
                            {selectedMind && (
                              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px' }}>
                                <div style={{ fontSize: '12px', color: '#c084fc', fontWeight: 'bold', marginBottom: '6px' }}>
                                  Choose your psi cantrip from {selectedMind.name}:
                                </div>
                                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px 0' }}>
                                  You gain one psi cantrip — a standard cantrip or the unique surface cantrip. You can gain another later with Psi Development.
                                </p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {[...selectedMind.standardCantrips.map(c => ({ id: c, type: 'Standard' })),
                                    ...selectedMind.grantedCantrips.map(c => ({ id: c, type: 'Unique Surface' }))
                                  ].map(({ id: cantrip, type }) => {
                                    const isChosen = character.archetypePsiCantrip === cantrip;
                                    const displayName = cantrip.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                    return (
                                      <div
                                        key={cantrip}
                                        onClick={() => setCharacter({ ...character, archetypePsiCantrip: cantrip })}
                                        style={{
                                          padding: '8px 14px',
                                          backgroundColor: isChosen ? 'rgba(160, 100, 220, 0.2)' : 'rgba(0,0,0,0.2)',
                                          borderRadius: '4px',
                                          border: isChosen ? '2px solid #c084fc' : '1px solid rgba(100, 100, 150, 0.3)',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease',
                                          fontSize: '13px',
                                          fontWeight: isChosen ? 'bold' : 'normal',
                                          color: isChosen ? '#c084fc' : '#ccc',
                                        }}
                                      >
                                        <div>{displayName}</div>
                                        <div style={{ fontSize: '10px', color: isChosen ? '#a78bfa' : '#888', marginTop: '2px' }}>
                                          {type}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {character.archetypePsiCantrip && (
                                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#c084fc' }}>
                                    ✓ Selected: <strong>{character.archetypePsiCantrip.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── Psi Development: Second psi cantrip selection ── */}
                      {selectedId === 'psi-development' && (() => {
                        const chosenMind = CONSCIOUS_MINDS.find(m => m.id === character.archetypeConsciousMind);
                        if (!chosenMind) {
                          return (
                            <div style={{ marginLeft: '100px', marginTop: '8px', padding: '10px', backgroundColor: 'rgba(120, 60, 180, 0.08)', borderRadius: '4px', borderLeft: '3px solid #c084fc' }}>
                              <span style={{ fontSize: '12px', color: '#f88', fontStyle: 'italic' }}>
                                ⚠ You must first select Psychic Dedication and choose a conscious mind before picking a second psi cantrip.
                              </span>
                            </div>
                          );
                        }
                        // Options: the standard cantrip NOT taken at Dedication, OR the unique surface cantrip
                        const options: { id: string; label: string; type: string }[] = [];
                        for (const sc of chosenMind.standardCantrips) {
                          if (sc !== character.archetypePsiCantrip) {
                            options.push({
                              id: sc,
                              label: sc.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                              type: 'Standard Cantrip',
                            });
                          }
                        }
                        for (const uc of chosenMind.grantedCantrips) {
                          if (uc !== character.archetypePsiCantrip) {
                            options.push({
                              id: uc,
                              label: uc.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                              type: 'Unique Surface Cantrip',
                            });
                          }
                        }
                        return (
                          <div style={{ marginLeft: '100px', marginTop: '8px', padding: '12px', backgroundColor: 'rgba(120, 60, 180, 0.1)', borderRadius: '6px', borderLeft: '3px solid #c084fc' }}>
                            <div style={{ fontSize: '13px', color: '#c084fc', fontWeight: 'bold', marginBottom: '6px' }}>
                              🧠 Choose second psi cantrip ({chosenMind.name})
                            </div>
                            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px 0' }}>
                              Gain the standard cantrip you didn't take at Dedication, or the unique surface psi cantrip. You also gain the amp ability and a focus pool of 1 FP.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {options.map(opt => {
                                const isChosen = character.archetypePsiCantrip2 === opt.id;
                                return (
                                  <div
                                    key={opt.id}
                                    onClick={() => setCharacter({ ...character, archetypePsiCantrip2: opt.id })}
                                    style={{
                                      padding: '8px 14px',
                                      backgroundColor: isChosen ? 'rgba(160, 100, 220, 0.2)' : 'rgba(0,0,0,0.2)',
                                      borderRadius: '4px',
                                      border: isChosen ? '2px solid #c084fc' : '1px solid rgba(100, 100, 150, 0.3)',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      fontSize: '13px',
                                      fontWeight: isChosen ? 'bold' : 'normal',
                                      color: isChosen ? '#c084fc' : '#ccc',
                                    }}
                                  >
                                    <div>{opt.label}</div>
                                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{opt.type}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {character.archetypePsiCantrip2 && (
                              <div style={{ marginTop: '8px', fontSize: '12px', color: '#c084fc' }}>
                                ✓ Selected: <strong>{character.archetypePsiCantrip2.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong>
                                {' '}— You gain the amp ability and a focus pool of 1 Focus Point.
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Ancestry Feats (Lv2+) ── */}
          {ancestryFeatSlots.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(120, 80, 40, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 140, 60, 0.3)' }}>
              <h3 style={{ marginTop: 0, color: '#f4a460' }}>
                🌿 Ancestry Feats — {character.ancestry}{character.heritageType === 'versatile' ? ` / ${character.heritage}` : ''} ({ancestryFeatSlots.length})
                {character.optionalRules.ancestryParagon && <span style={{ fontSize: '12px', color: '#f4a460', opacity: 0.7, marginLeft: '8px' }}>(Ancestry Paragon)</span>}
              </h3>
              {ancestryFeatSlots.map(slotLevel => renderFeatSlot(
                character,
                slotLevel,
                character.ancestryFeats[slotLevel] || '',
                getSelectableAncestryFeats(character.ancestry, Math.floor(slotLevel), character.heritageType === 'versatile' ? character.heritage : undefined),
                selectedAncestryFeatIds,
                (id) => setCharacter({ ...character, ancestryFeats: { ...character.ancestryFeats, [slotLevel]: id } }),
                '#f4a460',
                (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
              ))}
            </div>
          )}

          {/* ── Skill Feats (Lv2+) ── */}
          {skillFeatSlots.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(40, 100, 40, 0.15)', borderRadius: '8px', border: '1px solid rgba(80, 200, 80, 0.3)' }}>
              <h3 style={{ marginTop: 0, color: '#90ee90' }}>
                📚 Skill Feats ({skillFeatSlots.length})
              </h3>
              {skillFeatSlots.map(slotLevel => renderFeatSlot(
                character,
                slotLevel,
                character.skillFeats[slotLevel] || '',
                getSelectableSkillFeats(slotLevel),
                selectedSkillFeatIds,
                (id) => setCharacter({ ...character, skillFeats: { ...character.skillFeats, [slotLevel]: id } }),
                '#90ee90',
                (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
              ))}
            </div>
          )}

          {/* ── General Feats ── */}
          {generalFeatSlots.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(100, 50, 100, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 100, 200, 0.3)' }}>
              <h3 style={{ marginTop: 0, color: '#dda0dd' }}>
                ⭐ General Feats ({generalFeatSlots.length})
              </h3>
              {generalFeatSlots.map(slotLevel => renderFeatSlot(
                character,
                slotLevel,
                character.generalFeats[slotLevel] || '',
                getSelectableGeneralFeats(slotLevel),
                selectedGeneralFeatIds,
                (id) => setCharacter({ ...character, generalFeats: { ...character.generalFeats, [slotLevel]: id } }),
                '#dda0dd',
                (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
              ))}
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
        * All feats are sourced from the game catalog. Slots are determined by your class progression table.
      </p>
    </div>
  );
};
