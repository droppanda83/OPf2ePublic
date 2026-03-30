import React, { createContext, useContext, useState, useCallback, useRef, Suspense, Component } from 'react';

// ─── Feature flag ───────────────────────────────────────
// 3D dice roller is enabled — battle animations use it for attack & damage rolls
const DICE_ROLLER_ENABLED = true;

// ─── Types ──────────────────────────────────────────────

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DieResult {
  type: DieType;
  value: number;
}

export interface DiceRollRequest {
  /** Array of dice to roll, e.g. [{type:'d20', value:14}, {type:'d6', value:3}] */
  dice: DieResult[];
  /** Optional label shown above the roll, e.g. "Attack Roll" or "Fire damage" */
  label?: string;
  /** Total (including modifiers) to show after dice settle */
  total?: number;
  /** Modifier string to display, e.g. "+8" */
  modifier?: string;
  /** Degree of success colouring */
  result?: 'critical-success' | 'success' | 'failure' | 'critical-failure';
}

interface DiceRollerContextValue {
  /** Trigger a 3D dice roll animation. Returns a promise that resolves when the animation finishes. */
  rollDice: (request: DiceRollRequest) => Promise<void>;
  /** Whether a roll animation is currently playing */
  isRolling: boolean;
}

// ─── Error Boundary ─────────────────────────────────────

interface EBProps { children: React.ReactNode; onError: () => void }
interface EBState { hasError: boolean }

class DiceErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error('🎲 Dice roller crashed (caught by ErrorBoundary):', error);
    // Auto-dismiss after a moment so the game continues
    setTimeout(() => this.props.onError(), 800);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', color: '#ff6b6b', fontSize: '1rem',
          cursor: 'pointer',
        }} onClick={() => this.props.onError()}>
          Dice animation failed — click to continue
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Context ────────────────────────────────────────────

const DiceRollerContext = createContext<DiceRollerContextValue>({
  rollDice: async () => {},
  isRolling: false,
});

export const useDiceRoller = () => useContext(DiceRollerContext);

// ─── Provider ───────────────────────────────────────────

export const DiceRollerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoll, setCurrentRoll] = useState<DiceRollRequest | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);

  const rollDice = useCallback((request: DiceRollRequest): Promise<void> => {
    if (!DICE_ROLLER_ENABLED) return Promise.resolve(); // disabled — skip animation
    console.log('🎲 [DiceRollerContext] rollDice called with', request.dice.length, 'dice');
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setCurrentRoll(request);
      setIsRolling(true);
      // Safety timeout: if dice animation never completes, auto-resolve after 8s
      setTimeout(() => {
        if (resolveRef.current === resolve) {
          console.warn('🎲 Dice roll safety timeout — auto-resolving');
          setIsRolling(false);
          setCurrentRoll(null);
          resolveRef.current = null;
          resolve();
        }
      }, 8000);
    });
  }, []);

  const handleComplete = useCallback(() => {
    console.log('🎲 [DiceRollerContext] handleComplete called');
    setIsRolling(false);
    setTimeout(() => {
      setCurrentRoll(null);
      resolveRef.current?.();
      resolveRef.current = null;
    }, 800);
  }, []);

  const handleDismiss = useCallback(() => {
    setCurrentRoll(null);
    setIsRolling(false);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  return (
    <DiceRollerContext.Provider value={{ rollDice, isRolling }}>
      {children}
      {currentRoll && (
        <DiceErrorBoundary onError={handleDismiss}>
          <Suspense fallback={
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '1.2rem',
            }}>
              Loading dice...
            </div>
          }>
            <DiceRoller3DOverlay
              request={currentRoll}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
            />
          </Suspense>
        </DiceErrorBoundary>
      )}
    </DiceRollerContext.Provider>
  );
};

// Lazy-import the heavy 3D component — with eager preload
const diceRollerImport = import('./DiceRoller3D');
const DiceRoller3DOverlay = React.lazy(() => diceRollerImport);

export default DiceRollerProvider;
