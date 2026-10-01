'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import {
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { VerifiedComparisonItem } from '@/app/api/scholarships/compare-data/route';
import { ScholarshipComparisonOutput } from '@/lib/ai/gemini-service';

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scholarships, setScholarships] = useState<VerifiedComparisonItem[]>([]);
  const [availableList, setAvailableList] = useState<Array<{ id: string; name: string; provider: string }>>([]);
  const [aiInsight, setAiInsight] = useState<ScholarshipComparisonOutput | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const idsParam = searchParams.get('ids') || '';

  const generateDeterministicBaseline = useCallback((items: VerifiedComparisonItem[]) => {
    if (!items || items.length === 0) return;

    const keyDiffs: string[] = [];
    if (items.length >= 2) {
      const s1 = items[0];
      const s2 = items[1];

      if (s1.minCgpa !== s2.minCgpa) {
        keyDiffs.push(`${s1.name} specifies ${s1.minCgpa}, whereas ${s2.name} specifies ${s2.minCgpa}.`);
      }
      if (s1.bond !== s2.bond) {
        keyDiffs.push(`${s1.name} has "${s1.bond}", while ${s2.name} has "${s2.bond}".`);
      }
      if (s1.closeDate !== s2.closeDate) {
        keyDiffs.push(`${s1.name} closes on ${s1.closeDate}, compared to ${s2.closeDate} for ${s2.name}.`);
      }
      if (s1.award !== s2.award) {
        keyDiffs.push(`${s1.name} is structured as ${s1.award}, whereas ${s2.name} is ${s2.award}.`);
      }
    }

    const perScholarship = items.map((s) => {
      const text = `${s.name} ${s.description} ${s.bond} ${s.award}`.toLowerCase();
      const strengths: string[] = [];
      const considerations: string[] = [];

      if (text.includes('full') || text.includes('100%') || text.includes('tuition')) {
        strengths.push('Full or substantial academic tuition fee waiver.');
      }
      if (text.includes('living allowance') || text.includes('stipend')) {
        strengths.push('Monthly living allowance / subsistence stipend.');
      }
      if (text.includes('fast-track') || text.includes('career') || text.includes('placement')) {
        strengths.push('Structured corporate executive mentorship and placement track.');
      }
      if (strengths.length === 0) {
        strengths.push(`Direct institutional sponsorship with ${s.provider}.`);
      }

      if (s.bond && !s.bond.toLowerCase().includes('no service bond')) {
        considerations.push(`Contains service obligation: ${s.bond}.`);
      } else {
        considerations.push('No mandatory corporate bond specified in official intake.');
      }

      if (s.minCgpa && s.minCgpa !== 'None specified') {
        considerations.push(`Strict minimum academic cutoff: ${s.minCgpa}.`);
      }

      return {
        name: s.name,
        strengths: strengths.slice(0, 3),
        considerations: considerations.slice(0, 3),
      };
    });

    setAiInsight({
      summary: `Objective side-by-side comparison across ${items.length} verified Malaysian scholarships. Every comparison point is grounded in authoritative provider terms.`,
      keyDifferences: keyDiffs,
      perScholarship,
    });
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const res = await fetch(`/api/scholarships/compare-data${idsParam ? `?ids=${encodeURIComponent(idsParam)}` : ''}`);
        const data = await res.json();
        if (data.scholarships) {
          setScholarships(data.scholarships);
          setAvailableList(data.available || []);

          // Pre-generate deterministic baseline comparison so differences are immediately visible without waiting for AI
          generateDeterministicBaseline(data.scholarships);
        }
      } catch (err) {
        console.error('Failed to load comparison data:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, [idsParam, generateDeterministicBaseline]);

  const removeScholarship = (id: string) => {
    const updated = scholarships.filter((s) => s.id !== id);
    setScholarships(updated);
    router.replace(`/scholarships/compare?ids=${updated.map((s) => s.id).join(',')}`);
    generateDeterministicBaseline(updated);
  };

  const addScholarship = (item: { id: string; name: string }) => {
    if (scholarships.length >= 4) {
      alert('You can compare a maximum of 4 scholarships simultaneously.');
      return;
    }
    if (scholarships.some((s) => s.id === item.id)) return;
    const newIds = [...scholarships.map((s) => s.id), item.id];
    router.replace(`/scholarships/compare?ids=${newIds.join(',')}`);
  };

  const generateAiComparison = async () => {
    if (scholarships.length < 2) return;
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scholarships }),
      });
      const data: ScholarshipComparisonOutput = await res.json();
      if (data && data.keyDifferences) {
        setAiInsight(data);
      }
    } catch (err) {
      console.error('AI comparison failed:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <SiteNav />

      {/* Ambient header bar */}
      <div className="pt-24 pb-8 bg-gradient-to-b from-[#f8f9ff] via-[#f1f5fd] to-[#F8FAFC] border-b border-slate-200/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Link
                href="/scholarships"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalogue
              </Link>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/60 mb-2 ml-3">
                <Scale className="w-3 h-3 text-blue-600" />
                <span>Side-by-Side Evaluation</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
                Compare <span className="font-serif italic font-normal text-blue-900">Verified Scholarships</span>
              </h1>
              <p className="text-slate-600 text-sm mt-1 max-w-2xl font-normal">
                Objective side-by-side evaluation of coverage, bond terms, academic cutoffs, and deadlines.
              </p>
            </div>

            <button
              onClick={generateAiComparison}
              disabled={scholarships.length < 2 || isLoadingAi}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-40 shrink-0"
            >
              {isLoadingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Differences...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Synthesize with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl space-y-8">

        {/* Key Differences & Insights (Works Offline & AI Enriched) */}
        {aiInsight && aiInsight.keyDifferences.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B1B3D] uppercase tracking-wider">
              <Scale className="w-4 h-4 text-amber-700" />
              <span>Key Factual Differences</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {aiInsight.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {aiInsight.keyDifferences.map((diff, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">{diff}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pros & Considerations Cards */}
        {aiInsight && aiInsight.perScholarship && aiInsight.perScholarship.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Strengths & Considerations (Factual Analysis)</span>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${scholarships.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
              {aiInsight.perScholarship.map((item, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#0B1B3D] line-clamp-1">{item.name}</h3>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">{scholarships[i]?.provider}</p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Key Strengths</span>
                        </span>
                        <ul className="text-xs text-slate-700 space-y-1">
                          {item.strengths.map((str, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold shrink-0">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Considerations / Obligations</span>
                        </span>
                        <ul className="text-xs text-slate-700 space-y-1">
                          {item.considerations.map((con, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-1.5">
                              <span className="text-amber-700 font-bold shrink-0">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Verified by DreamPath</span>
                    <Link
                      href={`/scholarships/${scholarships[i]?.id}`}
                      className="text-xs font-bold text-amber-900 hover:text-amber-950 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison Table */}
        {isLoadingData ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto" />
            <p className="text-xs text-slate-500 mt-3 font-medium">Loading verified comparison data...</p>
          </div>
        ) : scholarships.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-4 max-w-md mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#0B1B3D]">Compare Scholarships</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select 2 to 4 scholarships to compare eligibility criteria, corporate bonds, allowances, and deadlines side by side.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-[#0B1B3D] text-[#FAFAF9] hover:bg-[#0B1B3D]/90 rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Select Scholarships</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="p-4 w-44 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Attribute
                  </th>
                  {scholarships.map((s) => (
                    <th key={s.id} className="p-4 min-w-[240px] max-w-[320px] align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase">{s.provider}</p>
                          <Link
                            href={`/scholarships/${s.id}`}
                            className="font-serif text-base font-bold text-[#0B1B3D] hover:text-amber-800 line-clamp-2 transition-colors"
                          >
                            {s.name}
                          </Link>
                        </div>
                        <button
                          onClick={() => removeScholarship(s.id)}
                          aria-label={`Remove ${s.name} from comparison`}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                  {scholarships.length < 4 && (
                    <th className="p-4 min-w-[200px] align-top bg-slate-50/30">
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full min-h-[90px] rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-700 hover:bg-amber-50/50 text-slate-500 hover:text-amber-900 transition-all flex flex-col items-center justify-center gap-1.5 p-3 group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-white group-hover:bg-amber-100 flex items-center justify-center shadow-xs transition-colors">
                          <Plus className="w-4 h-4 text-slate-600 group-hover:text-amber-800" />
                        </div>
                        <span className="font-semibold text-xs">Add Scholarship</span>
                        <span className="text-[10px] text-slate-400">({4 - scholarships.length} slot{4 - scholarships.length === 1 ? '' : 's'} remaining)</span>
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {/* Provider */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Provider / Sponsor</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 font-bold text-slate-900">{s.provider}</td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Award Type */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Award Structure</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <span className="font-semibold text-slate-900 block">{s.award}</span>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Study Level */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Study Level</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 font-semibold text-slate-800">{s.studyLevel}</td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Minimum CGPA */}
                <tr className="bg-amber-50/20">
                  <td className="p-4 bg-amber-50/40 text-amber-900 font-semibold">Academic Benchmark (CGPA)</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 font-bold text-slate-900">
                      <span className="px-2.5 py-1 bg-amber-100/70 text-amber-900 rounded-md font-mono text-xs">
                        {s.minCgpa}
                      </span>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-amber-50/10" />}
                </tr>

                {/* Bond / Service Obligation */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Service Bond / Obligation</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                          s.bond.toLowerCase().includes('no service bond')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {s.bond}
                      </span>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Tuition Coverage */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Tuition Coverage</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-xs font-medium text-slate-800">
                      {s.tuitionCoverage}
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Living Allowance */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Living Allowance / Stipend</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-xs font-medium text-slate-800">
                      {s.livingAllowance}
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Target Disciplines */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Target Disciplines</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-xs text-slate-700 leading-relaxed">
                      {s.eligibleFields}
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Duration */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Supported Duration</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-xs text-slate-800">
                      {s.duration}
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Status & Deadline */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Intake Deadline</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <span className="font-bold text-slate-900 block">{s.closeDate}</span>
                      <span
                        className={`text-[11px] font-bold uppercase ${
                          s.status === 'published' ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {s.status === 'published' ? 'Active Intake' : s.status}
                      </span>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Eligibility Check Action */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Eligibility Verification</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <Link
                        href={`/scholarships/${s.id}/check`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Run AST Check
                      </Link>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Official Source Link */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Official Source</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <Link
                        href={`/scholarships/${s.id}`}
                        className="inline-flex items-center gap-1 text-amber-800 hover:underline font-semibold"
                      >
                        <span>View Verified Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Add more scholarships selector */}
        {scholarships.length < 4 && availableList.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add scholarship to comparison:</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Search all scholarships &rarr;</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {availableList
                .filter((a) => !scholarships.some((s) => s.id === a.id))
                .slice(0, 15)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addScholarship(item)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-amber-700" />
                    <span>{item.name}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Search & Add Scholarship Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">Add to Comparison</h3>
                  <p className="text-xs text-slate-500">
                    Comparing {scholarships.length}/4 scholarships ({4 - scholarships.length} remaining)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search filter input */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search scholarship name or provider..."
                  autoFocus
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                />
              </div>

              {/* Scholarships list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
                {availableList
                  .filter((item) => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return item.name.toLowerCase().includes(q) || item.provider.toLowerCase().includes(q);
                  })
                  .map((item) => {
                    const isSelected = scholarships.some((s) => s.id === item.id);
                    return (
                      <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#0B1B3D] truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{item.provider}</p>
                        </div>
                        {isSelected ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
                            Already Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              addScholarship(item);
                              if (scholarships.length + 1 >= 4) {
                                setIsAddModalOpen(false);
                              }
                            }}
                            disabled={scholarships.length >= 4}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  );
}
