import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { LayoutDashboard, Building2, Award, ArrowLeft } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAF9]">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-[#0B1B3D] block">
            Dream<span className="text-amber-700 italic">Path</span>
            <span className="block text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              Admin Console
            </span>
          </Link>

          <nav className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>Overview &amp; Queue</span>
            </Link>
            <Link
              href="/admin/providers"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Providers</span>
            </Link>
            <Link
              href="/admin/scholarships"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Award className="w-4 h-4 text-slate-500" />
              <span>Scholarships &amp; Intakes</span>
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <Link
            href="/student"
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Student Workspace</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-10">
        {children}
      </main>
    </div>
  );
}
