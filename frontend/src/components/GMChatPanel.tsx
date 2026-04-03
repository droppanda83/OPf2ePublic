import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import GameLog from './GameLog';
import './GMChatPanel.css';
import type {
  GameState,
  GameLog,
  GMSession,
  GMChatMessage,
  TensionBand,
  RecurringNPC,
  StoryArc,
  EncounterMapTemplate,
} from '../../../shared/types';

const API_BASE = '/api';

interface GMChatPanelProps {
  gameId: string | null;
  log: GameLog[];           // Combat log entries for the Combat Log tab
  gmSession: GMSession | null;
  onSessionUpdate: (session: GMSession) => void;
  onGameStateUpdate?: (gameState: GameState) => void;
  /** Campaign preferences for manual GM init */
  campaignPreferences?: CampaignPreferences;
  /** Callback when encounter conclusion detects level-ups */
  onEncounterLevelUps?: (levelUps: { id: string; name: string; oldLevel: number; newLevel: number }[], xpAward: number) => void;
}

/** Determine tension band from score */
function getTensionBand(score: number): TensionBand {
  if (score <= 30) return 'low';
  if (score <= 60) return 'mid';
  if (score <= 85) return 'high';
  return 'critical';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type TabId = 'combat-log' | 'gm-chat' | 'gm-controls';

const GMChatPanel: React.FC<GMChatPanelProps> = ({
  gameId,
  log,
  gmSession,
  onSessionUpdate,
  onGameStateUpdate,
  campaignPreferences,
  onEncounterLevelUps,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('gm-chat');
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Map catalog state
  const [mapCatalog, setMapCatalog] = useState<{ id: string; name: string; theme: string; description: string; gridWidth: number; gridHeight: number }[]>([]);
  const [mapThemes, setMapThemes] = useState<string[]>([]);
  const [selectedMapTheme, setSelectedMapTheme] = useState<string>('all');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [selectedEncounterDifficulty, setSelectedEncounterDifficulty] = useState<'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'>('moderate');
  const [encounterStarting, setEncounterStarting] = useState(false);

  // Story arc creation state
  const [storyArcFormOpen, setStoryArcFormOpen] = useState(false);
  const [arcBbegName, setArcBbegName] = useState('');
  const [arcBbegMotivation, setArcBbegMotivation] = useState('');
  const [arcKeyLocations, setArcKeyLocations] = useState('');

  // NPC creation state
  const [npcFormOpen, setNpcFormOpen] = useState(false);
  const [npcName, setNpcName] = useState('');
  const [npcRole, setNpcRole] = useState<'ally' | 'enemy' | 'neutral' | 'quest-giver' | 'merchant'>('neutral');

  // Combat narration toggle state
  const [combatNarrationEnabled, setCombatNarrationEnabled] = useState(
    gmSession?.combatNarrationEnabled ?? false
  );

  // Text-to-Speech auto-read for GM messages
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const lastSpokenMsgId = useRef<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [ttsRate, setTtsRate] = useState(0.95);
  const [ttsPitch, setTtsPitch] = useState(0.85);

  // Load available voices (they load asynchronously in some browsers)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
      // Auto-select a good default if none chosen
      if (!selectedVoiceURI && englishVoices.length > 0) {
        const preferred = englishVoices.find(v => v.name.includes('Google') && v.lang === 'en-US')
          || englishVoices.find(v => v.name.includes('Google'))
          || englishVoices.find(v => v.localService && v.lang === 'en-US')
          || englishVoices[0];
        if (preferred) setSelectedVoiceURI(preferred.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Auto-speak new GM messages when TTS is enabled
  useEffect(() => {
    if (!ttsEnabled || !gmSession?.chatHistory?.length) return;

    const lastMsg = gmSession.chatHistory[gmSession.chatHistory.length - 1];
    if (lastMsg.role === 'gm' && lastMsg.id !== lastSpokenMsgId.current) {
      lastSpokenMsgId.current = lastMsg.id;
      if ('speechSynthesis' in window) {
        // Cancel any in-progress speech
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastMsg.content);
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;
        utterance.volume = 1.0;
        // Use selected voice or fall back to best available
        const voices = window.speechSynthesis.getVoices();
        const chosen = selectedVoiceURI ? voices.find(v => v.voiceURI === selectedVoiceURI) : null;
        if (chosen) {
          utterance.voice = chosen;
        } else {
          const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
            || voices.find(v => v.lang.startsWith('en') && v.localService)
            || voices.find(v => v.lang.startsWith('en'));
          if (preferred) utterance.voice = preferred;
        }
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [ttsEnabled, gmSession?.chatHistory?.length, selectedVoiceURI, ttsRate, ttsPitch]);

  // AI token limit controls
  const [narrationMaxTokens, setNarrationMaxTokens] = useState(gmSession?.narrationMaxTokens ?? 500);
  const [gmResponseMaxTokens, setGmResponseMaxTokens] = useState(gmSession?.gmResponseMaxTokens ?? 2000);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'gm-chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gmSession?.chatHistory?.length, activeTab]);

  // Sync narration toggle with gmSession
  useEffect(() => {
    if (gmSession && gmSession.combatNarrationEnabled !== undefined) {
      setCombatNarrationEnabled(gmSession.combatNarrationEnabled);
    }
  }, [gmSession?.combatNarrationEnabled]);

  // Sync token limits with gmSession
  useEffect(() => {
    if (gmSession) {
      if (gmSession.narrationMaxTokens !== undefined) setNarrationMaxTokens(gmSession.narrationMaxTokens);
      if (gmSession.gmResponseMaxTokens !== undefined) setGmResponseMaxTokens(gmSession.gmResponseMaxTokens);
    }
  }, [gmSession?.narrationMaxTokens, gmSession?.gmResponseMaxTokens]);

  // Save token limits to backend
  const saveTokenLimits = useCallback(async (narration: number, gmResponse: number) => {
    if (!gameId) return;
    try {
      await axios.post(`${API_BASE}/game/${gameId}/gm/token-limits`, {
        narrationMaxTokens: narration,
        gmResponseMaxTokens: gmResponse,
      });
    } catch (err) {
      console.error('Failed to save token limits:', err);
    }
  }, [gameId]);

  // ─── Combat Narration Toggle ──────────────────────────────

  const toggleCombatNarration = useCallback(async () => {
    console.log('🎭 Toggle narration clicked, gameId:', gameId, 'current:', combatNarrationEnabled);
    if (!gameId) {
      console.warn('🎭 No gameId — cannot toggle narration');
      return;
    }
    const newVal = !combatNarrationEnabled;
    setCombatNarrationEnabled(newVal); // Optimistic update
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/narration-toggle`, {
        enabled: newVal,
      });
      console.log('🎭 Narration toggle response:', res.data);
      // Update local state from server response
      const serverEnabled = res.data.combatNarrationEnabled ?? newVal;
      setCombatNarrationEnabled(serverEnabled);
      // Also update gmSession locally (or fetch it if it didn't exist)
      if (gmSession) {
        onSessionUpdate({ ...gmSession, combatNarrationEnabled: serverEnabled });
      } else {
        // GM session was created on the backend — fetch it
        try {
          const sessionRes = await axios.get(`${API_BASE}/game/${gameId}/gm`);
          if (sessionRes.data.gmSession) {
            onSessionUpdate(sessionRes.data.gmSession);
          }
        } catch {
          // Non-critical — toggle still worked on backend
        }
      }
    } catch (error) {
      console.error('Failed to toggle combat narration:', error);
      setCombatNarrationEnabled(!newVal); // Revert on failure
    }
  }, [gameId, combatNarrationEnabled, gmSession, onSessionUpdate]);

  // ─── Initialize GM Session ────────────────────────────────

  const initGMSession = useCallback(async () => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/init`, {
        preferences: campaignPreferences || {},
      });
      if (res.data.gmSession) {
        onSessionUpdate(res.data.gmSession);
        setActiveTab('gm-chat');
      }
      if (res.data.gameState && onGameStateUpdate) {
        onGameStateUpdate(res.data.gameState);
      }
    } catch (error) {
      console.error('Failed to init GM session:', error);
    }
  }, [gameId, onSessionUpdate, onGameStateUpdate, campaignPreferences]);

  // ─── Send Chat Message ────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!gameId || !chatInput.trim() || sending) return;

    const msg = chatInput.trim();
    setChatInput('');
    setSending(true);

    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/chat`, {
        message: msg,
      });

      if (res.data.gmSession) {
        onSessionUpdate(res.data.gmSession);
      } else if (gmSession) {
        const updated: GMSession = {
          ...gmSession,
          chatHistory: [
            ...gmSession.chatHistory,
            res.data.playerMessage,
            res.data.gmResponse,
          ],
          tensionTracker: res.data.tensionTracker || gmSession.tensionTracker,
        };
        onSessionUpdate(updated);
      }

      if (res.data.gameState && onGameStateUpdate) {
        onGameStateUpdate(res.data.gameState);
      }
    } catch (error) {
      console.error('GM chat error:', error);
      // Add error message locally
      if (gmSession) {
        const errorMsg: GMChatMessage = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: 'Failed to get GM response. Please try again.',
          timestamp: Date.now(),
        };
        onSessionUpdate({
          ...gmSession,
          chatHistory: [...gmSession.chatHistory, errorMsg],
        });
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [gameId, chatInput, sending, gmSession, onSessionUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Tension Controls ────────────────────────────────────

  const adjustTension = async (delta: number, reason: string) => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/tension`, {
        delta,
        reason,
      });
      if (gmSession) {
        onSessionUpdate({
          ...gmSession,
          tensionTracker: res.data.tensionTracker,
        });
      }
    } catch (error) {
      console.error('Tension update failed:', error);
    }
  };

  const autoCalcTension = async () => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/tension`, {
        autoCalculate: true,
        reason: 'Auto-calculated from game state',
      });
      if (gmSession) {
        onSessionUpdate({
          ...gmSession,
          tensionTracker: res.data.tensionTracker,
        });
      }
    } catch (error) {
      console.error('Auto-tension failed:', error);
    }
  };

  // ─── Difficulty Controls ──────────────────────────────────

  const setDifficulty = async (difficulty: 'easy' | 'normal' | 'hard' | 'deadly') => {
    if (!gameId) return;
    try {
      await axios.post(`${API_BASE}/game/${gameId}/gm/difficulty`, { difficulty });
      if (gmSession) {
        onSessionUpdate({ ...gmSession, difficulty });
      }
    } catch (error) {
      console.error('Difficulty update failed:', error);
    }
  };

  // ─── Phase Controls ───────────────────────────────────────

  const setPhase = async (phase: GMSession['currentPhase']) => {
    if (!gameId) return;
    try {
      await axios.post(`${API_BASE}/game/${gameId}/gm/phase`, { phase });
      if (gmSession) {
        onSessionUpdate({ ...gmSession, currentPhase: phase });
      }
    } catch (error) {
      console.error('Phase update failed:', error);
    }
  };

  // ─── Map Catalog ──────────────────────────────────────────

  const loadMapCatalog = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/maps`);
      setMapCatalog(res.data.maps || []);
      setMapThemes(res.data.themes || []);
    } catch (error) {
      console.error('Failed to load map catalog:', error);
    }
  }, []);

  const openMapPicker = () => {
    if (mapCatalog.length === 0) {
      loadMapCatalog();
    }
    setMapPickerOpen(true);
  };

  const filteredMaps = selectedMapTheme === 'all'
    ? mapCatalog
    : mapCatalog.filter(m => m.theme === selectedMapTheme);

  const applyEncounterMap = async (mapId: string) => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/map`, {
        mapId,
      });
      if (res.data.gmSession) {
        onSessionUpdate(res.data.gmSession);
      }
      if (res.data.gameState && onGameStateUpdate) {
        onGameStateUpdate(res.data.gameState);
      }
      setMapPickerOpen(false);
      setActiveTab('gm-chat');
    } catch (error) {
      console.error('Failed to apply encounter map:', error);
    }
  };

  const startEncounter = async () => {
    if (!gameId || encounterStarting) return;
    setEncounterStarting(true);
    try {
      console.log(`⚔️ Starting ${selectedEncounterDifficulty} encounter...`);
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/encounter/start`, {
        difficulty: selectedEncounterDifficulty,
        autoPickMap: true,
      });
      console.log('⚔️ Encounter started:', {
        enemies: res.data.enemies?.length,
        map: res.data.map?.name,
        phase: res.data.gmSession?.currentPhase,
        turnOrder: res.data.gameState?.currentRound?.turnOrder,
      });
      if (res.data.gmSession) {
        onSessionUpdate(res.data.gmSession);
      }
      if (res.data.gameState && onGameStateUpdate) {
        onGameStateUpdate(res.data.gameState);
      }
      setActiveTab('gm-chat');
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: unknown } };
      console.error('Encounter start failed:', apiError.response?.data || error);
    } finally {
      setEncounterStarting(false);
    }
  };

  // ─── Encounter Narration ──────────────────────────────────

  const triggerEncounterIntro = async () => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/encounter/intro`);
      if (res.data.gmSession) {
        onSessionUpdate(res.data.gmSession);
        setActiveTab('gm-chat');
      }
    } catch (error) {
      console.error('Encounter intro failed:', error);
    }
  };

  const triggerEncounterConclusion = async (victory: boolean) => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/encounter/conclusion`, { victory });
      if (res.data.gmSession) {
        onSessionUpdate(res.data.gmSession);
        setActiveTab('gm-chat');
      }
      // Notify parent about XP awards and level-ups
      if (onEncounterLevelUps && (res.data.levelUps?.length > 0 || res.data.xpAward > 0)) {
        onEncounterLevelUps(res.data.levelUps || [], res.data.xpAward || 0);
      }
    } catch (error) {
      console.error('Encounter conclusion failed:', error);
    }
  };

  // ─── Story Arc Creation ───────────────────────────────────

  const createStoryArc = async () => {
    if (!gameId || !arcBbegName.trim()) return;
    try {
      const arcData: Omit<StoryArc, 'milestones' | 'secretPlots'> = {
        bbegName: arcBbegName.trim(),
        bbegMotivation: arcBbegMotivation.trim() || 'Unknown',
        keyLocations: arcKeyLocations.split(',').map(s => s.trim()).filter(Boolean),
        storyPhase: 'setup',
      };
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/story`, arcData);
      if (gmSession && res.data.storyArc) {
        onSessionUpdate({ ...gmSession, storyArc: res.data.storyArc });
      }
      setStoryArcFormOpen(false);
      setArcBbegName('');
      setArcBbegMotivation('');
      setArcKeyLocations('');
    } catch (error) {
      console.error('Story arc creation failed:', error);
    }
  };

  const advanceStoryPhase = async () => {
    if (!gameId) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/story/advance`);
      if (gmSession && res.data.storyArc) {
        onSessionUpdate({ ...gmSession, storyArc: res.data.storyArc });
      }
    } catch (error) {
      console.error('Story advance failed:', error);
    }
  };

  // ─── NPC Creation ────────────────────────────────────────

  const addNPC = async () => {
    if (!gameId || !npcName.trim()) return;
    try {
      const res = await axios.post(`${API_BASE}/game/${gameId}/gm/npcs`, {
        name: npcName.trim(),
        role: npcRole,
        disposition: npcRole === 'ally' || npcRole === 'quest-giver' ? 60 : npcRole === 'enemy' ? -30 : 30,
        description: '',
      });
      if (gmSession && res.data.npc) {
        onSessionUpdate({
          ...gmSession,
          recurringNPCs: [...gmSession.recurringNPCs, res.data.npc],
        });
      }
      setNpcFormOpen(false);
      setNpcName('');
      setNpcRole('neutral');
    } catch (error) {
      console.error('NPC creation failed:', error);
    }
  };

  // ─── Render ───────────────────────────────────────────────

  const tensionScore = gmSession?.tensionTracker?.score ?? 0;
  const tensionBand = getTensionBand(tensionScore);
  const storyPhases = ['setup', 'rising-action', 'climax', 'resolution'];
  const currentStoryPhaseIdx = gmSession?.storyArc
    ? storyPhases.indexOf(gmSession.storyArc.storyPhase)
    : -1;

  return (
    <div className="gm-panel">
      {/* ─── Tabs ─── */}
      <div className="gm-panel-tabs">
        <button
          className={`gm-tab ${activeTab === 'combat-log' ? 'active' : ''}`}
          onClick={() => setActiveTab('combat-log')}
        >
          📜 Combat Log
        </button>
        <button
          className={`gm-tab gm-tab-chat ${activeTab === 'gm-chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('gm-chat')}
        >
          🎭 GM Chat
        </button>
        <button
          className={`gm-tab gm-tab-controls ${activeTab === 'gm-controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('gm-controls')}
        >
          ⚙️ Controls
        </button>
      </div>

      {/* ─── Combat Log Tab ─── */}
      {activeTab === 'combat-log' && (
        <div className="gm-tab-content">
          <GameLog log={log} />
        </div>
      )}

      {/* ─── GM Chat Tab ─── */}
      {activeTab === 'gm-chat' && (
        <div className="gm-tab-content">
          {!gmSession ? (
            <div className="gm-empty-state">
              <div className="gm-empty-state-icon">🎭</div>
              <div className="gm-empty-state-text">
                The AI Game Master is ready to narrate your adventure.
                <br />
                Initialize a GM session to begin!
              </div>
              <button className="gm-init-btn" onClick={initGMSession} disabled={!gameId}>
                Start GM Session
              </button>
            </div>
          ) : (
            <div className="gm-chat-container">
              {/* Messages */}
              <div className="gm-chat-messages" aria-live="polite" aria-relevant="additions" role="log">
                {gmSession.chatHistory.map((msg) => (
                  <div key={msg.id} className={`gm-message ${msg.role}`} data-speechify-sentence="">
                    <div className="gm-message-header">
                      {msg.role === 'gm' ? '🎭 Game Master' : msg.role === 'player' ? '🧙 You' : '⚙️ System'}
                    </div>
                    <div className="gm-message-bubble" data-speechify-paragraph="">
                      {msg.content}
                    </div>
                    <div className="gm-message-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="gm-typing-indicator">
                    <span>GM is thinking</span>
                    <div className="gm-typing-dots">
                      <div className="gm-typing-dot"></div>
                      <div className="gm-typing-dot"></div>
                      <div className="gm-typing-dot"></div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="gm-chat-input-area">
                <div className="narration-toggle-bar">
                  <button
                    className={`narration-toggle-btn ${combatNarrationEnabled ? 'active' : ''}`}
                    onClick={toggleCombatNarration}
                    title={combatNarrationEnabled ? 'Disable AI combat narration (saves tokens)' : 'Enable AI combat narration'}
                  >
                    {combatNarrationEnabled ? '⚔️ Narration ON' : '⚔️ Narration OFF'}
                  </button>
                  <button
                    className={`narration-toggle-btn ${ttsEnabled ? 'active' : ''}`}
                    onClick={() => {
                      setTtsEnabled(prev => {
                        if (prev) window.speechSynthesis?.cancel();
                        return !prev;
                      });
                    }}
                    title={ttsEnabled ? 'Disable voice narration' : 'Enable voice narration (reads GM messages aloud)'}
                  >
                    {ttsEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
                  </button>
                </div>
                <textarea
                  ref={inputRef}
                  className="gm-chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message to the GM..."
                  rows={1}
                  disabled={sending}
                />
                <button
                  className="gm-chat-send-btn"
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || sending}
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Controls Tab ─── */}
      {activeTab === 'gm-controls' && (
        <div className="gm-tab-content">
          {!gmSession ? (
            <div className="gm-empty-state">
              <div className="gm-empty-state-icon">⚙️</div>
              <div className="gm-empty-state-text">
                Initialize a GM session to access controls.
              </div>
              <button className="gm-init-btn" onClick={initGMSession} disabled={!gameId}>
                Start GM Session
              </button>
            </div>
          ) : (
            <div className="gm-controls">

              {/* ─── Encounter Management ─── */}
              <div className="gm-control-section">
                <h4>🏟️ Encounter</h4>
                <div className="encounter-start-row">
                  <select
                    className="encounter-difficulty-select"
                    value={selectedEncounterDifficulty}
                    onChange={(e) => setSelectedEncounterDifficulty(e.target.value as 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme')}
                  >
                    <option value="trivial">Trivial</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="extreme">Extreme</option>
                  </select>
                  <button className="encounter-btn intro" onClick={startEncounter} disabled={encounterStarting}>
                    {encounterStarting ? '⏳ Starting...' : '⚔️ Start Encounter'}
                  </button>
                </div>
                <div className="encounter-btns">
                  <button className="encounter-btn intro" onClick={triggerEncounterIntro}>
                    ⚔️ Narrate Intro
                  </button>
                  <button className="encounter-btn victory" onClick={() => triggerEncounterConclusion(true)}>
                    🏆 Victory
                  </button>
                  <button className="encounter-btn defeat" onClick={() => triggerEncounterConclusion(false)}>
                    💀 Defeat
                  </button>
                </div>
                <button className="map-picker-toggle" onClick={openMapPicker}>
                  🗺️ Browse Maps ({mapCatalog.length || '...'})
                </button>

                {/* Map Picker Overlay */}
                {mapPickerOpen && (
                  <div className="map-picker-panel">
                    <div className="map-picker-header">
                      <span>Encounter Maps</span>
                      <button className="map-picker-close" onClick={() => setMapPickerOpen(false)}>✕</button>
                    </div>
                    <div className="map-theme-filter">
                      <button
                        className={`map-theme-btn ${selectedMapTheme === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedMapTheme('all')}
                      >
                        All
                      </button>
                      {mapThemes.map(theme => (
                        <button
                          key={theme}
                          className={`map-theme-btn ${selectedMapTheme === theme ? 'active' : ''}`}
                          onClick={() => setSelectedMapTheme(theme)}
                        >
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="map-list">
                      {filteredMaps.map(map => (
                        <div key={map.id} className="map-card">
                          <div className="map-card-name">{map.name}</div>
                          <div className="map-card-info">
                            {map.gridWidth}×{map.gridHeight} &bull; {map.theme}
                          </div>
                          <div className="map-card-desc">{map.description}</div>
                          <button className="map-apply-btn" onClick={() => applyEncounterMap(map.id)}>
                            Use This Map
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Tension Tracker ─── */}
              <div className="gm-control-section">
                <h4>🔥 Tension</h4>
                <div className="tension-bar-container">
                  <div className="tension-bar-wrapper">
                    <div className="tension-bar">
                      <div
                        className={`tension-bar-fill ${tensionBand}`}
                        style={{ width: `${tensionScore}%` }}
                      />
                    </div>
                    <span className={`tension-score ${tensionBand}`}>
                      {tensionScore}
                    </span>
                  </div>
                  <div className="tension-label">
                    {tensionBand.toUpperCase()} — {
                      tensionBand === 'low' ? 'Calm exploration' :
                      tensionBand === 'mid' ? 'Standard encounters' :
                      tensionBand === 'high' ? 'Dramatic stakes' :
                      'Desperate climax'
                    }
                  </div>
                  <div className="tension-buttons">
                    <button className="tension-btn" onClick={() => adjustTension(-10, 'GM decrease')}>
                      −10
                    </button>
                    <button className="tension-btn" onClick={() => adjustTension(-5, 'GM decrease')}>
                      −5
                    </button>
                    <button className="tension-btn" onClick={autoCalcTension}>
                      Auto
                    </button>
                    <button className="tension-btn" onClick={() => adjustTension(5, 'GM increase')}>
                      +5
                    </button>
                    <button className="tension-btn" onClick={() => adjustTension(10, 'GM increase')}>
                      +10
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Difficulty ─── */}
              <div className="gm-control-section">
                <h4>⚔️ Difficulty</h4>
                <div className="difficulty-selector">
                  {(['easy', 'normal', 'hard', 'deadly'] as const).map((d) => (
                    <button
                      key={d}
                      className={`difficulty-btn ${d} ${gmSession.difficulty === d ? 'active' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Phase ─── */}
              <div className="gm-control-section">
                <h4>📍 Phase</h4>
                <div className="phase-selector">
                  {(['exploration', 'combat', 'social', 'rest', 'travel'] as const).map((p) => (
                    <button
                      key={p}
                      className={`phase-btn ${gmSession.currentPhase === p ? 'active' : ''}`}
                      onClick={() => setPhase(p)}
                    >
                      {p === 'exploration' ? '🔍' : p === 'combat' ? '⚔️' : p === 'social' ? '🗣️' : p === 'rest' ? '🏕️' : '🗺️'} {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Campaign Info ─── */}
              <div className="gm-control-section">
                <h4>📖 Campaign</h4>
                <div style={{ fontSize: '10px', color: '#aaa', lineHeight: 1.6 }}>
                  <div><strong>Name:</strong> {gmSession.campaignPreferences.campaignName}</div>
                  <div><strong>Tone:</strong> {gmSession.campaignPreferences.tone}</div>
                  <div><strong>Themes:</strong> {gmSession.campaignPreferences.themes.join(', ')}</div>
                  <div><strong>Encounters:</strong> {gmSession.encounterCount}</div>
                  <div><strong>Total XP Awarded:</strong> {gmSession.xpAwarded}</div>
                </div>
              </div>

              {/* ─── Voice Settings ─── */}
              <div className="gm-control-section">
                <h4>🔊 Voice Settings</h4>
                <div className="token-limit-controls">
                  <div className="token-limit-row">
                    <label className="token-limit-label">Voice</label>
                    <select
                      className="voice-select"
                      value={selectedVoiceURI}
                      onChange={e => setSelectedVoiceURI(e.target.value)}
                    >
                      {availableVoices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang}){v.localService ? '' : ' ☁️'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="token-limit-row">
                    <label className="token-limit-label">Speed</label>
                    <div className="token-limit-input-group">
                      <input
                        type="range"
                        min={0.5}
                        max={2.0}
                        step={0.05}
                        value={ttsRate}
                        onChange={e => setTtsRate(Number(e.target.value))}
                        className="token-limit-slider"
                      />
                      <span className="token-limit-value">{ttsRate.toFixed(2)}x</span>
                    </div>
                    <div className="token-limit-hint">
                      {ttsRate <= 0.7 ? 'Very slow' :
                       ttsRate <= 0.9 ? 'Slow & dramatic' :
                       ttsRate <= 1.1 ? 'Normal' :
                       ttsRate <= 1.5 ? 'Fast' : 'Very fast'}
                    </div>
                  </div>
                  <div className="token-limit-row">
                    <label className="token-limit-label">Pitch</label>
                    <div className="token-limit-input-group">
                      <input
                        type="range"
                        min={0.1}
                        max={2.0}
                        step={0.05}
                        value={ttsPitch}
                        onChange={e => setTtsPitch(Number(e.target.value))}
                        className="token-limit-slider"
                      />
                      <span className="token-limit-value">{ttsPitch.toFixed(2)}</span>
                    </div>
                    <div className="token-limit-hint">
                      {ttsPitch <= 0.5 ? 'Very deep' :
                       ttsPitch <= 0.8 ? 'Deep & commanding' :
                       ttsPitch <= 1.1 ? 'Normal' :
                       ttsPitch <= 1.5 ? 'High' : 'Very high'}
                    </div>
                  </div>
                  <button
                    className="narration-toggle-btn active"
                    style={{ marginTop: '6px', fontSize: '10px', width: '100%' }}
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance('The ancient dragon stirs, its scales gleaming in the torchlight as battle draws near.');
                        utterance.rate = ttsRate;
                        utterance.pitch = ttsPitch;
                        const voices = window.speechSynthesis.getVoices();
                        const chosen = selectedVoiceURI ? voices.find(v => v.voiceURI === selectedVoiceURI) : null;
                        if (chosen) utterance.voice = chosen;
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                  >
                    🎙️ Preview Voice
                  </button>
                </div>
              </div>

              {/* ─── AI Token Limits ─── */}
              <div className="gm-control-section">
                <h4>🤖 AI Token Limits</h4>
                <div className="token-limit-controls">
                  <div className="token-limit-row">
                    <label className="token-limit-label">Combat Narration</label>
                    <div className="token-limit-input-group">
                      <input
                        type="range"
                        min={50}
                        max={1000}
                        step={50}
                        value={narrationMaxTokens}
                        onChange={(e) => setNarrationMaxTokens(Number(e.target.value))}
                        onMouseUp={() => saveTokenLimits(narrationMaxTokens, gmResponseMaxTokens)}
                        onTouchEnd={() => saveTokenLimits(narrationMaxTokens, gmResponseMaxTokens)}
                        className="token-limit-slider"
                      />
                      <span className="token-limit-value">{narrationMaxTokens}</span>
                    </div>
                    <div className="token-limit-hint">
                      {narrationMaxTokens <= 150 ? 'Brief (1-2 sentences)' :
                       narrationMaxTokens <= 300 ? 'Standard (2-4 sentences)' :
                       narrationMaxTokens <= 600 ? 'Detailed (4-6 sentences)' :
                       'Elaborate (6+ sentences)'}
                    </div>
                  </div>
                  <div className="token-limit-row">
                    <label className="token-limit-label">GM Responses</label>
                    <div className="token-limit-input-group">
                      <input
                        type="range"
                        min={200}
                        max={4000}
                        step={100}
                        value={gmResponseMaxTokens}
                        onChange={(e) => setGmResponseMaxTokens(Number(e.target.value))}
                        onMouseUp={() => saveTokenLimits(narrationMaxTokens, gmResponseMaxTokens)}
                        onTouchEnd={() => saveTokenLimits(narrationMaxTokens, gmResponseMaxTokens)}
                        className="token-limit-slider"
                      />
                      <span className="token-limit-value">{gmResponseMaxTokens}</span>
                    </div>
                    <div className="token-limit-hint">
                      {gmResponseMaxTokens <= 500 ? 'Concise' :
                       gmResponseMaxTokens <= 1500 ? 'Standard' :
                       gmResponseMaxTokens <= 2500 ? 'Detailed' :
                       'Verbose'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Manual XP Award ─── */}
              <div className="gm-control-section">
                <h4>✨ Award XP</h4>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[10, 30, 50, 80, 100].map(amount => (
                    <button
                      key={amount}
                      className="tension-btn"
                      onClick={async () => {
                        if (!gameId) return;
                        try {
                          const res = await axios.post(`${API_BASE}/game/${gameId}/xp/award`, {
                            amount,
                            reason: `Manual award: ${amount} XP`,
                          });
                          if (res.data.gmSession) {
                            onSessionUpdate(res.data.gmSession);
                          }
                          if (onEncounterLevelUps && res.data.levelUps?.length > 0) {
                            onEncounterLevelUps(res.data.levelUps, amount);
                          }
                        } catch (err) {
                          console.error('XP award failed:', err);
                        }
                      }}
                      style={{ fontSize: '10px', padding: '3px 8px' }}
                    >
                      +{amount} XP
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Story Arc ─── */}
              <div className="gm-control-section">
                <h4>📜 Story Arc</h4>
                {gmSession.storyArc ? (
                  <div className="story-arc-display">
                    <div style={{ color: '#ccc' }}>
                      <strong>BBEG:</strong> {gmSession.storyArc.bbegName}
                    </div>
                    <div style={{ color: '#888', marginTop: '2px' }}>
                      {gmSession.storyArc.bbegMotivation}
                    </div>
                    {gmSession.storyArc.keyLocations.length > 0 && (
                      <div style={{ color: '#777', fontSize: '9px', marginTop: '2px' }}>
                        📍 {gmSession.storyArc.keyLocations.join(', ')}
                      </div>
                    )}
                    <div className="story-phase-indicator">
                      {storyPhases.map((phase, idx) => (
                        <div
                          key={phase}
                          className={`story-phase-dot ${
                            idx < currentStoryPhaseIdx ? 'completed' :
                            idx === currentStoryPhaseIdx ? 'current' : ''
                          }`}
                          title={phase.replace('-', ' ')}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ color: '#9c7cff', fontSize: '9px' }}>
                        Phase: {gmSession.storyArc.storyPhase.replace('-', ' ')}
                      </span>
                      {currentStoryPhaseIdx < storyPhases.length - 1 && (
                        <button className="advance-story-btn" onClick={advanceStoryPhase}>
                          Advance ▶
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {!storyArcFormOpen ? (
                      <button className="create-arc-btn" onClick={() => setStoryArcFormOpen(true)}>
                        + Create Story Arc
                      </button>
                    ) : (
                      <div className="story-arc-form">
                        <input
                          className="arc-input"
                          type="text"
                          placeholder="BBEG Name"
                          value={arcBbegName}
                          onChange={(e) => setArcBbegName(e.target.value)}
                        />
                        <input
                          className="arc-input"
                          type="text"
                          placeholder="Motivation"
                          value={arcBbegMotivation}
                          onChange={(e) => setArcBbegMotivation(e.target.value)}
                        />
                        <input
                          className="arc-input"
                          type="text"
                          placeholder="Key locations (comma-separated)"
                          value={arcKeyLocations}
                          onChange={(e) => setArcKeyLocations(e.target.value)}
                        />
                        <div className="arc-form-actions">
                          <button className="arc-save-btn" onClick={createStoryArc} disabled={!arcBbegName.trim()}>
                            Create
                          </button>
                          <button className="arc-cancel-btn" onClick={() => setStoryArcFormOpen(false)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ─── Recurring NPCs ─── */}
              <div className="gm-control-section">
                <h4>👥 NPCs ({gmSession.recurringNPCs.length})</h4>
                {gmSession.recurringNPCs.length > 0 && (
                  <div className="npc-list">
                    {gmSession.recurringNPCs.map((npc) => (
                      <div key={npc.id} className="npc-item">
                        <span className={`npc-role ${npc.role}`}>{npc.role}</span>
                        <span className="npc-name">{npc.name}</span>
                        <span className="npc-disposition">
                          {npc.disposition > 50 ? '😊' : npc.disposition > 0 ? '😐' : '😠'}{' '}
                          {npc.disposition}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!npcFormOpen ? (
                  <button className="create-npc-btn" onClick={() => setNpcFormOpen(true)}>
                    + Add NPC
                  </button>
                ) : (
                  <div className="npc-form">
                    <input
                      className="npc-input"
                      type="text"
                      placeholder="NPC Name"
                      value={npcName}
                      onChange={(e) => setNpcName(e.target.value)}
                    />
                    <select
                      className="npc-role-select"
                      value={npcRole}
                      onChange={(e) => setNpcRole(e.target.value as typeof npcRole)}
                    >
                      <option value="neutral">Neutral</option>
                      <option value="ally">Ally</option>
                      <option value="enemy">Enemy</option>
                      <option value="quest-giver">Quest Giver</option>
                      <option value="merchant">Merchant</option>
                    </select>
                    <div className="npc-form-actions">
                      <button className="npc-save-btn" onClick={addNPC} disabled={!npcName.trim()}>
                        Add
                      </button>
                      <button className="npc-cancel-btn" onClick={() => setNpcFormOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Session Notes ─── */}
              <div className="gm-control-section">
                <h4>📝 Session Notes ({gmSession.sessionNotes.length})</h4>
                {gmSession.sessionNotes.length > 0 ? (
                  <div className="session-notes-list">
                    {gmSession.sessionNotes.slice(-5).map((note) => (
                      <div key={note.id} className="session-note-item">
                        <div className="session-note-title">
                          #{note.sessionNumber}: {note.title}
                        </div>
                        <div className="session-note-summary">{note.summary}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '9px', color: '#666' }}>
                    No session notes yet. Notes are created as you play.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GMChatPanel;
