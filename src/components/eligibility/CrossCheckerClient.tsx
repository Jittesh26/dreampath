'use client';

import { useState, useTransition, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { StudentProfile, SPMGrade, Citizenship, IncomeBand } from '@/domain/registry';
import { evaluateProfileServer, SanitizedEvaluationReport, SanitizedEvaluatedScholarship } from '@/app/actions/eligibility';
import { saveScholarshipApplication } from '@/app/actions/student';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  SlidersHorizontal,
  Bookmark,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Lock,
  X,
} from 'lucide-react';

interface CrossCheckerClientProps {
  initialReport: SanitizedEvaluationReport;
  initialProfile?: Partial<StudentProfile> | null;
  isAuthenticated: boolean;
  savedIntakeIds?: string[];
}

const SPM_GRADES: SPMGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

const CORE_SPM_SUBJECTS = [
  'Mathematics',
  'English',
  'Bahasa Melayu',
  'Additional Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Prinsip Perakaunan',
];

export function CrossCheckerClient({
  initialReport,
  initialProfile,
  isAuthenticated,
  savedIntakeIds = [],
}: CrossCheckerClientProps) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<SanitizedEvaluationReport>(initialReport);

  // Form State initialized with either saved student profile or realistic defaults
  const [citizenship, setCitizenship] = useState<Citizenship>(
    initialProfile?.citizenship || 'Malaysian'
  );
  const [bumiputeraStatus, setBumiputeraStatus] = useState<boolean>(
    initialProfile?.bumiputera_status ?? true
  );
  const [incomeBand, setIncomeBand] = useState<IncomeBand>(
    initialProfile?.income_band || 'B40'
  );
  const [householdIncome, setHouseholdIncome] = useState<string>(
    initialProfile?.household_income ? String(initialProfile.household_income) : '3800'
  );
  const [cgpa, setCgpa] = useState<string>(
    initialProfile?.cgpa ? String(initialProfile.cgpa) : '3.80'
  );
  const [dateOfBirth, setDateOfBirth] = useState<string>(
    initialProfile?.date_of_birth || '2005-06-15'
  );

  // SPM Subject Grades
  const [spmGrades, setSpmGrades] = useState<Record<string, SPMGrade>>(() => {
    if (initialProfile?.spm_results && Object.keys(initialProfile.spm_results).length > 0) {
      return initialProfile.spm_results;
    }
    return {
      'Mathematics': 'A',
      'English': 'A-',
      'Bahasa Melayu': 'A',
      'Additional Mathematics': 'B+',
    };
  });

  // UI state
  const [showAdvancedSpm, setShowAdvancedSpm] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MET' | 'MISSING_INFO' | 'NOT_MET'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(savedIntakeIds));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Auth Modal State for Logged-Out Users
  const [authModalScholarship, setAuthModalScholarship] = useState<string | null>(null);

  // Trigger Server Evaluation
  const runServerEvaluation = useCallback((profile: StudentProfile) => {
    startTransition(async () => {
      try {
        const updatedReport = await evaluateProfileServer(profile);
        setReport(updatedReport);
      } catch (err) {
        console.error('Failed to run server-side evaluation:', err);
      }
    });
  }, []);

  // Track whether initial mount has finished to avoid double-evaluating initial props
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const currentProfile: StudentProfile = {
      citizenship,
      bumiputera_status: bumiputeraStatus,
      income_band: incomeBand,
      household_income: householdIncome ? Number(householdIncome) : undefined,
      cgpa: cgpa ? Number(cgpa) : undefined,
      date_of_birth: dateOfBirth || undefined,
      spm_results: Object.keys(spmGrades).length > 0 ? spmGrades : undefined,
    };

    const timer = setTimeout(() => {
      runServerEvaluation(currentProfile);
    }, 200);

    return () => clearTimeout(timer);
  }, [citizenship, bumiputeraStatus, incomeBand, householdIncome, cgpa, dateOfBirth, spmGrades, runServerEvaluation]);

  // Filter results by active tab, search, and study level
  const filteredResults = useMemo(() => {
    return report.results.filter((item: SanitizedEvaluatedScholarship) => {
      // Tab filter
      if (activeTab !== 'ALL' && item.evaluation.status !== activeTab) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'All' && !item.attributes.studyLevel.toLowerCase().includes(selectedLevel.toLowerCase())) {
        return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.scholarship.name.toLowerCase().includes(query);
        const matchesProvider = item.scholarship.providerName.toLowerCase().includes(query);
        const matchesField = item.attributes.eligibleFields.toLowerCase().includes(query);
        return matchesName || matchesProvider || matchesField;
      }

      return true;
    });
  }, [report.results, activeTab, selectedLevel, searchQuery]);

  // SPM Grade handler
  const handleGradeChange = (subject: string, grade: string) => {
    setSpmGrades((prev) => {
      if (!grade) {
        const updated = { ...prev };
        delete updated[subject];
        return updated;
      }
      return {
        ...prev,
        [subject]: grade as SPMGrade,
      };
    });
  };

  // Demo Preset Handlers (Strictly in-memory, never persists to user profile without explicit action)
  const handleApplyPreset = (preset: 'B40_STPM' | 'M40_STEM' | 'SPM_LEAVER' | 'RESET') => {
    let newProfile: StudentProfile;

    if (preset === 'B40_STPM') {
      setCitizenship('Malaysian');
      setBumiputeraStatus(true);
      setIncomeBand('B40');
      setHouseholdIncome('3200');
      setCgpa('3.90');
      setDateOfBirth('2004-08-10');
      const grades: Record<string, SPMGrade> = {
        'Mathematics': 'A+',
        'English': 'A',
        'Bahasa Melayu': 'A',
        'Additional Mathematics': 'A',
        'Physics': 'A',
        'Chemistry': 'A-',
      };
      setSpmGrades(grades);
      newProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: true,
        income_band: 'B40',
        household_income: 3200,
        cgpa: 3.90,
        date_of_birth: '2004-08-10',
        spm_results: grades,
      };
    } else if (preset === 'M40_STEM') {
      setCitizenship('Malaysian');
      setBumiputeraStatus(false);
      setIncomeBand('M40');
      setHouseholdIncome('7500');
      setCgpa('3.70');
      setDateOfBirth('2005-03-22');
      const grades: Record<string, SPMGrade> = {
        'Mathematics': 'A',
        'English': 'A',
        'Bahasa Melayu': 'A',
        'Additional Mathematics': 'B+',
        'Physics': 'A-',
      };
      setSpmGrades(grades);
      newProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: false,
        income_band: 'M40',
        household_income: 7500,
        cgpa: 3.70,
        date_of_birth: '2005-03-22',
        spm_results: grades,
      };
    } else if (preset === 'SPM_LEAVER') {
      setCitizenship('Malaysian');
      setBumiputeraStatus(true);
      setIncomeBand('B40');
      setHouseholdIncome('2500');
      setCgpa('4.00');
      setDateOfBirth('2007-02-15');
      const grades: Record<string, SPMGrade> = {
        'Mathematics': 'A+',
        'English': 'A+',
        'Bahasa Melayu': 'A+',
        'Additional Mathematics': 'A+',
        'Physics': 'A+',
        'Chemistry': 'A+',
        'Biology': 'A+',
      };
      setSpmGrades(grades);
      newProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: true,
        income_band: 'B40',
        household_income: 2500,
        cgpa: 4.00,
        date_of_birth: '2007-02-15',
        spm_results: grades,
      };
    } else {
      setCitizenship('Malaysian');
      setBumiputeraStatus(false);
      setIncomeBand('M40');
      setHouseholdIncome('');
      setCgpa('');
      setSpmGrades({});
      newProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: false,
        income_band: 'M40',
        spm_results: {},
      };
    }

    runServerEvaluation(newProfile);
  };

  // Save Scholarship Action with Clear Auth Prompts & Feedback
  const handleSaveScholarship = async (scholarshipName: string, intakeId: string) => {
    // If not authenticated, open explicit auth prompt modal
    if (!isAuthenticated) {
      setAuthModalScholarship(scholarshipName);
      return;
    }

    // Prevent duplicate saves
    if (savedIds.has(intakeId)) {
      return;
    }

    setSavingId(intakeId);
    try {
      await saveScholarshipApplication(intakeId, 'saved');
      setSavedIds((prev) => new Set([...prev, intakeId]));
      setSaveSuccessMessage(`"${scholarshipName}" saved to your Tracker.`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to save scholarship:', err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Success Notification Banner */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <Link
            href="/student/applications"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline ml-4"
          >
            View in Tracker →
          </Link>
        </div>
      )}

      {/* Top Banner: Deterministic Verification Assurance */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider font-sans">
                  Server-Evaluated Matching Engine
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-slate-500">
                  {isPending ? 'Evaluating Server-Side...' : 'Deterministic Server Evaluation Active'}
                </span>
                {isPending && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-sans">
                Evaluate Your Profile Across All Published Scholarships
              </h2>
            </div>
          </div>

          {/* Demo Preset Profiles - Clearly Labeled */}
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <div className="text-[11px] font-semibold text-slate-500">
              Demo Profiles <span className="font-normal text-slate-400">(Testing only · Does not overwrite profile)</span>:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('B40_STPM')}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                STPM 3.90 (B40)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('M40_STEM')}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                CGPA 3.70 (M40)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('SPM_LEAVER')}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Straight A SPM
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('RESET')}
                className="text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Reset profile facts"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Status explanation */}
        <p className="text-sm text-slate-600 leading-relaxed font-normal">
          Adjust your academic facts and background parameters below. The server deterministically evaluates your criteria against each published scholarship&rsquo;s verified rule AST without approximations, match percentages, or speculative scoring.
        </p>
      </div>

      {/* Main Grid: Left Profile Parameters Form | Right Live Match Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Parameters Form */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6 sticky top-24">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                Student Profile Facts
              </h3>
            </div>
            {isAuthenticated && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Synced to Account
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Citizenship */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Citizenship Status
              </label>
              <select
                value={citizenship}
                onChange={(e) => setCitizenship(e.target.value as Citizenship)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="Malaysian">Malaysian Citizen (Warganegara)</option>
                <option value="Permanent Resident">Permanent Resident (MyPR)</option>
                <option value="Non-Malaysian">Non-Malaysian</option>
              </select>
            </div>

            {/* Bumiputera Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Bumiputera Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBumiputeraStatus(true)}
                  className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-all text-center cursor-pointer ${
                    bumiputeraStatus
                      ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Bumiputera
                </button>
                <button
                  type="button"
                  onClick={() => setBumiputeraStatus(false)}
                  className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-all text-center cursor-pointer ${
                    !bumiputeraStatus
                      ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Non-Bumiputera
                </button>
              </div>
            </div>

            {/* Household Income Band */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Household Income Band
                </label>
                <span className="text-[11px] text-slate-400">DOSM Metric</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['B40', 'M40', 'T20'] as IncomeBand[]).map((band) => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setIncomeBand(band)}
                    className={`text-xs font-bold py-2 rounded-xl border transition-all text-center cursor-pointer ${
                      incomeBand === band
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {band}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {incomeBand === 'B40' && 'Gross household income below RM 5,250 / month.'}
                {incomeBand === 'M40' && 'Gross household income RM 5,250 – RM 11,819 / month.'}
                {incomeBand === 'T20' && 'Gross household income above RM 11,819 / month.'}
              </p>
            </div>

            {/* Academic CGPA */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Tertiary / STPM CGPA
                </label>
                <span className="text-[11px] font-semibold text-blue-700">Scale 0.00 – 4.00</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="4.00"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="3.80"
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Date of Birth / Age */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date of Birth (For Age Requirements)
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              />
            </div>

            {/* SPM Subject Results */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800">
                  SPM Subject Grades
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSpm(!showAdvancedSpm)}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAdvancedSpm ? 'Less Subjects' : 'More Subjects'}</span>
                  {showAdvancedSpm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Core SPM Subjects */}
              <div className="space-y-2">
                {CORE_SPM_SUBJECTS.slice(0, showAdvancedSpm ? CORE_SPM_SUBJECTS.length : 4).map((subject) => (
                  <div key={subject} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[170px]" title={subject}>
                      {subject}
                    </span>
                    <select
                      value={spmGrades[subject] || ''}
                      onChange={(e) => handleGradeChange(subject, e.target.value)}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shrink-0 w-20 cursor-pointer"
                    >
                      <option value="">-</option>
                      {SPM_GRADES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Summary Chip */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between font-medium">
                <span>Evaluation Backend:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  Server-Authoritative AST
                  {isPending && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Active Profile Facts:</span>
                <span className="font-bold text-blue-700">
                  {citizenship}, {bumiputeraStatus ? 'Bumi' : 'Non-Bumi'}, {incomeBand}, CGPA {cgpa || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Server-Evaluated Results */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-75">All Programs</div>
              <div className="text-2xl font-bold mt-1">{report.totalEvaluated}</div>
              <div className="text-[11px] opacity-75 mt-0.5">Modeled in catalog</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MET')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'MET'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50/50'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Qualified
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-700">
                {report.qualifiedCount}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">All criteria met</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MISSING_INFO')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'MISSING_INFO'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50/50'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Needs Info
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-700">
                {report.potentialCount}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Additional inputs needed</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NOT_MET')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'NOT_MET'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Ineligible
              </div>
              <div className="text-2xl font-bold mt-1 text-slate-700">
                {report.ineligibleCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Failed hard criterion</div>
            </button>
          </div>

          {/* Search and Study Level Sub-filters */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scholarship or provider..."
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Level:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="All">All Study Levels</option>
                <option value="Undergraduate">Undergraduate Degree</option>
                <option value="Pre-University">Pre-University / Foundation</option>
                <option value="Diploma">Diploma / TVET</option>
                <option value="Postgraduate">Postgraduate (Masters/PhD)</option>
              </select>
            </div>
          </div>

          {/* Scholarship List */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">No matching scholarships found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your filters, study level, or academic criteria facts on the left.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ALL');
                    setSelectedLevel('All');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Clear all search filters
                </button>
              </div>
            ) : (
              filteredResults.map((item: SanitizedEvaluatedScholarship) => {
                const isSaved = savedIds.has(item.scholarship.intakeId);
                const status = item.evaluation.status;
                const isClosed = item.scholarship.intakeStatus === 'closed' || item.attributes.deadlineUrgency.label === 'Closed';

                return (
                  <div
                    key={item.scholarship.id}
                    className={`bg-white border rounded-2xl p-5 sm:p-6 transition-all shadow-2xs hover:shadow-xs space-y-4 ${
                      status === 'MET'
                        ? 'border-emerald-200/90 ring-1 ring-emerald-500/10'
                        : status === 'MISSING_INFO'
                        ? 'border-amber-200/90 ring-1 ring-amber-500/10'
                        : 'border-slate-200/90 opacity-90'
                    }`}
                  >
                    {/* Header: Provider & Evaluation Status Badge */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${item.attributes.providerMonogram.bgClass} ${item.attributes.providerMonogram.textColorClass || 'text-white'}`}
                        >
                          {item.attributes.providerMonogram.text}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">
                            {item.scholarship.providerName}
                          </span>
                          <Link
                            href={`/scholarships/${item.scholarship.id}`}
                            className="text-base sm:text-lg font-bold text-[#0F172A] hover:text-blue-700 transition-colors tracking-tight font-sans block"
                          >
                            {item.scholarship.name}
                          </Link>
                        </div>
                      </div>

                      {/* Deterministic Status Badge & Separate Availability Notice */}
                      <div className="flex flex-col sm:items-end gap-1 shrink-0">
                        {status === 'MET' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>QUALIFIED · ALL RULES MET</span>
                          </div>
                        )}
                        {status === 'MISSING_INFO' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>NEEDS MORE INFORMATION</span>
                          </div>
                        )}
                        {status === 'NOT_MET' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>NOT ELIGIBLE</span>
                          </div>
                        )}

                        {/* Distinct Availability Badge */}
                        {isClosed ? (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
                            Intake Closed (For Reference)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                            Active 2026/27 Intake
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Badges: Level, Award, Deadline */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        {item.attributes.studyLevel}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                        {item.attributes.awardText}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg font-semibold border ${item.attributes.deadlineUrgency.badgeClass}`}>
                        {item.attributes.deadlineUrgency.label}
                      </span>
                      <span className="text-slate-400 text-xs ml-auto hidden sm:inline">
                        Cycle {item.scholarship.intakeYear || '2026/27'}
                      </span>
                    </div>

                    {/* Rule-by-rule Reasoning Drawer / Breakdown */}
                    <div
                      className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                        status === 'MET'
                          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
                          : status === 'MISSING_INFO'
                          ? 'bg-amber-50/50 border-amber-100 text-amber-950'
                          : 'bg-rose-50/40 border-rose-100 text-rose-950'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Evaluation Breakdown:</span>
                      </div>

                      {status === 'MET' && (
                        <p className="text-emerald-800 leading-relaxed">
                          All evaluated boolean conditions satisfied for your profile facts: Citizenship ({citizenship}), Bumiputera requirement, Income Band ({incomeBand}), and academic threshold (CGPA {cgpa}).
                        </p>
                      )}

                      {status === 'NOT_MET' && (
                        <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                          {item.evaluation.reasons.map((r: { field?: string; code: string; message: string }, idx: number) => (
                            <li key={idx} className="text-rose-900 font-normal">
                              {r.message}
                            </li>
                          ))}
                        </ul>
                      )}

                      {status === 'MISSING_INFO' && (
                        <div className="space-y-1">
                          <p className="text-amber-900 font-normal leading-relaxed">
                            Candidate meets primary qualification criteria, but requires the following specific input or manual review:
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-medium pl-1">
                            {item.evaluation.reasons.map((r: { field?: string; code: string; message: string }, idx: number) => (
                              <li key={idx}>{r.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/scholarships/${item.scholarship.id}/check`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors"
                        >
                          <span>Detailed Single Checker</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/scholarships/${item.scholarship.id}`}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-2"
                        >
                          View Dossier
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveScholarship(item.scholarship.name, item.scholarship.intakeId)}
                          disabled={savingId === item.scholarship.intakeId}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                            isSaved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-emerald-700 text-emerald-700' : ''}`} />
                          <span>{isSaved ? 'Saved in Tracker' : 'Save to Tracker'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Authentication Prompt Modal for Unauthenticated Users */}
      {authModalScholarship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setAuthModalScholarship(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-950 tracking-tight font-sans">
                Sign in to save this scholarship
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save <strong className="text-slate-900">{authModalScholarship}</strong> to your application tracker to monitor deadlines, track requirement tasks, and manage your progress.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                href="/login?redirect=/eligibility"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                <span>Log in to Save</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/register?redirect=/eligibility"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
              >
                <span>Create Free Student Account</span>
              </Link>
              <button
                type="button"
                onClick={() => setAuthModalScholarship(null)}
                className="w-full py-2 text-center text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Continue browsing anonymously
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
