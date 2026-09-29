'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { resumeProfiles, resumeVersions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { resumeContentSchema, ResumeContent } from '@/domain/resume';

/**
 * Validates the authenticated user and ensures they have a resume workspace.
 */
async function requireResumeProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Find existing profile
  let profile = await db.query.resumeProfiles.findFirst({
    where: eq(resumeProfiles.userId, user.id)
  });

  // Create if missing
  if (!profile) {
    const inserted = await db.insert(resumeProfiles)
      .values({ userId: user.id })
      .returning();
    profile = inserted[0];
  }

  return profile;
}

export async function getResumes() {
  const profile = await requireResumeProfile();
  
  const versions = await db.query.resumeVersions.findMany({
    where: eq(resumeVersions.resumeProfileId, profile.id),
    orderBy: (resumeVersions: any, { desc }: any) => [desc(resumeVersions.updatedAt)],
  });

  return versions;
}

export async function getResume(id: string) {
  const profile = await requireResumeProfile();
  
  const version = await db.query.resumeVersions.findFirst({
    where: and(
      eq(resumeVersions.id, id),
      eq(resumeVersions.resumeProfileId, profile.id) // Strict authorization boundary
    )
  });

  if (!version) throw new Error('Resume not found or unauthorized');

  return version;
}

export async function createResume(title: string = 'Untitled Resume') {
  const profile = await requireResumeProfile();
  
  const defaultContent: ResumeContent = {
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    awards: [],
    leadership: [],
    volunteering: [],
    scholarships: [],
    customSections: [],
  };

  const inserted = await db.insert(resumeVersions)
    .values({
      resumeProfileId: profile.id,
      title,
      content: defaultContent,
    })
    .returning();

  revalidatePath('/student/resume');
  return inserted[0];
}

export async function updateResume(id: string, title: string, contentStr: string) {
  const profile = await requireResumeProfile();
  
  // Parse and validate strictly using Zod
  const rawContent = JSON.parse(contentStr);
  const validatedContent = resumeContentSchema.parse(rawContent);

  // Update ensures authorization via `resumeProfileId`
  const updated = await db.update(resumeVersions)
    .set({
      title,
      content: validatedContent,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(resumeVersions.id, id),
        eq(resumeVersions.resumeProfileId, profile.id)
      )
    )
    .returning();

  if (!updated.length) throw new Error('Update failed or unauthorized');

  revalidatePath('/student/resume');
  revalidatePath(`/student/resume/${id}`);
  
  return updated[0];
}

export async function deleteResume(id: string) {
  const profile = await requireResumeProfile();
  
  await db.delete(resumeVersions)
    .where(
      and(
        eq(resumeVersions.id, id),
        eq(resumeVersions.resumeProfileId, profile.id)
      )
    );

  revalidatePath('/student/resume');
}
