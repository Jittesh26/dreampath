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
        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
          Trust &amp; Verification Infrastructure
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
          Administrator Console
        </h1>
        <p className="font-sans text-slate-500 text-sm mt-1">
          Monitor authoritative scholarship datasets, review reported factual corrections, and verify provider guidelines.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Providers</span>
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <p className="font-serif text-4xl font-bold text-[#0B1B3D] my-2">{providerCount.value}</p>
          <Link href="/admin/providers" className="text-xs font-semibold text-amber-900 hover:text-amber-950 inline-flex items-center gap-1 transition-colors">
            <span>Manage providers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Scholarships</span>
            <Award className="w-4 h-4 text-[#0B1B3D]" />
          </div>
          <p className="font-serif text-4xl font-bold text-[#0B1B3D] my-2">{scholarshipCount.value}</p>
          <Link href="/admin/scholarships" className="text-xs font-semibold text-[#0B1B3D] hover:underline inline-flex items-center gap-1 transition-colors">
            <span>Manage scholarships</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Intakes</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif text-4xl font-bold text-[#0B1B3D] my-2">{intakeCount.value}</p>
          <span className="text-[11px] text-slate-400">Published or In Review</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Correction Reports</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-4xl font-bold text-amber-900 my-2">{pendingReports.length}</p>
          <span className="text-[11px] text-slate-400">User-reported mistake queue</span>
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
