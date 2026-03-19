/**
 * PartyStash — Shared party inventory pool.
 * Players can browse all 6 item catalogs, add items to the stash,
 * remove items, and give items to individual party members.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { CharacterService } from '../services/characterService';
import type { StashItem, StashItemCatalog, CharacterSheet } from '../../../shared/types';
import { WEAPON_CATALOG } from '../../../shared/weapons';
import { ARMOR_CATALOG } from '../../../shared/armor';
import { SHIELD_CATALOG } from '../../../shared/shields';
import { CONSUMABLE_CATALOG } from '../../../shared/consumables';
import { ADVENTURING_GEAR } from '../../../shared/adventuringGear';
import { WORN_ITEMS } from '../../../shared/wornItems';
import type { Weapon } from '../../../shared/weapons';
import type { Armor } from '../../../shared/armor';
import type { Shield } from '../../../shared/shields';
import type { Consumable } from '../../../shared/consumables';
import type { GearItem } from '../../../shared/adventuringGear';
import type { MagicItem } from '../../../shared/wornItems';
import './PartyStash.css';

// ─── Types ──────────────────────────────────────────

interface PartyStashProps {
  partyId: string;
  characters: CharacterSheet[];
  /** Called when stash changes so the parent can refresh any dependent state */
  onStashChanged?: () => void;
}

type CatalogTab = StashItemCatalog;

interface CatalogEntry {
  id: string;
  name: string;
  price: number;
  level?: number;
  catalogType: StashItemCatalog;
  description?: string;
}

// ─── Catalog Helpers ────────────────────────────────

const CATALOG_TABS: { id: CatalogTab; label: string; icon: string }[] = [
  { id: 'weapon', label: 'Weapons', icon: '⚔️' },
  { id: 'armor', label: 'Armor', icon: '🛡️' },
  { id: 'shield', label: 'Shields', icon: '🔰' },
  { id: 'wornItem', label: 'Magic Items', icon: '✨' },
  { id: 'consumable', label: 'Consumables', icon: '🧪' },
  { id: 'gear', label: 'Gear', icon: '🎒' },
];

function getCatalogEntries(tab: CatalogTab): CatalogEntry[] {
  switch (tab) {
    case 'weapon':
      return Object.values(WEAPON_CATALOG).map((w: Weapon) => ({
        id: w.id || Object.keys(WEAPON_CATALOG).find(k => WEAPON_CATALOG[k] === w) || '',
        name: w.name,
        price: w.price,
        catalogType: 'weapon' as const,
        description: `${w.damageFormula} ${w.damageType} • ${w.traits?.join(', ') || ''}`,
      }));
    case 'armor':
      return Object.values(ARMOR_CATALOG).map((a: Armor) => ({
        id: a.id,
        name: a.name,
        price: a.price,
        catalogType: 'armor' as const,
        description: `AC +${a.acBonus}${a.dexCap !== null ? ` • Dex Cap +${a.dexCap}` : ''} • ${a.category}`,
      }));
    case 'shield':
      return Object.values(SHIELD_CATALOG).map((s: Shield) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        catalogType: 'shield' as const,
        description: `AC +${s.armorBonus} • Hardness ${s.hardness} • HP ${s.hp}`,
      }));
    case 'consumable':
      return Object.values(CONSUMABLE_CATALOG).map((c: Consumable) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        level: c.level,
        catalogType: 'consumable' as const,
        description: c.effect || c.description,
      }));
    case 'gear':
      return Object.values(ADVENTURING_GEAR).map((g: GearItem) => ({
        id: g.id,
        name: g.name,
        price: g.price,
        level: g.level,
        catalogType: 'gear' as const,
        description: g.description,
      }));
    case 'wornItem':
      return Object.values(WORN_ITEMS).map((m: MagicItem) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        level: m.level,
        catalogType: 'wornItem' as const,
        description: m.effect || m.description,
      }));
  }
}

function formatGP(gp: number): string {
  if (gp >= 1) return `${gp} gp`;
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`;
  return `${Math.round(gp * 100)} cp`;
}

// ─── Component ──────────────────────────────────────

export const PartyStash: React.FC<PartyStashProps> = ({ partyId, characters, onStashChanged }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<CatalogTab>('weapon');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [goldInput, setGoldInput] = useState('');
  const [giveMenuUid, setGiveMenuUid] = useState<string | null>(null);

  // Refresh hook — increment to force re-read of stash from service
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    onStashChanged?.();
  }, [onStashChanged]);

  // Current stash and gold from persistence
  const stash = useMemo(() => CharacterService.getPartyStash(partyId), [partyId, refreshKey]);
  const gold = useMemo(() => CharacterService.getPartyGold(partyId), [partyId, refreshKey]);

  // Filtered catalog entries
  const catalogEntries = useMemo(() => {
    const all = getCatalogEntries(activeTab);
    if (!searchQuery.trim()) return all.sort((a, b) => a.name.localeCompare(b.name));
    const q = searchQuery.toLowerCase();
    return all
      .filter(e => e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, searchQuery]);

  // Total stash value
  const totalValue = useMemo(
    () => stash.reduce((sum, s) => sum + s.gpValue * s.quantity, 0),
    [stash]
  );

  // ─── Handlers ─────────────────────────────────────

  const handleAddItem = (entry: CatalogEntry) => {
    const item: Omit<StashItem, 'uid'> = {
      catalogId: entry.id,
      catalogType: entry.catalogType,
      name: entry.name,
      quantity: 1,
      gpValue: entry.price,
    };
    CharacterService.addToStash(partyId, item, 1);
    refresh();
  };

  const handleRemoveItem = (uid: string) => {
    CharacterService.removeFromStash(partyId, uid, 1);
    refresh();
  };

  const handleGiveToCharacter = (uid: string, characterId: string) => {
    CharacterService.giveStashItemToCharacter(partyId, uid, characterId);
    setGiveMenuUid(null);
    refresh();
  };

  const handleSetGold = () => {
    const val = parseFloat(goldInput);
    if (!isNaN(val)) {
      CharacterService.setPartyGold(partyId, val);
      setGoldInput('');
      refresh();
    }
  };

  const handleAddGold = (amount: number) => {
    CharacterService.setPartyGold(partyId, gold + amount);
    refresh();
  };

  // ─── Render ───────────────────────────────────────

  if (collapsed) {
    return (
      <section className="setup-section stash-section">
        <div className="stash-header-collapsed" onClick={() => setCollapsed(false)}>
          <h2>
            📦 Party Stash
            <span className="stash-summary">
              {stash.length > 0 && ` • ${stash.length} item${stash.length !== 1 ? 's' : ''}`}
              {gold > 0 && ` • ${formatGP(gold)}`}
            </span>
          </h2>
          <span className="stash-expand-icon">▼</span>
        </div>
      </section>
    );
  }

  return (
    <section className="setup-section stash-section stash-expanded">
      {/* ─── Header ─── */}
      <div className="stash-header" onClick={() => setCollapsed(true)}>
        <h2>📦 Party Stash</h2>
        <span className="stash-expand-icon">▲</span>
      </div>

      {/* ─── Treasury ─── */}
      <div className="stash-treasury">
        <div className="treasury-display">
          <span className="treasury-label">💰 Treasury:</span>
          <span className="treasury-amount">{formatGP(gold)}</span>
        </div>
        <div className="treasury-controls">
          <button className="treasury-btn" onClick={() => handleAddGold(1)} title="+1 gp">+1</button>
          <button className="treasury-btn" onClick={() => handleAddGold(10)} title="+10 gp">+10</button>
          <button className="treasury-btn" onClick={() => handleAddGold(100)} title="+100 gp">+100</button>
          <button className="treasury-btn subtract" onClick={() => handleAddGold(-1)} title="-1 gp">-1</button>
          <div className="treasury-custom">
            <input
              type="number"
              value={goldInput}
              onChange={e => setGoldInput(e.target.value)}
              placeholder="Set gp"
              className="treasury-input"
              onKeyDown={e => e.key === 'Enter' && handleSetGold()}
            />
            <button className="treasury-btn set" onClick={handleSetGold} title="Set gold amount">Set</button>
          </div>
        </div>
      </div>

      {/* ─── Current Stash Items ─── */}
      <div className="stash-items">
        <div className="stash-items-header">
          <span className="stash-items-title">
            Items ({stash.length})
            {totalValue > 0 && <span className="stash-total-value"> — worth {formatGP(totalValue)}</span>}
          </span>
          <button
            className={`stash-catalog-toggle ${showCatalog ? 'active' : ''}`}
            onClick={() => setShowCatalog(!showCatalog)}
          >
            {showCatalog ? '✕ Close Shop' : '🛒 Add Items'}
          </button>
        </div>

        {stash.length === 0 ? (
          <div className="stash-empty">
            <p>The party stash is empty. Click <strong>Add Items</strong> to browse equipment catalogs.</p>
          </div>
        ) : (
          <div className="stash-item-list">
            {stash.map(item => (
              <div key={item.uid} className="stash-item-row">
                <div className="stash-item-info">
                  <span className="stash-item-name">
                    {item.name}
                    {item.quantity > 1 && <span className="stash-item-qty"> ×{item.quantity}</span>}
                  </span>
                  <span className="stash-item-meta">
                    {formatGP(item.gpValue)}
                    {item.weaponRunes?.potencyRune && ` • +${item.weaponRunes.potencyRune}`}
                    {item.armorRunes?.potencyRune && ` • +${item.armorRunes.potencyRune}`}
                  </span>
                </div>
                <div className="stash-item-actions">
                  {characters.length > 0 && (
                    <div className="give-menu-wrapper">
                      <button
                        className="stash-item-btn give"
                        onClick={() => setGiveMenuUid(giveMenuUid === item.uid ? null : item.uid)}
                        title="Give to a character"
                      >
                        🎁
                      </button>
                      {giveMenuUid === item.uid && (
                        <div className="give-dropdown">
                          {characters.map(c => (
                            <button
                              key={c.id}
                              className="give-dropdown-item"
                              onClick={() => handleGiveToCharacter(item.uid, c.id)}
                            >
                              {c.name || 'Unnamed'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    className="stash-item-btn remove"
                    onClick={() => handleRemoveItem(item.uid)}
                    title="Remove one from stash"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Item Catalog Browser ─── */}
      {showCatalog && (
        <div className="stash-catalog">
          <div className="catalog-tabs">
            {CATALOG_TABS.map(tab => (
              <button
                key={tab.id}
                className={`catalog-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <input
            className="catalog-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${CATALOG_TABS.find(t => t.id === activeTab)?.label ?? 'items'}...`}
          />

          <div className="catalog-results">
            {catalogEntries.length === 0 ? (
              <div className="catalog-no-results">No items match your search.</div>
            ) : (
              catalogEntries.slice(0, 50).map(entry => (
                <div key={entry.id} className="catalog-item-row">
                  <div className="catalog-item-info">
                    <span className="catalog-item-name">
                      {entry.name}
                      {entry.level !== undefined && entry.level > 0 && (
                        <span className="catalog-item-level"> Lv {entry.level}</span>
                      )}
                    </span>
                    <span className="catalog-item-desc">
                      {entry.description && entry.description.length > 80
                        ? entry.description.substring(0, 80) + '…'
                        : entry.description}
                    </span>
                  </div>
                  <div className="catalog-item-right">
                    <span className="catalog-item-price">{formatGP(entry.price)}</span>
                    <button
                      className="catalog-add-btn"
                      onClick={() => handleAddItem(entry)}
                      title="Add to stash"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
            {catalogEntries.length > 50 && (
              <div className="catalog-overflow">
                Showing 50 of {catalogEntries.length} items. Use search to narrow results.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PartyStash;
