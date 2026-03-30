import React, { useEffect, useState } from 'react';
import { AtlasViewer } from './pages/AtlasViewer';
import { AtlasApprovedDatabase } from './pages/AtlasApprovedDatabase';
import { LandingPage } from './pages/LandingPage';
import CombatInterface from './components/CombatInterface';
import { MusicPlayer } from './components/MusicPlayer';
import DiceQuickRoll from './components/DiceQuickRoll';
import { fetchAIModels, updateDefaultAIModel } from './services/apiService';
import type { Creature, CampaignPreferences } from '../../shared/types';
import type { Difficulty } from '../../shared/encounterBuilder';

type Page = 'home' | 'campaignSetup' | 'encounterSetup' | 'loadGame' | 'characters' | 'combat' | 'viewer' | 'database';

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const [page, setPage] = useState<Page>(
    params.get('page') === 'viewer'
      ? 'viewer'
      : params.get('page') === 'database'
        ? 'database'
        : 'home',
  );

  // Combat state — populated when LandingPage calls onStartBattle
  const [battleCreatures, setBattleCreatures] = useState<Creature[]>([]);
  const [battleDifficulty, setBattleDifficulty] = useState<Difficulty>('moderate');
  const [battlePreferences, setBattlePreferences] = useState<CampaignPreferences | undefined>();
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSavingModel, setIsSavingModel] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { models, currentModel } = await fetchAIModels();
        if (!active) return;
        setAvailableModels(models);
        setSelectedModel(currentModel || models[0] || '');
      } catch {
        if (!active) return;
        setAvailableModels([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleGlobalModelChange = async (nextModel: string) => {
    setSelectedModel(nextModel);
    setIsSavingModel(true);
    try {
      const updated = await updateDefaultAIModel(nextModel);
      setSelectedModel(updated.currentModel || nextModel);
    } catch {
      // keep selected value in UI; backend validation will enforce model list
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleStartBattle = (creatures: Creature[], difficulty: Difficulty, preferences?: CampaignPreferences) => {
    setBattleCreatures(creatures);
    setBattleDifficulty(difficulty);
    setBattlePreferences(preferences);
    setPage('combat');
  };

  const gameActions = [
    {
      key: 'new-campaign',
      title: 'Start New Campaign',
      target: 'campaignSetup' as Page,
    },
    {
      key: 'new-encounter',
      title: 'Start New Encounter',
      target: 'encounterSetup' as Page,
    },
    {
      key: 'load-save',
      title: 'Load Campaign / Encounter',
      target: 'loadGame' as Page,
    },
    {
      key: 'character-editor',
      title: 'Character Editor',
      target: 'characters' as Page,
    },
  ];

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#070505' }}>
      {page !== 'combat' && (
        <div style={{
          display: 'flex',
          gap: 10,
          padding: '12px 16px',
          background: 'linear-gradient(90deg, #170b0b 0%, #0f0a0a 100%)',
          borderBottom: '1px solid #3f2626',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <span style={{ fontWeight: 800, marginRight: 8, color: '#ead8be', letterSpacing: 0.6, fontFamily: "'Cinzel', 'Times New Roman', serif" }}>
            Algorithms Of Fate
          </span>
          {page === 'home' && availableModels.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="global-ai-model" style={{ color: '#d0c3b4', fontSize: 12, fontWeight: 600 }}>
                AI Model
              </label>
              <select
                id="global-ai-model"
                value={selectedModel}
                onChange={(e) => handleGlobalModelChange(e.target.value)}
                disabled={isSavingModel}
                style={{
                  background: '#1b1010',
                  color: '#ead8be',
                  border: '1px solid #5a3a3a',
                  borderRadius: 6,
                  padding: '6px 10px',
                  minWidth: 170,
                  fontSize: 12,
                }}
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {page === 'home' ? (
          <div style={{
            minHeight: '100%',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: 'radial-gradient(1200px 700px at 12% -15%, rgba(130, 28, 28, 0.48) 0%, transparent 52%), radial-gradient(1000px 520px at 96% 4%, rgba(76, 45, 18, 0.30) 0%, transparent 44%), radial-gradient(1200px 750px at 50% 120%, rgba(84, 18, 18, 0.34) 0%, transparent 58%), #070505',
          }}>
            <div style={{
              position: 'relative',
              width: 'min(980px, 100%)',
              border: '1px solid rgba(160,120,80,0.25)',
              borderRadius: 6,
              background: 'linear-gradient(180deg, rgba(25,14,14,0.97) 0%, rgba(14,9,9,0.97) 100%)',
              padding: 28,
              boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            }}>

              <div style={{ marginBottom: 10 }} />

              <h1 style={{ margin: 0, fontSize: '2.2rem', lineHeight: 1.15, color: '#ece7da', fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: 0.8 }}>
                Algorithms Of Fate
              </h1>
              <p style={{ marginTop: 14, color: '#d0c3b4', fontSize: '1.01rem', maxWidth: 760, lineHeight: 1.62 }}>
                An endless PF2e sandbox and encounter simulator
              </p>

              <div style={{
                marginTop: 16,
                height: 104,
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 18,
              }}>
                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, #5e3a34 100%)' }} />
                <DiceQuickRoll />
                <div style={{ height: 1, background: 'linear-gradient(90deg, #5e3a34 0%, transparent 100%)' }} />
              </div>

              <div style={{
                marginTop: 24,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}>
                {gameActions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="frontpage-action"
                    onClick={() => setPage(item.target)}
                    style={{
                      textAlign: 'left',
                      border: '1px solid #5a3a3a',
                      background: 'linear-gradient(180deg, #241515 0%, #1b1010 100%)',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      boxShadow: 'inset 0 0 0 1px rgba(154,97,72,0.18)',
                    }}
                  >
                    <div style={{ color: '#f0e1c9', fontWeight: 700, fontSize: 15 }}>{item.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : page === 'combat' ? (
          <CombatInterface
            initialCreatures={battleCreatures}
            difficulty={battleDifficulty}
            campaignPreferences={battlePreferences}
            onReturnToLanding={() => setPage('home')}
          />
        ) : page === 'campaignSetup' || page === 'encounterSetup' || page === 'loadGame' || page === 'characters' ? (
          <LandingPage
            initialScreen={page}
            onStartBattle={handleStartBattle}
            onReturnHome={() => setPage('home')}
          />
        ) : page === 'viewer' ? (
          <AtlasViewer />
        ) : (
          <AtlasApprovedDatabase />
        )}
      </div>

      {/* Persistent floating music player — available on all pages */}
      <MusicPlayer />
    </div>
  );
};

export default App;
