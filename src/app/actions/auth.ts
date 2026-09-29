'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/student');
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
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
