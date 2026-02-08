import React from 'react';
import { Creature, CombatRound } from '../../../shared/types.js';

interface CreaturePanelProps {
  creatures: Creature[];
  currentRound?: CombatRound;
}

const CreaturePanel: React.FC<CreaturePanelProps> = ({ creatures, currentRound }) => {
  const currentCreatureId = currentRound?.turnOrder[currentRound?.currentTurnIndex];
  const currentCreature = creatures.find((c) => c.id === currentCreatureId);

  return (
    <div style={styles.panel}>
      <h2>Combatants</h2>
      {currentRound && <div style={styles.turnIndicator}>Round {currentRound.number}</div>}

      {currentCreature && (
        <div style={styles.currentTurn}>
          <strong>Current Turn:</strong> {currentCreature.name}
        </div>
      )}

      <div style={styles.creatureList}>
        {creatures.map((creature) => (
          <div
            key={creature.id}
            style={{
              ...styles.creatureItem,
              opacity: creature.currentHealth <= 0 ? 0.5 : 1,
              backgroundColor: creature.id === currentCreatureId ? '#2a3042' : '#1a1f2a',
            }}
          >
            <div>{creature.name}</div>
            <div style={styles.health}>
              <div
                style={{
                  width: `${(creature.currentHealth / creature.maxHealth) * 100}%`,
                  height: '8px',
                  backgroundColor: creature.currentHealth > creature.maxHealth / 2 ? '#58f4c6' : '#ff907f',
                  borderRadius: '2px',
                }}
              />
            </div>
            <div style={styles.stats}>
              {creature.currentHealth}/{creature.maxHealth} HP | AC {creature.armor}
            </div>
            {creature.conditions.length > 0 && (
              <div style={styles.conditions}>
                {creature.conditions.map((c, i) => (
                  <span key={i} style={styles.condition}>
                    {c.name}
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
    padding: '15px',
  },
  turnIndicator: {
    padding: '10px',
    backgroundColor: '#2a3042',
    borderRadius: '4px',
    marginBottom: '10px',
    textAlign: 'center' as const,
  },
  currentTurn: {
    padding: '10px',
    backgroundColor: '#5ec0ff',
    color: '#000',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  creatureList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  creatureItem: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #3a4052',
  },
  health: {
    marginTop: '5px',
    backgroundColor: '#0d101a',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  stats: {
    fontSize: '12px',
    marginTop: '5px',
    color: '#aaa',
  },
  conditions: {
    display: 'flex',
    gap: '5px',
    marginTop: '5px',
    flexWrap: 'wrap' as const,
  },
  condition: {
    backgroundColor: '#ff907f',
    color: '#000',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '11px',
  },
};

export default CreaturePanel;
