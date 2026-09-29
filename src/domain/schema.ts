import { SPMGrade } from './registry';

export type ConditionOperator = 
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN_ARRAY'
  | 'HAS_SPM_SUBJECT_GRADE'; // value structure: { subject: string, minGrade: SPMGrade }

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

export interface ScholarshipRequirement {
  id: string;
  name: string;
  rootNode: RequirementNode;
}
