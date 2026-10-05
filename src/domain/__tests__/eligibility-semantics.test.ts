import { describe, it, expect } from 'vitest';
import { RequirementNode, ScholarshipRequirement } from '../schema';
import { StudentProfile } from '../registry';
import { evaluateEligibility } from '../evaluator';
import {
  extractRequiredFields,
  extractMachineCheckableFields,
  extractManualVerificationFields,
  extractDetailedCriteria,
} from '../astUtils';
import { separateEligibilityAndSelection } from '../selection-process';

describe('DreamPath Eligibility Checker Semantics Globally', () => {
  const REF_DATE = new Date('2026-10-14T00:00:00.000Z');

  // Test 1 Fixture: Eligibility Only
  // Malaysian citizen + CGPA >= 3.00 + household income band B40/M40
  const eligibilityOnlyAst: RequirementNode = {
    type: 'ALL',
    nodes: [
      { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
      { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
    ],
  };

  const eligibilityOnlyRequirement: ScholarshipRequirement = {
    id: 'test_eligibility_only',
    name: 'Academic Merit & Need Scholarship',
    rootNode: eligibilityOnlyAst,
  };

  // Test 2 Fixture: Eligibility + Post-Application Interview / Selection Stage
  // Malaysian citizen + CGPA >= 3.00 + interview / assessment centre
  const eligibilityPlusInterviewAst: RequirementNode = {
    type: 'ALL',
    nodes: [
      { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
      { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      { type: 'CONDITION', field: 'ytar_leadership_interview', operator: 'EQUALS', value: true },
    ],
  };

  const eligibilityPlusInterviewReq: ScholarshipRequirement = {
    id: 'test_eligibility_plus_interview',
    name: 'Leadership Foundation Scholarship',
    rootNode: eligibilityPlusInterviewAst,
  };

  // Test 3 Fixture: Genuine Manual Eligibility Prerequisite
  // Malaysian citizen + CGPA >= 3.00 + genuine manual eligibility (premier_university_offer)
  const genuineManualAst: RequirementNode = {
    type: 'ALL',
    nodes: [
      { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
      { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      { type: 'CONDITION', field: 'premier_university_offer', operator: 'EQUALS', value: true },
    ],
  };

  const genuineManualReq: ScholarshipRequirement = {
    id: 'test_genuine_manual',
    name: 'Global University Bound Scholarship',
    rootNode: genuineManualAst,
  };

  // --------------------------------------------------------------------------
  // Test 1 — Eligibility only
  // --------------------------------------------------------------------------
  it('Test 1 — Eligibility only: Malaysian citizen + CGPA >= 3.00 + income requirement -> Eligible to Apply (MET)', () => {
    const student: StudentProfile = {
      citizenship: 'Malaysian',
      cgpa: 3.5,
      income_band: 'B40',
    };

    const result = evaluateEligibility(student, eligibilityOnlyRequirement, REF_DATE);

    expect(result.status).toBe('MET');
    expect(result.reasons).toHaveLength(0);

    const requiredFields = extractRequiredFields(eligibilityOnlyAst);
    expect(requiredFields).toEqual(['citizenship', 'cgpa', 'income_band']);
    expect(extractManualVerificationFields(eligibilityOnlyAst)).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Test 2 — Eligibility + interview
  // --------------------------------------------------------------------------
  it('Test 2 — Eligibility + interview: interview does NOT create Manual Verification, Missing Info, or Criteria Unmet', () => {
    const student: StudentProfile = {
      citizenship: 'Malaysian',
      cgpa: 3.5,
    };

    // The student meets all application prerequisites
    const result = evaluateEligibility(student, eligibilityPlusInterviewReq, REF_DATE);

    // MUST be Eligible to Apply (MET), NOT MISSING_INFO or NOT_MET
    expect(result.status).toBe('MET');
    expect(result.reasons).toHaveLength(0);

    // Required questions must NOT include the interview
    const requiredFields = extractRequiredFields(eligibilityPlusInterviewAst);
    expect(requiredFields).toEqual(['citizenship', 'cgpa']);
    expect(requiredFields).not.toContain('ytar_leadership_interview');

    // Manual verification fields must NOT include the interview
    const manualFields = extractManualVerificationFields(eligibilityPlusInterviewAst);
    expect(manualFields).toEqual([]);
    expect(manualFields).not.toContain('ytar_leadership_interview');
  });

  // --------------------------------------------------------------------------
  // Test 3 — Genuine manual eligibility
  // --------------------------------------------------------------------------
  it('Test 3 — Genuine manual eligibility: genuine pre-application manual condition triggers Manual Verification Required', () => {
    const student: StudentProfile = {
      citizenship: 'Malaysian',
      cgpa: 3.5,
      // premier_university_offer cannot be auto-checked from profile
    };

    const result = evaluateEligibility(student, genuineManualReq, REF_DATE);

    // Status is MISSING_INFO with NOT_MACHINE_CHECKABLE code (UI displays "Manual Verification Required")
    expect(result.status).toBe('MISSING_INFO');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('NOT_MACHINE_CHECKABLE');
    expect(result.reasons[0].field).toBe('premier_university_offer');

    // Identified as manual verification in criteria analysis
    const manualFields = extractManualVerificationFields(genuineManualAst);
    expect(manualFields).toEqual(['premier_university_offer']);
  });

  // --------------------------------------------------------------------------
  // Test 4 — Genuine failed eligibility
  // --------------------------------------------------------------------------
  it('Test 4 — Genuine failed eligibility: CGPA 2.80 (< 3.00) -> Not Eligible to Apply (NOT_MET)', () => {
    const student: StudentProfile = {
      citizenship: 'Malaysian',
      cgpa: 2.8,
    };

    const result = evaluateEligibility(student, eligibilityPlusInterviewReq, REF_DATE);

    expect(result.status).toBe('NOT_MET');
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0].code).toBe('BELOW_MINIMUM');
    expect(result.reasons[0].field).toBe('cgpa');
  });

  // --------------------------------------------------------------------------
  // Test 5 — Selection process display
  // --------------------------------------------------------------------------
  it('Test 5 — Selection process display: verified interview/assessment centre separated cleanly from eligibility criteria', () => {
    const scholarshipWithStages: ScholarshipRequirement = {
      id: 'bnm_kijang',
      name: 'Bank Negara Malaysia (BNM) Kijang Scholarship',
      rootNode: {
        type: 'ALL',
        nodes: [
          { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
          { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
          { type: 'CONDITION', field: 'bnm_assessment_centre', operator: 'EQUALS', value: true },
        ],
      },
    };

    const { eligibilityAst, selectionStages } = separateEligibilityAndSelection(scholarshipWithStages.rootNode);

    // Selection stage extracted separately
    expect(selectionStages).toHaveLength(1);
    expect(selectionStages[0].type).toBe('assessment_centre');
    expect(selectionStages[0].name).toBe('Bank Negara Malaysia Assessment Centre');
    expect(selectionStages[0].id).toBe('stage_bnm_assessment_centre');

    // Eligibility AST only contains citizenship and age
    expect(extractRequiredFields(eligibilityAst)).toEqual(['citizenship', 'age']);
    expect(extractRequiredFields(eligibilityAst)).not.toContain('bnm_assessment_centre');

    // Evaluation on qualified student
    const student: StudentProfile = {
      citizenship: 'Malaysian',
      date_of_birth: '2007-06-15',
    };
    const evalResult = evaluateEligibility(student, scholarshipWithStages, REF_DATE);
    expect(evalResult.status).toBe('MET');
  });

  // --------------------------------------------------------------------------
  // Test 6 — Future scholarship compatibility
  // --------------------------------------------------------------------------
  it('Test 6 — Future scholarship compatibility: newly created fixture separates eligibility & selection automatically without hardcoded scholarship IDs', () => {
    // New future scholarship with no hardcoded knowledge in the codebase
    const futureScholarshipAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.75 },
        // Future post-application stages using recognized patterns
        { type: 'CONDITION', field: 'futurecorp_technical_interview', operator: 'EQUALS', value: true },
        { type: 'CONDITION', field: 'futurecorp_assessment_centre', operator: 'EQUALS', value: true },
        // Genuine pre-application manual check
        { type: 'CONDITION', field: 'unconditional_offer_letter', operator: 'EQUALS', value: true },
      ],
    };

    const futureReq: ScholarshipRequirement = {
      id: 'futurecorp_excellence_2027',
      name: 'FutureCorp Global Excellence Scholarship',
      rootNode: futureScholarshipAst,
    };

    const { eligibilityAst, selectionStages } = separateEligibilityAndSelection(futureScholarshipAst);

    expect(extractRequiredFields(eligibilityAst)).toEqual(['citizenship', 'cgpa', 'unconditional_offer_letter']);

    // Automatically extracted both selection stages without hardcoded scholarship ID
    expect(selectionStages).toHaveLength(2);
    expect(selectionStages.map((s) => s.name)).toEqual([
      'Futurecorp Technical Interview',
      'Futurecorp Assessment Centre',
    ]);
    expect(selectionStages[0].type).toBe('interview');
    expect(selectionStages[1].type).toBe('assessment_centre');

    // Machine checkable fields only contains pure eligibility
    const machineCheckable = extractMachineCheckableFields(futureScholarshipAst);
    expect(machineCheckable).toEqual(['citizenship', 'cgpa']);

    // Manual verification only contains pre-application admission requirement
    const manualFields = extractManualVerificationFields(futureScholarshipAst);
    expect(manualFields).toEqual(['unconditional_offer_letter']);

    // Detailed criteria only shows eligibility conditions (not the 2 selection stages)
    const criteria = extractDetailedCriteria(futureScholarshipAst);
    expect(criteria).toHaveLength(3); // citizenship, cgpa, unconditional_offer_letter
    expect(criteria.map((c) => c.field)).toEqual(['citizenship', 'cgpa', 'unconditional_offer_letter']);

    // Evaluator behaves deterministically
    const eligibleStudent: StudentProfile = {
      citizenship: 'Malaysian',
      cgpa: 3.85,
    };
    const evalResult = evaluateEligibility(eligibleStudent, futureReq, REF_DATE);
    // Requires manual verification of admission offer, but interview does not fail it
    expect(evalResult.status).toBe('MISSING_INFO');
    expect(evalResult.reasons[0].field).toBe('unconditional_offer_letter');
    expect(evalResult.reasons[0].code).toBe('NOT_MACHINE_CHECKABLE');
  });

  // --------------------------------------------------------------------------
  // Missing Information vs Criteria Unmet
  // --------------------------------------------------------------------------
  it('Missing information (omitted field) reports More Information Needed (MISSING_INFO), NOT Not Eligible (NOT_MET)', () => {
    const studentWithMissingCgpa: StudentProfile = {
      citizenship: 'Malaysian',
      income_band: 'B40',
      // cgpa omitted
    };

    const result = evaluateEligibility(studentWithMissingCgpa, eligibilityOnlyRequirement, REF_DATE);

    expect(result.status).toBe('MISSING_INFO');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('MISSING_INPUT');
    expect(result.reasons[0].field).toBe('cgpa');
  });
});
