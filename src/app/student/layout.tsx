import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  LayoutDashboard,
  Compass,
  Briefcase,
  FileText,
  User,
  Settings,
  Mic,
  PenTool,
  GraduationCap,
  Sparkles,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { logout } from '@/app/actions/auth';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayName = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Student').trim();

  const coreNav = [
    { href: '/student', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/scholarships', label: 'Scholarships Directory', icon: <Compass className="w-4 h-4" /> },
    { href: '/student/applications', label: 'Application Tracker', icon: <Briefcase className="w-4 h-4" /> },
    { href: '/student/profile', label: 'Academic Profile', icon: <User className="w-4 h-4" /> },
  ];

  const aiToolsNav = [
    { href: '/student/resume', label: 'Resume Builder', icon: <FileText className="w-4 h-4" />, badge: 'ATS-Ready' },
    { href: '/student/interview-practice', label: 'Interview Simulator', icon: <Mic className="w-4 h-4" />, badge: 'AI' },
    { href: '/student/essay-assistant', label: 'Essay Assistant', icon: <PenTool className="w-4 h-4" /> },
  ];

  const accountNav = [
    { href: '/student/settings', label: 'Privacy & Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] pb-16 md:pb-0 font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-68 bg-white border-r border-slate-200/90 p-5 flex flex-col justify-between hidden md:flex shrink-0 min-h-screen sticky top-0 shadow-2xs">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 border border-blue-500/30 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-black text-lg tracking-tight text-slate-950 leading-none">
                  Dream<span className="text-blue-700">Path</span>
                </span>
                <span className="text-[10px] tracking-wider text-slate-400 uppercase font-bold mt-0.5">
                  Student Workspace
                </span>
              </div>
            </Link>
            <NotificationCenter />
          </div>

          {/* Navigation Sections */}
          <div className="space-y-5">
            {/* Core Section */}
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Core Workspace
              </p>
              <nav className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {coreNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400 group-hover:text-blue-600 transition-colors">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>

            {/* AI Tools Section */}
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>AI Preparation Suite</span>
              </p>
              <nav className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {aiToolsNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400 group-hover:text-blue-600 transition-colors">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Account & Settings */}
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Settings & Safety
              </p>
              <nav className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {accountNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400 group-hover:text-blue-600 transition-colors">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Verified Malaysian Student</p>
            <p className="font-semibold text-xs text-slate-900 truncate mt-0.5">{displayName}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
            >
              <span>Public Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50/60 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <span>Sign Out</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-2xs">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 border border-blue-500/30 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-sans font-black text-base tracking-tight text-slate-950">
            Dream<span className="text-blue-700">Path</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <form action={logout}>
            <button
              type="submit"
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* Mobile Native-Inspired Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-lg"
      >
        <Link
          href="/student"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-700 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/scholarships"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-700 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <Compass className="w-4 h-4" />
          <span>Browse</span>
        </Link>
        <Link
          href="/student/applications"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-700 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <Briefcase className="w-4 h-4" />
          <span>Tracker</span>
        </Link>
        <Link
          href="/student/resume"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-700 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <FileText className="w-4 h-4" />
          <span>Resume</span>
        </Link>
        <Link
          href="/student/profile"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-700 min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
