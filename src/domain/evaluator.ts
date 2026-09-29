import { StudentProfile, isGradeGte } from './registry';
import { RequirementNode, ScholarshipRequirement, BaseConditionNode, LogicalNode } from './schema';

export type EligibilityStatus = 'MET' | 'NOT_MET' | 'MISSING_INFO';

export type ReasonCode = 
  | 'MISSING_INPUT' 
  | 'BELOW_MINIMUM' 
  | 'NOT_IN_ALLOWED_SET' 
  | 'NOT_MACHINE_CHECKABLE';

export interface EvaluationReason {
  field?: string;
  code: ReasonCode;
  message: string;
}

export interface EvaluationResult {
  status: EligibilityStatus;
  reasons: EvaluationReason[];
}

export function evaluateEligibility(
  profile: StudentProfile,
  requirement: ScholarshipRequirement,
  referenceDate: Date
): EvaluationResult {
  return evaluateNode(profile, requirement.rootNode, referenceDate);
}

function evaluateNode(profile: StudentProfile, node: RequirementNode, referenceDate: Date): EvaluationResult {
  if (node.type === 'ALL') {
    return evaluateAll(profile, node, referenceDate);
  } else if (node.type === 'ANY') {
    return evaluateAny(profile, node, referenceDate);
  } else if (node.type === 'CONDITION') {
    return evaluateCondition(profile, node, referenceDate);
  }
  
  throw new Error(`Unknown node type`);
}

function evaluateAll(profile: StudentProfile, node: LogicalNode, referenceDate: Date): EvaluationResult {
  const reasons: EvaluationReason[] = [];
  let hasMissingInfo = false;
  let hasHardFail = false;

  for (const child of node.nodes) {
    const result = evaluateNode(profile, child, referenceDate);
    if (result.status === 'NOT_MET') {
      hasHardFail = true;
      reasons.push(...result.reasons);
    } else if (result.status === 'MISSING_INFO') {
      hasMissingInfo = true;
      reasons.push(...result.reasons);
    }
  }

  // ALL: MET + NOT_MET -> NOT_MET
  // ALL: NOT_MET + MISSING_INFO -> NOT_MET
  if (hasHardFail) {
    return { status: 'NOT_MET', reasons: reasons.filter(r => r.code !== 'MISSING_INPUT') };
  }
  
  // ALL: MET + MISSING_INFO -> MISSING_INFO
  if (hasMissingInfo) {
    return { status: 'MISSING_INFO', reasons };
  }

  // ALL: MET + MET -> MET
  return { status: 'MET', reasons: [] };
}

function evaluateAny(profile: StudentProfile, node: LogicalNode, referenceDate: Date): EvaluationResult {
  const reasons: EvaluationReason[] = [];
  let hasMissingInfo = false;

  for (const child of node.nodes) {
    const result = evaluateNode(profile, child, referenceDate);
    
    // ANY: MET + anything -> MET
    if (result.status === 'MET') {
      return { status: 'MET', reasons: [] };
    } else if (result.status === 'MISSING_INFO') {
      hasMissingInfo = true;
      reasons.push(...result.reasons);
    } else {
      reasons.push(...result.reasons);
    }
  }

  // ANY: NOT_MET + MISSING_INFO -> MISSING_INFO
  if (hasMissingInfo) {
    return { status: 'MISSING_INFO', reasons: reasons.filter(r => r.code === 'MISSING_INPUT') };
  }

  // ANY: NOT_MET + NOT_MET -> NOT_MET
  return { 
    status: 'NOT_MET', 
    reasons
  };
}

function evaluateCondition(profile: StudentProfile, node: BaseConditionNode, referenceDate: Date): EvaluationResult {
  const { field, operator, value } = node;

  // Handle special nested field for SPM
  if (operator === 'HAS_SPM_SUBJECT_GRADE') {
    if (!profile.spm_results) {
      return { 
        status: 'MISSING_INFO', 
        reasons: [{ field: 'spm_results', code: 'MISSING_INPUT', message: `Missing SPM results for subject ${value.subject}` }] 
      };
    }
    const actualGrade = profile.spm_results[value.subject];
    if (!actualGrade) {
      return { 
        status: 'MISSING_INFO', 
        reasons: [{ field: `spm_results.${value.subject}`, code: 'MISSING_INPUT', message: `Missing grade for SPM subject ${value.subject}` }] 
      };
    }

    if (isGradeGte(actualGrade, value.minGrade)) {
      return { status: 'MET', reasons: [] };
    } else {
      return { 
        status: 'NOT_MET', 
        reasons: [{ 
          field: `spm_results.${value.subject}`, 
          code: 'BELOW_MINIMUM', 
          message: `SPM subject ${value.subject} grade ${actualGrade} is below minimum required ${value.minGrade}` 
        }] 
      };
    }
  }

  // Safely extract field value or evaluate dynamic fields (like age)
  let profileValue: unknown;

  if (field === 'age') {
    if (profile.date_of_birth) {
      const dob = new Date(profile.date_of_birth);
      let computedAge = referenceDate.getFullYear() - dob.getFullYear();
      const m = referenceDate.getMonth() - dob.getMonth();
      // Adjust if birthday hasn't occurred yet in the reference year
      if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) {
        computedAge--;
      }
      profileValue = computedAge;
    } else {
      return { 
        status: 'MISSING_INFO', 
        reasons: [{ field: 'date_of_birth', code: 'MISSING_INPUT', message: `Missing date_of_birth to calculate age` }] 
      };
    }
  } else {
    // Validate if the field is actually machine checkable based on our known StudentProfile schema
    const isCheckable = ['citizenship', 'bumiputera_status', 'income_band', 'household_income', 'cgpa', 'spm_results', 'date_of_birth', 'id'].includes(field);
    
    if (!isCheckable) {
      return {
        status: 'MISSING_INFO', // Treated as missing because we can't deterministically verify it
        reasons: [{ field, code: 'NOT_MACHINE_CHECKABLE', message: `Field ${field} cannot be evaluated automatically from structured data` }]
      };
    }

    profileValue = profile[field as keyof StudentProfile];
  }

  if (profileValue === undefined || profileValue === null) {
    return { 
      status: 'MISSING_INFO', 
      reasons: [{ field, code: 'MISSING_INPUT', message: `Missing required field: ${field}` }] 
    };
  }

  switch (operator) {
    case 'EQUALS':
      return profileValue === value 
        ? { status: 'MET', reasons: [] } 
        : { status: 'NOT_MET', reasons: [{ field, code: 'NOT_IN_ALLOWED_SET', message: `Field ${field} must be exactly ${value}` }] };
    
    case 'NOT_EQUALS':
      return profileValue !== value 
        ? { status: 'MET', reasons: [] } 
        : { status: 'NOT_MET', reasons: [{ field, code: 'NOT_IN_ALLOWED_SET', message: `Field ${field} must not be ${value}` }] };
        
    case 'GREATER_THAN_OR_EQUAL':
      return (profileValue as number) >= (value as number)
        ? { status: 'MET', reasons: [] } 
        : { status: 'NOT_MET', reasons: [{ field, code: 'BELOW_MINIMUM', message: `Field ${field} (${profileValue}) is below minimum ${value}` }] };
        
    case 'LESS_THAN_OR_EQUAL':
      return (profileValue as number) <= (value as number)
        ? { status: 'MET', reasons: [] } 
        : { status: 'NOT_MET', reasons: [{ field, code: 'NOT_IN_ALLOWED_SET', message: `Field ${field} (${profileValue}) is above maximum ${value}` }] };
        
    case 'IN_ARRAY':
      return (value as unknown[]).includes(profileValue)
        ? { status: 'MET', reasons: [] }
        : { status: 'NOT_MET', reasons: [{ field, code: 'NOT_IN_ALLOWED_SET', message: `Field ${field} must be one of: ${(value as unknown[]).join(', ')}` }] };
        
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
