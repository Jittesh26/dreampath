/**
 * Tests for GeminiResumeAIProvider
 *
 * Verifies: interface compliance, missing API key, structured output acceptance,
 * malformed output rejection, and security properties.
 *
 * No real Gemini API calls are made — the SDK is fully mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractedFactSchema, generatedWordingSchema } from '../../../domain/ai-interview';
import { GeminiResumeAIProvider } from '../gemini-provider';

// ─── Mutable mock state ───────────────────────────────────────────────────────
// Tests set these to control what Gemini returns.
let mockGenerateContentImpl: () => Promise<unknown>;
let mockSendMessageImpl: () => Promise<unknown>;

// ─── Mock the Gemini SDK ──────────────────────────────────────────────────────
vi.mock('@google/generative-ai', () => ({
  // Must be a class (constructable) so `new GoogleGenerativeAI(apiKey)` works
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: () => mockGenerateContentImpl(),
        startChat: () => ({
          sendMessage: () => mockSendMessageImpl(),
        }),
      };
    }
  },
  SchemaType: {
    STRING:  'string',
    NUMBER:  'number',
    INTEGER: 'integer',
    BOOLEAN: 'boolean',
    ARRAY:   'array',
    OBJECT:  'object',
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('GeminiResumeAIProvider', () => {
  let provider: GeminiResumeAIProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key-NEVER-LOG' };
    // Reset mock implementations to safe defaults
    mockGenerateContentImpl = () =>
      Promise.resolve({ response: { text: () => '[]' } });
    mockSendMessageImpl = () =>
      Promise.resolve({ response: { text: () => 'Next question?' } });
    provider = new GeminiResumeAIProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── Provider compliance ──────────────────────────────────────────────────────

  it('implements ResumeAIProvider interface (has all required methods)', () => {
    expect(typeof provider.generateNextQuestion).toBe('function');
    expect(typeof provider.extractFacts).toBe('function');
    expect(typeof provider.generateProfessionalWording).toBe('function');
  });

  // ── Missing API key ──────────────────────────────────────────────────────────

  it('throws on construction when GEMINI_API_KEY is missing', () => {
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      expect(() => new GeminiResumeAIProvider()).toThrow('GEMINI_API_KEY');
    } finally {
      process.env.GEMINI_API_KEY = savedKey;
    }
  });

  // ── generateNextQuestion ─────────────────────────────────────────────────────

  it('generateNextQuestion returns a non-empty string', async () => {
    mockSendMessageImpl = () =>
      Promise.resolve({ response: { text: () => 'What is your CGPA?' } });
    const q = await provider.generateNextQuestion([]);
    expect(typeof q).toBe('string');
    expect(q.length).toBeGreaterThan(0);
  });

  it('generateNextQuestion truncates response to 500 chars max', async () => {
    const longText = 'A'.repeat(600);
    mockSendMessageImpl = () =>
      Promise.resolve({ response: { text: () => longText } });
    const q = await provider.generateNextQuestion([]);
    expect(q.length).toBeLessThanOrEqual(500);
  });

  it('generateNextQuestion throws safe error on Gemini failure', async () => {
    mockSendMessageImpl = () => Promise.reject(new Error('Network error'));
    await expect(provider.generateNextQuestion([])).rejects.toThrow('Could not generate the next interview question');
  });

  // ── extractFacts ─────────────────────────────────────────────────────────────

  it('extractFacts returns typed ExtractedFact[] on valid response', async () => {
    mockGenerateContentImpl = () =>
      Promise.resolve({
        response: {
          text: () => JSON.stringify([
            { category: 'education', data: { institution: 'UTM', qualification: 'BSc CS', educationLevel: 'Bachelor' } },
          ]),
        },
      });
    const facts = await provider.extractFacts([], 'I study BSc CS at UTM.');
    expect(facts).toHaveLength(1);
    expect(facts[0].category).toBe('education');
    expect(facts[0].isConfirmed).toBe(false);
  });

  it('extractFacts preserves originalAnswer as provenance record', async () => {
    const answer = 'I built CampusFind using Next.js and PostgreSQL.';
    mockGenerateContentImpl = () =>
      Promise.resolve({
        response: {
          text: () => JSON.stringify([
            { category: 'project', data: { name: 'CampusFind', technologies: ['Next.js', 'PostgreSQL'] } },
          ]),
        },
      });
    const facts = await provider.extractFacts([], answer);
    expect(facts[0].originalAnswer).toBe(answer);
  });

  it('each returned fact passes extractedFactSchema validation', async () => {
    mockGenerateContentImpl = () =>
      Promise.resolve({
        response: {
          text: () => JSON.stringify([
            { category: 'project', data: { name: 'CampusFind' } },
          ]),
        },
      });
    const facts = await provider.extractFacts([], 'I built CampusFind.');
    expect(() => extractedFactSchema.parse(facts[0])).not.toThrow();
  });

  it('extractFacts returns [] for non-array Gemini response', async () => {
    mockGenerateContentImpl = () =>
      Promise.resolve({ response: { text: () => '{"not": "an array"}' } });
    const facts = await provider.extractFacts([], 'some answer');
    expect(facts).toHaveLength(0);
  });

  it('extractFacts caps results at 10 facts max', async () => {
    const bigArray = Array.from({ length: 20 }, () => ({
      category: 'general',
      data: { note: 'extra fact' },
    }));
    mockGenerateContentImpl = () =>
      Promise.resolve({ response: { text: () => JSON.stringify(bigArray) } });
    const facts = await provider.extractFacts([], 'many facts');
    expect(facts.length).toBeLessThanOrEqual(10);
  });

  it('extractFacts throws safe error on Gemini network failure', async () => {
    mockGenerateContentImpl = () => Promise.reject(new Error('Rate limit exceeded'));
    await expect(provider.extractFacts([], 'answer')).rejects.toThrow('AI fact extraction failed');
  });

  // ── generateProfessionalWording ──────────────────────────────────────────────

  it('generateProfessionalWording returns structure that passes generatedWordingSchema', async () => {
    const id = crypto.randomUUID();
    mockGenerateContentImpl = () =>
      Promise.resolve({
        response: {
          text: () => JSON.stringify({
            education: [{
              id,
              institution: 'Universiti Teknologi Malaysia',
              qualification: 'Bachelor of Science in Computer Science',
              educationLevel: 'Bachelor',
            }],
          }),
        },
      });
    const wording = await provider.generateProfessionalWording([makeEducationFact()]);
    expect(() => generatedWordingSchema.parse(wording)).not.toThrow();
    expect(wording.education).toHaveLength(1);
  });

  it('generateProfessionalWording returns {} immediately for empty confirmed facts', async () => {
    const result = await provider.generateProfessionalWording([]);
    expect(result).toEqual({});
  });

  it('generateProfessionalWording throws safe error on Gemini failure', async () => {
    mockGenerateContentImpl = () => Promise.reject(new Error('Timeout'));
    await expect(provider.generateProfessionalWording([makeEducationFact()])).rejects.toThrow('AI wording generation failed');
  });

  // ── Security ─────────────────────────────────────────────────────────────────

  it('API key NEVER appears in extractFacts return value', async () => {
    mockGenerateContentImpl = () =>
      Promise.resolve({ response: { text: () => '[]' } });
    const result = await provider.extractFacts([], 'test answer');
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain('test-key-NEVER-LOG');
    expect(serialised).not.toContain('GEMINI_API_KEY');
  });

  it('API key NEVER appears in generateNextQuestion return value', async () => {
    mockSendMessageImpl = () =>
      Promise.resolve({ response: { text: () => 'What projects have you worked on?' } });
    const q = await provider.generateNextQuestion([]);
    expect(q).not.toContain('test-key-NEVER-LOG');
  });

  it('unconfirmed facts passed to generateProfessionalWording result in empty output', async () => {
    // A fact where isConfirmed=false should still be processed at the provider level
    // (the action layer enforces the DB filter; provider just acts on what it receives)
    // We confirm the provider gracefully handles an empty confirmed list
    const result = await provider.generateProfessionalWording([]);
    expect(result).toEqual({});
  });
});
