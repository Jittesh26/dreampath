'use client';

import React, { useState } from 'react';
import { updateStudentProfile } from '@/app/actions/student';
import { Sparkles, CheckCircle2, Upload, Loader2, X } from 'lucide-react';

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
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-600 text-white rounded-lg shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">
              Magic Autofill from Transcript
            </h3>
            <p className="text-xs text-slate-600">
              Paste or upload your SPM result slip or transcript to extract your CGPA and grades automatically.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAutofillOpen(true)}
          className="px-3.5 py-2 bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Launch Autofill</span>
        </button>
      </div>

      {/* Main Profile Form */}
      <form action={updateStudentProfile} className="bg-white border border-slate-200/90 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-serif text-xl font-bold text-[#0B1B3D]">
            Academic Credentials &amp; Demographics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed profile fields used by the deterministic eligibility evaluation engine.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Citizenship Status</label>
            <select
              name="citizenship"
              value={citizenship}
              onChange={(e) => setCitizenship(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
            >
              <option value="Malaysian">Malaysian (Warganegara)</option>
              <option value="Permanent Resident">Permanent Resident (PR)</option>
              <option value="Non-Malaysian">Non-Malaysian</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Bumiputera Status</label>
            <select
              name="bumiputeraStatus"
              value={bumiputeraStatus}
              onChange={(e) => setBumiputeraStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
            >
              <option value="true">Yes (Bumiputera)</option>
              <option value="false">No (Non-Bumiputera)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Household Income Band</label>
            <select
              name="incomeBand"
              value={incomeBand}
              onChange={(e) => setIncomeBand(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
            >
              <option value="B40">B40 (Below RM 5,250)</option>
              <option value="M40">M40 (RM 5,250 - RM 11,819)</option>
              <option value="T20">T20 (Above RM 11,819)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Current Tertiary CGPA (PNGK)</label>
            <input
              name="cgpa"
              type="number"
              step="0.01"
              min="0.00"
              max="4.00"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              placeholder="e.g. 3.75"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white"
            />
          </div>
        </div>

        {/* SPM Subjects */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg font-bold text-[#0B1B3D]">
              Verified SPM Subject Grades
            </h4>
            <span className="text-xs text-slate-400">Used for deterministic matching</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Bahasa Melayu</label>
              <select
                name="spm_bm"
                value={spmBm}
                onChange={(e) => setSpmBm(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">English</label>
              <select
                name="spm_eng"
                value={spmEng}
                onChange={(e) => setSpmEng(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Mathematics</label>
              <select
                name="spm_math"
                value={spmMath}
                onChange={(e) => setSpmMath(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                <option value="">Select Grade</option>
                {SPM_GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Additional Mathematics</label>
              <select
                name="spm_addmath"
                value={spmAddMath}
                onChange={(e) => setSpmAddMath(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
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
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Save Authoritative Profile
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
