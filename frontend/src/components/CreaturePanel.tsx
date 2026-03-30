import React from 'react';
import { Creature, CombatRound } from '../../../shared/types';

interface CreaturePanelProps {
  creatures: Creature[];
  currentRound?: CombatRound;
  onCreatureClick?: (creatureId: string) => void;
}

const CreaturePanel: React.FC<CreaturePanelProps> = ({ creatures, currentRound, onCreatureClick }) => {
  const currentCreatureId = currentRound?.turnOrder[currentRound?.currentTurnIndex];
  const currentCreature = creatures.find((c) => c.id === currentCreatureId);

  return (
    <div style={styles.panel}>
      <h2 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>Combatants</h2>

      <div style={styles.creatureList}>
        {creatures.map((creature) => (
          <div
            key={creature.id}
            onClick={() => onCreatureClick?.(creature.id)}
            style={{
              ...styles.creatureItem,
              opacity: creature.dying ? 0.7 : creature.currentHealth <= 0 ? 0.5 : 1,
              backgroundColor: creature.id === currentCreatureId ? '#1a2a3a' : '#1a1f2a',
              borderColor: creature.id === currentCreatureId ? '#0dd' : creature.dying ? '#ff4444' : '#3a4052',
              borderWidth: creature.id === currentCreatureId ? '2px' : '1px',
              boxShadow: creature.id === currentCreatureId ? 'inset 0 0 0 1px #0dd, 0 0 15px rgba(0,221,221,0.15)' : undefined,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as any).style.backgroundColor = creature.id === currentCreatureId ? '#1a2a3a' : '#222a3a';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as any).style.backgroundColor = creature.id === currentCreatureId ? '#1a2a3a' : '#1a1f2a';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(creature.tokenImageUrl || creature.portraitImageUrl) && (
                <img
                  src={creature.portraitImageUrl || creature.tokenImageUrl}
                  alt=""
                  style={{
                    width: '24px',
                    height: creature.portraitImageUrl ? '32px' : '24px',
                    borderRadius: creature.tokenImageUrl && !creature.portraitImageUrl ? '50%' : '4px',
                    objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                />
              )}
              <span>
                {creature.name}
                {creature.dying && <span style={{ color: '#ff4444', marginLeft: '5px' }}>💀 DYING</span>}
              </span>
            </div>
            <div style={styles.health}>
              <div
                style={{
                  width: `${Math.max(0, (creature.currentHealth / creature.maxHealth) * 100)}%`,
                  height: '8px',
                  backgroundColor: creature.dying ? '#ff4444' : creature.currentHealth > creature.maxHealth / 2 ? '#58f4c6' : '#ff907f',
                  borderRadius: '2px',
                }}
              />
            </div>
            <div style={styles.stats}>
              {creature.currentHealth}/{creature.maxHealth} HP | AC {creature.armorClass}
              {creature.dying && (
                <div style={{ marginTop: '5px', color: '#ff4444' }}>
                  Death Saves: ✓{creature.deathSaveSuccesses}/3 ✗{creature.deathSaveFailures}/3
                  {creature.wounded > 0 && ` | Wounded ${creature.wounded}`}
                </div>
              )}
            </div>
            {creature.conditions.length > 0 && (
              <div style={styles.conditions}>
                {creature.conditions.map((c, i) => (
                  <span key={i} style={styles.condition}>
                    {c.name} {c.value ? `(${c.value})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  panel: {
    padding: '8px',
  },
  turnIndicator: {
    padding: '5px',
    backgroundColor: '#2a3042',
    borderRadius: '4px',
    marginBottom: '6px',
    textAlign: 'center' as const,
    fontSize: '12px',
  },
  currentTurn: {
    padding: '6px',
    backgroundColor: '#5ec0ff',
    color: '#000',
    borderRadius: '4px',
    marginBottom: '6px',
    fontSize: '12px',
  },
  creatureList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  creatureItem: {
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #3a4052',
    fontSize: '12px',
  },
  health: {
    marginTop: '3px',
    backgroundColor: '#0d101a',
    borderRadius: '2px',
    overflow: 'hidden',
    height: '6px',
  },
  stats: {
    fontSize: '11px',
    marginTop: '3px',
    color: '#aaa',
  },
  conditions: {
    display: 'flex',
    gap: '4px',
    marginTop: '3px',
    flexWrap: 'wrap' as const,
  },
  condition: {
    backgroundColor: '#ff907f',
    color: '#000',
    padding: '1px 4px',
    borderRadius: '2px',
    fontSize: '10px',
  },
};

export default React.memo(CreaturePanel);
