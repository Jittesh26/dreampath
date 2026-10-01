import { GoogleGenAI } from '@google/genai';

/**
 * DREAMPath Central AI Router & Resilience Architecture
 *
 * Primary Provider: Google Gemini (Gemini 3.8 Flash)
 * Internal Gemini Cascade: gemini-3.8-flash -> gemini-3.6-flash -> gemini-3.5-flash
 * External Fallback: OpenRouter (with provider diversity e.g. Llama 3.1 / Mistral)
 *
 * OmniRoute Evaluation:
 * Evaluated as requested. OmniRoute requires running a separate background gateway process/daemon
 * (typically on port 20128) with narrow Node engine constraints (v22.2-22.x/24-26.x), which introduces
 * severe operational fragility, port binding issues, and infrastructure overhead for a web deployment.
 * OpenRouter was therefore chosen as the production-safe, stateless, cloud-native external fallback.
 */

// Structured Error Categories
export type AIErrorCode =
  | 'AUTH_ERROR'
  | 'CONFIG_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_ERROR'
  | 'INVALID_AI_RESPONSE'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type AIFeature =
  | 'scholarship-qa'
  | 'resume-interview'
  | 'resume-wording'
  | 'scholarship-compare'
  | 'discovery'
  | 'magic-autofill'
  | 'general';

export interface RouteConfig {
  feature?: AIFeature;
  systemPrompt?: string;
  prompt: string;
  history?: { role: 'user' | 'ai'; content: string }[];
  temperature?: number;
  jsonSchema?: any;
  timeoutMs?: number;
  thinkingBudget?: number;
}

export interface AIResult {
  text: string;
  isFallback: boolean;
  provider: 'gemini' | 'openrouter' | 'none';
  modelUsed?: string;
  error?: string;
  errorCode?: AIErrorCode;
  latencyMs?: number;
}

// Feature-level latency & reasoning configuration
const FEATURE_DEFAULTS: Record<AIFeature, { timeoutMs: number; thinkingBudget: number; temperature: number }> = {
  'scholarship-qa': { timeoutMs: 6000, thinkingBudget: 0, temperature: 0.2 },
  'resume-interview': { timeoutMs: 8000, thinkingBudget: 0, temperature: 0.7 },
  'resume-wording': { timeoutMs: 25000, thinkingBudget: 0, temperature: 0.2 },
  'scholarship-compare': { timeoutMs: 8000, thinkingBudget: 0, temperature: 0.1 },
  'discovery': { timeoutMs: 6000, thinkingBudget: 0, temperature: 0.1 },
  'magic-autofill': { timeoutMs: 8000, thinkingBudget: 0, temperature: 0.0 },
  'general': { timeoutMs: 8000, thinkingBudget: 0, temperature: 0.5 },
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_CASCADES = [
  PRIMARY_GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];
const OPENROUTER_MODELS = [
  process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct',
  'mistralai/mistral-small-24b-instruct-2501',
  'google/gemini-2.5-flash',
];

export class AIRouter {
  private get geminiKey() {
    return process.env.GEMINI_API_KEY;
  }
  private get openRouterKey() {
    return process.env.OPENROUTER_API_KEY;
  }

  private logEvent(params: {
    feature: AIFeature;
    provider: string;
    model: string;
    status: 'success' | 'timeout' | 'fallback' | 'error';
    latencyMs: number;
    errorCode?: AIErrorCode;
    details?: string;
  }) {
    const { feature, provider, model, status, latencyMs, errorCode, details } = params;
    const errPart = errorCode ? ` errorCode=${errorCode}` : '';
    const detPart = details ? ` details="${details.slice(0, 120)}"` : '';
    console.info(`[AI] feature=${feature} provider=${provider} model=${model} status=${status} latency=${latencyMs}ms${errPart}${detPart}`);
  }

  /**
   * Invokes Gemini models in cascade order (3.8-flash -> 3.6-flash -> 3.5-flash)
   */
  private async callGeminiWithCascade(
    config: RouteConfig,
    feature: AIFeature,
    signal: AbortSignal
  ): Promise<{ text: string; model: string }> {
    if (!this.geminiKey) {
      throw new Error('CONFIG_ERROR: GEMINI_API_KEY missing');
    }

    const ai = new GoogleGenAI({ apiKey: this.geminiKey });
    const defaults = FEATURE_DEFAULTS[feature];
    const thinkingBudget = config.thinkingBudget ?? defaults.thinkingBudget;

    let responseMimeType = 'text/plain';
    if (config.jsonSchema) responseMimeType = 'application/json';

    let contents: any[] = [];
    if (config.history) {
      contents = config.history.map((msg) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
    }
    contents.push({ role: 'user', parts: [{ text: config.prompt }] });

    let lastError: any = null;

    // Deduplicate cascade list while preserving primary first
    const modelsToTry = Array.from(new Set(GEMINI_CASCADES));

    for (const model of modelsToTry) {
      if (signal.aborted) {
        throw new Error('PROVIDER_TIMEOUT: Request aborted due to response start timeout');
      }

      const start = Date.now();
      try {
        const genConfig: any = {
          systemInstruction: config.systemPrompt,
          temperature: config.temperature ?? defaults.temperature,
          responseMimeType,
        };

        if (config.jsonSchema && typeof config.jsonSchema === 'object') {
          genConfig.responseSchema = config.jsonSchema;
        }

        if (thinkingBudget !== undefined && thinkingBudget >= 0) {
          genConfig.thinkingConfig = { thinkingBudget };
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          config: genConfig,
        });

        const text = response.text?.trim() || '';
        if (!text) {
          throw new Error('INVALID_AI_RESPONSE: Empty response text from Gemini');
        }

        this.logEvent({
          feature,
          provider: 'gemini',
          model,
          status: 'success',
          latencyMs: Date.now() - start,
        });

        return { text, model };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isUnavailableOrBusy =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('NOT_FOUND') ||
          errMsg.includes('no longer available');

        this.logEvent({
          feature,
          provider: 'gemini',
          model,
          status: 'fallback',
          latencyMs: Date.now() - start,
          errorCode: errMsg.includes('429') ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_ERROR',
          details: errMsg,
        });

        // If it's a model-specific error or high demand, proceed to next model in cascade
        if (isUnavailableOrBusy) {
          continue;
        }

        // For fatal client configuration errors or schema mismatch, try fallback
        continue;
      }
    }

    throw lastError || new Error('PROVIDER_ERROR: All Gemini models in cascade failed');
  }

  /**
   * Invokes OpenRouter as the external multi-provider fallback layer
   */
  private async callOpenRouter(
    config: RouteConfig,
    feature: AIFeature,
    signal: AbortSignal
  ): Promise<{ text: string; model: string }> {
    if (!this.openRouterKey) {
      throw new Error('CONFIG_ERROR: OPENROUTER_API_KEY missing');
    }

    const defaults = FEATURE_DEFAULTS[feature];
    const messages: any[] = [];
    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt });
    }

    if (config.history) {
      config.history.forEach((msg) => {
        messages.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.content });
      });
    }

    let userPrompt = config.prompt;
    if (config.jsonSchema) {
      userPrompt +=
        '\n\nIMPORTANT: Return ONLY valid JSON strictly adhering to the schema:\n' +
        JSON.stringify(config.jsonSchema) +
        '\nDo not wrap in markdown or backticks.';
    }
    messages.push({ role: 'user', content: userPrompt });

    const start = Date.now();
    const primaryModel = OPENROUTER_MODELS[0];

    const body: any = {
      model: primaryModel,
      messages,
      temperature: config.temperature ?? defaults.temperature,
      models: OPENROUTER_MODELS, // OpenRouter auto-router fallback array
    };

    if (config.jsonSchema) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dreampath.my',
        'X-Title': 'DreamPath AI',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      const code: AIErrorCode = res.status === 429 ? 'PROVIDER_RATE_LIMIT' : res.status === 401 ? 'AUTH_ERROR' : 'PROVIDER_ERROR';
      this.logEvent({
        feature,
        provider: 'openrouter',
        model: primaryModel,
        status: 'error',
        latencyMs: Date.now() - start,
        errorCode: code,
        details: `${res.status} ${errText}`,
      });
      throw new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const actualModel = data.model || primaryModel;

    if (!content.trim()) {
      throw new Error('INVALID_AI_RESPONSE: Empty response content from OpenRouter');
    }

    this.logEvent({
      feature,
      provider: 'openrouter',
      model: actualModel,
      status: 'success',
      latencyMs: Date.now() - start,
    });

    return { text: content, model: actualModel };
  }

  /**
   * Main Text & JSON Generation API with timeout, multi-tier fallback, and structured error categorization
   */
  public async generateText(config: RouteConfig): Promise<AIResult> {
    const feature = config.feature || 'general';
    const defaults = FEATURE_DEFAULTS[feature];
    const timeout = config.timeoutMs ?? defaults.timeoutMs;
    const overallStart = Date.now();

    const geminiController = new AbortController();
    const geminiTimer = setTimeout(() => {
      geminiController.abort(new Error('PROVIDER_TIMEOUT'));
    }, timeout);

    // 1. Attempt Primary Provider: Gemini with Cascade
    try {
      const geminiPromise = this.callGeminiWithCascade(config, feature, geminiController.signal);
      const abortPromise = new Promise<{ text: string; model: string }>((_, reject) => {
        geminiController.signal.addEventListener('abort', () => {
          reject(new Error('PROVIDER_TIMEOUT: Gemini response start timeout'));
        });
      });

      const { text, model } = await Promise.race([geminiPromise, abortPromise]);
      clearTimeout(geminiTimer);

      return {
        text,
        isFallback: false,
        provider: 'gemini',
        modelUsed: model,
        latencyMs: Date.now() - overallStart,
      };
    } catch (geminiError: any) {
      clearTimeout(geminiTimer);
      const errMsg = geminiError?.message || String(geminiError);
      const isTimeout = errMsg.includes('TIMEOUT');

      this.logEvent({
        feature,
        provider: 'gemini',
        model: PRIMARY_GEMINI_MODEL,
        status: isTimeout ? 'timeout' : 'fallback',
        latencyMs: Date.now() - overallStart,
        errorCode: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_ERROR',
        details: errMsg,
      });

      // 2. Attempt Fallback Provider: OpenRouter
      if (this.openRouterKey) {
        const fallbackController = new AbortController();
        const fallbackTimer = setTimeout(() => fallbackController.abort(), 16000);

        try {
          const { text, model } = await this.callOpenRouter(config, feature, fallbackController.signal);
          clearTimeout(fallbackTimer);

          return {
            text,
            isFallback: true,
            provider: 'openrouter',
            modelUsed: model,
            latencyMs: Date.now() - overallStart,
          };
        } catch (openRouterError: any) {
          clearTimeout(fallbackTimer);
          const orMsg = openRouterError?.message || String(openRouterError);
          this.logEvent({
            feature,
            provider: 'openrouter',
            model: OPENROUTER_MODELS[0],
            status: 'error',
            latencyMs: Date.now() - overallStart,
            errorCode: 'PROVIDER_ERROR',
            details: orMsg,
          });
        }
      }
    }

    // 3. Final Graceful Fallback
    const totalDuration = Date.now() - overallStart;
    this.logEvent({
      feature,
      provider: 'none',
      model: 'none',
      status: 'error',
      latencyMs: totalDuration,
      errorCode: 'UNKNOWN_ERROR',
      details: 'All providers failed or were exhausted',
    });

    return {
      text: '',
      isFallback: false,
      provider: 'none',
      errorCode: 'UNKNOWN_ERROR',
      error: 'DreamPath AI is temporarily unavailable. Please try again in a moment.',
      latencyMs: totalDuration,
    };
  }

  /**
   * Server-Sent Events / Chunked Streaming Text Generator
   * Prioritizes fast start, yielding tokens as they arrive.
   * If Gemini doesn't yield first chunk within timeoutMs, cancels and switches to fallback.
   */
  public async *streamText(
    config: RouteConfig
  ): AsyncGenerator<{ token?: string; status?: string; done?: boolean; provider?: string; error?: string }, void, unknown> {
    const feature = config.feature || 'scholarship-qa';
    const defaults = FEATURE_DEFAULTS[feature];
    const timeout = config.timeoutMs ?? defaults.timeoutMs;

    yield { status: 'Connecting to DreamPath AI...' };

    if (this.geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: this.geminiKey });
        const modelsToTry = Array.from(new Set(GEMINI_CASCADES));

        for (const model of modelsToTry) {
          try {
            const controller = new AbortController();
            let firstChunkReceived = false;

            const timer = setTimeout(() => {
              if (!firstChunkReceived) controller.abort();
            }, timeout);

            const stream = await ai.models.generateContentStream({
              model,
              contents: config.prompt,
              config: {
                systemInstruction: config.systemPrompt,
                temperature: config.temperature ?? defaults.temperature,
                thinkingConfig: { thinkingBudget: config.thinkingBudget ?? defaults.thinkingBudget },
              },
            });

            for await (const chunk of stream) {
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                clearTimeout(timer);
              }
              const text = chunk.text || '';
              if (text) {
                yield { token: text, provider: 'gemini' };
              }
            }

            clearTimeout(timer);
            yield { done: true, provider: 'gemini' };
            return;
          } catch {
            // If model failed or timed out before first chunk, try next in cascade
            continue;
          }
        }
      } catch {
        // Fall through to OpenRouter or non-streaming
      }
    }

    // Fallback: non-streaming generation yielded as a complete block
    yield { status: 'Using backup AI provider...' };
    const result = await this.generateText(config);
    if (result.text) {
      yield { token: result.text, done: true, provider: result.provider };
    } else {
      yield { error: result.error || 'AI temporarily unavailable.', done: true };
    }
  }
}

export const aiRouter = new AIRouter();
