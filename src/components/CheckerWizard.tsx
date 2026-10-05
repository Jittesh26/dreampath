'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RequirementNode } from '@/domain/schema';
import { StudentProfile, SPMGrade } from '@/domain/registry';
import {
  extractRequiredFields,
  extractManualVerificationFields,
  extractDetailedCriteria,
} from '@/domain/astUtils';
import { evaluateEligibility, EvaluationResult, evaluateEligibility as evaluateNode } from '@/domain/evaluator';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sliders,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';
import { StatusBadge } from '@/components/design-system';

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
  const refDate = useMemo(() => (referenceDate ? new Date(referenceDate) : new Date()), [referenceDate]);

  // Extract fields and criteria strictly from this scholarship's verified AST
  const requiredFields = useMemo(() => extractRequiredFields(ruleAst), [ruleAst]);
  const manualFields = useMemo(() => extractManualVerificationFields(ruleAst), [ruleAst]);
  const detailedCriteria = useMemo(() => extractDetailedCriteria(ruleAst), [ruleAst]);

  const needsCitizenship = useMemo(() => requiredFields.includes('citizenship'), [requiredFields]);
  const needsDob = useMemo(
    () =>
      requiredFields.includes('age') ||
      requiredFields.includes('date_of_birth') ||
      requiredFields.includes('dateOfBirth'),
    [requiredFields]
  );
  const needsCgpa = useMemo(() => requiredFields.includes('cgpa'), [requiredFields]);
  const needsIncomeBand = useMemo(
    () => requiredFields.includes('income_band') || requiredFields.includes('incomeBand'),
    [requiredFields]
  );
  const needsHouseholdIncome = useMemo(
    () => requiredFields.includes('household_income') || requiredFields.includes('householdIncome'),
    [requiredFields]
  );
  const needsBumiputera = useMemo(
    () => requiredFields.includes('bumiputera_status') || requiredFields.includes('bumiputeraStatus'),
    [requiredFields]
  );
  const spmSubjects = useMemo(() => {
    return requiredFields
      .filter((f) => f.startsWith('spm_results.'))
      .map((f) => f.replace('spm_results.', ''));
  }, [requiredFields]);

  const hasMachineCheckableQuestions =
    needsCitizenship ||
    needsDob ||
    needsCgpa ||
    needsIncomeBand ||
    needsHouseholdIncome ||
    needsBumiputera ||
    spmSubjects.length > 0;

  const hasManualVerification = manualFields.length > 0;

  // Initialize student profile facts strictly based on required questions
  const [profile, setProfile] = useState<Partial<StudentProfile>>(() => {
    const initial: Partial<StudentProfile> = {};
    if (needsCitizenship) initial.citizenship = 'Malaysian';
    if (needsBumiputera) initial.bumiputera_status = true;
    if (needsIncomeBand) initial.income_band = 'B40';
    if (needsHouseholdIncome) initial.household_income = 3500;
    if (needsCgpa) initial.cgpa = 3.50;
    if (needsDob) initial.date_of_birth = '2007-03-15';
    if (spmSubjects.length > 0) {
      initial.spm_results = {};
      for (const sub of spmSubjects) {
        initial.spm_results[sub] = 'A';
      }
    }
    return initial;
  });

  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Future / What-If Simulation State
  const [simCgpa, setSimCgpa] = useState<number>(3.50);
  const [simIncomeBand, setSimIncomeBand] = useState<string>('M40');
  const [showSimulator, setShowSimulator] = useState(false);
  const [simResult, setSimResult] = useState<EvaluationResult | null>(null);

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
    }, 200);
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

  // Evaluate each individual criterion to produce a granular, transparent audit
  const detailedAudit = useMemo(() => {
    if (!result) return [];

    return detailedCriteria.map((crit) => {
      const critResult = evaluateNode(
        profile as StudentProfile,
        {
          id: `${scholarshipId}_${crit.id}`,
          name: crit.label,
          rootNode: crit.node,
        },
        refDate
      );

      if (critResult.status === 'MET') {
        return {
          ...crit,
          status: 'MET' as const,
          badgeStatus: 'eligible' as const,
          badgeLabel: 'Criteria Met',
          message: 'Criterion satisfied based on your provided information.',
        };
      }

      if (critResult.status === 'NOT_MET') {
        return {
          ...crit,
          status: 'NOT_MET' as const,
          badgeStatus: 'ineligible' as const,
          badgeLabel: 'Criteria Unmet',
          message: critResult.reasons[0]?.message || 'Requirement not met.',
        };
      }

      // MISSING_INFO
      const hasUncheckable = critResult.reasons.some((r) => r.code === 'NOT_MACHINE_CHECKABLE');
      if (hasUncheckable || !crit.isMachineCheckable) {
        return {
          ...crit,
          status: 'MANUAL_VERIFICATION' as const,
          badgeStatus: 'manual-verification' as const,
          badgeLabel: 'Manual Verification Required',
          message:
            'This scholarship includes an assessment-centre or circular requirement that DreamPath cannot verify automatically. Please check the official scholarship announcement.',
        };
      }

      return {
        ...crit,
        status: 'MISSING_INFO' as const,
        badgeStatus: 'missing-info' as const,
        badgeLabel: 'Missing Information',
        message: critResult.reasons[0]?.message || 'Please provide this information in the form above.',
      };
    });
  }, [result, detailedCriteria, profile, scholarshipId, refDate]);

  // Distinguish overall status semantics
  const hasHardFailures = result?.status === 'NOT_MET';
  const hasMissingInputReasons = result?.reasons.some((r) => r.code === 'MISSING_INPUT');
  const onlyManualCriteriaPending =
    result?.status === 'MISSING_INFO' && !hasMissingInputReasons && hasManualVerification;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Wizard Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 uppercase tracking-wider font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Deterministic Eligibility Engine</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Scholarship-Specific Audit</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight font-sans">
          Eligibility Evaluation: {scholarshipName}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-normal">
          Provide only the specific academic and personal profile facts required by this scholarship. Our deterministic engine checks your answers directly against the verified requirement AST without probabilistic guessing.
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleRunEvaluation} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] font-sans">
                Information needed for this scholarship
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {hasMachineCheckableQuestions
                  ? `Only parameters required by the ${scholarshipName} eligibility charter are requested below.`
                  : 'No additional information is required.'}
              </p>
            </div>
            {hasManualVerification && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/80 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Some requirements require manual verification</span>
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Fields Grid - only display fields required by this scholarship */}
        {hasMachineCheckableQuestions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* Citizenship */}
            {needsCitizenship && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Citizenship Status</label>
                <select
                  value={profile.citizenship || 'Malaysian'}
                  onChange={(e) => handleTextChange('citizenship', e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-sm cursor-pointer"
                >
                  <option value="Malaysian">Malaysian (Warganegara)</option>
                  <option value="Permanent Resident">Permanent Resident (PR)</option>
                  <option value="Non-Malaysian">International / Non-Malaysian</option>
                </select>
              </div>
            )}

            {/* Date of Birth for age derivation */}
            {needsDob && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Date of Birth</label>
                <input
                  type="date"
                  value={profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : '2007-03-15'}
                  onChange={(e) => handleTextChange('date_of_birth', e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-sm"
                />
                <span className="text-[11px] text-slate-400">
                  Used to evaluate age limits as of the scholarship intake year.
                </span>
              </div>
            )}

            {/* CGPA */}
            {needsCgpa && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Current Cumulative GPA / PNGK (0.00 - 4.00)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="4.00"
                  value={profile.cgpa ?? ''}
                  onChange={(e) => handleNumberChange('cgpa', e.target.value)}
                  placeholder="e.g. 3.75"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-sm"
                />
              </div>
            )}

            {/* Household Income Band */}
            {needsIncomeBand && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Household Income Tier (LHDN Definition)</label>
                <select
                  value={profile.income_band || 'B40'}
                  onChange={(e) => handleTextChange('income_band', e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-sm cursor-pointer"
                >
                  <option value="B40">B40 Tier (Gross Household &lt; RM 5,250/mo)</option>
                  <option value="M40">M40 Tier (RM 5,250 - RM 11,819/mo)</option>
                  <option value="T20">T20 Tier (Gross Household &gt; RM 11,820/mo)</option>
                </select>
              </div>
            )}

            {/* Monthly Household Income in RM */}
            {needsHouseholdIncome && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Monthly Household Income (RM)</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={profile.household_income ?? ''}
                  onChange={(e) => handleNumberChange('household_income', e.target.value)}
                  placeholder="e.g. 3500"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-sm"
                />
              </div>
            )}

            {/* Bumiputera Status */}
            {needsBumiputera && (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700 block">Bumiputera Status</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="radio"
                      name="bumiputera"
                      checked={profile.bumiputera_status === true}
                      onChange={() => setProfile((p) => ({ ...p, bumiputera_status: true }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Yes (Bumiputera)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="radio"
                      name="bumiputera"
                      checked={profile.bumiputera_status === false}
                      onChange={() => setProfile((p) => ({ ...p, bumiputera_status: false }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>No (Non-Bumiputera)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-800 font-bold text-sm">
              <FileCheck2 className="w-4 h-4 text-blue-700" />
              <span>No additional information is required.</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {hasManualVerification
                ? 'All criteria for this scholarship are evaluated through official provider circulars or external application milestones.'
                : 'All criteria for this scholarship are machine-verified without requiring additional inputs.'}
            </p>
          </div>
        )}

        {/* Required SPM Subject Grades (Only rendered when the scholarship explicitly specifies SPM criteria) */}
        {spmSubjects.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-base font-bold text-[#0F172A] font-sans">
              Required SPM Subject Grades
            </h4>
            <p className="text-xs text-slate-500">
              This scholarship specifically mandates minimum grades for the following subjects:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {spmSubjects.map((sub: string) => (
                <div key={sub} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <label className="font-semibold text-slate-800 block">SPM {sub}</label>
                  <select
                    value={profile.spm_results?.[sub] || 'A'}
                    onChange={(e) => handleSpmChange(sub, e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/30"
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
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium">
            Evaluation is executed deterministically against verified provider rules.
          </p>
          <button
            type="submit"
            disabled={isEvaluating}
            className="w-full sm:w-auto px-6 py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md cursor-pointer min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isEvaluating ? 'Evaluating Rules...' : 'Run Deterministic Check'}</span>
          </button>
        </div>
      </form>

      {/* Evaluation Results Display with Criteria Audit Breakdown */}
      {result && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in duration-200">
          {/* Result Banner */}
          {result.status === 'MET' && (
            <div className="p-6 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-emerald-950 font-sans tracking-tight">
                  Fully Eligible Based on Official Requirements
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-normal">
                  Your academic profile satisfies all machine-checkable criteria verified for {scholarshipName}.
                </p>
              </div>
            </div>
          )}

          {hasHardFailures && (
            <div className="p-6 bg-rose-50/90 border border-rose-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-rose-950 font-sans tracking-tight">
                  Requirements Not Satisfied
                </h3>
                <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-normal">
                  One or more verified criteria were not satisfied by your inputs. Review the criteria audit breakdown below.
                </p>
              </div>
            </div>
          )}

          {onlyManualCriteriaPending && (
            <div className="p-6 bg-blue-50/90 border border-blue-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-blue-950 font-sans tracking-tight">
                  Eligible (Manual Verification Required)
                </h3>
                <p className="text-xs sm:text-sm text-blue-800 leading-relaxed font-normal">
                  Your profile meets all automated criteria. This scholarship also requires participation in provider selection stages (such as assessment centres or circular reviews) that must be verified directly with the provider.
                </p>
              </div>
            </div>
          )}

          {result.status === 'MISSING_INFO' && hasMissingInputReasons && (
            <div className="p-6 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-amber-950 font-sans tracking-tight">
                  More Information Required
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed font-normal">
                  Some required fields were left empty. Please fill them in above to complete your evaluation.
                </p>
              </div>
            </div>
          )}

          {/* Criteria Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-[#0F172A] font-sans">
                Deterministic Criteria Audit Breakdown
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {detailedAudit.length} {detailedAudit.length === 1 ? 'Rule' : 'Rules'} Modeled
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
              {detailedAudit.map((crit) => (
                <div
                  key={crit.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    crit.status === 'MET'
                      ? 'bg-emerald-50/20'
                      : crit.status === 'NOT_MET'
                      ? 'bg-rose-50/30'
                      : crit.status === 'MANUAL_VERIFICATION'
                      ? 'bg-blue-50/25'
                      : 'bg-amber-50/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        {crit.label}
                      </span>
                      {!crit.isMachineCheckable && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100/70 text-blue-800 rounded">
                          External / Assessment
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {crit.description}
                    </p>
                    {crit.status === 'NOT_MET' && (
                      <p className="text-rose-700 font-semibold pt-0.5">
                        {crit.message}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={crit.badgeStatus} label={crit.badgeLabel} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Future / What-If Scenario Simulator (Only if scholarship evaluates CGPA or Income Band) */}
          {(needsCgpa || needsIncomeBand) && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-700" />
                  <h4 className="text-lg font-bold text-[#0F172A] font-sans">
                    What-If Scenario Simulator
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSimulator(!showSimulator);
                    if (!showSimulator) handleRunSimulation(simCgpa, simIncomeBand);
                  }}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  {showSimulator ? 'Hide Simulator' : 'Simulate Scenarios →'}
                </button>
              </div>

              {showSimulator && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5 animate-in fade-in duration-150">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Simulate how adjustments in your qualifications affect this specific scholarship&rsquo;s eligibility rules.
                  </p>

                  {/* Simulation Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {needsCgpa && (
                      <div className="space-y-2">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Simulated CGPA:</span>
                          <span className="text-blue-700 font-bold text-sm">{simCgpa.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="2.00"
                          max="4.00"
                          step="0.05"
                          value={simCgpa}
                          onChange={(e) => handleRunSimulation(parseFloat(e.target.value), simIncomeBand)}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    )}

                    {needsIncomeBand && (
                      <div className="space-y-2">
                        <span className="font-semibold text-slate-800 block">Simulated Income Band:</span>
                        <select
                          value={simIncomeBand}
                          onChange={(e) => handleRunSimulation(simCgpa, e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
                        >
                          <option value="B40">B40 (Below RM 5,250)</option>
                          <option value="M40">M40 (RM 5,250 - RM 11,819)</option>
                          <option value="T20">T20 (Above RM 11,819)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Simulation Output */}
                  {simResult && (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          Simulated Parameters: {needsCgpa ? `CGPA ${simCgpa.toFixed(2)}` : ''} {needsIncomeBand ? `(${simIncomeBand})` : ''}
                        </span>
                        <StatusBadge
                          status={
                            simResult.status === 'MET'
                              ? 'eligible'
                              : simResult.status === 'NOT_MET'
                              ? 'ineligible'
                              : 'missing-info'
                          }
                          label={
                            simResult.status === 'MET'
                              ? 'Eligible'
                              : simResult.status === 'NOT_MET'
                              ? 'Requirements Unmet'
                              : 'Pending Verification'
                          }
                          size="sm"
                        />
                      </div>
                      <p className="text-slate-600">
                        {simResult.status === 'MET'
                          ? 'Under this simulation, all machine-checkable criteria for this scholarship are satisfied.'
                          : 'Requirements remain unsatisfied under this simulated parameter set.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action to Save or Return */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href={`/scholarships/${scholarshipId}`}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              &larr; Return to Scholarship Overview
            </Link>

            <Link
              href="/register"
              className="px-6 py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
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
