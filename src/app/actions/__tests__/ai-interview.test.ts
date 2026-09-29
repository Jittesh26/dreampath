import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  processStudentAnswer, 
  confirmFact, 
  generateWordingFromFacts,
  generateWordingForSingleFact
} from '../ai-interview';
import type { ExtractedFact } from '../../../domain/ai-interview';

// We need to mock the database layer for testing the actions safely.
// Or we can mock requireResumeProfile and db inserts if we are doing unit tests.

// Mocking dependencies is essential here so we don't hit the real DB.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }) }
  })
}));

vi.mock('@/db/schema', () => ({
  resumeFacts: { id: 'resumeFacts' },
  resumeProfiles: { id: 'resumeProfiles' },
}));

vi.mock('../../../lib/ai/mock-provider', () => {
  return {
    MockResumeAIProvider: class {
      generateNextQuestion = vi.fn().mockResolvedValue('Next question?');
      extractFacts = vi.fn().mockImplementation((history, answer) => {
        if (answer.includes('invalid')) {
          return Promise.resolve([{
            id: crypto.randomUUID(),
            category: 'education',
            originalAnswer: 'test',
            structuredData: { invalid: 'data' },
            isConfirmed: false
          }]);
        }
        return Promise.resolve([{
          id: crypto.randomUUID(),
          category: 'education',
          originalAnswer: 'I am studying computer science',
          structuredData: { category: 'education', data: { institution: 'Test Uni' } },
          isConfirmed: false
        }]);
      });
      generateProfessionalWording = vi.fn().mockImplementation((facts: ExtractedFact[]) => {
        const first = facts[0];
        const data = first?.structuredData as { data?: { institution?: string } } | undefined;
        if (data?.data?.institution === 'Invalid') {
           return Promise.resolve({ invalidSection: [] });
        }
        return Promise.resolve({
          education: facts.map((f: ExtractedFact) => ({
            id: crypto.randomUUID(),
            institution: (f.structuredData as { data?: { institution?: string } }).data?.institution || 'Test Uni',
            qualification: 'BSc',
            educationLevel: 'Bachelor'
          }))
        });
      });
    }
  };
});

// Using Record<string, unknown>[] keeps it typed without importing DB internals
const mockDbState: Record<string, unknown>[] = [];

vi.mock('@/db', () => ({
  db: {
    query: {
      resumeProfiles: {
        findFirst: vi.fn().mockResolvedValue({ id: crypto.randomUUID(), userId: crypto.randomUUID() })
      },
      resumeFacts: {
        findFirst: vi.fn().mockImplementation(() => {
          return Promise.resolve(mockDbState[0]);
        }),
        findMany: vi.fn().mockImplementation(async () => {
           return mockDbState;
        })
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((val: Record<string, unknown>) => {
        const inserted = { id: crypto.randomUUID(), ...val };
        mockDbState.push(inserted);
        return { returning: vi.fn().mockResolvedValue([inserted]) };
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => {
            if (mockDbState.length > 0) mockDbState[0].isConfirmed = true;
            return Promise.resolve([mockDbState[0]]);
          })
        })
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(true)
    })
  }
}));

describe('AI Interview Action Pipeline', () => {
  
  beforeEach(() => {
    mockDbState.length = 0; // Clear mock db array
  });

  it('should process a student answer and save unconfirmed facts', async () => {
    const facts = await processStudentAnswer([], "I am studying computer science");
    
    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0].isConfirmed).toBe(false);
    expect(facts[0].originalAnswer).toBe("I am studying computer science");
    expect(mockDbState.length).toBe(1);
    expect(mockDbState[0].isConfirmed).toBe(false);
  });

  it('should allow confirming a fact', async () => {
    await processStudentAnswer([], "I am studying computer science");
    const factId = String(mockDbState[0].id);
    
    const updatedFact = await confirmFact(factId);
    expect(updatedFact.isConfirmed).toBe(true);
  });

  it('should only use confirmed facts for generating wording', async () => {
    // 1. Unconfirmed Fact
    await processStudentAnswer([], "I am studying computer science");
    
    // We override findMany mock to simulate filtering
    const { db } = await import('@/db');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.query.resumeFacts.findMany as any).mockResolvedValueOnce([]); // No confirmed facts yet
    
    const wording1 = await generateWordingFromFacts();
    expect(wording1.education?.length ?? 0).toBe(0);

    // 2. Confirmed fact
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.query.resumeFacts.findMany as any).mockResolvedValueOnce([{
      ...mockDbState[0],
      isConfirmed: true,
      category: 'education',
      content: { category: 'education', data: { institution: 'Test Uni' } }
    }]);

    const wording2 = await generateWordingFromFacts();
    expect(wording2.education?.length).toBe(1);
    expect(wording2.education![0].institution).toBe('Test Uni');
  });

  it('should reject malformed provider output during extraction', async () => {
    await expect(processStudentAnswer([], "test invalid")).rejects.toThrow();
  });

  it('should reject malformed provider output during generation', async () => {
    const { db } = await import('@/db');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.query.resumeFacts.findMany as any).mockResolvedValueOnce([{
      id: crypto.randomUUID(),
      isConfirmed: true,
      category: 'education',
      content: { category: 'education', data: { institution: 'Invalid' } }
    }]);

    await expect(generateWordingFromFacts()).rejects.toThrow();
  });

  it('should generate wording for a single confirmed fact without mutating the fact', async () => {
    const factId = crypto.randomUUID();
    const { db } = await import('@/db');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.query.resumeFacts.findFirst as any).mockResolvedValueOnce({
      id: factId,
      isConfirmed: true,
      category: 'education',
      originalAnswer: 'Graduated from Universiti Malaya',
      content: { category: 'education', data: { institution: 'Universiti Malaya' } }
    });

    const wording = await generateWordingForSingleFact(factId);
    expect(wording.education?.length).toBe(1);
    expect(wording.education![0].institution).toBe('Universiti Malaya');
  });
});
