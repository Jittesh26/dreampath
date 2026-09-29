'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  ArrowLeft,
  Loader2,
  Lightbulb,
  BookOpen
} from 'lucide-react';

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
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          <span>Controlled Writing Guidance</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
          Scholarship Essay & Statement Assistant
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Brainstorm authentic structures, review draft clarity, and refine your tone without fabricating achievements or personal stories.
        </p>
      </div>

      {/* Configuration & Input Form */}
      <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        
        {/* Scholarship & Prompt Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase block">
            Target Scholarship & Essay Prompt:
          </label>
          <select
            value={selectedPrompt.name}
            onChange={(e) => {
              const matched = SCHOLARSHIPS.find((s) => s.name === e.target.value);
              if (matched) setSelectedPrompt(matched);
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
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
          <label className="text-xs font-bold text-slate-700 uppercase block">
            What do you need help with?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'brainstorm', label: '1. Brainstorm Outline' },
              { id: 'structure', label: '2. Review Flow & Structure' },
              { id: 'review', label: '3. Polish Tone & Clarity' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAction(t.id as any)}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-colors ${
                  action === t.id
                    ? 'bg-[#0B1B3D] border-[#0B1B3D] text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Student Draft / Notes Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase block">
            Your Notes, Rough Ideas, or Existing Draft:
          </label>
          <textarea
            rows={7}
            value={studentDraft}
            onChange={(e) => setStudentDraft(e.target.value)}
            placeholder="Paste your rough paragraphs or list key milestones you want to include (e.g., school robotics competition, tutoring peers, financial struggles overcame)..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 leading-relaxed"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Adheres to strict anti-hallucination ethics. You remain the sole author.
          </span>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            <span>{isLoading ? 'Analyzing Essay Context...' : 'Generate Guidance'}</span>
          </button>
        </div>
      </form>

      {/* Output Results */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-700" />
            <span>Essay Advisor Analysis</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 leading-relaxed font-medium">
            {result.feedback}
          </div>

          {result.suggestedOutline && result.suggestedOutline.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-bold text-[#0B1B3D] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>Recommended Paragraph Architecture</span>
              </h3>
              <div className="space-y-2">
                {result.suggestedOutline.map((point: string, idx: number) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 font-medium">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.strengths && result.strengths.length > 0 && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
              <strong className="text-emerald-950 font-bold block text-xs">Strengths in your Draft:</strong>
              <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                {result.strengths.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.improvements && result.improvements.length > 0 && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 text-xs">
              <strong className="text-amber-950 font-bold block text-xs">Key Recommendations:</strong>
              <ul className="list-disc list-inside text-amber-800 space-y-0.5">
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
