import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/auth-user';

export default async function AboutPage() {
  const currentUser = await getAuthenticatedUser();
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav initialUser={currentUser} />

      {/* Ambient header bar */}
      <div className="pt-24 pb-10 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Our Mission &amp; Methodology</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 font-sans">
            About <span className="font-serif italic font-normal text-blue-900">DreamPath</span>
          </h1>
          <p className="text-sm text-slate-600 mt-2 font-normal">
            Independent Malaysian Scholarship Intelligence &amp; Preparation Architecture
          </p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl space-y-8">
        {/* Disclaimer Ribbon */}
        <div className="p-4.5 bg-amber-50/70 border-l-4 border-amber-600 rounded-r-2xl text-xs text-amber-950 leading-relaxed shadow-2xs">
          <strong className="font-bold block mb-1">Non-Affiliation Notice:</strong>
          DreamPath is an independent educational platform. We are not officially affiliated with, endorsed by, or partnered with JPA, MOHE/KPT, Gamuda, Yayasan Bank Rakyat, Maxis, Yayasan TM, PETRONAS, Bank Negara Malaysia, Yayasan Khazanah, YTL Foundation, or any other scholarship provider.
        </div>

        <section className="space-y-3 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-tight">
            The Problem: Hidden Criteria &amp; Wasted Time
          </h2>
          <p className="font-normal text-slate-600">
            The scholarship process in Malaysia has historically been opaque. Students spend hundreds of hours preparing extensive physical application folders, essays, and attending interviews only to discover they were disqualified at the initial screening due to an unannounced SPM subject cutoff or household income restriction.
          </p>
          <p className="font-normal text-slate-600">
            Generic scholarship websites frequently aggregate outdated guidelines or use speculative &ldquo;AI percentage chances&rdquo; that fabricate unrealistic expectations.
          </p>
        </section>

        <section className="space-y-4 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-tight">
            The Solution: Trust Before AI
          </h2>
          <p className="font-normal text-slate-600">
            DreamPath enforces a strict architectural boundary between two distinct layers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <strong className="text-sm font-bold text-slate-900 block">1. The Structured Criteria Layer</strong>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                Published provider guidelines, verified intake cycles, structured rule sets, and machine-checkable eligibility logic. AI is never permitted to alter or guess these criteria.
              </p>
            </div>
            <div className="p-5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-1.5">
              <strong className="text-sm font-bold text-blue-950 block">2. The Intelligence Layer</strong>
              <p className="text-xs text-blue-900/90 font-normal leading-relaxed">
                Natural-language discovery, grounded Q&amp;A referencing verified records, conversational resume interviews, and interview panel simulations.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-tight">
            How We Verify Every Record
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-normal text-slate-600"><strong className="text-slate-900 font-bold">Official Guidelines Audit:</strong> We inspect the primary provider portals and PDF circulars directly from published sources.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-normal text-slate-600"><strong className="text-slate-900 font-bold">Rule Serialization:</strong> Verified criteria are encoded into machine-checkable logic (e.g. CGPA &ge; 3.50, SPM Mathematics &ge; A).</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-normal text-slate-600"><strong className="text-slate-900 font-bold">Correction Queue:</strong> Our Report-a-Mistake infrastructure ensures outdated dates or criteria corrections are reviewed promptly.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
