/**
 * CharacterInventory — Per-character inventory management tab.
 * Equipment slots, backpack, consumables, bulk tracking, and currency.
 */
import React, { useState, useMemo } from 'react';
import type { Creature, InventoryItem, EquipmentSlot, InventoryItemCategory } from '../../../shared/types';
import { EquipmentPicker, type PickerItem } from './EquipmentPicker';
import './CharacterInventory.css';

interface CharacterInventoryProps {
  creature: Creature;
  onCreatureUpdate?: (updated: Creature) => void;
}

const EQUIPMENT_SLOTS: { slot: EquipmentSlot; label: string; icon: string }[] = [
  { slot: 'armor', label: 'Armor', icon: '🛡️' },
  { slot: 'shield', label: 'Shield', icon: '🔰' },
  { slot: 'head', label: 'Headwear', icon: '👑' },
  { slot: 'eyepiece', label: 'Eyepiece', icon: '👓' },
  { slot: 'neck', label: 'Necklace', icon: '📿' },
  { slot: 'back', label: 'Cloak', icon: '🧥' },
  { slot: 'chest', label: 'Chest', icon: '🎽' },
  { slot: 'bracers', label: 'Bracers', icon: '⚔️' },
  { slot: 'hands', label: 'Gloves', icon: '🧤' },
  { slot: 'belt', label: 'Belt', icon: '🪢' },
  { slot: 'feet', label: 'Boots', icon: '👢' },
];

const CATEGORY_FILTERS: { value: InventoryItemCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'worn', label: 'Worn' },
  { value: 'held', label: 'Held' },
  { value: 'consumable', label: 'Consumables' },
  { value: 'gear', label: 'Gear' },
  { value: 'weapon', label: 'Weapons' },
  { value: 'armor', label: 'Armor' },
  { value: 'shield', label: 'Shields' },
];

type SlotPickerTarget = EquipmentSlot | 'held-1' | 'held-2';

const ALL_SLOT_LABELS: { slot: SlotPickerTarget; label: string; icon: string }[] = [
  ...EQUIPMENT_SLOTS,
  { slot: 'held-1', label: 'Held 1', icon: '✋' },
  { slot: 'held-2', label: 'Held 2', icon: '🤚' },
];

export const CharacterInventory: React.FC<CharacterInventoryProps> = ({ creature, onCreatureUpdate }) => {
  const [filterCategory, setFilterCategory] = useState<InventoryItemCategory | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [currencyInput, setCurrencyInput] = useState({ gp: 0, sp: 0, cp: 0, pp: 0 });
  const [slotPickerOpen, setSlotPickerOpen] = useState<SlotPickerTarget | null>(null);

  const canEdit = creature.type === 'player' && !!onCreatureUpdate;
  const inventory = useMemo(() => creature.inventory || [], [creature.inventory]);
  const currency = creature.currency || { gp: 0, sp: 0, cp: 0, pp: 0 };

  // ── Bulk calculation ──
  const strMod = creature.abilities?.strength ?? 0;
  const encumberedThreshold = 5 + strMod;
  const maxBulk = encumberedThreshold + 5;
  const currentBulk = useMemo(() => {
    return inventory.reduce((total, item) => {
      const itemBulk = item.bulk * item.quantity;
      return total + (item.equipped ? itemBulk : itemBulk);
    }, 0);
  }, [inventory]);

  const investedCount = useMemo(() => {
    return inventory.filter(i => i.invested).length;
  }, [inventory]);

  // ── Slot map ──
  const slotMap = useMemo(() => {
    const map: Partial<Record<EquipmentSlot, InventoryItem>> = {};
    for (const item of inventory) {
      if (item.equipped && item.slot) {
        map[item.slot] = item;
      }
    }
    return map;
  }, [inventory]);

  const heldMap = useMemo(() => {
    const map: Partial<Record<'held-1' | 'held-2', InventoryItem>> = {};
    for (const item of inventory) {
      if (item.equipped && item.heldSlot) {
        map[item.heldSlot] = item;
      }
    }
    return map;
  }, [inventory]);

  // ── Filtered backpack items ──
  const backpackItems = useMemo(() => {
    let items = inventory.filter(i => !i.equipped);
    if (filterCategory !== 'all') {
      items = items.filter(i => i.category === filterCategory);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [inventory, filterCategory, searchText]);

  // ── Consumable quick-access ──
  const consumables = useMemo(() => {
    return inventory.filter(i => i.category === 'consumable' && i.quantity > 0);
  }, [inventory]);

  // ── Update helpers ──
  const updateInventory = (newInventory: InventoryItem[]) => {
    if (onCreatureUpdate) {
      onCreatureUpdate({ ...creature, inventory: newInventory });
    }
  };

  const toggleEquip = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const updated = inventory.map(i => {
      if (i.id === itemId) {
        if (i.equipped) {
          // Unequip
          return { ...i, equipped: false, invested: false, slot: undefined, heldSlot: undefined };
        } else {
          // Equip — check investiture limit for invested items
          const willInvest = i.traits?.includes('invested');
          if (willInvest && investedCount >= 10) {
            return i; // Can't invest more than 10
          }
          return { ...i, equipped: true, invested: willInvest || false };
        }
      }
      // If equipping to a slot, unequip existing item in that slot
      if (!item.equipped && item.slot && i.slot === item.slot && i.equipped) {
        return { ...i, equipped: false, invested: false, slot: undefined, heldSlot: undefined };
      }
      return i;
    });
    updateInventory(updated);
  };

  const consumeItem = (itemId: string) => {
    const updated = inventory.map(i => {
      if (i.id === itemId) {
        const newQty = i.quantity - 1;
        return newQty <= 0 ? null : { ...i, quantity: newQty };
      }
      return i;
    }).filter((i): i is InventoryItem => i !== null);
    updateInventory(updated);
  };

  const removeItem = (itemId: string) => {
    updateInventory(inventory.filter(i => i.id !== itemId));
  };

  const equipToSlot = (itemId: string, slot: SlotPickerTarget) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const willInvest = item.traits?.includes('invested');
    if (willInvest && investedCount >= 10) return;

    const updated = inventory.map(i => {
      if (slot === 'held-1' || slot === 'held-2') {
        if (i.heldSlot === slot && i.equipped && i.id !== itemId) {
          return { ...i, equipped: false, invested: false, heldSlot: undefined };
        }

        if (i.id === itemId) {
          return { ...i, equipped: true, invested: willInvest || false, slot: undefined, heldSlot: slot };
        }

        return i;
      }

      // Unequip existing item in this slot
      if (i.slot === slot && i.equipped && i.id !== itemId) {
        return { ...i, equipped: false, invested: false, slot: undefined, heldSlot: undefined };
      }
      // Equip the chosen item
      if (i.id === itemId) {
        return { ...i, equipped: true, invested: willInvest || false, slot, heldSlot: undefined };
      }
      return i;
    });
    updateInventory(updated);
    setSlotPickerOpen(null);
  };

  // Items eligible for a given slot (unequipped items matching the slot's category)
  const itemsForSlot = useMemo(() => {
    if (!slotPickerOpen) return [];
    return inventory.filter(item => {
      if (item.equipped) return false;

      if (slotPickerOpen === 'held-1' || slotPickerOpen === 'held-2') {
        return item.category === 'held' || item.category === 'weapon';
      }

      if (slotPickerOpen === 'armor') return item.category === 'armor';
      if (slotPickerOpen === 'shield') return item.category === 'shield';

      return item.category === 'worn' && (!item.slot || item.slot === slotPickerOpen);
    });
  }, [slotPickerOpen, inventory]);

  const pickerItems = useMemo<PickerItem[]>(() => {
    return itemsForSlot.map(item => ({
      id: item.id,
      name: item.name,
      price: item.gpValue ?? 0,
      level: item.level,
      category: item.category,
      traits: item.traits,
      subtitle: item.bulk > 0 ? `Bulk ${item.bulk}` : undefined,
    }));
  }, [itemsForSlot]);

  const addItem = () => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'New Item',
      bulk: 0,
      equipped: false,
      quantity: 1,
      category: 'gear',
    };
    updateInventory([...inventory, newItem]);
  };

  const saveCurrency = () => {
    if (onCreatureUpdate) {
      onCreatureUpdate({ ...creature, currency: { ...currencyInput } });
    }
    setEditingCurrency(false);
  };

  const startEditCurrency = () => {
    setCurrencyInput({ ...currency });
    setEditingCurrency(true);
  };

  const bulkPercent = maxBulk > 0 ? Math.min(100, (currentBulk / maxBulk) * 100) : 0;
  const isEncumbered = currentBulk > encumberedThreshold;
  const isOverloaded = currentBulk > maxBulk;

  return (
    <div className="tab-pane character-inventory">
      {/* ── Equipment Slots Grid ── */}
      <div className="section">
        <h3 className="section-title">
          Equipment Slots
          <span className="invested-counter" title="Invested items (max 10)">
            Invested: {investedCount}/10
          </span>
        </h3>
        <div className="equipment-slots-grid">
          {ALL_SLOT_LABELS.map(({ slot, label, icon }) => {
            const equipped = slot === 'held-1' || slot === 'held-2'
              ? heldMap[slot]
              : slotMap[slot];
            return (
              <div
                key={slot}
                className={`equipment-slot ${equipped ? 'filled' : 'empty'} ${!equipped && canEdit ? 'clickable' : ''}`}
                title={equipped ? `${equipped.name}${equipped.invested ? ' (Invested)' : ''}` : `Empty ${label} slot — click to equip`}
                onClick={() => {
                  if (!equipped && canEdit) setSlotPickerOpen(slot);
                }}
                role={!equipped && canEdit ? 'button' : undefined}
                tabIndex={!equipped && canEdit ? 0 : undefined}
                onKeyDown={!equipped && canEdit ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSlotPickerOpen(slot); }
                } : undefined}
              >
                <div className="slot-icon">{icon}</div>
                <div className="slot-label">{label}</div>
                {equipped ? (
                  <div className="slot-item-name">
                    {equipped.name}
                    {equipped.invested && <span className="invested-badge">✦</span>}
                    {canEdit && (
                      <button
                        className="slot-unequip-btn"
                        onClick={(e) => { e.stopPropagation(); toggleEquip(equipped.id); }}
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="slot-empty-label">{canEdit ? '+' : '—'}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot Picker */}
        {slotPickerOpen && canEdit && (
          <EquipmentPicker
            label={`Equip to: ${ALL_SLOT_LABELS.find(s => s.slot === slotPickerOpen)?.label ?? slotPickerOpen}`}
            items={pickerItems}
            onPick={(itemId) => equipToSlot(itemId, slotPickerOpen)}
            formatGp={(value) => `${value} gp`}
            open
            hideTrigger
            onOpenChange={(open) => {
              if (!open) {
                setSlotPickerOpen(null);
              }
            }}
          />
        )}
      </div>

      {/* ── Bulk Tracker ── */}
      <div className="section bulk-section">
        <h3 className="section-title">Bulk</h3>
        <div className="bulk-tracker">
          <div className="bulk-bar-container">
            <div
              className={`bulk-bar-fill ${isEncumbered ? 'encumbered' : ''} ${isOverloaded ? 'overloaded' : ''}`}
              style={{ width: `${bulkPercent}%` }}
            />
          </div>
          <div className="bulk-labels">
            <span className={`bulk-current ${isEncumbered ? 'encumbered' : ''}`}>
              {currentBulk.toFixed(1)} / {maxBulk} Bulk
            </span>
            <span className="bulk-threshold">Encumbered at {encumberedThreshold} Bulk</span>
            {isEncumbered && !isOverloaded && (
              <span className="bulk-warning">Encumbered!</span>
            )}
            {isOverloaded && (
              <span className="bulk-overloaded">Overloaded!</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Currency ── */}
      <div className="section currency-section">
        <h3 className="section-title">
          Currency
          {canEdit && !editingCurrency && (
            <button className="currency-edit-btn" onClick={startEditCurrency} title="Edit currency">✏️</button>
          )}
        </h3>
        {editingCurrency ? (
          <div className="currency-editor">
            {(['pp', 'gp', 'sp', 'cp'] as const).map(denom => (
              <div key={denom} className="currency-input-group">
                <label>{denom.toUpperCase()}</label>
                <input
                  type="number"
                  min={0}
                  value={currencyInput[denom]}
                  onChange={e => setCurrencyInput({ ...currencyInput, [denom]: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
            ))}
            <div className="currency-actions">
              <button className="currency-save-btn" onClick={saveCurrency}>Save</button>
              <button className="currency-cancel-btn" onClick={() => setEditingCurrency(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="currency-display">
            {currency.pp > 0 && <span className="currency-chip pp">{currency.pp} PP</span>}
            <span className="currency-chip gp">{currency.gp} GP</span>
            <span className="currency-chip sp">{currency.sp} SP</span>
            <span className="currency-chip cp">{currency.cp} CP</span>
          </div>
        )}
      </div>

      {/* ── Consumables Quick-Access ── */}
      {consumables.length > 0 && (
        <div className="section consumables-section">
          <h3 className="section-title">Consumables</h3>
          <div className="consumables-grid">
            {consumables.map(item => (
              <div key={item.id} className="consumable-card">
                <div className="consumable-info">
                  <span className="consumable-name">{item.name}</span>
                  <span className="consumable-qty">×{item.quantity}</span>
                </div>
                {item.level != null && item.level > 0 && (
                  <span className="consumable-level">Lv {item.level}</span>
                )}
                {canEdit && (
                  <button
                    className="consumable-use-btn"
                    onClick={() => consumeItem(item.id)}
                    title="Use one"
                  >
                    Use
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Backpack / Inventory List ── */}
      <div className="section backpack-section">
        <h3 className="section-title">
          Backpack
          {canEdit && (
            <button className="add-item-btn" onClick={addItem} title="Add custom item">+ Add Item</button>
          )}
        </h3>

        {/* Filters */}
        <div className="inventory-filters">
          <input
            type="text"
            className="inventory-search"
            placeholder="Search items..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <div className="category-filters">
            {CATEGORY_FILTERS.map(f => (
              <button
                key={f.value}
                className={`category-filter-btn ${filterCategory === f.value ? 'active' : ''}`}
                onClick={() => setFilterCategory(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item list */}
        <div className="inventory-list">
          {backpackItems.length === 0 ? (
            <div className="empty-message">
              {searchText || filterCategory !== 'all' ? 'No matching items.' : 'Backpack is empty.'}
            </div>
          ) : (
            backpackItems.map(item => (
              <div key={item.id} className="inventory-item-row">
                <div className="item-main">
                  <span className="item-name">{item.name}</span>
                  <div className="item-meta">
                    {item.level != null && item.level > 0 && (
                      <span className="item-level">Lv {item.level}</span>
                    )}
                    <span className="item-category">{item.category}</span>
                    <span className="item-bulk">
                      {item.bulk === 0 ? '—' : item.bulk < 1 ? 'L' : `${item.bulk}B`}
                    </span>
                    {item.quantity > 1 && <span className="item-qty">×{item.quantity}</span>}
                    {item.gpValue != null && <span className="item-price">{item.gpValue} gp</span>}
                  </div>
                </div>
                {canEdit && (
                  <div className="item-actions">
                    {item.slot && (
                      <button
                        className="item-equip-btn"
                        onClick={() => toggleEquip(item.id)}
                        title="Equip"
                      >
                        Equip
                      </button>
                    )}
                    <button
                      className="item-remove-btn"
                      onClick={() => removeItem(item.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
