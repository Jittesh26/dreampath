'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function login(
  formData: FormData
): Promise<{ error?: string } | undefined> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const redirectTarget = (formData.get('redirect') as string) || '/student';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || 'Invalid email or password.' };
  }

  if (!data?.user) {
    return { error: 'Authentication failed. Please try again.' };
  }

  // Look up user role from database
  let destination = redirectTarget;
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, data.user.id));
    if (dbUser?.role === 'admin' && redirectTarget === '/student') {
      destination = '/admin';
    }
  } catch (err) {
    console.error('Failed to query user role on login:', err);
  }

  revalidatePath('/', 'layout');
  const safeDestination =
    destination.startsWith('/') && !destination.startsWith('//')
      ? destination
      : '/student';
  redirect(safeDestination);
}

export async function register(formData: FormData) {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();

  // 1. Sign up the user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.user) {
    try {
      // 2. Synchronize user in the Drizzle database — always default to 'student'
      await db.insert(users).values({
        id: data.user.id, // Explicitly match Supabase Auth UUID to preserve relations
        email: data.user.email ?? email,
        role: 'student', // Default role; never infer from email
      });
    } catch (dbError) {
      console.error('Database Sync Error on Registration:', dbError);
      return { error: 'Registration succeeded, but database sync failed. Please contact support.' };
    }
  }

  revalidatePath('/', 'layout');
  redirect('/student');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}
