import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

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
    // If not admin, redirect to student dashboard or show unauthorized
    redirect('/student');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 bg-card border-r border-border p-6 flex flex-col gap-4">
        <h2 className="text-xl font-serif font-bold text-foreground mb-4">DreamPath Admin</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/admin/providers" className="text-muted-foreground hover:text-primary transition-colors">Providers</Link>
          {/* Add more links as needed */}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
