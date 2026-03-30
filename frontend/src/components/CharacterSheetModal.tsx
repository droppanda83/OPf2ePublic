import React, { useState, useRef } from 'react';
import type { Creature } from '../../../shared/types';
import { XP_PER_LEVEL } from '../../../shared/types';
import { SPELL_CATALOG } from '../../../shared/spells';
import { ARMOR_CATALOG } from '../../../shared/armor';
import './CharacterSheetModal.css';

interface CharacterSheetModalProps {
  creature: Creature | null;
  isOpen: boolean;
  onClose: () => void;
  /** Optional callback to persist creature mutations (spell slot usage, preparation changes) */
  onCreatureUpdate?: (updatedCreature: Creature) => void;
  /** Optional callback to trigger level-up wizard for this creature */
  onLevelUp?: (creature: Creature) => void;
}

type TabType = 'main' | 'skills' | 'spells' | 'combat' | 'feats';

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
  creature,
  isOpen,
  onClose,
  onCreatureUpdate,
  onLevelUp,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('main');
  const [editMode, setEditMode] = useState(false);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !creature) return null;

  // ─── Edit helpers ────────────────────────────────
  const canEdit = isPlayerCharacter && !!onCreatureUpdate;
  const update = (patch: Partial<Creature>) => {
    if (onCreatureUpdate) onCreatureUpdate({ ...creature, ...patch });
  };

  // ─── Image Upload Handlers ───────────────────────
  const isPlayerCharacter = creature.type === 'player';
  const canEditImages = isPlayerCharacter && !!onCreatureUpdate;

  const handleImageUpload = (file: File, field: 'tokenImageUrl' | 'portraitImageUrl', maxSizeMB: number) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Image must be under ${maxSizeMB}MB`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl && onCreatureUpdate) {
        onCreatureUpdate({ ...creature, [field]: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (field: 'tokenImageUrl' | 'portraitImageUrl') => {
    if (onCreatureUpdate) {
      onCreatureUpdate({ ...creature, [field]: undefined });
    }
  };

  // Debug logging - ALWAYS log when modal is open
  console.log('[CharacterSheetModal] Modal opened with creature:', {
    name: creature.name,
    skills: creature.skills,
    skillsLength: creature.skills?.length,
    spells: creature.spells,
    spellsLength: creature.spells?.length,
    feats: creature.feats?.slice(0, 2),
    featsLength: creature.feats?.length,
  });
  console.log('[CharacterSheetModal] Full creature object keys:', Object.keys(creature));
  console.log('[CharacterSheetModal] creature.focusSpells exists?:', creature.focusSpells);
  console.log('[CharacterSheetModal] creature.focusSpells value:', creature.focusSpells);

  const getAbilityModifier = (name: string) => {
    const modifiers: Record<string, number> = {
      strength: creature.abilities?.strength ?? 0,
      dexterity: creature.abilities?.dexterity ?? 0,
      constitution: creature.abilities?.constitution ?? 0,
      intelligence: creature.abilities?.intelligence ?? 0,
      wisdom: creature.abilities?.wisdom ?? 0,
      charisma: creature.abilities?.charisma ?? 0,
    };
    return modifiers[name] ?? 0;
  };

  const abilities = [
    { name: 'STR', key: 'strength' },
    { name: 'DEX', key: 'dexterity' },
    { name: 'CON', key: 'constitution' },
    { name: 'INT', key: 'intelligence' },
    { name: 'WIS', key: 'wisdom' },
    { name: 'CHA', key: 'charisma' },
  ];

  const formatBonus = (value: number): string => {
    return value >= 0 ? `+${value}` : `${value}`;
  };

  const profRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      untrained: '#666666',
      trained: '#b0b0cc',
      expert: '#4fc3f7',
      master: '#ffd700',
      legendary: '#ff5722',
    };
    return colors[rank] || '#666666';
  };

  // Group skills by ability
  const skillsByAbility = () => {
    const grouped: Record<string, typeof creature.skills> = {};
    const abilityNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const skillAbilityMap: Record<string, string> = {
      'Athletics': 'STR',
      'Acrobatics': 'DEX',
      'Stealth': 'DEX',
      'Thievery': 'DEX',
      'Arcana': 'INT',
      'Crafting': 'INT',
      'Occultism': 'INT',
      'Society': 'INT',
      'Medicine': 'WIS',
      'Nature': 'WIS',
      'Religion': 'WIS',
      'Survival': 'WIS',
      'Deception': 'CHA',
      'Diplomacy': 'CHA',
      'Intimidation': 'CHA',
      'Performance': 'CHA',
    };

    for (const ability of abilityNames) {
      grouped[ability] = [];
    }

    if (creature.skills) {
      for (const skill of creature.skills) {
        const ability = skillAbilityMap[skill.name] || 'CHA';
        grouped[ability]?.push(skill);
      }
    }

    return grouped;
  };

  // Group feats by type
  const featsByType = () => {
    const grouped: Record<string, typeof creature.feats> = {};
    if (creature.feats) {
      for (const feat of creature.feats) {
        const type = feat.type || 'General';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        const featArray = grouped[type];
        if (featArray) {
          featArray.push(feat);
        }
      }
    }
    return grouped;
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Character Sheet" onClick={onClose}>
      <div className="character-sheet-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Clickable avatar area for player characters */}
            <div
              className={`sheet-avatar ${canEditImages ? 'editable' : ''}`}
              role={canEditImages ? 'button' : undefined}
              tabIndex={canEditImages ? 0 : undefined}
              onClick={canEditImages ? () => portraitInputRef.current?.click() : undefined}
              onKeyDown={canEditImages ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); portraitInputRef.current?.click(); } } : undefined}
              title={canEditImages ? 'Click to upload portrait' : undefined}
              aria-label={canEditImages ? 'Upload portrait' : undefined}
              style={{
                width: '56px',
                height: creature.portraitImageUrl ? '75px' : '56px',
                flexShrink: 0,
                position: 'relative',
                cursor: canEditImages ? 'pointer' : 'default',
              }}
            >
              {creature.portraitImageUrl ? (
                <img 
                  src={creature.portraitImageUrl} 
                  alt={creature.name}
                  style={{
                    width: '56px',
                    height: '75px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '2px solid rgba(212, 175, 55, 0.5)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                  }}
                />
              ) : creature.tokenImageUrl ? (
                <img 
                  src={creature.tokenImageUrl} 
                  alt={creature.name}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(212, 175, 55, 0.5)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                  }}
                />
              ) : canEditImages ? (
                <div style={{
                  width: '56px',
                  height: '75px',
                  borderRadius: '8px',
                  border: '2px dashed rgba(212, 175, 55, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: 'rgba(212, 175, 55, 0.5)',
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  📷
                </div>
              ) : null}
              {canEditImages && (creature.portraitImageUrl || creature.tokenImageUrl) && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  border: '1px solid rgba(212,175,55,0.5)',
                }}>
                  ✏️
                </div>
              )}
            </div>
            {/* Hidden file inputs */}
            <input
              ref={portraitInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'portraitImageUrl', 4);
                e.target.value = '';
              }}
            />
            <input
              ref={tokenInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'tokenImageUrl', 2);
                e.target.value = '';
              }}
            />
            <div>
              <h2 className="sheet-name">{creature.name}</h2>
              {creature.ancestry && (
                <p className="sheet-subtitle">
                  {creature.ancestry} {creature.heritage && `(${creature.heritage})`}
                  {creature.characterClass && ` • ${creature.characterClass}`} • Level {creature.level}
                </p>
              )}
              {(creature.pronouns || creature.age || creature.height || creature.weight) && (
                <p className="sheet-subtitle" style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                  {[creature.pronouns, creature.age ? `Age ${creature.age}` : '', creature.height, creature.weight].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          {((creature.spells && creature.spells.length > 0) || (creature.focusSpells && creature.focusSpells.length > 0) || (creature.spellcasters && creature.spellcasters.length > 0)) && (
            <button
              className={`tab-button ${activeTab === 'spells' ? 'active' : ''}`}
              onClick={() => setActiveTab('spells')}
            >
              Spells
            </button>
          )}
          <button
            className={`tab-button ${activeTab === 'combat' ? 'active' : ''}`}
            onClick={() => setActiveTab('combat')}
          >
            Combat
          </button>
          {creature.feats && creature.feats.length > 0 && (
            <button
              className={`tab-button ${activeTab === 'feats' ? 'active' : ''}`}
              onClick={() => setActiveTab('feats')}
            >
              Feats
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="sheet-content">
          {/* Overview Tab */}
          {activeTab === 'main' && (
            <div className="tab-pane">
              {/* Quick Stats Row */}
              <div className="quick-stats">
                <div className="stat-box large">
                  <div className="stat-label">AC</div>
                  <div className="stat-value">{creature.armorClass}</div>
                </div>
                <div className="stat-box large">
                  <div className="stat-label">HP</div>
                  <div className="stat-value">{creature.currentHealth}/{creature.maxHealth}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Initiative</div>
                  <div className="stat-value">{formatBonus(creature.initiativeBonus || 0)}</div>
                </div>
              </div>

              {/* XP Progress Bar */}
              {creature.type === 'player' && (
                <div className="section xp-section">
                  <h3 className="section-title">Experience Points</h3>
                  <div className="xp-progress-container">
                    <div className="xp-progress-label">
                      <span>{creature.currentXP || 0} / {XP_PER_LEVEL} XP</span>
                      <span>{Math.floor(((creature.currentXP || 0) / XP_PER_LEVEL) * 100)}%</span>
                    </div>
                    <div className="xp-progress-bar">
                      <div
                        className={`xp-progress-fill ${(creature.currentXP || 0) >= XP_PER_LEVEL ? 'xp-level-up' : ''}`}
                        style={{ width: `${Math.min(100, ((creature.currentXP || 0) / XP_PER_LEVEL) * 100)}%` }}
                      />
                    </div>
                    {(creature.currentXP || 0) >= XP_PER_LEVEL && onLevelUp && (
                      <button
                        className="level-up-badge"
                        onClick={() => onLevelUp(creature)}
                        style={{ marginTop: '8px', fontSize: '13px', padding: '6px 16px' }}
                      >
                        ⬆️ Level Up to {creature.level + 1}!
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Token & Portrait Image Management (player characters only) */}
              {canEditImages && (
                <div className="section image-manage-section">
                  <h3 className="section-title">Character Art</h3>
                  <div className="image-manage-row">
                    {/* Battle Token */}
                    <div className="image-manage-card">
                      <label>Battle Token</label>
                      <div
                        className={`image-manage-preview token-shape ${creature.tokenImageUrl ? 'has-image' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => tokenInputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tokenInputRef.current?.click(); } }}
                        title="Click to upload battle token"
                        aria-label="Upload battle token"
                      >
                        {creature.tokenImageUrl ? (
                          <img src={creature.tokenImageUrl} alt="Token" />
                        ) : (
                          <div className="image-manage-placeholder">
                            <span className="upload-icon">🎯</span>
                            <span className="upload-text">Upload</span>
                          </div>
                        )}
                      </div>
                      {creature.tokenImageUrl && (
                        <button
                          className="image-remove-btn"
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage('tokenImageUrl'); }}
                        >
                          Remove
                        </button>
                      )}
                      <span className="image-hint">Shown on grid (2MB max)</span>
                    </div>

                    {/* Portrait */}
                    <div className="image-manage-card">
                      <label>Portrait</label>
                      <div
                        className={`image-manage-preview portrait-shape ${creature.portraitImageUrl ? 'has-image' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => portraitInputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); portraitInputRef.current?.click(); } }}
                        title="Click to upload portrait"
                        aria-label="Upload portrait"
                      >
                        {creature.portraitImageUrl ? (
                          <img src={creature.portraitImageUrl} alt="Portrait" />
                        ) : (
                          <div className="image-manage-placeholder">
                            <span className="upload-icon">🖼️</span>
                            <span className="upload-text">Upload</span>
                          </div>
                        )}
                      </div>
                      {creature.portraitImageUrl && (
                        <button
                          className="image-remove-btn"
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage('portraitImageUrl'); }}
                        >
                          Remove
                        </button>
                      )}
                      <span className="image-hint">Shown in sheets (4MB max)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description (GM Reference) */}
              {creature.description && (
                <div className="section">
                  <h3 className="section-title">Description</h3>
                  <p style={{ color: '#ccc', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: 0 }}>{creature.description}</p>
                </div>
              )}

              {/* Abilities Grid */}
              <div className="section">
                <h3 className="section-title">Ability Scores</h3>
                <div className="abilities-grid">
                  {abilities.map((ability) => (
                    <div key={ability.key} className="ability-box">
                      <div className="ability-abbr">{ability.name}</div>
                      <div className="ability-mod">{formatBonus(getAbilityModifier(ability.key))}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saves */}
              <div className="section">
                <h3 className="section-title">Saving Throws</h3>
                <div className="saves-grid">
                  <div className="save-item">
                    <span>Fortitude</span>
                    <span className="save-rank" style={{ color: profRankColor(creature.proficiencies.fortitude) }}>
                      {creature.proficiencies.fortitude}
                    </span>
                  </div>
                  <div className="save-item">
                    <span>Reflex</span>
                    <span className="save-rank" style={{ color: profRankColor(creature.proficiencies.reflex) }}>
                      {creature.proficiencies.reflex}
                    </span>
                  </div>
                  <div className="save-item">
                    <span>Will</span>
                    <span className="save-rank" style={{ color: profRankColor(creature.proficiencies.will) }}>
                      {creature.proficiencies.will}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Skills - Perception & Lores */}
              {(creature.skills || creature.lores) && (
                <div className="section">
                  <h3 className="section-title">Key Skills</h3>
                  {creature.skills && creature.skills.some(s => s.name === 'Perception') && (
                    <div className="key-skill">
                      <span>Perception:</span>
                      <span className="skill-detail">
                        {formatBonus(creature.skills.find(s => s.name === 'Perception')?.bonus ?? 0)}{' '}
                        <span className="prof-rank" style={{ color: profRankColor(creature.skills.find(s => s.name === 'Perception')?.proficiency ?? 'untrained') }}>
                          ({creature.skills.find(s => s.name === 'Perception')?.proficiency})
                        </span>
                      </span>
                    </div>
                  )}
                  {creature.lores && creature.lores.length > 0 && (
                    <div className="lores-list">
                      {creature.lores.map((lore) => (
                        <div key={lore.name} className="lore-item">
                          <strong>{lore.name}:</strong> {formatBonus(lore.bonus)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="tab-pane">
              {creature.skills && creature.skills.length > 0 ? (
                Object.entries(skillsByAbility()).map(([ability, skills]) =>
                  skills && skills.length > 0 ? (
                    <div key={ability} className="ability-section">
                      <h3 className="ability-header">{ability}</h3>
                      <div className="skills-list">
                        {skills.map((skill) => (
                          <div key={skill.name} className="skill-row-detailed">
                            <div className="skill-header">
                              <span className="skill-name">{skill.name}</span>
                              <span className="skill-rank-badge" style={{ backgroundColor: profRankColor(skill.proficiency) }}>
                                {skill.proficiency.charAt(0).toUpperCase()}
                              </span>
                              <span className="skill-bonus">{formatBonus(skill.bonus)}</span>
                            </div>
                            <div className="skill-breakdown">
                              <span className="breakdown-item">Ability {formatBonus(skill.abilityMod)}</span>
                              <span className="breakdown-separator">+</span>
                              <span className="breakdown-item">Prof {formatBonus(skill.profBonus)}</span>
                              <span className="breakdown-separator">=</span>
                              <span className="breakdown-total">{formatBonus(skill.bonus)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )
              ) : (
                <p className="empty-message">No skills trained.</p>
              )}
            </div>
          )}

          {/* Spells Tab */}
          {activeTab === 'spells' && (
            <div className="tab-pane">
              {/* Focus Spells Section */}
              {creature.focusSpells && creature.focusSpells.length > 0 && (
                <div style={{
                  background: 'rgba(100, 150, 200, 0.1)',
                  border: '1px solid rgba(100, 150, 200, 0.3)',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#ccc',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    margin: '0 0 12px 0',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #444'
                  }}>
                    Focus Spells
                    {(creature.maxFocusPoints || 0) > 0 && (
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'normal',
                        background: 'rgba(100, 150, 200, 0.2)',
                        border: '1px solid rgba(100, 150, 200, 0.4)',
                        borderRadius: '12px',
                        padding: '2px 10px',
                        color: '#8eb8e0'
                      }}>
                        Focus Pool: {creature.focusPoints || 0}/{creature.maxFocusPoints || 0}
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {creature.focusSpells.map((spell, index) => (
                      <div key={index} style={{
                        backgroundColor: 'rgba(100, 150, 200, 0.08)',
                        borderLeft: `3px solid ${spell.type === 'cantrip' ? '#a070d0' : '#6496c8'}`,
                        borderRadius: '4px',
                        padding: '10px 12px',
                        marginBottom: '2px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: 600,
                          color: '#e0e0e0',
                          fontSize: '14px',
                          marginBottom: '4px'
                        }}>
                          <span style={{ color: spell.type === 'cantrip' ? '#a070d0' : '#6496c8', fontSize: '16px' }}>
                            {spell.type === 'cantrip' ? '◈' : '◆'}
                          </span>
                          {spell.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginLeft: '24px'
                        }}>
                          {spell.tradition && (
                            <span style={{
                              fontSize: '11px',
                              textTransform: 'capitalize',
                              background: 'rgba(150, 120, 200, 0.15)',
                              color: '#b898e0',
                              border: '1px solid rgba(150, 120, 200, 0.3)',
                              borderRadius: '3px',
                              padding: '1px 6px'
                            }}>{spell.tradition}</span>
                          )}
                          {spell.type === 'cantrip' ? (
                            <>
                              <span style={{
                                fontSize: '11px',
                                background: 'rgba(80, 180, 80, 0.15)',
                                color: '#70c870',
                                border: '1px solid rgba(80, 180, 80, 0.3)',
                                borderRadius: '3px',
                                padding: '1px 6px'
                              }}>At Will</span>
                              {spell.ampable && (
                                <span style={{
                                  fontSize: '11px',
                                  background: 'rgba(200, 160, 50, 0.15)',
                                  color: '#d4a050',
                                  border: '1px solid rgba(200, 160, 50, 0.3)',
                                  borderRadius: '3px',
                                  padding: '1px 6px'
                                }}>⚡ Amp: 1 Focus Point</span>
                              )}
                            </>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              background: 'rgba(100, 150, 200, 0.15)',
                              color: '#8eb8e0',
                              border: '1px solid rgba(100, 150, 200, 0.3)',
                              borderRadius: '3px',
                              padding: '1px 6px'
                            }}>Cost: 1 Focus Point</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spellcasters Section with Slot Tracking */}
              {creature.spellcasters && creature.spellcasters.length > 0 ? (
                <div className="spellcasting-container">
                  {creature.spellcasters.map((caster, casterIdx) => {
                    const slotsUsed = creature.spellSlotsUsed || {};

                    return (
                      <div key={casterIdx} className="spellcaster-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <h4 className="spellcaster-header" style={{ margin: 0 }}>
                            {caster.tradition.charAt(0).toUpperCase() + caster.tradition.slice(1)} — {caster.castingType}
                          </h4>
                          <button
                            onClick={() => {
                              if (!creature || !onCreatureUpdate) return;
                              const updated = { ...creature, spellSlotsUsed: {} };
                              // Reset all slot availability to max
                              if (updated.spellcasters) {
                                updated.spellcasters = updated.spellcasters.map(c => ({
                                  ...c,
                                  slots: c.slots.map(s => ({ ...s, available: s.max })),
                                }));
                              }
                              onCreatureUpdate(updated);
                            }}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '4px',
                              border: '1px solid rgba(80,180,80,0.4)',
                              background: 'rgba(80,180,80,0.15)',
                              color: '#70c870',
                              cursor: onCreatureUpdate ? 'pointer' : 'not-allowed',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                            disabled={!onCreatureUpdate}
                            title="Reset all spell slots (long rest)"
                          >
                            🌙 Rest — Restore All Slots
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {caster.spellDC != null && <div className="spell-dc" style={{ margin: 0 }}>Spell DC: {caster.spellDC}</div>}
                          {caster.spellAttackBonus != null && <div className="spell-dc" style={{ margin: 0 }}>Spell Attack: +{caster.spellAttackBonus}</div>}
                        </div>

                        {caster.castingType === 'innate' ? (
                          <div className="innate-spells">
                            {caster.spells.map((spell, spellIdx) => (
                              <div key={spellIdx} className="spell-item innate">
                                <span className="spell-name">{spell.name}</span>
                                {spell.usage && <span className="spell-usage">({spell.usage})</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="spells-by-level">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
                              const spellsAtLevel = caster.spells.filter(s => s.level === level);
                              const slot = caster.slots?.find(s => s.level === level);
                              if (spellsAtLevel.length === 0 && (!slot || slot.max === 0)) return null;

                              const used = slotsUsed[level] || 0;
                              const remaining = slot ? slot.available : 0;
                              const isCantrip = level === 0;

                              return (
                                <div key={level} className="spell-level-group" style={{ marginBottom: '12px' }}>
                                  <div className="spell-level-header" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: '4px',
                                    borderBottom: '1px solid #444',
                                    marginBottom: '6px'
                                  }}>
                                    <span style={{ fontWeight: 'bold', color: '#ccc' }}>
                                      {isCantrip ? 'Cantrips' : `Rank ${level}`}
                                    </span>
                                    {/* Slot tracker */}
                                    {!isCantrip && slot && slot.max > 0 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#888', marginRight: '4px' }}>Slots:</span>
                                        {Array.from({ length: slot.max }, (_, i) => {
                                          const isUsed = i < (slot.max - remaining);
                                          return (
                                            <button
                                              key={i}
                                              onClick={() => {
                                                if (!creature || !onCreatureUpdate) return;
                                                const updated = { ...creature };
                                                const newUsed = { ...updated.spellSlotsUsed || {} };
                                                // Toggle this slot
                                                if (isUsed) {
                                                  // Restore this slot
                                                  newUsed[level] = Math.max(0, (newUsed[level] || 0) - 1);
                                                  // Also update the spellcaster slots
                                                  if (updated.spellcasters) {
                                                    updated.spellcasters = updated.spellcasters.map((c, ci) => ci === casterIdx ? {
                                                      ...c,
                                                      slots: c.slots.map(s => s.level === level ? { ...s, available: Math.min(s.max, s.available + 1) } : s)
                                                    } : c);
                                                  }
                                                } else {
                                                  // Use this slot
                                                  newUsed[level] = (newUsed[level] || 0) + 1;
                                                  if (updated.spellcasters) {
                                                    updated.spellcasters = updated.spellcasters.map((c, ci) => ci === casterIdx ? {
                                                      ...c,
                                                      slots: c.slots.map(s => s.level === level ? { ...s, available: Math.max(0, s.available - 1) } : s)
                                                    } : c);
                                                  }
                                                }
                                                updated.spellSlotsUsed = newUsed;
                                                onCreatureUpdate(updated);
                                              }}
                                              title={isUsed ? 'Click to restore slot' : 'Click to mark as used'}
                                              style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                border: `2px solid ${isUsed ? '#666' : '#6496c8'}`,
                                                background: isUsed ? 'rgba(60,60,60,0.3)' : 'rgba(60,120,200,0.3)',
                                                cursor: onCreatureUpdate ? 'pointer' : 'default',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px',
                                                color: isUsed ? '#666' : '#6496c8',
                                              }}
                                              disabled={!onCreatureUpdate}
                                            >
                                              {isUsed ? '✕' : '●'}
                                            </button>
                                          );
                                        })}
                                        <span style={{ fontSize: '11px', color: remaining > 0 ? '#8eb8e0' : '#e06060', marginLeft: '4px' }}>
                                          {remaining}/{slot.max}
                                        </span>
                                      </div>
                                    )}
                                    {isCantrip && (
                                      <span style={{ fontSize: '11px', color: '#70c870' }}>At Will</span>
                                    )}
                                  </div>
                                  <div className="spells-at-level">
                                    {spellsAtLevel.map((spell, spellIdx) => {
                                      const catalogSpell = Object.values(SPELL_CATALOG).find(s => s.name === spell.name);
                                      return (
                                        <div key={spellIdx} className="spell-item" style={{
                                          padding: '6px 10px',
                                          borderLeft: `3px solid ${isCantrip ? '#a070d0' : '#6496c8'}`,
                                          borderRadius: '4px',
                                          background: 'rgba(50,50,60,0.3)',
                                          marginBottom: '4px',
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>
                                              {catalogSpell?.icon || '◆'} {spell.name}
                                              {spell.traits && spell.traits.length > 0 && (
                                                <span className="spell-traits" style={{ fontSize: '10px', color: '#888', marginLeft: '6px' }}>
                                                  [{spell.traits.join(', ')}]
                                                </span>
                                              )}
                                            </span>
                                            {catalogSpell && (
                                              <span style={{ fontSize: '11px', color: '#888' }}>
                                                {catalogSpell.cost}◆ {catalogSpell.damageFormula && `| ${catalogSpell.damageFormula} ${catalogSpell.damageType || ''}`}
                                                {catalogSpell.range > 0 && ` | ${catalogSpell.range * 5}ft`}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {spellsAtLevel.length === 0 && slot && slot.max > 0 && (
                                      <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic', padding: '4px 10px' }}>
                                        No spells {caster.castingType === 'prepared' ? 'prepared' : 'known'} at this rank
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : creature.spells && creature.spells.length > 0 ? (
                <div className="spells-list">
                  {creature.spells.map((spell, index) => (
                    <div key={index} className="spell-item">
                      • {spell}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No spells known</p>
              )}
            </div>
          )}

          {/* Combat Tab */}
          {activeTab === 'combat' && (
            <div className="tab-pane">
              {/* Weapon Inventory */}
              {creature.weaponInventory && creature.weaponInventory.length > 0 ? (
                <div className="combat-section">
                  <h3 className="section-title">Weapon Inventory</h3>
                  {/* Held / Active weapons */}
                  {creature.weaponInventory.filter((s: any) => s.state === 'held' || s.weapon?.isNatural).length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#81c784', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        Active
                      </div>
                      {creature.weaponInventory.filter((s: any) => s.state === 'held' || s.weapon?.isNatural).map((slot: any) => {
                        const w = slot.weapon;
                        return (
                          <div key={w.id} className="weapon-card" style={{ marginBottom: '6px' }}>
                            <div className="weapon-name">
                              {w.attackType === 'ranged' ? '🏹' : '⚔️'} {w.display}
                              {w.isNatural && <span style={{ fontSize: '10px', color: '#81c784', marginLeft: '6px' }}>(Natural)</span>}
                            </div>
                            <div className="weapon-stats">
                              {w.attackBonus !== undefined && (
                                <div className="weapon-stat">
                                  <span className="stat-label">Attack:</span>
                                  <span className="stat-value">{formatBonus(w.attackBonus)}</span>
                                </div>
                              )}
                              <div className="weapon-stat">
                                <span className="stat-label">Damage:</span>
                                <span className="stat-value">{w.damageDice}{w.damageBonus ? formatBonus(w.damageBonus) : ''} {w.damageType}</span>
                              </div>
                              {w.hands > 0 && (
                                <div className="weapon-stat">
                                  <span className="stat-label">Hands:</span>
                                  <span className="stat-value">{w.hands}</span>
                                </div>
                              )}
                              {w.range && w.range > 1 && (
                                <div className="weapon-stat">
                                  <span className="stat-label">Range:</span>
                                  <span className="stat-value">{w.range}</span>
                                </div>
                              )}
                            </div>
                            {w.traits && w.traits.length > 0 && (
                              <div style={{ marginTop: '4px' }}>
                                {w.traits.map((t: string) => (
                                  <span key={t} style={{
                                    fontSize: '10px',
                                    background: 'rgba(79, 195, 247, 0.15)',
                                    color: '#4fc3f7',
                                    border: '1px solid rgba(79, 195, 247, 0.3)',
                                    borderRadius: '3px',
                                    padding: '1px 5px',
                                    marginRight: '4px'
                                  }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Stowed weapons */}
                  {creature.weaponInventory.filter((s: any) => s.state === 'stowed').length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        Stowed
                      </div>
                      {creature.weaponInventory.filter((s: any) => s.state === 'stowed').map((slot: any) => {
                        const w = slot.weapon;
                        return (
                          <div key={w.id} style={{
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            color: '#999',
                            fontSize: '12px'
                          }}>
                            📦 {w.display} — {w.damageDice}{w.damageBonus ? formatBonus(w.damageBonus) : ''} {w.damageType}
                            {w.hands > 0 && ` (${w.hands}H)`}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Dropped weapons */}
                  {creature.weaponInventory.filter((s: any) => s.state === 'dropped').length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        Dropped
                      </div>
                      {creature.weaponInventory.filter((s: any) => s.state === 'dropped').map((slot: any) => (
                        <div key={slot.weapon.id} style={{
                          padding: '4px 10px',
                          color: '#666',
                          fontSize: '12px'
                        }}>
                          ⬇️ {slot.weapon.display} — On the ground
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : creature.weaponDisplay ? (
                /* Legacy fallback for creatures without weaponInventory */
                <div className="combat-section">
                  <h3 className="section-title">Current Weapon</h3>
                  <div className="weapon-card">
                    <div className="weapon-name">{creature.weaponDisplay}</div>
                    <div className="weapon-stats">
                      <div className="weapon-stat">
                        <span className="stat-label">Attack Bonus:</span>
                        <span className="stat-value">{creature.pbAttackBonus ? formatBonus(creature.pbAttackBonus) : 'N/A'}</span>
                      </div>
                      {creature.weaponDamageDice && (
                        <div className="weapon-stat">
                          <span className="stat-label">Damage Dice:</span>
                          <span className="stat-value">{creature.weaponDamageDice}</span>
                        </div>
                      )}
                      {creature.weaponDamageBonus !== undefined && creature.weaponDamageBonus > 0 && (
                        <div className="weapon-stat">
                          <span className="stat-label">Damage Bonus:</span>
                          <span className="stat-value">{formatBonus(creature.weaponDamageBonus)}</span>
                        </div>
                      )}
                      {creature.weaponDamageType && (
                        <div className="weapon-stat">
                          <span className="stat-label">Damage Type:</span>
                          <span className="stat-value">{creature.weaponDamageType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty-message">No weapons available.</p>
              )}

              {/* Proficiency Info */}
              {/* Equipped Armor Details */}
              {creature.equippedArmor && ARMOR_CATALOG[creature.equippedArmor] && (() => {
                const armor = ARMOR_CATALOG[creature.equippedArmor!];
                return (
                  <div className="combat-section" style={{ marginBottom: '12px' }}>
                    <h3 className="section-title">Equipped Armor</h3>
                    <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: '#e0e0e0', marginBottom: '4px' }}>
                        🛡️ {armor.name}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#bbb' }}>
                        <span>AC +{armor.acBonus}</span>
                        <span>DEX Cap {armor.dexCap ?? '∞'}</span>
                        <span>Category: {armor.category}</span>
                        {armor.checkPenalty ? <span>Check –{armor.checkPenalty}</span> : null}
                        {armor.speedPenalty ? <span>Speed –{armor.speedPenalty} ft</span> : null}
                      </div>
                      {armor.traits && armor.traits.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          {armor.traits.map((t: string) => (
                            <span key={t} style={{
                              fontSize: '10px',
                              background: 'rgba(79, 195, 247, 0.15)',
                              color: '#4fc3f7',
                              border: '1px solid rgba(79, 195, 247, 0.3)',
                              borderRadius: '3px',
                              padding: '1px 5px',
                              marginRight: '4px'
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="proficiency-section">
                <h3 className="section-title">Combat Proficiencies</h3>
                <div className="prof-grid">
                  <div className="prof-item">
                    <span>Martial Weapons</span>
                    <span className="prof-rank" style={{ color: profRankColor(creature.proficiencies.martialWeapons) }}>
                      {creature.proficiencies.martialWeapons}
                    </span>
                  </div>
                  <div className="prof-item">
                    <span>Unarmed Attacks</span>
                    <span className="prof-rank" style={{ color: profRankColor(creature.proficiencies.martialWeapons) }}>
                      {creature.proficiencies.martialWeapons}
                    </span>
                  </div>
                  <div className="prof-item">
                    <span>Heavy Armor</span>
                    <span className="prof-rank" style={{ color: profRankColor(creature.proficiencies.heavyArmor) }}>
                      {creature.proficiencies.heavyArmor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feats Tab */}
          {activeTab === 'feats' && creature.feats && creature.feats.length > 0 && (
            <div className="tab-pane">
              {Object.entries(featsByType()).map(([type, feats]) =>
                feats && feats.length > 0 ? (
                  <div key={type} className="feat-group">
                    <h3 className="feat-type-label">{type}</h3>
                    <div className="feats-list">
                      {feats.map((feat) => (
                        <div key={feat.name} className="feat-item">
                          <span className="feat-name">{feat.name}</span>
                          {feat.level && feat.level > 1 && (
                            <span className="feat-level">Level {feat.level}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
