import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './CombatInterface.css';
import BattleGrid from './BattleGrid';
import CreaturePanel from './CreaturePanel';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import SaveLoadModal from './SaveLoadModal';
import { CreatureStatsModal } from './CreatureStatsModal';
import { PathbuilderUploadModal } from './PathbuilderUploadModal';
import { CharacterSheetModal } from './CharacterSheetModal';
import { computeMovementCostMap } from '../utils/movement';
import type { Creature } from '../../../shared/types';
import type { Difficulty } from '../../../shared/encounterBuilder';

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

export interface MovementInfo {
  costMap: Map<string, number>;
  maxDistance: number;
  origin: { x: number; y: number };
}

export interface GameUIState {
  gameId: string | null;
  gameState: any;
  currentCreatureId: string | null;
  selectedTarget: string | null;
  loading: boolean;
  error: string | null;
  actionPoints: number;
}

type ReactionPromptType = 'reactive-strike' | 'shield-block';

interface ReactionPrompt {
  id: string;
  type: ReactionPromptType;
  reactorId?: string;
  reactorName?: string;
  targetId: string;
  targetName: string;
  triggerType?: string;
  triggeringActionName?: string;
  triggeringCreatureName?: string;
  amount?: number;
}

interface CombatInterfaceProps {
  initialCreatures?: Creature[];
  difficulty?: Difficulty;
  onReturnToLanding?: () => void;
}

const CombatInterface: React.FC<CombatInterfaceProps> = ({
  initialCreatures,
  difficulty = 'moderate',
  onReturnToLanding
}) => {
  console.log('🎮 CombatInterface component rendering', { hasInitialCreatures: !!initialCreatures, difficulty });
  
  const [uiState, setUiState] = useState<GameUIState>({
    gameId: null,
    gameState: null,
    currentCreatureId: null,
    selectedTarget: null,
    loading: false,
    error: null,
    actionPoints: 3
  });

  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [saveLoadModal, setSaveLoadModal] = useState<{ isOpen: boolean; mode: 'save' | 'load' }>({
    isOpen: false,
    mode: 'save'
  });
  const [selectedCreatureForStats, setSelectedCreatureForStats] = useState<any>(null);
  const [selectedCharacterForSheet, setSelectedCharacterForSheet] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [pathbuilderModalOpen, setPathbuilderModalOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [importWarningOpen, setImportWarningOpen] = useState(false);
  const [reactionQueue, setReactionQueue] = useState<ReactionPrompt[]>([]);
  const [activeReaction, setActiveReaction] = useState<ReactionPrompt | null>(null);
  const [pickupDestinationModalOpen, setPickupDestinationModalOpen] = useState(false);
  const [pendingPickupAction, setPendingPickupAction] = useState<any>(null);
  const [heroPointSpend, setHeroPointSpend] = useState(0);

  const movementInfo = useMemo<MovementInfo | null>(() => {
    if (!uiState.gameState || !selectedAction || !selectedAction.movementType) {
      return null;
    }

    const currentCreatureId = uiState.currentCreatureId;
    if (!currentCreatureId) {
      return null;
    }

    const currentCreature = uiState.gameState.creatures.find(
      (creature: any) => creature.id === currentCreatureId
    );

    if (!currentCreature) {
      return null;
    }

    const terrain = uiState.gameState.map?.terrain;
    if (!terrain) {
      return null;
    }

    // Calculate movement range based on action's range property
    // If range is 0 or not set, use creature's speed
    // Otherwise use the action's specified range (e.g., Step has range: 1)
    const maxDistance = (selectedAction.range && selectedAction.range > 0) 
      ? selectedAction.range 
      : currentCreature.speed / 5;
    const isProne = currentCreature.conditions?.some((c: any) => c.name === 'prone') ?? false;
    const terrainCostMultiplier = isProne ? { difficult: 4 } : undefined;
    const occupiedPositions: Set<string> = new Set(
      uiState.gameState.creatures
        .filter((creature: any) => creature.id !== currentCreature.id && creature.currentHealth > 0)
        .map((creature: any) => `${creature.positions.x},${creature.positions.y}`)
    );

    const { costMap } = computeMovementCostMap(currentCreature.positions, terrain, {
      maxDistance,
      terrainCostMultiplier,
      occupiedPositions,
    });

    return {
      costMap,
      maxDistance,
      origin: { ...currentCreature.positions },
    };
  }, [selectedAction, uiState.gameState, uiState.currentCreatureId]);

  useEffect(() => {
    if (!activeReaction && reactionQueue.length > 0) {
      setActiveReaction(reactionQueue[0]);
      setReactionQueue(prev => prev.slice(1));
    }
  }, [activeReaction, reactionQueue]);

  useEffect(() => {
    if (!uiState.gameState || !uiState.currentCreatureId) return;
    const currentCreature = uiState.gameState.creatures.find(
      (creature: any) => creature.id === uiState.currentCreatureId
    );
    const availableHeroPoints = Math.max(0, Math.min(currentCreature?.heroPoints ?? 1, 3));
    if (heroPointSpend > availableHeroPoints) {
      setHeroPointSpend(0);
    }
  }, [uiState.gameState, uiState.currentCreatureId, heroPointSpend]);

  // Monitor state changes
  useEffect(() => {
    console.log('📊 UI State changed:', {
      gameId: uiState.gameId,
      hasGameState: !!uiState.gameState,
      loading: uiState.loading,
      error: uiState.error
    });
  }, [uiState]);

  // Auto-start game if initial creatures provided
  useEffect(() => {
    if (initialCreatures && initialCreatures.length > 0 && !uiState.gameId) {
      console.log('🎯 Auto-starting game with imported creatures');
      startNewGame();
    }
  }, [initialCreatures]);

  // Initialize game
  const startNewGame = async () => {
    console.log('🎮 Start new game clicked', { hasInitialCreatures: !!initialCreatures, difficulty });
    setUiState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Determine party level from imported characters (average, default 1)
      const partyLevel = initialCreatures && initialCreatures.length > 0
        ? Math.round(initialCreatures.reduce((sum, c) => sum + (c.level || 1), 0) / initialCreatures.length)
        : 1;
      const partySize = initialCreatures?.length || 1;

      console.log(`📡 Fetching ${difficulty} encounter for party level ${partyLevel}, size ${partySize}`);
      
      // Fetch encounter from bestiary API
      const encounterResponse = await axios.get(`${API_BASE}/bestiary/encounter`, {
        params: { difficulty, partyLevel, partySize }
      });
      const encounter = encounterResponse.data;
      console.log('🐉 Encounter generated:', encounter.description);

      console.log('📡 Sending game create request to', `${API_BASE}/game/create`);
      console.log('🎭 Team assignment: players =', initialCreatures?.length || 0, ', creatures =', encounter.creatures.length);
      
      // Log what we're about to send
      console.log(`[startNewGame] ===== SENDING TO BACKEND =====`);
      if (initialCreatures && initialCreatures.length > 0) {
        initialCreatures.forEach((c, idx) => {
          console.log(`[startNewGame] Player ${idx} (${c.name}):`, {
            hasSkills: !!c.skills,
            skillsCount: c.skills?.length,
            skills: c.skills?.slice(0, 2).map((s: any) => `${s.name}(${s.proficiency})`),
            hasFeats: !!c.feats,
            featsCount: c.feats?.length,
            feats: c.feats?.slice(0, 2).map((f: any) => `${f.name}(${f.type})`),
            hasLores: !!c.lores,
            loresCount: c.lores?.length,
            hasFocusSpells: !!c.focusSpells,
            focusSpellsCount: c.focusSpells?.length,
            focusSpells: c.focusSpells
          });
        });
      }
      console.log(`[startNewGame] ============================\n`);
      
      const response = await axios.post(`${API_BASE}/game/create`, {
        players: initialCreatures || [],  // Imported characters go on player team
        creatures: encounter.creatures,   // Bestiary-generated enemies
        mapSize: 20
      });

      console.log('✅ Game created successfully:', response.data);
      if (!response.data.id) {
        throw new Error('No game ID returned from server');
      }
      
      // Debug: Log what we got back from the backend
      console.log(`[startNewGame] ===== RECEIVED FROM BACKEND =====`);
      response.data.creatures.forEach((c: any, i: number) => {
        console.log(`[startNewGame] Creature ${i} (${c.name}):`, {
          hasSkills: !!c.skills,
          skillsCount: c.skills?.length,
          skills: c.skills?.slice(0, 2).map((s: any) => `${s.name}(${s.proficiency})`),
          hasFeats: !!c.feats,
          featsCount: c.feats?.length,
          feats: c.feats?.slice(0, 2).map((f: any) => `${f.name}(${f.type})`),
          hasLores: !!c.lores,
          loresCount: c.lores?.length
        });
      });
      console.log(`[startNewGame] ============================\n`);

      // Debug: Log all creatures with their shield properties
      console.log('🛡️ Game creatures shield properties:');
      response.data.creatures.forEach((creature: any, index: number) => {
        console.log(`  Creature ${index} (${creature.name}):`, {
          equippedShield: creature.equippedShield,
          shieldRaised: creature.shieldRaised,
          currentShieldHp: creature.currentShieldHp
        });
      });

      setUiState(prev => ({
        ...prev,
        gameId: response.data.id,
        gameState: response.data,
        currentCreatureId: response.data.currentRound.turnOrder[0],
        loading: false,
        actionPoints: 3
      }));
    } catch (error: any) {
      console.error('❌ Game creation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create game';
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  // Import Pathbuilder characters
  const handlePathbuilderImport = async (creatures: Creature[]) => {
    if (!uiState.gameId || !uiState.gameState) {
      console.error('❌ Cannot import: gameId or gameState missing', { gameId: uiState.gameId, hasGameState: !!uiState.gameState });
      setUiState(prev => ({
        ...prev,
        error: 'No active game. Please start a new combat first.'
      }));
      return;
    }

    try {
      setModalLoading(true);
      console.log(`🎯 Importing ${creatures.length} characters from Pathbuilder...`);
      console.log(`📋 Game ID: ${uiState.gameId}`);
      console.log(`📋 Creatures to import:`, creatures);
      
      // Debug: Check skills/feats/spells before sending to backend
      creatures.forEach((c, idx) => {
        console.log(`[handlePathbuilderImport] Creature ${idx} before API call:`, {
          name: c.name,
          skills: c.skills,
          skillsCount: c.skills?.length,
          feats: c.feats,
          featsCount: c.feats?.length,
          spells: c.spells,
          spellsCount: c.spells?.length
        });
      });

      // Add imported creatures to the game
      const url = `${API_BASE}/game/${uiState.gameId}/add-creatures`;
      console.log(`📡 Calling: ${url}`);
      const response = await axios.post(url, {
        creatures: creatures,
      });

      console.log('✅ Characters imported:', response.data);
      setUiState(prev => ({
        ...prev,
        gameState: response.data
      }));
      setPathbuilderModalOpen(false);
    } catch (error: any) {
      console.error('❌ Import error:', error);
      console.error('📡 Response status:', error.response?.status);
      console.error('📡 Response data:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to import characters';
      setUiState(prev => ({
        ...prev,
        error: errorMessage
      }));
    } finally {
      setModalLoading(false);
    }
  };

  // Execute action
  const executeAction = async (
    action: any,
    targetOrPosition?: any,
    overrideCreatureId?: string,
    heroPointsSpent?: number
  ) => {
    if (!uiState.gameId || !uiState.currentCreatureId) return;
    const actingCreatureId = overrideCreatureId ?? uiState.currentCreatureId;

    // Check if creature has enough action points
    if (!overrideCreatureId && uiState.actionPoints < action.cost) {
      setUiState(prev => ({
        ...prev,
        error: `Not enough action points. Need ${action.cost}, have ${uiState.actionPoints}.`
      }));
      return;
    }

    setUiState(prev => ({ ...prev, loading: true }));
    try {
      let payload: any = {
        creatureId: actingCreatureId,
        actionId: action.id
      };

      // Include weaponId if present on the action
      if (action.weaponId) {
        payload.weaponId = action.weaponId;
      }

      // Include pickupDestination for pick-up-weapon actions
      if (action.pickupDestination) {
        payload.pickupDestination = action.pickupDestination;
      }

      if (typeof heroPointsSpent === 'number') {
        payload.heroPointsSpent = heroPointsSpent;
        console.log('🎯 Added heroPointsSpent to payload:', heroPointsSpent);
      }

      console.log('📤 Sending action payload:', payload);

      // Handle different target types
      if ((action.movementType || action.aoe) && targetOrPosition && typeof targetOrPosition === 'object') {
        // Movement and AoE spells use position
        payload.targetPosition = targetOrPosition;
      } else if (targetOrPosition) {
        // Single-target actions use creature ID
        payload.targetId = typeof targetOrPosition === 'string' ? targetOrPosition : uiState.selectedTarget;
      }

      const response = await axios.post(
        `${API_BASE}/game/${uiState.gameId}/action`,
        payload
      );
      
      console.log('📥 Backend response:', response.data);
      
      const result = response.data.result ?? response.data;
      const isCurrentActor = actingCreatureId === uiState.currentCreatureId;
      const shouldConsumeAction = isCurrentActor && result?.success === true;
      const newActionPoints = shouldConsumeAction
        ? uiState.actionPoints - action.cost
        : uiState.actionPoints;
      
      setUiState(prev => ({
        ...prev,
        gameState: response.data.gameState || response.data,
        loading: false,
        selectedTarget: result?.success === true ? null : prev.selectedTarget,
        actionPoints: newActionPoints
      }));
      if (isCurrentActor && result?.success === true) {
        setSelectedAction(null);
      }
      const reactionOpportunities = response.data.reactionOpportunities ?? result?.reactionOpportunities ?? [];
      const nextPrompts: ReactionPrompt[] = [];
      if (Array.isArray(reactionOpportunities) && reactionOpportunities.length > 0) {
        for (const opportunity of reactionOpportunities) {
          nextPrompts.push({
            id: `${Date.now()}-${Math.random()}`,
            type: 'reactive-strike',
            reactorId: opportunity.reactorId,
            reactorName: opportunity.reactorName,
            targetId: opportunity.targetId,
            targetName: opportunity.targetName,
            triggerType: opportunity.trigger,
            triggeringActionName: opportunity.triggeringActionName,
            triggeringCreatureName: opportunity.triggeringCreatureName
          });
        }
      }

      if (result?.pendingDamage && result.pendingDamage.targetId) {
        const pd = result.pendingDamage;
        nextPrompts.push({
          id: `${Date.now()}-${Math.random()}`,
          type: 'shield-block',
          reactorId: pd.targetId,
          reactorName: pd.targetName,
          targetId: pd.targetId,
          targetName: pd.targetName,
          amount: pd.amount,
          triggeringActionName: pd.triggeringActionName,
          triggeringCreatureName: pd.attackerName
        });
      }

      if (nextPrompts.length > 0) {
        setReactionQueue(prev => [...prev, ...nextPrompts]);
      }
    } catch (error: any) {
      console.error('❌ Action execution error:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Action failed'
      }));
    }
  };

  const executeActionWithHeroPoints = (action: any, targetOrPosition?: any, overrideCreatureId?: string) => {
    if (!action?.usesD20) {
      executeAction(action, targetOrPosition, overrideCreatureId);
      return;
    }

    const actingCreatureId = overrideCreatureId ?? uiState.currentCreatureId;
    const actingCreature = uiState.gameState?.creatures.find(
      (creature: any) => creature.id === actingCreatureId
    );
    const availableHeroPoints = Math.max(0, Math.min(actingCreature?.heroPoints ?? 1, 3));
    const spend = Math.max(0, Math.min(heroPointSpend, availableHeroPoints));

    executeAction(action, targetOrPosition, overrideCreatureId, spend);

    if (spend > 0) {
      setHeroPointSpend(0);
    }
  };

  const handleSelectAction = (action: any) => {
    setSelectedAction(action);
    setUiState(prev => ({ ...prev, selectedTarget: null }));
  };

  const handleConfirmAction = () => {
    if (!selectedAction) return;
    
    // Intercept pick-up-weapon to show destination choice
    if (selectedAction.id === 'pick-up-weapon') {
      const targetId = (selectedAction as any).targetId || uiState.selectedTarget;
      if (targetId) {
        setPickupDestinationModalOpen(true);
        setPendingPickupAction(selectedAction);
        return;
      }
    }
    
    if (!selectedAction.requiresTarget) {
      executeActionWithHeroPoints(selectedAction);
      return;
    }

    const targetId = (selectedAction as any).targetId || uiState.selectedTarget;
    if (targetId) {
      let targetData: any = targetId;
      // Convert grid coordinates to position object for movement and AoE spells
      if ((selectedAction.movementType || selectedAction.aoe) && typeof targetId === 'string') {
        const [x, y] = targetId.split('-').map(Number);
        targetData = { x, y };
      }
      
      executeActionWithHeroPoints(selectedAction, targetData);
      return;
    }
  };

  const handleCancelAction = () => {
    setSelectedAction(null);
    setUiState(prev => ({ ...prev, selectedTarget: null }));
  };

  const handleReactionDecision = async (accept: boolean) => {
    if (!activeReaction) return;
    const reaction = activeReaction;
    setActiveReaction(null);

    if (reaction.type === 'reactive-strike') {
      if (accept && reaction.reactorId) {
        await executeAction({
          id: 'reactive-strike',
          name: 'Reactive Strike',
          cost: 0,
          requiresTarget: true
        }, reaction.targetId, reaction.reactorId);
      }
      return;
    }

    if (reaction.type === 'shield-block') {
      if (accept) {
        await executeAction({
          id: 'shield-block',
          name: 'Shield Block',
          cost: 0,
          requiresTarget: false
        }, null, reaction.targetId);
      } else {
        await executeAction({
          id: 'resolve-pending-damage',
          name: 'Resolve Damage',
          cost: 0,
          requiresTarget: false
        }, null, reaction.targetId);
      }
    }
  };

  // Save game
  const handleSaveGame = async (saveName: string) => {
    if (!uiState.gameId || !uiState.gameState) return;

    setModalLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/game/${uiState.gameId}/save`,
        { saveName }
      );
      console.log('✅ Game saved:', response.data.metadata);
      setSaveLoadModal({ isOpen: false, mode: 'save' });
      setUiState(prev => ({
        ...prev,
        error: null
      }));
    } catch (error: any) {
      console.error('❌ Save error:', error);
      setUiState(prev => ({
        ...prev,
        error: error.message || 'Failed to save game'
      }));
    } finally {
      setModalLoading(false);
    }
  };

  // Load game
  const handleLoadGame = async (saveId: string) => {
    setModalLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/game/load/${saveId}`);
      const loadedGameState = response.data;
      
      console.log('✅ Game loaded:', loadedGameState.id);
      
      setUiState(prev => ({
        ...prev,
        gameId: loadedGameState.id,
        gameState: loadedGameState,
        currentCreatureId: loadedGameState.currentRound.turnOrder[loadedGameState.currentRound.currentTurnIndex],
        loading: false,
        actionPoints: 3,
        selectedTarget: null,
        error: null
      }));
      setSelectedAction(null);
      setSaveLoadModal({ isOpen: false, mode: 'load' });
    } catch (error: any) {
      console.error('❌ Load error:', error);
      setUiState(prev => ({
        ...prev,
        error: error.message || 'Failed to load game'
      }));
    } finally {
      setModalLoading(false);
    }
  };

  // End turn and advance to next creature
  const handleEndTurn = async () => {
    if (!uiState.gameId || !uiState.gameState) return;

    setUiState(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.post(
        `${API_BASE}/game/${uiState.gameId}/end-turn`
      );
      
      const newGameState = response.data.gameState || response.data;
      const nextCreatureId = newGameState.currentRound.turnOrder[
        newGameState.currentRound.currentTurnIndex
      ];
      
      setUiState(prev => ({
        ...prev,
        gameState: newGameState,
        currentCreatureId: nextCreatureId,
        loading: false,
        actionPoints: 3,
        selectedTarget: null
      }));
      setSelectedAction(null);
    } catch (error: any) {
      console.error('❌ End turn error:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to end turn'
      }));
    }
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
          <div className="header-buttons">
            {!uiState.gameId && (
              <button onClick={startNewGame} disabled={uiState.loading} className="btn-primary">
                {uiState.loading ? 'Starting...' : 'Start New Combat'}
              </button>
            )}

            {uiState.gameId && uiState.gameState && (
              <div className="settings-menu-wrapper">
                <button
                  onClick={() => setSettingsMenuOpen(prev => !prev)}
                  disabled={uiState.loading || modalLoading}
                  className="btn-settings"
                  title="Settings menu"
                >
                  ⚙️
                </button>
                {settingsMenuOpen && (
                  <div className="settings-dropdown-menu">
                    <button
                      onClick={() => {
                        setSaveLoadModal({ isOpen: true, mode: 'save' });
                        setSettingsMenuOpen(false);
                      }}
                      disabled={uiState.loading || modalLoading}
                      className="settings-menu-item"
                      title="Save current game state"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={() => {
                        setSaveLoadModal({ isOpen: true, mode: 'load' });
                        setSettingsMenuOpen(false);
                      }}
                      disabled={uiState.loading || modalLoading}
                      className="settings-menu-item"
                      title="Load a saved game"
                    >
                      📂 Load
                    </button>
                    <button
                      onClick={() => {
                        setReturnConfirmOpen(true);
                        setSettingsMenuOpen(false);
                      }}
                      disabled={uiState.loading || modalLoading}
                      className="settings-menu-item"
                      title="Return to main menu"
                    >
                      ← Return to Menu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
                onCreatureClick={(creatureId) => {
                  const creature = uiState.gameState.creatures.find((c: any) => c.id === creatureId);
                  if (creature) setSelectedCreatureForStats(creature);
                }}
              />
              {/* Character Sheet Buttons for All Player Characters */}
              {uiState.gameState && uiState.gameState.creatures && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  borderTop: '1px solid #4a4a6a',
                  paddingTop: '8px',
                  marginTop: '4px'
                }}>
                  {uiState.gameState.creatures
                    .filter((c: any) => c.type === 'player')
                    .map((character: any) => (
                      <button
                        key={character.id}
                        onClick={() => { setSelectedCreatureForStats(null); setSelectedCharacterForSheet(character); }}
                        style={{
                          padding: '6px 8px',
                          background: character.id === uiState.currentCreatureId
                            ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                            : 'linear-gradient(135deg, #6496ff 0%, #4080ff 100%)',
                          color: character.id === uiState.currentCreatureId ? '#000' : 'white',
                          border: character.id === uiState.currentCreatureId ? '2px solid #ffa500' : 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8em',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                        title={`View ${character.name}'s character sheet`}
                      >
                        📋 {character.name}
                      </button>
                    ))}
                  <button
                    onClick={() => setImportWarningOpen(true)}
                    disabled={uiState.loading || modalLoading}
                    style={{
                      padding: '6px 8px',
                      background: 'linear-gradient(135deg, #90caf9 0%, #64b5f6 100%)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8em',
                      transition: 'all 0.2s ease',
                      marginTop: '4px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #b3e5fc 0%, #81d4fa 100%)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, #90caf9 0%, #64b5f6 100%)')}
                    title="Import characters from Pathbuilder JSON"
                  >
                    📋 Import Character
                  </button>
                </div>
              )}
            </div>

            <div className="center-panel">

              <BattleGrid
                gameState={uiState.gameState}
                creatures={uiState.gameState.creatures}
                selectedTarget={uiState.selectedTarget}
                selectedAction={selectedAction}
                movementInfo={movementInfo}
                onSelectTarget={(id) => setUiState(prev => ({ ...prev, selectedTarget: id }))}
                onCreatureClick={(creatureId) => {
                  const creature = uiState.gameState.creatures.find((c: any) => c.id === creatureId);
                  if (creature) setSelectedCreatureForStats(creature);
                }}
              />
            </div>

            <div className="right-panel">
              <GameLog log={uiState.gameState?.log || []} />
            </div>

            <div className="bottom-panel">
              <ActionPanel
                currentCreature={getCurrentCreature()}
                selectedAction={selectedAction}
                selectedTarget={uiState.selectedTarget}
                movementInfo={movementInfo}
                actionPoints={uiState.actionPoints}
                gameState={uiState.gameState}
                onSelectAction={handleSelectAction}
                onConfirmAction={handleConfirmAction}
                onCancel={handleCancelAction}
                onEndTurn={handleEndTurn}
                heroPointSpend={heroPointSpend}
                onHeroPointSpendChange={setHeroPointSpend}
                loading={uiState.loading}
              />
            </div>
          </div>
        )}

        <SaveLoadModal
          isOpen={saveLoadModal.isOpen}
          mode={saveLoadModal.mode}
          currentGameId={uiState.gameId || undefined}
          onClose={() => setSaveLoadModal({ isOpen: false, mode: 'save' })}
          onSave={handleSaveGame}
          onLoad={handleLoadGame}
          loading={modalLoading}
        />

        <CreatureStatsModal
          creature={selectedCreatureForStats}
          onClose={() => setSelectedCreatureForStats(null)}
        />

        <CharacterSheetModal
          creature={selectedCharacterForSheet}
          isOpen={!!selectedCharacterForSheet}
          onClose={() => setSelectedCharacterForSheet(null)}
        />

        <PathbuilderUploadModal
          isOpen={pathbuilderModalOpen}
          onClose={() => setPathbuilderModalOpen(false)}
          onCharacterImported={handlePathbuilderImport}
          multiple={true}
        />

        {/* Return to Menu Confirmation Modal */}
        {returnConfirmOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: '#1a1f2e',
              border: '2px solid #ff6b6b',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              textAlign: 'center',
              color: '#fff',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#ff6b6b' }}>⚠️ Unsaved Data Warning</h2>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#ccc', lineHeight: '1.5' }}>
                You are about to return to the main menu. Any unsaved progress in this combat will be lost.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setReturnConfirmOpen(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#666')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#555')}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setReturnConfirmOpen(false);
                    if (onReturnToLanding) onReturnToLanding();
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#ff6b6b',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ff8080')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ff6b6b')}
                >
                  Return to Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Character Warning Modal */}
        {importWarningOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: '#1a1f2e',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              textAlign: 'center',
              color: '#fff',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#ffc107' }}>⚠️ Import Character</h2>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#ccc', lineHeight: '1.5' }}>
                This will add another character to the scene. You can import Pathbuilder JSON files or multiple characters at once.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setImportWarningOpen(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#666')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#555')}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setImportWarningOpen(false);
                    setPathbuilderModalOpen(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ffcd38')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffc107')}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
        {activeReaction && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
          }}>
            <div style={{
              background: '#1a1f2e',
              border: '2px solid #4fc3f7',
              borderRadius: '8px',
              padding: '20px',
              width: '420px',
              color: '#fff'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>Reaction Available</div>
              <div style={{ fontSize: '13px', marginBottom: '8px', color: '#cfd8dc' }}>
                <div><strong>Reactor:</strong> {activeReaction.reactorName ?? activeReaction.targetName}</div>
                <div><strong>Triggering creature:</strong> {activeReaction.triggeringCreatureName ?? 'Unknown'}</div>
                <div><strong>Triggering action:</strong> {activeReaction.triggeringActionName ?? 'Unknown'}</div>
                <div><strong>Trigger type:</strong> {activeReaction.triggerType ?? (activeReaction.type === 'shield-block' ? 'hit' : 'unknown')}</div>
                {activeReaction.type === 'shield-block' && (
                  <div><strong>Incoming damage:</strong> {activeReaction.amount ?? 0}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleReactionDecision(false)}
                  style={{
                    padding: '8px 12px',
                    background: '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleReactionDecision(true)}
                  style={{
                    padding: '8px 12px',
                    background: '#4fc3f7',
                    color: '#0b1020',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Use Reaction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pick Up Weapon Destination Modal */}
        {pickupDestinationModalOpen && pendingPickupAction && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
          }}>
            <div style={{
              background: '#1a1f2e',
              border: '2px solid #4fc3f7',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              textAlign: 'center',
              color: '#fff',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#4fc3f7' }}>Pick Up Weapon</h2>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#ccc', lineHeight: '1.5' }}>
                Where do you want to place this weapon?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexDirection: 'column' }}>
                {/* Wield Button */}
                <button
                  onClick={() => {
                    const actionWithDestination = { ...pendingPickupAction, pickupDestination: 'held' };
                    const targetId = (pendingPickupAction as any).targetId || uiState.selectedTarget;
                    executeAction(actionWithDestination, targetId);
                    setPickupDestinationModalOpen(false);
                    setPendingPickupAction(null);
                  }}
                  disabled={
                    (() => {
                      const currentCreature = uiState.gameState?.creatures.find((c: any) => c.id === uiState.currentCreatureId);
                      if (!currentCreature) return true;
                      const handsInUse = (currentCreature.weaponInventory || [])
                        .filter((s: any) => s.state === 'held' && !s.weapon?.isNatural)
                        .reduce((sum: number, s: any) => sum + (s.weapon?.hands || 1), 0);
                      // Find the ground object to get weapon hand requirement
                      const targetId = (pendingPickupAction as any).targetId || uiState.selectedTarget;
                      const groundObj = uiState.gameState?.groundObjects?.find((g: any) => g.id === targetId);
                      const handsNeeded = groundObj?.weapon?.hands || 1;
                      return handsInUse + handsNeeded > 2;
                    })()
                  }
                  style={{
                    padding: '12px 20px',
                    background: (() => {
                      const currentCreature = uiState.gameState?.creatures.find((c: any) => c.id === uiState.currentCreatureId);
                      if (!currentCreature) return '#555';
                      const handsInUse = (currentCreature.weaponInventory || [])
                        .filter((s: any) => s.state === 'held' && !s.weapon?.isNatural)
                        .reduce((sum: number, s: any) => sum + (s.weapon?.hands || 1), 0);
                      const groundObj = uiState.gameState?.groundObjects?.find((g: any) => g.id === uiState.selectedTarget);
                      const handsNeeded = groundObj?.weapon?.hands || 1;
                      if (handsInUse + handsNeeded > 2) return '#555';
                      return '#4fc3f7';
                    })(),
                    color: (() => {
                      const currentCreature = uiState.gameState?.creatures.find((c: any) => c.id === uiState.currentCreatureId);
                      if (!currentCreature) return '#999';
                      const handsInUse = (currentCreature.weaponInventory || [])
                        .filter((s: any) => s.state === 'held' && !s.weapon?.isNatural)
                        .reduce((sum: number, s: any) => sum + (s.weapon?.hands || 1), 0);
                      const groundObj = uiState.gameState?.groundObjects?.find((g: any) => g.id === uiState.selectedTarget);
                      const handsNeeded = groundObj?.weapon?.hands || 1;
                      if (handsInUse + handsNeeded > 2) return '#666';
                      return '#0b1020';
                    })(),
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ⚔️ Wield
                  {(() => {
                    const currentCreature = uiState.gameState?.creatures.find((c: any) => c.id === uiState.currentCreatureId);
                    if (!currentCreature) return '';
                    const handsInUse = (currentCreature.weaponInventory || [])
                      .filter((s: any) => s.state === 'held' && !s.weapon?.isNatural)
                      .reduce((sum: number, s: any) => sum + (s.weapon?.hands || 1), 0);
                    const targetId = (pendingPickupAction as any).targetId || uiState.selectedTarget;
                    const groundObj = uiState.gameState?.groundObjects?.find((g: any) => g.id === targetId);
                    const handsNeeded = groundObj?.weapon?.hands || 1;
                    if (handsInUse + handsNeeded > 2) return ' (hands full)';
                    return '';
                  })()}
                </button>

                {/* Stow Button */}
                <button
                  onClick={() => {
                    const actionWithDestination = { ...pendingPickupAction, pickupDestination: 'stowed' };
                    const targetId = (pendingPickupAction as any).targetId || uiState.selectedTarget;
                    executeAction(actionWithDestination, targetId);
                    setPickupDestinationModalOpen(false);
                    setPendingPickupAction(null);
                  }}
                  style={{
                    padding: '12px 20px',
                    background: '#2d3748',
                    color: '#fff',
                    border: '1px solid #4fc3f7',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3d4758')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#2d3748')}
                >
                  📦 Stow
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setPickupDestinationModalOpen(false);
                    setPendingPickupAction(null);
                  }}
                  style={{
                    padding: '12px 20px',
                    background: '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#666')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#555')}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CombatInterface;
