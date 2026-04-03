/**
 * Phase 4: LLM Service — Types & Interfaces
 *
 * Provider-agnostic type system for all LLM interactions. Every AI subsystem
 * (Narrator, Tactician, Story, Exploration, Downtime, Encounter) calls
 * LLMService through these types — never a provider directly.
 *
 * Principle adherence:
 *   #3  Provider-Agnostic — single interface for cloud + local
 *   #4  Constrained Output — JSON schema + GBNF grammar support
 *   #5  KV Cache-Aware — static prefix hints for local models
 *   #6  Role Specialization — per-role model/provider configuration
 */

// ─── AI Roles ───────────────────────────────────────────────

/**
 * Specialized AI roles. Each can be independently configured with
 * different models, providers, temperatures, and token budgets.
 */
export type AIRole =
  | 'narrator'     // Combat/exploration narration (fast, creative)
  | 'tactician'    // NPC combat decisions (structured, fast)
  | 'story'        // Plot, dialogue, consequences (smart, can be slower)
  | 'exploration'  // Scene descriptions, investigation (descriptive)
  | 'downtime'     // Crafting, shopping, NPC interactions
  | 'encounter'    // Encounter/creature design (thorough, offline)
  | 'general';     // Fallback for unspecified roles

// ─── Messages ───────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── Request ────────────────────────────────────────────────

export interface LLMRequest {
  /** Which AI role is making this request (determines model/provider routing) */
  role: AIRole;
  /** Messages to send. System messages should be FIRST for KV cache efficiency. */
  messages: LLMMessage[];
  /** Override temperature for this request (otherwise uses role config) */
  temperature?: number;
  /** Override max tokens for this request (otherwise uses role config) */
  maxTokens?: number;
  /** JSON schema for structured output enforcement (cloud: function calling, local: GBNF) */
  jsonSchema?: Record<string, unknown>;
  /** GBNF grammar file path for local model output constraints */
  grammarPath?: string;
  /**
   * KV cache hint: if the system prompt is static across calls, set a stable ID here.
   * Local providers (Ollama, llama.cpp) use this to skip re-processing the prefix.
   */
  kvCacheHint?: {
    /** Stable identifier for the static prefix (e.g., 'narrator-system-v1') */
    staticPrefixId: string;
    /**
     * Number of messages from the start that are static (won't change between calls).
     * The provider can cache up to this point.
     */
    staticMessageCount: number;
  };
  /** Request-level timeout override in milliseconds */
  timeoutMs?: number;
  /** If true, request streaming response (token-by-token) */
  stream?: boolean;
}

// ─── Response ───────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  /** Complete response content */
  content: string;
  /** Model that generated the response */
  model: string;
  /** Provider that served the request */
  provider: string;
  /** Token usage (if reported by provider) */
  usage?: TokenUsage;
  /** Whether the response was served from KV cache (local models) */
  cached?: boolean;
  /** End-to-end latency in milliseconds */
  latencyMs: number;
  /** Which attempt in the fallback chain succeeded (0 = primary) */
  fallbackDepth: number;
}

// ─── Streaming ──────────────────────────────────────────────

export interface LLMStreamChunk {
  /** Incremental text delta */
  delta: string;
  /** True when the stream is complete */
  done: boolean;
  /** Token usage — only populated on the final chunk */
  usage?: TokenUsage;
  /** Model that generated this chunk */
  model?: string;
  /** Provider name */
  provider?: string;
}

// ─── Provider Interface ─────────────────────────────────────

/**
 * Interface every LLM provider must implement. Cloud and local providers
 * share this contract so the LLMService can route interchangeably.
 */
export interface LLMProvider {
  /** Human-readable provider name (e.g., 'openai', 'ollama', 'llama.cpp') */
  readonly name: string;

  /** True if the provider is configured and reachable */
  readonly isAvailable: boolean;

  /**
   * Check if this provider can serve a specific model.
   * Cloud providers check by model name prefix; local providers check loaded models.
   */
  supportsModel(model: string): boolean;

  /** Non-streaming completion */
  complete(request: LLMRequest, model: string): Promise<LLMResponse>;

  /**
   * Streaming completion — returns an async iterable of chunks.
   * Providers that don't support streaming should yield a single chunk with the full response.
   */
  completeStream(request: LLMRequest, model: string): AsyncIterable<LLMStreamChunk>;
}

// ─── Role Configuration ─────────────────────────────────────

/**
 * Per-role LLM configuration. Allows different AI roles to use different
 * models, providers, and parameters. This is how multi-model routing works:
 * the Narrator might use a fast 4B model while StoryAI uses a 27B model.
 */
export interface LLMRoleConfig {
  /** Primary model to use (e.g., 'gpt-4o', 'claude-sonnet-4-20250514', 'gemma3:12b') */
  model: string;
  /** Temperature (0.0–2.0). Lower = more deterministic, higher = more creative */
  temperature?: number;
  /** Maximum output tokens */
  maxTokens?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /**
   * Fallback model chain. If the primary model fails, try these in order.
   * Example: ['gpt-4o-mini', 'deepseek-chat'] — if primary fails, try 4o-mini, then deepseek.
   */
  fallbackModels?: string[];
}

/**
 * Complete LLM service configuration. Maps each AI role to its model config,
 * plus global settings.
 */
export interface LLMServiceConfig {
  /** Per-role model configuration */
  roles: Partial<Record<AIRole, LLMRoleConfig>>;
  /** Default config used when a role has no specific config */
  defaultRole: LLMRoleConfig;
  /**
   * Global fallback models appended to every role's fallback chain.
   * Example: ['deepseek-chat'] — always try DeepSeek as last resort before template fallback.
   */
  globalFallbackModels?: string[];
  /** Enable detailed logging of LLM requests/responses */
  debug?: boolean;
}
