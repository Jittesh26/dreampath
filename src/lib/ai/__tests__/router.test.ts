import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiRouter } from '../router';

let mockGoogleGenAIResponse: any = null;
let mockFetchResponse: any = null;

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async () => {
        if (mockGoogleGenAIResponse instanceof Error) {
          throw mockGoogleGenAIResponse;
        }
        return mockGoogleGenAIResponse;
      },
    };
  },
}));

const originalFetch = global.fetch;

describe('AIRouter', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini', OPENROUTER_API_KEY: 'test-openrouter' };

    global.fetch = vi.fn(async () => {
      if (mockFetchResponse instanceof Error) throw mockFetchResponse;
      return {
        ok: true,
        json: async () => mockFetchResponse,
      } as any;
    });

    mockGoogleGenAIResponse = { text: 'gemini-success' };
    mockFetchResponse = { choices: [{ message: { content: 'openrouter-success' } }] };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('attempts Gemini first and succeeds', async () => {
    const result = await aiRouter.generateText({ prompt: 'test' });
    expect(result.text).toBe('gemini-success');
    expect(result.isFallback).toBe(false);
    expect(result.provider).toBe('gemini');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to OpenRouter when Gemini throws error', async () => {
    mockGoogleGenAIResponse = new Error('Gemini offline');
    const result = await aiRouter.generateText({ prompt: 'test' });
    expect(result.text).toBe('openrouter-success');
    expect(result.isFallback).toBe(true);
    expect(result.provider).toBe('openrouter');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to OpenRouter when Gemini returns 429 rate limit', async () => {
    mockGoogleGenAIResponse = new Error('429 RESOURCE_EXHAUSTED: Rate limit exceeded');
    const result = await aiRouter.generateText({ prompt: 'test' });
    expect(result.isFallback).toBe(true);
    expect(result.provider).toBe('openrouter');
    expect(result.text).toBe('openrouter-success');
  });

  it('falls back when Gemini returns empty response', async () => {
    mockGoogleGenAIResponse = { text: '' };
    const result = await aiRouter.generateText({ prompt: 'test' });
    expect(result.isFallback).toBe(true);
    expect(result.provider).toBe('openrouter');
    expect(result.text).toBe('openrouter-success');
  });

  it('returns clean error when both providers fail', async () => {
    mockGoogleGenAIResponse = new Error('Gemini offline');
    mockFetchResponse = new Error('OpenRouter offline');
    const result = await aiRouter.generateText({ prompt: 'test' });
    expect(result.text).toBe('');
    expect(result.isFallback).toBe(false);
    expect(result.provider).toBe('none');
    expect(result.error).toContain('DreamPath AI is temporarily unavailable');
    expect(result.errorCode).toBe('UNKNOWN_ERROR');
  });

  it('handles JSON schema structured configuration safely', async () => {
    mockGoogleGenAIResponse = { text: JSON.stringify({ key: 'value' }) };
    const result = await aiRouter.generateText({
      prompt: 'test schema',
      jsonSchema: { type: 'object', properties: { key: { type: 'string' } } },
    });
    expect(result.text).toContain('value');
    expect(result.provider).toBe('gemini');
  });
});
