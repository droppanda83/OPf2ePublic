/**
 * C.2 — Extracted icon components from ActionPanel.
 * PF2eActionDiamond, PF2eReactionIcon, PF2eHeroPoints, ActionCostIcon
 */
import React from 'react';

/** PF2e Action Diamond – shows 1-3 diamond icons for action cost */
export const PF2eActionDiamond: React.FC<{ count: number; used?: number }> = ({ count, used = 0 }) => {
  const usedCount = Math.min(3, Math.max(0, used));
  const baseColor = 'currentColor';
  const usedFill = 'rgba(0, 0, 0, 0.55)';

  const diamondWidth = 22;
  const diamondHeight = 26;
  const overlap = 6;
  const startX = 0;
  const startY = 4;

  const renderDiamond = (x: number, y: number, usedState: boolean) => {
    const cx = x + diamondWidth / 2;
    const cy = y + diamondHeight / 2;
    const opacity = usedState ? 0.35 : 0.95;
    const fill = usedState ? usedFill : baseColor;

    return (
      <g key={`${x}-${y}`}>
        <polygon
          points={`${cx},${y} ${x + diamondWidth},${cy} ${cx},${y + diamondHeight} ${x},${cy}`}
          fill={fill}
          stroke={baseColor}
          strokeWidth={1.2}
          opacity={opacity}
        />
        {!usedState && (
          <polygon
            points={`${cx},${y + 1} ${x + diamondWidth - 2},${cy} ${cx},${cy} ${x + 2},${cy}`}
            fill="rgba(255,255,255,0.15)"
          />
        )}
      </g>
    );
  };

  const diamonds = Array.from({ length: count }).map((_, i) => {
    const x = startX + i * (diamondWidth - overlap);
    const usedState = i >= (count - usedCount);
    return renderDiamond(x, startY, usedState);
  });

  const svgWidth = diamondWidth + (count - 1) * (diamondWidth - overlap);
  const svgHeight = diamondHeight + startY * 2;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="pf2e-action-diamonds"
      style={{ width: `${svgWidth * 0.8}px`, height: `${svgHeight * 0.8}px` }}
    >
      {diamonds}
    </svg>
  );
};

/** PF2e Reaction Icon – single diamond with R */
export const PF2eReactionIcon: React.FC<{ used?: boolean }> = ({ used = false }) => {
  const size = 22;
  const center = size / 2;
  const diamond = `${center},2 ${size - 2},${center} ${center},${size - 2} 2,${center}`;
  const opacity = used ? 0.35 : 0.95;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: '20px', height: '20px' }}
      className="pf2e-reaction-icon"
    >
      <polygon
        points={diamond}
        fill="#7c5ce1"
        stroke="#c9b8ff"
        strokeWidth="1"
        opacity={opacity}
      />
      {!used && (
        <polygon
          points={`${center},3 ${size - 4},${center} ${center},${center} 4,${center}`}
          fill="rgba(255,255,255,0.18)"
        />
      )}
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fill={used ? '#c9b8ff' : '#1e1e1e'}
        fontSize="12"
        fontWeight="bold"
        opacity={opacity}
      >
        R
      </text>
    </svg>
  );
};

/** PF2e Hero Points – up to 3 circles, selectable spend */
export const PF2eHeroPoints: React.FC<{
  count: number;
  selectedSpend: number;
  onSelectSpend: (value: number) => void;
}> = ({ count, selectedSpend, onSelectSpend }) => {
  const maxHeroPoints = 3;
  const filledCount = Math.min(Math.max(count, 0), maxHeroPoints);
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {Array(maxHeroPoints).fill(null).map((_, index) => {
        const spendValue = index + 1;
        const usedState = index >= filledCount;
        const isSelected = spendValue === selectedSpend;
        const opacity = usedState ? 0.35 : 0.95;
        const canSelect = !usedState;
        const tooltipText = canSelect ? `Spend ${spendValue} Hero Point${spendValue === 1 ? '' : 's'}` : 'No Hero Points';
        return (
          <svg
            key={index}
            viewBox="0 0 24 24"
            style={{
              width: '24px',
              height: '24px',
              cursor: canSelect ? 'pointer' : 'not-allowed',
              filter: isSelected ? 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' : 'none'
            }}
            onClick={() => {
              if (!canSelect) return;
              onSelectSpend(isSelected ? 0 : spendValue);
            }}
          >
            <title>{tooltipText}</title>
            <circle
              cx="12"
              cy="12"
              r="10"
              fill={usedState ? 'rgba(60, 10, 10, 0.6)' : '#d64545'}
              stroke={isSelected ? '#ffd700' : usedState ? '#7a2b2b' : '#ff9b9b'}
              strokeWidth={isSelected ? '2' : '1'}
              opacity={opacity}
            />
            <text
              x="12"
              y="15"
              textAnchor="middle"
              fill={usedState ? 'rgba(255,255,255,0.45)' : '#2a0b0b'}
              fontSize="12"
              fontWeight="bold"
              opacity={opacity}
            >
              H
            </text>
          </svg>
        );
      })}
    </div>
  );
};

/** Inline action cost icon – small diamonds showing AP cost */
export const ActionCostIcon: React.FC<{ cost: number }> = ({ cost }) => {
  const dw = 10;
  const dh = 12;
  const ov = 3;
  const count = Math.min(cost, 3);
  const svgW = dw + (count - 1) * (dw - ov);
  const svgH = dh + 4;
  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: `${svgW}px`, height: `${svgH}px`, verticalAlign: 'middle', flexShrink: 0 }}
      className="action-cost-icon"
    >
      {Array.from({ length: count }).map((_, i) => {
        const x = i * (dw - ov);
        const cx = x + dw / 2;
        const cy = 2 + dh / 2;
        return (
          <polygon
            key={i}
            points={`${cx},2 ${x + dw},${cy} ${cx},${2 + dh} ${x},${cy}`}
            fill="#0dd"
            stroke="#0dd"
            strokeWidth="0.6"
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
};
