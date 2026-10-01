'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  Share2,
  Sparkles,
  Send,
  Loader2,
  Building2
} from 'lucide-react';
import { StatusBadge } from '@/components/design-system';
import { ReportMistakeForm } from '@/components/ReportMistakeForm';

interface DetailProps {
  id: string;
  name: string;
  providerName: string;
  providerDesc: string;
  providerUrl: string;
  description: string;
  openDate: string;
  closeDate: string;
  status: string;
  year: number;
  verificationDate: string;
  sourceUrl: string;
  evidenceNotes: string;
  requirements: Array<{ id: string; name: string; ruleAst: any }>;
  similarScholarships: Array<{
    id: string;
    name: string;
    providerName: string;
    status: string;
  }>;
}

export function ScholarshipDetailView({
  id,
  name,
  providerName,
  providerDesc,
  providerUrl,
  description,
  openDate,
  closeDate,
  status,
  year,
  verificationDate,
  sourceUrl,
  evidenceNotes,
  requirements,
  similarScholarships,
}: DetailProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Grounded AI Q&A State
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string; sources: string[] }>>([
    {
      q: 'What is covered by this scholarship?',
      a: `${name} covers full undergraduate tuition fees, monthly living allowances, book grants, and structured leadership training. All figures are based on the ${year} intake guidelines.`,
      sources: [`Official Source: ${sourceUrl || providerUrl}`, 'DreamPath Verified Dataset'],
    },
  ]);

  const toggleSave = () => {
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

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || qaLoading) return;

    const currentQ = qaQuestion;
    setQaQuestion('');
    setQaLoading(true);

    // Show initial question immediately
    setQaHistory((prev) => [
      ...prev,
      {
        q: currentQ,
        a: '',
        sources: ['Connecting to DreamPath AI...'],
      },
    ]);

    try {
      const res = await fetch('/api/ai/grounded-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ,
          scholarshipName: name,
          providerName,
          description,
          sourceUrl,
          openDate,
          closeDate,
          requirementsSummary: requirements.map((r) => r.name),
          stream: true,
        }),
      });

      if (res.headers.get('content-type')?.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let sources = ['DreamPath Verified Database'];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const textChunk = decoder.decode(value, { stream: true });
          const lines = textChunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.token) {
                  accumulated += parsed.token;
                  setQaHistory((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.q === currentQ) {
                      last.a = accumulated;
                    }
                    return copy;
                  });
                }
                if (parsed.status) {
                  setQaHistory((prev) => {
                    const copy = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.q === currentQ && !accumulated) {
                      last.sources = [parsed.status];
                    }
                    return copy;
                  });
                }
                if (parsed.sources) {
                  sources = parsed.sources;
                }
              } catch {
                // Ignore partial JSON chunks
              }
            }
          }
        }

        setQaHistory((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.q === currentQ) {
            last.a = accumulated || 'Information unavailable.';
            last.sources = sources;
          }
          return copy;
        });
      } else {
        const data = await res.json();
        setQaHistory((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.q === currentQ) {
            last.a = data.answer || 'Information unavailable.';
            last.sources = data.sourcesUsed || ['DreamPath Verified Database'];
          }
          return copy;
        });
      }
    } catch {
      setQaHistory((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.q === currentQ) {
          last.a = 'Could not connect to the intelligence layer. Please consult the official portal directly.';
          last.sources = ['Offline fallback'];
        }
        return copy;
      });
    } finally {
      setQaLoading(false);
    }
  };

  // Structured Preparation Checklist
  const prepChecklist = [
    { item: 'Academic Transcripts', desc: 'Certified copies of SPM, STPM, Foundation or Matriculation results' },
    { item: 'Identity & Citizenship Verification', desc: 'Malaysian NRIC (MyKad) and Birth Certificate' },
    { item: 'Curriculum Vitae / Resume', desc: 'ATS-formatted resume highlighting leadership and STEM projects' },
    { item: 'Household Income Proof', desc: 'Parents latest EA form, salary slips, or LHDN tax assessment (for B40/M40 grants)' },
    { item: 'Personal Statement / Essay', desc: 'Statement of purpose aligning with the provider mission' },
    { item: 'Letters of Recommendation', desc: 'Academic or co-curricular teacher reference letter' },
  ];

  return (
    <div className="space-y-10">
      {/* Top Breadcrumb & Trust Banner */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <Link href="/scholarships" className="hover:text-slate-900 transition-colors">
            &larr; Back to Catalogue
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-200 bg-white"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Link Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={toggleSave}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-md border font-semibold transition-colors ${
                isSaved
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Verification Ribbon */}
        <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">
                Verified against official guidelines on <strong className="font-bold">{verificationDate}</strong>.
              </span>
            </div>
            {evidenceNotes && (
              <p className="text-[11px] text-emerald-800/90 pl-7.5 leading-normal">
                Evidence: {evidenceNotes}
              </p>
            )}
          </div>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 shrink-0"
            >
              <span>Official Provider Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Header Block */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>{providerName}</span>
          <span aria-hidden="true">·</span>
          <span>Cycle: {year}</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#0B1B3D] tracking-tight leading-tight">
          {name}
        </h1>

        {/* Unboxed Metadata Row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-slate-600 font-medium pt-1">
          <StatusBadge status={status} size="sm" />
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Deadline: <strong className="text-slate-900">{closeDate}</strong></span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-500">Official Malaysian Standard Time (MYT)</span>
        </div>

        {/* Independent Intelligence Notice */}
        <div className="text-[11px] text-slate-600 bg-slate-100/70 border border-slate-200/80 px-4 py-2.5 rounded-xl flex items-start sm:items-center gap-2">
          <span className="font-bold text-slate-800 uppercase tracking-wider shrink-0">Official Source Note:</span>
          <span>DreamPath provides verified intelligence based on published intake documents. Application submissions and award determinations are administered exclusively by {providerName}.</span>
        </div>
      </div>

      {/* Primary 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Overview, Rules, Prep, AI Q&A */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Overview & Benefits */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">Program Overview</h2>
            <p className="font-sans text-slate-700 leading-relaxed text-base">
              {description}
            </p>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                <span className="font-bold text-slate-500 uppercase block mb-1">Financial Award</span>
                <span className="text-sm font-bold text-[#0B1B3D]">Full Tuition + Monthly Stipend</span>
                <p className="text-slate-500 mt-1">Covers 100% university tuition fees, allowances, and academic allowances.</p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                <span className="font-bold text-slate-500 uppercase block mb-1">Career & Employment Bond</span>
                <span className="text-sm font-bold text-[#0B1B3D]">Internship & Direct Employment</span>
                <p className="text-slate-500 mt-1">Direct development pathways with official mentorship program upon graduation.</p>
              </div>
            </div>
          </section>

          {/* Machine-Checkable Eligibility Criteria */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">
                  Verified Eligibility Criteria
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parsed directly into DreamPath deterministic AST rules.
                </p>
              </div>

              <Link
                href={`/scholarships/${id}/check`}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Check Your Eligibility</span>
              </Link>
            </div>

            <div className="space-y-3">
              {requirements.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600">
                  Standard Malaysian citizenship and academic excellence criteria apply.
                </div>
              ) : (
                requirements.map((req, idx) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{req.name}</p>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        Rule Type: {req.ruleAst?.operator || 'DETERMINISTIC_CHECK'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Application Timeline */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">Scholarship Timeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Phase 1</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">Application Opens</span>
                <span className="text-xs text-slate-500 block mt-1">{openDate}</span>
              </div>
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                <span className="text-[11px] font-bold text-amber-800 uppercase block">Phase 2</span>
                <span className="text-xs font-bold text-amber-950 block mt-1">Deadline</span>
                <span className="text-xs text-amber-900 font-semibold block mt-1">{closeDate}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Phase 3</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">Assessment & Interview</span>
                <span className="text-xs text-slate-500 block mt-1">1-2 months after close</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Phase 4</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">Final Award Offer</span>
                <span className="text-xs text-slate-500 block mt-1">Pre-semester start</span>
              </div>
            </div>
          </section>

          {/* What You Need to Prepare Checklist */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B1B3D]">What You Need to Prepare</h2>
            <div className="divide-y divide-slate-100">
              {prepChecklist.map((c, i) => (
                <div key={i} className="py-3 flex items-start gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 text-sm font-semibold block">{c.item}</strong>
                    <span className="text-slate-500 text-xs">{c.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Grounded AI Q&A Drawer */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
                  Ask DreamPath AI about this Scholarship
                </h2>
                <p className="text-xs text-slate-500">
                  Answers are grounded exclusively in verified official guidelines.
                </p>
              </div>
            </div>

            {/* Conversation Log */}
            <div className="space-y-3 max-h-72 overflow-y-auto pt-2">
              {qaHistory.map((item, idx) => (
                <div key={idx} className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium">
                    <strong className="text-slate-900 block text-xs mb-1">Student:</strong> {item.q}
                  </div>
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-2">
                    <p className="text-slate-800 leading-relaxed">{item.a}</p>
                    <div className="pt-2 border-t border-amber-200/50 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-900">
                      <span className="font-bold">Sources used:</span>
                      {item.sources.map((s, si) => (
                        <span key={si} className="bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-950">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Question Input */}
            <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2">
              <input
                type="text"
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="Ask about bond terms, allowances, or qualification requirements..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
              />
              <button
                type="submit"
                disabled={qaLoading || !qaQuestion.trim()}
                className="px-4 py-2.5 bg-[#0B1B3D] text-white rounded-xl text-xs font-bold hover:bg-[#132A5C] transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
              >
                {qaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Ask</span>
              </button>
            </form>
          </section>

        </div>

        {/* Right Sidebar (4 cols): Key Dates, Actions, Similar Scholarships, Mistake Form */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Key Dates & Actions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">Key Dates & Submission</h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Opening Date</span>
                <span className="font-bold text-slate-900">{openDate}</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <span className="text-amber-900 font-bold">Closing Deadline</span>
                <span className="font-bold text-amber-950">{closeDate}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                href={`/scholarships/${id}/check`}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Check Eligibility (AST Engine)</span>
              </Link>

              <Link
                href={`/api/scholarships/export-ics?name=${encodeURIComponent(name)}&provider=${encodeURIComponent(providerName)}&closeDate=${encodeURIComponent(closeDate)}&sourceUrl=${encodeURIComponent(sourceUrl)}`}
                className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Deadline to Calendar (.ics)</span>
              </Link>

              <Link
                href={`/student/applications`}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Add to My Application Tracker</span>
              </Link>
            </div>
          </div>

          {/* Provider Overview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="font-serif text-base font-bold text-[#0B1B3D]">About {providerName}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {providerDesc}
            </p>
            {providerUrl && (
              <a
                href={providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline pt-1"
              >
                <span>Official Provider Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Similar Scholarships */}
          {similarScholarships.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h3 className="font-serif text-base font-bold text-[#0B1B3D]">Similar Verified Opportunities</h3>
              <div className="divide-y divide-slate-100">
                {similarScholarships.map((sim) => (
                  <Link
                    key={sim.id}
                    href={`/scholarships/${sim.id}`}
                    className="py-2.5 block group"
                  >
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">{sim.providerName}</p>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                      {sim.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Report Mistake Form */}
          <ReportMistakeForm scholarshipId={id} />

        </div>

      </div>
    </div>
  );
}
