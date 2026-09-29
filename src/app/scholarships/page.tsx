import { db } from '@/db';
import { scholarships, providers, intakes } from '@/db/schema';
import { eq, ilike, or, and, inArray, desc } from 'drizzle-orm';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import Link from 'next/link';

export const dynamic = 'force-dynamic'; // Ensure Next.js doesn't statically cache search results

export default async function ScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';

  // 1. Build Query
  // We only show publicly visible intakes (e.g. published or closed, but NOT draft/in_review/superseded)
  let whereClause = inArray(intakes.status, ['published', 'closed']);

  if (q) {
    whereClause = and(
      whereClause,
      or(
        ilike(scholarships.name, `%${q}%`),
        ilike(providers.name, `%${q}%`)
      )
    ) as any;
  }

  // Fetch the data
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
  // Left join to get the active intake for this year/cycle. We sort so we get the latest if there are many.
  .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
  .where(whereClause)
  .orderBy(desc(intakes.createdAt));

  // Deduplicate in JS for simplicity (assuming 1 active intake per scholarship for the UI view)
  const uniqueScholarships = new Map();
  for (const row of results) {
    if (!uniqueScholarships.has(row.id)) {
      uniqueScholarships.set(row.id, row);
    }
  }
  const displayItems = Array.from(uniqueScholarships.values());

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-[#FAFAF9] sticky top-0 z-50">
        <div className="font-instrument text-2xl font-bold tracking-tight text-primary">
          <Link href="/">DreamPath</Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/scholarships" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">
            Browse
          </Link>
          <Link href="/login" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">
            Log in
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="font-instrument text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Official Scholarships</h1>
            <p className="font-jakarta text-muted-foreground mt-2 text-lg">Discover verified opportunities for Malaysian students.</p>
          </div>
          
          <form action="/scholarships" method="GET" className="w-full md:w-auto flex gap-2">
            <Input 
              name="q" 
              defaultValue={q} 
              placeholder="Search by name or provider..." 
              className="w-full md:w-72 shadow-sm"
            />
            <Button type="submit" variant="default" className="shadow-sm">Search</Button>
          </form>
        </div>

        {displayItems.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-lg border border-border">
            <h3 className="text-xl font-bold text-foreground">No scholarships found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        )}
      </main>
    </div>
  );
}
