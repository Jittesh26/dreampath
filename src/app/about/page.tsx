import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col font-sans">
      <SiteNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Our Mission &amp; Methodology</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
            About DreamPath
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Malaysia&rsquo;s Verified Scholarship &amp; Preparation Architecture
          </p>
        </div>

        {/* Disclaimer Ribbon */}
        <div className="p-4 bg-amber-50 border-l-4 border-amber-700 rounded-r-xl text-xs text-amber-950 leading-relaxed">
          <strong className="font-bold block mb-1">Non-Affiliation Notice:</strong>
          DreamPath is an independent educational consultancy platform. We are not officially affiliated with, endorsed by, or partnered with Gamuda, Yayasan Bank Rakyat, Maxis, Yayasan TM, JPA, Petronas, Bank Negara Malaysia, Yayasan Khazanah, or any other scholarship provider listed on this site.
        </div>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">
            The Problem: Hidden Criteria &amp; Wasted Time
          </h2>
          <p>
            The scholarship process in Malaysia has historically been opaque. Students spend hundreds of hours preparing extensive physical application folders, essays, and attending interviews only to discover they were disqualified at the initial screening due to an unannounced SPM subject cutoff or household income restriction.
          </p>
          <p>
            Generic scholarship websites frequently aggregate outdated guidelines or use speculative &ldquo;AI percentage chances&rdquo; that fabricate unrealistic expectations.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">
            The Solution: Trust Before AI
          </h2>
          <p>
            DreamPath enforces a strict architectural boundary between two distinct layers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <strong className="text-sm font-bold text-[#0B1B3D] block">1. The Authoritative Layer</strong>
              <p className="text-slate-600">
                Official source guidelines, verified intake cycles, structured AST rules, and deterministic eligibility logic. AI is never permitted to alter or hallucinate these cutoffs.
              </p>
            </div>
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <strong className="text-sm font-bold text-amber-900 block">2. The Intelligence Layer</strong>
              <p className="text-amber-800">
                Natural-language discovery, grounded Q&amp;A referencing verified records, conversational resume interviews, and interview panel simulations.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">
            How We Verify Every Record
          </h2>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p><strong>Official Guidelines Audit:</strong> We inspect the primary provider portals and PDF circulars directly from official sources.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p><strong>AST Rule Serialization:</strong> Human verifiers encode criteria into machine-checkable logic (e.g. CGPA &ge; 3.50, SPM Mathematics &ge; A).</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p><strong>Correction Queue:</strong> Our Report-a-Mistake infrastructure ensures outdated dates or criteria are reviewed within 24 hours.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
