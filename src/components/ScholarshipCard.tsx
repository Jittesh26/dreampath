'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, CheckCircle2, ArrowRight } from 'lucide-react';
import { saveScholarshipApplication } from '@/app/actions/student';

interface ScholarshipCardProps {
  id: string;
  providerName: string;
  scholarshipName: string;
  status: string;
  openDate: string | null;
  closeDate: string | null;
  studyLevel?: string;
  field?: string;
  onToggleCompare?: (id: string) => void;
  isCompared?: boolean;
}

export function ScholarshipCard({
  id,
  providerName,
  scholarshipName,
  status,
  openDate,
  closeDate,
  studyLevel = 'Undergraduate Degree',
  field = 'STEM / All Fields',
  onToggleCompare,
  isCompared = false,
}: ScholarshipCardProps) {
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
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      const saved = JSON.parse(localStorage.getItem('dreampath_saved_scholarships') || '[]');
      const updated = nextSaved ? [...saved, id] : saved.filter((sId: string) => sId !== id);
      localStorage.setItem('dreampath_saved_scholarships', JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (nextSaved) {
      try {
        saveScholarshipApplication(id, 'not_started');
      } catch {
        // ignore
      }
    }
  };

  // Determine dynamic availability & relative deadline
  let displayStatus = 'Open';
  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let deadlineNote = 'Ongoing cycle';

  if (status === 'closed') {
    displayStatus = 'Closed';
    statusColor = 'text-slate-600 bg-slate-100 border-slate-200';
    deadlineNote = 'Intake completed';
  } else if (status === 'published') {
    const today = new Date();
    const open = openDate ? new Date(openDate) : null;
    const close = closeDate ? new Date(closeDate) : null;

    if (close && today > close) {
      displayStatus = 'Closed';
      statusColor = 'text-slate-600 bg-slate-100 border-slate-200';
      deadlineNote = 'Deadline passed';
    } else if (open && today < open) {
      displayStatus = 'Opening Soon';
      statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
      deadlineNote = `Opens ${open.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`;
    } else if (close) {
      const diffDays = Math.ceil((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        displayStatus = 'Closing Soon';
        statusColor = 'text-amber-800 bg-amber-50 border-amber-300';
        deadlineNote = `${diffDays} days left`;
      } else {
        displayStatus = 'Open';
        statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        deadlineNote = `Closes ${close.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}`;
      }
    }
  }

  const formattedCloseDate = closeDate
    ? new Date(closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not Specified';

  return (
    <div className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-lg transition-all duration-200 justify-between">
      {/* Top Header: Provider & Quick Actions */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider line-clamp-1">
            {providerName}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Availability tag: subtle segmented indicator */}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
              {displayStatus}
            </span>
            <button
              onClick={toggleSave}
              aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
              className={`p-1.5 rounded-lg border transition-colors ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Title */}
        <Link href={`/scholarships/${id}`} className="block focus-visible:outline-2 focus-visible:outline-amber-600 rounded">
          <h3 className="font-serif text-xl font-bold text-[#0B1B3D] group-hover:text-amber-900 transition-colors leading-snug line-clamp-2">
            {scholarshipName}
          </h3>
        </Link>

        {/* Unboxed Metadata Discipline */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2.5 font-medium">
          <span>{studyLevel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{field}</span>
        </div>
      </div>

      {/* Middle & Deadline Details */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Deadline</span>
          <span className="font-semibold text-slate-800">{formattedCloseDate}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block text-[11px]">Status</span>
          <span className="font-medium text-amber-900">{deadlineNote}</span>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-slate-100/80">
        <Link
          href={`/scholarships/${id}/check`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-emerald-600 rounded py-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Check Eligibility</span>
        </Link>

        <div className="flex items-center gap-2">
          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(id)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
                isCompared
                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {isCompared ? 'Compared' : '+ Compare'}
            </button>
          )}

          <Link
            href={`/scholarships/${id}`}
            className="text-xs font-semibold text-slate-600 group-hover:text-[#0B1B3D] inline-flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
