import { StudentProfile } from '../domain/registry';
import { evaluateEligibility, EvaluationResult } from '../domain/evaluator';
import { ScholarshipWithRules } from './scholarships-data';
import { extractScholarshipAttributes, FormattedScholarshipAttributes } from '../domain/scholarship-attributes';

export interface EvaluatedScholarship {
  scholarship: ScholarshipWithRules;
  attributes: FormattedScholarshipAttributes;
  evaluation: EvaluationResult;
  hasRules: boolean;
}

export interface CrossEvaluationReport {
  timestamp: string;
  totalEvaluated: number;
  qualifiedCount: number;
  potentialCount: number;
  ineligibleCount: number;
  results: EvaluatedScholarship[];
}

/**
 * Runs cross-scholarship deterministic evaluation against all available scholarships.
 * Strictly uses published rule ASTs via evaluateEligibility().
 */
export function evaluateAllScholarships(
  profile: StudentProfile,
  scholarships: ScholarshipWithRules[],
  referenceDate: Date = new Date()
): CrossEvaluationReport {
  const evaluated: EvaluatedScholarship[] = [];

  for (const s of scholarships) {
    const attributes = extractScholarshipAttributes(
      s.name,
      s.description || '',
      '',
      s.closeDate,
      s.openDate,
      s.intakeStatus,
      s.providerName
    );

    if (s.ruleAst) {
      const evaluation = evaluateEligibility(
        profile,
        {
          id: s.id,
          name: s.name,
          rootNode: s.ruleAst,
        },
        referenceDate
      );

      evaluated.push({
        scholarship: s,
        attributes,
        evaluation,
        hasRules: true,
      });
    } else {
      // For scholarships without a modeled rule AST yet
      evaluated.push({
        scholarship: s,
        attributes,
        evaluation: {
          status: 'MISSING_INFO',
          reasons: [
            {
              code: 'NOT_MACHINE_CHECKABLE',
              message: 'Criteria undergoing authoritative audit. Manual review against provider circular required.',
            },
          ],
        },
        hasRules: false,
      });
    }
  }

  // Sort results: MET first, then MISSING_INFO, then NOT_MET
  evaluated.sort((a, b) => {
    const score = (status: string) => {
      if (status === 'MET') return 0;
      if (status === 'MISSING_INFO') return 1;
      return 2;
    };
    return score(a.evaluation.status) - score(b.evaluation.status);
  });

  const qualifiedCount = evaluated.filter((e) => e.evaluation.status === 'MET').length;
  const potentialCount = evaluated.filter((e) => e.evaluation.status === 'MISSING_INFO').length;
  const ineligibleCount = evaluated.filter((e) => e.evaluation.status === 'NOT_MET').length;

  return {
    timestamp: referenceDate.toISOString(),
    totalEvaluated: evaluated.length,
    qualifiedCount,
    potentialCount,
    ineligibleCount,
    results: evaluated,
  };
}
