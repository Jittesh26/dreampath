import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { LayoutDashboard, Building2, Award, ArrowLeft, GraduationCap, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify Admin Role in DB
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  
  if (!dbUser || dbUser.role !== 'admin') {
    redirect('/student');
  }

  const adminName = user.user_metadata?.full_name || user.email || 'Admin';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] font-sans">
      <aside className="w-full md:w-68 bg-white border-r border-slate-200/90 p-5 flex flex-col justify-between hidden md:flex shrink-0 min-h-screen sticky top-0 shadow-2xs">
        <div className="space-y-6">
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
                  Admin Console
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Overview &amp; Queue</span>
            </Link>
            <Link
              href="/admin/providers"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Providers</span>
            </Link>
            <Link
              href="/admin/scholarships"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Award className="w-4 h-4 text-slate-400" />
              <span>Scholarships &amp; Intakes</span>
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Authenticated Admin</p>
            <p className="font-semibold text-xs text-slate-900 truncate mt-0.5">{adminName}</p>
          </div>
          <Link
            href="/student"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Student Workspace</span>
            </div>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50/60 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              <span>Sign Out</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-2xs">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 border border-blue-500/30 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-sans font-black text-base tracking-tight text-slate-950">
            Dream<span className="text-blue-700">Path</span> <span className="text-xs text-slate-400 font-bold uppercase">Admin</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/student" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
            Student
          </Link>
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

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
