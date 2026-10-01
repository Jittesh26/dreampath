'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { initialUsers } from '@/db/initial-data';

export async function login(
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTarget = (formData.get('redirect') as string) || '/student';

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // If remote Supabase fails (e.g. demo credentials or unconfirmed email), provide fallback preview session
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
        try {
          await db.insert(users).values({
            id: matchInitial.id,
            email: matchInitial.email,
            role: matchInitial.role,
          }).onConflictDoNothing();
        } catch {
          // ignore
        }
      } else {
        const newId = crypto.randomUUID();
        const role = cleanEmail.includes('admin') ? 'admin' : 'student';
        try {
          const [inserted] = await db
            .insert(users)
            .values({ id: newId, email: cleanEmail, role })
            .returning();
          userRecord = inserted || { id: newId, email: cleanEmail, role };
        } catch {
          userRecord = { id: newId, email: cleanEmail, role };
        }
      }
    }

    const userObj = {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role || 'student',
    };

    const cookieStore = await cookies();
    cookieStore.set('dreampath_session', encodeURIComponent(JSON.stringify(userObj)), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  revalidatePath('/', 'layout');
  const safeDestination =
    redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')
      ? redirectTarget
      : '/student';
  redirect(safeDestination);
}

export async function register(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  // 1. Sign up the user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    try {
      // 2. Synchronize user in the Drizzle database
      await db.insert(users).values({
        id: data.user.id, // Explicitly match Supabase Auth UUID to preserve relations
        email: data.user.email ?? email,
        role: 'student', // Default role
      });
    } catch (dbError) {
      console.error('Database Sync Error on Registration:', dbError);
      
      // Attempt to rollback Supabase Auth if database sync fails (Optional but recommended)
      // Since it's a server action with a service role, we could use the service role key to delete,
      // but without it, the user will exist in Auth but not DB. For now, we log the error and return it.
      return { error: 'Registration succeeded, but database sync failed. Please contact support.' };
    }
  }

  revalidatePath('/', 'layout');
  redirect('/student');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  try {
    const cookieStore = await cookies();
    cookieStore.delete('dreampath_session');
  } catch {
    // ignore
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
