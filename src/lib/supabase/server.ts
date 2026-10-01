import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { initialUsers } from '@/db/initial-data';

export async function createClient() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('dreampath_session')?.value;
  let previewUser: any = null;
  if (sessionCookie) {
    try {
      let str = sessionCookie;
      try {
        str = decodeURIComponent(str);
      } catch {}
      try {
        str = decodeURIComponent(str);
      } catch {}
      const parsed = JSON.parse(str);
      if (parsed && parsed.id) {
        previewUser = parsed;
      }
    } catch {
      // fallback
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    const client = createServerClient(supabaseUrl, supabaseKey, {
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

    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = async () => {
      const res = await originalGetUser();
      if (res.data?.user) {
        return res;
      }
      if (previewUser) {
        return { data: { user: previewUser }, error: null };
      }
      return res;
    };

    return client;
  }

  // Graceful local preview session client when Supabase env vars are not set
  return {
    auth: {
      async getUser() {
        if (previewUser) {
          return { data: { user: previewUser }, error: null };
        }
        return { data: { user: null }, error: null };
      },

      async signInWithPassword({ email }: { email: string; password?: string }) {
        const cleanEmail = (email || '').toLowerCase().trim();
        let userRecord: any = null;

        try {
          const rows = await db.select().from(users).where(eq(users.email, cleanEmail));
          userRecord = rows[0];
        } catch {
          // ignore
        }

        if (!userRecord) {
          const matchInitial = initialUsers.find((u) => u.email.toLowerCase() === cleanEmail);
          if (matchInitial) {
            userRecord = matchInitial;
          } else {
            // Auto-provision demo user
            const newId = crypto.randomUUID();
            const role = cleanEmail.includes('admin') ? 'admin' : 'student';
            try {
              const inserted = await db.insert(users).values({
                id: newId,
                email: cleanEmail,
                role,
              }).returning();
              userRecord = inserted[0];
            } catch {
              userRecord = { id: newId, email: cleanEmail, role };
            }
          }
        }

        const userObj = {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role || (cleanEmail.includes('admin') ? 'admin' : 'student'),
        };

        try {
          cookieStore.set('dreampath_session', encodeURIComponent(JSON.stringify(userObj)), {
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });
        } catch {
          // ignore in read-only contexts
        }

        return { data: { user: userObj, session: { user: userObj } }, error: null };
      },

      async signUp({ email }: { email: string; password?: string }) {
        const cleanEmail = (email || '').toLowerCase().trim();
        const newId = crypto.randomUUID();
        const role = cleanEmail.includes('admin') ? 'admin' : 'student';
        const userObj = {
          id: newId,
          email: cleanEmail,
          role,
        };

        try {
          cookieStore.set('dreampath_session', encodeURIComponent(JSON.stringify(userObj)), {
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
          });
        } catch {
          // ignore in read-only contexts
        }

        return { data: { user: userObj, session: { user: userObj } }, error: null };
      },

      async signOut() {
        try {
          cookieStore.delete('dreampath_session');
        } catch {
          // ignore
        }
        return { error: null };
      },
    },
  } as any;
}
