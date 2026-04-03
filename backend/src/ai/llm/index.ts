/**
 * Phase 4: LLM Service — Barrel Export
 */
export type {
  AIRole,
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProvider,
  LLMRoleConfig,
  LLMServiceConfig,
  TokenUsage,
} from './types';

export { LLMService } from './llmService';
export { CloudLLMProvider } from './cloudProvider';
export { OllamaProvider } from './ollamaProvider';
export type { OllamaProviderConfig } from './ollamaProvider';
export { LlamaCppProvider } from './llamaCppProvider';
export type { LlamaCppProviderConfig } from './llamaCppProvider';
