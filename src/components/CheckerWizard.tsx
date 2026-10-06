'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RequirementNode, SelectionStage } from '@/domain/schema';
import { StudentProfile, SPMGrade } from '@/domain/registry';
import {
  extractRequiredFields,
  extractManualVerificationFields,
  extractDetailedCriteria,
  normalizeFieldName,
  isMachineCheckableField,
} from '@/domain/astUtils';
import { separateEligibilityAndSelection } from '@/domain/selection-process';
import { evaluateEligibility, EvaluationResult, evaluateEligibility as evaluateNode } from '@/domain/evaluator';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Clock,
} from 'lucide-react';
import { StatusBadge } from '@/components/design-system';

interface CheckerWizardProps {
  scholarshipId: string;
  scholarshipName: string;
  ruleAst: RequirementNode;
  selectionStages?: SelectionStage[];
  referenceDate?: string;
}

const SPM_GRADES: SPMGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

export interface CriterionFeedback {
  currentValueDisplay: string;
  requiredValueDisplay: string;
  gapDisplay?: string;
  explanation: string;
  isNumericGap?: boolean;
}

function computeCriterionFeedback(
  node: RequirementNode,
  profile: Partial<StudentProfile>,
  refDate: Date,
  status: 'MET' | 'NOT_MET' | 'MISSING_INFO' | 'MANUAL_VERIFICATION',
  critLabel: string,
  rawMessage?: string
): CriterionFeedback {
  if (node.type === 'CONDITION') {
    const { field, operator, value } = node;
    const norm = normalizeFieldName(field);

    // 1. CGPA
    if (norm === 'cgpa') {
      const current = profile.cgpa !== undefined && profile.cgpa !== null && !isNaN(Number(profile.cgpa))
        ? Number(profile.cgpa)
        : undefined;
      const required = Number(value);
      const currentStr = current !== undefined ? current.toFixed(2) : 'Not specified';
      const requiredStr = `${required.toFixed(2)} (minimum)`;

      if (current === undefined) {
        return {
          currentValueDisplay: 'Not specified',
          requiredValueDisplay: requiredStr,
          explanation: `Please enter your CGPA to evaluate this requirement (minimum ${required.toFixed(2)}).`,
        };
      }

      if (status === 'NOT_MET') {
        const gap = (required - current).toFixed(2);
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          gapDisplay: `${gap} (Need +${gap})`,
          isNumericGap: true,
          explanation: `You need at least ${required.toFixed(2)} CGPA to meet this requirement.`,
        };
      } else {
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          explanation: `Your CGPA (${currentStr}) meets the minimum requirement of ${required.toFixed(2)}.`,
        };
      }
    }

    // 2. AGE / DATE OF BIRTH
    if (norm === 'age') {
      let currentAge: number | undefined;
      if (profile.date_of_birth) {
        const dob = new Date(profile.date_of_birth);
        let age = refDate.getFullYear() - dob.getFullYear();
        const m = refDate.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && refDate.getDate() < dob.getDate())) {
          age--;
        }
        currentAge = age;
      } else if (typeof profile.age === 'number') {
        currentAge = profile.age;
      }

      const maxAge = Number(value);
      const currentStr = currentAge !== undefined ? `${currentAge} years old` : 'Not specified';
      const requiredStr = operator === 'LESS_THAN_OR_EQUAL'
        ? `At most ${maxAge} years old`
        : `At least ${maxAge} years old`;

      if (currentAge === undefined) {
        return {
          currentValueDisplay: 'Not specified',
          requiredValueDisplay: requiredStr,
          explanation: 'Please provide your date of birth to evaluate the age limit.',
        };
      }

      if (status === 'NOT_MET') {
        const diff = currentAge - maxAge;
        const gapDisplay = diff > 0 ? `${diff} ${diff === 1 ? 'year' : 'years'} over limit` : undefined;
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          gapDisplay,
          isNumericGap: true,
          explanation: `You must be at most ${maxAge} years old as of the reference date.`,
        };
      } else {
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          explanation: `Your age (${currentStr}) satisfies the requirement.`,
        };
      }
    }

    // 3. CITIZENSHIP
    if (norm === 'citizenship') {
      const current = profile.citizenship || 'Not specified';
      const required = String(value);

      if (status === 'NOT_MET') {
        return {
          currentValueDisplay: current,
          requiredValueDisplay: required,
          gapDisplay: 'Non-matching citizenship',
          explanation: `You must be a ${required} citizen to meet this requirement.`,
        };
      } else {
        return {
          currentValueDisplay: current,
          requiredValueDisplay: required,
          explanation: `Verified as ${current} citizen.`,
        };
      }
    }

    // 4. SPM SUBJECT GRADE
    if (operator === 'HAS_SPM_SUBJECT_GRADE') {
      const subject = value.subject;
      const minGrade = value.minGrade;
      const actualGrade = profile.spm_results?.[subject];
      const currentStr = actualGrade ? `Grade ${actualGrade}` : 'Not provided';
      const requiredStr = `Grade ${minGrade} (minimum)`;

      if (!actualGrade) {
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          explanation: `Please specify your SPM ${subject} grade.`,
        };
      }

      if (status === 'NOT_MET') {
        const gradeRank = SPM_GRADES.indexOf(actualGrade);
        const reqRank = SPM_GRADES.indexOf(minGrade);
        const diff = gradeRank >= 0 && reqRank >= 0 ? gradeRank - reqRank : undefined;
        const gapDisplay = diff && diff > 0
          ? `${diff} grade ${diff === 1 ? 'level' : 'levels'} below requirement`
          : 'Below minimum grade';

        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          gapDisplay,
          explanation: `You need at least grade ${minGrade} in SPM ${subject} to meet this requirement.`,
        };
      } else {
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          explanation: `Your grade (${actualGrade}) meets or exceeds the required grade ${minGrade}.`,
        };
      }
    }

    // 5. HOUSEHOLD INCOME BAND
    if (norm === 'income_band') {
      const current = profile.income_band || 'Not specified';
      const required = Array.isArray(value) ? value.join(' or ') : String(value);

      if (status === 'NOT_MET') {
        return {
          currentValueDisplay: current,
          requiredValueDisplay: `Tier ${required}`,
          gapDisplay: 'Different income tier',
          explanation: `Your household income tier must be ${required} to meet this requirement.`,
        };
      } else {
        return {
          currentValueDisplay: current,
          requiredValueDisplay: `Tier ${required}`,
          explanation: `Household income tier (${current}) meets the eligibility criteria.`,
        };
      }
    }

    // 6. HOUSEHOLD INCOME (RM AMOUNT)
    if (norm === 'household_income') {
      const current = profile.household_income !== undefined && profile.household_income !== null
        ? Number(profile.household_income)
        : undefined;
      const maxIncome = Number(value);
      const currentStr = current !== undefined ? `RM ${current.toLocaleString()}` : 'Not specified';
      const requiredStr = `RM ${maxIncome.toLocaleString()} (maximum)`;

      if (current === undefined) {
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          explanation: 'Please provide your monthly household income.',
        };
      }

      if (status === 'NOT_MET') {
        const diff = current - maxIncome;
        const gapDisplay = diff > 0 ? `RM ${diff.toLocaleString()} over limit` : undefined;
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          gapDisplay,
          isNumericGap: true,
          explanation: `Gross monthly household income must not exceed RM ${maxIncome.toLocaleString()} to meet this requirement.`,
        };
      } else {
        return {
          currentValueDisplay: currentStr,
          requiredValueDisplay: requiredStr,
          explanation: `Monthly household income (${currentStr}) is within the allowable limit.`,
        };
      }
    }

    // 7. BUMIPUTERA STATUS
    if (norm === 'bumiputera_status') {
      const current = profile.bumiputera_status === true ? 'Bumiputera' : profile.bumiputera_status === false ? 'Non-Bumiputera' : 'Not specified';
      const required = value ? 'Bumiputera' : 'Open / Non-Bumiputera';

      if (status === 'NOT_MET') {
        return {
          currentValueDisplay: current,
          requiredValueDisplay: required,
          gapDisplay: 'Status mismatch',
          explanation: value ? 'This scholarship requires Bumiputera status.' : 'Open to non-Bumiputera applicants.',
        };
      } else {
        return {
          currentValueDisplay: current,
          requiredValueDisplay: required,
          explanation: `Status verified as ${current}.`,
        };
      }
    }

    // 8. Other / Manual Verification
    if (!isMachineCheckableField(norm)) {
      return {
        currentValueDisplay: 'Manual Review Required',
        requiredValueDisplay: 'Official Documentation',
        explanation: 'This criterion requires manual verification of official provider documentation (e.g. proof of admission offer or financial statements).',
      };
    }

    // Generic fallback for any other condition
    const rawVal = (profile as any)[norm] ?? (profile as any)[field];
    return {
      currentValueDisplay: rawVal !== undefined ? String(rawVal) : 'Not specified',
      requiredValueDisplay: JSON.stringify(value),
      explanation: rawMessage || `Requirement on ${critLabel}.`,
    };
  }

  // Composite node fallback
  return {
    currentValueDisplay: 'Multiple profile factors',
    requiredValueDisplay: 'All criteria conditions',
    explanation: rawMessage || 'Criterion evaluated against your profile information.',
  };
}

export function CheckerWizard({
  scholarshipId,
  scholarshipName,
  ruleAst,
  selectionStages = [],
  referenceDate,
}: CheckerWizardProps) {
  const refDate = useMemo(() => (referenceDate ? new Date(referenceDate) : new Date()), [referenceDate]);

  // Architecturally separate eligibility criteria from post-application selection stages
  const { eligibilityAst, selectionStages: extractedStages } = useMemo(
    () => separateEligibilityAndSelection(ruleAst, selectionStages),
    [ruleAst, selectionStages]
  );

  const combinedSelectionStages = extractedStages;

  // Extract fields and criteria strictly from the ELIGIBILITY AST
  const requiredFields = useMemo(() => extractRequiredFields(eligibilityAst), [eligibilityAst]);
  const manualFields = useMemo(() => extractManualVerificationFields(eligibilityAst), [eligibilityAst]);
  const detailedCriteria = useMemo(() => extractDetailedCriteria(eligibilityAst), [eligibilityAst]);

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

  // Initialize student profile facts strictly based on required eligibility questions
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

  const [hasModifiedAfterEvaluation, setHasModifiedAfterEvaluation] = useState(false);

  const handleTextChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (result) setHasModifiedAfterEvaluation(true);
  };

  const handleNumberChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value ? Number(value) : undefined }));
    if (result) setHasModifiedAfterEvaluation(true);
  };

  const handleSpmChange = (subject: string, grade: string) => {
    setProfile((prev) => ({
      ...prev,
      spm_results: {
        ...(prev.spm_results || {}),
        [subject]: grade as SPMGrade,
      },
    }));
    if (result) setHasModifiedAfterEvaluation(true);
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
          rootNode: eligibilityAst,
        },
        refDate
      );
      setResult(evalResult);
      setHasModifiedAfterEvaluation(false);
      setIsEvaluating(false);
    }, 200);
  };

  // Evaluate each individual ELIGIBILITY criterion to produce an auditable breakdown
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
        const feedback = computeCriterionFeedback(
          crit.node,
          profile,
          refDate,
          'MET',
          crit.label,
          'Criterion satisfied based on your provided information.'
        );
        return {
          ...crit,
          status: 'MET' as const,
          badgeStatus: 'eligible' as const,
          badgeLabel: 'Criteria Met',
          message: 'Criterion satisfied based on your provided information.',
          feedback,
        };
      }

      if (critResult.status === 'NOT_MET') {
        const rawMessage = critResult.reasons[0]?.message || 'Requirement not met.';
        const feedback = computeCriterionFeedback(
          crit.node,
          profile,
          refDate,
          'NOT_MET',
          crit.label,
          rawMessage
        );
        return {
          ...crit,
          status: 'NOT_MET' as const,
          badgeStatus: 'ineligible' as const,
          badgeLabel: 'Criteria Not Met',
          message: rawMessage,
          feedback,
        };
      }

      // MISSING_INFO
      const hasUncheckable = critResult.reasons.some((r) => r.code === 'NOT_MACHINE_CHECKABLE');
      if (hasUncheckable || !crit.isMachineCheckable) {
        const feedback = computeCriterionFeedback(
          crit.node,
          profile,
          refDate,
          'MANUAL_VERIFICATION',
          crit.label,
          'This genuine eligibility criterion requires manual verification of official provider documentation.'
        );
        return {
          ...crit,
          status: 'MANUAL_VERIFICATION' as const,
          badgeStatus: 'manual-verification' as const,
          badgeLabel: 'Manual Verification Required',
          message:
            'This genuine eligibility criterion requires manual verification of official provider documentation.',
          feedback,
        };
      }

      const rawMessage = critResult.reasons[0]?.message || 'Please provide this information in the form above.';
      const feedback = computeCriterionFeedback(
        crit.node,
        profile,
        refDate,
        'MISSING_INFO',
        crit.label,
        rawMessage
      );
      return {
        ...crit,
        status: 'MISSING_INFO' as const,
        badgeStatus: 'missing-info' as const,
        badgeLabel: 'Information Needed',
        message: rawMessage,
        feedback,
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
          <span>Application Eligibility Audit</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight font-sans">
          Check Eligibility to Apply: {scholarshipName}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-normal">
          Determines whether you meet the verified requirements to apply for this scholarship. Post-application selection stages (such as interviews or assessments) are modeled separately and not evaluated here.
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

        {/* Dynamic Fields Grid - only display fields required by this scholarship's eligibility AST */}
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
                ? 'All eligibility criteria for this scholarship are verified manually via official documentation.'
                : 'All eligibility criteria for this scholarship are verified without requiring additional inputs.'}
            </p>
          </div>
        )}

        {/* Required SPM Subject Grades */}
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
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              {result
                ? 'Adjust qualifications above to test what-if scenarios, then re-check.'
                : 'Evaluation determines eligibility to apply against verified provider rules.'}
            </p>
            {hasModifiedAfterEvaluation && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Qualifications changed · Re-check to update results</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isEvaluating}
            className="w-full sm:w-auto px-6 py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md cursor-pointer min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {isEvaluating
                ? 'Evaluating Rules...'
                : result
                ? 'Re-check Eligibility'
                : 'Check Eligibility to Apply'}
            </span>
          </button>
        </div>
      </form>

      {/* Evaluation Results Display with Criteria Audit Breakdown */}
      {result && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in duration-200">
          {/* Result Banner: Eligible to Apply */}
          {result.status === 'MET' && (
            <div className="p-6 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-emerald-950 font-sans tracking-tight">
                  Eligible to Apply
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed font-normal">
                  You meet the verified eligibility requirements for this scholarship and can proceed to the application process.
                </p>
              </div>
            </div>
          )}

          {/* Result Banner: Not Eligible to Apply */}
          {hasHardFailures && (
            <div className="p-6 bg-rose-50/90 border border-rose-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-rose-950 font-sans tracking-tight">
                  Not Eligible to Apply
                </h3>
                <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-normal">
                  One or more verified eligibility requirements are not satisfied by your current qualifications. Review the criteria audit below.
                </p>
              </div>
            </div>
          )}

          {/* Result Banner: Eligible to Apply (Manual Verification Required) */}
          {onlyManualCriteriaPending && (
            <div className="p-6 bg-blue-50/90 border border-blue-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-blue-950 font-sans tracking-tight">
                  Eligible to Apply (Manual Verification Required)
                </h3>
                <p className="text-xs sm:text-sm text-blue-800 leading-relaxed font-normal">
                  Your academic profile meets all machine-checkable criteria. This scholarship also requires manual verification of official eligibility documents (such as admission offers or financial statements).
                </p>
              </div>
            </div>
          )}

          {/* Result Banner: More Information Needed */}
          {result.status === 'MISSING_INFO' && hasMissingInputReasons && (
            <div className="p-6 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-amber-950 font-sans tracking-tight">
                  More Information Needed
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed font-normal">
                  Some required eligibility fields were left empty. Please fill them in above to complete your evaluation.
                </p>
              </div>
            </div>
          )}

          {/* Criteria Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-[#0F172A] font-sans">
                Deterministic Eligibility Audit Breakdown
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {detailedAudit.length} {detailedAudit.length === 1 ? 'Rule' : 'Rules'} Modeled
              </span>
            </div>

            <div className="space-y-3">
              {detailedAudit.map((crit) => (
                <div
                  key={crit.id}
                  className={`p-4 sm:p-5 rounded-xl border transition-all ${
                    crit.status === 'MET'
                      ? 'bg-emerald-50/25 border-emerald-200/70'
                      : crit.status === 'NOT_MET'
                      ? 'bg-rose-50/40 border-rose-200/90 shadow-2xs'
                      : crit.status === 'MANUAL_VERIFICATION'
                      ? 'bg-blue-50/25 border-blue-200/70'
                      : 'bg-amber-50/25 border-amber-200/70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {crit.label}
                        </span>
                        {!crit.isMachineCheckable && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100/70 text-blue-800 rounded">
                            Official Document Verification
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        {crit.description}
                      </p>
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      <StatusBadge status={crit.badgeStatus} label={crit.badgeLabel} size="sm" />
                    </div>
                  </div>

                  {/* Detailed Feedback: Current vs Required vs Gap */}
                  {crit.status === 'NOT_MET' && (
                    <div className="mt-3 p-3.5 bg-white/95 rounded-xl border border-rose-200 space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Current
                          </span>
                          <span className="font-semibold text-slate-900">
                            {crit.feedback.currentValueDisplay}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Required
                          </span>
                          <span className="font-semibold text-slate-900">
                            {crit.feedback.requiredValueDisplay}
                          </span>
                        </div>
                        {crit.feedback.gapDisplay && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                              Gap
                            </span>
                            <span className="font-bold text-rose-700">
                              {crit.feedback.gapDisplay}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-rose-100 flex items-start gap-1.5 text-xs text-rose-900 font-medium">
                        <span className="text-rose-600 shrink-0 font-bold">❌</span>
                        <span>{crit.feedback.explanation}</span>
                      </div>
                    </div>
                  )}

                  {crit.status === 'MET' && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-emerald-800">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Requirement satisfied:</span>
                      </span>
                      <span className="text-slate-700 font-medium">
                        Current ({crit.feedback.currentValueDisplay}) vs Required ({crit.feedback.requiredValueDisplay})
                      </span>
                    </div>
                  )}

                  {crit.status === 'MISSING_INFO' && (
                    <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{crit.feedback.explanation}</span>
                    </div>
                  )}

                  {crit.status === 'MANUAL_VERIFICATION' && (
                    <div className="mt-2.5 pt-2 border-t border-blue-100 flex items-center gap-1.5 text-xs text-blue-800 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{crit.feedback.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selection Process (Separate from Eligibility Determination) */}
          {combinedSelectionStages.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h4 className="text-base font-bold text-[#0F172A] font-sans">
                  Selection Process
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The scholarship provider may have additional selection stages after application. These stages are conducted directly by the scholarship provider and are not evaluated by DreamPath&rsquo;s eligibility checker.
              </p>
              <div className="space-y-2 pt-1">
                {combinedSelectionStages.map((stage) => (
                  <div
                    key={stage.id}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{stage.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded">
                        Provider Selection Stage
                      </span>
                    </div>
                    {stage.description && (
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        {stage.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Natural What-If Guidance for Ineligible Scenarios */}
          {hasHardFailures && (
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">Want to test a &ldquo;What-If&rdquo; scenario?</span>
                <p className="text-slate-600">
                  Simply adjust your qualifications in the form above (such as your CGPA) and click <strong>Re-check Eligibility</strong> to test how changes affect your eligibility.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const formEl = document.querySelector('form');
                  if (formEl) {
                    formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-lg shrink-0 transition-colors cursor-pointer shadow-2xs"
              >
                Adjust Qualifications ↑
              </button>
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
