import { db } from '@/db';
import { applications, intakes, scholarships, providers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { ApplicationTrackerClient, ApplicationItem } from '@/components/student/ApplicationTrackerClient';

import { PageHeader } from '@/components/design-system';

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let myApps: ApplicationItem[] = [];
  try {
    const raw = await db
      .select({
        id: applications.id,
        status: applications.status,
        notes: applications.notes,
        submissionDate: applications.submissionDate,
        interviewDate: applications.interviewDate,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        scholarshipId: scholarships.id,
        scholarshipName: scholarships.name,
        providerName: providers.name,
        providerUrl: providers.url,
        closeDate: intakes.closeDate,
      })
      .from(applications)
      .innerJoin(intakes, eq(applications.intakeId, intakes.id))
      .innerJoin(scholarships, eq(intakes.scholarshipId, scholarships.id))
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.updatedAt));

    myApps = raw.map((r) => ({
      id: r.id,
      status: r.status,
      notes: r.notes,
      submissionDate: r.submissionDate,
      interviewDate: r.interviewDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      scholarshipId: r.scholarshipId,
      scholarshipName: r.scholarshipName,
      providerName: r.providerName,
      providerUrl: r.providerUrl,
      closeDate: r.closeDate,
    }));
  } catch {
    myApps = [];
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <PageHeader
        eyebrow="Student Workspace · Application Management"
        title="Application Journey Tracker"
        subtitle="Track deadlines, interview dates, and advance your verified scholarship applications across each milestone from preparation to final award offer."
      />

      <ApplicationTrackerClient initialApplications={myApps} />
    </div>
  );
}
