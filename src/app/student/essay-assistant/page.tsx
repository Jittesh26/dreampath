'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Lightbulb,
  BookOpen,
} from 'lucide-react';

import { PageHeader } from '@/components/design-system';

const SCHOLARSHIPS = [
  { name: 'Gamuda Scholarship', provider: 'Gamuda Berhad', prompt: 'Explain your passion for engineering or built environment and how you will drive sustainable infrastructure.' },
  { name: 'Petronas Education Sponsorship (PESP)', provider: 'PETRONAS', prompt: 'Describe an instance where you demonstrated leadership and adaptability in overcoming an unexpected setback.' },
  { name: 'Yayasan Khazanah Global Scholarship', provider: 'Yayasan Khazanah', prompt: 'How do you envision your contribution to Malaysias economic competitiveness over the next decade?' },
  { name: 'Bank Negara Kijang Scholarship', provider: 'Bank Negara Malaysia', prompt: 'Discuss an economic, technological, or financial challenge facing Malaysia and your proposed solution.' },
  { name: 'General Personal Statement', provider: 'Standard Malaysian Tertiary', prompt: 'Statement of Purpose / Personal Statement' },
];

export default function EssayAssistantPage() {
  const [selectedPrompt, setSelectedPrompt] = useState(SCHOLARSHIPS[0]);
  const [action, setAction] = useState<'brainstorm' | 'structure' | 'review'>('brainstorm');
  const [studentDraft, setStudentDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const wordCount = studentDraft.trim() ? studentDraft.trim().split(/\s+/).length : 0;
  const charCount = studentDraft.length;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          scholarshipName: selectedPrompt.name,
          providerName: selectedPrompt.provider,
          essayPrompt: selectedPrompt.prompt,
          studentDraft,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Student Workspace', href: '/student' },
          { label: 'Essay & Statement Assistant' },
        ]}
        eyebrow="Controlled Writing Guidance"
        title="Scholarship Essay & Statement Assistant"
        subtitle="Brainstorm authentic structures, review draft clarity, and refine your tone without fabricating achievements or personal stories."
      />

      {/* Configuration & Input Form */}
      <form onSubmit={handleGenerate} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5">
        
        {/* Scholarship & Prompt Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Target Scholarship & Essay Prompt
          </label>
          <select
            value={selectedPrompt.name}
            onChange={(e) => {
              const matched = SCHOLARSHIPS.find((s) => s.name === e.target.value);
              if (matched) setSelectedPrompt(matched);
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            {SCHOLARSHIPS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} — &ldquo;{s.prompt}&rdquo;
              </option>
            ))}
          </select>
        </div>

        {/* Action Type Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Advisory Focus
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'brainstorm', label: '1. Brainstorm Outline' },
              { id: 'structure', label: '2. Review Flow & Structure' },
              { id: 'review', label: '3. Polish Tone & Clarity' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAction(t.id as any)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  action === t.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Student Draft / Notes Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 block">
              Your Notes, Rough Ideas, or Existing Draft
            </label>
            <span className="text-[11px] font-mono text-slate-400 font-medium">
              {wordCount} words • {charCount} characters
            </span>
          </div>
          <textarea
            rows={7}
            value={studentDraft}
            onChange={(e) => setStudentDraft(e.target.value)}
            placeholder="Paste your rough paragraphs or outline key experiences you want to convey (e.g. school robotics competition, tutoring peers, community leadership)..."
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 placeholder:text-slate-400 leading-relaxed resize-y font-normal"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">
            Adheres to strict anti-hallucination ethics. You remain the sole author.
          </span>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-xs cursor-pointer shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            <span>{isLoading ? 'Analyzing Essay Context...' : 'Generate Guidance'}</span>
          </button>
        </div>
      </form>

      {/* Output Results */}
      {result && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Essay Advisor Synthesis</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 leading-relaxed font-normal">
            {result.feedback}
          </div>

          {result.suggestedOutline && result.suggestedOutline.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-sans text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Recommended Paragraph Architecture</span>
              </h3>
              <div className="space-y-2">
                {result.suggestedOutline.map((point: string, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-50/70 border border-slate-200/90 rounded-xl flex items-start gap-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 font-medium leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.strengths && result.strengths.length > 0 && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-1.5 text-xs">
              <strong className="text-emerald-950 font-bold block text-xs tracking-wide">Key Strengths Identified:</strong>
              <ul className="list-disc list-inside text-emerald-900 space-y-0.5 leading-relaxed font-medium">
                {result.strengths.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.improvements && result.improvements.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-1.5 text-xs">
              <strong className="text-amber-950 font-bold block text-xs tracking-wide">Key Recommendations for Revision:</strong>
              <ul className="list-disc list-inside text-amber-900 space-y-0.5 leading-relaxed font-medium">
                {result.improvements.map((imp: string, i: number) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
