import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface AuthUserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Server-side helper to retrieve the active authenticated Supabase user and
 * their database role in a single unified call for Server Components.
 */
export async function getAuthenticatedUser(): Promise<AuthUserInfo | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    let role = 'student';
    try {
      const [dbUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, user.id));
      if (dbUser?.role) {
        role = dbUser.role;
      }
    } catch {
      // fallback to student if database lookup fails
    }

    const name = (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Student'
    ).trim();

    return {
      id: user.id,
      email: user.email || '',
      name,
      role,
    };
  } catch {
    return null;
  }
}
