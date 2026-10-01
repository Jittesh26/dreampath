import { SiteNav } from '@/components/home/SiteNav';
import { Hero } from '@/components/home/Hero';
import { TruthStrip } from '@/components/home/TruthStrip';
import { ScholarshipDiscovery } from '@/components/home/ScholarshipDiscovery';
import { VerificationArchitecture } from '@/components/home/VerificationArchitecture';
import { PlatformFeatures } from '@/components/home/PlatformFeatures';
import { FaqSection } from '@/components/home/FaqSection';
import { PreFooterCta } from '@/components/home/PreFooterCta';
import { Footer } from '@/components/home/Footer';
import { db } from '@/db';
import { scholarships, providers, intakes, intakeVersions } from '@/db/schema';
import { eq, inArray, desc, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let initialScholarships: any[] = [];
  let scholarshipCount = 27;
  let providerCount = 24;

  try {
    // 1. Fetch live published/open scholarships
    const results = await db
      .select({
        id: scholarships.id,
        scholarshipName: scholarships.name,
        providerName: providers.name,
        description: scholarships.description,
        status: intakes.status,
        openDate: intakes.openDate,
        closeDate: intakes.closeDate,
        intakeId: intakes.id,
        sourceUrl: intakeVersions.sourceUrl,
        evidenceNotes: intakeVersions.evidenceNotes,
      })
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
      .leftJoin(intakeVersions, eq(intakes.id, intakeVersions.intakeId))
      .where(inArray(intakes.status, ['published', 'open', 'closed']))
      .orderBy(desc(intakes.createdAt));

    const unique = new Map<string, any>();
    for (const r of results) {
      if (!unique.has(r.id)) {
        unique.set(r.id, r);
      }
    }
    initialScholarships = Array.from(unique.values());

    // 2. Fetch authoritative counts
    const [sc] = await db.select({ value: count() }).from(scholarships);
    const [pc] = await db.select({ value: count() }).from(providers);
    if (sc?.value) scholarshipCount = Number(sc.value);
    if (pc?.value) providerCount = Number(pc.value);
    if (initialScholarships.length > 0 && initialScholarships.length > scholarshipCount) {
      scholarshipCount = initialScholarships.length;
    }
  } catch {
    initialScholarships = [];
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#F8FAFC]">
      <SiteNav />
      <main className="flex-1 w-full overflow-x-hidden">
        <Hero
          totalScholarships={scholarshipCount}
          initialScholarships={initialScholarships}
        />
        <TruthStrip
          scholarshipCount={scholarshipCount}
          providerCount={providerCount}
        />
        <ScholarshipDiscovery
          initialItems={initialScholarships}
          totalCount={scholarshipCount}
        />
        <VerificationArchitecture />
        <PlatformFeatures />
        <FaqSection />
        <PreFooterCta />
      </main>
      <Footer />
    </div>
  );
}
