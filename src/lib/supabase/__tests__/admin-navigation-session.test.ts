import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '../middleware';

const mockSupabaseAuth = {
  getUser: vi.fn(),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url, key, config) => {
    // If setAll is defined in config, test its cookie setting logic
    if (config?.cookies?.setAll) {
      config.cookies.setAll([
        {
          name: 'sb-access-token',
          value: 'refreshed-token-xyz',
          options: { maxAge: 3600 },
        },
      ]);
    }
    return {
      auth: mockSupabaseAuth,
    };
  }),
}));

describe('Admin Navigation & Session Persistence Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-valid';
  });

  describe('Session Persistence via Middleware', () => {
    it('sets refreshed session cookies on response with root path and lax SameSite', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'test-user-id', email: 'test@dreampath.my' } },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/student');
      const response = await updateSession(request);

      const cookie = response.cookies.get('sb-access-token');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('refreshed-token-xyz');
      expect(cookie?.path).toBe('/');
      expect(cookie?.sameSite).toBe('lax');
    });

    it('protects /admin route by redirecting unauthenticated visitors to /login', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/admin');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fadmin');
    });

    it('protects /admin/users route by redirecting unauthenticated visitors to /login', async () => {
      mockSupabaseAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/admin/users');
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fadmin%2Fusers');
    });
  });
});
