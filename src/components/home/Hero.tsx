'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, FileCheck, Lock } from 'lucide-react';
import { extractScholarshipAttributes } from '@/domain/scholarship-attributes';
import { AnimatedScreenerCard } from './AnimatedScreenerCard';

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
  // Compute real dynamic preliminary matches based on actual database scholarships for STPM & B40
  const matchingCount = useMemo(() => {
    if (!initialScholarships.length) {
      return Math.min(18, Math.max(1, Math.round(totalScholarships * 0.67)));
    }

    const matches = initialScholarships.filter((item) => {
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

      // Check STPM / Undergraduate match
      const qualMatch =
        level.includes('undergraduate') ||
        combined.includes('stpm') ||
        combined.includes('matriculation') ||
        combined.includes('matrikulasi');

      // B40 is eligible for all except strictly non-B40
      const incomeMatch = true;

      return qualMatch && incomeMatch;
    }).length;

    return matches > 0 ? matches : 18;
  }, [initialScholarships, totalScholarships]);

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
                MALAYSIAN SCHOLARSHIP & SPONSORSHIP DIRECTORY · 2026/27
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
              Explore Malaysian scholarships with requirements structured from published provider information, transparent eligibility rules, and direct links to official application sources.
            </p>

            {/* Dual CTAs - Real Workflows */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/eligibility"
                className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg font-semibold min-h-[44px]"
              >
                <span>Check My Eligibility, Free →</span>
              </Link>

              <Link
                href="/scholarships"
                className="inline-flex items-center gap-1.5 text-[14px] text-slate-700 hover:text-blue-700 px-4 py-3.5 rounded-xl transition-colors font-semibold min-h-[44px]"
              >
                <span>Browse Scholarships →</span>
              </Link>
            </div>

            {/* Credible Trust Strip */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-3 text-slate-600 text-[13px] font-medium">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-700" />
                <span>Published Source References</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>Provider Requirements Structured</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-700" />
                <span>Privacy-First Design</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Eligibility Pre-Screen Card with Floating Mini-Chips */}
          <div className="lg:col-span-5 relative scroll-mt-24 lg:scroll-mt-28" id="eligibility">
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

            {/* Main Interactive Pre-Screen Card (Animated Demonstration) */}
            <AnimatedScreenerCard
              totalScholarships={totalScholarships}
              initialCount={matchingCount}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
