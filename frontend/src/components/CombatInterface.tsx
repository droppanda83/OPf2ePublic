import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CombatInterface.css';
import BattleGrid from './BattleGrid';
import CreaturePanel from './CreaturePanel';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('💥 Error Boundary caught:', error);
    console.error('Stack:', error.stack);
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#f44336',
          color: '#fff',
          margin: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <h3>💥 Rendering Error</h3>
          <details style={{ cursor: 'pointer', marginTop: '10px' }}>
            <summary>Click to see error details</summary>
            <pre style={{ fontSize: '12px', overflow: 'auto', marginTop: '10px', background: '#000', padding: '10px' }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const API_BASE = '/api';

export interface GameUIState {
  gameId: string | null;
  gameState: any;
  currentCreatureId: string | null;
  selectedTarget: string | null;
  loading: boolean;
  error: string | null;
}

const CombatInterface: React.FC = () => {
  const [uiState, setUiState] = useState<GameUIState>({
    gameId: null,
    gameState: null,
    currentCreatureId: null,
    selectedTarget: null,
    loading: false,
    error: null
  });

  const [selectedAction, setSelectedAction] = useState<any>(null);

  // Monitor state changes
  useEffect(() => {
    console.log('📊 UI State changed:', {
      gameId: uiState.gameId,
      hasGameState: !!uiState.gameState,
      loading: uiState.loading,
      error: uiState.error
    });
  }, [uiState]);

  // Initialize game
  const startNewGame = async () => {
    console.log('🎮 Start new game clicked');
    setUiState(prev => ({ ...prev, loading: true, error: null }));
    try {
      console.log('📡 Sending game create request to', `${API_BASE}/game/create`);
      const response = await axios.post(`${API_BASE}/game/create`, {
        players: [
          { name: 'Player 1', level: 3, maxHealth: 30, armor: 16 },
          { name: 'Player 2', level: 2, maxHealth: 25, armor: 14 }
        ],
        creatures: [
          { name: 'Goblin Warrior', level: 1, maxHealth: 15, armor: 12 },
          { name: 'Goblin Caster', level: 1, maxHealth: 12, armor: 10 }
        ],
        mapSize: 20
      });

      console.log('✅ Game created successfully:', response.data);
      console.log('📋 Game ID:', response.data.id);
      console.log('🎯 Turn Order:', response.data.currentRound?.turnOrder);
      console.log('👥 Creatures:', response.data.creatures);

      if (!response.data.id) {
        throw new Error('No game ID returned from server');
      }

      setUiState(prev => ({
        ...prev,
        gameId: response.data.id,
        gameState: response.data,
        currentCreatureId: response.data.currentRound.turnOrder[0],
        loading: false
      }));
      console.log('🎮 UI State updated with game data');
    } catch (error: any) {
      console.error('❌ Game creation error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create game';
      console.log('📢 Setting error:', errorMessage);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  // Execute action
  const executeAction = async (action: any, targetOrPosition?: any) => {
    if (!uiState.gameId || !uiState.currentCreatureId) return;

    setUiState(prev => ({ ...prev, loading: true }));
    try {
      console.log('🎯 Executing action:', action.id, 'target/position:', targetOrPosition);
      
      // Determine if this is a position (movement) or target (combat)
      let payload: any = {
        creatureId: uiState.currentCreatureId,
        actionId: action.id
      };

      if (action.id === 'move' && targetOrPosition && typeof targetOrPosition === 'object') {
        payload.targetPosition = targetOrPosition;
        console.log('📍 Movement to position:', targetOrPosition);
      } else if (targetOrPosition) {
        payload.targetId = typeof targetOrPosition === 'string' ? targetOrPosition : uiState.selectedTarget;
        console.log('🎯 Combat target:', payload.targetId);
      }

      const response = await axios.post(
        `${API_BASE}/game/${uiState.gameId}/action`,
        payload
      );

      console.log('📊 Response from server:', response.data);
      
      setUiState(prev => ({
        ...prev,
        gameState: response.data.gameState || response.data,
        currentCreatureId: (response.data.gameState || response.data).currentRound.turnOrder[
          (response.data.gameState || response.data).currentRound.currentTurnIndex
        ],
        loading: false,
        selectedTarget: null
      }));
      setSelectedAction(null);
      console.log('✅ Action executed successfully');
    } catch (error: any) {
      console.error('❌ Action execution error:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Action failed'
      }));
    }
  };

  const handleSelectAction = (action: any) => {
    console.log('🎬 Action selected:', action.id);
    setSelectedAction(action);
    setUiState(prev => ({ ...prev, selectedTarget: null }));
  };

  const handleConfirmAction = () => {
    if (!selectedAction) return;
    
    // If action doesn't require target, execute immediately
    if (!selectedAction.requiresTarget) {
      console.log('⚡ Self-targeting action, executing immediately');
      executeAction(selectedAction);
      return;
    }

    // If target is selected, execute
    if (uiState.selectedTarget) {
      console.log('🎯 Target selected, executing action');
      
      // For movement, parse the grid coordinates
      let targetData: any = uiState.selectedTarget;
      if (selectedAction.id === 'move' && typeof uiState.selectedTarget === 'string') {
        const [x, y] = uiState.selectedTarget.split('-').map(Number);
        targetData = { x, y };
        console.log('📍 Movement target parsed:', targetData);
      }
      
      executeAction(selectedAction, targetData);
      return;
    }

    console.log('⚠️ No target selected');
  };

  const handleCancelAction = () => {
    console.log('❌ Action cancelled');
    setSelectedAction(null);
    setUiState(prev => ({ ...prev, selectedTarget: null }));
  };

  const getCurrentCreature = () => {
    if (!uiState.gameState) return null;
    return uiState.gameState.creatures.find(
      (c: any) => c.id === uiState.currentCreatureId
    );
  };

  return (
    <ErrorBoundary>
      <div className="combat-interface">
        <div className="combat-header">
          <h1>⚔️ PF2e Tactical Combat</h1>
          {!uiState.gameId && (
            <button onClick={startNewGame} disabled={uiState.loading} className="btn-primary">
              {uiState.loading ? 'Starting...' : 'Start New Combat'}
            </button>
          )}
        </div>

        {uiState.error && (
          <div className="error-message">
            {uiState.error}
            <button onClick={() => setUiState(prev => ({ ...prev, error: null }))}>✕</button>
          </div>
        )}

        {/* Debug Panel */}
        {uiState.loading && (
          <div style={{ padding: '10px', background: '#333', color: '#0f0', fontSize: '12px', borderBottom: '1px solid #666' }}>
            ⏳ Loading... Waiting for server response...
          </div>
        )}

        {!uiState.gameState && !uiState.loading && !uiState.gameId && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#ccc' }}>
            <p>Click "Start New Combat" to begin an encounter</p>
            <p style={{ fontSize: '12px', color: '#888' }}>
              State: gameId={uiState.gameId ? 'set' : 'null'} | gameState={uiState.gameState ? 'loaded' : 'null'}
            </p>
          </div>
        )}

        {uiState.gameState && (
          <div className="combat-layout">
            <div className="left-panel">
              <CreaturePanel 
                creatures={uiState.gameState.creatures}
                currentRound={uiState.gameState.currentRound}
              />
            </div>

            <div className="center-panel">
              <div className="combat-info">
                <h2>Round {uiState.gameState.currentRound.number}</h2>
                {getCurrentCreature() && (
                  <div className="current-turn">
                    <strong>{getCurrentCreature().name}'s Turn</strong>
                    <span className={`turn-type ${getCurrentCreature().type}`}>
                      {getCurrentCreature().type}
                    </span>
                  </div>
                )}
              </div>

              <BattleGrid
                gameState={uiState.gameState}
                selectedTarget={uiState.selectedTarget}
                selectedAction={selectedAction}
                onSelectTarget={(id) => setUiState(prev => ({ ...prev, selectedTarget: id }))}
              />
            </div>

            <div className="right-panel">
              <ActionPanel
                currentCreature={getCurrentCreature()}
                selectedAction={selectedAction}
                selectedTarget={uiState.selectedTarget}
                onSelectAction={handleSelectAction}
                onConfirmAction={handleConfirmAction}
                onCancel={handleCancelAction}
                loading={uiState.loading}
              />

              <GameLog log={uiState.gameState?.log || []} />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CombatInterface;
