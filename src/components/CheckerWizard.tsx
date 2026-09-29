'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RequirementNode } from '@/domain/schema';
import { StudentProfile, SPMGrade } from '@/domain/registry';
import { extractRequiredFields } from '@/domain/astUtils';
import { evaluateEligibility, EvaluationResult } from '@/domain/evaluator';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sliders,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface CheckerWizardProps {
  scholarshipId: string;
  scholarshipName: string;
  ruleAst: RequirementNode;
  referenceDate?: string;
}

const SPM_GRADES: SPMGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

export function CheckerWizard({
  scholarshipId,
  scholarshipName,
  ruleAst,
  referenceDate,
}: CheckerWizardProps) {
  const [profile, setProfile] = useState<Partial<StudentProfile>>({
    citizenship: 'Malaysian',
    bumiputera_status: false,
    income_band: 'M40',
    cgpa: 3.50,
  });
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Future / What-If Simulation State
  const [simCgpa, setSimCgpa] = useState<number>(3.50);
  const [simIncomeBand, setSimIncomeBand] = useState<string>('M40');
  const [showSimulator, setShowSimulator] = useState(false);
  const [simResult, setSimResult] = useState<EvaluationResult | null>(null);

  const refDate = useMemo(() => (referenceDate ? new Date(referenceDate) : new Date()), [referenceDate]);

  // Extract exactly what we need to ask
  const requiredFields = useMemo(() => extractRequiredFields(ruleAst), [ruleAst]);
  const spmSubjects = useMemo(() => {
    return requiredFields
      .filter((f) => f.startsWith('spm_results.'))
      .map((f) => f.replace('spm_results.', ''));
  }, [requiredFields]);

  const handleTextChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value ? Number(value) : undefined }));
  };

  const handleSpmChange = (subject: string, grade: string) => {
    setProfile((prev) => ({
      ...prev,
      spm_results: {
        ...(prev.spm_results || {}),
        [subject]: grade as SPMGrade,
      },
    }));
  };

  const handleRunEvaluation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsEvaluating(true);

    setTimeout(() => {
      const evalResult = evaluateEligibility(
        profile as StudentProfile,
        {
          id: scholarshipId,
          name: scholarshipName,
          rootNode: ruleAst,
        },
        refDate
      );
      setResult(evalResult);
      if (profile.cgpa) setSimCgpa(Number(profile.cgpa));
      if (profile.income_band) setSimIncomeBand(profile.income_band);
      setIsEvaluating(false);
    }, 250);
  };

  const handleRunSimulation = (newCgpa: number, newIncome: string) => {
    setSimCgpa(newCgpa);
    setSimIncomeBand(newIncome);

    const simulatedProfile: StudentProfile = {
      ...(profile as StudentProfile),
      cgpa: newCgpa,
      income_band: newIncome as any,
    };

    const evaluated = evaluateEligibility(
      simulatedProfile,
      {
        id: scholarshipId,
        name: scholarshipName,
        rootNode: ruleAst,
      },
      refDate
    );
    setSimResult(evaluated);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Wizard Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Deterministic Eligibility Engine</span>
          <span aria-hidden="true">·</span>
          <span>Zero AI Speculation</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1B3D]">
          Check Eligibility for {scholarshipName}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Provide your current academic and personal profile. Our engine checks your facts directly against the provider&rsquo;s verified AST rules.
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleRunEvaluation} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="font-serif text-lg font-bold text-[#0B1B3D] border-b border-slate-100 pb-3">
          1. Student Qualifications & Background
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* Citizenship */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Citizenship</label>
            <select
              value={profile.citizenship || 'Malaysian'}
              onChange={(e) => handleTextChange('citizenship', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            >
              <option value="Malaysian">Malaysian (Warganegara)</option>
              <option value="Permanent Resident">Permanent Resident (PR)</option>
              <option value="International">International</option>
            </select>
          </div>

          {/* Date of Birth for strict age derivation */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Date of Birth (For Age Derivation)</label>
            <input
              type="date"
              value={profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : '2006-05-15'}
              onChange={(e) => handleTextChange('date_of_birth', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
            <span className="text-[10px] text-slate-400">
              Age is derived from DOB + intake reference date.
            </span>
          </div>

          {/* CGPA */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Current CGPA / PNGK (0.00 - 4.00)</label>
            <input
              type="number"
              step="0.01"
              min="0.00"
              max="4.00"
              value={profile.cgpa ?? ''}
              onChange={(e) => handleNumberChange('cgpa', e.target.value)}
              placeholder="e.g. 3.75"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>

          {/* Household Income Band */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Household Income Band</label>
            <select
              value={profile.income_band || 'M40'}
              onChange={(e) => handleTextChange('income_band', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            >
              <option value="B40">B40 (Below RM 5,250)</option>
              <option value="M40">M40 (RM 5,250 - RM 11,819)</option>
              <option value="T20">T20 (Above RM 11,819)</option>
            </select>
          </div>

          {/* Bumiputera Status */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="font-semibold text-slate-700 block">Bumiputera Status</label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="bumiputera"
                  checked={profile.bumiputera_status === true}
                  onChange={() => setProfile((p) => ({ ...p, bumiputera_status: true }))}
                  className="text-amber-800 focus:ring-amber-700"
                />
                <span>Yes (Bumiputera)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="bumiputera"
                  checked={profile.bumiputera_status === false}
                  onChange={() => setProfile((p) => ({ ...p, bumiputera_status: false }))}
                  className="text-amber-800 focus:ring-amber-700"
                />
                <span>No (Non-Bumiputera)</span>
              </label>
            </div>
          </div>
        </div>

        {/* SPM Subjects Section if required */}
        {spmSubjects.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="font-serif text-base font-bold text-[#0B1B3D]">
              Required SPM Subject Grades
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {spmSubjects.map((sub: string) => (
                <div key={sub} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <label className="font-semibold text-slate-800 block">{sub}</label>
                  <select
                    value={profile.spm_results?.[sub] || 'A'}
                    onChange={(e) => handleSpmChange(sub, e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                  >
                    {SPM_GRADES.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Check Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Results are computed client-side using deterministic logic.
          </p>
          <button
            type="submit"
            disabled={isEvaluating}
            className="px-6 py-3 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isEvaluating ? 'Evaluating Rules...' : 'Run Deterministic Check'}</span>
          </button>
        </div>
      </form>

      {/* Evaluation Results Display with "Why Not?" & What-If Simulator */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in duration-200">
          
          {/* Result Banner */}
          {result.status === 'MET' && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-emerald-950">
                  Fully Eligible Based on Listed Requirements
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your profile satisfies all machine-checkable criteria verified for {scholarshipName}.
                </p>
              </div>
            </div>
          )}

          {result.status === 'NOT_MET' && (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-rose-950">
                  Requirements Not Satisfied
                </h3>
                <p className="text-xs text-rose-800 leading-relaxed">
                  One or more verified criteria were not met. Inspect the exact breakdown below.
                </p>
              </div>
            </div>
          )}

          {result.status === 'MISSING_INFO' && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-amber-950">
                  More Information Required
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Some required fields were left empty. Please fill them in above.
                </p>
              </div>
            </div>
          )}

          {/* "Why Not?" Transparent Breakdown */}
          <div className="space-y-3">
            <h4 className="font-serif text-lg font-bold text-[#0B1B3D]">
              Deterministic Criteria Audit
            </h4>
            
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {result.reasons.length === 0 ? (
                <div className="p-4 bg-emerald-50/50 flex items-center justify-between">
                  <span className="font-medium text-emerald-900">All machine-checkable requirements satisfied</span>
                  <span className="font-bold text-emerald-700 uppercase">Passed</span>
                </div>
              ) : (
                result.reasons.map((r, i) => (
                  <div key={i} className="p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Criterion: {r.field?.replace('spm_results.', 'SPM Subject: ') || 'Requirement'}
                      </span>
                      <span className="text-slate-600">{r.message}</span>
                    </div>
                    <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded font-bold uppercase shrink-0 text-center">
                      Not Satisfied
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Future / What-If Scenario Simulator */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-700" />
                <h4 className="font-serif text-lg font-bold text-[#0B1B3D]">
                  Future / What-If Scenario Simulator
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSimulator(!showSimulator);
                  if (!showSimulator) handleRunSimulation(simCgpa, simIncomeBand);
                }}
                className="text-xs font-semibold text-amber-800 hover:underline"
              >
                {showSimulator ? 'Hide Simulator' : 'Simulate Scenarios &rarr;'}
              </button>
            </div>

            {showSimulator && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5 animate-in fade-in duration-150">
                <p className="text-xs text-slate-600">
                  Simulate what would happen if your grades or qualifications change next semester. Calculates which criteria flip from failed to satisfied.
                </p>

                {/* Simulation Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>Simulated CGPA:</span>
                      <span className="text-amber-800 font-bold text-sm">{simCgpa.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="2.00"
                      max="4.00"
                      step="0.05"
                      value={simCgpa}
                      onChange={(e) => handleRunSimulation(parseFloat(e.target.value), simIncomeBand)}
                      className="w-full accent-amber-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold text-slate-800 block">Simulated Income Band:</span>
                    <select
                      value={simIncomeBand}
                      onChange={(e) => handleRunSimulation(simCgpa, e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    >
                      <option value="B40">B40 (Below RM 5,250)</option>
                      <option value="M40">M40 (RM 5,250 - RM 11,819)</option>
                      <option value="T20">T20 (Above RM 11,819)</option>
                    </select>
                  </div>
                </div>

                {/* Simulation Output */}
                {simResult && (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        At CGPA {simCgpa.toFixed(2)} & {simIncomeBand}:
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          simResult.status === 'MET'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        Status: {simResult.status}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {simResult.status === 'MET'
                        ? 'At this academic benchmark, all listed requirements for this scholarship would be satisfied.'
                        : 'Some requirements still remain unsatisfied at this level.'}
                    </p>
                    <span className="text-[10px] text-slate-400 block pt-1 italic">
                      Deterministic calculation based on official rules. Not a guarantee or prediction of selection.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action to Save or Track */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href={`/scholarships/${scholarshipId}`}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              &larr; Return to Scholarship Overview
            </Link>

            <Link
              href="/register"
              className="px-5 py-2.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Save Result to Student Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
