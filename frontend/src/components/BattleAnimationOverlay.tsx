import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useDiceRoller, type DieType, type DieResult } from './DiceRollerContext';
import './BattleAnimationOverlay.css';

// ─── Types ──────────────────────────────────────────────

export interface BattleAnimationRequest {
  /** The creature performing the action */
  actorName: string;
  /** Description of the action, e.g. "Attacks with Longsword" or "Casts Fireball" */
  actionDescription: string;
  /** Target creature name (if any) */
  targetName?: string;
  /** Attack roll details (if applicable) */
  attackRoll?: {
    d20: number;
    bonus: number;
    total: number;
    result: 'critical-success' | 'success' | 'failure' | 'critical-failure';
  };
  /** Damage roll details (if attack hit) */
  damageRoll?: {
    dice: { sides: number; results: number[] };
    weaponName: string;
    appliedDamage: number;
    damageType?: string;
    isCriticalHit: boolean;
  };
  /** For non-attack actions (skill checks, saves, etc.) */
  skillCheck?: {
    d20: number;
    bonus: number;
    total: number;
    result: 'critical-success' | 'success' | 'failure' | 'critical-failure';
    label: string;
  };
}

type AnimPhase = 'idle' | 'action-text' | 'attack-roll' | 'attack-result' | 'damage-roll' | 'damage-result' | 'done';

interface BattleAnimationContextValue {
  /** Trigger a full battle animation sequence. Returns a promise that resolves when complete. */
  playBattleAnimation: (request: BattleAnimationRequest) => Promise<void>;
  /** Whether an animation is currently playing */
  isAnimating: boolean;
}

// ─── Context ────────────────────────────────────────────

const BattleAnimationContext = createContext<BattleAnimationContextValue>({
  playBattleAnimation: async () => {},
  isAnimating: false,
});

export const useBattleAnimation = () => useContext(BattleAnimationContext);

// ─── Timing constants ───────────────────────────────────

const ACTION_TEXT_DURATION = 1600;       // "Goblin Warrior attacks with Claws!"
const ATTACK_RESULT_HOLD = 1200;         // "HIT!" / "MISS!" / "CRIT!"
const DAMAGE_RESULT_HOLD = 1400;         // "14 slashing damage!"
const PHASE_GAP = 300;                   // gap between phases

// ─── Result colour map ──────────────────────────────────

const RESULT_COLORS: Record<string, string> = {
  'critical-success': '#FFD700',
  'success':          '#4CAF50',
  'failure':          '#FF6B6B',
  'critical-failure': '#DC143C',
};

const RESULT_LABELS: Record<string, string> = {
  'critical-success': 'CRITICAL HIT!',
  'success':          'HIT!',
  'failure':          'MISS!',
  'critical-failure': 'CRITICAL MISS!',
};

// ─── Provider ───────────────────────────────────────────

export const BattleAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequest, setCurrentRequest] = useState<BattleAnimationRequest | null>(null);
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [isAnimating, setIsAnimating] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);
  const skipRef = useRef(false);
  const { rollDice } = useDiceRoller();

  const playBattleAnimation = useCallback((request: BattleAnimationRequest): Promise<void> => {
    return new Promise<void>(async (resolve) => {
      resolveRef.current = resolve;
      skipRef.current = false;
      setCurrentRequest(request);
      setIsAnimating(true);

      // ── Master safety timeout: auto-finish if animation hangs ──
      const safetyTimer = setTimeout(() => {
        console.warn('⚔️ Battle animation safety timeout — auto-finishing');
        finish();
      }, 12000);

      try {
        // ── Phase 1: Action text announcement ──
        setPhase('action-text');
        await delay(ACTION_TEXT_DURATION);
        if (skipRef.current) { finish(); return; }

        // ── Phase 2: Attack roll (if applicable) ──
        if (request.attackRoll) {
          setPhase('attack-roll');
          await delay(PHASE_GAP);

          // Roll the d20 with 3D dice
          await rollDice({
            dice: [{ type: 'd20' as DieType, value: request.attackRoll.d20 }],
            label: request.actionDescription,
            total: request.attackRoll.total,
            modifier: request.attackRoll.bonus >= 0 
              ? `+${request.attackRoll.bonus}` 
              : `${request.attackRoll.bonus}`,
            result: request.attackRoll.result,
          });
          if (skipRef.current) { finish(); return; }

          // ── Phase 3: Show HIT / MISS result ──
          setPhase('attack-result');
          await delay(ATTACK_RESULT_HOLD);
          if (skipRef.current) { finish(); return; }

          // ── Phase 4: Damage roll (if hit) ──
          if (request.damageRoll && 
              (request.attackRoll.result === 'success' || request.attackRoll.result === 'critical-success')) {
            setPhase('damage-roll');
            await delay(PHASE_GAP);

            // Roll damage dice with 3D animation
            const damageDice: DieResult[] = request.damageRoll.dice.results.map(val => ({
              type: (`d${request.damageRoll!.dice.sides}`) as DieType,
              value: val,
            }));

            if (damageDice.length > 0) {
              await rollDice({
                dice: damageDice,
                label: `${request.damageRoll.weaponName} damage`,
                total: request.damageRoll.appliedDamage,
                result: request.damageRoll.isCriticalHit ? 'critical-success' : 'success',
              });
            }
            if (skipRef.current) { finish(); return; }

            // ── Phase 5: Show damage result ──
            setPhase('damage-result');
            await delay(DAMAGE_RESULT_HOLD);
          }
        }
        // ── Skill check animation (non-attack) ──
        else if (request.skillCheck) {
          setPhase('attack-roll');
          await delay(PHASE_GAP);

          await rollDice({
            dice: [{ type: 'd20' as DieType, value: request.skillCheck.d20 }],
            label: request.skillCheck.label,
            total: request.skillCheck.total,
            modifier: request.skillCheck.bonus >= 0 
              ? `+${request.skillCheck.bonus}` 
              : `${request.skillCheck.bonus}`,
            result: request.skillCheck.result,
          });

          setPhase('attack-result');
          await delay(ATTACK_RESULT_HOLD);
        }
      } catch (e) {
        console.warn('⚔️ Battle animation error (non-blocking):', e);
      }

      clearTimeout(safetyTimer);
      finish();

      function finish() {
        clearTimeout(safetyTimer);
        setPhase('done');
        setTimeout(() => {
          setCurrentRequest(null);
          setPhase('idle');
          setIsAnimating(false);
          resolveRef.current?.();
          resolveRef.current = null;
        }, 200);
      }
    });
  }, [rollDice]);

  const handleDismiss = useCallback(() => {
    skipRef.current = true;
    setCurrentRequest(null);
    setPhase('idle');
    setIsAnimating(false);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  return (
    <BattleAnimationContext.Provider value={{ playBattleAnimation, isAnimating }}>
      {children}
      {currentRequest && phase !== 'idle' && phase !== 'done' && (
        <BattleAnimationDisplay
          request={currentRequest}
          phase={phase}
          onDismiss={handleDismiss}
        />
      )}
    </BattleAnimationContext.Provider>
  );
};

// ─── Display Component ──────────────────────────────────

interface DisplayProps {
  request: BattleAnimationRequest;
  phase: AnimPhase;
  onDismiss: () => void;
}

const BattleAnimationDisplay: React.FC<DisplayProps> = ({ request, phase, onDismiss }) => {
  const isHit = request.attackRoll?.result === 'success' || request.attackRoll?.result === 'critical-success';
  const isCrit = request.attackRoll?.result === 'critical-success';
  const isCritMiss = request.attackRoll?.result === 'critical-failure';

  // Build action announcement text
  const actionText = request.targetName
    ? `${request.actorName} ${request.actionDescription} → ${request.targetName}`
    : `${request.actorName} ${request.actionDescription}`;

  return (
    <div className="battle-anim" onClick={onDismiss}>
      {/* Action Announcement */}
      {phase === 'action-text' && (
        <div className="battle-anim__announcement">
          <div className="battle-anim__actor-name">{request.actorName}</div>
          <div className="battle-anim__action-text">
            {request.actionDescription}
            {request.targetName && (
              <>
                <span className="battle-anim__arrow"> → </span>
                <span className="battle-anim__target-name">{request.targetName}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Attack Result Banner (HIT / MISS / CRIT) */}
      {phase === 'attack-result' && request.attackRoll && (
        <div className="battle-anim__result-banner">
          <div
            className={`battle-anim__result-text ${isCrit ? 'battle-anim__result-text--crit' : ''} ${isCritMiss ? 'battle-anim__result-text--crit-miss' : ''}`}
            style={{ color: RESULT_COLORS[request.attackRoll.result] }}
          >
            {RESULT_LABELS[request.attackRoll.result]}
          </div>
          <div className="battle-anim__roll-total">
            {request.attackRoll.d20} + {request.attackRoll.bonus} = {request.attackRoll.total}
          </div>
        </div>
      )}

      {/* Damage Result Banner */}
      {phase === 'damage-result' && request.damageRoll && (
        <div className="battle-anim__result-banner">
          <div className={`battle-anim__damage-number ${isCrit ? 'battle-anim__damage-number--crit' : ''}`}>
            {request.damageRoll.appliedDamage}
          </div>
          <div className="battle-anim__damage-label">
            {request.damageRoll.damageType || ''} damage
            {isCrit && <span className="battle-anim__crit-tag"> (CRITICAL)</span>}
          </div>
          {request.targetName && (
            <div className="battle-anim__damage-target">
              to {request.targetName}
            </div>
          )}
        </div>
      )}

      {/* Skill check result */}
      {phase === 'attack-result' && request.skillCheck && (
        <div className="battle-anim__result-banner">
          <div
            className="battle-anim__result-text"
            style={{ color: RESULT_COLORS[request.skillCheck.result] }}
          >
            {request.skillCheck.result.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </div>
          <div className="battle-anim__roll-total">
            {request.skillCheck.d20} + {request.skillCheck.bonus} = {request.skillCheck.total}
          </div>
        </div>
      )}

      <div className="battle-anim__hint">Click to skip</div>
    </div>
  );
};

// ─── Utility ────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default BattleAnimationProvider;
