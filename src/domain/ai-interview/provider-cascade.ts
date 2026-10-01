import { GoogleGenAI } from '@google/genai';
import { InterviewLedger } from './ledger';

export interface PhrasedQuestionResult {
  text: string;
  provider: 'gemini' | 'groq' | 'mistral' | 'openrouter' | 'deterministic_template';
  modelUsed?: string;
  isFallback: boolean;
}

/**
 * Provider Cascade for conversational question phrasing:
 * Order: Gemini → Groq → Mistral → OpenRouter → deterministic template
 *
 * Rules:
 * - Sequential execution only (no parallel hedging)
 * - Configured models strictly come from environment variables
 * - If API key or model ID is missing, skip to the next provider
 * - Groq and Mistral are unconfigured in current environment
 */
export class ProviderCascade {
  private get geminiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }
  private get geminiModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  private get groqKey(): string | undefined {
    return process.env.GROQ_API_KEY;
  }
  private get groqModel(): string | undefined {
    return process.env.GROQ_MODEL;
  }

  private get mistralKey(): string | undefined {
    return process.env.MISTRAL_API_KEY;
  }
  private get mistralModel(): string | undefined {
    return process.env.MISTRAL_MODEL;
  }

  private get openRouterKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }
  private get openRouterModel(): string {
    return process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct';
  }

  /**
   * Phrases the question for the deterministic intent.
   * If any provider fails, continues down the cascade to the deterministic template.
   */
  public async phraseQuestion(params: {
    intentKey: string;
    slotName?: string;
    template: string;
    topic: string;
    ledger: InterviewLedger;
    latestAnswer?: string;
  }): Promise<PhrasedQuestionResult> {
    const { template, latestAnswer } = params;

    const systemPrompt = [
      'You are the conversational phrasing assistant for DreamPath, a scholarship interview system.',
      'A deterministic planner has already chosen the exact target information needed.',
      'Your ONLY job is to phrase the question naturally, warmly, and concisely.',
      'CRITICAL RULES:',
      '1. NEVER ask for a different topic than the target question.',
      '2. If the student just provided an answer, acknowledge it warmly in 1 short sentence, then ask the target question.',
      '3. NEVER repeat questions about details already known.',
      '4. NEVER assume an unmentioned entity or experience exists.',
      '5. Output ONLY the conversational question text. No JSON, no preamble, no quotes.',
    ].join('\n');

    const userPrompt = [
      `Target Information Needed (Template): "${template}"`,
      latestAnswer ? `Student just said: "${latestAnswer.slice(0, 300)}"` : '',
      'Phrase this naturally as an empathetic scholarship advisor:',
    ].filter(Boolean).join('\n');

    // 1. Primary: Gemini
    if (this.geminiKey && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      try {
        const ai = new GoogleGenAI({ apiKey: this.geminiKey });
        const response = await ai.models.generateContent({
          model: this.geminiModel,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.6,
          },
        });

        const text = response.text?.trim();
        if (text && text.length > 5) {
          return {
            text: text.replace(/^["']|["']$/g, ''),
            provider: 'gemini',
            modelUsed: this.geminiModel,
            isFallback: false,
          };
        }
      } catch (err: any) {
        console.warn('[AI Cascade] Gemini phrasing failed, cascading to next provider:', err?.message);
      }
    }

    // 2. Fast Fallback: Groq
    if (this.groqKey && this.groqModel) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.groqModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            return {
              text: text.replace(/^["']|["']$/g, ''),
              provider: 'groq',
              modelUsed: this.groqModel,
              isFallback: true,
            };
          }
        }
      } catch (err: any) {
        console.warn('[AI Cascade] Groq phrasing failed, cascading:', err?.message);
      }
    }

    // 3. Secondary Fallback: Mistral
    if (this.mistralKey && this.mistralModel) {
      try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.mistralKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.mistralModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            return {
              text: text.replace(/^["']|["']$/g, ''),
              provider: 'mistral',
              modelUsed: this.mistralModel,
              isFallback: true,
            };
          }
        }
      } catch (err: any) {
        console.warn('[AI Cascade] Mistral phrasing failed, cascading:', err?.message);
      }
    }

    // 4. Final Remote Fallback: OpenRouter
    if (this.openRouterKey) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.openRouterModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            return {
              text: text.replace(/^["']|["']$/g, ''),
              provider: 'openrouter',
              modelUsed: this.openRouterModel,
              isFallback: true,
            };
          }
        }
      } catch (err: any) {
        console.warn('[AI Cascade] OpenRouter phrasing failed, falling back to local template:', err?.message);
      }
    }

    // 5. Final Local Fallback: Deterministic Template
    return {
      text: template,
      provider: 'deterministic_template',
      isFallback: true,
    };
  }
}

export const providerCascade = new ProviderCascade();
