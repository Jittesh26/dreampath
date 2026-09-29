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
  PenTool
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

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

  const navItems = [
    { href: '/student', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/scholarships', label: 'Scholarships', icon: <Compass className="w-4 h-4" /> },
    { href: '/student/applications', label: 'Application Tracker', icon: <Briefcase className="w-4 h-4" /> },
    { href: '/student/resume', label: 'Resume Builder', icon: <FileText className="w-4 h-4" /> },
    { href: '/student/profile', label: 'Academic Profile', icon: <User className="w-4 h-4" /> },
    { href: '/student/interview-practice', label: 'Interview Practice', icon: <Mic className="w-4 h-4" /> },
    { href: '/student/essay-assistant', label: 'Essay Assistant', icon: <PenTool className="w-4 h-4" /> },
    { href: '/student/settings', label: 'Privacy & Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAF9] pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between hidden md:flex shrink-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-[#0B1B3D]">
              Dream<span className="text-amber-700 italic">Path</span>
            </Link>
            <NotificationCenter />
          </div>

          <nav className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <span className="text-slate-500">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-6 border-t border-slate-100 space-y-2">
          <div className="px-3 text-xs">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Signed In As</p>
            <p className="font-medium text-slate-800 truncate">{user.email}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span>&larr; Back to Public Portal</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* Mobile Native-Inspired Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg"
      >
        <Link
          href="/student"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#0B1B3D] min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/scholarships"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#0B1B3D] min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <Compass className="w-4 h-4" />
          <span>Browse</span>
        </Link>
        <Link
          href="/student/applications"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#0B1B3D] min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <Briefcase className="w-4 h-4" />
          <span>Tracker</span>
        </Link>
        <Link
          href="/student/resume"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#0B1B3D] min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <FileText className="w-4 h-4" />
          <span>Resume</span>
        </Link>
        <Link
          href="/student/profile"
          className="flex flex-col items-center gap-1 text-slate-600 hover:text-[#0B1B3D] min-h-[44px] min-w-[44px] justify-center text-[10px] font-semibold"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
