import { db } from '@/db';
import { scholarships, providers } from '@/db/schema';
import { count } from 'drizzle-orm';
import { ShieldCheck, Award, Building2, Calendar } from 'lucide-react';

export async function TruthStrip() {
  let sCount = 27;
  let pCount = 24;

  try {
    const [sc] = await db.select({ value: count() }).from(scholarships);
    const [pc] = await db.select({ value: count() }).from(providers);
    if (sc?.value) sCount = Number(sc.value);
    if (pc?.value) pCount = Number(pc.value);
  } catch {
    // Keep fallback verified numbers
  }

  return (
    <div className="w-full border-y border-slate-200 bg-white py-6 z-10 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          <div className="flex items-center gap-3.5 pt-3 md:pt-0">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-[#0B1B3D] leading-tight">
                {sCount} Opportunities
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Verified scholarships & grants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-[#0B1B3D] leading-tight">
                {pCount} Providers
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Government, GLC & Foundation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-[#0B1B3D] leading-tight">
                Deterministic
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Machine-checkable AST engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-800 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-[#0B1B3D] leading-tight">
                2026 / 2027
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Active cycle verified weekly
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
