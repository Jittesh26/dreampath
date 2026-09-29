import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { scholarships, intakes, intakeVersions, requirements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { CheckerWizard } from '@/components/CheckerWizard';

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
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">No Rules Defined</h1>
        <p className="text-muted-foreground mt-2">Eligibility criteria have not been fully modeled for this scholarship yet.</p>
        <Link href={`/scholarships/${id}`} className="text-primary hover:underline mt-4 inline-block">Return to details</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between">
          <div className="font-bold text-xl text-primary">
            DreamPath Eligibility Engine
          </div>
          <Link href={`/scholarships/${id}`} className="text-sm font-medium hover:underline text-muted-foreground">
            &larr; Cancel
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Eligibility Checker</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Verifying against <strong className="text-foreground">{scholarshipData.name}</strong> official requirements
          </p>
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
    </div>
  );
}
