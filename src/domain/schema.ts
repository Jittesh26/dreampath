import { z } from 'zod';

export type ConditionOperator = 
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN_ARRAY'
  | 'HAS_SPM_SUBJECT_GRADE'; // value structure: { subject: string, minGrade: string }

export interface BaseConditionNode {
  type: 'CONDITION';
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface LogicalNode {
  type: 'ALL' | 'ANY';
  nodes: RequirementNode[];
}

export type RequirementNode = BaseConditionNode | LogicalNode;

export interface SelectionStage {
  id: string;
  name: string;
  description?: string;
  type?: 'interview' | 'assessment_centre' | 'written_test' | 'panel_interview' | 'review' | 'other';
}

export interface ScholarshipRequirement {
  id: string;
  name: string;
  rootNode: RequirementNode;
  selectionStages?: SelectionStage[];
}

export const selectionStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['interview', 'assessment_centre', 'written_test', 'panel_interview', 'review', 'other']).optional(),
});

export const conditionOperatorSchema = z.enum([
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL',
  'IN_ARRAY',
  'HAS_SPM_SUBJECT_GRADE',
]);

export const baseConditionNodeSchema = z.object({
  type: z.literal('CONDITION'),
  field: z.string().min(1, 'Field cannot be empty'),
  operator: conditionOperatorSchema,
  value: z.any().refine((v) => v !== undefined, { message: 'Condition value must be defined' }),
});

export const requirementNodeSchema: z.ZodType<RequirementNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    baseConditionNodeSchema,
    z.object({
      type: z.enum(['ALL', 'ANY']),
      nodes: z.array(requirementNodeSchema).min(1, 'Logical node must contain at least one condition'),
    }),
  ])
);

export function validateRequirementNode(data: unknown): RequirementNode {
  return requirementNodeSchema.parse(data);
}

