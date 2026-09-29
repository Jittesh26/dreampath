import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAF9]">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shadow-premium p-6 flex flex-col gap-4 z-10">
        <h2 className="font-instrument text-2xl font-bold tracking-tight text-primary mb-8">
          <Link href="/">DreamPath</Link>
        </h2>
        <nav className="flex flex-col gap-4">
          <Link href="/student" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/student/profile" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">My Profile</Link>
          <Link href="/student/applications" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">Applications</Link>
          <Link href="/student/settings" className="font-jakarta text-sm font-medium text-slate-600 hover:text-primary transition-colors">Settings & Privacy</Link>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
