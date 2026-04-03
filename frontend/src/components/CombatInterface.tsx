import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './CombatInterface.css';
import BattleGrid from './BattleGrid';
import CreaturePanel from './CreaturePanel';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import GMChatPanel from './GMChatPanel';
import SaveLoadModal from './SaveLoadModal';
import { CreatureStatsModal } from './CreatureStatsModal';
import { PathbuilderUploadModal } from './PathbuilderUploadModal';
import { CharacterSheetModal } from './CharacterSheetModal';
import { LevelUpWizard } from './LevelUpWizard';
import { computeMovementCostMap, getEffectiveSpeed } from '../utils/movement';
import { useBattleAnimation, type BattleAnimationRequest } from './BattleAnimationOverlay';
import type { Creature, GameState, GroundObject, GMSession, CampaignPreferences, Condition, WeaponSlot } from '../../../shared/types';
import type { Difficulty } from '../../../shared/encounterBuilder';

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: unknown }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
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
  gameState: GameState | null;
  currentCreatureId: string | null;
  selectedTarget: string | null;
  loading: boolean;
  error: string | null;
  actionPoints: number;
}

type ReactionPromptType = 'reactive-strike' | 'shield-block' | 'ready-action';

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
  readiedActionId?: string;
  amount?: number;
}

interface CombatInterfaceProps {
  initialCreatures?: Creature[];
  difficulty?: Difficulty;
  campaignPreferences?: CampaignPreferences;
  onReturnToLanding?: () => void;
}

interface CombatAction {
  id: string;
  name?: string;
  cost: number;
  requiresTarget?: boolean;
  movementType?: string;
  aoe?: boolean;
  range?: number;
  weaponId?: string;
  spellId?: string;
  pickupDestination?: string;
  readyActionId?: string;
  itemId?: string;
  targetId?: string;
  usesD20?: boolean;
}

interface AIExecutionResult {
  planned?: { action?: { actionId?: string; targetId?: string } };
  result?: {
    success?: boolean;
    message?: string;
    details?: {
      d20?: number;
      bonus?: number;
      total?: number;
      result?: 'critical-success' | 'success' | 'failure' | 'critical-failure';
      targetName?: string;
      damage?: {
        dice?: { sides: number; results: number[] };
        weaponName?: string;
        appliedDamage?: number;
        total?: number;
        damageType?: string;
      };
    };
    pendingDamage?: {
      targetId: string;
      targetName: string;
      amount?: number;
      triggeringActionName?: string;
      attackerName?: string;
    };
    path?: { x: number; y: number }[];
  };
  stateSnapshot?: {
    creatures: Array<{ id: string; positions: { x: number; y: number }; currentHealth: number; conditions: Condition[]; dead?: boolean }>;
    log?: unknown[];
  };
}

const CombatInterface: React.FC<CombatInterfaceProps> = ({
  initialCreatures,
  difficulty = 'moderate',
  campaignPreferences,
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

  const [selectedAction, setSelectedAction] = useState<CombatAction | null>(null);
  const [saveLoadModal, setSaveLoadModal] = useState<{ isOpen: boolean; mode: 'save' | 'load' }>({
    isOpen: false,
    mode: 'save'
  });
  const [selectedCreatureForStats, setSelectedCreatureForStats] = useState<Creature | null>(null);
  const [selectedCharacterForSheet, setSelectedCharacterForSheet] = useState<Creature | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [pathbuilderModalOpen, setPathbuilderModalOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [updatingModel, setUpdatingModel] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [importWarningOpen, setImportWarningOpen] = useState(false);
  const [reactionQueue, setReactionQueue] = useState<ReactionPrompt[]>([]);
  const [activeReaction, setActiveReaction] = useState<ReactionPrompt | null>(null);
  const [pickupDestinationModalOpen, setPickupDestinationModalOpen] = useState(false);
  const [pendingPickupAction, setPendingPickupAction] = useState<CombatAction | null>(null);
  const [heroPointSpend, setHeroPointSpend] = useState(0);
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | null>(null);
  const [gmSession, setGMSession] = useState<GMSession | null>(null);
  const [levelUpCreature, setLevelUpCreature] = useState<Creature | null>(null);
  const [levelUpNewLevel, setLevelUpNewLevel] = useState<number>(0);
  const [pendingLevelUps, setPendingLevelUps] = useState<{ id: string; name: string; newLevel: number }[]>([]);

  // Token usage tracking (displayed in header)
  const [tokenUsage, setTokenUsage] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number; requestCount: number } | null>(null);

  const fetchTokenUsage = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/ai/token-usage`);
      setTokenUsage(res.data);
    } catch { /* non-critical */ }
  }, []);

  // Poll token usage every 10s
  useEffect(() => {
    fetchTokenUsage();
    const interval = setInterval(fetchTokenUsage, 10000);
    return () => clearInterval(interval);
  }, [fetchTokenUsage]);

  // Refresh token usage when gmSession chat history changes
  useEffect(() => {
    fetchTokenUsage();
  }, [gmSession?.chatHistory?.length, fetchTokenUsage]);

  // GM session initialization loading state
  const [gmInitializing, setGmInitializing] = useState(false);
  const [gmInitStatus, setGmInitStatus] = useState<string>('');

  // Exploration movement animation state
  const [explorationAnimating, setExplorationAnimating] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<Map<string, { x: number; y: number }>>(new Map());
  const animationRef = useRef<number | null>(null);

  // NPC turn step-by-step replay ref
  const npcReplayRef = useRef<number | null>(null);

  // Battle animation system (action text → dice roll → hit/miss → damage)
  const { playBattleAnimation } = useBattleAnimation();

  // Cleanup animation timers on unmount
  useEffect(() => {
    return () => {
      if (npcReplayRef.current) clearTimeout(npcReplayRef.current);
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  const movementInfo = useMemo<MovementInfo | null>(() => {
    if (!uiState.gameState || !selectedAction || !selectedAction.movementType) {
      return null;
    }

    const currentCreatureId = uiState.currentCreatureId;
    if (!currentCreatureId) {
      return null;
    }

    const currentCreature = uiState.gameState.creatures.find(
      (creature: Creature) => creature.id === currentCreatureId
    );

    if (!currentCreature) {
      return null;
    }

    const terrain = uiState.gameState.map?.terrain;
    if (!terrain) {
      return null;
    }

    // Calculate movement range based on action's range property
    // If range is 0 or not set, use creature's speed (with armor penalty)
    // Otherwise use the action's specified range (e.g., Step has range: 1)
    const maxDistance = (selectedAction.range && selectedAction.range > 0) 
      ? selectedAction.range 
      : getEffectiveSpeed(currentCreature) / 5;
    const isProne = currentCreature.conditions?.some((c: Condition) => c.name === 'prone') ?? false;
    const terrainCostMultiplier = isProne ? { difficult: 4 } : undefined;
    const occupiedPositions: Set<string> = new Set(
      uiState.gameState.creatures
        .filter((creature: Creature) => creature.id !== currentCreature.id && creature.currentHealth > 0)
        .map((creature: Creature) => `${creature.positions.x},${creature.positions.y}`)
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
      (creature: Creature) => creature.id === uiState.currentCreatureId
    );
    const availableHeroPoints = Math.max(0, Math.min(currentCreature?.heroPoints ?? 1, 3));
    if (heroPointSpend > availableHeroPoints) {
      setHeroPointSpend(0);
    }
  }, [uiState.gameState, uiState.currentCreatureId, heroPointSpend]);

  useEffect(() => {
    if (!settingsMenuOpen || !uiState.gameId || !gmSession) return;

    const loadModels = async () => {
      try {
        const response = await axios.get(`${API_BASE}/ai/models`);
        const models: string[] = response.data?.models || [];
        const currentModel: string = response.data?.currentModel || '';
        setAvailableModels(models);
        setSelectedModel(gmSession.campaignPreferences.aiModel || currentModel || models[0] || 'gpt-5');
      } catch (error) {
        console.warn('⚠️ Could not load AI model list:', error);
        const fallback = ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.5-flash', 'deepseek-chat', 'deepseek-reasoner'];
        setAvailableModels(fallback);
        setSelectedModel(gmSession.campaignPreferences.aiModel || 'gpt-5');
      }
    };

    loadModels();
  }, [settingsMenuOpen, uiState.gameId, gmSession]);

  // Detect combat end: all players dead or all enemies dead
  useEffect(() => {
    if (!uiState.gameState?.creatures || combatResult) return;
    const creatures = uiState.gameState.creatures;
    const players = creatures.filter((c: Creature) => c.type === 'player');
    const enemies = creatures.filter((c: Creature) => c.type === 'creature');
    if (players.length === 0 || enemies.length === 0) return;
    const allPlayersDead = players.every((c: Creature) => c.currentHealth <= 0 || c.dead);
    const allEnemiesDead = enemies.every((c: Creature) => c.currentHealth <= 0 || c.dead);
    if (allEnemiesDead) {
      setCombatResult('victory');
    } else if (allPlayersDead) {
      setCombatResult('defeat');
    }
  }, [uiState.gameState?.creatures, combatResult]);

  // Track which creature ID we've already fired an AI turn for, to prevent double-fires
  const aiTurnFiredRef = React.useRef<string | null>(null);
  const aiTurnInFlightRef = React.useRef(false);

  // Automatically execute AI turn when it's an NPC's turn
  useEffect(() => {
    if (!uiState.gameId || !uiState.gameState || !uiState.currentCreatureId) return;
    
    // Don't fire AI turns while a previous one is still in-flight (ref avoids dep-array re-trigger)
    if (aiTurnInFlightRef.current) return;
    
    // Don't auto-execute AI turns during exploration phase — only during combat
    const phase = gmSession?.currentPhase;
    if (phase && phase !== 'combat') return;
    
    const currentCreature = uiState.gameState.creatures.find(
      (c: Creature) => c.id === uiState.currentCreatureId
    );
    
    // Only auto-execute for NPC/creature types (not player)
    if (!currentCreature || currentCreature.type === 'player') {
      aiTurnFiredRef.current = null; // Reset guard when it's a player's turn
      return;
    }

    // Skip dead creatures — advance turn instead
    if (currentCreature.currentHealth <= 0 || currentCreature.dead) {
      console.log('🤖 Skipping dead creature:', currentCreature.name);
      axios.post(`${API_BASE}/game/${uiState.gameId}/end-turn`, {}, { timeout: 5000 })
        .then(recovery => {
          const recoveredState = recovery.data.gameState || recovery.data;
          const nextId = recoveredState.currentRound.turnOrder[recoveredState.currentRound.currentTurnIndex];
          const ap = typeof recovery.data.actionPoints === 'number' ? recovery.data.actionPoints : 3;
          setUiState(prev => ({
            ...prev,
            gameState: recoveredState,
            currentCreatureId: nextId,
            loading: false,
            actionPoints: ap,
          }));
        })
        .catch(err => console.error('Failed to skip dead creature turn:', err));
      return;
    }

    // Prevent duplicate AI turn requests for the same creature+round+turnIndex
    const turnKey = `${currentCreature.id}-${uiState.gameState.currentRound?.number ?? 0}-${uiState.gameState.currentRound?.currentTurnIndex ?? 0}`;
    if (aiTurnFiredRef.current === turnKey) return;
    aiTurnFiredRef.current = turnKey;
    
    console.log('🤖 AI turn detected for:', currentCreature.name);
    
    let cancelled = false;
    const executeAITurn = async () => {
      aiTurnInFlightRef.current = true;
      setUiState(prev => ({ ...prev, loading: true }));
      try {
        const response = await axios.post(
          `${API_BASE}/game/${uiState.gameId}/ai-turn`,
          {},
          { timeout: 35000 } // 35s frontend timeout — generous to cover AI provider latency
        );
        if (cancelled) { aiTurnInFlightRef.current = false; return; }
        aiTurnInFlightRef.current = false;
        const newGameState = response.data.gameState || response.data;
        const executionResults: AIExecutionResult[] = response.data.executionResults || [];
        const nextCreatureId = newGameState.currentRound.turnOrder[
          newGameState.currentRound.currentTurnIndex
        ];
        const nextAP = typeof response.data.actionPoints === 'number'
          ? response.data.actionPoints
          : 3;
        
        console.log('🤖 AI turn completed. Actions:', executionResults.map((r) => `${r.planned?.action?.actionId}: ${r.result?.success ? '✅' : '❌'} ${r.result?.message || ''}`));

        // Step-by-step replay of NPC actions
        const successfulSteps = executionResults.filter((r) => r.result?.success && r.stateSnapshot);
        
        if (successfulSteps.length > 0) {
          // Replay each action step-by-step with delays and battle animations
          const STEP_DELAY = 800; // ms between each action step
          const MOVE_ANIM_DELAY = 400; // extra time for movement animation

          const replayAllSteps = async () => {
            for (let stepIdx = 0; stepIdx < successfulSteps.length; stepIdx++) {
              if (cancelled) break;

              const step = successfulSteps[stepIdx];
              const actionId = step.planned?.action?.actionId || 'action';
              const actionMsg = step.result?.message || actionId;
              const isMovement = ['stride', 'move', 'step'].includes(actionId);
              const details = step.result?.details;

              // ─── Battle animation for NPC attacks ──────────────
              if (details && typeof details.d20 === 'number' && !isMovement) {
                const targetId = step.planned?.action?.targetId;
                const targetCreature = targetId
                  ? (uiState.gameState?.creatures?.find((c: Creature) => c.id === targetId))
                  : null;

                const animRequest: BattleAnimationRequest = {
                  actorName: currentCreature.name,
                  actionDescription: step.planned?.action?.actionId
                    ? step.planned.action.actionId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                    : 'Attack',
                  targetName: targetCreature?.name || details.targetName,
                  attackRoll: {
                    d20: details.d20,
                    bonus: details.bonus ?? 0,
                    total: details.total ?? (details.d20 + (details.bonus ?? 0)),
                    result: details.result as BattleAnimationRequest['attackRoll']['result'],
                  },
                };

                if (details.damage && (details.result === 'success' || details.result === 'critical-success')) {
                  animRequest.damageRoll = {
                    dice: details.damage.dice ?? { sides: 6, results: [] },
                    weaponName: details.damage.weaponName || 'Attack',
                    appliedDamage: details.damage.appliedDamage ?? details.damage.total ?? 0,
                    damageType: details.damage.damageType,
                    isCriticalHit: details.result === 'critical-success',
                  };
                }

                try {
                  await playBattleAnimation(animRequest);
                } catch (e) {
                  console.warn('⚔️ NPC battle animation error (non-blocking):', e);
                }
              }

              // Apply creature position/HP changes from snapshot
            if (step.stateSnapshot?.creatures) {
              const overrides = new Map<string, { x: number; y: number }>();
              const snapshot = step.stateSnapshot.creatures;

              // Update positions via overrides for smooth animation
              for (const sc of snapshot) {
                overrides.set(sc.id, { x: sc.positions.x, y: sc.positions.y });
              }
              setPositionOverrides(overrides);

              // Also update HP/conditions in gameState immediately
              setUiState(prev => {
                if (!prev.gameState) return prev;
                const updatedCreatures = prev.gameState.creatures.map((c: Creature) => {
                  const snap = snapshot.find((s) => s.id === c.id);
                  if (snap) {
                    return {
                      ...c,
                      currentHealth: snap.currentHealth,
                      conditions: snap.conditions,
                      dead: snap.dead,
                    };
                  }
                  return c;
                });
                return {
                  ...prev,
                  gameState: {
                    ...prev.gameState,
                    creatures: updatedCreatures,
                    log: [...(prev.gameState.log || []), ...(step.stateSnapshot?.log || [])],
                  },
                };
              });
            }

              // Wait for the step delay
              const stepDelay = isMovement ? STEP_DELAY + MOVE_ANIM_DELAY : STEP_DELAY;
              await new Promise<void>(r => {
                npcReplayRef.current = window.setTimeout(r, stepDelay);
              });
            }
          };

          const replayWithTimeout = async () => {
            const REPLAY_TIMEOUT = 45000; // 45s max for entire NPC replay
            const timeout = new Promise<void>((resolve) => {
              setTimeout(() => {
                console.warn('🤖 NPC replay safety timeout — applying final state');
                resolve();
              }, REPLAY_TIMEOUT);
            });
            await Promise.race([replayAllSteps(), timeout]);

            // Ensure final state is always applied
            setPositionOverrides(new Map());
            setUiState(prev => ({
              ...prev,
              gameState: newGameState,
              currentCreatureId: nextCreatureId,
              loading: false,
              actionPoints: nextAP,
              selectedTarget: null
            }));
            if (newGameState?.gmSession) {
              setGMSession(newGameState.gmSession);
            }
            setSelectedAction(null);
          };

          replayWithTimeout();
        } else {
          // No steps to replay — apply immediately (fallback)
          setUiState(prev => ({
            ...prev,
            gameState: newGameState,
            currentCreatureId: nextCreatureId,
            loading: false,
            actionPoints: nextAP,
            selectedTarget: null
          }));
          if (newGameState?.gmSession) {
            setGMSession(newGameState.gmSession);
          }
          setSelectedAction(null);
        }
      } catch (error) {
        if (cancelled) { aiTurnInFlightRef.current = false; return; }
        console.error('❌ AI turn error:', error);
        aiTurnInFlightRef.current = false;
        // On error/timeout, try to force-end the turn so the game doesn't hang
        try {
          const recovery = await axios.post(`${API_BASE}/game/${uiState.gameId}/end-turn`, {}, { timeout: 5000 });
          const recoveredState = recovery.data.gameState || recovery.data;
          const nextId = recoveredState.currentRound.turnOrder[recoveredState.currentRound.currentTurnIndex];
          setUiState(prev => ({
            ...prev,
            gameState: recoveredState,
            currentCreatureId: nextId,
            loading: false,
            actionPoints: 3,
            error: `AI turn failed for ${currentCreature.name} — skipped. (${error.message || 'timeout'})`
          }));
        } catch {
          setUiState(prev => ({
            ...prev,
            loading: false,
            error: `AI turn failed: ${error.message || 'Unknown error'}`
          }));
        }
      }
    };
    
    // Small delay to let state settle and show the turn banner
    const timer = setTimeout(() => {
      if (!cancelled) executeAITurn();
    }, 600);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState.gameId, uiState.currentCreatureId, gmSession?.currentPhase]);

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
    console.log('🎮 Start new game clicked', { hasInitialCreatures: !!initialCreatures, difficulty, isCampaign: !!campaignPreferences });
    setUiState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Determine party level from imported characters (average, default 1)
      const partyLevel = initialCreatures && initialCreatures.length > 0
        ? Math.round(initialCreatures.reduce((sum, c) => sum + (c.level || 1), 0) / initialCreatures.length)
        : 1;
      const partySize = initialCreatures?.length || 1;

      let encounterCreatures: Creature[] = [];

      // In campaign mode, don't auto-generate enemies — start with players only
      // In encounter mode, generate enemies from the bestiary
      const isEncounterMode = !campaignPreferences || campaignPreferences.mode === 'encounter';
      if (isEncounterMode) {
        console.log(`📡 Fetching ${difficulty} encounter for party level ${partyLevel}, size ${partySize}`);
        
        // Fetch encounter from bestiary API
        const encounterResponse = await axios.get(`${API_BASE}/bestiary/encounter`, {
          params: { difficulty, partyLevel, partySize }
        });
        const encounter = encounterResponse.data;
        console.log('🐉 Encounter generated:', encounter.description);
        encounterCreatures = encounter.creatures;
      } else {
        console.log('📜 Campaign mode — starting without enemies (exploration phase)');
      }

      console.log('📡 Sending game create request to', `${API_BASE}/game/create`);
      console.log('🎭 Team assignment: players =', initialCreatures?.length || 0, ', creatures =', encounterCreatures.length);
      
      // Log what we're about to send
      console.log(`[startNewGame] ===== SENDING TO BACKEND =====`);
      if (initialCreatures && initialCreatures.length > 0) {
        initialCreatures.forEach((c, idx) => {
          console.log(`[startNewGame] Player ${idx} (${c.name}):`, {
            hasSkills: !!c.skills,
            skillsCount: c.skills?.length,
            skills: c.skills?.slice(0, 2).map((s) => `${s.name}(${s.proficiency})`),
            hasFeats: !!c.feats,
            featsCount: c.feats?.length,
            feats: c.feats?.slice(0, 2).map((f) => `${f.name}(${f.type})`),
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
        creatures: encounterCreatures,    // Bestiary-generated enemies (empty in campaign mode)
        mapSize: 20,
        mapTheme: campaignPreferences?.mapTheme || undefined,
        mapSubTheme: campaignPreferences?.mapSubTheme || undefined,
        aiModel: campaignPreferences?.aiModel || undefined,
        foundryMapId: campaignPreferences?.foundryMapId || undefined,
      });

      console.log('✅ Game created successfully:', response.data);
      console.log('🗺️ [MAP DEBUG] Response map data:', {
        hasMap: !!response.data.map,
        width: response.data.map?.width,
        height: response.data.map?.height,
        hasTiles: !!response.data.map?.tiles,
        tileRows: response.data.map?.tiles?.length || 0,
        overlayCount: response.data.map?.overlays?.length || 0,
        procedural: response.data.map?.procedural,
        mapTheme: response.data.map?.mapTheme,
        mapSubTheme: response.data.map?.mapSubTheme,
      });
      if (!response.data.id) {
        throw new Error('No game ID returned from server');
      }
      
      // Debug: Log what we got back from the backend
      console.log(`[startNewGame] ===== RECEIVED FROM BACKEND =====`);
      response.data.creatures.forEach((c: Creature, i: number) => {
        console.log(`[startNewGame] Creature ${i} (${c.name}):`, {
          hasSkills: !!c.skills,
          skillsCount: c.skills?.length,
          skills: c.skills?.slice(0, 2).map((s) => `${s.name}(${s.proficiency})`),
          hasFeats: !!c.feats,
          featsCount: c.feats?.length,
          feats: c.feats?.slice(0, 2).map((f) => `${f.name}(${f.type})`),
          hasLores: !!c.lores,
          loresCount: c.lores?.length
        });
      });
      console.log(`[startNewGame] ============================\n`);

      // Debug: Log all creatures with their shield properties
      console.log('🛡️ Game creatures shield properties:');
      response.data.creatures.forEach((creature: Creature, index: number) => {
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
      // Sync GM session if present in game state
      if (response.data.gmSession) {
        setGMSession(response.data.gmSession);
      }

      // Auto-initialize GM session for campaigns (not encounter-only mode)
      const isCampaignMode = campaignPreferences && campaignPreferences.mode !== 'encounter';
      if (isCampaignMode && response.data.id) {
        setGmInitializing(true);
        setGmInitStatus('Generating world...');
        try {
          // Cycle through atmospheric status messages
          const statusMessages = [
            'Generating world...',
            'Placing landmarks...',
            'Populating the scene...',
            'Summoning NPCs...',
            'Writing the opening narration...',
            'The adventure awaits...',
          ];
          let statusIdx = 0;
          const statusInterval = setInterval(() => {
            statusIdx = (statusIdx + 1) % statusMessages.length;
            setGmInitStatus(statusMessages[statusIdx]);
          }, 2500);

          const gmRes = await axios.post(`${API_BASE}/game/${response.data.id}/gm/init`, {
            preferences: campaignPreferences,
          });
          clearInterval(statusInterval);

          if (gmRes.data.gmSession) {
            setGMSession(gmRes.data.gmSession);
          }
          if (gmRes.data.gameState) {
            setUiState(prev => ({
              ...prev,
              gameState: gmRes.data.gameState,
            }));
          }
        } catch (gmError) {
          console.warn('⚠️ GM session auto-init failed:', gmError);
          const detail = gmError?.response?.data?.error || gmError?.message || 'Unknown error';
          setUiState(prev => ({
            ...prev,
            error: `GM failed to initialize: ${detail}. You can retry via the GM Chat panel.`,
          }));
        } finally {
          setGmInitializing(false);
          setGmInitStatus('');
        }
      }
    } catch (error) {
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
    } catch (error) {
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
    action: CombatAction,
    targetOrPosition?: string | { x: number; y: number } | null,
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
      let payload: Record<string, unknown> = {
        creatureId: actingCreatureId,
        actionId: action.id
      };

      // Include weaponId if present on the action
      if (action.weaponId) {
        payload.weaponId = action.weaponId;
      }

      // Include spellId if present on the action (for Spellstrike)
      if (action.spellId) {
        payload.spellId = action.spellId;
      }

      // Include pickupDestination for pick-up-weapon actions
      if (action.pickupDestination) {
        payload.pickupDestination = action.pickupDestination;
      }

      if (action.readyActionId) {
        payload.readyActionId = action.readyActionId;
      }

      if (action.itemId) {
        payload.itemId = action.itemId;
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

      const newGameState = response.data.gameState || response.data;

      // Animate player movement step-by-step along the path
      const isMovement = action.movementType || ['stride', 'move', 'step'].includes(action.id);
      if (isMovement && result?.success && newGameState?.creatures) {
        const oldCreature = uiState.gameState?.creatures?.find((c: Creature) => c.id === actingCreatureId);
        const newCreature = newGameState.creatures.find((c: Creature) => c.id === actingCreatureId);
        if (oldCreature && newCreature &&
            (oldCreature.positions.x !== newCreature.positions.x || oldCreature.positions.y !== newCreature.positions.y)) {
          // Use backend path if available, otherwise fallback to direct glide
          const path: { x: number; y: number }[] = result.path && result.path.length >= 2
            ? result.path
            : [{ x: oldCreature.positions.x, y: oldCreature.positions.y }, { x: newCreature.positions.x, y: newCreature.positions.y }];

          const STEP_DELAY_MS = 120; // Per-tile step speed for combat movement

          // Set override to starting position first
          setPositionOverrides(new Map([[actingCreatureId, { x: path[0].x, y: path[0].y }]]));

          await new Promise<void>(resolve => {
            let stepIndex = 1;
            const animateStep = () => {
              if (stepIndex >= path.length) {
                setPositionOverrides(new Map());
                resolve();
                return;
              }
              const pos = path[stepIndex];
              setPositionOverrides(new Map([[actingCreatureId, { x: pos.x, y: pos.y }]]));
              stepIndex++;
              animationRef.current = window.setTimeout(animateStep, STEP_DELAY_MS);
            };
            // Small initial delay to let CSS transition kick in
            animationRef.current = window.setTimeout(animateStep, 30);
          });
        }
      }

      // ─── Battle Animation (action text → d20 → hit/miss → damage) ────
      // Animate for the current player's actions
      console.log('⚔️ Battle animation check:', {
        isCurrentActor,
        hasDetails: !!result?.details,
        detailsKeys: result?.details ? Object.keys(result.details) : 'N/A',
        d20: result?.details?.d20,
        resultObj: result?.details,
      });
      if (isCurrentActor && result?.details) {
        const details = result.details;
        if (typeof details.d20 === 'number') {
          // Look up actor and target names
          const actorCreature = uiState.gameState?.creatures?.find((c: Creature) => c.id === actingCreatureId);
          const targetCreature = payload.targetId
            ? uiState.gameState?.creatures?.find((c: Creature) => c.id === payload.targetId)
            : null;

          const animRequest: BattleAnimationRequest = {
            actorName: actorCreature?.name || 'Unknown',
            actionDescription: action.name || 'Attack',
            targetName: targetCreature?.name,
            attackRoll: {
              d20: details.d20,
              bonus: details.bonus ?? 0,
              total: details.total ?? (details.d20 + (details.bonus ?? 0)),
              result: details.result as BattleAnimationRequest['attackRoll']['result'],
            },
          };

          // Add damage info if hit
          if (details.damage && (details.result === 'success' || details.result === 'critical-success')) {
            animRequest.damageRoll = {
              dice: details.damage.dice ?? { sides: 6, results: [] },
              weaponName: details.damage.weaponName || action.name || 'Attack',
              appliedDamage: details.damage.appliedDamage ?? details.damage.total ?? 0,
              damageType: details.damage.damageType,
              isCriticalHit: details.result === 'critical-success',
            };
          }

          try {
            await playBattleAnimation(animRequest);
          } catch (e) {
            console.warn('⚔️ Battle animation error (non-blocking):', e);
          }
        }
      }

      setUiState(prev => ({
        ...prev,
        gameState: newGameState,
        loading: false,
        selectedTarget: result?.success === true ? null : prev.selectedTarget,
        actionPoints: newActionPoints
      }));
      // Sync gmSession if returned in gameState (e.g. combat narration messages)
      if (newGameState?.gmSession) {
        setGMSession(newGameState.gmSession);
      }
      if (isCurrentActor && result?.success === true) {
        setSelectedAction(null);
      }
      const reactionOpportunities = response.data.reactionOpportunities ?? result?.reactionOpportunities ?? [];
      const nextPrompts: ReactionPrompt[] = [];
      if (Array.isArray(reactionOpportunities) && reactionOpportunities.length > 0) {
        for (const opportunity of reactionOpportunities) {
          if (opportunity.type === 'ready-action') {
            nextPrompts.push({
              id: `${Date.now()}-${Math.random()}`,
              type: 'ready-action',
              reactorId: opportunity.reactorId,
              reactorName: opportunity.reactorName,
              targetId: opportunity.targetId,
              targetName: opportunity.targetName,
              triggerType: opportunity.trigger,
              triggeringActionName: opportunity.triggeringActionName,
              triggeringCreatureName: opportunity.triggeringCreatureName,
              readiedActionId: opportunity.readiedActionId
            });
          } else {
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
    } catch (error) {
      console.error('❌ Action execution error:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Action failed'
      }));
    }
  };

  const executeActionWithHeroPoints = (action: CombatAction, targetOrPosition?: string | { x: number; y: number } | null, overrideCreatureId?: string) => {
    if (!action?.usesD20) {
      executeAction(action, targetOrPosition, overrideCreatureId);
      return;
    }

    const actingCreatureId = overrideCreatureId ?? uiState.currentCreatureId;
    const actingCreature = uiState.gameState?.creatures.find(
      (creature: Creature) => creature.id === actingCreatureId
    );
    const availableHeroPoints = Math.max(0, Math.min(actingCreature?.heroPoints ?? 1, 3));
    const spend = Math.max(0, Math.min(heroPointSpend, availableHeroPoints));

    executeAction(action, targetOrPosition, overrideCreatureId, spend);

    if (spend > 0) {
      setHeroPointSpend(0);
    }
  };

  const handleSelectAction = (action: CombatAction) => {
    setSelectedAction(action);
    setUiState(prev => ({ ...prev, selectedTarget: null }));
  };

  const handleConfirmAction = () => {
    if (!selectedAction) return;
    
    // Intercept pick-up-weapon to show destination choice
    if (selectedAction.id === 'pick-up-weapon') {
      const targetId = selectedAction.targetId || uiState.selectedTarget;
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

    const targetId = selectedAction.targetId || uiState.selectedTarget;
    if (targetId) {
      let targetData: string | { x: number; y: number } = targetId;
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

    if (reaction.type === 'ready-action') {
      if (accept && reaction.reactorId) {
        await executeAction({
          id: 'execute-ready',
          name: 'Execute Ready',
          cost: 0,
          requiresTarget: false
        }, null, reaction.reactorId);
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
    } catch (error) {
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
      // Sync GM session from loaded game state
      if (loadedGameState.gmSession) {
        setGMSession(loadedGameState.gmSession);
      }
      setSelectedAction(null);
      setSaveLoadModal({ isOpen: false, mode: 'load' });
    } catch (error) {
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
      
      // Use actual action points from backend (accounts for stunned, slowed, quickened)
      const nextAP = typeof response.data.actionPoints === 'number'
        ? response.data.actionPoints
        : 3;
      
      setUiState(prev => ({
        ...prev,
        gameState: newGameState,
        currentCreatureId: nextCreatureId,
        loading: false,
        actionPoints: nextAP,
        selectedTarget: null
      }));
      setSelectedAction(null);
    } catch (error) {
      console.error('❌ End turn error:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to end turn'
      }));
    }
  };

  const handleResumeDelay = async (creatureId: string) => {
    if (!uiState.gameId || !uiState.gameState) return;

    setUiState(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.post(
        `${API_BASE}/game/${uiState.gameId}/action`,
        { creatureId, actionId: 'resume-delay' }
      );

      const newGameState = response.data.gameState || response.data;

      setUiState(prev => ({
        ...prev,
        gameState: newGameState,
        currentCreatureId: creatureId,
        loading: false,
        actionPoints: 3,
        selectedTarget: null
      }));
      setSelectedAction(null);
    } catch (error) {
      console.error('❌ Resume delay error:', error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to resume delay'
      }));
    }
  };

  // ─── Exploration Movement ─────────────────────────────────
  // Free movement for players during exploration phase (click-to-move, no action points)
  const isExplorationPhase = !!gmSession && gmSession.currentPhase !== 'combat';
  const explorationCreatureId = isExplorationPhase
    ? uiState.gameState?.creatures?.find((c: Creature) => c.type === 'player')?.id || null
    : null;

  const handleExplorationMove = async (x: number, y: number) => {
    if (!uiState.gameId || !explorationCreatureId || explorationAnimating) return;

    try {
      const response = await axios.post(
        `${API_BASE}/game/${uiState.gameId}/exploration/move`,
        { creatureId: explorationCreatureId, targetPosition: { x, y } }
      );

      if (response.data.success && response.data.path && response.data.path.length > 1) {
        const path: { x: number; y: number }[] = response.data.path;
        const finalGameState = response.data.gameState;

        // Animate step-by-step along path
        setExplorationAnimating(true);
        const STEP_DELAY_MS = 200; // Slower walking speed

        // Don't update gameState yet – let the visual animation play first
        // Start from step 1 (step 0 is current position)
        let stepIndex = 1;

        const animateStep = () => {
          if (stepIndex >= path.length) {
            // Animation complete – set final game state and clear overrides
            setPositionOverrides(new Map());
            setExplorationAnimating(false);
            setUiState(prev => ({
              ...prev,
              gameState: finalGameState,
            }));
            return;
          }

          const pos = path[stepIndex];
          setPositionOverrides(new Map([[explorationCreatureId!, { x: pos.x, y: pos.y }]]));
          stepIndex++;

          animationRef.current = window.setTimeout(animateStep, STEP_DELAY_MS);
        };

        // Set first override position (current pos) to enable CSS transition
        setPositionOverrides(new Map([[explorationCreatureId, { x: path[0].x, y: path[0].y }]]));
        animationRef.current = window.setTimeout(animateStep, 50); // Small initial delay to apply transition
      } else if (response.data.success) {
        // No path or single step – just update immediately
        setUiState(prev => ({
          ...prev,
          gameState: response.data.gameState,
        }));
      }
    } catch (error) {
      console.error('🚶 Exploration move failed:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Move failed';
      setUiState(prev => ({
        ...prev,
        error: errorMsg,
      }));
    }
  };

  const handleUpdateAiModel = async () => {
    if (!uiState.gameId || !gmSession || !selectedModel) return;

    setUpdatingModel(true);
    try {
      const response = await axios.put(`${API_BASE}/game/${uiState.gameId}/gm/preferences`, {
        aiModel: selectedModel,
      });

      // Also persist model preference locally for next session
      localStorage.setItem('pf2e-preferred-ai-model', selectedModel);

      setGMSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          campaignPreferences: {
            ...prev.campaignPreferences,
            ...(response.data?.preferences || {}),
          },
        };
      });

      setUiState(prev => ({ ...prev, error: null }));
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      console.error('❌ Failed to update AI model:', error);
      setUiState(prev => ({
        ...prev,
        error: err.response?.data?.error || err.message || 'Failed to update AI model',
      }));
    } finally {
      setUpdatingModel(false);
    }
  };

  const getCurrentCreature = () => {
    if (!uiState.gameState) return null;
    return uiState.gameState.creatures.find(
      (c: Creature) => c.id === uiState.currentCreatureId
    );
  };

  return (
    <ErrorBoundary>
      <div className="combat-interface">
        <div className="combat-header">
          <div className="header-title-row">
            <h1>{'⚔️ Algorithms Of Fate'}{campaignPreferences
              ? (campaignPreferences.mode === 'encounter' ? ' — Encounter' : ` — ${campaignPreferences.campaignName || 'Campaign'}`)
              : ''}</h1>
            {tokenUsage && tokenUsage.totalTokens > 0 && (
              <span className="header-token-badge" title={`Prompt: ${tokenUsage.promptTokens.toLocaleString()} | Completion: ${tokenUsage.completionTokens.toLocaleString()} | Requests: ${tokenUsage.requestCount}`}>
                🪙 {tokenUsage.totalTokens.toLocaleString()}
              </span>
            )}
          </div>
          <div className="header-buttons">
            {!uiState.gameId && (
              <button onClick={startNewGame} disabled={uiState.loading} className="btn-primary">
                {uiState.loading ? 'Starting...' : campaignPreferences ? 'Start Campaign Session' : 'Start New Combat'}
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
                    {gmSession && (
                      <div className="settings-menu-item" style={{ display: 'block', cursor: 'default' }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>AI Model</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          disabled={updatingModel || availableModels.length === 0}
                          style={{ width: '100%', marginBottom: 6 }}
                        >
                          {availableModels.map((model) => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleUpdateAiModel}
                          disabled={updatingModel || !selectedModel}
                          className="settings-menu-item"
                          style={{ width: '100%', marginTop: 0 }}
                        >
                          {updatingModel ? 'Saving...' : 'Save AI Model'}
                        </button>
                      </div>
                    )}
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

        {/* Loading Overlay for GM Session Initialization */}
        {gmInitializing && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse at center, rgba(15, 10, 30, 0.95), rgba(5, 2, 15, 0.98))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            gap: '24px',
          }}>
            <div style={{
              fontSize: '64px',
              animation: 'pulse 2s ease-in-out infinite',
            }}>🎭</div>
            <h2 style={{
              color: '#e8d5b0',
              fontSize: '28px',
              fontFamily: 'Georgia, serif',
              margin: 0,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>{campaignPreferences?.campaignName || 'Your Adventure'}</h2>
            <div style={{
              color: '#a8956e',
              fontSize: '16px',
              fontStyle: 'italic',
              transition: 'opacity 0.5s ease',
              minHeight: '24px',
            }}>{gmInitStatus}</div>
            <div style={{
              width: '200px',
              height: '3px',
              background: 'rgba(168,149,110,0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginTop: '8px',
            }}>
              <div style={{
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, #e8d5b0, transparent)',
                borderRadius: '2px',
                animation: 'loadingSlide 1.5s ease-in-out infinite',
              }} />
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
              }
              @keyframes loadingSlide {
                0% { transform: translateX(-200%); }
                100% { transform: translateX(500%); }
              }
            `}</style>
          </div>
        )}

        {/* Debug Panel */}
        {uiState.loading && !gmInitializing && (
          <div style={{ padding: '10px', background: '#333', color: '#0f0', fontSize: '12px', borderBottom: '1px solid #666' }}>
            ⏳ Loading... Waiting for server response...
          </div>
        )}

        {!uiState.gameState && !uiState.loading && !uiState.gameId && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#ccc' }}>
            <p>{campaignPreferences ? 'Click "Start Campaign Session" to begin' : 'Click "Start New Combat" to begin an encounter'}</p>
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
                  const creature = uiState.gameState?.creatures.find((c: Creature) => c.id === creatureId);
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
                    .filter((c: Creature) => c.type === 'player')
                    .map((character: Creature) => (
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
                  const creature = uiState.gameState?.creatures.find((c: Creature) => c.id === creatureId);
                  if (creature) setSelectedCreatureForStats(creature);
                }}
                explorationMode={isExplorationPhase}
                explorationCreatureId={explorationCreatureId}
                onExplorationMove={handleExplorationMove}
                positionOverrides={positionOverrides}
              />
            </div>

            <div className="right-panel">
              <GMChatPanel
                gameId={uiState.gameId}
                log={uiState.gameState?.log || []}
                gmSession={gmSession}
                campaignPreferences={campaignPreferences}
                onSessionUpdate={(session) => {
                  setGMSession(session);
                  // If GM session phase changed to combat, reset combat result and sync turn order
                  if (session.currentPhase === 'combat' && combatResult) {
                    setCombatResult(null);
                  }
                }}
                onGameStateUpdate={(gameState) => {
                  // Sync currentCreatureId from the new turn order (important after encounter start)
                  const nextCreatureId = gameState.currentRound?.turnOrder?.[
                    gameState.currentRound?.currentTurnIndex ?? 0
                  ] ?? null;
                  setUiState(prev => ({
                    ...prev,
                    gameState,
                    currentCreatureId: nextCreatureId,
                    actionPoints: 3,
                  }));
                  // Reset combat result when new encounter starts (new enemies appear)
                  setCombatResult(null);
                }}
                onEncounterLevelUps={(levelUps, xpAward) => {
                  console.log(`[CombatInterface] XP awarded: ${xpAward}, Level-ups:`, levelUps);
                  if (levelUps.length > 0) {
                    setPendingLevelUps(levelUps.map(lu => ({ id: lu.id, name: lu.name, newLevel: lu.newLevel })));
                    // Start first level-up
                    const first = levelUps[0];
                    const creature = uiState.gameState?.creatures?.find((c: Creature) => c.id === first.id);
                    if (creature) {
                      setLevelUpCreature(creature);
                      setLevelUpNewLevel(first.newLevel);
                    }
                  }
                }}
              />
            </div>

            <div className="bottom-panel">
              {(() => {
                const delayedCreatures = uiState.gameState?.creatures?.filter((c: Creature) => c.isDelaying) || [];
                if (delayedCreatures.length === 0) return null;
                return (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(90, 70, 10, 0.25)',
                    border: '1px solid rgba(200, 170, 40, 0.35)',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    color: '#f3e3a0'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Delayed Creatures</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {delayedCreatures.map((creature: Creature) => (
                        <button
                          key={creature.id}
                          onClick={() => handleResumeDelay(creature.id)}
                          disabled={uiState.loading}
                          style={{
                            padding: '6px 10px',
                            background: '#caa93a',
                            color: '#0b1020',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}
                        >
                          Act Now: {creature.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {isExplorationPhase && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(30, 90, 50, 0.3)',
                  border: '1px solid rgba(80, 200, 100, 0.35)',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  color: '#a8e6a0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '20px' }}>🧭</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Exploration Mode</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>
                      Click any open tile to move your character. Talk to the GM to interact with NPCs.
                    </div>
                  </div>
                </div>
              )}
              <ActionPanel
                currentCreature={getCurrentCreature() as Creature}
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
          onCreatureUpdate={(updatedCreature) => {
            // Update creature in game state
            if (uiState.gameState) {
              const updatedCreatures = uiState.gameState.creatures.map((c: Creature) =>
                c.id === updatedCreature.id ? updatedCreature : c
              );
              setUiState(prev => ({
                ...prev,
                gameState: prev.gameState ? { ...prev.gameState, creatures: updatedCreatures } : prev.gameState
              }));
              // Also update the selected character reference
              setSelectedCharacterForSheet(updatedCreature);

              // Sync image changes to backend so they survive round-trips
              if (uiState.gameId) {
                axios.patch(
                  `/api/game/${uiState.gameId}/creature/${updatedCreature.id}/images`,
                  {
                    tokenImageUrl: updatedCreature.tokenImageUrl || null,
                    portraitImageUrl: updatedCreature.portraitImageUrl || null,
                  }
                ).catch(err => console.warn('Failed to sync creature images to backend:', err));
              }
            }
          }}
          onLevelUp={(creature) => {
            setSelectedCharacterForSheet(null);
            setLevelUpCreature(creature);
            setLevelUpNewLevel(creature.level + 1);
          }}
        />

        <PathbuilderUploadModal
          isOpen={pathbuilderModalOpen}
          onClose={() => setPathbuilderModalOpen(false)}
          onCharacterImported={handlePathbuilderImport}
          multiple={true}
        />

        {/* ─── Level-Up Wizard Modal ─── */}
        {levelUpCreature && levelUpNewLevel > 0 && uiState.gameId && (
          <LevelUpWizard
            creature={levelUpCreature}
            newLevel={levelUpNewLevel}
            gameId={uiState.gameId}
            onComplete={(updatedCreature) => {
              // Update creature in game state
              if (uiState.gameState) {
                const updatedCreatures = uiState.gameState.creatures.map((c: Creature) =>
                  c.id === updatedCreature.id ? updatedCreature : c
                );
                setUiState(prev => ({
                  ...prev,
                  gameState: prev.gameState ? { ...prev.gameState, creatures: updatedCreatures } : prev.gameState
                }));
              }
              // Close wizard
              setLevelUpCreature(null);
              setLevelUpNewLevel(0);
              // Check for more pending level-ups
              const remaining = pendingLevelUps.filter(lu => lu.id !== updatedCreature.id);
              setPendingLevelUps(remaining);
              if (remaining.length > 0) {
                const next = remaining[0];
                const nextCreature = uiState.gameState?.creatures?.find((c: Creature) => c.id === next.id);
                if (nextCreature) {
                  setLevelUpCreature(nextCreature);
                  setLevelUpNewLevel(next.newLevel);
                }
              }
            }}
            onCancel={() => {
              setLevelUpCreature(null);
              setLevelUpNewLevel(0);
              setPendingLevelUps([]);
            }}
          />
        )}

        {/* ─── Encounter Result Overlay ─── */}
        {combatResult && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: combatResult === 'victory'
              ? 'radial-gradient(ellipse at center, rgba(34, 87, 34, 0.92) 0%, rgba(0, 0, 0, 0.95) 100%)'
              : 'radial-gradient(ellipse at center, rgba(100, 20, 20, 0.92) 0%, rgba(0, 0, 0, 0.95) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <div style={{
              textAlign: 'center',
              color: '#fff',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
              maxWidth: '480px',
              padding: '40px'
            }}>
              <div style={{ fontSize: '4em', marginBottom: '16px' }}>
                {combatResult === 'victory' ? '🏆' : '💀'}
              </div>
              <h1 style={{
                fontSize: '2.4em',
                margin: '0 0 12px 0',
                color: combatResult === 'victory' ? '#ffcc00' : '#ff6b6b',
                textShadow: `0 0 24px ${combatResult === 'victory' ? 'rgba(255, 204, 0, 0.5)' : 'rgba(255, 107, 107, 0.5)'}`,
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                {combatResult === 'victory' ? 'Victory!' : 'Defeat'}
              </h1>
              <p style={{
                fontSize: '1.1em',
                color: '#ccc',
                margin: '0 0 36px 0',
                lineHeight: 1.5
              }}>
                {combatResult === 'victory'
                  ? 'All enemies have been vanquished. Your party stands triumphant!'
                  : 'Your party has fallen in battle. The enemies prevail...'}
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* Continue Campaign — only in campaign mode */}
                {campaignPreferences?.mode === 'campaign' && (
                  <button
                    onClick={async () => {
                      if (!uiState.gameId) return;
                      try {
                        const res = await axios.post(
                          `${API_BASE}/game/${uiState.gameId}/gm/encounter/conclusion`,
                          { victory: combatResult === 'victory' }
                        );
                        // Update GM session
                        if (res.data.gmSession) {
                          setGMSession(res.data.gmSession);
                        }
                        // Update full game state (with restored NPCs, map, etc.)
                        if (res.data.gameState) {
                          const gs = res.data.gameState;
                          const nextCreatureId = gs.currentRound?.turnOrder?.[
                            gs.currentRound?.currentTurnIndex ?? 0
                          ] ?? null;
                          setUiState(prev => ({
                            ...prev,
                            gameState: gs,
                            currentCreatureId: nextCreatureId,
                            actionPoints: 3,
                            selectedTarget: null,
                            loading: false,
                          }));
                        }
                        // Handle level-ups
                        if (res.data.levelUps?.length > 0) {
                          setPendingLevelUps(res.data.levelUps.map((lu: { id: string; name: string; newLevel: number }) => ({ id: lu.id, name: lu.name, newLevel: lu.newLevel })));
                          const first = res.data.levelUps[0];
                          const creature = (res.data.gameState || uiState.gameState)?.creatures?.find((c: Creature) => c.id === first.id);
                          if (creature) {
                            setLevelUpCreature(creature);
                            setLevelUpNewLevel(first.newLevel);
                          }
                        }
                        // Dismiss overlay
                        setCombatResult(null);
                        if (res.data.restoredNPCs?.length > 0) {
                          console.log(`🔄 Restored NPCs: ${res.data.restoredNPCs.map((n: { name: string }) => n.name).join(', ')}`);
                        }
                      } catch (error) {
                        console.error('Failed to conclude encounter:', error);
                      }
                    }}
                    style={{
                      padding: '14px 32px',
                      background: 'linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '1em',
                      transition: 'all 0.3s ease',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 16px rgba(79, 195, 247, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 195, 247, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(79, 195, 247, 0.3)';
                    }}
                  >
                    🗺️ Continue Exploring
                  </button>
                )}
                <button
                  onClick={() => {
                    setCombatResult(null);
                    setUiState({
                      gameId: null,
                      gameState: null,
                      currentCreatureId: null,
                      selectedTarget: null,
                      loading: false,
                      error: null,
                      actionPoints: 3
                    });
                    // Re-trigger game creation with same creatures
                    setTimeout(() => startNewGame(), 100);
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1em',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🔄 Retry Encounter
                </button>
                <button
                  onClick={() => {
                    setCombatResult(null);
                    if (onReturnToLanding) onReturnToLanding();
                  }}
                  style={{
                    padding: '14px 32px',
                    background: combatResult === 'victory'
                      ? 'linear-gradient(135deg, #ffcc00 0%, #ffb500 100%)'
                      : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1em',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.5px',
                    boxShadow: `0 4px 16px ${combatResult === 'victory' ? 'rgba(255, 204, 0, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 20px ${combatResult === 'victory' ? 'rgba(255, 204, 0, 0.5)' : 'rgba(255, 107, 107, 0.5)'}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 16px ${combatResult === 'victory' ? 'rgba(255, 204, 0, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`;
                  }}
                >
                  🏠 Return to Menu
                </button>
              </div>
            </div>
          </div>
        )}

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
                {activeReaction.type === 'ready-action' && (
                  <div><strong>Readied action:</strong> {activeReaction.readiedActionId ?? 'Unknown'}</div>
                )}
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
                    const targetId = pendingPickupAction.targetId || uiState.selectedTarget;
                    executeAction(actionWithDestination, targetId);
                    setPickupDestinationModalOpen(false);
                    setPendingPickupAction(null);
                  }}
                  disabled={
                    (() => {
                      const currentCreature = uiState.gameState?.creatures.find((c: Creature) => c.id === uiState.currentCreatureId);
                      if (!currentCreature) return true;
                      const handsInUse = (currentCreature.weaponInventory || [])
                        .filter((s: WeaponSlot) => s.state === 'held' && !s.weapon?.isNatural)
                        .reduce((sum: number, s: WeaponSlot) => sum + (s.weapon?.hands || 1), 0);
                      // Find the ground object to get weapon hand requirement
                      const targetId = pendingPickupAction.targetId || uiState.selectedTarget;
                      const groundObj = uiState.gameState?.groundObjects?.find((g: GroundObject) => g.id === targetId);
                      const handsNeeded = groundObj?.weapon?.hands || 1;
                      return handsInUse + handsNeeded > 2;
                    })()
                  }
                  style={{
                    padding: '12px 20px',
                    background: (() => {
                      const currentCreature = uiState.gameState?.creatures.find((c: Creature) => c.id === uiState.currentCreatureId);
                      if (!currentCreature) return '#555';
                      const handsInUse = (currentCreature.weaponInventory || [])
                        .filter((s: WeaponSlot) => s.state === 'held' && !s.weapon?.isNatural)
                        .reduce((sum: number, s: WeaponSlot) => sum + (s.weapon?.hands || 1), 0);
                      const groundObj = uiState.gameState?.groundObjects?.find((g: GroundObject) => g.id === uiState.selectedTarget);
                      const handsNeeded = groundObj?.weapon?.hands || 1;
                      if (handsInUse + handsNeeded > 2) return '#555';
                      return '#4fc3f7';
                    })(),
                    color: (() => {
                      const currentCreature = uiState.gameState?.creatures.find((c: Creature) => c.id === uiState.currentCreatureId);
                      if (!currentCreature) return '#999';
                      const handsInUse = (currentCreature.weaponInventory || [])
                        .filter((s: WeaponSlot) => s.state === 'held' && !s.weapon?.isNatural)
                        .reduce((sum: number, s: WeaponSlot) => sum + (s.weapon?.hands || 1), 0);
                      const groundObj = uiState.gameState?.groundObjects?.find((g: GroundObject) => g.id === uiState.selectedTarget);
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
                    const currentCreature = uiState.gameState?.creatures.find((c: Creature) => c.id === uiState.currentCreatureId);
                    if (!currentCreature) return '';
                    const handsInUse = (currentCreature.weaponInventory || [])
                      .filter((s: WeaponSlot) => s.state === 'held' && !s.weapon?.isNatural)
                      .reduce((sum: number, s: WeaponSlot) => sum + (s.weapon?.hands || 1), 0);
                    const targetId = pendingPickupAction.targetId || uiState.selectedTarget;
                    const groundObj = uiState.gameState?.groundObjects?.find((g: GroundObject) => g.id === targetId);
                    const handsNeeded = groundObj?.weapon?.hands || 1;
                    if (handsInUse + handsNeeded > 2) return ' (hands full)';
                    return '';
                  })()}
                </button>

                {/* Stow Button */}
                <button
                  onClick={() => {
                    const actionWithDestination = { ...pendingPickupAction, pickupDestination: 'stowed' };
                    const targetId = pendingPickupAction.targetId || uiState.selectedTarget;
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
