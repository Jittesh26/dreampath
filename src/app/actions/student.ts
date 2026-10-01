'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { studentProfiles, applications, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function updateStudentProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const citizenship = formData.get('citizenship') as string;
  const bumiputeraStatus = formData.get('bumiputeraStatus') === 'true';
  const incomeBand = formData.get('incomeBand') as string;
  const cgpaRaw = formData.get('cgpa') as string;
  const cgpa = cgpaRaw ? cgpaRaw : null;

  // SPM subjects
  const math = formData.get('spm_math') as string;
  const addMath = formData.get('spm_addmath') as string;
  const bm = formData.get('spm_bm') as string;
  const eng = formData.get('spm_eng') as string;

  const spmResults: Record<string, string> = {};
  if (math) spmResults['Mathematics'] = math;
  if (addMath) spmResults['Additional Mathematics'] = addMath;
  if (bm) spmResults['Bahasa Melayu'] = bm;
  if (eng) spmResults['English'] = eng;

  // Upsert pattern
  const [existing] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id));

  if (existing) {
    await db.update(studentProfiles)
      .set({
        citizenship,
        bumiputeraStatus,
        incomeBand,
        cgpa,
        spmResults,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, user.id));
  } else {
    await db.insert(studentProfiles).values({
      userId: user.id,
      citizenship,
      bumiputeraStatus,
      incomeBand,
      cgpa,
      spmResults,
    });
  }

  revalidatePath('/student/profile');
  revalidatePath('/student');
}

export async function updateApplicationStatus(appId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Verify ownership before updating
  await db.update(applications)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(eq(applications.id, appId), eq(applications.userId, user.id)));

  revalidatePath('/student/applications');
  revalidatePath('/student');
}

export async function saveScholarshipApplication(intakeId: string, status: string = 'saved') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, reason: 'unauthorized' };

  // Ensure user exists in users table
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
    if (!dbUser) {
      await db.insert(users).values({
        id: user.id,
        email: user.email || 'student@dreampath.my',
        role: 'student',
      }).onConflictDoNothing();
    }
  } catch {
    // ignore
  }

  // Check if already saved
  const [existing] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, user.id), eq(applications.intakeId, intakeId)));

  if (existing) {
    await db.update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, existing.id));
  } else {
    await db.insert(applications).values({
      userId: user.id,
      intakeId,
      status,
    });
  }

  revalidatePath('/student/applications');
  revalidatePath('/student');
}

export async function deleteApplication(appId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  await db.delete(applications)
    .where(and(eq(applications.id, appId), eq(applications.userId, user.id)));

  revalidatePath('/student/applications');
  revalidatePath('/student');
}
