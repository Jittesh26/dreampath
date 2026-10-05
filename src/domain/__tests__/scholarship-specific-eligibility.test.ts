import { describe, it, expect } from 'vitest';
import { RequirementNode, ScholarshipRequirement } from '../schema';
import { StudentProfile } from '../registry';
import { evaluateEligibility } from '../evaluator';
import {
  extractRequiredFields,
  extractMachineCheckableFields,
  extractManualVerificationFields,
  extractDetailedCriteria,
  isMachineCheckableField,
  getCriterionLabel,
  getCriterionDescription,
} from '../astUtils';

describe('Scholarship-Specific Eligibility Architecture', () => {
  const REF_DATE = new Date('2026-10-14T00:00:00.000Z');

  // Scholarship A: BNM Kijang
  const bnmKijangAst: RequirementNode = {
    type: 'ALL',
    nodes: [
      { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
      { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
      { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A+' } },
      { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
      { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Bahasa Melayu', minGrade: 'A' } },
      { type: 'CONDITION', field: 'bnm_assessment_centre', operator: 'EQUALS', value: true },
    ],
  };

  const bnmRequirement: ScholarshipRequirement = {
    id: 'bnm_kijang',
    name: 'Bank Negara Malaysia (BNM) Kijang Scholarship',
    rootNode: bnmKijangAst,
  };

  // Scholarship B: Gamuda Scholarship
  const gamudaAst: RequirementNode = {
    type: 'ALL',
    nodes: [
      { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
      { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.4 },
      { type: 'CONDITION', field: 'premier_university_offer', operator: 'EQUALS', value: true },
    ],
  };

  const gamudaRequirement: ScholarshipRequirement = {
    id: 'gamuda_scholarship',
    name: 'Gamuda Scholarship',
    rootNode: gamudaAst,
  };

  // Scholarship C: Yayasan Peneraju
  const penerajuAst: RequirementNode = {
    type: 'ALL',
    nodes: [
      { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
      { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
      { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
      { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
    ],
  };

  const penerajuRequirement: ScholarshipRequirement = {
    id: 'yayasan_peneraju',
    name: 'Yayasan Peneraju Pendidikan Bumiputera',
    rootNode: penerajuAst,
  };

  describe('1. Dynamic, scholarship-specific question generation', () => {
    it('Scholarship A (BNM) requires only its own fields and isolates manual criteria', () => {
      const allFields = extractRequiredFields(bnmKijangAst);
      const machineCheckable = extractMachineCheckableFields(bnmKijangAst);
      const manualFields = extractManualVerificationFields(bnmKijangAst);

      // Must include citizenship, age, and the 3 SPM subjects
      expect(machineCheckable).toContain('citizenship');
      expect(machineCheckable).toContain('age');
      expect(machineCheckable).toContain('spm_results.Mathematics');
      expect(machineCheckable).toContain('spm_results.English');
      expect(machineCheckable).toContain('spm_results.Bahasa Melayu');

      // Unrelated fields MUST NOT be required
      expect(machineCheckable).not.toContain('cgpa');
      expect(machineCheckable).not.toContain('income_band');
      expect(machineCheckable).not.toContain('household_income');
      expect(machineCheckable).not.toContain('bumiputera_status');

      // Assessment centre must be identified as manual verification only
      expect(manualFields).toEqual(['bnm_assessment_centre']);
      expect(machineCheckable).not.toContain('bnm_assessment_centre');
    });

    it('Scholarship B (Gamuda) questions differ appropriately from Scholarship A', () => {
      const machineCheckable = extractMachineCheckableFields(gamudaAst);
      const manualFields = extractManualVerificationFields(gamudaAst);

      expect(machineCheckable).toEqual(['citizenship', 'cgpa']);
      expect(manualFields).toEqual(['premier_university_offer']);

      // Gamuda does NOT ask for age, SPM, income band, or bumiputera status
      expect(machineCheckable).not.toContain('age');
      expect(machineCheckable).not.toContain('date_of_birth');
      expect(machineCheckable).not.toContain('income_band');
      expect(machineCheckable).not.toContain('bumiputera_status');
      expect(machineCheckable.some((f) => f.startsWith('spm_results.'))).toBe(false);
    });

    it('Scholarship C (Peneraju) questions differ appropriately from both A and B', () => {
      const machineCheckable = extractMachineCheckableFields(penerajuAst);
      const manualFields = extractManualVerificationFields(penerajuAst);

      expect(machineCheckable).toEqual(['citizenship', 'bumiputera_status', 'income_band', 'cgpa']);
      expect(manualFields).toEqual([]); // 100% machine-checkable

      // Does NOT require age, household_income, or SPM
      expect(machineCheckable).not.toContain('age');
      expect(machineCheckable).not.toContain('household_income');
      expect(machineCheckable.some((f) => f.startsWith('spm_results.'))).toBe(false);
    });
  });

  describe('2. Distinguishing Met vs Not Met vs Missing vs Manual Verification', () => {
    it('BNM: when all machine facts pass, manual verification is NOT marked as Criteria Unmet', () => {
      const qualifiedStudent: StudentProfile = {
        citizenship: 'Malaysian',
        date_of_birth: '2007-06-15', // Age 19 on 2026-10-14
        spm_results: {
          Mathematics: 'A+',
          English: 'A',
          'Bahasa Melayu': 'A',
        },
      };

      const result = evaluateEligibility(qualifiedStudent, bnmRequirement, REF_DATE);

      // Deterministic evaluator marks overall as MISSING_INFO with code NOT_MACHINE_CHECKABLE
      expect(result.status).toBe('MISSING_INFO');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0].code).toBe('NOT_MACHINE_CHECKABLE');
      expect(result.reasons[0].field).toBe('bnm_assessment_centre');

      // Crucially, it is NOT marked as NOT_MET (Hard failure)
      expect(result.status).not.toBe('NOT_MET');

      // Breakdown of criteria
      const criteria = extractDetailedCriteria(bnmKijangAst);
      expect(criteria).toHaveLength(6);

      const evaluatedCriteria = criteria.map((crit) => {
        const evalRes = evaluateEligibility(qualifiedStudent, { id: 'test', name: crit.label, rootNode: crit.node }, REF_DATE);
        return {
          label: crit.label,
          status: evalRes.status,
          code: evalRes.reasons[0]?.code,
        };
      });

      // 5 criteria are MET
      const metCriteria = evaluatedCriteria.filter((c) => c.status === 'MET');
      expect(metCriteria).toHaveLength(5);

      // 1 criterion is manual verification
      const manualCrit = evaluatedCriteria.find((c) => c.code === 'NOT_MACHINE_CHECKABLE');
      expect(manualCrit).toBeDefined();
      expect(manualCrit?.label).toBe('Bank Negara Assessment Centre');

      // NONE are NOT_MET
      const unmet = evaluatedCriteria.filter((c) => c.status === 'NOT_MET');
      expect(unmet).toHaveLength(0);
    });

    it('Definitively failed criteria are reported as NOT_MET (Criteria Unmet)', () => {
      const underperformingStudent: StudentProfile = {
        citizenship: 'Malaysian',
        cgpa: 3.10, // Below 3.40 required by Gamuda
      };

      const result = evaluateEligibility(underperformingStudent, gamudaRequirement, REF_DATE);

      expect(result.status).toBe('NOT_MET');
      expect(result.reasons[0].code).toBe('BELOW_MINIMUM');
      expect(result.reasons[0].field).toBe('cgpa');
    });

    it('Missing inputs are reported as MISSING_INFO and NOT as NOT_MET (Criteria Unmet)', () => {
      const incompleteStudent: StudentProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: true,
        income_band: 'B40',
        // cgpa is omitted / missing
      };

      const result = evaluateEligibility(incompleteStudent, penerajuRequirement, REF_DATE);

      expect(result.status).toBe('MISSING_INFO');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0].code).toBe('MISSING_INPUT');
      expect(result.reasons[0].field).toBe('cgpa');

      // Must NOT be treated as a hard failure (unmet)
      expect(result.status).not.toBe('NOT_MET');
    });

    it('Fully satisfied criteria with no manual verification produce overall MET', () => {
      const perfectPenerajuStudent: StudentProfile = {
        citizenship: 'Malaysian',
        bumiputera_status: true,
        income_band: 'B40',
        cgpa: 3.65,
      };

      const result = evaluateEligibility(perfectPenerajuStudent, penerajuRequirement, REF_DATE);

      expect(result.status).toBe('MET');
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('3. Human-readable criterion presentation', () => {
    it('produces professional labels without raw snake_case database field names', () => {
      expect(getCriterionLabel('citizenship')).toBe('Nationality / Citizenship');
      expect(getCriterionLabel('age')).toBe('Age Requirement');
      expect(getCriterionLabel('cgpa')).toBe('Minimum CGPA');
      expect(getCriterionLabel('income_band')).toBe('Household Income Tier');
      expect(getCriterionLabel('spm_results.Mathematics')).toBe('SPM Mathematics');
      expect(getCriterionLabel('bnm_assessment_centre')).toBe('Bank Negara Assessment Centre');
      expect(getCriterionLabel('premier_university_offer')).toBe('Premier University Admission Offer');
    });

    it('produces human-readable descriptions for criteria', () => {
      const bnmDesc = getCriterionDescription({
        type: 'CONDITION',
        field: 'bnm_assessment_centre',
        operator: 'EQUALS',
        value: true,
      });
      expect(bnmDesc).toContain('cannot verify automatically');

      const cgpaDesc = getCriterionDescription({
        type: 'CONDITION',
        field: 'cgpa',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 3.5,
      });
      expect(cgpaDesc).toBe('Minimum cumulative GPA of 3.50.');
    });
  });
});
