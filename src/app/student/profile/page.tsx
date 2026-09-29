import { db } from '@/db';
import { studentProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { updateStudentProfile } from '@/app/actions/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const SPM_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, user.id));

  const spm = profile?.spmResults as Record<string, string> || {};

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-instrument text-4xl font-bold tracking-tight text-primary">My Profile</h1>
        <p className="font-jakarta text-slate-500 mt-2 text-lg">Keep your profile updated so DreamPath can seamlessly verify your eligibility.</p>
      </div>

      <Card className="bg-white border-slate-100 shadow-premium">
        <CardHeader>
          <CardTitle className="font-jakarta text-xl">Demographic & Academic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            key={profile ? `${profile.userId}-${profile.updatedAt?.getTime() ?? 0}` : 'new-profile'}
            action={updateStudentProfile} 
            className="space-y-6"
          >
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Citizenship</label>
              <select name="citizenship" defaultValue={profile?.citizenship ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select...</option>
                <option value="Malaysian">Malaysian</option>
                <option value="Permanent Resident">Permanent Resident</option>
                <option value="Non-Malaysian">Non-Malaysian</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Bumiputera Status</label>
              <select name="bumiputeraStatus" defaultValue={profile?.bumiputeraStatus ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Household Income Band</label>
              <select name="incomeBand" defaultValue={profile?.incomeBand ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select...</option>
                <option value="B40">B40</option>
                <option value="M40">M40</option>
                <option value="T20">T20</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Current CGPA</label>
              <Input 
                key={profile?.userId ? `${profile.userId}-${profile.cgpa ?? ''}` : 'cgpa-input'}
                name="cgpa" 
                type="number" 
                step="0.01" 
                max="4.0" 
                defaultValue={profile?.cgpa ?? ''} 
                placeholder="e.g. 3.50" 
              />
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold text-lg mb-4">Core SPM Results</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Mathematics</label>
                  <select name="spm_math" defaultValue={spm['Mathematics'] ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Grade</option>
                    {SPM_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Add. Mathematics</label>
                  <select name="spm_addmath" defaultValue={spm['Additional Mathematics'] ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Grade</option>
                    {SPM_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Bahasa Melayu</label>
                  <select name="spm_bm" defaultValue={spm['Bahasa Melayu'] ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Grade</option>
                    {SPM_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">English</label>
                  <select name="spm_eng" defaultValue={spm['English'] ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Grade</option>
                    {SPM_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full">Save Profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
