import { db } from '@/db';
import {
  interviewSessions,
  interviewTranscripts,
  interviewEntities,
  interviewSlots,
  interviewFacts,
  interviewIntents,
} from '@/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { InterviewLedger } from './ledger';
import { InterviewSessionData } from './types';

/**
 * Robust Interview Persistence Layer
 *
 * Distinguishes existing records from new records safely:
 * - Fetches existing IDs for the session in a single set check
 * - Inserts newly generated records (e.g. trx_w0vrumlu7)
 * - Updates existing records without executing failing queries
 * - Completely eliminates the single-record select error
 */
export async function saveSessionSnapshot(ledger: InterviewLedger): Promise<void> {
  const sessionId = ledger.sessionId;

  // 1. Persist or Update Session
  const [existingSession] = await db
    .select({ id: interviewSessions.id })
    .from(interviewSessions)
    .where(eq(interviewSessions.id, sessionId));

  if (existingSession) {
    await db
      .update(interviewSessions)
      .set({
        currentTurn: ledger.currentTurn,
        isComplete: ledger.isComplete,
        currentIntentKey: ledger.currentIntentKey,
        summary: ledger.summary,
        updatedAt: new Date(),
      })
      .where(eq(interviewSessions.id, sessionId));
  } else {
    await db.insert(interviewSessions).values({
      id: sessionId,
      resumeVersionId: ledger.resumeVersionId,
      resumeProfileId: ledger.resumeProfileId,
      currentTurn: ledger.currentTurn,
      isComplete: ledger.isComplete,
      currentIntentKey: ledger.currentIntentKey,
      summary: ledger.summary,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 2. Persist Transcripts
  const existingTrxRows = await db
    .select({ id: interviewTranscripts.id })
    .from(interviewTranscripts)
    .where(eq(interviewTranscripts.sessionId, sessionId));
  const existingTrxIds = new Set(existingTrxRows.map((r) => r.id));

  for (const trx of ledger.transcripts) {
    if (!existingTrxIds.has(trx.id)) {
      await db.insert(interviewTranscripts).values({
        id: trx.id,
        sessionId,
        turn: trx.turn,
        role: trx.role,
        content: trx.content,
        createdAt: trx.createdAt ? new Date(trx.createdAt) : new Date(),
      });
      existingTrxIds.add(trx.id);
    }
  }

  // 3. Persist Entities
  const existingEntityRows = await db
    .select({ id: interviewEntities.id })
    .from(interviewEntities);
  const existingEntityIds = new Set(existingEntityRows.map((r) => r.id));

  for (const entity of ledger.entities.values()) {
    if (!existingEntityIds.has(entity.id)) {
      await db.insert(interviewEntities).values({
        id: entity.id,
        sessionId,
        entityType: entity.entityType,
        normalizedKey: entity.normalizedKey,
        displayName: entity.displayName,
        metadata: entity.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      existingEntityIds.add(entity.id);
    } else {
      await db
        .update(interviewEntities)
        .set({
          sessionId,
          displayName: entity.displayName,
          metadata: entity.metadata || {},
          updatedAt: new Date(),
        })
        .where(eq(interviewEntities.id, entity.id));
    }
  }

  // 4. Persist Slots
  const existingSlotRows = await db
    .select({ id: interviewSlots.id })
    .from(interviewSlots);
  const existingSlotIds = new Set(existingSlotRows.map((r) => r.id));

  for (const slot of ledger.slots.values()) {
    if (!existingSlotIds.has(slot.id)) {
      await db.insert(interviewSlots).values({
        id: slot.id,
        sessionId,
        entityId: slot.entityId,
        slot: slot.slot,
        state: slot.state,
        value: slot.value !== undefined ? slot.value : null,
        factId: slot.factId || null,
        updatedAt: new Date(),
      });
      existingSlotIds.add(slot.id);
    } else {
      await db
        .update(interviewSlots)
        .set({
          sessionId,
          state: slot.state,
          value: slot.value !== undefined ? slot.value : null,
          factId: slot.factId || null,
          updatedAt: new Date(),
        })
        .where(eq(interviewSlots.id, slot.id));
    }
  }

  // 5. Persist Facts
  const existingFactRows = await db
    .select({ id: interviewFacts.id })
    .from(interviewFacts)
    .where(eq(interviewFacts.sessionId, sessionId));
  const existingFactIds = new Set(existingFactRows.map((r) => r.id));

  for (const fact of ledger.facts.values()) {
    if (!existingFactIds.has(fact.id)) {
      await db.insert(interviewFacts).values({
        id: fact.id,
        sessionId,
        entityId: fact.entityId,
        slot: fact.slot,
        value: fact.value,
        rawEvidence: fact.rawEvidence,
        sourceTurn: fact.sourceTurn,
        confidence: fact.confidence || '1.0',
        origin: fact.origin || 'explicit',
        status: fact.status || 'active',
        sourceFactIds: fact.sourceFactIds || [],
        createdAt: new Date(),
      });
      existingFactIds.add(fact.id);
    }
  }

  // 6. Persist Intents
  const existingIntentRows = await db
    .select({ id: interviewIntents.id })
    .from(interviewIntents);
  const existingIntentIds = new Set(existingIntentRows.map((r) => r.id));

  for (const intent of ledger.intents.values()) {
    if (!existingIntentIds.has(intent.id)) {
      await db.insert(interviewIntents).values({
        id: intent.id,
        sessionId,
        intentKey: intent.intentKey,
        status: intent.status || 'pending',
        updatedAt: new Date(),
      });
      existingIntentIds.add(intent.id);
    } else {
      await db
        .update(interviewIntents)
        .set({
          sessionId,
          status: intent.status,
          updatedAt: new Date(),
        })
        .where(eq(interviewIntents.id, intent.id));
    }
  }
}

/**
 * Loads an interview session snapshot by resumeVersionId.
 */
export async function loadSessionSnapshot(resumeVersionId: string): Promise<InterviewLedger | null> {
  const [sessionRow] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.resumeVersionId, resumeVersionId))
    .orderBy(desc(interviewSessions.updatedAt));

  if (!sessionRow) {
    return null;
  }

  const sessionId = sessionRow.id;

  // Transcripts ordered by turn
  const transcriptRows = await db
    .select()
    .from(interviewTranscripts)
    .where(eq(interviewTranscripts.sessionId, sessionId))
    .orderBy(asc(interviewTranscripts.turn));

  // Entities
  const entityRows = await db
    .select()
    .from(interviewEntities)
    .where(eq(interviewEntities.sessionId, sessionId));

  // Slots
  const slotRows = await db
    .select()
    .from(interviewSlots)
    .where(eq(interviewSlots.sessionId, sessionId));

  // Facts
  const factRows = await db
    .select()
    .from(interviewFacts)
    .where(eq(interviewFacts.sessionId, sessionId));

  // Intents
  const intentRows = await db
    .select()
    .from(interviewIntents)
    .where(eq(interviewIntents.sessionId, sessionId));

  const sessionData: InterviewSessionData = {
    id: sessionRow.id,
    resumeVersionId: sessionRow.resumeVersionId as string,
    resumeProfileId: sessionRow.resumeProfileId as string,
    currentTurn: sessionRow.currentTurn,
    isComplete: sessionRow.isComplete,
    currentIntentKey: sessionRow.currentIntentKey,
    summary: sessionRow.summary,
    createdAt: sessionRow.createdAt,
    updatedAt: sessionRow.updatedAt,
  };

  const ledger = new InterviewLedger(sessionData);

  ledger.transcripts = transcriptRows.map((t) => ({
    id: t.id,
    sessionId: t.sessionId,
    turn: t.turn,
    role: t.role as 'student' | 'ai' | 'system',
    content: t.content,
    createdAt: t.createdAt,
  }));

  for (const e of entityRows) {
    ledger.entities.set(e.id, {
      id: e.id,
      sessionId: e.sessionId,
      entityType: e.entityType as any,
      normalizedKey: e.normalizedKey,
      displayName: e.displayName,
      metadata: (e.metadata || {}) as Record<string, any>,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  for (const s of slotRows) {
    ledger.slots.set(s.id, {
      id: s.id,
      sessionId: s.sessionId,
      entityId: s.entityId,
      slot: s.slot,
      state: s.state as any,
      value: s.value,
      factId: s.factId,
      updatedAt: s.updatedAt,
    });
  }

  for (const f of factRows) {
    ledger.facts.set(f.id, {
      id: f.id,
      sessionId: f.sessionId,
      entityId: f.entityId,
      slot: f.slot,
      value: f.value,
      rawEvidence: f.rawEvidence,
      sourceTurn: f.sourceTurn,
      confidence: f.confidence,
      origin: f.origin as any,
      status: f.status as any,
      sourceFactIds: (f.sourceFactIds || []) as string[],
      createdAt: f.createdAt,
    });
  }

  for (const i of intentRows) {
    ledger.intents.set(i.intentKey, {
      id: i.id,
      sessionId: i.sessionId,
      intentKey: i.intentKey,
      status: i.status as any,
      updatedAt: i.updatedAt,
    });
  }

  return ledger;
}

/**
 * Resets and purges the interview session for a resume version.
 */
export async function deleteSession(resumeVersionId: string): Promise<void> {
  const sessions = await db
    .select({ id: interviewSessions.id })
    .from(interviewSessions)
    .where(eq(interviewSessions.resumeVersionId, resumeVersionId));

  for (const s of sessions) {
    try {
      await db.delete(interviewTranscripts).where(eq(interviewTranscripts.sessionId, s.id));
      await db.delete(interviewSlots).where(eq(interviewSlots.sessionId, s.id));
      await db.delete(interviewFacts).where(eq(interviewFacts.sessionId, s.id));
      await db.delete(interviewEntities).where(eq(interviewEntities.sessionId, s.id));
      await db.delete(interviewIntents).where(eq(interviewIntents.sessionId, s.id));
    } catch {
      // In case Postgres cascade already handled it
    }
  }

  await db
    .delete(interviewSessions)
    .where(eq(interviewSessions.resumeVersionId, resumeVersionId));
}