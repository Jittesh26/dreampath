import { BadgeCheck, GitFork, ClipboardCheck, Award } from 'lucide-react';

export function VerificationArchitecture() {
  return (
    <section
      className="w-full bg-[#0B1120] text-white py-16 lg:py-28 relative overflow-hidden"
      id="architecture"
    >
      {/* Subtle royal blue radial glow in the center */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className="w-[780px] h-[520px] rounded-full bg-blue-600/15 blur-[160px]" />
      </div>

      {/* Dot-grid overlay fading to edges */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
        aria-hidden="true"
      >
        <svg className="w-full h-full text-slate-400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="arch-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#arch-dot-grid)" />
        </svg>
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 md:px-8 flex flex-col gap-14">
        
        {/* Section Header */}
        <div className="flex flex-col gap-3 max-w-3xl">
          <span className="text-[11px] text-blue-400 uppercase tracking-widest font-bold font-sans">
            VERIFICATION ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[38px] font-bold text-white tracking-tight leading-tight font-sans">
            Every rule, traced to its source.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Standard student portals rely on probabilistic models that hallucinate guidelines. DreamPath maps rule-based criteria derived directly from authoritative gazettes and foundation charters with direct deterministic matching.
          </p>
        </div>

        {/* 3-Phase Procedural Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          {/* Phase 01 */}
          <div className="relative bg-white/[0.04] border border-white/10 backdrop-blur-xs rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <BadgeCheck className="w-6 h-6 text-white" />
                </div>
                <span className="hidden md:flex text-slate-500 font-bold text-[20px]" aria-hidden="true">
                  →
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-blue-400 tracking-wider">
                  PHASE 01
                </span>
                <h3 className="text-[18px] font-bold text-white">
                  01. Profile Input
                </h3>
              </div>
              <p className="text-[14px] text-slate-300 leading-relaxed font-normal">
                Structured parameter intake covering certified SPM/STPM transcripts, MyKad citizenship verification, and official LHDN household income.
              </p>
            </div>
          </div>

          {/* Phase 02 */}
          <div className="relative bg-white/[0.04] border border-white/10 backdrop-blur-xs rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <GitFork className="w-6 h-6 text-white" />
                </div>
                <span className="hidden md:flex text-slate-500 font-bold text-[20px]" aria-hidden="true">
                  →
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-blue-400 tracking-wider">
                  PHASE 02
                </span>
                <h3 className="text-[18px] font-bold text-white">
                  02. Rule-Based Matching
                </h3>
              </div>
              <p className="text-[14px] text-slate-300 leading-relaxed font-normal">
                Execution of official policy criteria against published foundation guidelines. Checks strict residency, bond obligations, and prerequisite subjects.
              </p>
            </div>
          </div>

          {/* Phase 03 */}
          <div className="relative bg-white/[0.04] border border-white/10 backdrop-blur-xs rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-emerald-400 font-bold text-[20px]" aria-hidden="true">
                  ✓
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-blue-400 tracking-wider">
                  PHASE 03
                </span>
                <h3 className="text-[18px] font-bold text-white">
                  03. Verified Application
                </h3>
              </div>
              <p className="text-[14px] text-slate-300 leading-relaxed font-normal">
                Instant generation of an auditable qualification breakdown with eligibility scoring and direct routing to institutional portals.
              </p>
            </div>
          </div>

        </div>

        {/* Social Proof Band Inside Obsidian Navy */}
        <div className="p-6 md:p-8 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-blue-300" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[18px] font-bold text-white block">
                Rule-Based Accuracy for Malaysian Undergraduates & Pre-U Scholars.
              </span>
              <p className="text-[13px] text-slate-400">
                Every rule traced to published provider guidelines. Direct source provenance across active 2026/2027 cycles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0B1120] flex items-center justify-center text-white text-[11px] font-bold">
                AZ
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-700 border-2 border-[#0B1120] flex items-center justify-center text-white text-[11px] font-bold">
                TL
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-700 border-2 border-[#0B1120] flex items-center justify-center text-white text-[11px] font-bold">
                KH
              </div>
            </div>
            <span className="text-[12px] text-blue-300 font-bold tracking-wide">
              Source-Verified Evaluation
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
