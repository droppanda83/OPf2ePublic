import React, { useState } from 'react';
import './GameLog.css';

interface LogEntry {
  timestamp: number;
  type: string;
  message: string;
  details?: any;
  narrative?: string;
}

interface GameLogProps {
  log: LogEntry[];
}

/** Build a human-readable breakdown from a log entry's details */
const buildTooltipLines = (details: any): string[] => {
  if (!details) return [];
  const lines: string[] = [];

  // --- Skill Check (Feint, etc.) ---
  if (details.details?.d20 !== undefined && details.details?.perceptionDC !== undefined && !details.details?.targetAC) {
    const d = details.details;
    const skillName = d.action === 'feint' ? 'Deception' : 'Unknown';
    const dcType = d.action === 'feint' ? 'Perception DC' : 'DC';
    lines.push(`── ${skillName} Check ──`);
    if (d.heroPointsSpent && d.heroPointsSpent > 0 && d.heroPointMessage) {
      lines.push(`${d.heroPointMessage}`);
      lines.push(`+${d.deceptionBonus} bonus = ${d.total}`);
    } else {
      lines.push(`d20: ${d.d20}  +${d.deceptionBonus} bonus = ${d.total}`);
    }
    lines.push(`vs ${dcType}: ${d.perceptionDC}`);
    lines.push(`Result: ${formatResult(d.result)} (margin ${d.margin >= 0 ? '+' : ''}${d.margin})`);
    if (d.actor && d.target) {
      lines.push(`${d.actor} vs ${d.target}`);
    }
    return lines;
  }

  // --- Strike / Attack Roll ---
  if (details.details?.d20 !== undefined && details.details?.targetAC !== undefined) {
    const d = details.details;
    lines.push(`── Attack Roll ──`);
    if (d.heroPointsSpent && d.heroPointsSpent > 0 && d.heroPointMessage) {
      lines.push(`${d.heroPointMessage}`);
      lines.push(`+${d.bonus} bonus = ${d.total} vs AC ${d.targetAC}`);
    } else {
      lines.push(`d20: ${d.d20}  +${d.bonus} bonus = ${d.total} vs AC ${d.targetAC}`);
    }
    lines.push(`Result: ${formatResult(d.result)} (margin ${d.marginOfSuccess >= 0 ? '+' : ''}${d.marginOfSuccess})`);
    if (d.damage) {
      lines.push(`── Damage ──`);
      lines.push(`Dice: ${d.damage.dice?.results?.join(' + ') || '?'} + ${details.details ? '' : ''}Lv = ${d.damage.total}`);
      if (d.damage.isCriticalHit) lines.push(`CRIT x2 = ${d.damage.appliedDamage}`);
      lines.push(`Applied: ${d.damage.appliedDamage} damage`);
    }
    if (details.targetHealth !== undefined) {
      lines.push(`Target HP: ${details.targetHealth}`);
    }
    return lines;
  }

  // --- Death Save ---
  if (details.details?.dc !== undefined && details.details?.deathSaveSuccesses !== undefined) {
    const d = details.details;
    lines.push(`── Death Save ──`);
    if (d.heroPointsSpent && d.heroPointsSpent > 0 && d.heroPointMessage) {
      lines.push(`${d.heroPointMessage}`);
      lines.push(`vs DC ${d.dc}`);
    } else {
      lines.push(`d20: ${d.d20} vs DC ${d.dc}`);
    }
    lines.push(`Result: ${formatResult(d.result)}`);
    lines.push(`Successes: ${d.deathSaveSuccesses}/3  Failures: ${d.deathSaveFailures}/3`);
    lines.push(`Still dying: ${d.isDying ? 'Yes' : 'No'}`);
    return lines;
  }

  // --- Fireball / AoE ---
  if (details.baseRoll !== undefined && details.results !== undefined) {
    lines.push(`── Fireball ──`);
    if (details.centerPosition) {
      lines.push(`Center: (${details.centerPosition.x}, ${details.centerPosition.y})  Radius: ${details.aoeRadius} sq`);
    }
    lines.push(`Base damage: ${details.baseRoll.total} (${details.baseRoll.results?.join(' + ') || '0'})`);
    lines.push(`Targets hit: ${details.targetCount}`);
    if (details.results.length > 0) {
      lines.push(`── Per-Target ──`);
      details.results.forEach((r: any) => {
        lines.push(`${r.targetName}: Save d20 ${r.saveRoll} +${r.saveBonus} = ${r.saveTotal} → ${formatResult(r.saveResult)}`);
        lines.push(`  Damage: ${r.damage}  HP: ${r.targetHealth}${r.status || ''}`);
      });
    }
    return lines;
  }

  // --- Magic Missile ---
  if (details.damage?.formula !== undefined) {
    lines.push(`── Magic Missile ──`);
    lines.push(`Auto-hit (no attack roll)`);
    lines.push(`Formula: ${details.damage.formula}`);
    lines.push(`Rolls: ${details.damage.rolls?.join(' + ') || '?'} = ${details.damage.amount}`);
    lines.push(`Type: ${details.damage.type}`);
    if (details.targetHealth !== undefined) {
      lines.push(`Target HP: ${details.targetHealth}`);
    }
    return lines;
  }

  // --- Shield ---
  if (details.acBonus !== undefined) {
    lines.push(`── Shield ──`);
    lines.push(`AC Bonus: +${details.acBonus} for 1 round`);
    return lines;
  }

  // --- Movement ---
  if (details.movementCost !== undefined) {
    lines.push(`── Movement ──`);
    lines.push(`Destination: (${details.newPosition?.x}, ${details.newPosition?.y})`);
    lines.push(`Distance: ${details.movementCost.toFixed(1)} squares`);
    return lines;
  }

  // Fallback: dump any keys we recognize
  if (details.success !== undefined) {
    lines.push(`Success: ${details.success}`);
  }
  if (details.details?.heroPointMessage || details.details?.heroPointsSpent) {
    const hp = details.details;
    lines.push(`Hero Points: ${hp.heroPointMessage || `Spent ${hp.heroPointsSpent}`}`);
  }
  if (details.message && lines.length === 0) {
    lines.push(details.message);
  }

  return lines;
};

const formatResult = (result: string): string => {
  switch (result) {
    case 'critical-success': return '⭐ CRITICAL SUCCESS';
    case 'success': return '✓ Success';
    case 'failure': return '✗ Failure';
    case 'critical-failure': return '⚰️ CRITICAL FAILURE';
    default: return result;
  }
};

const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  const handleEntryHover = (e: React.MouseEvent, index: number) => {
    if (index === hoveredIdx) return; // Already hovering
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 4, // 4px below the entry
      left: rect.left
    });
    setHoveredIdx(index);
  };

  return (
    <div className="game-log">
      <h3>📜 Combat Log</h3>
      <div ref={scrollRef} className="log-output">
        {log?.map((entry, i) => {
          const hasDetails = entry.details && Object.keys(entry.details).length > 0;
          const tooltipLines = hasDetails ? buildTooltipLines(entry.details) : [];
          const showTooltip = hoveredIdx === i && tooltipLines.length > 0;

          return (
            <div
              key={i}
              className={`log-entry ${entry.type} ${hasDetails ? 'has-details' : ''}`}
              onMouseEnter={(e) => handleEntryHover(e, i)}
              onMouseLeave={() => {
                setHoveredIdx(null);
                setTooltipPos(null);
              }}
            >
              <span className="log-message">{entry.message}</span>
              {hasDetails && <span className="log-detail-hint"> 🔍</span>}
              {entry.narrative && (
                <div className="log-narrative">
                  🎭 {entry.narrative}
                </div>
              )}
              {showTooltip && tooltipPos && (
                <div className="log-tooltip" style={{ top: tooltipPos.top, left: tooltipPos.left }}>
                  {tooltipLines.map((line, j) => (
                    <div key={j} className={`tooltip-line ${line.startsWith('──') ? 'tooltip-header' : ''}`}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(GameLog);
