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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav />

      {/* Top ambient background strip */}
      <div className="pt-24 pb-8 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link
            href={`/scholarships/${id}`}
            className="text-xs font-semibold text-slate-500 hover:text-[#0F172A] transition-colors inline-flex items-center gap-1.5 mb-3"
          >
            &larr; Back to {scholarshipData.name} Details
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>DETERMINISTIC EVALUATION ENGINE</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
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
