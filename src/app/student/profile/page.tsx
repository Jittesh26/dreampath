import { db } from '@/db';
import { studentProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { StudentProfileForm } from '@/components/student/StudentProfileForm';

import { PageHeader } from '@/components/design-system';

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let profile: any = null;
  try {
    const [p] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.id));
    profile = p;
  } catch {
    profile = null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Student Workspace', href: '/student' },
          { label: 'Academic Profile' },
        ]}
        eyebrow="Authoritative Student Record"
        title="My Academic Profile"
        subtitle="Keep your academic results, CGPA, and household income up to date. DreamPath uses these confirmed facts for deterministic eligibility checks across all scholarships."
      />

      <StudentProfileForm initialProfile={profile} />
    </div>
  );
}
