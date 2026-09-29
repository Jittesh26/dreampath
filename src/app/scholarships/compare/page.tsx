'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { Sparkles, CheckCircle2, ArrowLeft, ExternalLink, Loader2, Plus, X } from 'lucide-react';

interface ScholarshipItem {
  id: string;
  name: string;
  provider: string;
  description: string;
  closeDate: string;
  status: string;
  sourceUrl?: string;
  requirements: string[];
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scholarships, setScholarships] = useState<ScholarshipItem[]>([]);
  const [availableList, setAvailableList] = useState<ScholarshipItem[]>([]);
  const [aiInsight, setAiInsight] = useState<{
    summary: string;
    tableHighlights: Array<{ label: string; values: string[] }>;
    recommendationTip: string;
  } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const idsParam = searchParams.get('ids') || '';

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const res = await fetch('/api/ai/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'all scholarships' }),
        });
        const data = await res.json();
        if (data.scholarships) {
          const formatted: ScholarshipItem[] = data.scholarships.map((s: any) => ({
            id: s.id,
            name: s.scholarshipName,
            provider: s.providerName,
            description: s.description,
            closeDate: s.closeDate || 'TBA',
            status: s.status,
            sourceUrl: s.sourceUrl,
            requirements: ['Malaysian Citizenship', 'Minimum Academic Benchmark'],
          }));
          setAvailableList(formatted);

          const requestedIds = idsParam.split(',').filter(Boolean);
          if (requestedIds.length > 0) {
            const matched = formatted.filter((s) => requestedIds.includes(s.id));
            setScholarships(matched);
          } else {
            // Default first 3
            setScholarships(formatted.slice(0, 3));
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, [idsParam]);

  const removeScholarship = (id: string) => {
    const updated = scholarships.filter((s) => s.id !== id);
    setScholarships(updated);
    router.replace(`/scholarships/compare?ids=${updated.map((s) => s.id).join(',')}`);
    setAiInsight(null);
  };

  const addScholarship = (item: ScholarshipItem) => {
    if (scholarships.length >= 4) {
      alert('You can compare a maximum of 4 scholarships simultaneously.');
      return;
    }
    if (scholarships.some((s) => s.id === item.id)) return;
    const updated = [...scholarships, item];
    setScholarships(updated);
    router.replace(`/scholarships/compare?ids=${updated.map((s) => s.id).join(',')}`);
    setAiInsight(null);
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
      const data = await res.json();
      setAiInsight(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <SiteNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl space-y-8">
        {/* Back and Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalogue
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#0B1B3D] tracking-tight">
              Compare Verified Scholarships
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Side-by-side objective evaluation of coverage, bond terms, eligibility, and deadlines.
            </p>
          </div>

          <button
            onClick={generateAiComparison}
            disabled={scholarships.length < 2 || isLoadingAi}
            className="px-5 py-2.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40 shadow-xs shrink-0"
          >
            {isLoadingAi ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Differences...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Generate AI Comparative Insights</span>
              </>
            )}
          </button>
        </div>

        {/* AI Comparative Insights Card */}
        {aiInsight && (
          <div className="bg-white border border-amber-200/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Grounded AI Comparative Assessment</span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {aiInsight.summary}
            </p>

            {aiInsight.tableHighlights && aiInsight.tableHighlights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {aiInsight.tableHighlights.map((hl) => (
                  <div key={hl.label} className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">{hl.label}</p>
                    <ul className="text-xs text-slate-700 mt-1.5 space-y-1">
                      {hl.values.map((v, i) => (
                        <li key={i} className="line-clamp-2">
                          <strong className="text-slate-900">{scholarships[i]?.provider}:</strong> {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {aiInsight.recommendationTip && (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-medium">
                <strong className="font-bold text-emerald-800">Recommendation:</strong>{' '}
                {aiInsight.recommendationTip}
              </div>
            )}
          </div>
        )}

        {/* Comparison Table / Grid */}
        {isLoadingData ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto" />
            <p className="text-xs text-slate-500 mt-3 font-medium">Loading verified data...</p>
          </div>
        ) : scholarships.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
            <h3 className="font-serif text-2xl font-bold text-[#0B1B3D]">No scholarships selected</h3>
            <p className="text-sm text-slate-500">Pick up to 4 scholarships below to compare them side by side.</p>
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
                    <th key={s.id} className="p-4 min-w-[240px] max-w-[300px] align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500 uppercase">{s.provider}</p>
                          <Link href={`/scholarships/${s.id}`} className="font-serif text-base font-bold text-[#0B1B3D] hover:text-amber-800 line-clamp-2">
                            {s.name}
                          </Link>
                        </div>
                        <button
                          onClick={() => removeScholarship(s.id)}
                          aria-label={`Remove ${s.name} from comparison`}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                  {scholarships.length < 4 && (
                    <th className="p-4 min-w-[200px] align-top bg-slate-50/30">
                      <div className="text-slate-400 text-xs text-center py-6">
                        <Plus className="w-5 h-5 mx-auto mb-1 opacity-50" />
                        Add slot ({4 - scholarships.length} remaining)
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {/* Provider */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Provider</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 font-semibold text-slate-900">{s.provider}</td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Status & Deadline */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Intake Deadline</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4">
                      <span className="font-bold text-slate-900 block">{s.closeDate}</span>
                      <span className="text-[11px] text-amber-800 font-semibold uppercase">{s.status}</span>
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Scope & Overview */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Program Overview</td>
                  {scholarships.map((s) => (
                    <td key={s.id} className="p-4 text-xs text-slate-600 leading-relaxed">
                      {s.description}
                    </td>
                  ))}
                  {scholarships.length < 4 && <td className="bg-slate-50/20" />}
                </tr>

                {/* Deterministic Check Action */}
                <tr>
                  <td className="p-4 bg-slate-50/40 text-slate-500 font-semibold">Eligibility Check</td>
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
            <h3 className="text-sm font-bold text-slate-900">Add scholarship to comparison:</h3>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {availableList
                .filter((a) => !scholarships.some((s) => s.id === a.id))
                .slice(0, 15)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addScholarship(item)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-700" />
                    <span>{item.name}</span>
                  </button>
                ))}
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
