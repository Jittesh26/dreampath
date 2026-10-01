import { db } from '@/db';
import { providers, scholarships, intakes, dataReports } from '@/db/schema';
import { count, eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { resolveDataReport } from '@/app/actions/admin';
import { Building2, Award, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import { AdminAiAssistantClient } from '@/components/admin/AdminAiAssistantClient';

export default async function AdminDashboard() {
  const [providerCount] = await db.select({ value: count() }).from(providers);
  const [scholarshipCount] = await db.select({ value: count() }).from(scholarships);
  const [intakeCount] = await db.select({ value: count() }).from(intakes);

  let pendingReports: any[] = [];
  try {
    pendingReports = await db
      .select({
        id: dataReports.id,
        scholarshipId: dataReports.scholarshipId,
        message: dataReports.message,
        status: dataReports.status,
        createdAt: dataReports.createdAt,
        scholarshipName: scholarships.name,
      })
      .from(dataReports)
      .innerJoin(scholarships, eq(dataReports.scholarshipId, scholarships.id))
      .orderBy(desc(dataReports.createdAt))
      .limit(10);
  } catch {
    pendingReports = [];
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
          <span>Trust &amp; Verification Infrastructure</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 font-sans">
          Administrator <span className="font-serif italic font-normal text-blue-900">Console</span>
        </h1>
        <p className="font-sans text-slate-600 text-sm mt-1 max-w-2xl font-normal">
          Monitor authoritative scholarship datasets, review reported factual corrections, and verify provider guidelines.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Providers</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-4xl font-black text-slate-950 my-2">{providerCount.value}</p>
          <Link href="/admin/providers" className="text-xs font-bold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 transition-colors">
            <span>Manage providers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scholarships</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-200/60">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-4xl font-black text-slate-950 my-2">{scholarshipCount.value}</p>
          <Link href="/admin/scholarships" className="text-xs font-bold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 transition-colors">
            <span>Manage scholarships</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Intakes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200/60">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-4xl font-black text-slate-950 my-2">{intakeCount.value}</p>
          <span className="text-[11px] text-slate-400 font-medium">Published or In Review</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Correction Reports</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200/60">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-4xl font-black text-amber-900 my-2">{pendingReports.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">User-reported mistake queue</span>
        </div>
      </div>

      {/* Main Grid: Correction Queue & Admin AI Extraction Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): Reported Mistakes Queue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
                Data Correction Reports
              </h2>
              <span className="text-xs text-slate-400">Report-a-Mistake triage</span>
            </div>

            {pendingReports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No open mistake reports. All verified records are currently clean.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {pendingReports.map((report) => (
                  <div key={report.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/scholarships/${report.scholarshipId}`}
                        className="font-serif text-sm font-bold text-[#0B1B3D] hover:text-amber-800"
                      >
                        {report.scholarshipName}
                      </Link>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        report.status === 'resolved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                      }`}>
                        {report.status}
                      </span>
                    </div>

                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px]">
                      &ldquo;{report.message}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        Reported on {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      {report.status !== 'resolved' && (
                        <form
                          action={async () => {
                            'use server';
                            await resolveDataReport(report.id, 'resolved');
                          }}
                        >
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px] transition-colors"
                          >
                            Mark Resolved
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Admin AI Extraction Assistant */}
        <div className="lg:col-span-5 space-y-4">
          <AdminAiAssistantClient />
        </div>

      </div>
    </div>
  );
}
