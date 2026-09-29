import { db } from '@/db';
import { applications, intakes } from '@/db/schema';
import { eq, and, not } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const myApps = await db
    .select({
      id: applications.id,
      status: applications.status,
      closeDate: intakes.closeDate,
    })
    .from(applications)
    .innerJoin(intakes, eq(applications.intakeId, intakes.id))
    .where(eq(applications.userId, user.id));

  const savedCount = myApps.filter(app => app.status === 'saved').length;
  const activeCount = myApps.filter(app => app.status !== 'saved' && app.status !== 'rejected').length;

  const upcomingDeadlines = myApps
    .filter(app => app.closeDate)
    .map(app => new Date(app.closeDate as string))
    .filter(d => d > new Date())
    .sort((a, b) => a.getTime() - b.getTime());

  const nextDeadline = upcomingDeadlines.length > 0 
    ? upcomingDeadlines[0].toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'None approaching';

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="font-instrument text-4xl md:text-5xl font-bold tracking-tight text-primary">Welcome to your Workspace</h1>
        <p className="font-jakarta text-slate-500 mt-2 text-lg">Manage your saved scholarships and track your applications securely.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-100 shadow-premium">
          <CardHeader>
            <CardTitle className="text-lg font-jakarta">Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-instrument text-5xl font-extrabold text-primary">{savedCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-premium">
          <CardHeader>
            <CardTitle className="text-lg font-jakarta">Active Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-instrument text-5xl font-extrabold text-primary">{activeCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200 shadow-premium">
          <CardHeader>
            <CardTitle className="text-lg font-jakarta text-amber-900">Next Deadline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-instrument text-3xl font-bold text-amber-900">{nextDeadline}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="font-instrument text-3xl font-bold mb-6 text-primary">Quick Actions</h2>
        <div className="flex gap-4">
          <Link href="/scholarships">
            <Button>Discover More Scholarships</Button>
          </Link>
          <Link href="/student/profile">
            <Button variant="outline">Update Profile</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
