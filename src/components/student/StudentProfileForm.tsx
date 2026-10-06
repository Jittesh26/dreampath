'use client';

import React, { useState, useTransition } from 'react';
import { updateStudentProfile } from '@/app/actions/student';
import { Sparkles, CheckCircle2, AlertCircle, Upload, Loader2, X } from 'lucide-react';

const SPM_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

export function StudentProfileForm({
  initialProfile,
}: {
  initialProfile: any;
}) {
  const [citizenship, setCitizenship] = useState(initialProfile?.citizenship || 'Malaysian');
  const [bumiputeraStatus, setBumiputeraStatus] = useState(initialProfile?.bumiputeraStatus ? 'true' : 'false');
  const [incomeBand, setIncomeBand] = useState(initialProfile?.incomeBand || 'M40');
  const [cgpa, setCgpa] = useState(initialProfile?.cgpa || '');
  
  const initialSpm = (initialProfile?.spmResults as Record<string, string>) || {};
  const [spmMath, setSpmMath] = useState(initialSpm['Mathematics'] || '');
  const [spmAddMath, setSpmAddMath] = useState(initialSpm['Additional Mathematics'] || '');
  const [spmBm, setSpmBm] = useState(initialSpm['Bahasa Melayu'] || '');
  const [spmEng, setSpmEng] = useState(initialSpm['English'] || '');

  // Form Submission & Feedback State
  const [isSaving, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const spmResults: Record<string, string> = {};
    if (spmMath) spmResults['Mathematics'] = spmMath;
    if (spmAddMath) spmResults['Additional Mathematics'] = spmAddMath;
    if (spmBm) spmResults['Bahasa Melayu'] = spmBm;
    if (spmEng) spmResults['English'] = spmEng;

    startTransition(async () => {
      try {
        const res = await updateStudentProfile({
          citizenship,
          bumiputeraStatus: bumiputeraStatus === 'true',
          incomeBand,
          cgpa: cgpa ? cgpa : null,
          spmResults,
        });

        if (res?.success) {
          setFeedback({
            type: 'success',
            message: 'Academic profile saved successfully! Deterministic eligibility checks are now up to date.',
          });
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to save academic profile. Please try again.',
        });
      }
    });
  };

  // Magic Autofill Modal State
  const [isAutofillOpen, setIsAutofillOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedReview, setExtractedReview] = useState<any>(null);

  const handleExtract = async () => {
    if (!transcriptText.trim()) return;
    setIsExtracting(true);

    try {
      const res = await fetch('/api/ai/magic-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcriptText }),
      });
      const data = await res.json();
      setExtractedReview(data);
    } catch {
      alert('Failed to parse text. Please try again or fill in the fields directly.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyExtracted = () => {
    if (!extractedReview) return;
    if (extractedReview.cgpa) setCgpa(extractedReview.cgpa);

    const grades = extractedReview.spmGrades || {};
    if (grades['Mathematics']) setSpmMath(grades['Mathematics']);
    if (grades['Additional Mathematics']) setSpmAddMath(grades['Additional Mathematics']);
    if (grades['Bahasa Melayu']) setSpmBm(grades['Bahasa Melayu']);
    if (grades['English'] || grades['Bahasa Inggeris']) setSpmEng(grades['English'] || grades['Bahasa Inggeris']);

    setIsAutofillOpen(false);
    setExtractedReview(null);
    setTranscriptText('');
  };

  return (
    <div className="space-y-6">
      {/* Magic Autofill Trigger Card */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="font-sans text-base font-bold text-slate-900">
              Magic Autofill from Transcript
            </h3>
            <p className="text-xs text-slate-600 font-normal">
              Paste or upload your SPM result slip or transcript to extract your CGPA and grades automatically.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAutofillOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 shadow-2xs cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Launch Autofill</span>
        </button>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-sans text-xl font-black text-slate-950 tracking-tight">
            Academic Credentials &amp; Demographics
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Confirmed profile fields used by the deterministic eligibility evaluation engine.
          </p>
        </div>

        {/* Status Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Citizenship Status</label>
            <select
              name="citizenship"
              value={citizenship}
              onChange={(e) => setCitizenship(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="Malaysian">Malaysian (Warganegara)</option>
              <option value="Permanent Resident">Permanent Resident (PR)</option>
              <option value="Non-Malaysian">Non-Malaysian</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Bumiputera Status</label>
            <select
              name="bumiputeraStatus"
              value={bumiputeraStatus}
              onChange={(e) => setBumiputeraStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="true">Yes (Bumiputera)</option>
              <option value="false">No (Non-Bumiputera)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Household Income Band</label>
            <select
              name="incomeBand"
              value={incomeBand}
              onChange={(e) => setIncomeBand(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            >
              <option value="B40">B40 (Below RM 5,250)</option>
              <option value="M40">M40 (RM 5,250 - RM 11,819)</option>
              <option value="T20">T20 (Above RM 11,819)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Current Tertiary CGPA (PNGK)</label>
            <input
              name="cgpa"
              type="number"
              step="0.01"
              min="0.00"
              max="4.00"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              placeholder="e.g. 3.75"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* SPM Subjects */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-sans text-base font-bold text-slate-900">
              Verified SPM Subject Grades
            </h4>
            <span className="text-xs text-slate-400 font-medium">Used for deterministic matching</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Bahasa Melayu</label>
              <select
                name="spm_bm"
                value={spmBm}
                onChange={(e) => setSpmBm(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">English</label>
              <select
                name="spm_eng"
                value={spmEng}
                onChange={(e) => setSpmEng(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Mathematics</label>
              <select
                name="spm_math"
                value={spmMath}
                onChange={(e) => setSpmMath(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Additional Mathematics</label>
              <select
                name="spm_addmath"
                value={spmAddMath}
                onChange={(e) => setSpmAddMath(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            Saves directly to your authoritative academic profile.
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Authoritative Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Magic Autofill Review Modal */}
      {isAutofillOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">
                  Document Magic Autofill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAutofillOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Paste the text from your academic transcript or SPM result slip below. Extracted fields will be presented on a review screen before anything is confirmed into your profile.
            </p>

            <textarea
              rows={6}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="e.g. KEPUTUSAN PEPERIKSAAN SPM&#10;BAHASA MELAYU: A+&#10;BAHASA INGGERIS: A&#10;MATEMATIK: A+&#10;MATEMATIK TAMBAHAN: A-&#10;PNGK / CGPA: 3.82"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-y"
            />

            {/* Extracted Review State */}
            {extractedReview && (
              <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-950">Extracted Credentials Review</span>
                  <span className="text-[11px] font-mono font-semibold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                    Confidence: {(extractedReview.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-1 text-slate-800">
                  {extractedReview.cgpa && (
                    <p><strong>CGPA:</strong> {extractedReview.cgpa}</p>
                  )}
                  {extractedReview.spmGrades && Object.keys(extractedReview.spmGrades).length > 0 && (
                    <div>
                      <strong>Extracted SPM Grades:</strong>
                      <div className="grid grid-cols-2 gap-1 mt-1 text-[11px]">
                        {Object.entries(extractedReview.spmGrades).map(([sub, gr]: any) => (
                          <span key={sub} className="bg-white p-1 rounded border border-amber-200">
                            {sub}: <strong>{gr}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-amber-900 italic">
                  Inspect these fields carefully. Clicking &ldquo;Confirm &amp; Apply&rdquo; will populate the profile form above for final review.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAutofillOpen(false)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {!extractedReview ? (
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={isExtracting || !transcriptText.trim()}
                  className="px-4 py-2 bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isExtracting ? 'Extracting Credentials...' : 'Parse Document Text'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyExtracted}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Apply to Form</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
