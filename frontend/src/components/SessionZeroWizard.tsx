import React, { useState, useCallback } from 'react';
import type { CampaignTone, PacingSetting } from '../../../shared/types';
import './SessionZeroWizard.css';

export interface SessionZeroInput {
  campaignName: string;
  tone: CampaignTone;
  themes: string[];
  customTheme: string;
  pacing: PacingSetting;
  lootLevel: 'low' | 'standard' | 'high';
  companionAI: 'full' | 'assisted' | 'manual';
  narrationVerbosity: 'brief' | 'standard' | 'detailed' | 'elaborate';
  encounterBalance: string;
  customNotes: string;
  ruleCitations: boolean;
  playerCount: number;
  averageLevel: number;
}

interface SessionZeroWizardProps {
  onComplete: (input: SessionZeroInput) => void;
  onCancel: () => void;
  loading?: boolean;
  playerCount?: number;
  averageLevel?: number;
}

const TONES: { id: CampaignTone; label: string; icon: string; desc: string }[] = [
  { id: 'heroic', label: 'Heroic', icon: '⚔️', desc: 'Classic adventure with bold heroes and rising stakes' },
  { id: 'gritty', label: 'Gritty', icon: '🩸', desc: 'Dark and dangerous — survival is an achievement' },
  { id: 'horror', label: 'Horror', icon: '👻', desc: 'Creeping dread, sanity-testing encounters, and the unknown' },
  { id: 'mystery', label: 'Mystery', icon: '🔍', desc: 'Clues, intrigue, and hidden truths drive the narrative' },
  { id: 'political', label: 'Political', icon: '👑', desc: 'Courtly intrigue, alliances, and power struggles' },
  { id: 'dungeon-crawl', label: 'Dungeon Crawl', icon: '🏰', desc: 'Room-by-room exploration, traps, and treasure' },
  { id: 'sandbox', label: 'Sandbox', icon: '🗺️', desc: 'Player-driven exploration of an open world' },
  { id: 'lighthearted', label: 'Lighthearted', icon: '🎉', desc: 'Fun-first adventures with humor and whimsy' },
];

const THEMES: string[] = [
  'adventure', 'exploration', 'mystery', 'horror', 'war', 'political intrigue',
  'heist', 'survival', 'redemption', 'revenge', 'discovery', 'undead',
  'dragons', 'fey', 'planar', 'urban', 'wilderness', 'maritime',
];

const PACING_OPTIONS: { id: PacingSetting; label: string; desc: string }[] = [
  { id: 'slow', label: 'Slow Burn', desc: 'Lots of RP and exploration between encounters' },
  { id: 'moderate', label: 'Moderate', desc: 'Balanced mix of encounters and story' },
  { id: 'fast', label: 'Fast', desc: 'Frequent encounters with streamlined downtime' },
  { id: 'varied', label: 'Varied', desc: 'AI adapts pace to narrative tension' },
];

const ENCOUNTER_OPTIONS = [
  { id: 'trivial', label: 'Story-First', desc: 'Very forgiving — narrative stays central' },
  { id: 'low', label: 'Story-Lite', desc: 'Gentle challenge with low lethality' },
  { id: 'moderate', label: 'Adventurous', desc: 'Balanced challenge with tactical play' },
  { id: 'severe', label: 'Perilous', desc: 'Consistently dangerous encounters' },
  { id: 'extreme', label: 'Brutal', desc: 'High-risk — requires optimized play' },
];

type Step = 'name' | 'tone' | 'themes' | 'pacing' | 'settings' | 'review';
const STEPS: Step[] = ['name', 'tone', 'themes', 'pacing', 'settings', 'review'];

export const SessionZeroWizard: React.FC<SessionZeroWizardProps> = ({
  onComplete,
  onCancel,
  loading,
  playerCount = 1,
  averageLevel = 1,
}) => {
  const [step, setStep] = useState<Step>('name');
  const [input, setInput] = useState<SessionZeroInput>({
    campaignName: '',
    tone: 'heroic',
    themes: ['adventure', 'exploration'],
    customTheme: '',
    pacing: 'moderate',
    lootLevel: 'standard',
    companionAI: 'full',
    narrationVerbosity: 'standard',
    encounterBalance: 'moderate',
    customNotes: '',
    ruleCitations: true,
    playerCount,
    averageLevel,
  });

  const stepIdx = STEPS.indexOf(step);
  const canNext = step === 'name' ? input.campaignName.trim().length > 0 : true;
  const isLast = step === 'review';

  const next = () => {
    if (isLast) {
      onComplete(input);
      return;
    }
    setStep(STEPS[stepIdx + 1]);
  };

  const prev = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  };

  const toggleTheme = useCallback((theme: string) => {
    setInput(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme],
    }));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canNext) next();
  };

  return (
    <div className="session-zero-overlay" onKeyDown={handleKeyDown}>
      <div className="session-zero-wizard">
        <div className="sz-header">
          <h2>Session Zero</h2>
          <span className="sz-subtitle">Configure your campaign before the adventure begins</span>
          <button className="sz-close" onClick={onCancel} title="Cancel">✕</button>
        </div>

        {/* Progress */}
        <div className="sz-progress">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`sz-progress-dot ${i < stepIdx ? 'completed' : i === stepIdx ? 'current' : ''}`}
              onClick={() => { if (i < stepIdx) setStep(s); }}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="sz-body">
          {step === 'name' && (
            <div className="sz-step">
              <h3>Name Your Campaign</h3>
              <input
                className="sz-text-input"
                type="text"
                placeholder="e.g., The Crimson Throne, Otari Adventures..."
                value={input.campaignName}
                onChange={e => setInput({ ...input, campaignName: e.target.value })}
                autoFocus
                maxLength={80}
              />
              <div className="sz-hint">Choose a memorable name for your solo adventure</div>
            </div>
          )}

          {step === 'tone' && (
            <div className="sz-step">
              <h3>Campaign Tone</h3>
              <div className="sz-tone-grid">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    className={`sz-tone-card ${input.tone === t.id ? 'selected' : ''}`}
                    onClick={() => setInput({ ...input, tone: t.id })}
                  >
                    <span className="sz-tone-icon">{t.icon}</span>
                    <span className="sz-tone-label">{t.label}</span>
                    <span className="sz-tone-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'themes' && (
            <div className="sz-step">
              <h3>Story Themes</h3>
              <div className="sz-hint">Select themes that interest you (pick as many as you like)</div>
              <div className="sz-theme-grid">
                {THEMES.map(theme => (
                  <button
                    key={theme}
                    className={`sz-theme-tag ${input.themes.includes(theme) ? 'selected' : ''}`}
                    onClick={() => toggleTheme(theme)}
                  >
                    {theme}
                  </button>
                ))}
              </div>
              <input
                className="sz-text-input"
                type="text"
                placeholder="Add a custom theme..."
                value={input.customTheme}
                onChange={e => setInput({ ...input, customTheme: e.target.value })}
                style={{ marginTop: 12 }}
              />
            </div>
          )}

          {step === 'pacing' && (
            <div className="sz-step">
              <h3>Encounter & Pacing</h3>
              <div className="sz-subsection">
                <h4>Pacing</h4>
                <div className="sz-option-list">
                  {PACING_OPTIONS.map(p => (
                    <button
                      key={p.id}
                      className={`sz-option-btn ${input.pacing === p.id ? 'selected' : ''}`}
                      onClick={() => setInput({ ...input, pacing: p.id })}
                    >
                      <strong>{p.label}</strong>
                      <span>{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="sz-subsection">
                <h4>Encounter Difficulty</h4>
                <div className="sz-option-list">
                  {ENCOUNTER_OPTIONS.map(e => (
                    <button
                      key={e.id}
                      className={`sz-option-btn ${input.encounterBalance === e.id ? 'selected' : ''}`}
                      onClick={() => setInput({ ...input, encounterBalance: e.id })}
                    >
                      <strong>{e.label}</strong>
                      <span>{e.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'settings' && (
            <div className="sz-step">
              <h3>AI & Game Settings</h3>

              <div className="sz-subsection">
                <h4>AI GM Mode</h4>
                <div className="sz-radio-group">
                  {[
                    { id: 'full', label: 'Full AI GM', desc: 'AI controls all GM duties' },
                    { id: 'assisted', label: 'Assisted', desc: 'AI suggests, you approve' },
                    { id: 'manual', label: 'Manual', desc: 'AI off — you run everything' },
                  ].map(opt => (
                    <label key={opt.id} className={`sz-radio ${input.companionAI === opt.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="companionAI"
                        checked={input.companionAI === opt.id}
                        onChange={() => setInput({ ...input, companionAI: opt.id })}
                      />
                      <div>
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sz-subsection">
                <h4>Narration Verbosity</h4>
                <div className="sz-radio-group">
                  {[
                    { id: 'brief', label: 'Brief', desc: '1-2 sentences' },
                    { id: 'standard', label: 'Standard', desc: '2-4 sentences' },
                    { id: 'detailed', label: 'Detailed', desc: '4-6 sentences' },
                    { id: 'elaborate', label: 'Elaborate', desc: 'Full prose narration' },
                  ].map(opt => (
                    <label key={opt.id} className={`sz-radio ${input.narrationVerbosity === opt.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="narrationVerbosity"
                        checked={input.narrationVerbosity === opt.id}
                        onChange={() => setInput({ ...input, narrationVerbosity: opt.id })}
                      />
                      <div>
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sz-subsection">
                <h4>Loot Level</h4>
                <div className="sz-radio-group">
                  {[
                    { id: 'low', label: 'Low', desc: 'Scarce treasure' },
                    { id: 'standard', label: 'Standard', desc: 'By-the-book wealth' },
                    { id: 'high', label: 'High', desc: 'Generous loot' },
                  ].map(opt => (
                    <label key={opt.id} className={`sz-radio ${input.lootLevel === opt.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="lootLevel"
                        checked={input.lootLevel === opt.id}
                        onChange={() => setInput({ ...input, lootLevel: opt.id })}
                      />
                      <div>
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <label className="sz-checkbox">
                <input
                  type="checkbox"
                  checked={input.ruleCitations}
                  onChange={e => setInput({ ...input, ruleCitations: e.target.checked })}
                />
                <span>Show PF2e rule citations in GM responses</span>
              </label>

              <div className="sz-subsection">
                <h4>Additional Notes</h4>
                <textarea
                  className="sz-textarea"
                  placeholder="Any special requests for the GM? (e.g., 'Set in Absalom', 'Include a dragon antagonist', 'No undead')"
                  value={input.customNotes}
                  onChange={e => setInput({ ...input, customNotes: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="sz-step">
              <h3>Review & Launch</h3>
              <div className="sz-review">
                <div className="sz-review-row">
                  <span className="sz-review-label">Campaign</span>
                  <span className="sz-review-value">{input.campaignName}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Tone</span>
                  <span className="sz-review-value">{TONES.find(t => t.id === input.tone)?.label}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Themes</span>
                  <span className="sz-review-value">{input.themes.join(', ')}{input.customTheme ? `, ${input.customTheme}` : ''}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Pacing</span>
                  <span className="sz-review-value">{PACING_OPTIONS.find(p => p.id === input.pacing)?.label}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Encounters</span>
                  <span className="sz-review-value">{ENCOUNTER_OPTIONS.find(e => e.id === input.encounterBalance)?.label}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">AI GM Mode</span>
                  <span className="sz-review-value">{input.companionAI === 'full' ? 'Full AI' : input.companionAI === 'assisted' ? 'Assisted' : 'Manual'}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Narration</span>
                  <span className="sz-review-value">{input.narrationVerbosity}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Loot</span>
                  <span className="sz-review-value">{input.lootLevel}</span>
                </div>
                <div className="sz-review-row">
                  <span className="sz-review-label">Rule Citations</span>
                  <span className="sz-review-value">{input.ruleCitations ? 'Shown' : 'Hidden'}</span>
                </div>
                {input.customNotes && (
                  <div className="sz-review-row">
                    <span className="sz-review-label">Notes</span>
                    <span className="sz-review-value sz-review-notes">{input.customNotes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="sz-footer">
          {stepIdx > 0 && (
            <button className="sz-btn sz-btn-secondary" onClick={prev} disabled={loading}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="sz-btn sz-btn-primary"
            onClick={next}
            disabled={!canNext || loading}
          >
            {loading ? '⏳ Generating...' : isLast ? '🎭 Begin Campaign' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};
