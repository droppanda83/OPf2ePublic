/**
 * C.1 — useAITurn hook
 * Automatically executes AI turns when it's an NPC's turn.
 * Handles step-by-step replay with battle animations.
 */
import { useEffect, useRef } from 'react';
import type { Creature, GameState, GMSession } from '../../../shared/types';
import type { BattleAnimationRequest } from '../components/BattleAnimationOverlay';
import * as api from '../services/apiService';
import { devLog, devError } from '../utils/devLog';

interface UseAITurnOptions {
  gameId: string | null;
  gameState: GameState | null;
  currentCreatureId: string | null;
  gmSession: GMSession | null;
  playBattleAnimation: (req: BattleAnimationRequest) => Promise<void>;
  onTurnComplete: (gameState: GameState, nextCreatureId: string) => void;
  onStepUpdate: (creatures: any[], log?: any[]) => void;
  onPositionOverrides: (overrides: Map<string, { x: number; y: number }>) => void;
  onGMSessionUpdate: (session: GMSession) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function useAITurn(options: UseAITurnOptions): void {
  const {
    gameId,
    gameState,
    currentCreatureId,
    gmSession,
    playBattleAnimation,
    onTurnComplete,
    onStepUpdate,
    onPositionOverrides,
    onGMSessionUpdate,
    onError,
    onLoadingChange,
  } = options;

  const aiTurnFiredRef = useRef<string | null>(null);
  const aiTurnInFlightRef = useRef(false);
  const npcReplayRef = useRef<number | null>(null);

  useEffect(() => {
    if (!gameId || !gameState || !currentCreatureId) return;
    if (aiTurnInFlightRef.current) return;

    const phase = gmSession?.currentPhase;
    if (phase && phase !== 'combat') return;

    const currentCreature = gameState.creatures.find((c: Creature) => c.id === currentCreatureId);
    if (!currentCreature || currentCreature.type === 'player') {
      aiTurnFiredRef.current = null;
      return;
    }

    // Skip dead creatures
    if (currentCreature.currentHealth <= 0 || currentCreature.dead) {
      devLog('🤖 Skipping dead creature:', currentCreature.name);
      api.endTurn(gameId)
        .then((recoveredState: GameState) => {
          const nextId = recoveredState.currentRound.turnOrder[recoveredState.currentRound.currentTurnIndex];
          onTurnComplete(recoveredState, nextId);
        })
        .catch((err: unknown) => devError('Failed to skip dead creature turn:', err));
      return;
    }

    // Prevent duplicate AI turn requests
    const turnKey = `${currentCreature.id}-${gameState.currentRound?.number ?? 0}-${gameState.currentRound?.currentTurnIndex ?? 0}`;
    if (aiTurnFiredRef.current === turnKey) return;
    aiTurnFiredRef.current = turnKey;

    devLog('🤖 AI turn detected for:', currentCreature.name);

    let cancelled = false;

    const executeAITurn = async () => {
      aiTurnInFlightRef.current = true;
      onLoadingChange(true);

      try {
        const response = await api.executeAITurn(gameId);
        if (cancelled) { aiTurnInFlightRef.current = false; return; }
        aiTurnInFlightRef.current = false;

        const { gameState: newGameState, executionResults } = response;
        const nextCreatureId = newGameState.currentRound.turnOrder[newGameState.currentRound.currentTurnIndex];

        devLog('🤖 AI turn completed. Actions:', executionResults.map((r: any) =>
          `${r.planned?.action?.actionId}: ${r.result?.success ? '✅' : '❌'} ${r.result?.message || ''}`));

        const successfulSteps = executionResults.filter((r: any) => r.result?.success && r.stateSnapshot);

        if (successfulSteps.length > 0) {
          const STEP_DELAY = 800;
          const MOVE_ANIM_DELAY = 400;

          const replayAllSteps = async () => {
            for (let stepIdx = 0; stepIdx < successfulSteps.length; stepIdx++) {
              if (cancelled) break;

              const step = successfulSteps[stepIdx];
              const actionId = step.planned?.action?.actionId || 'action';
              const isMovement = ['stride', 'move', 'step'].includes(actionId);
              const details = step.result?.details;

              // Battle animation for NPC attacks
              if (details && typeof details.d20 === 'number' && !isMovement) {
                const targetId = step.planned?.action?.targetId;
                const targetCreature = targetId
                  ? gameState.creatures?.find((c: Creature) => c.id === targetId)
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
                    result: details.result as any,
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
                  devLog('⚔️ NPC battle animation error (non-blocking):', e);
                }
              }

              // Apply creature position/HP changes from snapshot
              if (step.stateSnapshot?.creatures) {
                const snapshot = step.stateSnapshot.creatures;
                const overrides = new Map<string, { x: number; y: number }>();
                for (const sc of snapshot) {
                  overrides.set(sc.id, { x: sc.positions.x, y: sc.positions.y });
                }
                onPositionOverrides(overrides);
                onStepUpdate(snapshot, step.stateSnapshot?.log);
              }

              // Wait between steps
              const stepDelay = isMovement ? STEP_DELAY + MOVE_ANIM_DELAY : STEP_DELAY;
              await new Promise<void>(r => {
                npcReplayRef.current = window.setTimeout(r, stepDelay);
              });
            }

            // All steps replayed — apply final state
            onPositionOverrides(new Map());
            onTurnComplete(newGameState, nextCreatureId);
            if (newGameState?.gmSession) {
              onGMSessionUpdate(newGameState.gmSession);
            }
          };

          replayAllSteps();
        } else {
          onTurnComplete(newGameState, nextCreatureId);
          if (newGameState?.gmSession) {
            onGMSessionUpdate(newGameState.gmSession);
          }
        }
      } catch (error: any) {
        if (cancelled) { aiTurnInFlightRef.current = false; return; }
        devError('❌ AI turn error:', error);
        aiTurnInFlightRef.current = false;

        try {
          const recoveredState = await api.endTurn(gameId);
          const nextId = recoveredState.currentRound.turnOrder[recoveredState.currentRound.currentTurnIndex];
          onTurnComplete(recoveredState, nextId);
          onError(`AI turn failed for ${currentCreature.name} — skipped. (${error.message || 'timeout'})`);
        } catch {
          onLoadingChange(false);
          onError(`AI turn failed: ${error.message || 'Unknown error'}`);
        }
      }
    };

    const timer = setTimeout(() => {
      if (!cancelled) executeAITurn();
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (npcReplayRef.current) clearTimeout(npcReplayRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, currentCreatureId, gmSession?.currentPhase]);
}
