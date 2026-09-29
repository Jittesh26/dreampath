import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { scholarships, intakes, intakeVersions, requirements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { CheckerWizard } from '@/components/CheckerWizard';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';

export default async function EligibilityCheckPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  // 1. Fetch Scholarship
  const [scholarshipData] = await db
    .select()
    .from(scholarships)
    .where(eq(scholarships.id, id));

  if (!scholarshipData) return notFound();

  // 2. Fetch active intake
  const [activeIntake] = await db
    .select()
    .from(intakes)
    .where(eq(intakes.scholarshipId, id))
    .orderBy(desc(intakes.createdAt))
    .limit(1);

  if (!activeIntake || activeIntake.status === 'draft' || activeIntake.status === 'superseded') {
    return notFound();
  }

  // 3. Fetch latest intake version
  const [latestVersion] = await db
    .select()
    .from(intakeVersions)
    .where(eq(intakeVersions.intakeId, activeIntake.id))
    .orderBy(desc(intakeVersions.versionNum))
    .limit(1);

  if (!latestVersion) return notFound();

  // 4. Fetch JSONB Requirements AST
  const [rules] = await db
    .select()
    .from(requirements)
    .where(eq(requirements.intakeVersionId, latestVersion.id));

  if (!rules || !rules.ruleAst) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
        <SiteNav />
        <main className="flex-1 container mx-auto px-4 py-20 text-center max-w-xl">
          <h1 className="font-serif text-3xl font-bold text-[#0B1B3D]">No Rules Modeled Yet</h1>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">
            Eligibility criteria for this intake are currently undergoing authoritative audit and modeling.
          </p>
          <Link
            href={`/scholarships/${id}`}
            className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0B1B3D] text-white text-xs font-bold rounded-xl"
          >
            &larr; Return to Scholarship Overview
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <SiteNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/scholarships/${id}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
          >
            &larr; Back to {scholarshipData.name}
          </Link>
        </div>

        {/* 
          Pass the cleanly decoupled JSONB AST down to the Client Component 
          for interactive extraction and deterministic evaluation. 
        */}
        <CheckerWizard 
          scholarshipId={scholarshipData.id}
          scholarshipName={scholarshipData.name}
          ruleAst={rules.ruleAst}
        />
      </main>

      <Footer />
    </div>
  );
}
