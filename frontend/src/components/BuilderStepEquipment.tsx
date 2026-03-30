/**
 * Builder Step 10: Equipment — Buy weapons, armor, shields, consumables
 * Extracted from CharacterBuilder for maintainability.
 */

import React from 'react';
import { WEAPON_CATALOG } from '../../../shared/weapons';
import { ARMOR_CATALOG } from '../../../shared/armor';
import { SHIELD_CATALOG } from '../../../shared/shields';
import { CONSUMABLE_CATALOG, CONSUMABLES_HEALING, CONSUMABLES_BOMBS, CONSUMABLES_ELIXIRS, CONSUMABLES_SCROLLS, CONSUMABLES_TALISMANS } from '../../../shared/consumables';
import { ADVENTURING_GEAR } from '../../../shared/adventuringGear';
import { WORN_ITEMS } from '../../../shared/wornItems';
import { WEAPON_PROPERTY_RUNES, ARMOR_PROPERTY_RUNES } from '../../../shared/runes';
import {
  type BuilderState,
  WEALTH_BY_LEVEL, getDefaultGold,
} from './characterBuilderData';

interface BuilderStepEquipmentProps {
  character: BuilderState;
  setCharacter: (s: BuilderState) => void;
}

export const BuilderStepEquipment: React.FC<BuilderStepEquipmentProps> = ({ character, setCharacter }) => {

  // ─── EQUIPMENT HELPERS ──────────────────────────────────

  /** Format GP value with proper PF2e denominations */
  const formatGp = (gp: number): string => {
    if (gp >= 1) return `${gp.toLocaleString()} gp`;
    const sp = Math.round(gp * 10);
    if (sp >= 1) return `${sp} sp`;
    const cp = Math.round(gp * 100);
    return `${cp} cp`;
  };

  const WEAPON_POTENCY_RUNE_PRICES: Record<1 | 2 | 3, number> = { 1: 35, 2: 935, 3: 8935 };
  const ARMOR_POTENCY_RUNE_PRICES: Record<1 | 2 | 3, number> = { 1: 160, 2: 1060, 3: 20560 };
  const STRIKING_RUNE_PRICES: Record<'striking' | 'greater-striking' | 'major-striking', number> = {
    'striking': 65,
    'greater-striking': 1065,
    'major-striking': 31065,
  };
  const RESILIENT_RUNE_PRICES: Record<'resilient' | 'greater-resilient' | 'major-resilient', number> = {
    'resilient': 340,
    'greater-resilient': 3440,
    'major-resilient': 49440,
  };

  const updateWeaponRunesAt = (weaponIndex: number, patch: Partial<BuilderState['equipmentWeaponRunes'][number]>) => {
    const nextRunes = [...character.equipmentWeaponRunes];
    if (!nextRunes[weaponIndex]) nextRunes[weaponIndex] = {};
    nextRunes[weaponIndex] = { ...nextRunes[weaponIndex], ...patch };
    setCharacter({ ...character, equipmentWeaponRunes: nextRunes });
  };

  /** Calculate total GP spent on selected equipment */
  const getEquipmentSpent = (): number => {
    let total = 0;
    // Weapons
    for (let index = 0; index < character.equipmentWeapons.length; index++) {
      const wId = character.equipmentWeapons[index];
      const w = WEAPON_CATALOG[wId];
      if (w) total += w.price;

      const runeData = character.equipmentWeaponRunes[index];
      if (runeData?.potencyRune) total += WEAPON_POTENCY_RUNE_PRICES[runeData.potencyRune];
      if (runeData?.strikingRune) total += STRIKING_RUNE_PRICES[runeData.strikingRune];
      if (runeData?.propertyRunes && runeData.propertyRunes.length > 0) {
        for (const runeId of runeData.propertyRunes) {
          const rune = WEAPON_PROPERTY_RUNES[runeId];
          if (rune) total += rune.price;
        }
      }
    }
    // Armor
    if (character.equipmentArmor) {
      const a = ARMOR_CATALOG[character.equipmentArmor];
      if (a) total += a.price;

      if (character.equipmentArmorRunes.potencyRune) {
        total += ARMOR_POTENCY_RUNE_PRICES[character.equipmentArmorRunes.potencyRune];
      }
      if (character.equipmentArmorRunes.resilientRune) {
        total += RESILIENT_RUNE_PRICES[character.equipmentArmorRunes.resilientRune];
      }
      if (character.equipmentArmorRunes.propertyRunes && character.equipmentArmorRunes.propertyRunes.length > 0) {
        for (const runeId of character.equipmentArmorRunes.propertyRunes) {
          const rune = ARMOR_PROPERTY_RUNES[runeId];
          if (rune) total += rune.price;
        }
      }
    }
    // Shield
    if (character.equipmentShield) {
      const s = SHIELD_CATALOG[character.equipmentShield];
      if (s) total += s.price;
    }
    // Handwraps of Mighty Blows (base: 5 gp)
    if (character.equipmentHandwraps) {
      total += 5; // Base cost
      const hw = character.equipmentHandwrapRunes;
      if (hw?.potencyRune) total += WEAPON_POTENCY_RUNE_PRICES[hw.potencyRune];
      if (hw?.strikingRune) total += STRIKING_RUNE_PRICES[hw.strikingRune];
      if (hw?.propertyRunes && hw.propertyRunes.length > 0) {
        for (const runeId of hw.propertyRunes) {
          const rune = WEAPON_PROPERTY_RUNES[runeId];
          if (rune) total += rune.price;
        }
      }
    }
    // Consumables
    for (const c of character.equipmentConsumables) {
      const item = CONSUMABLE_CATALOG[c.id];
      if (item) total += item.price * c.qty;
    }
    // Adventuring Gear
    for (const g of character.equipmentGear) {
      const item = ADVENTURING_GEAR[g.id];
      if (item) total += item.price * g.qty;
    }
    // Worn / Held Magic Items
    for (const wId of character.equipmentWornItems) {
      const item = WORN_ITEMS[wId];
      if (item) total += item.price;
    }
    return Math.round(total * 100) / 100; // Avoid floating point drift
  };

  // ─── RENDER ─────────────────────────────────────────────

    const defaultGold = getDefaultGold(character.level);
    const spent = getEquipmentSpent();
    const remaining = character.goldBudget - spent;
    const overspent = remaining < 0;

    // Ensure goldBudget syncs with level when using default
    if (!character.customGold && character.goldBudget !== defaultGold) {
      setCharacter({ ...character, goldBudget: defaultGold });
    }

    const selectStyle: React.CSSProperties = {
      padding: '8px 10px', fontSize: '14px',
      backgroundColor: 'rgba(20, 20, 35, 0.9)', color: '#e0e0e0',
      border: '1px solid #4a4a6a', borderRadius: '4px', width: '100%',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    };

    const itemRowStyle: React.CSSProperties = {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px',
      marginBottom: '4px',
    };

    const traitBadgeStyle: React.CSSProperties = {
      fontSize: '10px',
      background: 'rgba(79, 195, 247, 0.15)',
      color: '#4fc3f7',
      border: '1px solid rgba(79, 195, 247, 0.3)',
      borderRadius: '3px',
      padding: '1px 5px',
      marginRight: '4px',
      display: 'inline-block',
    };

    return (
      <div className="step-content" style={{ maxWidth: '700px' }}>
        <h2>🛒 Buy Equipment</h2>
        <p>Purchase weapons, armor, shields, gear, magic items, and consumables for your character. Items deduct from your gold budget.</p>

        {/* ── Gold Budget ── */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: overspent ? '1px solid #e74c3c' : '1px solid #4a4a6a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#d4af37', fontWeight: 600 }}>💰 Gold Budget</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: overspent ? '#e74c3c' : '#4caf50' }}>
              {formatGp(remaining)} remaining
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ccc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={character.customGold}
                onChange={e => {
                  if (!e.target.checked) {
                    setCharacter({ ...character, customGold: false, goldBudget: defaultGold });
                  } else {
                    setCharacter({ ...character, customGold: true });
                  }
                }}
              />
              Custom gold amount
            </label>
            {character.customGold ? (
              <input
                type="number"
                min={0}
                step={1}
                value={character.goldBudget}
                onChange={e => setCharacter({ ...character, goldBudget: Math.max(0, Number(e.target.value)) })}
                style={{ ...selectStyle, width: '120px' }}
              />
            ) : (
              <span style={{ color: '#aaa' }}>Default for level {character.level}: {formatGp(defaultGold)}</span>
            )}
          </div>

          {character.customGold && character.goldBudget !== defaultGold && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(231, 165, 50, 0.15)', border: '1px solid #e7a532', borderRadius: '4px', fontSize: '12px', color: '#e7a532' }}>
              ⚠️ Custom gold amount ({formatGp(character.goldBudget)}) differs from the standard PF2e wealth for level {character.level} ({formatGp(defaultGold)}). This may affect game balance.
            </div>
          )}

          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            Spent: {formatGp(spent)} / {formatGp(character.goldBudget)}
          </div>
        </div>

        {/* ── Weapons ── */}
        <div className="form-group">
          <label>⚔️ Weapons</label>
          {character.equipmentWeapons.map((wId, idx) => {
            const w = WEAPON_CATALOG[wId];
            const runeData = character.equipmentWeaponRunes[idx] || {};
            return (
              <div key={idx} style={{ ...itemRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{w?.icon} {w?.name} ({w?.damageFormula} {w?.damageType}) — {formatGp(w?.price ?? 0)}
                    {w?.description && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{w.description}</div>}
                  </span>
                  <button
                    style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const nextWeapons = [...character.equipmentWeapons];
                      nextWeapons.splice(idx, 1);
                      const nextRunes = [...character.equipmentWeaponRunes];
                      nextRunes.splice(idx, 1);
                      setCharacter({ ...character, equipmentWeapons: nextWeapons, equipmentWeaponRunes: nextRunes });
                    }}
                  >✕</button>
                </div>

                {w?.traits && w.traits.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    {w.traits.map((t: string) => (
                      <span key={t} style={traitBadgeStyle}>{t}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select
                    value={runeData.potencyRune ?? ''}
                    onChange={(e) => updateWeaponRunesAt(idx, {
                      potencyRune: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined,
                    })}
                    style={selectStyle}
                  >
                    <option value="">Potency Rune (none)</option>
                    <option value="1">+1 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[1])}</option>
                    <option value="2">+2 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[2])}</option>
                    <option value="3">+3 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[3])}</option>
                  </select>

                  <select
                    value={runeData.strikingRune ?? ''}
                    onChange={(e) => updateWeaponRunesAt(idx, {
                      strikingRune: e.target.value ? e.target.value as 'striking' | 'greater-striking' | 'major-striking' : undefined,
                    })}
                    style={selectStyle}
                  >
                    <option value="">Striking Rune (none)</option>
                    <option value="striking">Striking — {formatGp(STRIKING_RUNE_PRICES['striking'])}</option>
                    <option value="greater-striking">Greater Striking — {formatGp(STRIKING_RUNE_PRICES['greater-striking'])}</option>
                    <option value="major-striking">Major Striking — {formatGp(STRIKING_RUNE_PRICES['major-striking'])}</option>
                  </select>
                </div>

                <div>
                  {(runeData.propertyRunes ?? []).map((runeId) => {
                    const rune = WEAPON_PROPERTY_RUNES[runeId];
                    return (
                      <div key={`${idx}-${runeId}`} style={{ ...itemRowStyle, marginBottom: '6px' }}>
                        <span>🔷 {rune?.name ?? runeId} — {formatGp(rune?.price ?? 0)}</span>
                        <button
                          style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                          onClick={() => {
                            const next = (runeData.propertyRunes ?? []).filter(id => id !== runeId);
                            updateWeaponRunesAt(idx, { propertyRunes: next });
                          }}
                        >✕</button>
                      </div>
                    );
                  })}
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const existing = runeData.propertyRunes ?? [];
                      if (existing.includes(e.target.value)) return;
                      updateWeaponRunesAt(idx, { propertyRunes: [...existing, e.target.value] });
                    }}
                    style={selectStyle}
                  >
                    <option value="">+ Add weapon property rune...</option>
                    {Object.values(WEAPON_PROPERTY_RUNES)
                      .filter(r => !(runeData.propertyRunes ?? []).includes(r.id))
                      .map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} (Lv {r.level}) — {formatGp(r.price)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            );
          })}
          <select
            value=""
            onChange={e => {
              if (e.target.value) {
                setCharacter({
                  ...character,
                  equipmentWeapons: [...character.equipmentWeapons, e.target.value],
                  equipmentWeaponRunes: [...character.equipmentWeaponRunes, {}],
                });
              }
            }}
            style={selectStyle}
          >
            <option value="">+ Add weapon...</option>
            {Object.values(WEAPON_CATALOG).map(w => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.proficiencyCategory}) — {w.damageFormula} {w.damageType}{w.traits.length > 0 ? ` [${w.traits.join(', ')}]` : ''} — {formatGp(w.price)}
              </option>
            ))}
          </select>
        </div>

        {/* ── Armor ── */}
        <div className="form-group">
          <label>🛡️ Armor</label>
          {character.equipmentArmor && (
            <div style={{ ...itemRowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {ARMOR_CATALOG[character.equipmentArmor]?.icon}{' '}
                  {ARMOR_CATALOG[character.equipmentArmor]?.name}{' '}
                  (AC +{ARMOR_CATALOG[character.equipmentArmor]?.acBonus}, DEX cap {ARMOR_CATALOG[character.equipmentArmor]?.dexCap ?? '∞'})
                  {' — '}{formatGp(ARMOR_CATALOG[character.equipmentArmor]?.price ?? 0)}
                </span>
                <button
                style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                  onClick={() => setCharacter({ ...character, equipmentArmor: '', equipmentArmorRunes: {} })}
                >✕</button>
              </div>
              {ARMOR_CATALOG[character.equipmentArmor]?.traits && ARMOR_CATALOG[character.equipmentArmor].traits.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  {ARMOR_CATALOG[character.equipmentArmor].traits.map((t: string) => (
                    <span key={t} style={traitBadgeStyle}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          <select
            value={character.equipmentArmor}
            onChange={e => setCharacter({
              ...character,
              equipmentArmor: e.target.value,
              equipmentArmorRunes: e.target.value ? character.equipmentArmorRunes : {},
            })}
            style={selectStyle}
          >
            <option value="">None (unarmored)</option>
            {Object.values(ARMOR_CATALOG)
              .filter(a => a.id !== 'unarmored') // Skip the "no armor" placeholder
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.category}) — AC +{a.acBonus}, DEX cap {a.dexCap ?? '∞'}{a.traits.length > 0 ? ` [${a.traits.join(', ')}]` : ''} — {formatGp(a.price)}
                </option>
              ))}
          </select>

          {character.equipmentArmor && (
            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={character.equipmentArmorRunes.potencyRune ?? ''}
                onChange={(e) => setCharacter({
                  ...character,
                  equipmentArmorRunes: {
                    ...character.equipmentArmorRunes,
                    potencyRune: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined,
                  },
                })}
                style={selectStyle}
              >
                <option value="">Armor Potency (none)</option>
                <option value="1">+1 Potency — {formatGp(ARMOR_POTENCY_RUNE_PRICES[1])}</option>
                <option value="2">+2 Potency — {formatGp(ARMOR_POTENCY_RUNE_PRICES[2])}</option>
                <option value="3">+3 Potency — {formatGp(ARMOR_POTENCY_RUNE_PRICES[3])}</option>
              </select>

              <select
                value={character.equipmentArmorRunes.resilientRune ?? ''}
                onChange={(e) => setCharacter({
                  ...character,
                  equipmentArmorRunes: {
                    ...character.equipmentArmorRunes,
                    resilientRune: e.target.value ? e.target.value as 'resilient' | 'greater-resilient' | 'major-resilient' : undefined,
                  },
                })}
                style={selectStyle}
              >
                <option value="">Resilient Rune (none)</option>
                <option value="resilient">Resilient — {formatGp(RESILIENT_RUNE_PRICES['resilient'])}</option>
                <option value="greater-resilient">Greater Resilient — {formatGp(RESILIENT_RUNE_PRICES['greater-resilient'])}</option>
                <option value="major-resilient">Major Resilient — {formatGp(RESILIENT_RUNE_PRICES['major-resilient'])}</option>
              </select>

              <div style={{ gridColumn: '1 / -1' }}>
                {(character.equipmentArmorRunes.propertyRunes ?? []).map((runeId) => {
                  const rune = ARMOR_PROPERTY_RUNES[runeId];
                  return (
                    <div key={`armor-${runeId}`} style={{ ...itemRowStyle, marginBottom: '6px' }}>
                      <span>🔶 {rune?.name ?? runeId} — {formatGp(rune?.price ?? 0)}</span>
                      <button
                        style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => setCharacter({
                          ...character,
                          equipmentArmorRunes: {
                            ...character.equipmentArmorRunes,
                            propertyRunes: (character.equipmentArmorRunes.propertyRunes ?? []).filter(id => id !== runeId),
                          },
                        })}
                      >✕</button>
                    </div>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const existing = character.equipmentArmorRunes.propertyRunes ?? [];
                    if (existing.includes(e.target.value)) return;
                    setCharacter({
                      ...character,
                      equipmentArmorRunes: {
                        ...character.equipmentArmorRunes,
                        propertyRunes: [...existing, e.target.value],
                      },
                    });
                  }}
                  style={selectStyle}
                >
                  <option value="">+ Add armor property rune...</option>
                  {Object.values(ARMOR_PROPERTY_RUNES)
                    .filter(r => !(character.equipmentArmorRunes.propertyRunes ?? []).includes(r.id))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Lv {r.level}) — {formatGp(r.price)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Shield ── */}
        <div className="form-group">
          <label>🛡️ Shield</label>
          {character.equipmentShield && (
            <div style={itemRowStyle}>
              <span>
                {SHIELD_CATALOG[character.equipmentShield]?.icon}{' '}
                {SHIELD_CATALOG[character.equipmentShield]?.name}{' '}
                (AC +{SHIELD_CATALOG[character.equipmentShield]?.armorBonus}, Hardness {SHIELD_CATALOG[character.equipmentShield]?.hardness})
                {' — '}{formatGp(SHIELD_CATALOG[character.equipmentShield]?.price ?? 0)}
              </span>
              <button
                style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() => setCharacter({ ...character, equipmentShield: '' })}
              >✕</button>
            </div>
          )}
          <select
            value={character.equipmentShield}
            onChange={e => setCharacter({ ...character, equipmentShield: e.target.value })}
            style={selectStyle}
          >
            <option value="">None</option>
            {Object.values(SHIELD_CATALOG).map(s => (
              <option key={s.id} value={s.id}>
                {s.name} — AC +{s.armorBonus}, Hardness {s.hardness}, HP {s.maxHp} — {formatGp(s.price)}
              </option>
            ))}
          </select>
        </div>

        {/* ── Handwraps of Mighty Blows ── */}
        <div className="form-group">
          <label>🥊 Handwraps of Mighty Blows</label>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
            Applies fundamental and property runes to all your unarmed attacks (fist, claw, etc.). Base cost: {formatGp(5)}.
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', cursor: 'pointer', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={character.equipmentHandwraps}
              onChange={e => {
                if (!e.target.checked) {
                  setCharacter({ ...character, equipmentHandwraps: false, equipmentHandwrapRunes: {} });
                } else {
                  setCharacter({ ...character, equipmentHandwraps: true });
                }
              }}
            />
            Purchase Handwraps of Mighty Blows — {formatGp(5)}
          </label>

          {character.equipmentHandwraps && (
            <div style={{ ...itemRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select
                  value={character.equipmentHandwrapRunes.potencyRune ?? ''}
                  onChange={(e) => setCharacter({
                    ...character,
                    equipmentHandwrapRunes: {
                      ...character.equipmentHandwrapRunes,
                      potencyRune: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined,
                    },
                  })}
                  style={selectStyle}
                >
                  <option value="">Potency Rune (none)</option>
                  <option value="1">+1 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[1])}</option>
                  <option value="2">+2 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[2])}</option>
                  <option value="3">+3 Potency — {formatGp(WEAPON_POTENCY_RUNE_PRICES[3])}</option>
                </select>

                <select
                  value={character.equipmentHandwrapRunes.strikingRune ?? ''}
                  onChange={(e) => setCharacter({
                    ...character,
                    equipmentHandwrapRunes: {
                      ...character.equipmentHandwrapRunes,
                      strikingRune: e.target.value ? e.target.value as 'striking' | 'greater-striking' | 'major-striking' : undefined,
                    },
                  })}
                  style={selectStyle}
                >
                  <option value="">Striking Rune (none)</option>
                  <option value="striking">Striking — {formatGp(STRIKING_RUNE_PRICES['striking'])}</option>
                  <option value="greater-striking">Greater Striking — {formatGp(STRIKING_RUNE_PRICES['greater-striking'])}</option>
                  <option value="major-striking">Major Striking — {formatGp(STRIKING_RUNE_PRICES['major-striking'])}</option>
                </select>
              </div>

              <div>
                {(character.equipmentHandwrapRunes.propertyRunes ?? []).map((runeId) => {
                  const rune = WEAPON_PROPERTY_RUNES[runeId];
                  return (
                    <div key={`hw-${runeId}`} style={{ ...itemRowStyle, marginBottom: '6px' }}>
                      <span>🔷 {rune?.name ?? runeId} — {formatGp(rune?.price ?? 0)}</span>
                      <button
                        style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => setCharacter({
                          ...character,
                          equipmentHandwrapRunes: {
                            ...character.equipmentHandwrapRunes,
                            propertyRunes: (character.equipmentHandwrapRunes.propertyRunes ?? []).filter(id => id !== runeId),
                          },
                        })}
                      >✕</button>
                    </div>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const existing = character.equipmentHandwrapRunes.propertyRunes ?? [];
                    if (existing.includes(e.target.value)) return;
                    setCharacter({
                      ...character,
                      equipmentHandwrapRunes: {
                        ...character.equipmentHandwrapRunes,
                        propertyRunes: [...existing, e.target.value],
                      },
                    });
                  }}
                  style={selectStyle}
                >
                  <option value="">+ Add weapon property rune...</option>
                  {Object.values(WEAPON_PROPERTY_RUNES)
                    .filter(r => !(character.equipmentHandwrapRunes.propertyRunes ?? []).includes(r.id))
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Lv {r.level}) — {formatGp(r.price)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Adventuring Gear ── */}
        <div className="form-group">
          <label>🎒 Adventuring Gear</label>
          {character.equipmentGear.map((g, idx) => {
            const item = ADVENTURING_GEAR[g.id];
            return (
              <div key={idx} style={itemRowStyle}>
                <span>{item?.name ?? g.id} × {g.qty} — {formatGp((item?.price ?? 0) * g.qty)}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentGear];
                      if (next[idx].qty > 1) {
                        next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
                      } else {
                        next.splice(idx, 1);
                      }
                      setCharacter({ ...character, equipmentGear: next });
                    }}
                  >−</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentGear];
                      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                      setCharacter({ ...character, equipmentGear: next });
                    }}
                  >+</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentGear];
                      next.splice(idx, 1);
                      setCharacter({ ...character, equipmentGear: next });
                    }}
                  >✕</button>
                </div>
              </div>
            );
          })}
          <select
            value=""
            onChange={e => {
              if (e.target.value) {
                const existing = character.equipmentGear.findIndex(g => g.id === e.target.value);
                if (existing >= 0) {
                  const next = [...character.equipmentGear];
                  next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
                  setCharacter({ ...character, equipmentGear: next });
                } else {
                  setCharacter({ ...character, equipmentGear: [...character.equipmentGear, { id: e.target.value, qty: 1 }] });
                }
              }
            }}
            style={selectStyle}
          >
            <option value="">+ Add adventuring gear...</option>
            <optgroup label="Containers">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'container').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Light Sources">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'light').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Rope & Climbing">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'rope').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Tools">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'tool').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Thievery">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'thievery').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Medical">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'medical').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Survival">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'survival').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Writing & Religious">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'writing' || g.category === 'religious').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
            <optgroup label="General">
              {Object.values(ADVENTURING_GEAR).filter(g => g.category === 'general').map(g => (
                <option key={g.id} value={g.id}>{g.name} — {formatGp(g.price)}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* ── Worn & Held Magic Items ── */}
        <div className="form-group">
          <label>✨ Worn & Held Magic Items</label>
          {character.equipmentWornItems.map((wId, idx) => {
            const item = WORN_ITEMS[wId];
            return (
              <div key={idx} style={itemRowStyle}>
                <span>
                  {item?.name ?? wId} — {formatGp(item?.price ?? 0)}
                  <span style={{ ...traitBadgeStyle, marginLeft: '6px' }}>{item?.slot}</span>
                </span>
                <button
                  style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                  onClick={() => {
                    const next = [...character.equipmentWornItems];
                    next.splice(idx, 1);
                    setCharacter({ ...character, equipmentWornItems: next });
                  }}
                >✕</button>
              </div>
            );
          })}
          <select
            value=""
            onChange={e => {
              if (e.target.value && !character.equipmentWornItems.includes(e.target.value)) {
                setCharacter({ ...character, equipmentWornItems: [...character.equipmentWornItems, e.target.value] });
              }
            }}
            style={selectStyle}
          >
            <option value="">+ Add worn/held item...</option>
            <optgroup label="Headwear">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'headwear').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Eyepiece">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'eyepiece').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Necklace">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'necklace').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Cloak">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'cloak').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Belt">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'belt').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Bracers">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'bracers').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Gloves">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'gloves').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Ring">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'ring').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Boots">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'boots').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Held Items">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'held').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
            <optgroup label="General Worn">
              {Object.values(WORN_ITEMS).filter(i => i.slot === 'worn').map(i => (
                <option key={i.id} value={i.id}>{i.name} (Lv {i.level}) — {formatGp(i.price)}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* ── Consumables ── */}
        <div className="form-group">
          <label>🧪 Consumables</label>
          {character.equipmentConsumables.map((c, idx) => {
            const item = CONSUMABLE_CATALOG[c.id];
            return (
              <div key={idx} style={itemRowStyle}>
                <span>{item?.name ?? c.id} × {c.qty} — {formatGp((item?.price ?? 0) * c.qty)}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentConsumables];
                      if (next[idx].qty > 1) {
                        next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
                      } else {
                        next.splice(idx, 1);
                      }
                      setCharacter({ ...character, equipmentConsumables: next });
                    }}
                  >−</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #4a4a6a', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentConsumables];
                      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                      setCharacter({ ...character, equipmentConsumables: next });
                    }}
                  >+</button>
                  <button
                    style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => {
                      const next = [...character.equipmentConsumables];
                      next.splice(idx, 1);
                      setCharacter({ ...character, equipmentConsumables: next });
                    }}
                  >✕</button>
                </div>
              </div>
            );
          })}
          <select
            value=""
            onChange={e => {
              if (e.target.value) {
                const existing = character.equipmentConsumables.findIndex(c => c.id === e.target.value);
                if (existing >= 0) {
                  const next = [...character.equipmentConsumables];
                  next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
                  setCharacter({ ...character, equipmentConsumables: next });
                } else {
                  setCharacter({ ...character, equipmentConsumables: [...character.equipmentConsumables, { id: e.target.value, qty: 1 }] });
                }
              }
            }}
            style={selectStyle}
          >
            <option value="">+ Add consumable...</option>
            <optgroup label="Healing Potions">
              {Object.values(CONSUMABLES_HEALING).map(c => (
                <option key={c.id} value={c.id}>{c.name} (Lv {c.level}) — {formatGp(c.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Alchemical Bombs">
              {Object.values(CONSUMABLES_BOMBS).map(c => (
                <option key={c.id} value={c.id}>{c.name} (Lv {c.level}) — {formatGp(c.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Elixirs">
              {Object.values(CONSUMABLES_ELIXIRS).map(c => (
                <option key={c.id} value={c.id}>{c.name} (Lv {c.level}) — {formatGp(c.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Scrolls">
              {Object.values(CONSUMABLES_SCROLLS).map(c => (
                <option key={c.id} value={c.id}>{c.name} (Lv {c.level}) — {formatGp(c.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Talismans">
              {Object.values(CONSUMABLES_TALISMANS).map(c => (
                <option key={c.id} value={c.id}>{c.name} (Lv {c.level}) — {formatGp(c.price)}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* ── Shopping Summary ── */}
        <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid #4a4a6a' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#d4af37' }}>📋 Cart Summary</h3>
          <div style={{ fontSize: '13px', color: '#ccc' }}>
            {character.equipmentWeapons.length === 0 && !character.equipmentArmor && !character.equipmentShield && !character.equipmentHandwraps && character.equipmentConsumables.length === 0 && character.equipmentGear.length === 0 && character.equipmentWornItems.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No equipment selected. You can skip this step.</div>
            ) : (
              <>
                {character.equipmentWeapons.map((wId, i) => {
                  const w = WEAPON_CATALOG[wId];
                  const runeData = character.equipmentWeaponRunes[i] || {};
                  const runeLabels: string[] = [];
                  if (runeData.potencyRune) runeLabels.push(`+${runeData.potencyRune} potency`);
                  if (runeData.strikingRune) runeLabels.push(runeData.strikingRune);
                  if (runeData.propertyRunes && runeData.propertyRunes.length > 0) {
                    for (const runeId of runeData.propertyRunes) {
                      const rune = WEAPON_PROPERTY_RUNES[runeId];
                      runeLabels.push(rune?.name ?? runeId);
                    }
                  }
                  return <div key={`w${i}`}>• {w?.name}{runeLabels.length > 0 ? ` [${runeLabels.join(', ')}]` : ''} — {formatGp(w?.price ?? 0)}</div>;
                })}
                {character.equipmentArmor && (() => {
                  const a = ARMOR_CATALOG[character.equipmentArmor];
                  const armorRuneLabels: string[] = [];
                  if (character.equipmentArmorRunes.potencyRune) armorRuneLabels.push(`+${character.equipmentArmorRunes.potencyRune} potency`);
                  if (character.equipmentArmorRunes.resilientRune) armorRuneLabels.push(character.equipmentArmorRunes.resilientRune);
                  if (character.equipmentArmorRunes.propertyRunes && character.equipmentArmorRunes.propertyRunes.length > 0) {
                    for (const runeId of character.equipmentArmorRunes.propertyRunes) {
                      const rune = ARMOR_PROPERTY_RUNES[runeId];
                      armorRuneLabels.push(rune?.name ?? runeId);
                    }
                  }
                  return <div>• {a?.name}{armorRuneLabels.length > 0 ? ` [${armorRuneLabels.join(', ')}]` : ''} — {formatGp(a?.price ?? 0)}</div>;
                })()}
                {character.equipmentShield && (() => {
                  const s = SHIELD_CATALOG[character.equipmentShield];
                  return <div>• {s?.name} — {formatGp(s?.price ?? 0)}</div>;
                })()}
                {character.equipmentHandwraps && (() => {
                  const hwLabels: string[] = [];
                  if (character.equipmentHandwrapRunes.potencyRune) hwLabels.push(`+${character.equipmentHandwrapRunes.potencyRune} potency`);
                  if (character.equipmentHandwrapRunes.strikingRune) hwLabels.push(character.equipmentHandwrapRunes.strikingRune);
                  if (character.equipmentHandwrapRunes.propertyRunes && character.equipmentHandwrapRunes.propertyRunes.length > 0) {
                    for (const runeId of character.equipmentHandwrapRunes.propertyRunes) {
                      const rune = WEAPON_PROPERTY_RUNES[runeId];
                      hwLabels.push(rune?.name ?? runeId);
                    }
                  }
                  return <div>• Handwraps of Mighty Blows{hwLabels.length > 0 ? ` [${hwLabels.join(', ')}]` : ''} — {formatGp(5)}</div>;
                })()}
                {character.equipmentGear.map((g, i) => {
                  const item = ADVENTURING_GEAR[g.id];
                  return <div key={`g${i}`}>• {item?.name} × {g.qty} — {formatGp((item?.price ?? 0) * g.qty)}</div>;
                })}
                {character.equipmentWornItems.map((wId, i) => {
                  const item = WORN_ITEMS[wId];
                  return <div key={`m${i}`}>• {item?.name} [{item?.slot}] — {formatGp(item?.price ?? 0)}</div>;
                })}
                {character.equipmentConsumables.map((c, i) => {
                  const item = CONSUMABLE_CATALOG[c.id];
                  return <div key={`c${i}`}>• {item?.name} × {c.qty} — {formatGp((item?.price ?? 0) * c.qty)}</div>;
                })}
              </>
            )}
          </div>
          <div style={{ marginTop: '8px', borderTop: '1px solid #4a4a6a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Total Spent:</span>
            <span style={{ color: overspent ? '#e74c3c' : '#4caf50' }}>{formatGp(spent)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Budget:</span>
            <span>{formatGp(character.goldBudget)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Remaining:</span>
            <span style={{ color: overspent ? '#e74c3c' : '#4caf50' }}>{formatGp(remaining)}</span>
          </div>
        </div>
      </div>
    );
};
