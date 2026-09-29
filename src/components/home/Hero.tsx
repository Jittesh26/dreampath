'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, ArrowRight, Play, RotateCcw } from 'lucide-react';

export function Hero() {
  // Interactive Live Product Demo State
  const [demoStep, setDemoStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const demoStages = [
    {
      stage: '1. Requirement Node',
      scholarship: 'Gamuda Scholarship 2026',
      rule: 'Minimum CGPA >= 3.50',
      studentInput: 'Student Profile CGPA: 3.72',
      operator: 'GREATER_THAN_OR_EQUAL',
      status: 'MET',
      reason: 'Requirement satisfied (3.72 >= 3.50)',
    },
    {
      stage: '2. Subject Criteria',
      scholarship: 'Gamuda Scholarship 2026',
      rule: 'SPM English >= A-',
      studentInput: 'Student SPM English: A',
      operator: 'HAS_SPM_SUBJECT_GRADE',
      status: 'MET',
      reason: 'Requirement satisfied (A >= A-)',
    },
    {
      stage: '3. Household Criteria',
      scholarship: 'Yayasan Sime Darby',
      rule: 'Income Band: B40 or M40',
      studentInput: 'Household Income: RM 4,200 (B40)',
      operator: 'IN_ARRAY',
      status: 'MET',
      reason: 'Eligible for Full Living Stipend Grant',
    },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoStages.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPlaying, demoStages.length]);

  const currentDemo = demoStages[demoStep];

  const pathSteps = [
    { label: 'Discover', desc: 'Verified 2026 Intakes' },
    { label: 'Understand', desc: 'Official Sources' },
    { label: 'Check', desc: 'Deterministic AST' },
    { label: 'Save', desc: 'Deadline Reminders' },
    { label: 'Apply', desc: 'Tailored Resume' },
    { label: 'Track', desc: 'Kanban Progress' },
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-[#FAFAF9] relative overflow-hidden border-b border-slate-200">
      {/* Subtle architectural dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#0B1B3D 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="container px-4 sm:px-6 lg:px-8 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left 7 Columns: Editorial Headline, Storytelling & CTAs */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-800 uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            <span>Officially Verified Malaysian Scholarship Platform</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">Updated for 2026/2027 Cycle</span>
          </div>

          <h1 className="font-serif text-[#0B1B3D] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal leading-[1.08] tracking-tight">
            Stop guessing your eligibility. Apply with{' '}
            <span className="italic text-amber-800 font-serif">mathematical certainty</span>.
          </h1>

          <p className="font-sans text-slate-600 text-lg md:text-xl max-w-2xl font-normal leading-relaxed">
            DreamPath encodes official Malaysian scholarship requirements into a transparent, deterministic matching engine. When we say you qualify, it is backed by verified provider rules, not unpredictable AI hallucinations.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Link
              href="/scholarships"
              className={buttonVariants({
                variant: 'default',
                size: 'lg',
                className: 'h-13 px-8 text-base font-bold bg-[#0B1B3D] hover:bg-[#132A5C] text-white shadow-md hover:shadow-lg transition-all',
              })}
            >
              <span>Explore Verified Scholarships</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/about"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'h-13 px-7 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900',
              })}
            >
              How Verification Works
            </Link>
          </div>

          {/* Factual Highlights / Trust Footnote */}
          <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              27 Manually Verified Scholarships
            </span>
            <span aria-hidden="true">·</span>
            <span>24 Official Malaysian Providers</span>
            <span aria-hidden="true">·</span>
            <span>Zero Hallucinated Cutoffs</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-semibold">100% Free for Students</span>
          </div>
        </div>

        {/* Right 5 Columns: Signature Visual Moment & Interactive Live Deterministic Demo */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Interactive Requirement Verification Card Demo */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            {/* Header / Demo controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-mono font-semibold tracking-wider text-slate-800 uppercase">
                  Live Deterministic Engine
                </span>
              </div>
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  if (!isPlaying) setDemoStep((s) => (s + 1) % demoStages.length);
                }}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
                aria-label="Toggle demo animation"
              >
                {isPlaying ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <Play className="w-3 h-3" /> Step {demoStep + 1}/3
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Replay
                  </span>
                )}
              </button>
            </div>

            {/* Active Demo Content with smooth transition */}
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{currentDemo.stage}</span>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                  {currentDemo.scholarship}
                </span>
              </div>

              {/* Requirement Rule box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  Machine-Checkable Rule (AST)
                </p>
                <p className="text-sm font-semibold text-[#0B1B3D]">
                  {currentDemo.rule}
                </p>
              </div>

              {/* Student Input comparison */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    Authoritative Student Fact
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {currentDemo.studentInput}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Engine verdict */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-950 font-medium leading-tight">
                  <strong className="font-bold text-emerald-800">Status: {currentDemo.status}</strong> — {currentDemo.reason}
                </div>
              </div>
            </div>

            {/* Micro progress indicator */}
            <div className="pt-2 flex items-center gap-1.5">
              {demoStages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDemoStep(idx);
                    setIsPlaying(false);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === demoStep ? 'w-8 bg-amber-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Jump to demo step ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* DreamPath Step Sequence (Discover -> Understand -> Check -> Save -> Apply -> Track) */}
          <div className="bg-white/80 border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <p className="text-xs uppercase font-mono font-bold tracking-wider text-slate-500 mb-3">
              The DreamPath Student Journey
            </p>
            <div className="grid grid-cols-3 gap-2 text-left">
              {pathSteps.map((step, idx) => (
                <div key={step.label} className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                  <span className="text-[10px] font-mono font-semibold text-amber-800 block">
                    0{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {step.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
