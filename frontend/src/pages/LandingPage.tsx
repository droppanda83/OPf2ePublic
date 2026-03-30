import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PathbuilderUploadModal } from '../components/PathbuilderUploadModal';
import { CharacterSheetModal } from '../components/CharacterSheetModal';
import { CharacterBuilder } from '../components/CharacterBuilder';
import { LevelUpWizard } from '../components/LevelUpWizard';
import { PartyStash } from '../components/PartyStash';
import { CharacterService } from '../services/characterService';
import type { Creature, CharacterSheet, CampaignPreferences, CampaignTone, PacingSetting } from '../../../shared/types';
import { XP_PER_LEVEL } from '../../../shared/types';
import type { MapGeneratorTheme } from '../../../shared/mapGenerator';
import type { Difficulty } from '../../../shared/encounterBuilder';
import { DIFFICULTIES, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../../shared/encounterBuilder';
import './LandingPage.css';

// ─── Types ───────────────────────────────────────────

type Screen = 'main' | 'campaignSetup' | 'encounterSetup' | 'loadGame' | 'builder' | 'characters';

type AIDifficulty = 'easy' | 'normal' | 'hard' | 'deadly';

interface PlayerSlot {
  id: number;
  creature: Creature | null;
  characterSheet: CharacterSheet | null;
}

interface SaveInfo {
  id: string;
  name: string;
  encounterName: string;
  round: number;
  timestamp: number;
  playerCount: number;
  enemyCount: number;
}

interface LandingPageProps {
  onStartBattle: (creatures: Creature[], difficulty: Difficulty, preferences?: CampaignPreferences) => void;
  initialScreen?: Screen;
  onReturnHome?: () => void;
}

// ─── AI Difficulty Config ────────────────────────────

const AI_DIFFICULTIES: AIDifficulty[] = ['easy', 'normal', 'hard', 'deadly'];
const AI_DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  deadly: 'Deadly',
};
const AI_DIFFICULTY_COLORS: Record<AIDifficulty, string> = {
  easy: '#4CAF50',
  normal: '#FFC107',
  hard: '#FF9800',
  deadly: '#F44336',
};
const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  easy: 'Enemies make mistakes often, use basic tactics only',
  normal: 'Enemies use flanking, focus fire, spells, and moderate tactics',
  hard: 'Enemies use skill actions, retreat when wounded, coordinate attacks',
  deadly: 'Perfect play — enemies use every tactical option optimally',
};

const CAMPAIGN_DIFFICULTY_LABELS: Record<Difficulty, string> = {
  trivial: 'Story-First',
  low: 'Story-Lite',
  moderate: 'Adventurous',
  severe: 'Perilous',
  extreme: 'Brutal',
};

const CAMPAIGN_DIFFICULTY_DESC: Record<Difficulty, string> = {
  trivial: 'Very forgiving encounters where narrative and roleplay stay central.',
  low: 'Gentle challenge with low lethality and frequent room to recover.',
  moderate: 'Balanced campaign pressure with room for tactical play and recovery.',
  severe: 'Consistently dangerous adventuring where mistakes are punished more heavily.',
  extreme: 'High-risk campaign tone where survival requires optimized choices and caution.',
};

// ─── Map Theme Config ────────────────────────────────
// Only themes with real atlas tile data are shown.

const MAP_THEMES: { id: MapGeneratorTheme; label: string; icon: string; desc: string }[] = [
  { id: 'wilderness', label: 'Wilderness',      icon: '🌲', desc: 'Open forest, clearings, and natural terrain' },
];

/** Sub-biomes available in the approved atlas tile data */
const WILDERNESS_SUB_BIOMES: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'random',         label: 'Random',         icon: '🎲', desc: 'A randomly chosen wilderness biome' },
  { id: 'campsite',       label: 'Campsite',       icon: '🏕️', desc: 'A wilderness campsite with tents and a fire pit' },
  { id: 'cave entrance',  label: 'Cave Entrance',  icon: '🕳️', desc: 'Rocky cave mouth surrounded by wilderness' },
  { id: 'farm',           label: 'Farm',           icon: '🌾', desc: 'Farmland with crops, fences, and barns' },
  { id: 'path',           label: 'Path',           icon: '🛤️', desc: 'A winding trail through the wilds' },
  { id: 'pond',           label: 'Pond',           icon: '💧', desc: 'A still pond surrounded by vegetation' },
  { id: 'river',          label: 'River',          icon: '🏞️', desc: 'A river cutting through the landscape' },
  { id: 'ruins',          label: 'Ruins',          icon: '🏚️', desc: 'Crumbling stone ruins reclaimed by nature' },
];

// ─── Main Component ─────────────────────────────────

export const LandingPage: React.FC<LandingPageProps> = ({ onStartBattle, initialScreen, onReturnHome }) => {
  const [screen, setScreen] = useState<Screen>(initialScreen || 'main');

  const goBack = () => {
    if (onReturnHome) onReturnHome();
    else setScreen('main');
  };
  const [returnScreen, setReturnScreen] = useState<Screen>('campaignSetup');

  // Setup state shared between campaign and encounter flows
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>([]);
  const [encounterDifficulty, setEncounterDifficulty] = useState<Difficulty>('moderate');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');

  // Map theme (shared between campaign and encounter)
  const [selectedMapTheme, setSelectedMapTheme] = useState<MapGeneratorTheme>('wilderness');
  const [selectedSubBiomes, setSelectedSubBiomes] = useState<string[]>([]);

  // Campaign-specific
  const [campaignPrompt, setCampaignPrompt] = useState<string>('');
  const [campaignTone, setCampaignTone] = useState<CampaignTone>('heroic');
  const [campaignThemes, setCampaignThemes] = useState<string[]>(['adventure', 'exploration']);
  const [campaignPacing, setCampaignPacing] = useState<PacingSetting>('moderate');
  const [campaignName, setCampaignName] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem('pf2e-preferred-ai-model') || ''
  );

  // AI suggestion state
  const [suggestionHint, setSuggestionHint] = useState<string>('');
  const [suggestingCampaign, setSuggestingCampaign] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // UI state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadSlotIndex, setUploadSlotIndex] = useState<number>(-1);
  const [builderSlotIndex, setBuilderSlotIndex] = useState<number>(-1);
  const [selectedCharacter, setSelectedCharacter] = useState<Creature | null>(null);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [savedGames, setSavedGames] = useState<SaveInfo[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(false);

  // Saved characters for picking
  const [savedCharacters, setSavedCharacters] = useState<CharacterSheet[]>([]);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number>(-1);

  // Party stash — shared inventory pool
  const [currentPartyId, setCurrentPartyId] = useState<string>('');

  // Level-up state (landing page local mode)
  const [levelUpCreature, setLevelUpCreature] = useState<Creature | null>(null);
  const [levelUpNewLevel, setLevelUpNewLevel] = useState<number>(0);
  // Track which slot initiated the level-up (for encounter/campaign setup), -1 = characters screen
  const [levelUpSlotIndex, setLevelUpSlotIndex] = useState<number>(-1);

  // Characters screen state
  const [selectedManagedCharacter, setSelectedManagedCharacter] = useState<Creature | null>(null);
  const [showManagedSheet, setShowManagedSheet] = useState(false);
  const [standaloneBuilderActive, setStandaloneBuilderActive] = useState(false);
  const [editingCharacterSheet, setEditingCharacterSheet] = useState<CharacterSheet | null>(null);

  // Sync player slots when player count changes
  useEffect(() => {
    setPlayerSlots(prev => {
      const slots: PlayerSlot[] = [];
      for (let i = 0; i < playerCount; i++) {
        slots.push(prev[i] || { id: i, creature: null, characterSheet: null });
      }
      return slots;
    });
  }, [playerCount]);

  // Load saved characters on mount
  useEffect(() => {
    setSavedCharacters(CharacterService.getAllCharacters());
  }, []);

  // Sync player slot characters to the party (for stash "give to character" feature)
  useEffect(() => {
    if (!currentPartyId) return;
    const party = CharacterService.getParty(currentPartyId);
    if (!party) return;
    const slotChars = playerSlots
      .filter(s => s.characterSheet !== null)
      .map(s => s.characterSheet!);
    party.characters = slotChars;
    party.updatedAt = Date.now();
    CharacterService.saveParty(party);
  }, [currentPartyId, playerSlots]);

  useEffect(() => {
    if (screen !== 'campaignSetup' && screen !== 'encounterSetup') return;

    const loadModels = async () => {
      try {
        const response = await axios.get('/api/ai/models');
        const models: string[] = response.data?.models || [];
        const currentModel: string = response.data?.currentModel || '';
        setAvailableModels(models);
        setSelectedModel(prev => {
          // Prefer persisted model if it's in the list, else fall back
          const persisted = localStorage.getItem('pf2e-preferred-ai-model');
          if (prev && models.includes(prev)) return prev;
          if (persisted && models.includes(persisted)) return persisted;
          return currentModel || models[0] || 'gpt-5';
        });
      } catch (error) {
        console.warn('Could not load AI model list, using fallback:', error);
        const fallback = ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o'];
        setAvailableModels(fallback);
        setSelectedModel(prev => {
          const persisted = localStorage.getItem('pf2e-preferred-ai-model');
          if (prev && fallback.includes(prev)) return prev;
          if (persisted && fallback.includes(persisted)) return persisted;
          return 'gpt-5';
        });
      }
    };

    loadModels();
  }, [screen]);

  // ─── Handlers ──────────────────────────────────────

  const startSetup = (mode: 'campaignSetup' | 'encounterSetup') => {
    setPlayerCount(4);
    setPlayerSlots(Array.from({ length: 4 }, (_, i) => ({ id: i, creature: null, characterSheet: null })));
    setEncounterDifficulty('moderate');
    setAiDifficulty('normal');
    setCampaignPrompt('');
    setCampaignTone('heroic');
    setCampaignThemes(['adventure', 'exploration']);
    setCampaignPacing('moderate');
    setCampaignName('');
    setSelectedMapTheme('wilderness');
    setSelectedSubBiomes([]);
    setReturnScreen(mode);
    setScreen(mode);

    // Create or reuse a party for the stash
    const parties = CharacterService.getAllParties();
    if (parties.length > 0) {
      // Reuse the most recently updated party
      const latest = parties.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];
      setCurrentPartyId(latest.id);
    } else {
      // Create a default party
      const newParty = {
        id: CharacterService.generatePartyId(),
        name: 'Default Party',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        characters: [] as CharacterSheet[],
        optionalRules: { gradualAbilityBoosts: true, ancestryParagon: false, freeArchetype: false },
        stash: [],
        stashGold: 0,
      };
      CharacterService.saveParty(newParty);
      setCurrentPartyId(newParty.id);
    }
  };

  const handleSlotCreateCharacter = (slotIndex: number) => {
    setBuilderSlotIndex(slotIndex);
    setScreen('builder');
  };

  const handleSlotImportCharacter = (slotIndex: number) => {
    setUploadSlotIndex(slotIndex);
    setUploadModalOpen(true);
  };

  const handleSlotLoadSaved = (slotIndex: number) => {
    setSavedCharacters(CharacterService.getAllCharacters());
    setPickerSlotIndex(slotIndex);
    setShowCharacterPicker(true);
  };

  const handleCharacterCreated = (character: CharacterSheet) => {
    CharacterService.saveCharacter(character);
    const creature = CharacterService.sheetToCreature(character);
    if (creature && builderSlotIndex >= 0) {
      setPlayerSlots(prev => {
        const updated = [...prev];
        updated[builderSlotIndex] = { ...updated[builderSlotIndex], creature, characterSheet: character };
        return updated;
      });
    }
    setSavedCharacters(CharacterService.getAllCharacters());
    setBuilderSlotIndex(-1);
    setScreen(returnScreen);
  };

  const handleCharacterImported = (creatures: Creature[]) => {
    if (creatures.length > 0 && uploadSlotIndex >= 0) {
      setPlayerSlots(prev => {
        const updated = [...prev];
        updated[uploadSlotIndex] = { ...updated[uploadSlotIndex], creature: creatures[0], characterSheet: null };
        return updated;
      });
    }
    setUploadModalOpen(false);
    setUploadSlotIndex(-1);
  };

  const handlePickSavedCharacter = (character: CharacterSheet) => {
    const creature = CharacterService.sheetToCreature(character);
    if (creature && pickerSlotIndex >= 0) {
      setPlayerSlots(prev => {
        const updated = [...prev];
        updated[pickerSlotIndex] = { ...updated[pickerSlotIndex], creature, characterSheet: character };
        return updated;
      });
    }
    setShowCharacterPicker(false);
    setPickerSlotIndex(-1);
  };

  const handleClearSlot = (slotIndex: number) => {
    setPlayerSlots(prev => {
      const updated = [...prev];
      updated[slotIndex] = { ...updated[slotIndex], creature: null, characterSheet: null };
      return updated;
    });
  };

  // ─── Level-Up Handlers (local mode, no active game) ───

  const handleSlotLevelUp = (creature: Creature, slotIndex: number) => {
    setShowCharacterSheet(false);
    setSelectedCharacter(null);
    setLevelUpCreature(creature);
    setLevelUpNewLevel(creature.level + 1);
    setLevelUpSlotIndex(slotIndex);
  };

  const handleManagedLevelUp = (creature: Creature) => {
    setShowManagedSheet(false);
    setSelectedManagedCharacter(null);
    setLevelUpCreature(creature);
    setLevelUpNewLevel(creature.level + 1);
    setLevelUpSlotIndex(-1); // -1 = characters screen, not a player slot
  };

  const handleLevelUpComplete = (updatedCreature: Creature) => {
    // Update localStorage — find the matching saved character and update it
    const allChars = CharacterService.getAllCharacters();
    const matchIdx = allChars.findIndex(c => c.id === updatedCreature.id || c.name === updatedCreature.name);
    if (matchIdx >= 0) {
      const updatedSheet: CharacterSheet = {
        ...allChars[matchIdx],
        level: updatedCreature.level,
        abilities: updatedCreature.abilities as any,
        maxHealth: updatedCreature.maxHealth,
        currentXP: updatedCreature.currentXP || 0,
        feats: (updatedCreature.feats || []).map(f => ({ name: f.name, type: (f.type || 'class') as 'class' | 'skill' | 'general' | 'ancestry' | 'archetype', level: f.level || updatedCreature.level })),
        updatedAt: Date.now(),
      };
      CharacterService.saveCharacter(updatedSheet);
    }

    // Update the player slot if leveling up from setup screen
    if (levelUpSlotIndex >= 0) {
      setPlayerSlots(prev => prev.map((slot, idx) => {
        if (idx === levelUpSlotIndex && slot.creature?.id === updatedCreature.id) {
          const updatedSheet = slot.characterSheet ? {
            ...slot.characterSheet,
            level: updatedCreature.level,
            abilities: updatedCreature.abilities as any,
            maxHp: updatedCreature.maxHealth,
            currentXP: updatedCreature.currentXP || 0,
            updatedAt: Date.now(),
          } : null;
          return { ...slot, creature: updatedCreature, characterSheet: updatedSheet };
        }
        return slot;
      }));
    }

    // Refresh saved characters list
    setSavedCharacters(CharacterService.getAllCharacters());

    // Close wizard
    setLevelUpCreature(null);
    setLevelUpNewLevel(0);
    setLevelUpSlotIndex(-1);
  };

  // ─── Standalone Character Builder (characters screen) ───

  const handleStandaloneCharacterCreated = (character: CharacterSheet) => {
    CharacterService.saveCharacter(character);
    setSavedCharacters(CharacterService.getAllCharacters());
    setStandaloneBuilderActive(false);
    setEditingCharacterSheet(null);
  };

  const handleDeleteSavedCharacter = (charId: string) => {
    CharacterService.deleteCharacter(charId);
    setSavedCharacters(CharacterService.getAllCharacters());
  };

  const filledSlots = playerSlots.filter(s => s.creature !== null);
  const canStart = filledSlots.length > 0;

  const handleStartGame = () => {
    const creatures = playerSlots
      .filter(s => s.creature !== null)
      .map(s => s.creature!);

    if (isCampaignMode()) {
      const preferences: CampaignPreferences = {
        campaignName: campaignName || 'Unnamed Campaign',
        tone: campaignTone,
        themes: campaignThemes,
        pacing: campaignPacing,
        aiModel: selectedModel || undefined,
        mapTheme: selectedMapTheme || undefined,
        mapSubTheme: selectedSubBiomes.length > 0 ? selectedSubBiomes : undefined,
        mode: 'campaign',
        encounterBalance: encounterDifficulty as 'easy' | 'moderate' | 'hard' | 'deadly',
        playerCount: creatures.length,
        averageLevel: creatures.length > 0
          ? Math.round(creatures.reduce((sum, c) => sum + (c.level || 1), 0) / creatures.length)
          : 1,
        allowPvP: false,
        customNotes: campaignPrompt || undefined,
      };
      onStartBattle(creatures, encounterDifficulty, preferences);
    } else {
      // Pass minimal preferences with AI model + map theme for encounter mode
      const encounterPrefs: CampaignPreferences = {
        campaignName: 'Quick Encounter',
        tone: 'heroic',
        themes: [],
        pacing: 'moderate',
        aiModel: selectedModel || undefined,
        mapTheme: selectedMapTheme || undefined,
        mapSubTheme: selectedSubBiomes.length > 0 ? selectedSubBiomes : undefined,
        mode: 'encounter',
        encounterBalance: encounterDifficulty as 'easy' | 'moderate' | 'hard' | 'deadly',
        playerCount: creatures.length,
        averageLevel: creatures.length > 0
          ? Math.round(creatures.reduce((sum, c) => sum + (c.level || 1), 0) / creatures.length)
          : 1,
        allowPvP: false,
      };
      onStartBattle(creatures, encounterDifficulty, encounterPrefs);
    }
  };

  const isCampaignMode = () => screen === 'campaignSetup';

  const toggleTheme = (theme: string) => {
    setCampaignThemes(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const handleAISuggest = async () => {
    setSuggestingCampaign(true);
    setSuggestionError(null);
    try {
      const response = await axios.post('/api/campaign/suggest', {
        hint: suggestionHint || undefined,
        aiModel: selectedModel || undefined,
      });
      const s = response.data;
      if (s?._meta?.source === 'local-fallback') {
        const reason = s?._meta?.reason ? ` Reason: ${s._meta.reason}` : '';
        const diag = Array.isArray(s?._meta?.diagnostics) && s._meta.diagnostics.length > 0
          ? ` Attempts: ${s._meta.diagnostics.map((d: any) => `${d.model}→${d.provider}${d.status ? `(${d.status})` : ''}:${d.outcome}`).join(' ; ')}`
          : '';
        setSuggestionError(`AI unavailable for campaign suggestions (requested: ${s?._meta?.requestedModel || selectedModel || 'unknown'}, used: ${s?._meta?.model || 'none'}). Showing local fallback ideas.${reason}${diag}`);
      } else if (s?._meta?.source === 'ai' && s?._meta?.requestedModel && s?._meta?.model && s._meta.requestedModel !== s._meta.model) {
        setSuggestionError(`Requested model ${s._meta.requestedModel} was unavailable; used ${s._meta.model} instead.`);
      }
      if (s.campaignName) {
        setCampaignName(s.campaignName);
      }
      if (s.tone) setCampaignTone(s.tone as CampaignTone);
      if (s.themes && Array.isArray(s.themes)) setCampaignThemes(s.themes);
      if (s.pacing) setCampaignPacing(s.pacing as PacingSetting);
      if (s.description) setCampaignPrompt(s.description);
    } catch (error) {
      console.error('AI suggestion failed:', error);
      setSuggestionError('Could not generate suggestion. Try again.');
    } finally {
      setSuggestingCampaign(false);
    }
  };

  const handleLoadSaves = async () => {
    setLoadingSaves(true);
    try {
      const response = await fetch('/api/game/saves');
      const data = await response.json();
      setSavedGames(data.saves || []);
    } catch (error) {
      console.warn('Could not load saves:', error);
      setSavedGames([]);
    } finally {
      setLoadingSaves(false);
    }
  };

  const handleLoadGame = async (saveId: string) => {
    try {
      const response = await fetch(`/api/game/load/${saveId}`, { method: 'POST' });
      const data = await response.json();
      if (data.gameState) {
        const creatures = data.gameState.creatures || [];
        onStartBattle(creatures, 'moderate');
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      alert('Failed to load game');
    }
  };

  // ═══════════════════════════════════════════════════
  // RENDER: Character Builder (fullscreen)
  // ═══════════════════════════════════════════════════
  if (screen === 'builder') {
    return (
      <div className="landing-page">
        <CharacterBuilder
          onCharacterCreated={handleCharacterCreated}
          onCancel={() => {
            setBuilderSlotIndex(-1);
            setScreen(returnScreen);
          }}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Main Menu
  // ═══════════════════════════════════════════════════
  if (screen === 'main') {
    return (
      <div className="landing-page">
        <div className="landing-container main-menu">
          <div className="logo-section">
            <h1 className="title">⚔️ Algorithms Of Fate</h1>
            <p className="subtitle">A PF2e Remaster Tactical Simulator</p>
          </div>

          <div className="menu-buttons">
            <button
              className="menu-btn campaign-btn"
              onClick={() => startSetup('campaignSetup')}
            >
              <span className="menu-btn-icon">📜</span>
              <span className="menu-btn-label">Start Campaign</span>
              <span className="menu-btn-desc">Multi-encounter adventure with AI Game Master</span>
            </button>

            <button
              className="menu-btn encounter-btn"
              onClick={() => startSetup('encounterSetup')}
            >
              <span className="menu-btn-icon">⚔️</span>
              <span className="menu-btn-label">Start Encounter</span>
              <span className="menu-btn-desc">Single combat encounter</span>
            </button>

            <button
              className="menu-btn load-btn"
              onClick={() => {
                setScreen('loadGame');
                handleLoadSaves();
              }}
            >
              <span className="menu-btn-icon">📂</span>
              <span className="menu-btn-label">Load Game</span>
              <span className="menu-btn-desc">Continue a saved campaign or encounter</span>
            </button>

            <button
              className="menu-btn characters-btn"
              onClick={() => {
                setSavedCharacters(CharacterService.getAllCharacters());
                setScreen('characters');
              }}
            >
              <span className="menu-btn-icon">🛡️</span>
              <span className="menu-btn-label">Characters</span>
              <span className="menu-btn-desc">Create, view, and level up your characters</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Load Game Screen
  // ═══════════════════════════════════════════════════
  if (screen === 'loadGame') {
    return (
      <div className="landing-page">
        <div className="landing-container">
          <h1 className="title">📂 Load Game</h1>

          <div className="content">
            {loadingSaves ? (
              <div className="loading-message">Loading saved games...</div>
            ) : savedGames.length === 0 ? (
              <div className="empty-message">
                <p>No saved games found.</p>
                <p className="hint">Start a campaign or encounter to create your first save.</p>
              </div>
            ) : (
              <div className="saves-list">
                {savedGames.map(save => (
                  <div key={save.id} className="save-card" onClick={() => handleLoadGame(save.id)}>
                    <div className="save-info">
                      <h3>{save.name || save.encounterName || 'Unnamed Save'}</h3>
                      <p>Round {save.round} &bull; {save.playerCount} players &bull; {save.enemyCount} enemies</p>
                      <p className="save-date">{new Date(save.timestamp).toLocaleString()}</p>
                    </div>
                    <span className="save-load-icon">▶</span>
                  </div>
                ))}
              </div>
            )}

            <div className="setup-footer">
              <button className="btn-back" onClick={goBack}>
                ← Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Characters Screen (standalone builder + management)
  // ═══════════════════════════════════════════════════
  if (screen === 'characters') {
    // If standalone builder is open (new or editing), show it fullscreen
    if (standaloneBuilderActive) {
      return (
        <div className="landing-page">
          <CharacterBuilder
            onCharacterCreated={handleStandaloneCharacterCreated}
            onCancel={() => { setStandaloneBuilderActive(false); setEditingCharacterSheet(null); }}
            initialState={editingCharacterSheet?.builderState}
            editingCharacterId={editingCharacterSheet?.id}
          />
        </div>
      );
    }

    return (
      <div className="landing-page">
        <div className="landing-container">
          <h1 className="title">🛡️ Characters</h1>

          <div className="content">
            <div className="characters-actions">
              <button
                className="btn-start"
                onClick={() => setStandaloneBuilderActive(true)}
              >
                ✨ Create New Character
              </button>
            </div>

            {savedCharacters.length === 0 ? (
              <div className="empty-message">
                <p>No saved characters yet.</p>
                <p className="hint">Create a character to get started!</p>
              </div>
            ) : (
              <div className="characters-list">
                {savedCharacters.map(char => {
                  const creature = CharacterService.sheetToCreature(char);
                  const canLevelUp = creature && (creature.currentXP || 0) >= XP_PER_LEVEL;
                  return (
                    <div key={char.id} className="character-card">
                      <div
                        className="character-card-info"
                        onClick={() => {
                          if (creature) {
                            setSelectedManagedCharacter(creature);
                            setShowManagedSheet(true);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {(char.portraitImageUrl || char.tokenImageUrl) ? (
                            <img
                              src={char.portraitImageUrl || char.tokenImageUrl}
                              alt=""
                              style={{
                                width: '40px', height: char.portraitImageUrl ? '53px' : '40px',
                                borderRadius: char.tokenImageUrl && !char.portraitImageUrl ? '50%' : '6px',
                                objectFit: 'cover', border: '1px solid rgba(212,175,55,0.4)', flexShrink: 0,
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '28px', flexShrink: 0 }}>🛡️</span>
                          )}
                          <div>
                            <div className="char-name">{char.name}</div>
                            <div className="char-details">
                              Lv {char.level} {char.ancestry} {char.class} • {char.maxHealth || '?'} HP
                            </div>
                            {creature && (
                              <div className="char-xp-bar" style={{ marginTop: '4px' }}>
                                <div className="xp-progress-bar" style={{ width: '120px', height: '6px' }}>
                                  <div
                                    className={`xp-progress-fill ${canLevelUp ? 'xp-level-up' : ''}`}
                                    style={{ width: `${Math.min(100, ((creature.currentXP || 0) / XP_PER_LEVEL) * 100)}%` }}
                                  />
                                </div>
                                <span style={{ fontSize: '10px', color: '#aaa', marginLeft: '4px' }}>
                                  {creature.currentXP || 0}/{XP_PER_LEVEL} XP
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {canLevelUp && (
                          <span className="level-up-indicator">⬆️ Level Up!</span>
                        )}
                      </div>
                      <div className="character-card-actions">
                        {char.builderState && (
                          <button
                            className="char-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCharacterSheet(char);
                              setStandaloneBuilderActive(true);
                            }}
                            title="Edit Build"
                            style={{ color: '#87ceeb' }}
                          >
                            ✏️
                          </button>
                        )}
                        {canLevelUp && creature && (
                          <button
                            className="char-action-btn level-up"
                            onClick={(e) => { e.stopPropagation(); handleManagedLevelUp(creature); }}
                            title="Level Up"
                          >
                            ⬆️
                          </button>
                        )}
                        <button
                          className="char-action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${char.name}? This cannot be undone.`)) {
                              handleDeleteSavedCharacter(char.id);
                            }
                          }}
                          title="Delete Character"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="setup-footer">
              <button className="btn-back" onClick={goBack}>
                ← Back to Menu
              </button>
            </div>
          </div>
        </div>

        {/* Character Sheet Modal for managed characters */}
        {selectedManagedCharacter && (
          <CharacterSheetModal
            isOpen={showManagedSheet}
            onClose={() => { setShowManagedSheet(false); setSelectedManagedCharacter(null); }}
            creature={selectedManagedCharacter}
            onCreatureUpdate={(updatedCreature) => {
              setSelectedManagedCharacter(updatedCreature);
              // Sync image changes to localStorage
              const allChars = CharacterService.getAllCharacters();
              const match = allChars.find(c => c.id === updatedCreature.id || c.name === updatedCreature.name);
              if (match) {
                const updatedSheet: CharacterSheet = {
                  ...match,
                  tokenImageUrl: updatedCreature.tokenImageUrl,
                  portraitImageUrl: updatedCreature.portraitImageUrl,
                  updatedAt: Date.now(),
                };
                CharacterService.saveCharacter(updatedSheet);
                setSavedCharacters(CharacterService.getAllCharacters());
              }
            }}
            onLevelUp={(creature) => handleManagedLevelUp(creature)}
          />
        )}

        {/* Level-Up Wizard (no gameId = local mode) */}
        {levelUpCreature && levelUpNewLevel > 0 && (
          <LevelUpWizard
            creature={levelUpCreature}
            newLevel={levelUpNewLevel}
            onComplete={handleLevelUpComplete}
            onCancel={() => { setLevelUpCreature(null); setLevelUpNewLevel(0); }}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER: Campaign / Encounter Setup
  // ═══════════════════════════════════════════════════
  const isCampaign = screen === 'campaignSetup';

  return (
    <div className="landing-page">
      <div className="landing-container setup-container">
        <h1 className="title">{isCampaign ? '📜 Campaign Setup' : '⚔️ Encounter Setup'}</h1>

        <div className="content setup-scroll">

          {/* ─── Player Count ─────────────────────────── */}
          <section className="setup-section">
            <h2>Number of Players</h2>
            <div className="player-count-row">
              {[1, 2, 3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  className={`count-btn ${playerCount === num ? 'active' : ''}`}
                  onClick={() => setPlayerCount(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </section>

          {/* ─── Character Slots ──────────────────────── */}
          <section className="setup-section">
            <h2>Characters</h2>
            <div className="character-slots">
              {playerSlots.map((slot, index) => (
                <div key={index} className={`character-slot ${slot.creature ? 'filled' : 'empty'}`}>
                  <div className="slot-header">
                    <span className="slot-label">Player {index + 1}</span>
                    {slot.creature && (
                      <button
                        className="slot-clear"
                        onClick={() => handleClearSlot(index)}
                        title="Remove character"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {slot.creature ? (
                    <div
                      className="slot-character"
                      onClick={() => {
                        setSelectedCharacter(slot.creature);
                        setShowCharacterSheet(true);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(slot.creature.portraitImageUrl || slot.creature.tokenImageUrl) ? (
                          <img
                            src={slot.creature.portraitImageUrl || slot.creature.tokenImageUrl}
                            alt=""
                            style={{
                              width: '32px',
                              height: slot.creature.portraitImageUrl ? '43px' : '32px',
                              borderRadius: slot.creature.tokenImageUrl && !slot.creature.portraitImageUrl ? '50%' : '6px',
                              objectFit: 'cover',
                              border: '1px solid rgba(212,175,55,0.4)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '24px', flexShrink: 0 }}>🛡️</span>
                        )}
                        <div>
                          <span className="char-name">{slot.creature.name}</span>
                          <span className="char-details">
                            Lv {slot.creature.level}
                            {slot.creature.characterClass ? ` ${slot.creature.characterClass}` : ''}
                            {' \u2022 '}{slot.creature.maxHealth} HP
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="slot-actions">
                      <button className="slot-btn create" onClick={() => handleSlotCreateCharacter(index)}>
                        ✨ Create
                      </button>
                      <button className="slot-btn import" onClick={() => handleSlotImportCharacter(index)}>
                        📥 Import
                      </button>
                      {savedCharacters.length > 0 && (
                        <button className="slot-btn load" onClick={() => handleSlotLoadSaved(index)}>
                          📋 Saved ({savedCharacters.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ─── Party Stash ──────────────────────────── */}
          {currentPartyId && (
            <PartyStash
              partyId={currentPartyId}
              characters={playerSlots
                .filter(s => s.characterSheet !== null)
                .map(s => s.characterSheet!)}
            />
          )}

          {/* ─── Campaign Name (Campaign only) ─────────── */}
          {isCampaign && (
            <section className="setup-section">
              <h2>Campaign Name</h2>
              <input
                className="campaign-name-input"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Enter a name for your campaign..."
                maxLength={60}
              />
            </section>
          )}

          {/* ─── Campaign Tone (Campaign only) ────────── */}
          {isCampaign && (
            <section className="setup-section">
              <h2>Campaign Tone</h2>
              <p className="section-hint">Sets the narrative style for the AI Game Master.</p>
              <div className="tone-row">
                {([
                  { id: 'heroic' as CampaignTone, label: '⚔️ Heroic', desc: 'Classic high fantasy adventure' },
                  { id: 'gritty' as CampaignTone, label: '🩸 Gritty', desc: 'Dark, survival-focused realism' },
                  { id: 'political' as CampaignTone, label: '👑 Political', desc: 'Intrigue, factions, diplomacy' },
                  { id: 'dungeon-crawl' as CampaignTone, label: '🏰 Dungeon Crawl', desc: 'Exploration, traps, loot' },
                  { id: 'horror' as CampaignTone, label: '👻 Horror', desc: 'Dread, suspense, the unknown' },
                  { id: 'mystery' as CampaignTone, label: '🔍 Mystery', desc: 'Investigation, clues, secrets' },
                ]).map(tone => (
                  <button
                    key={tone.id}
                    className={`tone-btn ${campaignTone === tone.id ? 'active' : ''}`}
                    onClick={() => setCampaignTone(tone.id)}
                    title={tone.desc}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ─── Campaign Themes (Campaign only) ──────── */}
          {isCampaign && (
            <section className="setup-section">
              <h2>Themes</h2>
              <p className="section-hint">Select themes for your adventure (pick multiple).</p>
              <div className="themes-row">
                {[
                  'combat', 'roleplay', 'adventure', 'exploration', 'undead', 'dragons', 'nature',
                  'intrigue', 'war', 'planar', 'divine', 'arcane',
                  'pirates', 'heist', 'survival', 'ancient ruins', 'prophecy'
                ].map(theme => (
                  <button
                    key={theme}
                    className={`theme-tag ${campaignThemes.includes(theme) ? 'active' : ''}`}
                    onClick={() => toggleTheme(theme)}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ─── Campaign Pacing (Campaign only) ──────── */}
          {isCampaign && (
            <section className="setup-section">
              <h2>Pacing</h2>
              <p className="section-hint">How quickly the story progresses between encounters.</p>
              <div className="pacing-row">
                {([
                  { id: 'slow' as PacingSetting, label: '🐢 Slow', desc: 'Deep roleplay, extended exploration' },
                  { id: 'moderate' as PacingSetting, label: '⚖️ Moderate', desc: 'Balanced mix of narrative and combat' },
                  { id: 'fast' as PacingSetting, label: '⚡ Fast', desc: 'Quick story beats, frequent encounters' },
                ]).map(pace => (
                  <button
                    key={pace.id}
                    className={`pacing-btn ${campaignPacing === pace.id ? 'active' : ''}`}
                    onClick={() => setCampaignPacing(pace.id)}
                    title={pace.desc}
                  >
                    {pace.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ─── AI Model ─────────────────────────────── */}
          <section className="setup-section">
              <h2>AI Model</h2>
              <p className="section-hint">{isCampaign ? 'Choose which model powers your campaign GM.' : 'Choose which AI model controls enemy tactics.'} Newer models will appear here automatically when available.</p>
              <select
                className="campaign-name-input"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  localStorage.setItem('pf2e-preferred-ai-model', e.target.value);
                }}
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </section>

          {/* ─── AI Campaign Suggestion (Campaign only) ── */}
          {isCampaign && (
            <section className="setup-section ai-suggest-section">
              <h2>✨ AI Campaign Suggestions</h2>
              <p className="section-hint">Describe a campaign idea (optional) and let the AI suggest settings, or click to get a random suggestion.</p>
              <div className="ai-suggest-row">
                <input
                  className="ai-suggest-input"
                  type="text"
                  value={suggestionHint}
                  onChange={(e) => setSuggestionHint(e.target.value)}
                  placeholder="e.g. a pirate adventure with undead crews, a political mystery in a great city..."
                  maxLength={200}
                  disabled={suggestingCampaign}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAISuggest(); }}
                />
                <button
                  className={`btn-ai-suggest ${suggestingCampaign ? 'loading' : ''}`}
                  onClick={handleAISuggest}
                  disabled={suggestingCampaign}
                >
                  {suggestingCampaign ? (
                    <><span className="spinner" /> Generating...</>
                  ) : (
                    <>🎲 Suggest</>
                  )}
                </button>
              </div>
              {suggestionError && (
                <p className="suggestion-error">{suggestionError}</p>
              )}
            </section>
          )}

          {/* ─── AI GM Prompt (Campaign only) ─────────── */}
          {isCampaign && (
            <section className="setup-section">
              <h2>Adventure Description</h2>
              <p className="section-hint">Tell the AI Game Master what kind of adventure you want.</p>
              <textarea
                className="gm-prompt"
                value={campaignPrompt}
                onChange={(e) => setCampaignPrompt(e.target.value)}
                placeholder="Example: A dark fantasy dungeon crawl through an ancient dwarven stronghold overrun by undead. The party is searching for a legendary hammer that can seal a planar rift..."
                rows={4}
                maxLength={1000}
              />
            </section>
          )}

          {/* ─── Map / Terrain (Encounter only) ───────── */}
          {!isCampaign && (
            <section className="setup-section">
              <h2>Map Terrain</h2>
              <p className="section-hint">Select which features to include on the battlefield. Leave all unchecked for a random biome.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px', marginTop: 8 }}>
                {WILDERNESS_SUB_BIOMES.filter(b => b.id !== 'random').map(b => {
                  const checked = selectedSubBiomes.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      title={b.desc}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: `1px solid ${checked ? '#7c4dff' : '#3f2626'}`,
                        background: checked ? 'rgba(124,77,255,0.12)' : 'rgba(30,18,18,0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        color: checked ? '#c9b5ff' : '#d0c3b4',
                        fontSize: 13,
                        fontWeight: checked ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedSubBiomes(prev =>
                            prev.includes(b.id)
                              ? prev.filter(id => id !== b.id)
                              : [...prev, b.id]
                          );
                        }}
                        style={{ accentColor: '#7c4dff', width: 16, height: 16 }}
                      />
                      <span>{b.icon} {b.label}</span>
                    </label>
                  );
                })}
              </div>
              {selectedSubBiomes.length === 0 && (
                <p className="difficulty-desc" style={{ marginTop: 6 }}>🎲 Random — the map will feature a randomly chosen biome.</p>
              )}
              {selectedSubBiomes.length > 0 && (
                <p className="difficulty-desc" style={{ marginTop: 6 }}>
                  Selected: {selectedSubBiomes.map(id => {
                    const b = WILDERNESS_SUB_BIOMES.find(x => x.id === id);
                    return b ? `${b.icon} ${b.label}` : id;
                  }).join(', ')}
                </p>
              )}
            </section>
          )}

          {/* ─── Campaign Challenge (Campaign only) ───── */}
          {isCampaign && (
            <section className="setup-section">
              <h2>Campaign Challenge</h2>
              <p className="section-hint">Sets the overall danger level and encounter pressure for this campaign style.</p>
              <div className="difficulty-row">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-btn ${encounterDifficulty === d ? 'active' : ''}`}
                    style={{
                      borderColor: encounterDifficulty === d ? DIFFICULTY_COLORS[d] : undefined,
                      color: encounterDifficulty === d ? DIFFICULTY_COLORS[d] : undefined,
                    }}
                    onClick={() => setEncounterDifficulty(d)}
                    title={CAMPAIGN_DIFFICULTY_DESC[d]}
                  >
                    {CAMPAIGN_DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
              <p className="difficulty-desc">{CAMPAIGN_DIFFICULTY_DESC[encounterDifficulty]}</p>
            </section>
          )}

          {/* ─── Encounter Difficulty (Encounter only) ── */}
          {!isCampaign && (
            <section className="setup-section">
              <h2>Encounter Difficulty</h2>
              <p className="section-hint">Controls how tough the enemy creatures will be.</p>
              <div className="difficulty-row">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-btn ${encounterDifficulty === d ? 'active' : ''}`}
                    style={{
                      borderColor: encounterDifficulty === d ? DIFFICULTY_COLORS[d] : undefined,
                      color: encounterDifficulty === d ? DIFFICULTY_COLORS[d] : undefined,
                    }}
                    onClick={() => setEncounterDifficulty(d)}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ─── AI Difficulty (Encounter only) ───────── */}
          {!isCampaign && (
            <section className="setup-section">
              <h2>AI Difficulty</h2>
              <p className="section-hint">How smart the enemy AI plays during combat.</p>
              <div className="difficulty-row">
                {AI_DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-btn ${aiDifficulty === d ? 'active' : ''}`}
                    style={{
                      borderColor: aiDifficulty === d ? AI_DIFFICULTY_COLORS[d] : undefined,
                      color: aiDifficulty === d ? AI_DIFFICULTY_COLORS[d] : undefined,
                    }}
                    onClick={() => setAiDifficulty(d)}
                  >
                    {AI_DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
              <p className="difficulty-desc">{AI_DIFFICULTY_DESC[aiDifficulty]}</p>
            </section>
          )}

          {/* ─── Actions ──────────────────────────────── */}
          <section className="setup-actions">
            <button
              className={`btn-start ${!canStart ? 'disabled' : ''}`}
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {canStart
                ? (isCampaign ? `Start Campaign (${filledSlots.length} player${filledSlots.length !== 1 ? 's' : ''})` : `Start Encounter (${filledSlots.length} player${filledSlots.length !== 1 ? 's' : ''})`)
                : 'Add at least one character to start'}
            </button>
            <button className="btn-back" onClick={goBack}>
              ← Back to Menu
            </button>
          </section>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────── */}

      <PathbuilderUploadModal
        isOpen={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setUploadSlotIndex(-1); }}
        onCharacterImported={handleCharacterImported}
        multiple={false}
      />

      {selectedCharacter && (
        <CharacterSheetModal
          isOpen={showCharacterSheet}
          onClose={() => { setShowCharacterSheet(false); setSelectedCharacter(null); }}
          creature={selectedCharacter}
          onCreatureUpdate={(updatedCreature) => {
            // Update the displayed character
            setSelectedCharacter(updatedCreature);
            // Update the slot creature
            setPlayerSlots(prev => prev.map(slot => {
              if (slot.creature?.id === updatedCreature.id) {
                // Also update the characterSheet in localStorage if it exists
                if (slot.characterSheet) {
                  const updatedSheet: CharacterSheet = {
                    ...slot.characterSheet,
                    tokenImageUrl: updatedCreature.tokenImageUrl,
                    portraitImageUrl: updatedCreature.portraitImageUrl,
                    updatedAt: Date.now(),
                  };
                  CharacterService.saveCharacter(updatedSheet);
                  return { ...slot, creature: updatedCreature, characterSheet: updatedSheet };
                }
                return { ...slot, creature: updatedCreature };
              }
              return slot;
            }));
          }}
          onLevelUp={(creature) => {
            const slotIdx = playerSlots.findIndex(s => s.creature?.id === creature.id);
            handleSlotLevelUp(creature, slotIdx >= 0 ? slotIdx : 0);
          }}
        />
      )}

      {/* ─── Saved Character Picker Modal ────────────── */}
      {showCharacterPicker && (
        <div className="modal-overlay" onClick={() => setShowCharacterPicker(false)}>
          <div className="picker-modal" onClick={e => e.stopPropagation()}>
            <div className="picker-header">
              <h2>Select a Saved Character</h2>
              <button className="picker-close" onClick={() => setShowCharacterPicker(false)}>✕</button>
            </div>
            <div className="picker-list">
              {savedCharacters.length === 0 ? (
                <p className="empty-message">No saved characters found.</p>
              ) : (
                savedCharacters.map(char => (
                  <div
                    key={char.id}
                    className="picker-item"
                    onClick={() => handlePickSavedCharacter(char)}
                  >
                    <span className="picker-name">{char.name}</span>
                    <span className="picker-details">
                      Lv {char.level} {char.ancestry} {char.class}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Level-Up Wizard (setup screen, no gameId = local mode) ──── */}
      {levelUpCreature && levelUpNewLevel > 0 && (
        <LevelUpWizard
          creature={levelUpCreature}
          newLevel={levelUpNewLevel}
          onComplete={handleLevelUpComplete}
          onCancel={() => { setLevelUpCreature(null); setLevelUpNewLevel(0); setLevelUpSlotIndex(-1); }}
        />
      )}
    </div>
  );
};

export default LandingPage;
