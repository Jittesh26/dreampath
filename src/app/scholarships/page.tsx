import { db } from '@/db';
import { scholarships, providers, intakes } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { ScholarshipCatalogueClient } from '@/components/scholarships/ScholarshipCatalogueClient';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { PageHeader } from '@/components/design-system';

export const dynamic = 'force-dynamic';

export default async function ScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialQ = typeof params.q === 'string' ? params.q : '';
  const initialLevel = typeof params.level === 'string' ? params.level : 'All';
  const initialField = typeof params.field === 'string' ? params.field : 'All';

  let displayItems: any[] = [];
  try {
    const results = await db
      .select({
        id: scholarships.id,
        scholarshipName: scholarships.name,
        providerName: providers.name,
        description: scholarships.description,
        status: intakes.status,
        openDate: intakes.openDate,
        closeDate: intakes.closeDate,
      })
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
      .where(inArray(intakes.status, ['published', 'closed']))
      .orderBy(desc(intakes.createdAt));

    const uniqueMap = new Map();
    for (const r of results) {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r);
      }
    }
    displayItems = Array.from(uniqueMap.values());
  } catch {
    displayItems = [];
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <SiteNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl space-y-8">
        <PageHeader
          eyebrow={
            <>
              <span>Official Catalogue</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 font-normal">2026/2027 Academic Cycle</span>
            </>
          }
          title="Explore Verified Malaysian Scholarships"
          subtitle="Every scholarship here is extracted and confirmed against official provider portals. Filter opportunities matching your academic qualifications and background."
        />

        <ScholarshipCatalogueClient
          allScholarships={displayItems}
          initialQuery={initialQ}
          initialLevel={initialLevel}
          initialField={initialField}
        />
      </main>

      <Footer />
    </div>
  );
}
