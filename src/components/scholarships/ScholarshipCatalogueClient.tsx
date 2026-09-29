'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import { Search, ArrowRight, X } from 'lucide-react';

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
          
          // Alias matching (e.g. JPA, YBR, BNM, PETRONAS, TM)
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

  const hasActiveFilters = search || levelFilter !== 'All' || fieldFilter !== 'All' || providerFilter !== 'All' || availabilityFilter !== 'All';

  return (
    <div className="space-y-8">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by scholarship, provider, or keyword (e.g. JPA, Gamuda, Computer Science)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Provider Select */}
          <div className="w-full md:w-56">
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-700 font-medium"
            >
              <option value="All">All Providers (24)</option>
              {providersList.filter(p => p !== 'All').map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full py-2.5 px-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-700 font-medium"
            >
              <option value="closingSoon">Sort: Closing Soon</option>
              <option value="name">Sort: Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Segmented Controls for Study Level & Availability */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Study Level Segmented Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-semibold mr-1">Level:</span>
            {['All', 'SPM', 'Pre-U / Foundation', 'Undergraduate Degree', 'Postgraduate'].map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  levelFilter === level
                    ? 'bg-[#0B1B3D] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Availability Segmented Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold mr-1">Status:</span>
            {['All', 'Open', 'Closing Soon', 'Closed'].map((status) => (
              <button
                key={status}
                onClick={() => setAvailabilityFilter(status)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  availabilityFilter === status
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Field of Study Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Field:</span>
          {['All', 'Engineering', 'Computer Science / Tech', 'Business / Finance', 'Medicine'].map((f) => (
            <button
              key={f}
              onClick={() => setFieldFilter(f)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                fieldFilter === f
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="ml-auto text-xs text-amber-800 hover:underline font-semibold"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count & Zero-Pill Metadata */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
        <div>
          Showing <strong className="text-slate-900 font-bold">{filteredScholarships.length}</strong> verified opportunities
          {hasActiveFilters && ' matching your criteria'}
        </div>
        <div>
          Official 2026/2027 Malaysian Intakes
        </div>
      </div>

      {/* Scholarships Grid */}
      {filteredScholarships.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <h3 className="font-serif text-2xl font-bold text-[#0B1B3D]">No matching scholarships found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Try broadening your search filters or clearing the search keyword. Every opportunity listed is verified directly against official provider sources.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScholarships.map((item) => (
            <ScholarshipCard
              key={item.id}
              id={item.id}
              providerName={item.providerName}
              scholarshipName={item.scholarshipName}
              status={item.status}
              openDate={item.openDate}
              closeDate={item.closeDate}
              onToggleCompare={toggleCompare}
              isCompared={comparedIds.includes(item.id)}
            />
          ))}
        </div>
      )}

      {/* Floating Comparison Dock / Action Bar */}
      {comparedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B1B3D] text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 border border-slate-700">
          <span className="text-xs font-semibold">
            {comparedIds.length} scholarship{comparedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="h-4 w-px bg-slate-600" />
          <button
            onClick={() => router.push(`/scholarships/compare?ids=${comparedIds.join(',')}`)}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Compare Side-by-Side</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setComparedIds([])}
            className="text-slate-400 hover:text-white text-xs"
            aria-label="Clear selected compare items"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
