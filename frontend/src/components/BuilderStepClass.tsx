/**
 * Builder Step 3: Class Selection
 * Extracted from CharacterBuilder for maintainability.
 */

import React from 'react';
import {
  BuilderState,
  CLASSES, SUPPORTED_CLASSES,
  ROGUE_RACKETS, DEITIES,
  CONSCIOUS_MINDS, SUBCONSCIOUS_MINDS, HYBRID_STUDIES,
  SORCERER_BLOODLINES,
  WIZARD_ARCANE_SCHOOLS,
  BARBARIAN_INSTINCTS,
  CHAMPION_CAUSES,
  RANGER_HUNTERS_EDGES,
  CLERIC_DOCTRINES,
  getClassBoostOptions,
  CLASS_BOOSTS, ABILITY_LABELS, CLASS_SPELLCASTING,
} from './characterBuilderData';

interface BuilderStepClassProps {
  character: BuilderState;
  setCharacter: (s: BuilderState) => void;
}

export const BuilderStepClass: React.FC<BuilderStepClassProps> = ({ character, setCharacter }) => {
    const selectedRacket = ROGUE_RACKETS.find(r => r.id === character.rogueRacket);

    return (
    <div className="step-content">
      <h2>Choose Your Class</h2>
      
      <div className="form-group">
        <label>Class</label>
        <select 
          value={character.class}
          onChange={(e) => {
            const nextClass = e.target.value;
            const options = getClassBoostOptions(nextClass, '');
            setCharacter({ ...character, class: nextClass, rogueRacket: '', rogueDeity: '', consciousMind: '', subconsciousMind: '', hybridStudy: '', bloodline: '', arcaneSchool: '', instinct: '', championCause: '', huntersEdge: '', doctrine: '', classBoost: options[0], classAutoSkillChoice: '', classSkills: [] });
          }}
          style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          {CLASSES.map(c => {
            const isSupported = (SUPPORTED_CLASSES as readonly string[]).includes(c);
            return <option key={c} value={c}>{c}{isSupported ? '' : ' ⚠'}</option>;
          })}
        </select>
      </div>

      {!(SUPPORTED_CLASSES as readonly string[]).includes(character.class) && character.class && (
        <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: 'rgba(200, 150, 30, 0.15)', borderRadius: '6px', border: '1px solid rgba(200, 170, 40, 0.4)', color: '#ffd700', fontSize: '14px' }}>
          ⚠ <strong>{character.class}</strong> is not yet fully implemented. The builder will use default proficiencies and progression. Supported classes: {(SUPPORTED_CLASSES as readonly string[]).join(', ')}.
        </div>
      )}

      <p className="flavor-text">
        Your class defines your role in combat and determines your abilities and progression.
        Each class has unique mechanics and feats.
      </p>

      {/* Rogue Racket Selection */}
      {character.class === 'Rogue' && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(100, 85, 20, 0.15)', borderRadius: '8px', border: '1px solid rgba(200, 170, 40, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#ffd700' }}>Rogue's Racket</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Choose your racket — it determines your key ability and grants unique combat benefits.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ROGUE_RACKETS.map(racket => {
              const isSelected = character.rogueRacket === racket.id;
              return (
                <div
                  key={racket.id}
                  onClick={() => {
                    const options = getClassBoostOptions('Rogue', racket.id);
                    const nextBoost = options.includes(character.classBoost) ? character.classBoost : options[0];
                    setCharacter({ ...character, rogueRacket: racket.id, classBoost: nextBoost });
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(200, 170, 40, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #ffd700' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#ffd700' : '#e0e0e0' }}>
                      {racket.name}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(100,100,200,0.2)', color: '#aac' }}>
                      Key: {racket.keyAbility}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(100,200,100,0.15)', color: '#90ee90' }}>
                      +{racket.trainedSkill}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{racket.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#d4af37' : '#888', margin: 0 }}>
                    <strong>Benefit:</strong> {racket.benefit}
                  </p>
                </div>
              );
            })}
          </div>

          {selectedRacket && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(200, 170, 40, 0.1)', borderRadius: '6px', borderLeft: '3px solid #ffd700' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#d4af37' }}>
                <strong>Selected:</strong> {selectedRacket.name} — You are trained in <strong>{selectedRacket.trainedSkill}</strong> and your key ability is <strong>{selectedRacket.keyAbility}</strong>.
              </p>
            </div>
          )}

          {/* Deity picker for Avenger racket */}
          {character.rogueRacket === 'avenger' && (
            <div style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: 'rgba(100, 60, 120, 0.15)', borderRadius: '6px', border: '1px solid rgba(180, 120, 200, 0.3)' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#c4a6e8', marginBottom: '8px', fontWeight: 'bold' }}>
                Choose Your Deity
              </label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                Your deity determines your favored weapon, which you can use for sneak attacks.
              </p>
              <select
                value={character.rogueDeity}
                onChange={(e) => setCharacter({ ...character, rogueDeity: e.target.value })}
                style={{ padding: '8px 10px', fontSize: '14px', backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0', border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                <option value="">Select deity...</option>
                {DEITIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Psychic Conscious Mind Selection */}
      {character.class === 'Psychic' && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(80, 40, 120, 0.15)', borderRadius: '8px', border: '1px solid rgba(160, 100, 220, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#c084fc' }}>Conscious Mind</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Your conscious mind determines your unique psi cantrip — a powerful cantrip you can amp by spending focus points.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CONSCIOUS_MINDS.map(mind => {
              const isSelected = character.consciousMind === mind.id;
              return (
                <div
                  key={mind.id}
                  onClick={() => setCharacter({ ...character, consciousMind: mind.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(160, 100, 220, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #c084fc' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#c084fc' : '#e0e0e0' }}>
                      {mind.name}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(160,100,220,0.2)', color: '#c9a6f0' }}>
                      Cantrip: {mind.grantedCantrips.join(', ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{mind.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#c084fc' : '#888', margin: 0 }}>
                    <strong>Benefit:</strong> {mind.benefit}
                  </p>
                </div>
              );
            })}
          </div>

          {character.consciousMind && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(160, 100, 220, 0.1)', borderRadius: '6px', borderLeft: '3px solid #c084fc' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#c084fc' }}>
                <strong>Selected:</strong> {CONSCIOUS_MINDS.find(m => m.id === character.consciousMind)?.name}
              </p>
            </div>
          )}

          {/* Subconscious Mind */}
          <h3 style={{ marginTop: '20px', color: '#a78bfa' }}>Subconscious Mind</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Your subconscious mind provides instinctual power and determines your key spellcasting ability modifier for spell DCs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SUBCONSCIOUS_MINDS.map(mind => {
              const isSelected = character.subconsciousMind === mind.id;
              return (
                <div
                  key={mind.id}
                  onClick={() => setCharacter({ ...character, subconsciousMind: mind.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(120, 80, 200, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #a78bfa' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#a78bfa' : '#e0e0e0' }}>
                      {mind.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{mind.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#a78bfa' : '#888', margin: 0 }}>
                    <strong>Benefit:</strong> {mind.benefit}
                  </p>
                </div>
              );
            })}
          </div>

          {character.subconsciousMind && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(120, 80, 200, 0.1)', borderRadius: '6px', borderLeft: '3px solid #a78bfa' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#a78bfa' }}>
                <strong>Selected:</strong> {SUBCONSCIOUS_MINDS.find(m => m.id === character.subconsciousMind)?.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Magus Hybrid Study Selection */}
      {character.class === 'Magus' && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(180, 100, 60, 0.15)', borderRadius: '8px', border: '1px solid rgba(220, 140, 80, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#e8956b' }}>Hybrid Study</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Your hybrid study combines spell and weapon combat into a unique fighting technique. It grants a special ability, conflux spell, and determines your approach to spellcasting.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {HYBRID_STUDIES.map(study => {
              const isSelected = character.hybridStudy === study.id;
              return (
                <div
                  key={study.id}
                  onClick={() => setCharacter({ ...character, hybridStudy: study.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(220, 140, 80, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #e8956b' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#e8956b' : '#e0e0e0' }}>
                      {study.name}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(220,140,80,0.2)', color: '#f0b896' }}>
                      Focus: {study.confluxSpell.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{study.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#e8956b' : '#888', margin: 0 }}>
                    <strong>Benefit:</strong> {study.benefit}
                  </p>
                </div>
              );
            })}
          </div>

          {character.hybridStudy && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(220, 140, 80, 0.1)', borderRadius: '6px', borderLeft: '3px solid #e8956b' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#e8956b' }}>
                <strong>Selected:</strong> {HYBRID_STUDIES.find(s => s.id === character.hybridStudy)?.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* SORCERER BLOODLINE SELECTION */}
      {character.class === 'Sorcerer' && (
        <div style={{ marginTop: '16px', padding: '15px', backgroundColor: 'rgba(140, 60, 160, 0.15)', borderRadius: '8px', border: '1px solid rgba(180, 100, 200, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#c88be8' }}>Bloodline</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Your bloodline is the source of your sorcerous power — a magical heritage that shapes your spell tradition, grants bonus spells, and infuses your magic with blood magic effects.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SORCERER_BLOODLINES.map(bl => {
              const isSelected = character.bloodline === bl.id;
              const traditionColors: Record<string, string> = {
                arcane: '#6b8cff',
                divine: '#ffd700',
                occult: '#c88be8',
                primal: '#7bc86c',
              };
              return (
                <div
                  key={bl.id}
                  onClick={() => setCharacter({ ...character, bloodline: bl.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(180, 100, 200, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #c88be8' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#c88be8' : '#e0e0e0' }}>
                      {bl.name}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(100,100,200,0.2)', color: traditionColors[bl.tradition] || '#aaa' }}>
                      {bl.tradition.charAt(0).toUpperCase() + bl.tradition.slice(1)}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(100,180,100,0.15)', color: '#8bc8a0' }}>
                      {bl.trainedSkill}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{bl.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#c88be8' : '#888', margin: '0 0 4px 0' }}>
                    <strong>Blood Magic:</strong> {bl.bloodMagic}
                  </p>
                  <p style={{ fontSize: '11px', color: '#777', margin: 0 }}>
                    <strong>Focus Spells:</strong> {bl.focusSpells.initial} → {bl.focusSpells.advanced} → {bl.focusSpells.greater}
                  </p>
                </div>
              );
            })}
          </div>

          {character.bloodline && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(180, 100, 200, 0.1)', borderRadius: '6px', borderLeft: '3px solid #c88be8' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#c88be8' }}>
                <strong>Selected:</strong> {SORCERER_BLOODLINES.find(b => b.id === character.bloodline)?.name} — {SORCERER_BLOODLINES.find(b => b.id === character.bloodline)?.tradition} tradition
              </p>
            </div>
          )}
        </div>
      )}

      {/* WIZARD ARCANE SCHOOL SELECTION */}
      {character.class === 'Wizard' && (
        <div style={{ marginTop: '16px', padding: '15px', backgroundColor: 'rgba(60, 100, 180, 0.15)', borderRadius: '8px', border: '1px solid rgba(100, 140, 220, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#6b8cff' }}>Arcane School</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Choose your arcane school — the philosophy and specialization that shapes your study of magic. Your school grants curriculum spells, focus spells, and a unique benefit.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {WIZARD_ARCANE_SCHOOLS.map(school => {
              const isSelected = character.arcaneSchool === school.id;
              return (
                <div
                  key={school.id}
                  onClick={() => setCharacter({ ...character, arcaneSchool: school.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(60, 100, 180, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #6b8cff' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#6b8cff' : '#e0e0e0' }}>
                      {school.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{school.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#6b8cff' : '#888', margin: '0 0 4px 0' }}>
                    <strong>Benefit:</strong> {school.benefit}
                  </p>
                  <p style={{ fontSize: '11px', color: '#777', margin: 0 }}>
                    <strong>Focus Spells:</strong> {school.focusSpells.initial} → {school.focusSpells.advanced}
                  </p>
                </div>
              );
            })}
          </div>

          {character.arcaneSchool && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(60, 100, 180, 0.1)', borderRadius: '6px', borderLeft: '3px solid #6b8cff' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b8cff' }}>
                <strong>Selected:</strong> {WIZARD_ARCANE_SCHOOLS.find(s => s.id === character.arcaneSchool)?.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* BARBARIAN INSTINCT SELECTION */}
      {character.class === 'Barbarian' && (
        <div style={{ marginTop: '16px', padding: '15px', backgroundColor: 'rgba(180, 60, 40, 0.15)', borderRadius: '8px', border: '1px solid rgba(220, 100, 80, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#e05a3a' }}>Instinct</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Your rage wells up from a dominant instinct — choose the source that shapes the nature of your fury, determines your rage damage type, and unlocks instinct-specific abilities.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {BARBARIAN_INSTINCTS.map(inst => {
              const isSelected = character.instinct === inst.id;
              return (
                <div
                  key={inst.id}
                  onClick={() => setCharacter({ ...character, instinct: inst.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(180, 60, 40, 0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #e05a3a' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#e05a3a' : '#e0e0e0' }}>
                      {inst.name}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(200,80,60,0.2)', color: '#e88a6e' }}>
                      {inst.rageDamageType.split(' ')[0]}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{inst.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#e05a3a' : '#888', margin: '0 0 4px 0' }}>
                    <strong>Instinct Ability:</strong> {inst.instinctAbility}
                  </p>
                  <p style={{ fontSize: '11px', color: '#777', margin: '0 0 2px 0' }}>
                    <strong>Anathema:</strong> {inst.anathema}
                  </p>
                </div>
              );
            })}
          </div>

          {character.instinct && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(180, 60, 40, 0.1)', borderRadius: '6px', borderLeft: '3px solid #e05a3a' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#e05a3a' }}>
                <strong>Selected:</strong> {BARBARIAN_INSTINCTS.find(i => i.id === character.instinct)?.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CHAMPION CAUSE SELECTION */}
      {character.class === 'Champion' && (
        <div style={{ marginTop: '16px', padding: '15px', backgroundColor: 'rgba(180, 160, 40, 0.12)', borderRadius: '8px', border: '1px solid rgba(220, 200, 60, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#d4af37' }}>Cause</h3>
          <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '12px' }}>
            Your cause determines your Champion&apos;s Reaction, the special reaction you can use in battle to protect your allies. Each cause also adds a tenet to your champion&apos;s code.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CHAMPION_CAUSES.map(cause => {
              const isSelected = character.championCause === cause.id;
              return (
                <div
                  key={cause.id}
                  onClick={() => setCharacter({ ...character, championCause: cause.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(180, 160, 40, 0.12)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #d4af37' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#d4af37' : '#e0e0e0' }}>
                      {cause.name}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: 'rgba(212,175,55,0.2)', color: '#e8c85e' }}>
                      {cause.reactionName}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{cause.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#d4af37' : '#888', margin: '0 0 4px 0' }}>
                    <strong>Reaction:</strong> {cause.reaction}
                  </p>
                  <p style={{ fontSize: '11px', color: '#777', margin: '0 0 2px 0' }}>
                    <strong>Tenet:</strong> {cause.tenet}
                  </p>
                </div>
              );
            })}
          </div>

          {character.championCause && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(180, 160, 40, 0.08)', borderRadius: '6px', borderLeft: '3px solid #d4af37' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#d4af37' }}>
                <strong>Selected:</strong> {CHAMPION_CAUSES.find(c => c.id === character.championCause)?.name} — {CHAMPION_CAUSES.find(c => c.id === character.championCause)?.reactionName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* RANGER HUNTER'S EDGE SELECTION */}
      {character.class === 'Ranger' && (
        <div style={{ marginTop: '16px', padding: '15px', backgroundColor: 'rgba(40, 120, 60, 0.12)', borderRadius: '8px', border: '1px solid rgba(60, 160, 80, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#4caf50' }}>Hunter&apos;s Edge</h3>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
            Your hunter&apos;s edge represents your specialized training for hunting prey. Choose one edge that determines your combat style.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RANGER_HUNTERS_EDGES.map(edge => {
              const isSelected = character.huntersEdge === edge.id;
              return (
                <div
                  key={edge.id}
                  onClick={() => setCharacter({ ...character, huntersEdge: edge.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(40, 120, 60, 0.12)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #4caf50' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#4caf50' : '#e0e0e0' }}>
                      {edge.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{edge.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#4caf50' : '#888', margin: '0 0 4px 0' }}>
                    <strong>Benefit:</strong> {edge.benefit}
                  </p>
                  <p style={{ fontSize: '11px', color: '#777', margin: '0 0 2px 0' }}>
                    <strong>Masterful Hunter (L17):</strong> {edge.masterfulUpgrade}
                  </p>
                </div>
              );
            })}
          </div>

          {character.huntersEdge && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(40, 120, 60, 0.08)', borderRadius: '6px', borderLeft: '3px solid #4caf50' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#4caf50' }}>
                <strong>Selected:</strong> {RANGER_HUNTERS_EDGES.find(e => e.id === character.huntersEdge)?.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CLERIC DOCTRINE SELECTION */}
      {character.class === 'Cleric' && (
        <div style={{ marginTop: '16px', padding: '15px', backgroundColor: 'rgba(60, 80, 160, 0.12)', borderRadius: '8px', border: '1px solid rgba(80, 110, 200, 0.3)' }}>
          <h3 style={{ marginTop: 0, color: '#7baaf7' }}>Doctrine</h3>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
            Your doctrine determines the manner of your devotion and shapes your divine abilities. Choose a doctrine that defines your path.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CLERIC_DOCTRINES.map(doc => {
              const isSelected = character.doctrine === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setCharacter({ ...character, doctrine: doc.id })}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: isSelected ? 'rgba(60, 80, 160, 0.12)' : 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #7baaf7' : '1px solid rgba(100, 100, 150, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: isSelected ? '#7baaf7' : '#e0e0e0' }}>
                      {doc.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px 0', fontStyle: 'italic' }}>{doc.description}</p>
                  <p style={{ fontSize: '12px', color: isSelected ? '#7baaf7' : '#888', margin: '0 0 4px 0' }}>
                    <strong>Benefit:</strong> {doc.benefit}
                  </p>
                  <p style={{ fontSize: '11px', color: '#777', margin: '0 0 2px 0' }}>
                    <strong>Spell Proficiency:</strong> {doc.spellProgression}
                  </p>
                </div>
              );
            })}
          </div>

          {character.doctrine && (
            <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(60, 80, 160, 0.08)', borderRadius: '6px', borderLeft: '3px solid #7baaf7' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#7baaf7' }}>
                <strong>Selected:</strong> {CLERIC_DOCTRINES.find(d => d.id === character.doctrine)?.name}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
    );
};
