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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav />

      {/* Ambient gradient top bar */}
      <div className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <PageHeader
            pill="MALAYSIAN SCHOLARSHIP DIRECTORY · 2026/2027 CYCLE"
            title={
              <>
                Explore Verified Malaysian{' '}
                <span className="font-serif italic font-normal text-blue-700">
                  Scholarships
                </span>
              </>
            }
            subtitle="Every scholarship in this directory is extracted and audited against official provider portals and circulars. Filter opportunities matching your academic qualifications, household income, and field of study."
          />
        </div>
      </div>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8 py-10 space-y-8">
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

