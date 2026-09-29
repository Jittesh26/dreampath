export type Citizenship = 'Malaysian' | 'Permanent Resident' | 'Non-Malaysian';
export type IncomeBand = 'B40' | 'M40' | 'T20';

export type SPMGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'E' | 'G';

export interface StudentProfile {
  id?: string;
  age?: number; // Kept for legacy/fallback, prefer date_of_birth
  date_of_birth?: string; // ISO format YYYY-MM-DD
  citizenship?: Citizenship;
  bumiputera_status?: boolean;
  income_band?: IncomeBand;
  household_income?: number;
  cgpa?: number;
  spm_results?: Record<string, SPMGrade>;
}

// Helper to rank SPM grades for comparison (lower index is better)
const SPM_GRADE_RANKING: Record<SPMGrade, number> = {
  'A+': 1,
  'A': 2,
  'A-': 3,
  'B+': 4,
  'B': 5,
  'C+': 6,
  'C': 7,
  'D': 8,
  'E': 9,
  'G': 10,
};

/**
 * Returns true if gradeA is greater than or equal to gradeB.
 * Example: isGradeGte('A-', 'B+') -> true
 * Example: isGradeGte('C', 'B') -> false
 */
export function isGradeGte(gradeA: SPMGrade, gradeB: SPMGrade): boolean {
  return SPM_GRADE_RANKING[gradeA] <= SPM_GRADE_RANKING[gradeB];
}
