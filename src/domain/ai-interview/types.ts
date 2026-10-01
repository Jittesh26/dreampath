import { z } from 'zod';
import { ChatMessage, ExtractedFact } from '../ai-interview';
import { ResumeContent } from '../resume';

// -------------------------------------------------------------
// Approved Entity Types
// -------------------------------------------------------------
export const ENTITY_TYPES = [
  'personal',
  'education',
  'pre_university',
  'experience',
  'project',
  'leadership',
  'achievement',
  'certification',
  'extracurricular',
  'skill',
  'language',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// -------------------------------------------------------------
// Approved Slot States
// -------------------------------------------------------------
export const SLOT_STATES = [
  'unknown',
  'known',
  'inferred',
  'declared_none',
  'skipped',
  'uncertain',
  'conflicted',
] as const;

export type SlotState = (typeof SLOT_STATES)[number];

// -------------------------------------------------------------
// Fact Provenance & Intent Types
// -------------------------------------------------------------
export type FactOrigin = 'explicit' | 'inferred' | 'system';
export type FactStatus = 'active' | 'superseded' | 'conflicted' | 'deleted';
export type IntentStatus = 'pending' | 'active' | 'resolved' | 'skipped';

export interface InterviewEntity {
  id: string; // <entity_type>|<normalized_key>
  sessionId: string;
  entityType: EntityType;
  normalizedKey: string;
  displayName: string;
  metadata: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InterviewSlot {
  id: string; // <entity_id>|<slot_name>
  sessionId: string;
  entityId: string;
  slot: string;
  state: SlotState;
  value?: any;
  factId?: string | null;
  updatedAt?: Date | string;
}

export interface InterviewFact {
  id: string;
  sessionId: string;
  entityId: string;
  slot: string;
  value: any;
  rawEvidence: string;
  sourceTurn: number;
  confidence: string; // e.g. "1.0"
  origin: FactOrigin;
  status: FactStatus;
  sourceFactIds: string[];
  createdAt?: Date | string;
}

export interface InterviewIntent {
  id: string; // <entity_type>|<entity_key>|<slot_name>
  sessionId: string;
  intentKey: string;
  status: IntentStatus;
  updatedAt?: Date | string;
}

export interface InterviewTranscript {
  id: string; // trx_...
  sessionId: string;
  turn: number;
  role: 'student' | 'ai' | 'system';
  content: string;
  createdAt: Date | string;
}

export interface InterviewSessionData {
  id: string;
  resumeVersionId: string;
  resumeProfileId: string;
  currentTurn: number;
  isComplete: boolean;
  currentIntentKey: string | null;
  summary: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InterviewLedgerSnapshot {
  session: InterviewSessionData;
  transcripts: InterviewTranscript[];
  entities: InterviewEntity[];
  slots: InterviewSlot[];
  facts: InterviewFact[];
  intents: InterviewIntent[];
}

export interface PlanNextIntentResult {
  intentKey: string | null;
  isComplete: boolean;
  targetEntityId?: string;
  slotName?: string;
  suggestedPrompt: string;
  topic: string;
}

export interface ExtractionResult {
  entities: InterviewEntity[];
  slots: InterviewSlot[];
  facts: InterviewFact[];
  resolvedIntentKeys: string[];
  declaredNoneCategories: EntityType[];
}
