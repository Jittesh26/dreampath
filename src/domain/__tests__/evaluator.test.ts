import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../evaluator';
import { PROFILES, REQUIREMENTS } from './fixtures';
import { ScholarshipRequirement } from '../schema';
import { StudentProfile } from '../registry';

describe('Deterministic Evaluator', () => {
  const REF_DATE = new Date('2026-10-14T00:00:00.000Z');

  describe('1. Reference Date and Age/DOB Behavior', () => {
    const ageRequirement: ScholarshipRequirement = {
      id: 'req_age',
      name: 'Age Requirement',
      rootNode: { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 20 }
    };

    it('calculates age correctly BEFORE birthday (born Oct 15, ref Oct 14)', () => {
      // 2006-10-15 -> on 2026-10-14, age is 19
      const result = evaluateEligibility({ date_of_birth: '2006-10-15' }, ageRequirement, REF_DATE);
      expect(result.status).toBe('MET');
    });

    it('calculates age correctly ON birthday (born Oct 14, ref Oct 14)', () => {
      // 2006-10-14 -> on 2026-10-14, age is 20
      const result = evaluateEligibility({ date_of_birth: '2006-10-14' }, ageRequirement, REF_DATE);
      expect(result.status).toBe('MET');
    });

    it('calculates age correctly AFTER birthday (born Oct 13, ref Oct 14)', () => {
      // 2005-10-13 -> on 2026-10-14, age is 21 (Fails the <= 20 check)
      const result = evaluateEligibility({ date_of_birth: '2005-10-13' }, ageRequirement, REF_DATE);
      expect(result.status).toBe('NOT_MET');
      expect(result.reasons[0].code).toBe('NOT_IN_ALLOWED_SET');
    });

    it('uses explicit reference date for exact same DOB yielding different results', () => {
      const dob = '2006-10-15';
      const resultBefore = evaluateEligibility({ date_of_birth: dob }, ageRequirement, new Date('2027-10-14')); // Age 20 -> MET
      expect(resultBefore.status).toBe('MET');
      
      const resultAfter = evaluateEligibility({ date_of_birth: dob }, ageRequirement, new Date('2027-10-15')); // Age 21 -> NOT_MET
      expect(resultAfter.status).toBe('NOT_MET');
    });
    
    it('returns MISSING_INFO when date_of_birth is absent', () => {
      const result = evaluateEligibility({ }, ageRequirement, REF_DATE);
      expect(result.status).toBe('MISSING_INFO');
      expect(result.reasons[0].code).toBe('MISSING_INPUT');
    });
  });

  describe('2. Reason Codes and Missing Input', () => {
    const checkableReq: ScholarshipRequirement = {
      id: 'r_check',
      name: 'Checkable',
      rootNode: { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 }
    };
    
    it('returns BELOW_MINIMUM', () => {
      const result = evaluateEligibility({ cgpa: 3.0 }, checkableReq, REF_DATE);
      expect(result.status).toBe('NOT_MET');
      expect(result.reasons[0].code).toBe('BELOW_MINIMUM');
    });

    it('returns MISSING_INPUT for missing CGPA', () => {
      const result = evaluateEligibility({ }, checkableReq, REF_DATE);
      expect(result.status).toBe('MISSING_INFO');
      expect(result.reasons[0].code).toBe('MISSING_INPUT');
    });

    it('returns NOT_IN_ALLOWED_SET for missing IN_ARRAY', () => {
      const arrayReq: ScholarshipRequirement = {
        id: 'r_arr', name: 'Arr', rootNode: { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] }
      };
      const result = evaluateEligibility({ income_band: 'T20' }, arrayReq, REF_DATE);
      expect(result.status).toBe('NOT_MET');
      expect(result.reasons[0].code).toBe('NOT_IN_ALLOWED_SET');
    });

    it('returns NOT_MACHINE_CHECKABLE for unknown fields', () => {
      const uncheckableReq: ScholarshipRequirement = {
        id: 'r_un', name: 'Uncheckable', rootNode: { type: 'CONDITION', field: 'essay_score', operator: 'GREATER_THAN_OR_EQUAL', value: 80 }
      };
      // StudentProfile does not have 'essay_score'
      const profile = { essay_score: 90 } as unknown as StudentProfile;
      const result = evaluateEligibility(profile, uncheckableReq, REF_DATE);
      expect(result.status).toBe('MISSING_INFO');
      expect(result.reasons[0].code).toBe('NOT_MACHINE_CHECKABLE');
    });
  });

  describe('3. Boolean Semantics (ALL)', () => {
    const buildAll = (c1: number, c2: number): ScholarshipRequirement => ({
      id: 'all_req', name: 'ALL', rootNode: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: c1 },
          { type: 'CONDITION', field: 'household_income', operator: 'LESS_THAN_OR_EQUAL', value: c2 }
        ]
      }
    });

    it('MET + MET -> MET', () => {
      const result = evaluateEligibility({ cgpa: 3.5, household_income: 3000 }, buildAll(3.0, 5000), REF_DATE);
      expect(result.status).toBe('MET');
    });

    it('MET + NOT_MET -> NOT_MET', () => {
      const result = evaluateEligibility({ cgpa: 3.5, household_income: 6000 }, buildAll(3.0, 5000), REF_DATE);
      expect(result.status).toBe('NOT_MET');
    });

    it('MET + MISSING_INFO -> MISSING_INFO', () => {
      const result = evaluateEligibility({ cgpa: 3.5 }, buildAll(3.0, 5000), REF_DATE);
      expect(result.status).toBe('MISSING_INFO');
    });

    it('NOT_MET + MISSING_INFO -> NOT_MET (Hard fail overrides)', () => {
      const result = evaluateEligibility({ cgpa: 2.0 }, buildAll(3.0, 5000), REF_DATE);
      expect(result.status).toBe('NOT_MET');
      // Should not contain MISSING_INPUT because NOT_MET filters it out for ALL
      expect(result.reasons.find(r => r.code === 'MISSING_INPUT')).toBeUndefined();
    });
  });

  describe('4. Boolean Semantics (ANY)', () => {
    const buildAny = (c1: number, c2: number): ScholarshipRequirement => ({
      id: 'any_req', name: 'ANY', rootNode: {
        type: 'ANY',
        nodes: [
          { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: c1 },
          { type: 'CONDITION', field: 'household_income', operator: 'LESS_THAN_OR_EQUAL', value: c2 }
        ]
      }
    });

    it('MET + NOT_MET -> MET', () => {
      const result = evaluateEligibility({ cgpa: 3.5, household_income: 6000 }, buildAny(3.0, 5000), REF_DATE);
      expect(result.status).toBe('MET');
    });

    it('MET + MISSING_INFO -> MET', () => {
      const result = evaluateEligibility({ cgpa: 3.5 }, buildAny(3.0, 5000), REF_DATE);
      expect(result.status).toBe('MET');
    });

    it('NOT_MET + MISSING_INFO -> MISSING_INFO', () => {
      const result = evaluateEligibility({ cgpa: 2.0 }, buildAny(3.0, 5000), REF_DATE);
      expect(result.status).toBe('MISSING_INFO');
    });

    it('NOT_MET + NOT_MET -> NOT_MET', () => {
      const result = evaluateEligibility({ cgpa: 2.0, household_income: 6000 }, buildAny(3.0, 5000), REF_DATE);
      expect(result.status).toBe('NOT_MET');
    });
  });

  describe('5. Legacy Fixtures Regression Check', () => {
    it('JPA Undergraduate (ALL) on perfect profile', () => {
      const result = evaluateEligibility(PROFILES.perfectB40Student, REQUIREMENTS.jpaUndergrad, REF_DATE);
      expect(result.status).toBe('MET');
    });
    
    it('Corporate Engineering (ANY/ALL nested) on perfect profile', () => {
      const result = evaluateEligibility(PROFILES.perfectB40Student, REQUIREMENTS.corporateB40Engineering, REF_DATE);
      expect(result.status).toBe('MET');
    });
  });
});
