'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { resumeFacts, resumeProfiles, resumeVersions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MockResumeAIProvider } from '../../lib/ai/mock-provider';
import { GeminiResumeAIProvider } from '../../lib/ai/gemini-provider';
import {
  ChatMessage,
  ExtractedFact,
  extractedFactSchema,
  generatedWordingSchema,
  ResumeAIProvider,
} from '../../domain/ai-interview';
import {
  InterviewLedger,
  loadSessionSnapshot,
  saveSessionSnapshot,
  deleteSession,
  deterministicPlanner,
  deterministicExtractor,
  providerCascade,
  redactSensitiveData,
  synthesizeResumeFromLedger,
} from '../../domain/ai-interview/index';
import { resumeContentSchema, ResumeContent } from '../../domain/resume';
import { mergeResumeContent } from '../../domain/resume-merge';

function getProvider(): ResumeAIProvider {
  if (!process.env.VITEST && process.env.NODE_ENV !== 'test' && (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY)) {
    try {
      return new GeminiResumeAIProvider();
    } catch (err: any) {
      console.error('[AI] GeminiResumeAIProvider failed to initialise:', err?.message);
    }
  }
  return new MockResumeAIProvider();
}

/**
 * Validates the authenticated student and ensures their profile exists.
 */
async function requireResumeProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  let profile = await db.query.resumeProfiles.findFirst({
    where: eq(resumeProfiles.userId, user.id),
  });

  if (!profile) {
    const inserted = await db.insert(resumeProfiles)
      .values({ userId: user.id })
      .returning();
    profile = inserted[0];
  }

  return { profile, user };
}

/**
 * Validates that the active user owns the specified resume version.
 */
async function requireResumeOwnership(resumeId: string) {
  const { profile, user } = await requireResumeProfile();

  const version = await db.query.resumeVersions.findFirst({
    where: and(
      eq(resumeVersions.id, resumeId),
      eq(resumeVersions.resumeProfileId, profile.id)
    ),
  });

  if (!version) {
    throw new Error('Resume not found or unauthorized');
  }

  return { profile, user, version };
}

/**
 * Retrieves the persisted interview session state for a specific resume.
 * Uses interview_sessions / interview_transcripts as source of truth.
 */
export async function getInterviewSession(resumeId: string) {
  const { profile } = await requireResumeOwnership(resumeId);

  // 1. Load session from authoritative interview tables
  let ledger = await loadSessionSnapshot(resumeId);

  // 2. If no interview session exists yet, initialize a clean one
  if (!ledger) {
    const sessionId = `session_${crypto.randomUUID()}`;
    ledger = new InterviewLedger({
      id: sessionId,
      resumeVersionId: resumeId,
      resumeProfileId: profile.id,
      currentTurn: 0,
      isComplete: false,
      currentIntentKey: 'education|general|overview',
      summary: null,
    });

    // Add initial greeting transcript
    ledger.addTranscript(
      'ai',
      "Hello! Let's build your resume together. What are you currently studying and where?"
    );
    ledger.registerIntent('education|general|overview', 'active');

    // Safely persist initial snapshot
    await saveSessionSnapshot(ledger);
  }

  const messages = ledger.getTranscriptsAsChatMessages();
  return {
    messages,
    isComplete: ledger.isComplete,
    topic: ledger.getCurrentTopic(),
    sessionId: ledger.sessionId,
  };
}

/**
 * Resets the interview session for a fresh conversation.
 */
export async function resetInterviewSession(resumeId: string) {
  const { profile } = await requireResumeOwnership(resumeId);

  // 1. Purge from authoritative interview tables
  await deleteSession(resumeId);

  // 2. Update downstream resume version state
  await db.update(resumeVersions)
    .set({
      interviewState: {},
      updatedAt: new Date(),
    })
    .where(eq(resumeVersions.id, resumeId));

  // Remove facts specifically associated with this resume version
  await db.delete(resumeFacts)
    .where(
      and(
        eq(resumeFacts.resumeVersionId, resumeId),
        eq(resumeFacts.resumeProfileId, profile.id)
      )
    );

  revalidatePath(`/student/resume/${resumeId}`);
  return { success: true };
}

/**
 * Core Deterministic Interview Turn:
 * 1. Redacts sensitive data before storage and LLM transmission.
 * 2. Extracts entities, slots, and facts deterministically.
 * 3. Advances deterministic planner to pick next target intent.
 * 4. Phrases conversational follow-up via provider cascade.
 * 5. Persists session snapshot to interview tables safely.
 */
export async function submitInterviewTurn(params: {
  resumeId: string;
  history: ChatMessage[];
  answer: string;
}) {
  const { resumeId, answer } = params;
  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error('Answer cannot be empty');
  }

  const { profile, user } = await requireResumeOwnership(resumeId);

  // 1. Redact sensitive secrets (NRIC, cards, passwords, etc.)
  const redaction = redactSensitiveData(trimmed);
  const safeAnswer = redaction.text;

  // 2. Load or initialize authoritative session ledger
  let ledger = await loadSessionSnapshot(resumeId);
  if (!ledger) {
    ledger = new InterviewLedger({
      id: `session_${crypto.randomUUID()}`,
      resumeVersionId: resumeId,
      resumeProfileId: profile.id,
      currentTurn: 0,
      isComplete: false,
      currentIntentKey: 'education|general|overview',
      summary: null,
    });
    ledger.addTranscript('ai', "Hello! Let's build your resume together. What are you currently studying and where?");
  }

  // Pre-populate verified profile data if available so we do not re-ask known facts
  const authName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  if (authName && !ledger.isSlotKnown('personal|self', 'fullName')) {
    const pers = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
    ledger.addFact({
      entityId: pers.id,
      slot: 'fullName',
      value: authName,
      rawEvidence: 'Verified profile metadata',
      origin: 'system',
    });
    ledger.resolveIntent('personal|self|fullName');
  }
  if (user?.email && !ledger.isSlotKnown('personal|self', 'email')) {
    const pers = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
    ledger.addFact({
      entityId: pers.id,
      slot: 'email',
      value: user.email,
      rawEvidence: 'Verified account email',
      origin: 'system',
    });
  }

  // 3. Record student turn in transcript
  ledger.addTranscript('student', safeAnswer);

  // 4. Extract entities, slots, and facts deterministically
  deterministicExtractor.extract(safeAnswer, ledger);

  // 5. Deterministic Planner picks next intent
  const plan = deterministicPlanner.planNextIntent(ledger);
  ledger.session.isComplete = plan.isComplete;
  ledger.session.currentIntentKey = plan.intentKey;

  if (plan.intentKey) {
    ledger.registerIntent(plan.intentKey, 'active');
  }

  // 6. Conversational question phrasing via Provider Cascade:
  // Gemini -> Groq -> Mistral -> OpenRouter -> deterministic template
  let phrasedQuestion = plan.suggestedPrompt;
  if (!plan.isComplete) {
    const cascadeResult = await providerCascade.phraseQuestion({
      intentKey: plan.intentKey || 'general',
      slotName: plan.slotName,
      template: plan.suggestedPrompt,
      topic: plan.topic,
      ledger,
      latestAnswer: safeAnswer,
    });
    phrasedQuestion = cascadeResult.text;
  }

  // 7. Record AI turn in transcript
  ledger.addTranscript('ai', phrasedQuestion);

  // 8. Safely save snapshot to authoritative interview tables
  await saveSessionSnapshot(ledger);

  const updatedMessages = ledger.getTranscriptsAsChatMessages();

  // 9. Update downstream resume version state for fast client UI sync
  await db.update(resumeVersions)
    .set({
      interviewState: {
        messages: updatedMessages,
        isComplete: ledger.isComplete,
        currentTopic: plan.topic,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(resumeVersions.id, resumeId));

  return {
    nextQuestion: phrasedQuestion,
    isComplete: ledger.isComplete,
    topic: plan.topic,
    extractedCount: ledger.getAllFacts().length,
    messages: updatedMessages,
  };
}

/**
 * Consolidated Resume Synthesis & Automated Save:
 * Synthesizes strictly from verified facts in the interview ledger.
 * No invented achievements, metrics, or technologies.
 */
export async function synthesizeAndSaveResume(resumeId: string) {
  const { version, user } = await requireResumeOwnership(resumeId);

  // 1. Load authoritative session ledger
  const ledger = await loadSessionSnapshot(resumeId);

  let synthesizedContent: ResumeContent;

  if (ledger && ledger.getAllFacts().length > 0) {
    // Primary path: synthesize directly from interview facts
    synthesizedContent = synthesizeResumeFromLedger(ledger);
    ledger.session.isComplete = true;
    await saveSessionSnapshot(ledger);
  } else {
    // Downstream fallback: synthesize from legacy resumeFacts if present
    const provider = getProvider();
    const confirmedFactsRaw = await db.query.resumeFacts.findMany({
      where: and(
        eq(resumeFacts.resumeVersionId, resumeId),
        eq(resumeFacts.isConfirmed, true)
      ),
    });
    const confirmedFacts: ExtractedFact[] = confirmedFactsRaw.map((f: any) =>
      extractedFactSchema.parse({
        id: f.id,
        category: f.category,
        originalAnswer: f.originalAnswer || '',
        structuredData: f.content,
        isConfirmed: true,
      })
    );
    const rawWording = await provider.generateProfessionalWording(confirmedFacts);
    const validatedWording = generatedWordingSchema.parse(rawWording);
    const current = (version.content || {}) as ResumeContent;
    synthesizedContent = mergeResumeContent(current, validatedWording);
  }

  // 2. Semantically merge with existing resume content
  const currentContent = (version.content || {}) as ResumeContent;
  const mergedContent = mergeResumeContent(currentContent, synthesizedContent);

  // Ensure personal section uses real user data, never placeholder strings
  const authName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim();
  const authEmail = (user?.email || '').trim();

  if (mergedContent.personal) {
    if (!mergedContent.personal.fullName && authName) {
      mergedContent.personal.fullName = authName;
    }
    if ((!mergedContent.personal.email || !mergedContent.personal.email.includes('@')) && authEmail.includes('@')) {
      mergedContent.personal.email = authEmail;
    }
  } else if (authName && authEmail.includes('@')) {
    mergedContent.personal = {
      fullName: authName,
      email: authEmail,
      phone: '',
      location: '',
      professionalSummary: '',
    };
  }

  // Final guard: personal section must have valid fullName and email for schema validation.
  // Never save placeholders like "Student Scholar" or "Your Full Name", and never invent fake names.
  // If real name is unavailable, leave personal section unresolved.
  if (mergedContent.personal) {
    if (!mergedContent.personal.fullName || !mergedContent.personal.email?.includes('@')) {
      delete mergedContent.personal;
    }
  }

  const validatedFinalContent = resumeContentSchema.parse(mergedContent);

  // 3. Persist to resume_versions
  const updatedVersion = await db.update(resumeVersions)
    .set({
      content: validatedFinalContent,
      interviewState: {
        ...(version.interviewState as Record<string, unknown>),
        isComplete: true,
        lastSynthesizedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(resumeVersions.id, resumeId))
    .returning();

  revalidatePath('/student/resume');
  revalidatePath(`/student/resume/${resumeId}`);

  return {
    success: true,
    content: validatedFinalContent,
    title: updatedVersion[0]?.title || version.title,
  };
}

// -------------------------------------------------------------
// Legacy & Compatibility Server Actions (for tests & backward-compatibility)
// -------------------------------------------------------------

export async function askQuestion(history: ChatMessage[]) {
  await requireResumeProfile();
  const provider = getProvider();
  return await provider.generateNextQuestion(history);
}

export async function processStudentAnswer(history: ChatMessage[], answer: string) {
  const { profile } = await requireResumeProfile();
  const provider = getProvider();
  const rawFacts = await provider.extractFacts(history, answer);
  const extractedFacts = rawFacts.map((fact) => extractedFactSchema.parse(fact));

  const savedFacts = [];
  for (const fact of extractedFacts) {
    const inserted = await db.insert(resumeFacts).values({
      resumeProfileId: profile.id,
      category: fact.category,
      source: 'ai',
      originalAnswer: fact.originalAnswer,
      content: fact.structuredData,
      isConfirmed: false,
    }).returning();
    savedFacts.push(inserted[0]);
  }

  return savedFacts;
}

export async function confirmFact(factId: string, editedContent?: unknown) {
  const { profile } = await requireResumeProfile();
  const fact = await db.query.resumeFacts.findFirst({
    where: and(eq(resumeFacts.id, factId), eq(resumeFacts.resumeProfileId, profile.id)),
  });

  if (!fact) throw new Error('Fact not found or unauthorized');

  const updated = await db.update(resumeFacts).set({
    isConfirmed: true,
    content: editedContent ?? fact.content,
    updatedAt: new Date(),
  }).where(eq(resumeFacts.id, factId)).returning();

  return updated[0];
}

export async function rejectFact(factId: string) {
  const { profile } = await requireResumeProfile();
  await db.delete(resumeFacts).where(
    and(eq(resumeFacts.id, factId), eq(resumeFacts.resumeProfileId, profile.id))
  );
  return true;
}

export async function getUnconfirmedFacts() {
  const { profile } = await requireResumeProfile();
  return await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, false)
    ),
  });
}

export async function getConfirmedFacts() {
  const { profile } = await requireResumeProfile();
  return await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, true)
    ),
  });
}

export async function generateWordingFromFacts() {
  const { profile } = await requireResumeProfile();
  const confirmedFactsRaw = await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, true)
    ),
  });

  const confirmedFacts: ExtractedFact[] = confirmedFactsRaw.map((f: any) =>
    extractedFactSchema.parse({
      id: f.id,
      category: f.category,
      originalAnswer: f.originalAnswer || '',
      structuredData: f.content,
      isConfirmed: true,
    })
  );

  const provider = getProvider();
  const rawWording = await provider.generateProfessionalWording(confirmedFacts);
  return generatedWordingSchema.parse(rawWording);
}

export async function generateWordingForSingleFact(factId: string) {
  const { profile } = await requireResumeProfile();
  const factRaw = await db.query.resumeFacts.findFirst({
    where: and(
      eq(resumeFacts.id, factId),
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, true)
    ),
  });

  if (!factRaw) throw new Error('Confirmed fact not found or unauthorized');

  const confirmedFact: ExtractedFact = extractedFactSchema.parse({
    id: factRaw.id,
    category: factRaw.category,
    originalAnswer: factRaw.originalAnswer || '',
    structuredData: factRaw.content,
    isConfirmed: true,
  });

  const provider = getProvider();
  const rawWording = await provider.generateProfessionalWording([confirmedFact]);
  return generatedWordingSchema.parse(rawWording);
}
