import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { scholarships, providers, intakes, intakeVersions, requirements, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Mock next/headers and next/cache
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => mockCookieStore),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockAdminId = '99999999-9999-9999-9999-999999999999';
const mockSupabaseAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: mockAdminId, email: 'admin-test@dreampath.my' } },
  }),
};
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}));

import { createCompleteScholarship, CompleteScholarshipInput } from '@/app/actions/admin';

describe('Admin Complete Scholarship Management', () => {
  beforeEach(async () => {
    // Ensure mock admin user is in DB and has role admin
    const [existing] = await db.select().from(users).where(eq(users.id, mockAdminId));
    if (!existing) {
      await db.insert(users).values({
        id: mockAdminId,
        email: 'admin-test@dreampath.my',
        role: 'admin',
      });
    } else if (existing.role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, mockAdminId));
    }
  });

  it('creates a complete authoritative scholarship atomically with matching student data model', async () => {
    // 1. Prepare input
    const uniqueSuffix = Date.now();
    const testInput: CompleteScholarshipInput = {
      newProvider: {
        name: `Yayasan Test Provider ${uniqueSuffix}`,
        url: 'https://test-provider.org.my',
        description: 'Verified test scholarship foundation.',
      },
      name: `Yayasan Test Leadership Scholarship ${uniqueSuffix}`,
      description: 'Full degree sponsorship covering tuition fees and monthly allowance for engineering students.',
      year: 2026,
      openDate: '2026-04-01',
      closeDate: '2026-08-31',
      sourceUrl: 'https://test-provider.org.my/scholarships/2026-guidelines',
      evidenceNotes: 'Verified official circular v1.0.',
      ruleAst: {
        type: 'ALL',
        nodes: [
          {
            type: 'CONDITION',
            field: 'citizenship',
            operator: 'EQUALS',
            value: 'Malaysian',
          },
          {
            type: 'CONDITION',
            field: 'cgpa',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 3.60,
          },
        ],
      },
      selectionStages: [
        {
          id: 's1',
          name: 'Online Assessment',
          type: 'assessment_centre',
          description: 'Cognitive and aptitude test.',
        },
        {
          id: 's2',
          name: 'Final Selection Board Interview',
          type: 'interview',
          description: 'Panel evaluation with board.',
        },
      ],
      publishImmediately: true,
    };

    // 2. Execute creation
    const { scholarshipId, intakeId, versionId } = await createCompleteScholarship(testInput);

    expect(scholarshipId).toBeDefined();
    expect(intakeId).toBeDefined();
    expect(versionId).toBeDefined();

    // 3. Verify in database that it matches the exact student scholarship representation
    const [fetchedScholarship] = await db
      .select()
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .where(eq(scholarships.id, scholarshipId));

    expect(fetchedScholarship.scholarships.name).toBe(testInput.name);
    expect(fetchedScholarship.providers.name).toBe(testInput.newProvider!.name);

    const [fetchedIntake] = await db
      .select()
      .from(intakes)
      .where(eq(intakes.id, intakeId));

    expect(fetchedIntake.status).toBe('published');
    expect(fetchedIntake.year).toBe(2026);
    expect(fetchedIntake.openDate).toBe('2026-04-01');
    expect(fetchedIntake.closeDate).toBe('2026-08-31');

    const [fetchedVersion] = await db
      .select()
      .from(intakeVersions)
      .where(eq(intakeVersions.id, versionId));

    expect(fetchedVersion.sourceUrl).toBe(testInput.sourceUrl);

    const [fetchedReq] = await db
      .select()
      .from(requirements)
      .where(eq(requirements.intakeVersionId, versionId));

    expect(fetchedReq.ruleAst.type).toBe('ALL');
    expect(fetchedReq.selectionStages).toHaveLength(2);
    expect(fetchedReq.selectionStages![0].type).toBe('assessment_centre');

    // Clean up test records
    await db.delete(requirements).where(eq(requirements.intakeVersionId, versionId));
    await db.delete(intakeVersions).where(eq(intakeVersions.id, versionId));
    await db.delete(intakes).where(eq(intakes.id, intakeId));
    await db.delete(scholarships).where(eq(scholarships.id, scholarshipId));
    await db.delete(providers).where(eq(providers.id, fetchedScholarship.providers.id));
    await db.delete(users).where(eq(users.id, mockAdminId));
  });
});
