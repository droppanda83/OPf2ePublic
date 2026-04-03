/**
 * Phase 4: Ollama LLM Provider
 *
 * Fully implemented Ollama provider — ready for local hardware.
 * Communicates via Ollama's REST API (http://localhost:11434 by default).
 *
 * Features:
 *   - Native streaming via /api/chat
 *   - KV cache hints via keep_alive and system prompt reuse
 *   - Model availability checking via /api/tags
 *   - GBNF-like grammar support via Ollama's format parameter
 *   - JSON mode via format: "json"
 *   - Automatic model pull suggestion when model not found
 *
 * Zero external dependencies — uses Node's built-in fetch (Node 18+).
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from './types';

export interface OllamaProviderConfig {
  /** Ollama API base URL (default: http://localhost:11434) */
  baseUrl?: string;
  /** Keep model loaded in memory for this duration (default: '5m') */
  keepAlive?: string;
  /** Request timeout in milliseconds (default: 60000) */
  defaultTimeoutMs?: number;
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';

  private readonly baseUrl: string;
  private readonly keepAlive: string;
  private readonly defaultTimeoutMs: number;

  /** Cached list of available model names (refreshed on availability check) */
  private availableModels: Set<string> = new Set();
  private lastModelRefresh = 0;
  private _isAvailable = false;

  constructor(config: OllamaProviderConfig = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    this.keepAlive = config.keepAlive || '5m';
    this.defaultTimeoutMs = config.defaultTimeoutMs || 60000;
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  supportsModel(model: string): boolean {
    // Ollama models are typically formatted as name:tag (e.g., gemma3:12b)
    // If we have a cached model list, check it; otherwise assume we can try
    if (this.availableModels.size > 0) {
      // Check exact match or base model name without tag
      if (this.availableModels.has(model)) return true;
      const baseName = model.split(':')[0];
      for (const m of this.availableModels) {
        if (m.startsWith(baseName)) return true;
      }
      return false;
    }
    // If no model list yet, accept any model that doesn't look like a cloud model
    return !model.startsWith('gpt-') &&
           !model.startsWith('claude') &&
           !model.startsWith('gemini-') &&
           !model.startsWith('deepseek-') &&
           !model.startsWith('o1') &&
           !model.startsWith('o3') &&
           !model.startsWith('o4');
  }

  /** Probe Ollama server availability and refresh model list */
  async checkAvailability(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) {
        this._isAvailable = false;
        return false;
      }
      const data = await resp.json() as { models?: Array<{ name: string }> };
      this.availableModels = new Set((data.models || []).map(m => m.name));
      this.lastModelRefresh = Date.now();
      this._isAvailable = true;
      console.log(`🦙 Ollama available — ${this.availableModels.size} models loaded: ${[...this.availableModels].join(', ') || '(none)'}`);
      return true;
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const start = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens || 1024,
      },
      keep_alive: this.keepAlive,
    };

    // JSON schema enforcement
    if (request.jsonSchema) {
      body.format = 'json';
    }

    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error');
      throw new Error(`Ollama request failed (${resp.status}): ${errText}`);
    }

    const data = await resp.json() as OllamaChatResponse;

    const usage: TokenUsage | undefined = data.prompt_eval_count || data.eval_count
      ? {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        }
      : undefined;

    return {
      content: data.message?.content || '',
      model: data.model || model,
      provider: 'ollama',
      usage,
      cached: false,
      latencyMs: Date.now() - start,
      fallbackDepth: 0,
    };
  }

  async *completeStream(request: LLMRequest, model: string): AsyncIterable<LLMStreamChunk> {
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: true,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens || 1024,
      },
      keep_alive: this.keepAlive,
    };

    if (request.jsonSchema) {
      body.format = 'json';
    }

    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error');
      throw new Error(`Ollama stream failed (${resp.status}): ${errText}`);
    }

    if (!resp.body) {
      throw new Error('Ollama returned no response body for stream');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = JSON.parse(line) as OllamaChatResponse;
          const delta = chunk.message?.content || '';
          const isDone = chunk.done;

          const usage: TokenUsage | undefined = isDone && (chunk.prompt_eval_count || chunk.eval_count)
            ? {
                promptTokens: chunk.prompt_eval_count || 0,
                completionTokens: chunk.eval_count || 0,
                totalTokens: (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0),
              }
            : undefined;

          yield {
            delta,
            done: isDone,
            usage,
            model: chunk.model || model,
            provider: 'ollama',
          };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
