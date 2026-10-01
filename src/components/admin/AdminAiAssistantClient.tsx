'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export function AdminAiAssistantClient() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedRules, setExtractedRules] = useState<any>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/magic-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setExtractedRules({
        proposedCgpa: data.cgpa || '3.50',
        proposedCitizenship: 'Malaysian',
        proposedIncomeBand: 'B40/M40',
        detectedGrades: data.spmGrades || {},
        notes: 'Review these machine-checkable proposals. Human verifier approval is required before publishing.',
      });
    } catch {
      // fallback
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <div>
          <h2 className="font-sans text-base font-bold text-slate-950">
            Admin Extraction Assistant
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Paste raw guideline text to draft structured AST criteria.
          </p>
        </div>
      </div>

      <form onSubmit={handleParse} className="space-y-3">
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste official portal text (e.g. 'Eligibility: Open to Malaysian citizens aged under 25, CGPA at least 3.50 or STPM 3A, household income B40/M40')..."
          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-mono"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">
            AI suggestions never auto-publish.
          </span>
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span>Draft AST Rules</span>
          </button>
        </div>
      </form>

      {extractedRules && (
        <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-blue-950 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Draft Structured Criteria (For Verifier Confirmation)</span>
          </div>

          <div className="space-y-1 text-slate-800 font-mono text-[11px]">
            <p><strong>Rule 1:</strong> CGPA &gt;= {extractedRules.proposedCgpa} (GREATER_THAN_OR_EQUAL)</p>
            <p><strong>Rule 2:</strong> Citizenship == &apos;{extractedRules.proposedCitizenship}&apos; (EQUALS)</p>
            <p><strong>Rule 3:</strong> Income Band IN [&apos;B40&apos;, &apos;M40&apos;] (IN_ARRAY)</p>
          </div>

          <p className="text-[10px] text-blue-900/90 italic pt-1 border-t border-blue-200/60 font-medium">
            {extractedRules.notes}
          </p>
        </div>
      )}
    </div>
  );
}
