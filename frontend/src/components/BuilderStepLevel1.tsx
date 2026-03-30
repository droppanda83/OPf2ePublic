/**
 * Builder Step 7: Level 1 — Skills & Starting Feats
 * Extracted from CharacterBuilder for maintainability.
 */

import React from 'react';
import { getSelectableClassFeats, getClassFeatures, getSelectableSkillFeats, getSelectableAncestryFeats, getSelectableGeneralFeats } from '../../../shared/feats';
import {
  BuilderState,
  BACKGROUND_SKILLS,
  CLASS_SKILLS,
  ROGUE_RACKETS,
  SKILLS,
  getClassProgression,
} from './characterBuilderData';
import {
  computeAbilityScores,
  getIntSkillSlots,
  getAncestryFeatSlots,
  renderFeatSlot,
  implementationBadge,
  featTypeLabel,
} from './characterBuilderHelpers';

interface BuilderStepLevel1Props {
  character: BuilderState;
  setCharacter: (s: BuilderState) => void;
}

export const BuilderStepLevel1: React.FC<BuilderStepLevel1Props> = ({ character, setCharacter }) => {
  const finalScores = computeAbilityScores(character);
  const intMod = Math.floor(((finalScores.intelligence || 10) - 10) / 2);
  const backgroundSkillData = BACKGROUND_SKILLS[character.background];
  const classSkillData = CLASS_SKILLS[character.class];
  const numAdditional = getIntSkillSlots(character);
  const coreSkills = SKILLS.filter(s => s !== 'Lore');
  // All skills the character is already trained in (from bg + class auto)
  const alreadyTrained = new Set<string>();
  if (backgroundSkillData) {
    backgroundSkillData.skills.forEach(s => alreadyTrained.add(s));
    alreadyTrained.add(backgroundSkillData.lore);
  }
  if (classSkillData) {
    classSkillData.autoTrained.forEach(s => alreadyTrained.add(s));
  }
  // Racket-granted skill
  if (character.class === 'Rogue' && character.rogueRacket) {
    const racket = ROGUE_RACKETS.find(r => r.id === character.rogueRacket);
    if (racket) alreadyTrained.add(racket.trainedSkill);
  }

  // Compute class choice options BEFORE adding classAutoSkillChoice to alreadyTrained,
  // so the currently selected value isn't filtered out of its own dropdown
  const choiceOptionsRaw = classSkillData?.choiceTrained || [];
  const availableChoice = choiceOptionsRaw.filter(s => !alreadyTrained.has(s));
  let choiceOptions = availableChoice;
  let choiceFallback = false;
  if (choiceOptionsRaw.length > 0 && choiceOptions.length === 0) {
    choiceFallback = true;
    choiceOptions = coreSkills.filter(s => !alreadyTrained.has(s));
    if (choiceOptions.length === 0) {
      choiceOptions = coreSkills;
    }
  }

  // NOW add classAutoSkillChoice so additional pick dropdowns exclude it
  if (character.classAutoSkillChoice) alreadyTrained.add(character.classAutoSkillChoice);

  // Available skills for additional picks: any core skill not already trained
  const availableForPick = coreSkills.filter(s => !alreadyTrained.has(s));
  const pickFallback = availableForPick.length === 0;
  const pickOptions = pickFallback ? coreSkills : availableForPick;

  const classFeatures = getClassFeatures(character.class, 1); // Level 1 features only
  const progression = getClassProgression(character.class);

  // Level 1 feat slots only
  const lv1ClassFeatSlots = progression ? progression.classFeatLevels.filter(l => l === 1) : [];
  const lv1SkillFeatSlots = progression ? progression.skillFeatLevels.filter(l => l === 1) : [];
  const lv1AncestryFeatSlots = getAncestryFeatSlots(character).filter(l => Math.floor(l) === 1);

  const selectedClassFeatIds = [
    ...Object.values(character.classFeats).filter(Boolean),
    ...(character.ancestryBonusClassFeat ? [character.ancestryBonusClassFeat] : []),
  ];
  const selectedSkillFeatIds = Object.values(character.skillFeats).filter(Boolean);
  const selectedAncestryFeatIds = Object.values(character.ancestryFeats).filter(Boolean);

  // Detect if Natural Ambition or General Training is selected as an ancestry feat
  const hasNaturalAmbition = selectedAncestryFeatIds.includes('natural-ambition');
  const hasGeneralTraining = selectedAncestryFeatIds.includes('general-training');

  // Available bonus feats for these ancestry feats
  const bonusClassFeats = hasNaturalAmbition ? getSelectableClassFeats(character.class, 1) : [];
  const bonusGeneralFeats = hasGeneralTraining ? getSelectableGeneralFeats(1) : [];

  return (
    <div className="step-content">
      <h2>Level 1 — Skills & Feats</h2>

      {/* Background Skills (automatic) */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(50, 100, 50, 0.15)', borderRadius: '8px', border: '1px solid rgba(100, 200, 100, 0.3)' }}>
        <h3 style={{ marginTop: 0, color: '#90ee90' }}>Background Skills (Automatic)</h3>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
          From your <strong>{character.background}</strong> background:
        </p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {backgroundSkillData?.skills.map(skill => (
            <li key={skill} style={{ padding: '4px 0', color: '#ddd' }}>✓ {skill} (Trained)</li>
          ))}
          <li style={{ padding: '4px 0', color: '#ddd' }}>✓ {backgroundSkillData?.lore} (Trained)</li>
        </ul>
      </div>

      {/* Class Auto-Trained Skills */}
      {classSkillData && (classSkillData.autoTrained.length > 0 || classSkillData.choiceTrained || (character.class === 'Rogue' && character.rogueRacket)) && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(50, 50, 100, 0.15)', borderRadius: '8px', border: '1px solid rgba(100, 100, 200, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#87ceeb' }}>Class Training — {character.class}</h3>

          {/* Auto-trained */}
          {classSkillData.autoTrained.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>Automatically trained:</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {classSkillData.autoTrained.map(skill => (
                  <li key={skill} style={{ padding: '4px 0', color: '#ddd' }}>✓ {skill} (Trained)</li>
                ))}
              </ul>
            </div>
          )}

          {/* Racket-granted skill */}
          {character.class === 'Rogue' && character.rogueRacket && (() => {
            const racket = ROGUE_RACKETS.find(r => r.id === character.rogueRacket);
            if (!racket) return null;
            return (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>From {racket.name} Racket:</p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ padding: '4px 0', color: '#ddd' }}>✓ {racket.trainedSkill} (Trained)</li>
                </ul>
              </div>
            );
          })()}

          {/* Choice-trained (e.g., Fighter: Acrobatics or Athletics) */}
          {classSkillData.choiceTrained && classSkillData.choiceTrained.length > 0 && (
            <div>
              <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
                Choose one skill to train:
              </p>
              {choiceFallback && (
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                  All class choice skills are already trained. Pick any core skill instead.
                </p>
              )}
              <select
                value={character.classAutoSkillChoice}
                onChange={(e) => setCharacter({ ...character, classAutoSkillChoice: e.target.value })}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                <option value="">Select skill...</option>
                {choiceOptions.map(skill => {
                  // Don't mark the currently selected choice skill as "already trained"
                  const isAlreadyTrained = alreadyTrained.has(skill) && skill !== character.classAutoSkillChoice;
                  const disableTrained = !choiceFallback && isAlreadyTrained;
                  return (
                    <option key={skill} value={skill} disabled={disableTrained}>
                      {skill}{isAlreadyTrained ? ' (already trained)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Additional Trained Skills (player choice from any skill) */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(70, 50, 100, 0.15)', borderRadius: '8px', border: '1px solid rgba(140, 100, 200, 0.3)' }}>
        <h3 style={{ marginTop: 0, color: '#c4a6e8' }}>Additional Trained Skills</h3>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '4px' }}>
          Choose {numAdditional} skill{numAdditional !== 1 ? 's' : ''} to become Trained
          <span style={{ fontSize: '12px', color: '#888' }}> ({classSkillData?.additionalPicks ?? 0} base + {intMod >= 0 ? '+' : ''}{intMod} INT modifier)</span>
        </p>
        <p style={{ fontSize: '12px', color: '#777', marginBottom: '12px' }}>
          You can choose from any skill not already trained by your background or class.
          {pickFallback && ' All core skills are already trained, so any core skill is allowed.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Array.from({ length: Math.max(0, numAdditional) }).map((_, idx) => (
            <div key={idx} style={{ minWidth: '200px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>
                Skill {idx + 1}:
              </label>
              <select
                value={character.classSkills[idx] || ''}
                onChange={(e) => {
                  const newSkills = [...character.classSkills];
                  newSkills[idx] = e.target.value;
                  setCharacter({ ...character, classSkills: newSkills });
                }}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                <option value="">Select skill...</option>
                {pickOptions.map(skill => {
                  const isAlreadySelected = character.classSkills.includes(skill) && character.classSkills[idx] !== skill;
                  const isAlreadyTrained = alreadyTrained.has(skill);
                  return (
                    <option key={skill} value={skill} disabled={isAlreadySelected}>
                      {skill}{isAlreadySelected ? ' (selected)' : isAlreadyTrained ? ' (already trained)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Summary — show all trained skills */}
      <div style={{ marginBottom: '24px', padding: '12px 16px', backgroundColor: 'rgba(40, 40, 60, 0.3)', borderRadius: '8px', border: '1px solid rgba(100, 100, 150, 0.3)' }}>
        <h4 style={{ marginTop: 0, color: '#b0b0d0', fontSize: '14px' }}>Trained Skills Summary</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SKILLS.filter(s => s !== 'Lore').map(skill => {
            const isTrained = alreadyTrained.has(skill) || character.classSkills.includes(skill);
            return (
              <span key={skill} style={{
                padding: '3px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                backgroundColor: isTrained ? 'rgba(100, 200, 100, 0.2)' : 'rgba(60, 60, 80, 0.3)',
                color: isTrained ? '#90ee90' : '#666',
                border: `1px solid ${isTrained ? 'rgba(100, 200, 100, 0.4)' : 'rgba(60, 60, 80, 0.3)'}`,
              }}>
                {isTrained ? '✓' : '○'} {skill}
              </span>
            );
          })}
          {backgroundSkillData?.lore && (
            <span style={{
              padding: '3px 8px', fontSize: '12px', borderRadius: '4px',
              backgroundColor: 'rgba(100, 200, 100, 0.2)', color: '#90ee90',
              border: '1px solid rgba(100, 200, 100, 0.4)',
            }}>
              ✓ {backgroundSkillData.lore}
            </span>
          )}
        </div>
      </div>

      {/* Auto-Granted Level 1 Class Features */}
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

      {/* ── Level 1 Class Feats ── */}
      {lv1ClassFeatSlots.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(50, 70, 120, 0.15)', borderRadius: '8px', border: '1px solid rgba(100, 140, 220, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#87ceeb' }}>
            🗡️ Level 1 {character.class} Class Feat
          </h3>
          {lv1ClassFeatSlots.map(slotLevel => renderFeatSlot(
            character,
            slotLevel,
            character.classFeats[slotLevel] || '',
            getSelectableClassFeats(character.class, slotLevel),
            selectedClassFeatIds,
            (id) => setCharacter({ ...character, classFeats: { ...character.classFeats, [slotLevel]: id } }),
            '#87ceeb',
            (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
          ))}
        </div>
      )}

      {/* ── Level 1 Ancestry Feats ── */}
      {lv1AncestryFeatSlots.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(120, 80, 40, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 140, 60, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#f4a460' }}>
            🌿 Level 1 Ancestry Feat — {character.ancestry}{character.heritageType === 'versatile' ? ` / ${character.heritage}` : ''}
            {character.optionalRules.ancestryParagon && <span style={{ fontSize: '12px', color: '#f4a460', opacity: 0.7, marginLeft: '8px' }}>(+Paragon)</span>}
          </h3>
          {lv1AncestryFeatSlots.map(slotLevel => renderFeatSlot(
            character,
            slotLevel,
            character.ancestryFeats[slotLevel] || '',
            getSelectableAncestryFeats(character.ancestry, Math.floor(slotLevel), character.heritageType === 'versatile' ? character.heritage : undefined),
            selectedAncestryFeatIds,
            (id) => {
              const updates: any = { ...character, ancestryFeats: { ...character.ancestryFeats, [slotLevel]: id } };
              // Clear bonus feat selections if the granting feat is deselected
              if (character.ancestryFeats[slotLevel] === 'natural-ambition' && id !== 'natural-ambition') {
                updates.ancestryBonusClassFeat = '';
              }
              if (character.ancestryFeats[slotLevel] === 'general-training' && id !== 'general-training') {
                updates.ancestryBonusGeneralFeat = '';
              }
              setCharacter(updates);
            },
            '#f4a460',
            (featId, choiceId) => setCharacter({ ...character, featSubChoices: { ...character.featSubChoices, [featId]: choiceId } }),
          ))}

          {/* Natural Ambition: bonus 1st-level class feat picker */}
          {hasNaturalAmbition && (
            <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: 'rgba(50, 70, 120, 0.2)', borderRadius: '6px', border: '1px solid rgba(100, 140, 220, 0.4)', borderLeft: '3px solid #87ceeb' }}>
              <div style={{ fontSize: '13px', color: '#87ceeb', fontWeight: 'bold', marginBottom: '8px' }}>
                ⭐ Natural Ambition — Bonus 1st-Level {character.class} Class Feat
              </div>
              <select
                value={character.ancestryBonusClassFeat}
                onChange={(e) => setCharacter({ ...character, ancestryBonusClassFeat: e.target.value })}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                <option value="">Select bonus class feat...</option>
                {bonusClassFeats.map(feat => {
                  const isDupe = selectedClassFeatIds.includes(feat.id) || feat.id === character.ancestryBonusClassFeat;
                  return (
                    <option key={feat.id} value={feat.id} disabled={isDupe && feat.id !== character.ancestryBonusClassFeat}>
                      {feat.name} (Lv{feat.level}) — {feat.description.slice(0, 50)}...{isDupe && feat.id !== character.ancestryBonusClassFeat ? ' [taken]' : ''}
                    </option>
                  );
                })}
              </select>
              {character.ancestryBonusClassFeat && (() => {
                const feat = bonusClassFeats.find(f => f.id === character.ancestryBonusClassFeat);
                return feat ? (
                  <div style={{ marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px', fontSize: '12px', color: '#999' }}>
                    {feat.description}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* General Training: bonus 1st-level general feat picker */}
          {hasGeneralTraining && (
            <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: 'rgba(100, 50, 100, 0.2)', borderRadius: '6px', border: '1px solid rgba(180, 100, 180, 0.4)', borderLeft: '3px solid #dda0dd' }}>
              <div style={{ fontSize: '13px', color: '#dda0dd', fontWeight: 'bold', marginBottom: '8px' }}>
                ⭐ General Training — Bonus 1st-Level General Feat
              </div>
              <select
                value={character.ancestryBonusGeneralFeat}
                onChange={(e) => setCharacter({ ...character, ancestryBonusGeneralFeat: e.target.value })}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', minWidth: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                <option value="">Select bonus general feat...</option>
                {bonusGeneralFeats.map(feat => {
                  const isDupe = Object.values(character.generalFeats).includes(feat.id);
                  return (
                    <option key={feat.id} value={feat.id} disabled={isDupe && feat.id !== character.ancestryBonusGeneralFeat}>
                      {feat.name} (Lv{feat.level}) — {feat.description.slice(0, 50)}...{isDupe ? ' [taken]' : ''}
                    </option>
                  );
                })}
              </select>
              {character.ancestryBonusGeneralFeat && (() => {
                const feat = bonusGeneralFeats.find(f => f.id === character.ancestryBonusGeneralFeat);
                return feat ? (
                  <div style={{ marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px', fontSize: '12px', color: '#999' }}>
                    {feat.description}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Level 1 Skill Feats (Rogue) ── */}
      {lv1SkillFeatSlots.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(40, 100, 40, 0.15)', borderRadius: '8px', border: '1px solid rgba(80, 200, 80, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#90ee90' }}>
            📚 Level 1 Skill Feat
          </h3>
          {lv1SkillFeatSlots.map(slotLevel => renderFeatSlot(
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
    </div>
  );
};
