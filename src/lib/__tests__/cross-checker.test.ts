import { describe, it, expect } from 'vitest';
import { evaluateAllScholarships } from '../cross-checker';
import { ScholarshipWithRules } from '../scholarships-data';
import { StudentProfile } from '../../domain/registry';

describe('Cross-Scholarship Deterministic Evaluator', () => {
  const mockScholarships: ScholarshipWithRules[] = [
    {
      id: 's-1',
      name: 'Gamuda Scholarship',
      description: 'Undergraduate scholarship for engineering and IT',
      providerId: 'p-1',
      providerName: 'Gamuda Berhad',
      intakeId: 'i-1',
      intakeStatus: 'published',
      openDate: '2026-03-01',
      closeDate: '2026-05-30',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.40 },
        ],
      },
      requirementName: 'Gamuda Standard Academic Rules',
    },
    {
      id: 's-2',
      name: 'Yayasan Peneraju Bumiputera',
      description: 'Funding for Bumiputera scholars',
      providerId: 'p-2',
      providerName: 'Yayasan Peneraju',
      intakeId: 'i-2',
      intakeStatus: 'published',
      openDate: '2026-01-01',
      closeDate: '2026-06-30',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
          { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        ],
      },
      requirementName: 'Peneraju Inclusivity Rules',
    },
    {
      id: 's-3',
      name: 'PETRONAS PESP Scholarship',
      description: 'Prestigious engineering sponsorship',
      providerId: 'p-3',
      providerName: 'PETRONAS',
      intakeId: 'i-3',
      intakeStatus: 'published',
      openDate: '2026-02-01',
      closeDate: '2026-04-15',
      ruleAst: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          {
            type: 'CONDITION',
            field: 'spm_results',
            operator: 'HAS_SPM_SUBJECT_GRADE',
            value: { subject: 'Mathematics', minGrade: 'A' },
          },
        ],
      },
      requirementName: 'PETRONAS SPM Grade Rules',
    },
  ];

  it('correctly matches a Malaysian B40 Bumiputera high achiever across all scholarships', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.85,
      spm_results: {
        Mathematics: 'A+',
        English: 'A',
      },
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    expect(report.totalEvaluated).toBe(3);
    expect(report.qualifiedCount).toBe(3);
    expect(report.ineligibleCount).toBe(0);
    expect(report.potentialCount).toBe(0);

    const s1 = report.results.find((r) => r.scholarship.id === 's-1');
    expect(s1?.evaluation.status).toBe('MET');

    const s2 = report.results.find((r) => r.scholarship.id === 's-2');
    expect(s2?.evaluation.status).toBe('MET');

    const s3 = report.results.find((r) => r.scholarship.id === 's-3');
    expect(s3?.evaluation.status).toBe('MET');
  });

  it('correctly marks ineligible when candidate fails CGPA threshold', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.10, // Below Gamuda 3.40
      spm_results: {
        Mathematics: 'A',
      },
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    const s1 = report.results.find((r) => r.scholarship.id === 's-1');
    expect(s1?.evaluation.status).toBe('NOT_MET');
    expect(s1?.evaluation.reasons[0].message).toContain('is below minimum required 3.4');
  });

  it('correctly marks ineligible when Bumiputera criterion is not satisfied', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: false,
      income_band: 'B40',
      cgpa: 3.90,
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    const s2 = report.results.find((r) => r.scholarship.id === 's-2');
    expect(s2?.evaluation.status).toBe('NOT_MET');
  });

  it('flags MISSING_INFO when required SPM subject is not present', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.90,
      spm_results: {}, // Missing Mathematics
    };

    const report = evaluateAllScholarships(profile, mockScholarships);

    const s3 = report.results.find((r) => r.scholarship.id === 's-3');
    expect(s3?.evaluation.status).toBe('MISSING_INFO');
    expect(s3?.evaluation.reasons[0].message).toContain('Missing grade for SPM subject Mathematics');
  });

  it('maintains strict determinism on identical profile evaluations', () => {
    const profile: StudentProfile = {
      citizenship: 'Malaysian',
      bumiputera_status: true,
      income_band: 'B40',
      cgpa: 3.75,
      spm_results: { Mathematics: 'A' },
    };

    const report1 = evaluateAllScholarships(profile, mockScholarships);
    const report2 = evaluateAllScholarships(profile, mockScholarships);

    expect(report1.qualifiedCount).toBe(report2.qualifiedCount);
    expect(report1.ineligibleCount).toBe(report2.ineligibleCount);
    expect(report1.potentialCount).toBe(report2.potentialCount);
  });
});
