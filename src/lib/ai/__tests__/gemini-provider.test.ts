/**
 * Tests for GeminiResumeAIProvider (now UnifiedResumeAIProvider)
 *
 * Verifies: interface compliance, missing API key, structured output acceptance,
 * malformed output rejection, and security properties.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractedFactSchema, generatedWordingSchema } from '../../../domain/ai-interview';
import { GeminiResumeAIProvider } from '../gemini-provider';

let mockGenerateTextImpl: (config: any) => Promise<any>;

vi.mock('../router', () => ({
  aiRouter: {
    generateText: (config: any) => mockGenerateTextImpl(config)
  }
}));

function makeEducationFact() {
  return extractedFactSchema.parse({
    id: crypto.randomUUID(),
    category: 'education',
    originalAnswer: 'I study Computer Science at UTM.',
    structuredData: {
      category: 'education',
      data: { institution: 'UTM', qualification: 'BSc Computer Science', educationLevel: 'Bachelor' },
    },
    isConfirmed: true,
  });
}

describe('GeminiResumeAIProvider', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let provider: GeminiResumeAIProvider;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key-NEVER-LOG', OPENROUTER_API_KEY: '' };
    
    mockGenerateTextImpl = (config: any) => {
      if (config.jsonSchema && config.jsonSchema.properties?.extractedEntities) {
        return Promise.resolve({
          text: JSON.stringify({
            nextQuestion: 'What technical tools or frameworks do you use?',
            isComplete: false,
            topic: 'education',
            extractedEntities: [{ category: 'education', data: { institution: 'UTM', qualification: 'BSc' } }]
          }),
          isFallback: false,
          provider: 'gemini'
        });
      }
      if (config.jsonSchema && config.jsonSchema.properties?.education) {
        return Promise.resolve({
          text: JSON.stringify({
            education: [{ id: crypto.randomUUID(), institution: 'UTM', qualification: 'BSc', educationLevel: 'Bachelor' }],
          }),
          isFallback: false,
          provider: 'gemini'
        });
      }
      return Promise.resolve({ text: 'Next question?', isFallback: false, provider: 'gemini' });
    };

    provider = new GeminiResumeAIProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('implements ResumeAIProvider interface (has all required methods)', () => {
    expect(typeof provider.processInterviewTurn).toBe('function');
    expect(typeof provider.generateNextQuestion).toBe('function');
    expect(typeof provider.extractFacts).toBe('function');
    expect(typeof provider.generateProfessionalWording).toBe('function');
  });

  it('throws on construction when neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured', () => {
    process.env.GEMINI_API_KEY = '';
    process.env.OPENROUTER_API_KEY = '';
    expect(() => new GeminiResumeAIProvider()).toThrow('Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured.');
  });

  it('generateNextQuestion returns opening question for empty history', async () => {
    const q = await provider.generateNextQuestion([]);
    expect(q).toContain('academic foundation');
  });

  it('generateNextQuestion calls processInterviewTurn when history has student responses', async () => {
    const q = await provider.generateNextQuestion([
      { id: '1', role: 'ai', content: 'What is your degree?', timestamp: new Date() },
      { id: '2', role: 'student', content: 'Computer Science at UTM', timestamp: new Date() }
    ]);
    expect(q).toBe('What technical tools or frameworks do you use?');
  });

  it('processInterviewTurn extracts entities and provides next question', async () => {
    const turn = await provider.processInterviewTurn({
      history: [{ id: '1', role: 'ai', content: 'What is your degree?', timestamp: new Date() }],
      latestAnswer: 'I study BSc Computer Science at UTM with CGPA 3.8'
    });
    expect(turn.nextQuestion).toBe('What technical tools or frameworks do you use?');
    expect(turn.isComplete).toBe(false);
    expect(turn.extractedFacts.length).toBe(1);
    expect(turn.extractedFacts[0].category).toBe('education');
  });

  it('extractFacts returns typed ExtractedFact[] on valid response', async () => {
    const facts = await provider.extractFacts([], 'I study BSc Computer Science at UTM');
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe('education');
  });

  it('extractFacts preserves originalAnswer as provenance record', async () => {
    const answer = 'I built CampusFind using Next.js and PostgreSQL.';
    mockGenerateTextImpl = () => Promise.resolve({
      text: JSON.stringify({
        nextQuestion: 'What challenges did you face?',
        isComplete: false,
        extractedEntities: [{ category: 'project', data: { name: 'CampusFind' } }]
      }),
      isFallback: false, provider: 'gemini'
    });
    const facts = await provider.extractFacts([], answer);
    expect(facts[0].originalAnswer).toBe(answer);
  });

  it('each returned fact passes extractedFactSchema validation', async () => {
    mockGenerateTextImpl = () => Promise.resolve({
      text: JSON.stringify({
        nextQuestion: 'Tell me more about your skills.',
        isComplete: false,
        extractedEntities: [{ category: 'skills', data: { technical: ['TypeScript'] } }]
      }),
      isFallback: false, provider: 'gemini'
    });
    const facts = await provider.extractFacts([], 'answer');
    expect(() => extractedFactSchema.parse(facts[0])).not.toThrow();
  });

  it('processInterviewTurn returns graceful fallback on failure without throwing', async () => {
    mockGenerateTextImpl = () => Promise.resolve({ error: 'Rate limit', isFallback: false, provider: 'none' });
    const turn = await provider.processInterviewTurn({ history: [], latestAnswer: 'some answer' });
    expect(turn.extractedFacts).toHaveLength(0);
    expect(turn.nextQuestion).toContain('helpful context');
    expect(turn.isComplete).toBe(false);
  });

  it('generateProfessionalWording returns structure that passes generatedWordingSchema', async () => {
    const wording = await provider.generateProfessionalWording([makeEducationFact()]);
    expect(() => generatedWordingSchema.parse(wording)).not.toThrow();
  });

  it('generateProfessionalWording throws safe error on failure', async () => {
    mockGenerateTextImpl = () => Promise.resolve({ error: 'Timeout', isFallback: false, provider: 'none' });
    await expect(provider.generateProfessionalWording([makeEducationFact()])).rejects.toThrow('AI resume synthesis failed');
  });

  it('API key NEVER appears in extractFacts return value', async () => {
    const result = await provider.extractFacts([], 'test answer');
    expect(JSON.stringify(result)).not.toContain('test-key-NEVER-LOG');
  });

  it('API key NEVER appears in generateNextQuestion return value', async () => {
    const result = await provider.generateNextQuestion([]);
    expect(result).not.toContain('test-key-NEVER-LOG');
  });

  it('unconfirmed facts passed to generateProfessionalWording result in empty output', async () => {
    const unconfirmed = { ...makeEducationFact(), isConfirmed: false };
    mockGenerateTextImpl = () => Promise.resolve({ text: '{}', isFallback: false, provider: 'gemini' });
    const res = await provider.generateProfessionalWording([unconfirmed]);
    expect(res).toEqual({});
  });
});
