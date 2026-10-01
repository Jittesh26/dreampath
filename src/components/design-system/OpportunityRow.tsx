'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Scale,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

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
  field = 'STEM / All Disciplines',
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

  // Determine availability status
  const today = new Date();
  const close = closeDate ? new Date(closeDate) : null;
  const open = openDate ? new Date(openDate) : null;

  let badgeStatus = 'open';
  let deadlineText = 'Active cycle';

  if (status === 'closed' || (close && today > close)) {
    badgeStatus = 'closed';
    deadlineText = close ? `Closed on ${close.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}` : 'Closed';
  } else if (open && today < open) {
    badgeStatus = 'opening-soon';
    deadlineText = `Opens ${open.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`;
  } else if (close) {
    const diffDays = Math.ceil((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 14) {
      badgeStatus = 'closing-soon';
      deadlineText = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} remaining`;
    } else {
      badgeStatus = 'open';
      deadlineText = `Closes ${close.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`;
    }
  }

  // Extract key award snippet if available
  const awardSnippet = description.length > 120 ? `${description.slice(0, 117)}...` : description;

  if (viewMode === 'card') {
    return (
      <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              {providerName}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={badgeStatus} size="sm" />
              <button
                type="button"
                onClick={toggleSave}
                aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isSaved
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          <Link href={`/scholarships/${id}`} className="block group-hover:text-amber-800 transition-colors">
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D] leading-snug line-clamp-2">
              {scholarshipName}
            </h3>
          </Link>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {awardSnippet || 'Full tuition and living stipend opportunities for qualified Malaysian students.'}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
              {studyLevel}
            </span>
            <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md truncate max-w-[150px]">
              {field}
            </span>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium truncate">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{deadlineText}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(id)}
                className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                  isCompared
                    ? 'bg-[#0B1B3D] text-white border-[#0B1B3D]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {isCompared ? 'Comparing' : '+ Compare'}
              </button>
            )}
            <Link
              href={`/scholarships/${id}`}
              className="inline-flex items-center gap-1 font-bold text-[#0B1B3D] hover:text-amber-800 transition-colors"
            >
              <span>Details</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Row View (Editorial Row layout)
  return (
    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all group">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Info Column */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              {providerName}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <StatusBadge status={badgeStatus} size="sm" />
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{deadlineText}</span>
            </span>
          </div>

          <Link href={`/scholarships/${id}`} className="block group-hover:text-amber-800 transition-colors">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0B1B3D] leading-snug">
              {scholarshipName}
            </h3>
          </Link>

          <p className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-2 max-w-3xl leading-relaxed">
            {awardSnippet || 'Comprehensive scholarship covering tuition, allowances, and developmental mentoring.'}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-md">
              {studyLevel}
            </span>
            <span className="bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-md">
              {field}
            </span>
          </div>
        </div>

        {/* Right Actions Dock */}
        <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between lg:justify-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  isCompared
                    ? 'bg-[#0B1B3D] text-white border-[#0B1B3D]'
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
              className={`p-2 rounded-xl border transition-colors ${
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
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Check Eligibility</span>
            </Link>

            <Link
              href={`/scholarships/${id}`}
              className="px-4 py-1.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
