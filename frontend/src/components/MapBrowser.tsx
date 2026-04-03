/**
 * MapBrowser — Allows players/GMs to browse, filter, and select Foundry VTT maps.
 * Used in encounter setup (player picks) and campaign mode (GM/AI assisted).
 */
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = '/api';

interface MapSummary {
  id: string;
  name: string;
  theme: string;
  subTheme?: string;
  description: string;
  width: number;
  height: number;
  imageUrl?: string;
  tags?: string[];
  sourceModule: string;
  author: string;
  suggestedLevels?: { min: number; max: number };
  lightingMood?: string;
  hasHazards?: boolean;
  narrationContext?: string;
  tacticalNotes?: string;
}

interface MapBrowseResponse {
  maps: MapSummary[];
  total: number;
  page: number;
  pageSize: number;
  themes: string[];
  allTags: string[];
}

interface Props {
  /** Called when a map is selected */
  onSelectMap: (mapId: string, mapName?: string) => void;
  /** Party level for filtering */
  partyLevel?: number;
  /** Campaign ID for tracking */
  campaignId?: string;
  /** Whether this is in campaign mode (shows AI recommendation) */
  campaignMode?: boolean;
  /** Pre-selected map ID (for highlighting) */
  selectedMapId?: string;
  /** Whether to show as a closeable modal overlay */
  asModal?: boolean;
  /** Called when the modal is closed */
  onClose?: () => void;
}

export const MapBrowser: React.FC<Props> = ({
  onSelectMap,
  partyLevel,
  campaignId,
  campaignMode,
  selectedMapId,
  asModal,
  onClose,
}) => {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [themes, setThemes] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMap, setExpandedMap] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<{ mapId: string; mapName: string; reason: string; confidence: number } | null>(null);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTheme) params.set('theme', selectedTheme);
      if (searchText) params.set('search', searchText);
      if (partyLevel) params.set('level', String(partyLevel));
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const { data } = await axios.get<MapBrowseResponse>(`${API_BASE}/foundry-maps?${params}`);
      setMaps(data.maps);
      setTotal(data.total);
      if (data.themes.length > 0) setThemes(data.themes);
      if (data.allTags.length > 0) setAllTags(data.allTags);
    } catch (err) {
      console.error('Failed to fetch maps:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTheme, searchText, partyLevel, page, pageSize]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  // Get AI recommendation in campaign mode
  useEffect(() => {
    if (!campaignMode || !campaignId) return;
    (async () => {
      try {
        const { data } = await axios.post(`${API_BASE}/maps/select`, {
          campaignId,
          partyLevel,
          allowRevisit: true,
        });
        setAiRecommendation({
          mapId: data.map.id,
          mapName: data.map.name || data.map.id,
          reason: data.reason,
          confidence: data.confidence,
        });
      } catch (err) {
        console.error('Failed to get AI recommendation:', err);
      }
    })();
  }, [campaignMode, campaignId, partyLevel]);

  const totalPages = Math.ceil(total / pageSize);

  const themeIcons: Record<string, string> = {
    dungeon: '🏰', wilderness: '🌲', urban: '🏘️', indoor: '🏠',
    cave: '⛰️', ship: '⛵', tower: '🗼', bridge: '🌉',
    caravan: '🐴', sewers: '🕳️', castle: '🏯', mine: '⛏️',
    special: '✨',
  };

  const lightingIcons: Record<string, string> = {
    bright: '☀️', dim: '🕯️', dark: '🌑', mixed: '🌗',
  };

  const content = (
    <div style={{
      padding: 16,
      color: '#ece7da',
      fontFamily: "'Cinzel', 'Times New Roman', serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#8a7968',
              fontSize: 20, cursor: 'pointer', padding: '2px 6px',
            }}
            title="Close"
          >
            ✕
          </button>
        )}
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f0e1c9' }}>
          Foundry VTT Map Library
        </h2>
        <span style={{ color: '#8a7968', fontSize: 13 }}>
          {total} maps available
        </span>
      </div>

      {/* AI Recommendation Banner */}
      {aiRecommendation && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: 'linear-gradient(90deg, rgba(80,50,20,0.4), rgba(40,25,10,0.3))',
            border: '1px solid #6b4a2a',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ color: '#f0d090', fontWeight: 700, fontSize: 13 }}>
              🎯 AI GM Recommends:
            </span>
            <span style={{ color: '#d0c3b4', fontSize: 13, marginLeft: 8 }}>
              {aiRecommendation.reason}
            </span>
            <span style={{ color: '#8a7968', fontSize: 11, marginLeft: 8 }}>
              ({aiRecommendation.confidence}% confidence)
            </span>
          </div>
          <button
            onClick={() => onSelectMap(aiRecommendation.mapId, aiRecommendation.mapName)}
            style={{
              background: '#6b4a2a',
              color: '#f0e1c9',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            Use Recommendation
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search maps..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1); }}
          style={{
            background: '#1b1010',
            color: '#ece7da',
            border: '1px solid #5a3a3a',
            borderRadius: 6,
            padding: '7px 12px',
            fontSize: 13,
            width: 200,
          }}
        />

        {/* Theme filter */}
        <select
          value={selectedTheme}
          onChange={e => { setSelectedTheme(e.target.value); setPage(1); }}
          style={{
            background: '#1b1010',
            color: '#ece7da',
            border: '1px solid #5a3a3a',
            borderRadius: 6,
            padding: '7px 10px',
            fontSize: 13,
          }}
        >
          <option value="">All Themes</option>
          {themes.map(t => (
            <option key={t} value={t}>
              {themeIcons[t] || ''} {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Level indicator */}
        {partyLevel && (
          <span style={{ color: '#8a7968', fontSize: 12 }}>
            Party Level: {partyLevel}
          </span>
        )}
      </div>

      {/* Map Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8a7968' }}>Loading maps...</div>
      ) : maps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8a7968' }}>
          No maps found matching your criteria.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {maps.map(map => {
            const isSelected = map.id === selectedMapId;
            const isRecommended = map.id === aiRecommendation?.mapId;
            const isExpanded = expandedMap === map.id;

            return (
              <div
                key={map.id}
                style={{
                  border: `1px solid ${isSelected ? '#c89b3f' : isRecommended ? '#6b4a2a' : '#3f2626'}`,
                  background: isSelected
                    ? 'linear-gradient(180deg, #2a1f10, #1b1510)'
                    : 'linear-gradient(180deg, #1b1010, #120a0a)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: isSelected ? '0 0 12px rgba(200,155,63,0.2)' : undefined,
                }}
                onClick={() => setExpandedMap(isExpanded ? null : map.id)}
              >
                {/* Map Image or Placeholder */}
                <div style={{
                  height: 100,
                  background: map.imageUrl
                    ? `url(/maps/${map.imageUrl}) center/cover`
                    : 'linear-gradient(135deg, #2a1515, #1a0e0e)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 8,
                }}>
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: '#f0d090',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {themeIcons[map.theme] || ''} {map.theme}
                    </span>
                    {map.lightingMood && (
                      <span style={{
                        background: 'rgba(0,0,0,0.7)',
                        color: '#d0c3b4',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                      }}>
                        {lightingIcons[map.lightingMood] || ''} {map.lightingMood}
                      </span>
                    )}
                    {map.hasHazards && (
                      <span style={{
                        background: 'rgba(140,30,30,0.7)',
                        color: '#ff8080',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                      }}>
                        ⚠️ hazards
                      </span>
                    )}
                    {isRecommended && (
                      <span style={{
                        background: 'rgba(107,74,42,0.8)',
                        color: '#f0d090',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        🎯 recommended
                      </span>
                    )}
                  </div>
                </div>

                {/* Map Info */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#f0e1c9',
                    marginBottom: 4,
                  }}>
                    {map.name}
                  </div>
                  <div style={{
                    color: '#a09080',
                    fontSize: 12,
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: isExpanded ? undefined : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: isExpanded ? undefined : 'hidden',
                  }}>
                    {map.description}
                  </div>

                  {/* Grid size + author */}
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#706050', fontSize: 11 }}>
                      {map.width}×{map.height} • {map.author}
                    </span>
                    {map.suggestedLevels && (
                      <span style={{ color: '#706050', fontSize: 11 }}>
                        Lv {map.suggestedLevels.min}–{map.suggestedLevels.max}
                      </span>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ marginTop: 10, borderTop: '1px solid #3f2626', paddingTop: 10 }}>
                      {map.narrationContext && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ color: '#c89b3f', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                            Narration
                          </div>
                          <div style={{ color: '#b0a090', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
                            "{map.narrationContext}"
                          </div>
                        </div>
                      )}
                      {map.tacticalNotes && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ color: '#c89b3f', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                            Tactical Notes
                          </div>
                          <div style={{ color: '#b0a090', fontSize: 12, lineHeight: 1.5 }}>
                            {map.tacticalNotes}
                          </div>
                        </div>
                      )}
                      {map.tags && map.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {map.tags.map(tag => (
                            <span key={tag} style={{
                              background: '#2a1515',
                              color: '#a09080',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              border: '1px solid #3f2626',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMap(map.id, map.name);
                        }}
                        style={{
                          width: '100%',
                          background: isSelected
                            ? 'linear-gradient(180deg, #5a4420, #3a2a10)'
                            : 'linear-gradient(180deg, #3a2020, #2a1515)',
                          color: isSelected ? '#f0d090' : '#f0e1c9',
                          border: `1px solid ${isSelected ? '#c89b3f' : '#5a3a3a'}`,
                          borderRadius: 6,
                          padding: '8px 0',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {isSelected ? '✓ Selected' : 'Select This Map'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          alignItems: 'center',
        }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              background: '#1b1010',
              color: page <= 1 ? '#504040' : '#ece7da',
              border: '1px solid #3f2626',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: page <= 1 ? 'default' : 'pointer',
              fontSize: 12,
            }}
          >
            ← Previous
          </button>
          <span style={{ color: '#8a7968', fontSize: 12 }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{
              background: '#1b1010',
              color: page >= totalPages ? '#504040' : '#ece7da',
              border: '1px solid #3f2626',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: page >= totalPages ? 'default' : 'pointer',
              fontSize: 12,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );

  if (asModal) {
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          overflowY: 'auto', padding: '40px 20px',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <div style={{
          maxWidth: 900, width: '100%',
          background: '#1b1010', borderRadius: 12,
          border: '1px solid #3f2626',
          maxHeight: '85vh', overflowY: 'auto',
        }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
