/**
 * Phase 4: Cloud LLM Provider
 *
 * Wraps the existing AIProviders class (OpenAI, Anthropic, Google, DeepSeek)
 * behind the LLMProvider interface. This is a thin adapter — all the real
 * rate limiting, retry logic, and provider routing lives in AIProviders.
 *
 * Streaming is implemented natively per-provider for token-by-token output.
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProviders, detectProvider, type ProviderName } from '../providers';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
} from './types';

export class CloudLLMProvider implements LLMProvider {
  readonly name = 'cloud';

  constructor(private readonly providers: AIProviders) {}

  get isAvailable(): boolean {
    return this.providers.hasAny;
  }

  supportsModel(model: string): boolean {
    const provider = detectProvider(model);
    return this.providers.hasProvider(provider);
  }

  async complete(request: LLMRequest, model: string): Promise<LLMResponse> {
    const start = Date.now();
    const result = await this.providers.chatComplete({
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    });
    return {
      content: result.content,
      model: result.model,
      provider: `cloud:${result.provider}`,
      usage: result.usage,
      cached: false,
      latencyMs: Date.now() - start,
      fallbackDepth: 0, // set by LLMService, not provider
    };
  }

  async *completeStream(request: LLMRequest, model: string): AsyncIterable<LLMStreamChunk> {
    const provider = detectProvider(model);
    switch (provider) {
      case 'anthropic':
        yield* this.streamAnthropic(request, model);
        break;
      case 'google':
        yield* this.streamOpenAICompat(request, model, 'google');
        break;
      case 'deepseek':
        yield* this.streamOpenAICompat(request, model, 'deepseek');
        break;
      default:
        yield* this.streamOpenAICompat(request, model, 'openai');
        break;
    }
  }

  // ─── OpenAI-compatible streaming (OpenAI, Google, DeepSeek) ──

  private async *streamOpenAICompat(
    request: LLMRequest,
    model: string,
    provider: ProviderName,
  ): AsyncIterable<LLMStreamChunk> {
    // Access the underlying OpenAI client via the provider's internal clients
    // We use the providers.chatComplete for non-streaming, but for streaming
    // we need the raw client. Access it through a streaming-specific method.
    const client = this.getOpenAIClient(provider);
    if (!client) {
      // Fallback: do a non-streaming call and yield as single chunk
      const response = await this.complete(request, model);
      yield { delta: response.content, done: true, usage: response.usage, model, provider: `cloud:${provider}` };
      return;
    }

    const controller = new AbortController();
    const timeout = request.timeoutMs
      ? setTimeout(() => controller.abort(), request.timeoutMs)
      : setTimeout(() => controller.abort(), 30000);

    try {
      const stream = await client.chat.completions.create(
        {
          model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
        },
        { signal: controller.signal as any },
      );

      let usage: TokenUsage | undefined;
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        const finishReason = chunk.choices?.[0]?.finish_reason;
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
        }
        if (delta || finishReason === 'stop') {
          yield {
            delta,
            done: finishReason === 'stop',
            usage: finishReason === 'stop' ? usage : undefined,
            model,
            provider: `cloud:${provider}`,
          };
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Anthropic streaming ────────────────────────────────────

  private async *streamAnthropic(
    request: LLMRequest,
    model: string,
  ): AsyncIterable<LLMStreamChunk> {
    const client = this.getAnthropicClient();
    if (!client) {
      const response = await this.complete(request, model);
      yield { delta: response.content, done: true, usage: response.usage, model, provider: 'cloud:anthropic' };
      return;
    }

    // Separate system from conversation messages
    const systemMessages = request.messages.filter(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    // Merge consecutive same-role messages (Anthropic requirement)
    const mergedMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of conversationMessages) {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      if (mergedMessages.length > 0 && mergedMessages[mergedMessages.length - 1].role === role) {
        mergedMessages[mergedMessages.length - 1].content += '\n\n' + msg.content;
      } else {
        mergedMessages.push({ role, content: msg.content });
      }
    }
    if (mergedMessages.length === 0 || mergedMessages[0].role !== 'user') {
      mergedMessages.unshift({ role: 'user', content: '(begin)' });
    }

    const stream = client.messages.stream({
      model,
      max_tokens: request.maxTokens || 1500,
      system: systemMessages.map(m => m.content).join('\n\n') || undefined,
      messages: mergedMessages,
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    });

    let usage: TokenUsage | undefined;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { delta: event.delta.text, done: false, model, provider: 'cloud:anthropic' };
      }
      if (event.type === 'message_delta') {
        usage = {
          promptTokens: 0, // Anthropic reports usage on message_start, not delta
          completionTokens: (event as any).usage?.output_tokens || 0,
          totalTokens: 0,
        };
      }
      if (event.type === 'message_stop') {
        yield { delta: '', done: true, usage, model, provider: 'cloud:anthropic' };
      }
    }
  }

  // ─── Internal client accessors ──────────────────────────────
  // These use type assertions to access private fields on AIProviders.
  // Not ideal, but avoids modifying the existing AIProviders class.

  private getOpenAIClient(provider: ProviderName): OpenAI | null {
    const p = this.providers as any;
    switch (provider) {
      case 'openai': return p.openai || null;
      case 'google': return p.gemini || null;
      case 'deepseek': return p.deepseek || null;
      default: return null;
    }
  }

  private getAnthropicClient(): Anthropic | null {
    return (this.providers as any).anthropic || null;
  }
}
