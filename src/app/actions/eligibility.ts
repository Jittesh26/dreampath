'use server';

import { StudentProfile } from '../../domain/registry';
import { getPublishedScholarshipsWithRules } from '../../lib/scholarships-data';
import { evaluateAllScholarships } from '../../lib/cross-checker';
import { FormattedScholarshipAttributes } from '../../domain/scholarship-attributes';

export interface SanitizedEvaluatedScholarship {
  scholarship: {
    id: string;
    name: string;
    description: string;
    providerId: string;
    providerName: string;
    providerUrl?: string;
    intakeId: string;
    intakeStatus: string;
    openDate: string | null;
    closeDate: string | null;
    intakeYear?: number;
  };
  attributes: FormattedScholarshipAttributes;
  evaluation: {
    status: 'MET' | 'MISSING_INFO' | 'NOT_MET';
    reasons: Array<{
      field?: string;
      code: string;
      message: string;
    }>;
  };
  hasRules: boolean;
}

export interface SanitizedEvaluationReport {
  timestamp: string;
  totalEvaluated: number;
  qualifiedCount: number;
  potentialCount: number;
  ineligibleCount: number;
  results: SanitizedEvaluatedScholarship[];
}

/**
 * Server-side cross-scholarship evaluation action.
 * Evaluates candidate profile against currently published scholarships without
 * exposing raw JSONB rule ASTs to the browser.
 */
export async function evaluateProfileServer(
  profile: StudentProfile
): Promise<SanitizedEvaluationReport> {
  // 1. Load currently published/applicable scholarships on the server
  const publishedScholarships = await getPublishedScholarshipsWithRules();

  // 2. Evaluate using the deterministic engine
  const rawReport = evaluateAllScholarships(profile, publishedScholarships);

  // 3. Return sanitized results required for UI presentation (no raw AST exposed)
  return {
    timestamp: rawReport.timestamp,
    totalEvaluated: rawReport.totalEvaluated,
    qualifiedCount: rawReport.qualifiedCount,
    potentialCount: rawReport.potentialCount,
    ineligibleCount: rawReport.ineligibleCount,
    results: rawReport.results.map((r) => ({
      scholarship: {
        id: r.scholarship.id,
        name: r.scholarship.name,
        description: r.scholarship.description,
        providerId: r.scholarship.providerId,
        providerName: r.scholarship.providerName,
        providerUrl: r.scholarship.providerUrl,
        intakeId: r.scholarship.intakeId,
        intakeStatus: r.scholarship.intakeStatus,
        openDate: r.scholarship.openDate,
        closeDate: r.scholarship.closeDate,
        intakeYear: r.scholarship.intakeYear,
      },
      attributes: r.attributes,
      evaluation: {
        status: r.evaluation.status,
        reasons: r.evaluation.reasons.map((reason) => ({
          field: reason.field,
          code: reason.code,
          message: reason.message,
        })),
      },
      hasRules: r.hasRules,
    })),
  };
}
