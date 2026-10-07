'use client';

import React, { useState, useEffect } from 'react';
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
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/design-system';
import { ReportMistakeForm } from '@/components/ReportMistakeForm';
import { extractScholarshipAttributes } from '@/domain/scholarship-attributes';
import { saveScholarshipApplication, getTrackedScholarshipIds } from '@/app/actions/student';

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
  requirements: Array<{ id: string; name: string; ruleAst: any; selectionStages?: any[] }>;
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
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string; sources: string[] }>>([]);

  const attrs = extractScholarshipAttributes(
    name,
    description,
    evidenceNotes,
    closeDate,
    openDate,
    status,
    providerName
  );

  useEffect(() => {
    let mounted = true;
    const checkTracked = async () => {
      try {
        const ids = await getTrackedScholarshipIds();
        if (mounted && ids.includes(id)) {
          setIsSaved(true);
          return;
        }
      } catch {
        // ignore
      }
      try {
        const saved = JSON.parse(localStorage.getItem('dreampath_saved_scholarships') || '[]');
        if (mounted && saved.includes(id)) {
          setIsSaved(true);
        }
      } catch {
        // ignore
      }
    };
    checkTracked();
    return () => {
      mounted = false;
    };
  }, [id]);

  const toggleSave = async () => {
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
        await saveScholarshipApplication(id, 'not_started');
      } catch {
        // keep optimistic state
      }
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
          scholarshipId: id,
          question: currentQ,
          scholarshipName: name,
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
    { item: 'Certified Academic Transcripts', desc: 'Certified copies of SPM, STPM, Foundation, Matriculation, or A-Levels results' },
    { item: 'Identity Verification & Citizenship', desc: 'Malaysian NRIC (MyKad) and Birth Certificate' },
    { item: 'ATS-Formatted Resume', desc: 'Professional resume highlighting leadership, extracurriculars, and technical projects' },
    { item: 'Household Income Documentation', desc: 'Latest EA form, salary slips, or official LHDN tax assessment statements' },
    { item: 'Personal Statement / Essay', desc: 'Structured statement of purpose aligned with the scholarship provider mandate' },
    { item: 'Academic References', desc: 'Official recommendation letter from principal, counselor, or lecturer' },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Top Breadcrumb & Trust Banner */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <Link href="/scholarships" className="hover:text-[#0F172A] transition-colors inline-flex items-center gap-1.5 font-semibold">
            &larr; Back to Scholarship Directory
          </Link>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{isCopied ? 'Link Copied!' : 'Share Dossier'}</span>
            </button>
            {isSaved && (
              <Link
                href="/student/applications"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
              >
                <span>View in Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              onClick={toggleSave}
              className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl border font-semibold transition-colors cursor-pointer shadow-2xs ${
                isSaved
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>{isSaved ? 'Tracked ✓' : 'Add to Tracker'}</span>
            </button>
          </div>
        </div>

        {/* Verification Ribbon */}
        <div className="w-full bg-emerald-50/90 border border-emerald-200/90 text-emerald-950 px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-emerald-950">
                Verified against official published guidelines on <strong className="font-bold">{verificationDate}</strong>.
              </span>
            </div>
            {evidenceNotes && (
              <p className="text-[12px] text-emerald-800/90 pl-7.5 leading-normal">
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
              <span>View Official Provider Notice</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Header Hero Block */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl ${attrs.providerMonogram.bgClass} text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0`}
            >
              {attrs.providerMonogram.text}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>{providerName}</span>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700">{attrs.providerMonogram.tierTag}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">Cycle: {year} Intake</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={status} size="md" />
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${attrs.deadlineUrgency.badgeClass}`}
            >
              {attrs.deadlineUrgency.label}
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] tracking-tight leading-[1.15] font-sans">
          {name}
        </h1>

        {/* High-Impact Monetary & Discipline Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Funding Coverage
            </span>
            <span className="text-[24px] font-extrabold text-[#0B1727] tracking-tight block">
              {attrs.awardText}
            </span>
            <span className="text-xs text-slate-500 block">
              {attrs.awardType}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Study Level & Fields
            </span>
            <span className="text-base font-bold text-[#0F172A] block mt-1">
              {attrs.studyLevel}
            </span>
            <span className="text-xs text-slate-500 block truncate">
              {attrs.eligibleFields}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Intake Closing Date
            </span>
            <span className="text-base font-bold text-[#0F172A] block mt-1">
              {closeDate}
            </span>
            <span className="text-xs text-slate-500 block">
              Opens: {openDate} (MYT)
            </span>
          </div>
        </div>

        {/* Independent Intelligence Notice */}
        <div className="text-[12px] text-slate-600 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-xl flex items-start sm:items-center gap-2">
          <FileCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="font-semibold text-slate-800">Authoritative Provenance Notice:</strong> DreamPath provides verified intelligence based on published provider circulars. Application submissions and award determinations are administered exclusively by {providerName}.
          </span>
        </div>
      </div>

      {/* Primary 2-Column Dossier Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Overview, AST Criteria, Timeline, Prep, AI Q&A */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Program Overview */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] font-sans tracking-tight">
              Program Overview
            </h2>
            <p className="font-sans text-slate-700 leading-relaxed text-[15px] font-normal">
              {description}
            </p>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider block">Financial Package</span>
                <span className="text-sm font-bold text-[#0F172A] block">Full Tuition + Allowances</span>
                <p className="text-slate-500 mt-1 leading-relaxed">Includes tuition fee waiver, monthly subsistence stipend, and academic grants.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider block">Service Obligation / Bond</span>
                <span className="text-sm font-bold text-[#0F172A] block">Corporate Development Track</span>
                <p className="text-slate-500 mt-1 leading-relaxed">Direct mentorship and structured career placement track upon graduation.</p>
              </div>
            </div>
          </section>

          {/* Machine-Checkable Eligibility Criteria */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] font-sans tracking-tight">
                  Verified Eligibility Criteria
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parsed directly into DreamPath deterministic boolean decision rules.
                </p>
              </div>

              <Link
                href={`/scholarships/${id}/check`}
                className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer min-h-[40px]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Run Eligibility Engine</span>
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
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
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

          {/* Post-Application Selection Process (Separate from Eligibility) */}
          {requirements.flatMap((r) => r.selectionStages || []).length > 0 && (
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] font-sans tracking-tight">
                  Provider Selection Stages
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stages conducted by the scholarship provider after application submission. These are not part of DreamPath&rsquo;s eligibility determination.
                </p>
              </div>

              <div className="space-y-3">
                {requirements.flatMap((r) => r.selectionStages || []).map((stage: any, idx: number) => (
                  <div
                    key={stage.id || idx}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{stage.name}</p>
                      {stage.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Scholarship Intake Timeline */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-5">
            <h2 className="text-2xl font-bold text-[#0F172A] font-sans tracking-tight">
              Intake Cycle Timeline
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phase 1</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">Application Opens</span>
                <span className="text-xs text-slate-500 block mt-1">{openDate}</span>
              </div>
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Phase 2</span>
                <span className="text-xs font-bold text-blue-950 block mt-1">Submission Deadline</span>
                <span className="text-xs text-blue-900 font-semibold block mt-1">{closeDate}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phase 3</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">Assessment & Panel</span>
                <span className="text-xs text-slate-500 block mt-1">1-2 months after close</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phase 4</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">Award Confirmation</span>
                <span className="text-xs text-slate-500 block mt-1">Pre-semester start</span>
              </div>
            </div>
          </section>

          {/* Preparation Checklist */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] font-sans tracking-tight">
              Required Application Documents
            </h2>
            <div className="divide-y divide-slate-100">
              {prepChecklist.map((c, i) => (
                <div key={i} className="py-3.5 flex items-start gap-3.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 text-sm font-semibold block">{c.item}</strong>
                    <span className="text-slate-500 text-xs leading-relaxed">{c.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Grounded AI Q&A Drawer */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] font-sans tracking-tight">
                  Grounded Scholarship Intelligence
                </h2>
                <p className="text-xs text-slate-500">
                  Ask factual questions about bond terms, allowances, and qualifications. Grounded exclusively in verified guidelines.
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
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                    <p className="text-slate-800 leading-relaxed font-normal">{item.a}</p>
                    <div className="pt-2 border-t border-blue-100 flex flex-wrap items-center gap-1.5 text-[11px] text-blue-900">
                      <span className="font-semibold">Sources used:</span>
                      {item.sources.map((s, si) => (
                        <span key={si} className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-950 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Question Input */}
            <form onSubmit={handleAskQuestion} className="flex gap-2.5 pt-2">
              <input
                type="text"
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                placeholder="Ask about bond terms, allowances, or qualification requirements..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 font-medium"
              />
              <button
                type="submit"
                disabled={qaLoading || !qaQuestion.trim()}
                className="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5 sticky top-24">
            <h3 className="text-lg font-bold text-[#0F172A] font-sans">Key Dates &amp; Submission</h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200/80">
                <span className="text-slate-600 font-medium">Opening Date</span>
                <span className="font-bold text-slate-900">{openDate}</span>
              </div>
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-blue-900 font-bold">Closing Deadline</span>
                <span className="font-bold text-blue-950">{closeDate}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                href={`/scholarships/${id}/check`}
                className="w-full py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Evaluate My Eligibility</span>
              </Link>

              <Link
                href={`/api/scholarships/export-ics?name=${encodeURIComponent(name)}&provider=${encodeURIComponent(providerName)}&closeDate=${encodeURIComponent(closeDate)}&sourceUrl=${encodeURIComponent(sourceUrl)}`}
                className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Deadline to Calendar (.ics)</span>
              </Link>

              <Link
                href="/student/applications"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
              >
                <span>Add to My Application Tracker</span>
              </Link>
            </div>

            {/* Provider Overview inside sidebar */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <span className="font-bold text-[#0F172A] block">About {providerName}</span>
              <p className="text-slate-600 leading-relaxed">
                {providerDesc}
              </p>
              {providerUrl && (
                <a
                  href={providerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline pt-1"
                >
                  <span>Official Provider Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Similar Scholarships */}
            {similarScholarships.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="font-bold text-[#0F172A] block text-xs">Similar Verified Opportunities</span>
                <div className="divide-y divide-slate-100">
                  {similarScholarships.map((sim) => (
                    <Link
                      key={sim.id}
                      href={`/scholarships/${sim.id}`}
                      className="py-2.5 block group"
                    >
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">{sim.providerName}</p>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1 font-sans">
                        {sim.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Report Mistake Form */}
            <div className="pt-2">
              <ReportMistakeForm scholarshipId={id} />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

