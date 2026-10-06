'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { studentProfiles, applications, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export type StudentProfileInput = {
  citizenship?: string;
  bumiputeraStatus?: boolean;
  incomeBand?: string;
  cgpa?: string | null;
  spmResults?: Record<string, string>;
};

export async function updateStudentProfile(formDataOrInput: FormData | StudentProfileInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Ensure user exists in users table to prevent foreign key errors
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

  let citizenship: string;
  let bumiputeraStatus: boolean;
  let incomeBand: string;
  let cgpa: string | null;
  let spmResults: Record<string, string>;

  if (formDataOrInput instanceof FormData) {
    citizenship = (formDataOrInput.get('citizenship') as string) || 'Malaysian';
    bumiputeraStatus = formDataOrInput.get('bumiputeraStatus') === 'true';
    incomeBand = (formDataOrInput.get('incomeBand') as string) || 'M40';
    const cgpaRaw = formDataOrInput.get('cgpa') as string;
    cgpa = cgpaRaw ? cgpaRaw : null;

    // SPM subjects
    const math = formDataOrInput.get('spm_math') as string;
    const addMath = formDataOrInput.get('spm_addmath') as string;
    const bm = formDataOrInput.get('spm_bm') as string;
    const eng = formDataOrInput.get('spm_eng') as string;

    spmResults = {};
    if (math) spmResults['Mathematics'] = math;
    if (addMath) spmResults['Additional Mathematics'] = addMath;
    if (bm) spmResults['Bahasa Melayu'] = bm;
    if (eng) spmResults['English'] = eng;
  } else {
    citizenship = formDataOrInput.citizenship || 'Malaysian';
    bumiputeraStatus = formDataOrInput.bumiputeraStatus === true;
    incomeBand = formDataOrInput.incomeBand || 'M40';
    cgpa = formDataOrInput.cgpa ?? null;
    spmResults = formDataOrInput.spmResults || {};
  }

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

  return { success: true, message: 'Profile saved successfully.' };
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
