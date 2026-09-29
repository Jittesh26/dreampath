import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
            Terms of Service &amp; Consultancy Disclaimer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Last Updated: March 2026 · Independent Malaysian Scholarship Consultancy
          </p>
        </div>

        <div className="p-4 bg-amber-50 border-l-4 border-amber-700 rounded-r-xl text-xs text-amber-950 leading-relaxed space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Non-Affiliation &amp; Independent Liability Disclaimer</span>
          </div>
          <p>
            DreamPath is a third-party discovery and preparation platform. While we rigorously test and encode published criteria, official criteria are subject to revision by respective providers. DreamPath does not guarantee selection, admission, or award disbursement. <strong>Always confirm terms on the official provider portal before filing official papers.</strong>
          </p>
        </div>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">1. Independent Discovery Platform</h2>
          <p>
            DreamPath is not officially endorsed by, partnered with, or an agent of Gamuda, Yayasan Bank Rakyat, Maxis, Yayasan TM, JPA, Petronas, Bank Negara Malaysia, Yayasan Khazanah, or any other scholarship provider listed on this site.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">2. Deterministic Matching Scope</h2>
          <p>
            Our deterministic eligibility engine validates user-submitted facts against published criteria. An &ldquo;Eligible&rdquo; outcome indicates your numbers meet the machine-checkable thresholds; it does not constitute an official acceptance or contract with the scholarship provider.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">3. User Responsibilities &amp; Truthfulness</h2>
          <p>
            Students agree to provide accurate information when using the platform. Automated scraping or submitting abusive mistake reports is prohibited.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
