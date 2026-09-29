import { RequirementNode } from './schema';

/**
 * Recursively traverses the Requirement AST to extract a unique list
 * of all fields required by a scholarship.
 * e.g., ['citizenship', 'incomeBand', 'spm_results.Mathematics']
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
        fields.add(n.field);
      }
    }
  }

  traverse(node);
  return Array.from(fields);
}
