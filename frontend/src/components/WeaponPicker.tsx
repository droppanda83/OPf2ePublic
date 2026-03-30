/**
 * C.2 — Extracted WeaponPicker from ActionPanel.
 * Displays available held/natural weapons for Strike selection.
 */
import React from 'react';
import { ActionCostIcon } from './ActionIcons';

interface WeaponSlot {
  weapon: {
    id: string;
    display: string;
    attackType: 'melee' | 'ranged';
    attackBonus?: number;
    damageDice: string;
    damageBonus?: number;
    damageType: string;
    hands: number;
    range?: number;
    traits?: string[];
    isNatural?: boolean;
  };
  state: string;
}

interface WeaponPickerProps {
  pickableWeapons: WeaponSlot[];
  weaponInventory: WeaponSlot[];
  heldWeapons: WeaponSlot[];
  creatureAttackBonus?: number;
  loading: boolean;
  onClose: () => void;
  onWeaponSelect: (weaponId: string) => void;
}

const WeaponPicker: React.FC<WeaponPickerProps> = ({
  pickableWeapons,
  weaponInventory,
  heldWeapons,
  creatureAttackBonus,
  loading,
  onClose,
  onWeaponSelect,
}) => {
  const formatBonus = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

  return (
    <div className="action-menu">
      <div className="action-tabs">
        <div className="action-section-title" style={{ padding: '6px 10px' }}>
          Choose Weapon for Strike
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
          <div className="action-section-title">Available Attacks</div>
          {pickableWeapons.map((slot: WeaponSlot) => {
            const w = slot.weapon;
            const traits = w.traits?.join(', ') || '';
            const atkBonus = w.attackBonus ?? creatureAttackBonus;
            return (
              <button
                key={w.id}
                className="action-row"
                onClick={() => onWeaponSelect(w.id)}
                disabled={loading}
              >
                <div className="action-row-main">
                  <div className="action-row-title">
                    {w.attackType === 'ranged' ? '🏹' : '⚔️'} {w.display}
                    {w.isNatural && (
                      <span style={{ fontSize: '10px', color: '#81c784', marginLeft: '6px' }}>
                        (Natural)
                      </span>
                    )}
                  </div>
                  <div className="action-row-desc">
                    {atkBonus !== undefined && (
                      <>
                        <span style={{ color: '#4fc3f7', fontWeight: 600 }}>
                          Strike {formatBonus(atkBonus)}
                        </span>
                        {' | '}
                      </>
                    )}
                    Damage: {w.damageDice}
                    {w.damageBonus ? formatBonus(w.damageBonus) : ''} {w.damageType}
                    {w.hands > 0 && ` | ${w.hands}H`}
                    {w.range && w.range > 1 && ` | Range: ${w.range}`}
                  </div>
                  {traits && (
                    <div className="action-row-meta">
                      <span className="action-tag">{traits}</span>
                    </div>
                  )}
                </div>
                <ActionCostIcon cost={1} />
              </button>
            );
          })}
        </div>
        {weaponInventory.length > 0 && heldWeapons.length === 0 && (
          <div className="action-section">
            <div className="action-empty">No weapons held. Draw a weapon first!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(WeaponPicker);
