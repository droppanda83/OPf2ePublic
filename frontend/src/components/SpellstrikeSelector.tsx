/**
 * C.2 — Extracted SpellstrikeSelector from ActionPanel.
 * Shows eligible spells (1-2 action cost) for Spellstrike combination.
 */
import React from 'react';
import { ActionCostIcon } from './ActionIcons';

interface SpellAction {
  id: string;
  name: string;
  cost: number;
  description?: string;
  range?: number;
}

interface SpellstrikeSelectorProps {
  allSpells: SpellAction[];
  loading: boolean;
  onClose: () => void;
  onSpellSelect: (spellId: string) => void;
}

const SpellstrikeSelector: React.FC<SpellstrikeSelectorProps> = ({
  allSpells,
  loading,
  onClose,
  onSpellSelect,
}) => {
  const spellstrikeEligible = allSpells.filter((s) => s.cost <= 2);

  return (
    <div className="action-menu">
      <div className="action-tabs">
        <div className="action-section-title" style={{ padding: '6px 10px' }}>
          Select Spell for Spellstrike (1-2 Actions)
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#aaa',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      </div>
      <div className="action-list">
        <div className="action-section">
          {spellstrikeEligible.length === 0 ? (
            <div className="action-empty">No 1-2 action spells available for Spellstrike.</div>
          ) : (
            spellstrikeEligible.map((spellAction) => {
              const dcdesc = spellAction.range === 0 ? 'Self' : `Range ${spellAction.range}`;
              return (
                <button
                  key={spellAction.id}
                  className="action-row"
                  onClick={() => onSpellSelect(spellAction.id)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="action-row-main">
                    <div className="action-row-title">✨ {spellAction.name}</div>
                    <div className="action-row-desc">{spellAction.description || 'A spell'}</div>
                    <div className="action-row-meta">
                      <span className="action-tag">{spellAction.cost}-Action</span>
                      <span className="action-tag">{dcdesc}</span>
                    </div>
                  </div>
                  <ActionCostIcon cost={spellAction.cost} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SpellstrikeSelector);
