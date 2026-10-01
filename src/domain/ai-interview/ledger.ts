import {
  EntityType,
  SlotState,
  FactOrigin,
  FactStatus,
  IntentStatus,
  InterviewEntity,
  InterviewSlot,
  InterviewFact,
  InterviewIntent,
  InterviewTranscript,
  InterviewSessionData,
  InterviewLedgerSnapshot,
} from './types';
import { ChatMessage } from '../ai-interview';

export function normalizeIdentifier(name: string): string {
  if (!name) return 'unnamed';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'item';
}

export function makeEntityId(entityType: EntityType, identifier: string): string {
  const norm = normalizeIdentifier(identifier);
  return `${entityType}|${norm}`;
}

export function makeSlotId(entityId: string, slotName: string): string {
  return `${entityId}|${slotName.toLowerCase().trim()}`;
}

export function makeIntentKey(entityType: EntityType, entityKey: string, slotName: string): string {
  const norm = normalizeIdentifier(entityKey);
  return `${entityType}|${norm}|${slotName.toLowerCase().trim()}`;
}

export class InterviewLedger {
  public session: InterviewSessionData;
  public transcripts: InterviewTranscript[] = [];
  public entities: Map<string, InterviewEntity> = new Map();
  public slots: Map<string, InterviewSlot> = new Map();
  public facts: Map<string, InterviewFact> = new Map();
  public intents: Map<string, InterviewIntent> = new Map();

  constructor(session: InterviewSessionData) {
    this.session = { ...session };
  }

  get sessionId(): string {
    return this.session.id;
  }

  get resumeVersionId(): string {
    return this.session.resumeVersionId;
  }

  get resumeProfileId(): string {
    return this.session.resumeProfileId;
  }

  get currentTurn(): number {
    return this.session.currentTurn;
  }

  get isComplete(): boolean {
    return this.session.isComplete;
  }

  get currentIntentKey(): string | null {
    return this.session.currentIntentKey;
  }

  get summary(): string | null {
    return this.session.summary;
  }

  // -------------------------------------------------------------
  // Transcript Management
  // -------------------------------------------------------------
  addTranscript(role: 'student' | 'ai' | 'system', content: string): InterviewTranscript {
    const trxId = `trx_${Math.random().toString(36).slice(2, 11)}`;
    const transcript: InterviewTranscript = {
      id: trxId,
      sessionId: this.sessionId,
      turn: this.session.currentTurn + 1,
      role,
      content,
      createdAt: new Date(),
    };
    this.transcripts.push(transcript);
    this.session.currentTurn = transcript.turn;
    return transcript;
  }

  getTranscriptsAsChatMessages(): ChatMessage[] {
    return this.transcripts.map((t) => ({
      id: t.id,
      role: t.role === 'ai' ? 'ai' : 'student',
      content: t.content,
      timestamp: typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt,
    }));
  }

  // -------------------------------------------------------------
  // Entity Management
  // -------------------------------------------------------------
  getOrCreateEntity(
    entityType: EntityType,
    rawName: string,
    displayName?: string,
    metadata: Record<string, any> = {}
  ): InterviewEntity {
    const normalizedKey = normalizeIdentifier(rawName);
    const id = `${entityType}|${normalizedKey}`;

    const existing = this.entities.get(id);
    if (existing) {
      if (displayName && (!existing.displayName || existing.displayName === existing.normalizedKey)) {
        existing.displayName = displayName;
      }
      existing.metadata = { ...existing.metadata, ...metadata };
      return existing;
    }

    const newEntity: InterviewEntity = {
      id,
      sessionId: this.sessionId,
      entityType,
      normalizedKey,
      displayName: displayName || rawName.trim(),
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.entities.set(id, newEntity);
    return newEntity;
  }

  getEntity(id: string): InterviewEntity | undefined {
    return this.entities.get(id);
  }

  getEntitiesByType(entityType: EntityType): InterviewEntity[] {
    const result: InterviewEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.entityType === entityType) {
        result.push(entity);
      }
    }
    return result;
  }

  // -------------------------------------------------------------
  // Slot Management
  // -------------------------------------------------------------
  setSlot(
    entityId: string,
    slotName: string,
    state: SlotState,
    value?: any,
    factId?: string | null
  ): InterviewSlot {
    const id = makeSlotId(entityId, slotName);
    const existing = this.slots.get(id);

    const slotRecord: InterviewSlot = {
      id,
      sessionId: this.sessionId,
      entityId,
      slot: slotName,
      state,
      value: value !== undefined ? value : existing?.value,
      factId: factId !== undefined ? factId : existing?.factId,
      updatedAt: new Date(),
    };

    this.slots.set(id, slotRecord);
    return slotRecord;
  }

  getSlot(entityId: string, slotName: string): InterviewSlot | undefined {
    return this.slots.get(makeSlotId(entityId, slotName));
  }

  getSlotsForEntity(entityId: string): InterviewSlot[] {
    const result: InterviewSlot[] = [];
    for (const slot of this.slots.values()) {
      if (slot.entityId === entityId) {
        result.push(slot);
      }
    }
    return result;
  }

  isSlotKnown(entityId: string, slotName: string): boolean {
    const s = this.getSlot(entityId, slotName);
    return s?.state === 'known' || s?.state === 'inferred';
  }

  // -------------------------------------------------------------
  // Fact Provenance Management
  // -------------------------------------------------------------
  addFact(params: {
    entityId: string;
    slot: string;
    value: any;
    rawEvidence: string;
    origin?: FactOrigin;
    confidence?: string;
    sourceFactIds?: string[];
  }): InterviewFact {
    const factId = `fact_${Math.random().toString(36).slice(2, 11)}`;
    const fact: InterviewFact = {
      id: factId,
      sessionId: this.sessionId,
      entityId: params.entityId,
      slot: params.slot,
      value: params.value,
      rawEvidence: params.rawEvidence,
      sourceTurn: this.session.currentTurn,
      confidence: params.confidence || '1.0',
      origin: params.origin || 'explicit',
      status: 'active',
      sourceFactIds: params.sourceFactIds || [],
      createdAt: new Date(),
    };

    this.facts.set(factId, fact);
    this.setSlot(params.entityId, params.slot, 'known', params.value, factId);
    return fact;
  }

  getFactsForEntity(entityId: string): InterviewFact[] {
    const result: InterviewFact[] = [];
    for (const fact of this.facts.values()) {
      if (fact.entityId === entityId && fact.status === 'active') {
        result.push(fact);
      }
    }
    return result;
  }

  getAllFacts(): InterviewFact[] {
    return Array.from(this.facts.values()).filter((f) => f.status === 'active');
  }

  // -------------------------------------------------------------
  // Intent Ledger Management
  // -------------------------------------------------------------
  registerIntent(intentKey: string, status: IntentStatus = 'pending'): InterviewIntent {
    const existing = this.intents.get(intentKey);
    if (existing) {
      if (status !== 'pending') {
        existing.status = status;
        existing.updatedAt = new Date();
      }
      return existing;
    }

    const intent: InterviewIntent = {
      id: intentKey,
      sessionId: this.sessionId,
      intentKey,
      status,
      updatedAt: new Date(),
    };
    this.intents.set(intentKey, intent);
    return intent;
  }

  resolveIntent(intentKey: string): void {
    const intent = this.intents.get(intentKey);
    if (intent) {
      intent.status = 'resolved';
      intent.updatedAt = new Date();
    } else {
      this.registerIntent(intentKey, 'resolved');
    }

    if (this.session.currentIntentKey === intentKey) {
      this.session.currentIntentKey = null;
    }
  }

  isIntentResolved(intentKey: string): boolean {
    const intent = this.intents.get(intentKey);
    return intent?.status === 'resolved';
  }

  // -------------------------------------------------------------
  // Snapshot Serialization
  // -------------------------------------------------------------
  toSnapshot(): InterviewLedgerSnapshot {
    return {
      session: { ...this.session },
      transcripts: [...this.transcripts],
      entities: Array.from(this.entities.values()),
      slots: Array.from(this.slots.values()),
      facts: Array.from(this.facts.values()),
      intents: Array.from(this.intents.values()),
    };
  }

  static fromSnapshot(snapshot: InterviewLedgerSnapshot): InterviewLedger {
    const ledger = new InterviewLedger(snapshot.session);
    ledger.transcripts = snapshot.transcripts || [];

    for (const e of snapshot.entities || []) {
      ledger.entities.set(e.id, e);
    }
    for (const s of snapshot.slots || []) {
      ledger.slots.set(s.id, s);
    }
    for (const f of snapshot.facts || []) {
      ledger.facts.set(f.id, f);
    }
    for (const i of snapshot.intents || []) {
      ledger.intents.set(i.intentKey, i);
    }

    return ledger;
  }

  getCurrentTopic(): string {
    const currentKey = this.session.currentIntentKey;
    if (!currentKey) return 'general';
    const parts = currentKey.split('|');
    return parts[0] || 'general';
  }
}
