'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight, CheckCircle2, Sparkles, Check } from 'lucide-react';

interface AnimatedScreenerCardProps {
  totalScholarships?: number;
  initialCount?: number;
}

const STEP_DURATIONS = [
  3000, // Step 1: Academic Profile (~3.0s)
  3000, // Step 2: Financial Background (~3.0s)
  3000, // Step 3: Study Level & Field (~3.0s)
  3800, // Step 4: Preliminary Match Result (~3.8s)
]; // Total cycle: 12.8s (within recommended 10–14s)

export function AnimatedScreenerCard({
  totalScholarships = 27,
  initialCount = 18,
}: AnimatedScreenerCardProps) {
  const [step, setStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);

  const isReducedMotion = useReducedMotion();
  const mountTimeRef = useRef(0);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  // Target preliminary matching count
  const targetCount = useMemo(() => {
    return initialCount > 0 ? initialCount : Math.min(18, totalScholarships);
  }, [initialCount, totalScholarships]);

  const effectiveDisplayCount = isReducedMotion ? targetCount : displayCount;

  // Robust, non-freezing hover handling
  const handleMouseEnter = useCallback(() => {
    // 1. Never pause during the initial 3.5s mount period so the demo starts immediately even if cursor rests on card
    if (Date.now() - mountTimeRef.current < 3500) return;

    // 2. Only pause on devices that truly support hover (never pause on touch/mobile)
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    setIsPaused(true);

    // 3. Safety auto-resume: if user leaves pointer resting on card, resume after 3.5s so card never freezes
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 3500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setIsPaused(false);
  }, []);

  // Ensure window blur, tab switch, or pointer leaving iframe releases pause
  useEffect(() => {
    const handleUnpause = () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      setIsPaused(false);
    };

    window.addEventListener('blur', handleUnpause);
    window.addEventListener('pointerup', handleUnpause);
    document.addEventListener('visibilitychange', handleUnpause);

    return () => {
      window.removeEventListener('blur', handleUnpause);
      window.removeEventListener('pointerup', handleUnpause);
      document.removeEventListener('visibilitychange', handleUnpause);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  // Automated calm looping sequence (Input -> Check -> Check -> Result -> Repeat)
  useEffect(() => {
    if (isPaused) return;

    const currentDuration = STEP_DURATIONS[step - 1] || 3000;
    const timer = setTimeout(() => {
      setStep((prev) => (prev % 4) + 1);
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [step, isPaused]);

  // Number counting animation for Step 4 (0 -> ... -> 18)
  useEffect(() => {
    if (step !== 4 || isReducedMotion) return;

    let animationFrameId: number;
    const duration = 1100; // 1.1s
    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * targetCount);
      setDisplayCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      setDisplayCount(0);
    };
  }, [step, targetCount, isReducedMotion]);

  // Motion variants respecting prefers-reduced-motion
  const stepVariants: Variants = {
    initial: {
      opacity: 0,
      y: isReducedMotion ? 0 : 6,
      filter: isReducedMotion ? 'none' : 'blur(2px)',
    },
    animate: {
      opacity: 1,
      y: 0,
      filter: 'none',
      transition: {
        duration: isReducedMotion ? 0.01 : 0.35,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: isReducedMotion ? 0 : -4,
      filter: isReducedMotion ? 'none' : 'blur(2px)',
      transition: {
        duration: isReducedMotion ? 0.01 : 0.2,
        ease: 'easeOut',
      },
    },
  };

  return (
    <div
      data-testid="screener-card"
      data-step={step}
      className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-indigo-500/40 via-blue-500/25 to-cyan-400/40 shadow-2xl shadow-blue-500/10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative bg-white/95 backdrop-blur-xl rounded-[15px] p-6 md:p-8">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              PRE-SCREENING ENGINE
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtle Progress Indicator Dots: ● ○ ○ ○ */}
            <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 4`}>
              {[1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                    i === step
                      ? 'w-4.5 bg-blue-600'
                      : i < step
                      ? 'w-2 bg-blue-400/80'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Step ${i}`}
                  aria-label={`Jump to Step ${i}`}
                />
              ))}
            </div>

            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 tabular-nums">
              Step {step} of 4
            </span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1 py-4">
          <h2 className="text-[20px] font-bold text-[#0F172A] tracking-tight">
            Quick Eligibility Screener
          </h2>
          <p className="text-[13px] text-slate-500 leading-normal">
            Configure your background for an instant preliminary rule screening against active cycles.
          </p>
        </div>

        {/* Stable Stage Content Area (Fixed Height prevents any outer card resize or jump) */}
        <div className="relative min-h-[178px] h-[178px] overflow-hidden select-none">
          <AnimatePresence mode="wait">
            {/* STEP 1: ACADEMIC PROFILE */}
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-semibold text-slate-700">
                      Academic Qualification & Grades
                    </label>
                    <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      Analyzing
                    </span>
                  </div>

                  <div className="w-full h-[46px] px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between shadow-xs">
                    <span className="text-[14px] font-semibold text-slate-900">
                      STPM / Matriculation
                    </span>
                    <span className="text-[12px] font-bold text-blue-700 bg-blue-50/90 border border-blue-200/70 px-2 py-0.5 rounded-md">
                      CGPA 3.75+
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-slate-700 text-[12.5px] leading-tight">
                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Academic threshold met for top tier merit charters</span>
                </div>
              </motion.div>
            )}

            {/* STEP 2: FINANCIAL BACKGROUND */}
            {step === 2 && (
              <motion.div
                key="step-2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-semibold text-slate-700">
                      Household Income Tier (LHDN Definition)
                    </label>
                    <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Validating
                    </span>
                  </div>

                  <div className="w-full h-[46px] px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between shadow-xs">
                    <span className="text-[14px] font-semibold text-slate-900">
                      B40 Tier
                    </span>
                    <span className="text-[12px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      Gross Household &lt; RM 5,250/mo
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 text-[12.5px] leading-tight">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Qualifies for high-priority needs-based sponsorship quotas</span>
                </div>
              </motion.div>
            )}

            {/* STEP 3: STUDY LEVEL & FIELD */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-semibold text-slate-700">
                      Study Level & Field
                    </label>
                    <span className="text-[11px] font-medium text-indigo-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                      Matching
                    </span>
                  </div>

                  <div className="w-full h-[46px] px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between shadow-xs">
                    <span className="text-[14px] font-semibold text-slate-900">
                      Undergraduate
                    </span>
                    <span className="text-[12px] font-semibold text-indigo-700 bg-indigo-50/90 border border-indigo-200/70 px-2 py-0.5 rounded-md">
                      Computer Science / Technology
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/70 text-indigo-900 text-[12.5px] leading-tight">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>Aligned with high-demand national STEM priority sectors</span>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PRELIMINARY MATCH RESULT */}
            {step === 4 && (
              <motion.div
                key="step-4"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-3"
              >
                {/* Result Banner with Animated Counter */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 transition-all shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        Preliminary Match
                      </div>
                      <div className="text-[14px] font-bold text-emerald-950">
                        Matches{' '}
                        <span className="text-emerald-700 text-[16px] font-extrabold tabular-nums">
                          {effectiveDisplayCount}
                        </span>{' '}
                        of {totalScholarships} Programs
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-wider shrink-0 shadow-xs">
                    PRELIMINARY MATCH
                  </span>
                </div>

                {/* Verified profile summary chips */}
                <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                  <div className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-medium">Academics</div>
                    <div className="text-[11px] font-bold text-slate-800 truncate">STPM 3.75+</div>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-medium">Income</div>
                    <div className="text-[11px] font-bold text-slate-800 truncate">B40 Tier</div>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500 font-medium">Field</div>
                    <div className="text-[11px] font-bold text-slate-800 truncate">CS / Tech</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Link: Directly opens catalogue */}
        <Link
          href="/scholarships?level=Undergraduate%20Degree"
          className="w-full h-[46px] flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] font-semibold rounded-xl transition-all shadow-md hover:shadow-lg mt-3"
        >
          <span>Evaluate Full Criteria Matches</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Explanatory Disclaimer */}
        <div className="pt-3 text-center">
          <span className="text-[12px] text-slate-500">
            Preliminary screening only. Full evaluation checks transcripts & provider charters.
          </span>
        </div>
      </div>
    </div>
  );
}
