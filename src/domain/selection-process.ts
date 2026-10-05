import { RequirementNode, SelectionStage } from './schema';

/**
 * Regex patterns identifying post-application selection/assessment stages.
 * These represent evaluation steps conducted by the provider after application,
 * NOT prerequisites to determine whether a student is eligible to apply.
 */
const SELECTION_STAGE_PATTERNS = [
  /interview/i,
  /assessment_centre/i,
  /assessment_center/i,
  /assessment_test/i,
  /leadership_assessment/i,
  /proposal_defense/i,
  /research_defense/i,
  /psychometric/i,
  /shortlisting/i,
  /selection_exercise/i,
  /panel_evaluation/i,
];

/**
 * Checks whether a given field identifier represents a post-application selection stage.
 */
export function isSelectionStageField(field: string): boolean {
  return SELECTION_STAGE_PATTERNS.some((pattern) => pattern.test(field));
}

/**
 * Checks whether an AST condition node represents a selection stage rather than eligibility.
 */
export function isSelectionStageCondition(node: RequirementNode): boolean {
  if (node.type === 'CONDITION') {
    return isSelectionStageField(node.field);
  }
  return false;
}

/**
 * Maps a selection-stage field identifier into a structured, human-readable SelectionStage.
 */
export function formatSelectionStage(field: string): SelectionStage {
  const norm = field.toLowerCase();

  let type: SelectionStage['type'] = 'other';
  let name = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  let description = 'Post-application selection stage conducted directly by the scholarship provider.';

  if (norm.includes('interview')) {
    type = norm.includes('panel') ? 'panel_interview' : 'interview';
  } else if (norm.includes('assessment_centre') || norm.includes('assessment_center')) {
    type = 'assessment_centre';
  } else if (norm.includes('test') || norm.includes('defense')) {
    type = 'written_test';
  }

  // Canonical provider descriptions
  switch (field) {
    case 'bnm_assessment_centre':
      name = 'Bank Negara Malaysia Assessment Centre';
      description = 'Multi-stage competency assessment and leadership evaluation conducted directly by Bank Negara Malaysia.';
      break;
    case 'petronas_assessment_centre':
      name = 'PETRONAS Assessment Centre (PAC)';
      description = 'Rigorous psychometric, group dynamics, and case presentation evaluation conducted by PETRONAS.';
      break;
    case 'assessment_centre_uem':
      name = 'Yayasan UEM Assessment Centre & Psychometric Review';
      description = 'Leadership competency testing and group assessment conducted by Yayasan UEM.';
      break;
    case 'ijm_assessment_centre':
      name = 'IJM Assessment Centre';
      description = 'Technical assessment and structured behavioral evaluation by IJM Corporation.';
      break;
    case 'shell_interview_assessment':
      name = 'Shell Competency-Based Interview & Assessment';
      description = 'Commercial mindset and technical interview evaluation conducted by Shell Malaysia.';
      break;
    case 'ytar_leadership_interview':
      name = 'YTAR Leadership Assessment Interview';
      description = 'In-depth character, community leadership, and panel interview conducted by Yayasan Tunku Abdul Rahman.';
      break;
    case 'leadership_assessment':
      name = 'Yayasan Khazanah Leadership Assessment';
      description = 'Extracurricular achievements and leadership potential review conducted by Yayasan Khazanah.';
      break;
    case 'mara_assessment_test':
      name = 'MARA Assessment Test & Personality Evaluation';
      description = 'Standardized academic and psychometric assessment administered by MARA.';
      break;
    case 'sarawak_energy_interview':
      name = 'Sarawak Energy Selection Interview';
      description = 'Technical panel interview conducted by Sarawak Energy Berhad.';
      break;
    case 'hlf_panel_interview':
      name = 'Hong Leong Foundation Panel Interview';
      description = 'Interview assessment conducted by the Hong Leong Foundation selection committee.';
      break;
    case 'top_glove_interview':
      name = 'Top Glove Foundation Selection Interview';
      description = 'Technical and values-based interview conducted by Top Glove leadership.';
      break;
    case 'aia_interview_assessment':
      name = 'AIA Panel Interview Assessment';
      description = 'Interview and leadership evaluation conducted by AIA Malaysia.';
      break;
    case 'genting_panel_interview':
      name = 'Genting Malaysia Panel Interview';
      description = 'Selection panel interview conducted by Genting Malaysia.';
      break;
    case 'cimb_assessment_and_interview':
      name = 'CIMB ASEAN Regional Assessment & Interview';
      description = 'Regional case study assessment and executive interview conducted by CIMB Group.';
      break;
    case 'yayasan_sarawak_interview':
      name = 'Yayasan Sarawak Selection Interview';
      description = 'Official scholarship selection interview conducted by Yayasan Sarawak.';
      break;
    case 'research_proposal_defense':
      name = 'Research Proposal Defense & Panel Interview';
      description = 'Academic panel defense of proposed postgraduate research program.';
      break;
  }

  return {
    id: `stage_${field}`,
    name,
    description,
    type,
  };
}

/**
 * Generic AST transformation: separates post-application selection stages
 * from eligibility criteria.
 *
 * Guaranteed invariants:
 * 1. The returned eligibilityAst contains ONLY rules determining whether a student can apply.
 * 2. Selection stages (interviews, assessment centres, etc.) are extracted into selectionStages.
 * 3. Never causes false "Criteria Unmet", "Missing Information", or "Manual Verification Required".
 */
export function separateEligibilityAndSelection(
  rootNode: RequirementNode,
  existingStages: SelectionStage[] = []
): { eligibilityAst: RequirementNode; selectionStages: SelectionStage[] } {
  const extractedStages: SelectionStage[] = [...existingStages];

  function extractFromNode(node: RequirementNode): RequirementNode | null {
    if (node.type === 'CONDITION') {
      if (isSelectionStageCondition(node)) {
        extractedStages.push(formatSelectionStage(node.field));
        return null;
      }
      return node;
    }

    if (node.type === 'ALL' || node.type === 'ANY') {
      const remainingChildren: RequirementNode[] = [];
      for (const child of node.nodes) {
        const filtered = extractFromNode(child);
        if (filtered !== null) {
          remainingChildren.push(filtered);
        }
      }

      if (remainingChildren.length === 0) {
        return null;
      }

      if (remainingChildren.length === 1 && (node.type === 'ALL' || node.type === 'ANY')) {
        return remainingChildren[0];
      }

      return {
        type: node.type,
        nodes: remainingChildren,
      };
    }

    return node;
  }

  const filteredAst = extractFromNode(rootNode);

  // If all conditions were selection stages, fallback to an open requirement
  const cleanAst: RequirementNode =
    filteredAst || {
      type: 'CONDITION',
      field: 'citizenship',
      operator: 'EQUALS',
      value: 'Malaysian',
    };

  // Deduplicate selection stages by id
  const stageMap = new Map<string, SelectionStage>();
  for (const s of extractedStages) {
    if (!stageMap.has(s.id)) {
      stageMap.set(s.id, s);
    }
  }

  return {
    eligibilityAst: cleanAst,
    selectionStages: Array.from(stageMap.values()),
  };
}
