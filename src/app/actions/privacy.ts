'use server';

import { db } from '@/db';
import { users, studentProfiles, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function exportUserData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id));
  const myApps = await db.select().from(applications).where(eq(applications.userId, user.id));

  const exportData = {
    account: {
      id: user.id,
      email: user.email,
      exportDate: new Date().toISOString(),
    },
    profile: profile || null,
    applications: myApps,
  };

  // Return as stringified JSON to be downloaded by the client component
  return JSON.stringify(exportData, null, 2);
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Cascade delete from our DB
  // This will cleanly wipe the profile and all applications linked to this user.id
  await db.delete(users).where(eq(users.id, user.id));

  // Sign out of Supabase
  await supabase.auth.signOut();

  // Optionally: Call a secure edge function using service_role key to delete the Auth User in Supabase,
  // but for Phase 7 scope, cascading DB deletion + sign out effectively nullifies the account locally.

  redirect('/');
}
