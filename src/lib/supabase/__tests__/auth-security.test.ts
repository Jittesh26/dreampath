import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  useSearchParams: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/headers
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => mockCookieStore),
}));

// Mock Supabase SSR
const mockSupabaseAuth = {
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
  createBrowserClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
  })),
}));

import { createClient as createServerSupabaseClient } from '../server';
import { createClient as createBrowserSupabaseClient } from '../client';
import { updateSession } from '../middleware';
import { login, register, logout } from '@/app/actions/auth';
import { requireAdmin } from '@/app/actions/admin';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('DreamPath Phase 0 — Authentication Security Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-valid';
  });

  describe('Test 1 — Invalid password', () => {
    it('does not create an authenticated application session when credentials are invalid', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const formData = new FormData();
      formData.set('email', 'student@example.com');
      formData.set('password', 'wrongpassword');

      const result = await login(formData);

      expect(result).toBeDefined();
      expect(result?.error).toBe('Invalid login credentials');
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe('Test 2 — Failed authentication cannot auto-provision', () => {
    it('does not create a new local users row when authentication fails', async () => {
      const nonExistentEmail = `unknown-${Date.now()}@example.com`;

      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User not found' },
      });

      const formData = new FormData();
      formData.set('email', nonExistentEmail);
      formData.set('password', 'somepassword');

      const result = await login(formData);

      expect(result?.error).toBe('User not found');

      // Verify the user was NOT provisioned into the database
      const rows = await db.select().from(users).where(eq(users.email, nonExistentEmail));
      expect(rows.length).toBe(0);
    });
  });

  describe('Test 3 — Email cannot grant admin', () => {
    it('defaults newly registered users with admin in email to student role', async () => {
      const adminLookingEmail = `admin-candidate-${Date.now()}@dreampath.my`;
      const generatedUserId = crypto.randomUUID();

      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: {
          user: {
            id: generatedUserId,
            email: adminLookingEmail,
          },
          session: null,
        },
        error: null,
      });

      const formData = new FormData();
      formData.set('email', adminLookingEmail);
      formData.set('password', 'ValidPass123!');

      try {
        await register(formData);
      } catch (err: any) {
        if (!err.message?.startsWith('NEXT_REDIRECT')) throw err;
      }

      // Check DB row
      const [insertedUser] = await db.select().from(users).where(eq(users.id, generatedUserId));
      expect(insertedUser).toBeDefined();
      expect(insertedUser.role).toBe('student');
      expect(insertedUser.role).not.toBe('admin');
    });

    it('redirects an authenticated user with admin in email to /student if their DB role is student', async () => {
      const studentId = crypto.randomUUID();
      const studentEmail = `admin-lookalike-${Date.now()}@example.com`;

      await db.insert(users).values({
        id: studentId,
        email: studentEmail,
        role: 'student',
      });

      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: studentId, email: studentEmail },
          session: { access_token: 'valid-jwt' },
        },
        error: null,
      });

      const formData = new FormData();
      formData.set('email', studentEmail);
      formData.set('password', 'correctpassword');

      try {
        await login(formData);
      } catch (err: any) {
        if (!err.message?.startsWith('NEXT_REDIRECT')) throw err;
      }

      expect(mockRedirect).toHaveBeenCalledWith('/student');
      expect(mockRedirect).not.toHaveBeenCalledWith('/admin');
    });
  });

  describe('Test 4 — Forged dreampath_session', () => {
    it('cannot authenticate as an arbitrary user via forged dreampath_session cookie', async () => {
      const forgedPayload = encodeURIComponent(
        JSON.stringify({
          id: 'victim-uuid-1234',
          email: 'victim@dreampath.my',
          role: 'admin',
        })
      );

      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'dreampath_session') {
          return { value: forgedPayload };
        }
        return undefined;
      });

      // Supabase says unauthenticated
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      });

      const serverClient = await createServerSupabaseClient();
      const { data } = await serverClient.auth.getUser();

      // Must be null, NOT the forged victim user
      expect(data.user).toBeNull();

      // Browser client without env vars also returns unauthenticated null
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      const browserClient = createBrowserSupabaseClient();
      const browserRes = await browserClient.auth.getUser();
      expect(browserRes.data.user).toBeNull();
    });
  });

  describe('Test 5 — Forged admin identity', () => {
    it('blocks access to requireAdmin even if a forged admin cookie is present', async () => {
      const forgedPayload = encodeURIComponent(
        JSON.stringify({
          id: 'forged-admin-uuid',
          email: 'forged-admin@dreampath.my',
          role: 'admin',
        })
      );

      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'dreampath_session') {
          return { value: forgedPayload };
        }
        return undefined;
      });

      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(requireAdmin()).rejects.toThrow('Unauthorized: Authentication required.');
    });
  });

  describe('Test 6 — Real admin still works', () => {
    it('allows access to requireAdmin when Supabase user has role = admin in DB', async () => {
      const adminId = crypto.randomUUID();
      const adminEmail = `verified-admin-${Date.now()}@dreampath.my`;

      await db.insert(users).values({
        id: adminId,
        email: adminEmail,
        role: 'admin',
      });

      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: {
          user: { id: adminId, email: adminEmail },
        },
        error: null,
      });

      const result = await requireAdmin();
      expect(result).toBe(true);
    });
  });

  describe('Test 7 — Real student remains blocked', () => {
    it('blocks legitimate Supabase student from passing requireAdmin', async () => {
      const studentId = crypto.randomUUID();
      const studentEmail = `verified-student-${Date.now()}@dreampath.my`;

      await db.insert(users).values({
        id: studentId,
        email: studentEmail,
        role: 'student',
      });

      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: {
          user: { id: studentId, email: studentEmail },
        },
        error: null,
      });

      await expect(requireAdmin()).rejects.toThrow('Forbidden: Insufficient privileges.');
    });
  });

  describe('Test 8 — Logout', () => {
    it('invalidates authentication session via Supabase and redirects to /login', async () => {
      mockSupabaseAuth.signOut.mockResolvedValueOnce({ error: null });

      try {
        await logout();
      } catch (err: any) {
        if (!err.message?.startsWith('NEXT_REDIRECT')) throw err;
      }

      expect(mockSupabaseAuth.signOut).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });
  });

  describe('Test 9 — Middleware', () => {
    it('redirects unauthenticated user visiting /student to /login with redirect query param', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/student');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fstudent');
    });

    it('redirects unauthenticated user visiting /admin to /login with redirect query param', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/admin');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fadmin');
    });

    it('allows authenticated student to access /student without redirecting to login', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'student-uuid', email: 'student@example.com' } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/student');
      const response = await updateSession(request);

      // Status should NOT be redirect to login
      expect(response.status).not.toBe(307);
      expect(response.headers.get('location')).toBeNull();
    });

    it('redirects authenticated user visiting /login to /student to prevent loops', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'student-uuid', email: 'student@example.com' } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/login');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/student');
    });
  });
});
