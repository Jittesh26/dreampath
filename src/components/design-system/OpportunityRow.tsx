'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Scale,
  School,
  ShieldCheck,
} from 'lucide-react';
import { extractScholarshipAttributes } from '@/domain/scholarship-attributes';

export interface OpportunityRowProps {
  id: string;
  scholarshipName: string;
  providerName: string;
  description?: string;
  status: string;
  openDate: string | null;
  closeDate: string | null;
  studyLevel?: string;
  field?: string;
  isCompared?: boolean;
  onToggleCompare?: (id: string) => void;
  viewMode?: 'row' | 'card';
}

export function OpportunityRow({
  id,
  scholarshipName,
  providerName,
  description = '',
  status,
  openDate,
  closeDate,
  studyLevel = 'Undergraduate Degree',
  field = 'All Disciplines',
  isCompared = false,
  onToggleCompare,
  viewMode = 'row',
}: OpportunityRowProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('dreampath_saved_scholarships') || '[]');
        setIsSaved(saved.includes(id));
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem('dreampath_saved_scholarships') || '[]');
      let updated: string[];
      if (saved.includes(id)) {
        updated = saved.filter((sId: string) => sId !== id);
        setIsSaved(false);
      } else {
        updated = [...saved, id];
        setIsSaved(true);
      }
      localStorage.setItem('dreampath_saved_scholarships', JSON.stringify(updated));
    } catch {
      setIsSaved(!isSaved);
    }
  };

  const attrs = extractScholarshipAttributes(
    scholarshipName,
    description,
    '',
    closeDate,
    openDate,
    status,
    providerName
  );

  if (viewMode === 'card') {
    return (
      <div className="flex flex-col justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-lg hover:border-blue-300 transition-all group">
        <div className="flex flex-col gap-3.5">
          {/* Top Meta Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg ${attrs.providerMonogram.bgClass} text-white font-bold text-[13px] flex items-center justify-center shadow-xs shrink-0`}
              >
                {attrs.providerMonogram.text}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide line-clamp-1">
                  {providerName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {attrs.providerMonogram.tierTag}
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border ${attrs.deadlineUrgency.badgeClass}`}
            >
              {attrs.deadlineUrgency.label}
            </span>
          </div>

          {/* Title */}
          <div className="space-y-1 pt-1">
            <Link
              href={`/scholarships/${id}`}
              className="text-[17px] font-bold text-[#0F172A] group-hover:text-blue-700 transition-colors leading-snug line-clamp-2 font-sans"
            >
              {scholarshipName}
            </Link>
          </div>

          {/* Study Level & Field Summary */}
          <div className="flex items-center gap-2 text-slate-500 text-[13px]">
            <School className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">
              {studyLevel || attrs.studyLevel} • {field || attrs.eligibleFields}
            </span>
          </div>

          {/* Monetary Focal Point */}
          <div className="pt-2 pb-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Funding Coverage
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                {attrs.awardType}
              </span>
            </div>
            <span className="text-[24px] font-extrabold text-[#0B1727] tracking-tight block">
              {attrs.awardText}
            </span>
          </div>
        </div>

        {/* Card Footer Divider & Actions */}
        <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Deadline: {attrs.formattedDeadline}</span>
            </span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              href={`/scholarships/${id}/check`}
              className="flex-1 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[13px] font-semibold text-center transition-colors shadow-xs cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Check Eligibility</span>
            </Link>

            <Link
              href={`/scholarships/${id}`}
              className="px-3 py-2.5 text-blue-700 hover:text-blue-800 text-[13px] font-semibold text-center transition-colors inline-flex items-center gap-1 min-h-[44px]"
            >
              <span>Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(id)}
                aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  isCompared
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                }`}
                title={isCompared ? 'In Compare' : 'Add to compare'}
              >
                <Scale className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleSave}
              aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Row View (Editorial Row layout aligned with homepage aesthetic)
  return (
    <div className="bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md rounded-2xl p-5 sm:p-6 transition-all group">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left Column: Monogram, Identity, Description, Badges */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl ${attrs.providerMonogram.bgClass} text-white font-bold text-[14px] flex items-center justify-center shadow-xs shrink-0 mt-0.5`}
          >
            {attrs.providerMonogram.text}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 uppercase tracking-wide text-[11px]">
                {providerName}
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${attrs.deadlineUrgency.badgeClass}`}
              >
                {attrs.deadlineUrgency.label}
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Deadline: {attrs.formattedDeadline}</span>
              </span>
            </div>

            <Link href={`/scholarships/${id}`} className="block group-hover:text-blue-700 transition-colors">
              <h3 className="text-lg sm:text-[19px] font-bold text-[#0F172A] leading-snug font-sans">
                {scholarshipName}
              </h3>
            </Link>

            <p className="text-xs sm:text-[13px] text-slate-600 line-clamp-1 sm:line-clamp-2 max-w-3xl leading-relaxed">
              {description || 'Comprehensive scholarship covering tuition, allowances, and developmental mentoring.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-md">
                {studyLevel || attrs.studyLevel}
              </span>
              <span className="bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-md">
                {field || attrs.eligibleFields}
              </span>
              <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-md border border-blue-100">
                {attrs.awardText}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions Dock */}
        <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between lg:justify-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer min-h-[38px] ${
                  isCompared
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isCompared ? 'In Compare' : 'Compare'}</span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleSave}
              aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/scholarships/${id}/check`}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 min-h-[38px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Check Eligibility</span>
            </Link>

            <Link
              href={`/scholarships/${id}`}
              className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs min-h-[38px]"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

