import { notFound } from 'next/navigation';
import { db } from '@/db';
import { scholarships, providers, intakes, intakeVersions, requirements } from '@/db/schema';
import { eq, desc, ne } from 'drizzle-orm';
import { ScholarshipDetailView } from '@/components/scholarships/ScholarshipDetailView';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const dynamic = 'force-dynamic';

export default async function ScholarshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getAuthenticatedUser();
  const { id } = await params;

  // 1. Fetch Scholarship & Provider
  const [scholarshipData] = await db
    .select()
    .from(scholarships)
    .innerJoin(providers, eq(scholarships.providerId, providers.id))
    .where(eq(scholarships.id, id));

  if (!scholarshipData) return notFound();

  // 2. Fetch active intake (published or closed)
  const [activeIntake] = await db
    .select()
    .from(intakes)
    .where(eq(intakes.scholarshipId, id))
    .orderBy(desc(intakes.createdAt))
    .limit(1);

  if (!activeIntake || activeIntake.status === 'draft' || activeIntake.status === 'superseded') {
    return notFound();
  }

  // 3. Fetch intake version
  const [latestVersion] = await db
    .select()
    .from(intakeVersions)
    .where(eq(intakeVersions.intakeId, activeIntake.id))
    .orderBy(desc(intakeVersions.versionNum))
    .limit(1);

  // 4. Fetch structured requirements for this intake version
  let reqs: any[] = [];
  if (latestVersion) {
    reqs = await db
      .select()
      .from(requirements)
      .where(eq(requirements.intakeVersionId, latestVersion.id));
  }

  // 5. Fetch 3 similar scholarships
  const similarRaw = await db
    .select({
      id: scholarships.id,
      name: scholarships.name,
      providerName: providers.name,
      status: intakes.status,
    })
    .from(scholarships)
    .innerJoin(providers, eq(scholarships.providerId, providers.id))
    .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
    .where(ne(scholarships.id, id))
    .limit(3);

  const formattedOpenDate = activeIntake.openDate
    ? new Date(activeIntake.openDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';
  const formattedCloseDate = activeIntake.closeDate
    ? new Date(activeIntake.closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';
  const formattedVerificationDate = latestVersion?.createdAt
    ? new Date(latestVersion.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Recently';

  const sourceUrl = latestVersion?.sourceUrl || scholarshipData.providers.url || '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav initialUser={currentUser} />

      {/* Top ambient background strip */}
      <div className="pt-24 pb-8 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>AUTHORITATIVE SCHOLARSHIP DOSSIER</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        <ScholarshipDetailView
          id={scholarshipData.scholarships.id}
          name={scholarshipData.scholarships.name}
          providerName={scholarshipData.providers.name}
          providerDesc={scholarshipData.providers.description || 'Official Malaysian sponsor and scholarship foundation.'}
          providerUrl={scholarshipData.providers.url || ''}
          description={scholarshipData.scholarships.description || ''}
          openDate={formattedOpenDate}
          closeDate={formattedCloseDate}
          status={activeIntake.status}
          year={activeIntake.year}
          verificationDate={formattedVerificationDate}
          sourceUrl={sourceUrl}
          evidenceNotes={latestVersion?.evidenceNotes || ''}
          requirements={reqs}
          similarScholarships={similarRaw}
        />
      </main>

      <Footer />
    </div>
  );

}
