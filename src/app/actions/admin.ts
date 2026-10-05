'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { providers, scholarships, intakes, intakeVersions, requirements, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { RequirementNode, validateRequirementNode, SelectionStage } from '@/domain/schema';
import { separateEligibilityAndSelection } from '@/domain/selection-process';
import { createClient } from '@/lib/supabase/server';

// Helper to verify admin role securely via DB
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));

  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Forbidden: Insufficient privileges.');
  }

  return true;
}

export async function createProvider(formData: FormData) {
  await requireAdmin();
  
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const url = formData.get('url') as string;

  await db.insert(providers).values({
    name,
    description,
    url,
  });

  revalidatePath('/admin/providers');
}

export async function createScholarship(formData: FormData) {
  await requireAdmin();
  
  const providerId = formData.get('providerId') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  await db.insert(scholarships).values({
    providerId,
    name,
    description,
  });

  revalidatePath('/admin/scholarships');
}

export async function cloneIntake(previousIntakeId: string) {
  await requireAdmin();

  // Fetch the previous intake
  const [prevIntake] = await db.select().from(intakes).where(eq(intakes.id, previousIntakeId));
  if (!prevIntake) throw new Error("Intake not found");

  // Fetch its latest version
  const [prevVersion] = await db.select()
    .from(intakeVersions)
    .where(eq(intakeVersions.intakeId, previousIntakeId))
    .orderBy(desc(intakeVersions.versionNum))
    .limit(1);

  if (!prevVersion) throw new Error("Intake version not found");

  // Fetch the requirements connected to that version
  const [prevReqs] = await db.select()
    .from(requirements)
    .where(eq(requirements.intakeVersionId, prevVersion.id));

  // 1. Create a NEW intake in 'draft' status
  const [newIntake] = await db.insert(intakes).values({
    scholarshipId: prevIntake.scholarshipId,
    year: new Date().getFullYear(),
    status: 'draft',
  }).returning();

  // 2. Create a NEW version for it (versionNum 1)
  const [newVersion] = await db.insert(intakeVersions).values({
    intakeId: newIntake.id,
    versionNum: 1,
    sourceUrl: prevVersion.sourceUrl, // carry over evidence links
    evidenceNotes: prevVersion.evidenceNotes,
  }).returning();

  // 3. Deep copy the AST Requirements
  if (prevReqs) {
    await db.insert(requirements).values({
      intakeVersionId: newVersion.id,
      name: prevReqs.name,
      // The JSONB ruleAst is automatically deeply serialized/cloned
      ruleAst: prevReqs.ruleAst, 
      selectionStages: prevReqs.selectionStages,
    });
  }

  revalidatePath(`/admin/scholarships/${prevIntake.scholarshipId}`);
  return newIntake.id;
}

export async function updateRequirements(
  intakeVersionId: string,
  name: string,
  ruleAst: RequirementNode,
  selectionStages?: SelectionStage[]
) {
  await requireAdmin();

  // Validate the complete rule AST at the server boundary using domain schema
  const validatedAst = validateRequirementNode(ruleAst);

  // Generic separation: extract post-application selection stages from eligibility predicates
  const { eligibilityAst, selectionStages: extractedStages } = separateEligibilityAndSelection(
    validatedAst,
    selectionStages
  );

  // Check version integrity — prevent modifying published or closed versions
  const [version] = await db.select().from(intakeVersions).where(eq(intakeVersions.id, intakeVersionId));
  if (!version) throw new Error("Intake version not found.");

  const [intake] = await db.select().from(intakes).where(eq(intakes.id, version.intakeId));
  if (!intake) throw new Error("Intake not found.");

  if (intake.status === 'published' || intake.status === 'closed') {
    throw new Error("Cannot mutate a published or closed intake version. Please clone or create a new version.");
  }

  // Check if requirements exist
  const [existingReq] = await db.select().from(requirements).where(eq(requirements.intakeVersionId, intakeVersionId));

  if (existingReq) {
    await db.update(requirements)
      .set({ name, ruleAst: eligibilityAst, selectionStages: extractedStages })
      .where(eq(requirements.id, existingReq.id));
  } else {
    await db.insert(requirements).values({
      intakeVersionId,
      name,
      ruleAst: eligibilityAst,
      selectionStages: extractedStages,
    });
  }
}

export async function updateIntakeEvidence(intakeVersionId: string, sourceUrl: string, evidenceNotes: string) {
  await requireAdmin();

  // Check version integrity — prevent modifying published or closed versions
  const [version] = await db.select().from(intakeVersions).where(eq(intakeVersions.id, intakeVersionId));
  if (!version) throw new Error("Intake version not found.");

  const [intake] = await db.select().from(intakes).where(eq(intakes.id, version.intakeId));
  if (!intake) throw new Error("Intake not found.");

  if (intake.status === 'published' || intake.status === 'closed') {
    throw new Error("Cannot mutate evidence for a published or closed intake version.");
  }

  await db.update(intakeVersions)
    .set({ sourceUrl, evidenceNotes })
    .where(eq(intakeVersions.id, intakeVersionId));
}

export async function transitionIntakeStatus(
  intakeId: string,
  newStatus: 'draft' | 'in_review' | 'published' | 'superseded' | 'closed'
) {
  await requireAdmin();

  // Publication gate: before becoming published, verify minimum required evidence & structured data
  if (newStatus === 'published') {
    const [intake] = await db.select().from(intakes).where(eq(intakes.id, intakeId));
    if (!intake) throw new Error("Intake not found.");

    const [latestVersion] = await db.select()
      .from(intakeVersions)
      .where(eq(intakeVersions.intakeId, intakeId))
      .orderBy(desc(intakeVersions.versionNum))
      .limit(1);

    if (!latestVersion) {
      throw new Error("Cannot publish: Intake must have at least one intake version.");
    }

    if (!latestVersion.sourceUrl || !latestVersion.sourceUrl.trim()) {
      throw new Error("Cannot publish: Intake version must have an authoritative official source URL.");
    }

    const reqRows = await db.select()
      .from(requirements)
      .where(eq(requirements.intakeVersionId, latestVersion.id));

    if (reqRows.length === 0) {
      throw new Error("Cannot publish: Intake version must have eligibility requirements defined.");
    }

    const [scholarship] = await db.select().from(scholarships).where(eq(scholarships.id, intake.scholarshipId));
    if (!scholarship || !scholarship.name?.trim()) {
      throw new Error("Cannot publish: Associated scholarship record is incomplete.");
    }
  }

  await db.update(intakes)
    .set({ status: newStatus })
    .where(eq(intakes.id, intakeId));

  // Revalidate globally to update public pages
  revalidatePath('/', 'layout');
}

export async function emergencyUnpublish(intakeId: string) {
  await requireAdmin();

  // Instantly force to draft state to pull it from the public view
  await db.update(intakes)
    .set({ status: 'draft' })
    .where(eq(intakes.id, intakeId));

  // Instantly clear Next.js caching
  revalidatePath('/', 'layout');
}

export async function resolveDataReport(reportId: string, status: string = 'resolved') {
  await requireAdmin();

  const { dataReports } = await import('@/db/schema');
  await db.update(dataReports)
    .set({ status })
    .where(eq(dataReports.id, reportId));

  revalidatePath('/admin');
  revalidatePath('/admin/reports');
}

export interface CompleteScholarshipInput {
  providerId?: string;
  newProvider?: {
    name: string;
    url?: string;
    description?: string;
  };
  name: string;
  description: string;
  year: number;
  openDate?: string; // YYYY-MM-DD
  closeDate?: string; // YYYY-MM-DD
  sourceUrl: string;
  evidenceNotes: string;
  ruleAst: RequirementNode;
  selectionStages?: SelectionStage[];
  publishImmediately?: boolean;
}

/**
 * Creates a complete authoritative scholarship record atomically:
 * - Provider (creates if new, or attaches to existing)
 * - Scholarship
 * - Intake (with opening/closing dates and year)
 * - Intake Version (sourceUrl and evidence notes)
 * - Requirements (validated AST + separated selection stages)
 * - Optionally passes publication gate if publishImmediately is requested.
 */
export async function createCompleteScholarship(input: CompleteScholarshipInput) {
  await requireAdmin();

  if (!input.name?.trim()) throw new Error('Scholarship name is required.');
  if (!input.description?.trim()) throw new Error('Scholarship description is required.');
  if (!input.sourceUrl?.trim()) throw new Error('Official source URL is required.');

  // Validate AST
  const validatedAst = validateRequirementNode(input.ruleAst);
  const { eligibilityAst, selectionStages: extractedStages } = separateEligibilityAndSelection(
    validatedAst,
    input.selectionStages
  );

  let targetProviderId = input.providerId;

  // If new provider specified, create it
  if (!targetProviderId && input.newProvider?.name?.trim()) {
    // Check if provider with same name already exists
    const [existingP] = await db
      .select()
      .from(providers)
      .where(eq(providers.name, input.newProvider.name.trim()));

    if (existingP) {
      targetProviderId = existingP.id;
    } else {
      const [newP] = await db
        .insert(providers)
        .values({
          name: input.newProvider.name.trim(),
          url: input.newProvider.url?.trim() || input.sourceUrl,
          description: input.newProvider.description?.trim() || 'Official scholarship provider.',
        })
        .returning();
      targetProviderId = newP.id;
    }
  }

  if (!targetProviderId) {
    throw new Error('Please select an existing provider or supply a provider name.');
  }

  // 1. Insert Scholarship
  const [createdScholarship] = await db
    .insert(scholarships)
    .values({
      providerId: targetProviderId,
      name: input.name.trim(),
      description: input.description.trim(),
    })
    .returning();

  // 2. Insert Intake (starts as 'draft')
  const [createdIntake] = await db
    .insert(intakes)
    .values({
      scholarshipId: createdScholarship.id,
      year: input.year || new Date().getFullYear(),
      openDate: input.openDate || null,
      closeDate: input.closeDate || null,
      status: 'draft',
    })
    .returning();

  // 3. Insert Intake Version
  const [createdVersion] = await db
    .insert(intakeVersions)
    .values({
      intakeId: createdIntake.id,
      versionNum: 1,
      sourceUrl: input.sourceUrl.trim(),
      evidenceNotes: input.evidenceNotes?.trim() || `Verified from ${input.sourceUrl}`,
    })
    .returning();

  // 4. Insert Requirements
  await db.insert(requirements).values({
    intakeVersionId: createdVersion.id,
    name: `${input.name.trim()} Eligibility Criteria`,
    ruleAst: eligibilityAst,
    selectionStages: extractedStages,
  });

  // 5. If requested to publish immediately, run publication gate
  if (input.publishImmediately) {
    await transitionIntakeStatus(createdIntake.id, 'published');
  }

  revalidatePath('/scholarships');
  revalidatePath('/admin/scholarships');
  revalidatePath('/', 'layout');

  return {
    scholarshipId: createdScholarship.id,
    intakeId: createdIntake.id,
    versionId: createdVersion.id,
  };
}

/**
 * Server action to safely ingest an official scholarship URL and extract a structured draft.
 * Never publishes automatically. Output is strictly for admin review.
 */
export async function ingestOfficialScholarshipUrl(targetUrl: string) {
  await requireAdmin();

  const { safeFetchWebContent } = await import('@/lib/security/safe-fetch');
  const { extractScholarshipDraftFromText } = await import('@/lib/ai/scholarship-extractor');

  const { cleanText, url } = await safeFetchWebContent(targetUrl, { timeoutMs: 12000 });
  const draftProposal = await extractScholarshipDraftFromText(cleanText, url);

  return draftProposal;
}

/**
 * Server action to update a user's role (promote to admin or demote to student).
 * Enforces strict last-admin protection.
 */
export async function updateUserRole(userId: string, newRole: 'student' | 'admin') {
  await requireAdmin();

  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required.');
  }

  if (newRole !== 'student' && newRole !== 'admin') {
    throw new Error('Invalid role specified. Must be either "student" or "admin".');
  }

  const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!targetUser) {
    throw new Error('User not found.');
  }

  if (targetUser.role === newRole) {
    return { success: true, message: `User is already a ${newRole}.` };
  }

  // Last-admin protection: cannot demote an admin if they are the only remaining admin
  if (targetUser.role === 'admin' && newRole === 'student') {
    const adminCount = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));

    if (adminCount.length <= 1) {
      throw new Error('Cannot demote the last remaining administrator.');
    }
  }

  await db
    .update(users)
    .set({ role: newRole })
    .where(eq(users.id, userId));

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  revalidatePath('/student');

  return { success: true, message: `User role successfully updated to ${newRole}.` };
}
