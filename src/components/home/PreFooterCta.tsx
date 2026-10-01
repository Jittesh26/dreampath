import Link from 'next/link';
import { ArrowRight, Check, Compass } from 'lucide-react';

export function PreFooterCta() {
  return (
    <section className="w-full pb-16 lg:pb-24 bg-[#F8FAFC]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] border border-slate-800 p-8 md:p-14 shadow-2xl overflow-hidden text-white">
          
          {/* Subtle Radial Glow */}
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-blue-300 text-[11px] uppercase font-bold tracking-wider">
                GET STARTED TODAY
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
                Ready to find your path?
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                Discover your matching Malaysian scholarship opportunities with structured rule-based clarity.
              </p>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <Link
                href="/eligibility"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[14px] font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 min-h-[44px]"
              >
                <span>Check Your Eligibility, Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/scholarships"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[14px] font-semibold px-6 py-4 rounded-xl transition-all min-h-[44px]"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Full Directory</span>
              </Link>
            </div>
          </div>

          {/* Micro Guarantee Strip */}
          <div className="relative pt-8 mt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-slate-400 text-[12px]">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-4 h-4 text-blue-400" />
                No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-4 h-4 text-blue-400" />
                Free For All Malaysian Students
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Check className="w-4 h-4 text-blue-400" />
                Privacy-Focused by Design
              </span>
            </div>

            <span className="text-[12px] text-blue-300 font-semibold">
              Active 2026/2027 Malaysian Intake Cycle
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
