import { db } from '@/db';
import { providers } from '@/db/schema';
import { AdminScholarshipWizard } from '@/components/admin/AdminScholarshipWizard';

export const dynamic = 'force-dynamic';

export default async function NewScholarshipPage() {
  const allProviders = await db
    .select({
      id: providers.id,
      name: providers.name,
      url: providers.url,
      description: providers.description,
    })
    .from(providers)
    .orderBy(providers.name);

  return <AdminScholarshipWizard existingProviders={allProviders} />;
}
