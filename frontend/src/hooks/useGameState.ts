/**
 * C.1 + C.4 — useGameState hook
 * Manages core game state via useReducer with typed actions.
 * Handles: game creation, action execution, end-turn, save/load, exploration movement.
 */
import { useReducer, useCallback, useRef } from 'react';
import type { Creature, GameState, GMSession, CampaignPreferences } from '../../../shared/types';
import type { Difficulty } from '../../../shared/encounterBuilder';
import * as api from '../services/apiService';
import { devLog, devError } from '../utils/devLog';
import type { BattleAnimationRequest } from '../components/BattleAnimationOverlay';

// ─── State Shape ───────────────────────────────────────────

export interface GameUIState {
  gameId: string | null;
  gameState: GameState | null;
  currentCreatureId: string | null;
  selectedTarget: string | null;
  loading: boolean;
  error: string | null;
  actionPoints: number;
}

const initialUIState: GameUIState = {
  gameId: null,
  gameState: null,
  currentCreatureId: null,
  selectedTarget: null,
  loading: false,
  error: null,
  actionPoints: 3,
};

// ─── Actions ───────────────────────────────────────────────

type GameAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'GAME_CREATED'; gameId: string; gameState: GameState; currentCreatureId: string }
  | { type: 'GAME_LOADED'; gameId: string; gameState: GameState; currentCreatureId: string }
  | { type: 'GAME_STATE_UPDATED'; gameState: GameState }
  | { type: 'ACTION_SUCCESS'; gameState: GameState; actionCost: number; clearTarget?: boolean }
  | { type: 'TURN_ENDED'; gameState: GameState; nextCreatureId: string }
  | { type: 'AI_TURN_STEP'; creatures: Creature[]; log?: any[] }
  | { type: 'AI_TURN_COMPLETE'; gameState: GameState; nextCreatureId: string }
  | { type: 'SELECT_TARGET'; targetId: string | null }
  | { type: 'CLEAR_SELECTION' };

function gameReducer(state: GameUIState, action: GameAction): GameUIState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'GAME_CREATED':
      return {
        ...state,
        gameId: action.gameId,
        gameState: action.gameState,
        currentCreatureId: action.currentCreatureId,
        loading: false,
        actionPoints: 3,
        error: null,
      };
    case 'GAME_LOADED':
      return {
        ...state,
        gameId: action.gameId,
        gameState: action.gameState,
        currentCreatureId: action.currentCreatureId,
        loading: false,
        actionPoints: 3,
        selectedTarget: null,
        error: null,
      };
    case 'GAME_STATE_UPDATED':
      return { ...state, gameState: action.gameState };
    case 'ACTION_SUCCESS':
      return {
        ...state,
        gameState: action.gameState,
        loading: false,
        selectedTarget: action.clearTarget ? null : state.selectedTarget,
        actionPoints: state.actionPoints - action.actionCost,
      };
    case 'TURN_ENDED':
      return {
        ...state,
        gameState: action.gameState,
        currentCreatureId: action.nextCreatureId,
        loading: false,
        actionPoints: 3,
        selectedTarget: null,
      };
    case 'AI_TURN_STEP':
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          creatures: state.gameState.creatures.map((c: Creature) => {
            const snap = action.creatures.find((s: any) => s.id === c.id);
            if (snap) {
              return { ...c, currentHealth: snap.currentHealth, conditions: snap.conditions, dead: snap.dead };
            }
            return c;
          }),
          log: [...(state.gameState.log || []), ...(action.log || [])],
        },
      };
    case 'AI_TURN_COMPLETE':
      return {
        ...state,
        gameState: action.gameState,
        currentCreatureId: action.nextCreatureId,
        loading: false,
        actionPoints: 3,
        selectedTarget: null,
      };
    case 'SELECT_TARGET':
      return { ...state, selectedTarget: action.targetId };
    case 'CLEAR_SELECTION':
      return { ...state, selectedTarget: null };
    default:
      return state;
  }
}

// ─── Hook ──────────────────────────────────────────────────

export interface UseGameStateOptions {
  initialCreatures?: Creature[];
  difficulty?: Difficulty;
  campaignPreferences?: CampaignPreferences;
  playBattleAnimation: (req: BattleAnimationRequest) => Promise<void>;
}

export interface UseGameStateReturn {
  uiState: GameUIState;
  dispatch: React.Dispatch<GameAction>;
  startNewGame: () => Promise<void>;
  executeAction: (action: any, targetOrPosition?: any, overrideCreatureId?: string, heroPointsSpent?: number) => Promise<api.ActionResponse | undefined>;
  handleEndTurn: () => Promise<void>;
  handleSaveGame: (saveName: string) => Promise<void>;
  handleLoadGame: (saveId: string) => Promise<void>;
  handlePathbuilderImport: (creatures: Creature[]) => Promise<void>;
  handleExplorationMove: (x: number, y: number) => Promise<void>;
  handleResumeDelay: (creatureId: string) => Promise<void>;
  getCurrentCreature: () => Creature | null;
  setGMSession: React.Dispatch<React.SetStateAction<GMSession | null>>;
  gmSession: GMSession | null;
  gmInitializing: boolean;
  gmInitStatus: string;
  explorationAnimating: boolean;
  positionOverrides: Map<string, { x: number; y: number }>;
  setPositionOverrides: React.Dispatch<React.SetStateAction<Map<string, { x: number; y: number }>>>;
  modalLoading: boolean;
}

export function useGameState(options: UseGameStateOptions): UseGameStateReturn {
  const { initialCreatures, difficulty = 'moderate', campaignPreferences, playBattleAnimation } = options;

  const [uiState, dispatch] = useReducer(gameReducer, initialUIState);

  // ─── Companion state that doesn't fit cleanly in reducer ───
  const [gmSession, setGMSession] = useReducerCompanion<GMSession | null>(null);
  const [gmInitializing, setGmInitializing] = useReducerCompanion(false);
  const [gmInitStatus, setGmInitStatus] = useReducerCompanion('');
  const [explorationAnimating, setExplorationAnimating] = useReducerCompanion(false);
  const [positionOverrides, setPositionOverrides] = useReducerCompanion<Map<string, { x: number; y: number }>>(new Map());
  const [modalLoading, setModalLoading] = useReducerCompanion(false);

  const animationRef = useRef<number | null>(null);
  const npcReplayRef = useRef<number | null>(null);

  // ─── Game Creation ─────────────────────────────────────────
  const startNewGame = useCallback(async () => {
    devLog('🎮 Start new game clicked', { hasInitialCreatures: !!initialCreatures, difficulty, isCampaign: !!campaignPreferences });
    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const partyLevel = initialCreatures && initialCreatures.length > 0
        ? Math.round(initialCreatures.reduce((sum, c) => sum + (c.level || 1), 0) / initialCreatures.length)
        : 1;
      const partySize = initialCreatures?.length || 1;

      let encounterCreatures: any[] = [];
      const isEncounterMode = !campaignPreferences || campaignPreferences.mode === 'encounter';
      if (isEncounterMode) {
        devLog(`📡 Fetching ${difficulty} encounter for party level ${partyLevel}, size ${partySize}`);
        const encounter = await api.fetchEncounter(difficulty, partyLevel, partySize);
        devLog('🐉 Encounter generated:', encounter.description);
        encounterCreatures = encounter.creatures;
      } else {
        devLog('📜 Campaign mode — starting without enemies (exploration phase)');
      }

      const gameState = await api.createGame({
        players: initialCreatures || [],
        creatures: encounterCreatures,
        mapSize: 20,
        mapTheme: campaignPreferences?.mapTheme || undefined,
        mapSubTheme: campaignPreferences?.mapSubTheme || undefined,
        aiModel: campaignPreferences?.aiModel || undefined,
      });

      devLog('✅ Game created successfully:', gameState);

      dispatch({
        type: 'GAME_CREATED',
        gameId: (gameState as any).id,
        gameState,
        currentCreatureId: (gameState as any).currentRound.turnOrder[0],
      });

      if ((gameState as any).gmSession) {
        setGMSession((gameState as any).gmSession);
      }

      // Auto-initialize GM session for campaign mode
      const isCampaignMode = campaignPreferences && campaignPreferences.mode !== 'encounter';
      if (isCampaignMode && (gameState as any).id) {
        setGmInitializing(true);
        setGmInitStatus('Generating world...');
        try {
          const statusMessages = [
            'Generating world...', 'Placing landmarks...', 'Populating the scene...',
            'Summoning NPCs...', 'Writing the opening narration...', 'The adventure awaits...',
          ];
          let statusIdx = 0;
          const statusInterval = setInterval(() => {
            statusIdx = (statusIdx + 1) % statusMessages.length;
            setGmInitStatus(statusMessages[statusIdx]);
          }, 2500);

          const gmRes = await api.initGMSession((gameState as any).id, campaignPreferences!);
          clearInterval(statusInterval);

          if (gmRes.gmSession) setGMSession(gmRes.gmSession);
          if (gmRes.gameState) dispatch({ type: 'GAME_STATE_UPDATED', gameState: gmRes.gameState });
        } catch (gmError) {
          devLog('⚠️ GM session auto-init failed (non-critical):', gmError);
        } finally {
          setGmInitializing(false);
          setGmInitStatus('');
        }
      }
    } catch (error: any) {
      devError('❌ Game creation error:', error);
      dispatch({ type: 'SET_ERROR', error: api.extractErrorMessage(error, 'Failed to create game') });
    }
  }, [initialCreatures, difficulty, campaignPreferences]);

  // ─── Execute Action ────────────────────────────────────────
  const executeAction = useCallback(async (
    action: any,
    targetOrPosition?: any,
    overrideCreatureId?: string,
    heroPointsSpent?: number
  ): Promise<api.ActionResponse | undefined> => {
    if (!uiState.gameId || !uiState.currentCreatureId) return undefined;
    const actingCreatureId = overrideCreatureId ?? uiState.currentCreatureId;

    if (!overrideCreatureId && uiState.actionPoints < action.cost) {
      dispatch({ type: 'SET_ERROR', error: `Not enough action points. Need ${action.cost}, have ${uiState.actionPoints}.` });
      return undefined;
    }

    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const payload: api.ActionPayload = {
        creatureId: actingCreatureId,
        actionId: action.id,
      };

      if (action.weaponId) payload.weaponId = action.weaponId;
      if (action.spellId) payload.spellId = action.spellId;
      if (action.pickupDestination) payload.pickupDestination = action.pickupDestination;
      if (action.readyActionId) payload.readyActionId = action.readyActionId;
      if (action.itemId) payload.itemId = action.itemId;
      if (typeof heroPointsSpent === 'number') payload.heroPointsSpent = heroPointsSpent;

      if ((action.movementType || action.aoe) && targetOrPosition && typeof targetOrPosition === 'object') {
        payload.targetPosition = targetOrPosition;
      } else if (targetOrPosition) {
        payload.targetId = typeof targetOrPosition === 'string' ? targetOrPosition : uiState.selectedTarget || undefined;
      }

      devLog('📤 Sending action payload:', payload);
      const response = await api.executeGameAction(uiState.gameId, payload);
      devLog('📥 Backend response:', response);

      const { result, gameState: newGameState } = response;
      const isCurrentActor = actingCreatureId === uiState.currentCreatureId;
      const shouldConsumeAction = isCurrentActor && result?.success === true;
      const cost = shouldConsumeAction ? action.cost : 0;

      // Animate player movement step-by-step
      const isMovement = action.movementType || ['stride', 'move', 'step'].includes(action.id);
      if (isMovement && result?.success && newGameState?.creatures) {
        const oldCreature = uiState.gameState?.creatures?.find((c: Creature) => c.id === actingCreatureId);
        const newCreature = newGameState.creatures.find((c: Creature) => c.id === actingCreatureId);
        if (oldCreature && newCreature &&
            (oldCreature.positions.x !== newCreature.positions.x || oldCreature.positions.y !== newCreature.positions.y)) {
          const path: { x: number; y: number }[] = result.path && result.path.length >= 2
            ? result.path
            : [{ x: oldCreature.positions.x, y: oldCreature.positions.y }, { x: newCreature.positions.x, y: newCreature.positions.y }];

          const STEP_DELAY_MS = 120;
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
            animationRef.current = window.setTimeout(animateStep, 30);
          });
        }
      }

      // Battle animation for player actions
      if (isCurrentActor && result?.details && typeof result.details.d20 === 'number') {
        const actorCreature = uiState.gameState?.creatures?.find((c: Creature) => c.id === actingCreatureId);
        const targetCreature = payload.targetId
          ? uiState.gameState?.creatures?.find((c: Creature) => c.id === payload.targetId)
          : null;

        const animRequest: BattleAnimationRequest = {
          actorName: actorCreature?.name || 'Unknown',
          actionDescription: action.name || 'Attack',
          targetName: targetCreature?.name,
          attackRoll: {
            d20: result.details.d20,
            bonus: result.details.bonus ?? 0,
            total: result.details.total ?? (result.details.d20 + (result.details.bonus ?? 0)),
            result: result.details.result as any,
          },
        };

        if (result.details.damage && (result.details.result === 'success' || result.details.result === 'critical-success')) {
          animRequest.damageRoll = {
            dice: result.details.damage.dice ?? { sides: 6, results: [] },
            weaponName: result.details.damage.weaponName || action.name || 'Attack',
            appliedDamage: result.details.damage.appliedDamage ?? result.details.damage.total ?? 0,
            damageType: result.details.damage.damageType,
            isCriticalHit: result.details.result === 'critical-success',
          };
        }

        try {
          await playBattleAnimation(animRequest);
        } catch (e) {
          devLog('⚔️ Battle animation error (non-blocking):', e);
        }
      }

      dispatch({ type: 'ACTION_SUCCESS', gameState: newGameState, actionCost: cost, clearTarget: result?.success === true });

      if (newGameState?.gmSession) {
        setGMSession(newGameState.gmSession);
      }

      return response;
    } catch (error: any) {
      devError('❌ Action execution error:', error);
      dispatch({ type: 'SET_ERROR', error: error.message || 'Action failed' });
      return undefined;
    }
  }, [uiState.gameId, uiState.currentCreatureId, uiState.actionPoints, uiState.gameState, uiState.selectedTarget, playBattleAnimation]);

  // ─── End Turn ──────────────────────────────────────────────
  const handleEndTurn = useCallback(async () => {
    if (!uiState.gameId || !uiState.gameState) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const newGameState = await api.endTurn(uiState.gameId);
      const nextCreatureId = newGameState.currentRound.turnOrder[newGameState.currentRound.currentTurnIndex];
      dispatch({ type: 'TURN_ENDED', gameState: newGameState, nextCreatureId });
    } catch (error: any) {
      devError('❌ End turn error:', error);
      dispatch({ type: 'SET_ERROR', error: error.message || 'Failed to end turn' });
    }
  }, [uiState.gameId, uiState.gameState]);

  // ─── Save/Load ─────────────────────────────────────────────
  const handleSaveGame = useCallback(async (saveName: string) => {
    if (!uiState.gameId || !uiState.gameState) return;
    setModalLoading(true);
    try {
      await api.saveGame(uiState.gameId, saveName);
      devLog('✅ Game saved');
      dispatch({ type: 'SET_ERROR', error: null });
    } catch (error: any) {
      devError('❌ Save error:', error);
      dispatch({ type: 'SET_ERROR', error: error.message || 'Failed to save game' });
    } finally {
      setModalLoading(false);
    }
  }, [uiState.gameId, uiState.gameState]);

  const handleLoadGame = useCallback(async (saveId: string) => {
    setModalLoading(true);
    try {
      const loadedGameState = await api.loadGame(saveId);
      devLog('✅ Game loaded:', (loadedGameState as any).id);
      dispatch({
        type: 'GAME_LOADED',
        gameId: (loadedGameState as any).id,
        gameState: loadedGameState,
        currentCreatureId: (loadedGameState as any).currentRound.turnOrder[(loadedGameState as any).currentRound.currentTurnIndex],
      });
      if ((loadedGameState as any).gmSession) {
        setGMSession((loadedGameState as any).gmSession);
      }
    } catch (error: any) {
      devError('❌ Load error:', error);
      dispatch({ type: 'SET_ERROR', error: error.message || 'Failed to load game' });
    } finally {
      setModalLoading(false);
    }
  }, []);

  // ─── Pathbuilder Import ────────────────────────────────────
  const handlePathbuilderImport = useCallback(async (creatures: Creature[]) => {
    if (!uiState.gameId || !uiState.gameState) {
      dispatch({ type: 'SET_ERROR', error: 'No active game. Please start a new combat first.' });
      return;
    }
    setModalLoading(true);
    try {
      devLog(`🎯 Importing ${creatures.length} characters from Pathbuilder...`);
      const gameState = await api.addCreatures(uiState.gameId, creatures);
      dispatch({ type: 'GAME_STATE_UPDATED', gameState });
    } catch (error: any) {
      devError('❌ Import error:', error);
      dispatch({ type: 'SET_ERROR', error: api.extractErrorMessage(error, 'Failed to import characters') });
    } finally {
      setModalLoading(false);
    }
  }, [uiState.gameId, uiState.gameState]);

  // ─── Exploration Movement ──────────────────────────────────
  const handleExplorationMove = useCallback(async (x: number, y: number) => {
    const explorationCreatureId = uiState.gameState?.creatures?.find((c: Creature) => c.type === 'player')?.id;
    if (!uiState.gameId || !explorationCreatureId || explorationAnimating) return;

    try {
      const response = await api.explorationMove(uiState.gameId, explorationCreatureId, { x, y });

      if (response.success && response.path && response.path.length > 1) {
        const path = response.path;
        const finalGameState = response.gameState;

        setExplorationAnimating(true);
        const STEP_DELAY_MS = 200;
        let stepIndex = 1;

        const animateStep = () => {
          if (stepIndex >= path.length) {
            setPositionOverrides(new Map());
            setExplorationAnimating(false);
            dispatch({ type: 'GAME_STATE_UPDATED', gameState: finalGameState });
            return;
          }
          const pos = path[stepIndex];
          setPositionOverrides(new Map([[explorationCreatureId!, { x: pos.x, y: pos.y }]]));
          stepIndex++;
          animationRef.current = window.setTimeout(animateStep, STEP_DELAY_MS);
        };

        setPositionOverrides(new Map([[explorationCreatureId, { x: path[0].x, y: path[0].y }]]));
        animationRef.current = window.setTimeout(animateStep, 50);
      } else if (response.success) {
        dispatch({ type: 'GAME_STATE_UPDATED', gameState: response.gameState });
      }
    } catch (error: any) {
      devError('🚶 Exploration move failed:', error);
      dispatch({ type: 'SET_ERROR', error: api.extractErrorMessage(error, 'Move failed') });
    }
  }, [uiState.gameId, uiState.gameState, explorationAnimating]);

  // ─── Resume Delay ──────────────────────────────────────────
  const handleResumeDelay = useCallback(async (creatureId: string) => {
    if (!uiState.gameId || !uiState.gameState) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const response = await api.executeGameAction(uiState.gameId, { creatureId, actionId: 'resume-delay' });
      dispatch({
        type: 'TURN_ENDED',
        gameState: response.gameState,
        nextCreatureId: creatureId,
      });
    } catch (error: any) {
      devError('❌ Resume delay error:', error);
      dispatch({ type: 'SET_ERROR', error: error.message || 'Failed to resume delay' });
    }
  }, [uiState.gameId, uiState.gameState]);

  // ─── Helpers ───────────────────────────────────────────────
  const getCurrentCreature = useCallback(() => {
    if (!uiState.gameState) return null;
    return uiState.gameState.creatures.find((c: Creature) => c.id === uiState.currentCreatureId) || null;
  }, [uiState.gameState, uiState.currentCreatureId]);

  return {
    uiState,
    dispatch,
    startNewGame,
    executeAction,
    handleEndTurn,
    handleSaveGame,
    handleLoadGame,
    handlePathbuilderImport,
    handleExplorationMove,
    handleResumeDelay,
    getCurrentCreature,
    setGMSession,
    gmSession,
    gmInitializing,
    gmInitStatus,
    explorationAnimating,
    positionOverrides,
    setPositionOverrides,
    modalLoading,
  };
}

// ─── Internal helper: useState for reducer-companion state ──
import { useState } from 'react';

function useReducerCompanion<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  return useState<T>(initial);
}
