'use client';

import React, { useMemo } from 'react';
import { ResumeContent } from '@/domain/resume';
import { CheckCircle2, AlertTriangle, X, ShieldCheck } from 'lucide-react';

interface ATSCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ResumeContent;
}

export function ATSCheckerModal({ isOpen, onClose, content }: ATSCheckerModalProps) {
  const analysis = useMemo(() => {
    let score = 50; // base
    const checks: Array<{
      category: string;
      label: string;
      passed: boolean;
      tip: string;
    }> = [];

    // 1. Personal Contact Info
    const hasName = Boolean(content.personal?.fullName?.trim());
    const hasEmail = Boolean(content.personal?.email?.trim());
    const hasPhone = Boolean(content.personal?.phone?.trim());
    const hasContact = hasName && hasEmail;

    if (hasContact) score += 15;
    checks.push({
      category: 'Contact Info',
      label: 'Full Name & Email Address',
      passed: hasContact,
      tip: hasContact ? 'Passed' : 'Add your full name and official contact email.',
    });

    if (hasPhone) score += 5;
    checks.push({
      category: 'Contact Info',
      label: 'Phone / WhatsApp Contact',
      passed: hasPhone,
      tip: hasPhone ? 'Passed' : 'Include a contact number so interview panels can reach you.',
    });

    // 2. Education Section
    const hasEducation = content.education && content.education.length > 0;
    if (hasEducation) score += 15;
    checks.push({
      category: 'Education',
      label: 'Tertiary / Secondary Education',
      passed: hasEducation,
      tip: hasEducation ? `${content.education.length} education records listed.` : 'Add your current university, diploma, or SPM record.',
    });

    // 3. Experience & Projects
    const totalExperience = (content.experience?.length || 0) + (content.projects?.length || 0);
    const hasExpOrProj = totalExperience > 0;
    if (hasExpOrProj) score += 15;
    checks.push({
      category: 'Experience & Projects',
      label: 'Practical Projects or Work Experience',
      passed: hasExpOrProj,
      tip: hasExpOrProj
        ? `${totalExperience} practical milestones recorded.`
        : 'Scholarship committees look for practical initiative. Add at least 1 project or role.',
    });

    // 4. Skills
    const techSkillsCount = content.skills?.technical?.length || 0;
    const hasSkills = techSkillsCount > 0;
    checks.push({
      category: 'Skills',
      label: 'Categorized Technical / Academic Skills',
      passed: hasSkills,
      tip: hasSkills
        ? `${techSkillsCount} skills listed.`
        : 'Add relevant tools, software, or technical skills.',
    });

    // Ensure score is capped between 0 and 100
    const finalScore = Math.min(100, Math.max(20, score));

    return {
      score: finalScore,
      checks,
    };
  }, [content]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-serif text-xl font-bold text-[#0B1B3D]">
              Resume ATS & Structure Review
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Card */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Readability & Completeness Score
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif text-4xl font-bold text-[#0B1B3D]">
                {analysis.score}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ 100 points</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {analysis.score >= 80
                ? 'Strong ATS compliance. Clear hierarchy and essential fields present.'
                : 'Good progress. Address the missing sections below to maximize impact.'}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-serif text-lg font-bold text-emerald-900 shrink-0 bg-white">
            {analysis.score}%
          </div>
        </div>

        {/* Breakdown Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Section Audit Checklist
          </h4>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {analysis.checks.map((item, idx) => (
              <div key={idx} className="p-3.5 flex items-start gap-3 bg-white">
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
                    }`}>
                      {item.passed ? 'Pass' : 'Improve'}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{item.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900">
          <strong>Note:</strong> DreamPath ATS check evaluates standard human-resource parsing standards (clean headings, single-column readability, non-broken contact blocks). Different organizations may use varying evaluation criteria.
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0B1B3D] text-white text-xs font-bold rounded-xl hover:bg-[#132A5C] transition-colors"
          >
            Close & Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
}
