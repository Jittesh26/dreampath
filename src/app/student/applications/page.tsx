import { db } from '@/db';
import { applications, intakes, scholarships, providers } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const myApps = await db
    .select({
      id: applications.id,
      status: applications.status,
      updatedAt: applications.updatedAt,
      scholarshipName: scholarships.name,
      providerName: providers.name,
    })
    .from(applications)
    .innerJoin(intakes, eq(applications.intakeId, intakes.id))
    .innerJoin(scholarships, eq(intakes.scholarshipId, scholarships.id))
    .innerJoin(providers, eq(scholarships.providerId, providers.id))
    .where(eq(applications.userId, user.id))
    .orderBy(desc(applications.updatedAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-instrument text-4xl font-bold tracking-tight text-primary">Application Tracker</h1>
        <p className="font-jakarta text-slate-500 mt-2 text-lg">Manage and track the progress of your verified scholarships.</p>
      </div>

      <Card className="bg-white border-slate-100 shadow-premium">
        <CardHeader>
          <CardTitle className="font-jakarta text-xl">My Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {myApps.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't saved or applied to any scholarships yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scholarship</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myApps.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.scholarshipName}</TableCell>
                    <TableCell>{app.providerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">{app.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{new Date(app.updatedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
