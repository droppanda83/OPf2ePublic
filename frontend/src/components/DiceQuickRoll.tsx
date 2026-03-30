import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDiceRoller, type DieType, type DieResult } from './DiceRollerContext';
import './DiceQuickRoll.css';

const DIE_OPTIONS: { type: DieType; label: string; max: number; color: string }[] = [
  { type: 'd4',  label: 'D4',  max: 4,  color: '#c0392b' },
  { type: 'd6',  label: 'D6',  max: 6,  color: '#2980b9' },
  { type: 'd8',  label: 'D8',  max: 8,  color: '#27ae60' },
  { type: 'd10', label: 'D10', max: 10, color: '#8e44ad' },
  { type: 'd12', label: 'D12', max: 12, color: '#d35400' },
  { type: 'd20', label: 'D20', max: 20, color: '#2c3e50' },
];

const DiceQuickRoll: React.FC = () => {
  const { rollDice, isRolling } = useDiceRoller();
  const [open, setOpen] = useState(false);
  const [selectedDie, setSelectedDie] = useState<DieType>('d20');
  const [count, setCount] = useState(1);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleRoll = useCallback(async () => {
    const info = DIE_OPTIONS.find(d => d.type === selectedDie)!;
    const dice: DieResult[] = Array.from({ length: count }, () => ({
      type: selectedDie,
      value: Math.floor(Math.random() * info.max) + 1,
    }));
    const total = dice.reduce((s, d) => s + d.value, 0);
    setOpen(false);
    await rollDice({
      dice,
      label: `Quick Roll — ${count}${info.label}`,
      total,
    });
  }, [selectedDie, count, rollDice]);

  return (
    <div className="dqr-wrapper" ref={popupRef}>
      {/* The D20 image button */}
      <button
        type="button"
        className="dqr-d20-btn"
        onClick={() => setOpen(o => !o)}
        title="Quick Dice Roller"
        aria-label="Open dice roller"
      >
        <img
          src="/D20-removebg-preview.png"
          alt="Roll Dice"
          className="dqr-d20-img"
        />
      </button>

      {/* Popup selector */}
      {open && (
        <div className="dqr-popup">
          <div className="dqr-header">Quick Dice Roller</div>

          {/* Die type selector */}
          <div className="dqr-die-grid">
            {DIE_OPTIONS.map(d => (
              <button
                key={d.type}
                type="button"
                className={`dqr-die-btn ${selectedDie === d.type ? 'selected' : ''}`}
                style={{
                  '--die-color': d.color,
                  borderColor: selectedDie === d.type ? d.color : undefined,
                } as React.CSSProperties}
                onClick={() => setSelectedDie(d.type)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Count selector */}
          <div className="dqr-count-row">
            <label className="dqr-count-label">Number of dice</label>
            <div className="dqr-count-controls">
              <button
                type="button"
                className="dqr-count-btn"
                disabled={count <= 1}
                onClick={() => setCount(c => Math.max(1, c - 1))}
              >−</button>
              <span className="dqr-count-value">{count}</span>
              <button
                type="button"
                className="dqr-count-btn"
                disabled={count >= 10}
                onClick={() => setCount(c => Math.min(10, c + 1))}
              >+</button>
            </div>
          </div>

          {/* Roll button */}
          <button
            type="button"
            className="dqr-roll-btn"
            disabled={isRolling}
            onClick={handleRoll}
          >
            {isRolling ? 'Rolling...' : `Roll ${count}${DIE_OPTIONS.find(d => d.type === selectedDie)!.label}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default DiceQuickRoll;
