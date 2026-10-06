import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { db } from '@/db';
import { studentProfiles, users } from '@/db/schema';
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

const mockStudentId = '77777777-7777-7777-7777-777777777777';
const mockSupabaseAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: mockStudentId, email: 'student-profile-test@dreampath.my' } },
  }),
};
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}));

import { updateStudentProfile } from '@/app/actions/student';

describe('Student Profile Persistence', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: mockStudentId, email: 'student-profile-test@dreampath.my' } },
    });

    // Ensure mock student is in users table
    const [existingUser] = await db.select().from(users).where(eq(users.id, mockStudentId));
    if (!existingUser) {
      await db.insert(users).values({
        id: mockStudentId,
        email: 'student-profile-test@dreampath.my',
        role: 'student',
      });
    }

    // Clean up any existing profile for this mock student
    await db.delete(studentProfiles).where(eq(studentProfiles.userId, mockStudentId));
  });

  it('saves new academic profile without resetting or throwing errors', async () => {
    const res = await updateStudentProfile({
      citizenship: 'Malaysian',
      bumiputeraStatus: true,
      incomeBand: 'B40',
      cgpa: '3.96',
      spmResults: {
        'Bahasa Melayu': 'A+',
        English: 'A',
        Mathematics: 'A+',
        'Additional Mathematics': 'A',
      },
    });

    expect(res?.success).toBe(true);

    const [saved] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, mockStudentId));
    expect(saved).toBeDefined();
    expect(saved?.citizenship).toBe('Malaysian');
    expect(saved?.bumiputeraStatus).toBe(true);
    expect(saved?.incomeBand).toBe('B40');
    expect(saved?.cgpa).toBe('3.96');
    expect((saved?.spmResults as any)['Mathematics']).toBe('A+');
  });

  it('updates existing academic profile cleanly on subsequent saves', async () => {
    // Initial insert
    await updateStudentProfile({
      citizenship: 'Malaysian',
      bumiputeraStatus: false,
      incomeBand: 'M40',
      cgpa: '3.50',
      spmResults: {},
    });

    // Subsequent update
    const res = await updateStudentProfile({
      citizenship: 'Malaysian',
      bumiputeraStatus: true,
      incomeBand: 'B40',
      cgpa: '3.96',
      spmResults: {
        Mathematics: 'A+',
      },
    });

    expect(res?.success).toBe(true);

    const [updated] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, mockStudentId));
    expect(updated?.bumiputeraStatus).toBe(true);
    expect(updated?.incomeBand).toBe('B40');
    expect(updated?.cgpa).toBe('3.96');
    expect((updated?.spmResults as any)['Mathematics']).toBe('A+');
  });

  it('supports FormData input format for backwards compatibility', async () => {
    const formData = new FormData();
    formData.append('citizenship', 'Permanent Resident');
    formData.append('bumiputeraStatus', 'false');
    formData.append('incomeBand', 'T20');
    formData.append('cgpa', '3.80');
    formData.append('spm_math', 'A');
    formData.append('spm_bm', 'B+');

    const res = await updateStudentProfile(formData);
    expect(res?.success).toBe(true);

    const [saved] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, mockStudentId));
    expect(saved?.citizenship).toBe('Permanent Resident');
    expect(saved?.bumiputeraStatus).toBe(false);
    expect(saved?.incomeBand).toBe('T20');
    expect(saved?.cgpa).toBe('3.80');
    expect((saved?.spmResults as any)['Mathematics']).toBe('A');
    expect((saved?.spmResults as any)['Bahasa Melayu']).toBe('B+');
  });

  afterAll(async () => {
    try {
      await db.delete(studentProfiles).where(eq(studentProfiles.userId, mockStudentId));
      await db.delete(users).where(eq(users.id, mockStudentId));
    } catch {
      // Best-effort cleanup
    }
  });
});
