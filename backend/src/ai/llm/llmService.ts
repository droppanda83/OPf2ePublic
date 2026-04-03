/**
 * Phase 4: LLM Service — Provider-Agnostic Orchestrator
 *
 * The single entry point for ALL AI interactions in the system.
 * No AI subsystem (Narrator, Tactician, Story, etc.) should ever call
 * a provider directly — everything goes through LLMService.
 *
 * Responsibilities:
 *   1. Role → Model routing (different roles can use different models)
 *   2. Fallback chains (primary → secondary → ... → template fallback)
 *   3. Provider resolution (model name → correct provider)
 *   4. Timeout enforcement
 *   5. Cost/usage tracking per role
 *   6. Streaming support
 *   7. Logging and diagnostics
 *
 * Principle adherence:
 *   #3  Provider-Agnostic — single interface, any backend
 *   #4  Constrained Output — passes schema/grammar to providers
 *   #5  KV Cache-Aware — forwards cache hints to local providers
 *   #6  Role Specialization — per-role model selection
 *   #8  Graceful Degradation — fallback chains, never blocks gameplay
 */

import type {
  AIRole,
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMRoleConfig,
  LLMServiceConfig,
  TokenUsage,
} from './types';

// ─── Per-Role Usage Tracking ────────────────────────────────

interface RoleUsageStats {
  requestCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalLatencyMs: number;
  errors: number;
  fallbacks: number;
}

// ─── LLM Service ────────────────────────────────────────────

export class LLMService {
  private readonly providers: LLMProvider[] = [];
  private readonly config: LLMServiceConfig;
  private readonly usageByRole: Map<AIRole, RoleUsageStats> = new Map();

  constructor(config: LLMServiceConfig) {
    this.config = config;
  }

  // ─── Provider Management ──────────────────────────────────

  /** Register a provider (order doesn't matter — model names determine routing) */
  registerProvider(provider: LLMProvider): void {
    this.providers.push(provider);
    console.log(`🔌 LLMService: registered provider "${provider.name}" (available: ${provider.isAvailable})`);
  }

  /** Get all registered providers */
  getProviders(): readonly LLMProvider[] {
    return this.providers;
  }

  /** Check if any provider is available */
  get hasAnyProvider(): boolean {
    return this.providers.some(p => p.isAvailable);
  }

  // ─── Core API ─────────────────────────────────────────────

  /**
   * Complete a request using the configured model for the given role.
   * Automatically handles fallback chains if the primary model fails.
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const roleConfig = this.resolveRoleConfig(request.role);
    const modelChain = this.buildModelChain(roleConfig);

    if (modelChain.length === 0) {
      throw new Error(`No models configured for role "${request.role}"`);
    }

    const mergedRequest = this.mergeDefaults(request, roleConfig);
    let lastError: Error | null = null;

    for (let i = 0; i < modelChain.length; i++) {
      const model = modelChain[i];
      const provider = this.resolveProvider(model);

      if (!provider) {
        if (this.config.debug) {
          console.log(`⏭️ LLMService: no provider for model "${model}", skipping`);
        }
        continue;
      }

      try {
        if (this.config.debug) {
          console.log(`🤖 LLMService: ${request.role} → ${model} (${provider.name})${i > 0 ? ` [fallback #${i}]` : ''}`);
        }

        const start = Date.now();
        const response = await this.executeWithTimeout(
          () => provider.complete(mergedRequest, model),
          mergedRequest.timeoutMs || roleConfig.timeoutMs || 30000,
        );

        response.fallbackDepth = i;
        response.latencyMs = Date.now() - start;
        this.trackUsage(request.role, response, i > 0);

        if (this.config.debug) {
          console.log(`✅ LLMService: ${request.role} completed in ${response.latencyMs}ms (${response.usage?.totalTokens || '?'} tokens)`);
        }

        return response;

      } catch (err: any) {
        lastError = err;
        this.trackError(request.role);

        if (this.config.debug || i === modelChain.length - 1) {
          console.warn(`⚠️ LLMService: ${model} (${provider.name}) failed: ${err.message}`);
        }
      }
    }

    // All models in the chain failed
    throw new Error(
      `All models failed for role "${request.role}". Last error: ${lastError?.message || 'unknown'}`,
    );
  }

  /**
   * Stream a response token-by-token. Falls back through the model chain
   * on failure (restarts from the beginning of the response on fallback).
   */
  async *completeStream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const roleConfig = this.resolveRoleConfig(request.role);
    const modelChain = this.buildModelChain(roleConfig);

    if (modelChain.length === 0) {
      throw new Error(`No models configured for role "${request.role}"`);
    }

    const mergedRequest = { ...this.mergeDefaults(request, roleConfig), stream: true };
    let lastError: Error | null = null;

    for (let i = 0; i < modelChain.length; i++) {
      const model = modelChain[i];
      const provider = this.resolveProvider(model);

      if (!provider) continue;

      try {
        if (this.config.debug) {
          console.log(`🤖 LLMService stream: ${request.role} → ${model} (${provider.name})${i > 0 ? ` [fallback #${i}]` : ''}`);
        }

        const start = Date.now();
        let totalTokens: TokenUsage | undefined;

        for await (const chunk of provider.completeStream(mergedRequest, model)) {
          if (chunk.done && chunk.usage) {
            totalTokens = chunk.usage;
          }
          yield chunk;
        }

        // Track usage from the final chunk
        if (totalTokens) {
          this.trackUsage(request.role, {
            content: '',
            model,
            provider: provider.name,
            usage: totalTokens,
            latencyMs: Date.now() - start,
            fallbackDepth: i,
          }, i > 0);
        }

        return; // stream completed successfully
      } catch (err: any) {
        lastError = err;
        this.trackError(request.role);

        if (this.config.debug) {
          console.warn(`⚠️ LLMService stream: ${model} (${provider.name}) failed: ${err.message}`);
        }
        // Try next model in chain
      }
    }

    throw new Error(
      `All models failed for streaming role "${request.role}". Last error: ${lastError?.message || 'unknown'}`,
    );
  }

  /**
   * Convenience: complete and collect the stream into a single response string.
   * Useful when you want fallback behavior of streaming but don't need
   * token-by-token output.
   */
  async completeCollectStream(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    let content = '';
    let finalUsage: TokenUsage | undefined;
    let finalModel = '';
    let finalProvider = '';

    for await (const chunk of this.completeStream(request)) {
      content += chunk.delta;
      if (chunk.done) {
        finalUsage = chunk.usage;
        finalModel = chunk.model || '';
        finalProvider = chunk.provider || '';
      }
    }

    return {
      content,
      model: finalModel,
      provider: finalProvider,
      usage: finalUsage,
      latencyMs: Date.now() - start,
      fallbackDepth: 0,
    };
  }

  // ─── Usage & Diagnostics ──────────────────────────────────

  /** Get usage statistics for a specific role */
  getRoleUsage(role: AIRole): Readonly<RoleUsageStats> | undefined {
    return this.usageByRole.get(role);
  }

  /** Get usage statistics for all roles */
  getAllUsage(): ReadonlyMap<AIRole, Readonly<RoleUsageStats>> {
    return this.usageByRole;
  }

  /** Reset all usage tracking */
  resetUsage(): void {
    this.usageByRole.clear();
  }

  /** Get a diagnostic summary of the service state */
  getDiagnostics(): {
    providers: Array<{ name: string; available: boolean }>;
    roles: Record<string, { model: string; fallbacks: string[] }>;
    usage: Record<string, RoleUsageStats>;
  } {
    const roles: Record<string, { model: string; fallbacks: string[] }> = {};
    const allRoles: AIRole[] = ['narrator', 'tactician', 'story', 'exploration', 'downtime', 'encounter', 'general'];
    for (const role of allRoles) {
      const rc = this.resolveRoleConfig(role);
      roles[role] = {
        model: rc.model,
        fallbacks: rc.fallbackModels || [],
      };
    }

    const usage: Record<string, RoleUsageStats> = {};
    for (const [role, stats] of this.usageByRole) {
      usage[role] = { ...stats };
    }

    return {
      providers: this.providers.map(p => ({ name: p.name, available: p.isAvailable })),
      roles,
      usage,
    };
  }

  // ─── Internal ─────────────────────────────────────────────

  /** Resolve the config for a given role, falling back to defaultRole */
  private resolveRoleConfig(role: AIRole): LLMRoleConfig {
    return this.config.roles[role] || this.config.defaultRole;
  }

  /**
   * Build the ordered model chain: primary → role fallbacks → global fallbacks.
   * Deduplicates while preserving order.
   */
  private buildModelChain(roleConfig: LLMRoleConfig): string[] {
    const seen = new Set<string>();
    const chain: string[] = [];

    const add = (model: string) => {
      if (!seen.has(model)) {
        seen.add(model);
        chain.push(model);
      }
    };

    add(roleConfig.model);
    if (roleConfig.fallbackModels) {
      roleConfig.fallbackModels.forEach(add);
    }
    if (this.config.globalFallbackModels) {
      this.config.globalFallbackModels.forEach(add);
    }

    return chain;
  }

  /** Find the first registered provider that supports the given model */
  private resolveProvider(model: string): LLMProvider | null {
    for (const provider of this.providers) {
      if (provider.isAvailable && provider.supportsModel(model)) {
        return provider;
      }
    }
    return null;
  }

  /** Merge request-level overrides with role config defaults */
  private mergeDefaults(request: LLMRequest, roleConfig: LLMRoleConfig): LLMRequest {
    return {
      ...request,
      temperature: request.temperature ?? roleConfig.temperature,
      maxTokens: request.maxTokens ?? roleConfig.maxTokens,
      timeoutMs: request.timeoutMs ?? roleConfig.timeoutMs,
    };
  }

  /** Execute a promise with a timeout */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`LLM request timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /** Track usage for a completed request */
  private trackUsage(role: AIRole, response: LLMResponse, wasFallback: boolean): void {
    const stats = this.getOrCreateStats(role);
    stats.requestCount++;
    stats.totalLatencyMs += response.latencyMs;
    if (response.usage) {
      stats.totalPromptTokens += response.usage.promptTokens;
      stats.totalCompletionTokens += response.usage.completionTokens;
    }
    if (wasFallback) {
      stats.fallbacks++;
    }
  }

  /** Track an error for a role */
  private trackError(role: AIRole): void {
    this.getOrCreateStats(role).errors++;
  }

  private getOrCreateStats(role: AIRole): RoleUsageStats {
    let stats = this.usageByRole.get(role);
    if (!stats) {
      stats = {
        requestCount: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalLatencyMs: 0,
        errors: 0,
        fallbacks: 0,
      };
      this.usageByRole.set(role, stats);
    }
    return stats;
  }
}
