import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav />

      {/* Ambient header bar */}
      <div className="pt-24 pb-10 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200/60 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Consultancy Disclaimers &amp; Scope</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 font-sans">
            Terms of Service &amp; <span className="font-serif italic font-normal text-blue-900">Disclaimer</span>
          </h1>
          <p className="text-sm text-slate-600 mt-2 font-normal">
            Last Updated: March 2026 · Independent Malaysian Scholarship Consultancy
          </p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl space-y-8">
        <div className="p-4.5 bg-amber-50/70 border-l-4 border-amber-600 rounded-r-2xl text-xs text-amber-950 leading-relaxed space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Non-Affiliation &amp; Independent Liability Disclaimer</span>
          </div>
          <p className="font-normal text-amber-900/90">
            DreamPath is a third-party discovery and preparation platform. While we rigorously test and encode published criteria, official criteria are subject to revision by respective providers. DreamPath does not guarantee selection, admission, or award disbursement. <strong>Always confirm terms on the official provider portal before filing official papers.</strong>
          </p>
        </div>

        <section className="space-y-3 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-tight">1. Independent Discovery Platform</h2>
          <p className="font-normal text-slate-600">
            DreamPath is not officially endorsed by, partnered with, or an agent of Gamuda, Yayasan Bank Rakyat, Maxis, Yayasan TM, JPA, Petronas, Bank Negara Malaysia, Yayasan Khazanah, or any other scholarship provider listed on this site.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-tight">2. Deterministic Matching Scope</h2>
          <p className="font-normal text-slate-600">
            Our deterministic eligibility engine validates user-submitted facts against published criteria. An &ldquo;Eligible&rdquo; outcome indicates your numbers meet the machine-checkable thresholds; it does not constitute an official acceptance or contract with the scholarship provider.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-sans tracking-tight">3. User Responsibilities &amp; Truthfulness</h2>
          <p className="font-normal text-slate-600">
            Students agree to provide accurate information when using the platform. Automated scraping or submitting abusive mistake reports is prohibited.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
