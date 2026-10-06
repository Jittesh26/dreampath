import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

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

const mockAdminId = '88888888-8888-8888-8888-888888888888';
const createdUserIds: string[] = [mockAdminId];
const mockSupabaseAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: mockAdminId, email: 'role-admin@dreampath.my' } },
  }),
};
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}));

import { updateUserRole } from '@/app/actions/admin';

describe('Admin User Role Management & Promotion', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: mockAdminId, email: 'role-admin@dreampath.my' } },
    });

    // Ensure mock admin exists in DB
    const [existing] = await db.select().from(users).where(eq(users.id, mockAdminId));
    if (!existing) {
      await db.insert(users).values({
        id: mockAdminId,
        email: 'role-admin@dreampath.my',
        role: 'admin',
      });
    } else if (existing.role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, mockAdminId));
    }
  });

  it('allows an authenticated admin to promote a student to admin', async () => {
    const studentId = crypto.randomUUID();
    const studentEmail = `student-promote-${Date.now()}@test.my`;
    createdUserIds.push(studentId);

    await db.insert(users).values({
      id: studentId,
      email: studentEmail,
      role: 'student',
    });

    const result = await updateUserRole(studentId, 'admin');
    expect(result.success).toBe(true);

    const [updated] = await db.select().from(users).where(eq(users.id, studentId));
    expect(updated?.role).toBe('admin');
  });

  it('allows demoting an admin to student when another admin exists', async () => {
    const secondAdminId = crypto.randomUUID();
    const secondAdminEmail = `admin-second-${Date.now()}@test.my`;
    createdUserIds.push(secondAdminId);

    await db.insert(users).values({
      id: secondAdminId,
      email: secondAdminEmail,
      role: 'admin',
    });

    const result = await updateUserRole(secondAdminId, 'student');
    expect(result.success).toBe(true);

    const [updated] = await db.select().from(users).where(eq(users.id, secondAdminId));
    expect(updated?.role).toBe('student');
  });

  it('blocks demoting an admin if they are the only remaining administrator', async () => {
    const origSelect = db.select.bind(db);
    const selectSpy = vi.spyOn(db, 'select').mockImplementation(((fields?: any) => {
      const builder = origSelect(fields);
      // When selecting { id: users.id } to count admins
      if (fields && typeof fields === 'object' && 'id' in fields) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ id: mockAdminId }]),
          }),
        } as any;
      }
      return builder;
    }) as any);

    try {
      await expect(updateUserRole(mockAdminId, 'student')).rejects.toThrow(
        'Cannot demote the last remaining administrator.'
      );
    } finally {
      selectSpy.mockRestore();
    }

    const [stillAdmin] = await db.select().from(users).where(eq(users.id, mockAdminId));
    expect(stillAdmin?.role).toBe('admin');
  });

  it('blocks non-admin users from invoking updateUserRole', async () => {
    const studentUserId = crypto.randomUUID();
    const studentUserEmail = `unauth-student-${Date.now()}@test.my`;
    createdUserIds.push(studentUserId);

    await db.insert(users).values({
      id: studentUserId,
      email: studentUserEmail,
      role: 'student',
    });

    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: { user: { id: studentUserId, email: studentUserEmail } },
    });

    await expect(updateUserRole(studentUserId, 'admin')).rejects.toThrow(
      'Forbidden: Insufficient privileges.'
    );
  });

  it('blocks unauthenticated requests from invoking updateUserRole', async () => {
    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    await expect(updateUserRole(mockAdminId, 'student')).rejects.toThrow(
      'Unauthorized: Authentication required.'
    );
  });

  it('validates invalid role parameters and non-existent users', async () => {
    await expect(updateUserRole(mockAdminId, 'superadmin' as any)).rejects.toThrow(
      'Invalid role specified. Must be either "student" or "admin".'
    );

    const nonExistentId = crypto.randomUUID();
    await expect(updateUserRole(nonExistentId, 'admin')).rejects.toThrow(
      'User not found.'
    );
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await db.delete(users).where(inArray(users.id, createdUserIds));
      }
    } catch {
      // Best-effort cleanup
    }

    // Re-verify that dedicated admin remains admin
    const [dedicatedAdmin] = await db.select().from(users).where(eq(users.email, 'jitteshamaran26@gmail.com'));
    if (dedicatedAdmin) {
      expect(dedicatedAdmin.role).toBe('admin');
    }
  });
});
