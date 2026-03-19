/**
 * C.2 — Extracted WeaponManager from ActionPanel.
 * Draw/Stow/Drop weapon management UI.
 */
import React from 'react';

interface WeaponSlot {
  weapon: {
    id: string;
    display: string;
    hands: number;
    isNatural?: boolean;
  };
  state: string;
}

interface WeaponManagerProps {
  heldWeapons: WeaponSlot[];
  stowedWeapons: WeaponSlot[];
  droppedWeapons: WeaponSlot[];
  actionPoints: number;
  loading: boolean;
  onWeaponAction: (actionType: 'draw-weapon' | 'stow-weapon' | 'drop-weapon', weaponId: string) => void;
  onPickupDroppedWeapon: (weaponId: string) => void;
}

const WeaponManager: React.FC<WeaponManagerProps> = ({
  heldWeapons,
  stowedWeapons,
  droppedWeapons,
  actionPoints,
  loading,
  onWeaponAction,
  onPickupDroppedWeapon,
}) => {
  return (
    <div className="action-menu">
      <div className="action-tabs">
        <div className="action-section-title" style={{ padding: '6px 10px' }}>
          Weapon Management
        </div>
      </div>
      <div className="action-list">
        {/* Held Weapons - can stow or drop */}
        {heldWeapons.filter((s) => !s.weapon?.isNatural).length > 0 && (
          <div className="action-section">
            <div className="action-section-title">Held Weapons</div>
            {heldWeapons
              .filter((s) => !s.weapon?.isNatural)
              .map((slot) => {
                const w = slot.weapon;
                return (
                  <div
                    key={w.id}
                    style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}
                  >
                    <span style={{ flex: 1, fontSize: '12px', color: '#e0e0e0' }}>
                      ⚔️ {w.display} ({w.hands}H)
                    </span>
                    <button
                      className="action-row"
                      style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                      onClick={() => onWeaponAction('stow-weapon', w.id)}
                      disabled={loading || actionPoints < 1}
                      title="Stow weapon (1 action)"
                    >
                      📦 Stow
                    </button>
                    <button
                      className="action-row"
                      style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                      onClick={() => onWeaponAction('drop-weapon', w.id)}
                      disabled={loading}
                      title="Drop weapon (free action)"
                    >
                      ⬇️ Drop
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        {/* Natural attacks - always available */}
        {heldWeapons.filter((s) => s.weapon?.isNatural).length > 0 && (
          <div className="action-section">
            <div className="action-section-title">Natural Attacks</div>
            {heldWeapons
              .filter((s) => s.weapon?.isNatural)
              .map((slot) => {
                const w = slot.weapon;
                return (
                  <div key={w.id} style={{ padding: '4px 8px', fontSize: '12px', color: '#81c784' }}>
                    🦷 {w.display} — Always available
                  </div>
                );
              })}
          </div>
        )}

        {/* Stowed Weapons - can draw */}
        {stowedWeapons.length > 0 && (
          <div className="action-section">
            <div className="action-section-title">Stowed Weapons</div>
            {stowedWeapons.map((slot) => {
              const w = slot.weapon;
              return (
                <div
                  key={w.id}
                  style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}
                >
                  <span style={{ flex: 1, fontSize: '12px', color: '#999' }}>
                    📦 {w.display} ({w.hands}H)
                  </span>
                  <button
                    className="action-row"
                    style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                    onClick={() => onWeaponAction('draw-weapon', w.id)}
                    disabled={loading || actionPoints < 1}
                    title="Draw weapon (1 action)"
                  >
                    🗡️ Draw
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Dropped Weapons */}
        {droppedWeapons.length > 0 && (
          <div className="action-section">
            <div className="action-section-title">Dropped Weapons</div>
            {droppedWeapons.map((slot) => {
              const w = slot.weapon;
              return (
                <div
                  key={w.id}
                  style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}
                >
                  <span style={{ flex: 1, fontSize: '12px', color: '#999' }}>
                    ⬇️ {w.display} ({w.hands}H)
                  </span>
                  <button
                    className="action-row"
                    style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                    onClick={() => onPickupDroppedWeapon(w.id)}
                    disabled={loading || actionPoints < 1}
                    title="Pick up weapon (1 action)"
                  >
                    Pick Up
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(WeaponManager);
