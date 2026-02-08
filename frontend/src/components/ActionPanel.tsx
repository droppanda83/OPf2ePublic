import React, { useState } from 'react';
import './ActionPanel.css';

interface Action {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string;
  requiresTarget?: boolean;
  range?: number;
}

interface ActionPanelProps {
  currentCreature: any;
  selectedAction: Action | null;
  selectedTarget: string | null;
  onSelectAction: (action: Action) => void;
  onConfirmAction: () => void;
  onCancel: () => void;
  loading: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  currentCreature,
  selectedAction,
  selectedTarget,
  onSelectAction,
  onConfirmAction,
  onCancel,
  loading
}) => {
  if (!currentCreature) {
    return <div className="action-panel empty">Waiting for turn...</div>;
  }

  const actions: Action[] = [
    {
      id: 'strike',
      name: 'Strike',
      cost: 1,
      description: 'Attack an adjacent enemy',
      icon: '⚔️',
      requiresTarget: true,
      range: 1
    },
    {
      id: 'move',
      name: 'Move',
      cost: 1,
      description: 'Move up to your speed',
      icon: '🏃',
      requiresTarget: true,
      range: 6
    },
    {
      id: 'dodge',
      name: 'Dodge',
      cost: 1,
      description: 'Increase AC temporarily',
      icon: '🛡️',
      requiresTarget: false
    },
    {
      id: 'stand-tall',
      name: 'Stand Tall',
      cost: 2,
      description: 'Recover from knockdown',
      icon: '💪',
      requiresTarget: false
    }
  ];

  const spells: Action[] = [
    {
      id: 'magic-missile',
      name: 'Magic Missile',
      cost: 1,
      description: 'Fire magical projectiles (Lvl 1)',
      icon: '✨',
      requiresTarget: true,
      range: 8
    },
    {
      id: 'shield',
      name: 'Shield',
      cost: 1,
      description: 'Magical protection (Lvl 1)',
      icon: '🛡️',
      requiresTarget: false
    },
    {
      id: 'fireball',
      name: 'Fireball',
      cost: 3,
      description: 'Area attack (Lvl 3)',
      icon: '🔥',
      requiresTarget: true,
      range: 10
    }
  ];

  const handleActionSelect = (action: Action) => {
    onSelectAction(action);
  };

  const handleConfirm = () => {
    onConfirmAction();
  };

  const isConfirmDisabled = selectedAction && selectedAction.requiresTarget ? !selectedTarget : !selectedAction;

  return (
    <div className="action-panel">
      <h3>⚡ Actions</h3>

      {selectedAction && (
        <div style={{
          padding: '10px',
          background: '#2a3042',
          borderRadius: '4px',
          marginBottom: '10px',
          border: '2px solid #58f4c6'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Selected: {selectedAction.icon} {selectedAction.name}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}>
            {selectedAction.description}
          </div>
          {selectedAction.requiresTarget && (
            <div style={{ fontSize: '12px', color: selectedTarget ? '#58f4c6' : '#ff907f' }}>
              {selectedTarget ? '✓ Target selected' : '⚠ Click a target on the grid'}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '10px' }}>
            <button
              onClick={handleConfirm}
              disabled={isConfirmDisabled || loading}
              style={{
                padding: '8px',
                background: isConfirmDisabled ? '#555' : '#58f4c6',
                color: isConfirmDisabled ? '#888' : '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✓ Confirm
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '8px',
                background: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      <div className="creature-action-info">
        <div className="action-points">
          <span className="label">Action Points:</span>
          <span className="value">3</span>
        </div>
        <div className="reaction-points">
          <span className="label">Reactions:</span>
          <span className="value">1</span>
        </div>
      </div>

      <div className="actions-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`action-button ${selectedAction?.id === action.id ? 'selected' : ''}`}
            onClick={() => handleActionSelect(action)}
            disabled={loading || (selectedAction ? selectedAction.id !== action.id : false)}
            title={action.description}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-name">{action.name}</span>
            <span className="action-cost">{action.cost}AP</span>
          </button>
        ))}
      </div>

      <div className="spells-section">
        <h4>Spells & Abilities</h4>
        <div className="spells-list">
          {spells.map((spell) => (
            <button
              key={spell.id}
              className={`spell-button ${selectedAction?.id === spell.id ? 'selected' : ''}`}
              onClick={() => handleActionSelect(spell)}
              disabled={loading || (selectedAction ? selectedAction.id !== spell.id : false)}
            >
              {spell.icon} {spell.name}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loading-indicator">Processing action...</div>}
    </div>
  );
};

export default ActionPanel;
