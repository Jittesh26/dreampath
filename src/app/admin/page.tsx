import { db } from '@/db';
import { providers, scholarships, intakes } from '@/db/schema';
import { count } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminDashboard() {
  const [providerCount] = await db.select({ value: count() }).from(providers);
  const [scholarshipCount] = await db.select({ value: count() }).from(scholarships);
  const [intakeCount] = await db.select({ value: count() }).from(intakes);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold tracking-tight">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-none border-slate-200">
          <CardHeader>
            <CardTitle>Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{providerCount.value}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-none border-slate-200">
          <CardHeader>
            <CardTitle>Scholarships</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{scholarshipCount.value}</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-slate-200">
          <CardHeader>
            <CardTitle>Active Intakes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{intakeCount.value}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
