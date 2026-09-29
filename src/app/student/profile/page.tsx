import { db } from '@/db';
import { studentProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { StudentProfileForm } from '@/components/student/StudentProfileForm';

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
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
          Authoritative Student Record
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
          My Academic Profile
        </h1>
        <p className="font-sans text-slate-500 text-sm mt-1 max-w-xl">
          Keep your academic results, CGPA, and household income up to date. DreamPath uses these confirmed facts for deterministic eligibility checks across all scholarships.
        </p>
      </div>

      <StudentProfileForm initialProfile={profile} />
    </div>
  );
}
