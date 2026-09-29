'use server';

import { db } from '@/db';
import { resumeFacts, resumeProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MockResumeAIProvider } from '../../lib/ai/mock-provider';
import { GeminiResumeAIProvider } from '../../lib/ai/gemini-provider';
import { ChatMessage, ExtractedFact, extractedFactSchema, generatedWordingSchema, ResumeAIProvider } from '../../domain/ai-interview';

/**
 * Provider factory — evaluated once per cold-start.
 * Falls back to MockResumeAIProvider when GEMINI_API_KEY is absent so the
 * manual Resume Builder continues working without AI.
 */
function createProvider(): ResumeAIProvider {
  if (process.env.GEMINI_API_KEY) {
    try {
      return new GeminiResumeAIProvider();
    } catch {
      console.error('[AI] GeminiResumeAIProvider failed to initialise; falling back to mock.');
    }
  }
  return new MockResumeAIProvider();
}

const provider = createProvider();

async function requireResumeProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const profile = await db.query.resumeProfiles.findFirst({
    where: eq(resumeProfiles.userId, user.id)
  });

  if (!profile) throw new Error('Resume profile not found');
  return profile;
}

export async function askQuestion(history: ChatMessage[]) {
  // Ensure authenticated
  await requireResumeProfile();
  
  const question = await provider.generateNextQuestion(history);
  return question;
}

export async function processStudentAnswer(history: ChatMessage[], answer: string) {
  const profile = await requireResumeProfile();
  
  // Extract facts using the AI provider
  const rawFacts = await provider.extractFacts(history, answer);
  
  // Strict Zod validation boundary
  const extractedFacts = rawFacts.map(fact => extractedFactSchema.parse(fact));
  
  // Save extracted facts to the database (unconfirmed by default)
  const savedFacts = [];
  for (const fact of extractedFacts) {
    const inserted = await db.insert(resumeFacts).values({
      resumeProfileId: profile.id,
      category: fact.category,
      source: 'ai',
      originalAnswer: fact.originalAnswer,
      content: fact.structuredData, // Validated strongly typed content
      isConfirmed: false
    }).returning();
    savedFacts.push(inserted[0]);
  }
  
  return savedFacts;
}

export async function confirmFact(factId: string, editedContent?: unknown) {
  const profile = await requireResumeProfile();
  
  // RLS equivalent check — only the owning profile may confirm its own facts
  const fact = await db.query.resumeFacts.findFirst({
    where: and(eq(resumeFacts.id, factId), eq(resumeFacts.resumeProfileId, profile.id))
  });
  
  if (!fact) throw new Error('Fact not found or unauthorized');
  
  const updated = await db.update(resumeFacts).set({
    isConfirmed: true,
    content: editedContent ?? fact.content,
    updatedAt: new Date()
  }).where(eq(resumeFacts.id, factId)).returning();
  
  return updated[0];
}

export async function rejectFact(factId: string) {
  const profile = await requireResumeProfile();
  
  await db.delete(resumeFacts).where(
    and(eq(resumeFacts.id, factId), eq(resumeFacts.resumeProfileId, profile.id))
  );
  return true;
}

export async function getUnconfirmedFacts() {
  const profile = await requireResumeProfile();
  
  return await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, false)
    )
  });
}

export async function getConfirmedFacts() {
  const profile = await requireResumeProfile();
  
  return await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, true)
    )
  });
}

export async function generateWordingFromFacts() {
  const profile = await requireResumeProfile();
  
  // 1. Get ONLY confirmed facts
  const confirmedFactsRaw = await db.query.resumeFacts.findMany({
    where: and(
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, true)
    )
  });
  
  // Strict Zod boundary mapping from DB output to Domain logic
  const confirmedFacts: ExtractedFact[] = confirmedFactsRaw.map(f => {
    return extractedFactSchema.parse({
      id: f.id,
      category: f.category,
      originalAnswer: f.originalAnswer || '',
      structuredData: f.content,
      isConfirmed: f.isConfirmed
    });
  });

  // 2. Generate wording safely
  const rawWording = await provider.generateProfessionalWording(confirmedFacts);
  
  // 3. Strict Zod validation boundary
  const validatedWording = generatedWordingSchema.parse(rawWording);
  
  return validatedWording;
}

export async function generateWordingForSingleFact(factId: string) {
  const profile = await requireResumeProfile();

  // 1. Get ONLY the specific confirmed fact
  const factRaw = await db.query.resumeFacts.findFirst({
    where: and(
      eq(resumeFacts.id, factId),
      eq(resumeFacts.resumeProfileId, profile.id),
      eq(resumeFacts.isConfirmed, true)
    )
  });

  if (!factRaw) {
    throw new Error('Confirmed fact not found or unauthorized');
  }

  // Strict Zod boundary mapping from DB output to Domain logic
  const confirmedFact: ExtractedFact = extractedFactSchema.parse({
    id: factRaw.id,
    category: factRaw.category,
    originalAnswer: factRaw.originalAnswer || '',
    structuredData: factRaw.content,
    isConfirmed: factRaw.isConfirmed
  });

  // 2. Generate wording safely for this single confirmed fact
  const rawWording = await provider.generateProfessionalWording([confirmedFact]);

  // 3. Strict Zod validation boundary
  const validatedWording = generatedWordingSchema.parse(rawWording);

  return validatedWording;
}
