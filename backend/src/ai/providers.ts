/**
 * Multi-provider AI abstraction.
 * Routes chat completion requests to the correct provider (OpenAI, Anthropic, Google)
 * based on the model name prefix.
 *
 * Model routing:
 *   gpt-*, o1*, o3*, o4*          → OpenAI
 *   claude-*                       → Anthropic
 *   gemini-*                       → Google (via OpenAI-compatible endpoint)
 *   deepseek-*                     → DeepSeek (OpenAI-compatible endpoint)
 */
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// ─── Types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Provider Detection ─────────────────────────────────────────

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'deepseek';

export function detectProvider(model: string): ProviderName {
  const m = model.toLowerCase();
  if (m.startsWith('claude')) return 'anthropic';
  if (m.startsWith('gemini')) return 'google';
  if (m.startsWith('deepseek')) return 'deepseek';
  return 'openai'; // gpt-*, o1*, o3*, o4*, etc.
}

// ─── Multi-Provider Client ─────────────────────────────────────

export class AIProviders {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private gemini: OpenAI | null = null; // Google Gemini via OpenAI-compat endpoint
  private deepseek: OpenAI | null = null; // DeepSeek via OpenAI-compat endpoint

  // Cumulative token usage tracking
  private _tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requestCount: 0,
  };

  // ─── Rate Limiter ───────────────────────────────────────────
  // Ensures requests are spaced out to avoid 429 rate limit errors.
  // Uses a serial queue: each request waits for the previous one to finish
  // plus a minimum gap between requests.
  private _requestQueue: Promise<any> = Promise.resolve();
  private _lastRequestTime = 0;
  private _minRequestGapMs = 2000; // minimum 2s between requests
  private _rateLimitBackoffUntil = 0; // timestamp: don't send until this time

  /** Get cumulative token usage across all providers */
  get tokenUsage() {
    return { ...this._tokenUsage };
  }

  /** Reset cumulative token counters */
  resetTokenUsage() {
    this._tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 };
  }

  private trackUsage(usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) {
    if (usage) {
      this._tokenUsage.promptTokens += usage.promptTokens;
      this._tokenUsage.completionTokens += usage.completionTokens;
      this._tokenUsage.totalTokens += usage.totalTokens;
      this._tokenUsage.requestCount++;
    }
  }

  constructor(opts: {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    googleApiKey?: string;
    deepseekApiKey?: string;
  }) {
    if (opts.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: opts.openaiApiKey });
    }
    if (opts.anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: opts.anthropicApiKey });
    }
    if (opts.googleApiKey) {
      // Google Gemini exposes an OpenAI-compatible chat completions endpoint
      this.gemini = new OpenAI({
        apiKey: opts.googleApiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
    }
    if (opts.deepseekApiKey) {
      // DeepSeek exposes an OpenAI-compatible chat completions endpoint
      this.deepseek = new OpenAI({
        apiKey: opts.deepseekApiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
    }
  }

  /** True if at least one provider is configured */
  get hasAny(): boolean {
    return !!(this.openai || this.anthropic || this.gemini || this.deepseek);
  }

  /** True if a specific provider is configured */
  hasProvider(provider: ProviderName): boolean {
    switch (provider) {
      case 'openai': return !!this.openai;
      case 'anthropic': return !!this.anthropic;
      case 'google': return !!this.gemini;
      case 'deepseek': return !!this.deepseek;
    }
  }

  // ─── Chat Completion ────────────────────────────────────────

  /**
   * Queue a chat completion request. Requests are serialized with a minimum
   * gap between them to avoid hitting provider rate limits (especially Gemini
   * free-tier at ~15 RPM). Failed requests due to 429/503 are retried with
   * exponential backoff up to 3 times.
   */
  async chatComplete(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
    // Chain onto the queue so requests are serial
    const resultPromise = this._requestQueue.then(async () => {
      // Wait for rate-limit backoff if active
      const now = Date.now();
      if (this._rateLimitBackoffUntil > now) {
        const waitMs = this._rateLimitBackoffUntil - now;
        console.log(`⏳ Rate limit backoff: waiting ${waitMs}ms before next request`);
        await this.sleep(waitMs);
      }

      // Enforce minimum gap between requests
      const elapsed = Date.now() - this._lastRequestTime;
      if (elapsed < this._minRequestGapMs) {
        const waitMs = this._minRequestGapMs - elapsed;
        await this.sleep(waitMs);
      }

      // Execute with retry
      const result = await this.executeWithRetry(opts, 3);
      this._lastRequestTime = Date.now();
      this.trackUsage(result.usage);
      return result;
    });

    // Keep the queue chain going even if this request fails
    this._requestQueue = resultPromise.catch(() => {});
    return resultPromise;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a completion with retry on rate-limit (429) or server errors (503).
   * Uses exponential backoff: 3s, 6s, 12s.
   */
  private async executeWithRetry(opts: ChatCompletionOptions, maxRetries: number): Promise<ChatCompletionResult> {
    const provider = detectProvider(opts.model);
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let result: ChatCompletionResult;
        switch (provider) {
          case 'anthropic':
            result = await this.completeAnthropic(opts);
            break;
          case 'google':
            result = await this.completeGoogle(opts);
            break;
          case 'deepseek':
            result = await this.completeDeepSeek(opts);
            break;
          default:
            result = await this.completeOpenAI(opts);
            break;
        }
        return result;
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.response?.status || error?.statusCode;
        const isRateLimit = status === 429;
        const isServerError = status === 503 || status === 500;
        const isRetryable = isRateLimit || isServerError;

        if (isRateLimit) {
          // Set a backoff window so other queued requests also wait
          const backoffMs = Math.min(3000 * Math.pow(2, attempt), 30000);
          this._rateLimitBackoffUntil = Date.now() + backoffMs;
          console.warn(`⚠️ Rate limited (429) on attempt ${attempt + 1}/${maxRetries + 1}. Backing off ${backoffMs}ms. Provider: ${provider}`);
        } else if (isServerError) {
          console.warn(`⚠️ Server error (${status}) on attempt ${attempt + 1}/${maxRetries + 1}. Provider: ${provider}`);
        }

        if (!isRetryable || attempt >= maxRetries) {
          console.error(`❌ AI request failed after ${attempt + 1} attempt(s). Provider: ${provider}, Status: ${status}, Error: ${error?.message || error}`);
          throw error;
        }

        // Exponential backoff before retry
        const backoffMs = 3000 * Math.pow(2, attempt);
        console.log(`🔄 Retrying in ${backoffMs}ms (attempt ${attempt + 2}/${maxRetries + 1})...`);
        await this.sleep(backoffMs);
      }
    }
    throw lastError;
  }

  // ─── OpenAI ─────────────────────────────────────────────────

  private async completeOpenAI(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.openai) throw new Error('OpenAI API key not configured');

    // AbortController with 30s timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const completion = await this.openai.chat.completions.create(
        {
          model: opts.model,
          messages: opts.messages,
          temperature: opts.temperature,
          // Use max_completion_tokens (modern) with max_tokens as fallback
          max_completion_tokens: opts.max_tokens,
        },
        { signal: controller.signal as any },
      );

      const finishReason = completion.choices[0]?.finish_reason;
      const content = completion.choices[0]?.message?.content || '';
      console.log(`🤖 OpenAI completion: ${content.length} chars, finish_reason=${finishReason}, max_tokens=${opts.max_tokens}`);

      return {
        content,
        model: opts.model,
        provider: 'openai',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Anthropic (Claude) ─────────────────────────────────────

  private async completeAnthropic(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.anthropic) throw new Error('Anthropic API key not configured (set ANTHROPIC_API_KEY)');

    // Separate system message from conversation
    const systemMessages = opts.messages.filter(m => m.role === 'system');
    const conversationMessages = opts.messages.filter(m => m.role !== 'system');

    // Anthropic requires alternating user/assistant, starting with user
    // Merge consecutive same-role messages
    const mergedMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of conversationMessages) {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      if (mergedMessages.length > 0 && mergedMessages[mergedMessages.length - 1].role === role) {
        mergedMessages[mergedMessages.length - 1].content += '\n\n' + msg.content;
      } else {
        mergedMessages.push({ role, content: msg.content });
      }
    }

    // Ensure first message is from user
    if (mergedMessages.length === 0 || mergedMessages[0].role !== 'user') {
      mergedMessages.unshift({ role: 'user', content: '(begin)' });
    }

    // AbortController with 30s timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await this.anthropic.messages.create({
        model: opts.model,
        max_tokens: opts.max_tokens || 1500,
        system: systemMessages.map(m => m.content).join('\n\n') || undefined,
        messages: mergedMessages,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      });

      const textBlock = response.content.find(b => b.type === 'text');
      return {
        content: textBlock?.text || '',
        model: opts.model,
        provider: 'anthropic',
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        } : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Google Gemini (via OpenAI-compatible endpoint) ─────────

  private async completeGoogle(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.gemini) throw new Error('Google API key not configured (set GOOGLE_API_KEY)');

    // AbortController with 30s timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const completion = await this.gemini.chat.completions.create(
        {
          model: opts.model,
          messages: opts.messages,
          temperature: opts.temperature,
          // Gemini OpenAI-compat only supports max_tokens (not max_completion_tokens)
          max_tokens: opts.max_tokens,
        },
        { signal: controller.signal as any },
      );

      const finishReason = completion.choices[0]?.finish_reason;
      const content = completion.choices[0]?.message?.content || '';
      console.log(`🤖 Google completion: ${content.length} chars, finish_reason=${finishReason}, max_tokens=${opts.max_tokens}`);
      if (finishReason === 'length') {
        console.warn(`⚠️ Google response TRUNCATED (hit max_tokens=${opts.max_tokens}). Consider increasing the limit.`);
      }

      return {
        content,
        model: opts.model,
        provider: 'google',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Model Discovery ───────────────────────────────────────

  private async completeDeepSeek(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.deepseek) throw new Error('DeepSeek API key not configured (set DEEPSEEK_API_KEY)');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const completion = await this.deepseek.chat.completions.create(
        {
          model: opts.model,
          messages: opts.messages,
          temperature: opts.temperature,
          max_tokens: opts.max_tokens,
        },
        { signal: controller.signal as any },
      );

      const finishReason = completion.choices[0]?.finish_reason;
      const content = completion.choices[0]?.message?.content || '';
      console.log(`🤖 DeepSeek completion: ${content.length} chars, finish_reason=${finishReason}, max_tokens=${opts.max_tokens}`);

      return {
        content,
        model: opts.model,
        provider: 'deepseek',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const models = new Set<string>();

    // OpenAI models — discover dynamically
    if (this.openai) {
      try {
        const page = await this.openai.models.list();
        for (const m of page.data) {
          const id = m?.id;
          if (typeof id === 'string' && (id.startsWith('gpt-') || /^o[134]/.test(id))) {
            // Skip dated snapshots, audio, image, realtime, search, transcribe, tts variants
            if (!/\d{4}-\d{2}-\d{2}/.test(id) &&
                !id.includes('audio') &&
                !id.includes('image') &&
                !id.includes('realtime') &&
                !id.includes('search') &&
                !id.includes('transcribe') &&
                !id.includes('tts') &&
                !id.includes('instruct') &&
                !id.includes('moderation')) {
              models.add(id);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Failed to discover OpenAI models:', err);
        // Fallback set of OpenAI models
        ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5.1', 'gpt-5', 'gpt-5-pro', 'gpt-5-mini', 'gpt-5-nano',
         'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini',
         'o4-mini', 'o3', 'o3-mini', 'o1'].forEach(m => models.add(m));
      }
    }

    // Anthropic models — always list (no list endpoint)
    [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-haiku-3.5-20241022',
    ].forEach(m => models.add(m));

    // Google Gemini models — always list
    [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].forEach(m => models.add(m));

    // DeepSeek models — always list
    [
      'deepseek-chat',
      'deepseek-reasoner',
    ].forEach(m => models.add(m));

    // If nothing at all, return a basic fallback
    if (models.size === 0) {
      return ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o'];
    }

    return Array.from(models).sort((a, b) => {
      // Sort by provider first, then name
      const pa = detectProvider(a);
      const pb = detectProvider(b);
      if (pa !== pb) {
        const order: Record<ProviderName, number> = { openai: 0, anthropic: 1, google: 2, deepseek: 3 };
        return order[pa] - order[pb];
      }
      return a.localeCompare(b);
    });
  }
}
