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
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/60">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Verified Malaysian Student Workspace</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight font-sans">
          Welcome to your <span className="font-serif italic font-normal text-blue-900">Workspace</span>
        </h1>
        <p className="font-sans text-slate-600 text-sm sm:text-base max-w-2xl font-normal">
          Manage your saved scholarships, monitor official closing deadlines, and prepare applications with deterministic certainty.
        </p>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saved */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saved Opportunities</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-4xl font-black text-slate-900 font-sans">{savedCount}</span>
          </div>
          <Link href="/student/applications" className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1">
            <span>View pipeline</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Active Applications */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-4xl font-black text-slate-900 font-sans">{activeCount}</span>
          </div>
          <Link href="/student/applications" className="text-xs font-bold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1">
            <span>Manage stages</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Next Deadline */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Deadline</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-xl font-bold text-slate-900 leading-tight line-clamp-1">
              {nextDeadlineStr}
            </span>
            {nextApp && (
              <span className="text-[11px] text-slate-500 block truncate mt-0.5 font-medium">
                {nextApp.scholarshipName}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Asia/Kuala_Lumpur (MYT)</span>
        </div>

        {/* Profile Completeness */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Profile Strength</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 font-sans">
                {profileCompleteness}%
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                {profileCompleteness === 100 ? 'Verified' : 'In Progress'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${profileCompleteness}%` }}
              />
            </div>
          </div>
          <Link href="/student/profile" className="text-xs font-bold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1">
            <span>{profileCompleteness < 100 ? 'Complete profile' : 'Profile up to date'}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Action-Oriented Priority Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Action Items & Upcoming Deadlines */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 tracking-tight font-sans">
                Recommended Actions
              </h2>
              <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full font-bold">Prioritized for 2026</span>
            </div>

            <div className="space-y-3 text-xs">
              {profileCompleteness < 100 && (
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-amber-950 font-bold block text-sm">
                      Complete your Academic Profile
                    </strong>
                    <p className="text-amber-900/90 mt-0.5 font-normal leading-relaxed">
                      Add your SPM subject grades and CGPA to enable 1-click deterministic eligibility verification across all scholarships.
                    </p>
                  </div>
                  <Link
                    href="/student/profile"
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shrink-0 transition-colors shadow-2xs"
                  >
                    Update
                  </Link>
                </div>
              )}

              {!hasResume && (
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-blue-950 font-bold block text-sm">
                      Build your ATS-Verified Resume
                    </strong>
                    <p className="text-blue-900/90 mt-0.5 font-normal leading-relaxed">
                      Use our conversational AI Interview to extract confirmed facts and generate a Classic Academic or Modern Tech PDF resume.
                    </p>
                  </div>
                  <Link
                    href="/student/resume"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shrink-0 transition-colors shadow-2xs"
                  >
                    Build Resume
                  </Link>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <strong className="text-slate-900 font-bold block text-sm">
                    Practice with the Scholarship Interview Simulator
                  </strong>
                  <p className="text-slate-600 mt-0.5 font-normal leading-relaxed">
                    Simulate an interview with panel questions from Gamuda, JPA, or Yayasan Khazanah with STAR method feedback.
                  </p>
                </div>
                <Link
                  href="/student/interview-practice"
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shrink-0 transition-colors shadow-2xs"
                >
                  Start Practice
                </Link>
              </div>
            </div>
          </div>

          {/* Upcoming Tracked Deadlines */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 tracking-tight font-sans">
                Upcoming Tracked Deadlines
              </h2>
              <Link href="/student/applications" className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
                <span>View all in tracker</span>
                <ArrowRight className="w-3 h-3" />
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
                      <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                        {item.providerName}
                      </span>
                      <Link
                        href={`/scholarships/${item.scholarshipId}`}
                        className="text-sm font-bold text-slate-900 hover:text-blue-700 transition-colors"
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight font-sans">Preparation Tools</h3>
            
            <div className="space-y-2.5">
              <Link
                href="/student/interview-practice"
                className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 rounded-xl flex items-center gap-3 transition-colors group block"
              >
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-amber-700">
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

          <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-white tracking-tight">Discover More Opportunities</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Explore 27 verified scholarships across Malaysian government, GLC, and private foundations.
            </p>
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 pt-1 transition-colors"
            >
              <span>Explore Official Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
