import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { scholarships, providers, intakes, intakeVersions, requirements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReportMistakeForm } from '@/components/ReportMistakeForm';

export default async function ScholarshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  // Fetch Scholarship & Provider
  const [scholarshipData] = await db
    .select()
    .from(scholarships)
    .innerJoin(providers, eq(scholarships.providerId, providers.id))
    .where(eq(scholarships.id, id));

  if (!scholarshipData) return notFound();

  // Fetch active intake (open/closed)
  const [activeIntake] = await db
    .select()
    .from(intakes)
    .where(eq(intakes.scholarshipId, id))
    .orderBy(desc(intakes.createdAt))
    .limit(1);

  if (!activeIntake || (activeIntake.status === 'draft' || activeIntake.status === 'superseded')) {
    return notFound();
  }

  // Fetch intake version
  const [latestVersion] = await db
    .select()
    .from(intakeVersions)
    .where(eq(intakeVersions.intakeId, activeIntake.id))
    .orderBy(desc(intakeVersions.versionNum))
    .limit(1);

  // Formatting dates
  const openDate = activeIntake.openDate ? new Date(activeIntake.openDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA';
  const closeDate = activeIntake.closeDate ? new Date(activeIntake.closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA';
  
  const verificationDate = latestVersion?.createdAt 
    ? new Date(latestVersion.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Unknown';

  const sourceUrl = latestVersion?.sourceUrl || scholarshipData.providers.url;

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-[#FAFAF9] sticky top-0 z-50">
        <div className="font-instrument text-2xl font-bold tracking-tight text-primary">
          <Link href="/">DreamPath</Link>
        </div>
        <Link href="/scholarships" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">
          &larr; Back to Catalogue
        </Link>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl space-y-10">
        
        {/* Verification Ribbon */}
        <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">
              Last verified against official source on <strong className="font-bold">{verificationDate}</strong>
            </span>
          </div>
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4">
              View Official Source &rarr;
            </a>
          )}
        </div>

        {/* Header Section */}
        <div>
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
            {scholarshipData.providers.name}
          </h2>
          <h1 className="font-instrument text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-[1.1]">
            {scholarshipData.scholarships.name}
          </h1>
          <div className="mt-6 flex flex-wrap gap-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              Cycle: {activeIntake.year}
            </Badge>
            <Badge variant={activeIntake.status === 'published' ? 'default' : 'destructive'} className="text-sm px-3 py-1 uppercase">
              Status: {activeIntake.status === 'published' ? 'OPEN' : activeIntake.status}
            </Badge>
          </div>
        </div>

        <hr className="border-border" />

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="md:col-span-2 space-y-8">
            <section>
              <h3 className="font-instrument text-2xl font-bold text-primary mb-4">Overview</h3>
              <p className="font-jakarta text-slate-700 leading-relaxed text-lg">
                {scholarshipData.scholarships.description}
              </p>
            </section>
            
            <section>
              <h3 className="font-instrument text-2xl font-bold text-primary mb-4">Provider Background</h3>
              <Card className="bg-white border-slate-100 shadow-premium">
                <CardContent className="p-6">
                  <p className="font-jakarta text-slate-700 leading-relaxed">
                    {scholarshipData.providers.description}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <h3 className="font-instrument text-2xl font-bold text-primary mb-4">Eligibility Requirements</h3>
              <Card className="bg-white border-slate-100 shadow-premium">
                <CardContent className="p-6">
                  <p className="text-slate-500 mb-6 font-medium">
                    DreamPath deterministic matching uses the exact official rules from the provider.
                  </p>
                  <Link href={`/scholarships/${id}/check`}>
                    <Button variant="default" size="lg" className="w-full text-base">
                      Check Eligibility Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-white border-slate-100 shadow-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Opening Date</p>
                  <p className="font-medium text-foreground">{openDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Closing Date</p>
                  <p className="font-bold text-foreground">{closeDate}</p>
                </div>
              </CardContent>
            </Card>

            <ReportMistakeForm scholarshipId={id} />
          </div>

        </div>
      </main>
    </div>
  );
}
