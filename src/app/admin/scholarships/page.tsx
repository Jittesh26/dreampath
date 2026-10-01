import { db } from '@/db';
import { scholarships, providers, intakes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createScholarship, transitionIntakeStatus, emergencyUnpublish } from '@/app/actions/admin';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';

export default async function AdminScholarshipsPage() {
  const allProviders = await db.select().from(providers);
  
  const allScholarships = await db
    .select({
      id: scholarships.id,
      name: scholarships.name,
      description: scholarships.description,
      providerName: providers.name,
      intakeId: intakes.id,
      status: intakes.status,
      year: intakes.year,
      closeDate: intakes.closeDate,
    })
    .from(scholarships)
    .innerJoin(providers, eq(scholarships.providerId, providers.id))
    .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
    .orderBy(desc(intakes.createdAt));

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 font-sans">
          Scholarships <span className="font-serif italic font-normal text-blue-900">Management</span> ({allScholarships.length})
        </h1>
        <p className="font-sans text-slate-600 text-sm mt-1 font-normal">
          Control the verification and publishing lifecycle: Draft &rarr; In Review &rarr; Published &rarr; Superseded.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scholarships Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="divide-y divide-slate-100 text-xs">
            {allScholarships.map((s) => (
              <div key={s.id} className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {s.providerName}
                    </span>
                    <Link
                      href={`/scholarships/${s.id}`}
                      className="font-sans text-base font-bold text-slate-900 hover:text-blue-700 transition-colors"
                    >
                      {s.name}
                    </Link>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    s.status === 'published'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                      : s.status === 'closed'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200/60'
                      : 'bg-amber-50 text-amber-900 border border-amber-200/60'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Cycle: {s.year} · Deadline: {s.closeDate || 'TBA'}
                  </span>

                  <div className="flex items-center gap-2">
                    {s.status === 'published' ? (
                      <form
                        action={async () => {
                          'use server';
                          await emergencyUnpublish(s.intakeId);
                        }}
                      >
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Emergency Unpublish
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          'use server';
                          await transitionIntakeStatus(s.intakeId, 'published');
                        }}
                      >
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Publish to Public
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Scholarship Form (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-slate-900" />
            <h2 className="font-sans text-base font-bold text-slate-950">Create Scholarship</h2>
          </div>

          <form action={createScholarship} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Select Provider</label>
              <select
                name="providerId"
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {allProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Scholarship Title</label>
              <input
                name="name"
                required
                placeholder="e.g. Future Leaders Award"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Overview &amp; Target Fields</label>
              <textarea
                name="description"
                rows={4}
                required
                placeholder="Discipline, qualifications, and coverage details..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Create Draft Scholarship
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
