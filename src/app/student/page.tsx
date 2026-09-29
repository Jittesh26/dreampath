import { db } from '@/db';
import { applications, intakes, scholarships, providers, studentProfiles, resumeProfiles, resumeVersions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Bookmark,
  Briefcase,
  Calendar,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let myApps: any[] = [];
  let profile: any = null;
  let hasResume = false;

  try {
    myApps = await db
      .select({
        id: applications.id,
        status: applications.status,
        closeDate: intakes.closeDate,
        scholarshipName: scholarships.name,
        providerName: providers.name,
        scholarshipId: scholarships.id,
      })
      .from(applications)
      .innerJoin(intakes, eq(applications.intakeId, intakes.id))
      .innerJoin(scholarships, eq(intakes.scholarshipId, scholarships.id))
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .where(eq(applications.userId, user.id));

    const [p] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id));
    profile = p;

    const [rProfile] = await db.select().from(resumeProfiles).where(eq(resumeProfiles.userId, user.id));
    if (rProfile) {
      const versions = await db.select().from(resumeVersions).where(eq(resumeVersions.resumeProfileId, rProfile.id));
      hasResume = versions.length > 0;
    }
  } catch {
    myApps = [];
  }

  const savedCount = myApps.filter((app: any) => app.status === 'saved').length;
  const activeCount = myApps.filter((app: any) => app.status !== 'saved' && app.status !== 'rejected').length;

  const now = new Date();
  const upcomingDeadlines = myApps
    .filter((app: any) => app.closeDate)
    .map((app: any) => ({
      ...app,
      date: new Date(app.closeDate as string),
    }))
    .filter((d: any) => d.date > now)
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

  const nextApp = upcomingDeadlines[0];
  const nextDeadlineStr = nextApp
    ? nextApp.date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'None approaching';

  // Calculate profile completeness
  let profileCompleteness = 30; // base account
  if (profile?.cgpa) profileCompleteness += 25;
  if (profile?.citizenship) profileCompleteness += 15;
  if (profile?.spmResults && Object.keys(profile.spmResults).length > 0) profileCompleteness += 30;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Welcome */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
          <span>Student Workspace</span>
          <span aria-hidden="true">·</span>
          <span>Verified Malaysian Portal</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0B1B3D]">
          Welcome to your Workspace
        </h1>
        <p className="font-sans text-slate-500 text-base max-w-2xl">
          Manage your saved scholarships, monitor official closing deadlines, and prepare applications with deterministic certainty.
        </p>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saved */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Saved Opportunities</span>
            <Bookmark className="w-4 h-4 text-amber-700" />
          </div>
          <div className="my-3">
            <span className="font-serif text-4xl font-bold text-[#0B1B3D]">{savedCount}</span>
          </div>
          <Link href="/student/applications" className="text-xs font-semibold text-amber-800 hover:underline">
            View in pipeline &rarr;
          </Link>
        </div>

        {/* Active Applications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active In Progress</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-3">
            <span className="font-serif text-4xl font-bold text-[#0B1B3D]">{activeCount}</span>
          </div>
          <Link href="/student/applications" className="text-xs font-semibold text-blue-800 hover:underline">
            Manage stages &rarr;
          </Link>
        </div>

        {/* Next Deadline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Next Deadline</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-3">
            <span className="font-serif text-2xl font-bold text-[#0B1B3D] leading-tight line-clamp-1">
              {nextDeadlineStr}
            </span>
            {nextApp && (
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                {nextApp.scholarshipName}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">Asia/Kuala_Lumpur (MYT)</span>
        </div>

        {/* Profile Completeness */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Profile Strength</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="my-3 space-y-1.5">
            <span className="font-serif text-3xl font-bold text-[#0B1B3D]">
              {profileCompleteness}%
            </span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all"
                style={{ width: `${profileCompleteness}%` }}
              />
            </div>
          </div>
          <Link href="/student/profile" className="text-xs font-semibold text-purple-800 hover:underline">
            {profileCompleteness < 100 ? 'Complete profile &rarr;' : 'Profile up to date'}
          </Link>
        </div>
      </div>

      {/* Action-Oriented Priority Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Action Items & Upcoming Deadlines */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">
                Recommended Actions
              </h2>
              <span className="text-xs text-slate-500 font-medium">Prioritized for 2026</span>
            </div>

            <div className="space-y-3 text-xs">
              {profileCompleteness < 100 && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-amber-950 font-bold block text-sm">
                      Complete your Academic Profile
                    </strong>
                    <p className="text-amber-900 mt-0.5">
                      Add your SPM subject grades and CGPA to enable 1-click deterministic eligibility verification across all scholarships.
                    </p>
                  </div>
                  <Link
                    href="/student/profile"
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg shrink-0 transition-colors"
                  >
                    Update
                  </Link>
                </div>
              )}

              {!hasResume && (
                <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-blue-950 font-bold block text-sm">
                      Build your ATS-Verified Resume
                    </strong>
                    <p className="text-blue-900 mt-0.5">
                      Use our conversational AI Interview to extract confirmed facts and generate a Classic Academic or Modern Tech PDF resume.
                    </p>
                  </div>
                  <Link
                    href="/student/resume"
                    className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg shrink-0 transition-colors"
                  >
                    Build Resume
                  </Link>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <strong className="text-slate-900 font-bold block text-sm">
                    Practice with the Scholarship Interview Simulator
                  </strong>
                  <p className="text-slate-600 mt-0.5">
                    Simulate an interview with panel questions from Gamuda, JPA, or Yayasan Khazanah with STAR method feedback.
                  </p>
                </div>
                <Link
                  href="/student/interview-practice"
                  className="px-3 py-1.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white font-bold rounded-lg shrink-0 transition-colors"
                >
                  Start Practice
                </Link>
              </div>
            </div>
          </div>

          {/* Upcoming Tracked Deadlines */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
                Upcoming Tracked Deadlines
              </h2>
              <Link href="/student/applications" className="text-xs font-semibold text-amber-800 hover:underline">
                View all in tracker &rarr;
              </Link>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No approaching deadlines found in your saved list.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {upcomingDeadlines.slice(0, 4).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase block">
                        {item.providerName}
                      </span>
                      <Link
                        href={`/scholarships/${item.scholarshipId}`}
                        className="font-serif text-sm font-bold text-[#0B1B3D] hover:text-amber-800"
                      >
                        {item.scholarshipName}
                      </Link>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 block">
                        {item.date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[10px] text-amber-800 font-semibold uppercase">
                        Stage: {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Quick Tool Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">Preparation Tools</h3>
            
            <div className="space-y-2.5">
              <Link
                href="/student/interview-practice"
                className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 rounded-xl flex items-center gap-3 transition-colors group block"
              >
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-amber-800">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                    Interview Practice Simulator
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">Roleplay with AI panel</p>
                </div>
              </Link>

              <Link
                href="/student/essay-assistant"
                className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 rounded-xl flex items-center gap-3 transition-colors group block"
              >
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-blue-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                    Essay & Statement Assistant
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">Outline & tone feedback</p>
                </div>
              </Link>

              <Link
                href="/student/resume"
                className="p-3 bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 rounded-xl flex items-center gap-3 transition-colors group block"
              >
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-purple-900">
                    Resume Builder & ATS Check
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">Classic Academic & Modern Tech</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-[#0B1B3D] to-[#132A5C] text-white rounded-2xl shadow-xs space-y-3">
            <h4 className="font-serif text-base font-bold">Discover More Opportunities</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Explore 27 verified scholarships across Malaysian government, GLC, and private foundations.
            </p>
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white pt-1"
            >
              <span>Go to Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
