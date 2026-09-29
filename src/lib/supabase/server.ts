import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('mock') && !supabaseUrl.includes('your-project')) {
    try {
      return createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in Server Components
            }
          },
        },
      });
    } catch (e) {
      console.warn('[AI Studio] Supabase createServerClient initialization failed, using mock auth:', e);
    }
  }

  // Preview mode auth adapter (cookie-backed session)
  return {
    auth: {
      async getUser() {
        const sessionCookie = cookieStore.get('sb-session')?.value;
        if (sessionCookie) {
          try {
            const user = JSON.parse(decodeURIComponent(sessionCookie));
            return { data: { user }, error: null };
          } catch {
            return { data: { user: null }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      },
      async getSession() {
        const sessionCookie = cookieStore.get('sb-session')?.value;
        if (sessionCookie) {
          try {
            const user = JSON.parse(decodeURIComponent(sessionCookie));
            return { data: { session: { user, access_token: 'mock-access-token' } }, error: null };
          } catch {
            return { data: { session: null }, error: null };
          }
        }
        return { data: { session: null }, error: null };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        const isEmailAdmin = email.toLowerCase().includes('admin');
        const role = isEmailAdmin ? 'admin' : 'student';
        const user = {
          id: isEmailAdmin ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
          email,
          role,
          user_metadata: { role },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };

        try {
          cookieStore.set('sb-session', encodeURIComponent(JSON.stringify(user)), {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });
        } catch {
          // Ignore if called in read-only context
        }

        return { data: { user, session: { user, access_token: 'mock-access-token' } }, error: null };
      },
      async signUp({ email }: { email: string; password?: string }) {
        const isEmailAdmin = email.toLowerCase().includes('admin');
        const role = isEmailAdmin ? 'admin' : 'student';
        const user = {
          id: crypto.randomUUID(),
          email,
          role,
          user_metadata: { role },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };

        try {
          cookieStore.set('sb-session', encodeURIComponent(JSON.stringify(user)), {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });
        } catch {
          // Ignore if called in read-only context
        }

        return { data: { user, session: { user, access_token: 'mock-access-token' } }, error: null };
      },
      async signOut() {
        try {
          cookieStore.delete('sb-session');
        } catch {}
        return { error: null };
      },
    },
  } as any;
}
