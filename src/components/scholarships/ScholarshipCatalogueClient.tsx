'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  X,
  LayoutList,
  LayoutGrid,
  Filter,
  RotateCcw,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import { OpportunityRow } from '@/components/design-system/OpportunityRow';
import { EmptyState } from '@/components/design-system/EmptyState';

export interface CatalogueScholarship {
  id: string;
  scholarshipName: string;
  providerName: string;
  description: string;
  status: string;
  openDate: string | null;
  closeDate: string | null;
  studyLevel?: string;
  field?: string;
}

export function ScholarshipCatalogueClient({
  allScholarships,
  initialQuery = '',
  initialLevel = 'All',
  initialField = 'All',
}: {
  allScholarships: CatalogueScholarship[];
  initialQuery?: string;
  initialLevel?: string;
  initialField?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialQuery);
  const [levelFilter, setLevelFilter] = useState(initialLevel);
  const [fieldFilter, setFieldFilter] = useState(initialField);
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'closingSoon' | 'newest' | 'name'>('closingSoon');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'row' | 'card'>('row');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Providers list for filtering
  const [providerFilter, setProviderFilter] = useState('All');
  const providersList = useMemo(() => {
    const set = new Set(allScholarships.map((s) => s.providerName));
    return ['All', ...Array.from(set).sort()];
  }, [allScholarships]);

  const toggleCompare = (id: string) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 4) {
        alert('You can compare up to 4 scholarships at a time.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const filteredScholarships = useMemo(() => {
    const now = new Date();
    const qLower = search.toLowerCase().trim();

    return allScholarships
      .filter((item) => {
        // Keyword / Alias search
        if (qLower) {
          const matchName = item.scholarshipName.toLowerCase().includes(qLower);
          const matchProvider = item.providerName.toLowerCase().includes(qLower);
          const matchDesc = item.description?.toLowerCase().includes(qLower);

          // Alias matching
          let matchAlias = false;
          if (qLower === 'jpa' && (item.providerName.includes('JPA') || item.providerName.includes('Perkhidmatan Awam'))) matchAlias = true;
          if (qLower === 'ybr' && (item.providerName.includes('Bank Rakyat') || item.scholarshipName.includes('PPBU'))) matchAlias = true;
          if (qLower === 'bnm' && (item.providerName.includes('Bank Negara') || item.scholarshipName.includes('Kijang'))) matchAlias = true;
          if (qLower === 'tm' && (item.providerName.includes('TM') || item.scholarshipName.includes('YTM'))) matchAlias = true;

          if (!matchName && !matchProvider && !matchDesc && !matchAlias) return false;
        }

        // Provider filter
        if (providerFilter !== 'All' && item.providerName !== providerFilter) {
          return false;
        }

        // Level filter
        if (levelFilter !== 'All') {
          const desc = (item.description || '').toLowerCase();
          const name = item.scholarshipName.toLowerCase();
          if (levelFilter === 'SPM' && !desc.includes('spm') && !name.includes('spm')) return false;
          if (levelFilter === 'Pre-U / Foundation' && !desc.includes('foundation') && !desc.includes('pre-u') && !desc.includes('matrikulasi') && !desc.includes('asasi')) return false;
          if (levelFilter === 'Diploma' && !desc.includes('diploma') && !name.includes('diploma')) return false;
          if (levelFilter === 'Undergraduate Degree' && !desc.includes('degree') && !desc.includes('undergraduate') && !desc.includes('ijazah')) return false;
          if (levelFilter === 'Postgraduate' && !desc.includes('postgraduate') && !desc.includes('masters') && !desc.includes('phd') && !desc.includes('agong')) return false;
        }

        // Field filter
        if (fieldFilter !== 'All') {
          const desc = (item.description || '').toLowerCase();
          if (fieldFilter === 'Engineering' && !desc.includes('engineering') && !desc.includes('kejuruteraan')) return false;
          if (fieldFilter === 'Computer Science / Tech' && !desc.includes('computer') && !desc.includes('software') && !desc.includes('it') && !desc.includes('digital') && !desc.includes('ai')) return false;
          if (fieldFilter === 'Business / Finance' && !desc.includes('business') && !desc.includes('finance') && !desc.includes('accounting') && !desc.includes('economics')) return false;
          if (fieldFilter === 'Medicine' && !desc.includes('medicine') && !desc.includes('medical') && !desc.includes('health')) return false;
        }

        // Availability filter
        if (availabilityFilter !== 'All') {
          const closeDate = item.closeDate ? new Date(item.closeDate) : null;
          const isClosed = item.status === 'closed' || (closeDate && closeDate < now);
          if (availabilityFilter === 'Open' && isClosed) return false;
          if (availabilityFilter === 'Closed' && !isClosed) return false;
          if (availabilityFilter === 'Closing Soon') {
            if (isClosed || !closeDate) return false;
            const diffDays = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 14) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.scholarshipName.localeCompare(b.scholarshipName);
        }
        if (sortBy === 'closingSoon') {
          const dateA = a.closeDate ? new Date(a.closeDate).getTime() : Infinity;
          const dateB = b.closeDate ? new Date(b.closeDate).getTime() : Infinity;
          return dateA - dateB;
        }
        return a.scholarshipName.localeCompare(b.scholarshipName);
      });
  }, [allScholarships, search, providerFilter, levelFilter, fieldFilter, availabilityFilter, sortBy]);

  const clearAllFilters = () => {
    setSearch('');
    setLevelFilter('All');
    setFieldFilter('All');
    setProviderFilter('All');
    setAvailabilityFilter('All');
  };

  const hasActiveFilters =
    search ||
    levelFilter !== 'All' ||
    fieldFilter !== 'All' ||
    providerFilter !== 'All' ||
    availabilityFilter !== 'All';

  return (
    <div className="space-y-6">
      {/* Search & Top Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scholarship, provider, or keyword (e.g. JPA, Bank Rakyat, Computer Science)..."
            className="w-full pl-10 pr-9 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 justify-between md:justify-end">
          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters {hasActiveFilters ? '(Active)' : ''}</span>
          </button>

          {/* Sort By */}
          <div className="w-44">
            <select
              aria-label="Sort options"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full py-2.5 px-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 font-semibold cursor-pointer"
            >
              <option value="closingSoon">Sort: Closing Soon</option>
              <option value="name">Sort: Alphabetical</option>
            </select>
          </div>

          {/* View Switcher: Row vs. Card */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('row')}
              aria-label="Editorial Row View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'row'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              aria-label="Opportunity Card View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Filter Rail (Left) + Opportunity Feed (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Filter Rail (Desktop + Mobile Collapsible) */}
        <aside
          className={`md:col-span-4 lg:col-span-3 space-y-6 ${
            isMobileFiltersOpen ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-[#0F172A] font-sans">
                  Directory Filters
                </h3>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Availability / Status */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Intake Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Open', 'Closing Soon', 'Closed'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setAvailabilityFilter(status)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      availabilityFilter === status
                        ? 'bg-[#0F172A] text-white shadow-2xs font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Study Level */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Study Qualification Level
              </label>
              <div className="space-y-1 text-xs">
                {['All', 'SPM', 'Pre-U / Foundation', 'Undergraduate Degree', 'Postgraduate'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLevelFilter(level)}
                    className={`w-full text-left px-3 py-2 rounded-xl font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      levelFilter === level
                        ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200/90'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{level}</span>
                    {levelFilter === level && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sponsor Provider Dropdown */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Sponsor / Provider
              </label>
              <select
                aria-label="Filter by provider"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 font-medium cursor-pointer"
              >
                <option value="All">All Providers (24)</option>
                {providersList
                  .filter((p) => p !== 'All')
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </select>
            </div>

            {/* Field of Study */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Academic Discipline
              </label>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {['All', 'Engineering', 'Computer Science / Tech', 'Business / Finance', 'Medicine'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFieldFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                      fieldFilter === f
                        ? 'bg-[#0F172A] text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Opportunities List (Feed) */}
        <section className="md:col-span-8 lg:col-span-9 space-y-4 min-w-0">
          {/* Active Filter Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 font-bold">{filteredScholarships.length}</strong> verified programs
              </span>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5 pl-2">
                  {search && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                      Keyword: &ldquo;{search}&rdquo;
                      <button onClick={() => setSearch('')} aria-label="Remove search filter" className="cursor-pointer">
                        <X className="w-3 h-3 hover:text-blue-950" />
                      </button>
                    </span>
                  )}
                  {levelFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                      Level: {levelFilter}
                      <button onClick={() => setLevelFilter('All')} aria-label="Remove level filter" className="cursor-pointer">
                        <X className="w-3 h-3 hover:text-blue-950" />
                      </button>
                    </span>
                  )}
                  {fieldFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                      Field: {fieldFilter}
                      <button onClick={() => setFieldFilter('All')} aria-label="Remove field filter" className="cursor-pointer">
                        <X className="w-3 h-3 hover:text-blue-950" />
                      </button>
                    </span>
                  )}
                  {providerFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                      Provider: {providerFilter}
                      <button onClick={() => setProviderFilter('All')} aria-label="Remove provider filter" className="cursor-pointer">
                        <X className="w-3 h-3 hover:text-blue-950" />
                      </button>
                    </span>
                  )}
                  {availabilityFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                      Status: {availabilityFilter}
                      <button onClick={() => setAvailabilityFilter('All')} aria-label="Remove status filter" className="cursor-pointer">
                        <X className="w-3 h-3 hover:text-blue-950" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              Verified National Registry
            </span>
          </div>

          {/* List of Opportunities */}
          {filteredScholarships.length === 0 ? (
            <EmptyState
              icon={<Search className="w-6 h-6 text-blue-700" />}
              title="No scholarships match your filters"
              description="Try resetting your active filters or broadening your qualification criteria. Every scholarship in this catalogue is grounded in authoritative intake guidelines."
              action={
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                >
                  Reset All Filters
                </button>
              }
            />
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredScholarships.map((item) => (
                <OpportunityRow
                  key={item.id}
                  id={item.id}
                  scholarshipName={item.scholarshipName}
                  providerName={item.providerName}
                  description={item.description}
                  status={item.status}
                  openDate={item.openDate}
                  closeDate={item.closeDate}
                  isCompared={comparedIds.includes(item.id)}
                  onToggleCompare={toggleCompare}
                  viewMode="card"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredScholarships.map((item) => (
                <OpportunityRow
                  key={item.id}
                  id={item.id}
                  scholarshipName={item.scholarshipName}
                  providerName={item.providerName}
                  description={item.description}
                  status={item.status}
                  openDate={item.openDate}
                  closeDate={item.closeDate}
                  isCompared={comparedIds.includes(item.id)}
                  onToggleCompare={toggleCompare}
                  viewMode="row"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating Comparison Dock / Action Bar */}
      {comparedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 border border-slate-700/80">
          <span className="text-xs font-semibold">
            {comparedIds.length} scholarship{comparedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="h-4 w-px bg-slate-600" />
          <button
            type="button"
            onClick={() => router.push(`/scholarships/compare?ids=${comparedIds.join(',')}`)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare Side-by-Side</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setComparedIds([])}
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
            aria-label="Clear selected compare items"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
