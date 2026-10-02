import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { validateRequirementNode, RequirementNode } from '../schema';
import { db } from '@/db';
import { intakes, intakeVersions, requirements, scholarships, users, providers } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase SSR
const mockSupabaseAuth = {
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: mockSupabaseAuth,
  })),
}));

import { updateRequirements, updateIntakeEvidence, transitionIntakeStatus } from '@/app/actions/admin';
import { register } from '@/app/actions/auth';

describe('DreamPath Phase 1 — Scholarship Trust & Data Integrity Hardening', () => {
  const adminId = crypto.randomUUID();
  const adminEmail = `admin-${Date.now()}@dreampath.my`;

  const createdProviderIds: string[] = [];
  const createdScholarshipIds: string[] = [];
  const createdIntakeIds: string[] = [];
  const createdVersionIds: string[] = [];
  const createdReqIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Ensure mock admin auth is configured
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: { id: adminId, email: adminEmail },
      },
      error: null,
    });

    // Seed admin in users table if not present
    const existing = await db.select().from(users).where(eq(users.id, adminId));
    if (existing.length === 0) {
      await db.insert(users).values({
        id: adminId,
        email: adminEmail,
        role: 'admin',
      });
    }
  });

  afterAll(async () => {
    try {
      if (createdReqIds.length > 0) {
        await db.delete(requirements).where(inArray(requirements.id, createdReqIds));
      }
      if (createdVersionIds.length > 0) {
        await db.delete(intakeVersions).where(inArray(intakeVersions.id, createdVersionIds));
      }
      if (createdIntakeIds.length > 0) {
        await db.delete(intakes).where(inArray(intakes.id, createdIntakeIds));
      }
      if (createdScholarshipIds.length > 0) {
        await db.delete(scholarships).where(inArray(scholarships.id, createdScholarshipIds));
      }
      if (createdProviderIds.length > 0) {
        await db.delete(providers).where(inArray(providers.id, createdProviderIds));
      }
      await db.delete(users).where(eq(users.id, adminId));
    } catch {
      // Best-effort cleanup
    }
  });

  describe('1. Requirement AST Validation', () => {
    it('validates a standard comparison AST successfully', () => {
      const validAst: RequirementNode = {
        type: 'CONDITION',
        field: 'cgpa',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 3.5,
      };

      const result = validateRequirementNode(validAst);
      expect(result).toEqual(validAst);
    });

    it('validates a composite logical ALL / ANY AST', () => {
      const compositeAst: RequirementNode = {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          {
            type: 'ANY',
            nodes: [
              { type: 'CONDITION', field: 'incomeBand', operator: 'EQUALS', value: 'B40' },
              { type: 'CONDITION', field: 'householdIncome', operator: 'LESS_THAN_OR_EQUAL', value: 4850 },
            ],
          },
        ],
      };

      const result = validateRequirementNode(compositeAst);
      expect(result).toEqual(compositeAst);
    });

    it('rejects an AST with an invalid/unsupported operator', () => {
      const invalidAst = {
        field: 'cgpa',
        operator: 'eval_code',
        value: 'true',
        type: 'string',
      };

      expect(() => validateRequirementNode(invalidAst as any)).toThrow();
    });

    it('rejects an AST with missing required fields', () => {
      const malformedAst = {
        operator: 'eq',
        // missing field and value
      };

      expect(() => validateRequirementNode(malformedAst as any)).toThrow();
    });
  });

  describe('2. Publication Evidence Gate', () => {
    it('rejects transition to published if intake has no version', async () => {
      const providerId = crypto.randomUUID();
      createdProviderIds.push(providerId);
      await db.insert(providers).values({ id: providerId, name: 'Test Provider' });

      const scholarshipId = crypto.randomUUID();
      createdScholarshipIds.push(scholarshipId);
      await db.insert(scholarships).values({ id: scholarshipId, providerId, name: 'No Version Award' });

      const intakeId = crypto.randomUUID();
      createdIntakeIds.push(intakeId);
      await db.insert(intakes).values({
        id: intakeId,
        scholarshipId,
        year: 2026,
        status: 'draft',
      });

      await expect(transitionIntakeStatus(intakeId, 'published')).rejects.toThrow(
        'Intake must have at least one intake version'
      );
    });

    it('rejects transition to published if sourceUrl is missing or whitespace', async () => {
      const providerId = crypto.randomUUID();
      createdProviderIds.push(providerId);
      await db.insert(providers).values({ id: providerId, name: 'Test Provider' });

      const scholarshipId = crypto.randomUUID();
      createdScholarshipIds.push(scholarshipId);
      await db.insert(scholarships).values({ id: scholarshipId, providerId, name: 'Unverified Award' });

      const intakeId = crypto.randomUUID();
      createdIntakeIds.push(intakeId);
      await db.insert(intakes).values({
        id: intakeId,
        scholarshipId,
        year: 2026,
        status: 'draft',
      });

      const versionId = crypto.randomUUID();
      createdVersionIds.push(versionId);
      await db.insert(intakeVersions).values({
        id: versionId,
        intakeId,
        versionNum: 1,
        sourceUrl: '   ', // empty/whitespace
      });

      await expect(transitionIntakeStatus(intakeId, 'published')).rejects.toThrow(
        'Intake version must have an authoritative official source URL'
      );
    });

    it('rejects transition to published if no eligibility requirements exist', async () => {
      const providerId = crypto.randomUUID();
      createdProviderIds.push(providerId);
      await db.insert(providers).values({ id: providerId, name: 'Test Provider' });

      const scholarshipId = crypto.randomUUID();
      createdScholarshipIds.push(scholarshipId);
      await db.insert(scholarships).values({ id: scholarshipId, providerId, name: 'Award Without Req' });

      const intakeId = crypto.randomUUID();
      createdIntakeIds.push(intakeId);
      await db.insert(intakes).values({
        id: intakeId,
        scholarshipId,
        year: 2026,
        status: 'draft',
      });

      const versionId = crypto.randomUUID();
      createdVersionIds.push(versionId);
      await db.insert(intakeVersions).values({
        id: versionId,
        intakeId,
        versionNum: 1,
        sourceUrl: 'https://example.gov.my/scholarship-official',
      });

      await expect(transitionIntakeStatus(intakeId, 'published')).rejects.toThrow(
        'Intake version must have eligibility requirements defined'
      );
    });

    it('successfully publishes when official sourceUrl and requirements are present', async () => {
      const providerId = crypto.randomUUID();
      createdProviderIds.push(providerId);
      await db.insert(providers).values({ id: providerId, name: 'Verified Provider' });

      const scholarshipId = crypto.randomUUID();
      createdScholarshipIds.push(scholarshipId);
      await db.insert(scholarships).values({ id: scholarshipId, providerId, name: 'Fully Verified Award' });

      const intakeId = crypto.randomUUID();
      createdIntakeIds.push(intakeId);
      await db.insert(intakes).values({
        id: intakeId,
        scholarshipId,
        year: 2026,
        status: 'draft',
      });

      const versionId = crypto.randomUUID();
      createdVersionIds.push(versionId);
      await db.insert(intakeVersions).values({
        id: versionId,
        intakeId,
        versionNum: 1,
        sourceUrl: 'https://verified.gov.my/official-intake-2026',
      });

      const reqId = crypto.randomUUID();
      createdReqIds.push(reqId);
      await db.insert(requirements).values({
        id: reqId,
        intakeVersionId: versionId,
        name: 'Minimum CGPA',
        ruleAst: { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
      });

      await transitionIntakeStatus(intakeId, 'published');

      const [updated] = await db.select().from(intakes).where(eq(intakes.id, intakeId));
      expect(updated.status).toBe('published');
    });
  });

  describe('3. Version Immutability', () => {
    it('rejects updateRequirements on published intake', async () => {
      const providerId = crypto.randomUUID();
      createdProviderIds.push(providerId);
      await db.insert(providers).values({ id: providerId, name: 'Immutable Provider' });

      const scholarshipId = crypto.randomUUID();
      createdScholarshipIds.push(scholarshipId);
      await db.insert(scholarships).values({ id: scholarshipId, providerId, name: 'Immutable Award' });

      const intakeId = crypto.randomUUID();
      createdIntakeIds.push(intakeId);
      await db.insert(intakes).values({
        id: intakeId,
        scholarshipId,
        year: 2026,
        status: 'published',
      });

      const versionId = crypto.randomUUID();
      createdVersionIds.push(versionId);
      await db.insert(intakeVersions).values({
        id: versionId,
        intakeId,
        versionNum: 1,
        sourceUrl: 'https://example.gov.my/official',
      });

      await expect(
        updateRequirements(versionId, 'New Rule', {
          type: 'CONDITION',
          field: 'cgpa',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 3.7,
        })
      ).rejects.toThrow('Cannot mutate a published or closed intake version');
    });

    it('rejects updateIntakeEvidence on published intake', async () => {
      const providerId = crypto.randomUUID();
      createdProviderIds.push(providerId);
      await db.insert(providers).values({ id: providerId, name: 'Evidence Provider' });

      const scholarshipId = crypto.randomUUID();
      createdScholarshipIds.push(scholarshipId);
      await db.insert(scholarships).values({ id: scholarshipId, providerId, name: 'Evidence Award' });

      const intakeId = crypto.randomUUID();
      createdIntakeIds.push(intakeId);
      await db.insert(intakes).values({
        id: intakeId,
        scholarshipId,
        year: 2026,
        status: 'published',
      });

      const versionId = crypto.randomUUID();
      createdVersionIds.push(versionId);
      await db.insert(intakeVersions).values({
        id: versionId,
        intakeId,
        versionNum: 1,
        sourceUrl: 'https://example.gov.my/official',
      });

      await expect(
        updateIntakeEvidence(versionId, 'https://new-url.com', 'Changed notes')
      ).rejects.toThrow('Cannot mutate evidence for a published or closed intake version');
    });
  });

  describe('4. Registration Full Name Preservation', () => {
    it('passes fullName into Supabase Auth user metadata during registration', async () => {
      const testEmail = `newstudent-${Date.now()}@example.com`;
      const testFullName = 'Nur Aisyah binti Ahmad';
      const studentUuid = crypto.randomUUID();

      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: {
          user: {
            id: studentUuid,
            email: testEmail,
            user_metadata: { full_name: testFullName },
          },
          session: null,
        },
        error: null,
      });

      const formData = new FormData();
      formData.set('fullName', testFullName);
      formData.set('email', testEmail);
      formData.set('password', 'StrongPass123!');

      try {
        await register(formData);
      } catch (err: any) {
        if (!err.message?.startsWith('NEXT_REDIRECT')) throw err;
      }

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: testEmail,
        password: 'StrongPass123!',
        options: {
          data: {
            full_name: testFullName,
          },
        },
      });
    });
  });
});
