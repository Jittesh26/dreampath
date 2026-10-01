import { Metadata } from 'next';
import { db } from '@/db';
import { studentProfiles, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { evaluateProfileServer } from '@/app/actions/eligibility';
import { CrossCheckerClient } from '@/components/eligibility/CrossCheckerClient';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { PageHeader } from '@/components/design-system';
import { StudentProfile } from '@/domain/registry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Scholarship Eligibility Matcher | DreamPath',
  description: 'Evaluate your academic qualifications and background deterministically against published Malaysian scholarship criteria.',
};

export default async function EligibilityMatcherPage() {
  // Check for optional authenticated student session
  let isAuthenticated = false;
  let initialProfile: Partial<StudentProfile> | null = null;
  let savedIntakeIds: string[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;

      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, user.id));

      if (profile) {
        initialProfile = {
          citizenship: (profile.citizenship as any) || 'Malaysian',
          bumiputera_status: profile.bumiputeraStatus ?? true,
          income_band: (profile.incomeBand as any) || 'B40',
          household_income: profile.householdIncome || undefined,
          cgpa: profile.cgpa ? Number(profile.cgpa) : undefined,
          spm_results: (profile.spmResults as any) || undefined,
        };
      }

      const userApps = await db
        .select({ intakeId: applications.intakeId })
        .from(applications)
        .where(eq(applications.userId, user.id));

      savedIntakeIds = userApps.map((a) => a.intakeId);
    }
  } catch {
    isAuthenticated = false;
    initialProfile = null;
    savedIntakeIds = [];
  }

  // Base profile facts for initial server-side evaluation
  const defaultProfileFacts: StudentProfile = {
    citizenship: initialProfile?.citizenship || 'Malaysian',
    bumiputera_status: initialProfile?.bumiputera_status ?? true,
    income_band: initialProfile?.income_band || 'B40',
    household_income: initialProfile?.household_income || 3800,
    cgpa: initialProfile?.cgpa ?? 3.80,
    date_of_birth: initialProfile?.date_of_birth || '2005-06-15',
    spm_results: initialProfile?.spm_results || {
      Mathematics: 'A',
      English: 'A-',
      'Bahasa Melayu': 'A',
      'Additional Mathematics': 'B+',
    },
  };

  // Run initial evaluation server-side (Architecture A: server-side evaluation, no rule AST sent to browser)
  const initialReport = await evaluateProfileServer(defaultProfileFacts);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav />

      {/* Ambient Top Section */}
      <div className="pt-24 pb-10 sm:pt-28 sm:pb-12 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8">
          <PageHeader
            pill="CROSS-PROGRAM ELIGIBILITY MATCHER · 2026/2027 INTAKES"
            title={
              <>
                Deterministic Scholarship{' '}
                <span className="font-serif italic font-normal text-blue-700">
                  Eligibility Engine
                </span>
              </>
            }
            subtitle="Enter your academic results, citizenship, and income band once. DreamPath deterministically evaluates your profile facts on the server against the published rule ASTs of every modeled Malaysian scholarship."
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8 py-8 sm:py-10">
        <CrossCheckerClient
          initialReport={initialReport}
          initialProfile={initialProfile}
          isAuthenticated={isAuthenticated}
          savedIntakeIds={savedIntakeIds}
        />
      </main>

      <Footer />
    </div>
  );
}
