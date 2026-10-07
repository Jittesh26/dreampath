'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Calendar,
  ShieldCheck,
  ArrowRight,
  School,
  Search,
} from 'lucide-react';
import { extractScholarshipAttributes } from '@/domain/scholarship-attributes';
import { EligibilityModal } from './EligibilityModal';
import { saveScholarshipApplication } from '@/app/actions/student';

export interface ScholarshipItemData {
  id: string;
  scholarshipName: string;
  providerName: string;
  description?: string;
  status: string;
  openDate: string | null;
  closeDate: string | null;
  intakeId?: string;
  sourceUrl?: string;
  evidenceNotes?: string;
}

interface ScholarshipDiscoveryProps {
  initialItems?: ScholarshipItemData[];
  totalCount?: number;
}

export function ScholarshipDiscovery({
  initialItems = [],
  totalCount = 27,
}: ScholarshipDiscoveryProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('funding');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dreampath_saved_scholarships');
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSavedIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const [selectedModalScholarship, setSelectedModalScholarship] = useState<{
    id: string;
    scholarshipName: string;
    providerName: string;
    awardText?: string;
    studyLevel?: string;
  } | null>(null);

  const toggleSave = async (id: string, intakeId?: string) => {
    let updated: string[];
    if (savedIds.includes(id)) {
      updated = savedIds.filter((sId) => sId !== id);
    } else {
      updated = [...savedIds, id];
    }
    setSavedIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('dreampath_saved_scholarships', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    if (intakeId) {
      try {
        await saveScholarshipApplication(intakeId, savedIds.includes(id) ? 'removed' : 'saved');
      } catch {
        // ignore for guest users
      }
    }
  };

  // Filter & Sort
  const filteredScholarships = useMemo(() => {
    return initialItems.filter((item) => {
      // Active intake check
      if (activeOnly && item.status === 'closed') {
        return false;
      }

      const attrs = extractScholarshipAttributes(
        item.scholarshipName,
        item.description || '',
        item.evidenceNotes || '',
        item.closeDate,
        item.openDate,
        item.status,
        item.providerName
      );

      const combinedText = `${item.scholarshipName} ${item.providerName} ${item.description || ''}`.toLowerCase();

      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!combinedText.includes(q)) return false;
      }

      // Tab filter check
      if (activeTab === 'spm') {
        const isPreU = attrs.studyLevel.toLowerCase().includes('pre-university') || combinedText.includes('spm') || combinedText.includes('foundation');
        if (!isPreU) return false;
      } else if (activeTab === 'b40') {
        const isB40 = combinedText.includes('b40') || combinedText.includes('needy') || combinedText.includes('convertible') || combinedText.includes('income');
        if (!isB40) return false;
      } else if (activeTab === 'undergrad') {
        const isUndergrad = attrs.studyLevel.toLowerCase().includes('undergraduate');
        if (!isUndergrad) return false;
      } else if (activeTab === 'stem') {
        const isStem = combinedText.includes('engineering') || combinedText.includes('stem') || combinedText.includes('technology') || combinedText.includes('computer');
        if (!isStem) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'deadline') {
        const dateA = a.closeDate ? new Date(a.closeDate).getTime() : Infinity;
        const dateB = b.closeDate ? new Date(b.closeDate).getTime() : Infinity;
        return dateA - dateB;
      } else if (sortBy === 'provider') {
        return a.providerName.localeCompare(b.providerName);
      } else {
        // Default funding / priority order
        return 0;
      }
    });
  }, [initialItems, activeOnly, activeTab, searchQuery, sortBy]);

  // Display top 6 on the homepage
  const displayedCards = filteredScholarships.slice(0, 6);

  return (
    <section className="w-full py-16 lg:py-24 bg-[#F8FAFC]" id="scholarship-catalog">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex flex-col gap-10">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                SCHOLARSHIP DIRECTORY
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight font-sans">
              Featured Scholarships
            </h2>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              Curated opportunities with structured eligibility criteria, published minimum grade requirements, and open intake windows.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-[13px] text-slate-500">
              Showing <strong className="text-slate-800 font-semibold">{displayedCards.length} of {filteredScholarships.length}</strong> active opportunities
            </span>
            <div className="relative">
              <select
                aria-label="Sort scholarships"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3.5 pr-8 bg-white border border-slate-200 text-slate-800 text-[13px] rounded-lg shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium cursor-pointer"
              >
                <option value="funding">Highest Funding Cap</option>
                <option value="deadline">Nearest Deadline</option>
                <option value="provider">Provider Name (A-Z)</option>
              </select>
              <span className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none text-xs">▼</span>
            </div>
          </div>
        </div>

        {/* Filter Pill Tabs & Search Input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All Programs ({initialItems.length || totalCount})
            </button>
            <button
              onClick={() => setActiveTab('spm')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'spm'
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              SPM / Foundation
            </button>
            <button
              onClick={() => setActiveTab('b40')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'b40'
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              B40 Priority
            </button>
            <button
              onClick={() => setActiveTab('undergrad')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'undergrad'
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Undergraduate Degree
            </button>
            <button
              onClick={() => setActiveTab('stem')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'stem'
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              STEM & Medicine
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input Filter */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Active Intakes Only Toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 cursor-pointer hover:bg-slate-100 transition-all shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0"
              />
              <span className="text-[12px] text-slate-700 font-semibold">
                Active Intakes
              </span>
            </label>
          </div>
        </div>

        {/* 3x2 Responsive Grid of Verified Malaysian Scholarships */}
        {displayedCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCards.map((item) => {
              const attrs = extractScholarshipAttributes(
                item.scholarshipName,
                item.description || '',
                item.evidenceNotes || '',
                item.closeDate,
                item.openDate,
                item.status,
                item.providerName
              );

              const isSaved = savedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-lg hover:border-blue-300 transition-all group min-w-0 overflow-hidden"
                >
                  <div className="flex flex-col gap-4 min-w-0">
                    {/* Top Meta Row */}
                    <div className="flex items-start justify-between gap-2.5 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-lg ${attrs.providerMonogram.bgClass} text-white font-bold text-[13px] flex items-center justify-center shadow-xs shrink-0`}
                        >
                          {attrs.providerMonogram.text}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide truncate block" title={item.providerName}>
                            {item.providerName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate block">
                            {attrs.providerMonogram.tierTag}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Urgency Pill */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 whitespace-nowrap border ${attrs.deadlineUrgency.badgeClass}`}
                      >
                        {attrs.deadlineUrgency.label}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="space-y-1 pt-1">
                      <Link
                        href={`/scholarships/${item.id}`}
                        className="text-[17px] font-bold text-[#0F172A] group-hover:text-blue-700 transition-colors leading-snug line-clamp-2"
                      >
                        {item.scholarshipName}
                      </Link>
                    </div>

                    {/* Study Level & Field Summary */}
                    <div className="flex items-center gap-2 text-slate-500 text-[13px]">
                      <School className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {attrs.studyLevel} • {attrs.eligibleFields}
                      </span>
                    </div>

                    {/* High-Contrast Monetary Focal Point */}
                    <div className="pt-2 pb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Funding Coverage
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          {attrs.awardType}
                        </span>
                      </div>
                      {attrs.awardText === 'See Official Announcement' ? (
                        <span className="text-[16px] font-semibold text-slate-700 tracking-tight block py-0.5">
                          See Official Announcement
                        </span>
                      ) : (
                        <span className="text-[20px] sm:text-[22px] font-extrabold text-[#0B1727] tracking-tight block truncate">
                          {attrs.awardText}
                        </span>
                      )}
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
                        <ShieldCheck className="w-3.5 h-3.5" /> {attrs.verifiedDateText}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedModalScholarship({
                            id: item.id,
                            scholarshipName: item.scholarshipName,
                            providerName: item.providerName,
                            awardText: attrs.awardText,
                            studyLevel: attrs.studyLevel,
                          })
                        }
                        className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[13px] font-semibold text-center transition-colors shadow-xs cursor-pointer min-h-[42px] flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Check Eligibility to Apply</span>
                      </button>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <Link
                          href={`/scholarships/${item.id}`}
                          className="py-1.5 text-blue-700 hover:text-blue-800 text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 group/link"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleSave(item.id, item.intakeId)}
                          aria-label={isSaved ? 'Remove from saved' : 'Save scholarship'}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                            isSaved
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-300'
                          }`}
                          title={isSaved ? 'Saved to Tracker' : 'Save to Tracker'}
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-600 font-medium">
              No scholarships matched your current filter criteria.
            </p>
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setActiveOnly(false);
              }}
              className="mt-3 text-sm font-bold text-blue-700 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Bottom Action Row */}
        <div className="flex flex-col items-center justify-center gap-2 pt-4">
          <Link
            href="/scholarships"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white text-[14px] font-semibold shadow-md transition-all min-h-[44px]"
          >
            <span>Browse All {totalCount} Verified Scholarships</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-[13px] text-slate-500">
            Every program features verified intake documentation & published provider charters.
          </span>
        </div>

      </div>

      {/* Quick Policy Mapping Modal */}
      <EligibilityModal
        isOpen={Boolean(selectedModalScholarship)}
        onClose={() => setSelectedModalScholarship(null)}
        scholarship={selectedModalScholarship}
      />
    </section>
  );
}
