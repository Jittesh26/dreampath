'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { resumeFacts, resumeProfiles, resumeVersions } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
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
import { resumeContentSchema, ResumeContent } from '../../domain/resume';
import { mergeResumeContent } from '../../domain/resume-merge';

function getProvider(): ResumeAIProvider {
  if (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY) {
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
 */
export async function getInterviewSession(resumeId: string) {
  const { version } = await requireResumeOwnership(resumeId);
  const state = (version.interviewState || {}) as Record<string, unknown>;

  const messages = Array.isArray(state.messages) ? (state.messages as ChatMessage[]) : [];
  const isComplete = Boolean(state.isComplete);
  const topic = typeof state.currentTopic === 'string' ? state.currentTopic : 'education';

  return {
    messages,
    isComplete,
    topic,
  };
}

/**
 * Resets the interview session for a fresh conversation.
 */
export async function resetInterviewSession(resumeId: string) {
  const { profile } = await requireResumeOwnership(resumeId);

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
 * Core Unified Interview Turn:
 * Executes natural follow-up dialogue and background entity extraction in a single AI operation.
 * Persists session state and extracted entities immediately to Postgres.
 */
export async function submitInterviewTurn(params: {
  resumeId: string;
  history: ChatMessage[];
  answer: string;
}) {
  const { resumeId, history, answer } = params;
  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error('Answer cannot be empty');
  }

  // Double-submit protection / race condition guard
  const lastMsg = history[history.length - 1];
  if (lastMsg && lastMsg.role === 'student' && lastMsg.content === trimmed) {
    const existingSession = await getInterviewSession(resumeId);
    return {
      nextQuestion: existingSession.messages[existingSession.messages.length - 1]?.content || '',
      isComplete: existingSession.isComplete,
      topic: 'general',
      extractedCount: 0,
      messages: existingSession.messages,
    };
  }

  const { profile, version } = await requireResumeOwnership(resumeId);
  const provider = getProvider();

  // 1. Process turn through unified AI engine
  const turnResult = await provider.processInterviewTurn({
    history,
    latestAnswer: trimmed,
    currentResume: version.content as Partial<ResumeContent>,
  });

  // 2. Persist extracted facts silently into Postgres (scoped strictly to this resume version)
  const savedFacts: ExtractedFact[] = [];
  for (const fact of turnResult.extractedFacts) {
    try {
      const validated = extractedFactSchema.parse(fact);
      const inserted = await db.insert(resumeFacts).values({
        resumeProfileId: profile.id,
        resumeVersionId: resumeId,
        category: validated.category,
        source: 'ai',
        originalAnswer: validated.originalAnswer,
        content: validated.structuredData,
        isConfirmed: true, // Auto-confirmed internally for provenance
      }).returning();

      if (inserted[0]) {
        savedFacts.push(validated);
      }
    } catch (err: any) {
      console.warn('[AI] Skipping invalid entity:', err?.message);
    }
  }

  // 3. Update conversation history
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'student',
    content: trimmed,
    timestamp: new Date(),
  };

  const aiMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'ai',
    content: turnResult.nextQuestion,
    timestamp: new Date(),
  };

  const updatedHistory = [...history, userMessage, aiMessage];

  // 4. Persist interview session state to resume version
  await db.update(resumeVersions)
    .set({
      interviewState: {
        messages: updatedHistory,
        isComplete: turnResult.isComplete,
        currentTopic: turnResult.topic,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(resumeVersions.id, resumeId));

  return {
    nextQuestion: turnResult.nextQuestion,
    isComplete: turnResult.isComplete,
    topic: turnResult.topic,
    extractedCount: savedFacts.length,
    messages: updatedHistory,
  };
}

/**
 * Consolidated Resume Synthesis & Automated Save:
 * Takes all facts for this resume version, generates structured professional wording,
 * semantically merges with existing resume content, and automatically persists to Postgres.
 */
export async function synthesizeAndSaveResume(resumeId: string) {
  const { profile, version } = await requireResumeOwnership(resumeId);

  // 1. Fetch facts strictly scoped to this resume version, ordered chronologically
  let factsRaw = await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.resumeVersionId, resumeId),
      eq(resumeFacts.isConfirmed, true)
    ),
    orderBy: (facts, { asc }) => [asc(facts.createdAt)],
  });

  // Backward-compatibility: if no version-scoped facts exist, check for unassigned legacy facts
  if (factsRaw.length === 0) {
    factsRaw = await db.query.resumeFacts.findMany({
      where: and(
        eq(resumeFacts.resumeProfileId, profile.id),
        isNull(resumeFacts.resumeVersionId),
        eq(resumeFacts.isConfirmed, true)
      ),
      orderBy: (facts, { asc }) => [asc(facts.createdAt)],
    });
  }

  const confirmedFacts: ExtractedFact[] = factsRaw.map((f: any) =>
    extractedFactSchema.parse({
      id: f.id,
      category: f.category,
      originalAnswer: f.originalAnswer || '',
      structuredData: f.content,
      isConfirmed: true,
    })
  );

  if (confirmedFacts.length === 0) {
    return {
      success: true,
      content: version.content as ResumeContent,
      message: 'No new facts to synthesize.',
    };
  }

  // 2. Synthesize complete professional resume wording in one batch operation
  const provider = getProvider();
  const rawWording = await provider.generateProfessionalWording(confirmedFacts);
  const validatedWording = generatedWordingSchema.parse(rawWording);

  // 3. Semantically merge with existing resume content (preventing duplicate schools/jobs)
  const currentContent = (version.content || {}) as ResumeContent;
  const mergedContent = mergeResumeContent(currentContent, validatedWording);
  const validatedFinalContent = resumeContentSchema.parse(mergedContent);

  // 4. AUTOMATICALLY PERSIST TO POSTGRESQL
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

  console.info('[AI] synthesizeAndSaveResume succeeded', {
    resumeId,
    sectionsUpdated: Object.keys(validatedFinalContent),
  });

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
