import { SiteNav } from '@/components/home/SiteNav';
import { Hero } from '@/components/home/Hero';
import { TruthStrip } from '@/components/home/TruthStrip';
import { ScholarshipDiscovery } from '@/components/home/ScholarshipDiscovery';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Footer } from '@/components/home/Footer';
import { db } from '@/db';
import { scholarships, providers, intakes } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export default async function Home() {
  let initialScholarships: any[] = [];
  try {
    const results = await db
      .select({
        id: scholarships.id,
        scholarshipName: scholarships.name,
        providerName: providers.name,
        status: intakes.status,
        openDate: intakes.openDate,
        closeDate: intakes.closeDate,
      })
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
      .where(inArray(intakes.status, ['published']))
      .orderBy(desc(intakes.createdAt))
      .limit(6);

    const unique = new Map();
    for (const r of results) {
      if (!unique.has(r.id)) {
        unique.set(r.id, r);
      }
    }
    initialScholarships = Array.from(unique.values());
  } catch {
    initialScholarships = [];
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#FAFAF9] home-scoped">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <TruthStrip />
        <ScholarshipDiscovery initialItems={initialScholarships} />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
