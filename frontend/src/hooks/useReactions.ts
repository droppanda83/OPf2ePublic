/**
 * C.1 — useReactions hook
 * Manages the reaction prompt queue (reactive-strike, shield-block, ready-action).
 * Pops the next reaction from the queue when the current one is resolved.
 */
import { useState, useEffect, useCallback } from 'react';
import { devLog } from '../utils/devLog'; // eslint-disable-line

export type ReactionPromptType = 'reactive-strike' | 'shield-block' | 'ready-action';

export interface ReactionPrompt {
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

interface UseReactionsReturn {
  activeReaction: ReactionPrompt | null;
  enqueueReactions: (prompts: ReactionPrompt[]) => void;
  handleReactionDecision: (accept: boolean) => Promise<void>;
  clearReactions: () => void;
}

interface UseReactionsOptions {
  executeAction: (action: { id: string; name: string; cost: number; requiresTarget: boolean }, target?: string | null, overrideCreatureId?: string) => Promise<void>;
}

export function useReactions(options: UseReactionsOptions): UseReactionsReturn {
  const { executeAction } = options;

  const [reactionQueue, setReactionQueue] = useState<ReactionPrompt[]>([]);
  const [activeReaction, setActiveReaction] = useState<ReactionPrompt | null>(null);

  // Pop next reaction from queue when active one is cleared
  useEffect(() => {
    if (!activeReaction && reactionQueue.length > 0) {
      setActiveReaction(reactionQueue[0]);
      setReactionQueue(prev => prev.slice(1));
    }
  }, [activeReaction, reactionQueue]);

  const enqueueReactions = useCallback((prompts: ReactionPrompt[]) => {
    if (prompts.length === 0) return;
    devLog('⚡ Enqueuing reactions:', prompts.map(p => `${p.type} (${p.reactorName})`));
    setReactionQueue(prev => [...prev, ...prompts]);
  }, []);

  const handleReactionDecision = useCallback(async (accept: boolean) => {
    if (!activeReaction) return;
    const reaction = activeReaction;
    setActiveReaction(null);

    if (reaction.type === 'reactive-strike') {
      if (accept && reaction.reactorId) {
        await executeAction(
          { id: 'reactive-strike', name: 'Reactive Strike', cost: 0, requiresTarget: true },
          reaction.targetId,
          reaction.reactorId
        );
      }
      return;
    }

    if (reaction.type === 'ready-action') {
      if (accept && reaction.reactorId) {
        await executeAction(
          { id: 'execute-ready', name: 'Execute Ready', cost: 0, requiresTarget: false },
          null,
          reaction.reactorId
        );
      }
      return;
    }

    if (reaction.type === 'shield-block') {
      if (accept) {
        await executeAction(
          { id: 'shield-block', name: 'Shield Block', cost: 0, requiresTarget: false },
          null,
          reaction.targetId
        );
      } else {
        await executeAction(
          { id: 'resolve-pending-damage', name: 'Resolve Damage', cost: 0, requiresTarget: false },
          null,
          reaction.targetId
        );
      }
    }
  }, [activeReaction, executeAction]);

  const clearReactions = useCallback(() => {
    setReactionQueue([]);
    setActiveReaction(null);
  }, []);

  return { activeReaction, enqueueReactions, handleReactionDecision, clearReactions };
}
