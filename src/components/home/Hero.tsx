'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, FileCheck, Lock, ChevronDown, Sparkles } from 'lucide-react';
import { extractScholarshipAttributes } from '@/domain/scholarship-attributes';

interface HeroProps {
  totalScholarships?: number;
  initialScholarships?: Array<{
    id: string;
    scholarshipName: string;
    providerName: string;
    description?: string;
    status?: string;
    openDate?: string | null;
    closeDate?: string | null;
  }>;
}

export function Hero({
  totalScholarships = 27,
  initialScholarships = [],
}: HeroProps) {
  const [qualification, setQualification] = useState('stpm');
  const [incomeTier, setIncomeTier] = useState('b40');

  // Compute real dynamic preliminary matches based on actual database scholarships
  const matchingCount = useMemo(() => {
    if (!initialScholarships.length) {
      return Math.max(1, Math.round(totalScholarships * 0.5));
    }

    return initialScholarships.filter((item) => {
      const attrs = extractScholarshipAttributes(
        item.scholarshipName,
        item.description || '',
        '',
        item.closeDate,
        item.openDate,
        item.status || 'published',
        item.providerName
      );

      const level = attrs.studyLevel.toLowerCase();
      const combined = `${item.scholarshipName} ${item.description || ''}`.toLowerCase();

      // Check qualification match
      let qualMatch = false;
      if (qualification === 'spm') {
        qualMatch = level.includes('pre-university') || level.includes('foundation') || combined.includes('spm');
      } else if (qualification === 'stpm') {
        qualMatch = level.includes('undergraduate') || combined.includes('stpm') || combined.includes('matriculation') || combined.includes('matrikulasi');
      } else if (qualification === 'alevels') {
        qualMatch = level.includes('undergraduate') || combined.includes('a-levels') || combined.includes('ib') || combined.includes('overseas');
      } else if (qualification === 'undergrad') {
        qualMatch = level.includes('undergraduate') || level.includes('postgraduate');
      } else if (qualification === 'diploma') {
        qualMatch = level.includes('diploma') || combined.includes('diploma') || combined.includes('tvet');
      } else {
        qualMatch = true;
      }

      // Check income tier match
      let incomeMatch = true;
      if (incomeTier === 't20') {
        if (combined.includes('b40 only') || combined.includes('strictly b40') || combined.includes('needy students only')) {
          incomeMatch = false;
        }
      }

      return qualMatch && incomeMatch;
    }).length;
  }, [initialScholarships, qualification, incomeTier, totalScholarships]);

  // Map user qualification to catalogue filter parameter
  const mappedLevel = useMemo(() => {
    if (qualification === 'spm') return 'SPM';
    if (qualification === 'stpm' || qualification === 'alevels') return 'Pre-U / Foundation';
    if (qualification === 'undergrad') return 'Undergraduate Degree';
    if (qualification === 'diploma') return 'Diploma';
    return 'All';
  }, [qualification]);

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#f8f9ff] pt-28 pb-16 lg:pt-36 lg:pb-28">
      {/* Ambient Animated Mesh Gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="ambient-mesh absolute -top-48 -left-20 w-[720px] h-[720px] rounded-full bg-blue-500/15 blur-[140px]" />
        <div className="ambient-mesh absolute top-1/4 -right-16 w-[620px] h-[620px] rounded-full bg-indigo-500/15 blur-[150px]" />
        <div className="ambient-mesh absolute -bottom-24 left-1/3 w-[560px] h-[560px] rounded-full bg-cyan-400/15 blur-[130px]" />

        {/* Fine grain / subtle dot overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-35 text-slate-300/60" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hero-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Copy & Trust Tokens */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2.5 self-start px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/90 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider font-sans">
                MALAYSIAN HIGHER EDUCATION SPONSORSHIP DIRECTORY
              </span>
            </div>

            {/* Main Headline with Editorial Italic Serif Accent */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[44px] font-bold text-[#0F172A] tracking-tight leading-[1.15] font-sans">
              Stop Guessing Your Scholarship Eligibility. Apply With{' '}
              <span className="font-serif italic font-normal text-blue-700 block sm:inline">
                Verified Confidence.
              </span>
            </h1>

            {/* Body Description */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
              Every Malaysian scholarship, checked against official provider rules. Direct source provenance. Zero guesswork.
            </p>

            {/* Dual CTAs - Real Workflows */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/scholarships"
                className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg font-semibold min-h-[44px]"
              >
                <span>Check My Eligibility, Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/scholarships"
                className="inline-flex items-center gap-1.5 text-[14px] text-slate-700 hover:text-blue-700 px-4 py-3.5 rounded-xl transition-colors font-semibold min-h-[44px]"
              >
                <span>Browse {totalScholarships} Verified Programs</span>
                <span className="text-sm">↗</span>
              </Link>
            </div>

            {/* Credible Trust Strip */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-3 text-slate-600 text-[13px] font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>Source-Verified Provenance</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-700" />
                <span>Published Provider Charters</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-700" />
                <span>PDPA Act 709 Compliant</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Eligibility Pre-Screen Card with Floating Mini-Chips */}
          <div className="lg:col-span-5 relative" id="pre-screen">
            {/* Floating Preview Mini-Card 1 (Top-Left Parallax Accent) */}
            <div className="hidden sm:flex absolute -top-5 -left-6 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-indigo-100 shadow-lg shadow-indigo-500/10 pointer-events-none transform -rotate-2">
              <div className="w-6 h-6 rounded-md bg-indigo-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                YTL
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-800 leading-tight">YTL Foundation</span>
                <span className="text-[10px] font-semibold text-emerald-700">RM 150,000 Cap</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />
            </div>

            {/* Floating Preview Mini-Card 2 (Bottom-Right Parallax Accent) */}
            <div className="hidden sm:flex absolute -bottom-5 -right-5 z-20 items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-cyan-100 shadow-lg shadow-blue-500/10 pointer-events-none transform rotate-2">
              <div className="w-6 h-6 rounded-md bg-sky-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                JPA
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-800 leading-tight">JPA PIDN</span>
                <span className="text-[10px] font-semibold text-blue-700">Full Tuition + Allowance</span>
              </div>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>

            {/* Main Interactive Pre-Screen Card with Luminous Indigo-Cyan Border */}
            <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-indigo-500/40 via-blue-500/25 to-cyan-400/40 shadow-2xl shadow-blue-500/10">
              <div className="relative bg-white/95 backdrop-blur-xl rounded-[15px] p-6 md:p-8">
                {/* Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      PRE-SCREENING ENGINE
                    </span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    Step 1 of 2
                  </span>
                </div>

                <div className="space-y-1 py-4">
                  <h2 className="text-[20px] font-bold text-[#0F172A] tracking-tight">
                    Quick Eligibility Screener
                  </h2>
                  <p className="text-[13px] text-slate-500 leading-normal">
                    Configure your background for an instant preliminary rule screening against active cycles.
                  </p>
                </div>

                {/* Form Fields */}
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  {/* Field 1: Qualification */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-slate-700" htmlFor="qualification">
                      Academic Qualification & Grades
                    </label>
                    <div className="relative">
                      <select
                        id="qualification"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        className="w-full h-[44px] px-3.5 pr-10 bg-slate-50 border border-slate-200 text-slate-900 text-[14px] rounded-xl shadow-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600/30 font-medium cursor-pointer"
                      >
                        <option value="spm">SPM 2024/2025 (7A+ to 9A+)</option>
                        <option value="stpm">STPM / Matriculation (CGPA 3.75+)</option>
                        <option value="alevels">A-Levels / IB (AAA or 40+ points)</option>
                        <option value="undergrad">Undergraduate Degree (CGPA 3.50+)</option>
                        <option value="diploma">Diploma / TVET Premier Track</option>
                      </select>
                      <ChevronDown className="w-5 h-5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Field 2: Income */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-slate-700" htmlFor="income-tier">
                      Household Income Tier (LHDN Definition)
                    </label>
                    <div className="relative">
                      <select
                        id="income-tier"
                        value={incomeTier}
                        onChange={(e) => setIncomeTier(e.target.value)}
                        className="w-full h-[44px] px-3.5 pr-10 bg-slate-50 border border-slate-200 text-slate-900 text-[14px] rounded-xl shadow-xs appearance-none focus:outline-none focus:ring-2 focus:ring-blue-600/30 font-medium cursor-pointer"
                      >
                        <option value="b40">B40 Tier (Gross Household &lt; RM 5,250/mo)</option>
                        <option value="m40">M40 Tier (RM 5,250 - RM 11,819/mo)</option>
                        <option value="t20">T20 Tier (Gross Household &gt; RM 11,820/mo)</option>
                        <option value="all">Open / All Income Tiers</option>
                      </select>
                      <ChevronDown className="w-5 h-5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dynamic Match Output Pill */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 transition-all">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[13px] font-semibold text-emerald-950">
                        ✓ Matches {matchingCount} of {totalScholarships} Programs
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-wider shrink-0">
                      PRELIMINARY MATCH
                    </span>
                  </div>

                  {/* Action Link: Directly opens catalogue filtered by qualification */}
                  <Link
                    href={`/scholarships?level=${encodeURIComponent(mappedLevel)}`}
                    className="w-full h-[46px] flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                  >
                    <span>Evaluate Full Criteria Matches</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </form>

                <div className="pt-3 text-center">
                  <span className="text-[12px] text-slate-500">
                    Preliminary screening only. Full evaluation checks transcripts & provider charters.
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
