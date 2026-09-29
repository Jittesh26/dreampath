'use client';

import React, { useState } from 'react';
import { ResumeContent } from '@/domain/resume';
import { Sparkles, X, Loader2, Award } from 'lucide-react';

interface ScholarshipTailoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ResumeContent;
  onApplySuggestions?: (updatedContent: ResumeContent) => void;
}

const TARGET_SCHOLARSHIPS = [
  {
    name: 'Gamuda Scholarship',
    provider: 'Gamuda Berhad',
    focus: 'Infrastructure, environmental engineering, building information modeling (BIM), project leadership, community sustainability.',
  },
  {
    name: 'Petronas Education Sponsorship (PESP)',
    provider: 'PETRONAS',
    focus: 'Energy transition, digital analytics, engineering excellence, resilience, team adaptability.',
  },
  {
    name: 'Yayasan Khazanah Global / Watan',
    provider: 'Yayasan Khazanah',
    focus: 'High-impact nation building, critical thinking, global perspective, strategic leadership.',
  },
  {
    name: 'Bank Negara Malaysia Kijang Scholarship',
    provider: 'Bank Negara Malaysia',
    focus: 'Macroeconomics, quantitative finance, regulatory technology, ethical leadership.',
  },
  {
    name: 'Yayasan TM (YTM) Future Leaders',
    provider: 'Telekom Malaysia',
    focus: 'Telecommunications, artificial intelligence, cloud infrastructure, digital marketing.',
  },
];

export function ScholarshipTailoringModal({
  isOpen,
  onClose,
  content,
}: ScholarshipTailoringModalProps) {
  const [selectedScholarship, setSelectedScholarship] = useState(TARGET_SCHOLARSHIPS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [tailoringAdvice, setTailoringAdvice] = useState<any>(null);

  const handleRunTailoring = () => {
    setIsLoading(true);

    setTimeout(() => {
      // Deterministically analyze existing confirmed facts and generate tailored advice
      const projs = content.projects || [];
      const exps = content.experience || [];

      const topExperience = exps.length > 0 ? exps[0].position || 'work experience' : 'co-curricular projects';
      const topProject = projs.length > 0 ? projs[0].name || 'recent project' : 'academic projects';

      setTailoringAdvice({
        target: selectedScholarship.name,
        provider: selectedScholarship.provider,
        prioritySections: ['Education & SPM Breakdown', 'Projects & Practical Initiatives', 'Technical & Tool Competencies'],
        experienceHighlight: `Lead with your role in "${topExperience}". For ${selectedScholarship.provider}, emphasize how this demonstrates problem-solving and reliability.`,
        projectHighlight: `Feature "${topProject}" prominently. Explicitly mention the tools used and any measurable results or team coordination.`,
        recommendedWordingShift: `Align phrasing with ${selectedScholarship.name}'s focus on ${selectedScholarship.focus}. Rephrase passive statements into active impact verbs (e.g. "Spearheaded", "Engineered", "Coordinated").`,
        disclaimer: 'This tailoring review strictly analyzes your existing confirmed facts. No fake credentials or qualifications were added.',
      });
      setIsLoading(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif text-xl font-bold text-[#0B1B3D]">
              Tailor Resume for Specific Scholarship
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Select an official scholarship intake. The tailoring engine inspects your verified resume facts and suggests structural emphasis aligning with the provider&rsquo;s core values.
        </p>

        {/* Scholarship Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase block">
            Target Scholarship:
          </label>
          <select
            value={selectedScholarship.name}
            onChange={(e) => {
              const found = TARGET_SCHOLARSHIPS.find((s) => s.name === e.target.value);
              if (found) {
                setSelectedScholarship(found);
                setTailoringAdvice(null);
              }
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
          >
            {TARGET_SCHOLARSHIPS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.provider})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 italic mt-1">
            Focus: {selectedScholarship.focus}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleRunTailoring}
            disabled={isLoading}
            className="w-full py-2.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            <span>Analyze & Generate Tailored Recommendations</span>
          </button>
        </div>

        {/* Tailored Output */}
        {tailoringAdvice && (
          <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3.5 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <Award className="w-4 h-4 text-amber-800" />
              <span>Tailoring Strategy for {tailoringAdvice.target}</span>
            </div>

            <div className="space-y-2 text-slate-800">
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <strong className="text-slate-900 block text-[11px] uppercase mb-0.5">
                  1. Experience Reordering:
                </strong>
                <p>{tailoringAdvice.experienceHighlight}</p>
              </div>

              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <strong className="text-slate-900 block text-[11px] uppercase mb-0.5">
                  2. Project Highlighting:
                </strong>
                <p>{tailoringAdvice.projectHighlight}</p>
              </div>

              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <strong className="text-slate-900 block text-[11px] uppercase mb-0.5">
                  3. Action Verbs & Tone Alignment:
                </strong>
                <p>{tailoringAdvice.recommendedWordingShift}</p>
              </div>
            </div>

            <p className="text-[10px] text-amber-800 italic pt-1">
              {tailoringAdvice.disclaimer}
            </p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
