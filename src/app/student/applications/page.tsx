import { db } from '@/db';
import { applications, intakes, scholarships, providers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { ApplicationTrackerClient, ApplicationItem } from '@/components/student/ApplicationTrackerClient';

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
        updatedAt: applications.updatedAt,
        scholarshipId: scholarships.id,
        scholarshipName: scholarships.name,
        providerName: providers.name,
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
      updatedAt: r.updatedAt,
      scholarshipId: r.scholarshipId,
      scholarshipName: r.scholarshipName,
      providerName: r.providerName,
      closeDate: r.closeDate,
    }));
  } catch {
    myApps = [];
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
          Student Workspace
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0B1B3D]">
          Application Pipeline Tracker
        </h1>
        <p className="font-sans text-slate-500 mt-2 text-base max-w-2xl">
          Manage deadlines, interview dates, and track your verified scholarship applications across every stage from discovery to award.
        </p>
      </div>

      <ApplicationTrackerClient initialApplications={myApps} />
    </div>
  );
}
