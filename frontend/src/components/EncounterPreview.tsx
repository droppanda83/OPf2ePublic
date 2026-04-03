import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { GMSession, GameState } from '../../../shared/types';
import './EncounterPreview.css';

const API_BASE = '/api';

interface EncounterPreviewProps {
  gameId: string | null;
  gmSession: GMSession | null;
  onAccept: (encounter: PreviewData) => void;
  onReject: () => void;
  onCancel: () => void;
}

interface PreviewEnemy {
  name: string;
  level: number;
  hp: number;
  description?: string;
}

interface PreviewData {
  difficulty: string;
  enemies: PreviewEnemy[];
  mapName?: string;
  narrativeHook?: string;
  xpReward?: number;
}

export const EncounterPreview: React.FC<EncounterPreviewProps> = ({
  gameId,
  gmSession,
  onAccept,
  onReject,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>(
    gmSession?.campaignPreferences?.encounterBalance || 'moderate'
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPreview = async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/encounter/preview`, {
        difficulty,
      }, { timeout: 30000 });
      setPreview(res.data);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      setError(apiError.response?.data?.error || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPreview, 400);
    return () => clearTimeout(debounceRef.current);
  }, [gameId, difficulty]);

  return (
    <div className="ep-overlay">
      <div className="ep-panel">
        <div className="ep-header">
          <h3>⚔️ Encounter Preview</h3>
          <button className="ep-close" onClick={onCancel}>✕</button>
        </div>

        <div className="ep-difficulty-row">
          <label className="ep-label">Difficulty</label>
          <select
            className="ep-select"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
          >
            <option value="trivial">Trivial</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="extreme">Extreme</option>
          </select>
          <button className="ep-btn ep-btn-reroll" onClick={fetchPreview} disabled={loading}>
            🎲 Reroll
          </button>
        </div>

        <div className="ep-body">
          {loading && (
            <div className="ep-loading">
              <div className="ep-spinner" />
              <span>Generating encounter...</span>
            </div>
          )}

          {error && (
            <div className="ep-error">
              <span>❌ {error}</span>
              <button className="ep-btn ep-btn-retry" onClick={fetchPreview}>Retry</button>
            </div>
          )}

          {!loading && !error && preview && (
            <>
              {preview.narrativeHook && (
                <div className="ep-narrative">
                  <em>{preview.narrativeHook}</em>
                </div>
              )}

              <div className="ep-info-row">
                <span className={`ep-diff-badge ep-diff-${preview.difficulty}`}>
                  {preview.difficulty.toUpperCase()}
                </span>
                {preview.mapName && <span className="ep-map-name">🗺️ {preview.mapName}</span>}
                {preview.xpReward && <span className="ep-xp">✨ {preview.xpReward} XP</span>}
              </div>

              <div className="ep-enemies">
                <h4>Enemies ({preview.enemies.length})</h4>
                {preview.enemies.map((enemy, i) => (
                  <div key={i} className="ep-enemy-card">
                    <div className="ep-enemy-header">
                      <span className="ep-enemy-name">{enemy.name}</span>
                      <span className="ep-enemy-level">Lv{enemy.level}</span>
                      <span className="ep-enemy-hp">❤️ {enemy.hp}</span>
                    </div>
                    {enemy.description && (
                      <div className="ep-enemy-desc">{enemy.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ep-footer">
          <button className="ep-btn ep-btn-reject" onClick={onReject} disabled={loading}>
            ↩️ Different Encounter
          </button>
          <button
            className="ep-btn ep-btn-accept"
            onClick={() => preview && onAccept(preview)}
            disabled={loading || !preview}
          >
            ⚔️ Start Encounter
          </button>
        </div>
      </div>
    </div>
  );
};
