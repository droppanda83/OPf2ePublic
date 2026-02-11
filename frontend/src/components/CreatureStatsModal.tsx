import React from 'react';
import { Creature } from '../../../shared/types';
import { calculateAC, calculateAttackBonus } from '../../../shared/ac';
import { WEAPON_CATALOG } from '../../../shared/weapons';

interface CreatureStatsModalProps {
  creature: Creature | null;
  onClose: () => void;
}

export const CreatureStatsModal: React.FC<CreatureStatsModalProps> = ({ creature, onClose }) => {
  if (!creature) return null;

  // Calculate current AC with conditions
  const currentAC = calculateAC(creature);
  const offGuardConditions = creature.conditions?.filter(c => c.name === 'off-guard' || c.name === 'flat-footed') ?? [];
  const isOffGuard = offGuardConditions.length > 0;

  // Get weapon info
  const weapon = creature.equippedWeapon ? WEAPON_CATALOG[creature.equippedWeapon] : null;
  const weaponName = weapon?.name || 'Unarmed Strike';
  const weaponDamage = weapon?.damageFormula || '1d4';
  const strMod = (creature.abilities as any)?.strength ?? 0;
  
  // Calculate actual attack bonus
  const attackBonus = calculateAttackBonus(creature);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '2px solid #00d4aa',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
          color: '#e0e0e0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#00d4aa' }}>{creature.name}</h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #666',
              color: '#e0e0e0',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Vitals */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ color: '#a876ff', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
            Vitals
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #333' }}>
            <span>Hit Points</span>
            <span style={{ color: creature.currentHealth > creature.maxHealth / 2 ? '#58f4c6' : '#ff907f' }}>
              {creature.currentHealth}/{creature.maxHealth}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #333' }}>
            <span>Armor Class</span>
            <span style={{ color: '#00d4aa' }}>
              {currentAC}
              {isOffGuard && <span style={{ color: '#ff907f', fontSize: '10px', marginLeft: '4px' }}>(off-guard)</span>}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span>Level</span>
            <span>{creature.level}</span>
          </div>
        </div>

        {/* Combat */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ color: '#a876ff', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
            Combat
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #333' }}>
            <span>To Hit Modifier</span>
            <span style={{ color: '#d4aa00', fontWeight: 'bold' }}>
              {attackBonus >= 0 ? '+' : ''}{attackBonus}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #333' }}>
            <span>Weapon</span>
            <span style={{ color: '#ff9944' }}>{weaponName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span>Damage</span>
            <span style={{ color: '#ff9944' }}>
              {weaponDamage} + {strMod}
            </span>
          </div>
        </div>

        {/* Ability Scores */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ color: '#a876ff', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
            Ability Scores
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((ability) => (
              <div
                key={ability}
                style={{
                  backgroundColor: '#0d0d0d',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{ability.substring(0, 3).toUpperCase()}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00d4aa' }}>
                  {(creature.abilities as any)?.[ability] ?? 0 >= 0 ? '+' : ''}
                  {(creature.abilities as any)?.[ability] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conditions */}
        {creature.conditions && creature.conditions.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ color: '#a876ff', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>
              Active Conditions
            </div>
            <div>
              {creature.conditions.map((cond, idx) => {
                // Extract creature name from source if it's a conditional effect
                let displayText = cond.name;
                if (typeof cond.value === 'number' && cond.value > 0) {
                  displayText += ` (${cond.value})`;
                }
                if (cond.appliesAgainst && cond.source) {
                  // Extract name from source like "Feint from Isera" or "Failed Feint against Goblin"
                  const match = cond.source.match(/(?:from|against)\s+(.+)/);
                  if (match) {
                    displayText += ` vs ${match[1]}`;
                  }
                }
                return (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#d4460a',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      marginRight: '6px',
                      marginBottom: '6px',
                      fontSize: '12px',
                    }}
                  >
                    {displayText}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
