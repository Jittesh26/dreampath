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
