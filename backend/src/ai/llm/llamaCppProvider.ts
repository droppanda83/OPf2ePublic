/**
 * Phase 4: llama.cpp Server LLM Provider
 *
 * Fully implemented provider for llama.cpp's built-in HTTP server.
 * Exposes an OpenAI-compatible /v1/chat/completions endpoint.
 *
 * Key advantage over Ollama: native GBNF grammar support for
 * physically constrained output (Principle #4). When a grammar
 * file is provided, llama.cpp makes it *impossible* to produce
 * tokens outside the grammar — no parsing/retry needed.
 *
 * Also supports:
 *   - Slot-based KV cache reuse (id_slot + cache_prompt)
 *   - Native streaming via SSE
 *   - GPU layer offloading control
 *
 * Zero external dependencies — uses Node's built-in fetch.
 */

import * as fs from 'fs';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from './types';

export interface LlamaCppProviderConfig {
  /** llama.cpp server URL (default: http://localhost:8080) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 120000 — llama.cpp can be slow on CPU) */
  defaultTimeoutMs?: number;
  /**
   * Slot ID for KV cache reuse. llama.cpp supports multiple slots;
   * each slot maintains its own KV cache for prompt prefix reuse.
   * Set to -1 for auto-assignment.
   */
  defaultSlotId?: number;
}

export class LlamaCppProvider implements LLMProvider {
  readonly name = 'llama.cpp';

  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly defaultSlotId: number;
  private _isAvailable = false;
  private _loadedModel = '';

  constructor(config: LlamaCppProviderConfig = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
    this.defaultTimeoutMs = config.defaultTimeoutMs || 120000;
    this.defaultSlotId = config.defaultSlotId ?? -1;
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  supportsModel(model: string): boolean {
    // llama.cpp serves a single model — accept any non-cloud model name
    // or match against the loaded model if known
    if (this._loadedModel && model === this._loadedModel) return true;
    // Same heuristic as Ollama: reject cloud model prefixes
    return !model.startsWith('gpt-') &&
           !model.startsWith('claude') &&
           !model.startsWith('gemini-') &&
           !model.startsWith('deepseek-') &&
           !model.startsWith('o1') &&
           !model.startsWith('o3') &&
           !model.startsWith('o4');
  }

  /** Probe llama.cpp server availability */
  async checkAvailability(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) {
        this._isAvailable = false;
        return false;
      }
      const data = await resp.json() as { status?: string; model?: string };
      this._isAvailable = data.status === 'ok' || resp.ok;

      // Try to get model info
      try {
        const modelResp = await fetch(`${this.baseUrl}/v1/models`, {
          signal: AbortSignal.timeout(3000),
        });
        if (modelResp.ok) {
          const modelData = await modelResp.json() as { data?: Array<{ id: string }> };
          this._loadedModel = modelData.data?.[0]?.id || '';
        }
      } catch { /* model info is non-critical */ }

      if (this._isAvailable) {
        console.log(`🦙 llama.cpp available${this._loadedModel ? ` — model: ${this._loadedModel}` : ''}`);
      }
      return this._isAvailable;
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const start = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    const body = this.buildRequestBody(request, model, false);
    const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error');
      throw new Error(`llama.cpp request failed (${resp.status}): ${errText}`);
    }

    const data = await resp.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    const usage: TokenUsage | undefined = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined;

    return {
      content,
      model: data.model || model,
      provider: 'llama.cpp',
      usage,
      cached: !!data.timings?.prompt_ms && data.timings.prompt_ms < 10, // near-instant prompt = cached
      latencyMs: Date.now() - start,
      fallbackDepth: 0,
    };
  }

  async *completeStream(request: LLMRequest, model: string): AsyncIterable<LLMStreamChunk> {
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const body = this.buildRequestBody(request, model, true);

    const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error');
      throw new Error(`llama.cpp stream failed (${resp.status}): ${errText}`);
    }

    if (!resp.body) {
      throw new Error('llama.cpp returned no response body for stream');
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
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            yield { delta: '', done: true, model, provider: 'llama.cpp' };
            return;
          }

          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content || '';
          const finishReason = chunk.choices?.[0]?.finish_reason;
          const usage: TokenUsage | undefined = chunk.usage
            ? {
                promptTokens: chunk.usage.prompt_tokens || 0,
                completionTokens: chunk.usage.completion_tokens || 0,
                totalTokens: chunk.usage.total_tokens || 0,
              }
            : undefined;

          if (delta || finishReason === 'stop') {
            yield {
              delta,
              done: finishReason === 'stop',
              usage: finishReason === 'stop' ? usage : undefined,
              model,
              provider: 'llama.cpp',
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ─── Request body construction ────────────────────────────

  private buildRequestBody(
    request: LLMRequest,
    model: string,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 1024,
      stream,
    };

    // JSON mode
    if (request.jsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    // GBNF grammar — the killer feature of llama.cpp for constrained output
    if (request.grammarPath) {
      try {
        const grammar = fs.readFileSync(request.grammarPath, 'utf-8');
        body.grammar = grammar;
      } catch (err) {
        console.warn(`⚠️ Failed to load GBNF grammar from ${request.grammarPath}:`, err);
      }
    }

    // KV cache slot reuse — slot_id tells llama.cpp which KV cache slot to use,
    // and cache_prompt enables prompt prefix caching (Principle #5)
    if (request.kvCacheHint) {
      body.id_slot = this.defaultSlotId;
      body.cache_prompt = true;
    }

    // Stream options: include usage in stream chunks
    if (stream) {
      body.stream_options = { include_usage: true };
    }

    return body;
  }
}
