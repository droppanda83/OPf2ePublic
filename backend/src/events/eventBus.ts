/**
 * GameEventBus — Central event dispatcher for the AI GM system.
 *
 * Wraps Node's EventEmitter with typed event subscriptions. All game state changes
 * flow through here. AI subsystems subscribe to events rather than being called
 * from routes directly.
 *
 * Usage:
 *   eventBus.on('action:executed', (event) => { ... });  // typed!
 *   eventBus.emit({ type: 'action:executed', ... });
 *
 * Phase 1: In-process only. Phase 2+ adds WebSocket/SSE forwarding to frontend.
 */
import { EventEmitter } from 'events';
import type {
  GameEvent,
  GameEventType,
  GameEventMap,
  GameEventHandler,
} from 'pf2e-shared';

export class GameEventBus {
  private emitter = new EventEmitter();
  private debugMode: boolean;

  constructor(options?: { debug?: boolean }) {
    this.debugMode = options?.debug ?? false;
    // Raise the default listener limit — AI subsystems will add many subscribers
    this.emitter.setMaxListeners(50);
  }

  /**
   * Emit a typed game event to all subscribers.
   */
  emit(event: GameEvent): void {
    if (this.debugMode) {
      console.log(`📡 [EventBus] ${event.type}`, JSON.stringify(event, null, 2).slice(0, 200));
    }

    // Emit to type-specific listeners
    this.emitter.emit(event.type, event);

    // Emit to wildcard listeners (for logging, debugging, forwarding)
    this.emitter.emit('*', event);
  }

  /**
   * Subscribe to a specific event type with full type inference.
   * Returns an unsubscribe function.
   */
  on<T extends GameEventType>(
    type: T,
    handler: GameEventHandler<GameEventMap[T]>
  ): () => void {
    const listener = handler as unknown as (...args: unknown[]) => void;
    this.emitter.on(type, listener);
    return () => this.emitter.off(type, listener);
  }

  /**
   * Subscribe to a specific event type, firing only once.
   */
  once<T extends GameEventType>(
    type: T,
    handler: GameEventHandler<GameEventMap[T]>
  ): () => void {
    const listener = handler as unknown as (...args: unknown[]) => void;
    this.emitter.once(type, listener);
    return () => this.emitter.off(type, listener);
  }

  /**
   * Subscribe to ALL events (wildcard). Useful for logging, metrics, or WebSocket forwarding.
   * Returns an unsubscribe function.
   */
  onAny(handler: GameEventHandler<GameEvent>): () => void {
    this.emitter.on('*', handler);
    return () => this.emitter.off('*', handler);
  }

  /**
   * Remove a specific listener.
   */
  off<T extends GameEventType>(
    type: T,
    handler: GameEventHandler<GameEventMap[T]>
  ): void {
    this.emitter.off(type, handler as unknown as (...args: unknown[]) => void);
  }

  /**
   * Remove all listeners for a specific event type, or all listeners entirely.
   */
  removeAllListeners(type?: GameEventType): void {
    if (type) {
      this.emitter.removeAllListeners(type);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * Get count of listeners for a given event type.
   */
  listenerCount(type: GameEventType): number {
    return this.emitter.listenerCount(type);
  }
}
