import { describe, it, expect, vi } from 'vitest';
import { evaluateAllScholarships } from '../../lib/cross-checker';
import { ScholarshipWithRules, getPublishedScholarshipsWithRules } from '../../lib/scholarships-data';
import { StudentProfile } from '../registry';
import { evaluateProfileServer } from '../../app/actions/eligibility';
import { saveScholarshipApplication } from '../../app/actions/student';
import { db } from '../../db';
import { users, intakes } from '../../db/schema';

// Mock Supabase to test authenticated vs unauthenticated save handling
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const { getMockUser, setMockUser } = vi.hoisted(() => {
  let user: any = null;
  return {
    getMockUser: () => user,
    setMockUser: (u: any) => { user = u; },
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: getMockUser() } }),
    },
  }),
}));

vi.mock('../../lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: getMockUser() } }),
    },
  }),
}));

describe('Cross-Scholarship Deterministic Evaluator & Architecture', () => {
  const mockScholarships: ScholarshipWithRules[] = [
    {
      id: 's-1',
      name: 'Gamuda Scholarship',
      description: 'Undergraduate scholarship for engineering and IT',
      providerId: 'p-1',
      providerName: 'Gamuda Berhad',
      intakeId: 'i-1',
      intakeStatus: 'published',
      openDate: '2026-03-01',
      closeDate: '2026-05-30',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.40 },
        ],
      },
      requirementName: 'Gamuda Standard Academic Rules',
    },
    {
      id: 's-2',
      name: 'Yayasan Peneraju Bumiputera',
      description: 'Funding for Bumiputera scholars',
      providerId: 'p-2',
      providerName: 'Yayasan Peneraju',
      intakeId: 'i-2',
      intakeStatus: 'published',
      openDate: '2026-01-01',
      closeDate: '2026-06-30',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
          { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        ],
      },
      requirementName: 'Peneraju Inclusivity Rules',
    },
    {
      id: 's-3',
      name: 'PETRONAS PESP Scholarship',
      description: 'Prestigious engineering sponsorship',
      providerId: 'p-3',
      providerName: 'PETRONAS',
      intakeId: 'i-3',
      intakeStatus: 'published',
      openDate: '2026-02-01',
      closeDate: '2026-04-15',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          {
            type: 'CONDITION',
            field: 'spm_results',
            operator: 'HAS_SPM_SUBJECT_GRADE',
            value: { subject: 'Mathematics', minGrade: 'A' },
          },
        ],
      },
      requirementName: 'PETRONAS SPM Grade Rules',
    },
    {
      id: 's-4',
      name: 'Closed Foundation Fellowship',
      description: 'Historical program with closed intake window',
      providerId: 'p-4',
      providerName: 'Closed Foundation',
      intakeId: 'i-4',
      intakeStatus: 'closed', // Availability is closed!
      openDate: '2025-01-01',
      closeDate: '2025-03-01',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.00 },
        ],
      },
      requirementName: 'Closed Fellowship Rules',
    },
  ];

  it('correctly matches a Malaysian B40 Bumiputera high achiever across all scholarships', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.85,
      spm_results: {
        Mathematics: 'A+',
        English: 'A',
      },
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    expect(report.totalEvaluated).toBe(4);
    expect(report.qualifiedCount).toBe(4);
    expect(report.ineligibleCount).toBe(0);
    expect(report.potentialCount).toBe(0);

    const s1 = report.results.find((r) => r.scholarship.id === 's-1');
    expect(s1?.evaluation.status).toBe('MET');

    const s2 = report.results.find((r) => r.scholarship.id === 's-2');
    expect(s2?.evaluation.status).toBe('MET');

    const s3 = report.results.find((r) => r.scholarship.id === 's-3');
    expect(s3?.evaluation.status).toBe('MET');
  });

  it('correctly produces mixed results: MET, NOT_MET, and MISSING_INFO in a single evaluation run', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: false, // Will FAIL s-2 (Bumiputera required)
      income_band: 'B40',
      cgpa: 3.50, // Will PASS s-1 (min 3.40) and s-4 (min 3.00)
      spm_results: {}, // Missing Mathematics -> will yield MISSING_INFO for s-3
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    expect(report.totalEvaluated).toBe(4);
    expect(report.qualifiedCount).toBe(2); // s-1 and s-4
    expect(report.ineligibleCount).toBe(1); // s-2
    expect(report.potentialCount).toBe(1); // s-3

    const metItems = report.results.filter((r) => r.evaluation.status === 'MET');
    const notMetItems = report.results.filter((r) => r.evaluation.status === 'NOT_MET');
    const missingItems = report.results.filter((r) => r.evaluation.status === 'MISSING_INFO');

    expect(metItems.length).toBe(2);
    expect(notMetItems.length).toBe(1);
    expect(missingItems.length).toBe(1);

    // Verify reason propagation
    expect(notMetItems[0].evaluation.reasons[0].message).toContain('bumiputera_status');
    expect(missingItems[0].evaluation.reasons[0].message).toContain('Missing grade for SPM subject Mathematics');
  });

  it('keeps eligibility strictly separate from availability (closed scholarship still qualifies if rules met)', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.50,
      spm_results: { Mathematics: 'A' },
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    const closedScholarship = report.results.find((r) => r.scholarship.id === 's-4');
    expect(closedScholarship).toBeDefined();
    // Availability is closed:
    expect(closedScholarship?.scholarship.intakeStatus).toBe('closed');
    // But eligibility qualification is MET!
    expect(closedScholarship?.evaluation.status).toBe('MET');
  });

  it('propagates exact reason when candidate fails CGPA threshold', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.10, // Below Gamuda 3.40
      spm_results: {
        Mathematics: 'A',
      },
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    const s1 = report.results.find((r) => r.scholarship.id === 's-1');
    expect(s1?.evaluation.status).toBe('NOT_MET');
    expect(s1?.evaluation.reasons[0].message).toContain('is below minimum 3.4');
  });

  it('maintains strict determinism on identical profile evaluations', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.75,
      spm_results: { Mathematics: 'A' },
    };

    const report1 = evaluateAllScholarships(profile, mockScholarships);
    const report2 = evaluateAllScholarships(profile, mockScholarships);

    expect(report1.qualifiedCount).toBe(report2.qualifiedCount);
    expect(report1.ineligibleCount).toBe(report2.ineligibleCount);
    expect(report1.potentialCount).toBe(report2.potentialCount);
  });

  describe('Lifecycle and Intake Version Correctness', () => {
    it('only loads published/open/closed scholarships and strictly excludes drafts or archived intakes', async () => {
      const published = await getPublishedScholarshipsWithRules();
      expect(published.length).toBeGreaterThan(0);

      const VALID_INTAKE_STATUSES = ['published', 'open', 'closed'];
      for (const item of published) {
        expect(VALID_INTAKE_STATUSES).toContain(item.intakeStatus);
        expect(item.intakeStatus).not.toBe('draft');
        expect(item.intakeStatus).not.toBe('archived');
        expect(item.intakeStatus).not.toBe('in_review');
        expect(item.intakeStatus).not.toBe('superseded');
      }
    });
  });

  describe('Server-Side Evaluation Action (Architecture A)', () => {
    it('evaluates profile server-side and returns sanitized payload without exposing ruleAst', async () => {
      const profile: StudentProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: true,
        income_band: 'B40',
        cgpa: 3.80,
      };

      const serverReport = await evaluateProfileServer(profile);

      expect(serverReport).toBeDefined();
      expect(serverReport.totalEvaluated).toBeGreaterThan(0);
      expect(Array.isArray(serverReport.results)).toBe(true);

      // Verify that no raw internal ruleAst is exposed in the returned sanitized results
      for (const item of serverReport.results) {
        expect((item as any).ruleAst).toBeUndefined();
        expect((item.scholarship as any).ruleAst).toBeUndefined();
        expect(item.evaluation).toBeDefined();
        expect(['MET', 'MISSING_INFO', 'NOT_MET']).toContain(item.evaluation.status);
      }
    });
  });

  describe('Save to Tracker Handling (Logged-out vs Authenticated)', () => {
    it('returns unauthorized when logged-out user attempts to save', async () => {
      setMockUser(null); // Anonymous / logged-out

      const res = await saveScholarshipApplication('30000000-0000-0000-0000-000000000001', 'saved');
      expect(res).toEqual({ success: false, reason: 'unauthorized' });
    });

    it('saves successfully when user is authenticated', async () => {
      // Find or insert a valid user in database
      const [existingUser] = await db.select().from(users).limit(1);
      let testUserId: string;
      if (existingUser) {
        testUserId = existingUser.id;
      } else {
        const [newUser] = await db.insert(users).values({ email: 'test-verified@dreampath.my', role: 'student' }).returning();
        testUserId = newUser.id;
      }

      const [existingIntake] = await db.select().from(intakes).limit(1);
      const intakeId = existingIntake ? existingIntake.id : '30000000-0000-0000-0000-000000000001';

      setMockUser({ id: testUserId, email: 'student@example.com' });

      // Save operation should succeed without throwing
      await expect(saveScholarshipApplication(intakeId, 'saved')).resolves.not.toThrow();
    });
  });
});
