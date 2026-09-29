import { db } from '@/db';
import { scholarships, providers, intakes } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export async function ScholarshipDiscovery() {
  const results = await db.select({
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
  .limit(10); 

  const uniqueScholarships = new Map();
  for (const row of results) {
    if (!uniqueScholarships.has(row.id)) {
      uniqueScholarships.set(row.id, row);
    }
  }
  const displayItems = Array.from(uniqueScholarships.values()).slice(0, 3);

  return (
    <section className="w-full py-24 bg-[#FAFAF9]">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-[#0B1B3D] text-4xl md:text-5xl mb-4">
              Scholarships, <span className="italic">checked against their sources.</span>
            </h2>
            <p className="font-sans text-slate-600 text-lg">
              Explore active scholarships parsed directly from official guidelines.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayItems.map((item) => (
            <ScholarshipCard 
              key={item.id}
              id={item.id}
              providerName={item.providerName}
              scholarshipName={item.scholarshipName}
              status={item.status}
              openDate={item.openDate}
              closeDate={item.closeDate}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-start md:justify-end">
          <Link href="/scholarships" className={buttonVariants({ variant: "outline", className: "min-h-[44px]" })}>
            View all scholarships
          </Link>
        </div>
      </div>
    </section>
  );
}
