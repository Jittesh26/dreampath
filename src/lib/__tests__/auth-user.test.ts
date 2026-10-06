import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const mockUserId = '55555555-5555-5555-5555-555555555555';
const createdUserIds: string[] = [mockUserId];
const mockSupabaseAuth = {
  getUser: vi.fn(),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  })),
}));

import { getAuthenticatedUser } from '../auth-user';

describe('Unified Server-Side Auth User Retrieval (getAuthenticatedUser)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it('returns null when Supabase session is unauthenticated (logged-out)', async () => {
    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const user = await getAuthenticatedUser();
    expect(user).toBeNull();
  });

  it('returns authenticated student identity with name and role', async () => {
    const studentEmail = `student-${Date.now()}@dreampath.my`;

    // Ensure student exists in DB
    await db.insert(users).values({
      id: mockUserId,
      email: studentEmail,
      role: 'student',
    }).onConflictDoNothing();

    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: mockUserId,
          email: studentEmail,
          user_metadata: { full_name: 'Faiz Hakimi' },
        },
      },
      error: null,
    });

    const user = await getAuthenticatedUser();
    expect(user).not.toBeNull();
    expect(user?.name).toBe('Faiz Hakimi');
    expect(user?.email).toBe(studentEmail);
    expect(user?.role).toBe('student');
  });

  it('returns authenticated admin identity and resolves role = admin', async () => {
    const adminEmail = `admin-header-${Date.now()}@dreampath.my`;
    const adminId = crypto.randomUUID();
    createdUserIds.push(adminId);

    await db.insert(users).values({
      id: adminId,
      email: adminEmail,
      role: 'admin',
    });

    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: adminId,
          email: adminEmail,
          user_metadata: { full_name: 'Jittesh' },
        },
      },
      error: null,
    });

    const user = await getAuthenticatedUser();
    expect(user).not.toBeNull();
    expect(user?.name).toBe('Jittesh');
    expect(user?.email).toBe(adminEmail);
    expect(user?.role).toBe('admin');
  });

  it('falls back gracefully to email username when full_name is omitted', async () => {
    const emailOnly = `norazlan-${Date.now()}@gmail.com`;
    const userId = crypto.randomUUID();
    createdUserIds.push(userId);

    await db.insert(users).values({
      id: userId,
      email: emailOnly,
      role: 'student',
    });

    mockSupabaseAuth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: userId,
          email: emailOnly,
          user_metadata: {},
        },
      },
      error: null,
    });

    const user = await getAuthenticatedUser();
    expect(user).not.toBeNull();
    expect(user?.name).toBe(emailOnly.split('@')[0]);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await db.delete(users).where(inArray(users.id, createdUserIds));
      }
    } catch {
      // Best-effort cleanup
    }
  });
});
