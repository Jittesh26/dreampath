import { RequirementNode } from './schema';

/**
 * Normalizes field names (handling camelCase vs snake_case aliases).
 */
export function normalizeFieldName(field: string): string {
  if (field === 'bumiputeraStatus') return 'bumiputera_status';
  if (field === 'incomeBand') return 'income_band';
  if (field === 'householdIncome') return 'household_income';
  if (field === 'spmResults') return 'spm_results';
  if (field === 'dateOfBirth') return 'date_of_birth';
  return field;
}

export const MACHINE_CHECKABLE_FIELDS = new Set([
  'citizenship',
  'age',
  'date_of_birth',
  'cgpa',
  'income_band',
  'household_income',
  'bumiputera_status',
  'id',
]);

/**
 * Checks whether a field can be deterministically answered/evaluated
 * from structured student profile facts.
 */
export function isMachineCheckableField(field: string): boolean {
  if (field.startsWith('spm_results.') || field === 'spm_results') return true;
  const normalized = normalizeFieldName(field);
  return MACHINE_CHECKABLE_FIELDS.has(normalized);
}

/**
 * Recursively traverses the Requirement AST to extract a unique list
 * of all fields required by a scholarship.
 * e.g., ['citizenship', 'income_band', 'spm_results.Mathematics']
 */
export function extractRequiredFields(node: RequirementNode): string[] {
  const fields = new Set<string>();

  function traverse(n: RequirementNode) {
    if (n.type === 'ALL' || n.type === 'ANY') {
      n.nodes.forEach(traverse);
    } else if (n.type === 'CONDITION') {
      if (n.operator === 'HAS_SPM_SUBJECT_GRADE') {
        fields.add(`spm_results.${n.value.subject}`);
      } else {
        fields.add(normalizeFieldName(n.field));
      }
    }
  }

  traverse(node);
  return Array.from(fields);
}

/**
 * Extracts only machine-checkable required fields.
 */
export function extractMachineCheckableFields(node: RequirementNode): string[] {
  return extractRequiredFields(node).filter(isMachineCheckableField);
}

/**
 * Extracts non-machine-checkable criteria fields (e.g. bnm_assessment_centre).
 */
export function extractManualVerificationFields(node: RequirementNode): string[] {
  return extractRequiredFields(node).filter((f) => !isMachineCheckableField(f));
}

/**
 * Returns a human-friendly label for a field or criterion.
 */
export function getCriterionLabel(field: string, subject?: string): string {
  if (subject) return `SPM ${subject}`;
  if (field.startsWith('spm_results.')) {
    return `SPM ${field.replace('spm_results.', '')}`;
  }

  const normalized = normalizeFieldName(field);
  switch (normalized) {
    case 'citizenship':
      return 'Nationality / Citizenship';
    case 'age':
      return 'Age Requirement';
    case 'date_of_birth':
      return 'Date of Birth';
    case 'cgpa':
      return 'Minimum CGPA';
    case 'income_band':
      return 'Household Income Tier';
    case 'household_income':
      return 'Monthly Household Income';
    case 'bumiputera_status':
      return 'Bumiputera Status';
    case 'spm_results':
      return 'SPM Examination Results';
    case 'bnm_assessment_centre':
      return 'Bank Negara Assessment Centre';
    case 'petronas_assessment_centre':
      return 'PETRONAS Assessment Centre';
    case 'shell_interview_assessment':
      return 'Shell Interview & Assessment';
    case 'premier_university_offer':
      return 'Premier University Admission Offer';
    case 'leadership_assessment':
      return 'Leadership & Extracurricular Assessment';
    case 'co_curricular_involvement':
      return 'Active Co-Curricular Involvement';
    case 'research_proposal_defense':
      return 'Research Proposal Defense';
    case 'assessment_centre_uem':
      return 'UEM Assessment Centre';
    case 'mara_assessment_test':
      return 'MARA Assessment Test';
    case 'ytar_leadership_interview':
      return 'YTAR Leadership Interview';
    case 'sarawak_energy_interview':
      return 'Sarawak Energy Interview';
    case 'penang_work_commitment':
      return 'Penang Employment Commitment';
    case 'financial_need_verification':
      return 'Financial Need Verification';
    case 'hlf_panel_interview':
      return 'Hong Leong Foundation Panel Interview';
    case 'top_glove_interview':
      return 'Top Glove Selection Interview';
    case 'aia_interview_assessment':
      return 'AIA Panel Interview Assessment';
    case 'ijm_assessment_centre':
      return 'IJM Assessment Centre';
    case 'genting_panel_interview':
      return 'Genting Malaysia Panel Interview';
    case 'cimb_assessment_and_interview':
      return 'CIMB ASEAN Assessment & Interview';
    case 'yayasan_sarawak_interview':
      return 'Yayasan Sarawak Selection Interview';
    default:
      return field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Returns a human-friendly description of what a criterion node checks.
 */
export function getCriterionDescription(node: RequirementNode): string {
  if (node.type === 'CONDITION') {
    const { field, operator, value } = node;
    const norm = normalizeFieldName(field);

    if (operator === 'HAS_SPM_SUBJECT_GRADE') {
      return `Minimum grade of ${value.minGrade} in SPM ${value.subject}.`;
    }
    if (norm === 'citizenship' && operator === 'EQUALS') {
      return `Must be a ${value} citizen.`;
    }
    if (norm === 'age' && (operator === 'LESS_THAN_OR_EQUAL' || operator === 'GREATER_THAN_OR_EQUAL')) {
      const cmp = operator === 'LESS_THAN_OR_EQUAL' ? 'at most' : 'at least';
      return `Must be ${cmp} ${value} years of age as of intake reference date.`;
    }
    if (norm === 'cgpa' && operator === 'GREATER_THAN_OR_EQUAL') {
      return `Minimum cumulative GPA of ${Number(value).toFixed(2)}.`;
    }
    if (norm === 'income_band') {
      if (operator === 'IN_ARRAY') {
        return `Household income tier must be ${Array.isArray(value) ? value.join(' or ') : value}.`;
      }
      return `Household income tier must be ${value}.`;
    }
    if (norm === 'household_income' && operator === 'LESS_THAN_OR_EQUAL') {
      return `Gross monthly household income must not exceed RM ${Number(value).toLocaleString()}.`;
    }
    if (norm === 'bumiputera_status' && operator === 'EQUALS') {
      return value ? 'Must be of Bumiputera status.' : 'Open to non-Bumiputera applicants.';
    }
    if (!isMachineCheckableField(norm)) {
      return 'This scholarship includes an assessment-centre or circular requirement that DreamPath cannot verify automatically. Please check the official scholarship announcement.';
    }
    return `Requirement on ${getCriterionLabel(field)} (${operator}: ${JSON.stringify(value)}).`;
  }
  if (node.type === 'ANY') {
    return 'Must satisfy at least one of the alternate criteria pathways.';
  }
  return 'Must satisfy all specified criteria.';
}

export interface DetailedCriterion {
  id: string;
  field: string;
  label: string;
  description: string;
  isMachineCheckable: boolean;
  node: RequirementNode;
}

/**
 * Breaks down an AST into individual top-level criteria suitable
 * for audit display and progress tracking.
 */
export function extractDetailedCriteria(node: RequirementNode): DetailedCriterion[] {
  if (node.type === 'ALL') {
    return node.nodes.map((child, index) => {
      let field = 'composite';
      if (child.type === 'CONDITION') {
        field = child.operator === 'HAS_SPM_SUBJECT_GRADE'
          ? `spm_results.${child.value.subject}`
          : normalizeFieldName(child.field);
      }
      return {
        id: `crit_${index}_${field}`,
        field,
        label: getCriterionLabel(field),
        description: getCriterionDescription(child),
        isMachineCheckable: isMachineCheckableField(field),
        node: child,
      };
    });
  }

  const field = node.type === 'CONDITION'
    ? (node.operator === 'HAS_SPM_SUBJECT_GRADE' ? `spm_results.${node.value.subject}` : normalizeFieldName(node.field))
    : 'composite';

  return [
    {
      id: `crit_0_${field}`,
      field,
      label: getCriterionLabel(field),
      description: getCriterionDescription(node),
      isMachineCheckable: isMachineCheckableField(field),
      node,
    },
  ];
}
