import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { subscribeToGameEvents, updateGMSettings } from '../services/apiService';
import { MapBrowser } from './MapBrowser';
import { CompanionPanel } from './CompanionPanel';
import type {
  GMSession,
  GameState,
  TensionBand,
} from '../../../shared/types';
import type { GameEvent, GameEventStreamMessage } from '../../../shared/events';
import './CampaignDashboard.css';

const API_BASE = '/api';

interface CampaignDashboardProps {
  gameId: string | null;
  gmSession: GMSession | null;
  gameState: GameState | null;
  onSessionUpdate: (session: GMSession) => void;
  onNavigateToChat: () => void;
  onNavigateToDowntime: () => void;
}

function getTensionBand(score: number): TensionBand {
  if (score <= 30) return 'low';
  if (score <= 60) return 'mid';
  if (score <= 85) return 'high';
  return 'critical';
}

const PHASE_ICONS: Record<string, string> = {
  exploration: '🔍',
  combat: '⚔️',
  social: '🗣️',
  rest: '🏕️',
  travel: '🗺️',
  downtime: '🏛️',
};

const PHASE_LABELS: Record<string, string> = {
  exploration: 'Exploration',
  combat: 'Combat',
  social: 'Social',
  rest: 'Rest',
  travel: 'Travel',
  downtime: 'Downtime',
};

function formatLiveEvent(event: GameEvent): string {
  switch (event.type) {
    case 'world:tension-changed':
      return `Tension ${event.previousScore} -> ${event.newScore} (${event.reason})`;
    case 'world:time-advanced':
      return `Time advanced ${event.amount} ${event.unit} (${event.reason})`;
    case 'world:quest-updated':
      return `Quest updated: ${event.title}`;
    case 'exploration:travel':
      return `${event.creatureName} traveled ${event.pathLength} step(s)`;
    case 'exploration:room-entered':
      return `${event.creatureName} entered a new area`;
    case 'exploration:social-started':
      return `Social scene started${event.npcName ? ` with ${event.npcName}` : ''}`;
    case 'downtime:crafting-complete':
      return `Crafting completed: ${event.itemName}`;
    case 'downtime:income-earned':
      return `Earn Income resolved (${event.daysSpent} day(s))`;
    case 'downtime:retrain-complete':
      return `Retraining completed`;
    case 'downtime:rumor-heard':
      return `Rumor heard`;
    case 'combat:started':
      return `Combat started (${event.creatureCount} combatants)`;
    case 'combat:ended':
      return `Combat ended (${event.outcome ?? 'inconclusive'})`;
    case 'action:executed':
      return `${event.actorName} used ${event.actionId}`;
    case 'creature:dead':
      return `${event.creatureName} died`;
    case 'creature:dying':
      return `${event.creatureName} is dying`;
    default:
      return event.type;
  }
}

export const CampaignDashboard: React.FC<CampaignDashboardProps> = ({
  gameId,
  gmSession,
  gameState,
  onSessionUpdate,
  onNavigateToChat,
  onNavigateToDowntime,
}) => {
  const [worldState, setWorldState] = useState<{
    quests: { id: string; title: string; status: string; description: string }[];
    calendar: { day: number; season: string; timeOfDay: string };
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [tensionHistory, setTensionHistory] = useState<number[]>([]);
  const [showMapBrowser, setShowMapBrowser] = useState(false);
  const [showCompanionPanel, setShowCompanionPanel] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const [liveEvents, setLiveEvents] = useState<string[]>([]);
  const tensionHistoryRef = useRef<number[]>([]);

  // Track tension changes over time
  useEffect(() => {
    if (!gmSession) return;
    const score = gmSession.tensionTracker.score;
    const hist = tensionHistoryRef.current;
    if (hist.length === 0 || hist[hist.length - 1] !== score) {
      const next = [...hist, score].slice(-20); // keep last 20 data points
      tensionHistoryRef.current = next;
      setTensionHistory(next);
    }
  }, [gmSession, gmSession?.tensionTracker?.score]);

  // Fetch world state summary
  const fetchWorldState = useCallback(async () => {
    if (!gameId) return;
    try {
      const res = await axios.get(`${API_BASE}/game/${gameId}/gm/world-state`);
      setWorldState(res.data);
    } catch {
      // Not critical — dashboard still works without it
    }
  }, [gameId]);

  useEffect(() => {
    fetchWorldState();
  }, [fetchWorldState, gmSession?.encounterCount]);

  useEffect(() => {
    if (!gameId) return;

    setLiveStatus('connecting');
    const source = subscribeToGameEvents(gameId);

    source.onopen = () => {
      setLiveStatus('live');
    };

    source.onerror = () => {
      setLiveStatus('disconnected');
    };

    source.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as GameEventStreamMessage;
        if (payload.kind !== 'game-event' || !payload.event) return;

        setLiveEvents(prev => [formatLiveEvent(payload.event as GameEvent), ...prev].slice(0, 6));

        if (payload.event.type.startsWith('world:')) {
          fetchWorldState();
        }
      } catch {
        // Ignore malformed stream frames and keep the connection alive.
      }
    };

    return () => {
      source.close();
    };
  }, [gameId, fetchWorldState]);

  // Save a runtime GM setting
  const handleSettingChange = async (key: string, value: string | boolean) => {
    if (!gameId || !gmSession) return;
    setSettingsSaving(true);
    try {
      await updateGMSettings(gameId, { [key]: value });
      // Update local gmSession
      onSessionUpdate({ ...gmSession, [key]: value } as GMSession);
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!gmSession) {
    return (
      <div className="cd-empty">
        <div className="cd-empty-icon">📊</div>
        <div className="cd-empty-text">No active campaign. Start a Session Zero to begin.</div>
      </div>
    );
  }

  const prefs = gmSession.campaignPreferences;
  const tension = gmSession.tensionTracker;
  const tensionBand = getTensionBand(tension.score);
  const players = gameState?.creatures?.filter(c => c.type === 'player') || [];
  const npcs = gmSession.recurringNPCs || [];
  const phase = gmSession.currentPhase;
  const storyArc = gmSession.storyArc;
  const storyPhases = ['setup', 'rising-action', 'climax', 'resolution'];
  const storyIdx = storyArc ? storyPhases.indexOf(storyArc.storyPhase) : -1;

  return (
    <div className="campaign-dashboard">
      {/* Header */}
      <div className="cd-header">
        <div className="cd-title-row">
          <h2 className="cd-campaign-name">{prefs.campaignName || 'Unnamed Campaign'}</h2>
          <span className={`cd-mode-badge cd-mode-${phase}`}>
            {PHASE_ICONS[phase] || '📍'} {PHASE_LABELS[phase] || phase}
          </span>
        </div>
        <div className="cd-meta">
          <span>Tone: {prefs.tone}</span>
          <span>•</span>
          <span>Encounters: {gmSession.encounterCount}</span>
          <span>•</span>
          <span>XP Awarded: {gmSession.xpAwarded}</span>
          <button className="cd-refresh-btn" onClick={fetchWorldState} title="Refresh world state">🔄</button>
          <button className="cd-settings-btn" onClick={() => setShowSettings(!showSettings)} title="Campaign settings">⚙️</button>
        </div>

        {/* Settings Panel (collapsible) */}
        {showSettings && (
          <div className="cd-settings-panel">
            <div className="cd-setting-row">
              <label className="cd-setting-label">AI GM Mode</label>
              <select
                className="cd-setting-select"
                value={gmSession.companionAI || 'full'}
                onChange={e => handleSettingChange('companionAI', e.target.value)}
                disabled={settingsSaving}
              >
                <option value="full">Full AI GM</option>
                <option value="assisted">Assisted (AI suggests)</option>
                <option value="manual">Manual (AI off)</option>
              </select>
            </div>
            <div className="cd-setting-row">
              <label className="cd-setting-label">Narration</label>
              <select
                className="cd-setting-select"
                value={gmSession.narrationVerbosity || 'standard'}
                onChange={e => handleSettingChange('narrationVerbosity', e.target.value)}
                disabled={settingsSaving}
              >
                <option value="brief">Brief</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
                <option value="elaborate">Elaborate</option>
              </select>
            </div>
            <div className="cd-setting-row">
              <label className="cd-setting-label">Rule Citations</label>
              <input
                type="checkbox"
                className="cd-setting-checkbox"
                checked={gmSession.ruleCitations ?? false}
                onChange={e => handleSettingChange('ruleCitations', e.target.checked)}
                disabled={settingsSaving}
              />
            </div>
            <div className="cd-setting-row">
              <label className="cd-setting-label">Loot Level</label>
              <select
                className="cd-setting-select"
                value={gmSession.lootLevel || 'standard'}
                onChange={e => handleSettingChange('lootLevel', e.target.value)}
                disabled={settingsSaving}
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="cd-grid">
        {/* Party */}
        <div className="cd-card">
          <h3 className="cd-card-title">🧙 Party ({players.length})</h3>
          <div className="cd-party-list">
            {players.map(p => (
              <div key={p.id} className="cd-party-member">
                <span className="cd-pm-name">{p.name}</span>
                <span className="cd-pm-level">Lv{p.level}</span>
                <div className="cd-pm-hp-bar">
                  <div
                    className="cd-pm-hp-fill"
                    style={{ width: `${Math.max(0, (p.currentHealth / p.maxHealth) * 100)}%` }}
                  />
                </div>
                <span className="cd-pm-hp">{p.currentHealth}/{p.maxHealth}</span>
              </div>
            ))}
            {players.length === 0 && (
              <div className="cd-empty-text" style={{ fontSize: 10 }}>No players loaded</div>
            )}
          </div>
        </div>

        {/* Tension */}
        <div className="cd-card">
          <h3 className="cd-card-title">🔥 Tension</h3>
          <div className="cd-tension">
            <div className="cd-tension-bar">
              <div className={`cd-tension-fill cd-tension-${tensionBand}`} style={{ width: `${tension.score}%` }} />
            </div>
            <div className="cd-tension-info">
              <span className={`cd-tension-score cd-tension-${tensionBand}`}>{tension.score}</span>
              <span className="cd-tension-label">{tensionBand.toUpperCase()}</span>
            </div>
            <div className="cd-tension-trend">
              {tension.trend === 'rising' ? '📈 Rising' : tension.trend === 'falling' ? '📉 Falling' : '➡️ Stable'}
            </div>
            {/* Tension sparkline */}
            {tensionHistory.length > 1 && (
              <svg className="cd-tension-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke={tensionBand === 'critical' ? '#e04040' : tensionBand === 'high' ? '#e8a020' : '#60a060'}
                  strokeWidth="2"
                  points={tensionHistory.map((v, i) => 
                    `${(i / (tensionHistory.length - 1)) * 100},${30 - (v / 100) * 30}`
                  ).join(' ')}
                />
              </svg>
            )}
          </div>
        </div>

        {/* Story Arc */}
        <div className="cd-card">
          <h3 className="cd-card-title">📜 Story Arc</h3>
          {storyArc ? (
            <div className="cd-story">
              <div className="cd-story-bbeg"><strong>BBEG:</strong> {storyArc.bbegName}</div>
              <div className="cd-story-motivation">{storyArc.bbegMotivation}</div>
              {storyArc.keyLocations.length > 0 && (
                <div className="cd-story-locations">📍 {storyArc.keyLocations.join(', ')}</div>
              )}
              <div className="cd-story-phase-bar">
                {storyPhases.map((sp, idx) => (
                  <div
                    key={sp}
                    className={`cd-story-phase-dot ${
                      idx < storyIdx ? 'completed' : idx === storyIdx ? 'current' : ''
                    }`}
                    title={sp.replace('-', ' ')}
                  />
                ))}
                <span className="cd-story-phase-label">{storyArc.storyPhase.replace('-', ' ')}</span>
              </div>
            </div>
          ) : (
            <div className="cd-empty-text" style={{ fontSize: 10 }}>No story arc set</div>
          )}
        </div>

        {/* NPCs */}
        <div className="cd-card">
          <h3 className="cd-card-title">👥 NPCs ({npcs.length})</h3>
          <div className="cd-npc-list">
            {npcs.slice(0, 8).map(npc => (
              <div key={npc.id} className="cd-npc-row">
                <span className={`cd-npc-role cd-role-${npc.role}`}>{npc.role}</span>
                <span className="cd-npc-name">{npc.name}</span>
                <span className="cd-npc-disp">
                  {npc.disposition > 50 ? '😊' : npc.disposition > 0 ? '😐' : '😠'}
                </span>
              </div>
            ))}
            {npcs.length > 8 && (
              <div className="cd-more">+{npcs.length - 8} more</div>
            )}
            {npcs.length === 0 && (
              <div className="cd-empty-text" style={{ fontSize: 10 }}>No recurring NPCs yet</div>
            )}
          </div>
        </div>

        {/* Quests (from world state) */}
        <div className="cd-card">
          <h3 className="cd-card-title">📋 Active Quests</h3>
          <div className="cd-quest-list">
            {worldState?.quests?.filter(q => q.status !== 'completed').slice(0, 5).map(q => (
              <div key={q.id} className="cd-quest-row">
                <span className={`cd-quest-status cd-quest-${q.status}`}>
                  {q.status === 'active' ? '🔵' : q.status === 'failed' ? '🔴' : '⚪'}
                </span>
                <span className="cd-quest-title">{q.title}</span>
              </div>
            )) || (
              <div className="cd-empty-text" style={{ fontSize: 10 }}>Quests emerge as you play</div>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="cd-card">
          <h3 className="cd-card-title">📅 In-Game Time</h3>
          {worldState?.calendar ? (
            <div className="cd-calendar">
              <div className="cd-cal-day">Day {worldState.calendar.day}</div>
              <div className="cd-cal-season">{worldState.calendar.season}</div>
              <div className="cd-cal-time">{worldState.calendar.timeOfDay}</div>
            </div>
          ) : (
            <div className="cd-calendar">
              <div className="cd-cal-day">Day 1</div>
              <div className="cd-cal-season">Pharast (Spring)</div>
              <div className="cd-cal-time">Morning</div>
            </div>
          )}
        </div>

        <div className="cd-card">
          <h3 className="cd-card-title">📡 Live Event Feed</h3>
          <div style={{ fontSize: 11, color: liveStatus === 'live' ? '#7bd87b' : liveStatus === 'connecting' ? '#d4af37' : '#cc5050', marginBottom: 8 }}>
            {liveStatus === 'live' ? 'Connected' : liveStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </div>
          {liveEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {liveEvents.map((entry, index) => (
                <div key={`${entry}-${index}`} style={{ fontSize: 11, color: '#b0a090', lineHeight: 1.4 }}>
                  {entry}
                </div>
              ))}
            </div>
          ) : (
            <div className="cd-empty-text" style={{ fontSize: 10 }}>Waiting for live game events</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="cd-actions">
        <button className="cd-action-btn" onClick={onNavigateToChat}>
          🎭 GM Chat
        </button>
        <button className="cd-action-btn" onClick={onNavigateToDowntime}>
          🏛️ Downtime
        </button>
        <button className="cd-action-btn" onClick={() => setShowMapBrowser(true)}>
          🗺️ Maps
        </button>
        <button className="cd-action-btn" onClick={() => setShowCompanionPanel(true)}>
          👥 Party & NPCs
        </button>
      </div>

      {/* Map Browser modal */}
      {showMapBrowser && (
        <MapBrowser
          onSelectMap={(mapId, _mapName) => {
            // Store selected map on the GM session
            if (gameId) {
              axios.post(`${API_BASE}/game/${gameId}/gm/map`, { mapId }).catch(() => {});
            }
            setShowMapBrowser(false);
          }}
          partyLevel={players.length > 0 ? players[0].level : 1}
          campaignId={gameId || undefined}
          campaignMode
          selectedMapId={gmSession.currentEncounterMapId}
          asModal
          onClose={() => setShowMapBrowser(false)}
        />
      )}

      {/* Companion Panel modal */}
      {showCompanionPanel && (
        <CompanionPanel
          gmSession={gmSession}
          gameState={gameState}
          onClose={() => setShowCompanionPanel(false)}
        />
      )}

      {/* Session Notes (recent) */}
      {gmSession.sessionNotes.length > 0 && (
        <div className="cd-notes-section">
          <h3 className="cd-card-title">📝 Recent Notes</h3>
          <div className="cd-notes-list">
            {gmSession.sessionNotes.slice(-3).reverse().map(note => (
              <div key={note.id} className="cd-note">
                <span className="cd-note-title">#{note.sessionNumber}: {note.title}</span>
                <span className="cd-note-summary">{note.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
