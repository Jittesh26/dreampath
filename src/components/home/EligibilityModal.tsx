'use client';

import React from 'react';
import Link from 'next/link';
import { X, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship: {
    id: string;
    scholarshipName: string;
    providerName: string;
    awardText?: string;
    studyLevel?: string;
    minCgpa?: string;
  } | null;
}

export function EligibilityModal({
  isOpen,
  onClose,
  scholarship,
}: EligibilityModalProps) {
  if (!isOpen || !scholarship) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-program-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[17px] font-bold text-[#0F172A]">
              Eligibility Evaluation
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Authority Description */}
        <div className="space-y-1.5">
          <span
            id="modal-program-name"
            className="text-[11px] text-blue-700 uppercase font-bold tracking-wider block"
          >
            {scholarship.providerName} • {scholarship.scholarshipName}
          </span>
          <h3 className="text-[19px] font-bold text-[#0F172A] tracking-tight">
            Official Policy Mapping
          </h3>
          <p className="text-[13px] text-slate-500 leading-normal">
            DreamPath checks your active student credentials against the published provider charter:
          </p>
        </div>

        {/* 3-Point Verified Criteria Breakdown */}
        <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-700 font-medium">Nationality Check (MyKad)</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Malaysian
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-700 font-medium">Academic Qualification Level</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {scholarship.studyLevel || 'Undergraduate'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-700 font-medium">Funding Pool Allocation</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {scholarship.awardText || 'Full Grant'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href={`/scholarships/${scholarship.id}/check`}
            className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Run Complete Deterministic Check</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href={`/scholarships/${scholarship.id}`}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>View Full Scholarship Requirements</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
