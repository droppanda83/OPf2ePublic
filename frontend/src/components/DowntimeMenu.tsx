import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { GMSession, GameState } from '../../../shared/types';
import './DowntimeMenu.css';

const API_BASE = '/api';

interface DowntimeMenuProps {
  gameId: string | null;
  gmSession: GMSession | null;
  gameState: GameState | null;
  onSessionUpdate: (session: GMSession) => void;
  onGameStateUpdate?: (game: GameState) => void;
  onClose: () => void;
}

interface DowntimeActivity {
  id: string;
  name: string;
  icon: string;
  description: string;
  daysRequired: number;
  dcLevel?: string;
  outcome?: string;
}

const CORE_ACTIVITIES: DowntimeActivity[] = [
  { id: 'craft', name: 'Craft', icon: '🔨', description: 'Create mundane or magical items using your crafting skill', daysRequired: 4 },
  { id: 'earn-income', name: 'Earn Income', icon: '💰', description: 'Use a trained skill to earn money during downtime', daysRequired: 1 },
  { id: 'treat-disease', name: 'Treat Disease', icon: '🩺', description: 'Spend time using Medicine to help an ally recover from disease', daysRequired: 1 },
  { id: 'retrain', name: 'Retrain', icon: '📖', description: 'Replace a feat, skill, or class feature over time', daysRequired: 7 },
  { id: 'learn-spell', name: 'Learn a Spell', icon: '✨', description: 'Add a new spell to your repertoire or spellbook', daysRequired: 1 },
  { id: 'subsist', name: 'Subsist', icon: '🍞', description: 'Find food and shelter using Survival or Society', daysRequired: 1 },
  { id: 'gather-info', name: 'Gather Information', icon: '🔍', description: 'Spend time in town to learn rumors and gather intel', daysRequired: 1 },
  { id: 'buy-sell', name: 'Buy & Sell', icon: '🏪', description: 'Visit merchants to buy supplies or sell loot', daysRequired: 0 },
  { id: 'long-rest', name: 'Extended Rest', icon: '🏕️', description: 'Rest and recover fully, heal all HP and conditions', daysRequired: 1 },
  { id: 'socialize', name: 'Socialize', icon: '🗣️', description: 'Spend time with NPCs to build relationships', daysRequired: 1 },
];

export const DowntimeMenu: React.FC<DowntimeMenuProps> = ({
  gameId,
  gmSession,
  gameState,
  onSessionUpdate,
  onGameStateUpdate,
  onClose,
}) => {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [daysToSpend, setDaysToSpend] = useState(1);
  const [performing, setPerforming] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);
  const [customActivities, setCustomActivities] = useState<DowntimeActivity[]>([]);

  // Fetch content-generated downtime activities
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/game/${gameId}/gm/downtime/activities`);
        if (!cancelled && res.data.activities) {
          setCustomActivities(res.data.activities);
        }
      } catch { /* optional */ }
    })();
    return () => { cancelled = true; };
  }, [gameId]);

  const allActivities = [...CORE_ACTIVITIES, ...customActivities];
  const active = allActivities.find(a => a.id === selectedActivity);

  const performActivity = async () => {
    if (!gameId || !selectedActivity || performing) return;
    setPerforming(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/downtime/perform`, {
        activityId: selectedActivity,
        days: daysToSpend,
      });
      setResult({ message: res.data.narrative || res.data.message || 'Activity completed.', success: true });
      if (res.data.gmSession) onSessionUpdate(res.data.gmSession);
      if (res.data.gameState && onGameStateUpdate) onGameStateUpdate(res.data.gameState);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      setResult({ message: apiError.response?.data?.error || 'Failed to perform activity', success: false });
    } finally {
      setPerforming(false);
    }
  };

  const players = gameState?.creatures?.filter(c => c.type === 'player') || [];

  return (
    <div className="dt-overlay">
      <div className="dt-panel">
        <div className="dt-header">
          <h3>🏛️ Downtime Activities</h3>
          <button className="dt-close" onClick={onClose}>✕</button>
        </div>

        <div className="dt-body">
          {/* Activity Grid */}
          <div className="dt-grid">
            {allActivities.map(act => (
              <button
                key={act.id}
                className={`dt-activity-card ${selectedActivity === act.id ? 'selected' : ''}`}
                onClick={() => { setSelectedActivity(act.id); setResult(null); }}
              >
                <span className="dt-act-icon">{act.icon}</span>
                <span className="dt-act-name">{act.name}</span>
                {act.daysRequired > 0 && (
                  <span className="dt-act-days">{act.daysRequired}d</span>
                )}
              </button>
            ))}
          </div>

          {/* Selected Activity Detail */}
          {active && (
            <div className="dt-detail">
              <div className="dt-detail-header">
                <span className="dt-detail-icon">{active.icon}</span>
                <div>
                  <h4>{active.name}</h4>
                  <p>{active.description}</p>
                </div>
              </div>

              {active.daysRequired > 0 && (
                <div className="dt-days-row">
                  <label className="dt-label">Days to spend</label>
                  <div className="dt-days-control">
                    <button
                      className="dt-days-btn"
                      onClick={() => setDaysToSpend(Math.max(1, daysToSpend - 1))}
                    >−</button>
                    <span className="dt-days-value">{daysToSpend}</span>
                    <button
                      className="dt-days-btn"
                      onClick={() => setDaysToSpend(Math.min(30, daysToSpend + 1))}
                    >+</button>
                  </div>
                </div>
              )}

              <button
                className="dt-perform-btn"
                onClick={performActivity}
                disabled={performing}
              >
                {performing ? '⏳ Performing...' : `Perform ${active.name}`}
              </button>

              {/* Result */}
              {result && (
                <div className={`dt-result ${result.success ? 'success' : 'failure'}`}>
                  {result.message}
                </div>
              )}
            </div>
          )}

          {/* Party Status */}
          <div className="dt-party-status">
            <h4>Party Status</h4>
            {players.map(p => (
              <div key={p.id} className="dt-party-row">
                <span className="dt-party-name">{p.name}</span>
                <span className="dt-party-hp">
                  ❤️ {p.currentHealth}/{p.maxHealth}
                </span>
                {p.conditions && p.conditions.length > 0 && (
                  <span className="dt-party-conditions">
                    {p.conditions.map((c) => c.name).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
