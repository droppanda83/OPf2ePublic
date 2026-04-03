/**
 * EquipmentPicker – Searchable, filterable equipment browser overlay.
 * Replaces plain <select> dropdowns with a rich item picker that supports
 * full-text search, category/slot/level/price filters, and click-to-add.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import './EquipmentPicker.css';

/* ── Generic item shape consumed by the picker ── */
export interface PickerItem {
  id: string;
  name: string;
  price: number;       // in gp
  level?: number;
  category?: string;   // proficiency group, slot, gear-category, consumable-type
  traits?: string[];
  subtitle?: string;   // "1d8 slashing · melee · martial" etc.
}

interface EquipmentPickerProps {
  /** Label shown on the trigger button */
  label: string;
  /** All items that can be picked from */
  items: PickerItem[];
  /** Category filter dimension label (e.g. "Proficiency", "Slot", "Type") */
  categoryLabel?: string;
  /** Unique category values to offer as filters. Auto-detected if omitted. */
  categories?: string[];
  /** Whether to show the level filter slider */
  showLevelFilter?: boolean;
  /** Max character level (for level filter range) */
  maxLevel?: number;
  /** Called when user picks an item */
  onPick: (id: string) => void;
  /** Format gp helper */
  formatGp: (v: number) => string;
  /** Already-selected item IDs (to grey-out or badge) */
  selected?: string[];
  /** Allow picking the same item multiple times */
  allowDuplicates?: boolean;
  /** Controlled open state for embedded picker usage */
  open?: boolean;
  /** Controlled open-state callback */
  onOpenChange?: (open: boolean) => void;
  /** Hide the trigger button when controlled externally */
  hideTrigger?: boolean;
}

export const EquipmentPicker: React.FC<EquipmentPickerProps> = ({
  label, items, categoryLabel, categories: catsProp, showLevelFilter = false,
  maxLevel = 20, onPick, formatGp, selected = [], allowDuplicates = false,
  open: controlledOpen, onOpenChange, hideTrigger = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [maxLevelFilter, setMaxLevelFilter] = useState(maxLevel);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'level'>('name');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  // Detect categories
  const categories = useMemo(() => {
    if (catsProp) return catsProp;
    const set = new Set<string>();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return [...set].sort();
  }, [items, catsProp]);

  // Filtered & sorted results
  const results = useMemo(() => {
    const q = search.toLowerCase().trim();
    let filtered = items.filter(item => {
      // Text search: name + traits + subtitle
      if (q) {
        const haystack = [item.name, item.subtitle ?? '', ...(item.traits ?? [])].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Category filter
      if (selectedCats.size > 0 && item.category && !selectedCats.has(item.category)) return false;
      // Level filter
      if (showLevelFilter && item.level !== undefined && item.level > maxLevelFilter) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'level') return (a.level ?? 0) - (b.level ?? 0);
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [items, search, selectedCats, maxLevelFilter, sortBy, showLevelFilter]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const toggleCategory = (cat: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handlePick = (id: string) => {
    onPick(id);
    // Don't close – user may want to pick multiple items
  };

  if (!open) {
    if (hideTrigger) {
      return null;
    }

    return (
      <button className="eq-picker-trigger" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <div className="eq-picker-overlay" ref={panelRef}>
      <div className="eq-picker-header">
        <h3>{label}</h3>
        <button className="eq-picker-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      {/* Search bar */}
      <div className="eq-picker-search-row">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search by name or trait..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="eq-picker-search"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'price' | 'level')}
          className="eq-picker-sort"
        >
          <option value="name">A-Z</option>
          <option value="price">Price</option>
          {showLevelFilter && <option value="level">Level</option>}
        </select>
      </div>

      {/* Category chips */}
      {categories.length > 1 && (
        <div className="eq-picker-filters">
          {categoryLabel && <span className="eq-picker-filter-label">{categoryLabel}:</span>}
          {categories.map(cat => (
            <button
              key={cat}
              className={`eq-picker-chip ${selectedCats.has(cat) ? 'active' : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
          {selectedCats.size > 0 && (
            <button className="eq-picker-chip clear" onClick={() => setSelectedCats(new Set())}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Level slider */}
      {showLevelFilter && (
        <div className="eq-picker-level-row">
          <span className="eq-picker-filter-label">Max level: {maxLevelFilter}</span>
          <input
            type="range"
            min={0}
            max={maxLevel}
            value={maxLevelFilter}
            onChange={e => setMaxLevelFilter(Number(e.target.value))}
            className="eq-picker-slider"
          />
        </div>
      )}

      {/* Results count */}
      <div className="eq-picker-count">
        {results.length} of {items.length} items
      </div>

      {/* Results list */}
      <div className="eq-picker-results">
        {results.map(item => {
          const alreadyPicked = selected.includes(item.id);
          return (
            <div
              key={item.id}
              className={`eq-picker-item ${alreadyPicked && !allowDuplicates ? 'picked' : ''}`}
              onClick={() => {
                if (!alreadyPicked || allowDuplicates) handlePick(item.id);
              }}
            >
              <div className="eq-picker-item-main">
                <span className="eq-picker-item-name">{item.name}</span>
                {item.level !== undefined && (
                  <span className="eq-picker-item-level">Lv {item.level}</span>
                )}
                <span className="eq-picker-item-price">{formatGp(item.price)}</span>
              </div>
              {item.subtitle && (
                <div className="eq-picker-item-sub">{item.subtitle}</div>
              )}
              {item.traits && item.traits.length > 0 && (
                <div className="eq-picker-item-traits">
                  {item.traits.map(t => (
                    <span key={t} className="eq-picker-trait">{t}</span>
                  ))}
                </div>
              )}
              {alreadyPicked && !allowDuplicates && (
                <span className="eq-picker-badge">✓ Added</span>
              )}
            </div>
          );
        })}
        {results.length === 0 && (
          <div className="eq-picker-empty">No items match your filters.</div>
        )}
      </div>
    </div>
  );
};
